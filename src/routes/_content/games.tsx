import { Link, createFileRoute } from '@tanstack/react-router'
import { TitleWithNav } from '~/components/Title'
import { canonical, seo } from '~/utils/seo'

export const Route = createFileRoute('/_content/games')({
  head: () => ({
    meta: seo({
      title: 'Games | Mark Funk',
      description: 'Small games, playable in the browser: The Harker Papers, Frankenstein and The Great Gatsby.',
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
        <h2 id="harker-papers" className="tools-section-title">
          The Harker Papers
        </h2>
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
        <h2 id="frankenstein" className="tools-section-title">
          Frankenstein
        </h2>
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
          Every stage has its own link, like{' '}
          <a href="/games/frankenstein/index.html#/stage/5">/games/frankenstein/index.html#/stage/5</a>{' '}
          for the Mer de Glace, and so does every cutscene (
          <a href="/games/frankenstein/index.html#/story/creation">#/story/creation</a>).
          The address follows you as you play, so you can copy it to share
          where you are.
        </p>
        <h2 id="gatsby" className="tools-section-title">
          The Great Gatsby
        </h2>
        <p className="tools-description">
          F. Scott Fitzgerald's{' '}
          <a
            href="https://www.gutenberg.org/ebooks/64317"
            target="_blank"
            rel="noopener noreferrer"
          >
            The Great Gatsby
          </a>{' '}
          as the same kind of licensed 8-bit platformer, where every chapter
          somehow turns out to involve jumping on things. Nick Carraway, a bond
          salesman, throws bonds. He runs up the Buchanans' lawn &quot;jumping
          over sun-dials and brick walks and burning gardens&quot;, stomps the
          ash-grey men in the valley of ashes, and fights the billboard eyes of
          Doctor T. J. Eckleburg. He collects rumors at Gatsby's party, rides
          the roof of the cream-colored car over the Queensboro Bridge, and
          dodges Meyer Wolfsheim's fastballs. He climbs Gatsby's house on
          falling shirts. Young Jimmy Gatz gets a wall-jump, because his
          boyhood schedule really does list &quot;Dumbell exercise and
          wall-scaling, 6.15-6.30&quot;, and Gatsby takes on Tom at the Plaza
          and holds the line in the Argonne. The last stage is against the
          current, toward a green light that keeps moving away. Eleven stages
          over nine chapters, with chiptune jazz, cutscenes quoting the 1925
          text, and touch controls.
        </p>
        <p className="tools-description">
          <a href="/games/gatsby/index.html">Play The Great Gatsby →</a>
        </p>
        <p className="tools-description">
          It keeps its place in the address too: the Queensboro Bridge is{' '}
          <a href="/games/gatsby/index.html#/stage/4-1">#/stage/4-1</a>, and the
          party's cutscene is{' '}
          <a href="/games/gatsby/index.html#/story/ch3">#/story/ch3</a>.
        </p>
        <p className="tools-description">
          All three games also run on the computer on the{' '}
          <Link to="/">desk</Link>, under Games, and can be linked there too:{' '}
          <a href="/computer/games/frankenstein">/computer/games/frankenstein</a>,{' '}
          <a href="/computer/games/gatsby">/computer/games/gatsby</a>.
        </p>
      </div>
    </div>
  )
}
