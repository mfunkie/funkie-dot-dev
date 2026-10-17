/*
 * Do recorded runs replay exactly? For each stage this plays 20 seconds of
 * erratic, seeded input in the browser (running, jumping, throwing, dying
 * and respawning as it happens), keeps the recording the game makes, replays
 * it with GG.replay, and compares the hero's position and the world's state
 * on every frame. Any difference means something in play isn't driven by the
 * seed and the buttons, and playtest replays can't be trusted.
 *
 *   node scripts/gatsby/replay-check.ts [stageKey ...]
 *   node scripts/gatsby/replay-check.ts --mutate   (self-test: a replay with
 *     another seed and every input a frame early must come out different)
 */
import { openGame } from './lib/browser.ts';

const argv = process.argv.slice(2);
const mutate = argv.includes('--mutate');
const want = argv.filter((a) => !a.startsWith('--'));
const gp = await openGame('?debug');
const results = await gp.page.evaluate(([want, mutate]: [string[], boolean]) => {
  const GG = (globalThis as any).GG, D = GG._dbg;
  const out: { stage: string; frames: number; deaths: number; ok: boolean; firstDiff: number | null; note?: string }[] = [];
  const snap = () => {
    const W = D.W(), h = W.hero;
    return [h.x, h.y, h.vx, h.vy, W.hearts, W.items, W.ents.length, W.t].map((v: number) => Math.round(v * 1000)).join(',');
  };
  for (let i = 0; i < GG.stages.length; i++) {
    const key = GG.stages[i].key;
    if (want.length && !want.includes(key)) continue;
    let run: any = null, deaths = 0;
    GG.on('leave', (e: any) => { if (e.stage === key) run = run || e.run; });
    GG.on('death', () => { deaths++; });
    // Record: erratic input from its own generator (not the game's).
    let s = 12345 + i;
    const r = () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
    D.startFresh(i, 777 + i);
    const K = D.keyHeld, a: string[] = [];
    let hold = 0;
    for (let f = 0; f < 1200 && D.playing(); f++) {
      if (hold-- <= 0) {
        hold = 4 + Math.floor(r() * 20);
        K.l = r() < 0.15 ? 1 : 0; K.r = K.l ? 0 : r() < 0.8 ? 1 : 0;
        K.a = r() < 0.45 ? 1 : 0; K.b = r() < 0.2 ? 1 : 0; K.u = r() < 0.1 ? 1 : 0; K.d = r() < 0.05 ? 1 : 0;
      }
      D.step(1);
      if (D.playing()) a.push(snap());
    }
    for (const k of ['l', 'r', 'u', 'd', 'a', 'b']) K[k] = 0;
    D.endRun('test');
    if (!run) { out.push({ stage: key, frames: a.length, deaths, ok: false, firstDiff: null, note: 'no recording' }); continue; }
    // Replay and compare frame by frame.
    if (mutate) {
      run = JSON.parse(JSON.stringify(run));
      // Another seed, and every input one frame early.
      run.seed ^= 1;
      if (run.rle[1] > 1) run.rle[1]--; else run.rle.splice(0, 2);
    }
    GG.replay(run);
    const b: string[] = [];
    for (let f = 0; f < a.length && D.playing(); f++) { D.step(1); if (D.playing()) b.push(snap()); }
    let firstDiff: number | null = null;
    for (let f = 0; f < Math.max(a.length, b.length); f++) if (a[f] !== b[f]) { firstDiff = f; break; }
    out.push({ stage: key, frames: a.length, deaths, ok: firstDiff === null, firstDiff, note: firstDiff !== null ? `recorded ${a[firstDiff]} / replayed ${b[firstDiff]}` : undefined });
    D.go(D.titleState());
  }
  return out;
}, [want, mutate] as [string[], boolean]);
let bad = 0;
for (const r of results) {
  if (r.ok === mutate) bad++;
  console.log(`${r.stage.padEnd(4)} ${r.ok ? 'OK  ' : 'DIFF'} ${r.frames} frames, ${r.deaths} deaths${r.firstDiff !== null ? `, first difference at frame ${r.firstDiff}: ${r.note}` : r.note ? ', ' + r.note : ''}`);
}
if (gp.errors.length) { console.log(gp.errors.join('\n')); bad++; }
await gp.close();
console.log(bad ? `\n${bad} problem(s)` : mutate ? '\nEvery tampered replay was caught.' : '\nEvery recorded run replays frame for frame.');
process.exit(bad ? 1 : 0);
