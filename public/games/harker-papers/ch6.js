'use strict';
/* Chapter 6 — Piccadilly and the trance */
G.chapter({
  id: 'c6', title: 'The House in Piccadilly', doc: "Jonathan Harker's Journal", date: 'London, 3–4 October',
  intro: [
    'My wife bears his mark on her forehead. While he lives, his blood is in her, and when she dies she will become what Lucy became.',
    'We have traced the missing boxes. Six were taken to Mile End, six to Bermondsey, and nine to a house at 347 Piccadilly that he bought under the name of Count de Ville. We have broken the boxes at Mile End and Bermondsey. Eight lie here in the dining room.',
    'One is missing. And he will come back here before sunset for his papers and his money. We are waiting.',
  ],
  opening: 'The dining room of 347 Piccadilly. Dusty curtains. A great table. A smell of earth.',
  start: 'c6house', inv: ['host', 'kukri'],
});

G.scene({
  id: 'c6house', title: '347 Piccadilly', doc: "Jonathan Harker's Journal · 3 October",
  art: (S) => A.svg(
    `<rect width="800" height="500" fill="#221e1c"/><rect width="800" height="500" fill="url(#paperP)" opacity=".35"/>`,
    // tall windows with daylight
    `<g><rect x="560" y="60" width="180" height="290" fill="${S.f['c6.leap'] ? '#4a5568' : '#9aa4b2'}"/>${S.f['c6.leap'] ? '<path d="M560 60 l70 90 -40 40 60 40 -30 120" stroke="#e8e8e8" stroke-width="2" fill="none"/><path d="M560 60 h80 l-50 60z" fill="#e8e8e8" opacity=".3"/>' : ''}
      <path d="M560 60 H740 V350 H560Z M650 60 V350 M560 200 H740" fill="none" stroke="#1a1614" stroke-width="8"/>
      <path d="M548 50 c10 100 6 220 14 310 h18 c-10 -100 -8 -220 -4 -310z M752 50 c-10 100 -6 220 -14 310 h-18 c10 -100 8 -220 4 -310z" fill="#5a3a2a"/></g>`,
    `<rect y="400" width="800" height="100" fill="#2a1f18"/>`,
    `<g><path d="M420 400 V140 h100 V400Z" fill="#3a2a1e"/><rect x="432" y="156" width="76" height="100" fill="none" stroke="#2a1d14" stroke-width="3"/><circle cx="508" cy="290" r="4" fill="#c9952e"/></g>`,
    // table
    `<g><rect x="200" y="330" width="300" height="14" fill="#4a3628"/><rect x="214" y="344" width="10" height="60" fill="#3a2c22"/><rect x="476" y="344" width="10" height="60" fill="#3a2c22"/>
      ${S.f['c6.deeds'] ? '' : '<path d="M240 328 l40 -6 6 6z M290 328 l36 -4 4 4z" fill="#e3d8bf"/><circle cx="360" cy="324" r="8" fill="none" stroke="#c9952e" stroke-width="3"/>'}</g>`,
    // boxes
    [[90, 440], [150, 470], [60, 480]].map(([x, y]) => A.box(x, y, .7, { cross: S.f['c6.box'] })).join(''),
    // the Count
    S.f['c6.come'] && !S.f['c6.leap'] ? A.count(470, 450, 1.25, { eyes: true }) : '',
    S.f['c6.cut'] ? `<g fill="#e3b14a">${[...Array(16)].map((_, i) => { const r = A.rng(i + 300); return `<ellipse cx="${380 + r() * 200}" cy="${470 + r() * 24}" rx="6" ry="2.5"/>`; }).join('')}</g><g fill="#d8d0b8">${[...Array(6)].map((_, i) => `<rect x="${400 + i * 30}" y="${476 + (i % 2) * 8}" width="18" height="8" transform="rotate(${i * 13} ${400 + i * 30} 480)"/>`).join('')}</g>` : '',
    A.person(260, 470, 1, '#1d1a16', { face: '#c9a88a' }), A.person(320, 474, 1.05, '#191b22', { face: '#d0b49a', hat: true }),
  ),
  spots: (S) => {
    const L = [
      { id: 'boxes', name: 'Boxes of earth', x: 20, y: 400, w: 190, h: 100,
        look: S.f['c6.box'] ? 'Eight boxes, each with the Wafer inside. There should be nine.' : 'Eight great boxes of earth.',
        act: 'Eight. One is missing, and we do not know where.',
        use: { host: (g) => { g.flag('c6.box'); g.say('We open each box and lay the Wafer on the earth. Of the fifty, forty-nine are now useless to him.'); } } },
      { id: 'table', name: 'Papers on the table', x: 230, y: 300, w: 150, h: 34, hidden: S.f['c6.deeds'],
        look: 'Title deeds of the Piccadilly house, and of the houses at Mile End and Bermondsey. Notepaper, envelopes, pens. A bunch of keys.',
        act: (g) => { g.flag('c6.deeds'); g.give('deeds'); g.say('I take the deeds and the keys. Let him come for them.'); } },
      { id: 'window', name: 'Window onto Piccadilly', x: 560, y: 60, w: 180, h: 290,
        look: S.f['c6.leap'] ? 'Shattered glass. Below, in the flagged area, the Count is getting up unhurt. He runs across the yard and is gone.' : 'Traffic and sunshine. The sun will set at about a quarter to six.',
        act: (g) => {
          if (S.f['c6.leap']) { g.say('He is gone. And he has taken some of his money.'); return; }
          g.say('Nothing. Cabs and omnibuses. A newsboy.');
        } },
    ];
    if (!S.f['c6.come']) L.push({ id: 'wait', name: 'The front door', x: 410, y: 130, w: 120, h: 200,
      look: 'We hear a key in the lock. He is here.',
      act: (g) => {
        if (!(S.f['c6.box'] && S.f['c6.deeds'])) return g.say('Not yet. Make the boxes safe and take his papers first, so that he finds nothing left.');
        g.flag('c6.come');
        g.say('At last we hear a key softly inserted in the lock of the hall door. Then a quick step along the hall.',
          'The Count comes into the room with a single, panther-like leap. There is something so sinuous and inhuman in it that it seems to sober us all.',
          'Seeing us, a sort of horrible sneer passes over his face, showing the long, pointed eye-teeth. But the evil smile quickly passes into a cold stare of lion-like disdain.');
      } });
    if (S.f['c6.come'] && !S.f['c6.leap']) L.push({ id: 'count', name: 'The Count', x: 400, y: 250, w: 140, h: 200,
      look: 'Here, in London, in daylight, in a top hat. He looks younger even than he did in the castle chapel.',
      act: 'He is waiting for one of us to move.',
      use: {
        kukri: (g) => {
          g.flag('c6.cut'); g.flag('c6.leap');
          g.say('I make a fierce and sudden cut at him with my great Kukri knife. Only the diabolical quickness of his leap back saves him.',
            'A second less, and the trenchant blade would have shorn through his heart. As it is, the point just cuts the cloth of his coat, making a wide gap from which a bundle of bank-notes and a stream of gold fall out.',
            'Swiftly he dives under my arm, sweeps a handful of money from the floor, and dashes across the room. He throws himself at the window.',
            'Amid the crash and glitter of the falling glass, he tumbles into the flagged area below. He turns and looks up at us.',
            ['The Count', 'You think to baffle me, you with your pale faces all in a row, like sheep in a butcher\'s. You shall be sorry yet, each one of you!'],
            ['The Count', 'My revenge is just begun! I spread it over centuries, and time is on my side. Your girls that you all love are mine already.'],
            'He is gone. Van Helsing gathers up the money left on the floor and the deeds, and looks at it thoughtfully.');
        },
        host: (g) => g.say('I hold up the Wafer and he flinches, but there is nowhere for him to cower to. Someone must strike.'),
      } });
    if (S.f['c6.leap']) L.push({ id: 'vh', name: 'Van Helsing', x: 290, y: 360, w: 60, h: 115,
      look: 'He holds a coin of the Count\'s up to the light.',
      act: (g) => {
        g.say(['Van Helsing', 'He took the money because he needs it. He fears us. He fears time, he fears want. He has one box left, and he must flee with it.'],
          ['Van Helsing', 'And our dear Madam Mina can tell us where. She has his blood in her. At sunrise and at sunset, when the barriers are low, perhaps I can send her mind where his mind is.']);
        g.go('c6trance');
      } });
    return L;
  },
  hint: (S) => !S.f['c6.box'] ? 'Make the boxes useless with the Wafer.' : !S.f['c6.deeds'] ? 'Take his papers.' : !S.f['c6.come'] ? 'Wait by the front door.' : !S.f['c6.leap'] ? 'Strike with the Kukri.' : 'Talk to Van Helsing.',
});

