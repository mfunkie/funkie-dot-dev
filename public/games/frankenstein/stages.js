'use strict';
/*
 * FRANKEN.EXE: tilesets (what each terrain does) and the stages. Pure data plus
 * small hooks, so the solver can load it in node. Maps live in maps.js.
 */
(() => {
  const { K } = FK;
  const T = FK.tileset;
  const S = FK.stage;
  const M = FK.MAPS;

  /* ------------------------------------------------------------ tilesets */
  T('town', {
    terrain: {
      roof: { kind: K.SOLID, auto: 'town_roof' },
      wall: { kind: K.SOLID, auto: 'town_wall', vary: [['w', 20], ['d', 34], ['x', 46]] },
      chim: { kind: K.SOLID, auto: 'town_chim' },
      cob: { kind: K.SOLID, auto: 'town_cob' },
      beam: { kind: K.ONEWAY, tile: 'town_beam_t' },
      sill: { kind: K.ONEWAY, tile: 'town_sill_t' },
      ladder: { kind: K.LADDER, tile: 'town_ladder' },
      canal: { kind: K.DEATH, anim: ['town_canal1', 'town_canal2'], rate: 18, sync: true },
    },
    legend: { '#': 'roof', H: 'wall', C: 'chim', '%': 'cob', '=': 'beam', '-': 'sill', L: 'ladder', '~': 'canal' },
  });
  T('library', {
    terrain: {
      floor: { kind: K.SOLID, auto: 'lib_floor' },
      case: { kind: K.SOLID, auto: 'lib_case', vary: [['2', 30]] },
      shelf: { kind: K.ONEWAY, tile: 'lib_shelf_t' },
      ladder: { kind: K.LADDER, tile: 'lib_ladder' },
    },
    legend: { F: 'floor', B: 'case', '=': 'shelf', L: 'ladder' },
  });
  T('grave', {
    terrain: {
      earth: { kind: K.SOLID, auto: 'grave_earth', vary: [['2', 18]] },
      wall: { kind: K.SOLID, auto: 'grave_wall', vary: [['2', 15]] },
      fence: { kind: K.SPIKE, tile: 'grave_fence' },
      tomb: { kind: K.SOLID, tile: 'grave_tomb' },
      cross: { kind: K.SOLID, tile: 'grave_cross' },
      plank: { kind: K.ONEWAY, tile: 'grave_plank' },
      ladder: { kind: K.LADDER, tile: 'grave_ladder' },
      pit: { kind: K.DEATH, anim: ['grave_pit1', 'grave_pit2'], rate: 20 },
    },
    legend: { '#': 'earth', W: 'wall', '^': 'fence', T: 'tomb', X: 'cross', '=': 'plank', L: 'ladder', _: 'pit' },
  });
  T('crypt', {
    terrain: {
      brick: { kind: K.SOLID, auto: 'crypt_brick', vary: [['2', 8], ['3', 20]] },
      shelf: { kind: K.ONEWAY, tile: 'crypt_shelf' },
      spike: { kind: K.SPIKE, tile: 'crypt_spike' },
      bones: { kind: K.EMPTY, tile: 'crypt_bones' },
      torch: { kind: K.EMPTY, anim: ['crypt_torch1', 'crypt_torch2', 'crypt_torch3'], rate: 6 },
      ladder: { kind: K.LADDER, tile: 'crypt_ladder' },
      pillar: { kind: K.EMPTY, tile: 'crypt_pillar' },
    },
    legend: { B: 'brick', '=': 'shelf', '^': 'spike', o: 'bones', i: 'torch', L: 'ladder', '|': 'pillar' },
  });
  T('lab', {
    terrain: {
      floor: { kind: K.SOLID, auto: 'lab_floor' },
      wall: { kind: K.SOLID, auto: 'lab_wall', vary: [['2', 20]] },
      beam: { kind: K.ONEWAY, tile: 'lab_beam' },
      ladder: { kind: K.LADDER, tile: 'lab_ladder' },
      crate: { kind: K.SOLID, tile: 'lab_crate' },
      shelf: { kind: K.ONEWAY, tile: 'lab_shelf' },
      gear: { kind: K.EMPTY, anim: ['lab_gear1', 'lab_gear2'], rate: 10 },
      coil: { kind: K.EMPTY, anim: ['lab_coil1', 'lab_coil2'], rate: 7 },
      window: { kind: K.EMPTY, anim: ['lab_window1', 'lab_window1', 'lab_window1', 'lab_window1', 'lab_window1', 'lab_window2'], rate: 14 },
    },
    legend: { W: 'wall', F: 'floor', '=': 'beam', L: 'ladder', C: 'crate', s: 'shelf', g: 'gear', o: 'coil', n: 'window' },
  });
  T('rock', {
    terrain: {
      ground: { kind: K.SOLID, auto: 'rock_ground', vary: [['2', 20]], joins: ['cliff'] },
      cliff: { kind: K.SOLID, auto: 'rock_cliff', vary: [['2', 20]], joins: ['ground'] },
      ledge: { kind: K.ONEWAY, tile: 'rock_ledge' },
      bush: { kind: K.EMPTY, tile: 'rock_bush' },
      lake: { kind: K.DEATH, anim: ['rock_water1', 'rock_water2', 'rock_water3'], rate: 10 },
    },
    legend: { '#': 'ground', R: 'cliff', '=': 'ledge', b: 'bush', '~': 'lake' },
  });
  T('ice', {
    terrain: {
      snow: { kind: K.SOLID, auto: 'ice_snow' },
      ice: { kind: K.ICE, auto: 'ice_block', vary: [['2', 25]] },
      rock: { kind: K.SOLID, auto: 'ice_rock' },
      ledge: { kind: K.ONEWAY, tile: 'ice_ledge' },
      crevasse: { kind: K.DEATH, tile: 'ice_crevasse' },
    },
    legend: { S: 'snow', I: 'ice', R: 'rock', '=': 'ledge', _: 'crevasse' },
  });
  T('wood', {
    terrain: {
      snow: { kind: K.SOLID, auto: 'wood_snow', vary: [['2', 15]] },
      branch: { kind: K.ONEWAY, tile: 'wood_branch', under: 'trunk' },
      trunk: { kind: K.EMPTY, tile: 'wood_trunk' },
      crown: { kind: K.EMPTY, tile: 'wood_crown' },
      logs: { kind: K.BREAK, auto: 'wood_log' },
      cottage: { kind: K.SOLID, auto: 'wood_cottage', vary: [['w', 30]] },
      thatch: { kind: K.SOLID, auto: 'wood_thatch' },
    },
    legend: { S: 'snow', '=': 'branch', t: 'trunk', v: 'crown', O: 'logs', H: 'cottage', A: 'thatch' },
  });
  T('river', {
    terrain: {
      ground: { kind: K.SOLID, auto: 'river_ground', vary: [['2', 20]] },
      rock: { kind: K.SOLID, auto: 'river_rock' },
      water: { kind: K.WATER, anim: ['river_water1', 'river_water2', 'river_water3'], rate: 10, fg: true },
      deep: { kind: K.WATER, anim: ['river_deep1', 'river_deep2'], rate: 16, fg: true },
      bridge: { kind: K.ONEWAY, tile: 'river_bridge' },
    },
    legend: { '#': 'ground', R: 'rock', '~': 'water', w: 'deep', '=': 'bridge' },
  });
  T('coast', {
    terrain: {
      rock: { kind: K.SOLID, auto: 'coast_rock', vary: [['2', 20]], joins: ['turf'] },
      turf: { kind: K.SOLID, auto: 'coast_turf', joins: ['rock'] },
      ledge: { kind: K.ONEWAY, tile: 'coast_ledge' },
      sea: { kind: K.DEATH, anim: ['coast_sea1', 'coast_sea2', 'coast_sea3'], rate: 12 },
      hut: { kind: K.EMPTY, auto: 'coast_hut', vary: [['w', 25]] },
    },
    legend: { R: 'rock', '#': 'turf', '=': 'ledge', '~': 'sea', H: 'hut' },
  });
  T('sea', {
    terrain: {
      wreck: { kind: K.SOLID, auto: 'sea_wreck' },
      rock: { kind: K.SOLID, auto: 'sea_rock' },
      water: { kind: K.DEATH, anim: ['sea_water1', 'sea_water2', 'sea_water3'], rate: 9 },
      deep: { kind: K.DEATH, anim: ['sea_deep1', 'sea_deep2'], rate: 14 },
      crate: { kind: K.SOLID, tile: 'sea_crate' },
    },
    legend: { X: 'wreck', R: 'rock', '~': 'water', w: 'deep', C: 'crate' },
  });
  T('inn', {
    terrain: {
      floor: { kind: K.SOLID, auto: 'inn_floor' },
      wall: { kind: K.SOLID, auto: 'inn_wall', vary: [['2', 12], ['3', 22]] },
      table: { kind: K.ONEWAY, tile: 'inn_table' },
      landing: { kind: K.ONEWAY, tile: 'inn_landing' },
      ladder: { kind: K.LADDER, tile: 'inn_ladder' },
      window: { kind: K.EMPTY, anim: ['inn_window1', 'inn_window1', 'inn_window1', 'inn_window1', 'inn_window1', 'inn_window1', 'inn_window2'], rate: 16 },
      sconce: { kind: K.EMPTY, anim: ['inn_candle1', 'inn_candle2', 'inn_candle3'], rate: 7 },
    },
    legend: { F: 'floor', W: 'wall', '=': 'table', '-': 'landing', L: 'ladder', n: 'window', i: 'sconce' },
  });
  T('tundra', {
    terrain: {
      snow: { kind: K.SOLID, auto: 'tundra_snow', vary: [['2', 18]] },
      ice: { kind: K.ICE, auto: 'tundra_ice' },
      rock: { kind: K.SOLID, auto: 'tundra_rock' },
      ledge: { kind: K.ONEWAY, tile: 'tundra_ledge' },
      birch: { kind: K.EMPTY, tile: 'tundra_birch' },
    },
    legend: { S: 'snow', I: 'ice', R: 'rock', '=': 'ledge', t: 'birch' },
  });
  T('arctic', {
    terrain: {
      floe: { kind: K.ICE, auto: 'arctic_floe' },
      pack: { kind: K.SOLID, auto: 'arctic_pack' },
      water: { kind: K.DEATH, anim: ['arctic_water1', 'arctic_water2', 'arctic_water3'], rate: 12 },
    },
    legend: { I: 'floe', Q: 'pack', '~': 'water' },
  });

  /* Markers most stages share. */
  Object.assign(FK.ENTITY_LEGEND, { K: { e: 'checkpoint' }, r: { e: 'rat' }, v: { e: 'bat' } });
  delete FK.ENTITY_LEGEND.C;

  /* ------------------------------------------------------------- weather */
  /* Lightning at random intervals: sets W.flash (the renderer and the dark
   * overlay both react to it) and plays thunder. */
  const lightning = (lo, hi) => (W) => {
    if (W.nextBolt === undefined) W.nextBolt = lo;
    if (--W.nextBolt <= 0) {
      W.flash = 10; W.sfx('thunder');
      W.nextBolt = lo + Math.floor(Math.random() * (hi - lo));
    }
  };
  const rain = (col = 0x2d, n = 70, slant = 1) => (g, W) => {
    for (let i = 0; i < n; i++) {
      const x = (i * 53 + W.t * 2 * slant) % 290 - 17, y = (i * 89 + W.t * 7) % 224;
      FK.rect(g, x, y, 1, 4, W.flash > 0 ? 0x30 : col);
    }
  };
  const snowfall = (n = 50, wind = 0.3) => (g, W) => {
    for (let i = 0; i < n; i++) {
      const x = ((i * 61 + Math.sin((W.t + i * 30) / 30) * 8 + W.t * wind - W.cam.x * 0.6) % 266 + 266) % 266 - 5;
      const y = (i * 47 + W.t * (0.5 + (i % 3) * 0.3)) % 224;
      FK.rect(g, x, y, i % 4 === 0 ? 2 : 1, i % 4 === 0 ? 2 : 1, 0x30);
    }
  };
  const both = (...fns) => (a, b, c, d) => { for (const f of fns) f(a, b, c, d); };
  /*
   * An arena: once the hero is well inside, the camera locks and the boss wakes.
   * x0 is the first column of the map's last screen (map width - 16), so the
   * locked view holds the whole room and the boss stands in it.
   */
  const arena = (x0, bossType) => ({
    init(W) { W.arenaX = x0 * 16; },
    update(W) {
      const h = W.hero;
      if (!W.camLock && h.x > W.arenaX + 24) {
        W.camLock = { x: W.arenaX };
        W.minX = W.arenaX;
        const b = W.ents.find((e) => e.type === bossType);
        if (b) b.wake = true;
      }
      if (W.minX && h.x < W.minX) h.x = W.minX;
    },
  });

  /* ===================================================== 1 INGOLSTADT */
  S({
    key: '1-1', num: '1-1', name: 'INGOLSTADT', place: 'THE ROOFTOPS', hero: 'victor',
    tileset: 'town', bg: 'dusk', music: 'ingolstadt', intro: 'ch1',
    hint: 'Z JUMP   X THROW A FLASK\nUP/DOWN CLIMB   ENTER PAUSE', hintTouch: 'A JUMP   B THROW A FLASK', hintPad: 'A JUMP   B/X THROW A FLASK',
    itemArt: 'tome', itemIcon: 'tome', goalArt: 'door',
    itemNames: ['CORNELIUS AGRIPPA', 'PARACELSUS', 'ALBERTUS MAGNUS'],
    itemSays: [
      'MY FATHER CALLED IT SAD TRASH. I READ IT WITH THE GREATEST AVIDITY.',
      'THE ELIXIR OF LIFE! WHAT GLORY WOULD ATTEND THE DISCOVERY...',
      'THE LAST OF MY OLD MASTERS. NOW, TO THE UNIVERSITY.',
    ],
    lockedText: 'MY THREE OLD BOOKS ARE STILL SOMEWHERE ON THESE ROOFS.',
    clearSub: 'THE UNIVERSITY AT LAST',
    legend: {
      p: { e: 'bird', spr: 'pigeon', range: 3 },
      c: { e: 'cat' },
      w: { e: 'person', spr: 'watchman', lantern: true, mode: 'chase' },
      M: { e: 'platform', range: 3, speed: 0.55, len: 2 },
    },
    map: M['1-1'],
  });

  S(Object.assign({
    key: '1-2', num: '1-2', name: 'THE LECTURE HALL', place: 'UNIVERSITY OF INGOLSTADT', hero: 'victor',
    tileset: 'library', bg: 'library', music: 'library', outro: 'ch1end',
    checkArt: 'candle', clearText: 'KREMPE IS SILENCED', clearSub: '',
    legend: {
      b: { e: 'dropper', art: 'bookfall', chip: 0x37 },
      k: { e: 'krempe' },
    },
    map: M['1-2'],
  }, arena(104, 'krempe')));

  /* ================================================== 2 THE CHARNEL HOUSE */
  S({
    key: '2-1', num: '2-1', name: 'THE CHARNEL HOUSE', place: 'THE CHURCHYARD, MIDNIGHT', hero: 'victor',
    tileset: 'grave', bg: 'graveyard', music: 'graveyard', intro: 'ch2',
    itemArt: 'bone', itemIcon: 'bone', goalArt: 'gate', clearSub: 'DOWN INTO THE VAULTS',
    itemNames: ['A THIGH BONE', 'A SHIN BONE', 'AN ARM BONE', 'A COLLAR BONE', 'A HIP BONE'],
    lockedText: 'FIVE BONES. I HAVE NOT FOUND THEM ALL.',
    legend: {
      c: { e: 'bird', spr: 'crow', range: 4 },
      w: { e: 'person', spr: 'watchman', lantern: true, mode: 'chase', sight: 7 },
      M: { e: 'platform', range: 4, speed: 0.5, len: 2, art: 'plank' },
    },
    map: M['2-1'],
  });

  S(Object.assign({
    key: '2-2', num: '2-2', name: 'THE VAULTS', place: 'BENEATH THE CHURCH', hero: 'victor',
    tileset: 'crypt', bg: 'crypt', music: 'crypt', intro: 'ch2b', outro: 'ch2end',
    checkArt: 'candle', clearText: 'THE SEXTON SLEEPS', clearSub: '',
    legend: {
      c: { e: 'crumble' },
      S: { e: 'sexton' },
    },
    map: M['2-2'],
  }, arena(136, 'sexton')));

  /* ======================================== 3 A DREARY NIGHT OF NOVEMBER */
  S({
    key: '3-1', num: '3-1', name: 'A DREARY NIGHT', place: 'NOVEMBER. THE TOP OF THE HOUSE', hero: 'victor',
    tileset: 'lab', bg: 'towerIn', music: 'tower', intro: 'ch3', outro: 'creation',
    itemArt: 'jar', itemIcon: 'jar', goalArt: 'door', checkArt: 'candle',
    itemNames: ['A LEYDEN JAR', 'A LEYDEN JAR', 'A LEYDEN JAR'],
    lockedText: 'THE INSTRUMENTS OF LIFE. I NEED ALL THREE JARS.',
    clearText: 'THE INSTRUMENTS OF LIFE', clearSub: 'ARE GATHERED',
    legend: {
      z: { e: 'arc', len: 4, period: 160, onFor: 60 },
      d: { e: 'dropper', art: 'rock', chip: 0x10 },
    },
    update: lightning(240, 420),
    map: M['3-1'],
  });

  S({
    key: '3-2', num: '3-2', name: 'FLIGHT', place: 'THE STREETS OF INGOLSTADT', hero: 'victor',
    tileset: 'town', bg: 'nightTown', music: 'chase', outro: 'ch3end',
    autoscroll: 0.9, goalArt: 'door', clearText: 'ESCAPED', clearSub: 'FOR NOW',
    init(W) {
      W.add(FK.spawn('pursuer', 2, 12 * 16 - 28, {}));
      W.say('HE FOLLOWS! RUN!', 'VICTOR', 120);
    },
    update: lightning(300, 600),
    drawFx: rain(0x2d, 80),
    map: M['3-2'],
  });

  /* ============================================================ 4 THE STORM */
  S({
    key: '4', num: '4', name: 'THE STORM', place: 'GENEVA, BY NIGHT', hero: 'victor',
    tileset: 'rock', bg: 'storm', music: 'storm', intro: 'ch4', outro: 'ch4end',
    dark: 0.94, goalArt: 'none', clearText: 'THERE! IN THE LIGHTNING!', clearSub: '',
    hint: 'WATCH FOR THE LIGHTNING', hintTouch: 'WATCH FOR THE LIGHTNING', hintPad: 'WATCH FOR THE LIGHTNING',
    legend: {
      d: { e: 'dropper', art: 'rock', chip: 0x10 },
    },
    init(W) { W.lightR = 50; W.add(FK.spawn('glimpse', 200 * 16, 1 * 16, {})); },
    update: lightning(110, 260),
    drawFx: rain(0x00, 90, 1.5),
    map: M['4'],
  });

  /* ======================================================== 5 MER DE GLACE */
  S(Object.assign({
    key: '5', num: '5', name: 'MER DE GLACE', place: 'ABOVE CHAMOUNIX', hero: 'victor',
    tileset: 'ice', bg: 'glacier', music: 'glacier', intro: 'ch5', outro: 'ch5end',
    crumbleArt: 'crumbleIce', clearText: false,
    legend: {
      d: { e: 'dropper', art: 'icicle', chip: 0x31 },
      c: { e: 'crumble', art: 'crumbleIce' },
      k: { e: 'bird', spr: 'crow', range: 4 },
      M: { e: 'creatureBoss' },
    },
    map: M['5'],
  }, arena(180, 'creatureBoss')));

  /* ================================================ 6 THE CREATURE'S TALE */
  S({
    key: '6', num: '6', name: 'THE COTTAGE', place: 'THE FOREST NEAR INGOLSTADT', hero: 'creature',
    tileset: 'wood', bg: 'winterWood', music: 'cottage', intro: 'ch6', outro: 'ch6end',
    hint: 'X PUNCH: IT BREAKS LOGS\nHE JUMPS HIGHER, RUNS FASTER', hintTouch: 'B PUNCH: IT BREAKS LOGS', hintPad: 'B/X PUNCH: IT BREAKS LOGS',
    itemArt: 'wood', itemIcon: 'wood', goalArt: 'door', clearText: false,
    itemArts: ['wood', 'wood', 'paradise', 'wood', 'plutarch', 'wood', 'werter'],
    itemNames: ['FIREWOOD', 'FIREWOOD', 'PARADISE LOST', 'FIREWOOD', "PLUTARCH'S LIVES", 'FIREWOOD', 'THE SORROWS OF WERTER'],
    itemSays: [
      'THE COTTAGERS SPEND HALF THEIR DAYS GATHERING WOOD. I WILL DO IT FOR THEM, AT NIGHT.',
      null,
      'A SATCHEL IN THE WOODS! "PARADISE LOST". I READ OF ADAM, AND OF SATAN, AND THOUGHT OF MYSELF.',
      null,
      'PLUTARCH TAUGHT ME HIGH THOUGHTS. I ADMIRED THE PEACEABLE LAWGIVERS.',
      null,
      'WERTER. I WEPT FOR HIM, AND WONDERED: WHO WAS I? WHERE WAS I GOING?',
    ],
    lockedText: 'THE WOOD AND THE BOOKS. I HAVE NOT GATHERED THEM ALL.',
    legend: {
      f: { e: 'fire' },
      u: { e: 'person', spr: 'villager', mode: 'throw', sight: 9, speed: 0.3 },
      U: { e: 'person', spr: 'villager2', mode: 'throw', sight: 8, speed: 0.35 },
      w: { e: 'wolf' },
      k: { e: 'bird', spr: 'crow', range: 4 },
    },
    onGoal(W) { return FK.felixScene(W); },
    map: M['6'],
    drawFx: snowfall(40, 0.2),
  });

  S({
    key: '7', num: '7', name: 'THE ROAD', place: 'TOWARD GENEVA', hero: 'creature',
    tileset: 'river', bg: 'autumn', music: 'road', intro: 'ch7', outro: 'ch7end',
    hint: 'IN WATER, PRESS JUMP TO SWIM', hintTouch: 'IN WATER, PRESS A TO SWIM', hintPad: 'IN WATER, PRESS A TO SWIM',
    itemIcon: 'girl', goalArt: 'none', clearText: false,
    lockedText: 'THE GIRL! SHE FELL INTO THE RIVER!',
    legend: {
      c: { e: 'bird', spr: 'crow', range: 4 },
      g: { e: 'girl' },
      s: { e: 'shore' },
      x: { e: 'rusticSpot' },
    },
    map: M['7'],
  });

  /* ============================================================ 8 ORKNEY */
  S({
    key: '8-1', num: '8-1', name: 'THE ORKNEYS', place: 'THE REMOTEST ISLAND', hero: 'victor',
    tileset: 'coast', bg: 'orkney', music: 'orkney', intro: 'ch8', outro: 'ch8b',
    goalArt: 'door', clearText: false,
    legend: {
      q: { e: 'bird', spr: 'gull', range: 5 },
      c: { e: 'crumble' },
    },
    drawFx: rain(0x10, 30, 2),
    map: M['8-1'],
  });

  S({
    key: '8-2', num: '8-2', name: 'THE SEA', place: 'ADRIFT', hero: 'victor',
    tileset: 'sea', bg: 'stormSea', music: 'sea', outro: 'ch8end',
    goalArt: 'none', clearText: 'LAND!', clearSub: 'THE COAST OF IRELAND',
    legend: {
      q: { e: 'bird', spr: 'gull', range: 4 },
      M: { e: 'platform', axis: 'y', range: 1, speed: 0.35, len: 2, art: 'plank' },
    },
    update: lightning(200, 420),
    drawFx: rain(0x10, 70, 2),
    map: M['8-2'],
  });

  /* =================================================== 9 THE WEDDING NIGHT */
  S({
    key: '9', num: '9', name: 'THE WEDDING NIGHT', place: 'THE INN AT EVIAN', hero: 'victor',
    tileset: 'inn', bg: 'innIn', music: 'inn', intro: 'ch9', outro: 'ch9end',
    dark: 0.88, itemArt: 'candle', itemIcon: 'candle', goalArt: 'door', checkArt: 'candle', clearText: false,
    itemNames: ['LIT', 'LIT', 'LIT', 'LIT', 'LIT'],
    lockedText: 'NOT YET. I MUST LIGHT EVERY ROOM AND SEARCH IT FIRST.',
    onItem(W, e) { W.add(FK.spawn('flame', e.x, e.y - 2, {})); },
    init(W) { W.lightR = 44; W.add(FK.spawn('shadow', 0, 0, {})); },
    update: lightning(400, 800),
    map: M['9'],
  });

  /* ======================================================= 10 THE PURSUIT */
  S({
    key: '10-1', num: '10-1', name: 'THE PURSUIT', place: 'THE WILDS OF RUSSIA', hero: 'victor',
    tileset: 'tundra', bg: 'tundra', music: 'pursuit', intro: 'ch10',
    goalArt: 'none', clearText: 'THE FROZEN OCEAN', clearSub: '',
    legend: {
      a: { e: 'wolf' },
      h: { e: 'food' },
      1: { e: 'sign', art: 'carving', text: '"MY REIGN IS NOT YET OVER. YOU LIVE, AND MY POWER IS COMPLETE. FOLLOW ME."', who: 'CUT INTO THE BARK' },
      2: { e: 'sign', art: 'carving', text: '"I SEEK THE EVERLASTING ICES OF THE NORTH, WHERE YOU WILL FEEL THE MISERY OF COLD AND FROST, TO WHICH I AM IMPASSIVE."', who: 'CUT INTO THE BARK' },
      3: { e: 'sign', art: 'carving', text: '"COME ON, MY ENEMY; WE HAVE YET TO WRESTLE FOR OUR LIVES."', who: 'CUT INTO THE BARK' },
    },
    drawFx: snowfall(90, 1.4),
    map: M['10-1'],
  });

  S({
    key: '10-2', num: '10-2', name: 'THE FROZEN OCEAN', place: 'NOT A MILE BEHIND HIM', hero: 'victor',
    tileset: 'arctic', bg: 'arctic', music: 'arctic', intro: 'ch10b', outro: 'ending',
    autoscroll: 0.95, goalArt: 'none', clearText: false,
    legend: {
      M: { e: 'platform', axis: 'y', range: 1, speed: 0.3, len: 2, art: 'floe', ice: true },
    },
    init(W) { W.add(FK.spawn('quarry', 0, 0, {})); },
    drawFx: snowfall(40, 0.8),
    map: M['10-2'],
  });
})();
