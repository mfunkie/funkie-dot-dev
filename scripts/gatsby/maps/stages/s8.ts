/* Chapter VIII: the Argonne, trenches and wire in the dark (Gatsby's war). */
import { Grid, type StageMap } from '../grid.ts';

export function stage8(): StageMap {
  const m = new Grid(200, 16);
  m.fill(0, 199, 12, '#');
  m.put(2, 11, 'P');
  m.rect(6, 11, 7, 11, 'S');
  const trench = (x: number, w: number, depth = 4, water = true) => {
    m.rect(x, 12, x + w - 1, 12 + depth - 1, '.');
    m.rect(x - 1, 12, x - 1, 11 + depth, 'W'); m.rect(x + w, 12, x + w, 11 + depth, 'W');
    if (water) {
      m.rect(x, 15, x + w - 1, 15, '~');
      m.row(x, 14, '='.repeat(w));
    } else {
      m.rect(x, 12 + depth, x + w - 1, 15, '#');
    }
  };
  const wire = (x: number, w: number) => m.row(x, 11, '^'.repeat(w));
  trench(12, 3);
  m.put(13, 13, 'r');
  wire(20, 2);
  m.put(24, 10, 'i');
  m.put(27, 11, 'S'); m.rect(28, 10, 29, 11, 'S');
  trench(33, 2);
  m.put(38, 10, 'K');
  wire(42, 3);
  m.put(48, 10, '|');
  // A flooded shell hole.
  m.rect(51, 12, 56, 13, '~'); m.rect(52, 14, 55, 14, '~');
  m.put(54, 9, 'g');
  wire(60, 2);
  trench(66, 3);
  m.put(67, 13, 'r');
  m.rect(72, 10, 73, 11, 'S');
  m.put(76, 9, '+');
  m.rect(78, 9, 80, 11, 'S');
  wire(82, 3);
  m.put(88, 10, 'K');
  trench(92, 2, 4, false);
  m.put(96, 10, 'i');
  m.put(100, 8, 'g');
  wire(103, 4);
  m.rect(104, 9, 105, 9, 'S');
  trench(110, 4);
  m.put(111, 13, 'r'); m.put(113, 13, 'r');
  m.rect(116, 10, 117, 11, 'S');
  m.rect(122, 12, 126, 13, '~'); m.rect(123, 14, 125, 14, '~');
  m.put(131, 10, 'K');
  wire(134, 2);
  m.put(139, 9, 'g');
  trench(142, 2);
  m.put(147, 10, '|');
  wire(150, 3);
  m.rect(155, 9, 156, 11, 'S');
  m.put(158, 9, '+');
  trench(161, 3);
  m.put(162, 13, 'r');
  m.put(167, 10, 'K');
  wire(171, 2);
  m.put(175, 8, 'g');
  trench(178, 2);
  m.rect(184, 9, 199, 11, 'S');
  m.rect(184, 9, 186, 9, '.');
  m.put(193, 7, 'M');
  return { key: '8', rows: m.rows() };
}
