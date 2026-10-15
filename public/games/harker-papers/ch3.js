'use strict';
/* Chapter 3 — Dr. Seward's Diary & Lucy's Memorandum, Hillingham */
G.chapter({
  id: 'c3', title: 'The Flowers at Hillingham', doc: "Dr. Seward's Diary", date: 'Hillingham, September',
  intro: [
    'Lucy Westenra is wasting away, and none of my science can say why. She loses blood with no wound to show for it, except two small punctures on her throat, white at the edges as if worn.',
    'I sent for my old master, Professor Abraham Van Helsing of Amsterdam. He has given her Arthur\'s blood, then mine, and he will tell me nothing of what he fears. "Trust me," he says, "you shall know all in good time."',
    'Today he arrived from the station with a great box from Haarlem.',
  ],
  opening: "Lucy's bedroom. Van Helsing sets his box on the table and opens it.",
  start: 'c3room', inv: [],
});

const lucyRoom = (S, night) => A.svg(
  `<rect width="800" height="500" fill="${night ? '#14151d' : '#2a2a30'}"/><rect width="800" height="500" fill="url(#paperP)" opacity="${night ? .15 : .3}"/>`,
  `<rect y="410" width="800" height="90" fill="url(#boards)"/>`,
  // window
  `<g><rect x="520" y="70" width="190" height="250" fill="${night ? '#0e1426' : '#8c97a8'}"/>${night ? A.moon(640, 120, 14) : ''}
    ${night && S.f['c3n.broken'] ? '<path d="M560 140 l30 40 -20 30 40 10 -10 40" stroke="#c9d3e0" stroke-width="2" fill="none"/><path d="M520 70 l60 70 -40 30z M710 320 l-50 -50 40 -10z" fill="#c9d3e0" opacity=".35"/>' : ''}
    ${!night && S.f['c3.window'] || night ? '<g fill="#f1efe6" opacity=".9">' + [...Array(9)].map((_, i) => `<circle cx="${528 + i * 22}" cy="${316}" r="5"/>`).join('') + '</g>' : ''}
    <path d="M520 70 H710 V320 H520Z M615 70 V320 M520 195 H710" fill="none" stroke="#0e0e12" stroke-width="8"/>
    <path d="M510 60 h210 v14 h-210z" fill="#4a1f24"/><path d="M500 60 c10 80 6 180 14 270 h22 c-12 -90 -10 -190 -6 -270z M730 60 c-10 80 -6 180 -14 270 h-22 c12 -90 10 -190 6 -270z" fill="#5a2028"/></g>`,
  // fireplace
  `<g><rect x="340" y="250" width="140" height="160" fill="#4a4540"/><rect x="362" y="290" width="96" height="120" fill="#0e0c0b"/>${night ? '' : '<path d="M380 410 c10 -30 20 -10 30 -36 c10 26 20 6 30 36z" fill="#e3843a" opacity=".8"/>'}
    <rect x="330" y="240" width="160" height="14" fill="#5a5550"/>${S.f['c3.fire'] ? '<g fill="#f1efe6">' + [...Array(6)].map((_, i) => `<circle cx="${350 + i * 24}" cy="${236}" r="5"/>`).join('') + '</g>' : ''}</g>`,
  `<path d="M322 150 V290" stroke="#7a2a30" stroke-width="4"/><rect x="316" y="288" width="12" height="18" fill="#c9952e"/>`,
  // door
  `<g><rect x="220" y="170" width="90" height="240" fill="#3a2a1e"/><rect x="230" y="184" width="70" height="90" fill="none" stroke="#2a1d14" stroke-width="3"/><rect x="230" y="290" width="70" height="104" fill="none" stroke="#2a1d14" stroke-width="3"/><circle cx="294" cy="300" r="4" fill="#c9952e"/>
    ${S.f['c3.door'] ? '<g fill="#f1efe6">' + [...Array(8)].map((_, i) => `<circle cx="${216}" cy="${180 + i * 28}" r="4.5"/>`).join('') + '</g>' : ''}</g>`,
  // bed with Lucy
  `<g><rect x="20" y="300" width="190" height="110" fill="#3a2c22"/><rect x="10" y="180" width="16" height="230" fill="#3a2c22"/><path d="M24 296 h180 v30 h-180z" fill="#e8e2d4"/>
    <ellipse cx="62" cy="292" rx="16" ry="18" fill="${night && S.f['c3n.dead'] ? '#d9d2c8' : '#e9e0d8'}"/><path d="M46 280 c-10 20 -6 36 4 46 M78 280 c10 18 8 30 2 40" stroke="#d7b980" stroke-width="8" fill="none"/>
    <path d="M30 312 c60 -16 120 6 172 -4 v20 h-172z" fill="#cfc7b6"/>
    ${S.f['c3.wreath'] && !(night && S.f['c3n.torn']) ? '<g fill="#f1efe6">' + [...Array(7)].map((_, i) => `<circle cx="${50 + i * 4.5}" cy="${306 + Math.sin(i) * 2}" r="3.5"/>`).join('') + '</g>' : ''}
    ${night && S.f['c3n.mother'] ? `<ellipse cx="128" cy="300" rx="14" ry="16" fill="${S.f['c3n.dead'] ? '#cdc8bf' : '#e3d9cf'}"/><path d="M114 290 c4 -8 24 -8 28 0" stroke="#bcb6aa" stroke-width="6" fill="none"/>` : ''}
    ${night && S.f['c3n.laid'] ? '<g fill="#f1efe6">' + [...Array(5)].map((_, i) => `<circle cx="${120 + i * 5}" cy="320" r="3.5"/>`).join('') + '</g>' : ''}</g>`,
  // table + box / writing desk
  `<g><rect x="600" y="360" width="150" height="10" fill="#4a3628"/><rect x="606" y="370" width="8" height="40" fill="#3a2c22"/><rect x="736" y="370" width="8" height="40" fill="#3a2c22"/>
    ${night ? `<path d="M640 358 l30 -4 4 4z" fill="#e3d8bf"/><path d="M690 358 l20 -24" stroke="#222" stroke-width="2"/>${A.candle(730, 358, .7, true)}` :
      `<rect x="620" y="326" width="80" height="34" fill="#6b5232"/><path d="M620 326 l10 -16 h80 l-10 16z" fill="#7a6040"/>`}</g>`,
  !night ? A.person(470, 410, 1.15, '#1c1d24', { face: '#d8c0a8', extra: '<path d="M-10 -100 c4 -10 16 -10 20 0" stroke="#bfbfbf" stroke-width="5" fill="none"/>' }) : '',
  night && S.f['c3n.broken'] && !S.f['c3n.specks'] ? A.wolf(600, 300, .9, '#3b3d44') : '',
  night && S.f['c3n.specks'] ? `<g fill="#cfd6e0" opacity=".55">${[...Array(40)].map((_, i) => { const r = A.rng(i + 90); return `<circle cx="${520 + r() * 200}" cy="${120 + r() * 220}" r="${r() * 1.6 + .4}"/>`; }).join('')}</g>` : '',
  night ? `<rect width="800" height="500" fill="#000" opacity=".25"/>` : '',
);

