# JEKYLL.EXE: the design

*Strange Case of Dr Jekyll and Mr Hyde* as a turn-based game of being seen.
This page covers the idea, the rules and where each one comes from, why the
game looks like a ZX Spectrum game, how the places connect, what every
chapter asks of you, and how all of it is checked. Words in double quotation
marks here are Stevenson's and nobody else's: `scripts/jekyll/quotes.ts`
checks every one against `docs/jekyll/the-strange-case.txt`, the same way it
checks the game's own text.

## The idea

The novel is told by people watching. Enfield sees a man trample a child.
Utterson waits at a door until he sees a face. A maid at her window watches
a murder in the moonlight. Poole sees "a mask upon his face", and Utterson
and Enfield glimpse the doctor's face at a window. Lanyon watches the change
and dies of it. Only the last chapter, "HENRY JEKYLL'S FULL STATEMENT OF THE
CASE", is told from inside.

So the game is about being seen. You play the statement: one body, two
natures, and a London full of people who notice. Each chapter opens with
Jekyll's account of a stretch of his double life, set in his hand, and you
play the nights it tells of. It closes with what the others saw, from
Utterson's chapters: the case. The book is the record of the times Hyde was
seen. The game is all the other times. That's also why each chapter's way to
lose is the thing the book records: the strike is Enfield's "damned
Juggernaut", being caught at the door is "Mr. Hyde, I think?", and a
witnessed change is Lanyon's "O God!".

It isn't a platformer or a point-and-click adventure. It's a puzzle game in
turns, nearer to *Hitman GO* or a roguelike than to the other games on the
site: every move is a minute, nothing happens until you act, and anything
you do can be taken back.

## The rules

The rules are in `public/games/jekyll/core.js`, the same code in the
browser, the solver and every check.

**One body, two forms.** Jekyll is "a large, well-made, smooth-faced man of
fifty"; Hyde is "so much smaller, slighter and younger". Hyde can clamber
over crates, straw, hedges and railings, the low things, which nobody else
can do; Poole saw the masked thing "like a monkey" jump "from among the
chemicals". Jekyll keeps to the floor.

**People come over to Jekyll and back away from Hyde.** Everyone sees along
their row and column, four squares, until a wall, a person or the fog is in
the way, and always sees the square next to them. Someone who sees Jekyll
takes a step toward him each turn and stops beside him: he is a man "fond of
the respect of the wise and good". Someone who sees Hyde takes a step away
each turn, because "none could come near to me at first without a visible
misgiving of the flesh". Nearest move first toward Jekyll and farthest first
away from Hyde, so a crowd moves as one.

**A cornered person is struck.** If someone beside Hyde has nowhere to back
away to (a wall, furniture, another person, the edge of a doorway), Hyde
strikes them, and the night is over. Enfield's account of the child is what
it means, and the Carew murder is what it becomes: "to be tempted, however
slightly, was to fall." A person who can see Hyde but can't back away flashes
on the screen: don't step beside them.

**Nobody may watch the change.** If anyone can see you when the draught
takes, or when the change takes you on its own, the secret is out. The one
exception is chapter IX, where Lanyon must see it.

**Constables see only where their lanterns shine.** A constable walks his
beat with his bull's-eye lantern, which lights five squares the way he
faces, drawn in yellow. At the end of his beat he takes a turn to turn round.
From the night of the murder on, a lantern that finds Hyde is the end.
Before that, constables don't care about him; nobody is looking for him yet.

**Mr. Utterson sees farther than anyone.** "If he be Mr. Hyde," he thought,
"I shall be Mr. Seek." He sees eight squares along a row or column. Within four, he knows
you. Farther off, he steps toward you for a closer look, which leaves him
off his post and gives you a turn to get out of his sight. A person
standing between you hides you.

**Fog drifts.** In fogged rooms a bank of fog moves across the screen a
square a turn. Nobody sees into, out of or through it, except at arm's
length.

