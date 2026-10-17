/* Chapter I: East Egg. The Buchanans' lawn, from the beach up to the house. */
import { Grid, type StageMap } from '../grid.ts';

export function stage1(): StageMap {
  const m = new Grid(192, 14);
  // The dock and the beach.
  m.fill(0, 4, 12, '~');
  m.row(0, 11, '-----');
  m.fill(5, 13, 11, 's');
  m.put(2, 10, 'P');
  // The lawn starts at the beach...
  m.fill(14, 29, 11, '#');
  m.row(16, 10, 'f  f');
  m.put(20, 9, 'o'); m.put(20, 10, 'I');                 // a sun-dial
  m.fill(25, 27, 11, '^', 11); m.fill(25, 27, 12, '#');  // a rose bed
  m.row(22, 10, '+');
  // ...and climbs.
  m.fill(30, 62, 10, '#');
  m.row(33, 9, 'BBBB');                                  // a brick walk
  m.put(38, 9, 'g');
  m.put(43, 8, 'o'); m.put(43, 9, 'I');
  m.fill(47, 50, 10, '^', 10); m.fill(47, 50, 11, '#');
  m.row(52, 9, 'f f');
  m.put(56, 9, 'p');
  m.rect(60, 8, 61, 9, 'h');                             // a hedge
  m.fill(63, 82, 9, '#');
  m.row(65, 7, 'BBB');
  m.row(70, 6, 'BBBB');
  m.put(71, 5, '+');
  m.put(67, 7, 'K');
  m.row(75, 8, 'f  f');
  // The burning gardens, with brick posts to step on.
  m.fill(83, 93, 9, '^', 9); m.fill(83, 93, 10, '#');
  m.rect(85, 8, 85, 9, 'B'); m.rect(88, 8, 88, 9, 'B'); m.rect(91, 8, 91, 9, 'B');
  m.fill(94, 116, 9, '#');
  m.put(99, 8, 'p');
  m.put(104, 7, 'o'); m.put(104, 8, 'I');
  m.put(110, 8, 'g');
  m.row(112, 8, 'f');
  m.rect(117, 7, 118, 8, 'h');
  m.fill(117, 145, 9, '#');
  m.rect(117, 7, 118, 8, 'h');
  m.fill(121, 124, 9, '^', 9); m.fill(121, 124, 10, '#');
  m.put(122, 7, 'B'); m.put(123, 7, 'B');
  m.put(128, 8, 'K');
  m.put(133, 8, 'p');
  m.row(130, 8, 'f    f');
  // The porch, and Tom on it, legs apart.
  m.fill(138, 146, 9, 'B');
  m.put(141, 8, 'T');
  // Vines up the side of the house, to a ledge with an orange.
  m.rect(145, 3, 145, 8, 'L');
  m.row(141, 3, '====');
  m.put(142, 2, '+');
  // The house: red brick with French windows.
  m.rect(146, 0, 191, 13, 'H');
  m.rect(147, 1, 190, 8, '.');                           // the room
  m.fill(147, 190, 9, 'F');
  m.rect(146, 6, 146, 8, '.');                           // the French doors
  for (const x of [150, 160, 176, 186]) {
    m.put(x, 2, 'n'); m.put(x, 3, 'n');
  }
  m.put(152, 8, 'u');
  m.rect(156, 6, 157, 8, 'W');
  m.put(158, 5, 'c');
  m.rect(164, 4, 165, 8, 'W');
  m.put(166, 3, 'e');
  m.put(174, 4, 'C');
  m.put(180, 8, '+');
  return { key: '1', rows: m.rows(), info: { rooms: [[146, 1, 190, 8, 'rose']] } };
}
