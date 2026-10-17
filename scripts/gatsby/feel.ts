/*
 * Frame data for GATSBY.EXE's heroes, measured with the game's own physics
 * (GG.heroStep in core.js), next to the same measurements of two references:
 *
 *   SMB1   Super Mario Bros., simulated byte for byte from the tables and
 *          routines in doppelganger's disassembly (SMBDIS.ASM: JumpMForceData,
 *          FallMForceData, PlayerYSpdData, MaxRight/LeftXSpdData, FrictionData,
 *          PlayerPhysicsSub, ImposeFriction, ImposeGravity, MovePlayerVertically).
 *   MM2    Mega Man 2, from TASVideos' published values: walk 1.375 px/frame,
 *          1.3125 in the air, gravity 0.25 px/frame/frame, jump speed 4.87
 *          (04.DF), fall speed capped at 12. Its jump-release behaviour isn't
 *          documented there, so only the full jump is modelled.
 *
 *   node scripts/gatsby/feel.ts            the table
 *   node scripts/gatsby/feel.ts --json     the numbers, for docs/gatsby/feel.md
 *   node scripts/gatsby/feel.ts --check    fail if a hero is off its targets
 *
 * Everything is at 60 frames a second; distances are pixels (a tile is 16).
 */
import { loadGame, type GG } from './lib/game.ts';

export interface Feel {
  topSpeed: number;        // px/frame
  accelFrames: number;     // standing start to top speed
  stopFrames: number;      // top speed to standstill, stick released
  stopDist: number;
  turnFrames: number;      // top speed to moving the other way, stick reversed
  jumpHigh: number;        // apex of a standing jump, button held (px)
  riseFrames: number;      // frames to that apex
  airFrames: number;       // standing jump, held: takeoff to landing
  jumpLow: number;         // apex of the shortest jump (one-frame tap)
  runJumpHigh: number;     // apex of a jump from top speed, held
  runJumpDist: number;     // horizontal distance of that jump, landing at takeoff height
  runAirFrames: number;
  fallCap: number;         // terminal falling speed, px/frame
  fallCapFrames: number;   // frames of free fall to reach it
  coyote?: number;         // frames after leaving a ledge that a jump still works
  buffer?: number;         // frames before landing that a jump press still counts
  wallSlide?: number;      // px/frame sliding down a wall
  wallKickHeight?: number; // height gained by one kick off a wall (px)
  wallKickOut?: number;    // px pushed away from the wall by the kick, before the stick can pull back
}

/* ------------------------------------------------------------ our heroes */
const FLOOR = 40;   // floor row of the test room

/* A long empty room with a floor, a ledge and a tall wall, for measuring. */
function room(GG: GG, opts: { ledgeAt?: number; wallAt?: number } = {}) {
  const w = 300, h = 48;
  const kind = new Uint8Array(w * h);
  for (let x = 0; x < w; x++) kind[FLOOR * w + x] = GG.K.SOLID;
  if (opts.ledgeAt !== undefined) for (let x = opts.ledgeAt; x < w; x++) kind[FLOOR * w + x] = GG.K.EMPTY;
  if (opts.wallAt !== undefined) for (let y = 0; y < FLOOR; y++) kind[y * w + opts.wallAt] = GG.K.SOLID;
  return { w, h, kind, terr: new Array(w * h).fill(null), roof: false, pw: w * 16, ph: h * 16 };
}

type Inp = { l?: number; r?: number; u?: number; d?: number; jump?: number; jumpHit?: number };

function hero(GG: GG, type: string, lv: ReturnType<typeof room>, tx = 10) {
  const h = GG.makeHero(type, tx * 16, (FLOOR - 1) * 16);
  // Settle onto the floor.
  for (let i = 0; i < 5; i++) GG.heroStep(h, {}, lv, [], {});
  return h;
}
const step = (GG: GG, h: any, lv: any, inp: Inp) => GG.heroStep(h, { l: 0, r: 0, u: 0, d: 0, jump: 0, jumpHit: 0, ...inp }, lv, [], {});

