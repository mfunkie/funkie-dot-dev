'use strict';
/* HARKER.EXE: point-and-click engine */
const G = (() => {
  const scenes = {}, items = {}, chapters = [];
  const KEY = 'harker-papers-v1';
  const EMBED = /[?&]embed\b/.test(location.search);
  const $ = id => document.getElementById(id);
  const fresh = () => ({ scene: null, chapter: null, inv: [], f: {}, sel: null, verb: 'act', unlocked: 1, reveal: false });
  let S = fresh();
  let queue = [], showing = false, overlayKind = null;

  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }
  function load() { try { const r = localStorage.getItem(KEY); return r ? JSON.parse(r) : null; } catch (e) { return null; } }

  const api = {
    say(...lines) {
      for (const l of lines) {
        if (typeof l === 'function') queue.push({ fn: l });
        else if (Array.isArray(l)) queue.push({ who: l[0], t: l[1] });
        else queue.push({ t: l });
      }
      pump(); return api;
    },
    then(fn) { queue.push({ fn }); pump(); return api; },
    flag(k, v = true) { S.f[k] = v; save(); return api; },
    has(k) { return !!S.f[k]; },
    get(k) { return S.f[k]; },
    count(k) { S.f[k] = (S.f[k] || 0) + 1; save(); return S.f[k]; },
    give(id) {
      if (!S.inv.includes(id)) S.inv.push(id);
      S.flash = id; save(); render(); return api;
    },
    take(id) { S.inv = S.inv.filter(i => i !== id); if (S.sel === id) S.sel = null; save(); render(); return api; },
    hasItem(id) { return S.inv.includes(id); },
    go(id) { queue.push({ fn: () => enter(id) }); pump(); return api; },
    endChapter(next) { queue.push({ fn: () => chapterCard(next) }); pump(); return api; },
    ending() { queue.push({ fn: () => epilogue() }); pump(); return api; },
    render() { render(); return api; },
    state: () => S,
  };

  /* ---------- message window ---------- */
  function pump() {
    if (showing) return;
    while (queue.length) {
      const q = queue.shift();
      if (q.fn) { q.fn(api); if (showing) return; continue; }
      showLine(q); showing = true; return;
    }
    const box = $('box');
    if (!box.hidden) box.classList.add('idle');
    render();
  }
  function showLine(q) {
    const box = $('box');
    const who = q.who ? `<span class="who">${q.who.toUpperCase()}:</span>` : '';
    box.querySelector('.line').innerHTML = who + `<span class="${q.who ? 'speech' : 'narr'}">${q.t}</span>`;
    box.hidden = false; box.classList.remove('idle');
    box.classList.remove('fresh'); void box.offsetWidth; box.classList.add('fresh');
    const win = box.querySelector('.dwin'); win.scrollTop = 0;
  }
  function advance() { if (!showing) return; showing = false; pump(); }

  /* ---------- rendering ---------- */
  function spotList(d) { return (d.spots ? d.spots(S, api) : []).filter(h => h && !h.hidden); }
  function render() {
    const d = scenes[S.scene]; if (!d) return;
    const ch = chapters.find(c => c.id === S.chapter) || {};
    $('art').innerHTML = d.art(S, api);
    $('doc').textContent = d.doc || ch.doc || '';
    $('place').textContent = (d.title || '').toUpperCase();
    const sp = $('spots'); sp.innerHTML = '';
    sp.classList.toggle('reveal', !!S.reveal);
    for (const h of spotList(d)) {
      const b = document.createElement('button');
      b.className = 'spot' + (h.round ? ' round' : '');
      b.style.left = (h.x / 8) + '%'; b.style.top = (h.y / 5) + '%';
      b.style.width = (h.w / 8) + '%'; b.style.height = (h.h / 5) + '%';
      b.setAttribute('aria-label', h.name);
      b.innerHTML = `<span class="tag">${h.name}</span>`;
      b.addEventListener('click', e => { e.stopPropagation(); clickSpot(h); });
      b.addEventListener('mouseenter', () => hoverLabel(h.name));
      b.addEventListener('mouseleave', () => hoverLabel(null));
      b.addEventListener('focus', () => hoverLabel(h.name));
      sp.appendChild(b);
    }
    $('hud').innerHTML = d.hud ? d.hud(S, api) : '';
    $('hud').hidden = !d.hud;
    document.querySelectorAll('.verb').forEach(v => v.setAttribute('aria-pressed', String(v.dataset.verb === S.verb && !S.sel)));
    hoverLabel(null);
    const inv = $('inv'); inv.innerHTML = '';
    if (!S.inv.length) inv.innerHTML = '<p class="empty">Nothing.</p>';
    S.inv.forEach((id, i) => {
      const it = items[id]; if (!it) return;
      const b = document.createElement('button');
      b.className = 'item' + (S.sel === id ? ' sel' : '') + (S.flash === id ? ' flash' : '');
      b.setAttribute('aria-pressed', String(S.sel === id));
      b.title = `${i + 1}: ${it.name}`;
      b.innerHTML = `<svg viewBox="0 0 40 40" aria-hidden="true">${it.icon}</svg><span>${it.name}</span>`;
      b.addEventListener('click', () => clickItem(id));
      inv.appendChild(b);
    });
    S.flash = null;
    $('reveal').setAttribute('aria-pressed', String(!!S.reveal));
  }
  function hoverLabel(name) {
    const st = $('status');
    if (S.sel) st.textContent = `Use ${items[S.sel].name} on ${name || '...'}`;
    else if (S.verb === 'look') st.textContent = 'Look at ' + (name || '...');
    else st.textContent = name || 'Tap the scene';
  }
  function resolve(v) { return typeof v === 'function' ? v(api, S) : v; }

  function clickSpot(h) {
    if (showing) { advance(); return; }
    if (S.sel) {
      const id = S.sel; S.sel = null;
      const fn = h.use && (h.use[id] || h.use['*']);
      if (fn) { typeof fn === 'function' ? fn(api, id) : api.say(fn); }
      else api.say(pickWrong(id, h));
    } else if (S.verb === 'look') {
      const t = resolve(h.look); if (t) api.say(...[].concat(t));
      else api.say(`Nothing more to see in the ${h.name.toLowerCase()}.`);
    } else {
      if (typeof h.act === 'function') h.act(api, S);
      else if (h.act) api.say(...[].concat(h.act));
      else { const t = resolve(h.look); api.say(...[].concat(t || 'Nothing happens.')); }
    }
    save(); render();
  }
  const wrongs = ['That would do no good here.', 'No. Something else is needed.', 'It will not serve here.', 'Nothing comes of it.'];
  function pickWrong(id, h) { return h.wrong || wrongs[(id.length + h.name.length) % wrongs.length]; }

  function clickItem(id) {
    if (showing) { advance(); return; }
    if (S.verb === 'look' && !S.sel) { const it = items[id]; if (it.onLook && it.onLook(api, S)) return; api.say(it.desc); return; }
    S.sel = S.sel === id ? null : id; render();
  }
  function setVerb(v) { if (showing) { advance(); return; } S.verb = v; S.sel = null; render(); }

  /* ---------- scenes & chapters ---------- */
  function enter(id) {
    S.scene = id; S.sel = null; save(); render();
    const d = scenes[id];
    if (d.onEnter && !S.f['seen:' + id]) { S.f['seen:' + id] = true; d.onEnter(api, S); }
  }
  function overlay(kind, html) {
    const o = $('overlay'); o.innerHTML = html; o.hidden = false; overlayKind = kind;
    const f = o.querySelector('button, a'); if (f) setTimeout(() => f.focus({ preventScroll: true }), 30);
    return o;
  }
  function closeOverlay() { $('overlay').hidden = true; overlayKind = null; }
  const win = (title, body, wide) => `<div class="dwin"${wide ? ` style="width:min(100%,calc(var(--cell)*${wide}))"` : ''}><h2 class="wtitle"><span>${title}</span></h2>${body}</div>`;
  const btn = (id, label) => `<button class="btn" id="${id}">${label}</button>`;
  const reduced = () => window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  function typewrite(el, text, done) {
    if (reduced()) { el.textContent = text; el.classList.remove('typed'); done && done(); return; }
    let i = 0; el.textContent = ''; el.classList.add('typed');
    const tick = () => { el.textContent = text.slice(0, ++i); if (i < text.length) setTimeout(tick, 28); else { el.classList.remove('typed'); done && done(); } };
    tick();
  }
  const fileOf = s => s.replace(/^[^A-Za-z]*/, '').split(/[\s']/)[0].toUpperCase().slice(0, 8);

  function chapterCard(id) {
    const i = chapters.findIndex(c => c.id === id); const ch = chapters[i];
    S.unlocked = Math.max(S.unlocked, i + 1); save();
    const o = overlay('card', win(`CHAPTER ${i + 1} OF ${chapters.length}`, `
        <p class="cyan" id="dh">&nbsp;</p>
        <p class="dim">${ch.date}</p>
        <h3 class="big yellow">${ch.title}</h3>
        ${ch.intro.map(p => `<p>${p}</p>`).join('')}
        <div class="btns">${btn('begin', 'Begin', 'B')}</div>`, 40));
    typewrite(o.querySelector('#dh'), `${fileOf(ch.doc)}.TXT  ${ch.doc}`);
    o.querySelector('#begin').onclick = () => startChapter(id);
  }
  function startChapter(id) {
    const ch = chapters.find(c => c.id === id);
    closeOverlay(); queue = []; showing = false; $('box').hidden = true;
    S.chapter = id; S.f = {}; S.inv = (ch.inv || []).slice(); S.sel = null; S.verb = 'act';
    if (ch.opening) queue.push({ t: ch.opening });
    enter(ch.start);
    pump();
  }

  function titleArt() {
    return `<svg class="title-art" viewBox="0 0 800 300" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${A.defs()}
      ${A.sky('#0a0f1e', '#2a3350', 'skyT')}${A.stars(60, 5, 240)}${A.moon(600, 80, 24)}
      ${A.castle(330, 300, .95, '#04050a', [[-40, -112], [56, -96], [-118, -62]])}
      <path d="M0 260 L120 230 L240 270 L470 250 L620 280 L800 240 V300 H0Z" fill="#04050a"/>
      ${A.bat(560, 120, 1.4)}${A.bat(520, 96, .9)}${A.bat(640, 150, 1)}${A.fog(270, .25)}${A.vignette()}</svg>`;
  }
  function titleScreen() {
    const saved = load();
    const o = overlay('title', win('HARKER.EXE', `
        ${titleArt()}
        <h1 class="big game-title">THE HARKER PAPERS</h1>
        <p class="cyan">A point-and-click adventure through Bram Stoker's Dracula, told in the hands of those who wrote it down.</p>
        <div class="menu">
          ${saved && saved.scene ? btn('cont', 'Continue', 'C') : ''}
          ${btn('new', 'New game', 'N')}
          ${btn('chs', 'Chapters', 'h')}
          ${btn('how', 'How to play', 'H')}
          ${EMBED ? btn('quit', 'Quit to DOS', 'Q') : '<a class="btn" href="/">Back to funkie.dev</a>'}
        </div>`, 36));
    if (saved && saved.scene) o.querySelector('#cont').onclick = () => {
      S = Object.assign(fresh(), saved); closeOverlay(); queue = []; showing = false; render();
      api.say('The papers lie where you left them.');
    };
    o.querySelector('#new').onclick = () => { const r = S.reveal; S = fresh(); S.reveal = r; chapterCard(chapters[0].id); };
    o.querySelector('#chs').onclick = () => chapterList(saved);
    o.querySelector('#how').onclick = howTo;
    if (EMBED) o.querySelector('#quit').onclick = quit;
  }
  function chapterList(saved) {
    const un = Math.max(S.unlocked, saved ? saved.unlocked || 1 : 1);
    const o = overlay('list', win('CHAPTERS', `<p class="dim">Chapters open as you reach them.</p><ol class="chlist">${chapters.map((c, i) =>
      `<li><button data-c="${c.id}" ${i < un ? '' : 'disabled'}><span>${i + 1}.</span><span>${c.title}</span><small>${c.doc}</small></button></li>`).join('')}</ol>
      <div class="btns">${btn('back', 'Back', 'B')}</div>`, 36));
    o.querySelectorAll('[data-c]').forEach(b => b.onclick = () => { S.unlocked = un; chapterCard(b.dataset.c); });
    o.querySelector('#back').onclick = back;
  }
  function howTo() {
    const o = overlay('how', win('HELP', `
      <p>Tap anything in the picture to act on it: take it, open it, talk to someone or go somewhere. Hover or tap to see what something is.</p>
      <p>Switch to <span class="yellow">Look</span> to examine things instead, in the picture or in your pockets.</p>
      <p>To use something you carry, tap it, then tap where to use it.</p>
      <dl class="keys">
        <dt>A / L</dt><dd>Act / Look</dd>
        <dt>1-9</dt><dd>Pick up a carried item</dd>
        <dt>Enter</dt><dd>Next message</dd>
        <dt>H</dt><dd>Hint</dd>
        <dt>R</dt><dd>Reveal everything you can use</dd>
        <dt>M</dt><dd>Menu</dd>
        ${EMBED ? '<dt>Esc</dt><dd>Quit to DOS (progress is saved)</dd>' : ''}
      </dl>
      <div class="btns">${btn('back', 'Back', 'B')}</div>`, 36));
    o.querySelector('#back').onclick = back;
  }
  function back() { S.scene ? (overlayKind === 'menu' ? closeOverlay() : menu()) : titleScreen(); }
  function menu() {
    const o = overlay('menu', win('MENU', `<div class="menu" style="margin-top:var(--cell)">
      ${btn('res', 'Resume', 'R')}
      ${btn('rst', 'Restart chapter', 'e')}
      ${btn('chs', 'Chapters', 'C')}
      ${btn('how', 'How to play', 'H')}
      ${btn('ttl', 'Title screen', 'T')}
      ${EMBED ? btn('quit', 'Quit to DOS', 'Q') : '<a class="btn" href="/">Back to funkie.dev</a>'}</div>`, 24));
    o.querySelector('#res').onclick = closeOverlay;
    o.querySelector('#rst').onclick = () => chapterCard(S.chapter);
    o.querySelector('#chs').onclick = () => chapterList(load());
    o.querySelector('#how').onclick = howTo;
    o.querySelector('#ttl').onclick = titleScreen;
    if (EMBED) o.querySelector('#quit').onclick = quit;
  }
  function quit() { try { window.parent.postMessage({ type: 'harker:exit' }, location.origin); } catch (e) {} }

  let endingDef = null;
  function epilogue() {
    const e = endingDef;
    const o = overlay('end', win('NOTE.TXT', `<h3 class="big yellow">${e.head}</h3>
      ${e.body.map(p => `<p>${p}</p>`).join('')}<p class="cyan" style="text-align:right">${e.sign}</p>
      <div class="btns">${btn('again', 'Title screen', 'T')}</div>`, 40));
    o.querySelector('#again').onclick = titleScreen;
  }

  function onKey(e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const k = e.key;
    if (k === 'Escape') {
      e.preventDefault();
      if (EMBED) return quit();
      if (overlayKind === 'menu') return closeOverlay();
      if (!overlayKind && !showing) return menu();
      return;
    }
    if (overlayKind) return;
    if (showing) {
      if (k === 'Enter' || k === ' ') { e.preventDefault(); advance(); }
      return;
    }
    if (e.target.closest && e.target.closest('button') && (k === 'Enter' || k === ' ')) return;
    const lk = k.toLowerCase();
    if (lk === 'a') setVerb('act');
    else if (lk === 'l') setVerb('look');
    else if (lk === 'h') $('hint').click();
    else if (lk === 'r') $('reveal').click();
    else if (lk === 'm') menu();
    else if (/^[1-9]$/.test(k) && S.inv[+k - 1]) clickItem(S.inv[+k - 1]);
  }

  function boot() {
    $('homeItem').hidden = EMBED;
    document.querySelectorAll('.verb').forEach(v => v.addEventListener('click', () => setVerb(v.dataset.verb)));
    $('box').addEventListener('click', advance);
    $('stage').addEventListener('click', () => { if (showing) advance(); });
    $('reveal').addEventListener('click', () => { if (showing) return; S.reveal = !S.reveal; save(); render(); });
    $('hint').addEventListener('click', () => { if (showing || !S.scene) return; const d = scenes[S.scene]; api.say((d && d.hint && d.hint(S, api)) || 'Look closely at everything here.'); });
    $('menu').addEventListener('click', () => { if (!showing) menu(); });
    document.addEventListener('keydown', onKey);
    titleScreen();
  }

  return {
    scene: d => (scenes[d.id] = d),
    item: (id, name, desc, icon) => (items[id] = { id, name, desc, icon }),
    chapter: c => chapters.push(c),
    ending: e => (endingDef = e),
    boot, api, _S: () => S, _scenes: scenes, _chapters: chapters, _items: items,
    _click: (spotId) => { const d = scenes[S.scene]; const h = spotList(d).find(x => x.id === spotId); if (!h) throw new Error('no spot ' + spotId + ' in ' + S.scene); clickSpot(h); },
    _sel: id => { S.sel = id; }, _item: id => clickItem(id), _verb: v => { S.verb = v; }, _advanceAll: () => { let n = 0; while (showing && n++ < 500) advance(); },
    _start: startChapter,
  };
})();
