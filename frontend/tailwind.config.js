/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    screens: {
      xs: "360px",
      sm: "640px",
      md: "768px",
      lg: "1024px",
      xl: "1280px",
      "2xl": "1536px",
    },
    extend: {
      colors: {
        brand: {
          DEFAULT: "#0066ff",
          deep: "#0f172a",
          soft: "#eff6ff",
        },
<<<<<<< HEAD
=======
        landing: {
          accent: "#3B82F6",
          secondary: "#1D4ED8",
          deep: "#1E3A8A",
          glow: "rgba(59,130,246,0.15)",
        },
>>>>>>> 96a4d46 (MAJOR - Refactor and redeesign of landing pages, login/register flow, contact pages, redesign.)
      },
      spacing: {
        18: "4.5rem",
        22: "5.5rem",
      },
      borderRadius: {
        xl2: "1rem",
      },
    },
  },
  plugins: [],
}