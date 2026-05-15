import UserDropdownMenu from "./UserDropdownMenu";
import "../styles/Header.css";

import { useCompany } from "../context/CompanyContext";
import { Link } from "react-router-dom";

function Header({ showInstallButton, handleInstallClick }) {
  const { company } = useCompany();
  const currentPlan = company?.plan || "STARTER";

  return (
    <header className="app-header gap-10">
      <div className="header-left mr-0 pr-0">
        {/* Logo only visible on mobile */}
        <Link to="/bookings" className="dashboard-logo mobile-only" title="DtailBase" aria-label="DtailBase Logo">
          <span className="logo-expanded">
            <span className="text-white">D</span>
            <span className="bg-gradient-to-r from-blue-500 to-sky-400 bg-clip-text text-transparent">B</span>
            <span className="text-blue-500 font-black">.</span>
          </span>
        </Link>
      </div>
      <div className="header-center gap-4">
        {/* Show header install button on all devices */}
        {currentPlan && (
          <span className="current-plan">{currentPlan}</span>
        )}
        {showInstallButton && (
          <button className="install-app-fab header-install-btn" onClick={handleInstallClick}>
            Install App
          </button>
        )}
      </div>
      <div className="header-actions">
        <UserDropdownMenu />
      </div>
    </header>
  );
}

export default Header;