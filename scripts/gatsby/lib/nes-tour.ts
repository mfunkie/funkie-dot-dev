/*
 * In-page helpers shared by the NES tools: walk a stage with the real game
 * (hero teleported along it, kept alive) and record what gets drawn.
 * Everything here runs inside the page via page.evaluate.
 */
import type { Page } from 'playwright';

export type Hist = [number, number][];   // [NES code, pixel count]

/* Installs window.__nes helpers in the page (idempotent). */
export async function installTour(page: Page): Promise<void> {
  await page.evaluate(() => {
    const w = globalThis as unknown as { __nes?: unknown; GG: any };
    if (w.__nes) return;
    const GG = w.GG;
    const N = GG.nes;
    const SW = GG.W, SH = GG.H;

    /* Histograms per cell of RGBA layers (top layer wins), cells at origin -ox,-oy. */
    function cellHists(datas: (Uint8ClampedArray | null)[], wd: number, ht: number, cell: number, ox = 0, oy = 0) {
      const out: { x: number; y: number; h: [number, number][] }[] = [];
      for (let cy = -oy; cy < ht; cy += cell) for (let cx = -ox; cx < wd; cx += cell) {
        const m = new Map<number, number>();
        for (let y = Math.max(0, cy); y < Math.min(ht, cy + cell); y++) for (let x = Math.max(0, cx); x < Math.min(wd, cx + cell); x++) {
          const i = (y * wd + x) * 4;
          for (let l = datas.length - 1; l >= 0; l--) {
            const d = datas[l];
            if (!d || d[i + 3] < 128) continue;
            const c = N.codeOf(d[i], d[i + 1], d[i + 2]);
            m.set(c, (m.get(c) || 0) + 1);
            break;
          }
        }
        if (m.size) out.push({ x: cx, y: cy, h: [...m] });
      }
      return out;
    }
    const data = (c: HTMLCanvasElement | null) => (c && c.width && c.height ? c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data : null);

    /*
     * Records every sprite draw (screen rect, set, frame, flip, canvas) while
     * fn runs; particles drawn with GG.rect during the play loop are recorded
     * as 1-tile sprites when `parts` is on.
     */
    const draws: any[] = [];
    let recording = false;
    const origSprite = GG.drawSprite;
    GG.drawSprite = (g: any, name: string, frame: string, x: number, y: number, flipX: boolean, alpha?: number) => {
      if (recording) {
        const s = GG.SPR[name] && GG.SPR[name][frame];
        if (s) draws.push({ name, frame, flip: !!flipX, x: Math.round(x + (flipX ? -s.ox : s.ox)), y: Math.round(y + s.oy), w: s.w, h: s.h, c: flipX ? s.f : s.c });
      }
      return origSprite(g, name, frame, x, y, flipX, alpha);
    };
    function record(fn: () => void) {
      draws.length = 0; recording = true;
      try { fn(); } finally { recording = false; }
      return draws.slice();
    }

    /* Keep the hero alive and walk him along the stage, calling `each` at samples. */
    function tour(index: number, each: (W: any, phase: string) => void, opt: { step?: number; settle?: number; arena?: number } = {}) {
      const D = GG._dbg;
      let W = D.startStage(index);
      const lv = W.lv;
      const stepPx = opt.step || 64, settle = opt.settle || 24;
      const keep = () => {
        W = D.W();
        W.invuln = Math.max(W.invuln, 2);
        if (W.dying) { W.dying = 0; W.hearts = W.maxHearts; }
        if (W.hearts <= 0) W.hearts = W.maxHearts;
      };
      const free = (x: number, y: number) => {
        const h = W.hero;
        for (let yy = y; yy > 0; yy -= 16) {
          let solid = false;
          for (let ty = Math.floor(yy / 16); ty <= Math.floor((yy + h.h - 1) / 16); ty++) for (let tx = Math.floor(x / 16); tx <= Math.floor((x + h.w - 1) / 16); tx++) if (GG.isSolid(GG.kindAt(lv, tx, ty))) solid = true;
          if (!solid) return yy;
        }
        return y;
      };
      const arenaAt = (GG.MAPINFO && GG.MAPINFO[W.def.key] && GG.MAPINFO[W.def.key].arena) || null;
      if (W.autoscroll) {
        for (let f = 0; f < 6000 && !D.W().done; f++) {
          keep();
          const h = W.hero;
          if (h.x < W.cam.x + 40) h.x = W.cam.x + 120;
          D.step(1);
          if (f % 12 === 0) each(D.W(), 'ride');
        }
        return;
      }
      for (let x = Math.max(0, W.hero.x - 32); x < lv.pw - 8; x += stepPx) {
        keep();
        const h = W.hero;
        h.x = x; h.y = free(x, h.y); h.vx = 0; h.vy = 0;
        for (let f = 0; f < settle; f++) { keep(); D.step(1); if (D.W().done || D.W() !== W) break; }
        if (D.W() !== W || W.done) break;
        each(W, 'walk');
        if (arenaAt && Math.abs(x / 16 - arenaAt) < stepPx / 16 + 1) {
          for (let f = 0; f < (opt.arena || 900); f++) { keep(); D.step(1); if (f % 30 === 0) each(D.W(), 'arena'); if (D.W().done) break; }
        }
      }
    }
    w.__nes = { cellHists, data, record, tour, draws, SW, SH };
  });
}
