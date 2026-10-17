/*
 * The playtest report: where players died, how long each stage took, and
 * whether that matches the difficulty the stages were designed for.
 *
 *   node scripts/gatsby/heatmap.ts <log.json | folder>... [--out playtest-report]
 *
 * Reads the JSON files players saved from the game (SAVE PLAYTEST LOG, see
 * docs/gatsby/playtest.md), merges them by player name, and writes a folder
 * with report.html (open it in a browser), one PNG per stage, and
 * summary.json. Each stage's whole map is rendered with the game's own code
 * in headless Chromium, and every death and hurt is drawn on it, shaded by
 * density so the clusters show. Targets come from scripts/gatsby/
 * playtest-targets.json; stages whose median player falls outside a band
 * are flagged.
 */
import fs from 'node:fs';
import path from 'node:path';
import { openGame } from './lib/browser.ts';
import { ROOT } from './lib/game.ts';

/* ------------------------------------------------------------- the logs */
interface Ev { t: number; x: number; y: number; cause?: string; hearts?: number }
interface Run {
  stage: string; started: string; end: string; frames: number; seed: number; rle: number[] | null;
  deaths: Ev[]; hurts: Ev[]; checkpoints: Ev[]; items: { t: number; name: string }[]; clearT?: number; respawns: number;
}
interface Session { id: string; player: string; started: string; blind: boolean; inputs: string[]; runs: Run[]; answers: { stage: string; answer: string; at: string }[]; userAgent?: string }
interface Target { deaths: [number, number]; minutes: [number, number]; clearRate: number; floorMinutes: number; why: string }

const argv = process.argv.slice(2);
const outDir = path.resolve(argv.includes('--out') ? argv[argv.indexOf('--out') + 1] : 'playtest-report');
const inputs = argv.filter((a, i) => !a.startsWith('--') && argv[i - 1] !== '--out');
if (!inputs.length) {
  console.error('usage: node scripts/gatsby/heatmap.ts <log.json | folder>... [--out dir]');
  process.exit(2);
}
const files: string[] = [];
for (const p of inputs) {
  const st = fs.statSync(p);
  if (st.isDirectory()) for (const f of fs.readdirSync(p)) { if (f.endsWith('.json')) files.push(path.join(p, f)); }
  else files.push(p);
}
const sessions: Session[] = [];
const seenIds = new Set<string>();
for (const f of files) {
  let v: any;
  try { v = JSON.parse(fs.readFileSync(f, 'utf8')); } catch { console.warn(`skipping ${f}: not JSON`); continue; }
  if (v?.kind !== 'gatsby-exe-playtest') { console.warn(`skipping ${f}: not a GATSBY.EXE playtest log`); continue; }
  // A player may send the same log twice, or a log saved twice on one device.
  for (const s of v.sessions as Session[]) if (!seenIds.has(s.id)) { seenIds.add(s.id); sessions.push(s); }
}
const targets: Record<string, Target> = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/gatsby/playtest-targets.json'), 'utf8')).stages;

