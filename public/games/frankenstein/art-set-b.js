'use strict';
/*
 * FRANKEN.EXE art: tilesets and backgrounds (set b). The storm on the Salève,
 * the Mer de Glace, the winter forest round the De Laceys' cottage, and the
 * autumn road to Geneva. Tiles are 16x16 grids, one character per pixel.
 */
(() => {
  const { left, right, mirror, rot, rep } = FK.tileHelpers;

  /*
   * Close a block's left or right side. `inset` gives, per row, how many
   * pixels are cut away (the last value repeats), so corners can be rounded.
   * The first solid pixel becomes outline; pixels exposed to the air above a
   * step are outlined too. `tone` maps a char to its lit (left) or shaded
   * (right) neighbour for the pixel just inside the outline.
   */
  function side(rows, which, inset, tone, from = 1) {
    const n = (y) => (y < inset.length ? inset[y] : inset[inset.length - 1]);
    const out = rows.map((r) => r.split(''));
    for (let y = 0; y < 16; y++) {
      const a = out[y], m = n(y);
      const X = (i) => (which === 'l' ? i : 15 - i);
      for (let i = 0; i < m; i++) a[X(i)] = '.';
      a[X(m)] = 'k';
      const prev = y > 0 ? n(y - 1) : m;
      for (let i = m; i < prev; i++) a[X(i)] = 'k';
      if (tone && y >= from && m + 1 < 16) {
        const c = a[X(m + 1)];
        if (c !== 'k' && tone[c]) a[X(m + 1)] = tone[c];
      }
    }
    return out.map((a) => a.join(''));
  }
  const def = (legend, tiles) => FK.tiles(legend, tiles);

  /* ================================================================ ROCK */
  // The storm: wet turf, Salève limestone, a lake whipped white.
  const rock = {
    k: 0x0f,
    h: 0x2b, G: 0x1a, g: 0x0a,          // turf: wet sheen, grass, dark grass
    e: 0x08, n: 0x07, r: 0x18,          // mud, a warmer clod, a lit rim
    W: 0x30, S: 0x10, s: 0x00, c: 0x0c, // limestone: glint, lit, face, shadow
    b: 0x18, B: 0x08,                   // twigs
    f: 0x30, F: 0x31, v: 0x1c,          // foam, spray, wave face
  };
  const ground_t = [
    'kkkkkkkkkkkkkkkk',
    'hGGhGGGhGGhGGGhG',
    'GGGGgGGGGGGGgGGG',
    'GgGgggGGgGgGggGg',
    'gggggkgggggkgggg',
    'kggkkekggkkekgkk',
    'ekkeeeekkeeeekee',
    'eeeeeeeeeeeeeeee',
    'eeeeeeeneeeeeeee',
    'eeeeeeeeeeeeeeee',
    'eekkkeeeeeeeeeee',
    'ekSSskeeeeeeneee',
    'ekscckeeeeeeeeee',
    'eekkkeeeeeeeeeee',
    'eeeeeeeeeeeekeee',
    'eeeeneeeeeeeeeee',
  ];
  const ground_m = [
    'eeeeeeeeeeeeeeee',
    'eeeeeneeeeeeeeee',
    'eeeeeeeeeekkkeee',
    'eeekeeeeekSSSkee',
    'eeeeeeeeeksssske',
    'eeeeeeeeeeccccke',
    'eneeeeeeeeekkkee',
    'eeeeeeeeeeeeeeee',
    'eeeekkkeeeeeeeee',
    'eeekSssceeeeeeke',
    'eeeekkkeeeeneeee',
    'eeeeeeeeeeeeeeee',
    'keeeeeeeeeekeeee',
    'eeeeeneeeeeeeeee',
    'eeeeeeeeeeeeeeee',
    'eeeeeeeekeeeeeee',
  ];
  const ground_m2 = [
    'eeeeeeeeeeeeeeee',
    'eeekkkkkkkeeeeee',
    'eekSSSSSSskeeene',
    'ekSSssssssskeeee',
    'ekSssssssscskeee',
    'ekssssssssccckee',
    'eekcssssccccckee',
    'eeekcccccccckeee',
    'eeeekkkkkkkkeeee',
    'eeeeeeeeeeeeeeee',
    'eneeeeeeeeeekkee',
    'eeeeeeeeeeekSske',
    'eeeekeeeeeeekkee',
    'eeeeeeeeeneeeeee',
    'eeeeeeeeeeeeeeee',
    'eekeeeeeeeeeeeee',
  ];
  const groundL = { G: 'h', g: 'G', e: 'n', s: 'S', c: 's' };
  const groundR = { h: 'G', G: 'g', g: 'k', S: 's', s: 'c' };

  // Salève limestone: thick beds, lit along their tops, few vertical joints.
  const cliff_t = [
    'kkkkkkkkkkkkkkkk',
    'WSSSSSSSSSSSWSSS',
    'SSssssssssssSkSS',
    'ssssscsssssssksc',
    'ssssssssssssskcs',
    'ccccssssssssskcc',
    'kkkkcccccccccckk',
    'SSSSkkkkkkkkkkkS',
    'sssssSSSkSSSSsss',
    'sscssssckSssssss',
    'ssssssskSsssscss',
    'ccccccckSsssssss',
    'kkkkkkkkcccccccc',
    'SSSScSSSkkkkkkkk',
    'sssskSssSSSSSWSS',
    'ccckcccccccccccc',
  ];
  const cliff_m = [
    'SSSSSSSSSSSSkSSS',
    'ssssscsssssskcss',
    'ssssssssssssSkSs',
    'cccccsssssssskcc',
    'kkkkkcccccccckkk',
    'SSSSSkkkkkkkkSSS',
    'sssssSSSkSSSSsss',
    'sscssssckSssssss',
    'ssssssskSsssscss',
    'ccccccckSsssssss',
    'kkkkkkkkcccccccc',
    'SSSScSSSkkkkkkkk',
    'sssskSssSSSWSSSS',
    'sssckSssssscssss',
    'ccckcccccccccccc',
    'kkkkkkkkkkkkkkkk',
  ];
  const cliff_m2 = [
    'SSSSSSkSSSSSSSSS',
    'sssssskcssssssss',
    'ssssssSkSsscssss',
    'cccsssskSssscccc',
    'kkkcccckcccckkkk',
    'SSSkkkkkkkkkkkkS',
    'sssSSSSSSSSSkSSs',
    'sssssssssssckSss',
    'ssssscssssskSsss',
    'ssssssssssckcccs',
    'cccccccssskkkkkc',
    'kkkkkkkccckcSSkk',
    'SSSSSSkkkkkkSsSS',
    'ssssssSSSSSkSsss',
    'ccccccccccckcccc',
    'kkkkkkkkkkkkkkkk',
  ];
  const cliffL = { s: 'S', c: 's' };
  const cliffR = { W: 'S', S: 's', s: 'c' };

  // A narrow shelf jutting from the cliff, with a tapering underside.
  const rock_ledge = [
    'kkkkkkkkkkkkkkkk',
    'kWSSSSSSSSSSWSSk',
    'kSSsssssssssSssk',
    'ksssssscssssssck',
    'kcsssssssssssscc',
    '.kcccsssssscccck',
    '..kkkcccccckkkk.',
    '.....kkkkkk.....',
    ...rep('................', 8),
  ];
  // A juniper bent flat by the wind off the lake.
  const rock_bush = [
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '.......kkkkk....',
    '....kkkhGGGGkk..',
    '..kkhGGGGgGGGGkk',
    '.khGGgGGgggGgggk',
    'khGGgggGggkkgkk.',
    'kGgggkgggk..kk..',
    '.kggkkBkgk......',
    '..kkk.kBk.......',
    '.......kBk......',
    '......kkbBk.....',
  ];
  // The lake: steep chop, white crests torn off by the wind, black water.
  const lake = [
    '.......ff.......',
    '..F..ffvvf....F.',
    'f..ffvvvvvf..ffv',
    'vffvvvcvvvvffvvv',
    'cvvvcccccvvvvvcc',
    'cccccckcccccccck',
    'kcckcccccckccckc',
    'ccckkckkcckkkckk',
    'kkkkkckkkkkkckkk',
    'kkkkkkkkkkkkkkkk',
    'kkkkkkkkkkkkkkkk',
    'kkkkkkkkkkkkkkkk',
    'kkkkkkkkkkkkkkkk',
    'kkkkkkkkkkkkkkkk',
    'kkkkkkkkkkkkkkkk',
    'kkkkkkkkkkkkkkkk',
  ];
  const band = (rows, y0, y1, n) => rows.map((r, y) => (y >= y0 && y < y1 ? rot(r, n) : r));
  def(rock, {
    rock_ground_t: ground_t,
    rock_ground_m: ground_m,
    rock_ground_m2: ground_m2,
    rock_ground_tl: side(ground_t, 'l', [3, 1, 0], groundL),
    rock_ground_tr: side(ground_t, 'r', [3, 1, 0], groundR),
    rock_ground_ml: side(ground_m, 'l', [0], groundL),
    rock_ground_mr: side(ground_m, 'r', [0], groundR),
    rock_cliff_t: cliff_t,
    rock_cliff_m: cliff_m,
    rock_cliff_m2: cliff_m2,
    rock_cliff_tl: side(cliff_t, 'l', [2, 1, 0], cliffL),
    rock_cliff_tr: side(cliff_t, 'r', [2, 1, 0], cliffR),
    rock_cliff_ml: side(cliff_m, 'l', [0], cliffL),
    rock_cliff_mr: side(cliff_m, 'r', [0], cliffR),
    rock_ledge,
    rock_bush,
    rock_water1: lake,
    rock_water2: band(band(lake, 0, 5, 5), 5, 9, 11),
    rock_water3: band(band(lake, 0, 5, 11), 5, 9, 6),
  });

  /* ========================================================= backgrounds */
  const K = FK.bgKit;
  const { canvas, px, sky, disc } = K;
  const SW = FK.W, SH = FK.H;
  const wrap = (x, w) => ((x % w) + w) % w;

  /*
   * Storm-cloud underside: rows of hanging lobes, each lower row drawn over
   * the one above it, every lobe lit along its lower rim (the lightning and
   * the town below) and dark into its body. Rows: { y, r0, r1, tones:
   * [body, mid, rim] }. The ceiling above the first row is solid body.
   */
  function lobes(w, h, seed, o) {
    const c = canvas(w, h), g = c.getContext('2d');
    const r = FK.rng(seed);
    const T0 = o.rows[0].tones;
    if (!o.open) px(g, 0, 0, T0[0], w, Math.max(0, o.rows[0].y));
    for (const R of o.rows) {
      const list = [];
      for (let x = r() * 10; x < w;) {
        const rr = R.r0 + r() * (R.r1 - R.r0);
        if (R.keep !== undefined && r() > R.keep) { x += rr * 1.5; continue; }
        list.push({ x: x + rr * 0.5, y: R.y + (r() - 0.5) * (R.amp || 0), r: rr });
        x += rr * (0.9 + r() * 0.7);
      }
      const T = R.tones, flat = R.flat || 0.6;
      for (const L of list) {
        for (let y = Math.floor(L.y - L.r * flat); y <= L.y + L.r * flat + 1; y++) {
          if (y < 0 || y >= h) continue;
          for (let x = Math.floor(L.x - L.r); x <= L.x + L.r; x++) {
            const dx = (x - L.x) / L.r;
            if (dx * dx > 1) continue;
            const half = Math.sqrt(1 - dx * dx) * L.r * flat;
            const bottom = L.y + half;
            if (y > bottom || y < L.y - half) continue;
            const d = bottom - y;
            // Light comes from below and a little from the left.
            const lit = d - dx * 1.5;
            let col;
            if (d < 1) col = T[2];
            else if (lit < 2.5) col = FK.bayer(x, y) < 0.6 ? T[2] : T[1];
            else if (lit < 4) col = T[1];
            else if (lit < 6.5) col = FK.bayer(x, y) < 0.45 ? T[1] : T[0];
            else col = T[0];
            px(g, wrap(x, w), y, col);
          }
        }
        // A dark edge along the bottom, so lobes separate.
        if (R.edge !== undefined) for (let x = Math.floor(L.x - L.r); x <= L.x + L.r; x++) {
          const dx = (x - L.x) / L.r;
          if (dx * dx > 1) continue;
          const y = Math.round(L.y + Math.sqrt(1 - dx * dx) * L.r * flat) + 1;
          if (y >= 0 && y < h) px(g, wrap(x, w), y, R.edge);
        }
      }
    }
    return c;
  }

  /*
   * A mountain range drawn from an explicit list of summits (so Mont Blanc is
   * where we want it): lit left faces, shaded right, snow with a ragged hem.
   */
  function range(w, h, peaks, o) {
    const c = canvas(w, h), g = c.getContext('2d');
    const jit = K.ridge(w, o.seed || 3, 0, o.jitter ?? 5, 0.6);
    const top = new Array(w), who = new Array(w);
    for (let x = 0; x < w; x++) {
      let best = Infinity, k = 0;
      peaks.forEach((p, i) => {
        for (const ox of [-w, 0, w]) {
          const dx = x - (p.x + ox);
          const y = p.y + (dx < 0 ? -dx * p.l : dx * p.r);
          if (y < best) { best = y; k = i; }
        }
      });
      top[x] = Math.round(best + jit[x] * (o.jitScale ?? 1));
      who[x] = k;
    }
    for (let x = 0; x < w; x++) {
      const p = peaks[who[x]];
      let dxp = x - p.x; if (dxp > w / 2) dxp -= w; if (dxp < -w / 2) dxp += w;
      for (let y = Math.max(0, top[x]); y < h; y++) {
        const lit = dxp < (y - p.y) * (o.seam ?? 0.3);
        let col = lit ? o.lit : o.dark;
        const snowY = p.y + (p.snow ?? o.snowDepth ?? 14) + ((x * 7 + (x >> 2) * 3) % 5) - (lit ? 0 : 2);
        if (o.snow !== undefined && y < snowY) col = lit ? o.snow : o.snowDark;
        // Snow streaks down the gullies of the lit face.
        if (o.snow !== undefined && lit && y >= snowY && y < snowY + 10 && ((x * 3 + y) % 7 === 0) && FK.bayer(x, y) < 0.5) col = o.snowDark;
        if (o.fade !== undefined && y > h - (o.fadeRows || 8) && FK.bayer(x, y) < (y - (h - (o.fadeRows || 8))) / (o.fadeRows || 8)) col = o.fade;
        px(g, x, y, col);
      }
      if (o.edge !== undefined && top[x] >= 0) px(g, x, top[x], o.edge);
    }
    return c;
  }

  /* -------------------------------------------------------------- Storm */
  // "I saw the lightnings playing on the summit of Mont Blanc in the most
  // beautiful figures": the storm over the lake, the Jura and the Alps.
  {
    const P = {
      n: { // night
        sky: [[0x0f, 0], [0x0c, 116, 10], [0x0f, 150, 8]],
        c1: [0x0f, 0x0f, 0x0c], c2: [0x0f, 0x0c, 0x1c], c3: [0x0f, 0x0c, 0x0c], edge: 0x0f,
        mt: { lit: 0x0f, dark: 0x0f, snow: 0x0c, snowDark: 0x02, edge: 0x0f },
        jura: 0x0f, juraLit: 0x0f, lake: 0x0f, glint: 0x0c, glint2: 0x1c, town: 0x27,
      },
      l: { // lightning
        sky: [[0x10, 0], [0x31, 100, 12], [0x30, 132, 10]],
        c1: [0x00, 0x10, 0x30], c2: [0x00, 0x10, 0x30], c3: [0x2d, 0x00, 0x10], edge: 0x2d,
        mt: { lit: 0x00, dark: 0x2d, snow: 0x30, snowDark: 0x10, edge: 0x0f },
        jura: 0x0f, juraLit: 0x0f, lake: 0x00, glint: 0x10, glint2: 0x30, town: 0x37,
      },
    };
    const build = (C) => {
      const s = sky(SW, SH, C.sky);
      const cl = lobes(512, 96, 41, { rows: [
        { y: 14, r0: 16, r1: 30, amp: 8, tones: C.c1, edge: C.edge },
        { y: 34, r0: 14, r1: 26, amp: 10, tones: C.c1, edge: C.edge },
        { y: 54, r0: 10, r1: 22, amp: 12, tones: C.c2, edge: C.edge, flat: 0.55 },
      ] });
      const low = lobes(512, 40, 9, { open: true, rows: [{ y: 14, r0: 6, r1: 14, amp: 10, keep: 0.45, tones: C.c3, flat: 0.45 }] });
      const peaks = [
        { x: 20, y: 40, l: 1.1, r: 0.9 },
        { x: 70, y: 28, l: 1.3, r: 1.0 },
        { x: 84, y: 34, l: 1.6, r: 1.0 },
        { x: 150, y: 6, l: 0.5, r: 0.55, snow: 26 },   // Mont Blanc: the broad white dome
        { x: 188, y: 18, l: 1.6, r: 1.4 },             // the Aiguille du Midi side
        { x: 206, y: 26, l: 1.6, r: 0.9 },
        { x: 268, y: 38, l: 1.0, r: 1.1 },
        { x: 330, y: 24, l: 1.2, r: 1.5 },
        { x: 346, y: 30, l: 1.8, r: 0.9 },
        { x: 420, y: 36, l: 0.9, r: 1.0 },
        { x: 470, y: 30, l: 1.4, r: 0.8 },
      ];
      const alps = range(512, 64, peaks, Object.assign({ snowDepth: 12, jitter: 3, seed: 5, seam: 0.25 }, C.mt));
      // The Jura: a long low ridge across the water, and Geneva's lamps.
      const jura = canvas(512, 30), jg = jura.getContext('2d');
      const jr = K.ridge(512, 21, 14, 14, 0.5);
      for (let x = 0; x < 512; x++) {
        px(jg, x, jr[x], C.jura, 1, 30 - jr[x]);
        if (jr[x] < jr[wrap(x + 1, 512)]) px(jg, x, jr[x] + 1, C.juraLit);
      }
      const rt = FK.rng(5);
      for (let i = 0; i < 26; i++) {
        const x = 300 + Math.floor(rt() * 120), y = 25 + Math.floor(rt() * 4);
        px(jg, x, y, C.town);
      }
      // The lake: black water combed by the wind into long streaks.
      const lake = canvas(512, 80), lg = lake.getContext('2d');
      px(lg, 0, 0, C.lake, 512, 80);
      const r = FK.rng(77);
      for (let i = 0; i < 110; i++) {
        const t = Math.pow(r(), 1.4);
        const y = Math.floor(t * 76) + 2, x = Math.floor(r() * 512);
        const len = 2 + Math.floor((2 + t * 14) * r());
        for (let k = 0; k < len; k++) px(lg, wrap(x + k, 512), y, k === 0 || r() < 0.3 ? C.glint2 : C.glint);
      }
      return { s, cl, low, alps, jura, lake };
    };
    const N = build(P.n), L = build(P.l);
    const lit = (W) => !!(W && W.flash > 0);
    const pick = (k) => (t, W) => (lit(W) ? L[k] : N[k]);
    FK.makeBG('storm', [
      { img: pick('s'), still: true },
      { img: pick('alps'), f: 0.03, y: 90, fy: 0.02 },
      { img: pick('cl'), f: 0.05, y: 0, fy: 0.02, drift: 0.1 },
      { img: pick('low'), f: 0.08, y: 80, fy: 0.03, drift: 0.22 },
      { img: pick('jura'), f: 0.07, y: 128, fy: 0.04 },
      { img: pick('lake'), f: 0.1, y: 156, fy: 0.05, fill: 0x0f },
    ], (g, cx, cy, t, W) => {
      // The bolt itself, for as long as the flash lasts.
      if (lit(W)) {
        const r = FK.rng(Math.floor(((W.t || 0) + W.flash) / 3) * 7 + 1);
        let x = 24 + Math.floor(r() * 208), y = 0;
        const end = 108 + Math.floor(r() * 30);
        const fork = 30 + Math.floor(r() * 40);
        let bx = 0, by = 0;
        const seg = (x0, y0, x1, y1, core, glow) => {
          const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
          for (let k = 0; k <= n; k++) {
            const ix = Math.round(x0 + ((x1 - x0) * k) / n), iy = Math.round(y0 + ((y1 - y0) * k) / n);
            if (glow !== undefined) { px(g, ix - 1, iy, glow); px(g, ix + 1, iy, glow); }
            px(g, ix, iy, core);
          }
        };
        while (y < end) {
          const nx = x + Math.floor((r() - 0.5) * 12), ny = y + 5 + Math.floor(r() * 7);
          seg(x, y, nx, ny, 0x30, 0x31);
          if (!bx && y > fork) { bx = x; by = y; }
          x = nx; y = ny;
        }
        if (bx) {
          let fx = bx, fy = by;
          const dir = r() < 0.5 ? -1 : 1;
          for (let k = 0; k < 4; k++) {
            const nx = fx + dir * (3 + Math.floor(r() * 6)), ny = fy + 4 + Math.floor(r() * 5);
            seg(fx, fy, nx, ny, 0x31);
            fx = nx; fy = ny;
          }
        }
      }
      // Far rain in grey sheets, slower than the near rain.
      const T = t || 0, col = lit(W) ? 0x00 : 0x0c;
      for (let i = 0; i < 64; i++) {
        const x = wrap(i * 37 - cx * 0.25 + T * 1.1, 290) - 17;
        const y = wrap(i * 71 + T * 3.4, 230) - 6;
        px(g, x, y, col); px(g, x + 1, y + 3, col);
      }
    });
  }
})();
