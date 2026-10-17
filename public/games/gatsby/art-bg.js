'use strict';
/*
 * GATSBY.EXE art: parallax backgrounds. Each is built once, at boot, from
 * seeded generators that only ever paint whole NES-palette pixels: dithered
 * sky bands, skylines, ridges, trees, water. GG.BG[name].draw paints it; the
 * per-frame work is a few drawImages and a handful of animated pixels.
 */
(() => {
  const { W: SW, H: SH } = GG;
  const BG = (GG.BG = {});
  const C = GG.color;
  const RGB = GG.NES.map((h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]);
  const bay = GG.bayer;

  const canvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  function px(g, x, y, col, w = 1, h = 1) { g.fillStyle = C(BC(col)); g.fillRect(Math.round(x), Math.round(y), w, h); }
  /*
   * Drawn live (in a background's extras) once a scene's palettes are on:
   * colours go to the nearest in its background palettes, canvases through
   * the same 16x16 reduction as the layers (palette.js).
   */
  const BC = (c) => (GG.nes && GG.nes.pal ? GG.nes.bgcol(c) : c);
  const Q = (c) => (GG.nes && GG.nes.pal ? GG.nes.q(c) : c);

  /*
   * A pixel buffer for the big generators: writing ImageData is far cheaper
   * than a fillRect per pixel. setw wraps x, so layers tile seamlessly.
   */
  function buf(w, h) {
    const d = new Uint8ClampedArray(w * h * 4);
    const set = (x, y, col) => {
      x |= 0; y |= 0;
      if (col === null || col === undefined || x < 0 || y < 0 || x >= w || y >= h) return;
      const c = RGB[col], i = (y * w + x) * 4;
      d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255;
    };
    const B = {
      w, h, d, set,
      setw: (x, y, col) => set(((Math.floor(x) % w) + w) % w, y, col),
      clear: (x, y) => { x |= 0; y |= 0; if (x >= 0 && y >= 0 && x < w && y < h) d[(y * w + x) * 4 + 3] = 0; },
      on: (x, y) => { x = ((Math.floor(x) % w) + w) % w; y |= 0; return y >= 0 && y < h && d[(y * w + x) * 4 + 3] > 0; },
      rect(x, y, rw, rh, col) { for (let yy = y; yy < y + rh; yy++) for (let xx = x; xx < x + rw; xx++) set(xx, yy, col); },
      rectw(x, y, rw, rh, col) { for (let yy = y; yy < y + rh; yy++) for (let xx = x; xx < x + rw; xx++) B.setw(xx, yy, col); },
      // A filled disc, optionally dithered (dens < 1).
      disc(cx, cy, r, col, dens = 1) {
        for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) {
          if (x * x + y * y > r * r + r * 0.6) continue;
          if (dens < 1 && bay(cx + x, cy + y) >= dens) continue;
          B.setw(cx + x, cy + y, col);
        }
      },
      ellipse(cx, cy, rx, ry, col, fn) {
        for (let y = -ry; y <= ry; y++) for (let x = -rx; x <= rx; x++) {
          if ((x * x) / (rx * rx) + (y * y) / (ry * ry) > 1.05) continue;
          const c = fn ? fn(x, y) : col;
          if (c !== null) B.setw(cx + x, cy + y, c);
        }
      },
      line(x0, y0, x1, y1, col) {
        const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
        for (let i = 0; i <= n; i++) B.setw(Math.round(x0 + ((x1 - x0) * i) / n), Math.round(y0 + ((y1 - y0) * i) / n), col);
      },
      canvas() { const c = canvas(w, h); c.getContext('2d').putImageData(new ImageData(d, w, h), 0, 0); return c; },
    };
    return B;
  }

  /*
   * Bands of color from top to bottom, with a band of ordered dither between
   * each pair: the classic way to fake a gradient with a fixed palette.
   */
  function sky(w, h, stops) {
    const b = buf(w, h);
    for (let i = 0; i < stops.length; i++) {
      const [col, y0] = stops[i];
      const y1 = i + 1 < stops.length ? stops[i + 1][1] : h;
      b.rect(0, y0, w, y1 - y0, col);
      if (i + 1 < stops.length) {
        const next = stops[i + 1][0], band = stops[i + 1][2] || 6;
        for (let k = 0; k < band; k++) {
          const y = y1 - band + k;
          if (y < 0) continue;
          for (let x = 0; x < w; x++) if (bay(x, y) < (k + 1) / (band + 1)) b.set(x, y, next);
        }
      }
    }
    return b.canvas();
  }

  function stars(g, w, h, seed, n, cols) {
    const r = GG.rng(seed);
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
      if (shade > 0.55 && bay(cx + x, cy + y) < (shade - 0.55) * 2.4) px(g, cx + x, cy + y, 0x10);
      if (phase && x > r * (1 - phase * 2) && bay(cx + x, cy + y) < 0.9) px(g, cx + x, cy + y, 0x2d);
    }
    const cr = [[-0.3, -0.25, 0.22], [0.25, 0.2, 0.16], [-0.1, 0.42, 0.12], [0.35, -0.3, 0.1]];
    for (const [ox, oy, rr] of cr) {
      const R = Math.max(1, Math.round(r * rr));
      for (let y = -R; y <= R; y++) for (let x = -R; x <= R; x++) if (x * x + y * y <= R * R) px(g, Math.round(cx + ox * r) + x, Math.round(cy + oy * r) + y, 0x10);
    }
  }

  /* A ridge line by midpoint displacement, seamless when w is a power of two. */
  function ridge(w, seed, base, amp, rough = 0.55) {
    const r = GG.rng(seed);
    let n = 1; while (n < w) n <<= 1;
    const pts = new Array(n + 1);
    pts[0] = pts[n] = base;
    let step = n, a = amp;
    while (step > 1) {
      const half = step >> 1;
      for (let x = half; x < n; x += step) pts[x] = (pts[x - half] + pts[x + half]) / 2 + (r() - 0.5) * a;
      a *= rough; step = half;
    }
    return pts.slice(0, w).map(Math.round);
  }

  /* Puffy NES clouds: stacked discs, an optional outline, a lit top. */
  function clouds(w, h, seed, n, o) {
    const b = buf(w, h);
    const r = GG.rng(seed);
    const shapes = [];
    for (let i = 0; i < n; i++) {
      const cx = Math.floor(r() * w), cy = Math.floor(o.y0 + r() * (o.y1 - o.y0));
      const parts = [];
      const len = 3 + Math.floor(r() * 4);
      for (let k = 0; k < len; k++) parts.push([cx + k * 7 - len * 3, cy - Math.floor(r() * 5), 5 + Math.floor(r() * 4)]);
      shapes.push(parts);
    }
    const each = (fn) => { for (const s of shapes) for (const [x, y, rr] of s) fn(x, y, rr); };
    if (o.outline !== undefined) each((x, y, rr) => b.disc(x, y, rr + 1, o.outline));
    each((x, y, rr) => b.disc(x, y, rr, o.dark));
    each((x, y, rr) => b.disc(x - 1, y - 2, rr - 2, o.lit));
    if (o.flat) {
      // Flat, shaded bottoms: cut each cloud at its base and line it.
      for (const s of shapes) {
        const base = Math.max(...s.map(([, y]) => y)) + 3;
        const x0 = Math.min(...s.map(([x, , rr]) => x - rr - 1)), x1 = Math.max(...s.map(([x, , rr]) => x + rr + 1));
        for (let x = x0; x <= x1; x++) for (let y = base; y < base + 12; y++) {
          const xx = ((x % w) + w) % w;
          if (y < h && b.on(xx, y)) b.clear(xx, y);
        }
      }
    }
    return b.canvas();
  }

  /* Conifer forest silhouette. */
  function forest(w, h, seed, o) {
    const b = buf(w, h);
    const r = GG.rng(seed);
    b.rect(0, h - o.floor, w, o.floor, o.col);
    for (let x = 0; x < w; x += o.gap + Math.floor(r() * o.gap)) {
      const th = o.minH + Math.floor(r() * (o.maxH - o.minH));
      const base = h - o.floor + 2;
      for (let i = 0; i < th; i++) {
        const half = Math.floor(((th - i) / th) * o.width * (1 - 0.25 * ((i % 6) / 6)));
        for (let k = -half; k <= half; k++) b.setw(x + k, base - i, o.col);
        if (o.lit !== undefined && i % 6 < 2) for (let k = 0; k < Math.max(1, half - 1); k++) b.setw(x - k, base - i, o.lit);
      }
    }
    return b.canvas();
  }

  /*
   * Broad-leaved trees: elms (clusters of discs), poplars (tall ellipses).
   * Light comes from the upper left.
   */
  function trees(w, h, seed, o) {
    const b = buf(w, h);
    const r = GG.rng(seed);
    const floor = o.floor || 0;
    if (floor) b.rect(0, h - floor, w, floor, o.ground ?? o.dark);
    const base = h - floor;
    for (let x = Math.floor(r() * o.gap); x < w; x += Math.floor(o.gap * (0.6 + r() * 0.9))) {
      const th = o.minH + r() * (o.maxH - o.minH);
      const poplar = o.poplar && r() < o.poplar;
      const tw = th > 70 ? 3 : 2;
      for (let y = Math.floor(base - th * 0.5); y < base; y++) for (let k = 0; k < tw; k++) b.setw(x + k, y, k === 0 && o.trunkLit !== undefined ? o.trunkLit : o.trunk);
      if (poplar) {
        const rx = 4 + Math.floor(r() * 3), ry = Math.floor(th * 0.45), cy = Math.floor(base - th * 0.55);
        b.ellipse(x + 1, cy, rx, ry, null, (dx, dy) => {
          if (o.lit === undefined) return o.dark;
          const lit = dx < -rx * 0.2 && dy < ry * 0.5;
          return lit && bay(x + dx, cy + dy) < 0.6 ? o.lit : o.dark;
        });
      } else {
        const cy = Math.floor(base - th * 0.68);
        const blobs = [];
        const n = 5 + Math.floor(r() * 4);
        for (let i = 0; i < n; i++) blobs.push([x + 1 + Math.round((r() - 0.5) * th * 0.45), cy + Math.round((r() - 0.5) * th * 0.32), Math.round(th * (0.12 + r() * 0.1))]);
        for (const [bx, by, rr] of blobs) b.disc(bx, by, rr, o.dark);
        if (o.lit !== undefined) for (const [bx, by, rr] of blobs) { b.disc(bx - 2, by - 2, rr - 3, o.lit, 0.5); b.disc(bx - 3, by - 3, rr - 5, o.lit); }
      }
    }
    return o.raw ? b : b.canvas();
  }

  /*
   * A 1920s skyline: towers with setbacks and spires, lower blocks between,
   * the shadow side to the right, windows in a grid.
   */
  function city(w, h, seed, o) {
    const b = buf(w, h);
    const r = GG.rng(seed);
    const blocks = [];
    let x = 0;
    while (x < w) {
      const bw = (o.minW || 8) + Math.floor(r() * ((o.maxW || 22) - (o.minW || 8)));
      let bh = o.minH + Math.floor(r() * (o.maxH - o.minH));
      if (r() < (o.tall ?? 0.15)) bh = Math.min(h - 12, bh + Math.floor((o.maxH - o.minH) * 0.5));
      blocks.push({ x, bw, bh, z: r() });
      x += bw + (r() < 0.3 ? 2 : 0);
    }
    // Lower blocks first, so towers stand in front.
    blocks.sort((a, b2) => a.bh - b2.bh);
    for (const k of blocks) {
      const tiers = [];
      let tx = k.x, tw = k.bw, top = h - k.bh;
      tiers.push([tx, top, tw, k.bh]);
      if (k.bh > (o.minH + o.maxH) / 2 && k.bw > 9) {
        const n = 1 + Math.floor(k.z * 3);
        for (let i = 0; i < n && tw > 5; i++) {
          const inset = 2 + Math.floor(r() * 2), th = 5 + Math.floor(r() * 8);
          tx += inset; tw -= inset * 2; top -= th;
          tiers.push([tx, top, tw, th]);
        }
      }
      for (const [bx, by, bw, bh2] of tiers) {
        for (let yy = by; yy < h; yy++) for (let xx = bx; xx < bx + bw; xx++) {
          const shade = xx >= bx + bw - Math.max(1, Math.floor(bw / 5));
          b.setw(xx, yy, shade ? o.shade : o.col);
        }
        if (o.win !== undefined) for (let yy = by + 3; yy < h - 2; yy += 3) for (let xx = bx + 2; xx < bx + bw - 2; xx += 2) {
          if (r() < (o.winP ?? 0.35)) b.setw(xx, yy, o.win);
        }
        if (o.edge !== undefined) for (let xx = bx; xx < bx + bw; xx++) b.setw(xx, by, o.edge);
      }
      const [lx, ly, lw] = tiers[tiers.length - 1];
      const kind = r();
      if (tiers.length > 1 && kind < 0.4) {
        // A pyramid cap and a mast.
        for (let i = 0; i < Math.ceil(lw / 2); i++) for (let xx = lx + i; xx < lx + lw - i; xx++) b.setw(xx, ly - i, o.col);
        for (let i = 0; i < 6; i++) b.setw(lx + Math.floor(lw / 2), ly - Math.ceil(lw / 2) - i, o.shade);
      } else if (tiers.length > 1 && kind < 0.7) {
        // A domed "sugar lump" top.
        b.ellipse(lx + Math.floor(lw / 2), ly, Math.floor(lw / 2), Math.max(2, Math.floor(lw / 3)), null, (dx, dy) => (dy <= 0 ? (dx > lw / 5 ? o.shade : o.col) : null));
      }
    }
    return o.raw ? b : b.canvas();
  }

  /* Water: banded, with short glints that shorten toward the horizon. */
  function water(w, h, seed, bands, glints) {
    const b = buf(w, h);
    for (let i = 0; i < bands.length; i++) {
      const [col, y0, band] = bands[i];
      const y1 = i + 1 < bands.length ? bands[i + 1][1] : h;
      b.rect(0, y0, w, y1 - y0, col);
      if (band && i > 0) {
        const prev = bands[i - 1][0];
        for (let k = 0; k < band; k++) for (let x = 0; x < w; x++) if (bay(x, y0 + k) >= (k + 1) / (band + 1)) b.set(x, y0 + k, prev);
      }
    }
    const r = GG.rng(seed);
    for (const [col, n] of glints) {
      for (let i = 0; i < n; i++) {
        const y = Math.floor(Math.pow(r(), 0.8) * h);
        const len = 1 + Math.floor((y / h) * 7 * r()) + 1;
        const x = Math.floor(r() * w);
        for (let k = 0; k < len; k++) b.setw(x + k, y, col);
      }
    }
    return b.canvas();
  }

  /* A soft bank of dithered mist or smoke. */
  function bank(w, h, col, dens) {
    const b = buf(w, h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const dx = (x - w / 2) / (w / 2), dy = (y - h / 2) / (h / 2);
      const d = dx * dx + dy * dy * 1.3;
      if (d < 1 && bay(x, y) < (1 - d) * dens) b.set(x, y, col);
    }
    return b.canvas();
  }

  GG.bgKit = { canvas, px, buf, sky, stars, disc, moon, ridge, clouds, forest, trees, city, water, bank };

  /*
   * A background is a list of layers. Each has a canvas, a parallax factor
   * and a y; wide layers repeat. `still` layers ignore the camera. `img` may be
   * a function of (t, W), for animated or lightning-lit layers.
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
          if (L.repeatY) {
            const hh = img.height;
            let y0 = y % hh; if (y0 > 0) y0 -= hh;
            for (let yy = y0; yy < SH; yy += hh) for (let xx = x; xx < SW; xx += w) g.drawImage(img, xx, yy);
            continue;
          }
          for (; x < SW; x += w) g.drawImage(img, x, y);
          if (L.fill !== undefined && y + img.height < SH) { g.fillStyle = C(L.fill); g.fillRect(0, y + img.height, SW, SH - y - img.height); }
        }
        if (extra) { if (GG.nes) GG.nes.overlay(g, (h) => extra(h, cx, cy, t, W)); else extra(g, cx, cy, t, W); }
      },
    };
  }
  GG.makeBG = make;
  /* Screen x of a point fixed in a layer of width `wrap` moving at factor f. */
  const layerX = (lx, cx, f, wrap, drift = 0, t = 0) => {
    let x = (lx - cx * f - t * drift) % wrap;
    if (x < -48) x += wrap;
    return x;
  };
  const flashOf = (W) => !!(W && W.flash > 0);

  /* ============================================================ EAST EGG */
  // Late afternoon on the Buchanans' side of the bay: West Egg low across
  // the water, Gatsby's house the largest thing on it.
  {
    const s = sky(SW, SH, [[0x11, 0], [0x21, 30, 12], [0x31, 92, 16], [0x37, 128, 10], [0x38, 140, 4]]);
    const sg = s.getContext('2d');
    // The sun, low, with a dithered glow.
    for (let y = 92; y < 150; y++) for (let x = 166; x < 244; x++) {
      const d = Math.hypot(x - 205, y - 126);
      if (d > 12 && d < 34 && bay(x, y) < (1 - (d - 12) / 22) * 0.6) px(sg, x, y, d < 20 ? 0x38 : 0x37);
    }
    disc(sg, 205, 126, 12, 0x38);
    disc(sg, 205, 126, 9, 0x30);
    const cl = clouds(512, 100, 5, 7, { y0: 22, y1: 80, dark: 0x31, lit: 0x30 });

    // The far shore: a low green line, houses, and one enormous house.
    const sb = buf(768, 40);
    const rise = ridge(1024, 17, 0, 6, 0.5);
    for (let x = 0; x < 768; x++) {
      const top = 26 + rise[x];
      for (let y = top; y < 40; y++) sb.set(x, y, y > 36 && bay(x, y) < 0.5 ? 0x0c : 0x1c);
    }
    // Clumps of trees on the far shore, low and hazy.
    const rs = GG.rng(29);
    for (let i = 0; i < 46; i++) {
      const x = Math.floor(rs() * 768), rx = 3 + Math.floor(rs() * 6), ry = 2 + Math.floor(rs() * 2);
      sb.ellipse(x, 26 + rise[x] - ry + 1, rx, ry, null, (dx, dy) => (dy < 0 && dx < 0 && bay(x + dx, dy) < 0.5 ? 0x1c : 0x0c));
    }
    // Small summer houses: white walls, dark roofs.
    for (let i = 0; i < 12; i++) {
      const x = Math.floor(rs() * 760), y = 25 + rise[x];
      sb.rectw(x, y - 4, 5, 4, 0x20); sb.rectw(x, y - 6, 5, 2, 0x07); sb.setw(x + 2, y - 3, 0x0c);
    }
    // Gatsby's: "a factual imitation of some Hôtel de Ville in Normandy,
    // with a tower on one side".
    {
      const gx = 150, gy = 27;
      sb.rectw(gx, gy - 12, 34, 12, 0x37);
      sb.rectw(gx + 34, gy - 6, 6, 6, 0x37);
      for (let i = 0; i < 5; i++) sb.rectw(gx + i, gy - 14 - i, 34 - i * 2, 1, 0x27);
      sb.rectw(gx - 6, gy - 22, 7, 22, 0x37);                 // the tower
      for (let i = 0; i < 6; i++) sb.rectw(gx - 6 + Math.floor(i / 2), gy - 23 - i, 7 - Math.floor(i / 2) * 2, 1, 0x27);
      for (let wx = gx + 3; wx < gx + 32; wx += 4) { sb.setw(wx, gy - 9, 0x0c); sb.setw(wx, gy - 5, 0x0c); }
      sb.setw(gx - 3, gy - 17, 0x0c); sb.setw(gx - 3, gy - 12, 0x0c);
      // Its dock, a pale line into the water.
      sb.rectw(gx + 14, gy + 1, 2, 9, 0x10);
    }
    const shore = sb.canvas();

    const sea = water(512, 84, 41, [[0x21, 0], [0x11, 10, 6], [0x01, 44, 8]], [[0x31, 70], [0x30, 30], [0x12, 50]]);
    const eb = trees(768, 110, 61, { gap: 120, minH: 46, maxH: 92, poplar: 0.45, dark: 0x0a, lit: 0x1a, trunk: 0x08, trunkLit: 0x18, floor: 14, ground: 0x1a, raw: true });
    // The shore lawn they stand on: a lit edge, a dithered shadow, a hedge.
    for (let x = 0; x < 768; x++) {
      eb.set(x, 96, 0x2a);
      for (let y = 97; y < 110; y++) if (bay(x, y) < (y - 97) / 16) eb.set(x, y, 0x0a);
      if (Math.sin(x / 9) + Math.sin(x / 23) > 0.6) for (let y = 92; y < 97; y++) if (!eb.on(x, y) || y > 93) eb.set(x, y, y === 92 ? 0x1a : 0x0a);
    }
    const elms = eb.canvas();

    const sails = [[40, 160, 0], [300, 168, 1], [530, 154, 2]];
    make('eastegg', [
      { img: s, still: true },
      { img: cl, f: 0.05, y: 6, fy: 0.02, drift: 0.04 },
      { img: shore, f: 0.1, y: 108, fy: 0.05 },
      { img: sea, f: 0.12, y: 146, fy: 0.06, fill: 0x01 },
      { img: elms, f: 0.34, y: 118, fy: 0.16, fill: 0x0a },
    ], (g, cx, cy, t) => {
      // The sun's path on the water, glittering.
      const sy = Math.round(146 - cy * 0.06);
      for (let i = 0; i < 9; i++) {
        const y = sy + 3 + i * 4, wdt = 3 + i;
        const on = (Math.floor(t / 10) + i) % 3;
        px(g, 205 - Math.floor(wdt / 2) + (on - 1) * 2, y, i < 4 ? 0x30 : 0x38, wdt, 1);
      }
      // Sailboats drifting along the far side of the bay.
      for (const [lx, ly, k] of sails) {
        const x = Math.round(layerX(lx, cx, 0.12, 768, 0.03 + k * 0.01, t)), y = Math.round(ly - cy * 0.06 + (Math.floor(t / 30 + k) % 2));
        if (x < -12 || x > SW + 4) continue;
        px(g, x, y, 0x30, 9, 2); px(g, x + 1, y + 2, 0x0f, 7, 1);
        for (let i = 0; i < 9; i++) px(g, x + 4 - Math.floor(i / 2), y - 1 - i, 0x30, Math.floor(i / 2) + 1, 1);
        px(g, x + 4, y - 11, 0x08, 1, 11);
      }
    });
  }

  /* ========================================================= THE VALLEY */
  // "A fantastic farm where ashes grow like wheat into ridges and hills and
  // grotesque gardens; where ashes take the forms of houses and chimneys and
  // rising smoke." Grays only, and a smudge of sick yellow low in the sky.
  const ashKit = {};
  {
    const sb = buf(SW, SH);
    const stops = [[0x00, 0], [0x10, 70, 28], [0x10, 200]];
    for (let i = 0; i < stops.length - 1; i++) {
      const [col, y0] = stops[i];
      const y1 = stops[i + 1][1];
      sb.rect(0, y0, SW, y1 - y0, col);
      const band = stops[i + 1][2] || 0;
      for (let k = 0; k < band; k++) for (let x = 0; x < SW; x++) if (bay(x, y1 - band + k) < (k + 1) / (band + 1)) sb.set(x, y1 - band + k, stops[i + 1][0]);
    }
    sb.rect(0, 200, SW, 24, 0x10);
    // The sick-yellow smudge low over the dumps.
    for (let y = 88; y < 136; y++) for (let x = 0; x < SW; x++) {
      const k = 1 - Math.abs(y - 114) / 22;
      if (k > 0 && bay(x, y) < k * 0.34 * (0.7 + 0.3 * Math.sin(x / 23))) sb.set(x, y, 0x18);
    }
    // A haze of black soot in the top of the sky.
    for (let y = 0; y < 30; y++) for (let x = 0; x < SW; x++) if (bay(x, y) < (1 - y / 30) * 0.35) sb.set(x, y, 0x2d);
    ashKit.sky = sb.canvas();

    // Manhattan, faint and far.
    const ghost = () => {
      const b = city(512, 70, 7, { col: 0x00, shade: 0x00, minH: 8, maxH: 34, minW: 6, maxW: 16, tall: 0.12, raw: true });
      for (let y = 0; y < 70; y++) for (let x = 0; x < 512; x++) if (b.on(x, y) && bay(x, y) >= 0.5) b.set(x, y, 0x10);
      return b.canvas();
    };
    ashKit.far = ghost();
    {
      // A tiny billboard far off, two yellow rings on it.
      const fg = ashKit.far.getContext('2d');
      px(fg, 300, 46, 0x10, 16, 8); px(fg, 300, 54, 0x2d, 1, 6); px(fg, 315, 54, 0x2d, 1, 6);
      px(fg, 302, 48, 0x18, 5, 4); px(fg, 309, 48, 0x18, 5, 4); px(fg, 303, 49, 0x02, 3, 2); px(fg, 310, 49, 0x02, 3, 2);
      ashKit.farBoard = ashKit.far;
      ashKit.far = ghost();
    }

    // Ridges of ash, with ash houses and chimneys on them.
    const mb = buf(512, 110);
    const rr = ridge(512, 23, 0, 30, 0.6);
    const top = new Array(512);
    for (let x = 0; x < 512; x++) {
      top[x] = 40 + rr[x];
      for (let y = top[x]; y < 110; y++) {
        let col = 0x00;
        if (y === top[x]) col = 0x10;
        else if (y < top[x] + 4 && bay(x, y) < 0.5) col = 0x10;
        else if (bay(x, y) < 0.3 - (y - top[x]) / 60) col = 0x10;
        mb.set(x, y, col);
      }
    }
    // Furrows: the ashes "grow like wheat".
    for (let y = 0; y < 110; y += 9) for (let x = 0; x < 512; x++) if (y > top[x] + 10 && bay(x, y) < 0.25 && Math.sin(x / 7 + y) > 0) mb.set(x, y, 0x10);
    const chim = [];
    const rh = GG.rng(31);
    for (let i = 0; i < 7; i++) {
      const x = 20 + Math.floor(i * 72 + rh() * 30), y = top[x] + 2;
      const w = 10 + Math.floor(rh() * 8), h = 7 + Math.floor(rh() * 5);
      for (let yy = y - h; yy < y + 4; yy++) for (let xx = x; xx < x + w; xx++) mb.setw(xx, yy, xx === x ? 0x10 : 0x2d);
      for (let k = 0; k < Math.ceil(w / 2) + 1; k++) for (let xx = x - 1 + k; xx < x + w + 1 - k; xx++) mb.setw(xx, y - h - k, k === 0 ? 0x2d : 0x00);
      mb.setw(x + 3, y - h + 3, 0x0f); mb.setw(x + w - 4, y - h + 3, 0x0f);
      const cxp = x + w - 4;
      for (let yy = y - h - Math.ceil(w / 2) - 5; yy < y - h; yy++) { mb.setw(cxp, yy, 0x2d); mb.setw(cxp + 1, yy, 0x00); }
      chim.push([cxp, y - h - Math.ceil(w / 2) - 5]);
    }
    ashKit.mid = mb.canvas();
    ashKit.chim = chim;

    // The near dumps: darker, ragged, stippled with black.
    const nb = buf(512, 90);
    const nr = ridge(512, 57, 0, 26, 0.62);
    for (let x = 0; x < 512; x++) {
      const t0 = 30 + nr[x];
      for (let y = t0; y < 90; y++) {
        let col = 0x00;
        if (y === t0) col = 0x10;
        else if (y === t0 + 1 && bay(x, y) < 0.5) col = 0x10;
        else if (y - t0 > 30 && bay(x, y) < 0.25) col = 0x0f;
        else if (y - t0 > 12 && bay(x, y) < 0.12) col = 0x0f;
        nb.set(x, y, col);
      }
    }
    // Spades stuck in the heaps.
    for (const sx of [70, 210, 390]) {
      const y = 30 + nr[sx];
      for (let k = 0; k < 10; k++) nb.setw(sx, y - 6 - k, 0x08);
      nb.rectw(sx - 1, y - 6, 3, 4, 0x0f);
    }
    ashKit.near = nb.canvas();

    // The elevated railway: a deck on trestles.
    const tb = buf(512, 80);
    for (let x = 0; x < 512; x++) { tb.set(x, 0, 0x2d); tb.set(x, 1, 0x0f); tb.set(x, 2, 0x0f); tb.set(x, 3, 0x2d); if (x % 4 === 0) tb.set(x, 4, 0x0f); }
    for (let x = 6; x < 512; x += 48) {
      for (let y = 4; y < 80; y++) { tb.setw(x, y, 0x0f); tb.setw(x + 12, y, 0x0f); }
      for (let k = 0; k < 11; k++) { tb.setw(x + 1 + k, 5 + k, 0x0f); tb.setw(x + 11 - k, 5 + k, 0x0f); }
      tb.rectw(x, 17, 13, 1, 0x0f);
    }
    ashKit.rail = tb.canvas();

    ashKit.smoke = [bank(48, 16, 0x10, 0.6), bank(30, 12, 0x10, 0.7), bank(64, 18, 0x10, 0.5)];
  }
  function ashSmoke(g, cx, cy, t) {
    // Smoke rising from the ash chimneys, puffs drifting east and thinning.
    const f = 0.2;
    for (let i = 0; i < ashKit.chim.length; i++) {
      const [lx, ly] = ashKit.chim[i];
      const x0 = layerX(lx, cx, f, 512), y0 = 100 + ly - cy * 0.1;
      for (let k = 0; k < 4; k++) {
        const p = ((t * 0.25 + k * 30 + i * 17) % 120) / 120;
        const x = x0 + p * 26 + Math.sin(p * 6 + i) * 3, y = y0 - p * 40;
        const r = 2 + Math.floor(p * 5);
        for (let yy = -r; yy <= r; yy++) for (let xx = -r; xx <= r; xx++) {
          const d = xx * xx + yy * yy;
          if (d > r * r) continue;
          const X = Math.round(x + xx), Y = Math.round(y + yy);
          if (d <= (r * r) / 4 && p < 0.6) px(g, X, Y, 0x00);
          else if (bay(X, Y) < (1 - p) * 0.6) px(g, X, Y, 0x00);
        }
      }
    }
  }
  function ashBanks(g, cx, cy, t) {
    // Clouds of ash stirred up by the spades, drifting across the near dumps.
    const ys = [150, 168, 184];
    ashKit.smoke.forEach((c, i) => {
      let x = Math.round(i * 170 - cx * 0.45 + t * (0.2 + i * 0.08)) % 512;
      if (x < -c.width) x += 512;
      for (let xx = x - 512; xx < SW; xx += 512) if (xx + c.width > 0) g.drawImage(Q(c), xx, Math.round(ys[i] - cy * 0.2));
    });
  }
  make('ashes', [
    { img: ashKit.sky, still: true },
    { img: ashKit.farBoard, f: 0.05, y: 66, fy: 0.03 },
    { img: ashKit.mid, f: 0.2, y: 100, fy: 0.1, fill: 0x00 },
    { img: ashKit.rail, f: 0.27, y: 112, fy: 0.13 },
    { img: ashKit.near, f: 0.4, y: 140, fy: 0.2, fill: 0x2d },
  ], (g, cx, cy, t) => { ashSmoke(g, cx, cy, t); ashBanks(g, cx, cy, t); });

  // The billboard's arena: the same dumps with nothing built on them, so the
  // boss can stand its own enormous sign over them.
  make('billboard', [
    { img: ashKit.sky, still: true },
    { img: ashKit.far, f: 0.05, y: 66, fy: 0.03 },
    { img: ashKit.mid, f: 0.2, y: 100, fy: 0.1, fill: 0x00 },
    { img: ashKit.near, f: 0.4, y: 150, fy: 0.2, fill: 0x2d },
  ], (g, cx, cy, t) => { ashSmoke(g, cx, cy, t); ashBanks(g, cx, cy, t); });

  /* ============================================================ THE PARTY */
  // "There was music from my neighbor's house through the summer nights."
  {
    const s = sky(SW, SH, [[0x0f, 0], [0x02, 56, 24], [0x03, 128, 16], [0x13, 168, 8]]);
    stars(s.getContext('2d'), SW, 100, 77, 60, [0x30, 0x10, 0x21, 0x31, 0x2d]);

    // The house across the garden, every window lit.
    const hb = buf(768, 120);
    const hx = 200, base = 120;
    const body = (x, y, w, h) => hb.rectw(x, y, w, h, 0x0f);
    body(hx, base - 56, 170, 56);                       // the main block
    body(hx - 30, base - 38, 30, 38); body(hx + 170, base - 38, 34, 38);  // wings
    body(hx + 8, base - 98, 30, 98);                    // the tower
    for (let i = 0; i < 18; i++) body(hx + 8 + Math.floor(i * 0.9), base - 98 - i, 30 - Math.floor(i * 1.8), 1);
    hb.rectw(hx + 22, base - 124, 2, 8, 0x0f);
    // Steep Normandy roofs with dormers.
    for (let i = 0; i < 22; i++) hb.rectw(hx + 38 + i, base - 56 - i, 132 - i * 2, 1, 0x0f);
    for (const dx of [52, 84, 116, 146]) { hb.rectw(hx + dx, base - 70, 8, 10, 0x0f); hb.rectw(hx + dx + 1, base - 74, 6, 4, 0x0f); hb.rectw(hx + dx + 2, base - 68, 4, 5, 0x28); }
    for (let i = 0; i < 12; i++) { hb.rectw(hx - 30 + i, base - 38 - i, 30 - i * 2, 1, 0x0f); hb.rectw(hx + 170 + i, base - 38 - i, 34 - i * 2, 1, 0x0f); }
    // Rim light along the roofs from the garden lights.
    for (let x = hx - 32; x < hx + 210; x++) for (let y = base - 130; y < base; y++) {
      if (!hb.on(x, y) || hb.on(x, y - 1)) continue;
      hb.setw(x, y, 0x0c);
    }
    // Windows: rows of gold, a few brighter.
    const rw = GG.rng(5);
    const win = (x, y) => { const c = rw() < 0.25 ? 0x38 : 0x28; hb.rectw(x, y, 3, 5, c); hb.setw(x + 1, y + 2, 0x18); };
    for (let y = base - 48; y < base - 6; y += 12) for (let x = hx + 6; x < hx + 166; x += 8) if (x < hx + 8 || x > hx + 38) win(x, y);
    for (let y = base - 90; y < base - 8; y += 14) win(hx + 21, y);
    for (let y = base - 30; y < base - 6; y += 12) { for (let x = hx - 26; x < hx - 4; x += 8) win(x, y); for (let x = hx + 174; x < hx + 200; x += 8) win(x, y); }
    // The great doors, thrown open.
    hb.rectw(hx + 80, base - 14, 14, 14, 0x38); hb.rectw(hx + 82, base - 12, 10, 12, 0x28);
    const house = hb.canvas();

    // Trees in silhouette, strung with colored lights.
    const tb = trees(512, 130, 91, { gap: 90, minH: 70, maxH: 120, poplar: 0.2, dark: 0x0f, trunk: 0x0f, floor: 8, ground: 0x0f, raw: true });
    // Only a rim of light on the leaves, from the lanterns below.
    for (let y = 1; y < 130; y++) for (let x = 0; x < 512; x++) {
      if (tb.on(x, y) && !tb.on(x - 1, y) && tb.on(x + 4, y) && bay(x, y) < 0.75) tb.setw(x, y, 0x0c);
      else if (tb.on(x, y) && !tb.on(x, y + 2) && y < 120 && bay(x, y) < 0.5) tb.setw(x, y, 0x0c);
    }
    const trees2 = tb.canvas();
    const lightCols = [0x16, 0x28, 0x2a, 0x21, 0x24, 0x38];
    const strands = [];
    const rl = GG.rng(13);
    for (let x = 0; x < 512; x += 48 + Math.floor(rl() * 30)) {
      const span = 70 + Math.floor(rl() * 50), y0 = 30 + Math.floor(rl() * 30), y1 = 30 + Math.floor(rl() * 30), sag = 12 + Math.floor(rl() * 16);
      strands.push([x, y0, x + span, y1, sag]);
    }
    const lights = [0, 1].map((ph) => {
      const b = buf(512, 130);
      for (const [x0, y0, x1, y1, sag] of strands) {
        let n = 0;
        for (let x = x0; x <= x1; x++) {
          const p = (x - x0) / (x1 - x0);
          const y = Math.round(y0 + (y1 - y0) * p + Math.sin(p * Math.PI) * sag);
          b.setw(x, y, 0x0f);
          if ((x - x0) % 6 === 3) {
            const c = lightCols[(n + ph * 2) % lightCols.length];
            b.setw(x, y + 1, c); b.setw(x + 1, y + 1, c); b.setw(x, y + 2, c); b.setw(x + 1, y + 2, c);
            if ((n + ph) % 3 === 0) b.setw(x, y + 1, 0x30);
            n++;
          }
        }
      }
      return b.canvas();
    });

    const bursts = [0x28, 0x16, 0x2a, 0x24, 0x21, 0x30];
    make('party', [
      { img: s, still: true },
      { img: house, f: 0.08, y: 38, fy: 0.04, fill: 0x0f },
      { img: trees2, f: 0.24, y: 94, fy: 0.12, fill: 0x0f },
      { img: (t) => lights[Math.floor(t / 24) % 2], f: 0.24, y: 94, fy: 0.12 },
    ], (g, cx, cy, t) => {
      // Fireworks, now and then, over the Sound.
      for (const off of [0, 113]) {
        const cyc = 230, k = (t + off) % cyc, n = Math.floor((t + off) / cyc);
        if (k > 56) continue;
        const r = GG.rng(n * 7 + off + 1);
        const bx = 30 + Math.floor(r() * 196), by = 18 + Math.floor(r() * 50) - Math.round(cy * 0.02);
        const col = bursts[Math.floor(r() * bursts.length)], col2 = bursts[Math.floor(r() * bursts.length)];
        if (k < 10) { px(g, bx, by + (10 - k) * 6, 0x38, 1, 3); continue; }
        const kk = k - 10, rad = Math.min(22, kk * 1.3), fall = Math.max(0, kk - 18) * Math.max(0, kk - 18) * 0.03;
        for (let a = 0; a < 14; a++) {
          if (kk > 30 && (a + kk) % 2) continue;
          const ang = (a / 14) * Math.PI * 2;
          const x = Math.round(bx + Math.cos(ang) * rad), y = Math.round(by + Math.sin(ang) * rad + fall);
          px(g, x, y, kk < 6 ? 0x30 : col);
          if (kk < 24) px(g, Math.round(bx + Math.cos(ang) * rad * 0.7), Math.round(by + Math.sin(ang) * rad * 0.7 + fall), col2);
        }
      }
    });
  }

  /* ========================================================== THE BRIDGE */
  // "The city rising up across the river in white heaps and sugar lumps all
  // built with a wish out of non-olfactory money."
  {
    const s = sky(SW, SH, [[0x21, 0], [0x31, 64, 20], [0x30, 132, 10]]);
    const cl = clouds(512, 70, 8, 5, { y0: 14, y1: 50, dark: 0x31, lit: 0x30, flat: true });
    const haze = city(768, 120, 19, { col: 0x31, shade: 0x21, minH: 20, maxH: 70, minW: 8, maxW: 18, tall: 0.2 });
    const town = city(768, 110, 3, { col: 0x30, shade: 0x10, win: 0x10, winP: 0.25, minH: 14, maxH: 74, minW: 9, maxW: 24, tall: 0.25 });
    const river = water(512, 60, 9, [[0x11, 0], [0x01, 22, 8]], [[0x31, 60], [0x21, 70], [0x12, 30]]);

    // The other cantilever span, downriver: towers on stone piers, the top
    // chord humping up over each one, a lattice down to the deck.
    const bb = buf(512, 90);
    const steel = 0x0c, lit = 0x1c, stone = 0x00;
    const towers = [128, 384];
    const deck = 62;
    const topY = (x) => {
      let best = 999;
      for (const tx of towers) for (const ox of [-512, 0, 512]) {
        const d = Math.abs(x - (tx + ox));
        best = Math.min(best, 6 + Math.pow(Math.min(d, 128) / 128, 1.3) * 38);
      }
      return Math.round(best);
    };
    for (let x = 0; x < 512; x++) {
      const ty = topY(x);
      bb.set(x, ty, lit); bb.set(x, ty + 1, steel);
      bb.set(x, deck, lit); bb.set(x, deck + 1, steel); bb.set(x, deck + 2, steel);
      if (x % 24 === 0) for (let y = ty; y < deck; y++) bb.set(x, y, steel);
    }
    for (let x = 0; x < 512; x += 24) {
      const a = topY(x), b2 = topY(x + 24);
      bb.line(x, a + 2, x + 24, deck, steel);
      bb.line(x + 24, b2 + 2, x, deck, steel);
    }
    for (const tx of towers) {
      for (let y = 2; y < deck; y++) { bb.setw(tx - 3, y, steel); bb.setw(tx + 3, y, steel); }
      for (let y = 6; y < deck; y += 8) bb.rectw(tx - 3, y, 7, 1, lit);
      for (const fx of [tx - 3, tx + 3]) { bb.setw(fx, 0, lit); bb.setw(fx, 1, steel); }
      for (let y = deck + 3; y < 90; y++) bb.rectw(tx - 6, y, 13, 1, y % 5 === 0 ? 0x2d : stone);
      bb.rectw(tx - 7, deck + 3, 15, 1, 0x10);
    }
    const bridge = bb.canvas();

    make('bridge', [
      { img: s, still: true },
      { img: cl, f: 0.04, y: 6, fy: 0, drift: 0.06 },
      { img: haze, f: 0.05, y: 34, fy: 0.03 },
      { img: town, f: 0.09, y: 50, fy: 0.04 },
      { img: river, f: 0.12, y: 156, fy: 0.06, fill: 0x01 },
      { img: bridge, f: 0.18, y: 92, fy: 0.09 },
    ], (g, cx, cy, t) => {
      // "The sunlight through the girders making a constant flicker."
      if ((t >> 2) % 9 === 0) for (let i = 0; i < 6; i++) px(g, ((i * 47 + t * 3) % 260) - 2, 150 + ((i * 29) % 30), 0x30, 3, 1);
    });
  }

  /* ========================================================== THE CELLAR */
  // A well-fanned Forty-second Street cellar: plaster gone dark red with
  // smoke, booths, a long mirror, pictures, warm little lamps.
  {
    const w = 256, h = 224;
    const b = buf(w, h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      let col = 0x08;
      if (y < 24) col = bay(x, y) < 0.2 + y / 60 ? 0x08 : 0x0f;                 // smoky ceiling
      else if (bay(x, y) < 0.3) col = 0x07;
      b.set(x, y, col);
    }
    // Ceiling beams.
    for (let x = 0; x < w; x += 64) b.rect(x, 0, 10, 22, 0x0f);
    b.rect(0, 22, w, 2, 0x08); b.rect(0, 24, w, 1, 0x18);
    // The long mirror, smoky, with a gilt frame and pale streaks.
    b.rect(0, 52, w, 44, 0x18); b.rect(0, 54, w, 40, 0x08);
    for (let y = 55; y < 93; y++) for (let x = 0; x < w; x++) {
      let col = 0x0c;
      if (bay(x, y) < 0.25) col = 0x00;
      if ((x + y * 2) % 48 < 3) col = 0x2d;
      if ((x + y * 2) % 48 === 3) col = 0x10;
      b.set(x, y, col);
    }
    for (let x = 0; x < w; x += 128) b.rect(x, 54, 2, 40, 0x08);
    // Framed pictures above the mirror's gaps.
    for (const [x, y] of [[40, 30], [168, 30]]) {
      b.rect(x, y, 22, 16, 0x18); b.rect(x + 1, y + 1, 20, 14, 0x28); b.rect(x + 2, y + 2, 18, 12, 0x0c);
      b.disc(x + 11, y + 7, 3, 0x27, 1); b.rect(x + 8, y + 10, 7, 4, 0x08);
    }
    // Wall lamps with a warm halo.
    for (const lx of [104, 232]) {
      for (let y = 26; y < 52; y++) for (let x = lx - 14; x < lx + 14; x++) {
        const d = Math.hypot(x - lx, y - 38);
        if (d < 13 && bay(x, y) < (1 - d / 13) * 0.6) b.setw(x, y, 0x17);
      }
      b.rect(lx - 3, 34, 7, 5, 0x28); b.rect(lx - 2, 39, 5, 2, 0x38); b.rect(lx, 41, 1, 4, 0x18);
    }
    // Wainscot and the high backs of the booths.
    b.rect(0, 100, w, 2, 0x18); b.rect(0, 102, w, 6, 0x08);
    for (let x = 0; x < w; x += 64) {
      // A booth: dark wood cap, red leather tufted back, piping.
      b.rect(x + 2, 110, 60, 4, 0x08); b.rect(x + 2, 110, 60, 1, 0x18);
      for (let y = 114; y < h; y++) for (let xx = x + 4; xx < x + 60; xx++) {
        let col = 0x07;
        if ((xx - x) % 14 === 0) col = 0x0f;
        else if ((y - 114) % 10 === 5 && (xx - x) % 7 === 3) col = 0x0f;
        else if ((xx - x) % 14 === 1) col = 0x06;
        b.set(xx, y, col);
      }
      b.rect(x, 108, 4, h - 108, 0x08); b.rect(x + 62, 108, 2, h - 108, 0x08); b.rect(x, 108, 1, h - 108, 0x18);
    }
    const wall = b.canvas();
    make('cellar', [{ img: wall, f: 0.5, y: 0, fy: 0.5, repeatY: true }], (g, cx, cy, t) => {
      // The lamps flicker a little.
      if ((t >> 3) % 11 === 0) {
        for (const lx of [104, 232]) {
          let x = Math.round(lx - cx * 0.5) % 256; if (x < -8) x += 256;
          const y = Math.round(39 - cy * 0.5) % 224;
          px(g, x - 2, y, 0x30, 5, 1);
        }
      }
    });
  }

  /* =========================================================== THE MANSION */
  // "Marie Antoinette music-rooms and Restoration salons", and "period
  // bedrooms swathed in rose and lavender silk". Three rooms, stacked, and
  // repeating; it's raining outside every window, as it rained that day.
  {
    const w = 256, RH = 224, H = RH * 3;
    const b = buf(w, H);
    const glass = [];   // window rects, for the rain
    const room = (y0, wall, wall2, pane, line, line2, deep, drape, drapeL) => {
      // Wall field.
      for (let y = y0; y < y0 + RH; y++) for (let x = 0; x < w; x++) {
        let col = wall;
        if (wall2 !== null && ((x >> 2) % 2 === 0) && bay(x, y) < 0.5) col = wall2;
        b.set(x, y, col);
      }
      // Cornice.
      b.rect(0, y0, w, 3, deep); b.rect(0, y0 + 3, w, 2, line); b.rect(0, y0 + 5, w, 1, line2);
      for (let x = 0; x < w; x += 6) b.rect(x, y0 + 6, 3, 2, line2);
      // Wainscot panels.
      b.rect(0, y0 + 176, w, 2, line); b.rect(0, y0 + 178, w, RH - 178, deep);
      for (let x = 6; x < w; x += 42) {
        b.rect(x, y0 + 184, 34, 1, line2); b.rect(x, y0 + 216, 34, 1, line2); b.rect(x, y0 + 184, 1, 33, line2); b.rect(x + 33, y0 + 184, 1, 33, line2);
        for (let y = y0 + 186; y < y0 + 215; y++) for (let xx = x + 2; xx < x + 32; xx++) if (bay(xx, y) < 0.25) b.set(xx, y, pane);
      }
      b.rect(0, RH - 2 + y0, w, 2, 0x0f);
      // Two tall windows, arched, with drapes.
      for (const wx of [24, 184]) {
        const wy = y0 + 30, ww = 48, wh = 130;
        b.rect(wx - 3, wy - 3, ww + 6, wh + 6, 0x30);
        for (let y = wy - 3; y < wy + wh + 3; y++) for (let x = wx - 3; x < wx + ww + 3; x++) {
          const dx = x - (wx + ww / 2), dy = y - (wy + ww / 2);
          if (y < wy + ww / 2 && dx * dx + dy * dy > (ww / 2 + 3) * (ww / 2 + 3)) b.set(x, y, wall);
        }
        for (let y = wy; y < wy + wh; y++) for (let x = wx; x < wx + ww; x++) {
          const dx = x - (wx + ww / 2), dy = y - (wy + ww / 2);
          if (y < wy + ww / 2 && dx * dx + dy * dy > (ww / 2) * (ww / 2)) continue;
          // A gray afternoon of pouring rain.
          const p = (y - wy) / wh;
          let col = p < 0.3 ? 0x2d : p < 0.6 ? 0x00 : 0x10;
          if (p >= 0.25 && p < 0.35 && bay(x, y) < (p - 0.25) * 10) col = 0x00;
          if (p >= 0.55 && p < 0.65 && bay(x, y) < (p - 0.55) * 10) col = 0x10;
          b.set(x, y, col);
        }
        // Wet lawn and the hedge beyond, at the bottom of the glass.
        for (let x = wx; x < wx + ww; x++) { b.set(x, wy + wh - 10, 0x0a); for (let y = wy + wh - 9; y < wy + wh; y++) b.set(x, y, bay(x, y) < 0.5 ? 0x0a : 0x0c); }
        // Mullions.
        for (let y = wy + 4; y < wy + wh; y++) b.rect(wx + ww / 2 - 1, y, 2, 1, 0x10);
        for (let y = wy + 34; y < wy + wh; y += 24) b.rect(wx, y, ww, 1, 0x10);
        b.rect(wx - 6, wy + wh + 3, ww + 12, 3, line);
        glass.push([wx, wy, ww, wh - 10]);
        // Drapes, gathered at the sides.
        for (const [dx0, sgn] of [[wx - 12, 1], [wx + ww + 4, -1]]) {
          for (let y = wy - 10; y < wy + wh + 14; y++) for (let k = 0; k < 10; k++) {
            const fold = (k + (sgn > 0 ? 0 : 1)) % 3;
            b.set(dx0 + k, y, fold === 0 ? drapeL : fold === 1 ? drape : 0x0f);
          }
          b.rect(dx0 - 1, wy + 70, 12, 3, line);
        }
        b.rect(wx - 14, wy - 12, ww + 28, 3, line);
      }
    };
    // The music room: teal silk, white and gold.
    room(0, 0x0c, 0x1c, 0x1c, 0x28, 0x18, 0x08, 0x05, 0x15);
    // The salon: dark oak paneling, gilt moulding, portraits.
    room(RH, 0x08, null, 0x07, 0x18, 0x28, 0x0f, 0x0c, 0x1c);
    // A bedroom: lavender silk in stripes, rose drapes.
    room(RH * 2, 0x03, 0x13, 0x13, 0x33, 0x23, 0x0f, 0x05, 0x15);
    // Between the windows: a harp, a portrait, a mirror.
    {
      const y0 = 0;
      b.rect(108, y0 + 44, 40, 64, 0x28); b.rect(110, y0 + 46, 36, 60, 0x0c);
      // A harp in the music room.
      for (let k = 0; k < 40; k++) b.set(118 + Math.round(k * 0.45), y0 + 54 + k, 0x28);
      b.rect(118, y0 + 52, 3, 46, 0x18);
      for (let k = 0; k < 7; k++) b.rect(121 + k * 2, y0 + 58 + k * 4, 1, 36 - k * 4, 0x10);
      b.rect(112, y0 + 150, 32, 10, 0x18); b.rect(114, y0 + 140, 28, 10, 0x28);
    }
    {
      const y0 = RH;
      // A portrait: a gentleman with a red ribbon across his chest.
      b.rect(106, y0 + 40, 44, 58, 0x28); b.rect(108, y0 + 42, 40, 54, 0x18); b.rect(110, y0 + 44, 36, 50, 0x0f);
      b.disc(128, y0 + 60, 7, 0x27); b.rect(124, y0 + 54, 9, 3, 0x0f);
      b.rect(117, y0 + 69, 22, 25, 0x02); b.rect(125, y0 + 69, 6, 6, 0x30);
      for (let k = 0; k < 18; k++) b.rect(119 + k, y0 + 74 + Math.floor(k * 0.8), 2, 1, 0x16);
      b.rect(112, y0 + 150, 32, 6, 0x18);
    }
    {
      const y0 = RH * 2;
      // A tall mirror reflecting the rose drapes.
      b.rect(110, y0 + 36, 36, 120, 0x33); b.rect(112, y0 + 38, 32, 116, 0x10);
      for (let y = y0 + 38; y < y0 + 154; y++) for (let x = 112; x < 144; x++) if ((x + y) % 22 < 2) b.set(x, y, 0x30); else if (bay(x, y) < 0.2) b.set(x, y, 0x00);
      b.ellipse(128, y0 + 34, 18, 6, null, (dx, dy) => (dy < 1 ? 0x33 : null));
    }
    const base = b.canvas();
    // Four frames of rain on the glass.
    const frames = [0, 1, 2, 3].map((f) => {
      const c = canvas(w, H), g = c.getContext('2d');
      g.drawImage(base, 0, 0);
      const r = GG.rng(101);
      for (const [gx, gy, gw, gh] of glass) {
        for (let i = 0; i < 26; i++) {
          const sx = Math.floor(r() * gw), sy = Math.floor(r() * gh);
          const y = gy + ((sy + f * 9) % gh), x = gx + ((sx + Math.floor((f * 9) / 3)) % gw);
          for (let k = 0; k < 4; k++) {
            const yy = y + k, xx = x - (k >> 1);
            if (yy < gy + gh && xx >= gx) px(g, xx, yy, k === 0 ? 0x30 : (yy - gy) / gh < 0.55 ? 0x10 : 0x00);
          }
        }
      }
      return c;
    });
    make('mansion', [{ img: (t) => frames[Math.floor(t / 5) % 4], f: 0.5, y: 0, fy: 0.5, repeatY: true }]);
  }

  /* ======================================================= LAKE SUPERIOR */
  // The south shore in 1907: a huge bright lake, red sandstone points
  // furred with pines, and far out, Dan Cody's yacht at anchor.
  {
    const s = sky(SW, SH, [[0x11, 0], [0x21, 26, 14], [0x31, 92, 14]]);
    const cl = clouds(512, 100, 21, 8, { y0: 20, y1: 86, dark: 0x31, lit: 0x30, flat: true });
    // The far shore: blue hills, low.
    const fb = buf(1024, 30);
    const fr = ridge(1024, 3, 0, 14, 0.55);
    for (let x = 0; x < 1024; x++) for (let y = 16 + fr[x]; y < 30; y++) fb.set(x, y, y === 16 + fr[x] ? 0x21 : 0x11);
    const far = fb.canvas();
    const lake = water(512, 110, 33, [[0x21, 0], [0x11, 6, 4], [0x01, 60, 10]], [[0x31, 80], [0x30, 30], [0x12, 60]]);
    // Points of red sandstone with pines on them, jutting into the lake:
    // streaked cliffs, a ragged crown of pines, a skirt of fallen rock.
    const pb = buf(768, 90);
    const rp = GG.rng(83);
    for (const [px0, pw, ph] of [[30, 150, 48], [400, 110, 36], [600, 90, 28]]) {
      const crest = ridge(256, px0, 0, 10, 0.6);
      const tops = [];
      for (let x = 0; x < pw; x++) {
        const p = x / pw;
        // A steep cliff on the lake side (right), a long slope on the other.
        const prof = p < 0.7 ? Math.pow(p / 0.7, 0.6) : Math.max(0, 1 - Math.pow((p - 0.7) / 0.3, 2.2));
        const top = Math.round(88 - ph * prof + crest[x % 256] * prof);
        tops.push(top);
        for (let y = top; y < 90; y++) {
          const depth = y - top;
          let col = 0x07;
          if (depth < 4) col = 0x0a;                                      // turf
          else if (((x * 3 + y * 7) % 23) < 2) col = 0x17;                // streaks of color in the stone
          else if (depth % 6 === 0 && bay(px0 + x, y) < 0.6) col = 0x08;  // bedding planes
          else if (p > 0.7 && bay(px0 + x, y) < 0.35) col = 0x08;         // the cliff face in shade
          else if (p < 0.5 && bay(px0 + x, y) < 0.2) col = 0x17;
          if (y > 85) col = bay(px0 + x, y) < 0.5 ? 0x08 : 0x01;          // its reflection meets the water
          pb.setw(px0 + x, y, col);
        }
      }
      // Pines along the crest, of all heights.
      for (let x = 2; x < pw - 2; x += 3 + Math.floor(rp() * 4)) {
        const p = x / pw;
        if (p > 0.92) continue;
        const th = 8 + Math.floor(rp() * 16), base = tops[x] + 3;
        for (let i = 0; i < th; i++) {
          const half = Math.max(0, Math.floor(((th - i) / th) * 4.2 - (i % 3 === 2 ? 1 : 0)));
          for (let k = -half; k <= half; k++) pb.setw(px0 + x + k, base - i, k < 0 && i % 3 < 2 ? 0x1a : 0x0a);
        }
        pb.setw(px0 + x, base - th, 0x0a);
      }
    }
    const points = pb.canvas();
    const gulls = [[30, 40], [120, 64], [200, 30], [330, 52]];
    make('lake', [
      { img: s, still: true },
      { img: cl, f: 0.05, y: 4, fy: 0.02, drift: 0.05 },
      { img: far, f: 0.04, y: 100, fy: 0.03 },
      { img: lake, f: 0.1, y: 126, fy: 0.05, fill: 0x01 },
      { img: points, f: 0.2, y: 108, fy: 0.1 },
    ], (g, cx, cy, t) => {
      // The Tuolomee, at anchor, rocking.
      const x = Math.round(layerX(300, cx, 0.08, 640)), y = Math.round(124 - cy * 0.05 + Math.sin(t / 40));
      if (x > -40 && x < SW + 10) {
        px(g, x, y, 0x30, 30, 3); px(g, x + 2, y + 3, 0x30, 26, 2); px(g, x + 2, y + 5, 0x0f, 26, 1);
        px(g, x - 2, y - 1, 0x30, 4, 2);
        px(g, x + 9, y - 4, 0x30, 12, 4); px(g, x + 10, y - 3, 0x0f, 1, 1); px(g, x + 13, y - 3, 0x0f, 1, 1); px(g, x + 16, y - 3, 0x0f, 1, 1);
        px(g, x + 14, y - 9, 0x37, 3, 5); px(g, x + 14, y - 10, 0x0f, 3, 1);
        px(g, x + 6, y - 16, 0x08, 1, 16); px(g, x + 24, y - 13, 0x08, 1, 13);
        px(g, x + 6, y - 16, 0x08, 18, 1);
        if (Math.floor(t / 20) % 3) px(g, x + 15, y - 13 - ((t >> 3) % 3), 0x10, 2, 2);
      }
      // Gulls.
      for (const [lx, ly] of gulls) {
        const gx = Math.round(layerX(lx, cx, 0.15, 400, -0.2, t)), gy = Math.round(ly + Math.sin(t / 30 + lx) * 4 - cy * 0.05);
        const up = Math.floor(t / 12 + lx) % 2;
        px(g, gx, gy + up, 0x30); px(g, gx + 1, gy + 1 - up, 0x30); px(g, gx + 2, gy + 1, 0x30); px(g, gx + 3, gy + 1 - up, 0x30); px(g, gx + 4, gy + up, 0x30);
      }
    });
  }

  /* ========================================================== THE PLAZA */
  // "The next day was broiling, almost the last, certainly the warmest, of
  // the summer." Fifth Avenue and the Park, swimming in the heat.
  {
    const s = sky(SW, SH, [[0x38, 0], [0x37, 50, 20], [0x30, 110, 24]]);
    const sg = s.getContext('2d');
    for (let y = 0; y < 70; y++) for (let x = 150; x < 256; x++) {
      const d = Math.hypot(x - 206, y - 24);
      if (d < 14) px(sg, x, y, 0x30);
      else if (d < 40 && bay(x, y) < (1 - (d - 14) / 26) * 0.7) px(sg, x, y, 0x30);
    }
    // Fifth Avenue's pale stone, washed out by the glare.
    const fb = city(768, 150, 41, { col: 0x10, shade: 0x00, win: 0x2d, winP: 0.4, minH: 30, maxH: 96, minW: 14, maxW: 30, tall: 0.1, edge: 0x37, raw: true });
    // Washed out by the glare: the higher, the hazier.
    for (let y = 0; y < 150; y++) for (let x = 0; x < 768; x++) if (fb.on(x, y) && bay(x, y) < 0.55 - y / 300) fb.set(x, y, 0x37);
    const fifth = fb.canvas();
    const pk = trees(512, 80, 47, { gap: 20, minH: 30, maxH: 60, dark: 0x0a, lit: 0x1a, trunk: 0x08, floor: 34, ground: 0x0a, raw: true });
    // Shrubbery along the paths hides the trunks.
    const rsh = GG.rng(9);
    for (let x = 0; x < 512; x += 5 + Math.floor(rsh() * 6)) {
      const rr = 4 + Math.floor(rsh() * 4);
      pk.disc(x, 46 - rr + 4, rr, 0x0a);
      pk.disc(x - 1, 46 - rr + 3, rr - 3, 0x1a, 0.5);
    }
    // Heat haze over the treetops.
    for (let y = 0; y < 50; y++) for (let x = 0; x < 512; x++) if (pk.on(x, y) && bay(x, y) < (1 - y / 50) * 0.45) pk.set(x, y, 0x38);
    const park = pk.canvas();
    const parkY = 136;
    make('plaza', [
      { img: s, still: true },
      { img: fifth, f: 0.1, y: 40, fy: 0.08, fill: 0x0a },
    ], (g, cx, cy, t) => {
      // The Park, its rows wavering in the heat.
      const y0 = Math.round(parkY - cy * 0.16);
      let x0 = -Math.round(cx * 0.22) % 512; if (x0 > 0) x0 -= 512;
      for (let row = 0; row < 80; row++) {
        const y = y0 + row;
        if (y < 0 || y >= SH) continue;
        const wob = row < 40 ? Math.round(Math.sin(t / 9 + row / 3) * (row < 20 ? 1 : 0.6)) : 0;
        for (let x = x0 + wob; x < SW; x += 512) g.drawImage(Q(park), 0, row, 512, 1, x, y, 512, 1);
      }
      if (y0 + 80 < SH) { g.fillStyle = C(BC(0x0a)); g.fillRect(0, y0 + 80, SW, SH - y0 - 80); }
    });
  }

  /* ========================================================= THE ARGONNE */
  // Night in the forest, after the shelling: broken trunks, wire on the
  // ridges, smoke, and far-off flares. When a flare is up (W.flash), the
  // rims catch its light.
  {
    const s = sky(SW, SH, [[0x0f, 0], [0x0c, 70, 40], [0x08, 150, 24]]);
    const sLit = sky(SW, SH, [[0x0f, 0], [0x0c, 36, 20], [0x00, 104, 30], [0x10, 170, 16]]);
    // Far ridge with distant fires glowing.
    const ridgeLayer = (lit) => {
      const b = buf(512, 80);
      const rr = ridge(512, 61, 0, 18, 0.6);
      for (let x = 0; x < 512; x++) {
        const top = 24 + rr[x];
        for (let y = top; y < 80; y++) b.set(x, y, y === top ? (lit ? 0x10 : 0x08) : 0x0f);
      }
      // Posts and wire along the crest.
      for (let x = 8; x < 512; x += 22) {
        const top = 24 + rr[x];
        for (let k = 0; k < 9; k++) b.setw(x, top - k, lit ? 0x00 : 0x0f);
        b.setw(x, top - 9, lit ? 0x10 : 0x08);
        const nx = x + 22, ntop = 24 + rr[nx % 512];
        for (let i = 0; i < 22; i++) {
          const yy = Math.round(top - 7 + ((ntop - top) * i) / 22 + ((i % 4) < 2 ? 0 : 1));
          b.setw(x + i, yy, lit ? 0x00 : 0x2d);
          if (i % 5 === 2) b.setw(x + i, yy - 1, lit ? 0x10 : 0x00);
        }
      }
      return b.canvas();
    };
    const treeLayer = (lit) => {
      const b = buf(512, 150);
      const r = GG.rng(71);
      for (let x = 6; x < 512; x += 22 + Math.floor(r() * 44)) {
        const th = 40 + Math.floor(r() * 100), tw = 4 + Math.floor(r() * 4);
        const jag = [0, 1, 2, 3].map(() => Math.floor(r() * 12));
        for (let y = 150 - th - 12; y < 150; y++) for (let k = 0; k < tw; k++) {
          // A splintered top: each strip of the trunk broke off at its own height.
          if (y < 150 - th + jag[k % 4] - (k === 1 ? 10 : 0)) continue;
          const rim = k === 0 ? (lit ? 0x10 : 0x08) : k === 1 && lit ? 0x00 : 0x0f;
          b.setw(x + k, y, rim);
        }
        // Stubs of branch, some hanging.
        const nb = 1 + Math.floor(r() * 3);
        for (let i = 0; i < nb; i++) {
          const by = 150 - th + 10 + Math.floor(r() * th * 0.5), dir = r() < 0.5 ? -1 : 1, len = 6 + Math.floor(r() * 12);
          const droop = r() < 0.3;
          for (let k = 0; k < len; k++) {
            const yy = by - (droop ? -Math.floor(k * k / 12) : Math.floor(k / 2));
            b.setw(x + (dir > 0 ? tw : -1) + dir * k, yy, 0x0f);
            b.setw(x + (dir > 0 ? tw : -1) + dir * k, yy - 1, lit ? 0x00 : 0x0f);
          }
        }
      }
      return b.canvas();
    };
    const far = [ridgeLayer(false), ridgeLayer(true)];
    const near = [treeLayer(false), treeLayer(true)];
    const smoke = [bank(90, 22, 0x00, 0.5), bank(60, 16, 0x2d, 0.45), bank(120, 26, 0x00, 0.4)];
    const lit = (t, W) => (flashOf(W) ? 1 : 0);
    make('argonne', [
      { img: (t, W) => (flashOf(W) ? sLit : s), still: true },
      { img: (t, W) => far[lit(t, W)], f: 0.12, y: 118, fy: 0.06, fill: 0x0f },
      { img: (t, W) => near[lit(t, W)], f: 0.3, y: 70, fy: 0.15, fill: 0x0f },
    ], (g, cx, cy, t, W) => {
      // Distant fires on the horizon.
      for (const [lx, k] of [[60, 0], [250, 1], [420, 2]]) {
        const x = Math.round(layerX(lx, cx, 0.12, 512)), y = Math.round(138 - cy * 0.06);
        const fl = (Math.floor(t / 7) + k) % 3;
        for (let yy = -6; yy <= 2; yy++) for (let xx = -10; xx <= 10; xx++) {
          const d = Math.hypot(xx, yy * 2);
          if (d < 10 && bay(x + xx, y + yy) < (1 - d / 10) * (0.5 + fl * 0.1)) px(g, x + xx, y + yy, d < 4 ? 0x17 : 0x07);
        }
      }
      // A far-off star shell drifting down every so often.
      const cyc = 260, k = t % cyc;
      if (k < 160) {
        const n = Math.floor(t / cyc), r = GG.rng(n + 3);
        const x = 20 + Math.floor(r() * 216), y = 20 + k * 0.35;
        for (let yy = -5; yy <= 5; yy++) for (let xx = -5; xx <= 5; xx++) {
          const d = Math.hypot(xx, yy);
          if (d < 5 && bay(x + xx, y + yy) < (1 - d / 5) * 0.7) px(g, x + xx, y + yy, 0x28);
        }
        px(g, x, y, 0x38); px(g, x, y - 6, 0x2d, 1, 5);
      }
      // Smoke.
      smoke.forEach((c, i) => {
        let x = Math.round(i * 180 - cx * 0.2 + t * (0.1 + i * 0.05)) % 540;
        if (x < -c.width) x += 540;
        for (let xx = x - 540; xx < SW; xx += 540) if (xx + c.width > 0) g.drawImage(Q(c), xx, Math.round(96 + i * 22 - cy * 0.1));
      });
    });
  }

  /* ============================================================== THE BAY */
  // The last night: the Sound under the moon, the lights of East Egg low
  // across it, the water running back the way he came.
  {
    const s = sky(SW, SH, [[0x0f, 0], [0x02, 56, 28], [0x03, 116, 12]]);
    const sg = s.getContext('2d');
    stars(sg, SW, 112, 19, 80, [0x30, 0x10, 0x21, 0x31, 0x00, 0x30]);
    // A halo, then the moon.
    for (let y = 0; y < 80; y++) for (let x = 0; x < 110; x++) {
      const d = Math.hypot(x - 56, y - 38);
      if (d > 12 && d < 30 && bay(x, y) < (1 - (d - 12) / 18) * 0.45) px(sg, x, y, 0x03);
    }
    moon(sg, 56, 38, 11);
    // East Egg across the water: a long low shore, a few windows lit.
    const eb = buf(768, 26);
    const er = ridge(1024, 47, 0, 5, 0.5);
    for (let x = 0; x < 768; x++) for (let y = 14 + er[x]; y < 26; y++) eb.set(x, y, y === 14 + er[x] ? 0x0c : 0x0f);
    const re = GG.rng(53);
    for (let i = 0; i < 26; i++) {
      const x = Math.floor(re() * 768), rr = 2 + Math.floor(re() * 4);
      eb.disc(x, 14 + er[x] - rr + 3, rr, 0x0f);
    }
    for (let i = 0; i < 9; i++) {
      const x = Math.floor(re() * 740), y = 13 + er[x];
      eb.rectw(x, y - 6, 9 + Math.floor(re() * 8), 7, 0x0f);
      for (let k = 0; k < 3; k++) if (re() < 0.6) eb.setw(x + 2 + k * 3, y - 3, re() < 0.3 ? 0x38 : 0x28);
    }
    const shore = eb.canvas();
    const sea = water(512, 100, 63, [[0x02, 0], [0x0f, 64, 20]], [[0x12, 50], [0x11, 26], [0x21, 12], [0x03, 50]]);
    const mists = [bank(140, 14, 0x10, 0.25), bank(90, 10, 0x10, 0.2), bank(180, 18, 0x00, 0.3)];
    make('bay', [
      { img: s, still: true },
      { img: shore, f: 0.06, y: 108, fy: 0.03 },
      { img: sea, f: 0.12, y: 132, fy: 0.06, fill: 0x0f, drift: 0.12 },
    ], (g, cx, cy, t) => {
      // The moon's path on the water, broken up by the swell.
      const y0 = Math.round(132 - cy * 0.06);
      for (let i = 0; i < 12; i++) {
        const y = y0 + 3 + i * 5, wdt = 2 + Math.floor(i * 0.8);
        const off = Math.round(Math.sin(t / 18 + i * 1.7) * 2) - ((t >> 4) % 3);
        if ((i + (t >> 5)) % 4 === 0) continue;
        px(g, 56 - Math.floor(wdt / 2) + off, y, i < 3 ? 0x30 : 0x10, wdt, 1);
      }
      // Mist lying on the water, sliding back with the current.
      mists.forEach((c, i) => {
        let x = Math.round(i * 200 - cx * (0.2 + i * 0.06) - t * (0.15 + i * 0.05)) % 600;
        if (x < -c.width) x += 600;
        for (let xx = x - 600; xx < SW + 600; xx += 600) if (xx + c.width > 0 && xx < SW) g.drawImage(Q(c), xx, Math.round(124 + i * 16 - cy * 0.08));
      });
    });
  }
})();

