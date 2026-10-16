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
    o: 0x08, O: 0x00,              // old wood, silvered by weather
    i: 0x00, I: 0x10,              // iron
    f: 0x0c, F: 0x2d,              // mist
    r: 0x07,                       // roots
  };

  // The earth has its own, colder palette: near-black loam, gray grit, and
  // a mat of dead olive grass whose top edge catches the moon.
  const soil = {
    k: 0x0f, e: 0x08, x: 0x2d, P: 0x00, p: 0x2d,
    G: 0x0b, d: 0x0f, Y: 0x10,
    B: 0x10, b: 0x00, r: 0x2d,
  };
  // Loam: dark lumps packed in black, each lump's top edge catching a
  // little moonlight as grit. Wraps both ways.
  const dirt = [
    'exxkkkekeeeeeeke',
    'eeekkkkkkeeeeeke',
    'eeexkkkkkkkxxkkk',
    'kkkekkkkxxxeeexx',
    'kkkkxekkkeeeeeek',
    'kkkkeexxekkkkkkk',
    'eekxeeeeeekexxee',
    'eekeeeeeeekeeeee',
    'eekkeeeeeekkeeee',
    'ekkkkkkkkkkkkeee',
    'kkkkexeexkkkekkk',
    'eekkeeeekkeeexkk',
    'eexekeekkxeeeekx',
    'eeekkkkkkeeeekke',
    'kkkkeeekkkkkkxkk',
    'kkkxeeekkeeexekk',
  ];
  // A buried bone, and a pale root threading down past it.
  const dirt2 = patch(dirt, {
    1: [12, 'r'], 2: [11, 'r'], 3: [11, 'r'], 4: [12, 'r'], 5: [13, 'r'],
    6: [2, 'kBbk'], 7: [2, 'kbBBBBBBbk'], 8: [3, 'kbkkkkkkbBk'], 9: [3, 'BkkkkkkkkbB'], 10: [3, 'k'],
    11: [12, 'r'], 12: [13, 'r'],
  });
  // Dead grass over the loam: a few blades above, a moonlit top edge, the
  // mat in olive, and its roots dithering down into the earth.
  const sod = [
    '..Y.......Y.....',
    '.YGd.Y...YGd..Y.',
    'YYYYYGYYYYYYYYGY',
    'GGGGGGGdGGGGGGGG',
    'GdGGdGGGGGdGGdGd',
    'dkdGkdGdkGdkdGkd',
    'kekdkxkkkdkekkdk',
  ];
  const earth_t = [...sod, ...dirt.slice(7)];
  const earth_tl = patch(earth_t, {
    0: [0, '....'], 1: [0, '....'], 2: [0, '.kYY'], 3: [0, 'kYGG'], 4: [0, 'kGGd'],
    5: [0, 'kdkG'], 6: [0, 'k'], 7: [0, 'k'], 8: [0, 'k'], 9: [0, 'k'], 10: [0, 'k'], 11: [0, 'k'],
    12: [0, 'k'], 13: [0, 'k'], 14: [0, 'k'], 15: [0, 'k'],
  });
  const earth_tr = patch(earth_t, {
    0: [12, '....'], 1: [12, '....'], 2: [12, 'YYk.'], 3: [12, 'GGdk'], 4: [12, 'Gddk'],
    5: [13, 'dkk'], 6: [15, 'k'], 7: [15, 'k'], 8: [15, 'k'], 9: [15, 'k'], 10: [15, 'k'], 11: [15, 'k'],
    12: [15, 'k'], 13: [15, 'k'], 14: [15, 'k'], 15: [15, 'k'],
  });
  def(soil, {
    grave_earth_t: earth_t,
    grave_earth_tl: earth_tl,
    grave_earth_tr: earth_tr,
    grave_earth_m: dirt,
    grave_earth_m2: dirt2,
    grave_earth_ml: left(dirt, 'k'),
    grave_earth_mr: right(dirt, 'k'),
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


  // Wrought-iron railing: spear-headed bars on two rails. The heads catch
  // the moon so they read as points against any background.
  const fenceUnit = [
    '...kk...',
    '..kWIk..',
    '..kWIk..',
    '.kWIIik.',
    '.kkIikk.',
    '..kIik..',
    '..kIik..',
    'kkkIikkk',
    'IIIIIIIi',
    'kkkkkkkk',
    '..kIik..',
    '..kIik..',
    '..kIik..',
    'kkkIikkk',
    'IIIIIIIi',
    'kkkkkkkk',
  ];
  const fence = fenceUnit.map((r) => r + r);

  // A headstone on a plinth: engraved cross, a line of lettering.
  const tomb = [
    '..kkkkkkkkkkkk..',
    '.kWWWWWWWWWWWSk.',
    '.kSSSSSSSSSSSsk.',
    '.kSssssktsssstk.',
    '.kSsssskSsssstk.',
    '.kSsskkkkktsstk.',
    '.kSssSSkSSSsstk.',
    '.kSssssktsssstk.',
    '.kSssssktsssstk.',
    '.kSssssSSsssstk.',
    '.kSsktktktktstk.',
    '.kSssSsSsSsSstk.',
    '.kSmssssssssmmk.',
    'kWWWWWWWWWWWWWSk',
    'kSsssssssssssstk',
    'kkkkkkkkkkkkkkkk',
  ];
  // A Celtic cross on a stepped plinth; its arms are a ledge to stand on.
  const cross = [
    '..kkkkkkkkkkkk..',
    '..kWWWWWWWWWSk..',
    '...kSsssssstk...',
    'k...kSssssttk..k',
    'kk...kSsstk...kk',
    'kWkkkkSsstkkkkSk',
    'kSWWWWSsssWWWWtk',
    'kSssssssssssssmk',
    'kStttttsstttttmk',
    'kkk..kSsstk..kkk',
    'k....kSsstk....k',
    '....kSssssttk...',
    '...kWSsssssttk..',
    '.kkWWWWWWWWWWSkk',
    '.kSsssssssssmttk',
    '.kkkkkkkkkkkkkkk',
  ];
  // A coffin lid laid across as a bridge: two warped boards and nails.
  const plank = [
    'kkkkkkkkkkkkkkkk',
    'OOOOOOOOOkkOOOOO',
    'oIooooooOkkkOoIo',
    'ooookkooooooookk',
    'kkoooooooookkooo',
    'okkkkkkkkkkkkkkk',
    'kk...ko.....kok.',
    '......k......k..',
    ...rep('................', 8),
  ];
  const ladder = [
    '.kOk.......kOk..',
    '.kokkkkkkkkkok..',
    '.koOOOOOOOOOok..',
    '.kokkkkkkkkkok..',
    '.kok.......kok..',
    '.kOk.......kok..',
    '.kok.......kOk..',
    '.kok.......kok..',
    '.kOk.......kok..',
    '.kokkkkkkkkkok..',
    '.koOOOOOkOOOok..',
    '.kokkkkkkkkkok..',
    '.kok.......kOk..',
    '.kok.......kok..',
    '.kOk.......kok..',
    '.kok.......kok..',
  ];
  // The open grave: black depth, and cold mist curling up out of it. The
  // two frames shift the wisps so they seem to breathe.
  const pit1 = [
    'kkkkkkkkkkkkkkkk',
    'kkkkkkkkkkkkkkkk',
    'kkkfFFFFfkkkkkkk',
    'FFfkkkkkkfFfkkfF',
    'kkkkkkkkkkkkFFfk',
    'kkkkkkkkkkkkkkkk',
    'kkkkkkkkkkkkkkkk',
    'kkkkkkkfFFfkkkkk',
    'kfffkkfkkkkfkkkk',
    'fkkkkkkkkkkkkfff',
    'kkkkkkkkkkkkkkkk',
    'kkkkkkkkkkkkkkkk',
    'kkkkkkkkkkkfkfkk',
    'kkkfkfkkkkkkkkkk',
    'kkkkkkkkkkkkkkkk',
    'kkkkkkkkkkkkkkkk',
  ];
  const pit2 = [
    'kkkkkkkkkkkkkkkk',
    'kkkkkkkkkkkkkkkk',
    'kkkkkkfFFFFfkkkk',
    'FfkkfFfkkkkkfFFF',
    'kFFfkkkkkkkkkkkk',
    'kkkkkkkkkkkkkkkk',
    'kkkkkkkkkkkkkkkk',
    'kkkkkkkkkkfFFfkk',
    'kkfffkkkkfkkkkfk',
    'kfkkkkkkkkkkkkkf',
    'kkkkkkkkkkkkkkkk',
    'kkkkkkkkkkkkkkkk',
    'kkkkfkfkkkkkkkkk',
    'kkkkkkkkkkkkfkfk',
    'kkkkkkkkkkkkkkkk',
    'kkkkkkkkkkkkkkkk',
  ];

  def(grave, {
    grave_wall_t: wall_t,
    grave_wall_tl: left(wall_t, ['W', 'S', 'k', 'k', 'k', 'k', 'k', 'k', 'k', 'k', 'k', 'k', 'k', 'k', 'k', 'k']),
    grave_wall_tr: right(wall_t, ['k', 'k', 'tk', 'tk', 'tk', 'k', 'k', 'k', 'k', 'k', 'k', 'k', 'k', 'k', 'k', 'k']),
    grave_wall_m: ashlar,
    grave_wall_m2: wall_m2,
    grave_wall_m3: ashlar3,
    grave_wall_ml: left(ashlar, 'k'),
    grave_wall_mr: right(ashlar, 'k'),
    grave_fence: fence,
    grave_tomb: tomb,
    grave_cross: cross,
    grave_plank: plank,
    grave_ladder: ladder,
    grave_pit1: pit1,
    grave_pit2: pit2,
  });

  /* ------------------------------------------------------- graveyard bg */
  // Bresenham-ish thick line, for branches.
  function line(g, x0, y0, x1, y1, col, w = 1) {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
    for (let i = 0; i <= n; i++) {
      const x = Math.round(x0 + (x1 - x0) * i / n), y = Math.round(y0 + (y1 - y0) * i / n);
      px(g, x - (w >> 1), y, col, w, 1);
    }
  }
  // A dead tree: a leaning trunk forking into crooked, thinning branches.
  function deadTree(g, x, y, h, seed, col, rim) {
    const r = FK.rng(seed);
    const limb = (x0, y0, ang, len, w, depth) => {
      const x1 = x0 + Math.cos(ang) * len, y1 = y0 - Math.sin(ang) * len;
      // A kink halfway makes the limb crooked.
      const kx = (x0 + x1) / 2 + (r() - 0.5) * len * 0.35, ky = (y0 + y1) / 2 + (r() - 0.5) * len * 0.2;
      line(g, x0, y0, kx, ky, col, w); line(g, kx, ky, x1, y1, col, Math.max(1, w - 1));
      if (rim !== undefined && w > 1) { line(g, x0 - (w >> 1), y0, kx - (w >> 1), ky, rim, 1); }
      if (depth <= 0 || len < 4) return;
      const n = 2 + (r() < 0.4 ? 1 : 0);
      for (let i = 0; i < n; i++) {
        const a = ang + (i - (n - 1) / 2) * (0.5 + r() * 0.5) + (r() - 0.5) * 0.3;
        limb(x1, y1, a, len * (0.55 + r() * 0.25), Math.max(1, w - 1), depth - 1);
      }
    };
    // Roots flare at the base.
    px(g, x - 3, y - 1, col, 7, 2); px(g, x - 5, y, col, 11, 1);
    limb(x, y, Math.PI / 2 + (r() - 0.5) * 0.3, h * 0.42, 4, 4);
  }
  // A small church: nave, a tower with a spire and a cross, lit windows.
  function church(g, x, base, col, lit) {
    // Nave with a steep roof.
    px(g, x, base - 26, col, 44, 26);
    for (let i = 0; i < 14; i++) px(g, x - 1 + i, base - 26 - i, col, 46 - i * 2, 1);
    // Apse.
    disc(g, x + 46, base - 12, 10, col);
    px(g, x + 36, base - 12, col, 20, 12);
    // Tower and spire.
    const tx = x - 14;
    px(g, tx, base - 54, col, 16, 54);
    px(g, tx - 1, base - 56, col, 18, 3);
    for (let i = 0; i < 36; i++) { const hw = Math.max(0, Math.round(8 - i * 8 / 36)); px(g, tx + 8 - hw, base - 56 - i, col, hw * 2, 1); }
    px(g, tx + 7, base - 100, col, 2, 10); px(g, tx + 4, base - 97, col, 8, 2);
    // Belfry and windows.
    if (lit !== undefined) {
      px(g, tx + 5, base - 48, lit, 2, 5); px(g, tx + 9, base - 48, lit, 2, 5);
      for (const wx of [x + 6, x + 16, x + 26]) { px(g, wx, base - 18, lit, 3, 7); px(g, wx + 1, base - 19, lit, 1, 1); }
    }
  }
  // Tombstone silhouettes of a few kinds, with a moonlit rim on the left.
  function stone(g, x, base, kind, h, col, rim) {
    const put = (xx, yy, w, hh) => px(g, xx, yy, col, w, hh);
    if (kind === 0) {           // round-topped
      const w = Math.round(h * 0.7);
      put(x, base - h + 3, w, h - 3); put(x + 1, base - h + 1, w - 2, 2); put(x + 2, base - h, w - 4, 1);
      if (rim !== undefined) { px(g, x, base - h + 3, rim, 1, h - 4); px(g, x + 1, base - h + 1, rim, 1, 2); px(g, x + 2, base - h, rim, w - 4, 1); }
    } else if (kind === 1) {    // cross
      put(x + 3, base - h, 3, h); put(x, base - h + 3, 9, 3);
      if (rim !== undefined) { px(g, x + 3, base - h, rim, 1, h - 1); px(g, x, base - h + 3, rim, 3, 1); px(g, x + 3, base - h, rim, 3, 1); }
    } else if (kind === 2) {    // obelisk
      put(x, base - 3, 9, 3); put(x + 2, base - h + 3, 5, h - 6);
      for (let i = 0; i < 3; i++) put(x + 3 + (i === 0 ? 1 : 0), base - h + i, i === 0 ? 1 : 3, 1);
      if (rim !== undefined) { px(g, x + 2, base - h + 3, rim, 1, h - 6); px(g, x, base - 3, rim, 2, 1); }
    } else if (kind === 3) {    // slab, leaning
      for (let i = 0; i < h; i++) put(x + Math.floor(i / 5), base - i, 7, 1);
      if (rim !== undefined) for (let i = 0; i < h - 1; i++) px(g, x + Math.floor(i / 5), base - i, rim, 1, 1);
    } else {                    // angel on a pedestal
      put(x, base - 8, 9, 8); put(x + 3, base - h + 2, 3, h - 10); put(x + 3, base - h, 3, 2);
      put(x, base - h + 3, 3, 4); put(x + 6, base - h + 3, 3, 4);
      put(x - 1, base - h + 2, 1, 3); put(x + 9, base - h + 2, 1, 3);
      if (rim !== undefined) { px(g, x, base - 8, rim, 1, 7); px(g, x + 3, base - h, rim, 1, h - 9); px(g, x - 1, base - h + 2, rim, 1, 3); }
    }
  }
  function railing(g, x, base, w, col, rim) {
    px(g, x, base - 13, col, w, 1); px(g, x, base - 4, col, w, 1);
    for (let i = 0; i < w; i += 3) {
      px(g, x + i, base - 15, col, 1, 15);
      px(g, x + i, base - 17, col, 1, 2);
      if (rim !== undefined) px(g, x + i, base - 17, rim, 1, 1);
    }
  }

  {
    const s = sky(SW, SH, [[0x0f, 0], [0x02, 40, 24], [0x0c, 112, 24], [0x1c, 176, 20]]);
    const sg = s.getContext('2d');
    stars(sg, SW, 110, 51, 40, [0x00, 0x10, 0x10, 0x30, 0x0c]);
    // The moon, ringed with a dithered halo.
    const mx = 186, my = 50, mr = 19;
    for (let y = my - 40; y <= my + 40; y++) for (let x = mx - 40; x <= mx + 40; x++) {
      const d = Math.hypot(x - mx, y - my);
      if (d > mr + 1 && d < mr + 18) {
        const k = 1 - (d - mr - 1) / 17;
        if (FK.bayer(x, y) < k * 0.55) px(sg, x, y, d < mr + 7 && FK.bayer(x, y) < k * 0.35 ? 0x1c : 0x0c);
      }
    }
    FK.moon(sg, mx, my, mr);
    // Thin streaks of cloud across the face of the night.
    const streak = (g, x, y, w, col, lit) => {
      px(g, x + 3, y, col, w - 6, 1); px(g, x, y + 1, col, w, 2); px(g, x + 5, y + 3, col, w - 12, 1);
      if (lit !== undefined) px(g, x + 4, y, lit, Math.round((w - 8) * 0.6), 1);
    };
    const cl = canvas(512, 100), cg = cl.getContext('2d');
    for (const [x, y, w] of [[20, 30, 70], [140, 54, 54], [228, 40, 90], [330, 22, 48], [400, 64, 80], [470, 34, 40], [96, 78, 40]]) {
      for (const ox of [0, -512]) streak(cg, x + ox, y, w, 0x0f, 0x02);
    }
    // Far: the churchyard's own church on a low rise, the town beyond.
    const far = canvas(512, 120), fg = far.getContext('2d');
    const rise = FK.bgKit.ridge(512, 77, 0, 10, 0.5);
    for (let x = 0; x < 512; x++) px(fg, x, 100 + rise[x], 0x02, 1, 20 - rise[x]);
    church(fg, 120, 104, 0x02, 0x17);
    for (const [x, h] of [[300, 14], [312, 20], [330, 12], [350, 18], [370, 10], [430, 16], [446, 11]]) {
      px(fg, x, 104 - h, 0x02, 12, h); for (let i = 0; i < 6; i++) px(fg, x + i, 104 - h - i, 0x02, 12 - i * 2, 1);
    }
    for (const [x, y] of [[304, 96], [334, 98], [352, 92], [434, 95]]) px(fg, x, y, 0x17, 1, 2);
    // Poplars along the far wall.
    for (const x of [40, 56, 230, 250, 400, 486]) for (let i = 0; i < 26; i++) {
      const hw = Math.round(Math.sin(Math.min(1, i / 22) * Math.PI) * 3);
      px(fg, x - hw, 103 - i, 0x02, hw * 2 + 1, 1);
    }
    // Mid: rows of stones, railings and dead trees, black against the haze.
    const mid = canvas(512, 140), mg = mid.getContext('2d');
    const MB = 128;
    const ground = FK.bgKit.ridge(512, 91, 0, 4, 0.5);
    for (let x = 0; x < 512; x++) px(mg, x, MB + ground[x] - 2, 0x0f, 1, 140);
    deadTree(mg, 70, MB, 120, 5, 0x0f, 0x0c);
    deadTree(mg, 330, MB, 96, 12, 0x0f, 0x0c);
    deadTree(mg, 455, MB, 70, 3, 0x0f, 0x0c);
    const r = FK.rng(33);
    for (let x = 4; x < 500; x += 9 + Math.floor(r() * 12)) {
      if (Math.abs(x - 70) < 8 || Math.abs(x - 330) < 8) continue;
      const kind = Math.floor(r() * 5);
      stone(mg, x, MB + ground[x] - 1, kind === 4 && r() < 0.6 ? 0 : kind, 10 + Math.floor(r() * 10), 0x0f, 0x0c);
    }
    railing(mg, 150, MB + 1, 46, 0x0f, 0x0c);
    railing(mg, 380, MB + 1, 34, 0x0f, 0x0c);

    // Ground fog: long dithered banks, pre-drawn, slid sideways each frame.
    const fogBank = (w, h, seed, col, dens) => {
      const c = canvas(w, h), g = c.getContext('2d');
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const dx = (x - w / 2) / (w / 2), dy = (y - h / 2) / (h / 2);
        const d = dx * dx + dy * dy * 1.3;
        if (d < 1 && FK.bayer(x, y) < (1 - d) * dens) px(g, x, y, col);
      }
      return c;
    };
    const banks = [
      { c: fogBank(120, 14, 1, 0x0c, 0.9), y: 150, sp: 0.18, x: 0, f: 0.5 },
      { c: fogBank(90, 10, 2, 0x0c, 0.8), y: 166, sp: 0.26, x: 170, f: 0.6 },
      { c: fogBank(150, 16, 3, 0x0c, 0.85), y: 176, sp: 0.12, x: 300, f: 0.7 },
      { c: fogBank(70, 8, 4, 0x2d, 0.5), y: 160, sp: 0.3, x: 90, f: 0.6 },
      { c: fogBank(100, 10, 5, 0x2d, 0.45), y: 182, sp: 0.2, x: 230, f: 0.8 },
    ];
    const wrap = 512;
    FK.makeBG('graveyard', [
      { img: s, still: true },
      { img: cl, f: 0.04, y: 0, fy: 0, drift: 0.05 },
      { img: far, f: 0.12, y: 70, fy: 0.05, fill: 0x02 },
      { img: mid, f: 0.32, y: 64, fy: 0.12, fill: 0x0f },
    ], (g, cx, cy, t) => {
      for (const b of banks) {
        let x = Math.round(b.x - cx * b.f + t * b.sp) % wrap; if (x < -b.c.width) x += wrap;
        const y = Math.round(b.y - cy * 0.12);
        for (let xx = x - wrap; xx < SW; xx += wrap) if (xx + b.c.width > 0) g.drawImage(b.c, xx, y);
      }
    });
  }

  /* ============================================================ CRYPT */
  // The vaults under the church: heavy gray blocks, warm in the shadows
  // where the torchlight doesn't reach, rimmed above and left by it.
  const crypt = {
    k: 0x0f,
    e: 0x00, E: 0x10, Y: 0x37, d: 0x08,  // stone: body, lit rim, torch glint, shadow
    n: 0x08,                             // pits in the stone
    b: 0x10, B: 0x30, c: 0x00,           // bone and skull
    i: 0x00, I: 0x10, J: 0x30, x: 0x08,  // iron, rust
    o: 0x08, O: 0x18, w: 0x07,           // wood: coffin, torch haft
    f: 0x16, F: 0x27, H: 0x38, h: 0x30,  // flame: red, orange, yellow, white core
    q: 0x07, Q: 0x18, u: 0x00, U: 0x08,  // coffin wood; the pillar in shadow
  };
  // Two courses of big rough blocks, mortar in black, each block lit along
  // its top and left and falling to warm shadow at the bottom right.
  const vault = [
    'YEEEEEEEEkYEEEEk',
    'EeeeeeeedkEeeedk',
    'EeedEeeedkEeeedk',
    'EeeeeeeedkEeeedk',
    'EeeeeeeedkEedEek',
    'EeeeeedEdkEeeedk',
    'EddddddddkEddddk',
    'kkkkkkkkkkkkkkkk',
    'EEEEkYEEEEEEEEEE',
    'eeedkEeeeeeeeeee',
    'edEdkEeeeeedEeee',
    'eeedkEeeeeeeeeee',
    'eeedkEeedEeeeeed',
    'eeedkEeeeeeeeeee',
    'ddddkEdddddddddd',
    'kkkkkkkkkkkkkkkk',
  ];
  // The topmost course: a worn, torch-lit tread with a black lip above it.
  const vault_t = [
    'kkkkkkkkkkkkkkkk',
    'YYEEEEEEEkYYEEEE',
    'EEeeeeeedkEEeeed',
    'EeedEeeedkEeeeed',
    'EeeeeeeedkEedEed',
    'EeeeeeeedkEeeeed',
    'EddddddddkEdddde',
    'kkkkkkkkkkkkkkkk',
    ...vault.slice(8),
  ].map((r) => r.slice(0, 16));
  // A cracked block.
  const vault3 = patch(vault, {
    1: [5, 'k'], 2: [4, 'kk'], 3: [4, 'k'], 4: [3, 'kk'], 5: [3, 'k'],
    9: [10, 'k'], 10: [10, 'kk'], 11: [11, 'k'], 12: [12, 'k'], 13: [12, 'kk'],
  });
  // A skull niche: a round-headed recess, a skull looking out of the dark.
  const vault2 = [
    'YEEEkkkkkkkkEEEk',
    'EeekkkkkkkkkkedK',
    'EeekkkkkkkkkkkdK',
    'EekkkkBBBBkkkkdK',
    'EekkkBBBBBbkkkdK',
    'EekkkBkkBkkkkkdK',
    'EekkkBkkBkkbkkdK',
    'EekkkBBBkBbbkkdK',
    'EekkkkBbBbbkkkdK',
    'EekkkkBkBkbkkkdK',
    'EekkkcbcbcbkkkdK',
    'EekbBkbBbkkBbkdK',
    'EeEEEEEEEEEEEEdK',
    'EdddddddddddddddK',
    'Edddddddddddddd',
    'kkkkkkkkkkkkkkkk',
  ].map((r) => r.replace(/K/g, 'k').slice(0, 16).padEnd(16, 'k'));

  def(crypt, {
    crypt_brick_t: vault_t,
    crypt_brick_tl: left(vault_t, 'k'),
    crypt_brick_tr: right(vault_t, 'k'),
    crypt_brick_m: vault,
    crypt_brick_m2: vault2,
    crypt_brick_m3: vault3,
    crypt_brick_ml: left(vault, 'k'),
    crypt_brick_mr: right(vault, 'k'),
    // A stone ledge jutting from the wall, the foot of a coffin pushed
    // into the niche beneath its lip.
    crypt_shelf: [
      'kkkkkkkkkkkkkkkk',
      'YEEEEEEEEEEEEEEE',
      'EeeeeeeedEeeeeee',
      'eddddddddddddddd',
      'kkkkkkkkkkkkkkkk',
      'kQQQQQQQQQQQQQok',
      'kQoooooooooooook',
      'kQooqIqoooooooqk',
      'kQoooooooooooook',
      'kqqqqqqqqqqqqqqk',
      'kkkkkkkkkkkkkkkk',
      ...rep('................', 5),
    ],
    // Iron spikes set in a sunken floor.
    crypt_spike: [
      '................',
      '................',
      '................',
      '..k...k...k...k.',
      '.kJk.kJk.kJk.kJk',
      '.kJk.kJk.kJk.kJk',
      '.kIik.Iik.Iik.Ii',
      'kIIik.Iik.Iik.Ii',
      'kIiikIiikIiikIii',
      'kIiikIiikIiikIii',
      'kIiixIiixIiixIix',
      'kIixxIixxIixxIix',
      'kkkkkkkkkkkkkkkk',
      'EEEEEEEEEEEEEEEE',
      'dddddddddddddddd',
      'kkkkkkkkkkkkkkkk',
    ].map((r) => r.slice(0, 16)),
    // A heap of bones: two skulls, long bones crossing.
    crypt_bones: [
      ...rep('................', 6),
      '.....kkkk.......',
      '....kBBBBk......',
      '...kBBBBBbk.....',
      '...kBkkBkbk.kk..',
      '.kkkBkkBkbkkBBk.',
      'kBBkBBkBbbkBkkBk',
      'kbBBkBbBbBkBkkbk',
      'kkbbbkkkkkbBBbBk',
      'kBBkbBBBBBkbbkbk',
      'kkkkkkkkkkkkkkkk',
    ],
    crypt_ladder: [
      '..kIk......kIk..',
      '..kIkkkkkkkkik..',
      '..kIJJJJJJJIik..',
      '..kIkkkkkkkkik..',
      '..kIk......kik..',
      '..kIk......kik..',
      '..kIk......kik..',
      '..kxk......kxk..',
      '..kIk......kIk..',
      '..kIkkkkkkkkik..',
      '..kIJJJJJJJIik..',
      '..kIkkkkkkkkik..',
      '..kIk......kik..',
      '..kIk......kik..',
      '..kik......kxk..',
      '..kIk......kik..',
    ],
    // A column segment: lit on the left, fluted, shadowed on the right.
    // A fluted column drum, back in the shadows: a round shaft with a dull
    // gray light on the left and a warm torch rim on the right. Darker
    // than the solid stone, so it reads as scenery.
    crypt_pillar: [
      '.kuUUUkuUUkUkkqk',
      '.kuUUUkuUUkUUkqk',
      '.kuUUUkuUUkUkkqk',
      '.kuUUUkuUUkUUkqk',
      '.kuUUUkuUUkUkkqk',
      '.kuUUUkuUUkUUkqk',
      '.kuUUUkuUUkkkkqk',
      '.kuUUUkuUUkUUkqk',
      '.kuUUUkuUUkUkkqk',
      '.kuUUUkuUUkUUkqk',
      '.kuUUUkuUUkUkkqk',
      '.kuUkUkuUUkUUkqk',
      '.kuUUUkuUUkUkkqk',
      '.kuUUUkuUUkUUkqk',
      '.kuUUUkuUUkUkkqk',
      '.kuUUUkuUUkUUkqk',
    ],
  });

  // A torch held in an iron ring. The flame licks through three shapes;
  // the pitch-wrapped head and the haft stay put.
  const haft = [
    '.....kkkkkk.....',
    '.....kokook.....',
    '......kook......',
    '....kkkwqkkk....',
    '....kJIwqIik....',
    '....kkkwqkkk....',
    '......kwqk......',
  ];
  const torch = (fl) => [...fl, ...haft];
  def(crypt, {
    crypt_torch1: torch([
      '.......k........',
      '......kfk.......',
      '......kffk......',
      '.....kfFfk......',
      '.....kfFFfk.....',
      '....kfFHFfk.....',
      '....kfFHHFk.....',
      '....kfFhHFfk....',
      '.....kFhhFk.....',
    ]),
    crypt_torch2: torch([
      '........k.......',
      '.......kfk......',
      '.......kffk.....',
      '......kfFfk.....',
      '.....kfFFfk.....',
      '.....kfFHFfk....',
      '....kfFHHFfk....',
      '....kfFHhHFk....',
      '.....kFhhFk.....',
    ]),
    crypt_torch3: torch([
      '................',
      '.....k..........',
      '....kfk..k......',
      '....kfk.kfk.....',
      '.....kfkfFk.....',
      '.....kfFFfk.....',
      '....kfFHHFfk....',
      '....kfFHhHFk....',
      '.....kFhhFk.....',
    ]),
  });

  /* ----------------------------------------------------------- crypt bg */
  {
    // Two ranks of round arches. Near: piers and vault ribs of dark,
    // torch-warmed stone. Far: a colonnade dissolving into black, its
    // openings faintly lit from below.
    const ashlarAt = (x, y, bw, bh) => {
      const row = Math.floor(y / bh);
      const bx = ((x + (row % 2) * (bw >> 1)) % bw + bw) % bw, by = y % bh;
      return { bx, by, edge: by === bh - 1 || bx === bw - 1, top: by === 0, left: bx === 0 };
    };
    // Far rank.
    const FW = 64, farC = canvas(256, SH), fcg = farC.getContext('2d');
    for (let y = 0; y < SH; y++) for (let x = 0; x < 256; x++) {
      const lx = x % FW, pier = 16, rr = 24, cx2 = pier + rr - 0.5, spring = 92;
      const dx = lx - cx2, dy = y - spring;
      const open = lx >= pier && (y >= spring || dx * dx + dy * dy <= rr * rr);
      let col = 0x0f;
      if (open) {
        // Glow from torches beyond, strongest near the floor.
        const k = (y - 96) / 110;
        if (k > 0 && FK.bayer(x, y) < k * 0.7) col = 0x08;
      } else {
        const a = ashlarAt(x, y, 16, 8);
        if (!a.edge && a.top && FK.bayer(x, y) < 0.5) col = 0x08;
        // The rim of each opening catches a little light.
        if (lx >= pier) {
          const d = Math.hypot(dx, dy);
          if (y < spring && d <= rr + 1.2) col = 0x08;
        } else if (lx === pier - 1 && y >= spring) col = 0x08;
      }
      px(fcg, x, y, col);
    }
    // Near rank.
    const NW = 128, mid = canvas(256, SH), mg = mid.getContext('2d');
    const pier = 24, rr = 52, spring = 70, cxA = pier + rr - 0.5;
    for (let y = 0; y < SH; y++) for (let x = 0; x < 256; x++) {
      const lx = x % NW;
      const dx = lx - cxA, dy = y - spring, d = Math.hypot(dx, dy);
      if (lx >= pier && (y >= spring || d <= rr)) continue;   // the opening
      let col;
      if (lx >= pier && y < spring && d <= rr + 8) {
        // Voussoirs: wedge stones around the arch, a lit inner rim.
        const ang = Math.atan2(dy, dx) + Math.PI;
        const v = (ang / (Math.PI / 12)) % 1;
        col = v < 0.12 || d > rr + 7 ? 0x0f : 0x08;
        if (d <= rr + 1.2) col = 0x07;
      } else {
        // Pier and spandrel: ashlar, joints in black, the arch-side face
        // of the pier warmed by the torchlight.
        const a = ashlarAt(x, y, 18, 10);
        col = a.edge ? 0x0f : (FK.bayer(x, y) < 0.3 ? 0x0f : 0x08);
        if (!a.edge && a.top) col = 0x08;
        if (lx < pier && lx >= pier - 2 && !a.edge && y > spring - 10) col = 0x07;
        if (lx < pier && lx < 2) col = 0x0f;
        if (col === 0x08 && lx >= pier && FK.bayer(x, y) < 0.35) col = 0x0f;   // the spandrel is in deeper shadow
      }
      px(mg, x, y, col);
    }
    // The extra pass: a far-off torch in every distant opening, guttering,
    // and the faint warm pool it throws on the floor beneath.
    FK.makeBG('crypt', [
      { img: farC, f: 0.16, y: 0, fy: 0.08 },
      { img: mid, f: 0.36, y: 0, fy: 0.18 },
    ], (g, cx, cy, t) => {
      const ox = -Math.round(cx * 0.16), oy = -Math.round(cy * 0.08);
      const midOx = -Math.round(cx * 0.36), midOy = -Math.round(cy * 0.18);
      // Is this screen pixel covered by the near arches?
      const covered = (x, y) => {
        const lx = (((x - midOx) % NW) + NW) % NW, yy = y - midOy;
        const d = Math.hypot(lx - cxA, yy - spring);
        return !(lx >= pier && (yy >= spring || d <= rr));
      };
      for (let k = -1; k < 6; k++) {
        const tx = ((ox % FW) + FW) % FW + k * FW + 16 + 20;
        if (tx < -10 || tx > SW + 10) continue;
        const ty = 150 + oy;
        const fl = Math.sin(t * 0.17 + k * 1.9) * 0.6 + Math.sin(t * 0.47 + k * 3.1) * 0.4;
        const R = 9 + Math.round(fl * 2);
        for (let y = -2; y <= 2; y++) for (let x = -R; x <= R; x++) {
          const q = 1 - Math.hypot(x / R, y / 2.5);
          const X = tx + x, Y = ty + 10 + y;
          if (q > 0 && !covered(X, Y) && FK.bayer(X, Y) < q * 0.45) px(g, X, Y, 0x08);
        }
        if (covered(tx, ty)) continue;
        px(g, tx, ty, 0x0f, 1, 6);
        const fh = fl > 0.25 ? 3 : fl < -0.5 ? 1 : 2;
        px(g, tx, ty - fh, fl < -0.5 ? 0x07 : 0x17, 1, fh);
        if (fh > 1) px(g, tx, ty - 1, 0x27, 1, 1);
      }
    });
  }

  /* ============================================================== LAB */
  // Victor's lodging house: old oak boards and joists, limewashed lab_plaster
  // gone gray with damp, and the brass and glass of his apparatus.
  const lab = {
    k: 0x0f,
    o: 0x07, O: 0x17, y: 0x27, n: 0x08,   // oak: dark, mid, worn-bright top, deep shadow
    p: 0x2d, P: 0x00, W: 0x10, q: 0x0f,   // lab_plaster: mid, lit, highlight, stain
    s: 0x08, S: 0x18,                     // stone footing
    c: 0x08, C: 0x18, Z: 0x28,            // crate wood, straw
    g: 0x18, G: 0x28, H: 0x38,            // brass
    b: 0x0c, B: 0x1c, j: 0x2c, J: 0x3c,   // glass, liquid
    r: 0x06, R: 0x16, v: 0x09, V: 0x1a,   // red and green tinctures
    e: 0x11, E: 0x21, x: 0x31, X: 0x30,   // sparks: blue to white
    u: 0x00, U: 0x10, w: 0x02, h: 0x31,   // window: lead, rain, night, lightning
  };
  // Floorboards seen end-on: a worn top edge, the boards' ends, and a joist
  // below. Body tiles are the joists and the boards of the floor beneath.
  const lab_floor_t = [
    'kkkkkkkkkkkkkkkk',
    'yyyyyyyyyyyykyyy',
    'OOOOOOOOOOOOkOOO',
    'ooOoooooooooknoo',
    'nnnnnnnnnnnnknnn',
    'kkkkkkkkkkkkkkkk',
    'kOOOOkkOOOOOkkOk',
    'kOookkkOooonkkok',
    'konnkkkonnnnkknk',
    'kkkkkkkkkkkkkkkk',
    'OOkkkkkOOkkkkkkO',
    'onkkkkkonkkkkkko',
    'onkkkkkonkkkkkko',
    'onkkkkkonkkkkkko',
    'onkkkkkonkkkkkko',
    'onkkkkkonkkkkkko',
  ];
  const lab_floor_m = [
    'onkkkkkonkkkkkko',
    'onkkkkkonkkkkkko',
    'onkkkkkonkkkkkko',
    'onkkkkkonkkkkkko',
    'onkkkkkonkkkkkko',
    'onkkkkkonkkkkkko',
    'onkkkkkonkkkkkko',
    'onkkkkkonkkkkkko',
    'kkkkkkkkkkkkkkkk',
    'OOOOOOOOOkOOOOOO',
    'ooooooooonkooooo',
    'nnnnnnnnnnknnnnn',
    'kkkkkkkkkkkkkkkk',
    'OOkkkkkOOkkkkkkO',
    'onkkkkkonkkkkkko',
    'onkkkkkonkkkkkko',
  ];
  // Plaster over rubble stone: a lit face, damp stains, a few cracks, and
  // the stone showing where it has fallen away.
  const lab_plaster = [
    'pppppppppppppppp',
    'pPpppppppppppppp',
    'ppppppppppppkppp',
    'pppppppppppkpppp',
    'pppppppppppkkppp',
    'ppppPppppppppkpp',
    'pppppppppppppppp',
    'ppppppppppppppPp',
    'pppppppppppppppp',
    'pkpppppppppppppp',
    'ppkppppppPpppppp',
    'pppkkppppppppppp',
    'pppppppppppppppp',
    'pppppppppppPpppp',
    'PppppppppppppppP',
    'pppppppppppppppp',
  ];
  const lab_plaster2 = [
    'pppppppppppppppp',
    'pppppkkkkkkppppp',
    'ppppkSssSsskpppp',
    'pppkSsskSssskppp',
    'pppkkkkkkkkkkppp',
    'pppkSsSssksSskpp',
    'pppkssskssssskpp',
    'ppppkkkkkkkkkppp',
    'pppppkSsskSkpppp',
    'ppppppkkkkkkpppp',
    'pppppppppppppppp',
    'ppppppppppppPppp',
    'pppPpppppppppppp',
    'pppppppppppppppp',
    'pppppppppppppppp',
    'pppppppppppppppp',
  ];
  const lab_wall_t = [
    'kkkkkkkkkkkkkkkk',
    'yyyyyyyyyyyyyyyy',
    'OOOOOOOOOOOOOOOO',
    'nnnnnnnnnnnnnnnn',
    'kkkkkkkkkkkkkkkk',
    'qqqqqqqqqqqqqqqq',
    ...lab_plaster.slice(6),
  ];
  def(lab, {
    lab_floor_t: lab_floor_t,
    lab_floor_tl: left(lab_floor_t, ['k', 'k', 'k', 'k', 'k', 'k', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.']),
    lab_floor_tr: right(lab_floor_t, ['k', 'k', 'k', 'k', 'k', 'k', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.']),
    lab_floor_m: lab_floor_m,
    lab_floor_ml: left(lab_floor_m, 'k'),
    lab_floor_mr: right(lab_floor_m, 'k'),
    lab_wall_t: lab_wall_t,
    lab_wall_tl: left(lab_wall_t, 'k'),
    lab_wall_tr: right(lab_wall_t, 'k'),
    lab_wall_m: lab_plaster,
    lab_wall_m2: lab_plaster2,
    lab_wall_ml: left(lab_plaster, 'kW'),
    lab_wall_mr: right(lab_plaster, 'qk'),
  });
})();
