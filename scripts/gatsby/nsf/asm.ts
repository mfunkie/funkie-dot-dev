/*
 * A small two-pass 6502 assembler, enough for the NSF sound driver: the
 * official opcodes, labels, `name = value` constants, `.byte`/`.word`, and
 * expressions with + - * / << >> & |, `<x` (low byte) and `>x` (high byte).
 *
 * Zero page vs absolute: an operand uses zero page only if its value is
 * already known on the first pass (a constant defined above it) and fits in
 * a byte, so instruction sizes never change between passes.
 */

export type Mode = 'imp' | 'acc' | 'imm' | 'zp' | 'zpx' | 'zpy' | 'abs' | 'abx' | 'aby' | 'ind' | 'izx' | 'izy' | 'rel';

/* mnemonic -> mode -> opcode (official NMOS 6502 set) */
export const OPS: Record<string, Partial<Record<Mode, number>>> = {
  ADC: { imm: 0x69, zp: 0x65, zpx: 0x75, abs: 0x6d, abx: 0x7d, aby: 0x79, izx: 0x61, izy: 0x71 },
  AND: { imm: 0x29, zp: 0x25, zpx: 0x35, abs: 0x2d, abx: 0x3d, aby: 0x39, izx: 0x21, izy: 0x31 },
  ASL: { acc: 0x0a, zp: 0x06, zpx: 0x16, abs: 0x0e, abx: 0x1e },
  BCC: { rel: 0x90 }, BCS: { rel: 0xb0 }, BEQ: { rel: 0xf0 }, BMI: { rel: 0x30 },
  BNE: { rel: 0xd0 }, BPL: { rel: 0x10 }, BVC: { rel: 0x50 }, BVS: { rel: 0x70 },
  BIT: { zp: 0x24, abs: 0x2c },
  BRK: { imp: 0x00 },
  CLC: { imp: 0x18 }, CLD: { imp: 0xd8 }, CLI: { imp: 0x58 }, CLV: { imp: 0xb8 },
  CMP: { imm: 0xc9, zp: 0xc5, zpx: 0xd5, abs: 0xcd, abx: 0xdd, aby: 0xd9, izx: 0xc1, izy: 0xd1 },
  CPX: { imm: 0xe0, zp: 0xe4, abs: 0xec },
  CPY: { imm: 0xc0, zp: 0xc4, abs: 0xcc },
  DEC: { zp: 0xc6, zpx: 0xd6, abs: 0xce, abx: 0xde },
  DEX: { imp: 0xca }, DEY: { imp: 0x88 },
  EOR: { imm: 0x49, zp: 0x45, zpx: 0x55, abs: 0x4d, abx: 0x5d, aby: 0x59, izx: 0x41, izy: 0x51 },
  INC: { zp: 0xe6, zpx: 0xf6, abs: 0xee, abx: 0xfe },
  INX: { imp: 0xe8 }, INY: { imp: 0xc8 },
  JMP: { abs: 0x4c, ind: 0x6c },
  JSR: { abs: 0x20 },
  LDA: { imm: 0xa9, zp: 0xa5, zpx: 0xb5, abs: 0xad, abx: 0xbd, aby: 0xb9, izx: 0xa1, izy: 0xb1 },
  LDX: { imm: 0xa2, zp: 0xa6, zpy: 0xb6, abs: 0xae, aby: 0xbe },
  LDY: { imm: 0xa0, zp: 0xa4, zpx: 0xb4, abs: 0xac, abx: 0xbc },
  LSR: { acc: 0x4a, zp: 0x46, zpx: 0x56, abs: 0x4e, abx: 0x5e },
  NOP: { imp: 0xea },
  ORA: { imm: 0x09, zp: 0x05, zpx: 0x15, abs: 0x0d, abx: 0x1d, aby: 0x19, izx: 0x01, izy: 0x11 },
  PHA: { imp: 0x48 }, PHP: { imp: 0x08 }, PLA: { imp: 0x68 }, PLP: { imp: 0x28 },
  ROL: { acc: 0x2a, zp: 0x26, zpx: 0x36, abs: 0x2e, abx: 0x3e },
  ROR: { acc: 0x6a, zp: 0x66, zpx: 0x76, abs: 0x6e, abx: 0x7e },
  RTI: { imp: 0x40 }, RTS: { imp: 0x60 },
  SBC: { imm: 0xe9, zp: 0xe5, zpx: 0xf5, abs: 0xed, abx: 0xfd, aby: 0xf9, izx: 0xe1, izy: 0xf1 },
  SEC: { imp: 0x38 }, SED: { imp: 0xf8 }, SEI: { imp: 0x78 },
  STA: { zp: 0x85, zpx: 0x95, abs: 0x8d, abx: 0x9d, aby: 0x99, izx: 0x81, izy: 0x91 },
  STX: { zp: 0x86, zpy: 0x96, abs: 0x8e },
  STY: { zp: 0x84, zpx: 0x94, abs: 0x8c },
  TAX: { imp: 0xaa }, TAY: { imp: 0xa8 }, TSX: { imp: 0xba }, TXA: { imp: 0x8a }, TXS: { imp: 0x9a }, TYA: { imp: 0x98 },
};

