// context/AuthContext.jsx
import { createContext, useState, useEffect } from "react";

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null); // 👈 Store the whole user object
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const access = localStorage.getItem("accessToken");
    const storedUser = localStorage.getItem("userData");

    // Only try to parse if BOTH the token and the user string exist
    if (access && storedUser && storedUser !== "undefined") {
      try {
        setIsAuthenticated(true);
        setUser(JSON.parse(storedUser));
      } catch (error) {
        console.error("Error parsing stored user data:", error);
        // If data is corrupt, clear it
        localStorage.removeItem("userData");
      }
    }
    setLoading(false);
  }, []);

  // 🔑 Updated login to accept the full user object (including role)
  const login = (accessToken, refreshToken, userData) => {
    localStorage.setItem("accessToken", accessToken);
    localStorage.setItem("refreshToken", refreshToken);
    localStorage.setItem("userData", JSON.stringify(userData)); // 👈 Save as string
    
    setUser(userData);
    setIsAuthenticated(true);
  };

  const logout = () => {
    localStorage.clear();
    setIsAuthenticated(false);
    setUser(null);
    window.location.href = "/";
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}