import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { getAppTheme, setAppTheme } from "../utils/appTheme";

export default function ThemeToggle() {
  const [theme, setTheme] = useState(getAppTheme);
  useEffect(() => {
    const sync = () => setTheme(getAppTheme());
    const syncStorage = (event) => {
      if (event.key !== "dtailbase-theme") return;
      document.documentElement.dataset.theme = event.newValue === "dark" ? "dark" : "light";
      sync();
    };
    window.addEventListener("app-theme-change", sync);
    window.addEventListener("storage", syncStorage);
    return () => {
      window.removeEventListener("app-theme-change", sync);
      window.removeEventListener("storage", syncStorage);
    };
  }, []);
  const dark = theme === "dark";
  return (
    <button type="button" className="app-theme-toggle" aria-label={dark ? "Use light theme" : "Use dark theme"}
      aria-pressed={dark} onClick={() => setAppTheme(dark ? "light" : "dark")}>
      {dark ? <Sun size={20} aria-hidden="true" /> : <Moon size={20} aria-hidden="true" />}
    </button>
  );
}
