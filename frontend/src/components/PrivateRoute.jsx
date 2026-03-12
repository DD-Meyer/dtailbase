import { Navigate } from "react-router-dom";

const PrivateRoute = ({ children }) => {
  const token = localStorage.getItem("accessToken"); // or your auth token
  return token ? children : <Navigate to="/login" replace />;
};

export default PrivateRoute;
