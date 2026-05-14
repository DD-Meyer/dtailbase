import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles/tailwind.css";

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
if (!googleClientId) {
  console.warn("[auth] Missing VITE_GOOGLE_CLIENT_ID. Google Sign-In button may not render.");
} else if (!googleClientId.endsWith(".apps.googleusercontent.com")) {
  console.warn("[auth] VITE_GOOGLE_CLIENT_ID looks invalid. Expected a Google Web Client ID ending with .apps.googleusercontent.com");
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
