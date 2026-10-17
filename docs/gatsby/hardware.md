# GATSBY.EXE and the NES's limits

GATSBY.EXE is a browser game, so nothing stops it from using any colour
anywhere. It holds itself to what a Nintendo Entertainment System could
put on screen, and a checker proves it does. This page covers the rules,
how the art meets them, how the checker works, and what it lets off on
purpose.

## The rules

These are the limits of the NES's picture chip (the 2C02 PPU), as
documented on the NESdev wiki. The rules are checked against what the game
draws, not against a hardware emulation.

| Rule | What the PPU does | Checker name |
|---|---|---|
| 3 colours per 16x16 background area | The background is 8x8 tiles, but colour is picked per 16x16 area (one attribute). Each area uses one of four background palettes: three colours plus a backdrop colour shared by all four. | `BG-CELL` |
| 4 background palettes at once | Background areas on screen fit four palettes of three colours, plus one backdrop. | `BG-PALS` |
| 3 colours + transparent per sprite tile | A sprite is an 8x8 tile with one of four sprite palettes: three colours, and colour 0 is see-through. | `SPR-TILE` |
| 4 sprite palettes at once | Sprite tiles on screen fit four palettes of three colours. | `SPR-PALS` |
| 8 sprites per scanline, 64 per frame | The PPU fetches at most eight sprites for each line of pixels and ignores the rest; sprite memory (OAM) holds 64. | `SCANLINE` |

Games swapped palettes between screens and areas (during vertical blank),
so "at once" here means per scene: a stage, a cutscene picture, or a menu
screen.

## How the art meets them

The `art-*.js` files are still full-colour masters, drawn as character
grids. They are converted when a scene starts, the job a CHR converter does
when it turns artwork into NES tiles and palettes:

- `public/games/gatsby/art-palettes.js` holds each scene's palettes: four
  background palettes plus a backdrop, and four sprite palettes.
