/* Chapter II, part 1: the valley of ashes, along the tracks to Wilson's garage. */
import { Grid, type StageMap } from '../grid.ts';

export function stage2_1(): StageMap {
  const m = new Grid(192, 14);
  m.fill(0, 21, 11, '#');
  m.put(2, 10, 'P');
  m.rect(8, 10, 10, 10, 'A'); m.put(9, 9, 'A');
  m.put(16, 10, 'a');
  // A pit of the foul river, crossed on heaps of ash that give way.
  m.fill(22, 25, 12, '~');
  m.put(23, 10, 'u'); m.put(24, 10, 'u');
  m.fill(26, 39, 11, '#');
  m.rect(28, 10, 30, 10, 'A'); m.rect(29, 9, 30, 9, 'A');
  m.put(32, 10, 'y');
  m.put(35, 9, '+');
  m.put(37, 9, 'K');
  // The tracks. A train comes through: get up on the platforms.
  m.fill(40, 66, 11, 'T');
  m.put(40, 10, 'x');
  m.put(43, 10, 'A');
  for (const x0 of [45, 53, 61]) {
    m.row(x0, 8, '----');
    m.rect(x0, 9, x0, 10, '|'); m.rect(x0 + 3, 9, x0 + 3, 10, '|');
  }
  m.put(50, 10, 'a'); m.put(58, 10, 'a');
  m.fill(67, 72, 11, '#');
  m.put(69, 10, 'A'); m.put(70, 9, '+');
  // The drawbridge over the small foul river, with its middle up.
  m.fill(73, 87, 11, '~');
  m.row(73, 10, 'bbbbb'); m.row(81, 10, 'bbbbbbb');
  m.fill(88, 94, 11, '#');
  m.put(91, 10, 'a');
  // A long stretch of river, and a grey car to ride across it.
  m.fill(95, 108, 11, '~');
  m.put(94, 10, 'C');
  m.fill(109, 114, 11, '#');
  m.put(111, 9, 'K');
  // The tracks again, longer.
  m.fill(115, 154, 11, 'T');
  m.put(115, 10, 'z');
  m.rect(117, 10, 117, 10, 'A');
  for (const [x0, w] of [[119, 4], [128, 3], [137, 4], [147, 4]]) {
    m.row(x0, 8, '-'.repeat(w));
    m.rect(x0, 9, x0, 10, '|'); m.rect(x0 + w - 1, 9, x0 + w - 1, 10, '|');
  }
  m.put(133, 7, 'u'); m.put(134, 7, 'u');
  m.put(125, 10, 'a'); m.put(143, 10, 'a'); m.put(151, 10, 'a');
  m.fill(155, 191, 11, '#');
  m.rect(158, 10, 160, 10, 'A'); m.put(159, 9, 'A');
  m.put(163, 10, 'y');
  m.put(166, 9, 'K');
  m.put(170, 10, 'v');
  // "A small block of yellow brick", and Wilson's garage in it.
  m.rect(176, 3, 191, 10, 'B');
  m.row(176, 2, '123');
  for (const x of [182, 185, 188]) {
    m.put(x, 7, 'w'); m.put(x, 8, 'w');
  }
  m.rect(176, 8, 178, 10, '.');
  m.put(177, 10, 'G');
  for (const x of [150, 165]) m.rect(x, 4, x, 10, 't');
  return { key: '2-1', rows: m.rows() };
}
