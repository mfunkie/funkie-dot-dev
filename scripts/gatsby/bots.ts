/*
 * Scripted players for what the solver can't decide on its own: the
 * Queensboro Bridge ride (4-1, an autoscroller where the car is the floor),
 * the three boss fights (2-2 Eckleburg, 4-2 Wolfshiem, 7 Tom) and the
 * Argonne's hold (8: two days and two nights under shellfire, played from
 * the checkpoint before it; the solver covers the trenches leading there).
 * Each plays the real game in headless Chromium using only the buttons, and
 * must clear the stage within a death limit.
 *
 * Getting to where a fight is fought from uses the solver: it plans a route
 * of input macros from wherever the hero stands, and the bot plays those
 * exact buttons. If anything knocks him off the route (an enemy, a fan) by
 * more than a few pixels, the bot stops, lets him come to rest, and plans
 * again from there. Then it fights the way a careful player would, from
 * what's on screen: where the glare is about to fall, where a lob will land,
 * when Tom is dazed, which shell marks are blinking.
 *
 *   node scripts/gatsby/bots.ts [4-1 2-2 4-2 7 8]        TRACE=1 for a log
 */
import { openGame } from './lib/browser.ts';
import { loadGame } from './lib/game.ts';
import { solve } from './solve.ts';

const argv = process.argv.slice(2);
const want = argv.length ? argv : ['4-1', '2-2', '4-2', '7', '8'];
const MAX_DEATHS: Record<string, number> = { '4-1': 3, '2-2': 3, '4-2': 3, '7': 3, '8': 4 };
const TRACE = !!process.env.TRACE;

/* Stages played from their last checkpoint rather than the start. */
const FROM_LAST_CHECKPOINT = ['8'];

/* Where each fight is fought from, for the solver to plan a way to. */
const SPOT: Record<string, (h: any) => boolean> = {
  '2-2': (h) => Math.abs(h.y + h.h - 80) < 2 && h.x + h.w / 2 > 27 * 16 && h.x + h.w / 2 < 32 * 16,
  '4-2': (h) => h.onGround && h.x > 36 * 16,
  '7': (h) => h.onGround && h.x > 62 * 16 && h.y < 12 * 16,
  '8': (h) => h.onGround && h.x > 170 * 16 && h.y + h.h <= 12 * 16 + 1,
};
const GGn = loadGame();