/* --------------------------------------------------------------- stats */
const median = (xs: number[]) => {
  if (!xs.length) return NaN;
  const s = [...xs].sort((a, b) => a - b), m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const byPlayer = new Map<string, Session[]>();
for (const s of sessions) byPlayer.set(s.player, [...(byPlayer.get(s.player) || []), s]);
const players = [...byPlayer.keys()].sort();

interface PlayerStage { player: string; started: boolean; cleared: boolean; deaths: number; minutes: number; quits: number; runs: number }
function playerStage(player: string, stage: string): PlayerStage {
  const runs = byPlayer.get(player)!.flatMap((s) => s.runs).filter((r) => r.stage === stage).sort((a, b) => a.started.localeCompare(b.started));
  let deaths = 0, frames = 0, cleared = false, quits = 0;
  for (const r of runs) {
    deaths += r.deaths.length;
    frames += r.frames;
    if (r.end === 'clear') { cleared = true; break; }
    if (['quit', 'select', 'closed'].includes(r.end)) quits++;
  }
  return { player, started: runs.length > 0, cleared, deaths, minutes: frames / 3600, quits, runs: runs.length };
}

/* ---------------------------------------------------------------- maps */
console.log(`${sessions.length} sessions from ${players.length} players (${files.length} files)`);
fs.mkdirSync(outDir, { recursive: true });
const gp = await openGame('?debug');
const stages = (await gp.page.evaluate(() => (globalThis as any).GG.stages.map((s: any) => ({
  key: s.key, chapter: s.chapter, name: s.name, hero: s.hero,
})))) as { key: string; chapter: string; name: string; hero: string }[];
interface MapInfo { w: number; h: number; checks: { x: number; y: number }[]; goals: { x: number; y: number }[]; start: { x: number; y: number } }
const maps: Record<string, MapInfo> = {};
for (let i = 0; i < stages.length; i++) {
  const r = await gp.page.evaluate((i: number) => {
    const GG = (globalThis as any).GG, D = GG._dbg;
    const W = D.startStage(i), lv = W.lv, def = W.def;
    if (GG.nes && GG.nes.use) GG.nes.use(def.key);
    const big = document.createElement('canvas');
    big.width = lv.pw; big.height = lv.ph;
    const bg = big.getContext('2d')!;
    bg.imageSmoothingEnabled = false;
    const sw = GG.W, sh = GG.H;
    const scr = document.createElement('canvas');
    scr.width = sw; scr.height = sh;
    const g = scr.getContext('2d')!;
    // The map a screen at a time, the way the game draws the background planes.
    const xs: number[] = [], ys: number[] = [];
    for (let x = 0; x < lv.pw; x += sw) xs.push(Math.max(0, Math.min(x, lv.pw - sw)));
    for (let y = 0; y < lv.ph; y += sh) ys.push(Math.max(0, Math.min(y, lv.ph - sh)));
    for (const cy of ys) for (const cx of xs) {
      g.clearRect(0, 0, sw, sh);
      const B = GG.BG[def.bg];
      if (B) B.draw(g, cx, cy, 0, W); else { g.fillStyle = '#000'; g.fillRect(0, 0, sw, sh); }
      if (lv.backLayer) g.drawImage(lv.backLayer, cx, cy, sw, sh, 0, 0, sw, sh);
      if (def.drawBack) def.drawBack(g, W, cx, cy);
      bg.drawImage(scr, cx, cy);
    }
    bg.drawImage(lv.layer, 0, 0);
    for (const a of lv.anim) { const img = GG.TILE[a.frames[0]]; if (img) bg.drawImage(img, a.x, a.y); }
    bg.drawImage(lv.fgLayer, 0, 0);
    const pick = (types: string[]) => W.ents.filter((e: any) => types.includes(e.type)).map((e: any) => ({ x: Math.round(e.x + (e.w || 16) / 2), y: Math.round(e.y + (e.h || 16)) }));
    return {
      png: big.toDataURL('image/png'), w: lv.pw, h: lv.ph,
      checks: pick(['checkpoint']), goals: pick(['goal', 'npcgoal', 'prize', 'couch', 'greenlight']),
      start: { x: Math.round(lv.start.x + 8), y: Math.round(lv.start.y + 16) },
    };
  }, i);
  const key = stages[i].key;
  fs.writeFileSync(path.join(outDir, `stage-${key}.png`), Buffer.from(r.png.split(',')[1], 'base64'));
  maps[key] = { w: r.w, h: r.h, checks: r.checks, goals: r.goals, start: r.start };
}

/* -------------------------------------------------------------- report */
const esc = (s: unknown) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const fmt = (n: number, d = 1) => (Number.isFinite(n) ? n.toFixed(d).replace(/\.0+$/, '') : '—');
const CAUSE_COLORS = ['#d62728', '#1f77b4', '#ff7f0e', '#2ca02c', '#9467bd', '#8c564b', '#e377c2', '#17becf', '#bcbd22', '#7f7f7f'];
const allDeaths = sessions.flatMap((s) => s.runs.flatMap((r) => r.deaths.map((d) => ({ ...d, stage: r.stage, player: s.player }))));
const allHurts = sessions.flatMap((s) => s.runs.flatMap((r) => r.hurts.map((d) => ({ ...d, stage: r.stage, player: s.player }))));
const causeCount = new Map<string, number>();
for (const d of allDeaths) causeCount.set(d.cause || '?', (causeCount.get(d.cause || '?') || 0) + 1);
const causes = [...causeCount.entries()].sort((a, b) => b[1] - a[1]);
const causeColor = (c: string) => CAUSE_COLORS[Math.max(0, causes.findIndex(([k]) => k === c)) % CAUSE_COLORS.length];
const SHAPES = ['circle', 'square', 'triangle', 'diamond', 'cross', 'star'];
const shapeOf = (player: string) => SHAPES[players.indexOf(player) % SHAPES.length];
function marker(shape: string, x: number, y: number, r: number, fill: string, title: string) {
  const t = `<title>${esc(title)}</title>`;
  const st = `fill="${fill}" stroke="#fff" stroke-width="1.5"`;
  switch (shape) {
    case 'square': return `<rect x="${x - r}" y="${y - r}" width="${2 * r}" height="${2 * r}" ${st}>${t}</rect>`;
    case 'triangle': return `<polygon points="${x},${y - r - 1} ${x + r + 1},${y + r} ${x - r - 1},${y + r}" ${st}>${t}</polygon>`;
    case 'diamond': return `<polygon points="${x},${y - r - 1} ${x + r + 1},${y} ${x},${y + r + 1} ${x - r - 1},${y}" ${st}>${t}</polygon>`;
    case 'cross': return `<path d="M${x - r} ${y - r}L${x + r} ${y + r}M${x + r} ${y - r}L${x - r} ${y + r}" stroke="${fill}" stroke-width="4">${t}</path>`;
    case 'star': return `<polygon points="${[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((k) => { const a = (k * Math.PI) / 5 - Math.PI / 2, rr = k % 2 ? r * 0.5 : r + 1; return `${(x + Math.cos(a) * rr).toFixed(1)},${(y + Math.sin(a) * rr).toFixed(1)}`; }).join(' ')}" ${st}>${t}</polygon>`;
    default: return `<circle cx="${x}" cy="${y}" r="${r}" ${st}>${t}</circle>`;
  }
}

/* Deaths count 1 and hurts a third, in 16px cells, blurred over the neighbours. */
function density(stage: string, w: number, h: number) {
  const cw = Math.ceil(w / 16), ch = Math.ceil(h / 16);
  const raw = new Float32Array(cw * ch), out = new Float32Array(cw * ch);
  const add = (x: number, y: number, v: number) => {
    const cx = Math.min(cw - 1, Math.max(0, Math.floor(x / 16))), cy = Math.min(ch - 1, Math.max(0, Math.floor((y - 1) / 16)));
    raw[cy * cw + cx] += v;
  };
  for (const d of allDeaths) if (d.stage === stage) add(d.x, d.y, 1);
  for (const d of allHurts) if (d.stage === stage) add(d.x, d.y, 1 / 3);
  for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
    let s = 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const nx = x + dx, ny = y + dy;
      if (nx >= 0 && ny >= 0 && nx < cw && ny < ch) s += raw[ny * cw + nx] * (dx || dy ? 0.5 : 1);
    }
    out[y * cw + x] = s;
  }
  return { cw, ch, out };
}

