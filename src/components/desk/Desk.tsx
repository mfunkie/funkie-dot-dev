import { Link, Outlet, useLocation, useNavigate } from '@tanstack/react-router'
import * as React from 'react'
import { jobYears, profile } from '~/data/profile'
import type { CartridgeSpec, DeskEvent, DeskScene, DeskTarget, FloppySpec } from './scene/createDeskScene'
import { DESK, PROGRAMS, deskPath, isProgram, parseDeskPath, splatOf } from './route'
import type { DeskRoute, Program } from './route'
import { Shell } from './Shell'
import type { BootKind } from './Shell'
import { sounds } from './sound'
import type { SoundName } from './sound'
import styles from './desk.module.css'

type Mode = 'desk' | 'entering' | 'computer' | 'leaving'
type SceneStatus = 'loading' | 'ready' | 'failed'

interface ShellEntry {
  boot: BootKind
  jobId?: string
}

/** 1990s disks came in every color; these just need to be tellable apart. */
const DISK_COLORS: Record<string, { color: string; ink: string }> = {
  netflix: { color: '#a3222a', ink: '#a3222a' },
  apple: { color: '#d8d2c2', ink: '#5b8f4a' },
  facebook: { color: '#284b94', ink: '#284b94' },
  boomtown: { color: '#d9831f', ink: '#d9831f' },
  blackbaud: { color: '#26262b', ink: '#3b3b44' },
}

const FLOPPIES: FloppySpec[] = profile.jobs.map((job) => ({
  jobId: job.id,
  company: job.company,
  ...(DISK_COLORS[job.id] ?? { color: '#555', ink: '#555' }),
}))

/** One cartridge per game, each with a key to pick it from the desk. */
const CARTRIDGES: Record<Program, Omit<CartridgeSpec, 'program' | 'name'> & { key: string; blurb: string }> = {
  harker: {
    title: 'Harker',
    shell: '#2b2730',
    art: 'castle',
    key: 'h',
    blurb: 'Point-and-click adventure, after Bram Stoker',
  },
  frankenstein: {
    title: 'Franken',
    shell: '#5d6b4f',
    art: 'tower',
    key: 'f',
    blurb: '8-bit platformer, after Mary Shelley',
  },
  gatsby: {
    title: 'Gatsby',
    shell: '#c8a03c',
    art: 'dock',
    key: 'g',
    blurb: '8-bit platformer, after F. Scott Fitzgerald',
  },
  jekyll: {
    title: 'Jekyll',
    shell: '#3c2a2a',
    art: 'lamp',
    key: 'j',
    blurb: 'Turn-based game of being seen, after Robert Louis Stevenson',
  },
}
const PROGRAM_IDS = Object.keys(PROGRAMS) as Program[]

const CARTRIDGE_SPECS: CartridgeSpec[] = PROGRAM_IDS.map((program) => {
  const { title, shell, art } = CARTRIDGES[program]
  return { program, name: PROGRAMS[program].name, title, shell, art }
})

const SOUND_KEY = 'funkie:sound'

/** Tells targets apart, so moving along one object doesn't re-render. */
const targetKey = (target: DeskTarget | null) =>
  !target
    ? ''
    : target.kind === 'floppy'
      ? `floppy:${target.jobId}`
      : target.kind === 'cartridge'
        ? `cartridge:${target.program}`
        : target.kind

function usePrefersReducedMotion() {
  const [reduced, setReduced] = React.useState(false)
  React.useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(query.matches)
    const onChange = () => setReduced(query.matches)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])
  return reduced
}

function describe(target: DeskTarget, state: { lampOn: boolean; laserOn: boolean; catStatus: string }) {
  switch (target.kind) {
    case 'computer':
      return { title: 'Use the computer', detail: 'About me, work, tools, games and links' }
    case 'lamp':
      return { title: 'Desk lamp', detail: state.lampOn ? 'Click to turn it off' : 'Click to turn it on' }
    case 'cat':
      return { title: 'Fry', detail: state.catStatus }
    case 'laser':
      return {
        title: 'Laser pointer',
        detail: state.laserOn ? 'Click to turn it off' : 'Click to play with Fry',
      }
    case 'floppy': {
      const job = profile.jobs.find((j) => j.id === target.jobId)
      if (!job) return { title: target.jobId, detail: '' }
      return { title: job.company, detail: `${job.title}, ${jobYears(job)}` }
    }
    case 'console':
      return { title: 'Game console', detail: 'Pick a cartridge to play, or click for the list' }
    case 'cartridge': {
      if (!isProgram(target.program)) return { title: target.program, detail: '' }
      return { title: PROGRAMS[target.program].name, detail: CARTRIDGES[target.program].blurb }
    }
  }
}

