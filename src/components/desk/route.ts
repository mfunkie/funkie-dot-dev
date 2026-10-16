import { profile } from '~/data/profile'

/**
 * URLs for the desk and the computer on it. The 3D desk lives in one layout
 * route, so moving between these paths animates instead of reloading:
 *
 *   /                                     the desk
 *   /computer                             the computer, About
 *   /computer/work[/<jobId>]              work history (a job's floppy goes in)
 *   /computer/tools | /games | /links     the other sections
 *   /computer/games/<program>[/<path>]    a game running on the computer; the
 *                                         path is the game's own deep link,
 *                                         e.g. /computer/games/frankenstein/stage/5
 */

export type ShellSection = 'about' | 'work' | 'tools' | 'games' | 'links'

export const SECTION_IDS: readonly ShellSection[] = ['about', 'work', 'tools', 'games', 'links']

/** Static games in public/, run inside the screen like DOS programs. */
export const PROGRAMS = {
  harker: {
    path: '/games/harker-papers/index.html',
    exit: 'harker:exit',
    route: 'harker:route',
    title: 'HARKER.EXE: The Harker Papers',
  },
  frankenstein: {
    path: '/games/frankenstein/index.html',
    exit: 'franken:exit',
    route: 'franken:route',
    title: 'FRANKEN.EXE: Frankenstein',
  },
} as const

export type Program = keyof typeof PROGRAMS

export interface DeskRoute {
  computer: boolean
  section: ShellSection
  jobId?: string
  program?: Program
  /** The running game's own route, without a leading slash ("stage/5"). */
  programPath?: string
}

export const DESK: DeskRoute = { computer: false, section: 'about' }

const isSection = (s: string): s is ShellSection => (SECTION_IDS as readonly string[]).includes(s)
const isProgram = (s: string): s is Program => Object.prototype.hasOwnProperty.call(PROGRAMS, s)

/** Game routes are short paths of letters, digits and dashes. */
const cleanProgramPath = (segments: string[]) => {
  const path = segments.filter((s) => /^[a-z0-9-]+$/i.test(s)).join('/')
  return path || undefined
}

export function parseDeskPath(pathname: string): DeskRoute {
  const parts = pathname.split('/').filter(Boolean).map((p) => decodeURIComponent(p))
  if (parts[0] !== 'computer') return DESK
  const [, section = 'about', arg, ...rest] = parts
  if (!isSection(section)) return { computer: true, section: 'about' }
  if (section === 'work' && arg && profile.jobs.some((j) => j.id === arg)) {
    return { computer: true, section, jobId: arg }
  }
  if (section === 'games' && arg && isProgram(arg)) {
    return { computer: true, section, program: arg, programPath: cleanProgramPath(rest) }
  }
  return { computer: true, section }
}

export function deskPath(route: DeskRoute): string {
  if (!route.computer) return '/'
  if (route.section === 'about') return '/computer'
  let path = `/computer/${route.section}`
  if (route.section === 'work' && route.jobId) path += `/${route.jobId}`
  if (route.section === 'games' && route.program) {
    path += `/${route.program}`
    if (route.programPath) path += `/${route.programPath}`
  }
  return path
}

/** The part after /computer/, for the splat route's param. */
export const splatOf = (route: DeskRoute) => deskPath(route).replace(/^\/computer\/?/, '')

export function sameRoute(a: DeskRoute, b: DeskRoute) {
  return deskPath(a) === deskPath(b)
}

/** Titles for the head, so a shared link previews as the right thing. */
export function routeTitle(route: DeskRoute): string {
  if (!route.computer) return 'Mark Funk | Software Engineer'
  if (route.program) return `${route.program === 'harker' ? 'The Harker Papers' : 'Frankenstein'} | Mark Funk`
  if (route.section === 'work' && route.jobId) {
    const job = profile.jobs.find((j) => j.id === route.jobId)
    if (job) return `${job.company} | Mark Funk`
  }
  const label = { about: 'About', work: 'Work', tools: 'Tools', games: 'Games', links: 'Links' }[route.section]
  return `${label} | Mark Funk's computer`
}
