import { createFileRoute } from '@tanstack/react-router'
import { Desk } from '~/components/desk/Desk'
import { jsonLd } from '~/utils/seo'
import { homeStructuredData } from '~/utils/structuredData'

/**
 * The desk is a pathless layout: `/` and every `/computer/...` URL render
 * inside it, so the 3D scene stays mounted and moving between those URLs
 * animates (the camera moves to the computer, the screen changes) instead of
 * reloading. The child routes only set the head; Desk reads the path.
 */
export const Route = createFileRoute('/_desk')({
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
    scripts: [jsonLd(homeStructuredData())],
  }),
  component: Desk,
})
