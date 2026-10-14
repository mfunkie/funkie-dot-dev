import { Outlet, createFileRoute } from '@tanstack/react-router'

/** Centered, readable column for the regular pages (resume, tools). */
export const Route = createFileRoute('/_content')({
  component: ContentLayout,
})

function ContentLayout() {
  return (
    <div className="layout">
      <Outlet />
    </div>
  )
}
