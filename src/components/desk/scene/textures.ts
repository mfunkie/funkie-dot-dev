import {
  CanvasTexture,
  NearestFilter,
  NearestMipmapLinearFilter,
  RepeatWrapping,
  SRGBColorSpace,
} from 'three'

export const DOS_FONT = '"Funkie DOS", "Courier New", monospace'

/** Deterministic noise so the room looks the same on every visit. */
export function createRandom(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

type Draw = (ctx: CanvasRenderingContext2D, w: number, h: number) => void

export function canvasTexture(
  w: number,
  h: number,
  draw: Draw,
  options: { repeat?: [number, number]; mipmaps?: boolean } = {},
) {
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  ctx.imageSmoothingEnabled = false
  draw(ctx, w, h)
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.magFilter = NearestFilter
  texture.minFilter =
    options.mipmaps === false ? NearestFilter : NearestMipmapLinearFilter
  texture.generateMipmaps = options.mipmaps !== false
  if (options.repeat) {
    texture.wrapS = texture.wrapT = RepeatWrapping
    texture.repeat.set(...options.repeat)
  }
  return texture
}

/** Bitmap text at the font's native 16px cell, so it stays crisp. */
export function dosText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  color: string,
  scale = 1,
) {
  ctx.save()
  ctx.fillStyle = color
  ctx.font = `${16 * scale}px ${DOS_FONT}`
  ctx.textBaseline = 'top'
  ctx.fillText(text, Math.round(x), Math.round(y))
  ctx.restore()
}

function speckle(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  colors: string[],
  density: number,
  seed: number,
) {
  const rand = createRandom(seed)
  const count = Math.floor(w * h * density)
  for (let i = 0; i < count; i++) {
    ctx.fillStyle = colors[Math.floor(rand() * colors.length)]
    ctx.fillRect(Math.floor(rand() * w), Math.floor(rand() * h), 1, 1)
  }
}

export function woodTexture() {
  return canvasTexture(
    128,
    128,
    (ctx, w, h) => {
      const rand = createRandom(7)
      ctx.fillStyle = '#6b4128'
      ctx.fillRect(0, 0, w, h)
      for (let y = 0; y < h; y++) {
        const wave = Math.sin(y * 0.21) * 0.5 + Math.sin(y * 0.047) * 0.5
        const shade = Math.floor(18 * wave)
        ctx.fillStyle = `rgb(${107 + shade}, ${65 + shade * 0.7}, ${40 + shade * 0.4})`
        ctx.fillRect(0, y, w, 1)
        if (rand() > 0.82) {
          ctx.fillStyle = 'rgba(48, 26, 14, 0.5)'
          ctx.fillRect(Math.floor(rand() * w), y, 12 + rand() * 50, 1)
        }
      }
      speckle(ctx, w, h, ['#5a3420', '#7a4c30'], 0.05, 3)
    },
    { repeat: [3, 1] },
  )
}

export function plasticTexture(base: string, seed = 11) {
  return canvasTexture(64, 64, (ctx, w, h) => {
    ctx.fillStyle = base
    ctx.fillRect(0, 0, w, h)
    speckle(ctx, w, h, ['rgba(0,0,0,0.06)', 'rgba(255,255,255,0.06)'], 0.4, seed)
  })
}

export function wallpaperTexture() {
  return canvasTexture(
    64,
    64,
    (ctx, w, h) => {
      ctx.fillStyle = '#4b5d63'
      ctx.fillRect(0, 0, w, h)
      // Faint pinstripe and a tiny diamond, 1990s rental-apartment style.
      ctx.fillStyle = '#55686e'
      for (let x = 0; x < w; x += 16) ctx.fillRect(x, 0, 2, h)
      ctx.fillStyle = '#3f5055'
      for (let y = 8; y < h; y += 32) {
        for (let x = 8; x < w; x += 16) {
          ctx.fillRect(x, y - 1, 1, 3)
          ctx.fillRect(x - 1, y, 3, 1)
        }
      }
    },
    { repeat: [8, 4] },
  )
}

