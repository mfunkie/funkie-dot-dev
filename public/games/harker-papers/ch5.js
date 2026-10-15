'use strict';
/* Chapter 5 — Carfax, Renfield, and the night of 3 October */
G.chapter({
  id: 'c5', title: 'Earth from Transylvania', doc: "Jonathan Harker's Journal", date: 'Purfleet, 1–3 October',
  intro: [
    'Mina and I were married in Buda-Pesth, and now we are home. She has typed out my journal, Seward\'s phonograph diary, Lucy\'s letters and every cutting she could find, and put them all in order. Read together, they are proof.',
    'Fifty boxes of earth came to Whitby on the Demeter. All fifty were carted to Carfax, the house I sold him, next door to Dr. Seward\'s asylum. In each box he can rest by day.',
    'We have agreed, for her safety, that Mina will take no further part. Tonight the four of us go into Carfax.',
  ],
  opening: 'The old chapel at Carfax. My own key from the purchase still fits the lock.',
  start: 'c5chapel', inv: ['host', 'whistle'],
});

G.scene({
  id: 'c5chapel', title: 'The chapel at Carfax', doc: "Jonathan Harker's Journal · 1 October",
  art: (S) => A.svg(
    `<rect width="800" height="500" fill="#0d0e12"/><rect width="800" height="340" fill="url(#stone)" opacity=".5"/>`,
    A.archWindow(340, 50, 120, 190, '#121a2e'),
    `<g stroke="#2b2f3a" stroke-width="1" opacity=".6"><path d="M20 20 l60 40 M20 20 l30 60 M20 20 l70 10 M40 34 l20 -10 l10 20"/><path d="M780 30 l-60 40 M780 30 l-20 60"/></g>`,
    `<rect y="340" width="800" height="160" fill="#171410"/>`,
    [[120, 400], [220, 420], [580, 420], [690, 400], [170, 470], [640, 470], [330, 380], [470, 380], [400, 450]].map(([x, y]) => A.box(x, y, .8 + (y - 380) / 300, { cross: S.f['c5.purified'] })).join(''),
    // rats
    S.f['c5.rats'] && !S.f['c5.dogs'] ? `<g fill="#05060a">${[...Array(70)].map((_, i) => { const r = A.rng(i + 200); const x = r() * 800, y = 360 + r() * 140; return `<ellipse cx="${x}" cy="${y}" rx="7" ry="3.5"/><circle cx="${x + 5}" cy="${y - 1}" r=".9" fill="#ff5a3c"/>`; }).join('')}</g>` : '',
    S.f['c5.dogs'] ? `<g fill="#c9b89a">${[[280, 470], [520, 476], [380, 488]].map(([x, y]) => `<path d="M${x - 20} ${y} l4 -16 c6 -8 24 -8 32 -4 l8 -8 4 8 6 4 -6 4 -2 12 h-4 l-2 -8 h-20 l-2 8z"/>`).join('')}</g>` : '',
    A.person(60, 470, 1, '#15161c', { face: '#d8c0a8' }), A.person(740, 470, 1.05, '#191b22', { face: '#d0b49a', hat: true }),
    A.fog(460, .2),
  ),
  onEnter: (g) => g.flag('c5.rats').say('The air is close and foul, earthy, with something sour under it. Dust lies inches deep. Then our lamps catch a thousand little points of light.', 'Rats. The floor is alive with them, pouring out of the walls towards us. Quincey swears.'),
  spots: (S) => [
    { id: 'rats', name: 'Rats', x: 0, y: 360, w: 800, h: 140, hidden: !S.f['c5.rats'] || S.f['c5.dogs'],
      look: 'Hundreds. Thousands. He can command the meaner things: the rat, the owl, the bat, the fox and the wolf.',
      act: 'I kick at them. More come.',
      use: { whistle: (g) => { g.take('whistle'); g.flag('c5.dogs'); g.say('Arthur blows a low, shrill call on his whistle. From behind the house come three of his terriers, dashing round the corner.', 'They rush in at the rats, tossing them in the air and snapping their backs. In minutes the floor is clear, and it is as if some evil presence has gone with them.'); },
        host: 'Van Helsing stops me. "Not on vermin, Jonathan. Keep it for what it is for."' } },
    { id: 'boxes', name: 'Boxes of earth', x: 60, y: 330, w: 680, h: 140, hidden: S.f['c5.rats'] && !S.f['c5.dogs'],
      look: S.f['c5.purified'] ? 'Each box holds a fragment of the Host now. He can never rest in them again.' : S.f['c5.counted'] ? 'Twenty-nine. Twenty-one boxes have been taken away.' : 'The great boxes, exactly as I saw them in the castle chapel.',
      act: (g) => { if (S.f['c5.counted']) return g.say('Twenty-nine. I count again. Twenty-nine.'); g.flag('c5.counted'); g.say('I count them twice. There are only twenty-nine left of the fifty. Twenty-one are somewhere else in London.'); },
      use: { host: (g) => {
        if (!S.f['c5.counted']) return g.say('First we need to know how many there are.');
        if (S.f['c5.purified']) return g.say('It is done.');
        g.flag('c5.purified');
        g.say('We open each box in turn. Van Helsing lays a piece of the Sacred Wafer on the earth inside, and we close it again.', ['Van Helsing', 'So. Twenty-nine of his refuges are now no more refuges. Where are the other twenty-one?']);
      } } },
    { id: 'vh', name: 'Van Helsing', x: 30, y: 360, w: 60, h: 110, look: 'He carries the Host in a little envelope against his heart.',
      act: (g) => g.say(['Van Helsing', S.f['c5.purified'] ? 'Home now, to sleep. Our dear Madam Mina is safe at the asylum, and knows nothing. That is best.' : 'Count the boxes, Jonathan. Then we make each one useless to him.']) },
    { id: 'door', name: 'Chapel door', x: 700, y: 330, w: 80, h: 140,
      look: 'The way out.',
      act: (g) => {
        if (!S.f['c5.purified']) return g.say('Not until the work is done.');
        g.say('We go back to the asylum at dawn. Mina is asleep and very pale. I think she has been crying.',
          'Two nights later. I sleep heavily, more heavily than I should. Dr. Seward will tell what happened next.');
        g.go('c5cell');
      } },
  ],
  hint: (S) => S.f['c5.rats'] && !S.f['c5.dogs'] ? 'Arthur\'s dogs are outside. You have his whistle.' : !S.f['c5.counted'] ? 'Count the boxes.' : !S.f['c5.purified'] ? 'Use the Sacred Wafer on the boxes.' : 'Leave by the chapel door.',
});

