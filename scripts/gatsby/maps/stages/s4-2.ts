/* Chapter IV, part 2: Wolfsheim's cellar on Forty-second Street. */
import { Grid, type StageMap } from '../grid.ts';

export function stage4_2(): StageMap {
  const m = new Grid(50, 14);
  m.rect(0, 0, 49, 0, 'W');
  m.fill(0, 49, 11, 'F');
  m.rect(48, 0, 49, 13, 'W');
  for (let x = 3; x < 48; x += 7) m.put(x, 1, 'f');
  m.put(2, 10, 'P');
  // Cafe tables on the floor; a shelf of bottles on the wall over the booth.
  m.row(6, 10, '===');
  m.rect(10, 9, 11, 10, 'b');
  m.put(14, 10, 'w');
  m.row(16, 10, '===');
  m.row(20, 7, '----');
  m.put(21, 6, '+');
  m.rect(22, 9, 23, 10, 'b');
  m.put(26, 10, 'K');
  m.put(29, 10, 'w');
  const x0 = 32;
  for (const x of [x0 + 2, x0 + 13]) m.put(x, 4, 'l');
  // The arena is open floor: Wolfshiem pitches across it, nothing to trip on.
  m.put(x0 + 13, 10, 'V');
  return {
    key: '4-2',
    rows: m.rows(),
    info: { arena: x0, goal: { x: (x0 + 2) * 16, y: 9 * 16, w: 64, h: 32, tag: 'arena' } },
  };
}
