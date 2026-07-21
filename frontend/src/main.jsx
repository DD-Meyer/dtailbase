import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles/tailwind.css";

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
if (!googleClientId) {
  console.warn("[auth] Missing VITE_GOOGLE_CLIENT_ID in frontend build. Runtime server fallback (/api/auth/google-config/) will be used.");
} else if (!googleClientId.endsWith(".apps.googleusercontent.com")) {
  console.warn("[auth] VITE_GOOGLE_CLIENT_ID looks invalid. Expected a Google Web Client ID ending with .apps.googleusercontent.com");
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((error) => {
      console.warn("[pwa] Service worker registration failed:", error);
    });
  });
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
