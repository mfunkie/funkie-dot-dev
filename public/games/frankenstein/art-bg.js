'use strict';
/*
 * FRANKEN.EXE art: parallax backgrounds. Each is built once, at boot, from
 * seeded generators that only ever paint whole NES-palette pixels: dithered
 * sky bands, skylines, ridges, forests, clouds. FK.BG[name].draw paints it.
 */
(() => {
  const { W: SW, H: SH } = FK;
  const BG = (FK.BG = {});
  const C = FK.color;

  const canvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  function px(g, x, y, col, w = 1, h = 1) { g.fillStyle = C(col); g.fillRect(x, y, w, h); }

  /*
   * Bands of color from top to bottom, with a 4-row ordered dither between
   * each pair: the classic way to fake a gradient with a fixed palette.
   */
  function sky(w, h, stops) {
    const c = canvas(w, h), g = c.getContext('2d');
    for (let i = 0; i < stops.length; i++) {
      const [col, y0] = stops[i];
      const y1 = i + 1 < stops.length ? stops[i + 1][1] : h;
      px(g, 0, y0, col, w, y1 - y0);
      if (i + 1 < stops.length) {
        // The seam is a band of ordered dither, wide or narrow per stop.
        const next = stops[i + 1][0], band = stops[i + 1][2] || 6;
        for (let d = 0; d < band; d++) {
          const y = y1 - band + d;
          if (y < 0) continue;
          for (let x = 0; x < w; x++) if (FK.bayer(x, y) < (d + 1) / (band + 1)) px(g, x, y, next);
        }
      }
    }
    return c;
  }

  function stars(g, w, h, seed, n, cols) {
    const r = FK.rng(seed);
    for (let i = 0; i < n; i++) {
      const x = Math.floor(r() * w), y = Math.floor(r() * h);
      const col = cols[Math.floor(r() * cols.length)];
      px(g, x, y, col);
      if (r() < 0.08) { px(g, x - 1, y, col); px(g, x + 1, y, col); px(g, x, y - 1, col); px(g, x, y + 1, col); }
    }
  }

  function disc(g, cx, cy, r, col) {
    for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r + r * 0.6) px(g, cx + x, cy + y, col);
  }
  /* A moon with a dithered shadow side and a few craters. */
  function moon(g, cx, cy, r, phase = 0) {
    disc(g, cx, cy, r + 1, 0x0f);
    disc(g, cx, cy, r, 0x30);
    for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) {
      if (x * x + y * y > r * r) continue;
      const shade = (x + r * 0.35) / r;
      if (shade > 0.55 && FK.bayer(cx + x, cy + y) < (shade - 0.55) * 2.4) px(g, cx + x, cy + y, 0x10);
      if (phase && x > r * (1 - phase * 2) && FK.bayer(cx + x, cy + y) < 0.9) px(g, cx + x, cy + y, 0x2d);
    }
    const cr = [[-0.3, -0.25, 0.22], [0.25, 0.2, 0.16], [-0.1, 0.42, 0.12], [0.35, -0.3, 0.1]];
    for (const [ox, oy, rr] of cr) {
      const R = Math.max(1, Math.round(r * rr));
      for (let y = -R; y <= R; y++) for (let x = -R; x <= R; x++) if (x * x + y * y <= R * R) px(g, Math.round(cx + ox * r) + x, Math.round(cy + oy * r) + y, 0x10);
    }
  }
  FK.moon = moon;

  /* A ridge line by midpoint displacement, seamless across the width. */
  function ridge(w, seed, base, amp, rough = 0.55) {
    const r = FK.rng(seed);
    const pts = new Array(w + 1);
    let step = w;
    pts[0] = pts[w] = base;
    let a = amp;
    while (step > 1) {
      const half = step >> 1;
      for (let x = half; x < w; x += step) pts[x] = (pts[x - half] + pts[(x + half) % (w + 1)]) / 2 + (r() - 0.5) * a;
      a *= rough; step = half;
    }
    return pts.slice(0, w).map(Math.round);
  }

  /*
   * Mountains: a range of peaks. Each column belongs to whichever peak's cone
   * is highest there, so faces are crisp: the side toward the light (left)
   * is lit, the far side is in shadow. Snow caps the tops with a ragged hem,
   * and a little jitter keeps the slopes from looking ruled. Wraps at w.
   */
  function mountains(w, h, seed, o) {
    const c = canvas(w, h), g = c.getContext('2d');
    const r = FK.rng(seed);
    const n = o.peaks || Math.max(3, Math.round(w / 70));
    const peaks = [];
    for (let i = 0; i < n; i++) {
      peaks.push({
        x: Math.floor((i + 0.2 + r() * 0.6) * w / n),
        y: Math.round(h - (o.minH ?? h * 0.35) - r() * ((o.maxH ?? h * 0.9) - (o.minH ?? h * 0.35))),
        sl: (o.slope ?? 1) * (0.7 + r() * 0.6),
        sr: (o.slope ?? 1) * (0.7 + r() * 0.6),
      });
    }
    const jitter = ridge(w, seed + 1, 0, o.jitter ?? 6, 0.6);
    const top = new Array(w), owner = new Array(w);
    for (let x = 0; x < w; x++) {
      let best = Infinity, who = 1;
      for (let k = 0; k < peaks.length; k++) {
        const p = peaks[k];
        for (const ox of [-w, 0, w]) {
          const dx = x - (p.x + ox);
          const y = p.y + (dx < 0 ? -dx * p.sl : dx * p.sr);
          if (y < best) { best = y; who = dx < 0 ? -(k + 1) : k + 1; }
        }
      }
      top[x] = Math.round(best + jitter[x]);
      owner[x] = who;
    }
    for (let x = 0; x < w; x++) {
      const y0 = Math.min(h - 1, top[x]);
      const pk = peaks[Math.abs(owner[x]) - 1];
      const dxp = ((x - pk.x) % w + w + w / 2) % w - w / 2;
      for (let y = y0; y < h; y++) {
        // The shadow seam runs down and to the right from the summit.
        const lit = dxp < (y - pk.y) * (o.seam ?? 0.32);
        let col = lit ? o.lit : o.dark;
        // Gullies: thin shadowed streaks running down the lit faces.
        if (lit && o.crag !== undefined) {
          const along = (pk.x - x) - (y - pk.y) / pk.sl;
          if (Math.abs(((along % 19) + 19) % 19 - 9) < 0.6 && y - y0 > 3) col = o.crag;
        }
        const capY = pk.y + (o.snowDepth ?? 12) + ((x * 7 + (x >> 2) * 3) % 5);
        if (o.snow !== undefined && y < capY && y < (o.snowLine ?? h)) col = lit ? o.snow : (o.snowDark ?? o.snow);
        if (o.fadeRows && y > h - o.fadeRows && FK.bayer(x, y) < (y - (h - o.fadeRows)) / o.fadeRows) col = o.fade;
        px(g, x, y, col);
      }
      if (o.edge !== null) px(g, x, y0, o.edge ?? 0x0f);
    }
    return c;
  }

  /* A row of buildings: gables, chimneys, church towers, some lit windows. */
  function skyline(w, h, seed, o) {
    const c = canvas(w, h), g = c.getContext('2d');
    const r = FK.rng(seed);
    let x = 0;
    while (x < w) {
      const bw = 14 + Math.floor(r() * 22);
      const bh = o.minH + Math.floor(r() * (o.maxH - o.minH));
      const top = h - bh;
      const kind = r();
      px(g, x, top, o.col, bw, bh);
      if (kind < 0.55) {
        // Steep gable.
        const peak = Math.floor(bw * 0.6);
        for (let i = 0; i < peak; i++) {
          const yy = top - i;
          const l = x + Math.floor(i * bw / (2 * peak)), rr = x + bw - Math.floor(i * bw / (2 * peak));
          if (rr > l) px(g, l, yy, o.col, rr - l, 1);
        }
      } else if (kind < 0.7 && o.chimneys) {
        px(g, x + 3, top - 5, o.col, 3, 5);
      }
      if (o.windows) {
        for (let wy = top + 4; wy < h - 4; wy += 6) for (let wx = x + 3; wx < x + bw - 3; wx += 5) {
          if (r() < o.windows) px(g, wx, wy, o.lit, 2, 2 + (r() < 0.3 ? 1 : 0));
        }
      }
      x += bw - (r() < 0.4 ? 2 : 0);
    }
    // Church towers with spires, like the Liebfrauenmünster's.
    if (o.towers) for (const tx of o.towers) {
      const tw = 14, th = o.maxH + 26;
      px(g, tx, h - th, o.col, tw, th);
      for (let i = 0; i < 20; i++) px(g, tx + Math.floor(i * 0.35), h - th - i, o.col, tw - Math.floor(i * 0.7), 1);
      px(g, tx + 6, h - th - 26, o.col, 2, 6);
      px(g, tx + 4, h - th - 23, o.col, 6, 1);
      if (o.windows) { px(g, tx + 4, h - th + 10, o.lit, 2, 4); px(g, tx + 8, h - th + 10, o.lit, 2, 4); }
    }
    return c;
  }

  /* Puffy NES clouds: stacked discs, an outline, a lit top. */
  function clouds(w, h, seed, n, o) {
    const c = canvas(w, h), g = c.getContext('2d');
    const r = FK.rng(seed);
    const shapes = [];
    for (let i = 0; i < n; i++) {
      const cx = Math.floor(r() * w), cy = Math.floor(o.y0 + r() * (o.y1 - o.y0));
      const parts = [];
      const len = 3 + Math.floor(r() * 4);
      for (let k = 0; k < len; k++) parts.push([cx + k * 7 - len * 3, cy - Math.floor(r() * 5), 5 + Math.floor(r() * 4)]);
      shapes.push(parts);
    }
    const each = (fn) => { for (const s of shapes) for (const [x, y, rr] of s) for (const ox of [-w, 0, w]) fn(x + ox, y, rr); };
    if (o.outline !== undefined) each((x, y, rr) => disc(g, x, y, rr + 1, o.outline));
    each((x, y, rr) => disc(g, x, y, rr, o.dark));
    each((x, y, rr) => disc(g, x - 1, y - 2, rr - 2, o.lit));
    // Flat bottoms.
    const img = g.getImageData(0, 0, w, h);
    return c;
  }

  /* Conifer forest silhouette. */
  function forest(w, h, seed, o) {
    const c = canvas(w, h), g = c.getContext('2d');
    const r = FK.rng(seed);
    px(g, 0, h - o.floor, o.col, w, o.floor);
    for (let x = -10; x < w + 10; x += o.gap + Math.floor(r() * o.gap)) {
      const th = o.minH + Math.floor(r() * (o.maxH - o.minH));
      const base = h - o.floor + 2;
      for (let i = 0; i < th; i++) {
        const half = Math.floor(((th - i) / th) * o.width * (1 - 0.25 * ((i % 6) / 6)));
        for (const ox of [0, -w, w]) {
          px(g, x - half + ox, base - i, o.col, half * 2 + 1, 1);
          if (o.snow !== undefined && i % 6 === 5) px(g, x - half + ox, base - i, o.snow, half * 2 + 1, 1);
          if (o.lit !== undefined && i % 6 < 2) px(g, x + ox, base - i, o.lit, Math.max(1, half - 1), 1);
        }
      }
      px(g, x, base, o.trunk ?? o.col, 1, 3);
    }
    return c;
  }

  FK.bgKit = { canvas, px, sky, stars, disc, moon, ridge, mountains, skyline, clouds, forest };

  /*
   * A background is a list of layers. Each has a canvas, a parallax factor
   * and a y; wide layers repeat. `still` layers ignore the camera.
   */
  function make(name, layers, extra) {
    BG[name] = {
      layers,
      draw(g, cx, cy, t, W) {
        for (const L of layers) {
          if (L.when && !L.when(t, W)) continue;
          const img = typeof L.img === 'function' ? L.img(t, W) : L.img;
          const f = L.f || 0, fy = L.fy ?? f * 0.5;
          let y = Math.round((L.y || 0) - cy * fy);
          if (L.clampY !== undefined) y = Math.max(L.clampY, y);
          if (L.still) { g.drawImage(img, 0, y); continue; }
          const w = img.width;
          let x = -Math.round(cx * f + (L.drift ? t * L.drift : 0)) % w;
          if (x > 0) x -= w;
          for (; x < SW; x += w) g.drawImage(img, x, y);
          if (L.fill !== undefined && y + img.height < SH) { g.fillStyle = C(L.fill); g.fillRect(0, y + img.height, SW, SH - y - img.height); }
        }
        if (extra) extra(g, cx, cy, t, W);
      },
    };
  }
  FK.makeBG = make;

  /* ------------------------------------------------------- Ingolstadt */
  {
    const s = sky(SW, SH, [[0x0f, 0], [0x02, 18], [0x03, 44], [0x13, 72], [0x23, 98], [0x26, 122], [0x27, 142], [0x37, 160]]);
    const sg = s.getContext('2d');
    stars(sg, SW, 70, 7, 30, [0x30, 0x32, 0x21, 0x10]);
    // A setting sun low behind the town.
    disc(sg, 196, 140, 15, 0x37);
    disc(sg, 196, 140, 12, 0x38);
    for (let y = 132; y < 156; y += 4) px(sg, 178, y, 0x37, 38, 1);
    const cl = clouds(512, 120, 3, 8, { y0: 50, y1: 112, outline: 0x03, dark: 0x13, lit: 0x23 });
    const far = skyline(512, 110, 11, { col: 0x03, minH: 26, maxH: 56, windows: 0, towers: [70, 92, 330] });
    const mid = skyline(512, 120, 23, { col: 0x0c, minH: 34, maxH: 80, windows: 0.18, lit: 0x28, chimneys: true });
    const midg = mid.getContext('2d');
    make('dusk', [
      { img: s, still: true },
      { img: cl, f: 0.08, y: 10, fy: 0.02, drift: 0.04 },
      { img: far, f: 0.18, y: 62, fy: 0.08, fill: 0x03 },
      { img: mid, f: 0.36, y: 96, fy: 0.16, fill: 0x0c },
    ]);
  }

  /* ---------------------------------------------------------- Library */
  {
    // The far wall: dark stone, tall arched windows full of night sky.
    const w = 128, h = SH;
    const c = canvas(w, h), g = c.getContext('2d');
    // Dark ashlar: each block lit only along its top and left edge.
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const bx = (x + (Math.floor(y / 8) % 2) * 8) % 16, by = y % 8;
      let col = 0x0f;
      if (by === 1 && bx > 0) col = 0x0c;
      else if (bx === 1 && by > 0) col = 0x0c;
      else if (by > 1 && bx > 1 && FK.bayer(x, y) < 0.12) col = 0x0c;
      px(g, x, y, col);
    }
    // Arched window.
    const wx = 40, wy = 40, ww = 48, wh = 120;
    for (let y = wy; y < wy + wh; y++) for (let x = wx; x < wx + ww; x++) {
      const dx = x - (wx + ww / 2), dy = y - (wy + ww / 2);
      if (y < wy + ww / 2 && dx * dx + dy * dy > (ww / 2) * (ww / 2)) continue;
      const deep = (y - wy) / wh;
      px(g, x, y, deep < 0.4 ? 0x0f : deep < 0.7 ? 0x02 : 0x0c);
      if (FK.bayer(x, y) < 0.08 && deep < 0.5) px(g, x, y, 0x30);
    }
    // Mullions and leading.
    for (let y = wy + 6; y < wy + wh; y++) { px(g, wx + ww / 2 - 1, y, 0x0f, 2, 1); }
    for (let y = wy + 30; y < wy + wh; y += 18) px(g, wx, y, 0x0f, ww, 1);
    for (let y = wy; y < wy + wh; y++) for (let x = wx - 3; x < wx + ww + 3; x++) {
      const dx = x - (wx + ww / 2), dy = y - (wy + ww / 2);
      const inside = (y >= wy + ww / 2 || dx * dx + dy * dy <= (ww / 2) * (ww / 2)) && x >= wx && x < wx + ww;
      const ring = y < wy + ww / 2 ? Math.abs(Math.sqrt(dx * dx + dy * dy) - ww / 2 - 1.5) < 1.5 : (x < wx && x >= wx - 3) || (x >= wx + ww && x < wx + ww + 3);
      if (!inside && ring) px(g, x, y, 0x00);
    }
    px(g, wx - 4, wy + wh, 0x00, ww + 8, 3);
    px(g, wx - 4, wy + wh + 3, 0x0f, ww + 8, 1);
    // Columns between the windows.
    for (const cx of [4, 116]) { px(g, cx, 0, 0x2d, 8, h); px(g, cx + 1, 0, 0x00, 2, h); px(g, cx + 7, 0, 0x0f, 1, h); }
    const moonC = canvas(256, SH);
    make('library', [
      { img: c, f: 0.3, y: 0, fy: 0.3 },
    ], (g2, cx, cy, t) => {});
  }
})();
