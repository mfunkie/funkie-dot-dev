import { createFileRoute } from '@tanstack/react-router'
import { TitleWithNav } from '~/components/Title'

export const Route = createFileRoute('/')({
  component: Home,
})

function Home() {
  return (
    <div className="home-container">
      <TitleWithNav>Hey</TitleWithNav>
      <div className="bio-text">
        <p>
          My name is <span className="highlight">Mark Funk</span>. I'm a UI
          Engineer currently working at{' '}
          <span className="highlight">Netflix</span>. This page is mostly a{' '}
          <span className="highlight">UI playground</span>, where I experiment
          with different technologies and tools. You can reach me on{' '}
          <a
            href="https://bsky.app/profile/funkie.dev"
            target="_blank"
            rel="noopener noreferrer"
          >
            Bluesky
          </a>{' '}
          or{' '}
          <a
            href="https://www.github.com/mfunkie"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>
          .
        </p>
      </div>
    </div>
  )
}
