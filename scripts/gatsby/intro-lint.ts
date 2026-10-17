/*
 * "Teach before you test": the first time a stage shows the player each of
 * its mechanics, a mistake should cost a heart, not a life. This finds each
 * mechanic's first encounter along the solver's own route through the stage
 * (the order it discovers places to stand, starting from the start) and
 * checks that encounter:
 *
 *   enemies      no pit or deadly tile under the stretch where you meet them
 *   rides        nothing deadly under the first platform you ride (a missed
 *                jump drops you somewhere you can walk back from)
 *   pits         the first gap is narrow (half a running jump or less) with
 *                level ground on both sides
 *   spikes       the first patch is at most three tiles wide
 *   pushes       (fans, currents) nothing deadly where you first feel one
 *
 * A stage can excuse an encounter with intro: { type: 'why' } in stages.js;
 * excused ones are reported, not failed.
 *
 *   node scripts/gatsby/intro-lint.ts [stageKey ...]
 */
import { loadGame } from './lib/game.ts';
import { solve } from './solve.ts';

/* What each map entity is, as far as teaching goes. */
const KIND: Record<string, 'enemy' | 'ride' | 'push' | 'hazard'> = {
  pony: 'enemy', person: 'enemy', ashman: 'enemy', flapper: 'enemy', guest: 'enemy', twins: 'enemy', juicer: 'enemy',
  bird: 'enemy', hearse: 'enemy', crayfish: 'enemy', rat: 'enemy', dropper: 'hazard', ashcloud: 'hazard', train: 'hazard',
  curtain: 'ride', crumble: 'ride', ashcar: 'ride', car: 'ride', shirtfall: 'ride', rowboat: 'ride', boat: 'ride', buoy: 'ride', platform: 'ride',
  fan: 'push',
};
const NEAR_X = 5, NEAR_Y = 4;

const want = process.argv.slice(2);
const GG = loadGame();
const { K } = GG;
let failures = 0;

for (const def of GG.stages) {
  if (want.length && !want.includes(def.key)) continue;
  const lv = GG.compile(def);
  const kindAt = (x: number, y: number) => GG.kindAt(lv, x, y);
  const solidish = (k: number) => GG.isSolid(k) || k === K.ONEWAY || k === K.LADDER;
  // A column is deadly below row y if you'd fall into a death tile or off the map.
  const deadlyBelow = (x: number, y: number) => {
    for (let ty = y; ty < lv.h; ty++) {
      const k = kindAt(x, ty);
      if (k === K.DEATH) return true;
      if (solidish(k) || k === K.WATER) return false;
    }
    return true;
  };
  const deadlySpan = (x0: number, x1: number, y: number) => {
    for (let x = Math.max(0, x0); x <= Math.min(lv.w - 1, x1); x++) if (deadlyBelow(x, y)) return x;
    return -1;
  };

  // Mechanic instances: entities by type, plus tiles (pits and spikes) by patch.
  type Inst = { type: string; cat: string; cx: number; cy: number; e?: any };
  const inst: Inst[] = [];
  for (const e of lv.ents) if (KIND[e.e]) inst.push({ type: e.e, cat: KIND[e.e], cx: e.cx, cy: e.cy, e });
  for (let y = 0; y < lv.h; y++) for (let x = 0; x < lv.w; x++) {
    const k = kindAt(x, y);
    if (k === K.SPIKE && kindAt(x - 1, y) !== K.SPIKE) inst.push({ type: 'spikes', cat: 'spikes', cx: x, cy: y });
    // A pit is deadly ground you have to jump: open above, not water under a dock.
    if (k === K.DEATH && kindAt(x - 1, y) !== K.DEATH && kindAt(x, y - 1) === K.EMPTY && kindAt(x, y - 2) === K.EMPTY) inst.push({ type: 'pit', cat: 'pit', cx: x, cy: y });
  }
  if (def.solverMods && def.solverMods.push) inst.push({ type: 'current', cat: 'push', cx: lv.start.cx, cy: lv.start.cy });

  // The solver's route: the order it found places to stand.
  const r = solve(GG, def);
  const first = new Map<string, { i: Inst; at: number }>();
  let n = 0;
  for (const h of r.seen.values()) {
    const tx = Math.floor((h.x + h.w / 2) / 16), ty = Math.floor((h.y + h.h - 1) / 16);
    for (const i of inst) {
      if (first.has(i.type)) continue;
      if (Math.abs(i.cx - tx) <= NEAR_X && Math.abs(i.cy - ty) <= NEAR_Y) first.set(i.type, { i, at: n });
    }
    n++;
  }

  const lines: string[] = [];
  let stageFail = false;
  for (const [type, { i }] of [...first.entries()].sort((a, b) => a[1].at - b[1].at)) {
    let problem = '';
    if (i.cat === 'enemy' || i.cat === 'hazard') {
      const x = deadlySpan(i.cx - 4, i.cx + 4, i.cy + 1);
      if (x >= 0) problem = `a deadly drop at column ${x}, within 4 tiles`;
    } else if (i.cat === 'ride') {
      const range = Math.max(2, (i.e && (i.e.range || i.e.max || i.e.spread)) || 2);
      const x = deadlySpan(i.cx - 1, i.cx + range + 2, i.cy + 1);
      if (x >= 0) problem = `a deadly drop under it at column ${x}`;
    } else if (i.cat === 'pit') {
      let w = 0; while (deadlyBelow(i.cx + w, i.cy) && kindAt(i.cx + w, i.cy - 1) === K.EMPTY && w < 40) w++;
      const ground = (x: number) => { for (let y = 0; y < lv.h; y++) if (solidish(kindAt(x, y))) return y; return lv.h; };
      const left = ground(i.cx - 1), right = ground(i.cx + w);
      if (w > 2) problem = `the first gap is ${w} tiles wide`;
      else if (Math.abs(left - right) > 1) problem = `the first gap's sides differ by ${Math.abs(left - right)} tiles`;
    } else if (i.cat === 'spikes') {
      let w = 0; while (kindAt(i.cx + w, i.cy) === K.SPIKE && w < 40) w++;
      if (w > 3) problem = `the first spikes are ${w} tiles wide`;
    } else if (i.cat === 'push') {
      const x = deadlySpan(i.cx - 3, i.cx + 3, i.cy + 1);
      if (x >= 0) problem = `a deadly drop at column ${x} where it first pushes`;
    }
    const excuse = def.intro && def.intro[type];
    const status = !problem ? 'ok    ' : excuse ? 'excused' : 'FAIL  ';
    if (problem && !excuse) stageFail = true;
    lines.push(`  ${status} ${type.padEnd(10)} first met at ${i.cx},${i.cy}${problem ? ': ' + problem : ''}${problem && excuse ? ` (${excuse})` : ''}`);
  }
  const missed = [...new Set(inst.map((i) => i.type))].filter((t) => !first.has(t));
  if (missed.length) lines.push(`  (never near on the solver's route: ${missed.join(', ')})`);
  if (stageFail) failures++;
  console.log(`${def.key} ${stageFail ? 'FAIL' : 'ok'}\n${lines.join('\n')}`);
}
console.log(failures ? `\n${failures} stage(s) test a mechanic before teaching it` : '\nEvery mechanic is met somewhere safe first.');
process.exit(failures ? 1 : 0);
