'use strict';
/* Chapter 1 — Jonathan Harker's Journal, Castle Dracula */
G.chapter({
  id: 'c1', title: 'The Prisoner of the Castle', doc: "Jonathan Harker's Journal", date: 'Castle Dracula, 25 June',
  intro: [
    'I came to the Carpathians in May to settle the purchase of an estate at Purfleet, called Carfax, for a foreign nobleman. At the castle door he took my hand with a grip as cold as ice and said, "Welcome to my house! Enter freely and of your own will!"',
    'That was weeks ago. There are no mirrors here and no servants. The Count never eats. He has made me write three letters home and date them in advance: the 12th, the 19th and the 29th of June.',
    'I am a prisoner. If I am to see Mina again, I must find a way out of this place myself.',
  ],
  opening: 'My room in the castle. The moon is up, and somewhere below, the wolves have started again.',
  start: 'c1room', inv: [],
});

G.scene({
  id: 'c1room', title: 'My room in the castle', doc: "Jonathan Harker's Journal · 25 June",
  art: (S) => A.svg(
    `<rect width="800" height="500" fill="url(#stone)"/>`,
    // window with moonlit valley
    `<g><path d="M560 330 V150 a70 70 0 0 1 140 0 V330Z" fill="#1b2440"/>
      <clipPath id="w1"><path d="M560 330 V150 a70 70 0 0 1 140 0 V330Z"/></clipPath>
      <g clip-path="url(#w1)">${A.moon(660, 140, 16)}${A.stars(24, 3, 330).replace(/cx="(\d+)/g, (m, x) => `cx="${560 + (+x % 140)}`)}
        <path d="M560 300 L600 270 L640 290 L690 255 L700 265 V330 H560Z" fill="#0d1220"/>
        ${S.f['c1.sawCount'] ? '' : A.count(612, 318, .32, { fill: '#05060a' }).replace('scale(0.32)', 'scale(0.32) rotate(180 0 -60)')}
      </g>
      <path d="M560 330 V150 a70 70 0 0 1 140 0 V330Z M630 80 V330 M560 230 H700" fill="none" stroke="#0b0d12" stroke-width="8"/>
      <rect x="548" y="330" width="164" height="14" fill="#2a2e3a"/></g>`,
    // floor
    `<rect y="410" width="800" height="90" fill="#16120f"/><path d="M0 410 H800" stroke="#0a0806" stroke-width="3"/>`,
    // door
    `<g><path d="M270 410 V230 a55 55 0 0 1 110 0 V410Z" fill="#3a2717"/><path d="M290 410 V236 M325 410 V200 M360 410 V236" stroke="#24180e" stroke-width="3"/>
      <rect x="276" y="270" width="98" height="8" fill="#141414"/><rect x="276" y="360" width="98" height="8" fill="#141414"/><circle cx="364" cy="320" r="6" fill="#141414"/></g>`,
    // bed
    `<g><rect x="30" y="300" width="210" height="110" fill="#2a1d14"/><rect x="40" y="290" width="190" height="40" fill="#6b5f4f"/><rect x="40" y="290" width="60" height="30" fill="#a59a86"/>
      <rect x="22" y="200" width="16" height="210" fill="#2a1d14"/><rect x="232" y="240" width="14" height="170" fill="#2a1d14"/>
      ${S.f['c1.crucifix'] ? '<path d="M96 190 v8" stroke="#555" stroke-width="1.5"/>' : '<path d="M96 186 v14" stroke="#555" stroke-width="1.5"/><path d="M92 198h8v10h8v6h-8v16h-8V214h-8v-6h8z" fill="#d9a94a"/>'}
      ${S.f['c1.boots'] ? '' : '<path d="M150 410 v-22 c0 -8 18 -8 18 0 v14 c8 2 14 4 14 8z M176 410 v-22 c0 -8 18 -8 18 0 v14 c8 2 14 4 14 8z" fill="#1a120c"/>'}</g>`,
    // table with letters and lamp
    `<g><rect x="420" y="330" width="110" height="10" fill="#3a2717"/><rect x="428" y="340" width="8" height="70" fill="#2a1d14"/><rect x="514" y="340" width="8" height="70" fill="#2a1d14"/>
      <path d="M432 330 l26 -6 4 6z M462 330 l24 -5 6 5z" fill="#d8ccb0"/>${A.candle(505, 328, .8)}</g>`,
    S.f['c1.sawCount'] ? '' : '',
  ),
  spots: (S) => [
    { id: 'window', name: 'Window', x: 560, y: 80, w: 140, h: 250,
      look: 'From this window I can see a vast sweep of forest and the moon over the mountains. Directly below me is the Count\'s own window.',
      act: (g) => {
        if (!g.has('c1.sawCount')) {
          g.flag('c1.sawCount');
          g.say('I lean out. Something moves below. The Count\'s head is coming out of his window.',
            'He emerges and begins to crawl down the castle wall, face down, over that dreadful abyss, his cloak spreading out around him like great wings.',
            'His fingers and toes grasp the corners of the stones, worn clear of mortar. He moves downwards with considerable speed, just as a lizard moves along a wall.',
            'What manner of man is this, or what manner of creature in the semblance of man?',
            'He is gone. His room below is empty now. If he can go along this wall, so can I.');
        } else if (!g.has('c1.boots')) {
          g.say('I put one leg over the sill. My boots skid on the wet stone. I shall never keep my footing in these.');
        } else {
          g.say('Barefoot, I climb out onto the ledge. I dare not look down. The stones are big and roughly cut, and the mortar has been washed away by time.',
            'Inch by inch I make my way to the Count\'s window, and slip in feet first.');
          g.go('c1count');
        }
      } },
    { id: 'door', name: 'Door', x: 270, y: 175, w: 110, h: 235,
      look: 'Heavy oak, bound with iron. Locked from the outside, as every door here seems to be.',
      act: ['I try the handle again. Locked.', 'Doors, doors, doors everywhere, and all locked and bolted. In no place save from the windows in the castle walls is there an available exit.'],
      use: { razor: 'The blade would snap long before the lock gave.', crucifix: 'The door does not care what I believe.' } },
    { id: 'crucifix', name: 'Crucifix over the bed', x: 76, y: 180, w: 42, h: 56, hidden: S.f['c1.crucifix'],
      look: 'The crucifix the landlady at Bistritz pressed on me. I hung it over my bed. Whenever I have looked at it, I have felt comforted.',
      act: (g) => { g.flag('c1.crucifix'); g.give('crucifix'); g.say('I take the crucifix down and fasten it about my neck. Whatever is ahead, I will not face it without this.'); } },
    { id: 'boots', name: 'My boots', x: 140, y: 372, w: 80, h: 40, hidden: S.f['c1.boots'],
      look: 'Good English boots, hobnailed. Excellent for the Strand. Less so for a castle wall.',
      act: (g) => { g.flag('c1.boots'); g.say('I pull off my boots and stand barefoot on the cold floor. My feet will grip the stone better than leather.'); } },
    { id: 'letters', name: 'The three letters', x: 425, y: 300, w: 72, h: 34,
      look: 'The letters the Count made me write. One says my work here is nearly done. One says I am starting home. The last says I have left the castle and arrived at Bistritz.',
      act: ['The dates are 12 June, 19 June and 29 June. Today is the 25th, and the second letter has already gone.', 'I know now the span of my life. God help me!'] },
    { id: 'lamp', name: 'Candle', x: 485, y: 270, w: 40, h: 62,
      look: 'The only light in the room. The Count does not seem to need any.',
      act: 'I leave it burning. I will want something to come back to.' },
    { id: 'bed', name: 'Bed', x: 30, y: 285, w: 110, h: 90,
      look: 'I wrote my journal here in shorthand, so the Count could not read it. I sleep little.',
      act: 'No. If I lie down, I may not get up again.' },
  ],
  hint: (S) => !S.f['c1.sawCount'] ? 'The door will not open. Try the window.' : !S.f['c1.boots'] ? 'Something you are wearing will make the ledge impossible.' : 'Go out the window now, along the ledge.',
});

G.scene({
  id: 'c1count', title: "The Count's room", doc: "Jonathan Harker's Journal · 25 June",
  art: (S) => A.svg(
    `<rect width="800" height="500" fill="url(#stone)"/><rect width="800" height="500" fill="#0a0c12" opacity=".35"/>`,
    A.archWindow(60, 110, 120, 200, '#1b2440'),
    `<rect y="400" width="800" height="100" fill="#14110e"/>`,
    // dust and furniture
    `<path d="M240 400 v-60 h170 v60" fill="#2a1d14"/><rect x="230" y="332" width="190" height="10" fill="#3a2717"/>
     <path d="M232 332 L240 330 L418 330 L420 332" stroke="#8a8070" stroke-width="2" opacity=".5"/>`,
    // gold heap in corner
    `<g>${[...Array(30)].map((_, i) => { const r = A.rng(i + 11); return `<ellipse cx="${560 + r() * 110}" cy="${402 - r() * 24 * (1 - Math.abs(r() - .5))}" rx="7" ry="3" fill="${r() > .5 ? '#c9952e' : '#e3b14a'}"/>`; }).join('')}
      <path d="M545 404 q60 -40 130 0z" fill="#8a6a20" opacity=".55"/></g>`,
    // heavy door in corner
    `<g><path d="M650 330 V190 a40 40 0 0 1 80 0 V330Z" fill="#2a1c12"/><path d="M650 330 V190 a40 40 0 0 1 80 0 V330" fill="none" stroke="#0c0a08" stroke-width="5"/>
     <path d="M690 330 V150" stroke="#1a120b" stroke-width="2"/>${S.f['c1.doorOpen'] ? '<path d="M660 330 V196 a30 30 0 0 1 60 0 V330Z" fill="#050507"/>' : ''}</g>`,
    S.f['c1.struck'] ? `<path d="M110 300 l6 -4" stroke="#000"/>` : '',
    A.fog(470, .18),
  ),
  spots: (S) => [
    { id: 'gold', name: 'Heap of gold', x: 545, y: 370, w: 140, h: 40,
      look: 'Gold of all kinds, Roman, British, Austrian, Hungarian, Greek and Turkish money, covered with a film of dust, as though it had lain long in the ground. None of it is less than three hundred years old.',
      act: (g) => { if (g.hasItem('gold')) return g.say('I have taken enough. It is not mine, but I may need to buy my way home.'); g.give('gold'); g.say('I fill a pocket. If I ever get out of this, I will need to pay my way across half of Europe.'); } },
    { id: 'table', name: 'Dusty table', x: 230, y: 320, w: 190, h: 30,
      look: 'Everything is covered in thick dust. Nobody lives in this room. He only passes through it.',
      act: 'I look for the key to the great door below. It is not here. There is nothing here but dust.' },
    { id: 'corner', name: 'Heavy door', x: 650, y: 150, w: 80, h: 180,
      look: 'A heavy door in the corner, standing a little open.',
      act: (g) => { g.flag('c1.doorOpen'); g.say('It opens onto a stone stairway that winds steeply down. A passage at the bottom smells of old earth, newly turned.'); g.go('c1chapel'); } },
    { id: 'win', name: 'Window', x: 60, y: 110, w: 120, h: 200,
      look: S.f['c1.struck'] ? 'Below this window the castle wall drops into the precipice. Hundreds of feet. Then the forest, then the road to home.' : 'The way I came in. Above, my own window, still lit.',
      act: (g) => {
        if (!g.has('c1.struck')) return g.say('Not yet. I have come this far. I must know what he hides below.');
        g.say('The door is locked behind me. The gypsies are nailing down the boxes. Tomorrow I am to be given to those women.',
          'I will try to scale the castle wall farther than I have yet attempted. The precipice is steep and high.',
          'At least God\'s mercy is better than that of these monsters. Mina, good-bye, if I do not see you again.');
        g.endChapter('c2');
      } },
  ],
  hint: (S) => S.f['c1.struck'] ? 'There is only one way out of the castle now. The window.' : 'The door in the corner leads somewhere.',
});

G.scene({
  id: 'c1chapel', title: 'The ruined chapel', doc: "Jonathan Harker's Journal · 25 June",
  art: (S) => A.svg(
    `<rect width="800" height="500" fill="#0d0e12"/><rect width="800" height="330" fill="url(#stone)" opacity=".6"/>`,
    // broken windows
    A.archWindow(110, 60, 80, 150, '#121a2e'), A.archWindow(610, 60, 80, 150, '#121a2e'),
    `<path d="M0 330 H800 V500 H0Z" fill="#191410"/><path d="M0 330 H800" stroke="#0b0806" stroke-width="3"/>`,
    // boxes
    [[90, 400], [210, 420], [560, 420], [680, 400], [140, 470], [640, 470], [300, 360], [500, 360]].map(([x, y], i) => A.box(x, y, .9 + (y - 360) / 400)).join(''),
    // The Count's box
    `<g transform="translate(400 430)"><path d="M-80 0 L-66 -50 H66 L80 0Z" fill="#3a2a1b"/><path d="M-80 0 H80 V36 H-80Z" fill="#2b1f14"/>
      ${S.f['c1.struck'] ? '<path d="M-82 -2 L-66 -52 H66 L82 -2Z" fill="#4a3624"/><path d="M-60 -30 H60" stroke="#2b1f14" stroke-width="2"/>' :
        `<path d="M-64 -46 H64 L70 -4 H-70Z" fill="#241a12"/>${A.count(0, -6, .5, { blood: true, face: '#d8b8a8' }).replace('scale(0.5)', 'scale(0.5) rotate(-90 0 -60)')}
         <path d="M90 -60 L150 -100 L156 -96 L96 -56Z" fill="#4a3624"/>`}
    </g>`,
    // shovel against wall
    S.f['c1.shovel'] ? '' : `<g><path d="M740 330 L720 210" stroke="#7a5a36" stroke-width="6"/><path d="M712 196 l18 -4 4 22 -18 4z" fill="#9ca3ad"/></g>`,
    // stairs
    `<path d="M0 330 V180 h40 v30 h30 v30 h30 v30 h30 v60Z" fill="#14161c"/>`,
    A.fog(360, .25),
  ),
  spots: (S) => [
    { id: 'boxes', name: 'Great wooden boxes', x: 40, y: 330, w: 240, h: 150,
      look: 'There are great wooden boxes everywhere, fifty in all, filled with fresh mould. The gypsies have been bringing them in for days.',
      act: 'The lids are loose, not yet nailed. Earth inside. Nothing else. Why would a nobleman ship his own soil to England?' },
    { id: 'countbox', name: S.f['c1.struck'] ? 'The closed box' : 'The Count\'s box', x: 320, y: 360, w: 160, h: 110,
      look: S.f['c1.struck'] ? 'The lid has fallen shut. I hear the gypsies on the stair.' :
        'The Count lies within, but he looks as if his youth has been half restored. His white hair has turned dark grey. His mouth is redder than ever. On the lips are gouts of fresh blood.',
      act: (g) => {
        if (g.has('c1.struck')) return g.say('Never. I will not open it again.');
        if (!g.has('c1.searched')) { g.flag('c1.searched'); return g.say('I force myself to search his body for the key. My flesh crawls. He lies like a filthy leech, exhausted with his repletion.', 'There is no key. There is only that face, and the mocking smile on it.'); }
        g.say('I cannot bring myself to touch him again.');
      },
      use: {
        shovel: (g) => {
          g.take('shovel'); g.flag('c1.struck');
          g.say('This is the being I am helping to transfer to London, where he may satiate his lust for blood among its teeming millions.',
            'I lift the shovel high and strike downwards at the hateful face. As I do, the head turns, and the eyes fall full upon me, with all their blaze of basilisk horror.',
            'The sight paralyses me. The shovel turns in my hand and glances from the face, making only a deep gash above the forehead. It drops from my hand across the box, and the lid falls over it.',
            'Singing. The gypsies are coming down the stair. I run for the passage and climb back to his room as fast as my bare feet will go.');
          g.go('c1count');
        },
        crucifix: ['I hold out the crucifix. He does not stir. In this sleep he is not a man you can reason with or frighten. He is a thing.'],
        razor: 'My hand would not get close enough.',
      } },
    { id: 'shovel', name: 'Shovel', x: 700, y: 180, w: 50, h: 150, hidden: S.f['c1.shovel'],
      look: 'A long-handled shovel, left by the gypsies.',
      act: (g) => { g.flag('c1.shovel'); g.give('shovel'); g.say('I take up the shovel. It is heavy, and that is good.'); } },
    { id: 'stairs', name: 'Stairs up', x: 0, y: 170, w: 130, h: 160,
      look: 'The stone stair back to the Count\'s room.',
      act: (g) => g.has('c1.searched') ? g.say('Not yet. I cannot leave him here to go to London.') : g.say('Not yet. I need to know what is here.') },
  ],
  hint: (S) => !S.f['c1.searched'] ? 'Examine the box that is not like the others, then act on it.' : !S.f['c1.shovel'] ? 'There is a tool against the far wall.' : 'Use what you carry on the Count.',
});
