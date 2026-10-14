import { createFileRoute } from '@tanstack/react-router'
import { NavImage } from '~/components/Nav'
import { jobDates, profile } from '~/data/profile'
import { canonical, jsonLd, seo } from '~/utils/seo'
import { resumeStructuredData } from '~/utils/structuredData'
import styles from './resume.module.css'

export const Route = createFileRoute('/_content/resume')({
  head: () => ({
    meta: seo({
      title: 'Resume | Mark Funk',
      description: profile.summary,
      path: '/resume',
    }),
    links: [canonical('/resume')],
    scripts: [jsonLd(resumeStructuredData())],
  }),
  component: Resume,
})

function Resume() {
  return (
    <div className={styles.resumeContainer}>
      <header className="title-with-nav">
        <div className={styles.resumeHeader}>
          <h1 className={styles.resumeName}>{profile.name}</h1>
          <div className={styles.contactLinks}>
            {profile.links.map((link, i) => (
              <span key={link.href} className={styles.contactLink}>
                {i > 0 && <span aria-hidden="true">|</span>}
                <a href={link.href} target="_blank" rel="noopener noreferrer">
                  {link.label}
                </a>
              </span>
            ))}
          </div>
        </div>
        <NavImage />
      </header>

      <section className={styles.resumeSection}>
        <h2 className={styles.sectionTitle}>Experience</h2>

        {profile.jobs.map((job) => (
          <div key={job.id} id={job.id} className={styles.jobEntry}>
            <div className={styles.jobHeader}>
              <div className={styles.jobTitleLine}>
                <h3 className={styles.jobCompany}>{job.company}</h3>
                <span className={styles.jobTitle}>{job.title}</span>
              </div>
              <span className={styles.jobDates}>{jobDates(job)}</span>
            </div>
            <ul className={styles.jobBullets}>
              {job.bullets.map((bullet) => (
                <li key={bullet}>{bullet}</li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      <section className={styles.resumeSection}>
        <h2 className={styles.sectionTitle}>Education</h2>

        {profile.education.map((entry) => (
          <div key={entry.degree} className={styles.educationEntry}>
            <div>
              <h3 className={styles.educationDegree}>{entry.degree}</h3>
              <p className={styles.educationSchool}>{entry.school}</p>
            </div>
            <span className={styles.educationYear}>{entry.year}</span>
          </div>
        ))}
      </section>
    </div>
  )
}
