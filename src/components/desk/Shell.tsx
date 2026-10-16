import { Link } from '@tanstack/react-router'
import * as React from 'react'
import { jobDates, jobYears, profile } from '~/data/profile'
import { PROGRAMS } from './route'
import type { DeskRoute, Program, ShellSection } from './route'
import styles from './shell.module.css'

export type { ShellSection } from './route'
export type BootKind = 'full' | 'disk' | 'none'

interface ShellProps {
  /** Where on the computer the URL says we are. The shell shows exactly this. */
  route: DeskRoute
  /** The job whose floppy went in on the way here, for the boot log. */
  bootJobId?: string
  boot: BootKind
  /** Fades the screen out while the camera pulls back. */
  closing: boolean
  /** False when WebGL isn't available and there's no desk to go back to. */
  canExit: boolean
  onExit: () => void
  /** Go somewhere else on the computer. Tabs replace history; programs push. */
  onNavigate: (route: DeskRoute, options?: { replace?: boolean }) => void
  onKey: () => void
}

const SECTIONS: Array<{ id: ShellSection; label: string; key: string; fkey: string }> = [
  { id: 'about', label: 'About', key: 'a', fkey: 'F1' },
  { id: 'work', label: 'Work', key: 'w', fkey: 'F2' },
  { id: 'tools', label: 'Tools', key: 't', fkey: 'F3' },
  { id: 'games', label: 'Games', key: 'g', fkey: 'F4' },
  { id: 'links', label: 'Links', key: 'l', fkey: 'F5' },
]

const fileName = (name: string) => name.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8)

function bootLines(kind: BootKind, jobId?: string): string[] {
  const job = profile.jobs.find((j) => j.id === jobId)
  const disk = job
    ? [`A:\\> TYPE ${fileName(job.company)}.TXT`, 'Reading drive A ........ OK']
    : []
  if (kind === 'disk') return disk
  if (kind === 'none') return []
  return [
    'FUNKIE BIOS v4.86  (C) 1989-2026',
    '486DX2-66 CPU detected',
    'Memory test: 640K OK, 15360K extended',
    'Drive A: 1.44M 3.5"    Drive C: 420MB',
    '',
    'Starting FUNKIE-DOS...',
    '',
    'C:\\> CD \\HOME\\MARK',
    'C:\\HOME\\MARK> SHELL',
    ...disk,
  ]
}

function useClock() {
  const [now, setNow] = React.useState(() => new Date())
  React.useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 15_000)
    return () => window.clearInterval(id)
  }, [])
  return now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

