import { createFileRoute } from '@tanstack/react-router'
import { NavImage } from '~/components/Nav'

export const Route = createFileRoute('/')({
  component: Home,
})

function Home() {
  return (
    <div className="resume-container">
      <header className="title-with-nav">
        <div className="resume-header">
          <h1 className="resume-name">Mark Funk</h1>
          <div className="contact-links">
            <a
              href="https://bsky.app/profile/funkie.dev"
              target="_blank"
              rel="noopener noreferrer"
            >
              Bluesky
            </a>
            <span>|</span>
            <a
              href="https://www.github.com/mfunkie"
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub
            </a>
            <span>|</span>
            <a
              href="https://www.linkedin.com/in/mark-funk-04496625"
              target="_blank"
              rel="noopener noreferrer"
            >
              LinkedIn
            </a>
          </div>
        </div>
        <NavImage />
      </header>

      <section className="resume-section">
        <h2 className="section-title">Experience</h2>

        <div className="job-entry">
          <div className="job-header">
            <div className="job-title-line">
              <h3 className="job-company">Netflix</h3>
              <span className="job-title">Senior Software Engineer</span>
            </div>
            <span className="job-dates">Dec 2019 - Present</span>
          </div>
          <ul className="job-bullets">
            <li>
              UI lead for Scripts team managing screenplay data and insights
            </li>
            <li>
              Built Script Viewer with PDF mode, structural modes (Final
              Draft-like formatting for dialogues, actions, scene headers), and
              mobile mode
            </li>
            <li>
              Currently building React Native iOS app for script viewing and
              radioplay feedback
            </li>
            <li>
              RadioPlay: TTS feature using ElevenLabs, breaking scripts into
              parts with assigned voices for narrator and cast
            </li>
            <li>
              Mentor engineers, participate in internal talks and GenAI
              initiatives
            </li>
          </ul>
        </div>

        <div className="job-entry">
          <div className="job-header">
            <div className="job-title-line">
              <h3 className="job-company">Apple</h3>
              <span className="job-title">Front End Engineer</span>
            </div>
            <span className="job-dates">Nov 2018 - Nov 2019</span>
          </div>
          <ul className="job-bullets">
            <li>UI Team Lead for internal database provisioning tool</li>
            <li>
              Built feature flagging system tools for smooth beta rollouts
            </li>
            <li>
              Co-maintainer of Design System, drove adoption across teams
            </li>
            <li>Led technical discussions for UI infrastructure changes</li>
          </ul>
        </div>

        <div className="job-entry">
          <div className="job-header">
            <div className="job-title-line">
              <h3 className="job-company">Facebook</h3>
              <span className="job-title">Front End Engineer</span>
            </div>
            <span className="job-dates">Feb 2016 - Nov 2018</span>
          </div>
          <ul className="job-bullets">
            <li>Built Ads Manager error UI and background publishing feature</li>
            <li>
              Established engineering guidelines for Facebook Design System on
              Web
            </li>
            <li>
              Built reusable components: dropdowns, selectors, virtualized
              tables
            </li>
            <li>Built unified graph for design resources</li>
            <li>Redesigned component documentation tool</li>
          </ul>
        </div>

        <div className="job-entry">
          <div className="job-header">
            <div className="job-title-line">
              <h3 className="job-company">BoomTown</h3>
              <span className="job-title">Senior Software Engineer</span>
            </div>
            <span className="job-dates">2013 - 2016</span>
          </div>
          <ul className="job-bullets">
            <li>Pattern Library co-maintainer</li>
            <li>CRM performance optimization (80% load time reduction)</li>
            <li>Mentorship and build tools for client-side development</li>
          </ul>
        </div>

        <div className="job-entry">
          <div className="job-header">
            <div className="job-title-line">
              <h3 className="job-company">Blackbaud</h3>
              <span className="job-title">Senior Software Engineer</span>
            </div>
            <span className="job-dates">2008 - 2013</span>
          </div>
          <ul className="job-bullets">
            <li>Ticketing software from initial dev to client release</li>
            <li>Build team lead for next-gen products</li>
            <li>Patching and release utilities</li>
          </ul>
        </div>
      </section>

      <section className="resume-section">
        <h2 className="section-title">Education</h2>

        <div className="education-entry">
          <div>
            <h3 className="education-degree">B.S. Computer Science</h3>
            <p className="education-school">Clemson University</p>
          </div>
          <span className="education-year">2008</span>
        </div>
      </section>
    </div>
  )
}
