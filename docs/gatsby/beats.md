# GATSBY.EXE: the chapters as stages

How each chapter of the novel became a stage, and why its mechanic is the one
it is. Words in double quotation marks here are Fitzgerald's and nobody else's:
`scripts/gatsby/quotes.ts` checks every one of them against
`docs/gatsby/the-great-gatsby.txt`, the same way it checks the game's own text.
Text the game shows on screen is set like `this`.

## The source text

`docs/gatsby/the-great-gatsby.txt` is Project Gutenberg eBook #64317 (the
Standard Ebooks transcription of a Project Gutenberg Australia text), with the
PG header and license removed. It is a corrected later text, not a facsimile of
the 1925 Scribner first printing. It reads "orgiastic" where the first printing
has orgastic, "sickantired", "Union Station", and "tomorrow" and "further" in
the last page. It spells the name "Wolfshiem" throughout, and it uses British
spellings ("colour", "neighbourhood", "judgements"). The game follows this text
because it is the one there is to check against. To use the first-edition
readings, swap in a first-edition transcription and run the quote check again;
it lists every line that would change.

## The rule

Each stage's main verb is the chapter's point, acted out. It's silly, the way
the licensed NES games of the 1980s were silly, but the silliness should land
where the book does. Each stage is built teach → test → twist: a mechanic first
appears somewhere a mistake costs a heart rather than a life
(`scripts/gatsby/intro-lint.ts` checks this on the solver's route through every
stage). Then it's tested, and then something changes it.

## Chapter by chapter

### I. East Egg (stage 1, Nick)

**The beat.** Nick arrives in the Buchanans' world of easy money, and the
chapter ends on Gatsby on the next lawn, reaching toward "a single green light,
minute and far away".

**The mechanic** is the lawn. Fitzgerald writes that "The lawn started at the
beach and ran towards the front door for a quarter of a mile, jumping over
sundials and brick walks and burning gardens", and the stage takes him at his
word. The obstacles are the Buchanans' things. Tom's polo ponies are
invincible chargers you can only hop on, which is Tom: "a cruel body". Inside,
the curtains blow "in at one end and out the other like pale flags" and make
platforms, and the goal is the couch, "buoyed up as though upon an anchored
balloon".

**Teach, test, twist.** A rose bed three tiles wide; then wider beds and the
ponies; then the burning gardens, crossed on brick posts. Indoors, the curtains,
then the couch.

**Changed:** nothing. The mechanic already carries the beat.

### II. The valley of ashes (stages 2-1 and 2-2, Nick)

**The beat.** This is the waste ground between the rich and the city, and the
people ground into it. Above it the billboard's eyes "brood on over the solemn
dumping ground", and later Wilson will take them for God.

**The mechanics.** The enemies are "ash-grey men, who move dimly and already
crumbling through the powdery air": stomp one and he crumbles, then gets back
up. The moving platforms are the grey cars that crawl "along an invisible
track". In 2-2 Eckleburg's attack is to look at you: the glare comes down where
you stand.

**Teach, test, twist.** First ash men on flat ground, then a narrow pit. Then
heaps that give way, first as stepping stones over solid ground. Then the
train crossing, and a grey car, first over solid ground. Then the river
crossings, where both tricks have to work over the river. At the billboard the
glare comes first, then the blinks, and with one eye gone the other weeps
cinders.

**Changed.** The first pit used to have crumbling heaps over a four-tile
river, which tested two new things at once over certain death. The first car
ride also used to be over the river. Both now come first somewhere safe.

### III. The party (stage 3, Nick)

**The beat.** Nobody at Gatsby's party has met Gatsby. Nick is "one of the few
guests who had actually been invited". He talks for a while with a man who
says "Your face is familiar", and only then hears "I'm Gatsby".

**The mechanic.** You collect five rumors, the guests' own words (that he
"killed a man once", that he "was a German spy during the war"). The host only
appears once you've heard what people say about him.

**Changed: the twist.** The same man now turns up twice before the reveal, as
`THE MAN AT MY TABLE`: "Weren't you in the First Division during the war?", and
then, by the bar, he calls Nick "old sport". A player can recognise him before
Nick does, which is how the scene reads in the book.

### IV. The bridge and the cellar (stages 4-1 and 4-2, Nick)

**The beat.** Gatsby puts his invented self on show: the car, the stories, the
policeman waved off with a card. Then he takes Nick to lunch with Wolfshiem,
"the man who fixed the World's Series back in 1919". Nick: "It never occurred
to me that one man could start to play with the faith of fifty million people".

**The mechanics.** You ride Gatsby's car, "terraced with a labyrinth of
windshields that mirrored a dozen suns", under the bridge's girders. Then
Wolfshiem pitches at you.

**Teach, test, twist.** On the ride, the first girders hang only low enough to
scrape you off the high windshields; later ones force you off the car
altogether. Holes come next, then gulls, then the hearse. In the cellar
Wolfshiem throws a fastball, then a curve, then a lob at where you stand. Then
he runs the bases, and he's open when he's winded.

