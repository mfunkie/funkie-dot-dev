'use strict';
/*
 * GATSBY.EXE art: the big things, drawn by small programs that write the
 * same character grids as everything else. The billboard of Doctor T. J.
 * Eckleburg (its irises and lids are separate so they can look and blink),
 * the train and its crossing signals, the grey ash car, the juice machine
 * and the electric fans at the Plaza.
 */
(() => {
  /* A blank grid and a way to set cells in it. */
  function grid(w, h, fill = '.') {
    const rows = Array.from({ length: h }, () => new Array(w).fill(fill));
    const set = (x, y, c) => { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < w && y < h) rows[y][x] = c; };
    const get = (x, y) => (x >= 0 && y >= 0 && x < w && y < h ? rows[y][x] : '.');
    const out = () => rows.map((r) => r.join(''));
    return { set, get, out, w, h };
  }
  const bayer = (x, y) => GG.bayer(x, y);

  /* --------------------------------------------------------- billboard */
  const BW = 208, BH = 88;
  const EYES = GG.ECKLEBURG ? GG.ECKLEBURG.eyes : [[56, 46], [152, 46]];
  function board() {
    const G = grid(BW, BH);
    // The panel: sky-blue paint, faded and peeling.
    const r = GG.rng(1925);
    for (let y = 0; y < BH; y++) for (let x = 0; x < BW; x++) {
      let c = bayer(x, y) < 0.3 + y / BH * 0.25 ? 'P' : 'p';
      G.set(x, y, c);
    }
    for (let i = 0; i < 26; i++) {
      // Paintless patches, like water stains.
      const px = Math.floor(r() * BW), py = Math.floor(r() * BH), pw = 3 + Math.floor(r() * 12), ph = 2 + Math.floor(r() * 5);
      for (let y = 0; y < ph; y++) for (let x = 0; x < pw; x++) if (bayer(px + x, py + y) < 0.5 && (x + y) % 3) G.set(px + x, py + y, 'g');
    }
    for (let i = 0; i < 18; i++) {
      // Streaks running down from the top.
      const x = Math.floor(r() * BW), len = 6 + Math.floor(r() * 24);
      for (let y = 4; y < 4 + len; y++) if (bayer(x, y) < 0.7) G.set(x, y, 'g');
    }
    // The spectacles' temples, running off to the edges.
    for (let x = 4; x < BW - 4; x++) {
      const cx = x < BW / 2 ? EYES[0][0] : EYES[1][0];
      if (Math.abs(x - cx) < 30) continue;
      if (x > EYES[0][0] && x < EYES[1][0]) continue;
      const y = 30 + Math.round(Math.abs(x - cx) * 0.04);
      G.set(x, y - 1, 'k'); G.set(x, y, 'Y'); G.set(x, y + 1, 'y'); G.set(x, y + 2, 'k');
    }
    // The bridge over a nonexistent nose: an arch between the rims.
    for (let x = EYES[0][0] + 26; x <= EYES[1][0] - 26; x++) {
      const u = (x - (EYES[0][0] + EYES[1][0]) / 2) / 22;
      const y = 40 - Math.round((1 - u * u) * 5);
      G.set(x, y - 1, 'k'); G.set(x, y, 'Y'); G.set(x, y + 1, 'y'); G.set(x, y + 2, 'y'); G.set(x, y + 3, 'k');
    }
    for (const [ex, ey] of EYES) {
      // The eye-white, an almond.
      for (let y = -16; y <= 16; y++) for (let x = -26; x <= 26; x++) {
        const q = (x * x) / (22 * 22) + (y * y) / (13 * 13);
        if (q <= 1) {
          const shade = y > 6 && bayer(ex + x, ey + y) < (y - 6) / 10;
          G.set(ex + x, ey + y, shade ? 'w' : 'W');
        } else if (q <= 1.18) G.set(ex + x, ey + y, y < 0 ? 'k' : 'd');
      }
      // The rim: enormous yellow spectacles.
      for (let y = -33; y <= 33; y++) for (let x = -33; x <= 33; x++) {
        const d = Math.hypot(x, y);
        if (d > 31.5 || d < 25.5) continue;
        let c = 'y';
        if (d > 30.5 || d < 26.5) c = 'k';
        else if (d < 27.6 && y < 0) c = 'Y';
        else if (x + y > 20) c = 'o';
        G.set(ex + x, ey + y, c);
      }
    }
    // A frame of weathered boards.
    for (let x = 0; x < BW; x++) { G.set(x, 0, 'k'); G.set(x, 1, 'b'); G.set(x, 2, 'B'); G.set(x, BH - 3, 'b'); G.set(x, BH - 2, 'b'); G.set(x, BH - 1, 'k'); }
    for (let y = 0; y < BH; y++) { G.set(0, y, 'k'); G.set(1, y, 'b'); G.set(2, y, 'B'); G.set(BW - 3, y, 'b'); G.set(BW - 2, y, 'b'); G.set(BW - 1, y, 'k'); }
    return G.out();
  }

  /* An iris, "blue and gigantic", with its pupil. */
  function iris(blue, deep, light) {
    const G = grid(24, 24);
    for (let y = 0; y < 24; y++) for (let x = 0; x < 24; x++) {
      const dx = x - 11.5, dy = y - 11.5, d = Math.hypot(dx, dy);
      if (d > 11.5) continue;
      let c = d > 10.4 ? 'k' : d > 8.6 ? deep : blue;
      // Streaks radiating from the pupil.
      const a = Math.atan2(dy, dx);
      if (d > 5.5 && d < 9.5 && Math.sin(a * 9) > 0.6) c = light;
      if (d < 5) c = 'k';
      G.set(x, y, c);
    }
    G.set(8, 7, 'W'); G.set(9, 7, 'W'); G.set(8, 8, 'W'); G.set(14, 14, 'w');
    return G.out();
  }

  /* A lid drawn down over the almond: 0.45 squint, 0.7, 1 shut. */
  function lid(amount) {
    const G = grid(53, 31);
    const cx = 26, cy = 15;
    for (let y = -15; y <= 15; y++) for (let x = -26; x <= 26; x++) {
      const q = (x * x) / (22.5 * 22.5) + (y * y) / (13.5 * 13.5);
      if (q > 1.05) continue;
      const half = Math.sqrt(Math.max(0, 1 - (x * x) / (22.5 * 22.5))) * 13.5;
      const edge = -half + amount * 2 * half;
      if (y > edge) continue;
      let c = bayer(cx + x, cy + y) < 0.25 ? 'S' : 's';
      if (y > edge - 2) c = 'k';
      else if (y > edge - 4) c = 'S';
      G.set(cx + x, cy + y, c);
    }
    return G.out();
  }

  /* --------------------------------------------------------- the train */
  function loco() {
    const G = grid(64, 40);
    const R = (x, y, w, h, c) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) G.set(x + i, y + j, c); };
    // Boiler (facing left: it comes from the right).
    R(4, 14, 40, 16, 'g'); R(4, 14, 40, 2, 'G'); R(4, 28, 40, 2, 'd');
    for (let x = 8; x < 44; x += 9) R(x, 14, 1, 16, 'd');
    R(2, 16, 2, 12, 'k'); R(0, 18, 2, 8, 'd');                        // smokebox door
    R(8, 4, 6, 10, 'd'); R(7, 3, 8, 2, 'k'); R(9, 6, 4, 8, 'g');      // stack
    R(22, 9, 6, 5, 'G'); R(21, 8, 8, 1, 'k');                         // dome
    R(44, 6, 18, 24, 'd'); R(44, 6, 18, 2, 'k'); R(47, 10, 10, 8, 'y'); R(48, 11, 8, 6, 'Y'); // cab, lit window
    R(0, 30, 64, 2, 'k'); R(0, 26, 6, 4, 'r');                        // frame, cowcatcher
    for (const wx of [10, 24, 38, 52]) {
      for (let y = -5; y <= 5; y++) for (let x = -5; x <= 5; x++) { const d = Math.hypot(x, y); if (d <= 5.5) G.set(wx + x, 34 + y, d > 4.4 ? 'k' : d < 1.5 ? 'G' : 'd'); }
      R(wx - 4, 34, 9, 1, 'G');
    }
    R(4, 22, 40, 1, 'G'); // a rod
    for (let x = 0; x < 64; x++) G.set(x, 39, 'k');
    return G.out();
  }
  function coach() {
    const G = grid(64, 40);
    const R = (x, y, w, h, c) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) G.set(x + i, y + j, c); };
    R(2, 4, 60, 2, 'k'); R(1, 6, 62, 3, 'G'); R(2, 9, 60, 20, 'c'); R(2, 26, 60, 3, 'C');
    for (let x = 6; x < 58; x += 10) { R(x, 12, 7, 8, 'k'); R(x + 1, 13, 5, 6, (x / 10) % 2 ? 'y' : 'Y'); }
    R(0, 29, 64, 2, 'k');
    for (const wx of [12, 22, 42, 52]) {
      for (let y = -4; y <= 4; y++) for (let x = -4; x <= 4; x++) { const d = Math.hypot(x, y); if (d <= 4.5) G.set(wx + x, 35 + y, d > 3.4 ? 'k' : 'd'); }
    }
    for (let x = 0; x < 64; x++) G.set(x, 39, 'k');
    return G.out();
  }

  /* ------------------------------------------------------- small machines */
  const SIGNAL = [
    '..kk........kk..',
    '..kWk......kWk..',
    '...kWk....kWk...',
    '....kWk..kWk....',
    '.....kWkkWk.....',
    '......kWWk......',
    '.....kWkkWk.....',
    '....kWk..kWk....',
    '...kWk....kWk...',
    '..kWk......kWk..',
    '..kk...kk...kk..',
    '......kddk......',
    '....kkkddkkk....',
    '...kLLkddkLLk...',
    '...kLLkddkLLk...',
    '....kkkddkkk....',
    '.......dd.......',
    '.......dd.......',
    '.......dd.......',
    '.......dd.......',
    '.......dd.......',
    '.......dd.......',
    '.......dd.......',
    '.......dd.......',
    '.......dd.......',
    '.......dd.......',
    '.......dd.......',
    '.......dd.......',
    '.......dd.......',
    '.......dd.......',
    '.....kddddk.....',
    '....kkkkkkkk....',
  ];
  const ASHCAR = [
    '......kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk......',
    '....kkAAaAAAaAAAAaAAAaAAAAaAAAaAAAAaAAAaAAkk....',
    '...kaAAAAaAAAAAaAAAAAAaAAAAAaAAAAAAaAAAAAAAak...',
    '..kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk..',
    '..kGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGk..',
    '..kgggkggggggggggkggggggggggkggggggggggkgggggk..',
    '..kgggkggggggggggkggggggggggkggggggggggkgggggk..',
    '..kgggkggggggggggkggggggggggkggggggggggkgggggk..',
    '..kdddkddddddddddkddddddddddkddddddddddkdddddk..',
    '..kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk..',
    'kkkk.kkkkk....................kkkkk......kkkkkkk',
    '....kdGdGdk..................kdGdGdk............',
    '....kGdkdGk..................kGdkdGk............',
    '....kdGdGdk..................kdGdGdk............',
    '.....kkkkk....................kkkkk.............',
    '................................................',
  ];
  const JUICER = [
    '..kkkkkkkkkkkk..',
    '..kNNNNNNNNNNk..',
    '..kNkkkkkkkkNk..',
    '..kNkooOoooKNk..',
    '..kNkoOooOoKNk..',
    '..kNkkkkkkkkNk..',
    '..kNNNNNNNNNNk..',
    '..kNnnnnnnnnNk..',
    '..kNnkkknnnnNk..',
    '..kNnkRRknnnNk..',
    '..kNnkkknnnkkkk.',
    '..kNnnnnnnnkook.',
    '..kNNNNNNNNkkkk.',
    '..kkkkkkkkkkk...',
    '.kNNk.....kNNk..',
    '.kkkk.....kkkk..',
  ];
  const JUICER2 = JUICER.map((r, i) => (i === 9 ? '..kNnkkknnnnNk..' : i === 11 ? '..kNnnnnnnnkookoo' : r)).map((r) => r.slice(0, 16));
  const FAN = [
    '.....kkkkkk.....',
    '...kkBbkkbBkk...',
    '..kBk.kbbk.kBk..',
    '.kBk.kWWWWk.kBk.',
    '.kbkkWkWWkWkkbk.',
    'kBk.kWWkkWWk.kBk',
    'kbkkWWkYYkWWkkbk',
    'kBk.kWWkkWWk.kBk',
    '.kbkkWkWWkWkkbk.',
    '.kBk.kWWWWk.kBk.',
    '..kBk.kbbk.kBk..',
    '...kkBbkkbBkk...',
    '.....kkBBkk.....',
    '......kbbk......',
    '....kkbBBbkk....',
    '...kkkkkkkkkk...',
  ];
  // The second frame turns the blades an eighth.
  const FAN2 = [...FAN];
  FAN2[3] = '.kBk.kWkkWk.kBk.';
  FAN2[4] = '.kbkkWWkkWWkkbk.';
  FAN2[5] = 'kBk.kkWWWWkk.kBk';
  FAN2[6] = 'kbkkWWWYYWWWkkbk';
  FAN2[7] = 'kBk.kkWWWWkk.kBk';
  FAN2[8] = '.kbkkWWkkWWkkbk.';
  FAN2[9] = '.kBk.kWkkWk.kBk.';

  GG.sprite('big', {
    k: 0x0f,
    // billboard
    p: 0x21, P: 0x31, g: 0x10, b: 0x08, B: 0x18, y: 0x28, Y: 0x38, o: 0x18, W: 0x30, w: 0x10, d: 0x2d,
  }, { board: board() });
  const add = (legend, frames) => { const s = GG.sprite('_big', legend, frames); Object.assign(GG.SPR.big, s); delete GG.SPR._big; };
  add({ k: 0x0f, b: 0x12, B: 0x02, l: 0x21, W: 0x30, w: 0x31 }, { iris: iris('b', 'B', 'l') });
  add({ k: 0x0f, b: 0x16, B: 0x06, l: 0x26, W: 0x30, w: 0x36 }, { irisHit: iris('b', 'B', 'l') });
  add({ k: 0x0f, s: 0x36, S: 0x27 }, { lid1: lid(0.45), lid2: lid(0.7), lid3: lid(1.02) });
  add({ k: 0x0f, g: 0x00, G: 0x10, d: 0x0f, r: 0x06, y: 0x28, Y: 0x38, c: 0x0c, C: 0x00 }, { loco: loco(), coach: coach() });
  add({ k: 0x0f, W: 0x30, d: 0x08, L: 0x00 }, { signal: SIGNAL });
  add({ k: 0x0f, W: 0x30, d: 0x08, L: 0x16 }, { signalOn: SIGNAL });
  add({ k: 0x0f, A: 0x10, a: 0x2d, G: 0x10, g: 0x00, d: 0x0f }, { ashcar: ASHCAR });
  add({ k: 0x0f, N: 0x10, n: 0x2d, o: 0x27, O: 0x37, K: 0x28, R: 0x16 }, { juicer: JUICER, juicer2: JUICER2 });
  add({ k: 0x0f, B: 0x28, b: 0x18, W: 0x30, Y: 0x38 }, { fan1: FAN, fan2: FAN2 });
})();
