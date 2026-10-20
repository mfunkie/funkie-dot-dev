import {
  AdditiveBlending,
  BoxGeometry,
  BufferGeometry,
  CircleGeometry,
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
  MeshBasicMaterial,
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
import { createFry } from './cat'
import type { CatSound, Obstacle } from './cat'
import { Ps1Pipeline, lambert, unlit } from './ps1'
import { CrtScreen } from './screen'
import {
  CARTRIDGE_FACE,
  bezelTexture,
  canvasTexture,
  carpetTexture,
  cartridgeFaceTexture,
  consoleFrontTexture,
  consoleTopTexture,
  controllerTexture,
  corkboardTexture,
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
import type { CartridgeArt } from './textures'

export type { CartridgeArt } from './textures'

export type DeskTarget =
  | { kind: 'computer' }
  | { kind: 'floppy'; jobId: string }
  | { kind: 'console' }
  | { kind: 'cartridge'; program: string }
  | { kind: 'lamp' }
  | { kind: 'cat' }
  | { kind: 'laser' }

/** Things that happen on the desk that the page might want to react to. */
export type DeskEvent =
  | { kind: 'cat'; sound: CatSound }
  | { kind: 'key' }
  | { kind: 'mug-knocked' }
  | { kind: 'mug-crash' }
  | { kind: 'fry-typed'; text: string }

export interface FloppySpec {
  jobId: string
  company: string
  /** Disk body color. */
  color: string
  /** Stripe along the top of the label. */
  ink: string
}

export interface CartridgeSpec {
  program: string
  /** Short name on the label. */
  title: string
  /** Full name, for the console's splash screen. */
  name: string
  /** Plastic color. */
  shell: string
  art: CartridgeArt
}

export interface DeskSceneOptions {
  canvas: HTMLCanvasElement
  floppies: readonly FloppySpec[]
  cartridges: readonly CartridgeSpec[]
  /**
   * Element (stacked over the canvas) that receives the crisp disk and
   * cartridge labels.
   * Each label gets `labelClassName`.
   */
  labelLayer?: HTMLElement
  labelClassName?: string
  /** Pixel coordinates are relative to the canvas' container. */
  onHover: (target: DeskTarget | null, point: { x: number; y: number } | null) => void
  onActivate: (target: DeskTarget) => void
  onEvent?: (event: DeskEvent) => void
}

export interface DeskScene {
  /** A job's floppy goes into the drive, or a game's cartridge into the console, on the way. */
  enterComputer(options: {
    jobId?: string
    program?: string
    instant: boolean
    onInserted?: () => void
  }): Promise<void>
  leaveComputer(options: { instant: boolean }): Promise<void>
  setLamp(on: boolean): void
  petCat(): void
  /** What Fry is up to, for his tooltip. */
  catStatus(): string
  /** Laser pointer: the dot follows the pointer, or arrow keys via nudge. */
  setLaser(on: boolean): void
  nudgeLaser(dx: number, dz: number): void
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
  /** Where the game console sits. Its cartridge rack stands behind it. */
  consoleOrigin: Vector3
  consoleScale: number
  /**
   * Cartridges in the rack. Bigger on phones, like the disks; they shrink to
   * the console's size on the way into the slot.
   */
  cartScale: number
  /** Room in front of the console for its controller. */
  showController: boolean
  showMouse: boolean
  /**
   * Where Fry hops down to and jumps back up from, best first. On phones the
   * disk stand and the console wall off the right side, so he uses the
   * keyboard.
   */
  catLandings: Vector3[]
}

const BEHIND_RIGHT = new Vector3(0.36, DESK_Y, -0.3)
const ON_KEYBOARD = new Vector3(-0.06, DESK_Y, 0.15)

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
      // No room beside the keyboard for both, so the disks stand back beside
      // the monitor and the console sits in front of them.
      floppyOrigin: new Vector3(0.34, DESK_Y, -0.16),
      floppyScale: 1.35,
      consoleOrigin: new Vector3(0.34, DESK_Y, 0.185),
      consoleScale: 0.9,
      cartScale: 1.2,
      showController: false,
      showMouse: false,
      catLandings: [ON_KEYBOARD],
    }
  }
  const wide = MathUtils.clamp((aspect - 1.2) / 1.0, 0, 1)
  const target = new Vector3(0.02, 0.98, -0.12)
  const position = new Vector3(0.02, 1.36, 1.3 - wide * 0.12)
  // Squarer windows crop the sides of the desk, where the disks and the
  // console are, so step back until they fit again.
  position.sub(target).multiplyScalar(Math.max(1, 1.33 / aspect)).add(target)
  return {
    tall: false,
    camera: { position, target, fov: 44 - wide * 4 },
    floppyOrigin: new Vector3(0.63, DESK_Y, 0.05),
    floppyScale: 1.15,
    consoleOrigin: new Vector3(-0.5, DESK_Y, 0.02),
    consoleScale: 1.25,
    cartScale: 1.25,
    showController: true,
    showMouse: true,
    catLandings: [BEHIND_RIGHT],
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

/**
 * Box whose back narrows, like the tube housing of a CRT. The top stays
 * nearly flat (only `topDrop` lower at the back), which is where cats sleep.
 */
function taperedBox(backScale: number, backDrop: number, topDrop: number) {
  const geometry = new BoxGeometry(1, 1, 1)
  const pos = geometry.attributes.position
  for (let i = 0; i < pos.count; i++) {
    if (pos.getZ(i) < 0) {
      pos.setX(i, pos.getX(i) * backScale)
      const y = pos.getY(i)
      pos.setY(i, y > 0 ? y - topDrop : y * backScale - backDrop)
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
  const deskTop = box(1.9, 0.04, 0.86, deskWood, [0, DESK_Y - 0.02, -0.12])
  scene.add(deskTop)
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

  const housing = new Mesh(taperedBox(0.68, 0.06, 0.08), beigeMaterial)
  housing.scale.set(0.37, 0.34, 0.28)
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
  interface Key {
    x: number
    z: number
    w: number
    dark: boolean
    legend: string
    pressedAt: number
    down: boolean
  }
  const keys: Key[] = []
  let keyMesh: InstancedMesh
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

    // What each key types when a cat stands on it.
    const legends: string[][] = [
      Array(13).fill(''),
      [...'`1234567890-=', 'BACK'],
      [' ', ...'qwertyuiop[]\\'],
      ['', ...'asdfghjkl;\'', '\n'],
      ['', ...'zxcvbnm,./', ''],
      ['', '', '', ' ', '', '', ''],
      ['', '/', '*', '-'],
      [...'789+'],
      [...'456+'],
      [...'123', '\n'],
      ['0', '0', '.', '\n'],
    ]
    rows.forEach((row, r) => {
      let x = row.x0
      let k = 0
      row.keys.forEach((size) => {
        if (size < 0) {
          x += -size * u
          return
        }
        keys.push({
          x: x + (size * u) / 2,
          z: row.z,
          w: size * u - 0.0025,
          dark: size !== 1 || r === 0,
          legend: legends[r]?.[k] ?? '',
          pressedAt: -Infinity,
          down: false,
        })
        k++
        x += size * u
      })
    })
    keyMesh = new InstancedMesh(
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
  mug.position.set(-0.28, DESK_Y + 0.045, 0.225)
  mug.rotation.y = 2.6
  scene.add(mug)

  // Fry can knock it off the desk. It stays on the floor until the next visit.
  let mugState: 'desk' | 'falling' | 'floor' = 'desk'
  let mugFall: { start: number; from: Vector3; direction: Vector3; axis: Vector3; crashed: boolean } | null = null
  const spill = new Mesh(new CircleGeometry(1, 14), lambert({ color: '#2a140a' }))
  spill.rotation.x = -Math.PI / 2
  spill.position.set(mug.position.x, DESK_Y + 0.001, mug.position.z + 0.02)
  spill.scale.setScalar(0.0001)
  spill.visible = false
  spill.receiveShadow = true
  scene.add(spill)

  function knockMug(direction: Vector3) {
    if (mugState !== 'desk') return
    mugState = 'falling'
    const axis = new Vector3(0, 1, 0).cross(direction).normalize()
    mugFall = { start: performance.now(), from: mug.position.clone(), direction: direction.clone(), axis, crashed: false }
    spill.visible = true
    options.onEvent?.({ kind: 'mug-knocked' })
    wake()
  }

  const mugQuat = new Quaternion()
  const mugStartQuat = mug.quaternion.clone()
  function updateMug(now: number) {
    if (!mugFall || mugState === 'floor') return
    const t = (now - mugFall.start) / 1000
    const { from, direction, axis } = mugFall
    const edge = from.clone().addScaledVector(direction, Math.max(0.05, (0.36 - from.z) / Math.max(direction.z, 0.3)))
    let angle = 0
    if (t < 0.25) {
      // Tips over where it stands.
      const p = t / 0.25
      mug.position.copy(from).addScaledVector(direction, 0.03 * p)
      angle = p * 1.1
    } else if (t < 0.5) {
      // Rolls to the edge.
      const p = (t - 0.25) / 0.25
      mug.position.lerpVectors(from.clone().addScaledVector(direction, 0.03), edge, p)
      mug.position.y = from.y - 0.012 * p
      angle = 1.1 + p * 1.2
    } else {
      // And over.
      const fall = t - 0.5
      mug.position.copy(edge).addScaledVector(direction, fall * 0.25)
      mug.position.y = from.y - 0.012 - 4.9 * fall * fall
      angle = 2.3 + fall * 9
      if (mug.position.y <= 0.04) {
        mug.position.y = 0.04
        angle = Math.PI / 2
        mugState = 'floor'
        if (!mugFall.crashed) {
          mugFall.crashed = true
          options.onEvent?.({ kind: 'mug-crash' })
        }
      }
    }
    mug.quaternion.copy(mugStartQuat).premultiply(mugQuat.setFromAxisAngle(axis, angle))
    const spread = MathUtils.clamp((t - 0.15) / 0.6, 0, 1)
    spill.scale.set(0.075 * spread + 0.0001, 0.05 * spread + 0.0001, 1)
  }

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

  // ------------------------------------------------------- laser pen
  // Left at the front of the desk. Click it and the cursor becomes a red dot.
  const pen = new Group()
  pen.userData.target = { kind: 'laser' } satisfies DeskTarget
  const penBodyMaterial = lambert({ color: '#2b2b33', emissive: '#000000' })
  const penBody = new Mesh(new CylinderGeometry(0.008, 0.008, 0.1, 8), penBodyMaterial)
  penBody.rotation.z = Math.PI / 2
  penBody.castShadow = true
  pen.add(penBody)
  const penClip = new Mesh(new BoxGeometry(0.04, 0.003, 0.004), lambert({ color: '#9aa0a8' }))
  penClip.position.set(-0.015, 0.009, 0)
  pen.add(penClip)
  const penTipMaterial = unlit({ color: '#4a1414' })
  const penTip = new Mesh(new CylinderGeometry(0.005, 0.007, 0.012, 8), penTipMaterial)
  penTip.rotation.z = Math.PI / 2
  penTip.position.x = 0.056
  pen.add(penTip)
  // Easier to click than the pen itself.
  const penHitbox = new Mesh(new BoxGeometry(0.15, 0.05, 0.07), new MeshBasicMaterial())
  penHitbox.visible = false
  pen.add(penHitbox)
  pen.position.set(-0.02, DESK_Y + 0.008, 0.285)
  pen.rotation.y = 0.12
  scene.add(pen)

  const dotTexture = canvasTexture(16, 16, (ctx) => {
    const glow = ctx.createRadialGradient(8, 8, 0, 8, 8, 8)
    glow.addColorStop(0, 'rgba(255,255,255,1)')
    glow.addColorStop(0.25, 'rgba(255,80,80,1)')
    glow.addColorStop(1, 'rgba(255,0,0,0)')
    ctx.fillStyle = glow
    ctx.fillRect(0, 0, 16, 16)
  })
  const dot = new Sprite(
    new SpriteMaterial({
      map: dotTexture,
      color: '#ff3b3b',
      transparent: true,
      depthTest: false,
      depthWrite: false,
      blending: AdditiveBlending,
    }),
  )
  dot.renderOrder = 10
  dot.visible = false
  scene.add(dot)
  const dotLight = new PointLight('#ff2a2a', 0, 0.25, 2)
  scene.add(dotLight)

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
  // is an HTML element mapped onto its label strip every frame. Cartridges
  // get the same treatment.
  function createLabel(text: string, size: { w: number; h: number }, zIndex: number) {
    if (!options.labelLayer) return null
    const label = document.createElement('div')
    label.className = options.labelClassName ?? ''
    label.textContent = text
    label.setAttribute('aria-hidden', 'true')
    Object.assign(label.style, {
      width: `${size.w}px`,
      height: `${size.h}px`,
      zIndex: String(zIndex),
      visibility: 'hidden',
    })
    options.labelLayer.appendChild(label)
    return label
  }

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

    return {
      spec,
      mesh,
      label: createLabel(spec.company.toUpperCase(), LABEL_SIZE, options.floppies.length - i),
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

  // ------------------------------------------------------------ console
  // A top-loading game console with its controller, and a stepped rack
  // behind it holding one cartridge per game. The set turns to face you.
  interface Cartridge {
    spec: CartridgeSpec
    mesh: Mesh
    label: HTMLDivElement | null
    rest: { position: Vector3; quaternion: Quaternion; up: Vector3 }
    lift: number
    inserted: boolean
    /** All the way down in the slot, as opposed to on its way in or out. */
    seated: boolean
  }
  const CONSOLE = { w: 0.19, h: 0.046, d: 0.14 }
  // Larger than life, like the disks.
  const CART = { w: 0.105, h: 0.095, d: 0.02 }
  const CART_STEP = { back: 0.026, up: 0.03 }
  /** How far a cartridge sinks into the slot; the rest sticks out the top. */
  const CART_SEAT = 0.042
  const SLOT_Z = -0.025
  /** From the back of the console to the middle of the rack's first step. */
  const RACK_GAP = 0.027
  const UP = new Vector3(0, 1, 0)

  const consoleSet = new Group()
  consoleSet.userData.target = { kind: 'console' } satisfies DeskTarget
  const consoleSide = lambert({ map: plasticTexture('#56545f', 41), emissive: '#000000' })
  const consoleTop = lambert({ map: consoleTopTexture(), emissive: '#000000' })
  const consoleFront = lambert({ map: consoleFrontTexture(), emissive: '#000000' })
  /** Lit up a little while pointed at. */
  const consoleGlow = [consoleSide, consoleTop, consoleFront] as MeshLambertMaterial[]
  consoleSet.add(
    box(
      CONSOLE.w,
      CONSOLE.h,
      CONSOLE.d,
      [consoleSide, consoleSide, consoleTop, consoleSide, consoleFront, consoleSide],
      [0, CONSOLE.h / 2, 0],
    ),
  )
  const consoleDark = lambert({ color: '#2e2d34' })
  consoleSet.add(box(CART.w + 0.03, 0.01, CART.d + 0.022, consoleDark, [0, CONSOLE.h + 0.005, SLOT_Z]))
  const slotHole = new Mesh(new BoxGeometry(CART.w + 0.008, 0.002, CART.d + 0.006), unlit({ color: '#08080a' }))
  slotHole.position.set(0, CONSOLE.h + 0.0101, SLOT_Z)
  consoleSet.add(slotHole)
  const consoleLedMaterial = unlit({ color: '#3a1414' })
  const consoleLed = new Mesh(new BoxGeometry(0.008, 0.006, 0.003), consoleLedMaterial)
  consoleLed.position.set(-CONSOLE.w * 0.42, CONSOLE.h * 0.62, CONSOLE.d / 2 + 0.001)
  consoleSet.add(consoleLed)

  // The controller lies in front, its cord running to port 1.
  const controller = new Group()
  const controllerPad = box(
    0.1,
    0.012,
    0.045,
    [consoleDark, consoleDark, lambert({ map: controllerTexture() }), consoleDark, consoleDark, consoleDark],
    [-0.005, 0.006, CONSOLE.d / 2 + 0.065],
  )
  controllerPad.rotation.y = 0.12
  controller.add(controllerPad)
  controller.add(
    new Mesh(
      new TubeGeometry(
        new CatmullRomCurve3([
          new Vector3(0.0, 0.008, CONSOLE.d / 2 + 0.043),
          new Vector3(0.012, 0.004, CONSOLE.d / 2 + 0.025),
          new Vector3(0.036, 0.004, CONSOLE.d / 2 + 0.012),
          new Vector3(0.042, 0.028, CONSOLE.d / 2 + 0.002),
        ]),
        12,
        0.0025,
        4,
      ),
      consoleDark,
    ),
  )
  consoleSet.add(controller)

  const rack = new Group()
  rack.userData.target = { kind: 'console' } satisfies DeskTarget
  {
    const plastic = lambert({ color: '#2f3038' })
    for (let i = 0; i < options.cartridges.length; i++) {
      const height = 0.02 + i * CART_STEP.up
      rack.add(box(CART.w + 0.016, height, CART_STEP.back + 0.004, plastic, [0, height / 2, -RACK_GAP - i * CART_STEP.back]))
    }
  }
  scene.add(consoleSet, rack)

  // Back to the computer, which is where its picture shows up.
  const avCable = new Mesh<BufferGeometry, Material>(new BufferGeometry(), lambert({ color: '#26252b' }))
  avCable.castShadow = true
  scene.add(avCable)

  const CART_LABEL_SIZE = { w: 160, h: 36 }
  const cartLabelCorners = (() => {
    const { w, h, title } = CARTRIDGE_FACE
    const left = (title.x / w - 0.5) * CART.w
    const right = ((title.x + title.w) / w - 0.5) * CART.w
    const top = (0.5 - title.y / h) * CART.h
    const bottom = (0.5 - (title.y + title.h) / h) * CART.h
    const z = CART.d / 2 + 0.0004
    return [
      new Vector3(left, top, z),
      new Vector3(right, top, z),
      new Vector3(right, bottom, z),
      new Vector3(left, bottom, z),
    ]
  })()

  const carts: Cartridge[] = options.cartridges.map((spec, i) => {
    const shell = lambert({ map: plasticTexture(spec.shell, 50 + i) })
    const face = lambert({ map: cartridgeFaceTexture(spec.shell, spec.art) })
    const mesh = new Mesh(new BoxGeometry(CART.w, CART.h, CART.d), [shell, shell, shell, shell, face, shell])
    mesh.castShadow = true
    mesh.receiveShadow = true
    mesh.userData.target = { kind: 'cartridge', program: spec.program } satisfies DeskTarget
    scene.add(mesh)
    return {
      spec,
      mesh,
      label: createLabel(spec.title.toUpperCase(), CART_LABEL_SIZE, options.cartridges.length - i),
      rest: { position: new Vector3(), quaternion: new Quaternion(), up: new Vector3() },
      lift: 0,
      inserted: false,
      seated: false,
    }
  })

  /** A cartridge all the way down in the slot. */
  const slotPose = { position: new Vector3(), quaternion: new Quaternion() }
  /** The rack's middle, for Fry to walk around. */
  const rackCenter = new Vector3()
  const controllerCenter = new Vector3()

  function placeConsole() {
    const origin = layout.consoleOrigin
    const toCamera = layout.camera.position.clone().sub(origin)
    // Most of the way round to face you, so it still sits square-ish on the desk.
    const yaw = new Quaternion().setFromAxisAngle(UP, Math.atan2(toCamera.x, toCamera.z) * 0.7)
    const scale = layout.consoleScale
    if (layout.showController) consoleSet.add(controller)
    else consoleSet.remove(controller)
    consoleSet.position.copy(origin)
    consoleSet.quaternion.copy(yaw)
    consoleSet.scale.setScalar(scale)
    consoleSet.updateMatrixWorld(true)
    const cartScale = layout.cartScale
    rack.position.set(0, 0, -CONSOLE.d / 2).applyMatrix4(consoleSet.matrixWorld)
    rack.quaternion.copy(yaw)
    rack.scale.setScalar(cartScale)
    rack.updateMatrixWorld(true)

    // Each cartridge leans back a little in its step of the rack.
    const lean = new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), -0.1).premultiply(yaw)
    const up = UP.clone().applyQuaternion(lean)
    carts.forEach((cart, i) => {
      cart.rest.quaternion.copy(lean)
      cart.rest.up.copy(up)
      cart.rest.position
        .set(0, 0.008 + i * CART_STEP.up, -RACK_GAP - i * CART_STEP.back)
        .applyMatrix4(rack.matrixWorld)
        .addScaledVector(up, (CART.h / 2) * cartScale)
      if (!cart.inserted) {
        cart.mesh.position.copy(cart.rest.position)
        cart.mesh.quaternion.copy(lean)
        cart.mesh.scale.setScalar(cartScale)
      }
    })
    slotPose.position.set(0, CONSOLE.h + 0.01 - CART_SEAT + CART.h / 2, SLOT_Z).applyMatrix4(consoleSet.matrixWorld)
    slotPose.quaternion.copy(yaw)
    if (insertedCart?.seated) {
      insertedCart.mesh.position.copy(slotPose.position)
      insertedCart.mesh.quaternion.copy(yaw)
      insertedCart.mesh.scale.setScalar(scale)
    }
    rackCenter.set(0, 0, -RACK_GAP - ((carts.length - 1) / 2) * CART_STEP.back).applyMatrix4(rack.matrixWorld)
    controllerCenter.copy(controllerPad.position).applyMatrix4(consoleSet.matrixWorld)

    // The A/V cable leaves the back corner nearest the computer and runs
    // along the desk into the side of the case.
    const side = origin.x < 0 ? -1 : 1
    const start = new Vector3(-side * (CONSOLE.w / 2 - 0.025), 0.016, -CONSOLE.d / 2).applyMatrix4(consoleSet.matrixWorld)
    const end = new Vector3(side * 0.221, DESK_Y + 0.035, Math.min(start.z - 0.08, -0.06))
    avCable.geometry.dispose()
    avCable.geometry = new TubeGeometry(
      new CatmullRomCurve3([
        start,
        start.clone().add(new Vector3(0, -0.011, -0.02)),
        new Vector3(MathUtils.lerp(start.x, end.x, 0.6), DESK_Y + 0.003, MathUtils.lerp(start.z, end.z, 0.5)),
        new Vector3(side * 0.236, DESK_Y + 0.004, end.z + 0.012),
        end,
      ]),
      24,
      0.0028,
      4,
    )
  }

  interface ScreenRect {
    minX: number
    maxX: number
    minY: number
    maxY: number
  }
  const cartFaceCorners = [
    new Vector3(-CART.w / 2, CART.h / 2, CART.d / 2),
    new Vector3(CART.w / 2, CART.h / 2, CART.d / 2),
    new Vector3(CART.w / 2, -CART.h / 2, CART.d / 2),
    new Vector3(-CART.w / 2, -CART.h / 2, CART.d / 2),
  ]
  const corner = new Vector3()
  const quad: Array<[number, number]> = [[0, 0], [0, 0], [0, 0], [0, 0]]
  /** Where a mesh's corners land on screen, in `quad`; false if off it. */
  function projectQuad(mesh: Mesh, corners: Vector3[]) {
    mesh.updateMatrixWorld()
    let onScreen = true
    for (let k = 0; k < 4; k++) {
      corner.copy(corners[k]).applyMatrix4(mesh.matrixWorld).project(camera)
      if (corner.z < -1 || corner.z > 1) onScreen = false
      quad[k][0] = ((corner.x + 1) / 2) * canvasWidth
      quad[k][1] = ((1 - corner.y) / 2) * canvasHeight
    }
    return onScreen
  }
  function quadRect(): ScreenRect {
    const xs = quad.map((q) => q[0])
    const ys = quad.map((q) => q[1])
    return { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) }
  }
  /**
   * Labels are HTML on top of the canvas, so nothing in the world hides them.
   * `occluder` is the one thing that does: the cartridge out of the rack,
   * which passes in front of the others' labels.
   */
  function projectLabel(
    label: HTMLDivElement,
    size: { w: number; h: number },
    corners: Vector3[],
    mesh: Mesh,
    covered: number,
    shown: boolean,
    occluder: ScreenRect | null = null,
  ) {
    label.style.opacity = String(0.9 * (1 - covered))
    let visible = shown && covered < 0.98 && projectQuad(mesh, corners)
    if (visible && occluder) {
      const r = quadRect()
      visible = r.maxX < occluder.minX || r.minX > occluder.maxX || r.maxY < occluder.minY || r.minY > occluder.maxY
    }
    label.style.visibility = visible ? 'visible' : 'hidden'
    if (visible) label.style.transform = quadTransform(size.w, size.h, quad)
  }

  function updateLabels() {
    // Fry walking in front of a stand hides the labels behind him.
    const catPos = fry.position()
    const catBefore = (o: Vector3, r: number) =>
      Math.abs(catPos.x - o.x) < r && catPos.z > o.z - 0.06 && catPos.y < DESK_Y + 0.2
    const disksHidden = catBefore(layout.floppyOrigin, 0.2 * layout.floppyScale)
    floppies.forEach((floppy, i) => {
      if (!floppy.label) return
      // A lifted disk covers the label of the disk right behind it.
      const inFront = floppies[i - 1]
      const lifted = inFront && !inFront.inserted ? inFront.lift : 0
      projectLabel(floppy.label, LABEL_SIZE, labelCorners, floppy.mesh, disksHidden ? 1 : lifted, !floppy.inserted)
    })
    const cartsHidden = catBefore(rackCenter, 0.16 * layout.cartScale)
    const out = carts.find((c) => c.inserted)
    const occluder = out && projectQuad(out.mesh, cartFaceCorners) ? quadRect() : null
    const nearer = (a: Mesh, b: Mesh) =>
      a.position.distanceToSquared(camera.position) < b.position.distanceToSquared(camera.position)
    carts.forEach((cart, i) => {
      if (!cart.label) return
      // The label stays on a cartridge in the slot: it's the part that shows.
      const inFront = carts[i - 1]
      const lifted = inFront && !inFront.inserted && !cart.inserted ? inFront.lift : 0
      cart.label.style.zIndex = String(cart.inserted ? carts.length + 1 : carts.length - i)
      projectLabel(
        cart.label,
        CART_LABEL_SIZE,
        cartLabelCorners,
        cart.mesh,
        cartsHidden ? 1 : lifted,
        true,
        out && cart !== out && nearer(out.mesh, cart.mesh) ? occluder : null,
      )
    })
  }

  // --------------------------------------------------------------- Fry
  const KEYBOARD_RECT = { minX: -0.235, maxX: 0.235, minZ: 0.085, maxZ: 0.255 }
  const PAD_RECT = { minX: 0.295, maxX: 0.505, minZ: 0.08, maxZ: 0.26 }
  const inRect = (r: typeof KEYBOARD_RECT, x: number, z: number) =>
    x > r.minX && x < r.maxX && z > r.minZ && z < r.maxZ
  function surfaceHeight(x: number, z: number) {
    if (inRect(KEYBOARD_RECT, x, z)) return DESK_Y + 0.04 - (z - 0.17) * 0.06
    if (layout.showMouse && inRect(PAD_RECT, x, z)) return DESK_Y + 0.003
    return DESK_Y
  }
  const staticObstacles: Obstacle[] = [
    { kind: 'rect', minX: -0.35, maxX: -0.25, minZ: -0.26, maxZ: -0.14 },
    { kind: 'circle', x: -0.62, z: -0.22, r: 0.08 },
    { kind: 'circle', x: 0.9, z: -0.36, r: 0.07 },
  ]
  const fry = createFry(
    {
      // On the flat top of the monitor, facing left and a little toward you.
      bed: { position: new Vector3(0.03, 1.228, -0.13), heading: -Math.PI / 2 + 0.3 },
      landings: () => layout.catLandings,
      bounds: { minX: -0.84, maxX: 0.84, minZ: -0.47, maxZ: 0.25 },
      computer: { minX: -0.23, maxX: 0.23, minZ: -0.42, maxZ: 0.02 },
      obstacles: () => {
        const o = layout.floppyOrigin
        const c = layout.consoleOrigin
        const list: Obstacle[] = [
          ...staticObstacles,
          { kind: 'circle', x: o.x, z: o.z, r: 0.1 * layout.floppyScale },
          { kind: 'circle', x: c.x, z: c.z, r: 0.11 * layout.consoleScale },
          { kind: 'circle', x: rackCenter.x, z: rackCenter.z, r: 0.07 * layout.cartScale },
        ]
        if (layout.showController) {
          list.push({ kind: 'circle', x: controllerCenter.x, z: controllerCenter.z, r: 0.05 * layout.consoleScale })
        }
        if (mugState === 'desk') list.push({ kind: 'circle', x: mug.position.x, z: mug.position.z, r: 0.045 })
        return list
      },
      surfaceHeight,
      mug: {
        position: mug.position,
        onDesk: () => mugState === 'desk',
        knock: knockMug,
      },
      camera,
    },
    (sound) => options.onEvent?.({ kind: 'cat', sound }),
  )
  scene.add(fry.object, fry.effects)

  // When Fry walks on the keyboard, the keys under his paws go down and type.
  let typed = ''
  let lastKeyAt = -Infinity
  let typingReported = true
  const pawWasPlanted = [true, true, true, true]
  const keyLocal = new Vector3()
  const keyMatrix = new Matrix4()
  function pressKeyUnder(paw: Vector3, now: number) {
    keyboard.worldToLocal(keyLocal.copy(paw))
    const key = keys.findIndex(
      (k) => Math.abs(keyLocal.x - k.x) <= k.w / 2 + 0.002 && Math.abs(keyLocal.z - k.z) <= 0.0105,
    )
    if (key < 0) return
    const k = keys[key]
    if (now - k.pressedAt < 120) return
    k.pressedAt = now
    options.onEvent?.({ kind: 'key' })
    if (!k.legend) return
    typed = k.legend === 'BACK' ? typed.slice(0, -1) : (typed + k.legend).slice(-400)
    lastKeyAt = now
    typingReported = false
    crt.setMode({ kind: 'typed', text: typed }, now)
  }
  function updateKeys(now: number) {
    for (let i = 0; i < 4; i++) {
      if (fry.pawPlanted[i] && !pawWasPlanted[i]) pressKeyUnder(fry.paws[i], now)
      pawWasPlanted[i] = fry.pawPlanted[i]
    }
    let changed = false
    keys.forEach((k, i) => {
      const down = now - k.pressedAt < 140
      if (down === k.down) return
      k.down = down
      keyMatrix.makeScale(k.w, 1, 1)
      keyMatrix.setPosition(k.x, down ? 0.0145 : 0.0195, k.z)
      keyMesh.setMatrixAt(i, keyMatrix)
      changed = true
    })
    if (changed) keyMesh.instanceMatrix.needsUpdate = true
    if (!typingReported && now - lastKeyAt > 1800) {
      typingReported = true
      const text = typed.replace(/\s+/g, ' ').trim()
      if (text.length >= 3) options.onEvent?.({ kind: 'fry-typed', text: text.slice(-28) })
    }
    if (crt.getMode().kind === 'typed' && now - lastKeyAt > 8000) {
      typed = ''
      crt.setMode({ kind: 'screensaver' }, now)
    }
  }

  // ------------------------------------------------------------- laser
  let laserOn = false
  const laserPoint = new Vector3(0.33, DESK_Y, -0.1)
  let laserOnDesk = true
  const deskSurfaces: Object3D[] = [deskTop, keyboard, mouseGroup, spill]
  function isDeskSurface(object: Object3D | null) {
    while (object) {
      if (deskSurfaces.includes(object)) return true
      object = object.parent
    }
    return false
  }
  function aimLaser(clientX: number, clientY: number) {
    const rect = canvas.getBoundingClientRect()
    pointer.set(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1,
    )
    raycaster.setFromCamera(pointer, camera)
    const hits = raycaster.intersectObjects(laserSurfaces, true)
    const hit = hits.find((h) => h.object.visible && h.object !== dot)
    if (!hit) return
    laserPoint.copy(hit.point)
    laserOnDesk = isDeskSurface(hit.object)
    syncLaser()
  }
  function syncLaser() {
    fry.setLaser(laserOn ? { point: laserPoint, onDesk: laserOnDesk } : null)
    dot.visible = laserOn
    dotLight.intensity = laserOn ? 0.035 : 0
    penTipMaterial.color.set(laserOn ? '#ff3030' : '#4a1414')
    canvas.style.touchAction = laserOn ? 'none' : 'manipulation'
    wake()
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
  const interactive: Object3D[] = [
    computer,
    lamp,
    fry.object,
    pen,
    consoleSet,
    rack,
    ...floppies.map((f) => f.mesh),
    ...carts.map((c) => c.mesh),
  ]
  const laserSurfaces = scene.children.filter(
    (o) => !(o instanceof Sprite) && o !== fry.effects && o !== dot,
  )
  const raycaster = new Raycaster()
  const pointer = new Vector2()
  const parallax = new Vector2()
  const parallaxGoal = new Vector2()
  let hovered: DeskTarget | null = null
  let focused: DeskTarget | null = null
  let lampOn = true
  let lampLevel = 1
  let view: 'desk' | 'moving' | 'screen' = 'desk'
  let paused = false
  let disposed = false
  const tweens = new Set<Tween>()
  let insertedFloppy: Floppy | null = null
  let insertedCart: Cartridge | null = null

  function targetOf(object: Object3D | null): DeskTarget | null {
    while (object) {
      if (object.userData.target) return object.userData.target as DeskTarget
      object = object.parent
    }
    return null
  }

  function sameTarget(a: DeskTarget | null, b: DeskTarget | null) {
    if (!a || !b) return a === b
    if (a.kind === 'floppy') return b.kind === 'floppy' && a.jobId === b.jobId
    if (a.kind === 'cartridge') return b.kind === 'cartridge' && a.program === b.program
    return a.kind === b.kind
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
  const gazePoint = new Vector3()
  const headPoint = new Vector3()
  function onPointerMove(event: PointerEvent) {
    if (view !== 'desk') return
    const rect = container.getBoundingClientRect()
    if (event.pointerType === 'mouse') {
      parallaxGoal.set(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        ((event.clientY - rect.top) / rect.height) * 2 - 1,
      )
    }
    if (laserOn) {
      // Touch drags and mouse moves both steer the dot.
      if (event.pointerType === 'mouse' || downAt) aimLaser(event.clientX, event.clientY)
    }
    let target = event.pointerType === 'mouse' ? pick(event.clientX, event.clientY) : null
    // With the laser on, the pen is the only thing you can click.
    if (laserOn && target?.kind !== 'laser') target = null
    if (!sameTarget(target, hovered)) hovered = target
    canvas.style.cursor = target ? 'pointer' : laserOn ? 'none' : ''
    options.onHover(
      target,
      target ? { x: event.clientX - rect.left, y: event.clientY - rect.top } : null,
    )
    // Fry watches the cursor when it's near him.
    if (event.pointerType === 'mouse' && !laserOn) {
      fry.headPosition(headPoint)
      // A point between you and him, so he looks toward the cursor (and you)
      // rather than at a spot inside his own head.
      gazePoint.copy(raycaster.ray.direction).multiplyScalar(camera.position.distanceTo(headPoint) * 0.7)
      gazePoint.add(raycaster.ray.origin)
      fry.setGaze(gazePoint)
    }
  }
  function onPointerLeave() {
    hovered = null
    parallaxGoal.set(0, 0)
    canvas.style.cursor = ''
    fry.setGaze(null)
    options.onHover(null, null)
  }
  function onPointerDown(event: PointerEvent) {
    downAt = { x: event.clientX, y: event.clientY }
    if (laserOn && view === 'desk' && pick(event.clientX, event.clientY)?.kind !== 'laser') {
      aimLaser(event.clientX, event.clientY)
    }
  }
  function onPointerUp(event: PointerEvent) {
    if (view !== 'desk' || !downAt) return
    const moved = Math.hypot(event.clientX - downAt.x, event.clientY - downAt.y)
    downAt = null
    if (moved > 10) return
    const target = pick(event.clientX, event.clientY)
    if (laserOn && target?.kind !== 'laser') return
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
    placeConsole()
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

    // So do cartridges, and the console lights up a little.
    for (const cart of carts) {
      if (cart.inserted) continue
      const active = attention?.kind === 'cartridge' && attention.program === cart.spec.program
      cart.lift = MathUtils.lerp(cart.lift, active ? 1 : 0, 1 - Math.exp(-dt * 14))
      cart.mesh.position
        .copy(cart.rest.position)
        .addScaledVector(cart.rest.up, cart.lift * 0.045 * layout.cartScale)
      cart.mesh.quaternion.copy(cart.rest.quaternion)
    }
    const consoleHot = attention?.kind === 'console'
    for (const material of consoleGlow) material.emissive.set(consoleHot ? '#26262c' : '#000000')

    // Lamp.
    lampLevel = MathUtils.lerp(lampLevel, lampOn ? 1 : 0, 1 - Math.exp(-dt * 18))
    lampLight.intensity = 2.6 * lampLevel
    lampBounce.intensity = 0.18 * lampLevel
    bulbMaterial.color.set(lampOn ? '#ffe2b0' : '#5a5040')
    const lampHot = attention?.kind === 'lamp'
    ;(shadeMaterial as MeshLambertMaterial).emissive.set(lampHot ? '#3a2a18' : '#000000')

    // Fry.
    fry.setHovered(attention?.kind === 'cat')
    fry.update(now, dt)
    updateKeys(now)
    updateMug(now)

    // Laser dot, with a little hand tremor.
    if (laserOn) {
      dot.position.copy(laserPoint)
      dot.position.x += Math.sin(now * 0.013) * 0.0015 + Math.sin(now * 0.031) * 0.001
      dot.position.y += Math.sin(now * 0.017) * 0.001 + 0.002
      dot.scale.setScalar(0.016 * Math.max(1, camera.position.distanceTo(laserPoint) / 1.3))
      dotLight.position.copy(laserPoint).add(new Vector3(0, 0.02, 0))
    }
    const penHot = attention?.kind === 'laser'
    ;(penBodyMaterial as MeshLambertMaterial).emissive.set(penHot ? '#30303a' : '#000000')

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
      ;(puff.material as SpriteMaterial).opacity = mugState === 'desk' ? Math.sin(p * Math.PI) * 0.12 : 0
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
  placeConsole()
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

  /** Just over the slot, lined up to go in. */
  function aboveSlot() {
    return slotPose.position.clone().addScaledVector(UP, (CART_SEAT + 0.05) * layout.consoleScale)
  }

  async function insertCartridge(cart: Cartridge, instant: boolean, onInserted?: () => void) {
    cart.inserted = true
    insertedCart = cart
    const mesh = cart.mesh
    const startPos = mesh.position.clone()
    const startQuat = mesh.quaternion.clone()
    const startScale = mesh.scale.x
    const above = aboveSlot()
    // Out of the rack, over to the console, upright with the label to you.
    await tween(instant ? 0 : 520, easeInOut, (t) => {
      const p = startPos.clone().lerp(above, t)
      p.y += Math.sin(t * Math.PI) * 0.06
      mesh.position.copy(p)
      mesh.quaternion.slerpQuaternions(startQuat, slotPose.quaternion, t)
      mesh.scale.setScalar(MathUtils.lerp(startScale, layout.consoleScale, t))
    })
    if (!instant) await tween(120, (t) => t, () => {})
    // And pushed down until it seats.
    await tween(instant ? 0 : 200, (t) => t * t, (t) => mesh.position.copy(above).lerp(slotPose.position, t))
    cart.seated = true
    onInserted?.()
    consoleLedMaterial.color.set('#ff2a2a')
    crt.setMode({ kind: 'cartridge', label: cart.spec.name.toUpperCase() }, performance.now())
  }

  async function ejectCartridge(instant: boolean) {
    const cart = insertedCart
    if (!cart) return
    insertedCart = null
    cart.seated = false
    consoleLedMaterial.color.set('#3a1414')
    const mesh = cart.mesh
    const from = mesh.position.clone()
    const fromQuat = mesh.quaternion.clone()
    const above = aboveSlot()
    await tween(instant ? 0 : 220, easeOut, (t) => mesh.position.copy(from).lerp(above, t))
    const rest = cart.rest
    const fromScale = mesh.scale.x
    await tween(instant ? 0 : 450, easeInOut, (t) => {
      const p = above.clone().lerp(rest.position, t)
      p.y += Math.sin(t * Math.PI) * 0.05
      mesh.position.copy(p)
      mesh.quaternion.slerpQuaternions(fromQuat, rest.quaternion, t)
      mesh.scale.setScalar(MathUtils.lerp(fromScale, layout.cartScale, t))
    })
    cart.inserted = false
    cart.lift = 0
  }

  return {
    async enterComputer({ jobId, program, instant, onInserted }) {
      if (view !== 'desk') return
      view = 'moving'
      hovered = null
      options.onHover(null, null)
      canvas.style.cursor = ''
      const floppy = jobId ? floppies.find((f) => f.spec.jobId === jobId) : undefined
      const cart = program ? carts.find((c) => c.spec.program === program) : undefined
      if (floppy) await insertFloppy(floppy, instant, onInserted)
      else if (cart) await insertCartridge(cart, instant, onInserted)
      // A moment to watch the drive light, or the console's splash screen.
      if ((floppy || cart) && !instant) await tween(cart ? 650 : 450, (t) => t, () => {})
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
        ejectCartridge(instant),
      ])
      view = 'desk'
    },

    setLamp(on) {
      lampOn = on
      fry.notice()
      wake()
    },

    petCat() {
      fry.pet(performance.now())
      wake()
    },

    catStatus() {
      return fry.status()
    },

    setLaser(on) {
      if (laserOn === on) return
      laserOn = on
      if (on) fry.setGaze(null)
      else if (hovered?.kind !== 'laser') canvas.style.cursor = ''
      syncLaser()
    },

    nudgeLaser(dx, dz) {
      if (!laserOn) return
      if (!laserOnDesk) laserPoint.set(0.33, DESK_Y, -0.1)
      laserPoint.x = MathUtils.clamp(laserPoint.x + dx, -0.84, 0.84)
      laserPoint.z = MathUtils.clamp(laserPoint.z + dz, -0.47, 0.28)
      laserPoint.y = surfaceHeight(laserPoint.x, laserPoint.z)
      laserOnDesk = true
      syncLaser()
    },

    setFocus(target) {
      focused = target
    },

    project(target) {
      let object: Object3D | undefined
      if (target.kind === 'computer') object = screen
      else if (target.kind === 'lamp') object = shade
      else if (target.kind === 'cat') object = fry.object
      else if (target.kind === 'laser') object = pen
      else if (target.kind === 'console') object = slotHole
      else if (target.kind === 'cartridge') object = carts.find((c) => c.spec.program === target.program)?.mesh
      else object = floppies.find((f) => f.spec.jobId === target.jobId)?.mesh
      if (!object) return null
      const p = (target.kind === 'cat' ? fry.headPosition(new Vector3()) : object.getWorldPosition(new Vector3())).project(camera)
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
      for (const cart of carts) cart.label?.remove()
      pipeline.dispose()
      renderer.dispose()
      renderer.forceContextLoss()
    },
  }
}
