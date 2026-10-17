'use strict';
/*
 * GATSBY.EXE: sprite flicker. The NES draws at most eight 8x8 sprites on a
 * scanline; past that, the later ones in sprite memory (OAM) just aren't
 * drawn. Games rotate the order every frame, so whatever drops out takes
 * turns, and a crowd flickers instead of vanishing.
 *
 * game.js brackets the sprite part of a frame with GG.oam.begin()/end().
 * In between, sprite and entity-pixel draws are queued; end() gives each
 * 8px row of each sprite its scanlines in a rotating order (the HUD's hearts
 * first, as games kept their status sprites at the top of OAM), then draws
 * the queue in its original order with the rows that didn't fit left out.
 * GG.oam.last holds the frame's numbers for scripts/gatsby/nes-check.ts.
 */
(() => {
  const SH = GG.H, SW = GG.W, LIMIT = 8;
  const want = new Int16Array(SH), got = new Int16Array(SH);
  let queue = null, frame = 0, saved = null, entity = 0;

  const O = (GG.oam = {
    on: true,
    last: { want: new Int16Array(SH), got: new Int16Array(SH), total: 0, dropped: 0, drawn: [] },
  });

  /* Start a frame's sprite counts (the HUD's sprites are reserved up front). */
  O.frame = (W) => {
    want.fill(0); got.fill(0);
    O.last.total = 0; O.last.dropped = 0; O.last.drawn = [];
    frame++;
    if (W) {
      // Hearts across the top, and the objective's icon: drawn last, but first in OAM.
      const hud = W.maxHearts + (W.itemsNeeded > 0 ? 2 : 0);
      for (let y = 7; y < 15; y++) { want[y] += hud; got[y] += hud; }
      O.last.total += hud;
    }
  };

  O.begin = (W) => {
    if (W) O.frame(W);
    O.inPhase = true;
    if (!O.on || queue) return;
    queue = [];
    saved = { drawSprite: GG.drawSprite, rect: GG.rect, draw: GG.draw };
    GG.drawSprite = (g, name, fr, x, y, flipX, alpha) => { queue.push({ k: 's', a: [g, name, fr, x, y, flipX, alpha] }); };
    GG.rect = (g, x, y, w, h, col) => { queue.push({ k: 'r', a: [g, x, y, w, h, col], ent: entity }); };
    GG.draw = (...a) => { const was = entity; entity = ++O.seq; try { return saved.draw(...a); } finally { entity = was; } };
  };
  O.seq = 0;

  /* Hardware sprites a queued draw needs: rows of [top scanline, columns]. */
  function rowsOf(q) {
    if (q.k === 's') {
      const [, name, fr, x, y, flipX] = q.a;
      const s = GG.SPR[name] && GG.SPR[name][fr];
      if (!s || (GG.nes && GG.nes.isBgObj(name, fr))) return null;
      const dx = Math.round(x + (flipX ? -s.ox : s.ox)), dy = Math.round(y + s.oy);
      if (dx + s.w <= 0 || dx >= SW || dy + s.h <= 0 || dy >= SH) return null;
      q.s = s; q.dx = dx; q.dy = dy;
      const cols = Math.ceil(s.w / 8), rows = [];
      for (let ry = 0; ry < s.h; ry += 8) rows.push([dy + ry, cols]);
      return rows;
    }
    return null;
  }

  O.end = () => {
    O.inPhase = false;
    if (!queue) return;
    const Q = queue;
    queue = null;
    GG.drawSprite = saved.drawSprite; GG.rect = saved.rect; GG.draw = saved.draw;

    // Entity pixels: one sprite per 8x8 screen cell an entity draws into.
    const cells = new Map();
    Q.forEach((q, i) => {
      if (q.k === 's') { q.rows = rowsOf(q); return; }
      const [, x, y, w, h] = q.a;
      if (x + w <= 0 || x >= SW || y + h <= 0 || y >= SH) return;
      if (!q.ent && (w > 4 || h > 4)) return;        // not a particle: leave it alone
      for (let cy = Math.floor(y / 8); cy <= Math.floor((y + h - 1) / 8); cy++) for (let cx = Math.floor(x / 8); cx <= Math.floor((x + w - 1) / 8); cx++) {
        const key = (q.ent || 'p' + i) + ':' + cx + ',' + cy;
        if (!cells.has(key)) cells.set(key, { y: cy * 8, owners: [] });
        cells.get(key).owners.push(i);
      }
    });
    // The units that compete for scanlines, in OAM order rotated by the frame.
    const units = [];
    Q.forEach((q, i) => { if (q.rows) q.rows.forEach((r, j) => units.push({ q: i, row: j, y: r[0], n: r[1] })); });
    for (const c of cells.values()) units.push({ cell: c, y: c.y, n: 1 });
    const n = units.length;
    const off = n ? (frame * 5) % n : 0;
    let drawn = O.last.total - O.last.dropped;
    for (let k = 0; k < n; k++) {
      const u = units[(k + off) % n];
      let fits = drawn + u.n <= 64;     // and 64 in all
      for (let y = Math.max(0, u.y); y < Math.min(SH, u.y + 8); y++) { want[y] += u.n; if (got[y] + u.n > LIMIT) fits = false; }
      O.last.total += u.n;
      if (fits) { for (let y = Math.max(0, u.y); y < Math.min(SH, u.y + 8); y++) got[y] += u.n; u.ok = true; drawn += u.n; }
      else O.last.dropped += u.n;
    }
    // Which rows of which draws, and which rects, made it.
    const rowOk = new Map(), rectOk = new Set();
    for (const u of units) {
      if (u.cell) { if (u.ok) for (const i of u.cell.owners) rectOk.add(i); else for (const i of u.cell.owners) rectOk.add(-1 - i); }
      else { if (!rowOk.has(u.q)) rowOk.set(u.q, []); rowOk.get(u.q)[u.row] = !!u.ok; }
    }
    // Draw in the original order.
    Q.forEach((q, i) => {
      if (q.k === 'r') {
        // A rect in a cell that lost keeps out of that frame.
        if (rectOk.has(-1 - i)) return;
        saved.rect(...q.a);
        return;
      }
      const ok = rowOk.get(i);
      if (!ok || ok.every(Boolean)) { saved.drawSprite(...q.a); if (q.rows) O.last.drawn.push([q.dx, q.dy, q.s.w, q.s.h]); return; }
      const [g, , , , , flipX, alpha] = q.a;
      const s = q.s, img = flipX ? s.f : s.c;
      if (alpha !== undefined) g.globalAlpha = alpha;
      ok.forEach((keep, j) => {
        if (!keep) return;
        const sy = j * 8, h = Math.min(8, s.h - sy);
        g.drawImage(img, 0, sy, s.w, h, q.dx, q.dy + sy, s.w, h);
        O.last.drawn.push([q.dx, q.dy + sy, s.w, h]);
      });
      if (alpha !== undefined) g.globalAlpha = 1;
    });
    O.last.want.set(want); O.last.got.set(got);
  };
})();
