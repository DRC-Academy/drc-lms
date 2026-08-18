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
        // ---------------------------------------------------------------
        // EL TEMARIO MES A MES (/curso/[slug])
        //
        // Paleta propia del rediseño. Convive con `marca-*` en vez de
        // reutilizarla porque sus verdes y grises son medio tono
        // distintos, y mezclarlos en la misma pantalla se nota más que
        // tener dos escalas separadas. La tipografía sí es la de la app:
        // la cabecera de lección va arriba de esta misma página.
        // ---------------------------------------------------------------
        temario: {
          fondo: "#F5F6F4",
          borde: "#E4E7E1",
          /** Borde de las filas de módulo, medio tono por debajo del de tarjeta. */
          bordeFila: "#E7E9E4",
          bordeHover: "#C5D2C8",
          filaHover: "#FCFDFB",
          /** Mes en curso en la lista del temario. Ya no hay panel oscuro:
           *  el plan lo pinta ahora `Banner`. */
          oscuro: "#10221A",
          // Acción
          verde: "#1DA34B",
          verdeHover: "#17853D",
          verdeTexto: "#14603A",
          tinte: "#E4F3EA",
          // El módulo en curso
          ambar: "#E9B429",
          ambarTexto: "#8A7A2E",
          crema: "#FDFBEE",
          cremaBorde: "#DFD4A2",
          // Tinta y grises
          tinta: "#0F1A14",
          medio: "#6B756E",
          suave: "#8A948D",
          tenue: "#98A29B",
          enlace: "#5F6B64",
          separador: "#C3CAC5",
          puntoSuave: "#B4BCB6",
          // Líneas
          rail: "#EDEFEB",
          linea: "#E1E4DE",
          circulo: "#DCE0D9",
          pillHover: "#A9BFB0",
          /** Fondo del círculo de mes pendiente, solo en móvil. */
          mesPendiente: "#F3F5F1",
        },
        // ---------------------------------------------------------------
        // EL BANNER, Y SOLO EL BANNER
        //
        // Una franja destacada es la única superficie de la aplicación con
        // fondo verde de marca, y por eso tiene paleta propia: estos seis
        // valores no deben aparecer fuera de `components/Banner.tsx`. El
        // resto de la pantalla —tarjetas blancas y crema— sigue con
        // `marca-*` y con el botón verde de siempre.
        //
        // EL AMARILLO SOLO EXISTE DENTRO DEL VERDE. Fuera de un banner un
        // botón amarillo compite con el verde de acción y la pantalla
        // acaba con dos llamadas discutiendo; dentro, es lo único que
        // destaca sobre el fondo sin ser otra vez verde sobre verde.
        //
        // El texto del CTA es verde profundo y no blanco: blanco sobre
        // este amarillo da 1,9:1 y no llega ni de lejos a AA. Se cambia en
        // `--banner-cta-fg` (ver `globals.css`), no aquí.
        // ---------------------------------------------------------------
        banner: {
          /** Arranque del degradado, arriba. */
          alto: "#23A44E",
          /** Final del degradado, abajo. */
          bajo: "#0F9A3E",
          /** Etiqueta de sección sobre el verde. */
          ambar: "#FFD54A",
          cta: "#F7C500",
          ctaHover: "#E6B800",
          /** Texto sobre el amarillo: 6,2:1. */
          ctaTexto: "#0D5C2F",
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
          /** Hover de los botones suaves y separadores dentro de una tarjeta. */
          nieblaOscura: "#EDF1EE",
          borde: "#E2E8E4",
          /** Bordes de multimedia y de hueco sin corregir. */
          bordeSuave: "#DCE4DE",
          /** Fondo de las escalas de progreso, y del CTA inactivo. */
          pista: "#E8EEE9",
          /** Fondo de la opción correcta y del ítem de lección actual. */
          verdeFondo: "#F0FAF2",
          /** Texto de las lecciones: más cálido que la tinta de titular. */
          tintaCuerpo: "#24352C",
          /** Marca de lección pendiente. */
          puntoPendiente: "#C9D6CD",
          /** Texto del CTA cuando todavía no se puede pulsar. */
          grisInactivo: "#9BA8A1",
          /** Opción descartada una vez respondido el ejercicio. */
          casiBlanco: "#FBFCFB",
          /** Hueco sin corregir. */
          huecoFondo: "#F8FAF8",
          // ---------------------------------------------------------------
          // EL FALLO NO ES ROJO
          //
          // Una respuesta equivocada se marca con un neutro cálido y un
          // guion, no con rojo y una cruz: el alumno está aprendiendo, no
          // cometiendo una infracción. El rojo es para lo que hay que
          // arreglar ya, y aquí no hay nada roto.
          // ---------------------------------------------------------------
          calido: "#C0A97A",
          calidoFondo: "#FBF7EF",
          calidoBadge: "#EFE3C0",
          calidoBadgeTexto: "#6B5A2E",
          calidoSegmento: "#D8CDB4",
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
