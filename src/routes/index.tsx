import { createFileRoute } from '@tanstack/react-router'
import { Desk } from '~/components/desk/Desk'
import { canonical, jsonLd, seo } from '~/utils/seo'
import { homeStructuredData } from '~/utils/structuredData'

export const Route = createFileRoute('/')({
  head: () => ({
    links: [
      canonical('/'),
      {
        rel: 'preload',
        href: '/fonts/funkie-dos.woff2',
        as: 'font',
        type: 'font/woff2',
        crossOrigin: 'anonymous',
      },
    ],
    meta: [
      ...seo({ title: 'Mark Funk | Software Engineer', path: '/' }),
      { name: 'theme-color', content: '#05070f' },
    ],
    scripts: [jsonLd(homeStructuredData())],
  }),
  component: Desk,
})
