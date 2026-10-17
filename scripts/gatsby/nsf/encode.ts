/*
 * Songs -> bytes: each channel's notes become ops (a note or a wait, each
 * lasting a number of frames), split at bar lines into one chunk per bar.
 * Identical chunks are stored once, so repeated drum bars, bass figures and
 * arpeggios cost two bytes each in the order list. Then the driver is
 * assembled in front of the data and the whole thing gets an NSF header.
 */
import { assemble } from './asm.ts';
import { DRIVER, DRIVER_TABLES } from './driver.ts';
import { CHANS, CPU_HZ, FRAME_US, instruments, loadSongs, type Chan, type Inst, type Song } from './tracks.ts';

export const LOAD = 0x8000;
export const NOTE_BASE = 21;      // period table index 0 is MIDI 21 (A0)
export const PERIODS = 112;       // MIDI 21..132
export const OP = { WAIT: 0x70, DUR: 0x71, INST: 0x72, GATE: 0x73, END: 0x74 } as const;

export interface Op { kind: 'note' | 'wait'; span: number; key: number; inst: Inst | null; gate: number | null }
export interface SongBars { song: Song; pass1: Record<Chan, Op[][]>; pass2: Record<Chan, Op[][]> | null }

export const gateByte = (frac: number) => Math.min(255, Math.round(frac * 256));
/* What the driver computes for a note that isn't split: dur * gate / 256, at least 1. */
export const driverGate = (span: number, gb: number) => Math.max(1, (span * gb) >> 8);

export function pulsePeriod(midi: number): number {
  const f = 440 * Math.pow(2, (midi - 69) / 12);
  return Math.max(8, Math.min(0x7ff, Math.round(CPU_HZ / (16 * f)) - 1));
}

export interface Vibrato { rate: number; delay: number; fac: number }
export function vibratoOf(song: Song, ch: Chan): Vibrato {
  const v = song.vib[ch];
  if (!v) return { rate: 0, delay: 0, fac: 0 };
  return {
    rate: Math.round((v.rate / 60) * 256) & 0xff,
    delay: Math.min(255, Math.round(v.delay * 60)),
    fac: Math.round((Math.pow(2, v.depth / 1200) - 1) * 65536),
  };
}

export const SIN = Array.from({ length: 64 }, (_, i) => Math.round(127 * Math.sin((2 * Math.PI * i) / 64)));

/* A channel's ops for the whole song, split into bars. */
function barsOf(song: Song, ch: Chan, withWrap: boolean): Op[][] {
  const total = song.bars * song.barFrames;
  const notes = song.chans[ch].filter((n) => withWrap || !n.wrap).slice().sort((a, b) => a.frame - b.frame);
  // One voice: of two notes at the same moment the later one wins.
  const mono = notes.filter((n, i) => !(notes[i + 1] && notes[i + 1].frame === n.frame));
  const gb = gateByte(song.gate[ch]);
  const ops: Array<Op & { at: number }> = [];
  let t = 0;
  mono.forEach((n, i) => {
    const next = i + 1 < mono.length ? mono[i + 1].frame : total;
    if (n.frame > t) ops.push({ at: t, kind: 'wait', span: n.frame - t, key: 0, inst: null, gate: null });
    const span = Math.min(n.frames, next - n.frame);
    if (span <= 0) return;
    ops.push({ at: n.frame, kind: 'note', span, key: n.key, inst: n.inst, gate: null });
    t = n.frame + span;
    if (t < next) { ops.push({ at: t, kind: 'wait', span: next - t, key: 0, inst: null, gate: null }); t = next; }
  });
  if (t < total) ops.push({ at: t, kind: 'wait', span: total - t, key: 0, inst: null, gate: null });

  const bars: Op[][] = Array.from({ length: song.bars }, () => []);
  for (const op of ops) {
    let at = op.at, left = op.span, first = true;
    while (left > 0) {
      const b = Math.floor(at / song.barFrames), end = (b + 1) * song.barFrames;
      const piece = Math.min(left, end - at);
      if (first) {
        const split = piece < op.span && op.kind === 'note';
        // A note carried over a bar line: say when it lets go, counted from its start.
        bars[b].push({ ...op, span: piece, gate: split ? Math.min(255, driverGate(op.span, gb)) : null });
      } else bars[b].push({ kind: 'wait', span: piece, key: 0, inst: null, gate: null });
      at += piece; left -= piece; first = false;
    }
  }
  for (const [b, bar] of bars.entries()) {
    const sum = bar.reduce((s, o) => s + o.span, 0);
    if (sum !== song.barFrames) throw new Error(`${song.name}/${ch}: bar ${b} is ${sum} frames, not ${song.barFrames}`);
    for (const o of bar) if (o.span > 255) throw new Error(`${song.name}/${ch}: an op of ${o.span} frames`);
  }
  return bars;
}

