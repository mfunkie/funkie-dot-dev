import { createFileRoute } from '@tanstack/react-router'
import { IntersectionObserver } from '~/components/IntersectionObserver'
import { TitleWithNav } from '~/components/Title'

export const Route = createFileRoute('/tools')({
  component: Tools,
})

function Tools() {
  return (
    <div className="tools-container">
      <TitleWithNav>Tools</TitleWithNav>
      <div className="tools-content">
        <h2 className="tools-section-title">Intersection Observer</h2>
        <IntersectionObserver />
      </div>
    </div>
  )
}