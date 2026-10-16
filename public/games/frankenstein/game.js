'use strict';
/*
 * FRANKEN.EXE: the game. Input, the state machine (title, cinema, stage card,
 * play, pause), the world, the camera, the renderer and the HUD. Entity
 * behaviour lives in ents.js; stages in stage*.js.
 */
(() => {
  const { W: SW, H: SH, K } = FK;
  const EMBED = /[?&]embed\b/.test(location.search);
  const DEBUG = /[?&]debug\b/.test(location.search);
  const SAVE_KEY = 'franken-exe-v1';

  /* ------------------------------------------------------------ canvas */
  const screen = document.getElementById('screen');
  const g = screen.getContext('2d');
  screen.width = SW; screen.height = SH;
  g.imageSmoothingEnabled = false;
  FK.g = g;

  function fit() {
    const wrap = document.getElementById('tv');
    const r = wrap.getBoundingClientRect();
    // Integer scale when it fits; on small screens fill the width instead.
    let s = Math.min(r.width / SW, r.height / SH);
    if (s >= 2) s = Math.floor(s);
    screen.style.width = Math.floor(SW * s) + 'px';
    screen.style.height = Math.floor(SH * s) + 'px';
  }
  addEventListener('resize', fit);
  if (typeof ResizeObserver !== 'undefined') new ResizeObserver(fit).observe(document.getElementById('tv'));

  /* ------------------------------------------------------------- input */
  const KEYMAP = {
    ArrowLeft: 'l', KeyA: 'l', ArrowRight: 'r', KeyD: 'r', ArrowUp: 'u', KeyW: 'u', ArrowDown: 'd', KeyS: 'd',
    KeyZ: 'a', KeyJ: 'a', Space: 'a', KeyX: 'b', KeyK: 'b', ShiftLeft: 'b', ShiftRight: 'b',
    Enter: 'start', KeyP: 'start', Escape: 'select', Backspace: 'select', KeyM: 'mute',
  };
  const held = { l: 0, r: 0, u: 0, d: 0, a: 0, b: 0, start: 0, select: 0 };
  const keyHeld = Object.assign({}, held);
  const touchHeld = Object.assign({}, held);
  const prev = Object.assign({}, held);
  const hit = Object.assign({}, held);
  FK.input = { held, hit };
  let lastInput = 'keys';

  addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const b = KEYMAP[e.code];
    if (!b) return;
    e.preventDefault();
    lastInput = 'keys';
    FK.audio && FK.audio.unlock();
    if (b === 'mute') { if (!e.repeat) toggleSound(); return; }
    keyHeld[b] = 1;
  });
  addEventListener('keyup', (e) => { const b = KEYMAP[e.code]; if (b && b !== 'mute') keyHeld[b] = 0; });
  addEventListener('blur', () => { for (const k in keyHeld) keyHeld[k] = 0; for (const k in touchHeld) touchHeld[k] = 0; });

  // On-screen pad: buttons carry data-btn; a finger can slide between them.
  const pad = document.getElementById('pad');
  const touches = new Map();
  function btnAt(x, y) {
    const el = document.elementFromPoint(x, y);
    const b = el && el.closest && el.closest('[data-btn]');
    return b ? b.dataset.btn : null;
  }
  function syncTouch() {
    for (const k in touchHeld) touchHeld[k] = 0;
    for (const v of touches.values()) if (v) for (const p of v.split(' ')) touchHeld[p] = 1;
    pad.querySelectorAll('[data-btn]').forEach((el) => el.classList.toggle('on', el.dataset.btn.split(' ').every((p) => touchHeld[p])));
  }
  function onTouch(e) {
    e.preventDefault();
    lastInput = 'touch';
    document.body.classList.add('touch');
    FK.audio && FK.audio.unlock();
    for (const t of e.changedTouches) {
      if (e.type === 'touchend' || e.type === 'touchcancel') touches.delete(t.identifier);
      else touches.set(t.identifier, btnAt(t.clientX, t.clientY));
    }
    syncTouch();
  }
  if (pad) for (const ev of ['touchstart', 'touchmove', 'touchend', 'touchcancel']) pad.addEventListener(ev, onTouch, { passive: false });
  // Mouse on the pad too, so it can be tried on a desktop.
  if (pad) {
    pad.addEventListener('mousedown', (e) => { touches.set('m', btnAt(e.clientX, e.clientY)); syncTouch(); FK.audio && FK.audio.unlock(); });
    addEventListener('mouseup', () => { touches.delete('m'); syncTouch(); });
  }
  const muteBtn = document.getElementById('mute');
  if (muteBtn) muteBtn.addEventListener('click', () => { FK.audio && FK.audio.unlock(); toggleSound(); });
  // A tap on the picture is Start, for title screens and cinema on phones.
  screen.addEventListener('touchstart', (e) => { lastInput = 'touch'; document.body.classList.add('touch'); FK.audio && FK.audio.unlock(); tapStart = true; }, { passive: true });
  screen.addEventListener('mousedown', () => { FK.audio && FK.audio.unlock(); tapStart = true; });
  let tapStart = false;

  function pollPad() {
    const out = {};
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (const p of pads) {
      if (!p) continue;
      const b = (i) => p.buttons[i] && p.buttons[i].pressed;
      const ax = p.axes[0] || 0, ay = p.axes[1] || 0;
      if (b(14) || ax < -0.4) out.l = 1;
      if (b(15) || ax > 0.4) out.r = 1;
      if (b(12) || ay < -0.5) out.u = 1;
      if (b(13) || ay > 0.5) out.d = 1;
      if (b(0) || b(3)) out.a = 1;
      if (b(2) || b(1)) out.b = 1;
      if (b(9)) out.start = 1;
      if (b(8)) out.select = 1;
      if (Object.keys(out).length) lastInput = 'pad';
    }
    return out;
  }
  function readInput() {
    const gp = pollPad();
    for (const k in held) {
      held[k] = keyHeld[k] || touchHeld[k] || gp[k] ? 1 : 0;
      hit[k] = held[k] && !prev[k] ? 1 : 0;
      prev[k] = held[k];
    }
    if (tapStart) { hit.tap = 1; tapStart = false; } else hit.tap = 0;
  }
  const confirm = () => hit.a || hit.start || hit.tap;

  /* -------------------------------------------------------------- save */
  function loadSave() {
    try { return Object.assign({ reached: 0, sound: true, cleared: {} }, JSON.parse(localStorage.getItem(SAVE_KEY) || '{}')); }
    catch (e) { return { reached: 0, sound: true, cleared: {} }; }
  }
  const save = loadSave();
  FK.save = save;
  function persist() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {} }
  function toggleSound() {
    save.sound = !save.sound; persist();
    FK.audio && FK.audio.setOn(save.sound);
    toast(save.sound ? 'SOUND ON' : 'SOUND OFF');
    if (muteBtn) muteBtn.setAttribute('aria-pressed', String(!save.sound));
  }
  let toastMsg = null, toastT = 0;
  function toast(m) { toastMsg = m; toastT = 90; }
  FK.toast = toast;

  function quit() {
    if (EMBED) { try { parent.postMessage({ type: 'franken:exit' }, location.origin); } catch (e) {} }
    else location.href = '/games';
  }

  /* ------------------------------------------------------------- states */
  let state = null;
  function go(s) { state = s; if (s.enter) s.enter(); }
  FK.go = go;

  /* ------------------------------------------------------------ world */
  /*
   * W is the running stage. Entities get it passed in; the helpers on it are
   * how they reach the hero, the map, the sounds and each other.
   */
  let W = null;
  FK.world = () => W;

  function startStage(index, opts = {}) {
    const def = FK.stages[index];
    const lv = FK.compile(def);
    buildLayer(lv);
    const hero = FK.makeHero(def.hero, lv.start.x, lv.start.y);
    const maxHearts = def.hero === 'creature' ? 4 : 3;
    W = {
      index, def, lv, hero, ents: [], parts: [], t: 0,
      cam: { x: 0, y: 0 }, shake: 0, flash: 0, dark: def.dark || 0,
      items: 0, itemsNeeded: 0, hearts: maxHearts, maxHearts,
      check: { x: lv.start.x, y: lv.start.y, items: 0, taken: [] },
      taken: [],
      boss: null, done: false, dying: 0, invuln: 0, hurtT: 0, attackT: 0, cool: 0,
      autoscroll: def.autoscroll || 0, banner: null, frozen: 0, msg: null, lock: false,
      mods: {},
    };
    Object.assign(W, worldApi);
    for (const e of lv.ents) {
      if (e.e === 'start') continue;
      spawnFromMap(e);
    }
    const items = W.ents.filter((e) => e.type === 'item').sort((a, b) => a.x - b.x);
    items.forEach((e, i) => {
      if (def.itemNames && def.itemNames[i] && !e.name) e.name = def.itemNames[i];
      if (def.itemSays && def.itemSays[i] && !e.say) { e.say = def.itemSays[i]; e.who = e.who || (def.hero === 'creature' ? 'THE CREATURE' : 'VICTOR'); }
      if (def.itemArts && def.itemArts[i] && !e.art) e.art = def.itemArts[i];
    });
    W.itemsNeeded = items.filter((e) => !e.optional).length;
    if (opts.fromCheck) restoreCheck(opts.fromCheck);
    snapCamera();
    if (def.init) def.init(W);
    FK.audio && FK.audio.music(def.music);
    return W;
  }

  function spawnFromMap(m) {
    const e = FK.spawn(m.e, m.x, m.y, m);
    if (e) e.mapId = m.cx + ',' + m.cy;
    return e;
  }

  function restoreCheck(c) {
    W.check = c;
    W.items = c.items;
    W.taken = c.taken.slice();
    W.ents = W.ents.filter((e) => !(e.mapId && W.taken.includes(e.mapId)));
    const h = W.hero;
    h.x = c.x + 8 - h.w / 2; h.y = c.y + 16 - h.h;
    if (W.def.autoscroll) W.cam.x = Math.max(0, c.x - 48);
    for (const e of W.ents) if (e.type === 'checkpoint' && e.x <= c.x + 1) e.lit = true;
  }

  const worldApi = {
    spawn(type, x, y, props) { return FK.spawn(type, x, y, props); },
    add(e) { W.ents.push(e); return e; },
    part(p) { W.parts.push(p); return p; },
    sfx(n) { FK.audio && FK.audio.sfx(n); },
    hurt(src, dmg = 1) { hurtHero(src, dmg); },
    kill() { killHero(); },
    say(text, who, frames = 150) { W.msg = { text, who, t: frames }; },
    clear() { stageClear(); },
    take(e) { if (e.mapId) W.taken.push(e.mapId); },
  };

  function hurtHero(src, dmg) {
    if (W.invuln > 0 || W.dying || W.done) return;
    W.hearts -= dmg;
    W.sfx('hurt');
    const h = W.hero;
    if (W.hearts <= 0) { killHero(); return; }
    W.invuln = 100; W.hurtT = 24;
    const dir = src ? Math.sign(h.x + h.w / 2 - (src.x + (src.w || 0) / 2)) || -h.face : -h.face;
    h.vx = dir * 1.8; h.vy = -3; h.onLadder = false;
    W.shake = 6;
  }
  function killHero() {
    if (W.dying || W.done) return;
    W.dying = 1; W.hearts = 0;
    FK.audio && FK.audio.music(null);
    W.sfx('die');
  }

  function stageClear() {
    if (W.done) return;
    W.done = 1;
    FK.audio && FK.audio.music(null);
    W.sfx('clear');
    const next = W.index + 1;
    save.cleared[W.def.key] = true;
    if (next > save.reached && next < FK.stages.length) save.reached = next;
    persist();
  }

  /* -------------------------------------------------- static tile layer */
  const hash = (x, y) => { let h = (x * 374761393 + y * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; return (h ^ (h >>> 16)) >>> 0; };
  FK.hash = hash;
  function pickArt(lv, x, y, name, t) {
    if (t.tile) return t.tile;
    if (t.tiles) return t.tiles[hash(x, y) % t.tiles.length];
    if (t.auto) {
      const group = t.group || name;
      const same = (dx, dy) => {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || nx >= lv.w) return true;
        if (ny >= lv.h) return true;
        if (ny < 0) return false;
        const n = lv.terr[ny * lv.w + nx];
        if (!n) return false;
        const nt = lv.ts.terrain[n];
        return (nt.group || n) === group || (t.joins && t.joins.includes(n));
      };
      const top = !same(0, -1);
      const L = !same(-1, 0), R = !same(1, 0);
      const base = t.auto + (top ? '_t' : '_m');
      const cand = [];
      if (L && R) cand.push(base + 'lr');
      if (L) cand.push(base + 'l');
      if (R) cand.push(base + 'r');
      if (!top && !L && !R && t.vary) {
        const v = hash(x, y) % 100;
        for (const [suffix, pct] of t.vary) { if (v < pct) { cand.push(base + suffix); break; } }
      }
      cand.push(base);
      if (!top) cand.push(t.auto + '_t');
      for (const c of cand) if (FK.TILE[c]) return c;
      return null;
    }
    return null;
  }
  function buildLayer(lv) {
    const c = document.createElement('canvas');
    c.width = lv.pw; c.height = lv.ph;
    const lg = c.getContext('2d');
    const fg = document.createElement('canvas');
    fg.width = lv.pw; fg.height = lv.ph;
    const fgg = fg.getContext('2d');
    lv.anim = [];
    for (let y = 0; y < lv.h; y++) {
      for (let x = 0; x < lv.w; x++) {
        const name = lv.terr[y * lv.w + x];
        if (!name) continue;
        const t = lv.ts.terrain[name];
        if (t.under) { const u = FK.TILE[pickArt(lv, x, y, t.under, lv.ts.terrain[t.under])]; if (u) lg.drawImage(u, x * 16, y * 16); }
        if (t.anim) { lv.anim.push({ x: x * 16, y: y * 16, frames: t.anim, rate: t.rate || 12, off: t.sync ? 0 : hash(x, y) % 64, fg: t.fg }); continue; }
        const art = pickArt(lv, x, y, name, t);
        if (!art) continue;
        const img = FK.TILE[art];
        if (!img) { if (DEBUG) console.warn('missing tile art', art); continue; }
        (t.fg ? fgg : lg).drawImage(img, x * 16, y * 16);
      }
    }
    lv.layer = c; lv.fgLayer = fg;
  }
  FK.rebuildCell = (lv, tx, ty) => {
    // A broken block: clear its pixels in the static layer.
    const lg = lv.layer.getContext('2d');
    lg.clearRect(tx * 16, ty * 16, 16, 16);
    const name = lv.terr[ty * lv.w + tx];
    if (name) {
      const t = lv.ts.terrain[name];
      const art = pickArt(lv, tx, ty, name, t);
      if (art && FK.TILE[art]) lg.drawImage(FK.TILE[art], tx * 16, ty * 16);
    }
  };

  /* ------------------------------------------------------------ camera */
  function camTarget() {
    const h = W.hero;
    const lv = W.lv;
    let x = h.x + h.w / 2 - SW / 2 + h.face * 16;
    let y = h.y + h.h / 2 - SH / 2 - 8;
    return { x: FK.clamp(x, 0, Math.max(0, lv.pw - SW)), y: FK.clamp(y, 0, Math.max(0, lv.ph - SH)) };
  }
  function snapCamera() {
    if (W.autoscroll) { W.cam.y = FK.clamp(W.hero.y - SH / 2, 0, Math.max(0, W.lv.ph - SH)); return; }
    const t = camTarget(); W.cam.x = t.x; W.cam.y = t.y;
  }
  function updateCamera() {
    const lv = W.lv;
    if (W.camLock) {
      W.cam.x += (FK.clamp(W.camLock.x, 0, lv.pw - SW) - W.cam.x) * 0.08;
      if (W.camLock.y !== undefined) W.cam.y += (FK.clamp(W.camLock.y, 0, lv.ph - SH) - W.cam.y) * 0.08;
      return;
    }
    if (W.autoscroll && !W.done && !W.dying) {
      W.cam.x = Math.min(lv.pw - SW, W.cam.x + W.autoscroll);
      const ty = FK.clamp(W.hero.y + W.hero.h / 2 - SH / 2, 0, Math.max(0, lv.ph - SH));
      W.cam.y += (ty - W.cam.y) * 0.1;
      return;
    }
    const t = camTarget();
    // Horizontal: ease toward a look-ahead. Vertical: only chase beyond a band.
    W.cam.x += (t.x - W.cam.x) * 0.12;
    const dy = t.y - W.cam.y;
    if (Math.abs(dy) > 24 || W.hero.onGround || W.hero.onLadder) W.cam.y += dy * (W.hero.onGround || W.hero.onLadder ? 0.1 : 0.06);
    W.cam.x = FK.clamp(W.cam.x, 0, Math.max(0, lv.pw - SW));
    W.cam.y = FK.clamp(W.cam.y, 0, Math.max(0, lv.ph - SH));
  }

  /* ---------------------------------------------------------- play loop */
  function playUpdate() {
    W.t++;
    const h = W.hero;
    if (W.msg && --W.msg.t <= 0) W.msg = null;

    if (hit.start || hit.select) { go(pauseState()); return; }

    if (W.dying) {
      W.dying++;
      if (W.dying === 2) { h.vy = -4; h.vx = 0; }
      if (W.dying > 1 && W.dying < 120) { h.vy = Math.min(5, h.vy + 0.2); h.y += h.vy; }
      if (W.dying > 130) {
        const c = W.check;
        startStage(W.index, { fromCheck: c });
      }
      updateParts();
      return;
    }
    if (W.done) {
      W.done++;
      h.vx *= 0.9; h.vy = Math.min(5, h.vy + 0.3);
      FK.moveBody(h, W.lv, platforms());
      updateParts();
      if (W.done > 150) finishStage();
      return;
    }
    if (W.frozen > 0) { W.frozen--; updateParts(); updateCamera(); return; }

    // Hero.
    const lockIn = W.lock || W.hurtT > 0;
    const inp = lockIn
      ? { l: 0, r: 0, u: 0, d: 0, jump: W.hurtT > 0 ? 0 : held.a, jumpHit: 0 }
      : { l: held.l, r: held.r, u: held.u, d: held.d, jump: held.a, jumpHit: hit.a };
    if (W.hurtT > 0) W.hurtT--;
    if (W.invuln > 0) W.invuln--;
    if (W.cool > 0) W.cool--;
    if (W.attackT > 0) W.attackT--;

    const ev = FK.heroStep(h, inp, W.lv, platforms(), W.mods);
    for (const e of ev) {
      if (e === 'jump') W.sfx(h.type === 'creature' ? 'jumpBig' : 'jump');
      if (e === 'land') { W.sfx('land'); dust(h.x + h.w / 2, h.y + h.h); }
      if (e === 'swim') W.sfx('swim');
    }
    if (h.onGround && Math.abs(h.vx) > 0.6 && W.t % 10 === 0 && !h.inWater) dust(h.x + h.w / 2 - h.face * 4, h.y + h.h, true);

    // Attack.
    if (hit.b && !lockIn && W.cool === 0 && !h.onLadder && !W.noAttack) {
      if (h.type === 'victor') {
        if (W.ents.filter((e) => e.type === 'flask').length < 2) {
          W.add(FK.spawn('flask', h.x + h.w / 2 + h.face * 6, h.y + 6, { dir: h.face, vx: h.face * 2.6 + h.vx * 0.4, vy: -2.6 }));
          W.attackT = 14; W.cool = 16; W.sfx('throw');
        }
      } else {
        W.attackT = 16; W.cool = 22; W.sfx('punch');
        W.add(FK.spawn('punch', h.x + (h.face > 0 ? h.w : -14), h.y + 6, { dir: h.face }));
      }
    }

    // Autoscroll keeps the hero on screen; the left edge crushes.
    if (W.autoscroll) {
      if (h.x < W.cam.x) { h.x = W.cam.x; if (FK.isSolid(FK.kindAt(W.lv, Math.floor((h.x + h.w) / 16), Math.floor((h.y + h.h / 2) / 16)))) killHero(); }
      if (h.x + h.w > W.cam.x + SW) h.x = W.cam.x + SW - h.w;
    } else {
      h.x = FK.clamp(h.x, 0, W.lv.pw - h.w);
    }

    // Tiles that hurt.
    if (FK.inKind(h, W.lv, K.SPIKE, 3)) hurtHero(null, 1);
    if (FK.inKind(h, W.lv, K.DEATH, 2)) killHero();
    if (h.y > W.lv.ph + 8) killHero();

    // Entities.
    for (let i = 0; i < W.ents.length; i++) {
      const e = W.ents[i];
      if (e.dead) continue;
      // Sleep things far off screen (unless they ask not to).
      if (!e.always) {
        const far = e.x + (e.w || 16) < W.cam.x - 96 || e.x > W.cam.x + SW + 96 || e.y > W.cam.y + SH + 160 || e.y + (e.h || 16) < W.cam.y - 160;
        if (far) { e.asleep = true; continue; }
      }
      e.asleep = false;
      FK.update(e, W);
    }
    W.ents = W.ents.filter((e) => !e.dead);
    if (W.def.update) W.def.update(W);
    updateParts();
    updateCamera();
    if (W.shake > 0) W.shake--;
    if (W.flash > 0) W.flash--;
  }

  function platforms() {
    const out = [];
    for (const e of W.ents) if (e.solid && !e.dead) out.push(e);
    return out;
  }

  function finishStage() {
    const def = W.def;
    const next = W.index + 1;
    const after = () => {
      if (next >= FK.stages.length) go(endState());
      else enterStage(next);
    };
    if (def.outro) go(cineState(def.outro, after));
    else after();
  }

  function enterStage(index, skipIntro) {
    const def = FK.stages[index];
    const card = () => go(cardState(index));
    if (def.intro && !skipIntro) go(cineState(def.intro, card));
    else card();
  }
  FK.enterStage = enterStage;

  /* ------------------------------------------------------------ particles */
  function dust(x, y, small) {
    const n = small ? 1 : 4;
    for (let i = 0; i < n; i++) W.parts.push({ x: x + (Math.random() * 8 - 4), y: y - 2, vx: (Math.random() - 0.5) * 1.2, vy: -Math.random() * 0.6, t: 0, life: 18 + Math.random() * 8, kind: 'dust' });
  }
  FK.dust = dust;
  function updateParts() {
    for (const p of W.parts) {
      p.t++;
      p.x += p.vx || 0; p.y += p.vy || 0;
      if (p.g) p.vy += p.g;
    }
    W.parts = W.parts.filter((p) => p.t < p.life);
  }
  function drawParts(cx, cy, layer) {
    for (const p of W.parts) {
      if ((p.layer || 0) !== layer) continue;
      const x = Math.round(p.x - cx), y = Math.round(p.y - cy);
      if (p.kind === 'dust') {
        const r = p.t < p.life * 0.5 ? 2 : 1;
        FK.rect(g, x - (r >> 1), y - (r >> 1), r, r, p.col || 0x10);
      } else if (p.kind === 'px') {
        FK.rect(g, x, y, p.s || 1, p.s || 1, p.col);
      } else if (p.kind === 'spr') {
        FK.drawSprite(g, p.spr, p.frame, x, y, p.flip);
      } else if (p.kind === 'text') {
        FK.text(g, p.text, x, y - Math.floor(p.t / 3), p.col || 0x30, { align: 'center', shadow: 0x0f });
      }
    }
  }

  /* ---------------------------------------------------------- rendering */
  function drawBackground(cx, cy) {
    const bg = FK.BG[W.def.bg];
    if (!bg) { FK.rect(g, 0, 0, SW, SH, 0x0f); return; }
    bg.draw(g, cx, cy, W.t, W);
  }

  function heroFrame() {
    const h = W.hero;
    const pre = h.type;
    if (W.dying) return 'hurt';
    if (W.done && h.onGround && W.def.clearPose) return W.def.clearPose;
    if (W.hurtT > 0) return 'hurt';
    if (h.onLadder) return (Math.floor((h.y) / 6) % 2) ? 'climb1' : 'climb2';
    if (W.attackT > 0 && pre === 'victor') return 'throw';
    if (W.attackT > 0 && pre === 'creature') return 'punch';
    if (!h.onGround) return h.vy < 0 || h.inWater ? 'jump' : (FK.SPR[pre].fall ? 'fall' : 'jump');
    if (Math.abs(h.vx) > 0.25) {
      const cycle = ['run1', 'run2', 'run3', 'run2'];
      h.anim = (h.anim || 0) + Math.abs(h.vx) * 0.11;
      return cycle[Math.floor(h.anim) % 4];
    }
    return Math.floor(W.t / 40) % 2 ? 'idle2' : 'idle';
  }

  function playDraw() {
    let cx = Math.round(W.cam.x), cy = Math.round(W.cam.y);
    if (W.shake) { cx += ((W.t * 7) % 3) - 1; cy += ((W.t * 5) % 3) - 1; }
    drawBackground(cx, cy);
    g.drawImage(W.lv.layer, cx, cy, SW, SH, 0, 0, SW, SH);
    for (const a of W.lv.anim) {
      if (a.fg) continue;
      if (a.x + 16 < cx || a.x > cx + SW || a.y + 16 < cy || a.y > cy + SH) continue;
      const f = a.frames[Math.floor((W.t + a.off) / a.rate) % a.frames.length];
      const img = FK.TILE[f]; if (img) g.drawImage(img, a.x - cx, a.y - cy);
    }
    drawParts(cx, cy, -1);
    const sorted = W.ents.filter((e) => !e.asleep).sort((a, b) => (a.z || 0) - (b.z || 0));
    for (const e of sorted) if ((e.z || 0) < 0) FK.draw(e, W, g, cx, cy);
    // Hero (flickers while invulnerable).
    const h = W.hero;
    if (!(W.invuln > 0 && Math.floor(W.t / 3) % 2) || W.dying) {
      FK.drawOn(g, h.type, heroFrame(), h, cx, cy, h.face < 0);
    }
    for (const e of sorted) if ((e.z || 0) >= 0) FK.draw(e, W, g, cx, cy);
    g.drawImage(W.lv.fgLayer, cx, cy, SW, SH, 0, 0, SW, SH);
    for (const a of W.lv.anim) {
      if (!a.fg) continue;
      const f = a.frames[Math.floor((W.t + a.off) / a.rate) % a.frames.length];
      const img = FK.TILE[f]; if (img) g.drawImage(img, a.x - cx, a.y - cy);
    }
    drawParts(cx, cy, 0);
    if (W.def.drawFx) W.def.drawFx(g, W, cx, cy);
    if (W.dark) drawDark(cx, cy);
    if (W.flash > 0) { g.globalAlpha = Math.min(1, W.flash / 6); FK.rect(g, 0, 0, SW, SH, 0x30); g.globalAlpha = 1; }
    drawHud();
    if (W.dying > 60) fade((W.dying - 60) / 60);
    if (W.done > 40) drawClear();
  }

  /* Darkness: the light around the hero is a dithered disc; lightning lifts it. */
  const darkC = document.createElement('canvas');
  darkC.width = SW; darkC.height = SH;
  const dg = darkC.getContext('2d');
  const darkImg = dg.createImageData(SW, SH);
  function drawDark(cx, cy) {
    if (W.flash > 2) return;
    const h = W.hero;
    const hx = h.x + h.w / 2 - cx, hy = h.y + h.h / 2 - cy;
    const lights = [{ x: hx, y: hy, r: W.lightR || 52 }];
    for (const e of W.ents) if (e.light && !e.asleep) lights.push({ x: e.x + (e.lx || 8) - cx, y: e.y + (e.ly || 8) - cy, r: e.light });
    const d = darkImg.data;
    const level = W.dark;
    for (let y = 0; y < SH; y++) {
      for (let x = 0; x < SW; x++) {
        let best = 9;
        for (const L of lights) {
          const dx = x - L.x, dy = y - L.y;
          const q = (dx * dx + dy * dy) / (L.r * L.r);
          if (q < best) best = q;
        }
        // Three bands: lit, dithered half, dithered quarter, then black.
        const thr = FK.bayer(x, y);
        let a;
        if (best < 0.45) a = 0;
        else if (best < 0.75) a = thr < 0.5 ? 0 : 1;
        else if (best < 1) a = thr < 0.25 ? 0 : 1;
        else a = 1;
        const i = (y * SW + x) * 4;
        d[i] = 0; d[i + 1] = 0; d[i + 2] = 0; d[i + 3] = a ? level * 255 : 0;
      }
    }
    dg.putImageData(darkImg, 0, 0);
    g.drawImage(darkC, 0, 0);
  }

  function fade(t) {
    t = FK.clamp(t, 0, 1);
    // NES-style fade: dither to black in four steps.
    const step = Math.floor(t * 4);
    if (step <= 0) return;
    g.fillStyle = '#000';
    if (step >= 4) { g.fillRect(0, 0, SW, SH); return; }
    for (let y = 0; y < SH; y += 2) for (let x = (y / 2) % 2; x < SW; x += 2) {
      if (step === 1 && ((x + y) % 4) !== 0) continue;
      g.fillRect(x, y, 1, 1);
      if (step === 3) { g.fillRect(x + 1, y, 1, 1); g.fillRect(x, y + 1, 1, 1); }
    }
  }
  FK.fade = fade;

  function drawHud() {
    // Hearts.
    for (let i = 0; i < W.maxHearts; i++) {
      FK.drawSprite(g, 'hud', i < W.hearts ? 'heart' : 'heart0', 8 + i * 10, 7);
    }
    // Objective count.
    if (W.itemsNeeded > 0) {
      const art = W.def.itemIcon || W.def.itemArt || 'tome';
      const ic = FK.SPR.items[art];
      if (ic) FK.drawSprite(g, 'items', art, SW - 44 - ic.w, 13 - Math.round(ic.h / 2));
      FK.text(g, `${W.items}/${W.itemsNeeded}`, SW - 8, 8, 0x30, { align: 'right', shadow: 0x0f });
    }
    // Boss meter.
    if (W.boss && !W.boss.dead && W.boss.showBar !== false) {
      const b = W.boss;
      FK.text(g, b.name || 'BOSS', SW / 2, 6, 0x30, { align: 'center', shadow: 0x0f });
      const bw = 64, bx = SW / 2 - bw / 2;
      FK.rect(g, bx - 1, 16, bw + 2, 5, 0x0f);
      FK.rect(g, bx, 17, Math.round(bw * Math.max(0, b.hp) / b.maxHp), 3, 0x16);
    }
    if (W.timer !== undefined) FK.text(g, String(Math.max(0, Math.ceil(W.timer / 60))), SW / 2, 26, 0x30, { align: 'center', shadow: 0x0f });
    if (W.msg) {
      const lines = FK.wrap(W.msg.text, 28);
      const bh = lines.length * 10 + 14 + (W.msg.who ? 10 : 0);
      const by = SH - bh - 6;
      FK.box(g, 8, by, SW - 16, bh);
      let ty = by + 8;
      if (W.msg.who) { FK.text(g, W.msg.who, 16, ty, 0x28); ty += 10; }
      lines.forEach((l, i) => FK.text(g, l, 16, ty + i * 10, 0x30));
    }
  }

  function drawClear() {
    const t = W.done - 40;
    const y = 88;
    if (W.def.clearText !== false) {
      FK.box(g, 48, y, SW - 96, 40);
      FK.text(g, W.def.clearText || 'STAGE CLEAR', SW / 2, y + 12, 0x28, { align: 'center' });
      if (t > 20) FK.text(g, W.def.clearSub || '', SW / 2, y + 24, 0x30, { align: 'center' });
    }
    if (W.done > 120) fade((W.done - 120) / 30);
  }

  /* ------------------------------------------------------------ states */
  function playState() {
    return { update: playUpdate, draw: playDraw };
  }

  function cardState(index) {
    const def = FK.stages[index];
    let t = 0;
    return {
      enter() { FK.audio && FK.audio.music(null); FK.audio && FK.audio.sfx('card'); },
      update() {
        t++;
        if ((t > 30 && confirm()) || t > 170) { startStage(index); go(playState()); }
      },
      draw() {
        FK.rect(g, 0, 0, SW, SH, 0x0f);
        FK.text(g, `STAGE ${def.num}`, SW / 2, 64, 0x30, { align: 'center' });
        FK.text(g, def.name, SW / 2, 84, 0x28, { align: 'center' });
        if (def.place) FK.text(g, def.place, SW / 2, 100, 0x10, { align: 'center' });
        const set = FK.SPR[def.hero];
        const frame = Math.floor(t / 8) % 4;
        const s = set[['run1', 'run2', 'run3', 'run2'][frame]];
        FK.drawSprite(g, def.hero, ['run1', 'run2', 'run3', 'run2'][frame], SW / 2 - s.w / 2, 150 - s.h);
        FK.rect(g, 96, 150, 64, 1, 0x2d);
        if (def.hero === 'creature') FK.text(g, "THE CREATURE'S TALE", SW / 2, 170, 0x16, { align: 'center' });
        const hint = lastInput === 'touch' ? def.hintTouch : lastInput === 'pad' ? def.hintPad : def.hint;
        if (hint) hint.split('\n').forEach((l, i) => FK.text(g, l, SW / 2, 188 + i * 12, 0x2d, { align: 'center' }));
        if (t < 16) fade(1 - t / 16);
      },
    };
  }

  /*
   * Cinema: Ninja Gaiden style. A letterboxed picture, text typed out under
   * it. A or Start advances; holding Select skips the whole scene.
   */
  function cineState(id, then) {
    const panels = FK.CINE[id];
    if (!panels) { console.warn('no cinema', id); return { enter: then, update() {}, draw() {} }; }
    let i = 0, t = 0, chars = 0, out = 0;
    const lines = () => FK.wrap(panels[i].text || '', 29);
    return {
      enter() { if (panels.music !== undefined) FK.audio && FK.audio.music(panels.music); },
      update() {
        t++;
        const p = panels[i];
        if (p.music !== undefined && t === 1) FK.audio && FK.audio.music(p.music);
        if (p.sfx && t === (p.sfxAt || 1)) FK.audio && FK.audio.sfx(p.sfx);
        const total = lines().join('').length;
        if (out) { out++; if (out > 16) { out = 0; i++; t = 0; chars = 0; if (i >= panels.length) then(); } return; }
        if (t > 20 && t % 2 === 0 && chars < total) { chars++; if (chars % 3 === 0) FK.audio && FK.audio.sfx('type'); }
        if (hit.select) { then(); return; }
        if (confirm()) {
          if (chars < total) chars = total;
          else out = 1;
        }
        if (p.auto && t > p.auto) out = 1;
      },
      draw() {
        const p = panels[i];
        FK.rect(g, 0, 0, SW, SH, 0x0f);
        if (!p) return;
        const ax = 16, ay = 16, aw = 224, ah = 112;
        g.save();
        g.beginPath(); g.rect(ax, ay, aw, ah); g.clip();
        FK.rect(g, ax, ay, aw, ah, 0x0f);
        const art = FK.CINE_ART[p.art];
        if (art) art(g, ax, ay, t, p);
        g.restore();
        let n = chars;
        const ls = lines();
        const ty = p.who ? 150 : 142;
        if (p.who) FK.text(g, p.who, 16, 138, 0x28);
        ls.forEach((l, k) => {
          const show = l.slice(0, Math.max(0, n));
          n -= l.length;
          FK.text(g, show, 16, ty + k * 10, p.color || 0x30);
        });
        const total = ls.join('').length;
        if (chars >= total && Math.floor(t / 16) % 2) FK.text(g, '~', SW - 24, SH - 14, 0x30);
        if (t < 12) fade(1 - t / 12);
        if (out) fade(out / 16);
      },
    };
  }
  FK.cineState = cineState;

  function pauseState() {
    const back = state;
    let sel = 0;
    const items = () => [
      'RESUME',
      'RESTART STAGE',
      'STAGE SELECT',
      `SOUND: ${save.sound ? 'ON' : 'OFF'}`,
      EMBED ? 'QUIT TO DOS' : 'QUIT',
    ];
    FK.audio && FK.audio.pause(true);
    FK.audio && FK.audio.sfx('pause');
    return {
      update() {
        const n = items().length;
        if (hit.d) { sel = (sel + 1) % n; FK.audio.sfx('tick'); }
        if (hit.u) { sel = (sel + n - 1) % n; FK.audio.sfx('tick'); }
        if (hit.start || hit.select) { FK.audio.pause(false); state = back; return; }
        if (hit.a || hit.tap) {
          FK.audio.pause(false);
          if (sel === 0) state = back;
          else if (sel === 1) { startStage(W.index); go(playState()); }
          else if (sel === 2) go(selectState());
          else if (sel === 3) { toggleSound(); FK.audio.pause(true); }
          else quit();
        }
      },
      draw() {
        back.draw();
        g.globalAlpha = 0.6; FK.rect(g, 0, 0, SW, SH, 0x0f); g.globalAlpha = 1;
        FK.box(g, 56, 52, 144, 112);
        FK.text(g, 'PAUSED', SW / 2, 64, 0x28, { align: 'center' });
        items().forEach((it, k) => {
          FK.text(g, it, 84, 86 + k * 14, k === sel ? 0x30 : 0x10);
          if (k === sel) FK.text(g, '>', 70, 86 + k * 14, 0x28);
        });
      },
    };
  }

  function selectState() {
    let sel = Math.min(save.reached, FK.stages.length - 1);
    let t = 0;
    FK.audio && FK.audio.music('select');
    return {
      update() {
        t++;
        const n = save.reached + 1;
        if (hit.d || hit.r) { sel = Math.min(sel + 1, n - 1); FK.audio.sfx('tick'); }
        if (hit.u || hit.l) { sel = Math.max(sel - 1, 0); FK.audio.sfx('tick'); }
        if (hit.select) { go(titleState()); return; }
        if (hit.a || hit.start) { FK.audio.sfx('start'); enterStage(sel, false); }
        if (hit.tap) { FK.audio.sfx('start'); enterStage(sel, false); }
      },
      draw() {
        FK.rect(g, 0, 0, SW, SH, 0x0f);
        FK.text(g, 'STAGE SELECT', SW / 2, 14, 0x28, { align: 'center' });
        const top = Math.max(0, Math.min(sel - 5, FK.stages.length - 12));
        for (let k = top; k < Math.min(FK.stages.length, top + 12); k++) {
          const def = FK.stages[k];
          const y = 36 + (k - top) * 14;
          const open = k <= save.reached;
          const label = open ? `${def.num} ${def.name}` : `${def.num} ??????`;
          FK.text(g, label, 36, y, !open ? 0x2d : k === sel ? 0x30 : 0x10);
          if (save.cleared[def.key]) FK.text(g, '@', 228, y, 0x16);
          if (k === sel) FK.text(g, '>', 22, y, 0x28);
        }
        FK.text(g, 'A: PLAY   ESC: BACK', SW / 2, SH - 14, 0x2d, { align: 'center' });
        if (t < 10) fade(1 - t / 10);
      },
    };
  }

  function titleState() {
    let t = 0, sel = 0;
    const has = save.reached > 0;
    const items = () => has ? ['CONTINUE', 'NEW GAME', 'STAGE SELECT'] : ['START'];
    return {
      enter() { FK.audio && FK.audio.music('title'); },
      update() {
        t++;
        const n = items().length;
        if (hit.d) { sel = (sel + 1) % n; FK.audio.sfx('tick'); }
        if (hit.u) { sel = (sel + n - 1) % n; FK.audio.sfx('tick'); }
        if (hit.select && EMBED) { quit(); return; }
        if (t > 20 && confirm()) {
          FK.audio.sfx('start');
          const it = items()[sel];
          if (it === 'START' || it === 'NEW GAME') go(cineState('opening', () => enterStage(0)));
          else if (it === 'CONTINUE') enterStage(save.reached);
          else go(selectState());
        }
      },
      draw() { FK.drawTitle(g, t, items(), sel, lastInput); },
    };
  }

  function endState() {
    let t = 0;
    return {
      enter() { FK.audio && FK.audio.music('ending'); },
      update() { t++; if (t > 240 && confirm()) go(titleState()); },
      draw() { FK.drawEnd(g, t); },
    };
  }

  /* ------------------------------------------------------------ main loop */
  let acc = 0, last = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    if (!last) last = now;
    acc += Math.min(100, now - last);
    last = now;
    let steps = 0;
    while (acc >= 1000 / 60 && steps < 4) {
      readInput();
      state.update();
      if (toastT > 0) toastT--;
      acc -= 1000 / 60; steps++;
    }
    if (steps) {
      state.draw();
      if (toastT > 0 && toastMsg) FK.text(g, toastMsg, SW - 8, SH - 14, 0x30, { align: 'right', shadow: 0x0f });
    }
  }

  FK.boot = () => {
    if (EMBED) document.body.classList.add('embed');
    if (matchMedia('(pointer: coarse)').matches) document.body.classList.add('touch');
    FK.audio && FK.audio.setOn(save.sound);
    if (muteBtn) muteBtn.setAttribute('aria-pressed', String(!save.sound));
    fit();
    const q = new URLSearchParams(location.search);
    if (DEBUG && q.get('stage')) {
      const i = FK.stages.findIndex((s) => s.key === q.get('stage'));
      startStage(i >= 0 ? i : 0); go(playState());
      if (q.get('x')) { W.hero.x = +q.get('x') * 16; W.hero.y = (+q.get('y') || 0) * 16; snapCamera(); }
    } else if (DEBUG && q.get('cine')) {
      go(cineState(q.get('cine'), () => go(titleState())));
    } else go(titleState());
    requestAnimationFrame(frame);
  };
  // Hooks for the test harness.
  FK._dbg = { startStage: (i) => { startStage(i); go(playState()); return W; }, state: () => state, go, titleState, cineState, enterStage, keyHeld, W: () => W, playDraw: () => playDraw() };
})();
