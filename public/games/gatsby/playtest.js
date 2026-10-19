'use strict';
/*
 * GATSBY.EXE: the playtest log. Only with ?playtest=NAME (or ?playtest).
 *
 * Every stage a player starts becomes a run in the log: the game's recording
 * of it (seed and buttons, so it can be replayed exactly) and what happened
 * (deaths and hurts with where, when and what did it; checkpoints; items;
 * the clear). The log lives in localStorage, so a reload doesn't lose it,
 * and SAVE PLAYTEST LOG (pause menu, or the link under the picture) writes
 * it to a JSON file for scripts/gatsby/heatmap.ts.
 *
 * ?playtest=NAME&blind skips the story and hides each chapter's name, and
 * after every chapter asks which part of the novel it was.
 *
 * With ?debug, drop a saved log (or one run) on the page to list its runs;
 * click one to watch it replayed. See docs/gatsby/playtest.md.
 */
(() => {
  const q = new URLSearchParams(location.search);
  const ON = q.has('playtest');
  const KEY = 'gatsby-exe-playtest';
  const VERSION = 'GATSBY.EXE 1.1';
  const MAX_BYTES = 3500000;   // well inside a browser's localStorage allowance

  if (q.has('debug')) reviewDrop();
  if (!ON) return;
  GG.blind = q.has('blind');

  /* ------------------------------------------------------------- the log */
  function load() {
    try {
      const v = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (v && v.kind === 'gatsby-exe-playtest' && Array.isArray(v.sessions)) return v;
    } catch (e) {}
    return { kind: 'gatsby-exe-playtest', format: 1, sessions: [] };
  }
  const log = load();
  const session = {
    id: Math.random().toString(36).slice(2, 10),
    player: (q.get('playtest') || 'anonymous').slice(0, 40),
    started: new Date().toISOString(),
    game: VERSION,
    blind: GG.blind,
    userAgent: navigator.userAgent,
    viewport: { w: innerWidth, h: innerHeight },
    inputs: [],
    runs: [],
    answers: [],
  };
  log.sessions.push(session);

  // Keep it under the cap: drop the buttons (never the events) of the oldest runs first.
  function save() {
    let json = JSON.stringify(log);
    for (const s of log.sessions) {
      for (const r of s.runs) {
        if (json.length <= MAX_BYTES) break;
        if (r.rle) { r.rle = null; r.trimmed = true; json = JSON.stringify(log); }
      }
    }
    try { localStorage.setItem(KEY, json); } catch (e) {}
  }
  save();

  // Which controls this player used, as the game sees them.
  setInterval(() => {
    const k = GG.inputKind && GG.inputKind();
    if (k && !session.inputs.includes(k)) { session.inputs.push(k); save(); }
  }, 1000);

  /* ------------------------------------------------------------- events */
  let cur = null;
  const live = () => !!(GG.recording && GG.recording());   // not while replaying
  const at = (e) => ({ t: e.t, x: Math.round(e.x), y: Math.round(e.y) });
  GG.on('stage-start', (e) => {
    if (!live()) return;
    if (!e.fromCheck || !cur || cur.stage !== e.stage) cur = { stage: e.stage, deaths: [], hurts: [], checkpoints: [], items: [], respawns: 0 };
    else cur.respawns++;
  });
  GG.on('hurt', (e) => { if (live() && cur) cur.hurts.push(Object.assign(at(e), { cause: e.cause, hearts: e.hearts })); });
  GG.on('death', (e) => { if (live() && cur) cur.deaths.push(Object.assign(at(e), { cause: e.cause })); });
  GG.on('checkpoint', (e) => { if (live() && cur) cur.checkpoints.push(at(e)); });
  GG.on('item', (e) => { if (live() && cur) cur.items.push({ t: e.t, name: e.name }); });
  GG.on('clear', (e) => { if (live() && cur) cur.clearT = e.t; });
  GG.on('leave', (e) => {
    const run = e.run;
    const r = cur && cur.stage === e.stage ? cur : { stage: e.stage, deaths: [], hurts: [], checkpoints: [], items: [], respawns: 0 };
    cur = null;
    Object.assign(r, { started: run.started, end: e.reason, frames: run.frames, seed: run.seed, rle: run.rle });
    session.runs.push(r);
    save();
    if (GG.blind && e.reason === 'clear') ask(e.stage);
  });
  GG.on('ending', () => banner());

  /* ----------------------------------------------------------- download */
  function download() {
    save();
    const d = new Date(), pad = (n) => String(n).padStart(2, '0');
    const stamp = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
    const name = session.player.replace(/[^a-z0-9_-]+/gi, '-') || 'player';
    const blob = new Blob([JSON.stringify(log)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `gatsby-playtest-${name}-${stamp}.json`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    GG.toast && GG.toast('LOG SAVED');
  }
  GG.pauseItems = () => [{ label: 'SAVE PLAYTEST LOG', run: download }];
  GG.playtest = { log, session, download };

  /* --------------------------------------------------------- page bits */
  const css = 'font: 13px/1.4 ui-monospace, Menlo, Consolas, monospace; color: #f8f8f8;';
  const legend = document.getElementById('legend');
  if (legend) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = 'save playtest log';
    b.title = 'Download this playtest log as a JSON file';
    b.addEventListener('click', download);
    legend.appendChild(b);
  }

  function box(html) {
    const wrap = document.createElement('div');
    wrap.setAttribute('role', 'dialog');
    wrap.style.cssText = 'position: fixed; inset: 0; display: grid; place-items: center; background: rgba(0,0,0,.6); z-index: 50; padding: 16px;';
    wrap.innerHTML = `<div style="${css} background: #000; border: 2px solid #f8b800; padding: 16px; max-width: 420px; width: 100%;">${html}</div>`;
    document.body.appendChild(wrap);
    return wrap;
  }

  /* Blind mode: after each chapter, which part of the novel was it? */
  function ask(stage) {
    GG.hold = true;
    const w = box(`
      <p style="margin: 0 0 8px; color: #f8b800;">CHAPTER CLEAR</p>
      <label for="pt-answer">Which part of <i>The Great Gatsby</i> do you think that was? Any words are fine.</label>
      <input id="pt-answer" type="text" autocomplete="off" style="${css} display: block; width: 100%; box-sizing: border-box; margin: 8px 0; padding: 6px; background: #111; border: 1px solid #888;">
      <div style="display: flex; gap: 8px; justify-content: flex-end;">
        <button type="button" data-v="no idea" style="${css} background: #222; border: 1px solid #888; padding: 4px 10px;">No idea</button>
        <button type="button" data-v="" style="${css} background: #f8b800; color: #000; border: 0; padding: 4px 10px;">Save answer</button>
      </div>`);
    const input = w.querySelector('input');
    const done = (v) => {
      session.answers.push({ stage, answer: v, at: new Date().toISOString() });
      save();
      w.remove();
      GG.hold = false;
    };
    w.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => done(b.dataset.v || input.value.trim() || 'no idea')));
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') done(input.value.trim() || 'no idea'); });
    setTimeout(() => input.focus(), 0);
  }

  /* The end: a reminder to save the log. */
  function banner() {
    const w = box(`
      <p style="margin: 0 0 8px; color: #f8b800;">THANK YOU FOR PLAYING</p>
      <p style="margin: 0 0 12px;">Please save your playtest log and send the file to whoever asked you to play.</p>
      <div style="display: flex; gap: 8px; justify-content: flex-end;">
        <button type="button" data-k="close" style="${css} background: #222; border: 1px solid #888; padding: 4px 10px;">Close</button>
        <button type="button" data-k="save" style="${css} background: #f8b800; color: #000; border: 0; padding: 4px 10px;">Save playtest log</button>
      </div>`);
    w.querySelector('[data-k=save]').addEventListener('click', download);
    w.querySelector('[data-k=close]').addEventListener('click', () => w.remove());
  }

  /* --------------------------------------------------- reviewing (debug) */
  function reviewDrop() {
    const runsIn = (v) => {
      if (!v || typeof v !== 'object') return [];
      if (Array.isArray(v.rle)) return [{ player: v.player || '', run: v }];
      if (Array.isArray(v.sessions)) return v.sessions.flatMap((s) => (s.runs || []).map((run) => ({ player: s.player, run })));
      if (Array.isArray(v.runs)) return v.runs.map((run) => ({ player: v.player || '', run }));
      return [];
    };
    let panel = null;
    function show(list, name) {
      if (panel) panel.remove();
      panel = document.createElement('div');
      panel.style.cssText = 'position: fixed; top: 8px; right: 8px; max-height: 70vh; overflow: auto; background: rgba(0,0,0,.9); border: 1px solid #f8b800; padding: 8px; z-index: 40; font: 12px/1.5 ui-monospace, Menlo, monospace; color: #f8f8f8;';
      const head = document.createElement('button');
      head.type = 'button';
      head.textContent = `${name}: ${list.length} runs (click one to replay it, Esc stops)`;
      head.style.cssText = 'display: block; font: inherit; color: #f8b800; background: none; border: 0; padding: 0; cursor: pointer; text-align: left;';
      const body = document.createElement('div');
      head.addEventListener('click', () => { body.hidden = !body.hidden; });
      panel.appendChild(head);
      panel.appendChild(body);
      list.forEach(({ player, run }) => {
        const b = document.createElement('button');
        b.type = 'button';
        const secs = Math.round((run.frames || 0) / 60);
        b.textContent = `${player || '?'}  ${run.stage}  ${run.end || ''}  ${secs}s  ${(run.deaths || []).length} deaths`;
        b.disabled = !Array.isArray(run.rle);
        b.style.cssText = 'display: block; width: 100%; text-align: left; font: inherit; color: inherit; background: none; border: 0; padding: 1px 2px; cursor: pointer;';
        // Fold the list away while it plays; the heading brings it back.
        b.addEventListener('click', () => { if (!GG.replay(run)) GG.toast && GG.toast('CANNOT REPLAY'); else body.hidden = true; });
        body.appendChild(b);
      });
      const x = document.createElement('button');
      x.type = 'button'; x.textContent = 'close';
      x.style.cssText = 'font: inherit; margin-top: 6px;';
      x.addEventListener('click', () => { panel.remove(); panel = null; });
      body.appendChild(x);
      document.body.appendChild(panel);
    }
    GG.reviewLog = (v, name = 'log') => { const list = runsIn(v); show(list, name); return list.length; };
    addEventListener('dragover', (e) => { e.preventDefault(); });
    addEventListener('drop', (e) => {
      e.preventDefault();
      const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (!f) return;
      f.text().then((txt) => {
        try { GG.reviewLog(JSON.parse(txt), f.name); } catch (err) { GG.toast && GG.toast('NOT A PLAYTEST LOG'); }
      });
    });
  }
})();
