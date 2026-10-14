import {
  BoxGeometry,
  BufferGeometry,
  CatmullRomCurve3,
  ConeGeometry,
  CylinderGeometry,
  Float32BufferAttribute,
  Group,
  LineBasicMaterial,
  LineSegments,
  MathUtils,
  Mesh,
  SphereGeometry,
  Sprite,
  SpriteMaterial,
  TorusGeometry,
  TubeGeometry,
  Vector3,
} from 'three'
import type { Camera, Material } from 'three'
import { lambert, unlit } from './ps1'
import { canvasTexture, catFaceTexture, catTexture, dosText } from './textures'

/**
 * Fry: an orange cat who sleeps on the warm CRT, follows your cursor, likes
 * a few pets (not too many), chases the laser pointer, walks on the keyboard
 * and knocks your coffee off the desk.
 *
 * Built from primitives in the same PS1 style as the rest of the desk. The
 * rig is procedural: named poses are blended every frame, legs are stretchy
 * cylinders from hip to foot, and the tail is a tube rebuilt along a blend of
 * a few curves.
 */

export type CatSound = 'purr' | 'trill' | 'meow' | 'hiss' | 'chatter' | 'thump'

export type Obstacle =
  | { kind: 'circle'; x: number; z: number; r: number }
  | { kind: 'rect'; minX: number; maxX: number; minZ: number; maxZ: number }

export interface CatSurroundings {
  /** Where he sleeps: a point on top of the monitor, and the way he faces. */
  bed: { position: Vector3; heading: number }
  /** Desk spot beside the monitor he jumps down to and back up from. */
  /** Spots on the desk he hops down to and jumps back up from, best first. */
  landings: () => Vector3[]
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number }
  /** The computer: too big to step over, so he walks around its front. */
  computer: { minX: number; maxX: number; minZ: number; maxZ: number }
  /** Everything else in the way. Called every frame, so it can change. */
  obstacles: () => Obstacle[]
  /** Height of whatever he's standing on (desk, keyboard, mouse pad). */
  surfaceHeight: (x: number, z: number) => number
  mug: {
    position: Vector3
    onDesk: () => boolean
    knock: (direction: Vector3) => void
  }
  camera: Camera
}

export interface LaserDot {
  point: Vector3
  /** True when the dot is on something he can walk to. */
  onDesk: boolean
}

export interface Fry {
  /** The cat (add to the scene; raycast against it). */
  object: Group
  /** Hearts, Zs and other sprites, in world space. */
  effects: Group
  /** World positions of the paws, and whether each is planted. */
  paws: Vector3[]
  pawPlanted: boolean[]
  update(now: number, dt: number): void
  pet(now: number): void
  setLaser(dot: LaserDot | null): void
  /** World point the cursor is over, or null. */
  setGaze(point: Vector3 | null): void
  setHovered(hovered: boolean): void
  /** Something changed in the room: an ear flicks toward it. */
  notice(): void
  status(): string
  /** World position of his head, for tooltips. */
  headPosition(target: Vector3): Vector3
  /** Ground position, for keeping him out of the floppy labels. */
  position(): Vector3
}

type Mode =
  | 'sleep'
  | 'pet'
  | 'grumpy'
  | 'wake'
  | 'jumpDown'
  | 'chase'
  | 'stalk'
  | 'pounce'
  | 'pin'
  | 'watch'
  | 'knock'
  | 'return'
  | 'jumpUp'
  | 'circle'
  | 'settle'

type PoseName = 'loaf' | 'sit' | 'stand' | 'crouch' | 'stretch' | 'air'

interface Pose {
  bodyY: number
  bodyZ: number
  bodyPitch: number
  headUp: number
  /** FL, FR, RL, RR in cat space (x = his left, z = forward). */
  feet: [Vector3, Vector3, Vector3, Vector3]
}

const v = (x: number, y: number, z: number) => new Vector3(x, y, z)

const POSES: Record<PoseName, Pose> = {
  loaf: {
    // A touch below the torso's radius so his belly sits into whatever he's
    // lying on instead of hovering over it.
    bodyY: 0.054,
    bodyZ: 0,
    bodyPitch: 0,
    headUp: -0.012,
    feet: [v(0.03, 0.03, 0.07), v(-0.03, 0.03, 0.07), v(0.035, 0.03, -0.06), v(-0.035, 0.03, -0.06)],
  },
  sit: {
    bodyY: 0.108,
    bodyZ: -0.01,
    bodyPitch: 0.7,
    headUp: 0,
    feet: [v(0.028, 0, 0.075), v(-0.028, 0, 0.075), v(0.05, 0, -0.03), v(-0.05, 0, -0.03)],
  },
  stand: {
    bodyY: 0.135,
    bodyZ: 0,
    bodyPitch: 0,
    headUp: 0,
    feet: [v(0.034, 0, 0.09), v(-0.034, 0, 0.09), v(0.036, 0, -0.085), v(-0.036, 0, -0.085)],
  },
  crouch: {
    bodyY: 0.075,
    bodyZ: 0,
    bodyPitch: -0.05,
    headUp: -0.01,
    feet: [v(0.038, 0, 0.1), v(-0.038, 0, 0.1), v(0.045, 0, -0.07), v(-0.045, 0, -0.07)],
  },
  stretch: {
    bodyY: 0.1,
    bodyZ: 0.02,
    bodyPitch: -0.4,
    headUp: 0.01,
    feet: [v(0.03, 0, 0.22), v(-0.03, 0, 0.22), v(0.036, 0, -0.08), v(-0.036, 0, -0.08)],
  },
  air: {
    bodyY: 0.13,
    bodyZ: 0,
    bodyPitch: 0.1,
    headUp: 0,
    feet: [v(0.03, 0.05, 0.17), v(-0.03, 0.05, 0.17), v(0.035, 0.06, -0.15), v(-0.035, 0.06, -0.15)],
  },
}

/** Tail shapes, five points each in cat space; blended by weight. */
const TAILS = {
  // Hanging over the front of the monitor.
  dangle: [v(0, 0.026, -0.11), v(0.045, 0.016, -0.155), v(0.085, -0.019, -0.18), v(0.095, -0.059, -0.185), v(0.1, -0.094, -0.17)],
  // Curled around his feet.
  wrap: [v(0, 0.03, -0.12), v(0.05, 0.012, -0.14), v(0.085, 0.008, -0.07), v(0.08, 0.008, 0.02), v(0.05, 0.008, 0.09)],
  // Up, with a hook at the tip.
  up: [v(0, 0.03, -0.12), v(0, 0.07, -0.16), v(0, 0.15, -0.18), v(0, 0.21, -0.17), v(0, 0.24, -0.13)],
  // Low and straight back, for hunting.
  low: [v(0, 0.02, -0.12), v(0, 0.01, -0.18), v(0, 0.005, -0.25), v(0, 0.005, -0.31), v(0, 0.012, -0.36)],
}
type TailName = keyof typeof TAILS

const HIPS = [v(0.035, -0.035, 0.085), v(-0.035, -0.035, 0.085), v(0.04, -0.035, -0.085), v(-0.04, -0.035, -0.085)]
const NECK = v(0, 0.045, 0.125)
const TAIL_BASE = v(0, 0.02, -0.125)
const GAIT_OFFSETS = [0, 0.5, 0.5, 0]
const CAT_RADIUS = 0.065

