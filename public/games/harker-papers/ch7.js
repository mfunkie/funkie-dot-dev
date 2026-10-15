'use strict';
/* Chapter 7 — The pursuit and the sunset */
G.chapter({
  id: 'c7', title: 'Before the Sun Sets', doc: "Mina Harker's Journal", date: 'Galatz and the Borgo Pass, 30 October – 6 November',
  intro: [
    'We waited at Varna for a week. The Czarina Catherine never came. He must have felt us there, through me, and sent the ship on up the Danube to Galatz. By the time we reached Galatz, the box had been unloaded and taken away by Slovaks. The agent who received it was found with his throat torn out.',
    'In my trances I still hear water. The men want to divide and search every road. I have asked for an hour alone with the map first.',
    'I can think as he thinks now. That is the one gift his blood has given me.',
  ],
  opening: 'Our rooms at Galatz. The map is spread on the table under the lamp.',
  start: 'c7map', inv: ['host', 'map'],
});

G.scene({
  id: 'c7map', title: 'Galatz, the map table', doc: "Mina Harker's Journal · 30 October",
  art: (S) => A.svg(
    `<rect width="800" height="500" fill="#1b1612"/>`,
    // map paper
    `<g><path d="M60 40 H740 V470 H60Z" fill="#d6c7a2"/><path d="M60 40 H740 V470 H60Z" fill="none" stroke="#8a7a5a" stroke-width="3"/>
      <path d="M60 40 L120 60 L60 100 Z M740 470 L690 450 L740 420Z" fill="#c7b78f"/>
      <!-- Carpathians -->
      <g fill="none" stroke="#8a7a5a" stroke-width="2">${[...Array(14)].map((_, i) => `<path d="M${110 + i * 22} ${150 + Math.sin(i) * 30} l10 -18 l10 18"/>`).join('')}</g>
      <!-- Black Sea -->
      <path d="M640 300 C 700 280 740 300 740 300 V470 H600 C 610 420 600 360 640 300Z" fill="#9fb0b8"/>
      <text x="670" y="400" font-family="Georgia" font-style="italic" font-size="16" fill="#3a4a52">Black Sea</text>
      <!-- Danube -->
      <path d="M60 400 C 200 410 340 390 470 380 C 520 376 560 360 600 370 L 640 330" stroke="#4a6a8a" stroke-width="5" fill="none"/>
      <text x="200" y="430" font-family="Georgia" font-style="italic" font-size="15" fill="#3a4a5a">Danube</text>
      <!-- Pruth -->
      <path d="M560 360 C 580 300 600 220 620 120 C 630 80 650 60 660 40" stroke="${S.f['c7.pruth'] ? '#9a4a3a' : '#4a6a8a'}" stroke-width="3" fill="none"/>
      <text x="600" y="200" font-family="Georgia" font-style="italic" font-size="14" fill="#3a4a5a">Pruth</text>
      <!-- Sereth -->
      <path d="M520 372 C 500 320 470 270 440 230 C 420 200 410 150 400 60" stroke="${S.f['c7.sereth'] ? '#2a6a3a' : '#4a6a8a'}" stroke-width="3" fill="none"/>
      <text x="452" y="300" font-family="Georgia" font-style="italic" font-size="14" fill="#3a4a5a">Sereth</text>
      <!-- Bistritza -->
      <path d="M430 216 C 380 200 320 190 270 160 C 240 140 220 120 200 110" stroke="${S.f['c7.sereth'] ? '#2a6a3a' : '#4a6a8a'}" stroke-width="2.5" fill="none" stroke-dasharray="${S.f['c7.sereth'] ? '0' : '5 4'}"/>
      <text x="300" y="168" font-family="Georgia" font-style="italic" font-size="13" fill="#3a4a5a">Bistritza</text>
      <!-- road -->
      <path d="M520 380 C 440 340 330 300 260 220 L 190 110" stroke="${S.f['c7.road'] ? '#9a4a3a' : '#6b5a3a'}" stroke-width="2" stroke-dasharray="2 5" fill="none"/>
      <!-- places -->
      <circle cx="520" cy="378" r="6" fill="#2a1f18"/><text x="530" y="396" font-family="Georgia" font-size="15" fill="#2a1f18">Galatz</text>
      <circle cx="430" cy="218" r="4" fill="#2a1f18"/><text x="438" y="214" font-family="Georgia" font-size="12" fill="#2a1f18">Fundu</text>
      <path d="M182 108 l8 -14 l8 14 h-4 v8 h-8 v-8z" fill="#8a1c22"/><text x="120" y="96" font-family="Georgia" font-size="13" fill="#8a1c22">Castle Dracula</text>
      <text x="200" y="134" font-family="Georgia" font-style="italic" font-size="12" fill="#2a1f18">Borgo Pass</text>
      <circle cx="680" cy="440" r="4" fill="#2a1f18"/><text x="640" y="462" font-family="Georgia" font-size="12" fill="#2a1f18">Varna</text></g>`,
    // notes and lamp
    `<g transform="rotate(-6 150 420)"><rect x="80" y="380" width="150" height="90" fill="#efe6d0"/>${[...Array(6)].map((_, i) => `<path d="M92 ${396 + i * 12} h${100 + (i % 3) * 10}" stroke="#4a3f33" stroke-width="1.4"/>`).join('')}</g>`,
    A.candle(720, 120, 1),
  ),
  spots: (S) => [
    { id: 'notes', name: 'My trance notes', x: 70, y: 370, w: 170, h: 100,
      look: 'Every word I have said in trance since London, written down by Dr. Seward.',
      act: (g) => { g.flag('c7.notes'); g.say('I read them through again.', ['Trance, 25 Oct', 'Lapping water. Darkness. The creaking of wood.'], ['Trance, 29 Oct', 'Water swirling, level with my ears. Cows lowing far off. Men talking in a strange tongue. Oars.'], 'Level with my ears. He is not at sea now. He is low down, in a box, in a boat, moving on a river. Close to the banks, near enough to hear cattle.'); } },
    { id: 'road', name: 'The road', x: 230, y: 230, w: 200, h: 90,
      look: 'The road from Galatz up through the Borgo Pass. The way Jonathan went in May, in the Count\'s calèche.',
      act: (g) => { g.flag('c7.road'); g.say('No. A road means customs officers, inns, carters who talk, the chance of an accident. He would be in the hands of strangers. And every trance speaks of water.'); } },
    { id: 'pruth', name: 'River Pruth', x: 560, y: 60, w: 90, h: 280,
      look: 'The Pruth is the more easily navigated. It flows down from the north.',
      act: (g) => { g.flag('c7.pruth'); g.say('The Pruth is the easier river. But it runs north, towards the Russian frontier, and never comes near the castle. He would have a long journey by land at its end.'); } },
    { id: 'sereth', name: 'River Sereth', x: 400, y: 60, w: 130, h: 300,
      look: 'The Sereth flows down to the Danube a little above Galatz.',
      act: (g) => {
        if (!S.f['c7.notes']) return g.say('Before I choose, I must be sure what my trances actually say.');
        g.flag('c7.sereth');
        g.say('The Sereth. It is joined at Fundu by the Bistritza, which runs up round the Borgo Pass. The loop it makes is manifestly as close to Dracula\'s castle as can be got by water.',
          'I take my memorandum to the others. Van Helsing kisses my hand. "Our dear Madam Mina is once more our teacher," he says.',
          'We divide. Jonathan and Lord Godalming will take a steam launch up the river. Dr. Seward and Mr. Morris will ride along the bank. The Professor and I will go by road to the Borgo Pass, and to the castle, and wait.');
        g.go('c7circle');
      } },
    { id: 'castle', name: 'Castle Dracula', x: 110, y: 80, w: 110, h: 50, look: 'Jonathan marked it from memory.', act: 'All roads lead back there. The question is which one he has taken.' },
  ],
  hint: (S) => !S.f['c7.notes'] ? 'Read your trance notes first.' : 'The notes speak of a river. Which river runs closest to the castle?',
});

