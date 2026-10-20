'use strict';
/*
 * JEKYLL.EXE: the story. Words in double quotation marks are Stevenson's,
 * verbatim from docs/jekyll/the-strange-case.txt (scripts/jekyll/quotes.ts
 * checks every one); the game's own words are in capitals, and short.
 *
 * The book is told by the people who watched: Enfield, Utterson, the maid,
 * Poole, Lanyon. Only the last chapter, Jekyll's statement, comes from
 * inside. So the game alternates the two. Each chapter opens with the
 * STATEMENT (set in Jekyll's hand, which slopes) and you play the nights it
 * tells of; it closes with the CASE, what the others saw. The book is the
 * record of the times Hyde was seen. The game is all the other times.
 *
 * A page: { pic, title, text, hand }. hand: 'J' Jekyll's writing, 'H'
 * Hyde's; none for the narrators.
 */
(() => {
  const P = (pic, text, more) => Object.assign({ pic, text }, more);
  const J = (pic, text, more) => Object.assign({ pic, text, hand: 'J' }, more);
  const H = (pic, text, more) => Object.assign({ pic, text, hand: 'H' }, more);
  const RULE = (text, more) => Object.assign({ pic: null, text, ink: JH.INK.cyan, title: 'HOW IT WORKS' }, more);

  JH.STORY = {};

  /* The book's frame: Utterson and Poole, the last night. */
  JH.STORY.prologue = [
    P('night-square', '"It was a wild, cold, seasonable night of March, with a pale moon, lying on her back as though the wind had tilted her" POOLE HAS COME FOR MR. UTTERSON.'),
    P('baize', '"Poole swung the axe over his shoulder; the blow shook the building, and the red baize door leaped against the lock and hinges."'),
    P('body', '"Right in the middle there lay the body of a man sorely contorted and still twitching. They drew near on tiptoe, turned it on his back and beheld the face of Edward Hyde."'),
    P('envelope', '"On the desk, among the neat array of papers, a large envelope was uppermost, and bore, in the doctor’s hand, the name of Mr. Utterson."'),
    J(null, '"if you care to hear more, turn to the confession of" "Your unworthy and unhappy friend," "HENRY JEKYLL."', { title: 'A NOTE, IN THE DOCTOR’S HAND' }),
    RULE('"HENRY JEKYLL’S FULL STATEMENT OF THE CASE" THE BOOK IS WHAT THE OTHERS SAW. THIS IS THE REST: THE STATEMENT, AND THE NIGHTS IT TELLS OF. YOU PLAY HENRY JEKYLL. BOTH OF HIM.', { title: 'THE STATEMENT', ink: JH.INK.white }),
    J(null, '"I was born in the year 18— to a large fortune, endowed besides with excellent parts, inclined by nature to industry, fond of the respect of the wise and good among my fellowmen" "Hence it came about that I concealed my pleasures" "that man is not truly one, but truly two."'),
  ];

  JH.STORY.ending = [
    P('baize', '"Jekyll," CRIED UTTERSON, "I demand to see you."'),
    H('baize', '"Utterson," SAID THE VOICE, "for God’s sake, have mercy!"'),
    P('baize', '"Ah, that’s not Jekyll’s voice—it’s Hyde’s!" "Down with the door, Poole!"'),
    P('baize', '"four times the blow fell; but the wood was tough and the fittings were of excellent workmanship; and it was not until the fifth, that the lock burst and the wreck of the door fell inwards on the carpet."'),
    P('quiet', '"the quietest room, you would have said, and, but for the glazed presses full of chemicals, the most commonplace that night in London."'),
    J(null, '"Will Hyde die upon the scaffold? or will he find courage to release himself at the last moment? God knows; I am careless; this is my true hour of death, and what is to follow concerns another than myself."'),
    J(null, '"Here then, as I lay down the pen and proceed to seal up my confession, I bring the life of that unhappy Henry Jekyll to an end."'),
  ];
  JH.STORY.ending.music = 'end';

  JH.CREDITS = [
    'THE END',
    '',
    'STRANGE CASE OF',
    'DR JEKYLL AND MR HYDE',
    'ROBERT LOUIS STEVENSON, 1886',
    '',
    'THE TEXT: PROJECT GUTENBERG #43',
    '',
    'JEKYLL.EXE',
    'A GAME FOR FUNKIE.DEV',
    '',
    '',
    'Z: TO THE TITLE',
  ];

  /* ------------------------------------------------------------ chapters */
  const CH = {};

  CH.I = {
    date: 'ONE NIGHT',
    blurb: 'THE STATEMENT: HOW IT BEGAN.',
    intro: [
      J('apparatus', '"Certain agents I found to have the power to shake and pluck back that fleshly vestment, even as a wind might toss the curtains of a pavilion."'),
      J('apparatus', '"late one accursed night, I compounded the elements, watched them boil and smoke together in the glass, and when the ebullition had subsided, with a strong glow of courage, drank off the potion."'),
      RULE('ARROWS: WALK. WALK INTO A THING TO USE IT. X: DRINK THE DRAUGHT. Z: TAKE A MOVE BACK, AS OFTEN AS YOU LIKE. EVERY MOVE IS A MINUTE. A WAY OUT YOU CAN TAKE BLINKS.'),
    ],
    outro: [
      J('glass', '"And yet when I looked upon that ugly idol in the glass, I was conscious of no repugnance, rather of a leap of welcome. This, too, was myself."'),
      J('apparatus', '"hurrying back to my cabinet, I once more prepared and drank the cup, once more suffered the pangs of dissolution, and came to myself once more with the character, the stature and the face of Henry Jekyll." "That night I had come to the fatal cross-roads."'),
    ],
  };

  CH.II = {
    date: 'NIGHTS',
    blurb: 'THE STATEMENT: THE DOUBLE LIFE.',
    intro: [
      J('soho', '"I took and furnished that house in Soho, to which Hyde was tracked by the police; and engaged as a housekeeper a creature whom I knew well to be silent and unscrupulous."'),
      J('will', '"I next drew up that will to which you so much objected" "Think of it—I did not even exist!"'),
      J('door', '"Let me but escape into my laboratory door, give me but a second or two to mix and swallow the draught that I had always standing ready"'),
      RULE('"none could come near to me at first without a visible misgiving of the flesh." PEOPLE WHO SEE HYDE BACK AWAY FROM HIM, A STEP A TURN. IF SOMEONE NEXT TO HIM HAS NOWHERE TO GO, HE STRIKES THEM. SOMEONE WHO FLASHES IS CORNERED: DON’T STEP BESIDE THEM.'),
    ],
    outro: [
      P('door', 'ONE SUNDAY, MR. UTTERSON AND HIS KINSMAN MR. ENFIELD WALKED PAST THE DOOR. "Did you ever remark that door?"', { title: 'STORY OF THE DOOR' }),
      P('door', '"the man trampled calmly over the child’s body and left her screaming on the ground. It sounds nothing to hear, but it was hellish to see. It wasn’t like a man; it was like some damned Juggernaut."'),
      P('door', '"where do you think he carried us but to that place with the door?—whipped out a key, went in, and presently came back with the matter of ten pounds in gold and a cheque for the balance on Coutts’s"'),
      P('door', 'A CHEQUE IN A VERY WELL KNOWN NAME. "It was a man of the name of Hyde."'),
      P('will', 'THAT NIGHT MR. UTTERSON TOOK DR. JEKYLL’S WILL FROM HIS SAFE: "all his possessions were to pass into the hands of his ‘friend and benefactor Edward Hyde,’" "I thought it was madness," HE SAID, "and now I begin to fear it is disgrace."', { title: 'SEARCH FOR MR. HYDE' }),
    ],
  };

  CH.III = {
    date: 'ALL HOURS',
    blurb: 'THE CASE: MR. UTTERSON WATCHES THE DOOR.',
    intro: [
      P('lamps', '"If he be Mr. Hyde," HE THOUGHT, "I shall be Mr. Seek."'),
      P('lamps', '"In the morning before office hours, at noon when business was plenty and time scarce, at night under the face of the fogged city moon, by all lights and at all hours of solitude or concourse, the lawyer was to be found on his chosen post."'),
      RULE('MR. UTTERSON SEES FARTHER THAN MOST, ALONG ROWS AND COLUMNS. WITHIN FOUR SQUARES HE KNOWS YOU. FARTHER OFF, HE COMES CLOSER FOR A LOOK: GET OUT OF HIS SIGHT. ANYONE STANDING BETWEEN YOU HIDES YOU. L: LOOK, TO SEE WHAT EVERYONE CAN SEE.'),
    ],
    outro: [
      P('meeting', '"And at last his patience was rewarded. It was a fine dry night; frost in the air; the streets as clean as a ballroom floor"'),
      P('meeting', '"Mr. Utterson stepped out and touched him on the shoulder as he passed. ‘Mr. Hyde, I think?’"'),
      P('meeting', '"Will you let me see your face?" "Now I shall know you again," SAID MR. UTTERSON. "It may be useful."'),
      H('meeting', '"He never told you," CRIED MR. HYDE. "I did not think you would have lied."'),
      P('meeting', '"The other snarled aloud into a savage laugh; and the next moment, with extraordinary quickness, he had unlocked the door and disappeared into the house."'),
      P('hall', 'ROUND IN THE SQUARE, POOLE: "Mr. Hyde has a key." "We have all orders to obey him." AND MR. UTTERSON: "if ever I read Satan’s signature upon a face, it is on that of your new friend."'),
    ],
  };

  CH.IV = {
    date: 'A FORTNIGHT',
    blurb: 'THE CASE: A DINNER IN THE SQUARE.',
    intro: [
      P('hall', '"A fortnight later, by excellent good fortune, the doctor gave one of his pleasant dinners to some five or six old cronies, all intelligent, reputable men and all judges of good wine; and Mr. Utterson so contrived that he remained behind after the others had departed."'),
      RULE('YOU ARE JEKYLL TONIGHT. PEOPLE WHO SEE HIM COME OVER TO HIM, A STEP A TURN, AND STOP BESIDE HIM. WALK YOUR GUESTS OVER THE MAT AT THE FRONT DOOR AND POOLE WILL SEE THEM OUT. MR. UTTERSON WILL NOT GO.'),
    ],
    outro: [
      P('fireside', '"I have been wanting to speak to you, Jekyll," "You know that will of yours?" "I have been learning something of young Hyde."'),
      J('fireside', '"the moment I choose, I can be rid of Mr. Hyde. I give you my hand upon that"'),
      J('fireside', '"I only ask for justice; I only ask you to help him for my sake, when I am no longer here."'),
      P('fireside', '"Well," SAID HE, "I promise."'),
    ],
  };

  CH.V = {
    date: 'ONE MORNING',
    blurb: 'THE STATEMENT: THE FIRST WARNING.',
    intro: [
      J('bedroom', '"Some two months before the murder of Sir Danvers, I had been out for one of my adventures, had returned at a late hour, and woke the next day in bed with somewhat odd sensations."'),
      J('hand', '"the hand which I now saw, clearly enough, in the yellow light of a mid-London morning, lying half shut on the bedclothes, was lean, corded, knuckly, of a dusky pallor and thickly shaded with a swart growth of hair. It was the hand of Edward Hyde."'),
      J('bedroom', '"It was well on in the morning; the servants were up; all my drugs were in the cabinet" "the servants were already used to the coming and going of my second self." LET THEM SEE YOU. DON’T CORNER ONE.'),
    ],
    outro: [
      J('apparatus', '"ten minutes later, Dr. Jekyll had returned to his own shape and was sitting down, with a darkened brow, to make a feint of breakfasting."'),
      J(null, '"I was slowly losing hold of my original and better self, and becoming slowly incorporated with my second and worse." "I chose the better part and was found wanting in the strength to keep to it."'),
      J(null, '"For two months, however, I was true to my determination" "and at last, in an hour of moral weakness, I once again compounded and swallowed the transforming draught." "My devil had been long caged, he came out roaring."'),
    ],
  };

  CH.VI = {
    date: 'OCTOBER',
    blurb: 'THE CASE, AND THE STATEMENT.',
    intro: [
      P('lane', '"Nearly a year later, in the month of October, 18—, London was startled by a crime of singular ferocity and rendered all the more notable by the high position of the victim."', { title: 'THE CAREW MURDER CASE' }),
      P('lane', '"the lane, which the maid’s window overlooked, was brilliantly lit by the full moon." "an aged beautiful gentleman with white hair" "a certain Mr. Hyde"'),
      P('lane', '"And then all of a sudden he broke out in a great flame of anger, stamping with his foot, brandishing the cane, and carrying on (as the maid described it) like a madman." "At the horror of these sights and sounds, the maid fainted."'),
      J(null, '"A mist dispersed; I saw my life to be forfeit; and fled from the scene of these excesses" "I ran to the house in Soho, and (to make assurance doubly sure) destroyed my papers"'),
      RULE('A CONSTABLE SEES ONLY WHERE HIS BULL’S-EYE LANTERN SHINES: THE WAY HE FACES, LIT YELLOW. AT THE END OF HIS BEAT HE TURNS ROUND. TONIGHT HE WOULD STOP HYDE. STAY OUT OF THE LIGHT.'),
    ],
    outro: [
      J('apparatus', '"Henry Jekyll, with streaming tears of gratitude and remorse, had fallen upon his knees and lifted his clasped hands to God." "with what sincere renunciation I locked the door by which I had so often gone and come, and ground the key under my heel!"'),
      P('soho', 'IN THE MORNING MR. UTTERSON TOOK INSPECTOR NEWCOMEN TO SOHO. "on the hearth there lay a pile of grey ashes, as though many papers had been burned. From these embers the inspector disinterred the butt end of a green cheque book, which had resisted the action of the fire; the other half of the stick was found behind the door"'),
      P('letter', 'JEKYLL GAVE UTTERSON A LETTER SIGNED EDWARD HYDE. UTTERSON’S CLERK, MR. GUEST, LAID IT BESIDE A NOTE FROM JEKYLL: "the two hands are in many points identical: only differently sloped."', { title: 'INCIDENT OF THE LETTER' }),
      P('letter', 'AND THAT NIGHT, ALONE: "Henry Jekyll forge for a murderer!"'),
    ],
  };

  CH.VII = {
    date: 'JANUARY',
    blurb: 'THE STATEMENT: THE OPEN AIR.',
    intro: [
      P('park', '"Now that that evil influence had been withdrawn, a new life began for Dr. Jekyll." "He was busy, he was much in the open air, he did good"'),
      J('park', '"It was a fine, clear, January day, wet under foot where the frost had melted, but cloudless overhead; and the Regent’s Park was full of winter chirrupings and sweet with spring odours. I sat in the sun on a bench"'),
      J('park', '"a qualm came over me, a horrid nausea and the most deadly shuddering."'),
      RULE('YOU KNOW WHAT COMES WHEN HE SITS DOWN. WHO WILL BE STANDING BESIDE HIM WHEN IT DOES? AFTERWARDS, OUT BY THE EAST GATE. THE POLICE ARE HUNTING HYDE.'),
    ],
    outro: [
      J('park', '"A moment before I had been safe of all men’s respect, wealthy, beloved—the cloth laying for me in the dining-room at home; and now I was the common quarry of mankind, hunted, houseless, a known murderer, thrall to the gallows."'),
      J(null, '"I saw I must employ another hand, and thought of Lanyon." "Then I remembered that of my original character, one part remained to me: I could write my own hand"'),
    ],
  };

  CH.VIII = {
    date: 'THAT NIGHT',
    blurb: 'THE STATEMENT: TO CAVENDISH SQUARE.',
    intro: [
      J('hotel', '"summoning a passing hansom, drove to an hotel in Portland Street" "At the inn, as I entered, I looked about me with so black a countenance as made the attendants tremble"'),
    ],
    outro: [
      P('portico', '"Twelve o’clock had scarce rung out over London, ere the knocker sounded very gently on the door. I went myself at the summons, and found a small man crouching against the pillars of the portico."', { title: 'DR. LANYON’S NARRATIVE' }),
      P('portico', '"Are you come from Dr. Jekyll?"'),
    ],
  };

  CH.IX = {
    date: 'MIDNIGHT',
    blurb: 'THE CASE: DR. LANYON’S NARRATIVE.',
    intro: [
      H('consulting', '"Have you got it?" HE CRIED. "Have you got it?"'),
      H('consulting', '"you who have denied the virtue of transcendental medicine, you who have derided your superiors—behold!"'),
      RULE('THIS ONCE, SOMEONE MUST SEE. THE DRAWER FROM THE PRESS MARKED E LIES UNDER ITS SHEET. LANYON HAS A GRADUATED GLASS. MIX IT AT THE TABLE, AND DRINK WHERE HE CAN SEE YOU.'),
    ],
    outro: [
      P('consulting', '"He put the glass to his lips and drank at one gulp."'),
      P('consulting', '"there before my eyes—pale and shaken, and half fainting, and groping before him with his hands, like a man restored from death—there stood Henry Jekyll!"'),
      P(null, '"My life is shaken to its roots; sleep has left me; the deadliest terror sits by me at all hours of the day and night" "HASTIE LANYON."'),
      P(null, '"A week afterwards Dr. Lanyon took to his bed, and in something less than a fortnight he was dead."'),
    ],
  };

  CH.X = {
    date: 'AFTER',
    blurb: 'THE STATEMENT: THE CHANGE COMES ON ITS OWN.',
    intro: [
      J('yard', '"I was stepping leisurely across the court after breakfast, drinking the chill of the air with pleasure, when I was seized again with those indescribable sensations that heralded the change; and I had but the time to gain the shelter of my cabinet"'),
      RULE('NOW THE CHANGE COMES ON ITS OWN: WATCH THE COUNT. NOBODY MAY SEE IT HAPPEN. AND THE SERVANTS KNOW HYDE FOR A MURDERER NOW: IF ONE SEES HIM, IT IS OVER.'),
    ],
    outro: [
      P('window', '"The middle one of the three windows was half-way open; and sitting close beside it, taking the air with an infinite sadness of mien, like some disconsolate prisoner, Utterson saw Dr. Jekyll."', { title: 'INCIDENT AT THE WINDOW' }),
      P('window', '"the smile was struck out of his face and succeeded by an expression of such abject terror and despair, as froze the very blood of the two gentlemen below." "God forgive us, God forgive us,"'),
      P('lab-night', 'AND POOLE, LATER: "It was but for one minute that I saw him, but the hair stood upon my head like quills. Sir, if that was my master, why had he a mask upon his face?"', { title: 'THE LAST NIGHT' }),
      J('letter', 'THE DOCTOR’S ORDER TO THE CHEMISTS, MESSRS. MAW: "For God’s sake," HE ADDED, "find me some of the old."'),
    ],
  };

  CH.XI = {
    date: 'A WEEK',
    blurb: 'THE STATEMENT: THE LAST OF THE OLD POWDERS.',
    intro: [
      J('quiet', '"About a week has passed, and I am now finishing this statement under the influence of the last of the old powders."'),
      J('quiet', '"Should the throes of change take me in the act of writing it, Hyde will tear it in pieces"'),
      RULE('WRITE AT THE TABLE AS JEKYLL: TEN PAGES. BE AWAY FROM IT WHEN THE CHANGE COMES. A DRAUGHT NOW TAKES A DOUBLE DOSE, AND YOU HAVE TWO. AND DON’T WAIT: "if I slept, or even dozed for a moment in my chair, it was always as Hyde that I awakened."'),
    ],
    outro: [],
  };

  JH.CHAPTER_STORY = CH;
  JH.CHAPTERS.forEach((c) => { const s = CH[c.id]; if (s) { c.date = s.date; c.blurb = s.blurb; } });
  JH.chapterStory = (id, part) => (CH[id] ? CH[id][part] : null);

  /* Story sequences by name, for links: prologue, ending, ch3-intro... */
  JH.storyById = (id) => {
    if (JH.STORY[id]) return JH.STORY[id];
    const m = /^ch(\d+)-(intro|outro)$/.exec(id);
    if (!m) return null;
    const c = JH.CHAPTERS[Number(m[1]) - 1];
    const s = c && JH.chapterStory(c.id, m[2]);
    return s && s.length ? s : null;
  };

  /* A line at the top of a room as it starts, when the story has more to say. */
  JH.ROOM_CARDS = {
    'i-theatre': '"I felt younger, lighter, happier in body" HYDE CAN CLIMB OVER CRATES, STRAW, HEDGES AND RAILINGS. JEKYLL CAN’T.',
    'i-yard': '"I crossed the yard, wherein the constellations looked down upon me"',
    'i-house': '"I stole through the corridors, a stranger in my own house"',
    'ii-streets': '"street after street, all lighted up as if for a procession and all as empty as a church"',
    'ii-bystreet': '"Tramps slouched into the recess and struck matches on the panels"',
    'iii-morning': '"In the morning before office hours"',
    'iii-noon': '"at noon when business was plenty and time scarce" HE IS OUT IN THE STREET. DON\u2019T DRAW HIM BETWEEN YOU AND THE DOOR.',
    'iii-night': '"at night under the face of the fogged city moon"',
    'v-house': 'DOWN THE STAIRS, AND THROUGH THE BACK PASSAGE.',
    'v-theatre': '"across the open court and through the anatomical theatre"',
    'vi-rooms': 'SOHO. "lock-fast drawers" AND THE HEARTH.',
    'vi-square': '"thence I set out through the lamplit streets"',
    'vi-bystreet': '"still hastening and still hearkening in my wake for the steps of the avenger."',
    'viii-hotel': '"led me to a private room, and brought me wherewithal to write."',
    'viii-alleys': '"Once a woman spoke to him, offering, I think, a box of lights." SHE COMES TO HYDE. DON’T LET HER REACH HIM.',
    'viii-cavendish': '"counting the minutes that still divided him from midnight." KNOCK AT LANYON’S DOOR AS MIDNIGHT STRIKES, BETWEEN 12:00 AND 12:03.',
    'x-theatre': 'WEEKS LATER. "the first change of colour, not the second" SEARCH THE OLD CRATES FOR ANY OF THE FIRST SALT. POOLE COMES IN WITH HIS CANDLE.',
  };

  /* What ends a night badly. The quote, then what happened. */
  JH.FAIL_TEXT = {
    strike: { quote: '"It wasn’t like a man; it was like some damned Juggernaut."', text: 'HYDE STRUCK {who}, WHO HAD NOWHERE TO GO.' },
    caught: { quote: '"I have him in my hand."', text: 'A CONSTABLE’S LANTERN FOUND HYDE.' },
    known: { quote: '"If I sought to enter by the house, my own servants would consign me to the gallows."', text: '{who} SAW HYDE.' },
    grabbed: { quote: '"Mr. Hyde, I think?"', text: 'MR. UTTERSON SAW HIS FACE.' },
    smote: { quote: '"He smote her in the face, and she fled."', text: 'SHE CAME TOO CLOSE.' },
    seen: { quote: '"O God!"', text: '{who} SAW THE CHANGE.' },
    time: { quote: '"It may then already be too late"', text: 'THE TIME HAS GONE.' },
    unseen: { quote: '"As you decide, you shall be left as you were before, and neither richer nor wiser"', text: 'DR. LANYON DID NOT SEE IT. THIS ONCE, HE MUST.' },
    torn: { quote: '"Hyde will tear it in pieces"', text: 'THE CHANGE TOOK HIM AT THE TABLE. THE STATEMENT IS TORN.' },
  };
})();
