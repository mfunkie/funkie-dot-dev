/*
 * Listens to GATSBY.EXE's NSF with an independent player and checks that it
 * plays the notes audio.js wrote.
 *
 *   node scripts/gatsby/nsf-check.ts [--wav <dir>] [--nsf <file>]
 *
 * ffmpeg's libgme demuxer (Game_Music_Emu, the emulator inside most NSF
 * players) renders each song. For every melody note (pulse 1) and long bass
 * note (triangle) of the song's first pass, the audio is measured at the
 * note's pitch and at the semitones around it (Goertzel, Hann window, first
 * four harmonics). A note passes when its own pitch is the strongest. As a
 * control, the same audio is scored against the melody moved up a semitone:
 * a working check must score that far lower.
 *
 * Also checks the NSF header, that each render isn't silent or clipped, and
 * that libgme reports the right number of tracks. Exits 1 on any failure.
 * Needs ffmpeg built with libgme (Debian and Ubuntu's ffmpeg is).
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { GAME_DIR } from './lib/game.ts';
import { loadSongs, FRAME_S, FRAME_US, type Song, type Note } from './nsf/tracks.ts';
import { LOAD, NSF_META } from './nsf/encode.ts';

const args = process.argv.slice(2);
const argOf = (k: string) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : undefined; };
const NSF = argOf('--nsf') || path.join(GAME_DIR, 'gatsby-exe.nsf');
const WAV_DIR = argOf('--wav');
const RATE = 44100;
const MAX_SECONDS = 26;

const THRESH = { melody: 0.85, bass: 0.75, controlGap: 0.4 };

let failures = 0;
const fail = (msg: string) => { failures++; console.log('  FAIL ' + msg); };

/* ------------------------------------------------------------ header */
const bytes = fs.readFileSync(NSF);
const songs = loadSongs();
{
  console.log(`NSF ${path.relative(process.cwd(), NSF)} (${bytes.length} bytes)`);
  const u16 = (o: number) => bytes[o] | (bytes[o + 1] << 8);
  const str = (o: number) => { let s = ''; for (let i = o; i < o + 32 && bytes[i]; i++) s += String.fromCharCode(bytes[i]); return s; };
  const magic = bytes.subarray(0, 5).toString('latin1');
  if (magic !== 'NESM\x1a') fail(`magic is ${JSON.stringify(magic)}`);
  if (bytes[5] !== 1) fail(`version ${bytes[5]}, expected 1`);
  if (bytes[6] !== songs.length) fail(`${bytes[6]} songs in the header, audio.js has ${songs.length}`);
  if (bytes[7] !== 1) fail(`starting song ${bytes[7]}`);
  if (u16(8) !== LOAD) fail(`load address $${u16(8).toString(16)}`);
  const init = u16(10), play = u16(12);
  if (init < LOAD || init >= LOAD + bytes.length - 128 || play < LOAD || play >= LOAD + bytes.length - 128) fail('init/play outside the image');
  if (str(14) !== NSF_META.title || str(46) !== NSF_META.artist || str(78) !== NSF_META.copyright) fail('title/artist/copyright fields');
  if (u16(110) !== FRAME_US) fail(`NTSC speed ${u16(110)}, expected ${FRAME_US}`);
  if (bytes.subarray(112, 120).some((b) => b !== 0)) fail('bankswitch bytes set');
  if (bytes[122] !== 0 || bytes[123] !== 0) fail('not plain NTSC 2A03');
  if (bytes.length - 128 > 0x8000) fail('image larger than 32 KB');
  console.log(`  header: ${songs.length} songs, load $${u16(8).toString(16)}, init $${init.toString(16)}, play $${play.toString(16)}, ${u16(110)} us/frame`);
}
{
  // libgme's own reading of it (ffprobe reports on stderr).
  const r = spawnSync('ffprobe', ['-hide_banner', '-i', NSF], { encoding: 'utf8' });
  if (r.error) { console.error('ffprobe/ffmpeg not found: install ffmpeg (built with libgme)'); process.exit(1); }
  const info = String(r.stderr) + String(r.stdout);
  const tracks = /tracks\s*:\s*(\d+)/.exec(info);
  const game = /game\s*:\s*(.+)/.exec(info);
  if (!tracks || +tracks[1] !== songs.length) fail(`libgme sees ${tracks ? tracks[1] : 'no'} tracks`);
  if (!game || game[1].trim() !== NSF_META.title) fail(`libgme reads the title as ${game ? game[1] : 'nothing'}`);
  console.log(`  libgme: "${game ? game[1].trim() : '?'}", ${tracks ? tracks[1] : '?'} tracks`);
}

