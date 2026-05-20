import { Link, NavLink } from "react-router-dom";
import UserDropdownMenu from "./UserDropdownMenu";
import "../styles/PublicHeader.css";

function PublicHeader({ isAuthenticated, isMenuOpen, setIsMenuOpen }) {
  const baseLinks = [
    { to: "/", label: "Home" },
    { to: "/about", label: "About" },
    { to: "/products", label: "Products" },
    { to: "/plans", label: "Plans" },
    { to: "/legal", label: "Legal" },
    { to: "/contact", label: "Contact" },
  ];
  // Hide Plans link from the public nav for authenticated users — they manage
  // plan changes from Settings → Billing or the dedicated upgrade banners.
  const navLinks = isAuthenticated
    ? baseLinks.filter((item) => item.to !== "/plans")
    : baseLinks;

  return (
    <nav className="public-nav">
      <Link to="/" className="public-header-logo">
        <span className="text-white">Dtail</span>
        <span className="bg-linear-to-r from-blue-500 to-sky-400 bg-clip-text text-transparent">base</span>
        <span className="text-blue-500 font-black">.</span>
      </Link>

      {isMenuOpen && (
        <div className="menu-overlay" onClick={() => setIsMenuOpen(false)}></div>
      )}

      <div id="public-nav-menu" className={`nav-menu ${isMenuOpen ? "active" : ""}`}>
        {navLinks.map((item) => (
          <NavLink key={item.to} to={item.to} className="nav-item" onClick={() => setIsMenuOpen(false)}>
            {item.label}
          </NavLink>
        ))}
      </div>

      <div className="nav-auth-persistent">
        {isAuthenticated ? (
          <>
            <Link to="/bookings" className="btn-dashboard-sm">Dashboard</Link>
            <UserDropdownMenu />
          </>
        ) : (
          <>
            <Link to="/login" className="btn-login-text">Login</Link>
            <Link to="/register" className="btn-join-now">Join Now</Link>
          </>
        )}

        <button
          type="button"
          className={`hamburger ${isMenuOpen ? "active" : ""}`}
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-label={isMenuOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={isMenuOpen}
          aria-controls="public-nav-menu"
        >
          <span className="bar"></span>
          <span className="bar"></span>
          <span className="bar"></span>
        </button>
      </div>
    </nav>
  );
}

export default PublicHeader;