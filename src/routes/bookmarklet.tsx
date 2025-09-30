import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { minify } from 'terser'
import { TitleWithNav } from '~/components/Title'

export const Route = createFileRoute('/bookmarklet')({
  component: Bookmarklet,
})

function Bookmarklet() {
  const [code, setCode] = useState<string>('')
  const [copied, setCopied] = useState(false)
  const [isMinifying, setIsMinifying] = useState(false)

  useEffect(() => {
    if (copied) {
      const timeout = setTimeout(() => {
        setCopied(false)
      }, 2000)
      return () => {
        clearTimeout(timeout)
      }
    }
  }, [copied])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsMinifying(true)
    const formData = new FormData(e.currentTarget)
    const inputCode = formData.get('code')?.toString() ?? ''

    try {
      const minifiedCode = await minify(
        {
          'file.js': inputCode,
        },
        {
          sourceMap: false,
          toplevel: true,
        }
      )
      setCode(`javascript:(function(){${encodeURI(minifiedCode.code ?? '')}})();`)
    } catch (ex) {
      console.error('Minification error:', ex)
      alert('Error minifying code')
    } finally {
      setIsMinifying(false)
    }
  }

  return (
    <div className="bookmarklet-container">
      <TitleWithNav>Bookmarklet</TitleWithNav>
      <form method="post" onSubmit={handleSubmit}>
        <div className="bookmarklet-grid">
          {code ? (
            <div>
              <pre className="bookmarklet-output">
                <code>{code}</code>
              </pre>
              <div className="bookmarklet-button-row">
                <button
                  type="button"
                  disabled={!code}
                  className={`bookmarklet-button ${code ? '' : 'bookmarklet-button-disabled'}`}
                  onClick={() => {
                    if (code) {
                      void navigator.clipboard.writeText(code)
                      setCopied(true)
                    }
                  }}
                >
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>
          ) : null}
          <div>
            <textarea
              className="bookmarklet-textarea"
              name="code"
              rows={10}
              placeholder="Enter your JavaScript code here..."
            />
            <div className="bookmarklet-button-row">
              <button
                className="bookmarklet-button"
                type="submit"
                disabled={isMinifying}
              >
                {isMinifying ? 'Translating...' : 'Translate'}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}