/*
 * Plays every room of JEKYLL.EXE in Chromium, through the game's own input,
 * with the solver's shortest way through, and checks that each one ends in
 * the next room (or the chapter's last pages), with no errors on the page.
 * This is the whole game, as a player would drive it: routes, animation,
 * undo, the change, every exit and act. Then it pages through every story
 * sequence (prologue, each chapter's opening and closing pages, ending), so
 * every picture is drawn. A room or a story that stops the page responding
 * fails after a minute instead of hanging the check.
 *
 *   node scripts/jekyll/play.ts [--room ID] [--from ID] [--log FILE]
 */
import fs from 'node:fs';
import { openGame } from './lib/browser.ts';
import { loadGame } from './lib/game.ts';

const argv = process.argv.slice(2);
const arg = (name: string) => (argv.includes(name) ? argv[argv.indexOf(name) + 1] : null);
const only = arg('--room');
const from = arg('--from');
const LOG = arg('--log');
const say = (line: string) => { console.log(line); if (LOG) fs.appendFileSync(LOG, line + '\n'); };
const KEY: Record<string, string> = { n: 'ArrowUp', s: 'ArrowDown', e: 'ArrowRight', w: 'ArrowLeft', wait: 'Space', drink: 'KeyX' };

const J = loadGame();
const g = await openGame('?debug', { width: 800, height: 700 });
const { page } = g;
let bad = 0;

/* A page that stops answering (a loop in a picture, say) fails, not hangs. */
function watchdog<T>(p: Promise<T>, ms: number, what: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return Promise.race([
    p.finally(() => clearTimeout(timer)),
    new Promise<T>((_, reject) => { timer = setTimeout(() => reject(new Error(`${what}: the page stopped answering`)), ms); }),
  ]);
}

const route = () => page.evaluate(() => (globalThis as any).JH._dbg.route() as string);

/* One room: go to it by its link, play the moves, see where the game goes. */
async function playRoom(c: number, r: number, id: string, path: string[]) {
  const ch = J.CHAPTERS[c];
  await page.evaluate((h) => { location.hash = h; }, `#/chapter/${c + 1}/${r + 1}`);
  await page.waitForFunction((want) => (globalThis as any).JH._dbg.route() === want, `chapter/${c + 1}/${r + 1}`);
  await page.waitForTimeout(150);
  let turn = 0;
  for (const a of path) {
    // A long message opens a window; any key closes it, as a player would.
    if (await page.evaluate(() => (globalThis as any).JH._dbg.state().debug?.().popup)) {
      await page.keyboard.press('Enter');
      await page.waitForFunction(() => !(globalThis as any).JH._dbg.state().debug?.().popup, null, { timeout: 5000 });
    }
    await page.keyboard.press(KEY[a]);
    turn++;
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
      const now = (globalThis as any).JH._dbg.route();
      return w ? now === w : !/^chapter\/\d+\/\d+$/.test(now);
    }, want, { timeout: 4000 });
    say(`ok   ${id.padEnd(18)} ${String(path.length).padStart(3)} moves  -> ${(await route()) || 'title'}`);
  } catch {
    bad++;
    say(`FAIL ${id}: after ${path.length} moves the game is at ${await route()}`);
    await page.locator('#screen').screenshot({ path: `/tmp/jekyll-fail-${id}.png` });
  }
}

/* One story sequence: Enter shows the rest of a page, then turns it. */
async function readStory(id: string, pages: number) {
  await page.evaluate((h) => { location.hash = h; }, `#/story/${id}`);
  await page.waitForFunction((want) => (globalThis as any).JH._dbg.route() === want, `story/${id}`);
  for (let k = 0; k < pages * 2 + 2; k++) {
    await page.keyboard.press('Enter');
    await page.waitForTimeout(60);
    if ((await route()) === '') break;
  }
  await page.waitForFunction(() => (globalThis as any).JH._dbg.route() === '', null, { timeout: 5000 });
  say(`ok   story/${id.padEnd(12)} ${String(pages).padStart(3)} pages`);
}

let started = !from;
rooms: for (let c = 0; c < J.CHAPTERS.length; c++) {
  const ch = J.CHAPTERS[c];
  for (let r = 0; r < ch.rooms.length; r++) {
    const id = ch.rooms[r];
    if (only && id !== only) continue;
    if (id === from) started = true;
    if (!started) continue;
    const cr = J.compile(id);
    const sol = J.solve(cr, J.initState(cr), { max: 4e6 });
    if (!sol.ok) { say(`FAIL ${id}: no solution`); bad++; continue; }
    try {
      await watchdog(playRoom(c, r, id, sol.path), 60000, id);
    } catch (e: any) {
      bad++;
      say(`FAIL ${e.message}`);
      break rooms;
    }
  }
}

if (!only && !from && !bad) {
  const stories = ['prologue', 'ending', ...J.CHAPTERS.flatMap((_: unknown, i: number) => [`ch${i + 1}-intro`, `ch${i + 1}-outro`])];
  for (const id of stories) {
    const pages = await page.evaluate((sid) => { const s = (globalThis as any).JH.storyById(sid); return s ? s.length : 0; }, id);
    if (!pages) continue;
    try {
      await watchdog(readStory(id, pages), 60000, `story/${id}`);
    } catch (e: any) {
      bad++;
      say(`FAIL ${e.message}`);
      break;
    }
  }
}

if (g.errors.length) { say(g.errors.join('\n')); bad++; }
await g.close().catch(() => {});
say(bad ? `${bad} problem(s)` : 'every room and every story plays through in the browser');
process.exit(bad ? 1 : 0);
