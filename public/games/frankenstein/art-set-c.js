'use strict';
/*
 * FRANKEN.EXE art: tilesets and backgrounds (set c). The Orkneys, the open
 * sea, the inn at Evian, the Russian steppe and the frozen ocean.
 */
(() => {
  const { left, right, mirror, rot, rep } = FK.tileHelpers;
  const { canvas, px, sky, stars, disc, ridge } = FK.bgKit;
  const { W: SW, H: SH } = FK;
  const make = FK.makeBG;
  const def = (legend, tiles) => FK.tiles(legend, tiles);

  /* Replace single pixels: [x, y, ch]. */
  const poke = (rows, list) => rows.map((r, y) => {
    const a = r.split('');
    for (const [x, yy, ch] of list) if (yy === y) a[x] = ch;
    return a.join('');
  });
  /* Close a block's left / right side, one pattern per row. */
  const edgeL = (rows, pats) => left(rows, pats);
  const edgeR = (rows, pats) => right(rows, pats);

  /* ============================================================ COAST */
  // One of the remotest of the Orkneys: flagstone cliffs split into slabs
  // like stacked slates, crusted with yellow sea lichen, under a skin of
  // turf and heather. A hut of unmortared stone with a turf roof.
  const coast = {
    k: 0x0f,
    G: 0x10, g: 0x00, d: 0x0c,          // rock: lit edge, face, cold shade
    y: 0x28, Y: 0x18,                    // lichen
    T: 0x18, t: 0x0a, u: 0x0b,           // turf: straw tips, grass, shade
    h: 0x04,                             // heather
    p: 0x08,                             // peat
    S: 0x10, s: 0x00, b: 0x08,           // hut stone
    o: 0x07, O: 0x17, L: 0x27,           // peat-fire glow in the window
    w: 0x30, c: 0x1c, C: 0x0c, e: 0x10,  // sea: foam, crest, body, spray
  };
  const rock_m = [
    'GGGGGGGGGdkGGGGG',
    'ggggggggggdkGggg',
    'gggyYgggggdkGggg',
    'gggggggggddkGggg',
    'dddddddddddkgggd',
    'kkkkkkkkkkkkdddd',
    'GGGdkGGGGGGkkkkk',
    'gggdkGgggggGGGdk',
    'gggdkGggggggggdk',
    'ggddkGgggggggddk',
    'dddkkddddddddddk',
    'kkkkkkkkkkkkkkkk',
    'GGGGGGGdkGGGGGGG',
    'gggggyydkGgggggg',
    'ddddddddkddddddd',
    'kkkkkkkkkkkkkkkk',
  ];
  const rock_m2 = [
    'GGGGGGGGGdkGGGGG',
    'ggggggggggdkGggg',
    'ggggggggggdkGggg',
    'gggggggggddkGggg',
    'dddddddddddkgggd',
    'kkkkkkkkkkkkdddd',
    'GGGGGGGGkGGkkkkk',
    'gggyYyggkkGGGGdk',
    'ggyYyyYgkgkgggdk',
    'gggyYyggkgkgggdk',
    'ddddddddkdkddddk',
    'kkkkkkkkkkkkkkkk',
    'GGGdkGGGGGGGGGGG',
    'gggdkGggggggggyg',
    'ddddkddddddddddd',
    'kkkkkkkkkkkkkkkk',
  ];
  const rock_t = [
    'kkkkkkkkkkkkkkkk',
    'GGGGGGGGGGGGGGGG',
    'ggggyggggggGGGgg',
    'gggYyYgggggggggg',
    'ggggggggggggggdd',
    'ddddddddddddddkk',
    'kkkkkkkkkkkkkkkk',
    'GGGdkGGGGGGGGGGG',
    'gggdkGgggggggggg',
    'gggdkGgggggyYggg',
    'ggddkGgggggggggd',
    'dddkkdddddddddkk',
    'kkkkkkkkkkkkkkkk',
    'GGGGGGGdkGGGGGGG',
    'ddddddddkddddddd',
    'kkkkkkkkkkkkkkkk',
  ];
  // Edges: the slabs jut out a pixel past the black gaps between them.
  const sideL = (rows) => edgeL(rows, rows.map((r) => (/^k{6}/.test(r) ? '.k' : r[0] === 'd' ? 'kd' : 'kG')));
  const sideR = (rows) => edgeR(rows, rows.map((r) => (/k{6}$/.test(r) ? 'k.' : 'dk')));
  const capL = (rows) => poke(sideL(rows), [[0, 0, '.'], [1, 0, '.'], [0, 1, '.'], [1, 1, 'k']]);
  const capR = (rows) => poke(sideR(rows), [[15, 0, '.'], [14, 0, '.'], [15, 1, '.'], [14, 1, 'k']]);
  def(coast, {
    coast_rock_m: rock_m,
    coast_rock_m2: rock_m2,
    coast_rock_t: rock_t,
    coast_rock_ml: sideL(rock_m),
    coast_rock_mr: sideR(rock_m),
    coast_rock_mlr: sideR(sideL(rock_m)),
    coast_rock_tl: capL(rock_t),
    coast_rock_tr: capR(rock_t),
    coast_rock_tlr: capR(capL(rock_t)),
  });

  // Turf: straw-coloured winter grass, sprigs of heather, a lip of black
  // peat, then stones and roots in the peat bank below.
  const turf_t = [
    'kTkkkkTkkkkkTkkk',
    'TtTkTTtTkTkTtTkT',
    'tttTtttttTtttttt',
    'thttttuttthttttu',
    'hkhtuttutkhkttuu',
    'uhuutuuuuuhuutuu',
    'uuukuuukuuuukuuk',
    'kkpkkkpkkkkpkkkp',
    'ppppkppppppppkpp',
    'pkppppppkppppppp',
    'ppppGGkppppkpppp',
    'ppkGgggkppppppkp',
    'pppkdddkpppGGkpp',
    'ppppkkkppppGgdkp',
    'pkppppppkpppkkpp',
    'ppppppppppppppkp',
  ];
  const turf_m = [
    'ppppppppkppppppp',
    'pkpppppppppkpppp',
    'ppppGGkpppppppkp',
    'pppGgggkpppppppp',
    'ppppdddkppkppppp',
    'kppppkkppppppppp',
    'pppppppppGGGkppp',
    'ppkpppppGggggkpp',
    'pppppppppddddkpp',
    'pppppkppppkkkppp',
    'pkpppppppppppppk',
    'ppppppppkppppppp',
    'pppGGkpppppppkpp',
    'ppGggdkpppkppppp',
    'pppkkkppppppppkp',
    'pppppppkpppppppp',
  ];
  const turfL = (rows, top) => edgeL(rows, rows.map((_, y) => (top && y < 7 ? ['.k', 'kT', 'kt', 'kt', 'kh', 'ku', 'ku'][y] : 'kp')));
  const turfR = (rows, top) => edgeR(rows, rows.map((_, y) => (top && y < 7 ? ['k.', 'Tk', 'tk', 'tk', 'uk', 'uk', 'uk'][y] : 'pk')));
  def(coast, {
    coast_turf_t: turf_t,
    coast_turf_m: turf_m,
    coast_turf_tl: turfL(turf_t, true),
    coast_turf_tr: turfR(turf_t, true),
    coast_turf_tlr: turfR(turfL(turf_t, true), true),
    coast_turf_ml: turfL(turf_m),
    coast_turf_mr: turfR(turf_m),
    coast_turf_mlr: turfR(turfL(turf_m)),
  });

  // A shelf of flagstone sticking out of the cliff.
  def(coast, {
    coast_ledge: [
      'kkkkkkkkkkkkkkkk',
      'GGGGGGGGGGGyGGGG',
      'ggggyYgggggggggg',
      'dddddddddddddddd',
      'kkkkkkkkkkkkkkkk',
      '.kddddddddddddk.',
      '..kkkkkkkkkkkk..',
      '...k...k....k...',
      ...rep('................', 8),
    ],
  });

  // The sea: slate-green swell, white foam where it breaks.
  const sea1 = [
    '................',
    '................',
    '................',
    '....ww..........',
    '..wwccw.....w...',
    'wwcccccwwwwwcwww',
    'ccCCcccccccccccc',
    'CCCCCCCcCCCCCCCC',
    'CCcCCCCCCCCCwCCC',
    'CCCCCCCCCCCCCCCC',
    'CCCCCcCCCCCCCCCC',
    'kCCCCCCCkCCCCCCC',
    'CCCCkCCCCCCCCkCC',
    'CkCCCCCCkCCCCCCC',
    'CCCCCkCkCCCkCCkC',
    'kCkCkCkCkCkCkCkC',
  ];
  const sea2 = sea1.map((r, y) => (y < 9 ? rot(r, 5) : rot(r, 2)));
  const sea3 = sea1.map((r, y) => (y < 9 ? rot(r, 10) : rot(r, 4)));
  def(coast, { coast_sea1: sea1, coast_sea2: sea2, coast_sea3: sea3 });

  // The hut: unmortared flat stones, a turf roof weighted with stones on
  // heather ropes, one deep window with a peat fire glowing inside.
  const hut_m = [
    'SSSSSSkSSSSSSSSk',
    'sssssbkSsssssssk',
    'bbbbbbkbbbbbbbbk',
    'kkkkkkkkkkkkkkkk',
    'SSSkSSSSSSSkSSSS',
    'sssbkSssssssbkSs',
    'sssbkSsssssssbks',
    'bbbbkbbbbbbbbbkb',
    'kkkkkkkkkkkkkkkk',
    'SSSSSSSSSkSSSSSS',
    'ssssssssbkSsssss',
    'bbbbbbbbbkbbbbbb',
    'kkkkkkkkkkkkkkkk',
    'SkSSSSSkSSSSSSkS',
    'bkSsssbkSssssbkS',
    'kkkkkkkkkkkkkkkk',
  ];
  const hut_t = [
    '.kkkTkkkkkTkkkk.',
    'kTTtTTtTTtTTtTTk',
    'ttttkttttttkuttt',
    'ttutksskttutttut',
    'uuuksGssktuuuuuu',
    'kuukssssskuukuuk',
    'pkkkbbbbbkkkpkkp',
    'pk.kkkkkk.kpk.kk',
    'k...kkkk...k....',
    'SSSkSSSSSSSkSSSS',
    'sssbkSssssssbkSs',
    'bbbbkbbbbbbbbbkb',
    'kkkkkkkkkkkkkkkk',
    'SkSSSSSkSSSSSSkS',
    'bkSsssbkSssssbkS',
    'kkkkkkkkkkkkkkkk',
  ];
  const hut_mw = [
    'SSSSSSkSSSSSSSSk',
    'sssssbkSsssssssk',
    'bbbbbbkbbbbbbbbk',
    'kkkkkkkkkkkkkkkk',
    'SSSkkkkkkkkkSSSS',
    'sssbkoooooOkbkSs',
    'sssbkoOOOOLkbbks',
    'bbbbkoOLLLOkbbkb',
    'kkkkkoOOLOOkkkkk',
    'SSSSkooOOOokSSSS',
    'sssbkkkkkkkkbkSs',
    'bbbkSSSSSSSSkbbb',
    'kkkkbbbbbbbbkkkk',
    'SkSSSSSkSSSSSSkS',
    'bkSsssbkSssssbkS',
    'kkkkkkkkkkkkkkkk',
  ];
  def(coast, {
    coast_hut_m: hut_m,
    coast_hut_mw: hut_mw,
    coast_hut_t: hut_t,
  });

  /* ------------------------------------------------------- Orkney sky */
  {
    // Low cloud the color of slate, a pale strip of light on the horizon.
    const s = sky(SW, SH, [[0x2d, 0], [0x00, 30, 8], [0x10, 92, 14], [0x32, 118, 6]]);
    const sg = s.getContext('2d');
    // Scudding cloud: long ragged streaks, light on top, torn underneath.
    const scud = (w, h, seed, n, o) => {
      const c = canvas(w, h), g = c.getContext('2d');
      const r = FK.rng(seed);
      for (let i = 0; i < n; i++) {
        const cx = Math.floor(r() * w), cy = Math.floor(o.y0 + r() * (o.y1 - o.y0));
        const len = o.len0 + Math.floor(r() * o.len1), th = 2 + Math.floor(r() * o.th);
        for (let dx = -len; dx <= len; dx++) {
          const f = 1 - Math.abs(dx) / len;
          const t = Math.max(1, Math.round(th * Math.sqrt(f) + (r() < 0.3 ? -1 : 0)));
          for (const ox of [-w, 0, w]) {
            const x = cx + dx + ox;
            px(g, x, cy - t, o.body, 1, t * 2);
            if (o.lit !== undefined) px(g, x, cy - t, o.lit, 1, 1);
            if (o.dark !== undefined && FK.bayer(x, cy + t) < 0.5) px(g, x, cy + t, o.dark, 1, 1);
          }
        }
      }
      return c;
    };
    const high = scud(512, 90, 41, 16, { y0: 6, y1: 80, len0: 20, len1: 40, th: 4, body: 0x00, lit: 0x10 });
    const low = scud(384, 70, 77, 12, { y0: 10, y1: 62, len0: 12, len1: 30, th: 2, body: 0x2d });

    // Distant islands: low, green-black, one with cliffs.
    const isl = canvas(512, 40), ig = isl.getContext('2d');
    const prof = ridge(512, 9, 0, 10, 0.5);
    const islands = [[20, 90, 9], [150, 60, 5], [250, 140, 14], [430, 50, 6]];
    for (const [x0, w0, hgt] of islands) {
      for (let x = 0; x < w0; x++) {
        const e = Math.min(x, w0 - x) / 6;
        const hh = Math.round(Math.min(1, e) * hgt + (prof[(x0 + x) % 512] % 3));
        px(ig, (x0 + x) % 512, 40 - hh, 0x00, 1, hh);
        if (FK.bayer(x0 + x, 0) < 0.25) px(ig, (x0 + x) % 512, 40 - hh, 0x10, 1, 1);
      }
    }
    // The sea: dark slate-green, wind streaks, lighter toward the horizon.
    const sea = canvas(256, 96), seg = sea.getContext('2d');
    px(seg, 0, 0, 0x0c, 256, 96);
    for (let y = 0; y < 6; y++) for (let x = 0; x < 256; x++) if (FK.bayer(x, y) < (6 - y) / 7) px(seg, x, y, 0x00);
    const rr = FK.rng(5);
    for (let i = 0; i < 160; i++) {
      const y = 4 + Math.floor(Math.pow(rr(), 0.8) * 90);
      const x = Math.floor(rr() * 256), l = 2 + Math.floor((y / 90) * 8 * rr());
      px(seg, x, y, rr() < 0.25 ? 0x10 : 0x1c, l, 1);
    }
    make('orkney', [
      { img: s, still: true },
      { img: high, f: 0.05, y: 0, fy: 0, drift: 0.12 },
      { img: isl, f: 0.1, y: 96, fy: 0.05 },
      { img: sea, f: 0.15, y: 136, fy: 0.08, fill: 0x0c },
      { img: low, f: 0.08, y: 8, fy: 0, drift: 0.3 },
    ]);
  }
})();
