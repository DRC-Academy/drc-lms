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
          amarillo: "#F9BE00",
          "amarillo-hover": "#FFD23F",
          // Neutros
          fondo: "#F4F3EF",
          superficie: "#FFFFFF",
          borde: "#E6E3DA",
          suave: "#F1EFE7",
          discontinuo: "#DFDBD0",
          numeral: "#CFCABC",
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
          // Acción, y desde ahora también «estás aquí»: el borde y el
          // punto del módulo en curso en la lista del temario.
          verde: "#1DA34B",
          verdeTexto: "#14603A",
          /** El mes en curso en la línea de recorrido, y solo ahí. */
          ambar: "#E9B429",
          ambarTexto: "#8A7A2E",
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
        // Una franja destacada es la única superficie oscura de la
        // aplicación, y por eso tiene paleta propia: estos cinco valores
        // no deben aparecer fuera de `components/Banner.tsx`. El resto de
        // la pantalla —tarjetas blancas y crema— sigue con `marca-*`.
        //
        // EL FONDO ERA VERDE DE MARCA Y AHORA ES TINTA. El verde hacía dos
        // trabajos a la vez —fondo de franja y color de "pulsa aquí"— y de
        // esa colisión salía toda una excepción: el botón del banner tenía
        // que ser amarillo porque un botón verde sobre fondo verde no es
        // un botón, es un rectángulo. Con la franja en tinta el verde
        // vuelve a significar una sola cosa, el botón vuelve a ser verde y
        // la excepción del amarillo desaparece de la aplicación.
        //
        // El amarillo sigue existiendo fuera de aquí como acento —sellos,
        // chips, el borde del bloque recién preparado—, que es lo que
        // siempre debió ser.
        // ---------------------------------------------------------------
        banner: {
          /** Fondo de la franja. El mismo tinta que los titulares. */
          fondo: "#12211A",
          /** Etiqueta de sección sobre la tinta: 11,1:1. */
          etiqueta: "#A9DFB7",
          /** El verde de acción no se ve sobre tinta; este sí. */
          cta: "#37C25A",
          ctaHover: "#52CE72",
          /** Texto sobre ese verde claro: 7,1:1. */
          ctaTexto: "#06240F",
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
          // ---------------------------------------------------------------
          // EL CAMPO DE LA RUTA («Para ti»)
          //
          // La única superficie con color de la aplicación fuera de la
          // franja. «Para ti» es la pantalla que está hecha para un solo
          // alumno, y era la que peor lo transmitía: cuatro casillas de
          // métrica sobre el mismo gris que todo lo demás. Este verde
          // clarísimo la separa sin tocar el significado de nada —el
          // verde de acción sigue destacando encima— y las dos formas de
          // fondo le dan el aire que le faltaba.
          // ---------------------------------------------------------------
          ruta: "#EDF7F0",
          rutaBorde: "#CFE8D8",
          rutaForma: "#E0F1E7",
          rutaForma2: "#E5F4EB",
          /** Borde de la tarjeta blanca sobre el campo verde. */
          rutaTarjeta: "#DCE9E1",
          /** Trazo y nodos de lo que aún no se ha andado. */
          rutaTrazo: "#C4DECF",
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
