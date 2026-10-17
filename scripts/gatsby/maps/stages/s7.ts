/* Chapter VII: the Plaza Hotel, up the light well to the suite and Tom. */
import { Grid, type StageMap } from '../grid.ts';

export function stage7(): StageMap {
  const W = 76, H = 40;
  const m = new Grid(W, H);
  m.rect(0, 0, W - 1, H - 1, 'W');
  // The lobby.
  m.rect(1, 29, 29, 37, '.');
  m.fill(1, 29, 38, 'F');
  m.put(2, 37, 'P');
  for (const x of [5, 13, 21]) m.put(x, 37, 'y');
  m.put(9, 37, 'f');
  m.put(17, 37, 'b');
  m.row(23, 34, 'ttt');
  m.put(24, 33, '+');
  m.put(26, 36, 'K');
  // The light well: brick, two tiles across, a long way up.
  m.rect(30, 10, 33, 37, 'B');
  m.rect(31, 10, 32, 37, '.');
  m.rect(30, 35, 30, 37, '.');
  m.row(31, 30, '=');
  // A landing and a corridor off it, with a fan blowing the wrong way.
  m.rect(33, 21, 55, 23, '.');
  m.fill(33, 55, 24, 'F', 24);
  m.put(54, 23, 'e');
  m.put(42, 23, 'b');
  m.put(38, 22, 'K');
  m.put(50, 23, '+');
  m.rect(52, 18, 55, 20, '.');
  m.row(52, 20, '====');
  // The top corridor to the suite.
  m.rect(33, 10, 59, 11, '.');
  m.fill(33, 59, 12, 'F', 12);
  for (const x of [37, 47, 55]) m.put(x, 9, 'n');
  m.put(40, 11, 'f');
  m.put(50, 11, 'b');
  m.put(44, 11, 'K');
  // The suite: "The room was large and stifling."
  const x0 = 60;
  m.rect(x0, 1, W - 2, 11, '.');
  m.fill(x0, W - 2, 12, 'F', 12);
  for (const x of [x0 + 3, x0 + 8, x0 + 12]) {
    m.put(x, 3, 'n'); m.put(x, 4, 'n');
  }
  m.row(x0 + 2, 8, 'ttt');
  m.row(x0 + 10, 8, 'ttt');
  m.put(x0 + 12, 11, 'T');
  m.put(x0 + 2, 11, 'D');   // Daisy, on Gatsby's side of the room
  return {
    key: '7',
    rows: m.rows(),
    info: {
      rooms: [[1, 28, 29, 37, 'plaza'], [31, 10, 32, 37, 'well'], [30, 35, 30, 37, 'plaza'], [33, 18, 55, 23, 'plaza'], [33, 9, 59, 11, 'plaza'], [x0, 1, W - 2, 11, 'plaza']],
      arena: x0,
      arenaY: 0,
      goal: { x: (x0 + 3) * 16, y: 9 * 16, w: 64, h: 48, tag: 'arena' },
    },
  };
}