G.scene({
  id: 'c3room', title: "Lucy's bedroom, Hillingham", doc: "Dr. Seward's Diary · 13 September",
  art: (S) => lucyRoom(S, false),
  spots: (S) => [
    { id: 'box', name: 'Box from Haarlem', x: 615, y: 305, w: 95, h: 58, hidden: S.f['c3.took'],
      look: 'A great bundle of white flowers inside, packed in damp moss.',
      act: (g) => { g.flag('c3.took'); g.give('garlic'); g.say(['Van Helsing', 'These are for Madam Lucy. Take them, friend John. Common garlic flowers, from my friend Vanderpool who grows herbs in his glass-houses all the year.'], ['Van Helsing', 'Rub them on the sash of the window, the door, the fireplace. Every place by which anything may come in. I shall watch you do it.']); } },
    { id: 'vh', name: 'Professor Van Helsing', x: 440, y: 270, w: 64, h: 140,
      look: 'A man of medium weight, strongly built, with a hard, square chin and a large, resolute, mobile mouth. He has not slept.',
      act: (g, S) => {
        if (S.f['c3.wreath']) return g.say(['Van Helsing', 'Now, friend John, we may sleep, you and I. Let no one open window or door tonight. Not for any reason.']);
        if (!S.f['c3.took']) return g.say(['Van Helsing', 'The box, John. Open the box.']);
        g.say(['Seward', 'Professor, is this some charm? Some peasant superstition?'], ['Van Helsing', 'Perhaps I am. But you shall see that I do nothing without reason. Do as I ask, and ask me no questions yet.']);
      } },
    { id: 'window', name: 'Window', x: 520, y: 70, w: 190, h: 250,
      look: S.f['c3.window'] ? 'Every crack in the sash is rubbed with garlic, and a line of flowers sits along the sill.' : 'A tall window looking out on the garden. The sash does not fit closely.',
      act: 'The catch is fastened.',
      use: { garlic: (g) => { g.flag('c3.window'); g.say('I rub the flowers all over the sash and lay a row of them along the sill. The room is filling with the smell of garlic.'); checkWreath(g); } } },
    { id: 'door', name: 'Door', x: 210, y: 170, w: 100, h: 240,
      look: S.f['c3.door'] ? 'The jambs are rubbed with garlic, top to bottom.' : 'The door to the landing.',
      act: 'Lucy\'s mother sleeps across the landing. She does not like me fussing about.',
      use: { garlic: (g) => { g.flag('c3.door'); g.say('I rub every inch of the jamb, above, below and at each side.'); checkWreath(g); } } },
    { id: 'fire', name: 'Fireplace', x: 330, y: 230, w: 160, h: 180,
      look: S.f['c3.fire'] ? 'The flowers line the mantel, and I have rubbed the chimney opening.' : 'A small fire. The chimney is wide enough for a bird, or a bat.',
      act: 'I warm my hands. September evenings are cold in this house.',
      use: { garlic: (g) => { g.flag('c3.fire'); g.say('I rub the flowers round the fireplace in the same way, and lay a handful on the mantel.'); checkWreath(g); } } },
    { id: 'lucy', name: 'Lucy', x: 30, y: 270, w: 180, h: 70,
      look: 'She is ghastly, chalkily pale. The red seems to have gone even from her lips and gums. On her throat, two punctures, not large, but not wholesome-looking.',
      act: (g, S) => S.f['c3.wreath'] ? g.say(['Lucy', 'Oh, Professor, I believe you are only putting up a joke on me. Still... I feel safe with them. I shall sleep well tonight.']) : g.say(['Lucy', 'Dr. Seward, what a smell! Is the Professor going to make a salad of me?']),
      use: {
        wreath: (g) => {
          g.take('wreath'); g.flag('c3.wreath');
          g.say('Van Helsing takes the wreath from me and puts it round Lucy\'s neck himself.',
            ['Van Helsing', 'Take care you do not disturb it. And even if the room feel close, do not tonight open the window or the door.'],
            ['Lucy', 'I promise. And thank you both a thousand times.'],
            'We go home to rest. Van Helsing says that tonight he can sleep in peace.',
            'He is wrong. Four nights later, Lucy\'s mother comes into her room.');
          g.go('c3night');
        },
        garlic: 'Van Helsing stops my hand. "Not loose, John. Finish the room first, and I will make them into a wreath."',
      } },
  ],
  hint: (S) => !S.f['c3.took'] ? 'Open the box from Haarlem.' : !(S.f['c3.window'] && S.f['c3.door'] && S.f['c3.fire']) ? 'Use the garlic on every way into the room: window, door and fireplace.' : 'Put the wreath around Lucy\'s neck.',
});
function checkWreath(g) {
  const S = g.state();
  if (S.f['c3.window'] && S.f['c3.door'] && S.f['c3.fire'] && !S.f['c3.made']) {
    g.flag('c3.made'); g.take('garlic'); g.give('wreath');
    g.say(['Van Helsing', 'Good. Now the rest I twist into a wreath, so. Give it to her yourself, John.']);
  }
}

