/*
 * Runs the built NSF on the 6502 in cpu.ts and compares what the driver
 * tells the APU, frame by frame, with a model computed straight from the
 * songs (the same ops the encoder wrote). This catches driver and encoder
 * bugs exactly; nsf-check.ts then listens to the result with an
 * independent player.
 */
import { CPU } from './cpu.ts';
import { CHANS, type Chan, type Inst } from './tracks.ts';
import { LOAD, NOTE_BASE, SIN, driverGate, gateByte, pulsePeriod, vibratoOf, type Built, type Op, type SongBars } from './encode.ts';

export interface Frame { vol: number; duty: number; period: number; noise: number; on: boolean }

/* The APU state after each PLAY, as the driver left it. */
export function emulate(built: Built, song: number, frames: number): Frame[][] {
  const cpu = new CPU();
  cpu.mem.set(built.rom, LOAD);
  const reg = new Uint8Array(0x18);
  let triOn = false;
  cpu.onWrite = (a, v) => {
    reg[a - 0x4000] = v;
    if (a === 0x4008) triOn = v === 0xff;
  };
  cpu.a = song; cpu.x = 0;
  cpu.call(built.syms.get('INIT')!);
  const out: Frame[][] = [];
  for (let f = 0; f < frames; f++) {
    cpu.call(built.syms.get('PLAY')!);
    const pulse = (o: number): Frame => ({ vol: reg[o] & 15, duty: reg[o] & 0xc0, period: reg[o + 2] | ((reg[o + 3] & 7) << 8), noise: 0, on: (reg[o] & 15) > 0 });
    out.push([
      pulse(0), pulse(4),
      { vol: triOn ? 15 : 0, duty: 0, period: reg[0xa] | ((reg[0xb] & 7) << 8), noise: 0, on: triOn },
      { vol: reg[0xc] & 15, duty: 0, period: 0, noise: reg[0xe], on: (reg[0xc] & 15) > 0 },
    ]);
  }
  return out;
}

/* The same frames, from the ops: what the driver is meant to do. */
export function model(sb: SongBars, frames: number): Frame[][] {
  const song = sb.song;
  const out: Frame[][] = Array.from({ length: frames }, () => []);
  CHANS.forEach((ch: Chan, c) => {
    const pass1 = sb.pass1[ch].flat();
    const loopOps = song.loop ? (sb.pass2 ? sb.pass2[ch] : sb.pass1[ch]).slice(song.loopBar).flat() : [];
    let q = 0, list: Op[] = pass1, halted = false;
    const nextOp = (): Op | null => {
      if (q >= list.length) {
        if (!song.loop || !loopOps.length) return null;
        list = loopOps; q = 0;
      }
      return list[q++];
    };
    const gb = gateByte(song.gate[ch]);
    const vib = vibratoOf(song, ch);
    let wait = 1, vol = 0, rel = false, relCnt = 0, pos = 0, inst: Inst | null = null, per = 0, nper = 0;
    let vibDep = 0, vibDly = 0, vibPh = 0;
    for (let f = 0; f < frames; f++) {
      if (!halted && --wait === 0) {
        const op = nextOp();
        if (!op) { halted = true; vol = 0; }
        else {
          if (op.kind === 'note') {
            inst = op.inst;
            if (ch !== 'noi') {
              per = pulsePeriod(op.key + (ch === 'tri' ? 12 : 0));
              vibDep = vib.fac ? Math.floor((per * vib.fac) / 65536) & 0xff : 0;
              vibDly = vib.delay; vibPh = 0;
            }
            pos = 0; rel = false;
            relCnt = op.gate !== null ? op.gate : driverGate(op.span, gb);
          }
          wait = op.span;
        }
      }
      let off = 0;
      if (!halted && inst) {
        let releasing = rel;
        if (!rel) {
          if (relCnt === 0) { rel = true; releasing = true; }
          else {
            relCnt--;
            if (inst.noise) nper = inst.noise[pos];
            vol = inst.vols[pos];
            if (pos + 1 < inst.vols.length) pos++;
          }
        }
        if (releasing && vol) vol = ((vol * inst.rel) & 0xff) >> 4;
        if (ch === 'p1' || ch === 'p2') {
          if (vibDep) {
            if (vibDly) vibDly--;
            else {
              vibPh = (vibPh + vib.rate) & 0xff;
              const s = SIN[vibPh >> 2], v = ((Math.abs(s) * vibDep) >> 7) & 0xff;
              off = v && s < 0 ? -v : v;
            }
          }
        }
      }
      const on = vol > 0;
      out[f][c] = ch === 'noi'
        ? { vol, duty: 0, period: 0, noise: nper, on }
        : ch === 'tri'
          ? { vol: on ? 15 : 0, duty: 0, period: per, noise: 0, on }
          : { vol, duty: inst ? inst.duty & 0xc0 : 0, period: (per + off) & 0x7ff, noise: 0, on };
    }
  });
  return out;
}

/* Compare; returns the number of mismatching frames and the first few. */
export function compare(built: Built, song: number, frames: number): { bad: number; first: string[] } {
  const sb = built.songs[song];
  const got = emulate(built, song, frames), want = model(sb, frames);
  let bad = 0;
  const first: string[] = [];
  for (let f = 0; f < frames; f++) {
    for (let c = 0; c < 4; c++) {
      const g = got[f][c], w = want[f][c];
      const same = g.vol === w.vol && (!w.on || (g.duty === w.duty && g.period === w.period && g.noise === w.noise));
      if (!same) {
        bad++;
        if (first.length < 6) first.push(`frame ${f} ${CHANS[c]}: got ${JSON.stringify(g)} want ${JSON.stringify(w)}`);
      }
    }
  }
  return { bad, first };
}

export { NOTE_BASE };
