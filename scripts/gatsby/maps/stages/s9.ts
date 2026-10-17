/* Chapter IX: boats against the current, out to the green light on Daisy's dock. */
import { Grid, type StageMap } from '../grid.ts';

export function stage9(): StageMap {
  const m = new Grid(200, 14);
  m.fill(0, 199, 11, '~');
  // Gatsby's lawn and beach.
  m.fill(0, 8, 9, '#');
  m.fill(9, 12, 10, 's');
  m.put(2, 8, 'P');
  m.put(6, 7, '+');
  const dock = (x: number, w: number, row = 9, piles?: number[]) => {
    m.row(x, row, '-'.repeat(w));
    for (const px of piles || [x, x + w - 1]) m.rect(px, row + 1, px, 13, 'I');
  };
  const rock = (x: number, w: number, top = 9) => m.fill(x, x + w - 1, top, 'R');
  /* A skiff that comes on beside b (a tile) and drifts back toward a. */
  const boat = (_a: number, b: number, ch = 'b') => m.put(b - 3, 10, ch);
  dock(14, 9);
  m.put(19, 7, 'K');
  // Bell buoys to hop along.
  for (const x of [25, 28, 31]) m.put(x, 10, 'u');
  rock(34, 3);
  boat(37, 46);
  dock(46, 6);
  m.put(49, 7, 'K');
  for (const x of [55, 58]) m.put(x, 10, 'u');
  rock(61, 2, 10);
  boat(63, 72, 'B');
  rock(72, 3);
  m.put(73, 8, '+');
  for (const x of [78, 81, 84]) m.put(x, 10, 'u');
  dock(87, 6);
  m.put(90, 7, 'K');
  boat(93, 102);
  rock(102, 2);
  boat(104, 115, 'n');
  dock(115, 5);
  for (const x of [123, 126]) m.put(x, 10, 'u');
  rock(129, 2);
  boat(131, 140);
  dock(140, 6);
  m.put(143, 7, 'K');
  for (const x of [149, 152, 155]) m.put(x, 10, 'u');
  // Daisy's dock, in three stretches, and the green light at the end.
  dock(158, 10, 9, [158, 163, 167]);
  dock(170, 10, 9, [170, 175, 179]);
  dock(182, 10, 9, [182, 187, 191]);
  m.fill(192, 199, 7, 'R');
  m.row(192, 7, '########');
  m.put(166, 8, 'L');
  return { key: '9', rows: m.rows(), info: { stops: [178, 190] } };
}