function runUp(GG: GG, h: any, lv: any) {
  for (let i = 0; i < 120; i++) step(GG, h, lv, { r: 1 });
}

/* A jump from the current state; returns apex height, frames to apex, airtime, distance. */
function jump(GG: GG, h: any, lv: any, holdFrames: number, right: boolean) {
  const y0 = h.y, x0 = h.x;
  let apex = 0, rise = 0, t = 0;
  step(GG, h, lv, { r: right ? 1 : 0, jump: 1, jumpHit: 1 });
  t++;
  while (t < 400) {
    step(GG, h, lv, { r: right ? 1 : 0, jump: t < holdFrames ? 1 : 0 });
    t++;
    if (y0 - h.y > apex) { apex = y0 - h.y; rise = t; }
    if (h.onGround) break;
  }
  return { apex, rise, air: t, dist: h.x - x0 };
}

export function measureHero(GG: GG, type: string): Feel {
  const s = GG.HEROES[type];
  let lv = room(GG), h = hero(GG, type, lv);
  // Acceleration.
  let accelFrames = 0;
  while (h.vx < s.run * 0.99 && accelFrames < 200) { step(GG, h, lv, { r: 1 }); accelFrames++; }
  runUp(GG, h, lv);
  const topSpeed = h.vx;
  // Stopping.
  let stopFrames = 0; const sx = h.x;
  while (h.vx > 0.001 && stopFrames < 200) { step(GG, h, lv, {}); stopFrames++; }
  const stopDist = h.x - sx;
  // Turning.
  lv = room(GG); h = hero(GG, type, lv); runUp(GG, h, lv);
  let turnFrames = 0;
  while (h.vx > -0.001 && turnFrames < 200) { step(GG, h, lv, { l: 1 }); turnFrames++; }
  // Standing jumps.
  lv = room(GG); h = hero(GG, type, lv);
  const high = jump(GG, h, lv, 999, false);
  for (let i = 0; i < 30; i++) step(GG, h, lv, {});
  const low = jump(GG, h, lv, 1, false);
  // Running jump.
  lv = room(GG); h = hero(GG, type, lv); runUp(GG, h, lv);
  const run = jump(GG, h, lv, 999, true);
  // Falling.
  lv = room(GG, { ledgeAt: 12 }); h = hero(GG, type, lv, 11);
  h.y -= 0; let fallCapFrames = 0, fallCap = 0;
  for (let i = 0; i < 20; i++) step(GG, h, lv, { r: 1 });
  while (!h.onGround && fallCapFrames < 300) {
    step(GG, h, lv, {});
    fallCapFrames++;
    if (h.vy > fallCap + 1e-9) fallCap = h.vy; else if (fallCap > 0) break;
  }
  const out: Feel = {
    topSpeed, accelFrames, stopFrames, stopDist, turnFrames,
    jumpHigh: high.apex, riseFrames: high.rise, airFrames: high.air, jumpLow: low.apex,
    runJumpHigh: run.apex, runJumpDist: run.dist, runAirFrames: run.air,
    fallCap, fallCapFrames,
  };
  out.coyote = coyote(GG, type);
  out.buffer = buffer(GG, type);
  if (s.wall) Object.assign(out, wall(GG, type));
  return out;
}

/* Walk off a ledge, press jump k frames after the feet leave it: largest k that still jumps. */
function coyote(GG: GG, type: string): number {
  let best = 0;
  for (let k = 0; k < 20; k++) {
    const lv = room(GG, { ledgeAt: 14 }), h = hero(GG, type, lv, 12);
    let left = -1, jumped = false;
    for (let t = 0; t < 200 && !jumped; t++) {
      const off = !h.onGround && left < 0;
      if (off) left = t;
      const press = left >= 0 && t - left === k;
      const ev = step(GG, h, lv, { r: 1, jump: press ? 1 : 0, jumpHit: press ? 1 : 0 });
      if (ev.includes('jump')) jumped = true;
      if (left >= 0 && t - left > k + 2) break;
    }
    if (jumped) best = k; else break;
  }
  return best;
}