/* The densest places to die: deaths within two tiles of each other, merged. */
function hotspots() {
  const spots: { stage: string; tx: number; ty: number; n: number; players: Set<string>; causes: Map<string, number> }[] = [];
  for (const d of allDeaths) {
    const tx = Math.floor(d.x / 16), ty = Math.floor((d.y - 1) / 16);
    let s = spots.find((p) => p.stage === d.stage && Math.abs(p.tx - tx) <= 2 && Math.abs(p.ty - ty) <= 2);
    if (!s) { s = { stage: d.stage, tx, ty, n: 0, players: new Set(), causes: new Map() }; spots.push(s); }
    s.n++; s.players.add(d.player); s.causes.set(d.cause || '?', (s.causes.get(d.cause || '?') || 0) + 1);
  }
  return spots.sort((a, b) => b.n - a.n || b.players.size - a.players.size).slice(0, 12);
}

const rows = stages.map((st) => {
  const per = players.map((p) => playerStage(p, st.key)).filter((x) => x.started);
  const cleared = per.filter((x) => x.cleared);
  const t = targets[st.key];
  const medDeaths = median(per.map((x) => x.deaths));
  const medMinutes = median(cleared.map((x) => x.minutes));
  const clearRate = per.length ? cleared.length / per.length : NaN;
  const flags: string[] = [];
  if (t && per.length) {
    if (medDeaths > t.deaths[1]) flags.push('harder than intended');
    if (medDeaths < t.deaths[0]) flags.push('easier than intended');
    if (cleared.length && medMinutes > t.minutes[1]) flags.push('slower than intended');
    if (cleared.length && medMinutes < t.minutes[0]) flags.push('quicker than intended');
    if (clearRate < t.clearRate) flags.push(`only ${Math.round(clearRate * 100)}% cleared it`);
  }
  return { ...st, per, cleared: cleared.length, started: per.length, medDeaths, medMinutes, clearRate, quits: per.reduce((n, x) => n + x.quits, 0), target: t, flags };
});