export function Desk() {
  const canvasRef = React.useRef<HTMLCanvasElement>(null)
  const sceneRef = React.useRef<DeskScene | null>(null)
  const tooltipRef = React.useRef<HTMLDivElement>(null)
  const labelsRef = React.useRef<HTMLDivElement>(null)
  const computerButtonRef = React.useRef<HTMLButtonElement>(null)
  const [status, setStatus] = React.useState<SceneStatus>('loading')
  // The loading message only makes sense once scripts are running, and keeps
  // it out of the server-rendered HTML that search engines read.
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => setMounted(true), [])
  const [mode, setMode] = React.useState<Mode>('desk')
  const [hover, setHover] = React.useState<DeskTarget | null>(null)
  const [lampOn, setLampOn] = React.useState(true)
  const [laserOn, setLaserOn] = React.useState(false)
  const [soundOn, setSoundOn] = React.useState(false)
  const [toast, setToast] = React.useState<{ id: number; text: string } | null>(null)
  const [entry, setEntry] = React.useState<ShellEntry>({ boot: 'full' })
  const reducedMotion = usePrefersReducedMotion()
  const booted = React.useRef(false)

  // The URL is the source of truth for where you are: the desk, a section of
  // the computer, a game running on it. Clicks navigate; the effect further
  // down plays whatever transition gets the scene there.
  const location = useLocation()
  const route = React.useMemo(() => parseDeskPath(location.pathname), [location.pathname])
  const navigateTo = useNavigate()
  const go = React.useCallback(
    (next: DeskRoute, options: { replace?: boolean } = {}) => {
      if (deskPath(next) === location.pathname.replace(/(.)\/$/, '$1')) return
      if (!next.computer) void navigateTo({ to: '/', replace: options.replace })
      else if (!splatOf(next)) void navigateTo({ href: '/computer', replace: options.replace })
      else void navigateTo({ to: '/computer/$', params: { _splat: splatOf(next) }, replace: options.replace })
    },
    [location.pathname, navigateTo],
  )
  // What the screen shows while the camera pulls back to the desk.
  const lastComputerRoute = React.useRef<DeskRoute>({ computer: true, section: 'about' })
  if (route.computer) lastComputerRoute.current = route

  const soundOnRef = React.useRef(soundOn)
  soundOnRef.current = soundOn
  const play = React.useCallback((name: SoundName) => {
    if (soundOnRef.current) sounds[name]()
  }, [])

  React.useEffect(() => {
    try {
      setSoundOn(window.localStorage.getItem(SOUND_KEY) === 'on')
    } catch {
      // Storage can be unavailable (private mode); sound just starts off.
    }
  }, [])

  const toggleSound = React.useCallback(() => {
    const next = !soundOnRef.current
    soundOnRef.current = next
    setSoundOn(next)
    try {
      window.localStorage.setItem(SOUND_KEY, next ? 'on' : 'off')
    } catch {
      // Not remembered, still works for this visit.
    }
    if (next) sounds.key()
  }, [])

  const laserOnRef = React.useRef(false)
  const setLaser = React.useCallback((on: boolean) => {
    laserOnRef.current = on
    setLaserOn(on)
    sceneRef.current?.setLaser(on)
  }, [])

  const lastPoint = React.useRef<{ x: number; y: number } | null>(null)
  const moveTooltip = React.useCallback((next: { x: number; y: number } | null) => {
    if (next) lastPoint.current = next
    const point = next ?? lastPoint.current
    const el = tooltipRef.current
    if (!el || !point) return
    const width = el.offsetWidth
    const height = el.offsetHeight
    const parent = el.parentElement!
    // Prefer the right of the pointer; flip left near the edge instead of
    // sliding over what's being pointed at.
    const x = point.x + 18 + width > parent.clientWidth - 12 ? point.x - width - 18 : point.x + 18
    const y = point.y + 22 + height > parent.clientHeight - 12 ? point.y - height - 14 : point.y + 22
    el.style.transform = `translate(${Math.max(12, x)}px, ${Math.max(12, y)}px)`
  }, [])

  // Re-measure when the tooltip's text changes size.
  React.useLayoutEffect(() => {
    if (hover) moveTooltip(null)
  }, [hover, moveTooltip])

  /*
   * The camera moves to the monitor (a job's floppy goes into the drive, or a
   * game's cartridge into the console, on the way). A link straight to
   * somewhere on the computer skips the long boot log, so it lands where it
   * points, and so does a game, which takes the screen as soon as it loads.
   */
  const enter = React.useCallback(
    async ({ jobId, program }: { jobId?: string; program?: Program }, deepLink: boolean) => {
      const scene = sceneRef.current
      if (!scene || mode !== 'desk') return
      if (laserOnRef.current) setLaser(false)
      setMode('entering')
      setHover(null)
      play('key')
      await scene.enterComputer({
        jobId,
        program,
        instant: reducedMotion,
        onInserted: () => play(program ? 'cartridge' : 'floppy'),
      })
      play('wake')
      setEntry({
        jobId,
        boot:
          reducedMotion || program ? 'none' : !booted.current && !deepLink ? 'full' : jobId ? 'disk' : 'none',
      })
      booted.current = true
      setMode('computer')
    },
    [mode, play, reducedMotion, setLaser],
  )
  const openComputer = React.useCallback(
    (jobId?: string) => go(jobId ? { computer: true, section: 'work', jobId } : { computer: true, section: 'about' }),
    [go],
  )
  const playGame = React.useCallback(
    (program?: Program) => go({ computer: true, section: 'games', program }),
    [go],
  )

  const leave = React.useCallback(async () => {
    const scene = sceneRef.current
    if (!scene || mode !== 'computer') return
    setMode('leaving')
    play('key')
    await new Promise((resolve) => setTimeout(resolve, reducedMotion ? 0 : 220))
    await scene.leaveComputer({ instant: reducedMotion })
    setMode('desk')
    requestAnimationFrame(() => computerButtonRef.current?.focus({ preventScroll: true }))
  }, [mode, play, reducedMotion])

  const lampOnRef = React.useRef(lampOn)
  const toggleLamp = React.useCallback(() => {
    const next = !lampOnRef.current
    lampOnRef.current = next
    setLampOn(next)
    sceneRef.current?.setLamp(next)
    play('lamp')
  }, [play])

  const petCat = React.useCallback(() => {
    sceneRef.current?.petCat()
  }, [])

  const toggleLaser = React.useCallback(() => {
    setLaser(!laserOnRef.current)
    play('lamp')
  }, [play, setLaser])

  const activate = React.useCallback(
    (target: DeskTarget) => {
      if (target.kind === 'computer') openComputer()
      else if (target.kind === 'floppy') openComputer(target.jobId)
      else if (target.kind === 'console') playGame()
      else if (target.kind === 'cartridge') playGame(isProgram(target.program) ? target.program : undefined)
      else if (target.kind === 'lamp') toggleLamp()
      else if (target.kind === 'laser') toggleLaser()
      else petCat()
    },
    [openComputer, petCat, playGame, toggleLamp, toggleLaser],
  )

  const showToast = React.useCallback((text: string) => {
    setToast({ id: Date.now(), text })
  }, [])
  React.useEffect(() => {
    if (!toast) return
    const id = window.setTimeout(() => setToast(null), 4200)
    return () => window.clearTimeout(id)
  }, [toast])

  const lastKeyClick = React.useRef(0)
  const onDeskEvent = React.useCallback(
    (event: DeskEvent) => {
      switch (event.kind) {
        case 'cat':
          play(event.sound)
          break
        case 'key':
          if (performance.now() - lastKeyClick.current > 60) {
            lastKeyClick.current = performance.now()
            play('tap')
          }
          break
        case 'mug-knocked':
          showToast('Fry knocked your coffee off the desk.')
          break
        case 'mug-crash':
          play('crash')
          break
        case 'fry-typed':
          showToast(`Fry typed: ${event.text}`)
          break
      }
    },
    [play, showToast],
  )
  const onDeskEventRef = React.useRef(onDeskEvent)
  onDeskEventRef.current = onDeskEvent
  const activateRef = React.useRef(activate)
  activateRef.current = activate

  // Load three.js only in the browser, after first paint.
  React.useEffect(() => {
    let cancelled = false
    const canvas = canvasRef.current
    if (!canvas) return
    import('./scene/createDeskScene')
      .then(({ createDeskScene }) => {
        if (cancelled) return
        sceneRef.current = createDeskScene({
          canvas,
          floppies: FLOPPIES,
          cartridges: CARTRIDGE_SPECS,
          labelLayer: labelsRef.current ?? undefined,
          labelClassName: styles.diskLabel,
          onHover: (target, point) => {
            setHover((current) => (targetKey(current) === targetKey(target) ? current : target))
            moveTooltip(point)
          },
          onActivate: (target) => activateRef.current(target),
          onEvent: (event) => onDeskEventRef.current(event),
        })
        setStatus('ready')
      })
      .catch((error: unknown) => {
        console.error('Desk scene failed to start', error)
        if (!cancelled) setStatus('failed')
      })
    return () => {
      cancelled = true
      sceneRef.current?.dispose()
      sceneRef.current = null
    }
  }, [moveTooltip])

  // Desk shortcuts.
  React.useEffect(() => {
    if (status !== 'ready' || mode !== 'desk') return
    function onKeyDown(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) return
      const active = document.activeElement
      const onControl = active instanceof HTMLElement && active.matches('a, button, input, textarea, select')
      const key = event.key.toLowerCase()
      const cartridge = PROGRAM_IDS.find((program) => CARTRIDGES[program].key === key)
      if ((key === 'enter' && !onControl) || key === 'c') {
        event.preventDefault()
        openComputer()
      } else if (/^[1-9]$/.test(key)) {
        const job = profile.jobs[Number(key) - 1]
        if (job) openComputer(job.id)
      } else if (cartridge) {
        playGame(cartridge)
      } else if (key === 'l') {
        toggleLamp()
      } else if (key === 's') {
        toggleSound()
      } else if (key === 'p') {
        petCat()
      } else if (key === 'r') {
        toggleLaser()
      } else if (key === 'escape' && laserOnRef.current) {
        setLaser(false)
      } else if (laserOnRef.current && key.startsWith('arrow')) {
        event.preventDefault()
        const step = event.shiftKey ? 0.1 : 0.04
        const dx = key === 'arrowleft' ? -step : key === 'arrowright' ? step : 0
        const dz = key === 'arrowup' ? -step : key === 'arrowdown' ? step : 0
        sceneRef.current?.nudgeLaser(dx, dz)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [openComputer, mode, petCat, playGame, setLaser, status, toggleLamp, toggleLaser, toggleSound])

  /*
   * Bring the scene to wherever the URL says. Runs when the desk first becomes
   * ready (a shared link to the computer animates in from the desk), when
   * Back/Forward changes the path, and after each transition finishes, in
   * case the URL moved on while it was playing.
   */
  const firstReconcile = React.useRef(true)
  React.useEffect(() => {
    if (status !== 'ready') return
    const deepLink = firstReconcile.current
    firstReconcile.current = false
    if (route.computer && mode === 'desk') void enter({ jobId: route.jobId, program: route.program }, deepLink)
    else if (!route.computer && mode === 'computer') void leave()
  }, [enter, leave, mode, route.computer, route.jobId, route.program, status])

  // Fry's tooltip says what he's doing, which changes while you watch.
  const [, setTick] = React.useState(0)
  React.useEffect(() => {
    if (hover?.kind !== 'cat') return
    const id = window.setInterval(() => setTick((n) => n + 1), 400)
    return () => window.clearInterval(id)
  }, [hover])

  const focusTarget = (target: DeskTarget | null) => {
    const scene = sceneRef.current
    if (!scene) return
    scene.setFocus(target)
    setHover(target)
    if (target) {
      const point = scene.project(target)
      if (point) lastPoint.current = point
      moveTooltip(point)
    }
  }

  const showShell = mode === 'computer' || mode === 'leaving' || status === 'failed'
  const hudHidden = mode !== 'desk' || status === 'failed'
  const info = hover
    ? describe(hover, { lampOn, laserOn, catStatus: sceneRef.current?.catStatus() ?? '' })
    : null

  return (
    <div className={styles.desk} data-mode={mode}>
      <div className={styles.stage}>
        <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />
        <div ref={labelsRef} className={styles.labels} aria-hidden="true" />
      </div>

      <div className={styles.hud} inert={hudHidden} data-hidden={hudHidden || undefined}>
        <header className={styles.top}>
          <div>
            <h1 className={styles.name}>{profile.name}</h1>
            <p className={styles.role}>
              {profile.role} at {profile.company}
            </p>
            {/* The desk is a picture, so say in words what's on the computer. */}
            <div className={styles.visuallyHidden}>
              {profile.bio.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </div>
          <nav className={styles.nav} aria-label="Site">
            <Link to="/resume">Resume</Link>
            <Link to="/tools">Tools</Link>
            <Link to="/games">Games</Link>
            {profile.links.map((link) => (
              <a key={link.href} href={link.href} target="_blank" rel="noopener noreferrer">
                {link.label}
              </a>
            ))}
          </nav>
        </header>

        <div className={styles.bottom}>
          {laserOn ? (
            <p className={styles.laserHint}>
              <span className={styles.pointerOnly}>
                Point at the desk and Fry will chase the dot. Arrow keys move it too.
              </span>
              <span className={styles.touchOnly}>Drag on the desk to move the dot.</span>
            </p>
          ) : (
            <p className={styles.touchHint}>Tap the computer, a disk, a cartridge or Fry</p>
          )}
          <div className={styles.actions}>
            <button
              ref={computerButtonRef}
              type="button"
              className={styles.action}
              disabled={status !== 'ready'}
              onClick={() => openComputer()}
              onFocus={() => focusTarget({ kind: 'computer' })}
              onBlur={() => focusTarget(null)}
            >
              <kbd>Enter</kbd> <span className={styles.wide}>Use the computer</span>
              <span className={styles.narrow}>Computer</span>
            </button>
            <div className={styles.disks} role="group" aria-label="Floppy disks">
              <span className={styles.diskHint} aria-hidden="true">
                <kbd>1</kbd>-<kbd>{profile.jobs.length}</kbd> Floppy disks
              </span>
              {profile.jobs.map((job, i) => (
                <button
                  key={job.id}
                  type="button"
                  className={styles.diskButton}
                  disabled={status !== 'ready'}
                  onClick={() => openComputer(job.id)}
                  onFocus={() => focusTarget({ kind: 'floppy', jobId: job.id })}
                  onBlur={() => focusTarget(null)}
                >
                  <kbd>{i + 1}</kbd> {job.company} disk
                </button>
              ))}
            </div>
            <div className={styles.disks} role="group" aria-label="Game cartridges">
              <span className={styles.diskHint} aria-hidden="true">
                {PROGRAM_IDS.map((program) => (
                  <kbd key={program}>{CARTRIDGES[program].key.toUpperCase()}</kbd>
                ))}{' '}
                Cartridges
              </span>
              {PROGRAM_IDS.map((program) => (
                <button
                  key={program}
                  type="button"
                  className={styles.diskButton}
                  disabled={status !== 'ready'}
                  onClick={() => playGame(program)}
                  onFocus={() => focusTarget({ kind: 'cartridge', program })}
                  onBlur={() => focusTarget(null)}
                >
                  <kbd>{CARTRIDGES[program].key.toUpperCase()}</kbd> {PROGRAMS[program].name} cartridge
                </button>
              ))}
            </div>
            <button
              type="button"
              className={styles.action}
              aria-pressed={lampOn}
              disabled={status !== 'ready'}
              onClick={toggleLamp}
              onFocus={() => focusTarget({ kind: 'lamp' })}
              onBlur={() => focusTarget(null)}
            >
              <kbd>L</kbd> Lamp
            </button>
            <button
              type="button"
              className={styles.action}
              aria-pressed={laserOn}
              disabled={status !== 'ready'}
              onClick={toggleLaser}
              onFocus={() => focusTarget({ kind: 'laser' })}
              onBlur={() => focusTarget(null)}
            >
              <kbd>R</kbd> Laser {laserOn ? 'on' : <span className={styles.wide}>pointer</span>}
            </button>
            <button
              type="button"
              className={styles.action}
              disabled={status !== 'ready'}
              onClick={petCat}
              onFocus={() => focusTarget({ kind: 'cat' })}
              onBlur={() => focusTarget(null)}
            >
              <kbd>P</kbd> Pet Fry
            </button>
          </div>
          <button
            type="button"
            className={styles.action}
            aria-pressed={soundOn}
            onClick={toggleSound}
          >
            <kbd>S</kbd> Sound {soundOn ? 'on' : 'off'}
          </button>
        </div>
        <div className={styles.toastArea} aria-live="polite">
          {toast && (
            <p key={toast.id} className={styles.toast}>
              {toast.text}
            </p>
          )}
        </div>
      </div>

      {/* Above the HUD so it's never covered by the bottom bar. */}
      <div
        ref={tooltipRef}
        className={styles.tooltip}
        hidden={!info || hudHidden}
        aria-hidden="true"
      >
        {info && (
          <>
            <strong>{info.title}</strong>
            <span>{info.detail}</span>
          </>
        )}
      </div>

      {mounted && status === 'loading' && (
        <p className={styles.loading} role="status">
          Loading the desk<span className={styles.cursor}>_</span>
        </p>
      )}

      {showShell && (
        <Shell
          route={status === 'failed' && !route.computer ? { computer: true, section: 'about' } : lastComputerRoute.current}
          bootJobId={entry.jobId}
          boot={status === 'failed' ? 'none' : entry.boot}
          closing={mode === 'leaving'}
          canExit={status === 'ready'}
          onExit={() => go(DESK)}
          onNavigate={go}
          onKey={() => play('key')}
        />
      )}
      <Outlet />
    </div>
  )
}
