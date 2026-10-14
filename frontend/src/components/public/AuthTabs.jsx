import { Link, useLocation } from "react-router-dom";
import styles from "./AuthControls.module.css";

export default function AuthTabs({ state }) {
  const { pathname } = useLocation();
  return (
    <nav className={styles.tabs} aria-label="Account access">
      <Link to="/login" state={state} aria-current={pathname === "/login" ? "page" : undefined}>Sign in</Link>
      <Link to="/register" state={state} aria-current={pathname === "/register" ? "page" : undefined}>Sign up</Link>
    </nav>
  );
}