/* A target band per stage and the observed median, as an SVG chart. */
function curve(title: string, unit: string, get: (r: (typeof rows)[number]) => number, band: (t: Target) => [number, number], each: (x: PlayerStage) => number | null) {
  const W = 760, H = 250, L = 44, R = 12, T = 16, B = 36;
  const vals = rows.flatMap((r) => [get(r), ...(r.target ? band(r.target) : []), ...r.per.map(each).filter((v): v is number => v !== null)]).filter(Number.isFinite);
  // A round top for the axis, in steps of 1, 2 or 5.
  const raw = Math.max(1, ...vals) * 1.05;
  const step = [1, 2, 5, 10, 20, 50].find((k) => raw / k <= 5) || 100;
  const max = Math.ceil(raw / step) * step;
  const xOf = (i: number) => L + ((i + 0.5) * (W - L - R)) / rows.length;
  const yOf = (v: number) => T + (H - T - B) * (1 - v / max);
  const bw = ((W - L - R) / rows.length) * 0.6;
  let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(title)}" class="chart">`;
  for (let v = 0; v <= max + 1e-9; v += step) {
    const y = yOf(v);
    s += `<line x1="${L}" x2="${W - R}" y1="${y}" y2="${y}" class="grid"/><text x="${L - 6}" y="${y + 4}" class="tick" text-anchor="end">${fmt(v)}</text>`;
  }
  rows.forEach((r, i) => {
    if (r.target) { const [a, b] = band(r.target); s += `<rect x="${xOf(i) - bw / 2}" y="${yOf(b)}" width="${bw}" height="${Math.max(2, yOf(a) - yOf(b))}" class="band"><title>${esc(`${r.key} target ${a}–${b} ${unit}`)}</title></rect>`; }
    for (const x of r.per) { const v = each(x); if (v !== null && Number.isFinite(v)) s += `<circle cx="${xOf(i) + ((players.indexOf(x.player) % 5) - 2) * 3}" cy="${yOf(v)}" r="2.5" class="dot"><title>${esc(`${x.player}: ${fmt(v)} ${unit}`)}</title></circle>`; }
    s += `<text x="${xOf(i)}" y="${H - 14}" class="tick" text-anchor="middle">${esc(r.key)}</text>`;
  });
  const pts = rows.map((r, i) => (Number.isFinite(get(r)) ? `${xOf(i)},${yOf(get(r))}` : null)).filter(Boolean);
  s += `<polyline points="${pts.join(' ')}" class="line"/>`;
  rows.forEach((r, i) => {
    const v = get(r);
    if (!Number.isFinite(v)) return;
    const out = r.target && (v < band(r.target)[0] || v > band(r.target)[1]);
    s += `<circle cx="${xOf(i)}" cy="${yOf(v)}" r="4" class="${out ? 'med miss' : 'med'}"><title>${esc(`${r.key} median ${fmt(v)} ${unit}`)}</title></circle>`;
  });
  s += `<text x="${W - R}" y="${H - 1}" class="tick" text-anchor="end">stage</text></svg>`;
  return `<figure><figcaption>${esc(title)}</figcaption>${s}<p class="legend"><span class="sw band"></span> target band <span class="sw med"></span> median player <span class="sw miss"></span> outside the band <span class="sw dot"></span> each player</p></figure>`;
}

