'use strict';
/*
 * JEKYLL.EXE: the pictures above the story pages, 256x120 (fifteen rows of
 * cells), drawn in code the way Spectrum adventure pictures were: lines,
 * fills and dither patterns, then colour painted on cell by cell. Each
 * takes the screen and the frame count (for flicker and drifting fog).
 */
(() => {
  const A = JH.attr;
  const I = JH.INK;
  const P = JH.PAT;
  const PH = 120; // picture height in pixels
  JH.PICS = {};
  const pic = (name, fn) => { JH.PICS[name] = fn; };

  /* ------------------------------------------------------------ toolkit */

  let seed = 1;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const reseed = (n) => { seed = n; };

  const paint = (s, cx, cy, cw, ch, ink, paper = 0, bright = 0) => s.paint(cx, cy, cw, ch, A(ink, paper, bright));

  function frame(s) {
    s.clear(0, 0, 256, PH, 0);
    paint(s, 0, 0, 32, 15, I.white);
  }
  function stars(s, n, y1, sd) {
    reseed(sd);
    for (let k = 0; k < n; k++) s.plot(Math.floor(rand() * 256), Math.floor(rand() * y1), 1);
  }
  function moon(s, x, y, r, phase = 0) {
    s.disc(x, y, r, 1);
    if (phase) s.disc(x + phase, y - 1, r, 0);
  }
  /* Fog drifting in bands: a dither ORed over the picture. */
  function fog(s, y, h, t, pat = P.d25, speed = 0.25) {
    const off = Math.floor(t * speed) % 8;
    for (let j = y; j < Math.min(PH, y + h); j++) {
      for (let i = 0; i < 256; i++) {
        if (pat[(j % 8) * 8 + ((i + off) % 8)]) s.plot(i, j, 1);
      }
    }
  }
  function hatch(s, x, y, w, h, pat, mode = 'set') { s.pattern(x, y, w, h, pat, 8, 8, mode); }

  /* A sprite from art.js, blown up. */
  function big(s, name, x, y, k = 2, frameNo = 0, flip = false) {
    const sp = JH.SPRITES[name] || JH.SPRITES.gent;
    const b = sp.frames[frameNo % sp.frames.length], m = sp.masks[frameNo % sp.frames.length];
    for (let j = 0; j < 16; j++) for (let i = 0; i < 16; i++) {
      const si = j * 16 + (flip ? 15 - i : i);
      if (!m[si]) continue;
      s.clear(x + i * k, y + j * k, k, k, b[si] ? 1 : 0);
    }
  }
  function lampPost(s, x, base, h = 46) {
    s.clear(x - 1, base - h, 3, h, 1);
    s.clear(x - 4, base - 2, 9, 2, 1);
    s.rect(x - 5, base - h - 10, 11, 10, 1);
    s.clear(x - 3, base - h - 8, 7, 6, 0);
    s.plot(x, base - h - 6, 1); s.plot(x, base - h - 5, 1);
    s.clear(x - 6, base - h - 11, 13, 1, 1);
  }
  function windows(s, x, y, cols, rows, w = 8, h = 10, gx = 6, gy = 8, lit = []) {
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const wx = x + c * (w + gx), wy = y + r * (h + gy);
      s.rect(wx, wy, w, h, 1);
      s.line(wx + w / 2 | 0, wy, wx + w / 2 | 0, wy + h - 1, 1);
      if (lit.includes(r * cols + c)) hatch(s, wx + 1, wy + 1, w - 2, h - 2, P.d50, 'or');
    }
  }
  function bricks(s, x, y, w, h) {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) {
      const row = Math.floor((j - y) / 4);
      if ((j - y) % 4 === 3 || (i - x + (row % 2) * 4) % 8 === 7) { if ((i + j) % 2 === 0) s.plot(i, j, 1); }
    }
  }
  function door(s, x, y, w, h, blistered = false) {
    s.rect(x, y, w, h, 1);
    s.rect(x + 2, y + 2, w - 4, h - 2, 1);
    s.line(x + (w >> 1), y + 2, x + (w >> 1), y + h - 1, 1);
    if (blistered) {
      reseed(77);
      for (let k = 0; k < 40; k++) s.plot(x + 3 + Math.floor(rand() * (w - 6)), y + 3 + Math.floor(rand() * (h - 5)), 1);
    }
  }
  function floorLines(s, y0, y1, vx = 128) {
    for (let k = 0; k <= 8; k++) s.line(vx + (k - 4) * 6, y0, (k - 4) * 64 + 128, y1, 1);
    for (let y = y0; y < y1; y += Math.max(2, Math.floor((y - y0) / 3) + 2)) s.line(0, y, 255, y, 1);
  }
  function flame(s, x, y, t) {
    const h = 3 + ((t >> 2) % 3);
    for (let j = 0; j < h; j++) s.line(x - (h - j > 2 ? 1 : 0), y - j, x + (h - j > 2 ? 1 : 0), y - j, 1);
  }
  function candle(s, x, y, t) {
    s.clear(x - 1, y, 3, 8, 1);
    flame(s, x, y - 2, t);
  }
  function fire(s, x, y, w, t) {
    for (let i = 0; i < w; i += 3) {
      const h = 4 + ((i * 7 + (t >> 2)) % 6);
      for (let j = 0; j < h; j++) s.plot(x + i + ((j + (t >> 3)) % 2), y - j, 1);
    }
  }
  const label = (s, str, x, y, hand) => JH.text(s, str, x, y, { hand });

  /* ------------------------------------------------------------ pictures */

  pic('blank', (s) => frame(s));

  // The title: the door in the by-street under a gas lamp, in the fog.
  pic('title', (s, t) => {
    frame(s);
    stars(s, 40, 40, 5);
    moon(s, 214, 20, 9, 4);
    paint(s, 0, 0, 32, 6, I.white, I.black, 0);
    paint(s, 25, 1, 4, 3, I.white, I.black, 1);
    // The sinister block: a gable, a blind forehead of wall, the door.
    s.line(84, 44, 128, 18, 1); s.line(128, 18, 172, 44, 1);
    s.clear(84, 44, 89, 76, 0);
    s.rect(84, 44, 89, 76, 1);
    bricks(s, 86, 46, 85, 30);
    hatch(s, 86, 60, 85, 16, P.d12, 'or');
    door(s, 112, 80, 32, 40, true);
    paint(s, 10, 2, 12, 8, I.red, I.black, 0);
    paint(s, 10, 10, 12, 5, I.red, I.black, 0);
    paint(s, 14, 10, 4, 5, I.red, I.black, 1);
    // Shops to either side.
    s.rect(0, 52, 80, 68, 1); windows(s, 8, 62, 4, 2, 10, 12, 8, 8, [1, 6]);
    s.rect(176, 52, 80, 68, 1); windows(s, 184, 62, 4, 2, 10, 12, 8, 8, [2]);
    paint(s, 0, 6, 10, 9, I.blue, I.black, 0);
    paint(s, 22, 6, 10, 9, I.blue, I.black, 0);
    // The lamp, and its light.
    lampPost(s, 60, 120, 52);
    paint(s, 6, 6, 3, 2, I.yellow, I.black, 1);
    paint(s, 7, 8, 1, 7, I.yellow, I.black, 0);
    // A small figure at the door, with his key.
    big(s, 'hyde', 146, 88, 2);
    paint(s, 18, 11, 4, 4, I.green, I.black, 1);
    fog(s, 96, 24, t, P.d25, 0.3);
  });

  pic('night-square', (s, t) => {
    frame(s);
    stars(s, 20, 50, 9);
    // "a pale moon, lying on her back as though the wind had tilted her"
    s.disc(70, 24, 10, 1); s.disc(73, 18, 9, 0);
    paint(s, 6, 1, 6, 4, I.white, I.black, 1);
    // Wrack across the sky.
    for (let k = 0; k < 7; k++) {
      const x = ((k * 53 + t) % 300) - 40;
      s.line(x, 10 + k * 6, x + 60, 6 + k * 6, 1);
    }
    // The railing and the thin trees lashing along it.
    for (let x = 0; x < 256; x += 6) s.line(x, 92, x, 112, 1);
    s.line(0, 94, 255, 94, 1); s.line(0, 110, 255, 110, 1);
    for (const tx of [30, 100, 170, 230]) {
      const sway = Math.round(Math.sin((t + tx) / 9) * 4);
      s.line(tx, 112, tx + sway, 60, 1);
      for (let k = 0; k < 6; k++) s.line(tx + sway, 60 + k * 6, tx + sway + 14 + k, 58 + k * 6 - 6, 1);
    }
    paint(s, 0, 7, 32, 8, I.green, I.black, 0);
    paint(s, 0, 11, 32, 3, I.green, I.black, 1);
    // Two figures heading for the house.
    big(s, 'poole', 120, 84, 2); big(s, 'utterson', 150, 82, 2);
    paint(s, 15, 10, 4, 5, I.cyan, I.black, 1);
    paint(s, 19, 10, 4, 5, I.magenta, I.black, 1);
  });

  pic('baize', (s, t) => {
    frame(s);
    // Stairs up to the red baize door.
    for (let k = 0; k < 6; k++) s.rect(70 + k * 10, 120 - k * 10, 120 - k * 20, 10, 1);
    s.clear(104, 8, 48, 62, 0);
    hatch(s, 104, 8, 48, 62, P.d50, 'set');
    s.rect(103, 7, 50, 64, 1);
    paint(s, 13, 1, 6, 8, I.red, I.black, 1);
    // Poole with the axe raised; Utterson with the poker; a candle.
    const up = (t >> 4) % 2;
    big(s, 'poole', 60, 60, 2);
    s.line(84, 66, 96 + up * 6, 38 - up * 8, 1);
    s.clear(94 + up * 6, 34 - up * 8, 8, 6, 1);
    big(s, 'utterson', 180, 60, 2);
    s.line(200, 74, 214, 60, 1);
    candle(s, 40, 104, t);
    paint(s, 7, 4, 6, 11, I.cyan, I.black, 1);
    paint(s, 22, 7, 5, 8, I.magenta, I.black, 1);
    paint(s, 4, 12, 2, 3, I.yellow, I.black, 1);
  });

  pic('body', (s, t) => {
    frame(s);
    floorLines(s, 70, 120);
    paint(s, 0, 9, 32, 6, I.red, I.black, 0);
    // The fire glowing and chattering on the hearth; the kettle.
    s.rect(196, 30, 50, 40, 1);
    fire(s, 204, 66, 34, t);
    s.clear(212, 38, 18, 10, 1);
    s.clear(228, 40, 6, 2, 1);
    paint(s, 24, 3, 7, 6, I.yellow, I.black, 1);
    paint(s, 24, 7, 7, 2, I.red, I.black, 1);
    // A man in clothes far too large for him, lying on the carpet.
    const lie = 34;
    s.clear(60, 84, 100, 18, 0);
    for (let j = 0; j < 14; j++) s.line(70, 86 + j, 70 + lie * 3 - (j % 3), 86 + j, j % 4 ? 1 : 0);
    s.disc(64, 92, 7, 1);
    s.plot(62, 90, 0); s.plot(66, 90, 0);
    paint(s, 7, 10, 14, 3, I.green, I.black, 1);
    // The crushed phial.
    s.plot(178, 104, 1); s.plot(180, 103, 1); s.plot(181, 105, 1); s.line(176, 106, 183, 106, 1);
    paint(s, 22, 12, 1, 2, I.cyan, I.black, 1);
  });

  pic('envelope', (s) => {
    frame(s);
    // The business table, papers neatly set forth, and the envelope.
    s.clear(0, 70, 256, 50, 0);
    s.line(0, 70, 255, 70, 1);
    hatch(s, 0, 72, 256, 48, P.d12, 'set');
    paint(s, 0, 9, 32, 6, I.yellow, I.black, 0);
    s.clear(48, 20, 160, 70, 0);
    s.rect(48, 20, 160, 70, 1);
    s.line(48, 20, 128, 58, 1); s.line(208, 20, 128, 58, 1);
    s.disc(128, 60, 6, 1);
    label(s, 'G. J. UTTERSON', 72, 70, 'J');
    paint(s, 6, 2, 20, 10, I.white, I.black, 1);
    paint(s, 15, 7, 2, 1, I.red, I.black, 1);
  });

  pic('quiet', (s, t) => {
    frame(s);
    floorLines(s, 80, 120);
    paint(s, 0, 10, 32, 5, I.red, I.black, 0);
    // The fire, the easy chair drawn cosily up, the tea things, the lamp.
    s.rect(150, 26, 60, 50, 1);
    fire(s, 158, 72, 44, t);
    paint(s, 19, 3, 8, 7, I.yellow, I.black, 1);
    paint(s, 19, 7, 8, 3, I.red, I.black, 1);
    s.rect(80, 56, 44, 44, 1); s.rect(84, 44, 36, 16, 1);
    hatch(s, 85, 45, 34, 14, P.d25, 'or');
    paint(s, 10, 5, 6, 8, I.red, I.black, 1);
    s.rect(30, 74, 30, 4, 1); s.line(34, 78, 34, 100, 1); s.line(56, 78, 56, 100, 1);
    s.disc(40, 70, 3, 1); s.rect(46, 66, 6, 7, 1);
    paint(s, 3, 8, 5, 5, I.white, I.black, 0);
    // The cheval-glass, turned to the roof.
    s.rect(226, 30, 22, 50, 1); s.line(237, 80, 237, 100, 1); s.line(228, 100, 246, 100, 1);
    hatch(s, 228, 32, 18, 46, P.d12, 'or');
    paint(s, 28, 3, 3, 10, I.cyan, I.black, 1);
  });

  pic('apparatus', (s, t) => {
    frame(s);
    s.line(0, 88, 255, 88, 1);
    hatch(s, 0, 90, 256, 30, P.d12, 'set');
    paint(s, 0, 11, 32, 4, I.yellow, I.black, 0);
    // Retorts, a flask over a flame, and the glass changing colour.
    s.disc(80, 60, 18, 1); s.disc(80, 60, 16, 0); s.clear(76, 24, 8, 22, 0); s.rect(76, 24, 8, 22, 1);
    hatch(s, 66, 62, 30, 12, P.d50, 'or');
    flame(s, 80, 86, t);
    s.line(84, 28, 140, 40, 1); s.line(84, 30, 140, 42, 1);
    s.rect(140, 36, 30, 40, 1);
    // The glass: red, then purple, then a watery green, over and over.
    s.rect(196, 48, 20, 36, 1); s.clear(197, 60, 18, 23, 1);
    const k = (t >> 5) % 3;
    const ink = [I.red, I.magenta, I.green][k];
    paint(s, 24, 7, 3, 4, ink, I.black, 1);
    for (let b = 0; b < 4; b++) s.plot(200 + ((t + b * 5) % 12), 56 - ((t * 2 + b * 7) % 14), 1);
    paint(s, 8, 3, 5, 7, I.white, I.black, 0);
    paint(s, 9, 7, 3, 3, ink, I.black, 1);
    paint(s, 9, 10, 2, 1, I.yellow, I.black, 1);
    paint(s, 17, 4, 5, 6, I.cyan, I.black, 0);
  });

  pic('glass', (s) => {
    frame(s);
    // "that ugly idol in the glass"
    s.rect(80, 4, 96, 112, 1); s.rect(84, 8, 88, 104, 1);
    hatch(s, 86, 10, 84, 100, P.d12, 'or');
    big(s, 'hyde', 92, 30, 4);
    paint(s, 10, 0, 12, 15, I.cyan, I.black, 0);
    paint(s, 11, 3, 10, 11, I.green, I.black, 1);
  });

  pic('soho', (s, t) => {
    frame(s);
    paint(s, 0, 0, 32, 15, I.yellow, I.black, 0);
    // "a gin palace, a low French eating house, a shop for the retail of
    // penny numbers and twopenny salads"
    s.rect(0, 20, 84, 100, 1); label(s, 'GIN', 28, 30); windows(s, 6, 46, 4, 2, 12, 14, 6, 10, [0, 1, 2, 3, 4, 5, 6, 7]);
    s.rect(88, 30, 80, 90, 1); label(s, 'CAFé', 112, 38); windows(s, 96, 56, 3, 1, 14, 18, 10, 0, [1]);
    s.rect(172, 24, 84, 96, 1); label(s, 'NUMBERS', 180, 32); windows(s, 180, 50, 4, 1, 12, 14, 6, 0, []);
    door(s, 120, 88, 18, 32); door(s, 196, 86, 18, 34);
    big(s, 'child', 118, 90, 2); big(s, 'child', 194, 88, 2);
    paint(s, 0, 2, 11, 13, I.yellow, I.black, 1);
    paint(s, 14, 11, 4, 4, I.cyan, I.black, 1);
    paint(s, 24, 11, 4, 4, I.cyan, I.black, 1);
    fog(s, 0, 120, t, P.d12, 0.2);
  });

  pic('will', (s, t) => {
    frame(s);
    // The will, holograph, and the candle.
    s.clear(60, 8, 140, 104, 0); s.rect(60, 8, 140, 104, 1);
    label(s, 'DR. JEKYLL’S', 76, 18, 'J');
    label(s, 'WILL', 112, 30, 'J');
    for (let k = 0; k < 8; k++) s.line(72, 46 + k * 7, 188 - (k % 3) * 12, 46 + k * 7, 1);
    label(s, 'Edward Hyde', 92, 96, 'J');
    s.disc(180, 100, 7, 1);
    candle(s, 30, 88, t);
    paint(s, 7, 1, 19, 14, I.white, I.black, 1);
    paint(s, 21, 12, 3, 2, I.red, I.black, 1);
    paint(s, 3, 10, 2, 3, I.yellow, I.black, 1);
  });

  pic('door', (s) => {
    frame(s);
    // "a door on the lower storey and a blind forehead of discoloured wall on
    // the upper"; two gentlemen in their Sunday walk.
    s.line(104, 30, 150, 8, 1); s.line(150, 8, 196, 30, 1);
    s.rect(104, 30, 93, 90, 1);
    bricks(s, 106, 32, 89, 40);
    hatch(s, 106, 40, 89, 20, P.d25, 'or');
    door(s, 134, 76, 34, 44, true);
    paint(s, 13, 0, 12, 15, I.red, I.black, 0);
    big(s, 'gent', 30, 70, 3); big(s, 'utterson', 66, 68, 3);
    s.line(70, 92, 100, 80, 1);
    paint(s, 3, 8, 5, 7, I.yellow, I.black, 1);
    paint(s, 8, 8, 5, 7, I.magenta, I.black, 1);
  });

  pic('lamps', (s, t) => {
    frame(s);
    // "the great field of lamps of a nocturnal city"
    for (let k = 0; k < 7; k++) {
      const x = 20 + k * 36, sc = 1 - k * 0.1;
      const base = 118 - k * 6;
      lampPost(s, x, base, Math.round(48 * sc));
    }
    for (let k = 0; k < 7; k++) paint(s, Math.floor((20 + k * 36 - 6) / 8), Math.floor((118 - k * 6 - 48 * (1 - k * 0.1) - 12) / 8), 2, 2, I.yellow, I.black, 1);
    fog(s, 80, 40, t, P.d25, 0.3);
    paint(s, 0, 10, 32, 5, I.blue, I.black, 0);
  });

  pic('meeting', (s) => {
    frame(s);
    stars(s, 30, 40, 13);
    s.rect(140, 10, 110, 110, 1); bricks(s, 142, 12, 106, 50);
    door(s, 180, 70, 34, 50, true);
    paint(s, 17, 0, 15, 15, I.red, I.black, 0);
    big(s, 'utterson', 80, 56, 4);
    big(s, 'hyde', 150, 72, 3);
    paint(s, 10, 7, 8, 8, I.magenta, I.black, 1);
    paint(s, 18, 9, 6, 6, I.green, I.black, 1);
    // Frost in the air.
    reseed(41);
    for (let k = 0; k < 60; k++) s.plot(Math.floor(rand() * 120), Math.floor(rand() * 60), 1);
  });

  pic('hall', (s, t) => {
    frame(s);
    floorLines(s, 84, 120);
    paint(s, 0, 10, 32, 5, I.blue, I.black, 0);
    // "a bright, open fire, and furnished with costly cabinets of oak"
    s.rect(100, 36, 56, 48, 1); fire(s, 108, 80, 40, t);
    paint(s, 12, 4, 8, 7, I.yellow, I.black, 1);
    paint(s, 12, 9, 8, 2, I.red, I.black, 1);
    for (const x of [20, 190]) { s.rect(x, 30, 46, 54, 1); s.rect(x + 4, 34, 17, 46, 1); s.rect(x + 25, 34, 17, 46, 1); }
    paint(s, 2, 3, 6, 8, I.yellow, I.black, 0);
    paint(s, 23, 3, 6, 8, I.yellow, I.black, 0);
    big(s, 'poole', 72, 66, 2);
    paint(s, 9, 8, 4, 5, I.cyan, I.black, 1);
  });

  pic('fireside', (s, t) => {
    frame(s);
    s.rect(104, 30, 48, 44, 1); fire(s, 112, 70, 32, t);
    paint(s, 13, 3, 6, 7, I.yellow, I.black, 1);
    paint(s, 13, 7, 6, 2, I.red, I.black, 1);
    big(s, 'jekyll', 40, 48, 3);
    big(s, 'utterson', 168, 48, 3);
    paint(s, 5, 6, 6, 7, I.white, I.black, 1);
    paint(s, 21, 6, 6, 7, I.magenta, I.black, 1);
    // A bottle of good wine between them.
    s.rect(124, 90, 8, 18, 1); s.rect(126, 84, 4, 6, 1);
    paint(s, 15, 10, 2, 4, I.red, I.black, 1);
  });

  pic('bedroom', (s) => {
    frame(s);
    // The bed curtains, the mahogany frame, the window's yellow light.
    s.rect(40, 30, 130, 80, 1); s.rect(36, 10, 138, 20, 1);
    for (let x = 40; x < 170; x += 8) s.line(x, 30, x + 2, 60, 1);
    hatch(s, 42, 70, 126, 38, P.d25, 'or');
    paint(s, 4, 1, 18, 14, I.magenta, I.black, 0);
    s.rect(196, 20, 44, 56, 1); s.line(218, 20, 218, 75, 1); s.line(196, 48, 239, 48, 1);
    hatch(s, 197, 21, 42, 54, P.d50, 'or');
    paint(s, 24, 2, 6, 8, I.yellow, I.black, 1);
  });

  pic('hand', (s) => {
    frame(s);
    hatch(s, 0, 70, 256, 50, P.d12, 'set');
    paint(s, 0, 8, 32, 7, I.white, I.black, 0);
    // "lean, corded, knuckly, of a dusky pallor"
    const fingers = [[60, 40], [86, 30], [112, 28], [138, 34]];
    s.clear(50, 60, 120, 40, 1);
    for (const [x, y] of fingers) { s.clear(x, y, 18, 40, 1); s.line(x + 4, y + 8, x + 14, y + 8, 0); s.line(x + 4, y + 20, x + 14, y + 20, 0); }
    s.clear(30, 70, 40, 18, 1);
    reseed(3);
    for (let k = 0; k < 120; k++) s.plot(50 + Math.floor(rand() * 110), 34 + Math.floor(rand() * 60), 0);
    paint(s, 3, 3, 20, 10, I.green, I.black, 0);
  });

  pic('lane', (s, t) => {
    frame(s);
    stars(s, 30, 50, 17);
    moon(s, 200, 22, 12);
    paint(s, 23, 1, 5, 4, I.white, I.black, 1);
    // The maid's window, and the lane under the full moon.
    s.rect(14, 10, 60, 80, 1); s.rect(26, 24, 30, 36, 1); s.line(41, 24, 41, 59, 1); s.line(26, 42, 55, 42, 1);
    hatch(s, 27, 25, 28, 34, P.d50, 'or');
    paint(s, 3, 3, 4, 5, I.yellow, I.black, 1);
    s.line(0, 100, 255, 100, 1);
    big(s, 'gent3', 120, 64, 2);
    big(s, 'hyde', 160, 72, 2);
    s.line(170, 80, 186, 64, 1);
    paint(s, 15, 8, 4, 5, I.white, I.black, 1);
    paint(s, 20, 8, 4, 5, I.green, I.black, 1);
    fog(s, 104, 16, t, P.d25, 0.4);
  });

  pic('letter', (s) => {
    frame(s);
    // Two hands, "in many points identical: only differently sloped."
    s.rect(14, 10, 110, 100, 1); s.rect(132, 10, 110, 100, 1);
    label(s, 'Dear Utterson,', 22, 24, 'J');
    for (let k = 0; k < 5; k++) s.line(22, 40 + k * 10, 112 - (k % 2) * 20, 40 + k * 10, 1);
    label(s, 'Henry Jekyll', 22, 92, 'J');
    label(s, 'Sir,', 140, 24, 'H');
    for (let k = 0; k < 5; k++) s.line(140, 40 + k * 10, 232 - (k % 3) * 16, 40 + k * 10, 1);
    label(s, 'Edward Hyde', 140, 92, 'H');
    paint(s, 1, 1, 15, 13, I.white, I.black, 1);
    paint(s, 16, 1, 15, 13, I.green, I.black, 1);
  });

  pic('park', (s, t) => {
    frame(s);
    paint(s, 0, 0, 32, 15, I.cyan, I.black, 0);
    s.disc(220, 20, 10, 1);
    for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; s.line(220 + Math.cos(a) * 13, 20 + Math.sin(a) * 13, 220 + Math.cos(a) * 17, 20 + Math.sin(a) * 17, 1); }
    paint(s, 25, 0, 6, 5, I.yellow, I.black, 1);
    for (const tx of [30, 90, 170]) { s.disc(tx, 46, 22, 1); s.clear(tx - 2, 60, 5, 40, 1); }
    paint(s, 0, 2, 25, 10, I.green, I.black, 0);
    s.line(0, 100, 255, 100, 1);
    // The bench in the sun.
    s.rect(110, 84, 60, 6, 1); s.rect(110, 72, 60, 6, 1); s.line(114, 90, 114, 100, 1); s.line(166, 90, 166, 100, 1);
    big(s, 'jekyll', 122, 54, 2);
    paint(s, 13, 9, 9, 4, I.yellow, I.black, 1);
    paint(s, 15, 6, 4, 4, I.white, I.black, 1);
    // Winter chirrupings.
    for (let k = 0; k < 3; k++) { const bx = (k * 70 + t) % 256, by = 20 + k * 10; s.line(bx, by, bx + 3, by - 2, 1); s.line(bx + 3, by - 2, bx + 6, by, 1); }
  });

  pic('hotel', (s) => {
    frame(s);
    s.rect(40, 10, 180, 110, 1);
    label(s, 'HOTEL', 108, 18);
    windows(s, 52, 34, 6, 2, 16, 18, 12, 10, [0, 3, 8]);
    door(s, 116, 86, 28, 34);
    paint(s, 5, 1, 23, 14, I.white, I.black, 0);
    paint(s, 13, 2, 7, 1, I.yellow, I.black, 1);
    // A hansom at the door.
    s.rect(4, 74, 30, 26, 1); s.disc(20, 104, 10, 1); s.disc(20, 104, 8, 0); s.line(34, 90, 60, 96, 1);
    paint(s, 0, 9, 5, 6, I.yellow, I.black, 0);
  });

  pic('portico', (s, t) => {
    frame(s);
    // "a small man crouching against the pillars of the portico"
    s.clear(60, 10, 140, 10, 1); s.line(60, 20, 200, 20, 1);
    for (const x of [72, 172]) { s.rect(x, 22, 16, 98, 1); for (let k = 0; k < 4; k++) s.line(x + 3 + k * 3, 24, x + 3 + k * 3, 118, 1); }
    door(s, 112, 40, 36, 80);
    paint(s, 7, 1, 19, 14, I.white, I.black, 0);
    big(s, 'hyde', 154, 88, 2);
    paint(s, 19, 11, 4, 4, I.green, I.black, 1);
    // A policeman not far off, with his bull's-eye open.
    big(s, 'constable', 6, 76, 2);
    for (let k = 0; k < 4; k++) s.line(40, 98, 70, 88 + k * 6, 1);
    paint(s, 0, 9, 5, 6, I.blue, I.black, 1);
    paint(s, 5, 11, 4, 2, I.yellow, I.black, 1);
  });

  pic('consulting', (s, t) => {
    frame(s);
    floorLines(s, 84, 120);
    paint(s, 0, 10, 32, 5, I.red, I.black, 0);
    // The graduated glass: "a dark purple, which faded again more slowly to
    // a watery green."
    s.rect(120, 40, 18, 40, 1); s.clear(121, 54, 16, 25, 1);
    const k = (t >> 5) % 4;
    paint(s, 15, 6, 3, 4, [I.red, I.red, I.magenta, I.green][k], I.black, 1);
    for (let b = 0; b < 4; b++) s.plot(124 + ((t + b * 4) % 10), 50 - ((t + b * 6) % 10), 1);
    s.rect(96, 80, 66, 6, 1); s.line(100, 86, 100, 110, 1); s.line(158, 86, 158, 110, 1);
    big(s, 'hyde', 60, 56, 3);
    big(s, 'lanyon', 176, 50, 3);
    paint(s, 7, 7, 6, 7, I.green, I.black, 1);
    paint(s, 22, 6, 6, 8, I.yellow, I.black, 1);
  });

  pic('yard', (s) => {
    frame(s);
    paint(s, 0, 0, 32, 15, I.white, I.black, 0);
    // "the dingy, windowless structure" at the bottom of the garden.
    s.rect(60, 20, 140, 100, 1); bricks(s, 62, 22, 136, 96);
    s.disc(130, 22, 18, 1); s.disc(130, 22, 16, 0); s.clear(110, 22, 42, 20, 0); s.line(112, 22, 148, 22, 1);
    door(s, 116, 80, 28, 40);
    paint(s, 7, 2, 18, 13, I.red, I.black, 0);
    big(s, 'jekyll', 22, 74, 2);
    paint(s, 2, 9, 4, 5, I.white, I.black, 1);
  });

  pic('window', (s) => {
    frame(s);
    // The court: "very cool and a little damp, and full of premature
    // twilight"; three windows, the middle one half-way open.
    s.rect(20, 0, 216, 80, 1);
    bricks(s, 22, 2, 212, 76);
    for (const [k, x] of [[0, 46], [1, 112], [2, 178]]) {
      s.clear(x, 18, 34, 44, 0); s.rect(x, 18, 34, 44, 1);
      for (let b = 1; b < 4; b++) s.line(x + b * 8, 18, x + b * 8, 61, 1);
      if (k === 1) s.clear(x + 1, 40, 32, 21, 0);
    }
    big(s, 'jekyll', 114, 30, 2);
    paint(s, 2, 0, 28, 10, I.red, I.black, 0);
    paint(s, 14, 4, 4, 4, I.white, I.black, 1);
    big(s, 'utterson', 80, 82, 2); big(s, 'gent', 140, 84, 2);
    paint(s, 10, 10, 4, 5, I.magenta, I.black, 1);
    paint(s, 17, 10, 4, 5, I.yellow, I.black, 1);
  });

  pic('lab-night', (s, t) => {
    frame(s);
    paint(s, 0, 0, 32, 15, I.yellow, I.black, 0);
    // The theatre: crates, straw, and a masked figure digging among them.
    for (const [x, y] of [[20, 80], [56, 88], [180, 76], [214, 90], [92, 96]]) { s.rect(x, y, 30, 24, 1); s.line(x, y, x + 29, y + 23, 1); s.line(x + 29, y, x, y + 23, 1); }
    hatch(s, 0, 112, 256, 8, P.d50, 'or');
    big(s, 'hyde', 120, 60, 3);
    s.clear(132, 66, 24, 6, 1);
    paint(s, 15, 7, 6, 8, I.green, I.black, 1);
    // The cupola, foggy.
    s.disc(128, 0, 30, 1); s.disc(128, 0, 28, 0); hatch(s, 100, 0, 56, 26, P.d12, 'or');
    candle(s, 230, 60, t);
    paint(s, 28, 7, 2, 2, I.yellow, I.black, 1);
  });
})();
