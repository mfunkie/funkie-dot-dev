# GATSBY.EXE music: the NSF

`public/games/gatsby/gatsby-exe.nsf` is the game's soundtrack as an NSF, the format NES music
players load: a 6502 sound driver plus the song data, run on an emulated 2A03 sound chip. It
is built from the same text the game plays: the `TRACKS` and `JINGLES` in
`public/games/gatsby/audio.js`. There's no second copy of the music to keep in step.

## Listening

Any NSF player works. NSFPlay, foobar2000 with foo_gep, Audacious, and anything built on
Game_Music_Emu (libgme) will do. Or render a song to WAV with ffmpeg (Debian and Ubuntu builds
include libgme). Song numbers start at 0 here:

```sh
ffmpeg -track_index 0 -i public/games/gatsby/gatsby-exe.nsf -t 60 title.wav
```

`node scripts/gatsby/nsf-check.ts --wav <dir>` writes every song's first pass as a WAV.

## Track list

| Song | Track | What it is |
| ---: | --- | --- |
| 1 | title | The green light: a rising major sixth (C to A), then a slow fall. Loops from bar 5. |
| 2 | select | The contents page, a waltz. |
| 3 | eastegg | Chapter I, East Egg. |
| 4 | ashes | The valley of ashes: a dull chugging ostinato like a stopped train. |
| 5 | boss | Every boss fight (Eckleburg, Wolfsheim, Tom). |
| 6 | party | Chapter III, hot jazz: a two-bar break, then a dixieland lead over a trombone-ish counter-line. Loops from bar 3. |
| 7 | bridge | Ragtime over the Queensboro Bridge. |
| 8 | cellar | Wolfsheim's cellar, a sly tango with castanet clicks. |
| 9 | mansion | Klipspringer at the piano while it rains on the panes. |
| 10 | lake | Lake Superior, open water and pines, in six-eight. |
| 11 | plaza | The Plaza: heat, a fanfare from the ballroom below, then a melody that sags chromatically. |
| 12 | argonne | A bugle over snare rolls. |
| 13 | current | The last stage: the green light, reached for again and again; the noise channel is the water. |
| 14 | ending | The motif once more, reaching an octave farther, and it ends (no loop). |
| 15 | sad | Cutscenes. |
| 16 | tender | Cutscenes. |
| 17 | dread | Cutscenes. |
| 18 | jazz | The party heard from the lawn, under the party cutscenes. |
| 19 | die | Jingle: a miss. |
| 20 | clear | Jingle: chapter clear, a Charleston tag ("da, da-da-da-DA"). |
| 21 | card | Jingle: the chapter card. |

Tracks come first in `audio.js` order, then the jingles. A track added to `audio.js` becomes a
new song in the NSF on the next build, and the jingles' numbers move up by one.

## How it's built

`node scripts/gatsby/nsf/build.ts` writes the NSF. `--check` fails if the committed file is out
of date.

1. **Read the music** (`scripts/gatsby/nsf/tracks.ts`). `audio.js` is loaded in a node sandbox and
   its own compiler (`GG.audio._dev.compile`) expands each track: chords into arpeggios and bass
   styles (stride, charleston, swing, two, tango, ...), drum patterns into hits, echoes, loops.
   That leaves events per channel (pulse 1, pulse 2, triangle, noise) in rows. Rows become
   frames on a per-bar groove: every bar lasts the same whole number of frames
   (`round(bar length / 16.639 ms)`), and its rows are spread evenly across it. So the tempo is
   within 0.35% of the browser's (the worst is `select`, 0.35% slow), and identical bars encode
   identically.
2. **Instruments.** Each pulse note gets an instrument from its duty, volume and envelope name.
   The envelope is sampled exactly the way the browser synth samples it, once per 1/60 s in
   sixteen levels, until it holds steady. Release is a per-frame 4-bit multiplier fitted to the
   browser's `setTargetAtTime(0, t, r/3)`. Each drum (`KIT` in `audio.js`) becomes a volume
   envelope plus a per-frame noise period. Its pitch sweep (`rate`) is mapped onto the nearest of
   the 2A03's sixteen noise periods, keeping the long or short ("metallic") LFSR mode. There are
   55 instruments in all.