/* Drop from a height and press jump k frames before landing: largest k that still jumps. */
function buffer(GG: GG, type: string): number {
  let best = 0;
  for (let k = 1; k < 20; k++) {
    // Find when he'd land, then press k frames earlier.
    const probe = () => { const lv = room(GG); const h = hero(GG, type, lv); h.y -= 64; h.onGround = false; return { lv, h }; };
    let { lv, h } = probe();
    let land = 0;
    while (!h.onGround && land < 200) { step(GG, h, lv, {}); land++; }
    ({ lv, h } = probe());
    let jumped = false;
    for (let t = 0; t < land + 10; t++) {
      const press = t === land - k;
      const ev = step(GG, h, lv, { jump: press ? 1 : 0, jumpHit: press ? 1 : 0 });
      if (ev.includes('jump')) jumped = true;
    }
    if (jumped) best = k; else break;
  }
  return best;
}

/* Jump at a wall, slide, kick off it. */
function wall(GG: GG, type: string) {
  const lv = room(GG, { wallAt: 20 }), h = hero(GG, type, lv, 17);
  // Run at the wall and jump into it; hold toward it until sliding.
  for (let i = 0; i < 20; i++) step(GG, h, lv, { r: 1 });
  step(GG, h, lv, { r: 1, jump: 1, jumpHit: 1 });
  let slide = 0, t = 0;
  while (t++ < 200) {
    step(GG, h, lv, { r: 1, jump: 1 });
    if (h.sliding) { for (let i = 0; i < 30 && !h.onGround; i++) { step(GG, h, lv, { r: 1 }); slide = h.vy; } break; }
  }
  // Kick: press jump while sliding, keep holding toward the wall.
  const y0 = h.y, x0 = h.x;
  step(GG, h, lv, { r: 1, jump: 1, jumpHit: 1 });
  let top = 0, out = 0;
  for (let i = 0; i < 80 && !h.onGround; i++) {
    step(GG, h, lv, { r: 1, jump: 1 });
    top = Math.max(top, y0 - h.y);
    out = Math.max(out, x0 - h.x);
  }
  return { wallSlide: slide, wallKickHeight: top, wallKickOut: out };
}

/* ------------------------------------------------------------- SMB1 model */
const JumpMForceData = [0x20, 0x20, 0x1e, 0x28, 0x28];
const FallMForceData = [0x70, 0x70, 0x60, 0x90, 0x90];
const PlayerYSpdData = [-4, -4, -4, -5, -5];
const MaxRightXSpdData = [0x28, 0x18, 0x10];
const FrictionData = [0xe4, 0x98, 0xd0];
const s8 = (v: number) => ((v & 0xff) ^ 0x80) - 0x80;