const gp = await openGame('?debug');
await gp.page.evaluate(([TRACE]: [boolean]) => {
  const G = globalThis as any, GG = G.GG, D = GG._dbg, K = D.keyHeld;
  const release = () => { for (const k of ['l', 'r', 'u', 'd', 'a', 'b']) K[k] = 0; };
  const live = (W: any, type: string) => W.ents.filter((e: any) => e.type === type && !e.dead);
  const cx = (e: any) => e.x + (e.w || 16) / 2;
  /* Will this projectile cross his box within `ahead` frames? */
  function threat(W: any, s: any, ahead = 24, pad = 4) {
    const h = W.hero;
    let x = s.x, y = s.y, vx = s.vx || 0, vy = s.vy || 0;
    const g = s.g || 0, w = s.w || 8, hh = s.h || 8;
    for (let t = 0; t < ahead; t++) {
      x += vx; y += vy; vy += g;
      if (x + w > h.x - pad && x < h.x + h.w + pad && y + hh > h.y - pad && y < h.y + h.h + pad) return t + 1;
    }
    return 0;
  }
  /* Where a thrown ball comes down to the floor (y), or null. */
  function landing(s: any, floor: number) {
    let x = s.x, y = s.y, vx = s.vx || 0, vy = s.vy || 0;
    for (let t = 0; t < 200; t++) { x += vx; y += vy; vy += s.g || 0; if (y + (s.h || 8) >= floor && vy > 0) return x + (s.w || 8) / 2; }
    return null;
  }
  const goTo = (W: any, x: number, slack = 3) => { const d = x - cx(W.hero); if (d > slack) K.r = 1; else if (d < -slack) K.l = 1; };
  const face = (W: any, x: number) => { if (Math.sign(x - cx(W.hero)) !== W.hero.face) { if (x > cx(W.hero)) K.r = 1; else K.l = 1; } };
  /* An ordinary enemy close by on his level (not a boss, not one he can't hurt). */
  const BOSSES = ['wolfsheim', 'tom', 'eye', 'eckleburg'];
  const nearFoe = (W: any) => {
    const h = W.hero;
    return W.ents.find((e: any) => e.foe && !e.dead && !e.invincible && !BOSSES.includes(e.type) && Math.abs(cx(e) - cx(h)) < 112 && Math.abs(e.y + (e.h || 16) - (h.y + h.h)) < 24);
  };
  /* What a player does about one: turn to it and throw. Returns true if busy with one. */
  const clearWay = (W: any, f: number) => {
    const e = nearFoe(W);
    if (!e) return false;
    face(W, cx(e));
    if (Math.sign(cx(e) - cx(W.hero)) === W.hero.face && f % 8 === 0) K.b = 1;
    return true;
  };

  /* Each returns 'route' when he should be routed (back) to the fighting spot. */
  const THINK: Record<string, (W: any, f: number, mem: any) => string | void> = {
    /* The bridge ride: sit on the hood, step off before low girders, hop back before holes. */
    '4-1': (W, f, mem) => {
      const h = W.hero, lv = W.lv;
      const solid = (tx: number, ty: number) => GG.isSolid(GG.kindAt(lv, tx, ty));
      const hole = (tx: number) => GG.kindAt(lv, tx, 11) === GG.K.DEATH;
      const tx = Math.floor(cx(h) / 16);
      const onCar = h.riding && h.riding.type === 'carpart';
      const sx = h.x - W.cam.x;
      let lowSoon = false, holeSoon = false, lowHere = false;
      for (let d = -1; d <= 4; d++) if (solid(tx + d, 8)) { lowSoon = true; if (d <= 0) lowHere = true; }
      for (let d = 0; d <= 3; d++) if (hole(tx + d)) holeSoon = true;
      if (onCar) {
        if (lowSoon) { if (sx < 230) K.r = 1; }
        else if (sx < 118) K.r = 1; else if (sx > 132) K.l = 1;
      } else if (h.onGround) {
        if (holeSoon && !lowHere && !lowSoon) { K.l = sx > 120 ? 1 : 0; K.a = 1; mem.jumpT = 14; }
        else if (sx < 150) K.r = 1;
      } else {
        if (mem.jumpT > 0) { K.a = 1; mem.jumpT--; }
        if (sx > 130) K.l = 1; else if (sx < 110) K.r = 1;
      }
      if (W.t % 20 === 0 && W.ents.some((e: any) => e.foe && !e.dead && Math.abs(cx(e) - cx(h)) < 70 && Math.abs(e.y - h.y) < 30)) K.b = 1;
    },
    /* Eckleburg: from the top scaffold, bonds into the pupils; out from under the glare. */
    '2-2': (W, f) => {
      const h = W.hero;
      const eyes = live(W, 'eye').filter((e: any) => !e.shut).sort((a: any, b: any) => a.x - b.x);
      if (!eyes.length) return;
      if (h.onGround && Math.abs(h.y + h.h - 80) > 2) return 'route';
      const eye = eyes[0];
      const left = 27 * 16 + 6, right = 32 * 16 - 6, mid = (left + right) / 2;
      let spot = cx(eye) < mid ? left : right;
      const glares = live(W, 'glare').filter((g: any) => g.t < g.warn + 42);
      const hot = (x: number) => glares.some((g: any) => Math.abs(g.x + 8 - x) < 16);
      if (hot(spot)) spot = [left, mid, right].sort((a, b) => (hot(a) ? 1 : 0) - (hot(b) ? 1 : 0) || Math.abs(a - cx(h)) - Math.abs(b - cx(h)))[0];
      if (hot(cx(h)) || Math.abs(spot - cx(h)) > 4) goTo(W, spot); else face(W, cx(eye));
      if (h.onGround && live(W, 'shot').some((s: any) => threat(W, s, 14))) K.a = 1;
      if (!eye.invincible && Math.sign(cx(eye) - cx(h)) === h.face && f % 6 === 0) K.b = 1;
    },
    /* Wolfshiem: keep a pitching distance, jump the fastballs, get out from under lobs. */
    '4-2': (W, f, mem) => {
      const h = W.hero, wolf = live(W, 'wolfsheim')[0];
      if (!wolf) return;
      const floor = h.y + h.h, dx = cx(wolf) - cx(h);
      const balls = live(W, 'shot');
      const coming = balls.some((s: any) => threat(W, s, 16, 6));
      const lob = balls.map((s: any) => ((s.vy || 0) < 0 || (s.g || 0) > 0.1 ? landing(s, floor) : null)).find((x: any) => x !== null && Math.abs(x - cx(h)) < 22);
      if (lob !== undefined && lob !== null) { if (lob > cx(h)) K.l = 1; else K.r = 1; }
      else if (wolf.state === 'run' && !wolf.onGround) { if (dx > 0) K.l = 1; else K.r = 1; }
      else {
        const dist = wolf.state === 'tired' ? 44 : 100;
        if (Math.abs(Math.abs(dx) - dist) > 12) goTo(W, cx(wolf) - Math.sign(dx || 1) * dist);
        else face(W, cx(wolf));
      }
      if (coming && h.onGround) { K.a = 1; mem.hold = 10; }
      if (mem.hold > 0) { K.a = 1; mem.hold--; }
      if (Math.abs(wolf.y - h.y) < 22 && Math.sign(dx) === h.face && f % 4 === 0) K.b = 1;
    },
    /* Tom: jump him as he charges so he hits the wall; cards while he's dazed. */
    '7': (W, f, mem) => {
      const h = W.hero, t = live(W, 'tom')[0];
      if (!t) return;
      if (!W.camLock) return 'route';
      const dx = cx(t) - cx(h);
      const mid = (W.arenaX || 0) + 128;
      if (t.state === 'crouch' || t.state === 'charge') {
        if (t.state === 'crouch' && Math.abs(dx) < 50) goTo(W, cx(h) < mid ? cx(h) + 30 : cx(h) - 30);
        if (t.state === 'charge' && Math.sign(t.vx) === -Math.sign(dx) && Math.abs(dx) < 46 && h.onGround) { K.a = 1; mem.hold = 20; }
      } else if (t.state === 'leap') {
        if (dx > 0) K.l = 1; else K.r = 1;
      } else {
        if (Math.abs(dx) > 70) goTo(W, cx(t) - Math.sign(dx) * 50); else face(W, cx(t));
        if (!t.invincible && Math.sign(dx) === h.face && f % 4 === 0) K.b = 1;
      }
      const drop = live(W, 'shot').find((s: any) => s.vy > 0 && Math.abs(s.x + 4 - cx(h)) < 14 && s.y < h.y);
      if (drop && h.onGround) { if (drop.x > cx(h)) K.l = 1; else K.r = 1; }
      if (mem.hold > 0) { K.a = 1; mem.hold--; }
    },
    /* The hold: keep to the open ground, standing where no shell is about to land. */
    '8': (W, f, mem) => {
      const h = W.hero;
      if (!W.hold) return 'route';
      const x0 = W.minX;
      if (W.hold.done) {
        // Go and get the medal: jump the trench on the way, kick out of it if he's in it.
        const p = live(W, 'prize')[0];
        if (!p) return;
        goTo(W, cx(p), 2);
        const dir = K.r ? 1 : K.l ? -1 : 0;
        const feetRow = Math.floor((h.y + h.h + 1) / 16);
        const gapAhead = dir && h.onGround && !GG.isSolid(GG.kindAt(W.lv, Math.floor((cx(h) + dir * 14) / 16), feetRow));
        if (gapAhead || (dir && h.onGround && GG.wallSide(h, W.lv) === dir)) { K.a = 1; mem.hold = 14; }
        if (!h.onGround && h.sliding) { K.a = f % 6 < 3 ? 1 : 0; mem.hold = 0; }
        if (mem.hold > 0) { K.a = 1; mem.hold--; }
        return;
      }
      // A shell's blast is its box (x+4..x+28, y..y+24) for 14 frames after the fuse.
      const feet = h.y + h.h;
      const shells = live(W, 'shell').filter((s: any) => s.k < s.fuse + 14 && Math.abs(s.y + 24 - feet) < 20);
      const blast = (s: any, x: number) => x + 9 > s.x + 4 && x - 9 < s.x + 28;
      // Where he can stand on the floor of the position: either side of the mounds and the trench.
      const t = (n: number) => x0 + n * 16 + 8;
      const spots = [t(1), t(2), t(5), t(6), t(7), t(11), t(12), t(15)];
      const cost = (x: number) => {
        let c = Math.abs(x - cx(h)) / 64;
        for (const s of shells) if (blast(s, x)) c += 50 / Math.max(1, s.fuse - s.k);
        for (const g of live(W, 'ashcloud')) if (Math.abs(cx(g) - x) < 36) c += 3;
        return c;
      };
      const here = shells.some((s: any) => blast(s, cx(h)));
      if (here || !mem.spot || f % 20 === 0) mem.spot = spots.slice().sort((a, b) => cost(a) - cost(b))[0];
      goTo(W, mem.spot, 3);
      // Over a mound or out of the trench: jump at the wall, kicking if he must.
      const side = K.r ? 1 : K.l ? -1 : 0;
      if (side && GG.wallSide(h, W.lv) === side && h.onGround) { K.a = 1; mem.hold = 14; }
      if (!h.onGround && h.sliding) { K.a = f % 6 < 3 ? 1 : 0; mem.hold = 0; }
      if (mem.hold > 0) { K.a = 1; mem.hold--; }
      const rat = live(W, 'rat').find((r: any) => Math.abs(cx(r) - cx(h)) < 64 && Math.abs(r.y + r.h - feet) < 12);
      if (rat) {
        if (Math.abs(cx(rat) - cx(h)) < 22 && h.onGround) { K.a = 1; mem.hold = 10; }
        else if (Math.sign(cx(rat) - cx(h)) === h.face && f % 6 === 0) K.b = 1;
      }
    },
  };

  /* One bot at a time; state survives between calls from node. */
  G.BOT = {
    begin(key: string, fromLast: boolean) {
      // Only the bot steps the game: the page's own frame loop would otherwise
      // run on (with no buttons held) while node is planning a route.
      GG.hold = true;
      const index = GG.stages.findIndex((s: any) => s.key === key);
      D.startFresh(index, 4242);
      if (fromLast) {
        const k = GG.compile(GG.stages[index]).ents.filter((e: any) => e.e === 'checkpoint').pop();
        if (k) D.startAt(index, { x: k.x, y: k.y + 16, items: 0, taken: [] });
      }
      G.BOT.s = { key, f: 0, phase: 'settle', settle: 0, deaths: 0, hits: 0, hearts: D.W().hearts, log: [], mem: {}, track: null, ti: 0 };
    },
    feed(masks: number[], track: { x: number; y: number }[]) {
      const s = G.BOT.s;
      D.feed(masks); s.track = track; s.ti = 0; s.phase = 'route';
    },
    fight() { G.BOT.s.phase = 'fight'; },
    run(frames: number, max: number) {
      const s = G.BOT.s;
      for (let n = 0; n < frames; n++, s.f++) {
        const W = D.W();
        if (!D.playing() || s.f >= max) return { done: true };
        if (W.done) { release(); D.step(1); if (W.done > 140) return { done: true }; continue; }
        if (W.dying) {
          if (W.dying === 1) { s.deaths++; s.log.push(`died at ${(W.hero.x / 16).toFixed(1)},${(W.hero.y / 16).toFixed(1)} (frame ${s.f})`); D.stopFeed(); }
          s.phase = 'settle'; s.settle = 0; release(); D.step(1); continue;
        }
        if (W.hearts < s.hearts) s.hits += s.hearts - W.hearts;
        s.hearts = W.hearts;
        release();
        if (TRACE && s.f % 600 === 0) s.log.push(`f${s.f} ${s.phase} at ${(W.hero.x / 16).toFixed(1)},${(W.hero.y / 16).toFixed(1)} boss ${W.boss ? W.boss.state + ' ' + W.boss.hp : '-'} hold ${W.hold ? W.hold.k : '-'}`);
        if (s.phase === 'settle') {
          // Deal with anything shooting at him before standing still to plan.
          if (W.hero.onGround && W.hurtT === 0 && s.settle < 400 && clearWay(W, s.f)) { s.settle++; D.step(1); continue; }
          if ((W.hero.onGround && Math.abs(W.hero.vx) < 0.05 && W.hurtT === 0) || ++s.settle > 200) {
            const h = W.hero;
            return { need: 'route', hero: { x: h.x, y: h.y, w: h.w, h: h.h } };
          }
          D.step(1); continue;
        }
        if (s.phase === 'route') {
          const want = s.track[s.ti++];
          const h = W.hero;
          if (want && (Math.abs(want.x - h.x) > 6 || Math.abs(want.y - h.y) > 6)) {
            if (TRACE) s.log.push(`off route at ${(h.x / 16).toFixed(1)},${(h.y / 16).toFixed(1)} (frame ${s.f})`);
            D.stopFeed(); s.phase = 'settle'; s.settle = 0; D.step(1); continue;
          }
          if (D.feeding()) { D.step(1); continue; }
          s.phase = 'fight';
        }
        // Ordinary enemies first (bosses are THINK's business), then the fight.
        if (s.key !== '4-1' && clearWay(W, s.f) && !W.boss) { D.step(1); continue; }
        const r = THINK[s.key](W, s.f, s.mem);
        if (r === 'route' && W.hero.onGround) { release(); s.phase = 'settle'; s.settle = 0; }
        D.step(1);
      }
      return { more: true };
    },
    result() {
      const s = G.BOT.s, W = D.W();
      return { stage: s.key, cleared: !!(W && W.done), deaths: s.deaths, hits: s.hits, seconds: Math.round(s.f / 6) / 10, log: TRACE ? s.log : s.log.slice(0, 8) };
    },
  };
}, [TRACE] as [boolean]);

