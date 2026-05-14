import axios from "axios";
import { clearAuthStorage, getAccessToken } from "./utils/authStorage";

const configuredApiUrl = (import.meta.env.VITE_API_URL || "").trim();

const isAbsoluteUrl = (url) => /^https?:\/\//i.test(url) || url.startsWith("//");

const api = axios.create({
  // Default to same-origin /api so production works even if VITE_API_URL is not injected.
  baseURL: configuredApiUrl || "/api",
  withCredentials: true,
});

// REQUEST: Attach the token to every call
api.interceptors.request.use(
  (config) => {
    if (typeof config.url === "string" && config.url.startsWith("/") && !isAbsoluteUrl(config.url)) {
      // Prevent '/foo' from bypassing baseURL path segment (e.g. '/api').
      config.url = config.url.replace(/^\/+/, "");
    }

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