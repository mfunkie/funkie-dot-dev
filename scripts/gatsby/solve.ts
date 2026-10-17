/*
 * Stage solver for GATSBY.EXE: can every stage be finished, from its start and
 * from every checkpoint, collecting every item, with the real physics?
 *
 *   node scripts/gatsby/solve.ts                 every stage, start + checkpoints
 *   node scripts/gatsby/solve.ts 3 6             just those stages
 *   node scripts/gatsby/solve.ts --map 3         print the map with the places reached
 *
 * It's a breadth-first search over the places the hero can come to rest,
 * moving between them with input macros (walks, jumps of several lengths
 * with steering, swims, ladders, wall-kicks) simulated by GG.heroStep from
 * core.js, the same code the game runs. Moving platforms are stood in for by
 * boxes along their path; enemies are ignored (stages are checked for being
 * finishable, not for being easy). A running start is only allowed with two
 * tiles of floor behind the hero to build up speed on.
 *
 * Exits 1 if any stage or checkpoint can't reach its goal or misses an item.
 */
import { loadGame, type GG } from './lib/game.ts';

type Box = { x: number; y: number; w: number; h: number; solid?: boolean; dx?: number; dy?: number; step?: number; tag: string; name?: string };
type Inp = { l: number; r: number; u: number; d: number; jump: number; jumpHit: number };
type Plan = ((f: number, h: any) => Inp) & { running?: number };

function boxesFor(GG: GG, def: any, lv: any) {
  const extra: Box[] = [], goals: Box[] = [], items: Box[] = [];
  const add = (x: number, y: number, w: number, tag: string) => extra.push({ x, y, w, h: 6, solid: true, dx: 0, dy: 0, step: tag === 'car' ? 6 : 0, tag });
  for (const m of lv.ents) {
    const x = m.x, y = m.y;
    switch (m.e) {
      case 'platform': {
        const range = (m.range || 3) * 16, len = (m.len || 2) * 16, oy = y + 4;
        if ((m.axis || 'x') === 'x') for (let d = 0; d <= range; d += 8) add(x + d, oy, len, 'plat');
        else for (let d = 0; d <= range; d += 6) add(x, oy - d, len, 'plat');
        break;
      }
      case 'crumble': add(x, y, 16, 'crumble'); break;
      case 'curtain': {
        const max = (m.max || 4) * 16, dir = m.dir || 1;
        add(dir > 0 ? x : x + 16 - max, y + 4, max, 'curtain');
        break;
      }
      case 'couch': {
        for (let d = 0; d <= 24; d += 6) add(x - 16, y + 8 - d, 48, 'couch');
        goals.push({ x: x - 16, y: y - 20, w: 48, h: 30, tag: 'couch' });
        break;
      }
      case 'ashcar': { const range = (m.range || 6) * 16; for (let d = 0; d <= range; d += 8) add(x + d, y + 2, 48, 'ashcar'); break; }
      case 'shirtfall': {
        const spread = (m.spread || 0) * 16;
        for (let sx = x - spread / 2; sx <= x + spread / 2; sx += 8) {
          // A shirt falls until its middle meets something solid.
          for (let sy = y; sy < lv.ph; sy += 12) {
            if (GG.isSolid(GG.kindAt(lv, Math.floor((sx + 8) / 16), Math.floor((sy + 6) / 16)))) break;
            add(sx, sy, 16, 'shirt');
          }
        }
        break;
      }
      case 'rowboat': { const range = (m.range || 12) * 16; for (let d = 0; d <= range; d += 8) add(x + d, y + 10, 48, 'boat'); break; }
      case 'boat': { const range = (m.range || 10) * 16; for (let d = 0; d <= range - 24; d += 8) add(x - d, y + 10, 40, 'boat'); break; }
      case 'buoy': add(x + 1, y + 8, 14, 'buoy'); break;
      case 'goal': goals.push({ x, y: y + 16 - 32, w: 16, h: 32, tag: 'goal' }); break;
      case 'npcgoal': goals.push({ x: x + 1 - 6, y: y + 16 - 22, w: 14 + 12, h: 22, tag: 'npcgoal' }); break;
      case 'prize': goals.push({ x: x + 1, y, w: 14, h: 16, tag: 'prize' }); break;
      case 'greenlight': {
        const stops = m.stops || [];
        const gx = stops.length ? stops[stops.length - 1] * 16 : x;
        goals.push({ x: gx - 20, y: y + 16 - 32 - 8, w: 56, h: 48, tag: 'greenlight' });
        break;
      }
      case 'item': items.push({ x: x + 2, y: y + 4 - 2, w: 12, h: 16, name: m.cx + ',' + m.cy, tag: 'item' }); break;
    }
  }
  // Bosses: the arena's floor is the goal.
  if (def.solverGoal) goals.push(def.solverGoal);
  return { extra, goals, items };
}

