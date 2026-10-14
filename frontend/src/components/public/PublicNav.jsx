import { Link, useLocation } from "react-router-dom";
import { useContext, useEffect, useRef, useState } from "react";
import { ArrowRight, Menu, X } from "lucide-react";
import { AuthContext } from "../../context/AuthContext";
import headerLogo from ".././../../public/landing/images/logo.svg";
import styles from "./PublicNav.module.css";

const NAV_LINKS = [
  { to: "/#platform", label: "Platform" },
  { to: "/#workflow", label: "How it works" },
  { to: "/#stories", label: "Stories" },
  { to: "/#faq", label: "FAQ" },
  { to: "/plans", label: "Pricing" },
];

function scrollToHash(hash) {
  const target = document.getElementById(hash.slice(1));
  if (!target) return;

  const reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  target.scrollIntoView({
    behavior: reduceMotion ? "auto" : "smooth",
    block: "start",
  });
}

export default function PublicNav() {
  const [open, setOpen] = useState(false);
  const { isAuthenticated, user, logout } = useContext(AuthContext);
  const location = useLocation();
  const previousOverflow = useRef("");
  const menuButton = useRef(null);
  const headerRef = useRef(null);
  const displayName =
    user?.name || user?.first_name || user?.username || user?.email || "";
  const initial = (displayName || "U").trim().charAt(0).toUpperCase();

  useEffect(() => {
    const header = headerRef.current;
    const observer = new ResizeObserver(() => {
      header.style.setProperty("--public-header-height", `${header.getBoundingClientRect().height}px`);
    });
    observer.observe(header);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!location.hash) return undefined;
    const frame = window.requestAnimationFrame(() =>
      scrollToHash(location.hash),
    );
    return () => window.cancelAnimationFrame(frame);
  }, [location.pathname, location.hash]);

  useEffect(() => {
    if (!open) return undefined;
    previousOverflow.current = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        setOpen(false);
        menuButton.current?.focus();
      }
    };
    const desktop = window.matchMedia("(min-width: 821px)");
    const onDesktop = (event) => {
      if (event.matches) setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    desktop.addEventListener("change", onDesktop);

    return () => {
      document.body.style.overflow = previousOverflow.current;
      window.removeEventListener("keydown", onKeyDown);
      desktop.removeEventListener("change", onDesktop);
    };
  }, [open]);

  const handleSignOut = () => {
    setOpen(false);
    logout();
  };

  const handleNavClick = (event, to) => {
    setOpen(false);
    const hashIndex = to.indexOf("#");
    if (
      hashIndex > -1 &&
      location.pathname === "/" &&
      location.hash === to.slice(hashIndex)
    ) {
      event.preventDefault();
      window.requestAnimationFrame(() => scrollToHash(location.hash));
    }
  };

  return (
    <header ref={headerRef} className={styles.header}>
      <div className={styles.inner}>
        <Link to="/" className={styles.brand} aria-label="DtailBase home">
          <img src={headerLogo} alt="" width="34" height="34" />
          <span className=" text-black">DtailBase</span>
        </Link>

        <nav aria-label="Primary" className={styles.desktopNav}>
          {NAV_LINKS.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={styles.navLink}
              onClick={(event) => handleNavClick(event, link.to)}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className={styles.actions}>
          {isAuthenticated ? (
            <>
              <Link
                to="/dashboard"
                className={styles.dashboardLink}
                aria-label={`Signed in as ${displayName}. Go to dashboard`}
                title={displayName}
                onClick={() => setOpen(false)}
              >
                <span className={styles.avatar} aria-hidden="true">
                  {initial}
                </span>
                <span>Dashboard</span>
              </Link>
              <button
                type="button"
                className={`${styles.textButton} ${styles.desktopSignOut}`}
                onClick={handleSignOut}
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className={styles.textButton} onClick={() => setOpen(false)}>
                Sign in
              </Link>
              <Link to="/register" className={styles.primaryButton} onClick={() => setOpen(false)}>
                Start for free <ArrowRight size={17} aria-hidden="true" />
              </Link>
            </>
          )}
        </div>

        <button
          ref={menuButton}
          type="button"
          className={styles.menuButton}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          aria-controls="public-mobile-menu"
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <X size={21} aria-hidden="true" /> : <Menu size={21} aria-hidden="true" />}
        </button>
      </div>

      {open && (
        <div
          id="public-mobile-menu"
          className={styles.mobileMenu}
          role="region"
          aria-label="Mobile navigation"
        >
          <nav aria-label="Mobile primary">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={styles.mobileNavLink}
                onClick={(event) => handleNavClick(event, link.to)}
              >
                {link.label}
              </Link>
            ))}
            <Link
              to="/products"
              className={styles.mobileNavLink}
              onClick={() => setOpen(false)}
            >
              Products
            </Link>
            <Link
              to="/about"
              className={styles.mobileNavLink}
              onClick={() => setOpen(false)}
            >
              About
            </Link>
            <Link
              to="/contact"
              className={styles.mobileNavLink}
              onClick={() => setOpen(false)}
            >
              Contact
            </Link>
          </nav>

          {isAuthenticated && (
            <div className={styles.mobileActions}>
              <button
                type="button"
                className={styles.mobileSecondaryButton}
                onClick={handleSignOut}
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
