import { NavLink, Link } from "react-router-dom";
import { useContext, useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { AuthContext } from "../../context/AuthContext";
import styles from "./PublicNav.module.css";

const NAV_LINKS = [
  { to: "/products", label: "Products" },
  { to: "/plans", label: "Pricing" },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
];

/**
 * Flat, sticky public navigation. Uses the `dbase-public` scope
 * for typography and tokens, and a scoped CSS Module for layout.
 */
export default function PublicNav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const { isAuthenticated, user, logout } = useContext(AuthContext);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const displayName =
    user?.name || user?.first_name || user?.username || user?.email || "";
  const initial = (displayName || "U").trim().charAt(0).toUpperCase();

  const handleSignOut = () => {
    setOpen(false);
    logout();
  };

  return (
    <header className={`${styles.wrap} ${scrolled ? styles.wrapScrolled : ""}`}>
      <div className={styles.inner}>
        <Link to="/" className={styles.brand} aria-label="DtailBase home">
          <span className={styles.brandMark} aria-hidden="true">D</span>
          <span className={styles.brandName}>DtailBase</span>
        </Link>

        <nav className={styles.links} aria-label="Primary">
          {NAV_LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `${styles.link} ${isActive ? styles.linkActive : ""}`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className={styles.actions}>
          {isAuthenticated ? (
            <>
              <Link
                to="/bookings"
                className={styles.userChip}
                aria-label={`Signed in as ${displayName}. Go to dashboard`}
                title={displayName}
              >
                <span className={styles.userAvatar} aria-hidden="true">
                  {initial}
                </span>
                <span className={styles.userLabel}>Dashboard</span>
              </Link>
              <button
                type="button"
                className={styles.linkGhost}
                onClick={handleSignOut}
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className={styles.linkGhost}>
                Sign in
              </Link>
              <Link to="/register" className={styles.cta}>
                Start free
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          className={styles.menuBtn}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X size={22} strokeWidth={2.25} /> : <Menu size={22} strokeWidth={2.25} />}
        </button>
      </div>

      {open && (
        <div className={styles.sheet} role="dialog" aria-label="Mobile menu">
          {isAuthenticated && (
            <div className={styles.sheetUser}>
              <span className={styles.sheetAvatar} aria-hidden="true">
                {initial}
              </span>
              <div className={styles.sheetUserMeta}>
                <span className={styles.sheetUserName}>{displayName}</span>
                {user?.email && displayName !== user.email && (
                  <span className={styles.sheetUserEmail}>{user.email}</span>
                )}
              </div>
            </div>
          )}

          <nav className={styles.sheetLinks}>
            {NAV_LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={styles.sheetLink}
                onClick={() => setOpen(false)}
              >
                {link.label}
              </NavLink>
            ))}
          </nav>

          <div className={styles.sheetActions}>
            {isAuthenticated ? (
              <>
                <Link
                  to="/bookings"
                  className={styles.sheetCta}
                  onClick={() => setOpen(false)}
                >
                  Go to dashboard
                </Link>
                <button
                  type="button"
                  className={styles.sheetGhost}
                  onClick={handleSignOut}
                >
                  Sign out
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className={styles.sheetGhost} onClick={() => setOpen(false)}>
                  Sign in
                </Link>
                <Link to="/register" className={styles.sheetCta} onClick={() => setOpen(false)}>
                  Start free
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