export interface Result {
  error?: string;
  states: number;
  sims: number;
  goal: string | null;
  found: number;
  total: number;
  missing: string[];
  seen: Map<string, any>;
}

export interface SolveOpts {
  /* Stop as soon as a resting place satisfies this, and return the inputs to get there. */
  target?: (h: any) => boolean;
  /* Only plans a player can do from a standstill (no assumed running start). */
  noRunning?: boolean;
}

export function solve(GG: GG, def: any, from?: { x: number; y: number }, opts: SolveOpts = {}): Result & { path?: Inp[]; track?: { x: number; y: number }[] } {
  const { K } = GG;
  const lv = GG.compile(def);
  if (from) lv.start = from;
  lv.roof = !!def.roof;
  const { extra, goals, items } = boxesFor(GG, def, lv);
  const mods = def.solverMods || {};
  const s0 = GG.makeHero(def.hero, lv.start.x, lv.start.y);
  const wall = !!s0.s.wall;
  const keyOf = (h: any) => `${Math.round(h.x / 4)},${Math.round(h.y)},${h.onLadder ? 1 : 0}`;
  const clone = (h: any) => Object.assign({}, h);
  const seen = new Map<string, any>();
  const parent = new Map<string, { prev: string | null; plan: number }>();
  const queue: any[] = [];
  const reachedItems = new Set<string>();
  let reachedGoal: string | null = null;
  let sims = 0;

  // Death and spikes, by tile, without allocating.
  const bad = new Uint8Array(lv.w * lv.h);
  for (let i = 0; i < bad.length; i++) bad[i] = lv.kind[i] === K.DEATH ? 1 : lv.kind[i] === K.SPIKE ? 2 : 0;
  const deadAt = (x0: number, y0: number, x1: number, y1: number, want: number) => {
    const a = Math.max(0, Math.floor(x0 / 16)), b = Math.min(lv.w - 1, Math.floor(x1 / 16));
    const c = Math.max(0, Math.floor(y0 / 16)), d = Math.min(lv.h - 1, Math.floor(y1 / 16));
    for (let ty = c; ty <= d; ty++) for (let tx = a; tx <= b; tx++) if (bad[ty * lv.w + tx] === want) return true;
    return false;
  };
  const dead = (h: any) => h.y > lv.ph + 8 || deadAt(h.x + 2, h.y + 2, h.x + h.w - 2.001, h.y + h.h - 2.001, 1) || deadAt(h.x + 3, h.y + 3, h.x + h.w - 3.001, h.y + h.h - 3.001, 2);
  const check = (h: any) => {
    for (const g of goals) if (!reachedGoal && GG.hit(h, g)) reachedGoal = g.tag;
    for (const it of items) if (!reachedItems.has(it.name!) && GG.hit(h, it)) reachedItems.add(it.name!);
  };
  const N: Inp = { l: 0, r: 0, u: 0, d: 0, jump: 0, jumpHit: 0 };

  // Settle the start.
  const settle = (h: any) => {
    for (let i = 0; i < 200; i++) {
      GG.heroStep(h, N, lv, extra, mods);
      h.x = GG.clamp(h.x, 0, lv.pw - h.w);
      if (dead(h)) return null;
      if ((h.onGround && Math.abs(h.vx) < 0.05) || h.onLadder) return h;
    }
    return h.onGround ? h : null;
  };
  const start = settle(clone(s0));
  if (!start) return { error: 'start is not standable', states: 0, sims: 0, goal: null, found: 0, total: items.length, missing: [], seen };
  seen.set(keyOf(start), start); queue.push(start);
  parent.set(keyOf(start), { prev: null, plan: -1 });

  // Room for a running start: two tiles of floor behind, no wall in the way.
  const standable = (tx: number, ty: number) => {
    const k = GG.kindAt(lv, tx, ty);
    return GG.isSolid(k) || k === K.ONEWAY || k === K.LADDER;
  };
  const runway = (h: any, dir: number) => {
    if (h.onLadder) return false;
    const feet = Math.floor((h.y + h.h + 1) / 16);
    const body = [Math.floor(h.y / 16), Math.floor((h.y + h.h - 1) / 16)];
    const tx = Math.floor((h.x + h.w / 2) / 16);
    for (let i = 1; i <= 2; i++) {
      const bx = tx - dir * i;
      if (!standable(bx, feet) && !extra.some((p) => Math.abs(p.y - (h.y + h.h)) < 1 && bx * 16 + 8 > p.x && bx * 16 + 8 < p.x + p.w)) return false;
      for (const by of body) if (GG.isSolid(GG.kindAt(lv, bx, by))) return false;
    }
    return true;
  };

  function run(h0: any, plan: Plan, maxF = 260) {
    if (plan.running && !runway(h0, plan.running)) return null;
    const h = clone(h0);
    sims++;
    if (plan.running) { h.vx = plan.running * h.s.run; h.face = plan.running; }
    let air = false, landed = false;
    for (let f = 0; f < maxF; f++) {
      const inp = landed ? N : plan(f, h);
      GG.heroStep(h, inp, lv, extra, mods);
      h.x = GG.clamp(h.x, 0, lv.pw - h.w);
      if (dead(h)) return null;
      check(h);
      if (f > 2 && ((h.onGround && Math.abs(h.vx) < 0.05 && !inp.l && !inp.r) || (h.onLadder && !inp.u && !inp.d && f > 1))) return h;
      if (!h.onGround && !h.onLadder) air = true;
      else if (air) landed = true;
    }
    return h.onGround || h.onLadder ? h : null;
  }

  const plans: Plan[] = [];
  const mk = (fn: (f: number, h: any) => Inp, running = 0): Plan => Object.assign(fn, { running });
  for (const dir of [-1, 0, 1]) {
    const L = dir < 0 ? 1 : 0, R = dir > 0 ? 1 : 0;
    // Walks.
    if (dir) for (const n of [5, 14, 40]) plans.push(mk((f) => (f < n ? { ...N, l: L, r: R } : N)));
    // Jumps from standing or at full speed, holding A for a while, steering.
    for (const running of dir ? [0, 1] : [0]) {
      for (const hold of [3, 8, 14, 40]) {
        for (const air of ['keep', 'stop', 'back', 'late']) {
          if (!dir && air !== 'keep') continue;
          if (!running && air === 'late') continue;
          plans.push(mk((f) => {
            let l = L, r = R;
            if (air === 'stop' && f > 12) { l = 0; r = 0; }
            if (air === 'back' && f > 16) { l = R; r = L; }
            if (air === 'late' && f < 10) { l = 0; r = 0; }
            return { l, r, u: 0, d: 0, jump: f < hold ? 1 : 0, jumpHit: f === 0 ? 1 : 0 };
          }, running ? dir : 0));
        }
      }
    }
  }
  // Swimming: a stroke every so often, steering.
  for (const dir of [-1, 0, 1]) for (const every of [8, 16]) {
    const L = dir < 0 ? 1 : 0, R = dir > 0 ? 1 : 0;
    plans.push(mk((f) => ({ l: L, r: R, u: 0, d: 0, jump: 1, jumpHit: f % every === 0 ? 1 : 0 })));
  }
  // Ladders.
  for (const n of [8, 20, 48, 120]) {
    plans.push(mk((f) => (f < n ? { ...N, u: 1 } : N)));
    plans.push(mk((f) => (f < n ? { ...N, d: 1 } : N)));
  }
  // Off a ladder, sideways.
  for (const dir of [-1, 1]) plans.push(mk((f) => ({ l: dir < 0 ? 1 : 0, r: dir > 0 ? 1 : 0, u: 0, d: 0, jump: f < 12 ? 1 : 0, jumpHit: f === 0 ? 1 : 0 })));
  // Wall kicks: zigzag up a chimney, or one kick then steer.
  if (wall) {
    for (const dir of [-1, 1]) for (const mode of ['zig', 'one', 'onestay']) {
      plans.push(mk((f, h) => {
        const st = h._st || (h._st = { dir, k: -1, last: -99 });
        let hitJ = f === 0 ? 1 : 0;
        // When against a wall and falling or near the top, kick.
        const side = GG.wallSide(h, lv);
        if (side && !h.onGround && f - st.last > 6 && (mode === 'zig' || st.k < 0)) {
          hitJ = 1; st.last = f; st.k++;
          if (mode === 'zig' || mode === 'one') st.dir = -side;
        }
        const d = st.dir;
        return { l: d < 0 ? 1 : 0, r: d > 0 ? 1 : 0, u: 0, d: 0, jump: 1, jumpHit: hitJ };
      }));
    }
  }

  let found: string | null = null;
  while (queue.length && !found) {
    const h = queue.shift();
    const hk = keyOf(h);
    for (let pi = 0; pi < plans.length; pi++) {
      const plan = plans[pi];
      if (opts.noRunning && plan.running) continue;
      const out = run(h, plan);
      if (!out) continue;
      delete out._st;
      out.vx = 0; out.vy = 0; out.buffer = 0; out.wallGrace = 0; out.wallLock = 0; out.coyote = 0;
      const key = keyOf(out);
      if (!seen.has(key)) {
        seen.set(key, out); queue.push(out); parent.set(key, { prev: hk, plan: pi });
        if (opts.target && opts.target(out)) { found = key; break; }
      }
    }
    if (seen.size > 40000) break;
  }
  // The way there: replay the chain of plans from the start, frame by frame.
  let path: Inp[] | undefined;
  let track: { x: number; y: number }[] | undefined;
  if (found) {
    track = [];
    const chain: number[] = [];
    for (let k: string | null = found; k && parent.get(k)!.plan >= 0; k = parent.get(k)!.prev) chain.unshift(parent.get(k)!.plan);
    path = [];
    let h = clone(start);
    for (const pi of chain) {
      const plan = plans[pi];
      let air = false, landed = false;
      for (let f = 0; f < 260; f++) {
        const inp = landed ? N : plan(f, h);
        path.push(inp);
        GG.heroStep(h, inp, lv, extra, mods);
        h.x = GG.clamp(h.x, 0, lv.pw - h.w);
        track!.push({ x: h.x, y: h.y });
        if (f > 2 && ((h.onGround && Math.abs(h.vx) < 0.05 && !inp.l && !inp.r) || (h.onLadder && !inp.u && !inp.d && f > 1))) break;
        if (!h.onGround && !h.onLadder) air = true;
        else if (air) landed = true;
      }
      delete h._st;
      h = Object.assign(clone(h), { vx: 0, vy: 0 });
    }
  }
  const missing = items.filter((it) => !reachedItems.has(it.name!)).map((it) => it.name!);
  return { states: seen.size, sims, goal: reachedGoal, found: reachedItems.size, total: items.length, missing, seen, path, track };
}