const MAX_FRAMES = 60 * 60 * 5;
const results: any[] = [];
for (const key of want) {
  const def = GGn.stages.find((s: any) => s.key === key);
  await gp.page.evaluate(([k, last]: [string, boolean]) => (globalThis as any).BOT.begin(k, last), [key, FROM_LAST_CHECKPOINT.includes(key)] as [string, boolean]);
  let routes = 0;
  for (;;) {
    const st: any = await gp.page.evaluate(([max]: [number]) => (globalThis as any).BOT.run(600, max), [MAX_FRAMES] as [number]);
    if (st.done) break;
    if (st.need === 'route') {
      const h = st.hero;
      const from = { x: h.x - 8 + h.w / 2, y: h.y + h.h - 16 };
      const r = SPOT[key] && !SPOT[key](Object.assign({ onGround: true }, h)) ? solve(GGn, def, from, { target: SPOT[key], noRunning: true }) : null;
      routes++;
      if (r && r.path && r.path.length) {
        const masks = r.path.map((i) => (i.l ? 1 : 0) | (i.r ? 2 : 0) | (i.u ? 4 : 0) | (i.d ? 8 : 0) | (i.jump ? 16 : 0) | (i.jumpHit ? 1024 : 0));
        await gp.page.evaluate(([m, t]: [number[], any[]]) => (globalThis as any).BOT.feed(m, t), [masks, r.track!] as [number[], any[]]);
      } else {
        await gp.page.evaluate(() => (globalThis as any).BOT.fight());
      }
    }
  }
  const res = await gp.page.evaluate(() => (globalThis as any).BOT.result());
  results.push({ ...res, routes, max: MAX_DEATHS[key] });
}

let bad = 0;
for (const r of results) {
  const ok = r.cleared && r.deaths <= r.max;
  if (!ok) bad++;
  console.log(`${r.stage.padEnd(4)} ${ok ? 'OK  ' : 'FAIL'} ${r.cleared ? 'cleared' : 'NOT cleared'} in ${r.seconds}s, ${r.deaths} death(s) (limit ${r.max}), ${r.hits} heart(s) lost, ${r.routes} route(s) planned${r.log.length ? '\n       ' + r.log.join('\n       ') : ''}`);
}
if (gp.errors.length) { console.log(gp.errors.join('\n')); bad++; }
await gp.close();
console.log(bad ? `\n${bad} failing` : '\nEvery bot cleared its stage.');
process.exit(bad ? 1 : 0);
