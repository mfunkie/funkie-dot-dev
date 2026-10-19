/*
 * How precisely does each stage make you press the buttons? The solver's
 * moves (walks, jumps, swims, climbs, kicks) are replayed the way a person
 * presses buttons: each press and release up to a few frames early or late, a
 * running jump taken a few frames sooner or later, a standing jump taken from a
 * few pixels either side of the spot. A move's slip rate is how often that
 * ends in a pit or the water, or in the roses (or other spikes). Landing safely
 * somewhere else isn't a slip: a person just carries on from there.
 *
 * Then it finds the safest way through: the route to the goal whose moves
 * multiply out to the best chance of no slip (a best-first search over the
 * places the hero can stand, each move weighed by its slip rate). That's the
 * way a careful player would go, so its slips are what the stage asks of them.
 * Only moves that pass near a hazard are replayed many times; the rest can't
 * slip. Enemies aren't in it: this measures the ground, not the fights.
 *
 *   node scripts/gatsby/precision.ts [stageKey ...] [--jitter 3] [--all] [--cautious] [--check]
 *
 * --cautious plays like someone who stops before every jump: no running starts.
 * --all lists every move on the route, not just the risky ones.
 * --check fails a stage whose expected slips go over its budget in BUDGET
 * below (for both the confident and the cautious player), or that has a move
 * which slips more often than not.
 */
import { loadGame } from './lib/game.ts';
import { solve, touches, type SimContext } from './solve.ts';

/* Expected slips per run through, at ±3 frames, for a careful player. */
export const BUDGET: Record<string, number> = {
  '1': 0.5, '2-1': 1.0, '2-2': 0.8, '3': 0.8, '5': 1.2, '6': 1.5, '7': 1.5, '8': 2.0, '9': 1.5,
};
const HARDEST_MIN = 0.5;

const argv = process.argv.slice(2);
const opt = (name: string, d: number) => (argv.includes(name) ? +argv[argv.indexOf(name) + 1] : d);
const J = opt('--jitter', 3);
const SHOW_ALL = argv.includes('--all');
const CHECK = argv.includes('--check');
const CAUTIOUS = argv.includes('--cautious');
const want = argv.filter((a, i) => !a.startsWith('--') && argv[i - 1] !== '--jitter');

type Inp = { l: number; r: number; u: number; d: number; jump: number; jumpHit: number };
const N: Inp = { l: 0, r: 0, u: 0, d: 0, jump: 0, jumpHit: 0 };
const SAMPLES = 96, FIRST = 24, NEAR = 16;

/* A seeded generator, so a run of this script is repeatable. */
let seed = 1;
const rand = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
const jitter = () => Math.floor(rand() * (2 * J + 1)) - J;

/* The inputs a person would press for a recorded move: each change of a button a little early or late. */
function humanize(seq: Inp[]): Inp[] {
  const shift = (v: number[]) => {
    const edges: { t: number; to: number }[] = [];
    for (let t = 1; t < v.length; t++) if (v[t] !== v[t - 1]) edges.push({ t, to: v[t] });
    let prev = 0;
    for (const e of edges) { e.t = Math.max(prev + 1, e.t + jitter()); prev = e.t; }
    const out: number[] = [];
    let k = 0, cur = v[0];
    for (let t = 0; t < v.length + J + 1; t++) {
      while (k < edges.length && edges[k].t <= t) cur = edges[k++].to;
      out.push(cur);
    }
    return out;
  };
  const dir = shift(seq.map((i) => (i.r ? 1 : 0) - (i.l ? 1 : 0)));
  const jump = shift(seq.map((i) => i.jump));
  const up = shift(seq.map((i) => i.u)), down = shift(seq.map((i) => i.d));
  return dir.map((d, t) => ({ l: d < 0 ? 1 : 0, r: d > 0 ? 1 : 0, u: up[t], d: down[t], jump: jump[t], jumpHit: jump[t] && !(t > 0 && jump[t - 1]) ? 1 : 0 }));
}

interface Sim {
  GG: any; ctx: SimContext;
  hazard: (x0: number, y0: number, x1: number, y1: number) => boolean;
  touchesGoal: (h: any) => boolean;
}

