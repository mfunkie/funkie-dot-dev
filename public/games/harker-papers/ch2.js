'use strict';
/* Chapter 2 — Mina Murray's Journal, Whitby */
G.chapter({
  id: 'c2', title: 'What Came Ashore at Whitby', doc: "Mina Murray's Journal", date: 'Whitby, August',
  intro: [
    'Jonathan\'s last letter from the castle was short and strange, and it was dated weeks before it reached me. Since then, nothing.',
    'I am staying with my dearest friend Lucy Westenra and her mother at Whitby, on the Yorkshire coast. Lucy is to marry Arthur Holmwood. She has started walking in her sleep again, as she did as a child.',
    'Last night the greatest storm in living memory broke on the harbour, and a ship came in out of it with no one alive on board.',
  ],
  opening: 'The morning after the storm. The whole town is down at the harbour.',
  start: 'c2harbour', inv: [],
});

G.scene({
  id: 'c2harbour', title: 'Tate Hill Pier, Whitby', doc: 'Cutting from "The Dailygraph", 8 August, pasted in Mina\'s Journal',
  art: (S) => A.svg(
    A.sky('#6c7486', '#b3b5ae'),
    `<g filter="url(#blur6)" opacity=".5"><ellipse cx="200" cy="60" rx="240" ry="40" fill="#4e5566"/><ellipse cx="620" cy="90" rx="260" ry="46" fill="#585f70"/></g>`,
    // East cliff + abbey
    `<path d="M480 230 L520 150 L800 130 V240Z" fill="#3a3f49"/>
     <g fill="#2a2e36"><path d="M600 140 v-56 h10 v56z M640 140 v-70 l12 -14 l12 14 v70z M690 140 v-50 h12 v50z"/><path d="M612 110 a14 14 0 0 1 28 0 v30 h-28z" fill="#3a3f49"/></g>
     <path d="M560 150 L600 238" stroke="#5a5f68" stroke-width="3" stroke-dasharray="3 3"/>`,
    // town
    `<path d="M0 250 V200 h30 l10 -14 l10 14 h40 v-20 h30 l14 -12 l14 12 v20 h40 l12 -16 l12 16 h40 v30 h70 l10 -10 l10 10 H480 V250Z" fill="#4a4740"/>
     <g fill="#d8c9a0" opacity=".5"><rect x="44" y="210" width="6" height="8"/><rect x="134" y="200" width="6" height="8"/><rect x="250" y="214" width="6" height="8"/></g>`,
    A.water(250, '#3e4757', '#7d879a', 5),
    // sand and pier
    `<path d="M0 360 C 200 340 380 350 520 380 L520 500 H0Z" fill="#8f8466"/><path d="M520 380 H800 V420 H520Z" fill="#4a4237"/><path d="M520 420 H800 V500 H520Z" fill="#3a3229"/>`,
    // ship Demeter aground
    `<g transform="translate(250 380) rotate(-7)"><path d="M-170 -10 L170 -10 L140 34 L-150 34Z" fill="#1d1813"/><path d="M-140 -10 V-200 M10 -10 V-230 M120 -10 V-170" stroke="#1d1813" stroke-width="7"/>
      <path d="M-140 -180 L-60 -150 M10 -210 L-70 -170 M10 -200 L90 -160 M120 -160 L60 -140" stroke="#1d1813" stroke-width="1.5"/>
      <path d="M-120 -170 l40 6 l-6 60 l-34 -8z M20 -200 l50 6 -10 70 -34 -8z" fill="#8f897a" opacity=".55"/>
      <text x="40" y="20" font-family="Georgia" font-size="13" fill="#b9ad8e">DEMETER</text>
      <g transform="translate(130 -16)"><path d="M0 0 a16 16 0 1 1 0.1 0" fill="none" stroke="#6b5232" stroke-width="3"/>${A.person(0, 6, .4, '#0e0c0a')}</g></g>`,
    // crowd + coastguard
    A.person(600, 420, .9, '#22252c', { hat: true }), A.person(650, 424, .85, '#2a2d34', { dress: true }), A.person(700, 418, .9, '#1b1d22', { hat: true }),
    A.person(560, 430, 1, '#1b2436', { hat: true, face: '#c9a88a' }),
    // boxes on pier
    A.box(740, 470, .6), A.box(780, 488, .6), A.box(700, 494, .5),
    // dog tracks to the cliff
    `<g fill="#5f5743">${[...Array(10)].map((_, i) => `<ellipse cx="${380 + i * 16}" cy="${396 - i * 4}" rx="3" ry="2"/>`).join('')}</g>`,
    A.rain(12, 30, .12),
  ),
  spots: (S) => [
    { id: 'ship', name: 'The schooner Demeter', x: 90, y: 160, w: 330, h: 230,
      look: 'A Russian schooner from Varna. She came in at full speed before the gale, with every sail set, and drove straight up onto the sand in the corner of the pier.',
      act: 'The coastguard will not let anyone aboard. They say she carries nothing but ballast and boxes of earth.' },
    { id: 'captain', name: 'The man at the wheel', x: 345, y: 290, w: 60, h: 70,
      look: 'A corpse, lashed by his hands to a spoke of the wheel. Between the inner hand and the wood is a crucifix, the beads of the rosary wound round both wrists and the wheel.',
      act: 'He tied himself there. The coastguard says he must have done it before the end, so that he could not leave his post.' },
    { id: 'coastguard', name: 'Coastguard', x: 535, y: 315, w: 50, h: 120,
      look: 'One of the coastguard men. He was the first aboard.',
      act: (g) => {
        if (!g.has('c2.log')) {
          g.flag('c2.log'); g.give('log');
          g.say(['Coastguard', 'Bless you, miss, the whole town has been asking. The captain had a bottle in his pocket with a roll of paper in it. The log. The magistrate copied it out and let me keep this fair copy for the paper.'],
            ['Coastguard', 'Go on, take it. I\'ve read it twice and I\'ll not read it again.']);
        } else if (!g.has('c2.read')) {
          g.say(['Coastguard', 'Have you read it yet, miss? Tap it with Look, if you take my meaning.']);
        } else g.say(['Coastguard', 'Fifty cases of common earth, consigned to Mr. S. F. Billington, solicitor, of the Crescent. Strange cargo for a ship to die for.']);
      } },
    { id: 'tracks', name: 'Tracks in the sand', x: 370, y: 370, w: 180, h: 40,
      look: 'Prints of a great dog. When the ship struck, an immense dog sprang up on deck from below and leapt from the bow onto the sand.',
      act: 'The tracks go straight towards the steep cliff where the old churchyard hangs. Nobody has seen the dog since.' },
    { id: 'boxes', name: 'Boxes of earth', x: 680, y: 430, w: 120, h: 70,
      look: 'Great wooden boxes, being carted up the pier. A tradesman\'s label on each.',
      act: 'Heavier than earth ought to be, the carters grumble.' },
    { id: 'cliff', name: 'The East Cliff', x: 520, y: 60, w: 280, h: 140,
      look: 'The ruins of Whitby Abbey and the old churchyard of St. Mary\'s, up the hundred and ninety-nine steps. Lucy\'s favourite seat is there.',
      act: (g) => {
        if (!g.has('c2.read')) return g.say('Not yet. I want to know what happened on that ship first.');
        g.say('Poor old Mr. Swales was found dead on our seat the morning after the storm, with a look of fear on his face.', 'Three days pass. Lucy sleeps badly and walks often.');
        g.go('c2room');
      } },
  ],
  onEnter: (g) => {},
  hint: (S) => !S.f['c2.log'] ? 'Talk to the coastguard.' : !S.f['c2.read'] ? 'Choose Look, then tap the log you are carrying.' : 'Lucy\'s seat is on the East Cliff. Head there.',
});