G.scene({
  id: 'c7circle', title: 'Below the Borgo Pass', doc: 'Memorandum by Abraham Van Helsing · 4 November',
  art: (S) => A.svg(
    A.sky('#0a0e1a', '#2c3448'), A.stars(40, 61, 200),
    A.castle(600, 180, .7, '#05070c'),
    `<path d="M0 260 C 160 230 300 250 420 220 C 540 200 680 230 800 210 V500 H0Z" fill="#c9cfda"/><path d="M0 330 C 200 310 500 320 800 300 V500 H0Z" fill="#dfe4ec"/>`,
    // horses
    S.f['c7c.horses'] ? '<path d="M620 420 c30 -10 70 -10 90 0 c-20 6 -70 6 -90 0z M640 440 c30 -8 60 -8 80 0 c-20 5 -60 5 -80 0z" fill="#3a3d44"/>' :
      `<g fill="#1a1c22"><path d="M600 420 l8 -40 c10 -16 50 -16 66 -8 l18 -18 6 10 -10 18 -4 38 h-8 l-2 -26 h-50 l-6 26z"/><path d="M690 430 l8 -40 c10 -16 50 -16 66 -8 l14 -14 6 10 -8 14 -4 38 h-8 l-2 -26 h-50 l-6 26z"/></g>`,
    // circle
    S.f['c7c.circle'] ? `<ellipse cx="330" cy="410" rx="150" ry="44" fill="none" stroke="#f6f0e0" stroke-width="5" stroke-dasharray="3 3"/>` : '',
    // fire
    S.f['c7c.fire'] ? `<circle cx="380" cy="400" r="120" fill="url(#candleG)"/><path d="M360 420 c6 -30 14 -20 20 -50 c8 26 16 18 20 50z" fill="#e3843a"/><path d="M370 420 c4 -16 8 -10 10 -26 c4 14 8 10 10 26z" fill="#ffd27a"/>` : `<path d="M356 420 h48" stroke="#2a1d14" stroke-width="6"/>`,
    // wood
    S.f['c7c.wood'] ? '' : `<g stroke="#3a2a1a" stroke-width="5"><path d="M120 470 l60 -10 M130 480 l50 4 M110 460 l40 -16"/></g>`,
    // Mina
    A.person(290, 420, .95, '#2a2a36', { dress: true, face: '#e8dcd2', hair: '#5a3a24', extra: '<path d="M-5 -100 h10" stroke="#8a1c22" stroke-width="3"/>' }),
    // the three women
    S.f['c7c.women'] && !S.f['c7c.dawn'] ? [[520, 410], [570, 400], [470, 400]].map(([x, y], i) => `<g transform="translate(${x + (S.f['c7c.back'] ? 80 : 0)} ${y})" opacity=".85"><path d="M-16 -80 C -24 -40 -30 -10 -34 0 H34 C30 -10 24 -40 16 -80Z" fill="#eef0f4"/><ellipse cy="-94" rx="10" ry="12" fill="#efe6e0"/><path d="M-12 -102 c-8 14 -6 30 0 38 M12 -102 c8 14 6 30 0 38" stroke="${i === 0 ? '#e6cf8a' : '#2a1a14'}" stroke-width="7" fill="none"/><path d="M-4 -86 q4 3 8 0" stroke="#b0141c" stroke-width="2.5"/></g>`).join('') : '',
    A.snow(8, 70),
    S.f['c7c.dawn'] ? '<rect width="800" height="500" fill="#e8b48a" opacity=".18"/>' : '',
  ),
  onEnter: (g) => g.say('We have driven as far as the horses can take us. The castle is above, on its crag. Madam Mina has slept all day and eaten nothing. She looks at the castle with a terrible familiarity.', 'Night is coming. I must make our camp safe before it does.'),
  spots: (S) => [
    { id: 'wood', name: 'Fallen branches', x: 100, y: 440, w: 100, h: 50, hidden: S.f['c7c.wood'],
      look: 'Dry wood, under the snow.', act: (g) => { g.flag('c7c.wood'); g.say('I gather an armful of wood.'); } },
    { id: 'fire', name: 'Campfire', x: 340, y: 370, w: 90, h: 60,
      look: S.f['c7c.fire'] ? 'A good fire. The horses are uneasy.' : 'Where I mean to make a fire.',
      act: (g) => { if (S.f['c7c.fire']) return g.say('I feed the fire.'); if (!S.f['c7c.wood']) return g.say('There is no wood on it.'); g.flag('c7c.fire'); g.say('I build up the fire. The snow hisses.'); checkWomen(g); } },
    { id: 'ground', name: 'Snow around Madam Mina', x: 170, y: 350, w: 170, h: 120,
      look: S.f['c7c.circle'] ? 'A ring of crumbled Wafer around her and the fire.' : 'Fresh snow.',
      act: 'It is only snow. I need something holy.',
      use: { host: (g) => { if (S.f['c7c.circle']) return g.say('The ring is unbroken.'); g.flag('c7c.circle'); g.say('I crumble some of the Wafer and draw a ring around where Madam Mina sits, and the fire.', 'I ask her to step out of it. She rises, and makes a step forward, and then stops as though struck. "I cannot!" she says, and sits again. Then I know that she is safe from them, and that she is not yet safe from herself.'); checkWomen(g); } } },
    { id: 'mina', name: 'Madam Mina', x: 255, y: 320, w: 70, h: 100,
      look: 'She is very pale. The scar on her forehead is red in the firelight.',
      act: (g) => {
        if (S.f['c7c.back'] && !S.f['c7c.dawn']) {
          g.flag('c7c.dawn'); g.flag('c7c.horses');
          g.say('We sit until the dawn. The women do not come nearer. When the first red of the sun shows over the snow, they melt into the whirl of the snow and are gone towards the castle.',
            'The horses are dead. In the morning I go up to the castle alone, with my tools. I find the three women in their tombs, and do the butcher work that must be done. Their faces at the end are at peace.',
            'In the great tomb, lordlier than the rest, on which is written only DRACULA, I lay the Wafer, so that he may never rest there again.',
            'Now, with my rifle, I take Madam Mina up onto a rock where we can see the road. The sun is going down, and something is coming up the road very fast.');
          g.then(() => { g.take('host'); g.take('map'); g.give('rifle'); g.give('kukri'); });
          g.go('c7sunset');
          return;
        }
        g.say(['Mina', S.f['c7c.women'] ? 'No! Do not go out, Professor. Here you are safe!' : 'I am not hungry. I am only so tired.']);
      } },
    { id: 'women', name: 'The three women', x: 420, y: 290, w: 220, h: 120, hidden: !S.f['c7c.women'] || S.f['c7c.dawn'],
      look: 'The same three women Jonathan saw in the castle. Two dark, one fair. They call to Madam Mina, "Come, sister. Come to us. Come!"',
      act: 'If I leave the circle, I leave her alone. I stay.',
      use: { host: (g) => { g.flag('c7c.back'); g.say('I take some of the firewood that is burning and, holding up the Wafer in my other hand, advance on them. They draw back before me, laughing their low, horrid laugh.', 'They cannot come near. Madam Mina sits quite still. I think now we wait for the dawn.'); },
             '*': 'They only laugh.' } },
  ],
  hint: (S) => !(S.f['c7c.wood'] && S.f['c7c.fire']) ? 'Gather wood and build a fire.' : !S.f['c7c.circle'] ? 'Protect Madam Mina with the Wafer.' : !S.f['c7c.back'] ? 'Drive the women back with the Wafer.' : 'Stay with Madam Mina until dawn.',
});
function checkWomen(g) {
  const S = g.state();
  if (S.f['c7c.fire'] && S.f['c7c.circle'] && !S.f['c7c.women']) {
    g.flag('c7c.women');
    g.say('The horses begin to scream. Out of the whirling snow, three figures form, just beyond the firelight. Women, in white, with bright hard eyes.');
  }
}

