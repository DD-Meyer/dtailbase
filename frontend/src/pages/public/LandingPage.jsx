import { Link } from "react-router-dom";
import {
  ArrowDown, ArrowRight, CalendarDays, Check, Clock,
  ClipboardCheck, FileCheck2, ShieldCheck, UsersRound,
} from "lucide-react";
import { createElement, useContext, useState } from "react";
import { AuthContext } from "../../context/AuthContext";
import PublicShell from "../../components/public/PublicShell";
import AppDemo from "../../components/public/AppDemo";
import styles from "./LandingPage.module.css";

const FEATURES = [
  { id: "bookings", icon: CalendarDays, title: "Bookings that stay connected", body: "Give customers a booking page connected to your services, availability, and appointment records." },
  { id: "jobs", icon: ClipboardCheck, title: "Live job cards, not clipboards", body: "Keep statuses, timers, notes, and before-and-after photos together from drop-off to collection." },
  { id: "customers", icon: ShieldCheck, title: "Proof built into every job", body: "Keep customers, vehicles, digital indemnity, and service history in one clean record." },
  { id: "team", icon: UsersRound, title: "A team that stays in sync", body: "Give staff the right access to the workshop tools they use every day." },
];
const STEPS = [
  { title: "Customers book online", body: "They choose a service and an available time without calling." },
  { title: "Your team runs the job", body: "Statuses, timers, photos, and notes stay together in the bay." },
  { title: "Everything closes cleanly", body: "Waivers, photos, and service history stay with the booking." },
];
const FAQS = [
  { question: "Can I use DtailBase on the workshop floor?", answer: "Yes. DtailBase works as an installable web app on modern phones, tablets, and desktops. No app store download is required." },
  { question: "How do I get started?", answer: "Create your account, add your services and opening hours, and share your booking link. Visit our help center if you need guidance." },
  { question: "Can I start with a free plan?", answer: "Yes. Start with the Starter plan and compare paid options when you need more capacity or tools. See the plans page for current limits." },
];