**The clock.** Every turn is a minute, and the time is always on the
panel. Some rooms have a deadline or a window: at Cavendish Square you knock
at Lanyon's door between twelve and three minutes past, because "At
midnight, then, I have to ask you to be alone in your consulting room". The
church clocks strike the hours.

**Later, the change comes on its own.** After Lanyon, the panel counts down
to the change. Then a draught needs a double dose ("It took on this
occasion a double dose to recall me to myself"), waiting as Jekyll is
dozing and changes you at once ("if I slept, or even dozed for a moment in
my chair, it was always as Hyde that I awakened"), and on the last night,
changing beside the statement means Hyde tears it up.

### Fair, and never stuck

These are the lessons of the earlier games on the site, where a stage could
be finished in a way that left a player stuck with no idea what to do.

- **Undo, without limit.** Z takes back any move, back to the start of the
  room; R starts it over.
- **Fixed starts.** Every room starts from a fixed state: where you are,
  which form, what you carry, what time it is. Nothing done in one room can
  leave the next one impossible.
- **Nothing fatal is a surprise.** A square you'd die stepping onto is drawn
  red before you step, and if waiting or drinking would end the night the
  panel says so.
- **The game knows when you're lost.** A worker runs the solver from where
  you are whenever you stop. If the room can't be won any more, the panel
  says `THIS CANNOT END WELL. Z UNDOES.`
- **A hint when you want one.** H asks the same solver for the next move of
  a shortest way through, and shows it as an arrow.
- **LOOK.** L shows every square anyone can see, in blue.
- **The goal is always on the panel**, and the way out you can take now
  blinks.

## Why a Spectrum

The Spectrum's one famous limit fits the book. Its screen is a bitmap of
one bit a pixel, and each 8x8 cell has exactly two colours, an INK and a
PAPER, plus a FLASH bit that swaps them. One cell, two natures. The game
draws everything that way (`public/games/jekyll/screen.js` keeps a 256x192
bitmap and 32x24 attributes and only then turns them into pixels), so the
colour clash is real: a figure walking into a cell takes the cell's ink with
it. The change flashes the cells around you; the border flashes green and
magenta. And it's a British machine for a London story by a Scottish
writer.

Other things in the same spirit:

- **The type leans.** Jekyll's statement is set leaning forward and Hyde's
  words leaning back. Mr. Guest, the handwriting expert, finds the two hands
  "in many points identical: only differently sloped", because Jekyll gave
  Hyde a signature "by sloping my own hand backward".
- **Two footsteps.** The beeper plays Jekyll's step low and heavy, Hyde's as
  a light double click. The steps Poole and Utterson heard "fell lightly and
  oddly, with a certain swing, for all they went so slowly; it was different
  indeed from the heavy creaking tread of Henry Jekyll."
- **The loading screen** stripes the border red and cyan, then blue and
  yellow, and brings the title in a third of the screen at a time, as a
  tape did. Any key skips it.
- **The chapter select is the version book**, from Lanyon's narrative: "an
  ordinary version book and contained little but a series of dates." It
  writes "double" against a chapter you needed another go at, and once,
  early, "total failure!!!".

## The world

Every place is drawn once, in `public/games/jekyll/world.js`, and every room
set there reuses it, so the cabinet, the theatre and the door are the same
each time you come back. North is up everywhere. Jekyll's house fronts "a
square of ancient, handsome houses"; behind it the yard "which had once been a
garden" runs back to the old dissecting rooms; their theatre has, "At the
further end, a flight of stairs" up to "a door covered with red baize" and
the cabinet, which looks out "upon the court by three dusty windows barred
with iron"; "A corridor joined the theatre to the door on the by-street",
round the corner from the square. The rooms of chapters I, IV, V, X and XI
are all in that one house, and the player learns it.

Some things change with the story, the same way in every room:

- "There was no mirror, at that date, in my room": the cabinet has no
  cheval-glass in chapter I, so the first sight of Hyde is in the bedroom.
  It stands in the cabinet on the last night.
- In chapter I the theatre floor is blocked by the crates of the salt, "a
  large quantity of a particular salt" just bought from the wholesale
  chemists, so Jekyll can't get through but Hyde can.
- The papers burned in Hyde's rooms in Soho are the "pile of grey ashes" the
  inspector finds in the morning, with the butt of the cheque book that
  wouldn't burn.
- Hyde's key works at the door in the by-street until chapter VI, when
  Jekyll "ground the key under my heel". After that the door is never used.
- On the last night, every way out of the cabinet is shut.

## The chapters

Each chapter is built teach, test, twist: a mechanic first appears where it
can't do much harm, then it's tested, then something changes it. Turns are
the shortest way through, from `scripts/jekyll/solve.ts`.

### I. The first experiment (5 rooms, 9-13 turns each)

**The beat.** "late one accursed night, I compounded the elements, watched
them boil and smoke together in the glass", and went as Hyde to see himself
in the glass.

**Teach.** The cabinet: walk into the table to mix the draught, X to drink
it. The theatre: the crates of salt that only Hyde can climb. The yard and
the sleeping house. The bedroom glass ends it. Nobody is awake and nothing
can go wrong; it's the house, learned.

### II. The sea of liberty (3 rooms, 13-19 turns)

**The beat.** The double life: the house in Soho, the will, Hyde's own
bank account, "Think of it—I did not even exist!"

**The mechanic** is backing away and the strike. In Soho, a woman on the
open street shows the first; "many ragged children huddled in the
doorways" show the second, because a child in a doorway has nowhere to back
into: pass at two squares and they cower, step in front of them and Hyde
strikes. A barrow in the middle of the street makes you choose a side. The
night streets test it ("street after street, all lighted up as if for a
procession and all as empty as a church"): push a cabman the wrong way and
he jams against the next man. At the door in the by-street, a tramp sits on
the step: "Tramps slouched into the recess and struck matches on the
panels." He has to be moved along the street, not into the recess.

**The case.** Enfield's story of the door, and the will with the name
Edward Hyde in it.

### III. Mr. Seek (3 rooms, 13-20 turns)

**The beat.** "In the morning before office hours, at noon when business
was plenty and time scarce, at night under the face of the fogged city moon"
Utterson haunts the door.

**Teach.** Morning: Utterson watches the door from the doorway opposite.
The way in is to push a shopman into his line of sight and walk in behind
him.

**Test.** Noon: he stands out in the street, the street is full, and luring
him the wrong way puts him between you and the door for good. The room card
warns of it. About nine in ten positions here can no longer be won, the
hardest room in the game for that, and the `CANNOT END WELL` warning earns
its keep.

**Twist.** Night: nobody to hide behind, only the fog. Wait for it to cover
his line and go.

**The case.** The meeting at the door: "Mr. Hyde, I think?"

### IV. Quite at ease (1 room, 27 turns)

**The beat.** The dinner after which "Mr. Utterson so contrived that he
remained behind after the others had departed."

**Teach (the other half).** You're Jekyll, and people come to you. Walk four
guests across the mat by the front door, where Poole sees them out; the
trick is to stand beside the mat so they cross it on their way to you.
Utterson won't go, and keeps getting in the way.

### V. The hand of Edward Hyde (3 rooms, 10-37 turns)

**The beat.** "I had gone to bed Henry Jekyll, I had awakened Edward Hyde",
in the morning, with the servants up.

**Test.** Indoors, with nowhere to back away to. The servants are used to
Mr. Hyde, so being seen is no matter; cornering one is. Downstairs, Poole
stands where Hyde can't get past him without cornering him, so the way to
the back passage is the long way round, through the hall, the dining room
and the kitchen, coming at the cook from the side where she can step
away. A deadline at nine was tried here and taken out: it made most
positions unwinnable without making the rooms any better.

### VI. The Carew murder case (3 rooms, 13-48 turns)

**The beat.** The maid's account of the murder, then the statement: "I ran
to the house in Soho, and (to make assurance doubly sure) destroyed my
papers".

**Teach.** Constables. In Hyde's rooms, the papers from both bureaus go in
the hearth. In a garden square at night, two constables walk their beats
with their lanterns; Hyde can go over the railings and among the trees.

**Test.** The by-street, with two beats across it, and the door.

**The case.** Newcomen and Utterson in Soho the next morning, and Guest's
two hands, "only differently sloped".

### VII. Regent's Park (1 room, 26 turns)

**The beat.** "I sat in the sun on a bench" and the change came, in the
open, in daylight: "I was once more Edward Hyde."

**The twist.** You know what happens when he sits down. The bench is at the
end of a narrow hedged walk, and whoever trails Jekyll up it will be beside
him when the change comes. If they can't step away, the bench shows red.
Then the same people back away from Hyde, the constables are now hunting him,
and the way out is the east gate.

### VIII. Midnight (3 rooms, 14-17 turns)

**The beat.** The hotel in Portland Street, the cab, and the walk to
Cavendish Square, "counting the minutes that still divided him from
midnight."

**Test.** The hotel's attendants tremble out of a narrow corridor to the
private room. In the back streets a woman offers a box of lights: she comes
toward Hyde, and in the book "He smote her in the face, and she fled", so
she mustn't reach him. Lose her round a block. At Cavendish Square the
constables cross in front of the portico; Hyde waits between the pillars, as
Lanyon found him "crouching against the pillars of the portico", and knocks
as midnight strikes.

### IX. Dr. Lanyon's narrative (1 room, 20 turns)

**The twist on the rule.** The drawer, a graduated glass, the draught mixed
at the table, and this once it must be seen: "behold!" Drinking out of his
sight is marked as fatal before you do it.

### X. The premonitory shudder (2 rooms, 11 and 30 turns)

**Teach.** The change comes on its own. "I was stepping leisurely across the
court after breakfast", and the count starts: get to the laboratory before
it, or be somewhere nobody can see when it comes. The servants know Hyde for
a murderer now.

**Test.** Weeks later, the salt runs low and every new supply is wrong. Hyde
searches three crates in the theatre at night for any of the old salt,
while Poole walks the room with his candle. None is left.

**The case.** Incident at the window, and Poole's "why had he a mask upon
his face?"

### XI. The last night (1 room, 16 turns)

**The beat.** "I am now finishing this statement under the influence of the
last of the old powders."

**Twist on everything.** Ten pages to write, at the table, as Jekyll. The
change comes every five turns; two double doses left; dozing changes you at
once; and if the change takes you beside the table, Hyde tears the pages.
Write four, step away, change, drink, come back. The last page is the book's
last sentence. Then Utterson and Poole at the red baize door, as the game
began.

## How it's checked

All in `scripts/jekyll/`, run by `.github/workflows/jekyll.yml`:

- `world-lint.ts`: every screen's edge is wall or a way out; every exit says
  where it leads and that place leads back; no floor is sealed off; nobody
  stands in a wall, on furniture or in a doorway; constables' beats run over
  floor; everything you need can be reached; and each room follows from the
  last (its way out leads to the screen the next room is in, which starts at
  that door), unless the chapter marks the step as a cut in the story.
- `solve.ts`: every room can be finished from its start, breadth first over
  the game's own rules. `--deep` also measures how many reachable positions
  can no longer be won.
- `quotes.ts`: every quoted passage, in the game, on the games page and in
  this file, is verbatim; nothing is borrowed without quotation marks; names
  are spelled as Stevenson spelled them.
- `play.ts`: every room played in Chromium through the game's own keys, with
  the solver's moves, each ending in the next room; no errors on the page.

## The source text

`docs/jekyll/the-strange-case.txt` is Project Gutenberg eBook #43, from the
EPUB, one paragraph to a line, with the Gutenberg header and licence removed.
