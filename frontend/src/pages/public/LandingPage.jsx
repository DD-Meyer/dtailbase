import { Link } from "react-router-dom";
import { useContext } from "react";
import {
  Calendar,
  CreditCard,
  Wrench,
  Users,
  Sparkles,
  Star,
  ArrowRight,
  Check,
  ShieldCheck,
  Smartphone,
  Zap,
} from "lucide-react";
import PublicShell from "../../components/public/PublicShell";
import { AuthContext } from "../../context/AuthContext";
import styles from "./LandingPage.module.css";

const FEATURES = [
  {
    icon: Calendar,
    title: "Smart online booking",
    body: "Let customers book slots that fit your schedule automatically. No double-bookings, no missed calls.",
    tone: "amber",
  },
  {
    icon: CreditCard,
    title: "Payments that just work",
    body: "Take deposits at booking. Auto-invoice on completion. Payouts arrive in your account the next day.",
    tone: "blue",
  },
  {
    icon: Wrench,
    title: "Job cards on the shop floor",
    body: "Every booking becomes a live job card with timers, photos, add-ons and signature capture.",
    tone: "amber",
  },
  {
    icon: Users,
    title: "Team and roles",
    body: "Give staff scoped access, track who did what, and reward top performers with clear stats.",
    tone: "blue",
  },
  {
    icon: ShieldCheck,
    title: "Digital indemnity",
    body: "Legal waivers signed on the vehicle, stored with the booking. Compliance made effortless.",
    tone: "amber",
  },
  {
    icon: Smartphone,
    title: "Runs on any phone",
    body: "Installable web app. No store approvals. Works offline for the essentials on the shop floor.",
    tone: "blue",
  },
];

const REVIEWS = [
  {
    quote:
      "We went from 3 no-shows a week to zero. The booking deposits alone paid for the software in the first month.",
    name: "Sipho M.",
    role: "Owner, Detailz Pro",
  },
  {
    quote:
      "Job cards on my phone means I stop chasing paperwork. My team finally focuses on the cars.",
    name: "Amanda K.",
    role: "Manager, Auto Glow",
  },
  {
    quote:
      "The indemnity capture flow is genius. Signed on the car, stored forever, one less clipboard.",
    name: "Terrence B.",
    role: "Founder, Mirror Finish",
  },
];

const STEPS = [
  { n: "01", title: "Create your booking page", body: "Add services, prices, and available hours in minutes." },
  { n: "02", title: "Share your link", body: "Customers book online, pay a deposit, and get automated reminders." },
  { n: "03", title: "Run the day from your phone", body: "Job cards, indemnity, add-ons, payments — all in one place." },
];

