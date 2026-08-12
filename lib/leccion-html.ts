// ---------------------------------------------------------------
// PREPARACIÓN DEL HTML DE UNA LECCIÓN
//
// Dos cosas antes de pintar: quitar los emojis que arrastra el material
// migrado y poner un ancla en cada título para que el índice de la
// derecha pueda saltar a él.
//
// SE HACE EN EL SERVIDOR, no en el cliente. El HTML ya se pinta con
// `dangerouslySetInnerHTML` desde un componente de servidor: extraer los
// títulos después, en el navegador, obligaría a montar el DOM, leerlo y
// volver a pintar el índice, con su parpadeo. Aquí sale ya resuelto.
//
// Con expresiones regulares y sobre un cuerpo de HTML conocido —el que
// importó `scripts/importar-learndash.ts`—, igual que `sanear-html.ts`.
// No es un analizador de HTML y no pretende serlo.
// ---------------------------------------------------------------

/**
 * Los rangos de emoji que aparecen en el material.
 *
 * Escrito con pares subrogados y sin el flag `u` a propósito: el
 * tsconfig del proyecto no fija `target`, así que TypeScript lo trata
 * como ES5 y `u` no compila (TS1501). La primera alternativa —cualquier
 * par subrogado— cubre el plano astral entero, que es donde viven los
 * emojis modernos; en un material en inglés no hay ahí otra cosa.
 *
 * Incluye los selectores de variación (FE0F) y el de ancho cero (200D),
 * que son los que unen un emoji compuesto: sin ellos quedarían restos
 * invisibles que descuadran los espacios.
 */
// LAS FLECHAS NO SON EMOJIS. El rango 2190-21FF se quedó fuera a
// propósito: "go → went", "claim → reason → evidence" o "❌ → ✅" son
// notación de la lección, no adorno, y aparecen en 197 lecciones, 24
// enunciados y 3 títulos. Las flechas de emoji de verdad (➡ ⬅) viven en
// otros rangos y esas sí se van.
const EMOJI = new RegExp(
  "[\\uD800-\\uDBFF][\\uDC00-\\uDFFF]" + // plano astral: 1F300-1FAFF y compañía
    "|[\\u2300-\\u23FF]" + //               reloj, símbolos técnicos
    "|[\\u2460-\\u24FF]" + //               números en círculo
    "|[\\u25A0-\\u27BF]" + //               cuadros, estrellas, ✅ ❌ ✔ ➡
    "|[\\u2B00-\\u2BFF]" + //               flechas y formas extra
    "|[\\uFE00-\\uFE0F]" + //               selectores de variación
    "|[\\u20D0-\\u20FF]" + //               el círculo del "1️⃣", que si no queda suelto
    "|\\u200D", //                          unión de emojis compuestos
  "g"
);

// ---------------------------------------------------------------
// TRES QUE NO SE VAN, Y POR QUÉ
//
// El encargo era quitar los emojis heredados, y ✅ estaba en la lista.
// Pero en este material ✅ y ❌ no siempre son adorno: en 359 de las 992
// lecciones con contenido son la ÚNICA marca que distingue el inglés
// correcto del incorrecto.
//
//   Example: ❌ I think the government should invest more in education…
//            ✅ It goes without saying that increased investment in…
//
// Quitarlos deja dos frases seguidas sin nada que diga cuál es la buena,
// que es justo lo que la lección venía a enseñar. Como viñeta —"✅ Sound
// more like a native speaker"— sí sobran, pero no hay forma fiable de
// distinguir un uso del otro, y equivocarse hacia el lado de borrar
// rompe la lección en silencio.
//
// Si se decide que se van igualmente, se vacía este conjunto y ya está.
// ---------------------------------------------------------------
const MARCAS_QUE_ENSENAN = new Set([
  "✅", // ✅
  "❌", // ❌
  "🚫", // 🚫
]);

/**
 * Quita los emojis y limpia lo que dejan detrás.
 *
 * El material trae "⏱️ Duración", "📖 Theoretical Material:" o listas
 * que empiezan por "✅ ". Quitar el carácter y ya está dejaría un espacio
 * al principio de cada línea y dobles espacios en medio, así que después
 * se recogen los espacios sobrantes justo donde estaba el emoji: al
 * abrir una etiqueta, al cerrarla y entre palabras.
 */