/* ---------- final scene: a limited number of actions before sunset ---------- */
const FULL = 8;
function act7(g, fn) {
  const S = g.state();
  if (S.f['c7s.won'] || S.f['c7s.failing']) return;
  const left = (S.f['c7s.light'] ?? FULL) - 1; S.f['c7s.light'] = left;
  fn();
  if (!S.f['c7s.won'] && left <= 0) {
    S.f['c7s.failing'] = true;
    g.say('The lower rim of the sun touches the mountains. In the box the Count\'s red eyes open, and the look of hate in them turns to triumph.',
      'Too late. I have spent the light. (Try again: the sun rises once more on the Borgo Pass.)');
    g.then(() => { for (const k of Object.keys(S.f)) if (k.startsWith('c7s.')) delete S.f[k]; g.render(); });
  }
}
const waste = (t) => (g) => act7(g, () => g.say(t));

G.scene({
  id: 'c7sunset', title: 'The road below the castle', doc: "Mina Harker's Journal · 6 November, as Jonathan told it",
  hud: (S) => { const l = S.f['c7s.light'] ?? FULL; return `DAYLIGHT <span class="lit">${'█'.repeat(Math.max(0, l))}</span><span class="gone">${'░'.repeat(FULL - Math.max(0, l))}</span>`; },
  art: (S) => {
    const l = S.f['c7s.light'] ?? FULL, t = (FULL - l) / FULL;
    const sunY = 150 + t * 120;
    return A.svg(
      A.sky(t > .6 ? '#3a2a40' : '#5a5a78', t > .6 ? '#e07a4a' : '#e8b07a', 'sk7'),
      `<circle cx="660" cy="${sunY}" r="80" fill="#ffb060" opacity=".25" filter="url(#blur6)"/><circle cx="660" cy="${sunY}" r="28" fill="#ffcc80"/>`,
      `<path d="M0 260 L120 200 L240 240 L380 170 L520 230 L640 200 L800 250 V320 H0Z" fill="#3a3448"/>`,
      A.castle(160, 210, .5, '#140f18', [[-10, -60]]),
      `<path d="M0 300 C 200 290 600 300 800 290 V500 H0Z" fill="#e6e0e4"/><path d="M0 300 C 200 290 600 300 800 290" stroke="#c8bccc" stroke-width="2" fill="none"/>`,
      // road
      `<path d="M300 500 C 340 420 380 360 420 300" stroke="#b8acb8" stroke-width="40" fill="none" opacity=".5"/>`,
      // cart with box
      `<g transform="translate(420 380)"><rect x="-80" y="-30" width="160" height="30" fill="#3a2a1a"/><circle cx="-56" cy="6" r="22" fill="none" stroke="#2a1d14" stroke-width="6"/><circle cx="56" cy="6" r="22" fill="none" stroke="#2a1d14" stroke-width="6"/>
        ${S.f['c7s.down'] ? '' : A.box(0, -50, .9, { fill: '#4a3624' })}</g>`,
      S.f['c7s.down'] ? `<g transform="translate(560 450)"><path d="M-60 0 L-50 -34 H50 L60 0Z" fill="#4a3624"/><path d="M-60 0 H60 V22 H-60Z" fill="#2b1f14"/>
        ${S.f['c7s.lid'] ? `<path d="M-48 -30 H48 L54 -4 H-54Z" fill="#2a2018"/>${S.f['c7s.dust'] ? '<g fill="#8a8078" opacity=".6" filter="url(#blur2)"><ellipse cx="0" cy="-16" rx="40" ry="8"/></g>' : A.count(0, -8, .32, { eyes: true, face: '#c8c0b8' }).replace('scale(0.32)', 'scale(0.32) rotate(-90 0 -60)')}<path d="M70 -60 L110 -90" stroke="#4a3624" stroke-width="8"/>` : ''}</g>` : '',
      // Szgany
      S.f['c7s.yield'] ? [[260, 470], [300, 480], [700, 470], [740, 480]].map(([x, y]) => A.person(x, y, .9, '#2a1a14', { hat: true })).join('') :
        [[340, 440], [380, 450], [460, 450], [500, 440], [420, 460]].map(([x, y]) => A.person(x, y, 1, '#2a1a14', { hat: true })).join(''),
      // Quincey
      A.person(S.f['c7s.yield'] ? 640 : 220, 470, 1.05, '#1d1a16', { face: '#c9a88a', extra: S.f['c7s.wound'] ? '<path d="M8 -60 c4 6 4 16 0 22" stroke="#8a0f15" stroke-width="5" fill="none"/>' : '' }),
      // wolves on the ridge
      A.wolf(90, 300, .5), A.wolf(160, 296, .45), A.wolf(740, 292, .5),
      A.snow(17, 40),
      t > .6 ? `<rect width="800" height="500" fill="#401a10" opacity="${(t - .6) * .5}"/>` : '',
    );
  },
  onEnter: (g) => g.say('From the rock, Madam Mina and I watch. The gypsies drive the leiter-wagon at a gallop for the castle, the great box lashed on top. Behind them, closing fast, four horsemen. Jonathan, Lord Godalming, Dr. Seward, Mr. Morris.',
    'What happened next, Jonathan has told me so often that I can set it down as if I were there.', () => g.state().f['seen:c7sunset'] = true,
    'The sun is almost down on the mountain tops. If he is not destroyed before it sets, he will be free.'),
  spots: (S) => {
    const L = [
      { id: 'szgany', name: 'The Szgany', x: 310, y: 340, w: 220, h: 130, hidden: S.f['c7s.yield'],
        look: 'A dozen gypsies around the wagon, with knives drawn. Their leader shouts an order in their own tongue.',
        act: waste('I ride at them and they close ranks. Knives flash in the red light. I have lost a moment.'),
        use: { rifle: (g) => act7(g, () => { g.flag('c7s.yield'); g.flag('c7s.wound'); g.say('Four Winchester rifles come up together. "Halt!" The gypsies hesitate, then fall back from the wagon.', 'In the press, Quincey forces his way to the wagon from the other side. I see a gypsy\'s knife flash at him. He presses on, one hand to his side.'); }), '*': waste('There is no time for that.') } },
      { id: 'cart', name: 'The leiter-wagon', x: 330, y: 300, w: 180, h: 110, hidden: !S.f['c7s.yield'] || S.f['c7s.down'],
        look: 'The great box is roped on top.',
        act: (g) => act7(g, () => { g.flag('c7s.down'); g.say('I leap onto the wagon. With a strength that seems incredible, I raise the great box and fling it over the wheel to the ground.'); }),
        use: { '*': waste('Not now. The box must come down.') } },
      { id: 'box', name: 'The box', x: 490, y: 400, w: 140, h: 75, hidden: !S.f['c7s.down'],
        look: S.f['c7s.lid'] ? 'He lies on the earth inside, deathly pale, just like a waxen image. His red eyes glare with the horrible vindictive look I know too well.' : 'Nailed shut.',
        act: (g) => S.f['c7s.lid'] ? act7(g, () => g.say('His eyes see the sinking sun. I must strike, not stare.')) : act7(g, () => g.say('My hands slip on the boards. I need a blade under the lid.')),
        use: {
          kukri: (g) => act7(g, () => {
            if (!S.f['c7s.lid']) { g.flag('c7s.lid'); return g.say('I attack one end of the chest with my great Kukri knife. The nails draw with a screeching sound, and the lid of the box is thrown back.'); }
            if (S.f['c7s.cut']) return g.say('It is done. Quincey!');
            g.flag('c7s.cut');
            g.say('As I look, the eyes see the sinking sun, and the look of hate in them turns to triumph.',
              'But on the instant comes the sweep and flash of my great knife. I scream as I see it shear through the throat.');
          }),
          rifle: waste('A shot would only rouse the wolves.'),
          '*': waste('No time.'),
        } },
      { id: 'quincey', name: 'Quincey Morris', x: S.f['c7s.yield'] ? 610 : 190, y: 360, w: 60, h: 115,
        look: S.f['c7s.wound'] ? 'Blood is spurting through his fingers. He is still standing.' : 'Quincey, his bowie knife in his hand.',
        act: (g) => {
          if (!S.f['c7s.cut']) return act7(g, () => g.say(['Quincey', S.f['c7s.down'] ? 'Open it, Jack! Get it open!' : 'Get that box down!']));
          act7(g, () => {
            g.flag('c7s.won'); g.flag('c7s.dust');
            g.say('At the same moment, Mr. Morris\'s bowie knife plunges into the heart.',
              'It is like a miracle. Before our very eyes, and almost in the drawing of a breath, the whole body crumbles into dust and passes from our sight.',
              'I shall be glad as long as I live that even in that moment of final dissolution, there was in the face a look of peace, such as I never could have imagined might have rested there.',
              'The castle stands out against the red sky, every stone of its broken battlements articulated against the light. The gypsies turn and ride away. The wolves follow them.',
              'Quincey has sunk to the ground, leaning on his elbow, his hand pressed to his side. Mina runs down from the rock to him, and the Professor after her.',
              ['Quincey', 'I am only too happy to have been of any service! Oh, God! It was worth this to die! Look! Look!'],
              'The sun is right down upon the mountain top, and the red gleams fall upon Mina\'s face, bathing it in rosy light. The men sink on their knees.',
              ['Quincey', 'Now God be thanked that all has not been in vain! See! The snow is not more stainless than her forehead! The curse has passed away!'],
              'The red scar is gone. And, to our bitter grief, with a smile and in silence, he died, a gallant gentleman.');
            g.ending();
          });
        },
        use: { bowie: waste('It is his knife, and his to use.'), '*': waste('Not now!') } },
      { id: 'sun', name: 'The sun', x: 610, y: 120, w: 100, h: 180,
        look: (g, S2) => { const l = S2.f['c7s.light'] ?? FULL; return l > 5 ? 'The sun is low over the mountains.' : l > 2 ? 'The sun is touching the peaks.' : 'Only a sliver of red is left.'; } },
      { id: 'wolves', name: 'Wolves on the ridge', x: 40, y: 260, w: 160, h: 50, look: 'They are gathering, waiting for the dark.', use: { rifle: waste('I fire. They do not even flinch. A wasted moment.') } },
    ];
    return L;
  },
  hint: (S) => !S.f['c7s.yield'] ? 'Every action spends daylight. Make the gypsies give way with a show of force.' : !S.f['c7s.down'] ? 'Get the box off the wagon.' : !S.f['c7s.lid'] ? 'Prise the lid with your knife.' : !S.f['c7s.cut'] ? 'Strike now, with the Kukri.' : 'Quincey must finish it.',
});

G.ending({
  head: 'Note, by Jonathan Harker',
  body: [
    'Seven years ago we all went through the flames. Our son\'s birthday is the same day as that on which Quincey Morris died. His mother holds, I know, the secret belief that some of our brave friend\'s spirit has passed into him. His bundle of names links all our little band of men together. But we call him Quincey.',
    'This summer we made a journey to Transylvania, and went over the old ground. The castle stood as before, reared high above a waste of desolation.',
    'When we got home, I took the papers from the safe where they had been ever since our return. We were struck with the fact that, in all the mass of material of which the record is composed, there is hardly one authentic document. Nothing but a mass of typewriting, except the later notebooks of Mina and Seward and myself, and Van Helsing\'s memorandum.',
    'Van Helsing summed it all up as he said, with our boy on his knee: "We want no proofs; we ask none to believe us! This boy will some day know what a brave and gallant woman his mother is."',
  ],
  sign: 'Jonathan Harker',
});
