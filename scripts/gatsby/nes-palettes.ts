/*
 * Chooses the NES palettes for every GATSBY.EXE scene and writes
 * public/games/gatsby/art-palettes.js.
 *
 *   node scripts/gatsby/nes-palettes.ts            all scenes
 *   node scripts/gatsby/nes-palettes.ts 3 cine     only these (others kept)
 *
 * For each stage it renders the full-colour masters with the real game,
 * walks the stage to see which sprites appear (and how often), and collects
 * colour histograms per 16x16 background cell (tiles, rooms, parallax layers,
 * background objects) and per 8x8 sprite tile. Then it searches for the four
 * background palettes (plus backdrop) and four sprite palettes that lose the
 * least colour, measured in CIE Lab, when every cell or tile takes its best
 * palette. Cutscene pictures and the title/ending screens get their own.
 * A `keep` table at the top pins choices made by hand; the search fills in
 * the rest around them.
 */
import fs from 'node:fs';
import path from 'node:path';
import { openGame } from './lib/browser.ts';
import { GAME_DIR } from './lib/game.ts';
import { installTour, type Hist } from './lib/nes-tour.ts';

interface Unit { h: Hist; w: number }
interface ScenePal { backdrop: number; bg: number[][]; spr?: number[][]; note?: string }
interface Keep extends Partial<ScenePal> { bgFixed?: number[][]; sprFixed?: number[][] }

/*
 * Choices made by hand, by scene key. bg/spr pin all four palettes;
 * bgFixed/sprFixed pin some and let the search choose the rest around them.
 */
const HUD = [0x0f, 0x16, 0x30];        // the hearts: black, red, white
const KEEP: Record<string, Keep> = {
  '9': { sprFixed: [HUD, [0x1a, 0x2a, 0x30]] },   // the green light is green
};
const keepFor = (k: string): Keep => {
  const kp = KEEP[k] || {};
  return /^\d/.test(k) ? { ...kp, sprFixed: kp.sprFixed || [HUD] } : kp;
};

const args = process.argv.slice(2);
const only = (k: string) => !args.length || args.some((a) => k === a || k.startsWith(a + ':'));

const gp = await openGame('?debug');
const { page } = gp;
await installTour(page);
const Dist: number[] = await page.evaluate(() => Array.from((globalThis as any).GG.nes.D as Float32Array));
const d = (a: number, b: number) => Dist[a * 64 + b];

/* ------------------------------------------------------------- search */
function rng(seed: number) {
  return () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
}
function merge(units: Unit[]): Unit[] {
  const m = new Map<string, Unit>();
  for (const u of units) {
    const h = u.h.slice().sort((a, b) => a[0] - b[0]);
    const k = h.map(([c, n]) => c + ':' + n).join(',');
    const e = m.get(k);
    if (e) e.w += u.w; else m.set(k, { h, w: u.w });
  }
  return [...m.values()];
}
const costOf = (u: Unit, pal: number[], backdrop: number | null) => {
  let s = 0;
  for (const [c, n] of u.h) {
    if (c === backdrop) continue;
    let best = backdrop === null ? 1e9 : d(c, backdrop);
    for (const p of pal) { const v = d(c, p); if (v < best) best = v; }
    s += n * best;
  }
  return s * u.w;
};
function bestFit(units: Unit[], backdrop: number | null, slots: number): number[] {
  const tally = new Map<number, number>();
  for (const u of units) for (const [c, n] of u.h) if (c !== backdrop) tally.set(c, (tally.get(c) || 0) + n * u.w);
  const cand = [...tally].sort((a, b) => b[1] - a[1]).slice(0, 14).map(([c]) => c);
  if (cand.length <= slots) return cand;
  let best: number[] = cand.slice(0, slots), bc = Infinity;
  const combo = (start: number, pick: number[]) => {
    if (pick.length === slots) {
      let s = 0; for (const u of units) { s += costOf(u, pick, backdrop); if (s >= bc) return; }
      bc = s; best = pick.slice(); return;
    }
    for (let i = start; i < cand.length; i++) { pick.push(cand[i]); combo(i + 1, pick); pick.pop(); }
  };
  combo(0, []);
  return best;
}
function solve(units: Unit[], K: number, backdrop: number | null, fixed: number[][] = [], seed = 1): { pals: number[][]; cost: number } {
  units = merge(units);
  if (!units.length) return { pals: fixed.slice(), cost: 0 };
  const r = rng(seed);
  let best: number[][] = [], bestCost = Infinity;
  const free = K - fixed.length;
  for (let restart = 0; restart < 10; restart++) {
    // Seed: units chosen far from the palettes so far (k-means++ style).
    let pals: number[][] = fixed.map((p) => p.slice());
    while (pals.length < K) {
      const ws = units.map((u) => (pals.length ? Math.min(...pals.map((p) => costOf(u, p, backdrop))) : u.w) + 1e-9);
      let t = r() * ws.reduce((a, b) => a + b, 0), i = 0;
      while (t > ws[i] && i < ws.length - 1) t -= ws[i++];
      pals.push(bestFit([units[i]], backdrop, 3));
    }
    let assign: number[] = [];
    for (let it = 0; it < 25; it++) {
      const next = units.map((u) => { let k = 0, bc = Infinity; pals.forEach((p, j) => { const c = costOf(u, p, backdrop); if (c < bc) { bc = c; k = j; } }); return k; });
      if (next.every((k, i) => k === assign[i])) break;
      assign = next;
      for (let k = fixed.length; k < K; k++) {
        const mine = units.filter((_, i) => assign[i] === k);
        if (mine.length) pals[k] = bestFit(mine, backdrop, 3);
      }
    }
    const total = units.reduce((s, u) => s + Math.min(...pals.map((p) => costOf(u, p, backdrop))), 0);
    if (total < bestCost) { bestCost = total; best = pals; }
    if (free <= 0) break;
  }
  return { pals: best.map((p) => p.slice().sort((a, b) => a - b)), cost: bestCost };
}
function solveBg(units: Unit[], fixedBackdrop?: number, fixed: number[][] = []) {
  const tally = new Map<number, number>();
  for (const u of units) for (const [c, n] of u.h) tally.set(c, (tally.get(c) || 0) + n * u.w);
  const cands = fixedBackdrop !== undefined ? [fixedBackdrop] : [...tally].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([c]) => c);
  let best: { backdrop: number; pals: number[][]; cost: number } | null = null;
  for (const b of cands) {
    const s = solve(units, 4, b, fixed);
    if (!best || s.cost < best.cost) best = { backdrop: b, ...s };
  }
  return best!;
}
const totalPx = (units: Unit[]) => units.reduce((s, u) => s + u.h.reduce((a, [, n]) => a + n, 0) * u.w, 0);

