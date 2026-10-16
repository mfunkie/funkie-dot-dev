'use strict';
/*
 * FRANKEN.EXE art: tilesets and backgrounds (set b). The storm on the Salève,
 * the Mer de Glace, the winter forest round the De Laceys' cottage, and the
 * autumn road to Geneva. Tiles are 16x16 grids, one character per pixel.
 */
(() => {
  const { left, right, mirror, rep } = FK.tileHelpers;

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
    h: 0x2b, G: 0x1b, g: 0x0b,          // turf: wet sheen, grass, dark grass
    e: 0x08, n: 0x07,                   // mud, a warmer clod
    W: 0x30, S: 0x10, s: 0x00, c: 0x0c, // limestone: glint, lit, face, shadow
    b: 0x18,                            // twigs
  };
  const turfTop = [
    'kkkkkkkkkkkkkkkk',
    'hGGhGGGGhGhGGGhG',
    'GGGGGgGGGGGGGgGG',
    'gGGgggGGgGGgggGg',
    'gggggggggggggggg',
    'kgggkgggggkggggk',
    'ekggkekggkgkeggk',
    'eekgkeekkekeekke',
  ];
  const ground_t = [
    ...turfTop,
    'eeekeeeeeeeeeeee',
    'ekkkkkeeekkkkeee',
    'kSSSsskeksSssked',
    'kSssssckkSsssske',
    'eksssccekscccke.',
    'eekccckeekkkkeee',
    'eeekkkeeneeeeeke',
    'eeeeeeeeeeeeekSs',
  ].map((r) => r.replace(/\./g, 'e').replace(/d/g, 'e'));
  const ground_m = [
    'eeeeeeeeeeeekkks',
    'eekkkkkeeeeksscc',
    'ekSSSssckeekccck',
    'kSSsssssceeekkke',
    'kSsssssscekeeeee',
    'ksssssccckSkkeee',
    'ekccccckkSSsskee',
    'eekkkkkeksSsssck',
    'eeeeeeeekssssccc',
    'kkkeeneeekccccke',
    'SskeeeeeeekkkkSe',
    'scckeekkkeeeeeee',
    'cckeekSSsskeeeek',
    'kkeeekSssssckekS',
    'eeeeeksscccckkSs',
    'eeneeekkkkkkeeks',
  ];
  const ground_m2 = [
    'eeeeeeeeeeeeeeee',
    'eekkkkkkkkkkeeee',
    'ekSSSSSsssssckee',
    'kSSssssssssscckee'.slice(0, 16),
    'kSsssssssssscccke'.slice(0, 16),
    'kssssssscsssccke',
    'ksssssssssscccke',
    'ekcssssssccccckee'.slice(0, 16),
    'eekcccccccccckee',
    'eeekkkkkkkkkkeee',
    'eeneeeeeeeeeeene',
    'eeeeekkkkeeeeeee',
    'kkeekSSssckeekkk',
    'SskkSssssscekSSs',
    'sscksssccccksSss',
    'cckekkkkkkkekscc',
  ];
  const groundL = { G: 'h', g: 'G', s: 'S', c: 's', e: 'n' };
  const groundR = { G: 'g', h: 'G', S: 's', s: 'c', e: 'k' };

  // Limestone in beds: long lit tops, few joints, pitting and shadowed seams.
  const cliff_m = [
    'SSSSScWkSSSSSSSS',
    'ssssscskSsssssss',
    'sscssccksssscsss',
    'ccccccckcsccccsc',
    'kkkkkkkkkkcckkkk',
    'SSSSSSSSSSkkSSSS',
    'sssssWSssskcSsss',
    'ssscsssssscckSss',
    'ssssssscsscckSsc',
    'scsssssssssckSss',
    'cccccccccsckcccc',
    'kckkkkkkkkkkkkkk',
    'SkSSSSSSSSSScSSk',
    'skSssssscssscssc',
    'ckSsscsssssscscc',
    'ckcccccccccccckk',
  ];
  const cliff_m2 = [
    'SSSSScWkSSSSSSSS',
    'ssssscskSsskksss',
    'sscssccksskcsksk',
    'ccccccckcskckckc',
    'kkkkkkkkkkcckkkk',
    'SSSSSSSkkSkkSSSS',
    'sssssWkcSskcSsss',
    'ssscskcsSsckkSss',
    'ssssscsSssckcSsc',
    'scssscsSssckkSss',
    'cccckccccsckcccc',
    'kckkkkkkkkkkkkkk',
    'SkSSSSSkkkSScSSk',
    'skSsssksSsksssssc'.slice(0, 16),
    'ckSsssksSckscscc',
    'ckccccckkkcccckk',
  ];
  const cliff_t = [
    'kkkkkkkkkkkkkkkk',
    'WSSSSSSWkSSSSSSS',
    'SSSSSSSSkSSSSSSS',
    'sssscsssksssssss',
    'ssssssccksssscss',
    'cccccccckccccccc',
    'kkkkkkkkkkkkkcck',
    ...cliff_m.slice(5, 14),
  ].map((r, y) => (y === 6 ? 'kkkkkkkkkkcckkkk' : r));
  const cliffL = { s: 'S', c: 's' };
  const cliffR = { S: 's', s: 'c', W: 'S' };

  // A narrow shelf with a jagged, tapering underside.
  const rock_ledge = [
    'kkkkkkkkkkkkkkkk',
    'kWSSSSGhSSSSSSSk',
    'kSSSSSSSSSSSWSSk',
    'kssssscssssssssk',
    'kcsssssssscsssck',
    '.kccsscssssscck.',
    '..kkccckcccckk..',
    '....kkk.kkkk....',
    ...rep('................', 8),
  ];
  // A shrub bent flat by the wind off the lake.
  const rock_bush = [
    '................',
    '................',
    '................',
    '................',
    '................',
    '.......kkkk.....',
    '....kkkhGGkkk...',
    '..kkhGGGGgGGgkk.',
    '.khGGgGGgggGggk.',
    'khGGgggGgkkggggk',
    'kGgggkgggk.kkgk.',
    '.kggkbkggk...k..',
    '..kkkbkkk.......',
    '....kbk.........',
    '....kbbk........',
    '...kkkbbk.......',
  ];
  // The lake: short, steep, white-capped chop, then black water.
  const water = (crest) => [
    ...crest,
    'cccccccccccccccc',
    'ccckcccccckccccc',
    'kckckkckckckkckc',
    'ckkkckkkkkkkckkk',
    'kkkkkkkckkkkkkkk',
    'kkckkkkkkkkkkckk',
    'kkkkkkkkkkkkkkkk',
    'kkkkkkkkkkkkkkkk',
  ];
  const crests = [
    [
      '................',
      '..W.............',
      '.WSW.......W....',
      'WSsSW.....WSW...',
      'SsssSW...WSsS..W',
      'ssssssWSWSsssSWS',
      'scsssssssssscsss',
      'cscccsscsccsccsc',
    ],
    [
      '................',
      '......W.........',
      '.....WSW......W.',
      '....WSsSW....WSW',
      'W..WSsssSW..WSsS',
      'SWSSsssssSWSSsss',
      'sssssscssssssscs',
      'sccsccsscccsscsc',
    ],
    [
      '................',
      '..........W.....',
      '...W.....WSW....',
      '..WSW...WSsSW...',
      '.WSsSW.WSsssSW..',
      'WSsssSWSssssssWS',
      'sssscssssscsssss',
      'cscsccsccscccscc',
    ],
  ];
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
    rock_water1: water(crests[0]),
    rock_water2: water(crests[1]),
    rock_water3: water(crests[2]),
  });

  /* ========================================================= backgrounds */
  const K = FK.bgKit;
  const { canvas, px, sky, disc } = K;
  const SW = FK.W, SH = FK.H;
  const wrap = (x, w) => ((x % w) + w) % w;

  /* Long ragged cloud banks: overlapping flat ellipses, ragged hems. */
  function banks(w, h, seed, n, o) {
    const c = canvas(w, h), g = c.getContext('2d');
    const r = FK.rng(seed);
    const blobs = [];
    for (let i = 0; i < n; i++) {
      const cx = r() * w, cy = o.y0 + r() * (o.y1 - o.y0);
      const len = 3 + Math.floor(r() * 5);
      for (let k = 0; k < len; k++) {
        blobs.push({ x: cx + (k - len / 2) * (10 + r() * 10), y: cy + (r() - 0.5) * 6, rx: 14 + r() * 22, ry: 5 + r() * 7 });
      }
    }
    const inside = (x, y, grow, dy = 0) => {
      for (const b of blobs) {
        for (const ox of [-w, 0, w]) {
          const dx = (x - b.x - ox) / (b.rx + grow), ddy = (y - b.y - dy) / (b.ry + grow);
          if (dx * dx + ddy * ddy <= 1) return true;
        }
      }
      return false;
    };
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (!inside(x, y, 0)) continue;
      // Lit from below (the lightning, the town): a hem along the underside.
      let col = o.body;
      if (o.hem !== undefined && !inside(x, y + 2, 0)) col = o.hem;
      else if (o.hem !== undefined && !inside(x, y + 4, 0) && FK.bayer(x, y) < 0.5) col = o.hem;
      if (o.top !== undefined && !inside(x, y - 2, 0)) col = o.top;
      px(g, x, y, col);
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
  {
    // Two of everything: the night, and the same night in a lightning flash.
    const pal = {
      n: { sky: [[0x0f, 0], [0x0c, 150, 10]], bank: 0x0f, hem: 0x0c, top: undefined, far: 0x0c, farSnow: 0x00, farSnowD: 0x2d, farDark: 0x0f, lake: 0x0f, glint: 0x0c, shore: 0x0f },
      l: { sky: [[0x00, 0], [0x10, 120, 10], [0x30, 162, 6]], bank: 0x00, hem: 0x10, top: 0x2d, far: 0x00, farSnow: 0x30, farSnowD: 0x10, farDark: 0x2d, lake: 0x00, glint: 0x30, shore: 0x0f },
    };
    const build = (P) => {
      const s = sky(SW, 180, P.sky);
      const cl = banks(512, 120, 41, 7, { y0: 8, y1: 96, body: P.bank, hem: P.hem, top: P.top });
      const peaks = [
        { x: 40, y: 34, l: 0.9, r: 0.7 },
        { x: 120, y: 10, l: 0.55, r: 0.6, snow: 22 },  // Mont Blanc: the high white dome
        { x: 150, y: 26, l: 1.1, r: 0.9 },
        { x: 210, y: 42, l: 0.9, r: 1.0 },
        { x: 300, y: 30, l: 0.8, r: 1.1 },
        { x: 350, y: 46, l: 0.9, r: 0.9 },
        { x: 440, y: 28, l: 1.0, r: 0.8 },
      ];
      const alps = range(512, 76, peaks, { lit: P.far, dark: P.farDark, snow: P.farSnow, snowDark: P.farSnowD, snowDepth: 12, jitter: 4, seed: 5 });
      // The lake: flat black water with long wind streaks.
      const lake = canvas(512, 80), lg = lake.getContext('2d');
      px(lg, 0, 0, P.lake, 512, 80);
      const r = FK.rng(77);
      for (let i = 0; i < 70; i++) {
        const y = Math.floor(Math.pow(r(), 1.6) * 78) + 1, x = Math.floor(r() * 512);
        const len = 3 + Math.floor((y / 80) * 18 * r());
        for (let k = 0; k < len; k++) px(lg, wrap(x + k, 512), y, P.glint);
      }
      // The far shore under the mountains.
      for (let x = 0; x < 512; x++) px(lg, x, 0, P.farDark, 1, 1 + ((x * 13) % 7 === 0 ? 1 : 0));
      // Near shore: poplars and the black hump of the Salève's foot.
      const shore = canvas(512, 70), sg = shore.getContext('2d');
      const hill = K.ridge(512, 9, 40, 30, 0.55);
      for (let x = 0; x < 512; x++) px(sg, x, hill[x], P.shore, 1, 70 - hill[x]);
      const rt = FK.rng(13);
      for (let i = 0; i < 14; i++) {
        const tx = Math.floor(rt() * 512), th = 18 + Math.floor(rt() * 16);
        const base = hill[tx] + 2;
        for (let yy = 0; yy < th; yy++) {
          const hw = Math.round(Math.sin((yy / th) * Math.PI) * 3 + 0.4);
          for (let xx = -hw; xx <= hw; xx++) px(sg, wrap(tx + xx, 512), base - yy, P.shore);
        }
      }
      return { s, cl, alps, lake, shore };
    };
    const N = build(pal.n), L = build(pal.l);
    const lit = (W) => W && W.flash > 0;
    const pick = (k) => (t, W) => (lit(W) ? L[k] : N[k]);
    FK.makeBG('storm', [
      { img: pick('s'), still: true },
      { img: pick('cl'), f: 0.06, y: 0, fy: 0, drift: 0.12 },
      { img: pick('alps'), f: 0.04, y: 86, fy: 0.02 },
      { img: pick('lake'), f: 0.08, y: 160, fy: 0.04, fill: 0x0f },
      { img: pick('shore'), f: 0.2, y: 150, fy: 0.08, fill: 0x0f },
    ], (g, cx, cy, t, W) => {
      // The bolt itself, while the flash lasts.
      if (lit(W)) {
        const seed = Math.floor((W.t - (10 - W.flash)) / 3);
        const r = FK.rng(seed * 7 + 1);
        let x = 30 + Math.floor(r() * 196), y = 0;
        const end = 100 + Math.floor(r() * 30);
        const fork = 30 + Math.floor(r() * 40);
        let bx = 0, by = 0;
        while (y < end) {
          const nx = x + Math.floor((r() - 0.45) * 9), ny = y + 4 + Math.floor(r() * 6);
          for (let k = 0; k <= 6; k++) {
            const ix = Math.round(x + ((nx - x) * k) / 6), iy = Math.round(y + ((ny - y) * k) / 6);
            px(g, ix - 1, iy, 0x31, 3, 1);
            px(g, ix, iy, 0x30);
          }
          if (!bx && y > fork) { bx = x; by = y; }
          x = nx; y = ny;
        }
        if (bx) {
          let fx = bx, fy = by;
          for (let s = 0; s < 4; s++) {
            const nx = fx - 3 - Math.floor(r() * 6), ny = fy + 4 + Math.floor(r() * 5);
            for (let k = 0; k <= 5; k++) px(g, Math.round(fx + ((nx - fx) * k) / 5), Math.round(fy + ((ny - fy) * k) / 5), 0x30);
            fx = nx; fy = ny;
          }
        }
      }
      // Distant rain, in sheets, behind the play.
      const T = t || 0;
      const col = lit(W) ? 0x10 : 0x0c;
      for (let i = 0; i < 60; i++) {
        const x = wrap(i * 37 - cx * 0.3 + T * 1.2, 300) - 20;
        const y = wrap(i * 71 + T * 4, 200);
        px(g, x, y, col); px(g, x + 1, y + 2, col);
      }
    });
  }
})();
