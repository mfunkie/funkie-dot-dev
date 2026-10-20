/*
 * World lint for JEKYLL.EXE: everything is where it could be, and every
 * place connects to the places it should.
 *
 *   node scripts/jekyll/world-lint.ts
 *
 * Screens:
 *   - every row is 16 wide and every character is in the legend;
 *   - the edge of every screen is wall, window or a way out, so nobody walks
 *     off the map;
 *   - every exit says where it leads, and the screen it leads to has an exit
 *     leading back here;
 *   - every floor square can be reached from every other (by Hyde, who goes
 *     everywhere anyone can), so no part of a place is sealed off by mistake.
 * Rooms:
 *   - you start on a square your form can stand on, beside the way you came
 *     in;
 *   - nobody stands in a wall, on furniture or in a doorway out (people keep
 *     off exits), and nobody stands where someone else is;
 *   - a constable's beat runs over floor only;
 *   - things to pick up lie on floor you can reach;
 *   - everything you can use, and every way out a room opens, can be reached
 *     from the start, by Jekyll or Hyde as the way out requires, ignoring
 *     people (the solver handles them);
 *   - each room follows from the last: the way out of one leads to the
 *     screen the next is set in, and the next starts at that door, unless
 *     the chapter marks the step as a cut in the story (a later hour, a cab
 *     ride).
 * Exits 1 on any problem.
 */
import { loadGame } from './lib/game.ts';

const J = loadGame();
const W = J.W, H = J.H;
const problems: string[] = [];
const bad = (s: string) => problems.push(s);

const legendOf = (scr: any) => Object.assign({}, J.DEFAULT_LEGEND, scr.legend || {});

/* ---- screens */
for (const [id, scr] of Object.entries<any>(J.SCREENS)) {
  const legend = legendOf(scr);
  if (scr.map.length !== H) bad(`${id}: ${scr.map.length} rows, not ${H}`);
  const exitIds = new Set<string>();
  scr.map.forEach((row: string, y: number) => {
    if (row.length !== W) bad(`${id}: row ${y} is ${row.length} wide`);
    [...row].forEach((ch, x) => {
      const L = legend[ch];
      if (!L) { bad(`${id}: '${ch}' at ${x},${y} is not in the legend`); return; }
      if (L.exit) exitIds.add(L.exit);
      const edge = x === 0 || y === 0 || x === W - 1 || y === H - 1;
      if (edge && !['wall', 'window', 'exit', 'block'].includes(L.kind)) bad(`${id}: ${x},${y} ('${ch}', ${L.kind}) is open at the edge of the map`);
    });
  });
  for (const e of exitIds) {
    const link = (scr.exits || {})[e];
    if (!link) { bad(`${id}: exit '${e}' doesn't say where it leads`); continue; }
    if (link.to.startsWith('@')) continue; // off the map: a place the game doesn't show
    const there = J.SCREENS[link.to];
    if (!there) { bad(`${id}: exit '${e}' leads to unknown screen ${link.to}`); continue; }
    const back = (there.exits || {})[link.at];
    if (!back) bad(`${id}: exit '${e}' leads to ${link.to}.${link.at}, which isn't an exit`);
    else if (back.to !== id) bad(`${id}: exit '${e}' leads to ${link.to}.${link.at}, which leads to ${back.to}, not back here`);
  }
  for (const e of Object.keys(scr.exits || {})) if (!exitIds.has(e)) bad(`${id}: exit '${e}' isn't on the map`);
  // Every square anyone could stand on, reachable from every other by Hyde.
  const walkable = (x: number, y: number) => {
    const L = legend[scr.map[y][x]];
    return L && ['floor', 'low', 'door', 'exit'].includes(L.kind);
  };
  const cells: [number, number][] = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (walkable(x, y)) cells.push([x, y]);
  if (cells.length) {
    const seen = new Set([cells[0].join(',')]);
    const q = [cells[0]];
    while (q.length) {
      const [x, y] = q.pop()!;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H || !walkable(nx, ny) || seen.has(nx + ',' + ny)) continue;
        seen.add(nx + ',' + ny);
        q.push([nx, ny]);
      }
    }
    const cut = cells.filter(([x, y]) => !seen.has(x + ',' + y));
    if (cut.length) bad(`${id}: ${cut.length} square(s) sealed off from the rest, e.g. ${cut[0].join(',')}`);
  }
}

/* ---- rooms */
function reach(cr: any, x0: number, y0: number, form: 'J' | 'H') {
  const bit = form === 'H' ? 2 : 1;
  const seen = new Set([x0 + ',' + y0]);
  const q = [[x0, y0]];
  const near = new Set<string>();
  while (q.length) {
    const [x, y] = q.pop()!;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      near.add(nx + ',' + ny);
      if (seen.has(nx + ',' + ny) || !(cr.walk[ny * W + nx] & bit)) continue;
      const c = cr.cells[ny * W + nx];
      if (c.exit) continue; // a way out is reached, not walked through
      seen.add(nx + ',' + ny);
      q.push([nx, ny]);
    }
  }
  return { seen, near };
}

