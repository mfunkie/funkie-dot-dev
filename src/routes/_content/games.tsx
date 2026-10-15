import { Link, createFileRoute } from '@tanstack/react-router'
import { TitleWithNav } from '~/components/Title'
import { canonical, seo } from '~/utils/seo'

export const Route = createFileRoute('/_content/games')({
  head: () => ({
    meta: seo({
      title: 'Games | Mark Funk',
      description: 'Small games, playable in the browser.',
      path: '/games',
    }),
    links: [canonical('/games')],
  }),
  component: Games,
})

function Games() {
  return (
    <div className="tools-container">
      <TitleWithNav>Games</TitleWithNav>
      <div className="tools-content">
        <h2 className="tools-section-title">The Harker Papers</h2>
        <p className="tools-description">
          A point-and-click adventure through Bram Stoker's{' '}
          <a
            href="https://www.gutenberg.org/ebooks/345"
            target="_blank"
            rel="noopener noreferrer"
          >
            Dracula
          </a>
          , in seven chapters. Like the novel, it's told through the journals,
          letters and diaries of the people who lived it: Jonathan in the
          castle, Mina at Whitby, Seward and Van Helsing at Lucy's bedside, and
          everyone on the race to the Borgo Pass before sunset. The scenes are
          drawn in SVG and it's all vanilla JavaScript, with your progress saved
          in the browser.
        </p>
        <p className="tools-description">
          <a href="/games/harker-papers/index.html">Play The Harker Papers →</a>
        </p>
        <p className="tools-description">
          It also runs on the computer on the <Link to="/">desk</Link>, under
          Games.
        </p>
      </div>
    </div>
  )
}