export function carpetTexture() {
  return canvasTexture(
    64,
    64,
    (ctx, w, h) => {
      ctx.fillStyle = '#2b2d3d'
      ctx.fillRect(0, 0, w, h)
      speckle(ctx, w, h, ['#23243a', '#36384b', '#3b2d3d'], 0.5, 5)
    },
    { repeat: [10, 10] },
  )
}

export function skyTexture() {
  return canvasTexture(
    512,
    256,
    (ctx, w, h) => {
      const rand = createRandom(42)
      const grad = ctx.createLinearGradient(0, 0, 0, h)
      grad.addColorStop(0, '#040714')
      grad.addColorStop(0.55, '#121a44')
      grad.addColorStop(0.8, '#2a2a5e')
      grad.addColorStop(1, '#3a2d5a')
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, w, h)

      for (let i = 0; i < 260; i++) {
        const x = Math.floor(rand() * w)
        const y = Math.floor(rand() * h * 0.7)
        const b = 140 + Math.floor(rand() * 115)
        ctx.fillStyle = `rgb(${b}, ${b}, ${Math.min(255, b + 30)})`
        ctx.fillRect(x, y, rand() > 0.94 ? 2 : 1, 1)
      }

      // Crescent moon.
      ctx.fillStyle = '#f4efd2'
      ctx.beginPath()
      ctx.arc(330, 56, 18, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#081030'
      ctx.beginPath()
      ctx.arc(338, 50, 16, 0, Math.PI * 2)
      ctx.fill()

      // Hills with a few houses still awake.
      ctx.fillStyle = '#0a0d22'
      ctx.beginPath()
      ctx.moveTo(0, h)
      for (let x = 0; x <= w; x += 8) {
        const y = h * 0.74 + Math.sin(x * 0.012) * 14 + Math.sin(x * 0.041) * 5
        ctx.lineTo(x, y)
      }
      ctx.lineTo(w, h)
      ctx.fill()
      for (let i = 0; i < 70; i++) {
        const x = Math.floor(rand() * w)
        const y = Math.floor(h * 0.8 + rand() * h * 0.18)
        ctx.fillStyle = rand() > 0.3 ? '#ffc66b' : '#9fd3ff'
        ctx.fillRect(x, y, 1, 1)
      }

      // Two palms, because this desk is in California.
      const palm = (x: number, height: number, lean: number) => {
        ctx.strokeStyle = '#05060f'
        ctx.fillStyle = '#05060f'
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.moveTo(x, h)
        ctx.quadraticCurveTo(x + lean * 0.4, h - height * 0.5, x + lean, h - height)
        ctx.stroke()
        const cx = x + lean
        const cy = h - height
        ctx.lineWidth = 2
        for (let i = 0; i < 7; i++) {
          const angle = -Math.PI + (i / 6) * Math.PI
          ctx.beginPath()
          ctx.moveTo(cx, cy)
          ctx.quadraticCurveTo(
            cx + Math.cos(angle) * 22,
            cy + Math.sin(angle) * 14 - 6,
            cx + Math.cos(angle) * 34,
            cy + Math.sin(angle) * 6 + 10,
          )
          ctx.stroke()
        }
      }
      palm(120, 150, 14)
      palm(150, 118, -10)
      palm(430, 132, 8)
    },
    { mipmaps: false },
  )
}