export function quitarEmojis(html: string): string {
  return html
    .replace(EMOJI, (encontrado) => (MARCAS_QUE_ENSENAN.has(encontrado) ? encontrado : ""))
    .replace(/>[ \t]+/g, ">")
    .replace(/[ \t]+</g, "<")
    .replace(/[ \t]{2,}/g, " ");
}

/**
 * Lo mismo, pero para un título: aquí SÍ se van también ✅ ❌ 🚫.
 *
 * La excepción de arriba existe porque en el cuerpo de la lección esas
 * marcas contrastan inglés correcto con incorrecto. Un título no
 * contrasta nada: "✅ Writing: Full-length article under timed
 * conditions" es decoración, igual que el "🎥" de los 60 títulos de
 * vídeo. Y como el título se pinta como texto y no como HTML, además
 * hay que recoger los espacios que deja el emoji al irse.
 */
export function quitarEmojisDeTitulo(texto: string): string {
  return limpiarTexto(texto, false);
}

/**
 * Y para el enunciado de un ejercicio, donde ✅ ❌ 🚫 SÍ se quedan.
 *
 * Ahí vuelven a contrastar: "❌ Being tired, the nap was necessary" es un
 * ejercicio de corregir la frase, y son 27 enunciados. Sin la marca, el
 * alumno no sabe si la frase que lee es el modelo o el error.
 */
export function quitarEmojisDeEnunciado(texto: string): string {
  return limpiarTexto(texto, true);
}

function limpiarTexto(texto: string, conservarMarcas: boolean): string {
  const limpio = texto
    .replace(EMOJI, (encontrado) =>
      conservarMarcas && MARCAS_QUE_ENSENAN.has(encontrado) ? encontrado : ""
    )
    .replace(/[ \t]{2,}/g, " ")
    .replace(/ +([,.;:!?])/g, "$1")
    .trim();

  // NUNCA DEJAR VACÍO LO QUE TENÍA ALGO. Hay opciones de examen que son
  // un emoji y nada más; vaciarlas hacía que el ejercicio se quedara con
  // menos de dos opciones y el importador lo descartaba entero. Se
  // perdían 8 ejercicios por limpiar un adorno. Si no queda nada, se
  // devuelve lo que había: un emoji suelto molesta menos que un
  // ejercicio que desaparece.
  return limpio === "" ? texto.trim() : limpio;
}

export type TituloLeccion = { id: string; texto: string };

/** El texto de un título, sin etiquetas ni entidades. */
function soloTexto(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#8217;|&rsquo;/g, "’")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Deja el HTML listo para pintar y devuelve los títulos para el índice.
 *
 * SOLO SE DEVUELVE EL ÍNDICE SI HAY DOS TÍTULOS O MÁS. De las 1.164
 * lecciones, 232 tienen exactamente uno: una columna de 220px para un
 * único enlace no orienta a nadie, solo estrecha la lectura. Con dos ya
 * hay algo que recorrer.
 *
 * El ancla se inyecta siempre, aunque el índice no se pinte: no cuesta
 * nada y deja la lección enlazable desde fuera.
 */
export function prepararLeccion(htmlOriginal: string): {
  html: string;
  titulos: TituloLeccion[];
} {
  const limpio = quitarEmojis(htmlOriginal);
  const titulos: TituloLeccion[] = [];

  let n = 0;
  const html = limpio.replace(
    /<(h[2-4])\b([^>]*)>([\s\S]*?)<\/\1\s*>/gi,
    (etiqueta, nivel: string, atributos: string, dentro: string) => {
      const texto = soloTexto(dentro);
      if (texto === "") return etiqueta;

      const id = `t${++n}`;
      titulos.push({ id, texto });

      // Si ya traía un id —no pasa en este material, pero no cuesta—
      // se respeta el nuestro: es el que enlaza el índice.
      const sinId = atributos.replace(/\s+id\s*=\s*("[^"]*"|'[^']*')/gi, "");
      return `<${nivel}${sinId} id="${id}">${dentro}</${nivel}>`;
    }
  );

  return { html, titulos: titulos.length >= 2 ? titulos : [] };
}
