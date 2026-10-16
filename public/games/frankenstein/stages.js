'use strict';
/*
 * FRANKEN.EXE: tilesets (what each terrain does) and the stages. This file is
 * pure data plus small stage hooks, so the solver can load it in node.
 */
(() => {
  const { K } = FK;
  const T = FK.tileset;

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

  /* Markers most stages share. */
  Object.assign(FK.ENTITY_LEGEND, {
    K: { e: 'checkpoint' },
    r: { e: 'rat' },
    v: { e: 'bat' },
  });
  delete FK.ENTITY_LEGEND.C;

  const S = FK.stage;

  /* ===================================================== 1-1 INGOLSTADT */
  S({
    key: '1-1', num: '1-1', name: 'INGOLSTADT', place: 'THE ROOFTOPS', hero: 'victor',
    tileset: 'town', bg: 'dusk', music: 'ingolstadt', intro: 'ch1',
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
    map: [
      '................................................................................................................................................................................',
      '......................................................................................p.........................................................................................',
      '................................................................................................................................................................................',
      '....................................................p..............................*..........................................................................p.................',
      '.....................................................................c.......##############...........................p.........................................................',
      '..................................*.C...........p...............C....C...====HHHHHHHHHHHHHH...........................................................p...................G.....',
      '...................C.......L############......................K.C....Cr......HHHHHHHHHHHHHH............p...........C.............................L##############################',
      '................r..C.......LHHHHHHHHHHHH.....................############....HHHHHHHHHHHHHH...................C....C.............................LHHHHHHHHHHHHHHHHHHHHHHHHHHHHHH',
      '..P...........##########...LHHHHHHHHHHHH====.................HHHHHHHHHHHH.--.HHHHHHHHHHHHHH...................C.r..C.................+...........LHHHHHHHHHHHHHHHHHHHHHHHHHHHHHH',
      '############..HHHHHHHHHH...LHHHHHHHHHHHH....############M....HHHHHHHHHHHH....HHHHHHHHHHHHHH....r..r.....###############...........########.......LHHHHHHHHHHHHHHHHHHHHHHHHHHHHHH',
      'HHHHHHHHHHHH..HHHHHHHHHH...LHHHHHHHHHHHH....HHHHHHHHHHHH.....HHHHHHHHHHHH....HHHHHHHHHHHHHH##########...HHHHHHHHHHHHHHH---........HHHHHHHH.......LHHHHHHHHHHHHHHHHHHHHHHHHHHHHHH',
      'HHHHHHHHHHHH..HHHHHHHHHH...LHHHHHHHHHHHH....HHHHHHHHHHHH.....HHHHHHHHHHHH....HHHHHHHHHHHHHHHHHHHHHHHH...HHHHHHHHHHHHHHH...........HHHHHHHH.......LHHHHHHHHHHHHHHHHHHHHHHHHHHHHHH',
      'HHHHHHHHHHHH..HHHHHHHHHH.r.LHHHHHHHHHHHH....HHHHHHHHHHHH.....HHHHHHHHHHHH....HHHHHHHHHHHHHHHHHHHHHHHH...HHHHHHHHHHHHHHH...K...w...HHHHHHHr...*...LHHHHHHHHHHHHHHHHHHHHHHHHHHHHHH',
      'HHHHHHHHHHHH~~HHHHHHHHHH%%%%HHHHHHHHHHHH~~~~HHHHHHHHHHHH~~~~~HHHHHHHHHHHH~~~~HHHHHHHHHHHHHHHHHHHHHHHH~~~HHHHHHHHHHHHHHH%%%%%%%%%%%HHHHHHHH%%%%%%%%HHHHHHHHHHHHHHHHHHHHHHHHHHHHHH',
    ],
  });

  /* ================================================== 1-2 THE LECTURE HALL */
  S({
    key: '1-2', num: '1-2', name: 'THE LECTURE HALL', place: 'UNIVERSITY OF INGOLSTADT', hero: 'victor',
    tileset: 'library', bg: 'library', music: 'library', outro: 'ch1end',
    dropArt: 'bookfall', checkArt: 'candle', clearText: 'KREMPE IS SILENCED', clearSub: '',
    legend: {
      b: { e: 'dropper', art: 'bookfall', chip: 0x37 },
      k: { e: 'krempe' },
    },
    init(W) { W.arenaX = 104 * 16; },
    update(W) {
      const h = W.hero;
      if (!W.camLock && h.x > W.arenaX + 24) {
        W.camLock = { x: W.arenaX };
        W.minX = W.arenaX;
        const k = W.ents.find((e) => e.type === 'krempe');
        if (k) k.wake = true;
      }
      if (W.minX && h.x < W.minX) h.x = W.minX;
    },
    map: [
      '.......................................................................................................................B',
      '..............................b...............b.........................b.........b....................................B',
      '..................b....................................................................................................B',
      '....................................................................v..................................................B',
      '.................................v............................LBBB========.............................................B',
      '..........................L============...................+...LBBB.....................................................B',
      '................=====.....L............................L======LBBB.....................................................B',
      '..........................L.............BBB.====.......L......LBBB...........r.......BB................................B',
      '............BB............L.............BBB.........r..L......LBBB.........BBBB......BB....................===...===...B',
      '............BB........BBBBL.............BBB......BBBBBBL......LBBB.........BBBB.====.BB.....BBB........................B',
      '......BBB...BB........BBBBL....BB.......BBB......BBBBBBL......LBBB....BB...BBBB......BB.....BBB........................B',
      '..P...BBB.r.BB........BBBBL....BB...r...BBB......BBBBBBL....K.LBBB....BB...BBBB......BB.....BBB...K.................k..B',
      'FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF',
      'FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF',
    ],
  });

})();
