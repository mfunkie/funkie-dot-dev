'use strict';
/*
 * FRANKEN.EXE art: tilesets and backgrounds (set c). The Orkneys, the open
 * sea, the inn at Evian, the Russian steppe and the frozen ocean.
 */
(() => {
  const { left, right, mirror, rot, rep } = FK.tileHelpers;
  const { canvas, px, sky, stars, disc, ridge, forest } = FK.bgKit;
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
  // One of the remotest of the Orkneys: flagstone cliffs split into long
  // slabs like stacked slates, crusted with yellow sea lichen, under a skin
  // of winter turf and heather. A hut of unmortared stone with a turf roof.
  const coast = {
    k: 0x0f,
    L: 0x10, g: 0x00, d: 0x2d,           // cliff rock: rim light, lit face, wet sheen
    Y: 0x1b, y: 0x0b, v: 0x0b,           // sea lichen
    T: 0x18, t: 0x0a, u: 0x0b, Z: 0x08,  // turf: straw, grass, shade, dead
    h: 0x04, H: 0x04,                    // heather
    p: 0x08, P: 0x0f,                    // peat
    W: 0x10, S: 0x00, s: 0x08, K: 0x0f,  // hut fieldstone, peat-stained
    o: 0x07, O: 0x17, F: 0x27,           // peat-fire glow in the window
    w: 0x30, c: 0x1c, e: 0x2c, C: 0x0c, D: 0x0c,  // sea
  };
  // The cliff: dark Orkney sea-rock broken into angular blocks along its
  // joints. Each block has a face toward the light (grey, rimmed white
  // along the top) and a face turned away (dithered to black); sea lichen
  // in green crusts. Grids generated from crack drawings, then retouched.
  def(coast, {
    coast_rock_m: [
      'dkddkgggggggLdkk',
      'kkkddkgggggkdddd',
      'dkdkkkgggggddkdk',
      'kkkkkkgkggkdkkkk',
      'dkkkkLkkgkdkdkdk',
      'kkkLLgLLkkkdkkkk',
      'kdkggggYykkkkkkk',
      'LkLggggkdgdkkkLL',
      'kkggggkddkkkLLgg',
      'gkgggkddkkkLgYgg',
      'kkggkddkdkkgyggg',
      'kLggddkkkkkggggk',
      'kggkkkdkkkLggggg',
      'kgkkkkkkkkgkgggk',
      'gkkkkkkkLLkkkgkd',
      'kgdkkLLLggLLkkdd',
    ],
    coast_rock_m2: [
      'kkkggkdkdkkkkkkk',
      'LLkkkkkkkkkkkkLL',
      'ggLdgdkkkkLLLLgg',
      'gkddkddgkLgggggg',
      'kddkdkkkLggYyggg',
      'ddkkkkkkggggyggk',
      'dkdkdkkkgggggggd',
      'kkkkkkkLggggggkd',
      'dkkkkkkgkggggkdk',
      'kkkkkLLkkkggkkkk',
      'kkgkLggLLkkkkkkk',
      'LgkLgggggLkLLLLL',
      'gkkggyYgkdgkgggg',
      'kkkgggggddkkgggg',
      'dkkggggkdkkkkggk',
      'kkLgggkkkkkgkgkk',
    ],
    coast_rock_t: [
      'kkkkkkkkkkkkkkkk',
      'LLLLLLLLLLLLLLLL',
      'kgggggkygggggykg',
      'kkgkgkkkgggggkkk',
      'gdkkkkkkkgkgkkkd',
      'kkkLLLLLkkkkkgdk',
      'kdkgggggLkkdgkkk',
      'LkLggggkdgdkkkLL',
      'kkggggkddkkkLLgg',
      'gkgggkddkkkLgggg',
      'kkggkddkdkkggggg',
      'kLggddkkkkkggggk',
      'kggkkkdkkkLggggg',
      'kgkkkkkkkkgkgggk',
      'gkkkkkkkLLkkkgkd',
      'kgdkkLLLgkLLkkdk',
    ],
    coast_rock_ml: [
      'kkddkgggggggLdkk',
      'kkkddkgggggkdddd',
      'kkdkkkgggggddkdk',
      'kkkkkkgkggkdkkkk',
      'kkkkkLkkgkdkdkdk',
      'kkkLLgLLkkkdkkkk',
      'kdkggggYykkkkkkk',
      'kkLggggkdgdkkkLL',
      'kkggggkddkkkLLgg',
      'kkgggkddkkkLgYgg',
      'kkggkddkdkkgyggg',
      'kLggddkkkkkggggk',
      'kLgkkkdkkkLggggg',
      'kgkkkkkkkkgkgggk',
      'kkkkkkkkLLkkkgkd',
      'kgdkkLLLggLLkkdd',
    ],
    coast_rock_mr: [
      'dkddkgggggggLdkk',
      'kkkddkgggggkdddk',
      'dkdkkkgggggddkkk',
      'kkkkkkgkggkdkkkk',
      'dkkkkLkkgkdkdkkk',
      'kkkLLgLLkkkdkkkk',
      'kdkggggYykkkkkk.',
      'LkLggggkdgdkkkLk',
      'kkggggkddkkkLLkk',
      'gkgggkddkkkLgYgk',
      'kkggkddkdkkgygkk',
      'kLggddkkkkkggggk',
      'kggkkkdkkkLgggkk',
      'kgkkkkkkkkgkgggk',
      'gkkkkkkkLLkkkgkk',
      'kgdkkLLLggLLkkdk',
    ],
    coast_rock_mlr: [
      'kkddkgggggggLdkk',
      'kkkddkgggggkdddk',
      'kkdkkkgggggddkkk',
      'kkkkkkgkggkdkkkk',
      'kkkkkLkkgkdkdkkk',
      'kkkLLgLLkkkdkkkk',
      'kdkggggYykkkkkk.',
      'kkLggggkdgdkkkLk',
      'kkggggkddkkkLLkk',
      'kkgggkddkkkLgYgk',
      'kkggkddkdkkgygkk',
      'kLggddkkkkkggggk',
      'kLgkkkdkkkLgggkk',
      'kgkkkkkkkkgkgggk',
      'kkkkkkkkLLkkkgkk',
      'kgdkkLLLggLLkkdk',
    ],
    coast_rock_tl: [
      '..kkkkkkkkkkkkkk',
      '.kLLLLLLLLLLLLLL',
      'kLggggkygggggykg',
      '.kgkgkkkgggggkkk',
      'kdkkkkkkkgkgkkkd',
      'kkkLLLLLkkkkkgdk',
      'kdkgggggLkkdgkkk',
      'kkLggggkdgdkkkLL',
      'kkggggkddkkkLLgg',
      'kkgggkddkkkLgggg',
      'kkggkddkdkkggggg',
      'kLggddkkkkkggggk',
      'kLgkkkdkkkLggggg',
      'kgkkkkkkkkgkgggk',
      'kkkkkkkkLLkkkgkd',
      'kgdkkLLLgkLLkkdk',
    ],
    coast_rock_tr: [
      'kkkkkkkkkkkkkk..',
      'LLLLLLLLLLLLLLk.',
      'kgggggkygggggykk',
      'kkgkgkkkgggggkk.',
      'gdkkkkkkkgkgkkkk',
      'kkkLLLLLkkkkkgdk',
      'kdkgggggLkkdgkk.',
      'LkLggggkdgdkkkLk',
      'kkggggkddkkkLLkk',
      'gkgggkddkkkLgggk',
      'kkggkddkdkkgggkk',
      'kLggddkkkkkggggk',
      'kggkkkdkkkLgggkk',
      'kgkkkkkkkkgkgggk',
      'gkkkkkkkLLkkkgkk',
      'kgdkkLLLgkLLkkdk',
    ],
    coast_rock_tlr: [
      '..kkkkkkkkkkkk..',
      '.kLLLLLLLLLLLLk.',
      'kLggggkygggggykk',
      '.kgkgkkkgggggkk.',
      'kdkkkkkkkgkgkkkk',
      'kkkLLLLLkkkkkgdk',
      'kdkgggggLkkdgkk.',
      'kkLggggkdgdkkkLk',
      'kkggggkddkkkLLkk',
      'kkgggkddkkkLgggk',
      'kkggkddkdkkgggkk',
      'kLggddkkkkkggggk',
      'kLgkkkdkkkLgggkk',
      'kgkkkkkkkkgkgggk',
      'kkkkkkkkLLkkkgkk',
      'kgdkkLLLgkLLkkdk',
    ],
  });

  // Turf: wind-flattened grass gone straw at the tips, sprigs of heather,
  // a ragged mat of roots, then black peat with stones in it.
  const turf_t = [
    '..k.....k....k..',
    'kkTkk.kkTkkkkTkk',
    'TTtTTkTTtTTZTtTT',
    'tZttTTtttttZtttT',
    'ttttthHttttttttt',
    'tuttthhutttuttht',
    'uuutuuuuuuuuuhhu',
    'uukuuuukuuukuuuu',
    'kpukkpkkuukkpkuk',
    'ppkpppppkkpppppk',
    'pppppPppppppPppp',
    'ppPpkkkppppppppp',
    'ppppkWSkpppppPpp',
    'pPppksskppppkkpp',
    'ppppkkkpppPpkSkp',
    'pppppppppppppkpp',
  ];
  const turf_m = [
    'ppppppppppPppppp',
    'pPpppppppppppkpp',
    'ppppkkkpppppkSkp',
    'pppkWSskppPppkpp',
    'pppkssskpppppppp',
    'ppppkkkppppppPpp',
    'pPpppppppkkkpppp',
    'pppppppPkWSskppp',
    'ppppppppksssskpp',
    'ppPppppppkkkkppp',
    'ppppppppppppppPp',
    'ppppkkpppPpppppp',
    'pPpkSskppppppppp',
    'ppppkkpppppppkkp',
    'ppppppppPpppkSkp',
    'ppPppppppppppkpp',
  ];
  const turfL = (rows, top) => left(rows, rows.map((_, y) => (top && y < 9 ? ['..', '.k', 'kT', 'kt', 'kt', 'kt', 'ku', 'ku', '.k'][y] : 'kp')));
  const turfR = (rows, top) => right(rows, rows.map((_, y) => (top && y < 9 ? ['..', 'k.', 'Tk', 'tk', 'tk', 'uk', 'uk', 'uk', 'k.'][y] : 'pk')));
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

  // A flagstone shelf jutting from the cliff, its underside in shadow.
  def(coast, {
    coast_ledge: [
      'kkkkkkkkkkkkkkkk',
      'LLLLLLkLLLLLLLLk',
      'gggYygkgggggyggk',
      'kgggggkkggggggdk',
      'dkdgkdkdkkgdkdk.',
      'kdkdkkkkdkdkdkk.',
      '.kkdkk..kkdkkk..',
      '..kk.....kkk....',
      ...rep('................', 8),
    ],
  });

  // The sea: a cold slate-green swell breaking white along its crest.
  // The top rows are open so the background sea shows between crests.
  // Frames shift the crest and the swell lines at different speeds.
  const seaTop = [
    'DDDDDCDDDDDDDDDD',
    'DDDDDDDDDDDDCDDD',
    'DDCDDDwwDDDDDDDD',
    'DDDDwwccwDDDDDDD',
    'CCwwcccccwwCCCCC',
    'wwcccCCCcccwwwww',
  ];
  const seaBody = [
    'cCCCCCCCCCCCcccc',
    'CCCCCCCCCCCCCCCC',
    'CCccCCCCCCCCCCCC',
    'CCCCcccCCCCCCCCC',
    'CCCCCCCCCCCCccCC',
    'CCCCCCCCCCcccCCC',
    'CCCCCCCCCCCCCCCC',
    'CCCCCCCCCCCCCCCC',
    'CCCCCCCCCCCCCCCC',
    'CCCCCCCCCCCCCCCC',
  ];
  const seaF = (a, b) => [...seaTop.map((r) => rot(r, a)), ...seaBody.map((r) => rot(r, b))];
  const sea1 = seaF(0, 0), sea2 = seaF(5, 3), sea3 = seaF(10, 6);
  def(coast, { coast_sea1: sea1, coast_sea2: sea2, coast_sea3: sea3 });

  // The hut: rounded fieldstones of all sizes laid dry, chinked with
  // black; each stone lit on its upper-left, shaded on its lower-right.
  const hut_m = [
    'kWWWkkWWWWWkkWWk',
    'WSSSskWSSSSSkSSs',
    'SSSssKSSSSSsskss',
    'sSssksSSSSsssskk',
    'kssskksssssskkWW',
    'kkkkWWkkkkkkkWSS',
    'WWWWSSskWWWWkSSS',
    'SSSSSSskSSSSskss',
    'SSSSSsskSSSSsskk',
    'sssssskkssssskWW',
    'kkkkkkWWkkkkkkSS',
    'WWkkWWSSSSkkWSSS',
    'SSskSSSSSSskSSSs',
    'SsskSSSSSssksSss',
    'sskksssssssksssk',
    'kkWkkkkkkkkkkkkk',
  ];
  const hut_mw = [
    'kWWWkkWWWWWkkWWk',
    'WSSSskWSSSSSkSSs',
    'sssskkkkkkkkkkss',
    'kkkkkoooooOOkkkk',
    'WWWkoOOOOOFOkWWW',
    'SSskoOOFFFOOkSSs',
    'SsskoOOFFFOOkSss',
    'ssskooOOFOOokssk',
    'kkkkooOOOOOokkWW',
    'WWWkkkkkkkkkkkSS',
    'SSSkWWWWWWWWkSSS',
    'sssksssssssskSss',
    'kkkkkkkkkkkkksss',
    'WWkkWWSSSSkkkkkk',
    'SSskSSSSSssksSss',
    'kkkkkkkkkkkkkkkk',
  ];
  // The roof: turf on top, a thick bed of straw thatch roped down with
  // hanging stones, a ragged fringe, its shadow on the wall beneath.
  const hut_t = [
    '..k....k...k.k..',
    'kkTkkkkTkkkTkTkk',
    'TTtTTTTtTThtTtTT',
    'tttTttthhttttttT',
    'uutttuuhuuttuuuu',
    'ZZZkZZZZZZZkZZZZ',
    'TZZkTZZTZZZkZTZZ',
    'ZTZSZZTZZTZSZZTZ',
    'TkTSTkTTkTkSkTTk',
    'kkkSkk.kkk.Skk.k',
    'kkksk.kkk.ksk..k',
    'WWkkkWWWWWWkkkWW',
    'SskWSSSSSSskWSSS',
    'SskWSSSsSSskWSSS',
    'skksssssssskksss',
    'kkkkkkkkkkkkkkkk',
  ];
  const hutL = (rows, top) => left(rows, rows.map((r, y) => (top && y < 11 ? ['..', '.k', 'kT', 'kt', 'ku', 'kZ', 'kT', 'kZ', 'kT', '.k', '..'][y] : 'k' + (r[1] === 'k' ? 'k' : 'W'))));
  const hutR = (rows, top) => right(rows, rows.map((r, y) => (top && y < 11 ? ['..', 'k.', 'Tk', 'tk', 'uk', 'Zk', 'Zk', 'Zk', 'kk', 'k.', '..'][y] : (r[14] === 'k' ? 'k' : 's') + 'k')));
  def(coast, {
    coast_hut_m: hut_m,
    coast_hut_mw: hut_mw,
    coast_hut_t: hut_t,
    coast_hut_ml: hutL(hut_m), coast_hut_mr: hutR(hut_m), coast_hut_mlr: hutR(hutL(hut_m)),
    coast_hut_tl: hutL(hut_t, true), coast_hut_tr: hutR(hut_t, true), coast_hut_tlr: hutR(hutL(hut_t, true), true),
  });


  /* ------------------------------------------------------- Orkney sky */
  // Overcast to the horizon: a lid of slate cloud with ragged bellies,
  // scud driving under it, a cold pale band where the sky meets a grey-green
  // sea, low islands, and the dark headlands of the island itself.
  {
    const s = sky(SW, SH, [[0x0f, 0], [0x0c, 14, 8]]);

    /* A roll of cloud: lumps of different sizes on a flat base, filled down
     * to the bottom of the canvas so stacked rolls overlap like shingles. The
     * crown is lit, with a dithered second row; a dark seam under each lump
     * where it overlaps the next. */
    function roll(w, h, seed, o) {
      const c = canvas(w, h), g = c.getContext('2d');
      const r = FK.rng(seed);
      const top = new Array(w).fill(h);
      let x = 0;
      while (x < w + 8) {
        const rw = o.rw0 + Math.floor(r() * o.rw1);
        const rh = Math.max(2, Math.round(rw * (0.5 + r() * 0.5)));
        const base = o.base + Math.floor(r() * 4);
        for (let dx = -rw; dx <= rw; dx++) {
          const xx = ((x + dx) % w + w) % w;
          const t = Math.round(base - rh * Math.sqrt(1 - (dx / rw) ** 2));
          if (t < top[xx]) top[xx] = t;
        }
        x += Math.floor(rw * (0.9 + r() * 0.7));
      }
      for (let xx = 0; xx < w; xx++) {
        const t = Math.max(0, top[xx]);
        px(g, xx, t, o.body, 1, h - t);
        px(g, xx, t, o.lit, 1, 1);
        if ((xx + t) % 2 === 0) px(g, xx, t + 1, o.lit, 1, 1);
        // shadow seam where this lump meets a lower neighbour
        const tl = top[(xx + w - 1) % w], tr = top[(xx + 1) % w];
        if (tl < t - 1 || tr < t - 1) px(g, xx, t, o.dark, 1, 2);
      }
      return c;
    }
    // Scud: small torn wisps driving fast under the deck, dark with a pale back.
    function scud(w, h, seed, n, o) {
      const c = canvas(w, h), g = c.getContext('2d');
      const r = FK.rng(seed);
      for (let i = 0; i < n; i++) {
        const cx = Math.floor(r() * w), cy = Math.floor(o.y0 + r() * (o.y1 - o.y0));
        const len = o.len0 + Math.floor(r() * o.len1);
        for (let dx = -len; dx <= len; dx++) {
          const f = 1 - Math.abs(dx) / len;
          const th = Math.round(f * f * o.th);
          const skew = Math.round(dx * 0.15);   // the wind tears them forward
          for (const ox of [-w, 0, w]) {
            const xx = cx + dx + ox;
            if (th > 0) px(g, xx, cy - th + skew, o.body, 1, th + 1);
            else if ((dx & 1) === 0) px(g, xx, cy + skew, o.body, 1, 1);
            if (th > 0) px(g, xx, cy - th + skew, o.lit, 1, 1);
          }
        }
      }
      return c;
    }
    const rollA = roll(512, 60, 41, { rw0: 9, rw1: 16, base: 24, body: 0x0c, lit: 0x00, dark: 0x0f });
    const rollB = roll(384, 60, 7, { rw0: 8, rw1: 10, base: 18, body: 0x00, lit: 0x10, dark: 0x0c });
    const rollC = roll(256, 40, 13, { rw0: 5, rw1: 8, base: 10, body: 0x10, lit: 0x10, dark: 0x00 });
    const low = scud(320, 80, 77, 8, { y0: 20, y1: 70, len0: 8, len1: 12, th: 3, body: 0x0c, lit: 0x00 });

    // Distant islands: long and low, flat-topped, with one cliffed end.
    const isl = canvas(512, 24), ig = isl.getContext('2d');
    const islands = [[10, 70, 7], [128, 34, 4], [210, 110, 10], [380, 46, 5], [452, 30, 3]];
    for (const [x0, w0, hgt] of islands) {
      for (let x = 0; x < w0; x++) {
        const fall = x < 3 ? x * 2 : Math.min(hgt, (w0 - x) / 4);   // sheer cliff west, long slope east
        const hh = Math.max(1, Math.round(Math.min(hgt, fall) - ((x * 7) % 5 === 0 ? 1 : 0)));
        px(ig, (x0 + x) % 512, 24 - hh, 0x2d, 1, hh);
        if (x < 3) px(ig, (x0 + x) % 512, 24 - hh, 0x00, 1, hh);
      }
    }
    // The far sea: grey-green, pale at the horizon.
    const sea = canvas(256, 40), seg = sea.getContext('2d');
    px(seg, 0, 0, 0x0c, 256, 40);
    for (let y = 0; y < 40; y++) for (let x = 0; x < 256; x++) {
      if (y < 6 && FK.bayer(x, y) < (6 - y) / 7) px(seg, x, y, 0x00);
      else if (y < 16 && FK.bayer(x, y) < (16 - y) / 24) px(seg, x, y, 0x1c);
    }
    const rr = FK.rng(5);
    for (let i = 0; i < 60; i++) {
      const y = 3 + Math.floor(rr() * 36), x = Math.floor(rr() * 256), l = 1 + Math.floor((y / 36) * 4 * rr());
      px(seg, x, y, 0x10, l, 1);
    }
    // The near sea: dark swells in long rows, each with a pale lip.
    const near = canvas(256, 80), ng = near.getContext('2d');
    px(ng, 0, 0, 0x0c, 256, 80);
    for (let y = 0; y < 80; y++) {
      const per = 6 + Math.floor(y / 6);
      for (let x = 0; x < 256; x++) {
        const ph = (x + Math.floor(Math.sin(y * 1.7) * 30) + 256) % 64;
        if (y % per === 0 && ph < 22 + (y >> 1)) px(ng, x, y, 0x1c);
        else if (y % per === 1 && ph > 4 && ph < 18 + (y >> 1)) px(ng, x, y, 0x0f);
      }
    }
    for (let i = 0; i < 40; i++) { const y = Math.floor(rr() * 80), x = Math.floor(rr() * 256); px(ng, x, y, 0x10, 1 + (y >> 4), 1); }
    // Headlands across the bay: black cliffs with faint strata, a lip of
    // turf, a line of surf at their feet.
    const head = canvas(512, 40), hg = head.getContext('2d');
    const prof = ridge(512, 23, 0, 10, 0.55);
    // [start, length, height]: each headland rises sheer from the sea at its
    // west end and slopes away east under its turf.
    const lands = [[30, 120, 26], [190, 60, 14], [300, 150, 32], [470, 30, 8]];
    for (const [x0, len, hh] of lands) for (let i = 0; i < len; i++) {
      const x = (x0 + i) % 512;
      let hgt = i < 3 ? hh * (i + 1) / 4 : hh - (i / len) * hh * 0.7 + prof[x] * 0.5;
      if (i > len - 10) hgt *= (len - i) / 10;
      hgt = Math.round(Math.max(1, hgt));
      const y0 = 38 - hgt;
      px(hg, x, y0, 0x0f, 1, hgt);
      if (i < 4) px(hg, x, y0 + 1, 0x0c, 1, hgt - 1);
      for (let y = y0 + 3; y < 36; y += 4) if (((x >> 2) + (y >> 2)) % 3 === 0) px(hg, x, y, 0x0c, 2, 1);
      px(hg, x, y0, 0x0b, 1, 1);
      if (FK.bayer(x, 37) < 0.5) px(hg, x, 37, 0x10, 1, 1);
    }
    make('orkney', [
      { img: s, still: true },
      { img: rollA, f: 0.03, y: 6, fy: 0, drift: 0.05 },
      { img: rollB, f: 0.05, y: 46, fy: 0, drift: 0.09 },
      { img: low, f: 0.08, y: 20, fy: 0, drift: 0.4 },
      { img: rollC, f: 0.07, y: 92, fy: 0, drift: 0.14 },
      { img: isl, f: 0.1, y: 112, fy: 0.04 },
      { img: sea, f: 0.15, y: 136, fy: 0.06 },
      { img: head, f: 0.22, y: 130, fy: 0.08 },
      { img: near, f: 0.3, y: 166, fy: 0.1, fill: 0x0c },
    ]);
  }


  /* ============================================================== SEA */
  // Adrift at night in a storm: wreckage from a broken hull, black sea
  // stacks streaming with water, and the sea itself.
  const sea = {
    k: 0x0f,
    O: 0x18, o: 0x08, b: 0x07, F: 0x0f, n: 0x2d, r: 0x18,  // wet timber, iron bolts
    L: 0x1c, g: 0x0c, d: 0x0f, y: 0x0b, Y: 0x1b,        // wet black rock: sheen, face, weed
    W: 0x30, w: 0x10, c: 0x2c, C: 0x1c, s: 0x0c, D: 0x0f, // water: foam, spray, crest, swell
  };
  // Hull planking: long strakes lapped one over the next, lit along the top
  // of each, dark under the lap, with grain streaks and iron nails. A rib
  // runs down through the planking.
  const wreck_m = [
    'OOOOOOOOOOkkOOOO',
    'oooooobooonkoobo',
    'onooobbbbbbkbbbb',
    'kkkkkkkkkkkkkkkk',
    'OOOOOOOOOOkkOOOO',
    'ooooboooooOkoooo',
    'bbbbbbbbbbnkbbbb',
    'kkkkkkkkkkkkkkkk',
    'OOOOkOOOOOkkOOOO',
    'oooonoobooOkoboo',
    'bbbbkbbbbbnkbbbb',
    'kkkkkkkkkkkkkkkk',
    'OOOOOOOOOOkkOOOO',
    'ooboooooooOkoooo',
    'bbbbbbbbbbnkbbbn',
    'kkkkkkkkkkkkkkkk',
  ];
  // The top: a deck strake to stand on, a jagged break below it.
  const wreck_t = [
    'kkkkkkkkkkkkkkkk',
    'OOOOOOOOOOOOOOOO',
    'ooonooooooooonoo',
    'oobbbbbbobbbbbbb',
    'kkkkkkkkkkkkkkkk',
    'OOOOOOOOOOkkOOOO',
    'ooooboooooOkoooo',
    'bbbbbbbbbbnkbbbb',
    'kkkkkkkkkkkkkkkk',
    'OOOOkOOOOOkkOOOO',
    'oooonoobooOkoboo',
    'bbbbkbbbbbnkbbbb',
    'kkkkkkkkkkkkkkkk',
    'OOOOOOOOOOkkOOOO',
    'ooboooooooOkoooo',
    'bbbbbbbbbbnkbbbn',
  ];
  // Splintered ends: each strake stops at its own length, cut ragged.
  const ends = [['kO', 'ko', 'kb', '.k'], ['.kO', '.ko', 'kbb', '.kk'], ['kOO', 'koo', '.kb', '..k']];
  const wreckL = (rows, top) => left(rows, rows.map((r, y) => {
    if (top && y < 5) return ['.k', 'kO', 'ko', 'kb', '.k'][y];
    const e = ends[((y - (top ? 1 : 0)) >> 2) % 3];
    return e[(y - (top ? 1 : 0)) & 3];
  }));
  const endsR = [['Ok', 'ok', 'bk', 'k.'], ['Ok.', 'ok.', 'bbk', 'kk.'], ['OOk', 'ook', 'bk.', 'k..']];
  const wreckR = (rows, top) => right(rows, rows.map((r, y) => {
    if (top && y < 5) return ['k.', 'Ok', 'ok', 'bk', 'k.'][y];
    const e = endsR[((y - (top ? 1 : 0) + 4) >> 2) % 3];
    return e[(y - (top ? 1 : 0)) & 3];
  }));
  def(sea, {
    sea_wreck_t: wreck_t,
    sea_wreck_m: wreck_m,
    sea_wreck_tl: wreckL(wreck_t, true), sea_wreck_tr: wreckR(wreck_t, true), sea_wreck_tlr: wreckR(wreckL(wreck_t, true), true),
    sea_wreck_ml: wreckL(wreck_m), sea_wreck_mr: wreckR(wreck_m), sea_wreck_mlr: wreckR(wreckL(wreck_m)),
  });

  // Sea stacks: black rock broken into blocks, streaming wet; each block
  // has a face catching the storm light and a face lost in shadow, weed
  // in the cracks. Drawn from crack layouts, like the Orkney cliff.
  const seaRock = { k: 0x0f, L: 0x1c, g: 0x00, d: 0x0c, y: 0x0b, Y: 0x1b };
  def(seaRock, {
    sea_rock_m: [
      'gkdkkkggkdkggggg',
      'kkkkkkgkdddkgggg',
      'dkdkkkkddkkkgggk',
      'kkkkkkddkkkkggkk',
      'kkkLLkkkkkkkkkkk',
      'kLkggLkkkkLLkLkk',
      'LgkgggLkLLggkgLL',
      'ggkggkdkgggkkggg',
      'gkkgkykkggkdkgyg',
      'kkkkddkkgkdddkgg',
      'dkkdkkddkddkkkgk',
      'kkkkkkkkkdkkkkkk',
      'kkkLkLkkkkkkkkkk',
      'LLLkkgLkkkkkLLLL',
      'ggkdkggLkkkLgggg',
      'ggdddkggLLkggggg',
    ],
    sea_rock_m2: [
      'dkkkgkkkgggkdkkk',
      'kdkkkdkkggkkkdkk',
      'kkkkdkkkgkkkkkkk',
      'kkkkkkkkkLLkLkkk',
      'LLLkkkkLLgkkgLLL',
      'gkdgdgkggggkgggg',
      'kddkdkkggyYkkggg',
      'ddkkkkLggYkgkggk',
      'dkkkkkgggkdkkggd',
      'kkkkkkggkkkkkgkk',
      'kkLkLkkkkkkkkkkk',
      'LLgkgLLkkkkkLLkL',
      'ggkkgggLkLLLggkg',
      'gkgkgggkkggggkkg',
      'kdgkgggdkgggkdkg',
      'ddkkggkkLgggdddk',
    ],
    sea_rock_t: [
      'kkkkkkkkkkkkkkkk',
      'LLLLLLLLLLLLLLLL',
      'kgkyYgggkgkYygkg',
      'kkkkgkgkkkkkgkkk',
      'gkkLkkkkgdkkkkgd',
      'kLkgLLkgkkLLkLkk',
      'LgkgggLkLLggkgLL',
      'ggkggkdkgggkkggg',
      'gkkgkdkkggkdkggg',
      'kkkkddkkgkdddkgg',
      'dkkdkkddkddkkkgk',
      'kkkkkkkkkdkkkkkk',
      'kkkLkLkkkkkkkkkk',
      'LLLkkgLkkkkkLLLL',
      'ggkdkggLkkkLgggg',
      'ggdkdkgkLLkkgkgk',
    ],
    sea_rock_ml: [
      'kkdkkkggkdkggggg',
      'kkkkkkgkdddkgggg',
      'kkdkkkkddkkkgggk',
      'kkkkkkddkkkkggkk',
      'kkkLLkkkkkkkkkkk',
      'kLkggLkkkkLLkLkk',
      'kLkgggLkLLggkgLL',
      'kgkggkdkgggkkggg',
      'kkkgkykkggkdkgyg',
      'kkkkddkkgkdddkgg',
      'kkkdkkddkddkkkgk',
      'kkkkkkkkkdkkkkkk',
      '.kkLkLkkkkkkkkkk',
      'kLLkkgLkkkkkLLLL',
      'kLkdkggLkkkLgggg',
      'kgdddkggLLkggggg',
    ],
    sea_rock_mr: [
      'gkdkkkggkdkgggkk',
      'kkkkkkgkdddkgggk',
      'dkdkkkkddkkkggkk',
      'kkkkkkddkkkkggkk',
      'kkkLLkkkkkkkkkkk',
      'kLkggLkkkkLLkLk.',
      'LgkgggLkLLggkgLk',
      'ggkggkdkgggkkggk',
      'gkkgkykkggkdkgkk',
      'kkkkddkkgkdddkgk',
      'dkkdkkddkddkkkkk',
      'kkkkkkkkkdkkkkkk',
      'kkkLkLkkkkkkkkk.',
      'LLLkkgLkkkkkLLLk',
      'ggkdkggLkkkLggkk',
      'ggdddkggLLkggggk',
    ],
    sea_rock_mlr: [
      'kkdkkkggkdkgggkk',
      'kkkkkkgkdddkgggk',
      'kkdkkkkddkkkggkk',
      'kkkkkkddkkkkggkk',
      'kkkLLkkkkkkkkkkk',
      'kLkggLkkkkLLkLk.',
      'kLkgggLkLLggkgLk',
      'kgkggkdkgggkkggk',
      'kkkgkykkggkdkgkk',
      'kkkkddkkgkdddkgk',
      'kkkdkkddkddkkkkk',
      'kkkkkkkkkdkkkkkk',
      '.kkLkLkkkkkkkkk.',
      'kLLkkgLkkkkkLLLk',
      'kLkdkggLkkkLggkk',
      'kgdddkggLLkggggk',
    ],
    sea_rock_tl: [
      '..kkkkkkkkkkkkkk',
      '.kLLLLLLLLLLLLLL',
      'kLkyYgggkgkYygkg',
      '.kkkgkgkkkkkgkkk',
      'kkkLkkkkgdkkkkgd',
      'kLkgLLkgkkLLkLkk',
      'kLkgggLkLLggkgLL',
      'kgkggkdkgggkkggg',
      'kkkgkdkkggkdkggg',
      'kkkkddkkgkdddkgg',
      'kkkdkkddkddkkkgk',
      'kkkkkkkkkdkkkkkk',
      '.kkLkLkkkkkkkkkk',
      'kLLkkgLkkkkkLLLL',
      'kLkdkggLkkkLgggg',
      'kgdkdkgkLLkkgkgk',
    ],
    sea_rock_tr: [
      'kkkkkkkkkkkkkk..',
      'LLLLLLLLLLLLLLk.',
      'kgkyYgggkgkYygkk',
      'kkkkgkgkkkkkgkk.',
      'gkkLkkkkgdkkkkkk',
      'kLkgLLkgkkLLkLk.',
      'LgkgggLkLLggkgLk',
      'ggkggkdkgggkkggk',
      'gkkgkdkkggkdkgkk',
      'kkkkddkkgkdddkgk',
      'dkkdkkddkddkkkkk',
      'kkkkkkkkkdkkkkkk',
      'kkkLkLkkkkkkkkk.',
      'LLLkkgLkkkkkLLLk',
      'ggkdkggLkkkLggkk',
      'ggdkdkgkLLkkgkgk',
    ],
    sea_rock_tlr: [
      '..kkkkkkkkkkkk..',
      '.kLLLLLLLLLLLLk.',
      'kLkyYgggkgkYygkk',
      '.kkkgkgkkkkkgkk.',
      'kkkLkkkkgdkkkkkk',
      'kLkgLLkgkkLLkLk.',
      'kLkgggLkLLggkgLk',
      'kgkggkdkgggkkggk',
      'kkkgkdkkggkdkgkk',
      'kkkkddkkgkdddkgk',
      'kkkdkkddkddkkkkk',
      'kkkkkkkkkdkkkkkk',
      '.kkLkLkkkkkkkkk.',
      'kLLkkgLkkkkkLLLk',
      'kLkdkggLkkkLggkk',
      'kgdkdkgkLLkkgkgk',
    ],
  });

  // A barrel, bound with iron hoops, floating upright.
  def(sea, {
    sea_crate: [
      '...kkkkkkkkkk...',
      '..kOOOOOOOOOok..',
      '.kOoooooooooobk.',
      '.knnnnnnnnnnnnk.',
      'kOoobOoobOoobbbk',
      'kOoobOoobOoobbbk',
      'kOoobOoobOoobbbk',
      'knnnnnnnnnnnnnnk',
      'kOoobOoobOoobbbk',
      'kOoobOoobOoobbbk',
      'kOoobOoobOoobbbk',
      '.knnnnnnnnnnnnk.',
      '.kOoobOoobOoobk.',
      '..kbbbbbbbbbbk..',
      '...kkkkkkkkkk...',
      '................',
    ],
  });

  // Storm water: a breaking crest with spray blown off it, then a swell
  // shaded down into the dark. Three frames roll the crest along.
  const wtop = [
    '.........w......',
    '.....w....w.....',
    '...........w..W.',
    '....WWW......WWc',
    '..WWccWW...WWccC',
    'WWccCCcWWWWccCCC',
  ];
  const wbody = [
    'cCCCCCCCcccCCCCs',
    'CCCsCCCCCCCCCCss',
    'CsssssCCCCCssssC',
    'sssssssssssssCCC',
    'sssCCsssssssssss',
    'ssssssssDsssssss',
    'sDsssssssssssDss',
    'ssssDsssssDsssss',
    'DsssssssDsssssDs',
    'ssDsDsssssDsDsss',
  ];
  const waterF = (a, b) => [...wtop.map((r) => rot(r, a)), ...wbody.map((r) => rot(r, b))];
  const deep = [
    'sDsDssDsssDsDsss',
    'DsssDsssDssssDsD',
    'sDsDsDsDsDsDsDsD',
    'DsDDDsDDDsDDDsDD',
    'DDDsDDDDDDDsDDDD',
    'DDDDDDDDDDDDDDDD',
    'DDDDDDDDDDDDDDDD',
    'DDDDDDsDDDDDDDDD',
    'DDDDDDDDDDDDDDDD',
    'DDDDDDDDDDDDDDDD',
    'DDDDDDDDDDDDDsDD',
    'DDDDDDDDDDDDDDDD',
    'DDsDDDDDDDDDDDDD',
    'DDDDDDDDDDDDDDDD',
    'DDDDDDDDsDDDDDDD',
    'DDDDDDDDDDDDDDDD',
  ];
  def(sea, {
    sea_water1: waterF(0, 0), sea_water2: waterF(5, 2), sea_water3: waterF(10, 4),
    sea_deep1: deep, sea_deep2: deep.map((r) => rot(r, 3)),
  });

  /* ---------------------------------------------------------- Storm sea */
  // Night: a low sky of storm cloud, a black horizon, swells rolling in
  // ranks toward the viewer. Lightning lights everything for a few frames.
  {
    const s = sky(SW, SH, [[0x0f, 0], [0x0c, 92, 14]]);
    const sLit = sky(SW, SH, [[0x00, 0], [0x10, 70, 12]]);
    // Cloud masses: heavy and low.
    function storm(w, h, seed, o) {
      const c = canvas(w, h), g = c.getContext('2d');
      const r = FK.rng(seed);
      const top = new Array(w).fill(h), bot = new Array(w).fill(-1);
      for (let i = 0; i < o.n; i++) {
        const cx = Math.floor(r() * w), rw = o.rw0 + Math.floor(r() * o.rw1), cy = o.y0 + Math.floor(r() * (o.y1 - o.y0));
        const rh = Math.round(rw * (0.4 + r() * 0.3));
        for (let dx = -rw; dx <= rw; dx++) {
          const xx = ((cx + dx) % w + w) % w;
          const e = Math.sqrt(1 - (dx / rw) ** 2);
          const t = Math.round(cy - rh * e), b = Math.round(cy + rh * e * 0.5);
          if (t < top[xx]) top[xx] = t;
          if (b > bot[xx]) bot[xx] = b;
        }
      }
      for (let x = 0; x < w; x++) {
        if (bot[x] < 0) continue;
        const t = Math.max(0, top[x]), b = Math.min(h - 1, bot[x]);
        px(g, x, t, o.body, 1, b - t + 1);
        px(g, x, t, o.lit, 1, 1);
        if ((x + t) % 2 === 0) px(g, x, t + 1, o.lit, 1, 1);
        // ragged, dithered underside trailing into rain
        for (let y = b + 1; y < Math.min(h, b + 6); y++) if (FK.bayer(x, y) < 0.6 - (y - b) * 0.12) px(g, x, y, o.body, 1, 1);
      }
      return c;
    }
    const cloudA = storm(512, 100, 3, { n: 40, rw0: 10, rw1: 18, y0: 22, y1: 58, body: 0x0c, lit: 0x1c, fade: 0x0c });
    const cloudB = storm(512, 100, 9, { n: 36, rw0: 8, rw1: 14, y0: 46, y1: 80, body: 0x0f, lit: 0x0c, fade: 0x0f });
    const cloudAL = storm(512, 100, 3, { n: 40, rw0: 10, rw1: 18, y0: 22, y1: 58, body: 0x00, lit: 0x30, fade: 0x00 });
    const cloudBL = storm(512, 100, 9, { n: 36, rw0: 8, rw1: 14, y0: 46, y1: 80, body: 0x2d, lit: 0x10, fade: 0x2d });
    const lit = (t, W) => W && W.flash > 0;
    const dark = (t, W) => !(W && W.flash > 0);

    /* Swells, drawn every frame: ranks of waves, each a sum of two sines
     * moving at its own speed. Far ranks are small and dark, near ones
     * tall with a crest line and blown spawn of foam. */
    const ranks = [
      { y: 108, amp: 2, len: 19, sp: 0.020, f: 0.08, body: 0x0f, crest: 0x0c, litB: 0x2d, litC: 0x10 },
      { y: 116, amp: 3, len: 29, sp: 0.026, f: 0.11, body: 0x0c, crest: 0x1c, litB: 0x0f, litC: 0x2d },
      { y: 128, amp: 4, len: 37, sp: 0.032, f: 0.15, body: 0x0f, crest: 0x0c, litB: 0x2d, litC: 0x10 },
      { y: 144, amp: 6, len: 53, sp: 0.040, f: 0.2, body: 0x0c, crest: 0x1c, litB: 0x0f, litC: 0x10 },
      { y: 166, amp: 9, len: 71, sp: 0.048, f: 0.27, body: 0x0f, crest: 0x1c, litB: 0x0f, litC: 0x30 },
    ];


    const cap = (t) => t;
    make('stormSea', [
      { img: s, still: true, when: dark },
      { img: sLit, still: true, when: lit },
      { img: cloudA, f: 0.04, y: -6, fy: 0, drift: 0.2, when: dark },
      { img: cloudAL, f: 0.04, y: -6, fy: 0, drift: 0.2, when: lit },
      { img: cloudB, f: 0.07, y: 20, fy: 0, drift: 0.35, when: dark },
      { img: cloudBL, f: 0.07, y: 20, fy: 0, drift: 0.35, when: lit },
    ], (g, cx, cy, t, W) => {
      const flash = W && W.flash > 0;
      const oy = -Math.round(cy * 0.08);
      // A fork of lightning while the flash lasts, fixed at its first frame.
      if (flash) {
        const t0 = t - (10 - W.flash), r = FK.rng(t0 * 7919 + 13);
        let x = 40 + Math.floor(r() * 176), y = 0;
        while (y < 100 + oy) {
          const nx = x + Math.floor(r() * 9) - 4, ny = y + 3 + Math.floor(r() * 5);
          for (let k = 0; k <= ny - y; k++) px(g, Math.round(x + (nx - x) * k / (ny - y)), y + k, 0x30, 1, 1);
          if (r() < 0.12) { let bx = x, by = y; for (let k = 0; k < 10; k++) { bx += r() < 0.5 ? 1 : -1; by += 2; px(g, bx, by, 0x31, 1, 2); } }
          x = nx; y = ny;
        }
      }
      // The horizon line.
      px(g, 0, 102 + oy, flash ? 0x10 : 0x0c, SW, 1);
      px(g, 0, 103 + oy, flash ? 0x2d : 0x0f, SW, 6);
      for (let i = 0; i < ranks.length; i++) {
        const k = ranks[i];
        const base = k.y + oy;
        const sh = cx * k.f;
        const next = i + 1 < ranks.length ? ranks[i + 1].y + oy : SH;
        for (let x = 0; x < SW; x++) {
          const u = x + sh;
          const h = k.amp * (Math.sin(u / k.len * 6.283 + t * k.sp * 6.283) * 0.7 + Math.sin(u / (k.len * 0.47) * 6.283 - t * k.sp * 4) * 0.3);
          const top = Math.round(base - k.amp - h);
          px(g, x, top, flash ? k.litC : k.crest, 1, 1);
          px(g, x, top + 1, flash ? k.litB : k.body, 1, Math.max(1, next - top));
          // Foam on the steepest crests.
          if (h > k.amp * 0.75 && (Math.floor(u) & 1)) px(g, x, top - 1, flash ? 0x30 : k.crest, 1, 1);
          // Troughs darker under the crest.
          if (i >= 2 && (x + top) % 2 === 0) px(g, x, top + 2, flash ? k.litC : k.crest, 1, 1);
        }
      }
      // Far rain: fine, steep, faint streaks behind the stage's own rain.
      for (let i = 0; i < 40; i++) {
        const x = ((i * 71 + t * 3 - cx * 0.2) % 270 + 270) % 270 - 7, y = ((i * 37 + t * 9) % 140);
        px(g, x, y, flash ? 0x10 : 0x0c, 1, 3);
      }
    });
  }


  /* ============================================================== INN */
  // The inn at Evian, the wedding night: polished boards, papered walls
  // above dark wainscot, candles in sconces, rain on the windows over the
  // lake. Quiet, warm, tense.
  const inn = {
    k: 0x0f,
    O: 0x17, o: 0x07, b: 0x08, B: 0x0f,     // oak: waxed glint, face, shade, deep
    p: 0x07, P: 0x06, q: 0x0f,              // wallpaper: oxblood ground, figure, stripe
    w: 0x10, W: 0x37, y: 0x18, Y: 0x28,     // linen fold, linen, brass, brass glint
    g: 0x0c, N: 0x1c,                       // night window: glass, rain
    c: 0x0f, C: 0x06,                       // curtains
    f: 0x16, F: 0x27, h: 0x38,              // flame
    s: 0x00, S: 0x10, X: 0x30, x: 0x37,     // pewter / iron, candle wax
  };
  // Floor: wide planks seen edge-on, a waxed glint, the joist below, and the
  // lath-and-beam of the ceiling under it (rooms are stacked).
  const floor_t = [
    'kkkkkkkkkkkkkkkk',
    'OOOOOOOOOOOOOOOO',
    'oooooookoooooooo',
    'oooooookooooobbo',
    'bbbbbbbkbbbbbbbb',
    'kkkkkkkkkkkkkkkk',
    'obbbbbbbbbbbbbbb',
    'bbbbbbobbbbbbbbb',
    'bbbbbbbbbbbbbobb',
    'kkkkkkkkkkkkkkkk',
    'bobbbobbbobbbobb',
    'kbkkkbkkkbkkkbkk',
    'kkkkkkkkkkkkkkkk',
    '................',
    '................',
    '................',
  ];
  // Below a floor: dark oak panelling (the foundation, or a wall below).
  const floor_m = [
    'kkkkkkkkkkkkkkkk',
    'kobbbbbbkobbbbbb',
    'kbkkkkkbkbkkkkkb',
    'kbkbbbkbkbkbbbkb',
    'kbkbbbkbkbkbbbkb',
    'kbkbbbkbkbkbbbkb',
    'kbkbbbkbkbkbbbkb',
    'kbkbbbkbkbkbbbkb',
    'kbkkkkkbkbkkkkkb',
    'kbbbbbbbkbbbbbbb',
    'kkkkkkkkkkkkkkkk',
    'obbbbbbbbbbbbbbb',
    'bbbbbbobbbbbbbbb',
    'kkkkkkkkkkkkkkkk',
    'kobbbbbbkobbbbbb',
    'kbkkkkkbkbkkkkkb',
  ];
  const fL = (rows, top) => left(rows, rows.map((r, y) => (top && (y === 0 || y > 12) ? '.' : 'k')));
  const fR = (rows, top) => right(rows, rows.map((r, y) => (top && (y === 0 || y > 12) ? '.' : 'k')));
  def(inn, {
    inn_floor_t: floor_t, inn_floor_m: floor_m,
    inn_floor_tl: fL(floor_t, true), inn_floor_tr: fR(floor_t, true), inn_floor_tlr: fR(fL(floor_t, true), true),
    inn_floor_ml: fL(floor_m), inn_floor_mr: fR(floor_m), inn_floor_mlr: fR(fL(floor_m)),
  });

  // Partition walls: papered in a deep red damask stripe between a dado
  // rail and a moulded cornice; oak framing at the edges.
  const paper = (seed) => {
    const out = [];
    for (let y = 0; y < 16; y++) {
      let row = '';
      for (let x = 0; x < 16; x++) {
        const sx = x % 8, sy = (y + (x >= 8 ? 4 : 0)) % 8;
        // a small diamond figure on each stripe, alternating height
        const fig = (sx === 4 && (sy === 1 || sy === 3)) || (sy === 2 && (sx === 3 || sx === 5));
        row += sx === 0 ? 'q' : fig ? 'P' : 'p';
      }
      out.push(row);
    }
    return out;
  };
  const wall_m = paper();
  const wall_t = [
    'kkkkkkkkkkkkkkkk',
    'OOOOOOOOOOOOOOOO',
    'oooooooooooooooo',
    'bbbbbbbbbbbbbbbb',
    'kyykyykyykyykyyk',
    'kkkkkkkkkkkkkkkk',
    ...paper().slice(6),
  ];
  // A framed painting: a dim landscape in a gilt frame (the Alps at dusk).
  const wall_m2 = [
    'qppPpppPqppPpppP',
    'qpkkkkkkkkkkkkpp',
    'qpkyyyyyyyyyyykp',
    'qpkYkggggggggykp',
    'qpkykgggggSggykp',
    'qpkykggSgSsSgykp',
    'qpkyksSssssssykp',
    'qpkykssbsssbsykp',
    'qpkykNNNNNNNNykp',
    'qpkykgNgggNggykp',
    'qpkyyyyyyyyyyykP',
    'qpkkkkkkkkkkkkpp',
    'qppPpppPqppPpppP',
    'qppppppPqpppPppp',
    'qppPpppPqppPpppP',
    'qpppPpppqppppPpp',
  ];
  // A dark window in a deep reveal: night, rain on the glass.
  const wall_m3 = [
    'qppPpppPqppPpppP',
    'qpkkkkkkkkkkkkpp',
    'qpkOooooooooobkp',
    'qpkokggggkgggbkp',
    'qpkokgNggkgggbkp',
    'qpkokggggkgNgbkp',
    'qpkokgggNkgggbkp',
    'qpkokkkkkkkkkbkp',
    'qpkokgNggkgggbkp',
    'qpkokggggkggNbkp',
    'qpkokgggNkgggbkp',
    'qpkokggggkgggbkp',
    'qpkobbbbbbbbbbkP',
    'qpkOOOOOOOOOOOOk',
    'qppkkkkkkkkkkkkp',
    'qpppPpppqppppPpp',
  ];
  const wL = (rows, top) => left(rows, rows.map((r, y) => (top && y === 0 ? '.k' : top && y < 4 ? 'k' + 'Oob'[y - 1] : 'kB')));
  const wR = (rows, top) => right(rows, rows.map((r, y) => (top && y === 0 ? 'k.' : top && y < 4 ? 'Oob'[y - 1] + 'k' : 'Bk')));
  def(inn, {
    inn_wall_t: wall_t, inn_wall_m: wall_m, inn_wall_m2: wall_m2, inn_wall_m3: wall_m3,
    inn_wall_tl: wL(wall_t, true), inn_wall_tr: wR(wall_t, true), inn_wall_tlr: wR(wL(wall_t, true), true),
    inn_wall_ml: wL(wall_m), inn_wall_mr: wR(wall_m), inn_wall_mlr: wR(wL(wall_m)),
  });

  // A table with a cloth, a pewter jug; the legs below.
  def(inn, {
    inn_table: [
      '..........kk....',
      '.........kSsk...',
      '..kk....kSssk...',
      '.kXxk...kSssk...',
      'kkkkkkkkkkkkkkkk',
      'kWWWWWWWWWWWWWWk',
      'kWwWWWWwWWWWWwWk',
      'kwkwwkwwkwwkwwkk',
      'kkokkkkkkkkkkokk',
      '.kok........kok.',
      '.kbk........kbk.',
      '.kok........kok.',
      '.kbk........kbk.',
      '.kok........kok.',
      'kkbkk......kkbkk',
      '................',
    ],
    // The landing: a polished rail on turned balusters.
    inn_landing: [
      'kkkkkkkkkkkkkkkk',
      'OOOOOOOOOOOOOOOO',
      'oooooookoooooooo',
      'bbbbbbbkbbbbbbbb',
      'kkkkkkkkkkkkkkkk',
      'oobkoobkoobkoobk',
      'bbbkbbbkbbbkbbbk',
      'kkkkkkkkkkkkkkkk',
      ...rep('................', 8),
    ],
    // A steep stair-ladder: worn treads between two stringers.
    inn_ladder: [
      '.kok.......kok..',
      '.kokkkkkkkkkok..',
      '.kOOOOOOOOOOOk..',
      '.kobbbbbbbbbbk..',
      '.kokkkkkkkkkok..',
      '.kbk.......kbk..',
      '.kok.......kok..',
      '.kok.......kok..',
      '.kok.......kok..',
      '.kokkkkkkkkkok..',
      '.kOOOOOOOOOOOk..',
      '.kobbbbbbbbbbk..',
      '.kokkkkkkkkkok..',
      '.kbk.......kbk..',
      '.kok.......kok..',
      '.kok.......kok..',
    ],
  });

  // A curtained window over the lake, rain streaking the panes; frame 2 is
  // lightning: the panes go white and the mountains across the water show.
  const win = (lit) => {
    const G = lit ? 'X' : 'g', H = lit ? 'S' : 'N', M = lit ? 's' : 'g', M2 = lit ? 'S' : 'g';
    return [
      'kkkkkkkkkkkkkkkk',
      'kccCkkkkkkkkCcck',
      'kcCCkOoooooobkCk',
      'kcCkko' + G + G + G + 'k' + G + G + G + 'bkCk',
      'kcCkko' + G + H + G + 'k' + G + G + G + 'bkCk',
      'kcCkko' + G + G + G + 'k' + G + H + G + 'bkCk',
      'kcCkko' + M + M + G + 'k' + G + M + M + 'bkCk',
      'kCCkkokkkkkkbkCk',
      'kcCkko' + M2 + M + M + 'k' + M + M + M2 + 'bkCk',
      'kcCkko' + G + G + H + 'k' + G + G + G + 'bkCk',
      'kcCkko' + G + G + G + 'k' + H + G + G + 'bkCk',
      'kcCCkobbbbbbbkCk',
      'kccCkOOOOOOOOkCk',
      'kccCCkkkkkkkkCck',
      'kcccCk....kkCcck',
      'kkkkkk....kkkkkk',
    ].map((r) => r.slice(0, 16));
  };
  // Candle in a wall sconce: three flame frames.
  const candle = (f) => {
    const fl = [
      ['.......h........', '......hFh.......', '......FFF.......', '......fFf.......'],
      ['........h.......', '.......hF.......', '......FFFh......', '......fFf.......'],
      ['......h.........', '......Fh........', '.....hFFF.......', '......fFf.......'],
    ][f];
    return [
      '................',
      ...fl,
      '.......k........',
      '......kXk.......',
      '......kXk.......',
      '......kxk.......',
      '......kxk.......',
      '....kkkkkkk.....',
      '....kYyyyyk.....',
      '.....kkyykk.kk..',
      '.......kyk.kYyk.',
      '........kyykyyk.',
      '..........kkYyk.',
    ];
  };
  def(inn, {
    inn_window1: win(false), inn_window2: win(true),
    inn_candle1: candle(0), inn_candle2: candle(1), inn_candle3: candle(2),
  });

  /* ------------------------------------------------------- Inn interior */
  // The back wall of the rooms: darker paper than the partitions, a tall
  // wainscot, a picture rail with frames hung from it, a door now and then.
  {
    const w = 256, h = 224;
    const c = canvas(w, h), g = c.getContext('2d');
    // wallpaper: dark stripes with a faint figure
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const sx = x % 12, sy = (y + (Math.floor(x / 12) % 2) * 6) % 12;
      let col = sx === 0 || sx === 1 ? 0x0f : (sx + y) % 2 ? 0x0f : 0x08;
      if ((sx === 6 && (sy === 2 || sy === 4)) || (sy === 3 && (sx === 5 || sx === 7))) col = 0x08;
      px(g, x, y, col);
    }
    // cornice and picture rail
    px(g, 0, 0, 0x08, w, 3); px(g, 0, 3, 0x0f, w, 1);
    px(g, 0, 26, 0x08, w, 1); px(g, 0, 27, 0x0f, w, 1);
    // wainscot: panels from y 150 down, repeated for every storey
    const wains = (y0) => {
      px(g, 0, y0, 0x07, w, 1); px(g, 0, y0 + 1, 0x08, w, 2); px(g, 0, y0 + 3, 0x0f, w, 1);
      for (let x = 0; x < w; x += 32) {
        px(g, x, y0 + 4, 0x0f, 1, 40);
        px(g, x + 4, y0 + 8, 0x08, 24, 1); px(g, x + 4, y0 + 8, 0x08, 1, 30);
        for (let yy = 0; yy < 28; yy++) for (let xx = 0; xx < 22; xx++) if ((xx + yy) % 2) px(g, x + 5 + xx, y0 + 9 + yy, 0x08);
        px(g, x + 4, y0 + 38, 0x0f, 25, 1); px(g, x + 28, y0 + 8, 0x0f, 1, 31);
      }
    };
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {}
    wains(176);
    // framed pictures hung on cords from the rail
    const frame = (x, y, fw, fh, kind) => {
      px(g, x + fw / 2, 28, 0x0f, 1, y - 28);
      px(g, x - 1, y - 1, 0x0f, fw + 2, fh + 2);
      px(g, x, y, 0x08, fw, fh);
      px(g, x + 2, y + 2, 0x0f, fw - 4, fh - 4);
      if (kind === 0) { // a portrait: a pale oval face in the dark
        px(g, x + 3, y + 3, 0x0f, fw - 6, fh - 6);
        for (let yy = 0; yy < 9; yy++) for (let xx = 0; xx < 7; xx++) if (((xx - 3) / 3.5) ** 2 + ((yy - 4) / 4.5) ** 2 < 1) px(g, x + fw / 2 - 3 + xx, y + 6 + yy, 0x07);
        px(g, x + 4, y + fh - 7, 0x0f, fw - 8, 4);
      } else {          // a lake under mountains
        px(g, x + 3, y + 3, 0x0c, fw - 6, (fh - 6) >> 1);
        px(g, x + 3, y + 3 + ((fh - 6) >> 1), 0x08, fw - 6, (fh - 6) - ((fh - 6) >> 1));
        for (let i = 0; i < fw - 6; i++) { const mh = Math.abs(((i * 3) % 14) - 7); px(g, x + 3 + i, y + 3 + ((fh - 6) >> 1) - mh / 2, 0x00, 1, mh / 2); }
      }
    };
    frame(40, 60, 24, 30, 0);
    frame(150, 54, 40, 26, 1);
    // dim it: a dither of black over everything, heavier at the top
    make('innIn', [{ img: c, f: 0.5, y: 0, fy: 0.5, repeatY: true }]);
  }


  /* =========================================================== TUNDRA */
  // The wilds of Russia: deep wind-carved snow over frozen black earth,
  // river ice, boulders capped with snow, bare birches. Pale daylight.
  const tun = {
    k: 0x0f,
    W: 0x30, w: 0x20, b: 0x10, B: 0x00, s: 0x10,   // snow: white, lit, grey shade, deeper
    e: 0x0f, E: 0x08, d: 0x2d,                      // frozen earth: black, peat, frost
    I: 0x30, i: 0x31, j: 0x2c, J: 0x21, z: 0x11,    // ice: glint, face, mid, deep, crack
    L: 0x10, g: 0x00, G: 0x2d,                      // boulder rock
    T: 0x30, t: 0x10, m: 0x00,                      // birch bark: white, grey, black marks
    c: 0x27,                                        // cut wood, raw and pale
  };
  // Snow: a wind-carved surface with a crust that catches the light, blue
  // shadow in the hollows, then the earth showing through below.
  const snow_t = [
    '.....kkkkk......',
    'kkkkkWWWWWkkkkkk',
    'WWWWWwwwwwWWWWWW',
    'wwwwwwwwwwwwwwww',
    'wwwbwwwwwwwwwbww',
    'bwbbbwwwbwwwbbbw',
    'bbbbbbwbbbbbbbbb',
    'bBbbbbbbbbbBbbbb',
    'BBbBbbbBBbbBBbBB',
    'BBBBBBBBBBBBBBBB',
    'BBkBBBBBBkkBBBBB',
    'kkEkkBBBkEEkkBkk',
    'EEEEkkkkEEEEEkEE',
    'EEEEEEEEEEEEEEEE',
    'EEdEEEEEEeEEEEEE',
    'EEEEEEEEEEEEEdEE',
  ];
  const snow_m = [
    'EEEEEeEEEEEEEEeE',
    'EEdEEEEEEeEEEEEE',
    'EEEEEEEEEEEEEdEE',
    'eEEEEEEEEEEEEEEE',
    'EEEEEEeEEEEEeEEE',
    'EEEEEEEEEdEEEEEE',
    'EEEEdEEEEEEEEEEE',
    'EEEEEEEEEEEEEEEe',
    'EEeEEEEEEEeEEEEE',
    'EEEEEEEdEEEEEEEE',
    'EEEEEEEEEEEEEEEE',
    'EEEEEEEEEEEEdEEE',
    'EdEEEEeEEEEEEEEE',
    'EEEEEEEEEEEEEEEE',
    'EEEEEEEEEEeEEEEE',
    'EEEeEEEEEEEEEEEE',
  ];
  // A stone frozen into the earth.
  const snow_m2 = [
    'EEEEEeEEEEEEEEeE',
    'EEdEEEEEEeEEEEEE',
    'EEEEEEEEkkkkEdEE',
    'eEEEEEEkddBBkEEE',
    'EEEEEEekdBBBkEEE',
    'EEEEEEEEkkkkEEEE',
    'EEEEdEEEEEEEEEEE',
    'EEEEEEEEEEEEEEEe',
    'EEeEEEEEEEeEEEEE',
    'EEEEEEEdEEEEEEEE',
    'EEEEEEEEEEEEEEEE',
    'EEEEEEEEEEEEdEEE',
    'EdEEEEeEEEEEEEEE',
    'EEEEEEEEEEEEEEEE',
    'EEEEEEEEEEeEEEEE',
    'EEEeEEEEEEEEEEEE',
  ];
  // Edges: the drift rounds off over the side, the earth below is outlined.
  const snowL = (rows, top) => left(rows, rows.map((r, y) => (top ? ['...', '.kk', 'kWW', 'kww', 'kww', 'kbw', 'kbb', 'kbb', 'kBb', 'kBB', 'kBB', 'kkE', 'kE', 'kE', 'kE', 'kE'][y] : 'kE')));
  const snowR = (rows, top) => right(rows, rows.map((r, y) => (top ? ['...', 'kk.', 'WWk', 'wwk', 'wbk', 'bbk', 'bbk', 'bBk', 'BBk', 'BBk', 'BBk', 'Ekk', 'Ek', 'Ek', 'Ek', 'Ek'][y] : 'Ek')));
  def(tun, {
    tundra_snow_t: snow_t, tundra_snow_m: snow_m, tundra_snow_m2: snow_m2,
    tundra_snow_tl: snowL(snow_t, true), tundra_snow_tr: snowR(snow_t, true), tundra_snow_tlr: snowR(snowL(snow_t, true), true),
    tundra_snow_ml: snowL(snow_m), tundra_snow_mr: snowR(snow_m), tundra_snow_mlr: snowR(snowL(snow_m)),
  });

  // River ice: a glassy blue surface with long diagonal glints and a white
  // rime along the top, cracks and trapped bubbles deep inside.
  const ice_t = [
    'kkkkkkkkkkkkkkkk',
    'IIIIIIIIIIIIIIII',
    'iiiiIIiiiiiiiiii',
    'iiiiiiIIiiiiiiIi',
    'jiiiiiiiIIiiiiii',
    'jjjjiiiiiiIIiiii',
    'jjjjjjjiiiiiIIij',
    'JjjjjzjjjjiiiiIj',
    'JJjjjjzjjjjjjjjj',
    'JJJJjjjzzjjjjjjJ',
    'JJJJJJjjjzjjjJJJ',
    'JJIJJJJJjjzjJJJJ',
    'JJJJJJJJJJJzJJJJ',
    'JJJJJJJJJJJJzJJJ',
    'JJJJJJIJJJJJJzJJ',
    'JJJJJJJJJJJJJJJJ',
  ];
  const ice_m = [
    'JJJJJJJJJJJJJJzJ',
    'JJJJJJJJJJJJJJJz',
    'JJJJIJJJJJJJJJJJ',
    'zJJJJJJJJJJJJJJJ',
    'JzzJJJJJJjJJJJJJ',
    'JJJzJJJJjjjJJJJJ',
    'JJJJzJJjjiijjJJJ',
    'JJJJJzJJjjjjJJJJ',
    'JJJJJJzJJjJJJJJJ',
    'JJJJJJJzJJJJJJJJ',
    'JJIJJJJJzJJJJJJJ',
    'JJJJJJJJJzzJJJJJ',
    'JJJJJJJJJJJzJJJJ',
    'JJJJJJJJJJJJzJJJ',
    'JJJJJJJJJJJJJzJJ',
    'JJJJJJIJJJJJJJzJ',
  ];
  const iceL = (rows, top) => left(rows, rows.map((r, y) => (top && y === 0 ? '.' : 'k')));
  const iceR = (rows, top) => right(rows, rows.map((r, y) => (top && y === 0 ? '.' : 'k')));
  def(tun, {
    tundra_ice_t: ice_t, tundra_ice_m: ice_m,
    tundra_ice_tl: iceL(ice_t, true), tundra_ice_tr: iceR(ice_t, true), tundra_ice_tlr: iceR(iceL(ice_t, true), true),
    tundra_ice_ml: iceL(ice_m), tundra_ice_mr: iceR(ice_m), tundra_ice_mlr: iceR(iceL(ice_m)),
  });

  // Boulders: grey granite broken into rounded-off blocks, the top block
  // under a cap of snow.
  const tunRock = { k: 0x0f, L: 0x10, g: 0x00, d: 0x2d, y: 0x00, Y: 0x00, W: 0x30, w: 0x20, b: 0x10 };
  const capSnow = (rows) => rows.map((r, y) => (y >= 1 && y <= 3 ? r.replace(/[gLd]/g, y === 1 ? 'W' : y === 2 ? 'w' : 'b') : r));
  def(tunRock, (() => {
    const o = {
    tundra_rock_m: [
      'gggkLgggggLdkggg',
      'ggkkgggggkdkkggg',
      'gkkkkgggkddkkgkg',
      'kkkgkggkddkkkkdg',
      'dkdkkgkddkdkgkdk',
      'kkkkkgddkkkkkkkd',
      'kkkLLkkkkkkkkkkk',
      'kLLggLLkkkkkLLkk',
      'LggggggdgkLLkdkL',
      'ggggggkdkkgkdkkg',
      'ggkggkdkkkkdkkkg',
      'gkdgkkkkkLLkkkkg',
      'kddkdkdkkgkdgkkg',
      'kkkkkkkkkkdkkLLk',
      'LkkkkkkLLkkkkggL',
      'gLLkkLLggLkkkggg',
    ],
    tundra_rock_m2: [
      'dkdkkgkggddkkkgk',
      'kkkkkkkgkdkkkkkd',
      'dkkkkkkkdkdkkkdk',
      'kkkkkLLkkkkkkkkk',
      'kkLLLggLkkkkkkkk',
      'LLggggggdgkkkLLL',
      'gggggggkdkkLLggg',
      'ggggggkkkkkggggg',
      'kggggkdkkkLggggg',
      'kkggkkkkkkgggggk',
      'Lkkkkkkkkkkggggg',
      'dgdkkkkLLLkkgkgk',
      'kkkkLLLgggLLkkkk',
      'ddkkgkkggggkdgkg',
      'dkkkkgkgggkddkkk',
      'kkkgkkkggkddkkkd',
    ],
    tundra_rock_t: [
      'kkkkkkkkkkkkkkkk',
      'LLLLLLLLLLLLLLLL',
      'gggggggggggggggg',
      'gkgggggkgkgggkgk',
      'kkkgkgkkkkkgkkkk',
      'dgdkkkkgdgkkkkdg',
      'kkkLLkkkkkgdkkkk',
      'kLLggLLkkkkkLLkk',
      'LggggggdgkLLkdkL',
      'ggggggkdkkgkdkkg',
      'ggkggkdkkkkdkkkg',
      'gkdgkkkkkLLkkkkg',
      'kddkdkdkkgkdgkkg',
      'kkkkkkkkkkdkkLLk',
      'LkkkkkkLLkkkkggL',
      'gLLkkLLkgLkkkkgk',
    ],
    tundra_rock_ml: [
      'kLgkLgggggLdkggg',
      'kgkkgggggkdkkggg',
      'kkkkkgggkddkkgkg',
      'kkkgkggkddkkkkdg',
      'kkdkkgkddkdkgkdk',
      'kkkkkgddkkkkkkkd',
      'kkkLLkkkkkkkkkkk',
      'kLLggLLkkkkkLLkk',
      'kLgggggdgkLLkdkL',
      'kLggggkdkkgkdkkg',
      'kLkggkdkkkkdkkkg',
      'kLdgkkkkkLLkkkkg',
      'kddkdkdkkgkdgkkg',
      'kkkkkkkkkkdkkLLk',
      'kkkkkkkLLkkkkggL',
      'kLLkkLLggLkkkggg',
    ],
    tundra_rock_mr: [
      'gggkLgggggLdkgkk',
      'ggkkgggggkdkkggk',
      'gkkkkgggkddkkgkk',
      'kkkgkggkddkkkkdk',
      'dkdkkgkddkdkgkkk',
      'kkkkkgddkkkkkkkk',
      'kkkLLkkkkkkkkkkk',
      'kLLggLLkkkkkLLk.',
      'LggggggdgkLLkdkk',
      'ggggggkdkkgkdkkk',
      'ggkggkdkkkkdkkkk',
      'gkdgkkkkkLLkkkkk',
      'kddkdkdkkgkdgkkk',
      'kkkkkkkkkkdkkLLk',
      'LkkkkkkLLkkkkgkk',
      'gLLkkLLggLkkkggk',
    ],
    tundra_rock_mlr: [
      'kLgkLgggggLdkgkk',
      'kgkkgggggkdkkggk',
      'kkkkkgggkddkkgkk',
      'kkkgkggkddkkkkdk',
      'kkdkkgkddkdkgkkk',
      'kkkkkgddkkkkkkkk',
      'kkkLLkkkkkkkkkkk',
      'kLLggLLkkkkkLLk.',
      'kLgggggdgkLLkdkk',
      'kLggggkdkkgkdkkk',
      'kLkggkdkkkkdkkkk',
      'kLdgkkkkkLLkkkkk',
      'kddkdkdkkgkdgkkk',
      'kkkkkkkkkkdkkLLk',
      'kkkkkkkLLkkkkgkk',
      'kLLkkLLggLkkkggk',
    ],
    tundra_rock_tl: [
      '..kkkkkkkkkkkkkk',
      '.kLLLLLLLLLLLLLL',
      'kLgggggggggggggg',
      'kLgggggkgkgggkgk',
      '.kkgkgkkkkkgkkkk',
      'kgdkkkkgdgkkkkdg',
      'kkkLLkkkkkgdkkkk',
      'kLLggLLkkkkkLLkk',
      'kLgggggdgkLLkdkL',
      'kLggggkdkkgkdkkg',
      'kLkggkdkkkkdkkkg',
      'kLdgkkkkkLLkkkkg',
      'kddkdkdkkgkdgkkg',
      'kkkkkkkkkkdkkLLk',
      'kkkkkkkLLkkkkggL',
      'kLLkkLLkgLkkkkgk',
    ],
    tundra_rock_tr: [
      'kkkkkkkkkkkkkk..',
      'LLLLLLLLLLLLLLk.',
      'ggggggggggggggkk',
      'gkgggggkgkgggkgk',
      'kkkgkgkkkkkgkkk.',
      'dgdkkkkgdgkkkkdk',
      'kkkLLkkkkkgdkkkk',
      'kLLggLLkkkkkLLk.',
      'LggggggdgkLLkdkk',
      'ggggggkdkkgkdkkk',
      'ggkggkdkkkkdkkkk',
      'gkdgkkkkkLLkkkkk',
      'kddkdkdkkgkdgkkk',
      'kkkkkkkkkkdkkLLk',
      'LkkkkkkLLkkkkgkk',
      'gLLkkLLkgLkkkkgk',
    ],
    tundra_rock_tlr: [
      '..kkkkkkkkkkkk..',
      '.kLLLLLLLLLLLLk.',
      'kLggggggggggggkk',
      'kLgggggkgkgggkgk',
      '.kkgkgkkkkkgkkk.',
      'kgdkkkkgdgkkkkdk',
      'kkkLLkkkkkgdkkkk',
      'kLLggLLkkkkkLLk.',
      'kLgggggdgkLLkdkk',
      'kLggggkdkkgkdkkk',
      'kLkggkdkkkkdkkkk',
      'kLdgkkkkkLLkkkkk',
      'kddkdkdkkgkdgkkk',
      'kkkkkkkkkkdkkLLk',
      'kkkkkkkLLkkkkgkk',
      'kLLkkLLkgLkkkkgk',
    ],
    };
    for (const n of ['tundra_rock_t', 'tundra_rock_tl', 'tundra_rock_tr', 'tundra_rock_tlr']) o[n] = capSnow(o[n]);
    return o;
  })());

  // A log ledge with snow along it.
  def(tun, {
    tundra_ledge: [
      '..kkkkkkkkkkkk..',
      '.kWWWWWWWWWWWWk.',
      'kWwwwwwbwwwwwwwk',
      'kkbbkkkkkbbbkkkk',
      'kEeEeEeeEeEEeekc',
      'keeeeeeeeeeeeekE',
      'kkkkkkkkkkkkkkkk',
      ...rep('................', 9),
    ],
  });

  // A bare birch: white bark, black lenticels and scars, a dark core line
  // on the shaded side. Tiles vertically.
  const birch = [
    '.....kTTTtk.....',
    '.....kTTTtk.....',
    '.....kmmTtk.....',
    '.....kTTTtk.....',
    '.....kTTmmk.....',
    '.....kTTTtk.....',
    '....kkTTTtk.....',
    '...kmkmTTtk.....',
    '.....kTTTtk.....',
    '.....kTTTmk.....',
    '.....kmTTtk.....',
    '.....kTTTtk.....',
    '.....kTTTtkk....',
    '.....kTmmtkmk...',
    '.....kTTTtk.k...',
    '.....kTTTtk.....',
  ];
  // The same trunk with a message hacked into the bark.
  // The same trunk with the Creature's words hacked through the bark.
  const birchCut = [
    '.....kTTTtk.....',
    '.....kTTmtk.....',
    '.....kmcmck.....',
    '.....kmcmmk.....',
    '.....kmcmck.....',
    '.....kTTTtk.....',
    '.....kcmcmk.....',
    '.....kmcmmk.....',
    '.....kcmcmk.....',
    '.....kTTTtk.....',
    '.....kmcccmk....',
    '.....kmcmmk.....',
    '.....kmcccmk....',
    '.....kTTTtk.....',
    '.....kTmmtk.....',
    '.....kTTTtk.....',
  ];
  def(tun, { tundra_birch: birch, tundra_birchCut: birchCut });

  /* ----------------------------------------------------------- Tundra */
  // White-grey sky, a sun that is only a paler smear, bands of distant
  // forest, a snowfield, and a blizzard driving across in the foreground.
  {
    const s = sky(SW, SH, [[0x00, 0], [0x10, 50, 16], [0x20, 104, 12]]);
    const sg = s.getContext('2d');
    disc(sg, 180, 54, 10, 0x20);
    for (let y = 40; y < 70; y++) for (let x = 160; x < 200; x++) if (FK.bayer(x, y) < 0.3 && (x - 180) ** 2 + (y - 54) ** 2 < 400) px(sg, x, y, 0x20);
    // Spruce lines: tall narrow firs, snow on the boughs.
    const far = forest(512, 60, 31, { col: 0x10, floor: 6, gap: 5, minH: 14, maxH: 30, width: 4, snow: 0x20 });
    const mid = forest(512, 80, 47, { col: 0x00, floor: 8, gap: 7, minH: 22, maxH: 46, width: 6, snow: 0x10 });
    // Rolling snowfield in front of them.
    const field = canvas(512, 50), fg = field.getContext('2d');
    const prof = ridge(512, 61, 0, 10, 0.5);
    for (let x = 0; x < 512; x++) {
      const t = 10 + Math.round(prof[x]);
      px(fg, x, t, 0x20, 1, 50 - t);
      px(fg, x, t, 0x30, 1, 1);
      for (let y = t + 3; y < 50; y++) if (FK.bayer(x, y) < 0.2 + (y - t) / 80) px(fg, x, y, 0x10, 1, 1);
    }
    make('tundra', [
      { img: s, still: true },
      { img: far, f: 0.1, y: 106, fy: 0.05 },
      { img: mid, f: 0.2, y: 112, fy: 0.08 },
      { img: field, f: 0.3, y: 180, fy: 0.12, fill: 0x10 },
    ], (g, cx, cy, t) => {
      // Blizzard: sheets of snow driven sideways, in three depths.
      const layers = [[60, 1.6, 0.3, 0x20, 1], [40, 2.6, 0.6, 0x30, 1], [16, 4, 1, 0x30, 2]];
      for (const [n, sp, par, col, sz] of layers) {
        for (let i = 0; i < n; i++) {
          const x = ((i * 97 + Math.floor(t * sp) - cx * par) % 280 + 280) % 280 - 12;
          const y = ((i * 53 + Math.floor(t * sp * 0.45) + Math.sin(i + t / 20) * 4) % 224 + 224) % 224;
          px(g, x, y, col, sz + (sp > 2 ? 2 : 1), sz);
        }
      }
    });
  }


  /* =========================================================== ARCTIC */
  // The frozen ocean at night under the aurora: thick floes with snow on
  // top and green-blue ice in their broken sides, pressure ridges of
  // jumbled blocks, black water between.
  const arc = {
    k: 0x0f,
    W: 0x30, w: 0x20, b: 0x10, B: 0x00,   // snow on the floe: moonlit white, shade
    I: 0x31, i: 0x21, j: 0x1c, J: 0x0c, g: 0x2c, G: 0x0f, h: 0x1c,  // ice: face to deep, glints, old cracks
    L: 0x30, l: 0x31, d: 0x11, x: 0x01,  // pack ice blocks: glint, face, side, deep
    a: 0x0c, A: 0x1c, c: 0x2c, n: 0x2a,  // water: dark swell, reflections
  };
  // A floe: snow crust on top, then the thick slab edge-on, banded with
  // the layers it froze in, blue going to black at the waterline.
  const floe_t = [
    'kkkkkkkkkkkkkkkk',
    'WWWWWWWWWWWWWWWW',
    'wwwwWWwwwwwwwWWw',
    'wwwwwwwwwbwwwwww',
    'bwwbbwwwbbbwwbwb',
    'kbbkkbbbkkkbbkbk',
    'IIIIIIIIIIIIIIII',
    'iiiiIiiiiiiiiIii',
    'iIiiiiiiiIiiiiii',
    'iiiiiiijiiiiiiii',
    'jjjjjjjjjjjjjjjj',
    'jjgjjjjjjjjjgjjj',
    'jjjjjjjggjjjjjjj',
    'JjjJjjjjjjJjjjJj',
    'JJJJJJjJJJJJJJJJ',
    'JJJJJJJJJGJJJJJJ',
  ];
  // Below the waterline the slab is dark, banded with old freezes.
  const floe_m = [
    'gJJJJJJJJJJJJJJJ',
    'JJJJJJJJJGJJJJJJ',
    'JJJJJJJgJJJJJJJJ',
    'JhJhJhJhJhJhJhJh',
    'hJhJhJhJhJhJhJgJ',
    'JJJJJJJJGJJJJJJJ',
    'JJJJJJJJJJJJJJJJ',
    'JJJJgJJJJJJJJJJJ',
    'JJJJJJJJJJJJJJJJ',
    'JJJJJJJGJJJgJJJJ',
    'hJhJhJhJhJhJhJhJ',
    'JJJJJJJJJJJJJJJJ',
    'JgJJJJJJJJJJJJJJ',
    'JJJJJJGJJJJJJJJJ',
    'JJJJJJJJgJJJJJJG',
    'JJJJJJJJJJJJJJJJ',
  ];
  // Edges: the snow crust overhangs a little, the slab's broken end is lit.
  const floeL = (rows, top) => left(rows, rows.map((r, y) => (top ? ['..', '.W', 'kw', 'kw', 'kb', '.k', 'kI', 'kI', 'kI', 'ki', 'kj', 'kj', 'kj', 'kj', 'kJ', 'kJ'][y] : 'kJ')));
  const floeR = (rows, top) => right(rows, rows.map((r, y) => (top ? ['..', 'W.', 'wk', 'wk', 'bk', 'k.', 'ik', 'ik', 'jk', 'jk', 'jk', 'Jk', 'Jk', 'Jk', 'Jk', 'Jk'][y] : 'Jk')));
  def(arc, {
    arctic_floe_t: floe_t, arctic_floe_m: floe_m,
    arctic_floe_tl: floeL(floe_t, true), arctic_floe_tr: floeR(floe_t, true), arctic_floe_tlr: floeR(floeL(floe_t, true), true),
    arctic_floe_ml: floeL(floe_m), arctic_floe_mr: floeR(floe_m), arctic_floe_mlr: floeR(floeL(floe_m)),
  });

  // Pressure ridges: slabs of ice shoved up on end and jammed together,
  // each a pale lit face and a blue shadow face.
  const packPal = { k: 0x0f, L: 0x30, g: 0x21, d: 0x0c, y: 0x21, Y: 0x21, W: 0x30, w: 0x20, b: 0x10 };
  const capSnowA = (rows) => rows.map((r, y) => (y >= 1 && y <= 2 ? r.replace(/[gLd]/g, y === 1 ? 'W' : 'w') : r));
  def(packPal, (() => {
    const o = {
    arctic_pack_m: [
      'gkkkkkdkkkggkgkd',
      'kkkkkgkkkkggLkdd',
      'dkkkdkdkkkkgkddk',
      'kkkkkdkkkLkkddkk',
      'dkkkkkdkkgLkkkdk',
      'kkkLkkkkLggLkdkk',
      'dkkgLkkkggggkkdk',
      'kkLggkkLggggdkkk',
      'kkkggLkgkgkkkkkk',
      'kLkggkkkdgkdkkLL',
      'Lgkgggkddkkkkkgg',
      'gkkggkkkkkkkkkgg',
      'ggkgkkkkkkkkkLgg',
      'gkkggkLgdkLLkggg',
      'ggkgkkgkkkggkggg',
      'ggdkdkkdkkgkkggk',
    ],
    arctic_pack_m2: [
      'ggkdkddkkggggggk',
      'gkdkkdkkkgggggkk',
      'kddkkkdkkgkggkkk',
      'ddkkkdkkkkdgkkkk',
      'kkdkkkdkkddkdkkk',
      'kkkkkdkkkkkdkkkk',
      'kkkkgkkkLkkkkkdd',
      'LLkkkkkkgkLkkkkk',
      'ggLkkkkLkkgLLkkk',
      'gggLkkkkgkggdgkL',
      'ggggLkLdgkgkkkkg',
      'gggggkddkkkkkLkg',
      'ggggkkkkkkkLLgkg',
      'gggggkkkkkLggkkg',
      'ggggkkgdkLggggkg',
      'gggkdkkkkgggggLk',
    ],
    arctic_pack_t: [
      'kkkkkkkkkkkkkkkk',
      'LLLLLLLLLLLLLLLL',
      'kgkkkgkgkkkgkgkk',
      'kkkkdkkkkLkkkkkg',
      'gdgkkdgdkgLkgdgk',
      'kkkLkkkkLggLkdkk',
      'dkkgLkkkggggkkdk',
      'kkLggkkLggggdkkk',
      'kkkggLkgkgkkkkkk',
      'kLkggkkkdgkdkkLL',
      'Lgkgggkddkkkkkgg',
      'gkkggkkkkkkkkkgg',
      'ggkgkkkkkkkkkLgg',
      'gkkggkLgdkLLkggg',
      'ggkgkkgkkkggkggg',
      'ggdkdkkkkkgkkkgk',
    ],
    arctic_pack_ml: [
      'kkkkkkdkkkggkgkd',
      'kkkkkgkkkkggLkdd',
      'kkkkdkdkkkkgkddk',
      'kkkkkdkkkLkkddkk',
      'kkkkkkdkkgLkkkdk',
      'kkkLkkkkLggLkdkk',
      'kkkgLkkkggggkkdk',
      'kkLggkkLggggdkkk',
      'kkkggLkgkgkkkkkk',
      'kLkggkkkdgkdkkLL',
      'kLkgggkddkkkkkgg',
      'kLkggkkkkkkkkkgg',
      'kLkgkkkkkkkkkLgg',
      'kLkggkLgdkLLkggg',
      'kLkgkkgkkkggkggg',
      'kgdkdkkdkkgkkggk',
    ],
    arctic_pack_mr: [
      'gkkkkkdkkkggkgkk',
      'kkkkkgkkkkggLkdk',
      'dkkkdkdkkkkgkdkk',
      'kkkkkdkkkLkkddkk',
      'dkkkkkdkkgLkkkkk',
      'kkkLkkkkLggLkdkk',
      'dkkgLkkkggggkkkk',
      'kkLggkkLggggdkkk',
      'kkkggLkgkgkkkkk.',
      'kLkggkkkdgkdkkLk',
      'Lgkgggkddkkkkkkk',
      'gkkggkkkkkkkkkgk',
      'ggkgkkkkkkkkkLkk',
      'gkkggkLgdkLLkggk',
      'ggkgkkgkkkggkgkk',
      'ggdkdkkdkkgkkggk',
    ],
    arctic_pack_mlr: [
      'kkkkkkdkkkggkgkk',
      'kkkkkgkkkkggLkdk',
      'kkkkdkdkkkkgkdkk',
      'kkkkkdkkkLkkddkk',
      'kkkkkkdkkgLkkkkk',
      'kkkLkkkkLggLkdkk',
      'kkkgLkkkggggkkkk',
      'kkLggkkLggggdkkk',
      'kkkggLkgkgkkkkk.',
      'kLkggkkkdgkdkkLk',
      'kLkgggkddkkkkkkk',
      'kLkggkkkkkkkkkgk',
      'kLkgkkkkkkkkkLkk',
      'kLkggkLgdkLLkggk',
      'kLkgkkgkkkggkgkk',
      'kgdkdkkdkkgkkggk',
    ],
    arctic_pack_tl: [
      '..kkkkkkkkkkkkkk',
      '.kLLLLLLLLLLLLLL',
      'kLkkkgkgkkkgkgkk',
      '.kkkdkkkkLkkkkkg',
      'kdgkkdgdkgLkgdgk',
      'kkkLkkkkLggLkdkk',
      'kkkgLkkkggggkkdk',
      'kkLggkkLggggdkkk',
      'kkkggLkgkgkkkkkk',
      'kLkggkkkdgkdkkLL',
      'kLkgggkddkkkkkgg',
      'kLkggkkkkkkkkkgg',
      'kLkgkkkkkkkkkLgg',
      'kLkggkLgdkLLkggg',
      'kLkgkkgkkkggkggg',
      'kgdkdkkkkkgkkkgk',
    ],
    arctic_pack_tr: [
      'kkkkkkkkkkkkkk..',
      'LLLLLLLLLLLLLLk.',
      'kgkkkgkgkkkgkgk.',
      'kkkkdkkkkLkkkkkk',
      'gdgkkdgdkgLkgdkk',
      'kkkLkkkkLggLkdkk',
      'dkkgLkkkggggkkkk',
      'kkLggkkLggggdkkk',
      'kkkggLkgkgkkkkk.',
      'kLkggkkkdgkdkkLk',
      'Lgkgggkddkkkkkkk',
      'gkkggkkkkkkkkkgk',
      'ggkgkkkkkkkkkLkk',
      'gkkggkLgdkLLkggk',
      'ggkgkkgkkkggkgkk',
      'ggdkdkkkkkgkkkgk',
    ],
    arctic_pack_tlr: [
      '..kkkkkkkkkkkk..',
      '.kLLLLLLLLLLLLk.',
      'kLkkkgkgkkkgkgk.',
      '.kkkdkkkkLkkkkkk',
      'kdgkkdgdkgLkgdkk',
      'kkkLkkkkLggLkdkk',
      'kkkgLkkkggggkkkk',
      'kkLggkkLggggdkkk',
      'kkkggLkgkgkkkkk.',
      'kLkggkkkdgkdkkLk',
      'kLkgggkddkkkkkkk',
      'kLkggkkkkkkkkkgk',
      'kLkgkkkkkkkkkLkk',
      'kLkggkLgdkLLkggk',
      'kLkgkkgkkkggkgkk',
      'kgdkdkkkkkgkkkgk',
    ],
    };
    for (const n of ['arctic_pack_t', 'arctic_pack_tl', 'arctic_pack_tr', 'arctic_pack_tlr']) o[n] = capSnowA(o[n]);
    return o;
  })());

  // Black water between floes: a slow swell with the aurora's green
  // caught on it, and a skin of slush at the edges.
  const awTop = [
    'kkkkkkkkkkkkkkkk',
    'kkkkkkkakkkkkkkk',
    'kkkkkkkkkkkkkkkk',
    'kkkaakkkkkkkkkkk',
    'kkkkkkkkkkkaakkk',
    'aaakkkkkkkkkkkaa',
    'AAAaaaakkaaaaAAA',
  ];
  const awBody = [
    'aaaAAAAaaaaAAaaa',
    'kaaaaaaacaaaakaa',
    'kkkaakaaaaaaakkk',
    'kkkkkkkaakkkkkkk',
    'kkkkkkkkkkkkkkkk',
    'kkkkkkkkkkkkkkkk',
    'kkkkkknkkkkkkkkk',
    'kkkkkkkkkkkkkkkk',
    'kkkkkkkkkkknkkkk',
  ];
  const awF = (a, b) => [...awTop.map((r) => rot(r, a)), ...awBody.map((r) => rot(r, b))];
  def(arc, { arctic_water1: awF(0, 0), arctic_water2: awF(5, 3), arctic_water3: awF(10, 6) });

  /* ----------------------------------------------------------- Arctic */
  // Night: stars, the aurora rippling in curtains, icebergs on a far flat
  // horizon, the ice field stretching away.
  {
    const s = sky(SW, SH, [[0x0f, 0], [0x0c, 116, 14]]);
    const sg = s.getContext('2d');
    stars(sg, SW, 140, 19, 70, [0x30, 0x31, 0x10, 0x21]);
    // Icebergs: tabular and pinnacled, moonlit on the left.
    const berg = canvas(512, 50), bg = berg.getContext('2d');
    const bergs = [[20, 50, 16, 0], [120, 24, 26, 1], [200, 70, 12, 0], [330, 30, 32, 1], [420, 44, 14, 0]];
    for (const [x0, w0, hh, peak] of bergs) {
      for (let i = 0; i < w0; i++) {
        let h = peak ? Math.round(hh * (1 - Math.abs(i - w0 * 0.4) / (w0 * 0.6))) : hh - (i < 3 ? 3 - i : i > w0 - 4 ? i - (w0 - 4) : 0) * 2;
        h = Math.max(1, h);
        const x = (x0 + i) % 512;
        px(bg, x, 50 - h, i < w0 * 0.4 ? 0x00 : 0x0c, 1, h);
        px(bg, x, 50 - h, 0x10, 1, 1);
        for (let y = 50 - h + 3; y < 50; y += 3) if (i % 5 === 2) px(bg, x, y, 0x0f, 1, 1);
      }
    }
    // The ice field: flat, white-grey, with long shadows of ridges.
    const field = canvas(256, 60), fg = field.getContext('2d');
    px(fg, 0, 0, 0x0c, 256, 60);
    const rr = FK.rng(23);
    for (let y = 0; y < 60; y++) for (let x = 0; x < 256; x++) if (FK.bayer(x, y) < 0.15 + y / 80) px(fg, x, y, 0x0f);
    for (let i = 0; i < 30; i++) {
      const y = 1 + Math.floor(rr() * 50), x = Math.floor(rr() * 256), l = 4 + Math.floor((y / 60) * 30 * rr());
      px(fg, x, y, 0x00, l, 1); px(fg, x + 1, y + 1, 0x0f, l, 1);
    }
    make('arctic', [
      { img: s, still: true },
    ], (g, cx, cy, t) => {
      // Aurora: three curtains, each a wavy band drawn as vertical rays
      // that fade downward; the bands slide and ripple.
      const curt = [
        { y: 20, amp: 9, len: 110, sp: 0.006, h: 44, a: 0x0a, b: 0x2a, h2: 0x1a, c: 0x0a, ph: 0 },
        { y: 62, amp: 7, len: 80, sp: -0.009, h: 28, a: 0x0b, b: 0x1a, c: 0x0b, ph: 2 },
      ];
      for (const k of curt) {
        for (let x = 0; x < SW; x++) {
          const u = x + cx * 0.02;
          const top = Math.round(k.y + Math.sin(u / k.len * 6.283 + t * k.sp + k.ph) * k.amp + Math.sin(u / 23 + t * 0.03) * 2);
          // Folds in the curtain are longer and brighter; rays shimmer.
          const fold = Math.sin(u / 13 + t * 0.04 + k.ph) * 0.5 + 0.5;
          const ray = Math.sin(u * 0.7 + Math.sin(u * 0.13 + t * 0.03) * 4) * 0.5 + 0.5;
          const len = Math.round(k.h * (0.35 + fold * 0.45 + ray * 0.2));
          // bright hem, solid body, then rays thinning out downward
          const body = Math.round(len * 0.35);
          px(g, x, top + 1, k.a, 1, body);
          px(g, x, top, k.b, 1, 1);
          if (fold > 0.5) px(g, x, top + 1, k.h2 || k.b, 1, 1);
          for (let y = body; y < len; y++) {
            const f = (y - body) / (len - body);
            if (ray > 0.35 + f * 0.6 && (y & 1) === 0) px(g, x, top + 1 + y, k.c, 1, 1);
          }
        }
      }
      // horizon
      const hy = 140 - Math.round(cy * 0.04);
      for (const [img, f, y] of [[berg, 0.08, hy - 50]]) {
        const w = img.width; let x = -Math.round(cx * f) % w; if (x > 0) x -= w;
        for (; x < SW; x += w) g.drawImage(img, x, y);
      }
      px(g, 0, hy, 0x00, SW, 1);
      { const w = field.width; let x = -Math.round(cx * 0.15) % w; if (x > 0) x -= w; for (; x < SW; x += w) g.drawImage(field, x, hy + 1); }
      px(g, 0, hy + 61, 0x0f, SW, SH);
    });
  }

})();
