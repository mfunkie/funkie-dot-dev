'use strict';
/*
 * GATSBY.EXE: sound. A small 2A03-flavoured synth: two pulse channels
 * (12.5/25/50/75% duty as PeriodicWaves), a 4-bit stepped triangle, and a
 * noise channel driven by the real 15-bit LFSR (long and short "metallic"
 * modes) at the sixteen NTSC noise periods. Volume envelopes are stepped at
 * 60 Hz in sixteen levels, the way a sound driver ticking once per frame does.
 *
 * Music is written as text. Each track is a list of sections; a section has
 * one chord per bar ("Dm Bb Gm+A Dm", "+" splits a bar), a melody line, and
 * optionally explicit lines for the other channels. Lines are tokens:
 *   A4:4   note A4 lasting 4 rows (a row is a 16th note); the length sticks
 *   r:2    rest      -:2  tie (extend the previous note)     |  bar check
 *   [ ... ]3  repeat  @d0-3 duty  @v0-15 volume  @e<env> envelope
 * Pulse 2 can arpeggiate the chords or echo pulse 1 a few rows late; the
 * triangle plays a bass style from the chords; the noise channel plays drum
 * patterns, one character per row ("k.h.s.h." kick, hat, snare...).
 *
 * The scheduler looks ~0.12 s ahead on the AudioContext clock. Sound effects
 * borrow a music channel while they play (pulse 2, triangle or noise), as NES
 * games did, then hand it back.
 */
