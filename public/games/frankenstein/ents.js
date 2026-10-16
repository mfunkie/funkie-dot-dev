'use strict';
/*
 * FRANKEN.EXE: things that move. Each type is a small definition with init,
 * update and draw; FK.spawn makes one from a map marker or from code.
 */
(() => {
  const DEF = (FK.DEF = {});
  FK.ent = (type, d) => { DEF[type] = d; return d; };

  FK.spawn = (type, x, y, props = {}) => {
    const d = DEF[type];
    if (!d) { console.warn('no entity type', type); return null; }
    const e = Object.assign({ type, x, y, w: d.w || 16, h: d.h || 16, vx: 0, vy: 0, t: 0, face: -1, hp: d.hp || 1, z: d.z || 0 }, props);
    e.type = type;
    // Map markers give the cell's top-left; stand ground things on the cell floor.
    if (props.cx !== undefined && d.floor !== false) { e.x = x + 8 - e.w / 2; e.y = y + 16 - e.h; }
    e.maxHp = e.hp;
    if (d.init) d.init(e, FK.world());
    const W = FK.world();
    if (W && !props.noAdd) W.ents.push(e);
    return e;
  };
  FK.update = (e, W) => { e.t++; if (e.hitT > 0) e.hitT--; const d = DEF[e.type]; if (d.update) d.update(e, W); };
  FK.draw = (e, W, g, cx, cy) => {
    const d = DEF[e.type];
    if (e.hitT > 0 && Math.floor(e.hitT / 2) % 2) return;
    if (d.draw) d.draw(e, W, g, cx, cy);
    else if (d.spr) FK.drawOn(g, d.spr, typeof d.frame === 'function' ? d.frame(e, W) : 'a', e, cx, cy, e.face > 0 === !!d.facesLeft);
  };

  /* --------------------------------------------------------- helpers */
  const H = (FK.EH = {});
  H.hero = (W) => W.hero;
  H.dx = (e, W) => (W.hero.x + W.hero.w / 2) - (e.x + e.w / 2);
  H.dy = (e, W) => (W.hero.y + W.hero.h / 2) - (e.y + e.h / 2);
  H.near = (e, W, rx, ry = 64) => Math.abs(H.dx(e, W)) < rx && Math.abs(H.dy(e, W)) < ry;

  /* Damage an enemy; returns true if it died. */
  H.damage = (e, W, n = 1, src) => {
    const d = DEF[e.type];
    if (e.hitT > 0 || e.dead || e.invincible) return false;
    e.hp -= n;
    e.hitT = d.hitFrames || 10;
    if (d.onHit) d.onHit(e, W, src);
    if (e.hp <= 0) {
      if (d.onDie) d.onDie(e, W, src);
      else H.poof(e, W);
      e.dead = true;
      return true;
    }
    W.sfx('hit');
    return false;
  };
  H.poof = (e, W, col = 0x30) => {
    W.sfx('poof');
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      W.part({ kind: 'px', x: e.x + e.w / 2, y: e.y + e.h / 2, vx: Math.cos(a) * 1.4, vy: Math.sin(a) * 1.4, t: 0, life: 16, col, s: 2 });
    }
    W.part({ kind: 'spr', spr: 'fx', frame: 'puff1', x: e.x + e.w / 2 - 8, y: e.y + e.h / 2 - 8, t: 0, life: 6 });
  };
  /*
   * The usual contact rules: land on it to stomp it (if it can be stomped),
   * otherwise it hurts. Returns 'stomp', 'hurt' or null.
   */
  H.contact = (e, W, opts = {}) => {
    const h = W.hero;
    if (W.dying || W.done) return null;
    const box = opts.box || e;
    if (!FK.hit(h, box)) return null;
    const stompable = opts.stomp !== false;
    if (stompable && h.vy > 0.5 && h.y + h.h - h.vy <= box.y + 6) {
      h.vy = W.input && FK.input.held.a ? -5.2 : -3.6;
      h.y = box.y - h.h;
      h.jumping = true;
      W.sfx('stomp');
      H.damage(e, W, opts.stompDmg || 1, 'stomp');
      return 'stomp';
    }
    if (opts.harmless) return null;
    W.hurt(e, opts.dmg || 1);
    return 'hurt';
  };
  /* Walk and turn at walls and ledges. */
  H.patrol = (e, W, speed, turnAtLedge = true) => {
    e.vx = e.face * speed;
    e.vy = Math.min(5, e.vy + 0.3);
    const lv = W.lv;
    if (turnAtLedge && e.onGround) {
      const fx = e.face > 0 ? e.x + e.w + 1 : e.x - 1;
      const below = FK.kindAt(lv, Math.floor(fx / 16), Math.floor((e.y + e.h + 2) / 16));
      if (!(FK.isSolid(below) || below === FK.K.ONEWAY || below === FK.K.LADDER)) e.face *= -1;
    }
    FK.moveBody(e, lv);
    if (e.hitWall) e.face *= -1;
    if (e.y > lv.ph + 32) e.dead = true;
  };
  H.anim = (e, frames, rate) => frames[Math.floor(e.t / rate) % frames.length];

  /* --------------------------------------------------------- pickups */
  FK.ent('item', {
    w: 12, h: 12,
    init(e) { e.baseY = e.y; e.always = false; },
    update(e, W) {
      e.y = e.baseY + Math.round(Math.sin(e.t / 14) * 2);
      if (FK.hit(W.hero, e)) {
        e.dead = true;
        W.take(e);
        if (!e.optional) W.items++;
        W.sfx('item');
        const label = e.name || W.def.itemName || 'FOUND IT';
        W.part({ kind: 'text', text: label, x: e.x + e.w / 2, y: e.y - 6, t: 0, life: 70, col: 0x28 });
        if (e.say) W.say(e.say, e.who, 200);
        if (W.def.onItem) W.def.onItem(W, e);
        for (let i = 0; i < 10; i++) W.part({ kind: 'px', x: e.x + 6, y: e.y + 6, vx: (Math.random() - 0.5) * 3, vy: -Math.random() * 3, g: 0.12, t: 0, life: 26, col: i % 2 ? 0x30 : 0x28 });
      }
    },
    draw(e, W, g, cx, cy) {
      const art = e.art || W.def.itemArt || 'tome';
      const s = FK.SPR.items[art];
      if (!s) return;
      // A glint every so often.
      FK.drawSprite(g, 'items', art, e.x + e.w / 2 - s.w / 2 - cx, e.y + e.h - s.h - cy);
      const k = e.t % 90;
      if (k < 8) FK.drawSprite(g, 'fx', k < 4 ? 'glint1' : 'glint2', e.x + e.w - 4 - cx, e.y - 4 - cy);
    },
  });

  FK.ent('heart', {
    w: 10, h: 10,
    init(e) { e.baseY = e.y; },
    update(e, W) {
      e.y = e.baseY + Math.round(Math.sin(e.t / 10) * 1.5);
      if (FK.hit(W.hero, e)) {
        e.dead = true; W.take(e);
        W.hearts = Math.min(W.maxHearts, W.hearts + 1);
        W.sfx('heart');
      }
    },
    draw(e, W, g, cx, cy) { FK.drawSprite(g, 'hud', 'heartBig', e.x - 1 - cx, e.y - 1 - cy); },
  });

  /* Checkpoints: a lamp that lights when you pass it. */
  FK.ent('checkpoint', {
    w: 16, h: 32, floor: true,
    init(e) { e.lit = false; },
    update(e, W) {
      const h = W.hero;
      if (!e.lit && h.x + h.w / 2 > e.x + 2 && Math.abs(h.y + h.h - (e.y + e.h)) < 48) {
        e.lit = true;
        W.check = { x: e.x, y: e.y + e.h - 16, items: W.items, taken: W.taken.slice() };
        W.hearts = W.maxHearts;
        W.sfx('check');
        W.part({ kind: 'text', text: 'SAVED', x: e.x + 8, y: e.y - 4, t: 0, life: 60, col: 0x30 });
      }
      if (e.lit) e.light = 40;
    },
    draw(e, W, g, cx, cy) {
      const art = W.def.checkArt || 'lamp';
      const f = e.lit ? (Math.floor(e.t / 6) % 2 ? 'on1' : 'on2') : 'off';
      FK.drawSprite(g, art, f, e.x - cx, e.y + e.h - FK.SPR[art][f].h - cy);
    },
  });

  /* The way out. Locked until every objective item is carried, if any. */
  FK.ent('goal', {
    w: 16, h: 32,
    init(e) { e.warned = 0; },
    update(e, W) {
      if (e.warned > 0) e.warned--;
      if (!FK.hit(W.hero, e) || W.done) return;
      if (W.items < W.itemsNeeded) {
        if (!e.warned) { W.say(W.def.lockedText || `FIND ALL ${W.itemsNeeded} FIRST.`, null, 120); W.sfx('locked'); e.warned = 160; }
        return;
      }
      if (e.needBoss && W.boss && !W.boss.dead) return;
      if (W.def.onGoal) { if (W.def.onGoal(W, e) === false) return; }
      W.clear();
    },
    draw(e, W, g, cx, cy) {
      const art = e.art || W.def.goalArt || 'door';
      const s = FK.SPR.goal[art];
      if (!s) return;
      const open = W.items >= W.itemsNeeded;
      const fr = FK.SPR.goal[art + (open ? '' : 'Shut')] ? art + (open ? '' : 'Shut') : art;
      FK.drawSprite(g, 'goal', fr, e.x + e.w / 2 - s.w / 2 - cx, e.y + e.h - s.h - cy);
      if (open && W.itemsNeeded && e.t % 40 < 20) FK.text(g, '^', e.x + 4 - cx, e.y - 12 - cy, 0x28);
    },
  });

  /* A sign or carving that speaks when you stand at it. */
  FK.ent('sign', {
    w: 16, h: 16, z: -1,
    update(e, W) {
      const on = FK.hit(W.hero, { x: e.x - 4, y: e.y - 16, w: e.w + 8, h: e.h + 16 });
      if (on && !e.on) { W.say(e.text, e.who, e.frames || 240); W.sfx('sign'); }
      e.on = on;
    },
    draw(e, W, g, cx, cy) {
      const art = e.art || 'sign';
      const s = FK.SPR.props[art];
      if (s) FK.drawSprite(g, 'props', art, e.x + 8 - s.w / 2 - cx, e.y + 16 - s.h - cy);
    },
  });

  /* ------------------------------------------------------ hero attacks */
  FK.ent('flask', {
    w: 6, h: 6, floor: false,
    init(e) { e.always = true; e.x -= 3; },
    update(e, W) {
      e.vy = Math.min(5, e.vy + 0.18);
      e.x += e.vx; e.y += e.vy;
      const lv = W.lv;
      const k = FK.kindAt(lv, Math.floor((e.x + 3) / 16), Math.floor((e.y + 3) / 16));
      let smash = FK.isSolid(k) || e.y > W.cam.y + 240 || k === FK.K.WATER;
      if (!smash) for (const o of W.ents) {
        if (o.foe && !o.dead && FK.hit(e, o)) { H.damage(o, W, 1, e); smash = true; break; }
      }
      if (smash) {
        e.dead = true;
        W.sfx('glass');
        for (let i = 0; i < 6; i++) W.part({ kind: 'px', x: e.x + 3, y: e.y + 3, vx: (Math.random() - 0.5) * 2.4, vy: -Math.random() * 2.2, g: 0.15, t: 0, life: 20, col: i % 2 ? 0x31 : 0x3c });
        W.part({ kind: 'spr', spr: 'fx', frame: 'fizz', x: e.x - 5, y: e.y - 5, t: 0, life: 8 });
      }
    },
    draw(e, W, g, cx, cy) { FK.drawSprite(g, 'fx', ['flask1', 'flask2', 'flask3', 'flask4'][Math.floor(e.t / 4) % 4], e.x - 1 - cx, e.y - 1 - cy, e.dir < 0); },
  });

  FK.ent('punch', {
    w: 14, h: 14, floor: false,
    init(e) { e.always = true; e.hitSet = new Set(); },
    update(e, W) {
      const h = W.hero;
      e.x = h.face > 0 ? h.x + h.w - 2 : h.x - 12;
      e.y = h.y + 6;
      if (e.t > 9) { e.dead = true; return; }
      for (const o of W.ents) {
        if (o.foe && !o.dead && !e.hitSet.has(o) && FK.hit(e, o)) { e.hitSet.add(o); H.damage(o, W, 2, e); o.vx = h.face * 2; }
      }
      // Break cracked stone.
      const lv = W.lv;
      FK.overlapTiles(e, (tx, ty) => {
        if (FK.kindAt(lv, tx, ty) === FK.K.BREAK) {
          FK.setKind(lv, tx, ty, FK.K.EMPTY, null);
          FK.rebuildCell(lv, tx, ty);
          W.sfx('crumble'); W.shake = 4;
          for (let i = 0; i < 8; i++) W.part({ kind: 'px', x: tx * 16 + 8, y: ty * 16 + 8, vx: (Math.random() - 0.5) * 3, vy: -Math.random() * 3, g: 0.2, t: 0, life: 30, col: i % 2 ? 0x2d : 0x10, s: 2 });
        }
        return false;
      });
      if (e.t === 3) W.part({ kind: 'spr', spr: 'fx', frame: 'whack', x: e.x + (h.face > 0 ? 4 : -2), y: e.y - 2, t: 0, life: 6, flip: h.face < 0 });
    },
    draw() {},
  });

  /* -------------------------------------------------------- platforms */
  FK.ent('platform', {
    w: 32, h: 8, floor: false,
    init(e) {
      e.solid = true; e.ox = e.x; e.oy = e.y + 4; e.y = e.oy;
      e.range = (e.range || 3) * 16; e.speed = e.speed || 0.6; e.axis = e.axis || 'x';
      e.always = true; e.w = (e.len || 2) * 16;
    },
    update(e, W) {
      const p = Math.sin(e.t * e.speed / e.range * 1.0 + (e.phase || 0));
      const nx = e.axis === 'x' ? e.ox + (p + 1) / 2 * e.range : e.ox;
      const ny = e.axis === 'y' ? e.oy - (p + 1) / 2 * e.range : e.oy;
      e.dx = nx - e.x; e.dy = ny - e.y;
      const h = W.hero;
      const riding = h.riding === e || (h.onGround && Math.abs(h.y + h.h - e.y) < 1 && h.x + h.w > e.x && h.x < e.x + e.w);
      e.x = nx; e.y = ny;
      if (riding) { h.x += e.dx; h.y = e.y - h.h; }
    },
    draw(e, W, g, cx, cy) {
      const art = e.art || W.def.platformArt || 'plank';
      for (let i = 0; i < e.w / 16; i++) FK.drawSprite(g, 'props', art, Math.round(e.x) + i * 16 - cx, Math.round(e.y) - cy);
    },
  });

  /* Stand on it and it gives way. */
  FK.ent('crumble', {
    w: 16, h: 8, floor: false,
    init(e) { e.solid = true; e.always = true; e.oy = e.y; e.ox = e.x; e.state = 0; },
    update(e, W) {
      const h = W.hero;
      const on = h.onGround && Math.abs(h.y + h.h - e.y) < 1 && h.x + h.w > e.x && h.x < e.x + e.w;
      if (e.state === 0 && on) { e.state = 1; e.k = 0; W.sfx('creak'); }
      if (e.state === 1) { e.k++; if (e.k > 26) { e.state = 2; e.solid = false; e.vy = 0; W.sfx('crumble'); } }
      if (e.state === 2) { e.vy += 0.25; e.y += e.vy; if (e.y > e.oy + 240) { e.state = 3; e.k = 0; } }
      if (e.state === 3) { e.k++; if (e.k > 180 && !FK.hit(h, { x: e.ox, y: e.oy - 4, w: e.w, h: e.h + 8 })) { e.state = 0; e.y = e.oy; e.solid = true; } }
    },
    draw(e, W, g, cx, cy) {
      if (e.state === 3) return;
      const shake = e.state === 1 ? ((e.k >> 1) % 2) : 0;
      const art = e.art || W.def.crumbleArt || 'crumble';
      FK.drawSprite(g, 'props', art, e.x + shake - cx, e.y - cy);
    },
  });

  /* ---------------------------------------------------------- hazards */
  /* Hangs until you pass beneath, then drops (icicles, books, loose rocks). */
  FK.ent('dropper', {
    w: 10, h: 14, floor: false,
    init(e) { e.ox = e.x + 3; e.oy = e.y; e.x = e.ox; e.state = 0; e.foe = false; },
    update(e, W) {
      const h = W.hero;
      if (e.state === 0 && Math.abs(h.x + h.w / 2 - (e.x + e.w / 2)) < 20 && h.y > e.y && h.y - e.y < 160) { e.state = 1; e.k = 0; }
      if (e.state === 1) { e.k++; if (e.k > 18) { e.state = 2; e.vy = 0; W.sfx('fall'); } }
      if (e.state === 2) {
        e.vy = Math.min(6, e.vy + 0.35); e.y += e.vy;
        if (FK.hit(h, e)) W.hurt(e, 1);
        const k = FK.kindAt(W.lv, Math.floor((e.x + 5) / 16), Math.floor((e.y + e.h) / 16));
        if (FK.isSolid(k) || k === FK.K.ONEWAY || e.y > W.lv.ph) {
          e.state = 3; e.k = 0; W.sfx('smash');
          for (let i = 0; i < 6; i++) W.part({ kind: 'px', x: e.x + 5, y: e.y + e.h - 2, vx: (Math.random() - 0.5) * 2.5, vy: -Math.random() * 2, g: 0.18, t: 0, life: 22, col: e.chip || 0x31 });
        }
      }
      if (e.state === 3) { e.k++; if (e.k > 200 && Math.abs(h.x - e.ox) > 48) { e.state = 0; e.x = e.ox; e.y = e.oy; } }
    },
    draw(e, W, g, cx, cy) {
      if (e.state === 3) return;
      const art = e.art || W.def.dropArt || 'icicle';
      const shake = e.state === 1 ? ((e.k >> 1) % 2) : 0;
      FK.drawSprite(g, 'props', art, e.x - 3 + shake - cx, e.y - cy);
    },
  });

  /* Galvanic arc between two posts, on a timer. */
  FK.ent('arc', {
    w: 16, h: 16, floor: false,
    init(e) { e.len = (e.len || 3) * 16; e.period = e.period || 150; e.on = e.onFor || 60; e.always = true; },
    update(e, W) {
      const ph = (e.t + (e.phase || 0)) % e.period;
      e.live = ph < e.on;
      e.warn = !e.live && ph > e.period - 30;
      if (e.live && ph === 0) W.sfx('zap');
      const box = e.axis === 'y' ? { x: e.x + 5, y: e.y + 8, w: 6, h: e.len - 16 } : { x: e.x + 8, y: e.y + 5, w: e.len - 16, h: 6 };
      if (e.live && FK.hit(W.hero, box)) W.hurt(e, 1);
      if (e.live) e.light = 30; else e.light = 0;
    },
    draw(e, W, g, cx, cy) {
      const vert = e.axis === 'y';
      FK.drawSprite(g, 'props', vert ? 'postV' : 'postH', e.x - cx, e.y - cy);
      FK.drawSprite(g, 'props', vert ? 'postV' : 'postH', e.x + (vert ? 0 : e.len - 16) - cx, e.y + (vert ? e.len - 16 : 0) - cy, !vert);
      if (!e.live && !e.warn) return;
      const col = e.live ? 0x31 : 0x2d;
      const r = FK.rng(Math.floor(e.t / 3) + e.x);
      g.fillStyle = FK.color(e.live ? 0x30 : 0x2d);
      if (!vert) {
        const x0 = e.x + 13 - cx, x1 = e.x + e.len - 13 - cx, y = e.y + 8 - cy;
        let py = y;
        for (let x = x0; x < x1; x += 2) {
          const ny = e.live ? y + Math.round((r() - 0.5) * 8) : y + (x % 4 ? 0 : 1);
          FK.rect(g, x, Math.min(py, ny), 2, Math.abs(ny - py) + 1, e.live ? 0x30 : 0x2d);
          if (e.live) FK.rect(g, x, ny - 1, 2, 1, col);
          py = ny;
        }
      } else {
        const y0 = e.y + 13 - cy, y1 = e.y + e.len - 13 - cy, x = e.x + 8 - cx;
        let px = x;
        for (let y = y0; y < y1; y += 2) {
          const nx = e.live ? x + Math.round((r() - 0.5) * 8) : x;
          FK.rect(g, Math.min(px, nx), y, Math.abs(nx - px) + 1, 2, e.live ? 0x30 : 0x2d);
          if (e.live) FK.rect(g, nx - 1, y, 1, 2, col);
          px = nx;
        }
      }
    },
  });

  /* Fire: a campfire, a burning beam. Hurts to touch. */
  FK.ent('fire', {
    w: 12, h: 12,
    init(e) { e.light = 44; e.lx = 6; e.ly = 0; },
    update(e, W) { if (FK.hit(W.hero, { x: e.x + 2, y: e.y + 2, w: e.w - 4, h: e.h - 2 })) W.hurt(e, 1); if (e.t % 4 === 0) W.part({ kind: 'px', x: e.x + 3 + Math.random() * 6, y: e.y, vx: 0, vy: -0.6, t: 0, life: 20, col: Math.random() < 0.5 ? 0x27 : 0x28, layer: -1 }); },
    draw(e, W, g, cx, cy) { FK.drawSprite(g, 'props', ['fire1', 'fire2', 'fire3'][Math.floor(e.t / 5) % 3], e.x - 2 - cx, e.y - 4 - cy); },
  });

  /* ---------------------------------------------------------- enemies */
  FK.ent('rat', {
    w: 14, h: 8, hp: 1, spr: 'rat',
    init(e) { e.foe = true; e.face = e.face || -1; },
    update(e, W) {
      H.patrol(e, W, 0.7);
      // Bit him: turn tail and walk the other way.
      if (H.contact(e, W) === 'hurt') e.face = Math.sign(e.x + e.w / 2 - (W.hero.x + W.hero.w / 2)) || e.face;
    },
    draw(e, W, g, cx, cy) { FK.drawOn(g, 'rat', H.anim(e, ['a', 'b'], 6), e, cx, cy, e.face > 0); },
  });

  /* Flyers: pigeons and crows bob along; bats hang until you come near. */
  FK.ent('bird', {
    w: 14, h: 10, hp: 1, floor: false,
    init(e) { e.foe = true; e.oy = e.y; e.ox = e.x; e.face = -1; e.spr = e.spr || 'crow'; e.range = (e.range || 4) * 16; },
    update(e, W) {
      e.x = e.ox - (Math.sin(e.t / 60 + (e.phase || 0)) + 1) / 2 * e.range;
      e.face = Math.cos(e.t / 60 + (e.phase || 0)) > 0 ? -1 : 1;
      e.y = e.oy + Math.sin(e.t / 9) * 4;
      H.contact(e, W);
    },
    draw(e, W, g, cx, cy) { FK.drawSprite(g, e.spr, H.anim(e, ['a', 'b', 'c', 'b'], 5), e.x - 1 - cx, e.y - 3 - cy, e.face > 0); },
  });

  FK.ent('bat', {
    w: 12, h: 10, hp: 1, floor: false,
    init(e) { e.foe = true; e.state = 0; e.ox = e.x; e.oy = e.y; },
    update(e, W) {
      if (e.state === 0) { if (H.near(e, W, 64, 96)) { e.state = 1; W.sfx('flap'); } }
      else {
        // Swoop: dive toward where the hero was, then climb away.
        let tx = W.hero.x + W.hero.w / 2, ty = W.hero.y + 4;
        // After touching him it wheels off, back up to roost height, then dives again.
        if (e.away > 0) { e.away--; tx = e.x + 6 + e.awayDir * 64; ty = e.oy + 5; }
        const ax = Math.sign(tx - (e.x + 6)) * 0.08, ay = Math.sign(ty - (e.y + 5)) * 0.06;
        e.vx = FK.clamp(e.vx + ax, -1.4, 1.4); e.vy = FK.clamp(e.vy + ay + Math.sin(e.t / 6) * 0.05, -1.2, 1.2);
        e.x += e.vx; e.y += e.vy; e.face = e.vx > 0 ? 1 : -1;
      }
      if (H.contact(e, W) === 'hurt') {
        if (!(e.away > 0)) {
          e.awayDir = Math.sign(e.x + 6 - (W.hero.x + W.hero.w / 2)) || -W.hero.face;
          e.vx = e.awayDir * 1.4; e.vy = -1;
        }
        e.away = 70;
      }
    },
    draw(e, W, g, cx, cy) { FK.drawSprite(g, 'bat', e.state === 0 ? 'hang' : H.anim(e, ['a', 'b'], 4), e.x - 2 - cx, e.y - 3 - cy, e.face > 0); },
  });

  /* Something that jumps at you (wolves). */
  FK.ent('wolf', {
    w: 22, h: 12, hp: 2,
    init(e) { e.foe = true; e.state = 0; e.k = 0; },
    update(e, W) {
      e.vy = Math.min(5, e.vy + 0.3);
      const dx = H.dx(e, W);
      if (e.state === 0) { e.vx = 0; if (Math.abs(dx) < 120 && Math.abs(H.dy(e, W)) < 48) { e.state = 1; e.k = 0; W.sfx('growl'); } }
      else if (e.state === 1) { e.face = Math.sign(dx) || e.face; e.vx = e.face * 1.4; e.k++; if (e.onGround && Math.abs(dx) < 56 && e.k > 30) { e.vy = -3.6; e.vx = e.face * 2.2; e.state = 2; } }
      else if (e.state === 2) { if (e.onGround) { e.state = 1; e.k = 0; } }
      else if (e.state === 3) {
        // Backing off after a bite: the hop away, then a growl before it comes again.
        e.k++;
        if (e.onGround && e.k > 4) { e.vx = 0; e.face = Math.sign(dx) || e.face; }
        if (e.k > 90) { e.state = 1; e.k = 0; }
      }
      FK.moveBody(e, W.lv);
      if (e.hitWall && e.onGround) e.vy = -3.2;
      if (e.y > W.lv.ph + 32) e.dead = true;
      if (H.contact(e, W) === 'hurt' && e.state !== 3) {
        e.state = 3; e.k = 0;
        e.face = Math.sign(dx) || e.face; e.vx = -e.face * 2; e.vy = -2.6;
      }
    },
    draw(e, W, g, cx, cy) {
      const f = !e.onGround && e.state !== 0 ? 'leap' : e.state === 0 || e.state === 3 ? 'a' : H.anim(e, ['run1', 'run2'], 5);
      FK.drawOn(g, 'wolf', f, e, cx, cy, e.face > 0);
    },
  });

  /* Thrown things (stones, books): arc and break. */
  FK.ent('shot', {
    w: 6, h: 6, floor: false,
    init(e) { e.always = true; e.g = e.g === undefined ? 0.15 : e.g; },
    update(e, W) {
      e.vy += e.g; e.x += e.vx; e.y += e.vy;
      if (FK.hit(W.hero, e)) { W.hurt(e, 1); e.dead = true; }
      const k = FK.kindAt(W.lv, Math.floor((e.x + 3) / 16), Math.floor((e.y + 3) / 16));
      if (FK.isSolid(k) || e.t > 300 || e.y > W.cam.y + 260) e.dead = true;
      if (e.dead && e.chip) for (let i = 0; i < 4; i++) W.part({ kind: 'px', x: e.x + 3, y: e.y + 3, vx: (Math.random() - 0.5) * 2, vy: -Math.random() * 2, g: 0.15, t: 0, life: 16, col: e.chip });
    },
    draw(e, W, g, cx, cy) {
      const art = e.art || 'stone';
      const set = FK.SPR.shots;
      const fr = set[art + '2'] ? (Math.floor(e.t / 5) % 2 ? art + '2' : art) : art;
      const s = set[fr];
      FK.drawSprite(g, 'shots', fr, e.x + 3 - s.w / 2 - cx, e.y + 3 - s.h / 2 - cy, e.vx < 0);
    },
  });

  /*
   * People: watchmen, villagers, rustics. They patrol; if they see you they
   * react according to e.mode ('chase', 'throw' or 'shoot').
   */
  FK.ent('person', {
    w: 12, h: 22, hp: 2,
    init(e) { e.foe = true; e.face = e.face || -1; e.spr = e.spr || 'watchman'; e.mode = e.mode || 'chase'; e.alarm = 0; e.cool = 30; e.speed = e.speed || 0.45; e.sight = (e.sight || 6) * 16; },
    update(e, W) {
      const dx = H.dx(e, W), dy = H.dy(e, W);
      const facing = Math.sign(dx) === e.face;
      // A chaser that has just caught him walks off for a moment, then looks back.
      if (e.calm > 0 && --e.calm === 0) e.face = Math.sign(dx) || e.face;
      const sees = facing && Math.abs(dx) < e.sight && Math.abs(dy) < 40 && !(e.calm > 0);
      if (sees) { if (!e.alarm) W.sfx('alarm'); e.alarm = 120; }
      else if (e.alarm > 0) e.alarm--;
      if (e.mode === 'chase') {
        if (e.alarm) { e.face = Math.sign(dx) || e.face; H.patrol(e, W, e.speed * 2.6, true); }
        else H.patrol(e, W, e.speed, true);
      } else {
        if (e.alarm) {
          e.face = Math.sign(dx) || e.face;
          e.vx = 0; e.vy = Math.min(5, e.vy + 0.3); FK.moveBody(e, W.lv);
          if (--e.cool <= 0) {
            e.cool = e.mode === 'shoot' ? 70 : 60;
            e.throwT = 12;
            if (e.mode === 'shoot') { W.add(FK.spawn('shot', e.x + e.w / 2 + e.face * 8, e.y + 8, { vx: e.face * 3.2, vy: 0, g: 0, art: 'ball' })); W.sfx('gun'); W.shake = 3; }
            else { const t = 40; W.add(FK.spawn('shot', e.x + e.w / 2, e.y + 2, { vx: dx / t, vy: -3.2 + (dy / t) * 0.5, art: e.shot || 'stone', chip: 0x2d })); W.sfx('toss'); }
          }
        } else H.patrol(e, W, e.speed, true);
      }
      if (e.throwT > 0) e.throwT--;
      if (e.lantern) { e.light = 34; e.lx = e.w / 2 + e.face * 10; e.ly = 8; }
      if (H.contact(e, W, { stomp: e.stomp !== false }) === 'hurt' && e.mode === 'chase') {
        e.calm = 100; e.alarm = 0; e.face = -(Math.sign(dx) || e.face);
      }
    },
    draw(e, W, g, cx, cy) {
      let f = Math.abs(e.vx) > 0.1 ? H.anim(e, ['walk1', 'idle', 'walk2', 'idle'], e.alarm ? 5 : 9) : 'idle';
      if (e.throwT > 0 && FK.SPR[e.spr].throw) f = 'throw';
      FK.drawOn(g, e.spr, f, e, cx, cy, e.face < 0);
      if (e.alarm && e.mode !== 'none' && e.alarm > 100) FK.text(g, '!', e.x + e.w / 2 - 3 - cx, e.y - 12 - cy, 0x16, { shadow: 0x0f });
    },
  });

  /* A cat on a chimney pot, asleep. Petting it is worth a heart. */
  FK.ent('cat', {
    w: 16, h: 10,
    update(e, W) {
      const on = FK.hit(W.hero, { x: e.x - 6, y: e.y - 8, w: e.w + 12, h: e.h + 8 });
      if (on && !e.petted) {
        e.petted = true; e.purr = 120;
        W.hearts = Math.min(W.maxHearts, W.hearts + 1);
        W.sfx('meow');
        W.part({ kind: 'text', text: 'PRRR', x: e.x + 8, y: e.y - 6, t: 0, life: 70, col: 0x27 });
      }
      if (e.purr > 0) e.purr--;
    },
    draw(e, W, g, cx, cy) {
      const f = e.purr > 0 ? 'awake' : Math.floor(e.t / 50) % 2 ? 'sleep1' : 'sleep2';
      FK.drawOn(g, 'cat', f, e, cx, cy, false);
      if (!e.purr && Math.floor(e.t / 50) % 2 && e.t % 50 < 30) FK.text(g, 'Z', e.x + 12 - cx, e.y - 10 - Math.floor((e.t % 50) / 8) - cy, 0x30);
    },
  });
})();
