'use strict';
/*
 * JEKYLL.EXE: the world. Every place in the game is drawn here once, as a
 * 16x10 map, and every room the story sets there reuses it, so the cabinet,
 * the theatre and the door in the by-street are the same each time you come
 * back to them. Nothing here touches the DOM.
 *
 * The geography follows the book. Jekyll's house fronts "a square of
 * ancient, handsome houses"; behind it a yard "which had once been a garden"
 * runs back to the old dissecting rooms. Their theatre fills the ground
 * floor; "at the further end, a flight of stairs mounted to a door covered
 * with red baize" and the cabinet above, which looks "out upon the court by
 * three dusty windows barred with iron". "A corridor joined the theatre to
 * the door on the by-street": the blistered door, round the corner from the
 * square. North is up on every map: the square, the house, the yard, the
 * laboratory, the court and the by-street lie in that order going south.
 *
 * A screen's exits say where they lead (screen and exit), and
 * scripts/jekyll/world-lint.ts checks every one leads back.
 */
(() => {
  const S = JH.screen;

  // Kinds: wall, floor, low (Hyde climbs), table (see over), block (can't),
  // door, exit (a way out, opened by a room), window.
  const wall = (art, more) => Object.assign({ kind: 'wall', art }, more);
  const floor = (art, more) => Object.assign({ kind: 'floor', art }, more);
  const low = (art, more) => Object.assign({ kind: 'low', art }, more);
  const table = (art, more) => Object.assign({ kind: 'table', art }, more);
  const block = (art, more) => Object.assign({ kind: 'block', art }, more);
  const exit = (art, id, more) => Object.assign({ kind: 'exit', art, exit: id }, more);

  /* ------------------------------------------------------ the laboratory */

  S('cabinet', {
    name: 'THE CABINET',
    // Glazed presses round the walls, the press marked E "on the left hand"
    // as you come in, the fire and the lamp on the chimney shelf, the
    // business table, the easy-chair, and three windows on the court.
    map: [
      '#PEPPPPPPPPP####',
      '#..............#',
      '#..............F',
      'r..............F',
      '#.....TTT......#',
      '#.....TTT...c..#',
      '#..............#',
      'P..............#',
      'P..............#',
      '####W###W###W###',
    ],
    legend: {
      '#': wall('plaster'),
      '.': floor('carpet'),
      P: wall('press'),
      E: wall('press', { act: 'pressE', decor: 'E' }),
      F: wall('hearth', { act: 'hearth' }),
      T: table('desk', { act: 'desk' }),
      c: table('chair', { act: 'chair' }),
      W: { kind: 'window', art: 'window-bars', act: 'window' },
      r: exit('baize', 'baize'),
      M: block('cheval', { act: 'mirror' }),
    },
    exits: {
      baize: { to: 'theatre', at: 'up' },
    },
  });

  S('theatre', {
    name: 'THE THEATRE',
    // "the tables laden with chemical apparatus, the floor strewn with crates
    // and littered with packing straw, and the light falling dimly through
    // the foggy cupola." The old students' benches rise on the east side.
    map: [
      '#######g########',
      '#..............#',
      '#.==..TT..~~~~.#',
      '#.==..TT..~~~~.#',
      'u.....TT.......#',
      '#..............#',
      '#.===..TT..==..#',
      '#.=....TT......#',
      '#..............#',
      '##############k#',
    ],
    legend: {
      '#': wall('lab-wall'),
      '.': floor('flags'),
      '=': low('crate'),
      '~': low('benches'),
      s: low('straw'),
      T: table('apparatus'),
      g: exit('door-n', 'garden'),
      u: exit('stair-up', 'up'),
      k: exit('corridor', 'corridor'),
    },
    exits: {
      garden: { to: 'yard', at: 'lab' },
      up: { to: 'cabinet', at: 'baize' },
      corridor: { to: 'bystreet', at: 'door', via: 'the corridor' },
    },
  });

  S('yard', {
    name: 'THE YARD',
    // "a yard which had once been a garden": the old beds gone to box hedge
    // and the pump between them.
    map: [
      '######h#########',
      '#..............#',
      '#.==.==..==.==.#',
      '#.==.==..==.==.#',
      '#......o.......#',
      '#..............#',
      '#.==.==..==.==.#',
      '#.==.==..==.==.#',
      '#..............#',
      '#######g########',
    ],
    legend: {
      '#': wall('garden-wall'),
      '.': floor('yard'),
      '=': low('hedge'),
      o: table('pump'),
      h: exit('door-n', 'house'),
      g: exit('door-s', 'lab'),
    },
    exits: {
      house: { to: 'house', at: 'back' },
      lab: { to: 'theatre', at: 'garden' },
    },
  });

  /* ------------------------------------------------------------ the house */

  S('house', {
    name: 'THE HALL',
    // "a large, low-roofed, comfortable hall paved with flags, warmed (after
    // the fashion of a country house) by a bright, open fire, and furnished
    // with costly cabinets of oak." The front door and its mat, the dining
    // room to the west; behind, the kitchen, the back passage to the yard,
    // and the stairs.
    map: [
      '########f#######',
      '#.....##...#####',
      '#.....#.m.....B#',
      '#.TTT.+.......BF',
      '#.TTT.#........#',
      '#.#######.###.##',
      '#.....#...#....#',
      '#.KKK.#...+..u.#',
      '#.....+...#....#',
      '#########b######',
    ],
    legend: {
      '#': wall('panel'),
      '.': floor('flags'),
      B: block('oak'),
      F: wall('fire', { act: 'fire' }),
      T: table('dining-table'),
      K: low('kitchen-table'),
      m: exit('mat', 'mat'),
      f: exit('front-door', 'front'),
      b: exit('door-s', 'back'),
      u: exit('stair-up', 'up'),
    },
    exits: {
      front: { to: '@square', at: 'jekyll' },
      mat: { to: '@square', at: 'jekyll', via: 'Poole shows the guests out' },
      back: { to: 'yard', at: 'house' },
      up: { to: 'upstairs', at: 'down' },
    },
  });

  S('upstairs', {
    name: 'UPSTAIRS',
    // Two pair of stairs up: the bedroom ("the decent furniture and tall
    // proportions of my room in the square") and the servants' rooms.
    map: [
      '################',
      '#M...#....#....#',
      '#....#.bb.#.bb.#',
      '#BB..#....#....#',
      '#BB..#....#....#',
      '####.####.####.#',
      '#..............#',
      '#..............#',
      '#.......d......#',
      '################',
    ],
    legend: {
      '#': wall('paper'),
      '.': floor('boards'),
      B: block('bed'),
      b: block('cot'),
      M: block('glass', { act: 'mirror' }),
      d: exit('stair-down', 'down'),
    },
    exits: {
      down: { to: 'house', at: 'up' },
    },
  });

  /* -------------------------------------------------------- the by-street */

  S('bystreet', {
    name: 'THE BY-STREET',
    // "Two doors from one corner, on the left hand going east the line was
    // broken by the entry of a court; and just at that point a certain
    // sinister block of building thrust forward its gable on the street.
    // It was two storeys high; showed no window, nothing but a door". The
    // corner at the east end goes round to the square.
    map: [
      '################',
      '#########c#D####',
      '##SS##SS#.#.##S#',
      '<..............>',
      '<..............>',
      '<..............>',
      '<..............>',
      '##S#.#SS#.#.##.#',
      '################',
      '################',
    ],
    legend: {
      '#': wall('shopfront'),
      '.': floor('cobbles'),
      S: wall('shop-window'),
      D: exit('blistered', 'door'),
      c: exit('court', 'court'),
      '<': exit('street-w', 'west'),
      '>': exit('street-e', 'corner'),
    },
    exits: {
      door: { to: 'theatre', at: 'corridor', via: 'the corridor' },
      court: { to: '@court', at: 'entry' },
      west: { to: 'streets', at: 'east' },
      corner: { to: '@square', at: 'corner' },
    },
  });

  /* ------------------------------------------------------ the night streets */

  S('streets', {
    name: 'STREET AFTER STREET',
    // "street after street, all lighted up as if for a procession and all as
    // empty as a church". A main street east to the by-street, and a side
    // street off it to the south.
    map: [
      '################',
      '##SS##SS##SS##S#',
      '#..o...o...o...#',
      '<..............>',
      '<..............>',
      '#..o...o.....o.#',
      '########....####',
      '########....####',
      '########S..S####',
      '################',
    ],
    legend: {
      '#': wall('terrace'),
      '.': floor('pavement'),
      S: wall('terrace-window'),
      o: block('lamp'),
      '<': exit('street-w', 'west'),
      '>': exit('street-e', 'east'),
    },
    exits: {
      west: { to: '@london', at: 'east' },
      east: { to: 'bystreet', at: 'west' },
    },
  });

  /* ---------------------------------------------------------------- Soho */

  S('soho', {
    name: 'SOHO',
    // "a dingy street, a gin palace, a low French eating house, a shop for
    // the retail of penny numbers and twopenny salads, many ragged children
    // huddled in the doorways". Hyde's door is the first on the north side.
    map: [
      '################',
      '################',
      '##h##.####.###.#',
      'G..............>',
      'G..............>',
      'G..............>',
      '###.####.###.###',
      '################',
      '################',
      '################',
    ],
    legend: {
      '#': wall('soho-front'),
      '.': floor('mud'),
      G: wall('gin-palace'),
      h: exit('door-n', 'hyde'),
      '>': exit('street-e', 'east'),
    },
    exits: {
      hyde: { to: 'sohorooms', at: 'street' },
      east: { to: '@london', at: 'west' },
    },
  });

  S('sohorooms', {
    name: "HYDE'S ROOMS",
    // "Mr. Hyde had only used a couple of rooms; but these were furnished
    // with luxury and good taste. A closet was filled with wine; the plate
    // was of silver, the napery elegant; a good picture hung upon the
    // walls". The lock-fast drawers, and the hearth.
    map: [
      '################',
      '#..w...#.......#',
      '#.d....#...BB..#',
      '#......+...BB..#',
      'F......#......d#',
      '#..TT..#.......#',
      '###.######.#####',
      '#..............#',
      '#..............#',
      '######s#########',
    ],
    legend: {
      '#': wall('damask'),
      '.': floor('rug'),
      w: block('wine'),
      d: table('bureau', { act: 'drawer' }),
      F: wall('hearth', { act: 'hearth' }),
      T: table('plate'),
      B: block('bed'),
      s: exit('stair-down', 'street'),
    },
    exits: {
      street: { to: 'soho', at: 'hyde' },
    },
  });

  /* ---------------------------------------------------- squares and parks */

  S('square', {
    name: 'A SQUARE',
    // A garden square at night: railings, plane trees, and the constables'
    // beats round it. Hyde can go over the railings.
    map: [
      '################',
      '<..............#',
      '#.============.#',
      '#.=..t....t..=.#',
      '#.=.t..t...t.=.#',
      '#.=..t....t..=.#',
      '#.============.#',
      '#..............>',
      '#S#S#S##S#S#S#S#',
      '################',
    ],
    legend: {
      '#': wall('terrace'),
      '.': floor('pavement'),
      S: wall('terrace-window'),
      '=': low('railing'),
      t: block('tree'),
      '<': exit('street-w', 'west'),
      '>': exit('street-e', 'east'),
    },
    exits: {
      west: { to: '@london', at: 'square-w' },
      east: { to: '@london', at: 'square-e' },
    },
  });

  S('park', {
    name: "REGENT'S PARK",
    // "It was a fine, clear, January day, wet under foot where the frost had
    // melted, but cloudless overhead; and the Regent's Park was full of
    // winter chirrupings and sweet with spring odours." Box hedges, the
    // walks, a bench in the sun.
    map: [
      '################',
      'g.......t......#',
      '#.=====...====.#',
      '#.=...=.t.=..=.#',
      '#.=.b.=...=..=.#',
      '#.==.==.t.==.=.#',
      '#..............#',
      '#.t...t...t...t#',
      '#..............G',
      '################',
    ],
    legend: {
      '#': wall('park-railing'),
      '.': floor('gravel'),
      '=': low('box-hedge'),
      t: block('tree'),
      b: table('bench', { act: 'bench' }),
      g: exit('gate-w', 'west'),
      G: exit('gate-e', 'east'),
    },
    exits: {
      west: { to: '@london', at: 'park-w' },
      east: { to: '@london', at: 'park-e' },
    },
  });

  /* ------------------------------------------------------- the long night */

  S('hotel', {
    name: 'AN HOTEL IN PORTLAND STREET',
    // "led me to a private room, and brought me wherewithal to write."
    map: [
      '################',
      '#....#.........#',
      '#....+.....TT..#',
      '#....#.........#',
      '##.####.#####.##',
      '#..............#',
      '#.##.#####.###.#',
      '#.#...........##',
      '#...B.....B....#',
      '#######e########',
    ],
    legend: {
      '#': wall('hotel-wall'),
      '.': floor('hotel-carpet'),
      B: block('palm'),
      T: table('writing-table', { act: 'write' }),
      e: exit('door-s', 'street'),
    },
    exits: {
      street: { to: '@london', at: 'portland' },
    },
  });

  S('alleys', {
    name: 'THE LESS FREQUENTED THOROUGHFARES',
    // "skulking through the less frequented thoroughfares, counting the
    // minutes that still divided him from midnight." Back streets round
    // small blocks of houses, a lamp at a corner or two.
    map: [
      '################',
      '<..............#',
      '#.##.##.##.##.##',
      '#.##.##.##.##.##',
      '#....o.........>',
      '#.##.##.##.##.##',
      '#.##.##.##.##.##',
      '#..........o...#',
      '##S##S##S##S####',
      '################',
    ],
    legend: {
      '#': wall('terrace'),
      '.': floor('cobbles'),
      S: wall('terrace-window'),
      o: block('lamp'),
      '<': exit('street-w', 'west'),
      '>': exit('street-e', 'east'),
    },
    exits: {
      west: { to: '@london', at: 'alleys-w' },
      east: { to: 'cavendish', at: 'west' },
    },
  });

  S('cavendish', {
    name: 'CAVENDISH SQUARE',
    // "Cavendish Square, that citadel of medicine", and Dr. Lanyon's door
    // under its portico.
    map: [
      '######L#########',
      '#####p.p########',
      '#..............#',
      '<..............#',
      '#.============.#',
      '#.=..t....t..=.#',
      '#.=..........=.#',
      '#.============.#',
      '#..............#',
      '################',
    ],
    legend: {
      '#': wall('stucco'),
      '.': floor('pavement'),
      p: block('pillar'),
      '=': low('railing'),
      t: block('tree'),
      L: exit('lanyon-door', 'lanyon'),
      '<': exit('street-w', 'west'),
    },
    exits: {
      lanyon: { to: 'consulting', at: 'hall' },
      west: { to: 'alleys', at: 'east' },
    },
  });

  S('consulting', {
    name: "DR. LANYON'S CONSULTING ROOM",
    // "the bright light of the consulting room": his customary seat, the
    // drawer on the floor behind a table under its sheet, the shelf with
    // the graduated glass.
    map: [
      '################',
      '#BBBB.....BBBB.#',
      '#..............#',
      '#...TT.....c...#',
      '#...TT.........#',
      '#.........D....#',
      '#..............#',
      '#.....TTT......#',
      '#..............#',
      '#######h########',
    ],
    legend: {
      '#': wall('panel'),
      '.': floor('turkey-carpet'),
      B: wall('bookcase', { act: 'shelf' }),
      T: table('table', { act: 'table' }),
      c: table('lanyon-chair'),
      D: table('drawer-sheet', { act: 'drawer' }),
      h: exit('door-s', 'hall'),
    },
    exits: {
      hall: { to: 'cavendish', at: 'lanyon' },
    },
  });
})();