G.scene({
  id: 'c6trance', title: "Dr. Seward's study, before dawn", doc: "Dr. Seward's Diary · 4 October",
  art: (S) => A.svg(
    `<rect width="800" height="500" fill="#16171d"/>`,
    `<g><rect x="560" y="70" width="170" height="220" fill="${S.f['c6.dawn'] ? '#c98a6a' : '#1a2238'}"/><path d="M560 70 H730 V290 H560Z M645 70 V290 M560 180 H730" fill="none" stroke="#0b0b10" stroke-width="7"/></g>`,
    `<rect y="400" width="800" height="100" fill="url(#boards)"/>`,
    // bookcases
    `<g fill="#2a1f18"><rect x="20" y="60" width="160" height="340"/></g><g fill="#5a3a2a">${[...Array(4)].map((_, r) => [...Array(10)].map((_, i) => `<rect x="${28 + i * 15}" y="${72 + r * 82}" width="11" height="66" opacity="${.5 + (i * r % 5) / 10}"/>`).join('')).join('')}</g>`,
    // phonograph
    `<g><rect x="200" y="350" width="120" height="50" fill="#3a2c22"/><path d="M250 350 l-30 -60 a40 40 0 0 1 60 -10z" fill="#8a7a4a"/></g>`,
    // Mina in chair, VH standing
    `<g><rect x="360" y="330" width="120" height="70" fill="#4a1f24"/><rect x="360" y="250" width="16" height="150" fill="#4a1f24"/></g>`,
    A.person(420, 400, 1, '#2a2a36', { dress: true, face: '#e4d6cc', hair: '#5a3a24', extra: '<path d="M-5 -100 h10" stroke="#8a1c22" stroke-width="3"/>' }),
    A.person(520, 410, 1.1, '#15161c', { face: '#d8c0a8', extra: '<path d="M-10 -100 c4 -10 16 -10 20 0" stroke="#bfbfbf" stroke-width="5" fill="none"/>' }),
    A.candle(300, 340, .7),
  ),
  spots: (S) => [
    { id: 'mina', name: 'Mina', x: 380, y: 280, w: 80, h: 120,
      look: 'She sits very still. The red mark on her forehead is the only colour in her face.',
      act: (g) => {
        if (!S.f['c6.dawn']) return g.say(['Mina', 'Hypnotise me, Professor. Do it before the dawn. I feel that then I can speak, and speak freely.']);
        if (S.f['c6.tranced']) return g.say('She is herself again, and does not remember what she said.');
        g.flag('c6.tranced');
        g.say('Van Helsing makes passes in front of her, from the top of her head downward. Her eyes close, then open, gazing far away.',
          ['Van Helsing', 'Where are you?'], ['Mina', 'I do not know. Sleep has no place it can call its own.'],
          ['Van Helsing', 'What do you see?'], ['Mina', 'I can see nothing. It is all dark.'],
          ['Van Helsing', 'What do you hear?'], ['Mina', 'The lapping of water. It is gurgling by, and little waves leap. I can hear them on the outside.'],
          ['Mina', 'I hear men\'s feet overhead, and a chain rattling. And the check of the capstan, as the chain falls into the ratchet.'],
          'The sun leaps up, and she wakes, puzzled.',
          ['Van Helsing', 'A ship! And it is weighing anchor at this very moment. He means to escape. He has taken his last box of earth and gone home.']);
      } },
    { id: 'vh', name: 'Van Helsing', x: 490, y: 300, w: 60, h: 115,
      look: 'He has his watch open in his hand, waiting for the dawn.',
      act: (g) => { if (!S.f['c6.dawn']) { g.flag('c6.dawn'); return g.say(['Van Helsing', 'It is almost the time. The sun is coming. Now, John, the light.'], 'The east window begins to flush pink.'); } g.say(['Van Helsing', S.f['c6.tranced'] ? 'To the docks. There is a ship gone down the Thames this morning, and we must know which.' : 'Now, Madam Mina.']); } },
    { id: 'phono', name: 'Phonograph', x: 200, y: 280, w: 120, h: 120,
      look: 'My phonograph, which I use to keep my diary. Mina typed every cylinder.',
      act: (g) => { if (!S.f['c6.tranced']) return g.say('I set a fresh cylinder. Whatever Mina says, it will be recorded.');
        g.say('At Lloyd\'s that afternoon we find our ship. The Czarina Catherine cleared from Doolittle\'s Wharf for Varna, on the Black Sea, with one great box aboard, carried on by a tall, thin man in a straw hat.',
          'We will go overland and be waiting at Varna when she arrives. Mina will come too. She has made us promise: if she becomes like him, we must destroy her.');
        g.endChapter('c7'); } },
    { id: 'window', name: 'East window', x: 560, y: 70, w: 170, h: 220,
      look: S.f['c6.dawn'] ? 'The sun is coming up.' : 'Still dark. A little grey in the east.', act: 'I draw back the curtain further to watch the light.' },
  ],
  hint: (S) => !S.f['c6.dawn'] ? 'Ask Van Helsing if it is time.' : !S.f['c6.tranced'] ? 'Mina is ready.' : 'Record it all. The phonograph.',
});
