import { useState, useContext, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeftCircleIcon } from "lucide-react";
import { AuthContext } from "../context/AuthContext";
import "../styles/Header.css";

function UserDropdownMenu() {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const { user, logout } = useContext(AuthContext);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

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
    setIsDropdownOpen(false);
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
        </div>
        <div className="user-info">
          <span className="user-name">{user?.name || "User"}</span>
          <span className="user-role">{user?.role}</span>
        </div>
        <span className={`chevron ${isDropdownOpen ? "open" : ""}`}>{isDropdownOpen ? "▴" : "▾"}</span>
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
                <ArrowLeftCircleIcon /> Back
              </Link>
            </li>
            <li><Link to="/profile" onClick={() => setIsDropdownOpen(false)}>👤 Profile Settings</Link></li>
            {user?.role === "OWNER" && (
              <li><Link to="/settings" onClick={() => setIsDropdownOpen(false)}>⚙️ Business Settings</Link></li>
            )}
            {user?.role === "OWNER" && (
              <li><Link to="/settings/indemnity" onClick={() => setIsDropdownOpen(false)}>🛡️ Indemnity Settings</Link></li>
            )}
            <hr />
            <li>
              <button type="button" className="logout-btn" onClick={handleLogout}>
                Logout 🚪
              </button>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}

export default UserDropdownMenu;