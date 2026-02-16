import {
  ErrorComponent,
  Link,
  rootRouteId,
  useMatch,
  useRouter,
} from '@tanstack/react-router'
import type { ErrorComponentProps } from '@tanstack/react-router'

export function DefaultCatchBoundary({ error }: ErrorComponentProps) {
  const router = useRouter()
  const isRoot = useMatch({
    strict: false,
    select: (state) => state.id === rootRouteId,
  })

  console.error('DefaultCatchBoundary Error:', error)

  return (
    <div className="min-w-0 flex-1 p-4 flex flex-col items-center justify-center gap-6">
      <ErrorComponent error={error} />
      <div className="flex gap-2 items-center flex-wrap">
        <button
          onClick={() => {
            router.invalidate()
          }}
          style={{
            padding: '0.25rem 0.5rem',
            backgroundColor: 'var(--color-border)',
            color: 'var(--color-text)',
            border: '1px solid var(--color-border)',
            textTransform: 'uppercase',
            fontWeight: 800,
            fontFamily: 'inherit',
            cursor: 'pointer',
          }}
        >
          Try Again
        </button>
        {isRoot ? (
          <Link
            to="/"
            style={{
              padding: '0.25rem 0.5rem',
              backgroundColor: 'var(--color-border)',
              color: 'var(--color-text)',
              border: '1px solid var(--color-border)',
              textTransform: 'uppercase',
              fontWeight: 800,
            }}
          >
            Home
          </Link>
        ) : (
          <Link
            to="/"
            style={{
              padding: '0.25rem 0.5rem',
              backgroundColor: 'var(--color-border)',
              color: 'var(--color-text)',
              border: '1px solid var(--color-border)',
              textTransform: 'uppercase',
              fontWeight: 800,
            }}
            onClick={(e) => {
              e.preventDefault()
              window.history.back()
            }}
          >
            Go Back
          </Link>
        )}
      </div>
    </div>
  )
}
