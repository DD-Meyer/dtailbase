import { Link } from "react-router-dom";
import { useContext } from "react";
import {
  Calendar,
  CreditCard,
  Wrench,
  Users,
  ShieldCheck,
  Smartphone,
  Bell,
  FileSignature,
  BarChart3,
  MessageSquare,
  Package,
  Clock,
  ArrowRight,
} from "lucide-react";
import PublicShell from "../../components/public/PublicShell";
import { AuthContext } from "../../context/AuthContext";
import styles from "./ProductsPage.module.css";

const CATEGORIES = [
  {
    id: "bookings",
    eyebrow: "Bookings",
    title: "Turn your calendar into a customer magnet.",
    lede: "Take online bookings, deposits, and reminders 24/7 without picking up the phone.",
    features: [
      { icon: Calendar, title: "Online booking page", body: "Custom branded slot picker at your own DtailBase link." },
      { icon: Clock, title: "Smart availability", body: "Bay capacity, buffers, and staff schedules calculated automatically." },
      { icon: Bell, title: "Reminders", body: "SMS + email confirmations and pre-arrival nudges reduce no-shows." },
      { icon: MessageSquare, title: "Two-way messaging", body: "Chat with customers in-thread. Photos, files, everything on record." },
    ],
  },
  {
    id: "payments",
    eyebrow: "Payments",
    title: "Get paid, faster, on autopilot.",
    lede: "Take deposits at booking, balance on completion, and land in your bank next day.",
    features: [
      { icon: CreditCard, title: "Deposits + balance", body: "Split payments so customers commit and you never chase." },
      { icon: Package, title: "Add-ons at checkout", body: "Upsell interior treatments, ceramic coats, or valet packages." },
      { icon: FileSignature, title: "Invoices", body: "Auto-generated on completion with PDF receipts." },
      { icon: BarChart3, title: "Payout dashboard", body: "See tomorrow&rsquo;s payouts, fees, and refunds at a glance." },
    ],
  },
  {
    id: "jobs",
    eyebrow: "Job cards",
    title: "Run the shop floor from your phone.",
    lede: "Every booking becomes a live job card with timers, checklists, and photos.",
    features: [
      { icon: Wrench, title: "Live job cards", body: "Assign staff, timers, and services per job. Reorder on the fly." },
      { icon: ShieldCheck, title: "Digital indemnity", body: "Signature capture on the vehicle. Stored with the booking." },
      { icon: Smartphone, title: "Photo timeline", body: "Before / during / after photos for every service, auto-tagged." },
      { icon: Users, title: "Team performance", body: "Individual metrics: jobs completed, average time, tips earned." },
    ],
  },
];

const COMPARE_ROWS = [
  { label: "Online booking page", dtail: true, generic: true, calendar: false },
  { label: "Deposits + balance splits", dtail: true, generic: false, calendar: false },
  { label: "Job cards + indemnity", dtail: true, generic: false, calendar: false },
  { label: "Team roles & performance", dtail: true, generic: false, calendar: false },
  { label: "Installable web app", dtail: true, generic: false, calendar: false },
  { label: "Free trial", dtail: "14 days", generic: "None", calendar: "30 days" },
];

export default function ProductsPage() {
  const { isAuthenticated } = useContext(AuthContext);
  return (
    <PublicShell>
      <section className={styles.header}>
        <div className={styles.container}>
          <span className={styles.eyebrow}>Product</span>
          <h1 className={styles.title}>
            Every feature you&rsquo;d wire together yourself &mdash;
            <span className={styles.titleAccent}> in one place.</span>
          </h1>
          <p className={styles.lede}>
            DtailBase covers booking, deposits, job management, indemnity, team
            roles, and payouts. No plug-ins. No spreadsheets. No missing pieces.
          </p>
        </div>
      </section>

      {CATEGORIES.map((cat, i) => (
        <section
          key={cat.id}
          className={`${styles.category} ${i % 2 ? styles.categoryAlt : ""}`}
          id={cat.id}
        >
          <div className={styles.container}>
            <div className={styles.categoryHead}>
              <span className={styles.catEyebrow}>{cat.eyebrow}</span>
              <h2 className={styles.catTitle}>{cat.title}</h2>
              <p className={styles.catLede}>{cat.lede}</p>
            </div>

            <ul className={styles.grid}>
              {cat.features.map(({ icon: Icon, title, body }) => (
                <li key={title} className={styles.card}>
                  <span className={styles.cardIcon}>
                    <Icon size={20} strokeWidth={2.25} />
                  </span>
                  <h3 className={styles.cardTitle}>{title}</h3>
                  <p className={styles.cardBody}>{body}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ))}

      <section className={styles.compare}>
        <div className={styles.container}>
          <div className={styles.compareHead}>
            <span className={styles.eyebrow}>Compare</span>
            <h2 className={styles.compareTitle}>
              DtailBase vs. a generic booking tool
            </h2>
            <p className={styles.compareLede}>
              Purpose-built beats generic every time.
            </p>
          </div>

          <div className={styles.compareTableWrap}>
            <table className={styles.compareTable}>
              <thead>
                <tr>
                  <th scope="col">Feature</th>
                  <th scope="col" className={styles.thHighlight}>DtailBase</th>
                  <th scope="col">Generic booker</th>
                  <th scope="col">Calendar app</th>
                </tr>
              </thead>
              <tbody>
                {COMPARE_ROWS.map((row) => (
                  <tr key={row.label}>
                    <th scope="row">{row.label}</th>
                    <td className={styles.tdHighlight}>{renderCell(row.dtail)}</td>
                    <td>{renderCell(row.generic)}</td>
                    <td>{renderCell(row.calendar)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className={styles.cta}>
        <div className={styles.container}>
          <div className={styles.ctaInner}>
            <h2 className={styles.ctaTitle}>See it in your shop today.</h2>
            <p className={styles.ctaLede}>
              14 days free. No card required. Import your services in minutes.
            </p>
            <div className={styles.ctaActions}>
              <Link
                to={isAuthenticated ? "/bookings" : "/register"}
                className={styles.ctaPrimary}
              >
                {isAuthenticated ? "Go to dashboard" : "Start free trial"}
                <ArrowRight size={16} strokeWidth={2.5} />
              </Link>
              <Link to="/plans" className={styles.ctaGhost}>
                See pricing
              </Link>
            </div>
          </div>
        </div>
      </section>
    </PublicShell>
  );
}

function renderCell(value) {
  if (value === true) return <span className={styles.cellYes}>Included</span>;
  if (value === false) return <span className={styles.cellNo}>&mdash;</span>;
  return <span className={styles.cellText}>{value}</span>;
}
