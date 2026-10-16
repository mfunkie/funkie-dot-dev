'use strict';
/*
 * GATSBY.EXE: the story between the chapters, the title screen and the end.
 * Lines in quotation marks are Fitzgerald's (1925 text), sometimes cut down
 * to fit a 29-column NES text box. Each panel names a picture in art-cine.js.
 */
(() => {
  const { W: SW, H: SH } = GG;
  const N = 'NICK', G = 'GATSBY';

  GG.CINE = {
    opening: [
      { art: 'nickTalk', who: N, text: '"IN MY YOUNGER AND MORE VULNERABLE YEARS MY FATHER GAVE ME SOME ADVICE THAT I\'VE BEEN TURNING OVER IN MY MIND EVER SINCE."', music: 'tender' },
      { art: 'nickTalk', who: N, text: '"WHENEVER YOU FEEL LIKE CRITICIZING ANY ONE," HE TOLD ME, "JUST REMEMBER THAT ALL THE PEOPLE IN THIS WORLD HAVEN\'T HAD THE ADVANTAGES THAT YOU\'VE HAD."' },
      { art: 'bookshelf', text: 'IN THE SPRING OF 1922 I WENT EAST TO LEARN THE BOND BUSINESS. MY NEW BOOKS STOOD ON THE SHELF IN RED AND GOLD "LIKE NEW MONEY FROM THE MINT."' },
      { art: 'westegg', text: 'I RENTED "A WEATHER-BEATEN CARDBOARD BUNGALOW AT EIGHTY A MONTH" IN WEST EGG. NEXT DOOR STOOD A COLOSSAL MANSION. IT BELONGED TO A MR. GATSBY.' },
      { art: 'acrossbay', text: 'ACROSS THE BAY "THE WHITE PALACES OF FASHIONABLE EAST EGG GLITTERED ALONG THE WATER." ONE EVENING I DROVE OVER TO DINE WITH MY COUSIN DAISY AND HER HUSBAND, TOM.' },
    ],

    ch1: [
      { art: 'buchanans', text: 'THEIR HOUSE WAS "A CHEERFUL RED-AND-WHITE GEORGIAN COLONIAL MANSION, OVERLOOKING THE BAY." TOM BUCHANAN STOOD ON THE PORCH IN RIDING CLOTHES.', music: 'eastegg' },
      { art: 'tomTalk', text: 'HE WAS "A STURDY STRAW-HAIRED MAN OF THIRTY WITH A RATHER HARD MOUTH AND A SUPERCILIOUS MANNER." IT WAS "A CRUEL BODY."' },
      { art: 'lawn', text: '"THE LAWN STARTED AT THE BEACH AND RAN TOWARD THE FRONT DOOR FOR A QUARTER OF A MILE, JUMPING OVER SUN-DIALS AND BRICK WALKS AND BURNING GARDENS."' },
      { art: 'lawn', who: N, text: 'I WAS AT THE BEACH END OF IT. THERE WAS NOTHING FOR IT BUT TO JUMP OVER THEM TOO.' },
    ],
    ch1end: [
      { art: 'couch', text: '"THE ONLY COMPLETELY STATIONARY OBJECT IN THE ROOM WAS AN ENORMOUS COUCH ON WHICH TWO YOUNG WOMEN WERE BUOYED UP AS THOUGH UPON AN ANCHORED BALLOON."', music: 'tender' },
      { art: 'jordanTalk', text: 'ONE WAS DAISY. THE OTHER WAS JORDAN BAKER, THE GOLFER. AT DINNER THE TELEPHONE RANG FOR TOM. "TOM\'S GOT SOME WOMAN IN NEW YORK," SHE WHISPERED.' },
      { art: 'daisyTalk', who: 'DAISY, OF HER LITTLE GIRL', text: '"I HOPE SHE\'LL BE A FOOL--THAT\'S THE BEST THING A GIRL CAN BE IN THIS WORLD, A BEAUTIFUL LITTLE FOOL."' },
      { art: 'greenlight', text: 'HOME AGAIN, I SAW A FIGURE ON THE NEXT LAWN, "STANDING WITH HIS HANDS IN HIS POCKETS REGARDING THE SILVER PEPPER OF THE STARS."', music: 'current' },
      { art: 'greenlight', text: 'HE "STRETCHED OUT HIS ARMS TOWARD THE DARK WATER IN A CURIOUS WAY." I LOOKED, AND SAW NOTHING BUT "A SINGLE GREEN LIGHT, MINUTE AND FAR AWAY."' },
      { art: 'greenlight', text: 'WHEN I LOOKED BACK FOR GATSBY, HE HAD VANISHED, AND I WAS ALONE AGAIN IN THE DARK.' },
    ],

    ch2: [
      { art: 'ashes', text: '"THIS IS A VALLEY OF ASHES--A FANTASTIC FARM WHERE ASHES GROW LIKE WHEAT INTO RIDGES AND HILLS AND GROTESQUE GARDENS."', music: 'ashes' },
      { art: 'ashes', text: 'ASHES TAKE THE FORMS OF HOUSES AND CHIMNEYS AND, AT LAST, "OF MEN WHO MOVE DIMLY AND ALREADY CRUMBLING THROUGH THE POWDERY AIR."' },
      { art: 'eyes', text: '"THE EYES OF DOCTOR T. J. ECKLEBURG ARE BLUE AND GIGANTIC--THEIR RETINAS ARE ONE YARD HIGH. THEY LOOK OUT OF NO FACE."' },
      { art: 'train', text: 'THE TRAIN STOPPED AT THE DRAWBRIDGE. TOM TOOK ME BY THE ELBOW AND PULLED ME OFF IT. "I WANT YOU TO MEET MY GIRL," HE SAID.', sfx: 'bell' },
      { art: 'nickTalk', who: N, text: 'HIS GIRL LIVED AT A GARAGE ON THE FAR SIDE OF THE ASHES. TOM HAD ALREADY GONE AHEAD. IT WAS A LONG WAY, ON FOOT.' },
    ],
    ch2b: [
      { art: 'eyes', text: 'ABOVE THE GARAGE, THE EYES OF DOCTOR T. J. ECKLEBURG "BROOD ON OVER THE SOLEMN DUMPING GROUND."', music: 'dread' },
      { art: 'eyesLook', text: 'THEN, SLOWLY, THEY TURNED, AND LOOKED AT ME.', sfx: 'zap', sfxAt: 70 },
      { art: 'nickTalk', who: N, text: 'I HAD NEVER BEEN LOOKED AT BY AN ADVERTISEMENT BEFORE. I DID NOT CARE FOR IT.' },
    ],
    ch2end: [
      { art: 'garage', text: '"REPAIRS. GEORGE B. WILSON. CARS BOUGHT AND SOLD." WILSON WAS PALE AND SPIRITLESS. HIS WIFE, MYRTLE, WAS "FAINTLY STOUT," AND VERY MUCH ALIVE.', music: 'sad' },
      { art: 'apartment', text: 'TOM KEPT AN APARTMENT FOR HER ON 158TH STREET. THAT AFTERNOON THERE WAS A PARTY THERE, AND A PUPPY, AND A GREAT DEAL OF WHISKEY.', music: 'jazz' },
      { art: 'apartment', who: N, text: '"I HAVE BEEN DRUNK JUST TWICE IN MY LIFE, AND THE SECOND TIME WAS THAT AFTERNOON."' },
      { art: 'apartment', text: 'NEAR MIDNIGHT MYRTLE BEGAN TO SHOUT DAISY\'S NAME. "I\'LL SAY IT WHENEVER I WANT TO!" TOM BROKE HER NOSE WITH HIS OPEN HAND.', music: 'sad' },
    ],

    ch3: [
      { art: 'party', text: 'ALL SUMMER THERE WAS MUSIC NEXT DOOR. "IN HIS BLUE GARDENS MEN AND GIRLS CAME AND WENT LIKE MOTHS AMONG THE WHISPERINGS AND THE CHAMPAGNE AND THE STARS."', music: 'jazz' },
      { art: 'oranges', text: '"EVERY FRIDAY FIVE CRATES OF ORANGES AND LEMONS ARRIVED FROM A FRUITERER IN NEW YORK." EVERY MONDAY THEY LEFT BY THE BACK DOOR "IN A PYRAMID OF PULPLESS HALVES."' },
      { art: 'invitation', text: 'ONE SATURDAY MORNING "A CHAUFFEUR IN A UNIFORM OF ROBIN\'S-EGG BLUE" CROSSED MY LAWN WITH A NOTE FROM HIS EMPLOYER.' },
      { art: 'party', who: N, text: '"I WAS ONE OF THE FEW GUESTS WHO HAD ACTUALLY BEEN INVITED." NOBODY I MET HAD MET OUR HOST. EVERYBODY HAD A THEORY ABOUT HIM.' },
      { art: 'party', who: N, text: 'IF I COLLECTED ALL THE RUMORS, I THOUGHT, I MIGHT WORK OUT WHICH ONE OF THEM HE WAS.' },
    ],
    ch3end: [
      { art: 'smile', text: '"I\'M GATSBY," HE SAID SUDDENLY. HE SMILED. "IT WAS ONE OF THOSE RARE SMILES WITH A QUALITY OF ETERNAL REASSURANCE IN IT."', music: 'tender' },
      { art: 'gatsbyWhiteTalk', who: G, text: '"I THOUGHT YOU KNEW, OLD SPORT. I\'M AFRAID I\'M NOT A VERY GOOD HOST."' },
      { art: 'ditch', text: 'LEAVING, WE FOUND A NEW COUPE IN THE DITCH BY THE ROAD, SHORN OF ONE WHEEL. ITS DRIVER COULD NOT WORK OUT WHY IT HAD STOPPED.', sfx: 'horn' },
      { art: 'jordanTalk', text: 'I SAW A GOOD DEAL OF JORDAN BAKER THAT SUMMER. SHE WAS "INCURABLY DISHONEST." IT WAS SAID SHE HAD ONCE MOVED HER BALL FROM A BAD LIE.' },
      { art: 'nickTalk', who: N, text: '"EVERY ONE SUSPECTS HIMSELF OF AT LEAST ONE OF THE CARDINAL VIRTUES, AND THIS IS MINE: I AM ONE OF THE FEW HONEST PEOPLE THAT I HAVE EVER KNOWN."' },
    ],

    ch4: [
      { art: 'car', text: 'ONE MORNING LATE IN JULY, GATSBY\'S GORGEOUS CAR LURCHED UP MY DRIVE AND GAVE OUT A BURST OF MELODY FROM ITS THREE-NOTED HORN.', music: 'bridge', sfx: 'horn', sfxAt: 24 },
      { art: 'car', text: 'IT WAS "A RICH CREAM COLOR, BRIGHT WITH NICKEL," AND "TERRACED WITH A LABYRINTH OF WIND-SHIELDS THAT MIRRORED A DOZEN SUNS."' },
      { art: 'gatsbyTalk', who: G, text: '"LOOK HERE, OLD SPORT, WHAT\'S YOUR OPINION OF ME, ANYHOW?"' },
      { art: 'gatsbyTalk', who: G, text: 'A WEALTHY FAMILY IN THE MIDDLE WEST, ALL DEAD NOW. EDUCATED AT OXFORD. A YOUNG RAJAH IN ALL THE CAPITALS OF EUROPE. THEN THE WAR.' },
      { art: 'medal', who: G, text: '"EVERY ALLIED GOVERNMENT GAVE ME A DECORATION--EVEN MONTENEGRO, LITTLE MONTENEGRO DOWN ON THE ADRIATIC SEA!"' },
      { art: 'nickTalk', who: N, text: 'THEN WE DROVE INTO THE CITY. THE CAR WAS VERY LONG, AND I RODE A GOOD DEAL OF THE WAY ON TOP OF IT.' },
    ],
    ch4b: [
      { art: 'cop', text: 'A MOTORCYCLE COP DREW UP BESIDE US. GATSBY TOOK A WHITE CARD FROM HIS WALLET AND WAVED IT BEFORE THE MAN\'S EYES.', sfx: 'whistle' },
      { art: 'cop', who: 'THE POLICEMAN', text: '"RIGHT YOU ARE. KNOW YOU NEXT TIME, MR. GATSBY. EXCUSE ME!"' },
      { art: 'bridge', text: '"THE CITY SEEN FROM THE QUEENSBORO BRIDGE IS ALWAYS THE CITY SEEN FOR THE FIRST TIME, IN ITS FIRST WILD PROMISE OF ALL THE MYSTERY AND BEAUTY IN THE WORLD."' },
      { art: 'bridge', who: N, text: '"ANYTHING CAN HAPPEN NOW THAT WE\'VE SLID OVER THIS BRIDGE," I THOUGHT; "ANYTHING AT ALL."' },
      { art: 'cellar', text: 'AT NOON, IN "A WELL-FANNED FORTY-SECOND STREET CELLAR," GATSBY INTRODUCED ME TO A SMALL MAN WITH A LARGE HEAD: MR. MEYER WOLFSHEIM.', music: 'cellar' },
      { art: 'wolfsheimTalk', who: N, text: 'MR. WOLFSHEIM DID NOT CARE FOR THE WAY I LOOKED AT HIM. HE PROPOSED THAT WE SETTLE IT AT THE BACK OF THE CELLAR, ON THE DIAMOND.' },
    ],
    ch4end: [
      { art: 'molars', text: 'HE SAW ME LOOKING AT HIS CUFF BUTTONS. "FINEST SPECIMENS OF HUMAN MOLARS," HE INFORMED ME.', music: 'cellar' },
      { art: 'gatsbyTalk', who: G, text: '"HE\'S THE MAN WHO FIXED THE WORLD\'S SERIES BACK IN 1919."' },
      { art: 'louisville', text: 'THAT AFTERNOON JORDAN TOLD ME A STORY. LOUISVILLE, OCTOBER 1917: DAISY, ALL IN WHITE, IN HER LITTLE WHITE ROADSTER, WITH A YOUNG LIEUTENANT.', music: 'tender' },
      { art: 'louisville', text: 'HIS NAME WAS JAY GATSBY. HE WENT OVERSEAS. THE NEXT JUNE SHE MARRIED TOM BUCHANAN OF CHICAGO, WITH MORE POMP THAN LOUISVILLE HAD EVER KNOWN.' },
      { art: 'greenlight', who: 'JORDAN', text: '"GATSBY BOUGHT THAT HOUSE SO THAT DAISY WOULD BE JUST ACROSS THE BAY."', music: 'current' },
      { art: 'jordanTalk', who: 'JORDAN', text: '"HE WANTS TO KNOW IF YOU\'LL INVITE DAISY TO YOUR HOUSE SOME AFTERNOON AND THEN LET HIM COME OVER."' },
    ],

    ch5: [
      { art: 'rain', text: '"THE DAY AGREED UPON WAS POURING RAIN." AT ELEVEN A MAN IN A RAINCOAT, DRAGGING A LAWN-MOWER, CAME TO CUT MY GRASS. GATSBY HAD SENT HIM.', music: 'sad' },
      { art: 'rain', text: '"AT TWO O\'CLOCK A GREENHOUSE ARRIVED FROM GATSBY\'S, WITH INNUMERABLE RECEPTACLES TO CONTAIN IT."' },
      { art: 'clock', text: 'DAISY CAME. GATSBY LEANED ON THE MANTELPIECE, AND HIS HEAD KNOCKED A DEFUNCT CLOCK. HE CAUGHT IT WITH TREMBLING FINGERS.', sfx: 'clack', sfxAt: 30 },
      { art: 'gatsbyTalk', who: G, text: '"I\'M SORRY ABOUT THE CLOCK." THEN THE RAIN STOPPED, AND HE WANTED TO SHOW HER HIS HOUSE.' },
      { art: 'tour', text: 'UP THROUGH "MARIE ANTOINETTE MUSIC-ROOMS AND RESTORATION SALONS," UP "THROUGH PERIOD BEDROOMS SWATHED IN ROSE AND LAVENDER SILK."', music: 'mansion' },
      { art: 'nickTalk', who: N, text: 'GATSBY RAN AHEAD TO HIS ROOM AT THE TOP OF THE HOUSE. THINGS BEGAN TO COME DOWN THE STAIRWELL. THEY WERE SHIRTS.' },
    ],
    ch5end: [
      { art: 'shirts', text: 'HE TOOK OUT A PILE OF SHIRTS AND THREW THEM, ONE BY ONE, BEFORE US: "SHIRTS OF SHEER LINEN AND THICK SILK AND FINE FLANNEL."', music: 'tender' },
      { art: 'daisyTalk', who: 'DAISY', text: '"THEY\'RE SUCH BEAUTIFUL SHIRTS. IT MAKES ME SAD BECAUSE I\'VE NEVER SEEN SUCH--SUCH BEAUTIFUL SHIRTS BEFORE."' },
      { art: 'greenlight', who: G, text: '"IF IT WASN\'T FOR THE MIST WE COULD SEE YOUR HOME ACROSS THE BAY. YOU ALWAYS HAVE A GREEN LIGHT THAT BURNS ALL NIGHT AT THE END OF YOUR DOCK."', music: 'current' },
      { art: 'piano', text: 'KLIPSPRINGER, THE BOARDER, PLAYED THE PIANO FOR US. "IN THE MORNING, IN THE EVENING, AIN\'T WE GOT FUN--"', music: 'jazz' },
      { art: 'nickTalk', who: N, text: 'THERE MUST HAVE BEEN MOMENTS THAT AFTERNOON WHEN DAISY TUMBLED SHORT OF HIS DREAMS, "BECAUSE OF THE COLOSSAL VITALITY OF HIS ILLUSION."', music: 'tender' },
    ],

    ch6: [
      { art: 'lake', text: '"JAMES GATZ--THAT WAS REALLY, OR AT LEAST LEGALLY, HIS NAME." AT SEVENTEEN HE WAS A CLAM-DIGGER AND A SALMON-FISHER ON LAKE SUPERIOR.', music: 'lake' },
      { art: 'lake', text: 'HE WORE "A TORN GREEN JERSEY AND A PAIR OF CANVAS PANTS," AND HE HAD BIG PLANS FOR HIMSELF.' },
      { art: 'schedule', text: 'HE KEPT A SCHEDULE: "DUMBELL EXERCISE AND WALL-SCALING 6.15-6.30." AND A LIST OF GENERAL RESOLVES, WHICH HAD BLOWN ALL OVER THE BEACH.' },
      { art: 'yacht', text: 'ONE AFTERNOON DAN CODY\'S YACHT "DROPPED ANCHOR OVER THE MOST INSIDIOUS FLAT ON LAKE SUPERIOR." A WIND COULD BREAK HER UP IN HALF AN HOUR.' },
      { art: 'nickTalk', who: N, text: 'SOMEBODY HAD TO GO OUT AND WARN HIM. BETWEEN JIMMY AND THE YACHT LAY ROCKS, CLIFFS, AND A GREAT DEAL OF LAKE.' },
    ],
    ch6end: [
      { art: 'yacht', text: 'HE BORROWED A ROWBOAT, PULLED OUT TO THE TUOLOMEE, AND TOLD CODY THAT A WIND MIGHT CATCH HIM AND BREAK HIM UP IN HALF AN HOUR.' },
      { art: 'yacht', text: 'ASKED HIS NAME, HE SAID JAY GATSBY. "JAY GATSBY OF WEST EGG, LONG ISLAND, SPRANG FROM HIS PLATONIC CONCEPTION OF HIMSELF."' },
      { art: 'lake', text: 'FOR FIVE YEARS HE SAILED WITH CODY AROUND THE CONTINENT, AS STEWARD, MATE AND SKIPPER, UNTIL THE OLD MAN DIED.', music: 'sad' },
      { art: 'party', text: 'BACK IN 1922, TOM CAME TO ONE OF GATSBY\'S PARTIES WITH DAISY. SHE DID NOT LIKE IT. GATSBY WANTED HER TO TELL TOM SHE HAD NEVER LOVED HIM.', music: 'jazz' },
      { art: 'gatsbyTalk', who: G, text: '"CAN\'T REPEAT THE PAST?" HE CRIED INCREDULOUSLY. "WHY OF COURSE YOU CAN!"' },
    ],

    ch7: [
      { art: 'heat', text: '"THE NEXT DAY WAS BROILING, ALMOST THE LAST, CERTAINLY THE WARMEST, OF THE SUMMER."', music: 'dread' },
      { art: 'daisyTalk', text: 'AT LUNCH DAISY LOOKED AT GATSBY AND SAID, "YOU ALWAYS LOOK SO COOL." TOM BUCHANAN SAW. HE WAS ASTOUNDED.' },
      { art: 'gatsbyTalk', who: G, text: '"HER VOICE IS FULL OF MONEY," HE SAID SUDDENLY.' },
      { art: 'car', text: 'WE DROVE INTO TOWN IN THE HEAT, TOM AT THE WHEEL OF GATSBY\'S CAR, AND TOOK A SUITE AT THE PLAZA HOTEL.' },
      { art: 'plaza', text: '"THE ROOM WAS LARGE AND STIFLING." FROM THE BALLROOM BELOW CAME THE CHORDS OF MENDELSSOHN\'S WEDDING MARCH.', music: 'plaza' },
      { art: 'nickTalk', who: N, text: 'GATSBY HAD GONE DOWN FOR ICE. THE ELEVATOR WAS OUT OF ORDER. HE CAME BACK UP THE HARD WAY.' },
    ],
    ch7end: [
      { art: 'tomTalk', who: G, text: '"YOUR WIFE DOESN\'T LOVE YOU. SHE\'S NEVER LOVED YOU. SHE LOVES ME."', music: 'dread' },
      { art: 'daisyTalk', who: 'DAISY', text: '"I DID LOVE HIM ONCE--BUT I LOVED YOU TOO."' },
      { art: 'plaza', who: N, text: 'I REMEMBERED THAT IT WAS MY BIRTHDAY. I WAS THIRTY. "THIRTY--THE PROMISE OF A DECADE OF LONELINESS."' },
      { art: 'tomTalk', who: 'TOM', text: '"YOU TWO START ON HOME, DAISY. IN MR. GATSBY\'S CAR."' },
      { art: 'deathcar', text: 'ON THE ROAD HOME, IN THE VALLEY OF ASHES, MYRTLE WILSON RAN OUT INTO THE DUSK TOWARD A YELLOW CAR. IT STRUCK HER, AND SHE DIED IN THE ROAD.', music: 'sad' },
      { art: 'deathcar', text: '"THE \'DEATH CAR\' AS THE NEWSPAPERS CALLED IT, DIDN\'T STOP; IT CAME OUT OF THE GATHERING DARKNESS, WAVERED TRAGICALLY FOR A MOMENT, AND THEN DISAPPEARED."' },
      { art: 'vigil', text: 'IT WAS DAISY WHO HAD BEEN DRIVING. "BUT OF COURSE I\'LL SAY I WAS," GATSBY SAID. HE WAITED OUTSIDE HER HOUSE ALL NIGHT, IN CASE SHE NEEDED HIM.' },
      { art: 'vigil', who: N, text: 'I LEFT HIM STANDING THERE IN THE MOONLIGHT--"WATCHING OVER NOTHING."' },
    ],

    ch8: [
      { art: 'dawn', text: 'I COULDN\'T SLEEP. TOWARD DAWN I WENT OVER TO GATSBY\'S, AND HE TOLD ME ABOUT DAISY, AND LOUISVILLE, AND THE WAR.', music: 'tender' },
      { art: 'louisville', text: 'SHE WAS THE FIRST "NICE" GIRL HE HAD EVER KNOWN. HE FOUND "THAT HE HAD COMMITTED HIMSELF TO THE FOLLOWING OF A GRAIL."' },
      { art: 'argonne', who: G, text: '"IN THE ARGONNE FOREST I TOOK TWO MACHINE-GUN DETACHMENTS SO FAR FORWARD THAT THERE WAS A HALF MILE GAP ON EITHER SIDE OF US."', music: 'argonne', sfx: 'boom', sfxAt: 30 },
    ],
    ch8end: [
      { art: 'medal', text: '"ORDERI DI DANILO," RAN THE CIRCULAR LEGEND, "MONTENEGRO, NICOLAS REX." AND ON THE BACK: "MAJOR JAY GATSBY, FOR VALOUR EXTRAORDINARY."', music: 'tender' },
      { art: 'dawn', who: N, text: 'WHEN I LEFT, I CALLED BACK ACROSS THE LAWN: "THEY\'RE A ROTTEN CROWD. YOU\'RE WORTH THE WHOLE DAMN BUNCH PUT TOGETHER."' },
      { art: 'eyes', text: 'IN THE VALLEY OF ASHES, WILSON STARED AT THE BILLBOARD. "GOD SEES EVERYTHING," HE SAID. "THAT\'S AN ADVERTISEMENT," MICHAELIS ASSURED HIM.', music: 'dread' },
      { art: 'pool', text: 'THAT AFTERNOON GATSBY TOOK A PNEUMATIC MATTRESS DOWN TO HIS POOL. WILSON HAD BEEN ASKING WHO OWNED THE YELLOW CAR.', music: 'sad' },
      { art: 'pool', text: 'NOBODY THOUGHT ANYTHING OF THE SHOTS. WHEN WE CAME DOWN, THE MATTRESS WAS DRIFTING SLOWLY DOWN THE POOL AMONG THE FIRST FALLEN LEAVES.' },
      { art: 'pool', text: 'GATSBY WAS DEAD. WILSON LAY A LITTLE WAY OFF, IN THE GRASS.' },
    ],

    ch9: [
      { art: 'funeral', text: 'NOBODY CAME. I TELEPHONED, I WROTE. DAISY AND TOM HAD GONE AWAY, AND LEFT NO ADDRESS.', music: 'sad' },
      { art: 'gatzTalk', text: 'HIS FATHER CAME FROM MINNESOTA. HE SHOWED ME A RAGGED OLD COPY OF HOPALONG CASSIDY, WITH A SCHEDULE WRITTEN IN THE BACK.' },
      { art: 'schedule', who: 'MR. GATZ', text: '"JIMMY WAS BOUND TO GET AHEAD."' },
      { art: 'funeral', text: 'AT THE GRAVE, IN THE RAIN, ONE OF THE OLD PARTY GUESTS CAME: THE MAN WITH THE OWL-EYED GLASSES, FROM THE LIBRARY.' },
      { art: 'owlTalk', who: 'OWL EYES', text: '"THE POOR SON-OF-A-BITCH," HE SAID.' },
      { art: 'beach', text: 'ON MY LAST NIGHT IN WEST EGG I WENT DOWN TO GATSBY\'S BEACH. ACROSS THE SOUND, THE GREEN LIGHT STILL BURNED AT THE END OF DAISY\'S DOCK.', music: 'current' },
      { art: 'beach', who: N, text: 'A BOAT WAS TIED UP AT THE FOOT OF THE LAWN. I DON\'T KNOW WHAT I MEANT TO DO. I TOOK IT.' },
    ],
    ending: [
      { art: 'beach', text: '"GATSBY BELIEVED IN THE GREEN LIGHT, THE ORGASTIC FUTURE THAT YEAR BY YEAR RECEDES BEFORE US."', music: 'ending' },
      { art: 'boats', text: '"IT ELUDED US THEN, BUT THAT\'S NO MATTER--TO-MORROW WE WILL RUN FASTER, STRETCH OUT OUR ARMS FARTHER.... AND ONE FINE MORNING--"' },
      { art: 'boats', text: '"SO WE BEAT ON, BOATS AGAINST THE CURRENT, BORNE BACK CEASELESSLY INTO THE PAST."' },
    ],
  };

  /* ---------------------------------------------------------------- title */
  /*
   * Night on the Sound. Across the water a single green light blinks at the
   * end of a dock; on the near lawn Gatsby stretches out his arms toward it;
   * high in the sky, faintly, the celestial eyes of the 1925 jacket.
   */
  let T = null;
  function buildTitle() {
    const k = GG.cineKit;
    const px = k.px, B = GG.bayer;
    const c = k.canvas(SW, SH), g = c.getContext('2d');
    k.sky(g, [[0x0f, 0], [0x01, 64, 28], [0x02, 112, 14]], SW, 128);
    k.stars(g, SW, 110, 1925, 60, [0x30, 0x10, 0x31, 0x21]);
    // The eyes in the sky, and a pair of red lips: barely there.
    for (const ex of [94, 162]) {
      const ey = 96;
      for (let x = -19; x <= 19; x++) {
        const h = 6.5 * (1 - (x / 19) ** 2);
        for (let y = Math.ceil(-h); y <= Math.floor(h * 0.8); y++) if (B(ex + x, ey + y) < 0.22) px(g, ex + x, ey + y, 0x21);
        // Lids: a heavy upper line with lashes, a fainter lower one.
        px(g, ex + x, ey - Math.round(h) - 1, 0x11);
        if (x % 4 === 0 && Math.abs(x) < 16) px(g, ex + x + Math.sign(x), ey - Math.round(h) - 2, 0x11);
        if (B(ex + x, ey + Math.round(h * 0.8) + 1) < 0.6) px(g, ex + x, ey + Math.round(h * 0.8) + 1, 0x01);
        // Brows.
        if (Math.abs(x) < 16) px(g, ex + x + 2, ey - 13 + Math.round((x / 16) ** 2 * 4), 0x01);
      }
      k.disc(g, ex, ey, 5, 0x11); k.disc(g, ex, ey, 4, 0x12); k.disc(g, ex, ey, 2, 0x0f);
      px(g, ex - 2, ey - 2, 0x31);
    }
    for (let x = -13; x <= 13; x++) {
      const bow = Math.abs(x) < 2 ? 1 : Math.round(Math.abs(Math.sin((x / 13) * Math.PI)) * -1.5);
      const top = -2 + bow, bot = Math.round(3 * (1 - (x / 13) ** 2));
      for (let y = top; y <= bot; y++) if (B(128 + x, 114 + y) < 0.55) px(g, 128 + x, 114 + y, y < 0 ? 0x15 : y === 0 ? 0x05 : 0x15);
      px(g, 128 + x, 114, 0x05);
    }
    // The far shore of East Egg, a few lit windows, Daisy's dock.
    for (let x = 0; x < SW; x++) { const top = 124 + Math.round(Math.sin(x / 17) * 1.5 + Math.sin(x / 5)); px(g, x, top, 0x0f, 1, 132 - top); }
    for (let i = 0; i < 14; i++) px(g, 6 + i * 17 + (i % 3) * 3, 126 - (i % 2), 0x28, 1, 1);
    px(g, 196, 129, 0x0f, 30, 1); for (let x = 198; x < 226; x += 6) px(g, x, 130, 0x0f, 1, 3);
    // The Sound.
    px(g, 0, 132, 0x02, SW, 44);
    const r = GG.rng(9);
    for (let i = 0; i < 120; i++) { const y = 133 + Math.floor(r() * 42); px(g, Math.floor(r() * SW), y, 0x01, 2 + Math.floor(r() * (4 + (y - 132) / 3)), 1); }
    // Gatsby's lawn, black-green, and a balustrade along its foot.
    for (let x = 0; x < SW; x++) { const top = 174 + Math.round(Math.sin(x / 38) * 2); px(g, x, top, 0x0f, 1, SH - top); if (B(x, top) < 0.5) px(g, x, top, 0x0b, 1, 1); }
    for (let y = 176; y < SH; y++) for (let x = 0; x < SW; x++) if (B(x, y) < 0.08) px(g, x, y, 0x0b);
    for (let i = 0; i < 4; i++) px(g, 4 + i * 5, 166, 0x0f, 3, 10);
    px(g, 0, 164, 0x0f, 26, 3);
    T = { bg: c };
    if (!GG.PIC.logo) GG.buildLogo();
  }

  function gatsbySilhouette(g, x, y, t) {
    const sh = t % 64 < 2 ? 1 : 0;
    const R = (dx, dy, w, h, col = 0x0f) => GG.rect(g, x + dx + sh, y + dy, w, h, col);
    R(-3, -11, 3, 11); R(1, -11, 3, 11);
    R(-3, -25, 7, 15); R(-2, -32, 5, 7); R(-1, -33, 3, 1);
    R(4, -24, 12, 2); R(15, -25, 3, 2);
    R(-4, -23, 1, 6);
    // Rim light from the green light.
    if (Math.floor(t / 22) % 6 !== 5) { R(4, -31, 1, 6, 0x0b); R(4, -25, 1, 13, 0x0b); R(5, -24, 11, 1, 0x0b); }
  }

  function deco(g, t) {
    // Gold rules in the corners, a marquee frame.
    const L = (x, y, w, h) => GG.rect(g, x, y, w, h, 0x18);
    L(4, 4, 40, 1); L(4, 4, 1, 26); L(7, 7, 24, 1); L(7, 7, 1, 14);
    L(SW - 44, 4, 40, 1); L(SW - 5, 4, 1, 26); L(SW - 31, 7, 24, 1); L(SW - 8, 7, 1, 14);
  }

  GG.drawTitle = (g, t, items, sel) => {
    if (!T) buildTitle();
    g.drawImage(T.bg, 0, 0);
    // The green light, blinking, and its long trail across the water.
    const k = GG.cineKit;
    const on = Math.floor(t / 22) % 6 !== 5;
    if (on) {
      k.glow(g, 224, 125, 10, 0x1a, 0.6);
      GG.rect(g, 223, 124, 3, 2, 0x2a); GG.rect(g, 224, 124, 1, 1, 0x3a);
      for (let y = 133; y < 174; y += 2) {
        const w = 1 + Math.floor((y - 133) / 7), off = Math.round(Math.sin((y + t * 0.3) / 3) * 2);
        if ((y + Math.floor(t / 6)) % 4 < 2) GG.rect(g, 224 - w + off, y, w * 2, 1, 0x1a);
      }
    } else GG.rect(g, 223, 124, 3, 2, 0x0a);
    gatsbySilhouette(g, 40, 194, t);
    deco(g, t);
    // The logo comes down out of the stars.
    const logo = GG.PIC.logo;
    const ly = t < 50 ? Math.round(-40 + (t / 50) * 82) : 42;
    if (t > 30) {
      const s = 'THE  GREAT';
      const x0 = Math.round(SW / 2 - (s.length * 9) / 2);
      for (let i = 0; i < s.length; i++) GG.text(g, s[i], x0 + i * 9, ly - 14, 0x28, { shadow: 0x0f });
      GG.rect(g, x0 - 30, ly - 11, 24, 1, 0x18); GG.rect(g, x0 + s.length * 9 + 4, ly - 11, 24, 1, 0x18);
      GG.text(g, '`', x0 - 38, ly - 14, 0x28); GG.text(g, '`', x0 + s.length * 9 + 30, ly - 14, 0x28);
    }
    g.drawImage(logo, Math.round(SW / 2 - logo.width / 2), ly);
    if (t > 70) {
      const y0 = 194 - items.length * 12;
      items.forEach((it, i) => {
        const on2 = i === sel;
        if (on2 && Math.floor(t / 16) % 2) GG.text(g, '>', 78, y0 + i * 12, 0x28, { shadow: 0x0f });
        GG.text(g, it, 94, y0 + i * 12, on2 ? 0x30 : 0x10, { shadow: 0x0f });
      });
    }
    GG.text(g, 'FITZGERALD 1925 / FUNKIE.DEV', SW / 2, 208, 0x2d, { align: 'center' });
    if (t < 20 && GG.fade) GG.fade(1 - t / 20);
  };

  /* ------------------------------------------------------------------ end */
  let E = null;
  GG.drawEnd = (g, t) => {
    const k = GG.cineKit;
    if (!E) {
      E = k.canvas(SW, SH);
      const eg = E.getContext('2d');
      k.sky(eg, [[0x0f, 0], [0x01, 120, 24], [0x02, 150, 10]], SW, 160);
      k.stars(eg, SW, 150, 99, 40, [0x10, 0x30, 0x21]);
      eg.fillStyle = GG.color(0x0f); eg.fillRect(0, 156, SW, 4);
      k.water(eg, 160, 64, 0x02, 0x01, 0, 77, SW);
    }
    g.drawImage(E, 0, 0);
    const on = Math.floor(t / 22) % 6 !== 5;
    if (on) { k.glow(g, 200, 154, 9, 0x1a, 0.6); GG.rect(g, 199, 153, 3, 2, 0x2a); }
    else GG.rect(g, 199, 153, 3, 2, 0x0a);
    GG.rect(g, 176, 157, 26, 1, 0x0f);
    const lines = [
      ['THE END', 0x28, 28],
      ['THE GREAT GATSBY', 0x30, 60],
      ['BY F. SCOTT FITZGERALD', 0x10, 76],
      ['FIRST PUBLISHED 1925', 0x2d, 90],
      ['THANK YOU FOR PLAYING', 0x30, 124],
    ];
    for (const [s, c, y] of lines) if (t > y) GG.text(g, s, SW / 2, y, c, { align: 'center', shadow: 0x0f });
    if (t > 40) { GG.rect(g, 64, 46, 128, 1, 0x18); GG.text(g, '`', SW / 2 - 4, 43, 0x28); }
    if (t > 300 && Math.floor(t / 20) % 2) GG.text(g, 'PRESS START', SW / 2, 196, 0x2d, { align: 'center', shadow: 0x0f });
    if (t < 30 && GG.fade) GG.fade(1 - t / 30);
  };
})();
