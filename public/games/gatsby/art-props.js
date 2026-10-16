'use strict';
/*
 * GATSBY.EXE art: HUD, pickups, doors, lamps, effects, the things that move
 * and carry you (the car, the hearse, the couch, boats, shirts, curtains) and
 * the things thrown at you. Small pieces are drawn by hand; the big ones are
 * built on a character grid with a few shape helpers and outlined in black,
 * so they stay palette-indexed like everything else.
 */
(() => {
  /* ------------------------------------------------------------ helpers */
  // A character grid: shapes in legend characters, then rows for GG.sprite.
  function grid(w, h) {
    const a = Array.from({ length: h }, () => new Array(w).fill('.'));
    const g = {
      w, h, a,
      px(x, y, c) { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < w && y < h) a[y][x] = c; return g; },
      get(x, y) { return a[y] && a[y][x]; },
      rect(x, y, rw, rh, c) { for (let j = y; j < y + rh; j++) for (let i = x; i < x + rw; i++) g.px(i, j, c); return g; },
      hl(x, y, n, c) { return g.rect(x, y, n, 1, c); },
      vl(x, y, n, c) { return g.rect(x, y, 1, n, c); },
      disc(cx, cy, r, c) { for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) if (i * i + j * j <= r * r + r * 0.6) g.px(cx + i, cy + j, c); return g; },
      oval(cx, cy, rx, ry, c) { for (let j = -ry; j <= ry; j++) for (let i = -rx; i <= rx; i++) if ((i * i) / (rx * rx + 0.3) + (j * j) / (ry * ry + 0.3) <= 1) g.px(cx + i, cy + j, c); return g; },
      line(x0, y0, x1, y1, c) {
        const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
        for (let i = 0; i <= n; i++) g.px(x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n, c);
        return g;
      },
      // Paint over cells already of one color only.
      swap(x, y, rw, rh, from, to) { for (let j = y; j < y + rh; j++) for (let i = x; i < x + rw; i++) if (g.get(i, j) === from) g.px(i, j, to); return g; },
      // Black outline around everything drawn (4-neighbour).
      outline(c = 'k') {
        const add = [];
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
          if (a[y][x] !== '.') continue;
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const v = a[y + dy] && a[y + dy][x + dx];
            if (v && v !== '.' && v !== c) { add.push([x, y]); break; }
          }
        }
        for (const [x, y] of add) a[y][x] = c;
        return g;
      },
      rows() { return a.map((r) => r.join('')); },
    };
    return g;
  }
  // Put differently-paletted frames into one set.
  const add = (set, legend, frames, opt) => {
    const s = GG.sprite('_tmp', legend, frames, opt);
    GG.SPR[set] = Object.assign(GG.SPR[set] || {}, s);
    delete GG.SPR._tmp;
  };
  const rep = (row, n) => Array(n).fill(row);

  /* ---------------------------------------------------------------- HUD */
  add('hud', { k: 0x0f, r: 0x16, R: 0x06, w: 0x30, G: 0x00, g: 0x2d }, {
    heart: [
      '.kk.kk.',
      'kwrkrrk',
      'krrrrRk',
      'krrrrRk',
      '.krrRk.',
      '..kRk..',
      '...k...',
    ],
    heart0: [
      '.kk.kk.',
      'kGGkGGk',
      'kGggGGk',
      'kGGGGGk',
      '.kGGGk.',
      '..kGk..',
      '...k...',
    ],
  });
  // "Every Friday five crates of oranges and lemons arrived from a fruiterer."
  add('hud', { k: 0x0f, o: 0x27, O: 0x37, R: 0x17, w: 0x30, e: 0x1a, E: 0x0a, y: 0x28, Y: 0x38, L: 0x18 }, {
    orange: [
      '......kk..',
      '....kkeEk.',
      '..kkkEkk..',
      '.kOOoook..',
      'kOwOooooRk',
      'kOOoooooRk',
      'koooooooRk',
      'kooooooRRk',
      '.kooRRRRk.',
      '..kkkkkk..',
    ],
    lemon: [
      '......kk..',
      '.....keEk.',
      '..kkkkkk..',
      '.kYYyyyyk.',
      'kYwYyyyyLk',
      'kYYyyyyyLkk',
      'kyyyyyyyLLk',
      'kyyyyyyLLk.',
      '.kyyLLLLk..',
      '..kkkkkk...',
    ],
  });
  // A mint julep at the Plaza: a frosted silver cup, a sprig of mint.
  add('hud', { k: 0x0f, e: 0x2a, E: 0x1a, w: 0x30, s: 0x10, S: 0x00, i: 0x3c }, {
    julep: [
      '...e.ee...',
      '..eEeEe.e.',
      '.kkEkkEkk.',
      'kwiwwiwwsk',
      'kwwiwwwssk',
      '.kwwiwwsk.',
      '.kwwwwssk.',
      '..kwwssk..',
      '...kssk...',
      '...kwsk...',
      '..kwwssk..',
      '.kkkkkkkk.',
    ],
  });

  /* ------------------------------------------------------------- pickups */
  add('items', { k: 0x0f, w: 0x30, g: 0x10, y: 0x28, Y: 0x18 }, {
    // A rumor: "Somebody told me they thought he killed a man once."
    rumor: [
      '.kkkkkkkkkk.',
      'kwwwwwwwwwwk',
      'kwwwyyyywwwk',
      'kwwyywwyywwk',
      'kwwwwwwyywgk',
      'kwwwwwyywwgk',
      'kwwwwyywwwgk',
      'kwwwwwwwwwgk',
      'kwwwwyywwggk',
      '.kkgwkkkkkk.',
      '...kgk......',
      '...kk.......',
    ],
  });
  // Folded shirts: "in coral and apple-green and lavender and faint orange,
  // with monograms of Indian blue."
  const shirt = [
    '.kkkk..kkkk.',
    'kcCCCkkCCCck',
    'kccCCCCCCcck',
    'kcccckkcccck',
    'kccccbkcmmck',
    'kcccckkcmcck',
    'kccccbkcmmck',
    'kcccckkcccck',
    'kDccccbcccDk',
    'kDDccccccDDk',
    'kkkkkkkkkkkk',
  ];
  const shirtColors = {
    shirtCoral: { c: 0x26, C: 0x36, D: 0x16, m: 0x16, b: 0x30 },
    shirtGreen: { c: 0x2a, C: 0x3a, D: 0x1a, m: 0x1a, b: 0x30 },
    shirtLavender: { c: 0x23, C: 0x33, D: 0x13, m: 0x13, b: 0x30 },
    shirtOrange: { c: 0x37, C: 0x30, D: 0x27, m: 0x27, b: 0x30 },
    shirtBlue: { c: 0x30, C: 0x30, D: 0x10, m: 0x12, b: 0x10 },
  };
  for (const [name, pal] of Object.entries(shirtColors)) add('items', Object.assign({ k: 0x0f }, pal), { [name]: shirt });
  add('items', { k: 0x0f, w: 0x37, W: 0x30, s: 0x02, g: 0x27 }, {
    // A scrap of paper: one of the GENERAL RESOLVES.
    resolve: [
      '.kkkkkkkkk..',
      'kWwwwwwwwwk.',
      'kwsswsssswkk',
      'kwwwwwwwwwwk',
      'kwssswssswwk',
      'kwwwwwwwwwwk',
      'kwsswswssswk',
      'kwwwwwwwwwk.',
      'kwssswsswwk.',
      'kwwwwwwwwwwk',
      'kwsswssswwgk',
      'kwwwwwwwwggk',
      '.kwkwwkwgkk.',
      '..k.kk.kk...',
    ],
  });
  // "Orderi di Danilo," ran the circular legend, "Montenegro, Nicolas Rex."
  add('items', { k: 0x0f, r: 0x16, R: 0x06, w: 0x30, y: 0x28, Y: 0x38, o: 0x18, b: 0x12 }, {
    medal: [
      '...kkkkkk...',
      '...krwwrk...',
      '...krwwrk...',
      '...krwwrk...',
      '...krwwrk...',
      '....kkkk....',
      '.....kk.....',
      '...kkyykk...',
      '.kkkYrrYkkk.',
      'kyYkyrrykYyk',
      'kyrrrwwrrryk',
      'kyrrwbbwrryk',
      'kyorrwwrrook',
      '.kkkorroykk.',
      '...kkyykk...',
      '.....kk.....',
    ],
  });

  /* ---------------------------------------------------------------- goals */
  // A white French door. Lit gold inside when the way is open.
  function frenchDoor(lit) {
    const g = grid(16, 32);
    const glass = lit ? ['Y', 'y', 'o'] : ['n', 'N', 'd'];
    g.rect(1, 0, 14, 32, 'w');
    g.vl(14, 1, 31, 'g'); g.hl(1, 0, 14, 'W');
    g.rect(3, 2, 10, 28, glass[1]);
    g.vl(7, 2, 28, 'w'); g.vl(8, 2, 28, 'g');                      // the two leaves meet
    for (const y of [9, 16, 23]) { g.hl(3, y, 10, 'w'); }          // muntins
    // Light falls across the panes (or a moon's reflection in dark glass).
    for (let i = 0; i < 9; i++) { g.px(4 + (i >> 1), 3 + i, glass[0]); g.px(9 + (i >> 1), 3 + i, glass[0]); }
    for (let y = 24; y < 30; y++) { g.hl(3, y, 4, glass[2]); g.hl(9, y, 4, glass[2]); }
    g.px(6, 18, 'y'); g.px(9, 18, 'y');                             // brass handles
    g.hl(1, 31, 14, 'g');
    g.outline();
    return g.rows();
  }
  add('goal', { k: 0x0f, w: 0x30, W: 0x30, g: 0x10, y: 0x28, Y: 0x38, o: 0x27, n: 0x02, N: 0x0c, d: 0x0f }, {
    door: frenchDoor(true),
    doorShut: frenchDoor(false),
  });
  // Wilson's garage: "the interior was unprosperous and bare; the only car
  // visible was the dust-covered wreck of a Ford."
  function garage(open) {
    const g = grid(24, 32);
    g.rect(0, 0, 24, 32, 'b');
    g.rect(0, 0, 24, 3, 'B'); g.hl(0, 3, 24, 'k');
    if (open) {
      g.rect(3, 6, 18, 26, 'd');
      g.rect(3, 6, 18, 3, 'D');
      // The wreck of a Ford in the gloom; light at the back.
      g.rect(5, 22, 13, 5, 'S'); g.rect(8, 18, 7, 4, 'S'); g.disc(7, 28, 2, 'k'); g.disc(15, 28, 2, 'k');
      g.rect(17, 10, 3, 6, 'y');
    } else {
      g.rect(3, 6, 18, 26, 's');
      for (let y = 8; y < 32; y += 4) g.hl(3, y, 18, 'S');
      g.vl(11, 6, 26, 'S'); g.vl(12, 6, 26, 'g');
      g.rect(10, 18, 4, 2, 'y');
    }
    g.vl(2, 6, 26, 'k'); g.vl(21, 6, 26, 'k'); g.hl(2, 5, 20, 'k');
    g.outline();
    return g.rows();
  }
  add('goal', { k: 0x0f, b: 0x28, B: 0x38, d: 0x0f, D: 0x00, s: 0x00, S: 0x2d, g: 0x10, y: 0x27 }, {
    garage: garage(true),
    garageShut: garage(false),
  });
  // A Plaza Hotel door: dark polished wood, a brass number.
  function suite(open) {
    const g = grid(16, 32);
    g.rect(0, 0, 16, 32, 'y');
    g.rect(2, 2, 12, 30, open ? 'L' : 'b');
    if (open) { g.rect(2, 2, 12, 30, 'L'); g.rect(2, 2, 4, 30, 'b'); g.vl(5, 2, 30, 'B'); g.rect(8, 10, 5, 4, 'Y'); }
    else {
      g.rect(4, 4, 8, 10, 'B'); g.rect(5, 5, 6, 8, 'b');
      g.rect(4, 17, 8, 12, 'B'); g.rect(5, 18, 6, 10, 'b');
      g.px(11, 16, 'Y'); g.px(12, 16, 'y');
      g.hl(6, 8, 4, 'Y');
    }
    g.hl(0, 0, 16, 'Y');
    g.outline();
    return g.rows();
  }
  add('goal', { k: 0x0f, y: 0x18, Y: 0x28, b: 0x07, B: 0x17, L: 0x38 }, {
    suite: suite(true),
    suiteShut: suite(false),
  });
  // A sandbagged dugout mouth.
  (() => {
    const g = grid(24, 24);
    g.rect(0, 4, 24, 20, 'S');
    for (let y = 4; y < 24; y += 4) for (let x = (y / 4) % 2 ? 0 : 3; x < 24; x += 6) { g.hl(x, y, 6, 'k'); g.vl(x, y, 4, 'k'); g.hl(x + 1, y + 1, 4, 's'); }
    g.rect(6, 9, 12, 15, 'd');
    g.hl(5, 8, 14, 'w'); g.vl(5, 8, 16, 'w'); g.vl(18, 8, 16, 'w');   // timber frame
    g.rect(8, 12, 2, 3, 'y');                                           // a candle inside
    g.outline();
    add('goal', { k: 0x0f, S: 0x08, s: 0x18, d: 0x0f, w: 0x07, y: 0x27 }, { dugout: g.rows() });
  })();

  /* --------------------------------------------------------- checkpoints */
  // Each one: off (unlit), on1/on2 (lit, flickering). 16 wide, standing on the ground.
  // East Egg: a white garden lamp post with a glass lantern.
  (() => {
    const head = (glass) => [
      '.......kk.......',
      '......kwgk......',
      '....kkkkkkkk....',
      '...kwwwwwwwgk...',
      '....kkkkkkkk....',
      ...glass.map((r) => '....kw' + r + 'gk....'),
      '....kkkkkkkk....',
      '.....kwwwgk.....',
      '......kwgk......',
    ];
    const post = [
      ...rep('......kwgk......', 5),
      '.....kwwwgk.....',
      '.....kkkkkk.....',
      ...rep('......kwgk......', 6),
      '.....kwwwgk.....',
      '....kwwwwwgk....',
      '...kwwwwwwwgk...',
      '...kkkkkkkkkk...',
    ];
    const L = { k: 0x0f, w: 0x30, g: 0x10, d: 0x0c, D: 0x1c, y: 0x28, Y: 0x38, o: 0x27, W: 0x30 };
    add('lamp', L, {
      off: [...head(['Dddd', 'dDdd', 'ddDd', 'dddd', 'dddd', 'dddd']), ...post],
      on1: [...head(['YYYy', 'YWWy', 'YWWy', 'yWyy', 'yyyo', 'yyoo']), ...post],
      on2: [...head(['YYyy', 'YWWY', 'YWWy', 'yyWy', 'yyoy', 'yoyo']), ...post],
    });
  })();
  // The party: a Japanese paper lantern on a bamboo pole.
  (() => {
    const L = { k: 0x0f, b: 0x28, B: 0x18, r: 0x06, R: 0x16, o: 0x27, O: 0x37, w: 0x30, y: 0x38, t: 0x16 };
    const lantern = (p, P, c) => [
      '.kkkkkkkkkkkk...',
      '.kbbbbbbbbbbBk..',
      '.kbkkkkkkkkkk...',
      '.kbk.....kk.....',
      '.kbk....kkkk....',
      '.kbk...k' + P + p + p + P + 'k...',
      '.kbk..k' + P + p + c + c + p + P + 'k..',
      '.kbk..kkkkkkkk..',
      '.kbk.k' + P + p + c + c + c + c + p + P + 'k.',
      '.kbk.k' + P + p + c + c + c + c + p + P + 'k.',
      '.kbk.kkkkkkkkkk.',
      '.kbk.k' + P + p + c + c + c + c + p + P + 'k.',
      '.kbk.k' + P + p + p + c + c + p + p + P + 'k.',
      '.kbk..kkkkkkkk..',
      '.kbk..k' + P + p + p + p + p + P + 'k..',
      '.kbk...k' + P + p + p + P + 'k...',
      '.kbk....kkkk....',
      '.kbk.....kk.....',
      '.kbk.....kt.....',
      '.kbk.....kt.....',
      '.kBk......k.....',
      ...rep('.kbk............', 4),
      '.kBk............',
      ...rep('.kbk............', 3),
      'kkbBk...........',
      'kbbbBk..........',
      'kkkkkk..........',
    ];
    add('lantern', L, {
      off: lantern('r', 'R', 'r'),
      on1: lantern('o', 'R', 'y'),
      on2: lantern('O', 'o', 'w'),
    });
  })();
  // The valley of ashes: a 1920s gas pump with a glass globe that lights.
  (() => {
    const L = { k: 0x0f, r: 0x16, R: 0x06, w: 0x30, g: 0x10, G: 0x2d, y: 0x28, Y: 0x38, s: 0x00, h: 0x0f };
    const pump = (a, b, c) => [
      '.....kkkkkk.....',
      '....k' + a + b + c + c + b + a + 'k....',
      '...k' + a + b + c + c + c + c + b + a + 'k...',
      '...k' + 'rrrrrrrr' + 'k...',
      '...k' + a + b + c + c + c + c + b + a + 'k...',
      '....k' + a + a + b + b + a + a + 'k....',
      '.....kkkkkk.....',
      '....kkgggggkk...',
      '...kwwwwwwwwgk..',
      '...kkkkkkkkkkk..',
      '....krrrrrrRk...',
      '....krwwwwrRk...',
      '....krwsswrRk...',
      '....krwwwwrRk...',
      '....krrrrrrRkk..',
      '....krrrrrrRkhk.',
      '....krkkkkrRk.hk',
      '....krkyykrRk.hk',
      '....krkkkkrRk.hk',
      '....krrrrrrRk.hk',
      '....krrrrrrRk.hk',
      '....krrrrrrRk.hk',
      '....krrrrrrRkhk.',
      '....krrrrrrRkk..',
      '....krrrrrrRk...',
      '...kkkkkkkkkkk..',
      '...kgggggggggk..',
      '..kGGGGGGGGGGGk.',
      '..kkkkkkkkkkkkk.',
    ];
    add('gaspump', L, {
      off: pump('G', 'g', 'g'),
      on1: pump('Y', 'w', 'w'),
      on2: pump('y', 'Y', 'w'),
    });
  })();
  // Indoors: a brass stand with a frosted tulip shade.
  (() => {
    const L = { k: 0x0f, b: 0x18, B: 0x28, g: 0x10, G: 0x00, w: 0x30, y: 0x38, Y: 0x28, o: 0x27 };
    const shade = (a, b, c) => [
      '.......kk.......',
      '......k' + c + c + 'k......',
      '.....k' + a + c + c + a + 'k.....',
      '....k' + b + a + c + c + a + b + 'k....',
      '....k' + b + a + a + a + a + b + 'k....',
      '...k' + b + b + a + a + a + a + b + b + 'k...',
      '...kkkkkkkkkk...',
    ];
    const stand = [
      '.......kk.......',
      '......kBbk......',
      '.......kk.......',
      ...rep('.......kBk......', 4),
      '......kBBbk.....',
      '......kkkkk.....',
      ...rep('.......kBk......', 8),
      '......kBBbk.....',
      '.....kBbbbbk....',
      '....kBbbbbbbk...',
      '....kkkkkkkkk...',
    ];
    add('sconce', L, {
      off: [...shade('g', 'G', 'g'), ...stand],
      on1: [...shade('y', 'Y', 'w'), ...stand],
      on2: [...shade('Y', 'o', 'w'), ...stand],
    });
  })();
  // Lake Superior: a ship's lantern on a wooden post.
  (() => {
    const L = { k: 0x0f, b: 0x18, B: 0x28, w: 0x08, W: 0x18, g: 0x0c, G: 0x1c, y: 0x38, Y: 0x28, o: 0x27, h: 0x30 };
    const head = (a, b, c) => [
      '......kkkk......',
      '.....kk..kk.....',
      '......kkkk......',
      '.....kBBBBk.....',
      '....kbbbbbbk....',
      '....kb' + a + a + b + a + 'bk....',
      '....kb' + a + c + c + a + 'bk....',
      '....kb' + b + a + c + a + 'bk....',
      '....kb' + a + b + a + a + 'bk....',
      '....kbbbbbbk....',
      '.....kBBBBk.....',
      '......kkkk......',
    ];
    const post = [
      '.....kWWWwk.....',
      ...rep('.....kWwWwk.....', 4),
      '.....kWwkwk.....',
      ...rep('.....kWwWwk.....', 9),
      '....kkWwWwkk....',
      '....kWWwWwwk....',
      '....kkkkkkkk....',
    ];
    add('beacon', L, {
      off: [...head('g', 'G', 'g'), ...post],
      on1: [...head('y', 'Y', 'h'), ...post],
      on2: [...head('Y', 'o', 'h'), ...post],
    });
  })();
  // The Argonne: a tin trench lantern hung on a stake.
  (() => {
    const L = { k: 0x0f, w: 0x08, W: 0x18, s: 0x00, S: 0x10, d: 0x0f, y: 0x38, Y: 0x28, o: 0x27, h: 0x30 };
    const head = (a, b, c) => [
      '...kkkkkkkkk....',
      '...kWwwwwwwk....',
      '...kWkkkkkkk....',
      '...kWk...kk.....',
      '...kWk..kSSk....',
      '...kWk.kSSSSk...',
      '...kWk.ks' + a + a + 'sk...',
      '...kWk.ks' + a + c + 'sk...',
      '...kWk.ks' + b + a + 'sk...',
      '...kWk.kSSSSk...',
      '...kWk..kkkk....',
    ];
    const stake = [
      ...rep('...kWk..........', 12),
      '...kWWk.........',
      '..kWwWwk........',
      '..kkWwkk........',
      '....kk..........',
    ];
    add('fieldlamp', L, {
      off: [...head('d', 'd', 's'), ...stake],
      on1: [...head('Y', 'o', 'h'), ...stake],
      on2: [...head('y', 'Y', 'h'), ...stake],
    });
  })();
  // The Sound: a lantern on top of a dock piling, rope round it.
  (() => {
    const L = { k: 0x0f, w: 0x08, W: 0x18, r: 0x27, R: 0x37, s: 0x00, S: 0x10, d: 0x0c, y: 0x38, Y: 0x28, h: 0x30, g: 0x1a, G: 0x2a };
    const head = (a, b, c) => [
      '.......kk.......',
      '......kSSk......',
      '.....kSSSSk.....',
      '....kkkkkkkk....',
      '....ks' + a + a + b + a + 'sk....',
      '....ks' + a + c + c + a + 'sk....',
      '....ks' + b + a + a + b + 'sk....',
      '....kkkkkkkk....',
      '.....kSSSSk.....',
    ];
    const piling = [
      '...kkkkkkkkkk...',
      '...kWWWwwwwWk...',
      '...kWwwwwwwwk...',
      '...kRRrrRRrrk...',
      '...krRRrrRRrk...',
      '...kWwwwwwwwk...',
      '...kWwwkwwwwk...',
      '...kWwwwwwwWk...',
      '...kWwwwwkwwk...',
      '...kWwwwwwwwk...',
      '...kRRrrRRrrk...',
      '...kWwwwwwwwk...',
      '...kWwkwwwwWk...',
      '...kWwwwwwwwk...',
      '...kWwwwwwwwk...',
      '...kWwwwwwkwk...',
      '...kWwwwwwwwk...',
      '...kkkkkkkkkk...',
    ];
    add('docklamp', L, {
      off: [...head('d', 'd', 'S'), ...piling],
      on1: [...head('y', 'Y', 'h'), ...piling],
      on2: [...head('Y', 'r', 'h'), ...piling],
    });
  })();

  /* ------------------------------------------------------------ effects */
  add('fx', { k: 0x0f, w: 0x30, g: 0x10, G: 0x2d, y: 0x28, Y: 0x38, b: 0x31, B: 0x21 }, {
    puff1: [
      '................',
      '.....gg..gg.....',
      '...gwwgggwwg....',
      '..gwwg....gwwg..',
      '..gwg......gwg..',
      '.gwg........gwg.',
      '.gwg........gwg.',
      '..gg........gg..',
      '..gg........gg..',
      '.gwg........gwg.',
      '.gwg........gwg.',
      '..gwg......gwg..',
      '..gwwg....gwwg..',
      '...gwwgggwwg....',
      '.....gg..gg.....',
      '................',
    ],
    glint1: ['..w..', '.....', 'w.w.w', '.....', '..w..'],
    glint2: ['..w..', '..w..', 'wwwww', '..w..', '..w..'],
    spark: ['...Y....', '...w....', '.Y.w.Y..', '..www...', 'Ywwwwwy.', '..www...', '.y.w.y..', '...y....'],
    splash1: ['................', '................', '....b.....b.....', '.....b...b......', '..b..b.b.b..b...', '...bbwbwbwbb....', '.bbwwwwwwwwwbb..', 'bwwwwwwwwwwwwwb.'],
    splash2: ['......b.........', '..b...b...b.....', '...b..w..b......', '....b.w.b.......', '.b..bwwwb..b....', '..bbwwwwwbb.....', '.bwwwwwwwwwb....', 'bwwwwwwwwwwwb...'],
    note1: ['...kkk..', '...kYYk.', '...kYkYk', '...kYk.k', '...kYk..', '.kkkYk..', 'kYYYYk..', '.kkkk...'],
    note2: ['..kkkkkk', '..kYYYYk', '..kYkkYk', '..kYk.kY', '.kkYkkkY', 'kYYYkYYY', '.kkk.kkk', '........'],
  });
  // Nick's bonds: a certificate folded into a dart, then a fluttering sheet.
  add('fx', { k: 0x0f, w: 0x37, W: 0x30, g: 0x1a, G: 0x0a, y: 0x28 }, {
    bond1: [
      '.kk.....',
      'kWwkk...',
      'kwwwwkk.',
      'kgywwwwk',
      '.kkggkk.',
      '...kk...',
    ],
    bond2: [
      '.kkkkkk.',
      'kWwwwwgk',
      'kwgywwgk',
      'kwwwwwgk',
      '.kkkkkk.',
    ],
    bond3: [
      '....kkk.',
      '..kkWwgk',
      '.kwwygk.',
      'kgwwwk..',
      '.kkkk...',
    ],
  });
  // Jimmy's clam, spinning.
  add('fx', { k: 0x0f, w: 0x30, g: 0x10, s: 0x2d, b: 0x07 }, {
    clam1: ['.kkkk.', 'kwgwgk', 'kgwgwk', 'kwgwgk', '.ksbk.', '..kk..'],
    clam2: ['.kkk..', 'kwgsk.', 'kgwbkk', 'kwgbkk', 'kgwsk.', '.kkk..'],
    clam3: ['..kk..', '.kbsk.', 'kgwgwk', 'kwgwgk', 'kgwgwk', '.kkkk.'],
    clam4: ['..kkk.', '.ksgwk', 'kkbwgk', 'kkbgwk', '.ksgwk', '..kkk.'],
  });
  // Gatsby's calling card, flicked so it spins.
  add('fx', { k: 0x0f, w: 0x30, g: 0x10, y: 0x28 }, {
    card1: ['.kkkkkk.', 'kwwwwwgk', 'kwyywwgk', 'kwwwwwgk', '.kkkkkk.'],
    card2: ['..kkkk..', '.kwwwgk.', '.kwywgk.', '.kwwwgk.', '..kkkk..'],
    card3: ['........', 'kkkkkkkk', 'kwwwwwgk', 'kkkkkkkk', '........'],
  });
  // A shell bursting: the flash, the fireball, the smoke.
  (() => {
    const L = { k: 0x0f, w: 0x30, y: 0x38, Y: 0x28, o: 0x27, r: 0x16, R: 0x06, g: 0x10, G: 0x00, s: 0x2d };
    const r = GG.rng(1918);
    const blob = (rad, layers, jag) => {
      const g = grid(32, 32);
      for (const [rr, c] of layers) {
        for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
          const dx = x - 15.5, dy = y - 17.5;
          const a = Math.atan2(dy, dx);
          const edge = rr * rad * (1 + jag * Math.sin(a * 7 + rr * 3) * 0.18 + jag * Math.sin(a * 3 + 1) * 0.1);
          if (dx * dx + dy * dy <= edge * edge) g.px(x, y, c);
        }
      }
      return g;
    };
    const b1 = blob(9, [[1, 'Y'], [0.75, 'y'], [0.45, 'w']], 1);
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; b1.line(16 + Math.cos(a) * 9, 18 + Math.sin(a) * 9, 16 + Math.cos(a) * 14, 18 + Math.sin(a) * 14, 'y'); }
    const b2 = blob(13, [[1, 'R'], [0.85, 'r'], [0.65, 'o'], [0.4, 'Y'], [0.2, 'y']], 1.4);
    const b3 = blob(14, [[1, 'G'], [0.8, 'g'], [0.45, 's']], 1.8);
    for (let i = 0; i < 10; i++) { b2.px(4 + r() * 24, 4 + r() * 24, 'Y'); b3.px(4 + r() * 24, 2 + r() * 16, i % 2 ? 'o' : 'r'); }
    // Smoke rises: clear the bottom of the last frame a little.
    for (let x = 0; x < 32; x++) for (let y = 28; y < 32; y++) b3.px(x, y, '.');
    add('fx', L, { boom1: b1.outline().rows(), boom2: b2.outline().rows(), boom3: b3.outline().rows() });
  })();

  /* -------------------------------------------------------------- props */
  add('props', { k: 0x0f, b: 0x07, B: 0x17, o: 0x08, s: 0x00, S: 0x10, g: 0x2d, w: 0x30, y: 0x28, Y: 0x38, r: 0x18 }, {
    // A plank on ropes, for moving platforms.
    plank: [
      '..k..........k..',
      '..k..........k..',
      'kkkkkkkkkkkkkkkk',
      'kBBBBbBBBBBbBBBk',
      'kbbbbobbbbbobbbk',
      'kobbbbbbobbbbbok',
      'kkkkkkkkkkkkkkkk',
      '................',
    ],
    crumble: [
      'kkkkkkkkkkkkkkkk',
      'kSSSSkSSSSSSkSSk',
      'kSggSkSgSSgSkSgk',
      'kgkkgkkggkgkkggk',
      'kSgSkSSkgSSgSkSk',
      'kgSgkgSkgggkgSgk',
      'kkggkkgkkgkkkggk',
      '.kkk..kk.kk..kk.',
    ],
    // A rotten duckboard: slats on runners, one of them split.
    crumbleBoard: [
      'kkkkkkkkkkkkkkkk',
      'krrkrrkrrkrkrrrk',
      'kookookookkkookk',
      'kkkkkkkkkkkkkkkk',
      '.kbbbbbbbbbbbbk.',
      '.kokkkkkkkkkkok.',
      '..k..........k..',
      '................',
    ],
    // A wooden signboard on a post.
    sign: [
      '................',
      'kkkkkkkkkkkkkkkk',
      'kBBBBBBBBBBBBBBk',
      'kBbbbbbbbbbbbbok',
      'kBbkkkbkkbkkbbok',
      'kBbbbbbbbbbbbbok',
      'kBbkkbkkkbkkbbok',
      'kBbbbbbbbbbbbbok',
      'kooooooooooooook',
      'kkkkkkkBbkkkkkkk',
      '......kBok......',
      '......kBok......',
      '......kBok......',
      '......kBok......',
      '......kBok......',
      '.....kkkkkk.....',
    ],
  });
  // An ash heap's crust: it gives way under you.
  add('props', { k: 0x0f, a: 0x00, A: 0x10, g: 0x2d, w: 0x20 }, {
    crumbleAsh: [
      '..kkkk...kkkkk..',
      '.kAAAAkkkAwAAAk.',
      'kAAwAAAAAAAAAAAk',
      'kAAAAaAAAAaAAAgk',
      'kaAAaaAAAAAaAaak',
      'kaaagaaaAagaaaak',
      'kkagkkaagkkaagkk',
      '.kk..kkk..kk.kk.',
    ],
  });
  // Hazards that drop: a pine cone; Gatsby's "defunct mantelpiece clock".
  add('props', { k: 0x0f, b: 0x07, B: 0x17, o: 0x08, O: 0x18, e: 0x0a, w: 0x30, g: 0x10, y: 0x28, Y: 0x38 }, {
    pinecone: [
      '....kk....',
      '....ke....',
      '...kkkk...',
      '..kBObOk..',
      '.kObBoBbk.',
      '.kBoBObok.',
      '.kObBoBbk.',
      '.kBoBObok.',
      '..kObBok..',
      '..kBoBbk..',
      '...kObk...',
      '...kBok...',
      '....kk....',
      '..........',
    ],
    clock: [
      '...kkkk...',
      '..kYyyYk..',
      '.kYbbbbYk.',
      'kYbkkkkbyk',
      'kybkwwkbyk',
      'kbkwwkwkbk',
      'kbkwkkwkbk',
      'kbkwwwwkbk',
      'kbbkkkkbbk',
      'kbbbbbbbBk',
      'kbBbbbbBbk',
      'kYyyyyyyyk',
      'kkkkkkkkkk',
      '.kk....kk.',
    ],
  });
  // A white shirt sailing down, sleeves spread: shirt1 sleeves up, shirt2 down.
  add('props', { k: 0x0f, w: 0x30, g: 0x10, c: 0x31 }, {
    shirt1: [
      'kk...kkkkk...kk.',
      'kwkkkwgkgwkkkwk.',
      '.kwwwwwkwwwwwk..',
      '..kgkwwgwwkgk...',
      '....kwwkwwk.....',
      '....kwwgwwk.....',
      '....kgwwwgk.....',
      '....kkkkkkk.....',
    ],
    shirt2: [
      '.....kkkkk......',
      '.kkkkwgkgwkkkk..',
      'kwwwwwwkwwwwwwk.',
      'kgkkkwwgwwkkkgk.',
      '.k..kwwkwwk..k..',
      '....kwwgwwk.....',
      '....kgwwwgk.....',
      '....kkkkkkk.....',
    ],
    // A sheer curtain billowing "like pale flags".
    curtain1: [
      'kkkkkkkkkkkkkkkk',
      'kwwcwwwcwwwcwwk.',
      'kwcwcwcwcwcwck..',
      'kcwwwcwwwcwwwck.',
      'kwcwcwcwcwcwcwck',
      'kwwcwwwcwwwcwck.',
      '.kkcwkkcwkkck...',
      '...kk..kk..k....',
    ],
    curtain2: [
      'kkkkkkkkkkkkkk..',
      'kwwcwwwcwwwcwwk.',
      'kwcwcwcwcwcwcwwk',
      'kcwwwcwwwcwwwcwk',
      'kwcwcwcwcwcwcwk.',
      'kwwcwwwcwwwcwk..',
      '.kcwkkcwkkcwk...',
      '..kk..kk..kk....',
    ],
  });

  /* The things that carry the hero. */
  // "An enormous couch on which two young women were buoyed up as though upon
  // an anchored balloon." 48x16; the seat is at y 6, the arms' tops at y 2.
  (() => {
    const g = grid(48, 16);
    g.rect(4, 1, 40, 7, 'c');                         // the back
    g.hl(5, 0, 38, 'c');
    for (let x = 9; x < 42; x += 8) { g.px(x, 3, 'C'); g.px(x + 4, 5, 'C'); }
    g.hl(5, 1, 38, 'w');
    g.rect(1, 3, 6, 10, 'c'); g.rect(41, 3, 6, 10, 'c');   // rolled arms
    g.rect(2, 2, 4, 1, 'w'); g.rect(42, 2, 4, 1, 'w');
    g.hl(1, 2, 6, 'c'); g.hl(41, 2, 6, 'c'); g.px(1, 2, '.'); g.px(46, 2, '.');
    g.rect(6, 4, 1, 9, 'C'); g.rect(41, 4, 1, 9, 'C');
    g.rect(7, 6, 34, 5, 'c');                         // seat cushions
    g.hl(7, 6, 34, 'w');
    g.vl(18, 6, 5, 'C'); g.vl(29, 6, 5, 'C');
    g.rect(1, 11, 46, 3, 'C');                         // skirt
    g.hl(1, 11, 46, 'c');
    g.rect(3, 14, 2, 2, 'b'); g.rect(43, 14, 2, 2, 'b'); g.rect(23, 14, 2, 2, 'b');
    g.outline();
    add('props', { k: 0x0f, c: 0x37, C: 0x27, w: 0x30, b: 0x07 }, { couch: g.rows() });
  })();
  // A clinker rowboat (48x12) and a white skiff (40x12): the gunwale is the top.
  (() => {
    const boat = (w, h, body, shade, trim, stripe) => {
      const g = grid(w, h);
      for (let x = 0; x < w; x++) {
        const t = x / (w - 1);
        // Keel curve: deep amidships, rising at stem and stern; the bow (right) sweeps up.
        const top = t > 0.92 ? Math.round((t - 0.92) * -18) + 2 : t < 0.06 ? 2 - Math.round((0.06 - t) * 15) : 2;
        const bottom = Math.round(h - 1 - Math.max(0, (Math.abs(t - 0.48) - 0.28)) * (h * 2.3));
        for (let y = Math.max(0, top); y <= bottom; y++) g.px(x, y, body);
        g.px(x, Math.max(0, top), trim);
        if (stripe) g.px(x, Math.max(0, top) + 2, stripe);
        for (let y = top + 4; y <= bottom; y += 3) g.px(x, y, shade);
      }
      return g;
    };
    const rb = boat(48, 12, 'b', 'o', 'B', null);
    rb.rect(10, 0, 2, 2, 'B'); rb.rect(34, 0, 2, 2, 'B');     // oarlocks
    rb.outline();
    const sk = boat(40, 12, 'w', 'g', 'B', 'r');
    sk.outline();
    add('props', { k: 0x0f, b: 0x08, o: 0x07, B: 0x18, w: 0x30, g: 0x10, r: 0x16 }, { rowboat: rb.rows(), skiff: sk.rows() });
  })();
  // A bell buoy: a red cage with a bell in it, on a black float.
  add('props', { k: 0x0f, r: 0x16, R: 0x06, s: 0x00, S: 0x10, y: 0x28, Y: 0x38, w: 0x30 }, {
    buoy: [
      '......kkkk......',
      '.....krrrRk.....',
      '....kkkkkkkk....',
      '....kr.yy.Rk....',
      '....kr.yY.Rk....',
      '....krkyykRk....',
      '....kr.kk.Rk....',
      '...kkkkkkkkkk...',
      '...krrrrrrrRk...',
      '..ksSssssssssk..',
      '.kSSsssssssssSk.',
      'kwrrrrrrrrrrrRRk',
      'kSssssssssssssSk',
      '.kssssssssssssk.',
      '..kkkkkkkkkkkk..',
      '................',
    ],
  });
  // A grand piano, its lid propped. 40x24; the case top is at y 9, the lid
  // rises from x 6 to x 34.
  (() => {
    const g = grid(40, 24);
    g.rect(2, 9, 37, 7, 'b');                      // the case
    g.hl(2, 9, 37, 'B');
    g.hl(2, 15, 37, 'B');
    g.rect(0, 9, 6, 3, 'w');                       // the keys, seen end on
    for (let x = 1; x < 6; x += 2) g.px(x, 9, 'b');
    g.line(6, 8, 34, 1, 'b'); g.line(6, 7, 33, 0, 'B'); g.line(7, 8, 35, 1, 'b');
    for (let x = 8; x < 34; x++) { const y = Math.round(8 - ((x - 6) * 7) / 28); for (let j = y + 1; j < 9; j++) g.px(x, j, 'd'); }
    g.vl(30, 2, 7, 'y');                           // the prop stick
    g.rect(4, 16, 2, 7, 'b'); g.rect(20, 16, 2, 7, 'b'); g.rect(35, 16, 2, 7, 'b');
    g.hl(3, 23, 4, 'y'); g.hl(19, 23, 4, 'y'); g.hl(34, 23, 4, 'y');
    g.rect(12, 11, 9, 1, 'y');                     // gilt lettering
    g.outline();
    add('props', { k: 0x0f, b: 0x0f, B: 0x00, d: 0x2d, w: 0x30, y: 0x28 }, { piano: g.rows() });
  })();

  /*
   * Gatsby's car: "It was a rich cream color, bright with nickel, swollen
   * here and there in its monstrous length with triumphant hat-boxes and
   * supper-boxes and tool-boxes, and terraced with a labyrinth of
   * wind-shields that mirrored a dozen suns." 112x36, facing right.
   */
  function gatsbyCar(phase) {
    const g = grid(112, 36);
    // Chassis and running board.
    g.rect(10, 26, 92, 2, 'N');
    g.rect(31, 26, 50, 2, 'n'); g.hl(31, 26, 50, 'w');
    // The rear tub and the long hood.
    g.rect(8, 16, 64, 9, 'c');
    g.rect(70, 17, 35, 8, 'c');
    g.hl(8, 16, 64, 's'); g.hl(70, 17, 35, 's');
    g.rect(8, 23, 97, 2, 's');                      // shade under the belt
    g.hl(8, 19, 97, 'w'); g.hl(8, 20, 97, 'n');     // the nickel belt line
    for (let x = 76; x < 102; x += 3) g.vl(x, 21, 2, 'd');   // hood louvres
    g.vl(46, 17, 8, 'd'); g.vl(28, 17, 8, 'd');     // doors
    g.px(44, 22, 'w'); g.px(26, 22, 'w');
    // The radiator, upright and gleaming, with its cap.
    g.rect(104, 12, 5, 15, 'w');
    for (let y = 14; y < 26; y += 2) g.hl(105, y, 3, 'n');
    g.rect(105, 10, 3, 2, 'w'); g.px(106, 9, 'y');
    // Headlamp and fenders.
    g.disc(102, 18, 2, 'w'); g.px(103, 17, 'y');
    // Sweeping mudguards over the wheels, down to the running board.
    for (const [cx, x0, x1] of [[90, 80, 104], [22, 8, 34]]) {
      for (let x = x0; x <= x1; x++) {
        const t = (x - (x0 + x1) / 2) / ((x1 - x0) / 2);
        const y = Math.round(27 - Math.sqrt(Math.max(0, 1 - t * t)) * 6.5);
        g.rect(x, y, 1, 3, 'c'); g.px(x, y, 'w'); g.px(x, y + 2, 's');
      }
    }
    // Upholstery: the seat backs, green leather.
    g.rect(24, 10, 6, 7, 'e'); g.vl(24, 10, 7, 'E'); g.hl(24, 10, 6, 'e');
    g.rect(49, 10, 6, 7, 'e'); g.vl(49, 10, 7, 'E');
    g.rect(30, 14, 12, 2, 'E'); g.rect(55, 14, 9, 2, 'E');
    // Windshields: a tonneau screen and the front one, flashing suns.
    for (const [x, y0] of [[42, 5], [66, 3]]) {
      g.rect(x, y0, 3, 14 - (y0 - 3), 'g');
      g.vl(x, y0, 14 - (y0 - 3), 'n'); g.vl(x + 2, y0, 14 - (y0 - 3), 'n'); g.hl(x, y0, 3, 'w');
      g.px(x + 1, y0 + 3, 'w'); g.px(x + 1, y0 + 4, 'w'); g.px(x + 1, y0 + 8, 'G');
    }
    // The steering wheel and Gatsby at it, in pink.
    g.line(60, 13, 64, 10, 'n'); g.px(64, 9, 'n'); g.px(60, 14, 'n');
    g.rect(56, 11, 5, 4, 'p'); g.vl(56, 11, 4, 'P'); g.px(61, 12, 'f'); g.px(62, 12, 'f');
    g.rect(57, 6, 4, 4, 'f'); g.hl(57, 5, 4, 'a'); g.vl(57, 6, 2, 'a'); g.px(60, 7, 'k'); g.px(58, 10, 'w');
    // Boxes at the back: a supper-box on the rack, a striped hat-box on top,
    // a tool-box below, and the spare.
    g.rect(2, 8, 22, 9, 'b'); g.hl(2, 8, 22, 'B'); g.hl(2, 12, 22, 'B'); g.px(12, 10, 'y'); g.px(13, 10, 'y');
    g.rect(5, 2, 15, 6, 'H');
    for (let x = 5; x < 20; x += 3) g.vl(x, 3, 5, 'h');
    g.hl(5, 2, 15, 'h'); g.hl(5, 3, 15, 'H');
    g.rect(1, 18, 7, 7, 'N'); g.hl(1, 18, 7, 'n'); g.px(4, 21, 'y');
    // Wire wheels.
    for (const cx of [22, 90]) {
      const cy = 29;
      g.disc(cx, cy, 6, 'T');
      g.disc(cx, cy, 4, 'n');
      g.disc(cx, cy, 3, 'N');
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI + phase * (Math.PI / 8);
        g.line(cx - Math.cos(a) * 3, cy - Math.sin(a) * 3, cx + Math.cos(a) * 3, cy + Math.sin(a) * 3, 'n');
      }
      g.px(cx, cy, 'w'); g.px(cx - 1, cy - 1, 'w');
    }
    g.outline();
    return g.rows();
  }
  const CAR = { k: 0x0f, c: 0x37, s: 0x38, d: 0x18, w: 0x30, n: 0x10, N: 0x00, T: 0x0f, g: 0x31, G: 0x21, e: 0x1a, E: 0x0a, h: 0x16, H: 0x30, b: 0x08, B: 0x18, y: 0x28, p: 0x25, P: 0x15, f: 0x36, a: 0x28 };
  add('props', CAR, { gatsbyCar: gatsbyCar(0), gatsbyCar2: gatsbyCar(1) });

  // "A dead man passed us in a hearse heaped with blooms." 80x32.
  function hearse(phase) {
    const g = grid(80, 32);
    g.rect(3, 7, 56, 18, 'b');                      // the coach
    g.hl(3, 7, 56, 'B'); g.hl(2, 6, 58, 'B');
    for (let x = 8; x < 52; x += 11) { g.rect(x, 10, 8, 9, 'd'); g.hl(x, 10, 8, 'S'); for (let y = 11; y < 19; y++) g.px(x + (y % 2 ? 1 : 6), y, 'S'); }
    g.hl(3, 21, 56, 'S');
    for (let x = 5; x < 58; x += 4) g.px(x, 23, 'S');   // carved panel dots
    g.rect(52, 9, 7, 7, 'd'); g.hl(52, 9, 7, 'S');      // driver's window
    g.rect(59, 13, 18, 11, 'b');                        // the hood
    g.hl(59, 13, 18, 'S');
    for (let x = 62; x < 75; x += 3) g.vl(x, 16, 4, 'B');
    g.rect(77, 12, 2, 12, 'S');                         // radiator
    g.rect(73, 15, 2, 2, 'w');
    g.rect(6, 25, 70, 2, 'B');
    // Blooms heaped on the roof.
    const r = GG.rng(1922);
    for (let i = 0; i < 70; i++) {
      const x = 6 + Math.floor(r() * 46), y = 1 + Math.floor(r() * 5);
      if (y < 3 && (x < 12 || x > 46)) continue;
      const c = ['r', 'R', 'w', 'y', 'e', 'p'][Math.floor(r() * 6)];
      g.rect(x, y, 2, 2, c);
    }
    for (let x = 6; x < 52; x += 2) g.px(x, 5, r() < 0.5 ? 'e' : 'E');
    for (const cx of [15, 66]) {
      const cy = 26;
      g.disc(cx, cy, 5, 'T'); g.disc(cx, cy, 3, 'B'); g.disc(cx, cy, 1, 'S');
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI + phase * (Math.PI / 6);
        g.line(cx - Math.cos(a) * 3, cy - Math.sin(a) * 3, cx + Math.cos(a) * 3, cy + Math.sin(a) * 3, 'T');
      }
    }
    g.outline();
    return g.rows();
  }
  add('props', { k: 0x0f, b: 0x0f, B: 0x00, S: 0x2d, d: 0x10, w: 0x30, T: 0x0f, r: 0x16, R: 0x26, y: 0x28, e: 0x1a, E: 0x0a, p: 0x35 }, { hearse: hearse(0), hearse2: hearse(1) });

  /* ---------------------------------------------------------- projectiles */
  add('shots', { k: 0x0f, a: 0x00, A: 0x10, g: 0x2d }, {
    ash: ['.kkk..', 'kAAgk.', 'kAgagk', 'kgaaak', '.kkkk.'],
  });
  // A champagne coupe, tumbling.
  add('shots', { k: 0x0f, w: 0x30, c: 0x31, y: 0x38, Y: 0x28 }, {
    glass: ['kkkkkk', 'kyYyyk', '.kyyk.', '..kk..', '..kk..', '..kk..', '.kwwk.', '.kkkk.'],
    glass2: ['..kk....', '.kyk....', 'kyYkkkkk', 'kyykwwwk', 'kYYkkkkk', '.kyk....', '..kk....'],
  });
  // Meyer Wolfsheim's baseballs: the World's Series of 1919.
  add('shots', { k: 0x0f, w: 0x30, g: 0x10, r: 0x16 }, {
    baseball: ['.kkkk.', 'kwrwwk', 'kwrwrk', 'krwwrk', 'kwwrgk', '.kkkk.'],
    baseball2: ['.kkkk.', 'kwwwwk', 'krrwrk', 'kwwrrk', 'kwgggk', '.kkkk.'],
  });
  add('shots', { k: 0x0f, o: 0x27, O: 0x37, R: 0x17, w: 0x30, e: 0x1a }, {
    orange: ['..kkkk..', '.kOOook.', 'kOwOoooR', 'kOOooooR', 'koooooRR', 'koooooRR', '.koRRRk.', '..kkkk..'],
    orange2: ['..kkkk..', '.koeeOk.', 'kooooOwR', 'kooooOOR', 'koooooRR', 'kRoooooR', '.kRRRok.', '..kkkk..'],
  });
  add('shots', { k: 0x0f, w: 0x30, c: 0x31, C: 0x21, b: 0x08, B: 0x18, o: 0x07 }, {
    ice: ['kkkkk.', 'kwwcCk', 'kwcwCk', 'kccCCk', 'kkkkk.'],
    mud: ['.kkk..', 'kBbbk.', 'kbBbok', 'kbbook', '.kkkk.'],
  });
})();
