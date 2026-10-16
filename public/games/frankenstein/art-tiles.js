'use strict';
/*
 * FRANKEN.EXE art: tiles, 16x16. Terrain names ending _t are the exposed top
 * row, _m the body; l/r suffixes are left and right edges. Helpers below make
 * edge variants by painting over a base tile's outer columns.
 */
(() => {
  const T = (FK.TA = {});   // tile row data by name, for deriving variants

  function def(legend, tiles) {
    Object.assign(T, tiles);
    FK.tiles(legend, tiles);
  }
  /* Replace leading/trailing columns of every row with a pattern per row. */
  const left = (rows, cols) => rows.map((r, i) => { const c = typeof cols === 'string' ? cols : cols[i % cols.length]; return c + r.slice(c.length); });
  const right = (rows, cols) => rows.map((r, i) => { const c = typeof cols === 'string' ? cols : cols[i % cols.length]; return r.slice(0, 16 - c.length) + c; });
  const mirror = (rows) => rows.map((r) => r.split('').reverse().join(''));
  const rot = (row, n) => row.slice(-n) + row.slice(0, -n);
  const rep = (s, n) => Array.from({ length: n }, () => s);
  FK.tileHelpers = { left, right, mirror, rot, rep };

  /* =============================================================== TOWN */
  // Ingolstadt at dusk: beaver-tail roof tiles, half-timbering, bricks, cobbles.
  const town = {
    k: 0x0f, r: 0x07, R: 0x17, o: 0x27, O: 0x37,
    p: 0x10, q: 0x00, t: 0x0f, T: 0x08, P: 0x30,
    w: 0x0c, W: 0x1c, l: 0x28, L: 0x38,
    b: 0x06, B: 0x16, m: 0x2d,
    s: 0x00, S: 0x10, d: 0x2d, g: 0x0c,
  };
  const A = ['oRRr', 'RRRr', 'RRrr', 'krrk'].map((x) => x.repeat(4));
  const B = A.map((x) => rot(x, 2));
  const roof_m = [...A, ...B, ...A, ...B];
  const roof_t = [
    'kkkkkkkkkkkkkkkk',
    'OOoOOOoOOOoOOOoO',
    'oRRRoRRRoRRRoRRR',
    'rrkrrrkrrrkrrrkr',
    ...B, ...A, ...B,
  ];
  const roofEdgeL = ['kk', 'kO', 'ko', 'kr', 'kR', 'kR', 'kr', 'kk'];
  const brick = [
    'BBBBBBBmBBBBBBBm',
    'bBBBBBBmbBBBBBBm',
    'bbbbbbbmbbbbbbbm',
    'mmmmmmmmmmmmmmmm',
    'BBBmBBBBBBBmBBBB',
    'bBBmbBBBBBBmbBBB',
    'bbbmbbbbbbbmbbbb',
    'mmmmmmmmmmmmmmmm',
  ];
  const chimney_m = left(right([...brick, ...brick], 'k'), 'k');
  const chimney_t = [
    '..kkkkkkkkkkkk..',
    '.kOooooooooooRk.',
    '.korrrrrrrrrrrk.',
    '..kkkkkkkkkkkk..',
    '...koooooooRk...',
    '...korRRRRRrk...',
    '...krrrrrrrrk...',
    'kkkkkkkkkkkkkkkk',
    'kBBBBBmBBBBBBBmk',
    'kbbbbbmbbbbbbbmk',
    'kmmmmmmmmmmmmmmk',
    'kBBmBBBBBBBmBBBk',
    'kbbmbbbbbbbmbbbk',
    'kmmmmmmmmmmmmmmk',
    'kBBBBBmBBBBBBBmk',
    'kbbbbbmbbbbbbbmk',
  ];
  // Half-timbering: a beam along the top, a post at the left, lime plaster.
  const plaster = (seed) => {
    const out = [];
    for (let y = 0; y < 14; y++) {
      let row = 'Tt';
      for (let x = 2; x < 16; x++) {
        const v = ((x * 7 + y * 13 + seed * 5) * 2654435761 >>> 0) % 29;
        row += y === 0 ? 'q' : v === 0 ? 'q' : v === 1 && y > 2 ? 'P' : 'p';
      }
      out.push(row);
    }
    return out;
  };
  const beam = ['TTTTTTTTTTTTTTTT', 'tttttttttttttttt'];
  const wall_m = [...beam, ...plaster(1)];
  const wall_mx = [...beam, ...plaster(2).map((r, y) => {
    // A diagonal brace from bottom-left to top-right.
    const a = r.split('');
    const x = 15 - Math.floor(y * 13 / 13);
    if (x >= 2 && x < 16) { a[x] = 'T'; if (x + 1 < 16) a[x + 1] = 't'; }
    return a.join('');
  })];
  // A lit window: leaded panes, warm light, a sill.
  const wall_mw = [...beam,
    'Ttqqkkkkkkkkkqqq',
    'TtppkLLlkLLLkppp',
    'TtppkLlllklLkppp',
    'TtppklllklllkPpp',
    'Ttppkkkkkkkkkppp',
    'TtppkLlllkLlkppp',
    'TtppklllklllkppP',
    'Ttppkllllkllkppp',
    'Ttppkkkkkkkkkppp',
    'TtpTTTTTTTTTTTpp',
    'Ttptttttttttttpp',
    'Ttpppppppppppppp',
    'Ttppppppppppppqp',
    'Ttpppppppppppppp',
  ];
  // A dark window with its shutters open.
  const wall_md = [...beam,
    'Ttqqkkkkkkkkkqqq',
    'TtpkkwwwkwWwkkpp',
    'TtpkkwwwkWwwkkpp',
    'TtpkkwwWkwwwkkpp',
    'Ttpkkkkkkkkkkkpp',
    'TtpkkwwwkwwWkkpp',
    'TtpkkwWwkwWwkkpp',
    'TtpkkWwwkWwwkkpp',
    'Ttpkkkkkkkkkkkpp',
    'TtpTTTTTTTTTTTpp',
    'Ttptttttttttttpp',
    'Ttpppppppppppppp',
    'TtpppPpppppppppp',
    'Ttpppppppppppppp',
  ];
  const cobble_t = [
    'kkkkkkkkkkkkkkkk',
    'SSdSSSSkSSSSdSSS',
    'SsssssdkSsssssdk',
    'dsssssdkdsssssdk',
    'kddddddkkddddddk',
    'kkkkkkkkkkkkkkkk',
    'SSSkSSSSSSdkSSSS',
    'sssdkSssssdkSsss',
    'sssdkdsssssdkdss',
    'dddkkkdddddkkkdd',
    'kkkkkkkkkkkkkkkk',
    'SSSSSdkSSSSSSdkS',
    'ssssssdkSsssssdk',
    'ssssssdkdssssddk',
    'dddddddkkddddddk',
    'kkkkkkkkkkkkkkkk',
  ];
  const cobble_m = [
    'SSSkSSSSSSdkSSSS',
    'sssdkSssssdkSsss',
    'sssdkdsssssdkdss',
    'dddkkkdddddkkkdd',
    'kkkkkkkkkkkkkkkk',
    'SSSSSdkSSSSSSdkS',
    'ssssssdkSsssssdk',
    'ssssssdkdssssddk',
    'dddddddkkddddddk',
    'kkkkkkkkkkkkkkkk',
    'SSdSSSSkSSSSdSSS',
    'SsssssdkSsssssdk',
    'dsssssdkdsssssdk',
    'kddddddkkddddddk',
    'kkkkkkkkkkkkkkkk',
    'kkkkkkkkkkkkkkkk',
  ].map((r) => r.replace(/S/g, 'd').replace(/s/g, 'g'));
  // Scaffold boards and washing lines: stand on them from above.
  const beam_t = [
    'kkkkkkkkkkkkkkkk',
    'TTTTTTTTTTTTTTTT',
    'TTtTTTTTTTTtTTTT',
    'tttttttttttttttt',
    'kkkkkkkkkkkkkkkk',
    '..kt........kt..',
    '..kt........kt..',
    '..kk........kk..',
    ...rep('................', 8),
  ];
  // A window ledge with a flower box.
  const sill_t = [
    '................',
    '..k...k..k...k..',
    '.kOk.kRk.kOk.kRk',
    '..k...k..k...k..',
    'kkkkkkkkkkkkkkkk',
    'kTTTTTTTTTTTTTTk',
    'kttttttttttttttk',
    'kkkkkkkkkkkkkkkk',
    ...rep('................', 8),
  ];
  def(town, {
    town_roof_t: roof_t,
    town_roof_tl: left(roof_t, roofEdgeL),
    town_roof_tr: right(roof_t, ['kk', 'Ok', 'ok', 'rk', 'Rk', 'Rk', 'rk', 'kk']),
    town_roof_m: roof_m,
    town_roof_ml: left(roof_m, ['kr', 'kR', 'kR', 'kk']),
    town_roof_mr: right(roof_m, ['rk', 'Rk', 'rk', 'kk']),
    town_chim_t: chimney_t,
    town_chim_m: chimney_m,
    town_wall_m: wall_m,
    town_wall_mx: wall_mx,
    town_wall_mw: wall_mw,
    town_wall_md: wall_md,
    town_wall_t: [ 'kkkkkkkkkkkkkkkk', 'TTTTTTTTTTTTTTTT', ...wall_m.slice(1, 15) ],
    town_cob_t: cobble_t,
    town_cob_m: cobble_m,
    town_beam_t: beam_t,
    town_sill_t: sill_t,
    town_wall_ml: left(wall_m, 'k'),
    town_wall_mr: right(wall_m, 'k'),
    town_wall_tl: left([ 'kkkkkkkkkkkkkkkk', 'TTTTTTTTTTTTTTTT', ...wall_m.slice(1, 15) ], 'k'),
    town_wall_tr: right([ 'kkkkkkkkkkkkkkkk', 'TTTTTTTTTTTTTTTT', ...wall_m.slice(1, 15) ], 'k'),
    town_ladder: [
      '.ktk.......ktk..',
      '.kTkkkkkkkkkTk..',
      '.kTTTTTTTTTTTk..',
      '.ktkkkkkkkkktk..',
      '.ktk.......ktk..',
      '.kTk.......kTk..',
      '.ktk.......ktk..',
      '.ktk.......ktk..',
      '.ktk.......ktk..',
      '.kTkkkkkkkkkTk..',
      '.kTTTTTTTTTTTk..',
      '.ktkkkkkkkkktk..',
      '.ktk.......ktk..',
      '.kTk.......kTk..',
      '.ktk.......ktk..',
      '.ktk.......ktk..',
    ],
    // The canal: the Danube's black water between the houses.
    town_canal1: [
      '................',
      '................',
      'WWW.....WWWW....',
      'gWWWg.gWWggWWg.g',
      'gggggggggggggggg',
      'gggWWgggggggggWW',
      'ggggggggWWWggggg',
      'gggggggggggggggg',
      'kgggggkgggggkggg',
      'gggkgggggkgggggk',
      'kgkgkgkgkgkgkgkg',
      'gkgkgkgkgkgkgkgk',
      'kkgkkkgkkkgkkkgk',
      'kkkkkkkkkkkkkkkk',
      'kkkkkkkkkkkkkkkk',
      'kkkkkkkkkkkkkkkk',
    ],
    town_canal2: [
      '................',
      '................',
      '.....WWWW....WWW',
      'Wg.gWWggWWgg.gWW',
      'gggggggggggggggg',
      'gggggggWWggggggg',
      'WWggggggggggWWWg',
      'gggggggggggggggg',
      'ggkgggggkgggggkg',
      'gggggkgggggkgggg',
      'gkgkgkgkgkgkgkgk',
      'kgkgkgkgkgkgkgkg',
      'kgkkkgkkkgkkkgkk',
      'kkkkkkkkkkkkkkkk',
      'kkkkkkkkkkkkkkkk',
      'kkkkkkkkkkkkkkkk',
    ],
  });

  /* ============================================================ LIBRARY */
  const lib = {
    k: 0x0f, b: 0x08, B: 0x18, o: 0x07, O: 0x17, y: 0x28, Y: 0x38,
    r: 0x16, R: 0x06, u: 0x12, U: 0x02, e: 0x1a, E: 0x0a, v: 0x14, V: 0x04, w: 0x37, W: 0x30, s: 0x00, S: 0x10, d: 0x2d,
  };
  // A row of book spines; different on each shelf so a wall doesn't repeat.
  const spines = (a) => a;
  const case_t = [
    'kkkkkkkkkkkkkkkk',
    'BBBBBBBBBBBBBBBB',
    'bBbbbbbbbbbbbbbb',
    'kkkkkkkkkkkkkkkk',
    'bkrrkuukyykeekkb',
    'bkrRkuUkyYkeEkkb',
    'bkrRkuUkyYkeEkvb',
    'bkrRkuUkyYkeEkVb',
    'bkrRkuUkyYkeEkVb',
    'bkkkkkkkkkkkkkkb',
    'kkkkkkkkkkkkkkkk',
    'BBBBBBBBBBBBBBBB',
    'bkeekyykkrrkuukb',
    'bkeEkyYkkrRkuUkb',
    'bkeEkyYkvrRkuUkb',
    'bkeEkyYkVrRkuUkb',
  ];
  const case_m = [
    'bkeEkyYkVrRkuUkb',
    'bkkkkkkkkkkkkkkb',
    'kkkkkkkkkkkkkkkk',
    'BBBBBBBBBBBBBBBB',
    'bkuukkvvkrrkyykb',
    'bkuUkkvVkrRkyYkb',
    'bkuUkevVkrRkyYkb',
    'bkuUkeEVkrRkyYkb',
    'bkuUkeEVkrRkyYkb',
    'bkkkkkkkkkkkkkkb',
    'kkkkkkkkkkkkkkkk',
    'BBBBBBBBBBBBBBBB',
    'bkyykrrkkuukeekb',
    'bkyYkrRkkuUkeEkb',
    'bkyYkrRkkuUkeEkb',
    'bkyYkrRkkuUkeEkb',
  ];
  const case_m2 = [
    'bkyYkrRkkuUkeEkb',
    'bkkkkkkkkkkkkkkb',
    'kkkkkkkkkkkkkkkk',
    'BBBBBBBBBBBBBBBB',
    'bkrrkkkwwwwwkkkb',
    'bkrRkkwWwwwwwkkb',
    'bkrRkkwwwwwwwkkb',
    'bkrRkksssssssskb',
    'bkrRkkksssssskkb',
    'bkkkkkkkkkkkkkkb',
    'kkkkkkkkkkkkkkkk',
    'BBBBBBBBBBBBBBBB',
    'bkuukeekkyykrrkb',
    'bkuUkeEkkyYkrRkb',
    'bkuUkeEkvyYkrRkb',
    'bkuUkeEkVyYkrRkb',
  ];
  const floor_t = [
    'kkkkkkkkkkkkkkkk',
    'OOOOOOOkOOOOOOOO',
    'oOoooookoooOoooo',
    'oooooookoooooooo',
    'kkkkkkkkkkkkkkkk',
    'bbbbbbbbbbbbbbbb',
    'BbbbbbbbbbbbBbbb',
    'kkkkkkkkkkkkkkkk',
    'sSSSSSdksSSSSSdk',
    'sddddddksddddddk',
    'kkkkkkkkkkkkkkkk',
    'SSSdksSSSSSdksSS',
    'dddkksddddddkkdd',
    'kkkkkkkkkkkkkkkk',
    'sSSSSSdksSSSSSdk',
    'sddddddksddddddk',
  ];
  const floor_m = [
    'kkkkkkkkkkkkkkkk',
    'SSSdksSSSSSdksSS',
    'dddkksddddddkkdd',
    'kkkkkkkkkkkkkkkk',
    'sSSSSSdksSSSSSdk',
    'sddddddksddddddk',
    'kkkkkkkkkkkkkkkk',
    'SSSdksSSSSSdksSS',
    'dddkksddddddkkdd',
    'kkkkkkkkkkkkkkkk',
    'sSSSSSdksSSSSSdk',
    'sddddddksddddddk',
    'kkkkkkkkkkkkkkkk',
    'SSSdksSSSSSdksSS',
    'dddkksddddddkkdd',
    'kkkkkkkkkkkkkkkk',
  ].map((r) => r.replace(/S/g, 'd').replace(/s/g, 'k').replace(/d/g, 's'));
  const ladder = [
    '.kBk.......kBk..',
    '.kbkkkkkkkkkbk..',
    '.kbBBBBBBBBBbk..',
    '.kbkkkkkkkkkbk..',
    '.kBk.......kBk..',
    '.kbk.......kbk..',
    '.kbk.......kbk..',
    '.kbk.......kbk..',
    '.kBk.......kBk..',
    '.kbkkkkkkkkkbk..',
    '.kbBBBBBBBBBbk..',
    '.kbkkkkkkkkkbk..',
    '.kBk.......kBk..',
    '.kbk.......kbk..',
    '.kbk.......kbk..',
    '.kbk.......kbk..',
  ];
  const shelf_t = [
    'kkkkkkkkkkkkkkkk',
    'OOOOOOOOOOOOOOOO',
    'oooooooooooooooo',
    'kkkkkkkkkkkkkkkk',
    '.kbk........kbk.',
    '..kbk......kbk..',
    '...kbk....kbk...',
    '....kk....kk....',
    ...rep('................', 8),
  ];
  // A lectern for Professor Krempe.
  def(lib, {
    lib_case_t: case_t,
    lib_case_m: case_m,
    lib_case_m2: case_m2,
    lib_case_tl: left(case_t, 'k'), lib_case_tr: right(case_t, 'k'),
    lib_case_ml: left(case_m, 'k'), lib_case_mr: right(case_m, 'k'),
    lib_floor_t: floor_t,
    lib_floor_m: floor_m,
    lib_ladder: ladder,
    lib_shelf_t: shelf_t,
  });
})();
