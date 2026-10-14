import { Link } from "react-router-dom";
import { createElement, useContext } from "react";
import { Target, Heart, Rocket, Users, ArrowRight } from "lucide-react";
import PublicShell from "../../components/public/PublicShell";
import { AuthContext } from "../../context/AuthContext";
import styles from "./AboutPage.module.css";

const VALUES = [
  {
    icon: Target,
    title: "Purpose-built",
    body: "We only make one thing: software for detailers. Every decision is judged against your shop floor.",
  },
  {
    icon: Heart,
    title: "Customer-first",
    body: "Every feature ships with an owner in mind. If it does not save time or make money, it does not ship.",
  },
  {
    icon: Rocket,
    title: "Fast and simple",
    body: "You should never need training to run your day. If the UI needs a manual, the UI is wrong.",
  },
  {
    icon: Users,
    title: "Team-friendly",
    body: "Owners, managers, and detailers all get workflows that suit their role, not shrunk-down copies.",
  },
];

export default function AboutPage() {
  const { isAuthenticated } = useContext(AuthContext);
  return (
    <PublicShell marketing>
      <section className={styles.hero}>
        <div className={styles.container}>
          <h1 className={styles.title}>
            A workspace for people who
            <span className={styles.titleAccent}> care for cars.</span>
          </h1>
          <p className={styles.lede}>
            DtailBase brings bookings, deposits, job records, and team
            workflows together. Less scattered paperwork, more attention
            for your workshop and its customers.
          </p>
        </div>
      </section>

      <section className={styles.story}>
        <div className={styles.container}>
          <div className={styles.storyGrid}>
            <div>
              <h2 className={styles.sectionTitle}>
                Software that belongs <em>in the workshop.</em>
              </h2>
              <p className={styles.storyBody}>
                Detailing is precise work. Managing it should not mean
                juggling a calendar, a clipboard, and a group chat.
                DtailBase brings the records for each job together.
              </p>
              <p className={styles.storyBody}>
                Bookings, payments, job cards, indemnity, and team tools
                stay connected so you can focus on the cars and the people
                who trust you with them.
              </p>
            </div>

            <figure className={styles.storyVisual}>
              <img src="/landing/images/detailer-story.jpg" alt="Detailing professional working beside a black car" width="1200" height="900" loading="lazy" decoding="async" />
              <figcaption>Photo: Unsplash</figcaption>
            </figure>
          </div>
        </div>
      </section>

      <section className={styles.values}>
        <div className={styles.container}>
          <div className={styles.valuesHead}>
            <h2 className={styles.sectionTitle}>Our operating principles.</h2>
          </div>

          <ul className={styles.valuesGrid}>
            {VALUES.map(({ icon: Icon, title, body }) => (
              <li key={title} className={styles.valueCard}>
                <span className={styles.valueIcon}>
                  {createElement(Icon, { size: 20, strokeWidth: 2.25 })}
                </span>
                <h3 className={styles.valueTitle}>{title}</h3>
                <p className={styles.valueBody}>{body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className={styles.cta}>
        <div className={styles.container}>
          <div className={styles.ctaCard}>
            <h2 className={styles.ctaTitle}>Come build with us.</h2>
            <p className={styles.ctaLede}>
              Whether you&rsquo;re a shop owner, a detailer or a partner, we&rsquo;d
              love to hear from you.
            </p>
            <div className={styles.ctaActions}>
              <Link
                to={isAuthenticated ? "/dashboard" : "/register"}
                className={styles.ctaPrimary}
              >
                {isAuthenticated ? "Go to dashboard" : "Start free trial"}
                <ArrowRight size={16} strokeWidth={2.5} />
              </Link>
              <Link to="/contact" className={styles.ctaGhost}>
                Get in touch
              </Link>
            </div>
          </div>
        </div>
      </section>
    </PublicShell>
  );
}