G.scene({
  id: 'c5cell', title: "Renfield's room", doc: "Dr. Seward's Diary · 3 October",
  art: (S) => A.svg(
    `<rect width="800" height="500" fill="#1d1f24"/><rect width="800" height="500" fill="#2a2d33" opacity=".5"/>`,
    `<g><rect x="520" y="80" width="120" height="150" fill="#0e1426"/><path d="M520 80 H640 V230 H520Z M550 80 V230 M580 80 V230 M610 80 V230" fill="none" stroke="#3a3d44" stroke-width="5"/></g>`,
    `<rect y="380" width="800" height="120" fill="#24262b"/>`,
    `<g><rect x="60" y="330" width="220" height="16" fill="#3a3a3a"/><rect x="64" y="346" width="8" height="40" fill="#2a2a2a"/><rect x="268" y="346" width="8" height="40" fill="#2a2a2a"/></g>`,
    // Renfield on the floor
    `<g transform="translate(400 420)"><path d="M-110 0 C -80 -16 40 -20 90 -10 L92 6 H-110Z" fill="#c9c2b2"/><ellipse cx="-110" cy="-6" rx="16" ry="14" fill="#d8c0a8"/><path d="M-124 -4 c-8 6 -6 16 4 18" fill="#8a1c22"/><path d="M-60 6 c30 4 60 0 100 6" stroke="#6a1015" stroke-width="5" opacity=".7" fill="none"/></g>`,
    A.person(620, 450, 1.05, '#15161c', { face: '#d8c0a8', extra: '<path d="M-10 -100 c4 -10 16 -10 20 0" stroke="#bfbfbf" stroke-width="5" fill="none"/>' }),
    `<g fill="#0a0a0c">${[...Array(8)].map((_, i) => `<circle cx="${130 + i * 17}" cy="${318 - (i % 3) * 3}" r="2"/>`).join('')}</g>`,
  ),
  onEnter: (g) => g.say('The attendant woke me. Renfield has been found on the floor of his room in a pool of blood. His back is broken, and his face is beaten as though it had been struck against the floor.', 'Van Helsing operates at once to relieve the pressure on the brain. For a few minutes, Renfield is lucid.'),
  spots: (S) => [
    { id: 'renfield', name: 'Renfield', x: 270, y: 380, w: 230, h: 60,
      look: 'R. M. Renfield, aged fifty-nine. Sanguine temperament, great physical strength. For months he ate flies, then fed flies to spiders and spiders to sparrows, so that he could eat the sparrows and take in their lives.',
      act: (g) => {
        if (S.f['c5.told']) return g.say('He is gone.');
        g.flag('c5.told');
        g.say(['Renfield', 'He came up to the window in the mist, as I had seen him often before. He promised me rats. Millions of rats, and dogs, and cats. All lives! All red blood, with years of life in it!'],
          ['Renfield', 'And I asked him in. I said, "Come in, Lord and Master!"'],
          ['Renfield', 'But Mrs. Harker came to see me this afternoon, and she was not the same. She was like tea after the teapot has been watered.'],
          ['Renfield', 'When he came tonight, I knew he had been taking the life out of her. I grabbed him. I held on, and his eyes... they burned into me... and my strength became like water.'],
          ['Renfield', 'He slid away and went up. Go to her. Quick! He is there now.'],
          'His breath stops.');
      } },
    { id: 'vh', name: 'Van Helsing', x: 590, y: 340, w: 64, h: 115, look: 'His hands are red to the wrist.',
      act: (g) => S.f['c5.told'] ? g.say(['Van Helsing', 'Quick, John! The Harkers\' room! Bring the Wafer, and your crucifix!']) : g.say(['Van Helsing', 'Let him speak. Quickly, man, before he goes.']) },
    { id: 'door', name: 'Corridor', x: 0, y: 140, w: 60, h: 260,
      look: 'The corridor to the stairs. The Harkers\' room is above.',
      act: (g) => { if (!S.f['c5.told']) return g.say('Renfield is trying to speak.'); g.say('We run up the stairs. Arthur and Quincey come out of their rooms in their nightclothes, and we all arrive at the Harkers\' door together.'); g.go('c5mina'); } },
    { id: 'window', name: 'Barred window', x: 520, y: 80, w: 120, h: 150,
      look: 'Barred. Nothing living could pass through. The window is open a crack.', act: 'The bars are firm.' },
  ],
  hint: (S) => !S.f['c5.told'] ? 'Listen to Renfield.' : 'Go to the corridor.',
});

