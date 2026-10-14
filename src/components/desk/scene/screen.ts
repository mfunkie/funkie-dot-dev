import { CanvasTexture, LinearFilter, SRGBColorSpace } from 'three'
import { createRandom, dosText } from './textures'

export type ScreenMode =
  | { kind: 'screensaver' }
  | { kind: 'prompt' }
  | { kind: 'reading'; label: string }
  | { kind: 'boot' }
  | { kind: 'off' }

const W = 320
const H = 240

interface Star {
  x: number
  y: number
  z: number
}

/**
 * What the CRT shows while you're at the desk: the Windows 3.1-era starfield
 * screensaver, a log-in prompt when you hover the computer, and a disk read
 * when you pick a floppy.
 */
export class CrtScreen {
  readonly texture: CanvasTexture
  private ctx: CanvasRenderingContext2D
  private stars: Star[] = []
  private mode: ScreenMode = { kind: 'screensaver' }
  private modeStarted = 0
  private rand = createRandom(99)
  /** 0..1, used to tint the room with the screen's light. */
  brightness = 0.35

  constructor() {
    const canvas = document.createElement('canvas')
    canvas.width = W
    canvas.height = H
    this.ctx = canvas.getContext('2d')!
    this.texture = new CanvasTexture(canvas)
    this.texture.colorSpace = SRGBColorSpace
    this.texture.minFilter = LinearFilter
    this.texture.magFilter = LinearFilter
    this.texture.generateMipmaps = false
    for (let i = 0; i < 90; i++) this.stars.push(this.spawnStar(true))
  }

  setMode(mode: ScreenMode, now: number) {
    this.mode = mode
    this.modeStarted = now
  }

  getMode() {
    return this.mode
  }

  private spawnStar(anywhere = false): Star {
    return {
      x: (this.rand() - 0.5) * 2,
      y: (this.rand() - 0.5) * 2,
      z: anywhere ? 0.1 + this.rand() * 0.9 : 1,
    }
  }

  update(now: number, dt: number) {
    const ctx = this.ctx
    const t = (now - this.modeStarted) / 1000
    switch (this.mode.kind) {
      case 'off':
        ctx.fillStyle = '#060608'
        ctx.fillRect(0, 0, W, H)
        this.brightness = 0
        break
      case 'screensaver':
        this.drawStarfield(dt)
        this.brightness = 0.35
        break
      case 'prompt':
        this.drawPrompt(now)
        this.brightness = 0.85
        break
      case 'reading':
        this.drawReading(this.mode.label, t, now)
        this.brightness = 0.6
        break
      case 'boot':
        ctx.fillStyle = '#000'
        ctx.fillRect(0, 0, W, H)
        this.brightness = 0.15
        break
    }
    this.drawGlass()
    this.texture.needsUpdate = true
  }

  private drawStarfield(dt: number) {
    const ctx = this.ctx
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, W, H)
    const speed = Math.min(dt, 0.05) * 0.35
    for (const star of this.stars) {
      star.z -= speed
      if (star.z <= 0.02) Object.assign(star, this.spawnStar())
      const sx = W / 2 + (star.x / star.z) * W * 0.25
      const sy = H / 2 + (star.y / star.z) * H * 0.25
      if (sx < 0 || sx >= W || sy < 0 || sy >= H) {
        Object.assign(star, this.spawnStar())
        continue
      }
      const size = star.z < 0.25 ? 3 : star.z < 0.5 ? 2 : 1
      const b = Math.floor(255 * Math.min(1, 1.2 - star.z))
      ctx.fillStyle = `rgb(${b},${b},${b})`
      ctx.fillRect(Math.floor(sx), Math.floor(sy), size, size)
    }
  }

  private drawPrompt(now: number) {
    const ctx = this.ctx
    ctx.fillStyle = '#0000aa'
    ctx.fillRect(0, 0, W, H)
    ctx.fillStyle = '#aaaaaa'
    ctx.fillRect(0, 0, W, 16)
    dosText(ctx, ' FUNKIE-DOS', 0, 0, '#000')
    const bx = 40
    const by = 70
    ctx.fillStyle = '#000'
    ctx.fillRect(bx + 8, by + 8, 240, 96)
    ctx.fillStyle = '#00aaaa'
    ctx.fillRect(bx, by, 240, 96)
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 2
    ctx.strokeRect(bx + 5, by + 6, 230, 84)
    dosText(ctx, 'Welcome back.', bx + 68, by + 22, '#ffffff')
    dosText(ctx, 'Press ENTER to log in', bx + 36, by + 46, '#000')
    if (Math.floor(now / 500) % 2 === 0) {
      ctx.fillStyle = '#ffff55'
      ctx.fillRect(bx + 116, by + 68, 8, 3)
    }
  }

  private drawReading(label: string, t: number, now: number) {
    const ctx = this.ctx
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, W, H)
    dosText(ctx, 'C:\\> A:', 8, 16, '#aaaaaa')
    if (t > 0.25) dosText(ctx, `A:\\> TYPE ${label}.TXT`, 8, 36, '#aaaaaa')
    if (t > 0.55) {
      const dots = '.'.repeat(Math.min(12, Math.floor((t - 0.55) * 14)))
      dosText(ctx, `Reading drive A ${dots}`, 8, 56, '#55ff55')
    }
    if (Math.floor(now / 400) % 2 === 0) {
      ctx.fillStyle = '#aaaaaa'
      ctx.fillRect(8, 90, 8, 3)
    }
  }

  private drawGlass() {
    const ctx = this.ctx
    // Scanlines.
    ctx.fillStyle = 'rgba(0, 0, 0, 0.22)'
    for (let y = 0; y < H; y += 3) ctx.fillRect(0, y, W, 1)
    // Curved-glass falloff and a soft reflection of the window.
    const vignette = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.85)
    vignette.addColorStop(0, 'rgba(0,0,0,0)')
    vignette.addColorStop(1, 'rgba(0,0,0,0.6)')
    ctx.fillStyle = vignette
    ctx.fillRect(0, 0, W, H)
    const glare = ctx.createLinearGradient(0, 0, W, H)
    glare.addColorStop(0, 'rgba(150, 170, 255, 0.10)')
    glare.addColorStop(0.35, 'rgba(150, 170, 255, 0)')
    ctx.fillStyle = glare
    ctx.fillRect(0, 0, W, H)
  }
}
