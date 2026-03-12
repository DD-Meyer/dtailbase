import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import Sidebar from "./Sidebar";
import Header from "./Header";

function PublicLayout({ children }) {
  const { isAuthenticated } = useContext(AuthContext);

  if (!isAuthenticated) return <>{children}</>;

  return (
    <div className="dashboard-wrapper">
      <Sidebar />
      <div className="main-content">
        <Header />
        <div className="content-body">
          {children}
        </div>
      </div>
    </div>
  );
}

export default PublicLayout;