G.scene({
  id: 'c3night', title: "Lucy's bedroom, at night", doc: 'Memorandum left by Lucy Westenra · 17 September',
  art: (S) => lucyRoom(S, true),
  onEnter: (g) => g.flag('c3n.mother').say(
    'I am writing this down so that no one may by any chance get into trouble through me.',
    'I woke to a flapping at the window, like the noise I heard after that sleep-walking on the cliff at Whitby. Then a howling in the shrubbery, like a dog, but more fierce and deeper.',
    'Mother came in, frightened by the noise. She lay down beside me. I try to keep still, so as not to frighten her more.'),
  spots: (S) => {
    const L = [];
    L.push({ id: 'window', name: 'Window', x: 520, y: 70, w: 190, h: 250,
      look: S.f['c3n.broken'] ? 'The glass is shattered. Cold air pours in.' : 'Something is beating against the glass.',
      act: (g) => {
        if (S.f['c3n.broken']) return S.f['c3n.specks'] ? g.say('The air seems full of specks, floating and circling in the draught from the window. The lights burn blue and dim.') : g.say('The great grey head is gone. Only the wind.');
        g.flag('c3n.mother'); g.flag('c3n.broken'); g.flag('c3n.torn'); g.flag('c3n.dead');
        g.say('There is a crash at the window, and a lot of broken glass is hurled on the floor. The blind blows back, and in the aperture of the broken panes there is the head of a great, gaunt grey wolf.',
          'Mother cries out in fright and struggles up into a sitting posture. She clutches wildly at anything that would help her, and among other things she clutches the wreath of flowers round my neck and tears it away.',
          'For a second or two she sits up, pointing at the wolf, and there is a strange and horrible gurgling in her throat. Then she falls over, as if struck with lightning.',
          'Her head strikes my forehead. Her heart has stopped. Dear, dear mother.');
      } });
    if (S.f['c3n.torn'] && !S.f['c3n.wreath']) L.push({ id: 'flowers', name: 'Scattered flowers', x: 150, y: 405, w: 90, h: 30,
      look: 'The garlic flowers, torn apart, scattered on the floor.', act: (g) => { g.flag('c3n.wreath'); g.give('wreath'); g.say('I gather up what I can of the flowers.'); } });
    L.push({ id: 'mother', name: S.f['c3n.dead'] ? 'Mother' : 'Mother, asleep', x: 105, y: 275, w: 70, h: 60, hidden: !S.f['c3n.broken'],
      look: S.f['c3n.laid'] ? 'I have covered her and laid the flowers on her breast.' : 'Her eyes are open and fixed. She is quite cold.',
      act: (g) => g.say('She is gone. I hold her hand. It is already cold.'),
      use: { wreath: (g) => { g.take('wreath'); g.flag('c3n.laid'); g.say('I put the flowers on poor mother\'s breast. They are all I have to give her.'); } } });
    if (!S.f['c3n.broken']) L.push({ id: 'motherAwake', name: 'Mother', x: 105, y: 275, w: 70, h: 60,
      look: 'She lies beside me, trembling. She has a weak heart, and the doctors warned us.', act: (g) => { g.flag('c3n.mother'); g.say(['Mrs. Westenra', 'Hush, my darling. It is only the wind, or a dog. Go to sleep.']); } });
    L.push({ id: 'bell', name: 'Bell-pull', x: 300, y: 160, w: 34, h: 140,
      look: 'The bell-pull for the maids.',
      act: (g) => {
        if (!S.f['c3n.dead']) return g.say('I will not wake the house for a noise in the shrubbery.');
        if (S.f['c3n.maids']) return g.say('I ring and ring. No one comes now.');
        g.flag('c3n.maids');
        g.say('The four maids come running, and scream at the sight of poor mother. I send them to the dining-room to take a glass of wine each, to steady themselves.',
          'They do not come back. When I go to the door I hear nothing. Later I learn the wine had laudanum in it, from the bottle the doctor left for mother. They lie helpless, all four.');
      } });
    L.push({ id: 'desk', name: 'Writing table', x: 620, y: 330, w: 130, h: 40,
      look: 'Pen, paper, my candle. The flame burns low and blue.',
      act: (g) => {
        if (!S.f['c3n.maids']) return g.say('Not yet. Somebody must be told about mother first.');
        if (S.f['c3n.memo']) return g.say('I have written it all. Now it must be hidden where they will find it, and he will not.');
        g.flag('c3n.memo'); g.give('memo'); g.flag('c3n.specks');
        g.say('I write down everything, exactly as it happened. The specks in the air are swirling now, and I feel my senses going.', 'God keep you, dear Arthur, if I should not survive this night.');
      } });
    L.push({ id: 'self', name: 'My nightdress', x: 20, y: 300, w: 80, h: 40,
      look: 'There is nowhere else to hide anything.', act: 'I pull the collar close around my throat.',
      use: { memo: (g) => {
        g.take('memo');
        g.say('I hide the paper in my breast, where they shall find it when they come to lay me out.',
          'In the morning, Van Helsing and Seward break in through a back window. They find the maids drugged, Mrs. Westenra dead, and Lucy barely alive with the memorandum in her bodice.',
          'They give her blood again, this time from Quincey Morris, the Texan who loves her too. It is not enough. On the 20th of September, with Arthur beside her, Lucy dies.',
          'At the end her voice changes, soft and voluptuous, and she asks Arthur to kiss her. Van Helsing hurls him back. "Not for your life! Not for your living soul and hers!"',
          'Then her eyes clear, and she takes the Professor\'s hand and kisses it. "My true friend," she whispers. "Guard him, and give me peace."');
        g.endChapter('c4');
      } } });
    return L;
  },
  hint: (S) => !S.f['c3n.broken'] ? 'Something is at the window.' : !S.f['c3n.laid'] ? 'Gather the torn flowers and give them to your mother.' : !S.f['c3n.maids'] ? 'Ring for help.' : !S.f['c3n.memo'] ? 'Write down what has happened, at the table.' : 'Hide the paper on yourself.',
});
