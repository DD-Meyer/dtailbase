// context/AuthContext.jsx
import { createContext, useState, useEffect } from "react";
import { clearAuthStorage, getAccessToken, getStoredUserData, saveAuthSession } from "../utils/authStorage";

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null); // 👈 Store the whole user object
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const access = getAccessToken();
    const storedUser = getStoredUserData();

    // Only try to parse if BOTH the token and the user string exist
    if (access && storedUser && storedUser !== "undefined") {
      try {
        setIsAuthenticated(true);
        setUser(JSON.parse(storedUser));
      } catch (error) {
        console.error("Error parsing stored user data:", error);
        // If data is corrupt, clear both storage locations
        clearAuthStorage();
      }
    }
    setLoading(false);
  }, []);

  // 🔑 Updated login to accept the full user object (including role)
  const login = (accessToken, refreshToken, userData, options = {}) => {
    const rememberMe = options?.rememberMe ?? true;

    saveAuthSession({ accessToken, refreshToken, userData, rememberMe });
    
    setUser(userData);
    setIsAuthenticated(true);
  };

  const logout = () => {
    clearAuthStorage();
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