export function corkboardTexture() {
  return canvasTexture(256, 160, (ctx, w, h) => {
    ctx.fillStyle = '#a77a4a'
    ctx.fillRect(0, 0, w, h)
    speckle(ctx, w, h, ['#8c6038', '#c1915d', '#6f4a2a'], 0.45, 9)
    ctx.strokeStyle = '#5a3d22'
    ctx.lineWidth = 8
    ctx.strokeRect(0, 0, w, h)

    // A screenplay page, because that's the day job.
    ctx.save()
    ctx.translate(30, 18)
    ctx.rotate(-0.04)
    ctx.fillStyle = '#efeadc'
    ctx.fillRect(0, 0, 92, 120)
    dosText(ctx, 'FADE IN:', 6, 6, '#222')
    ctx.fillStyle = '#555'
    const lines = [22, 30, 46, 54, 62, 78, 86, 102]
    lines.forEach((y, i) => {
      const indent = i % 3 === 1 ? 26 : 6
      ctx.fillRect(indent, y + 8, 80 - indent - (i % 2) * 14, 2)
    })
    ctx.fillStyle = '#c33'
    ctx.beginPath()
    ctx.arc(46, 2, 3, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()

    // Index cards.
    const card = (x: number, y: number, r: number, color: string) => {
      ctx.save()
      ctx.translate(x, y)
      ctx.rotate(r)
      ctx.fillStyle = color
      ctx.fillRect(0, 0, 58, 38)
      ctx.fillStyle = 'rgba(80, 90, 160, 0.6)'
      for (let ly = 10; ly < 36; ly += 6) ctx.fillRect(4, ly, 50, 1)
      ctx.fillStyle = '#2b5fd9'
      ctx.beginPath()
      ctx.arc(29, 3, 3, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }
    card(140, 20, 0.06, '#f6f0c8')
    card(178, 76, -0.05, '#cfe6f0')
    card(132, 98, 0.03, '#f4d2d8')
  })
}

export function floppyLabelTexture(body: string, ink: string) {
  // The disks stand in a stepped holder, so the label strip is on top where
  // it peeks out, and the metal shutter sits at the bottom. The company name
  // is drawn crisply on top of this by the scene.
  return canvasTexture(
    96,
    100,
    (ctx, w, h) => {
      ctx.fillStyle = body
      ctx.fillRect(0, 0, w, h)
      // Label.
      ctx.fillStyle = '#f2efe4'
      ctx.fillRect(6, 3, 84, 56)
      ctx.fillStyle = ink
      ctx.fillRect(6, 3, 84, 4)
      ctx.fillStyle = '#b7c4e6'
      for (let y = 32; y < 57; y += 6) ctx.fillRect(9, y, 78, 1)
      // Shutter with its window.
      ctx.fillStyle = '#a9adb5'
      ctx.fillRect(22, 66, 46, 34)
      ctx.fillStyle = '#c9ccd2'
      ctx.fillRect(22, 66, 46, 2)
      ctx.fillStyle = '#5e626b'
      ctx.fillRect(48, 72, 10, 22)
      // Write-protect tab.
      ctx.fillStyle = 'rgba(0,0,0,0.4)'
      ctx.fillRect(4, 88, 7, 7)
    },
    { mipmaps: true },
  )
}

export function stickyNoteTexture() {
  return canvasTexture(64, 64, (ctx, w, h) => {
    ctx.fillStyle = '#f7e36b'
    ctx.fillRect(0, 0, w, h)
    ctx.fillStyle = '#e5cf4f'
    ctx.fillRect(0, 0, w, 6)
    dosText(ctx, 'funkie', 8, 16, '#24306b')
    dosText(ctx, '.dev', 16, 34, '#24306b')
  })
}

export function mousepadTexture() {
  // Memphis-ish confetti, mandatory for any 1990s mousepad.
  return canvasTexture(128, 112, (ctx, w, h) => {
    const rand = createRandom(21)
    ctx.fillStyle = '#1e2a6e'
    ctx.fillRect(0, 0, w, h)
    const colors = ['#ff4fa3', '#21d4c4', '#ffd23f', '#ffffff']
    for (let i = 0; i < 26; i++) {
      ctx.fillStyle = colors[i % colors.length]
      const x = rand() * w
      const y = rand() * h
      if (i % 3 === 0) {
        ctx.beginPath()
        ctx.moveTo(x, y)
        ctx.lineTo(x + 8, y + 3)
        ctx.lineTo(x + 2, y + 9)
        ctx.fill()
      } else if (i % 3 === 1) {
        ctx.fillRect(x, y, 3, 3)
      } else {
        ctx.strokeStyle = ctx.fillStyle
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(x, y)
        for (let k = 1; k < 4; k++) ctx.lineTo(x + k * 4, y + (k % 2 ? 4 : 0))
        ctx.stroke()
      }
    }
  })
}

export function speakerTexture() {
  return canvasTexture(48, 80, (ctx, w, h) => {
    ctx.fillStyle = '#cbc2a8'
    ctx.fillRect(0, 0, w, h)
    ctx.fillStyle = '#2a2724'
    for (let y = 8; y < 56; y += 4) {
      for (let x = 8; x < w - 6; x += 4) ctx.fillRect(x, y, 2, 2)
    }
    ctx.fillStyle = '#3a8f3a'
    ctx.fillRect(22, 66, 4, 3)
  })
}

export function pcFrontTexture() {
  return canvasTexture(256, 80, (ctx, w, h) => {
    ctx.fillStyle = '#cfc6ad'
    ctx.fillRect(0, 0, w, h)
    speckle(ctx, w, h, ['rgba(0,0,0,0.05)', 'rgba(255,255,255,0.06)'], 0.3, 4)
    // Vent slots.
    ctx.fillStyle = '#9b937c'
    for (let x = 14; x < 100; x += 6) ctx.fillRect(x, 16, 3, 44)
    // Badge.
    ctx.fillStyle = '#2b2b33'
    ctx.fillRect(14, 64, 46, 10)
    dosText(ctx, '486DX2', 13, 61, '#d8d2c0', 0.75)
    // 5.25" bay blank and 3.5" drive.
    ctx.fillStyle = '#c2b99f'
    ctx.fillRect(122, 10, 118, 26)
    ctx.fillStyle = '#b3aa90'
    ctx.fillRect(122, 34, 118, 2)
    ctx.fillStyle = '#bdb49a'
    ctx.fillRect(150, 44, 90, 24)
    ctx.fillStyle = '#1b1a1f'
    ctx.fillRect(160, 52, 64, 5)
    ctx.fillStyle = '#7f7966'
    ctx.fillRect(228, 58, 8, 6)
    // Power switch.
    ctx.fillStyle = '#8b8470'
    ctx.fillRect(108, 54, 14, 14)
  })
}

export function bezelTexture() {
  // Front of the monitor. The dark recess frames the curved screen mesh.
  return canvasTexture(200, 170, (ctx, w, h) => {
    ctx.fillStyle = '#d3cab1'
    ctx.fillRect(0, 0, w, h)
    speckle(ctx, w, h, ['rgba(0,0,0,0.05)', 'rgba(255,255,255,0.07)'], 0.3, 8)
    ctx.fillStyle = '#b9b097'
    ctx.fillRect(14, 10, 172, 134)
    ctx.fillStyle = '#16151a'
    ctx.fillRect(18, 14, 164, 126)
    // Brand and controls along the chin.
    dosText(ctx, 'FUNKIE', 18, 148, '#6f6956')
    ctx.fillStyle = '#a49c84'
    for (let i = 0; i < 3; i++) ctx.fillRect(120 + i * 12, 152, 8, 6)
    ctx.fillStyle = '#9a927a'
    ctx.fillRect(164, 150, 14, 10)
  })
}

export function catTexture() {
  return canvasTexture(64, 64, (ctx, w, h) => {
    ctx.fillStyle = '#d9772c'
    ctx.fillRect(0, 0, w, h)
    ctx.fillStyle = '#a9521b'
    for (let x = 2; x < w; x += 9) {
      ctx.fillRect(x, 0, 3, h * 0.7)
    }
    ctx.fillStyle = '#f2c79a'
    ctx.fillRect(0, h * 0.78, w, h * 0.22)
    speckle(ctx, w, h, ['rgba(255,220,170,0.25)'], 0.15, 2)
  })
}

export function catFaceTexture() {
  // Features are centred on u = 0.25, which SphereGeometry points at +z.
  return canvasTexture(64, 32, (ctx, w, h) => {
    ctx.fillStyle = '#d9772c'
    ctx.fillRect(0, 0, w, h)
    // Tabby "M" on the forehead and stripes over the crown.
    ctx.fillStyle = '#a9521b'
    ctx.fillRect(12, 4, 2, 6)
    ctx.fillRect(15, 2, 2, 7)
    ctx.fillRect(18, 4, 2, 6)
    for (let x = 26; x < w; x += 8) ctx.fillRect(x, 0, 3, 12)
    // Closed eyes (open eyes are separate meshes on top).
    ctx.fillStyle = '#3b1f0f'
    ctx.fillRect(9, 15, 5, 1)
    ctx.fillRect(18, 15, 5, 1)
    // Cheeks and chin.
    ctx.fillStyle = '#f2c79a'
    ctx.fillRect(9, 19, 14, 8)
  })
}