/* A move from a resting place as the solver plays it: its inputs, where it ends, whether it passes near danger. */
function record(S: Sim, from: any, pi: number) {
  const { GG, ctx } = S;
  const plan = ctx.plans[pi];
  if (plan.running && !ctx.runway(from, plan.running)) return null;
  const h = Object.assign({}, from);
  if (plan.running) { h.vx = plan.running * h.s.run; h.face = plan.running; }
  const seq: Inp[] = [];
  let air = false, landed = false, near = false;
  for (let f = 0; f < 260; f++) {
    const inp = landed ? N : plan(f, h);
    seq.push(inp);
    GG.heroStep(h, inp, ctx.lv, ctx.extra, ctx.mods);
    h.x = GG.clamp(h.x, 0, ctx.lv.pw - h.w);
    if (ctx.dead(h)) return null;
    if (!near && S.hazard(h.x - NEAR, h.y - NEAR, h.x + h.w + NEAR, h.y + h.h + NEAR)) near = true;
    if (S.touchesGoal(h)) { delete h._st; return { seq, end: h, goal: true, near }; }
    if (f > 2 && ((h.onGround && Math.abs(h.vx) < 0.05 && !inp.l && !inp.r) || (h.onLadder && !inp.u && !inp.d && f > 1))) { delete h._st; return { seq, end: h, goal: false, near }; }
    if (!h.onGround && !h.onLadder) air = true;
    else if (air) landed = true;
  }
  delete h._st;
  return h.onGround || h.onLadder ? { seq, end: h, goal: false, near } : null;
}

/* One human try at a recorded move: 'fall' (a pit, the water), 'hurt' (spikes) or 'safe'. */
function attempt(S: Sim, from: any, running: number, seq: Inp[]): 'safe' | 'fall' | 'hurt' {
  const { GG, ctx } = S;
  const h = Object.assign({}, from);
  if (running) h.x += jitter() * h.s.run * running;   // jumped a few frames sooner or later
  else h.x += jitter() * 1.5;                         // stood a little off the spot
  if (running) { h.vx = running * h.s.run; h.face = running; }
  const inputs = humanize(seq);
  for (let f = 0; f < 320; f++) {
    const inp = inputs[f] || N;
    GG.heroStep(h, inp, ctx.lv, ctx.extra, ctx.mods);
    h.x = GG.clamp(h.x, 0, ctx.lv.pw - h.w);
    if (ctx.dead(h)) return h.y > ctx.lv.ph || GG.inKind(h, ctx.lv, GG.K.DEATH, 2) ? 'fall' : 'hurt';
    if (S.touchesGoal(h)) return 'safe';
    if (f >= inputs.length && ((h.onGround && Math.abs(h.vx) < 0.05) || h.onLadder)) return 'safe';
  }
  return 'safe';
}

/* A move on the safest route, and how a person fares at it. */
export interface Move { from: string; to: string; safe: number; falls: number; hurts: number }
export interface StageReport { key: string; moves: Move[]; slips: number; clean: number; error?: string }

/* A small binary heap of [cost, payload]. */
class Heap<T> {
  a: { c: number; v: T }[] = [];
  push(c: number, v: T) {
    const a = this.a; a.push({ c, v });
    for (let i = a.length - 1; i > 0;) { const p = (i - 1) >> 1; if (a[p].c <= a[i].c) break; [a[p], a[i]] = [a[i], a[p]]; i = p; }
  }
  pop(): { c: number; v: T } | undefined {
    const a = this.a; if (!a.length) return undefined;
    const top = a[0], last = a.pop()!;
    if (a.length) {
      a[0] = last;
      for (let i = 0; ;) {
        const l = 2 * i + 1, r = l + 1; let m = i;
        if (l < a.length && a[l].c < a[m].c) m = l;
        if (r < a.length && a[r].c < a[m].c) m = r;
        if (m === i) break; [a[m], a[i]] = [a[i], a[m]]; i = m;
      }
    }
    return top;
  }
}

