/*
 * GATSBY.EXE NES-limits checker. Renders the game with the real code in
 * headless Chromium and checks what it puts on screen against the 2C02's
 * limits:
 *
 *   BG-CELL    each 16x16 background area: at most 3 colours besides the
 *              backdrop (one attribute = one palette);
 *   BG-PALS    each scene's background areas fit in 4 palettes of 3 colours
 *              plus one shared backdrop;
 *   SPR-TILE   each 8x8 sprite tile: at most 3 colours plus transparent;
 *   SPR-PALS   each scene's sprite tiles fit in 4 palettes of 3 colours;
 *   SCANLINE   at most 8 sprites (8px-wide tiles) on any scanline, and 64
 *              on screen;
 *
 * over every stage (walked from start to end with the hero kept alive, boss
 * arenas included), every cutscene picture, and the title, ending, chapter
 * card and contents screens. What it deliberately lets off is in
 * scripts/gatsby/nes-exceptions.json and explained in docs/gatsby/hardware.md.
 *
 *   node scripts/gatsby/nes-check.ts [--out report.md] [stageKey|cine|screens ...]
 *
 * Exits 1 if anything breaks a rule that no exception covers.
 */
import fs from 'node:fs';
import path from 'node:path';
import { openGame } from './lib/browser.ts';
import { ROOT } from './lib/game.ts';
import { installTour } from './lib/nes-tour.ts';

interface Violation { rule: string; scene: string; where: string; detail: string }
interface Exception { id: string; rule: string; scene?: string; where?: string; what: string; why: string }

const argv = process.argv.slice(2);
const outIdx = argv.indexOf('--out');
const outPath = outIdx >= 0 ? argv[outIdx + 1] : null;
const filters = argv.filter((a, i) => !a.startsWith('--') && (outIdx < 0 || i !== outIdx + 1));
const want = (k: string) => !filters.length || filters.includes(k);

