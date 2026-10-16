'use strict';
/*
 * FRANKEN.EXE art: tilesets and backgrounds (set a). The churchyard and the
 * burial vaults of stage 2, and Victor's lodging house of stage 3-1.
 */
(() => {
  const { left, right, mirror, rot, rep } = FK.tileHelpers;
  const { canvas, px, sky, stars, disc } = FK.bgKit;
  const TA = FK.TA || (FK.TA = {});
  const def = (legend, tiles) => { Object.assign(TA, tiles); FK.tiles(legend, tiles); };
  const SW = FK.W, SH = FK.H;
  /* Paint over a tile's rows: { row: 'string at column' } patches. */
  const patch = (rows, edits) => rows.map((r, y) => {
    const e = edits[y];
    if (!e) return r;
    const [x, s] = e;
    return r.slice(0, x) + s + r.slice(x + s.length);
  });

  /* ============================================================ GRAVE */
  // The churchyard by moonlight. Light falls from the upper left: tops and
  // left faces catch it, lower right faces go to cold shadow.
  const grave = {
    k: 0x0f,
    e: 0x08, E: 0x18,              // earth, a lit clod edge
    d: 0x08, G: 0x18, Y: 0x10,     // dead grass: shade, straw, moonlit tips
    p: 0x00, P: 0x10,              // pebbles
    s: 0x00, S: 0x10, W: 0x30,     // stone: body, lit face, moonlit rim
    t: 0x0c,                       // stone in shadow
    m: 0x0b,                       // moss
    b: 0x10, B: 0x30,              // bone
    o: 0x08, O: 0x18,              // old wood
    i: 0x00, I: 0x10,              // iron
    f: 0x0c, F: 0x2d,              // mist
    r: 0x07,                       // roots
  };

  // Soil: dark pockets, a few lit clod edges, stones half sunk in it.
  // Wraps both ways.
  const dirt = [
    'eeeeeeeeeeeeeeee',
    'eekeeeeeeEeeeeee',
    'eeeeeeeeEekkeeee',
    'eeeeekeeeeeeeeke',
    'eeeeePPeeeeeeeee',
    'keeePppkeeeeeeee',
    'eeeekkkeeeeeEeee',
    'eeEeeeeeeeeEkkee',
    'eEkkeeeeeeeeeeee',
    'eeeeeeeeeeekeeek',
    'eeeeeeekeeeeeeee',
    'eeeeeeeeeeeePPee',
    'ekeeeeEeeeePppke',
    'eeeeeEkkeeeekkke',
    'eeeeeeeeeeeeeeee',
    'eeekeeeeekeeEeee',
  ];
  // A buried bone, and a root snaking down.
  const dirt2 = [
    'eeeeeeeeeeeeeeee',
    'eekeeeeeeeeerkee',
    'eeeeeeeeEeeeerke',
    'eeeeekeeeeeerkee',
    'eeeeeeeeeeeeerke',
    'keeeeeeeeeeeerke',
    'eeekkeeeeeeerkee',
    'eekBbkkkkkkerkee',
    'eekbBBBBBBbkkBke',
    'eeekbkkkkkkbBbke',
    'eeekBkeeeeekkkee',
    'eeeekeeeeeeeeeee',
    'ekeeeeEeeeeeekee',
    'eeeeeEkkeeeeeeee',
    'eeeeeeeeeePPeeee',
    'eeekeeeeekPpkeee',
  ];
  // Dead grass over the soil: tufts with moonlit tips, a matted fringe,
  // and a black line where the turf meets the earth.
  const sod = [
    '..Y.....Y....Y..',
    '.YG..Y.YGd..YGd.',
    'YGGdYGdGGGdYGGGd',
    'GGGGGGGGdGGGGdGG',
    'dGdGdGddGddGdGdd',
    'kdkdkkdkkdkdkkdk',
    'ekeekeeeekeeekee',
  ];
  const earth_t = [...sod, ...dirt.slice(7)];
  const earth_tl = patch(earth_t, {
    0: [0, '....'], 1: [0, '....'], 2: [0, '..kY'], 3: [0, '.kGG'], 4: [0, 'kdGd'],
    5: [0, 'kk'], 6: [0, 'k'], 7: [0, 'k'], 8: [0, 'k'], 9: [0, 'k'], 10: [0, 'k'], 11: [0, 'k'],
    12: [0, 'k'], 13: [0, 'k'], 14: [0, 'k'], 15: [0, 'k'],
  });
  const earth_tr = patch(earth_t, {
    0: [12, '....'], 1: [12, 'YGd.'], 2: [12, 'GGdk'], 3: [12, 'GdGk'], 4: [12, 'dGdk'],
    5: [14, 'kk'], 6: [15, 'k'], 7: [15, 'k'], 8: [15, 'k'], 9: [15, 'k'], 10: [15, 'k'], 11: [15, 'k'],
    12: [15, 'k'], 13: [15, 'k'], 14: [15, 'k'], 15: [15, 'k'],
  });

  // Ashlar: big blocks in two courses, each lit on its top and left edge.
  const ashlar = [
    'SSSSSSSSSSkSSSSS',
    'SssssssssstkSsss',
    'SsssssssssskSsss',
    'Sssssssssstkssss',
    'Ssssssssssskssts',
    'Ssstsssssstkssss',
    'ttttttttttkktttt',
    'kkkkkkkkkkkkkkkk',
    'SSSSSkSSSSSSSSSS',
    'sssstkSsssssssss',
    'ssssskSsssssssss',
    'ssmstkSsstssssss',
    'sssstkSsssssssss',
    'smmmtkSssssssmss',
    'tttttktttttttmmt',
    'kkkkkkkkkkkkkkkk',
  ];
  // The same wall with a crack running through one block.
  const ashlar3 = patch(ashlar, {
    1: [3, 'kss'], 2: [3, 'ksk'], 3: [4, 'k'], 4: [4, 'kk'], 5: [5, 'k'],
    9: [10, 'k'], 10: [10, 'kk'], 11: [11, 'k'], 12: [11, 'kk'],
  });
  // Capstones: a coping that overhangs, throwing a shadow on the course below.
  const wall_t = [
    'WWWWWWWWSWWWWWWW',
    'SSSSSSSSkSSSSSSS',
    'sssssssstSssssss',
    'sssssssstSssssss',
    'tttttttttktttttt',
    'kkkkkkkkkkkkkkkk',
    'tttttttttttttttt',
    'kkkkkkkkkkkkkkkk',
    ...ashlar.slice(8),
  ];
  // A carved plaque: skull and crossbones in a sunken panel.
  const wall_m2 = [
    'SSSSSSSSSSSSSSsk',
    'Skkkkkkkkkkkkksk',
    'SkttttttttttttSk',
    'Skttttkkkkttttsk',
    'SktttkWWSSktttSk',
    'SkttkWSSSSskttsk',
    'SkttkSkkSkkkttSk',
    'SkttkSkkSkkkttsk',
    'SkttkSSSkSsktt Sk',
    'SktttkSsSskttt Sk',
    'SkWkttkSkSktkWsk',
    'SktSkttkkkttStSk',
    'SkttkSkttkSkttsk',
    'SktSkttttttkStSk',
    'SSSSSSSSSSSSSSSk',
    'kkkkkkkkkkkkkkkk',
  ].map((r) => r.replace(' ', ''));

  def(grave, {
    grave_earth_t: earth_t,
    grave_earth_tl: earth_tl,
    grave_earth_tr: earth_tr,
    grave_earth_m: dirt,
    grave_earth_m2: dirt2,
    grave_earth_ml: left(dirt, 'k'),
    grave_earth_mr: right(dirt, 'k'),
    grave_wall_t: wall_t,
    grave_wall_tl: left(wall_t, ['W', 'S', 'k', 'k', 'k', 'k', 'k', 'k', 'k', 'k', 'k', 'k', 'k', 'k', 'k', 'k']),
    grave_wall_tr: right(wall_t, ['k', 'k', 'tk', 'tk', 'tk', 'k', 'k', 'k', 'k', 'k', 'k', 'k', 'k', 'k', 'k', 'k']),
    grave_wall_m: ashlar,
    grave_wall_m2: wall_m2,
    grave_wall_m3: ashlar3,
    grave_wall_ml: left(ashlar, 'k'),
    grave_wall_mr: right(ashlar, 'k'),
  });
})();
