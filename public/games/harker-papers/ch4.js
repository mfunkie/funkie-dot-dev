'use strict';
/* Chapter 4 — Dr. Seward's Diary, the Bloofer Lady */
G.chapter({
  id: 'c4', title: 'The Bloofer Lady', doc: "Dr. Seward's Diary", date: 'Kingstead churchyard, 28–29 September',
  intro: [
    'A week after we buried Lucy, the Westminster Gazette began to report small children going missing on Hampstead Heath and coming home the next morning, weak, with tiny wounds on their throats. They say a "bloofer lady" asked them to walk with her.',
    'Van Helsing has told me what he believes. I told him he was mad. He answered that he would rather I believed it with my eyes than with my ears.',
    'Tonight Arthur and Quincey Morris have come with us to the Westenra tomb. Arthur has given his word to trust the Professor, though it is breaking his heart.',
  ],
  opening: 'The Westenra tomb, after midnight. Van Helsing locks the door behind us and sets down his bag.',
  start: 'c4vault', inv: ['candleI'],
});

const vaultArt = (S) => A.svg(
  `<rect width="800" height="500" fill="#101116"/><rect width="800" height="380" fill="url(#stone)" opacity="${S.f['c4.day'] ? .9 : .55}"/>`,
  S.f['c4.day'] ? `<path d="M380 0 h40 l60 500 h-160z" fill="#d8d0b8" opacity=".08"/>` : '',
  `<rect y="380" width="800" height="120" fill="#1a1a1e"/>`,
  // shelves with old coffins
  `<g fill="#2a221a"><rect x="20" y="120" width="160" height="40"/><rect x="20" y="220" width="160" height="40"/><rect x="620" y="120" width="160" height="40"/><rect x="620" y="220" width="160" height="40"/></g>
   <g fill="#1a1612"><rect x="20" y="160" width="160" height="10"/><rect x="20" y="260" width="160" height="10"/><rect x="620" y="160" width="160" height="10"/><rect x="620" y="260" width="160" height="10"/></g>`,
  // dead flowers
  `<g fill="#6a5e48"><circle cx="300" cy="372" r="5"/><circle cx="312" cy="374" r="4"/><circle cx="500" cy="370" r="5"/></g>`,
  // Lucy's coffin on trestles
  `<g transform="translate(400 380)"><rect x="-160" y="0" width="12" height="60" fill="#2a221a"/><rect x="148" y="0" width="12" height="60" fill="#2a221a"/>
    <path d="M-170 0 L-150 -50 H150 L170 0Z" fill="#3e2c1e"/><path d="M-170 0 H170 V20 H-170Z" fill="#2b1f14"/>
    ${S.f['c4.lid'] ? `<path d="M-150 -50 H150 L140 -6 H-140Z" fill="#7d8088"/>` : `<path d="M-150 -50 H150 L170 0 H-170Z" fill="#4a3624"/><path d="M-6 -42 h12 M0 -46 v12" stroke="#c9952e" stroke-width="2.5"/>`}
    ${S.f['c4.lead'] ? `<path d="M-130 -44 H130 L124 -8 H-124Z" fill="#0b0b0e"/>` : ''}
    ${S.f['c4.day'] ? `<path d="M-120 -40 C -60 -60 60 -50 110 -30 L112 -12 H-120Z" fill="#ece8e0"/><ellipse cx="-104" cy="-28" rx="13" ry="12" fill="#efe2da"/><path d="M-118 -36 c-6 10 -4 18 2 24" stroke="#d7b980" stroke-width="7" fill="none"/><path d="M-100 -22 q4 2 8 0" stroke="#b0141c" stroke-width="2.5"/>` : ''}
  </g>`,
  // companions
  A.person(130, 450, 1.1, '#15161c', { face: '#d8c0a8', extra: '<path d="M-10 -100 c4 -10 16 -10 20 0" stroke="#bfbfbf" stroke-width="5" fill="none"/>' }),
  A.person(680, 455, 1.15, '#191b22', { face: '#d0b49a', hat: true }),
  A.person(740, 450, 1.1, '#1d1a16', { face: '#c9a88a', extra: '<path d="M-20 -104 h40 l-6 -6 h-28z" fill="#3a2a1a"/>' }),
  // bag
  S.f['c4.bag'] ? '' : `<g><path d="M190 470 v-34 c0 -14 70 -14 70 0 v34z" fill="#2a1d14"/><path d="M205 436 c0 -14 40 -14 40 0" stroke="#1a120b" stroke-width="4" fill="none"/></g>`,
  S.f['c4.day'] ? '' : A.candle(400, 300, .9),
);