export function Shell({ route, bootJobId, boot, closing, canExit, onExit, onNavigate, onKey }: ShellProps) {
  const lines = React.useMemo(() => bootLines(boot, bootJobId), [boot, bootJobId])
  const [shown, setShown] = React.useState(0)
  const booting = shown < lines.length
  const section = route.section
  const selectedJob = route.jobId ?? profile.jobs[0].id
  const program = route.program ?? null
  const windowRef = React.useRef<HTMLElement>(null)
  const programRef = React.useRef<HTMLIFrameElement>(null)
  const clock = useClock()

  const routeRef = React.useRef(route)
  routeRef.current = route

  const run = React.useCallback(
    (next: Program) => {
      onKey()
      onNavigate({ computer: true, section: 'games', program: next })
    },
    [onKey, onNavigate],
  )
  const quitProgram = React.useCallback(() => {
    onKey()
    onNavigate({ computer: true, section: 'games' }, { replace: true })
  }, [onKey, onNavigate])

  // The frame loads once per program, starting wherever the link pointed; the
  // game reports its own moves afterwards, which only change the URL.
  const programSrc = React.useMemo(() => {
    if (!program) return null
    const at = routeRef.current.programPath
    return `${PROGRAMS[program].path}?embed${at ? `#/${at}` : ''}`
  }, [program])

  // The game talks to us with messages, since keys pressed inside the frame
  // never reach this window: it asks to quit (Esc or its Quit to DOS item),
  // and says where it is so the address bar can follow along.
  React.useEffect(() => {
    if (!program) return
    const { exit, route: routeType } = PROGRAMS[program]
    function onMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return
      if (event.source !== programRef.current?.contentWindow) return
      const data: unknown = event.data
      if (typeof data !== 'object' || data === null) return
      const { type, path } = data as { type?: unknown; path?: unknown }
      if (type === exit) quitProgram()
      else if (type === routeType && typeof path === 'string') {
        const current = routeRef.current
        onNavigate({ ...current, programPath: path || undefined }, { replace: true })
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [program, quitProgram, onNavigate])

  // Boot log: one line every ~70ms; any key or click skips it.
  React.useEffect(() => {
    if (!booting) return
    const id = window.setTimeout(() => setShown((n) => n + 1), shown === 0 ? 120 : 70)
    return () => window.clearTimeout(id)
  }, [booting, shown])

  React.useEffect(() => {
    if (!booting && !program) windowRef.current?.focus({ preventScroll: true })
  }, [booting, section, program])

  const open = React.useCallback(
    (next: ShellSection) => {
      onKey()
      onNavigate({ computer: true, section: next }, { replace: true })
    },
    [onKey, onNavigate],
  )
  const selectJob = React.useCallback(
    (id: string) => {
      onKey()
      onNavigate({ computer: true, section: 'work', jobId: id }, { replace: true })
    },
    [onKey, onNavigate],
  )

  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (closing) return
      if (booting) {
        setShown(lines.length)
        return
      }
      if (program) {
        // Focus is outside the game (on the monitor chin, say).
        if (event.key === 'Escape') {
          event.preventDefault()
          quitProgram()
        }
        return
      }
      if (event.key === 'Escape' && canExit) {
        event.preventDefault()
        onExit()
        return
      }
      const byF = SECTIONS.find((s) => s.fkey === event.key)
      const byAlt = event.altKey && SECTIONS.find((s) => s.key === event.key.toLowerCase())
      const match = byF || byAlt
      if (match) {
        event.preventDefault()
        open(match.id)
        return
      }
      if (section === 'work' && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
        event.preventDefault()
        const index = profile.jobs.findIndex((j) => j.id === selectedJob)
        const step = event.key === 'ArrowDown' ? 1 : -1
        const next = profile.jobs[(index + step + profile.jobs.length) % profile.jobs.length]
        selectJob(next.id)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [booting, canExit, closing, lines.length, onExit, open, program, quitProgram, section, selectedJob, selectJob])

  const job = profile.jobs.find((j) => j.id === selectedJob) ?? profile.jobs[0]
  const title =
    section === 'about'
      ? 'ABOUT.TXT'
      : section === 'work'
        ? `A:\\${fileName(job.company)}.TXT`
        : section === 'tools'
          ? 'TOOLS'
          : section === 'games'
            ? 'GAMES'
            : 'LINKS.TXT'

  return (
    <div className={styles.monitor} data-closing={closing || undefined}>
      <section
        className={styles.screen}
        aria-label="Mark's computer"
        onClick={booting ? () => setShown(lines.length) : undefined}
      >
        {program && programSrc ? (
          <iframe
            ref={programRef}
            className={styles.program}
            src={programSrc}
            title={PROGRAMS[program].title}
            onLoad={(event) => event.currentTarget.contentWindow?.focus()}
          />
        ) : booting ? (
          <pre className={styles.boot} aria-live="polite">
            {lines.slice(0, shown).join('\n')}
            <span className={styles.cursor} aria-hidden="true">
              _
            </span>
          </pre>
        ) : (
          <div className={styles.os}>
            <nav className={styles.menubar} aria-label="Sections">
              <ul>
                {SECTIONS.map((s) => (
                  <li key={s.id}>
                    <button
                      type="button"
                      className={styles.menuItem}
                      aria-current={section === s.id ? 'page' : undefined}
                      onClick={() => open(s.id)}
                    >
                      <span className={styles.hotkey}>{s.label[0]}</span>
                      {s.label.slice(1)}
                    </button>
                  </li>
                ))}
                <li>
                  <Link to="/resume" className={styles.menuItem}>
                    <span className={styles.hotkey}>R</span>esume
                  </Link>
                </li>
              </ul>
              <span className={styles.clock}>{clock}</span>
            </nav>

            <main className={styles.desktop}>
              <article
                ref={windowRef}
                tabIndex={-1}
                className={styles.window}
                aria-labelledby="shell-title"
              >
                <header className={styles.titlebar}>
                  {canExit && (
                    <button
                      type="button"
                      className={styles.closeBox}
                      onClick={onExit}
                      aria-label="Close and go back to the desk"
                    >
                      [<span>■</span>]
                    </button>
                  )}
                  <h2 id="shell-title" className={styles.title}>
                    {title}
                  </h2>
                </header>
                <div className={styles.body}>
                  {section === 'about' && <About onOpen={open} />}
                  {section === 'work' && (
                    <Work selected={job.id} onSelect={selectJob} />
                  )}
                  {section === 'tools' && <Tools />}
                  {section === 'games' && <Games onRun={run} />}
                  {section === 'links' && <Links />}
                </div>
              </article>
            </main>

            <footer className={styles.statusbar}>
              {SECTIONS.map((s) => (
                <button key={s.id} type="button" className={styles.status} onClick={() => open(s.id)}>
                  <span className={styles.hotkey}>{s.fkey}</span> {s.label}
                </button>
              ))}
              {canExit && (
                <button type="button" className={styles.status} onClick={onExit}>
                  <span className={styles.hotkey}>Esc</span> Back to desk
                </button>
              )}
            </footer>
          </div>
        )}
        <div className={styles.scanlines} aria-hidden="true" />
      </section>

      <div className={styles.chin}>
        <span className={styles.badge} aria-hidden="true">
          FUNKIE
        </span>
        {canExit ? (
          <button type="button" className={styles.power} onClick={onExit}>
            <span className={styles.led} aria-hidden="true" />
            Back to desk
          </button>
        ) : (
          <span className={styles.power}>
            <span className={styles.led} aria-hidden="true" />
          </span>
        )}
      </div>
    </div>
  )
}

function Button({
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="button" className={styles.button} {...props}>
      {children}
    </button>
  )
}

function About({ onOpen }: { onOpen: (section: ShellSection) => void }) {
  return (
    <div className={styles.prose}>
      <h3 className={styles.name}>{profile.name}</h3>
      <p className={styles.dim}>
        {profile.role} at {profile.company}
      </p>
      {profile.bio.map((paragraph) => (
        <p key={paragraph}>{paragraph}</p>
      ))}
      <div className={styles.buttons}>
        <Link to="/resume" className={styles.button}>
          Read my resume
        </Link>
        <Button onClick={() => onOpen('work')}>Work history</Button>
      </div>
      <p className={styles.footnote}>
        This site is my UI playground. The desk is three.js, drawn like it's
        1997. Type is Modern DOS 8x16 by Jayvee Enaguas (CC0).
      </p>
    </div>
  )
}

function Work({ selected, onSelect }: { selected: string; onSelect: (id: string) => void }) {
  const job = profile.jobs.find((j) => j.id === selected) ?? profile.jobs[0]
  return (
    <div className={styles.work}>
      <ul className={styles.dir} aria-label="Jobs">
        {profile.jobs.map((j) => (
          <li key={j.id}>
            <button
              type="button"
              className={styles.dirEntry}
              aria-pressed={j.id === selected}
              onClick={() => onSelect(j.id)}
            >
              <span>{fileName(j.company).padEnd(9, '\u00a0')}</span>
              <span className={styles.ext}>TXT</span>
              <span className={styles.years}>{jobYears(j)}</span>
            </button>
          </li>
        ))}
      </ul>
      <div className={styles.job} aria-live="polite">
        <h3 className={styles.company}>{job.company}</h3>
        <p className={styles.dim}>
          {job.title}
          <br />
          {jobDates(job)}
        </p>
        <ul className={styles.bullets}>
          {job.bullets.map((bullet) => (
            <li key={bullet}>{bullet}</li>
          ))}
        </ul>
        <div className={styles.buttons}>
          <Link to="/resume" hash={job.id} className={styles.button}>
            Open full resume
          </Link>
        </div>
      </div>
    </div>
  )
}

function Tools() {
  return (
    <div className={styles.prose}>
      <p>Small experiments with browser APIs.</p>
      <dl className={styles.listing}>
        <dt>INTERSECT.EXE</dt>
        <dd>
          An interactive demo of the Intersection Observer API. Drag the
          sliders for root margin, threshold and size and watch which boxes
          count as visible.
          <div className={styles.buttons}>
            <Link to="/tools" className={styles.button}>
              Run it
            </Link>
          </div>
        </dd>
      </dl>
    </div>
  )
}

function Games({ onRun }: { onRun: (program: Program) => void }) {
  return (
    <div className={styles.prose}>
      <p>Things to play. They run right here on this computer.</p>
      <dl className={styles.listing}>
        <dt>HARKER.EXE</dt>
        <dd>
          The Harker Papers, a point-and-click adventure through Bram
          Stoker's Dracula in seven chapters, told through the journals of the
          people who wrote it down.
          <div className={styles.buttons}>
            <Button onClick={() => onRun('harker')}>Run it</Button>
          </div>
        </dd>
        <dt>FRANKEN.EXE</dt>
        <dd>
          Frankenstein, Mary Shelley's novel as an 8-bit platformer, from
          the rooftops of Ingolstadt to the Arctic ice. Arrow keys, Z and X.
          <div className={styles.buttons}>
            <Button onClick={() => onRun('frankenstein')}>Run it</Button>
          </div>
        </dd>
      </dl>
    </div>
  )
}

function Links() {
  return (
    <div className={styles.prose}>
      <p>Where to find me.</p>
      <ul className={styles.links}>
        {profile.links.map((link) => (
          <li key={link.href}>
            <span className={styles.linkLabel}>{link.label}</span>
            <a href={link.href} target="_blank" rel="noopener noreferrer" className={styles.button}>
              {link.handle}
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}
