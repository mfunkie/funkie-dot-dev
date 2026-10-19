# GATSBY.EXE: how the heroes move

The heroes' physics in `public/games/gatsby/core.js` (`NICK` and `GATZ`) are
tuned to targets taken from two real NES games, at the scale of this one (16px
tiles, a 22px-tall hero, 60 frames a second). `scripts/gatsby/feel.ts`
measures everything below with the game's own `GG.heroStep`, and
`node scripts/gatsby/feel.ts --check` fails if a hero drifts off its targets.

## The references

**Super Mario Bros.** is simulated byte for byte from doppelganger's
disassembly (`SMBDIS.ASM`, as included in
[MitchellSternke/SuperMarioBros-C](https://github.com/MitchellSternke/SuperMarioBros-C)):

- `JumpMForceData` (`$20 $20 $1e $28 $28`) is the gravity while A is held and
  Mario is rising. `FallMForceData` (`$70 $70 $60 $90 $90`) is the gravity
  otherwise. Both are in 1/256 px per frame per frame.
- `PlayerYSpdData` (`$fc $fc $fc $fb $fb`) is the jump speed, -4 or -5 px a
  frame, chosen by running speed in `ProcJumping`.
- `MaxRightXSpdData` (`$28 $18 $10`) holds the top speeds in 1/16 px. It gives
  2.5 running with B and 1.5 walking.
- `FrictionData` (`$e4 $98 $d0`) is acceleration in 1/4096 px per frame per
  frame. It doubles when skidding.
- `MovePlayerVertically` caps falling at 4 px a frame plus its fraction.
- `JumpSwimSub` switches to the heavy gravity the moment A is let go.

The model reproduces those routines' integer arithmetic, including the
oddities (the X speed's fraction shares a byte with the position's).

**Mega Man 2** comes from TASVideos' published figures:

- walking at 1.375 px a frame and 1.3125 in the air, and Y speed growing 0.25
  a frame up to 12
  ([GameResources/NES/Rockman](https://tasvideos.org/GameResources/NES/Rockman));
- gravity of 0.25 px per frame per frame (0x40 subpixels) and a jump speed of
  4.87 (04.DF) ([TASVideos forum](https://tasvideos.org/Forum/Topics/15032)).

How Mega Man's jump responds to letting go of the button isn't in those
sources, and neither is his first step from a standstill. So only his full
jump is modelled, and he's shown reaching full speed at once.

## The numbers

Distances are in pixels and times in frames.

| | Nick before | Nick | Gatsby before | Gatsby | SMB1 walk | SMB1 run (B) | MM2 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| top speed (px/frame) | 1.60 | 1.60 | 1.75 | 1.75 | 1.50 | 2.50 | 1.375 |
| frames to top speed | 18 | 22 | 18 | 4 | 36 | 47 | 0 |
| frames to stop | 11 | 13 | 11 | 4 | 45 | 63 | 0 |
| slide when stopping | 7.8 | 9.1 | 8.7 | 2.6 | 29 | 68 | 0 |
| frames to turn around | 18 | 7 | 18 | 4 | 14 | 17 | 0 |
| standing jump, A held | 55.9 | 53.2 | 57.0 | 57.0 | 66 | 66 | 49.9 |
| frames to the top of it | 23 | 28 | 23 | 21 | 29 | 29 | 20 |
| frames in the air | 40 | 45 | 40 | 43 | 53 | 53 | 40 |
| shortest jump (one-frame tap) | 22.9 | 16.7 | 23.3 | 18.7 | 24 | 24 | — |
| running jump, A held | 55.9 | 59.3 | 57.0 | 57.0 | 71 | 83 | 49.9 |
| running jump distance | 64 | 76.8 | 70 | 71.6 | 85 | 143 | 52.5 |
| fall speed cap (px/frame) | 5 | 4.5 | 5 | 6 | 4.38 | 4.38 | 12 |
| coyote frames | 4 | 4 | 4 | 4 | 0 | 0 | — |
| jump buffer frames | 5 | 5 | 5 | 5 | 0 | 0 | — |
| wall slide (px/frame) | | | 1.1 | 1.1 | | | |
| height from one wall-kick | | | 52.5 | 42.3 | | | |

## Why each hero is tuned the way it is

**Nick moves like Mario.** He's carried along by other people's momentum, so
he gets SMB1's shape:

- He takes 22 frames to reach top speed and skids to a stop.
- Reversing doubles his deceleration (SMB1's skid).
- In the air he keeps his momentum unless steered. SMB1 applies no air drag
  without input.
- He rises slowly while A is held (28 frames, against SMB1's 29) and falls 3.5
  times as hard once it's let go, which is SMB1's ratio of `$70` to `$20`.
  That turns a tap into a hop a third the height of a full jump.
- He jumps about 10% higher from full speed. SMB1 picks a bigger jump from its
  speed table; ours is a gentler version, so maps built around a standing jump
  still work.
- His fall is capped at 4.5 px a frame, SMB1's cap.

His times are shorter than Mario's. A 16px-tall Mario has 66px of jump; a 22px
Nick in 16px-tile stages needs about 53, or the maps' gaps stop meaning
anything.

**The Gatz heroes move like Mega Man.** Jimmy, Gatsby and the Major are
self-made men who go where they point:

- They start and stop in 4 frames (Mega Man is at full speed almost at once)
  and keep a steady speed in the air, at 95% of their run (MM2's 1.3125
  against 1.375).
- They rise on an even arc in 21 frames, against MM2's 20, under one gravity
  for going up and coming down.
- Letting go of A cuts the rise to 1.5 px a frame, after a minimum of three
  frames. This short hop is our choice, since MM2's behaviour here isn't
  documented in the sources above.
- Their full jump is 57px rather than MM2's 50, scaled up because a 22px hero
  in 16px tiles is proportionally shorter than Mega Man.
- Their fall is capped at 6 rather than 12. At 12 the camera can't keep up, and
  a fall of more than half a tile per frame skips past one-way platforms.
- A wall-kick gives 42px, less than a full jump. Climbing a single wall
  therefore takes rhythm, and a chimney is quicker, which is the "wall-scaling"
  in Jimmy's schedule.

**Two deliberate departures from both.** Coyote time (4 frames after leaving a
ledge) and a jump buffer (5 frames before landing) aren't in SMB1 or MM2. They
make up for the 2 to 4 frames of latency a browser and an LCD add, which a CRT
didn't have.

## Changing them

Edit `NICK` or `GATZ` in `core.js`, then run:

```sh
node scripts/gatsby/feel.ts --check   # still on target? (or change TARGETS in feel.ts, with a reason)
node scripts/gatsby/solve.ts          # can every stage still be finished?
node scripts/gatsby/intro-lint.ts     # is every mechanic still met somewhere safe first?
node scripts/gatsby/bots.ts           # the ride, the bosses and the hold
```

In the game, `?debug` then F2 shows the hero's path over the last three
seconds, where a held jump from here would land, and the airtime of the last
jump.
