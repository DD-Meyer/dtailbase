import { useState, useContext, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeftCircleIcon,
  BadgeHelp,
  ChevronDown,
  ChevronUp,
  CreditCard,
  LogOut,
  Settings,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { AuthContext } from "../context/AuthContext";
import { useSupportNotifications } from "../context/SupportNotificationContext";
import "../styles/Header.css";

function UserDropdownMenu() {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const { user, logout } = useContext(AuthContext);
  const { unreadCount } = useSupportNotifications();
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
        setIsSettingsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    setIsDropdownOpen(false);
    setIsSettingsOpen(false);
    logout();
    navigate("/");
  };

  return (
    <div className="profile-container" ref={dropdownRef}>
      <button
        type="button"
        className={`profile-trigger ${isDropdownOpen ? "open" : ""}`}
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
      >
        <div className="avatar">
          {user?.name?.charAt(0) || user?.email?.charAt(0)?.toUpperCase() || "U"}
          {unreadCount > 0 && (
            <span className="avatar-badge" aria-label={`${unreadCount} new support messages`}>
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </div>
        <div className="user-info">
          <span className="user-name">{user?.name || user?.username || "User"}</span>
          <span className="user-role">{user?.role}</span>
        </div>
        <span className={`chevron ${isDropdownOpen ? "open" : ""}`}>
          {isDropdownOpen ? <ChevronUp size={16} aria-hidden="true" /> : <ChevronDown size={16} aria-hidden="true" />}
        </span>
      </button>

      {isDropdownOpen && (
        <div className="profile-dropdown">
          <div className="dropdown-header">
            <p className="signed-in-as">Signed in as</p>
            <p className="user-email">{user?.email}</p>
          </div>
          <ul className="dropdown-links">
            <li>
              <Link className="flex items-center mt-1.5" to="/" onClick={() => setIsDropdownOpen(false)}>
                <ArrowLeftCircleIcon size={16} /> Back
              </Link>
            </li>
            <li>
              <Link to="/profile" onClick={() => setIsDropdownOpen(false)}>
                <span className="dropdown-link-inline"><UserRound size={16} /> Profile</span>
              </Link>
            </li>
            {user?.role === "OWNER" && (
              <>
                <li>
                  <button
                    type="button"
                    className="dropdown-submenu-toggle"
                    onClick={() => setIsSettingsOpen((prev) => !prev)}
                  >
                    <span className="dropdown-link-inline"><Settings size={16} /> Settings</span>
                    {isSettingsOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                  {isSettingsOpen && (
                    <div className="dropdown-submenu">
                      <Link to="/settings" onClick={() => setIsDropdownOpen(false)}>
                        <span className="dropdown-link-inline"><Settings size={15} /> Business</span>
                      </Link>
                      <Link to="/settings?tab=billing" onClick={() => setIsDropdownOpen(false)}>
                        <span className="dropdown-link-inline"><CreditCard size={15} /> Billing</span>
                      </Link>
                    </div>
                  )}
                </li>
                <li>
                  <Link to="/settings/indemnity" onClick={() => setIsDropdownOpen(false)}>
                    <span className="dropdown-link-inline"><ShieldCheck size={16} /> Indemnity</span>
                  </Link>
                </li>
              </>
            )}
            {(user?.is_superuser || user?.is_staff) ? (
              <li>
                <Link to="/support" onClick={() => setIsDropdownOpen(false)}>
                  <span className="dropdown-link-inline">
                    <BadgeHelp size={16} /> Support Inbox
                    {unreadCount > 0 && (
                      <span className="nav-badge-inline">{unreadCount > 9 ? "9+" : unreadCount}</span>
                    )}
                  </span>
                </Link>
              </li>
            ) : (
              <li>
                <Link to="/support" onClick={() => setIsDropdownOpen(false)}>
                  <span className="dropdown-link-inline">
                    <BadgeHelp size={16} /> Support
                    {unreadCount > 0 && (
                      <span className="nav-badge-inline">{unreadCount > 9 ? "9+" : unreadCount}</span>
                    )}
                  </span>
                </Link>
              </li>
            )}
            <hr />
            <li>
              <button type="button" className="logout-btn" onClick={handleLogout}>
                <span className="dropdown-link-inline"><LogOut size={16} /> Logout</span>
              </button>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}

export default UserDropdownMenu;