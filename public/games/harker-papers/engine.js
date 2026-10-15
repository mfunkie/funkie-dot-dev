'use strict';
/* The Harker Papers — point-and-click engine */
const G = (() => {
  const scenes = {}, items = {}, chapters = [];
  const KEY = 'harker-papers-v1';
  const $ = id => document.getElementById(id);
  const fresh = () => ({ scene: null, chapter: null, inv: [], f: {}, sel: null, verb: 'act', unlocked: 1, reveal: false });
  let S = fresh();
  let queue = [], showing = false;

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

  /* ---------- dialogue box ---------- */
  function pump() {
    if (showing) return;
    while (queue.length) {
      const q = queue.shift();
      if (q.fn) { q.fn(api); if (showing) return; continue; }
      showLine(q, true); showing = true; return;
    }
    $('box').classList.remove('waiting');
    render();
  }
  function showLine(q, wait) {
    const box = $('box');
    const who = q.who ? `<span class="who">${q.who}</span>` : '';
    box.querySelector('.line').innerHTML = who + `<span class="${q.who ? 'speech' : 'narr'}">${q.t}</span>`;
    box.classList.toggle('waiting', wait);
    box.classList.toggle('spoken', !!q.who);
    box.classList.remove('fresh'); void box.offsetWidth; box.classList.add('fresh');
  }
  function advance() { if (!showing) return; showing = false; pump(); }

  /* ---------- rendering ---------- */
  function spotList(d) { return (d.spots ? d.spots(S, api) : []).filter(h => h && !h.hidden); }
  function render() {
    const d = scenes[S.scene]; if (!d) return;
    const ch = chapters.find(c => c.id === S.chapter) || {};
    $('art').innerHTML = d.art(S, api);
    $('doc').textContent = d.doc || ch.doc || '';
    $('place').textContent = d.title || '';
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
    if (!S.inv.length) inv.innerHTML = '<p class="empty">Nothing carried.</p>';
    for (const id of S.inv) {
      const it = items[id]; if (!it) continue;
      const b = document.createElement('button');
      b.className = 'item' + (S.sel === id ? ' sel' : '') + (S.flash === id ? ' flash' : '');
      b.setAttribute('aria-pressed', String(S.sel === id));
      b.innerHTML = `<svg viewBox="0 0 40 40" aria-hidden="true">${it.icon}</svg><span>${it.name}</span>`;
      b.addEventListener('click', () => clickItem(id));
      inv.appendChild(b);
    }
    S.flash = null;
    $('reveal').setAttribute('aria-pressed', String(!!S.reveal));
  }
  function hoverLabel(name) {
    const st = $('status');
    if (S.sel) st.textContent = `Use ${items[S.sel].name} on ${name || '…'}`;
    else if (name) st.textContent = (S.verb === 'look' ? 'Look at ' : '') + name;
    else st.textContent = S.verb === 'look' ? 'Look at …' : 'Tap the scene to act';
  }
  function resolve(v, h) { return typeof v === 'function' ? v(api, S) : v; }

  function clickSpot(h) {
    if (showing) { advance(); return; }
    if (S.sel) {
      const id = S.sel; S.sel = null;
      const fn = h.use && (h.use[id] || h.use['*']);
      if (fn) { typeof fn === 'function' ? fn(api, id) : api.say(fn); }
      else api.say(pickWrong(id, h));
    } else if (S.verb === 'look') {
      const t = resolve(h.look, h); if (t) api.say(...[].concat(t));
      else api.say(`Nothing more to see in the ${h.name.toLowerCase()}.`);
    } else {
      if (typeof h.act === 'function') h.act(api, S);
      else if (h.act) api.say(...[].concat(h.act));
      else { const t = resolve(h.look, h); api.say(...[].concat(t || 'Nothing happens.')); }
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

  /* ---------- scenes & chapters ---------- */
  function enter(id) {
    S.scene = id; S.sel = null; save(); render();
    const d = scenes[id];
    if (d.onEnter && !S.f['seen:' + id]) { S.f['seen:' + id] = true; d.onEnter(api, S); }
  }
  function overlay(html, cls = '') {
    const o = $('overlay'); o.className = 'overlay ' + cls; o.innerHTML = html; o.hidden = false;
    const f = o.querySelector('button'); if (f) setTimeout(() => f.focus({ preventScroll: true }), 30);
    return o;
  }
  function closeOverlay() { $('overlay').hidden = true; }
  const reduced = () => window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  function typewrite(el, text, done) {
    if (reduced()) { el.textContent = text; done && done(); return; }
    let i = 0; el.textContent = '';
    const tick = () => { el.textContent = text.slice(0, ++i); if (i < text.length) setTimeout(tick, 22 + (text[i] === ' ' ? 18 : 0)); else done && done(); };
    tick();
  }

  function chapterCard(id) {
    const i = chapters.findIndex(c => c.id === id); const ch = chapters[i];
    S.unlocked = Math.max(S.unlocked, i + 1); save();
    const o = overlay(`
      <article class="paper">
        <p class="folio">Chapter ${i + 1} of ${chapters.length}</p>
        <h2 class="doc-head" id="dh"></h2>
        <p class="doc-date">${ch.date}</p>
        <h3 class="ch-title">${ch.title}</h3>
        ${ch.intro.map(p => `<p class="intro">${p}</p>`).join('')}
        <button class="btn ink" id="begin">Begin</button>
      </article>`, 'card');
    typewrite(o.querySelector('#dh'), ch.doc);
    o.querySelector('#begin').onclick = () => startChapter(id);
  }
  function startChapter(id) {
    const ch = chapters.find(c => c.id === id);
    closeOverlay(); queue = []; showing = false;
    S.chapter = id; S.f = {}; S.inv = (ch.inv || []).slice(); S.sel = null; S.verb = 'act';
    showLine({ t: ch.opening || '' }, false);
    enter(ch.start);
  }

  function titleScreen() {
    const saved = load();
    const o = overlay(`
      <div class="title-wrap">
        <p class="eyebrow">After the papers collected by Mina Harker, 1897</p>
        <h1 class="game-title">The Harker<br>Papers</h1>
        <p class="sub">A point-and-click adventure through Bram Stoker's <em>Dracula</em>, told in the hands of those who wrote it down.</p>
        <div class="menu">
          ${saved && saved.scene ? '<button class="btn" id="cont">Continue</button>' : ''}
          <button class="btn" id="new">Begin the papers</button>
          <button class="btn ghost" id="chs">Chapters</button>
          <button class="btn ghost" id="how">How to play</button>
        </div>
      </div>`, 'title');
    if (saved && saved.scene) o.querySelector('#cont').onclick = () => { S = Object.assign(fresh(), saved); closeOverlay(); queue = []; showing = false; showLine({ t: 'The papers lie where you left them.' }, false); render(); };
    o.querySelector('#new').onclick = () => { const r = S.reveal; S = fresh(); S.reveal = r; chapterCard(chapters[0].id); };
    o.querySelector('#chs').onclick = () => chapterList(saved);
    o.querySelector('#how').onclick = howTo;
  }
  function chapterList(saved) {
    const un = Math.max(S.unlocked, saved ? saved.unlocked || 1 : 1);
    const o = overlay(`<div class="title-wrap"><h2 class="list-head">The Papers</h2><ol class="chlist">${chapters.map((c, i) =>
      `<li><button class="btn ${i < un ? '' : 'locked'}" data-c="${c.id}" ${i < un ? '' : 'disabled'}><span class="cn">${i + 1}</span><span><b>${c.title}</b><small>${c.doc}</small></span></button></li>`).join('')}</ol>
      <button class="btn ghost" id="back">Back</button></div>`, 'title');
    o.querySelectorAll('[data-c]').forEach(b => b.onclick = () => { S.unlocked = un; chapterCard(b.dataset.c); });
    o.querySelector('#back').onclick = () => (S.scene ? closeOverlay() : titleScreen());
  }
  function howTo() {
    const o = overlay(`<div class="title-wrap how"><h2 class="list-head">How to play</h2>
      <ul>
        <li><b>Act</b> is the default. Tap anything in the scene to take it, open it, talk to someone or go somewhere.</li>
        <li><b>Look</b> examines what you tap instead, in the scene or in your pockets.</li>
        <li>Tap something you carry to hold it, then tap the scene to use it there.</li>
        <li><b>Reveal</b> outlines everything you can interact with. <b>Hint</b> nudges you if you are stuck.</li>
        <li>When a line of text has a ▾ marker, tap anywhere to read on. Progress saves as you play.</li>
      </ul><button class="btn" id="back">Back</button></div>`, 'title');
    o.querySelector('#back').onclick = () => (S.scene ? closeOverlay() : titleScreen());
  }
  function menu() {
    const o = overlay(`<div class="title-wrap"><h2 class="list-head">Paused</h2><div class="menu">
      <button class="btn" id="res">Resume</button>
      <button class="btn ghost" id="rst">Restart this chapter</button>
      <button class="btn ghost" id="chs">Chapters</button>
      <button class="btn ghost" id="how">How to play</button>
      <button class="btn ghost" id="ttl">Title screen</button></div></div>`, 'title');
    o.querySelector('#res').onclick = closeOverlay;
    o.querySelector('#rst').onclick = () => chapterCard(S.chapter);
    o.querySelector('#chs').onclick = () => chapterList(load());
    o.querySelector('#how').onclick = howTo;
    o.querySelector('#ttl').onclick = titleScreen;
  }
  let endingDef = null;
  function epilogue() {
    const e = endingDef;
    const o = overlay(`<article class="paper"><p class="folio">Note</p><h2 class="doc-head">${e.head}</h2>
      ${e.body.map(p => `<p class="intro">${p}</p>`).join('')}<p class="sign">${e.sign}</p>
      <button class="btn ink" id="again">Return to the title</button></article>`, 'card');
    o.querySelector('#again').onclick = titleScreen;
  }

  function boot() {
    document.querySelectorAll('.verb').forEach(v => v.addEventListener('click', () => { S.verb = v.dataset.verb; S.sel = null; render(); }));
    $('box').addEventListener('click', advance);
    $('stage').addEventListener('click', () => { if (showing) advance(); });
    $('reveal').addEventListener('click', () => { S.reveal = !S.reveal; save(); render(); });
    $('hint').addEventListener('click', () => { if (showing) return; const d = scenes[S.scene]; api.say((d && d.hint && d.hint(S, api)) || 'Look closely at everything here.'); });
    $('menu').addEventListener('click', menu);
    document.addEventListener('keydown', e => { if ((e.key === ' ' || e.key === 'Enter') && showing && !e.target.closest('button')) { e.preventDefault(); advance(); } });
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
