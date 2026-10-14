import {
  BoxGeometry,
  CatmullRomCurve3,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DirectionalLight,
  DoubleSide,
  Euler,
  Fog,
  Group,
  HemisphereLight,
  InstancedMesh,
  LatheGeometry,
  MathUtils,
  Matrix4,
  Mesh,
  Object3D,
  PCFShadowMap,
  PerspectiveCamera,
  PlaneGeometry,
  PointLight,
  Quaternion,
  Raycaster,
  Scene,
  Shape,
  ShapeGeometry,
  SphereGeometry,
  SpotLight,
  Sprite,
  SpriteMaterial,
  TorusGeometry,
  TubeGeometry,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three'
import type { Material, MeshLambertMaterial } from 'three'
import { Ps1Pipeline, lambert, unlit } from './ps1'
import { CrtScreen } from './screen'
import {
  bezelTexture,
  canvasTexture,
  carpetTexture,
  catFaceTexture,
  catTexture,
  corkboardTexture,
  dosText,
  floppyLabelTexture,
  mousepadTexture,
  pcFrontTexture,
  plasticTexture,
  skyTexture,
  speakerTexture,
  stickyNoteTexture,
  wallpaperTexture,
  woodTexture,
} from './textures'

export type DeskTarget =
  | { kind: 'computer' }
  | { kind: 'floppy'; jobId: string }
  | { kind: 'lamp' }
  | { kind: 'cat' }

export interface FloppySpec {
  jobId: string
  company: string
  /** Disk body color. */
  color: string
  /** Stripe along the top of the label. */
  ink: string
}

export interface DeskSceneOptions {
  canvas: HTMLCanvasElement
  floppies: readonly FloppySpec[]
  /**
   * Element (stacked over the canvas) that receives the crisp disk labels.
   * Each label gets `labelClassName`.
   */
  labelLayer?: HTMLElement
  labelClassName?: string
  /** Pixel coordinates are relative to the canvas' container. */
  onHover: (target: DeskTarget | null, point: { x: number; y: number } | null) => void
  onActivate: (target: DeskTarget) => void
}

export interface DeskScene {
  enterComputer(options: {
    jobId?: string
    instant: boolean
    onDiskInserted?: () => void
  }): Promise<void>
  leaveComputer(options: { instant: boolean }): Promise<void>
  setLamp(on: boolean): void
  pokeCat(): void
  /** Keyboard focus on an HUD button highlights the matching object. */
  setFocus(target: DeskTarget | null): void
  /** Screen-space position of an object, for tooltips. */
  project(target: DeskTarget): { x: number; y: number } | null
  setPaused(paused: boolean): void
  dispose(): void
}

const DESK_Y = 0.75
/** Roughly how many pixels the world renders at, PS1-sized. */
const PIXEL_BUDGET = 150_000
const SCREEN_CENTER = new Vector3(0, 1.086, -0.026)
const SCREEN_SIZE = { w: 0.3, h: 0.225 }
const SLOT = new Vector3(0.11, 0.791, 0)

const easeInOut = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3)

interface Tween {
  start: number
  duration: number
  ease: (t: number) => number
  update: (t: number) => void
  resolve: () => void
}

interface Pose {
  position: Vector3
  target: Vector3
  fov: number
}

interface Layout {
  tall: boolean
  camera: Pose
  /** Where the floppy stand sits. It always turns to face the camera. */
  floppyOrigin: Vector3
  /** Phones see the desk from further away, so the disks get bigger. */
  floppyScale: number
  showMouse: boolean
}

function layoutFor(aspect: number): Layout {
  if (aspect < 0.9) {
    // Phones: stand closer and look down so the monitor, cat and disks fill
    // the frame.
    const squeeze = MathUtils.clamp((0.9 - aspect) / 0.45, 0, 1)
    return {
      tall: true,
      camera: {
        position: new Vector3(0.09, 1.5 + squeeze * 0.1, 1.06 + squeeze * 0.18),
        target: new Vector3(0.09, 1.0 + squeeze * 0.08, -0.08),
        fov: 52 + squeeze * 10,
      },
      floppyOrigin: new Vector3(0.3, DESK_Y, 0.07),
      floppyScale: 1.35,
      showMouse: false,
    }
  }
  const wide = MathUtils.clamp((aspect - 1.2) / 1.0, 0, 1)
  return {
    tall: false,
    camera: {
      position: new Vector3(0.02, 1.36, 1.3 - wide * 0.12),
      target: new Vector3(0.02, 0.98, -0.12),
      fov: 44 - wide * 4,
    },
    floppyOrigin: new Vector3(0.63, DESK_Y, 0.05),
    floppyScale: 1.15,
    showMouse: true,
  }
}

function box(
  w: number,
  h: number,
  d: number,
  material: Material | Material[],
  position: [number, number, number],
) {
  const mesh = new Mesh(new BoxGeometry(w, h, d), material)
  mesh.position.set(...position)
  mesh.castShadow = true
  mesh.receiveShadow = true
  return mesh
}

/** A cylinder running from `a` to `b`. */
function segment(a: Vector3, b: Vector3, radius: number, material: Material) {
  const length = a.distanceTo(b)
  const mesh = new Mesh(new CylinderGeometry(radius, radius, length, 8), material)
  mesh.position.copy(a).add(b).multiplyScalar(0.5)
  mesh.quaternion.setFromUnitVectors(
    new Vector3(0, 1, 0),
    b.clone().sub(a).normalize(),
  )
  mesh.castShadow = true
  return mesh
}

/** Box whose back half shrinks, like the tube housing of a CRT. */
function taperedBox(backScale: number, backDrop: number) {
  const geometry = new BoxGeometry(1, 1, 1)
  const pos = geometry.attributes.position
  for (let i = 0; i < pos.count; i++) {
    if (pos.getZ(i) < 0) {
      pos.setX(i, pos.getX(i) * backScale)
      pos.setY(i, pos.getY(i) * backScale - backDrop)
    }
  }
  geometry.computeVertexNormals()
  return geometry
}

/**
 * CSS matrix3d that maps a `w` x `h` element onto a quad (top-left,
 * top-right, bottom-right, bottom-left), perspective included.
 */
