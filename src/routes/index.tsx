import { createFileRoute } from '@tanstack/react-router'
import { Desk } from '~/components/desk/Desk'

export const Route = createFileRoute('/')({
  head: () => ({
    links: [
      {
        rel: 'preload',
        href: '/fonts/funkie-dos.woff2',
        as: 'font',
        type: 'font/woff2',
        crossOrigin: 'anonymous',
      },
    ],
    meta: [{ name: 'theme-color', content: '#05070f' }],
  }),
  component: Desk,
})
