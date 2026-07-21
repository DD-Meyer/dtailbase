import PublicNav from "./PublicNav";
import PublicFooter from "./PublicFooter";
import styles from "./PublicShell.module.css";

/**
 * Shell that wraps every public page.
 * - Applies the `dbase-public` scope so `theme.css` resets/tokens
 *   only affect public pages (dashboard is untouched).
 * - Optionally hides nav or footer.
 */
export default function PublicShell({
  children,
  showNav = true,
  showFooter = true,
  variant = "default", // "default" | "narrow" | "auth"
}) {
  return (
    <div className={`dbase-public ${styles.root} ${styles[`variant_${variant}`]}`}>
      {showNav && <PublicNav />}
      <main className={styles.main}>{children}</main>
      {showFooter && <PublicFooter />}
    </div>
  );
}
