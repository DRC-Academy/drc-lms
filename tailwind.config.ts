import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        marca: {
          verde: "#1E9E3A",
          verdeOsc: "#14722A",
          amarillo: "#FFC400",
          tinta: "#12211A",
          niebla: "#F4F7F4",
          borde: "#E2E8E4",
        },
      },
      fontFamily: {
        display: ["'Radio Canada Big'", "'Radio Canada'", "system-ui", "sans-serif"],
        sans: ["'Radio Canada'", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
