import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        slateBlue: "#243447",
        dusk: "#111827",
        sunrise: "#f97316",
        skywash: "#e0f2fe"
      }
    }
  },
  plugins: []
};

export default config;
