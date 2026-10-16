import { createFileRoute } from '@tanstack/react-router'
import { deskPath, parseDeskPath, routeTitle } from '~/components/desk/route'
import { canonical, seo } from '~/utils/seo'

/** `/computer` and everything under it: see `components/desk/route.ts`. */
export const Route = createFileRoute('/_desk/computer/$')({
  head: ({ params }) => {
    const route = parseDeskPath(`/computer/${params._splat ?? ''}`)
    const path = deskPath(route)
    return {
      links: [canonical(path)],
      meta: seo({ title: routeTitle(route), path }),
    }
  },
  component: () => null,
})
