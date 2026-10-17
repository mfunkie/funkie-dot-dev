/*
 * A stage map being drawn: a grid of characters, '.' for empty. Coordinates
 * are tiles (16px); x is the column, y the row, inclusive ranges throughout.
 */

/* What a stage file returns: its map rows and anything GG.MAPINFO keeps for it. */
export interface StageMap {
  key: string;
  rows: string[];
  info?: Record<string, unknown>;
}

export class Grid {
  w: number;
  h: number;
  g: string[][];

  constructor(w: number, h: number) {
    this.w = w;
    this.h = h;
    this.g = Array.from({ length: h }, () => new Array<string>(w).fill('.'));
  }

  put(x: number, y: number, ch: string): void {
    if (x >= 0 && x < this.w && y >= 0 && y < this.h) this.g[y][x] = ch;
  }

  rect(x0: number, y0: number, x1: number, y1: number, ch: string): void {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) this.put(x, y, ch);
  }

  /* Solid ground from row `top` down to the bottom (or to `bottom`). */
  fill(x0: number, x1: number, top: number, ch: string, bottom?: number): void {
    this.rect(x0, top, x1, bottom === undefined ? this.h - 1 : bottom, ch);
  }

  clear(x0: number, y0: number, x1: number, y1: number): void {
    this.rect(x0, y0, x1, y1, '.');
  }

  /* A run of characters left to right; spaces leave what's there. */
  row(x0: number, y: number, s: string): void {
    for (let i = 0; i < s.length; i++) if (s[i] !== ' ') this.put(x0 + i, y, s[i]);
  }

  rows(): string[] {
    return this.g.map((r) => r.join(''));
  }
}
