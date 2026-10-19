/*
 * Makes a sample playtest log by letting three scripted "players" loose on
 * every stage with ?playtest on, the same way a person's log is made: the
 * game records each run and playtest.js logs it. One plays blind and answers
 * the recognition question after each chapter. The bots run right, jump and
 * throw erratically for a while (dying where the stages are dangerous), then
 * the stage is cleared for them; the third quits one stage partway.
 *
 *   node scripts/gatsby/playtest-bot.ts [--out scripts/gatsby/fixtures/playtest-sample.json]
 *
 * It exists to test the playtest kit end to end (heatmap.ts reads its
 * output), not to judge difficulty: bots aren't people.
 */
import fs from 'node:fs';
import path from 'node:path';
import { openGame } from './lib/browser.ts';
import { ROOT } from './lib/game.ts';

const argv = process.argv.slice(2);
const out = argv.includes('--out') ? argv[argv.indexOf('--out') + 1] : path.join(ROOT, 'scripts/gatsby/fixtures/playtest-sample.json');
const ANSWERS: Record<string, string> = {
  '1': 'the Buchanans lawn, start of the book', '2-1': 'valley of ashes', '2-2': 'the billboard eyes', '3': "Gatsby's party",
  '4-1': 'driving into the city', '4-2': 'no idea', '5': 'the shirts!', '6': 'Gatsby as a kid? Dan Cody', '7': 'the hotel fight with Tom',
  '8': 'the war', '9': 'the ending, boats against the current',
};
const players = [
  { name: 'BOT-ANNA', seed: 11, patience: 2400 },
  { name: 'BOT-BEN', seed: 23, patience: 1500, quit: '8' },
  { name: 'BOT-CARA', seed: 37, patience: 1800, blind: true },
];

const gp = await openGame('?debug');
await gp.page.evaluate(() => localStorage.removeItem('gatsby-exe-playtest'));
for (const p of players) {
  await gp.page.goto(`${gp.origin}/games/gatsby/index.html?debug&playtest=${p.name}${p.blind ? '&blind' : ''}`);
  await gp.page.waitForFunction(() => (globalThis as any).GG?.playtest);
  const keys = (await gp.page.evaluate(() => (globalThis as any).GG.stages.map((s: any) => s.key))) as string[];
  for (let i = 0; i < keys.length; i++) {
    await gp.page.evaluate(([i, seed, patience, quit]: [number, number, number, boolean]) => {
      const GG = (globalThis as any).GG, D = GG._dbg, K = D.keyHeld;
      let s = seed * 1000 + i;
      const r = () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
      D.startFresh(i, seed * 100 + i);
      let hold = 0;
      const frames = Math.floor(patience * (0.6 + r() * 0.8));
      for (let f = 0; f < frames && D.playing(); f++) {
        if (hold-- <= 0) {
          hold = 6 + Math.floor(r() * 24);
          K.l = r() < 0.12 ? 1 : 0; K.r = K.l ? 0 : r() < 0.85 ? 1 : 0;
          K.a = r() < 0.5 ? 1 : 0; K.b = r() < 0.25 ? 1 : 0; K.u = r() < 0.15 ? 1 : 0;
        }
        D.step(1);
      }
      for (const k of ['l', 'r', 'u', 'd', 'a', 'b']) K[k] = 0;
      if (quit) { D.endRun('quit'); return; }
      const W = D.W();
      if (W && !W.done) W.clear();
      for (let f = 0; f < 200 && D.playing(); f++) D.step(1);
    }, [i, p.seed, p.patience, p.quit === keys[i]] as [number, number, number, boolean]);
    if (p.blind && (await gp.page.$('#pt-answer'))) {
      await gp.page.fill('#pt-answer', ANSWERS[keys[i]] || 'no idea');
      await gp.page.keyboard.press('Enter');
    }
  }
}
const log = await gp.page.evaluate(() => localStorage.getItem('gatsby-exe-playtest'));
if (gp.errors.length) { console.error(gp.errors.join('\n')); process.exitCode = 1; }
await gp.close();
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, log + '\n');
const v = JSON.parse(log!);
console.log(`wrote ${path.relative(ROOT, out)}: ${v.sessions.length} sessions, ${v.sessions.reduce((n: number, s: any) => n + s.runs.length, 0)} runs, ${v.sessions.reduce((n: number, s: any) => n + s.runs.reduce((m: number, r: any) => m + r.deaths.length, 0), 0)} deaths, ${(log!.length / 1024).toFixed(0)} KB`);