/* ------------------------------------------------------------ collect */
const stages: { key: string; name: string; bg: string; hero: string }[] = await page.evaluate(() =>
  (globalThis as any).GG.stages.map((s: any) => ({ key: s.key, name: s.name, bg: s.bg, hero: s.hero })));

const out: Record<string, ScenePal> = {};
const report: string[] = [];
const prevFile = path.join(GAME_DIR, 'art-palettes.js');
const prev: Record<string, ScenePal> = (() => {
  try { const m = fs.readFileSync(prevFile, 'utf8').match(/GG\.PAL = (\{[\s\S]*\});/); return m ? Function('return ' + m[1])() : {}; } catch { return {}; }
})();

for (let i = 0; i < stages.length; i++) {
  const st = stages[i];
  if (!only(st.key)) { if (prev[st.key]) out[st.key] = prev[st.key]; continue; }
  const data = await page.evaluate(({ i }) => {
    const GG = (globalThis as any).GG, T = (globalThis as any).__nes;
    GG.PAL = null;
    const N = GG.nes;
    const def = GG.stages[i];
    const bg: { h: [number, number][]; w: number }[] = [];
    const sprCount = new Map<string, { name: string; frame: string; n: number }>();
    // The tile plane, as built from the masters.
    const W0 = GG._dbg.startStage(i);
    const lv = W0.lv;
    for (const c of T.cellHists([T.data(lv.backLayer), T.data(lv.layer), T.data(lv.fgLayer)], lv.pw, lv.ph, 16)) bg.push({ h: c.h, w: 1 });
    for (const a of lv.anim) for (const f of a.frames) {
      const tc = N.masters().tile[f]; if (tc) for (const c of T.cellHists([T.data(tc)], 16, 16, 16)) bg.push({ h: c.h, w: 1 });
    }
    // Parallax layers, on their own grids; animated ones sampled.
    const layers = N.masters().bg[def.bg] || [];
    for (const L of layers) {
      const imgs = typeof L.img === 'function' ? [0, 24, 48, 72].map((t) => L.img(t, W0)) : [L.img];
      for (const img of new Set(imgs)) if (img && img.getContext) for (const c of T.cellHists([T.data(img)], img.width, img.height, 16)) bg.push({ h: c.h, w: 0.5 / imgs.length });
      if (L.fill !== undefined) bg.push({ h: [[L.fill, 256]], w: 4 });
    }
    // The extras (sailboats, fireworks, smoke) drawn live over the layers.
    const bgDef = GG.BG[def.bg];
    if (bgDef) {
      const saved = bgDef.layers.map((L: any) => L.when);
      bgDef.layers.forEach((L: any) => { L.when = () => false; });
      const c = document.createElement('canvas'); c.width = GG.W; c.height = GG.H;
      const g = c.getContext('2d')!;
      for (const [cx, cy, t] of [[0, 0, 10], [300, 40, 200], [900, 0, 470], [1600, 80, 999], [2400, 20, 1777], [600, 10, 2500]]) {
        g.clearRect(0, 0, GG.W, GG.H);
        bgDef.draw(g, cx, cy, t, W0);
        for (const u of T.cellHists([T.data(c)], GG.W, GG.H, 16)) bg.push({ h: u.h, w: 1 });
      }
      bgDef.layers.forEach((L: any, j: number) => { L.when = saved[j]; });
    }
    // The walk: which sprites show, and the background objects drawn as sprites.
    const bgObjSeen = new Set<string>();
    const entCells: { h: [number, number][]; w: number }[] = [];
    T.tour(i, (W: any) => {
      // Pixels entities draw themselves, by 8x8 screen cell.
      const cells = new Map<string, Map<number, number>>();
      let inEnt = 0;
      const oRect = GG.rect, oDraw = GG.draw;
      GG.rect = (g: any, x: number, y: number, ww: number, hh: number, col: number) => {
        if (inEnt && typeof col === 'number') for (let yy = Math.max(0, y); yy < Math.min(GG.H, y + hh); yy++) for (let xx = Math.max(0, x); xx < Math.min(GG.W, x + ww); xx++) {
          const k = (xx >> 3) + ',' + (yy >> 3); const m = cells.get(k) || new Map(); cells.set(k, m);
          m.set(N.canon(col), (m.get(N.canon(col)) || 0) + 1);
        }
        return oRect(g, x, y, ww, hh, col);
      };
      GG.draw = (...a: any[]) => { inEnt++; try { return oDraw(...a); } finally { inEnt--; } };
      let draws: any[] = [];
      try { draws = T.record(() => GG._dbg.draw()); } finally { GG.rect = oRect; GG.draw = oDraw; }
      for (const m of cells.values()) entCells.push({ h: [...m], w: 2 });
      for (const dr of draws) {
        const k = dr.name + '.' + dr.frame;
        if (N.isBgObj(dr.name, dr.frame)) { bgObjSeen.add(k); continue; }
        const e = sprCount.get(k) || { name: dr.name, frame: dr.frame, n: 0 };
        e.n++; sprCount.set(k, e);
      }
    });
    for (const k of bgObjSeen) {
      const [name, frame] = k.split('.');
      const c = N.masters().spr[name][frame];
      for (const u of T.cellHists([T.data(c)], c.width, c.height, 16)) bg.push({ h: u.h, w: 2 });
    }
    const spr: { h: [number, number][]; w: number }[] = [];
    const used: string[] = [];
    for (const e of sprCount.values()) {
      const c = N.masters().spr[e.name][e.frame];
      const hero = e.name === def.hero;
      used.push(e.name + '.' + e.frame + ':' + e.n);
      for (const u of T.cellHists([T.data(c)], c.width, c.height, 8)) spr.push({ h: u.h, w: Math.sqrt(e.n) * (hero ? 3 : 1) });
    }
    spr.push(...entCells);
    // The HUD always shows.
    for (const f of ['heart', 'heart0']) { const c = N.masters().spr.hud[f]; if (c) for (const u of T.cellHists([T.data(c)], c.width, c.height, 8)) spr.push({ h: u.h, w: 20 }); }
    return { bg, spr, used, bgObj: [...bgObjSeen] };
  }, { i });
  const k = keepFor(st.key);
  const B = k.bg && k.backdrop !== undefined ? { backdrop: k.backdrop, pals: k.bg, cost: data.bg.reduce((s: number, u: Unit) => s + Math.min(...k.bg!.map((p) => costOf(u, p, k.backdrop!))), 0) } : solveBg(data.bg, k.backdrop, k.bgFixed);
  const S = k.spr ? { pals: k.spr, cost: 0 } : solve(data.spr, 4, null, k.sprFixed || [], 7);
  out[st.key] = { backdrop: B.backdrop, bg: B.pals, spr: S.pals, note: `${st.name}` };
  const loss = (c: number, u: Unit[]) => Math.sqrt(c / Math.max(1, totalPx(u))).toFixed(1);
  report.push(`${st.key.padEnd(5)} ${st.name.padEnd(28)} bg units ${String(data.bg.length).padStart(5)} loss ${loss(B.cost, data.bg)}  spr units ${String(data.spr.length).padStart(4)} loss ${loss(S.cost, data.spr)}  sprites ${data.used.length} bgobj ${data.bgObj.join(' ') || '-'}`);
  process.stdout.write(report[report.length - 1] + '\n');
}

