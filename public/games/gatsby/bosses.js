'use strict';
/* GATSBY.EXE: the bosses, and what's left of them afterwards. */
(() => {
  const H = GG.EH;
  const SW = GG.W;

  /* Someone beaten: sits there a moment, says a last line, then the chapter ends. */
  GG.ent('fallen', {
    w: 16, h: 22,
    update(e, W) {
      e.vy = Math.min(5, (e.vy || 0) + 0.3); GG.moveBody(e, W.lv);
      if (e.t === 20 && e.line) W.say(e.line, e.who, 200);
      if (e.t === (e.after || 200)) W.clear();
    },
    draw(e, W, g, cx, cy) { GG.drawOn(g, e.spr, e.frame || 'hurt', e, cx, cy, e.face < 0); },
  });

  /* Shared: a boss wakes when the arena locks (stages.js sets e.wake). */
  function wake(e, W, line, who) {
    e.state = 'intro'; e.k = 0; W.boss = e;
    GG.audio && GG.audio.music('boss');
    if (line) W.say(line, who, 200);
  }

  /* ============================================= DOCTOR T. J. ECKLEBURG */
  /*
   * "The eyes of Doctor T. J. Eckleburg are blue and gigantic—their retinas
   * are one yard high. They look out of no face, but, instead, from a pair of
   * enormous yellow spectacles which pass over a nonexistent nose."
   *
   * The billboard is placed by its top-left corner. Each eye is its own foe
   * (a bond to the pupil hurts it); the board looks for Nick, glares a column
   * of ash down on where he stands, weeps cinders, and blinks.
   */
  const BOARD = { w: 208, h: 88, eyes: [[56, 46], [152, 46]] };
  GG.ECKLEBURG = BOARD;
  GG.ent('eckleburg', {
    w: BOARD.w, h: BOARD.h, floor: false,
    init(e, W) {
      e.always = true; e.z = -2; e.name = 'DR. T. J. ECKLEBURG'; e.state = 'wait'; e.k = 0;
      e.hp = 10; e.maxHp = 10; e.next = 0; e.which = 0; e.foe = false;
      if (!W) return;
      e.eyes = BOARD.eyes.map(([ex, ey], i) => W.add(GG.spawn('eye', e.x + ex - 8, e.y + ey - 8, { board: e, i, ex, ey, noAdd: true })));
    },
    update(e, W) {
      e.k++;
      const alive = e.eyes.filter((x) => !x.shut);
      e.hp = e.eyes.reduce((s, x) => s + Math.max(0, x.hp), 0);
      if (e.state === 'wait') {
        if (e.wake) wake(e, W, '"THE GIANT EYES OF DOCTOR T. J. ECKLEBURG KEPT THEIR VIGIL." NOW THEY LOOKED AT ME.', null);
        return;
      }
      if (e.state === 'intro') { if (e.k > 150) { e.state = 'fight'; e.k = 0; } return; }
      if (e.state === 'done') {
        if (e.k === 30) W.say('"THEY LOOK OUT OF NO FACE." IT WAS ONLY AN ADVERTISEMENT, AFTER ALL.', null, 200);
        if (e.k === 240) W.clear();
        return;
      }
      if (!alive.length) {
        e.state = 'done'; e.k = 0; W.boss = null; W.sfx('bossDie'); W.shake = 16;
        for (let i = 0; i < 30; i++) W.part({ kind: 'px', x: e.x + GG.rand() * e.w, y: e.y + GG.rand() * e.h, vx: (GG.rand() - 0.5) * 1.5, vy: GG.rand() * 1.5, g: 0.05, t: 0, life: 60, col: [0x28, 0x12, 0x30, 0x10][i % 4], s: 2 });
        return;
      }
      const angry = alive.length === 1;
      // Every so often both eyes blink; otherwise an eye squints and glares.
      if (e.k >= e.next) {
        const roll = (e.k / 7) % 3;
        if (roll < 1 && !angry) { for (const x of alive) x.blink = 40; e.next = e.k + 70; }
        else {
          const eye = alive[e.which++ % alive.length];
          eye.squint = 40;
          W.add(GG.spawn('glare', W.hero.x + W.hero.w / 2 - 8, 0, { eye, noAdd: true, fast: angry }));
          e.next = e.k + (angry ? 90 : 130);
        }
      }
      // Cinders, like tears, when one eye is gone.
      if (angry && e.k % 70 === 35) {
        const eye = alive[0];
        const t = 50;
        W.add(GG.spawn('shot', eye.x + 8, eye.y + 16, { vx: (W.hero.x - eye.x) / t, vy: -1, g: 0.12, art: 'ash', chip: 0x10, noAdd: true }));
        W.sfx('toss');
      }
    },
    // Drawn behind the scaffolding, from the stage's drawBack hook.
    draw() {},
    drawBoard(e, W, g, cx, cy) {
      GG.drawSprite(g, 'big', 'board', Math.round(e.x) - cx, Math.round(e.y) - cy);
      GG.text(g, 'DR. T. J. ECKLEBURG', Math.round(e.x + e.w / 2) - cx, Math.round(e.y) + e.h - 13 - cy, 0x10, { align: 'center' });
      for (const eye of e.eyes || []) GG.DEF.eye.drawEye(eye, W, g, cx, cy);
    },
  });

  GG.ent('eye', {
    w: 16, h: 16, hp: 5, floor: false, hitFrames: 30,
    init(e) { e.always = true; e.foe = true; e.ox = e.x; e.oy = e.y; e.blink = 0; e.squint = 0; e.lx = 0; e.ly = 0; },
    update(e, W) {
      if (e.shut) { e.foe = false; return; }
      if (e.blink > 0) e.blink--;
      if (e.squint > 0) e.squint--;
      e.invincible = e.blink > 0 || e.board.state !== 'fight';
      // Look at him.
      const dx = W.hero.x + W.hero.w / 2 - (e.ox + 8), dy = W.hero.y + 6 - (e.oy + 8);
      const d = Math.max(1, Math.hypot(dx, dy));
      e.lx += (GG.clamp(dx / d * 10, -9, 9) - e.lx) * 0.1;
      e.ly += (GG.clamp(dy / d * 6, -4, 6) - e.ly) * 0.1;
      e.x = e.ox + e.lx; e.y = e.oy + e.ly;
      H.contact(e, W, { harmless: true });
    },
    onHit(e, W) { W.sfx('bossHit'); W.shake = 4; },
    onDie(e, W) {
      e.shut = true; e.foe = false; e.hp = 0; W.sfx('bossHit'); W.shake = 10;
      H.burst(W, e.x + 8, e.y + 8, 16, [0x12, 0x30, 0x28], { spread: 3, up: 2, g: 0.1, life: 40, s: 2 });
    },
    draw() {},
    drawEye(e, W, g, cx, cy) {
      // The iris and pupil, then the lid (drawn over it by how closed it is).
      const ex = e.board.x + e.ex - cx, ey = e.board.y + e.ey - cy;
      const flash = e.hitT > 0 && Math.floor(e.hitT / 3) % 2;
      if (!e.shut) GG.drawSprite(g, 'big', flash ? 'irisHit' : 'iris', Math.round(e.x) - cx - 4, Math.round(e.y) - cy - 4);
      const closed = e.shut ? 1 : e.blink > 0 ? (e.blink > 30 || e.blink < 10 ? 0.6 : 1) : e.squint > 0 ? 0.45 : 0;
      if (closed > 0) {
        const frame = closed >= 1 ? 'lid3' : closed > 0.5 ? 'lid2' : 'lid1';
        GG.drawSprite(g, 'big', frame, ex - 26, ey - 15);
      }
    },
  });

  /* The glare: a warning on the ground, then a column of ash pours down. */
  GG.ent('glare', {
    w: 16, h: 16, floor: false,
    init(e, W) {
      e.always = true; e.warn = e.fast ? 34 : 46;
      if (!W) return;
      const gy = GG.groundBelow(W, e.x + 8, W.cam.y + 16, 16);
      e.gy = gy === null ? W.cam.y + 208 : gy;
    },
    update(e, W) {
      if (e.t === e.warn) { W.sfx('crumble'); W.shake = 4; }
      const col = { x: e.x + 2, y: W.cam.y, w: 12, h: e.gy - W.cam.y };
      if (e.t >= e.warn && e.t < e.warn + 40 && GG.hit(W.hero, col)) W.hurt(col, 1);
      if (e.t >= e.warn && e.t % 3 === 0) W.part({ kind: 'px', x: e.x + 2 + GG.rand() * 12, y: e.gy - 2, vx: (GG.rand() - 0.5) * 2, vy: -GG.rand() * 1.5, g: 0.1, t: 0, life: 18, col: 0x10 });
      if (e.t > e.warn + 46) e.dead = true;
    },
    draw(e, W, g, cx, cy) {
      const x = e.x - cx;
      if (e.t < e.warn) {
        // A shadow gathering where it will fall, and a glint from the eye.
        for (let i = 0; i < 16; i++) if ((i + Math.floor(e.t / 3)) % 2) GG.rect(g, x + i, e.gy - cy - 1, 1, 1, 0x00);
        if (e.t % 8 < 4) GG.rect(g, x + 7, e.gy - cy - 3, 2, 2, 0x12);
        return;
      }
      const top = 0, bot = e.gy - cy;
      const k = e.t - e.warn;
      const w = k < 4 ? 6 : k > 36 ? 6 : 12;
      for (let y = top; y < bot; y += 2) {
        for (let i = 0; i < w; i += 2) {
          const c = ((y + i + e.t * 3) % 6) < 3 ? 0x10 : 0x00;
          GG.rect(g, x + 8 - w / 2 + i + ((y >> 2) % 2), y, 2, 2, c);
        }
      }
    },
  });

  /* ======================================================= MEYER WOLFSHEIM */
  /*
   * "He's the man who fixed the World's Series back in 1919." He pitches:
   * a fastball low and straight, a curve that climbs and drops, a lob at
   * where Nick stands. Then he runs the bases to the other side of the room.
   */
  GG.ent('wolfsheim', {
    w: 14, h: 22, hp: 10, hitFrames: 26,
    init(e) { e.always = true; e.foe = true; e.name = 'MEYER WOLFSHIEM'; e.state = 'wait'; e.k = 0; e.face = -1; e.n = 0; },
    update(e, W) {
      const dx = H.dx(e, W);
      e.vy = Math.min(5, e.vy + 0.3);
      e.k++;
      const angry = e.hp <= 4;
      e.invincible = e.state === 'wait' || e.state === 'intro';
      if (e.state === 'wait') {
        e.k = 0;
        if (e.wake) wake(e, W, '"I UNDERSTAND YOU\'RE LOOKING FOR A BUSINESS GONNEGTION."', 'MEYER WOLFSHIEM');
      } else if (e.state === 'intro') {
        e.face = Math.sign(dx) || e.face;
        if (e.k > 150) { e.state = 'windup'; e.k = 0; }
      } else if (e.state === 'windup') {
        e.face = Math.sign(dx) || e.face; e.vx = 0;
        if (e.k > (angry ? 22 : 34)) {
          const kind = e.n % 3;
          const x = e.x + e.w / 2 + e.face * 8, y = e.y + 7;
          if (kind === 0) W.add(GG.spawn('shot', x, y + 4, { vx: e.face * (angry ? 4.2 : 3.6), vy: 0, g: 0, art: 'baseball', chip: 0x30, noAdd: true }));
          else if (kind === 1) W.add(GG.spawn('shot', x, y, { vx: e.face * 2.8, vy: -2.6, g: 0.08, art: 'baseball', bounce: 1, chip: 0x30, noAdd: true }));
          else { const t = 48; W.add(GG.spawn('shot', x, y, { vx: dx / t, vy: -4.4, g: 0.18, art: 'baseball', bounce: 1, chip: 0x30, noAdd: true })); }
          W.sfx('pitch');
          e.n++; e.state = 'follow'; e.k = 0;
        }
      } else if (e.state === 'follow') {
        if (e.k > 18) {
          if (e.n % (angry ? 4 : 3) === 0) { e.state = 'run'; e.k = 0; }
          else { e.state = 'windup'; e.k = 0; }
        }
      } else if (e.state === 'run') {
        if (e.k === 1) {
          // Rounding the bases: a hop to the other side of the room.
          const mid = W.arenaX + SW / 2;
          const target = e.x > mid ? W.arenaX + 36 : W.arenaX + SW - 50;
          e.vx = (target - e.x) / 56; e.vy = -5.0; e.face = Math.sign(e.vx);
          W.sfx('jump');
        }
        if (e.k > 4 && e.onGround) { e.vx = 0; e.state = 'tired'; e.k = 0; W.shake = 5; W.sfx('land'); GG.dust(e.x + e.w / 2, e.y + e.h); }
      } else if (e.state === 'tired') {
        if (e.k % 20 === 0) W.part({ kind: 'px', x: e.x + e.w / 2 + e.face * 6, y: e.y + 4, vx: e.face * 0.3, vy: -0.5, t: 0, life: 24, col: 0x30, s: 2 });
        if (e.k > (angry ? 45 : 75)) { e.state = 'windup'; e.k = 0; }
      }
      GG.moveBody(e, W.lv);
      if (e.state !== 'wait' && e.state !== 'intro') H.contact(e, W);
    },
    onHit(e, W) { W.sfx('bossHit'); },
    onDie(e, W) {
      W.sfx('bossDie'); W.shake = 12; W.boss = null;
      W.add(GG.spawn('fallen', e.x, e.y, { spr: 'wolfsheim', frame: 'sit', face: e.face, w: e.w, h: e.h, noAdd: true, line: '"GATSBY\'S VERY CAREFUL ABOUT WOMEN. HE WOULD NEVER SO MUCH AS LOOK AT A FRIEND\'S WIFE."', who: 'MEYER WOLFSHIEM' }));
    },
    draw(e, W, g, cx, cy) {
      const f = e.state === 'run' && !e.onGround ? 'pitch' : e.state === 'windup' ? 'windup' : e.state === 'follow' ? 'pitch' : e.hitT > 0 ? 'hurt' : 'idle';
      GG.drawOn(g, 'wolfsheim', f, e, cx, cy, e.face < 0);
      if (e.state === 'tired' && Math.floor(e.k / 10) % 2) GG.text(g, '$', e.x + e.w / 2 - 4 - cx, e.y - 12 - cy, 0x2a, { shadow: 0x0f });
    },
  });

  /* ========================================================== TOM BUCHANAN */
  /*
   * "One of the most powerful ends that ever played football at New Haven."
   * He crouches and charges; cards bounce off him while he's coming. If he
   * hits the wall he's dazed, and open. Or he launches a flying tackle.
   */
  GG.ent('tom', {
    w: 18, h: 28, hp: 10, hitFrames: 26,
    init(e) { e.always = true; e.foe = true; e.name = 'TOM BUCHANAN'; e.state = 'wait'; e.k = 0; e.face = -1; e.n = 0; },
    update(e, W) {
      const dx = H.dx(e, W);
      e.vy = Math.min(5.5, e.vy + 0.32);
      e.k++;
      const angry = e.hp <= 4;
      e.invincible = e.state === 'charge' || e.state === 'wait' || e.state === 'intro';
      if (e.state === 'wait') {
        e.k = 0;
        if (e.wake) {
          wake(e, W, '"I SUPPOSE THE LATEST THING IS TO SIT BACK AND LET MR. NOBODY FROM NOWHERE MAKE LOVE TO YOUR WIFE."', 'TOM');
        }
      } else if (e.state === 'intro') {
        e.face = Math.sign(dx) || e.face;
        if (e.k === 170) W.say('"YOUR WIFE DOESN\'T LOVE YOU." "SHE\'S NEVER LOVED YOU. SHE LOVES ME."', 'GATSBY', 170);
        if (e.k > 300) { e.state = 'crouch'; e.k = 0; }
      } else if (e.state === 'crouch') {
        e.vx = 0; e.face = Math.sign(dx) || e.face;
        if (e.k === 1) W.sfx('alarm');
        if (e.k > (angry ? 26 : 40)) { e.state = 'charge'; e.k = 0; W.sfx('neigh'); }
      } else if (e.state === 'charge') {
        e.vx = e.face * (angry ? 3.8 : 3.2);
        if (e.k % 6 === 0) GG.dust(e.x + e.w / 2 - e.face * 8, e.y + e.h, true);
        const edge = e.vx < 0 ? e.x < W.arenaX + 4 : e.x + e.w > W.arenaX + SW - 4;
        if (e.hitWall || edge) {
          e.state = 'dazed'; e.k = 0; e.vx = -e.face * 1.5; e.vy = -2.5; W.shake = 14; W.sfx('smash');
          // The whole suite shakes: ice and julep glasses fall from the sideboard.
          for (let i = 0; i < (angry ? 4 : 3); i++) W.add(GG.spawn('shot', W.arenaX + 24 + GG.rand() * 208, W.cam.y + 30, { vx: 0, vy: 0.5 + i * 0.3, g: 0.2, art: i % 2 ? 'ice' : 'glass', chip: 0x31, noAdd: true }));
        }
      } else if (e.state === 'dazed') {
        if (e.onGround) e.vx *= 0.8;
        if (e.k > (angry ? 70 : 100)) { e.n++; e.state = e.n % 2 ? 'leap' : 'crouch'; e.k = 0; }
      } else if (e.state === 'leap') {
        if (e.k === 1) { e.face = Math.sign(dx) || e.face; e.vy = -5.8; e.vx = GG.clamp(dx / 44, -3, 3); W.sfx('jump'); }
        if (e.k > 4 && e.onGround) {
          e.vx = 0; W.shake = 10; W.sfx('land'); GG.dust(e.x + e.w / 2, e.y + e.h);
          e.state = angry && !e.again ? 'leap' : 'recover'; e.again = !e.again && angry; e.k = 0;
        }
      } else if (e.state === 'recover') {
        e.vx = 0;
        if (e.k > (angry ? 40 : 60)) { e.state = 'crouch'; e.k = 0; }
      }
      GG.moveBody(e, W.lv);
      if (e.state === 'wait' || e.state === 'intro') return;
      if (e.state === 'dazed') H.contact(e, W, { harmless: true });
      else H.contact(e, W, { stomp: e.state !== 'charge' });
    },
    onHit(e, W) { W.sfx('bossHit'); },
    onDie(e, W) {
      W.sfx('bossDie'); W.shake = 14; W.boss = null;
      W.add(GG.spawn('fallen', e.x, e.y, { spr: 'tom', frame: 'sit', face: e.face, w: e.w, h: e.h, noAdd: true, line: '"SHE\'S NOT LEAVING ME!" "CERTAINLY NOT FOR A COMMON SWINDLER WHO\'D HAVE TO STEAL THE RING HE PUT ON HER FINGER."', who: 'TOM', after: 240 }));
    },
    draw(e, W, g, cx, cy) {
      let f = 'idle';
      if (e.state === 'crouch') f = 'crouch';
      else if (e.state === 'charge') f = H.anim(e, ['run1', 'run2'], 5);
      else if (e.state === 'leap') f = e.onGround ? 'crouch' : 'leap';
      else if (e.state === 'dazed' || e.hitT > 0) f = 'hurt';
      GG.drawOn(g, 'tom', f, e, cx, cy, e.face < 0);
      if (e.state === 'dazed') {
        for (let i = 0; i < 3; i++) {
          const a = e.k / 8 + i * 2.1;
          GG.text(g, '*', Math.round(e.x + e.w / 2 - 4 + Math.cos(a) * 10) - cx, Math.round(e.y - 10 + Math.sin(a) * 3) - cy, 0x28, { shadow: 0x0f });
        }
      }
    },
  });
  /* Cards glance off him while he charges. */
  const prevDamage = H.damage;
  H.damage = (e, W, n, src) => {
    if (e.type === 'tom' && e.invincible && src && src.type === 'card') { W.sfx('clack'); return false; }
    return prevDamage(e, W, n, src);
  };
})();