export const SIZE: Record<Mode, number> = {
  imp: 1, acc: 1, imm: 2, zp: 2, zpx: 2, zpy: 2, abs: 3, abx: 3, aby: 3, ind: 3, izx: 2, izy: 2, rel: 2,
};

type Syms = Map<string, number>;

/* Evaluate an expression; returns undefined if it names a symbol not yet known. */
function evaluate(src: string, syms: Syms, where: string): number | undefined {
  const toks = src.match(/\$[0-9a-fA-F]+|%[01]+|\d+|[A-Za-z_.][\w.]*|<<|>>|[-+*/&|()<>]/g);
  if (!toks || toks.join('') !== src.replace(/\s+/g, '')) throw new Error(`${where}: can't parse "${src}"`);
  let i = 0;
  let unknown = false;
  const atom = (): number => {
    const t = toks[i++];
    if (t === undefined) throw new Error(`${where}: unexpected end of "${src}"`);
    if (t === '(') { const v = expr(); if (toks[i++] !== ')') throw new Error(`${where}: missing ) in "${src}"`); return v; }
    if (t === '<') return atom() & 0xff;
    if (t === '>') return (atom() >> 8) & 0xff;
    if (t === '-') return -atom();
    if (t[0] === '$') return parseInt(t.slice(1), 16);
    if (t[0] === '%') return parseInt(t.slice(1), 2);
    if (/^\d/.test(t)) return parseInt(t, 10);
    const v = syms.get(t);
    if (v === undefined) { unknown = true; return 0; }
    return v;
  };
  const term = (): number => {
    let v = atom();
    while (toks[i] === '*' || toks[i] === '/') { const op = toks[i++]; const r = atom(); v = op === '*' ? v * r : Math.floor(v / r); }
    return v;
  };
  const sum = (): number => {
    let v = term();
    while (toks[i] === '+' || toks[i] === '-') { const op = toks[i++]; const r = term(); v = op === '+' ? v + r : v - r; }
    return v;
  };
  const shift = (): number => {
    let v = sum();
    while (toks[i] === '<<' || toks[i] === '>>') { const op = toks[i++]; const r = sum(); v = op === '<<' ? v << r : v >> r; }
    return v;
  };
  const expr = (): number => {
    let v = shift();
    while (toks[i] === '&' || toks[i] === '|') { const op = toks[i++]; const r = shift(); v = op === '&' ? v & r : v | r; }
    return v;
  };
  const v = expr();
  if (i !== toks.length) throw new Error(`${where}: trailing tokens in "${src}"`);
  return unknown ? undefined : v;
}

interface Line { n: number; label?: string; op?: string; arg: string; mode?: Mode; size: number; addr: number }

/*
 * Assemble `source` at `org`. `extern` supplies symbols defined outside the
 * source (data tables built in TS). Returns the bytes and the symbol table.
 */
