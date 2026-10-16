'use strict';
/* FRANKEN.EXE: bosses, and the scripted figures that act like bosses. */
(() => {
  const H = FK.EH;

  /* Something defeated: sits there a moment, says a last line, then clears. */
  FK.ent('fallen', {
    w: 16, h: 22,
    update(e, W) {
      e.vy = Math.min(5, (e.vy || 0) + 0.3); FK.moveBody(e, W.lv);
      if (e.t === 20 && e.line) W.say(e.line, e.who, 150);
      if (e.t === (e.after || 170)) W.clear();
    },
    draw(e, W, g, cx, cy) { FK.drawOn(g, e.spr, e.frame || 'hurt', e, cx, cy, e.face < 0); },
  });

  /*
   * M. Krempe. Throws volleys of books, hops to the far side of the hall,
   * catches his breath. Flasks and stomps both land.
   */
  FK.ent('krempe', {
    w: 14, h: 22, hp: 7, hitFrames: 24,
    init(e) { e.always = true; e.foe = true; e.name = 'M. KREMPE'; e.state = 'wait'; e.k = 0; e.face = -1; e.volley = 0; },
    update(e, W) {
      const dx = H.dx(e, W);
      e.vy = Math.min(5, e.vy + 0.3);
      if (e.state === 'wait') {
        if (e.wake) { e.state = 'intro'; e.k = 0; W.boss = e; FK.audio && FK.audio.music('boss'); W.say('EVERY INSTANT THAT YOU HAVE WASTED ON THOSE BOOKS IS UTTERLY AND ENTIRELY LOST!', 'M. KREMPE', 200); }
      } else if (e.state === 'intro') {
        e.face = Math.sign(dx) || e.face;
        if (++e.k > 150) { e.state = 'throw'; e.k = 0; e.volley = 0; }
      } else if (e.state === 'throw') {
        e.face = Math.sign(dx) || e.face;
        e.vx = 0;
        e.k++;
        const gap = e.hp <= 3 ? 20 : 28;
        if (e.k % gap === 0) {
          // Aim an arc at where the hero stands, with a little spread.
          const t = 46 + (e.volley % 3) * 6;
          const tx = W.hero.x + W.hero.w / 2 + (e.volley % 3 - 1) * 14;
          W.add(FK.spawn('shot', e.x + e.w / 2, e.y + 2, { vx: (tx - (e.x + e.w / 2)) / t, vy: -4.2 + (e.volley % 2) * 0.6, g: 0.17, art: 'book', chip: 0x37 }));
          W.sfx('toss');
          e.throwT = 10;
          e.volley++;
          if (e.volley >= (e.hp <= 3 ? 4 : 3)) { e.state = 'hop'; e.k = 0; }
        }
      } else if (e.state === 'hop') {
        if (e.k === 0) {
          // Jump to the other side of the hall.
          const mid = W.arenaX + 128;
          const target = e.x > mid ? W.arenaX + 40 : W.arenaX + 200;
          e.vx = (target - e.x) / 56; e.vy = -5.2; e.face = Math.sign(e.vx);
          W.sfx('jumpBig');
        }
        e.k++;
        if (e.k > 4 && e.onGround) { e.vx = 0; e.state = 'tired'; e.k = 0; W.shake = 6; W.sfx('land'); FK.dust(e.x + e.w / 2, e.y + e.h); }
      } else if (e.state === 'tired') {
        e.k++;
        if (e.k % 20 === 0) W.part({ kind: 'px', x: e.x + e.w / 2 + e.face * 6, y: e.y + 6, vx: e.face * 0.3, vy: -0.5, t: 0, life: 24, col: 0x30, s: 2 });
        if (e.k > (e.hp <= 3 ? 50 : 80)) { e.state = 'throw'; e.k = 0; e.volley = 0; }
      }
      if (e.throwT > 0) e.throwT--;
      FK.moveBody(e, W.lv);
      if (e.state !== 'wait') H.contact(e, W);
    },
    onHit(e, W) { W.sfx('bossHit'); },
    onDie(e, W) {
      W.sfx('bossDie'); W.shake = 12;
      W.boss = null;
      W.add(FK.spawn('fallen', e.x, e.y, { spr: 'krempe', frame: 'sit', face: e.face, line: 'NATURAL PHILOSOPHY... IS A SCIENCE OF A DIFFERENT CHARACTER... OH, MY BACK.', who: 'M. KREMPE', w: e.w, h: e.h }));
    },
    draw(e, W, g, cx, cy) {
      const f = e.state === 'hop' && !e.onGround ? 'hop' : e.throwT > 0 ? 'throw' : e.hitT > 0 ? 'hurt' : 'idle';
      FK.drawOn(g, 'krempe', f, e, cx, cy, e.face < 0);
    },
  });
})();

