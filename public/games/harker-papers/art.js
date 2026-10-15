'use strict';
/* Shared drawing helpers. Every scene is an 800x500 SVG. */
const A = (() => {
  const rng = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const defs = (extra = '') => `<defs>
    <radialGradient id="candleG"><stop offset="0" stop-color="#ffcf7a" stop-opacity=".55"/><stop offset=".4" stop-color="#e3a84f" stop-opacity=".18"/><stop offset="1" stop-color="#e3a84f" stop-opacity="0"/></radialGradient>
    <radialGradient id="moonG"><stop offset="0" stop-color="#f3ecd8" stop-opacity=".5"/><stop offset=".35" stop-color="#c9cfe0" stop-opacity=".12"/><stop offset="1" stop-color="#c9cfe0" stop-opacity="0"/></radialGradient>
    <radialGradient id="vig" cx=".5" cy=".5" r=".75"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".75"/></radialGradient>
    <radialGradient id="redEye"><stop offset="0" stop-color="#ff4a3d"/><stop offset=".5" stop-color="#c0141c" stop-opacity=".6"/><stop offset="1" stop-color="#c0141c" stop-opacity="0"/></radialGradient>
    <filter id="blur6"><feGaussianBlur stdDeviation="6"/></filter>
    <filter id="blur2"><feGaussianBlur stdDeviation="2"/></filter>
    <pattern id="stone" width="80" height="40" patternUnits="userSpaceOnUse"><rect width="80" height="40" fill="#1d2029"/><path d="M0 0H80M0 20H80M0 40H80M40 0V20M0 20V40M80 20V40" stroke="#12141a" stroke-width="2"/><path d="M6 6h20M50 26h18" stroke="#262a35" stroke-width="1.5"/></pattern>
    <pattern id="boards" width="120" height="30" patternUnits="userSpaceOnUse"><rect width="120" height="30" fill="#24170f"/><path d="M0 0H120M70 0V30" stroke="#160d08" stroke-width="2"/><path d="M8 14h40" stroke="#2e1f15" stroke-width="1"/></pattern>
    <pattern id="paperP" width="200" height="200" patternUnits="userSpaceOnUse"><rect width="200" height="200" fill="#4a3b2a"/><path d="M0 50H200M0 100H200M0 150H200" stroke="#3c2f21" stroke-width="1"/></pattern>
    ${extra}</defs>`;
  const sky = (top, bot, id = 'sky') => `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="${bot}"/></linearGradient></defs><rect width="800" height="500" fill="url(#${id})"/>`;
  const vignette = () => `<rect width="800" height="500" fill="url(#vig)" pointer-events="none"/>`;
  const moon = (x, y, r = 26, phase = 0) => `<circle cx="${x}" cy="${y}" r="${r * 5}" fill="url(#moonG)"/><circle cx="${x}" cy="${y}" r="${r}" fill="#efe8d4"/>${phase ? `<circle cx="${x + phase}" cy="${y - 3}" r="${r}" fill="#141827" opacity=".92"/>` : `<circle cx="${x - r * .3}" cy="${y - r * .2}" r="${r * .22}" fill="#d9d0b8"/><circle cx="${x + r * .35}" cy="${y + r * .3}" r="${r * .15}" fill="#d9d0b8"/>`}`;
  const stars = (n, seed = 7, maxY = 260) => { const r = rng(seed); let s = ''; for (let i = 0; i < n; i++) s += `<circle cx="${(r() * 800).toFixed(1)}" cy="${(r() * maxY).toFixed(1)}" r="${(r() * 1.2 + .3).toFixed(2)}" fill="#e8e4d8" opacity="${(r() * .6 + .2).toFixed(2)}"/>`; return s; };
  const fog = (y, op = .35, color = '#8f98ad') => `<g filter="url(#blur6)" opacity="${op}"><ellipse cx="160" cy="${y}" rx="260" ry="26" fill="${color}"/><ellipse cx="520" cy="${y + 10}" rx="300" ry="30" fill="${color}"/><ellipse cx="760" cy="${y - 6}" rx="160" ry="20" fill="${color}"/></g>`;
  const candle = (x, y, s = 1, lit = true) => `<g transform="translate(${x} ${y}) scale(${s})">${lit ? `<circle r="70" cy="-30" fill="url(#candleG)"/>` : ''}<rect x="-6" y="-26" width="12" height="30" rx="2" fill="#e6dcc0"/><rect x="-11" y="2" width="22" height="5" rx="2" fill="#6d5a3c"/>${lit ? `<path d="M0 -44 C 5 -36 5 -30 0 -27 C -5 -30 -5 -36 0 -44Z" fill="#ffd27a"/><path d="M0 -38 C 2 -34 2 -31 0 -29 C -2 -31 -2 -34 0 -38Z" fill="#fff4cf"/>` : '<path d="M0 -26v-6" stroke="#333" stroke-width="1.5"/>'}</g>`;
  const grave = (x, y, s = 1, kind = 'round', fill = '#2a2e3a') => {
    const k = kind === 'cross' ? `<path d="M-6 -70h12v18h18v12h-18v40h-12v-40h-18v-12h18z" fill="${fill}"/>` :
      kind === 'slab' ? `<path d="M-22 0v-46h44v46z" fill="${fill}"/>` : `<path d="M-20 0v-40a20 20 0 0 1 40 0v40z" fill="${fill}"/><path d="M-10 -32h20M-12 -24h24M-8 -16h16" stroke="#1a1d26" stroke-width="2"/>`;
    return `<g transform="translate(${x} ${y}) scale(${s})">${k}</g>`;
  };
  const person = (x, y, s = 1, fill = '#0e1018', o = {}) => {
    const dress = o.dress ? `<path d="M-14 -70 C -20 -40 -30 -10 -34 0 H34 C30 -10 20 -40 14 -70Z" fill="${fill}"/>` : `<path d="M-14 -72 L-16 -30 L-12 0 H-3 L0 -34 L3 0 H12 L16 -30 L14 -72Z" fill="${fill}"/>`;
    const hat = o.hat ? `<path d="M-12 -104h24v-14h-24zM-17 -104h34v3h-34z" fill="${fill}"/>` : '';
    const hair = o.hair ? `<path d="M-11 -96 C -16 -80 -14 -70 -8 -66 L8 -66 C 14 -70 16 -80 11 -96Z" fill="${o.hair}"/>` : '';
    const face = o.face ? `<ellipse cx="0" cy="-90" rx="8.5" ry="10.5" fill="${o.face}"/>` : `<ellipse cx="0" cy="-90" rx="9" ry="11" fill="${fill}"/>`;
    return `<g transform="translate(${x} ${y}) scale(${s})">${hair}<path d="M-18 -74 C -18 -80 -8 -80 0 -80 C 8 -80 18 -80 18 -74 L 16 -46 L-16 -46Z" fill="${fill}"/>${dress}${face}${hat}${o.extra || ''}</g>`;
  };
  const count = (x, y, s = 1, o = {}) => `<g transform="translate(${x} ${y}) scale(${s})">
      <path d="M0 -112 C -30 -100 -46 -40 -58 0 H58 C46 -40 30 -100 0 -112Z" fill="${o.fill || '#07080c'}"/>
      <path d="M-26 -98 L-44 -118 L-14 -100Z M26 -98 L44 -118 L14 -100Z" fill="${o.fill || '#07080c'}"/>
      <ellipse cx="0" cy="-116" rx="11" ry="14" fill="${o.face || '#c9c3b3'}"/>
      <path d="M-11 -122 C -6 -134 6 -134 11 -122 L 9 -128 C 4 -136 -4 -136 -9 -128Z" fill="#d8d4cc"/>
      <path d="M-5 -104 C -2 -101 2 -101 5 -104" stroke="#e8e2d8" stroke-width="2" fill="none"/>
      <circle cx="-4.5" cy="-118" r="${o.eyes ? 6 : 1.6}" fill="${o.eyes ? 'url(#redEye)' : '#3a0808'}"/><circle cx="4.5" cy="-118" r="${o.eyes ? 6 : 1.6}" fill="${o.eyes ? 'url(#redEye)' : '#3a0808'}"/>
      ${o.blood ? '<path d="M-4 -106 q4 3 8 0 v4 q-4 3 -8 0z" fill="#8a0f15"/>' : ''}</g>`;
  const eyes = (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})"><circle cx="-8" r="9" fill="url(#redEye)"/><circle cx="8" r="9" fill="url(#redEye)"/><circle cx="-8" r="2.4" fill="#ffd0c8"/><circle cx="8" r="2.4" fill="#ffd0c8"/></g>`;
  const castle = (x, y, s = 1, fill = '#080a10', lit = []) => {
    let w = ''; for (const [wx, wy] of lit) w += `<rect x="${wx}" y="${wy}" width="6" height="11" fill="#e3a84f"/>`;
    return `<g transform="translate(${x} ${y}) scale(${s})"><path d="M-160 0 V-90 h20 v-12 h12 v12 h16 v-12 h12 v12 h20 V-60 h40 V-150 l18 -34 l18 34 V-60 h20 V-120 h14 v-14 h10 v14 h12 v-14 h10 v14 h14 V-80 h40 v-10 h10 v10 h10 v-10 h10 v10 h12 V0Z" fill="${fill}"/>${w}</g>`;
  };
  const archWindow = (x, y, w, h, inner = '#1a2238', frame = '#0b0d12') => `<g><path d="M${x} ${y + h} V${y + w / 2} a${w / 2} ${w / 2} 0 0 1 ${w} 0 V${y + h}Z" fill="${inner}"/><path d="M${x} ${y + h} V${y + w / 2} a${w / 2} ${w / 2} 0 0 1 ${w} 0 V${y + h}Z M${x + w / 2} ${y} V${y + h} M${x} ${y + h * .55} H${x + w}" fill="none" stroke="${frame}" stroke-width="7"/></g>`;
  const wolf = (x, y, s = 1, fill = '#090a0f') => `<g transform="translate(${x} ${y}) scale(${s})"><path d="M-60 0 L-52 -30 C -40 -46 10 -48 30 -40 L44 -60 L50 -44 L62 -40 L70 -30 L56 -24 L50 -10 L48 0 H40 L38 -16 L0 -18 L-30 -14 L-34 0 H-42 L-46 -18 L-56 0Z" fill="${fill}"/><circle cx="58" cy="-36" r="2.4" fill="#ffcf60"/></g>`;
  const bat = (x, y, s = 1) => `<path transform="translate(${x} ${y}) scale(${s})" d="M0 0 C -6 -6 -14 -8 -22 -4 C -18 -2 -18 2 -20 4 C -14 2 -8 4 -4 6 L0 2 L4 6 C8 4 14 2 20 4 C18 2 18 -2 22 -4 C14 -8 6 -6 0 0Z" fill="#07080c"/>`;
  const box = (x, y, s = 1, o = {}) => `<g transform="translate(${x} ${y}) scale(${s})"><path d="M-50 0 L-40 -34 H40 L50 0Z" fill="${o.fill || '#3a2a1b'}"/><path d="M-50 0 H50 V24 H-50Z" fill="${o.side || '#2b1f14'}"/><path d="M-50 12 H50 M-20 0 V24 M20 0 V24" stroke="#1a120b" stroke-width="2"/>${o.cross ? '<path d="M-6 -30 h12 M0 -33 v8" stroke="#e8dcc0" stroke-width="2.5"/>' : ''}</g>`;
  const water = (y, color = '#121a2a', crest = '#3b4863', seed = 3) => { const r = rng(seed); let s = `<rect y="${y}" width="800" height="${500 - y}" fill="${color}"/>`; for (let i = 0; i < 26; i++) { const wx = r() * 800, wy = y + 8 + r() * (500 - y - 10), w = 20 + r() * 50; s += `<path d="M${wx} ${wy} q${w / 2} -5 ${w} 0" stroke="${crest}" stroke-width="1.6" fill="none" opacity="${(.3 + r() * .5).toFixed(2)}"/>`; } return s; };
  const rain = (seed = 9, n = 80, op = .35) => { const r = rng(seed); let s = `<g stroke="#9aa6c0" stroke-width="1" opacity="${op}">`; for (let i = 0; i < n; i++) { const x = r() * 840, y = r() * 500; s += `<path d="M${x} ${y} l-10 26"/>`; } return s + '</g>'; };
  const snow = (seed = 4, n = 90) => { const r = rng(seed); let s = '<g fill="#f2f4f8">'; for (let i = 0; i < n; i++) s += `<circle cx="${(r() * 800).toFixed(1)}" cy="${(r() * 500).toFixed(1)}" r="${(r() * 1.8 + .5).toFixed(2)}" opacity="${(r() * .6 + .3).toFixed(2)}"/>`; return s + '</g>'; };
  const svg = (...parts) => defs() + parts.join('') + vignette();
  return { rng, defs, sky, vignette, moon, stars, fog, candle, grave, person, count, eyes, castle, archWindow, wolf, bat, box, water, rain, snow, svg };
})();