interface SmbIn { r?: boolean; l?: boolean; a?: boolean; b?: boolean }
function smb() {
  const m = {
    x: 0, xSpeed: 0, xForce: 0, y: 0, ySpeed: 0, yForce: 0, yDummy: 0,
    state: 0, ground: 0, prevA: false, origin: 0, vForce: 0, vForceDown: 0,
    facing: 1, moving: 1, runTimer: 0, runSpeed: 0,
    maxR: 0x18, maxL: -0x18, fricLo: 0, fricHi: 0,
  };
  const abs = () => Math.abs(m.xSpeed);
  function physics(inp: SmbIn) {
    const lr = (inp.r ? 1 : 0) | (inp.l ? 2 : 0);
    // CheckForJumping / ProcJumping / InitJS
    if (inp.a && !m.prevA && m.state === 0) {
      m.yDummy = 0; m.yForce = 0; m.origin = m.y; m.state = 1;
      const v = abs();
      const y = v < 0x09 ? 0 : v < 0x10 ? 1 : v < 0x19 ? 2 : v < 0x1c ? 3 : 4;
      m.vForce = JumpMForceData[y]; m.vForceDown = FallMForceData[y]; m.ySpeed = PlayerYSpdData[y];
    }
    // X_Physics
    let y = 0, z = 0, jump = false;
    if (m.state !== 0) {
      if (abs() >= 0x19) jump = true;
    } else {
      if (lr === m.moving && inp.b) { m.runTimer = 0x0a; jump = true; }
      else if (lr === m.moving && m.runTimer) jump = true;
    }
    if (!jump) { y = 1; z = 1; if (m.runSpeed || abs() >= 0x21) z = 2; }
    m.maxR = MaxRightXSpdData[y]; m.maxL = -MaxRightXSpdData[y];
    m.fricLo = FrictionData[z]; m.fricHi = 0;
    if (m.facing !== m.moving) { m.fricLo <<= 1; if (m.fricLo > 0xff) { m.fricLo &= 0xff; m.fricHi = 1; } }
    return lr;
  }
  function friction(lr: number) {
    let dir = 0;
    if (lr & 3) dir = lr & 1 ? 1 : -1;
    else if (m.xSpeed === 0) return;
    else dir = m.xSpeed > 0 ? -1 : 1;
    if (dir > 0) {
      const f = m.xForce + m.fricLo; m.xForce = f & 0xff;
      m.xSpeed = s8(m.xSpeed + m.fricHi + (f >> 8));
      if (m.xSpeed >= m.maxR) m.xSpeed = m.maxR;
    } else {
      const f = m.xForce - m.fricLo; m.xForce = f & 0xff;
      m.xSpeed = s8(m.xSpeed - m.fricHi - (f < 0 ? 1 : 0));
      if (m.xSpeed <= m.maxL) m.xSpeed = m.maxL;
    }
  }
  function moveX() {
    const lo = (m.xSpeed << 4) & 0xff;
    let hi = (m.xSpeed & 0xff) >> 4; if (hi >= 8) hi -= 16;
    const f = m.xForce + lo; m.xForce = f & 0xff;
    m.x += hi + (f >> 8);
  }
  function gravity(force: number) {
    const d = m.yDummy + m.yForce; m.yDummy = d & 0xff;
    m.y += m.ySpeed + (d >> 8);
    const f = m.yForce + force; m.yForce = f & 0xff;
    m.ySpeed = s8(m.ySpeed + (f >> 8));
    if (m.ySpeed >= 4 && m.yForce >= 0x80) { m.ySpeed = 4; m.yForce = 0; }
  }
  function frame(inp: SmbIn) {
    if (m.runTimer > 0) m.runTimer--;
    m.moving = m.xSpeed === 0 ? m.moving : m.xSpeed > 0 ? 1 : 2;
    const lr = physics(inp);
    if (m.state === 0) {
      // GetPlayerAnimSpeed: run speed flag and the quick turnaround.
      if (abs() >= 0x1c) m.runSpeed = abs();
      else if (lr && lr === m.moving) m.runSpeed = 0;
      else if (lr && lr !== m.moving && abs() < 0x0b) { m.moving = m.facing; m.xSpeed = 0; m.xForce = 0; }
      if (lr) m.facing = lr;
      friction(lr);
      moveX();
    } else {
      if (m.state === 1) {
        if (m.ySpeed >= 0) m.vForce = m.vForceDown;
        else if (!(inp.a && m.prevA) && m.origin - m.y >= 1) m.vForce = m.vForceDown;
      } else m.vForce = m.vForceDown;
      if (lr) friction(lr);
      moveX();
      gravity(m.vForce);
      if (m.y >= m.ground && m.ySpeed >= 0) { m.y = m.ground; m.ySpeed = 0; m.yForce = 0; m.state = 0; }
    }
    m.prevA = !!inp.a;
  }
  return { m, frame };
}

