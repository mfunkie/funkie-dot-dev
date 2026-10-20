/*
 * Plays every room of JEKYLL.EXE in Chromium, through the game's own input,
 * with the solver's shortest way through, and checks that each one ends in
 * the next room (or the chapter's last pages), with no errors on the page.
 * This is the whole game, as a player would drive it: routes, animation,
 * undo, the change, every exit and act.
 *
 *   node scripts/jekyll/play.ts [--room ID] [--from ID]
 */
import fs from 'node:fs';
import { openGame } from './lib/browser.ts';
import { loadGame } from './lib/game.ts';

const argv = process.argv.slice(2);
const only = argv.includes('--room') ? argv[argv.indexOf('--room') + 1] : null;
const from = argv.includes('--from') ? argv[argv.indexOf('--from') + 1] : null;
let started = !from;
const J = loadGame();
const LOG = argv.includes('--log') ? argv[argv.indexOf('--log') + 1] : null;
const say = (line: string) => { console.log(line); if (LOG) fs.appendFileSync(LOG, line + '\n'); };
const KEY: Record<string, string> = { n: 'ArrowUp', s: 'ArrowDown', e: 'ArrowRight', w: 'ArrowLeft', wait: 'Space', drink: 'KeyX' };

const g = await openGame('?debug', { width: 800, height: 700 });
const { page } = g;
let bad = 0;
for (let c = 0; c < J.CHAPTERS.length; c++) {
  const ch = J.CHAPTERS[c];
  for (let r = 0; r < ch.rooms.length; r++) {
    const id = ch.rooms[r];
    if (only && id !== only) continue;
    if (id === from) started = true;
    if (!started) continue;
    const cr = J.compile(id);
    const sol = J.solve(cr, J.initState(cr), { max: 4e6 });
    if (!sol.ok) { say(`FAIL ${id}: no solution`); bad++; continue; }
    await page.evaluate((h) => { location.hash = h; }, `#/chapter/${c + 1}/${r + 1}`);
    await page.waitForFunction((want) => (globalThis as any).JH._dbg.route() === want, `chapter/${c + 1}/${r + 1}`);
    await page.waitForTimeout(150);
    // Clear any opening banner, then play.
    let turn = 0;
    for (const a of sol.path) {
      // A long message opens a window; any key closes it, as a player would.
      if (await page.evaluate(() => (globalThis as any).JH._dbg.state().debug?.().popup)) {
        await page.keyboard.press('Enter');
        await page.waitForFunction(() => !(globalThis as any).JH._dbg.state().debug?.().popup);
      }
      await page.keyboard.press(KEY[a]);
      turn++;
      if (process.env.VERBOSE) say(`  ${turn} ${a} ` + JSON.stringify(await page.evaluate(() => { const s = (globalThis as any).JH._dbg.state(); const d = s.debug?.(); return d ? { t: d.turns, busy: s.busy(), pop: d.popup, fail: d.fail && d.fail.text } : (globalThis as any).JH._dbg.route(); })));
      // Wait for the move to count and its animation to finish.
      await page.waitForFunction((n) => {
        const s = (globalThis as any).JH._dbg.state();
        const d = s.debug ? s.debug() : null;
        return !d || (d.turns >= n && !s.busy());
      }, turn, { timeout: 5000 });
    }
    // The room should hand over to the next one, or to the chapter's end.
    const want = r + 1 < ch.rooms.length ? `chapter/${c + 1}/${r + 2}` : null;
    try {
      await page.waitForFunction((w) => {
        const route = (globalThis as any).JH._dbg.route();
        return w ? route === w : !/^chapter\/\d+\/\d+$/.test(route) || route !== location.hash.slice(2);
      }, want, { timeout: 4000 });
      const route = await page.evaluate(() => (globalThis as any).JH._dbg.route());
      if (!want && /^chapter\/\d+\/\d+$/.test(route)) throw new Error('still in ' + route);
      say(`ok   ${id.padEnd(18)} ${String(sol.path.length).padStart(3)} moves  -> ${route || 'title'}`);
    } catch (e) {
      bad++;
      const route = await page.evaluate(() => (globalThis as any).JH._dbg.route());
      say(`FAIL ${id}: after ${sol.path.length} moves the game is at ${route}`);
      await page.locator('#screen').screenshot({ path: `/tmp/jekyll-fail-${id}.png` });
    }
  }
}
if (g.errors.length) { console.log(g.errors.join('\n')); bad++; }
await g.close();
console.log(bad ? `${bad} problem(s)` : 'every room plays through in the browser');
process.exit(bad ? 1 : 0);
