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
      animation: {
        "blob-drift-1": "blobDrift1 18s ease-in-out infinite alternate",
        "blob-drift-2": "blobDrift2 24s ease-in-out infinite alternate",
        "blob-drift-3": "blobDrift3 20s ease-in-out infinite alternate",
        "sheen": "sheenSweep 3.5s ease-in-out infinite",
        "chromatic-pulse": "chromaticPulse 4s ease-in-out infinite alternate",
      },
      keyframes: {
        blobDrift1: {
          "0%": { transform: "translate(0px, 0px) scale(1)" },
          "50%": { transform: "translate(60px, -40px) scale(1.12)" },
          "100%": { transform: "translate(-40px, 50px) scale(0.95)" },
        },
        blobDrift2: {
          "0%": { transform: "translate(0px, 0px) scale(1)" },
          "50%": { transform: "translate(-70px, 60px) scale(1.15)" },
          "100%": { transform: "translate(50px, -50px) scale(0.9)" },
        },
        blobDrift3: {
          "0%": { transform: "translate(0px, 0px) scale(0.95)" },
          "50%": { transform: "translate(50px, 70px) scale(1.1)" },
          "100%": { transform: "translate(-60px, -30px) scale(1.05)" },
        },
        sheenSweep: {
          "0%": { left: "-150%" },
          "30%, 100%": { left: "150%" },
        },
        chromaticPulse: {
          "0%": { opacity: "0.4", filter: "hue-rotate(0deg)" },
          "50%": { opacity: "0.8", filter: "hue-rotate(45deg)" },
          "100%": { opacity: "0.4", filter: "hue-rotate(0deg)" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