/*
 * Rooms: interiors painted behind the tiles (a stage lists them as
 * [x0, y0, x1, y1, style] in tile units), so a cutaway house shows its walls
 * rather than the sky. Built once per stage on the stage's own back layer.
 */
(() => {
  const R = (g, x, y, w, h, col) => GG.rect(g, Math.round(x), Math.round(y), Math.round(w), Math.round(h), col);
  const dither = (g, x, y, w, h, a, b, level) => {
    R(g, x, y, w, h, a);
    g.fillStyle = GG.color(b);
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if (GG.bayer(x + i, y + j) < level) g.fillRect(x + i, y + j, 1, 1);
  };
  GG.ROOMS = {
    // "A bright rosy-colored space": rose walls, white wainscot and cornice.
    rose(g, x, y, w, h) {
      dither(g, x, y, w, h, 0x36, 0x26, 0.18);
      for (let i = x + 24; i < x + w; i += 48) { R(g, i, y + 6, 1, h - 30, 0x26); R(g, i + 1, y + 6, 1, h - 30, 0x30); }
      R(g, x, y, w, 4, 0x30); R(g, x, y + 4, w, 1, 0x10);
      R(g, x, y + h - 24, w, 24, 0x30); R(g, x, y + h - 24, w, 1, 0x10); R(g, x, y + h - 20, w, 1, 0x10);
      for (let i = x + 8; i < x + w; i += 24) R(g, i, y + h - 16, 14, 1, 0x10);
    },
    // "A high Gothic library, panelled with carved English oak."
    library(g, x, y, w, h) {
      R(g, x, y, w, h, 0x07);
      for (let i = x; i < x + w; i += 32) {
        R(g, i, y, 2, h, 0x08);
        for (let j = y + 12; j < y + h - 30; j += 44) {
          R(g, i + 6, j + 6, 20, 30, 0x08);
          R(g, i + 7, j + 7, 18, 28, 0x0f);
          // A pointed arch over each panel.
          for (let k = 0; k < 6; k++) R(g, i + 7 + k * 1.5, j + 6 - k, 18 - k * 3, 1, 0x08);
          R(g, i + 8, j + 9, 1, 24, 0x17);
        }
      }
      R(g, x, y, w, 3, 0x17);
    },
    // Cream and gilt at the Plaza.
    plaza(g, x, y, w, h) {
      dither(g, x, y, w, h, 0x37, 0x27, 0.12);
      if (h > 40) {
        for (let i = x + 6; i + 36 < x + w; i += 48) {
          R(g, i, y + 8, 36, 1, 0x28); R(g, i, y + h - 26, 36, 1, 0x28);
          R(g, i, y + 8, 1, h - 34, 0x28); R(g, i + 35, y + 8, 1, h - 34, 0x28);
        }
      }
      R(g, x, y + h - 14, w, 14, 0x17); R(g, x, y + h - 14, w, 1, 0x28);
    },
    // The light well: soot-dark brick.
    well(g, x, y, w, h) {
      R(g, x, y, w, h, 0x07);
      for (let j = 0; j < h; j += 8) {
        R(g, x, y + j, w, 1, 0x0f);
        for (let i = ((j / 8) % 2) * 8; i < w; i += 16) R(g, x + i, y + j, 1, 8, 0x0f);
      }
    },
  };
})();
