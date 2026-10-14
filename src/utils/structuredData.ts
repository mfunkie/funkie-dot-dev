import { profile } from '~/data/profile'
import { SITE_URL, absoluteUrl } from './seo'

const PERSON_ID = `${SITE_URL}/#person`

/** schema.org Person built from the resume data, for search engines. */
export function person() {
  return {
    '@type': 'Person',
    '@id': PERSON_ID,
    name: profile.name,
    url: SITE_URL,
    image: absoluteUrl('/photo.png'),
    description: profile.summary,
    jobTitle: profile.role,
    worksFor: { '@type': 'Organization', name: profile.company },
    alumniOf: profile.education.map((entry) => ({
      '@type': 'CollegeOrUniversity',
      name: entry.school,
    })),
    sameAs: profile.links.map((link) => link.href),
  }
}

/** Home page: the site and the person it belongs to. */
export function homeStructuredData() {
  return {
    '@graph': [
      {
        '@type': 'WebSite',
        name: 'funkie.dev',
        url: SITE_URL,
        author: { '@id': PERSON_ID },
      },
      person(),
    ],
  }
}

/** Resume page: a profile page about the person. */
export function resumeStructuredData() {
  return {
    '@type': 'ProfilePage',
    url: absoluteUrl('/resume'),
    mainEntity: person(),
  }
}