const exceptions: Exception[] = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/gatsby/nes-exceptions.json'), 'utf8')).exceptions;
const glob = (pat: string | undefined, s: string) => !pat || new RegExp('^' + pat.split('*').map((p) => p.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('.*') + '$').test(s);
const excused = (v: Violation) => exceptions.find((e) => e.rule === v.rule && glob(e.scene, v.scene) && glob(e.where, v.where));

const hx = (c: number) => c.toString(16).padStart(2, '0');

/* Fewest palettes of `slots` colours that cover every set (each set inside one palette). */
function minPalettes(sets: number[][], slots = 3, cap = 6): number {
  const uniq = [...new Map(sets.filter((s) => s.length).map((s) => [s.slice().sort((a, b) => a - b).join(','), s])).values()];
  // Drop sets contained in another.
  const big = uniq.filter((s, i) => !uniq.some((t, j) => j !== i && t.length > s.length && s.every((c) => t.includes(c))));
  big.sort((a, b) => b.length - a.length);
  if (big.some((s) => s.length > slots)) return Infinity;
  let best = Math.min(cap + 1, big.length);
  const groups: Set<number>[] = [];
  const go = (i: number) => {
    if (groups.length >= best) return;
    if (i === big.length) { best = groups.length; return; }
    const s = big[i];
    for (const g of groups) {
      const add = s.filter((c) => !g.has(c));
      if (g.size + add.length <= slots) { add.forEach((c) => g.add(c)); go(i + 1); add.forEach((c) => g.delete(c)); }
    }
    groups.push(new Set(s)); go(i + 1); groups.pop();
  };
  go(0);
  return best;
}

/* The distinct maximal colour sets, for saying why palettes don't fit. */
function maximal(sets: number[][], where: string[] = []): string {
  const at = new Map<string, string>();
  sets.forEach((x, i) => { const k = x.slice().sort((a, b) => a - b).join(','); if (!at.has(k)) at.set(k, where[i] || ''); });
  const uniq = [...new Map(sets.filter((x) => x.length).map((x) => [x.slice().sort((a, b) => a - b).join(','), x.slice().sort((a, b) => a - b)])).values()];
  const big = uniq.filter((x, i) => !uniq.some((t, j) => j !== i && t.length > x.length && x.every((c) => t.includes(c))));
  return big.slice(0, 16).map((x) => '[' + x.map(hx).join(' ') + ']' + (at.get(x.join(',')) ? ` (${at.get(x.join(','))})` : '')).join(' ') + (big.length > 16 ? ` +${big.length - 16}` : '');
}

const gp = await openGame('?debug');
const { page } = gp;
await installTour(page);

/* In-page analysis helpers. */
await page.evaluate(() => {
  const w = globalThis as any;
  const GG = w.GG, N = GG.nes, T = w.__nes;
  /* Colour sets per cell of stacked layers (top wins), cells starting at -ox,-oy. */
  function sets(datas: (Uint8ClampedArray | null)[], wd: number, ht: number, cell: number, backdrop: number | null, ox = 0, oy = 0) {
    const out: { x: number; y: number; c: number[] }[] = [];
    for (const u of T.cellHists(datas, wd, ht, cell, ox, oy)) {
      const c = u.h.map(([k]: number[]) => k).filter((k: number) => k !== backdrop).sort((a: number, b: number) => a - b);
      if (c.length) out.push({ x: u.x, y: u.y, c });
    }
    return out;
  }
  /* A sprite canvas's 8x8 tiles (grid mirrored with the sprite). */
  const tileCache = new WeakMap<HTMLCanvasElement, number[][]>();
  function spriteTiles(c: HTMLCanvasElement, flip: boolean) {
    let r = tileCache.get(c);
    if (!r) {
      const ox = flip ? (8 - (c.width % 8)) % 8 : 0;
      r = sets([T.data(c)], c.width, c.height, 8, null, ox, 0).map((s: any) => s.c);
      tileCache.set(c, r);
    }
    return r;
  }
  w.__chk = { sets, spriteTiles };
});

const violations: Violation[] = [];
const notes: string[] = [];
const add = (v: Violation) => violations.push(v);

/* ------------------------------------------------------------- stages */
const stageKeys: string[] = await page.evaluate(() => (globalThis as any).GG.stages.map((s: any) => s.key));
for (let i = 0; i < stageKeys.length; i++) {
  const key = stageKeys[i];
  if (!want(key)) continue;
  const r = await page.evaluate(({ i }) => {
    const w = globalThis as any, GG = w.GG, N = GG.nes, T = w.__nes, C = w.__chk, SW = GG.W, SH = GG.H;
    const def = GG.stages[i];
    const W0 = GG._dbg.startStage(i);
    const P = N.pal;
    const backdrop = P ? P.backdrop : null;
    const lv = W0.lv;
    const bad: { rule: string; where: string; detail: string }[] = [];
    const bgSets: number[][] = [];
    const sprSets: number[][] = [];
    const bgWhere: string[] = [], sprWhere: string[] = [];
    const bgPush = (c: number[], wh: string) => { bgSets.push(c); bgWhere.push(wh); };
    const sprPush = (c: number[], wh: string) => { sprSets.push(c); sprWhere.push(wh); };
    const cellBad = (plane: string, s: { x: number; y: number; c: number[] }, ox = 0, oy = 0) => {
      if (s.c.length > 3) bad.push({ rule: 'BG-CELL', where: `${plane} @${(s.x + ox) / 16},${(s.y + oy) / 16}`, detail: s.c.map((c) => c.toString(16).padStart(2, '0')).join(' ') });
      bgPush(s.c, `${plane} @${(s.x + ox) / 16},${(s.y + oy) / 16}`);
    };
    // The tile plane: rooms, tiles and tiles in front, one nametable.
    const planes = [T.data(lv.backLayer), T.data(lv.layer), T.data(lv.fgLayer)];
    for (const s of C.sets(planes, lv.pw, lv.ph, 16, backdrop)) cellBad('tiles', s);
    // Animated tiles over what's under them.
    for (const a of lv.anim) {
      for (const f of a.frames) {
        const tc = GG.TILE[f]; if (!tc) continue;
        const under = lv.layer.getContext('2d').getImageData(a.x, a.y, 16, 16).data;
        for (const s of C.sets([under, T.data(tc)], 16, 16, 16, backdrop)) cellBad(`tiles(anim ${f})`, s, a.x, a.y);
      }
    }
    // Parallax layers, each on its own grid; extras (moon, fireworks...) on the screen grid.
    const bg = GG.BG[def.bg];
    const layerInfo: string[] = [];
    if (bg) {
      bg.layers.forEach((L: any, j: number) => {
        const imgs = typeof L.img === 'function' ? [0, 24, 48, 72, 96].map((t) => L.img(t, W0)) : [L.img];
        for (const img of new Set(imgs)) if (img && img.getContext) for (const s of C.sets([T.data(img)], img.width, img.height, 16, backdrop)) cellBad(`bg ${def.bg}[${j}]`, s);
        if (L.fill !== undefined && L.fill !== backdrop) bgPush([L.fill], `bg ${def.bg}[${j}] fill`);
      });
      const saved = bg.layers.map((L: any) => L.when);
      bg.layers.forEach((L: any) => { L.when = () => false; });
      const c = document.createElement('canvas'); c.width = SW; c.height = SH;
      const g = c.getContext('2d')!;
      for (const [cx, cy, t] of [[0, 0, 10], [300, 40, 200], [900, 0, 470], [1600, 80, 999], [2400, 20, 1777]]) {
        g.clearRect(0, 0, SW, SH);
        bg.draw(g, cx, cy, t, W0);
        for (const s of C.sets([T.data(c)], SW, SH, 16, backdrop)) cellBad(`bg ${def.bg} extras t=${t}`, s);
      }
      bg.layers.forEach((L: any, j: number) => { L.when = saved[j]; });
      layerInfo.push(def.bg);
    }
    // Every sprite frame, as this scene's palettes left it.
    for (const [name, set] of Object.entries<any>(GG.SPR)) for (const [f, s] of Object.entries<any>(set)) {
      if (N.isBgObj(name, f)) {
        for (const t of C.sets([T.data(s.c)], s.w, s.h, 16, backdrop)) if (t.c.length > 3) bad.push({ rule: 'BG-CELL', where: `bgobj ${name}.${f} @${t.x / 16},${t.y / 16}`, detail: t.c.map((c: number) => c.toString(16)).join(' ') });
        continue;
      }
      for (const flip of [false, true]) for (const t of C.spriteTiles(flip ? s.f : s.c, flip)) if (t.length > 3) { bad.push({ rule: 'SPR-TILE', where: `${name}.${f}${flip ? ' (flipped)' : ''}`, detail: t.map((c: number) => c.toString(16)).join(' ') }); break; }
    }
    // The walk: per frame sampled, sprite tiles drawn, scanline load, background objects.
    let frames = 0, over = 0, maxLine = 0, maxTotal = 0, worst = '', drawnMax = 0, drawnTotal = 0, flickered = 0, askedMax = 0, askedTotal = 0;
    const bgObjs = new Set<string>();
    const lineOf = new Int32Array(SH);
    T.tour(i, (W: any, phase: string) => {
      const draws: any[] = [];
      const rects: any[] = [];
      let inEnt = 0, inFx = 0, curType = '';
      const oRect = GG.rect, oDraw = GG.draw, oFx = W.def.drawFx;
      GG.rect = (g: any, x: number, y: number, ww: number, hh: number, col: number) => { rects.push({ x, y, w: ww, h: hh, col, ent: inEnt > 0, type: curType, fx: inFx > 0, sprite: !!GG.oam.inPhase }); return oRect(g, x, y, ww, hh, col); };
      GG.draw = (...a: any[]) => { inEnt++; const was = curType; curType = a[0].type + '#' + (a[0].mapId || a[0].x); try { return oDraw(...a); } finally { inEnt--; curType = was; } };
      if (oFx) W.def.drawFx = (...a: any[]) => { inFx++; try { return oFx(...a); } finally { inFx--; } };
      // First without flicker, to see every sprite as drawn; then the real frame.
      GG.oam.on = false;
      try { draws.push(...T.record(() => GG._dbg.draw())); }
      finally { GG.rect = oRect; GG.draw = oDraw; if (oFx) W.def.drawFx = oFx; GG.oam.on = true; }
      GG._dbg.draw();
      const L = GG.oam.last;
      let gotMax = 0, wantMax = 0; for (let y = 0; y < SH; y++) { gotMax = Math.max(gotMax, L.got[y]); wantMax = Math.max(wantMax, L.want[y]); }
      if (gotMax > drawnMax) drawnMax = gotMax;
      if (wantMax > askedMax) askedMax = wantMax;
      if (L.total > askedTotal) askedTotal = L.total;
      if (L.total - L.dropped > drawnTotal) drawnTotal = L.total - L.dropped;
      if (L.dropped) flickered++;
      frames++;
      lineOf.fill(0);
      let total = 0;
      const names: string[] = [];
      const hit = (x: number, y: number, ww: number, hh: number, n: number, name: string) => {
        if (x + ww <= 0 || x >= SW || y + hh <= 0 || y >= SH) return;
        total += n;
        for (let yy = Math.max(0, y); yy < Math.min(SH, y + hh); yy++) lineOf[yy] += n;
        names.push(name);
      };
      for (const d of draws) {
        if (N.isBgObj(d.name, d.frame)) { bgObjs.add(d.name + '.' + d.frame); continue; }
        // 8px-wide sprite columns, in 8px rows.
        const cols = Math.ceil(d.w / 8);
        for (let ry = 0; ry < d.h; ry += 8) hit(d.x, d.y + ry, d.w, Math.min(8, d.h - ry), cols, d.name);
        for (const t of C.spriteTiles(d.c, d.flip)) sprPush(t, d.name + '.' + d.frame);
      }
      // Pixels an entity draws itself: the screen's 8x8 cells they touch, a
      // sprite each. Particles (small rects outside entities): a sprite each.
      const entCells = new Map<string, Set<number>>();
      for (const r of rects) {
        if (r.fx) continue;
        if (r.ent) {
          for (let yy = Math.floor(r.y / 8); yy <= Math.floor((r.y + r.h - 1) / 8); yy++) for (let xx = Math.floor(r.x / 8); xx <= Math.floor((r.x + r.w - 1) / 8); xx++) {
            const k = xx + ',' + yy + ',' + r.type; const cs = entCells.get(k) || new Set<number>(); entCells.set(k, cs);
            if (typeof r.col === 'number') cs.add(N.canon(r.col));
          }
          continue;
        }
        if (!r.sprite || r.w > 4 || r.h > 4) continue;
        hit(Math.round(r.x), Math.round(r.y), Math.max(1, r.w), Math.max(1, r.h), 1, 'particle');
        if (typeof r.col === 'number') sprPush([N.canon(r.col)], 'particle');
      }
      for (const [k, cs] of entCells) {
        const [xx, yy] = k.split(',').map(Number);
        if (xx < 0 || yy < 0 || xx * 8 >= SW || yy * 8 >= SH) continue;
        const who = k.split(',')[2].split('#')[0];
        hit(xx * 8, yy * 8, 8, 8, 1, 'entity-px');
        if (cs.size > 3) bad.push({ rule: 'SPR-TILE', where: `${who} pixels @${xx},${yy}`, detail: [...cs].map((c) => c.toString(16)).join(' ') });
        sprPush([...cs], who + ' pixels');
      }
      let m = 0, mY = 0; for (let y = 0; y < SH; y++) if (lineOf[y] > m) { m = lineOf[y]; mY = y; }
      if (m > maxLine) { maxLine = m; worst = `${phase} x=${Math.round(W.hero.x / 16)} y=${mY}: ${[...new Set(names)].join(',')}`; }
      if (m > 8) over++;
      if (total > maxTotal) maxTotal = total;
    });
    for (const k of bgObjs) {
      const [name, f] = k.split('.');
      const s = GG.SPR[name][f];
      for (const t of C.sets([T.data(s.c)], s.w, s.h, 16, backdrop)) bgPush(t.c, 'bgobj ' + k);
    }
    return { bad: [...new Map(bad.map((b) => [b.rule + b.where + b.detail, b])).values()], bgSets, sprSets, bgWhere, sprWhere, frames, over, maxLine, maxTotal, worst, drawnMax, drawnTotal, flickered, askedMax, askedTotal, backdrop, bgObjs: [...bgObjs], pal: P };
  }, { i });
  for (const b of r.bad) add({ rule: b.rule, scene: key, where: b.where, detail: b.detail });
  const nBg = minPalettes(r.bgSets);
  const nSpr = minPalettes(r.sprSets);
  if (nBg > 4) add({ rule: 'BG-PALS', scene: key, where: 'stage', detail: `needs ${nBg === Infinity ? '>4' : nBg} background palettes: ${maximal(r.bgSets, r.bgWhere)}` });
  if (nSpr > 4) add({ rule: 'SPR-PALS', scene: key, where: 'stage', detail: `needs ${nSpr === Infinity ? '>4' : nSpr} sprite palettes: ${maximal(r.sprSets, r.sprWhere)}` });
  if (r.drawnMax > 8) add({ rule: 'SCANLINE', scene: key, where: 'play', detail: `${r.drawnMax} sprites drawn on a line; asked for ${r.askedMax} (busiest: ${r.worst})` });
  if (r.drawnTotal > 64) add({ rule: 'SCANLINE', scene: key, where: 'oam', detail: `${r.drawnTotal} sprites on screen` });
  const per = (rule: string) => r.bad.filter((b: any) => b.rule === rule).length;
  notes.push(`${key.padEnd(4)} cells over 3: bg ${per('BG-CELL')} sprite ${per('SPR-TILE')}  backdrop ${r.backdrop === null ? '--' : hx(r.backdrop)}  bg palettes ${nBg === Infinity ? '>4' : nBg}  sprite palettes ${nSpr === Infinity ? '>4' : nSpr}  sprites a line: asked ${r.askedMax} (own count ${r.maxLine}), drawn ${r.drawnMax}; flicker in ${r.flickered}/${r.frames} sampled frames (busiest: ${r.worst}); on screen: asked ${r.askedTotal}, drawn ${r.drawnTotal}  bg objects: ${r.bgObjs.join(' ') || '-'}`);
  console.log(notes[notes.length - 1]);
}

/* ----------------------------------------------------------- cinema */
if (want('cine')) {
  const res = await page.evaluate(() => {
    const w = globalThis as any, GG = w.GG, T = w.__nes, C = w.__chk, D = GG._dbg;
    const out: { id: string; panel: number; art: string; bad: string[]; pals: number }[] = [];
    const scr = document.getElementById('screen') as HTMLCanvasElement;
    for (const id of Object.keys(GG.CINE)) {
      const panels = GG.CINE[id];
      let done = false;
      D.go(D.cineState(id, () => { done = true; D.go({ update() {}, draw() {} }); }));
      for (let k = 0; k < panels.length && !done; k++) {
        const allSets: number[][] = [];
        const bad: string[] = [];
        for (let f = 0; f < 120 && !done; f++) {
          D.step(1);
          if (f % 30 !== 29) continue;
          D.draw();
          for (const s of C.sets([T.data(scr)], 256, 224, 16, 0x0f)) {
            if (s.c.length > 3) bad.push(`@${s.x / 16},${s.y / 16} ${s.c.map((c: number) => c.toString(16)).join(' ')}`);
            allSets.push(s.c);
          }
        }
        out.push({ id, panel: k, art: panels[k].art, bad: [...new Set(bad)], pals: 0, sets: allSets } as any);
        // Next panel: show all the text, then advance.
        for (let a = 0; a < 2 && !done; a++) { D.keyHeld.a = 1; D.step(1); D.keyHeld.a = 0; D.step(3); }
        for (let a = 0; a < 24 && !done; a++) D.step(1);
      }
    }
    return out;
  });
  for (const p of res as any[]) {
    for (const b of p.bad) add({ rule: 'BG-CELL', scene: `cine:${p.id}`, where: `panel ${p.panel} (${p.art})`, detail: b });
    const n = minPalettes(p.sets);
    if (n > 4) add({ rule: 'BG-PALS', scene: `cine:${p.id}`, where: `panel ${p.panel} (${p.art})`, detail: `needs ${n === Infinity ? '>4' : n} palettes: ${maximal(p.sets)}` });
  }
  notes.push(`cinema: ${(res as any[]).length} panels checked`);
  console.log(notes[notes.length - 1]);
}

/* ---------------------------------------------------------- screens */
if (want('screens')) {
  const res = await page.evaluate(() => {
    const w = globalThis as any, GG = w.GG, T = w.__nes, C = w.__chk, D = GG._dbg;
    const scr = document.getElementById('screen') as HTMLCanvasElement;
    const out: { name: string; bad: string[]; sets: number[][]; spr: number[][] }[] = [];
    // Sprites on these screens (the hero on a chapter card) are checked as
    // sprites; the rest of the screen as background.
    const shoot = (name: string, st: any, n = 480, every = 40) => {
      D.go(st);
      const bad: string[] = [], sets: number[][] = [], spr: number[][] = [];
      for (let f = 0; f < n; f++) {
        D.step(1);
        if (f % every !== every - 1) continue;
        const draws = T.record(() => D.draw());
        for (const d of draws) for (const t of C.spriteTiles(d.c, d.flip)) { if (t.length > 3) bad.push(`sprite ${d.name}.${d.frame} ${t.map((c: number) => c.toString(16)).join(' ')}`); spr.push(t); }
        const o = GG.drawSprite; GG.drawSprite = () => {};
        try { D.draw(); } finally { GG.drawSprite = o; }
        for (const s of C.sets([T.data(scr)], 256, 224, 16, 0x0f)) { if (s.c.length > 3) bad.push(`@${s.x / 16},${s.y / 16} ${s.c.map((c: number) => c.toString(16)).join(' ')}`); sets.push(s.c); }
      }
      out.push({ name, bad: [...new Set(bad)], sets, spr });
    };
    shoot('title', D.titleState());
    shoot('end', D.endState());
    for (let i = 0; i < GG.stages.length; i++) shoot('card ' + GG.stages[i].key, D.cardState(i), 60, 20);
    shoot('select', D.selectState(), 60, 20);
    return out;
  });
  for (const s of res) {
    for (const b of s.bad) add({ rule: 'BG-CELL', scene: s.name, where: 'screen', detail: b });
    const n = minPalettes(s.sets);
    if (n > 4) add({ rule: 'BG-PALS', scene: s.name, where: 'screen', detail: `needs ${n === Infinity ? '>4' : n} palettes: ${maximal(s.sets)}` });
    const m = minPalettes(s.spr);
    if (m > 4) add({ rule: 'SPR-PALS', scene: s.name, where: 'screen', detail: `needs ${m === Infinity ? '>4' : m} sprite palettes: ${maximal(s.spr)}` });
  }
  notes.push(`screens: ${res.length} checked`);
  console.log(notes[notes.length - 1]);
}

if (gp.errors.length) { console.log(gp.errors.join('\n')); }
await gp.close();

/* ------------------------------------------------------------ report */
const open = violations.filter((v) => !excused(v));
const let_off = violations.filter((v) => excused(v));
const byRule = (vs: Violation[]) => Object.entries(vs.reduce<Record<string, number>>((m, v) => { m[v.rule] = (m[v.rule] || 0) + 1; return m; }, {}));
const lines: string[] = [];
lines.push('# GATSBY.EXE NES-limits report', '');
lines.push(`${open.length} violation(s) not covered by an exception; ${let_off.length} covered.`, '');
lines.push('## Scenes', '', ...notes.map((n) => '- ' + n), '');
lines.push('## By rule', '', ...byRule(open).map(([r, n]) => `- ${r}: ${n}`), '');
if (open.length) {
  lines.push('## Violations', '');
  const shown = new Map<string, number>();
  for (const v of open) {
    const k = v.rule + v.scene;
    const n = (shown.get(k) || 0) + 1; shown.set(k, n);
    if (n <= 12) lines.push(`- ${v.rule} ${v.scene} ${v.where}: ${v.detail}`);
    else if (n === 13) lines.push(`- ${v.rule} ${v.scene}: ... (more)`);
  }
  lines.push('');
}
if (let_off.length) {
  lines.push('## Covered by exceptions', '');
  const counts = new Map<string, number>();
  for (const v of let_off) { const e = excused(v)!; counts.set(e.id, (counts.get(e.id) || 0) + 1); }
  for (const [id, n] of counts) lines.push(`- ${id}: ${n}`);
  lines.push('');
}
lines.push('## Exceptions in force', '', ...exceptions.map((e) => `- **${e.id}** (${e.rule}${e.scene ? ' ' + e.scene : ''}${e.where ? ' ' + e.where : ''}): ${e.what}. ${e.why}`), '');
const text = lines.join('\n');
console.log('\n' + text);
if (outPath) {
  fs.writeFileSync(outPath, text);
  fs.writeFileSync(outPath.replace(/\.md$/, '') + '.json', JSON.stringify({ open, covered: let_off.map((v) => ({ ...v, exception: excused(v)!.id })), notes }, null, 2));
}
process.exit(open.length ? 1 : 0);
