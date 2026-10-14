import UserDropdownMenu from "./UserDropdownMenu";
import "../styles/Header.css";
import headerLogo from ".././../public/landing/images/logo.svg";
import { useCompany } from "../context/CompanyContext";
import { Link, useLocation } from "react-router-dom";
import ThemeToggle from "./ThemeToggle";

function Header({ showInstallButton, handleInstallClick }) {
  const { company } = useCompany();
  const { pathname } = useLocation();
  const isHome = pathname === "/dashboard";
  const title = { "/services": "Services", "/customers": "Customers", "/vehicles": "Vehicles", "/bookings": "Bookings", "/schedule": "Schedule" }[pathname];
  const currentPlan = company?.plan || "STARTER";

  return (
    <header className={`app-header gap-10${isHome ? " is-home" : ""}`}>
      <div className="header-left mr-0 pr-0">
        {/* Logo only visible on mobile */}
        <Link to="/dashboard" className="dashboard-logo mobile-only" title="DtailBase" aria-label="DtailBase Logo">
          <span className="logo-expanded">
            <img src={headerLogo} alt="" width="34" height="34" />
          </span>
        </Link>
        {title && <span className="mobile-page-title">{title}</span>}
      </div>
      <div className="header-center gap-4">
        {/* Show header install button on all devices */}
        {currentPlan && (
          <span className="current-plan">{currentPlan}</span>
        )}
        {showInstallButton && !isHome && (
          <button className="header-install-btn install-button-singleton" onClick={handleInstallClick}>
            Install App
          </button>
        )}
      </div>
      <div className="header-actions">
        <ThemeToggle />
        <UserDropdownMenu installAction={isHome && showInstallButton ? handleInstallClick : undefined} />
      </div>
    </header>
  );
}

export default Header;