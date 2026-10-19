/*
 * The music, read from the game itself: audio.js is loaded in a sandbox and
 * its own compiler turns each track into events. This module turns those
 * events into what a 2A03 driver plays: per-channel notes timed in frames,
 * each with an instrument (duty, a volume envelope stepped once a frame,
 * and for drums a noise-period sweep).
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { GAME_DIR } from '../lib/game.ts';

/* The NSF plays at the NTSC rate: 16639 microseconds a frame. */
export const FRAME_US = 16639;
export const FRAME_S = FRAME_US / 1e6;
export const CPU_HZ = 1789773;

export interface Env { a?: number; d?: number; s?: number; r?: number; swell?: boolean }
export interface Drum { idx: number; short?: boolean; vol: number; env: Env; rate?: number[]; rateT?: number }
export interface Vib { rate: number; depth: number; delay: number }
export interface ChanCfg { duty?: number; vol?: number; env?: string; vib?: Vib; gate?: number; style?: string }
export interface Ev { row: number; len: number; m?: number; d?: string; duty?: number; vol?: number; env?: string; wrap?: boolean }
export interface Compiled {
  name: string; bar: number; len: number; loopRow: number; rowDur: number; loop: boolean;
  cfg: { p1: ChanCfg; p2: ChanCfg; tri: ChanCfg; noi: { vol: number } };
  byRow: Array<Array<[Chan, Ev]> | undefined>;
}
export interface AudioDev {
  tracks: string[]; jingles: string[];
  compile(name: string): Compiled;
  env: Record<string, Env>; kit: Record<string, Drum>; noisePeriods: number[];
}

export type Chan = 'p1' | 'p2' | 'tri' | 'noi';
export const CHANS: Chan[] = ['p1', 'p2', 'tri', 'noi'];

export function loadAudio(): AudioDev {
  const ctx: Record<string, unknown> = { console, Math, Object, Array, JSON, Number, String, Error, Float32Array, Map, Set };
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(GAME_DIR, 'audio.js'), 'utf8'), ctx, { filename: 'audio.js' });
  const GG = ctx.GG as { audio: { _dev: AudioDev } };
  return GG.audio._dev;
}

/*
 * An instrument, as the driver sees it: a duty byte for $4000/$4004, a volume
 * per frame until it holds steady (the last value repeats), the release
 * multiplier (volume = volume * rel / 16 each frame once the note lets go),
 * and for noise a $400E value per frame alongside the volumes.
 */
export interface Inst { key: string; kind: 'pulse' | 'tri' | 'noise'; duty: number; vols: number[]; noise?: number[]; rel: number }

export interface Note {
  frame: number;      // start, in frames from the start of the song
  frames: number;     // how long it sounds before the next event may take over
  gateFrames: number; // when it lets go (start of release), from its start
  key: number;        // MIDI note (pulse/triangle) or 0 for noise
  inst: Inst;
  wrap: boolean;      // only on loop passes after the first (the echo's tail)
}

export interface Song {
  name: string;
  kind: 'track' | 'jingle';
  bpm: number;
  bar: number;            // rows per bar
  bars: number;
  barFrames: number;      // every bar is the same number of frames (a groove)
  rowFrame: (row: number) => number;
  loop: boolean;
  loopBar: number;
  chans: Record<Chan, Note[]>;
  gate: Record<Chan, number>; // fraction of a note's length before it lets go
  vib: Partial<Record<Chan, Vib>>;
  collisions: number;    // events dropped because two started on one channel at once
}

/* ---------------------------------------------------------- envelopes */
/* The browser synth's envelope, sampled the way it samples it (once per 1/60 s). */
export function envelope(e: Env, vol: number, dur: number): number[] {
  const a = e.swell ? dur * 0.45 : e.a || 0;
  const d = e.swell ? dur * 0.55 : e.d || 0;
  const s = e.swell ? 0 : e.s === undefined ? 1 : e.s;
  const out: number[] = [];
  const frames = Math.max(1, Math.ceil(dur * 60));
  for (let k = 0; k < Math.max(frames, Math.ceil((a + d) * 60) + 1); k++) {
    const x = k / 60;
    const lv = x < a ? Math.min(1, (x + 1 / 60) / a) : d > 0 ? Math.max(s, 1 - ((1 - s) * (x - a)) / d) : s;
    out.push(Math.round(lv * vol));
    if (x >= a + d) break;
  }
  // Trim a steady tail to one value (the driver holds the last entry).
  while (out.length > 1 && out[out.length - 1] === out[out.length - 2]) out.pop();
  return out;
}

/* setTargetAtTime(0, t, r/3) per 1/60 s, as a 4-bit multiplier. */
export function releaseMul(r: number | undefined): number {
  const f = Math.exp(-1 / (20 * (r || 0.03)));
  return Math.max(0, Math.min(15, Math.round(16 * f)));
}

const instCache = new Map<string, Inst>();
function inst(key: string, make: () => Omit<Inst, 'key'>): Inst {
  let i = instCache.get(key);
  if (!i) { i = Object.assign({ key }, make()); instCache.set(key, i); }
  return i;
}

