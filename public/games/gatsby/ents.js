'use strict';
/*
 * GATSBY.EXE: things that move. Each type is a small definition with init,
 * update and draw; GG.spawn makes one from a map marker or from code. This
 * file has what every stage shares; foes.js and bosses.js have the rest.
 */
(() => {
  const DEF = (GG.DEF = {});
  GG.ent = (type, d) => { DEF[type] = d; return d; };

  GG.spawn = (type, x, y, props = {}) => {
    const d = DEF[type];
    if (!d) { console.warn('no entity type', type); return null; }
    const e = Object.assign({ type, x, y, w: d.w || 16, h: d.h || 16, vx: 0, vy: 0, t: 0, face: -1, hp: d.hp || 1, z: d.z || 0 }, props);
    e.type = type;
    // Map markers give the cell's top-left; stand ground things on the cell floor.
    if (props.cx !== undefined && d.floor !== false) { e.x = x + 8 - e.w / 2; e.y = y + 16 - e.h; }
    e.maxHp = e.hp;
    if (d.init) d.init(e, GG.world());
    const W = GG.world();
    if (W && !props.noAdd) W.ents.push(e);
    return e;
  };
  GG.update = (e, W) => { e.t++; if (e.hitT > 0) e.hitT--; const d = DEF[e.type]; if (d.update) d.update(e, W); };
  GG.draw = (e, W, g, cx, cy) => {
    const d = DEF[e.type];
    if (e.hitT > 0 && Math.floor(e.hitT / 2) % 2) return;
    if (d.draw) d.draw(e, W, g, cx, cy);
    else if (d.spr) GG.drawOn(g, d.spr, typeof d.frame === 'function' ? d.frame(e, W) : 'a', e, cx, cy, e.face > 0 === !!d.facesLeft);
  };

  /* --------------------------------------------------------- helpers */
  const H = (GG.EH = {});
  H.dx = (e, W) => (W.hero.x + W.hero.w / 2) - (e.x + e.w / 2);
  H.dy = (e, W) => (W.hero.y + W.hero.h / 2) - (e.y + e.h / 2);
  H.near = (e, W, rx, ry = 64) => Math.abs(H.dx(e, W)) < rx && Math.abs(H.dy(e, W)) < ry;

  /* Damage a foe; returns true if it was finished. */
  H.damage = (e, W, n = 1, src) => {
    const d = DEF[e.type];
    if (e.hitT > 0 || e.dead || e.invincible) return false;
    e.hp -= n;
    e.hitT = d.hitFrames || 10;
    if (d.onHit) d.onHit(e, W, src);
    if (e.hp <= 0) {
      if (d.onDie) d.onDie(e, W, src);
      else H.poof(e, W);
      if (!e.keep) e.dead = true;
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
  /* Bits flying off something: confetti, glass, ash. */
  H.burst = (W, x, y, n, cols, opt = {}) => {
    for (let i = 0; i < n; i++) {
      W.part({ kind: 'px', x, y, vx: (GG.rand() - 0.5) * (opt.spread || 2.6), vy: -GG.rand() * (opt.up || 2.4), g: opt.g === undefined ? 0.14 : opt.g, t: 0, life: opt.life || 22, col: cols[i % cols.length], s: opt.s || 1, layer: opt.layer || 0 });
    }
  };
  /*
   * The usual contact rules: land on it to stomp it (if it can be stomped),
   * otherwise it hurts. Returns 'stomp', 'hurt' or null.
   */
  H.contact = (e, W, opts = {}) => {
    const h = W.hero;
    if (W.dying || W.done) return null;
    const box = opts.box || e;
    if (!GG.hit(h, box)) return null;
    const stompable = opts.stomp !== false;
    if (stompable && h.vy > 0.5 && h.y + h.h - h.vy <= box.y + 6) {
      h.vy = GG.input && GG.input.held.a ? -5.0 : -3.6;
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
      const below = GG.kindAt(lv, Math.floor(fx / 16), Math.floor((e.y + e.h + 2) / 16));
      if (!(GG.isSolid(below) || below === GG.K.ONEWAY || below === GG.K.LADDER)) e.face *= -1;
    }
    GG.moveBody(e, lv);
    if (e.hitWall) e.face *= -1;
    if (e.y > lv.ph + 32) e.dead = true;
  };
  H.anim = (e, frames, rate) => frames[Math.floor(e.t / rate) % frames.length];
  /* Is the hero standing on this box? */
  H.standing = (e, W) => {
    const h = W.hero;
    return h.riding === e || (h.onGround && Math.abs(h.y + h.h - e.y) < 1 && h.x + h.w > e.x && h.x < e.x + e.w);
  };
  /*
   * Move a solid thing to (nx, ny), carrying the hero if he stands on it. The
   * hero's own step adds e.dx (so a wall can still scrape him off); here we
   * only keep his feet on it as it rises and sinks.
   */
  H.carry = (e, W, nx, ny) => {
    const on = H.standing(e, W);
    e.dx = nx - e.x; e.dy = ny - e.y;
    e.x = nx; e.y = ny;
    if (on && !W.hero.onLadder && W.hero.vy >= 0) W.hero.y = e.y - W.hero.h;
    return on;
  };

  /* --------------------------------------------------------- pickups */
  GG.ent('item', {
    w: 12, h: 12,
    init(e) { e.baseY = e.y; },
    update(e, W) {
      e.y = e.baseY + Math.round(Math.sin(e.t / 14) * 2);
      if (GG.hit(W.hero, e) && !W.dying) {
        e.dead = true;
        W.take(e);
        if (!e.optional) W.items++;
        W.emit('item', { name: e.name || '', x: e.x, y: e.y });
        W.sfx('item');
        const label = e.name || W.def.itemName || 'FOUND IT';
        W.part({ kind: 'text', text: label, x: e.x + e.w / 2, y: e.y - 6, t: 0, life: 70, col: 0x28 });
        if (e.say) W.say(e.say, e.who, e.frames || 220);
        if (W.def.onItem) W.def.onItem(W, e);
        H.burst(W, e.x + 6, e.y + 6, 10, [0x30, 0x28], { spread: 3, up: 3, g: 0.12, life: 26 });
      }
    },
    draw(e, W, g, cx, cy) {
      const art = e.art || W.def.itemArt || 'rumor';
      const s = GG.SPR.items[art];
      if (!s) return;
      GG.drawSprite(g, 'items', art, e.x + e.w / 2 - s.w / 2 - cx, e.y + e.h - s.h - cy);
      // A glint every so often.
      const k = e.t % 90;
      if (k < 8) GG.drawSprite(g, 'fx', k < 4 ? 'glint1' : 'glint2', e.x + e.w - 4 - cx, e.y - 4 - cy);
    },
  });

  /*
   * Oranges: "Every Friday five crates of oranges and lemons arrived from a
   * fruiterer in New York." One puts back a heart.
   */
  GG.ent('orange', {
    w: 10, h: 10,
    init(e) { e.baseY = e.y; e.lemon = e.lemon || (e.cx || 0) % 3 === 0; },
    update(e, W) {
      e.y = e.baseY + Math.round(Math.sin(e.t / 10) * 1.5);
      if (GG.hit(W.hero, e) && !W.dying) {
        e.dead = true; W.take(e);
        W.hearts = Math.min(W.maxHearts, W.hearts + 1);
        W.sfx('heart');
        H.burst(W, e.x + 5, e.y + 5, 6, [0x27, 0x37], { spread: 2, up: 2 });
      }
    },
    draw(e, W, g, cx, cy) { GG.drawSprite(g, 'hud', W.def.healthArt || (e.lemon ? 'lemon' : 'orange'), e.x - 1 - cx, e.y - 1 - cy); },
  });

  /* Checkpoints: a lamp of some kind that lights when you pass it. */
  GG.ent('checkpoint', {
    w: 16, h: 32,
    init(e) { e.lit = false; },
    update(e, W) {
      const h = W.hero;
      if (!e.lit && h.x + h.w / 2 > e.x + 2 && Math.abs(h.y + h.h - (e.y + e.h)) < 48 && !W.dying) {
        e.lit = true;
        W.check = { x: e.x, y: e.y + e.h - 16, items: W.items, taken: W.taken.slice() };
        W.hearts = W.maxHearts;
        W.emit('checkpoint', { x: e.x, y: e.y });
        W.sfx('check');
        W.part({ kind: 'text', text: 'SAVED', x: e.x + 8, y: e.y - 4, t: 0, life: 60, col: 0x30 });
      }
      e.light = e.lit ? 40 : 0;
    },
    draw(e, W, g, cx, cy) {
      const art = W.def.checkArt || 'lamp';
      const f = e.lit ? (Math.floor(e.t / 6) % 2 ? 'on1' : 'on2') : 'off';
      const s = GG.SPR[art] && GG.SPR[art][f];
      if (s) GG.drawSprite(g, art, f, e.x + 8 - s.w / 2 - cx, e.y + e.h - s.h - cy);
    },
  });

  /* The way out. Locked until every objective item is carried, if any. */
  GG.ent('goal', {
    w: 16, h: 32,
    init(e) { e.warned = 0; },
    update(e, W) {
      if (e.warned > 0) e.warned--;
      if (!GG.hit(W.hero, e) || W.done || W.dying) return;
      if (W.items < W.itemsNeeded) {
        if (!e.warned) { W.say(W.def.lockedText || `FIND ALL ${W.itemsNeeded} FIRST.`, null, 140); W.sfx('locked'); e.warned = 180; }
        return;
      }
      if (W.boss && !W.boss.dead) return;
      if (W.def.onGoal) { if (W.def.onGoal(W, e) === false) return; }
      W.clear();
    },
    draw(e, W, g, cx, cy) {
      const art = e.art || W.def.goalArt || 'door';
      if (art === 'none') return;
      const set = GG.SPR.goal;
      const open = W.items >= W.itemsNeeded;
      const fr = set[art + (open ? '' : 'Shut')] ? art + (open ? '' : 'Shut') : art;
      const s = set[fr];
      if (!s) return;
      GG.drawSprite(g, 'goal', fr, e.x + e.w / 2 - s.w / 2 - cx, e.y + e.h - s.h - cy);
      if (open && W.itemsNeeded && e.t % 40 < 20) GG.text(g, '^', e.x + 4 - cx, e.y + e.h - s.h - 12 - cy, 0x28);
    },
  });

  /* A sign, or a person who just talks, when you stand at it. */
  GG.ent('sign', {
    w: 16, h: 16, z: -1,
    update(e, W) {
      const on = GG.hit(W.hero, { x: e.x - 6, y: e.y - 20, w: e.w + 12, h: e.h + 20 });
      if (on && !e.on && !(e.once && e.said)) { W.say(e.text, e.who, e.frames || 260); W.sfx('sign'); e.said = true; }
      e.on = on;
    },
    draw(e, W, g, cx, cy) {
      if (e.spr) {
        let f = e.frame || (Math.floor(e.t / 40) % 2 && GG.SPR[e.spr].idle2 ? 'idle2' : 'idle');
        // Klipspringer, "doing liver exercises on the floor".
        if (f === 'exercise1' && Math.floor(e.t / 24) % 2) f = 'exercise2';
        GG.drawOn(g, e.spr, f, e, cx, cy, e.flip !== undefined ? e.flip : W.hero.x < e.x);
        if (!e.said && e.t % 60 < 40) GG.text(g, '`', e.x + e.w / 2 - 4 - cx, e.y - (GG.SPR[e.spr][f] ? GG.SPR[e.spr][f].h - e.h : 0) - 12 - cy, 0x28, { shadow: 0x0f });
        return;
      }
      const art = e.art || 'sign';
      const s = GG.SPR.props[art];
      if (s) GG.drawSprite(g, 'props', art, e.x + 8 - s.w / 2 - cx, e.y + 16 - s.h - cy);
    },
  });

  /* ------------------------------------------------------ hero throws */
  /* Hits the first foe it touches; true if it hit one. */
  function strike(e, W, dmg = 1) {
    for (const o of W.ents) {
      if (o.foe && !o.dead && !o.ghost && GG.hit(e, o)) { H.damage(o, W, dmg, e); return true; }
    }
    return false;
  }
  const solidAt = (W, x, y) => GG.isSolid(GG.kindAt(W.lv, Math.floor(x / 16), Math.floor(y / 16)));

  /*
   * Nick's bonds. "I bought a dozen volumes on banking and credit and
   * investment securities." A bond certificate, folded into a dart, sails
   * flat and then flutters down.
   */
  GG.ent('bond', {
    w: 8, h: 6, floor: false,
    init(e) { e.always = true; e.x -= 4; },
    update(e, W) {
      if (e.t > 26) { e.vy = Math.min(1.2, e.vy + 0.05); e.vx *= 0.985; }
      e.x += e.vx; e.y += e.vy + (e.t > 26 ? Math.sin(e.t / 4) * 0.5 : 0);
      let done = solidAt(W, e.x + 4, e.y + 3) || e.t > 80 || e.y > W.cam.y + 240;
      if (!done && strike(e, W)) done = true;
      if (done) {
        e.dead = true;
        W.sfx('paper');
        H.burst(W, e.x + 4, e.y + 3, 5, [0x30, 0x3a, 0x28], { spread: 2, up: 1.5, g: 0.06, life: 26 });
      }
    },
    draw(e, W, g, cx, cy) { GG.drawSprite(g, 'fx', e.t > 26 ? (Math.floor(e.t / 4) % 2 ? 'bond2' : 'bond3') : 'bond1', e.x - cx, e.y - 1 - cy, e.dir < 0); },
  });

  /* Jimmy Gatz dug clams on the south shore of Lake Superior. He throws them. */
  GG.ent('clam', {
    w: 6, h: 6, floor: false,
    init(e) { e.always = true; e.x -= 3; },
    update(e, W) {
      e.vy = Math.min(5, e.vy + 0.18);
      e.x += e.vx; e.y += e.vy;
      let done = solidAt(W, e.x + 3, e.y + 3) || e.y > W.cam.y + 240;
      if (!done && strike(e, W)) done = true;
      if (done) { e.dead = true; W.sfx('clack'); H.burst(W, e.x + 3, e.y + 3, 5, [0x10, 0x30, 0x2d]); }
    },
    draw(e, W, g, cx, cy) { GG.drawSprite(g, 'fx', ['clam1', 'clam2', 'clam3', 'clam4'][Math.floor(e.t / 4) % 4], e.x - 1 - cx, e.y - 1 - cy, e.dir < 0); },
  });

  /*
   * Gatsby's card. "I was able to do the commissioner a favor once, and he
   * sends me a Christmas card every year." He flicks one; it spins straight.
   */
  GG.ent('card', {
    w: 8, h: 6, floor: false,
    init(e) { e.always = true; e.x -= 4; },
    update(e, W) {
      e.x += e.vx;
      let done = solidAt(W, e.x + 4, e.y + 3) || e.t > 34;
      if (!done && strike(e, W)) done = true;
      if (done) { e.dead = true; W.sfx('paper'); H.burst(W, e.x + 4, e.y + 3, 4, [0x30, 0x10], { spread: 2, up: 1.2, g: 0.08 }); }
    },
    draw(e, W, g, cx, cy) { GG.drawSprite(g, 'fx', ['card1', 'card2', 'card3', 'card2'][Math.floor(e.t / 3) % 4], e.x - cx, e.y - 1 - cy, e.dir < 0); },
  });

  /* -------------------------------------------------------- platforms */
  /* Back and forth (or up and down) on a sine. */
  GG.ent('platform', {
    w: 32, h: 8, floor: false,
    init(e) {
      e.solid = true; e.ox = e.x; e.oy = e.y + 4; e.y = e.oy;
      e.range = (e.range || 3) * 16; e.speed = e.speed || 0.6; e.axis = e.axis || 'x';
      e.always = true; e.w = (e.len || 2) * 16;
    },
    update(e, W) {
      const p = Math.sin(e.t * e.speed / e.range + (e.phase || 0));
      const nx = e.axis === 'x' ? e.ox + (p + 1) / 2 * e.range : e.ox;
      const ny = e.axis === 'y' ? e.oy - (p + 1) / 2 * e.range : e.oy;
      H.carry(e, W, nx, ny);
    },
    draw(e, W, g, cx, cy) {
      const art = e.art || W.def.platformArt || 'plank';
      for (let i = 0; i < e.w / 16; i++) GG.drawSprite(g, 'props', art, Math.round(e.x) + i * 16 - cx, Math.round(e.y) - cy);
    },
  });

  /* Stand on it and it gives way: ash heaps, rotten duckboards. */
  GG.ent('crumble', {
    w: 16, h: 8, floor: false,
    init(e) { e.solid = true; e.always = true; e.oy = e.y; e.ox = e.x; e.state = 0; },
    update(e, W) {
      const h = W.hero;
      const on = H.standing(e, W);
      e.dx = 0; e.dy = 0;
      if (e.state === 0 && on) { e.state = 1; e.k = 0; W.sfx('creak'); }
      if (e.state === 1) {
        e.k++;
        if (e.k % 6 === 0) W.part({ kind: 'px', x: e.x + 2 + GG.rand() * 12, y: e.y + 6, vx: 0, vy: 0.6, t: 0, life: 20, col: W.def.crumbleChip || 0x10 });
        if (e.k > 26) { e.state = 2; e.solid = false; e.vy = 0; W.sfx('crumble'); }
      }
      if (e.state === 2) { e.vy += 0.25; e.y += e.vy; if (e.y > e.oy + 240) { e.state = 3; e.k = 0; } }
      if (e.state === 3) { e.k++; if (e.k > 180 && !GG.hit(h, { x: e.ox, y: e.oy - 4, w: e.w, h: e.h + 8 })) { e.state = 0; e.y = e.oy; e.solid = true; } }
    },
    draw(e, W, g, cx, cy) {
      if (e.state === 3) return;
      const shake = e.state === 1 ? ((e.k >> 1) % 2) : 0;
      const art = e.art || W.def.crumbleArt || 'crumble';
      GG.drawSprite(g, 'props', art, e.x + shake - cx, e.y - cy);
    },
  });

  /* ---------------------------------------------------------- hazards */
  /* Hangs until you pass beneath, then drops. */
  GG.ent('dropper', {
    w: 10, h: 14, floor: false,
    init(e) { e.ox = e.x + 3; e.oy = e.y; e.x = e.ox; e.state = 0; },
    update(e, W) {
      const h = W.hero;
      if (e.state === 0 && Math.abs(h.x + h.w / 2 - (e.x + e.w / 2)) < 20 && h.y > e.y && h.y - e.y < 160) { e.state = 1; e.k = 0; }
      if (e.state === 1) { e.k++; if (e.k > 18) { e.state = 2; e.vy = 0; W.sfx('fall'); } }
      if (e.state === 2) {
        e.vy = Math.min(6, e.vy + 0.35); e.y += e.vy;
        if (GG.hit(h, e)) W.hurt(e, 1);
        const k = GG.kindAt(W.lv, Math.floor((e.x + 5) / 16), Math.floor((e.y + e.h) / 16));
        if (GG.isSolid(k) || k === GG.K.ONEWAY || e.y > W.lv.ph) {
          e.state = 3; e.k = 0; W.sfx('smash');
          H.burst(W, e.x + 5, e.y + e.h - 2, 6, [e.chip || 0x31], { spread: 2.5, up: 2, g: 0.18 });
        }
      }
      if (e.state === 3) { e.k++; if (e.k > 200 && Math.abs(h.x - e.ox) > 48) { e.state = 0; e.x = e.ox; e.y = e.oy; } }
    },
    draw(e, W, g, cx, cy) {
      if (e.state === 3) return;
      const art = e.art || W.def.dropArt || 'pinecone';
      const shake = e.state === 1 ? ((e.k >> 1) % 2) : 0;
      GG.drawSprite(g, 'props', art, e.x - 3 + shake - cx, e.y - cy);
    },
  });

  /* Thrown things (baseballs, cocktails, clods of ash): arc and break. */
  GG.ent('shot', {
    w: 6, h: 6, floor: false,
    init(e) { e.always = true; e.g = e.g === undefined ? 0.15 : e.g; },
    update(e, W) {
      e.vy += e.g; e.x += e.vx; e.y += e.vy;
      if (e.curve) e.vy += e.curve;
      if (GG.hit(W.hero, e)) { W.hurt(e, 1); e.dead = true; }
      if (e.foeHit) strike(e, W);
      const k = GG.kindAt(W.lv, Math.floor((e.x + 3) / 16), Math.floor((e.y + 3) / 16));
      if (GG.isSolid(k) || e.t > 300 || e.y > W.cam.y + 260 || (e.bounce === undefined && k === GG.K.ONEWAY && e.vy > 0 && e.breakOnLedge)) {
        if (e.bounce > 0 && GG.isSolid(k) && e.vy > 0) { e.bounce--; e.y -= e.vy; e.vy = -e.vy * 0.55; e.vx *= 0.8; W.sfx('bounce'); }
        else e.dead = true;
      }
      if (e.dead && e.chip) H.burst(W, e.x + 3, e.y + 3, 4, [e.chip], { spread: 2, up: 2, g: 0.15, life: 16 });
      if (e.dead && e.sfxEnd) W.sfx(e.sfxEnd);
    },
    draw(e, W, g, cx, cy) {
      const art = e.art || 'ash';
      const set = GG.SPR.shots;
      const fr = set[art + '2'] ? (Math.floor(e.t / 5) % 2 ? art + '2' : art) : art;
      const s = set[fr];
      if (s) GG.drawSprite(g, 'shots', fr, e.x + 3 - s.w / 2 - cx, e.y + 3 - s.h / 2 - cy, e.vx < 0);
    },
  });

  /*
   * People: gardeners, waiters, bellhops. They patrol; if they see you they
   * react according to e.mode ('chase', 'throw' or 'none').
   */
  GG.ent('person', {
    w: 12, h: 22, hp: 2,
    init(e) { e.foe = true; e.face = e.face || -1; e.spr = e.spr || 'gardener'; e.mode = e.mode || 'chase'; e.alarm = 0; e.cool = 30; e.speed = e.speed || 0.45; e.sight = (e.sight || 6) * 16; },
    update(e, W) {
      const dx = H.dx(e, W), dy = H.dy(e, W);
      const facing = Math.sign(dx) === e.face;
      // A chaser that has just caught him walks off for a moment, then looks back.
      if (e.calm > 0 && --e.calm === 0) e.face = Math.sign(dx) || e.face;
      const sees = e.mode !== 'none' && facing && Math.abs(dx) < e.sight && Math.abs(dy) < 40 && !(e.calm > 0);
      if (sees) { if (!e.alarm) W.sfx('alarm'); e.alarm = 120; }
      else if (e.alarm > 0) e.alarm--;
      if (e.mode === 'chase' || e.mode === 'none') {
        if (e.alarm) { e.face = Math.sign(dx) || e.face; H.patrol(e, W, e.speed * 2.4, true); }
        else H.patrol(e, W, e.speed, true);
      } else {
        if (e.alarm) {
          e.face = Math.sign(dx) || e.face;
          e.vx = 0; e.vy = Math.min(5, e.vy + 0.3); GG.moveBody(e, W.lv);
          if (--e.cool <= 0) {
            e.cool = e.rate || 64;
            e.throwT = 12;
            const t = 40;
            W.add(GG.spawn('shot', e.x + e.w / 2, e.y + 4, { vx: dx / t, vy: -3.2 + (dy / t) * 0.5, art: e.shot || 'glass', chip: e.chip || 0x31, sfxEnd: e.shot === 'glass' || !e.shot ? 'glass' : null }));
            W.sfx('toss');
          }
        } else H.patrol(e, W, e.speed, true);
      }
      if (e.throwT > 0) e.throwT--;
      if (H.contact(e, W, { stomp: e.stomp !== false }) === 'hurt' && e.mode === 'chase') {
        e.calm = 100; e.alarm = 0; e.face = -(Math.sign(dx) || e.face);
      }
    },
    draw(e, W, g, cx, cy) {
      let f = Math.abs(e.vx) > 0.1 ? H.anim(e, ['walk1', 'idle', 'walk2', 'idle'], e.alarm ? 5 : 9) : 'idle';
      if (e.throwT > 0 && GG.SPR[e.spr].throw) f = 'throw';
      GG.drawOn(g, e.spr, f, e, cx, cy, e.face < 0);
      if (e.alarm > 100 && e.mode !== 'none') GG.text(g, '!', e.x + e.w / 2 - 3 - cx, e.y - 12 - cy, 0x16, { shadow: 0x0f });
    },
  });

  /* Flyers: gulls and pigeons bob along a stretch of sky. */
  GG.ent('bird', {
    w: 14, h: 10, hp: 1, floor: false,
    init(e) { e.foe = true; e.oy = e.y; e.ox = e.x; e.face = -1; e.spr = e.spr || 'gull'; e.range = (e.range || 4) * 16; },
    update(e, W) {
      const k = e.t / 60 + (e.phase || 0);
      e.x = e.ox - (Math.sin(k) + 1) / 2 * e.range;
      e.face = Math.cos(k) > 0 ? -1 : 1;
      e.y = e.oy + Math.sin(e.t / 9) * 4;
      H.contact(e, W);
    },
    draw(e, W, g, cx, cy) { GG.drawSprite(g, e.spr, H.anim(e, ['a', 'b', 'c', 'b'], 5), e.x - 1 - cx, e.y - 3 - cy, e.face > 0); },
  });
})();
