'use strict';
/*
 * JEKYLL.EXE: the game. The loading screen, the title, the story pages,
 * play (with undo, restart, LOOK and hints), the version book (chapter
 * select), saving, deep links in the hash, and talking to the desk computer
 * when it runs embedded (?embed).
 *
 * Rooms run on core.js; the picture is drawn by render.js onto a Spectrum
 * screen (screen.js) and blown up onto the canvas.
 */
(() => {
  const EMBED = /[?&]embed\b/.test(location.search);
  const DEBUG = /[?&]debug\b/.test(location.search);
  const I = JH.INK;
  const A = JH.attr;
  const CW = 320, CH = 240, OX = 32, OY = 24;
  const SAVE_KEY = 'jekyll:v1';

  let canvas, ctx, img;
  const scr = new JH.Screen();
  let tick = 0;           // frames since boot
  let phase = 0;          // FLASH: swaps every 16 frames at 50Hz

  /* --------------------------------------------------------------- save */
  function loadSave() {
    const blank = { reached: 0, sound: true, done: {}, remarks: {} };
    try { return Object.assign(blank, JSON.parse(localStorage.getItem(SAVE_KEY) || '{}')); }
    catch (e) { return blank; }
  }
  const save = loadSave();
  JH.save = save;
  function persist() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {} }

  const sfx = (name, arg) => { try { JH.audio && JH.audio.sfx(name, arg); } catch (e) {} };
  const music = (name) => { try { JH.audio && JH.audio.music(name); } catch (e) {} };

  function toggleSound() {
    save.sound = !save.sound;
    persist();
    if (JH.audio) JH.audio.setOn(save.sound);
    toast(save.sound ? 'SOUND ON' : 'SOUND OFF');
    const b = document.getElementById('mute');
    if (b) b.setAttribute('aria-pressed', String(!save.sound));
  }
  let toastMsg = null, toastT = 0;
  function toast(m) { toastMsg = m; toastT = 100; }

  function quit() {
    if (EMBED) { try { parent.postMessage({ type: 'jekyll:exit' }, location.origin); } catch (e) {} }
    else location.href = '/games';
  }

  /* ------------------------------------------------------------- routes */
  /*
   * Deep links live in the hash, so the page works as plain static files:
   *   #/chapter/3       chapter III from its first page
   *   #/chapter/3/2     its second room
   *   #/select          the version book
   *   #/story/prologue  a story sequence by name, then the title
   * The hash follows you as you play (replaceState, so Back leaves the game),
   * and on the desk computer the game tells the page around it.
   */
  function parseRoute(hash) {
    const parts = String(hash || '').replace(/^#\/?/, '').split('/').filter(Boolean);
    if (parts[0] === 'chapter' && parts[1]) {
      const c = Number(parts[1]) - 1;
      if (JH.CHAPTERS[c]) {
        const r = parts[2] ? Number(parts[2]) - 1 : null;
        return { kind: 'chapter', c, r: r != null && JH.CHAPTERS[c].rooms[r] ? r : null };
      }
    }
    if (parts[0] === 'select') return { kind: 'select' };
    if (parts[0] === 'story' && parts[1] && JH.storyById(parts[1])) return { kind: 'story', id: parts[1] };
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
    if (EMBED) { try { parent.postMessage({ type: 'jekyll:route', path }, location.origin); } catch (e) {} }
  }
  function followRoute(r) {
    if (r.kind === 'chapter') {
      if (r.r != null) startRoom(r.c, r.r);
      else startChapter(r.c);
    } else if (r.kind === 'select') go(Book());
    else if (r.kind === 'story') { go(Pages(JH.storyById(r.id), () => go(Title()))); setRoute('story/' + r.id); }
    else go(Title());
  }
  addEventListener('hashchange', () => {
    const r = parseRoute(location.hash);
    const path = location.hash.replace(/^#\/?/, '');
    if (path === routeNow) return;
    // Keys pressed for the screen being left don't carry into the new one.
    queue.length = 0;
    followRoute(r);
  });

  /* ------------------------------------------------------------- states */
  let state = null;
  function go(s) { state = s; if (s.enter) s.enter(); }
  JH.go = go;

  /* --------------------------------------------------------------- input */
  const KEYMAP = {
    ArrowUp: 'n', ArrowDown: 's', ArrowLeft: 'w', ArrowRight: 'e',
    KeyW: 'n', KeyS: 's', KeyA: 'w', KeyD: 'e',
    KeyK: 'n', KeyJ: 's', KeyH: 'hint',
    Space: 'wait', Period: 'wait', KeyX: 'drink', KeyZ: 'undo', Backspace: 'undo', KeyU: 'undo',
    KeyR: 'restart', KeyL: 'look', Tab: 'look', Enter: 'ok', KeyE: 'ok', Escape: 'esc', KeyM: 'mute', KeyP: 'esc',
  };
  const queue = [];
  addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    let k = KEYMAP[e.code];
    if (!k && e.key === 'h') k = 'hint';
    if (!k) return;
    e.preventDefault();
    if (k === 'mute') { toggleSound(); return; }
    if (JH.audio) JH.audio.unlock();
    if (e.repeat && !['n', 's', 'e', 'w', 'undo'].includes(k)) return;
    if (queue.length < 2) queue.push(k);
  });

  // Touch: the pad posts the same keys.
  function setupTouch() {
    const pad = document.getElementById('pad');
    if (!pad) return;
    const isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
    if (isTouch) document.body.classList.add('touch');
    const press = (el, on) => el.classList.toggle('on', on);
    pad.querySelectorAll('[data-k]').forEach((el) => {
      const k = el.getAttribute('data-k');
      let timer = null;
      const down = (e) => {
        e.preventDefault();
        if (JH.audio) JH.audio.unlock();
        press(el, true);
        if (k === 'mute') { toggleSound(); return; }
        if (queue.length < 2) queue.push(k);
        // Held arrows repeat, like a key held down.
        if (['n', 's', 'e', 'w'].includes(k)) timer = setInterval(() => { if (queue.length < 1) queue.push(k); }, 220);
      };
      const up = () => { press(el, false); if (timer) clearInterval(timer); timer = null; };
      el.addEventListener('pointerdown', down);
      el.addEventListener('pointerup', up);
      el.addEventListener('pointercancel', up);
      el.addEventListener('pointerleave', up);
    });
  }

  /* ------------------------------------------------------------- drawing */

  /* A window: a box of cells with a border, cleared, text inside. */
  function box(cx, cy, cw, ch, ink = I.white, paper = I.blue, bright = 1) {
    const x = cx * 8, y = cy * 8, w = cw * 8, h = ch * 8;
    scr.clear(x, y, w, h, 0);
    scr.paint(cx, cy, cw, ch, A(ink, paper, bright));
    scr.rect(x + 1, y + 1, w - 2, h - 2, 1);
  }
  function textAt(str, col, row, ink, opts = {}) {
    JH.text(scr, str, col * 8, row * 8, opts);
    if (ink != null) for (let c = col; c < col + str.length && c < 32; c++) scr.ink(c, row, ink, opts.bright != null ? opts.bright : 1);
  }
  const center = (str) => Math.max(0, Math.floor((32 - str.length) / 2));

  function present() {
    scr.render(img, CW, CH, OX, OY, phase);
    ctx.putImageData(img, 0, 0);
  }

  function fit() {
    const tv = document.getElementById('tv');
    if (!tv) return;
    const w = tv.clientWidth, h = tv.clientHeight;
    const s = Math.max(1, Math.floor(Math.min(w / CW, h / CH)));
    // Below an integer fit (tiny frames) scale smoothly rather than crop.
    const scale = Math.min(w / CW, h / CH) < 1 ? Math.min(w / CW, h / CH) : s;
    canvas.style.width = CW * scale + 'px';
    canvas.style.height = CH * scale + 'px';
  }

  /* ========================================================== the states */

  /*
   * Loading, the way a Spectrum loaded from tape: the border striped red and
   * cyan for the pilot tone, then blue and yellow while the picture comes in
   * a third at a time. Any key skips it.
   */
  function Boot(next) {
    let t = 0;
    return {
      enter() { music(null); },
      key() { next(); },
      tick() {
        t++;
        if (t > 170) { next(); return; }
        scr.cls(A(I.white, 0));
        if (t < 50) {
          scr.border = (t >> 2) % 2 ? I.red : I.cyan;
          if (t > 10) textAt('Program: JEKYLL', 0, 0, I.white, { bright: 0 });
        } else {
          scr.border = (Math.floor(t * 7.3) % 3) ? I.blue : I.yellow;
          textAt('Program: JEKYLL', 0, 0, I.white, { bright: 0 });
          // The SCREEN$ comes in by thirds, eight pixel-rows apart, as it did.
          const lines = Math.min(192, Math.floor((t - 50) * 1.7));
          const tmp = new JH.Screen();
          JH.PICS.title(tmp, 0);
          drawTitleText(tmp);
          for (let n = 0; n < lines; n++) {
            const third = Math.floor(n / 64), k = n % 64;
            const y = third * 64 + (k % 8) * 8 + Math.floor(k / 8);
            for (let x = 0; x < 256; x++) scr.pix[y * 256 + x] = tmp.pix[y * 256 + x];
          }
          const cells = Math.floor(Math.max(0, lines - 120) / 72 * 24);
          for (let c = 0; c < cells * 32; c++) scr.attr[c] = tmp.attr[c];
        }
        if (t % 6 === 0) sfx('tape', t < 50 ? 0 : 1);
      },
    };
  }

  function drawTitleText(s) {
    const T = (str, row, ink, bright = 1) => {
      JH.text(s, str, center(str) * 8, row * 8);
      for (let c = center(str); c < center(str) + str.length; c++) s.ink(c, row, ink, bright);
    };
    T('STRANGE CASE OF', 16, I.white, 0);
    T('DR JEKYLL', 17, I.white, 1);
    T('& MR HYDE', 18, I.green, 1);
  }

  function Title() {
    const items = [];
    let sel = 0;
    function build() {
      items.length = 0;
      const started = Object.keys(save.done).length > 0 || save.reached > 0;
      if (started) items.push({ label: 'CONTINUE', run: resume });
      items.push({ label: started ? 'BEGIN AGAIN' : 'BEGIN', run: () => go(Pages(JH.STORY.prologue, () => startChapter(0), 'story/prologue')) });
      items.push({ label: 'THE VERSION BOOK', run: () => go(Book()) });
      items.push({ label: 'SOUND: ' + (save.sound ? 'ON' : 'OFF'), run: () => { toggleSound(); build(); } });
      if (EMBED) items.push({ label: 'QUIT TO DOS', run: quit });
    }
    return {
      enter() { build(); sel = 0; setRoute(''); music('title'); scr.border = I.black; },
      key(k) {
        if (k === 'n') { sel = (sel + items.length - 1) % items.length; sfx('tick'); }
        else if (k === 's') { sel = (sel + 1) % items.length; sfx('tick'); }
        else if (k === 'ok' || k === 'wait' || k === 'drink') { sfx('ok'); items[sel].run(); }
        else if (k === 'esc' && EMBED) quit();
      },
      tick() {
        scr.cls(A(I.white, 0));
        JH.PICS.title(scr, tick);
        drawTitleText(scr);
        items.forEach((it, i) => {
          const row = 20 + i - (items.length > 4 ? 1 : 0);
          const label = (i === sel ? '▪ ' : '  ') + it.label;
          textAt(label, 9, row, i === sel ? I.yellow : I.white, { bright: i === sel ? 1 : 0 });
        });
      },
    };
  }

  /*
   * Story pages: a picture above, words below. A page is { pic, text, hand,
   * title }. Words in double quotes are Stevenson's.
   */
  function Pages(pages, done, route) {
    let i = 0, shown = 0;
    let lines = [];
    function layout() {
      const p = pages[i];
      lines = JH.wrap(p.text || '', 32).slice(0, p.pic ? 9 : 22);
      shown = 0;
      sfx('page');
    }
    return {
      enter() { if (route) setRoute(route); layout(); music(pages.music || 'story'); scr.border = I.black; },
      key(k) {
        if (k === 'esc') { done(); return; }
        if (shown < 9999) { if (shown < lines.join('').length) { shown = 9999; return; } }
        if (k === 'ok' || k === 'wait' || k === 'drink' || k === 'e' || k === 's') {
          i++;
          if (i >= pages.length) done(); else layout();
        } else if ((k === 'w' || k === 'n' || k === 'undo') && i > 0) { i--; layout(); }
      },
      tick() {
        const p = pages[i];
        scr.cls(A(I.white, 0));
        const top = p.pic ? 15 : (p.title ? 3 : 1);
        if (p.pic) (JH.PICS[p.pic] || JH.PICS.blank)(scr, tick);
        if (p.title) {
          const t = p.title;
          const row = p.pic ? 15 : 1;
          textAt(t, center(t), row, I.yellow);
        }
        const start = p.title && p.pic ? 16 : top;
        let budget = Math.floor(shown);
        shown += 2.5;
        lines.forEach((l, k) => {
          const row = start + k;
          if (row > 23) return;
          const vis = l.slice(0, Math.max(0, budget));
          budget -= l.length;
          if (vis) textAt(vis, 0, row, p.ink != null ? p.ink : I.white, { hand: p.hand, bright: p.hand === 'H' ? 1 : 0 });
          if (p.hand === 'H') for (let c = 0; c < 32; c++) scr.ink(c, row, I.green, 1);
        });
        if (shown >= lines.join('').length) {
          const more = i < pages.length - 1 ? '→' : '▪';
          textAt(more, 31, 23, I.yellow);
          scr.flash(31, 23, true);
        }
      },
    };
  }

  /* A chapter's card: its number, its title, the book's date for it. */
  function Card(c, done) {
    const ch = JH.CHAPTERS[c];
    let t = 0;
    return {
      enter() { setRoute('chapter/' + (c + 1)); music('card'); sfx('bell'); scr.border = I.black; },
      key() { if (t > 20) done(); },
      tick() {
        t++;
        if (t > 220) { done(); return; }
        scr.cls(A(I.white, 0));
        const num = 'CHAPTER ' + ch.id;
        textAt(num, center(num), 8, I.yellow);
        const words = JH.wrap(ch.title, 30);
        words.forEach((w, k) => textAt(w, center(w), 10 + k, I.white));
        if (ch.date) textAt(ch.date, center(ch.date), 14, I.cyan, { bright: 0 });
        if (ch.blurb) JH.wrap(ch.blurb, 30).forEach((w, k) => textAt(w, 1, 17 + k, I.white, { bright: 0 }));
      },
    };
  }

  /* ---------------------------------------------------------------- play */

  /* Back to where you were: the first room of your furthest chapter you haven't finished. */
  function resume() {
    const c = Math.min(save.reached, JH.CHAPTERS.length - 1);
    const r = JH.CHAPTERS[c].rooms.findIndex((id) => !save.done[id]);
    if (r > 0) startRoom(c, r);
    else if (r < 0 && c + 1 < JH.CHAPTERS.length) startChapter(c + 1);
    else startChapter(c);
  }

  function startChapter(c) {
    save.reached = Math.max(save.reached, c);
    persist();
    const ch = JH.CHAPTERS[c];
    const intro = JH.chapterStory(ch.id, 'intro');
    go(Card(c, () => {
      if (intro && intro.length) go(Pages(intro, () => startRoom(c, 0), 'chapter/' + (c + 1)));
      else startRoom(c, 0);
    }));
  }

  function startRoom(c, r) {
    save.reached = Math.max(save.reached, c);
    persist();
    go(Play(c, r));
  }

  function endChapter(c) {
    const ch = JH.CHAPTERS[c];
    const outro = JH.chapterStory(ch.id, 'outro');
    const next = () => {
      if (c + 1 < JH.CHAPTERS.length) startChapter(c + 1);
      else go(Pages(JH.STORY.ending, () => go(End()), 'story/ending'));
    };
    if (outro && outro.length) go(Pages(outro, next, 'chapter/' + (c + 1)));
    else next();
  }

  /*
   * The solver, in a worker, for hints and for knowing when a room is lost.
   * One question at a time: a newer one cancels the one still running (the
   * worker is simply replaced), so a long search never piles up behind you.
   */
  let worker = null, busyJob = null, jobId = 0;
  function newWorker() {
    try {
      const w = new Worker('solver.js');
      w.onmessage = (e) => {
        if (!busyJob || busyJob.id !== e.data.id) return;
        const j = busyJob;
        busyJob = null;
        j.resolve(e.data);
      };
      w.onerror = () => { worker = false; };
      return w;
    } catch (e) { return false; }
  }
  function solveAsync(roomId, st, max) {
    return new Promise((resolve) => {
      if (worker === null) worker = newWorker();
      if (worker === false) {
        // No workers (file:// in some browsers): ask a smaller question here.
        const cr = JH.compile(roomId);
        const r = JH.solve(cr, st, { max: Math.min(max, 40000) });
        resolve({ ok: r.ok, capped: r.capped, first: r.path ? r.path[0] : null, len: r.path ? r.path.length : 0 });
        return;
      }
      if (busyJob) {
        busyJob.resolve({ ok: false, capped: true, stale: true });
        worker.terminate();
        worker = newWorker();
        if (worker === false) { resolve({ ok: false, capped: true }); return; }
      }
      const id = ++jobId;
      busyJob = { id, resolve };
      worker.postMessage({ id, room: roomId, st, max });
    });
  }

  const FAIL_TEXT = JH.FAIL_TEXT || {};

  function Play(c, r) {
    const ch = JH.CHAPTERS[c];
    const roomId = ch.rooms[r];
    const cr = JH.compile(roomId);
    const card = (JH.ROOM_CARDS || {})[roomId] || null;
    let st = JH.initState(cr);
    let hist = [st];
    let anim = null;          // { t, dur, ev, from, to, change }
    let msg = null;           // { lines, hand, t }
    let popup = null;         // a long message in a window over the room
    let look = false;
    let failShown = null;
    let stuck = false, stuckFor = null;
    let hintDir = null, hintFor = null;
    let banner = card ? 160 : 0;
    const stats = { turns: 0, undos: 0, hints: 0, fails: 0 };
    const night = !!cr.def.night;
    const frames = new Map();

    // Two lines fit in the panel under the status line, leaving the third
    // for a warning; anything longer opens a window over the room.
    function say(text, hand) {
      const lines = JH.wrap(text, 32);
      if (lines.length > 2) popup = { lines: JH.wrap(text, 28), hand };
      else msg = { lines, hand, t: 0 };
    }

    // Once you stop for a moment, ask whether this room can still be won.
    let stuckTimer = null;
    function checkStuck(s) {
      stuck = false;
      stuckFor = s;
      if (stuckTimer) clearTimeout(stuckTimer);
      if (s.out) return;
      stuckTimer = setTimeout(() => {
        if (stuckFor !== s || state !== self) return;
        solveAsync(roomId, s, 200000).then((res) => {
          if (stuckFor !== s || res.stale) return;
          stuck = !res.ok && !res.capped;
          if (stuck) sfx('doom');
        });
      }, 350);
    }

    function act(a) {
      if (anim || failShown) return;
      hintDir = null;
      const res = JH.step(cr, st, a);
      for (const e of res.ev) if (e.t === 'say') say(e.text, e.who ? null : st.f);
      if (!res.used) {
        if (res.ev.some((e) => e.t === 'blocked')) sfx('bump');
        else if (DIRS4.includes(a)) sfx('bump');
        else if (a === 'drink') sfx('bump');
        return;
      }
      stats.turns++;
      const prev = st;
      st = res.st;
      hist.push(st);
      const change = res.ev.find((e) => e.t === 'change');
      anim = { t: 0, dur: change ? 46 : 9, ev: res.ev, from: prev, change };
      for (const e of res.ev) {
        if (e.t === 'move' && e.who === -1) sfx(prev.f === 'H' ? 'stepH' : 'stepJ');
        if (e.t === 'pick') { sfx('pick'); if (e.say) say(e.say); }
        if (e.t === 'act') sfx('act');
        if (e.t === 'leave') { sfx('door'); if (e.say) say(e.say); }
        if (e.t === 'drink') sfx('drink');
        if (e.t === 'move' && e.who >= 0 && e.why === 'away') sfx('flinch');
      }
      if (change) sfx('change', change.to);
      // The church clocks strike the hours.
      const before = cr.clock + prev.t, after = cr.clock + st.t;
      if (Math.floor(after / 60) > Math.floor(before / 60)) {
        sfx('bell');
        if (after % 1440 === 0 && !change) say('MIDNIGHT STRIKES OVER LONDON.');
      }
      if (msg) msg.t++;
    }

    function finishAnim() {
      const out = st.out;
      anim = null;
      frames.clear();
      if (!out) { checkStuck(st); return; }
      if (out.k === 'fail') {
        stats.fails++;
        const f = FAIL_TEXT[out.why] || { quote: '', text: 'IT ENDS BADLY.' };
        const who = out.by != null ? cr.people[out.by] : null;
        const timeText = out.why === 'time' && cr.def.timeText ? cr.def.timeText : null;
        failShown = { quote: timeText || f.quote, text: f.text.replace('{who}', who ? who.name : 'SOMEONE'), t: 0 };
        sfx('fail', out.why);
        markRemark('fail');
        return;
      }
      // Won the room.
      sfx('win');
      const done = save.done[roomId];
      if (!done || done.turns > stats.turns) save.done[roomId] = { turns: stats.turns, undos: stats.undos, hints: stats.hints };
      persist();
      setTimeout(() => {
        if (state !== self) return;
        if (r + 1 < ch.rooms.length) startRoom(c, r + 1);
        else endChapter(c);
      }, 500);
    }

    function markRemark(kind) {
      // The version book's remarks: "double" for a chapter you needed another
      // go at, and once, early, "total failure!!!".
      const id = ch.id;
      if (kind === 'fail') {
        if (!Object.values(save.remarks).includes('total failure!!!')) save.remarks[id] = 'total failure!!!';
        else if (!save.remarks[id]) save.remarks[id] = 'double';
        persist();
      }
    }

    function undo() {
      if (hist.length < 2) { sfx('bump'); return; }
      hist.pop();
      st = hist[hist.length - 1];
      failShown = null;
      anim = null;
      stats.undos++;
      sfx('undo');
      checkStuck(st);
    }
    function restart() {
      st = hist[0];
      hist = [st];
      failShown = null;
      anim = null;
      sfx('undo');
      checkStuck(st);
    }
    function hint() {
      if (st.out) return;
      stats.hints++;
      hintFor = st;
      const mine = st;
      solveAsync(roomId, st, 1500000).then((res) => {
        if (st !== mine) return;
        if (res.ok && res.first) { hintDir = res.first; sfx('tick'); }
        else { say(res.capped ? 'NO HINT COMES TO MIND. TRY LOOK (L).' : 'THIS CANNOT END WELL. Z UNDOES.'); }
      });
    }

    const self = {
      enter() {
        setRoute('chapter/' + (c + 1) + '/' + (r + 1));
        music(cr.def.music || (cr.change ? 'shudder' : night ? 'night' : 'house'));
        scr.border = night ? I.blue : I.black;
        checkStuck(st);
      },
      key(k) {
        if (popup) { popup = null; return; }
        if (banner > 0 && stats.turns === 0 && k === 'ok') { banner = 0; return; }
        if (failShown) {
          if (k === 'undo' || k === 'ok' || k === 'wait') undo();
          else if (k === 'restart') restart();
          else if (k === 'esc') go(Pause(self));
          return;
        }
        if (k === 'esc' || k === 'ok') { go(Pause(self)); return; }
        if (k === 'undo') { undo(); return; }
        if (k === 'restart') { restart(); return; }
        if (k === 'look') { look = !look; sfx('tick'); return; }
        if (k === 'hint') { hint(); return; }
        if (anim) { if (queue.length < 1) queue.unshift(k); return; }
        if (['n', 's', 'e', 'w', 'wait', 'drink'].includes(k)) { banner = Math.min(banner, 30); act(k); }
      },
      busy() { return !!anim; },
      debug() { return { turns: stats.turns, st, room: roomId, stuck, fail: failShown, popup: !!popup }; },
      tick() {
        // Animate the last turn: everyone steps in two 8-pixel moves.
        const offs = new Map();
        let playerSprite = null, playerFlash = false;
        const showSt = st;
        if (anim) {
          anim.t++;
          const moveDur = 9;
          const mt = Math.min(anim.t, moveDur);
          const left = mt < 4 ? 16 : mt < moveDur ? 8 : 0;
          for (const e of anim.ev) {
            if (e.t !== 'move') continue;
            offs.set(e.who, [(e.from[0] - e.to[0]) * left, (e.from[1] - e.to[1]) * left]);
            frames.set(e.who, mt >= 4 ? 1 : 0);
          }
          if (anim.change && anim.t > moveDur) {
            // The change: the figure flickers between its two selves.
            const k = anim.t - moveDur;
            const from = anim.change.to === 'H' ? 'jekyll' : 'hyde';
            const to = anim.change.to === 'H' ? 'hyde' : 'jekyll';
            playerSprite = k % 6 < 3 ? from : to;
            if (k > 26) playerSprite = to;
            playerFlash = k < 26;
            scr.border = k % 4 < 2 ? I.green : I.magenta;
          }
          if (anim.t >= anim.dur) { scr.border = night ? I.blue : I.black; finishAnim(); }
        }
        scr.cls(A(I.white, 0));
        const danger = anim || failShown ? null : dangerFor(st);
        JH.drawRoom(scr, cr, showSt, { night, look, offs, frames, playerSprite, playerFlash, phase, danger: danger && danger.tiles });
        if (hintDir && !anim) {
          const [dx, dy] = JH.DIRS[hintDir] || [0, 0];
          const glyph = { n: '↑', s: '↓', e: '→', w: '←', wait: '.', drink: 'X' }[hintDir];
          const hx = (st.x + dx) * 2, hy = (st.y + dy) * 2;
          scr.clear(hx * 8 + 4, hy * 8 + 4, 8, 8, 0);
          JH.text(scr, glyph, hx * 8 + 4, hy * 8 + 4);
          scr.ink(hx, hy, I.yellow, 1);
          scr.flash(hx, hy, true);
        }
        drawStatus();
        if (banner > 0 && card) {
          banner--;
          const lines = JH.wrap(card, 26);
          box(2, 1, 28, lines.length + 2, I.yellow, I.black, 1);
          lines.forEach((l, k) => textAt(l, 3, 2 + k, I.yellow));
        }
        if (popup) {
          const lines = popup.lines.slice(0, 16);
          const top = Math.max(1, 9 - Math.ceil(lines.length / 2));
          box(1, top, 30, lines.length + 2, I.white, I.blue, 1);
          lines.forEach((l, k) => textAt(l, 2, top + 1 + k, I.white, { hand: popup.hand }));
        }
        if (failShown) drawFail();
      },
    };

    /*
     * Which of your next moves would end the night: the squares are drawn
     * red, and waiting or drinking get a warning in the panel. Nothing that
     * can be seen coming is a surprise.
     */
    let dangerSt = null, dangerVal = null;
    function dangerFor(s) {
      if (s === dangerSt) return dangerVal;
      const tiles = new Set();
      const acts = [];
      if (!s.out) {
        for (const a of JH.ACTIONS) {
          const r = JH.step(cr, s, a);
          if (!r.used || !r.st.out || r.st.out.k !== 'fail') continue;
          const d = JH.DIRS[a];
          if (d) tiles.add((s.x + d[0]) + ',' + (s.y + d[1]));
          else acts.push(a);
        }
      }
      dangerSt = s;
      dangerVal = { tiles, acts };
      return dangerVal;
    }

    function drawStatus() {
      // The top line, in its colours: the time, who you are, the doses you
      // carry, and the turns to the change (or the hour to be done by). At
      // its longest, "12:05 PM JEKYLL DOSES 4 CHANGE 9", it fills the line.
      const parts = [[JH.clockText(cr.clock + st.t), I.yellow], [st.f === 'H' ? 'HYDE' : 'JEKYLL', st.f === 'H' ? I.green : I.white]];
      if (st.doses || cr.def.start.doses || Object.values(cr.def.acts || {}).some((a) => a.give && a.give.doses)) parts.push(['DOSES ' + st.doses, I.red]);
      if (cr.change && st.f === 'J') parts.push(['CHANGE ' + st.chg, I.magenta]);
      else if (cr.deadline != null) parts.push(['BY ' + JH.clockText(cr.deadline).replace(' ', ''), I.cyan]);
      let top = '';
      const spans = [];
      for (const [text, ink] of parts) {
        if (top && top.length + 1 + text.length > 32) break;
        if (top) top += ' ';
        spans.push([top.length, top.length + text.length, ink, 1]);
        top += text;
      }
      const lines = [{ text: top, spans }];
      let body;
      if (msg && msg.t < 3) body = msg.lines.map((t) => ({ text: t, ink: I.white, bright: 1 }));
      else body = JH.wrap(JH.goalText(cr, st), 32).map((t) => ({ text: t, ink: I.cyan, bright: 0 }));
      const dz = !anim && !failShown ? dangerFor(st) : null;
      if (dz && dz.acts.length) {
        const both = dz.acts.includes('wait') && dz.acts.includes('drink');
        const warn = both ? 'TO WAIT OR DRINK HERE IS FATAL.' : (dz.acts.includes('wait') ? 'WAITING' : 'DRINKING') + ' HERE WOULD BE FATAL.';
        body = body.slice(0, 2).concat([{ text: warn, ink: I.red, bright: 1 }]);
      }
      if (stuck && !failShown) body = body.slice(0, 2).concat([{ text: 'THIS CANNOT END WELL. Z UNDOES.', ink: I.red, bright: 1, flash: true }]);
      if (toastT > 0) { body = [{ text: toastMsg, ink: I.yellow, bright: 1 }].concat(body.slice(0, 2)); }
      JH.drawPanel(scr, lines.concat(body).slice(0, 4));
    }

    function drawFail() {
      failShown.t++;
      if (failShown.t < 20) scr.border = failShown.t % 4 < 2 ? I.red : I.black;
      else scr.border = I.red;
      const q = JH.wrap(failShown.quote, 28);
      const t = JH.wrap(failShown.text, 28);
      const h = q.length + t.length + 5;
      const top = Math.max(0, 9 - Math.floor(h / 2));
      box(1, top, 30, h, I.white, I.red, 1);
      q.forEach((l, k) => textAt(l, 2, top + 1 + k, I.white));
      t.forEach((l, k) => textAt(l, 2, top + 2 + q.length + k, I.yellow));
      textAt('Z: UNDO   R: START OVER', 2, top + h - 2, I.white, { bright: 0 });
    }

    return self;
  }
  const DIRS4 = ['n', 's', 'e', 'w'];

  function Pause(play) {
    const items = [
      { label: 'CONTINUE', run: () => go(play) },
      { label: 'START THE ROOM OVER', run: () => { play.key('restart'); go(play); } },
      { label: 'THE VERSION BOOK', run: () => go(Book()) },
      { label: 'SOUND: ' + (save.sound ? 'ON' : 'OFF'), run: () => { toggleSound(); items[3].label = 'SOUND: ' + (save.sound ? 'ON' : 'OFF'); } },
      { label: 'TITLE', run: () => go(Title()) },
    ];
    if (EMBED) items.push({ label: 'QUIT TO DOS', run: quit });
    let sel = 0;
    return {
      key(k) {
        if (k === 'n') { sel = (sel + items.length - 1) % items.length; sfx('tick'); }
        else if (k === 's') { sel = (sel + 1) % items.length; sfx('tick'); }
        else if (k === 'ok' || k === 'wait' || k === 'drink') { sfx('ok'); items[sel].run(); }
        else if (k === 'esc') { if (EMBED) quit(); else go(play); }
      },
      tick() {
        play.tick();
        // Inside the border: the longest item with its marker, and a row
        // free above the bottom edge for the Esc line.
        box(4, 5, 24, items.length + 6, I.white, I.blue, 1);
        textAt('PAUSED', center('PAUSED'), 6, I.yellow);
        items.forEach((it, i) => textAt((i === sel ? '▪ ' : '  ') + it.label, 5, 8 + i, i === sel ? I.yellow : I.white));
        textAt(EMBED ? 'ESC: QUIT TO DOS' : 'ESC: CONTINUE', 7, 9 + items.length, I.cyan, { bright: 0 });
      },
    };
  }

  /*
   * The version book, which is the chapter select: "The book was an
   * ordinary version book and contained little but a series of dates."
   */
  function Book() {
    let sel = Math.min(save.reached, JH.CHAPTERS.length - 1);
    const open = (i) => DEBUG || i <= save.reached;
    // "a brief remark was appended to a date": after the marker, numeral and
    // date, twelve columns are left on the row. A longer remark leaves its
    // marks of exclamation there and is written out under the chapter.
    const REMARK_COLS = 12;
    const rowRemark = (ch) => {
      const r = open(JH.CHAPTERS.indexOf(ch)) ? save.remarks[ch.id] || '' : '';
      return r.length <= REMARK_COLS ? r : r.replace(/^[^!]*/, '');
    };
    return {
      enter() { setRoute('select'); music('story'); scr.border = I.black; },
      key(k) {
        if (k === 'n') { sel = (sel + JH.CHAPTERS.length - 1) % JH.CHAPTERS.length; sfx('tick'); }
        else if (k === 's') { sel = (sel + 1) % JH.CHAPTERS.length; sfx('tick'); }
        else if (k === 'ok' || k === 'wait' || k === 'drink') { if (open(sel)) { sfx('ok'); startChapter(sel); } else sfx('bump'); }
        else if (k === 'esc' || k === 'undo') go(Title());
      },
      tick() {
        // Like Jekyll's own: "a series of dates", a word or two against some.
        scr.cls(A(I.black, I.white, 1));
        textAt('THE VERSION BOOK', 8, 1, I.black);
        scr.line(64, 18, 191, 18, 1);
        JH.CHAPTERS.forEach((ch, i) => {
          const row = 3 + i;
          const unlocked = open(i);
          const done = ch.rooms.every((id) => save.done[id]);
          const remark = rowRemark(ch);
          const num = ch.id.padStart(4);
          const date = unlocked ? ch.date || '18\u2014' : '18\u2014';
          const line = (i === sel ? '\u25aa' : ' ') + num + '  ' + date.padEnd(12) + (remark ? ' ' + remark : done ? '  \u2713' : '');
          JH.text(scr, line.slice(0, 32), 0, row * 8, { hand: 'J' });
          for (let c = 0; c < 32; c++) scr.attr[row * 32 + c] = A(i === sel ? I.red : unlocked ? I.black : I.blue, I.white, 1);
        });
        const ch = JH.CHAPTERS[sel];
        const unlocked = open(sel);
        const title = unlocked ? ch.title : 'NOT YET WRITTEN.';
        JH.wrap(title, 30).forEach((l, k) => textAt(l, 1, 16 + k, I.red));
        if (unlocked && ch.blurb) JH.wrap(ch.blurb, 30).forEach((l, k) => textAt(l, 1, 18 + k, I.black));
        const rooms = ch.rooms.length;
        const doneRooms = ch.rooms.filter((id) => save.done[id]).length;
        if (unlocked) textAt((doneRooms + ' OF ' + rooms + (rooms === 1 ? ' ROOM' : ' ROOMS') + ' DONE').slice(0, 30), 1, 21, I.blue);
        const full = unlocked ? save.remarks[ch.id] || '' : '';
        if (full && full !== rowRemark(ch)) textAt(full, 1, 22, I.black, { hand: 'J' });
        const help = 'ENTER: OPEN   ESC: BACK';
        textAt(help, center(help), 23, I.blue);
      },
    };
  }

  function End() {
    let t = 0;
    return {
      enter() { setRoute('story/ending'); music('end'); scr.border = I.black; },
      key() { if (t > 60) go(Title()); },
      tick() {
        t++;
        scr.cls(A(I.white, 0));
        const lines = JH.CREDITS || ['THE END'];
        lines.forEach((l, k) => textAt(l, center(l), 3 + k, k === 0 ? I.yellow : I.white, { bright: k === 0 ? 1 : 0 }));
      },
    };
  }

  /* ------------------------------------------------------------- the loop */

  let last = 0, acc = 0;
  const STEP = 1000 / 50;   // the Spectrum's 50 frames a second
  function frame(now) {
    requestAnimationFrame(frame);
    if (!last) last = now;
    acc += Math.min(200, now - last);
    last = now;
    let did = false;
    while (acc >= STEP) {
      acc -= STEP;
      tick++;
      if (tick % 16 === 0) phase ^= 1;
      if (toastT > 0) toastT--;
      if (state && !(state.busy && state.busy())) {
        const k = queue.shift();
        if (k && state.key) state.key(k);
      }
      if (state && state.tick) state.tick();
      did = true;
    }
    if (did) present();
  }

  JH.boot = function () {
    canvas = document.getElementById('screen');
    ctx = canvas.getContext('2d');
    img = ctx.createImageData(CW, CH);
    if (EMBED) document.body.classList.add('embed');
    setupTouch();
    fit();
    addEventListener('resize', fit);
    if (JH.audio) JH.audio.setOn(save.sound);
    const muteBtn = document.getElementById('mute');
    if (muteBtn) {
      muteBtn.setAttribute('aria-pressed', String(!save.sound));
      muteBtn.addEventListener('click', () => toggleSound());
    }
    const r = parseRoute(location.hash);
    const seenBoot = (() => { try { return sessionStorage.getItem('jekyll:loaded'); } catch (e) { return null; } })();
    const after = () => { try { sessionStorage.setItem('jekyll:loaded', '1'); } catch (e) {} followRoute(r); };
    if (r.kind === 'title' && !seenBoot && !DEBUG) go(Boot(after));
    else after();
    requestAnimationFrame(frame);
    // For the browser checks: the live state, and a way to press keys.
    JH._dbg = { state: () => state, press: (k) => queue.push(k), save, route: () => routeNow };
  };
})();