export function assemble(source: string, org: number, extern: Record<string, number> = {}): { bytes: Uint8Array; syms: Syms } {
  const syms: Syms = new Map(Object.entries(extern));
  const lines: Line[] = [];
  source.split('\n').forEach((raw, n) => {
    const text = raw.replace(/;.*$/, '').trim();
    if (!text) return;
    const L: Line = { n: n + 1, arg: '', size: 0, addr: 0 };
    let rest = text;
    const lab = /^([A-Za-z_.][\w.]*):\s*(.*)$/.exec(rest);
    if (lab) { L.label = lab[1]; rest = lab[2]; }
    const eq = /^([A-Za-z_][\w.]*)\s*=\s*(.+)$/.exec(rest);
    if (eq) { L.op = '='; L.label = eq[1]; L.arg = eq[2]; lines.push(L); return; }
    if (rest) {
      const m = /^(\.?[A-Za-z]+)\s*(.*)$/.exec(rest);
      if (!m) throw new Error(`line ${n + 1}: can't parse "${raw}"`);
      L.op = m[1].toUpperCase(); L.arg = m[2].trim();
    }
    lines.push(L);
  });

  // Pass 1: sizes and addresses.
  let pc = org;
  for (const L of lines) {
    const where = `line ${L.n}`;
    if (L.op === '=') {
      const v = evaluate(L.arg, syms, where);
      if (v === undefined) throw new Error(`${where}: constant ${L.label} must be defined from known values`);
      syms.set(L.label!, v);
      continue;
    }
    if (L.label) { if (syms.has(L.label) && !(L.label in extern)) throw new Error(`${where}: ${L.label} defined twice`); syms.set(L.label, pc); }
    L.addr = pc;
    if (!L.op) continue;
    if (L.op === '.BYTE') L.size = L.arg.split(',').length;
    else if (L.op === '.WORD') L.size = L.arg.split(',').length * 2;
    else {
      const modes = OPS[L.op];
      if (!modes) throw new Error(`${where}: unknown op ${L.op}`);
      L.mode = pickMode(L.op, L.arg, modes, syms, where);
      L.size = SIZE[L.mode];
    }
    pc += L.size;
  }

  // Pass 2: bytes.
  const out: number[] = [];
  for (const L of lines) {
    if (!L.op || L.op === '=') continue;
    const where = `line ${L.n} (${L.op} ${L.arg})`;
    const val = (s: string): number => {
      const v = evaluate(s, syms, where);
      if (v === undefined) throw new Error(`${where}: undefined symbol in "${s}"`);
      return v;
    };
    if (L.op === '.BYTE') { for (const a of L.arg.split(',')) { const v = val(a.trim()); if (v < -128 || v > 255) throw new Error(`${where}: byte out of range`); out.push(v & 0xff); } continue; }
    if (L.op === '.WORD') { for (const a of L.arg.split(',')) { const v = val(a.trim()); out.push(v & 0xff, (v >> 8) & 0xff); } continue; }
    const mode = L.mode!;
    out.push(OPS[L.op][mode]!);
    const inner = operand(L.arg, mode);
    if (mode === 'imp' || mode === 'acc') continue;
    const v = val(inner);
    if (mode === 'rel') {
      const d = v - (L.addr + 2);
      if (d < -128 || d > 127) throw new Error(`${where}: branch out of range (${d})`);
      out.push(d & 0xff);
    } else if (SIZE[mode] === 2) {
      if (v < -128 || v > 255) throw new Error(`${where}: operand ${v} doesn't fit a byte`);
      out.push(v & 0xff);
    } else out.push(v & 0xff, (v >> 8) & 0xff);
  }
  return { bytes: Uint8Array.from(out), syms };
}

/* The inner expression of an operand, given its addressing mode. */
function operand(arg: string, mode: Mode): string {
  switch (mode) {
    case 'imm': return arg.slice(1);
    case 'zpx': case 'abx': case 'zpy': case 'aby': return arg.replace(/,\s*[xyXY]$/, '');
    case 'ind': return arg.slice(1, -1);
    case 'izx': return arg.replace(/^\(\s*/, '').replace(/,\s*[xX]\s*\)$/, '');
    case 'izy': return arg.replace(/^\(\s*/, '').replace(/\s*\)\s*,\s*[yY]$/, '');
    default: return arg;
  }
}

function pickMode(op: string, arg: string, modes: Partial<Record<Mode, number>>, syms: Syms, where: string): Mode {
  const has = (m: Mode) => modes[m] !== undefined;
  const fail = (): never => { throw new Error(`${where}: ${op} can't take "${arg}"`); };
  if (!arg || /^a$/i.test(arg)) return has('acc') ? 'acc' : has('imp') ? 'imp' : fail();
  if (has('rel')) return 'rel';
  if (arg[0] === '#') return has('imm') ? 'imm' : fail();
  if (/^\(.*,\s*[xX]\s*\)$/.test(arg)) return has('izx') ? 'izx' : fail();
  if (/^\(.*\)\s*,\s*[yY]$/.test(arg)) return has('izy') ? 'izy' : fail();
  if (/^\(.*\)$/.test(arg)) return has('ind') ? 'ind' : fail();
  const idx = /,\s*([xyXY])$/.exec(arg);
  const inner = operand(arg, idx ? (idx[1].toLowerCase() === 'x' ? 'abx' : 'aby') : 'abs');
  const v = evaluate(inner, syms, where);
  const zp = v !== undefined && v >= 0 && v < 0x100;
  if (idx) {
    const r = idx[1].toLowerCase();
    if (r === 'x') return zp && has('zpx') ? 'zpx' : has('abx') ? 'abx' : fail();
    return zp && has('zpy') ? 'zpy' : has('aby') ? 'aby' : fail();
  }
  return zp && has('zp') ? 'zp' : has('abs') ? 'abs' : fail();
}
