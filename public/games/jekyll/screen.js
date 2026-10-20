'use strict';
/*
 * JEKYLL.EXE: the display. It works the way a ZX Spectrum's did, because the
 * Spectrum's one famous limit is this story's subject: every 8x8 cell of
 * the screen has exactly two colours, an INK and a PAPER, and the FLASH bit
 * swaps them. One cell, two natures.
 *
 *   pix   256x192 bits, set = ink
 *   attr  32x24 cells: FLASH(1) BRIGHT(1) PAPER(3) INK(3), as the hardware
 *
 * Everything is drawn into those two arrays and then turned into pixels, so
 * the colour clash is real: a sprite that walks into a cell takes the cell's
 * ink with it. Around the picture is the border, one colour.
 */
(() => {
  const W = 256, H = 192;
  // The usual Spectrum palette: 0xD7 for normal, 0xFF for BRIGHT.
  const N = 0xd7, B = 0xff;
  const RGB = [];
  for (let bright = 0; bright < 2; bright++) {
    const v = bright ? B : N;
    for (let c = 0; c < 8; c++) RGB.push([c & 2 ? v : 0, c & 4 ? v : 0, c & 1 ? v : 0]);
  }
  // 0 black, 1 blue, 2 red, 3 magenta, 4 green, 5 cyan, 6 yellow, 7 white.
  JH.INK = { black: 0, blue: 1, red: 2, magenta: 3, green: 4, cyan: 5, yellow: 6, white: 7 };
  JH.RGB = RGB;

  const A = (ink, paper = 0, bright = 0, flash = 0) => (flash << 7) | (bright << 6) | ((paper & 7) << 3) | (ink & 7);
  JH.attr = A;

  class Screen {
    constructor() {
      this.pix = new Uint8Array(W * H);
      this.attr = new Uint8Array(32 * 24);
      this.border = 0;
    }

    cls(a = A(7, 0)) {
      this.pix.fill(0);
      this.attr.fill(a);
    }

    /* Attributes for a rectangle of cells. */
    paint(cx, cy, cw, ch, a) {
      for (let y = Math.max(0, cy); y < Math.min(24, cy + ch); y++) {
        for (let x = Math.max(0, cx); x < Math.min(32, cx + cw); x++) this.attr[y * 32 + x] = a;
      }
    }

    /* Change only the ink (or paper, or flash) of cells, keeping the rest. */
    ink(cx, cy, ink, bright) {
      if (cx < 0 || cy < 0 || cx >= 32 || cy >= 24) return;
      const i = cy * 32 + cx;
      let a = (this.attr[i] & ~7) | (ink & 7);
      if (bright != null) a = (a & ~64) | (bright ? 64 : 0);
      this.attr[i] = a;
    }
    paper(cx, cy, paper, bright) {
      if (cx < 0 || cy < 0 || cx >= 32 || cy >= 24) return;
      const i = cy * 32 + cx;
      let a = (this.attr[i] & ~56) | ((paper & 7) << 3);
      if (bright != null) a = (a & ~64) | (bright ? 64 : 0);
      this.attr[i] = a;
    }
    flash(cx, cy, on) {
      if (cx < 0 || cy < 0 || cx >= 32 || cy >= 24) return;
      const i = cy * 32 + cx;
      this.attr[i] = on ? this.attr[i] | 128 : this.attr[i] & 127;
    }

    plot(x, y, v = 1) {
      if (x < 0 || y < 0 || x >= W || y >= H) return;
      this.pix[y * W + x] = v;
    }

    /* Clear (or fill) a rectangle of pixels. */
    clear(x, y, w, h, v = 0) {
      for (let j = Math.max(0, y); j < Math.min(H, y + h); j++) this.pix.fill(v, j * W + Math.max(0, x), j * W + Math.min(W, x + w));
    }

    /*
     * A 1-bit picture: rows of 0/1 (Uint8Array, w*h). mode 'set' replaces,
     * 'or' adds ink, 'mask' cuts out the mask then adds the picture.
     */
    blit(bits, w, h, x, y, mode = 'set', mask = null, flipX = false) {
      for (let j = 0; j < h; j++) {
        const py = y + j;
        if (py < 0 || py >= H) continue;
        for (let i = 0; i < w; i++) {
          const px = x + i;
          if (px < 0 || px >= W) continue;
          const si = j * w + (flipX ? w - 1 - i : i);
          const b = bits[si];
          const k = py * W + px;
          if (mode === 'set') this.pix[k] = b;
          else if (mode === 'or') { if (b) this.pix[k] = 1; }
          else if (mode === 'xor') { if (b) this.pix[k] ^= 1; }
          else if (mode === 'mask') { if (mask[si]) this.pix[k] = b; }
        }
      }
    }

    /* Fill a rectangle with an 8x8 (or any) repeating pattern of bits. */
    pattern(x, y, w, h, pat, pw = 8, ph = 8, mode = 'set') {
      for (let j = Math.max(0, y); j < Math.min(H, y + h); j++) {
        for (let i = Math.max(0, x); i < Math.min(W, x + w); i++) {
          const b = pat[(j % ph) * pw + (i % pw)];
          const k = j * W + i;
          if (mode === 'set') this.pix[k] = b;
          else if (mode === 'or') { if (b) this.pix[k] = 1; }
          else if (mode === 'and') { if (!b) this.pix[k] = 0; }
        }
      }
    }

    line(x0, y0, x1, y1, v = 1) {
      // Whole pixels only: the walk below stops when it lands on the end.
      x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
      let dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
      const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
      let err = dx + dy;
      for (;;) {
        this.plot(x0, y0, v);
        if (x0 === x1 && y0 === y1) break;
        const e2 = 2 * err;
        if (e2 >= dy) { err += dy; x0 += sx; }
        if (e2 <= dx) { err += dx; y0 += sy; }
      }
    }

    rect(x, y, w, h, v = 1) {
      this.line(x, y, x + w - 1, y, v);
      this.line(x, y + h - 1, x + w - 1, y + h - 1, v);
      this.line(x, y, x, y + h - 1, v);
      this.line(x + w - 1, y, x + w - 1, y + h - 1, v);
    }

    disc(cx, cy, r, v = 1) {
      for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r + r * 0.6) this.plot(cx + x, cy + y, v);
    }

    /* Into an RGBA buffer the size of the canvas, with the border round it. */
    render(img, bw, bh, ox, oy, phase) {
      const d = img.data;
      const [br, bg, bb] = RGB[this.border & 7];
      for (let i = 0; i < bw * bh; i++) { d[i * 4] = br; d[i * 4 + 1] = bg; d[i * 4 + 2] = bb; d[i * 4 + 3] = 255; }
      for (let y = 0; y < H; y++) {
        const row = (y >> 3) * 32;
        let o = ((oy + y) * bw + ox) * 4;
        for (let x = 0; x < W; x++, o += 4) {
          const a = this.attr[row + (x >> 3)];
          let on = this.pix[y * W + x];
          if (a & 128 && phase) on ^= 1;
          const c = RGB[(a & 64 ? 8 : 0) + (on ? a & 7 : (a >> 3) & 7)];
          d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2];
        }
      }
    }
  }
  JH.Screen = Screen;
  JH.SW = W;
  JH.SH = H;

  /* ------------------------------------------------------------ patterns */

  const pat = (rows) => {
    const out = new Uint8Array(rows.length * rows[0].length);
    rows.forEach((r, y) => { for (let x = 0; x < r.length; x++) out[y * r.length + x] = r[x] === '#' ? 1 : 0; });
    return out;
  };
  JH.pat = pat;
  JH.PAT = {
    d12: pat(['#.......', '........', '....#...', '........', '#.......', '........', '....#...', '........']),
    d25: pat(['#...#...', '........', '..#...#.', '........', '#...#...', '........', '..#...#.', '........']),
    d50: pat(['#.#.#.#.', '.#.#.#.#', '#.#.#.#.', '.#.#.#.#', '#.#.#.#.', '.#.#.#.#', '#.#.#.#.', '.#.#.#.#']),
    d75: pat(['.###.###', '########', '##.###.#', '########', '.###.###', '########', '##.###.#', '########']),
    rain: pat(['#.......', '........', '...#....', '........', '......#.', '........', '.#......', '........']),
  };
})();
