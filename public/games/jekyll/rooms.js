'use strict';
/*
 * JEKYLL.EXE: the rooms, chapter by chapter. A room is a screen from
 * world.js at one moment: who is there, which ways are open, what you're
 * after and by when. Words in double quotation marks are Stevenson's,
 * checked against docs/jekyll/the-strange-case.txt; the game's own words are
 * in capitals. Nothing here touches the DOM: scripts/jekyll/solve.ts proves
 * every room can be finished from the state it starts in.
 *
 * Times are minutes after midnight (clock), so 3:00 AM is 180.
 */
(() => {
  const R = JH.room;
  const C = (def) => { JH.CHAPTERS.push(def); return def; };

  /* ======================================== I. THE FIRST EXPERIMENT */

  R('i-cabinet', {
    screen: 'cabinet',
    clock: 4 * 60 + 12,
    start: { x: 7, y: 6, form: 'J', d: 'n' },
    goalText: 'COMPOUND THE DRAUGHT AT THE TABLE, AND DRINK IT.',
    goals: [
      { need: { form: 'H' }, text: 'OUT BY THE RED BAIZE DOOR, TO YOUR BEDROOM AND ITS GLASS.' },
      { need: { doses: 1 }, text: 'THE GLASS IS READY. X: DRINK IT.' },
    ],
    acts: {
      desk: {
        once: true,
        give: { doses: 1 },
        say: '"I compounded the elements, watched them boil and smoke together in the glass" X: DRINK.',
        again: 'THE GLASS IS READY. X: DRINK.',
      },
      pressE: { say: 'THE GLAZED PRESS MARKED E: THE SALT, THE RED TINCTURE, THE BOOK OF DATES.' },
      hearth: { say: '"The fire burned in the grate"' },
      chair: { say: 'NOT TONIGHT.' },
      window: { say: 'THE COURT IS DARK. EVERYONE IS ASLEEP.' },
    },
    exits: {
      baize: { need: { form: 'H' }, no: 'NOT YET. FIRST, THE DRAUGHT.' },
    },
  });

  R('i-theatre', {
    screen: 'theatre',
    clock: 4 * 60 + 18,
    start: { x: 1, y: 4, form: 'H', d: 'e' },
    goalText: 'OVER THE CRATES TO THE YARD. HYDE CAN CLIMB.',
    // The salt, "a large quantity of a particular salt" from the wholesale
    // chemists, still in its crates across the floor.
    place: [1, 2, 3, 4, 5, 7, 8].map((y) => ({ x: 4, y, ch: '=' })),
    exits: {
      garden: {},
      up: { shut: 'NOT YET. THE BEDROOM, AND THE GLASS.' },
      corridor: { shut: 'NOT TONIGHT. THE HOUSE.' },
    },
  });

  R('i-yard', {
    screen: 'yard',
    clock: 4 * 60 + 29,
    start: { x: 7, y: 8, form: 'H', d: 'n' },
    goalText: 'ACROSS THE YARD TO THE HOUSE.',
    exits: { house: {}, lab: { shut: 'THE BEDROOM FIRST.' } },
  });

  R('i-house', {
    screen: 'house',
    clock: 4 * 60 + 38,
    start: { x: 9, y: 8, form: 'H', d: 'n' },
    goalText: 'UP THE STAIRS TO YOUR ROOM.',
    people: [
      { name: 'POOLE', look: 'poole', x: 11, y: 7, asleep: true },
    ],
    exits: {
      up: {},
      back: { shut: 'THE BEDROOM FIRST.' },
      front: { shut: 'NOT IN THIS SHAPE.' },
      mat: { shut: 'NOT IN THIS SHAPE.' },
    },
  });

  R('i-bedroom', {
    screen: 'upstairs',
    clock: 4 * 60 + 47,
    start: { x: 8, y: 7, form: 'H', d: 'n' },
    goalText: 'YOUR ROOM. LOOK IN THE GLASS.',
    acts: {
      mirror: { win: 'next', say: '"I saw for the first time the appearance of Edward Hyde."' },
    },
    exits: { down: { shut: 'THE GLASS FIRST.' } },
  });

  C({
    id: 'I',
    title: 'THE FIRST EXPERIMENT',
    rooms: ['i-cabinet', 'i-theatre', 'i-yard', 'i-house', 'i-bedroom'],
  });

  /* ======================================== II. THE SEA OF LIBERTY */

  R('ii-soho', {
    night: true,
    screen: 'soho',
    clock: 2 * 60 + 41,
    start: { x: 2, y: 3, form: 'H', d: 's', items: ['key'] },
    goalText: 'EAST, FOR HOME. LET NOBODY COME TO HARM.',
    place: [{ x: 11, y: 4, ch: 'b', tile: { kind: 'block', art: 'barrow' } }],
    people: [
      { name: 'A WOMAN WITH A KEY', look: 'woman', x: 6, y: 4 },
      { name: 'A RAGGED CHILD', look: 'child', x: 5, y: 2 },
      { name: 'A RAGGED CHILD', look: 'child', x: 10, y: 2 },
      { name: 'A RAGGED CHILD', look: 'child', x: 8, y: 6 },
    ],
    exits: {
      east: {},
      hyde: { shut: 'HOME IS THE DOOR IN THE BY-STREET.' },
    },
  });

  R('ii-streets', {
    night: true,
    screen: 'streets',
    clock: 2 * 60 + 52,
    start: { x: 1, y: 4, form: 'H', d: 'e', items: ['key'] },
    goalText: 'ON TO THE BY-STREET.',
    people: [
      { name: 'A CABMAN', look: 'cabman', x: 5, y: 3 },
      { name: 'A DRUNKARD', look: 'drunk', x: 9, y: 4 },
      { name: 'A LATE GENTLEMAN', look: 'gent', x: 12, y: 3 },
    ],
    exits: {
      east: {},
      west: { shut: 'HOME IS EAST.' },
    },
  });

  R('ii-bystreet', {
    night: true,
    screen: 'bystreet',
    clock: 3 * 60 + 2,
    start: { x: 1, y: 4, form: 'H', d: 'e', items: ['key'] },
    goalText: 'IN AT THE DOOR. YOU HAVE THE KEY.',
    people: [
      { name: 'A TRAMP', look: 'tramp', x: 11, y: 3 },
      { name: 'A CHILD', look: 'child', x: 9, y: 2 },
      { name: 'A TRAMP', look: 'tramp', x: 9, y: 7 },
    ],
    exits: {
      door: { need: { items: ['key'] } },
      corner: { shut: 'HOME IS THE DOOR.' },
      west: { shut: 'HOME IS THE DOOR.' },
      court: { shut: 'THE DOOR IS RIGHT HERE.' },
    },
  });

  C({
    id: 'II',
    title: 'THE SEA OF LIBERTY',
    rooms: ['ii-soho', 'ii-streets', 'ii-bystreet'],
    cuts: { 'ii-soho': 'streets between' },
  });

  /* ======================================== III. MR. SEEK */

  // "In the morning before office hours, at noon when business was plenty
  // and time scarce, at night under the face of the fogged city moon, by all
  // lights and at all hours of solitude or concourse, the lawyer was to be
  // found on his chosen post." His post: the doorway across from the door.
  const UTTERSON = (x, y, more) => Object.assign({ kind: 'seek', name: 'MR. UTTERSON', look: 'utterson', x, y, range: 8, near: 4, grabs: 'grabbed' }, more);

  R('iii-morning', {
    screen: 'bystreet',
    clock: 8 * 60 + 40,
    start: { x: 1, y: 4, form: 'H', d: 'e', items: ['key'] },
    goalText: 'IN AT THE DOOR, UNSEEN BY MR. UTTERSON.',
    people: [
      UTTERSON(11, 7),
      { name: 'A SHOPMAN', look: 'shopman', x: 8, y: 4 },
    ],
    exits: {
      door: { need: { items: ['key'] } },
      corner: { shut: 'IN AT THE DOOR.' },
      west: { shut: 'IN AT THE DOOR.' },
      court: { shut: 'IN AT THE DOOR.' },
    },
  });


  R('iii-noon', {
    screen: 'bystreet',
    clock: 12 * 60 + 5,
    start: { x: 1, y: 4, form: 'H', d: 'e', items: ['key'] },
    goalText: 'IN AT THE DOOR, UNSEEN. HE IS IN THE STREET.',
    people: [
      UTTERSON(11, 6, { range: 6 }),
      { name: 'A CLERK', look: 'clerk', x: 6, y: 3 },
      { name: 'A FLOWER GIRL', look: 'girl', x: 9, y: 4 },
      { name: 'A PORTER', look: 'porter', x: 13, y: 4 },
    ],
    exits: {
      door: { need: { items: ['key'] } },
      corner: { shut: 'IN AT THE DOOR.' },
      west: { shut: 'IN AT THE DOOR.' },
      court: { shut: 'IN AT THE DOOR.' },
    },
  });

  R('iii-night', {
    night: true,
    screen: 'bystreet',
    clock: 22 * 60 + 50,
    start: { x: 1, y: 5, form: 'H', d: 'e', items: ['key'] },
    goalText: 'IN AT THE DOOR. THE FOG COMES AND GOES.',
    people: [
      UTTERSON(11, 7),
    ],
    fog: {
      dx: 1, every: 1,
      map: [
        '....~~~.......',
        '....~~~.......',
        '....~~~.......',
        '...~~~~.......',
        '...~~~~.......',
        '....~~~~......',
        '....~~~~......',
        '....~~~.......',
        '..............',
        '..............',
      ],
    },
    exits: {
      door: { need: { items: ['key'] } },
      corner: { shut: 'IN AT THE DOOR.' },
      west: { shut: 'IN AT THE DOOR.' },
      court: { shut: 'IN AT THE DOOR.' },
    },
  });

  C({
    id: 'III',
    title: 'MR. SEEK',
    rooms: ['iii-morning', 'iii-noon', 'iii-night'],
    cuts: { 'iii-morning': 'noon', 'iii-noon': 'night' },
  });

  /* ======================================== IV. QUITE AT EASE */

  // "when the light-hearted and loose-tongued had already their foot on the
  // threshold": the guests in the hall for their coats, Poole at the door,
  // and Mr. Utterson contriving to remain behind.
  R('iv-dinner', {
    screen: 'house',
    clock: 22 * 60 + 40,
    start: { x: 8, y: 4, form: 'J', d: 'n' },
    goalText: 'SEE YOUR GUESTS OUT. THEY COME OVER TO YOU.',
    people: [
      { name: 'AN OLD CRONY', look: 'gent', x: 10, y: 3, guest: true },
      { name: 'A JUDGE OF GOOD WINE', look: 'gent2', x: 12, y: 4, guest: true },
      { name: 'A REPUTABLE MAN', look: 'gent3', x: 13, y: 2, guest: true },
      { name: 'AN INTELLIGENT MAN', look: 'gent', x: 11, y: 2, guest: true },
      { name: 'MR. UTTERSON', look: 'utterson', x: 5, y: 3 },
    ],
    goal: { allGone: true },
    exits: {
      mat: { leave: true, say: 'GOOD-NIGHT, JEKYLL.' },
      front: { shut: 'POOLE SEES THEM OUT. WALK THEM TO THE MAT.' },
      back: { shut: 'YOUR GUESTS ARE IN THE HALL.' },
      up: { shut: 'YOUR GUESTS ARE IN THE HALL.' },
    },
  });

  C({
    id: 'IV',
    title: 'QUITE AT EASE',
    rooms: ['iv-dinner'],
  });

  /* ======================================== V. THE HAND OF EDWARD HYDE */

  // "the servants were up; all my drugs were in the cabinet—a long journey
  // down two pair of stairs, through the back passage, across the open
  // court and through the anatomical theatre". The servants are "used to
  // the coming and going of my second self", so being seen is no matter;
  // cornering one is.
  R('v-upstairs', {
    screen: 'upstairs',
    clock: 8 * 60 + 21,
    start: { x: 3, y: 2, form: 'H', d: 's' },
    goalText: 'DOWN THE STAIRS. YOUR DRUGS ARE IN THE CABINET.',
    people: [
      { name: 'THE HOUSEMAID', look: 'maid', x: 4, y: 7 },
      { name: 'BRADSHAW', look: 'bradshaw', x: 9, y: 6 },
    ],
    acts: { mirror: { say: '"It was the hand of Edward Hyde."' } },
    exits: { down: {} },
  });


  R('v-house', {
    screen: 'house',
    clock: 8 * 60 + 33,
    start: { x: 12, y: 7, form: 'H', d: 'w' },
    goalText: 'OUT BY THE BACK PASSAGE, FOR THE CABINET.',
    people: [
      { name: 'THE COOK', look: 'cook', x: 9, y: 6 },
      { name: 'THE KNIFE-BOY', look: 'boy', x: 13, y: 4 },
      { name: 'POOLE', look: 'poole', x: 11, y: 6 },
    ],
    exits: {
      back: {},
      up: { shut: 'DOWN, NOT UP.' },
      front: { shut: 'THE CABINET IS OUT THE BACK.' },
      mat: { shut: 'THE CABINET IS OUT THE BACK.' },
    },
  });

  R('v-theatre', {
    screen: 'theatre',
    clock: 8 * 60 + 47,
    start: { x: 7, y: 1, form: 'H', d: 's' },
    goalText: 'UP THE STAIRS TO THE CABINET, AND THE DRAUGHT.',
    people: [
      { name: 'BRADSHAW', look: 'bradshaw', x: 3, y: 4 },
      { name: 'THE HOUSEMAID', look: 'maid', x: 9, y: 5 },
    ],
    exits: {
      up: {},
      garden: { shut: 'THE CABINET IS UP THE STAIRS.' },
      corridor: { shut: 'THE CABINET IS UP THE STAIRS.' },
    },
  });

  C({
    id: 'V',
    title: 'THE HAND OF EDWARD HYDE',
    rooms: ['v-upstairs', 'v-house', 'v-theatre'],
    cuts: { 'v-house': 'across the open court' },
  });

  /* ======================================== VI. THE CAREW MURDER CASE */

  // "I ran to the house in Soho, and (to make assurance doubly sure)
  // destroyed my papers; thence I set out through the lamplit streets, in
  // the same divided ecstasy of mind, gloating on my crime, light-headedly
  // devising others in the future, and yet still hastening and still
  // hearkening in my wake for the steps of the avenger."
  R('vi-rooms', {
    screen: 'sohorooms',
    clock: 1 * 60 + 12,
    start: { x: 6, y: 8, form: 'H', d: 'n', items: ['key'] },
    goalText: 'BURN THE PAPERS IN BOTH BUREAUS, THEN GO.',
    goals: [
      { need: { flags: ['burned'] }, text: 'DOWN THE STAIRS AND AWAY.' },
      { need: { flags: ['papers1', 'papers2'] }, text: 'BURN THEM IN THE HEARTH.' },
    ],
    place: [{ x: 14, y: 4, ch: 'd', tile: { act: 'drawer2' } }],
    people: [
      { name: 'THE HOUSEKEEPER', look: 'crone', x: 9, y: 7 },
    ],
    acts: {
      drawer: { once: true, set: 'papers1', say: 'PAPERS, AND THE GREEN CHEQUE BOOK.', again: 'EMPTY.' },
      drawer2: { once: true, set: 'papers2', say: 'MORE PAPERS. LETTERS IN YOUR OWN HAND.', again: 'EMPTY.' },
      hearth: {
        once: true,
        need: { flags: ['papers1', 'papers2'] },
        set: 'burned',
        no: 'FIRST, EVERY PAPER FROM BOTH BUREAUS.',
        say: 'THE PAPERS BURN TO GREY ASHES. THE STUB OF THE CHEQUE BOOK WILL NOT.',
        again: 'GREY ASHES.',
      },
    },
    exits: {
      street: { need: { flags: ['burned'] }, no: 'NOT WITH THE PAPERS HERE. BURN THEM.' },
    },
  });

  R('vi-square', {
    night: true,
    screen: 'square',
    clock: 1 * 60 + 31,
    start: { x: 1, y: 1, form: 'H', d: 'e', items: ['key'] },
    wanted: true,
    goalText: 'ACROSS THE SQUARE. KEEP OUT OF THE LANTERNS.',
    people: [
      { kind: 'const', name: 'A CONSTABLE', look: 'constable', route: [[14, 1], [14, 7], [1, 7], [1, 3]], loop: false },
      { kind: 'const', name: 'A CONSTABLE', look: 'constable', route: [[12, 7], [3, 7]] },
    ],
    exits: {
      east: {},
      west: { shut: 'ON. THE BY-STREET IS EAST.' },
    },
  });

  R('vi-bystreet', {
    night: true,
    screen: 'bystreet',
    clock: 1 * 60 + 49,
    start: { x: 14, y: 4, form: 'H', d: 'w', items: ['key'] },
    wanted: true,
    goalText: 'THE DOOR. A CONSTABLE WALKS HIS BEAT.',
    people: [
      { kind: 'const', name: 'A CONSTABLE', look: 'constable', route: [[2, 3], [13, 3]] },
      { kind: 'const', name: 'A CONSTABLE', look: 'constable', route: [[13, 6], [2, 6]] },
    ],
    exits: {
      door: { need: { items: ['key'] } },
      corner: { shut: 'IN AT THE DOOR.' },
      west: { shut: 'IN AT THE DOOR.' },
      court: { shut: 'IN AT THE DOOR.' },
    },
  });

  C({
    id: 'VI',
    title: 'THE CAREW MURDER CASE',
    rooms: ['vi-rooms', 'vi-square', 'vi-bystreet'],
    cuts: { 'vi-rooms': 'out through Soho', 'vi-square': 'round to the by-street' },
  });

  /* ======================================== VII. REGENT'S PARK */

  R('vii-park', {
    screen: 'park',
    clock: 13 * 60 + 10,
    start: { x: 1, y: 1, form: 'J', d: 'e' },
    wanted: true,
    goalText: 'TAKE THE AIR. SIT ON THE BENCH IN THE SUN.',
    goals: [{ need: { flags: ['sat'] }, text: 'OUT BY THE EAST GATE. THE POLICE ARE HUNTING HYDE.' }],
    people: [
      { name: 'A CURATE', look: 'curate', x: 9, y: 1 },
      { name: 'A NURSEMAID', look: 'nurse', x: 6, y: 6 },
      { name: 'A PATIENT', look: 'gent', x: 10, y: 6 },
      { kind: 'const', name: 'A PARK KEEPER', look: 'constable', route: [[13, 8], [2, 8]] },
      { kind: 'const', name: 'A CONSTABLE', look: 'constable', route: [[14, 1], [14, 6]] },
    ],
    acts: {
      bench: {
        once: true,
        need: { form: 'J' },
        change: 'H',
        set: 'sat',
        say: '"I looked down; my clothes hung formlessly on my shrunken limbs; the hand that lay on my knee was corded and hairy."',
        again: 'NO TIME TO SIT. AWAY!',
      },
    },
    exits: {
      east: { need: { flags: ['sat'] }, no: 'THE BENCH, IN THE SUN, FIRST.' },
      west: { shut: 'ON THROUGH THE PARK.' },
    },
  });

  C({
    id: 'VII',
    title: "REGENT'S PARK",
    rooms: ['vii-park'],
  });

  /* ======================================== VIII. MIDNIGHT */

  R('viii-hotel', {
    screen: 'hotel',
    clock: 14 * 60 + 2,
    start: { x: 7, y: 8, form: 'H', d: 'n' },
    goalText: 'A PRIVATE ROOM, AND WHEREWITHAL TO WRITE.',
    people: [
      { name: 'A WAITER', look: 'waiter', x: 7, y: 5 },
      { name: 'THE PORTER', look: 'porter', x: 4, y: 7 },
      { name: 'A CHAMBERMAID', look: 'maid', x: 13, y: 5 },
    ],
    acts: {
      write: { win: 'next', say: '"one to Lanyon and one to Poole"' },
    },
    exits: { street: { shut: 'THERE ARE LETTERS TO WRITE.' } },
  });

  R('viii-alleys', {
    night: true,
    screen: 'alleys',
    clock: 23 * 60 + 36,
    start: { x: 1, y: 1, form: 'H', d: 'e' },
    wanted: true,
    goalText: 'TO CAVENDISH SQUARE BY MIDNIGHT.',
    people: [
      { kind: 'seek', name: 'A WOMAN WITH MATCHES', look: 'matches', x: 10, y: 4, range: 4, near: 1, closes: true, grabs: 'smote' },
      { kind: 'const', name: 'A CONSTABLE', look: 'constable', route: [[1, 7], [10, 7]] },
      { kind: 'const', name: 'A CONSTABLE', look: 'constable', route: [[7, 1], [7, 7]] },
    ],
    exits: {
      east: {},
      west: { shut: 'CAVENDISH SQUARE IS EAST.' },
    },
  });

  R('viii-cavendish', {
    night: true,
    screen: 'cavendish',
    clock: 23 * 60 + 47,
    start: { x: 1, y: 3, form: 'H', d: 'e' },
    wanted: true,
    deadline: 24 * 60 + 4,
    goalText: 'KNOCK AT DR. LANYON\'S DOOR AT MIDNIGHT: 12:00 TO 12:03.',
    people: [
      { kind: 'const', name: 'A CONSTABLE', look: 'constable', route: [[14, 2], [1, 2]] },
      { kind: 'const', name: 'A CONSTABLE', look: 'constable', route: [[14, 8], [1, 8]] },
    ],
    exits: {
      lanyon: { need: { after: 24 * 60, before: 24 * 60 + 3 }, no: 'NOT YET. "At midnight, then"' },
      west: { shut: 'THE DOOR IS HERE.' },
    },
  });

  C({
    id: 'VIII',
    title: 'MIDNIGHT',
    rooms: ['viii-hotel', 'viii-alleys', 'viii-cavendish'],
    cuts: { 'viii-hotel': 'the cab', 'viii-alleys': 'arriving' },
  });

  /* ======================================== IX. LANYON'S NARRATIVE */

  R('ix-lanyon', {
    screen: 'consulting',
    clock: 24 * 60 + 2,
    start: { x: 7, y: 8, form: 'H', d: 'n' },
    goalText: 'THE DRAWER, AND A GRADUATED GLASS FROM THE SHELVES.',
    goals: [
      { need: { doses: 1 }, text: 'NOW DRINK IT, WHERE DR. LANYON CAN SEE YOU.' },
      { need: { items: ['drawer', 'glass'] }, text: 'MIX THE DRAUGHT AT THE TABLE.' },
    ],
    mustSee: [0],
    people: [
      { name: 'DR. LANYON', look: 'lanyon', x: 12, y: 3, steadfast: true },
    ],
    acts: {
      drawer: { once: true, give: { items: ['drawer'] }, say: '"some powders, a phial and a paper book"', again: 'THE DRAWER IS OPEN.' },
      shelf: { once: true, give: { items: ['glass'] }, say: '"Have you a graduated glass?"', again: 'YOU HAVE THE GLASS.' },
      table: {
        once: true,
        need: { items: ['drawer', 'glass'] },
        give: { doses: 1 },
        no: 'THE DRAWER AND A GLASS FIRST.',
        say: '"The mixture, which was at first of a reddish hue, began, in proportion as the crystals melted, to brighten in colour"',
        again: 'THE GLASS IS READY.',
      },
    },
    goal: { form: 'J', flags: ['witnessed'] },
    exits: { hall: { shut: 'IT IS TOO LATE TO GO.' } },
  });

  C({
    id: 'IX',
    title: "DR. LANYON'S NARRATIVE",
    rooms: ['ix-lanyon'],
  });

  /* ======================================== X. THE SHUDDER */

  R('x-yard', {
    screen: 'yard',
    clock: 9 * 60 + 40,
    start: { x: 6, y: 1, form: 'J', d: 's' },
    change: { every: 9 },
    goalText: 'THE CHANGE IS COMING. GAIN THE LABORATORY. NOBODY MAY SEE.',
    people: [
      { name: 'THE KNIFE-BOY', look: 'boy', x: 10, y: 4, hostile: true },
      { name: 'THE COOK', look: 'cook', x: 3, y: 5, hostile: true },
      { name: 'POOLE', look: 'poole', x: 12, y: 8, hostile: true },
    ],
    exits: {
      lab: {},
      house: { shut: 'NOT BACK INTO THE HOUSE. NOT NOW.' },
    },
  });

  // "the cabinet door was open, and there he was at the far end of the room
  // digging among the crates."
  R('x-theatre', {
    screen: 'theatre',
    clock: 23 * 60 + 10,
    start: { x: 1, y: 4, form: 'H', d: 'e' },
    night: true,
    goalText: 'SEARCH THREE CRATES FOR THE OLD SALT. POOLE MUST NOT SEE YOU.',
    goals: [{ need: { flags: ['searched'] }, text: 'NOTHING. BACK UP THE STAIRS, UNSEEN.' }],
    place: [
      { x: 3, y: 3, ch: 'c', tile: { kind: 'low', art: 'crate', act: 'crate1' } },
      { x: 12, y: 6, ch: 'c', tile: { kind: 'low', art: 'crate', act: 'crate2' } },
      { x: 2, y: 7, ch: 'c', tile: { kind: 'low', art: 'crate', act: 'crate3' } },
    ],
    people: [
      { kind: 'const', name: 'POOLE', look: 'poole-candle', hostile: true, enter: 2, loop: true, route: [[8, 1], [14, 1], [14, 8], [5, 8], [5, 5], [8, 5], [8, 1]] },
    ],
    acts: Object.fromEntries(['crate1', 'crate2', 'crate3'].map((id) => [id, {
      once: true,
      count: 'crate', of: 3, done: 'searched',
      sayEach: ['STRAW. NOTHING.', 'BROKEN BOTTLES. NOTHING.', 'NONE OF THE OLD SALT IS LEFT. NONE.'],
      again: 'SEARCHED. NOTHING.',
    }])),
    exits: {
      up: { need: { flags: ['searched'] }, no: 'THE CRATES FIRST.' },
      garden: { shut: 'NOT OUT THERE.' },
      corridor: { shut: 'NOT OUT THERE.' },
    },
  });

  C({
    id: 'X',
    title: 'THE PREMONITORY SHUDDER',
    rooms: ['x-yard', 'x-theatre'],
    cuts: { 'x-yard': 'weeks later' },
  });

  /* ======================================== XI. THE LAST NIGHT */

  R('xi-cabinet', {
    screen: 'cabinet',
    clock: 21 * 60 + 5,
    start: { x: 7, y: 6, form: 'J', d: 'n', doses: 4 },
    change: { every: 5 },
    doze: true,
    cost: 2,
    place: [{ x: 13, y: 7, ch: 'M' }],
    tears: { act: 'desk', unless: 'written', why: 'torn' },
    goalText: 'WRITE THE STATEMENT AT THE TABLE. HYDE WOULD TEAR IT.',
    goals: [
      { need: { form: 'H' }, text: 'KEEP HYDE FROM THE TABLE. X: THE DRAUGHT, A DOUBLE DOSE.' },
    ],
    acts: {
      desk: {
        need: { form: 'J', below: { page: 10 } },
        hyde: 'torn',
        count: 'page', of: 10, done: 'written',
        sayEach: [
          '"I was born in the year 18— to a large fortune"',
          'PAGE 2: THE TWO NATURES.',
          'PAGE 3: THE FIRST EXPERIMENT.',
          'PAGE 4: THE HOUSE IN SOHO; THE WILL.',
          'PAGE 5: THE CHILD, AND THE CHEQUE.',
          'PAGE 6: THE MORNING OF THE HAND.',
          'PAGE 7: SIR DANVERS.',
          'PAGE 8: THE BENCH; LANYON.',
          'PAGE 9: THE SALT.',
          'THE LAST PAGE. IT IS DONE.',
        ],
      },
      mirror: { say: '"This glass has seen some strange things, sir"' },
      pressE: { say: 'THE LAST OF THE OLD POWDERS ARE IN YOUR HAND.' },
      hearth: { say: '"a good fire glowing and chattering on the hearth"' },
      chair: { say: '"if I slept, or even dozed for a moment in my chair, it was always as Hyde that I awakened"' },
      window: { say: 'THE COURT IS DARK AND WINDY.' },
    },
    goal: { flags: ['written'] },
    exits: { baize: { shut: 'THERE IS NOWHERE TO GO.' } },
  });

  C({
    id: 'XI',
    title: 'THE LAST NIGHT',
    rooms: ['xi-cabinet'],
  });
})();
