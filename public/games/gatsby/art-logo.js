'use strict';
/*
 * GATSBY.EXE art: the title logo. The letters are geometry (rings, stems and
 * slanted strokes, thick against thin, the way a 1925 marquee would set them),
 * rasterized to a mask; then every letter gets the same treatment: black
 * outline, a bronze drop shadow, and chrome-gold bands with a bright horizon
 * line across the middle.
 */
(() => {
  const H = 28;

  // Shape helpers, all sampled at pixel centres.
  const ell = (x, y, cx, cy, rx, ry) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1;
  const ring = (x, y, cx, cy, rx, ry, tx, ty = tx) => ell(x, y, cx, cy, rx, ry) && !ell(x, y, cx, cy, rx - tx, ry - ty);
  const box = (x, y, x0, y0, x1, y1) => x >= x0 && x <= x1 && y >= y0 && y <= y1;
  function seg(x, y, x0, y0, x1, y1, r) {
    const dx = x1 - x0, dy = y1 - y0;
    const k = Math.max(0, Math.min(1, ((x - x0) * dx + (y - y0) * dy) / (dx * dx + dy * dy)));
    return Math.hypot(x - (x0 + dx * k), y - (y0 + dy * k)) <= r;
  }

  const LETTERS = {
    G: [22, (x, y) => {
      if (box(x, y, 12, 14, 21.5, 18) || box(x, y, 17, 14, 21.5, 23) && ell(x, y, 11, 14, 10.8, 13.8)) return true;
      if (!ring(x, y, 11, 14, 10.8, 13.8, 5.2, 4.2)) return false;
      return !(x > 13 && y > 6.5 && y < 14);
    }],
    A: [22, (x, y) => {
      if (y < 0 || y > 27.5) return false;
      if (seg(x, y, 11, 1.5, 2.2, 27, 1.3) || seg(x, y, 11, 1.5, 19.3, 27, 2.7)) return true;
      if (box(x, y, 9.5, 0, 12.5, 2.5)) return true;
      // The crossbar sits low, between the legs.
      if (y >= 17 && y <= 19.5) {
        const l = 11 - (y - 1.5) * (8.8 / 25.5), r = 11 + (y - 1.5) * (8.3 / 25.5);
        return x >= l && x <= r;
      }
      return false;
    }],
    T: [20, (x, y) => box(x, y, 0, 0, 20, 4.5) || box(x, y, 7.5, 0, 12.5, 28)],
    S: [18, (x, y) => {
      const top = ring(x, y, 9, 7.5, 8.9, 7.6, 3.4, 3.8);
      const bot = ring(x, y, 9, 20.2, 8.9, 7.6, 4.6, 3.8);
      const keepTop = top && !(x > 9 && y > 7.5) && !(x > 13.5 && y > 4);
      const keepBot = bot && !(x < 9 && y < 20.2) && !(x < 4.5 && y < 23.5);
      return keepTop || keepBot;
    }],
    B: [18, (x, y) => {
      if (box(x, y, 0, 0, 4.6, 28)) return true;
      if (x < 4) return false;
      if (ring(x, y, 7.6, 7, 9.2, 7.2, 3.6, 3.2) && x >= 7.6 || box(x, y, 4, 0, 7.6, 3.2) || box(x, y, 4, 11, 7.6, 14)) return true;
      if (ring(x, y, 8.4, 20.3, 9.6, 7.8, 4.6, 3.4) && x >= 8.4 || box(x, y, 4, 24.6, 8.4, 28)) return true;
      return false;
    }],
    Y: [22, (x, y) => {
      if (seg(x, y, 1.5, 0.5, 11, 15, 1.3) || seg(x, y, 20.5, 0.5, 11, 15, 2.7)) return y >= 0;
      return box(x, y, 8.5, 13, 13.5, 28);
    }],
  };

  function build(word, gap = 3) {
    const rows = Array.from({ length: H }, () => '');
    word.split('').forEach((ch, i) => {
      const [w, f] = LETTERS[ch];
      for (let y = 0; y < H; y++) {
        let r = '';
        for (let x = 0; x < w; x++) r += f(x + 0.5, y + 0.5) ? 'X' : '.';
        rows[y] += r + (i < word.length - 1 ? '.'.repeat(gap) : '');
      }
    });
    return rows;
  }

  function shade(mask) {
    const h = mask.length, w = mask[0].length;
    const M = (x, y) => y >= 0 && y < h && x >= 0 && x < w && mask[y][x] === 'X';
    const c = document.createElement('canvas');
    c.width = w + 6; c.height = h + 6;
    const g = c.getContext('2d');
    const put = (x, y, col) => { g.fillStyle = GG.color(col); g.fillRect(x, y, 1, 1); };
    // A three-pixel bronze extrusion down and to the right, outlined.
    const ext = (x, y) => M(x, y) || M(x - 1, y - 1) || M(x - 2, y - 2) || M(x - 3, y - 3);
    for (let y = -1; y <= h + 3; y++) for (let x = -1; x <= w + 3; x++) {
      if (ext(x, y)) put(x + 1, y + 1, M(x - 3, y - 3) && !M(x - 2, y - 2) ? 0x07 : 0x08);
    }
    for (let y = -1; y <= h + 4; y++) for (let x = -1; x <= w + 4; x++) {
      if (ext(x, y)) continue;
      if (ext(x - 1, y) || ext(x + 1, y) || ext(x, y - 1) || ext(x, y + 1)) put(x + 1, y + 1, 0x0f);
    }
    // The letter's own outline over the extrusion.
    for (let y = -1; y <= h; y++) for (let x = -1; x <= w; x++) {
      if (M(x, y)) continue;
      if (M(x - 1, y) || M(x + 1, y) || M(x, y - 1) || M(x, y + 1)) put(x + 1, y + 1, 0x0f);
    }
    // Chrome gold: pale at the top, deepening, a bright horizon, then gold again.
    const bands = [[0x30, 0], [0x38, 2], [0x28, 8], [0x18, 12], [0x38, 14], [0x28, 16], [0x38, 23]];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (!M(x, y)) continue;
      let col = bands[0][0];
      for (let i = 0; i < bands.length; i++) {
        if (y >= bands[i][1]) col = bands[i][0];
        if (i > 0 && y === bands[i][1] - 1 && (x + y) % 2 === 0) col = bands[i][0];
      }
      if (!M(x - 1, y) && y < 14) col = 0x30;
      else if (!M(x + 1, y) && M(x - 1, y)) col = y < 14 ? 0x18 : 0x08;
      put(x + 1, y + 1, col);
    }
    return c;
  }

  GG.buildLogo = () => {
    GG.PIC.logo = shade(build('GATSBY'));
    return GG.PIC.logo;
  };
  GG.buildLogo();
})();