/* reading the log uses the Look verb on the item; hook it */
(() => {
  const it = G._items.log;
  it.onLook = (g, S) => {
      if (S.chapter === 'c2' && !S.f['c2.read']) {
        g.flag('c2.read');
        g.say('I unroll the copy of the log and read it there on the pier.',
          ['Log of the Demeter', '16 July. Mate reported in the morning that one of the crew, Petrofsky, was missing. Could not account for it.'],
          ['Log of the Demeter', '24 July. Another man lost, disappeared. Like the first, he came off his watch and was not seen again. Men all in a panic of fear.'],
          ['Log of the Demeter', '28 July. Four days in hell. Second mate volunteered to steer and watch. Gone.'],
          ['Log of the Demeter', '4 August. Still fog. I am to be the last. I saw It. God forgive me, but the mate was right to jump overboard.'],
          ['Log of the Demeter', 'I shall tie my hands to the wheel when my strength begins to fail, and along with them I shall tie that which He, It, dare not touch.'],
          'The writing ends there.');
        return true;
      }
      if (S.f['c2.read']) { g.say('The log of the Demeter. I have read it. I wish I had not.'); return true; }
      return false;
  };
})();

G.scene({
  id: 'c2room', title: 'The Crescent, our bedroom', doc: "Mina Murray's Journal · 11 August, 3 a.m.",
  art: (S) => A.svg(
    `<rect width="800" height="500" fill="#1b1a22"/><rect width="800" height="500" fill="url(#paperP)" opacity=".25"/>`,
    `<rect y="400" width="800" height="100" fill="url(#boards)"/>`,
    // window with view of the abbey
    `<g><rect x="300" y="70" width="200" height="230" fill="#1a2238"/>${A.moon(440, 120, 16)}
      <path d="M300 250 L360 200 L500 190 V300 H300Z" fill="#0f1320"/><g fill="#0b0d16"><path d="M420 200 v-40 h8 v40z M440 200 v-50 l8 -10 l8 10 v50z M468 200 v-34 h8 v34z"/></g>
      <circle cx="372" cy="214" r="3" fill="#f1ede2"/>
      ${S.f['c2.seen'] ? '<path d="M366 212 q6 -10 12 0z" fill="#07080c"/>' : ''}
      <path d="M300 70 H500 V300 H300Z M400 70 V300 M300 185 H500" fill="none" stroke="#0b0b10" stroke-width="8"/></g>`,
    // Lucy's bed, empty
    `<g><rect x="40" y="300" width="220" height="100" fill="#3a2c22"/><path d="M48 296 h200 v24 h-200z" fill="#d8d2c4"/><path d="M60 300 c40 -14 80 10 140 -6 l40 16 h-180z" fill="#c9c2b2"/><rect x="30" y="220" width="14" height="180" fill="#3a2c22"/></g>`,
    // chair with shawl
    `<g><rect x="560" y="320" width="70" height="8" fill="#3a2c22"/><rect x="560" y="250" width="8" height="150" fill="#3a2c22"/><rect x="622" y="328" width="8" height="72" fill="#3a2c22"/>
      ${S.f['c2.shawl'] ? '' : '<path d="M556 250 h20 l10 70 -16 14 -18 -10z" fill="#7c7f8c"/>'}</g>`,
    S.f['c2.shoes'] ? '' : '<path d="M650 400 v-14 c0 -6 12 -6 12 0 v8 c6 2 10 3 10 6z M674 400 v-14 c0 -6 12 -6 12 0 v8 c6 2 10 3 10 6z" fill="#3b2a1e"/>',
    // dressing table with pincushion
    `<g><rect x="680" y="300" width="110" height="10" fill="#4a3628"/><rect x="686" y="310" width="8" height="90" fill="#3a2c22"/><rect x="776" y="310" width="8" height="90" fill="#3a2c22"/>
      ${S.f['c2.pin'] ? '' : '<ellipse cx="710" cy="294" rx="14" ry="7" fill="#8a2a30"/><path d="M704 288 l4 -8 M712 286 l2 -9 M718 289 l5 -7" stroke="#c9cfd8" stroke-width="1.4"/>'}
      ${A.candle(760, 298, .7, true)}</g>`,
    // door, ajar
    `<g><path d="M508 400 V150 L548 160 V400Z" fill="#3a2a1e"/><path d="M548 160 V400 L540 400 V164Z" fill="#07080c"/><circle cx="516" cy="290" r="3" fill="#c9952e"/></g>`,
  ),
  spots: (S) => [
    { id: 'bed', name: "Lucy's bed", x: 40, y: 290, w: 220, h: 110,
      look: 'Empty. The sheets are thrown back and quite cold.',
      act: 'She has been gone some time. I felt for her in the dark and found nothing.' },
    { id: 'window', name: 'Window', x: 300, y: 70, w: 200, h: 230,
      look: S.f['c2.seen'] ? 'Something long and black is bending over the white figure on our seat.' : 'Across the harbour, the ruined abbey on the East Cliff in bright moonlight.',
      act: (g) => { g.flag('c2.seen'); g.say('There, on our favourite seat, the moonlight strikes a half-reclining figure, snowy white.', 'A cloud passes. When it clears, I see something dark standing behind the seat and bending over it. Whether man or beast, I cannot tell.'); } },
    { id: 'shawl', name: 'Shawl on the chair', x: 550, y: 245, w: 50, h: 95, hidden: S.f['c2.shawl'],
      look: 'My heavy grey shawl.',
      act: (g) => { g.flag('c2.shawl'); g.give('shawl'); g.say('Lucy went out in nothing but her nightdress. I take the big shawl.'); } },
    { id: 'shoes', name: 'My shoes', x: 645, y: 380, w: 60, h: 24, hidden: S.f['c2.shoes'],
      look: 'My walking shoes.', act: (g) => { g.flag('c2.shoes'); g.give('shoes'); g.say('I put my shoes on. Her slippers are still under her bed. She has gone out barefoot.'); } },
    { id: 'pins', name: 'Pincushion', x: 690, y: 276, w: 40, h: 26, hidden: S.f['c2.pin'],
      look: 'My pincushion, stuck full of pins, with a great safety pin among them.', act: (g) => { g.flag('c2.pin'); g.give('pin'); g.say('I take the big safety pin.'); } },
    { id: 'door', name: 'Bedroom door', x: 505, y: 150, w: 46, h: 250,
      look: 'Shut but not locked. I locked it last night, I am sure of it.',
      act: (g) => {
        if (!g.has('c2.seen')) return g.say('Where would I even go? I must think where she would be.');
        if (!g.has('c2.shawl')) return g.say('It is bitter cold. Lucy has only her nightdress. I must take something warm for her.');
        g.say('I run down the stairs and out along the North Terrace, across the bridge and along the quay, and up the endless steps to the abbey.');
        g.go('c2yard');
      } },
  ],
  hint: (S) => !S.f['c2.seen'] ? 'Look out of the window.' : !S.f['c2.shawl'] ? 'Lucy will be cold. Take something warm.' : 'Take whatever you think you may need, then go out the door.',
});