export function measureSmb(run: boolean): Feel {
  const b = run;
  let s = smb();
  let accelFrames = 0;
  const top = run ? 0x28 : 0x18;
  while (s.m.xSpeed < top && accelFrames < 400) { s.frame({ r: true, b }); accelFrames++; }
  for (let i = 0; i < 60; i++) s.frame({ r: true, b });
  const topSpeed = s.m.xSpeed / 16;
  let stopFrames = 0; const sx = s.m.x;
  while (s.m.xSpeed > 0 && stopFrames < 400) { s.frame({}); stopFrames++; }
  const stopDist = s.m.x - sx;
  s = smb();
  for (let i = 0; i < 160; i++) s.frame({ r: true, b });
  let turnFrames = 0;
  while (s.m.xSpeed >= 0 && turnFrames < 400) { s.frame({ l: true, b }); turnFrames++; }
  const jumpFrom = (moving: boolean, hold: number) => {
    const t0 = smb();
    if (moving) for (let i = 0; i < 160; i++) t0.frame({ r: true, b });
    const x0 = t0.m.x;
    let apex = 0, rise = 0, t = 0;
    t0.frame({ r: moving, b, a: true }); t++;
    while (t < 400) {
      t0.frame({ r: moving, b, a: t < hold });
      t++;
      if (-t0.m.y > apex) { apex = -t0.m.y; rise = t; }
      if (t0.m.state === 0) break;
    }
    return { apex, rise, air: t, dist: t0.m.x - x0 };
  };
  const high = jumpFrom(false, 999), low = jumpFrom(false, 1), runj = jumpFrom(true, 999);
  // Free fall: walk off a ledge (state 2) from standstill.
  s = smb(); s.m.state = 2; s.m.vForceDown = FallMForceData[0]; s.m.ground = 9999;
  let fallCapFrames = 0, fallCap = 0;
  while (fallCapFrames < 200) {
    s.frame({}); fallCapFrames++;
    const v = s.m.ySpeed + s.m.yForce / 256;
    if (v > fallCap + 1e-9) fallCap = v; else break;
  }
  return {
    topSpeed, accelFrames, stopFrames, stopDist, turnFrames,
    jumpHigh: high.apex, riseFrames: high.rise, airFrames: high.air, jumpLow: low.apex,
    runJumpHigh: runj.apex, runJumpDist: runj.dist, runAirFrames: runj.air,
    fallCap, fallCapFrames, coyote: 0, buffer: 0,
  };
}

/* -------------------------------------------------------------- MM2 model */
export function measureMm2(): Feel {
  const g = 0.25, v0 = 4 + 0xdf / 256, cap = 12, walk = 1.375, air = 1.3125;
  let y = 0, vy = -v0, t = 0, apex = 0, rise = 0;
  while (t < 400) {
    y += vy; vy = Math.min(cap, vy + g); t++;
    if (-y > apex) { apex = -y; rise = t; }
    if (y >= 0 && t > 1) break;
  }
  let fv = 0, ff = 0;
  while (fv < cap) { fv = Math.min(cap, fv + g); ff++; }
  return {
    topSpeed: walk, accelFrames: 0, stopFrames: 0, stopDist: 0, turnFrames: 0,
    jumpHigh: apex, riseFrames: rise, airFrames: t, jumpLow: NaN,
    runJumpHigh: apex, runJumpDist: air * t, runAirFrames: t,
    fallCap: cap, fallCapFrames: ff,
  };
}

/* ---------------------------------------------------------------- targets */
/*
 * What each hero is tuned to (see docs/gatsby/feel.md for why). [min, max].
 * Nick has Super Mario's shape: momentum, a floaty held rise, a fall three
 * and a half times as heavy. The Gatz heroes have Mega Man's: no slide, an
 * even arc, steady air speed, plus the wall-kick.
 */
