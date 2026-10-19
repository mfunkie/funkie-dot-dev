/*
 * Nothing floats that shouldn't. A lamp a tile above the lawn, a brick walk
 * in mid-air, a table with its legs short of the floor: each reads as a
 * mistake, so every stage is checked for them.
 *
 *   scenery   Every piece of terrain (with the pieces it touches) has to reach
 *             the ground, a side of the stage or its top (a ceiling, girders).
 *             Terrain marked mount: 'wall' (on the back wall: windows,
 *             shelves, sconces) or mount: 'overhead' (hung from above:
 *             chandeliers, strings of lights) in its tileset may float.
 *   standing  Anything that stands (people, ponies, lamps, signs, the start)
 *             has floor right under it. Things that fly, fall, float on water
 *             or bridge a gap are held to that instead (see HELD below).
 *   curtains  Each curtain blows out of a window.
 *
 * A stage can excuse a spot with floats: [{ at: [x0, y0, x1, y1], why }] in
 * stages.js; excused ones are reported, not failed.
 *
 *   node scripts/gatsby/ground-lint.ts [stageKey ...]
 */
import { loadGame } from './lib/game.ts';

/* How each kind of entity is held up. */
const HELD: Record<string, 'stands' | 'flies' | 'floats' | 'bridges' | 'moored' | 'window'> = {
  start: 'stands', checkpoint: 'stands', goal: 'stands', npcgoal: 'stands', sign: 'stands', person: 'stands',
  pony: 'stands', ashman: 'stands', guest: 'stands', flapper: 'stands', twins: 'stands', juicer: 'stands',
  wolfsheim: 'stands', crayfish: 'stands', daisy: 'stands', tom: 'stands', rat: 'stands', car: 'stands',
  hearse: 'stands', ashcar: 'stands', fan: 'stands', train: 'stands', greenlight: 'stands',
  // Pickups hover as pickups do; birds fly; droppers hang in a tree or from a
  // ceiling until they fall; gas drifts; shirts are thrown; the billboard is
  // the boss.
  orange: 'flies', item: 'flies', bird: 'flies', dropper: 'flies', ashcloud: 'flies', shirtfall: 'flies', eckleburg: 'flies',
  rowboat: 'floats', boat: 'floats', buoy: 'floats',
  crumble: 'bridges',
  // "As though upon an anchored balloon": the couch has its moorings drawn.
  couch: 'moored',
  curtain: 'window',
};

const want = process.argv.slice(2);
const GG = loadGame();
const { K } = GG;
let failures = 0;
const unknown = new Set<string>();

for (const def of GG.stages) {
  if (want.length && !want.includes(def.key)) continue;
  const lv = GG.compile(def);
  const { w, h } = lv;
  const ts = GG.tilesets[def.tileset];
  const lines: string[] = [];
  let stageFail = false;
  const excuse = (x0: number, y0: number, x1: number, y1: number) =>
    (def.floats || []).find((f: any) => f.at[0] <= x0 && f.at[1] <= y0 && f.at[2] >= x1 && f.at[3] >= y1);
  const report = (what: string, x0: number, y0: number, x1: number, y1: number) => {
    const ex = excuse(x0, y0, x1, y1);
    const where = x0 === x1 && y0 === y1 ? `${x0},${y0}` : `${x0}-${x1},${y0}-${y1}`;
    if (ex) lines.push(`  excused ${what} at ${where} (${ex.why})`);
    else { stageFail = true; lines.push(`  FAIL    ${what} at ${where}`); }
  };

  // Scenery: pieces of unmounted terrain, joined side to side and top to bottom.
  const mounted = (i: number) => !!(lv.terr[i] && ts.terrain[lv.terr[i]].mount);
  const piece = new Int32Array(w * h).fill(-1);
  let n = 0;
  for (let i = 0; i < w * h; i++) {
    if (!lv.terr[i] || mounted(i) || piece[i] >= 0) continue;
    const cells: number[] = [];
    const stack = [i]; piece[i] = n;
    while (stack.length) {
      const j = stack.pop()!; cells.push(j);
      const x = j % w, y = (j - x) / w;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const k = ny * w + nx;
        if (lv.terr[k] && !mounted(k) && piece[k] < 0) { piece[k] = n; stack.push(k); }
      }
    }
    n++;
    const xs = cells.map((j) => j % w), ys = cells.map((j) => Math.floor(j / w));
    if (ys.some((y) => y === h - 1 || y === 0) || xs.some((x) => x === 0 || x === w - 1)) continue;
    const names = [...new Set(cells.map((j) => lv.terr[j]))].join(', ');
    report(`${names} in mid-air`, Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys));
  }

  // Entities.
  const kind = (x: number, y: number) => GG.kindAt(lv, x, y);
  const floor = (k: number) => GG.isSolid(k) || k === K.ONEWAY || k === K.LADDER;
  const water = (k: number) => k === K.WATER || k === K.DEATH;
  for (const e of lv.ents) {
    const held = HELD[e.e];
    if (!held) { unknown.add(e.e); continue; }
    const below = kind(e.cx, e.cy + 1);
    if (held === 'stands') {
      if (floor(below) || floor(kind(e.cx, e.cy))) continue;
      if (e.e === 'start' && def.autoscroll) continue;     // he starts on the ride
      if (e.e === 'ashcar' && water(below)) continue;      // a barge
      report(`${e.e}${e.spr ? ' (' + e.spr + ')' : ''} standing on nothing`, e.cx, e.cy, e.cx, e.cy);
    } else if (held === 'floats') {
      if (!water(below) && !water(kind(e.cx, e.cy))) report(`${e.e} afloat with no water under it`, e.cx, e.cy, e.cx, e.cy);
    } else if (held === 'bridges') {
      // On something, or one of a run of them with a support at each end.
      if (below !== K.EMPTY) continue;
      const run = (d: number) => { let x = e.cx; while (lv.ents.some((o: any) => o.e === e.e && o.cy === e.cy && o.cx === x + d)) x += d; return x + d; };
      if (floor(kind(run(-1), e.cy)) && floor(kind(run(1), e.cy))) continue;
      report(`${e.e} with nothing under it and no support at either end`, e.cx, e.cy, e.cx, e.cy);
    } else if (held === 'window') {
      const anchor = (e.dir || 1) > 0 ? e.cx - 1 : e.cx + 1;
      const t = lv.terr[e.cy * w + anchor];
      if (!(t && ts.terrain[t].mount === 'wall' && /window/.test(t))) report(`${e.e} blowing out of no window`, e.cx, e.cy, e.cx, e.cy);
    }
  }

  if (stageFail) failures++;
  console.log(`${def.key.padEnd(4)} ${stageFail ? 'FAIL' : 'ok'}${lines.length ? '\n' + lines.join('\n') : ''}`);
}
if (unknown.size) {
  failures++;
  console.log(`\nNo rule for how these are held up (add them to HELD): ${[...unknown].join(', ')}`);
}
console.log(failures ? `\n${failures} stage(s) with something floating` : '\nNothing floats that shouldn\'t.');
process.exit(failures ? 1 : 0);
