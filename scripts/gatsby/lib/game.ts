/*
 * Loads GATSBY.EXE's DOM-free files (core.js, maps.js, stages.js) into a
 * sandbox so node tools can run the real physics and level compiler.
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
export const GAME_DIR = path.join(ROOT, 'public/games/gatsby');

/* The game's namespace. It's plain JS, so the tools treat it loosely. */
export type GG = any;

export const DOM_FREE = ['core.js', 'maps.js', 'stages.js'];

export function loadGame(files: string[] = DOM_FREE, extra: Record<string, unknown> = {}): GG {
  const ctx: Record<string, unknown> = {
    console, Math, Object, Array, Uint8Array, Uint16Array, Float32Array, JSON, Set, Map, Number, String, Error, Date,
    ...extra,
  };
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  for (const f of files) {
    vm.runInContext(fs.readFileSync(path.join(GAME_DIR, f), 'utf8'), ctx, { filename: f });
  }
  return ctx.GG;
}

/* Every script file the page loads, in order, read from index.html. */
export function pageScripts(): string[] {
  const html = fs.readFileSync(path.join(GAME_DIR, 'index.html'), 'utf8');
  return [...html.matchAll(/<script src="([^"]+)"/g)].map((m) => m[1]);
}
