/*
 * A minimal 6502 for testing the NSF driver in node: official opcodes only,
 * no decimal mode, no interrupts. Writes to $4000-$4017 are reported so a
 * test can rebuild what the APU was told, frame by frame.
 */
import { OPS, type Mode } from './asm.ts';

const DECODE: Array<{ op: string; mode: Mode } | undefined> = [];
for (const [op, modes] of Object.entries(OPS)) for (const [mode, code] of Object.entries(modes)) DECODE[code!] = { op, mode: mode as Mode };

export class CPU {
  mem = new Uint8Array(0x10000);
  a = 0; x = 0; y = 0; s = 0xfd; pc = 0;
  c = 0; z = 0; n = 0; v = 0; i = 1; d = 0;
  cycles = 0;
  onWrite: ((addr: number, v: number) => void) | null = null;

  read(a: number): number { return this.mem[a & 0xffff]; }
  write(a: number, v: number): void {
    a &= 0xffff; v &= 0xff;
    if (a >= 0x4000 && a <= 0x4017) { if (this.onWrite) this.onWrite(a, v); return; }
    if (a >= 0x8000) throw new Error(`write to ROM $${a.toString(16)} at pc $${this.pc.toString(16)}`);
    this.mem[a] = v;
  }
  private push(v: number) { this.mem[0x100 + this.s] = v & 0xff; this.s = (this.s - 1) & 0xff; }
  private pull(): number { this.s = (this.s + 1) & 0xff; return this.mem[0x100 + this.s]; }
  private nz(v: number): number { v &= 0xff; this.z = v === 0 ? 1 : 0; this.n = v >> 7; return v; }
  private flags(): number { return (this.n << 7) | (this.v << 6) | 0x20 | (this.d << 3) | (this.i << 2) | (this.z << 1) | this.c; }
  private setFlags(p: number) { this.n = (p >> 7) & 1; this.v = (p >> 6) & 1; this.d = (p >> 3) & 1; this.i = (p >> 2) & 1; this.z = (p >> 1) & 1; this.c = p & 1; }

  /* Call a subroutine and run until it returns (with a step budget). */
  call(addr: number, budget = 200000): void {
    // Return address 0xfffe-1: an RTS to $ffff stops the run.
    this.push(0xff); this.push(0xfe);
    this.pc = addr;
    for (let k = 0; k < budget; k++) {
      if (this.pc === 0xffff) return;
      this.step();
    }
    throw new Error(`routine at $${addr.toString(16)} did not return`);
  }

  private addr(mode: Mode): number {
    const pc = this.pc;
    const b1 = this.read(pc), w = b1 | (this.read(pc + 1) << 8);
    switch (mode) {
      case 'imm': this.pc += 1; return pc;
      case 'zp': this.pc += 1; return b1;
      case 'zpx': this.pc += 1; return (b1 + this.x) & 0xff;
      case 'zpy': this.pc += 1; return (b1 + this.y) & 0xff;
      case 'abs': this.pc += 2; return w;
      case 'abx': this.pc += 2; return (w + this.x) & 0xffff;
      case 'aby': this.pc += 2; return (w + this.y) & 0xffff;
      case 'ind': { this.pc += 2; const lo = this.read(w), hi = this.read((w & 0xff00) | ((w + 1) & 0xff)); return lo | (hi << 8); }
      case 'izx': { this.pc += 1; const p = (b1 + this.x) & 0xff; return this.read(p) | (this.read((p + 1) & 0xff) << 8); }
      case 'izy': { this.pc += 1; const base = this.read(b1) | (this.read((b1 + 1) & 0xff) << 8); return (base + this.y) & 0xffff; }
      case 'rel': { this.pc += 1; return (pc + 1 + ((b1 << 24) >> 24)) & 0xffff; }
      default: return 0;
    }
  }