function stageMap(r: (typeof rows)[number]) {
  const m = maps[r.key];
  const { cw, ch, out } = density(r.key, m.w, m.h);
  const peak = Math.max(0.0001, ...out);
  let shade = '';
  for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
    const v = out[y * cw + x];
    if (v > 0.05) shade += `<rect x="${x * 16}" y="${y * 16}" width="16" height="16" fill="#ff2000" fill-opacity="${(0.15 + 0.5 * (v / peak)).toFixed(2)}"/>`;
  }
  let marks = '';
  for (const c of m.checks) marks += `<g class="flag"><rect x="${c.x - 1}" y="${c.y - 30}" width="2" height="30" fill="#fff"/><rect x="${c.x + 1}" y="${c.y - 30}" width="10" height="7" fill="#00a800"/><title>checkpoint</title></g>`;
  for (const g2 of m.goals) marks += `<g><rect x="${g2.x - 1}" y="${g2.y - 34}" width="2" height="34" fill="#fff"/><rect x="${g2.x + 1}" y="${g2.y - 34}" width="10" height="7" fill="#f8b800"/><title>goal</title></g>`;
  marks += `<circle cx="${m.start.x}" cy="${m.start.y - 8}" r="5" fill="none" stroke="#fff" stroke-width="2"><title>start</title></circle>`;
  for (const d of allHurts) if (d.stage === r.key) marks += `<circle cx="${d.x}" cy="${Math.max(8, Math.min(m.h - 6, d.y - 8))}" r="2" fill="#fff" fill-opacity=".8"><title>${esc(`${d.player}: hurt by ${d.cause}`)}</title></circle>`;
  // A fall off the bottom of the map is drawn just inside it.
  const my = (y: number) => Math.max(8, Math.min(m.h - 6, y - 8));
  for (const d of allDeaths) if (d.stage === r.key) marks += marker(shapeOf(d.player), d.x, my(d.y), 5, causeColor(d.cause || '?'), `${d.player}: ${d.cause} at tile ${Math.floor(d.x / 16)},${Math.floor((d.y - 1) / 16)}, ${fmt(d.t / 3600, 2)} min in`);
  const scale = 1;
  return `<div class="map" style="width:${m.w * scale}px"><img src="stage-${esc(r.key)}.png" width="${m.w * scale}" height="${m.h * scale}" alt="Map of stage ${esc(r.key)}"><svg viewBox="0 0 ${m.w} ${m.h}" width="${m.w * scale}" height="${m.h * scale}">${shade}${marks}</svg></div>`;
}

