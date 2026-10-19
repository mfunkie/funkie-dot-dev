'use strict';
/*
 * GATSBY.EXE art: tiles, 16x16. Terrain names ending _t are the exposed top
 * row, _m the body; l/r suffixes are left and right edges, _m2/_m3 the
 * variants a terrain's `vary` asks for. Most surfaces are generated from
 * small rules (bricks, turf, stone, water) into rows of legend characters,
 * so they tile seamlessly; the set pieces (a sun-dial, a sign, a chandelier)
 * are drawn by hand. Every pixel is an NES palette code.
 */
(() => {
  const T = (GG.TA = {});   // tile row data by name, for deriving variants
  function def(legend, tiles) {
    Object.assign(T, tiles);
    GG.tiles(legend, tiles);
  }

  /* ------------------------------------------------------------ toolkit */
  // Deterministic noise in [0, 1) for a pixel and a seed.
  const N = (x, y, s = 0) => {
    let h = (x * 374761393 + y * 668265263 + s * 1442695041) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
  const B = (x, y) => GG.bayer(x, y);
  // Build a 16x16 grid from a function of (x, y); falsy means transparent.
  const grid = (fn) => {
    const rows = [];
    for (let y = 0; y < 16; y++) {
      let r = '';
      for (let x = 0; x < 16; x++) r += fn(x, y) || '.';
      rows.push(r);
    }
    return rows;
  };
  const at = (rows, x, y) => (rows[y] && rows[y][x]) || '.';
  // Lay one grid over another ('.' in the top one lets the base show).
  const over = (base, top, x0 = 0, y0 = 0) => base.map((r, y) => {
    const t = top[y - y0];
    if (!t) return r;
    const a = r.split('');
    for (let i = 0; i < t.length; i++) if (t[i] !== '.' && x0 + i >= 0 && x0 + i < 16) a[x0 + i] = t[i];
    return a.join('');
  });
  const map = (rows, fn) => rows.map((r, y) => r.split('').map((c, x) => fn(c, x, y) || '.').join(''));
  const swap = (rows, from, to) => map(rows, (c) => { const i = from.indexOf(c); return i < 0 ? c : to[i]; });
  const mirror = (rows) => rows.map((r) => r.split('').reverse().join(''));
  const shift = (rows, n) => rows.map((r) => { n = ((n % 16) + 16) % 16; return r.slice(16 - n) + r.slice(0, 16 - n); });
  const rep = (s, n) => Array.from({ length: n }, () => s);
  const left = (rows, cols) => rows.map((r, i) => { const c = typeof cols === 'string' ? cols : cols[i % cols.length]; return c + r.slice(c.length); });
  const right = (rows, cols) => rows.map((r, i) => { const c = typeof cols === 'string' ? cols : cols[i % cols.length]; return r.slice(0, 16 - c.length) + c; });
  GG.tileHelpers = { left, right, mirror, rep, grid, over, map, swap, shift };

  /*
   * Exposed sides: an outline in the outer column and a lit (left) or shaded
   * (right) column inside it, on every row that isn't transparent there.
   */
  const sideL = (rows, lit) => rows.map((r) => {
    if (r[0] === '.') return r;
    const c1 = lit && r[1] !== 'k' && r[1] !== '.' ? lit : r[1];
    return 'k' + c1 + r.slice(2);
  });
  const sideR = (rows, dk) => rows.map((r) => {
    if (r[15] === '.') return r;
    const c14 = dk && r[14] !== 'k' && r[14] !== '.' ? dk : r[14];
    return r.slice(0, 14) + c14 + 'k';
  });
  // Knock the outer pixel off the first solid row at a top corner.
  const round = (rows, side) => {
    const x = side === 'l' ? 0 : 15;
    const out = rows.slice();
    for (let y = 0; y < 16; y++) {
      if (out[y][x] !== '.') { const a = out[y].split(''); a[x] = '.'; out[y] = a.join(''); break; }
    }
    return out;
  };
  /* The six edge variants of a block, from its top and body. */
  const edges = (name, t, m, lit, dk, o = {}) => {
    const out = {};
    const R = o.round === false ? (x) => x : round;
    out[name + '_tl'] = R(sideL(t, lit), 'l');
    out[name + '_tr'] = R(sideR(t, dk), 'r');
    out[name + '_tlr'] = R(R(sideR(sideL(t, lit), dk), 'l'), 'r');
    out[name + '_ml'] = sideL(m, lit);
    out[name + '_mr'] = sideR(m, dk);
    out[name + '_mlr'] = sideR(sideL(m, lit), dk);
    return out;
  };
  /* A block's whole family: _t, _m, the varies and the edges. */
  const block = (name, t, m, lit, dk, extra = {}, o = {}) => Object.assign({ [name + '_t']: t, [name + '_m']: m }, extra, edges(name, t, m, lit, dk, o));

  /*
   * Bricks: courses `h` tall with a mortar line at the bottom, joints every
   * `w` pixels, staggered by half a brick each course. Each brick has a lit
   * top row and a shaded bottom row; `speck` scatters a grime color.
   */
  const bricks = ({ w = 8, h = 4, face, hi, lo, mortar, speck, seed = 1, rate = 0.08, start = 0 }) => grid((x, y) => {
    const yy = y + start;
    const course = Math.floor(yy / h), r = yy % h;
    const off = (course % 2) * (w / 2);
    if (r === h - 1) return mortar;
    if ((x + off) % w === w - 1) return mortar;
    if (speck && N(x, yy, seed) < rate) return speck;
    if (r === 0 && hi) return hi;
    if (r === h - 2 && lo) return lo;
    return face;
  });

  /*
   * Turf on top of soil: blades poking up into the sky, a bright crown, a
   * darker body, then roots into the soil (supplied as a body grid).
   */
  const turf = ({ hi, mid, dk, soil, seed = 3, blades = true, depth = 6 }) => {
    const base = soil;
    return grid((x, y) => {
      const bh = blades ? Math.floor(N(x, 0, seed) * 3.2) : 0;   // 0..3 pixels of blade
      const surf = 3;
      if (y < surf) return surf - y <= bh ? (y === surf - bh ? hi : mid) : null;
      const root = surf + depth - 1 + Math.floor(N(x, 1, seed) * 2.5);
      if (y === surf) return N(x, 2, seed) < 0.75 ? hi : mid;
      if (y < surf + 3) return N(x, y, seed) < 0.18 ? hi : N(x, y, seed + 9) < 0.2 ? dk : mid;
      if (y < root) return B(x, y) < (y - surf - 2) / (depth - 1) ? dk : mid;
      if (y === root) return dk;
      return base[y][x];
    });
  };

  /* Soil or ash: a base color with specks, pores and a pebble or two. */
  const soil = ({ base, speck, pore, pebble, pebbleHi, seed = 5, rate = 0.1, poreRate = 0.05 }) => {
    const g = grid((x, y) => {
      const n = N(x, y, seed);
      if (n < poreRate) return pore;
      if (n < poreRate + rate) return speck;
      return base;
    });
    if (!pebble) return g;
    // Two pebbles: a dark body, a lit top-left pixel.
    const pebbles = [[Math.floor(N(1, 1, seed) * 12) + 1, Math.floor(N(2, 1, seed) * 10) + 3], [Math.floor(N(3, 1, seed) * 12) + 1, Math.floor(N(4, 1, seed) * 10) + 3]];
    return map(g, (c, x, y) => {
      for (const [px, py] of pebbles) {
        if (x >= px && x < px + 3 && y >= py && y < py + 2) return x === px && y === py ? pebbleHi : pebble;
      }
      return c;
    });
  };

  /*
   * Stone blocks by nearest seed point on a torus, so the grid tiles. Cracks
   * between blocks; the pixel under a crack catches light, the one above a
   * crack falls into shade; faces get a dither of texture.
   */
  const stone = ({ face, hi, lo, crack = 'k', seed = 7, n = 6, tex, texRate = 0.12 }) => {
    const pts = [];
    for (let i = 0; i < n; i++) pts.push([N(i, 0, seed) * 16, N(i, 1, seed) * 16]);
    const owner = (x, y) => {
      let best = 1e9, who = 0;
      for (let i = 0; i < pts.length; i++) {
        let dx = Math.abs(x - pts[i][0]), dy = Math.abs(y - pts[i][1]);
        dx = Math.min(dx, 16 - dx); dy = Math.min(dy, 16 - dy);
        const d = dx * dx + dy * dy * 1.6;
        if (d < best) { best = d; who = i; }
      }
      return who;
    };
    const O = [];
    for (let y = 0; y < 16; y++) { O.push([]); for (let x = 0; x < 16; x++) O[y].push(owner(x, y)); }
    const o = (x, y) => O[(y + 16) % 16][(x + 16) % 16];
    return grid((x, y) => {
      const me = o(x, y);
      if (me !== o(x + 1, y) || me !== o(x, y + 1)) return crack;
      if (me !== o(x - 1, y) || me !== o(x, y - 1)) return hi;
      if (me !== o(x + 1, y + 1) || me !== o(x, y + 2)) return lo;
      if (tex && N(x, y, seed + 3) < texRate) return tex;
      return face;
    });
  };

  /*
   * Water: a body color with drifting dashes of a lighter color; `frame`
   * slides the dashes so a few frames make it move. `surf` draws a crest
   * band along the top.
   */
  const water = ({ base, dash, glint, deep, frame = 0, seed = 11, surf, crest, open = false, bandRows = 5 }) => grid((x, y) => {
    if (surf) {
      if (y === 0) return Math.sin((x + frame * 4) * Math.PI / 8) > 0.2 ? crest : null;
      if (y === 1) return crest && N((x + frame * 4) & 15, 1, seed) < 0.5 ? crest : surf;
    }
    if (open && y >= bandRows) {
      // Below the surface band only sparse ripples, so a swimmer shows through.
      const k = (x + frame * 3 + y * 5) % 16;
      if ((y % 4 === 1) && k < 4) return dash;
      return null;
    }
    const lane = y % 4;
    const run = (x + frame * (2 + (y % 3)) + Math.floor(N(0, y, seed) * 16)) % 16;
    if (glint && lane === 1 && run < 2) return glint;
    if (lane === 1 && run < 6) return dash;
    if (deep && y > 9 && B(x, y) < (y - 9) / 10) return deep;
    return base;
  });

  /* ================================================================ I */
  /* EAST EGG: the Buchanans' lawn, red brick walks, roses, the house. */
  const ee = {
    k: 0x0f,
    G: 0x2a, g: 0x1a, v: 0x0a,           // grass
    e: 0x08, E: 0x18,                    // earth
    s: 0x37, S: 0x27, z: 0x18,           // sand
    r: 0x16, R: 0x06, m: 0x27, M: 0x37,  // brick, mortar (walk / house)
    w: 0x30, W: 0x10,                    // white stone, its shade
    y: 0x28, Y: 0x38, o: 0x18, O: 0x08,  // bronze and gold, the window's glare
    f: 0x27, F: 0x16, u: 0x28,           // flowers: orange, red, yellow
    p: 0x05, P: 0x15,                    // the wine-colored rug
    b: 0x07, d: 0x17,                    // wood
    q: 0x35, Q: 0x25,                    // the rosy walls
    c: 0x11, C: 0x21, x: 0x31, n: 0x01,  // the Sound
  };
  const eeSoil = soil({ base: 'e', speck: 'E', pore: 'k', pebble: 'k', pebbleHi: 'E', seed: 21, rate: 0.09, poreRate: 0.04 });
  const eeSoil2 = soil({ base: 'e', speck: 'E', pore: 'k', pebble: 'O', pebbleHi: 'o', seed: 22, rate: 0.12, poreRate: 0.05 });
  const eeLawnT = turf({ hi: 'G', mid: 'g', dk: 'v', soil: eeSoil, seed: 4 });
  const eeSand = (seed) => grid((x, y) => {
    const n = N(x, y, seed);
    if (n < 0.06) return 'z';
    if (n < 0.2) return 's';
    if (B(x, y) < 0.25 && y > 9) return 'z';
    return 'S';
  });
  const eeSandT = map(eeSand(31), (c, x, y) => {
    if (y === 0) return N(x, 0, 5) < 0.3 ? null : 's';
    if (y === 1) return 's';
    if (y === 2) return N(x, 2, 6) < 0.5 ? 's' : 'S';
    return c;
  });
  const eeSandM2 = over(eeSand(32), [
    '................',
    '................',
    '................',
    '.........w.w....',
    '........wWwWw...',
    '.........WwW....',
    '..........z.....',
  ]);
  // Brick walks laid in running bond, with a soldier course along the top.
  const eeBrickM = bricks({ face: 'r', hi: 'F', lo: 'R', mortar: 'm', speck: 'R', seed: 41, rate: 0.05 });
  const eeBrickT = [
    'kkkkkkkkkkkkkkkk',
    'FFFmFFFmFFFmFFFm',
    'rrrmrrrmrrrmrrrm',
    'rrrmrrrmrrrmrrrm',
    'RRRmRRRmRRRmRRRm',
    'mmmmmmmmmmmmmmmm',
    ...bricks({ face: 'r', hi: 'F', lo: 'R', mortar: 'm', speck: 'R', seed: 42, rate: 0.05, start: 2 }).slice(6),
  ];
  // The hedge: leaves in clumps, light from the upper left.
  const leaves = (hi, mid, dk, seed) => grid((x, y) => {
    const cx = (x + (Math.floor(y / 4) % 2) * 2) % 4, cy = y % 4;
    const n = N(x, y, seed);
    if (cx === 0 && cy === 0) return hi;
    if ((cx === 3 || cy === 3) && n < 0.7) return dk;
    if (n < 0.12) return hi;
    if (n > 0.9) return dk;
    return mid;
  });
  const eeHedgeM = leaves('G', 'g', 'v', 51);
  // Clipped flat, a leaf or two standing proud of the cut.
  const clipped = (body, hi, seed) => map(body, (c, x, y) => {
    const top = 2 - (N(x, 0, seed) < 0.22 ? 1 : 0);
    if (y < top) return null;
    if (y === top) return 'k';
    if (y === top + 1) return hi;
    return c;
  });
  const eeHedgeT = clipped(eeHedgeM, 'G', 52);
  // The house: red brick in Flemish bond, white quoins at its corners, a
  // white cornice along its top; now and then a white-framed sash window.
  const eeHouseM = grid((x, y) => {
    const course = Math.floor(y / 4), r = y % 4;
    if (r === 3) return 'M';
    // Flemish bond: stretcher (6) and header (2) alternate, shifted each course.
    const p = (x + (course % 2) * 4) % 8;
    if (p === 7 || p === 5) return 'M';
    if (p === 6) return r === 0 ? 'F' : 'R';     // the dark-burnt header
    if (N(x, y, 61) < 0.06) return 'R';
    return r === 0 ? 'F' : r === 2 ? 'R' : 'r';
  }).map((r) => r.replace(/F/g, 'r'));
  const eeHouseT = [
    'kkkkkkkkkkkkkkkk',
    'wwwwwwwwwwwwwwww',
    'WWWWWWWWWWWWWWWW',
    'kwkkwkkwkkwkkwkk',
    'kWkkWkkWkkWkkWkk',
    'kkkkkkkkkkkkkkkk',
    ...eeHouseM.slice(6),
  ];
  const eeHouseM2 = over(eeHouseM, [
    '...kkkkkkkkkk...',
    '...kwwwwwwwwk...',
    '...kwOOOkOOwk...',
    '...kwOnOkOnwk...',
    '...kwOOOkOOwk...',
    '...kwkkkkkkwk...',
    '...kwOnOkOnwk...',
    '...kwOOOkOOwk...',
    '...kwOOOkOOwk...',
    '...kwwwwwwwwk...',
    '..kkkkkkkkkkkk..',
    '..kwwwwwwwwwwk..',
    '..kkkkkkkkkkkk..',
  ], 0, 1);
  // Quoins: long and short white stones stacked up the corner.
  const quoinL = ['kwwwwwM', 'kwwwwwM', 'kWWWWWM', 'kMMMMMM', 'kwwwM', 'kwwwM', 'kWWWM', 'kMMMM'];
  const quoinR = ['MwwwwWk', 'MwwwwWk', 'MWWWWWk', 'MMMMMMk', 'MwwwWk', 'MwwwWk', 'MWWWWk', 'MMMMMk'].map((r) => r.padStart(r.length, 'M'));
  const eeHouseEdges = {
    ee_house_ml: left(eeHouseM, quoinL),
    ee_house_mr: right(eeHouseM, quoinR),
    ee_house_mlr: right(left(eeHouseM, quoinL), quoinR),
    ee_house_tl: round(left(eeHouseT, ['k', 'kw', 'kW', 'kwk', 'kWk', 'kkk', ...quoinL.slice(6), ...quoinL, ...quoinL]), 'l'),
    ee_house_tr: round(right(eeHouseT, ['k', 'wk', 'Wk', 'kwk', 'kWk', 'kkk', ...quoinR.slice(6), ...quoinR, ...quoinR]), 'r'),
  };
  eeHouseEdges.ee_house_tlr = round(right(eeHouseEdges.ee_house_tl, ['k', 'wk', 'Wk', 'kwk', 'kWk', 'kkk', ...quoinR.slice(6), ...quoinR, ...quoinR]), 'r');
  // The rosy room: a damask paper, a white crown moulding.
  const eeWallM = grid((x, y) => {
    const dx = (x + (Math.floor(y / 8) % 2) * 4) % 8, dy = y % 8;
    const motif = (dx === 3 && dy >= 1 && dy <= 5) || (dy === 3 && dx >= 1 && dx <= 5) || ((dx === 2 || dx === 4) && (dy === 2 || dy === 4));
    return motif ? 'Q' : 'q';
  });
  const eeWallT = [
    'kkkkkkkkkkkkkkkk',
    'wwwwwwwwwwwwwwww',
    'wWwWwWwWwWwWwWwW',
    'WWWWWWWWWWWWWWWW',
    'kkkkkkkkkkkkkkkk',
    ...eeWallM.slice(5),
  ];
  // The floor: "the wine-colored rug" with a fringe, boards below.
  const eeFloorM = grid((x, y) => {
    if (y % 4 === 3) return 'k';
    if ((x + Math.floor(y / 4) * 5) % 16 === 0) return 'k';
    return y % 4 === 0 ? 'd' : 'b';
  });
  const eeFloorT = [
    'kkkkkkkkkkkkkkkk',
    'PPPPPPPPPPPPPPPP',
    'pPpppPpppPpppPpp',
    'pupppupppupppupp'.replace(/u/g, 'y'),
    'pPpppPpppPpppPpp',
    'PPPPPPPPPPPPPPPP',
    'wkwkwkwkwkwkwkwk',
    'kkkkkkkkkkkkkkkk',
    ...eeFloorM.slice(8),
  ];
  // The Sound at the bottom of the lawn.
  const eeSea = (f) => water({ base: 'c', dash: 'C', glint: 'x', deep: 'n', frame: f, seed: 71, surf: 'C', crest: 'x' });
  // Roses: "burning gardens". Thorny canes, blooms like flames.
  const eeRoses = [
    '................',
    '...FF.......uf..',
    '..FfFk.....fuuf.',
    '..kFFk.F...kffk.',
    '...kvk.FfF..kvk.',
    '.f..vk.kFk..v...',
    'fuf.v.k.v.kvk.FF',
    'kfk.vkvkvkv..FfF',
    '.vkgvgvvgvgk.kFk',
    'kvgvkvgkgvkvgvvk',
    '.kvgvvgvvgvgvkv.',
    'kvvkvgkvvkgvvgvk',
    'vgvvgvvgvkvvgvvv',
    'vvkvvkvgvvkvvkvv',
    'vgvvgvvkvgvvgvvg',
    'kvgvkvgvvgvkvgvk',
  ];
  const eeRoses2 = [
    '................',
    '.uf.........FF..',
    'fuuf...FF..FfFk.',
    'kffk..FfFk.kFFk.',
    '.kvk..kFFk..kvk.',
    '..vk...kvk.f.v..',
    'FF.kvk..v.fuf.k.',
    'FfF..vkvkvkfk.v.',
    'kFk.kvgvvgvvkkvk',
    'kvgvvkvgkgvkvgvk',
    '.kvgvvgvvgvgvkv.',
    'kvvgkvgkvvkgvvgk',
    'vgvvgvvkvgvvgvvv',
    'vvkvvkvgvvkvvkvv',
    'vgvvkvgvvgvvgkvv',
    'kvgvvgvkvgvkvgvk',
  ];
  const eeFlowers = [
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '..u.....f....F..',
    '.uyu...fuf..FfF.',
    '..u.F...f....F..',
    '..g.FF..g.u..v..',
    '..gvFv..gvuu.v..',
    '.vgv.v.vgvg.vgv.',
    'vgvgvgvgvgvgvgvg',
    'gvGvgvgGvgvgvGvg',
  ];
  const eeFlowers2 = [
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '.....F....u.....',
    '..f.FfF..uyu..f.',
    '.fuf.F....u..fuf',
    '..f..v..F.g...f.',
    '..gv.v.FF.gv..g.',
    '.vgv.vgvF.vgv.gv',
    'vgvgvgvgvgvgvgvg',
    'gvgGvgvgvGvgvgGv',
  ];
  def(ee, Object.assign(
    block('ee_lawn', eeLawnT, eeSoil, 'E', 'k', { ee_lawn_m2: eeSoil2 }),
    block('ee_sand', eeSandT, eeSand(33), 's', 'z', { ee_sand_m2: eeSandM2 }),
    block('ee_brick', eeBrickT, eeBrickM, 'F', 'R'),
    block('ee_hedge', eeHedgeT, eeHedgeM, 'G', 'v'),
    { ee_house_t: eeHouseT, ee_house_m: eeHouseM, ee_house_m2: eeHouseM2 }, eeHouseEdges,
    block('ee_floor', eeFloorT, eeFloorM, 'd', 'k'),
    block('ee_wall', eeWallT, eeWallM, 'w', 'W'),
    {
      // The sun-dial: a bronze plate and gnomon on a white plinth.
      ee_dial: [
        '.......kk.......',
        '......kyok......',
        '.....kyYok......',
        '.kkkkkkkkkkkkkk.',
        'kYyyyyyyyyyyyyYk',
        'koyOyyyOyyyOyyok',
        '.kkkkkkkkkkkkkk.',
        '...kkkkkkkkkk...',
        '..kwwwwwwwwwwk..',
        '..kWWWWWWWWWWk..',
        '...kkkkkkkkkk...',
        '....kwWwwWwk....',
        '....kwWwwWwk....',
        '....kwWwwWwk....',
        '....kwWwwWwk....',
        '....kwWwwWwk....',
      ],
      ee_plinth: [
        '....kwWwwWwk....',
        '....kwWwwWwk....',
        '....kwWwwWwk....',
        '....kwWwwWwk....',
        '....kwWwwWwk....',
        '....kwWwwWwk....',
        '....kwWwwWwk....',
        '...kkkkkkkkkk...',
        '..kwwwwwwwwwwk..',
        '..kWWWWWWWWWWk..',
        '.kkkkkkkkkkkkkk.',
        '.kwwwwwwwwwwwwk.',
        '.kwwwwwwwwwwwWk.',
        '.kWWWWWWWWWWWWk.',
        'kkkkkkkkkkkkkkkk',
        'kwwwwwwwwwwwwwWk',
      ],
      ee_roses: eeRoses,
      ee_roses2: eeRoses2,
      ee_flowers: eeFlowers,
      ee_flowers2: eeFlowers2,
      // A white cornice: a ledge with a row of dentils under it.
      ee_cornice: [
        'kkkkkkkkkkkkkkkk',
        'wwwwwwwwwwwwwwww',
        'wwwwwwwwwwwwwwww',
        'WWWWWWWWWWWWWWWW',
        'kkkkkkkkkkkkkkkk',
        'kwWkkwWkkwWkkwWk',
        'kWWkkWWkkWWkkWWk',
        '.kk..kk..kk..kk.',
        ...rep('................', 8),
      ],
      // A French window, ajar: the open leaf throws back the gold sun.
      ee_window: [
        'kwwwwwwwwwwwwwwk',
        'kwkkkkkkwkkkkkwk',
        'kwkYYyykwkqqqkwk',
        'kwkYyyOkwkqQqkwk',
        'kwkyyOOkwkqqqkwk',
        'kwkkkkkkwkkkkkwk',
        'kwkYyyOkwkqqqkwk',
        'kwkyyOOkwkqQqkwk',
        'kwkyOOOkwkqqqkwk',
        'kwkkkkkkwkkkkkwk',
        'kwkyyOOkwkqqqkwk',
        'kwkyOOOkwkqQqkwk',
        'kwkOOOOkwkqqqkwk',
        'kwkkkkkkwkkkkkwk',
        'kwwwwwwwwwwwwwwk',
        'kkkkkkkkkkkkkkkk',
      ],
      // A white trellis with ivy on it: "drifting up the side in bright vines".
      ee_vine: [
        '..kw.....kw..G..',
        '.Gkwg...gkwgGgv.',
        'GgkwgG.GgkwgGv..',
        'kkwwkkkkkwwkkkkk',
        'wwwwwwwwwwwwwwww',
        'kkkwkkkkkkwkkkkk',
        '.vgkwG...gkw.g..',
        '..GkwgG.GgkwGgv.',
        '...kw.vGgvkw.v..',
        'kkkwkkkkkkwkkkkk',
        'wwwwwwwwwwwwwwww',
        'kkkwkkkkkkwkkkkk',
        '.g.kwG...gkwg...',
        'gGvkwgv.GgkwGv..',
        '.v.kw.g..vkw.g..',
        '..gkw....gkw....',
      ],
      ee_sea1: eeSea(0),
      ee_sea2: eeSea(1),
      ee_dock: [
        'kkkkkkkkkkkkkkkk',
        'ddddkddddkddddkd',
        'bdddkbdddkbdddkb',
        'bbbbkbbbbkbbbbkb',
        'kkkkkkkkkkkkkkkk',
        '.kbdk......kbdk.',
        '.kbdk......kbdk.',
        '.kbdk......kbdk.',
        '.kbdk......kbdk.',
        '.kbdk......kbdk.',
        '.kbbk......kbbk.',
        '.kbdk......kbdk.',
        '.kbdk......kbdk.',
        '.kbdk......kbdk.',
        '.kbbk......kbbk.',
        '.kbdk......kbdk.',
      ],
    },
  ));

  /* =============================================================== II */
  /* THE VALLEY OF ASHES. Grays only: 0x0f, 0x00, 0x10, 0x20. */
  const as = {
    k: 0x0f, a: 0x00, l: 0x10, w: 0x20,
    b: 0x08, B: 0x18,           // timber gone gray-brown
    y: 0x18, Y: 0x28,           // the yellow brick, dulled
    c: 0x0c,                    // the foul river
  };
  const asAsh = (seed) => grid((x, y) => {
    const n = N(x, y, seed);
    if (n < 0.07) return 'k';
    if (n < 0.2) return 'l';
    if (B(x + 1, y) < 0.18) return 'k';
    return 'a';
  });
  const asAshT = map(asAsh(81), (c, x, y) => {
    // A crust: the surface drifts in little humps of pale ash.
    const top = Math.round(1 + Math.sin(x * Math.PI / 5 + 1) * 1);
    if (y < top) return null;
    if (y === top) return N(x, y, 3) < 0.4 ? 'w' : 'l';
    if (y === top + 1) return N(x, y, 4) < 0.6 ? 'l' : 'a';
    if (y === top + 2) return B(x, y) < 0.5 ? 'l' : c;
    return c;
  });
  const asAshM2 = over(asAsh(82), [
    '................',
    '................',
    '................',
    '................',
    '.....kkk........',
    '....klllk.......',
    '...klkkllk......',
    '...kk..kkk......',
  ]);
  const asHeapM = grid((x, y) => {
    const n = N(x, y, 91);
    if (n < 0.1) return 'a';
    if (n < 0.16) return 'w';
    if (B(x, y) < 0.3) return 'a';
    return 'l';
  });
  const asHeapT = map(asHeapM, (c, x, y) => {
    const top = Math.round(2.5 - Math.cos((x + 3) * Math.PI / 8) * 2);
    if (y < top) return null;
    if (y === top) return 'w';
    if (y === top + 1) return N(x, 1, 2) < 0.5 ? 'w' : 'l';
    return c;
  });
  // Rails on ties over ballast.
  const ballast = grid((x, y) => {
    const n = N(x, y, 101);
    if (n < 0.25) return 'k';
    if (n < 0.45) return 'l';
    return 'a';
  });
  const asTrackT = over(ballast, [
    '................',
    '................',
    'wwwwwwwwwwwwwwww',
    'llllllllllllllll',
    'kakkkkkakkkkkkak',
    '.ka.....ka......',
    'kbbbbkkkbbbbbkkk',
    'kBbbbbkkBbbbbbkk',
    'kkkkkkkkkkkkkkkk',
  ]).map((r, y) => (y < 2 ? '................' : r));
  def(as, Object.assign(
    block('as_ash', asAshT, asAsh(83), 'l', 'k', { as_ash_m2: asAshM2 }),
    block('as_heap', asHeapT, asHeapM, 'w', 'a'),
    block('as_track', asTrackT, ballast, 'l', 'k'),
    block('as_brick', [
      'kkkkkkkkkkkkkkkk',
      'YYYYYYYYYYYYYYYY',
      'yyyyyyyyyyyyyyyy',
      'aaaaaaaaaaaaaaaa',
      ...bricks({ face: 'y', hi: 'y', lo: 'a', mortar: 'a', speck: 'k', seed: 111, rate: 0.12 }).slice(4),
    ], bricks({ face: 'y', hi: 'y', lo: 'a', mortar: 'a', speck: 'k', seed: 112, rate: 0.12 }), 'Y', 'k', {
      // Grime run down from a broken gutter.
      as_brick_m2: map(bricks({ face: 'y', hi: 'y', lo: 'a', mortar: 'a', speck: 'k', seed: 113, rate: 0.1 }), (c, x, y) => (x >= 5 && x <= 7 && B(x, y) < 0.6 - y * 0.02 ? 'k' : c)),
    }),
    {
      as_trestle: [
        'kbbk........kbbk',
        'kBbkk......kkbBk',
        'kBbkbk....kbkbBk',
        'kBbk.bk..kb.kbBk',
        'kBbk..bkkb..kbBk',
        'kBbk...bb...kbBk',
        'kBbk..kbbk..kbBk',
        'kBbk.kb..bk.kbBk',
        'kBbkkb....bkkbBk',
        'kBbkb......bkbBk',
        'kkkkkkkkkkkkkkkk',
        'kBBBBBBBBBBBBBBk',
        'kbbbbbbbbbbbbbbk',
        'kkkkkkkkkkkkkkkk',
        'kBbk........kbBk',
        'kBbk........kbBk',
      ],
      as_rail: [
        'kkkkkkkkkkkkkkkk',
        'llllllllllllllll',
        'aaaaaaaaaaaaaaaa',
        'kbbkBbbkbbBkbbbk',
        'kkkkkkkkkkkkkkkk',
        '..kbk......kbk..',
        '..kbk......kbk..',
        '..kkk......kkk..',
        ...rep('................', 8),
      ],
      // "The interior was unprosperous and bare."
      as_shop: [
        'kkkkkkkkkkkkkkkk',
        'kbbbbbbbbbbbbbbk',
        'kbkkkkkkkkkkkkbk',
        'kbkaalaakaaaakbk',
        'kbkalaaakaaalkbk',
        'kbkaaaaakaalakbk',
        'kbkkkkkkkkkkkkbk',
        'kbkaaaaakaaaakbk',
        'kbkalkkakkkkakbk',
        'kbkakllkkllkakbk',
        'kbkakkkkkkkkakbk',
        'kbkkkkkkkkkkkkbk',
        'kbbbbbbbbbbbbbbk',
        'kkkkkkkkkkkkkkkk',
        'klllllllllllllak',
        'kkkkkkkkkkkkkkkk',
      ],
      as_river1: water({ base: 'c', dash: 'a', glint: 'l', deep: 'k', frame: 0, seed: 121 }),
      as_river2: water({ base: 'c', dash: 'a', glint: 'l', deep: 'k', frame: 1, seed: 121 }),
      as_bridge: [
        'kkkkkkkkkkkkkkkk',
        'BbbbkBbbbkBbbbkB',
        'bbbbkbbbbkbbbbkb',
        'kkkkkkkkkkkkkkkk',
        'kllkkkkkkkkkkllk',
        'kaakbbbbbbbbkaak',
        'kkkkkkkkkkkkkkkk',
        ...rep('................', 9),
      ],
      as_scaffold: [
        'kkkkkkkkkkkkkkkk',
        'BBBBBBBBBBBBBBBB',
        'bbbBbbbbbbbbBbbb',
        'kkkkkkkkkkkkkkkk',
        '.kbk........kbk.',
        '.kbk........kbk.',
        '.kkk........kkk.',
        ...rep('................', 9),
      ],
      as_ladder: [
        '..kbk.....kbk...',
        '..kBkkkkkkkBk...',
        '..kBBBBBBBBBk...',
        '..kBkkkkkkkBk...',
        '..kbk.....kbk...',
        '..kbk.....kbk...',
        '..kBkkkkkkkBk...',
        '..kBBBBBBBBBk...',
        '..kBkkkkkkkBk...',
        '..kbk.....kbk...',
        '..kbk.....kbk...',
        '..kBkkkkkkkBk...',
        '..kBBBBBBBBBk...',
        '..kBkkkkkkkBk...',
        '..kbk.....kbk...',
        '..kbk.....kbk...',
      ],
      as_post: rep('......kBbk......', 16),
      // A telegraph pole, with the iron steps a lineman climbs by.
      as_pole: [
        '......kBbk......',
        '......kBbk......',
        '......kBbkkk....',
        '......kBbkak....',
        '......kBbk......',
        '......kBbk......',
        '....kkkBbk......',
        '....kakBbk......',
        '......kBbk......',
        '......kBbk......',
        '......kBbkkk....',
        '......kBbkak....',
        '......kBbk......',
        '......kBbk......',
        '....kkkBbk......',
        '....kakBbk......',
      ],
    },
  ));
  // "REPAIRS. GEORGE B. WILSON. CARS BOUGHT AND SOLD." Three tiles of board.
  {
    const F3 = {
      R: ['##.', '#.#', '##.', '#.#', '#.#'], E: ['###', '#..', '##.', '#..', '###'],
      P: ['##.', '#.#', '##.', '#..', '#..'], A: ['.#.', '#.#', '###', '#.#', '#.#'],
      I: ['#', '#', '#', '#', '#'], S: ['.##', '#..', '.#.', '..#', '##.'],
      G: ['.##', '#..', '#.#', '#.#', '.##'], B: ['##.', '#.#', '##.', '#.#', '##.'],
      W: ['#...#', '#...#', '#.#.#', '#.#.#', '.#.#.'], L: ['#..', '#..', '#..', '#..', '###'],
      O: ['.#.', '#.#', '#.#', '#.#', '.#.'], N: ['#..#', '##.#', '#.##', '#..#', '#..#'],
      C: ['.##', '#..', '#..', '#..', '.##'], '.': ['.', '.', '.', '.', '#'],
    };
    const W48 = 48;
    const board = Array.from({ length: 16 }, () => Array(W48).fill('.'));
    for (let y = 1; y < 14; y++) for (let x = 0; x < W48; x++) {
      const edge = y === 1 || y === 13 || x === 0 || x === W48 - 1;
      board[y][x] = edge ? 'k' : (y === 2 ? 'w' : N(x, y, 131) < 0.08 ? 'a' : 'l');
    }
    const write = (str, y0) => {
      let w = 0;
      for (const ch of str) w += (F3[ch] ? F3[ch][0].length : 2) + 1;
      w -= 1;
      let x = Math.floor((W48 - w) / 2);
      for (const ch of str) {
        const g = F3[ch];
        if (!g) { x += 3; continue; }
        g.forEach((row, yy) => { for (let i = 0; i < row.length; i++) if (row[i] === '#') board[y0 + yy][x + i] = 'k'; });
        x += g[0].length + 1;
      }
    };
    write('REPAIRS', 2);
    write('G.B.WILSON', 8);
    // Two legs under the board.
    for (const lx of [4, 43]) for (let y = 14; y < 16; y++) { board[y][lx] = 'k'; board[y][lx + 1] = 'b'; board[y][lx + 2] = 'k'; }
    const part = (i) => board.map((r) => r.slice(i * 16, i * 16 + 16).join(''));
    def(as, { as_sign1: part(0), as_sign2: part(1), as_sign3: part(2) });
  }

  /* ============================================================== III */
  /* THE PARTY: blue gardens at night, marble, the house all lit up. */
  const pt = {
    k: 0x0f,
    G: 0x1c, g: 0x0c, v: 0x02, e: 0x0f, E: 0x02,      // the blue lawn by night
    w: 0x30, W: 0x10, d: 0x00, m: 0x20,               // marble
    q: 0x37, Q: 0x18,                                 // its veins and joints, in the party's own colours
    c: 0x37, C: 0x27, j: 0x18,                        // cream stone
    y: 0x28, Y: 0x38, o: 0x27,                        // lamplight, gold
    b: 0x07, B: 0x17,                                 // mahogany
    h: 0x0c, H: 0x1c,                                 // hedges
    p: 0x11, P: 0x21, x: 0x31,                        // the pool
    r: 0x06, R: 0x16, n: 0x0a, N: 0x1a, u: 0x02, U: 0x12, // book bindings
    O: 0x18, t: 0x08,                                 // carved oak
    s: 0x26, z: 0x2a, q: 0x21,                        // food, bulbs
  };
  const ptSoil = soil({ base: 'e', speck: 'E', pore: 'v', seed: 141, rate: 0.08, poreRate: 0.02 });
  const ptLawnT = turf({ hi: 'G', mid: 'g', dk: 'v', soil: ptSoil, seed: 142 });
  const ptMarbleM = grid((x, y) => {
    // Big slabs with faint cream veins, gold at the joints.
    if (y % 8 === 7 || (x + (Math.floor(y / 8) % 2) * 8) % 16 === 15) return 'Q';
    const vein = Math.abs(((x * 3 + y * 2 + 5) % 23) - 11) === 0 && N(x, y, 5) < 0.8;
    if (vein) return 'q';
    if (N(x, y, 151) < 0.05) return 'm';
    return 'w';
  });
  const ptMarbleT = [
    'kkkkkkkkkkkkkkkk',
    'mmmmmmmmmmmmmmmm',
    'wwwwwwwwwwwwwwww',
    'qqqqqqqqqqqqqqqq',
    'QQQQQQQQQQQQQQQQ',
    ...ptMarbleM.slice(5),
  ];
  const ptWallM = grid((x, y) => {
    // Ashlar: long cream blocks, ochre joints.
    const course = Math.floor(y / 8), r = y % 8;
    const off = (course % 2) * 8;
    if (r === 7 || (x + off) % 16 === 15) return 'j';
    if (r === 0) return 'c';
    if (r >= 5 && B(x, y) < (r - 4) / 4) return 'C';
    return 'c';
  });
  const ptWallT = [
    'kkkkkkkkkkkkkkkk',
    'cccccccccccccccc',
    'CjCCjCCjCCjCCjCC',
    'jjjjjjjjjjjjjjjj',
    ...ptWallM.slice(4),
  ];
  const ptWallM2 = over(ptWallM, [
    '..jjjjjjjjjjj...',
    '..jcccccccccC...',
    '..jcccCjCcccC...',
    '..jccCcjcCccC...',
    '..jcCjjcjjCcC...',
    '..jccCcjcCccC...',
    '..jcccCjCcccC...',
    '..jcccccccccC...',
    '..jCCCCCCCCCC...',
  ], 0, 2);
  const ptWin = (lit) => [
    'jjjjjjjjjjjjjjjj',
    'cccckkkkkkkkcccc',
    'ccckYYYkYYYYkccc',
    'cckYYYYkYYYYYkcc',
    'cckYYyykyyYYYkcc',
    'cckkkkkkkkkkkkcc',
    'cckyyyykyyyyykcc',
    'ccky' + (lit ? 'oo' : 'yy') + 'ykyy' + (lit ? 'oo' : 'yy') + 'ykcc',
    'ccky' + (lit ? 'oo' : 'yy') + 'ykyy' + (lit ? 'oo' : 'yy') + 'ykcc',
    'cckkkkkkkkkkkkcc',
    'cckyyyykyyyyykcc',
    'cckyyyykyyyyykcc',
    'cckoyyykyyyyokcc',
    'ckkkkkkkkkkkkkkc',
    'ckwwwwwwwwwwwwkc',
    'jjjjjjjjjjjjjjjj',
  ];
  const ptBarM = grid((x, y) => {
    // Paneled front, the brass foot rail near the floor.
    if (y === 12) return 'Y';
    if (y === 13) return 'y';
    if (y === 14) return 'k';
    const px = x % 8, py = y % 12;
    if (px === 0 || py === 0) return 'k';
    if (px === 1 || py === 1) return 'B';
    if (px === 7 || py === 11) return 't';
    return 'b';
  });
  const ptBarT = [
    'kkkkkkkkkkkkkkkk',
    'BBBBBBBBBBBBBBBB',
    'bbbbbbbbbbbbbbbb',
    'kkkkkkkkkkkkkkkk',
    'YYYYYYYYYYYYYYYY',
    'yykyykyykyykyyky',
    ...ptBarM.slice(6).map((r, i) => (i < 6 ? r : r)),
  ];
  const ptHedgeM = leaves('H', 'h', 'k', 161);
  const ptHedgeT = clipped(ptHedgeM, 'H', 162);
  const ptPool = (f) => water({ base: 'p', dash: 'P', glint: 'x', frame: f, seed: 171, surf: 'P', crest: 'x', open: true, bandRows: 4 });
  // The Gothic library: bookcases of carved oak, books in every binding.
  const shelfOfBooks = (seed) => {
    const cols = ['r', 'R', 'n', 'N', 'u', 'U', 'B', 'b', 'O'];
    const g = Array.from({ length: 16 }, () => Array(16).fill('t'));
    for (let shelf = 0; shelf < 2; shelf++) {
      const y0 = shelf * 8;
      // the shelf board
      for (let x = 0; x < 16; x++) { g[y0 + 7][x] = 'k'; g[y0 + 6][x] = 'O'; }
      let x = 0;
      while (x < 16) {
        const w = 1 + Math.floor(N(x, shelf, seed) * 2.2);
        const h = 4 + Math.floor(N(x, shelf + 5, seed) * 2);
        const col = cols[Math.floor(N(x, shelf + 9, seed) * cols.length)];
        const lean = N(x, shelf + 13, seed) < 0.08;
        for (let i = 0; i < w && x + i < 16; i++) {
          for (let yy = 0; yy < h; yy++) {
            const y = y0 + 6 - 1 - yy;
            g[y][x + i] = yy === h - 1 ? 'k' : (yy === h - 3 && w > 1 ? 'y' : col);
          }
        }
        if (!lean) for (let yy = 0; yy < h; yy++) { const y = y0 + 5 - yy; if (x + w < 16) g[y][x + w] = 'k'; }
        x += w + 1;
      }
    }
    return g.map((r) => r.join(''));
  };
  const ptBooksM = shelfOfBooks(181);
  const ptBooksT = [
    '.kk.kk.kk.kk.kk.',
    'kOOkOOkOOkOOkOOk',
    'kOtOOtOOtOOtOOtk',
    'kkkkkkkkkkkkkkkk',
    'OOOOOOOOOOOOOOOO',
    'tttttttttttttttt',
    'kkkkkkkkkkkkkkkk',
    ...shelfOfBooks(182).slice(7),
  ];
  const ptOakM = grid((x, y) => {
    // Linenfold panels: folds of carved oak in a frame.
    const px = x % 8, py = y % 16;
    if (px === 0 || py === 0) return 'k';
    if (px === 1 || py === 1) return 'O';
    if (px === 7 || py === 15) return 't';
    if (py === 3 || py === 12) return 'O';
    return px % 2 ? 'b' : 'O';
  }).map((r) => r.replace(/b/g, 't'));
  def(pt, Object.assign(
    block('pt_lawn', ptLawnT, ptSoil, 'E', 'k', { pt_lawn_m2: soil({ base: 'e', speck: 'E', pore: 'v', seed: 143, rate: 0.1, poreRate: 0.03 }) }),
    block('pt_marble', ptMarbleT, ptMarbleM, 'm', 'd'),
    block('pt_wall', ptWallT, ptWallM, 'c', 'C', { pt_wall_m2: ptWallM2 }),
    block('pt_bar', ptBarT, ptBarM, 'B', 'k'),
    block('pt_hedge', ptHedgeT, ptHedgeM, 'H', 'k'),
    block('pt_books', ptBooksT, ptBooksM, 'O', 'k', { pt_books_m2: shelfOfBooks(183), pt_books_m3: shelfOfBooks(184) }),
    block('pt_oak', [
      'kkkkkkkkkkkkkkkk',
      'OOOOOOOOOOOOOOOO',
      'OtOtOtOtOtOtOtOt',
      'tttttttttttttttt',
      'kkkkkkkkkkkkkkkk',
      ...ptOakM.slice(5),
    ], ptOakM, 'O', 'k'),
    {
      pt_win1: ptWin(false),
      pt_win2: ptWin(true),
      // A buffet: "spiced baked hams crowded against salads of harlequin
      // designs and pastry pigs and turkeys bewitched to a dark gold".
      pt_table: [
        'kkkkkkkkkkkkkkkk',
        'wwwwwwwwwwwwwwww',
        'WwWwWwWwWwWwWwWw',
        'kkkkkkkkkkkkkkkk',
        'kwwwwwwwwwwwwwwk',
        'kwWwwwwWwwwwwWwk',
        'kwWwwwwWwwwwwWwk',
        'kwWwwwwWwwwwwWwk',
        'kWWWWWWWWWWWWWWk',
        'kkkkkkkkkkkkkkkk',
        '.kbk........kbk.',
        '.kbk........kbk.',
        '.kbk........kbk.',
        '.kbk........kbk.',
        '.kkk........kkk.',
        '................',
      ],
      // A tier of the champagne tower: coupes rim to rim, gold to the brim,
      // on a silver tray that rests on the rims of the tier below (or the table).
      pt_glasses: [
        'wkkwwkkwwkkwwkkw',
        'kYYykYYykYYykYYy',
        'kyyykyyykyyykyyy',
        '.kyk.kyk.kyk.kyk',
        '..k...k...k...k.',
        ...rep('..w...w...w...w.', 6),
        '.wWw.wWw.wWw.wWw',
        'kkkkkkkkkkkkkkkk',
        'wmwmwmwmwmwmwmwm',
        'mwmwmwmwmwmwmwmw',
        'kkkkkkkkkkkkkkkk',
      ],
      // A buffet table's legs, for one that stands taller than a tile.
      pt_legs: [
        ...rep('.kbk........kbk.', 15),
        '.kkk........kkk.',
      ],
      // The bandstand's edge, swagged with gold bunting.
      pt_stand: [
        'kkkkkkkkkkkkkkkk',
        'BBBBBBBBBBBBBBBB',
        'bbbbbbbbbbbbbbbb',
        'kkkkkkkkkkkkkkkk',
        'YyyyyyyYYyyyyyyY',
        'kYyyyyYkkYyyyyYk',
        '.kYyyYk..kYyyYk.',
        '..kkkk....kkkk..',
        '...kbk....kbk...',
        '...kbk....kbk...',
        '...kbk....kbk...',
        '...kbk....kbk...',
        '...kbk....kbk...',
        '...kbk....kbk...',
        '...kbk....kbk...',
        '...kkk....kkk...',
      ],
      // The bandstand's legs, down to the dance floor.
      pt_standlegs: [
        ...rep('...kbk....kbk...', 15),
        '...kkk....kkk...',
      ],
      pt_pool1: ptPool(0),
      pt_pool2: ptPool(1),
      pt_shelf: [
        '..k.kk..kk...k..',
        '.kRkkUk.kNk.kRk.',
        '.kRkkUkkkNk.kRk.',
        '.kykkUkkyNk.kyk.',
        '.kRkkUkkkNkkkRk.',
        'kkkkkkkkkkkkkkkk',
        'OOOOOOOOOOOOOOOO',
        'tttttttttttttttt',
        'kkkkkkkkkkkkkkkk',
        '.kOtk......kOtk.',
        '..kk........kk..',
        ...rep('................', 5),
      ],
      pt_lights1: [
        'k..............k',
        '.k............k.',
        '..kk........kk..',
        '..RYk......kzk..',
        '..RRkk....kkzz..',
        '......kkkk......',
        '.....kYqk.......',
        '.....kqqk.......',
        '......kk........',
        ...rep('................', 7),
      ].map((r, y) => r),
      pt_lights2: [
        'k..............k',
        '.k............k.',
        '..kk........kk..',
        '..rok......knk..',
        '..rrkk....kknn..',
        '......kkkk......',
        '.....kopk.......',
        '.....kppk.......',
        '......kk........',
        ...rep('................', 7),
      ],
      pt_urn: [
        '..kkkkkkkkkkkk..',
        '.kwwwwwwwwwwwWk.',
        '.kkkkkkkkkkkkkk.',
        '..kGHGGHGGHGHk..',
        '..kwwwwwwwwwWk..',
        '...kwwmwwwwWk...',
        '...kwwwwwwwWk...',
        '....kwwwwwWk....',
        '.....kkwWkk.....',
        '......kwWk......',
        '.....kkwWkk.....',
        '...kkwwwwwWkk...',
        '..kwwwwwwwwwWk..',
        '..kWWWWWWWWWWk..',
        '.kkkkkkkkkkkkkk.',
        'kwwwwwwwwwwwwwWk',
      ],
    },
  ));

  /* =============================================================== IV */
  /* THE QUEENSBORO BRIDGE: riveted steel at midday. */
  const br = {
    k: 0x0f, a: 0x00, A: 0x10, w: 0x20, y: 0x28, Y: 0x38,
    g: 0x00, G: 0x10, c: 0x0c,             // steel and its blue shade
    p: 0x10, P: 0x00,                      // granite
    r: 0x11, R: 0x01, x: 0x21,             // the river far below
  };
  const brRoadM = grid((x, y) => {
    // The deck under the roadway: plates with rivets and a stringer.
    if (y === 7 || y === 15) return 'k';
    if (y === 8 || y === 0) return 'G';
    if ((x === 2 || x === 13) && (y === 3 || y === 11)) return 'k';
    if (x % 16 === 15) return 'c';
    return B(x, y) < 0.2 ? 'c' : 'g';
  });
  const brRoadT = [
    'kkkkkkkkkkkkkkkk',
    'AAAAAAAAAAAAAAAA',
    'aaaaaaaaaaaaaaaa',
    'aaaAaaaaaaaaakaa',
    'aaaaaayyyyaaaaaa',
    'aakaaaaaaaaaaaaa',
    'aaaaaaaaaaaaaAaa',
    'kkkkkkkkkkkkkkkk',
    ...brRoadM.slice(8),
  ];
  const brGirderM = grid((x, y) => {
    // A plate girder with a lattice web: flanges top and bottom.
    if (y === 0 || y === 15) return 'k';
    if (y === 1 || y === 14) return 'G';
    if (y === 2 || y === 13) return 'c';
    if ((y === 1 || y === 14) && x % 4 === 1) return 'k';
    const d1 = (x - (y - 3)) & 15, d2 = (x + (y - 3)) & 15;
    if (d1 < 2 || d2 < 2) return d1 === 0 || d2 === 0 ? 'G' : 'g';
    return (y > 2 && y < 13 && (x === 0 || x === 15)) ? 'g' : null;
  }).map((r, y) => (y === 1 || y === 14 ? r.split('').map((c, x) => (x % 4 === 1 ? 'k' : c)).join('') : r));
  const brGirderSolid = map(brGirderM, (c) => (c === '.' ? 'c' : c));
  def(br, Object.assign(
    block('br_road', brRoadT, brRoadM, 'A', 'k'),
    block('br_girder', brGirderSolid, brGirderSolid, 'G', 'k'),
    block('br_pier', [
      'kkkkkkkkkkkkkkkk',
      'pppppppppppppppp',
      'PPPPPPPPPPPPPPPP',
      'kkkkkkkkkkkkkkkk',
      ...bricks({ w: 16, h: 6, face: 'p', hi: 'p', lo: 'P', mortar: 'k', speck: 'P', seed: 191, rate: 0.12, start: 0 }).slice(4),
    ], bricks({ w: 16, h: 6, face: 'p', hi: 'p', lo: 'P', mortar: 'k', speck: 'P', seed: 192, rate: 0.12 }).map((r, y) => r), 'p', 'P'),
    {
      br_truss: grid((x, y) => {
        if (y === 0 || y === 15) return 'k';
        if (y === 1 || y === 14) return x % 4 === 1 ? 'k' : 'G';
        if (y === 2 || y === 13) return 'c';
        const d1 = Math.abs(x - (y - 2) * 15 / 10), d2 = Math.abs(x - (15 - (y - 2) * 15 / 10));
        if (d1 < 1.2 || d2 < 1.2) return (d1 < 0.6 || d2 < 0.6) ? 'G' : 'c';
        return null;
      }),
      br_rail: [
        'kkkkkkkkkkkkkkkk',
        'GGGGGGGGGGGGGGGG',
        'kkkkkkkkkkkkkkkk',
        '.kgk...kgk...kgk',
        '.kgk...kgk...kgk',
        '.kgk...kgk...kgk',
        'kkkkkkkkkkkkkkkk',
        'gggggggggggggggg',
        'kkkkkkkkkkkkkkkk',
        ...rep('................', 7),
      ],
      // A hole in the roadway: torn lips of asphalt, then nothing but air.
      br_hole: [
        'Aak..........kaA',
        'kak..........kak',
        '.k............k.',
        ...rep('................', 13),
      ],
      br_lamp: [
        '.....kkkkkk.....',
        '....kYYYYwYk....',
        '....kYwYYYYk....',
        '....kyYYYYyk....',
        '.....kkkkkk.....',
        '......kGgk......',
        '.....kkGgkk.....',
        '......kGgk......',
        '......kGgk......',
        '......kGgk......',
        '......kGgk......',
        '......kGgk......',
        '......kGgk......',
        '.....kGGggk.....',
        '....kGGgggck....',
        '....kkkkkkkk....',
      ],
    },
  ));

  /* =============================================================== IV */
  /* THE CELLAR: "a well-fanned Forty-second Street cellar". */
  const cl = {
    k: 0x0f, w: 0x30, W: 0x10,
    r: 0x06, R: 0x07, m: 0x08,             // brick and grime
    l: 0x16, L: 0x26,                      // red leather
    y: 0x28, Y: 0x38, b: 0x07, B: 0x17,
    g: 0x1a, a: 0x17, c: 0x31,             // bottles
  };
  const clFloorM = bricks({ face: 'R', hi: 'r', lo: 'm', mortar: 'k', speck: 'm', seed: 201, rate: 0.15 });
  const clFloorT = [
    'kkkkkkkkkkkkkkkk',
    'wwwwkkkkwwwwkkkk',
    'wwwWkkkkwwwWkkkk',
    'WWWWkkkkWWWWkkkk',
    'kkkkwwwwkkkkwwww',
    'kkkkwwwWkkkkwwwW',
    'kkkkWWWWkkkkWWWW',
    'kkkkkkkkkkkkkkkk',
    'bbbbbbbbbbbbbbbb',
    'kkkkkkkkkkkkkkkk',
    ...clFloorM.slice(10),
  ];
  const clWallM = bricks({ face: 'r', hi: 'r', lo: 'R', mortar: 'm', speck: 'R', seed: 211, rate: 0.1 });
  const clWallT = [
    'kkkkkkkkkkkkkkkk',
    'BBBBBBBBBBBBBBBB',
    'bbbbbbbbbbbbbbbb',
    'kkkkkkkkkkkkkkkk',
    ...clWallM.slice(4),
  ];
  // A framed photograph of a prizefighter, slightly askew.
  const clWallM2 = over(clWallM, [
    '...kkkkkkkkk....',
    '...kyyyyyyyk....',
    '...kykkkkkyk....',
    '...kykWWWkyk....',
    '...kykWkWkyk....',
    '...kykkWkkyk....',
    '...kykWWWkyk....',
    '...kykkkkkyk....',
    '...kyyyyyyyk....',
    '...kkkkkkkkk....',
  ], 0, 3);
  const clBoothM = grid((x, y) => {
    // Tufted leather: diamond buttons.
    const dx = x % 8, dy = (y + 2) % 8;
    if ((dx === 4 && dy === 4) || (dx === 0 && dy === 0)) return 'k';
    if ((dx + dy) % 8 === 0 || (dx - dy + 8) % 8 === 0) return 'R';
    return N(x, y, 3) < 0.08 ? 'L' : 'l';
  }).map((r) => r.replace(/R/g, 'r'));
  const clBoothT = [
    '..kkkkkkkkkkkk..',
    '.kyLLLLLLLLLLyk.',
    'kyLLllllllllLLyk',
    'kylllllllllllllk',
    ...clBoothM.slice(4),
  ];
  def(cl, Object.assign(
    block('cl_floor', clFloorT, clFloorM, 'r', 'k'),
    block('cl_wall', clWallT, clWallM, 'B', 'k', { cl_wall_m2: clWallM2 }),
    block('cl_booth', clBoothT, clBoothM, 'L', 'k', {}, { round: false }),
    {
      cl_table: [
        'kkkkkkkkkkkkkkkk',
        'wwwwwwwwwwwwwwww',
        'WWWWWWWWWWWWWWWW',
        'kWwwwwwwwwwwwwWk',
        '.kWwwWwwwwWwwWk.',
        '..kkkkkkkkkkkk..',
        '.......kbk......',
        '.......kbk......',
        '.......kbk......',
        '.......kbk......',
        '.......kbk......',
        '.......kbk......',
        '......kkbkk.....',
        '....kkbbbbbkk...',
        '....kkkkkkkkk...',
        '................',
      ],
      cl_shelf: [
        '.kk..kk..k...kk.',
        '.kg..kak.c..kgk.',
        'kggk.kak.kck.kg.',
        'kggk.kaakkck.kgk',
        'kggk.kaakkcck.gk',
        'kkkk.kkkkkkkk.kk',
        'kkkkkkkkkkkkkkkk',
        'BBBBBBBBBBBBBBBB',
        'bbbbbbbbbbbbbbbb',
        'kkkkkkkkkkkkkkkk',
        '.kbk.......kbk..',
        '..kk........kk..',
        ...rep('................', 4),
      ],
      cl_fan1: [
        '.......kk.......',
        '.......yk.......',
        '.......yk.......',
        '.......yk.......',
        '......kyyk......',
        'kkkkkkkyykkkkkkk',
        'bBBBBBkyykBBBBBb',
        'kkkkkkkkkkkkkkkk',
        '.......kk.......',
        ...rep('................', 7),
      ],
      cl_fan2: [
        '.......kk.......',
        '.......yk.......',
        '.......yk.......',
        '.......yk.......',
        '......kyyk......',
        '....kkkyykkk....',
        '....kBkyykbk....',
        '....kkkkkkkk....',
        '.......kk.......',
        ...rep('................', 7),
      ],
      cl_lamp: [
        '................',
        '................',
        '.....kkkkkk.....',
        '....kYYYYYYk....',
        '...kYYYYYYYyk...',
        '..kyyyyyyyyyyk..',
        '..kkkkkkkkkkkk..',
        '.......kyk......',
        '.......kyk......',
        '.....kkkyk......',
        '.....kyyyk......',
        '.....kkkkk......',
        ...rep('................', 4),
      ],
    },
  ));

  /* ================================================================ V */
  /* GATSBY'S HOUSE: marble, cream and gilt, rain on the tall windows. */
  const mn = {
    k: 0x0f, w: 0x30, W: 0x10, d: 0x00, m: 0x20,
    c: 0x37, C: 0x27, y: 0x28, Y: 0x38, o: 0x18,
    p: 0x24, P: 0x14, q: 0x34,            // rose silk
    l: 0x33, L: 0x23,                     // lavender
    g: 0x0c, G: 0x00, r: 0x10,            // rain through the glass
    s: 0x31, S: 0x21,                     // mirror glass
    a: 0x2d,
  };
  const mnFloorM = grid((x, y) => {
    // Marble with a gold inlay border every slab.
    if (y % 8 === 7) return 'W';
    if ((x + (Math.floor(y / 8) % 2) * 8) % 16 === 15) return 'W';
    if (N(x, y, 221) < 0.06) return 'm';
    const vein = ((x * 2 + y * 3) % 17) === 0;
    return vein ? 'W' : 'w';
  });
  const mnFloorT = [
    'kkkkkkkkkkkkkkkk',
    'mmmmmmmmmmmmmmmm',
    'wwwwwwwwwwwwwwww',
    'yyyyyyyyyyyyyyyy',
    'oyoyoyoyoyoyoyoy',
    'kkkkkkkkkkkkkkkk',
    ...mnFloorM.slice(6),
  ];
  // Paneled walls: cream panels in gilt frames.
  const mnWallM = grid((x, y) => {
    const px = x % 16, py = y % 16;
    if (px === 0 || px === 15) return 'C';
    if (py === 0 || py === 15) return 'C';
    if (px === 2 || py === 2) return 'Y';
    if (px === 13 || py === 13) return 'o';
    if ((px === 1 || px === 14 || py === 1 || py === 14)) return 'c';
    if (px > 2 && px < 13 && py > 2 && py < 13) return B(x, y) < 0.08 ? 'C' : 'c';
    return 'y';
  });
  const mnWallT = [
    'kkkkkkkkkkkkkkkk',
    'YYYYYYYYYYYYYYYY',
    'yoyyoyyoyyoyyoyy',
    'oooooooooooooooo',
    'kkkkkkkkkkkkkkkk',
    ...mnWallM.slice(5),
  ];
  // A medallion of a gilt sconce in the panel.
  const mnWallM2 = over(mnWallM, [
    '......kk......',
    '.....kYYk.....',
    '....kYyyok....',
    '.....kyok.....',
    '......ko......',
    '....kyyyyk....',
    '.....kkkk.....',
  ], 1, 4);
  const mnWin = (f) => grid((x, y) => {
    if (x === 0 || x === 15) return 'k';
    if (x === 1 || x === 14) return 'w';
    if (x === 7 || x === 8) return x === 7 ? 'w' : 'W';
    if (y === 7) return 'w';
    if (y === 8) return 'W';
    // Rain: diagonal streaks sliding down the glass.
    const s = (x + y * 1 - f * 5 + 64) % 7;
    if (s === 0 && N(x, y, 3) < 0.7) return 'r';
    return B(x, y) < 0.25 ? 'G' : 'g';
  });
  def(mn, Object.assign(
    block('mn_floor', mnFloorT, mnFloorM, 'm', 'W'),
    block('mn_wall', mnWallT, mnWallM, 'Y', 'o', { mn_wall_m2: mnWallM2 }),
    (() => {
      const lid = [
        'kkkkkkkkkkkkkkkk',
        'aaaaaaaaaaaaaaaa',
        'ddmddddddddddddd',
        'kkkkkkkkkkkkkkkk',
        'yyyyyyyyyyyyyyyy',
        'kkkkkkkkkkkkkkkk',
        'kkkkkkkkkkkkkkkk',
        'kkkdkkkkkkkkdkkk',
        'kkkkkkkkkkkkkkkk',
        'kkkkkkkkkkkkkkkk',
        'kkkkkkkdkkkkkkkk',
        'kkkkkkkkkkkkkkkk',
        'yyyyyyyyyyyyyyyy',
        'kkkkkkkkkkkkkkkk',
        'kkkkkkkkkkkkkkkk',
        'kkkkkkkkkkkkkkkk',
      ];
      const body = lid.slice(4).concat(lid.slice(4, 8));
      const out = { mn_piano_t: lid, mn_piano_m: body };
      // The tail curves round; the keyboard end shows the keys.
      const tail = ['...kkkkkkkkkkkkk', '..kaaaaaaaaaaaaa', '.kddmddddddddddd', 'kkkkkkkkkkkkkkkk'];
      const keys = ['kkkkkkkkkkkkkk..', 'aaaaaaaaaaaaaak.', 'dddddddddddddk..', 'kkkkkkkkkkkkkkk.', 'yyyyyyyyyyyykwkw', 'kkkkkkkkkkkkkkkk'];
      out.mn_piano_tl = tail.concat(lid.slice(4));
      out.mn_piano_tr = keys.concat(lid.slice(6));
      out.mn_piano_tlr = tail.slice(0, 2).map((r) => r.slice(0, 14) + '..').concat(['.kddmdddddddddk.', 'kkkkkkkkkkkkkkk.', 'yyyyyyyyyyyykwkw', 'kkkkkkkkkkkkkkkk']).concat(lid.slice(6));
      out.mn_piano_ml = body; out.mn_piano_mr = body; out.mn_piano_mlr = body;
      return out;
    })(),
    {
      // A gilt cornice to stand on: egg-and-dart under the ledge.
      mn_ledge: [
        'kkkkkkkkkkkkkkkk',
        'YYYYYYYYYYYYYYYY',
        'yyyyyyyyyyyyyyyy',
        'oooooooooooooooo',
        'kkkkkkkkkkkkkkkk',
        'kYykYyokkYykYyok',
        '.kok.kk..kok.kk.',
        '..k......k......',
        ...rep('................', 8),
      ],
      mn_column: grid((x, y) => {
        if (x < 4 || x > 11) return null;
        if (x === 4 || x === 11) return 'k';
        if (y % 16 === 0) return null;
        return [null, null, null, null, 'k', 'w', 'm', 'w', 'W', 'w', 'W', 'k'][x] === 'k' ? 'k' : (x === 5 ? 'm' : x === 6 ? 'w' : x === 7 ? 'W' : x === 8 ? 'w' : x === 9 ? 'W' : 'd');
      }).map((r, y) => (y === 0 ? '....kkkkkkkk....' : r)),
      mn_win1: mnWin(0),
      mn_win2: mnWin(1),
      // Silk drapes in folds, rose with a lavender shadow.
      mn_drape: grid((x, y) => {
        const f = x % 5;
        if (f === 0) return 'P';
        if (f === 1) return 'q';
        if (f === 4) return 'L';
        return 'p';
      }),
      // "Period bedrooms swathed in rose and lavender silk."
      mn_bed: [
        'kkkkkkkkkkkkkkkk',
        'qqqqqqqqqqqqqqqq',
        'pqpppqpppqpppqpp',
        'pppppppppppppppp',
        'PpPPpPPpPPpPPpPP',
        'kkkkkkkkkkkkkkkk',
        'lLlLlLlLlLlLlLlL',
        'llllllllllllllll',
        'lLllLllLllLllLll',
        'lLllLllLllLllLll',
        'lLllLllLllLllLll',
        'lLllLllLllLllLll',
        'LLLLLLLLLLLLLLLL',
        'yLyLyLyLyLyLyLyL',
        'kkkkkkkkkkkkkkkk',
        '.k............k.',
      ],
      mn_mirror: [
        '...kkkkkkkkkk...',
        '..kYyyYyyYyyok..',
        '.kYkkkkkkkkkkok.',
        '.kykSSSSSSSskok.',
        '.kykSSSSSSsSkok.',
        '.kykSSSSSsSSkok.',
        '.kykSSSSsSSSkok.',
        '.kykSSSsSSSSkok.',
        '.kykSSsSSSSSkok.',
        '.kykSsSSSSSSkok.',
        '.kykSSSSSSSSkok.',
        '.kykSSSSSSSSkok.',
        '.kokkkkkkkkkkok.',
        '..kooooooooook..',
        '...kkkkkkkkkk...',
        '................',
      ].map((r) => r.replace(/s/g, 's')),
      mn_chand: [
        '.......kk.......',
        '.......yk.......',
        '.......yk.......',
        '.....kkyykk.....',
        '..k..kYyyok..k..',
        '.kYk.kkyykk.kYk.',
        '.kyk...yk...kyk.',
        'kyyykkkyykkkyyyk',
        '.kyyyyyyyyyyyyk.',
        '..kkskkkkkkskk..',
        '...ksk.sk.ksk...',
        '...kwk.wk.kwk...',
        '....s..ks..s....',
        '.......kw.......',
        '........s.......',
        '................',
      ],
    },
  ));

  /* =============================================================== VI */
  /* LAKE SUPERIOR: cold water, gray rock, pines, a white yacht. */
  const lk = {
    k: 0x0f,
    s: 0x37, S: 0x27, z: 0x18, p: 0x10, P: 0x00,     // sand and pebbles
    L: 0x10, g: 0x00, b: 0x08, h: 0x2d,              // rock
    G: 0x2a, n: 0x1a, v: 0x0a,                       // grass and needles
    t: 0x08, T: 0x18,                                 // bark
    c: 0x21, C: 0x11, x: 0x31, d: 0x01,              // water
    w: 0x30, W: 0x10, y: 0x28,                       // hull, gold stripe
    o: 0x17, O: 0x07,                                 // teak
    l: 0x20,                                          // bleached driftwood
  };
  const lkSand = (seed) => grid((x, y) => {
    const n = N(x, y, seed);
    if (n < 0.05) return 'z';
    if (n < 0.08) return 'p';
    if (n < 0.22) return 's';
    if (B(x, y) < 0.2 && y > 10) return 'z';
    return 'S';
  });
  const lkSandT = map(lkSand(231), (c, x, y) => {
    if (y === 0) return N(x, 0, 7) < 0.35 ? null : 's';
    if (y === 1) return 's';
    return c;
  });
  const lkRockM = stone({ face: 'g', hi: 'L', lo: 'b', crack: 'k', seed: 241, n: 6, tex: 'h', texRate: 0.1 });
  const lkRockM2 = stone({ face: 'g', hi: 'L', lo: 'b', crack: 'k', seed: 242, n: 5, tex: 'b', texRate: 0.12 });
  const lkRockT = map(lkRockM, (c, x, y) => {
    if (y === 0) return 'k';
    if (y === 1) return 'L';
    if (y === 2) return c === 'k' ? 'k' : 'L';
    return c;
  });
  // Rock faces for wall-scaling: a lit left edge, a dark right one.
  const lkRockEdges = edges('lk_rock', lkRockT, lkRockM, 'L', 'b');
  const lkTurfT = turf({ hi: 'G', mid: 'n', dk: 'v', soil: lkRockM, seed: 251, depth: 5 });
  def(lk, Object.assign(
    block('lk_sand', lkSandT, lkSand(232), 's', 'z', { lk_sand_m2: lkSand(233) }),
    { lk_rock_t: lkRockT, lk_rock_m: lkRockM, lk_rock_m2: lkRockM2 }, lkRockEdges,
    block('lk_turf', lkTurfT, lkRockM2, 'L', 'b'),
    block('lk_hull', [
      'kkkkkkkkkkkkkkkk',
      'oooooooooooooooo',
      'OOOOOOOOOOOOOOOO',
      'kkkkkkkkkkkkkkkk',
      'wwwwwwwwwwwwwwww',
      'wwwwwwwwwwwwwwww',
      'yyyyyyyyyyyyyyyy',
      'wwwwwwwwwwwwwwww',
      'wwwwwwwwwwwwwwww',
      'WWWWWWWWWWWWWWWW',
      'wwwwwwwwwwwwwwww',
      'wwwwwwwwwwwwwwww',
      'wwwwwwwwwwwwwwww',
      'WWWWWWWWWWWWWWWW',
      'wwwwwwwwwwwwwwww',
      'wwwwwwwwwwwwwwww',
    ], grid((x, y) => (y % 4 === 1 ? 'W' : (x === 15 && y % 8 < 4 ? 'W' : 'w'))), 'w', 'W', {
      // A brass porthole.
      lk_hull_m2: over(grid((x, y) => (y % 4 === 1 ? 'W' : 'w')), [
        '....kkkkkk....',
        '...kyyyyyyk...',
        '..kykkkkkkyk..',
        '..kykccxckyk..',
        '..kykcccckyk..',
        '..kykCcccCkyk..'.slice(0, 14),
        '..kykCCCCkyk..',
        '..kykkkkkkyk..',
        '...kyyyyyyk...',
        '....kkkkkk....',
      ], 1, 3),
    }),
    block('lk_cabin', [
      'kkkkkkkkkkkkkkkk',
      'wwwwwwwwwwwwwwww',
      'WWWWWWWWWWWWWWWW',
      'kkkkkkkkkkkkkkkk',
      ...grid((x, y) => (x % 4 === 3 ? 'O' : (x % 4 === 0 ? 'o' : (N(x, y, 3) < 0.1 ? 'O' : 'o')))).slice(4),
    ], grid((x, y) => (x % 4 === 3 ? 'O' : (x % 4 === 0 ? 'o' : (N(x, y, 4) < 0.1 ? 'O' : 'o')))), 'o', 'O'),
    {
      lk_pine: [
        '.....ktTtk......',
        '.....kTttk......',
        '.....ktTtk......',
        '.....ktTkk......',
        '.....kTttk......',
        '.....kttTk......',
        '.....kTttk......',
        '.....ktTtk......',
        '.....kkTtk......',
        '.....kTttk......',
        '.....ktTtk......',
        '.....kTtTk......',
        '.....ktttk......',
        '.....kTtkk......',
        '....kktTtkk.....',
        '...kttTttTtk....',
      ],
      // Pine boughs: tiers of needles drooping to the sides.
      lk_crown: [
        '.......kv.......',
        '......kvnk......',
        '.....kvnGnk.....',
        '....kvnnnnvk....',
        '...kvnGnnnnvk...',
        '..kvvnnvnvnnvk..',
        '.kkkvvkTtkvvkkk.',
        '....kvnnnnvk....',
        '...kvnGnnnnnk...',
        '..kvnnnnvnnnvk..',
        '.kvnGnnvnnnnnvk.',
        'kvvnnvnnnvnnvvvk',
        'kkkvvvkTtkvvvkkk',
        '......ktTk......',
        '......kTtk......',
        '......ktTk......',
      ],
      lk_log: [
        'kkkkkkkkkkkkkkkk',
        'llllllllllllllll',
        'LLlLLLLLLlLLLLLL',
        'LLLLkkLLLLLLLkkL',
        'hhhhhhhhhLhhhhhh',
        'kkkkkkkkkkkkkkkk',
        ...rep('................', 10),
      ],
      lk_water1: water({ base: 'c', dash: 'C', glint: 'x', frame: 0, seed: 261, surf: 'c', crest: 'x', open: true, bandRows: 4 }),
      lk_water2: water({ base: 'c', dash: 'C', glint: 'x', frame: 1, seed: 261, surf: 'c', crest: 'x', open: true, bandRows: 4 }),
      lk_deep1: water({ base: 'C', dash: 'c', glint: 'x', deep: 'd', frame: 0, seed: 271 }),
      lk_deep2: water({ base: 'C', dash: 'c', glint: 'x', deep: 'd', frame: 1, seed: 271 }),
      lk_rail: [
        'kkkkkkkkkkkkkkkk',
        'oooooooooooooooo',
        'OOOOOOOOOOOOOOOO',
        'kkkkkkkkkkkkkkkk',
        '.kwk....kwk.....',
        '.kwk....kwk.....',
        'kkkkkkkkkkkkkkkk',
        'WWWWWWWWWWWWWWWW',
        'kkkkkkkkkkkkkkkk',
        '.kwk....kwk.....',
        '.kwk....kwk.....',
        '.kwk....kwk.....',
        ...rep('................', 4),
      ],
      lk_dock: [
        'kkkkkkkkkkkkkkkk',
        'TTTTkTTTTkTTTTkT',
        'tTTTktTTTktTTTkt',
        'ttttkttttkttttkt',
        'kkkkkkkkkkkkkkkk',
        '.ktTk......ktTk.',
        '.ktTk......ktTk.',
        '.ktTk......ktTk.',
        '.ktTk......ktTk.',
        '.kttk......kttk.',
        '.ktTk......ktTk.',
        '.ktTk......ktTk.',
        '.ktTk......ktTk.',
        '.ktTk......ktTk.',
        '.kttk......kttk.',
        '.ktTk......ktTk.',
      ],
    },
  ));

  /* ============================================================== VII */
  /* THE PLAZA: red carpet, cream and gilt, a buff brick light well. */
  const pl = {
    k: 0x0f, r: 0x06, R: 0x16, y: 0x28, Y: 0x38, o: 0x18,
    c: 0x37, C: 0x27, w: 0x30, W: 0x10, h: 0x37,
    b: 0x27, m: 0x18, s: 0x08,               // buff brick, mortar, soot
    t: 0x07, T: 0x17,                         // wood
    g: 0x0a, G: 0x1a, n: 0x2a,                // the palm
  };
  const plFloorM = grid((x, y) => {
    // Plaster ceiling of the floor below, with a gilt beam.
    if (y === 15) return 'C';
    if (y === 14) return 'y';
    if (y === 13) return 'o';
    if (N(x, y, 281) < 0.05) return 'C';
    return 'c';
  });
  const plFloorT = [
    'kkkkkkkkkkkkkkkk',
    'RRRRRRRRRRRRRRRR',
    'rrrrrrrrrrrrrrrr',
    'yryyryyryyryyryy',
    'rrrrrrrrrrrrrrrr',
    'kkkkkkkkkkkkkkkk',
    'tttttttttttttttt',
    'kkkkkkkkkkkkkkkk',
    ...plFloorM.slice(8),
  ];
  // Wallpaper in cream stripes with a gilt dado every so often.
  const plWallM = grid((x, y) => {
    const s = x % 8;
    if (s === 0) return 'y';
    if (s === 1) return 'C';
    if (s === 4) return 'C';
    return 'c';
  });
  const plWallT = [
    'kkkkkkkkkkkkkkkk',
    'YYYYYYYYYYYYYYYY',
    'yyyyyyyyyyyyyyyy',
    'oyooyooyooyooyoo',
    'kkkkkkkkkkkkkkkk',
    ...plWallM.slice(5),
  ];
  const plWallM2 = over(plWallM, [
    '..kkkkkkkkkkk..',
    '..kYyyyyyyyok..',
    '..kykkkkkkkok..',
    '..kykwwWnGkok..',
    '..kykwWnGgkok..',
    '..kykWnGgGkok..',
    '..kykkkkkkkok..',
    '..kooooooooak..'.replace('a', 'o'),
    '..kkkkkkkkkkk..',
  ], 0, 4);
  const plBrickM = bricks({ face: 'b', hi: 'h', lo: 'm', mortar: 'm', speck: 's', seed: 291, rate: 0.06 });
  const plBrickM2 = map(bricks({ face: 'b', hi: 'h', lo: 'm', mortar: 'm', speck: 's', seed: 292, rate: 0.05 }), (c, x, y) => (Math.abs(x - 10 - Math.round(Math.sin(y / 3))) < 1 && B(x, y) < 0.7 ? 's' : c));
  const plWin = (f) => grid((x, y) => {
    if (x === 0 || x === 15 || y === 0 || y === 15) return 'C';
    if (x === 1 || x === 14 || y === 1 || y === 14) return 'k';
    if (x === 7 || x === 8 || y === 7 || y === 8) return x === 8 || y === 8 ? 'y' : 'Y';
    // Hot white sky, a shimmer moving up through it.
    const sh = (y + f * 3 + Math.floor(x / 3)) % 6;
    if (sh === 0) return 'Y';
    return y > 10 && B(x, y) < 0.4 ? 'h' : 'w';
  });
  def(pl, Object.assign(
    block('pl_floor', plFloorT, plFloorM, 'R', 'k'),
    block('pl_wall', plWallT, plWallM, 'Y', 'o', { pl_wall_m2: plWallM2 }),
    block('pl_brick', [
      'kkkkkkkkkkkkkkkk',
      'hhhhhhhhhhhhhhhh',
      'bbbbbbbbbbbbbbbb',
      'mmmmmmmmmmmmmmmm',
      ...plBrickM.slice(4),
    ], plBrickM, 'h', 's', { pl_brick_m2: plBrickM2 }),
    {
      pl_ledge: [
        'kkkkkkkkkkkkkkkk',
        'cccccccccccccccc',
        'CCCCCCCCCCCCCCCC',
        'yyyyyyyyyyyyyyyy',
        'kkkkkkkkkkkkkkkk',
        'kCck.kCck.kCck.k',
        '.kk...kk...kk...',
        ...rep('................', 9),
      ],
      pl_win1: plWin(0),
      pl_win2: plWin(1),
      pl_table: [
        'kkkkkkkkkkkkkkkk',
        'TTTTTTTTTTTTTTTT',
        'tttttttttttttttt',
        'kkkkkkkkkkkkkkkk',
        '.ktk........ktk.',
        '.kyk........kyk.',
        '.ktk........ktk.',
        '.ktk........ktk.',
        '.ktk........ktk.',
        '.ktk........ktk.',
        '.ktk........ktk.',
        '.ktk........ktk.',
        '.ktk........ktk.',
        '.kyk........kyk.',
        'kktkk......kktkk',
        'kkkkk......kkkkk',
      ],
      pl_palm: [
        '.....k...k......',
        '...kkGk.kGkk....',
        '..kGnGk.kGnGk...',
        '.kGnk.kkk.kGnk..',
        '.kGk.kGnGk..kGk.',
        'kGk.kGnkGnk..kGk',
        'kk.kGk.k.kGk..kk',
        '...kk..kgk.kk...',
        '......kGgk......',
        '......kgGk......',
        '......kGgk......',
        '.....kkkkkk.....',
        '....kYyyyyyk....',
        '....kyyoyyok....',
        '.....kyyyok.....',
        '.....kkkkkk.....',
      ],
    },
  ));

  /* ============================================================= VIII */
  /* THE ARGONNE, at night: mud, sandbags, timber, wire. */
  const ar = {
    k: 0x0f, m: 0x08, M: 0x18, c: 0x0c,
    b: 0x18, B: 0x28, n: 0x08,               // sandbags
    p: 0x08, P: 0x18, t: 0x07,               // timber
    d: 0x00, l: 0x10,                         // iron, wire
    w: 0x18, W: 0x28,                         // muddy water
  };
  const arMud = (seed) => grid((x, y) => {
    const n = N(x, y, seed);
    if (n < 0.1) return 'k';
    if (n < 0.18) return 'M';
    if (n < 0.22) return 'c';
    if (B(x, y) < 0.15) return 'k';
    return 'm';
  });
  const arMudT = map(arMud(301), (c, x, y) => {
    // Churned, rutted, puddled.
    const top = Math.round(1.5 + Math.sin(x * 1.3) * 1.1 + Math.sin(x * 0.4) * 0.6);
    if (y < top) return null;
    if (y === top) return 'k';
    if (y === top + 1) return x % 7 === 3 ? 'c' : 'M';
    if (y === top + 2) return N(x, y, 2) < 0.5 ? 'M' : 'm';
    return c;
  });
  const arMudM2 = over(arMud(302), [
    '................',
    '................',
    '.....kkkkk......',
    '....kldddlk.....',
    '...kldddddlk....',
    '..kkkkkkkkkkk...',
  ], 0, 6);
  // Sandbags: rounded bags in a stretcher pattern.
  const arBagsM = grid((x, y) => {
    const course = Math.floor(y / 6), r = y % 6;
    const p = (x + (course % 2) * 5) % 10;
    if (r === 5) return 'k';
    if (p === 9) return 'k';
    if (p === 0 && (r === 0 || r === 4)) return 'k';
    if (p === 8 && (r === 0 || r === 4)) return 'k';
    if (r === 0) return 'B';
    if (r >= 3) return 'n';
    return N(x, y, 3) < 0.12 ? 'n' : 'b';
  });
  const arBagsT = map(arBagsM, (c, x, y) => {
    const p = x % 10;
    if (y === 0) return p === 0 || p === 9 ? null : 'k';
    if (y === 1 && (p === 0 || p === 9)) return 'k';
    return c;
  });
  // A revetment: upright planks, a stake, wire lashing.
  const arWallM = grid((x, y) => {
    const p = x % 4;
    if (p === 3) return 'k';
    if (x >= 6 && x <= 8 && y % 8 === 3) return 'l';
    if (p === 0) return 'P';
    return N(x, y, 311) < 0.15 ? 't' : 'p';
  });
  const arWallT = [
    'kkk.kkk.kkk.kkk.',
    'Ppkk' + 'Ppk' + 'kPpk' + 'kPpk' + 'k',
    ...arWallM.slice(2),
  ].map((r) => (r.length > 16 ? r.slice(0, 16) : r.padEnd(16, '.')));
  const arWater = (f) => water({ base: 'w', dash: 'W', glint: 'W', frame: f, seed: 321, surf: 'w', crest: 'W', open: true, bandRows: 4 });
  def(ar, Object.assign(
    block('ar_mud', arMudT, arMud(303), 'M', 'k', { ar_mud_m2: arMudM2 }),
    block('ar_bags', arBagsT, arBagsM, 'B', 'n'),
    block('ar_wall', arWallT, arWallM, 'P', 'k', {}, { round: false }),
    {
      ar_duck: [
        'kkkkkkkkkkkkkkkk',
        'PkPPkPPkPPkPPkPP',
        'pkppkppkppkppkpp',
        'kkkkkkkkkkkkkkkk',
        'PPPPPPPPPPPPPPPP',
        'kkkkkkkkkkkkkkkk',
        '..kpk......kpk..',
        '..kkk......kkk..',
        ...rep('................', 8),
      ],
      // Barbed wire on corkscrew pickets: loops and barbs.
      ar_wire: [
        '................',
        '..k.....l.k.....',
        '.kdl...lkl.l....',
        '.kd.l.l..kl.l...',
        'lkdlklk...l.kl.l',
        '.kd..l.l.lkl..l.',
        '.kdkl...lkd.l.l.',
        '.kd.l..l.kd..lk.',
        'lkdlklkl.kdlkl.l',
        '.kd....l.kd...l.',
        '.kdl..l.lkdl.l..',
        '.kd.ll...kd.lk..',
        'lkdkl.lk.kdl..l.',
        '.kd....l.kd...l.',
        '.kd......kd.....',
        'mkdm.mm.mkdmm.mm',
      ],
      ar_wire2: [
        '................',
        '.....l.k........',
        '....lkl.l....k..',
        '...l.k.l.l..kd..',
        '.lkl.kd..lklkdl.',
        'l..lkkd.l...kd.l',
        '.l.l.kdkl..lkd..',
        '..lk.kd..l.lkdl.',
        '.l..lkdlkl.lkd.l',
        'l...lkd...lkkd..',
        '.l.l.kdl.l..kdl.',
        '..k..kd.ll.lkd.l',
        '.l.lkkdl.lk.kd..',
        'l....kd...l.kd.l',
        '.....kd.....kd..',
        'm.mm.kdmm.m.kdmm',
      ],
      // A tree shelled to a stump of splinters.
      ar_stump: [
        '................',
        '................',
        '.....k..........',
        '....kPk...k.....',
        '....kpk..kPk....',
        '....kpPk.kpk....',
        '.....kpPkkpk....',
        '.....kppPppk....',
        '.....ktpPppk....',
        '.....kptpppk....',
        '.....kppptpk....',
        '....ktpptpppk...',
        '....kppppptpk...',
        '...ktpptpppppk..',
        '..kkmmmmmmmmkkk.',
        '.kmMmmkmmMmmmMmk',
      ],
      ar_post: [
        '................',
        '.......k........',
        '.......kd.......',
        'l.l.l.lkdl.l.l.l',
        '.l.l.l.kdl.l.l.l',
        '.......kd.......',
        '.......dk.......',
        '.......kd.......',
        '.......kd.......',
        '......dk........',
        '.......kd.......',
        '.......kd.......',
        '.......dk.......',
        '.......kd.......',
        '.......kd.......',
        '.....mmkdmm.....',
      ],
      ar_water1: arWater(0),
      ar_water2: arWater(1),
    },
  ));

  /* =============================================================== IX */
  /* THE SOUND AT NIGHT: dark water, a dock, wet rocks, the blue lawn. */
  const by = {
    k: 0x0f, b: 0x02, c: 0x0c, g: 0x11, G: 0x21, x: 0x31,
    t: 0x08, T: 0x18,                    // dock wood in the dark
    r: 0x0c, R: 0x1c, d: 0x00, D: 0x10,  // wet rock
    s: 0x00, S: 0x0c, w: 0x10,           // sand by moonlight
    l: 0x1c, n: 0x0c, v: 0x02,           // the blue lawn
    e: 0x0f, E: 0x0c,
    h: 0x0a, H: 0x1a,                    // reeds
  };
  const byWater = (f) => grid((x, y) => {
    const lane = y % 4;
    const off = Math.floor(N(0, y, 331) * 16);
    const run = (x + f * (3 + (y % 2) * 2) + off) % 16;
    if (lane === 1 && run < 2 && y < 9) return 'x';
    if (lane === 1 && run < 5) return y < 6 ? 'G' : 'g';
    if (lane === 3 && run > 9 && run < 12) return 'g';
    if (y > 8 && B(x, y) < (y - 8) / 9) return 'c';
    return 'b';
  });
  const byRock = (seed) => stone({ face: 'r', hi: 'R', lo: 'k', crack: 'k', seed, n: 5, tex: 'd', texRate: 0.06 });
  const byRockM = byRock(341);
  const byRockT = map(byRockM, (c, x, y) => {
    const top = Math.round(1 + Math.sin(x * 0.7) * 1);
    if (y < top) return null;
    if (y === top) return 'k';
    if (y === top + 1) return 'D';
    if (y === top + 2) return c === 'k' ? 'k' : 'R';
    return c;
  });
  const bySand = (seed) => grid((x, y) => {
    const n = N(x, y, seed);
    if (n < 0.06) return 'w';
    if (n < 0.2) return 'S';
    if (B(x, y) < 0.3 && y > 8) return 'S';
    return 's';
  });
  const byLawnT = turf({ hi: 'l', mid: 'n', dk: 'v', soil: soil({ base: 'e', speck: 'E', pore: 'v', seed: 351, rate: 0.07, poreRate: 0.02 }), seed: 352 });
  def(by, Object.assign(
    block('by_rock', byRockT, byRockM, 'R', 'k', { by_rock_m2: byRock(342) }),
    block('by_sand', map(bySand(361), (c, x, y) => (y === 0 ? (N(x, 0, 2) < 0.3 ? null : 'w') : y === 1 ? 's' : c)), bySand(362), 'w', 'S'),
    block('by_lawn', byLawnT, soil({ base: 'e', speck: 'E', pore: 'v', seed: 353, rate: 0.07, poreRate: 0.02 }), 'E', 'k'),
    {
      // A piling: a dark post with a lit left side, a cap on the top one.
      by_piling_t: [
        '................',
        '.....kkkkkk.....',
        '....kTTTTTtk....',
        '....ktTTTttk....',
        '.....kkkkkk.....',
        '.....kTttbk.....',
        '.....kTttbk.....',
        '.....kTttbk.....',
        '....kkkkkkkk....',
        '....kTtttttk....',
        '.....kTttbk.....',
        '.....kTttbk.....',
        '.....kTtbbk.....',
        '.....kTttbk.....',
        '.....kTttbk.....',
        '.....kTttbk.....',
      ],
      by_piling_m: [
        '.....kTttbk.....',
        '.....kTttbk.....',
        '.....kTtbbk.....',
        '.....kTttbk.....',
        '.....kRrRrk.....',
        '.....krRrRk.....',
        '.....kTttbk.....',
        '.....kTttbk.....',
        '.....kTtbbk.....',
        '.....kTttbk.....',
        '.....kTttbk.....',
        '.....kRrRrk.....',
        '.....kTttbk.....',
        '.....kTtbbk.....',
        '.....kTttbk.....',
        '.....kTttbk.....',
      ],
      by_water1: byWater(0),
      by_water2: byWater(1),
      by_water3: byWater(2),
      by_dock: [
        'kkkkkkkkkkkkkkkk',
        'TTTTkTTTTkTTTTkT',
        'tTTTktTTTktTTTkt',
        'ttttkttttkttttkt',
        'kkkkkkkkkkkkkkkk',
        '.ktTk......ktTk.',
        '.ktTk......ktTk.',
        '.kttk......kttk.',
        '.ktTk......ktTk.',
        '.ktTk......ktTk.',
        '.kttk......kttk.',
        '.ktTk......ktTk.',
        '.ktTk......ktTk.',
        '.kttk......kttk.',
        '.ktTk......ktTk.',
        '.ktTk......ktTk.',
      ],
      by_reeds: [
        '................',
        '..t.......t.....',
        '.kTk.....kTk....',
        '.kTk..t..kTk..t.',
        '.ktk.kTk.ktk.kTk',
        '..h..kTk..h..ktk',
        '..h..ktk..h...h.',
        '.h.h..h..h.h..h.',
        '.h.h..h..h..h.h.',
        'h..Hh.h.Hh..h.h.',
        'h..h.hh.h...hh..',
        '.h.h.h.hh..h.h.h',
        '.hHh.h.h.h.h.hH.',
        'h.h.hH.h.hhh.h.h',
        '.hh.h.hhh.h.hh.h',
        'hhhhhhhhhhhhhhhh',
      ],
    },
  ));
})();
