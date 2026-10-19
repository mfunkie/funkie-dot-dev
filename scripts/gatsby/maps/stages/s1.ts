/* Chapter I: East Egg. The Buchanans' lawn, from the beach up to the house. */
import { Grid, type StageMap } from '../grid.ts';

export function stage1(): StageMap {
  const m = new Grid(192, 14);
  // The dock and the beach.
  m.fill(0, 4, 12, '~');
  m.row(0, 11, '-----');
  m.fill(5, 13, 11, 's');
  m.put(2, 10, 'P');
  // The lawn starts at the beach... A sun-dial to jump, then the first rose
  // bed: two tiles, sunk into the lawn, so a short hop clears it and a fall
  // into it costs a heart and a hop back out.
  m.fill(14, 29, 11, '#');
  m.row(16, 10, 'f  f');
  m.put(20, 9, 'o'); m.put(20, 10, 'I');                 // a sun-dial
  m.put(22, 10, '+');
  m.fill(25, 26, 11, '^', 11); m.fill(25, 26, 12, '#');  // a rose bed
  // ...and climbs. Every brick walk lies on the lawn.
  m.fill(30, 62, 10, '#');
  m.row(33, 9, 'BBBB');                                  // a brick walk
  m.put(38, 9, 'g');
  m.put(43, 8, 'o'); m.put(43, 9, 'I');
  m.fill(47, 49, 10, '^', 10); m.fill(47, 49, 11, '#');
  m.row(51, 9, 'f  f');
  m.put(56, 9, 'p');                                     // Tom's ponies: hop on, not into
  m.rect(60, 8, 61, 9, 'h');                             // a hedge
  m.fill(63, 82, 9, '#');
  m.put(64, 8, 'K');
  // A garden wall in two steps, an orange on top.
  m.rect(68, 8, 70, 8, 'B');
  m.rect(71, 7, 74, 8, 'B');
  m.put(72, 6, '+');
  m.row(77, 8, 'f  f');
  // The burning gardens, crossed on brick posts two bricks wide.
  m.fill(83, 92, 9, '^', 9); m.fill(83, 92, 10, '#');
  m.rect(85, 8, 86, 9, 'B'); m.rect(89, 8, 90, 9, 'B');
  m.fill(93, 116, 9, '#');
  m.put(99, 7, 'o'); m.put(99, 8, 'I');
  m.put(106, 8, 'p');
  m.put(112, 8, 'g');
  m.row(114, 8, 'f');
  m.rect(117, 7, 118, 8, 'h');
  m.fill(117, 145, 9, '#');
  m.fill(121, 123, 9, '^', 9); m.fill(121, 123, 10, '#');
  m.put(128, 8, 'K');
  m.row(126, 8, 'f');
  m.row(131, 8, 'f');
  m.put(134, 8, 'p');
  // The porch, and Tom on it, legs apart.
  m.fill(138, 146, 9, 'B');
  m.put(139, 8, 'T');
  // Vines up the front of the house, to a cornice with an orange on it.
  m.rect(143, 4, 143, 8, 'L');
  m.row(142, 3, '====');
  m.put(144, 2, '+');
  // The house: red brick with French windows.
  m.rect(146, 0, 191, 13, 'H');
  m.rect(147, 1, 190, 8, '.');                           // the room
  m.fill(147, 190, 9, 'F');
  m.rect(146, 6, 146, 8, '.');                           // the French doors
  // "A breeze blew through the room, blew curtains in at one end and out the
  // other like pale flags": each curtain blows out of an open window.
  for (const x of [150, 157, 176, 186]) m.rect(x, 2, x, 5, 'n');
  m.put(152, 8, 'u');
  m.rect(156, 6, 157, 8, 'W');
  m.put(158, 5, 'c');
  m.rect(164, 4, 165, 8, 'W');
  // The couch, "buoyed up as though upon an anchored balloon", a hop from the chair.
  m.put(169, 4, 'C');
  // A cabinet past it: a way back up for anyone who drops to the floor beyond the chair.
  m.rect(173, 7, 174, 8, 'W');
  m.put(180, 8, '+');
  return { key: '1', rows: m.rows(), info: { rooms: [[146, 1, 190, 8, 'rose']] } };
}
