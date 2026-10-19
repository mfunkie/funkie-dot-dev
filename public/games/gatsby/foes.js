'use strict';
/*
 * GATSBY.EXE: the things in particular stages. Ponies on the Buchanans' lawn,
 * the ash-grey men, the train and the grey cars in the valley, the guests at
 * the party, Gatsby's car, the shirts, the rowboat, the fans at the Plaza,
 * shells and flares in the Argonne, and the boats and the green light at the
 * end. Shared helpers are GG.EH (ents.js).
 */
(() => {
  const H = GG.EH;
  const { K } = GG;
  const SW = GG.W;

  /* The ground under a point: the y of the first standable tile top, or null. */
  function groundBelow(W, x, y, max = 14) {
    const tx = Math.floor(x / 16);
    for (let ty = Math.floor(y / 16); ty < Math.floor(y / 16) + max; ty++) {
      const k = GG.kindAt(W.lv, tx, ty);
      if (GG.isSolid(k) || k === K.ONEWAY) return ty * 16;
      if (k === K.DEATH || k === K.WATER) return null;
    }
    return null;
  }
  GG.groundBelow = groundBelow;

  /* A dithered cloud of dust, gas or ash (no sprite needed). */
  function cloud(g, x, y, w, h, t, cols) {
    const r = GG.rng(7);
    for (let i = 0; i < w * h / 10; i++) {
      const a = r() * Math.PI * 2, d = Math.sqrt(r());
      const px = Math.round(x + w / 2 + Math.cos(a + t / 40) * d * w / 2);
      const py = Math.round(y + h / 2 + Math.sin(a * 1.3 + t / 50) * d * h / 2);
      GG.rect(g, px, py, 2, 2, cols[i % cols.length]);
    }
  }
  GG.cloud = cloud;

  /* ======================================================== I EAST EGG */
  /*
   * Polo ponies, down from Lake Forest. One grazes until it sees Nick ahead,
   * whinnies and charges; it can't be hurt, but a stomp bounces off its back.
   */
  GG.ent('pony', {
    w: 24, h: 16,
    init(e) { e.foe = true; e.invincible = true; e.state = 'graze'; e.k = 0; e.face = e.face || -1; e.ox = e.x; },
    update(e, W) {
      const dx = H.dx(e, W), dy = H.dy(e, W);
      e.vy = Math.min(5, e.vy + 0.3);
      e.k++;
      if (e.state === 'graze') {
        e.vx *= 0.8;
        if (e.k > 40 && Math.sign(dx) === e.face && Math.abs(dx) < 120 && Math.abs(dy) < 32) { e.state = 'rear'; e.k = 0; W.sfx('neigh'); }
        else if (e.k > 200 && Math.abs(dx) > 40) { e.face = Math.sign(dx) || e.face; e.k = 0; }
      } else if (e.state === 'rear') {
        e.vx = 0;
        if (e.k > 30) { e.state = 'charge'; e.k = 0; }
      } else if (e.state === 'charge') {
        e.vx = e.face * 2.5;
        if (e.k % 8 === 0) GG.dust(e.x + e.w / 2 - e.face * 10, e.y + e.h, true);
        // Stops at a wall, a ledge, or when it has run a good way.
        const fx = e.face > 0 ? e.x + e.w + 2 : e.x - 2;
        const below = GG.kindAt(W.lv, Math.floor(fx / 16), Math.floor((e.y + e.h + 2) / 16));
        if (e.hitWall || e.k > 150 || !(GG.isSolid(below) || below === K.ONEWAY)) { e.state = 'graze'; e.k = 0; e.vx = 0; e.face *= -1; }
      }
      GG.moveBody(e, W.lv);
      if (e.y > W.lv.ph + 32) e.dead = true;
      const h = W.hero;
      if (GG.hit(h, e) && !W.dying) {
        if (h.vy > 0.5 && h.y + h.h - h.vy <= e.y + 6) {
          h.vy = GG.input.held.a ? -6 : -4.4; h.y = e.y - h.h; h.jumping = true; W.sfx('stomp');
        } else if (e.state === 'charge') W.hurt(e, 1);
      }
    },
    draw(e, W, g, cx, cy) {
      const f = e.state === 'charge' ? H.anim(e, ['run1', 'run2', 'run3', 'run2'], 4) : e.state === 'rear' ? 'run1' : 'idle';
      GG.drawOn(g, 'pony', f, e, cx, cy, e.face < 0);
    },
  });

  /*
   * "A breeze blew through the room, blew curtains in at one end and out the
   * other like pale flags." A curtain billows out from a window as a platform,
   * then falls slack.
   */
  GG.ent('curtain', {
    w: 16, h: 8, floor: false,
    init(e) {
      e.always = true; e.solid = false; e.dir = e.dir || 1; e.len = 0; e.max = (e.max || 4) * 16;
      e.ax = e.x + (e.dir > 0 ? 0 : 16); e.y = e.y + 4; e.period = e.period || 220; e.phase = e.phase || 0;
    },
    update(e, W) {
      const p = (e.t + e.phase) % e.period;
      // Out over 50 frames, hold, back in over 30, slack for the rest.
      const out = 50, hold = e.period * 0.45, back = 30;
      let f;
      if (p < out) f = p / out;
      else if (p < out + hold) f = 1;
      else if (p < out + hold + back) f = 1 - (p - out - hold) / back;
      else f = 0;
      const len = Math.round(f * e.max / 4) * 4;
      const on = H.standing(e, W);
      e.len = len;
      e.solid = len >= 16;
      const nx = e.dir > 0 ? e.ax : e.ax - len;
      e.dx = 0; e.dy = 0;
      e.x = nx; e.w = Math.max(1, len);
      if (on && !e.solid) W.hero.onGround = false;
      if (p === 0) W.sfx('wave');
    },
    draw(e, W, g, cx, cy) {
      if (e.len < 4) return;
      const n = Math.ceil(e.len / 16);
      for (let i = 0; i < n; i++) {
        const fr = (Math.floor(e.t / 8) + i) % 2 ? 'curtain1' : 'curtain2';
        const x = e.dir > 0 ? e.ax + i * 16 : e.ax - (i + 1) * 16;
        const clip = Math.min(16, e.len - i * 16);
        g.save(); g.beginPath();
        g.rect(e.dir > 0 ? x - cx : x + 16 - clip - cx, e.y - 2 - cy, clip, 14); g.clip();
        GG.drawSprite(g, 'props', fr, x - cx, e.y - 2 - cy + Math.round(Math.sin((e.t + i * 9) / 7)), e.dir < 0);
        g.restore();
      }
    },
  });

  /*
   * "The only completely stationary object in the room was an enormous couch
   * on which two young women were buoyed up as though upon an anchored
   * balloon." Not stationary here. Landing on it ends the chapter.
   */
  GG.ent('couch', {
    w: 48, h: 8, floor: false,
    init(e) { e.always = true; e.solid = true; e.ox = e.x - 16; e.oy = e.y + 8; e.x = e.ox; e.y = e.oy; },
    update(e, W) {
      const ny = e.oy - (Math.sin(e.t / 50) + 1) * 12;
      const on = H.carry(e, W, e.ox + Math.sin(e.t / 80) * 3, ny);
      if (on && !W.done) { W.say('"I\'M P-PARALYSED WITH HAPPINESS."', 'DAISY', 200); W.clear(); }
    },
    draw(e, W, g, cx, cy) {
      const x = Math.round(e.x) - cx, y = Math.round(e.y) - cy;
      // "As though upon an anchored balloon": moored to the floor at both ends.
      if (e.floorY === undefined) {
        let ty = Math.floor((e.oy + 8) / 16);
        while (ty < W.lv.h && !GG.isSolid(GG.kindAt(W.lv, Math.floor((e.ox + 24) / 16), ty))) ty++;
        e.floorY = ty * 16;
      }
      const fy = e.floorY - cy;
      for (const rx of [5, 42]) {
        const ax = Math.round(e.ox) + rx - cx;
        for (let ry = y + 2; ry < fy - 2; ry++) GG.rect(g, Math.round(x + rx + (ax - x - rx) * (ry - y) / (fy - y)), ry, 1, 1, GG.nes.col(0x27));
        GG.rect(g, ax - 2, fy - 3, 5, 3, GG.nes.col(0x07));
      }
      GG.drawSprite(g, 'props', 'couch', x, y - 6);
      // Daisy and Jordan, in white.
      const bob = Math.floor(e.t / 40) % 2 ? 'idle2' : 'idle';
      const d = GG.SPR.daisy && GG.SPR.daisy[bob], j = GG.SPR.jordan && GG.SPR.jordan[bob];
      if (j) GG.drawSprite(g, 'jordan', bob, x + 4, y - j.h + 2, false);
      if (d) GG.drawSprite(g, 'daisy', bob, x + 26, y - d.h + 2, true);
    },
  });

  /* ================================================== II THE VALLEY OF ASHES */
  /*
   * "Men who move dimly and already crumbling through the powdery air." Stomp
   * one or hit it with a bond and it falls to a heap of ash; give it a while
   * and it stands up again. Diggers stir up clouds with their spades.
   */
  GG.ent('ashman', {
    w: 12, h: 22, hp: 1,
    init(e) { e.foe = true; e.keep = true; e.state = 'walk'; e.k = 0; e.face = e.face || -1; e.speed = e.speed || 0.3; },
    update(e, W) {
      e.k++;
      if (e.state === 'walk') {
        if (e.dig) {
          e.vx = 0; e.vy = Math.min(5, e.vy + 0.3); GG.moveBody(e, W.lv);
          e.face = Math.sign(H.dx(e, W)) || e.face;
          if (e.k % 150 === 100) {
            W.add(GG.spawn('ashcloud', e.x + e.w / 2 + e.face * 10, e.y - 4, { vx: e.face * 0.35 }));
            W.sfx('crumble');
          }
        } else H.patrol(e, W, e.speed, true);
        H.contact(e, W);
      } else if (e.state === 'down') {
        e.vx = 0; e.vy = Math.min(5, e.vy + 0.3); GG.moveBody(e, W.lv);
        if (e.k > 240 && !GG.hit(W.hero, { x: e.x - 8, y: e.y - 8, w: e.w + 16, h: e.h + 8 })) { e.state = 'rise'; e.k = 0; }
      } else if (e.state === 'rise') {
        if (e.k > 40) { e.state = 'walk'; e.k = 0; e.hp = 1; e.foe = true; }
      }
    },
    onDie(e, W) {
      e.state = 'down'; e.k = 0; e.foe = false; W.sfx('crumble');
      H.burst(W, e.x + 6, e.y + 10, 12, [0x10, 0x00, 0x2d], { spread: 2.4, up: 2, g: 0.1, life: 30 });
    },
    draw(e, W, g, cx, cy) {
      let f;
      if (e.state === 'down') f = e.k < 8 ? 'crumble1' : e.k < 16 ? 'crumble2' : 'pile';
      else if (e.state === 'rise') f = e.k < 14 ? 'pile' : e.k < 28 ? 'crumble2' : 'rise';
      else if (e.dig) f = H.anim(e, ['dig1', 'dig1', 'dig2'], 20);
      else f = H.anim(e, ['walk1', 'idle', 'walk2', 'idle'], 12);
      GG.drawOn(g, 'ashman', f, e, cx, cy, e.face < 0);
    },
  });

  /* Ash stirred up into "an impenetrable cloud". Drifts, then settles. */
  GG.ent('ashcloud', {
    w: 22, h: 16, floor: false,
    init(e) { e.always = true; e.x -= e.w / 2; e.life = e.life || 260; e.cols = e.cols || [0x10, 0x00, 0x2d, 0x20]; if (e.glow) { e.light = e.glow; e.lx = 11; } },
    update(e, W) {
      e.x += e.vx || 0; e.y += Math.sin(e.t / 20) * 0.25 + (e.vy || 0);
      if (e.t > 20 && e.t < e.life - 30 && GG.hit(W.hero, { x: e.x + 3, y: e.y + 3, w: e.w - 6, h: e.h - 6 })) W.hurt(e, 1);
      if (e.t > e.life) e.dead = true;
    },
    draw(e, W, g, cx, cy) {
      const s = Math.min(1, e.t / 20, (e.life - e.t) / 30);
      if (s <= 0) return;
      const w = e.w * s, h = e.h * s;
      cloud(g, e.x + (e.w - w) / 2 - cx, e.y + (e.h - h) / 2 - cy, w, h, e.t, e.cols);
    },
  });

  /*
   * "Occasionally a line of grey cars crawls along an invisible track, gives
   * out a ghastly creak, and comes to rest." A car to ride: it creaks along
   * a stretch, rests, and creaks back.
   */
  GG.ent('ashcar', {
    w: 48, h: 8, floor: false,
    init(e) { e.always = true; e.solid = true; e.ox = e.x; e.y = e.y + 2 + (e.sink || 0); e.range = (e.range || 6) * 16; e.pos = 0; e.dir = 1; e.rest = 60; },
    update(e, W) {
      let nx = e.x;
      if (e.rest > 0) { e.rest--; if (e.rest === 0) W.sfx('creak'); }
      else {
        e.pos += e.dir * 0.55;
        if (e.pos >= e.range || e.pos <= 0) { e.pos = GG.clamp(e.pos, 0, e.range); e.dir *= -1; e.rest = 90; }
        nx = e.ox + e.pos;
      }
      H.carry(e, W, nx, e.y);
    },
    draw(e, W, g, cx, cy) {
      // A car's wheels run on the ground (its "invisible track"); a barge sits low in the water.
      if (e.art === 'barge') GG.drawSprite(g, 'big', 'barge', Math.round(e.x) - cx, Math.round(e.y) - 3 - cy);
      else GG.drawSprite(g, 'big', 'ashcar', Math.round(e.x) - cx, Math.round(e.y) - cy);
    },
  });

  /*
   * The train. Where the tracks run (from here, `len` tiles to the right),
   * a crossing bell rings and then a train comes through from the right. Get
   * up off the tracks.
   */
  GG.ent('train', {
    w: 16, h: 32, floor: false,
    init(e) { e.always = true; e.x0 = e.x; e.x1 = e.x + (e.len || 30) * 16; e.ty = e.y + 16; e.state = 'wait'; e.k = 0; e.period = e.period || 360; },
    update(e, W) {
      const h = W.hero;
      const inside = h.x + h.w > e.x0 - 64 && h.x < e.x1 + 64;
      e.k++;
      if (e.state === 'wait') {
        if (inside && e.k > e.period) { e.state = 'warn'; e.k = 0; }
      } else if (e.state === 'warn') {
        if (e.k % 30 === 1) W.sfx('bell');
        if (e.k > 100) { e.state = 'run'; e.k = 0; e.tx = Math.max(e.x1, W.cam.x + SW) + 16; W.sfx('train'); }
      } else if (e.state === 'run') {
        e.tx -= 6;
        W.shake = Math.max(W.shake, 2);
        const len = 3 * 64;
        const box = { x: e.tx, y: e.ty - 40, w: len, h: 40 };
        if (GG.hit(h, box)) W.hurt(box, 1);
        if (e.k % 20 === 0) W.sfx('train');
        if (e.tx + len < Math.min(e.x0, W.cam.x) - 16) { e.state = 'wait'; e.k = 0; }
      }
    },
    draw(e, W, g, cx, cy) {
      // A crossing signal at each end, flashing while it warns.
      const lit = e.state === 'warn' && Math.floor(e.k / 15) % 2;
      for (const x of [e.x0, e.x1]) GG.drawSprite(g, 'big', lit ? 'signalOn' : 'signal', x - cx, e.ty - 32 - cy);
      if (e.state !== 'run') return;
      GG.drawSprite(g, 'big', 'loco', Math.round(e.tx) - cx, e.ty - 40 - cy);
      for (let i = 1; i < 3; i++) GG.drawSprite(g, 'big', 'coach', Math.round(e.tx) + i * 64 - cx, e.ty - 40 - cy);
    },
  });

  /* ============================================================ III THE PARTY */
  /* A guest who has had a few. Wanders, totters, changes his mind. */
  GG.ent('guest', {
    w: 12, h: 22, hp: 1,
    init(e) { e.foe = true; e.face = e.face || -1; e.k = 0; e.next = 60; e.speed = 0.35; },
    update(e, W) {
      e.k++;
      if (e.k > e.next) {
        e.k = 0; e.next = 40 + Math.floor(GG.rand() * 90);
        const r = GG.rand();
        e.totter = r < 0.3; if (r > 0.6) e.face *= -1;
        e.speed = 0.2 + GG.rand() * 0.5;
      }
      if (e.totter) { e.vx = Math.sin(e.t / 6) * 0.3; e.vy = Math.min(5, e.vy + 0.3); GG.moveBody(e, W.lv); }
      else H.patrol(e, W, e.speed, true);
      H.contact(e, W);
    },
    draw(e, W, g, cx, cy) {
      const f = e.totter ? 'totter' : H.anim(e, ['walk1', 'idle', 'walk2', 'idle'], 10);
      GG.drawOn(g, e.spr || 'guest', f, e, cx, cy, e.face < 0);
    },
  });

  /*
   * Doing the Charleston. Kicks in place, then hops toward Nick. The yellow
   * twins ("two girls in twin yellow dresses") hop together.
   */
  GG.ent('flapper', {
    w: 12, h: 22, hp: 1,
    init(e) { e.foe = true; e.k = e.phase || 0; e.spr = e.spr || 'flapper'; },
    update(e, W) {
      e.k++;
      const dx = H.dx(e, W);
      e.vy = Math.min(5, e.vy + 0.3);
      if (e.onGround) {
        e.vx *= 0.7;
        if (e.k % 90 === 0 && Math.abs(dx) < 140) {
          e.face = Math.sign(dx) || e.face;
          e.vy = -4.2; e.vx = e.face * 1.1;
          W.sfx('jump');
        } else if (Math.abs(dx) > 8) e.face = Math.sign(dx) || e.face;
      }
      GG.moveBody(e, W.lv);
      if (e.y > W.lv.ph + 32) e.dead = true;
      H.contact(e, W);
    },
    draw(e, W, g, cx, cy) {
      const f = !e.onGround ? 'jump' : H.anim(e, ['kick1', 'idle', 'kick2', 'idle'], 7);
      GG.drawOn(g, e.spr, f, e, cx, cy, e.face < 0);
    },
  });
  GG.ent('twins', {
    w: 16, h: 16,
    init(e, W) {
      e.dead = true;
      if (!W) return;
      for (const ox of [-8, 8]) W.add(GG.spawn('flapper', e.x + ox, e.y, { spr: 'twin', phase: 0, noAdd: true }));
    },
  });

  /*
   * "There was a machine in the kitchen which could extract the juice of two
   * hundred oranges in half an hour." It also throws out the halves.
   */
  GG.ent('juicer', {
    w: 16, h: 16, z: -1,
    init(e) { e.dir = e.dir || -1; e.rate = e.rate || 110; e.n = 0; },
    update(e, W) {
      if (e.t % e.rate === 0 && Math.abs(H.dx(e, W)) < 260) {
        e.n++;
        // Every fifth one comes out whole, and is good for you.
        if (e.n % 5 === 0) W.add(GG.spawn('orange', e.x + 3 + e.dir * 12, e.y - 6, { noAdd: true }));
        else W.add(GG.spawn('roller', e.x + 4, e.y + 4, { vx: e.dir * (1.1 + GG.rand() * 0.4), noAdd: true }));
        W.sfx('pop');
      }
    },
    draw(e, W, g, cx, cy) { GG.drawSprite(g, 'big', e.t % e.rate < 10 ? 'juicer2' : 'juicer', e.x - cx, e.y - cy, e.dir > 0); },
  });
  GG.ent('roller', {
    w: 8, h: 8, floor: false,
    init(e) { e.foe = true; e.bounces = 1; },
    update(e, W) {
      e.vy = Math.min(5, e.vy + 0.25);
      const vx = e.vx;
      GG.moveBody(e, W.lv);
      if (e.hitWall) { if (e.bounces-- > 0) e.vx = -vx; else { e.dead = true; H.burst(W, e.x + 4, e.y + 4, 6, [0x27, 0x37]); } }
      if (e.y > W.lv.ph + 16 || e.t > 900 || GG.inKind(e, W.lv, K.WATER)) e.dead = true;
      H.contact(e, W);
    },
    onDie(e, W) { W.sfx('pop'); H.burst(W, e.x + 4, e.y + 4, 8, [0x27, 0x37, 0x28]); },
    draw(e, W, g, cx, cy) { GG.drawSprite(g, 'shots', Math.floor(e.t / 6) % 2 ? 'orange2' : 'orange', Math.round(e.x) - cx, Math.round(e.y) - cy, e.vx < 0); },
  });

  /*
   * Someone standing still who is the end of the chapter: Gatsby on the marble
   * steps, Dan Cody on his deck. Locked until the items are found.
   */
  GG.ent('npcgoal', {
    w: 14, h: 22,
    init(e) { e.warned = 0; e.face = e.face || -1; },
    update(e, W) {
      if (e.warned > 0) e.warned--;
      e.vy = Math.min(5, e.vy + 0.3); GG.moveBody(e, W.lv);
      if (!GG.hit(W.hero, { x: e.x - 6, y: e.y, w: e.w + 12, h: e.h }) || W.done || W.dying) return;
      if (W.items < W.itemsNeeded) {
        if (!e.warned) { W.say(W.def.lockedText || `FIND ALL ${W.itemsNeeded} FIRST.`, null, 160); W.sfx('locked'); e.warned = 200; }
        return;
      }
      if (e.line) W.say(e.line, e.who, 200);
      W.clear();
    },
    draw(e, W, g, cx, cy) {
      const f = W.done && GG.SPR[e.spr].reach ? 'reach' : Math.floor(e.t / 40) % 2 && GG.SPR[e.spr].idle2 ? 'idle2' : 'idle';
      GG.drawOn(g, e.spr, f, e, cx, cy, W.hero.x < e.x);
      if (W.items >= W.itemsNeeded && W.itemsNeeded && e.t % 40 < 20) GG.text(g, '^', e.x + e.w / 2 - 4 - cx, e.y - 14 - cy, 0x28);
    },
  });

  /* Something to touch that ends the chapter: the medal. */
  GG.ent('prize', {
    w: 14, h: 16,
    init(e) { e.baseY = e.y; },
    update(e, W) {
      e.y = e.baseY + Math.round(Math.sin(e.t / 14) * 2);
      if (e.t % 8 === 0) W.part({ kind: 'px', x: e.x + GG.rand() * 14, y: e.y + GG.rand() * 16, vx: 0, vy: -0.3, t: 0, life: 20, col: 0x28 });
      if (GG.hit(W.hero, e) && !W.done && !W.dying) {
        e.dead = true; W.sfx('item');
        if (e.line) W.say(e.line, e.who, 260);
        W.clear();
      }
    },
    draw(e, W, g, cx, cy) {
      const s = GG.SPR.items[e.art];
      if (s) GG.drawSprite(g, 'items', e.art, e.x + e.w / 2 - s.w / 2 - cx, e.y + e.h - s.h - cy);
      if (e.t % 50 < 8) GG.drawSprite(g, 'fx', 'glint1', e.x + e.w - 4 - cx, e.y - 4 - cy);
    },
  });

  /* ===================================================== IV THE QUEENSBORO BRIDGE */
  /*
   * Gatsby's car: "a rich cream colour, bright with nickel... terraced with a
   * labyrinth of windshields." It keeps pace with the scrolling screen; its
   * top is a terrace of boxes Nick can stand on. A girder can still scrape him
   * off the back.
   */
  const CAR_TOP = [
    // [x, y, w] of each standable surface, relative to the car's top-left.
    [3, 1, 21],     // the hat-boxes strapped on the back
    [24, 9, 8],     // the back of the rear seat
    [32, 13, 9],    // the rear tub
    [41, 4, 5],     // the tonneau wind-shield
    [46, 9, 10],    // the back of the front seat
    [56, 15, 9],    // beside the driver
    [65, 2, 5],     // the front wind-shield
    [70, 16, 33],   // the long hood
    [103, 8, 7],    // the radiator cap
  ];
  GG.CAR_TOP = CAR_TOP;
  GG.ent('car', {
    w: 112, h: 36, floor: false,
    init(e, W) {
      e.always = true; e.z = -1;
      e.parts = [];
      e.screenX = e.screenX === undefined ? 40 : e.screenX;
      e.y = e.y + 16 - e.h;
      if (!W) return;
      for (const [x, y, w] of CAR_TOP) e.parts.push(W.add(GG.spawn('carpart', e.x + x, e.y + y, { w, ox: x, oy: y, car: e, noAdd: true })));
    },
    update(e, W) {
      const target = W.cam.x + e.screenX;
      const nx = W.t < 2 ? target : e.x + GG.clamp(target - e.x, -2, 2);
      // A little bounce at every joint in the roadway.
      const bump = (Math.floor(nx / 64) % 2) && (nx % 64) < 6 ? -1 : 0;
      e.dx = nx - e.x; e.x = nx; e.bump = bump;
      for (const p of e.parts) H.carry(p, W, e.x + p.ox, e.y + p.oy + bump);
      e.spin = (e.spin || 0) + Math.abs(e.dx);
    },
    draw(e, W, g, cx, cy) {
      GG.drawSprite(g, 'props', Math.floor(e.spin / 6) % 2 ? 'gatsbyCar2' : 'gatsbyCar', Math.round(e.x) - cx, Math.round(e.y + e.bump) - cy);
    },
  });
  GG.ent('carpart', {
    w: 16, h: 6, floor: false,
    init(e) { e.always = true; e.solid = true; e.step = 6; },
    update() {},
    draw() {},
  });

  /*
   * "A dead man passed us in a hearse heaped with blooms." In the far lane,
   * going the other way; nothing to do with us.
   */
  GG.ent('hearse', {
    w: 80, h: 32, z: -2,
    init(e) { e.always = true; e.go = false; },
    update(e, W) {
      if (!e.go && e.x < W.cam.x + SW + 40) { e.go = true; e.x = W.cam.x + SW + 8; W.say('"A DEAD MAN PASSED US IN A HEARSE HEAPED WITH BLOOMS."', null, 180); }
      if (e.go) { e.x -= 1.4; e.spin = (e.spin || 0) + 2.5; }
      if (e.go && e.x + e.w < W.cam.x - 16) e.dead = true;
    },
    draw(e, W, g, cx, cy) {
      if (!e.go) return;
      GG.drawSprite(g, 'props', Math.floor(e.spin / 6) % 2 ? 'hearse2' : 'hearse', Math.round(e.x) - cx, Math.round(e.y) - 6 - cy, true);
    },
  });

  /* A motorcycle policeman, coming up the roadway from behind. */
  GG.ent('cop', {
    w: 26, h: 18, hp: 1,
    init(e) { e.foe = true; e.always = true; e.face = 1; e.speed = e.speed || 2.2; },
    update(e, W) {
      e.vx = e.speed; e.vy = Math.min(5, e.vy + 0.3);
      GG.moveBody(e, W.lv);
      if (e.t % 6 === 0) W.part({ kind: 'dust', x: e.x, y: e.y + e.h - 3, vx: -0.4, vy: -0.2, t: 0, life: 16 });
      if (e.hitWall || e.x > W.cam.x + SW + 40 || e.y > W.lv.ph) e.dead = true;
      H.contact(e, W);
    },
    onDie(e, W) { H.poof(e, W); W.part({ kind: 'text', text: 'KNOW YOU NEXT TIME!', x: e.x + 13, y: e.y - 4, t: 0, life: 60, col: 0x30 }); },
    draw(e, W, g, cx, cy) { GG.drawOn(g, 'cop', Math.floor(e.t / 4) % 2 ? 'ride1' : 'ride2', e, cx, cy, false); },
  });

  /* ================================================================ V THE SHIRTS */
  /*
   * "He took out a pile of shirts and began throwing them, one by one, before
   * us." From the top of the house they come fluttering down; stand on them.
   */
  GG.ent('shirtfall', {
    w: 16, h: 16, floor: false,
    init(e) { e.always = true; e.rate = e.rate || 70; e.k = e.phase || 0; e.spread = (e.spread || 0) * 16; },
    update(e, W) {
      // Only while the hero is somewhere below and not too far.
      const h = W.hero;
      if (h.y < e.y || h.y - e.y > (e.reach || 40) * 16) return;
      if (++e.k % e.rate === 0) {
        const x = e.x + (e.spread ? Math.round((GG.rand() - 0.5) * e.spread / 8) * 8 : 0);
        W.add(GG.spawn('shirt', x, e.y, { noAdd: true, speed: e.speed || 0.55 }));
      }
    },
    draw() {},
  });
  GG.ent('shirt', {
    w: 16, h: 6, floor: false,
    init(e) { e.solid = true; e.always = true; e.ox = e.x; e.fy = e.y; },
    update(e, W) {
      const on = H.standing(e, W);
      e.fy += e.speed * (on ? 1.25 : 1);
      const nx = e.ox + Math.sin(e.t / 22) * 6;
      H.carry(e, W, nx, e.fy);
      const k = GG.kindAt(W.lv, Math.floor((e.x + 8) / 16), Math.floor((e.y + 6) / 16));
      if (GG.isSolid(k) || e.y > W.cam.y + 260 || e.y > W.lv.ph) { e.dead = true; }
    },
    draw(e, W, g, cx, cy) { GG.drawSprite(g, 'props', Math.floor(e.t / 10) % 2 ? 'shirt1' : 'shirt2', Math.round(e.x) - cx, Math.round(e.y) - 2 - cy); },
  });

  /* ========================================================= VI LAKE SUPERIOR */
  GG.ent('crayfish', {
    w: 14, h: 8, hp: 1,
    init(e) { e.foe = true; e.face = e.face || -1; },
    update(e, W) { H.patrol(e, W, 0.45); if (H.contact(e, W) === 'hurt') e.face *= -1; },
    draw(e, W, g, cx, cy) { GG.drawOn(g, 'crayfish', H.anim(e, ['a', 'b'], 8), e, cx, cy, e.face < 0); },
  });

  /*
   * "He borrowed a rowboat, pulled out to the Tuolomee." A ferry: step in and
   * it rows itself to the other end of its run, bobbing on the swell, so he
   * can go back ashore for anything he forgot.
   */
  GG.ent('rowboat', {
    w: 48, h: 6, floor: false,
    init(e) { e.always = true; e.solid = true; e.ox = e.x; e.oy = e.y + 10; e.y = e.oy; e.dist = (e.range || 12) * 16; e.pos = 0; e.dir = 1; e.on = false; },
    update(e, W) {
      const on = H.standing(e, W);
      if (on && !e.on && (e.pos <= 0 || e.pos >= e.dist)) { e.dir = e.pos <= 0 ? 1 : -1; W.sfx('splash'); }
      e.on = on;
      if (on) {
        e.pos = GG.clamp(e.pos + e.dir * 0.7, 0, e.dist);
        if (e.t % 40 === 0 && e.pos > 0 && e.pos < e.dist) W.sfx('swim');
      }
      H.carry(e, W, e.ox + e.pos, e.oy + Math.sin(e.t / 18) * 2);
    },
    draw(e, W, g, cx, cy) { GG.drawSprite(g, 'props', 'rowboat', Math.round(e.x) - cx, Math.round(e.y) - 4 - cy); },
  });

  /* =========================================================== VII THE PLAZA */
  /* An electric fan on the floor: it blows him along. */
  GG.ent('fan', {
    w: 16, h: 16, z: -1,
    init(e) { e.dir = e.dir || 1; e.reach = (e.reach || 6) * 16; e.power = e.power || 0.9; },
    update(e, W) {
      const h = W.hero;
      const zone = e.dir > 0 ? { x: e.x + 16, y: e.y - 24, w: e.reach, h: 40 } : { x: e.x - e.reach, y: e.y - 24, w: e.reach, h: 40 };
      if (GG.hit(h, zone)) W.blow = (W.blow || 0) + e.dir * e.power * (1 - Math.abs(h.x + h.w / 2 - (e.x + 8)) / (e.reach + 24));
      if (e.t % 5 === 0) W.part({ kind: 'px', x: e.x + 8 + e.dir * 10, y: e.y + 2 + GG.rand() * 10, vx: e.dir * 2.4, vy: 0, t: 0, life: Math.round(e.reach / 2.4), col: 0x30, layer: -1 });
    },
    draw(e, W, g, cx, cy) { GG.drawSprite(g, 'big', Math.floor(e.t / 3) % 2 ? 'fan1' : 'fan2', e.x - cx, e.y - cy, e.dir < 0); },
  });

  /* ========================================================= VIII THE ARGONNE */
  GG.ent('rat', {
    w: 14, h: 8, hp: 1,
    init(e) { e.foe = true; e.face = e.face || -1; },
    update(e, W) {
      H.patrol(e, W, 0.8);
      // Bit him: turn tail and run the other way.
      if (H.contact(e, W) === 'hurt') e.face = Math.sign(e.x + e.w / 2 - (W.hero.x + W.hero.w / 2)) || e.face;
    },
    draw(e, W, g, cx, cy) { GG.drawOn(g, 'rat', H.anim(e, ['a', 'b'], 6), e, cx, cy, e.face < 0); },
  });

  /* A flare goes up, hangs, and drifts down, lighting the ground. */
  GG.ent('flare', {
    w: 4, h: 4, floor: false,
    init(e) { e.always = true; e.vy = -3.2; e.vx = (GG.rand() - 0.5) * 0.6; e.light = 0; e.lx = 2; e.ly = 2; },
    update(e, W) {
      if (e.t < 40) { e.vy += 0.07; e.light = 30; }
      else { e.vy = 0.25; e.light = Math.min(130, 30 + (e.t - 40) * 4); }
      if (e.t > 300) e.light = Math.max(0, 130 - (e.t - 300) * 3);
      e.x += e.vx; e.y += e.vy;
      if (e.t > 345) e.dead = true;
      if (e.t % 3 === 0) W.part({ kind: 'px', x: e.x + 1, y: e.y + 3, vx: 0, vy: 0.3, t: 0, life: 22, col: e.t % 6 ? 0x10 : 0x28, layer: -1 });
    },
    draw(e, W, g, cx, cy) { GG.rect(g, Math.round(e.x) - cx, Math.round(e.y) - cy, 3, 3, e.t % 4 < 2 ? 0x30 : 0x38); },
  });

  /*
   * A shell: a whistle and a mark on the ground where it will land, then the
   * burst. Spawned by the stage (see stages.js) near where the hero is going.
   */
  GG.ent('shell', {
    w: 32, h: 24, floor: false,
    init(e) { e.always = true; e.k = 0; e.fuse = e.fuse || 80; },
    update(e, W) {
      e.k++;
      if (e.k === 1) W.sfx('whistle');
      if (e.k === e.fuse) { W.sfx('boom'); W.shake = 10; W.flash = 3; W.flashCol = 0x27; H.burst(W, e.x + 16, e.y + 22, 14, [0x08, 0x18, 0x0f], { spread: 4, up: 4, g: 0.2, life: 34, s: 2 }); }
      if (e.k >= e.fuse && e.k < e.fuse + 14 && GG.hit(W.hero, { x: e.x + 4, y: e.y, w: 24, h: 24 })) W.hurt(e, 1);
      // In the dark the mark has to be seen: it glows while it blinks.
      e.light = e.k >= e.fuse ? 70 : 18; e.lx = 16; e.ly = 22;
      if (e.k > e.fuse + 24) e.dead = true;
    },
    draw(e, W, g, cx, cy) {
      const x = e.x - cx, y = e.y - cy;
      if (e.k < e.fuse) {
        // The mark: a cross that blinks faster as it comes.
        const rate = e.k > e.fuse - 30 ? 3 : 8;
        if (Math.floor(e.k / rate) % 2) { GG.rect(g, x + 12, y + 22, 8, 1, 0x16); GG.rect(g, x + 15, y + 19, 2, 6, 0x16); }
        return;
      }
      const k = e.k - e.fuse;
      GG.drawSprite(g, 'fx', k < 5 ? 'boom1' : k < 12 ? 'boom2' : 'boom3', x, y - 8);
    },
  });

  /* ===================================================== IX BOATS AGAINST THE CURRENT */
  /*
   * A skiff drifting back on the current. It runs from its start leftward
   * `range` tiles, then is gone, and another comes on from where it began.
   */
  GG.ent('boat', {
    w: 40, h: 6, floor: false,
    init(e) {
      e.always = true; e.solid = true; e.ox = e.x; e.oy = e.y + 10; e.y = e.oy;
      e.range = (e.range || 10) * 16; e.speed = e.speed || 0.45; e.pos = (e.start || 0) * 16; e.alpha = 1;
    },
    update(e, W) {
      e.pos += e.speed;
      if (e.pos > e.range) {
        // Sinks out of sight at the end of its run; comes back at the start.
        if (H.standing(e, W)) W.hero.onGround = false;
        e.pos = 0; e.solid = true;
      }
      const sinking = e.pos > e.range - 24;
      e.solid = !sinking;
      H.carry(e, W, e.ox - e.pos, e.oy + Math.sin((e.t + e.ox) / 20) * 1.5 + (sinking ? (e.pos - e.range + 24) / 3 : 0));
    },
    draw(e, W, g, cx, cy) {
      const sinking = e.pos > e.range - 24;
      if (sinking && Math.floor(e.t / 2) % 2) return;
      GG.drawSprite(g, 'props', 'skiff', Math.round(e.x) - cx, Math.round(e.y) - 4 - cy, true);
    },
  });
  GG.ent('buoy', {
    w: 14, h: 6, floor: false,
    init(e) { e.always = true; e.solid = true; e.ox = e.x + 1; e.oy = e.y + 8; e.y = e.oy; },
    update(e, W) {
      H.carry(e, W, e.ox, e.oy + Math.sin((e.t + e.ox) / 24) * 3);
      if ((e.t + e.ox) % 240 === 0 && Math.abs(H.dx(e, W)) < 200) W.sfx('bell');
    },
    draw(e, W, g, cx, cy) { GG.drawSprite(g, 'props', 'buoy', Math.round(e.x) - 1 - cx, Math.round(e.y) - 10 - cy); },
  });

  /*
   * The green light at the end of Daisy's dock. "It eluded us then, but that's
   * no matter." Twice, as he comes near, it slips farther out along the dock.
   */
  GG.ent('greenlight', {
    w: 16, h: 32,
    init(e) { e.always = true; e.stops = (e.stops || []).map((s) => s * 16); e.n = 0; e.moving = 0; e.light = 40; e.ly = 4; },
    update(e, W) {
      const h = W.hero;
      if (e.moving) {
        e.x += (e.tx - e.x) * 0.04;
        if (Math.abs(e.tx - e.x) < 1) { e.x = e.tx; e.moving = 0; }
        return;
      }
      if (W.done || W.dying) return;
      if (Math.abs(h.x + h.w / 2 - (e.x + 8)) < 28 && Math.abs(h.y + h.h - (e.y + e.h)) < 40) {
        if (e.n < e.stops.length) {
          e.tx = e.stops[e.n]; e.moving = 1;
          W.say(e.n === 0 ? '"IT ELUDED US THEN, BUT THAT\'S NO MATTER--"' : '"TOMORROW WE WILL RUN FASTER, STRETCH OUT OUR ARMS FURTHER..."', null, 200);
          W.sfx('bell');
          e.n++;
        } else {
          W.def.clearPose = 'reach';
          W.clear();
        }
      }
    },
    draw(e, W, g, cx, cy) {
      // A post at the end of the dock and the light on it, pulsing, with its
      // trail across the water.
      const x = Math.round(e.x) - cx, y = Math.round(e.y) - cy;
      const pulse = (Math.sin(W.t / 18) + 1) / 2;
      const r = 9 + Math.round(pulse * 4);
      for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
        const d = Math.hypot(dx, dy) / r;
        if (d > 1 || d < 0.3) continue;
        if (GG.bayer(x + 8 + dx, y + 3 + dy) < (1 - d) * 0.55) GG.rect(g, x + 8 + dx, y + 3 + dy, 1, 1, d < 0.6 ? 0x2a : 0x1a);
      }
      const wy = (W.lv.h - 3) * 16 - cy;
      for (let i = 0; i < 9; i++) {
        const ry = wy + 3 + i * 5, w = 2 + ((i + Math.floor(W.t / 10)) % 3) * 2;
        GG.rect(g, x + 8 - w / 2 + Math.round(Math.sin((W.t + i * 20) / 15) * 2), ry, w, 1, i % 2 ? 0x1a : 0x2a);
      }
      // The post in silhouette and the lamp: two greens and white, one
      // sprite palette (see palette.js), like everything else about it.
      GG.rect(g, x + 7, y + 6, 2, 26, 0x1a);
      GG.rect(g, x + 4, y - 1, 8, 8, 0x1a);
      GG.rect(g, x + 5, y, 6, 6, 0x2a);
      GG.rect(g, x + 6, y + 1, 3, 3, 0x30);
    },
  });
})();
