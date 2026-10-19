# GATSBY.EXE playtest protocol

What this answers: does each stage play as hard and as long as it was designed to
(`scripts/gatsby/playtest-targets.json`), where do people die, and can someone who
skips the story tell which part of the novel a stage is from playing it alone?

## Players (5–8)

- At least two who have read *The Great Gatsby* (school counts) and two who haven't.
- At least two who play platformers often and two who rarely do.
- Three or four of them play **blind** (no cutscenes, no chapter names) to answer the
  recognition question; the rest play normally. Difficulty data comes from everyone.
- Optional: one or two on a phone, if touch controls matter to you.

## Setup (5 minutes per player)

1. Give each player their own name: `https://funkie.dev/games/gatsby/index.html?playtest=ALICE`
   (blind: `...?playtest=ALICE&blind`). Use a normal browser window, not a private one: the
   log lives in the browser until it's saved.
2. Keyboard (arrows, Z jump, X throw, Enter pause) or a gamepad. Sound on, headphones fine.
3. Start from the title screen with START. Allow 45–75 minutes for all eleven stages.

## During the session

Say: *"We're testing the game, not you. Please think out loud: what you're trying to do,
what surprises you, what annoys you. I can't help, but you can stop whenever you like."*

- Don't help, hint or explain. If someone is stuck in one spot for five minutes, note the
  stage and spot, then let them use pause → CHAPTER SELECT to move on (that's recorded as a quit).
- Write down what they say, especially "wait, what?", "that's not fair" and laughter, with
  the stage. Note anything they misread on screen.
- Blind players get a box after each chapter: *"Which part of The Great Gatsby do you think
  that was?"* Don't react to the answers.

## Afterwards (5 minutes)

1. Which stage was the most fun? The least? Where did you feel cheated?
2. Did Nick feel different from Gatsby? Slippery, floaty, stiff, or fine?
3. Which moments felt like the book? Which felt like they came from nowhere?
4. Anything you didn't understand: a goal, an enemy, a rule?
5. Blind players: show them the chapter list (I–IX) and ask them to match the stages again.

Then **save the log**: pause → SAVE PLAYTEST LOG, or the *save playtest log* link under the
picture, or the button on the ending screen. Put every player's JSON file in one folder.

## The report

```sh
node scripts/gatsby/heatmap.ts path/to/logs --out playtest-report
open playtest-report/report.html
```

It renders every stage's map with each death (colour = cause, shape = player), each hurt,
and red shading where they bunch up; a table and two charts of deaths and minutes per stage
against the target bands; the worst spots; what killed people; and the blind answers.

How to read it, with 5–8 players:

- **A miss** is a stage whose median player is outside a target band (deaths before first
  clearing it, or minutes to clear it), or whose clear rate is under the target.
  One miss on one measure is worth watching; misses on two measures, or a hotspot shared by
  three or more players, mean the stage needs work.
- **Recognition** counts as working for a stage when at least half the blind players name
  the right part of the novel (the report's keyword column is only a hint; read the answers).
- To see exactly what happened, open the game with `?debug`, drop a log file onto the page,
  and click a run: it replays the player's inputs frame for frame. Replays need the same
  build of the game the log was made with (each session records it); the report itself
  only needs the positions in the log.

`scripts/gatsby/fixtures/playtest-sample.json` is a log made by bots
(`node scripts/gatsby/playtest-bot.ts`) for trying the report; bots aren't people, so its
numbers mean nothing.
