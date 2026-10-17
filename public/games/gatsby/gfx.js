'use strict';
/*
 * GATSBY.EXE: graphics. Sprites, tiles and the font are written as rows of
 * characters, one character per pixel, each standing for an NES palette code.
 * They're compiled to canvases once at boot. Windows are Art Deco: gold
 * double rules with stepped corners.
 */
(() => {
  const NES = GG.NES;
  const SPR = (GG.SPR = {});
  const TILE = (GG.TILE = {});
  const RAW = {};

  const color = (v) => (typeof v === 'number' ? NES[v] : v);

  function paint(rows, legend) {
    const h = rows.length;
    const w = Math.max(...rows.map((r) => r.length));
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const g = c.getContext('2d');
    const img = g.createImageData(w, h);
    for (let y = 0; y < h; y++) {
      const row = rows[y];
      for (let x = 0; x < w; x++) {
        const ch = row[x];
        if (!ch || ch === '.' || ch === ' ') continue;
        const v = legend[ch];
        if (v === undefined) throw new Error(`no color for '${ch}'`);
        if (v === null) continue;
        const hex = color(v);
        const i = (y * w + x) * 4;
        img.data[i] = parseInt(hex.slice(1, 3), 16);
        img.data[i + 1] = parseInt(hex.slice(3, 5), 16);
        img.data[i + 2] = parseInt(hex.slice(5, 7), 16);
        img.data[i + 3] = 255;
      }
    }
    g.putImageData(img, 0, 0);
    return c;
  }
  function flip(c) {
    const f = document.createElement('canvas');
    f.width = c.width; f.height = c.height;
    const g = f.getContext('2d');
    g.translate(c.width, 0); g.scale(-1, 1); g.drawImage(c, 0, 0);
    return f;
  }
  GG.paint = paint;

  /*
   * GG.sprite('victor', legend, { idle: rows, run1: rows, ... }, { anchor })
   * Each frame is drawn bottom-centred on the body that owns it.
   */
  GG.sprite = (name, legend, frames, opt = {}) => {
    RAW[name] = { legend, frames, opt };
    const set = (SPR[name] = {});
    for (const [fname, rows] of Object.entries(frames)) {
      const c = paint(rows, legend);
      set[fname] = { c, f: flip(c), w: c.width, h: c.height, ox: (opt.ox && opt.ox[fname]) || opt.dx || 0, oy: (opt.oy && opt.oy[fname]) || opt.dy || 0 };
    }
    return set;
  };
  /* A palette swap of a sprite already defined. */
  GG.recolor = (name, base, swap, opt) => {
    const r = RAW[base];
    return GG.sprite(name, Object.assign({}, r.legend, swap), r.frames, opt || r.opt);
  };

  /* GG.tiles({ legend }, { name: rows16 }) */
  GG.tiles = (legend, defs) => {
    for (const [name, rows] of Object.entries(defs)) {
      if (rows.length !== 16 || rows.some((r) => r.length !== 16)) {
        throw new Error(`tile ${name} is not 16x16 (${rows.length} rows, widths ${rows.map((r) => r.length).join(',')})`);
      }
      TILE[name] = paint(rows, legend);
    }
  };
  /* Larger pictures (portraits, the logo, props): any size. */
  const PIC = (GG.PIC = {});
  GG.pic = (name, legend, rows) => { PIC[name] = paint(rows, legend); return PIC[name]; };

  /* ---------------------------------------------------------------- font */
  const GLYPHS = {
    A: ['..XXX...', '.XX.XX..', 'XX...XX.', 'XX...XX.', 'XXXXXXX.', 'XX...XX.', 'XX...XX.'],
    B: ['XXXXXX..', 'XX...XX.', 'XX...XX.', 'XXXXXX..', 'XX...XX.', 'XX...XX.', 'XXXXXX..'],
    C: ['..XXXX..', '.XX..XX.', 'XX......', 'XX......', 'XX......', '.XX..XX.', '..XXXX..'],
    D: ['XXXXX...', 'XX..XX..', 'XX...XX.', 'XX...XX.', 'XX...XX.', 'XX..XX..', 'XXXXX...'],
    E: ['XXXXXXX.', 'XX......', 'XX......', 'XXXXXX..', 'XX......', 'XX......', 'XXXXXXX.'],
    F: ['XXXXXXX.', 'XX......', 'XX......', 'XXXXXX..', 'XX......', 'XX......', 'XX......'],
    G: ['..XXXXX.', '.XX.....', 'XX......', 'XX..XXX.', 'XX...XX.', '.XX..XX.', '..XXXXX.'],
    H: ['XX...XX.', 'XX...XX.', 'XX...XX.', 'XXXXXXX.', 'XX...XX.', 'XX...XX.', 'XX...XX.'],
    I: ['.XXXXXX.', '...XX...', '...XX...', '...XX...', '...XX...', '...XX...', '.XXXXXX.'],
    J: ['....XXX.', '.....XX.', '.....XX.', '.....XX.', 'XX...XX.', 'XX...XX.', '.XXXXX..'],
    K: ['XX...XX.', 'XX..XX..', 'XX.XX...', 'XXXX....', 'XXXXX...', 'XX..XX..', 'XX...XX.'],
    L: ['XX......', 'XX......', 'XX......', 'XX......', 'XX......', 'XX......', 'XXXXXXX.'],
    M: ['XX...XX.', 'XXX.XXX.', 'XXXXXXX.', 'XX.X.XX.', 'XX...XX.', 'XX...XX.', 'XX...XX.'],
    N: ['XX...XX.', 'XXX..XX.', 'XXXX.XX.', 'XX.XXXX.', 'XX..XXX.', 'XX...XX.', 'XX...XX.'],
    O: ['.XXXXX..', 'XX...XX.', 'XX...XX.', 'XX...XX.', 'XX...XX.', 'XX...XX.', '.XXXXX..'],
    P: ['XXXXXX..', 'XX...XX.', 'XX...XX.', 'XXXXXX..', 'XX......', 'XX......', 'XX......'],
    Q: ['.XXXXX..', 'XX...XX.', 'XX...XX.', 'XX...XX.', 'XX.XXXX.', 'XX..XX..', '.XXXX.X.'],
    R: ['XXXXXX..', 'XX...XX.', 'XX...XX.', 'XXXXXX..', 'XX.XX...', 'XX..XX..', 'XX...XX.'],
    S: ['.XXXXX..', 'XX...XX.', 'XX......', '.XXXXX..', '.....XX.', 'XX...XX.', '.XXXXX..'],
    T: ['XXXXXX..', '..XX....', '..XX....', '..XX....', '..XX....', '..XX....', '..XX....'],
    U: ['XX...XX.', 'XX...XX.', 'XX...XX.', 'XX...XX.', 'XX...XX.', 'XX...XX.', '.XXXXX..'],
    V: ['XX...XX.', 'XX...XX.', 'XX...XX.', 'XXX.XXX.', '.XXXXX..', '..XXX...', '...X....'],
    W: ['XX...XX.', 'XX...XX.', 'XX...XX.', 'XX.X.XX.', 'XXXXXXX.', 'XXX.XXX.', 'XX...XX.'],
    X: ['XX...XX.', 'XXX.XXX.', '.XXXXX..', '..XXX...', '.XXXXX..', 'XXX.XXX.', 'XX...XX.'],
    Y: ['XX..XX..', 'XX..XX..', 'XX..XX..', '.XXXX...', '..XX....', '..XX....', '..XX....'],
    Z: ['XXXXXXX.', '.....XX.', '....XX..', '...XX...', '..XX....', '.XX.....', 'XXXXXXX.'],
    0: ['.XXXXX..', 'XX...XX.', 'XX..XXX.', 'XX.X.XX.', 'XXX..XX.', 'XX...XX.', '.XXXXX..'],
    1: ['..XX....', '.XXX....', '..XX....', '..XX....', '..XX....', '..XX....', '.XXXX...'],
    2: ['.XXXXX..', 'XX...XX.', '.....XX.', '...XXX..', '.XXX....', 'XX......', 'XXXXXXX.'],
    3: ['.XXXXX..', 'XX...XX.', '.....XX.', '..XXXX..', '.....XX.', 'XX...XX.', '.XXXXX..'],
    4: ['...XXX..', '..XXXX..', '.XX.XX..', 'XX..XX..', 'XXXXXXX.', '....XX..', '....XX..'],
    5: ['XXXXXXX.', 'XX......', 'XXXXXX..', '.....XX.', '.....XX.', 'XX...XX.', '.XXXXX..'],
    6: ['..XXXX..', '.XX.....', 'XX......', 'XXXXXX..', 'XX...XX.', 'XX...XX.', '.XXXXX..'],
    7: ['XXXXXXX.', 'XX...XX.', '....XX..', '...XX...', '..XX....', '..XX....', '..XX....'],
    8: ['.XXXXX..', 'XX...XX.', 'XX...XX.', '.XXXXX..', 'XX...XX.', 'XX...XX.', '.XXXXX..'],
    9: ['.XXXXX..', 'XX...XX.', 'XX...XX.', '.XXXXXX.', '.....XX.', '....XX..', '.XXXX...'],
    '.': ['........', '........', '........', '........', '........', '..XX....', '..XX....'],
    ',': ['........', '........', '........', '........', '........', '..XX....', '..XX....', '.XX.....'],
    '!': ['..XX....', '..XX....', '..XX....', '..XX....', '..XX....', '........', '..XX....'],
    '?': ['.XXXXX..', 'XX...XX.', '....XX..', '...XX...', '...XX...', '........', '...XX...'],
    "'": ['..XX....', '..XX....', '.XX.....'],
    '"': ['.XX.XX..', '.XX.XX..', 'XX.XX...'],
    '-': ['........', '........', '........', '.XXXXX..'],
    ':': ['........', '..XX....', '..XX....', '........', '..XX....', '..XX....'],
    ';': ['........', '..XX....', '..XX....', '........', '..XX....', '..XX....', '.XX.....'],
    '(': ['...XX...', '..XX....', '.XX.....', '.XX.....', '.XX.....', '..XX....', '...XX...'],
    ')': ['.XX.....', '..XX....', '...XX...', '...XX...', '...XX...', '..XX....', '.XX.....'],
    '/': ['......XX', '.....XX.', '....XX..', '...XX...', '..XX....', '.XX.....', 'XX......'],
    '&': ['.XXX....', 'XX.XX...', 'XX.XX...', '.XXX....', 'XX.XX.X.', 'XX..XX..', '.XXX.XX.'],
    '>': ['.XX.....', '..XX....', '...XX...', '....XX..', '...XX...', '..XX....', '.XX.....'],
    '<': ['....XX..', '...XX...', '..XX....', '.XX.....', '..XX....', '...XX...', '....XX..'],
    '#': ['.XX.XX..', 'XXXXXXX.', '.XX.XX..', '.XX.XX..', '.XX.XX..', 'XXXXXXX.', '.XX.XX..'],
    '%': ['XX...XX.', 'XX..XX..', '...XX...', '..XX....', '.XX.....', 'XX..XX..', 'X...XX..'],
    '=': ['........', '........', '.XXXXX..', '........', '.XXXXX..'],
    '_': ['........', '........', '........', '........', '........', '........', '........', 'XXXXXXXX'],
    // Icons share the font so they can sit in a line of text.
    '@': ['.XX.XX..', 'XXXXXXX.', 'XXXXXXX.', 'XXXXXXX.', '.XXXXX..', '..XXX...', '...X....'],   // heart
    '^': ['...X....', '..XXX...', '.XXXXX..', 'XXXXXXX.'],                                     // up arrow
    '~': ['XXXXXXX.', '.XXXXX..', '..XXX...', '...X....'],                                     // down arrow (cursor)
    '$': ['...X....', '.XXXXX..', 'XX.X....', '.XXXXX..', '...X.XX.', '.XXXXX..', '...X....'],
    '+': ['........', '...XX...', '...XX...', '.XXXXXX.', '...XX...', '...XX...'],
    '*': ['...X....', 'X..X..X.', '.X.X.X..', '..XXX...', '.X.X.X..', 'X..X..X.', '...X....'],
    '[': ['.XXXX...', '.XX.....', '.XX.....', '.XX.....', '.XX.....', '.XX.....', '.XXXX...'],
    ']': ['.XXXX...', '...XX...', '...XX...', '...XX...', '...XX...', '...XX...', '.XXXX...'],
    '—': ['........', '........', '........', 'XXXXXXXX'],
    '`': ['...X....', '..XXX...', '.XXXXX..', 'XXXXXXX.', '.XXXXX..', '..XXX...', '...X....'],  // deco diamond
  };
  const FONT = {};
  function glyphCanvas(ch, hex) {
    const rows = GLYPHS[ch];
    const c = document.createElement('canvas');
    c.width = 8; c.height = 8;
    const g = c.getContext('2d');
    g.fillStyle = hex;
    rows.forEach((r, y) => { for (let x = 0; x < r.length; x++) if (r[x] === 'X') g.fillRect(x, y, 1, 1); });
    return c;
  }
  /* The font is cached per color, with a one-pixel drop shadow version. */
  function font(hex) {
    if (FONT[hex]) return FONT[hex];
    const set = {};
    for (const ch of Object.keys(GLYPHS)) set[ch] = glyphCanvas(ch, hex);
    return (FONT[hex] = set);
  }

  /* GG.text(g, 'HELLO', x, y, color, { shadow, align }) */
  GG.text = (g, str, x, y, col = 0x30, opt = {}) => {
    const hex = color(col);
    const s = String(str).toUpperCase();
    let ox = x;
    if (opt.align === 'center') ox = Math.round(x - (s.length * 8) / 2);
    else if (opt.align === 'right') ox = x - s.length * 8;
    if (opt.shadow !== undefined) {
      const sh = font(color(opt.shadow));
      for (let i = 0; i < s.length; i++) { const gl = sh[s[i]]; if (gl) g.drawImage(gl, ox + i * 8 + 1, y + 1); }
    }
    const f = font(hex);
    for (let i = 0; i < s.length; i++) { const gl = f[s[i]]; if (gl) g.drawImage(gl, ox + i * 8, y); }
    return s.length * 8;
  };
  /* Word-wrap to a width in characters. */
  GG.wrap = (str, cols) => {
    const out = [];
    for (const para of String(str).toUpperCase().split('\n')) {
      let line = '';
      for (const word of para.split(' ')) {
        if (!line) line = word;
        else if (line.length + 1 + word.length <= cols) line += ' ' + word;
        else { out.push(line); line = word; }
      }
      out.push(line);
    }
    return out;
  };

  /* --------------------------------------------------------------- draw */
  GG.drawSprite = (g, name, frame, x, y, flipX, alpha) => {
    const set = SPR[name];
    if (!set) return;
    const s = set[frame];
    if (!s) return;
    if (alpha !== undefined) g.globalAlpha = alpha;
    g.drawImage(flipX ? s.f : s.c, Math.round(x + (flipX ? -s.ox : s.ox)), Math.round(y + s.oy));
    if (alpha !== undefined) g.globalAlpha = 1;
  };
  /* Draw centred on a body's feet. */
  GG.drawOn = (g, name, frame, b, camX, camY, flipX) => {
    const s = SPR[name] && SPR[name][frame];
    if (!s) return;
    const x = b.x + b.w / 2 - s.w / 2 - camX;
    const y = b.y + b.h - s.h - camY;
    GG.drawSprite(g, name, frame, x, y, flipX);
  };
  GG.rect = (g, x, y, w, h, col) => { g.fillStyle = color(col); g.fillRect(x, y, w, h); };

  /* A double-line NES-style text window. */
  GG.box = (g, x, y, w, h, fill = 0x0f, line = 0x30) => {
    GG.rect(g, x, y, w, h, fill);
    g.fillStyle = color(line);
    g.fillRect(x + 2, y + 2, w - 4, 1); g.fillRect(x + 2, y + h - 3, w - 4, 1);
    g.fillRect(x + 2, y + 2, 1, h - 4); g.fillRect(x + w - 3, y + 2, 1, h - 4);
    g.fillRect(x + 4, y + 4, w - 8, 1); g.fillRect(x + 4, y + h - 5, w - 8, 1);
    g.fillRect(x + 4, y + 4, 1, h - 8); g.fillRect(x + w - 5, y + 4, 1, h - 8);
    GG.rect(g, x + 2, y + 2, 1, 1, fill); GG.rect(g, x + w - 3, y + 2, 1, 1, fill);
    GG.rect(g, x + 2, y + h - 3, 1, 1, fill); GG.rect(g, x + w - 3, y + h - 3, 1, 1, fill);
  };

  /*
   * The Deco window: a gold rule, a gap, a thinner amber rule, and stepped
   * corners like a cinema marquee. Used for text boxes, menus and cards.
   */
  GG.deco = (g, x, y, w, h, fill = 0x0f, line = 0x28, line2 = 0x18) => {
    GG.rect(g, x, y, w, h, fill);
    const R = (rx, ry, rw, rh, c) => GG.rect(g, rx, ry, rw, rh, c);
    // Outer rule, its corners cut in two steps.
    R(x + 4, y + 1, w - 8, 1, line); R(x + 4, y + h - 2, w - 8, 1, line);
    R(x + 1, y + 4, 1, h - 8, line); R(x + w - 2, y + 4, 1, h - 8, line);
    for (const [cx, cy, sx, sy] of [[x, y, 1, 1], [x + w - 1, y, -1, 1], [x, y + h - 1, 1, -1], [x + w - 1, y + h - 1, -1, -1]]) {
      R(Math.min(cx + sx * 2, cx + sx * 4), cy + sy * 2, 3, 1, line);
      R(cx + sx * 2, Math.min(cy + sy * 2, cy + sy * 4), 1, 3, line);
      // A little gold stud in each corner.
      R(cx + sx * 4 - (sx < 0 ? 1 : 0), cy + sy * 4 - (sy < 0 ? 1 : 0), 2, 2, line);
    }
    // Inner rule.
    R(x + 7, y + 4, w - 14, 1, line2); R(x + 7, y + h - 5, w - 14, 1, line2);
    R(x + 4, y + 7, 1, h - 14, line2); R(x + w - 5, y + 7, 1, h - 14, line2);
    // Fan at the middle of the top and bottom rules.
    const mx = Math.round(x + w / 2);
    R(mx - 3, y, 7, 1, fill); R(mx - 2, y, 5, 1, line); R(mx - 1, y - 1, 3, 1, line); R(mx, y - 2, 1, 1, line);
    R(mx - 2, y + h - 1, 5, 1, line); R(mx - 1, y + h, 3, 1, line); R(mx, y + h + 1, 1, 1, line);
  };

  /* Ordered 4x4 Bayer dither, for the skies and the fades. */
  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  GG.bayer = (x, y) => BAYER[(y & 3) * 4 + (x & 3)] / 16;
  GG.color = color;
})();
