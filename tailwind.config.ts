import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      // La columna del panel mide 720px: no coincide con ningún breakpoint
      // por defecto, así que se declara uno propio.
      screens: {
        wide: "720px",
      },
      maxWidth: {
        columna: "720px",
      },
      colors: {
        // Sistema visual DRC Academy
        drc: {
          // Marca
          verde: "#04A749", // solo rellenos y elementos gráficos, nunca texto
          "verde-texto": "#02662E",
          "verde-solido": "#037A36",
          "verde-solido-hover": "#025C29",
          banner: "#046B31",
          "banner-texto": "#05411F",
          amarillo: "#F9BE00",
          "amarillo-hover": "#FFD23F",
          // Neutros
          fondo: "#F4F3EF",
          superficie: "#FFFFFF",
          borde: "#E6E3DA",
          suave: "#F1EFE7",
          discontinuo: "#DFDBD0",
          numeral: "#CFCABC",
          hairline: "#CBD3CB",
          flecha: "#B4BDB5",
          // Tinta
          titular: "#0E2A19",
          texto: "#1F2A24",
          cuerpo: "#5A655E",
          // No llega a 4.5:1 sobre fondo ni sobre superficie: no usar en texto.
          apagado: "#8B958E",
          "chip-texto": "#4A554F",
          "chip-verde": "#E4F6EA",
          // Interacción
          "enlace-hover": "#014D22",
          "fantasma-hover": "#F1F6F2",
        },
        // Paleta anterior: la siguen usando el índice y la práctica.
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
