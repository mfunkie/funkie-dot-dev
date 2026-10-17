/* Chapter VI: Lake Superior. Jimmy Gatz rows out to Dan Cody's yacht. */
import { Grid, type StageMap } from '../grid.ts';

export function stage6(): StageMap {
  const m = new Grid(150, 18);
  m.fill(0, 20, 15, 's');
  m.rect(0, 15, 3, 17, '~');
  m.put(5, 14, 'P');
  m.put(10, 14, 'c');
  m.row(12, 13, '===');
  m.put(13, 12, '*');
  m.put(17, 14, 'c');
  // The cliffs, and a chimney to climb.
  m.fill(21, 50, 6, 'R');
  m.fill(21, 50, 6, '#', 6);
  m.rect(24, 6, 25, 14, '.');
  m.rect(24, 15, 25, 17, 's');
  m.rect(21, 12, 23, 14, '.');
  m.put(24, 4, '*');
  for (const x of [30, 38, 46]) {
    m.rect(x, 3, x, 5, 'i'); m.rect(x - 1, 1, x + 1, 2, 'v');
    m.put(x, 3, 'x');
  }
  m.put(34, 3, 'q');
  // A crevice in the cliff with a ledge down in it.
  m.rect(40, 6, 42, 17, '.');
  m.rect(40, 16, 42, 17, '~');   // a tide pool: he can swim out of it
  m.row(40, 12, '=');
  m.put(40, 11, '*');
  m.put(44, 5, 'K');
  // Down to the cove.
  m.fill(51, 56, 9, 'R'); m.fill(51, 56, 9, '#', 9);
  m.fill(57, 60, 12, 'R'); m.fill(57, 60, 12, '#', 12);
  m.fill(61, 72, 15, 's');
  m.rect(63, 14, 70, 17, '~');
  m.row(65, 13, '===');
  m.put(68, 16, '*');
  m.put(62, 14, 'c');
  m.put(71, 13, 'K');
  // The open lake, and the rowboat at the end of the dock. The yacht lies
  // over "the most insidious flat on Lake Superior": shallow water on sand,
  // so a gull that knocks him in costs a swim, not a life.
  m.fill(73, 149, 14, '~');
  m.rect(74, 17, 106, 17, 's');
  m.row(73, 13, 'ddd');
  m.rect(73, 14, 73, 17, 'R');
  m.put(77, 13, 'b');
  m.put(88, 8, 'q'); m.put(96, 7, 'q');
  m.put(90, 10, '*');
  // The Tuolomee, and rungs up her side.
  m.rect(107, 7, 149, 17, 'X');
  m.row(107, 6, '-'.repeat(43));
  m.row(105, 11, '--'); m.row(105, 9, '--');
  m.rect(118, 4, 126, 6, 'C');
  m.put(122, 3, '*');
  m.put(131, 6, 'q');
  m.put(144, 6, 'D');
  return { key: '6', rows: m.rows() };
}