(() => {
  const H = FK.EH;

  /*
   * The sexton. Lobs clods of grave dirt, charges with his spade, and makes
   * the vault shake when he lands a hop.
   */
  FK.ent('sexton', {
    w: 18, h: 24, hp: 8, hitFrames: 24,
    init(e) { e.always = true; e.foe = true; e.name = 'THE SEXTON'; e.state = 'wait'; e.k = 0; e.face = -1; e.n = 0; },
    update(e, W) {
      const dx = H.dx(e, W);
      e.vy = Math.min(5, e.vy + 0.3);
      e.k++;
      const angry = e.hp <= 4;
      if (e.state === 'wait') {
        e.k = 0;
        if (e.wake) { e.state = 'intro'; W.boss = e; FK.audio && FK.audio.music('boss'); W.say("WHO'S DIGGING IN MY VAULTS AT THIS HOUR?", 'THE SEXTON', 160); }
      } else if (e.state === 'intro') {
        if (e.k > 120) { e.state = 'throw'; e.k = 0; e.n = 0; }
      } else if (e.state === 'throw') {
        e.face = Math.sign(dx) || e.face; e.vx = 0;
        if (e.k % (angry ? 22 : 30) === 0) {
          const t = 44;
          W.add(FK.spawn('shot', e.x + e.w / 2, e.y + 4, { vx: dx / t, vy: -4 - (e.n % 2) * 0.8, g: 0.18, art: 'clod', chip: 0x08 }));
          W.sfx('toss'); e.swingT = 10; e.n++;
          if (e.n >= 3) { e.state = 'charge'; e.k = 0; e.face = Math.sign(dx) || e.face; W.sfx('growl'); }
        }
      } else if (e.state === 'charge') {
        e.vx = e.face * (angry ? 2.2 : 1.7); e.swingT = 4;
        // A wall, or the edge of the locked screen, ends the charge.
        const edge = e.vx < 0 ? e.x < W.arenaX + 8 : e.x + e.w > W.arenaX + FK.W - 8;
        if (e.hitWall || edge || e.k > 140) { e.state = 'hop'; e.k = 0; e.vx = 0; W.shake = 6; }
      } else if (e.state === 'hop') {
        if (e.k === 20) { e.vy = -5.4; e.vx = dx / 60; W.sfx('jumpBig'); }
        if (e.k > 24 && e.onGround) {
          W.shake = 14; W.sfx('smash'); FK.dust(e.x + e.w / 2, e.y + e.h);
          // The ceiling sheds stones.
          for (let i = 0; i < (angry ? 3 : 2); i++) W.add(FK.spawn('shot', W.arenaX + 24 + Math.random() * 208, W.cam.y + 34, { vx: 0, vy: 0.5, g: 0.2, art: 'stone', chip: 0x10 }));
          e.state = 'tired'; e.k = 0; e.vx = 0;
        }
      } else if (e.state === 'tired') {
        if (e.k % 18 === 0) W.part({ kind: 'px', x: e.x + e.w / 2, y: e.y + 4, vx: 0, vy: -0.6, t: 0, life: 20, col: 0x30, s: 2 });
        if (e.k > (angry ? 45 : 75)) { e.state = 'throw'; e.k = 0; e.n = 0; }
      }
      if (e.swingT > 0) e.swingT--;
      FK.moveBody(e, W.lv);
      // Running into Victor ends the charge, so he doesn't carry him along and
      // hit him again the moment his grace runs out.
      if (e.state !== 'wait' && e.state !== 'intro' && H.contact(e, W) === 'hurt' && e.state === 'charge') { e.state = 'tired'; e.k = 0; e.vx = 0; }
    },
    onHit(e, W) { W.sfx('bossHit'); },
    onDie(e, W) {
      W.sfx('bossDie'); W.shake = 12; W.boss = null;
      W.add(FK.spawn('fallen', e.x, e.y, { spr: 'sexton', frame: 'sit', face: e.face, line: 'ALL RIGHT, ALL RIGHT... TAKE WHAT YOU LIKE. THEY WON\'T MISS IT.', who: 'THE SEXTON', w: e.w, h: e.h }));
    },
    draw(e, W, g, cx, cy) {
      const f = e.state === 'hop' && !e.onGround ? 'hop' : e.swingT > 0 ? 'swing' : e.hitT > 0 ? 'hurt' : 'idle';
      FK.drawOn(g, 'sexton', f, e, cx, cy, e.face < 0);
    },
  });

  /* The Creature, close behind you in the rain. Too close and it's over. */
  FK.ent('pursuer', {
    w: 12, h: 28, floor: false,
    init(e) { e.always = true; e.z = 1; },
    update(e, W) {
      if (W.done || W.dying) return;
      // He keeps to the edge of the screen, lunging in now and then (after a
      // moment's grace at the start, so the player can get going).
      const grace = e.t < 180;
      const lunge = grace ? 0 : Math.max(0, Math.sin((e.t - 180) / 70)) * 28;
      const tx = Math.max(2, W.cam.x - (grace ? 24 : 6) + lunge);
      e.vx = FK.clamp((tx - e.x) * 0.1, -2.6, 2.6);
      e.vy = Math.min(5.5, e.vy + 0.3);
      FK.moveBody(e, W.lv);
      if (e.hitWall && e.onGround) e.vy = -5.6;
      if (e.y > W.lv.ph) { e.y = 0; }
      if (e.x < Math.max(2, W.cam.x - 40)) e.x = Math.max(2, W.cam.x - 40);
      if (FK.hit(e, W.hero)) W.kill();
      if (e.t % 400 === 200) W.say(['HE IS GAINING!', 'FASTER!', 'DO NOT LOOK BACK!'][Math.floor(e.t / 400) % 3], 'VICTOR', 80);
    },
    draw(e, W, g, cx, cy) {
      const f = !e.onGround ? 'jump' : ['run1', 'run2', 'run3', 'run2'][Math.floor(e.t / 6) % 4];
      FK.drawOn(g, W.flash > 0 ? 'creature' : 'shade', f, e, cx, cy, false);
    },
  });

  /* High on the rocks, seen only in the lightning. */
  FK.ent('glimpse', {
    w: 12, h: 28, floor: false,
    init(e) { e.always = true; },
    update(e, W) {
      if (W.flash > 6 && !e.seen && Math.abs(H.dx(e, W)) < 200) { e.seen = true; W.say('THAT SHAPE, ON THE ROCKS...', 'VICTOR', 120); }
    },
    draw(e, W, g, cx, cy) { if (W.flash > 0) FK.drawOn(g, 'creature', 'idle', e, cx, cy, true); },
  });

  /*
   * The Creature on the glacier. Victor rushes him; he can't be touched. He
   * leaps away from flasks and over Victor, never striking back, until he's
   * made his point.
   */
  FK.ent('creatureBoss', {
    w: 12, h: 28, hp: 99,
    init(e) { e.always = true; e.state = 'wait'; e.k = 0; e.dodges = 0; e.face = -1; e.foe = true; e.invincible = true; },
    update(e, W) {
      const dx = H.dx(e, W);
      e.vy = Math.min(5.5, e.vy + 0.3);
      e.k++;
      if (e.state === 'wait') {
        e.face = -1;
        if (e.wake) { e.state = 'talk'; e.k = 0; FK.audio && FK.audio.music('boss'); W.say('DEVIL! DO YOU DARE APPROACH ME? BEGONE, VILE INSECT!', 'VICTOR', 180); }
      } else if (e.state === 'talk') {
        // The rest of Victor's line tells the player what to do: go for him.
        if (e.k > 160) { e.state = 'stand'; e.k = 0; W.say('OR RATHER, STAY, THAT I MAY TRAMPLE YOU TO DUST!', 'VICTOR', 150); }
      } else if (e.state === 'stand') {
        e.face = Math.sign(dx) || e.face; e.vx = 0;
        // A flask coming at him, or Victor too close: leap over and away.
        const cx = e.x + e.w / 2;
        const threat = W.ents.some((f) => f.type === 'flask' && Math.abs(f.x - cx) < 50 && Math.sign(f.vx) === -Math.sign(f.x - cx)) || Math.abs(dx) < 26;
        if (threat && e.onGround) {
          // Away from Victor, or straight over his head when he's close, and
          // always landing inside the arena (a leap carries about 105px).
          const lo = W.arenaX + 20, hi = W.arenaX + 220, reach = 105;
          let dir = dx > 0 ? -1 : 1;
          if (Math.abs(dx) < 26) dir = -dir;
          if (e.x + dir * reach < lo || e.x + dir * reach > hi) dir = -dir;
          e.vy = -6.2; e.vx = (FK.clamp(e.x + dir * reach, lo, hi) - e.x) / 41;
          e.state = 'leap'; e.k = 0; e.dodges++;
          W.sfx('jumpBig');
          if (e.dodges === 1) W.say('HE ELUDES ME WITH SUPERHUMAN SPEED.', 'VICTOR', 120);
          if (e.dodges === 4) W.say('I SPRANG ON HIM AGAIN. HE EASILY ELUDED ME.', 'VICTOR', 120);
        }
        if (e.dodges >= 6 || e.k > 700) { e.state = 'plead'; e.k = 0; }
      } else if (e.state === 'leap') {
        if (e.onGround && e.k > 6) { e.vx = 0; e.state = 'stand'; e.k = 0; FK.dust(e.x + e.w / 2, e.y + e.h); }
        if (e.dodges >= 6) { /* finish the leap, then plead */ }
      } else if (e.state === 'plead') {
        e.vx = 0; e.face = Math.sign(dx) || e.face;
        if (e.k === 1) { W.say('BE CALM! I ENTREAT YOU TO HEAR ME, BEFORE YOU GIVE VENT TO YOUR HATRED ON MY DEVOTED HEAD.', 'THE CREATURE', 220); W.lock = true; }
        if (e.k === 230) W.clear();
      }
      FK.moveBody(e, W.lv);
      // Touching him only pushes Victor back.
      if (e.state !== 'wait' && FK.hit(e, W.hero) && !W.dying) { W.hero.vx = Math.sign(-dx || -1) * -2.2; W.hero.vy = Math.min(W.hero.vy, -2); }
      // Flasks shatter harmlessly against him.
      for (const f of W.ents) if (f.type === 'flask' && !f.dead && FK.hit(f, e)) { f.dead = true; W.sfx('glass'); }
    },
    draw(e, W, g, cx, cy) {
      const f = !e.onGround ? 'jump' : e.state === 'plead' ? 'idle2' : 'idle';
      FK.drawOn(g, 'creature', f, e, cx, cy, e.face < 0);
    },
  });

  /* The cottage door: old De Lacey, then Felix. Survive; you can't fight. */
  FK.felixScene = (W) => {
    if (W.felixOn) return false;
    W.felixOn = true;
    W.noAttack = true;
    W.say('"PARDON THIS INTRUSION," I SAID. THE OLD MAN WAS KIND. THEN FELIX CAME IN.', 'THE CREATURE', 200);
    FK.audio && FK.audio.music('boss');
    const goal = W.ents.find((e) => e.type === 'goal');
    W.add(FK.spawn('felix', (goal ? goal.x : W.hero.x) + 40, W.hero.y, {}));
    return false;
  };
  FK.ent('felix', {
    w: 12, h: 22, floor: false,
    init(e) { e.always = true; e.face = -1; e.k = 0; },
    update(e, W) {
      e.k++;
      W.timer = Math.max(0, 15 * 60 - e.k);
      const dx = H.dx(e, W);
      e.face = Math.sign(dx) || e.face;
      const sp = e.k > 600 ? 1.55 : 1.3;
      e.vx = e.k < 60 ? 0 : e.face * sp;
      e.vy = Math.min(5, e.vy + 0.3);
      FK.moveBody(e, W.lv);
      if (e.hitWall && e.onGround) e.vy = -5.2;
      if (e.onGround && Math.abs(dx) < 70 && Math.abs(dx) > 30 && e.k % 50 === 0) e.vy = -4.6;
      if (Math.abs(dx) < 28 && Math.abs(H.dy(e, W)) < 30 && !(e.swingT > 0) && e.k % 24 === 0) { e.swingT = 14; W.sfx('punch'); }
      if (e.swingT > 0) e.swingT--;
      // Only the stick hurts: a swing in front of him.
      if (e.swingT > 4 && e.swingT < 12 && FK.hit({ x: e.x + (e.face > 0 ? e.w - 2 : -14), y: e.y, w: 16, h: e.h }, W.hero)) W.hurt(e, 1);
      if (e.k === 300) W.say('I COULD HAVE TORN HIM LIMB FROM LIMB. I WOULD NOT.', 'THE CREATURE', 140);
      if (W.timer === 0 && !W.done) { W.timer = undefined; W.clear(); }
    },
    draw(e, W, g, cx, cy) {
      const f = e.swingT > 0 ? 'throw' : Math.abs(e.vx) > 0.1 ? ['walk1', 'idle', 'walk2', 'idle'][Math.floor(e.t / 5) % 4] : 'idle';
      FK.drawOn(g, 'felix', f, e, cx, cy, e.face < 0);
    },
  });

  /* The girl on the broken bridge, who falls in. Carry her to the far shore. */
  FK.ent('girl', {
    w: 10, h: 16,
    init(e, W) { e.state = 'play'; e.always = true; if (W) W.itemsNeeded = 1; },
    update(e, W) {
      const h = W.hero;
      W.itemsNeeded = 1;
      if (e.state === 'play') {
        if (Math.abs(H.dx(e, W)) < 70) { e.state = 'fall'; e.vy = -2; e.vx = 0.6; W.sfx('splash'); W.say('THE GIRL! SHE HAS SLIPPED INTO THE RIVER!', 'THE CREATURE', 140); }
      } else if (e.state === 'fall' || e.state === 'drift') {
        const inWater = FK.inKind(e, W.lv, FK.K.WATER, 2);
        if (inWater) {
          if (e.state === 'fall') { e.state = 'drift'; for (let i = 0; i < 8; i++) W.part({ kind: 'px', x: e.x + 5, y: e.y + 8, vx: (Math.random() - 0.5) * 3, vy: -Math.random() * 3, g: 0.2, t: 0, life: 20, col: 0x31 }); }
          // Swept downstream, bobbing at the surface.
          e.vx = e.x < 96 * 16 ? 0.35 : 0;
          const surf = 9 * 16 - 6;
          e.vy = (surf - e.y) * 0.1 + Math.sin(e.t / 8) * 0.3;
        } else e.vy = Math.min(4, e.vy + 0.25);
        e.x += e.vx; e.y += e.vy;
        if (e.state === 'drift' && FK.hit({ x: e.x - 6, y: e.y - 8, w: e.w + 12, h: e.h + 56 }, h)) { e.state = 'carried'; W.sfx('item'); W.say('I HAVE HER. NOW TO THE BANK.', 'THE CREATURE', 100); }
      } else if (e.state === 'carried') {
        e.x = h.x + h.w / 2 - e.w / 2 + h.face * 6; e.y = h.y + 4;
      } else if (e.state === 'safe') {
        e.vy = Math.min(4, e.vy + 0.25); FK.moveBody(e, W.lv);
      }
    },
    draw(e, W, g, cx, cy) {
      const f = e.state === 'play' ? (Math.floor(e.t / 30) % 2 ? 'play' : 'idle') : e.state === 'safe' ? 'idle' : 'fall';
      FK.drawOn(g, 'girl', f, e, cx, cy, e.state === 'carried' ? W.hero.face < 0 : false);
    },
  });
  FK.ent('shore', {
    w: 32, h: 48, floor: false,
    init(e) { e.y -= 32; e.always = true; },
    update(e, W) {
      const girl = W.ents.find((g) => g.type === 'girl');
      if (girl && girl.state === 'carried' && FK.hit(W.hero, e) && W.hero.onGround) {
        girl.state = 'safe'; girl.x = e.x + 4; girl.y = W.hero.y;
        W.items = 1; W.sfx('item');
        W.part({ kind: 'text', text: 'SAVED', x: girl.x + 5, y: girl.y - 8, t: 0, life: 70, col: 0x28 });
        const spot = W.ents.find((s) => s.type === 'rusticSpot');
        if (spot) spot.go = true;
        e.dead = true;
      }
    },
    draw() {},
  });
  FK.ent('rusticSpot', {
    w: 16, h: 16, floor: false,
    init(e) { e.always = true; },
    update(e, W) {
      if (!e.go) return;
      e.dead = true;
      W.add(FK.spawn('person', e.x, e.y, { cx: 0, spr: 'rustic', mode: 'shoot', sight: 14, face: -1, speed: 0.25, hp: 3 }));
      W.say('A MAN WITH A GUN CAME RUNNING. HE TORE HER FROM ME AND RAISED IT.', 'THE CREATURE', 160);
    },
    draw() {},
  });

  /* Food left on the trail. */
  FK.ent('food', {
    w: 14, h: 10,
    update(e, W) {
      if (FK.hit(W.hero, e)) {
        e.dead = true; W.take(e);
        W.hearts = Math.min(W.maxHearts, W.hearts + 1); W.sfx('heart');
        if (!W.fedOnce) { W.fedOnce = true; W.say('A DEAD HARE, LEFT ON THE TRAIL. HE MEANT ME TO FIND IT.', 'VICTOR', 150); }
      }
    },
    draw(e, W, g, cx, cy) { FK.drawSprite(g, 'props', 'hare', e.x - 1 - cx, e.y + e.h - 16 - cy); },
  });

  /* A candle the hero has lit: it stays lit and lights the room. */
  FK.ent('flame', {
    w: 10, h: 12, floor: false,
    init(e) { e.always = true; e.light = 56; e.lx = 5; e.ly = 0; e.z = -1; },
    update() {},
    draw(e, W, g, cx, cy) {
      FK.drawSprite(g, 'items', 'candle', e.x - cx, e.y - cy);
      const f = Math.floor(e.t / 5) % 3;
      FK.rect(g, e.x + 4 + (f === 1 ? -1 : 0) - cx, e.y - 4 - cy, 2, 4, 0x28);
      FK.rect(g, e.x + 4 - cx, e.y - 2 - cy, 1, 2, 0x30);
    },
  });

  /* Now and then, something passes a window. */
  FK.ent('shadow', {
    w: 1, h: 1, floor: false,
    init(e) { e.always = true; e.next = 600; e.show = 0; },
    update(e, W) {
      if (e.show > 0) { e.show--; return; }
      if (--e.next > 0) return;
      e.next = 700 + Math.floor(Math.random() * 500);
      // Find a window in view near the hero.
      const lv = W.lv;
      let best = null;
      for (const a of lv.anim) {
        if (!a.frames[0].startsWith('inn_window')) continue;
        if (a.x < W.cam.x || a.x > W.cam.x + 240) continue;
        if (!best || Math.abs(a.x - W.hero.x) < Math.abs(best.x - W.hero.x)) best = a;
      }
      if (best) { e.wx = best.x; e.wy = best.y; e.show = 50; W.sfx('heartbeat'); W.flash = 3; }
    },
    draw(e, W, g, cx, cy) {
      if (e.show <= 0) return;
      g.save(); g.beginPath(); g.rect(e.wx - cx + 2, e.wy - cy + 2, 12, 12); g.clip();
      const p = (50 - e.show) / 50;
      FK.drawSprite(g, 'shade', 'run1', e.wx - cx - 16 + p * 40, e.wy - cy - 4);
      g.restore();
    },
  });

  /* His sledge, out ahead on the ice. */
  FK.ent('quarry', {
    w: 1, h: 1, floor: false,
    init(e) { e.always = true; e.z = -2; },
    update(e, W) {
      e.sx = 150 + Math.sin(e.t / 90) * 30 + (W.cam.x > W.lv.pw - 300 ? (W.cam.x - (W.lv.pw - 300)) * 0.5 : 0);
    },
    draw(e, W, g, cx, cy) {
      FK.drawSprite(g, 'sledge', Math.floor(e.t / 8) % 2 ? 'a' : 'b', Math.round(e.sx), 98 - cy * 0.5);
    },
  });
})();
