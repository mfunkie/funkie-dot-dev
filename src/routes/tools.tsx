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
        <p className="tools-description">
          An interactive demo of the browser's{' '}
          <a
            href="https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API"
            target="_blank"
            rel="noopener noreferrer"
          >
            Intersection Observer API
          </a>
          . Scroll through the container and watch items react as they enter or
          leave the visible area. Each box shows a checkmark when it's
          intersecting and an X when it's not.
        </p>
        <dl className="tools-controls-description">
          <dt>Root Margin</dt>
          <dd>
            Expands or shrinks the detection boundary around the scroll
            container. Positive values trigger intersection earlier (before items
            are visible), negative values trigger later (items must scroll
            further in). The dashed outline shows the effective boundary.
          </dd>
          <dt>Threshold</dt>
          <dd>
            The fraction of an item that must be visible before it counts as
            intersecting. At 0.1 just a sliver is enough; at 1.0 the entire item
            must be in view. The amber overlays show where the threshold
            boundary falls.
          </dd>
          <dt>Size</dt>
          <dd>
            Controls the dimensions of each item box. Larger items require more
            scrolling to fully enter or exit the viewport, making threshold
            effects more noticeable.
          </dd>
        </dl>
        <IntersectionObserver />
      </div>
    </div>
  )
}