import { Link } from '@tanstack/react-router'

export function NotFound({ children }: { children?: any }) {
  return (
    <div className="space-y-2 p-2">
      <div style={{ color: 'var(--color-text-secondary)' }}>
        {children || <p>The page you are looking for does not exist.</p>}
      </div>
      <p className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => window.history.back()}
          style={{
            padding: '0.25rem 0.5rem',
            backgroundColor: 'var(--color-accent-green)',
            color: 'var(--color-bg)',
            border: 'none',
            textTransform: 'uppercase',
            fontWeight: 900,
            fontSize: '0.875rem',
            fontFamily: 'inherit',
            cursor: 'pointer',
          }}
        >
          Go back
        </button>
        <Link
          to="/"
          style={{
            padding: '0.25rem 0.5rem',
            backgroundColor: 'var(--color-accent-cyan)',
            color: 'var(--color-bg)',
            textTransform: 'uppercase',
            fontWeight: 900,
            fontSize: '0.875rem',
          }}
        >
          Start Over
        </Link>
      </p>
    </div>
  )
}
