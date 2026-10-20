/*
 * The room solver for JEKYLL.EXE.
 *
 *   node scripts/jekyll/solve.ts [--room ID] [--show] [--json out.json]
 *
 * Runs the game's own rules (core.js) on every room of every chapter, breadth
 * first, and proves each one can be finished from the state it starts in.
 * Every room starts from a fixed state (where you are, which form, what you
 * carry), so nothing you did in an earlier room can leave a later one
 * impossible. Prints the shortest way through each room, in turns.
 *
 * --show prints the shortest way through a room, picture by picture.
 * Exits 1 if any room can't be finished, or the search ran out of room.
 */
import fs from 'node:fs';
import { loadGame, picture } from './lib/game.ts';

const argv = process.argv.slice(2);
const only = argv.includes('--room') ? argv[argv.indexOf('--room') + 1] : null;
const show = argv.includes('--show');
const jsonOut = argv.includes('--json') ? argv[argv.indexOf('--json') + 1] : null;
const MAX = Number(argv.includes('--max') ? argv[argv.indexOf('--max') + 1] : 4e6);
const deep = argv.includes('--deep');

/*
 * --deep: the whole graph of a room, to measure how forgiving it is: of all
 * the positions you can reach, how many can no longer be won (and how many
 * turns the worst of them is from the start), and how many ways fail.
 */
function analyze(cr: any, st0: any, max: number) {
  const tm = J.timeMatters(cr);
  const ids = new Map<string, number>();
  const edges: number[][] = [];
  const depth: number[] = [];
  const win: boolean[] = [];
  const fails: Record<string, number> = {};
  const id0 = 0;
  ids.set(J.key(cr, st0, tm), 0); edges.push([]); depth.push(0); win.push(false);
  let frontier: [any, number][] = [[st0, 0]];
  while (frontier.length && ids.size < max) {
    const next: [any, number][] = [];
    for (const [st, id] of frontier) {
      for (const a of J.ACTIONS) {
        const r = J.step(cr, st, a);
        if (!r.used) continue;
        if (r.st.out?.k === 'fail') { fails[r.st.out.why] = (fails[r.st.out.why] || 0) + 1; continue; }
        const k = (r.st.out ? 'WIN:' : '') + J.key(cr, r.st, tm);
        let nid = ids.get(k);
        if (nid === undefined) {
          nid = ids.size; ids.set(k, nid); edges.push([]); depth.push(depth[id] + 1); win.push(!!r.st.out);
          if (!r.st.out) next.push([r.st, nid]);
        }
        edges[nid].push(id); // reversed
      }
    }
    frontier = next;
  }
  const good = new Uint8Array(ids.size);
  const q: number[] = [];
  win.forEach((w, i) => { if (w) { good[i] = 1; q.push(i); } });
  while (q.length) { const i = q.pop()!; for (const j of edges[i]) if (!good[j]) { good[j] = 1; q.push(j); } }
  let dead = 0, live = 0, nearest = Infinity;
  for (let i = 0; i < ids.size; i++) { if (win[i]) continue; if (good[i]) live++; else { dead++; nearest = Math.min(nearest, depth[i]); } }
  return { states: ids.size, dead, live, nearest, fails, capped: ids.size >= max, startGood: !!good[id0] };
}

const J = loadGame();
let bad = 0;
const results: Record<string, { ok: boolean; moves?: number; states: number; path?: string[] }> = {};
const listed = new Set<string>();

for (const ch of J.CHAPTERS) {
  if (!only) console.log(`\n${ch.id}  ${ch.title}`);
  for (const id of ch.rooms) {
    listed.add(id);
    if (only && id !== only) continue;
    const cr = J.compile(id);
    const st = J.initState(cr);
    const t0 = Date.now();
    const r = J.solve(cr, st, { max: MAX });
    const ms = Date.now() - t0;
    results[id] = { ok: r.ok, moves: r.path?.length, states: r.states, path: r.path };
    if (r.ok) {
      console.log(`  ok   ${id.padEnd(22)} ${String(r.path.length).padStart(3)} turns   ${String(r.states).padStart(8)} states  ${ms}ms`);
      console.log(`       ${r.path.map((a: string) => (a === 'wait' ? '.' : a === 'drink' ? 'X' : a)).join('')}`);
    } else {
      bad++;
      console.log(`  FAIL ${id.padEnd(22)} ${r.capped ? 'search capped at ' + r.states + ' states' : 'no way through (' + r.states + ' states)'}`);
    }
    if (deep) {
      const a = analyze(cr, st, MAX);
      const pct = ((100 * a.dead) / Math.max(1, a.dead + a.live)).toFixed(1);
      console.log(`       dead ends: ${a.dead}/${a.dead + a.live} positions (${pct}%)${a.dead ? ', first ' + a.nearest + ' turns in' : ''}; fails: ${Object.entries(a.fails).map(([k, v]) => k + ' ' + v).join(', ') || 'none'}${a.capped ? ' (capped)' : ''}`);
    }
    if (show && r.ok) {
      let s = st;
      console.log('\n' + picture(J, cr, s) + `\n  t=${s.t} ${J.clockText(cr.clock + s.t)}`);
      for (const a of r.path) {
        const step = J.step(cr, s, a);
        s = step.st;
        const said = step.ev.filter((e: any) => e.t === 'say').map((e: any) => e.text).join(' / ');
        console.log(`\n> ${a}${said ? '   "' + said + '"' : ''}`);
        console.log(picture(J, cr, s) + `\n  t=${s.t} ${J.clockText(cr.clock + s.t)} ${s.f} doses=${s.doses}${s.chg != null ? ' chg=' + s.chg : ''}${s.out ? ' ' + JSON.stringify(s.out) : ''}`);
      }
    }
  }
}
for (const id of Object.keys(J.ROOMS)) if (!listed.has(id)) { console.log(`  FAIL ${id}: not in any chapter`); bad++; }
if (jsonOut) fs.writeFileSync(jsonOut, JSON.stringify(results, null, 1));
console.log(bad ? `\n${bad} room(s) failed` : '\nevery room can be finished');
process.exit(bad ? 1 : 0);