function pulseInst(dev: AudioDev, duty: number, vol: number, envName: string): Inst {
  return inst(`pulse:${duty}:${vol}:${envName}`, () => {
    const e = dev.env[envName];
    if (!e) throw new Error(`no envelope ${envName}`);
    return { kind: 'pulse', duty: ((duty & 3) << 6) | 0x30, vols: envelope(e, vol, 0), rel: releaseMul(e.r) };
  });
}

function triInst(): Inst {
  // The triangle has no volume: on at the note, off at its release.
  return inst('tri', () => ({ kind: 'tri', duty: 0, vols: [15], rel: 0 }));
}

/* A drum: its envelope, plus its pitch sweep mapped onto the 16 noise periods. */
function drumInst(dev: AudioDev, d: string, noiVol: number, durS: number): Inst {
  const kit = dev.kit[d];
  if (!kit) throw new Error(`no drum ${d}`);
  const swell = !!kit.env.swell;
  const vol = (kit.vol * noiVol) / 15;
  return inst(`noise:${d}:${noiVol}${swell ? ':' + Math.round(durS * 60) : ''}`, () => {
    const vols = envelope(kit.env, vol, durS);
    const P = dev.noisePeriods;
    const noise: number[] = [];
    for (let k = 0; k < vols.length; k++) {
      let rate = 1;
      if (kit.rate) {
        const rt = Math.min(durS, kit.rateT || durS), n = kit.rate.length - 1, x = k / 60;
        if (x >= rt) rate = kit.rate[n];
        else {
          const seg = Math.min(n - 1, Math.floor((x / rt) * n)), t0 = (rt * seg) / n, t1 = (rt * (seg + 1)) / n;
          rate = kit.rate[seg] * Math.pow(kit.rate[seg + 1] / kit.rate[seg], (x - t0) / (t1 - t0));
        }
      }
      // Faster playback of the same noise is a shorter period: pick the nearest.
      const want = P[kit.idx] / rate;
      let best = 0;
      for (let i = 1; i < 16; i++) if (Math.abs(Math.log(P[i] / want)) < Math.abs(Math.log(P[best] / want))) best = i;
      noise.push((kit.short ? 0x80 : 0) | best);
    }
    return { kind: 'noise', duty: 0x30, vols, noise, rel: releaseMul(kit.env.r) };
  });
}

/* ------------------------------------------------------------- songs */
export function loadSongs(dev: AudioDev = loadAudio()): Song[] {
  const out: Song[] = [];
  for (const name of dev.tracks) out.push(songOf(dev, name, 'track'));
  for (const name of dev.jingles) out.push(songOf(dev, name, 'jingle'));
  return out;
}

function songOf(dev: AudioDev, name: string, kind: 'track' | 'jingle'): Song {
  const trk = dev.compile(name);
  const bpm = Math.round(15 / trk.rowDur);
  const bar = trk.bar;
  const bars = trk.len / bar;
  if (bars !== Math.floor(bars)) throw new Error(`${name}: ${trk.len} rows is not whole bars`);
  // A groove: each bar lasts the same whole number of frames and its rows are
  // spread across it, so identical bars encode identically.
  const barFrames = Math.round((bar * trk.rowDur) / FRAME_S);
  const rowFrame = (row: number) => Math.floor(row / bar) * barFrames + Math.round(((row % bar) * barFrames) / bar);
  const cfg = trk.cfg;
  const gate: Record<Chan, number> = { p1: cfg.p1.gate || 0.97, p2: cfg.p2.gate || 0.97, tri: cfg.tri.gate || 0.92, noi: 1 };
  const chans: Record<Chan, Note[]> = { p1: [], p2: [], tri: [], noi: [] };
  let collisions = 0;
  for (let row = 0; row < trk.len; row++) {
    const list = trk.byRow[row];
    if (!list) continue;
    for (const [k, ev] of list) {
      const frame = rowFrame(row), frames = rowFrame(row + ev.len) - frame;
      const durS = ev.len * trk.rowDur;
      let ins: Inst, key = 0;
      if (k === 'noi') ins = drumInst(dev, ev.d!, cfg.noi.vol, durS);
      else if (k === 'tri') { ins = triInst(); key = ev.m!; }
      else {
        const c = cfg[k];
        ins = pulseInst(dev, ev.duty ?? c.duty ?? 2, ev.vol ?? c.vol ?? 10, ev.env || c.env || 'lead');
        key = ev.m!;
      }
      const note: Note = { frame, frames, gateFrames: Math.max(1, Math.round(frames * gate[k])), key, inst: ins, wrap: !!ev.wrap };
      const ch = chans[k];
      // One voice per channel: a second event at the same moment replaces the first,
      // unless one of the two only sounds on later passes.
      const prev = ch[ch.length - 1];
      if (prev && prev.frame === frame && prev.wrap === note.wrap) { ch[ch.length - 1] = note; collisions++; }
      else ch.push(note);
    }
  }
  const vib: Partial<Record<Chan, Vib>> = {};
  if (cfg.p1.vib) vib.p1 = cfg.p1.vib;
  if (cfg.p2.vib) vib.p2 = cfg.p2.vib;
  return {
    name, kind, bpm, bar, bars, barFrames, rowFrame, loop: trk.loop, loopBar: trk.loopRow / bar,
    chans, gate, vib, collisions,
  };
}

export function instruments(): Inst[] { return [...instCache.values()]; }
