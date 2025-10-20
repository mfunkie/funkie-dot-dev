import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { Link, useRouterState } from '@tanstack/react-router'

export function NavImage() {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        aria-label="Mark Funk"
        className="nav-image-button"
      >
        <div
          style={{
            backgroundImage: 'url(/photo.png)',
          }}
          className="nav-avatar"
        />
      </DropdownMenu.Trigger>
      <DropdownMenu.Content
        align="end"
        className="dropdown-content"
      >
        <DropdownMenuItemLink to="/">funkie.dev</DropdownMenuItemLink>
        <DropdownMenu.Label className="dropdown-label">
          Experiments
        </DropdownMenu.Label>
        <DropdownMenuItemLink to="/colors" className="indent">
          Colors
        </DropdownMenuItemLink>
        <DropdownMenuItemLink to="/tools" className="indent">
          Tools
        </DropdownMenuItemLink>
        <DropdownMenuItemLink to="/movies" className="indent">
          Movies
        </DropdownMenuItemLink>
        <DropdownMenuItemLink to="/bookmarklet" className="indent">
          Bookmarklet
        </DropdownMenuItemLink>
        <DropdownMenuItemLink to="/confetti" className="indent">
          Confetti
        </DropdownMenuItemLink>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  )
}

function DropdownMenuItemLink(props: {
  to: string
  children: React.ReactNode
  className?: string
}) {
  const { to } = props

  const active = useIsRouteActive(to)

  return (
    <DropdownMenu.Item asChild>
      <Link
        to={to}
        className={`dropdown-link ${props.className || ''} ${active ? 'active' : ''}`}
      >
        {props.children}
      </Link>
    </DropdownMenu.Item>
  )
}

function useIsRouteActive(to: string) {
  const router = useRouterState()
  const isBaseRoute = to === '/'
  const currentPath = router.location.pathname

  if (isBaseRoute) {
    return currentPath === '/'
  }

  return currentPath.startsWith(to)
}