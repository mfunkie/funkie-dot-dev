import { createFileRoute } from '@tanstack/react-router'
import { NavImage } from '~/components/Nav'
import styles from './index.module.css'

export const Route = createFileRoute('/')({
  component: Home,
})

function Home() {
  return (
    <div className={styles.resumeContainer}>
      <header className="title-with-nav">
        <div className={styles.resumeHeader}>
          <h1 className={styles.resumeName}>Mark Funk</h1>
          <div className={styles.contactLinks}>
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

      <section className={styles.resumeSection}>
        <h2 className={styles.sectionTitle}>Experience</h2>

        <div className={styles.jobEntry}>
          <div className={styles.jobHeader}>
            <div className={styles.jobTitleLine}>
              <h3 className={styles.jobCompany}>Netflix</h3>
              <span className={styles.jobTitle}>Senior Software Engineer</span>
            </div>
            <span className={styles.jobDates}>Dec 2019 - Present</span>
          </div>
          <ul className={styles.jobBullets}>
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

        <div className={styles.jobEntry}>
          <div className={styles.jobHeader}>
            <div className={styles.jobTitleLine}>
              <h3 className={styles.jobCompany}>Apple</h3>
              <span className={styles.jobTitle}>Front End Engineer</span>
            </div>
            <span className={styles.jobDates}>Nov 2018 - Nov 2019</span>
          </div>
          <ul className={styles.jobBullets}>
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

        <div className={styles.jobEntry}>
          <div className={styles.jobHeader}>
            <div className={styles.jobTitleLine}>
              <h3 className={styles.jobCompany}>Facebook</h3>
              <span className={styles.jobTitle}>Front End Engineer</span>
            </div>
            <span className={styles.jobDates}>Feb 2016 - Nov 2018</span>
          </div>
          <ul className={styles.jobBullets}>
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

        <div className={styles.jobEntry}>
          <div className={styles.jobHeader}>
            <div className={styles.jobTitleLine}>
              <h3 className={styles.jobCompany}>BoomTown</h3>
              <span className={styles.jobTitle}>Senior Software Engineer</span>
            </div>
            <span className={styles.jobDates}>2013 - 2016</span>
          </div>
          <ul className={styles.jobBullets}>
            <li>Pattern Library co-maintainer</li>
            <li>CRM performance optimization (80% load time reduction)</li>
            <li>Mentorship and build tools for client-side development</li>
          </ul>
        </div>

        <div className={styles.jobEntry}>
          <div className={styles.jobHeader}>
            <div className={styles.jobTitleLine}>
              <h3 className={styles.jobCompany}>Blackbaud</h3>
              <span className={styles.jobTitle}>Senior Software Engineer</span>
            </div>
            <span className={styles.jobDates}>2008 - 2013</span>
          </div>
          <ul className={styles.jobBullets}>
            <li>Ticketing software from initial dev to client release</li>
            <li>Build team lead for next-gen products</li>
            <li>Patching and release utilities</li>
          </ul>
        </div>
      </section>

      <section className={styles.resumeSection}>
        <h2 className={styles.sectionTitle}>Education</h2>

        <div className={styles.educationEntry}>
          <div>
            <h3 className={styles.educationDegree}>B.S. Computer Science</h3>
            <p className={styles.educationSchool}>Clemson University</p>
          </div>
          <span className={styles.educationYear}>2008</span>
        </div>
      </section>
    </div>
  )
}