const STATUS: Record<Mode, string> = {
  sleep: 'Asleep on the warm monitor. Click to pet him.',
  pet: 'Purring. Not too many pets, though.',
  grumpy: 'That was too many pets.',
  wake: 'Awake. He saw the laser.',
  jumpDown: 'Coming down off the monitor',
  chase: 'Hunting the red dot',
  stalk: 'Wiggling his butt. Pounce incoming.',
  pounce: 'Pounce!',
  pin: 'Got it. Probably.',
  watch: 'Staring at the red dot',
  knock: 'Eyeing your coffee',
  return: 'Heading back to the warm monitor',
  jumpUp: 'Back up onto the monitor',
  circle: 'Turning around three times',
  settle: 'Settling in for a nap',
}

const angleDiff = (a: number, b: number) => {
  let d = (b - a) % (Math.PI * 2)
  if (d > Math.PI) d -= Math.PI * 2
  if (d < -Math.PI) d += Math.PI * 2
  return d
}

const smooth = (rate: number, dt: number) => 1 - Math.exp(-rate * dt)

export function createFry(world: CatSurroundings, emit: (sound: CatSound) => void): Fry {
  const object = new Group()
  object.userData.target = { kind: 'cat' }
  const effects = new Group()

  // ------------------------------------------------------------ model
  const fur = lambert({ map: catTexture() })
  const legFur = lambert({ color: '#cf6f25' })
  const cream = lambert({ color: '#f2c79a' })
  const pawMaterial = lambert({ color: '#e9a060' })

  const body = new Group()
  object.add(body)
  const addPart = (scale: [number, number, number], position: [number, number, number], material: Material) => {
    const mesh = new Mesh(new SphereGeometry(1, 14, 10), material)
    mesh.scale.set(...scale)
    mesh.position.set(...position)
    mesh.castShadow = true
    body.add(mesh)
    return mesh
  }
  const torso = addPart([0.068, 0.058, 0.13], [0, 0, 0], fur)
  addPart([0.06, 0.062, 0.066], [0, 0.006, 0.08], fur)
  addPart([0.066, 0.06, 0.068], [0, 0.004, -0.08], fur)

  // Head, in cat space (it doesn't inherit the body's pitch).
  const head = new Group()
  object.add(head)
  const skull = new Mesh(new SphereGeometry(0.05, 14, 10), lambert({ map: catFaceTexture() }))
  skull.scale.set(1, 0.9, 0.95)
  skull.castShadow = true
  head.add(skull)
  const muzzle = new Mesh(new SphereGeometry(0.02, 10, 8), cream)
  muzzle.scale.set(1.25, 0.8, 0.9)
  muzzle.position.set(0, -0.016, 0.038)
  head.add(muzzle)
  const nose = new Mesh(new BoxGeometry(0.009, 0.005, 0.004), lambert({ color: '#e8a3a0' }))
  nose.position.set(0, -0.006, 0.056)
  head.add(nose)
  const mouth = new Mesh(new BoxGeometry(0.014, 0.012, 0.004), lambert({ color: '#5a1a24' }))
  mouth.position.set(0, -0.028, 0.048)
  head.add(mouth)

  // Open eyes glow a little in the dark, like cats' eyes do.
  const eyeMaterial = unlit({ color: '#d6f25a' })
  const pupilMaterial = unlit({ color: '#0b0b08' })
  const eyes: Mesh[] = []
  const pupils: Mesh[] = []
  for (const side of [1, -1]) {
    const eye = new Mesh(new SphereGeometry(0.0078, 8, 6), eyeMaterial)
    eye.position.set(side * 0.0195, 0.006, 0.042)
    eye.scale.set(1, 1, 0.6)
    head.add(eye)
    eyes.push(eye)
    const pupil = new Mesh(new BoxGeometry(0.0028, 0.011, 0.002), pupilMaterial)
    pupil.position.set(side * 0.0195, 0.006, 0.0468)
    head.add(pupil)
    pupils.push(pupil)
  }

  const earMaterial = lambert({ color: '#c96a24' })
  const innerEarMaterial = lambert({ color: '#d98a8a' })
  const ears: Group[] = []
  for (const side of [1, -1]) {
    const pivot = new Group()
    pivot.position.set(side * 0.027, 0.034, -0.006)
    const ear = new Mesh(new ConeGeometry(0.018, 0.034, 4), earMaterial)
    ear.position.y = 0.016
    ear.rotation.y = Math.PI / 4
    ear.castShadow = true
    pivot.add(ear)
    const inner = new Mesh(new ConeGeometry(0.01, 0.022, 3), innerEarMaterial)
    inner.position.set(0, 0.013, 0.007)
    pivot.add(inner)
    pivot.userData.side = side
    head.add(pivot)
    ears.push(pivot)
  }

  {
    const points: number[] = []
    for (const side of [1, -1]) {
      for (let i = 0; i < 3; i++) {
        points.push(side * 0.016, -0.014, 0.05, side * 0.07, -0.022 + i * 0.01, 0.05 + i * 0.004)
      }
    }
    const geometry = new BufferGeometry()
    geometry.setAttribute('position', new Float32BufferAttribute(points, 3))
    const whiskers = new LineSegments(
      geometry,
      new LineBasicMaterial({ color: '#fff4dc', transparent: true, opacity: 0.55 }),
    )
    // Lines are picked with a generous threshold; whiskers shouldn't catch
    // clicks or the laser from across the room.
    whiskers.raycast = () => {}
    head.add(whiskers)
  }

  // Red collar with a gold tag.
  const collar = new Mesh(new TorusGeometry(0.034, 0.006, 6, 16), lambert({ color: '#c0262d' }))
  collar.position.set(0, -0.03, -0.024)
  collar.rotation.x = Math.PI / 2 + 0.35
  head.add(collar)
  const tag = new Mesh(
    new BoxGeometry(0.013, 0.015, 0.003),
    lambert({ color: '#e8c040', emissive: '#4a3a08' }),
  )
  tag.position.set(0, -0.062, 0.006)
  tag.rotation.x = 0.2
  head.add(tag)

  // Legs: stretchy cylinders from hip to foot, with a paw at the foot.
  const legGeometry = new CylinderGeometry(0.017, 0.012, 1, 6)
  legGeometry.translate(0, -0.5, 0)
  const legs: Mesh[] = []
  const pawMeshes: Mesh[] = []
  for (let i = 0; i < 4; i++) {
    const leg = new Mesh(legGeometry, legFur)
    leg.castShadow = true
    object.add(leg)
    legs.push(leg)
    const paw = new Mesh(new SphereGeometry(0.016, 8, 6), pawMaterial)
    paw.scale.set(1, 0.6, 1.3)
    paw.castShadow = true
    object.add(paw)
    pawMeshes.push(paw)
  }

  const tail = new Mesh(new TubeGeometry(new CatmullRomCurve3([v(0, 0, 0), v(0, 0, -1)]), 2, 0.013, 5), fur)
  tail.castShadow = true
  object.add(tail)

  // Sprites: hearts when he's happy, Zs while he sleeps.
  const heartTexture = canvasTexture(16, 16, (ctx) => dosText(ctx, '♥', 4, 0, '#ff5f87'))
  const hearts: Array<{ sprite: Sprite; born: number }> = []
  for (let i = 0; i < 6; i++) {
    const sprite = new Sprite(
      new SpriteMaterial({ map: heartTexture, transparent: true, opacity: 0, depthWrite: false }),
    )
    sprite.scale.setScalar(0.03)
    effects.add(sprite)
    hearts.push({ sprite, born: -Infinity })
  }
  const zTexture = canvasTexture(16, 16, (ctx) => dosText(ctx, 'z', 4, 0, '#ffffff'))
  const zees: Sprite[] = []
  for (let i = 0; i < 3; i++) {
    const z = new Sprite(
      new SpriteMaterial({ map: zTexture, transparent: true, opacity: 0, depthWrite: false }),
    )
    z.userData.phase = i / 3
    effects.add(z)
    zees.push(z)
  }

  // ------------------------------------------------------------ state
  const pos = world.bed.position.clone()
  let heading = world.bed.heading
  let onBed = true
  let mode: Mode = 'sleep'
  let modeTime = 0
  let modeData: Record<string, number> = {}

  const pose: Pose = {
    bodyY: POSES.loaf.bodyY,
    bodyZ: 0,
    bodyPitch: 0,
    headUp: POSES.loaf.headUp,
    feet: POSES.loaf.feet.map((f) => f.clone()) as Pose['feet'],
  }
  let poseTarget: PoseName = 'loaf'
  const tailWeights: Record<TailName, number> = { dangle: 1, wrap: 0, up: 0, low: 0 }
  const tailGoal: Record<TailName, number> = { dangle: 1, wrap: 0, up: 0, low: 0 }
  let headYaw = 0.85
  let headPitch = 0.35
  let headRoll = 0
  let eyeOpen = 0
  let earsBack = 0
  let mouthOpen = 0
  let gaitPhase = 0
  let gaitAmount = 0
  let speedNow = 0

  let laser: LaserDot | null = null
  let gaze: Vector3 | null = null
  let hovered = false
  let petTimes: number[] = []
  let lastPurr = -Infinity
  let lastChatter = -Infinity
  let nextIdle = performance.now() + 9000
  let idle: { kind: 'yawn' | 'paw' | 'ears' | 'dream' | 'tail'; start: number } | null = null
  let nextBlink = performance.now() + 3000
  let blinkUntil = 0
  let swipe = { start: -Infinity, duration: 0.3, target: v(0, 0, 0), foot: 1 }

  const paws = [v(0, 0, 0), v(0, 0, 0), v(0, 0, 0), v(0, 0, 0)]
  const pawPlanted = [true, true, true, true]

  function setMode(next: Mode, data: Record<string, number> = {}) {
    mode = next
    modeTime = 0
    modeData = data
  }

  // ------------------------------------------------------------ helpers
  const tmp = new Vector3()

  function lookAtWorld(point: Vector3, maxYaw = 1.3) {
    object.worldToLocal(tmp.copy(point))
    tmp.sub(head.position)
    const yaw = Math.atan2(tmp.x, tmp.z)
    const pitch = -Math.atan2(tmp.y, Math.hypot(tmp.x, tmp.z))
    return {
      yaw: MathUtils.clamp(yaw, -maxYaw, maxYaw),
      pitch: MathUtils.clamp(pitch, -0.7, 0.8),
    }
  }

  function allObstacles(): Obstacle[] {
    const c = world.computer
    return [{ kind: 'rect', minX: c.minX, maxX: c.maxX, minZ: c.minZ, maxZ: c.maxZ }, ...world.obstacles()]
  }

  /** Move a point out of every obstacle (grown by `radius`) and into bounds. */
  function pushOut(point: { x: number; z: number }, obstacles: Obstacle[], radius: number) {
    const b = world.bounds
    point.x = MathUtils.clamp(point.x, b.minX, b.maxX)
    point.z = MathUtils.clamp(point.z, b.minZ, b.maxZ)
    for (const o of obstacles) {
      if (o.kind === 'circle') {
        const dx = point.x - o.x
        const dz = point.z - o.z
        const d = Math.hypot(dx, dz)
        const min = o.r + radius
        if (d < min && d > 1e-6) {
          point.x = o.x + (dx / d) * min
          point.z = o.z + (dz / d) * min
        }
      } else {
        const minX = o.minX - radius
        const maxX = o.maxX + radius
        const minZ = o.minZ - radius
        const maxZ = o.maxZ + radius
        if (point.x > minX && point.x < maxX && point.z > minZ && point.z < maxZ) {
          const pushes = [point.x - minX, maxX - point.x, point.z - minZ, maxZ - point.z]
          const least = Math.min(...pushes)
          if (least === pushes[0]) point.x = minX
          else if (least === pushes[1]) point.x = maxX
          else if (least === pushes[2]) point.z = minZ
          else point.z = maxZ
        }
      }
    }
  }

  function resolveCollisions() {
    pushOut(pos, allObstacles(), CAT_RADIUS)
  }

  // ------------------------------------------------------------ routing
  // A small visibility graph. Detour points sit just off the corners of boxes,
  // on an octagon around round things and in the middle of the gaps between
  // neighbours; any two that can see each other are joined. The graph only
  // changes when something on the desk moves, so it's cached.
  const CLEARANCE = CAT_RADIUS + 0.006
  const NODE_GAP = CAT_RADIUS + 0.02
  /** Lines from where he stands get a little slack, since he's touching things. */
  const START_CLEARANCE = CAT_RADIUS * 0.85
  type Point = [number, number]
  const gapBetween = (a: Point, b: Point) => Math.hypot(b[0] - a[0], b[1] - a[1])

  function segmentHits(o: Obstacle, a: Point, b: Point, clearance: number) {
    const dx = b[0] - a[0]
    const dz = b[1] - a[1]
    if (o.kind === 'circle') {
      const len2 = dx * dx + dz * dz
      const t = len2 > 0 ? MathUtils.clamp(((o.x - a[0]) * dx + (o.z - a[1]) * dz) / len2, 0, 1) : 0
      const px = a[0] + dx * t - o.x
      const pz = a[1] + dz * t - o.z
      return px * px + pz * pz < (o.r + clearance) ** 2
    }
    // Slab test against the box grown by the clearance.
    let t0 = 0
    let t1 = 1
    const axes: Array<[number, number, number, number]> = [
      [a[0], dx, o.minX - clearance, o.maxX + clearance],
      [a[1], dz, o.minZ - clearance, o.maxZ + clearance],
    ]
    for (const [p, d, lo, hi] of axes) {
      if (Math.abs(d) < 1e-9) {
        if (p <= lo || p >= hi) return false
        continue
      }
      let ta = (lo - p) / d
      let tb = (hi - p) / d
      if (ta > tb) [ta, tb] = [tb, ta]
      t0 = Math.max(t0, ta)
      t1 = Math.min(t1, tb)
      if (t0 >= t1) return false
    }
    return true
  }

  function insideObstacle(o: Obstacle, x: number, z: number, clearance: number) {
    if (o.kind === 'circle') return Math.hypot(x - o.x, z - o.z) < o.r + clearance
    return x > o.minX - clearance && x < o.maxX + clearance && z > o.minZ - clearance && z < o.maxZ + clearance
  }

  function blocked(a: Point, b: Point, clearance: number, obstacles = allObstacles()) {
    return obstacles.some((o) => segmentHits(o, a, b, clearance))
  }

  /** The closest pair of points on two obstacles' outlines. */
  function closestPoints(a: Obstacle, b: Obstacle): [Point, Point] {
    if (a.kind === 'circle' && b.kind === 'circle') {
      const d = Math.hypot(b.x - a.x, b.z - a.z) || 1
      const ux = (b.x - a.x) / d
      const uz = (b.z - a.z) / d
      return [
        [a.x + ux * a.r, a.z + uz * a.r],
        [b.x - ux * b.r, b.z - uz * b.r],
      ]
    }
    if (a.kind === 'circle') {
      const [onB, onA] = closestPoints(b, a)
      return [onA, onB]
    }
    if (b.kind === 'circle') {
      const q: Point = [MathUtils.clamp(b.x, a.minX, a.maxX), MathUtils.clamp(b.z, a.minZ, a.maxZ)]
      const d = Math.hypot(q[0] - b.x, q[1] - b.z) || 1
      return [q, [b.x + ((q[0] - b.x) / d) * b.r, b.z + ((q[1] - b.z) / d) * b.r]]
    }
    // Two boxes, one axis at a time.
    const axis = (aLo: number, aHi: number, bLo: number, bHi: number): [number, number] => {
      if (aHi < bLo) return [aHi, bLo]
      if (bHi < aLo) return [aLo, bHi]
      const overlap = (Math.max(aLo, bLo) + Math.min(aHi, bHi)) / 2
      return [overlap, overlap]
    }
    const [ax, bx] = axis(a.minX, a.maxX, b.minX, b.maxX)
    const [az, bz] = axis(a.minZ, a.maxZ, b.minZ, b.maxZ)
    return [
      [ax, az],
      [bx, bz],
    ]
  }

  interface RoutingGraph {
    key: string
    nodes: Point[]
    links: number[][]
  }
  let graph: RoutingGraph | null = null

  function routingGraph(obstacles: Obstacle[]): RoutingGraph {
    const b = world.bounds
    const key = JSON.stringify([obstacles, b])
    if (graph?.key === key) return graph
    const candidates: Point[] = []
    for (const o of obstacles) {
      if (o.kind === 'rect') {
        candidates.push(
          [o.minX - NODE_GAP, o.minZ - NODE_GAP],
          [o.maxX + NODE_GAP, o.minZ - NODE_GAP],
          [o.minX - NODE_GAP, o.maxZ + NODE_GAP],
          [o.maxX + NODE_GAP, o.maxZ + NODE_GAP],
        )
      } else {
        const r = (o.r + NODE_GAP) / Math.cos(Math.PI / 8)
        for (let i = 0; i < 8; i++) {
          const angle = (i + 0.5) * (Math.PI / 4)
          candidates.push([o.x + Math.cos(angle) * r, o.z + Math.sin(angle) * r])
        }
      }
    }
    // The middle of each narrow gap, which corner points tend to miss.
    for (let i = 0; i < obstacles.length; i++) {
      for (let j = i + 1; j < obstacles.length; j++) {
        const [p, q] = closestPoints(obstacles[i], obstacles[j])
        const gap = gapBetween(p, q)
        if (gap > 2 * CLEARANCE && gap < 0.5) candidates.push([(p[0] + q[0]) / 2, (p[1] + q[1]) / 2])
      }
    }
    const nodes = candidates
      .map(([x, z]): Point => [MathUtils.clamp(x, b.minX, b.maxX), MathUtils.clamp(z, b.minZ, b.maxZ)])
      .filter(([x, z]) => !obstacles.some((o) => insideObstacle(o, x, z, CLEARANCE)))
    const links = nodes.map((): number[] => [])
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        if (blocked(nodes[i], nodes[j], CLEARANCE, obstacles)) continue
        links[i].push(j)
        links[j].push(i)
      }
    }
    graph = { key, nodes, links }
    return graph
  }

  /**
   * Shortest way to `goal` around everything on the desk. If there's no way
   * through, the route ends at the closest point he can get to.
   */
  function plan(goal: Point): { path: Point[]; reached: boolean } {
    const obstacles = allObstacles()
    const start: Point = [pos.x, pos.z]
    if (!blocked(start, goal, START_CLEARANCE, obstacles)) return { path: [goal], reached: true }

    // Dijkstra over the cached graph, with the start and goal hooked in.
    const { nodes, links } = routingGraph(obstacles)
    const n = nodes.length
    const dist = new Array<number>(n).fill(Infinity)
    const prev = new Array<number>(n).fill(-1)
    const done = new Array<boolean>(n).fill(false)
    for (let i = 0; i < n; i++) {
      if (!blocked(start, nodes[i], START_CLEARANCE, obstacles)) dist[i] = gapBetween(start, nodes[i])
    }
    let best = Infinity
    let bestEnd = -1
    for (;;) {
      let u = -1
      for (let i = 0; i < n; i++) if (!done[i] && dist[i] < (u < 0 ? Infinity : dist[u])) u = i
      if (u < 0 || dist[u] >= best) break
      done[u] = true
      if (!blocked(nodes[u], goal, CLEARANCE, obstacles)) {
        const d = dist[u] + gapBetween(nodes[u], goal)
        if (d < best) {
          best = d
          bestEnd = u
        }
      }
      for (const v of links[u]) {
        const d = dist[u] + gapBetween(nodes[u], nodes[v])
        if (d < dist[v]) {
          dist[v] = d
          prev[v] = u
        }
      }
    }
    const trace = (end: number) => {
      const path: Point[] = []
      for (let v = end; v >= 0; v = prev[v]) path.unshift(nodes[v])
      return path
    }
    if (bestEnd >= 0) return { path: [...trace(bestEnd), goal], reached: true }

    // No way through: get as close as he can and look at it from there.
    let end = -1
    let closest = gapBetween(start, goal) - 0.02
    for (let i = 0; i < n; i++) {
      if (dist[i] < Infinity && gapBetween(nodes[i], goal) < closest) {
        closest = gapBetween(nodes[i], goal)
        end = i
      }
    }
    return { path: end >= 0 ? trace(end) : [start], reached: false }
  }

  /** Where he'd actually stand to reach `target`: nudged clear of obstacles. */
  function freeGoal(target: Vector3): Point {
    const free = { x: target.x, z: target.z }
    const obstacles = allObstacles()
    for (let pass = 0; pass < 3; pass++) pushOut(free, obstacles, CLEARANCE + 0.004)
    return [free.x, free.z]
  }

  /** How far he'd walk to get to `target`, or Infinity if he can't. */
  function routeLength(target: Vector3) {
    const { path, reached } = plan(freeGoal(target))
    if (!reached) return Infinity
    let length = 0
    let from: Point = [pos.x, pos.z]
    for (const p of path) {
      length += Math.hypot(p[0] - from[0], p[1] - from[1])
      from = p
    }
    return length
  }

  let route: Point[] = []
  let routeReaches = true
  /** True while he's as close as he can get and the target is still out of reach. */
  let cornered = false
  let routeGoal: Point | null = null
  let routePlannedAt = -Infinity
  let clock = 0

  /** Next point to head for on the way to `target`. */
  function nextStop(target: Vector3): Point {
    const goal = freeGoal(target)
    const moved = !routeGoal || Math.hypot(goal[0] - routeGoal[0], goal[1] - routeGoal[1]) > 0.04
    if (moved || clock - routePlannedAt > 500 || route.length === 0) {
      const planned = plan(goal)
      route = planned.path
      routeReaches = planned.reached
      routeGoal = goal
      routePlannedAt = clock
    }
    // Cut corners once the next turn is already in sight.
    const here: Point = [pos.x, pos.z]
    while (
      route.length > 1 &&
      (Math.hypot(route[0][0] - pos.x, route[0][1] - pos.z) < 0.035 || !blocked(here, route[1], START_CLEARANCE))
    ) {
      route.shift()
    }
    return route[0]
  }

  /** The landing spot he'll jump back up from: the nearest one he can walk to. */
  const landing = new Vector3()
  function pickLanding() {
    const spots = world.landings()
    let best = spots[0]
    let bestLength = Infinity
    for (const spot of spots) {
      const length = routeLength(spot)
      if (length < bestLength) {
        best = spot
        bestLength = length
      }
    }
    landing.copy(best)
  }

  /** Walk toward a point; returns the remaining distance. */
  function walkToward(target: Vector3, maxSpeed: number, dt: number, stopAt = 0.02) {
    const [goalX, goalZ] = nextStop(target)
    const dx = goalX - pos.x
    const dz = goalZ - pos.z
    const finalDist = Math.hypot(target.x - pos.x, target.z - pos.z)
    cornered = !routeReaches && route.length === 1 && Math.hypot(dx, dz) < 0.035
    if (finalDist < stopAt || cornered) {
      // Close enough (or as close as he can get): stop and look at it.
      speedNow = MathUtils.lerp(speedNow, 0, smooth(10, dt))
      if (finalDist > 0.05) {
        const toTarget = Math.atan2(target.x - pos.x, target.z - pos.z)
        heading += MathUtils.clamp(angleDiff(heading, toTarget), -5 * dt, 5 * dt)
      }
      return finalDist
    }
    const desired = Math.atan2(dx, dz)
    const diff = angleDiff(heading, desired)
    heading += MathUtils.clamp(diff, -6 * dt, 6 * dt)
    const align = MathUtils.clamp(Math.cos(diff), 0, 1)
    const speed = maxSpeed * align * MathUtils.clamp(finalDist / 0.12, 0.35, 1)
    speedNow = MathUtils.lerp(speedNow, speed, smooth(8, dt))
    const step = speedNow * dt
    pos.x += Math.sin(heading) * step
    pos.z += Math.cos(heading) * step
    resolveCollisions()
    return finalDist
  }

  function groundHeight() {
    return world.surfaceHeight(pos.x, pos.z)
  }

  function jumpArc(from: Vector3, to: Vector3, t: number, height: number) {
    pos.lerpVectors(from, to, t)
    pos.y += 4 * height * t * (1 - t)
  }

  function spawnHeart(now: number) {
    const free = hearts.reduce((a, b) => (a.born < b.born ? a : b))
    free.born = now
  }

  function laserDistance() {
    if (!laser) return Infinity
    return Math.hypot(laser.point.x - pos.x, laser.point.z - pos.z)
  }

  // ------------------------------------------------------------ brain
  function think(now: number, dt: number) {
    modeTime += dt
    const t = modeTime
    const recentPets = petTimes.filter((p) => now - p < 8000)
    petTimes = recentPets

    switch (mode) {
      case 'sleep': {
        poseTarget = 'loaf'
        if (laser) {
          emit('trill')
          setMode('wake')
        }
        break
      }

      case 'pet': {
        poseTarget = onBed ? 'loaf' : 'sit'
        if (now - (petTimes[petTimes.length - 1] ?? 0) > 2600) {
          setMode(onBed ? 'sleep' : laser ? 'chase' : 'return')
        }
        break
      }

      case 'grumpy': {
        poseTarget = onBed ? 'loaf' : 'sit'
        if (t > 4.5) {
          petTimes = []
          setMode(onBed ? 'sleep' : laser ? 'chase' : 'return')
        }
        break
      }

      case 'wake': {
        // Up, a big stretch, then turn toward the edge and hop down.
        if (!laser && t < 1.6) {
          setMode('settle')
          break
        }
        poseTarget = t < 0.5 ? 'stand' : t < 1.4 ? 'stretch' : t < 1.9 ? 'stand' : 'crouch'
        if (t > 1.4) {
          landing.copy(world.landings()[0])
          const desired = Math.atan2(landing.x - pos.x, landing.z - pos.z)
          heading += MathUtils.clamp(angleDiff(heading, desired), -5 * dt, 5 * dt)
        }
        if (t > 2.2) {
          setMode('jumpDown', { fromX: pos.x, fromY: pos.y, fromZ: pos.z })
          onBed = false
        }
        break
      }

      case 'jumpDown':
      case 'jumpUp': {
        const duration = 0.6
        const from = v(modeData.fromX, modeData.fromY, modeData.fromZ)
        const to =
          mode === 'jumpDown'
            ? landing.clone().setY(world.surfaceHeight(landing.x, landing.z))
            : world.bed.position
        poseTarget = 'air'
        const p = Math.min(1, t / duration)
        jumpArc(from, to, p, mode === 'jumpDown' ? 0.12 : 0.3)
        heading += MathUtils.clamp(angleDiff(heading, Math.atan2(to.x - from.x, to.z - from.z)), -8 * dt, 8 * dt)
        if (p >= 1) {
          emit('thump')
          if (mode === 'jumpDown') {
            setMode(laser ? 'chase' : 'return')
          } else {
            onBed = true
            setMode('circle', { start: heading })
          }
        }
        break
      }

      case 'chase': {
        poseTarget = 'stand'
        if (!laser) {
          emit('meow')
          setMode('return')
          break
        }
        if (!laser.onDesk) {
          setMode('watch')
          break
        }
        // Coffee nearby: obviously it has to go.
        const mug = world.mug
        if (
          mug.onDesk() &&
          Math.hypot(laser.point.x - mug.position.x, laser.point.z - mug.position.z) < 0.14 &&
          Math.hypot(pos.x - mug.position.x, pos.z - mug.position.z) < 0.45
        ) {
          setMode('knock')
          break
        }
        const dist = laserDistance()
        const running = dist > 0.35
        walkToward(laser.point, running ? 0.62 : 0.32, dt, 0.16)
        if (cornered && dist >= 0.24) {
          // Can't get to it from here. Sit and stare until it moves.
          setMode('watch', { x: laser.point.x, z: laser.point.z, stuck: 1 })
          break
        }
        const facing = Math.abs(angleDiff(heading, Math.atan2(laser.point.x - pos.x, laser.point.z - pos.z)))
        if (dist < 0.24 && facing < 0.5) {
          setMode('stalk', { x: laser.point.x, z: laser.point.z })
        }
        break
      }

      case 'stalk': {
        poseTarget = 'crouch'
        speedNow = 0
        if (!laser || !laser.onDesk) {
          setMode(laser ? 'watch' : 'return')
          break
        }
        const desired = Math.atan2(laser.point.x - pos.x, laser.point.z - pos.z)
        heading += MathUtils.clamp(angleDiff(heading, desired), -4 * dt, 4 * dt)
        const moved = Math.hypot(laser.point.x - modeData.x, laser.point.z - modeData.z)
        if (moved > 0.07) {
          setMode('chase')
        } else if (t > 0.85) {
          const forward = v(Math.sin(heading), 0, Math.cos(heading))
          const land = laser.point.clone().addScaledVector(forward, -0.11)
          land.y = world.surfaceHeight(land.x, land.z)
          setMode('pounce', { fromX: pos.x, fromY: pos.y, fromZ: pos.z, toX: land.x, toY: land.y, toZ: land.z })
        }
        break
      }

      case 'pounce': {
        poseTarget = 'air'
        const p = Math.min(1, t / 0.32)
        jumpArc(
          v(modeData.fromX, modeData.fromY, modeData.fromZ),
          v(modeData.toX, modeData.toY, modeData.toZ),
          p,
          0.07,
        )
        if (p >= 1) {
          resolveCollisions()
          emit('thump')
          setMode('pin', { x: laser?.point.x ?? 0, z: laser?.point.z ?? 0 })
        }
        break
      }

      case 'pin': {
        poseTarget = 'crouch'
        if (!laser) {
          setMode('return')
          break
        }
        const moved = Math.hypot(laser.point.x - modeData.x, laser.point.z - modeData.z)
        if (t > 0.5 && moved > 0.05) setMode(laser.onDesk ? 'chase' : 'watch')
        else if (t > 2.2) setMode('watch')
        break
      }

      case 'watch': {
        poseTarget = 'sit'
        speedNow = 0
        if (!laser) {
          setMode('return')
          break
        }
        const stillOutOfReach =
          modeData.stuck === 1 && Math.hypot(laser.point.x - modeData.x, laser.point.z - modeData.z) < 0.05
        if (stillOutOfReach) {
          const desired = Math.atan2(laser.point.x - pos.x, laser.point.z - pos.z)
          heading += MathUtils.clamp(angleDiff(heading, desired), -4 * dt, 4 * dt)
        }
        if (laser.onDesk && !stillOutOfReach && (laserDistance() > 0.28 || t > 1.2)) {
          setMode('chase')
          break
        }
        if (!laser.onDesk && now - lastChatter > 5000) {
          lastChatter = now
          emit('chatter')
        }
        break
      }

      case 'knock': {
        const mug = world.mug
        if (!mug.onDesk() && (modeData.swiped ?? 0) === 0) {
          setMode(laser ? 'chase' : 'return')
          break
        }
        // Walk up beside the mug, look at you, then swat it off the desk.
        if (modeData.standX === undefined) {
          const away = v(pos.x - mug.position.x, 0, pos.z - mug.position.z)
          if (away.lengthSq() < 1e-6) away.set(1, 0, 0)
          away.normalize()
          modeData.standX = mug.position.x + away.x * 0.15
          modeData.standZ = mug.position.z + away.z * 0.15
        }
        if (!modeData.arrived) {
          poseTarget = 'stand'
          const d = walkToward(v(modeData.standX, 0, modeData.standZ), 0.35, dt, 0.03)
          if (d < 0.035 || t > 3) {
            modeData.arrived = 1
            modeData.at = t
          }
          break
        }
        poseTarget = 'sit'
        speedNow = 0
        const since = t - modeData.at
        const toMug = Math.atan2(mug.position.x - pos.x, mug.position.z - pos.z)
        heading += MathUtils.clamp(angleDiff(heading, toMug), -4 * dt, 4 * dt)
        if (since > 0.4 && !modeData.meowed) {
          modeData.meowed = 1
          emit('meow')
        }
        if (since > 1.6 && !modeData.swiped) {
          modeData.swiped = 1
          object.worldToLocal(tmp.copy(mug.position))
          swipe = { start: now, duration: 0.32, target: tmp.clone().setY(0.06), foot: 0 }
        }
        if (modeData.swiped === 1 && now - swipe.start > 160) {
          modeData.swiped = 2
          const direction = v(mug.position.x - pos.x, 0, mug.position.z - pos.z).normalize()
          direction.z = Math.max(direction.z, 0.6)
          mug.knock(direction.normalize())
        }
        if (since > 3.6) setMode(laser ? 'chase' : 'return')
        break
      }

      case 'return': {
        if (laser) {
          setMode(laser.onDesk ? 'chase' : 'watch')
          break
        }
        poseTarget = 'stand'
        if (!modeData.pickedAt || clock - modeData.pickedAt > 1000) {
          pickLanding()
          modeData.pickedAt = clock
        }
        const d = walkToward(landing, 0.32, dt, 0.03)
        // Boxed in somewhere? He'll just make the jump from where he is.
        modeData.boxedIn = cornered ? (modeData.boxedIn ?? 0) + dt : 0
        if (d < 0.035 || modeData.boxedIn > 1) {
          const desired = Math.atan2(world.bed.position.x - pos.x, world.bed.position.z - pos.z)
          const diff = angleDiff(heading, desired)
          heading += MathUtils.clamp(diff, -5 * dt, 5 * dt)
          poseTarget = 'crouch'
          modeData.ready = (modeData.ready ?? 0) + dt
          if (Math.abs(diff) < 0.15 && modeData.ready > 0.35) {
            setMode('jumpUp', { fromX: pos.x, fromY: pos.y, fromZ: pos.z })
          }
        }
        break
      }

      case 'circle': {
        // The traditional three-quarter turn before lying down.
        poseTarget = 'stand'
        const duration = 1.5
        const p = Math.min(1, t / duration)
        const total = Math.PI * 2 + angleDiff(modeData.start, world.bed.heading)
        heading = modeData.start + total * MathUtils.smoothstep(p, 0, 1)
        gaitPhase += dt * 2.2
        gaitAmount = MathUtils.lerp(gaitAmount, 0.5, smooth(6, dt))
        if (p >= 1) {
          heading = world.bed.heading
          setMode('settle')
        }
        break
      }

      case 'settle': {
        poseTarget = 'loaf'
        if (t > 1) setMode(laser ? 'wake' : 'sleep')
        break
      }
    }
  }

  // ------------------------------------------------------------ body
  const hip = new Vector3()
  const foot = new Vector3()
  const dir = new Vector3()
  const curve = [v(0, 0, 0), v(0, 0, 0), v(0, 0, 0), v(0, 0, 0), v(0, 0, 0)]

  function animate(now: number, dt: number) {
    const t = modeTime
    const target = POSES[poseTarget]
    const k = smooth(poseTarget === 'air' ? 14 : 7, dt)
    pose.bodyY = MathUtils.lerp(pose.bodyY, target.bodyY, k)
    pose.bodyZ = MathUtils.lerp(pose.bodyZ, target.bodyZ, k)
    pose.bodyPitch = MathUtils.lerp(pose.bodyPitch, target.bodyPitch, k)
    pose.headUp = MathUtils.lerp(pose.headUp, target.headUp, k)
    pose.feet.forEach((f, i) => f.lerp(target.feet[i], k))

    const moving = speedNow > 0.02 || mode === 'circle'
    if (mode !== 'circle') gaitAmount = MathUtils.lerp(gaitAmount, moving ? Math.min(1, speedNow / 0.3) : 0, smooth(8, dt))
    gaitPhase += (speedNow * dt) / 0.11

    // Root.
    object.position.copy(pos)
    object.rotation.y = heading
    if (!onBed && mode !== 'jumpDown' && mode !== 'jumpUp' && mode !== 'pounce') {
      pos.y = MathUtils.lerp(pos.y, groundHeight(), smooth(12, dt))
    }

    // Body, breathing, butt wiggle.
    const breath = Math.sin(now * 0.0016)
    let roll = 0
    let rear = 0
    if (mode === 'stalk' && t > 0.25) {
      roll = Math.sin(now * 0.03) * 0.09
      rear = 0.01 + Math.sin(now * 0.03) * 0.006
    }
    body.position.set(0, pose.bodyY + rear, pose.bodyZ)
    body.rotation.set(-pose.bodyPitch, 0, roll)
    const breathing = poseTarget === 'loaf' ? breath * 0.035 : breath * 0.012
    torso.scale.y = 0.058 * (1 + breathing)
    body.updateMatrix()

    // Head position follows the neck; its rotation is its own.
    head.position.copy(NECK).applyMatrix4(body.matrix)
    head.position.y += pose.headUp

    let yawGoal = 0
    let pitchGoal = 0.05
    let rollGoal = 0
    let eyeGoal = 1
    let earsGoal = 0
    let mouthGoal = 0
    const attention = hovered || (gaze !== null && object.localToWorld(tmp.copy(head.position)).distanceTo(gaze) < 0.32)

    if (mode === 'sleep' || mode === 'settle') {
      yawGoal = onBed ? 0.85 : 0
      pitchGoal = 0.35
      eyeGoal = 0
      if (attention && gaze && mode === 'sleep') {
        const look = lookAtWorld(gaze)
        yawGoal = look.yaw
        pitchGoal = look.pitch
        eyeGoal = 0.55
      } else if (attention) {
        eyeGoal = 0.4
        pitchGoal = 0.15
      }
    } else if (mode === 'pet') {
      // Leans into it with a slow blink: cat for "I love you".
      yawGoal = onBed ? 0.8 : 0.4
      pitchGoal = -0.05
      rollGoal = 0.25
      eyeGoal = 0.12 + 0.3 * (0.5 + 0.5 * Math.cos(t * 2.4))
    } else if (mode === 'grumpy') {
      yawGoal = -0.7
      pitchGoal = 0.1
      earsGoal = 1
      eyeGoal = t < 1 ? 1 : 0.45
    } else if (mode === 'knock' && modeData.arrived) {
      const since = t - (modeData.at ?? t)
      const lookAtYou = since < 1.6 || since > 2.2
      const look = lookAtYou ? lookAtWorld(world.camera.position) : lookAtWorld(world.mug.position)
      yawGoal = look.yaw
      pitchGoal = look.pitch
      eyeGoal = lookAtYou ? 0.75 : 1
    } else if (laser && (mode === 'chase' || mode === 'stalk' || mode === 'pin' || mode === 'watch' || mode === 'pounce' || mode === 'wake')) {
      const look = lookAtWorld(laser.point)
      yawGoal = look.yaw
      pitchGoal = look.pitch
      if (mode === 'wake' && t > 0.5 && t < 1.4) {
        // Mid-stretch yawn.
        mouthGoal = 1
        eyeGoal = 0.2
        pitchGoal = -0.4
        yawGoal = 0
      }
    } else if (mode === 'return' || mode === 'circle') {
      yawGoal = 0
      pitchGoal = 0.1
      eyeGoal = 0.85
    }

    // Idle life while asleep: yawns, paw stretches, ear and tail flicks.
    if (mode === 'sleep' && !attention) {
      if (!idle && now > nextIdle) {
        const kinds = ['yawn', 'paw', 'ears', 'dream', 'tail'] as const
        idle = { kind: kinds[Math.floor(Math.random() * kinds.length)], start: now }
      }
    }
    let idleT = 0
    if (idle) {
      idleT = (now - idle.start) / 1000
      const length = idle.kind === 'yawn' ? 2.4 : idle.kind === 'paw' ? 2.2 : idle.kind === 'dream' ? 2 : 0.8
      if (mode !== 'sleep' || idleT > length) {
        idle = null
        nextIdle = now + 12000 + Math.random() * 18000
      } else if (idle.kind === 'yawn') {
        const w = Math.sin((idleT / length) * Math.PI)
        mouthGoal = w > 0.3 ? 1 : 0
        pitchGoal = MathUtils.lerp(pitchGoal, -0.35, w)
        eyeGoal = 0
      } else if (idle.kind === 'ears') {
        earsGoal = 0
      }
    }

    // Blinks while awake.
    if (eyeGoal > 0.5 && now > nextBlink) {
      blinkUntil = now + 130
      nextBlink = now + 2500 + Math.random() * 4000
    }
    if (now < blinkUntil) eyeGoal = 0

    const hk = smooth(mode === 'chase' || mode === 'stalk' ? 10 : 5, dt)
    headYaw = MathUtils.lerp(headYaw, yawGoal, hk)
    headPitch = MathUtils.lerp(headPitch, pitchGoal, hk)
    headRoll = MathUtils.lerp(headRoll, rollGoal, smooth(4, dt))
    eyeOpen = MathUtils.lerp(eyeOpen, eyeGoal, smooth(eyeGoal === 0 && now < blinkUntil ? 40 : 9, dt))
    earsBack = MathUtils.lerp(earsBack, earsGoal, smooth(10, dt))
    mouthOpen = MathUtils.lerp(mouthOpen, mouthGoal, smooth(10, dt))

    head.rotation.set(headPitch, headYaw, headRoll, 'YXZ')
    for (let i = 0; i < 2; i++) {
      eyes[i].scale.y = Math.max(0.001, eyeOpen)
      eyes[i].visible = eyeOpen > 0.06
      pupils[i].scale.y = Math.max(0.001, eyeOpen)
      pupils[i].visible = eyeOpen > 0.06
    }
    mouth.scale.y = Math.max(0.001, mouthOpen)
    mouth.visible = mouthOpen > 0.05
    const twitch = idle?.kind === 'ears' ? Math.sin(idleT * 30) * 0.4 * (1 - idleT / 0.8) : 0
    ears.forEach((ear, i) => {
      const side = ear.userData.side as number
      ear.rotation.set(-earsBack * 0.7, side * earsBack * 0.6 + (i === 0 ? twitch : 0), -side * (0.2 + earsBack * 0.5))
    })

    // Feet.
    const feet = pose.feet.map((f) => f.clone())
    if (gaitAmount > 0.01) {
      const stride = mode === 'chase' && speedNow > 0.4 ? 0.05 : 0.035
      feet.forEach((f, i) => {
        const phase = (gaitPhase + GAIT_OFFSETS[i]) * Math.PI * 2
        f.z += Math.sin(phase) * stride * gaitAmount
        f.y += Math.max(0, Math.cos(phase)) * 0.028 * gaitAmount
      })
    }
    if (mode === 'pet' && petTimes.length >= 3) {
      // Making biscuits.
      const knead = Math.sin(now * 0.008)
      feet[0].set(0.026, 0.02 + Math.max(0, knead) * 0.02, 0.16)
      feet[1].set(-0.026, 0.02 + Math.max(0, -knead) * 0.02, 0.16)
    }
    if (idle?.kind === 'paw') {
      const w = Math.sin(Math.min(1, idleT / 2.2) * Math.PI)
      feet[0].lerp(v(0.03, 0.02, 0.2), w)
    }
    if (idle?.kind === 'dream') {
      feet[0].y += Math.max(0, Math.sin(idleT * 25)) * 0.008
      feet[1].y += Math.max(0, Math.sin(idleT * 25 + 2)) * 0.008
    }
    const swipeT = (now - swipe.start) / 1000 / swipe.duration
    if (swipeT >= 0 && swipeT <= 1) {
      feet[swipe.foot].lerp(swipe.target, Math.sin(swipeT * Math.PI))
    }

    for (let i = 0; i < 4; i++) {
      hip.copy(HIPS[i]).applyMatrix4(body.matrix)
      foot.copy(feet[i])
      dir.subVectors(foot, hip)
      const length = Math.max(0.005, dir.length())
      legs[i].position.copy(hip)
      legs[i].quaternion.setFromUnitVectors(v(0, -1, 0), dir.normalize())
      legs[i].scale.set(1, length, 1)
      pawMeshes[i].position.copy(foot)
      pawMeshes[i].rotation.y = 0
      pawPlanted[i] = foot.y < 0.004 && !onBed
      object.localToWorld(paws[i].copy(foot))
    }

    // Tail.
    const goals: Record<TailName, number> = { dangle: 0, wrap: 0, up: 0, low: 0 }
    if (poseTarget === 'loaf') goals[onBed ? 'dangle' : 'wrap'] = 1
    else if (poseTarget === 'sit') goals[onBed ? 'dangle' : 'wrap'] = 1
    else if (poseTarget === 'crouch' || poseTarget === 'air') goals.low = 1
    else goals.up = 1
    if (mode === 'grumpy' && onBed) goals.dangle = 1
    Object.assign(tailGoal, goals)
    let total = 0
    for (const name of Object.keys(tailWeights) as TailName[]) {
      tailWeights[name] = MathUtils.lerp(tailWeights[name], tailGoal[name], smooth(5, dt))
      total += tailWeights[name]
    }
    const lash = mode === 'grumpy' || mode === 'stalk' || mode === 'watch'
    const swayAmount = lash ? 0.05 : idle?.kind === 'tail' ? 0.06 : 0.02
    const swaySpeed = lash ? 0.012 : 0.0016
    const sway = Math.sin(now * swaySpeed) * swayAmount + Math.sin(now * swaySpeed * 2.7) * swayAmount * 0.3
    const base = TAIL_BASE.clone().applyMatrix4(body.matrix)
    for (let i = 0; i < 5; i++) {
      curve[i].set(0, 0, 0)
      for (const name of Object.keys(TAILS) as TailName[]) {
        curve[i].addScaledVector(TAILS[name][i], tailWeights[name] / total)
      }
    }
    const offset = base.clone().sub(curve[0])
    for (let i = 0; i < 5; i++) {
      curve[i].add(offset)
      const s = Math.pow(i / 4, 1.5) * sway
      // Dangling, the tail swings toward and away from the screen; otherwise
      // side to side.
      curve[i].z += s * tailWeights.dangle / total
      curve[i].x += s * (1 - tailWeights.dangle / total)
    }
    tail.geometry.dispose()
    tail.geometry = new TubeGeometry(new CatmullRomCurve3(curve), 14, 0.013, 5)

    // Effects.
    object.updateMatrixWorld()
    const headWorld = object.localToWorld(tmp.copy(head.position))
    const sleeping = mode === 'sleep' && eyeOpen < 0.1 && !idle
    zees.forEach((z) => {
      const p = (now * 0.00025 + z.userData.phase) % 1
      z.position.set(headWorld.x - p * 0.05, headWorld.y + 0.05 + p * 0.09, headWorld.z + p * 0.02)
      z.scale.setScalar(0.018 + p * 0.02)
      const material = z.material as SpriteMaterial
      material.opacity = MathUtils.lerp(material.opacity, sleeping ? Math.sin(p * Math.PI) * 0.85 : 0, smooth(6, dt))
    })
    hearts.forEach((heart) => {
      const age = (now - heart.born) / 1000
      const material = heart.sprite.material as SpriteMaterial
      if (age > 1.5) {
        material.opacity = 0
        return
      }
      const seed = heart.born % 1
      heart.sprite.position.set(
        headWorld.x + Math.sin(age * 4 + seed * 9) * 0.015,
        headWorld.y + 0.06 + age * 0.09,
        headWorld.z + 0.02,
      )
      heart.sprite.scale.setScalar(0.024 + age * 0.01)
      material.opacity = Math.min(1, age * 6) * (1 - age / 1.5)
    })
  }

  // ------------------------------------------------------------ api
  return {
    object,
    effects,
    paws,
    pawPlanted,

    update(now, dt) {
      clock = now
      think(now, dt)
      animate(now, dt)
    },

    pet(now) {
      if (mode === 'grumpy') {
        modeTime = Math.min(modeTime, 1)
        emit('hiss')
        return
      }
      // Mid-jump or mid-turn he takes the pet but doesn't stop what he's doing.
      const canStop = mode === 'sleep' || mode === 'pet' || mode === 'chase' || mode === 'watch' || mode === 'pin' || mode === 'stalk'
      petTimes.push(now)
      if (canStop && petTimes.filter((p) => now - p < 8000).length >= 6) {
        emit('hiss')
        // A quick swat at your hand.
        swipe = { start: now, duration: 0.28, target: v(0.09, 0.09, 0.14), foot: 1 }
        setMode('grumpy')
        return
      }
      spawnHeart(now)
      if (now - lastPurr > 1600) {
        lastPurr = now
        emit('purr')
      }
      if (canStop && mode !== 'pet') setMode('pet')
      idle = null
    },

    setLaser(dot) {
      laser = dot
    },

    setGaze(point) {
      gaze = point
    },

    setHovered(next) {
      hovered = next
    },

    notice() {
      if (mode === 'sleep') idle = { kind: 'ears', start: performance.now() }
    },

    status() {
      if (mode === 'sleep' && (hovered || eyeOpen > 0.3)) return 'Half asleep, watching your cursor'
      return STATUS[mode]
    },

    headPosition(target) {
      return object.localToWorld(target.copy(head.position))
    },

    position() {
      return pos
    },
  }
}