3. **Encode** (`scripts/gatsby/nsf/encode.ts`). Each channel's notes become ops: a note, or a wait,
   each lasting a number of frames. These are split at bar lines into one chunk per bar.
   Identical chunks are stored once across the whole soundtrack: 1,140 bars come down to 537
   distinct chunks. A note held over a bar line carries its own release time. A loop whose first
   bar differs on later passes (the echo's tail in `current`) gets a second, loop-only order list.
4. **Driver** (`scripts/gatsby/nsf/driver.ts`, assembled by `asm.ts`). INIT sets the APU up and
   points each channel at its order list. PLAY runs 60 times a second and does the following:
   - counts down each channel's wait and reads its next events;
   - steps the volume envelope, or the release once the note lets go (at 97% of its length on
     the pulses and 92% on the triangle, as in the browser);
   - steps the drum's noise period and the pulse vibrato (rate, depth and delay from the track,
     sine table, depth scaled to the note's period);
   - writes `$4000-$400F`.

   It retriggers the pulse phase on each new note, as most NES drivers do, and keeps the sweep
   units' negate bit set so low notes aren't muted. The triangle is switched on and off with its
   linear counter. The driver is 804 bytes; with the data the NSF is about 15 KB. It needs no
   bankswitching.
5. **The header.** NSF version 1, NTSC (16,639 µs a frame), no expansion audio. The title is
   "GATSBY.EXE".

## How it's checked

Two checks, one internal and one independent:

- **Emulator vs. model** (`build.ts`, always run before writing). `scripts/gatsby/nsf/cpu.ts` is a
  small 6502. Every song is run through its first pass, then once around its loop, and the
  driver's APU writes (volume, duty, period, triangle on/off, noise period) are compared frame
  by frame with a model computed from the ops. Every frame of every song must match. This check
  found the driver's first bug: a zero flag left over from a multiply loop made every note let go
  after one frame.
- **An independent player** (`scripts/gatsby/nsf-check.ts`). ffmpeg's libgme demuxer
  (Game_Music_Emu, the emulator inside most NSF players) renders each song. The checker then:
  - checks the header and that libgme reads 21 tracks and the title;
  - checks each render isn't silent (above −40 dBFS) or clipped;
  - measures every melody note (pulse 1) and every bass note (triangle) long enough to resolve
    a semitone. The audio is measured at the note's pitch and at the two semitones either side
    (Goertzel on a Hann window, first four harmonics, ignoring pitches other channels are
    playing). A note passes if its own pitch is strongest.

  As a control, the same audio is scored against the melody moved up a semitone. Thresholds:
  melody ≥ 85%, bass ≥ 75%, and the control at least 40 points below the melody.

  Current result: 100% of measured melody notes and 100% of measured bass notes on all 21
  songs. The control scores 0–35%.

  To show the check can fail, it was run on three deliberately broken NSFs:

  | Broken NSF | Melody score | Result |
  | --- | --- | --- |
  | Every pitch a semitone sharp | 0% on every song (control 100%) | Fails |
  | Each song playing the next one's data | 0–42% | Fails |
  | Tempo 6% slow | 27–71% on every track | Fails |

  In the slow build, only the two shortest jingles (die and card), too short to drift, still
  pass.

Run both in CI (ffmpeg must be installed, e.g. `sudo apt-get install -y ffmpeg` on Ubuntu):

```sh
node scripts/gatsby/nsf/build.ts --check
node scripts/gatsby/nsf-check.ts
```

## Where the NSF differs from the browser synth

The browser synth in `audio.js` is 2A03-flavoured but runs on WebAudio. Some of what it does
can't happen on the chip, or is done differently:

- **Mix.** The browser balances the channels with gains (pulse 0.5, triangle 0.62, noise 0.42),
  then a low-pass and a limiter. The NSF has the APU's own non-linear mixer. The triangle and
  noise sit at the chip's levels, and the triangle has no volume control at all (in the browser
  it's at a fixed level too).
- **One voice per channel.** In the browser a note's release tail can overlap the next note on
  the same channel (they're separate oscillators). On the chip the next note cuts it off.
- **Vibrato** is a smooth sine in cents in the browser, ramping in over 0.12 s after its delay.
  The NSF steps the period by whole units with no ramp. On the highest notes the depth rounds
  to a single unit or to nothing: at A5, 14 cents is one period unit.
- **Drum sweeps.** In the browser the noise sweep glides continuously (`playbackRate`). The NSF
  steps between the sixteen noise periods once a frame.
- **Release** is exponential in the browser. The NSF multiplies a 4-bit volume once a frame and
  rounds down, so quiet tails end a frame or two sooner.
- **Timing** is quantized to whole frames on a per-bar groove: tempo within 0.35%, row starts
  within half a frame.
- **Phase clicks.** The NSF writes `$4003`/`$4007` on each new note, which restarts the pulse
  waveform, and again when vibrato crosses a period high-byte boundary. That's the usual NES
  click. The browser's oscillators start clean.
- **Sound effects** aren't in the NSF. In the game they borrow a music channel while they play,
  as NES games did. The three jingles are included as songs 19–21.

## The songs the novel names

The novel names six tunes, all public domain:

- "The Sheik of Araby" (Ch. IV)
- "The Love Nest" and the lines from "Ain't We Got Fun?" (Ch. V)
- "Three O'Clock in the Morning" (Ch. VI)
- Mendelssohn's Wedding March (Ch. VII)
- "Beale Street Blues" (Ch. VIII)

"The Rosary" is whistled in Ch. IX.

Arrangements of these will be written from the original sheet music, not from memory, once
scans are available. Written as tracks in `audio.js`, they flow into the NSF and both checks
with no other changes.
