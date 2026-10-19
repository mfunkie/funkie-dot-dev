/* Chapter II, part 1: the valley of ashes, along the tracks to Wilson's garage. */
import { Grid, type StageMap } from '../grid.ts';

export function stage2_1(): StageMap {
  const m = new Grid(192, 14);
  m.fill(0, 21, 11, '#');
  m.put(2, 10, 'P');
  m.rect(8, 10, 10, 10, 'A'); m.put(9, 9, 'A');
  m.put(16, 10, 'a');
  // The first pit of the foul river: narrow, with level ground both sides.
  m.fill(22, 23, 12, '~');
  m.fill(24, 39, 11, '#');
  // Heaps of ash that give way, first over solid ground: two heaps filling a
  // dip in the ash, an orange above them. When they go, he drops a tile and
  // walks out.
  m.rect(27, 11, 28, 11, '.');
  m.put(27, 11, 'u'); m.put(28, 11, 'u');
  m.put(28, 8, '+');
  m.rect(31, 10, 33, 10, 'A'); m.rect(32, 9, 33, 9, 'A');
  m.put(35, 10, 'y');
  m.put(37, 10, 'K');
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
  // A grey car on its invisible track, first over solid ground, carrying him
  // toward an orange above the river's edge.
  m.put(67, 10, 'c');
  m.put(73, 6, '+');
  // The drawbridge over the small foul river, with its middle up.
  m.fill(73, 87, 11, '~');
  m.row(73, 10, 'bbbbb'); m.row(81, 10, 'bbbbbbb');
  m.put(79, 10, 'u');   // a heap in the gap: the same trick, over the river now
  m.fill(88, 94, 11, '#');
  m.put(91, 10, 'a');
  // A long stretch of river, and a barge to ride across it.
  m.fill(95, 108, 11, '~');
  m.put(95, 10, 'C');
  m.fill(109, 114, 11, '#');
  m.put(111, 10, 'K');
  // The tracks again, longer.
  m.fill(115, 154, 11, 'T');
  m.put(115, 10, 'z');
  m.rect(117, 10, 117, 10, 'A');
  for (const [x0, w] of [[119, 4], [128, 3], [137, 4], [147, 4]]) {
    m.row(x0, 8, '-'.repeat(w));
    m.rect(x0, 9, x0, 10, '|'); m.rect(x0 + w - 1, 9, x0 + w - 1, 10, '|');
  }
  // Rotten boards between two of the platforms, over the tracks.
  for (let x = 131; x <= 136; x++) m.put(x, 8, 'U');
  m.put(125, 10, 'a'); m.put(143, 10, 'a'); m.put(151, 10, 'a');
  m.fill(155, 191, 11, '#');
  m.rect(158, 10, 160, 10, 'A'); m.put(159, 9, 'A');
  m.put(163, 10, 'y');
  m.put(166, 10, 'K');
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