export function songBars(song: Song): SongBars {
  const pass1 = {} as Record<Chan, Op[][]>;
  for (const ch of CHANS) pass1[ch] = barsOf(song, ch, false);
  const wraps = CHANS.some((ch) => song.chans[ch].some((n) => n.wrap));
  let pass2: Record<Chan, Op[][]> | null = null;
  if (wraps && song.loop) {
    pass2 = {} as Record<Chan, Op[][]>;
    for (const ch of CHANS) pass2[ch] = barsOf(song, ch, true);
  }
  return { song, pass1, pass2 };
}

function noteByte(ch: Chan, op: Op, instIndex: Map<Inst, number>): number {
  if (ch === 'noi') return instIndex.get(op.inst!)!;
  const i = op.key - NOTE_BASE + (ch === 'tri' ? 12 : 0);
  if (i < 0 || i >= PERIODS) throw new Error(`note ${op.key} out of the period table on ${ch}`);
  return i;
}

function chunkBytes(ch: Chan, bar: Op[], instIndex: Map<Inst, number>): number[] {
  const out: number[] = [];
  let dur = -1, ins = -1;
  for (const op of bar) {
    if (op.kind === 'note' && ch !== 'noi') {
      const i = instIndex.get(op.inst!)!;
      if (i !== ins) { out.push(OP.INST, i); ins = i; }
    }
    if (op.span !== dur) { out.push(OP.DUR, op.span); dur = op.span; }
    if (op.kind === 'note') {
      if (op.gate !== null) out.push(OP.GATE, op.gate);
      out.push(noteByte(ch, op, instIndex));
    } else out.push(OP.WAIT);
  }
  out.push(OP.END);
  return out;
}

export interface Built {
  rom: Uint8Array;           // the 6502 image loaded at LOAD
  nsf: Uint8Array;           // header + image
  syms: Map<string, number>;
  songs: SongBars[];
  insts: Inst[];
  stats: { driver: number; data: number; chunks: number; chunkBytes: number; chunkRefs: number; orderBytes: number; seqBytes: number };
}

