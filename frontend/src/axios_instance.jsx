import axios from "axios";
import { clearAuthStorage, getAccessToken, getRefreshToken, setAccessToken } from "./utils/authStorage";

const configuredApiUrl = (import.meta.env.VITE_API_URL || "").trim();

const isAbsoluteUrl = (url) => /^https?:\/\//i.test(url) || url.startsWith("//");

const api = axios.create({
  // Default to same-origin /api so production works even if VITE_API_URL is not injected.
  baseURL: configuredApiUrl || "/api",
  withCredentials: true,
});

const refreshApi = axios.create({
  baseURL: configuredApiUrl || "/api",
  withCredentials: true,
});

let isRefreshing = false;
let refreshSubscribers = [];

const isAuthRequest = (url = "") => {
  const normalizedUrl = String(url).replace(/^\/+/, "");
  return (
    normalizedUrl.startsWith("token/") ||
    normalizedUrl.startsWith("auth/google-login/")
  );
};

const onRefreshed = (newAccessToken) => {
  refreshSubscribers.forEach((callback) => callback(newAccessToken));
  refreshSubscribers = [];
};

const subscribeTokenRefresh = (callback) => {
  refreshSubscribers.push(callback);
};

const refreshAccessToken = async () => {
  const refreshToken = getRefreshToken();

  if (!refreshToken) {
    throw new Error("Missing refresh token");
  }

  const response = await refreshApi.post("token/refresh/", { refresh: refreshToken });
  const newAccessToken = response?.data?.access;

  if (!newAccessToken) {
    throw new Error("Token refresh response missing access token");
  }

  setAccessToken(newAccessToken);
  return newAccessToken;
};

const forceLogout = () => {
  clearAuthStorage();
  window.location.href = "/login";
};

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

    const userLocale = typeof navigator !== "undefined" ? (navigator.language || "") : "";
    const userTimezone = typeof Intl !== "undefined"
      ? (Intl.DateTimeFormat().resolvedOptions().timeZone || "")
      : "";

    if (userLocale) {
      config.headers["X-User-Locale"] = userLocale;
    }
    if (userTimezone) {
      config.headers["X-User-Timezone"] = userTimezone;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error?.config;
    const status = error?.response?.status;

    if (!originalRequest || status !== 401) {
      return Promise.reject(error);
    }

    if (isAuthRequest(originalRequest.url)) {
      return Promise.reject(error);
    }

    if (originalRequest._retry) {
      forceLogout();
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        subscribeTokenRefresh((newAccessToken) => {
          if (!newAccessToken) {
            reject(error);
            return;
          }

          originalRequest.headers = originalRequest.headers || {};
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          resolve(api(originalRequest));
        });
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const newAccessToken = await refreshAccessToken();
      onRefreshed(newAccessToken);

      originalRequest.headers = originalRequest.headers || {};
      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
      return api(originalRequest);
    } catch (refreshError) {
      onRefreshed(null);
      forceLogout();
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

export default api;