import axios from "axios";
import { clearAuthStorage, getAccessToken } from "./utils/authStorage";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000/api",
  withCredentials: true,
});

// REQUEST: Attach the token to every call
api.interceptors.request.use(
  (config) => {
    const token = getAccessToken();
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
      
      // 1. Clear all auth storage so AuthContext fails auth on reload
      clearAuthStorage();

      // 2. Force a redirect to login
      // We use window.location.href because this file is outside the 
      // React Component tree and cannot use useNavigate()
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default api;