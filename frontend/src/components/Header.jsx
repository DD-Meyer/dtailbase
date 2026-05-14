import UserDropdownMenu from "./UserDropdownMenu";
import "../styles/Header.css";

import { useContext } from "react";

function Header({ showInstallButton, handleInstallClick }) {
  return (
    <header className="app-header">
      <div className="header-left">
        {/* Logo only visible on mobile */}
        <div className="dashboard-logo mobile-only">
          <span className="logo-expanded">
            <span className="text-white">Dtail</span>
            <span className="bg-gradient-to-r from-blue-500 to-sky-400 bg-clip-text text-transparent">base</span>
            <span className="text-blue-500 font-black">.</span>
          </span>
        </div>
      </div>
      <div className="header-center">
        {/* Show header install button on all devices */}
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