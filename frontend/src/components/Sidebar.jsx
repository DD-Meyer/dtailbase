import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import "../styles/Sidebar.css";

// ... imports stay the same ...

function Sidebar({ isMobileOpen = false, onCloseMobile = () => {} }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const location = useLocation();
  const { user } = useContext(AuthContext);

  const menuItems = [
    { path: "/bookings", label: "Bookings", icon: "📅" },
    { path: "/customers", label: "Customers", icon: "👥" },
    { path: "/vehicles", label: "Vehicles", icon: "🚗" },
    { path: "/services", label: "Services", icon: "🛠️" },
  ];

  if (user?.role === 'OWNER') {
    menuItems.push({ path: "/settings/indemnity", label: "Indemnity", icon: "🛡️" });
  }

  const toggleSidebar = () => setIsCollapsed(!isCollapsed);

  return (
    <>
      {isMobileOpen && <button className="sidebar-mobile-backdrop" onClick={onCloseMobile} aria-label="Close navigation" />}
      <nav className={`sidebar ${isCollapsed ? "collapsed" : ""} ${isMobileOpen ? "mobile-open" : ""}`}>
      {/* NEW HEADER SECTION */}
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <h2>{isCollapsed ? "DY" : "Detely"}</h2>
        </div>
        <button className="collapse-toggle" onClick={toggleSidebar} title="Toggle Sidebar">
          {isCollapsed ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="13 17 18 12 13 7"></polyline><polyline points="6 17 11 12 6 7"></polyline></svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="11 17 6 12 11 7"></polyline><polyline points="18 17 13 12 18 7"></polyline></svg>
          )}
        </button>
      </div>
      {/* Top Link: Return to Landing */}
      <ul className="sidebar-links home-nav">
        <li>
          <Link to="/" className="home-link" title="Return Home" onClick={onCloseMobile}>
            <span className="icon">🏠</span>
            {!isCollapsed && <span className="label">Return Home</span>}
          </Link>
        </li>
      </ul>

      <hr className="sidebar-divider" />

      <ul className="sidebar-links">
        {menuItems.map((item) => (
          <li key={item.path} className={location.pathname === item.path ? "active" : ""}>
            <Link to={item.path} title={item.label} onClick={onCloseMobile}>
              <span className="icon">{item.icon}</span>
              {!isCollapsed && <span className="label">{item.label}</span>}
            </Link>
          </li>
        ))}
      </ul>

      <hr className="sidebar-divider" />

      <div className="sidebar-footer">
        <ul className="sidebar-links">
          <li className={location.pathname === "/profile" ? "active" : ""}>
            <Link to="/profile" title="My Profile" onClick={onCloseMobile}>
              <span className="icon">👤</span>
              {!isCollapsed && <span className="label">My Profile</span>}
            </Link>
          </li>
          
          {user?.role === 'OWNER' && (
            <>
              {!isCollapsed && <p className="admin-header">Admin</p>}
              <li className={location.pathname === "/team" ? "active" : ""}>
                <Link to="/team" title="Team Management" onClick={onCloseMobile}>
                  <span className="icon">🏗️</span>
                  {!isCollapsed && <span className="label">Team</span>}
                </Link>
              </li>
              <li className={location.pathname === "/settings" ? "active" : ""}>
                <Link to="/settings" title="Business Settings" onClick={onCloseMobile}>
                  <span className="icon">⚙️</span>
                  {!isCollapsed && <span className="label">Settings</span>}
                </Link>
              </li>
            </>
          )}
        </ul>
      </div>
      </nav>
    </>
  );
}

export default Sidebar;