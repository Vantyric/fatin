import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        surface: {
          DEFAULT: "var(--surface)",
          2: "var(--surface-2)",
        },
        border: "var(--border)",
        foreground: "var(--text)",
        muted: "var(--muted)",
        brand: {
          primary: "var(--brand-primary)",
          secondary: "var(--brand-secondary)",
        },
        verdict: {
          safe: "var(--verdict-safe)",
          warning: "var(--verdict-warning)",
          danger: "var(--verdict-danger)",
        },
      },
      fontFamily: {
        arabic: ["var(--font-ibm-plex-arabic)", "sans-serif"],
      },
      borderRadius: {
        "16": "16px",
        "24": "24px",
      },
      boxShadow: {
        soft: "0 4px 20px -2px rgba(0, 0, 0, 0.25)",
        glow: "0 0 25px -5px rgba(20, 184, 166, 0.4)",
        card: "0 8px 30px rgba(0, 0, 0, 0.12)",
      },
      lineHeight: {
        arabic: "1.7",
      },
    },
  },
  plugins: [],
};

export default config;
