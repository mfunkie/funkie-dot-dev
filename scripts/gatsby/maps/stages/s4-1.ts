/* Chapter IV, part 1: over the Queensboro Bridge in Gatsby's car (an autoscroller). */
import { Grid, type StageMap } from '../grid.ts';

export function stage4_1(): StageMap {
  const m = new Grid(232, 14);
  m.fill(0, 231, 11, '#');
  // The bridge overhead: a ceiling of steel, trusses below it.
  m.rect(0, 0, 231, 0, 'X');
  for (let x = 0; x < 232; x++) {
    if (x % 8 === 0 || x % 8 === 1) m.rect(x, 1, x, 3, 'x');
  }
  for (let x = 4; x < 232; x += 12) {
    m.put(x, 9, 'l'); m.put(x, 10, 'l');
  }
  m.put(2, 10, 'C');
  m.put(6, 8, 'P');
  const girder = (x: number, w: number, bottom: number) => m.rect(x, 0, x + w - 1, bottom, 'X');
  const hole = (x: number, w: number) => {
    m.rect(x, 11, x + w - 1, 11, '_'); m.rect(x, 12, x + w - 1, 13, '.');
  };
  // Bottom row 7 scrapes him off the high boxes; row 8 off the car
  // altogether (the roadway is clear); a hole needs him back on it.
  girder(22, 3, 7);
  girder(36, 4, 8);
  hole(43, 2);   // the first hole is narrow
  m.put(50, 7, 'q');   // the first gull, over solid road
  girder(54, 4, 8);
  hole(61, 4);
  m.put(66, 8, 'q');
  girder(72, 4, 8);
  hole(79, 6);
  m.put(92, 10, 'K');
  girder(100, 3, 8);
  hole(106, 3);
  m.put(112, 7, 'q');
  m.put(118, 10, 'h');
  girder(122, 4, 8);
  hole(129, 4);
  girder(136, 4, 8);
  hole(143, 4);
  m.put(158, 10, 'K');
  hole(165, 6);
  girder(173, 4, 7);
  m.put(176, 8, 'q');
  girder(184, 4, 8);
  hole(191, 4);
  girder(198, 4, 8);
  hole(205, 5);
  return { key: '4-1', rows: m.rows() };
}
