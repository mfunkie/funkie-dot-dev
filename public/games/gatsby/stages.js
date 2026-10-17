'use strict';
/*
 * GATSBY.EXE: tilesets (what each terrain does) and the stages. Pure data plus
 * small hooks, so the solver can load it in node. Maps live in maps.js.
 */
(() => {
  const { K } = GG;
  const T = GG.tileset;
  const S = GG.stage;
  const M = GG.MAPS;

  /* ------------------------------------------------------------ tilesets */
  // I. "The lawn started at the beach and ran toward the front door for a
  // quarter of a mile, jumping over sun-dials and brick walks and burning gardens."
  T('eastegg', {
    terrain: {
      sand: { kind: K.SOLID, auto: 'ee_sand', vary: [['2', 25]] },
      lawn: { kind: K.SOLID, auto: 'ee_lawn', vary: [['2', 20]], joins: ['brick'] },
      brick: { kind: K.SOLID, auto: 'ee_brick', joins: ['lawn'] },
      dial: { kind: K.SOLID, tile: 'ee_dial' },
      plinth: { kind: K.SOLID, tile: 'ee_plinth' },
      hedge: { kind: K.SOLID, auto: 'ee_hedge' },
      roses: { kind: K.SPIKE, tiles: ['ee_roses', 'ee_roses2'] },
      flowers: { kind: K.EMPTY, tiles: ['ee_flowers', 'ee_flowers2'] },
      house: { kind: K.SOLID, auto: 'ee_house', vary: [['2', 15]] },
      cornice: { kind: K.ONEWAY, tile: 'ee_cornice' },
      window: { kind: K.EMPTY, tile: 'ee_window' },
      vine: { kind: K.LADDER, tile: 'ee_vine' },
      floor: { kind: K.SOLID, auto: 'ee_floor' },
      wall: { kind: K.SOLID, auto: 'ee_wall' },
      sea: { kind: K.DEATH, anim: ['ee_sea1', 'ee_sea2'], rate: 16, sync: true },
      dock: { kind: K.ONEWAY, tile: 'ee_dock' },
    },
    legend: { s: 'sand', '#': 'lawn', B: 'brick', o: 'dial', I: 'plinth', h: 'hedge', '^': 'roses', f: 'flowers', H: 'house', '=': 'cornice', n: 'window', L: 'vine', F: 'floor', W: 'wall', '~': 'sea', '-': 'dock' },
  });

  // II. "This is a valley of ashes."
  T('ashes', {
    terrain: {
      ash: { kind: K.SOLID, auto: 'as_ash', vary: [['2', 20]], joins: ['heap'] },
      heap: { kind: K.SOLID, auto: 'as_heap', joins: ['ash'] },
      track: { kind: K.SOLID, auto: 'as_track' },
      trestle: { kind: K.EMPTY, tile: 'as_trestle' },
      rail: { kind: K.ONEWAY, tile: 'as_rail' },
      brick: { kind: K.SOLID, auto: 'as_brick', vary: [['2', 20]] },
      shop: { kind: K.EMPTY, tile: 'as_shop' },
      signL: { kind: K.EMPTY, tile: 'as_sign1' },
      signM: { kind: K.EMPTY, tile: 'as_sign2' },
      signR: { kind: K.EMPTY, tile: 'as_sign3' },
      river: { kind: K.DEATH, anim: ['as_river1', 'as_river2'], rate: 20, sync: true },
      bridge: { kind: K.ONEWAY, tile: 'as_bridge' },
      scaffold: { kind: K.ONEWAY, tile: 'as_scaffold' },
      ladder: { kind: K.LADDER, tile: 'as_ladder' },
      post: { kind: K.EMPTY, tile: 'as_post' },
      pole: { kind: K.EMPTY, tile: 'as_pole' },
    },
    legend: { '#': 'ash', A: 'heap', T: 'track', '|': 'trestle', '-': 'rail', B: 'brick', w: 'shop', 1: 'signL', 2: 'signM', 3: 'signR', '~': 'river', b: 'bridge', '=': 'scaffold', L: 'ladder', i: 'post', t: 'pole' },
  });

  // III. "In his blue gardens men and girls came and went like moths."
  T('party', {
    terrain: {
      lawn: { kind: K.SOLID, auto: 'pt_lawn', vary: [['2', 20]] },
      marble: { kind: K.SOLID, auto: 'pt_marble' },
      wall: { kind: K.SOLID, auto: 'pt_wall', vary: [['2', 15]] },
      window: { kind: K.EMPTY, anim: ['pt_win1', 'pt_win1', 'pt_win1', 'pt_win2'], rate: 20 },
      table: { kind: K.ONEWAY, tile: 'pt_table' },
      glasses: { kind: K.ONEWAY, tile: 'pt_glasses' },
      stand: { kind: K.ONEWAY, tile: 'pt_stand' },
      bar: { kind: K.SOLID, auto: 'pt_bar' },
      hedge: { kind: K.SOLID, auto: 'pt_hedge' },
      pool: { kind: K.WATER, anim: ['pt_pool1', 'pt_pool2'], rate: 18, sync: true, fg: true },
      books: { kind: K.SOLID, auto: 'pt_books', vary: [['2', 30], ['3', 55]] },
      shelf: { kind: K.ONEWAY, tile: 'pt_shelf' },
      oak: { kind: K.SOLID, auto: 'pt_oak' },
      lights: { kind: K.EMPTY, anim: ['pt_lights1', 'pt_lights2'], rate: 24, sync: true },
      urn: { kind: K.SOLID, tile: 'pt_urn' },
    },
    legend: { '#': 'lawn', M: 'marble', W: 'wall', n: 'window', '=': 'table', Y: 'glasses', '-': 'stand', R: 'bar', h: 'hedge', '~': 'pool', B: 'books', _: 'shelf', O: 'oak', ':': 'lights', U: 'urn' },
  });

  // IV. "Over the great bridge, with the sunlight through the girders making a
  // constant flicker upon the moving cars."
  T('bridge', {
    terrain: {
      road: { kind: K.SOLID, auto: 'br_road' },
      girder: { kind: K.SOLID, auto: 'br_girder' },
      truss: { kind: K.EMPTY, tile: 'br_truss' },
      rail: { kind: K.ONEWAY, tile: 'br_rail' },
      hole: { kind: K.DEATH, tile: 'br_hole' },
      pier: { kind: K.SOLID, auto: 'br_pier' },
      lamp: { kind: K.EMPTY, tile: 'br_lamp' },
    },
    legend: { '#': 'road', X: 'girder', x: 'truss', '=': 'rail', _: 'hole', Q: 'pier', l: 'lamp' },
  });

  // IV. "A well-fanned Forty-second Street cellar."
  T('cellar', {
    terrain: {
      floor: { kind: K.SOLID, auto: 'cl_floor' },
      wall: { kind: K.SOLID, auto: 'cl_wall', vary: [['2', 20]] },
      table: { kind: K.ONEWAY, tile: 'cl_table' },
      shelf: { kind: K.ONEWAY, tile: 'cl_shelf' },
      booth: { kind: K.SOLID, auto: 'cl_booth' },
      fan: { kind: K.EMPTY, anim: ['cl_fan1', 'cl_fan2'], rate: 4 },
      lamp: { kind: K.EMPTY, tile: 'cl_lamp' },
    },
    legend: { F: 'floor', W: 'wall', '=': 'table', '-': 'shelf', b: 'booth', f: 'fan', l: 'lamp' },
  });

  // V. "Marie Antoinette music-rooms and Restoration salons."
  T('mansion', {
    terrain: {
      floor: { kind: K.SOLID, auto: 'mn_floor' },
      wall: { kind: K.SOLID, auto: 'mn_wall', vary: [['2', 20]] },
      ledge: { kind: K.ONEWAY, tile: 'mn_ledge' },
      column: { kind: K.EMPTY, tile: 'mn_column' },
      window: { kind: K.EMPTY, anim: ['mn_win1', 'mn_win2'], rate: 8 },
      drape: { kind: K.EMPTY, tile: 'mn_drape' },
      bed: { kind: K.ONEWAY, tile: 'mn_bed' },
      piano: { kind: K.SOLID, auto: 'mn_piano' },
      mirror: { kind: K.EMPTY, tile: 'mn_mirror' },
      chandelier: { kind: K.EMPTY, tile: 'mn_chand' },
    },
    legend: { F: 'floor', W: 'wall', '=': 'ledge', '|': 'column', n: 'window', d: 'drape', b: 'bed', Q: 'piano', m: 'mirror', h: 'chandelier' },
  });

  // VI. "Beating his way along the south shore of Lake Superior as a
  // clam-digger and a salmon-fisher."
  T('lake', {
    terrain: {
      sand: { kind: K.SOLID, auto: 'lk_sand', vary: [['2', 25]] },
      rock: { kind: K.SOLID, auto: 'lk_rock', vary: [['2', 20]], joins: ['turf'] },
      turf: { kind: K.SOLID, auto: 'lk_turf', joins: ['rock'] },
      pine: { kind: K.EMPTY, tile: 'lk_pine' },
      crown: { kind: K.EMPTY, tile: 'lk_crown' },
      log: { kind: K.ONEWAY, tile: 'lk_log' },
      water: { kind: K.WATER, anim: ['lk_water1', 'lk_water2'], rate: 14, sync: true, fg: true },
      deep: { kind: K.DEATH, anim: ['lk_deep1', 'lk_deep2'], rate: 14, sync: true },
      hull: { kind: K.SOLID, auto: 'lk_hull', vary: [['2', 18]] },
      rail: { kind: K.ONEWAY, tile: 'lk_rail' },
      dock: { kind: K.ONEWAY, tile: 'lk_dock' },
      cabin: { kind: K.SOLID, auto: 'lk_cabin' },
    },
    legend: { s: 'sand', R: 'rock', '#': 'turf', i: 'pine', v: 'crown', '=': 'log', '~': 'water', w: 'deep', X: 'hull', '-': 'rail', d: 'dock', C: 'cabin' },
  });

  // VII. "The room was large and stifling."
  T('plaza', {
    terrain: {
      floor: { kind: K.SOLID, auto: 'pl_floor' },
      wall: { kind: K.SOLID, auto: 'pl_wall', vary: [['2', 20]] },
      brick: { kind: K.SOLID, auto: 'pl_brick', vary: [['2', 15]] },
      ledge: { kind: K.ONEWAY, tile: 'pl_ledge' },
      window: { kind: K.EMPTY, anim: ['pl_win1', 'pl_win2'], rate: 30 },
      table: { kind: K.ONEWAY, tile: 'pl_table' },
      palm: { kind: K.EMPTY, tile: 'pl_palm' },
    },
    legend: { F: 'floor', W: 'wall', B: 'brick', '=': 'ledge', n: 'window', t: 'table', y: 'palm' },
  });

  // VIII. "In the Argonne Forest I took the remains of my machine-gun battalion so far forward..."
  T('argonne', {
    terrain: {
      mud: { kind: K.SOLID, auto: 'ar_mud', vary: [['2', 20]], joins: ['bags'] },
      bags: { kind: K.SOLID, auto: 'ar_bags', joins: ['mud'] },
      wall: { kind: K.SOLID, auto: 'ar_wall' },
      duck: { kind: K.ONEWAY, tile: 'ar_duck' },
      wire: { kind: K.SPIKE, tiles: ['ar_wire', 'ar_wire2'] },
      stump: { kind: K.EMPTY, tile: 'ar_stump' },
      post: { kind: K.EMPTY, tile: 'ar_post' },
      water: { kind: K.WATER, anim: ['ar_water1', 'ar_water2'], rate: 20, sync: true, fg: true },
    },
    legend: { '#': 'mud', S: 'bags', W: 'wall', '=': 'duck', '^': 'wire', i: 'stump', '|': 'post', '~': 'water' },
  });

  // IX. "So we beat on, boats against the current."
  T('bay', {
    terrain: {
      water: { kind: K.DEATH, anim: ['by_water1', 'by_water2', 'by_water3'], rate: 16, sync: true },
      shallows: { kind: K.WATER, anim: ['by_water1', 'by_water2', 'by_water3'], rate: 16, sync: true, fg: true },
      dock: { kind: K.ONEWAY, tile: 'by_dock' },
      piling: { kind: K.SOLID, auto: 'by_piling' },
      rock: { kind: K.SOLID, auto: 'by_rock', vary: [['2', 25]] },
      sand: { kind: K.SOLID, auto: 'by_sand' },
      lawn: { kind: K.SOLID, auto: 'by_lawn', joins: ['sand'] },
      reeds: { kind: K.EMPTY, tile: 'by_reeds' },
    },
    legend: { '~': 'water', w: 'shallows', '-': 'dock', I: 'piling', R: 'rock', s: 'sand', '#': 'lawn', r: 'reeds' },
  });

  /* ------------------------------------------------------------- helpers */
  const INFO = GG.MAPINFO || {};
  /*
   * An arena: once the hero is well inside, the camera locks and the boss
   * wakes. x0 (and y0) are the first column (row) of the locked screen.
   */
  const arena = (x0, bossType, y0) => ({
    init(W) { W.arenaX = x0 * 16; W.arenaY = (y0 || 0) * 16; },
    update(W) {
      const h = W.hero;
      if (!W.camLock && h.x > W.arenaX + 24 && (y0 === undefined || h.y < W.arenaY + 224)) {
        W.camLock = { x: W.arenaX, y: W.arenaY };
        W.minX = W.arenaX;
        const b = W.ents.find((e) => e.type === bossType);
        if (b) b.wake = true;
      }
      if (W.minX && h.x < W.minX) h.x = W.minX;
    },
  });
  const both = (...fns) => (a, b, c, d) => { for (const f of fns) if (f) f(a, b, c, d); };
  /* Fans (and anything else) add to W.blow; it becomes next frame's push. */
  const blow = (base = 0) => (W) => { W.mods.push = base + (W.blow || 0); W.blow = 0; };
  /* Ash on the air: slow gray flecks drifting down. */
  const ashfall = (n = 40) => (g, W) => {
    for (let i = 0; i < n; i++) {
      const x = ((i * 67 + W.t * 0.3 - W.cam.x * 0.2 + Math.sin((W.t + i * 40) / 50) * 6) % 266 + 266) % 266 - 5;
      const y = (i * 41 + W.t * (0.3 + (i % 3) * 0.15)) % 224;
      GG.rect(g, x, y, 1, 1, i % 3 ? 0x10 : 0x00);
    }
  };
  /* Heat: a shimmer of the odd pale pixel rising. */
  const heat = (n = 24) => (g, W) => {
    for (let i = 0; i < n; i++) {
      const x = (i * 89 + Math.sin((W.t + i * 30) / 20) * 3) % 256;
      const y = 224 - ((i * 53 + W.t * 0.6) % 224);
      GG.rect(g, x, y, 1, 2, 0x37);
    }
  };
  /* Mist over night water, in dithered bands. */
  const mist = (g, W) => {
    for (let y = 120; y < 224; y += 2) {
      const a = ((y - 120) / 104) * 0.5;
      for (let x = (y / 2) % 4; x < 256; x += 4) if (GG.bayer(x + Math.floor(W.t / 3) + W.cam.x * 0, y) < a * 0.35) GG.rect(g, x, y, 2, 1, 0x10);
    }
  };

  /* ============================================================ I EAST EGG */
  S({
    key: '1', chapter: 'I', name: 'EAST EGG', place: "THE BUCHANANS' LAWN", when: 'JUNE, 1922', hero: 'nick',
    tileset: 'eastegg', bg: 'eastegg', music: 'eastegg', intro: 'ch1', outro: 'ch1end',
    hint: 'Z JUMP   X THROW A BOND\nENTER PAUSE', hintTouch: 'A JUMP   B THROW A BOND', hintPad: 'A JUMP   B THROW A BOND',
    checkArt: 'lamp', clearText: false,
    legend: {
      p: { e: 'pony' },
      g: { e: 'person', spr: 'gardener', mode: 'chase', speed: 0.4 },
      u: { e: 'person', spr: 'butler', mode: 'throw', shot: 'glass', sight: 7, rate: 90 },
      c: { e: 'curtain', dir: 1, max: 4 },
      d: { e: 'curtain', dir: -1, max: 4, phase: 110 },
      e: { e: 'curtain', dir: 1, max: 5, phase: 60 },
      C: { e: 'couch' },
      T: { e: 'sign', spr: 'tom', text: '"I\'VE GOT A NICE PLACE HERE." HIS EYES FLASHED ABOUT RESTLESSLY.', who: 'TOM BUCHANAN' },
    },
    map: M['1'],
  });

  /* ================================================== II THE VALLEY OF ASHES */
  S({
    key: '2-1', chapter: 'II', sub: 1, part: 'PART ONE', name: 'THE VALLEY OF ASHES', place: 'HALFWAY TO NEW YORK', hero: 'nick',
    tileset: 'ashes', bg: 'ashes', music: 'ashes', intro: 'ch2',
    checkArt: 'gaspump', goalArt: 'garage', crumbleArt: 'crumbleAsh', crumbleChip: 0x10, dust: 0x10,
    hint: 'THE ASH-GREY MEN CRUMBLE.\nTHEY GET UP AGAIN.', clearText: 'REPAIRS', clearSub: 'GEORGE B. WILSON',
    legend: {
      a: { e: 'ashman' },
      y: { e: 'ashman', dig: true },
      c: { e: 'ashcar', range: 6 },
      C: { e: 'ashcar', range: 9 },
      x: { e: 'train', len: 26 },
      z: { e: 'train', len: 40, period: 300 },
      u: { e: 'crumble' },
      v: { e: 'sign', spr: 'wilson', who: 'GEORGE B. WILSON', text: 'HELLO, MR. BUCHANAN-- I MEAN, HELLO. "WHEN ARE YOU GOING TO SELL ME THAT CAR?"' },
    },
    drawFx: ashfall(40),
    map: M['2-1'],
  });

  S(Object.assign({
    key: '2-2', chapter: 'II', sub: 2, part: 'PART TWO', name: 'DR. T. J. ECKLEBURG', place: 'THE DUMPING GROUND', hero: 'nick',
    tileset: 'ashes', bg: 'billboard', music: 'ashes', intro: 'ch2b', outro: 'ch2end', hearts: 4, dust: 0x10,
    hint: 'CLIMB TO MEET HIS GAZE.\nBONDS IN THE PUPILS.', clearText: false,
    legend: { E: { e: 'eckleburg' }, a: { e: 'ashman' } },
    drawBack(g, W, cx, cy) { const b = W.ents.find((e) => e.type === 'eckleburg'); if (b) GG.DEF.eckleburg.drawBoard(b, W, g, cx, cy); },
    drawFx: ashfall(30),
    solverGoal: (INFO['2-2'] || {}).goal,
    map: M['2-2'],
  }, arena((INFO['2-2'] || {}).arena || 0, 'eckleburg')));

  /* ============================================================ III THE PARTY */
  S({
    key: '3', chapter: 'III', name: 'THE PARTY', place: "GATSBY'S BLUE GARDENS", when: 'A SATURDAY NIGHT IN JULY', hero: 'nick',
    tileset: 'party', bg: 'party', music: 'party', intro: 'ch3', outro: 'ch3end', checkArt: 'lantern',
    itemArt: 'rumor', itemIcon: 'rumor', clearText: false,
    itemNames: ['A RUMOR', 'A RUMOR', 'A RUMOR', 'A RUMOR', 'A RUMOR'],
    itemSays: [
      '"SOMEBODY TOLD ME THEY THOUGHT HE KILLED A MAN ONCE."',
      '"IT\'S MORE THAT HE WAS A GERMAN SPY DURING THE WAR."',
      '"IT COULDN\'T BE THAT, BECAUSE HE WAS IN THE AMERICAN ARMY DURING THE WAR."',
      '"ONE TIME HE KILLED A MAN WHO HAD FOUND OUT THAT HE WAS NEPHEW TO VON HINDENBURG AND SECOND COUSIN TO THE DEVIL."',
      '"WELL, HE TOLD ME ONCE HE WAS AN OXFORD MAN." "HOWEVER, I DON\'T BELIEVE IT."',
    ],
    itemWho: ['A GIRL IN YELLOW', 'LUCILLE', 'THE FIRST GIRL', 'THE YOUNG LADIES', 'JORDAN BAKER'],
    lockedText: 'NOBODY HERE HAS EVER MET THE HOST. I SHOULD HEAR WHAT THEY SAY ABOUT HIM FIRST.',
    legend: {
      g: { e: 'guest' },
      f: { e: 'flapper' },
      t: { e: 'twins' },
      w: { e: 'person', spr: 'waiter', mode: 'throw', shot: 'glass', sight: 7, rate: 80 },
      j: { e: 'juicer', dir: -1 },
      J: { e: 'juicer', dir: 1 },
      o: { e: 'sign', spr: 'owleyes', who: 'OWL EYES', text: '"ABSOLUTELY REAL—HAVE PAGES AND EVERYTHING. I THOUGHT THEY\'D BE A NICE DURABLE CARDBOARD."' },
      y: { e: 'sign', spr: 'jordan', who: 'JORDAN BAKER', text: '"I LIKE LARGE PARTIES. THEY\'RE SO INTIMATE. AT SMALL PARTIES THERE ISN\'T ANY PRIVACY."' },
      // The host, twice, before anyone tells Nick who he is. In the novel Nick
      // talks with him for some time before he says "I'm Gatsby".
      a: { e: 'sign', spr: 'host', who: 'THE MAN AT MY TABLE', text: '"YOUR FACE IS FAMILIAR," HE SAID POLITELY. "WEREN\'T YOU IN THE FIRST DIVISION DURING THE WAR?"' },
      b: { e: 'sign', spr: 'host', who: 'THE SAME MAN', text: '"WANT TO GO WITH ME, OLD SPORT? JUST NEAR THE SHORE ALONG THE SOUND."' },
      G: { e: 'npcgoal', spr: 'host', who: 'GATSBY', line: '"I\'M GATSBY," HE SAID SUDDENLY. "HE SMILED UNDERSTANDINGLY--MUCH MORE THAN UNDERSTANDINGLY."' },
    },
    map: M['3'],
  });

  /* ================================================= IV THE QUEENSBORO BRIDGE */
  S({
    key: '4-1', chapter: 'IV', sub: 1, part: 'PART ONE', name: 'THE QUEENSBORO BRIDGE', place: "IN GATSBY'S CAR", when: 'LATE JULY, NINE O\'CLOCK', hero: 'nick',
    tileset: 'bridge', bg: 'bridge', music: 'bridge', intro: 'ch4', outro: 'ch4b',
    autoscroll: 1.1, clearText: 'MANHATTAN', clearSub: 'ANYTHING CAN HAPPEN NOW',
    hint: 'STAY ON THE CAR.\nMIND THE GIRDERS.',
    legend: {
      C: { e: 'car' },
      q: { e: 'bird', spr: 'pigeon', range: 3 },
      h: { e: 'hearse' },
    },
    init(W) { W.copT = 400; const car = W.ents.find((e) => e.type === 'car'); if (car) car.keepGoing = true; },
    update(W) {
      // Motorcycle policemen come up the roadway from behind now and then.
      if (--W.copT <= 0) {
        W.copT = 420 + Math.floor(GG.rand() * 300);
        const y = GG.groundBelow(W, W.cam.x + 8, 9 * 16);
        if (y !== null) { W.add(GG.spawn('cop', W.cam.x - 30, y - 18, { noAdd: true })); W.sfx('horn'); }
      }
      if (W.cam.x >= W.lv.pw - GG.W - 1 && !W.done && !W.dying) W.clear();
    },
    solver: false, solverNote: 'a ride: scripts/gatsby/bots.ts plays it',
    map: M['4-1'],
  });

  S(Object.assign({
    key: '4-2', chapter: 'IV', sub: 2, part: 'PART TWO', name: 'THE CELLAR', place: 'FORTY-SECOND STREET', when: 'NOON', hero: 'nick',
    tileset: 'cellar', bg: 'cellar', music: 'cellar', outro: 'ch4end', checkArt: 'sconce', hearts: 4, roof: true,
    clearText: false,
    legend: {
      w: { e: 'person', spr: 'waiter', mode: 'throw', shot: 'glass', sight: 6, rate: 70 },
      V: { e: 'wolfsheim' },
    },
    solverGoal: (INFO['4-2'] || {}).goal,
    map: M['4-2'],
  }, arena((INFO['4-2'] || {}).arena || 0, 'wolfsheim')));

  /* ============================================================== V THE SHIRTS */
  S({
    key: '5', chapter: 'V', name: 'THE SHIRTS', place: "GATSBY'S HOUSE", when: 'A POURING RAIN', hero: 'nick', roof: true,
    tileset: 'mansion', bg: 'mansion', music: 'mansion', intro: 'ch5', outro: 'ch5end', checkArt: 'sconce', goalArt: 'door',
    itemArt: 'shirtCoral', itemIcon: 'shirtBlue', clearText: false,
    hint: 'THE SHIRTS COME DOWN.\nRIDE THEM UP.',
    lockedText: 'NOT ALL THE SHIRTS ARE HERE YET, OLD SPORT.',
    legend: {
      s: { e: 'shirtfall' },
      S: { e: 'shirtfall', spread: 3, rate: 55 },
      k: { e: 'sign', spr: 'klipspringer', frame: 'exercise1', who: 'KLIPSPRINGER', text: '"I DON\'T PLAY WELL. I DON\'T--HARDLY PLAY AT ALL. I\'M ALL OUT OF PRAC--"' },
      c: { e: 'dropper', art: 'clock', chip: 0x28 },
      u: { e: 'person', spr: 'butler', mode: 'chase', speed: 0.4 },
      1: { e: 'item', art: 'shirtCoral', name: 'CORAL' },
      2: { e: 'item', art: 'shirtGreen', name: 'APPLE-GREEN' },
      3: { e: 'item', art: 'shirtLavender', name: 'LAVENDER' },
      4: { e: 'item', art: 'shirtOrange', name: 'FAINT ORANGE' },
      5: { e: 'item', art: 'shirtBlue', name: 'INDIAN BLUE', say: '"THEY\'RE SUCH BEAUTIFUL SHIRTS."', who: 'DAISY' },
    },
    camDy: -16,
    map: M['5'],
  });

  /* ========================================================= VI LAKE SUPERIOR */
  S({
    key: '6', chapter: 'VI', name: 'LAKE SUPERIOR', place: 'THE SOUTH SHORE', when: '1907', hero: 'jimmy',
    tileset: 'lake', bg: 'lake', music: 'lake', intro: 'ch6', outro: 'ch6end', checkArt: 'beacon',
    itemArt: 'resolve', itemIcon: 'resolve', clearText: false,
    hint: 'JUMP AT A WALL TO KICK OFF IT\nX THROW A CLAM',
    hintTouch: 'PRESS A AT A WALL TO KICK OFF\nB THROW A CLAM', hintPad: 'PRESS A AT A WALL TO KICK OFF\nB THROW A CLAM',
    itemNames: ['GENERAL RESOLVES', 'GENERAL RESOLVES', 'GENERAL RESOLVES', 'GENERAL RESOLVES', 'GENERAL RESOLVES', 'GENERAL RESOLVES'],
    itemSays: [
      '"NO WASTING TIME AT SHAFTERS OR [A NAME, INDECIPHERABLE]"',
      '"NO MORE SMOKEING OR CHEWING."',
      '"BATH EVERY OTHER DAY"',
      '"READ ONE IMPROVING BOOK OR MAGAZINE PER WEEK"',
      '"SAVE $5.00 [CROSSED OUT] $3.00 PER WEEK"',
      '"BE BETTER TO PARENTS"',
    ],
    lockedText: 'NOT YET. JIMMY HAS RESOLVED TO DO BETTER, AND HAS NOT WRITTEN THEM ALL DOWN.',
    legend: {
      q: { e: 'bird', spr: 'gull', range: 4 },
      c: { e: 'crayfish' },
      x: { e: 'dropper', art: 'pinecone', chip: 0x08 },
      b: { e: 'rowboat', range: 26 },
      D: { e: 'npcgoal', spr: 'cody', who: 'DAN CODY', line: 'A WIND? AND WHAT\'S YOUR NAME, BOY? -- JAY GATSBY, SIR.' },
    },
    map: M['6'],
  });

  /* ========================================================== VII THE PLAZA */
  const plazaArena = arena((INFO['7'] || {}).arena || 0, 'tom', (INFO['7'] || {}).arenaY || 0);
  S({
    key: '7', chapter: 'VII', name: 'THE PLAZA HOTEL', place: 'THE HOTTEST DAY', when: 'AUGUST, 1922', hero: 'gatsby', roof: true,
    tileset: 'plaza', bg: 'plaza', music: 'plaza', intro: 'ch7', outro: 'ch7end', checkArt: 'sconce', healthArt: 'julep', hearts: 4,
    hint: 'JUMP AT A WALL TO KICK OFF IT\nX FLICK A CARD', hintTouch: 'PRESS A AT A WALL TO KICK OFF\nB FLICK A CARD', hintPad: 'PRESS A AT A WALL TO KICK OFF\nB FLICK A CARD',
    clearText: false,
    legend: {
      b: { e: 'person', spr: 'bellhop', mode: 'chase', speed: 0.5 },
      f: { e: 'fan', dir: 1 },
      e: { e: 'fan', dir: -1 },
      T: { e: 'tom' },
      D: { e: 'daisy' },
    },
    init: plazaArena.init,
    update: both(plazaArena.update, blow()),
    drawFx: heat(20),
    solverGoal: (INFO['7'] || {}).goal,
    map: M['7'],
  });

  /* ======================================================== VIII THE ARGONNE */
  /*
   * "In the Argonne Forest I took the remains of my machine-gun battalion so
   * far forward that there was a half mile gap on either side of us where the
   * infantry couldn't advance. We stayed there two days and two nights."
   *
   * The trenches teach the dark, the shells and the walls to kick up; at the
   * end the screen locks on the forward position and he has to hold it: day,
   * night, day, night, each harder. Only then does the infantry come up, and
   * the medal with it.
   */
  const HOLD = (INFO['8'] || {}).hold || 0;
  const PHASES = [['DAY ONE', 0.3, 104], ['NIGHT ONE', 0.92, 92], ['DAY TWO', 0.3, 80], ['NIGHT TWO', 0.92, 70]];
  const PHASE_LEN = 600;
  const MEDAL = { e: 'prize', art: 'medal', who: 'THE MEDAL', line: '"ORDERI DI DANILO," RAN THE CIRCULAR LEGEND, "MONTENEGRO, NICOLAS REX." ON THE BACK: "MAJOR JAY GATSBY," I READ, "FOR VALOUR EXTRAORDINARY."' };
  function holdLine(W) {
    const h = W.hero, x0 = HOLD * 16;
    if (!W.hold) {
      if (h.x < x0 + 40 || W.dying) return;
      W.hold = { k: 0, phase: -1 };
      W.camLock = { x: x0, y: W.lv.ph - 224 };
      W.minX = x0;
      W.sfx('alarm');
    }
    if (h.x < W.minX) h.x = W.minX;
    const H = W.hold;
    if (H.done) return;
    H.k++;
    const p = Math.min(PHASES.length - 1, Math.floor(H.k / PHASE_LEN));
    if (p !== H.phase) {
      H.phase = p;
      W.dark = PHASES[p][1];
      W.sfx(p % 2 ? 'whistle' : 'card');
      // Rats come up out of the trench at nightfall; on the last night, gas.
      if (p % 2) W.add(GG.spawn('rat', (HOLD + 9) * 16, 13 * 16, { noAdd: true }));
      if (p === 3) W.add(GG.spawn('ashcloud', (HOLD + 15) * 16, 7 * 16, { cols: [0x29, 0x19, 0x09, 0x18], life: 1200, vx: -0.22, glow: 26, noAdd: true }));
    }
    if (p % 2 && H.k % 210 === 30) W.add(GG.spawn('flare', x0 + 40 + GG.rand() * 176, W.cam.y + 200, { noAdd: true }));
    // Shells: mostly where he stands, the rest anywhere in the position.
    if (H.k % PHASES[p][2] === 20) {
      const near = GG.rand() < 0.7;
      const x = GG.clamp(near ? h.x + h.w / 2 + (GG.rand() - 0.5) * 96 : x0 + 24 + GG.rand() * 208, x0 + 24, x0 + 232);
      const gy = GG.groundBelow(W, x, W.cam.y + 16, 14);
      if (gy !== null) W.add(GG.spawn('shell', x - 16, gy - 24, { noAdd: true }));
    }
    if (H.k >= PHASE_LEN * PHASES.length) {
      H.done = true;
      W.dark = 0.3;
      W.say('"...WHEN THE INFANTRY CAME UP AT LAST THEY FOUND THE INSIGNIA OF THREE GERMAN DIVISIONS AMONG THE PILES OF DEAD."', null, 320);
      // The medal comes to rest on open ground at the left of the position.
      W.add(GG.spawn('prize', x0 + 24, 12 * 16 - 18, Object.assign({ noAdd: true }, MEDAL)));
    }
  }
  S({
    key: '8', chapter: 'VIII', name: 'THE ARGONNE', place: 'TWO DAYS AND TWO NIGHTS', when: 'OCTOBER, 1918', hero: 'major',
    tileset: 'argonne', bg: 'argonne', music: 'argonne', intro: 'ch8', outro: 'ch8end', checkArt: 'fieldlamp',
    dark: 0.92, dust: 0x08, clearText: false,
    hint: 'SHELLS LAND WHERE MARKS BLINK\nKICK UP THE TRENCH WALLS',
    legend: {
      r: { e: 'rat' },
      g: { e: 'ashcloud', cols: [0x29, 0x19, 0x09, 0x18], life: 100000, vx: -0.12, glow: 26 },
    },
    init(W) { W.lightR = 46; W.flareT = 60; W.shellT = 240; W.hold = null; },
    update(W) {
      if (W.hold) { holdLine(W); return; }
      // Flares go up from the far side of no-man's-land.
      if (--W.flareT <= 0) { W.flareT = 240 + Math.floor(GG.rand() * 160); W.add(GG.spawn('flare', W.cam.x + 60 + GG.rand() * 200, W.cam.y + 200, { noAdd: true })); }
      // Shells land ahead of him, more often the farther he gets.
      if (--W.shellT <= 0 && !W.done) {
        W.shellT = Math.max(110, 230 - Math.floor(W.hero.x / 40));
        const x = W.hero.x + W.hero.w / 2 + (GG.rand() < 0.7 ? 40 + GG.rand() * 120 : -30 + GG.rand() * 60);
        const gy = GG.groundBelow(W, x, W.cam.y + 16, 14);
        if (gy !== null && x < HOLD * 16 - 24) W.add(GG.spawn('shell', x - 16, gy - 24, { noAdd: true }));
      }
      holdLine(W);
    },
    // The hold's clock: which day or night it is, and how much is left of it.
    drawHud(g, W) {
      const H = W.hold;
      if (!H || H.done) return;
      const p = Math.max(0, H.phase);
      GG.text(g, PHASES[p][0], GG.W / 2, 22, 0x30, { align: 'center', shadow: 0x0f });
      const left = 1 - (H.k % PHASE_LEN) / PHASE_LEN;
      GG.rect(g, GG.W / 2 - 33, 33, 66, 4, 0x0f);
      GG.rect(g, GG.W / 2 - 32, 34, Math.round(64 * left), 2, p % 2 ? 0x21 : 0x28);
    },
    solverGoal: (INFO['8'] || {}).goal,
    map: M['8'],
  });

  /* =============================================== IX BOATS AGAINST THE CURRENT */
  S({
    key: '9', chapter: 'IX', name: 'BOATS AGAINST THE CURRENT', short: 'AGAINST THE CURRENT', place: 'THE SOUND, AT NIGHT', when: 'AUTUMN, 1922', hero: 'nick',
    tileset: 'bay', bg: 'bay', music: 'current', intro: 'ch9', outro: 'ending', checkArt: 'docklamp', clearText: false,
    hint: 'THE CURRENT PUSHES BACK.\nSO WE BEAT ON.',
    legend: {
      b: { e: 'boat', range: 6, speed: 0.4 },
      B: { e: 'boat', range: 6, speed: 0.5, start: 3 },
      n: { e: 'boat', range: 8, speed: 0.55, start: 4 },
      u: { e: 'buoy' },
      L: { e: 'greenlight', stops: (INFO['9'] || {}).stops || [] },
    },
    update: blow(-0.3),
    drawFx: mist,
    solverMods: { push: -0.3 },
    map: M['9'],
  });
})();