/* ------------------------------------------------------------ render */
function render(track: number, seconds: number): Float32Array {
  const pcm = execFileSync('ffmpeg', [
    '-hide_banner', '-loglevel', 'error', '-track_index', String(track), '-i', NSF,
    '-t', seconds.toFixed(3), '-ac', '1', '-ar', String(RATE), '-f', 's16le', '-',
  ], { maxBuffer: 1 << 28 });
  const n = Math.floor(pcm.length / 2);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = pcm.readInt16LE(i * 2) / 32768;
  if (WAV_DIR) writeWav(path.join(WAV_DIR, `${String(track + 1).padStart(2, '0')}-${songs[track].name}.wav`), pcm);
  return out;
}

function writeWav(file: string, pcm: Buffer) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + pcm.length, 4); h.write('WAVE', 8); h.write('fmt ', 12);
  h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22); h.writeUInt32LE(RATE, 24);
  h.writeUInt32LE(RATE * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34); h.write('data', 36); h.writeUInt32LE(pcm.length, 40);
  fs.writeFileSync(file, Buffer.concat([h, pcm]));
}

/* ------------------------------------------------------------ pitch */
const hz = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

/* Power at one frequency over x[start, start+n), Hann-windowed (Goertzel). */
function power(x: Float32Array, start: number, n: number, f: number): number {
  if (f >= RATE / 2) return 0;
  const w = (2 * Math.PI * f) / RATE, coeff = 2 * Math.cos(w);
  let s1 = 0, s2 = 0;
  for (let i = 0; i < n; i++) {
    const win = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (n - 1));
    const s = x[start + i] * win + coeff * s1 - s2;
    s2 = s1; s1 = s;
  }
  return s1 * s1 + s2 * s2 - coeff * s1 * s2;
}
const HARM = [1, 0.5, 0.33, 0.25];
function salience(x: Float32Array, start: number, n: number, m: number): number {
  let s = 0;
  HARM.forEach((w, h) => { s += w * Math.sqrt(power(x, start, n, hz(m) * (h + 1))); });
  return s;
}

/* MIDI notes sounding (before release) at a frame, on any channel. */
function soundingAt(song: Song, frame: number): Set<number> {
  const out = new Set<number>();
  for (const ch of ['p1', 'p2', 'tri'] as const) {
    for (const n of song.chans[ch]) {
      if (n.wrap) continue;
      if (frame >= n.frame && frame < n.frame + n.gateFrames + 2) out.add(ch === 'tri' ? n.key : n.key);
    }
  }
  return out;
}

interface Score { tested: number; passed: number; control: number }
/*
 * Score the notes of one channel. `shift` moves the expected pitch (the
 * control). A note is measured in a window inside it, clear of its attack and
 * release; notes too short for a window that resolves a semitone are skipped.
 */
