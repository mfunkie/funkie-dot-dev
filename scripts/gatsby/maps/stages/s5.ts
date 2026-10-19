/* Chapter V: up through Gatsby's house, catching falling shirts (a vertical stage). */
import { Grid, type StageMap } from '../grid.ts';

export function stage5(): StageMap {
  const W = 20, H = 72;
  const m = new Grid(W, H);
  m.rect(0, 0, 0, H - 1, 'W'); m.rect(W - 1, 0, W - 1, H - 1, 'W'); m.rect(0, 0, W - 1, 0, 'W');
  // Ground floor: the music room, Klipspringer, the piano.
  m.fill(0, W - 1, 70, 'F');
  m.put(2, 69, 'P');
  m.put(6, 69, 'k');
  m.rect(11, 68, 13, 69, 'Q');
  m.put(16, 69, 'u');
  for (const x of [4, 9, 15]) {
    m.put(x, 63, 'n'); m.put(x, 64, 'n');
  }
  m.row(15, 66, '====');
  m.row(9, 63, '====');
  m.row(1, 60, '=====');
  m.put(2, 59, '1');
  m.row(8, 57, '=====');
  m.row(14, 54, '=====');
  m.put(16, 49, 's');
  m.put(17, 53, '+');
  // The salon floor, with a stair gap.
  m.fill(1, 13, 50, 'F', 50);
  m.put(6, 49, 'K');
  m.put(3, 46, 'c');
  m.row(14, 47, '=====');
  m.row(1, 44, '====');
  m.put(2, 43, '2');
  // Shirts down the middle; ledges too far apart without them.
  m.put(9, 29, 'S');
  m.row(1, 41, '=====');
  m.row(14, 37, '=====');
  m.row(1, 33, '=====');
  m.put(17, 36, '3');
  m.row(14, 29, '=====');
  for (const x of [5, 14]) m.put(x, 31, 'h');
  // The bedrooms: rose and lavender silk.
  m.fill(1, 12, 28, 'F', 28);
  m.put(7, 27, 'K');
  m.row(1, 27, 'bbbb');
  m.put(10, 23, 'c');
  m.put(16, 23, 's');
  m.row(13, 24, '======');
  m.put(2, 24, '4');
  m.row(8, 20, '====');
  m.row(1, 17, '=====');
  m.put(12, 6, 'S');
  m.row(14, 15, '=====');
  m.row(1, 12, '====');
  m.put(17, 14, '5');
  m.row(14, 9, '=====');
  m.put(7, 9, 'c');
  m.put(3, 11, '+');
  // Gatsby's room at the top.
  m.fill(1, 12, 5, 'F', 5);
  m.put(6, 4, 'G');
  m.put(10, 4, 'u');
  for (const y of [8, 18, 38]) m.put(9, y, 'h');
  return { key: '5', rows: m.rows() };
}
