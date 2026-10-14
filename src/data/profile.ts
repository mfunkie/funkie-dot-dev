export interface Job {
  /** Stable key used in URLs, the 3D scene and the DOS shell. */
  id: string
  company: string
  title: string
  start: string
  /** `null` while it's the current job. */
  end: string | null
  bullets: readonly string[]
}

export interface Education {
  degree: string
  school: string
  year: string
}

export interface ProfileLink {
  label: string
  href: string
  handle: string
}

export interface Profile {
  name: string
  role: string
  company: string
  summary: string
  links: readonly ProfileLink[]
  jobs: readonly Job[]
  education: readonly Education[]
}

export const profile = {
  name: 'Mark Funk',
  role: 'Senior Software Engineer',
  company: 'Netflix',
  summary:
    'Senior Software Engineer at Netflix. Previously Apple, Facebook, BoomTown, Blackbaud.',
  links: [
    {
      label: 'GitHub',
      href: 'https://www.github.com/mfunkie',
      handle: 'mfunkie',
    },
    {
      label: 'Bluesky',
      href: 'https://bsky.app/profile/funkie.dev',
      handle: '@funkie.dev',
    },
    {
      label: 'LinkedIn',
      href: 'https://www.linkedin.com/in/mark-funk-04496625',
      handle: 'Mark Funk',
    },
  ],
  jobs: [
    {
      id: 'netflix',
      company: 'Netflix',
      title: 'Senior Software Engineer',
      start: 'Dec 2019',
      end: null,
      bullets: [
        'UI lead for Scripts team managing screenplay data and insights',
        'Built Script Viewer with PDF mode, structural modes (Final Draft-like formatting for dialogues, actions, scene headers), and mobile mode',
        'Built and shipped React Native iOS app for script viewing and radioplay feedback',
        'RadioPlay: TTS feature using ElevenLabs, breaking scripts into parts with assigned voices for narrator and cast',
        'Mentor engineers, participate in internal talks and GenAI initiatives',
      ],
    },
    {
      id: 'apple',
      company: 'Apple',
      title: 'Front End Engineer',
      start: 'Nov 2018',
      end: 'Nov 2019',
      bullets: [
        'UI Team Lead for internal database provisioning tool',
        'Built feature flagging system tools for smooth beta rollouts',
        'Co-maintainer of Design System, drove adoption across teams',
        'Led technical discussions for UI infrastructure changes',
      ],
    },
    {
      id: 'facebook',
      company: 'Facebook',
      title: 'Front End Engineer',
      start: 'Feb 2016',
      end: 'Nov 2018',
      bullets: [
        'Built Ads Manager error UI and background publishing feature',
        'Established engineering guidelines for Facebook Design System on Web',
        'Built reusable components: dropdowns, selectors, virtualized tables',
        'Built unified graph for design resources',
        'Redesigned component documentation tool',
      ],
    },
    {
      id: 'boomtown',
      company: 'BoomTown',
      title: 'Senior Software Engineer',
      start: '2013',
      end: '2016',
      bullets: [
        'Pattern Library co-maintainer',
        'CRM performance optimization (80% load time reduction)',
        'Mentorship and build tools for client-side development',
      ],
    },
    {
      id: 'blackbaud',
      company: 'Blackbaud',
      title: 'Senior Software Engineer',
      start: '2008',
      end: '2013',
      bullets: [
        'Ticketing software from initial dev to client release',
        'Build team lead for next-gen products',
        'Patching and release utilities',
      ],
    },
  ],
  education: [
    {
      degree: 'B.S. Computer Science',
      school: 'Clemson University',
      year: '2008',
    },
  ],
} as const satisfies Profile

export type JobId = (typeof profile.jobs)[number]['id']

/** "Dec 2019 - Present" */
export function jobDates(job: Job): string {
  return `${job.start} - ${job.end ?? 'Present'}`
}

/** "2019-now", short enough for a floppy label. */
export function jobYears(job: Job): string {
  const year = (date: string) => date.slice(-4)
  return `${year(job.start)}-${job.end ? year(job.end) : 'now'}`
}
