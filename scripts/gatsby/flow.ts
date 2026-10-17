/*
 * Transition tests for GATSBY.EXE, in headless Chromium with the real game:
 *
 *   - the title's START runs the opening story, then chapter I's card, then play;
 *   - clearing every stage runs its outro, the next intro and card, and starts
 *     the next stage (the last one ends on the ending screen);
 *   - deep links (#/stage/<key>, #/select, #/story/<id>) land where they say,
 *     and the hash follows play;
 *   - the pause menu's RESUME, RESTART CHAPTER and CHAPTER SELECT work;
 *   - no page errors anywhere.
 *
 *   node scripts/gatsby/flow.ts
 */
import { openGame } from './lib/browser.ts';

const gp = await openGame('?debug');
const page = gp.page;

const results = await page.evaluate(() => {
  const GG = (globalThis as any).GG, D = GG._dbg, K = D.keyHeld;
  const out: { name: string; ok: boolean; detail: string }[] = [];
  const check = (name: string, ok: boolean, detail = '') => out.push({ name, ok, detail });
  const stateName = () => {
    const s = D.state();
    if (D.playing()) return 'play';
    const src = String(s.draw);
    if (src.includes('drawEnd')) return 'end';
    if (src.includes('drawTitle')) return 'title';
    if (src.includes('CONTENTS')) return 'select';
    if (src.includes('CHAPTER ')) return 'card';
    if (src.includes('PAUSED')) return 'pause';
    if (src.includes('CINE_ART')) return 'cine';
    return 'other';
  };
  const release = () => { for (const k of ['l', 'r', 'u', 'd', 'a', 'b', 'start', 'select']) K[k] = 0; };
  // Tap a button for one frame, then let go for one.
  const tap = (k: string) => { K[k] = 1; D.step(1); K[k] = 0; D.step(1); };
  // Mash A (to skip text) until a condition holds; returns the states seen.
  const mashUntil = (cond: () => boolean, max = 30000) => {
    const seen: string[] = [];
    for (let f = 0; f < max; f++) {
      if (cond()) return { ok: true, seen, f };
      K.a = Math.floor(f / 3) % 2;
      D.step(1);
      const n = stateName();
      if (seen[seen.length - 1] !== n) seen.push(n);
    }
    release();
    return { ok: false, seen, f: max };
  };

  // Title -> opening -> card I -> play stage 1.
  D.go(D.titleState()); release();
  for (let i = 0; i < 30; i++) D.step(1);
  tap('start');
  let r = mashUntil(() => D.playing() && D.W() && D.W().index === 0);
  check('title START reaches chapter I play', r.ok, r.seen.join(' > '));
  release();

  // Clear each stage; the next must start (or the ending must come).
  for (let i = 0; i < GG.stages.length; i++) {
    const key = GG.stages[i].key;
    const W = D.startStage(i);
    W.clear();
    const last = i === GG.stages.length - 1;
    r = mashUntil(() => (last ? stateName() === 'end' : D.playing() && D.W().index === i + 1 && D.W().t > 2));
    const def = GG.stages[i];
    const sawOutro = !def.outro || r.seen.includes('cine');
    check(`clear ${key} -> ${last ? 'ending' : GG.stages[i + 1].key}`, r.ok && sawOutro, r.seen.join(' > ') + (r.ok ? '' : ' (stuck)'));
    if (!last && r.ok) check(`hash follows to ${GG.stages[i + 1].key}`, location.hash === '#/stage/' + GG.stages[i + 1].key, location.hash);
    release();
  }
  // The ending returns to the title.
  r = mashUntil(() => stateName() === 'title', 2000);
  check('ending returns to the title', r.ok, r.seen.join(' > '));
  release();

  // Pause menu: resume, restart, chapter select.
  D.startStage(2);
  for (let i = 0; i < 20; i++) D.step(1);
  tap('start');
  check('START pauses', stateName() === 'pause');
  tap('a');
  check('RESUME resumes', D.playing());
  const before = D.W();
  for (let i = 0; i < 10; i++) D.step(1);
  tap('start'); tap('d'); tap('a');
  check('RESTART CHAPTER restarts', D.playing() && D.W() !== before && D.W().t < 5);
  tap('start'); tap('d'); tap('d'); tap('a');
  check('CHAPTER SELECT opens the contents', stateName() === 'select', location.hash);
  release();
  return out;
});

// Deep links, each in a fresh page load.
for (const [hash, want] of [['#/stage/5', 'card or play in 5'], ['#/select', 'select'], ['#/story/ch3', 'cine']] as const) {
  await page.goto(`${gp.origin}/games/gatsby/index.html${hash}`);
  await page.waitForFunction(() => (globalThis as any).GG?._dbg);
  await page.waitForTimeout(300);
  const got = await page.evaluate(() => {
    const GG = (globalThis as any).GG, D = GG._dbg;
    const src = String(D.state().draw);
    const W = D.W();
    if (D.playing()) return 'play:' + GG.stages[W.index].key;
    if (src.includes('CONTENTS')) return 'select';
    if (src.includes('CINE_ART')) return 'cine';
    if (src.includes('CHAPTER ')) return 'card:' + location.hash;
    return 'other';
  });
  const ok = want === 'select' ? got === 'select' : want === 'cine' ? got === 'cine' : got === 'card:#/stage/5' || got === 'play:5';
  results.push({ name: `deep link ${hash}`, ok, detail: got });
}

let bad = 0;
for (const r of results) {
  if (!r.ok) bad++;
  console.log(`${r.ok ? 'OK  ' : 'FAIL'} ${r.name}${r.detail ? '  (' + r.detail + ')' : ''}`);
}
if (gp.errors.length) { console.log('\nPage errors:\n' + gp.errors.join('\n')); bad += gp.errors.length; }
await gp.close();
console.log(bad ? `\n${bad} failing` : '\nEvery transition works.');
process.exit(bad ? 1 : 0);
