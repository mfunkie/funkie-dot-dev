/*
 * Quote checker for GATSBY.EXE.
 *
 *   node scripts/gatsby/quotes.ts [--verbose] [--out report.md]
 *
 * The game's rule (stated at the top of cine.js): words in double quotation
 * marks are Fitzgerald's. This checks both halves of that promise against the
 * text in docs/gatsby/the-great-gatsby.txt:
 *
 *   1. Every quoted passage in the game appears verbatim in the novel. A quote
 *      may be cut with "..." (each piece must then appear, in order, close
 *      together), and its final punctuation may differ, as quoting allows.
 *      Comparison ignores case (the NES font has only capitals), straight vs
 *      curly quote marks, "--" vs an em dash, and how an ellipsis is typed.
 *   2. Nothing is borrowed without quotation marks: a run of 7 or more words
 *      outside quotes that matches the novel fails too.
 *   3. Names are spelled as the novel spells them: a word the novel never
 *      uses that is one letter (or one swap) away from a name in it fails
 *      (WOLFSHEIM for this edition's WOLFSHIEM).
 *
 * Unquoted lines spoken by a character are the game's own words; they're
 * listed in the report so it's clear which dialogue is invented.
 *
 * Exits 1 if any quote is wrong, any borrowing is unmarked or a name is off.
 */
import fs from 'node:fs';
import path from 'node:path';
import { GAME_DIR, ROOT } from './lib/game.ts';

const BOOK_FILE = path.join(ROOT, 'docs/gatsby/the-great-gatsby.txt');
const RUN = 7;          // words in a row that count as an unmarked borrowing
const CUT_GAP = 600;    // how far apart (in characters) the pieces of a cut quote may be

/* Files whose strings reach the screen. Art and music files are grids and notation. */
const SOURCES = ['cine.js', 'stages.js', 'foes.js', 'bosses.js', 'ents.js', 'game.js', 'art-cine.js', 'index.html'];
const SITE_PAGE = path.join(ROOT, 'src/routes/_content/games.tsx');

