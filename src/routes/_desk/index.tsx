import { createFileRoute } from '@tanstack/react-router'
import { canonical, seo } from '~/utils/seo'

export const Route = createFileRoute('/_desk/')({
  head: () => ({
    links: [canonical('/')],
    meta: seo({ title: 'Mark Funk | Software Engineer', path: '/' }),
  }),
  component: () => null,
})
