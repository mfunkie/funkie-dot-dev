'use strict';
/*
 * GATSBY.EXE: core. Palette, constants, tile kinds, the level compiler and the
 * heroes' physics. Nothing in here touches the DOM, so the stage solver (which
 * proves every stage can be finished) runs the exact same code in node.
 */
var GG = (typeof globalThis !== 'undefined' ? globalThis : window).GG || {};
(typeof globalThis !== 'undefined' ? globalThis : window).GG = GG;

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
  GG.NES = NES;
  GG.W = 256;
  GG.H = 224;
  GG.T = 16;

  /* What a tile does. Art is separate: a tile has a kind and a picture. */
  const K = {
    EMPTY: 0,
    SOLID: 1,
    ONEWAY: 2,   // stand on it from above, pass through from below
    SPIKE: 3,    // hurts from any side, not solid
    LADDER: 4,
    WATER: 5,
    ICE: 6,      // solid and slippery (a polished ballroom floor)
    BREAK: 7,    // solid until something heavy lands on it
    DEATH: 8,    // instant fall (the Sound, the river, the road far below)
  };
  GG.K = K;
  GG.isSolid = (k) => k === K.SOLID || k === K.ICE || k === K.BREAK;

  /* -------------------------------------------------------------- levels */
  GG.stages = [];
  GG.tilesets = {};
  GG.stage = (def) => { GG.stages.push(def); return def; };
  GG.tileset = (name, def) => { GG.tilesets[name] = def; return def; };

  /*
   * A stage's map is rows of characters. Its legend (merged over the tileset's
   * and the global entity legend) says what each character is: a terrain name
   * from the tileset, or { e: 'type', ...props } for something that moves.
   */
  GG.ENTITY_LEGEND = {
    P: { e: 'start' },
    K: { e: 'checkpoint' },
    G: { e: 'goal' },
    '*': { e: 'item' },
    '+': { e: 'orange' },
  };

  GG.compile = (stage) => {
    const ts = GG.tilesets[stage.tileset];
    if (!ts) throw new Error(`no tileset ${stage.tileset} for ${stage.key}`);
    const legend = Object.assign({}, GG.ENTITY_LEGEND, ts.legend || {}, stage.legend || {});
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

  GG.kindAt = (lv, tx, ty) => {
    if (tx < 0 || tx >= lv.w) return K.SOLID;    // the stage's sides are walls
    if (ty < 0) return lv.roof ? K.SOLID : K.EMPTY;
    if (ty >= lv.h) return K.EMPTY;              // falling out is a death
    return lv.kind[ty * lv.w + tx];
  };
  GG.setKind = (lv, tx, ty, k, terr = null) => {
    if (tx < 0 || ty < 0 || tx >= lv.w || ty >= lv.h) return;
    lv.kind[ty * lv.w + tx] = k;
    lv.terr[ty * lv.w + tx] = terr;
  };

  /* ------------------------------------------------------------- physics */
  /*
   * Bodies move in sub-pixels at a fixed 60 steps a second. Horizontal first,
   * then vertical, each resolved against the tile grid. `extra` is a list of
   * moving things (boxes) that act as one-way floors: platforms, boats, the
   * car, falling shirts.
   */
  const EPS = 0.001;
  function overlapTiles(b, fn) {
    const x0 = Math.floor(b.x / 16), x1 = Math.floor((b.x + b.w - EPS) / 16);
    const y0 = Math.floor(b.y / 16), y1 = Math.floor((b.y + b.h - EPS) / 16);
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) if (fn(tx, ty)) return true;
    return false;
  }
  GG.overlapTiles = overlapTiles;

  /* Move sideways by dx against the tiles; returns the wall's side if one stopped it. */
  GG.moveX = (b, lv, dx) => {
    b.x += dx;
    if (dx === 0) return 0;
    const dir = Math.sign(dx);
    const edge = dir > 0 ? b.x + b.w - EPS : b.x;
    const tx = Math.floor(edge / 16);
    const y0 = Math.floor(b.y / 16), y1 = Math.floor((b.y + b.h - EPS) / 16);
    for (let ty = y0; ty <= y1; ty++) {
      if (GG.isSolid(GG.kindAt(lv, tx, ty))) {
        b.x = dir > 0 ? tx * 16 - b.w : (tx + 1) * 16;
        b.hitWall = dir;
        return dir;
      }
    }
    return 0;
  };

  GG.moveBody = (b, lv, extra) => {
    b.hitWall = 0; b.hitHead = false;
    const wasGround = b.onGround;
    b.onGround = false; b.onIce = false; b.riding = null;

    // X
    if (GG.moveX(b, lv, b.vx)) b.vx = 0;

    // Y
    const oldBottom = b.y + b.h;
    b.y += b.vy;
    const x0 = Math.floor(b.x / 16), x1 = Math.floor((b.x + b.w - EPS) / 16);
    if (b.vy > 0) {
      const ty = Math.floor((b.y + b.h - EPS) / 16);
      for (let tx = x0; tx <= x1; tx++) {
        const k = GG.kindAt(lv, tx, ty);
        const top = ty * 16;
        const oneway = k === K.ONEWAY || (k === K.LADDER && GG.kindAt(lv, tx, ty - 1) !== K.LADDER && !b.climbDown);
        if (GG.isSolid(k) || (oneway && oldBottom <= top + EPS)) {
          b.y = top - b.h; b.vy = 0; b.onGround = true;
          if (k === K.ICE) b.onIce = true;
          break;
        }
      }
      if (!b.onGround && extra) {
        for (const p of extra) {
          if (!p.solid) continue;
          if (b.x + b.w <= p.x || b.x >= p.x + p.w) continue;
          // `step` lets him walk up onto a slightly higher one (the car's terraces).
          if (oldBottom <= p.y + EPS + Math.max(0, p.dy || 0) + (p.step || 0) && b.y + b.h >= p.y) {
            b.y = p.y - b.h; b.vy = 0; b.onGround = true; b.riding = p;
            if (p.ice) b.onIce = true;
            break;
          }
        }
      }
    } else if (b.vy < 0) {
      const ty = Math.floor(b.y / 16);
      for (let tx = x0; tx <= x1; tx++) {
        if (GG.isSolid(GG.kindAt(lv, tx, ty))) {
          b.y = (ty + 1) * 16; b.vy = 0; b.hitHead = true; b.headTile = [tx, ty];
          break;
        }
      }
    } else if (wasGround) {
      // Standing still: probe one pixel down so onGround stays true.
      const ty = Math.floor((b.y + b.h + 0.5) / 16);
      for (let tx = x0; tx <= x1; tx++) {
        const k = GG.kindAt(lv, tx, ty);
        const oneway = k === K.ONEWAY || (k === K.LADDER && GG.kindAt(lv, tx, ty - 1) !== K.LADDER);
        if ((GG.isSolid(k) || oneway) && Math.abs(b.y + b.h - ty * 16) < 0.6) {
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
   * Hero tuning, in pixels and frames at 60 a second. docs/gatsby/feel.md has
   * the targets and why; scripts/gatsby/feel.ts measures these against them.
   *
   * Nick is carried along by other people's momentum, so he moves like Super
   * Mario: he builds up speed and skids when he turns, keeps his momentum in
   * the air, rises slowly while A is held and falls three and a half times as
   * hard, jumps a little higher at full speed, and falls no faster than 4.5.
   *
   * Young Jimmy Gatz kept a schedule ("Dumbell exercise and wall-scaling
   * 6:15-6:30") and so, grown up, does Gatsby: the Gatz heroes move like Mega
   * Man, who goes where he's pointed. No slide, an even arc, a steady speed in
   * the air (a little under his running speed). Letting go of A cuts the rise
   * short. Both can kick off walls.
   */
  const NICK = {
    w: 10, h: 22, run: 1.6, accel: 0.075, decel: 0.13, skid: 0.26, air: 0.075, airDrift: true,
    jump: 3.9, runJump: 1.055, gHold: 0.138, gFall: 0.48, maxFall: 4.5, climb: 1.0, swim: 1.15,
  };
  const GATZ = {
    w: 10, h: 22, run: 1.75, accel: 0.45, decel: 0.45, skid: 0.45, air: 0.45, airRun: 0.95,
    jump: 5.55, gHold: 0.258, gFall: 0.258, cut: 1.5, minRise: 3, maxFall: 6, climb: 1.2, swim: 1.3,
    wall: true, slide: 1.1, wallKick: 1.7, wallLock: 9, wallJump: 4.8,
  };
  GG.HEROES = {
    nick: Object.assign({ throws: 'bond' }, NICK),
    jimmy: Object.assign({ throws: 'clam' }, GATZ),
    gatsby: Object.assign({ throws: 'card' }, GATZ),
    major: Object.assign({ throws: 'card' }, GATZ),
  };

  GG.makeHero = (type, x, y) => {
    const s = GG.HEROES[type];
    return {
      type, s, w: s.w, h: s.h,
      x: x + 8 - s.w / 2, y: y + 16 - s.h,
      vx: 0, vy: 0, face: 1,
      onGround: false, onIce: false, onLadder: false, inWater: false,
      coyote: 0, buffer: 0, jumping: false, jumpT: 0, sliding: 0, wallLock: 0, wallGrace: 0, wallDir: 0,
    };
  };

  const inKind = (b, lv, k, inset = 0) => {
    const box = { x: b.x + inset, y: b.y + inset, w: b.w - inset * 2, h: b.h - inset * 2 };
    return overlapTiles(box, (tx, ty) => GG.kindAt(lv, tx, ty) === k);
  };
  GG.inKind = inKind;

  /* Which side (if any) has a wall right against the body: -1, 1 or 0. */
  GG.wallSide = (b, lv) => {
    const probe = (x) => overlapTiles({ x, y: b.y + 4, w: 1, h: b.h - 8 }, (tx, ty) => GG.isSolid(GG.kindAt(lv, tx, ty)));
    if (probe(b.x + b.w + 0.5)) return 1;
    if (probe(b.x - 1.5)) return -1;
    return 0;
  };

  /*
   * One step of the hero. `inp` is { l, r, u, d, jump (held), jumpHit (this
   * step) }. `mods` can scale speed and jump and push the hero sideways (the
   * current in the Sound, the wind off Lake Superior, an electric fan).
   * Returns events the game reacts to (sounds, dust).
   */
  GG.heroStep = (h, inp, lv, extra, mods) => {
    const s = h.s;
    const ev = [];
    mods = mods || {};
    let dir = (inp.r ? 1 : 0) - (inp.l ? 1 : 0);

    h.inWater = inKind(h, lv, K.WATER, 3);
    const onLadderTile = overlapTiles({ x: h.x + h.w / 2 - 1, y: h.y + 2, w: 2, h: h.h - 2 }, (tx, ty) => GG.kindAt(lv, tx, ty) === K.LADDER);
    const ladderBelow = overlapTiles({ x: h.x + h.w / 2 - 1, y: h.y + h.h, w: 2, h: 2 }, (tx, ty) => GG.kindAt(lv, tx, ty) === K.LADDER);

    // Grab a ladder with up (or down from the top of one).
    if (!h.onLadder && ((inp.u && onLadderTile) || (inp.d && ladderBelow && h.onGround))) {
      h.onLadder = true; h.vx = 0; h.vy = 0; h.sliding = 0;
      const lx = Math.floor((h.x + h.w / 2) / 16) * 16;
      h.x = lx + 8 - h.w / 2;
    }
    if (h.onLadder && !onLadderTile && !ladderBelow) h.onLadder = false;

    if (inp.jumpHit) h.buffer = 6; else if (h.buffer > 0) h.buffer--;
    if (dir) h.face = dir;

    if (h.onLadder) {
      h.vx = 0;
      h.vy = inp.u ? -s.climb : inp.d ? s.climb : 0;
      h.climbDown = inp.d;
      if (h.buffer > 0 && !inp.u) {
        h.onLadder = false; h.buffer = 0;
        h.vy = -s.jump * 0.75; h.jumping = true; h.vx = dir * s.run;
        ev.push('jump');
      }
      GG.moveBody(h, lv, extra);
      if (h.onGround && inp.d && !ladderBelow) h.onLadder = false;
      if (!onLadderTile && h.vy < 0) h.onLadder = false;
      h.climbDown = false;
      return ev;
    }

    // Just kicked off a wall: for a few frames the stick can't pull you back.
    if (h.wallLock > 0) { h.wallLock--; if (dir === h.wallDir) dir = 0; }

    // Run. On the ground: speed up, slow down, or skid when the stick is
    // pushed against the way he's going. In the air Nick only changes speed
    // when steered; the Gatz heroes go where the stick points.
    const run = s.run * (mods.speed || 1) * (h.onGround || h.inWater ? 1 : s.airRun || 1);
    const target = dir * run;
    let a;
    if (h.onGround) a = !dir ? s.decel : h.vx * dir < 0 ? s.skid || s.decel : s.accel;
    else a = !dir && s.airDrift ? 0 : s.air;
    if (h.onIce && h.onGround) a *= 0.22;
    if (h.inWater) a *= 0.7;
    if (h.wallLock > 0 && !dir) a = 0;   // keep the kick's momentum
    if (h.vx < target) h.vx = Math.min(target, h.vx + a);
    else if (h.vx > target) h.vx = Math.max(target, h.vx - a);
    if (h.inWater) h.vx = Math.max(-s.swim, Math.min(s.swim, h.vx));

    // Walls: slide down one you're pushing against; jump to kick off it.
    const wall = s.wall && !h.onGround && !h.inWater ? GG.wallSide(h, lv) : 0;
    if (wall) { h.wallGrace = 5; h.wallSeen = wall; } else if (h.wallGrace > 0) h.wallGrace--;
    h.sliding = wall && dir === wall && h.vy > 0 ? wall : 0;

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
        // At (nearly) full speed a running jump goes a little higher, as in SMB.
        const fast = s.runJump && Math.abs(h.vx) >= s.run * 0.7;
        h.vy = -s.jump * (fast ? s.runJump : 1) * (mods.jump || 1);
        h.coyote = 0; h.buffer = 0; h.jumping = true; h.jumpT = 0;
        ev.push('jump');
      } else if (h.buffer > 0 && s.wall && h.wallGrace > 0 && !h.onGround) {
        const side = h.wallSeen;
        h.vy = -s.wallJump; h.vx = -side * s.wallKick; h.face = -side;
        h.wallDir = side; h.wallLock = s.wallLock; h.wallGrace = 0;
        h.buffer = 0; h.jumping = true; h.jumpT = 0; h.sliding = 0;
        ev.push('walljump');
      }
      // Letting go of A: Nick's rise gets heavier; a Gatz hero's is cut short.
      if (h.jumping) h.jumpT++;
      if (s.cut && h.jumping && !inp.jump && h.jumpT > s.minRise && h.vy < -s.cut) h.vy = -s.cut;
      const g = (h.vy < 0 && inp.jump && h.jumping) ? s.gHold : s.gFall;
      h.vy = Math.min(h.sliding ? s.slide : s.maxFall, h.vy + g);
    }
    // A push rides along with the step so walls still stop it.
    const push = mods.push || 0;
    const own = h.vx;
    h.vx += push;
    const wasGround = h.onGround;
    const vyBefore = h.vy;
    GG.moveBody(h, lv, extra);
    if (!h.hitWall) h.vx -= push;
    // Pressed to a wall by the push while heading away from it: the wall stops
    // the push, not his own speed (else a current pins him there for good).
    else if (own * (own + push) < 0) h.vx = own;
    // Carried by whatever he stands on, but a wall still scrapes him off it.
    if (h.riding && h.riding.dx) GG.moveX(h, lv, h.riding.dx);
    if (!wasGround && h.onGround && vyBefore > 2.5) ev.push('land');
    h.t = (h.t || 0) + 1;
    if (h.sliding && h.t % 6 === 0) ev.push('slide');
    return ev;
  };

  /* Small shared helpers. */
  GG.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  GG.hit = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  GG.rng = (seed) => () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  /*
   * The game's one source of chance. Everything that plays out (enemies,
   * shells, particles) draws from it, and a recorded run stores its seed, so
   * replaying the same inputs replays the same run.
   */
  let rand = GG.rng(1925);
  GG.seed = (n) => { GG.seedValue = n >>> 0; rand = GG.rng(GG.seedValue); };
  GG.rand = () => rand();
  GG.seed(1925);
})();
