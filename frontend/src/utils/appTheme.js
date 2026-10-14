const THEME_KEY = "dtailbase-theme";

export const getAppTheme = () => document.documentElement.dataset.theme === "dark" ? "dark" : "light";

export const setAppTheme = (theme) => {
  if (theme !== "light" && theme !== "dark") throw new Error("Invalid application theme");
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch (error) {
    console.warn("Theme preference could not be saved:", error.message);
  }
  window.dispatchEvent(new Event("app-theme-change"));
};