G.scene({
  id: 'c4vault', title: 'Inside the Westenra tomb', doc: "Dr. Seward's Diary · 28 September",
  art: vaultArt,
  spots: (S) => {
    const day = S.f['c4.day'];
    const L = [
      { id: 'coffin', name: day ? 'Lucy' : 'Lucy\'s coffin', x: 230, y: 320, w: 340, h: 90,
        look: day ? 'She lies as on the night of her death, more radiantly beautiful than ever. The lips are crimson. Between them, the teeth are long and sharp.' :
          S.f['c4.empty'] ? 'Empty. The lead lining is cut, and there is nothing inside but the pillow.' : S.f['c4.lid'] ? 'Under the wooden lid, the leaden coffin is sealed.' : 'Lucy\'s coffin, with its brass plate and handles. The flowers on it have withered.',
        act: (g) => {
          if (day) return g.say('I cannot look at her. Arthur cannot look away.');
          if (S.f['c4.empty']) return g.say(['Arthur', 'Where is she? Professor, where is Lucy?'], ['Van Helsing', 'Not here. Not tonight. Come, we wait outside.']);
          g.say('It is screwed down fast. Van Helsing\'s bag will have something.');
        },
        use: {
          screwdriver: (g) => { if (S.f['c4.lid']) return g.say('The lid is already off.'); g.flag('c4.lid'); g.say('I unscrew the coffin lid and lift it away. Inside, the lead.', ['Arthur', 'Professor, is this a joke you are playing on me? I am trusting you a long way.']); },
          saw: (g) => {
            if (!S.f['c4.lid']) return g.say('The wooden lid is in the way.');
            if (S.f['c4.empty']) return g.say('It is already open.');
            g.take('saw'); g.take('screwdriver'); g.flag('c4.empty');
            g.say('I drive a hole in the lead with the turnscrew, then saw down one side and across. Van Helsing bends back the flap and holds the candle in.',
              'The coffin is empty.', ['Quincey', 'Professor, I\'ve been in some tight places. But I never saw anything like this.']);
          },
          candleI: 'There is light enough. I just do not like what it shows.',
          stake: day ? 'Not me. It must be done by the hand that loved her most.' : undefined,
        } },
      { id: 'vh', name: 'Van Helsing', x: 100, y: 330, w: 64, h: 130,
        look: 'He is calm. Too calm.',
        act: (g) => {
          if (day && !S.f['c4.tools']) { g.flag('c4.tools'); g.give('stake'); g.give('hammer'); return g.say(['Van Helsing', 'Here is the stake, and here the hammer. Give them to Arthur, John. It must be his hand, for in that hand she will be most at peace.']); }
          if (day) return g.say(['Van Helsing', 'Give them to Arthur.']);
          g.say(['Van Helsing', 'Open it, friend John. Do not ask me to show you. I want you to show yourself.']);
        } },
      { id: 'arthur', name: 'Arthur Holmwood', x: 650, y: 335, w: 60, h: 125,
        look: day ? 'Lord Godalming. His face is white as hers. His hands are steady.' : 'Arthur, now Lord Godalming. He buried his father and his fiancée in the same month.',
        act: (g) => g.say(['Arthur', day ? 'Tell me what I am to do.' : 'I swore to trust him. God knows I am trying.']),
        use: day ? {
          stake: (g) => { g.take('stake'); g.flag('c4.stake'); g.say('I hand Arthur the stake. He takes it in his left hand, the point over her heart.'); },
          hammer: (g) => {
            if (!S.f['c4.stake']) return g.say('The stake first.');
            g.take('hammer');
            g.say('Arthur strikes with all his might.',
              'The thing in the coffin writhes, and a hideous, blood-curdling screech comes from the opened red lips. But Arthur never falters. He looks like a figure of Thor as his untrembling arm rises and falls.',
              'Then the writhing stops. And there in the coffin lies Lucy as we had seen her in life, with her face of unequalled sweetness and purity.',
              ['Van Helsing', 'Now, Arthur my friend, dear lad, am I not forgiven? You may kiss her. She is not a grinning devil now.'],
              'Arthur bends and kisses her. Van Helsing and I do what is left to do, and solder the lead.',
              ['Van Helsing', 'One step of our work is done. But there remains a greater task. To find out the author of all this, and to stamp him out.']);
            g.endChapter('c5');
          },
        } : undefined },
      { id: 'quincey', name: 'Quincey Morris', x: 712, y: 335, w: 60, h: 125,
        look: 'Quincey Morris of Texas. He gave Lucy his blood too. He carries a bowie knife and has opinions about wolves.',
        act: (g) => g.say(['Quincey', day ? 'I\'ll stand by Art, whatever comes.' : 'I\'m with the Professor. I don\'t know what\'s happening, but I\'m with him.']) },
    ];
    if (!S.f['c4.bag']) L.push({ id: 'bag', name: 'Van Helsing\'s bag', x: 185, y: 420, w: 80, h: 52,
      look: 'His bag of instruments.', act: (g) => { g.flag('c4.bag'); g.give('screwdriver'); g.give('saw'); g.say('Inside: a turnscrew, a fret-saw, a dark lantern, wax candles, and a little envelope he will not let me touch. I take the turnscrew and the saw.'); } });
    if (!day) L.push({ id: 'door', name: 'Tomb door', x: 360, y: 90, w: 80, h: 160,
      look: 'An iron-bound door with a grating, locked from inside.',
      act: (g) => { if (!S.f['c4.empty']) return g.say(['Van Helsing', 'Not yet, John. First you shall see.']); g.go('c4yard'); } });
    return L;
  },
  hint: (S) => S.f['c4.day'] ? (!S.f['c4.tools'] ? 'Speak to Van Helsing.' : 'Give what you carry to Arthur, stake first.') : !S.f['c4.bag'] ? 'Look in Van Helsing\'s bag.' : !S.f['c4.lid'] ? 'Use the turnscrew on the coffin.' : !S.f['c4.empty'] ? 'Saw through the lead.' : 'Go out through the tomb door.',
});
/* draw the door in the night vault */
(() => { const d = G._scenes.c4vault, a = d.art; d.art = (S) => a(S).replace('<rect y="380"', `${S.f['c4.day'] ? '' : '<path d="M360 250 V130 a40 40 0 0 1 80 0 V250Z" fill="#2a2016"/><path d="M380 150 h40 M380 170 h40 M380 190 h40 M390 140 v60 M410 140 v60" stroke="#0a0a0c" stroke-width="3"/>'}<rect y="380"`); })();

