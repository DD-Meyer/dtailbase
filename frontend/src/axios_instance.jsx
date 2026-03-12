import axios from "axios";

const api = axios.create({
  baseURL: "/api/", // No domain needed! The browser will use whatever you're currently on.

  // Keep your other settings
  withCredentials: true,
});

// REQUEST: Attach the token to every call
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("accessToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// RESPONSE: Watch for session expiration (401 errors)
api.interceptors.response.use(
  (response) => response, // If the request is successful, do nothing
  (error) => {
    // Check if the error is a 401 (Unauthorized)
    // To this:
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      console.warn("Session expired or unauthorized. Logging out...");
      
      // 1. Clear the storage so the AuthContext 'isAuthenticated' check fails on reload
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("userEmail");

      // 2. Force a redirect to login
      // We use window.location.href because this file is outside the 
      // React Component tree and cannot use useNavigate()
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default api;