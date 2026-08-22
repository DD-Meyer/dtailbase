import { Link } from "react-router-dom";
import { ArrowRight, Home, Search } from "lucide-react";
import PublicShell from "../../components/public/PublicShell";
import styles from "./NotFoundPage.module.css";

export default function NotFoundPage() {
  return (
    <PublicShell showFooter={false}>
      <section className={styles.page}>
        <div className={styles.container}>
          <span className={styles.code} aria-hidden="true">404</span>
          <h1 className={styles.title}>We couldn&rsquo;t find that page.</h1>
          <p className={styles.lede}>
            The link may be broken or the page may have moved. Let&rsquo;s get
            you back somewhere useful.
          </p>

          <div className={styles.actions}>
            <Link to="/" className={styles.ctaPrimary}>
              <Home size={16} strokeWidth={2.5} />
              Back to home
            </Link>
            <Link to="/products" className={styles.ctaGhost}>
              <Search size={16} strokeWidth={2.25} />
              Explore features
              <ArrowRight size={14} strokeWidth={2.5} />
            </Link>
          </div>

          <nav className={styles.suggest} aria-label="Popular pages">
            <p className={styles.suggestLabel}>Popular pages</p>
            <ul className={styles.suggestList}>
              <li><Link to="/plans">Pricing</Link></li>
              <li><Link to="/about">About</Link></li>
              <li><Link to="/contact">Contact</Link></li>
              <li><Link to="/legal">Legal</Link></li>
            </ul>
          </nav>
        </div>
      </section>
    </PublicShell>
  );
}