/* ---------------------------------------------------------------- text */
export function norm(s: string): string {
  return s
    .toUpperCase()
    .replace(/[⁠​﻿­]/g, '')       // word joiners, zero-width spaces, soft hyphens
    .replace(/[‘’ʼ`]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/–/g, '-')                           // en dash (the font has none)
    .replace(/--/g, '—')
    .replace(/\s*—\s*/g, '—')
    .replace(/…/g, '...')
    .replace(/\.(\s*\.){2,}/g, '...')                  // "....", ". . ." and "…" all read as an ellipsis
    .replace(/\s+/g, ' ')
    .trim();
}
const words = (s: string) => norm(s).replace(/[^A-Z0-9' ]+/g, ' ').split(' ').filter(Boolean);

interface Chapter { name: string; start: number }
function loadBook() {
  const raw = fs.readFileSync(BOOK_FILE, 'utf8');
  const paras = raw.split(/\n\s*\n/).map((p) => p.replace(/\s+/g, ' ').trim()).filter(Boolean);
  let text = '';
  const chapters: Chapter[] = [];
  for (const p of paras) {
    if (/^(I|II|III|IV|V|VI|VII|VIII|IX)$/.test(p)) chapters.push({ name: p, start: text.length });
    // Quote marks inside a quote become single ones, so compare them as one.
    text += norm(p).replace(/"/g, "'") + ' ';
  }
  const bookWords = words(raw);
  const grams = new Set<string>();
  for (let i = 0; i + RUN <= bookWords.length; i++) grams.add(bookWords.slice(i, i + RUN).join(' '));
  const chapterAt = (pos: number) => {
    let c = 'front matter';
    for (const ch of chapters) if (ch.start <= pos) c = ch.name;
    return c;
  };
  // Names: words the novel writes only with a capital letter, 5+ times (so
  // a one-off guest like Snell doesn't make SHELLS look like a misspelling).
  const lower = new Set<string>(), upper = new Map<string, number>();
  for (const m of raw.matchAll(/[A-Za-z\u00c0-\u017f'\u2019-]+/g)) {
    const w = m[0].replace(/[\u2019']s$|[\u2019']$/i, '');
    const W = w.toUpperCase();
    if (/^[A-Z]/.test(w)) upper.set(W, (upper.get(W) || 0) + 1); else lower.add(W);
  }
  const names = [...upper].filter(([w, n]) => !lower.has(w) && w.length >= 5 && n >= 5).map(([w]) => w);
  const vocab = new Set(bookWords);
  return { text, grams, chapterAt, names, vocab };
}
type Book = ReturnType<typeof loadBook>;

/* ------------------------------------------------------------- strings */
interface Str { file: string; line: number; value: string; who?: string }

/* String literals from JS source, skipping comments and regex literals. */
export function jsStrings(src: string, file: string): Str[] {
  const out: Str[] = [];
  let i = 0, line = 1, prev = '';
  const n = src.length;
  while (i < n) {
    const c = src[i];
    if (c === '\n') { line++; i++; continue; }
    if (c === '/' && src[i + 1] === '/') { while (i < n && src[i] !== '\n') i++; continue; }
    if (c === '/' && src[i + 1] === '*') {
      i += 2;
      while (i < n && !(src[i] === '*' && src[i + 1] === '/')) { if (src[i] === '\n') line++; i++; }
      i += 2; continue;
    }
    if (c === '/' && (prev === '' || '(,=:[!&|?{};+-*%<>~^'.includes(prev))) {
      // A regex literal: skip it, minding classes and escapes.
      i++;
      let cls = false;
      while (i < n && (src[i] !== '/' || cls)) {
        if (src[i] === '\\') i++;
        else if (src[i] === '[') cls = true;
        else if (src[i] === ']') cls = false;
        i++;
      }
      i++;
      while (/[a-z]/.test(src[i] || '')) i++;
      prev = ')'; continue;
    }
    if (c === "'" || c === '"' || c === '`') {
      const startLine = line;
      let v = '';
      i++;
      while (i < n && src[i] !== c) {
        if (src[i] === '\\') {
          const e = src[i + 1];
          v += e === 'n' ? '\n' : e === 't' ? '\t' : e === 'u' ? String.fromCharCode(parseInt(src.slice(i + 2, i + 6), 16)) : e;
          i += e === 'u' ? 6 : 2;
          continue;
        }
        if (c === '`' && src[i] === '$' && src[i + 1] === '{') {
          // Keep template holes visible as a marker; skip the expression.
          let depth = 0;
          while (i < n) { if (src[i] === '{') depth++; if (src[i] === '}' && --depth === 0) break; i++; }
          v += '{}'; i++; continue;
        }
        if (src[i] === '\n') line++;
        v += src[i]; i++;
      }
      i++;
      out.push({ file, line: startLine, value: v });
      prev = 'x'; continue;
    }
    if (!/\s/.test(c)) prev = c;
    i++;
  }
  return out;
}

/* Visible text from the HTML page: its meta description and the <noscript>/body copy. */
function htmlStrings(src: string, file: string): Str[] {
  const out: Str[] = [];
  const lines = src.split('\n');
  lines.forEach((l, k) => {
    for (const m of l.matchAll(/content="([^"]*)"/g)) out.push({ file, line: k + 1, value: m[1].replace(/&quot;/g, '"') });
  });
  return out;
}

/* The Gatsby section of the site's games page (JSX text, &quot; for quotes). */
function sitePageStrings(): Str[] {
  const src = fs.readFileSync(SITE_PAGE, 'utf8');
  const start = src.indexOf('The Great Gatsby\n        </h2>');
  if (start < 0) return [];
  const end = src.indexOf('<h2', start + 10);
  const body = src.slice(start, end < 0 ? undefined : end);
  const line = src.slice(0, start).split('\n').length;
  const text = body.replace(/<[^>]+>/g, ' ').replace(/\{' '\}/g, ' ').replace(/&quot;/g, '"').replace(/&amp;/g, '&');
  return [{ file: path.relative(ROOT, SITE_PAGE), line, value: text }];
}