  step(): void {
    const code = this.read(this.pc);
    const dec = DECODE[code];
    if (!dec) throw new Error(`bad opcode $${code.toString(16)} at $${this.pc.toString(16)}`);
    this.pc = (this.pc + 1) & 0xffff;
    this.cycles += 3;
    const { op, mode } = dec;
    const ea = mode === 'imp' || mode === 'acc' ? 0 : this.addr(mode);
    const load = () => (mode === 'acc' ? this.a : this.read(ea));
    const store = (v: number) => { if (mode === 'acc') this.a = v & 0xff; else this.write(ea, v); };
    const branch = (cond: boolean) => { if (cond) this.pc = ea; };
    const cmp = (r: number) => { const m = this.read(ea); this.c = r >= m ? 1 : 0; this.nz(r - m); };
    switch (op) {
      case 'ADC': { const m = this.read(ea), r = this.a + m + this.c; this.v = (~(this.a ^ m) & (this.a ^ r) & 0x80) ? 1 : 0; this.c = r > 0xff ? 1 : 0; this.a = this.nz(r); break; }
      case 'SBC': { const m = this.read(ea) ^ 0xff, r = this.a + m + this.c; this.v = (~(this.a ^ m) & (this.a ^ r) & 0x80) ? 1 : 0; this.c = r > 0xff ? 1 : 0; this.a = this.nz(r); break; }
      case 'AND': this.a = this.nz(this.a & this.read(ea)); break;
      case 'ORA': this.a = this.nz(this.a | this.read(ea)); break;
      case 'EOR': this.a = this.nz(this.a ^ this.read(ea)); break;
      case 'ASL': { const m = load(); this.c = m >> 7; store(this.nz(m << 1)); break; }
      case 'LSR': { const m = load(); this.c = m & 1; store(this.nz(m >> 1)); break; }
      case 'ROL': { const m = load(), r = (m << 1) | this.c; this.c = m >> 7; store(this.nz(r)); break; }
      case 'ROR': { const m = load(), r = (m >> 1) | (this.c << 7); this.c = m & 1; store(this.nz(r)); break; }
      case 'BIT': { const m = this.read(ea); this.z = (this.a & m) === 0 ? 1 : 0; this.n = m >> 7; this.v = (m >> 6) & 1; break; }
      case 'BCC': branch(!this.c); break; case 'BCS': branch(!!this.c); break;
      case 'BEQ': branch(!!this.z); break; case 'BNE': branch(!this.z); break;
      case 'BMI': branch(!!this.n); break; case 'BPL': branch(!this.n); break;
      case 'BVC': branch(!this.v); break; case 'BVS': branch(!!this.v); break;
      case 'CLC': this.c = 0; break; case 'SEC': this.c = 1; break;
      case 'CLD': this.d = 0; break; case 'SED': this.d = 1; break;
      case 'CLI': this.i = 0; break; case 'SEI': this.i = 1; break;
      case 'CLV': this.v = 0; break;
      case 'CMP': cmp(this.a); break; case 'CPX': cmp(this.x); break; case 'CPY': cmp(this.y); break;
      case 'DEC': this.write(ea, this.nz(this.read(ea) - 1)); break;
      case 'INC': this.write(ea, this.nz(this.read(ea) + 1)); break;
      case 'DEX': this.x = this.nz(this.x - 1); break; case 'DEY': this.y = this.nz(this.y - 1); break;
      case 'INX': this.x = this.nz(this.x + 1); break; case 'INY': this.y = this.nz(this.y + 1); break;
      case 'JMP': this.pc = ea; break;
      case 'JSR': { const ret = (this.pc - 1) & 0xffff; this.push(ret >> 8); this.push(ret); this.pc = ea; break; }
      case 'RTS': { const lo = this.pull(), hi = this.pull(); this.pc = (((hi << 8) | lo) + 1) & 0xffff; break; }
      case 'RTI': { this.setFlags(this.pull()); const lo = this.pull(), hi = this.pull(); this.pc = (hi << 8) | lo; break; }
      case 'LDA': this.a = this.nz(this.read(ea)); break;
      case 'LDX': this.x = this.nz(this.read(ea)); break;
      case 'LDY': this.y = this.nz(this.read(ea)); break;
      case 'STA': this.write(ea, this.a); break;
      case 'STX': this.write(ea, this.x); break;
      case 'STY': this.write(ea, this.y); break;
      case 'TAX': this.x = this.nz(this.a); break; case 'TAY': this.y = this.nz(this.a); break;
      case 'TXA': this.a = this.nz(this.x); break; case 'TYA': this.a = this.nz(this.y); break;
      case 'TSX': this.x = this.nz(this.s); break; case 'TXS': this.s = this.x; break;
      case 'PHA': this.push(this.a); break; case 'PLA': this.a = this.nz(this.pull()); break;
      case 'PHP': this.push(this.flags() | 0x10); break; case 'PLP': this.setFlags(this.pull()); break;
      case 'NOP': break;
      case 'BRK': throw new Error(`BRK at $${((this.pc - 1) & 0xffff).toString(16)}`);
      default: throw new Error(`unimplemented ${op}`);
    }
  }
}