function scoreNotes(x: Float32Array, song: Song, notes: Note[], minWindow: number, maxWindow: number, lastFrame: number): Score {
  let tested = 0, passed = 0, control = 0;
  for (const n of notes) {
    if (n.wrap || n.frame + n.gateFrames > lastFrame) continue;
    const s0 = Math.round((n.frame + 2) * FRAME_S * RATE), s1 = Math.round((n.frame + n.gateFrames - 1) * FRAME_S * RATE);
    let win = maxWindow;
    while (win > s1 - s0 && win > minWindow) win >>= 1;
    if (win > s1 - s0 || s0 + win > x.length) continue;
    const start = s0 + Math.floor((s1 - s0 - win) / 2);
    const busy = soundingAt(song, Math.round((start / RATE / FRAME_S + (start + win) / RATE / FRAME_S) / 2));
    const test = (m: number) => {
      const own = salience(x, start, win, m);
      for (const d of [-2, -1, 1, 2]) {
        const c = m + d;
        if (busy.has(c)) continue;
        if (salience(x, start, win, c) >= own) return false;
      }
      return true;
    };
    tested++;
    if (test(n.key)) passed++;
    if (test(n.key + 1)) control++;
  }
  return { tested, passed, control };
}

/* ------------------------------------------------------------ songs */
const pct = (a: number, b: number) => (b ? (100 * a) / b : 100);
console.log('\nsong  name      secs   level      melody (control)        bass (control)');
const results: string[] = [];
songs.forEach((song, i) => {
  const passFrames = song.bars * song.barFrames;
  const seconds = Math.min(MAX_SECONDS, passFrames * FRAME_S + 0.5);
  const x = render(i, seconds);
  const lastFrame = Math.min(passFrames, Math.floor(x.length / RATE / FRAME_S));
  // Level: not silent, not clipped.
  let sum = 0, clip = 0;
  for (const v of x) { sum += v * v; if (Math.abs(v) > 0.999) clip++; }
  const rms = Math.sqrt(sum / x.length), db = 20 * Math.log10(rms || 1e-9);
  const mel = scoreNotes(x, song, song.chans.p1, 1024, 4096, lastFrame);
  const bass = scoreNotes(x, song, song.chans.tri, 4096, 8192, lastFrame);
  const line =
    `${String(i + 1).padStart(4)}  ${song.name.padEnd(8)}  ${seconds.toFixed(1).padStart(4)}  ${db.toFixed(1).padStart(5)} dB  ` +
    `${pct(mel.passed, mel.tested).toFixed(0).padStart(4)}% of ${String(mel.tested).padStart(3)} (${pct(mel.control, mel.tested).toFixed(0).padStart(3)}%)   ` +
    `${bass.tested ? pct(bass.passed, bass.tested).toFixed(0).padStart(4) + '% of ' + String(bass.tested).padStart(3) + ' (' + pct(bass.control, bass.tested).toFixed(0).padStart(3) + '%)' : '   none tested'}`;
  console.log(line);
  results.push(line);
  if (x.length < seconds * RATE * 0.95) fail(`${song.name}: render is ${(x.length / RATE).toFixed(1)} s, expected ${seconds.toFixed(1)} s`);
  if (db < -40) fail(`${song.name}: silent (${db.toFixed(1)} dB)`);
  if (clip > x.length * 0.001) fail(`${song.name}: ${clip} clipped samples`);
  if (mel.tested < 3) fail(`${song.name}: only ${mel.tested} melody notes could be measured`);
  if (pct(mel.passed, mel.tested) < THRESH.melody * 100) fail(`${song.name}: melody ${pct(mel.passed, mel.tested).toFixed(0)}% < ${THRESH.melody * 100}%`);
  if (pct(mel.passed, mel.tested) - pct(mel.control, mel.tested) < THRESH.controlGap * 100) fail(`${song.name}: the control scores too close to the real melody`);
  if (bass.tested >= 3 && pct(bass.passed, bass.tested) < THRESH.bass * 100) fail(`${song.name}: bass ${pct(bass.passed, bass.tested).toFixed(0)}% < ${THRESH.bass * 100}%`);
});

console.log(failures ? `\n${failures} failure(s).` : '\nAll songs play their notes in libgme.');
process.exit(failures ? 1 : 0);