/* A string that looks like something shown to the player, not a key or a grid row. */
const isProse = (s: string) => /[A-Za-z]{2,}/.test(s) && /\s/.test(s.trim()) && !/^[a-z0-9_.\-/ ]+$/.test(s);

/* Quoted passages in a string: pairs of double quote marks. */
function splitQuotes(s: string): { quotes: string[]; rest: string; unbalanced: boolean } {
  const quotes: string[] = [];
  let rest = '';
  const parts = s.split('"');
  parts.forEach((p, k) => { if (k % 2) quotes.push(p); else rest += ' ' + p + ' '; });
  return { quotes, rest, unbalanced: parts.length % 2 === 0 };
}

/* ------------------------------------------------------------ matching */
interface Verdict { ok: boolean; where?: string; cuts?: number; near?: string }

function stripEnds(q: string) {
  return q.replace(/^[\s.,;:!?—-]+/, '').replace(/[\s.,;:!?—-]+$/, '');
}

function findQuote(book: Book, quote: string): Verdict {
  const q = stripEnds(norm(quote));
  if (!q) return { ok: true };
  const at = book.text.indexOf(q);
  if (at >= 0) return { ok: true, where: book.chapterAt(at) };
  // A cut: pieces around "..." must appear in order, near each other.
  if (q.includes('...')) {
    const pieces = q.split('...').map(stripEnds).filter(Boolean);
    let from = 0, first = -1, ok = true;
    for (const p of pieces) {
      const k = book.text.indexOf(p, from);
      if (k < 0 || (first >= 0 && k - from > CUT_GAP)) { ok = false; break; }
      if (first < 0) first = k;
      from = k + p.length;
    }
    if (ok) return { ok: true, where: book.chapterAt(first), cuts: pieces.length - 1 };
  }
  return { ok: false, near: nearest(book, q) };
}