G.scene({
  id: 'c5mina', title: "The Harkers' bedroom", doc: "Dr. Seward's Diary · 3 October",
  art: (S) => A.svg(
    `<rect width="800" height="500" fill="#14151c"/>`,
    `<g><rect x="80" y="70" width="160" height="230" fill="#18203a"/>${A.moon(170, 120, 14)}${S.f['c5.gone'] ? '<rect x="80" y="70" width="160" height="230" fill="#000" opacity=".5"/>' : ''}<path d="M80 70 H240 V300 H80Z M160 70 V300 M80 185 H240" fill="none" stroke="#0b0b10" stroke-width="7"/></g>`,
    `<rect y="400" width="800" height="100" fill="url(#boards)"/>`,
    // bed with Jonathan
    `<g><rect x="460" y="320" width="300" height="80" fill="#3a2c22"/><path d="M470 314 h280 v24 h-280z" fill="#d8d2c4"/><ellipse cx="700" cy="304" rx="16" ry="14" fill="#d8bfa8"/><path d="M690 296 c4 -8 22 -8 24 0" stroke="#5a4030" stroke-width="6" fill="none"/></g>`,
    S.f['c5.open'] ? '' : `<rect width="800" height="500" fill="#000" opacity=".55"/>`,
    // the Count and Mina
    S.f['c5.gone'] ? `<g fill="#d8dde6" opacity=".35" filter="url(#blur2)"><path d="M300 400 c40 -10 80 6 120 -4 c-30 14 -80 10 -120 4z"/></g>
       <g transform="translate(330 400)"><path d="M-30 0 C -26 -40 -20 -70 -14 -84 h28 c6 14 12 44 16 84z" fill="#e8e6e0"/><ellipse cy="-98" rx="10" ry="12" fill="#e4d6cc"/><path d="M-12 -104 c-6 10 -6 26 0 34 M12 -104 c6 10 6 26 0 34" stroke="#5a3a24" stroke-width="7" fill="none"/>${S.f['c5.burn'] ? '<path d="M-5 -106 l10 0" stroke="#8a1c22" stroke-width="3"/>' : ''}<path d="M-10 -40 c6 -4 14 -4 20 0" stroke="#8a0f15" stroke-width="4"/></g>` :
      `${A.count(390, 400, 1.15, { eyes: S.f['c5.open'], fill: '#06070b' })}
       <g transform="translate(340 400)"><path d="M-26 0 C -22 -40 -18 -70 -12 -84 h26 c6 14 10 44 14 84z" fill="#e8e6e0"/><ellipse cx="18" cy="-96" rx="10" ry="12" fill="#e4d6cc" transform="rotate(30 18 -96)"/><path d="M8 -104 c-6 10 -6 26 0 34" stroke="#5a3a24" stroke-width="7" fill="none"/></g>
       <path d="M370 -0" /><path d="M374 290 l-20 10" stroke="#c9c3b3" stroke-width="5"/>`,
    S.f['c5.open'] ? A.person(560, 470, 1, '#15161c', { face: '#d8c0a8', extra: '<path d="M-10 -100 c4 -10 16 -10 20 0" stroke="#bfbfbf" stroke-width="5" fill="none"/>' }) + A.person(620, 476, 1.05, '#191b22', { face: '#d0b49a' }) : '',
  ),
  spots: (S) => {
    const L = [];
    if (!S.f['c5.open']) L.push({ id: 'door', name: 'The bedroom door', x: 0, y: 0, w: 800, h: 500,
      look: 'Locked.', act: (g) => {
        if (!S.f['c5.try']) { g.flag('c5.try'); return g.say('The door is locked. Van Helsing looks at us, and we all nod.', ['Van Helsing', 'Shall we wake them? No. Together, my friends. Now!']); }
        g.flag('c5.open');
        g.say('We throw ourselves at the door together. It bursts open, and we almost fall headlong into the room.',
          'The moonlight is so bright that through the thick yellow blind the room is light enough to see.',
          'On the bed beside the window lies Jonathan Harker, his face flushed and breathing heavily as though in a stupor.',
          'Kneeling on the near edge of the bed, facing outwards, is the white-clad figure of his wife. By her side stands a tall, thin man, clad in black.',
          'With his left hand he holds both Mrs. Harker\'s hands. His right hand grips her by the back of the neck, forcing her face down on his bosom. A thin stream of blood trickles from his bare breast.');
      } });
    else if (!S.f['c5.gone']) L.push({ id: 'count', name: 'The Count', x: 320, y: 250, w: 140, h: 150,
      look: 'His eyes flame red with devilish passion. The great nostrils of the white aquiline nose open wide and quiver at the edges.',
      act: 'He turns towards us. If I go near him without protection, I am finished.',
      use: { host: (g) => {
        g.flag('c5.gone');
        g.say('Van Helsing and I advance on him together, the envelope with the Sacred Wafer held out before us.',
          'The Count stops, just as poor Lucy had done outside the tomb, and cowers back. Further and further back he cowers, as we lift our crucifixes and advance.',
          'A great black cloud sails across the moon. When the gaslight flares up under Quincey\'s match, we see nothing but a faint vapour. It trails under the door.',
          'Mrs. Harker draws breath and gives a scream so wild, so ear-piercing, so despairing, that it will ring in my ears till my dying day.');
      } } });
    else L.push({ id: 'mina', name: 'Mina Harker', x: 290, y: 290, w: 80, h: 110,
      look: 'Her face is ghastly, with a pallor accentuated by the blood which smears her lips and cheeks and chin.',
      act: (g) => {
        g.say(['Mina', 'Unclean, unclean! I must touch him or kiss him no more.'],
          'Jonathan wakes and learns everything. She tells it calmly. The Count made her drink from a cut in his breast. "Flesh of my flesh," he called her. "My bountiful wine-press for a while."',
          'In the morning, Van Helsing touches the Wafer to her forehead to protect her. It sears her skin like white-hot metal. There is a red scar where it touched.',
          ['Mina', 'Unclean! Even the Almighty shuns my polluted flesh! I must bear this mark of shame upon my forehead until the Judgment Day.']);
        g.endChapter('c6');
      } });
    L.push({ id: 'jonathan', name: 'Jonathan', x: 640, y: 280, w: 120, h: 60, hidden: !S.f['c5.open'],
      look: 'In a stupor. Drugged, or worse.', act: 'He does not wake. Not yet.' });
    return L;
  },
  hint: (S) => !S.f['c5.open'] ? 'Break down the door. It will take more than one try.' : !S.f['c5.gone'] ? 'Hold up the Sacred Wafer against him.' : 'Go to Mina.',
});
