import { Link } from "react-router-dom";
import { createElement, useContext } from "react";
import { ArrowRight, CalendarDays, Camera, ClipboardCheck, Clock, FileSignature, Settings, Users, Car, ShieldCheck, Smartphone, Check } from "lucide-react";
import PublicShell from "../../components/public/PublicShell";
import AppDemo from "../../components/public/AppDemo";
import { AuthContext } from "../../context/AuthContext";
import styles from "./ProductsPage.module.css";

const CATEGORIES = [
  {
    id: "bookings", title: "A clearer day starts with a connected calendar.",
    lede: "Let customers request a service online. Keep the appointment, customer, vehicle, and location together when it reaches your workshop.",
    features: [
      { icon: CalendarDays, title: "Your online booking link", body: "Share a company booking page with your services and available appointments." },
      { icon: Clock, title: "Availability that fits your shop", body: "Set opening hours and service durations, with plan-based buffer controls." },
      { icon: Settings, title: "On-site or mobile work", body: "Keep the job location and customer address with the appointment." },
    ],
  },
  {
    id: "jobs", title: "Know where each job stands.",
    lede: "Move from a booking to a detailed job record. Track progress, record condition, and keep the paperwork close to the work.",
    features: [
      { icon: ClipboardCheck, title: "Clear job status", body: "Follow pending, confirmed, in-progress, completed, and cancelled appointments." },
      { icon: Camera, title: "Before and after photos", body: "Keep inspection and completion photos with the booking, within your plan limits." },
      { icon: FileSignature, title: "Digital indemnity", body: "Capture customer signatures and retain the signed agreement with the job." },
    ],
  },
  {
    id: "customers", title: "Keep the customer and the car connected.",
    lede: "Build a useful record of who you serve, what they drive, and the work you have done, without juggling separate spreadsheets.",
    features: [
      { icon: Users, title: "Customer records", body: "Search and manage customer contact details in one workspace." },
      { icon: Car, title: "Vehicle records", body: "Connect each vehicle to its customer and booking history." },
      { icon: CalendarDays, title: "A customer tracking link", body: "Give customers a way to look up their bookings and current status." },
    ],
  },
  {
    id: "team", title: "One workspace for the people doing the work.",
    lede: "Make the same workshop tools available across desktop, tablet, and phone, with access based on each person's role.",
    features: [
      { icon: ShieldCheck, title: "Owner and staff roles", body: "Keep business settings and team management with the people responsible for them." },
      { icon: Smartphone, title: "Installable web app", body: "Open DtailBase from your home screen without an app-store download." },
      { icon: Settings, title: "Services and settings", body: "Manage your service offering, workshop details, and plan from one place." },
    ],
  },
];

export default function ProductsPage() {
  const { isAuthenticated } = useContext(AuthContext);
  const ctaTo = isAuthenticated ? "/dashboard" : "/register";
  const ctaLabel = isAuthenticated ? "Open your dashboard" : "Start for free";
  return (
    <PublicShell marketing>
      <section className={`${styles.hero} ${styles.container}`}>
        <div className={styles.heroCopy}>
          <h1>A better way to<br /><em>run your workshop.</em></h1>
          <p className={styles.lede}>Bookings, customer records, job photos, and digital indemnity. Connected tools for the work you do every day.</p>
          <div className={styles.actions}>
            <Link to={ctaTo} className={styles.primary}>{ctaLabel}<ArrowRight size={18} aria-hidden="true" /></Link>
            <Link to="/plans" className={styles.secondary}>Compare plans</Link>
          </div>
          <p className={styles.note}><Check size={17} aria-hidden="true" />Start with the free plan. Upgrade when you need more.</p>
        </div>
        <figure className={styles.heroImage}>
          <img src="/landing/images/detailer-story.jpg" alt="Detailing professional at work beside a car" width="1200" height="900" />
          <figcaption>Keep the admin close to the craft. Photo: Unsplash.</figcaption>
        </figure>
      </section>
      <nav className={styles.sectionNav} aria-label="Explore product capabilities">
        <div className={styles.container}>
          {CATEGORIES.map(({ id }) => <Link key={id} to={`/products#${id}`}>{id === "jobs" ? "Job management" : id[0].toUpperCase() + id.slice(1)}<ArrowRight size={15} aria-hidden="true" /></Link>)}
        </div>
      </nav>
      {CATEGORIES.map((category, index) => (
        <section key={category.id} id={category.id} className={`${styles.category} ${index % 2 ? styles.categoryAlt : ""}`}>
          <div className={styles.container}>
            <header className={styles.categoryHead}>
              <h2>{category.title}</h2>
              <div><p>{category.lede}</p><Link to={ctaTo} className={styles.contextCta}>{ctaLabel}<ArrowRight size={17} aria-hidden="true" /></Link></div>
            </header>
            <ul className={styles.grid}>
              {category.features.map(({ icon: Icon, title, body }) => (
                <li key={title} className={styles.card}>
                  <span className={styles.icon}>{createElement(Icon, { size: 22, "aria-hidden": true })}</span>
                  <h3>{title}</h3><p>{body}</p>
                </li>
              ))}
            </ul>
            {category.id === "bookings" && (
              <div className={styles.appPreview}><AppDemo /></div>
            )}
          </div>
        </section>
      ))}
      <section className={`${styles.questions} ${styles.container}`}>
        <h2>A few things to know.</h2>
        <div>
          <details><summary>Can I start without choosing a paid plan?</summary><p>Yes. Create a workspace on the free Starter plan. Compare current limits and paid options on the <Link to="/plans">plans page</Link>.</p></details>
          <details><summary>Will it work on my phone?</summary><p>Yes. Use the responsive website or install the web app from your browser. No app-store download is required.</p></details>
          <details><summary>What should I set up first?</summary><p>Add your services and opening hours, then share your company booking link. Your workspace also includes customer and vehicle records.</p></details>
        </div>
      </section>
      <section className={styles.cta}>
        <div className={styles.container}>
          <h2>Less scattered admin.<br /><em>More room for your craft.</em></h2>
          <p>Start with the essentials. Build a workflow that fits your workshop.</p>
          <div className={styles.actions}>
            <Link to={ctaTo} className={styles.lightButton}>{ctaLabel}<ArrowRight size={18} aria-hidden="true" /></Link>
            <Link to="/plans" className={styles.lightLink}>See pricing</Link>
          </div>
        </div>
      </section>
    </PublicShell>
  );
}