function quadTransform(w: number, h: number, quad: ReadonlyArray<readonly [number, number]>) {
  const [[x0, y0], [x1, y1], [x2, y2], [x3, y3]] = quad
  const dx1 = x1 - x2
  const dx2 = x3 - x2
  const dx3 = x0 - x1 + x2 - x3
  const dy1 = y1 - y2
  const dy2 = y3 - y2
  const dy3 = y0 - y1 + y2 - y3
  const det = dx1 * dy2 - dx2 * dy1 || 1e-9
  const g = (dx3 * dy2 - dx2 * dy3) / det
  const k = (dx1 * dy3 - dx3 * dy1) / det
  const a = x1 - x0 + g * x1
  const b = x3 - x0 + k * x3
  const d = y1 - y0 + g * y1
  const e = y3 - y0 + k * y3
  const m = [a / w, d / w, 0, g / w, b / h, e / h, 0, k / h, 0, 0, 1, 0, x0, y0, 0, 1]
  return `matrix3d(${m.map((n) => n.toFixed(6)).join(',')})`
}

export function createDeskScene(options: DeskSceneOptions): DeskScene {
  const { canvas } = options
  const container = canvas.parentElement!

  const renderer = new WebGLRenderer({
    canvas,
    antialias: false,
    powerPreference: 'high-performance',
  })
  renderer.setPixelRatio(1)
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = PCFShadowMap
  const pipeline = new Ps1Pipeline(renderer)
  pipeline.exposure = 1.15

  const scene = new Scene()
  scene.background = new Color('#05070f')
  scene.fog = new Fog('#070a18', 3.2, 7)

  const camera = new PerspectiveCamera(42, 1, 0.02, 20)
  let layout = layoutFor(1.6)

  // ---------------------------------------------------------------- room
  const wallMaterial = lambert({ map: wallpaperTexture(), color: '#b9c6c9' })
  const wallShape = new Shape()
  wallShape.moveTo(-3, 0)
  wallShape.lineTo(3, 0)
  wallShape.lineTo(3, 3)
  wallShape.lineTo(-3, 3)
  wallShape.lineTo(-3, 0)
  const hole = new Shape()
  hole.moveTo(-0.62, 1.02)
  hole.lineTo(-0.62, 1.92)
  hole.lineTo(0.62, 1.92)
  hole.lineTo(0.62, 1.02)
  hole.lineTo(-0.62, 1.02)
  wallShape.holes.push(hole)
  const wall = new Mesh(new ShapeGeometry(wallShape), wallMaterial)
  wall.position.z = -0.6
  wall.castShadow = true
  wall.receiveShadow = true
  scene.add(wall)

  const floor = new Mesh(
    new PlaneGeometry(8, 8),
    lambert({ map: carpetTexture(), color: '#8088a0' }),
  )
  floor.rotation.x = -Math.PI / 2
  floor.receiveShadow = true
  scene.add(floor)

  // Window frame, sill and the night outside.
  const trim = lambert({ color: '#d9d4c4' })
  scene.add(box(1.32, 0.04, 0.14, trim, [0, 1.0, -0.56]))
  scene.add(box(1.3, 0.03, 0.1, trim, [0, 1.935, -0.6]))
  scene.add(box(0.04, 0.94, 0.1, trim, [-0.64, 1.47, -0.6]))
  scene.add(box(0.04, 0.94, 0.1, trim, [0.64, 1.47, -0.6]))
  scene.add(box(0.02, 0.9, 0.03, trim, [0, 1.47, -0.66]))

  const sky = new Mesh(
    new PlaneGeometry(9, 4.5),
    unlit({ map: skyTexture(), fog: false }),
  )
  sky.position.set(0.4, 1.7, -3.6)
  scene.add(sky)

  // Venetian blinds, tilted so the moon draws stripes across the desk.
  const blindMaterial = lambert({ color: '#c9ccd2' })
  const blinds = new Group()
  const slatAngle = 0.3
  for (let y = 1.06; y < 1.9; y += 0.068) {
    const slat = box(1.24, 0.005, 0.062, blindMaterial, [0, y, -0.52])
    slat.rotation.x = slatAngle
    blinds.add(slat)
  }
  blinds.add(box(1.28, 0.03, 0.07, blindMaterial, [0, 1.905, -0.52]))
  scene.add(blinds)

  // Corkboard and a shelf so the wall isn't empty.
  const cork = new Mesh(
    new PlaneGeometry(0.56, 0.35),
    lambert({ map: corkboardTexture() }),
  )
  cork.position.set(-1.0, 1.42, -0.595)
  cork.receiveShadow = true
  scene.add(cork)

  const shelfWood = lambert({ map: woodTexture(), color: '#9a8a7a' })
  scene.add(box(0.5, 0.025, 0.16, shelfWood, [0.98, 1.36, -0.52]))
  const bookColors = ['#6b2b2b', '#2b4d6b', '#c9a227', '#2e5e3f', '#5b3a6e', '#b85c2b', '#e0dccf']
  let bookX = 0.76
  bookColors.forEach((color, i) => {
    const w = 0.035 + (i % 3) * 0.008
    const h = 0.16 + ((i * 37) % 5) * 0.015
    const book = box(w, h, 0.12, lambert({ color }), [bookX + w / 2, 1.3725 + h / 2, -0.52])
    if (i === 6) book.rotation.z = -0.25
    scene.add(book)
    bookX += w + 0.004
  })

  // --------------------------------------------------------------- desk
  const deskWood = lambert({ map: woodTexture() })
  scene.add(box(1.9, 0.04, 0.86, deskWood, [0, DESK_Y - 0.02, -0.12]))
  scene.add(box(1.9, 0.08, 0.02, lambert({ color: '#4a2c1b' }), [0, DESK_Y - 0.08, 0.3]))

  // --------------------------------------------------------- computer
  const beige = plasticTexture('#d6cba9')
  const beigeMaterial = lambert({ map: beige })
  const computer = new Group()
  computer.userData.target = { kind: 'computer' } satisfies DeskTarget

  const caseMaterials = [
    beigeMaterial,
    beigeMaterial,
    beigeMaterial,
    beigeMaterial,
    lambert({ map: pcFrontTexture() }),
    beigeMaterial,
  ]
  computer.add(box(0.44, 0.13, 0.4, caseMaterials, [0, 0.815, -0.2]))

  const driveLedMaterial = unlit({ color: '#2a2a1a' })
  const driveLed = new Mesh(new BoxGeometry(0.012, 0.006, 0.004), driveLedMaterial)
  driveLed.position.set(0.176, 0.781, 0.001)
  computer.add(driveLed)

  const stand = new Mesh(new CylinderGeometry(0.11, 0.13, 0.02, 16), beigeMaterial)
  stand.position.set(0, 0.89, -0.2)
  stand.castShadow = true
  computer.add(stand)

  const bezelMaterials = [
    beigeMaterial,
    beigeMaterial,
    beigeMaterial,
    beigeMaterial,
    lambert({ map: bezelTexture() }),
    beigeMaterial,
  ]
  computer.add(box(0.4, 0.34, 0.06, bezelMaterials, [0, 1.07, -0.06]))

  const housing = new Mesh(taperedBox(0.68, 0.06), beigeMaterial)
  housing.scale.set(0.37, 0.32, 0.28)
  housing.position.set(0, 1.065, -0.23)
  housing.castShadow = true
  housing.receiveShadow = true
  computer.add(housing)

  const crt = new CrtScreen()
  const screenGeometry = new PlaneGeometry(SCREEN_SIZE.w, SCREEN_SIZE.h, 12, 9)
  {
    const pos = screenGeometry.attributes.position
    for (let i = 0; i < pos.count; i++) {
      const nx = pos.getX(i) / (SCREEN_SIZE.w / 2)
      const ny = pos.getY(i) / (SCREEN_SIZE.h / 2)
      pos.setZ(i, (1 - nx * nx * 0.6) * (1 - ny * ny * 0.6) * 0.012)
    }
    screenGeometry.computeVertexNormals()
  }
  const screenMaterial = unlit({ map: crt.texture })
  const screen = new Mesh(screenGeometry, screenMaterial)
  screen.position.copy(SCREEN_CENTER)
  screen.position.z -= 0.006
  computer.add(screen)

  const powerLed = new Mesh(
    new BoxGeometry(0.008, 0.008, 0.004),
    unlit({ color: '#39ff6a' }),
  )
  powerLed.position.set(0.168, 0.917, -0.029)
  computer.add(powerLed)

  const sticky = new Mesh(
    new PlaneGeometry(0.055, 0.055),
    lambert({ map: stickyNoteTexture() }),
  )
  sticky.position.set(-0.165, 1.205, -0.028)
  sticky.rotation.z = 0.12
  computer.add(sticky)

  scene.add(computer)

  const screenLight = new PointLight('#93a6ff', 0.25, 1.8, 2)
  screenLight.position.set(0, 1.0, 0.42)
  scene.add(screenLight)

  // Speaker.
  const speakerMaterials = [
    beigeMaterial,
    beigeMaterial,
    beigeMaterial,
    beigeMaterial,
    lambert({ map: speakerTexture() }),
    beigeMaterial,
  ]
  scene.add(box(0.09, 0.15, 0.1, speakerMaterials, [-0.3, DESK_Y + 0.075, -0.2]))

  // ---------------------------------------------------------- keyboard
  const keyboard = new Group()
  keyboard.position.set(0, DESK_Y + 0.015, 0.17)
  keyboard.rotation.x = 0.06
  keyboard.add(box(0.47, 0.03, 0.17, beigeMaterial, [0, 0, 0]))
  {
    const u = 0.0205
    const rows: Array<{ z: number; keys: number[]; x0: number }> = [
      { z: -0.062, x0: -0.215, keys: [1, -0.5, 1, 1, 1, 1, -0.5, 1, 1, 1, 1, -0.5, 1, 1, 1, 1] },
      { z: -0.036, x0: -0.215, keys: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2] },
      { z: -0.0155, x0: -0.215, keys: [1.5, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1.5] },
      { z: 0.005, x0: -0.215, keys: [1.75, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2.25] },
      { z: 0.0255, x0: -0.215, keys: [2.25, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2.75] },
      { z: 0.046, x0: -0.215, keys: [1.5, 1, 1.5, 7, 1.5, 1, 1.5] },
    ]
    for (let r = 1; r < 6; r++) rows.push({ z: rows[r].z, x0: 0.118, keys: [1, 1, 1, 1] })

    const keys: Array<{ x: number; z: number; w: number; dark: boolean }> = []
    rows.forEach((row, r) => {
      let x = row.x0
      row.keys.forEach((size) => {
        if (size < 0) {
          x += -size * u
          return
        }
        keys.push({ x: x + (size * u) / 2, z: row.z, w: size * u - 0.0025, dark: size !== 1 || r === 0 })
        x += size * u
      })
    })
    const keyMesh = new InstancedMesh(
      new BoxGeometry(1, 0.011, 0.018),
      lambert({ color: '#ffffff' }),
      keys.length,
    )
    const matrix = new Matrix4()
    const light = new Color('#dcd4bf')
    const dark = new Color('#a59d87')
    keys.forEach((key, i) => {
      matrix.makeScale(key.w, 1, 1)
      matrix.setPosition(key.x, 0.0195, key.z)
      keyMesh.setMatrixAt(i, matrix)
      keyMesh.setColorAt(i, key.dark ? dark : light)
    })
    keyMesh.castShadow = true
    keyMesh.receiveShadow = true
    keyboard.add(keyMesh)
  }
  scene.add(keyboard)

  // Mouse, pad and cord.
  const mouseGroup = new Group()
  const pad = new Mesh(
    new BoxGeometry(0.21, 0.003, 0.18),
    lambert({ map: mousepadTexture() }),
  )
  pad.position.set(0.4, DESK_Y + 0.0015, 0.17)
  pad.receiveShadow = true
  mouseGroup.add(pad)
  const mouse = new Mesh(new SphereGeometry(1, 12, 8), beigeMaterial)
  mouse.scale.set(0.03, 0.017, 0.05)
  mouse.position.set(0.41, DESK_Y + 0.01, 0.18)
  mouse.castShadow = true
  mouseGroup.add(mouse)
  const cord = new Mesh(
    new TubeGeometry(
      new CatmullRomCurve3([
        new Vector3(0.41, DESK_Y + 0.006, 0.13),
        new Vector3(0.39, DESK_Y + 0.003, 0.05),
        new Vector3(0.3, DESK_Y + 0.003, -0.02),
        new Vector3(0.24, DESK_Y + 0.02, -0.25),
      ]),
      24,
      0.003,
      4,
    ),
    lambert({ color: '#9c9480' }),
  )
  mouseGroup.add(cord)
  scene.add(mouseGroup)

  // -------------------------------------------------------------- lamp
  const lamp = new Group()
  lamp.userData.target = { kind: 'lamp' } satisfies DeskTarget
  const lampMetal = lambert({ color: '#2d3a3a' })
  const lampBase = new Mesh(new CylinderGeometry(0.065, 0.075, 0.025, 16), lampMetal)
  lampBase.position.set(-0.62, DESK_Y + 0.0125, -0.22)
  lampBase.castShadow = true
  lamp.add(lampBase)
  const elbow = new Vector3(-0.66, 1.2, -0.33)
  const head = new Vector3(-0.47, 1.17, -0.05)
  lamp.add(segment(new Vector3(-0.62, DESK_Y + 0.02, -0.22), elbow, 0.009, lampMetal))
  lamp.add(segment(elbow, head, 0.008, lampMetal))
  const aim = new Vector3(-0.3, DESK_Y, 0.08)
  const shadeMaterial = lambert({ color: '#2d3a3a', side: DoubleSide })
  const shade = new Mesh(new ConeGeometry(0.08, 0.12, 20, 1, true), shadeMaterial)
  shade.position.copy(head)
  shade.quaternion.setFromUnitVectors(
    new Vector3(0, -1, 0),
    aim.clone().sub(head).normalize(),
  )
  shade.translateY(-0.03)
  shade.castShadow = true
  lamp.add(shade)
  const bulbMaterial = unlit({ color: '#ffe2b0' })
  const bulb = new Mesh(new SphereGeometry(0.026, 10, 8), bulbMaterial)
  bulb.position.copy(head).lerp(aim, 0.13)
  lamp.add(bulb)
  scene.add(lamp)

  const lampLight = new SpotLight('#ffb56b', 2.6, 2.6, 0.95, 0.6, 2)
  lampLight.position.copy(head).lerp(aim, 0.1)
  lampLight.target.position.copy(aim)
  lampLight.castShadow = true
  lampLight.shadow.mapSize.set(512, 512)
  lampLight.shadow.bias = -0.002
  lampLight.shadow.normalBias = 0.01
  scene.add(lampLight, lampLight.target)
  // Warm spill from the hallway behind you, so the beige reads as beige.
  const roomFill = new PointLight('#ffb27a', 0.35, 3.5, 2)
  roomFill.position.set(-0.5, 1.5, 1.1)
  scene.add(roomFill)
  // Warm bounce so the wall behind the lamp isn't pitch black.
  const lampBounce = new PointLight('#ff9a52', 0.18, 1.8, 2)
  lampBounce.position.set(-0.55, 1.05, -0.3)
  scene.add(lampBounce)

  // --------------------------------------------------------------- mug
  const mugMaterial = lambert({ color: '#e9e4d8' })
  const mug = new Group()
  const mugBody = new Mesh(new CylinderGeometry(0.038, 0.035, 0.09, 14, 1, true), mugMaterial)
  mugBody.castShadow = true
  mug.add(mugBody)
  const coffee = new Mesh(new CylinderGeometry(0.035, 0.035, 0.002, 14), lambert({ color: '#2b160c' }))
  coffee.position.y = 0.03
  mug.add(coffee)
  const handle = new Mesh(new TorusGeometry(0.022, 0.006, 6, 12, Math.PI), mugMaterial)
  handle.rotation.z = -Math.PI / 2
  handle.position.x = 0.038
  mug.add(handle)
  const stripe = new Mesh(
    new CylinderGeometry(0.0385, 0.0375, 0.012, 14, 1, true),
    lambert({ color: '#c0392b' }),
  )
  stripe.position.y = 0.015
  mug.add(stripe)
  mug.position.set(-0.4, DESK_Y + 0.045, 0.13)
  mug.rotation.y = 0.5
  scene.add(mug)

  const steamTexture = canvasTexture(16, 16, (ctx) => {
    const glow = ctx.createRadialGradient(8, 8, 0, 8, 8, 8)
    glow.addColorStop(0, 'rgba(255,255,255,0.8)')
    glow.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = glow
    ctx.fillRect(0, 0, 16, 16)
  })
  const steam: Sprite[] = []
  for (let i = 0; i < 4; i++) {
    const puff = new Sprite(
      new SpriteMaterial({ map: steamTexture, transparent: true, opacity: 0, depthWrite: false }),
    )
    puff.scale.setScalar(0.03)
    puff.userData.phase = i / 4
    steam.push(puff)
    scene.add(puff)
  }

  // --------------------------------------------------------- lava lamp
  // Lights the disks and keeps the right side of the desk from going black.
  const lavaLamp = new Group()
  lavaLamp.position.set(0.9, DESK_Y, -0.36)
  const lavaMetal = lambert({ color: '#3a3440' })
  const lavaBase = new Mesh(new CylinderGeometry(0.03, 0.052, 0.085, 12), lavaMetal)
  lavaBase.position.y = 0.0425
  lavaBase.castShadow = true
  lavaLamp.add(lavaBase)
  const lavaCap = new Mesh(new CylinderGeometry(0.012, 0.024, 0.04, 12), lavaMetal)
  lavaCap.position.y = 0.3
  lavaLamp.add(lavaCap)
  const glassProfile = [
    [0.028, 0], [0.04, 0.05], [0.042, 0.09], [0.036, 0.15], [0.026, 0.2], [0.024, 0.2],
  ].map(([r, y]) => new Vector2(r, y))
  const glass = new Mesh(
    new LatheGeometry(glassProfile, 14),
    unlit({ color: '#ff5a2a', transparent: true, opacity: 0.78, depthWrite: false }),
  )
  glass.position.y = 0.083
  lavaLamp.add(glass)
  const blobMaterial = unlit({ color: '#ffd23f' })
  const blobs: Mesh[] = []
  for (let i = 0; i < 4; i++) {
    const blob = new Mesh(new SphereGeometry(0.014 + (i % 2) * 0.006, 8, 6), blobMaterial)
    blob.userData.phase = i * 1.7
    blob.userData.speed = 0.00018 + i * 0.00004
    blobs.push(blob)
    lavaLamp.add(blob)
  }
  scene.add(lavaLamp)
  const lavaLight = new PointLight('#ff6b3d', 0.5, 1.4, 2)
  lavaLight.position.set(0.86, DESK_Y + 0.18, -0.28)
  scene.add(lavaLight)

  // --------------------------------------------------------------- cat
  // Sleeping on the warm monitor, as cats did with every CRT ever made.
  const cat = new Group()
  cat.userData.target = { kind: 'cat' } satisfies DeskTarget
  const furMaterial = lambert({ map: catTexture() })
  const catBody = new Mesh(new SphereGeometry(1, 16, 12), furMaterial)
  catBody.scale.set(0.135, 0.06, 0.085)
  catBody.castShadow = true
  cat.add(catBody)
  const catHead = new Group()
  catHead.position.set(-0.11, 0.025, 0.045)
  const headMesh = new Mesh(new SphereGeometry(0.052, 14, 10), lambert({ map: catFaceTexture() }))
  headMesh.scale.set(1, 0.9, 0.95)
  headMesh.rotation.y = -0.5
  headMesh.castShadow = true
  catHead.add(headMesh)
  const earMaterial = lambert({ color: '#c96a24' })
  const ears: Mesh[] = []
  for (const side of [-1, 1]) {
    const ear = new Mesh(new ConeGeometry(0.018, 0.032, 4), earMaterial)
    ear.position.set(side * 0.026, 0.045, -0.004)
    ear.rotation.z = -side * 0.25
    ears.push(ear)
    catHead.add(ear)
  }
  cat.add(catHead)
  const tailMaterial = lambert({ map: catTexture() })
  const tail = new Mesh(new TubeGeometry(new CatmullRomCurve3([new Vector3(), new Vector3(0, -1, 0)]), 2, 0.01, 4), tailMaterial)
  tail.castShadow = true
  cat.add(tail)
  cat.position.set(0.02, 1.29, -0.13)
  scene.add(cat)

  const tailPoints = [new Vector3(), new Vector3(), new Vector3(), new Vector3(), new Vector3()]
  function updateTail(time: number) {
    const sway = Math.sin(time * 0.0012) * 0.5 + Math.sin(time * 0.0031) * 0.15
    tailPoints[0].set(0.11, -0.02, 0.0)
    tailPoints[1].set(0.155, -0.03, 0.045)
    tailPoints[2].set(0.18, -0.065, 0.085)
    tailPoints[3].set(0.185 + sway * 0.015, -0.105, 0.095)
    tailPoints[4].set(0.17 + sway * 0.04, -0.14, 0.1 + Math.abs(sway) * 0.01)
    tail.geometry.dispose()
    tail.geometry = new TubeGeometry(new CatmullRomCurve3(tailPoints), 14, 0.015, 6)
  }

  const zTexture = canvasTexture(16, 16, (ctx) => dosText(ctx, 'z', 4, 0, '#ffffff'))
  const zees: Sprite[] = []
  for (let i = 0; i < 3; i++) {
    const z = new Sprite(
      new SpriteMaterial({ map: zTexture, transparent: true, opacity: 0, depthWrite: false }),
    )
    z.userData.phase = i / 3
    zees.push(z)
    scene.add(z)
  }

  // ----------------------------------------------------------- floppies
  // One disk per job in a stepped stand: the current job in front, each older
  // disk a step further back and higher so its label shows.
  interface Floppy {
    spec: FloppySpec
    mesh: Mesh
    label: HTMLDivElement | null
    rest: { position: Vector3; quaternion: Quaternion; up: Vector3; normal: Vector3 }
    lift: number
    inserted: boolean
  }
  // A little larger than life so they read at PS1 resolution.
  const FLOPPY = { w: 0.13, h: 0.0045, d: 0.134 }
  const STEP = { back: 0.022, up: 0.034 }
  const holderHeight = 0.05
  const holder = new Group()
  {
    const plastic = lambert({ color: '#2f3038' })
    const count = options.floppies.length
    for (let i = 0; i < count; i++) {
      const height = holderHeight * 0.4 + i * STEP.up
      const step = box(FLOPPY.w + 0.02, height, STEP.back + 0.004, plastic, [0, 0, 0])
      step.position.set(0, -holderHeight / 2 + height / 2, ((count - 1) / 2 - i) * STEP.back - 0.006)
      holder.add(step)
    }
  }
  scene.add(holder)

  // The world renders far too small to read a disk label, so each disk's name
  // is an HTML element mapped onto its label strip every frame.
  const LABEL_SIZE = { w: 164, h: 40 }
  const labelCorners = (() => {
    const x = FLOPPY.w * 0.4
    const top = -FLOPPY.d / 2 + FLOPPY.d * 0.07
    const bottom = -FLOPPY.d / 2 + FLOPPY.d * 0.245
    const y = FLOPPY.h / 2 + 0.0004
    return [
      new Vector3(-x, y, top),
      new Vector3(x, y, top),
      new Vector3(x, y, bottom),
      new Vector3(-x, y, bottom),
    ]
  })()

  const floppies: Floppy[] = options.floppies.map((spec, i) => {
    const body = lambert({ color: spec.color })
    const labelMaterial = lambert({ map: floppyLabelTexture(spec.color, spec.ink) })
    const mesh = new Mesh(
      new BoxGeometry(FLOPPY.w, FLOPPY.h, FLOPPY.d),
      [body, body, labelMaterial, body, body, body],
    )
    mesh.castShadow = true
    mesh.receiveShadow = true
    mesh.userData.target = { kind: 'floppy', jobId: spec.jobId } satisfies DeskTarget
    scene.add(mesh)

    let label: HTMLDivElement | null = null
    if (options.labelLayer) {
      label = document.createElement('div')
      label.className = options.labelClassName ?? ''
      label.textContent = spec.company.toUpperCase()
      label.setAttribute('aria-hidden', 'true')
      Object.assign(label.style, {
        width: `${LABEL_SIZE.w}px`,
        height: `${LABEL_SIZE.h}px`,
        zIndex: String(options.floppies.length - i),
        visibility: 'hidden',
      })
      options.labelLayer.appendChild(label)
    }

    return {
      spec,
      mesh,
      label,
      rest: {
        position: new Vector3(),
        quaternion: new Quaternion(),
        up: new Vector3(),
        normal: new Vector3(),
      },
      lift: 0,
      inserted: false,
    }
  })

  function placeFloppies() {
    const origin = layout.floppyOrigin
    const toCamera = layout.camera.position.clone().sub(origin)
    const yaw = new Quaternion().setFromAxisAngle(
      new Vector3(0, 1, 0),
      Math.atan2(toCamera.x, toCamera.z),
    )
    // Stand the disk up (label strip on top) and lean it back a little.
    const q = new Quaternion().setFromEuler(new Euler(Math.PI / 2 - 0.22, 0, 0)).premultiply(yaw)
    const up = new Vector3(0, 0, -1).applyQuaternion(q)
    const normal = new Vector3(0, 1, 0).applyQuaternion(q)
    const back = new Vector3(0, 0, -1).applyQuaternion(yaw)
    const count = floppies.length
    const scale = layout.floppyScale
    floppies.forEach((floppy, i) => {
      floppy.rest.quaternion.copy(q)
      floppy.rest.up.copy(up)
      floppy.rest.normal.copy(normal)
      floppy.rest.position
        .set(origin.x, origin.y + 0.008 * scale, origin.z)
        .addScaledVector(up, (FLOPPY.d / 2) * scale)
        .addScaledVector(back, (i - (count - 1) / 2) * STEP.back * scale)
        .add(new Vector3(0, i * STEP.up * scale, 0))
      if (!floppy.inserted) {
        floppy.mesh.position.copy(floppy.rest.position)
        floppy.mesh.quaternion.copy(q)
        floppy.mesh.scale.setScalar(scale)
      }
    })
    holder.quaternion.copy(yaw)
    holder.scale.setScalar(scale)
    holder.position.set(origin.x, origin.y + (holderHeight / 2) * scale, origin.z)
  }

  const corner = new Vector3()
  const quad: Array<[number, number]> = [[0, 0], [0, 0], [0, 0], [0, 0]]
  function updateLabels() {
    floppies.forEach((floppy, i) => {
      const label = floppy.label
      if (!label) return
      // A lifted disk covers the label of the disk right behind it.
      const inFront = floppies[i - 1]
      const covered = inFront && !inFront.inserted ? inFront.lift : 0
      label.style.opacity = String(0.9 * (1 - covered))
      let visible = !floppy.inserted && covered < 0.98
      if (visible) {
        floppy.mesh.updateMatrixWorld()
        for (let k = 0; k < 4; k++) {
          corner.copy(labelCorners[k]).applyMatrix4(floppy.mesh.matrixWorld).project(camera)
          if (corner.z < -1 || corner.z > 1) visible = false
          quad[k][0] = ((corner.x + 1) / 2) * canvasWidth
          quad[k][1] = ((1 - corner.y) / 2) * canvasHeight
        }
      }
      label.style.visibility = visible ? 'visible' : 'hidden'
      if (visible) label.style.transform = quadTransform(LABEL_SIZE.w, LABEL_SIZE.h, quad)
    })
  }

  // ------------------------------------------------------------ lights
  const hemi = new HemisphereLight('#34416a', '#160f10', 0.85)
  scene.add(hemi)

  const moon = new DirectionalLight('#b9c6ff', 1.9)
  moon.position.set(0.55, 2.9, -2.9)
  moon.target.position.set(0, DESK_Y, 0.05)
  moon.castShadow = true
  moon.shadow.mapSize.set(1024, 1024)
  Object.assign(moon.shadow.camera, { left: -1.2, right: 1.2, top: 1.2, bottom: -1.2, near: 1, far: 7 })
  moon.shadow.bias = -0.001
  moon.shadow.normalBias = 0.01
  scene.add(moon, moon.target)

  // ------------------------------------------------------- interaction
  const interactive: Object3D[] = [computer, lamp, cat, ...floppies.map((f) => f.mesh)]
  const raycaster = new Raycaster()
  const pointer = new Vector2()
  const parallax = new Vector2()
  const parallaxGoal = new Vector2()
  let hovered: DeskTarget | null = null
  let focused: DeskTarget | null = null
  let lampOn = true
  let lampLevel = 1
  let catAwake = 0
  let catPokedAt = -Infinity
  let view: 'desk' | 'moving' | 'screen' = 'desk'
  let paused = false
  let disposed = false
  const tweens = new Set<Tween>()
  let insertedFloppy: Floppy | null = null

  function targetOf(object: Object3D | null): DeskTarget | null {
    while (object) {
      if (object.userData.target) return object.userData.target as DeskTarget
      object = object.parent
    }
    return null
  }

  function sameTarget(a: DeskTarget | null, b: DeskTarget | null) {
    if (!a || !b) return a === b
    if (a.kind !== b.kind) return false
    return a.kind !== 'floppy' || (b.kind === 'floppy' && a.jobId === b.jobId)
  }

  function pick(clientX: number, clientY: number): DeskTarget | null {
    const rect = canvas.getBoundingClientRect()
    pointer.set(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1,
    )
    raycaster.setFromCamera(pointer, camera)
    const hit = raycaster.intersectObjects(interactive, true)[0]
    return hit ? targetOf(hit.object) : null
  }

  let downAt: { x: number; y: number } | null = null
  function onPointerMove(event: PointerEvent) {
    if (view !== 'desk') return
    const rect = container.getBoundingClientRect()
    if (event.pointerType === 'mouse') {
      parallaxGoal.set(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        ((event.clientY - rect.top) / rect.height) * 2 - 1,
      )
    }
    const target = event.pointerType === 'mouse' ? pick(event.clientX, event.clientY) : null
    if (!sameTarget(target, hovered)) hovered = target
    canvas.style.cursor = target ? 'pointer' : ''
    options.onHover(
      target,
      target ? { x: event.clientX - rect.left, y: event.clientY - rect.top } : null,
    )
  }
  function onPointerLeave() {
    hovered = null
    parallaxGoal.set(0, 0)
    canvas.style.cursor = ''
    options.onHover(null, null)
  }
  function onPointerDown(event: PointerEvent) {
    downAt = { x: event.clientX, y: event.clientY }
  }
  function onPointerUp(event: PointerEvent) {
    if (view !== 'desk' || !downAt) return
    const moved = Math.hypot(event.clientX - downAt.x, event.clientY - downAt.y)
    downAt = null
    if (moved > 10) return
    const target = pick(event.clientX, event.clientY)
    if (target) options.onActivate(target)
  }
  canvas.addEventListener('pointermove', onPointerMove)
  canvas.addEventListener('pointerleave', onPointerLeave)
  canvas.addEventListener('pointerdown', onPointerDown)
  canvas.addEventListener('pointerup', onPointerUp)

  // ------------------------------------------------------------ sizing
  let cssWidth = 1
  let cssHeight = 1
  /** The canvas can be a pixel or two larger than its container. */
  let canvasWidth = 1
  let canvasHeight = 1
  function resize() {
    const rect = container.getBoundingClientRect()
    cssWidth = Math.max(1, rect.width)
    cssHeight = Math.max(1, rect.height)
    const dpr = Math.min(window.devicePixelRatio || 1, 3)
    const devW = cssWidth * dpr
    const devH = cssHeight * dpr
    // Integer device-pixel scale keeps every world pixel the same size.
    const scale = Math.max(2, Math.round(Math.sqrt((devW * devH) / PIXEL_BUDGET)))
    const w = Math.ceil(devW / scale)
    const h = Math.ceil(devH / scale)
    renderer.setSize(w, h, false)
    canvasWidth = (w * scale) / dpr
    canvasHeight = (h * scale) / dpr
    canvas.style.width = `${canvasWidth}px`
    canvas.style.height = `${canvasHeight}px`
    pipeline.setSize(w, h)
    camera.aspect = w / h
    layout = layoutFor(camera.aspect)
    mouseGroup.visible = layout.showMouse
    camera.fov = view === 'desk' ? layout.camera.fov : camera.fov
    camera.updateProjectionMatrix()
    placeFloppies()
    if (view === 'screen') applyPose(screenPose())
  }
  const resizeObserver = new ResizeObserver(resize)
  resizeObserver.observe(container)

  // ------------------------------------------------------------ camera
  function screenPose(): Pose {
    const fov = layout.camera.fov
    const tanHalf = Math.tan(MathUtils.degToRad(fov / 2))
    const fillH = (SCREEN_SIZE.h / 2) / tanHalf
    const fillW = (SCREEN_SIZE.w / 2) / (tanHalf * camera.aspect)
    const distance = Math.max(fillH, fillW) * 1.04
    return {
      position: SCREEN_CENTER.clone().add(new Vector3(0, 0, distance)),
      target: SCREEN_CENTER.clone(),
      fov,
    }
  }

  const lookTarget = new Vector3()
  function applyPose(pose: Pose) {
    camera.position.copy(pose.position)
    lookTarget.copy(pose.target)
    camera.lookAt(lookTarget)
    if (camera.fov !== pose.fov) {
      camera.fov = pose.fov
      camera.updateProjectionMatrix()
    }
  }

  function currentPose(): Pose {
    return { position: camera.position.clone(), target: lookTarget.clone(), fov: camera.fov }
  }

  function deskPose(): Pose {
    const base = layout.camera
    return {
      position: base.position.clone().add(new Vector3(parallax.x * 0.05, -parallax.y * 0.03, 0)),
      target: base.target.clone().add(new Vector3(parallax.x * 0.015, -parallax.y * 0.01, 0)),
      fov: base.fov,
    }
  }

  function tween(duration: number, ease: (t: number) => number, update: (t: number) => void) {
    return new Promise<void>((resolve) => {
      if (duration <= 0) {
        update(1)
        resolve()
        return
      }
      tweens.add({ start: performance.now(), duration, ease, update, resolve })
      wake()
    })
  }

  function lerpPose(from: Pose, to: Pose, t: number) {
    applyPose({
      position: from.position.clone().lerp(to.position, t),
      target: from.target.clone().lerp(to.target, t),
      fov: MathUtils.lerp(from.fov, to.fov, t),
    })
  }

  // --------------------------------------------------------------- loop
  let frame = 0
  let last = performance.now()
  function loop(now: number) {
    frame = 0
    if (disposed) return
    const dt = Math.min(0.1, (now - last) / 1000)
    last = now

    for (const t of tweens) {
      const p = Math.min(1, (now - t.start) / t.duration)
      t.update(t.ease(p))
      if (p >= 1) {
        tweens.delete(t)
        t.resolve()
      }
    }

    if (view === 'desk') {
      parallax.lerp(parallaxGoal, 1 - Math.exp(-dt * 3))
      applyPose(deskPose())
    }

    // Screen: wake up while the computer is hovered or focused.
    const attention = hovered ?? focused
    const wantsPrompt = view === 'desk' && attention?.kind === 'computer'
    const mode = crt.getMode().kind
    if (wantsPrompt && mode === 'screensaver') crt.setMode({ kind: 'prompt' }, now)
    if (!wantsPrompt && mode === 'prompt') crt.setMode({ kind: 'screensaver' }, now)
    crt.update(now, dt)
    const flicker = 1 + Math.sin(now * 0.05) * 0.02 + Math.sin(now * 0.0173) * 0.03
    screenLight.intensity = (0.06 + crt.brightness * 0.45) * flicker

    // Floppies lift when pointed at.
    for (const floppy of floppies) {
      if (floppy.inserted) continue
      const active = attention?.kind === 'floppy' && attention.jobId === floppy.spec.jobId
      floppy.lift = MathUtils.lerp(floppy.lift, active ? 1 : 0, 1 - Math.exp(-dt * 14))
      // Pulled up about one step, like picking a disk out of the box.
      floppy.mesh.position
        .copy(floppy.rest.position)
        .addScaledVector(floppy.rest.up, floppy.lift * STEP.up * layout.floppyScale)
      floppy.mesh.quaternion.copy(floppy.rest.quaternion)
    }

    // Lamp.
    lampLevel = MathUtils.lerp(lampLevel, lampOn ? 1 : 0, 1 - Math.exp(-dt * 18))
    lampLight.intensity = 2.6 * lampLevel
    lampBounce.intensity = 0.18 * lampLevel
    bulbMaterial.color.set(lampOn ? '#ffe2b0' : '#5a5040')
    const lampHot = attention?.kind === 'lamp'
    ;(shadeMaterial as MeshLambertMaterial).emissive.set(lampHot ? '#3a2a18' : '#000000')

    // Cat: breathe, dream, react to pokes and hovers.
    const since = (now - catPokedAt) / 1000
    const poke = since < 2.4 ? Math.sin(Math.min(1, since / 0.25) * Math.PI * 0.5) * (1 - Math.max(0, since - 1.6) / 0.8) : 0
    catAwake = MathUtils.lerp(catAwake, attention?.kind === 'cat' ? 0.35 : 0, 1 - Math.exp(-dt * 6))
    const lift = Math.max(poke, catAwake)
    const breath = Math.sin(now * 0.0016)
    catBody.scale.y = 0.06 * (1 + breath * 0.035)
    catHead.position.y = 0.025 + breath * 0.0015 + lift * 0.02
    catHead.rotation.x = -lift * 0.35
    catHead.rotation.z = lift * 0.15
    const twitch = since < 1.2 ? Math.sin(since * 40) * 0.3 * (1 - since / 1.2) : 0
    ears[0].rotation.z = 0.25 + twitch
    ears[1].rotation.z = -0.25 + (Math.sin(now * 0.0007) > 0.995 ? 0.4 : 0)
    updateTail(now)

    zees.forEach((z) => {
      const p = (now * 0.00025 + z.userData.phase) % 1
      const asleep = 1 - lift
      z.position.set(-0.1 - p * 0.05, 1.35 + p * 0.09, -0.07 + p * 0.02)
      z.scale.setScalar(0.018 + p * 0.02)
      ;(z.material as SpriteMaterial).opacity = asleep * Math.sin(p * Math.PI) * 0.85
    })

    blobs.forEach((blob, i) => {
      const p = Math.sin(now * blob.userData.speed + blob.userData.phase) * 0.5 + 0.5
      blob.position.set(Math.sin(i * 2.1) * 0.01, 0.1 + p * 0.15, Math.cos(i * 2.1) * 0.01)
      blob.scale.set(1, 1.2 + Math.sin(now * 0.001 + i) * 0.25, 1)
    })
    lavaLight.intensity = 0.45 + Math.sin(now * 0.0007) * 0.05

    steam.forEach((puff) => {
      const p = (now * 0.0002 + puff.userData.phase) % 1
      puff.position.set(
        mug.position.x + Math.sin(p * 9 + puff.userData.phase * 6) * 0.012,
        mug.position.y + 0.06 + p * 0.16,
        mug.position.z,
      )
      puff.scale.setScalar(0.025 + p * 0.04)
      ;(puff.material as SpriteMaterial).opacity = Math.sin(p * Math.PI) * 0.12
    })

    pipeline.render(scene, camera)
    updateLabels()

    if (!paused || tweens.size > 0) frame = requestAnimationFrame(loop)
  }

  function wake() {
    if (!frame && !disposed) {
      last = performance.now()
      frame = requestAnimationFrame(loop)
    }
  }

  function onVisibility() {
    if (document.hidden) {
      cancelAnimationFrame(frame)
      frame = 0
    } else if (!paused) {
      wake()
    }
  }
  document.addEventListener('visibilitychange', onVisibility)

  resize()
  placeFloppies()
  applyPose(deskPose())
  // Draw once fonts are ready so the textures use the DOS font.
  const fontsReady = document.fonts?.ready ?? Promise.resolve()
  void fontsReady.then(() => {
    if (disposed) return
    scene.traverse((object) => {
      const mesh = object as Mesh
      const materials = Array.isArray(mesh.material) ? mesh.material : mesh.material ? [mesh.material] : []
      for (const material of materials) {
        const map = (material as MeshLambertMaterial).map
        if (map && 'needsUpdate' in map) map.needsUpdate = true
      }
    })
  })
  wake()

  // --------------------------------------------------------------- api
  async function insertFloppy(floppy: Floppy, instant: boolean, onInserted?: () => void) {
    floppy.inserted = true
    insertedFloppy = floppy
    const mesh = floppy.mesh
    const startPos = mesh.position.clone()
    const startQuat = mesh.quaternion.clone()
    const startScale = mesh.scale.x
    // Flat, label up, shutter edge first.
    const flat = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI)
    const hover = new Vector3(SLOT.x, SLOT.y + 0.05, SLOT.z + 0.13)
    const front = new Vector3(SLOT.x, SLOT.y, SLOT.z + 0.08)
    const inside = new Vector3(SLOT.x, SLOT.y, SLOT.z - 0.1)
    await tween(instant ? 0 : 520, easeInOut, (t) => {
      const a = startPos.clone().lerp(hover, t)
      a.y += Math.sin(t * Math.PI) * 0.07
      mesh.position.copy(a)
      mesh.quaternion.slerpQuaternions(startQuat, flat, t)
      mesh.scale.setScalar(MathUtils.lerp(startScale, 1, t))
    })
    await tween(instant ? 0 : 180, easeOut, (t) => mesh.position.copy(hover).lerp(front, t))
    await tween(instant ? 0 : 260, easeInOut, (t) => mesh.position.copy(front).lerp(inside, t))
    onInserted?.()
    driveLedMaterial.color.set('#ffb000')
    crt.setMode({ kind: 'reading', label: floppy.spec.company.toUpperCase() }, performance.now())
  }

  async function ejectFloppy(instant: boolean) {
    const floppy = insertedFloppy
    if (!floppy) return
    insertedFloppy = null
    driveLedMaterial.color.set('#2a2a1a')
    const mesh = floppy.mesh
    const outside = new Vector3(SLOT.x, SLOT.y, SLOT.z + 0.08)
    const startInside = mesh.position.clone()
    await tween(instant ? 0 : 250, easeOut, (t) => mesh.position.copy(startInside).lerp(outside, t))
    const rest = floppy.rest
    const flat = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI)
    await tween(instant ? 0 : 450, easeInOut, (t) => {
      const p = outside.clone().lerp(rest.position, t)
      p.y += Math.sin(t * Math.PI) * 0.05
      mesh.position.copy(p)
      mesh.quaternion.slerpQuaternions(flat, rest.quaternion, t)
      mesh.scale.setScalar(MathUtils.lerp(1, layout.floppyScale, t))
    })
    floppy.inserted = false
    floppy.lift = 0
  }

  return {
    async enterComputer({ jobId, instant, onDiskInserted }) {
      if (view !== 'desk') return
      view = 'moving'
      hovered = null
      options.onHover(null, null)
      canvas.style.cursor = ''
      const floppy = jobId ? floppies.find((f) => f.spec.jobId === jobId) : undefined
      if (floppy) {
        await insertFloppy(floppy, instant, onDiskInserted)
        if (!instant) await tween(450, (t) => t, () => {})
      }
      const from = currentPose()
      const to = screenPose()
      await tween(instant ? 0 : 1100, easeInOut, (t) => lerpPose(from, to, t))
      crt.setMode({ kind: 'boot' }, performance.now())
      view = 'screen'
      paused = true
    },

    async leaveComputer({ instant }) {
      if (view !== 'screen') return
      paused = false
      view = 'moving'
      crt.setMode({ kind: 'screensaver' }, performance.now())
      wake()
      parallax.set(0, 0)
      parallaxGoal.set(0, 0)
      const from = currentPose()
      const to = deskPose()
      await Promise.all([
        tween(instant ? 0 : 900, easeInOut, (t) => lerpPose(from, to, t)),
        ejectFloppy(instant),
      ])
      view = 'desk'
    },

    setLamp(on) {
      lampOn = on
      wake()
    },

    pokeCat() {
      catPokedAt = performance.now()
      wake()
    },

    setFocus(target) {
      focused = target
    },

    project(target) {
      let object: Object3D | undefined
      if (target.kind === 'computer') object = screen
      else if (target.kind === 'lamp') object = shade
      else if (target.kind === 'cat') object = catBody
      else object = floppies.find((f) => f.spec.jobId === target.jobId)?.mesh
      if (!object) return null
      const p = object.getWorldPosition(new Vector3()).project(camera)
      return { x: ((p.x + 1) / 2) * canvasWidth, y: ((1 - p.y) / 2) * canvasHeight }
    },

    setPaused(next) {
      paused = next
      if (!paused) wake()
    },

    dispose() {
      disposed = true
      cancelAnimationFrame(frame)
      resizeObserver.disconnect()
      document.removeEventListener('visibilitychange', onVisibility)
      canvas.removeEventListener('pointermove', onPointerMove)
      canvas.removeEventListener('pointerleave', onPointerLeave)
      canvas.removeEventListener('pointerdown', onPointerDown)
      canvas.removeEventListener('pointerup', onPointerUp)
      scene.traverse((object) => {
        const mesh = object as Mesh
        mesh.geometry?.dispose()
        const materials = Array.isArray(mesh.material) ? mesh.material : mesh.material ? [mesh.material] : []
        for (const material of materials) {
          ;(material as MeshLambertMaterial).map?.dispose()
          material.dispose()
        }
      })
      for (const floppy of floppies) floppy.label?.remove()
      pipeline.dispose()
      renderer.dispose()
      renderer.forceContextLoss()
    },
  }
}
