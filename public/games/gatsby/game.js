'use strict';
/*
 * GATSBY.EXE: the game. Input, the state machine (title, cinema, chapter card,
 * play, pause), the world, the camera, the renderer and the HUD. Entity
 * behaviour lives in ents.js, foes.js and bosses.js; stages in stages.js.
 */
(() => {
  const { W: SW, H: SH, K } = GG;
  const EMBED = /[?&]embed\b/.test(location.search);
  const DEBUG = /[?&]debug\b/.test(location.search);
  const SAVE_KEY = 'gatsby-exe-v1';

  /* ------------------------------------------------------------ canvas */
  const screen = document.getElementById('screen');
  const g = screen.getContext('2d');
  screen.width = SW; screen.height = SH;
  g.imageSmoothingEnabled = false;
  GG.g = g;

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

  /* ------------------------------------------------------------ events */
  /*
   * What happens in play, for the recorder below and the playtest log
   * (playtest.js): stage-start, hurt, death, checkpoint, item, clear, leave.
   */
  const listeners = {};
  GG.on = (type, fn) => { (listeners[type] = listeners[type] || []).push(fn); };
  GG.emit = (type, data) => { for (const fn of listeners[type] || []) { try { fn(data); } catch (e) { console.error(e); } } };

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
  GG.input = { held, hit };
  let lastInput = 'keys';

  addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const b = KEYMAP[e.code];
    if (!b) return;
    e.preventDefault();
    lastInput = 'keys';
    GG.audio && GG.audio.unlock();
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
    GG.audio && GG.audio.unlock();
    for (const t of e.changedTouches) {
      if (e.type === 'touchend' || e.type === 'touchcancel') touches.delete(t.identifier);
      else touches.set(t.identifier, btnAt(t.clientX, t.clientY));
    }
    syncTouch();
  }
  if (pad) for (const ev of ['touchstart', 'touchmove', 'touchend', 'touchcancel']) pad.addEventListener(ev, onTouch, { passive: false });
  // Mouse on the pad too, so it can be tried on a desktop.
  if (pad) {
    pad.addEventListener('mousedown', (e) => { touches.set('m', btnAt(e.clientX, e.clientY)); syncTouch(); GG.audio && GG.audio.unlock(); });
    addEventListener('mouseup', () => { touches.delete('m'); syncTouch(); });
  }
  const muteBtn = document.getElementById('mute');
  if (muteBtn) muteBtn.addEventListener('click', () => { GG.audio && GG.audio.unlock(); toggleSound(); });
  // A tap on the picture is Start, for title screens and cinema on phones.
  let tapStart = false;
  screen.addEventListener('touchstart', () => { lastInput = 'touch'; document.body.classList.add('touch'); GG.audio && GG.audio.unlock(); tapStart = true; }, { passive: true });
  screen.addEventListener('mousedown', () => { GG.audio && GG.audio.unlock(); tapStart = true; });

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
    // A replay feeds the recorded buttons to play, one frame at a time.
    if (playback && state && state.update === playUpdate) { replayFrame(); return; }
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
  GG.save = save;
  function persist() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {} }
  function toggleSound() {
    save.sound = !save.sound; persist();
    GG.audio && GG.audio.setOn(save.sound);
    toast(save.sound ? 'SOUND ON' : 'SOUND OFF');
    if (muteBtn) muteBtn.setAttribute('aria-pressed', String(!save.sound));
  }
  let toastMsg = null, toastT = 0;
  function toast(m) { toastMsg = m; toastT = 90; }
  GG.toast = toast;

  function quit() {
    if (EMBED) { try { parent.postMessage({ type: 'gatsby:exit' }, location.origin); } catch (e) {} }
    else location.href = '/games';
  }

  /* ----------------------------------------------------------- recorder */
  /*
   * Each fresh start of a stage is recorded until the stage is left: its seed
   * and, for every frame the world moves, the buttons held and the buttons
   * just pressed. Respawns at checkpoints are part of the same run. GG.replay
   * plays a run back exactly; GG.on('leave', ({ run }) => ...) gets each one.
   */
  const BTN = ['l', 'r', 'u', 'd', 'a', 'b'];
  let rec = null, playback = null;
  function runFrames() { return rec ? rec.frames : playback ? playback.i : 0; }
  function recStart(index) {
    rec = { v: 1, game: 'gatsby', stage: GG.stages[index].key, seed: GG.seedValue, started: new Date().toISOString(), frames: 0, rle: [] };
  }
  function recFrame() {
    if (!rec) return;
    let m = 0;
    BTN.forEach((k, i) => { if (held[k]) m |= 1 << i; if (hit[k]) m |= 1 << (i + 6); });
    const r = rec.rle;
    if (r.length && r[r.length - 2] === m) r[r.length - 1]++; else r.push(m, 1);
    rec.frames++;
  }
  function recEnd(reason) {
    if (!rec) return;
    const run = rec; rec = null;
    run.end = reason;
    GG.emit('leave', { stage: run.stage, reason, t: run.frames, run });
  }
  GG.recording = () => rec;
  addEventListener('pagehide', () => recEnd('closed'));

  function replayFrame() {
    const p = playback;
    if (keyHeld.select) { playback = null; toast('REPLAY STOPPED'); return; }
    const m = p.masks[p.i++] || 0;
    BTN.forEach((k, i) => { held[k] = (m >> i) & 1; hit[k] = (m >> (i + 6)) & 1; prev[k] = held[k]; });
    held.start = held.select = hit.start = hit.select = hit.tap = 0;
    if (p.i >= p.masks.length) { playback = null; toast('REPLAY OVER'); }
  }
  GG.replay = (run) => {
    const index = GG.stages.findIndex((st) => st.key === run.stage);
    if (index < 0 || !Array.isArray(run.rle)) return false;
    const masks = [];
    for (let i = 0; i < run.rle.length; i += 2) for (let n = 0; n < run.rle[i + 1]; n++) masks.push(run.rle[i]);
    startStage(index, { seed: run.seed, replay: true });
    go(playState());
    playback = { masks, i: 0, run };
    return true;
  };
  GG.replaying = () => !!playback;

  /* ------------------------------------------------------------- routes */
  /*
   * Deep links live in the hash, so the page works as plain static files:
   *   #/stage/3        that stage (its chapter card, then play)
   *   #/select         chapter select
   *   #/story/party    a cutscene by name, then the title
   * The hash follows you as you play (replaceState, so Back leaves the game),
   * and when the game runs on the desk computer it tells the page around it,
   * which puts the same path in the site's URL.
   */
  function parseRoute(hash) {
    const parts = String(hash || '').replace(/^#\/?/, '').split('/').filter(Boolean);
    if (parts[0] === 'stage' && parts[1]) {
      const i = GG.stages.findIndex((st) => st.key === parts[1]);
      if (i >= 0) return { kind: 'stage', index: i };
    }
    if (parts[0] === 'select') return { kind: 'select' };
    if (parts[0] === 'story' && parts[1] && GG.CINE[parts[1]]) return { kind: 'story', id: parts[1] };
    return { kind: 'title' };
  }
  let routeNow = null;
  function setRoute(path) {
    if (path === routeNow) return;
    routeNow = path;
    const hash = path ? '#/' + path : '';
    if (location.hash !== hash) {
      try { history.replaceState(history.state, '', location.pathname + location.search + hash); } catch (e) {}
    }
    if (EMBED) { try { parent.postMessage({ type: 'gatsby:route', path }, location.origin); } catch (e) {} }
  }
  function followRoute(r) {
    if (r.kind === 'stage') enterStage(r.index, true);
    else if (r.kind === 'select') go(selectState());
    else if (r.kind === 'story') { const id = r.id; go(cineState(id, () => go(titleState()))); setRoute('story/' + id); }
    else go(titleState());
  }
  addEventListener('hashchange', () => followRoute(parseRoute(location.hash)));

  /* ------------------------------------------------------------- states */
  let state = null;
  function go(s) { state = s; if (s.enter) s.enter(); }
  GG.go = go;

  /* ------------------------------------------------------------ world */
  /*
   * W is the running stage. Entities get it passed in; the helpers on it are
   * how they reach the hero, the map, the sounds and each other.
   */
  let W = null;
  GG.world = () => W;

  function startStage(index, opts = {}) {
    const def = GG.stages[index];
    // A fresh start draws a new seed and begins a new recording; a respawn at
    // a checkpoint carries on with both, since it follows from the inputs.
    if (!opts.fromCheck) {
      recEnd('restart');
      GG.seed(opts.seed !== undefined ? opts.seed : (Math.random() * 4294967296) >>> 0);
      if (!opts.replay) recStart(index);
    }
    const lv = GG.compile(def);
    lv.roof = !!def.roof;
    if (GG.nes) GG.nes.build(lv, def, buildLayer); else buildLayer(lv);   // NES palettes (palette.js)
    const hero = GG.makeHero(def.hero, lv.start.x, lv.start.y);
    const maxHearts = def.hearts || 3;
    W = {
      index, def, lv, hero, ents: [], parts: [], t: 0,
      cam: { x: 0, y: 0 }, shake: 0, flash: 0, dark: def.dark || 0,
      items: 0, itemsNeeded: 0, hearts: maxHearts, maxHearts,
      check: { x: lv.start.x, y: lv.start.y, items: 0, taken: [] },
      taken: [],
      boss: null, done: false, dying: 0, invuln: 0, hurtT: 0, attackT: 0, cool: 0,
      autoscroll: def.autoscroll || 0, frozen: 0, msg: null, lock: false,
      mods: {},
    };
    Object.assign(W, worldApi);
    trail.length = 0;
    for (const e of lv.ents) {
      if (e.e === 'start') continue;
      spawnFromMap(e);
    }
    const items = W.ents.filter((e) => e.type === 'item').sort((a, b) => a.x - b.x || a.y - b.y);
    items.forEach((e, i) => {
      if (def.itemNames && def.itemNames[i] && !e.name) e.name = def.itemNames[i];
      if (def.itemSays && def.itemSays[i] && !e.say) { e.say = def.itemSays[i]; e.who = e.who || (def.itemWho && def.itemWho[i]) || null; }
      if (def.itemArts && def.itemArts[i] && !e.art) e.art = def.itemArts[i];
    });
    W.itemsNeeded = items.filter((e) => !e.optional).length;
    if (def.init) def.init(W);
    // Back from a checkpoint: a moment of grace (the hero flickers) so nothing
    // that spawns nearby can hit him before he has his bearings.
    if (opts.fromCheck) { restoreCheck(opts.fromCheck); W.invuln = 120; }
    snapCamera();
    GG.audio && GG.audio.music(def.music);
    GG.emit('stage-start', { stage: def.key, fromCheck: !!opts.fromCheck, t: runFrames(), x: W.hero.x, y: W.hero.y });
    return W;
  }

  function spawnFromMap(m) {
    const e = GG.spawn(m.e, m.x, m.y, m);
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
    // In a ride, start with some room behind you and a beat before it rolls.
    if (W.def.autoscroll) { W.cam.x = Math.max(0, c.x - 80); W.scrollHold = 60; }
    for (const e of W.ents) if (e.type === 'checkpoint' && e.x <= c.x + 1) e.lit = true;
    if (W.def.onRestore) W.def.onRestore(W, c);
  }

  const worldApi = {
    spawn(type, x, y, props) { return GG.spawn(type, x, y, props); },
    // GG.spawn already adds what it makes; add() only adds things not yet in.
    add(e) { if (e && !W.ents.includes(e)) W.ents.push(e); return e; },
    part(p) { W.parts.push(p); return p; },
    sfx(n) { GG.audio && GG.audio.sfx(n); },
    hurt(src, dmg = 1) { hurtHero(src, dmg); },
    kill(src) { killHero(src); },
    say(text, who, frames = 150) { W.msg = { text, who, t: frames }; },
    clear() { stageClear(); },
    take(e) { if (e.mapId) W.taken.push(e.mapId); },
    emit(type, data) { GG.emit(type, Object.assign({ stage: W.def.key, t: runFrames() }, data)); },
  };

  /* What hurt him, for the playtest log: an entity's type, or the tile. */
  const causeOf = (src, fallback) => (src && (src.type || src.cause)) || fallback;
  function hurtHero(src, dmg) {
    if (W.invuln > 0 || W.dying || W.done) return;
    W.hearts -= dmg;
    W.sfx('hurt');
    const h = W.hero;
    W.emit('hurt', { x: h.x + h.w / 2, y: h.y + h.h, cause: causeOf(src, 'spikes'), hearts: Math.max(0, W.hearts) });
    if (W.hearts <= 0) { killHero(src || { cause: 'spikes' }); return; }
    W.invuln = 100; W.hurtT = 24;
    const dir = src ? Math.sign(h.x + h.w / 2 - (src.x + (src.w || 0) / 2)) || -h.face : -h.face;
    h.vx = dir * 1.8; h.vy = -3; h.onLadder = false; h.wallLock = 0;
    W.shake = 6;
  }
  function killHero(src) {
    if (W.dying || W.done) return;
    const h = W.hero;
    W.emit('death', { x: h.x + h.w / 2, y: h.y + h.h, cause: causeOf(src, 'fall') });
    W.dying = 1; W.hearts = 0;
    GG.audio && GG.audio.music(null);
    W.sfx('die');
  }

  function stageClear() {
    if (W.done) return;
    W.done = 1;
    W.emit('clear', { x: W.hero.x, y: W.hero.y });
    GG.audio && GG.audio.music(null);
    W.sfx('clear');
    const next = W.index + 1;
    save.cleared[W.def.key] = true;
    if (next > save.reached && next < GG.stages.length) save.reached = next;
    persist();
  }

  /* -------------------------------------------------- static tile layer */
  const hash = (x, y) => { let h = (x * 374761393 + y * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; return (h ^ (h >>> 16)) >>> 0; };
  GG.hash = hash;
  function pickArt(lv, x, y, name, t) {
    if (t.tile) return t.tile;
    if (t.tiles) return t.tiles[hash(x, y) % t.tiles.length];
    if (t.auto) {
      const group = t.group || name;
      const same = (dx, dy) => {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || nx >= lv.w) return true;
        if (ny >= lv.h) return true;
        if (ny < 0) return !!lv.roof;
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
      for (const c of cand) if (GG.TILE[c]) return c;
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
        if (t.under) { const u = GG.TILE[pickArt(lv, x, y, t.under, lv.ts.terrain[t.under])]; if (u) lg.drawImage(u, x * 16, y * 16); }
        if (t.anim) { lv.anim.push({ x: x * 16, y: y * 16, frames: t.anim, rate: t.rate || 12, off: t.sync ? 0 : hash(x, y) % 64, fg: t.fg }); continue; }
        const art = pickArt(lv, x, y, name, t);
        if (!art) continue;
        const img = GG.TILE[art];
        if (!img) { if (DEBUG) console.warn('missing tile art', art); continue; }
        (t.fg ? fgg : lg).drawImage(img, x * 16, y * 16);
      }
    }
    lv.layer = c; lv.fgLayer = fg;
    // Interiors: painted once, behind the tiles.
    lv.backLayer = null;
    const rooms = lv.stage.rooms || (GG.MAPINFO && GG.MAPINFO[lv.stage.key] && GG.MAPINFO[lv.stage.key].rooms);
    if (rooms && rooms.length) {
      const b = document.createElement('canvas');
      b.width = lv.pw; b.height = lv.ph;
      const bg = b.getContext('2d');
      for (const [x0, y0, x1, y1, style] of rooms) {
        const paint = GG.ROOMS && GG.ROOMS[style];
        if (paint) paint(bg, x0 * 16, y0 * 16, (x1 - x0 + 1) * 16, (y1 - y0 + 1) * 16);
      }
      lv.backLayer = b;
    }
  }
  GG.rebuildCell = (lv, tx, ty) => {
    const lg = lv.layer.getContext('2d');
    lg.clearRect(tx * 16, ty * 16, 16, 16);
    const name = lv.terr[ty * lv.w + tx];
    if (name) {
      const t = lv.ts.terrain[name];
      const art = pickArt(lv, tx, ty, name, t);
      if (art && GG.TILE[art]) lg.drawImage(GG.TILE[art], tx * 16, ty * 16);
    }
  };

  /* ------------------------------------------------------------ camera */
  function camTarget() {
    const h = W.hero;
    const lv = W.lv;
    const x = h.x + h.w / 2 - SW / 2 + h.face * 16;
    const y = h.y + h.h / 2 - SH / 2 - 8 + (W.def.camDy || 0);
    return { x: GG.clamp(x, 0, Math.max(0, lv.pw - SW)), y: GG.clamp(y, 0, Math.max(0, lv.ph - SH)) };
  }
  function snapCamera() {
    if (W.autoscroll) { W.cam.y = GG.clamp(W.hero.y - SH / 2, 0, Math.max(0, W.lv.ph - SH)); return; }
    const t = camTarget(); W.cam.x = t.x; W.cam.y = t.y;
  }
  function updateCamera() {
    const lv = W.lv;
    if (W.camLock) {
      W.cam.x += (GG.clamp(W.camLock.x, 0, lv.pw - SW) - W.cam.x) * 0.08;
      if (W.camLock.y !== undefined) W.cam.y += (GG.clamp(W.camLock.y, 0, lv.ph - SH) - W.cam.y) * 0.08;
      return;
    }
    if (W.autoscroll && !W.done && !W.dying) {
      if (W.scrollHold > 0) W.scrollHold--;
      else W.cam.x = Math.min(lv.pw - SW, W.cam.x + W.autoscroll);
      const ty = GG.clamp(W.hero.y + W.hero.h / 2 - SH / 2, 0, Math.max(0, lv.ph - SH));
      W.cam.y += (ty - W.cam.y) * 0.1;
      return;
    }
    const t = camTarget();
    // Horizontal: ease toward a look-ahead. Vertical: only chase beyond a band.
    W.cam.x += (t.x - W.cam.x) * 0.12;
    const dy = t.y - W.cam.y;
    const steady = W.hero.onGround || W.hero.onLadder || W.hero.sliding;
    if (Math.abs(dy) > 24 || steady) W.cam.y += dy * (steady ? 0.1 : 0.06);
    W.cam.x = GG.clamp(W.cam.x, 0, Math.max(0, lv.pw - SW));
    W.cam.y = GG.clamp(W.cam.y, 0, Math.max(0, lv.ph - SH));
  }

  /* ---------------------------------------------------------- play loop */
  function playUpdate() {
    // Pausing leaves the world untouched, so a recording can skip the pause.
    if (hit.start || hit.select) { go(pauseState()); return; }
    recFrame();
    W.t++;
    const h = W.hero;
    if (W.msg && --W.msg.t <= 0) W.msg = null;

    if (W.dying) {
      W.dying++;
      if (W.dying === 2) { h.vy = -4; h.vx = 0; }
      if (W.dying > 1 && W.dying < 120) { h.vy = Math.min(5, h.vy + 0.2); h.y += h.vy; }
      if (W.dying > 130) startStage(W.index, { fromCheck: W.check });
      updateParts();
      return;
    }
    if (W.done) {
      W.done++;
      h.vx *= 0.9; h.vy = Math.min(5, h.vy + 0.3);
      GG.moveBody(h, W.lv, platforms());
      if (h.riding && h.riding.dx) GG.moveX(h, W.lv, h.riding.dx);
      for (const e of W.ents) if (e.solid || e.keepGoing) GG.update(e, W);
      updateParts();
      if (W.def.doneUpdate) W.def.doneUpdate(W);
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

    const ev = GG.heroStep(h, inp, W.lv, platforms(), W.mods);
    for (const e of ev) {
      if (e === 'jump') W.sfx('jump');
      if (e === 'walljump') { W.sfx('walljump'); dust(h.x + (h.face < 0 ? h.w : 0), h.y + h.h - 6); }
      if (e === 'land') { W.sfx('land'); dust(h.x + h.w / 2, h.y + h.h); }
      if (e === 'swim') W.sfx('swim');
      if (e === 'slide') W.part({ kind: 'dust', x: h.x + (h.sliding > 0 ? h.w : 0), y: h.y + 4, vx: 0, vy: -0.2, t: 0, life: 14 });
    }
    if (h.onGround && Math.abs(h.vx) > 0.6 && W.t % 10 === 0 && !h.inWater) dust(h.x + h.w / 2 - h.face * 4, h.y + h.h, true);
    if (DEBUG) {
      trail.push({ x: h.x + h.w / 2, y: h.y + h.h, air: !h.onGround && !h.onLadder });
      if (trail.length > 180) trail.shift();
      if (!h.onGround && !h.onLadder) W.airT = (W.airT || 0) + 1; else if (W.airT) { W.lastAir = W.airT; W.airT = 0; }
    }

    // Throw.
    if (hit.b && !lockIn && W.cool === 0 && !h.onLadder && !W.noAttack) throwSomething(h);

    // Autoscroll keeps the hero on screen; the left edge crushes.
    if (W.autoscroll) {
      if (h.x < W.cam.x) {
        h.x = W.cam.x;
        if (GG.isSolid(GG.kindAt(W.lv, Math.floor((h.x + h.w) / 16), Math.floor((h.y + h.h / 2) / 16)))) killHero({ cause: 'crushed' });
      }
      if (h.x + h.w > W.cam.x + SW) h.x = W.cam.x + SW - h.w;
    } else {
      h.x = GG.clamp(h.x, 0, W.lv.pw - h.w);
    }

    // Tiles that hurt.
    if (GG.inKind(h, W.lv, K.SPIKE, 3)) hurtHero(null, 1);
    if (GG.inKind(h, W.lv, K.DEATH, 2)) killHero({ cause: W.def.deathTile || 'fall' });
    if (h.y > W.lv.ph + 8) killHero({ cause: 'fall' });

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
      GG.update(e, W);
    }
    W.ents = W.ents.filter((e) => !e.dead);
    if (W.def.update) W.def.update(W);
    updateParts();
    updateCamera();
    if (W.shake > 0) W.shake--;
    if (W.flash > 0) W.flash--;
  }

  function throwSomething(h) {
    const kind = h.s.throws;
    const mine = W.ents.filter((e) => e.type === kind).length;
    if (mine >= 2) return;
    const fx = h.x + h.w / 2 + h.face * 6;
    if (kind === 'bond') W.add(GG.spawn('bond', fx, h.y + 7, { dir: h.face, vx: h.face * 3.1 + h.vx * 0.35, vy: 0 }));
    else if (kind === 'clam') W.add(GG.spawn('clam', fx, h.y + 6, { dir: h.face, vx: h.face * 2.6 + h.vx * 0.4, vy: -2.6 }));
    else W.add(GG.spawn('card', fx, h.y + 8, { dir: h.face, vx: h.face * 4.2 }));
    W.attackT = 14; W.cool = 16; W.sfx('throw');
  }

  function platforms() {
    const out = [];
    for (const e of W.ents) if (e.solid && !e.dead) out.push(e);
    return out;
  }

  function finishStage() {
    recEnd('clear');
    const def = W.def;
    const next = W.index + 1;
    const after = () => {
      if (next >= GG.stages.length) go(endState());
      else enterStage(next);
    };
    if (def.outro) go(cineState(def.outro, after));
    else after();
  }

  function enterStage(index, skipIntro) {
    const def = GG.stages[index];
    setRoute('stage/' + def.key);
    const card = () => go(cardState(index));
    if (def.intro && !skipIntro) go(cineState(def.intro, card));
    else card();
  }
  GG.enterStage = enterStage;

  /* ------------------------------------------------------------ particles */
  function dust(x, y, small) {
    const n = small ? 1 : 4;
    for (let i = 0; i < n; i++) W.parts.push({ x: x + (GG.rand() * 8 - 4), y: y - 2, vx: (GG.rand() - 0.5) * 1.2, vy: -GG.rand() * 0.6, t: 0, life: 18 + GG.rand() * 8, kind: 'dust', col: W.def.dust });
  }
  GG.dust = dust;
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
        GG.rect(g, x - (r >> 1), y - (r >> 1), r, r, GG.nes.col(p.col || 0x10));
      } else if (p.kind === 'px') {
        GG.rect(g, x, y, p.s || 1, p.s || 1, GG.nes.col(p.col));
      } else if (p.kind === 'spr') {
        GG.drawSprite(g, p.spr, p.frame, x, y, p.flip);
      } else if (p.kind === 'text') {
        GG.text(g, p.text, x, y - Math.floor(p.t / 3), p.col || 0x30, { align: 'center', shadow: 0x0f });
      }
    }
  }

  /* ---------------------------------------------------------- rendering */
  function drawBackground(cx, cy) {
    const bg = GG.BG[W.def.bg];
    if (!bg) { GG.rect(g, 0, 0, SW, SH, 0x0f); return; }
    bg.draw(g, cx, cy, W.t, W);
  }

  function heroFrame() {
    const h = W.hero;
    const set = GG.SPR[h.type];
    if (W.dying) return 'hurt';
    if (W.done && h.onGround && W.def.clearPose) return W.def.clearPose;
    if (W.hurtT > 0) return 'hurt';
    if (h.onLadder) return (Math.floor(h.y / 6) % 2) ? 'climb1' : 'climb2';
    if (h.sliding && set.slide) return 'slide';
    if (W.attackT > 0) return h.onGround ? 'throw' : (set.throwAir ? 'throwAir' : 'throw');
    if (!h.onGround) return h.vy < 0 || h.inWater ? 'jump' : (set.fall ? 'fall' : 'jump');
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
    if (W.lv.backLayer) g.drawImage(W.lv.backLayer, cx, cy, SW, SH, 0, 0, SW, SH);
    if (W.def.drawBack) W.def.drawBack(g, W, cx, cy);
    g.drawImage(W.lv.layer, cx, cy, SW, SH, 0, 0, SW, SH);
    for (const a of W.lv.anim) {
      if (a.fg) continue;
      if (a.x + 16 < cx || a.x > cx + SW || a.y + 16 < cy || a.y > cy + SH) continue;
      const f = a.frames[Math.floor((W.t + a.off) / a.rate) % a.frames.length];
      const img = GG.TILE[f]; if (img) g.drawImage(img, a.x - cx, a.y - cy);
    }
    if (GG.oam) GG.oam.begin(W);   // sprites: at most 8 a scanline (oam.js)
    drawParts(cx, cy, -1);
    const sorted = W.ents.filter((e) => !e.asleep).sort((a, b) => (a.z || 0) - (b.z || 0));
    for (const e of sorted) if ((e.z || 0) < 0) GG.draw(e, W, g, cx, cy);
    // Hero (flickers while invulnerable).
    const h = W.hero;
    if (!(W.invuln > 0 && Math.floor(W.t / 3) % 2) || W.dying) {
      GG.drawOn(g, h.type, heroFrame(), h, cx, cy, h.face < 0);
    }
    for (const e of sorted) if ((e.z || 0) >= 0) GG.draw(e, W, g, cx, cy);
    if (GG.oam) GG.oam.end();
    g.drawImage(W.lv.fgLayer, cx, cy, SW, SH, 0, 0, SW, SH);
    for (const a of W.lv.anim) {
      if (!a.fg) continue;
      if (a.x + 16 < cx || a.x > cx + SW || a.y + 16 < cy || a.y > cy + SH) continue;
      const f = a.frames[Math.floor((W.t + a.off) / a.rate) % a.frames.length];
      const img = GG.TILE[f]; if (img) g.drawImage(img, a.x - cx, a.y - cy);
    }
    if (GG.oam) GG.oam.begin();
    drawParts(cx, cy, 0);
    if (GG.oam) GG.oam.end();
    if (W.def.drawFx) W.def.drawFx(g, W, cx, cy);
    if (W.dark) drawDark(cx, cy);
    if (overlay) drawOverlay(cx, cy);
    if (W.flash > 0) { g.globalAlpha = Math.min(1, W.flash / 6); GG.rect(g, 0, 0, SW, SH, W.flashCol || 0x30); g.globalAlpha = 1; }
    drawHud();
    if (W.dying > 60) fade((W.dying - 60) / 60);
    if (W.done > 40) drawClear();
  }

  /*
   * The debug overlay (?debug, then F2 or `): the tiles that hurt, hold or
   * carry; every hitbox; the hero's path over the last three seconds (blue in
   * the air); where a held jump from here would go (pink); and the counters.
   */
  let overlay = DEBUG && /[?&]overlay\b/.test(location.search);
  const trail = [];
  addEventListener('keydown', (e) => {
    if (DEBUG && (e.code === 'F2' || e.code === 'Backquote')) { overlay = !overlay; e.preventDefault(); }
  });
  function outline(x, y, w, h, col) {
    GG.rect(g, x, y, w, 1, col); GG.rect(g, x, y + h - 1, w, 1, col);
    GG.rect(g, x, y, 1, h, col); GG.rect(g, x + w - 1, y, 1, h, col);
  }
  const KIND_COL = { [K.SPIKE]: 0x16, [K.DEATH]: 0x06, [K.ONEWAY]: 0x2c, [K.LADDER]: 0x28, [K.WATER]: 0x21, [K.ICE]: 0x3c, [K.BREAK]: 0x27 };
  function drawOverlay(cx, cy) {
    const lv = W.lv, h = W.hero;
    for (let ty = Math.floor(cy / 16); ty <= Math.floor((cy + SH) / 16); ty++) {
      for (let tx = Math.floor(cx / 16); tx <= Math.floor((cx + SW) / 16); tx++) {
        const c = KIND_COL[GG.kindAt(lv, tx, ty)];
        if (c !== undefined) outline(tx * 16 - cx, ty * 16 - cy, 16, 16, c);
      }
    }
    for (const e of W.ents) {
      if (e.asleep || e.dead) continue;
      const col = e.foe ? 0x16 : e.solid ? 0x28 : e.type === 'item' ? 0x30 : 0x11;
      outline(Math.round(e.x - cx), Math.round(e.y - cy), Math.max(1, Math.round(e.w || 16)), Math.max(1, Math.round(e.h || 16)), col);
    }
    outline(Math.round(h.x - cx), Math.round(h.y - cy), h.w, h.h, 0x2a);
    for (const p of trail) GG.rect(g, Math.round(p.x - cx), Math.round(p.y - cy), 1, 1, p.air ? 0x21 : 0x10);
    if (!W.dying && !W.done && !h.onLadder) {
      const ghost = Object.assign({}, h), plat = platforms();
      for (let f = 0; f < 120; f++) {
        GG.heroStep(ghost, { l: held.l, r: held.r, u: 0, d: 0, jump: 1, jumpHit: f === 0 ? 1 : 0 }, lv, plat, W.mods);
        if (f % 2 === 0) GG.rect(g, Math.round(ghost.x + ghost.w / 2 - cx), Math.round(ghost.y + ghost.h - cy), 1, 1, 0x24);
        if (f > 2 && ghost.onGround) break;
      }
    }
    const lines = [
      `F ${W.t}  RUN ${runFrames()}  ${Math.round(fps)}FPS`,
      `X ${(h.x / 16).toFixed(1)} Y ${(h.y / 16).toFixed(1)}`,
      `VX ${h.vx.toFixed(2)} VY ${h.vy.toFixed(2)}`,
      `AIR ${W.airT || 0} LAST ${W.lastAir || 0}`,
      `${playback ? 'PLAY ' + playback.i + '/' + playback.masks.length : rec ? 'REC' : ''} SEED ${GG.seedValue}`,
    ];
    lines.forEach((l, i) => GG.text(g, l, 4, SH - 12 - (lines.length - 1 - i) * 9, 0x30, { shadow: 0x0f }));
  }

  /* Darkness: the light around the hero is a dithered disc; flares lift it. */
  const darkC = document.createElement('canvas');
  darkC.width = SW; darkC.height = SH;
  const dg = darkC.getContext('2d');
  const darkImg = dg.createImageData(SW, SH);
  function drawDark(cx, cy) {
    if (W.flash > 2) return;
    const h = W.hero;
    const lights = [{ x: h.x + h.w / 2 - cx, y: h.y + h.h / 2 - cy, r: W.lightR || 52 }];
    for (const e of W.ents) if (e.light && !e.asleep) lights.push({ x: e.x + (e.lx === undefined ? 8 : e.lx) - cx, y: e.y + (e.ly === undefined ? 8 : e.ly) - cy, r: e.light });
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
        // Three bands: lit, dithered half, dithered quarter, then dark.
        const thr = GG.bayer(x, y);
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
    t = GG.clamp(t, 0, 1);
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
  GG.fade = fade;

  function drawHud() {
    // Hearts.
    for (let i = 0; i < W.maxHearts; i++) {
      GG.drawSprite(g, 'hud', i < W.hearts ? 'heart' : 'heart0', 8 + i * 10, 7);
    }
    // Objective count.
    if (W.itemsNeeded > 0) {
      const art = W.def.itemIcon || W.def.itemArt || 'rumor';
      const ic = GG.SPR.items[art];
      if (ic) GG.drawSprite(g, 'items', art, SW - 44 - ic.w, 13 - Math.round(ic.h / 2));
      GG.text(g, `${W.items}/${W.itemsNeeded}`, SW - 8, 8, 0x30, { align: 'right', shadow: 0x0f });
    }
    // Boss meter.
    if (W.boss && !W.boss.dead && W.boss.showBar !== false) {
      const b = W.boss;
      GG.text(g, b.name || 'BOSS', SW / 2, 6, 0x30, { align: 'center', shadow: 0x0f });
      const bw = 64, bx = SW / 2 - bw / 2;
      GG.rect(g, bx - 1, 16, bw + 2, 5, 0x0f);
      GG.rect(g, bx, 17, Math.round(bw * Math.max(0, b.hp) / b.maxHp), 3, 0x28);
    }
    if (W.timer !== undefined) GG.text(g, String(Math.max(0, Math.ceil(W.timer / 60))), SW / 2, W.boss ? 26 : 8, 0x30, { align: 'center', shadow: 0x0f });
    if (W.msg) {
      const lines = GG.wrap(W.msg.text, 27);
      const bh = lines.length * 10 + 16 + (W.msg.who ? 10 : 0);
      const by = msgY(bh);
      GG.deco(g, 8, by, SW - 16, bh);
      let ty = by + 9;
      if (W.msg.who) { GG.text(g, W.msg.who, 18, ty, 0x28); ty += 10; }
      lines.forEach((l, i) => GG.text(g, l, 18, ty + i * 10, 0x30));
    }
  }

  /*
   * Where the message box goes: the bottom of the screen unless that would hide
   * the hero or something about to hit him, then the top (under the HUD). It
   * only moves when its current spot is in the way, so it doesn't flicker.
   */
  function msgY(bh) {
    const spots = { top: W.timer !== undefined || W.boss ? 38 : 28, bottom: SH - bh - 6 };
    const h = W.hero, cx = W.cam.x, cy = W.cam.y;
    const cost = (y) => {
      const hy = h.y - cy;
      let c = hy + h.h + 20 > y && hy - 20 < y + bh ? 100 : 0;
      for (const e of W.ents) {
        if (!e.foe || e.dead || Math.abs(e.x - h.x) > 112) continue;
        const ey = e.y - cy;
        if (ey + e.h > y && ey < y + bh) c += 10;
      }
      return c;
    };
    const here = W.msg.at || 'bottom', there = here === 'top' ? 'bottom' : 'top';
    if (cost(spots[here]) > 0 && cost(spots[there]) < cost(spots[here])) W.msg.at = there;
    else W.msg.at = here;
    return spots[W.msg.at];
  }

  function drawClear() {
    const t = W.done - 40;
    const y = 84;
    if (W.def.clearText !== false) {
      GG.deco(g, 40, y, SW - 80, 46);
      GG.text(g, W.def.clearText || 'CHAPTER CLEAR', SW / 2, y + 13, 0x28, { align: 'center' });
      if (t > 20) GG.text(g, W.def.clearSub || '', SW / 2, y + 26, 0x30, { align: 'center' });
    }
    if (W.done > 120) fade((W.done - 120) / 30);
  }

  /* ------------------------------------------------------------ states */
  function playState() {
    return { update: playUpdate, draw: playDraw };
  }

  /* The chapter card: the number in Roman, the stage name, where and when. */
  function cardState(index) {
    const def = GG.stages[index];
    let t = 0;
    return {
      enter() { GG.audio && GG.audio.music(null); GG.audio && GG.audio.sfx('card'); setRoute('stage/' + def.key); if (GG.nes) GG.nes.use(def.key); },
      update() {
        t++;
        if ((t > 30 && confirm()) || t > 180) { startStage(index); go(playState()); }
      },
      draw() {
        GG.rect(g, 0, 0, SW, SH, 0x0f);
        GG.deco(g, 12, 28, SW - 24, 92);
        GG.text(g, `CHAPTER ${def.chapter}`, SW / 2, 44, 0x28, { align: 'center' });
        if (def.part) GG.text(g, def.part, SW / 2, 56, 0x18, { align: 'center' });
        GG.text(g, def.name, SW / 2, 74, 0x30, { align: 'center' });
        if (def.place) GG.text(g, def.place, SW / 2, 92, 0x10, { align: 'center' });
        if (def.when) GG.text(g, def.when, SW / 2, 104, 0x2d, { align: 'center' });
        const set = GG.SPR[def.hero];
        const frame = ['run1', 'run2', 'run3', 'run2'][Math.floor(t / 8) % 4];
        const s = set[frame];
        GG.drawSprite(g, def.hero, frame, SW / 2 - s.w / 2, 158 - s.h);
        GG.rect(g, 96, 158, 64, 1, 0x18);
        const hint = lastInput === 'touch' ? def.hintTouch : lastInput === 'pad' ? def.hintPad : def.hint;
        if (hint) hint.split('\n').forEach((l, i) => GG.text(g, l, SW / 2, 176 + i * 12, 0x2d, { align: 'center' }));
        if (t < 16) fade(1 - t / 16);
      },
    };
  }

  /*
   * Cinema: Ninja Gaiden style. A picture in a Deco frame, text typed out
   * under it. A or Start advances; Esc skips the whole scene.
   */
  function cineState(id, then) {
    const panels = GG.CINE[id];
    if (!panels) { console.warn('no cinema', id); return { enter: then, update() {}, draw() {} }; }
    let i = 0, t = 0, chars = 0, out = 0;
    const lines = () => GG.wrap(panels[i].text || '', 29);
    return {
      enter() { if (panels.music !== undefined) GG.audio && GG.audio.music(panels.music); },
      update() {
        t++;
        const p = panels[i];
        if (p.music !== undefined && t === 1) GG.audio && GG.audio.music(p.music);
        if (p.sfx && t === (p.sfxAt || 1)) GG.audio && GG.audio.sfx(p.sfx);
        const total = lines().join('').length;
        if (out) { out++; if (out > 16) { out = 0; i++; t = 0; chars = 0; if (i >= panels.length) then(); } return; }
        if (t > 20 && t % 2 === 0 && chars < total) { chars++; if (chars % 3 === 0) GG.audio && GG.audio.sfx('type'); }
        if (hit.select) { then(); return; }
        if (confirm()) {
          if (chars < total) chars = total;
          else out = 1;
        }
        if (p.auto && t > p.auto) out = 1;
      },
      draw() {
        const p = panels[i];
        GG.rect(g, 0, 0, SW, SH, 0x0f);
        if (!p) return;
        const ax = 16, ay = 16, aw = 224, ah = 112;   // on the 16px attribute grid
        g.save();
        g.beginPath(); g.rect(ax, ay, aw, ah); g.clip();
        GG.rect(g, ax, ay, aw, ah, 0x0f);
        const art = GG.CINE_ART[p.art];
        if (art) art(g, ax, ay, t, p);
        g.restore();
        if (GG.nes) GG.nes.picture(g, ax, ay, aw, ah, 'cine:' + p.art);
        // The frame: a thin gold rule with corner studs (one gold: the frame and
        // the words share a palette, see palette.js).
        GG.rect(g, ax - 2, ay - 2, aw + 4, 1, 0x28); GG.rect(g, ax - 2, ay + ah + 1, aw + 4, 1, 0x28);
        GG.rect(g, ax - 2, ay - 2, 1, ah + 4, 0x28); GG.rect(g, ax + aw + 1, ay - 2, 1, ah + 4, 0x28);
        for (const [x, y] of [[ax - 3, ay - 3], [ax + aw, ay - 3], [ax - 3, ay + ah], [ax + aw, ay + ah]]) GG.rect(g, x, y, 3, 3, 0x28);
        let n = chars;
        const ls = lines();
        const ty = p.who ? 148 : 144;   // under the frame's 16px row
        if (p.who) GG.text(g, p.who, 16, 136, 0x28);
        ls.forEach((l, k) => {
          const show = l.slice(0, Math.max(0, n));
          n -= l.length;
          GG.text(g, show, 16, ty + k * 10, p.color || 0x30);
        });
        const total = ls.join('').length;
        if (chars >= total && Math.floor(t / 16) % 2) GG.text(g, '~', SW - 24, SH - 14, 0x28);
        if (t < 12) fade(1 - t / 12);
        if (out) fade(out / 16);
      },
    };
  }
  GG.cineState = cineState;

  function pauseState() {
    const back = state;
    let sel = 0;
    // Other scripts can add entries (the playtest log adds SAVE PLAYTEST LOG).
    const extra = GG.pauseItems ? GG.pauseItems() : [];
    const items = () => [
      'RESUME',
      'RESTART CHAPTER',
      'CHAPTER SELECT',
      `SOUND: ${save.sound ? 'ON' : 'OFF'}`,
      ...extra.map((x) => x.label),
      EMBED ? 'QUIT TO DOS' : 'QUIT',
    ];
    GG.audio && GG.audio.pause(true);
    GG.audio && GG.audio.sfx('pause');
    return {
      update() {
        const n = items().length;
        if (hit.d) { sel = (sel + 1) % n; GG.audio.sfx('tick'); }
        if (hit.u) { sel = (sel + n - 1) % n; GG.audio.sfx('tick'); }
        if (hit.start || hit.select) { GG.audio.pause(false); state = back; return; }
        if (hit.a || hit.tap) {
          GG.audio.pause(false);
          if (sel === 0) state = back;
          else if (sel === 1) { startStage(W.index); go(playState()); }
          else if (sel === 2) { recEnd('select'); go(selectState()); }
          else if (sel === 3) { toggleSound(); GG.audio.pause(true); }
          else if (extra[sel - 4]) extra[sel - 4].run();
          else { recEnd('quit'); quit(); }
        }
      },
      draw() {
        back.draw();
        g.globalAlpha = 0.6; GG.rect(g, 0, 0, SW, SH, 0x0f); g.globalAlpha = 1;
        GG.deco(g, 40, 50, 176, 118 + extra.length * 14);
        GG.text(g, 'PAUSED', SW / 2, 64, 0x28, { align: 'center' });
        items().forEach((it, k) => {
          GG.text(g, it, 76, 86 + k * 14, k === sel ? 0x30 : 0x10);
          if (k === sel) GG.text(g, '>', 62, 86 + k * 14, 0x28);
        });
      },
    };
  }

  function selectState() {
    let sel = Math.min(save.reached, GG.stages.length - 1);
    let t = 0;
    GG.audio && GG.audio.music('select');
    setRoute('select');
    return {
      update() {
        t++;
        const n = save.reached + 1;
        if (hit.d || hit.r) { sel = Math.min(sel + 1, n - 1); GG.audio.sfx('tick'); }
        if (hit.u || hit.l) { sel = Math.max(sel - 1, 0); GG.audio.sfx('tick'); }
        if (hit.select) { go(titleState()); return; }
        if (hit.a || hit.start || hit.tap) { GG.audio.sfx('start'); enterStage(sel, false); }
      },
      draw() {
        GG.rect(g, 0, 0, SW, SH, 0x0f);
        GG.deco(g, 6, 6, SW - 12, SH - 12);
        GG.text(g, 'CONTENTS', SW / 2, 18, 0x28, { align: 'center' });
        const top = Math.max(0, Math.min(sel - 5, GG.stages.length - 11));
        for (let k = top; k < Math.min(GG.stages.length, top + 11); k++) {
          const def = GG.stages[k];
          const y = 38 + (k - top) * 14;
          const open = k <= save.reached;
          const num = def.chapter + (def.sub ? '-' + def.sub : '');
          GG.text(g, num, 58, y, !open ? 0x2d : k === sel ? 0x28 : 0x18, { align: 'right' });
          GG.text(g, open ? def.short || def.name : '? ? ? ? ? ?', 66, y, !open ? 0x2d : k === sel ? 0x30 : 0x10);
          if (save.cleared[def.key]) GG.text(g, '`', 236, y, 0x2a);
          if (k === sel) GG.text(g, '>', 12, y, 0x28);
        }
        GG.text(g, 'A: PLAY   ESC: BACK', SW / 2, SH - 22, 0x2d, { align: 'center' });
        if (t < 10) fade(1 - t / 10);
      },
    };
  }

  function titleState() {
    let t = 0, sel = 0;
    const has = save.reached > 0;
    const items = () => has ? ['CONTINUE', 'NEW GAME', 'CHAPTER SELECT'] : ['START'];
    return {
      enter() { GG.audio && GG.audio.music('title'); setRoute(''); },
      update() {
        t++;
        const n = items().length;
        if (hit.d) { sel = (sel + 1) % n; GG.audio.sfx('tick'); }
        if (hit.u) { sel = (sel + n - 1) % n; GG.audio.sfx('tick'); }
        if (hit.select && EMBED) { quit(); return; }
        if (t > 20 && confirm()) {
          GG.audio.sfx('start');
          const it = items()[sel];
          if (it === 'START' || it === 'NEW GAME') go(cineState('opening', () => enterStage(0)));
          else if (it === 'CONTINUE') enterStage(save.reached);
          else go(selectState());
        }
      },
      draw() { GG.drawTitle(g, t, items(), sel, lastInput); if (GG.nes) GG.nes.picture(g, 0, 0, SW, SH, 'title'); },
    };
  }

  function endState() {
    let t = 0;
    return {
      enter() { GG.audio && GG.audio.music('ending'); setRoute(''); },
      update() { t++; if (t > 300 && confirm()) go(titleState()); },
      draw() { GG.drawEnd(g, t); if (GG.nes) GG.nes.picture(g, 0, 0, SW, SH, 'end'); },
    };
  }

  /* ------------------------------------------------------------ main loop */
  let acc = 0, last = 0, fps = 60;
  function frame(now) {
    requestAnimationFrame(frame);
    if (last && now > last) fps += (1000 / (now - last) - fps) * 0.05;
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
      if (toastT > 0 && toastMsg) GG.text(g, toastMsg, SW - 8, SH - 14, 0x30, { align: 'right', shadow: 0x0f });
    }
  }

  GG.boot = () => {
    if (EMBED) document.body.classList.add('embed');
    if (matchMedia('(pointer: coarse)').matches) document.body.classList.add('touch');
    GG.audio && GG.audio.setOn(save.sound);
    if (muteBtn) muteBtn.setAttribute('aria-pressed', String(!save.sound));
    fit();
    const q = new URLSearchParams(location.search);
    if (DEBUG && q.get('stage')) {
      const i = GG.stages.findIndex((s) => s.key === q.get('stage'));
      startStage(i >= 0 ? i : 0); go(playState());
      if (q.get('x')) { W.hero.x = +q.get('x') * 16; W.hero.y = (+q.get('y') || 0) * 16; snapCamera(); }
    } else if (DEBUG && q.get('cine')) {
      go(cineState(q.get('cine'), () => go(titleState())));
    } else followRoute(parseRoute(location.hash));
    requestAnimationFrame(frame);
  };
  // Hooks for the test harness.
  GG._dbg = {
    startStage: (i) => { startStage(i); go(playState()); return W; },
    startAt: (i, c) => { startStage(i, { fromCheck: c }); go(playState()); return W; },
    state: () => state, go, titleState, cineState, cardState, selectState, endState, enterStage, keyHeld, W: () => W,
    startFresh: (i, seed) => { startStage(i, { seed }); go(playState()); return W; },
    recording: () => rec, endRun: (reason) => recEnd(reason), playing: () => state && state.update === playUpdate,
    draw: () => state.draw(), step: (n = 1) => { for (let i = 0; i < n; i++) { readInput(); state.update(); } },
  };
})();
