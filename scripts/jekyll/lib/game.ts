/*
 * Loads JEKYLL.EXE's DOM-free files (core.js, world.js, rooms.js) into a
 * sandbox, so node tools run the real rules on the real rooms.
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
export const GAME_DIR = path.join(ROOT, 'public/games/jekyll');

/* The game's namespace. It's plain JS, so the tools treat it loosely. */
export type JH = any;

export const DOM_FREE = ['core.js', 'world.js', 'rooms.js'];

export function loadGame(files: string[] = DOM_FREE): JH {
  const ctx: Record<string, unknown> = {
    console, Math, Object, Array, Uint8Array, Uint16Array, Float32Array, JSON, Set, Map, Number, String, Error, Date,
  };
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  for (const f of files) vm.runInContext(fs.readFileSync(path.join(GAME_DIR, f), 'utf8'), ctx, { filename: f });
  return ctx.JH;
}

/* Every script file the page loads, in order, read from index.html. */
export function pageScripts(): string[] {
  const html = fs.readFileSync(path.join(GAME_DIR, 'index.html'), 'utf8');
  return [...html.matchAll(/<script src="([^"]+)"/g)].map((m) => m[1]);
}

/* A room as text: the map with you (J/H), people and items drawn in. */
export function picture(J: JH, cr: any, st: any): string {
  const rows: string[][] = [];
  const watched = J.watched(cr, st);
  for (let y = 0; y < J.H; y++) {
    const row: string[] = [];
    for (let x = 0; x < J.W; x++) {
      const c = cr.cells[y * J.W + x];
      let ch = c.ch;
      if (J.fogAt(cr, st.t, x, y) && cr.walk[y * J.W + x]) ch = '~';
      if (watched.beams.has(x + ',' + y)) ch = '*';
      cr.items.forEach((it: any) => { if (!(st.took & (1 << it.i)) && it.x === x && it.y === y) ch = '$'; });
      row.push(ch);
    }
    rows.push(row);
  }
  st.ppl.forEach((p: any, i: number) => {
    if (!p.on || p.gone) return;
    const pd = cr.people[i];
    const mark = pd.kind === 'const' ? { n: '^', s: 'v', e: '>', w: '<' }[p.d as string] : pd.kind === 'seek' ? 'U' : pd.asleep ? 'z' : String.fromCharCode(97 + (i % 26));
    rows[p.y][p.x] = mark as string;
  });
  rows[st.y][st.x] = st.f === 'J' ? 'J' : 'H';
  return rows.map((r) => r.join('')).join('\n');
}