for (const ch of J.CHAPTERS) {
  ch.rooms.forEach((id: string, k: number) => {
    let cr: any;
    try { cr = J.compile(id); } catch (e: any) { bad(`${id}: ${e.message}`); return; }
    const def = cr.def;
    const s = cr.start;
    const form = s.form || 'J';
    const at = (x: number, y: number) => cr.cells[y * W + x];
    if (!(cr.walk[s.y * W + s.x] & (form === 'H' ? 2 : 1)) || at(s.x, s.y).exit) bad(`${id}: starts on ${s.x},${s.y}, which ${form} can't stand on`);

    const taken = new Map<string, string>();
    taken.set(s.x + ',' + s.y, 'you');
    cr.people.forEach((p: any) => {
      const pts = p.kind === 'const' ? p.path : [[p.x, p.y]];
      for (const [x, y] of pts) {
        if (x < 0 || y < 0 || x >= W || y >= H) { bad(`${id}: ${p.name} at ${x},${y} is off the map`); continue; }
        const c = at(x, y);
        const onWindow = p.kind === 'watch' && c.kind === 'window';
        if (!onWindow && !(cr.walk[y * W + x] & 4)) bad(`${id}: ${p.name} ${p.kind === 'const' ? 'walks through' : 'stands in'} ${x},${y} ('${c.ch}', ${c.kind})`);
      }
      const k2 = p.x + ',' + p.y;
      if (!p.enter) {
        if (taken.has(k2)) bad(`${id}: ${p.name} stands where ${taken.get(k2)} is (${k2})`);
        taken.set(k2, p.name);
      }
    });

    const reachJ = reach(cr, s.x, s.y, 'J');
    const reachH = reach(cr, s.x, s.y, 'H');
    const anyReach = (x: number, y: number, form?: string) => {
      const key = x + ',' + y;
      if (form === 'J') return reachJ.near.has(key) && (reachJ.seen.has(key) || true) && [...reachJ.seen].some((c) => adj(c, x, y));
      if (form === 'H') return [...reachH.seen].some((c) => adj(c, x, y));
      return [...reachH.seen, ...reachJ.seen].some((c) => adj(c, x, y));
    };
    const adj = (c: string, x: number, y: number) => {
      const [cx, cy] = c.split(',').map(Number);
      return Math.abs(cx - x) + Math.abs(cy - y) === 1;
    };
    // Can a form be had in this room? (A dose, an act that changes you.)
    const canChange = (s.doses || 0) > 0 || cr.items.some((it: any) => it.doses) || Object.values<any>(def.acts || {}).some((a) => a.give?.doses || a.change) || !!def.change || !!def.doze;
    cr.items.forEach((it: any) => {
      const c = at(it.x, it.y);
      if (!(cr.walk[it.y * W + it.x] & 3)) bad(`${id}: ${it.item || 'a dose'} lies on ${it.x},${it.y} ('${c.ch}', ${c.kind}), where nobody can pick it up`);
      else if (!reachH.seen.has(it.x + ',' + it.y) && !reachJ.seen.has(it.x + ',' + it.y)) bad(`${id}: ${it.item || 'a dose'} at ${it.x},${it.y} can't be reached`);
    });
    for (const a of Object.values<any>(cr.acts)) {
      if (!a.rule) continue;
      if (!a.cells.some(([x, y]: number[]) => anyReach(x, y))) bad(`${id}: '${a.id}' can't be reached`);
    }
    for (const e of Object.values<any>(cr.exits)) {
      if (!e.rule || e.rule.shut || e.rule.leave) continue;
      const need = e.rule.need?.form;
      const ok = e.cells.some(([x, y]: number[]) => (need && !canChange ? anyReach(x, y, need) : anyReach(x, y)));
      if (!ok) bad(`${id}: way out '${e.id}' can't be reached${need ? ' as ' + need : ''}`);
    }

    // This room leads to the next.
    const nextId = ch.rooms[k + 1];
    const cuts = ch.cuts || {};
    if (nextId && !cuts[id]) {
      const next = J.compile(nextId);
      const ways = Object.values<any>(cr.exits).filter((e) => e.rule && !e.rule.shut && !e.rule.leave && (e.rule.to || 'next') === 'next');
      const winsByAct = Object.values<any>(cr.acts).some((a) => a.rule && a.rule.win === 'next') || !!def.goal;
      if (!ways.length && winsByAct) bad(`${id}: ends by an act, not a door; mark the step to ${nextId} as a cut in chapter ${ch.id}`);
      for (const e of ways) {
        const link = e.link;
        if (!link) { bad(`${id}: way out '${e.id}' has no link`); continue; }
        if (link.to !== next.def.screen) { bad(`${id}: way out '${e.id}' leads to ${link.to}, but ${nextId} is set in ${next.def.screen}`); continue; }
        const arrive = next.exits[link.at];
        if (!arrive) { bad(`${nextId}: has no exit '${link.at}' to arrive by`); continue; }
        const ns = next.start;
        if (!arrive.cells.some(([x, y]: number[]) => Math.abs(x - ns.x) + Math.abs(y - ns.y) === 1)) bad(`${nextId}: starts at ${ns.x},${ns.y}, not beside '${link.at}', the way in from ${id}`);
        if (e.rule.need?.form && e.rule.need.form !== (ns.form || 'J')) bad(`${nextId}: starts as ${ns.form || 'J'}, but ${id} lets you out only as ${e.rule.need.form}`);
      }
    }
  });
}

if (problems.length) {
  console.log(problems.map((p) => '  ' + p).join('\n'));
  console.log(`\n${problems.length} problem(s)`);
  process.exit(1);
}
console.log(`world lint: ${Object.keys(J.SCREENS).length} screens, ${Object.keys(J.ROOMS).length} rooms, all connected`);