/* ---------- items ---------- */
(() => {
  const I = G.item;
  const s = (d, f = '#e9dfc9') => `<path d="${d}" fill="${f}"/>`;
  I('crucifix', 'Crucifix', 'The golden crucifix the landlady at Bistritz hung about my neck "for your mother\'s sake." I did not then believe in such things.', s('M17 4h6v10h9v6h-9v16h-6V20H8v-6h9z', '#d9a94a'));
  I('razor', 'Shaving razor', 'My own razor. Without the glass, shaving here is a matter of feel.', `<path d="M6 26 L26 6 l6 6 -20 20z" fill="#c9cfd8"/><path d="M8 30 l-4 6 6 -2z" fill="#6b4a2b"/>`);
  I('shovel', 'Shovel', 'A shovel the Szgany left by the boxes, its edge caked with Transylvanian soil.', `<path d="M24 4 l4 4 -12 16 -4 -4z" fill="#7a5a36"/><path d="M8 22 l10 10 -6 6 c-6 0 -10 -4 -10 -10z" fill="#9ca3ad"/>`);
  I('gold', 'Gold coins', 'Roman, British, Austrian, Hungarian, Greek and Turkish gold, all of it at least three hundred years old.', `<circle cx="16" cy="22" r="10" fill="#c9952e"/><circle cx="24" cy="16" r="10" fill="#e3b14a"/><circle cx="24" cy="16" r="6" fill="none" stroke="#9c6f1c" stroke-width="1.5"/>`);
  I('log', 'Log of the Demeter', 'The captain\'s log, found in a bottle in his coat. The last entries are in a shaking hand.', `<rect x="7" y="6" width="26" height="30" rx="2" fill="#5a3d24"/><rect x="11" y="10" width="18" height="22" fill="#d8c9a6"/><path d="M13 15h14M13 19h14M13 23h10" stroke="#5a3d24" stroke-width="1.4"/>`);
  I('shawl', 'Heavy shawl', 'My warm woollen shawl, grey and thick.', `<path d="M4 10 h32 l-6 20 -10 6 -10 -6z" fill="#7c7f8c"/><path d="M8 14h24M10 20h20" stroke="#5d606b" stroke-width="2"/>`);
  I('shoes', 'My shoes', 'My own walking shoes. Lucy went out barefoot.', `<path d="M4 28 c4 -2 8 -10 10 -14 l6 2 c4 6 10 8 16 10 v6 H4z" fill="#3b2a1e"/>`);
  I('pin', 'Safety pin', 'A great safety pin, the kind for fastening a heavy wrap.', `<path d="M8 30 L30 8 a4 4 0 0 1 4 4 L12 34 a4 4 0 0 1 -4 -4z" fill="none" stroke="#c9cfd8" stroke-width="2.5"/><circle cx="10" cy="32" r="3" fill="none" stroke="#c9cfd8" stroke-width="2"/>`);
  I('garlic', 'Garlic flowers', 'A great bundle of white garlic flowers, sent by Van Helsing from Haarlem.', `<path d="M20 36 V18" stroke="#6f8c4a" stroke-width="2.5"/><circle cx="20" cy="14" r="6" fill="#f1efe6"/><circle cx="12" cy="18" r="5" fill="#f1efe6"/><circle cx="28" cy="18" r="5" fill="#f1efe6"/><circle cx="20" cy="8" r="4" fill="#f1efe6"/>`);
  I('wreath', 'Garlic wreath', 'Garlic flowers twisted into a chaplet, to be worn about the neck.', `<circle cx="20" cy="20" r="12" fill="none" stroke="#f1efe6" stroke-width="5" stroke-dasharray="4 2"/><circle cx="20" cy="20" r="12" fill="none" stroke="#6f8c4a" stroke-width="1"/>`);
  I('memo', 'Memorandum', 'The paper on which I have written everything that happened tonight.', `<path d="M8 4 h18 l6 6 v26 H8z" fill="#e3d8bf"/><path d="M12 14h16M12 19h16M12 24h12M12 29h14" stroke="#4a3f33" stroke-width="1.3"/>`);
  I('screwdriver', 'Turnscrew', 'Van Helsing\'s turnscrew, from his bag of instruments.', `<path d="M6 34 l14 -14" stroke="#7a5a36" stroke-width="6" stroke-linecap="round"/><path d="M20 20 l14 -14" stroke="#c9cfd8" stroke-width="3"/>`);
  I('saw', 'Fret-saw', 'A small fret-saw, fine enough to cut lead.', `<path d="M6 30 h22 v-18 h-22z" fill="none" stroke="#c9cfd8" stroke-width="2"/><path d="M6 30 l-2 6 h6z" fill="#7a5a36"/><path d="M8 28 h18" stroke="#8a919b" stroke-width="1" stroke-dasharray="2 1"/>`);
  I('candleI', 'Candle', 'A wax candle, lit. Van Helsing likes light when he works.', `<rect x="16" y="14" width="8" height="20" fill="#e6dcc0"/><path d="M20 4 c4 5 4 8 0 10 c-4 -2 -4 -5 0 -10z" fill="#ffd27a"/>`);
  I('stake', 'Stake', 'A round wooden stake, some two and a half or three inches thick and about three feet long, one end hardened in the fire.', `<path d="M6 34 L30 10 l4 -4 -2 6 -24 24z" fill="#9c7a50"/><path d="M30 10 l4 -4 -2 6z" fill="#3a2a1a"/>`);
  I('hammer', 'Mallet', 'A heavy mallet, the kind used in households for breaking coal.', `<rect x="18" y="16" width="5" height="22" fill="#7a5a36" transform="rotate(-30 20 26)"/><rect x="8" y="6" width="22" height="12" rx="2" fill="#5d636e" transform="rotate(-30 20 12)"/>`);
  I('host', 'Sacred Wafer', 'Consecrated Host, carried in an envelope. Van Helsing obtained an Indulgence for its use.', `<circle cx="20" cy="20" r="13" fill="#f2ecd9"/><path d="M20 12 v16 M13 18 h14" stroke="#c9b68a" stroke-width="2"/>`);
  I('whistle', 'Silver whistle', 'Lord Godalming\'s whistle. His terriers are waiting at the gate.', `<path d="M6 22 h18 a8 8 0 1 1 0 6 H6z" fill="#c9cfd8"/><circle cx="28" cy="25" r="3" fill="#5d636e"/>`);
  I('kukri', 'Kukri knife', 'Jonathan\'s great Kukri knife, curved and heavy.', `<path d="M6 32 c10 -4 22 -14 28 -26 c-2 12 -12 24 -24 30z" fill="#c9cfd8"/><path d="M6 32 l-3 4 6 0z" fill="#3b2a1e"/>`);
  I('bowie', 'Bowie knife', 'Quincey Morris\'s bowie knife from Texas.', `<path d="M8 32 L30 8 l4 2 -20 26z" fill="#c9cfd8"/><path d="M4 36 l6 -6 3 3 -6 6z" fill="#6b4a2b"/>`);
  I('rifle', 'Winchester rifle', 'A Winchester repeating rifle. Quincey insisted we each carry one.', `<path d="M2 26 L34 12 l2 4 -24 10 2 6 -6 2 -2 -6 -6 2z" fill="#6b4a2b"/><path d="M14 20 L36 10" stroke="#8a919b" stroke-width="2"/>`);
  I('map', 'Map of Moldavia', 'A map of the rivers of Moldavia and Transylvania, with Galatz marked.', `<path d="M4 8 l10 -3 12 3 10 -3 v28 l-10 3 -12 -3 -10 3z" fill="#d8c9a6"/><path d="M10 12 c6 6 4 12 14 16 c4 2 6 6 8 8" stroke="#4a6a8a" stroke-width="1.6" fill="none"/>`);
  I('deeds', 'Deeds and keys', 'Title deeds for houses at Mile End and Bermondsey, and a bunch of keys on a ring.', `<rect x="6" y="8" width="20" height="26" fill="#e3d8bf"/><circle cx="28" cy="26" r="6" fill="none" stroke="#c9952e" stroke-width="2.5"/><path d="M30 30 l4 6" stroke="#c9952e" stroke-width="2.5"/>`);
})();
