import { Link, Outlet, createFileRoute } from '@tanstack/react-router'

/** Centered, readable column for the regular pages (resume, tools). */
export const Route = createFileRoute('/_content')({
  component: ContentLayout,
})

function ContentLayout() {
  return (
    <div className="layout">
      <nav className="home-link-bar" aria-label="Site">
        <Link to="/" className="home-link">
          <span aria-hidden="true">←</span> Back to funkie.dev
        </Link>
      </nav>
      <Outlet />
    </div>
  )
}
