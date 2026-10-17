/*
 * Builds GATSBY.EXE's soundtrack as an NSF from the tracks in audio.js.
 *
 *   node scripts/gatsby/nsf/build.ts            write public/games/gatsby/gatsby-exe.nsf
 *   node scripts/gatsby/nsf/build.ts --check    fail if that file is out of date
 *
 * Before writing, every song is run on a 6502 emulator and the driver's APU
 * writes are compared, frame by frame, with what the songs say (verify.ts).
 * To hear it, use any NSF player, or render one track with ffmpeg:
 *   ffmpeg -track_index 0 -i public/games/gatsby/gatsby-exe.nsf -t 30 title.wav
 */
import fs from 'node:fs';
import path from 'node:path';
import { GAME_DIR } from '../lib/game.ts';
import { build } from './encode.ts';
import { compare } from './verify.ts';

export const NSF_PATH = path.join(GAME_DIR, 'gatsby-exe.nsf');

const check = process.argv.includes('--check');
const built = build();
let failed = false;

console.log('song  name      kind    bars  loop  first pass  emulator vs model');
built.songs.forEach((sb, i) => {
  const s = sb.song;
  // A first pass, one more time through the loop, and a little past it.
  const frames = s.bars * s.barFrames + (s.loop ? (s.bars - s.loopBar) * s.barFrames : 0) + 120;
  const r = compare(built, i, frames);
  if (r.bad) failed = true;
  const secs = ((s.bars * s.barFrames * 16639) / 1e6).toFixed(1);
  console.log(
    `${String(i + 1).padStart(4)}  ${s.name.padEnd(8)}  ${s.kind.padEnd(6)}  ${String(s.bars).padStart(4)}  ${s.loop ? 'bar ' + (s.loopBar + 1) : '  no '}  ${secs.padStart(8)} s  ` +
      (r.bad ? `${r.bad} frames differ` : `${frames} frames match`),
  );
  for (const line of r.first) console.log('        ' + line);
});
const st = built.stats;
console.log(
  `\n${built.songs.length} songs, ${built.insts.length} instruments. Driver ${st.driver} bytes, data ${st.data} bytes ` +
    `(${st.chunks} distinct bar chunks, ${st.chunkBytes} bytes, for ${st.chunkRefs} bars; order lists ${st.orderBytes}; envelopes ${st.seqBytes}). ` +
    `NSF ${built.nsf.length} bytes.`,
);
if (failed) { console.error('\nThe driver does not play what the songs say.'); process.exit(1); }

if (check) {
  const old = fs.existsSync(NSF_PATH) ? fs.readFileSync(NSF_PATH) : null;
  if (!old || Buffer.compare(old, Buffer.from(built.nsf)) !== 0) {
    console.error(`\n${path.relative(process.cwd(), NSF_PATH)} is out of date: run node scripts/gatsby/nsf/build.ts`);
    process.exit(1);
  }
  console.log(`\n${path.relative(process.cwd(), NSF_PATH)} is up to date.`);
} else {
  fs.writeFileSync(NSF_PATH, built.nsf);
  console.log(`\nwrote ${path.relative(process.cwd(), NSF_PATH)}`);
}
