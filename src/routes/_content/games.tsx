import { Link, createFileRoute } from '@tanstack/react-router'
import { TitleWithNav } from '~/components/Title'
import { canonical, seo } from '~/utils/seo'

export const Route = createFileRoute('/_content/games')({
  head: () => ({
    meta: seo({
      title: 'Games | Mark Funk',
      description: 'Small games, playable in the browser: The Harker Papers and Frankenstein.',
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
        <h2 className="tools-section-title">Frankenstein</h2>
        <p className="tools-description">
          Mary Shelley's{' '}
          <a
            href="https://www.gutenberg.org/ebooks/84"
            target="_blank"
            rel="noopener noreferrer"
          >
            Frankenstein
          </a>{' '}
          shoehorned into an 8-bit platformer, the way licensed Nintendo games
          used to do it with any story at all. Fifteen stages follow the novel
          in order: Victor chasing his old alchemy books across the rooftops of
          Ingolstadt, robbing graves, climbing to the laboratory on a dreary
          night of November, the storm over the Salève and the Mer de Glace;
          then the Creature's own tale at the De Lacey cottage and on the road
          to Geneva; Orkney, the wedding night at Evian, and the last chase
          across the Arctic ice. Hand-drawn on the NES palette, with chiptune
          music, cutscenes quoting the 1818 text, and touch controls.
        </p>
        <p className="tools-description">
          <a href="/games/frankenstein/index.html">Play Frankenstein →</a>
        </p>
        <p className="tools-description">
          Both games also run on the computer on the <Link to="/">desk</Link>,
          under Games.
        </p>
      </div>
    </div>
  )
}
