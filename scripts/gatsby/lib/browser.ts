/*
 * Serves public/ on a free port and opens GATSBY.EXE in headless Chromium,
 * for checks that need the real renderer (palettes, transitions, bots).
 */
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import type { AddressInfo } from 'node:net';
import { chromium, type Browser, type Page } from 'playwright';
import { ROOT } from './game.ts';

const TYPES: Record<string, string> = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2',
  '.ico': 'image/x-icon', '.txt': 'text/plain', '.xml': 'application/xml', '.webmanifest': 'application/manifest+json',
};

export async function serve(dir = path.join(ROOT, 'public')): Promise<{ origin: string; close: () => Promise<void> }> {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url || '/', 'http://x');
    let file = path.join(dir, decodeURIComponent(url.pathname));
    if (!file.startsWith(dir)) { res.writeHead(403).end(); return; }
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
    fs.readFile(file, (err, data) => {
      if (err) { res.writeHead(404).end(); return; }
      res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' });
      res.end(data);
    });
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;
  return { origin: `http://127.0.0.1:${port}`, close: () => new Promise((resolve) => server.close(() => resolve())) };
}

export interface GamePage {
  browser: Browser;
  page: Page;
  origin: string;
  errors: string[];
  close: () => Promise<void>;
}

/* Opens the game with a query string (e.g. '?debug&stage=3'); collects page errors. */
export async function openGame(query = '?debug', viewport = { width: 800, height: 720 }): Promise<GamePage> {
  const srv = await serve();
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  await page.goto(`${srv.origin}/games/gatsby/index.html${query}`);
  await page.waitForFunction(() => (globalThis as unknown as { GG?: { _dbg?: unknown } }).GG?._dbg);
  return {
    browser, page, origin: srv.origin, errors,
    close: async () => { await browser.close(); await srv.close(); },
  };
}