- `public/games/gatsby/palette.js` maps the art onto those palettes:
  - Each 8x8 sprite tile takes whichever of the scene's four sprite palettes
    loses the least colour, measured in CIE Lab.
  - Each 16x16 background area does the same with the background palettes.
  - The level's tile layers (room backdrops, tiles, and tiles drawn in front
    of sprites) are one nametable, so each area's palette is chosen from
    what shows through all three layers.
  - Each parallax layer is reduced on its own 16px grid.
  - Live background details (sailboats, fireworks, smoke) are reduced on the
    screen's grid each frame.
  - Cutscene pictures and the title and ending screens are reduced each
    frame. A cell keeps its palette between frames unless another one is
    much better, so animation doesn't make cells flash between palettes.
  - Entities that draw their own pixels (the green light, Eckleburg's
    glare, a shell's mark, the ash clouds) get one sprite palette per draw.
- `public/games/gatsby/oam.js` enforces the scanline limit with flicker, as
  NES games did:
  - Each frame's sprites are queued and each 8px row of each sprite gets
    its scanlines in a rotating order. The hearts in the HUD go first, as
    games kept status sprites at the top of OAM.
  - Rows that don't fit are left out of that frame, and a different set
    drops out on the next.
  - It also caps a frame at 64 sprites.

The palettes are chosen by `scripts/gatsby/nes-palettes.ts`, then pinned
where the automatic choice lost something that mattered:

1. It walks every stage in Chromium, with the hero kept alive, to see which
   sprites appear and how often.
2. It weights every background cell by how much of the stage it is on
   screen. A still sky counts for every screen; a tile counts for the one
   screen that passes it.
3. It searches for the palettes that lose the least colour. On cutscene
   pictures and the title, vivid pixels count for more, because a few red
   roses carry more of a picture than as much grey wall. Faces count for
   more in the portrait panels, and the name, eyes, lips, green light and
   menu count for more on the title.

The `KEEP` table at the top of the tool records the pins:

| Scene | Pinned | Why |
|---|---|---|
| Every stage | sprite palette `0f 16 30` | The HUD's hearts stay red |
| 9 | sprite palette `1a 2a 30` | The green light is green; it is drawn in that palette alone |
| 5 | background palette `00 10 30` | It rained that day, on every window of the mansion |
| 4-2 | background palette `18 28 38` | The cellar's lamps glow |
| Cutscenes | a palette holding `28 30` | The frame and the text (gold and white) share a palette with one picture colour; the frame is now one gold |
| Title | a palette holding `10 30` | The menu's grey, and white for the choice |
| The eyes picture | all four | The search had left white squares around Eckleburg's irises |

The palettes as they stand:

| Stage | Backdrop | Background palettes | Sprite palettes |
|---|---|---|---|
| 1 EAST EGG | 38 | 1c 21 31 / 01 11 21 / 08 0a 1a / 06 0f 36 | 0f 16 30 / 02 0f 36 / 07 0f 30 / 0f 18 36 |
| 2-1 THE VALLEY OF ASHES | 00 | 08 0f 10 / 0c 0f 10 / 02 10 18 / 08 0f 18 | 0f 16 30 / 00 08 0f / 0f 27 36 / 02 0f 10 |
| 2-2 DR. T. J. ECKLEBURG | 0f | 10 18 36 / 02 12 21 / 00 10 30 / 21 28 31 | 0f 16 30 / 00 0f 10 / 0f 27 36 / 02 0f 36 |
| 3 THE PARTY | 0f | 02 03 0c / 18 30 37 / 03 13 24 / 07 08 18 | 0f 16 30 / 0f 28 30 / 0f 27 36 / 02 0f 36 |
| 4-1 THE QUEENSBORO BRIDGE | 30 | 0c 10 1c / 01 11 21 / 21 31 / 00 0c 0f | 0f 16 30 / 02 0f 36 / 00 0f 10 / 0f 27 36 |
| 4-2 THE CELLAR | 08 | 18 28 38 / 06 0f 30 / 07 0f 18 / 00 0c 18 | 0f 16 30 / 02 0f 36 / 08 0f 38 / 0f 10 27 |
| 5 THE SHIRTS | 10 | 00 10 30 / 03 05 0f / 0f 27 37 / 08 0c 18 | 0f 16 30 / 00 0f 30 / 0f 27 36 / 02 0f 36 |
| 6 LAKE SUPERIOR | 01 | 0f 10 27 / 11 21 31 / 07 08 0a / 10 30 31 | 0f 16 30 / 02 0f 37 / 0a 0f 37 / 0f 10 18 |
| 7 THE PLAZA HOTEL | 37 | 0a 1a 38 / 07 0f 17 / 00 10 30 / 0f 27 28 | 0f 16 30 / 00 0f 10 / 0f 18 36 / 0f 25 36 |
| 8 THE ARGONNE | 08 | 07 0f 18 / 00 0f 10 / 0f 18 28 / 0c 0f 18 | 0f 16 30 / 0f 27 36 / 08 0f 18 / 00 0f 10 |
| 9 BOATS AGAINST THE CURRENT | 02 | 03 0f 10 / 08 0c 0f / 0c 0f 1c / 0c 11 21 | 0f 16 30 / 1a 2a 30 / 00 0f 16 / 02 0f 27 |
| Title | 0f | 0b 10 30 / 01 02 11 / 01 08 28 / 02 15 1a | none |
| Ending | 0f | 01 02 30 / 01 02 1a / 18 21 28 / 01 10 2d | none |

Each of the 52 cutscene pictures has its own four palettes in the same file
(`cine:<picture>`).

**Changing art.** Edit the master in `art-*.js`, then rerun
`node scripts/gatsby/nes-palettes.ts <scene>`. You can also pin a choice in
`KEEP`. Then run the checker.

## The checker

```sh
node scripts/gatsby/nes-check.ts                       # everything
node scripts/gatsby/nes-check.ts 3 9 cine screens      # some scenes
node scripts/gatsby/nes-check.ts --out report.md       # also write report.md and report.json
```

It loads the real game in headless Chromium and checks what reaches the
canvas. It doesn't check the palette tables.

**Stages.** Each stage is walked from start to end: the hero is moved 64px
at a time with physics running, then held in each boss arena. The checks:

- **The tile plane.** Every 16x16 world cell of the built layers, room
  backdrops included, and every animated tile over what's under it.
- **Parallax layers.** Each layer image on its own grid. The live extras are
  rendered alone at several camera positions and times.
- **Background objects.** Each is checked on its own grid.
- **Sprites.** Every sprite frame is checked as the scene's palettes left
  it, flipped and unflipped, with the 8x8 grid mirroring with the sprite.
- **Palette count.** The colour sets of all background cells, and of all
  sprite tiles drawn on the walk, must fit four palettes each. The exact
  minimum number of palettes is found by search.
- **Scanlines.** Each sampled frame is drawn twice: once with flicker off,
  to see every sprite asked for, and once for real, with OAM's counts per
  scanline read afterwards.

The palette count covers the whole stage, which is a stronger test than one
screen at a time.

**Cutscenes and screens.**

- Every panel of every cutscene is sampled four times as its text types
  out.
- So are the title, the ending, all eleven chapter cards and the contents
  screen.
- Each is checked on the screen's 16px grid, with backdrop `0f`.
- A chapter card's running hero is checked as a sprite.

It exits 1 if anything breaks a rule and no exception covers it.

### What it found

Before (the masters, unconverted):

- 232 of 254 sprite frames had an 8x8 tile over three colours (1,129
  tiles). Nick alone used 12 colours.
- 324 of 427 background tiles had more than three colours in their 16x16
  area.
- 1,051 of 9,424 parallax-layer cells did too.
- Without flicker, stages asked for up to 15 sprites on a line, and up to
  73 on screen in the Eckleburg arena.

After: no violations. The stages, 109 cutscene panels and 14 screens all
pass. Per stage:

| Stage | Most sprites asked for on a line | Drawn | Sampled frames that flickered |
|---|---|---|---|
| 1 | 15 | 8 | 7 / 48 |
| 2-1 | 13 | 8 | 8 / 48 |
| 2-2 | 13 | 8 | 41 / 70 (the Eckleburg fight: ash men, glare, Nick) |
| 3 | 10 | 8 | 7 / 56 |
| 4-1 | 10 | 8 | 10 / 500 |
| 4-2 | 11 | 8 | 9 / 103 |
| 5 | 12 | 8 | 1 / 5 |
| 6 | 8 | 8 | 0 / 37 |
| 7 | 13 | 8 | 14 / 109 |
| 8 | 12 | 8 | 1 / 50 |
| 9 | 6 | 6 | 0 / 50 |

The Eckleburg fight flickers most of the time, the way a busy NES boss
fight does. Its billboard and the eyes in it are background, so they never
flicker; the glare columns and the ash men do.

### What it costs

Measured in headless Chromium on the dev container:

- **Entering a stage.** About 150–215 ms the first time (during its chapter
  card), then about 6–20 ms on a restart.
- **A frame of play.** About 0.7–1.7 ms, against 0.1–0.9 ms unconverted.
- **A cutscene frame.** About 2 ms.
- **A title frame.** About 3.5 ms.

### What it doesn't model

- **The CHR budget.** A real cartridge has 256 background and 256 sprite
  tiles loaded at a time, more with a bank-switching mapper. The art isn't
  cut into reusable 8x8 tiles, so the checker doesn't count them.
- **Mid-frame tricks.** Sprite-0 splits, palette changes mid-frame and
  colour emphasis aren't modelled.
- **Exact OAM order.** The scanline count is per frame from what was drawn.
  The rotation is the game's own, not an emulation of how a particular
  cartridge cycled OAM.

## Deliberate exceptions

These are in `scripts/gatsby/nes-exceptions.json`. The checker prints them
with every report.

Yacht Club Games set the precedent with *Shovel Knight* (2014): David
D'Angelo's article ["Breaking the NES for Shovel Knight"](https://www.gamedeveloper.com/design/breaking-the-nes-for-shovel-knight)
(also on the [Yacht Club blog](https://www.yachtclubgames.com/blog/breaking-the-nes/))
listed the NES limits the game broke on purpose:

- four colours outside the NES palette
- parallax scrolling
- no sprite flicker
- a 400x240 screen

GATSBY.EXE keeps the palette, the screen size and the flicker. Its list:

1. **Parallax planes.** The NES has one background plane. Parallax needs
   raster splits in horizontal bands with nothing else in them, and here
   the skies, skylines and parallax layers sit behind the tile plane at
   other scroll speeds. Each plane still keeps the 3-colours-per-16x16 rule
   on its own grid, and all of them share the stage's four background
   palettes and backdrop.
2. **Background objects.** These are moving things a real cartridge would
   draw into the background because they are too wide for eight sprites a
   line. Mega Man 2's biggest bosses are drawn that way, with a plain
   background behind them. The list is in `palette.js` (`BGOBJ`):
   - Gatsby's car and the hearse
   - the train
   - the ash cart
   - the couch
   - the rowboat and the skiff
   - the piano
   - the Eckleburg billboard and its eyes

   They follow the background rules, not the sprite rules, and don't count
   toward the scanline limit.
3. **Overlays.** These are drawn over the play area. On hardware they would
   be a status bar or window (a split) and palette fades.
   - the HUD's text
   - message boxes
   - the pause screen's dimming
   - fades
   - the white flash
   - the Argonne's darkness

   The HUD's hearts and icons are sprites, and they are counted.
4. **Weather.** The falling ash (II), heat haze (VII) and mist (IX) are a
   screen effect. As sprites they would be hundreds over the limit; a real
   game would animate background tiles instead.
