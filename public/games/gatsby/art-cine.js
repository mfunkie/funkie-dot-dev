'use strict';
/*
 * GATSBY.EXE art: cinema panels. Each panel is 224x112: a static picture
 * built once (sky, water, houses, people) plus a small animated layer on top
 * (the green light, rain, dancers, fans). Portraits are generated from a few
 * features each (hair, hat, spectacles, collar) on one bust, so the cast
 * share a face. Everything stays on the NES palette.
 */
(() => {
  const PW = 224, PH = 112;
  const ART = (GG.CINE_ART = {});
  const cache = {};
  const C = (v) => GG.color(v);

  function canvas(w = PW, h = PH) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function px(g, x, y, col, w = 1, h = 1) {
    // Whole pixels only: round both edges, so nothing is ever blended.
    const x0 = Math.round(x), y0 = Math.round(y), x1 = Math.round(x + w), y1 = Math.round(y + h);
    if (x1 <= x0 || y1 <= y0) return;
    g.fillStyle = C(col); g.fillRect(x0, y0, x1 - x0, y1 - y0);
  }
  function built(name, fn) { if (!cache[name]) { const c = canvas(); fn(c.getContext('2d')); cache[name] = c; } return cache[name]; }
  function panel(name, build, anim) {
    ART[name] = (g, ax, ay, t, p) => {
      if (build) g.drawImage(built(name, build), ax, ay);
      if (anim) { g.save(); g.translate(ax, ay); anim(g, t, p); g.restore(); }
    };
  }
  const B = (x, y) => GG.bayer(x, y);

  /* ------------------------------------------------------------ kit */
  /* Bands of color top to bottom, a dithered seam between each pair. */
  function sky(g, stops, w = PW, h = PH) {
    for (let i = 0; i < stops.length; i++) {
      const [col, y0] = stops[i];
      const y1 = i + 1 < stops.length ? stops[i + 1][1] : h;
      px(g, 0, y0, col, w, y1 - y0);
      if (i + 1 < stops.length) {
        const next = stops[i + 1][0], band = stops[i + 1][2] || 6;
        for (let d = 0; d < band; d++) {
          const y = y1 - band + d;
          if (y < 0) continue;
          for (let x = 0; x < w; x++) if (B(x, y) < (d + 1) / (band + 1)) px(g, x, y, next);
        }
      }
    }
  }
  function stars(g, w, h, seed, n, cols, y0 = 0) {
    const r = GG.rng(seed);
    for (let i = 0; i < n; i++) {
      const x = Math.floor(r() * w), y = y0 + Math.floor(r() * h), col = cols[Math.floor(r() * cols.length)];
      px(g, x, y, col);
      if (r() < 0.07) { px(g, x - 1, y, col); px(g, x + 1, y, col); px(g, x, y - 1, col); px(g, x, y + 1, col); }
    }
  }
  function disc(g, cx, cy, r, col) {
    for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r + r * 0.6) px(g, cx + x, cy + y, col);
  }
  function moon(g, cx, cy, r) {
    disc(g, cx, cy, r, 0x30);
    for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) {
      if (x * x + y * y > r * r) continue;
      const s = (x + r * 0.3) / r;
      if (s > 0.5 && B(cx + x, cy + y) < (s - 0.5) * 2) px(g, cx + x, cy + y, 0x10);
    }
  }
  function glow(g, cx, cy, r, col, amt = 0.5) {
    for (let y = Math.floor(cy - r); y < cy + r; y++) for (let x = Math.floor(cx - r); x < cx + r; x++) {
      const d = Math.hypot(x - cx, y - cy) / r;
      if (d < 1 && B(x, y) < (1 - d) * amt) px(g, x, y, col);
    }
  }
  function dith(g, x0, y0, w, h, col, amt) {
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) if (B(x, y) < amt) px(g, x, y, col);
  }
  function vignette(g, col = 0x0f, depth = 10) {
    for (let y = 0; y < PH; y++) for (let x = 0; x < PW; x++) {
      const d = Math.min(x, y, PW - 1 - x, PH - 1 - y);
      if (d < depth && B(x, y) < (depth - d) / depth) px(g, x, y, col);
    }
  }
  /* Moving water: a base color with glints that drift. */
  function water(g, y0, h, base, glint, t, seed = 1, w = PW) {
    px(g, 0, y0, base, w, h);
    const r = GG.rng(seed);
    for (let i = 0; i < h * 3; i++) {
      const y = y0 + Math.floor(r() * h);
      const len = 2 + Math.floor(r() * (4 + (y - y0) / 2));
      const x = (Math.floor(r() * w) + Math.floor(t / (10 + (i % 5)))) % w;
      px(g, x, y, glint, len, 1);
    }
  }
  /* Rain seen through a window: clipped to the panes. */
  function rainIn(g, t, x0, y0, w, h, n = 24, col = 0x10) {
    for (let i = 0; i < n; i++) {
      const x = x0 + ((i * 53 + t) % w), y = y0 + ((i * 89 + t * 5) % h);
      px(g, x, y, col, 1, Math.min(3, y0 + h - y));
    }
  }
  function rain(g, t, n = 70, col = 0x10, slant = 1) {
    for (let i = 0; i < n; i++) {
      const x = (i * 53 + t * 2 * slant) % (PW + 30) - 15, y = (i * 89 + t * 6) % PH;
      px(g, x, y, col, 1, 4);
    }
  }
  /* A rolling hedge or treeline along y, bumpy on top. */
  function hedge(g, y, col, light, seed, h = 10, x0 = 0, x1 = PW) {
    const r = GG.rng(seed);
    let top = y;
    for (let x = x0; x < x1; x++) {
      top += (r() - 0.5) * 2; top = Math.max(y - h / 2, Math.min(y + 2, top));
      px(g, x, Math.round(top), light);
      px(g, x, Math.round(top) + 1, col, 1, PH);
    }
  }
  function windowGrid(g, x, y, cols, rows, dx, dy, w, h, col, frame, seed, litAmt = 1, litCol = col) {
    const r = GG.rng(seed);
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      const wx = x + i * dx, wy = y + j * dy;
      if (frame !== undefined) px(g, wx - 1, wy - 1, frame, w + 2, h + 2);
      px(g, wx, wy, r() < litAmt ? litCol : col, w, h);
    }
  }

  /* Gatsby's house: "a factual imitation of some Hotel de Ville in Normandy,
   * with a tower on one side, spanking new under a thin beard of raw ivy." */
  function gatsbyHouse(g, x, y, w, h, o = {}) {
    const wall = o.wall === undefined ? 0x10 : o.wall, dark = o.dark === undefined ? 0x00 : o.dark;
    const lit = o.lit === undefined ? 0x38 : o.lit, roof = o.roof === undefined ? 0x0c : o.roof;
    px(g, x, y, wall, w, h);
    for (let i = 0; i < w; i++) px(g, x + i, y + h - 1, dark);
    // Roof: steep mansard with dormers.
    for (let i = 0; i < 8; i++) px(g, x - 2 + i, y - 8 + i, roof, w + 4 - i * 2, 1);
    for (let i = 0; i < 8; i++) px(g, x + 3, y - 8 + i, roof, w - 6, 1);
    for (let d = 8; d < w - 8; d += 14) { px(g, x + d, y - 12, roof, 6, 5); px(g, x + d + 1, y - 11, lit === null ? dark : lit, 4, 3); }
    // Tower on the right.
    const tx = x + w - 18, tw = 22, th = h + 22;
    px(g, tx, y + h - th, wall, tw, th);
    px(g, tx + tw - 3, y + h - th, dark, 3, th);
    for (let i = 0; i < 16; i++) px(g, tx + Math.floor(i * 0.7), y + h - th - 1 - i, roof, Math.max(1, tw - Math.floor(i * 1.4)), 1);
    px(g, tx + 10, y + h - th - 22, roof, 1, 6);
    // Windows: rows, lit or dark.
    const r = GG.rng(o.seed || 5);
    for (let row = 0; row < Math.floor((h - 6) / 10); row++) {
      for (let i = 6; i < w - 20; i += 9) {
        const on = o.allLit || r() < (o.litAmt === undefined ? 0.7 : o.litAmt);
        px(g, x + i, y + 4 + row * 10, on && lit !== null ? lit : dark, 4, 6);
        if (on && lit !== null && o.glow) px(g, x + i, y + 10 + row * 10, o.glow, 4, 1);
      }
    }
    for (let row = 0; row < 3; row++) px(g, tx + 8, y + h - th + 8 + row * 12, lit !== null && r() < 0.8 ? lit : dark, 5, 7);
    // Ivy at the foot.
    if (o.ivy !== null) for (let yy = y + h - 14; yy < y + h; yy++) for (let i = 0; i < w; i++) if (B(x + i, yy) < (yy - (y + h - 14)) / 18) px(g, x + i, yy, o.ivy === undefined ? 0x0a : o.ivy);
  }
  /* The Buchanans': "a cheerful red-and-white Georgian Colonial mansion". */
  function georgian(g, x, y, w, h, o = {}) {
    const brick = o.brick || 0x16, mortar = o.mortar || 0x06, trim = o.trim || 0x30, glass = o.glass === undefined ? 0x21 : o.glass;
    for (let yy = 0; yy < h; yy++) for (let i = 0; i < w; i++) px(g, x + i, y + yy, (yy % 3 === 2 || (i + (Math.floor(yy / 3) % 2) * 2) % 5 === 0) ? mortar : brick);
    // Hipped roof, cornice, chimneys.
    for (let i = 0; i < 10; i++) px(g, x - 2 + i * 2, y - 1 - i, o.roof || 0x00, w + 4 - i * 4, 1);
    px(g, x - 3, y - 1, trim, w + 6, 2);
    px(g, x + 10, y - 16, brick, 5, 8); px(g, x + w - 15, y - 16, brick, 5, 8);
    // Windows with white frames and shutters.
    for (let row = 0; row < 2; row++) for (let i = 6; i < w - 6; i += 12) {
      if (Math.abs(x + i + 2 - (x + w / 2)) < 8) continue;
      px(g, x + i - 1, y + 5 + row * 14, trim, 7, 10);
      px(g, x + i, y + 6 + row * 14, glass, 5, 8);
      px(g, x + i + 2, y + 6 + row * 14, trim, 1, 8);
      px(g, x + i - 3, y + 5 + row * 14, 0x0c, 2, 10); px(g, x + i + 6, y + 5 + row * 14, 0x0c, 2, 10);
    }
    // Portico: pediment and white columns over the door.
    const cx = x + w / 2;
    for (let i = 0; i < 6; i++) px(g, cx - 12 + i * 2, y + 2 - i, trim, 24 - i * 4, 1);
    px(g, cx - 13, y + 3, trim, 26, 2);
    for (let i = 0; i < 4; i++) px(g, cx - 11 + i * 7, y + 5, trim, 2, h - 5);
    px(g, cx - 3, y + h - 14, o.door || 0x0c, 6, 14);
  }
  function cottage(g, x, y, o = {}) {
    const wall = o.wall === undefined ? 0x00 : o.wall, roof = o.roof === undefined ? 0x08 : o.roof;
    px(g, x, y, wall, 30, 18);
    for (let i = 0; i < 10; i++) px(g, x - 3 + i, y - 1 - i, roof, 36 - i * 2, 1);
    px(g, x + 4, y + 5, o.win === undefined ? 0x38 : o.win, 5, 5); px(g, x + 21, y + 5, o.win === undefined ? 0x38 : o.win, 5, 5);
    px(g, x + 13, y + 8, 0x0f, 5, 10);
    px(g, x + 22, y - 14, wall, 4, 6);
  }

  /*
   * A little person, about 14px tall, standing on (x, y). opts: coat, legs,
   * skin, hair, hat, dress (a woman in a dress), arms ('down' 'out' 'up').
   */
  function fig(g, x, y, o = {}) {
    const coat = o.coat === undefined ? 0x02 : o.coat, legs = o.legs === undefined ? coat : o.legs;
    const skin = o.skin === undefined ? 0x36 : o.skin, hair = o.hair === undefined ? 0x08 : o.hair;
    const s = o.s || 1;
    const R = (dx, dy, w, h, col) => px(g, x + dx * s, y + dy * s, col, w * s, h * s);
    if (o.dress) {
      R(-3, -6, 7, 6, coat); R(-2, -9, 5, 4, coat);
      R(-1, -1, 1, 1, skin); R(1, -1, 1, 1, skin);
    } else {
      R(-2, -5, 2, 5, legs); R(1, -5, 2, 5, legs);
      R(-2, -10, 5, 6, coat);
      R(-2, -1, 2, 1, o.shoes === undefined ? 0x0f : o.shoes); R(1, -1, 2, 1, o.shoes === undefined ? 0x0f : o.shoes);
    }
    if (o.arms === 'out') { R(-6, -9, 4, 1, coat); R(3, -9, 4, 1, coat); R(-7, -9, 1, 1, skin); R(7, -9, 1, 1, skin); }
    else if (o.arms === 'up') { R(-3, -13, 1, 4, coat); R(3, -13, 1, 4, coat); }
    else if (o.arms === 'fwd') { R(3, -9, 4, 1, coat); R(7, -9, 1, 1, skin); }
    R(-1, -13, 3, 3, skin);
    R(-1, -14, 3, 1, hair); if (o.long) R(-2, -13, 1, 3, hair);
    if (o.hat === 'boater') { R(-2, -15, 5, 1, 0x28); R(-1, -16, 3, 1, 0x38); }
    else if (o.hat === 'cap') { R(-2, -15, 5, 1, o.hatCol || 0x0f); R(1, -14, 2, 1, o.hatCol || 0x0f); }
    else if (o.hat === 'cloche') { R(-2, -15, 5, 2, o.hatCol || 0x30); }
    else if (o.hat === 'top') { R(-2, -14, 5, 1, 0x0f); R(-1, -17, 3, 3, 0x0f); }
    else if (o.hat === 'umbrella') { R(-5, -18, 11, 1, o.hatCol || 0x0f); R(-4, -19, 9, 1, o.hatCol || 0x0f); R(-2, -20, 5, 1, o.hatCol || 0x0f); R(0, -17, 1, 4, 0x0f); }
  }
  /*
   * A touring car, side view, facing right, standing on y: a long louvred
   * hood, a nickel radiator, terraced wind-shields, swooping fenders and wire
   * wheels. o.driver puts someone at the wheel.
   */
  function car(g, x, y, o = {}) {
    const len = o.len || 80, body = o.body === undefined ? 0x37 : o.body, dark = o.dark === undefined ? 0x27 : o.dark;
    const trim = o.trim === undefined ? 0x30 : o.trim, glass = o.glass === undefined ? 0x31 : o.glass;
    const L = (dx, dy, w, h, col) => px(g, o.flip ? x + len - dx - w : x + dx, y + dy, col, w, h);
    const wr = o.wheel || 5, w1 = 12, w2 = len - 15;
    // Body and tub.
    L(3, -15, len - 10, 8, body); L(3, -8, len - 10, 1, dark); L(3, -15, len - 10, 1, trim === 0x30 ? 0x30 : body);
    L(2, -20, 26, 6, body); L(2, -20, 26, 1, dark === body ? 0x0f : dark); L(1, -18, 2, 10, body);
    L(30, -18, 8, 4, dark);
    // Hood with louvres, radiator and its mascot, a great lamp.
    L(38, -17, len - 46, 9, body); L(38, -17, len - 46, 1, trim);
    for (let i = 44; i < len - 12; i += 3) L(i, -14, 1, 4, dark);
    L(len - 8, -19, 3, 12, trim); L(len - 7, -21, 1, 2, trim);
    L(len - 6, -16, 3, 3, trim); L(len - 5, -15, 2, 1, o.lamp === undefined ? 0x38 : o.lamp);
    // Terraced wind-shields.
    L(37, -25, 1, 8, trim); L(38, -24, 2, 7, glass);
    L(23, -24, 1, 6, trim); L(24, -23, 2, 5, glass);
    if (o.boxes) { L(4, -24, 9, 4, dark); L(5, -27, 7, 3, body); L(14, -23, 6, 3, trim); }
    if (o.driver) { L(31, -25, 4, 4, o.driver.skin || 0x36); L(31, -26, 4, 1, o.driver.hair || 0x18); L(30, -21, 6, 4, o.driver.coat || 0x30); }
    if (o.passenger) { L(14, -24, 4, 4, 0x36); L(14, -25, 4, 1, o.passenger.hair || 0x08); L(13, -20, 6, 2, o.passenger.coat || 0x30); }
    // Fenders, running board, wheels.
    for (const wc of [w1, w2]) {
      for (let i = -wr - 2; i <= wr + 2; i++) { const h = Math.round(Math.sqrt(Math.max(0, (wr + 2.5) ** 2 - i * i))); L(wc + i, -h - 1, 1, 2, dark); }
    }
    L(w1 + wr + 2, -7, w2 - w1 - 2 * wr - 4, 2, dark); L(w1 + wr + 2, -7, w2 - w1 - 2 * wr - 4, 1, trim);
    for (const wc of [w1, w2]) {
      const cx = o.flip ? x + len - wc : x + wc, cy = y - wr;
      disc(g, cx, cy, wr, 0x0f); disc(g, cx, cy, wr - 1, 0x00);
      for (let a = 0; a < 8; a++) px(g, cx + Math.round(Math.cos(a * 0.785) * (wr - 2)), cy + Math.round(Math.sin(a * 0.785) * (wr - 2)), trim);
      px(g, cx, cy, trim);
    }
  }
  function road(g, y, col = 0x00, line = 0x10) { px(g, 0, y, col, PW, PH - y); for (let x = 0; x < PW; x += 12) px(g, x, y + Math.floor((PH - y) / 2), line, 6, 1); }
  function lawn(g, y, col, light, seed) {
    px(g, 0, y, col, PW, PH - y);
    const r = GG.rng(seed);
    for (let i = 0; i < 260; i++) { const yy = y + Math.floor(r() * (PH - y)); px(g, Math.floor(r() * PW), yy, light, 1, 1); }
  }
  /* The green light, minute and far away, at the end of a dock. */
  function greenLight(g, x, y, t, big = false) {
    const on = Math.floor(t / 22) % 6 !== 5;
    px(g, x - 14, y + 3, 0x0f, 16, 1); px(g, x - 14, y + 4, 0x08, 1, 3); px(g, x - 6, y + 4, 0x08, 1, 3);
    px(g, x, y - 2, 0x0f, 1, 6);
    if (on) {
      glow(g, x, y - 3, big ? 9 : 6, 0x1a, 0.6);
      px(g, x - 1, y - 4, 0x2a, 3, 2); px(g, x, y - 4, 0x3a, 1, 1);
    } else px(g, x - 1, y - 4, 0x0a, 3, 2);
    return on;
  }
  function greenTrail(g, x, y0, y1, t) {
    for (let y = y0; y < y1; y += 2) {
      const w = 1 + Math.floor((y - y0) / 6);
      const off = Math.round(Math.sin((y + t * 0.3) / 3) * 2);
      if ((y + Math.floor(t / 6)) % 4 < 2) px(g, x - w + off, y, 0x1a, w * 2, 1);
    }
  }
  /* Paste a picture sheared column by column (whole pixels: no blending). */
  function tilt(g, src, x, y, slope) {
    for (let i = 0; i < src.width; i++) g.drawImage(src, i, 0, 1, src.height, x + i, y + Math.round((i - src.width / 2) * slope), 1, src.height);
  }
  function scratch(w, h, fn) { const c = canvas(w, h); fn(c.getContext('2d')); return c; }
  function spr(g, name, frame, x, y, flip) { if (GG.SPR && GG.SPR[name]) GG.drawSprite(g, name, frame, x, y, flip); }

  GG.cineKit = { canvas, px, sky, stars, disc, moon, glow, dith, water, rain, hedge, gatsbyHouse, georgian, cottage, fig, car, greenLight, greenTrail, vignette };

  /* -------------------------------------------------------- portraits */
  /*
   * A bust, 56x56, front on, light from the left. Each sitter is a handful of
   * features over the same head: hair and hat, spectacles, beard, collar.
   */
  function portrait(o) {
    const W = 56, Hh = 56;
    const pix = new Int16Array(W * Hh).fill(-1);
    const set = (x, y, col) => { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < W && y < Hh) pix[y * W + x] = col; };
    const get = (x, y) => (x >= 0 && y >= 0 && x < W && y < Hh ? pix[y * W + x] : -1);
    const fillEll = (cx, cy, rx, ry, col, shadeCol, cut) => {
      for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
        const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
        if (dx * dx + dy * dy > 1) continue;
        if (cut && !cut(x, y)) continue;
        const sh = shadeCol !== undefined && dx > 0.5 && (dx > 0.72 || B(x, y) < 0.5);
        set(x, y, sh ? shadeCol : col);
      }
    };
    const rect = (x0, y0, w, h, col) => { for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) set(x, y, col); };
    const skin = o.skin || 0x36, shade = o.shade || 0x27;
    const cx = 28, hy = o.hy || 24, rx = o.rx || 10.5, ry = o.ry || 13;

    // Shoulders and clothes.
    const sw = o.shoulders || 25;
    fillEll(cx, 62, sw, 19, o.coat, o.coatShade);
    // Neck.
    const nw = o.neck || 8;
    rect(cx - nw / 2, hy + 9, nw, 12, skin);
    for (let y = hy + 9; y < hy + 21; y++) set(cx + nw / 2 - 1, y, shade);
    rect(cx - nw / 2, hy + 12, nw, 2, shade);
    // Collar: shirt V with tie, or a neckline.
    if (o.neckline) {
      for (let y = 43; y < 56; y++) {
        const half = Math.max(0, 9 - (y - 43) * 0.9);
        for (let x = cx - half; x <= cx + half; x++) set(x, y, skin);
      }
      if (o.pearls) for (let i = -7; i <= 7; i += 2) set(cx + i, 45 + Math.round((49 - i * i) / 18), 0x30);
    } else {
      for (let y = 42; y < 56; y++) {
        const half = Math.max(0, 7 - (y - 42) * 0.5);
        for (let x = cx - half; x <= cx + half; x++) set(x, y, o.shirt === undefined ? 0x30 : o.shirt);
        set(cx - half - 1, y, o.lapel === undefined ? o.coatShade : o.lapel);
        set(cx + half + 1, y, o.lapel === undefined ? o.coatShade : o.lapel);
      }
      if (o.tie !== undefined) for (let y = 44; y < 56; y++) { set(cx - 1, y, o.tie); set(cx, y, o.tie); if (y > 46) set(cx + 1, y, o.tie); }
    }
    // Ears and head; the jaw narrows (or squares, for Tom).
    fillEll(cx - rx - 0.5, hy + 2, 2.2, 3.2, skin);
    fillEll(cx + rx + 0.5, hy + 2, 2.2, 3.2, shade);
    const jaw = o.jaw || 0.55;
    fillEll(cx, hy, rx, ry, skin, shade, (x, y) => {
      if (y < hy + 3) return true;
      const k = (y + 0.5 - hy - 3) / (ry - 3);
      return Math.abs(x + 0.5 - cx) <= rx * (1 - k * k * jaw) + 0.2;
    });
    // Features.
    const ey = hy + (o.eyeY || 0);
    const eye = (ex, look = 0) => {
      set(ex, ey - 1, 0x0f); set(ex + 1, ey - 1, 0x0f); set(ex + 2, ey - 1, 0x0f); set(ex - 1, ey, 0x0f);
      set(ex, ey, 0x30); set(ex + 1 + look, ey, o.iris || 0x02); set(ex + 2 + look, ey, 0x0f); if (!look) set(ex + 3, ey, 0x30);
      if (o.lashes) { set(ex - 1, ey - 1, 0x0f); set(ex + 3, ey - 1, 0x0f); set(ex + 4, ey - 2, 0x0f); set(ex - 2, ey - 2, 0x0f); }
    };
    eye(cx - 7); eye(cx + 3);
    const bc = o.brow === undefined ? (o.hairDark === undefined ? 0x08 : o.hairDark) : o.brow;
    for (let i = 0; i < 4; i++) { set(cx - 7 + i, ey - 3 - (o.browUp && i > 1 ? 1 : 0), bc); set(cx + 3 + i, ey - 3 - (o.browUp && i < 2 ? 1 : 0), bc); }
    if (o.heavyBrow) for (let i = -1; i < 5; i++) { set(cx - 7 + i, ey - 4, bc); set(cx + 3 + i, ey - 4, bc); }
    // Nose: a shaded right side and nostrils.
    for (let y = ey + 1; y < ey + 6; y++) set(cx + 1, y, shade);
    set(cx - 1, ey + 6, shade); set(cx + 2, ey + 6, shade); set(cx, ey + 6, skin);
    if (o.wideNose) { set(cx - 2, ey + 6, shade); set(cx + 3, ey + 6, shade); set(cx + 2, ey + 5, shade); }
    // Mouth.
    const my = ey + 9, lip = o.lips || 0x06;
    if (o.mouth === 'smile') {
      for (let i = -3; i <= 3; i++) set(cx + i, my, 0x0f);
      set(cx - 4, my - 1, 0x0f); set(cx + 4, my - 1, 0x0f);
      for (let i = -2; i <= 2; i++) set(cx + i, my + 1, 0x30);
      for (let i = -2; i <= 2; i++) set(cx + i, my + 2, 0x0f);
    } else if (o.mouth === 'lips') {
      for (let i = -3; i <= 3; i++) { set(cx + i, my, lip); }
      for (let i = -2; i <= 2; i++) set(cx + i, my + 1, o.lipsLow || 0x16);
      set(cx, my, 0x0f);
    } else if (o.mouth === 'hard') {
      for (let i = -4; i <= 4; i++) set(cx + i, my, 0x0f);
      set(cx - 4, my + 1, shade); set(cx + 4, my + 1, shade);
    } else if (o.mouth === 'open') {
      for (let i = -2; i <= 2; i++) set(cx + i, my, 0x0f);
      for (let i = -1; i <= 1; i++) { set(cx + i, my + 1, 0x06); set(cx + i, my + 2, 0x0f); }
    } else {
      for (let i = -3; i <= 3; i++) set(cx + i, my, i === 3 ? shade : 0x0f);
      set(cx - 1, my + 2, shade); set(cx, my + 2, shade);
    }
    // Hair.
    const hair = o.hair, hl = o.hairLight === undefined ? hair : o.hairLight, hd = o.hairDark === undefined ? hair : o.hairDark;
    if (o.style === 'slick') {
      fillEll(cx, hy - 3, rx + 1, ry - 2, hair, hd, (x, y) => y < hy - 7 || ((x < cx - rx + 2 || x > cx + rx - 2) && y < hy));
      // Brushed back from a side part, with a sheen.
      for (let x = cx - 3; x < cx + 8; x += 2) { set(x, hy - 13, hl); set(x + 1, hy - 11, hl); }
      for (let x = cx - 9; x < cx - 4; x += 2) set(x, hy - 10, hl);
      for (let y = hy - 14; y < hy - 7; y++) set(cx - 4, y, hd);
      set(cx + 4, hy - 7, hair); set(cx + 5, hy - 7, hair); set(cx - 8, hy - 7, hair);
    } else if (o.style === 'crop') {
      fillEll(cx, hy - 4, rx + 0.8, ry - 3.5, hair, hd, (x, y) => y < hy - 6 || ((x < cx - rx + 2 || x > cx + rx - 2) && y < hy - 2));
      for (let x = cx - rx + 2; x < cx + rx - 1; x += 3) set(x, hy - 12, hl);
    } else if (o.style === 'bob') {
      const len = o.bobLen === undefined ? 10 : o.bobLen;
      fillEll(cx, hy + 1, rx + 3.5, ry + 1, hair, hd, (x, y) => y < hy - 5 || (y < hy + len && (x < cx - rx + 1.5 || x > cx + rx - 1.5)) || (y >= hy + len && y < hy + len + 2 && (x < cx - rx + 0.5 || x > cx + rx - 0.5)));
      // A finger wave across the brow.
      for (let i = 0; i < 12; i++) set(cx - 9 + i, hy - 6 + Math.round(Math.sin(i / 1.6) * 1.2), hl);
      for (let i = 0; i < 6; i++) set(cx - rx - 2, hy + 2 + i, hl);
    } else if (o.style === 'bald') {
      fillEll(cx, hy - 1, rx + 1, ry - 1, hair, hd, (x, y) => (x < cx - rx + 2.5 || x > cx + rx - 2.5) && y > hy - 9 && y < hy + 4);
    } else if (o.style === 'short') {
      fillEll(cx, hy - 3, rx + 0.6, ry - 2.5, hair, hd, (x, y) => y < hy - 7 || ((x < cx - rx + 2 || x > cx + rx - 2) && y < hy - 2));
    }
    if (o.hat === 'boater') {
      rect(cx - 10, hy - 22, 21, 8, 0x38);
      for (let x = cx - 10; x < cx + 11; x++) for (let y = hy - 22; y < hy - 14; y++) if ((x + y) % 3 === 0) set(x, y, 0x28);
      rect(cx + 6, hy - 22, 5, 8, 0x28);
      rect(cx - 10, hy - 17, 21, 3, o.band || 0x16);
      fillEll(cx, hy - 13, 17, 2.4, 0x28, 0x18);
      for (let x = cx - 16; x < cx + 17; x++) set(x, hy - 11, 0x18);
    } else if (o.hat === 'cloche') {
      fillEll(cx, hy - 3, rx + 3, ry - 1, o.hatCol, o.hatShade, (x, y) => y < hy - 3);
      rect(cx - rx - 2, hy - 5, rx * 2 + 5, 2, o.hatBand || 0x02);
      for (let x = cx - rx - 3; x <= cx + rx + 3; x++) set(x, hy - 3, o.hatShade);
    }
    if (o.beard) {
      fillEll(cx, hy + 8, rx - 0.5, ry - 4, o.beard, o.beardDark, (x, y) => y > hy + 6 && !(y < hy + 10 && Math.abs(x + 0.5 - cx) < 3.2));
      for (let i = -4; i <= 4; i++) set(cx + i, my - 1, o.beard);
      for (let i = -2; i <= 2; i++) set(cx + i, my + 1, 0x0f);
    }
    if (o.specs) {
      const ring = (ex) => { for (let a = 0; a < 40; a++) { const t = a / 40 * Math.PI * 2; set(ex + Math.cos(t) * o.specs, ey + Math.sin(t) * o.specs, o.specCol || 0x0f); } };
      ring(cx - 5.5); ring(cx + 4.5);
      set(cx - 1, ey - 1, o.specCol || 0x0f); set(cx, ey - 1, o.specCol || 0x0f);
      for (let x = cx - rx; x < cx - 5.5 - o.specs; x++) set(x, ey - 1, o.specCol || 0x0f);
      for (let x = cx + 4.5 + o.specs; x < cx + rx; x++) set(x, ey - 1, o.specCol || 0x0f);
      // The lenses catch the light.
      set(cx - 8, ey - 3, 0x30); set(cx + 2, ey - 3, 0x30);
    }
    // Outline everything against the empty.
    const out = new Int16Array(pix);
    for (let y = 0; y < Hh; y++) for (let x = 0; x < W; x++) {
      if (get(x, y) !== -1) continue;
      if (get(x - 1, y) > -1 || get(x + 1, y) > -1 || get(x, y - 1) > -1 || get(x, y + 1) > -1) out[y * W + x] = 0x0f;
    }
    const c = canvas(W, Hh), g = c.getContext('2d');
    for (let y = 0; y < Hh; y++) for (let x = 0; x < W; x++) { const v = out[y * W + x]; if (v > -1) px(g, x, y, v); }
    return c;
  }

  const SITTERS = {
    nick: { hat: 'boater', style: 'short', hair: 0x08, hairLight: 0x18, hairDark: 0x0f, coat: 0x02, coatShade: 0x0c, lapel: 0x12, tie: 0x16, iris: 0x02 },
    gatsby: { style: 'slick', hair: 0x18, hairLight: 0x28, hairDark: 0x08, coat: 0x25, coatShade: 0x15, lapel: 0x35, tie: 0x28, mouth: 'smile', skin: 0x37, shade: 0x27, iris: 0x02 },
    gatsbyWhite: { style: 'slick', hair: 0x18, hairLight: 0x28, hairDark: 0x08, coat: 0x30, coatShade: 0x10, lapel: 0x20, shirt: 0x10, tie: 0x28, mouth: 'smile', skin: 0x37, shade: 0x27 },
    daisy: { style: 'bob', hair: 0x08, hairLight: 0x18, hairDark: 0x0f, coat: 0x30, coatShade: 0x10, neckline: true, pearls: true, mouth: 'lips', lips: 0x16, lipsLow: 0x06, lashes: true, iris: 0x12, rx: 9.8, neck: 7, shoulders: 22 },
    jordan: { style: 'bob', bobLen: 3, hair: 0x07, hairLight: 0x17, hairDark: 0x0f, coat: 0x30, coatShade: 0x10, neckline: true, mouth: 'lips', lips: 0x06, lipsLow: 0x17, skin: 0x37, shade: 0x27, lashes: true, iris: 0x00, rx: 9.6, neck: 7, shoulders: 21 },
    tom: { style: 'crop', hair: 0x38, hairLight: 0x30, hairDark: 0x28, coat: 0x18, coatShade: 0x08, lapel: 0x28, tie: 0x0c, mouth: 'hard', jaw: 0.25, rx: 11.5, neck: 12, shoulders: 29, iris: 0x00, browUp: false, heavyBrow: true },
    wolfsheim: { style: 'bald', hair: 0x10, hairDark: 0x00, coat: 0x00, coatShade: 0x0f, lapel: 0x10, tie: 0x05, rx: 12.2, ry: 13.5, shoulders: 20, neck: 9, heavyBrow: true, brow: 0x00, wideNose: true, iris: 0x08, mouth: 'flat' },
    owleyes: { style: 'short', hair: 0x08, hairDark: 0x0f, coat: 0x0f, coatShade: 0x0f, lapel: 0x00, tie: 0x0f, rx: 12, ry: 13, jaw: 0.3, shoulders: 27, specs: 5.2, specCol: 0x08, mouth: 'open', iris: 0x08 },
    gatz: { style: 'short', hair: 0x10, hairLight: 0x30, hairDark: 0x00, beard: 0x10, beardDark: 0x00, coat: 0x08, coatShade: 0x0f, lapel: 0x18, tie: 0x0f, shirt: 0x10, skin: 0x36, shade: 0x27, iris: 0x00, browUp: true, brow: 0x10 },
  };
  const PORTRAITS = {};
  function face(name) { return PORTRAITS[name] || (PORTRAITS[name] = portrait(SITTERS[name])); }
  GG.cinePortrait = face;

  /* A talking-head panel: a backdrop and the bust at the bottom centre. */
  function talk(name, sitter, backdrop, anim) {
    panel(name, (g) => { backdrop(g); g.drawImage(face(sitter), 84, 56); vignette(g, 0x0f, 8); }, anim);
  }

  /* ------------------------------------------------------- backdrops */
  const duskSky = (g) => { sky(g, [[0x02, 0], [0x03, 30, 12], [0x13, 54, 10], [0x24, 70, 6], [0x37, 78, 4]]); stars(g, PW, 40, 3, 18, [0x30, 0x23]); };
  const nightSky = (g, seed = 9) => { sky(g, [[0x0f, 0], [0x01, 26, 16], [0x02, 56, 12], [0x0c, 74, 8]]); stars(g, PW, 64, seed, 46, [0x30, 0x10, 0x31, 0x21]); };
  const daySky = (g) => { sky(g, [[0x11, 0], [0x21, 34, 14], [0x31, 62, 10]]); };
  function clouds(g, seed, y0, y1, n, col = 0x30, shade = 0x31) {
    const r = GG.rng(seed);
    for (let i = 0; i < n; i++) {
      const cx = Math.floor(r() * PW), cy = y0 + Math.floor(r() * (y1 - y0)), w = 14 + Math.floor(r() * 26);
      for (let k = 0; k < 4; k++) { const ex = cx + (k - 1.5) * w / 4, rr = 4 + ((k * 7 + i) % 4); for (let y = -rr; y <= rr; y++) for (let x = -rr * 1.4; x <= rr * 1.4; x++) if ((x / 1.4) ** 2 + y * y <= rr * rr && cy + y < cy + 3) px(g, ex + x, cy + y, y > 0 ? shade : col); }
    }
  }
  function roomWall(g, base, line, stripe = 8) {
    for (let y = 0; y < PH; y++) for (let x = 0; x < PW; x++) px(g, x, y, x % stripe === 0 ? line : base);
  }
  function bookcase(g, x0, y0, w, h, seed) {
    const r = GG.rng(seed);
    px(g, x0, y0, 0x08, w, h);
    for (let sy = y0 + 3; sy < y0 + h - 4; sy += 14) {
      let x = x0 + 3;
      while (x < x0 + w - 4) {
        const bw = 2 + Math.floor(r() * 3), bh = 8 + Math.floor(r() * 4);
        const col = [0x06, 0x16, 0x0c, 0x08, 0x18, 0x0a, 0x00][Math.floor(r() * 7)];
        px(g, x, sy + 11 - bh, col, bw, bh); if (r() < 0.5) px(g, x, sy + 13 - bh, 0x28, bw, 1);
        x += bw + (r() < 0.15 ? 2 : 0);
      }
      px(g, x0, sy + 11, 0x18, w, 2);
    }
  }

  /* ------------------------------------------------------ talking heads */
  talk('nickTalk', 'nick', (g) => {
    duskSky(g);
    water(g, 82, 30, 0x0c, 0x13, 0, 3);
    gatsbyHouse(g, 140, 58, 70, 26, { lit: 0x38, litAmt: 0.5, seed: 3 });
  });
  talk('gatsbyTalk', 'gatsby', (g) => {
    nightSky(g, 21);
    gatsbyHouse(g, 4, 50, 110, 40, { allLit: true, seed: 8 });
    lawn(g, 90, 0x0c, 0x01, 4);
  }, (g, t) => {
    for (let i = 0; i < 18; i++) { const x = (i * 29) % PW, y = 20 + ((i * 13) % 26); if ((i + Math.floor(t / 14)) % 3) px(g, x, y + Math.round(Math.sin(x / 20) * 3), [0x26, 0x28, 0x2a, 0x21, 0x24][i % 5], 2, 2); }
  });
  talk('gatsbyWhiteTalk', 'gatsbyWhite', (g) => {
    nightSky(g, 22);
    gatsbyHouse(g, 120, 50, 100, 40, { allLit: true, seed: 9 });
    lawn(g, 90, 0x0c, 0x01, 6);
  });
  talk('daisyTalk', 'daisy', (g) => {
    roomWall(g, 0x35, 0x34, 12);
    for (const wx of [10, 168]) { px(g, wx, 10, 0x30, 46, 80); px(g, wx + 3, 13, 0x31, 40, 74); px(g, wx + 23, 13, 0x30, 2, 74); }
    px(g, 0, 92, 0x05, PW, 20);
  }, (g, t) => {
    for (const wx of [8, 166]) for (let y = 6; y < 92; y++) { const w = 6 + Math.round(Math.sin(y / 9 + t / 12) * 4); px(g, wx + 2, y, 0x30, w, 1); px(g, wx + 46 - w, y, 0x30, w, 1); }
  });
  talk('jordanTalk', 'jordan', (g) => {
    daySky(g); clouds(g, 31, 10, 40, 4);
    hedge(g, 70, 0x1a, 0x2a, 4, 8);
    px(g, 0, 84, 0x2a, PW, 28);
    px(g, 182, 52, 0x30, 1, 34); px(g, 183, 52, 0x16, 9, 6);
  });
  talk('tomTalk', 'tom', (g) => {
    daySky(g);
    georgian(g, -10, 30, 250, 70);
  });
  talk('wolfsheimTalk', 'wolfsheim', (g) => {
    for (let y = 0; y < PH; y++) for (let x = 0; x < PW; x++) px(g, x, y, (y % 6 === 5 || (x + (Math.floor(y / 6) % 2) * 6) % 12 === 0) ? 0x0f : 0x07);
    glow(g, 112, 20, 60, 0x17, 0.4);
    px(g, 0, 96, 0x30, PW, 16);
  }, (g, t) => {
    const a = Math.floor(t / 3) % 2;
    px(g, 30, 4, 0x0f, 1, 6);
    px(g, a ? 18 : 24, 10, 0x00, a ? 26 : 14, 2); px(g, 28, 9, 0x10, 5, 3);
    px(g, 190, 4, 0x0f, 1, 6);
    px(g, a ? 184 : 178, 10, 0x00, a ? 14 : 26, 2); px(g, 188, 9, 0x10, 5, 3);
  });
  talk('owlTalk', 'owleyes', (g) => {
    px(g, 0, 0, 0x08, PW, PH);
    bookcase(g, 0, 0, 80, PH, 3); bookcase(g, 144, 0, 80, PH, 4);
    for (let x = 80; x < 144; x += 8) px(g, x, 0, 0x07, 1, PH);
    for (let i = 0; i < 12; i++) px(g, 80 + i * 2, 0, 0x18, 64 - i * 4, 1);
  });
  talk('gatzTalk', 'gatz', (g) => {
    sky(g, [[0x00, 0], [0x10, 50, 20]]);
    px(g, 20, 8, 0x08, 90, 92); px(g, 24, 12, 0x2d, 82, 84); px(g, 64, 12, 0x08, 2, 84); px(g, 24, 52, 0x08, 82, 2);
  }, (g, t) => rainIn(g, t, 24, 12, 82, 84, 40, 0x10));

  /* --------------------------------------------------------- chapter I */
  panel('westegg', (g) => {
    duskSky(g);
    water(g, 74, 14, 0x0c, 0x13, 0, 2);
    // Far East Egg, across the courtesy bay.
    for (let i = 0; i < 6; i++) px(g, 8 + i * 36, 70 - (i % 3), 0x23, 14, 4);
    lawn(g, 86, 0x0a, 0x1a, 2);
    gatsbyHouse(g, 86, 40, 120, 46, { lit: 0x38, litAmt: 0.25, seed: 4 });
    cottage(g, 22, 70, { wall: 0x2d, roof: 0x07, win: 0x28 });
    hedge(g, 86, 0x0a, 0x1a, 7, 4, 0, 80);
  });
  panel('bookshelf', (g) => {
    roomWall(g, 0x0c, 0x01, 10);
    px(g, 0, 90, 0x07, PW, 22);
    px(g, 30, 40, 0x08, 164, 4); px(g, 30, 44, 0x07, 164, 2);
    const r = GG.rng(12);
    let x = 40;
    for (let i = 0; i < 12; i++) {
      const w = 9 + Math.floor(r() * 3), h = 28 + Math.floor(r() * 6);
      px(g, x, 40 - h, 0x0f, w + 1, h); px(g, x, 40 - h, i % 3 === 2 ? 0x05 : 0x16, w, h);
      px(g, x + 1, 40 - h + 4, 0x28, w - 2, 2); px(g, x + 1, 40 - h + h - 8, 0x28, w - 2, 2);
      px(g, x + 3, 40 - h + 12, 0x38, w - 6, 4);
      x += w + 2;
    }
    // A lamp on the desk below.
    px(g, 150, 70, 0x18, 22, 10); px(g, 159, 80, 0x08, 4, 10); px(g, 150, 90, 0x08, 22, 2);
    glow(g, 161, 82, 34, 0x28, 0.35);
  });
  panel('acrossbay', (g) => {
    duskSky(g);
    water(g, 70, 42, 0x0c, 0x13, 0, 5);
    for (let i = 0; i < 7; i++) { const x = 6 + i * 32, w = 18 + (i % 3) * 4; px(g, x, 58 - (i % 2) * 4, 0x30, w, 12 + (i % 2) * 4); px(g, x - 1, 57 - (i % 2) * 4, 0x10, w + 2, 1); }
    hedge(g, 70, 0x0c, 0x01, 8, 4);
  }, (g, t) => {
    for (let i = 0; i < 7; i++) for (let k = 0; k < 3; k++) {
      const on = ((i * 5 + k * 3 + Math.floor(t / 20)) % 7) > 1;
      if (on) px(g, 9 + i * 32 + k * 5, 62 - (i % 2) * 2, 0x38, 2, 2);
    }
    for (let i = 0; i < 7; i++) px(g, 10 + i * 32 + ((t >> 3) % 3), 74 + (i % 3) * 3, 0x30, 6, 1);
  });

  panel('buchanans', (g) => {
    daySky(g); clouds(g, 5, 4, 26, 5);
    hedge(g, 44, 0x0a, 0x1a, 3, 6);
    georgian(g, 64, 30, 110, 40);
    // The lawn runs down toward the beach, past sun-dials and brick walks.
    for (let y = 70; y < PH; y++) for (let x = 0; x < PW; x++) px(g, x, y, (B(x, y) < 0.2) ? 0x1a : 0x2a);
    // Brick walks winding down, and burning gardens beside them.
    for (let y = 70; y < PH; y++) { const w = 6 + (y - 70) / 3, x = 118 + Math.sin((y - 70) / 9) * (y - 60) * 0.6 - w / 2; px(g, x, y, (y % 3 === 0) ? 0x06 : 0x16, w, 1); }
    for (let i = 0; i < 2; i++) { const y = 82 + i * 16; px(g, 0, y, 0x16, 90, 2); px(g, 0, y + 2, 0x06, 90, 1); px(g, 150, y + 4, 0x16, 74, 2); px(g, 150, y + 6, 0x06, 74, 1); }
    for (const [x, y] of [[30, 84], [190, 90], [120, 104]]) { px(g, x, y - 8, 0x10, 4, 8); px(g, x - 2, y - 9, 0x30, 8, 2); }
    for (let i = 0; i < 40; i++) { const x = (i * 37) % PW, y = 98 + (i * 11) % 12; px(g, x, y, [0x16, 0x27, 0x28, 0x26][i % 4], 2, 2); }
    fig(g, 118, 70, { coat: 0x18, legs: 0x08, hair: 0x38, shoes: 0x08 });
  });
  panel('lawn', (g) => {
    daySky(g); clouds(g, 7, 6, 30, 4);
    georgian(g, 150, 20, 90, 44);
    // A long green slope rising left to right.
    for (let x = 0; x < PW; x++) {
      const top = Math.round(96 - x * 0.18);
      for (let y = top; y < PH; y++) px(g, x, y, y === top ? 0x3a : (B(x, y) < 0.15 ? 0x1a : 0x2a));
    }
    const at = (x) => Math.round(96 - x * 0.18);
    for (const x of [40, 104]) { px(g, x, at(x) - 4, 0x16, 26, 4); px(g, x, at(x) - 4, 0x26, 26, 1); }
    px(g, 76, at(76) - 10, 0x10, 5, 10); px(g, 73, at(76) - 12, 0x30, 11, 2); px(g, 78, at(76) - 15, 0x0f, 1, 3);
    for (let i = 0; i < 14; i++) px(g, 140 + i * 3, at(140 + i * 3) - 3 - (i % 2), [0x16, 0x27, 0x28][i % 3], 2, 3);
  }, (g, t) => {
    // Nick, leaping the sun-dial, over and over.
    const k = (t % 120) / 120, x = 20 + k * 120;
    const ground = Math.round(96 - (x + 8) * 0.18);
    const hop = Math.abs(Math.sin(k * Math.PI * 3)) * 18;
    spr(g, 'nick', hop > 2 ? 'jump' : ['run1', 'run2', 'run3', 'run2'][Math.floor(t / 6) % 4], x, ground - 23 - hop);
  });
  panel('couch', (g) => {
    roomWall(g, 0x35, 0x34, 12);
    // "A bright rosy-colored space, fragilely bound into the house by French
    // windows at either end." Outside, the fresh grass.
    for (const wx of [12, 168]) {
      px(g, wx - 2, 8, 0x30, 48, 78);
      px(g, wx, 10, 0x21, 44, 50); px(g, wx, 60, 0x2a, 44, 24); px(g, wx, 58, 0x3a, 44, 2);
      for (let y = 10; y < 84; y += 12) px(g, wx, y, 0x30, 44, 1);
      px(g, wx + 21, 10, 0x30, 2, 74);
    }
    // The wine-colored rug.
    px(g, 0, 86, 0x05, PW, 26); for (let x = 0; x < PW; x++) for (let y = 87; y < PH; y += 5) if (B(x, y) < 0.3) px(g, x, y, 0x15);
    // The enormous couch: back, arms, cushions.
    px(g, 56, 52, 0x0f, 112, 34);
    px(g, 58, 54, 0x0c, 108, 14); px(g, 58, 54, 0x1c, 108, 2);
    for (let i = 0; i < 4; i++) px(g, 60 + i * 27, 56, 0x0f, 1, 12);
    px(g, 58, 68, 0x1c, 108, 10); px(g, 58, 76, 0x0c, 108, 3); px(g, 112, 68, 0x0c, 1, 10);
    px(g, 52, 60, 0x0f, 14, 28); px(g, 53, 61, 0x1c, 12, 22); px(g, 53, 80, 0x0c, 12, 3);
    px(g, 158, 60, 0x0f, 14, 28); px(g, 159, 61, 0x1c, 12, 22); px(g, 159, 80, 0x0c, 12, 3);
    px(g, 60, 82, 0x0f, 3, 6); px(g, 161, 82, 0x0f, 3, 6);
  }, (g, t) => {
    // Curtains blown in at one end and out the other "like pale flags".
    for (const [wx, dir] of [[10, 1], [166, -1]]) for (let y = 6; y < 86; y++) {
      const w = 4 + Math.round((Math.sin(y / 8 + t / 10 * dir) + 1) * 4 + (y / 86) * 4);
      if (dir > 0) px(g, wx, y, 0x30, w, 1); else px(g, wx + 48 - w, y, 0x30, w, 1);
      if (dir > 0) px(g, wx + w, y, 0x10, 1, 1); else px(g, wx + 47 - w, y, 0x10, 1, 1);
    }
    // Two young women in white, their dresses "rippling and fluttering".
    const bob = Math.round(Math.sin(t / 30) * 1.5);
    for (const [x, hair] of [[88, 0x08], [134, 0x07]]) {
      for (let y = 0; y < 16; y++) {
        const w = 14 + Math.round(Math.sin(y / 2 + t / 5 + x) * 1.5) + Math.floor(y / 4);
        px(g, x - w / 2, 56 + y + bob, y % 5 === 0 ? 0x10 : 0x30, w, 1);
      }
      px(g, x - 3, 44 + bob, 0x36, 7, 8); px(g, x + 2, 46 + bob, 0x27, 1, 5);
      px(g, x - 4, 42 + bob, hair, 9, 3); px(g, x - 4, 45 + bob, hair, 2, 5); px(g, x + 4, 45 + bob, hair, 1, 4);
      px(g, x - 1, 46 + bob, 0x0f, 1, 1); px(g, x + 2, 46 + bob, 0x0f, 1, 1); px(g, x, 49 + bob, 0x16, 2, 1);
      px(g, x - 2, 52 + bob, 0x36, 5, 4);
      px(g, x - 9, 60 + bob, 0x36, 2, 6); px(g, x + 8, 60 + bob, 0x36, 2, 6);
    }
  });
  panel('greenlight', (g) => {
    nightSky(g, 13);
    // The far shore: a dark line of trees, a dock reaching out, a few lights.
    hedge(g, 58, 0x0f, 0x01, 21, 4);
    for (let i = 0; i < 9; i++) px(g, 10 + i * 19, 59, 0x18, 1, 1);
    water(g, 62, 26, 0x02, 0x01, 0, 12);
    // Gatsby's lawn, black-green, with a balustrade and a clipped tree.
    for (let x = 0; x < PW; x++) { const top = 86 + Math.round(Math.sin(x / 30) * 2); px(g, x, top, 0x0f, 1, PH - top); if (B(x, top) < 0.5) px(g, x, top, 0x0b, 1, 1); }
    for (let x = 120; x < PW; x += 6) { px(g, x, 80, 0x0f, 3, 8); }
    px(g, 118, 78, 0x0f, PW - 118, 3);
    for (let y = 0; y < 30; y++) { const w = Math.round(Math.sin(y / 30 * Math.PI) * 9); px(g, 14 - w, 54 + y, 0x0f, w * 2 + 1, 1); }
    px(g, 13, 82, 0x0f, 3, 8);
  }, (g, t) => {
    const on = greenLight(g, 200, 60, t);
    if (on) greenTrail(g, 200, 64, 86, t);
    // "He stretched out his arms toward the dark water in a curious way."
    const sh = t % 46 < 3 ? 1 : 0;
    const x = 64 + sh, y = 96;
    const S = (dx, dy, w, h) => px(g, x + dx, y + dy, 0x0f, w, h);
    S(-3, -9, 2, 9); S(1, -9, 2, 9);            // legs
    S(-3, -20, 6, 11);                           // coat
    S(-2, -25, 4, 5); S(-2, -26, 4, 1);          // head
    S(3, -19, 9, 2); S(11, -20, 3, 2);           // arms out toward the light
    S(-2, -18, 1, 2);
    if (on) { px(g, x + 2, y - 25, 0x0b, 1, 4); px(g, x + 3, y - 20, 0x0b, 1, 9); px(g, x + 3, y - 19, 0x0b, 10, 1); }
  });

  /* -------------------------------------------------------- chapter II */
  const ashSky = (g) => sky(g, [[0x00, 0], [0x10, 36, 14], [0x2d, 62, 6], [0x10, 70, 4]]);
  function ashHills(g, y, seed, col, light) {
    const r = GG.rng(seed);
    let top = y;
    for (let x = 0; x < PW; x++) {
      top += (r() - 0.5) * 3; top = Math.max(y - 14, Math.min(y + 4, top));
      px(g, x, Math.round(top), light); px(g, x, Math.round(top) + 1, col, 1, PH);
    }
  }
  function ashMan(g, x, y, col = 0x2d, spade = true) {
    px(g, x - 1, y - 13, col, 3, 3); px(g, x - 2, y - 10, col, 5, 6); px(g, x - 2, y - 4, col, 2, 4); px(g, x + 1, y - 4, col, 2, 4);
    if (spade) { px(g, x + 3, y - 14, 0x0f, 1, 12); px(g, x + 2, y - 3, 0x0f, 3, 3); }
  }
  /* The billboard. pupils: offset of the pupils in the irises. */
  function billboard(g, x, y, w, h, look = 0, lookY = 0, blink = 0) {
    px(g, x - 2, y - 2, 0x08, w + 4, h + 4);
    px(g, x, y, 0x2d, w, h);
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) if (B(xx * 3, yy * 2) < 0.28) px(g, xx, yy, 0x10);
    // Weathered paint.
    const r = GG.rng(77);
    for (let i = 0; i < 30; i++) px(g, x + r() * w, y + r() * h, 0x00, 1 + Math.floor(r() * 4), 1);
    const ex = [x + w * 0.3, x + w * 0.7], ey = y + h * 0.5, R = Math.min(w * 0.16, h * 0.38);
    // Spectacles: two great yellow rims and a bridge, over a nonexistent nose.
    for (const cx of ex) {
      disc(g, cx, ey, Math.round(R + 4), 0x18);
      disc(g, cx, ey, Math.round(R + 3), 0x28);
      disc(g, cx, ey, Math.round(R + 1), 0x0f);
      disc(g, cx, ey, Math.round(R), 0x30);
      for (let yy = -R; yy <= R; yy++) for (let xx = -R; xx <= R; xx++) if (xx * xx + yy * yy <= R * R && yy > R * 0.3 && B(cx + xx, ey + yy) < 0.5) px(g, cx + xx, ey + yy, 0x10);
    }
    px(g, ex[0] + R + 2, ey - 3, 0x28, ex[1] - ex[0] - 2 * R - 4, 3); px(g, ex[0] + R + 2, ey - 1, 0x18, ex[1] - ex[0] - 2 * R - 4, 1);
    px(g, x + 2, ey - 3, 0x28, ex[0] - R - x - 4, 2); px(g, ex[1] + R + 2, ey - 3, 0x28, x + w - ex[1] - R - 4, 2);
    for (const cx of ex) {
      const ir = Math.round(R * 0.55), ix = cx + look * R * 0.35, iy = ey + lookY * R * 0.25;
      disc(g, ix, iy, ir, 0x01); disc(g, ix, iy, ir - 1, 0x11);
      for (let yy = -ir; yy <= ir; yy++) for (let xx = -ir; xx <= ir; xx++) if (xx * xx + yy * yy <= ir * ir && xx + yy > ir * 0.4 && B(ix + xx, iy + yy) < 0.5) px(g, ix + xx, iy + yy, 0x01);
      disc(g, ix, iy, Math.max(1, Math.round(ir * 0.42)), 0x0f);
      px(g, ix - Math.round(ir * 0.5), iy - Math.round(ir * 0.5), 0x30, 2, 2);
      // Lid line and lashes.
      for (let a = 0; a < 30; a++) { const th = Math.PI + a / 30 * Math.PI; px(g, cx + Math.cos(th) * R, ey + Math.sin(th) * R, 0x0f); }
      if (blink > 0) px(g, cx - R, ey - R, 0x2d, R * 2 + 1, Math.round(R * 2 * blink));
    }
  }
  panel('ashes', (g) => {
    ashSky(g);
    // Smoke stacks and the faint city.
    for (let i = 0; i < 9; i++) px(g, 6 + i * 26, 50 - (i % 3) * 6, 0x00, 8, 30);
    ashHills(g, 66, 3, 0x00, 0x2d);
    ashHills(g, 84, 8, 0x10, 0x30);
    for (const [x, y] of [[40, 96], [70, 100], [150, 94], [176, 102]]) ashMan(g, x, y);
    // A line of grey cars on the invisible track.
    for (let i = 0; i < 4; i++) { px(g, 96 + i * 18, 80, 0x00, 15, 7); px(g, 98 + i * 18, 87, 0x0f, 3, 2); px(g, 107 + i * 18, 87, 0x0f, 3, 2); }
  }, (g, t) => {
    for (let i = 0; i < 40; i++) { const x = (i * 41 + t * 0.4) % PW, y = 60 + ((i * 17 + t * 0.2) % 52); if (B(x, y) < 0.6) px(g, x, y, 0x30); }
  });
  panel('eyes', (g) => {
    ashSky(g);
    ashHills(g, 96, 6, 0x00, 0x2d);
    px(g, 40, 76, 0x08, 3, 30); px(g, 180, 76, 0x08, 3, 30);
  }, (g, t) => {
    const look = Math.sin(t / 60) * 0.6;
    billboard(g, 12, 8, 200, 74, look, 0.2);
    for (let i = 0; i < 25; i++) { const x = (i * 41 + t * 0.4) % PW, y = 70 + ((i * 17 + t * 0.2) % 42); if (B(x, y) < 0.6) px(g, x, y, 0x30); }
  });
  panel('eyesLook', (g) => {
    ashSky(g);
  }, (g, t) => {
    // They turn, slowly, and settle on you.
    const k = Math.min(1, t / 70);
    const look = -0.9 + k * 0.9, lookY = -0.6 + k * 0.6;
    const blink = t > 90 && t < 98 ? (t < 94 ? (t - 90) / 4 : (98 - t) / 4) : 0;
    billboard(g, 2, 4, 220, 104, look, lookY, blink);
  });
  panel('train', (g) => {
    ashSky(g);
    ashHills(g, 70, 11, 0x00, 0x2d);
    // The drawbridge, raised, and a barge on the foul river.
    px(g, 150, 30, 0x08, 6, 50); px(g, 156, 30, 0x18, 2, 50);
    for (let i = 0; i < 40; i++) px(g, 156 + i * 0.6, 30 + i, 0x08, 2, 1);
    water(g, 82, 30, 0x0c, 0x00, 0, 4);
    px(g, 170, 76, 0x07, 40, 6); px(g, 174, 72, 0x08, 10, 4);
    // The train, waiting.
    px(g, 0, 78, 0x0f, 148, 2);
    for (let i = 0; i < 3; i++) {
      const x = 4 + i * 48;
      px(g, x, 56, 0x0c, 44, 22); px(g, x, 56, 0x1c, 44, 2); px(g, x + 2, 76, 0x0f, 40, 2);
      for (let k = 0; k < 6; k++) px(g, x + 3 + k * 7, 61, 0x38, 5, 6);
    }
    fig(g, 122, 78, { coat: 0x18, legs: 0x08, hair: 0x38 }); fig(g, 132, 78, { coat: 0x02, legs: 0x30, hat: 'boater' });
  });
  panel('garage', (g) => {
    ashSky(g);
    ashHills(g, 84, 9, 0x00, 0x2d);
    // "A small block of yellow brick sitting on the edge of the waste land."
    for (let y = 30; y < 92; y++) for (let x = 30; x < 160; x++) px(g, x, y, (y % 4 === 3 || (x + (Math.floor(y / 4) % 2) * 3) % 7 === 0) ? 0x18 : 0x28);
    px(g, 28, 28, 0x08, 134, 3);
    px(g, 44, 34, 0x30, 70, 12); GG.text(g, 'REPAIRS', 50, 36, 0x0f);
    px(g, 60, 54, 0x0f, 46, 38); px(g, 62, 56, 0x00, 42, 36);
    px(g, 124, 52, 0x2d, 22, 18); px(g, 125, 53, 0x10, 20, 16);
    // A gas pump, and the dusty wreck of a Ford inside.
    px(g, 174, 68, 0x16, 8, 24); px(g, 173, 62, 0x30, 10, 6); px(g, 175, 74, 0x30, 4, 4);
    px(g, 66, 80, 0x0c, 30, 8); px(g, 68, 88, 0x0f, 6, 4); px(g, 86, 88, 0x0f, 6, 4);
    fig(g, 116, 92, { coat: 0x2d, legs: 0x2d, hair: 0x38 });
    fig(g, 134, 92, { dress: true, coat: 0x02, hair: 0x08 });
  });
  panel('apartment', (g) => {
    roomWall(g, 0x12, 0x11, 9);
    // Tapestried furniture too large for the room, a window on the city.
    px(g, 150, 10, 0x0f, 60, 50); px(g, 152, 12, 0x02, 56, 46); for (let i = 0; i < 14; i++) px(g, 154 + (i * 13) % 52, 20 + (i * 7) % 34, 0x38, 2, 2);
    px(g, 0, 90, 0x08, PW, 22);
    px(g, 20, 64, 0x0f, 70, 26); px(g, 22, 66, 0x26, 66, 22); for (let i = 0; i < 6; i++) px(g, 26 + i * 11, 70, 0x24, 6, 10);
    px(g, 110, 72, 0x08, 36, 4); px(g, 112, 76, 0x08, 2, 14); px(g, 142, 76, 0x08, 2, 14);
    px(g, 120, 66, 0x30, 4, 6); px(g, 130, 68, 0x2a, 3, 4);
    fig(g, 40, 90, { dress: true, coat: 0x23, hair: 0x08, s: 2 });
    fig(g, 100, 90, { coat: 0x18, legs: 0x08, hair: 0x38, s: 2 });
    fig(g, 170, 90, { coat: 0x02, legs: 0x30, hat: 'boater', s: 2 });
  }, (g, t) => {
    for (let i = 0; i < 30; i++) { const x = (i * 37 + t * 0.3) % PW, y = 10 + ((i * 23 - t * 0.2) % 60 + 60) % 60; if (B(x, y) < 0.4) px(g, x, y, 0x10); }
  });

  /* ------------------------------------------------------- chapter III */
  function stringLights(g, t, y0, sag, n, x0 = 0, x1 = PW) {
    const cols = [0x26, 0x28, 0x2a, 0x21, 0x24, 0x30];
    for (let x = x0; x < x1; x++) { const y = y0 + Math.round(Math.sin(((x - x0) / (x1 - x0)) * Math.PI * n) ** 2 * sag); px(g, x, y, 0x0f); }
    for (let i = 0; i < (x1 - x0) / 9; i++) {
      const x = x0 + 4 + i * 9, y = y0 + Math.round(Math.sin(((x - x0) / (x1 - x0)) * Math.PI * n) ** 2 * sag) + 1;
      const on = (i + Math.floor(t / 16)) % 5 !== 0;
      px(g, x, y, on ? cols[i % cols.length] : 0x00, 2, 2);
    }
  }
  function couple(g, x, y, k, a, b) {
    // Two dancers: he in black, she in a short beaded dress.
    const sw = k % 2 ? 1 : -1;
    fig(g, x, y, { coat: 0x0f, legs: 0x0f, hair: 0x08 });
    fig(g, x + 5 + sw, y, { dress: true, coat: a, hair: b });
    px(g, x + 2, y - 9, 0x0f, 3, 1);
  }
  panel('party', (g) => {
    nightSky(g, 33);
    gatsbyHouse(g, 30, 30, 170, 44, { allLit: true, seed: 2, glow: 0x28 });
    // The blue gardens.
    for (let y = 74; y < PH; y++) for (let x = 0; x < PW; x++) px(g, x, y, B(x, y) < 0.25 ? 0x01 : 0x0c);
    // The orchestra stand, "no thin five-piece affair".
    px(g, 4, 76, 0x30, 56, 3); px(g, 6, 79, 0x10, 52, 12);
    for (let i = 0; i < 7; i++) { fig(g, 10 + i * 7, 76, { coat: 0x0f, legs: 0x0f }); px(g, 12 + i * 7, 66 + (i % 2) * 2, 0x28, 2, 3); }
    // A buffet and a tower of champagne glasses.
    px(g, 168, 90, 0x30, 50, 3); px(g, 170, 93, 0x10, 2, 12); px(g, 214, 93, 0x10, 2, 12);
    for (let r = 0; r < 4; r++) for (let i = 0; i <= r; i++) { const x = 193 - r * 3 + i * 6, y = 74 + r * 4; px(g, x, y, 0x38, 4, 2); px(g, x + 1, y + 2, 0x30, 1, 2); }
  }, (g, t) => {
    stringLights(g, t, 22, 10, 3);
    const k = Math.floor(t / 10);
    const cols = [[0x16, 0x0f], [0x28, 0x08], [0x30, 0x08], [0x2a, 0x38], [0x24, 0x0f]];
    for (let i = 0; i < 5; i++) couple(g, 70 + i * 20 + (k + i) % 2, 100 + (i % 2) * 6, k + i, cols[i][0], cols[i][1]);
  });
  panel('oranges', (g) => {
    roomWall(g, 0x30, 0x10, 16);
    px(g, 0, 84, 0x08, PW, 28);
    // Crates in from New York, and "a pyramid of pulpless halves".
    for (let c = 0; c < 3; c++) for (let rr = 0; rr < 2; rr++) {
      const x = 8 + c * 34, y = 52 + rr * 16;
      px(g, x, y, 0x18, 30, 15); px(g, x, y, 0x08, 30, 1); px(g, x, y + 7, 0x08, 30, 1);
      for (let i = 0; i < 5; i++) { px(g, x + 2 + i * 6, y - 3, (c + rr + i) % 3 ? 0x27 : 0x28, 4, 4); }
    }
    for (let r = 0; r < 6; r++) for (let i = 0; i <= r; i++) { const x = 176 - r * 4 + i * 8, y = 60 + r * 5; px(g, x, y, 0x37, 6, 3); px(g, x + 1, y, 0x27, 4, 1); }
    // The machine: two hundred oranges in half an hour, by a butler's thumb.
    px(g, 120, 40, 0x00, 26, 44); px(g, 122, 42, 0x10, 22, 20); px(g, 126, 62, 0x30, 14, 4); px(g, 130, 66, 0x10, 6, 10);
    px(g, 124, 76, 0x30, 18, 6); px(g, 125, 77, 0x28, 16, 4);
  }, (g, t) => {
    const down = Math.floor(t / 8) % 2;
    px(g, 128, 34 + down * 2, 0x16, 6, 3);
    px(g, 127, 26 + down * 2, 0x36, 7, 8); px(g, 126, 22 + down * 2, 0x30, 9, 5);
    if (down) for (let i = 0; i < 3; i++) px(g, 132, 70 + ((t + i * 3) % 6), 0x28, 1, 1);
  });
  panel('invitation', (g) => {
    daySky(g);
    lawn(g, 64, 0x2a, 0x1a, 9);
    gatsbyHouse(g, 140, 24, 80, 40, { lit: null, ivy: 0x1a, wall: 0x30, dark: 0x10, roof: 0x0c, seed: 4 });
    fig(g, 34, 86, { coat: 0x2c, legs: 0x2c, hat: 'cap', hatCol: 0x1c, s: 2 });
    // The note, close up.
    px(g, 70, 36, 0x0f, 136, 68); px(g, 71, 37, 0x37, 134, 66);
    px(g, 74, 40, 0x28, 128, 1); px(g, 74, 99, 0x28, 128, 1); px(g, 74, 40, 0x28, 1, 60); px(g, 201, 40, 0x28, 1, 60);
    for (const [x, y] of [[76, 42], [196, 42], [76, 95], [196, 95]]) px(g, x, y, 0x18, 4, 3);
    GG.text(g, 'A LITTLE PARTY', 138, 50, 0x08, { align: 'center' });
    GG.text(g, 'TONIGHT', 138, 61, 0x08, { align: 'center' });
    px(g, 114, 74, 0x2d, 48, 1);
    GG.text(g, 'JAY GATSBY', 138, 82, 0x02, { align: 'center' });
  });
  panel('smile', (g) => {
    nightSky(g, 44);
    glow(g, 112, 56, 70, 0x28, 0.25);
    const f = face('gatsbyWhite');
    g.imageSmoothingEnabled = false;
    g.drawImage(f, 0, 6, 56, 50, 56, 0, 112, 100);
    px(g, 0, 100, 0x0f, PW, 12);
  }, (g, t) => {
    stringLights(g, t, 6, 6, 2, 0, 56); stringLights(g, t, 6, 6, 2, 168, PW);
    const k = t % 80;
    if (k < 10) { const s = k < 5 ? 1 : 2; px(g, 118 - s, 76, 0x30, s * 2 + 1, 1); px(g, 118, 76 - s, 0x30, 1, s * 2 + 1); }
  });
  panel('ditch', (g) => {
    nightSky(g, 51);
    hedge(g, 54, 0x0f, 0x0c, 6, 6);
    road(g, 76, 0x00, 0x10);
    for (let x = 0; x < PW; x++) px(g, x, 70 + Math.round(Math.sin(x / 9)), 0x0b, 1, 6);
    // The new coupe, nose down in the ditch, "violently shorn of one wheel".
    tilt(g, scratch(62, 22, (cg) => car(cg, 1, 21, { len: 60, body: 0x0c, dark: 0x0f, trim: 0x10, lamp: 0x38 })), 92, 66, 0.22);
    px(g, 70, 96, 0x0f, 9, 9); px(g, 72, 98, 0x10, 5, 5); px(g, 74, 100, 0x0f, 1, 1);
    for (let i = 0; i < 7; i++) fig(g, 20 + i * 11 + (i > 3 ? 110 : 0), 100 + (i % 2) * 3, { coat: [0x0f, 0x30, 0x0f, 0x23][i % 4], dress: i % 4 === 3, legs: 0x0f });
  }, (g, t) => {
    // Headlamps of the cars behind, honking.
    const on = Math.floor(t / 12) % 2;
    glow(g, 160, 82, 16, 0x38, on ? 0.5 : 0.3);
    px(g, 6, 84, 0x38, 3, 2); px(g, 14, 84, 0x38, 3, 2);
  });

  /* -------------------------------------------------------- chapter IV */
  panel('car', (g) => {
    daySky(g); clouds(g, 61, 6, 26, 4);
    hedge(g, 56, 0x0a, 0x1a, 12, 8);
    for (let i = 0; i < 8; i++) { const x = 10 + i * 30; px(g, x, 30, 0x08, 3, 30); for (let y = 0; y < 22; y++) { const w = Math.round(Math.sin(y / 22 * Math.PI) * 8); px(g, x + 1 - w, 18 + y, (y + i) % 5 ? 0x1a : 0x2a, w * 2 + 1, 1); } }
    road(g, 78, 0x2d, 0x30);
    px(g, 0, 76, 0x10, PW, 2);
    car(g, 56, 100, { len: 104, body: 0x37, dark: 0x27, trim: 0x30, boxes: true, driver: { coat: 0x30 } });
  }, (g, t) => {
    // "A labyrinth of wind-shields that mirrored a dozen suns."
    for (let i = 0; i < 5; i++) {
      const k = (t + i * 13) % 50;
      if (k < 6) { const x = [72, 76, 86, 136, 140][i], y = [80, 84, 82, 82, 86][i]; px(g, x - 2, y, 0x30, 5, 1); px(g, x, y - 2, 0x30, 1, 5); }
    }
  });
  panel('medal', (g) => {
    for (let y = 0; y < PH; y++) for (let x = 0; x < PW; x++) px(g, x, y, B(x, y) < 0.2 ? 0x07 : 0x05);
    glow(g, 112, 60, 60, 0x15, 0.4);
    // The ribbon, and the cross of the Order of Danilo.
    px(g, 104, 4, 0x0f, 18, 34); px(g, 105, 4, 0x06, 16, 33); for (let i = 0; i < 4; i++) px(g, 107 + i * 4, 4, 0x0f, 1, 33);
    px(g, 108, 36, 0x18, 10, 4);
    const cx = 112, cy = 70;
    for (let i = 0; i < 4; i++) {
      const a = i * Math.PI / 2;
      for (let r = 6; r < 26; r++) { const w = 2 + Math.floor(r / 3); for (let k = -w; k <= w; k++) { const x = cx + Math.cos(a) * r - Math.sin(a) * k, y = cy + Math.sin(a) * r + Math.cos(a) * k; px(g, x, y, Math.abs(k) === w ? 0x18 : (k < 0 ? 0x38 : 0x28)); } }
    }
    disc(g, cx, cy, 10, 0x18); disc(g, cx, cy, 9, 0x0f); disc(g, cx, cy, 8, 0x30); disc(g, cx, cy, 6, 0x02); disc(g, cx, cy, 4, 0x12);
    px(g, cx - 1, cy - 3, 0x30, 2, 6);
  }, (g, t) => {
    const k = t % 70;
    if (k < 8) { const x = 130, y = 54, s = k < 4 ? 2 : 3; px(g, x - s, y, 0x30, s * 2 + 1, 1); px(g, x, y - s, 0x30, 1, s * 2 + 1); }
  });
  panel('cop', (g) => {
    daySky(g);
    // Astoria, then the great bridge ahead.
    for (let i = 0; i < 14; i++) px(g, i * 16, 44 - (i * 7) % 12, 0x10, 14, 30);
    road(g, 74, 0x2d, 0x30);
    car(g, 18, 102, { len: 104, body: 0x37, dark: 0x27, trim: 0x30, boxes: true, driver: { coat: 0x30 }, passenger: { coat: 0x02, hair: 0x28 } });
    // The motorcycle cop, pulled up alongside.
    for (const wx of [148, 178]) { disc(g, wx, 96, 6, 0x0f); disc(g, wx, 96, 4, 0x00); disc(g, wx, 96, 1, 0x10); }
    px(g, 148, 88, 0x00, 32, 5); px(g, 150, 86, 0x10, 14, 2); px(g, 176, 82, 0x10, 2, 8); px(g, 174, 82, 0x0f, 6, 1);
    fig(g, 162, 88, { coat: 0x02, legs: 0x02, hat: 'cap', hatCol: 0x02 });
  }, (g, t) => {
    // The white card, waved before his eyes.
    const y = 70 + Math.round(Math.sin(t / 6) * 2);
    px(g, 53, y + 6, 0x36, 2, 6); px(g, 51, y, 0x30, 8, 5); px(g, 51, y + 5, 0x10, 8, 1);
  });
  panel('bridge', (g) => {
    sky(g, [[0x21, 0], [0x31, 40, 14], [0x30, 64, 6]]);
    // "The city rising up across the river in white heaps and sugar lumps."
    const r = GG.rng(17);
    for (let x = 0; x < PW;) { const w = 6 + Math.floor(r() * 12), h = 10 + Math.floor(r() * 46); px(g, x, 82 - h, r() < 0.5 ? 0x30 : 0x3d === 0 ? 0x30 : 0x20, w, h); px(g, x + w - 2, 82 - h, 0x10, 2, h); x += w; }
    for (let i = 0; i < 40; i++) px(g, Math.floor(r() * PW), 30 + Math.floor(r() * 50), 0x10, 2, 1);
    water(g, 82, 30, 0x11, 0x31, 0, 8);
  }, (g, t) => {
    // Girders sweeping past, and the sunlight flickering through them.
    const off = Math.floor(t * 1.5) % 40;
    for (let x = -40 - off; x < PW + 40; x += 40) {
      for (let i = 0; i < 112; i++) { px(g, x + i * 0.35, i, 0x0c, 3, 1); px(g, x + 40 - i * 0.35, i, 0x0c, 3, 1); }
      px(g, x, 0, 0x0f, 4, PH);
    }
    px(g, 0, 0, 0x0c, PW, 6); px(g, 0, 104, 0x0c, PW, 8);
    if (Math.floor(t / 4) % 3 === 0) dith(g, 0, 6, PW, 98, 0x30, 0.08);
  });
  panel('cellar', (g) => {
    for (let y = 0; y < PH; y++) for (let x = 0; x < PW; x++) px(g, x, y, (y % 6 === 5 || (x + (Math.floor(y / 6) % 2) * 6) % 12 === 0) ? 0x0f : 0x07);
    px(g, 0, 84, 0x0f, PW, 28); for (let x = 0; x < PW; x += 8) for (let y = 84; y < PH; y += 8) px(g, x + ((y / 8) % 2) * 4, y, 0x30, 4, 4);
    fig(g, 50, 84, { coat: 0x00, legs: 0x00, hair: 0x10, s: 2 });
    fig(g, 84, 84, { coat: 0x25, legs: 0x25, hair: 0x18, s: 2 });
    fig(g, 150, 84, { coat: 0x02, legs: 0x30, hat: 'boater', s: 2 });
    for (const x of [30, 120]) { px(g, x, 66, 0x0f, 70, 6); px(g, x + 1, 66, 0x30, 68, 4); px(g, x + 4, 70, 0x10, 62, 2); px(g, x + 30, 72, 0x0f, 6, 12); }
    px(g, 60, 60, 0x30, 4, 6); px(g, 140, 60, 0x2a, 3, 6);
  }, (g, t) => {
    const a = Math.floor(t / 3) % 2;
    for (const cx of [60, 160]) { px(g, cx, 0, 0x0f, 1, 10); px(g, a ? cx - 12 : cx - 6, 10, 0x00, a ? 26 : 14, 2); px(g, cx - 2, 9, 0x10, 5, 3); }
  });
  panel('molars', (g) => {
    px(g, 0, 0, 0x07, PW, PH);
    for (let y = 0; y < PH; y++) for (let x = 0; x < PW; x++) if (B(x, y) < 0.18) px(g, x, y, 0x0f);
    // A dark sleeve, a white cuff, and the button.
    for (let y = 30; y < 100; y++) px(g, 0, y, 0x00, 70 + (y - 30) * 0.6, 1);
    px(g, 60, 34, 0x0f, 70, 62); px(g, 62, 36, 0x30, 66, 58); px(g, 62, 36, 0x10, 4, 58); px(g, 124, 36, 0x10, 4, 58);
    px(g, 128, 50, 0x0f, 40, 30); px(g, 128, 52, 0x36, 38, 26); px(g, 128, 74, 0x27, 38, 4);
    // "Finest specimens of human molars."
    const bx = 96, by = 64;
    px(g, bx - 9, by - 8, 0x0f, 18, 16); px(g, bx - 8, by - 7, 0x30, 16, 10); px(g, bx - 8, by + 3, 0x10, 16, 4);
    px(g, bx - 8, by + 7, 0x0f, 4, 5); px(g, bx + 4, by + 7, 0x0f, 4, 5); px(g, bx - 7, by + 7, 0x10, 2, 4); px(g, bx + 5, by + 7, 0x10, 2, 4);
    px(g, bx - 2, by - 7, 0x0f, 4, 2); px(g, bx - 6, by - 4, 0x37, 3, 2);
  }, (g, t) => {
    const k = t % 60;
    if (k < 8) { const s = k < 4 ? 2 : 3; px(g, 90 - s, 58, 0x30, s * 2 + 1, 1); px(g, 90, 58 - s, 0x30, 1, s * 2 + 1); }
  });
  panel('louisville', (g) => {
    daySky(g); clouds(g, 71, 6, 24, 3);
    for (let i = 0; i < 6; i++) { const x = i * 44 - 10; for (let y = 0; y < 40; y++) { const w = Math.round(Math.sin(y / 40 * Math.PI) * 18); px(g, x - w, 10 + y, (y + i) % 6 ? 0x1a : 0x2a, w * 2, 1); } }
    // "The largest of the banners and the largest of the lawns belonged to
    // Daisy Fay's house." A white house with a deep porch.
    px(g, 120, 26, 0x30, 96, 50); for (let i = 0; i < 8; i++) px(g, 118 + i * 2, 25 - i, 0x10, 100 - i * 4, 1);
    for (let i = 0; i < 5; i++) { px(g, 126 + i * 20, 32, 0x0c, 8, 12); px(g, 124 + i * 20, 50, 0x30, 3, 26); }
    px(g, 120, 48, 0x10, 96, 2);
    lawn(g, 76, 0x2a, 0x1a, 13);
    road(g, 92, 0x2d, 0x10);
    car(g, 16, 106, { len: 64, body: 0x30, dark: 0x10, trim: 0x20, glass: 0x31, lamp: 0x30 });
    fig(g, 96, 104, { dress: true, coat: 0x30, hair: 0x08, s: 2 });
    fig(g, 108, 104, { coat: 0x18, legs: 0x18, hair: 0x18, hat: 'cap', hatCol: 0x08, s: 2 });
  });

  /* --------------------------------------------------------- chapter V */
  panel('rain', (g) => {
    sky(g, [[0x00, 0], [0x10, 40, 16]]);
    gatsbyHouse(g, 120, 30, 100, 50, { lit: 0x28, litAmt: 0.6, wall: 0x00, dark: 0x0f, roof: 0x0f, ivy: 0x0b, seed: 6 });
    lawn(g, 80, 0x0b, 0x1b, 4);
    cottage(g, 30, 64, { wall: 0x10, roof: 0x08, win: 0x28 });
    // "A greenhouse arrived from Gatsby's."
    for (let i = 0; i < 9; i++) { const x = 8 + i * 9, y = 88 + (i % 2) * 6; px(g, x, y, 0x07, 6, 5); px(g, x - 1, y - 4, [0x24, 0x26, 0x30, 0x28, 0x34][i % 5], 8, 5); px(g, x + 2, y - 5, 0x2a, 2, 1); }
    // The man with the lawn-mower, in a raincoat.
    fig(g, 150, 100, { coat: 0x18, legs: 0x08, hat: 'cap', hatCol: 0x08 }); px(g, 154, 92, 0x0f, 12, 1); px(g, 164, 94, 0x00, 8, 5); px(g, 165, 99, 0x0f, 2, 2); px(g, 169, 99, 0x0f, 2, 2);
  }, (g, t) => rain(g, t, 90, 0x10, 0.5));
  let clockPic = null;
  panel('clock', (g) => {
    roomWall(g, 0x0c, 0x1c, 14);
    px(g, 150, 14, 0x08, 56, 56); px(g, 153, 17, 0x00, 50, 50); px(g, 178, 17, 0x08, 2, 50); px(g, 153, 40, 0x08, 50, 2);
    // The mantelpiece.
    px(g, 20, 54, 0x30, 100, 6); px(g, 26, 60, 0x10, 88, 52); px(g, 46, 74, 0x0f, 48, 38); px(g, 50, 98, 0x16, 40, 14);
    for (let i = 0; i < 4; i++) px(g, 30 + i * 22, 44, [0x24, 0x26, 0x30, 0x34][i], 8, 10);
  }, (g, t) => {
    rainIn(g, t, 153, 17, 50, 50, 16, 0x10);
    // A defunct mantelpiece clock, tilting, caught at the last moment.
    const k = Math.min(1, (t % 120) / 40), a = Math.sin(k * Math.PI) * 0.45;
    if (!clockPic) clockPic = scratch(20, 22, (cg) => { px(cg, 0, 0, 0x0f, 20, 22); px(cg, 1, 1, 0x18, 18, 20); disc(cg, 10, 10, 6, 0x0f); disc(cg, 10, 10, 5, 0x30); px(cg, 10, 6, 0x0f, 1, 4); px(cg, 10, 10, 0x0f, 3, 1); });
    tilt(g, clockPic, 90 + Math.round(a * 10), 32, a);
    fig(g, 136, 108, { coat: 0x30, hair: 0x18, arms: 'fwd', s: 2 });
  });
  panel('tour', (g) => {
    roomWall(g, 0x37, 0x28, 18);
    // Marie Antoinette music-rooms: white and gold, a great stair.
    for (let i = 0; i < 4; i++) { px(g, 20 + i * 56, 6, 0x30, 8, 90); px(g, 19 + i * 56, 6, 0x28, 10, 3); px(g, 19 + i * 56, 92, 0x28, 10, 4); }
    for (let i = 0; i < 12; i++) { px(g, 60 + i * 9, 96 - i * 7, 0x05, 40, 7); px(g, 60 + i * 9, 96 - i * 7, 0x15, 40, 1); }
    px(g, 0, 96, 0x30, PW, 16); for (let x = 0; x < PW; x += 16) px(g, x, 96, 0x10, 1, 16);
    fig(g, 92, 89, { coat: 0x30, hair: 0x18, s: 1 }); fig(g, 104, 82, { dress: true, coat: 0x30, hair: 0x08 }); fig(g, 76, 96, { coat: 0x02, legs: 0x30, hat: 'boater' });
  }, (g, t) => {
    for (const cx of [60, 170]) { px(g, cx, 0, 0x28, 1, 8); for (let i = 0; i < 5; i++) { const on = (i + Math.floor(t / 10)) % 4; px(g, cx - 8 + i * 4, 10, on ? 0x38 : 0x30, 2, 3); } px(g, cx - 9, 13, 0x28, 19, 1); }
  });
  panel('shirts', (g) => {
    px(g, 0, 0, 0x08, PW, PH);
    for (let y = 0; y < PH; y += 6) px(g, 0, y, 0x07, PW, 1);
    px(g, 0, 90, 0x07, PW, 22); px(g, 0, 90, 0x18, PW, 2);
  }, (g, t) => {
    // "Shirts with stripes and scrolls and plaids in coral and apple-green
    // and lavender and faint orange, with monograms of Indian blue."
    const cols = [[0x26, 0x16], [0x3a, 0x2a], [0x33, 0x23], [0x37, 0x27], [0x30, 0x10], [0x34, 0x24], [0x31, 0x21]];
    const shirt = (x, y, i, flat) => {
      const [c, d] = cols[i % cols.length];
      if (flat) { px(g, x, y, d, 18, 6); px(g, x, y, c, 18, 4); px(g, x - 3, y + 1, c, 3, 3); px(g, x + 18, y + 1, c, 3, 3); }
      else { px(g, x, y, c, 12, 14); px(g, x - 4, y, c, 4, 7); px(g, x + 12, y, c, 4, 7); px(g, x + 4, y, 0x30, 4, 2); px(g, x + 1, y + 13, d, 10, 1); }
      if (i % 3 === 0) for (let k = 0; k < 4; k++) px(g, x + 2 + k * 3, y + 1, d, 1, flat ? 4 : 12);
      if (i % 7 === 4) px(g, x + 8, y + 3, 0x12, 2, 2);
    };
    const pile = Math.min(28, Math.floor(t / 6));
    for (let i = 0; i < pile; i++) shirt(40 + (i * 37) % 130, 88 - Math.floor(i / 4) * 3 - (i % 2), i, true);
    for (let i = 0; i < 6; i++) {
      const k = (t * 1.2 + i * 37) % 130;
      shirt(30 + (i * 47) % 160 + Math.round(Math.sin(k / 9 + i) * 6), k - 20, i + 2, false);
    }
  });
  panel('piano', (g) => {
    roomWall(g, 0x37, 0x28, 18);
    px(g, 150, 10, 0x08, 60, 60); px(g, 153, 13, 0x00, 54, 54); px(g, 178, 13, 0x08, 2, 54);
    px(g, 0, 92, 0x05, PW, 20);
    // The grand piano, the lid up.
    px(g, 40, 58, 0x0f, 96, 18); px(g, 42, 60, 0x00, 92, 14); for (let i = 0; i < 20; i++) px(g, 44 + i * 2, 62, i % 3 === 1 ? 0x0f : 0x30, 1, 4);
    for (let i = 0; i < 30; i++) px(g, 70 + i * 2, 58 - i, 0x0f, 2, 1);
    px(g, 48, 76, 0x0f, 3, 16); px(g, 124, 76, 0x0f, 3, 16);
    // Klipspringer at the keys, in his pajamas.
    for (let y = 0; y < 14; y++) px(g, 26, 66 + y, y % 3 === 0 ? 0x12 : 0x30, 10, 1);
    px(g, 28, 58, 0x36, 6, 7); px(g, 27, 57, 0x08, 8, 2); px(g, 22, 80, 0x08, 18, 3); px(g, 24, 83, 0x08, 2, 9);
  }, (g, t) => {
    rainIn(g, t, 153, 13, 54, 54, 16, 0x10);
    for (let i = 0; i < 4; i++) {
      const k = (t + i * 24) % 96, x = 60 + i * 14 + Math.round(Math.sin(k / 8) * 4), y = 54 - k * 0.5;
      if (y > 0) { px(g, x, y, 0x0f, 1, 5); px(g, x - 2, y + 4, 0x0f, 3, 2); px(g, x + 1, y, 0x0f, 2, 1); }
    }
  });

  /* -------------------------------------------------------- chapter VI */
  const lakeSky = (g) => { sky(g, [[0x11, 0], [0x21, 30, 12], [0x31, 52, 8]]); clouds(g, 81, 4, 30, 4); };
  function pines(g, y, seed, col = 0x0b, light = 0x1a, x0 = 0, x1 = PW) {
    const r = GG.rng(seed);
    for (let x = x0; x < x1; x += 5 + Math.floor(r() * 5)) {
      const h = 14 + Math.floor(r() * 18);
      for (let k = 0; k < h; k++) { const w = Math.floor(k / 3) + 1; px(g, x - w, y - h + k, k % 4 === 0 ? light : col, w * 2 + 1, 1); }
    }
  }
  function yacht(g, x, y, s = 1) {
    const R = (dx, dy, w, h, col) => px(g, x + dx * s, y + dy * s, col, w * s, h * s);
    for (let i = 0; i < 7; i++) R(i, i, 60 - i * 2, 1, 0x30);
    R(2, 2, 56, 1, 0x10); R(8, 4, 44, 1, 0x02);
    R(14, -6, 24, 6, 0x30); R(16, -4, 3, 2, 0x21); R(22, -4, 3, 2, 0x21); R(28, -4, 3, 2, 0x21);
    R(18, -9, 10, 3, 0x37); R(26, -12, 3, 3, 0x07);
    R(10, -28, 1, 28, 0x08); R(44, -24, 1, 24, 0x08);
    for (let i = 0; i < 20; i++) { R(10 + i * 0.3, -28 + i, 1, 1, 0x00); R(44 - i * 0.6, -24 + i, 1, 1, 0x00); }
  }
  panel('lake', (g) => {
    lakeSky(g);
    // The far shore of pines, the great lake, Dan Cody's yacht at anchor.
    pines(g, 58, 4, 0x0b, 0x1b);
    water(g, 58, 54, 0x12, 0x21, 0, 21);
    yacht(g, 120, 56, 1);
    // The near beach.
    for (let x = 0; x < 90; x++) { const top = 96 - Math.round(x * 0.2); px(g, x, top, 0x37, 1, PH - top); if (B(x, top) < 0.4) px(g, x, top, 0x27, 1, 1); }
    pines(g, 96, 9, 0x0b, 0x1a, 0, 30);
  }, (g, t) => {
    for (let i = 0; i < 18; i++) px(g, (i * 37 + t * 0.5) % PW, 62 + (i * 13) % 46, 0x30, 4 + i % 4, 1);
    // A rowboat pulling out to her.
    const k = (t * 0.25) % 80, bx = 70 + k, by = 96 - k * 0.38;
    px(g, bx, by, 0x08, 14, 3); px(g, bx + 1, by + 3, 0x07, 12, 1);
    fig(g, bx + 7, by, { coat: 0x0a, legs: 0x37, hair: 0x18 });
    const oar = Math.floor(t / 10) % 2;
    px(g, bx + (oar ? 1 : 3), by - 6 + oar * 2, 0x18, 12, 1);
  });
  panel('yacht', (g) => {
    lakeSky(g);
    water(g, 64, 48, 0x12, 0x21, 0, 23);
    yacht(g, 30, 64, 2);
    fig(g, 92, 54, { coat: 0x30, legs: 0x30, hat: 'cap', hatCol: 0x02, hair: 0x10 });
  }, (g, t) => {
    for (let i = 0; i < 14; i++) px(g, (i * 41 + t * 0.6) % PW, 82 + (i * 11) % 28, 0x30, 4, 1);
    px(g, 170, 92, 0x08, 18, 4);
    fig(g, 178, 92, { coat: 0x0a, legs: 0x37, hair: 0x18, arms: Math.floor(t / 20) % 2 ? 'up' : 'down' });
  });
  panel('schedule', (g) => {
    px(g, 0, 0, 0x08, PW, PH);
    for (let y = 0; y < PH; y += 3) px(g, 0, y, 0x07, PW, 1);
    // A ragged old copy of a book called "Hopalong Cassidy", open at the back.
    px(g, 22, 6, 0x0f, 182, 102); px(g, 24, 8, 0x37, 88, 98); px(g, 114, 8, 0x37, 88, 98); px(g, 112, 8, 0x27, 2, 98);
    for (let i = 0; i < 40; i++) px(g, 26 + (i * 23) % 84, 10 + (i * 37) % 94, 0x27, 2, 1);
    GG.text(g, 'SCHEDULE', 68, 14, 0x08, { align: 'center' });
    const r = GG.rng(5);
    for (let k = 0; k < 7; k++) {
      const y = 28 + k * 10;
      let x = 30;
      while (x < 84 - 6) { const w = 2 + Math.floor(r() * 5); px(g, x, y, 0x02, w, 1); if (r() < 0.4) px(g, x + 1, y - 1, 0x02, 1, 1); x += w + 2; }
      px(g, 92, y, 0x02, 14, 1);
    }
    GG.text(g, 'RESOLVES', 158, 14, 0x08, { align: 'center' });
    for (let k = 0; k < 6; k++) {
      const y = 30 + k * 12;
      let x = 120;
      const end = 190 - Math.floor(r() * 30);
      while (x < end) { const w = 2 + Math.floor(r() * 5); px(g, x, y, 0x02, w, 1); if (r() < 0.4) px(g, x + 1, y - 1, 0x02, 1, 1); x += w + 2; }
    }
    // "Save $5.00 [crossed out] $3.00 per week."
    px(g, 140, 66, 0x16, 18, 1);
    GG.text(g, 'SEPT 1906', 68, 96, 0x07, { align: 'center' });
  });

  /* ------------------------------------------------------- chapter VII */
  panel('heat', (g) => {
    sky(g, [[0x27, 0], [0x37, 30, 14], [0x38, 56, 10], [0x30, 72, 6]]);
    disc(g, 170, 26, 14, 0x30); glow(g, 170, 26, 34, 0x38, 0.5);
    georgian(g, 20, 52, 120, 40, { glass: 0x37 });
    for (let y = 92; y < PH; y++) for (let x = 0; x < PW; x++) px(g, x, y, B(x, y) < 0.35 ? 0x18 : 0x28);
  }, (g, t) => {
    // Heat shimmer.
    for (let y = 56; y < 92; y += 3) { const off = Math.round(Math.sin(y / 4 + t / 6) * 1.5); if (off) px(g, 0, y, 0x37, PW, 1); }
  });
  panel('plaza', (g) => {
    roomWall(g, 0x37, 0x27, 20);
    // Tall windows on the park, the heat outside.
    for (const wx of [16, 168]) { px(g, wx - 2, 6, 0x30, 44, 80); px(g, wx, 8, 0x38, 40, 76); for (let y = 30; y < 84; y++) for (let x = wx; x < wx + 40; x++) if (B(x, y) < (y - 30) / 70) px(g, x, y, 0x2a); px(g, wx + 19, 8, 0x30, 2, 76); }
    px(g, 0, 90, 0x06, PW, 22);
    // A table with a bucket of ice for the mint juleps.
    px(g, 80, 72, 0x30, 64, 4); px(g, 84, 76, 0x08, 2, 14); px(g, 138, 76, 0x08, 2, 14);
    px(g, 104, 62, 0x10, 14, 10); px(g, 106, 60, 0x31, 10, 3); px(g, 122, 64, 0x30, 4, 8); px(g, 123, 62, 0x2a, 2, 3);
    fig(g, 70, 92, { coat: 0x18, legs: 0x08, hair: 0x38, s: 2 });
    fig(g, 160, 92, { coat: 0x25, legs: 0x25, hair: 0x18, s: 2 });
    fig(g, 116, 92, { dress: true, coat: 0x30, hair: 0x08, s: 2 });
  }, (g, t) => {
    // The fan, and the Wedding March rising from the ballroom below.
    const a = Math.floor(t / 2) % 2;
    px(g, 148, 70, 0x0f, 2, 2); px(g, 144, 62, 0x00, 10, a ? 8 : 2); px(g, a ? 142 : 140, 66, 0x00, a ? 14 : 18, 1);
    for (let i = 0; i < 3; i++) { const k = (t + i * 30) % 90, x = 30 + i * 70 + Math.round(Math.sin(k / 10) * 3), y = 110 - k * 0.4; px(g, x, y, 0x30, 1, 4); px(g, x - 2, y + 3, 0x30, 3, 2); }
  });

  panel('deathcar', (g) => {
    sky(g, [[0x0f, 0], [0x03, 30, 14], [0x13, 52, 8], [0x00, 66, 6]]);
    ashHills(g, 66, 13, 0x0f, 0x00);
    road(g, 78, 0x0f, 0x00);
    // Wilson's garage with its one light; a few figures gathered, far off.
    px(g, 20, 48, 0x08, 50, 30); px(g, 18, 46, 0x0f, 54, 2); px(g, 38, 60, 0x38, 12, 18);
    for (let i = 0; i < 6; i++) fig(g, 80 + i * 6, 80, { coat: 0x0f, legs: 0x0f, skin: 0x00, hair: 0x0f });
  }, (g, t) => {
    // The car didn't stop; its lamps go away around the bend.
    const k = (t % 150) / 150, x = 120 + k * 120, y = 84 - k * 10;
    if (k < 0.9) { glow(g, x + 6, y, 10, 0x38, 0.5); px(g, x, y - 1, 0x38, 3, 2); px(g, x + 5, y - 1, 0x38, 3, 2); }
  });
  panel('vigil', (g) => {
    nightSky(g, 61);
    moon(g, 40, 22, 9);
    georgian(g, 90, 36, 110, 46, { brick: 0x0c, mortar: 0x0f, trim: 0x10, glass: 0x0f, roof: 0x0f, door: 0x0f });
    px(g, 117, 42, 0x38, 5, 8);
    for (let y = 82; y < PH; y++) for (let x = 0; x < PW; x++) px(g, x, y, B(x, y) < 0.2 ? 0x0c : 0x0f);
    hedge(g, 80, 0x0f, 0x0b, 31, 6, 0, 90);
  }, (g, t) => {
    // Gatsby in the moonlight, "watching over nothing".
    fig(g, 60, 98, { coat: 0x15, legs: 0x15, hair: 0x08, skin: 0x27, s: 2 });
    if (t % 200 > 190) px(g, 117, 42, 0x0f, 5, 8);
  });
  panel('dawn', (g) => {
    sky(g, [[0x02, 0], [0x13, 26, 12], [0x24, 48, 10], [0x37, 66, 6]]);
    gatsbyHouse(g, 40, 40, 150, 50, { lit: 0x28, litAmt: 0.15, wall: 0x00, dark: 0x0f, roof: 0x0f, seed: 12 });
    lawn(g, 90, 0x0b, 0x1a, 17);
    px(g, 80, 86, 0x10, 70, 4);
    fig(g, 104, 86, { coat: 0x25, legs: 0x25, hair: 0x18 });
    fig(g, 118, 86, { coat: 0x02, legs: 0x30, hat: 'boater' });
  });

  /* ------------------------------------------------------ chapter VIII */
  panel('argonne', (g) => {
    sky(g, [[0x0f, 0], [0x0c, 50, 20], [0x00, 80, 6]]);
    // Shattered trees, wire, the lip of a trench.
    const r = GG.rng(88);
    for (let i = 0; i < 12; i++) {
      const x = 6 + i * 19 + Math.floor(r() * 8), h = 20 + Math.floor(r() * 40);
      px(g, x, 86 - h, 0x0f, 3, h);
      for (let k = 0; k < 3; k++) { const by = 86 - h + 6 + k * 9, dir = k % 2 ? 1 : -1; for (let j = 0; j < 6; j++) px(g, x + 1 + dir * j, by - Math.floor(j * 0.6), 0x0f); }
    }
    for (let x = 0; x < PW; x++) { const top = 86 + Math.round(Math.sin(x / 13) * 2 + Math.sin(x / 5)); px(g, x, top, 0x0f, 1, PH - top); }
    for (let x = 0; x < PW; x += 14) { px(g, x, 78, 0x0f, 1, 10); for (let k = 0; k < 14; k++) px(g, x + k, 80 + Math.round(Math.sin(k) * 1.5), 0x0f); }
  }, (g, t) => {
    // Flares rise, hang, and drift down, lighting the forest.
    for (let i = 0; i < 2; i++) {
      const k = (t + i * 90) % 180, x = 50 + i * 110 + k * 0.2, y = k < 40 ? 80 - k * 1.8 : 8 + (k - 40) * 0.35;
      glow(g, x, y, 26, 0x28, 0.18);
      px(g, x - 1, y - 1, 0x38, 3, 3); px(g, x, y, 0x30);
      for (let j = 1; j < 6; j++) px(g, x, y - j * 2, 0x10);
    }
  });
  panel('pool', (g) => {
    // Autumn, already: the first yellow leaves.
    sky(g, [[0x00, 0], [0x10, 30, 14]]);
    gatsbyHouse(g, 120, 4, 120, 40, { lit: null, wall: 0x10, dark: 0x00, roof: 0x0c, ivy: 0x18, seed: 3 });
    px(g, 0, 44, 0x30, PW, 68); for (let x = 0; x < PW; x += 16) px(g, x, 44, 0x10, 1, 68);
    px(g, 16, 54, 0x10, 192, 50); px(g, 18, 56, 0x02, 188, 46);
  }, (g, t) => {
    for (let i = 0; i < 26; i++) { const x = 20 + (i * 53 + t * 0.15) % 184, y = 58 + (i * 29) % 42; px(g, x, y, (i % 3) ? 0x12 : 0x11, 5, 1); }
    // The mattress drifting, and its burden, still.
    const x = 70 + Math.round(Math.sin(t / 90) * 10), y = 74 + Math.round(Math.sin(t / 50) * 2);
    px(g, x, y, 0x0f, 40, 9); px(g, x + 1, y + 1, 0x16, 38, 7); for (let k = 4; k < 38; k += 5) px(g, x + k, y + 1, 0x06, 1, 7);
    px(g, x + 6, y - 1, 0x25, 26, 3); px(g, x + 30, y - 2, 0x27, 4, 3); px(g, x + 30, y - 3, 0x18, 4, 1);
    for (let i = 0; i < 9; i++) px(g, 24 + (i * 71) % 170, 60 + (i * 19) % 38, i % 2 ? 0x28 : 0x27, 2, 2);
  });

  /* -------------------------------------------------------- chapter IX */
  panel('funeral', (g) => {
    sky(g, [[0x00, 0], [0x10, 50, 20]]);
    for (let x = 0; x < PW; x++) { const top = 70 + Math.round(Math.sin(x / 40) * 4); px(g, x, top, 0x0b, 1, PH - top); px(g, x, top, 0x1b, 1, 1); }
    for (const [x, y] of [[30, 76], [60, 72], [170, 74], [200, 78]]) { px(g, x, y - 12, 0x10, 8, 12); px(g, x + 1, y - 13, 0x10, 6, 1); }
    px(g, 104, 84, 0x08, 30, 8); px(g, 106, 82, 0x07, 26, 2);
    for (const [x, c] of [[90, 0x0f], [146, 0x08], [160, 0x0f]]) fig(g, x, 96, { coat: c, legs: 0x0f, hat: 'umbrella', s: 2 });
  }, (g, t) => rain(g, t, 80, 0x10, 0.2));
  panel('beach', (g) => {
    nightSky(g, 91);
    hedge(g, 58, 0x0f, 0x01, 22, 4);
    water(g, 62, 30, 0x02, 0x01, 0, 31);
    for (let x = 0; x < PW; x++) { const top = 92 + Math.round(Math.sin(x / 20) * 2); px(g, x, top, 0x08, 1, PH - top); if (B(x, top) < 0.5) px(g, x, top, 0x18, 1, 1); }
    // Nick, on the sand, looking across.
    px(g, 60, 84, 0x02, 6, 8); px(g, 66, 88, 0x30, 8, 3); px(g, 61, 80, 0x36, 4, 4); px(g, 59, 79, 0x28, 8, 1); px(g, 60, 78, 0x38, 6, 1);
  }, (g, t) => {
    const on = greenLight(g, 196, 60, t, true);
    if (on) greenTrail(g, 196, 64, 92, t);
  });
  panel('boats', (g) => {
    nightSky(g, 101);
    px(g, 0, 56, 0x0f, PW, 4);
  }, (g, t) => {
    water(g, 60, 52, 0x02, 0x01, t * 2, 41);
    // Waves running back, against him.
    for (let i = 0; i < 16; i++) { const x = PW - ((i * 37 + t * 1.2) % (PW + 20)), y = 66 + (i * 11) % 44; px(g, x, y, 0x12, 6 + i % 5, 1); }
    const on = greenLight(g, 206, 56, t, true);
    if (on) greenTrail(g, 206, 60, 84, t);
    // A rowboat, beating on.
    const k = Math.sin(t / 14), bx = 70 + Math.round(k * 3), by = 92 + Math.round(Math.cos(t / 9));
    px(g, bx, by, 0x08, 22, 3); px(g, bx + 2, by + 3, 0x07, 18, 1);
    fig(g, bx + 10, by, { coat: 0x02, legs: 0x02, hat: 'boater' });
    px(g, bx + (k > 0 ? 2 : 6), by - 4 + (k > 0 ? 0 : 2), 0x18, 16, 1);
  });

  /* @@PANELS4@@ */
})();
