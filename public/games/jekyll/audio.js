'use strict';
/*
 * JEKYLL.EXE: sound, in the manner of the 48K Spectrum's beeper: one square
 * wave at a time, clicks and sweeps. The tunes are the game's own.
 *
 * Two kinds of footstep, after Poole and Mr. Utterson listening at the
 * cabinet door: Hyde's steps "fell lightly and oddly, with a certain swing,
 * for all they went so slowly; it was different indeed from the heavy
 * creaking tread of Henry Jekyll."
 */
(() => {
  let ac = null, out = null, on = true;
  let musicGain = null, sfxGain = null;
  let current = null, timer = null;

  function ctx() {
    if (ac) return ac;
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return null;
    ac = new C();
    out = ac.createGain(); out.gain.value = on ? 1 : 0; out.connect(ac.destination);
    musicGain = ac.createGain(); musicGain.gain.value = 0.05; musicGain.connect(out);
    sfxGain = ac.createGain(); sfxGain.gain.value = 0.09; sfxGain.connect(out);
    return ac;
  }

  /* One square-wave note, with an optional slide, at time t. */
  function tone(dest, f0, f1, t, dur, vol = 1, type = 'square') {
    const a = ctx(); if (!a) return;
    const o = a.createOscillator(), g = a.createGain();
    o.type = type;
    o.frequency.setValueAtTime(Math.max(20, f0), t);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.setValueAtTime(vol, t + dur * 0.85);
    g.gain.linearRampToValueAtTime(0, t + dur);
    o.connect(g); g.connect(dest);
    o.start(t); o.stop(t + dur + 0.01);
  }
  const now = () => (ctx() ? ac.currentTime : 0);
  const s = (f0, f1, dt, dur, vol) => tone(sfxGain, f0, f1, now() + dt, dur, vol);

  const SFX = {
    stepJ: () => { s(70, 60, 0, 0.05, 1); s(260, 210, 0.04, 0.04, 0.4); },
    stepH: () => { s(1300, 1200, 0, 0.012, 0.6); s(900, 880, 0.07, 0.012, 0.6); },
    bump: () => s(110, 90, 0, 0.05, 0.8),
    act: () => { s(600, 600, 0, 0.03, 0.6); s(900, 900, 0.035, 0.04, 0.6); },
    pick: () => [523, 659, 784].forEach((f, i) => s(f, f, i * 0.04, 0.035, 0.6)),
    drink: () => { for (let i = 0; i < 9; i++) { const f = 400 + ((i * 337) % 900); s(f, f * 1.2, i * 0.045, 0.025, 0.5); } },
    change: (to) => {
      for (let i = 0; i < 14; i++) {
        const k = i / 13;
        const f = to === 'H' ? 1400 * Math.pow(0.08, k) : 90 * Math.pow(15, k);
        s(f * (i % 2 ? 1.06 : 1), f, i * 0.055, 0.05, 0.7);
      }
    },
    flinch: () => s(1500, 1900, 0, 0.025, 0.25),
    fail: () => { s(160, 60, 0, 0.5, 0.9); s(120, 50, 0.1, 0.5, 0.6); },
    win: () => [392, 523, 659, 784].forEach((f, i) => s(f, f, i * 0.07, 0.06, 0.6)),
    door: () => { s(90, 70, 0, 0.06, 1); s(90, 70, 0.12, 0.06, 1); },
    bell: () => { for (let i = 0; i < 12; i++) s(i % 2 ? 330 : 523, i % 2 ? 330 : 523, i * 0.025, 0.025, 0.7 * (1 - i / 14)); },
    page: () => s(2200, 2000, 0, 0.006, 0.4),
    tick: () => s(1800, 1800, 0, 0.012, 0.4),
    ok: () => { s(880, 880, 0, 0.03, 0.5); s(1320, 1320, 0.035, 0.04, 0.5); },
    undo: () => { s(900, 600, 0, 0.05, 0.5); },
    doom: () => { s(55, 55, 0, 0.3, 0.6); s(52, 52, 0.4, 0.3, 0.5); },
    tape: (data) => { if (!data) s(808, 808, 0, 0.12, 0.25); else for (let i = 0; i < 6; i++) { const f = (i * 7) % 3 ? 2000 : 1000; s(f, f, i * 0.02, 0.02, 0.2); } },
  };

  /*
   * Tunes as text: notes like D4 F#4, '-' to hold, '.' for a rest, each a
   * step of the tune's tempo. One voice, the beeper's way.
   */
  const TUNES = {
    title: { step: 0.24, notes: 'D4 - F4 - A4 - - . G4 F4 E4 - D4 - - . A3 - D4 - F4 - E4 - C4 - D4 - - - . . . . Bb3 - D4 - G4 - - . F4 E4 D4 - C#4 - - . A3 - E4 - G4 - F4 E4 D4 - - - - . . .' },
    story: { step: 0.5, notes: 'D3 . . . A2 . . . D3 . . . . . . . F3 . . . C3 . . . D3 . . . . . . .' },
    card: { step: 0.3, notes: 'D3 - - - A2 - - - D3 - - - . . . .' },
    house: { step: 0.22, notes: 'F4 . A4 . C5 . A4 . G4 . Bb4 . D5 . Bb4 . A4 . F4 . E4 . G4 . F4 - - - . . . . D4 . F4 . A4 . F4 . E4 . G4 . Bb4 . G4 . F4 . D4 . C#4 . E4 . D4 - - - . . . .' },
    night: { step: 0.3, notes: 'D3 . . D3 . . F3 . . E3 . . . . . . A2 . . A2 . . C3 . . D3 . . . . . . Bb2 . . Bb2 . . D3 . . C#3 . . . . . . A2 . . . . . . . . . . . . . . .' },
    shudder: { step: 0.36, notes: 'D2 D2 . . . . . . D2 D2 . . . . . . Eb2 Eb2 . . . . . . D2 D2 . . . . . .' },
    end: { step: 0.4, notes: 'A3 - D4 - F4 - E4 - D4 - - - C#4 - A3 - Bb3 - G3 - A3 - - - . . F4 - E4 - D4 - C4 - Bb3 - A3 - G3 - A3 - D4 - - - - - . . . .' },
  };
  const NOTE = { C: -9, D: -7, E: -5, F: -4, G: -2, A: 0, B: 2 };
  function freq(n) {
    const m = /^([A-G])([b#]?)(\d)$/.exec(n);
    if (!m) return null;
    const semis = NOTE[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + (Number(m[3]) - 4) * 12;
    return 440 * Math.pow(2, semis / 12);
  }

  function playTune(name) {
    stopTune();
    const tune = TUNES[name];
    current = name;
    if (!tune || !ctx()) return;
    const steps = tune.notes.split(/\s+/).filter(Boolean);
    let i = 0, t = now() + 0.05;
    const schedule = () => {
      if (current !== name) return;
      while (t < now() + 0.6) {
        const n = steps[i % steps.length];
        if (n !== '-' && n !== '.') {
          let len = 1;
          while (steps[(i + len) % steps.length] === '-' && len < steps.length) len++;
          const f = freq(n);
          if (f) tone(musicGain, f, f, t, tune.step * len * 0.92, 1);
        }
        t += tune.step;
        i++;
      }
      timer = setTimeout(schedule, 200);
    };
    schedule();
  }
  function stopTune() { current = null; if (timer) clearTimeout(timer); timer = null; }

  let wanted = null;
  JH.audio = {
    setOn(v) { on = !!v; if (out) out.gain.value = on ? 1 : 0; },
    unlock() {
      const a = ctx();
      if (a && a.state === 'suspended') a.resume();
      if (wanted && current !== wanted) playTune(wanted);
    },
    sfx(name, arg) { if (!on || !ctx() || ac.state !== 'running') return; const f = SFX[name]; if (f) f(arg); },
    music(name) {
      if (name === wanted && current === name) return;
      wanted = name;
      if (!name) { stopTune(); return; }
      if (ac && ac.state === 'running') playTune(name);
    },
  };
})();
