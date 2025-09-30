import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import Color from 'color'
import { useEffect, useState } from 'react'
import { TitleWithNav } from '~/components/Title'

type ColorResponse = {
  hsl: string
  hex: string
  hsv: string
  hwb: string
  rgb: string
}

type ColorsSearch = {
  color?: string
}

const HEXLIKE_REGEX = /^([0-9a-f]{3}|[0-9a-f]{6})$/i

export const Route = createFileRoute('/colors')({
  validateSearch: (search: Record<string, unknown>): ColorsSearch => {
    return {
      color: (search.color as string) || undefined,
    }
  },
  loaderDeps: ({ search: { color } }) => ({ color }),
  loader: async ({ deps: { color } }) => {
    if (!color) {
      return null
    }

    try {
      const colorObj = Color(color)
      const hsl = colorObj.hsl()
      const hex = colorObj.hex()
      const hsv = colorObj.hsv()
      const hwb = colorObj.hwb()
      const rgb = colorObj.rgb()

      const response: ColorResponse = {
        hsl: hsl.string(3),
        hex,
        hsv: hsv.string(3),
        hwb: hwb.string(3),
        rgb: rgb.string(3),
      }
      return response
    } catch (ex) {
      if (typeof color === 'string' && HEXLIKE_REGEX.test(color)) {
        throw redirect({
          to: '/colors',
          search: { color: `#${color}` },
        })
      }
      throw redirect({
        to: '/colors',
      })
    }
  },
  component: Colors,
})

function Colors() {
  const data = Route.useLoaderData()
  const { color } = Route.useSearch()
  const navigate = useNavigate({ from: '/colors' })

  return (
    <div className="home-container">
      <TitleWithNav>Colors</TitleWithNav>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          const formData = new FormData(e.currentTarget)
          const colorValue = formData.get('color') as string
          navigate({
            search: { color: colorValue },
          })
        }}
      >
        <input
          autoFocus={!color}
          className="color-input"
          type="text"
          autoCapitalize="off"
          autoComplete="off"
          autoCorrect="off"
          name="color"
          placeholder="Please enter a color e.g. #FFF, #FFFFFF, rgb(255, 255, 255), hsl(0, 0%, 100%)..."
          key={color || 'initial'}
          defaultValue={color ?? ''}
        />
      </form>
      {data != null ? (
        <>
          <div className="color-results">
            <h2 className="color-result-label">HEX</h2>
            <p className="color-result-value">
              <CopyText text={data.hex} />
            </p>
            <h2 className="color-result-label">RGB</h2>
            <p className="color-result-value">
              <CopyText text={data.rgb} />
            </p>
            <h2 className="color-result-label">HSL</h2>
            <p className="color-result-value">
              <CopyText text={data.hsl} />
            </p>
            <h2 className="color-result-label">HSV</h2>
            <p className="color-result-value">
              <CopyText text={data.hsv} />
            </p>
            <h2 className="color-result-label">HWB</h2>
            <p className="color-result-value">
              <CopyText text={data.hwb} />
            </p>
          </div>
          <div className="color-preview checkerboard">
            <div
              style={{ backgroundColor: data.rgb }}
              className="color-circle"
            />
            <p
              style={{ color: data.rgb }}
              className="color-demo-text"
            >
              The quick brown fox jumps over the lazy dog
            </p>
          </div>
        </>
      ) : null}
    </div>
  )
}

function CopyText({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
  }

  useEffect(() => {
    function clearCopied() {
      setCopied(false)
    }
    const timeout = setTimeout(clearCopied, 1000)
    return () => clearTimeout(timeout)
  }, [copied])

  return (
    <div className="copy-text-container">
      <button
        className="copy-text-button"
        onClick={copy}
      >
        {text}
      </button>
      <div
        className={`copy-badge ${copied ? 'copy-badge-visible' : 'copy-badge-hidden'}`}
      >
        <span>copied</span>
      </div>
    </div>
  )
}