(() => {
  const G = typeof window !== 'undefined' ? window : globalThis;
  const GG = G.GG || (G.GG = {});

  const MUSIC_VOL = 0.15;
  const SFX_VOL = 0.24;
  const MIX = { pulse: 0.5, tri: 0.62, noi: 0.42 };
  const LOOKAHEAD = 0.12;

  /* --------------------------------------------------------------- notes */
  const PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  const acc = (s) => (s === '#' ? 1 : s === 'b' ? -1 : 0);
  function midi(name) {
    const m = /^([A-G])([#b]?)(-?\d)$/.exec(name);
    return m ? PC[m[1]] + acc(m[2]) + 12 * (+m[3] + 1) : NaN;
  }
  const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
  const toHz = (x) => (typeof x === 'string' ? hz(midi(x)) : x);

  const QUAL = {
    '': [0, 4, 7], m: [0, 3, 7], 7: [0, 4, 7, 10], m7: [0, 3, 7, 10], maj7: [0, 4, 7, 11],
    dim: [0, 3, 6], dim7: [0, 3, 6, 9], aug: [0, 4, 8], sus4: [0, 5, 7], sus2: [0, 2, 7], 5: [0, 7],
  };
  function chord(sym, tr) {
    const m = /^([A-G])([#b]?)(m7|maj7|m|dim7|dim|aug|sus4|sus2|7|5)?(?:\/([A-G])([#b]?))?$/.exec(sym);
    if (!m) throw new Error('bad chord ' + sym);
    const root = (PC[m[1]] + acc(m[2]) + tr + 120) % 12;
    const bass = m[4] ? (PC[m[4]] + acc(m[5]) + tr + 120) % 12 : root;
    return { root, bass, iv: QUAL[m[3] || ''] };
  }

  /* ---------------------------------------------------------- envelopes */
  // a: attack, d: linear decay to s (sustain fraction), r: release (seconds).
  const ENV = {
    lead: { d: 0.3, s: 0.55, r: 0.05 },
    sus: { d: 0.12, s: 0.8, r: 0.04 },
    soft: { a: 0.04, d: 0.45, s: 0.5, r: 0.1 },
    pluck: { d: 0.2, s: 0.2, r: 0.03 },
    stac: { d: 0.09, s: 0, r: 0.02 },
    pad: { a: 0.1, d: 0.5, s: 0.65, r: 0.15 },
    organ: { a: 0.012, s: 1, r: 0.08 },
    bell: { d: 1.0, s: 0, r: 0.05 },
    tri: { s: 1, r: 0.012 },
    swell: { swell: true, r: 0.05 },
  };

  /* -------------------------------------------------------------- drums */
  // idx: NES noise period index 0 (hiss) .. 15 (rumble); short: 93-step metallic mode.
  const KIT = {
    k: { idx: 9, rate: [1.5, 0.3], rateT: 0.09, vol: 14, env: { d: 0.11, s: 0, r: 0.02 } },
    s: { idx: 5, vol: 11, env: { d: 0.17, s: 0, r: 0.02 } },
    h: { idx: 1, vol: 5, env: { d: 0.045, s: 0, r: 0.01 } },
    o: { idx: 1, vol: 5, env: { d: 0.2, s: 0, r: 0.02 } },
    c: { idx: 2, vol: 9, env: { d: 1.1, s: 0, r: 0.04 } },
    x: { idx: 3, short: true, vol: 4, env: { d: 0.035, s: 0, r: 0.01 } },
    t: { idx: 8, short: true, vol: 9, env: { d: 0.14, s: 0, r: 0.02 } },
    b: { idx: 12, rate: [1.1, 0.7], rateT: 0.3, vol: 12, env: { d: 0.42, s: 0, r: 0.03 } },
    w: { idx: 4, vol: 4, env: { swell: true, r: 0.05 } },
  };

  /* --------------------------------------------------------- bass styles */
  // [semitones above the bass note (null = rest), rows], repeated to fill a chord.
  const BASS = {
    r8: [[0, 2], [12, 2]],
    drive: [[0, 2]],
    r4: [[0, 4]],
    half: [[0, 8], [7, 8]],
    whole: [[0, 64]],
    walk: [[0, 4], [7, 4], [12, 4], [7, 4]],
    gallop: [[0, 2], [0, 1], [0, 1]],
    creep: [[0, 2], [null, 1], [0, 1], [7, 2], [null, 2], [8, 2], [7, 2], [12, 2], [null, 2]],
    waltz: [[0, 3], [null, 1], [7, 3], [null, 1], [12, 3], [null, 1]],
    six: [[0, 4], [7, 2], [12, 4], [7, 2]],
    heart: [[0, 1], [null, 2], [0, 1], [null, 4]],
    // The Jazz Age: a stride left hand, the Charleston's "one, and-of-two",
    // a swung walk, and a two-beat foxtrot.
    stride: [[0, 4], [12, 4], [7, 4], [12, 4]],
    charleston: [[0, 6], [7, 10]],
    swing: [[0, 3], [null, 1], [4, 3], [null, 1], [7, 3], [null, 1], [9, 3], [null, 1]],
    two: [[0, 6], [null, 2], [7, 6], [null, 2]],
    tango: [[0, 3], [0, 1], [null, 2], [7, 2], [0, 4], [7, 4]],
  };

  /* -------------------------------------------------------------- music */
  const V = (rate, depth, delay) => ({ rate, depth, delay });
  const TRACKS = {
    // The green light: a rising major sixth (C to A), then a slow fall. It
    // comes back in the title, the last stage and the ending.
    title: {
      bpm: 112, loop: 1,
      p1: { duty: 2, vol: 10, env: 'lead', vib: V(5.5, 14, 0.22) },
      p2: { arp: '0121', step: 2, oct: 4, duty: 0, vol: 5, env: 'pluck' },
      tri: { style: 'stride' },
      noi: ['k.h.s.h.k.h.s.h.', 'k.h.s.h.k.h.s.hh'], noiVol: 9,
      order: ['I', 'A', 'B'],
      sec: {
        I: {
          ch: 'F Dm Bbmaj7 C7',
          mel: 'C5:4 A5:12 | G5:4 F5 E5 D5 | D5:4 Bb5:12 | A5:4 G5 F5 E5 |',
          p2: '@epad F4:16 | F4:16 | F4:16 | E4:16 |',
          tri: { style: 'whole' },
          noi: ['................', '................', '................', '....h.h.h.h.hhhh'],
        },
        A: {
          ch: 'F F7 Bb Bbm F D7 Gm7 C7',
          mel: 'A4:3 C5:1 F5:4 A5:6 G5:2 | F5:3 Eb5:1 C5:4 A4:8 | Bb4:3 D5:1 F5:4 Bb5:6 A5:2 | Ab5:4 F5:4 Db5:8 |' +
            ' C5:4 A5:12 | A5:3 F#5:1 D5:4 C6:8 | Bb5:3 A5:1 G5:4 F5:4 D5:4 | C6:6 Bb5:2 G5:4 E5:4 |',
        },
        B: {
          ch: 'Dm A7 Dm Dm7 Gm C7 F C7',
          mel: 'D5:4 F5 A5 D6 | C#6:6 A5:2 G5:4 E5:4 | F5:3 E5:1 D5:4 A4:8 | C5:4 D5 F5 A5 |' +
            ' Bb5:6 A5:2 G5:4 D5:4 | E5:3 F5:1 G5:4 Bb5:4 E5:4 | C5:4 A5:12 | G5:4 F5 E5 C5 |',
        },
      },
    },

    select: {
      bpm: 92, bar: 12,
      p1: { duty: 1, vol: 8, env: 'soft', vib: V(5, 12, 0.3) },
      p2: { arp: '012102', step: 2, oct: 5, duty: 0, vol: 4, env: 'pluck' },
      tri: { style: 'waltz' },
      noi: ['h...h...h...'], noiVol: 6,
      order: ['A', 'B'],
      sec: {
        A: {
          ch: 'F Dm Gm C7 F A7 Dm C7',
          mel: 'A5:8 G5:2 F5:2 | F5:6 E5:2 D5:4 | D5:8 Bb4:4 | C5:4 E5 G5 |' +
            ' A5:8 C6:4 | C#6:6 E6:2 A5:4 | D6:6 C6:2 Bb5:2 A5:2 | G5:8 E5:4 |',
        },
        B: {
          ch: 'Bb F Gm C Am Dm Gm C7',
          mel: 'D6:8 C6:2 Bb5:2 | A5:8 F5:4 | Bb5:6 A5:2 G5:4 | G5:8 E5:4 |' +
            ' C6:6 A5:2 E5:4 | F5:6 E5:2 D5:4 | Bb5:4 A5:4 G5:4 | E5:8 C5:4 |',
        },
      },
    },

    eastegg: {
      bpm: 132,
      p1: { duty: 1, vol: 10, env: 'lead', vib: V(6, 12, 0.2) },
      p2: { arp: '0121', step: 2, oct: 4, duty: 2, vol: 4, env: 'pluck' },
      tri: { style: 'two' },
      noi: ['k...h.h.s...h.h.', 'k...h.h.s...h.hh'], noiVol: 10,
      order: ['A', 'B'],
      sec: {
        A: {
          ch: 'D A Bm F#m G D Em A7',
          mel: 'F#5:3 A5:1 D6:4 A5:4 F#5:4 | E5:3 F#5:1 A5:4 C#6:6 A5:2 | D6:3 C#6:1 B5:4 F#5:4 D5:4 | C#5:3 D5:1 E5:4 F#5:8 |' +
            ' G5:3 A5:1 B5:4 D6:4 B5:4 | A5:6 F#5:2 D5:8 | E5:3 F#5:1 G5:4 B5:4 E6:4 | C#6:4 B5:4 A5:4 G5:4 |',
        },
        B: {
          ch: 'G A F#m Bm Em A D A7',
          mel: 'B5:4 D6:2 B5:2 G5:8 | C#6:4 E6:2 C#6:2 A5:8 | A5:3 F#5:1 C#5:4 F#5:8 | D6:3 C#6:1 B5:4 F#5:8 |' +
            ' G5:2 F#5:2 E5:2 G5:2 B5:4 E6:4 | C#6:2 B5:2 A5:2 C#6:2 E6:8 | D6:3 A5:1 F#5:4 A5:4 D6:4 | E6:4 C#6:4 A5:4 E5:4 |',
        },
      },
    },

    // A dull chugging ostinato like a stopped train, and a melody that barely moves.
    ashes: {
      bpm: 84,
      p1: { duty: 0, vol: 9, env: 'soft', vib: V(5, 18, 0.3) },
      p2: { arp: '0.0.1.0.', step: 1, oct: 3, duty: 1, vol: 4, env: 'stac' },
      tri: { style: 'creep' },
      noi: ['x...x.x.x...x.x.'], noiVol: 8,
      order: ['A', 'B'],
      sec: {
        A: {
          ch: 'Em Em F Em Am Em F B',
          mel: 'B4:12 r:4 | C5:4 B4:4 G4:8 | C5:12 r:4 | B4:16 |' +
            ' E5:8 D5:4 C5:4 | B4:12 r:4 | A4:4 C5:4 F5:8 | D#5:12 r:4 |',
        },
        B: {
          ch: 'Em F Em F Am G F Em',
          mel: 'G5:6 F#5:2 E5:8 | F5:12 r:4 | E5:4 G5:4 B5:8 | A5:6 G5:2 F5:8 |' +
            ' E5:8 C5:8 | D5:8 B4:8 | C5:6 B4:2 A4:8 | B4:16 |',
        },
      },
    },

    boss: {
      bpm: 150,
      p1: { duty: 1, vol: 11, env: 'lead', vib: V(6, 10, 0.2) },
      p2: { arp: '0123', step: 1, oct: 3, duty: 2, vol: 5, env: 'pluck' },
      tri: { style: 'drive' },
      noi: ['k.h.s.hkk.h.s.hs', 'k.h.s.hkk.h.sss.'],
      order: ['A', 'B'],
      sec: {
        A: {
          ch: 'Cm Cm Ab G Cm Cm Fm G',
          mel: 'C5:2 r:2 C5:2 Eb5:2 G5:4 F5:2 Eb5:2 | D5:2 r:2 C5:2 D5:2 Eb5:8 | Ab5:2 r:2 Ab5:2 G5:2 F5:4 Eb5:4 | D5:4 B4:4 G4:8 |' +
            ' C6:2 r:2 C6:2 Bb5:2 G5:4 Eb5:4 | F5:2 G5:2 Ab5:2 G5:2 F5:4 Eb5:4 | F5:2 r:2 Ab5:2 C6:2 Eb6:4 C6:4 | B5:4 G5:4 D5:4 B4:4 |',
        },
        B: {
          ch: 'Ab Bb Gm Cm Ab Bb G G7',
          mel: 'Eb6:6 C6:2 Ab5:8 | D6:6 Bb5:2 F5:8 | G5:2 Bb5:2 D6:4 Bb5:4 G5:4 | C6:12 r:4 |' +
            ' Ab5:2 Ab5:2 Ab5:2 C6:2 Eb6:8 | Bb5:2 Bb5:2 Bb5:2 D6:2 F6:8 | G6:4 F6:4 D6:4 B5:4 | G5:2 F5:2 D5:2 B4:2 G4:8 |',
        },
      },
    },

    // Hot jazz: a two-bar break, a dixieland lead over a trombone-ish counter-line.
    party: {
      bpm: 176, loop: 1,
      p1: { duty: 1, vol: 11, env: 'lead', vib: V(6, 10, 0.15) },
      p2: { arp: '0.1.2.1.', step: 1, oct: 4, duty: 0, vol: 4, env: 'pluck' },
      tri: { style: 'charleston' },
      noi: ['k.h.s.hhk.hks.h.', 'k.h.s.hhk.h.s.hs', 'k.h.s.hhk.hks.h.', 'k.hks.hhk.hks.so'],
      order: ['I', 'A', 'B', 'A'],
      sec: {
        I: {
          ch: 'F7 F7',
          mel: 'F5:2 r:1 F5:1 r:2 F5:2 A5:2 C6:2 Eb6:4 | D6:2 C6:2 A5:2 F5:2 Eb5:2 C5:2 A4:4 |',
          p2: 'r:16 | r:16 |',
          tri: 'F2:2 r:14 | r:8 C3:2 r:2 F2:4 |',
          noi: ['c...............', 'k.k.s.s.k.k.ssss'],
        },
        A: {
          ch: 'Bb Bb7 Eb Ebm Bb G7 C7 F7',
          mel: 'D5:3 F5:1 Bb5:2 Db6:2 D6:4 Bb5:4 | Ab5:3 F5:1 D5:2 F5:2 Ab5:4 G5:4 | G5:2 Bb5:2 Eb6:2 Bb5:2 G5:2 Eb5:2 G5:4 | Gb5:3 F5:1 Eb5:2 Db5:2 Bb4:8 |' +
            ' F5:2 r:1 F5:1 Bb5:2 D6:2 F6:4 D6:4 | B5:3 A5:1 G5:2 F5:2 D5:4 B4:4 | C5:2 E5:2 G5:2 Bb5:2 Db6:2 C6:2 G5:4 | A5:3 G5:1 F5:2 Eb5:2 C5:2 A4:2 F4:4 |',
          p2: '@d2 @v6 @esus D4:8 F4:8 | Ab4:8 F4:8 | G4:8 Bb4:8 | Gb4:8 Eb4:8 | F4:8 D4:8 | B3:8 D4:8 | E4:8 G4:8 | Eb4:8 A3:8 |',
        },
        B: {
          ch: 'Eb Eb Bb Bb C7 C7 F7 F7',
          mel: 'G5:2 G5:2 r:2 G5:2 Bb5:3 G5:1 Eb5:4 | Gb5:2 G5:2 Bb5:2 C6:2 Eb6:8 | D6:3 C6:1 Bb5:2 F5:2 D5:2 F5:2 Bb5:4 | Db6:2 D6:6 r:4 Bb5:4 |' +
            ' E5:2 E5:2 r:2 E5:2 G5:3 E5:1 C5:4 | Bb5:2 A5:2 G5:2 E5:2 C6:8 | C6:3 A5:1 F5:2 Eb5:2 C5:2 Eb5:2 F5:4 | A5:2 r:2 C6:2 r:2 Eb6:2 D6:2 C6:4 |',
        },
      },
    },

    // Ragtime over the bridge into the city.
    bridge: {
      bpm: 152,
      p1: { duty: 2, vol: 10, env: 'lead', vib: V(6, 10, 0.2) },
      p2: { arp: '0.2.1.2.', step: 1, oct: 4, duty: 1, vol: 4, env: 'pluck' },
      tri: { style: 'stride' },
      noi: ['k.h.s.h.k.h.s.h.', 'k.h.s.h.k.h.s.ss'], noiVol: 11,
      order: ['A', 'B'],
      sec: {
        A: {
          ch: 'C A7 Dm G7 C E7 F G7',
          mel: 'E5:2 G5:1 C6:2 G5:1 E5:2 C6:2 G5:2 E5:2 C5:2 | C#6:2 E6:1 C#6:2 A5:1 G5:2 E5:4 C#5:4 |' +
            ' D5:2 F5:1 A5:2 D6:1 F6:2 D6:2 A5:2 F5:4 | G5:2 B5:1 D6:2 F6:1 G6:4 F6:2 D6:2 B5:2 |' +
            ' C6:3 B5:1 C6:2 E6:2 G6:4 E6:4 | G#5:2 B5:1 D6:2 E6:1 G#6:2 E6:2 D6:2 B5:4 |' +
            ' A5:2 C6:1 F6:2 C6:1 A5:2 F5:2 A5:2 C6:4 | B5:2 D6:2 F6:2 D6:2 B5:2 G5:2 D5:4 |',
        },
        B: {
          ch: 'F F#dim C/G A7 D7 G7 C G7',
          mel: 'F5:4 A5:2 C6:2 F6:8 | F#5:4 A5:2 C6:2 Eb6:8 | E6:3 D6:1 C6:2 G5:2 E5:4 G5:4 | C#6:3 D6:1 E6:2 G6:2 A6:4 E6:4 |' +
            ' F#6:2 E6:2 D6:2 C6:2 A5:4 F#5:4 | G5:2 A5:2 B5:2 D6:2 F6:4 D6:4 | E6:2 C6:2 G5:2 E5:2 C5:2 E5:2 G5:4 | B5:2 r:2 G5:2 r:2 D6:2 B5:2 G5:4 |',
        },
      },
    },

    // A sly tango in the cellar, with castanet clicks.
    cellar: {
      bpm: 104,
      p1: { duty: 1, vol: 10, env: 'sus', vib: V(5, 12, 0.25) },
      p2: { arp: '0..1..2.', step: 1, oct: 3, duty: 2, vol: 4, env: 'stac' },
      tri: { style: 'tango' },
      noi: ['k..hk.h.k..hk.h.', 'k..xk.x.k..xkxx.'], noiVol: 9,
      order: ['A', 'B'],
      sec: {
        A: {
          ch: 'Am Am Dm E7 Am Am B7 E7',
          mel: 'E5:3 F5:1 E5:2 D#5:2 E5:4 C5:4 | A4:3 B4:1 C5:2 D5:2 E5:8 | F5:3 G5:1 F5:2 E5:2 F5:4 D5:4 | G#4:3 A4:1 B4:2 D5:2 E5:8 |' +
            ' A5:3 G#5:1 A5:2 E5:2 C5:4 A4:4 | C5:2 D5:2 Eb5:2 E5:2 G5:4 A5:4 | F#5:3 D#5:1 B4:2 A4:2 D#5:8 | E5:4 r:2 E5:2 D5:2 B4:2 G#4:4 |',
        },
        B: {
          ch: 'Dm Am E7 Am Dm Am B7+E7 Am',
          mel: 'D5:2 F5:2 A5:6 G5:2 F5:4 | E5:2 A5:2 C6:6 B5:2 A5:4 | G#5:3 A5:1 B5:2 D6:2 F6:4 E6:4 | C6:6 B5:2 A5:8 |' +
            ' F5:3 E5:1 D5:2 F5:2 A5:4 D6:4 | C6:3 B5:1 A5:2 E5:2 C5:8 | D#5:4 F#5:4 E5:4 G#5:4 | A5:6 E5:2 A4:8 |',
        },
      },
    },

    // Klipspringer at the piano while it rains on the panes.
    mansion: {
      bpm: 96,
      p1: { duty: 1, vol: 9, env: 'soft', vib: V(5, 14, 0.3) },
      p2: { arp: '0121', step: 1, oct: 4, duty: 0, vol: 5, env: 'pluck' },
      tri: { style: 'half' },
      noi: ['h.h.h.h.h.h.h.h.'], noiVol: 4,
      order: ['A', 'B'],
      sec: {
        A: {
          ch: 'Eb Cm Fm Bb7 Eb Gm Ab Bb7',
          mel: 'G5:6 Bb5:2 Eb6:8 | D6:4 C6:4 G5:8 | Ab5:6 C6:2 F6:8 | Eb6:4 D6:4 Ab5:8 |' +
            ' G5:4 Bb5:4 Eb6:4 G6:4 | F6:6 D6:2 Bb5:8 | C6:4 Eb6:4 Ab6:4 G6:4 | F6:12 r:4 |',
        },
        B: {
          ch: 'Ab Abm Eb C7 Fm Bb7 Eb Bb7',
          mel: 'C6:6 Eb6:2 Ab6:8 | Cb6:6 Bb5:2 Ab5:8 | G5:4 Bb5:4 Eb6:8 | E6:6 Bb5:2 G5:8 |' +
            ' Ab5:4 C6:4 F6:4 Eb6:4 | D6:6 C6:2 Bb5:8 | Eb6:12 r:4 | D6:4 F6:4 Ab6:4 F6:4 |',
        },
      },
    },

    // Open water and pines, in six-eight.
    lake: {
      bpm: 132, bar: 12,
      p1: { duty: 2, vol: 10, env: 'lead', vib: V(5.5, 12, 0.2) },
      p2: { arp: '012', step: 2, oct: 4, duty: 0, vol: 4, env: 'pluck' },
      tri: { style: 'six' },
      noi: ['k.....s.....', 'k..h..s..h..'], noiVol: 9,
      order: ['A', 'B'],
      sec: {
        A: {
          ch: 'G G C G Em Am D7 G',
          mel: 'D5:4 G5:2 B5:4 D6:2 | B5:4 A5:2 G5:6 | E5:4 G5:2 C6:4 E6:2 | D6:6 B5:6 |' +
            ' E5:4 G5:2 B5:4 E6:2 | C6:4 B5:2 A5:4 E5:2 | F#5:4 A5:2 C6:4 A5:2 | G5:12 |',
        },
        B: {
          ch: 'C D Bm Em C D7 G G',
          mel: 'G5:4 C6:2 E6:4 C6:2 | F#6:6 D6:6 | D6:4 B5:2 F#5:4 B5:2 | G5:6 E5:6 |' +
            ' E5:2 G5:2 C6:2 E6:4 D6:2 | C6:4 A5:2 F#5:4 D5:2 | G5:4 B5:2 D6:4 G6:2 | G6:12 |',
        },
      },
    },

    // Heat. A fanfare from the ballroom below, then a melody that sags chromatically.
    plaza: {
      bpm: 120,
      p1: { duty: 0, vol: 9, env: 'sus', vib: V(6, 20, 0.1) },
      p2: { arp: '0.1.2.3.', step: 1, oct: 3, duty: 2, vol: 4, env: 'stac' },
      tri: { style: 'swing' },
      noi: ['k...h.hxs...h.hx'], noiVol: 8,
      order: ['F', 'A', 'B'],
      sec: {
        F: {
          ch: 'C C',
          mel: 'G4:1 G4:1 G4:2 r:4 G4:1 G4:1 G4:2 r:4 | C5:4 E5:4 G5:8 |',
          p2: '@d2 @v5 E4:1 E4 E4:2 r:4 E4:1 E4 E4:2 r:4 | G4:4 C5:4 E5:8 |',
          tri: 'C3:4 r:4 C3:4 r:4 | C3:4 E3:4 G3:8 |',
          noi: ['k...............', 's.s.s.s.ssssssss'],
        },
        A: {
          ch: 'Dm Dm E7 A7 Dm Gm E7 A7',
          mel: 'A5:3 Ab5:1 G5:3 Gb5:1 F5:8 | E5:3 F5:1 E5:3 D5:1 A4:8 | G#4:3 A4:1 B4:3 D5:1 F5:4 E5:4 | C#5:4 E5:4 G5:4 Bb5:4 |' +
            ' D6:3 C#6:1 C6:3 B5:1 Bb5:8 | A5:3 G5:1 Bb5:3 A5:1 G5:8 | G#5:3 F5:1 E5:3 D5:1 B4:8 | A4:4 C#5:4 E5:4 G5:4 |',
        },
        B: {
          ch: 'Bb A7 Dm D7 Gm A7 Dm A7',
          mel: 'F5:6 F5:2 Bb5:8 | E5:6 E5:2 A5:8 | F5:3 E5:1 D5:4 F5:4 A5:4 | F#5:3 A5:1 C6:4 Eb6:8 |' +
            ' D6:3 C6:1 Bb5:3 A5:1 G5:8 | C#6:3 Bb5:1 A5:3 G5:1 E5:8 | F5:4 E5:4 D5:8 | r:4 C#5:4 E5:4 A5:4 |',
        },
      },
    },

    // A bugle over snare rolls.
    argonne: {
      bpm: 108,
      p1: { duty: 2, vol: 10, env: 'lead', vib: V(5, 10, 0.25) },
      p2: { arp: '0.0.1.0.', step: 1, oct: 3, duty: 1, vol: 4, env: 'stac' },
      tri: { style: 'gallop' },
      noi: ['k..ss.s.k..ss.s.', 'k..ss.s.k..ss.s.', 'k..ss.s.k..ss.s.', 'k.ssssssk.s.sss.'], noiVol: 11,
      order: ['A', 'B'],
      sec: {
        A: {
          ch: 'Gm Gm Cm D Gm Eb Cm D',
          mel: 'D5:3 D5:1 G5:4 Bb5:4 G5:4 | D6:6 Bb5:2 G5:8 | Eb5:3 Eb5:1 G5:4 C6:4 G5:4 | F#5:6 A5:2 D5:8 |' +
            ' G5:3 G5:1 Bb5:4 D6:4 G6:4 | G6:6 F6:2 Eb6:8 | Eb6:3 D6:1 C6:4 G5:4 Eb5:4 | D5:4 F#5:4 A5:4 D6:4 |',
        },
        B: {
          ch: 'Eb Bb Cm Gm Eb F D D',
          mel: 'Bb5:6 G5:2 Eb5:8 | F5:3 F5:1 Bb5:4 D6:8 | C6:6 Eb6:2 G6:8 | D6:6 Bb5:2 G5:8 |' +
            ' G5:3 G5:1 Bb5:4 Eb6:4 G6:4 | F6:6 Eb6:2 C6:8 | D6:3 D6:1 D6:4 A5:4 F#5:4 | D5:16 |',
        },
      },
    },

    // The last stage: the green light, reached for again and again. The noise
    // channel is the water.
    current: {
      bpm: 76,
      p1: { duty: 1, vol: 10, env: 'soft', vib: V(5, 16, 0.3) },
      p2: { echo: 4, duty: 0, vol: 4, env: 'soft' },
      tri: { style: 'half' },
      noi: ['w...............', '................'], noiVol: 7,
      order: ['A', 'B'],
      sec: {
        A: {
          ch: 'F Dm Bb C F Am Bb C7',
          mel: 'C5:4 A5:12 | G5:4 F5:4 E5:4 D5:4 | D5:4 Bb5:12 | A5:4 G5:4 F5:4 E5:4 |' +
            ' F5:4 A5:4 C6:8 | E6:6 D6:2 C6:8 | D6:6 C6:2 Bb5:4 A5:4 | G5:12 r:4 |',
        },
        B: {
          ch: 'Dm Bbmaj7 Gm7 A7 Dm Gm C7 F',
          mel: 'A5:6 G5:2 F5:4 D5:4 | F5:4 A5:4 D6:8 | C6:6 Bb5:2 A5:4 G5:4 | E5:4 G5:4 C#6:8 |' +
            ' D6:6 C6:2 A5:8 | Bb5:6 A5:2 G5:4 D5:4 | C5:4 A5:8 G5:4 | F5:16 |',
        },
      },
    },

    // The motif once more, reaching an octave farther, and it ends.
    ending: {
      bpm: 84, loop: false,
      p1: { duty: 1, vol: 10, env: 'soft', vib: V(5, 14, 0.25) },
      p2: { echo: 4, duty: 0, vol: 4, env: 'soft' },
      tri: { style: 'half' },
      noi: ['x...h...x...h...'], noiVol: 6,
      order: ['A', 'Z'],
      sec: {
        A: {
          ch: 'F Dm Bb C F Dm Gm7 C7',
          mel: 'C5:4 A5:12 | G5:4 F5:4 E5:4 D5:4 | D5:4 Bb5:12 | A5:4 G5:4 F5:4 E5:4 |' +
            ' C5:4 C6:12 | A5:4 F5:4 D5:8 | Bb5:6 A5:2 G5:4 F5:4 | E5:8 G5:8 |',
        },
        Z: { ch: 'F F', mel: 'A5:4 C6:4 F6:8 | F6:16 |', tri: 'F2:4 C3:4 F3:8 | F2:16 |', noi: ['x...h...x...h...', 'c...............'] },
      },
    },

    sad: {
      bpm: 72,
      p1: { duty: 1, vol: 9, env: 'soft', vib: V(5, 16, 0.3) },
      p2: { arp: '0121', step: 2, oct: 3, duty: 0, vol: 4, env: 'pluck' },
      tri: { style: 'half' },
      noi: ['x...............'], noiVol: 5,
      order: ['A'],
      sec: {
        A: {
          ch: 'Dm Gm A7 Dm Bb Gm A A7',
          mel: 'A5:8 F5:4 D5:4 | G5:6 A5:2 Bb5:4 D6:4 | C#6:8 A5:4 E5:4 | F5:12 r:4 |' +
            ' D6:8 Bb5:4 F5:4 | G5:4 Bb5:4 D6:4 C6:4 | C#6:6 Bb5:2 A5:4 G5:4 | E5:12 r:4 |',
        },
      },
    },

    tender: {
      bpm: 80,
      p1: { duty: 2, vol: 9, env: 'soft', vib: V(5, 12, 0.3) },
      p2: { arp: '0120', step: 2, oct: 4, duty: 0, vol: 4, env: 'soft' },
      tri: { style: 'half' },
      order: ['A'],
      sec: {
        A: {
          ch: 'F Am Bb F Dm Gm C7 F',
          mel: 'A5:6 C6:2 A5:8 | G5:4 E5:4 C5:8 | D5:4 F5:4 Bb5:8 | A5:12 r:4 |' +
            ' F5:4 A5:4 D6:8 | D6:6 C6:2 Bb5:8 | G5:4 Bb5:4 E6:4 C6:4 | F5:16 |',
        },
      },
    },

    dread: {
      bpm: 88,
      p1: { duty: 0, vol: 8, env: 'soft', vib: V(7, 25, 0.2) },
      p2: { arp: '0121', step: 2, oct: 3, duty: 1, vol: 3, env: 'pluck' },
      tri: { style: 'heart' },
      noi: ['x.......x...x...'], noiVol: 6,
      order: ['A'],
      sec: {
        A: {
          ch: 'Cm Cm Db Cm Cm Cm Db G',
          mel: 'G5:12 Ab5:4 | G5:16 | Ab5:12 G5:4 | F5:8 Eb5:8 | G5:12 Ab5:4 | G5:8 Eb5:8 | F5:8 Db5:8 | B4:16 |',
        },
      },
    },

    // Under the cutscenes at the party: the same crowd, heard from the lawn.
    jazz: {
      bpm: 132,
      p1: { duty: 1, vol: 8, env: 'sus', vib: V(6, 10, 0.2) },
      p2: { arp: '0.1.2.1.', step: 1, oct: 4, duty: 0, vol: 3, env: 'pluck' },
      tri: { style: 'swing' },
      noi: ['h..h..h.h..h..h.'], noiVol: 7,
      order: ['A'],
      sec: {
        A: {
          ch: 'F D7 G7 C7 F D7 Gm7 C7',
          mel: 'A5:3 G5:1 F5:3 C5:1 F5:4 A5:4 | C6:3 A5:1 F#5:4 D5:8 | B5:3 A5:1 G5:3 D5:1 F5:8 | E5:3 F5:1 G5:4 Bb5:4 G5:4 |' +
            ' A5:3 C6:1 F6:4 E6:4 C6:4 | Eb6:3 D6:1 C6:4 A5:4 F#5:4 | G5:3 A5:1 Bb5:4 D6:4 F5:4 | E5:4 G5:4 C6:8 |',
        },
      },
    },
  };

  /* ---------------------------------------------------- jingles (sfx) */
  const JINGLES = {
    die: {
      bpm: 160, bar: 16, loop: false,
      p1: { duty: 2, vol: 12, env: 'sus' }, p2: { duty: 1, vol: 8, env: 'sus' }, tri: {},
      order: ['J'],
      sec: { J: {
        ch: 'F',
        mel: 'A5:1 Ab5 G5 Gb5 F5:2 E5 Eb5 D5:6',
        p2: 'r:1 C5:1 B4 Bb4 A4:2 Ab4 G4 F#4:6',
        tri: 'r:8 C3:2 F2:6',
        noi: ['........k.......'],
      } },
    },
    // A Charleston tag: "da, da-da-da-DA".
    clear: {
      bpm: 160, bar: 24, loop: false,
      p1: { duty: 2, vol: 12, env: 'sus', vib: V(6, 12, 0.15) }, p2: { duty: 1, vol: 8, env: 'sus' }, tri: {},
      order: ['J'],
      sec: { J: {
        ch: 'F',
        mel: 'C5:3 F5:1 r:2 A5:2 G#5:1 A5:1 C6:2 A5:2 F5:2 G5:2 F5:6',
        p2: 'A4:3 C5:1 r:2 F5:2 E5:1 F5:1 A5:2 F5:2 C5:2 E5:2 C5:6',
        tri: 'F2:6 C3:2 F2:4 A2:4 C3:2 C2:2 F2:4',
        noi: ['k.....s.k.s.s.s.c.......'],
      } },
    },
    card: {
      bpm: 120, bar: 12, loop: false,
      p1: { duty: 2, vol: 11, env: 'lead', vib: V(5, 12, 0.2) }, p2: { duty: 0, vol: 7, env: 'lead' }, tri: {},
      order: ['J'],
      sec: { J: {
        ch: 'F',
        mel: 'C5:1 F5 A5 E6:9',
        p2: 'r:1 A4:1 C5 G5:9',
        tri: 'F2:12',
        noi: ['c...........'],
      } },
    },
  };

  /* -------------------------------------------------------- one-shots */
  // w: 'p' pulse (borrows music pulse 2), 'p2' extra pulse (borrows nothing),
  // 't' triangle, 'n' noise. f: Hz/note, or a list ramped across d. arp: notes
  // stepped every `step` s. v: volume 0-15. env defaults to a decay over d.
  const SFX = {
    jump: [{ w: 'p', d: 0.16, duty: 1, f: [262, 784], v: 10 }],
    walljump: [{ w: 'p', d: 0.14, duty: 2, f: [330, 990], v: 10 }, { w: 'n', d: 0.05, idx: 6, v: 8 }],
    land: [{ w: 'n', d: 0.07, idx: 11, v: 9 }],
    swim: [{ w: 'p', d: 0.1, duty: 0, f: [400, 900], v: 8 }, { w: 'n', d: 0.08, idx: 3, v: 3 }],
    throw: [{ w: 'n', d: 0.18, idx: 1, rate: [0.4, 1, 0.5], v: 7, env: 'swell' }],
    paper: [{ w: 'n', d: 0.12, idx: 2, short: true, v: 6 }, { w: 'n', t: 0.05, d: 0.1, idx: 1, v: 5 }],
    clack: [{ w: 'n', d: 0.05, idx: 4, short: true, v: 11 }, { w: 'p', d: 0.05, duty: 0, f: 1400, v: 6 }],
    glass: [
      { w: 'n', d: 0.08, idx: 0, v: 10 },
      { w: 'n', t: 0.02, d: 0.3, idx: 1, short: true, v: 7 },
      { w: 'p', d: 0.3, duty: 0, arp: ['E7', 'C7', 'G7', 'D7', 'A6', 'F7'], step: 0.03, v: 8 },
    ],
    hurt: [{ w: 'p', d: 0.32, duty: 2, f: [880, 440, 700, 350, 560, 280], v: 12, env: { d: 0.32, s: 0.25 } }, { w: 'n', d: 0.1, idx: 4, v: 8 }],
    die: 'die',
    clear: 'clear',
    hit: [{ w: 'p', d: 0.08, duty: 1, f: [900, 300], v: 11 }, { w: 'n', d: 0.05, idx: 3, v: 9 }],
    poof: [{ w: 'n', d: 0.32, idx: 3, rate: [1, 0.25], v: 11 }, { w: 'p', d: 0.15, duty: 0, f: [600, 150], v: 7 }],
    stomp: [{ w: 'p', d: 0.12, duty: 1, f: [180, 700], v: 11 }, { w: 'n', d: 0.06, idx: 8, v: 10 }],
    item: [
      { w: 'p', d: 0.45, duty: 1, arp: ['F6', 'A6', 'C7', 'E7', 'F7', 'A7', 'C7', 'E7', 'F7', 'A7'], step: 0.04, v: 10, env: { d: 0.45, s: 0.35 } },
      { w: 'p2', t: 0.04, d: 0.45, duty: 0, arp: ['F6', 'A6', 'C7', 'E7', 'F7', 'A7', 'C7', 'E7', 'F7', 'A7'], step: 0.04, v: 4 },
    ],
    heart: [
      { w: 'p', d: 0.35, duty: 2, arp: ['G5', 'B5', 'D6', 'G6', 'B6'], step: 0.05, v: 10, env: { d: 0.35, s: 0.3 } },
      { w: 'p2', t: 0.12, d: 0.26, duty: 0, arp: ['D6', 'G6'], step: 0.06, v: 5 },
    ],
    check: [
      { w: 'p', d: 0.11, duty: 1, f: 'E6', v: 10, env: { d: 0.11, s: 0.5 } },
      { w: 'p', t: 0.1, d: 0.6, duty: 1, f: 'B6', v: 10, vib: V(6, 20, 0.1) },
    ],
    locked: [
      { w: 'p', d: 0.1, duty: 0, f: 110, v: 12, env: { d: 0.1, s: 0.6 } },
      { w: 'p', t: 0.14, d: 0.15, duty: 0, f: 98, v: 12, env: { d: 0.15, s: 0.6 } },
    ],
    sign: [{ w: 'p', d: 0.06, duty: 1, f: 'A5', v: 8, env: { d: 0.06, s: 0.6 } }, { w: 'p', t: 0.06, d: 0.12, duty: 1, f: 'E6', v: 8 }],
    crumble: [{ w: 'n', d: 0.55, idx: 10, v: 11, trem: 0.5 }],
    creak: [{ w: 'p', d: 0.5, duty: 0, f: [150, 120, 160, 130], v: 7, vib: V(22, 60, 0), env: { a: 0.05, d: 0.45, s: 0 } }],
    fall: [{ w: 'p', d: 0.55, duty: 2, f: [1400, 350], v: 8, env: { d: 0.55, s: 0.4 } }],
    smash: [{ w: 'n', d: 0.4, idx: 2, rate: [1, 0.3], v: 14 }, { w: 'n', d: 0.25, idx: 6, short: true, v: 7 }],
    flap: [{ w: 'n', d: 0.05, idx: 6, v: 8 }, { w: 'n', t: 0.11, d: 0.05, idx: 6, v: 7 }, { w: 'n', t: 0.22, d: 0.05, idx: 6, v: 5 }],
    toss: [{ w: 'p', d: 0.12, duty: 1, f: [350, 900], v: 8 }, { w: 'n', d: 0.1, idx: 2, v: 3, env: 'swell' }],
    pitch: [{ w: 'n', d: 0.08, idx: 1, v: 9 }, { w: 'p', d: 0.2, duty: 1, f: [600, 1500], v: 8 }],
    bounce: [{ w: 'p', d: 0.06, duty: 2, f: [500, 260], v: 8 }],
    alarm: [{ w: 'p', d: 0.36, duty: 2, arp: ['A5', 'E6'], step: 0.06, loop: true, v: 10, env: { d: 0.36, s: 0.6 } }],
    horn: [
      { w: 'p', d: 0.32, duty: 1, f: 'A4', v: 11, vib: V(9, 18, 0), env: { d: 0.3, s: 0.8 } },
      { w: 'p2', d: 0.32, duty: 1, f: 'C#5', v: 8, env: { d: 0.3, s: 0.8 } },
      { w: 'p', t: 0.4, d: 0.5, duty: 1, f: 'F#4', v: 11, vib: V(9, 18, 0), env: { d: 0.5, s: 0.8 } },
    ],
    whistle: [{ w: 'p', d: 0.9, duty: 0, f: [2400, 600], v: 7, env: { a: 0.1, d: 0.8, s: 0.6 } }],
    boom: [{ w: 'n', d: 0.9, idx: 12, rate: [1.2, 0.5], v: 15 }, { w: 't', d: 0.5, f: [90, 30], v: 15 }],
    train: [{ w: 'n', d: 1.6, idx: 9, v: 9, trem: 0.45 }, { w: 'p', d: 0.6, duty: 1, f: 'D5', v: 7 }, { w: 'p2', d: 0.6, duty: 1, f: 'F#5', v: 5 }],
    bell: [
      { w: 'p', d: 1.2, duty: 2, f: 'C6', v: 9 },
      { w: 'p2', d: 1.0, duty: 0, f: 'G6', v: 5 },
      { w: 'n', d: 0.04, idx: 2, short: true, v: 6 },
    ],
    splash: [{ w: 'n', d: 0.4, idx: 2, rate: [0.6, 1.4, 0.4], v: 11 }, { w: 'p', d: 0.1, duty: 0, f: [300, 900], v: 5 }],
    wave: [{ w: 'n', d: 1.3, idx: 4, rate: [0.5, 1, 0.6], v: 8, env: 'swell' }],
    pop: [{ w: 'n', d: 0.05, idx: 0, v: 12 }, { w: 'p', d: 0.12, duty: 0, f: [400, 1600], v: 7 }],
    neigh: [{ w: 'p', d: 0.6, duty: 1, f: [700, 1100, 800, 600], v: 9, vib: V(18, 90, 0.05), env: { a: 0.03, d: 0.55, s: 0.1 } }],
    zap: [
      { w: 'p', d: 0.28, duty: 0, jit: [300, 2400], v: 9, env: { d: 0.28, s: 0.3 } },
      { w: 'n', d: 0.28, idx: 1, short: true, v: 6, trem: 0.6 },
    ],
    card: 'card',
    type: { steal: false, parts: [{ w: 'n', d: 0.02, idx: 0, short: true, v: 2 }] },
    pause: [{ w: 'p', d: 0.34, duty: 1, arp: ['E6', 'C6', 'E6', 'C6'], step: 0.08, v: 9, env: 'sus' }],
    tick: { steal: false, parts: [{ w: 'p', d: 0.035, duty: 0, f: 'A6', v: 7, env: { d: 0.035, s: 0.4 } }] },
    start: [
      { w: 'p', d: 0.3, duty: 1, arp: ['F6', 'A6', 'C7', 'F7'], step: 0.05, v: 10, env: { d: 0.3, s: 0.3 } },
      { w: 'p2', t: 0.05, d: 0.28, duty: 0, arp: ['F6', 'A6', 'C7', 'F7'], step: 0.05, v: 5 },
    ],
    bossHit: [
      { w: 'n', d: 0.12, idx: 3, v: 13 },
      { w: 'p', d: 0.18, duty: 2, f: [300, 80], v: 12 },
      { w: 'n', d: 0.15, idx: 5, short: true, v: 7 },
    ],
    bossDie: () => {
      const p = [
        { w: 't', d: 1.9, f: [220, 30], v: 15 },
        { w: 'p', d: 1.3, duty: 2, f: [600, 60], v: 8, trem: 0.3 },
      ];
      for (let i = 0; i < 10; i++) {
        p.push({ w: 'n', t: i * 0.17 + Math.random() * 0.04, d: 0.4, idx: 8 + (i % 4), rate: [1, 0.4], v: 15 - i });
      }
      return p;
    },
  };

  /* ----------------------------------------------------------- compile */
  function expand(s) {
    let prev;
    do { prev = s; s = s.replace(/\[([^[\]]*)\]\s*(\d+)/g, (_, body, n) => Array(+n).fill(body).join(' ')); } while (s !== prev);
    return s;
  }

  function parseLine(str, bar, tr, where) {
    const evs = [];
    let row = 0, len = 4, duty, vol, env, last = null;
    for (const tok of expand(str).split(/\s+/)) {
      if (!tok) continue;
      if (tok === '|') {
        if (bar && row % bar) throw new Error(`${where}: bar check failed at row ${row} (bar ${(row / bar).toFixed(2)})`);
        continue;
      }
      if (tok[0] === '@') {
        const k = tok[1], v = tok.slice(2);
        if (k === 'd' && /^[0-3]$/.test(v)) duty = +v;
        else if (k === 'v' && +v >= 0 && +v <= 15) vol = +v;
        else if (k === 'e' && ENV[v]) env = v;
        else throw new Error(`${where}: bad directive ${tok}`);
        continue;
      }
      const m = /^(r|-|[A-G][#b]?-?\d)(?::(\d+))?$/.exec(tok);
      if (!m) throw new Error(`${where}: bad token "${tok}"`);
      if (m[2]) len = +m[2];
      if (!(len > 0)) throw new Error(`${where}: zero length at "${tok}"`);
      if (m[1] === 'r') last = null;
      else if (m[1] === '-') { if (!last) throw new Error(`${where}: tie without a note`); last.len += len; }
      else {
        const n = midi(m[1]) + tr;
        if (!(n >= 21 && n <= 108)) throw new Error(`${where}: note out of range "${tok}"`);
        last = { row, len, m: n, duty, vol, env };
        evs.push(last);
      }
      row += len;
    }
    return { evs, rows: row };
  }

  function resolve(name) {
    const d = TRACKS[name] || JINGLES[name];
    if (!d) return null;
    if (!d.from) return d;
    const b = resolve(d.from);
    return Object.assign({}, b, d, { sec: Object.assign({}, b.sec, d.sec || {}), from: null });
  }

  const compiled = {};
  function getTrack(name) {
    if (!Object.prototype.hasOwnProperty.call(compiled, name)) {
      try { compiled[name] = compile(name); } catch (e) { compiled[name] = null; if (G.console) console.warn('audio:', e.message); }
    }
    return compiled[name];
  }

  function compile(name) {
    const def = resolve(name);
    if (!def) throw new Error('no track ' + name);
    const bar = def.bar || 16, tr = def.tr || 0;
    const cfg = {
      p1: Object.assign({ duty: 2, vol: 10, env: 'lead' }, def.p1),
      p2: Object.assign({ duty: 0, vol: 5, env: 'pluck' }, def.p2),
      tri: Object.assign({ vol: 15 }, def.tri),
      noi: { vol: def.noiVol || 15 },
    };
    const ch = { p1: [], p2: [], tri: [], noi: [] };
    const shift = (list, evs, at) => { for (const e of evs) list.push(Object.assign({}, e, { row: e.row + at })); };
    let row = 0, loopRow = 0;
    def.order.forEach((sn, si) => {
      const sec = def.sec[sn], where = `${name}/${sn}`;
      if (!sec) throw new Error(`${where}: missing section`);
      if (si === (def.loop || 0)) loopRow = row;
      const mel = parseLine(sec.mel, bar, tr, where + '/p1');
      if (!mel.rows || mel.rows % bar) throw new Error(`${where}: melody is ${mel.rows} rows, not whole bars of ${bar}`);
      const bars = mel.rows / bar;
      const chords = sec.ch.trim().split(/\s+/).filter((c) => c !== '|');
      if (chords.length !== bars) throw new Error(`${where}: ${chords.length} chords for ${bars} bars`);
      const segs = [];
      chords.forEach((c, b) => {
        const parts = c.split('+');
        const L = bar / parts.length;
        if (L !== Math.floor(L)) throw new Error(`${where}: cannot split bar ${b} into ${parts.length}`);
        parts.forEach((p, i) => segs.push({ row: row + b * bar + i * L, len: L, c: chord(p, tr) }));
      });
      shift(ch.p1, mel.evs, row);

      const line = (v, key) => {
        const l = parseLine(v, bar, tr, `${where}/${key}`);
        if (l.rows !== mel.rows) throw new Error(`${where}/${key}: ${l.rows} rows, melody has ${mel.rows}`);
        shift(ch[key], l.evs, row);
      };
      const p2 = sec.p2 !== undefined ? sec.p2 : def.p2;
      if (typeof p2 === 'string') line(p2, 'p2');
      else if (p2 && p2.arp) for (const s of segs) arpEvents(ch.p2, s, p2);

      const tri = sec.tri !== undefined ? sec.tri : def.tri;
      if (typeof tri === 'string') line(tri, 'tri');
      else if (tri && tri.style) {
        if (!BASS[tri.style]) throw new Error(`${where}: no bass style ${tri.style}`);
        for (const s of segs) bassEvents(ch.tri, s, tri);
      }

      const noi = sec.noi || def.noi;
      if (noi) drumEvents(ch.noi, noi, bars, bar, row, where);
      row += mel.rows;
    });
    const len = row;

    if (def.p2 && def.p2.echo) {
      const D = def.p2.echo;
      const echoed = [];
      for (const e of ch.p1) {
        const inLoop = e.row >= loopRow, lo = inLoop ? loopRow : 0, hi = inLoop ? len : loopRow;
        const r = e.row + D;
        if (r >= hi) { if (inLoop) echoed.push({ row: lo + r - hi, len: e.len, m: e.m, wrap: true }); continue; }
        if (r + e.len > hi) {
          echoed.push({ row: r, len: hi - r, m: e.m });
          if (inLoop) echoed.push({ row: lo, len: r + e.len - hi, m: e.m, wrap: true });
        } else echoed.push({ row: r, len: e.len, m: e.m });
      }
      ch.p2 = ch.p2.concat(echoed);
    }

    const byRow = new Array(len);
    let notes = 0;
    for (const k of ['p1', 'p2', 'tri', 'noi']) {
      for (const e of ch[k]) {
        if (!(e.row >= 0 && e.row < len)) throw new Error(`${name}: ${k} event outside the track at row ${e.row}`);
        (byRow[e.row] || (byRow[e.row] = [])).push([k, e]);
        notes++;
      }
    }
    const rowDur = 60 / def.bpm / 4;
    return {
      name, bar, len, loopRow, rowDur, loop: def.loop !== false, cfg, byRow, notes,
      bars: len / bar, seconds: len * rowDur, loopSeconds: (len - loopRow) * rowDur,
      counts: { p1: ch.p1.length, p2: ch.p2.length, tri: ch.tri.length, noi: ch.noi.length },
    };
  }

  function arpEvents(out, s, cfg) {
    const step = cfg.step || 1, pat = cfg.arp, base = 12 * ((cfg.oct === undefined ? 4 : cfg.oct) + 1);
    let i = 0;
    for (let r = 0; r < s.len; r += step, i++) {
      const c = pat[i % pat.length];
      if (c === '.') continue;
      const k = +c, iv = s.c.iv;
      if (!(k >= 0)) throw new Error('bad arp pattern ' + pat);
      out.push({ row: s.row + r, len: Math.min(step, s.len - r), m: base + s.c.root + iv[k % iv.length] + 12 * Math.floor(k / iv.length) });
    }
  }

  function bassEvents(out, s, cfg) {
    const pat = BASS[cfg.style], lo = cfg.lo === undefined ? 40 : cfg.lo;
    const root = lo + (((s.c.bass - lo) % 12) + 12) % 12;
    let r = 0, i = 0;
    while (r < s.len) {
      const [iv, l] = pat[i++ % pat.length];
      const L = Math.min(l, s.len - r);
      if (iv !== null) out.push({ row: s.row + r, len: L, m: root + iv });
      r += L;
    }
  }

  function drumEvents(out, pats, bars, bar, start, where) {
    for (let b = 0; b < bars; b++) {
      const p = pats[b % pats.length];
      if (p.length !== bar) throw new Error(`${where}: drum pattern "${p}" is ${p.length} rows, bar is ${bar}`);
      for (let i = 0; i < bar; i++) {
        const c = p[i];
        if (c === '.') continue;
        if (!KIT[c]) throw new Error(`${where}: unknown drum "${c}"`);
        let j = i + 1;
        while (j < bar && p[j] === '.') j++;
        out.push({ row: start + b * bar + i, len: j - i, d: c });
      }
    }
  }

  /* ------------------------------------------------------------ engine */
  const NOISE_PERIODS = [4, 8, 16, 32, 64, 96, 128, 160, 202, 254, 380, 508, 762, 1016, 2034, 4068];

  function makeEngine(ctx) {
    const E = {};
    const N = 96;
    E.pulse = [0.125, 0.25, 0.5, 0.75].map((d) => {
      const re = new Float32Array(N), im = new Float32Array(N);
      for (let n = 1; n < N; n++) re[n] = (2 * Math.sin(Math.PI * n * d)) / (Math.PI * n);
      return ctx.createPeriodicWave(re, im);
    });
    E.tri = (() => {
      // The 2A03 triangle: 32 steps of a 4-bit counter, 15..0 then 0..15.
      const re = new Float32Array(N), im = new Float32Array(N);
      for (let k = 0; k < 32; k++) {
        const v = (k < 16 ? 15 - k : k - 16) - 7.5;
        for (let n = 1; n < N; n++) {
          const w = 2 * Math.PI * n, x0 = k / 32, x1 = (k + 1) / 32;
          re[n] += (2 * v * (Math.sin(w * x1) - Math.sin(w * x0))) / w;
          im[n] += (2 * v * -(Math.cos(w * x1) - Math.cos(w * x0))) / w;
        }
      }
      return ctx.createPeriodicWave(re, im);
    })();

    const bufs = {};
    function noiseBuf(idx, short) {
      const key = idx * 2 + (short ? 1 : 0);
      if (bufs[key]) return bufs[key];
      const sr = ctx.sampleRate, n = Math.floor(sr * 0.5);
      const b = ctx.createBuffer(1, n, sr), d = b.getChannelData(0);
      const step = 1789773 / NOISE_PERIODS[idx] / sr, tap = short ? 6 : 1;
      let reg = 1, a = 0;
      for (let i = 0; i < n; i++) {
        d[i] = reg & 1 ? -1 : 1;
        a += step;
        while (a >= 1) { a -= 1; reg = (reg >> 1) | (((reg ^ (reg >> tap)) & 1) << 14); }
      }
      return (bufs[key] = b);
    }

    // Output: master (on/off) -> DC block -> gentle lowpass -> safety limiter.
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -9; limiter.knee.value = 3; limiter.ratio.value = 20;
    limiter.attack.value = 0.001; limiter.release.value = 0.15;
    const out = ctx.createGain(); out.gain.value = 0.9;
    limiter.connect(out); out.connect(ctx.destination);
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 13000; lp.Q.value = 0;
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 28; hp.Q.value = 0;
    hp.connect(lp); lp.connect(limiter);
    E.master = ctx.createGain(); E.master.connect(hp);
    E.music = ctx.createGain(); E.music.gain.value = MUSIC_VOL; E.music.connect(E.master);
    E.sfxBus = ctx.createGain(); E.sfxBus.gain.value = SFX_VOL; E.sfxBus.connect(E.master);
    E.steal = {};
    const stealEnd = {};
    for (const k of ['p1', 'p2', 'tri', 'noi']) { E.steal[k] = ctx.createGain(); E.steal[k].connect(E.music); stealEnd[k] = 0; }

    function envelope(param, t, dur, o) {
      const e = typeof o.env === 'object' ? o.env : ENV[o.env] || { d: dur, s: 0, r: 0.02 };
      const a = e.swell ? dur * 0.45 : e.a || 0;
      const d = e.swell ? dur * 0.55 : e.d || 0;
      const s = e.swell ? 0 : e.s === undefined ? 1 : e.s;
      const r = e.r || 0.03, vol = o.vol === undefined ? 10 : o.vol, amp = (o.mix || 1) / 15, trem = o.trem || 0;
      param.setValueAtTime(0, t);
      let last = -1;
      const frames = Math.max(1, Math.ceil(dur * 60));
      for (let k = 0; k < frames; k++) {
        const x = k / 60;
        let lv = x < a ? Math.min(1, (x + 1 / 60) / a) : d > 0 ? Math.max(s, 1 - ((1 - s) * (x - a)) / d) : s;
        if (trem) lv *= 1 - trem * Math.random();
        const q = Math.round(lv * vol);
        if (q !== last) { param.setTargetAtTime(q * amp, t + x, k ? 0.003 : 0.0015); last = q; }
        if (!trem && x >= a + d) break;
      }
      param.setTargetAtTime(0, t + dur, r / 3);
      return t + dur + r * 2 + 0.03;
    }

    function setFreq(p, t, dur, o) {
      if (o.arp) {
        const st = o.step || 1 / 30, n = o.arp.length;
        for (let i = 0, x = 0; x < dur; i++, x += st) {
          if (!o.loop && i >= n) break;
          p.setValueAtTime(o.arp[i % n], t + x);
        }
      } else if (o.jit) {
        const [lo, hi] = o.jit;
        for (let x = 0; x < dur; x += 1 / 60) p.setValueAtTime(lo * Math.pow(hi / lo, Math.random()), t + x);
      } else if (Array.isArray(o.f)) {
        p.setValueAtTime(o.f[0], t);
        const n = o.f.length - 1;
        for (let i = 1; i <= n; i++) p.exponentialRampToValueAtTime(o.f[i], t + (dur * i) / n);
      } else p.setValueAtTime(o.f, t);
    }

    function tone(dest, t, dur, o) {
      const osc = ctx.createOscillator();
      osc.setPeriodicWave(o.tri ? E.tri : E.pulse[o.duty | 0] || E.pulse[2]);
      setFreq(osc.frequency, t, dur, o);
      const g = ctx.createGain();
      g.gain.value = 0;
      const end = envelope(g.gain, t, dur, o);
      osc.connect(g); g.connect(dest);
      const vib = o.vib;
      if (vib && dur > (vib.delay || 0) + 0.06) {
        const lfo = ctx.createOscillator(), lg = ctx.createGain();
        lfo.frequency.value = vib.rate;
        const t0 = t + (vib.delay || 0);
        lg.gain.setValueAtTime(0, t);
        lg.gain.setValueAtTime(0, t0);
        lg.gain.linearRampToValueAtTime(vib.depth, t0 + 0.12);
        lfo.connect(lg); lg.connect(osc.detune);
        lfo.start(t0); lfo.stop(end);
      }
      osc.onended = () => { try { g.disconnect(); } catch (e) { /* gone */ } };
      osc.start(t); osc.stop(end);
    }

    function noise(dest, t, dur, o) {
      const src = ctx.createBufferSource();
      src.buffer = noiseBuf(o.idx === undefined ? 5 : o.idx, !!o.short);
      src.loop = true;
      if (o.rate) {
        const rt = Math.min(dur, o.rateT || dur), n = o.rate.length - 1;
        src.playbackRate.setValueAtTime(o.rate[0], t);
        for (let i = 1; i <= n; i++) src.playbackRate.exponentialRampToValueAtTime(o.rate[i], t + (rt * i) / n);
      }
      const g = ctx.createGain();
      g.gain.value = 0;
      const end = envelope(g.gain, t, dur, o);
      src.connect(g); g.connect(dest);
      src.onended = () => { try { g.disconnect(); } catch (e) { /* gone */ } };
      src.start(t, Math.random() * 0.4);
      src.stop(end);
    }

    E.stealFor = (k, t0, t1) => {
      const g = E.steal[k].gain;
      g.cancelScheduledValues(t0);
      g.setTargetAtTime(0, t0, 0.004);
      stealEnd[k] = Math.max(stealEnd[k] > t0 ? stealEnd[k] : 0, t1);
      g.setTargetAtTime(1, stealEnd[k], 0.012);
    };

    /* sessions: a track playing from a row at a time */
    E.start = (name, t0, toSfx) => {
      const trk = getTrack(name);
      if (!trk) return null;
      const outs = {};
      for (const k of ['p1', 'p2', 'tri', 'noi']) { outs[k] = ctx.createGain(); outs[k].connect(toSfx ? E.sfxBus : E.steal[k]); }
      return { trk, row: 0, t: t0, pass: 0, outs, done: false };
    };
    E.run = (sess, until) => {
      const trk = sess.trk, rd = trk.rowDur;
      while (sess.t < until && !sess.done) {
        if (sess.row >= trk.len) {
          if (!trk.loop) { sess.done = true; break; }
          sess.row = trk.loopRow; sess.pass++;
        }
        const list = trk.byRow[sess.row];
        if (list) for (const [k, ev] of list) if (!(ev.wrap && !sess.pass)) play(sess, k, ev, sess.t);
        sess.row++; sess.t += rd;
      }
    };
    E.resync = (sess, t) => { if (sess.t < t) sess.t = t; };
    E.stop = (sess, t) => {
      sess.done = true;
      for (const k in sess.outs) {
        const g = sess.outs[k];
        g.gain.cancelScheduledValues(t);
        g.gain.setTargetAtTime(0, t, 0.015);
      }
      if (typeof setTimeout === 'function') setTimeout(() => { for (const k in sess.outs) try { sess.outs[k].disconnect(); } catch (e) { /* gone */ } }, 600);
    };

    function play(sess, k, ev, t) {
      const c = sess.trk.cfg[k], dur = ev.len * sess.trk.rowDur, out = sess.outs[k];
      if (k === 'noi') {
        const d = KIT[ev.d];
        noise(out, t, dur, Object.assign({}, d, { vol: (d.vol * c.vol) / 15, mix: MIX.noi }));
      } else if (k === 'tri') {
        tone(out, t, dur * (c.gate || 0.92), { tri: true, f: hz(ev.m), vol: 15, env: 'tri', mix: (MIX.tri * c.vol) / 15 });
      } else {
        tone(out, t, dur * (c.gate || 0.97), {
          duty: ev.duty === undefined ? c.duty : ev.duty, f: hz(ev.m), vol: ev.vol === undefined ? c.vol : ev.vol,
          env: ev.env || c.env, vib: c.vib, mix: MIX.pulse,
        });
      }
    }

    /* one-shots */
    E.sfx = (name, t) => {
      let def = SFX[name];
      if (def === undefined) return 0;
      if (typeof def === 'string') {
        const sess = E.start(def, t, true);
        if (!sess) return 0;
        const end = t + sess.trk.seconds;
        E.run(sess, end + 1);
        for (const k in E.steal) E.stealFor(k, t, end + 0.1);
        if (typeof setTimeout === 'function') setTimeout(() => { for (const k in sess.outs) try { sess.outs[k].disconnect(); } catch (e) { /* gone */ } }, (end - t + 1) * 1000);
        return end - t;
      }
      let steal = true;
      if (typeof def === 'function') def = def();
      else if (!Array.isArray(def)) { steal = def.steal !== false; def = def.parts; }
      let end = t;
      const stolen = {};
      for (const p of def) {
        const t0 = t + (p.t || 0);
        end = Math.max(end, t0 + p.d);
        const o = Object.assign({}, p, { vol: p.v === undefined ? 10 : p.v, mix: p.w === 'n' ? 0.8 : p.w === 't' ? 0.9 : 0.8 });
        if (p.f !== undefined) o.f = Array.isArray(p.f) ? p.f.map(toHz) : toHz(p.f);
        if (p.arp) o.arp = p.arp.map(toHz);
        if (p.w === 'n') noise(E.sfxBus, t0, p.d, o);
        else tone(E.sfxBus, t0, p.d, Object.assign(o, { tri: p.w === 't' }));
        const sk = { p: 'p2', t: 'tri', n: 'noi' }[p.w];
        if (steal && sk) stolen[sk] = Math.max(stolen[sk] || 0, t0 + p.d);
      }
      for (const k in stolen) E.stealFor(k, t, stolen[k] + 0.02);
      return end - t;
    };
    return E;
  }

  /* --------------------------------------------------------------- api */
  let ctx = null, eng = null, failed = false;
  let on = true, want = null, cur = null, curName = null, paused = false, timer = 0, sleepT = 0;
  const hidden = () => typeof document !== 'undefined' && document.hidden;

  function ensure() {
    if (ctx || failed) return !!ctx;
    try {
      const AC = G.AudioContext || G.webkitAudioContext;
      if (!AC) { failed = true; return false; }
      ctx = new AC();
      eng = makeEngine(ctx);
      eng.master.gain.value = on ? 1 : 0;
      if (!on && ctx.suspend) ctx.suspend().catch(() => {});
    } catch (e) {
      failed = true; ctx = null; eng = null;
    }
    return !!ctx;
  }

  function stopCur() {
    if (cur) eng.stop(cur, ctx.currentTime);
    cur = null; curName = null;
    clearTimeout(timer); timer = 0;
  }

  function startWanted() {
    if (!eng || !on) return;
    if (cur && curName === want) return;
    stopCur();
    if (!want) return;
    cur = eng.start(want, ctx.currentTime + 0.06, false);
    curName = cur ? want : null;
    pump();
  }

  function pump() {
    clearTimeout(timer); timer = 0;
    if (!cur || !eng || !on || paused || cur.done) return;
    try {
      const now = ctx.currentTime;
      eng.resync(cur, now + 0.03); // a throttled timer must not pile notes up in the past
      eng.run(cur, now + LOOKAHEAD);
    } catch (e) { /* keep quiet */ }
    if (cur && !cur.done) timer = setTimeout(pump, 25);
  }

  function resume() {
    if (ctx && on && ctx.state !== 'running' && !hidden()) {
      try { const p = ctx.resume(); if (p && p.catch) p.catch(() => {}); } catch (e) { /* ignore */ }
    }
  }

  GG.audio = {
    unlock() {
      try {
        if (!ensure()) return;
        resume();
        if (on && want && !cur) startWanted();
      } catch (e) { /* never throw */ }
    },
    setOn(v) {
      on = !!v;
      try {
        if (!ctx) return;
        const g = eng.master.gain, now = ctx.currentTime;
        g.cancelScheduledValues(now);
        g.setTargetAtTime(on ? 1 : 0, now, 0.02);
        clearTimeout(sleepT);
        if (!on) {
          stopCur();
          sleepT = setTimeout(() => { try { if (!on && ctx.state === 'running') ctx.suspend().catch(() => {}); } catch (e) { /* ignore */ } }, 250);
        } else { resume(); startWanted(); }
      } catch (e) { /* never throw */ }
    },
    music(name) {
      try {
        if (name == null) name = null;
        else if (!Object.prototype.hasOwnProperty.call(TRACKS, name)) return;
        want = name;
        if (!ctx) return;
        if (name === curName && cur) return;
        if (!name) { stopCur(); return; }
        startWanted();
      } catch (e) { /* never throw */ }
    },
    sfx(name) {
      try {
        if (!on || !ctx || !Object.prototype.hasOwnProperty.call(SFX, name)) return;
        resume();
        eng.sfx(name, ctx.currentTime + 0.005);
      } catch (e) { /* never throw */ }
    },
    pause(v) {
      try {
        paused = !!v;
        if (!eng) return;
        const g = eng.music.gain, now = ctx.currentTime;
        g.cancelScheduledValues(now);
        g.setTargetAtTime(paused ? 0 : MUSIC_VOL, now, 0.03);
        if (paused) { clearTimeout(timer); timer = 0; } else if (cur) { eng.resync(cur, now + 0.05); pump(); }
      } catch (e) { /* never throw */ }
    },
    // For tests and tools: render with any (Offline)AudioContext.
    _dev: {
      tracks: Object.keys(TRACKS), sfx: Object.keys(SFX),
      compile, engine: makeEngine, midi,
    },
  };

  if (typeof document !== 'undefined' && document.addEventListener) {
    document.addEventListener('visibilitychange', () => {
      try {
        if (!ctx) return;
        if (document.hidden) { if (ctx.state === 'running') ctx.suspend().catch(() => {}); }
        else if (on) { resume(); if (cur) { eng.resync(cur, ctx.currentTime + 0.05); pump(); } }
      } catch (e) { /* ignore */ }
    });
  }
})();
