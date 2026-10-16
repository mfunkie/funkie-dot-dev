'use strict';
/*
 * FRANKEN.EXE art: the title logo. Letters are drawn as masks; the shading
 * (outline, drop shadow, highlight edge, dithered gold-to-blood gradient) is
 * computed so every letter gets exactly the same treatment.
 */
(() => {
  const G = {
    F: [
      'XXXXXXXXXXXXX.',
      'XXXXXXXXXXXXX.',
      '.XXXX....XXXX.',
      '.XXXX.....XXX.',
      '.XXXX......XX.',
      '.XXXX.........',
      '.XXXX....X....',
      '.XXXX...XX....',
      '.XXXXXXXXX....',
      '.XXXXXXXXX....',
      '.XXXX...XX....',
      '.XXXX....X....',
      '.XXXX.........',
      '.XXXX.........',
      '.XXXX.........',
      '.XXXX.........',
      '.XXXX.........',
      '.XXXX.........',
      '.XXXX.........',
      '.XXXX.........',
      'XXXXXXX.......',
      'XXXXXXX.......',
    ],
    R: [
      'XXXXXXXXXX....',
      'XXXXXXXXXXXX..',
      '.XXXX....XXXX.',
      '.XXXX.....XXXX',
      '.XXXX.....XXXX',
      '.XXXX.....XXXX',
      '.XXXX.....XXXX',
      '.XXXX....XXXX.',
      '.XXXXXXXXXXX..',
      '.XXXXXXXXXX...',
      '.XXXX..XXXX...',
      '.XXXX...XXXX..',
      '.XXXX...XXXX..',
      '.XXXX....XXXX.',
      '.XXXX....XXXX.',
      '.XXXX.....XXXX',
      '.XXXX.....XXXX',
      '.XXXX.....XXXX',
      '.XXXX......XXX',
      '.XXXX......XXX',
      'XXXXXXX...XXXX',
      'XXXXXXX....XXX',
    ],
    A: [
      '.....XXXX.....',
      '.....XXXX.....',
      '....XXXXXX....',
      '....XXXXXX....',
      '...XXXX.XXX...',
      '...XXXX.XXX...',
      '...XXXX.XXXX..',
      '..XXXX...XXX..',
      '..XXXX...XXX..',
      '..XXXX...XXXX.',
      '.XXXX.....XXX.',
      '.XXXXXXXXXXXX.',
      '.XXXXXXXXXXXX.',
      '.XXXX.....XXXX',
      'XXXX......XXXX',
      'XXXX......XXXX',
      'XXXX......XXXX',
      'XXXX......XXXX',
      'XXXX......XXXX',
      'XXXX......XXXX',
      'XXXXX....XXXXX',
      'XXXXX....XXXXX',
    ],
    N: [
      'XXXXX.....XXXX',
      'XXXXXX.....XX.',
      '.XXXXX.....XX.',
      '.XXXXXX....XX.',
      '.XXXXXX....XX.',
      '.XX.XXXX...XX.',
      '.XX.XXXX...XX.',
      '.XX..XXXX..XX.',
      '.XX..XXXX..XX.',
      '.XX...XXXX.XX.',
      '.XX...XXXX.XX.',
      '.XX....XXXXXX.',
      '.XX....XXXXXX.',
      '.XX.....XXXXX.',
      '.XX.....XXXXX.',
      '.XX......XXXX.',
      '.XX......XXXX.',
      '.XX.......XXX.',
      '.XX.......XXX.',
      '.XX........XX.',
      'XXXX.......XX.',
      'XXXX........X.',
    ],
    K: [
      'XXXXXXX..XXXXX',
      'XXXXXXX..XXXXX',
      '.XXXX.....XX..',
      '.XXXX....XX...',
      '.XXXX...XX....',
      '.XXXX..XX.....',
      '.XXXX.XX......',
      '.XXXXXXX......',
      '.XXXXXXXX.....',
      '.XXXXXXXX.....',
      '.XXXX.XXXX....',
      '.XXXX.XXXX....',
      '.XXXX..XXXX...',
      '.XXXX..XXXX...',
      '.XXXX...XXXX..',
      '.XXXX...XXXX..',
      '.XXXX....XXXX.',
      '.XXXX....XXXX.',
      '.XXXX.....XXXX',
      '.XXXX.....XXXX',
      'XXXXXXX..XXXXX',
      'XXXXXXX..XXXXX',
    ],
    E: [
      'XXXXXXXXXXXXX.',
      'XXXXXXXXXXXXX.',
      '.XXXX....XXXX.',
      '.XXXX.....XXX.',
      '.XXXX......XX.',
      '.XXXX.........',
      '.XXXX....X....',
      '.XXXX...XX....',
      '.XXXXXXXXX....',
      '.XXXXXXXXX....',
      '.XXXX...XX....',
      '.XXXX....X....',
      '.XXXX.........',
      '.XXXX.........',
      '.XXXX.........',
      '.XXXX......XX.',
      '.XXXX.....XXX.',
      '.XXXX....XXXX.',
      '.XXXX...XXXXX.',
      '.XXXX..XXXXXX.',
      'XXXXXXXXXXXXX.',
      'XXXXXXXXXXXXX.',
    ],
    S: [
      '...XXXXXXX.XX.',
      '.XXXXXXXXXXXX.',
      '.XXXX....XXXX.',
      'XXXX......XXX.',
      'XXXX.......XX.',
      'XXXX..........',
      'XXXXX.........',
      '.XXXXXX.......',
      '.XXXXXXXX.....',
      '..XXXXXXXXX...',
      '....XXXXXXXX..',
      '......XXXXXXX.',
      '........XXXXX.',
      '.........XXXX.',
      '..........XXXX',
      '..........XXXX',
      'XX........XXXX',
      'XXX.......XXXX',
      'XXXX.....XXXX.',
      'XXXXX...XXXXX.',
      'XXXXXXXXXXXX..',
      'XX.XXXXXXX....',
    ],
    T: [
      'XXXXXXXXXXXXXX',
      'XXXXXXXXXXXXXX',
      'XX...XXXX...XX',
      'X....XXXX....X',
      '.....XXXX.....',
      '.....XXXX.....',
      '.....XXXX.....',
      '.....XXXX.....',
      '.....XXXX.....',
      '.....XXXX.....',
      '.....XXXX.....',
      '.....XXXX.....',
      '.....XXXX.....',
      '.....XXXX.....',
      '.....XXXX.....',
      '.....XXXX.....',
      '.....XXXX.....',
      '.....XXXX.....',
      '.....XXXX.....',
      '.....XXXX.....',
      '...XXXXXXXX...',
      '...XXXXXXXX...',
    ],
    I: [
      'XXXXXXXX',
      'XXXXXXXX',
      '..XXXX..',
      '..XXXX..',
      '..XXXX..',
      '..XXXX..',
      '..XXXX..',
      '..XXXX..',
      '..XXXX..',
      '..XXXX..',
      '..XXXX..',
      '..XXXX..',
      '..XXXX..',
      '..XXXX..',
      '..XXXX..',
      '..XXXX..',
      '..XXXX..',
      '..XXXX..',
      '..XXXX..',
      '..XXXX..',
      'XXXXXXXX',
      'XXXXXXXX',
    ],
  };

  /* Build the word as one mask with 2px between letters. */
  function build(word, gap = 2) {
    const hgt = 22;
    let rows = Array.from({ length: hgt }, () => '');
    for (const ch of word) {
      const gl = G[ch];
      if (gl.length !== hgt) throw new Error('logo glyph ' + ch + ' has ' + gl.length + ' rows');
      for (let y = 0; y < hgt; y++) rows[y] += gl[y] + '.'.repeat(gap);
    }
    return rows.map((r) => r.slice(0, r.length - gap));
  }

  /*
   * Shade the mask. Gradient bands top to bottom (with a dithered seam):
   * pale gold, gold, orange, red, deep red. Pixels on an upper or left edge
   * get the highlight; the outline is black; the shadow drops 2px down-right.
   */
  function shade(mask) {
    const h = mask.length, w = mask[0].length;
    const M = (x, y) => y >= 0 && y < h && x >= 0 && x < w && mask[y][x] === 'X';
    const c = document.createElement('canvas');
    c.width = w + 4; c.height = h + 4;
    const g = c.getContext('2d');
    const put = (x, y, col) => { g.fillStyle = FK.color(col); g.fillRect(x, y, 1, 1); };
    // Shadow, then outline, then fill.
    for (let y = -1; y <= h; y++) for (let x = -1; x <= w; x++) {
      if (M(x - 2, y - 2) || M(x - 1, y - 2) || M(x - 2, y - 1)) put(x + 1, y + 1, 0x05);
    }
    for (let y = -1; y <= h; y++) for (let x = -1; x <= w; x++) {
      if (M(x, y)) continue;
      if (M(x - 1, y) || M(x + 1, y) || M(x, y - 1) || M(x, y + 1) || M(x - 1, y - 1) || M(x + 1, y + 1) || M(x + 1, y - 1) || M(x - 1, y + 1)) put(x + 1, y + 1, 0x0f);
    }
    const bands = [[0x38, 0], [0x28, 5], [0x27, 10], [0x16, 15], [0x06, 19]];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (!M(x, y)) continue;
      let col = bands[0][0];
      for (let i = 0; i < bands.length; i++) {
        if (y >= bands[i][1]) col = bands[i][0];
        // Dither the row above each band change.
        if (i > 0 && y === bands[i][1] - 1 && (x + y) % 2 === 0) col = bands[i][0];
      }
      if (!M(x, y - 1) || !M(x - 1, y)) col = y < 10 ? 0x30 : 0x37;
      if (!M(x + 1, y) && M(x - 1, y) && y > 3) col = y < 12 ? 0x17 : 0x05;
      put(x + 1, y + 1, col);
    }
    return c;
  }

  FK.buildLogo = () => {
    FK.PIC.logo = shade(build('FRANKENSTEIN'));
    return FK.PIC.logo;
  };
})();