G.scene({
  id: 'c2yard', title: "St. Mary's Churchyard, the East Cliff", doc: "Mina Murray's Journal · 11 August",
  art: (S) => A.svg(
    A.sky('#0c1222', '#273149'), A.stars(60, 21), A.moon(620, 80, 22),
    // abbey ruins
    `<g fill="#0a0d16"><path d="M470 300 v-160 l24 -40 l24 40 v160z M540 300 v-200 h30 v200z M600 300 v-130 a30 30 0 0 1 60 0 v130z M690 300 v-90 h16 v90z"/>
      <path d="M520 180 a20 20 0 0 1 20 -20 v40 h-20z" fill="#1a2238"/></g>`,
    // cliff and graves
    `<path d="M0 300 C 160 290 400 300 800 290 V500 H0Z" fill="#121726"/>`,
    A.grave(120, 360, 1.1, 'slab', '#1e2333'), A.grave(200, 340, .8), A.grave(640, 360, 1, 'cross', '#1e2333'), A.grave(720, 380, 1.2, 'round', '#1e2333'), A.grave(560, 340, .8, 'slab', '#1e2333'),
    // the steps
    `<g stroke="#2b3245" stroke-width="3">${[...Array(10)].map((_, i) => `<path d="M${20 + i * 6} ${500 - i * 18} h60"/>`).join('')}</g>`,
    // seat with Lucy
    `<g><rect x="300" y="380" width="180" height="10" fill="#2a2016"/><rect x="306" y="390" width="8" height="30" fill="#2a2016"/><rect x="466" y="390" width="8" height="30" fill="#2a2016"/><rect x="300" y="340" width="180" height="8" fill="#2a2016"/>
      <path d="M330 378 C 350 350 410 350 450 372 L452 382 H330Z" fill="${S.f['c2.wrap'] ? '#7c7f8c' : '#ecebe6'}"/><ellipse cx="342" cy="358" rx="13" ry="14" fill="#e8dfd6"/>
      <path d="M330 350 c-6 10 -4 24 4 30" stroke="#d7b980" stroke-width="7" fill="none"/>
      ${S.f['c2.shoesOn'] ? '<path d="M446 376 l14 2 v6 h-14z" fill="#3b2a1e"/>' : '<path d="M446 376 l14 2 v6 h-14z" fill="#e8dfd6"/>'}
      ${S.f['c2.climbed'] ? '' : A.count(390, 360, .55, { eyes: true, fill: '#05060a' }).replace('scale(0.55)', 'scale(0.55) rotate(-14 0 -60)')}</g>`,
    // mud
    `<ellipse cx="560" cy="440" rx="50" ry="10" fill="#0a0c12"/>`,
    A.fog(420, .3),
  ),
  spots: (S) => [
    { id: 'steps', name: 'The steps', x: 0, y: 330, w: 120, h: 170, hidden: S.f['c2.climbed'],
      look: 'The hundred and ninety-nine steps from the harbour to the church. I have never climbed them so fast.',
      act: (g) => { g.flag('c2.climbed'); g.say(['Mina', 'Lucy! Lucy!'], 'Something raises a head, and from where I stand I can see a white face and red, gleaming eyes.', 'By the time I reach the top of the steps and the churchyard, there is no one there but Lucy.'); } },
    { id: 'figure', name: 'Dark figure', x: 340, y: 280, w: 110, h: 90, hidden: S.f['c2.climbed'],
      look: 'Something long and black, bending over the half-reclining white figure.',
      act: 'It is too far. I must get up the steps.' },
    { id: 'lucy', name: 'Lucy', x: 320, y: 335, w: 145, h: 55,
      look: (g, S) => S.f['c2.climbed'] ? 'She is still asleep. Her lips are parted, and she is breathing in long, heavy gasps. She puts up her hand and pulls the collar of her nightdress close around her throat.' : 'A white figure on our seat.',
      act: (g) => {
        if (!g.has('c2.climbed')) return g.say('It is too far. I must get up the steps.');
        if (!g.has('c2.wrap')) return g.say('She shudders in the cold. I must cover her before I wake her, or the shock will be worse.');
        if (!g.has('c2.pinned')) return g.say('The shawl keeps slipping from her shoulders. It must be fastened at her throat.');
        if (!g.has('c2.shoesOn')) return g.say('Her feet are bare on the cold stones. I cannot let her walk home like that.');
        if (!g.has('c2.mud')) return g.say('If anyone meets us in the streets, they will see my bare feet and talk. Lucy\'s name must be kept out of this.');
        g.say(['Lucy', '(waking) Mina? Where am I? Oh, Mina, I did not know...'],
          'She clings to me. I tell her nothing, and we walk home through the empty town. We meet not a soul.',
          'In the morning I see two little red points on her throat, like pinpricks, with a drop of blood on the band of her nightdress. I must have pinched her skin with the safety pin. I am so clumsy.',
          'Lucy grows paler every day.',
          'Then a letter comes from a Sister Agatha in Buda-Pesth. Jonathan has been found. He has been in hospital six weeks with a violent brain fever. I am to go to him at once and marry him there.');
        g.endChapter('c3');
      },
      use: {
        shawl: (g) => { g.take('shawl'); g.flag('c2.wrap'); g.say('I fling the warm shawl over her shoulders and draw the edges close around her neck.'); },
        pin: (g) => { if (!g.has('c2.wrap')) return g.say('There is nothing to pin yet.'); g.take('pin'); g.flag('c2.pinned'); g.say('I fasten the shawl at her throat with the big safety pin. My hands are trembling. She puts her hand to her throat and moans.'); },
        shoes: (g) => { g.take('shoes'); g.flag('c2.shoesOn'); g.say('I put my own shoes on her feet. The gravel cuts mine.'); },
      } },
    { id: 'mud', name: 'Puddle of mud', x: 505, y: 425, w: 110, h: 30,
      look: 'A patch of wet ground where the rain has pooled.',
      act: (g) => { if (!g.has('c2.shoesOn')) return g.say('Why would I step in it? My shoes would be ruined.'); g.flag('c2.mud'); g.say('I daub my bare feet with mud, so that anyone we pass will not notice I have no shoes.'); } },
    { id: 'abbey', name: 'The ruined abbey', x: 460, y: 90, w: 220, h: 200,
      look: 'The ruins of Whitby Abbey. Lucy loves it here. I have begun to hate it.', act: 'There is nobody among the ruins. Whatever it was has gone.' },
  ],
  hint: (S) => !S.f['c2.climbed'] ? 'Climb the steps toward Lucy.' : !S.f['c2.wrap'] ? 'Cover Lucy with what you brought.' : !S.f['c2.pinned'] ? 'The shawl needs fastening. Did you bring a pin? If not, go back.' : !S.f['c2.shoesOn'] ? 'Lucy is barefoot. You are not.' : !S.f['c2.mud'] ? 'Hide your own bare feet from gossips.' : 'Wake Lucy and take her home.',
});

/* allow returning home for forgotten items */
(() => {
  const d = G._scenes.c2yard, base = d.spots;
  d.spots = (S, g) => base(S, g).concat([{ id: 'home', name: 'Back to the Crescent', x: 720, y: 430, w: 80, h: 70,
    look: 'The way back down the cliff.', act: (g2) => {
      if (S.f['c2.wrap'] && S.f['c2.pinned']) return g2.say('I will not leave her alone again.');
      g2.say('I run back down to fetch what I forgot. Lucy will not wake; she sleeps so deeply.'); g2.go('c2room'); } }]);
  const room = G._scenes.c2room, rb = room.spots;
  room.spots = (S, g) => rb(S, g);
})();
