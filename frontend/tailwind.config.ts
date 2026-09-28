import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        disaster: {
          critical: "#EF4444",
          urgent: "#F97316",
          warning: "#F59E0B",
          safe: "#10B981",
          coast: "#0284C7",
          dark: "#0F172A",
        },
      },
    },
  },
  plugins: [],
};
export default config;