/* The respawn spots: each checkpoint's bottom cell. */
export function checkpoints(GG: GG, def: any) {
  const lv = GG.compile(def);
  return lv.ents.filter((e: any) => e.e === 'checkpoint').map((k: any) => ({ x: k.x, y: k.y + 16, cx: k.cx, cy: k.cy }));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const argv = process.argv.slice(2);
  const showMap = argv.includes('--map');
  const want = argv.filter((a) => !a.startsWith('--'));
  const GG = loadGame();
  let failures = 0;
  for (const def of GG.stages) {
    if (want.length && !want.includes(def.key)) continue;
    if (def.solver === false) { console.log(`${def.key.padEnd(4)} skipped: ${def.solverNote || 'checked by a bot instead'}`); continue; }
    const t0 = Date.now();
    const r = solve(GG, def);
    const ok = !r.error && r.goal && !r.missing.length;
    if (!ok) failures++;
    console.log(`${def.key.padEnd(4)} ${ok ? 'OK  ' : 'FAIL'} from start: goal ${r.error || r.goal || 'NOT REACHED'}, items ${r.found}/${r.total}, ${r.states} places, ${((Date.now() - t0) / 1000).toFixed(1)}s${r.missing.length ? ', missing ' + r.missing.join(' ') : ''}`);
    if (showMap && (!ok || want.length)) {
      const rows = def.map.map((row: string) => row.split(''));
      for (const h of r.seen.values()) {
        const tx = Math.floor((h.x + h.w / 2) / 16), ty = Math.floor((h.y + h.h - 1) / 16);
        if (rows[ty] && rows[ty][tx] === '.') rows[ty][tx] = 'o';
      }
      console.log(rows.map((row: string[]) => row.join('')).join('\n'));
    }
    for (const c of checkpoints(GG, def)) {
      const rc = solve(GG, def, c);
      const okc = !rc.error && rc.goal;
      if (!okc) failures++;
      console.log(`${''.padEnd(4)} ${okc ? 'OK  ' : 'FAIL'} from checkpoint ${c.cx},${c.cy}: goal ${rc.error || rc.goal || 'NOT REACHED'}`);
    }
  }
  console.log(failures ? `\n${failures} failing` : '\nEvery stage can be finished from its start and every checkpoint, with every item.');
  process.exit(failures ? 1 : 0);
}
