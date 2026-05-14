import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { CalendarDays, Car, ShieldCheck, Settings, UserRound, Users, UserCog, Wrench } from "lucide-react";
import "../styles/Sidebar.css";

// ... imports stay the same ...

function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const location = useLocation();
  const { user } = useContext(AuthContext);

  const menuItems = [
    { path: "/bookings", label: "Bookings", icon: CalendarDays },
    { path: "/customers", label: "Customers", icon: Users },
    { path: "/vehicles", label: "Vehicles", icon: Car },
    { path: "/services", label: "Services", icon: Wrench },
  ];

  if (user?.role === 'OWNER') {
    menuItems.push({ path: "/settings/indemnity", label: "Indemnity", icon: ShieldCheck });
  }

  const toggleSidebar = () => setIsCollapsed(!isCollapsed);

  return (
    // {/* NEW: only displays sidebar on desktop - remove all references to mobile here*/}
    <>
      <nav className={`sidebar ${isCollapsed ? "collapsed" : ""}`}>
      {/* NEW HEADER SECTION */}
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <h2 className="tracking-tight">{isCollapsed ? (<><span className="text-white">D</span><span className="bg-linear-to-r from-blue-500 to-sky-400 bg-clip-text text-transparent">B</span></>) : (<><span className="text-white">Dtail</span><span className="bg-linear-to-r from-blue-500 to-sky-400 bg-clip-text text-transparent">base</span></>)}</h2>
        </div>
        <button className="collapse-toggle" onClick={toggleSidebar} title="Toggle Sidebar">
          {isCollapsed ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="13 17 18 12 13 7"></polyline><polyline points="6 17 11 12 6 7"></polyline></svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="11 17 6 12 11 7"></polyline><polyline points="18 17 13 12 18 7"></polyline></svg>
          )}
        </button>
      </div>

      <hr className="sidebar-divider" />

      <ul className="sidebar-links">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
          <li key={item.path} className={location.pathname === item.path ? "active" : ""}>
            <Link to={item.path} title={item.label}>
              <span className="icon"><Icon size={18} strokeWidth={2.1} aria-hidden="true" /></span>
              {!isCollapsed && <span className="label">{item.label}</span>}
            </Link>
          </li>
        )})}
      </ul>

      <hr className="sidebar-divider" />

      <div className="sidebar-footer">
        <ul className="sidebar-links">
          <li className={location.pathname === "/profile" ? "active" : ""}>
            <Link to="/profile" title="My Profile">
              <span className="icon"><UserRound size={18} strokeWidth={2.1} aria-hidden="true" /></span>
              {!isCollapsed && <span className="label">My Profile</span>}
            </Link>
          </li>
          
          {user?.role === 'OWNER' && (
            <>
              {!isCollapsed && <p className="admin-header">Admin</p>}
              <li className={location.pathname === "/team" ? "active" : ""}>
                <Link to="/team" title="Team Management">
                  <span className="icon"><UserCog size={18} strokeWidth={2.1} aria-hidden="true" /></span>
                  {!isCollapsed && <span className="label">Team</span>}
                </Link>
              </li>
              <li className={location.pathname === "/settings" ? "active" : ""}>
                <Link to="/settings" title="Business Settings">
                  <span className="icon"><Settings size={18} strokeWidth={2.1} aria-hidden="true" /></span>
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