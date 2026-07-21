import { Link } from "react-router-dom";
import { useContext } from "react";
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
    body: "Every feature ships with an owner in mind. If it doesn&rsquo;t save time or make money, it doesn&rsquo;t ship.",
  },
  {
    icon: Rocket,
    title: "Fast &amp; simple",
    body: "You should never need training to run your day. If the UI needs a manual, the UI is wrong.",
  },
  {
    icon: Users,
    title: "Team-friendly",
    body: "Owners, managers, and detailers all get workflows that suit their role &mdash; not shrunk-down copies.",
  },
];

const STATS = [
  { value: "320+", label: "Shops on DtailBase" },
  { value: "97%", label: "Booking uptime" },
  { value: "4.9", label: "Owner rating" },
  { value: "24/7", label: "Live customer support" },
];

export default function AboutPage() {
  const { isAuthenticated } = useContext(AuthContext);
  return (
    <PublicShell>
      <section className={styles.hero}>
        <div className={styles.container}>
          <span className={styles.eyebrow}>About</span>
          <h1 className={styles.title}>
            Software built by people who&rsquo;ve
            <span className={styles.titleAccent}> washed the cars.</span>
          </h1>
          <p className={styles.lede}>
            DtailBase started when a detailer got tired of missing deposits,
            paper indemnity forms and no-shows on Saturdays. We&rsquo;re on a
            mission to give every detailer the operations layer big brands take
            for granted.
          </p>
        </div>
      </section>

      <section className={styles.stats}>
        <div className={styles.container}>
          <ul className={styles.statsGrid}>
            {STATS.map((s) => (
              <li key={s.label} className={styles.stat}>
                <span className={styles.statValue}>{s.value}</span>
                <span className={styles.statLabel}>{s.label}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className={styles.story}>
        <div className={styles.container}>
          <div className={styles.storyGrid}>
            <div>
              <span className={styles.sectionEyebrow}>The story</span>
              <h2 className={styles.sectionTitle}>
                From two-bay side hustle to platform.
              </h2>
              <p className={styles.storyBody}>
                In 2023 we set out to fix the software problem for detailing
                shops. Off-the-shelf tools were either too generic or
                enterprise-priced. So we built the tool we wished existed &mdash;
                and let a handful of shops break it for us.
              </p>
              <p className={styles.storyBody}>
                Three years and hundreds of iterations later, DtailBase runs
                bookings, payments, job cards, indemnity and reporting for shops
                from single-bay startups to multi-location groups.
              </p>
              <p className={styles.storyBody}>
                We&rsquo;re still small. We ship every week. We answer emails
                ourselves. And we&rsquo;re only just getting started.
              </p>
            </div>

            <div className={styles.storyVisual} aria-hidden="true">
              <div className={`${styles.storyChip} ${styles.storyChip1}`}>
                <span className={styles.storyChipYear}>2023</span>
                <span>First shop live</span>
              </div>
              <div className={`${styles.storyChip} ${styles.storyChip2}`}>
                <span className={styles.storyChipYear}>2024</span>
                <span>100 detailers</span>
              </div>
              <div className={`${styles.storyChip} ${styles.storyChip3}`}>
                <span className={styles.storyChipYear}>2025</span>
                <span>Job cards + indemnity</span>
              </div>
              <div className={`${styles.storyChip} ${styles.storyChip4}`}>
                <span className={styles.storyChipYear}>2026</span>
                <span>320+ shops</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.values}>
        <div className={styles.container}>
          <div className={styles.valuesHead}>
            <span className={styles.sectionEyebrow}>What we care about</span>
            <h2 className={styles.sectionTitle}>Our operating principles.</h2>
          </div>

          <ul className={styles.valuesGrid}>
            {VALUES.map(({ icon: Icon, title, body }) => (
              <li key={title} className={styles.valueCard}>
                <span className={styles.valueIcon}>
                  <Icon size={20} strokeWidth={2.25} />
                </span>
                <h3 className={styles.valueTitle}>{title}</h3>
                <p
                  className={styles.valueBody}
                  dangerouslySetInnerHTML={{ __html: body }}
                />
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
                to={isAuthenticated ? "/bookings" : "/register"}
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
