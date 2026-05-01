import { useState, useContext, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import "../styles/Header.css";

function Header({ onOpenMobileMenu = () => {} }) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const { user, logout } = useContext(AuthContext); // Assuming your context has a logout function
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <header className="app-header">
      <button className="mobile-menu-btn" type="button" onClick={onOpenMobileMenu} aria-label="Open navigation menu">
        ☰
      </button>

      <div className="header-search">
        {/* Optional: Add a global search bar here later */}
      </div>

      <div className="header-actions">
        <div className="profile-container" ref={dropdownRef}>
          <button 
            className="profile-trigger" 
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          >
            <div className="avatar">
              {user?.name?.charAt(0) || "U"}
            </div>
            <div className="user-info">
              <span className="user-name">{user?.name || "User"}</span>
              <span className="user-role">{user?.role}</span>
            </div>
            <span className={`chevron ${isDropdownOpen ? "open" : ""}`}>▾</span>
          </button>

          {isDropdownOpen && (
            <div className="profile-dropdown">
              <div className="dropdown-header">
                <p className="signed-in-as">Signed in as</p>
                <p className="user-email">{user?.email}</p>
              </div>
              <ul className="dropdown-links">
                <li><Link to="/profile" onClick={() => setIsDropdownOpen(false)}>👤 Profile Settings</Link></li>
                {user?.role === 'OWNER' && (
                  <li><Link to="/settings" onClick={() => setIsDropdownOpen(false)}>⚙️ Business Settings</Link></li>
                )}
                <hr />
                <li>
                  <button className="logout-btn" onClick={handleLogout}>
                    Logout 🚪
                  </button>
                </li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default Header;