/* Cutscene pictures: each art name its own scene; the frame and text share the screen. */
if (only('cine')) {
  const arts: string[] = await page.evaluate(() => Object.keys((globalThis as any).GG.CINE_ART));
  for (const art of arts) {
    const units: Unit[] = await page.evaluate((art) => {
      const GG = (globalThis as any).GG, T = (globalThis as any).__nes;
      GG.PAL = null;
      const panel = Object.values<any>(GG.CINE).flat().find((p: any) => p && p.art === art) || { art };
      const c = document.createElement('canvas'); c.width = 256; c.height = 224;
      const g = c.getContext('2d')!;
      const acc = new Map<string, Map<number, number>>();
      for (const t of [1, 30, 60, 100, 160, 240, 400]) {
        g.clearRect(0, 0, 256, 224); g.fillStyle = '#000'; g.fillRect(16, 16, 224, 112);
        g.save(); g.beginPath(); g.rect(16, 16, 224, 112); g.clip();
        GG.CINE_ART[art](g, 16, 16, t, panel);
        g.restore();
        const dd = g.getImageData(16, 16, 224, 112).data;
        for (const u of T.cellHists([dd], 224, 112, 16)) {
          const k = u.x + ',' + u.y; const m = acc.get(k) || new Map(); acc.set(k, m);
          for (const [col, n] of u.h) m.set(col, Math.max(m.get(col) || 0, n));
        }
      }
      const res = [...acc.values()].map((m) => ({ h: [...m], w: 1 }));
      // The gold frame and the text under it share the screen's palettes.
      res.push({ h: [[0x18, 40], [0x28, 9]], w: 30 }, { h: [[0x30, 60]], w: 30 }, { h: [[0x28, 40]], w: 10 });
      return res;
    }, art);
    // One palette is the frame's and the text's: gold rules, gold names, white words.
    const s = solve(units, 4, 0x0f, [[0x18, 0x28, 0x30]], 3);
    out['cine:' + art] = { backdrop: 0x0f, bg: s.pals };
  }
  report.push(`cine: ${arts.length} pictures`);
  console.log(report[report.length - 1]);
} else for (const k of Object.keys(prev)) if (k.startsWith('cine:')) out[k] = prev[k];

