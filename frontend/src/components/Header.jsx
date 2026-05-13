import UserDropdownMenu from "./UserDropdownMenu";
import "../styles/Header.css";

function Header() {
  return (
    <header className="app-header">
      <div className="header-search">
        {/* Add a global search bar here later */}
      </div>

      <div className="header-actions">
        <UserDropdownMenu />
      </div>
    </header>
  );
}

export default Header;