/* cautious: a player who stops before every jump (no running starts). */
export function measure(GG: any, def: any, cautious = false): StageReport {
  seed = 1;
  // The solver's moves and physics, without its search (it stops at the first new place).
  const base = solve(GG, def, undefined, { target: () => true, noRunning: cautious });
  if (!base.ctx) return { key: def.key, moves: [], slips: Infinity, clean: 0, error: base.error || 'no start' };
  const ctx = base.ctx;
  const { lv } = ctx;
  const { K } = GG;
  const hazard = (x0: number, y0: number, x1: number, y1: number) => {
    for (let ty = Math.max(0, Math.floor(y0 / 16)); ty <= Math.min(lv.h - 1, Math.floor(y1 / 16)); ty++)
      for (let tx = Math.max(0, Math.floor(x0 / 16)); tx <= Math.min(lv.w - 1, Math.floor(x1 / 16)); tx++) {
        const k = lv.kind[ty * lv.w + tx];
        if (k === K.DEATH || k === K.SPIKE) return true;
      }
    return y1 > lv.ph - 16 && x0 >= 0;   // the bottom of the map is a fall too
  };
  const S: Sim = { GG, ctx, hazard, touchesGoal: (h) => ctx.goals.some((g: any) => touches(GG, h, g)) };
  const tile = (h: any) => `${Math.floor((h.x + h.w / 2) / 16)},${Math.floor((h.y + h.h - 1) / 16)}`;

  type Node = { key: string; h: any; prev: string | null; move: Move | null };
  const nodes = new Map<string, Node>();
  const cost = new Map<string, number>();
  const heap = new Heap<Node>();
  const start = { key: ctx.keyOf(ctx.start), h: ctx.start, prev: null, move: null };
  cost.set(start.key, 0); heap.push(0, start);
  let goal: Node | null = null;
  let popped = 0;
  for (let top = heap.pop(); top; top = heap.pop()) {
    const node = top.v;
    if (nodes.has(node.key)) continue;
    nodes.set(node.key, node);
    if (node.key === 'GOAL') { goal = node; break; }
    if (++popped > 20000) break;
    for (let pi = 0; pi < ctx.plans.length; pi++) {
      if (cautious && ctx.plans[pi].running) continue;
      const rec = record(S, node.h, pi);
      if (!rec) continue;
      const end = Object.assign({}, rec.end, { vx: 0, vy: 0, buffer: 0, wallGrace: 0, wallLock: 0, coyote: 0 });
      const key = rec.goal ? 'GOAL' : ctx.keyOf(end);
      if (nodes.has(key)) continue;
      // How a person fares: only worth replaying many times if danger is near.
      let safe = 1, falls = 0, hurts = 0;
      if (rec.near) {
        const n = { safe: 0, fall: 0, hurt: 0 };
        let tries = 0;
        for (; tries < SAMPLES; tries++) {
          n[attempt(S, node.h, ctx.plans[pi].running || 0, rec.seq)]++;
          if (tries + 1 === FIRST && n.safe === FIRST) { tries++; break; }
        }
        safe = n.safe / tries; falls = n.fall / tries; hurts = n.hurt / tries;
      }
      const c = top.c - Math.log(Math.max(safe, 0.002)) + 0.002;
      if (c < (cost.get(key) ?? Infinity)) {
        cost.set(key, c);
        heap.push(c, { key, h: end, prev: node.key, move: { from: tile(node.h), to: rec.goal ? 'the goal' : tile(end), safe, falls, hurts } });
      }
    }
  }
  if (!goal) return { key: def.key, moves: [], slips: Infinity, clean: 0, error: 'no route to the goal' };
  const moves: Move[] = [];
  for (let n: Node | undefined = goal; n && n.move; n = n.prev ? nodes.get(n.prev) : undefined) moves.unshift(n.move);
  const slips = moves.reduce((s, m) => s + (1 - m.safe), 0);
  const clean = moves.reduce((p, m) => p * m.safe, 1);
  return { key: def.key, moves, slips, clean };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const GG = loadGame();
  let failures = 0;
  const modes = CHECK ? [false, true] : [CAUTIOUS];
  console.log(`Presses and releases up to ${J} frame(s) early or late; the safest route through each stage.\n`);
  for (const def of GG.stages) {
    if (want.length && !want.includes(def.key)) continue;
    if (def.solver === false) { console.log(`${def.key.padEnd(4)} skipped: ${def.solverNote || 'checked by a bot instead'}`); continue; }
    for (const cautious of modes) {
      const t0 = Date.now();
      const rep = measure(GG, def, cautious);
      const who = cautious ? 'cautious ' : 'confident';
      if (rep.error) { failures++; console.log(`${def.key.padEnd(4)} ${who} FAIL ${rep.error}`); continue; }
      const hardest = rep.moves.slice().sort((a, b) => a.safe - b.safe);
      const budget = BUDGET[def.key];
      const bad = budget !== undefined && (rep.slips > budget || (hardest.length > 0 && hardest[0].safe < HARDEST_MIN));
      if (CHECK && bad) failures++;
      console.log(`${def.key.padEnd(4)} ${who} ${CHECK ? (bad ? 'FAIL ' : 'ok   ') : ''}${rep.slips.toFixed(2)} expected slips${budget !== undefined ? ` (budget ${budget})` : ''} over ${rep.moves.length} moves, no slip ${(rep.clean * 100).toFixed(0)}% of the time (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
      const pc = (v: number) => `${(v * 100).toFixed(0)}%`;
      const list = SHOW_ALL ? rep.moves : hardest.filter((m) => m.safe < 0.97).slice(0, 6);
      for (const m of list) console.log(`       ${pc(m.safe).padStart(4)} safe  ${(m.from + ' -> ' + m.to).padEnd(18)}${m.falls ? ` falls ${pc(m.falls)}` : ''}${m.hurts ? ` spikes ${pc(m.hurts)}` : ''}`);
    }
  }
  if (CHECK) console.log(failures ? `\n${failures} stage(s) ask for more precision than their budget` : '\nEvery stage is within its precision budget.');
  process.exit(failures ? 1 : 0);
}