export const TARGETS: Record<string, Partial<Record<keyof Feel, [number, number]>>> = {
  nick: {
    topSpeed: [1.5, 1.65], accelFrames: [18, 30], stopFrames: [10, 20], turnFrames: [6, 14],
    jumpHigh: [50, 58], riseFrames: [26, 32], jumpLow: [14, 22],
    runJumpHigh: [56, 62], runJumpDist: [72, 92],
    fallCap: [4.4, 4.6], coyote: [4, 6], buffer: [4, 6],
  },
  gatz: {
    topSpeed: [1.7, 1.8], accelFrames: [0, 4], stopFrames: [0, 4], turnFrames: [0, 6],
    jumpHigh: [54, 60], riseFrames: [19, 23], jumpLow: [10, 20],
    runJumpHigh: [54, 60], runJumpDist: [64, 84],
    fallCap: [5.5, 6.5], coyote: [4, 6], buffer: [4, 6],
    wallSlide: [1.0, 1.4], wallKickHeight: [24, 48],
  },
};
const targetFor = (type: string) => (type === 'nick' ? TARGETS.nick : TARGETS.gatz);

/* ------------------------------------------------------------------- main */
const COLS: [keyof Feel, string][] = [
  ['topSpeed', 'top speed'], ['accelFrames', 'frames to top'], ['stopFrames', 'frames to stop'], ['stopDist', 'stop slide px'],
  ['turnFrames', 'frames to turn'], ['jumpHigh', 'jump px (held)'], ['riseFrames', 'rise frames'], ['airFrames', 'air frames'],
  ['jumpLow', 'jump px (tap)'], ['runJumpHigh', 'run-jump px'], ['runJumpDist', 'run-jump dist px'], ['runAirFrames', 'run air frames'],
  ['fallCap', 'fall cap px/f'], ['fallCapFrames', 'frames to cap'], ['coyote', 'coyote frames'], ['buffer', 'buffer frames'],
  ['wallSlide', 'wall slide px/f'], ['wallKickHeight', 'kick height px'], ['wallKickOut', 'kick push px'],
];

export function allFeel() {
  const GG = loadGame(['core.js']);
  return {
    nick: measureHero(GG, 'nick'),
    gatsby: measureHero(GG, 'gatsby'),
    'SMB1 walk': measureSmb(false),
    'SMB1 run (B)': measureSmb(true),
    MM2: measureMm2(),
  } as Record<string, Feel>;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const data = allFeel();
  const argv = process.argv.slice(2);
  if (argv.includes('--json')) { console.log(JSON.stringify(data, null, 2)); process.exit(0); }
  const names = Object.keys(data);
  const fmt = (v: number | undefined) => (v === undefined || Number.isNaN(v) ? '—' : Number.isInteger(v) ? String(v) : v.toFixed(2));
  const rows = [['', ...names], ...COLS.map(([k, label]) => [label, ...names.map((n) => fmt(data[n][k]))])];
  const w = rows[0].map((_, i) => Math.max(...rows.map((r) => r[i].length)));
  console.log(rows.map((r) => r.map((c, i) => (i ? c.padStart(w[i]) : c.padEnd(w[i]))).join('  ')).join('\n'));
  if (argv.includes('--check')) {
    const bad: string[] = [];
    for (const type of ['nick', 'gatsby']) {
      const t = targetFor(type);
      for (const [k, [lo, hi]] of Object.entries(t) as [keyof Feel, [number, number]][]) {
        const v = data[type][k] as number;
        if (!(v >= lo - 1e-6 && v <= hi + 1e-6)) bad.push(`${type}.${k} = ${fmt(v)}, target ${lo}..${hi}`);
      }
    }
    console.log(bad.length ? '\nOFF TARGET:\n  ' + bad.join('\n  ') : '\nAll heroes on target.');
    process.exit(bad.length ? 1 : 0);
  }
}
