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
        // El inicio del alumno es de dos columnas y respira a 1440.
        contenido: "1440px",
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
        // La paleta del inicio del alumno y del visor de curso. La usaba
        // ya media aplicación con seis tokens; el rediseño del inicio
        // añade los que faltaban en vez de meter hex sueltos por el JSX.
        marca: {
          verde: "#1E9E3A",
          verdeOsc: "#14722A",
          /** Progreso sobre fondo tinta: el verde de acción no se ve ahí. */
          verdeClaro: "#37C25A",
          /** Tramos de nivel ya superados. */
          verdePalido: "#A9DFB7",
          amarillo: "#FFC400",
          /** El amarillo no llega a contraste como texto; este sí. */
          amarilloTexto: "#9A7B00",
          tinta: "#12211A",
          /** Cuerpo dentro de tarjetas: más oscuro que el gris de fuera. */
          tintaMedia: "#4C5C53",
          gris: "#5F6F66",
          grisSuave: "#7A8A80",
          grisTenue: "#8A9891",
          niebla: "#F4F7F4",
          borde: "#E2E8E4",
          /** Fondo de las escalas de progreso. */
          pista: "#E8EEE9",
          examen: "#FFFBEB",
          examenBorde: "#EFE3C0",
          contexto: "#EEF2EF",
          contextoBorde: "#DCE4DE",
          perfil: "#FFFDF5",
          perfilBorde: "#D9D0A8",
          iconoInactivo: "#B7C4BC",
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