/* Title and ending: whole screens, sampled over time. */
for (const which of ['title', 'end']) {
  if (!only(which)) { if (prev[which]) out[which] = prev[which]; continue; }
  const units: Unit[] = await page.evaluate((which) => {
    const GG = (globalThis as any).GG, T = (globalThis as any).__nes, D = GG._dbg;
    GG.PAL = null;
    D.go(which === 'title' ? D.titleState() : D.endState());
    const acc = new Map<string, Map<number, number>>();
    const scr = document.getElementById('screen') as HTMLCanvasElement;
    for (let f = 0; f < 480; f++) {
      D.step(1);
      if (f % 40 !== 39) continue;
      D.draw();
      for (const u of T.cellHists([T.data(scr)], 256, 224, 16)) {
        const k = u.x + ',' + u.y; const m = acc.get(k) || new Map(); acc.set(k, m);
        for (const [col, n] of u.h) m.set(col, Math.max(m.get(col) || 0, n));
      }
    }
    return [...acc.values()].map((m) => ({ h: [...m], w: 1 }));
  }, which);
  const B = solveBg(units);
  out[which] = { backdrop: B.backdrop, bg: B.pals };
  report.push(`${which}: backdrop ${B.backdrop.toString(16)} loss ${Math.sqrt(B.cost / Math.max(1, totalPx(units))).toFixed(1)}`);
  console.log(report[report.length - 1]);
}

await gp.close();

/* ------------------------------------------------------------- write */
const hx = (c: number) => '0x' + c.toString(16).padStart(2, '0');
const pl = (ps: number[][]) => '[' + ps.map((p) => '[' + p.map(hx).join(', ') + ']').join(', ') + ']';
const lines = Object.entries(out).map(([k, v]) => {
  const spr = v.spr ? `, spr: ${pl(v.spr)}` : '';
  const note = v.note ? `   // ${v.note}` : '';
  return `    '${k}': { backdrop: ${hx(v.backdrop)}, bg: ${pl(v.bg)}${spr} },${note}`;
});
const file = `'use strict';
/*
 * GATSBY.EXE: the NES palettes for every scene, four for the background (each
 * three colours plus the shared backdrop) and four for sprites (three plus
 * transparent). palette.js maps the art onto them. Chosen by
 * scripts/gatsby/nes-palettes.ts; edit by hand or pin choices in its KEEP.
 */
(() => {
  GG.PAL = {
${lines.join('\n')}
  };
})();
`;
fs.writeFileSync(prevFile, file);
console.log('wrote', prevFile, Object.keys(out).length, 'scenes');