/* The book's passage most like a failed quote, to show what it really says. */
function nearest(book: Book, q: string): string {
  const qw = q.replace(/[^A-Z0-9' ]+/g, ' ').split(' ').filter(Boolean);
  if (!qw.length) return '';
  const text = book.text;
  let best = { score: -1, at: 0 };
  // Anchor on each word of the quote that's long enough to be distinctive.
  for (const w of new Set(qw.filter((x) => x.length > 4))) {
    let k = text.indexOf(w);
    let guard = 0;
    while (k >= 0 && guard++ < 400) {
      const win = text.slice(Math.max(0, k - q.length), k + q.length * 2);
      const ww = new Set(win.replace(/[^A-Z0-9' ]+/g, ' ').split(' '));
      const score = qw.filter((x) => ww.has(x)).length;
      if (score > best.score) best = { score, at: k };
      k = text.indexOf(w, k + 1);
    }
  }
  if (best.score <= 0) return '';
  const s = Math.max(0, best.at - 60);
  return text.slice(s, s + q.length + 140).trim();
}

/* Edit distance with adjacent swaps (optimal string alignment). */
function osa(a: string, b: string): number {
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  }
  return d[a.length][b.length];
}

/* Words the novel never uses that are a near miss for one of its names. */
function misspelledNames(book: Book, s: string): string[] {
  const out: string[] = [];
  for (const w of new Set(words(s).map((x) => x.replace(/'S$/, '')))) {
    if (w.length < 5 || book.vocab.has(w)) continue;
    const near = book.names.find((n) => Math.abs(n.length - w.length) <= 1 && osa(n, w) === 1);
    if (near) out.push(`${w} (the novel: ${near})`);
  }
  return out;
}

/* Runs of RUN+ words outside quotes that come from the book. */
function borrowings(book: Book, rest: string): string[] {
  const ws = words(rest);
  const found: string[] = [];
  let i = 0;
  while (i + RUN <= ws.length) {
    if (book.grams.has(ws.slice(i, i + RUN).join(' '))) {
      let j = i + RUN;
      while (j < ws.length && book.grams.has(ws.slice(j - RUN + 1, j + 1).join(' '))) j++;
      found.push(ws.slice(i, j).join(' '));
      i = j;
    } else i++;
  }
  return found;
}

/* ---------------------------------------------------------------- main */
export function check(opts: { verbose?: boolean } = {}) {
  const book = loadBook();
  const strings: Str[] = [];
  for (const f of SOURCES) {
    const src = fs.readFileSync(path.join(GAME_DIR, f), 'utf8');
    strings.push(...(f.endsWith('.html') ? htmlStrings(src, f) : jsStrings(src, f)));
  }
  strings.push(...sitePageStrings());

  const verified: string[] = [];
  const wrong: string[] = [];
  const unmarked: string[] = [];
  const unbalanced: string[] = [];
  const invented: string[] = [];
  const names: string[] = [];
  for (const s of strings) {
    if (!isProse(s.value)) continue;
    const { quotes, rest, unbalanced: odd } = splitQuotes(s.value);
    const at = `${s.file}:${s.line}`;
    if (odd) { unbalanced.push(`${at}  ${s.value}`); continue; }
    for (const q of quotes) {
      if (!/[A-Za-z]{2,}/.test(q)) continue;
      const v = findQuote(book, q);
      if (v.ok) verified.push(`${at}  [${v.where}${v.cuts ? `, ${v.cuts} cut${v.cuts > 1 ? 's' : ''}` : ''}] "${q}"`);
      else wrong.push(`${at}\n    game: "${q}"\n    book: ${v.near ? '...' + v.near + '...' : '(nothing close)'}`);
    }
    for (const b of borrowings(book, rest)) unmarked.push(`${at}  ${b}`);
    for (const m of misspelledNames(book, s.value)) names.push(`${at}  ${m}`);
    if (!quotes.length && /[A-Z]{2,}.*\s.*[A-Z]{2,}/.test(s.value) && s.value === s.value.toUpperCase() && s.value.split(' ').length >= 4) {
      invented.push(`${at}  ${s.value.replace(/\n/g, ' / ')}`);
    }
  }
  return { verified, wrong, unmarked, unbalanced, invented, names };
}

function report(r: ReturnType<typeof check>, verbose: boolean): string {
  const L: string[] = [];
  L.push('# GATSBY.EXE quote check', '');
  L.push(`Source text: docs/gatsby/the-great-gatsby.txt`, '');
  L.push(`- Quotes verified verbatim: ${r.verified.length}`);
  L.push(`- Quotes that don't match the text: ${r.wrong.length}`);
  L.push(`- Borrowed runs of ${RUN}+ words without quotation marks: ${r.unmarked.length}`);
  L.push(`- Strings with an odd number of quote marks: ${r.unbalanced.length}`);
  L.push(`- Names spelled differently from the novel: ${r.names.length}`);
  L.push(`- Unquoted lines (the game's own words): ${r.invented.length}`, '');
  const sec = (title: string, xs: string[]) => { if (xs.length) L.push(`## ${title}`, '', ...xs.map((x) => '- ' + x), ''); };
  sec("Quotes that don't match", r.wrong);
  sec('Unmarked borrowings', r.unmarked);
  sec('Unbalanced quote marks', r.unbalanced);
  sec('Names spelled differently', r.names);
  if (verbose) { sec('Verified quotes', r.verified); sec("The game's own words", r.invented); }
  return L.join('\n');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const argv = process.argv.slice(2);
  const verbose = argv.includes('--verbose');
  const out = argv.includes('--out') ? argv[argv.indexOf('--out') + 1] : null;
  const r = check({ verbose });
  const text = report(r, verbose);
  console.log(text);
  if (out) fs.writeFileSync(out, report(r, true) + '\n');
  process.exit(r.wrong.length || r.unmarked.length || r.unbalanced.length || r.names.length ? 1 : 0);
}
