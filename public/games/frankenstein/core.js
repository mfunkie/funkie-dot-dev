'use strict';
/*
 * FRANKEN.EXE: core. Palette, constants, tile kinds, the level compiler and the
 * hero's physics. Nothing in here touches the DOM, so the stage solver
 * (which proves every stage can be finished) runs the exact same code in node.
 */
var FK = (typeof globalThis !== 'undefined' ? globalThis : window).FK || {};
(typeof globalThis !== 'undefined' ? globalThis : window).FK = FK;

(() => {
  /* The 2C02 palette, by NES color code. Every pixel in the game is one of these. */
  const NES = [
    '#7c7c7c', '#0000fc', '#0000bc', '#4428bc', '#940084', '#a80020', '#a81000', '#881400',
    '#503000', '#007800', '#006800', '#005800', '#004058', '#000000', '#000000', '#000000',
    '#bcbcbc', '#0078f8', '#0058f8', '#6844fc', '#d800cc', '#e40058', '#f83800', '#e45c10',
    '#ac7c00', '#00b800', '#00a800', '#00a844', '#008888', '#000000', '#000000', '#000000',
    '#f8f8f8', '#3cbcfc', '#6888fc', '#9878f8', '#f878f8', '#f85898', '#f87858', '#fca044',
    '#f8b800', '#b8f818', '#58d854', '#58f898', '#00e8d8', '#787878', '#000000', '#000000',
    '#fcfcfc', '#a4e4fc', '#b8b8f8', '#d8b8f8', '#f8b8f8', '#f8a4c0', '#f0d0b0', '#fce0a8',
    '#f8d878', '#d8f878', '#b8f8b8', '#b8f8d8', '#00fcfc', '#f8d8f8', '#000000', '#000000',
  ];
  FK.NES = NES;
  FK.W = 256;
  FK.H = 224;
  FK.T = 16;

  /* What a tile does. Art is separate: a tile has a kind and a picture. */
  const K = {
    EMPTY: 0,
    SOLID: 1,
    ONEWAY: 2,   // stand on it from above, pass through from below
    SPIKE: 3,    // hurts from any side, not solid
    LADDER: 4,
    WATER: 5,
    ICE: 6,      // solid and slippery
    BREAK: 7,    // solid until the Creature punches it
    DEATH: 8,    // instant fall (bottomless water, chasm)
  };
  FK.K = K;
  FK.isSolid = (k) => k === K.SOLID || k === K.ICE || k === K.BREAK;

  /* -------------------------------------------------------------- levels */
  FK.stages = [];
  FK.tilesets = {};
  FK.stage = (def) => { FK.stages.push(def); return def; };
  FK.tileset = (name, def) => { FK.tilesets[name] = def; return def; };

  /*
   * A stage's map is rows of characters. Its legend (merged over the tileset's
   * and the global entity legend) says what each character is: a terrain name
   * from the tileset, or { e: 'type', ...props } for something that moves.
   */
  FK.ENTITY_LEGEND = {
    P: { e: 'start' },
    C: { e: 'checkpoint' },
    G: { e: 'goal' },
    '*': { e: 'item' },
    '+': { e: 'heart' },
  };

  FK.compile = (stage) => {
    const ts = FK.tilesets[stage.tileset];
    if (!ts) throw new Error(`no tileset ${stage.tileset} for ${stage.key}`);
    const legend = Object.assign({}, FK.ENTITY_LEGEND, ts.legend || {}, stage.legend || {});
    const rows = stage.map;
    const h = rows.length;
    const w = Math.max(...rows.map((r) => r.length));
    const kind = new Uint8Array(w * h);
    const terr = new Array(w * h).fill(null);   // terrain name per cell
    const ents = [];
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const ch = rows[y][x] || '.';
        if (ch === '.' || ch === ' ') continue;
        const L = legend[ch];
        if (!L) throw new Error(`${stage.key}: unknown map char '${ch}' at ${x},${y}`);
        if (typeof L === 'string' || L.t) {
          const name = typeof L === 'string' ? L : L.t;
          const t = ts.terrain[name];
          if (!t) throw new Error(`${stage.key}: tileset ${stage.tileset} has no terrain '${name}'`);
          terr[y * w + x] = name;
          kind[y * w + x] = t.kind;
          if (L.e) ents.push(Object.assign({ x: x * 16, y: y * 16, cx: x, cy: y }, L));
        } else {
          ents.push(Object.assign({ x: x * 16, y: y * 16, cx: x, cy: y }, L));
          // An entity can sit on a terrain cell too (an under: 'name').
          if (L.under) { terr[y * w + x] = L.under; kind[y * w + x] = ts.terrain[L.under].kind; }
        }
      }
    }
    const start = ents.find((e) => e.e === 'start');
    if (!start) throw new Error(`${stage.key}: no start`);
    return { stage, ts, w, h, kind, terr, ents, start, pw: w * 16, ph: h * 16 };
  };

  FK.kindAt = (lv, tx, ty) => {
    if (tx < 0 || tx >= lv.w) return K.SOLID;    // the stage's sides are walls
    if (ty < 0) return K.EMPTY;                  // open above
    if (ty >= lv.h) return K.EMPTY;              // and below: falling out is a death
    return lv.kind[ty * lv.w + tx];
  };
  FK.setKind = (lv, tx, ty, k, terr = null) => {
    if (tx < 0 || ty < 0 || tx >= lv.w || ty >= lv.h) return;
    lv.kind[ty * lv.w + tx] = k;
    lv.terr[ty * lv.w + tx] = terr;
  };

  /* ------------------------------------------------------------- physics */
  /*
   * Bodies move in sub-pixels at a fixed 60 steps a second. Horizontal first,
   * then vertical, each resolved against the tile grid. `extra` is a list of
   * moving or crumbling platforms (boxes) that act as one-way floors.
   */
  const EPS = 0.001;
  function overlapTiles(b, fn) {
    const x0 = Math.floor(b.x / 16), x1 = Math.floor((b.x + b.w - EPS) / 16);
    const y0 = Math.floor(b.y / 16), y1 = Math.floor((b.y + b.h - EPS) / 16);
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) if (fn(tx, ty)) return true;
    return false;
  }
  FK.overlapTiles = overlapTiles;

  FK.moveBody = (b, lv, extra) => {
    b.hitWall = 0; b.hitHead = false;
    const wasGround = b.onGround;
    b.onGround = false; b.onIce = false; b.riding = null;

    // X
    b.x += b.vx;
    if (b.vx !== 0) {
      const dir = Math.sign(b.vx);
      const edge = dir > 0 ? b.x + b.w - EPS : b.x;
      const tx = Math.floor(edge / 16);
      const y0 = Math.floor(b.y / 16), y1 = Math.floor((b.y + b.h - EPS) / 16);
      for (let ty = y0; ty <= y1; ty++) {
        if (FK.isSolid(FK.kindAt(lv, tx, ty))) {
          b.x = dir > 0 ? tx * 16 - b.w : (tx + 1) * 16;
          b.vx = 0; b.hitWall = dir;
          break;
        }
      }
    }

    // Y
    const oldBottom = b.y + b.h;
    b.y += b.vy;
    const x0 = Math.floor(b.x / 16), x1 = Math.floor((b.x + b.w - EPS) / 16);
    if (b.vy > 0) {
      const ty = Math.floor((b.y + b.h - EPS) / 16);
      for (let tx = x0; tx <= x1; tx++) {
        const k = FK.kindAt(lv, tx, ty);
        const top = ty * 16;
        const oneway = k === K.ONEWAY || (k === K.LADDER && FK.kindAt(lv, tx, ty - 1) !== K.LADDER && !b.climbDown);
        if (FK.isSolid(k) || (oneway && oldBottom <= top + EPS)) {
          b.y = top - b.h; b.vy = 0; b.onGround = true;
          if (k === K.ICE) b.onIce = true;
          break;
        }
      }
      if (!b.onGround && extra) {
        for (const p of extra) {
          if (!p.solid) continue;
          if (b.x + b.w <= p.x || b.x >= p.x + p.w) continue;
          if (oldBottom <= p.y + EPS + Math.max(0, p.dy || 0) && b.y + b.h >= p.y) {
            b.y = p.y - b.h; b.vy = 0; b.onGround = true; b.riding = p;
            if (p.ice) b.onIce = true;
            break;
          }
        }
      }
    } else if (b.vy < 0) {
      const ty = Math.floor(b.y / 16);
      for (let tx = x0; tx <= x1; tx++) {
        if (FK.isSolid(FK.kindAt(lv, tx, ty))) {
          b.y = (ty + 1) * 16; b.vy = 0; b.hitHead = true; b.headTile = [tx, ty];
          break;
        }
      }
    } else if (wasGround) {
      // Standing still: probe one pixel down so onGround stays true.
      const ty = Math.floor((b.y + b.h + 0.5) / 16);
      for (let tx = x0; tx <= x1; tx++) {
        const k = FK.kindAt(lv, tx, ty);
        const oneway = k === K.ONEWAY || (k === K.LADDER && FK.kindAt(lv, tx, ty - 1) !== K.LADDER);
        if ((FK.isSolid(k) || oneway) && Math.abs(b.y + b.h - ty * 16) < 0.6) {
          b.onGround = true; if (k === K.ICE) b.onIce = true; break;
        }
      }
      if (!b.onGround && extra) {
        for (const p of extra) {
          if (!p.solid || b.x + b.w <= p.x || b.x >= p.x + p.w) continue;
          if (Math.abs(b.y + b.h - p.y) < 0.6) { b.onGround = true; b.riding = p; if (p.ice) b.onIce = true; break; }
        }
      }
    }
  };

  /*
   * Hero tuning. Victor is a light, quick scholar; the Creature is bigger,
   * faster and jumps higher, and punches instead of throwing flasks.
   */
  FK.HEROES = {
    victor:   { w: 10, h: 22, run: 1.55, accel: 0.09, decel: 0.14, air: 0.07, jump: 4.95, gHold: 0.21, gFall: 0.55, maxFall: 5, climb: 1.0, swim: 1.1 },
    creature: { w: 12, h: 28, run: 1.95, accel: 0.10, decel: 0.16, air: 0.08, jump: 5.45, gHold: 0.22, gFall: 0.58, maxFall: 5.5, climb: 1.4, swim: 1.5 },
  };

  FK.makeHero = (type, x, y) => {
    const s = FK.HEROES[type];
    return {
      type, s, w: s.w, h: s.h,
      x: x + 8 - s.w / 2, y: y + 16 - s.h,
      vx: 0, vy: 0, face: 1,
      onGround: false, onIce: false, onLadder: false, inWater: false,
      coyote: 0, buffer: 0, jumping: false,
    };
  };

  const inKind = (b, lv, k, inset = 0) => {
    const box = { x: b.x + inset, y: b.y + inset, w: b.w - inset * 2, h: b.h - inset * 2 };
    return overlapTiles(box, (tx, ty) => FK.kindAt(lv, tx, ty) === k);
  };
  FK.inKind = inKind;

  /*
   * One step of the hero. `inp` is { l, r, u, d, jump (held), jumpHit (this
   * step) }. Returns events the game reacts to (sounds, dust).
   */
  FK.heroStep = (h, inp, lv, extra, mods) => {
    const s = h.s;
    const ev = [];
    mods = mods || {};
    const dir = (inp.r ? 1 : 0) - (inp.l ? 1 : 0);
    if (dir) h.face = dir;

    h.inWater = inKind(h, lv, K.WATER, 3);
    const onLadderTile = overlapTiles({ x: h.x + h.w / 2 - 1, y: h.y + 2, w: 2, h: h.h - 2 }, (tx, ty) => FK.kindAt(lv, tx, ty) === K.LADDER);
    const ladderBelow = overlapTiles({ x: h.x + h.w / 2 - 1, y: h.y + h.h, w: 2, h: 2 }, (tx, ty) => FK.kindAt(lv, tx, ty) === K.LADDER);

    // Grab a ladder with up (or down from the top of one).
    if (!h.onLadder && ((inp.u && onLadderTile) || (inp.d && ladderBelow && h.onGround))) {
      h.onLadder = true; h.vx = 0; h.vy = 0;
      const lx = Math.floor((h.x + h.w / 2) / 16) * 16;
      h.x = lx + 8 - h.w / 2;
    }
    if (h.onLadder) {
      if (!onLadderTile && !ladderBelow) h.onLadder = false;
    }

    if (h.jumpHitLatched === undefined) h.jumpHitLatched = false;
    if (inp.jumpHit) h.buffer = 6; else if (h.buffer > 0) h.buffer--;

    if (h.onLadder) {
      h.vx = 0;
      h.vy = inp.u ? -s.climb : inp.d ? s.climb : 0;
      h.climbDown = inp.d;
      if (h.buffer > 0 && !inp.u) {
        h.onLadder = false; h.buffer = 0;
        h.vy = -s.jump * 0.75; h.jumping = true; h.vx = dir * s.run;
        ev.push('jump');
      }
      FK.moveBody(h, lv, extra);
      if (h.onGround && !inp.u && !inp.d) {}
      if (h.onGround && inp.d && !ladderBelow) h.onLadder = false;
      if (!onLadderTile && h.vy < 0) { h.onLadder = false; }
      h.climbDown = false;
      return ev;
    }

    // Run.
    const run = s.run * (mods.speed || 1);
    const target = dir * run;
    let a = h.onGround ? (dir ? s.accel : s.decel) : s.air;
    if (h.onIce && h.onGround) a *= 0.22;
    if (h.inWater) a *= 0.7;
    if (h.vx < target) h.vx = Math.min(target, h.vx + a);
    else if (h.vx > target) h.vx = Math.max(target, h.vx - a);
    if (h.inWater) h.vx = Math.max(-s.swim, Math.min(s.swim, h.vx));

    // Jump, with a little forgiveness on both sides of the ledge.
    if (h.onGround) { h.coyote = 6; h.jumping = false; } else if (h.coyote > 0) h.coyote--;
    if (h.inWater) {
      if (h.buffer > 0) {
        h.buffer = 0;
        // Out of the water at the surface gets a full jump, under it a stroke.
        const surf = !inKind({ x: h.x, y: h.y - 6, w: h.w, h: 6 }, lv, K.WATER);
        h.vy = surf ? -s.jump * 0.92 : -2.4;
        ev.push(surf ? 'jump' : 'swim');
      }
      h.vy += inp.jump ? 0.08 : 0.12;
      h.vy = Math.min(h.vy, 1.4);
    } else {
      if (h.buffer > 0 && h.coyote > 0) {
        h.vy = -s.jump * (mods.jump || 1); h.coyote = 0; h.buffer = 0; h.jumping = true;
        ev.push('jump');
      }
      const g = (h.vy < 0 && inp.jump && h.jumping) ? s.gHold : s.gFall;
      h.vy = Math.min(s.maxFall, h.vy + g);
    }

    const wasGround = h.onGround;
    const vyBefore = h.vy;
    FK.moveBody(h, lv, extra);
    if (h.riding) { h.x += h.riding.dx || 0; }
    if (!wasGround && h.onGround && vyBefore > 2.5) ev.push('land');
    return ev;
  };

  /* Small shared helpers. */
  FK.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  FK.hit = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  FK.rng = (seed) => () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
})();
