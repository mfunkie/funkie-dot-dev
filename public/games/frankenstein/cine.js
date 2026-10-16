'use strict';
/*
 * FRANKEN.EXE: the story between the stages, the title screen and the end.
 * Lines in quotation marks are Mary Shelley's (1818 text), sometimes cut down
 * to fit a 29-column NES text box. Each panel names a picture in art-cine.js.
 */
(() => {
  const { W: SW, H: SH } = FK;
  const V = 'VICTOR', M = 'THE CREATURE';

  FK.CINE = {
    opening: Object.assign([
      { art: 'ship', text: 'ARCHANGEL, 17--. ROBERT WALTON WRITES TO HIS SISTER IN ENGLAND. HIS SHIP IS BOUND FOR THE POLE.', music: 'dread' },
      { art: 'giant', text: 'AUGUST. THE SHIP IS CLOSED IN BY ICE. FAR OFF, A SLEDGE DRAWN BY DOGS PASSES NORTH, GUIDED BY "A BEING OF GIGANTIC STATURE."' },
      { art: 'floe', text: 'THE NEXT MORNING A SECOND SLEDGE DRIFTS UP ON A FRAGMENT OF ICE. ITS DRIVER IS NEARLY FROZEN.' },
      { art: 'victorTalk', who: V, text: '"YOU SEEK FOR KNOWLEDGE AND WISDOM, AS I ONCE DID." HEAR MY TALE, AND LEARN FROM IT.' },
    ], {}),

    ch1: [
      { art: 'geneva', text: '"I AM BY BIRTH A GENEVESE." AS A BOY I READ THE OLD ALCHEMISTS: AGRIPPA, PARACELSUS, ALBERTUS MAGNUS.', music: 'sad' },
      { art: 'oak', text: 'AT FIFTEEN I WATCHED LIGHTNING STRIKE AN OLD OAK. "NOTHING REMAINED BUT A BLASTED STUMP."', sfx: 'thunder', sfxAt: 18 },
      { art: 'coach', text: 'AT SEVENTEEN I LEFT GENEVA, AND MY DEAR ELIZABETH, FOR THE UNIVERSITY OF INGOLSTADT.' },
      { art: 'windBooks', text: 'ON THE DAY I ARRIVED, A GALE TORE MY THREE OLD BOOKS FROM THE COACH AND SCATTERED THEM ACROSS THE ROOFTOPS.' },
      { art: 'victorTalk', who: V, text: 'NATURALLY, THERE WAS NOTHING FOR IT BUT TO JUMP FROM ROOF TO ROOF.' },
    ],

    ch1end: [
      { art: 'lecture', who: 'M. WALDMAN', text: '"THE ANCIENT TEACHERS OF THIS SCIENCE PROMISED IMPOSSIBILITIES. THE MODERN MASTERS PROMISE VERY LITTLE..."', music: 'dread' },
      { art: 'lecture', who: 'M. WALDMAN', text: '"...BUT THEY HAVE INDEED PERFORMED MIRACLES. THEY PENETRATE INTO THE RECESSES OF NATURE."' },
      { art: 'victorTalk', who: V, text: '"SO MUCH HAS BEEN DONE... MORE, FAR MORE, WILL I ACHIEVE. I WILL UNFOLD TO THE WORLD THE DEEPEST MYSTERIES OF CREATION."' },
      { art: 'study', text: 'TWO YEARS PASSED. I DISCOVERED THE CAUSE OF GENERATION AND LIFE. I BECAME "CAPABLE OF BESTOWING ANIMATION UPON LIFELESS MATTER."' },
    ],

    ch2: [
      { art: 'graveyard', text: '"TO EXAMINE THE CAUSES OF LIFE, WE MUST FIRST HAVE RECOURSE TO DEATH."', music: 'dread' },
      { art: 'graveyard', text: '"I COLLECTED BONES FROM CHARNEL-HOUSES." I WOULD NEED FIVE GOOD ONES TONIGHT, AND THE WATCH WAS OUT.' },
    ],
    ch2b: [
      { art: 'vault', text: 'BELOW THE CHURCH LAY THE VAULTS. THE SEXTON KEPT THEM, AND HE DID NOT CARE FOR VISITORS.' },
    ],
    ch2end: [
      { art: 'study', text: '"MY CHEEK HAD GROWN PALE WITH STUDY." SUMMER PASSED, AND I DID NOT SEE THE BLOSSOM OR THE EXPANDING LEAVES.', music: 'sad' },
    ],

    ch3: [
      { art: 'towerStorm', text: '"IT WAS ON A DREARY NIGHT OF NOVEMBER THAT I BEHELD THE ACCOMPLISHMENT OF MY TOILS."', music: 'creation' },
      { art: 'towerStorm', text: '"I COLLECTED THE INSTRUMENTS OF LIFE AROUND ME." THREE LEYDEN JARS, CHARGED, AT THE TOP OF THE HOUSE.' },
    ],
    creation: [
      { art: 'labTable', text: '"IT WAS ALREADY ONE IN THE MORNING; THE RAIN PATTERED DISMALLY AGAINST THE PANES."', music: 'creation' },
      { art: 'eye', text: '"BY THE GLIMMER OF THE HALF-EXTINGUISHED LIGHT, I SAW THE DULL YELLOW EYE OF THE CREATURE OPEN."', sfx: 'heartbeat', sfxAt: 30 },
      { art: 'horror', who: V, text: '"BREATHLESS HORROR AND DISGUST FILLED MY HEART." I RUSHED OUT OF THE ROOM.' },
      { art: 'bedside', text: 'HE FOLLOWED. "ONE HAND WAS STRETCHED OUT, SEEMINGLY TO DETAIN ME, BUT I ESCAPED, AND RUSHED DOWN STAIRS."' },
    ],
    ch3end: [
      { art: 'dawn', text: 'AT DAWN A COACH DREW UP AT THE INN. IT BROUGHT HENRY CLERVAL, MY DEAREST FRIEND.', music: 'sad' },
      { art: 'dawn', text: 'MY ROOMS WERE EMPTY. THE MONSTER HAD GONE. I FELL INTO A NERVOUS FEVER, AND HENRY NURSED ME FOR MONTHS.' },
    ],

    ch4: [
      { art: 'letter', text: 'THEN A LETTER CAME FROM MY FATHER. MY LITTLE BROTHER WILLIAM WAS DEAD, FOUND IN THE WOODS NEAR PLAINPALAIS.', music: 'sad' },
      { art: 'alpsStorm', text: 'I HURRIED HOME. NIGHT FELL AS I REACHED GENEVA, AND A STORM BROKE OVER THE ALPS.', sfx: 'thunder', sfxAt: 20 },
    ],
    ch4end: [
      { art: 'flashFigure', text: '"A FLASH OF LIGHTNING ILLUMINATED THE OBJECT... IT WAS THE WRETCH, THE FILTHY DAEMON, TO WHOM I HAD GIVEN LIFE."', sfx: 'thunder', music: 'dread' },
      { art: 'flashFigure', text: 'HE SCALED THE ROCKS OF SALEVE LIKE NOTHING HUMAN. HE WAS THE MURDERER. "I COULD NOT DOUBT IT."' },
      { art: 'trial', text: 'YET IT WAS JUSTINE, OUR GENTLE SERVANT, WHO WAS ACCUSED. WILLIAM\'S PICTURE WAS FOUND IN HER POCKET. SHE WAS CONDEMNED.', music: 'sad' },
      { art: 'victorTalk', who: V, text: 'I KNEW THE TRUTH AND SAID NOTHING. WHO WOULD HAVE BELIEVED ME?' },
    ],

    ch5: [
      { art: 'chamounix', text: 'SEEKING PEACE, I RODE TO THE VALLEY OF CHAMOUNIX AND CLIMBED ALONE TOWARD THE MER DE GLACE.', music: 'sad' },
    ],
    ch5end: [
      { art: 'creatureTalk', who: M, text: '"I EXPECTED THIS RECEPTION. ALL MEN HATE THE WRETCHED; HOW, THEN, MUST I BE HATED, WHO AM MISERABLE BEYOND ALL LIVING THINGS!"', music: 'tale' },
      { art: 'creatureTalk', who: M, text: '"REMEMBER THAT I AM THY CREATURE; I OUGHT TO BE THY ADAM, BUT I AM RATHER THE FALLEN ANGEL."' },
      { art: 'creatureTalk', who: M, text: '"I WAS BENEVOLENT AND GOOD; MISERY MADE ME A FIEND." LISTEN TO MY TALE.' },
    ],

    ch6: [
      { art: 'forest', who: M, text: '"IT IS WITH CONSIDERABLE DIFFICULTY THAT I REMEMBER THE ORIGINAL ERA OF MY BEING."', music: 'tale' },
      { art: 'fire', who: M, text: 'I FOUND A FIRE LEFT BY BEGGARS. I THRUST MY HAND INTO THE EMBERS, "BUT QUICKLY DREW IT OUT AGAIN WITH A CRY OF PAIN."' },
      { art: 'cottage', who: M, text: 'I HID IN A HOVEL BY A COTTAGE AND WATCHED: OLD DE LACEY, WHO WAS BLIND, AND HIS CHILDREN FELIX AND AGATHA. THEY WERE POOR.' },
      { art: 'cottage', who: M, text: 'BY NIGHT I GATHERED THEIR FIREWOOD. IN THE WOODS I FOUND A SATCHEL OF BOOKS. THROUGH THEM, I LEARNED TO READ.' },
    ],
    ch6end: [
      { art: 'cottageBurn', who: M, text: 'FELIX "STRUCK ME VIOLENTLY WITH A STICK. I COULD HAVE TORN HIM LIMB FROM LIMB... BUT MY HEART SANK." I FLED.', music: 'sad' },
      { art: 'cottageBurn', who: M, text: 'THE NEXT DAY THE COTTAGE WAS EMPTY. THEY WERE GONE FOREVER. THAT NIGHT I SET IT ABLAZE.' },
    ],

    ch7: [
      { art: 'road', who: M, text: 'IN THE COAT I HAD TAKEN WERE YOUR PAPERS. I LEARNED WHO HAD MADE ME, AND THAT YOU LIVED IN GENEVA. I SET OUT.', music: 'tale' },
    ],
    ch7end: [
      { art: 'rustic', who: M, text: 'I SAVED A GIRL FROM THE RIVER. A RUSTIC TORE HER FROM MY ARMS AND FIRED. "THIS WAS THEN THE REWARD OF MY BENEVOLENCE!"', sfx: 'gun', music: 'sad' },
      { art: 'woods', who: M, text: 'NEAR GENEVA A BOY RAN TO ME, CRYING THAT HIS FATHER WAS M. FRANKENSTEIN. I SEIZED HIM TO SILENCE HIM, AND HE LAY STILL.' },
      { art: 'creatureTalk', who: M, text: '"I AM ALONE, AND MISERABLE." YOU MUST CREATE A FEMALE FOR ME, "WITH WHOM I CAN LIVE IN THE INTERCHANGE OF THOSE SYMPATHIES."', music: 'tale' },
      { art: 'victorTalk', who: V, text: 'I CONSENTED, ON HIS OATH TO QUIT EUROPE FOREVER, AND EVERY OTHER PLACE IN THE NEIGHBOURHOOD OF MAN.' },
    ],

    ch8: [
      { art: 'orkney', text: 'I TRAVELLED TO ENGLAND WITH CLERVAL, THEN ALONE TO "ONE OF THE REMOTEST OF THE ORKNEYS" TO BEGIN THE WORK AGAIN.', music: 'sad' },
    ],
    ch8b: [
      { art: 'casement', text: '"BY THE LIGHT OF THE MOON, I SAW THE DAEMON AT THE CASEMENT. A GHASTLY GRIN WRINKLED HIS LIPS."', music: 'dread' },
      { art: 'casement', text: 'TREMBLING, "I TORE TO PIECES THE THING ON WHICH I WAS ENGAGED."' },
      { art: 'creatureTalk', who: M, text: '"I SHALL BE WITH YOU ON YOUR WEDDING-NIGHT."' },
      { art: 'boat', text: 'BEFORE DAWN I ROWED OUT TO SINK THE REMAINS. A WIND ROSE, AND DROVE MY LITTLE BOAT OUT ONTO THE OPEN SEA.' },
    ],
    ch8end: [
      { art: 'ireland', text: 'THE SEA CAST ME ASHORE IN IRELAND. A BODY HAD BEEN FOUND ON THE BEACH THAT NIGHT. IT WAS HENRY CLERVAL.', music: 'sad' },
      { art: 'ireland', text: 'I WAS CHARGED WITH HIS MURDER, AND LAY FOR MONTHS IN PRISON, NEAR DEATH. MY FATHER CAME. THE COURT SET ME FREE.' },
    ],

    ch9: [
      { art: 'wedding', text: 'IN GENEVA, ELIZABETH AND I WERE MARRIED. THAT EVENING WE SAILED ACROSS THE LAKE TO THE INN AT EVIAN.', music: 'sad' },
      { art: 'victorTalk', who: V, text: 'I CARRIED PISTOLS AND A DAGGER. IF HE CAME TONIGHT, I WOULD MEET HIM. I SEARCHED EVERY PASSAGE OF THE INN.' },
    ],
    ch9end: [
      { art: 'window', text: '"SUDDENLY I HEARD A SHRILL AND DREADFUL SCREAM. IT CAME FROM THE ROOM INTO WHICH ELIZABETH HAD RETIRED."', sfx: 'scream', music: 'dread' },
      { art: 'window', text: 'SHE WAS LIFELESS. AT THE OPEN WINDOW THE FIEND STOOD JEERING; THEN HE PLUNGED INTO THE LAKE.' },
      { art: 'graves', text: 'MY FATHER COULD NOT BEAR IT, AND DIED WITHIN DAYS. BY THE GRAVES OF MY FAMILY, I SWORE TO PURSUE THE DAEMON TO THE END.', music: 'sad' },
    ],

    ch10: [
      { art: 'tartary', text: 'I FOLLOWED HIM DOWN THE RHONE, OVER THE BLUE MEDITERRANEAN, THROUGH THE WILDS OF TARTARY AND RUSSIA.', music: 'dread' },
      { art: 'tartary', text: 'HE LEFT MARKS TO GUIDE ME, WORDS CUT IN THE BARK OF TREES, AND SOMETIMES FOOD.' },
    ],
    ch10b: [
      { art: 'giant', text: 'AT THE SHORE OF THE FROZEN OCEAN I TOOK A SLEDGE AND DOGS. AFTER THREE WEEKS ON THE ICE, I SAW HIM, NOT A MILE AHEAD.' },
    ],
    ending: [
      { art: 'floe', text: 'THE ICE SPLIT WITH A MIGHTY SHOCK. HE WAS GONE, AND I WAS ADRIFT. THEN YOUR SHIP APPEARED.', music: 'sad' },
      { art: 'ship', who: 'WALTON', text: 'SEPTEMBER. THE ICE IS BREAKING; WE ARE TURNING FOR HOME. MY GUEST, VICTOR FRANKENSTEIN, DID NOT LIVE TO SEE IT.' },
      { art: 'cabin', who: 'WALTON', text: 'IN THE CABIN, OVER HIS BODY, HUNG A FORM "WHICH I CANNOT FIND WORDS TO DESCRIBE."', music: 'tale' },
      { art: 'creatureTalk', who: M, text: '"THAT IS ALSO MY VICTIM! OH, FRANKENSTEIN! WHAT DOES IT AVAIL THAT I NOW ASK THEE TO PARDON ME?"' },
      { art: 'creatureTalk', who: M, text: '"I SHALL DIE, AND WHAT I NOW FEEL BE NO LONGER FELT. MY SPIRIT WILL SLEEP IN PEACE. FAREWELL."' },
      { art: 'raft', text: '"HE WAS SOON BORNE AWAY BY THE WAVES, AND LOST IN DARKNESS AND DISTANCE."', music: 'ending' },
    ],
  };

  /* ---------------------------------------------------------------- title */
  let T = null;
  function buildTitle() {
    const kit = FK.bgKit;
    const sky = kit.sky(SW, SH, [[0x0f, 0], [0x02, 112, 40], [0x0c, 150, 24], [0x0f, 172, 8]]);
    const sg = sky.getContext('2d');
    kit.stars(sg, SW, 70, 41, 30, [0x10, 0x2d, 0x30]);
    const mopt = { peaks: 8, minH: 24, maxH: 92, slope: 1.05, jitter: 3, snowDepth: 12 };
    const peaks = kit.mountains(512, 110, 5, Object.assign({ lit: 0x0c, dark: 0x0f, snow: 0x00, snowDark: 0x2d, edge: 0x0f }, mopt));
    const peaksLit = kit.mountains(512, 110, 5, Object.assign({ lit: 0x10, dark: 0x00, snow: 0x30, snowDark: 0x10, edge: 0x0f }, mopt));
    const cloud = kit.clouds(512, 90, 8, 10, { y0: 10, y1: 70, outline: 0x0f, dark: 0x2d, lit: 0x00 });
    const cloudLit = kit.clouds(512, 90, 8, 10, { y0: 10, y1: 70, outline: 0x0f, dark: 0x10, lit: 0x30 });
    // The crag and the tower: drawn once in shadow, once lit.
    const crag = (lit) => {
      const c = kit.canvas(SW, SH), g = c.getContext('2d');
      const body = lit ? 0x2d : 0x0f, edge = lit ? 0x30 : 0x0c;
      const r = FK.rng(77);
      // Rock rising from the right.
      let top = 150;
      for (let x = 150; x < SW; x++) {
        top += (r() - 0.62) * 3;
        top = Math.max(118, Math.min(170, top));
        kit.px(g, x, Math.round(top), edge);
        kit.px(g, x, Math.round(top) + 1, body, 1, SH);
      }
      // Tower: stone courses, a lit right edge, battlements, a slate spire,
      // one lit window high up (the laboratory) and a dark one below.
      const tx = 196, ty = 70, tw = 26, th = 70;
      for (let y = 0; y < th; y++) for (let x = 0; x < tw; x++) {
        const course = y % 6 === 0 || (x + (Math.floor(y / 6) % 2) * 4) % 8 === 0;
        kit.px(g, tx + x, ty + y, course ? 0x0f : (x > tw - 4 ? edge : body));
      }
      kit.px(g, tx - 3, ty - 4, body, tw + 6, 5);
      kit.px(g, tx - 3, ty - 4, edge, tw + 6, 1);
      for (let i = 0; i < tw + 6; i += 6) { kit.px(g, tx - 3 + i, ty - 9, body, 4, 5); kit.px(g, tx - 3 + i, ty - 9, edge, 4, 1); }
      for (let i = 0; i < 24; i++) kit.px(g, tx + 3 + Math.floor(i * 0.42), ty - 10 - i, lit ? 0x00 : 0x0f, Math.max(1, 20 - Math.floor(i * 0.84)), 1);
      kit.px(g, tx + 12, ty - 40, body, 1, 7);
      const win = lit ? 0x30 : 0x38;
      kit.px(g, tx + 9, ty + 12, 0x0f, 8, 12);
      kit.px(g, tx + 10, ty + 13, win, 6, 10);
      kit.px(g, tx + 10, ty + 13, lit ? 0x38 : 0x28, 2, 10);
      kit.px(g, tx + 13, ty + 13, 0x0f, 1, 10);
      kit.px(g, tx + 10, ty + 17, 0x0f, 6, 1);
      kit.px(g, tx + 4, ty + 44, lit ? 0x00 : 0x0f, 4, 6);
      return c;
    };
    // Shore and a lake that holds the peaks.
    const lake = kit.canvas(SW, 40), lg = lake.getContext('2d');
    for (let y = 0; y < 40; y++) for (let x = 0; x < SW; x++) kit.px(lg, x, y, (y % 6 === 0 && FK.bayer(x, y) < 0.3) ? 0x0c : 0x0f);
    T = { sky, peaks, peaksLit, cloud, cloudLit, crag: crag(false), cragLit: crag(true), lake };
    if (!FK.PIC.logo) FK.buildLogo();
  }

  /* A forked bolt from the sky to a point. */
  function bolt(g, x0, y0, x1, y1, seed) {
    const r = FK.rng(seed);
    let x = x0;
    const segs = [];
    for (let y = y0; y < y1; y += 4) {
      const nx = x + Math.round((r() - 0.5) * 8 + (x1 - x) / ((y1 - y) / 4 + 1));
      segs.push([x, y, nx, y + 4]);
      x = nx;
      if (r() < 0.12) { let bx = x; for (let k = 0; k < 6; k++) { const nb = bx + Math.round((r() - 0.3) * 6); segs.push([bx, y + k * 4, nb, y + k * 4 + 4]); bx = nb; } }
    }
    for (const [ax, ay, bx, by] of segs) {
      const n = Math.max(Math.abs(bx - ax), Math.abs(by - ay));
      for (let i = 0; i <= n; i++) {
        const px = Math.round(ax + (bx - ax) * i / n), py = Math.round(ay + (by - ay) * i / n);
        FK.rect(g, px - 1, py, 3, 1, 0x31);
        FK.rect(g, px, py, 1, 1, 0x30);
      }
    }
  }
  FK.bolt = bolt;

  FK.drawTitle = (g, t, items, sel, input) => {
    if (!T) buildTitle();
    // Lightning every few seconds: two quick flashes and a bolt.
    const cyc = t % 300;
    const flash = t > 60 && (cyc === 200 || cyc === 201 || cyc === 206 || cyc === 207 || cyc === 208);
    const boltOn = t > 60 && cyc >= 200 && cyc < 214;
    if (t > 60 && cyc === 200) FK.audio && FK.audio.sfx('thunder');
    g.drawImage(T.sky, 0, 0);
    if (flash) { g.globalAlpha = 0.85; FK.rect(g, 0, 0, SW, 150, 0x10); g.globalAlpha = 1; }
    const cx = Math.floor(t * 0.15) % 512;
    g.drawImage(flash ? T.cloudLit : T.cloud, -cx, 2); g.drawImage(flash ? T.cloudLit : T.cloud, 512 - cx, 2);
    g.drawImage(flash ? T.peaksLit : T.peaks, -40, 62);
    g.drawImage(T.lake, 0, 166);
    if (boltOn) bolt(g, 150 + (Math.floor(t / 300) % 3) * 12, 0, 209, 54, Math.floor(t / 300));
    g.drawImage(flash ? T.cragLit : T.crag, 0, 0);
    // Rain.
    for (let i = 0; i < 70; i++) {
      const rx = (i * 53 + t * 3) % (SW + 40) - 20, ry = (i * 97 + t * 7) % SH;
      FK.rect(g, rx, ry, 1, 3, flash ? 0x30 : 0x2d);
    }
    // Logo slides down at the start.
    const logo = FK.PIC.logo;
    const ly = t < 50 ? Math.round(-30 + (t / 50) * 52) : 22;
    g.drawImage(logo, Math.round(SW / 2 - logo.width / 2), ly);
    if (t > 50) FK.text(g, 'OR, THE MODERN PROMETHEUS', SW / 2, 54, 0x10, { align: 'center', shadow: 0x0f });
    if (t > 70) {
      const y0 = 196 - items.length * 12;
      items.forEach((it, i) => {
        const on = i === sel;
        if (on && Math.floor(t / 16) % 2) FK.text(g, '>', 78, y0 + i * 12, 0x28, { shadow: 0x0f });
        FK.text(g, it, 94, y0 + i * 12, on ? 0x30 : 0x10, { shadow: 0x0f });
      });
    }
    FK.text(g, 'MARY SHELLEY 1818 / FUNKIE.DEV', SW / 2, 210, 0x2d, { align: 'center' });
    if (t < 20) FK.fade(1 - t / 20);
  };

  /* ------------------------------------------------------------------ end */
  FK.drawEnd = (g, t) => {
    FK.rect(g, 0, 0, SW, SH, 0x0f);
    const lines = [
      ['THE END', 0x28, 40],
      ['FRANKENSTEIN;', 0x30, 80],
      ['OR, THE MODERN PROMETHEUS', 0x10, 92],
      ['BY MARY WOLLSTONECRAFT SHELLEY', 0x10, 116],
      ['FIRST PUBLISHED 1818', 0x2d, 128],
      ['THANK YOU FOR PLAYING', 0x30, 168],
    ];
    for (const [s, c, y] of lines) if (t > y) FK.text(g, s, SW / 2, y, c, { align: 'center' });
    if (t > 240 && Math.floor(t / 20) % 2) FK.text(g, 'PRESS START', SW / 2, 196, 0x2d, { align: 'center' });
    if (t < 30) FK.fade(1 - t / 30);
  };
})();
