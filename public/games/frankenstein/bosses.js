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
    init(e) { e.foe = true; e.name = 'M. KREMPE'; e.state = 'wait'; e.k = 0; e.face = -1; e.volley = 0; },
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
