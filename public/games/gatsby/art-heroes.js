'use strict';
/*
 * GATSBY.EXE art: the heroes. Every hero shares one set of bodies (jacket b/B,
 * shirt w, tie t, trousers p/P, shoes o, hands s/d) and has his own head, so a
 * palette is an outfit: Nick's navy blazer and white flannels, Gatsby's pink
 * suit, Jimmy Gatz's "torn green jersey and a pair of canvas pants", and
 * Major Gatsby's uniform.
 */
(() => {
  /* ------------------------------------------------------------- heads */
  // Nick Carraway, in a straw boater.
  const NICK_HEADS = {
    front: [
      '.....kkkkkk.....',
      '....kYYYYYYk....',
      '....kRRRRRRk....',
      '..kkyyyyyyyykk..',
      '...khhhssssssk..',
      '...khhdssksssk..',
      '...khhdsssssssk.',
      '....khssssssdk..',
      '.....kkddsdkk...',
    ],
    hurt: [
      '.......kkkkkk...',
      '......kYYYYYYk..',
      '...kk.kRRRRRRk..',
      '..kkyyyyyyyykk..',
      '...khhhssssssk..',
      '...khhdskksksk..',
      '...khhdsssssssk.',
      '....khssssskkk..',
      '.....kkddsdkk...',
    ],
    back: [
      '.....kkkkkk.....',
      '....kYYYYYYk....',
      '....kRRRRRRk....',
      '..kkyyyyyyyykk..',
      '...khhhhhhhhk...',
      '...khhhhhhhhk...',
      '...kdhhhhhhdk...',
      '....khhhhhhk....',
      '.....kkddkk.....',
    ],
  };
  // The Gatz family: Jimmy, Gatsby, the Major. Hair "trimmed every day".
  const GATZ_HEADS = {
    front: [
      '......kkkkk.....',
      '....kkHHHHHkk...',
      '...khHHhhhhHHk..',
      '...khhhhhhhhhk..',
      '...khhhhhssssk..',
      '...khhhdsksssk..',
      '...khhhdssssssk.',
      '....khhsssssdk..',
      '.....kkdddskk...',
    ],
    hurt: [
      '.......kkkkk....',
      '.....kkHHHHHkk..',
      '....khHHhhhhHHk.',
      '...khhhhhhhhhk..',
      '...khhhhhssssk..',
      '...khhhdkksksk..',
      '...khhhdssssssk.',
      '....khhssskkk...',
      '.....kkdddskk...',
    ],
    back: [
      '......kkkkk.....',
      '....kkHHHHHkk...',
      '...khHHhhhhHHk..',
      '...khhhhhhhhhk..',
      '...khhhhhhhhhk..',
      '...khhhHhhhhhk..',
      '...kdhhhhhhhdk..',
      '....khhhhhhhk...',
      '.....kkddkkk....',
    ],
  };

  /* ------------------------------------------------------------ bodies */
  // Each frame: which head, how many blank rows above it, and the body.
  const BODIES = {
    idle: ['front', 0, [
      '.....kkwtwkk....',
      '....kbbwtwbbk...',
      '...kbBbwtwbBbk..',
      '...kbBbbtkbBbk..',
      '...kbBbbbkbBbk..',
      '...kbBbbkskBbk..',
      '...kbbBbkddbbk..',
      '...kbbbbkkbbbk..',
      '....kPpppppPk...',
      '....kpppkpppk...',
      '.....kppkppk....',
      '.....kppkppk....',
      '.....kookook....',
      '....kkkkkkkkk...',
    ]],
    idle2: ['front', 1, [
      '.....kkwtwkk....',
      '....kbbwtwbbk...',
      '...kbBbwtwbBbk..',
      '...kbBbbtkbBbk..',
      '...kbBbbkskBbk..',
      '...kbbBbkddbbk..',
      '...kbbbbkkbbbk..',
      '....kPpppppPk...',
      '....kpppkpppk...',
      '.....kppkppk....',
      '.....kppkppk....',
      '.....kookook....',
      '....kkkkkkkkk...',
    ]],
    run1: ['front', 0, [
      '.....kkwtwkk....',
      '....kbbwtwbbk...',
      '...kbBbwtwbBbk..',
      '..kbbBbbtbBbsk..',
      '.ksbBbbbtbBkdk..',
      '.kdkBbbbbbkk....',
      '..kkbBbbbbbk....',
      '...kbbbbbbk.....',
      '....kpppppk.....',
      '...kppkkpppk....',
      '..kppk..kpppk...',
      '.kook....kookk..',
      'kkkk......kkkk..',
    ]],
    run2: ['front', 0, [
      '.....kkwtwkk....',
      '....kbbwtwbbk...',
      '...kbBbwtwbBbk..',
      '...kbBbbtkbBbk..',
      '...kbBbbbksBbk..',
      '...kbBbbkddbbk..',
      '...kbbBbbbkbk...',
      '....kbPpppbk....',
      '....kpppkppk....',
      '.....kppkpk.....',
      '.....kookook....',
      '.....kkkkkkk....',
    ]],
    run3: ['front', 0, [
      '.....kkwtwkk....',
      '....kbbwtwbbk...',
      '...kbBbwtwbBbk..',
      '...kbsBbtbBbbk..',
      '...kdkbbtbBbbk..',
      '....kkBbbbbkksk.',
      '....kbBbbbbk.kk.',
      '....kbbbbbbk....',
      '.....kpppppk....',
      '....kpppkkppk...',
      '...kpppk..kppk..',
      '..kkook....kook.',
      '..kkkk......kkkk',
    ]],
    jump: ['front', 0, [
      '.....kkwtwkk.ks.',
      '....kbbwtwbbkdk.',
      '...kbBbwtwbBbk..',
      '..ksbBbbtbBbbk..',
      '..kdkBbbtbBbk...',
      '...kkBbbbbbk....',
      '....kbbbbbbk....',
      '....kPppppppk...',
      '...kpppkkkppk...',
      '...kppk..kppk...',
      '...kook.kook....',
      '...kkkk.kkkk....',
    ]],
    fall: ['front', 0, [
      '.ks..kkwtwkk.ks.',
      '.kdkkbbwtwbbkdk.',
      '..kbbBbwtwbBbk..',
      '...kbBbbtbbBbk..',
      '...kbBbbbbbBbk..',
      '...kbbBbbbbbbk..',
      '....kbbbbbbbbk..',
      '....kpppkkpppk..',
      '...kpppk.kpppk..',
      '..kkook...kookk.',
      '..kkkk.....kkkk.',
    ]],
    throw: ['front', 0, [
      '.....kkwtwkk....',
      '....kbbwtwbbkkk.',
      '...kbBbwtwbBbBsk',
      '...kbBbbtkbbBkdk',
      '...kbBbbbkkkk.k.',
      '...kbBbbbbbk....',
      '...kbbBbbbbk....',
      '...kbbbbbbbk....',
      '....kPpppppk....',
      '....kpppkppk....',
      '....kppk.kppk...',
      '...kkook..kook..',
      '...kkkk...kkkkk.',
    ]],
    throwAir: ['front', 0, [
      '.....kkwtwkk....',
      '....kbbwtwbbkkk.',
      '...kbBbwtwbBbBsk',
      '..ksbBbtkbbBkdk.',
      '..kdkBbbkkkk.k..',
      '...kkBbbbbbk....',
      '....kbbbbbbk....',
      '....kPppppppk...',
      '...kpppkkkppk...',
      '...kppk..kppk...',
      '...kook.kook....',
      '...kkkk.kkkk....',
    ]],
    hurt: ['hurt', 0, [
      '.ks..kkwtwk..ks.',
      '.kdkkbbwtwbkkdk.',
      '..kbbbbwtwbbbk..',
      '...kbBbbtbbBbk..',
      '...kbBbbbbbBbk..',
      '...kbbBbbbbbbk..',
      '....kbbbbbbbk...',
      '....kPpppppPk...',
      '...kpppkkpppk...',
      '..kppk...kppk...',
      '..kook...kook...',
      '..kkkk...kkkk...',
    ]],
    // Against a wall, a hand on it, sliding down.
    slide: ['front', 0, [
      '.....kkwtwkkkks.',
      '....kbbwtwbbBkd.',
      '...kbBbwtwbBbk..',
      '...kbBbbtbbBbk..',
      '...kbBbbbbbBk...',
      '...kbbBbbbbbk...',
      '....kbbbbbbk....',
      '....kPppppppk...',
      '...kpppkkkppk...',
      '...kppk..kppk...',
      '...kook..kook...',
      '...kkkk..kkkk...',
    ]],
    climb1: ['back', 0, [
      '..ks.kkbbbbk.ks.',
      '..kdkbbbbbbbkdk.',
      '...kbBbbbbBbbk..',
      '...kbBbbbbBbbk..',
      '...kbBbbbbBbbk..',
      '...kbbBbbBbbbk..',
      '....kbbbbbbbk...',
      '....kPpppppPk...',
      '....kppkkpppk...',
      '....kppk.kppk...',
      '....kook.kook...',
      '....kkkk..kkk...',
    ]],
    climb2: ['back', 0, [
      '.ks..kkbbbbk..ks',
      '.kdkkbbbbbbbbkdk',
      '..kbbBbbbbBbbk..',
      '..kbbBbbbbBbbk..',
      '..kbbBbbbbBbbk..',
      '..kbbbBbbBbbbk..',
      '...kbbbbbbbbk...',
      '....kPpppppPk...',
      '....kpppkkppk...',
      '...kpppk.kppk...',
      '...kook..kook...',
      '...kkk...kkkk...',
    ]],
    // Reaching out toward the dark water.
    reach: ['front', 0, [
      '.....kkwtwkk..ks',
      '....kbbwtwbbkkdk',
      '...kbBbwtwbBbBk.',
      '...kbBbbtkbBkk..',
      '...kbBbbbkbBk...',
      '...kbBbbbbbBk...',
      '...kbbBbbbbbk...',
      '...kbbbbbbbbk...',
      '....kPpppppPk...',
      '....kpppkpppk...',
      '.....kppkppk....',
      '.....kppkppk....',
      '.....kookook....',
      '....kkkkkkkkk...',
    ]],
  };

  function build(heads) {
    const frames = {};
    for (const [name, [head, gap, body]] of Object.entries(BODIES)) {
      frames[name] = [...Array(gap).fill('................'), ...heads[head], ...body];
    }
    return frames;
  }

  const SKIN = { k: 0x0f, s: 0x36, d: 0x27 };
  GG.sprite('nick', Object.assign({}, SKIN, {
    h: 0x08, H: 0x18,
    y: 0x28, Y: 0x38, R: 0x06,                 // the boater: straw, its ribbon
    b: 0x02, B: 0x12, w: 0x30, t: 0x16,        // navy blazer, white shirt, red tie
    p: 0x30, P: 0x10, o: 0x08,                 // white flannels, brown shoes
  }), build(NICK_HEADS));

  const GATZ = Object.assign({}, SKIN, { h: 0x18, H: 0x28 });
  // "Gatsby in a white flannel suit, silver shirt, and gold-colored tie" came
  // to tea; to the Plaza on the hottest day he wore the pink suit.
  GG.sprite('gatsby', Object.assign({}, GATZ, {
    b: 0x25, B: 0x35, w: 0x30, t: 0x28,
    p: 0x25, P: 0x15, o: 0x30,
  }), build(GATZ_HEADS));
  // The host of the party, in white flannels: what Nick wore to it too.
  GG.recolor('host', 'gatsby', { b: 0x30, B: 0x10, w: 0x20, t: 0x28, p: 0x30, P: 0x10, o: 0x30 });
  GG.recolor('jimmy', 'gatsby', { b: 0x0a, B: 0x1a, w: 0x0a, t: 0x1a, p: 0x37, P: 0x27, o: 0x08 });
  GG.recolor('major', 'gatsby', { b: 0x08, B: 0x18, w: 0x18, t: 0x08, p: 0x18, P: 0x08, o: 0x08 });
})();
