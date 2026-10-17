'use strict';
/*
 * GATSBY.EXE: NES palettes. The art files are full-colour masters; this puts
 * them on what a 2C02 can show at once, the job a CHR converter does:
 *
 *   - every 16x16 background area uses one of the scene's four background
 *     palettes: three colours plus the backdrop every palette shares;
 *   - every 8x8 sprite tile uses one of the scene's four sprite palettes:
 *     three colours plus transparent.
 *
 * The palettes per scene (each stage, cutscene picture and title screen) are
 * in GG.PAL (art-palettes.js, written by scripts/gatsby/nes-palettes.ts and
 * then tuned by hand). scripts/gatsby/nes-check.ts proves the result on
 * screen; docs/gatsby/hardware.md says what it checks and what it lets off.
 */
(() => {
  const NES = GG.NES;
  const RGB = NES.map((h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]);

  /* Pixel colour -> NES code. All the blacks are 0x0f. */
  const CODE = new Map();
  RGB.forEach(([r, g, b], i) => { const k = (r << 16) | (g << 8) | b; if (!CODE.has(k)) CODE.set(k, i); });
  CODE.set(0, 0x0f);
  const BLACKS = new Set([0x0d, 0x0e, 0x0f, 0x1d, 0x1e, 0x1f, 0x2e, 0x2f, 0x3e, 0x3f]);
  const canon = (c) => (BLACKS.has(c) ? 0x0f : c);
  function codeOf(r, g, b) {
    const k = (r << 16) | (g << 8) | b;
    let c = CODE.get(k);
    if (c === undefined) {
      let best = 1e9;
      RGB.forEach(([R, G, B], i) => { const d = (R - r) ** 2 + (G - g) ** 2 + (B - b) ** 2; if (d < best) { best = d; c = canon(i); } });
      CODE.set(k, c);
    }
    return c;
  }

  /* CIE Lab, for "nearest colour". */
  function lab([r, g, b]) {
    const lin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    const R = lin(r), G = lin(g), B = lin(b);
    const X = (R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047, Y = R * 0.2126 + G * 0.7152 + B * 0.0722, Z = (R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883;
    const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
    return [116 * f(Y) - 16, 500 * (f(X) - f(Y)), 200 * (f(Y) - f(Z))];
  }
  const LAB = RGB.map(lab);
  const D = new Float32Array(64 * 64);
  for (let a = 0; a < 64; a++) for (let b = 0; b < 64; b++) {
    const [l1, a1, b1] = LAB[a], [l2, a2, b2] = LAB[b];
    D[a * 64 + b] = (l1 - l2) ** 2 + (a1 - a2) ** 2 + (b1 - b2) ** 2;
  }

  /* For a palette (+ backdrop), the nearest member for every colour. */
  function nearMap(pal, backdrop) {
    const opts = pal.slice();
    if (backdrop !== null && backdrop !== undefined) opts.push(backdrop);
    const m = new Uint8Array(64);
    for (let c = 0; c < 64; c++) {
      let best = 1e9, bc = c;
      for (const o of opts) { const d = D[c * 64 + o]; if (d < best) { best = d; bc = o; } }
      m[c] = bc;
    }
    return m;
  }

  /*
   * Reduce RGBA pixel data, cell by cell, to one palette per cell. `layers`
   * are same-sized buffers stacked bottom to top (one plane, e.g. a room's
   * backdrop, the tiles, the tiles in front); the palette is chosen from what
   * shows and applied to all of them. Pixels of the backdrop colour are free.
   * `keep` (cell index -> palette) makes a choice sticky, so animated pictures
   * don't flash between palettes.
   */
  function reduce(layers, w, h, cell, pals, backdrop, ox = 0, oy = 0, keep = null) {
    if (!pals || !pals.length) return;
    const maps = pals.map((p) => nearMap(p, backdrop));
    const hist = new Int32Array(64);
    const top = layers.length - 1;
    let ci = 0;
    for (let cy = -oy; cy < h; cy += cell) {
      for (let cx = -ox; cx < w; cx += cell, ci++) {
        hist.fill(0);
        const x0 = Math.max(0, cx), x1 = Math.min(w, cx + cell), y0 = Math.max(0, cy), y1 = Math.min(h, cy + cell);
        let any = false;
        for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
          const i = (y * w + x) * 4;
          for (let l = top; l >= 0; l--) {
            const d = layers[l];
            if (!d || d[i + 3] < 128) continue;
            const c = codeOf(d[i], d[i + 1], d[i + 2]);
            if (c !== backdrop) { hist[c]++; any = true; }
            break;
          }
        }
        if (!any) continue;
        let k = 0, best = 1e18;
        const cost = maps.map((m) => { let s = 0; for (let c = 0; c < 64; c++) if (hist[c]) s += hist[c] * D[c * 64 + m[c]]; return s; });
        cost.forEach((s, j) => { if (s < best - 1e-6) { best = s; k = j; } });
        if (keep) {
          const was = keep.get(ci);
          if (was !== undefined && was < cost.length && cost[was] <= best * 1.25 + 50) k = was;
          keep.set(ci, k);
        }
        const m = maps[k];
        for (const d of layers) {
          if (!d) continue;
          for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
            const i = (y * w + x) * 4;
            if (d[i + 3] < 128) continue;
            const c = codeOf(d[i], d[i + 1], d[i + 2]);
            if (c === backdrop) continue;
            const n = m[c];
            if (n !== c) { const [r, g, b] = RGB[n]; d[i] = r; d[i + 1] = g; d[i + 2] = b; }
          }
        }
      }
    }
  }

  const make = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  function copy(src) { const c = make(src.width, src.height); c.getContext('2d').drawImage(src, 0, 0); return c; }
  /* A reduced copy of a canvas: cells on its own grid. */
  function reduced(src, cell, pals, backdrop, ox = 0) {
    const c = copy(src);
    if (!c.width || !c.height) return c;
    const g = c.getContext('2d');
    const img = g.getImageData(0, 0, c.width, c.height);
    reduce([img.data], c.width, c.height, cell, pals, backdrop, ox, 0);
    g.putImageData(img, 0, 0);
    return c;
  }
  function flip(c) {
    const f = make(c.width, c.height);
    const g = f.getContext('2d');
    g.translate(c.width, 0); g.scale(-1, 1); g.drawImage(c, 0, 0);
    return f;
  }

  /*
   * Things drawn as sprites in code that a real NES would draw into the
   * background: they're too wide for eight sprites a line, and nothing else
   * moves behind them (the billboard's eyes are part of the billboard). They follow the background rules (16x16 areas, the
   * background palettes) instead. Keyed by sprite set, then frame (or '*').
   */
  const BGOBJ = {
    big: ['board', 'iris', 'irisHit', 'lid1', 'lid2', 'lid3', 'loco', 'coach', 'ashcar'],
    props: ['gatsbyCar', 'gatsbyCar2', 'hearse', 'hearse2', 'couch', 'rowboat', 'skiff', 'piano'],
  };
  const isBgObj = (set, frame) => !!(BGOBJ[set] && (BGOBJ[set].includes(frame) || BGOBJ[set].includes('*')));

  const N = (GG.nes = {
    RGB, LAB, D, codeOf, canon, nearMap, reduce, reduced, BGOBJ, isBgObj,
    scene: null, pal: null,
  });

  let masters = null;
  N.masters = () => { snapshot(); return masters; };
  function snapshot() {
    if (masters) return;
    masters = { spr: {}, tile: Object.assign({}, GG.TILE), bg: {} };
    for (const [name, set] of Object.entries(GG.SPR)) {
      masters.spr[name] = {};
      for (const [f, s] of Object.entries(set)) masters.spr[name][f] = s.c;
    }
    for (const [name, bg] of Object.entries(GG.BG)) {
      masters.bg[name] = (bg.layers || []).map((L) => ({ img: L.img, fill: L.fill }));
    }
  }

  const sceneCache = new Map();
  /* The palettes for a scene key, falling back to the shared defaults. */
  N.palFor = (key) => (GG.PAL && (GG.PAL[key] || GG.PAL.default)) || null;

  /*
   * Entities that draw pixels themselves (the green light, the glare, a
   * shell's mark) draw them in one of the scene's sprite palettes: the one
   * that best fits every colour that kind of entity has drawn. A draw is
   * recorded, its palette chosen from all its colours, then played back in
   * order, so one draw never mixes palettes.
   */
  let wrapped = false;
  const kinds = new Map();
  function kindMap(type, cols) {
    let k = kinds.get(type);
    if (!k) { k = { seen: new Set(), map: null }; kinds.set(type, k); }
    let fresh = !k.map;
    for (const c of cols) if (!k.seen.has(c)) { k.seen.add(c); fresh = true; }
    if (fresh) {
      let best = 1e18, pal = N.pal.spr[0];
      for (const p of N.pal.spr) {
        let s = 0;
        for (const c of k.seen) { let m = 1e9; for (const o of p) m = Math.min(m, D[c * 64 + o]); s += m; }
        if (s < best) { best = s; pal = p; }
      }
      k.map = nearMap(pal, null);
    }
    return k.map;
  }
  function wrapDraw() {
    if (wrapped || !GG.draw) return;
    wrapped = true;
    const draw = GG.draw;
    GG.draw = (e, ...a) => {
      if (!N.pal) return draw(e, ...a);
      const rect = GG.rect, spr = GG.drawSprite, calls = [];
      GG.rect = (...args) => { calls.push([0, args]); };
      GG.drawSprite = (...args) => { calls.push([1, args]); };
      try { draw(e, ...a); } finally { GG.rect = rect; GG.drawSprite = spr; }
      const cols = [];
      for (const [k, args] of calls) if (!k && typeof args[5] === 'number') cols.push(canon(args[5]));
      const m = cols.length ? kindMap(e.type, cols) : null;
      for (const [k, args] of calls) {
        if (k) { GG.drawSprite(...args); continue; }
        if (m && typeof args[5] === 'number') args[5] = m[canon(args[5])];
        GG.rect(...args);
      }
    };
  }

  /* Repaint sprites, tiles and backgrounds for a scene (a stage key). */
  N.use = (key) => {
    snapshot();
    wrapDraw();
    const P = N.palFor(key);
    if (key !== N.scene) kinds.clear();
    N.scene = key; N.pal = P;
    if (!P) { restore(); return; }
    let S = sceneCache.get(key);
    if (!S) {
      S = { spr: {}, tile: {}, bg: {} };
      for (const [name, frames] of Object.entries(masters.spr)) {
        S.spr[name] = {};
        for (const [f, c] of Object.entries(frames)) {
          // Flipped sprites keep their 8x8 tiles: the grid mirrors with them.
          const bgo = isBgObj(name, f);
          const q = bgo ? reduced(c, 16, P.bg, P.backdrop) : reduced(c, 8, P.spr, null);
          S.spr[name][f] = { c: q, f: flip(q) };
        }
      }
      for (const [name, c] of Object.entries(masters.tile)) S.tile[name] = reduced(c, 16, P.bg, P.backdrop);
      sceneCache.set(key, S);
    }
    for (const [name, frames] of Object.entries(S.spr)) for (const [f, q] of Object.entries(frames)) {
      const s = GG.SPR[name] && GG.SPR[name][f];
      if (s) { s.c = q.c; s.f = q.f; }
    }
    Object.assign(GG.TILE, S.tile);
    N.useBg(P);
  };
  function restore() {
    for (const [name, frames] of Object.entries(masters.spr)) for (const [f, c] of Object.entries(frames)) {
      const s = GG.SPR[name] && GG.SPR[name][f];
      if (s) { s.c = c; s.f = flip(c); }
    }
    Object.assign(GG.TILE, masters.tile);
    for (const [name, bg] of Object.entries(GG.BG)) (bg.layers || []).forEach((L, i) => { L.img = masters.bg[name][i].img; L.fill = masters.bg[name][i].fill; });
  }

  /* Parallax layers: each its own plane, reduced on its own 16px grid. */
  const bgCache = new Map();
  N.useBg = (P) => {
    for (const [name, bg] of Object.entries(GG.BG)) {
      (bg.layers || []).forEach((L, i) => {
        const m = masters.bg[name][i];
        if (m.fill !== undefined) L.fill = N.bgcol(m.fill);
        if (typeof m.img === 'function') {
          L.img = (t, W) => N.q(m.img(t, W));
        } else if (m.img) {
          const k = N.scene + '|' + name + '|' + i;
          if (!bgCache.has(k)) bgCache.set(k, reduced(m.img, 16, P.bg, P.backdrop));
          L.img = bgCache.get(k);
        }
      });
    }
  };
  /* A reduced copy of any background canvas for the current scene (cached). */
  const qCache = new Map();
  N.q = (c) => {
    if (!N.pal || !c) return c;
    let per = qCache.get(N.scene);
    if (!per) { per = new WeakMap(); qCache.set(N.scene, per); }
    let r = per.get(c);
    if (!r) { r = reduced(c, 16, N.pal.bg, N.pal.backdrop); per.set(c, r); }
    return r;
  };

  /* Nearest colour in the scene's sprite (or background) palettes. */
  const nearIn = (c, pals, extra) => {
    if (typeof c !== 'number') return c;
    c = canon(c);
    let best = 1e9, bc = c;
    for (const p of pals) for (const o of p) { const d = D[c * 64 + o]; if (d < best) { best = d; bc = o; } }
    if (extra !== null && extra !== undefined && D[c * 64 + extra] < best) bc = extra;
    return bc;
  };
  N.col = (c) => (N.pal ? nearIn(c, N.pal.spr, null) : c);
  N.bgcol = (c) => (N.pal ? nearIn(c, N.pal.bg, N.pal.backdrop) : c);

  /*
   * Live drawing on a background plane (a background's extras: sailboats,
   * fireworks, smoke): drawn to a scratch screen, reduced on the screen's
   * 16px grid with the scene's background palettes, then laid down.
   */
  let scratch = null;
  N.overlay = (g, fn) => {
    if (!N.pal) { fn(g); return; }
    if (!scratch) scratch = make(GG.W, GG.H);
    const sg = scratch.getContext('2d');
    sg.clearRect(0, 0, GG.W, GG.H);
    fn(sg);
    const img = sg.getImageData(0, 0, GG.W, GG.H);
    reduce([img.data], GG.W, GG.H, 16, N.pal.bg, N.pal.backdrop);
    sg.putImageData(img, 0, 0);
    g.drawImage(scratch, 0, 0);
  };

  /*
   * The tile plane after game.js has built it: the room backdrops, the tiles
   * and the tiles drawn in front of sprites are one nametable, so each 16x16
   * world cell gets one palette from what shows through all three.
   */
  N.build = (lv, def, buildLayer) => {
    N.use(def.key);
    buildLayer(lv);
    const P = N.pal;
    if (!P) return;
    const cans = [lv.backLayer, lv.layer, lv.fgLayer];
    const imgs = cans.map((c) => (c ? c.getContext('2d').getImageData(0, 0, c.width, c.height) : null));
    reduce(imgs.map((i) => (i ? i.data : null)), lv.pw, lv.ph, 16, P.bg, P.backdrop);
    cans.forEach((c, k) => { if (c) c.getContext('2d').putImageData(imgs[k], 0, 0); });
  };

  /*
   * A still screen (a cutscene picture, the title, the ending): reduce the
   * region of the screen canvas just drawn, on the screen's 16px grid, with
   * that picture's palettes. Choices stick per picture so motion doesn't
   * make cells flash.
   */
  const keeps = new Map();
  N.picture = (g, x, y, w, h, key) => {
    const P = (GG.PAL && GG.PAL[key]) || null;
    if (!P) return;
    let keep = keeps.get(key);
    if (!keep) { keep = new Map(); keeps.set(key, keep); }
    const img = g.getImageData(x, y, w, h);
    reduce([img.data], w, h, 16, P.bg, P.backdrop, ((x % 16) + 16) % 16, ((y % 16) + 16) % 16, keep);
    g.putImageData(img, x, y);
  };
})();