G.scene({
  id: 'c4yard', title: 'Kingstead churchyard', doc: "Dr. Seward's Diary · 28 September",
  art: (S) => A.svg(
    A.sky('#0b1020', '#1d2438'), A.stars(50, 33), A.moon(140, 80, 18),
    `<g fill="#070910"><path d="M560 300 C 540 200 600 120 620 60 C 640 120 700 200 680 300Z"/><path d="M700 310 C 690 230 730 160 744 110 C 760 160 790 230 780 310Z"/><path d="M40 310 C 30 240 70 170 84 120 C 100 170 130 240 120 310Z"/></g>`,
    `<path d="M0 300 C 200 290 600 296 800 300 V500 H0Z" fill="#10131c"/>`,
    // tomb
    `<g><path d="M260 380 V200 L400 150 L540 200 V380Z" fill="#2a2e38"/><path d="M250 205 L400 145 L550 205" stroke="#3a3f4b" stroke-width="10" fill="none"/>
      <path d="M360 380 V270 a40 40 0 0 1 80 0 V380Z" fill="#14161c"/>
      ${S.f['c4.sealed'] && !S.f['c4.unsealed'] ? '<path d="M360 380 V270 a40 40 0 0 1 80 0 V380" fill="none" stroke="#e8e0c8" stroke-width="3"/>' : ''}
      <text x="400" y="235" text-anchor="middle" font-family="Georgia" font-size="13" fill="#6b7080" letter-spacing="3">WESTENRA</text></g>`,
    A.grave(120, 420, 1.1, 'cross', '#1c202c'), A.grave(660, 430, 1, 'round', '#1c202c'), A.grave(200, 450, .9, 'slab', '#1c202c'),
    A.person(310, 470, 1, '#13141a', { face: '#d8c0a8' }), A.person(500, 474, 1.05, '#191b22', { face: '#d0b49a', hat: true }), A.person(560, 470, 1, '#1d1a16', { face: '#c9a88a' }),
    // Lucy, the Bloofer Lady
    S.f['c4.lucy'] && !S.f['c4.unsealed'] ? `<g transform="translate(${S.f['c4.recoil'] ? 410 : 640} 400)"><path d="M-16 -80 C -24 -40 -30 -10 -34 0 H34 C30 -10 24 -40 16 -80Z" fill="#e8e6e0"/><path d="M-20 -86 c0 -8 40 -8 40 0 l-4 10 h-32z" fill="#e8e6e0"/><ellipse cy="-98" rx="10" ry="12" fill="#efe2da"/><path d="M-12 -106 c-8 14 -6 30 0 38 M12 -106 c8 14 6 30 0 38" stroke="#d7b980" stroke-width="7" fill="none"/><path d="M-4 -91 q4 3 8 0" stroke="#b0141c" stroke-width="2.5"/><path d="M-3 -88 v6 M3 -88 v6" stroke="#8a0f15" stroke-width="1.5"/>
      ${S.f['c4.child'] ? '' : `<g transform="translate(${S.f['c4.recoil'] ? 40 : -20} ${S.f['c4.recoil'] ? 0 : -40})"><ellipse rx="14" ry="9" fill="#bfb8a8"/><circle cx="12" cy="-4" r="6" fill="#e8d8c8"/></g>`}</g>` : '',
    A.fog(440, .3),
  ),
  onEnter: (g) => {
    g.flag('c4.sealed');
    g.say('Outside, Van Helsing takes from his envelope something like a thin, wafer-like biscuit, crumbles it into powder, and kneads it into a mass of putty with a little dough.',
      'He rolls it into thin strips and presses them into every crack between the door and its setting.',
      ['Seward', 'What is that you are using?'], ['Van Helsing', 'The Host. I brought it from Amsterdam. I have an Indulgence.'],
      'We are each set behind a yew tree, to wait.');
  },
  spots: (S) => {
    const L = [
      { id: 'yews', name: 'The yew trees', x: 540, y: 60, w: 260, h: 250,
        look: 'Black yews. Something white moves among them.',
        act: (g) => {
          if (S.f['c4.lucy']) return g.say('There is no more waiting. She is here.');
          g.flag('c4.lucy');
          g.say('Far down the avenue of yews, a dim white figure comes towards us, holding something dark at its breast.',
            'As it comes into the moonlight, we see that it is Lucy. Lucy Westenra, but how changed. The sweetness is turned to adamantine, heartless cruelty, and the purity to voluptuous wantonness.',
            'She is holding a child. Her lips are crimson with fresh blood.',
            ['Lucy', 'Come to me, Arthur. Leave these others and come to me. My arms are hungry for you. Come, and we can rest together. Come, my husband, come!'],
            'Arthur opens his arms and steps forward like a man in a dream.');
        } },
      { id: 'vh', name: 'Van Helsing', x: 275, y: 360, w: 60, h: 115,
        look: 'He has given me his little golden crucifix to hold.',
        act: (g) => {
          if (!g.hasItem('crucifix') && !S.f['c4.recoil']) { g.give('crucifix'); return g.say(['Van Helsing', 'Take this, John. When she comes, between her and Arthur. Hold it up.']); }
          if (S.f['c4.recoil'] && S.f['c4.child'] && !S.f['c4.unsealed']) {
            g.flag('c4.unsealed');
            return g.say(['Van Helsing', 'Answer me, oh my friend! Am I to proceed in my work?'],
              ['Arthur', '(groaning) Do as you will, friend. Do as you will. There can be no horror like this ever any more.'],
              'Van Helsing takes away some of the putty from the door. We all see with horror how the woman, with a corporeal body as real as our own, passes through the interstice where scarce a knife-blade could have gone.',
              'Van Helsing fills the crack again. We go home. Tomorrow, at noon, we come back.',
              () => { g.flag('c4.day'); g.flag('seen:c4vault'); },
              'The next afternoon. Inside the tomb, by daylight.');
          }
          if (S.f['c4.recoil']) return g.say(['Van Helsing', 'The child first, John.']);
          g.say(['Van Helsing', 'Be ready.']);
        } },
      { id: 'tomb', name: 'Tomb door', x: 355, y: 260, w: 90, h: 120,
        look: S.f['c4.sealed'] ? 'Every crack is filled with the pale putty.' : 'The tomb door.',
        act: 'Sealed. Nothing that she has become can pass the Host.' },
    ];
    if (S.f['c4.lucy'] && !S.f['c4.unsealed']) L.push({ id: 'lucy', name: 'Lucy', x: S.f['c4.recoil'] ? 370 : 600, y: 280, w: 80, h: 120,
      look: 'Her eyes are unclean and full of hell-fire, instead of the pure, gentle orbs we knew.',
      act: S.f['c4.recoil'] ? 'She stands at the sealed door, baffled, turning her face to us with a look of baffled malice.' : 'Arthur is walking towards her. I have to stop this.',
      use: { crucifix: (g) => {
        if (S.f['c4.recoil']) return g.say('She cannot pass it. She cannot pass the door either.');
        g.flag('c4.recoil');
        g.say('I spring between them, holding the little golden crucifix up before her.',
          'She recoils, and with a suddenly distorted face, full of rage, dashes past to enter the tomb.',
          'Within a foot or two of the door she stops, as if arrested by some irresistible force. She has flung the child to the ground, callous as a devil.');
      } } });
    if (S.f['c4.recoil'] && !S.f['c4.child']) L.push({ id: 'child', name: 'The child', x: 430, y: 380, w: 50, h: 40,
      look: 'A little thing, crying weakly.', act: (g) => { g.flag('c4.child'); g.say('I snatch up the child. It is cold but breathing, and there are no marks on its throat. Quincey runs it down to the Heath, where a policeman will find it.'); } });
    if (S.f['c4.day']) L.push({ id: 'enter', name: 'Into the tomb', x: 355, y: 260, w: 90, h: 120, act: (g) => g.go('c4vault') });
    return L.filter(h => !(S.f['c4.day'] && h.id === 'tomb'));
  },
  hint: (S) => S.f['c4.day'] ? 'Go into the tomb.' : !g4cru(S) ? 'Speak to Van Helsing.' : !S.f['c4.lucy'] ? 'Watch the yew trees.' : !S.f['c4.recoil'] ? 'Hold the crucifix up to Lucy.' : !S.f['c4.child'] ? 'Save the child.' : 'Van Helsing has a question for Arthur.',
});
function g4cru(S) { return S.inv.includes('crucifix') || S.f['c4.recoil']; }
