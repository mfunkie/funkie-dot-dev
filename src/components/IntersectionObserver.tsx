import { useRef, useState } from 'react'
import useIntersection from 'react-use/lib/useIntersection'

export function IntersectionObserver() {
  const [rootMargin, setRootMargin] = useState(0)
  const [threshold, setThreshold] = useState(0.5)
  const [size, setSize] = useState(48)

  return (
    <div className="intersection-container">
      <div className="intersection-controls">
        <label htmlFor="margin" className="control-label">
          <span>Root Margin</span>
          <span className="control-value">{rootMargin}px</span>
        </label>
        <input
          type="range"
          id="margin"
          name="margin"
          min="-48"
          max="48"
          step="8"
          value={rootMargin}
          onChange={(e) => {
            setRootMargin(Number(e.target.value))
          }}
        />
        <label htmlFor="threshold" className="control-label">
          <span>Threshold</span>
          <span className="control-value">{threshold}</span>
        </label>
        <input
          type="range"
          id="threshold"
          name="threshold"
          min="0.1"
          max="1"
          step="0.1"
          value={threshold}
          onChange={(e) => {
            setThreshold(Number(e.target.value))
          }}
        />
        <label htmlFor="size" className="control-label">
          <span>Size</span>
          <span className="control-value">{size}px</span>
        </label>
        <input
          type="range"
          id="size"
          name="size"
          min="48"
          max="96"
          step="8"
          value={size}
          onChange={(e) => {
            setSize(Number(e.target.value))
          }}
        />
      </div>
      <div className="intersection-demo">
        <div className="intersection-relative">
          <div
            className="intersection-boundary intersection-boundary-top"
            style={{
              height: size,
              minHeight: size,
              transform: `translateY(calc(0px - ${rootMargin}px - ${
                (1 - threshold) * size
              }px))`,
            }}
          />
          <div
            className="intersection-boundary intersection-boundary-bottom"
            style={{
              height: size,
              minHeight: size,
              transform: `translateY(calc(${rootMargin}px + ${
                (1 - threshold) * size
              }px))`,
            }}
          />
          <div
            id="scrollRoot"
            className="intersection-scroll-root"
            style={{
              outline:
                rootMargin < 0
                  ? '2px dashed rgb(219, 39, 119)'
                  : '2px dashed rgb(249, 168, 212)',
              outlineOffset: rootMargin,
            }}
          >
            {[...Array(30)].map((_, i) => (
              <IntersectionItem
                key={i}
                rootMargin={rootMargin}
                threshold={threshold}
                size={size}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function IntersectionItem({
  rootMargin,
  threshold,
  size,
}: {
  rootMargin: number
  threshold: number
  size: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const entry = useIntersection(ref as React.RefObject<HTMLElement>, {
    root:
      typeof document !== 'undefined'
        ? document.getElementById('scrollRoot')
        : null,
    rootMargin: `${rootMargin}px`,
    threshold,
  })

  return (
    <div
      ref={ref}
      className={`intersection-item ${
        entry?.isIntersecting ? 'intersection-item-active' : ''
      }`}
      style={{
        height: size,
        minHeight: size,
        width: size,
      }}
    >
      {entry?.isIntersecting ? '✅' : '❌'}
    </div>
  )
}