**Changed.** The first hole was three tiles wide and is now two. The first
gull used to meet you beside a hole and now meets you over solid road.

**Not changed, honestly.** Wolfshiem's fight carries the pun on baseball more
than the fix itself. It stays because the chapter's turn, Jordan's story of
Louisville in 1917, is told in the cutscene that follows.

### V. The shirts (stage 5, Nick)

**The beat.** Gatsby and Daisy meet again. He shows her the house, then the
shirts, and she cries into them: "There must have been moments even that
afternoon when Daisy tumbled short of his dreams—not through her own fault,
but because of the colossal vitality of his illusion."

**The mechanic.** You climb the house on shirts thrown down from the top of it,
so his possessions are literally what you climb toward her. The hazards are
clocks. In the book his head knocks against "a defunct mantelpiece clock"; he
is a man trying to stop time.

**Changed:** nothing.

### VI. Lake Superior (stage 6, Jimmy Gatz)

**The beat.** James Gatz invents Jay Gatsby: "Jay Gatsby of West Egg, Long
Island, sprang from his Platonic conception of himself." It happens the moment
he rows out to Dan Cody's yacht.

**The mechanics.** His boyhood schedule lists "Dumbell exercise and
wall-scaling", so Jimmy can kick off walls. His "General Resolves" are what
you collect. The rowboat out to the Tuolomee ends the stage, and the cutscene
changes his name.

**Changed.** Cody's yacht lies over "the most insidious flat on Lake
Superior". A flat is shallow, so the water under the rowboat is now shallow
water on sand: a gull that knocks you in costs a swim, not a life. The tide
pool between the cliffs is water too.

### VII. The Plaza (stage 7, Gatsby)

**The beat.** It is the hottest day of the summer. In the Plaza suite Gatsby
demands that Daisy say she never loved Tom, and she can't. Tom wins without
needing to, and "the long secret extravaganza was played out".

**The mechanics.** You climb the hotel against electric fans in the heat (the
elevator is out of order), then fight Tom. Cards glance off him while he
charges. Jump him and he runs into the wall, dazed and open.

**Changed: the twist.** You win the fight and lose the chapter. Daisy watches
from Gatsby's side of the room. When Tom is down she crosses it to stand by
him, and the stage ends on "only the dead dream fought on as the afternoon
slipped away, trying to touch what was no longer tangible".

### VIII. The Argonne (stage 8, the Major)

**The beat.** Gatsby's war is the one part of his story that was true: "In the
Argonne Forest I took the remains of my machine-gun battalion so far forward
that there was a half mile gap on either side of us where the infantry
couldn't advance. We stayed there two days and two nights".

**The mechanics.** You cross trenches in the dark. Flares light it, shells land
where marks blink, and the trench walls are there to be kicked up.

**Changed: the twist.** At the end the screen locks on the forward position
and you have to hold it through day, night, day and night, each harder than
the last. Then "...when the infantry came up at last they found the insignia
of three German divisions among the piles of dead", and the medal appears.
About twenty tiles of repeated trench were cut to make room.

### IX. Boats against the current (stage 9, Nick)

**The beat.** "So we beat on, boats against the current, borne back ceaselessly
into the past."

**The mechanic.** A current pushes you back the whole way across the Sound, on
bell buoys and drifting boats, toward a green light that moves away twice
before it can be reached.

**Changed.** The first buoys and the first boat now sit over a sandbar, where
you can wade back if you fall, and the first hops over deep water are short.

## Motifs

| Motif | In the novel | In the game |
| --- | --- | --- |
| The green light | I (end), V, IX | The title screen; the end of I and V; the goal of IX, which moves away twice |
| The eyes | II; VIII, where Wilson says "God sees everything" | The faint eyes on the title (after Cugat's 1925 jacket); the 2-2 boss; VIII's cutscene |
| The past | VI ("Can't repeat the past?"), IX | IX's current; VI is the past, played |
| Carelessness | "They were careless people, Tom and Daisy" | Tom's ponies (I); Tom, unhurtable while he charges (VII); the shirts (V); the car (IV) |
| Nick watching | Throughout | III's rumors and the man at the table; Nick is the hero of every chapter he narrates |

## How it's checked

- `scripts/gatsby/quotes.ts`: every quoted passage, in the game and in this
  file, is verbatim; nothing borrowed goes unquoted; names are spelled as in
  the text.
- `scripts/gatsby/intro-lint.ts`: each mechanic's first appearance can't kill.
- `scripts/gatsby/solve.ts`: every stage can be finished from its start and
  every checkpoint, with every item.
- `scripts/gatsby/bots.ts`: the bridge ride, the three bosses and the Argonne
  hold can be cleared with the buttons alone.
- `docs/gatsby/playtest.md`: the check that matters most, real players. Its
  blind mode hides the chapter names and asks which part of the novel each
  stage is.
