import { Link } from '@tanstack/react-router'
import * as React from 'react'
import { jobDates, jobYears, profile } from '~/data/profile'
import styles from './shell.module.css'

export type ShellSection = 'about' | 'work' | 'tools' | 'games' | 'links'
export type BootKind = 'full' | 'disk' | 'none'

interface ShellProps {
  section: ShellSection
  jobId?: string
  boot: BootKind
  /** Fades the screen out while the camera pulls back. */
  closing: boolean
  /** False when WebGL isn't available and there's no desk to go back to. */
  canExit: boolean
  onExit: () => void
  onKey: () => void
}

const SECTIONS: Array<{ id: ShellSection; label: string; key: string; fkey: string }> = [
  { id: 'about', label: 'About', key: 'a', fkey: 'F1' },
  { id: 'work', label: 'Work', key: 'w', fkey: 'F2' },
  { id: 'tools', label: 'Tools', key: 't', fkey: 'F3' },
  { id: 'games', label: 'Games', key: 'g', fkey: 'F4' },
  { id: 'links', label: 'Links', key: 'l', fkey: 'F5' },
]

/** Static pages in public/, run inside the screen like DOS programs. */
const PROGRAMS = {
  harker: { path: '/games/harker-papers/index.html', exit: 'harker:exit', title: 'HARKER.EXE: The Harker Papers' },
  franken: { path: '/games/frankenstein/index.html', exit: 'franken:exit', title: 'FRANKEN.EXE: Frankenstein' },
} as const

type Program = keyof typeof PROGRAMS

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

export function Shell({ section: initialSection, jobId, boot, closing, canExit, onExit, onKey }: ShellProps) {
  const lines = React.useMemo(() => bootLines(boot, jobId), [boot, jobId])
  const [shown, setShown] = React.useState(0)
  const booting = shown < lines.length
  const [section, setSection] = React.useState<ShellSection>(initialSection)
  const [selectedJob, setSelectedJob] = React.useState(jobId ?? profile.jobs[0].id)
  const [program, setProgram] = React.useState<Program | null>(null)
  const windowRef = React.useRef<HTMLElement>(null)
  const programRef = React.useRef<HTMLIFrameElement>(null)
  const clock = useClock()

  const run = React.useCallback(
    (next: Program) => {
      onKey()
      setProgram(next)
    },
    [onKey],
  )
  const quitProgram = React.useCallback(() => {
    onKey()
    setProgram(null)
  }, [onKey])

  // The game asks to quit (Esc or its Quit to DOS menu item) with a message,
  // since keys pressed inside the frame never reach this window.
  React.useEffect(() => {
    if (!program) return
    const exitType = PROGRAMS[program].exit
    function onMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return
      if (event.source !== programRef.current?.contentWindow) return
      const data: unknown = event.data
      if (typeof data === 'object' && data !== null && (data as { type?: unknown }).type === exitType) {
        quitProgram()
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [program, quitProgram])

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
      setSection(next)
    },
    [onKey],
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
        onKey()
        setSelectedJob(next.id)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [booting, canExit, closing, lines.length, onExit, onKey, open, program, quitProgram, section, selectedJob])

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
        {program ? (
          <iframe
            ref={programRef}
            className={styles.program}
            src={`${PROGRAMS[program].path}?embed`}
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
                    <Work
                      selected={job.id}
                      onSelect={(id) => {
                        onKey()
                        setSelectedJob(id)
                      }}
                    />
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
            <Button onClick={() => onRun('franken')}>Run it</Button>
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