const stageCauses = (key: string) => {
  const m = new Map<string, number>();
  for (const d of allDeaths) if (d.stage === key) m.set(d.cause || '?', (m.get(d.cause || '?') || 0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
};

const answers = sessions.flatMap((s) => s.answers.map((a) => ({ ...a, player: s.player })));
const KEYWORDS: Record<string, string[]> = {
  '1': ['buchanan', 'daisy', 'tom', 'lawn', 'east egg', 'couch', 'chapter 1', 'first', 'beginning', 'start'],
  '2-1': ['ash', 'valley', 'wilson', 'garage', 'myrtle', 'train', 'chapter 2'],
  '2-2': ['eckleburg', 'eyes', 'billboard', 'advertisement', 'oculist', 'glasses'],
  '3': ['party', 'parties', 'rumor', 'rumour', 'owl', 'library', 'jordan', 'chapter 3'],
  '4-1': ['car', 'drive', 'bridge', 'queensboro', 'city', 'new york', 'cop', 'police', 'hearse', 'chapter 4'],
  '4-2': ['wolfshiem', 'wolfsheim', 'world series', 'baseball', 'cellar', 'lunch', 'gonnegtion'],
  '5': ['shirt', 'reunion', 'tea', 'klipspringer', 'house tour', 'chapter 5'],
  '6': ['jimmy', 'gatz', 'cody', 'lake', 'superior', 'yacht', 'resolves', 'schedule', 'youth', 'kid', 'young', 'chapter 6'],
  '7': ['plaza', 'hotel', 'tom', 'fight', 'confront', 'heat', 'hot', 'chapter 7'],
  '8': ['war', 'argonne', 'army', 'major', 'medal', 'battle', 'trench', 'chapter 8'],
  '9': ['green light', 'boat', 'current', 'ending', 'end', 'dock', 'past', 'chapter 9'],
};
const recognized = (stage: string, a: string) => (KEYWORDS[stage] || []).some((k) => a.toLowerCase().includes(k));

const spots = hotspots();
const summary = {
  generated: new Date().toISOString(), files: files.map((f) => path.basename(f)), players,
  stages: rows.map((r) => ({ key: r.key, started: r.started, cleared: r.cleared, medianDeaths: r.medDeaths, medianMinutes: r.medMinutes, clearRate: r.clearRate, quits: r.quits, flags: r.flags, causes: stageCauses(r.key) })),
  hotspots: spots.map((s) => ({ stage: s.stage, tile: [s.tx, s.ty], deaths: s.n, players: s.players.size, causes: [...s.causes.entries()] })),
  answers,
};
fs.writeFileSync(path.join(outDir, 'summary.json'), JSON.stringify(summary, null, 2) + '\n');

const missed = rows.filter((r) => r.flags.length);
const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>GATSBY.EXE playtest report</title>
<style>
:root { --bg: #fbfaf7; --fg: #1d1c1a; --muted: #6b6760; --line: #dcd8cf; --card: #fff; --band: #cfe3cf; --med: #1d1c1a; --miss: #c0392b; --gold: #9a6b00; }
@media (prefers-color-scheme: dark) { :root { --bg: #151413; --fg: #ece8e1; --muted: #a39e95; --line: #3a3733; --card: #1e1d1b; --band: #2c4a2c; --med: #ece8e1; --miss: #ff6b5b; --gold: #f8b800; } }
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--fg); font: 15px/1.5 system-ui, -apple-system, Segoe UI, sans-serif; }
main { max-width: 1100px; margin: 0 auto; padding: 24px 16px 64px; }
h1 { font-size: 26px; margin: 0 0 4px; } h2 { font-size: 20px; margin: 36px 0 8px; border-top: 1px solid var(--line); padding-top: 20px; } h3 { margin: 0 0 6px; font-size: 17px; }
.muted { color: var(--muted); }
a { color: var(--gold); }
table { border-collapse: collapse; width: 100%; font-variant-numeric: tabular-nums; }
th, td { text-align: left; padding: 5px 8px; border-bottom: 1px solid var(--line); vertical-align: top; }
th { font-weight: 600; font-size: 13px; color: var(--muted); }
td.n, th.n { text-align: right; }
.miss { color: var(--miss); font-weight: 600; }
.ok { color: var(--muted); }
.table-wrap { overflow-x: auto; }
.chart { width: 100%; height: auto; display: block; }
.chart .grid { stroke: var(--line); } .chart .tick { fill: var(--muted); font-size: 11px; }
.chart .band { fill: var(--band); } .chart .line { fill: none; stroke: var(--med); stroke-width: 1.5; }
.chart .med { fill: var(--med); } .chart .med.miss { fill: var(--miss); } .chart .dot { fill: var(--muted); fill-opacity: .6; }
figure { margin: 12px 0 20px; } figcaption { font-weight: 600; margin-bottom: 4px; }
.legend { font-size: 13px; color: var(--muted); margin: 4px 0 0; }
.sw { display: inline-block; width: 12px; height: 12px; vertical-align: -1px; margin: 0 4px 0 10px; border-radius: 2px; }
.sw.band { background: var(--band); } .sw.med { background: var(--med); border-radius: 50%; } .sw.miss { background: var(--miss); border-radius: 50%; } .sw.dot { background: var(--muted); border-radius: 50%; opacity: .6; }
.stage { background: var(--card); border: 1px solid var(--line); border-radius: 8px; padding: 14px; margin: 16px 0; }
.scroll { overflow: auto; max-height: 560px; width: fit-content; max-width: 100%; border: 1px solid var(--line); border-radius: 4px; background: #000; }
td.nw { white-space: nowrap; }
.map { position: relative; } .map img { display: block; image-rendering: pixelated; } .map svg { position: absolute; inset: 0; }
.chips span { display: inline-block; margin: 2px 6px 2px 0; font-size: 13px; }
.chips i { display: inline-block; width: 10px; height: 10px; border-radius: 50%; margin-right: 4px; vertical-align: -1px; }
code { font-size: 13px; }
</style></head><body><main>
<h1>GATSBY.EXE playtest report</h1>
<p class="muted">${players.length} player${players.length === 1 ? '' : 's'} (${esc(players.join(', '))}), ${sessions.length} session${sessions.length === 1 ? '' : 's'}, ${allDeaths.length} deaths, from ${files.length} file${files.length === 1 ? '' : 's'}. Generated ${esc(new Date().toISOString().slice(0, 16).replace('T', ' '))} UTC.</p>
<p>${missed.length ? `<span class="miss">${missed.length} of ${rows.length} stages miss their targets:</span> ${missed.map((r) => `${esc(r.key)} (${esc(r.flags.join(', '))})`).join('; ')}.` : 'Every stage that was played lands inside its targets.'} Targets are in <code>scripts/gatsby/playtest-targets.json</code>.</p>

<h2>Difficulty curve</h2>
${curve('Deaths before first clearing each stage', 'deaths', (r) => r.medDeaths, (t) => t.deaths, (x) => x.deaths)}
${curve('Minutes to clear each stage (all attempts)', 'minutes', (r) => r.medMinutes, (t) => t.minutes, (x) => (x.cleared ? x.minutes : null))}

<h2>Stages against targets</h2>
<div class="table-wrap"><table>
<thead><tr><th>Stage</th><th class="n">Started</th><th class="n">Cleared</th><th class="n">Median deaths</th><th>Target</th><th class="n">Median minutes</th><th>Target</th><th class="n">Quits</th><th>Verdict</th></tr></thead>
<tbody>${rows.map((r) => `<tr><td><a href="#stage-${esc(r.key)}">${esc(r.key)}</a> ${esc(r.name)}</td><td class="n">${r.started}</td><td class="n">${r.cleared}</td><td class="n">${fmt(r.medDeaths)}</td><td class="nw">${r.target ? r.target.deaths.join('–') : '—'}</td><td class="n">${fmt(r.medMinutes)}</td><td class="nw">${r.target ? r.target.minutes.join('–') : '—'}</td><td class="n">${r.quits}</td><td class="${r.flags.length ? 'miss' : 'ok'}">${r.started ? esc(r.flags.join(', ') || 'on target') : 'not played'}</td></tr>`).join('')}</tbody>
</table></div>

<h2>What killed players</h2>
<p class="chips">${causes.map(([c, n]) => `<span><i style="background:${causeColor(c)}"></i>${esc(c)} ${n}</span>`).join('')}</p>
<h3>Worst spots</h3>
<div class="table-wrap"><table><thead><tr><th>Stage</th><th>Tile (x, y)</th><th class="n">Deaths</th><th class="n">Players</th><th>Causes</th></tr></thead>
<tbody>${spots.map((s) => `<tr><td><a href="#stage-${esc(s.stage)}">${esc(s.stage)}</a></td><td>${s.tx}, ${s.ty}</td><td class="n">${s.n}</td><td class="n">${s.players.size}</td><td>${esc([...s.causes.entries()].map(([c, n]) => `${c} ${n}`).join(', '))}</td></tr>`).join('') || '<tr><td colspan="5">No deaths.</td></tr>'}</tbody></table></div>

${answers.length ? `<h2>Recognition (blind mode)</h2>
<p class="muted">After each stage, blind players were asked which part of the novel it was, without cutscenes or chapter names. "Keyword" is a rough automatic match; read the answers.</p>
<div class="table-wrap"><table><thead><tr><th>Stage</th><th>Player</th><th>Answer</th><th>Keyword</th></tr></thead>
<tbody>${answers.map((a) => { const st = stages.find((s) => s.key === a.stage); return `<tr><td>${esc(a.stage)} ${esc(st ? st.name : '')}</td><td>${esc(a.player)}</td><td>${esc(a.answer)}</td><td>${recognized(a.stage, a.answer) ? 'yes' : '—'}</td></tr>`; }).join('')}</tbody></table></div>` : ''}

<h2>Stage by stage</h2>
<p class="muted">Deaths are marked by cause (colour) and player (shape: ${players.map((p) => `${esc(p)} ${shapeOf(p)}`).join(', ')}); small white dots are hurts; red shading is where they bunch up. Hover a mark for details. Flags: green checkpoints, gold goal, the white ring is the start.</p>
${rows.map((r) => `<section class="stage" id="stage-${esc(r.key)}">
<h3>${esc(r.key)} · Chapter ${esc(r.chapter)}: ${esc(r.name)} <span class="${r.flags.length ? 'miss' : 'ok'}">${r.started ? esc(r.flags.join(', ') || 'on target') : 'not played'}</span></h3>
${r.target ? `<p class="muted">Intended: ${r.target.deaths.join('–')} deaths, ${r.target.minutes.join('–')} minutes. ${esc(r.target.why)}</p>` : ''}
<div class="scroll">${stageMap(r)}</div>
<div class="table-wrap"><table><thead><tr><th>Player</th><th class="n">Runs</th><th class="n">Deaths</th><th class="n">Minutes</th><th>Cleared</th><th class="n">Quits</th></tr></thead>
<tbody>${r.per.map((x) => `<tr><td>${esc(x.player)}</td><td class="n">${x.runs}</td><td class="n">${x.deaths}</td><td class="n">${fmt(x.minutes, 2)}</td><td>${x.cleared ? 'yes' : 'no'}</td><td class="n">${x.quits}</td></tr>`).join('') || '<tr><td colspan="6">Nobody played it.</td></tr>'}</tbody></table></div>
<p class="chips">${stageCauses(r.key).map(([c, n]) => `<span><i style="background:${causeColor(c)}"></i>${esc(c)} ${n}</span>`).join('') || '<span class="muted">No deaths.</span>'}</p>
</section>`).join('\n')}
</main></body></html>
`;
fs.writeFileSync(path.join(outDir, 'report.html'), html);
if (gp.errors.length) console.warn(gp.errors.join('\n'));
await gp.close();
console.log(`wrote ${path.join(outDir, 'report.html')}`);
for (const r of rows) console.log(`  ${r.key.padEnd(4)} started ${r.started}, cleared ${r.cleared}, median deaths ${fmt(r.medDeaths)}, median minutes ${fmt(r.medMinutes)}${r.flags.length ? '  <- ' + r.flags.join(', ') : ''}`);
