'use strict';
/*
 * FRANKEN.EXE art: cinema panels. Each panel is 224x112: a static picture
 * built once (sky, land, buildings, portraits) plus a small animated layer on
 * top (rain, lightning, flicker, drift). Everything stays on the NES palette.
 */
(() => {
  const PW = 224, PH = 112;
  const K = () => FK.bgKit;
  const ART = (FK.CINE_ART = {});
  const cache = {};
  const C = (v) => FK.color(v);

  function canvas(w = PW, h = PH) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function px(g, x, y, col, w = 1, h = 1) { g.fillStyle = C(col); g.fillRect(Math.round(x), Math.round(y), w, h); }
  function built(name, fn) { if (!cache[name]) { const c = canvas(); fn(c.getContext('2d')); cache[name] = c; } return cache[name]; }
  function panel(name, build, anim) {
    ART[name] = (g, ax, ay, t, p) => {
      if (build) g.drawImage(built(name, build), ax, ay);
      if (anim) { g.save(); g.translate(ax, ay); anim(g, t, p); g.restore(); }
    };
  }

  /* ------------------------------------------------------------ pieces */
  function rain(g, t, n = 60, col = 0x2d, slant = 1) {
    for (let i = 0; i < n; i++) {
      const x = (i * 53 + t * 2 * slant) % (PW + 30) - 15, y = (i * 89 + t * 6) % PH;
      px(g, x, y, col, 1, 3);
    }
  }
  function snow(g, t, n = 50, col = 0x30) {
    for (let i = 0; i < n; i++) {
      const x = (i * 61 + Math.sin((t + i * 30) / 30) * 6 + t * 0.4) % PW, y = (i * 47 + t * (0.5 + (i % 3) * 0.25)) % PH;
      px(g, x, y, col, i % 4 === 0 ? 2 : 1, i % 4 === 0 ? 2 : 1);
    }
  }
  /* Lightning: true for a few frames each cycle; draws the flash and a bolt. */
  function lightning(g, t, period, phase, x0, x1, y1) {
    const k = (t + phase) % period;
    if (k > 12) return false;
    if (k < 2 || (k > 5 && k < 8)) { g.globalAlpha = 0.6; px(g, 0, 0, 0x30, PW, PH); g.globalAlpha = 1; }
    if (k < 9) FK.bolt(g, x0, 0, x1, y1, Math.floor((t + phase) / period) + 3);
    if (k === 0) FK.audio && FK.audio.sfx('thunder');
    return true;
  }
  function water(g, y0, h, base, glint, t, seed = 1) {
    px(g, 0, y0, base, PW, h);
    const r = FK.rng(seed);
    for (let i = 0; i < h * 3; i++) {
      const y = y0 + Math.floor(r() * h);
      const len = 3 + Math.floor(r() * 10);
      const x = (Math.floor(r() * PW) + Math.floor(t / (8 + (i % 5)))) % PW;
      px(g, x, y, glint, len, 1);
    }
  }
  function tomb(g, x, y, cross, col, edge) {
    if (cross) { px(g, x + 3, y - 14, col, 3, 14); px(g, x, y - 10, col, 9, 3); px(g, x + 3, y - 14, edge, 1, 14); }
    else { px(g, x, y - 12, col, 9, 12); px(g, x + 1, y - 13, col, 7, 1); px(g, x + 2, y - 14, col, 5, 1); px(g, x, y - 12, edge, 1, 12); }
  }
  function deadTree(g, x, y, h, col, seed) {
    const r = FK.rng(seed);
    px(g, x, y - h, col, 3, h);
    const branch = (bx, by, len, dir, depth) => {
      for (let i = 0; i < len; i++) { px(g, bx + dir * i, by - Math.floor(i * 0.7), col, 1, 1); }
      if (depth > 0) { branch(bx + dir * len, by - Math.floor(len * 0.7), Math.floor(len * 0.6), dir, depth - 1); branch(bx + dir * Math.floor(len / 2), by - Math.floor(len * 0.35), Math.floor(len * 0.5), -dir, depth - 1); }
    };
    for (let k = 0; k < 4; k++) branch(x + 1, y - h + 4 + k * 6, 8 + Math.floor(r() * 8), k % 2 ? 1 : -1, 2);
  }
  /* A three-masted ship with furled sails. */
  function ship(g, x, y, col, lit) {
    for (let i = 0; i < 9; i++) px(g, x + i * 0.6, y + i, col, 70 - i * 1.2, 1);
    px(g, x + 50, y - 6, col, 18, 6); px(g, x - 2, y - 3, col, 10, 3);
    for (const [mx, mh] of [[16, 44], [34, 52], [52, 40]]) {
      px(g, x + mx, y - mh, col, 2, mh);
      for (let k = 0; k < 3; k++) px(g, x + mx - 9 + k * 2, y - mh + 6 + k * 13, col, 20 - k * 4, 2);
    }
    for (let i = 0; i < 20; i++) px(g, x - 14 + i, y - 4 - Math.floor(i * 0.5), col, 1, 1);
    for (let i = 0; i < 26; i++) { px(g, x + 17 + i * 0.7, y - 44 + i * 1.5, col); px(g, x + 35 - i * 0.7, y - 52 + i * 1.6, col); }
    if (lit) { px(g, x + 55, y - 4, 0x28, 2, 2); px(g, x + 60, y - 4, 0x28, 2, 2); }
  }
  function sledge(g, x, y, col, giant) {
    // Dogs in a line, then the sledge, then the driver.
    for (let d = 0; d < 4; d++) { const dx = x - 24 + d * 6; px(g, dx, y - 3, col, 5, 2); px(g, dx, y - 1, col, 1, 1); px(g, dx + 4, y - 1, col, 1, 1); px(g, dx + 4, y - 4, col, 1, 1); }
    px(g, x - 26, y - 3, col, 2, 1);
    px(g, x, y - 3, col, 10, 2); px(g, x - 1, y - 1, col, 13, 1);
    const hgt = giant ? 14 : 8;
    px(g, x + 4, y - 3 - hgt, col, giant ? 4 : 3, hgt);
    px(g, x + 4, y - 6 - hgt, col, giant ? 4 : 3, 3);
    if (giant) { px(g, x + 3, y - 12 - 2, col, 1, 6); px(g, x + 8, y - 12 - 2, col, 1, 4); }
  }
  function portrait(g, name, x, y) { const pic = FK.PIC[name]; if (pic) g.drawImage(pic, x, y); }
  function vignette(g, col = 0x0f, depth = 10) {
    for (let y = 0; y < PH; y++) for (let x = 0; x < PW; x++) {
      const d = Math.min(x, y, PW - 1 - x, PH - 1 - y);
      if (d < depth && FK.bayer(x, y) < (depth - d) / depth) px(g, x, y, col);
    }
  }
  function aurora(g, t) {
    for (let x = 0; x < PW; x++) {
      const y = 18 + Math.round(Math.sin((x + t * 0.5) / 26) * 6 + Math.sin(x / 9 + t / 40) * 2);
      for (let k = 0; k < 16; k++) {
        if (FK.bayer(x, y + k) < (1 - k / 16) * 0.55) px(g, x, y + k, k < 4 ? 0x2a : 0x1a);
      }
    }
  }
  function iceField(g, y0, seed) {
    const r = FK.rng(seed);
    px(g, 0, y0, 0x31, PW, PH - y0);
    for (let i = 0; i < 40; i++) {
      const x = Math.floor(r() * PW), y = y0 + 2 + Math.floor(r() * (PH - y0 - 2)), w = 6 + Math.floor(r() * 26);
      px(g, x, y, 0x21, w, 1);
      if (r() < 0.4) px(g, x + 2, y - 1, 0x30, Math.floor(w / 2), 1);
    }
    for (let x = 0; x < PW; x++) if (FK.bayer(x, y0) < 0.5) px(g, x, y0, 0x30);
  }
  function roomWall(g, base, line, seed) {
    for (let y = 0; y < PH; y++) for (let x = 0; x < PW; x++) {
      const bx = (x + (Math.floor(y / 8) % 2) * 8) % 16;
      px(g, x, y, (y % 8 === 0 || bx === 0) ? line : base);
    }
  }
  function candle(g, x, y, t) {
    px(g, x, y, 0x30, 3, 10); px(g, x, y + 10, 0x10, 5, 2);
    const f = Math.floor(t / 5) % 3;
    px(g, x + (f === 1 ? 0 : 1), y - 5, 0x28, 2, 4); px(g, x + 1, y - 3, 0x38, 1, 2);
    if (f === 2) px(g, x + 1, y - 6, 0x27, 1, 1);
  }
  function glow(g, cx, cy, r, col, amt = 0.5) {
    for (let y = cy - r; y < cy + r; y++) for (let x = cx - r; x < cx + r; x++) {
      const d = Math.hypot(x - cx, y - cy) / r;
      if (d < 1 && FK.bayer(x, y) < (1 - d) * amt) px(g, x, y, col);
    }
  }

  /* Draw a sprite frame into a panel. */
  function spr(g, name, frame, x, y, flip) { FK.drawSprite(g, name, frame, x, y, flip); }

  /* ------------------------------------------------------------ panels */
  panel('none', null, (g) => px(g, 0, 0, 0x0f, PW, PH));

  panel('ship', (g) => {
    const k = K();
    g.drawImage(k.sky(PW, PH, [[0x0f, 0], [0x02, 50, 24], [0x0c, 76, 10]]), 0, 0);
    k.stars(g, PW, 60, 12, 40, [0x30, 0x10, 0x31]);
    g.drawImage(k.mountains(PW, 40, 9, { peaks: 5, minH: 4, maxH: 20, lit: 0x10, dark: 0x00, snow: 0x30, snowDark: 0x10, snowDepth: 6, edge: 0x0f }), 0, 46);
    iceField(g, 84, 4);
    ship(g, 96, 88, 0x0f, true);
  }, (g, t) => { aurora(g, t); });

  panel('giant', (g) => {
    const k = K();
    g.drawImage(k.sky(PW, PH, [[0x10, 0], [0x31, 50, 30], [0x30, 78, 10]]), 0, 0);
    iceField(g, 80, 8);
  }, (g, t) => {
    const x = 20 + (t * 0.35) % 220;
    sledge(g, x, 82, 0x2d, true);
    // Fog drifts over everything.
    for (let i = 0; i < 6; i++) { const fx = (i * 70 + t * 0.2) % 290 - 40; for (let y = 60; y < 90; y++) for (let xx = fx; xx < fx + 50; xx++) if (FK.bayer(xx, y) < 0.18) px(g, xx, y, 0x30); }
  });

  panel('floe', (g) => {
    const k = K();
    g.drawImage(k.sky(PW, 60, [[0x0f, 0], [0x0c, 34, 20]]), 0, 0);
    k.stars(g, PW, 40, 23, 25, [0x30, 0x10]);
  }, (g, t) => {
    water(g, 60, 52, 0x0c, 0x1c, t, 5);
    for (let i = 0; i < 5; i++) { const fx = (i * 57 + 10) % PW; px(g, fx, 62 + i * 9, 0x31, 20 + (i * 7) % 16, 3); px(g, fx, 62 + i * 9, 0x30, 12, 1); }
    const bob = Math.round(Math.sin(t / 20) * 1.5);
    px(g, 60, 82 + bob, 0x30, 70, 4); px(g, 62, 86 + bob, 0x21, 66, 3); px(g, 64, 89 + bob, 0x0f, 60, 1);
    spr(g, 'victor', 'kneel', 96, 59 + bob);
    px(g, 74, 79 + bob, 0x08, 14, 3); px(g, 72, 82 + bob, 0x08, 18, 1);
    ship(g, 170, 76, 0x0f, true);
  });

  panel('victorTalk', (g) => {
    // A ship's cabin by lamplight.
    for (let y = 0; y < PH; y++) for (let x = 0; x < PW; x++) px(g, x, y, (y % 12 === 0) ? 0x0f : (FK.bayer(x, y) < 0.2 ? 0x07 : 0x08));
    glow(g, 180, 40, 46, 0x18, 0.7);
    px(g, 170, 70, 0x07, 40, 4); px(g, 172, 74, 0x0f, 2, 38); px(g, 206, 74, 0x0f, 2, 38);
    portrait(g, 'victor', 84, 48);
    vignette(g);
  }, (g, t) => candle(g, 188, 58, t));

  panel('horror', (g) => {
    for (let y = 0; y < PH; y++) for (let x = 0; x < PW; x++) px(g, x, y, FK.bayer(x, y) < 0.25 ? 0x0c : 0x0f);
    glow(g, 112, 70, 70, 0x0c, 0.6);
  }, (g, t) => {
    const sx = t < 30 ? ((t >> 1) % 3) - 1 : 0;
    portrait(g, 'victorHorror', 84 + sx, 48);
  });

  panel('creatureTalk', (g) => {
    const k = K();
    g.drawImage(k.sky(PW, PH, [[0x0c, 0], [0x1c, 40, 20], [0x31, 70, 16]]), 0, 0);
    g.drawImage(k.mountains(PW, 70, 31, { peaks: 4, minH: 20, maxH: 66, lit: 0x30, dark: 0x10, snow: 0x30, snowDark: 0x31, edge: 0x2d }), 0, 42);
    portrait(g, 'creature', 84, 48);
  }, (g, t) => snow(g, t, 30));

  panel('eye', null, (g, t) => {
    const f = t < 40 ? 'eye0' : t < 56 ? 'eye1' : 'eye2';
    portrait(g, f, 0, 0);
    // The light gutters.
    if (t % 23 < 3) { g.globalAlpha = 0.35; px(g, 0, 0, 0x0f, PW, PH); g.globalAlpha = 1; }
  });

  panel('geneva', (g) => {
    const k = K();
    g.drawImage(k.sky(PW, PH, [[0x21, 0], [0x31, 40, 16], [0x30, 60, 8]]), 0, 0);
    g.drawImage(k.clouds(PW, 40, 2, 4, { y0: 6, y1: 30, outline: 0x31, dark: 0x30, lit: 0x30 }), 0, 0);
    g.drawImage(k.mountains(PW, 60, 14, { peaks: 4, minH: 14, maxH: 56, lit: 0x30, dark: 0x10, snow: 0x30, snowDark: 0x31, edge: 0x2d }), 0, 18);
    g.drawImage(k.mountains(PW, 30, 3, { peaks: 6, minH: 4, maxH: 22, lit: 0x1a, dark: 0x0a, edge: 0x0f, jitter: 2 }), 0, 54);
    g.drawImage(k.skyline(PW, 30, 7, { col: 0x08, minH: 6, maxH: 16, windows: 0.2, lit: 0x28, towers: [150] }), 0, 58);
  }, (g, t) => water(g, 86, 26, 0x11, 0x31, t, 3));

  panel('oak', (g) => {
    const k = K();
    g.drawImage(k.sky(PW, PH, [[0x0f, 0], [0x03, 60, 30], [0x0f, 96, 10]]), 0, 0);
    px(g, 0, 96, 0x0f, PW, 16);
  }, (g, t) => {
    const struck = t >= 18;
    if (t >= 18 && t < 30) { g.globalAlpha = (t % 4 < 2) ? 0.8 : 0.3; px(g, 0, 0, 0x30, PW, PH); g.globalAlpha = 1; FK.bolt(g, 120, 0, 112, 50, 9); }
    if (!struck) {
      // A great old oak: broad trunk and a rounded crown.
      px(g, 106, 56, 0x0f, 12, 40);
      const crown = [[112, 40, 34], [92, 50, 20], [132, 50, 20], [112, 28, 22]];
      for (const [cx, cy, r] of crown) for (let y = -r; y < r; y++) for (let x = -r; x < r; x++) if (x * x + y * y * 1.6 < r * r) px(g, cx + x, cy + y, 0x0f);
    } else {
      px(g, 107, 74, 0x0f, 10, 22);
      for (let i = 0; i < 5; i++) px(g, 107 + i * 2, 70 - (i % 2) * 5, 0x0f, 2, 6);
      // "a thin ribbon of wood": the stump smoulders.
      for (let i = 0; i < 6; i++) { const sy = (t * 0.6 + i * 9) % 50; px(g, 110 + Math.sin((t + i * 20) / 10) * 3, 70 - sy, 0x2d, 2, 2); }
      if (t % 6 < 3) px(g, 110, 72, 0x27, 3, 2);
    }
  });

  panel('coach', (g) => {
    const k = K();
    g.drawImage(k.sky(PW, PH, [[0x02, 0], [0x13, 36, 20], [0x26, 64, 16], [0x27, 80, 8]]), 0, 0);
    g.drawImage(k.skyline(PW, 40, 11, { col: 0x03, minH: 8, maxH: 22, windows: 0.15, lit: 0x28, towers: [150, 168] }), 0, 52);
    px(g, 0, 92, 0x08, PW, 20);
    for (let x = 0; x < PW; x++) if (FK.bayer(x, 92) < 0.5) px(g, x, 92, 0x18);
  }, (g, t) => {
    const x = -60 + (t * 0.6) % 300;
    const c = 0x0f, bob = (t >> 3) % 2;
    // Horses, the coach box, wheels.
    for (const hx of [x + 44, x + 56]) { px(g, hx, 82 + bob, c, 10, 5); px(g, hx + 9, 78 + bob, c, 3, 5); px(g, hx + 1, 87, c, 1, 5); px(g, hx + 8, 87, c, 1, 5); }
    px(g, x, 72, c, 34, 14); px(g, x + 3, 69, c, 28, 3); px(g, x + 6, 74, 0x28, 5, 4); px(g, x + 22, 74, 0x28, 5, 4);
    px(g, x + 30, 76, c, 14, 2);
    for (const wx of [x + 6, x + 26]) { px(g, wx - 4, 86, c, 9, 7); px(g, wx - 1, 88, 0x18, 3, 3); }
    // Luggage on the roof: three books, held down with a strap.
    px(g, x + 8, 65, 0x06, 6, 4); px(g, x + 15, 65, 0x06, 6, 4); px(g, x + 22, 66, 0x06, 6, 3);
  });

  panel('windBooks', null, (g, t) => {
    FK.BG.dusk.draw(g, 300 + t * 0.3, 0, t);
    // Roofs in the foreground.
    for (let x = 0; x < PW; x += 16) { const h = 70 + ((x * 13) % 30); px(g, x, h, 0x17, 16, PH - h); px(g, x, h, 0x0f, 16, 1); for (let y = h + 4; y < PH; y += 4) px(g, x, y, 0x07, 16, 1); }
    // The gale, and three books tumbling off over the rooftops.
    for (let i = 0; i < 9; i++) { const wx = (i * 37 + t * 3) % 260 - 20, wy = 20 + (i * 23) % 50; px(g, wx, wy, 0x30, 10, 1); px(g, wx + 12, wy + 1, 0x30, 4, 1); }
    for (let b = 0; b < 3; b++) {
      const bt = (t + b * 40) % 160;
      const bx = 20 + bt * 1.3 + b * 10, by = 70 - Math.sin(bt / 160 * Math.PI) * 50 + b * 6;
      FK.drawSprite(g, 'items', 'tome', bx, by, (Math.floor(bt / 6) + b) % 2 === 0);
    }
  });

  panel('lecture', (g) => {
    for (let y = 0; y < PH; y++) for (let x = 0; x < PW; x++) px(g, x, y, (x % 24 === 0) ? 0x0f : (FK.bayer(x, y) < 0.15 ? 0x18 : 0x08));
    // A blackboard of chemistry.
    px(g, 12, 10, 0x07, 62, 50); px(g, 15, 13, 0x0a, 56, 44);
    const marks = ['H2O', 'NACL', 'O+H', 'AU?'];
    marks.forEach((m, i) => FK.text(g, m, 18, 16 + i * 10, 0x10));
    px(g, 150, 10, 0x07, 62, 50); px(g, 153, 13, 0x0a, 56, 44);
    for (let i = 0; i < 6; i++) px(g, 158 + i * 7, 20 + (i % 3) * 9, 0x10, 5, 1);
    for (let i = 0; i < 4; i++) { px(g, 160 + i * 10, 44, 0x10, 1, 6); px(g, 158 + i * 10, 44, 0x10, 5, 1); }
    portrait(g, 'waldman', 84, 48);
    px(g, 70, 100, 0x07, 84, 12); px(g, 70, 100, 0x18, 84, 1);
  });

  panel('study', (g) => {
    roomWall(g, 0x08, 0x0f);
    // Window: night, a moon.
    px(g, 140, 10, 0x0f, 60, 56); px(g, 143, 13, 0x02, 54, 50); FK.moon(g, 180, 30, 9);
    px(g, 169, 13, 0x0f, 2, 50); px(g, 143, 37, 0x0f, 54, 2);
    // Desk, books, an open folio, a skull, a flask.
    px(g, 0, 78, 0x07, PW, 6); px(g, 0, 84, 0x0f, PW, 28); px(g, 0, 78, 0x17, PW, 1);
    const books = [[10, 0x06], [20, 0x02], [28, 0x0a], [36, 0x18], [44, 0x06]];
    for (const [bx, col] of books) { px(g, bx, 52 + (bx % 7), col, 7, 26 - (bx % 7)); px(g, bx, 52 + (bx % 7), 0x0f, 1, 26 - (bx % 7)); }
    px(g, 66, 70, 0x37, 40, 8); px(g, 86, 70, 0x0f, 1, 8); for (let i = 0; i < 4; i++) { px(g, 69, 72 + i * 2, 0x2d, 14, 1); px(g, 89, 72 + i * 2, 0x2d, 14, 1); }
    // Skull.
    px(g, 118, 62, 0x30, 14, 12); px(g, 120, 74, 0x30, 10, 4); px(g, 121, 66, 0x0f, 3, 3); px(g, 126, 66, 0x0f, 3, 3); px(g, 124, 70, 0x0f, 2, 2);
    for (let i = 0; i < 4; i++) px(g, 121 + i * 2, 75, 0x0f, 1, 3);
    // Flask on a stand.
    px(g, 190, 56, 0x31, 4, 10); px(g, 184, 64, 0x31, 16, 12); px(g, 186, 68, 0x2c, 12, 6); px(g, 184, 64, 0x30, 2, 8);
  }, (g, t) => { candle(g, 150, 66, t); glow(g, 151, 62, 30, 0x18, 0.25); });

  panel('graveyard', (g) => {
    const k = K();
    g.drawImage(k.sky(PW, PH, [[0x0f, 0], [0x02, 40, 30], [0x0c, 80, 14]]), 0, 0);
    k.stars(g, PW, 50, 33, 30, [0x30, 0x10]);
    FK.moon(g, 170, 28, 16);
    // The church.
    px(g, 20, 40, 0x0f, 34, 60); for (let i = 0; i < 30; i++) px(g, 28 + Math.floor(i * 0.3), 40 - i, 0x0f, Math.max(1, 18 - Math.floor(i * 0.6)), 1);
    px(g, 35, 4, 0x0f, 2, 8); px(g, 32, 7, 0x0f, 8, 2); px(g, 30, 60, 0x28, 4, 8); px(g, 42, 60, 0x28, 4, 8);
    px(g, 0, 96, 0x0f, PW, 16);
    deadTree(g, 196, 98, 46, 0x0f, 5);
    const r = FK.rng(8);
    for (let i = 0; i < 12; i++) tomb(g, 60 + i * 12 + Math.floor(r() * 4), 98 + Math.floor(r() * 4), r() < 0.4, 0x2d, 0x10);
  }, (g, t) => {
    for (let i = 0; i < 5; i++) { const fx = (i * 60 + t * 0.3) % 280 - 40; for (let y = 86; y < 104; y++) for (let x = fx; x < fx + 60; x++) if (FK.bayer(x, y) < 0.2) px(g, x, y, 0x10); }
  });

  panel('vault', (g) => {
    for (let y = 0; y < PH; y++) for (let x = 0; x < PW; x++) {
      const bx = (x + (Math.floor(y / 10) % 2) * 10) % 20;
      px(g, x, y, (y % 10 === 0 || bx === 0) ? 0x0f : (FK.bayer(x, y) < 0.2 ? 0x00 : 0x2d));
    }
    // Arches.
    for (const ax of [10, 80, 150]) for (let y = 20; y < PH; y++) for (let x = ax; x < ax + 60; x++) {
      const dx = x - (ax + 30), dy = y - 50;
      if (y > 50 || dx * dx + dy * dy < 900) px(g, x, y, 0x0f);
    }
    // Coffins on the shelves.
    for (const [cx, cy] of [[18, 70], [88, 64], [158, 72], [30, 92], [168, 94]]) { px(g, cx, cy, 0x07, 40, 9); px(g, cx, cy, 0x17, 40, 1); px(g, cx + 18, cy + 2, 0x18, 2, 5); px(g, cx + 16, cy + 3, 0x18, 6, 1); }
  }, (g, t) => { const f = Math.floor(t / 4) % 3; glow(g, 112, 40, 40, 0x17, 0.35 + f * 0.05); px(g, 110, 40, 0x07, 4, 14); px(g, 109 + (f % 2), 34, 0x28, 4, 6); px(g, 111, 36, 0x38, 2, 3); });

  panel('towerStorm', (g) => {
    const k = K();
    g.drawImage(k.sky(PW, PH, [[0x0f, 0], [0x03, 50, 30], [0x0f, 100, 10]]), 0, 0);
    g.drawImage(k.skyline(PW, 60, 41, { col: 0x0f, minH: 14, maxH: 34, windows: 0.06, lit: 0x28 }), 0, 54);
    // The tall house, the window at the top lit.
    px(g, 128, 18, 0x0f, 40, 94); for (let i = 0; i < 16; i++) px(g, 128 + i, 18 - i, 0x0f, 40 - i * 2, 1);
    px(g, 142, 30, 0x38, 10, 12); px(g, 146, 30, 0x0f, 2, 12); px(g, 142, 35, 0x0f, 10, 2);
    glow(g, 147, 36, 22, 0x28, 0.25);
  }, (g, t) => { lightning(g, t, 120, 40, 60, 140, 24); rain(g, t, 80, 0x2d); });

  panel('labTable', (g) => {
    roomWall(g, 0x0c, 0x0f);
    // A window streaming with rain.
    px(g, 160, 8, 0x0f, 52, 52); px(g, 163, 11, 0x02, 46, 46); px(g, 185, 11, 0x0f, 2, 46); px(g, 163, 33, 0x0f, 46, 2);
    // Apparatus: jars, a coil, wires.
    for (const jx of [14, 30]) { px(g, jx, 56, 0x31, 12, 18); px(g, jx + 2, 60, 0x10, 8, 12); px(g, jx + 5, 50, 0x28, 2, 6); px(g, jx + 4, 48, 0x28, 4, 2); }
    for (let i = 0; i < 8; i++) px(g, 48, 50 + i * 3, 0x17, 10, 1);
    px(g, 52, 46, 0x00, 2, 30);
    for (let i = 0; i < 40; i++) px(g, 54 + i, 48 + Math.floor(Math.sin(i / 6) * 3) + Math.floor(i / 5), 0x0f);
    // The table, the sheet, the shape beneath it.
    px(g, 60, 80, 0x07, 120, 6); px(g, 64, 86, 0x0f, 4, 26); px(g, 172, 86, 0x0f, 4, 26);
    for (let x = 62; x < 178; x++) {
      const bump = x < 80 ? 6 + Math.sin((x - 62) / 18 * Math.PI) * 4 : x > 150 && x < 166 ? 8 + Math.sin((x - 150) / 16 * Math.PI) * 6 : 5 + Math.sin(x / 9) * 1;
      for (let y = 80 - bump; y < 82; y++) px(g, x, y, y < 80 - bump + 2 ? 0x30 : 0x10);
    }
    px(g, 172, 70, 0x37, 4, 6); px(g, 177, 70, 0x37, 4, 6);
  }, (g, t) => {
    for (let i = 0; i < 12; i++) { const rx = 164 + (i * 11) % 44, ry = 12 + (i * 17 + t * 2) % 44; px(g, rx, ry, 0x21, 1, 2); }
    candle(g, 120, 62, t); glow(g, 121, 58, 30, 0x18, t % 23 < 3 ? 0.05 : 0.3);
    if (t % 40 < 4) { px(g, 20, 46 + (t % 4), 0x30, 1, 4); px(g, 36, 45, 0x31, 1, 3); }
  });

  panel('bedside', (g) => {
    roomWall(g, 0x0f, 0x03);
    // Moonlight through a window, falling across the floor.
    px(g, 20, 14, 0x0c, 34, 42); px(g, 36, 14, 0x0f, 2, 42); px(g, 20, 34, 0x0f, 34, 2);
    for (let y = 56; y < PH; y++) for (let x = 20 + (y - 56); x < 64 + (y - 56) * 1.4; x++) if (FK.bayer(x, y) < 0.35) px(g, x, y, 0x0c);
    // The bed and its curtain, held aside.
    px(g, 120, 70, 0x10, 104, 16); px(g, 120, 70, 0x30, 104, 3); px(g, 116, 30, 0x0f, 4, 82);
    for (let x = 150; x < 224; x += 6) px(g, x, 12, 0x05, 4, 58);
    px(g, 120, 12, 0x05, 30, 4); for (let i = 0; i < 40; i++) px(g, 128 + Math.floor(Math.sin(i / 6) * 3), 16 + i, 0x05, 6, 1);
  }, (g, t) => {
    spr(g, 'creature', 'idle', 96 + Math.min(10, t / 6), 82 - 32);
    // One hand stretched out.
    if (t > 40) { px(g, 114 + Math.min(10, t / 6), 63, 0x38, 8, 2); px(g, 121 + Math.min(10, t / 6), 62, 0x38, 2, 4); }
  });

  panel('dawn', (g) => {
    const k = K();
    g.drawImage(k.sky(PW, PH, [[0x21, 0], [0x31, 40, 20], [0x37, 70, 14]]), 0, 0);
    g.drawImage(k.skyline(PW, 70, 19, { col: 0x2d, minH: 26, maxH: 60, windows: 0.1, lit: 0x28, chimneys: true, towers: [40] }), 0, 42);
    px(g, 0, 100, 0x00, PW, 12);
  }, (g, t) => {
    const x = Math.min(120, -60 + t * 1.2);
    for (const hx of [x + 44, x + 56]) { px(g, hx, 90, 0x0f, 10, 5); px(g, hx + 9, 86, 0x0f, 3, 5); px(g, hx + 1, 95, 0x0f, 1, 5); px(g, hx + 8, 95, 0x0f, 1, 5); }
    px(g, x, 80, 0x0f, 34, 14); px(g, x + 3, 77, 0x0f, 28, 3); px(g, x + 6, 83, 0x37, 5, 4); px(g, x + 22, 83, 0x37, 5, 4);
    for (const wx of [x + 6, x + 26]) px(g, wx - 4, 94, 0x0f, 9, 7);
    if (t > 120) spr(g, 'victor', 'idle', 160, 100 - 24, true);
  });

  panel('letter', (g) => {
    for (let y = 0; y < PH; y++) for (let x = 0; x < PW; x++) px(g, x, y, FK.bayer(x, y) < 0.3 ? 0x07 : 0x08);
    // The letter, a broken seal.
    for (let y = 10; y < 104; y++) px(g, 44 + Math.floor((y - 10) * 0.08), y, 0x37, 130, 1);
    for (let i = 0; i < 11; i++) { const w = 90 + ((i * 37) % 30); for (let x = 0; x < w; x += 3 + (x % 7 === 0 ? 3 : 0)) px(g, 58 + x + Math.floor(i * 0.7), 22 + i * 7, 0x2d, 2, 1); }
    FK.text(g, 'MY DEAR VICTOR,', 58, 12, 0x08);
    px(g, 150, 88, 0x06, 10, 8); px(g, 152, 90, 0x16, 6, 4); px(g, 158, 92, 0x06, 4, 2);
  }, (g, t) => candle(g, 200, 50, t));

  panel('alpsStorm', (g) => {
    const k = K();
    g.drawImage(k.sky(PW, PH, [[0x0f, 0], [0x02, 50, 30], [0x0f, 90, 10]]), 0, 0);
    g.drawImage(k.mountains(PW, 70, 51, { peaks: 4, minH: 20, maxH: 64, lit: 0x2d, dark: 0x0f, snow: 0x10, snowDark: 0x00, edge: 0x0f }), 0, 30);
    px(g, 0, 92, 0x0f, PW, 20);
  }, (g, t) => { water(g, 92, 20, 0x0f, 0x0c, t, 9); lightning(g, t, 110, 20, 90, 70, 50); rain(g, t, 70); });

  panel('flashFigure', (g) => {
    px(g, 0, 0, 0x0f, PW, PH);
  }, (g, t) => {
    const k = (t + 6) % 90;
    const lit = k < 10 && (k < 3 || k > 6);
    const kit = K();
    if (!cache.flashLit) {
      const c = canvas(), cg = c.getContext('2d');
      cg.drawImage(kit.sky(PW, PH, [[0x10, 0], [0x30, 70, 20]]), 0, 0);
      cg.drawImage(kit.mountains(PW, 90, 61, { peaks: 3, minH: 20, maxH: 86, lit: 0x00, dark: 0x0f, snow: 0x10, snowDark: 0x2d, edge: 0x0f, jitter: 8 }), 0, 22);
      cache.flashLit = c;
    }
    if (lit || k < 12) {
      g.drawImage(cache.flashLit, 0, 0);
      // His silhouette on the rocks, high up.
      FK.drawSprite(g, 'creature', 'run1', 150 + Math.floor(t / 90) * 8 % 40, 34, false);
      if (k === 0) FK.audio && FK.audio.sfx('thunder');
      if (k < 8) FK.bolt(g, 40, 0, 70, 70, Math.floor(t / 90));
    } else rain(g, t, 60, 0x0c);
  });

  panel('trial', (g) => {
    for (let y = 0; y < PH; y++) for (let x = 0; x < PW; x++) px(g, x, y, (x % 20 === 0) ? 0x0f : 0x07);
    // The bench, three judges, the lone figure under a high window.
    px(g, 20, 36, 0x08, 184, 30); px(g, 20, 36, 0x18, 184, 2);
    for (const jx of [60, 104, 148]) { px(g, jx, 16, 0x0f, 16, 20); px(g, jx + 2, 8, 0x30, 12, 10); px(g, jx + 4, 12, 0x36, 8, 6); px(g, jx, 18, 0x30, 3, 10); px(g, jx + 13, 18, 0x30, 3, 10); }
    for (let y = 0; y < PH; y++) for (let x = 100 - y * 0.3; x < 124 + y * 0.3; x++) if (FK.bayer(x, y) < 0.25) px(g, x, y, 0x37);
    px(g, 107, 74, 0x0f, 10, 30); px(g, 108, 66, 0x36, 8, 8); px(g, 107, 64, 0x08, 10, 4); px(g, 105, 82, 0x10, 14, 22);
  });

  panel('chamounix', (g) => {
    const k = K();
    g.drawImage(k.sky(PW, PH, [[0x21, 0], [0x31, 50, 24]]), 0, 0);
    g.drawImage(k.mountains(PW, 100, 71, { peaks: 4, minH: 30, maxH: 96, lit: 0x30, dark: 0x10, snow: 0x30, snowDark: 0x31, edge: 0x2d, slope: 1.3 }), 0, 12);
    // The glacier flowing down the valley between the peaks.
    for (let y = 60; y < PH; y++) { const w = 14 + (y - 60) * 1.4, cx = 112 + Math.sin(y / 14) * 6; px(g, cx - w / 2, y, 0x31, w, 1); if (y % 5 === 0) px(g, cx - w / 2 + 3, y, 0x21, w - 6, 1); }
    g.drawImage(k.forest(PW, 30, 4, { col: 0x0a, floor: 6, gap: 6, minH: 10, maxH: 24, width: 4, lit: 0x1a }), 0, 84);
  });

  panel('forest', (g) => {
    const k = K();
    g.drawImage(k.sky(PW, PH, [[0x37, 0], [0x27, 40, 20], [0x17, 80, 10]]), 0, 0);
    // Shafts of morning light between the trunks.
    for (let y = 0; y < PH; y++) for (let x = 0; x < PW; x++) { const band = ((x - y * 0.5) % 40 + 40) % 40; if (band < 8 && FK.bayer(x, y) < 0.35) px(g, x, y, 0x38); }
    g.drawImage(k.forest(PW, 80, 12, { col: 0x0b, floor: 10, gap: 14, minH: 40, maxH: 76, width: 10, lit: 0x1b }), 0, 32);
    for (let i = 0; i < 10; i++) px(g, i * 24 + 6, 40, 0x08, 4, 72);
  }, (g, t) => { const bx = (t * 0.8) % 260 - 20; px(g, bx, 30 + Math.sin(t / 5) * 2, 0x0f, 3, 1); px(g, bx + 1, 29 + ((t >> 2) % 2), 0x0f, 1, 1); });

  panel('fire', (g) => {
    const k = K();
    g.drawImage(k.sky(PW, PH, [[0x0f, 0], [0x02, 70, 30]]), 0, 0);
    k.stars(g, PW, 60, 3, 30, [0x30, 0x10]);
    g.drawImage(k.forest(PW, 60, 22, { col: 0x0f, floor: 8, gap: 10, minH: 26, maxH: 54, width: 8 }), 0, 52);
  }, (g, t) => {
    glow(g, 112, 90, 50, 0x17, 0.4);
    for (let i = 0; i < 5; i++) px(g, 98 + i * 6, 98, 0x08, 5, 3);
    FK.drawSprite(g, 'props', ['fire1', 'fire2', 'fire3'][Math.floor(t / 5) % 3], 104, 82);
    // A great yellow hand reaching toward the embers, then snatched back.
    const reach = t < 50 ? Math.min(1, t / 50) : Math.max(0, 1 - (t - 50) / 6);
    const hx = 170 - reach * 46;
    px(g, hx, 84, 0x38, 54, 7); px(g, hx, 84, 0x0f, 54, 1); px(g, hx, 90, 0x28, 54, 1);
    for (let f = 0; f < 4; f++) px(g, hx - 6, 82 + f * 3, 0x38, 7, 2);
    if (t > 50 && t < 70) FK.text(g, '!', hx + 10, 64, 0x30);
  });

  function cottageScene(g, burning) {
    const k = K();
    g.drawImage(k.sky(PW, PH, burning ? [[0x0f, 0], [0x05, 50, 24], [0x16, 90, 14]] : [[0x0f, 0], [0x02, 50, 30], [0x0c, 90, 10]]), 0, 0);
    if (!burning) k.stars(g, PW, 50, 13, 30, [0x30, 0x10]);
    g.drawImage(k.forest(PW, 70, 33, { col: 0x0f, floor: 8, gap: 12, minH: 30, maxH: 60, width: 9, snow: burning ? undefined : 0x10 }), 0, 30);
    px(g, 0, 96, burning ? 0x0f : 0x30, PW, 16);
    // The cottage and the hovel leaning against it.
    const cx = 80;
    px(g, cx, 66, 0x08, 60, 32); for (let i = 0; i < 22; i++) px(g, cx - 4 + i, 66 - i, burning ? 0x0f : 0x2d, 68 - i * 2, 1);
    if (!burning) for (let i = 0; i < 22; i++) px(g, cx - 4 + i, 66 - i, 0x30, 3, 1);
    px(g, cx + 44, 34, 0x06, 6, 14);
    px(g, cx + 14, 76, burning ? 0x0f : 0x28, 10, 8); px(g, cx + 18, 76, 0x0f, 2, 8); px(g, cx + 34, 74, 0x07, 9, 24);
    px(g, cx + 60, 78, 0x08, 22, 20); for (let i = 0; i < 12; i++) px(g, cx + 60, 78 - i, 0x2d, 22 - i * 2, 1);
  }
  panel('cottage', (g) => cottageScene(g, false), (g, t) => {
    for (let i = 0; i < 6; i++) { const s = (t * 0.4 + i * 10) % 60; px(g, 126 + Math.sin((t + i * 13) / 12) * 3 + s * 0.3, 32 - s, 0x2d, 3, 2); }
    snow(g, t, 25);
  });
  panel('cottageBurn', (g) => cottageScene(g, true), (g, t) => {
    for (let i = 0; i < 26; i++) {
      const fx = 74 + (i * 13) % 76, s = (t * 1.5 + i * 7) % 40;
      px(g, fx + Math.sin((t + i * 9) / 5) * 2, 66 - s * 0.9, s < 12 ? 0x38 : s < 24 ? 0x28 : 0x16, 3, 3);
    }
    for (let i = 0; i < 10; i++) { const s = (t * 0.7 + i * 11) % 80; px(g, 90 + i * 6 + s * 0.2, 30 - s * 0.4, 0x2d, 2, 2); }
  });

  panel('road', (g) => {
    const k = K();
    g.drawImage(k.sky(PW, PH, [[0x0f, 0], [0x03, 60, 30], [0x07, 96, 10]]), 0, 0);
    FK.moon(g, 50, 24, 10, 0.4);
    g.drawImage(k.forest(PW, 70, 44, { col: 0x08, floor: 6, gap: 8, minH: 20, maxH: 50, width: 7, lit: 0x07 }), 0, 30);
    px(g, 0, 98, 0x08, PW, 14); for (let x = 0; x < PW; x++) if (FK.bayer(x, 98) < 0.5) px(g, x, 98, 0x18);
  }, (g, t) => {
    const fr = ['run1', 'run2', 'run3', 'run2'][Math.floor(t / 8) % 4];
    FK.drawSprite(g, 'creature', fr, 90 + Math.sin(t / 60) * 4, 98 - 30);
    for (let i = 0; i < 14; i++) { const lx = (i * 31 + t * 0.4) % PW, ly = (i * 19 + t * 0.7) % 100; px(g, lx + Math.sin((t + i * 10) / 9) * 3, ly, i % 2 ? 0x17 : 0x27, 2, 1); }
  });

  panel('rustic', (g) => {
    const k = K();
    g.drawImage(k.sky(PW, PH, [[0x31, 0], [0x30, 40, 20]]), 0, 0);
    g.drawImage(k.forest(PW, 60, 54, { col: 0x0a, floor: 6, gap: 9, minH: 20, maxH: 44, width: 6, lit: 0x1a }), 0, 30);
    px(g, 0, 86, 0x1a, PW, 26); px(g, 0, 86, 0x2a, PW, 1);
  }, (g, t) => {
    water(g, 96, 16, 0x11, 0x31, t, 4);
    FK.drawSprite(g, 'rustic', t > 18 && t < 30 ? 'throw' : 'idle', 40, 86 - 24, false);
    FK.drawSprite(g, 'creature', t > 22 ? 'hurt' : 'idle', 150, 86 - 32, true);
    if (t > 18 && t < 24) { px(g, 58, 69, 0x38, 6, 3); px(g, 60, 68, 0x30, 3, 5); }
    if (t > 18 && t < 50) for (let i = 0; i < 5; i++) px(g, 62 + (t - 18) * 0.4 + i * 3, 66 - i, 0x10, 3, 2);
  });

  panel('woods', (g) => {
    const k = K();
    g.drawImage(k.sky(PW, PH, [[0x03, 0], [0x13, 40, 20], [0x24, 70, 16]]), 0, 0);
    g.drawImage(k.skyline(PW, 30, 61, { col: 0x03, minH: 4, maxH: 12, windows: 0.3, lit: 0x28, towers: [120] }), 0, 64);
    g.drawImage(k.forest(PW, 90, 66, { col: 0x0f, floor: 12, gap: 16, minH: 50, maxH: 86, width: 12 }), 0, 22);
  });

  panel('orkney', (g) => {
    const k = K();
    g.drawImage(k.sky(PW, PH, [[0x2d, 0], [0x00, 40, 20], [0x10, 70, 10]]), 0, 0);
    g.drawImage(k.clouds(PW, 50, 71, 5, { y0: 8, y1: 40, outline: 0x2d, dark: 0x00, lit: 0x10 }), 0, 0);
    // A low island, bare rock, the hut.
    for (let x = 30; x < 200; x++) { const h = 70 - Math.sin((x - 30) / 170 * Math.PI) * 18 + Math.sin(x / 7) * 1.5; px(g, x, h, 0x2d, 1, PH - h); px(g, x, h, 0x10, 1, 1); }
    px(g, 120, 46, 0x08, 24, 14); for (let i = 0; i < 10; i++) px(g, 118 + i, 46 - i, 0x0f, 28 - i * 2, 1); px(g, 128, 50, 0x28, 4, 4);
  }, (g, t) => water(g, 80, 32, 0x0c, 0x10, t, 6));

  panel('casement', (g) => {
    px(g, 0, 0, 0x0f, PW, PH);
    // Moonlit sky beyond the window.
    const k = K();
    const sky = k.sky(120, 100, [[0x02, 0], [0x0c, 60, 20]]);
    g.drawImage(sky, 52, 6);
    FK.moon(g, 150, 22, 9);
    portrait(g, 'creatureGrin', 84, 44);
    // The window frame over him.
    px(g, 48, 4, 0x08, 128, 4); px(g, 48, 4, 0x08, 4, 108); px(g, 172, 4, 0x08, 4, 108); px(g, 110, 4, 0x08, 4, 108); px(g, 48, 56, 0x08, 128, 4);
    px(g, 48, 4, 0x18, 128, 1); px(g, 0, 98, 0x07, PW, 14); px(g, 0, 98, 0x17, PW, 1);
  });

  panel('boat', null, (g, t) => {
    const k = K();
    if (!cache.boatSky) cache.boatSky = k.sky(PW, 60, [[0x0f, 0], [0x2d, 40, 20]]);
    g.drawImage(cache.boatSky, 0, 0);
    // Rolling swell.
    for (let x = 0; x < PW; x++) {
      const y = 62 + Math.sin((x + t * 1.2) / 18) * 6 + Math.sin((x - t) / 7) * 2;
      px(g, x, y, 0x0c, 1, PH - y); px(g, x, y, 0x1c, 1, 1);
      if (FK.bayer(x, y) < 0.3) px(g, x, y + 1, 0x30);
    }
    const by = 60 + Math.sin((112 + t * 1.2) / 18) * 6, tilt = Math.cos((112 + t * 1.2) / 18) * 2;
    for (let i = 0; i < 6; i++) px(g, 96 + i, by + i * 0.5 + tilt * (i / 6), 0x07, 34 - i * 2, 1);
    FK.drawSprite(g, 'victor', 'kneel', 104, by - 22);
    px(g, 90, by - 4, 0x18, 1, 12); px(g, 132, by - 4, 0x18, 1, 12);
    rain(g, t, 50, 0x10, 2);
  });

  panel('ireland', (g) => {
    const k = K();
    g.drawImage(k.sky(PW, PH, [[0x10, 0], [0x30, 50, 20]]), 0, 0);
    g.drawImage(k.skyline(PW, 40, 81, { col: 0x2d, minH: 8, maxH: 20, windows: 0, chimneys: true }), 0, 48);
    px(g, 0, 84, 0x37, PW, 28); for (let x = 0; x < PW; x++) if (FK.bayer(x, 84) < 0.5) px(g, x, 84, 0x27);
    for (const fx of [70, 86, 130]) FK.drawSprite(g, 'villager2', 'idle', fx, 84 - 24, fx > 100);
  }, (g, t) => water(g, 98, 14, 0x00, 0x30, t, 8));

  panel('wedding', (g) => {
    const k = K();
    g.drawImage(k.sky(PW, PH, [[0x13, 0], [0x24, 30, 20], [0x26, 56, 14], [0x27, 72, 8]]), 0, 0);
    g.drawImage(k.mountains(PW, 50, 91, { peaks: 4, minH: 10, maxH: 40, lit: 0x24, dark: 0x13, snow: 0x35, snowDark: 0x24, edge: 0x03 }), 0, 30);
    water(g, 78, 34, 0x13, 0x26, 0, 12);
    portrait(g, 'elizabeth', 84, 48);
  });

  panel('window', (g) => {
    roomWall(g, 0x0f, 0x03);
    px(g, 70, 10, 0x08, 84, 80); px(g, 74, 14, 0x02, 76, 72);
    const k = K();
    g.drawImage(k.mountains(76, 40, 101, { peaks: 3, minH: 8, maxH: 30, lit: 0x0c, dark: 0x0f, snow: 0x2d, edge: 0x0f }), 74, 34);
    px(g, 74, 70, 0x0c, 76, 16);
    px(g, 0, 98, 0x07, PW, 14); px(g, 0, 98, 0x17, PW, 1);
  }, (g, t) => {
    // Curtains blowing in from the open window; the shape outside.
    for (let y = 10; y < 92; y++) { const w = 10 + Math.sin((y + t) / 9) * 4 + (y - 10) * 0.06; px(g, 70, y, 0x30, w, 1); px(g, 154 - w, y, 0x30, w, 1); }
    if (t > 20) FK.drawSprite(g, 'creature', 'idle', 104, 54, true);
  });

  panel('graves', (g) => {
    const k = K();
    g.drawImage(k.sky(PW, PH, [[0x00, 0], [0x10, 50, 30]]), 0, 0);
    g.drawImage(k.mountains(PW, 50, 111, { peaks: 4, minH: 10, maxH: 40, lit: 0x10, dark: 0x00, snow: 0x30, snowDark: 0x10, edge: 0x2d }), 0, 36);
    px(g, 0, 90, 0x0a, PW, 22); for (let x = 0; x < PW; x++) if (FK.bayer(x, 90) < 0.5) px(g, x, 90, 0x1a);
    for (const [gx, cross] of [[80, true], [110, false], [140, true]]) tomb(g, gx, 92, cross, 0x10, 0x30);
    FK.drawSprite(g, 'victor', 'kneel', 104, 92 - 24, true);
  }, (g, t) => rain(g, t, 30, 0x10));

  panel('tartary', (g) => {
    const k = K();
    g.drawImage(k.sky(PW, PH, [[0x10, 0], [0x30, 60, 20]]), 0, 0);
    g.drawImage(k.forest(PW, 50, 121, { col: 0x2d, floor: 4, gap: 30, minH: 20, maxH: 40, width: 7, snow: 0x30 }), 0, 46);
    px(g, 0, 94, 0x30, PW, 18);
    // A tree with words cut into its bark, nearest us.
    px(g, 170, 30, 0x08, 10, 66); for (let i = 0; i < 6; i++) px(g, 172, 40 + i * 6, 0x37, 2 + (i % 3) * 2, 1);
  }, (g, t) => { sledge(g, 20 + (t * 0.4) % 140, 96, 0x0f, false); snow(g, t, 60); });

  panel('cabin', (g) => {
    for (let y = 0; y < PH; y++) for (let x = 0; x < PW; x++) px(g, x, y, (y % 12 === 0) ? 0x0f : (FK.bayer(x, y) < 0.2 ? 0x07 : 0x08));
    glow(g, 40, 50, 40, 0x18, 0.5);
    // The bunk and the covered form.
    px(g, 0, 80, 0x07, 120, 8); px(g, 0, 72, 0x30, 110, 8); px(g, 0, 72, 0x10, 110, 1); px(g, 96, 66, 0x30, 12, 6);
    portrait(g, 'creature', 140, 48);
    vignette(g);
  }, (g, t) => candle(g, 36, 58, t));

  panel('raft', null, (g, t) => {
    const k = K();
    if (!cache.raftSky) { const c = canvas(); const cg = c.getContext('2d'); cg.drawImage(k.sky(PW, PH, [[0x0f, 0], [0x02, 50, 30], [0x0c, 70, 10]]), 0, 0); k.stars(cg, PW, 60, 131, 40, [0x30, 0x10]); cache.raftSky = c; }
    g.drawImage(cache.raftSky, 0, 0);
    water(g, 70, 42, 0x0f, 0x0c, t, 13);
    // The raft draws away into the dark, smaller and smaller.
    const d = Math.min(1, t / 360);
    const s = 1 - d * 0.85;
    const x = 112 + d * 70, y = 92 - d * 20;
    px(g, x - 14 * s, y, 0x31, 28 * s, Math.max(1, 3 * s));
    if (s > 0.4) FK.drawSprite(g, 'creature', 'idle', x - 10, y - 30, true);
    else px(g, x - 1, y - 6 * s * 3, 0x2d, 2, Math.max(2, 10 * s));
    ship(g, 10, 88, 0x0f, true);
    if (t > 300) { g.globalAlpha = Math.min(1, (t - 300) / 120); px(g, 0, 0, 0x0f, PW, PH); g.globalAlpha = 1; }
  });
})();
