'use strict';
/*
 * JEKYLL.EXE: drawing a room onto the Spectrum screen (screen.js): tiles and
 * their attributes, the lantern beams, the fog, who is watching, people and
 * the player, and the panel of four text lines under the picture. No DOM.
 */
(() => {
  const A = JH.attr;
  const I = JH.INK;
  const TS = 16;
  const PANEL_Y = 160;

  const FALLBACK = (() => {
    const b = new Uint8Array(256);
    for (let i = 0; i < 256; i++) b[i] = (i % 16 + (i >> 4)) % 4 === 0 ? 1 : 0;
    return { bits: b, a: A(I.magenta, 0, 1) };
  })();

  function tileAttr(art, night) {
    const a = night && art.night != null ? art.night : art.a;
    return a;
  }

  function paintTile(scr, tx, ty, a) {
    const cx = tx * 2, cy = ty * 2;
    if (typeof a === 'number') { scr.paint(cx, cy, 2, 2, a); return; }
    scr.paint(cx, cy, 1, 1, a[0][0]);
    scr.paint(cx + 1, cy, 1, 1, a[0][1]);
    scr.paint(cx, cy + 1, 1, 1, a[1][0]);
    scr.paint(cx + 1, cy + 1, 1, 1, a[1][1]);
  }
  JH.paintTile = paintTile;

  const ITEM_ICONS = {
    dose: ['................', '................', '......####......', '.......##.......', '.......##.......', '......#..#......', '.....#....#.....', '....#.####.#....', '....#.####.#....', '....#.####.#....', '.....######.....', '................', '................', '................', '................', '................'],
    key: ['................', '................', '................', '................', '....###.........', '...#...#........', '...#...########.', '...#...#...#.#..', '....###.........', '................', '................', '................', '................', '................', '................', '................'],
    papers: ['................', '................', '...########.....', '...#......##....', '...#.####..#....', '...#.......#....', '...#.#####.#....', '...#.......#....', '...#.####..#....', '...#.......#....', '...#########....', '................', '................', '................', '................', '................'],
  };
  const ICON_BITS = {};
  for (const [k, rows] of Object.entries(ITEM_ICONS)) {
    const b = new Uint8Array(256);
    rows.forEach((r, y) => { for (let x = 0; x < 16; x++) b[y * 16 + x] = r[x] === '#' ? 1 : 0; });
    ICON_BITS[k] = b;
  }

  /* The colour a person is drawn in: who they are to you. */
  function personInk(pd) {
    if (pd.kind === 'const') return [I.blue, 1];
    if (pd.kind === 'seek') return [pd.look === 'utterson' ? I.magenta : I.yellow, 1];
    if (pd.hostile) return [I.red, 1];
    if (pd.asleep) return [I.blue, 0];
    const s = JH.SPRITES[pd.look];
    return s ? [s.ink, s.bright] : [I.cyan, 1];
  }
  JH.personInk = personInk;

  function drawSprite(scr, name, frame, px, py, ink, bright, flip) {
    const s = JH.SPRITES[name] || JH.SPRITES.gent;
    const f = frame % s.frames.length;
    scr.blit(s.frames[f], 16, 16, px, py, 'mask', s.masks[f], flip);
    // Colour clash, honestly: every cell the figure touches takes its ink.
    const c0 = Math.floor(px / 8), c1 = Math.floor((px + 15) / 8);
    const r0 = Math.floor(py / 8), r1 = Math.floor((py + 15) / 8);
    for (let cy = r0; cy <= r1; cy++) for (let cx = c0; cx <= c1; cx++) {
      if (cy >= 20) continue;
      scr.ink(cx, cy, ink, bright);
    }
  }
  JH.drawSprite = drawSprite;

  function mark(scr, which, px, py, ink) {
    const b = JH.MARKS[which];
    if (!b || py < 0) return;
    scr.blit(b, 8, 8, px, py, 'set');
    scr.ink(Math.floor(px / 8), Math.floor(py / 8), ink, 1);
  }

  /*
   * view: {
   *   night, look (show who's watching), phase (flash on/off),
   *   offs: Map who -> [dx, dy] pixel offsets while a move animates
   *   frames: Map who -> walk frame, hide: Set of who to skip,
   *   playerSprite: override ('jekyll' | 'hyde' | null), playerInk
   * }
   */
  JH.drawRoom = function (scr, cr, st, view = {}) {
    const night = !!view.night;
    const W = JH.W, H = JH.H;
    scr.clear(0, 0, 256, PANEL_Y, 0);
    for (let ty = 0; ty < H; ty++) {
      for (let tx = 0; tx < W; tx++) {
        const cell = cr.cells[ty * W + tx];
        const art = JH.TILE_ART[cell.art] || FALLBACK;
        scr.blit(art.bits, 16, 16, tx * TS, ty * TS, 'set');
        paintTile(scr, tx, ty, tileAttr(art, night));
        if (cell.decor) {
          scr.clear(tx * TS + 4, ty * TS + 4, 8, 8, 0);
          JH.text(scr, cell.decor, tx * TS + 4, ty * TS + 4);
        }
      }
    }

    // The ways out you can take now blink, so the goal is never a mystery.
    if (!st.out) {
      for (const e of Object.values(cr.exits)) {
        if (!e.rule || e.rule.shut || e.rule.leave) continue;
        if (!JH.meets(cr, st, e.rule.need)) continue;
        for (const [x, y] of e.cells) for (let k = 0; k < 4; k++) scr.flash(x * 2 + (k & 1), y * 2 + (k >> 1), true);
      }
    }

    // Lantern beams: the floor they light goes yellow.
    const watched = JH.watched(cr, st);
    for (const key of watched.beams) {
      const [x, y] = key.split(',').map(Number);
      for (let k = 0; k < 4; k++) scr.paper(x * 2 + (k & 1), y * 2 + (k >> 1), I.yellow, 0);
    }
    // Squares you mustn't step on now (it would end the night): red.
    if (view.danger) {
      for (const key of view.danger) {
        const [x, y] = key.split(',').map(Number);
        for (let k = 0; k < 4; k++) scr.paper(x * 2 + (k & 1), y * 2 + (k >> 1), I.red, 0);
      }
    }
    // LOOK: every square someone can see goes blue underfoot.
    if (view.look) {
      for (const key of watched.watch.keys()) {
        const [x, y] = key.split(',').map(Number);
        if (watched.beams.has(key)) continue;
        for (let k = 0; k < 4; k++) scr.paper(x * 2 + (k & 1), y * 2 + (k >> 1), I.blue, 0);
      }
    }

    // Things on the floor.
    cr.items.forEach((it) => {
      if (st.took & (1 << it.i)) return;
      const icon = ICON_BITS[it.icon || (it.doses ? 'dose' : it.item === 'key' ? 'key' : 'papers')];
      scr.blit(icon, 16, 16, it.x * TS, it.y * TS, 'or');
      paintTile(scr, it.x, it.y, A(I.yellow, 0, 1));
    });

    // People, back to front so the lower one is drawn last.
    const offs = view.offs || new Map();
    const order = st.ppl.map((p, i) => i).filter((i) => st.ppl[i].on && !st.ppl[i].gone && !(view.hide && view.hide.has(i)));
    order.sort((a, b) => st.ppl[a].y - st.ppl[b].y || a - b);
    const playerSeen = [];
    for (const i of order) {
      const p = st.ppl[i], pd = cr.people[i];
      const [ox, oy] = offs.get(i) || [0, 0];
      const px = p.x * TS + ox, py = p.y * TS + oy;
      const [ink, bright] = personInk(pd);
      drawSprite(scr, pd.look, (view.frames && view.frames.get(i)) || 0, px, py, ink, bright, p.d === 'w');
      if (pd.asleep) { mark(scr, 'zz', px + 8, py - 6, I.white); continue; }
      const sees = JH.personSees(cr, st, i);
      if (sees) playerSeen.push(i);
      if (sees && st.f === 'H' && !view.quiet) {
        if (pd.kind === 'seek') mark(scr, 'eye', px + 4, py - 8, I.magenta);
        else if (pd.kind !== 'const') {
          mark(scr, 'bang', px + 4, py - 8, I.yellow);
          // Nowhere to back away to: they flash. Don't step next to them.
          const dx = Math.sign(st.x - p.x), dy = Math.sign(st.y - p.y);
          const bx = p.x - dx, by = p.y - dy;
          const free = bx >= 0 && by >= 0 && bx < W && by < H && (cr.walk[by * W + bx] & 4) && JH.occupant(cr, st, bx, by) === null;
          if (!free && !pd.steadfast) for (let k = 0; k < 4; k++) scr.flash(Math.floor(px / 8) + (k & 1), Math.floor(py / 8) + (k >> 1), true);
        }
      }
    }

    // You.
    if (!view.hidePlayer) {
      const [ox, oy] = offs.get(-1) || [0, 0];
      const px = st.x * TS + ox, py = st.y * TS + oy;
      const name = view.playerSprite || (st.f === 'H' ? 'hyde' : 'jekyll');
      const ink = view.playerInk != null ? view.playerInk : name === 'hyde' ? I.green : I.white;
      drawSprite(scr, name, (view.frames && view.frames.get(-1)) || 0, px, py, ink, 1, st.d === 'w');
      if (view.playerFlash) for (let k = 0; k < 9; k++) scr.flash(Math.floor(px / 8) + (k % 3), Math.floor(py / 8) + Math.floor(k / 3), true);
    }

    // Fog over everything: a drifting veil.
    if (cr.fog) {
      for (let ty = 0; ty < H; ty++) for (let tx = 0; tx < W; tx++) {
        if (!cr.walk[ty * W + tx] && !cr.cells[ty * W + tx].exit) continue;
        if (!JH.fogAt(cr, st.t, tx, ty)) continue;
        scr.pattern(tx * TS, ty * TS, TS, TS, JH.PAT.d25, 8, 8, 'or');
        for (let k = 0; k < 4; k++) {
          const cx = tx * 2 + (k & 1), cy = ty * 2 + (k >> 1);
          const isPerson = st.x === tx && st.y === ty || st.ppl.some((p) => p.on && !p.gone && p.x === tx && p.y === ty);
          if (!isPerson) scr.ink(cx, cy, I.white, 0);
        }
      }
    }
    return { seen: playerSeen };
  };

  /*
   * The panel: four lines of text under the picture. lines: array of
   * { text, ink, bright, hand } (or strings).
   */
  JH.drawPanel = function (scr, lines, opts = {}) {
    scr.clear(0, PANEL_Y, 256, 32, 0);
    scr.paint(0, 20, 32, 4, A(I.white, 0));
    lines.slice(0, 4).forEach((l, k) => {
      const o = typeof l === 'string' ? { text: l } : l;
      const y = PANEL_Y + k * 8;
      JH.text(scr, o.text, o.x || 0, y, { hand: o.hand });
      const ink = o.ink != null ? o.ink : I.white;
      for (let c = 0; c < 32; c++) scr.ink(c, 20 + k, ink, o.bright ? 1 : 0);
      if (o.flash) for (let c = 0; c < 32; c++) scr.flash(c, 20 + k, true);
      if (o.spans) for (const [c0, c1, ink2, br] of o.spans) for (let c = c0; c < c1; c++) scr.ink(c, 20 + k, ink2, br);
    });
  };
  JH.PANEL_Y = PANEL_Y;
})();
