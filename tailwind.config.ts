import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          50: "#f0f4f8",
          100: "#d9e3ed",
          500: "#1e3a8a",   // Pääväri (Navy Blue)
          600: "#1e40af",
          700: "#1e3a8a",
          800: "#172554",
          900: "#0f172a",
        },
        primary: {
          DEFAULT: "#1e3a8a",
          foreground: "#ffffff",
        },
      },
    },
  },
  plugins: [],
};

export default config;