export default function LandingPage() {
  const { isAuthenticated } = useContext(AuthContext);
  const [openFaq, setOpenFaq] = useState(0);
  const primaryCtaTo = isAuthenticated ? "/dashboard" : "/register";
  const primaryCtaLabel = isAuthenticated ? "Go to dashboard" : "Start for free";

  return (
    <PublicShell marketing>
      <section className={styles.hero} id="top">
        <div className={styles.heroCopy}>
          <h1>Your craft,<br /><em>minus the admin.</em></h1>
          <p className={styles.heroLede}>
            The all-in-one workspace for bookings, job cards, waivers, customers,
            and teams. Spend less time managing work and more time doing it.
          </p>
          <div className={styles.heroActions}>
            <Link to={primaryCtaTo} className={styles.primaryButton}>
              {primaryCtaLabel}<ArrowRight size={20} aria-hidden="true" />
            </Link>
            <Link to="/#platform" className={styles.textLink}>
              Explore the platform<ArrowDown size={17} aria-hidden="true" />
            </Link>
          </div>
          <div className={styles.heroProof}>
            <FileCheck2 size={21} aria-hidden="true" />
            <p><strong>Focus on your craft.</strong> Keep the admin in one place.</p>
          </div>
        </div>
        <div className={styles.heroVisual}>
          <figure className={styles.heroImage}>
            <img
              src="/landing/images/detailing-hero.jpg"
              alt="Professional detailer polishing a car inside a workshop"
              width="1400" height="1867" fetchpriority="high"
            />
          </figure>
          <div className={styles.jobCard} role="group" aria-label="Illustrative job card">
            <div className={styles.jobTop}>
              <span className={styles.statusDot} />In progress
              <span className={styles.jobTime}>01:42:18</span>
            </div>
            <p className={styles.jobLabel}>TODAY · BAY 02</p>
            <h2>BMW M4 Competition</h2>
            <p>Full detail + ceramic protection</p>
            <div className={styles.progress}><span /></div>
            <div className={styles.jobBottom}>
              <span>Photos + job notes</span>
              <span><Check size={16} aria-hidden="true" />Waiver signed</span>
            </div>
          </div>
          <div className={styles.depositChip} role="group" aria-label="Illustrative booking notification">
            <span className={styles.depositIcon}><CalendarDays size={18} aria-hidden="true" /></span>
            <div><small>Appointment confirmed</small><strong>Ready for the workshop</strong></div>
            <Check size={18} aria-hidden="true" />
          </div>
        </div>
      </section>

      <section className={styles.capabilities} aria-label="Connected platform capabilities">
        <p>Built around the work of a detailing business</p>
        <div><span>ONLINE BOOKINGS</span><span>LIVE JOB CARDS</span><span>Digital indemnity</span><span>CUSTOMER RECORDS</span><span>TEAM TOOLS</span></div>
      </section>

      <section className={`${styles.platform} ${styles.sectionShell}`} id="platform">
        <header className={styles.introHeading}>
          <h2>Everything in its place.<br /><em>Every job in motion.</em></h2>
          <p>Replace the calendar, spreadsheet, chat thread, and clipboard with one connected workflow.</p>
        </header>
        <ul className={styles.featureGrid}>
          {FEATURES.map(({ id, icon: Icon, title, body }, index) => (
            <li className={styles.featureCard} key={title}>
              <div className={styles.featureTop}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <span className={styles.iconBox}>{createElement(Icon, { size: 22, "aria-hidden": true })}</span>
              </div>
              <h3>{title}</h3><p>{body}</p>
              <Link to={`/products#${id}`} className={styles.learnLink} aria-label={`Learn about ${title}`}>
                Learn more<ArrowRight size={16} aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className={styles.workflow} id="workflow">
        <div className={styles.workflowCopy}>
          <h2>From first click<br />to final <em>shine.</em></h2>
          <p>Keep the customer, vehicle, team, and job history connected from booking through collection.</p>
          <ol className={styles.steps}>
            {STEPS.map(({ title, body }, index) => (
              <li key={title}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <div><h3>{title}</h3><p>{body}</p></div>
              </li>
            ))}
          </ol>
        </div>
        <div className={styles.workflowStage}>
          <AppDemo />
          <div className={styles.connectedChip}><Clock size={24} aria-hidden="true" /><div><strong>One connected workflow</strong><small>From booking to collection</small></div></div>
        </div>
      </section>

      <section className={`${styles.mobileSection} ${styles.sectionShell}`}>
        <figure className={styles.mobileVisual}>
          <a className={styles.phoneFrame} href="/landing/images/app-customers-mobile.webp" target="_blank" rel="noreferrer" aria-label="View the full mobile app screenshot">
            <img src="/landing/images/app-customers-mobile.webp" alt="Compact mobile customer records showing fictional customers Maya Bennett and Noah Brooks" width="390" height="844" loading="lazy" decoding="async" />
          </a>
          <figcaption>Actual mobile app. Fictional customer records.</figcaption>
        </figure>
        <div className={styles.mobileCopy}>
          <h2>Built for hands<br />that are <em>busy.</em></h2>
          <p>Quick taps, clear states, and a focused view of the work. Manage the day from your phone, tablet, or desktop.</p>
          <ul>
            <li><Check size={22} aria-hidden="true" />Installable web app, no app store</li>
            <li><Check size={22} aria-hidden="true" />Works across phone, tablet, and desktop</li>
            <li><Check size={22} aria-hidden="true" />Role-based views for your team</li>
          </ul>
          <Link to="/products" className={styles.outlineButton}>See the platform<ArrowRight size={18} aria-hidden="true" /></Link>
        </div>
      </section>

      <section className={styles.story} id="stories">
        <figure className={styles.storyImage}>
          <img
            src="/landing/images/detailer-story.jpg"
            alt="Detailing professional working beside a black car"
            width="1200" height="900" loading="lazy" decoding="async"
          />
          <figcaption>Photo: Unsplash</figcaption>
        </figure>
        <div className={styles.storyCopy}>
          <h2>Every car. Every photo.<br /><em>Everything together.</em></h2>
          <p className={styles.storyStatement}>
            Give your team one place for the work, from the first booking to the final handover.
          </p>
          <div className={styles.storyBottom}><div><strong>Built around your workshop</strong><span>Bookings, job cards, and service history</span></div><Link to="/about">Our story<ArrowRight size={17} aria-hidden="true" /></Link></div>
        </div>
      </section>

      <section className={`${styles.faq} ${styles.sectionShell}`} id="faq">
        <h2>Good to know<br /><em>before you start.</em></h2>
        <div className={styles.faqList}>
          {FAQS.map(({ question, answer }, index) => (
            <div className={styles.faqItem} key={question}>
              <button type="button" onClick={() => setOpenFaq(openFaq === index ? null : index)} aria-expanded={openFaq === index} aria-controls={`faq-answer-${index}`} id={`faq-question-${index}`}>
                {question}<span aria-hidden="true">{openFaq === index ? "−" : "+"}</span>
              </button>
              <div id={`faq-answer-${index}`} role="region" aria-labelledby={`faq-question-${index}`} hidden={openFaq !== index}><p>{answer}</p></div>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.finalCta}>
        <div className={styles.ctaRings} aria-hidden="true" />
        <h2>Less paperwork.<br /><em>More perfect finishes.</em></h2>
        <p>Your bookings, job cards, and team in one place.</p>
        <Link to={primaryCtaTo} className={styles.whiteButton}>{primaryCtaLabel}<ArrowRight size={20} aria-hidden="true" /></Link>
      </section>
    </PublicShell>
  );
}
