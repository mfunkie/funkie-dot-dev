'use strict';
/*
 * FRANKEN.EXE art: tilesets and backgrounds (set b). The storm on the Salève,
 * the Mer de Glace, the winter forest round the De Laceys' cottage, and the
 * autumn road to Geneva. Tiles are 16x16 grids, one character per pixel.
 */
(() => {
  const { left, right, mirror, rot, rep } = FK.tileHelpers;

  /*
   * Close a block's left or right side. `inset` gives, per row, how many
   * pixels are cut away (the last value repeats), so corners can be rounded.
   * The first solid pixel becomes outline; pixels exposed to the air above a
   * step are outlined too. `tone` maps a char to its lit (left) or shaded
   * (right) neighbour for the pixel just inside the outline.
   */
  function side(rows, which, inset, tone, from = 1) {
    const n = (y) => (y < inset.length ? inset[y] : inset[inset.length - 1]);
    const out = rows.map((r) => r.split(''));
    for (let y = 0; y < 16; y++) {
      const a = out[y], m = n(y);
      const X = (i) => (which === 'l' ? i : 15 - i);
      for (let i = 0; i < m; i++) a[X(i)] = '.';
      a[X(m)] = 'k';
      const prev = y > 0 ? n(y - 1) : m;
      for (let i = m; i < prev; i++) a[X(i)] = 'k';
      if (tone && y >= from && m + 1 < 16) {
        const c = a[X(m + 1)];
        if (c !== 'k' && tone[c]) a[X(m + 1)] = tone[c];
      }
    }
    return out.map((a) => a.join(''));
  }
  const def = (legend, tiles) => FK.tiles(legend, tiles);

  /* ================================================================ ROCK */
  // The storm: wet turf, Salève limestone, a lake whipped white.
  const rock = {
    k: 0x0f,
    h: 0x2b, G: 0x1a, g: 0x0a,          // turf: wet sheen, grass, dark grass
    e: 0x08, n: 0x07, r: 0x18,          // mud, a warmer clod, a lit rim
    W: 0x30, S: 0x10, s: 0x00, c: 0x0c, // limestone: glint, lit, face, shadow
    b: 0x18, B: 0x08,                   // twigs
    f: 0x30, F: 0x31, v: 0x1c,          // foam, spray, wave face
  };
  const ground_t = [
    'kkkkkkkkkkkkkkkk',
    'hGGhGGGhGGhGGGhG',
    'GGGGgGGGGGGGgGGG',
    'GgGgggGGgGgGggGg',
    'gggggkgggggkgggg',
    'kggkkekggkkekgkk',
    'ekkeeeekkeeeekee',
    'eeeekeeeeeeeeeee',
    'eeeeeeeeeeekkeee',
    'eekkeeeeeekSskee',
    'ekSskeeeeeksckee',
    'eksckeekeeekkeee',
    'eekkeeeeeeeeeeee',
    'eeeeeeekkkeeeeke',
    'eeekeeksSskeeeee',
    'eeeeeekccckeeeee',
  ];
  const ground_m = [
    'eeeeeekkkeeeeeee',
    'eeeeeeeeeeeeekee',
    'eekkeeeeeeeeeeee',
    'ekSskeeeeekkkeee',
    'eksckeeeekSSskee',
    'eekkeeeeeksccske',
    'eeeeeekeeekkkkee',
    'eeeeeeeeeeeeeeee',
    'ekeeeeeeeeeeeeke',
    'eeeeekkkeeeeeeee',
    'eeeekSSskeeeeeee',
    'eeeekscckeekkeee',
    'eeeeekkkeekSskee',
    'eeeeeeeeeeekkeee',
    'keeeeeeeeeeeeeee',
    'eeeeeekkkeeeeeek',
  ];
  const ground_m2 = [
    'eeeeeekkkeeeeeee',
    'eeekkkkkkkkeeeee',
    'eekSSSSSSSskeeee',
    'ekSSsssssssskeee',
    'ekSssssssscsskee',
    'ekssssssssccccke',
    'eekcssssscccckee',
    'eeekcccccccckeee',
    'eeeekkkkkkkkeeee',
    'eeeeeeeeeeeeeeee',
    'eekkeeeeeeeekkee',
    'ekSskeeeeeekSske',
    'ekcckeekeeekcske',
    'eekkeeeeeeeekkee',
    'eeeeeeeeeeeeeeee',
    'eeeeeekkkeeeeeee',
  ];
  const groundL = { G: 'h', g: 'G' };
  const groundR = { h: 'G', G: 'g' };

  // Salève limestone: thick beds, lit along their tops, few vertical joints.
  const cliff_t = [
    'kkkkkkkkkkkkkkkk',
    'WSSSSSSSSSSSWSSS',
    'SSssssssssssSkSS',
    'ssssscsssssssksc',
    'ssssssssssssskcs',
    'ccccssssssssskcc',
    'kkkkcccccccccckk',
    'SSSSkkkkkkkkkkkS',
    'sssssSSSkSSSSsss',
    'sscssssckSssssss',
    'ssssssskSsssscss',
    'ccccccckSsssssss',
    'kkkkkkkkcccccccc',
    'SSSScSSSkkkkkkkk',
    'sssskSssSSSSSWSS',
    'ccckcccccccccccc',
  ];
  const cliff_m = [
    'SSSSSSSSSSSSkSSS',
    'ssssscsssssskcss',
    'ssssssssssssSkSs',
    'cccccsssssssskcc',
    'kkkkkcccccccckkk',
    'SSSSSkkkkkkkkSSS',
    'sssssSSSkSSSSsss',
    'sscssssckSssssss',
    'ssssssskSsssscss',
    'ccccccckSsssssss',
    'kkkkkkkkcccccccc',
    'SSSScSSSkkkkkkkk',
    'sssskSssSSSWSSSS',
    'sssckSssssscssss',
    'ccckcccccccccccc',
    'kkkkkkkkkkkkkkkk',
  ];
  const cliff_m2 = [
    'SSSSSSkSSSSSSSSS',
    'sssssskcssssssss',
    'ssssssSkSsscssss',
    'cccsssskSssscccc',
    'kkkcccckcccckkkk',
    'SSSkkkkkkkkkkkkS',
    'sssSSSSSSSSSkSSs',
    'sssssssssssckSss',
    'ssssscssssskSsss',
    'ssssssssssckcccs',
    'cccccccssskkkkkc',
    'kkkkkkkccckcSSkk',
    'SSSSSSkkkkkkSsSS',
    'ssssssSSSSSkSsss',
    'ccccccccccckcccc',
    'kkkkkkkkkkkkkkkk',
  ];
  const cliffL = { s: 'S', c: 's' };
  const cliffR = { W: 'S', S: 's', s: 'c' };

  // A narrow shelf jutting from the cliff, with a tapering underside.
  const rock_ledge = [
    'kkkkkkkkkkkkkkkk',
    'kWSSSSSSSSSSWSSk',
    'kSSsssssssssSssk',
    'ksssssscssssssck',
    'kcsssssssssssscc',
    '.kcccsssssscccck',
    '..kkkcccccckkkk.',
    '.....kkkkkk.....',
    ...rep('................', 8),
  ];
  // A juniper bent flat by the wind off the lake.
  const rock_bush = [
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '.......kkkkk....',
    '....kkkhGGGGkk..',
    '..kkhGGGGgGGGGkk',
    '.khGGgGGgggGgggk',
    'khGGgggGggkkgkk.',
    'kGgggkgggk..kk..',
    '.kggkkBkgk......',
    '..kkk.kBk.......',
    '.......kBk......',
    '......kkbBk.....',
  ];
  // The lake: steep chop, white crests torn off by the wind, black water.
  const lake = [
    '.......ff.......',
    '..F..ffvvf....F.',
    'f..ffvvvvvf..ffv',
    'vffvvvcvvvvffvvv',
    'cvvvcccccvvvvvcc',
    'cccccckcccccccck',
    'kcckcccccckccckc',
    'ccckkckkcckkkckk',
    'kkkkkckkkkkkckkk',
    'kkkkkkkkkkkkkkkk',
    'kkkkkkkkkkkkkkkk',
    'kkkkkkkkkkkkkkkk',
    'kkkkkkkkkkkkkkkk',
    'kkkkkkkkkkkkkkkk',
    'kkkkkkkkkkkkkkkk',
    'kkkkkkkkkkkkkkkk',
  ];
  const band = (rows, y0, y1, n) => rows.map((r, y) => (y >= y0 && y < y1 ? rot(r, n) : r));
  def(rock, {
    rock_ground_t: ground_t,
    rock_ground_m: ground_m,
    rock_ground_m2: ground_m2,
    rock_ground_tl: side(ground_t, 'l', [3, 1, 0], groundL),
    rock_ground_tr: side(ground_t, 'r', [3, 1, 0], groundR),
    rock_ground_ml: side(ground_m, 'l', [0], groundL),
    rock_ground_mr: side(ground_m, 'r', [0], groundR),
    rock_cliff_t: cliff_t,
    rock_cliff_m: cliff_m,
    rock_cliff_m2: cliff_m2,
    rock_cliff_tl: side(cliff_t, 'l', [2, 1, 0], cliffL),
    rock_cliff_tr: side(cliff_t, 'r', [2, 1, 0], cliffR),
    rock_cliff_ml: side(cliff_m, 'l', [0], cliffL),
    rock_cliff_mr: side(cliff_m, 'r', [0], cliffR),
    rock_ledge,
    rock_bush,
    rock_water1: lake,
    rock_water2: band(band(lake, 0, 5, 5), 5, 9, 11),
    rock_water3: band(band(lake, 0, 5, 11), 5, 9, 6),
  });

  /* ================================================================= ICE */
  // The Mer de Glace: packed snow, blue glacier ice, dark granite.
  const ice = {
    k: 0x0f,
    W: 0x30, v: 0x32, V: 0x22,              // snow: white, lavender, periwinkle shade
    I: 0x31, i: 0x21, j: 0x11, u: 0x12, J: 0x02,   // glacier ice: glint to deep blue
    g: 0x10, G: 0x00, d: 0x08,                      // granite: lit, face, rust shadow
  };
  const snow_t = [
    'kkkkkkkkkkkkkkkk',
    'WWWWWWWWWWWWWWWW',
    'WWWWWWWWWWWWWWWW',
    'WWWWWWWWWWWWWWWW',
    'WWvWWWWWWWWWWWWW',
    'vvvvvWWWWWWWvvvv',
    'VVVvvvvvvvvvvVVV',
    'vvVVVVVVVVVVVVvv',
    'WWvvvvvvvvvvvvWW',
    'WWWWWWWWWWWWWWWW',
    'WWWWWWWWWWWvvWWW',
    'WWWWWvvvvvvVVvvW',
    'vvvvvvVVVVvvvvvv',
    'VVVVvvvvvvWWWWvV',
    'vvvvvWWWWWWWWWWv',
    'WWWWWWWWWWWWWWWW',
  ];
  const snow_m = [
    'WWWWWWWWWWWWWWWW',
    'WWWWWWWWWWWvvWWW',
    'WWWWWvvvvvvVVvvW',
    'vvvvvvVVVVvvvvvv',
    'VVVVvvvvvvWWWWvV',
    'vvvvvWWWWWWWWWWv',
    'WWWWWWWWWWWWWWWW',
    'WWWWWWWWWWWWWWWW',
    'WWWWWWWWWWWWWWWW',
    'WWvvvvvWWWWWWWWW',
    'vvvVVVvvvvvvWWWv',
    'VVVvvvVVVVVvvvvv',
    'vvvWWWvvvvvVVVVV',
    'WWWWWWWWWWWvvvvv',
    'WWWWWWWWWWWWWWWW',
    'WWWWWWWWWWWWWWWW',
  ];
  const snow_m2 = [
    'WWWWWWWWWWWWWWWW',
    'WWWWWWWWWWWvvWWW',
    'WWWWWvvvvvvVVvvW',
    'vvvvvvVVVVvvvvvv',
    'VVVVvvvvkkkWWWvV',
    'vvvvvWWkgggkWWWv',
    'WWWWWWkgGGGdkWWW',
    'WWWWWWkdGGddkWWW',
    'WWWWWWWkkkkkWWWW',
    'WWvvvvvvvvWWWWWW',
    'vvvVVVVVVVvvWWWv',
    'VVVvvvVVVVVvvvvv',
    'vvvWWWvvvvvVVVVV',
    'WWWWWWWWWWWvvvvv',
    'WWWWWWWWWWWWWWWW',
    'WWWWWWWWWWWWWWWW',
  ];
  const ice_t = [
    'kkkkkkkkkkkkkkkk',
    'WWWWWWWWWWWWWWWW',
    'IIIIIIIIIIIIIIII',
    'IIWIiiiiiiIWIiii',
    'IWIiiiiiiIWIiiii',
    'WIiiiiiiIWIiiiii',
    'IiiiiiiiWIiiiiij',
    'iiiiiiiIIiiiiiij',
    'iiiiiiiiiiiiiijj',
    'iiiIiiiiiiiiiijj',
    'iiIWiiiiiiiiijjj',
    'iIWIiiiiiiiiijjj',
    'IWIiiiiiiiiijjju',
    'WIiiiiiiiiijjjuu',
    'Iiiiiiiiiijjjuuu',
    'jjjjjjjjjjjjuuuu',
  ];
  const ice_m = [
    'iiiiiiiiiiijjjuu',
    'iiiiiiiiIIiiijju',
    'iiiiiiiIWIiiiijj',
    'iiIiiiIWIiiiiiij',
    'iIWIiIWIiiiiiiii',
    'IWIiIWIiiiiiiiii',
    'WIiIWIiiiiiiiiii',
    'IiIWIiiiiiiiiiij',
    'iIWIiiiiiiiiiijj',
    'IWIiiiiiiiiiijju',
    'WIiiiiiiiiiijjuu',
    'Iiiiiiiiiiiijjuu',
    'iiiiiiiiiiijjuuu',
    'iiiiiiiiiiijjuuu',
    'jjjiiiiiiijjjuuu',
    'uujjjjjjjjjjuuuu',
  ];
  const ice_m2 = [
    'iiiiiiiiiiijjjuu',
    'iiiiiiiiiiiiijju',
    'iiiIIiiiiiiiiijj',
    'iiIiiIiiiiikiiij',
    'iiIiiIiiiikjiiii',
    'iiiIIiiiiikiiiii',
    'iiiiiiiiikjiiiii',
    'iiiiiiiiiikiiiij',
    'iiiiiIiiiijkiijj',
    'iiiiIjIiiiiikijj',
    'iiiiiIiiiiikjjuu',
    'iiiiiiiiiiiikjuu',
    'iIiiiiiiiiijjkuu',
    'IjIiiiiiiiijjuuu',
    'jIjiiiiiiijjjuuu',
    'uujjjjjjjjjjuuuu',
  ];
  const gran_m = [
    'gggggggggggdkggg',
    'GGGGWGGGGGGdkgGG',
    'GGGGGGGGGGdkgGGG',
    'GGGGGGGGGGdkgGGG',
    'GGdGGGGGGdkgGGGG',
    'GGGGGGGGGdkgGdGG',
    'dddddddddkgGGGGG',
    'kkkkkkkkkddddddd',
    'ggggggggdkkkkkkk',
    'GGGGGGGGGgggdkgg',
    'GGGdGGGGGGGGdkgG',
    'GGGGGGGGGGGdkgGG',
    'GGGGGGGWGGGdkgGG',
    'GGGGGGGGGGdkgGGG',
    'dddddddddddkdddd',
    'kkkkkkkkkkkkkkkk',
  ];
  const gran_m2 = [
    'ggggdkgggggggggg',
    'GGGGdkgGGGGGGGGG',
    'GGGdkgGGGGGWGGGG',
    'GGGdkgGGGGGGGGGG',
    'GGddkgGGGGGGGGGG',
    'GGdkgGGGGGGGGGGG',
    'GGdkgGGGdGGGGGGG',
    'GGdkgGGGGGGGGGGG',
    'GdkgGGGGGGGGGddd',
    'gdkgGGGGGGdddkkk',
    'ddkgGGGGGdkkkggd',
    'dkgGGGGGdkgggGGG',
    'dkgGGGGdkgGGGdGG',
    'dkgGGGGdkgGGGGGG',
    'dkdddddkdddddddd',
    'kkkkkkkkkkkkkkkk',
  ];
  // Granite with a dusting of snow on its top.
  const gran_t = [
    'kkkkkkkkkkkkkkkk',
    'WWWWWWWWWWWWWWWW',
    'vWWWvvWWWWWvvWWv',
    'kvvkkkvvWvvkkvvk',
    'ggkgggkkgkkggkgg',
    ...gran_m.slice(5),
  ];
  const snowL = { v: 'W', V: 'v' }, snowR = { W: 'v', v: 'V' };
  const iceL = { i: 'I', j: 'i', u: 'j' }, iceR = { W: 'I', I: 'i', i: 'j', j: 'u' };
  const granL = { G: 'g', d: 'G' }, granR = { g: 'G', G: 'd' };
  // A snow cornice: a soft lip of snow overhanging, with icicles.
  const ice_ledge = [
    '..kkkkkkkkkkkk..',
    '.kWWWWWWWWWWWWk.',
    'kWWWWWWWWWWWWWWk',
    'kvWWWWWWWWWWWWvk',
    'kVvvvWWWWWvvvvVk',
    '.kVVVvvvvvvVVVk.',
    '..kkVkkVVkkkVk..',
    '...kIk.kk..kIk..',
    '....k.......k...',
    ...rep('................', 7),
  ];
  // The crevasse: blue-black depths with faint glints of ice far down.
  // Tiles seamlessly both ways; the solid ice either side is its wall.
  const ice_crevasse = [
    'kkkkkkkkkkkkJkkk',
    'kkJkkkkkkkkkJkkk',
    'kkJkkkkkkkkkkkkk',
    'kkukkkkkJkkkkkkk',
    'kkJkkkkkJkkkkkkk',
    'kkkkkkkkkkkkkkJk',
    'kkkkkkkkkkkkkkJk',
    'kkkkkJkkkkkkkkuk',
    'kkkkkJkkkkkkkkJk',
    'kkkkkkkkkkkkkkkk',
    'kkkkkkkkkkJkkkkk',
    'Jkkkkkkkkkukkkkk',
    'Jkkkkkkkkkjkkkkk',
    'ukkkkkkkkkJkkkkk',
    'JkkkkkkkkkJkkkkk',
    'kkkkkkkkkkkkkkkk',
  ];
  def(ice, {
    ice_snow_t: snow_t,
    ice_snow_m: snow_m,
    ice_snow_m2: snow_m2,
    ice_snow_tl: side(snow_t, 'l', [3, 1, 0], snowL),
    ice_snow_tr: side(snow_t, 'r', [3, 1, 0], snowR),
    ice_snow_ml: side(snow_m, 'l', [0], snowL),
    ice_snow_mr: side(snow_m, 'r', [0], snowR),
    ice_block_t: ice_t,
    ice_block_m: ice_m,
    ice_block_m2: ice_m2,
    ice_block_tl: side(ice_t, 'l', [1, 0], iceL),
    ice_block_tr: side(ice_t, 'r', [1, 0], iceR),
    ice_block_ml: side(ice_m, 'l', [0], iceL),
    ice_block_mr: side(ice_m, 'r', [0], iceR),
    ice_rock_t: gran_t,
    ice_rock_m: gran_m,
    ice_rock_m2: gran_m2,
    ice_rock_tl: side(gran_t, 'l', [2, 1, 0], granL),
    ice_rock_tr: side(gran_t, 'r', [2, 1, 0], granR),
    ice_rock_ml: side(gran_m, 'l', [0], granL),
    ice_rock_mr: side(gran_m, 'r', [0], granR),
    ice_ledge,
    ice_crevasse,
  });

  /* ================================================================ WOOD */
  // Winter forest by night and the De Laceys' cottage: frozen earth under
  // snow, a log pile, fieldstone walls framed in oak, a thatch under snow.
  const wood = {
    k: 0x0f, W: 0x30, I: 0x31, i: 0x21,         // snow and its blue shade
    e: 0x08, n: 0x07,                           // frozen earth, a clod
    s: 0x00, S: 0x10, c: 0x0c, f: 0x2d,         // fieldstone
    y: 0x38, Y: 0x28, o: 0x27, Z: 0x37,         // firelight in the window
    t: 0x07, T: 0x08,                           // timber, bark
    g: 0x0a, G: 0x1a, b: 0x0b,                  // pine needles
    E: 0x18, h: 0x08, H: 0x27,                  // log ends: sapwood, ring, heart
    P: 0x28, p: 0x18, q: 0x08,                  // thatch straw
  };
  const wsnow_t = [
    'kkkkkkkkkkkkkkkk',
    'WWWWWWWWWWWWWWWW',
    'WWWWWWWWWWWWWWWW',
    'WWWIWWWWWWWWIWWW',
    'IWIIIWWWWWWIIIWI',
    'iIiiIIIWWWIIiiIi',
    'iiiiiiiIIIiiiiii',
    'kiiikkiiiiiikkii',
    'ekkkeekkkkkkeekk',
    'eeeeeeekkeeeeeee',
    'eekeeeeeeeeeeeek',
    'eeeeeeeeeeekeeee',
    'eeeeekkkeeeeeeee',
    'eeeekSSskeeeeeee',
    'eeeeekkkeeeekeee',
    'eekeeeeeeeeeeeee',
  ];
  const wsnow_m = [
    'eeeeeeeeeeeeeeee',
    'eekeeeeeeeeeeeee',
    'eeeeeeeeeeeekeee',
    'eeeeeeeeekkkeeee',
    'eeeeeeeekSSskeee',
    'eeeeeeeeekkkeeee',
    'ekeeeeeeeeeeeeee',
    'eeeeeeeeeeeeeeke',
    'eeeeekeeeeeeeeee',
    'eeeeeeeeeeeeeeee',
    'eekkkeeeeeeekeee',
    'ekSSskeeeeeeeeee',
    'eekkkeeeeeeeeeee',
    'eeeeeeeeeekeeeee',
    'eeeeeeeeeeeeeeee',
    'eeekeeeeeeeeeeee',
  ];
  const wsnow_m2 = [
    'eeeeeeeeeeeeeeee',
    'eekeeeeeeeeeeeee',
    'eeeeeeeeeeeekeee',
    'kkkeeeeeeeeeeeee',
    'eeekkkeeeeeeeeee',
    'eeeeeekkkeeeeeee',
    'eeeeeeeeekkkkkee',
    'eeeeeeeeeeeeeekk',
    'eeeeeeeeeeeeeeee',
    'eeekeeeeeekkkeee',
    'eeeeeeeeekSSskee',
    'eeeeeeeeeekkkeee',
    'eeeeeeeeeeeeeeee',
    'eekeeeeeeeeeeeee',
    'eeeeeeeeeeeeeeke',
    'eeeeeeeeeeeeeeee',
  ];
  const log_t = [
    '..kkkkkk...kkkkk',
    '.kWWWWWWk.kWWWWW',
    'kWWWWWWWWkWWWWWW',
    'kIIWWWWIIkIIWWWI',
    'kkkIIIIkkkkkIIIk',
    'kkTTTTTTkkkkTTTT',
    'kTEEEEEETkkTEEEE',
    'TEEhhhhEETTEhhhh',
    'TEhhEEhhETTEhEEh',
    'TEhETTEhETTEhETE',
    'TEhhEEhhETTEhhEE',
    'TEEhhhhEETTEEhhh',
    'kTEEEEEETkkTEEEE',
    'kkTTTTTTkkkkTTTT',
    'kkkkkkkkkkkkkkkk',
    'EkkkkkkkEkkkkkkk',
  ];
  const log_m = [
    'EETkkkkkkkkTEEEE',
    'hEETkkkkkkTEEhhh',
    'EhEETkkkkTEEhEEh',
    'TEhETTkkTTEhETTE',
    'EhEETTkkTTEEhEEh',
    'hEETkkkkkkTEEhhh',
    'EETkkkkkkkkTEEEE',
    'TTkkkkkkkkkkTTTT',
    'kkkkTTTTTTkkkkkk',
    'kkTEEEEEEEETkkkk',
    'kTEEhhhhhhEETkkk',
    'TEEhEEEEEhhEETkT',
    'TEhEETTTEEhhETTE',
    'TEhhEEEEEhhEETkT',
    'kTEEhhhhhhEETkkk',
    'kkTEEEEEEEETkkkk',
  ];
  const cot_t = [
    'kkkkkkkkkkkkkkkk',
    'tttttttttttttttt',
    'TTTtTTTTTTTtTTTT',
    'TTTTTTTTTTTTTTTT',
    'kkkkkkkkkkkkkkkk',
    'SSckSssSSckSSckk',
    'ssckSsfssckSsscS',
    'ssckSssssckSsscS',
    'cckkccccckkccccc',
    'kkSSckkkkSSckkkk',
    'SSsssSSckSssSckS',
    'ssssfssckSsssckS',
    'cssssssckSsssckS',
    'kcccccckkcccckkc',
    'ckkkkkkkSSckkkkk',
    'sSSckcSSsssckcSS',
  ];
  const cot_m = [
    'ssssckSsssssckSs',
    'ssssckSsssssckSs',
    'ssssckSsssfsckSs',
    'cccckkcccccckkSs',
    'kkkkSSckkkkkkkcc',
    'SSckSssSSckSSckk',
    'ssckSsfssckSsscS',
    'ssckSssssckSsscS',
    'cckkccccckkccccc',
    'kkSSckkkkSSckkkk',
    'SSsssSSckSssSckS',
    'ssssfssckSsssckS',
    'cssssssckSsssckS',
    'kcccccckkcccckkc',
    'ckkkkkkkSSckkkkk',
    'sSSckcSSsssckcSS',
  ];
  const cot_m2 = [
    'ssssckSsssssckSs',
    'ssssckSsssssckSs',
    'ssssckSsssfsckSs',
    'cccckkcccccckkSs',
    'kkkkSSckkkkkkkcc',
    'kkkkkkkkkkkkkkkk',
    'tttttttttttttttt',
    'TTTTtTTTTTTTtTTT',
    'kkkkkkkkkkkkkkkk',
    'kkSSckkkkSSckkkk',
    'SSsssSSckSssSckS',
    'ssssfssckSsssckS',
    'cssssssckSsssckS',
    'kcccccckkcccckkc',
    'ckkkkkkkSSckkkkk',
    'sSSckcSSsssckcSS',
  ];
  const cot_mw = [
    'ssssckSsssssckSs',
    'ssssckSsssssckSs',
    'kkkkkkkkkkkkkkkk',
    'cktttttttttttkSs',
    'cktkkkkkkkkktkss',
    'cktkZZykZZyYtkcS',
    'cktkZyyYkyyYtkss',
    'cktkyyYokyYotkss',
    'cktkkkkkkkkktkss',
    'cktkyYYokYYotkSs',
    'cktkYYookYootkss',
    'cktkkkkkkkkktkcs',
    'ckttttttttttttks',
    'ckTTTTTTTTTTTTkk',
    'ckkkkkkkkkkkkkkk',
    'sSSckcSSsssckcSS',
  ];
  const thatch_t = [
    'kkkkkkkkkkkkkkkk',
    'WWWWWWWWWWWWWWWW',
    'WWWWWWWWWWWWWWWW',
    'IWWWWIIWWWWWWIIW',
    'iIIIIiiIIWIIIiiI',
    'qiiiqqpiiIiiqqpi',
    'PqqqpPpqqiqqPpqq',
    'pPppPpPppPppPpPp',
    'ppqpppqpppqpppqp',
    'qpqpqpqpqpqpqpqp',
    'qqkqqqkqqkqqqkqq',
    'kkkkkkkkkkkkkkkk',
    'PpPppPpPppPppPpP',
    'ppqppppqpppqpppp',
    'pqpqppqpqpqpqppq',
    'qqpqqpqqqpqqpqqq',
  ];
  const thatch_m = [
    'kqqkqqqkqqkqqqkq',
    'kkkkkkkkkkkkkkkk',
    'pPppPpPppPppPpPp',
    'ppqpppqpppqpppqp',
    'qpqpqpqpqpqpqpqp',
    'qqpqqqpqqpqqqpqq',
    'kkkkkkkkkkkkkkkk',
    'PpPppPpPppPppPpP',
    'ppqppppqpppqpppp',
    'pqpqppqpqpqpqppq',
    'qqpqqpqqqpqqpqqq',
    'kqqkqqqkqqkqqqkq',
    'kkkkkkkkkkkkkkkk',
    'pPppPpPppPppPpPp',
    'ppqpppqpppqpppqp',
    'qpqpqpqpqpqpqpqp',
  ];
  const wood_trunk = [
    '.....kteekek....',
    '.....ktkeetk....',
    '.....kteeetk....',
    '.....ktekeek....',
    '.....kteektk....',
    '.....ktkeeek....',
    '.....kteekek....',
    '.....kteeetk....',
    '.....ktkeeek....',
    '.....kteketk....',
    '.....kteeekk....',
    '.....ktkeeek....',
    '.....kteekek....',
    '.....kteeetk....',
    '.....ktkeeek....',
    '.....kteketk....',
  ];
  const wood_crown = [
    '.....kkkkkk.....',
    '...kkWWWWWWkk...',
    '..kWWWWWWWWWWk..',
    '.kWWWWWWIWWWWWk.',
    'kIWWIIWIiIWWIIWk',
    'kiIIiiIiGiIIiiIk',
    'kgiigGigggiigGgk',
    'kGgggggbggGgggbk',
    'kWWkgbkWWkbgkWWk',
    'WWWWkkWWWWkkWWWW',
    'IWWWIIWWIWIIWWWI',
    'iIIIigIIiIgiIIIi',
    'gggbgGggkgGgbggg',
    'kgbkkgbkTkgbkkgk',
    '.kk..kktekk..kk.',
    '.....kteTek.....',
  ];
  const wood_branch = [
    '................',
    '................',
    '..kkk...kkkk....',
    'kkWWWkkkWWWWkkkk',
    'WWWWWWWWWWWWWWWW',
    'IIWWIIWWWWIIIWWI',
    'kkIIkkIIIIkkkIIk',
    'tttkkttttktttkkt',
    'ekeekeekeeekeeke',
    'keekeeeekeeeekee',
    'kkkkkkkkkkkkkkkk',
    'kkkkkkkkkkkkkkkk',
    '................',
    '................',
    '................',
    '................',
  ];
  const wsnowL = { I: 'W', i: 'I' }, wsnowR = { W: 'I', I: 'i' };
  // The thatch's gable ends: the roof slopes away at the eaves.
  const thatchEnd = (rows, which) => side(rows, which, [6, 5, 4, 3, 2, 1, 0]);
  def(wood, {
    wood_snow_t: wsnow_t,
    wood_snow_m: wsnow_m,
    wood_snow_m2: wsnow_m2,
    wood_snow_tl: side(wsnow_t, 'l', [3, 1, 0], wsnowL),
    wood_snow_tr: side(wsnow_t, 'r', [3, 1, 0], wsnowR),
    wood_snow_ml: side(wsnow_m, 'l', [0], wsnowL),
    wood_snow_mr: side(wsnow_m, 'r', [0], wsnowR),
    wood_log_t: log_t,
    wood_log_m: log_m,
    wood_cottage_t: cot_t,
    wood_cottage_m: cot_m,
    wood_cottage_m2: cot_m2,
    wood_cottage_mw: cot_mw,
    wood_thatch_t: thatch_t,
    wood_thatch_m: thatch_m,
    wood_thatch_tl: thatchEnd(thatch_t, 'l'),
    wood_thatch_tr: thatchEnd(thatch_t, 'r'),
    wood_trunk,
    wood_crown,
    wood_branch,
  });

  /* =============================================================== RIVER */
  // The road toward Geneva in autumn: turf strewn with leaves, mossy
  // boulders, and a river the Creature swims (it shows through the water).
  const river = {
    k: 0x0f, e: 0x08, n: 0x07, S: 0x10, s: 0x00, c: 0x0c, W: 0x30,
    h: 0x2a, G: 0x1a, g: 0x0a, x: 0x27, X: 0x16,     // turf and leaves
    M: 0x2a,                                         // moss in the sun
    I: 0x31, i: 0x21, j: 0x11, u: 0x12, J: 0x02, b: 0x01,  // water
    y: 0x28, Y: 0x18, t: 0x07, T: 0x08,              // planks, rope
  };
  const rground_t = [
    'kkkkkkkkkkkkkkkk',
    'hGhhGGhGhhGGhhGh',
    'GGGGGGGGGGGGGGGG',
    'GGXxGGGgGGGGGGGG',
    'gGgXgGggGgggXxgg',
    'kgkgggkggkgggXkg',
    'ekkgkkekkekgkkek',
    'eeeeeeeeeeeeeeee',
    'eeeeeeeeeeeeeeee',
    'eekkkeeeeeeeeeee',
    'ekSSskeeeeenneee',
    'ekscckeeeeeeeeee',
    'eekkkeeeeeeekeee',
    'eeeeeeennneeeeee',
    'eeekeeeeeeeeeeee',
    'eeeeeeeeeeeeneee',
  ];
  const rground_m = [
    'eeeeeeeeeeeeeeee',
    'eeneeeeeeeeeeeee',
    'eeeeeeeeeeeeneee',
    'eeeeeeeeekkkeeee',
    'eeeeeeeekSSskeee',
    'eeeeeeeeekkkeeee',
    'eeeeeeeeeeeeeeee',
    'nneeeeeeeeeeeene',
    'eennneeeeeeeeeee',
    'eeeeeneeeeeeeeee',
    'eekkkeeeeeeeeeee',
    'ekSSskeeeeeeeeee',
    'eekkkeeeeeeeeeee',
    'eeeeeeeeeenneeee',
    'eeeeeeeeeeeeenne',
    'eeeneeeeeeeeeeee',
  ];
  const rground_m2 = [
    'eeeeeeeeeeeeeeee',
    'eeneeeeeeeeeeeee',
    'eeeeeeekkkkeeeee',
    'eeeeeekSSSskeeee',
    'eeeeekSSsssskeee',
    'eeeeeksssssckeee',
    'eeeeeekcccckeeee',
    'eeeeeeekkkkeeene',
    'eeeeeneeeeeeeeee',
    'eeeeeeeeeeeeeeee',
    'eneeeeeeeeeeeeee',
    'eennneeeeeeekkee',
    'eeeennneeeekSske',
    'eeeneeenneeekkee',
    'eeeeeeeeeneeeeee',
    'eeeeeeeeeeeeeeee',
  ];
  const boulder_t = [
    '....kkkkkkkk....',
    '..kkMMGMMGGGkk..',
    '.kMGGGGGGGgGGgk.',
    'kGGgGGGGgGGggggk',
    'kgGgSSggggSSgggk',
    'kSSSSSSSSSSSSSsk',
    'kSSSWSSSSSSSssck',
    'kSSSSSSSSSSSsssk',
    'ksSSSSSSSSsssssk',
    'kssSSSSSSssssssk',
    'kssssSSsssssscck',
    'kcsssssssscssssk',
    'kcssssssssssscck',
    'kkccssssssssccck',
    'kkkcccccccccckkk',
    'kkkkkkkkkkkkkkkk',
  ];
  const boulder_m = [
    'kSSSSSSkkSSSSSSk',
    'SSWSSSSsksSSSSSs',
    'SSSSSSsscksSSSss',
    'sSSSSssccksSsssc',
    'ssSsssccckssssck',
    'kssssccckkkcccck',
    'kkccccckkSSSkkkk',
    'SkkkkkkSSSSSSskS',
    'SSSSkkSSWSSSSsck',
    'SSSSSkSSSSSSsscS',
    'SSSssksSSSssssck',
    'ssssckssssssscck',
    'cssscckcsssccckk',
    'kcccckkkkcccckkS',
    'kkkkkkSSSkkkkkSS',
    'kSSSkSSSSSSkkSSS',
  ];
  const boulder_m2 = [
    'kSSSSSSkkSSSSSSk',
    'SSWSSSSskSSSSSSs',
    'SSSSSSsscSSsSSss',
    'sSSSSssckssSsssc',
    'ssSsssccksssssck',
    'ksssscckksccccck',
    'kkcccckkkkkkkkkk',
    'SkkkkSSSSSSkkkkS',
    'SSkkSSSSSSSSskkS',
    'SSSkSSWSSSSssckS',
    'SSskSSSSSSssscks',
    'ssckssSSssssccks',
    'csckcssssssccckc',
    'kckkkcccccccckkk',
    'kkkSSkkkkkkkkkSS',
    'kSSSSSSkkSSSSSSk',
  ];
  const river_w1 = [
    '................',
    '................',
    '................',
    '....WWW.........',
    '..WIIiIWW....WWW',
    'WIiiiijiiIWWIIii',
    'iijjjjjjjjiiijjj',
    'jjjjujjjjjjjjjju',
    'ujuuuuujuuuujuuu',
    '.u.u.u.u.u.u.u.u',
    'u.J.u.J.u.J.u.J.',
    '.J...J...J...J..',
    'u...J...J...J...',
    '...J...J...J...J',
    '..J...J...J...Ju',
    '.J...J...J...J..',
  ];
  const river_w2 = [
    '................',
    '................',
    '................',
    '.........WWW....',
    'WWW....WWIIiIWW.',
    'iiIWWIIiiiijiiIW',
    'jjjiiijjjjjjjjii',
    'jjjjjjjjjujjjjjj',
    'uuujuuuujuuuuuuj',
    '.u.u.u.u.u.u.u.u',
    'u.u.J.u.J.u.J.u.',
    '.J...J...J...J..',
    'u...J...J...J...',
    '...J...J...J...J',
    '..J...J...J...Ju',
    '.J...J...J...J..',
  ];
  const river_w3 = [
    '................',
    '................',
    '................',
    '................',
    '.WWW......WWW...',
    'IiiIWW..WWiiIWW.',
    'jjjiiIWWIijjjiIW',
    'jjujjjiijjjjjjjj',
    'uuuuujuuuujuuuuu',
    '.u.u.u.u.u.u.u.u',
    'J.u.J.u.J.u.J.u.',
    '.J...J...J...J..',
    'u...J...J...J...',
    '...J...J...J...J',
    '..J...J...J...Ju',
    '.J...J...J...J..',
  ];
  const river_d1 = [
    'J...J...J...J...',
    '...J...J...J...J',
    '..J.u.J...J...J.',
    '.J...J...J...J..',
    'J...J...J...J...',
    '...J...J...J...J',
    '..J...J...J.u.J.',
    '.J...J...J...J..',
    'J...J...J...J...',
    '...J...J...J...J',
    '..J...J...J...J.',
    '.J...J...J...J..',
    'u...J...J...J...',
    '...J...J...J...J',
    '..J...J...J...Ju',
    '.J...J...J...J..',
  ];
  const river_d2 = [
    'J...J...J...J...',
    '...J..uJ...J...J',
    '.uJ...J...J...J.',
    '.J...J...J...J..',
    'J...J...J...J...',
    '...J...J...J...J',
    '..J...J...J...J.',
    '.J...J...J...J..',
    'J...J...J...J...',
    '...J.u.J...J...J',
    '..J...J...J...J.',
    '.J...J...J...J..',
    'J...J...J...J...',
    '...J.b.J...J...J',
    '..J...J...J...J.',
    '.J...J...J...J..',
  ];
  // A plank footbridge with a rope rail: two planks and the rope's sag.
  // A plank footbridge: a post every few feet and a rope rail sagging between.
  const river_bridge = [
    'kkk.............',
    'kyykk.........kk',
    'kykyykk.....kkyy',
    'kYkkkyykkkkkyykk',
    'kyk..kkyyyyykk..',
    'kyk....kkkkk....',
    'kkkkkkkkkkkkkkkk',
    'yYyyyyykyYyyyyyk',
    'YtYYYtYkYYYtYYtk',
    'kkkkkkkkkkkkkkkk',
    'kTk.............',
    '.k..............',
    '................',
    '................',
    '................',
    '................',
  ];
  const rgL = { G: 'h', g: 'G' }, rgR = { h: 'G', G: 'g' };
  const boL = { s: 'S', c: 's' }, boR = { S: 's', s: 'c' };
  def(river, {
    river_ground_t: rground_t,
    river_ground_m: rground_m,
    river_ground_m2: rground_m2,
    river_ground_tl: side(rground_t, 'l', [3, 1, 0], rgL),
    river_ground_tr: side(rground_t, 'r', [3, 1, 0], rgR),
    river_ground_ml: side(rground_m, 'l', [0], rgL),
    river_ground_mr: side(rground_m, 'r', [0], rgR),
    river_rock_t: boulder_t,
    river_rock_m: boulder_m,
    river_rock_m2: boulder_m2,
    river_rock_tl: side(boulder_t, 'l', [4, 2, 1, 0], boL),
    river_rock_tr: side(boulder_t, 'r', [4, 2, 1, 0], boR),
    river_rock_ml: side(boulder_m, 'l', [0], boL),
    river_rock_mr: side(boulder_m, 'r', [0], boR),
    river_water1: river_w1,
    river_water2: river_w2,
    river_water3: river_w3,
    river_deep1: river_d1,
    river_deep2: river_d2,
    river_bridge,
  });

  /* ========================================================= backgrounds */
  const K = FK.bgKit;
  const { canvas, px, sky, disc, stars } = K;
  const SW = FK.W, SH = FK.H;
  const wrap = (x, w) => ((x % w) + w) % w;

  /*
   * Storm-cloud underside: rows of hanging lobes, each lower row drawn over
   * the one above it, every lobe lit along its lower rim (the lightning and
   * the town below) and dark into its body. Rows: { y, r0, r1, tones:
   * [body, mid, rim] }. The ceiling above the first row is solid body.
   */
  function lobes(w, h, seed, o) {
    const c = canvas(w, h), g = c.getContext('2d');
    const r = FK.rng(seed);
    const T0 = o.rows[0].tones;
    if (!o.open) px(g, 0, 0, T0[0], w, Math.max(0, o.rows[0].y));
    for (const R of o.rows) {
      const list = [];
      for (let x = r() * 10; x < w;) {
        const rr = R.r0 + r() * (R.r1 - R.r0);
        if (R.keep !== undefined && r() > R.keep) { x += rr * 1.5; continue; }
        list.push({ x: x + rr * 0.5, y: R.y + (r() - 0.5) * (R.amp || 0), r: rr });
        x += rr * (0.9 + r() * 0.7);
      }
      const T = R.tones, flat = R.flat || 0.6;
      for (const L of list) {
        for (let y = Math.floor(L.y - L.r * flat); y <= L.y + L.r * flat + 1; y++) {
          if (y < 0 || y >= h) continue;
          for (let x = Math.floor(L.x - L.r); x <= L.x + L.r; x++) {
            const dx = (x - L.x) / L.r;
            if (dx * dx > 1) continue;
            const half = Math.sqrt(1 - dx * dx) * L.r * flat;
            const bottom = L.y + half;
            if (y > bottom || y < L.y - half) continue;
            const d = bottom - y;
            // Light comes from below and a little from the left.
            const lit = d - dx * 1.5;
            let col;
            if (d < 1) col = T[2];
            else if (lit < 2.5) col = FK.bayer(x, y) < 0.6 ? T[2] : T[1];
            else if (lit < 4) col = T[1];
            else if (lit < 6.5) col = FK.bayer(x, y) < 0.45 ? T[1] : T[0];
            else col = T[0];
            px(g, wrap(x, w), y, col);
          }
        }
        // A dark edge along the bottom, so lobes separate.
        if (R.edge !== undefined) for (let x = Math.floor(L.x - L.r); x <= L.x + L.r; x++) {
          const dx = (x - L.x) / L.r;
          if (dx * dx > 1) continue;
          const y = Math.round(L.y + Math.sqrt(1 - dx * dx) * L.r * flat) + 1;
          if (y >= 0 && y < h) px(g, wrap(x, w), y, R.edge);
        }
      }
    }
    return c;
  }

  /*
   * A mountain range from an explicit list of summits (so Mont Blanc is where
   * we want it). Each slope is roughened by midpoint displacement; the face
   * toward the light (left) is lit, the far face shaded, and the seam between
   * them wanders. Snow caps each summit down to a ragged line, reaching
   * further down the gullies, which are streaks of shadow running down the
   * lit faces. peaks: { x, y, l, r (slopes), snow (depth) }.
   */
  function range(w, h, peaks, o) {
    const c = canvas(w, h), g = c.getContext('2d');
    const jit = K.ridge(w, o.seed || 3, 0, o.jitter ?? 6, o.rough ?? 0.8);
    const seamJ = K.ridge(w, (o.seed || 3) + 7, 0, 10, 0.7);
    const hem = K.ridge(w, (o.seed || 3) + 3, 0, o.hem ?? 10, 0.85);
    const top = new Array(w), who = new Array(w);
    for (let x = 0; x < w; x++) {
      let best = Infinity, k = 0;
      peaks.forEach((p, i) => {
        for (const ox of [-w, 0, w]) {
          const dx = x - (p.x + ox);
          const y = p.y + (dx < 0 ? -dx * p.l : dx * p.r);
          if (y < best) { best = y; k = i; }
        }
      });
      // Roughness grows away from the summit, so tops stay crisp.
      const p = peaks[k];
      let d = Math.abs(x - p.x); if (d > w / 2) d = w - d;
      top[x] = Math.round(best + jit[x] * Math.min(1, d / 14));
      who[x] = k;
    }
    for (let x = 0; x < w; x++) {
      const p = peaks[who[x]];
      let dxp = x - p.x; if (dxp > w / 2) dxp -= w; if (dxp < -w / 2) dxp += w;
      for (let y = Math.max(0, top[x]); y < h; y++) {
        const depth = y - p.y;
        const lit = dxp < depth * (o.seam ?? 0.3) + seamJ[x] * 0.25 * Math.min(1, depth / 10);
        let col = lit ? o.lit : o.dark;
        // Snow reaches further down in tongues (the couloirs), shorter on ribs.
        const tongue = 0;
        const snowLine = p.y + (p.snow ?? o.snowDepth ?? 14) + hem[x] * 0.7 + tongue;
        if (o.snow !== undefined && y < snowLine) {
          col = lit ? o.snow : o.snowDark;
          // The hem: a dither between snow and rock.
          if (y > snowLine - 3 && FK.bayer(x, y) < (y - snowLine + 3) / 3) col = lit ? o.lit : o.dark;
        } else if (o.crag !== undefined && lit && FK.bayer(x, y) < 0.12 && ((x + y * 2) % 5 === 0)) col = o.crag;
        if (o.fade !== undefined && y > h - (o.fadeRows || 8) && FK.bayer(x, y) < (y - (h - (o.fadeRows || 8))) / (o.fadeRows || 8)) col = o.fade;
        px(g, x, y, col);
      }
      if (o.edge !== undefined && top[x] >= 0) {
        px(g, x, top[x], o.edge);
        // Close steep steps in the outline.
        const n = top[wrap(x + 1, w)];
        for (let y = Math.min(top[x], n) + 1; y < Math.max(top[x], n); y++) px(g, n < top[x] ? wrap(x + 1, w) : x, y, o.edge);
      }
    }
    return c;
  }

  /* -------------------------------------------------------------- Storm */
  // "I saw the lightnings playing on the summit of Mont Blanc in the most
  // beautiful figures": the storm over the lake, the Jura and the Alps.
  {
    const P = {
      n: { // night
        sky: [[0x0f, 0], [0x0c, 118, 14], [0x0f, 152, 4]],
        c1: [0x0f, 0x0f, 0x0c], c2: [0x0f, 0x0c, 0x1c], c3: [0x0f, 0x0c, 0x0c], edge: 0x0f,
        mt: { lit: 0x0f, dark: 0x0f, snow: 0x0c, snowDark: 0x0f, edge: 0x0f },
        jura: 0x0f, juraLit: 0x0f, lake: 0x0f, glint: 0x0c, glint2: 0x1c, town: 0x27,
      },
      l: { // lightning
        sky: [[0x00, 0], [0x10, 76, 12], [0x30, 128, 14]],
        c1: [0x00, 0x10, 0x30], c2: [0x00, 0x10, 0x30], c3: [0x2d, 0x00, 0x10], edge: 0x2d,
        mt: { lit: 0x00, dark: 0x2d, snow: 0x30, snowDark: 0x10, crag: 0x2d, edge: 0x0f },
        jura: 0x2d, juraLit: 0x00, lake: 0x00, glint: 0x10, glint2: 0x30, town: 0x37,
      },
    };
    const build = (C) => {
      const s = sky(SW, SH, C.sky);
      const cl = lobes(512, 96, 41, { rows: [
        { y: 14, r0: 16, r1: 30, amp: 8, tones: C.c1, edge: C.edge },
        { y: 34, r0: 14, r1: 26, amp: 10, tones: C.c1, edge: C.edge },
        { y: 54, r0: 10, r1: 22, amp: 12, tones: C.c2, edge: C.edge, flat: 0.55 },
      ] });
      const peaks = [
        { x: 20, y: 40, l: 1.1, r: 0.9 },
        { x: 70, y: 28, l: 1.3, r: 1.0 },
        { x: 84, y: 34, l: 1.6, r: 1.0 },
        { x: 150, y: 6, l: 0.5, r: 0.55, snow: 26 },   // Mont Blanc: the broad white dome
        { x: 188, y: 18, l: 1.6, r: 1.4 },             // the Aiguille du Midi side
        { x: 206, y: 26, l: 1.6, r: 0.9 },
        { x: 268, y: 38, l: 1.0, r: 1.1 },
        { x: 330, y: 24, l: 1.2, r: 1.5 },
        { x: 346, y: 30, l: 1.8, r: 0.9 },
        { x: 420, y: 36, l: 0.9, r: 1.0 },
        { x: 470, y: 30, l: 1.4, r: 0.8 },
      ];
      const alps = range(512, 64, peaks, Object.assign({ snowDepth: 12, jitter: 10, rough: 0.85, hem: 14, seed: 5, seam: 0.25 }, C.mt));
      // The Jura: a long low ridge across the water, and Geneva's lamps.
      const jura = canvas(512, 30), jg = jura.getContext('2d');
      const jr = K.ridge(512, 21, 14, 14, 0.5);
      for (let x = 0; x < 512; x++) {
        px(jg, x, jr[x], C.jura, 1, 30 - jr[x]);
        if (jr[x] < jr[wrap(x + 1, 512)]) px(jg, x, jr[x] + 1, C.juraLit);
      }
      const rt = FK.rng(5);
      for (let i = 0; i < 26; i++) {
        const x = 300 + Math.floor(rt() * 120), y = 25 + Math.floor(rt() * 4);
        px(jg, x, y, C.town);
      }
      // The lake: black water combed by the wind into long streaks.
      const lake = canvas(512, 80), lg = lake.getContext('2d');
      px(lg, 0, 0, C.lake, 512, 80);
      const r = FK.rng(77);
      for (let i = 0; i < 110; i++) {
        const t = Math.pow(r(), 1.4);
        const y = Math.floor(t * 76) + 2, x = Math.floor(r() * 512);
        const len = 2 + Math.floor((2 + t * 14) * r());
        for (let k = 0; k < len; k++) px(lg, wrap(x + k, 512), y, k === 0 || r() < 0.3 ? C.glint2 : C.glint);
      }
      return { s, cl, alps, jura, lake };
    };
    const N = build(P.n), L = build(P.l);
    const lit = (W) => !!(W && W.flash > 0);
    const pick = (k) => (t, W) => (lit(W) ? L[k] : N[k]);
    FK.makeBG('storm', [
      { img: pick('s'), still: true },
      { img: pick('alps'), f: 0.03, y: 90, fy: 0.02 },
      { img: pick('cl'), f: 0.05, y: 0, fy: 0.02, drift: 0.1 },
      { img: pick('jura'), f: 0.07, y: 128, fy: 0.04 },
      { img: pick('lake'), f: 0.1, y: 156, fy: 0.05, fill: 0x0f },
    ], (g, cx, cy, t, W) => {
      // The bolt itself, for as long as the flash lasts.
      if (lit(W)) {
        const r = FK.rng(Math.floor(((W.t || 0) + W.flash) / 3) * 7 + 1);
        let x = 24 + Math.floor(r() * 208), y = 0;
        const end = 108 + Math.floor(r() * 30);
        const fork = 30 + Math.floor(r() * 40);
        let bx = 0, by = 0;
        const seg = (x0, y0, x1, y1, core, glow) => {
          const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
          for (let k = 0; k <= n; k++) {
            const ix = Math.round(x0 + ((x1 - x0) * k) / n), iy = Math.round(y0 + ((y1 - y0) * k) / n);
            if (glow !== undefined) { px(g, ix - 1, iy, glow); px(g, ix + 1, iy, glow); }
            px(g, ix, iy, core);
          }
        };
        while (y < end) {
          const nx = x + Math.floor((r() - 0.5) * 12), ny = y + 5 + Math.floor(r() * 7);
          seg(x, y, nx, ny, 0x30, 0x31);
          if (!bx && y > fork) { bx = x; by = y; }
          x = nx; y = ny;
        }
        if (bx) {
          let fx = bx, fy = by;
          const dir = r() < 0.5 ? -1 : 1;
          for (let k = 0; k < 4; k++) {
            const nx = fx + dir * (3 + Math.floor(r() * 6)), ny = fy + 4 + Math.floor(r() * 5);
            seg(fx, fy, nx, ny, 0x31);
            fx = nx; fy = ny;
          }
        }
      }
      // Far rain in grey sheets, slower than the near rain.
      const T = t || 0, col = lit(W) ? 0x00 : 0x0c;
      for (let i = 0; i < 64; i++) {
        const x = wrap(i * 37 - cx * 0.25 + T * 1.1, 290) - 17;
        const y = wrap(i * 71 + T * 3.4, 230) - 6;
        px(g, x, y, col); px(g, x + 1, y + 3, col);
      }
    });
  }

  /* ------------------------------------------------------------ Glacier */
  // "The sea, or rather the vast river of ice, wound among its dependent
  // mountains, whose aerial summits hung over its recesses."
  {
    const s = sky(SW, SH, [[0x12, 0], [0x11, 40, 10], [0x21, 86, 12], [0x31, 132, 10]]);
    const sg = s.getContext('2d');
    const cl = K.clouds(512, 90, 17, 6, { y0: 18, y1: 70, outline: 0x21, dark: 0x31, lit: 0x30 });
    // Far range: hazy blue, snow-laden.
    const far = range(512, 70, [
      { x: 30, y: 30, l: 0.8, r: 0.9 }, { x: 110, y: 14, l: 0.7, r: 0.8, snow: 26 },
      { x: 200, y: 34, l: 0.9, r: 0.7 }, { x: 290, y: 20, l: 0.6, r: 0.9, snow: 22 },
      { x: 380, y: 36, l: 0.9, r: 0.8 }, { x: 450, y: 24, l: 0.8, r: 0.7 },
    ], { lit: 0x21, dark: 0x11, snow: 0x30, snowDark: 0x31, snowDepth: 18, jitter: 8, rough: 0.8, hem: 10, seed: 31, seam: 0.3 });
    // The aiguilles: clusters of granite needles over shoulders of snow.
    // Each cluster is a broad snowy base with steep spires along its crest.
    const needles = [], shoulders = [];
    const rn = FK.rng(8);
    for (let x = 20; x < 500;) {
      const top = Math.floor(rn() * 12), wid = 40 + Math.floor(rn() * 30);
      shoulders.push({ x: x + wid / 2, y: top + 30, l: 0.7, r: 0.8, snow: 64 });
      const n = 3 + Math.floor(rn() * 4);
      for (let k = 0; k < n; k++) {
        const t = (k + 0.5) / n, hump = Math.sin(t * Math.PI);
        needles.push({ x: x + 6 + t * (wid - 12) + (rn() - 0.5) * 4, y: Math.round(top + (1 - hump) * 18 + rn() * 6), l: 2.6 + rn() * 1.6, r: 2.2 + rn() * 1.6, snow: 2 + Math.floor(rn() * 3) });
      }
      x += wid + 24 + Math.floor(rn() * 40);
    }
    const aig = range(512, 64, needles, { lit: 0x10, dark: 0x00, snow: 0x30, snowDark: 0x31, snowDepth: 6, jitter: 2, rough: 0.9, hem: 6, seed: 12, seam: 0.2, edge: 0x2d });
    // Snowfields banked against their feet.
    aig.getContext('2d').drawImage(range(512, 64, shoulders, { lit: 0x30, dark: 0x31, snow: 0x30, snowDark: 0x31, jitter: 3, hem: 4, seed: 19, seam: 0.4, edge: 0x31 }), 0, 0);
    // The sea of ice: pale bands (ogives) curving across the glacier, and
    // crevasses as short dark slashes.
    const sea = canvas(512, 100), eg = sea.getContext('2d');
    for (let y = 0; y < 100; y++) for (let x = 0; x < 512; x++) {
      // Ogives: pale and blue bands bowed downstream, closer together far off.
      const bend = Math.sin((x / 512) * Math.PI * 4 + y / 30) * (1 + y / 22);
      const band = ((Math.sqrt(y + 1) * 8 + bend) % 7);
      let col = y < 3 ? 0x31 : 0x21;
      if (band < 1) col = 0x31;
      else if (band < 2.2 && FK.bayer(x, y) < 0.5) col = 0x31;
      px(eg, x, y, col);
    }
    // Crevasses: short dark slashes in rows, longer near the viewer.
    const rc = FK.rng(44);
    for (let i = 0; i < 90; i++) {
      const y = 3 + Math.floor(Math.pow(rc(), 0.7) * 92), x = Math.floor(rc() * 512);
      const len = 2 + Math.floor((1 + y / 9) * rc());
      for (let k = 0; k < len; k++) {
        px(eg, wrap(x + k, 512), y, y > 30 ? 0x12 : 0x11);
        if (y > 40 && k > 0 && k < len - 1) px(eg, wrap(x + k, 512), y + 1, 0x02);
      }
    }
    px(eg, 0, 0, 0x31, 512, 1);
    FK.makeBG('glacier', [
      { img: s, still: true },
      { img: far, f: 0.05, y: 50, fy: 0.03 },
      { img: cl, f: 0.07, y: 0, fy: 0.03, drift: 0.06 },
      { img: aig, f: 0.12, y: 64, fy: 0.06 },
      { img: sea, f: 0.2, y: 124, fy: 0.1, fill: 0x21 },
    ]);
  }

  /* --------------------------------------------------------- Winter wood */
  // The forest by night: a low moon, ranks of snowy pines, falling snow.
  {
    const s = sky(SW, SH, [[0x0f, 0], [0x0c, 96, 16], [0x02, 150, 10]]);
    const sg = s.getContext('2d');
    stars(sg, SW, 110, 19, 46, [0x30, 0x31, 0x21, 0x10]);
    FK.moon(sg, 190, 52, 13, 0);
    // A soft halo around the moon.
    for (let y = -26; y <= 26; y++) for (let x = -26; x <= 26; x++) {
      const d = Math.sqrt(x * x + y * y);
      if (d > 15 && d < 26 && FK.bayer(190 + x, 52 + y) < (26 - d) / 30) px(sg, 190 + x, 52 + y, 0x0c);
    }
    /*
     * A pine: a stack of drooping tiers, each tier darker beneath and loaded
     * with snow along its upper edge on the moonlit (right) side.
     */
    const pine = (g, x, base, hgt, C) => {
      const tiers = Math.max(3, Math.round(hgt / 7));
      px(g, x - 1, base - 3, C.trunk, 2, 4);
      for (let i = 0; i < tiers; i++) {
        const t = i / tiers;
        const y0 = Math.round(base - 3 - t * hgt), th = Math.round(hgt / tiers) + 3;
        const half = Math.round((1 - t) * hgt * 0.36 + 2);
        for (let yy = 0; yy < th; yy++) {
          const w = Math.round(half * (0.35 + 0.65 * (yy / th)));
          const y = y0 - th + yy;
          px(g, x - w, y, C.body, w * 2 + 1, 1);
          if (C.snow !== undefined) {
            // Snow lies on each tier's slope and in a band at its tip.
            if (yy === th - 2 || yy === th - 1) px(g, x - w + 1, y, C.shade, w * 2 - 1, 1);
            if (yy < th - 2) { px(g, x + w - 1, y, C.snow, 2, 1); px(g, x - w, y, C.snowDark, 1, 1); }
            if (yy === 0) px(g, x - w, y, C.snow, w * 2 + 1, 1);
          }
        }
      }
      if (C.snow !== undefined) px(g, x, base - 4 - hgt - 2, C.snow, 1, 2);
    };
    const ridgeOfPines = (w, h, seed, C) => {
      const c = canvas(w, h), g = c.getContext('2d');
      const r = FK.rng(seed);
      px(g, 0, h - C.floor, C.ground, w, C.floor);
      for (let x = 0; x < w; x += C.gap[0] + Math.floor(r() * C.gap[1])) {
        const hh = C.h[0] + Math.floor(r() * C.h[1]);
        for (const ox of [-w, 0, w]) pine(g, x + ox, h - C.floor + 2, hh, C);
      }
      return c;
    };
    const far = ridgeOfPines(512, 80, 3, { floor: 10, ground: 0x0f, body: 0x0f, shade: 0x0f, trunk: 0x0f, gap: [6, 8], h: [28, 30] });
    const mid = ridgeOfPines(512, 110, 7, { floor: 14, ground: 0x0f, body: 0x0f, shade: 0x0f, trunk: 0x0f, snow: 0x02, snowDark: 0x0f, gap: [14, 16], h: [44, 40] });
    const mg = mid.getContext('2d');
    // Snow lying in the clearing under the middle trees.
    for (let x = 0; x < 512; x++) for (let y = 110 - 14; y < 110; y++) {
      if (FK.bayer(x, y) < (y - 96) / 16) px(mg, x, y, 0x11);
    }
    const near = ridgeOfPines(512, 150, 11, { floor: 6, ground: 0x0f, body: 0x0f, shade: 0x0f, trunk: 0x0f, snow: 0x0c, snowDark: 0x0f, gap: [40, 40], h: [90, 50] });
    FK.makeBG('winterWood', [
      { img: s, still: true },
      { img: far, f: 0.1, y: 96, fy: 0.05, fill: 0x0f },
      { img: mid, f: 0.25, y: 86, fy: 0.1, fill: 0x11 },
      { img: near, f: 0.45, y: 74, fy: 0.2, fill: 0x0f },
    ], (g, cx, cy, t) => {
      // Big slow flakes behind the play (the stage adds its own in front).
      const T = t || 0;
      for (let i = 0; i < 36; i++) {
        const x = wrap(i * 47 + Math.sin((T + i * 40) / 40) * 6 - cx * 0.35 + T * 0.15, 270) - 7;
        const y = wrap(i * 61 + T * (0.25 + (i % 3) * 0.12), 230) - 4;
        px(g, x, y, i % 5 ? 0x11 : 0x21);
      }
    });
  }

  /* -------------------------------------------------------------- Autumn */
  // Golden hour on the road: low sun, blue hills, a glint of the lake, and
  // forests turning.
  {
    const s = sky(SW, SH, [[0x21, 0], [0x31, 40, 12], [0x37, 96, 12], [0x38, 124, 8], [0x27, 146, 6]]);
    const sg = s.getContext('2d');
    disc(sg, 64, 132, 14, 0x37);
    disc(sg, 64, 132, 11, 0x38);
    disc(sg, 64, 132, 8, 0x30);
    const cl = K.clouds(512, 90, 5, 6, { y0: 20, y1: 70, outline: 0x27, dark: 0x37, lit: 0x30 });
    // Far hills, blue-violet in the haze, with the lake glinting at their feet.
    const far = canvas(512, 70), fg = far.getContext('2d');
    const fr = K.ridge(512, 61, 26, 34, 0.55);
    for (let x = 0; x < 512; x++) {
      px(fg, x, fr[x], 0x03, 1, 70 - fr[x]);
      if (fr[x] <= fr[wrap(x - 1, 512)]) px(fg, x, fr[x], 0x13);
    }
    px(fg, 0, 58, 0x31, 512, 12);
    const rl = FK.rng(3);
    for (let i = 0; i < 40; i++) { const x = Math.floor(rl() * 512), y = 59 + Math.floor(rl() * 10); px(fg, x, y, 0x30, 2 + Math.floor(rl() * 5), 1); }
    px(fg, 0, 58, 0x21, 512, 1);
    /*
     * Autumn woods: round crowns in two or three warm colours. Each crown is
     * a disc lit on its sunward (left) side, dark at the bottom.
     */
    const woods = (w, h, seed, o) => {
      const c = canvas(w, h), g = c.getContext('2d');
      const r = FK.rng(seed);
      const hill = K.ridge(w, seed + 1, o.base, o.amp, 0.5);
      for (let x = 0; x < w; x++) px(g, x, hill[x], o.ground, 1, h - hill[x]);
      const trees = [];
      for (let x = 0; x < w; x += o.gap + Math.floor(r() * o.gap)) {
        const rr = o.r0 + Math.floor(r() * (o.r1 - o.r0));
        trees.push({ x, y: hill[wrap(x, w)] - rr * 0.6, r: rr, pal: o.pals[Math.floor(r() * o.pals.length)] });
      }
      trees.sort((a, b) => a.y - b.y);
      for (const t of trees) for (const ox of [-w, 0, w]) {
        const cx = t.x + ox;
        if (o.trunk !== undefined) px(g, cx, Math.round(t.y), o.trunk, 1, Math.round(t.r * 1.2));
        for (let y = -t.r; y <= t.r; y++) for (let x = -t.r; x <= t.r; x++) {
          const d = x * x + y * y * 1.15;
          if (d > t.r * t.r) continue;
          const L = (-x * 0.6 - y * 0.8) / t.r + (FK.bayer(cx + x, Math.round(t.y) + y) - 0.5) * 0.5;
          const col = d > (t.r - 1) * (t.r - 1) && o.edge !== undefined ? o.edge : L > 0.35 ? t.pal[2] : L > -0.35 ? t.pal[1] : t.pal[0];
          px(g, cx + x, Math.round(t.y) + y, col);
        }
      }
      return c;
    };
    const mid = woods(512, 80, 21, { base: 40, amp: 24, ground: 0x08, gap: 7, r0: 6, r1: 11,
      pals: [[0x07, 0x17, 0x27], [0x08, 0x18, 0x28], [0x07, 0x07, 0x17], [0x0b, 0x0a, 0x18]] });
    const near = woods(512, 150, 33, { base: 40, amp: 20, ground: 0x0f, gap: 9, r0: 10, r1: 18, edge: 0x0f,
      pals: [[0x0f, 0x0f, 0x07], [0x0f, 0x0f, 0x08], [0x0f, 0x0f, 0x17]] });
    // Under the canopy: trunks catching the low sun on their left.
    {
      const ng = near.getContext('2d'), r = FK.rng(71);
      for (let x = 0; x < 512; x += 10 + Math.floor(r() * 18)) {
        const w = 2 + Math.floor(r() * 3), top = 40 + Math.floor(r() * 20);
        px(ng, x, top, 0x08, w, 150 - top);
        px(ng, x, top, 0x07, 1, 150 - top);
      }
    }
    FK.makeBG('autumn', [
      { img: s, still: true },
      { img: cl, f: 0.05, y: 0, fy: 0.02, drift: 0.05 },
      { img: far, f: 0.08, y: 64, fy: 0.04, fill: 0x31 },
      { img: mid, f: 0.2, y: 70, fy: 0.08, fill: 0x08 },
      { img: near, f: 0.35, y: 96, fy: 0.15, fill: 0x0f },
    ], (g, cx, cy, t) => {
      // A few leaves on the wind.
      const T = t || 0;
      for (let i = 0; i < 10; i++) {
        const x = wrap(i * 83 - cx * 0.5 - T * (0.4 + (i % 3) * 0.2), 280) - 12;
        const y = wrap(i * 53 + T * 0.3 + Math.sin((T + i * 50) / 20) * 6, 240) - 8;
        px(g, x, y, i % 2 ? 0x27 : 0x17, 2, 1);
        if ((T + i * 7) % 20 < 10) px(g, x + 1, y + 1, 0x07);
      }
    });
  }
})();
