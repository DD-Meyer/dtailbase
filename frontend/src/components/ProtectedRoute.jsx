import { useContext } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useContext(AuthContext);
  const user = useContext(AuthContext).user; // Get the user object from context

  if (loading) return null;         // wait until auth is loaded
  if (!isAuthenticated || user?.is_active === false)
    {
      return <Navigate to="/login" />;
    }

  return children;
}

export default ProtectedRoute;
