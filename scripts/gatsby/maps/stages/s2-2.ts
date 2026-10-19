/* Chapter II, part 2: Doctor T. J. Eckleburg's billboard over the dumping ground. */
import { Grid, type StageMap } from '../grid.ts';

export function stage2_2(): StageMap {
  const m = new Grid(40, 14);
  m.fill(0, 39, 11, '#');
  m.put(2, 10, 'P');
  m.rect(6, 10, 7, 10, 'A');
  m.put(11, 10, 'a');
  m.put(15, 10, 'K');
  m.put(18, 9, '+');
  m.rect(38, 0, 39, 13, 'A');
  const x0 = 22;
  // The billboard, high over the dumping ground, and scaffolding before it.
  m.put(x0 + 1, 1, 'E');
  for (const x of [x0 + 1, x0 + 14]) m.rect(x, 7, x, 10, 'i');
  m.row(x0 + 1, 8, '====');
  m.row(x0 + 10, 8, '=====');
  m.rect(x0 + 2, 8, x0 + 2, 10, 'L');
  m.rect(x0 + 12, 8, x0 + 12, 10, 'L');
  m.row(x0 + 5, 5, '=====');
  m.rect(x0 + 7, 5, x0 + 7, 7, 'L');
  m.put(x0 + 7, 10, '+');
  return {
    key: '2-2',
    rows: m.rows(),
    info: { arena: x0, goal: { x: (x0 + 5) * 16, y: 3 * 16, w: 80, h: 32, tag: 'arena' } },
  };
}