export default function LandingPage() {
  const { isAuthenticated } = useContext(AuthContext);
  const primaryCtaTo = isAuthenticated ? "/bookings" : "/register";
  const primaryCtaLabel = isAuthenticated ? "Go to dashboard" : "Start free trial";

  return (
    <PublicShell>
      {/* ============ HERO ============ */}
      <section className={styles.hero}>
        <div className={styles.container}>
          <div className={styles.heroInner}>
            <div className={styles.heroCopy}>
              <span className={styles.eyebrow}>
                <Sparkles size={14} strokeWidth={2.5} />
                Built for auto detailers
              </span>

              <h1 className={styles.heroTitle}>
                Run a busier detailing business{" "}
                <span className={styles.heroTitleAccent}>without the paperwork.</span>
              </h1>

              <p className={styles.heroLede}>
                DtailBase turns bookings, deposits, job cards, indemnity, and
                payouts into one calm, fast workflow &mdash; on any phone.
              </p>

              <div className={styles.heroCtas}>
                <Link to={primaryCtaTo} className={styles.ctaPrimary}>
                  {primaryCtaLabel}
                  <ArrowRight size={16} strokeWidth={2.5} />
                </Link>
                <Link to="/products" className={styles.ctaGhost}>
                  See features
                </Link>
              </div>

              <ul className={styles.heroTrust}>
                <li><Check size={14} strokeWidth={3} /> 14-day free trial</li>
                <li><Check size={14} strokeWidth={3} /> No card required</li>
                <li><Check size={14} strokeWidth={3} /> Cancel anytime</li>
              </ul>

              <div className={styles.ratingRow}>
                <div className={styles.stars} aria-hidden="true">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={16} fill="currentColor" strokeWidth={0} />
                  ))}
                </div>
                <span className={styles.ratingText}>
                  <strong>4.9 out of 5</strong> from 320+ detailing shops
                </span>
              </div>
            </div>

            <div className={styles.heroVisual} aria-hidden="true">
              <PhoneMockup />
            </div>
          </div>
        </div>
      </section>

      {/* ============ LOGO STRIP ============ */}
      <section className={styles.logos}>
        <div className={styles.container}>
          <p className={styles.logosLabel}>Trusted by growing detailing businesses</p>
          <ul className={styles.logosList}>
            {["Auto Glow", "Detailz Pro", "Mirror Finish", "Shine Society", "Vanta Auto", "Peak Detail"].map((n) => (
              <li key={n} className={styles.logoItem}>{n}</li>
            ))}
          </ul>
        </div>
      </section>

      {/* ============ FEATURES ============ */}
      <section className={styles.features} id="features">
        <div className={styles.container}>
          <header className={styles.sectionHeader}>
            <span className={styles.sectionEyebrow}>Everything you need</span>
            <h2 className={styles.sectionTitle}>
              One platform for every part of your day
            </h2>
            <p className={styles.sectionLede}>
              Stop stitching together a calendar app, a spreadsheet, a
              WhatsApp group and a card reader. DtailBase does all of it.
            </p>
          </header>

          <ul className={styles.featureGrid}>
            {FEATURES.map(({ icon: Icon, title, body, tone }) => (
              <li key={title} className={`${styles.featureCard} ${styles[`tone_${tone}`]}`}>
                <span className={styles.featureIcon}>
                  <Icon size={22} strokeWidth={2.25} />
                </span>
                <h3 className={styles.featureTitle}>{title}</h3>
                <p className={styles.featureBody}>{body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ============ HOW IT WORKS ============ */}
      <section className={styles.how}>
        <div className={styles.container}>
          <header className={styles.sectionHeader}>
            <span className={styles.sectionEyebrow}>How it works</span>
            <h2 className={styles.sectionTitle}>Set up in an afternoon</h2>
            <p className={styles.sectionLede}>
              No consultants. No integrations. Three focused steps and you&rsquo;re live.
            </p>
          </header>

          <ol className={styles.steps}>
            {STEPS.map(({ n, title, body }) => (
              <li key={n} className={styles.step}>
                <span className={styles.stepNum}>{n}</span>
                <h3 className={styles.stepTitle}>{title}</h3>
                <p className={styles.stepBody}>{body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ============ REVIEWS ============ */}
      <section className={styles.reviews}>
        <div className={styles.container}>
          <header className={styles.sectionHeader}>
            <span className={styles.sectionEyebrow}>What owners say</span>
            <h2 className={styles.sectionTitle}>Loved by shops that hate admin</h2>
          </header>

          <ul className={styles.reviewGrid}>
            {REVIEWS.map((r) => (
              <li key={r.name} className={styles.reviewCard}>
                <div className={styles.reviewStars} aria-hidden="true">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={14} fill="currentColor" strokeWidth={0} />
                  ))}
                </div>
                <p className={styles.reviewQuote}>&ldquo;{r.quote}&rdquo;</p>
                <p className={styles.reviewAuthor}>
                  <strong>{r.name}</strong>
                  <span>&nbsp;&middot;&nbsp;{r.role}</span>
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ============ FINAL CTA ============ */}
      <section className={styles.finalCta}>
        <div className={styles.container}>
          <div className={styles.ctaCard}>
            <Zap size={28} strokeWidth={2.5} className={styles.ctaCardIcon} />
            <h2 className={styles.ctaCardTitle}>
              {isAuthenticated
                ? "Jump back into your workflow."
                : "Ready to run a calmer, busier shop?"}
            </h2>
            <p className={styles.ctaCardLede}>
              {isAuthenticated
                ? "Your bookings, job cards, and payments are one tap away."
                : "Start your 14-day free trial. No card. Cancel anytime."}
            </p>
            <div className={styles.ctaCardActions}>
              <Link to={primaryCtaTo} className={styles.ctaPrimary}>
                {primaryCtaLabel}
                <ArrowRight size={16} strokeWidth={2.5} />
              </Link>
              <Link to="/contact" className={styles.ctaGhost}>
                Talk to us
              </Link>
            </div>
          </div>
        </div>
      </section>
    </PublicShell>
  );
}

/* --- Inline phone mockup (SVG, no external asset) ---------------- */
function PhoneMockup() {
  return (
    <div className={styles.phoneWrap}>
      <div className={styles.phoneFrame}>
        <div className={styles.phoneNotch} />
        <div className={styles.phoneScreen}>
          <div className={styles.phoneHeader}>
            <div>
              <p className={styles.phoneEyebrow}>Today</p>
              <p className={styles.phoneTitle}>8 bookings</p>
            </div>
            <div className={styles.phoneAvatar} />
          </div>

          <div className={styles.phoneCard}>
            <div className={styles.phoneCardTop}>
              <span className={styles.phoneBadge}>10:30</span>
              <span className={styles.phonePrice}>R 780</span>
            </div>
            <p className={styles.phoneCardTitle}>Full valet &mdash; BMW 320i</p>
            <p className={styles.phoneCardMeta}>Sipho M.  &middot;  Bay 2</p>
            <div className={styles.phoneProgress}><span /></div>
          </div>

          <div className={`${styles.phoneCard} ${styles.phoneCardMuted}`}>
            <div className={styles.phoneCardTop}>
              <span className={styles.phoneBadge}>12:00</span>
              <span className={styles.phonePrice}>R 1,240</span>
            </div>
            <p className={styles.phoneCardTitle}>Ceramic coat &mdash; Ford Ranger</p>
            <p className={styles.phoneCardMeta}>Amanda K.  &middot;  Bay 1</p>
          </div>

          <div className={styles.phoneCta}>
            <span>Deposit received</span>
            <Check size={14} strokeWidth={3} />
          </div>
        </div>
      </div>

      {/* Floating chips */}
      <div className={`${styles.chip} ${styles.chipTopRight}`}>
        <CreditCard size={14} strokeWidth={2.5} />
        Deposit paid
      </div>
      <div className={`${styles.chip} ${styles.chipBottomLeft}`}>
        <Calendar size={14} strokeWidth={2.5} />
        Slot confirmed
      </div>
    </div>
  );
}