export function build(songs: Song[] = loadSongs()): Built {
  const bars = songs.map(songBars);
  const insts = instruments();
  if (insts.length >= OP.WAIT) throw new Error(`too many instruments (${insts.length})`);
  const instIndex = new Map(insts.map((i, k) => [i, k]));

  // Chunks, deduplicated across every song.
  const chunkIds = new Map<string, number>();
  const chunks: number[][] = [];
  let refs = 0;
  const chunkOf = (ch: Chan, bar: Op[]) => {
    const bytes = chunkBytes(ch, bar, instIndex);
    const k = bytes.join(',');
    let id = chunkIds.get(k);
    if (id === undefined) { id = chunks.length; chunks.push(bytes); chunkIds.set(k, id); }
    refs++;
    return id;
  };
  // Order lists: chunk ids, then a loop target (an index into the same list) or -1.
  const orders: Array<{ ids: number[]; loop: number }> = [];
  for (const sb of bars) {
    for (const ch of CHANS) {
      const ids = sb.pass1[ch].map((bar) => chunkOf(ch, bar));
      let loop = -1;
      if (sb.song.loop) {
        loop = sb.song.loopBar;
        if (sb.pass2) {
          loop = ids.length;
          for (let b = sb.song.loopBar; b < sb.song.bars; b++) ids.push(chunkOf(ch, sb.pass2[ch][b]));
        }
      }
      orders.push({ ids, loop });
    }
  }

  // Assemble once with stand-in addresses to learn the driver's size.
  const stand = Object.fromEntries(DRIVER_TABLES.map((n) => [n, 0x8000]));
  const driverSize = assemble(DRIVER, LOAD, stand).bytes.length;
  const base = LOAD + driverSize;

  // Lay out the data.
  const S = songs.length, N = insts.length;
  let off = 0;
  const at: Record<string, number> = {};
  const place = (name: string, size: number) => { at[name] = base + off; off += size; };
  place('perTabLo', PERIODS); place('perTabHi', PERIODS); place('sinTab', 64);
  for (const n of ['instDuty', 'instRel', 'instVolLo', 'instVolHi', 'instNoiLo', 'instNoiHi']) place(n, N);
  for (const n of ['songOrdLo', 'songOrdHi', 'songGate', 'songVibRate', 'songVibDelay', 'songVibFacLo', 'songVibFacHi']) place(n, S * 4);
  const seqStart = off;
  const volAt: number[] = [], noiAt: number[] = [];
  for (const i of insts) { volAt.push(base + off); off += i.vols.length + 1; noiAt.push(i.noise ? base + off : 0); if (i.noise) off += i.noise.length; }
  const seqBytes = off - seqStart;
  const chunkAt: number[] = [];
  let chunkTotal = 0;
  for (const c of chunks) { chunkAt.push(base + off); off += c.length; chunkTotal += c.length; }
  const orderAt: number[] = [];
  let orderBytes = 0;
  for (const o of orders) { orderAt.push(base + off); const n = (o.ids.length + 2) * 2; off += n; orderBytes += n; }
  const dataSize = off;
  if (LOAD + driverSize + dataSize > 0x10000) throw new Error(`NSF image is ${driverSize + dataSize} bytes; it must fit in 32 KB`);

  const data = new Uint8Array(dataSize);
  const put = (addr: number, v: number) => { data[addr - base] = v & 0xff; };
  const word = (addr: number, v: number) => { put(addr, v); put(addr + 1, v >> 8); };
  for (let i = 0; i < PERIODS; i++) { const p = pulsePeriod(NOTE_BASE + i); put(at.perTabLo + i, p); put(at.perTabHi + i, p >> 8); }
  SIN.forEach((v, i) => put(at.sinTab + i, v));
  insts.forEach((ins, k) => {
    put(at.instDuty + k, ins.duty); put(at.instRel + k, ins.rel);
    put(at.instVolLo + k, volAt[k]); put(at.instVolHi + k, volAt[k] >> 8);
    put(at.instNoiLo + k, noiAt[k]); put(at.instNoiHi + k, noiAt[k] >> 8);
    ins.vols.forEach((v, j) => put(volAt[k] + j, v));
    put(volAt[k] + ins.vols.length, 0xff);
    if (ins.noise) ins.noise.forEach((v, j) => put(noiAt[k] + j, v));
  });
  bars.forEach((sb, s) => {
    CHANS.forEach((ch, c) => {
      const i = s * 4 + c, o = orderAt[i], vib = vibratoOf(sb.song, ch);
      put(at.songOrdLo + i, o); put(at.songOrdHi + i, o >> 8);
      put(at.songGate + i, gateByte(sb.song.gate[ch]));
      put(at.songVibRate + i, vib.rate); put(at.songVibDelay + i, vib.delay);
      put(at.songVibFacLo + i, vib.fac); put(at.songVibFacHi + i, vib.fac >> 8);
    });
  });
  chunks.forEach((c, k) => c.forEach((v, j) => put(chunkAt[k] + j, v)));
  orders.forEach((o, k) => {
    o.ids.forEach((id, j) => word(orderAt[k] + j * 2, chunkAt[id]));
    const end = orderAt[k] + o.ids.length * 2;
    word(end, 0);
    word(end + 2, o.loop < 0 ? 0 : orderAt[k] + o.loop * 2);
  });

  const { bytes: code, syms } = assemble(DRIVER, LOAD, at);
  if (code.length !== driverSize) throw new Error('driver size changed between passes');
  const rom = new Uint8Array(driverSize + dataSize);
  rom.set(code, 0); rom.set(data, driverSize);

  const nsf = nsfFile(rom, songs.length, syms.get('INIT')!, syms.get('PLAY')!);
  return {
    rom, nsf, syms, songs: bars, insts,
    stats: { driver: driverSize, data: dataSize, chunks: chunks.length, chunkBytes: chunkTotal, chunkRefs: refs, orderBytes, seqBytes },
  };
}

export const NSF_META = { title: 'GATSBY.EXE', artist: 'funkie.dev', copyright: '2026 funkie.dev' };

/* The 128-byte NSF (version 1) header in front of the image. */
export function nsfFile(rom: Uint8Array, songs: number, init: number, play: number): Uint8Array {
  const h = new Uint8Array(128);
  const str = (o: number, s: string) => { for (let i = 0; i < Math.min(31, s.length); i++) h[o + i] = s.charCodeAt(i) & 0x7f; };
  h.set([0x4e, 0x45, 0x53, 0x4d, 0x1a], 0);   // "NESM" EOF
  h[5] = 1;                                   // version
  h[6] = songs;
  h[7] = 1;                                   // first song (1-based)
  h[8] = LOAD & 0xff; h[9] = LOAD >> 8;
  h[10] = init & 0xff; h[11] = init >> 8;
  h[12] = play & 0xff; h[13] = play >> 8;
  str(14, NSF_META.title); str(46, NSF_META.artist); str(78, NSF_META.copyright);
  h[110] = FRAME_US & 0xff; h[111] = FRAME_US >> 8; // NTSC play speed (16639 us)
  // 112-119: no bankswitching.
  h[120] = 19997 & 0xff; h[121] = 19997 >> 8;       // PAL speed, unused (NTSC only)
  h[122] = 0;                                        // NTSC
  h[123] = 0;                                        // no expansion audio
  const out = new Uint8Array(128 + rom.length);
  out.set(h, 0); out.set(rom, 128);
  return out;
}
