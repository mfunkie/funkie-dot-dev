/* Chapter III: the party, from the buffet through the library to the host. */
import { Grid, type StageMap } from '../grid.ts';

export function stage3(): StageMap {
  const m = new Grid(224, 14);
  m.fill(0, 223, 11, '#');
  m.put(2, 10, 'P');
  m.put(10, 10, 'g');
  for (let x = 0; x < 224; x++) {
    if (x % 22 < 9) m.put(x, 1, ':');
  }
  // The buffet, and a tower of champagne coupes.
  m.row(14, 8, '=====');
  m.row(20, 8, '====');
  m.rect(16, 7, 17, 7, 'Y'); m.rect(16, 5, 17, 5, 'Y'); m.put(16, 3, 'Y');
  m.put(16, 2, '*');
  m.put(21, 10, 'w');
  // The dance floor and the orchestra: "no thin five-piece affair".
  m.fill(25, 40, 11, 'M');
  m.row(30, 8, '---------');
  m.put(28, 10, 'f'); m.put(35, 10, 'f');
  m.put(34, 7, '+');
  m.rect(42, 8, 44, 10, 'h');
  // The marble swimming pool.
  m.fill(47, 62, 10, 'M');
  m.rect(49, 10, 60, 12, '~');
  m.put(55, 12, '*');
  m.put(64, 9, 'K');
  m.fill(63, 67, 11, '#');
  m.put(72, 10, 't');
  m.row(75, 8, '====');
  m.put(78, 10, 'g');
  m.row(82, 7, '====');
  m.put(86, 10, 'g');
  // The back door, where the machine throws out the oranges.
  m.rect(89, 6, 92, 10, 'W'); m.put(90, 7, 'n'); m.put(91, 7, 'n');
  m.put(88, 10, 'j');
  // "A bar with a real brass rail."
  m.rect(95, 8, 104, 10, 'R');
  m.put(100, 7, 'w');
  m.put(99, 4, '*');
  m.row(97, 5, '==');
  m.put(108, 10, 'f');
  m.put(112, 9, 'K');
  // The house, and the high Gothic library in it.
  m.rect(115, 0, 150, 10, 'W');
  m.rect(117, 2, 148, 10, '.');
  m.fill(115, 150, 11, 'O');
  m.rect(115, 8, 116, 10, '.'); m.rect(149, 8, 150, 10, '.');
  m.rect(120, 9, 121, 10, 'B');
  m.rect(127, 6, 128, 10, 'B');
  m.rect(135, 7, 136, 10, 'B');
  m.rect(142, 5, 143, 10, 'B');
  m.row(122, 8, '_____');
  m.row(129, 6, '______');
  m.row(137, 8, '_____');
  m.row(137, 4, '_____');
  m.row(144, 7, '____');
  m.put(139, 3, '*');
  m.put(124, 10, 'o');
  m.put(131, 10, 'g');
  m.put(146, 6, '+');
  const info = { rooms: [[115, 2, 150, 10, 'library']] };
  // The terrace, the urns, Jordan in white.
  m.put(155, 10, 'U'); m.put(166, 10, 'U');
  m.put(158, 10, 't');
  m.put(161, 10, 'y');
  m.put(163, 9, '*');
  m.put(169, 9, 'K');
  // The marble steps, and the host at the top of them.
  for (let i = 0, x = 174; x < 189; i++, x += 3) m.fill(x, x + 2, 10 - i, 'M');
  m.fill(189, 223, 6, 'M');
  m.put(181, 7, 'f');
  m.rect(205, 0, 223, 5, 'W');
  for (const x of [208, 212, 216, 220]) {
    m.put(x, 2, 'n'); m.put(x, 3, 'n');
  }
  m.put(198, 5, 'G');
  return { key: '3', rows: m.rows(), info };
}
