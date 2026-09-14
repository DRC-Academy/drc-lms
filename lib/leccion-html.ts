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
    .replace(ESPACIO_TRAS_BLOQUE, "$1")
    .replace(ESPACIO_ANTE_CIERRE, "$1")
    .replace(/[ \t]{2,}/g, " ");
}

// ---------------------------------------------------------------
// SOLO EN LOS BORDES DE UN BLOQUE
//
// Esto recogía el espacio pegado a CUALQUIER etiqueta, y en línea eso
// se come el que separa las palabras: "why <strong>skimming</strong>
// and" salía "why<strong>skimming</strong>and". Un emoji al principio
// de un párrafo o de un ítem deja el espacio al abrir la etiqueta de
// bloque, y ahí es donde hay que recogerlo; entre un <b> y la palabra
// de al lado el espacio es texto.
// ---------------------------------------------------------------
const ESPACIO_TRAS_BLOQUE = /(<(?:p|li|h[1-6]|div|td|th|ul|ol|blockquote|section|article|br)\b[^>]*>)[ \t]+/gi;
const ESPACIO_ANTE_CIERRE = /[ \t]+(<\/(?:p|li|h[1-6]|div|td|th|ul|ol|blockquote|section|article)>)/gi;

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

// ---------------------------------------------------------------
// LOS PÁRRAFOS QUE WORDPRESS PONÍA AL PINTAR
//
// El `post_content` de LearnDash no lleva <p>: separa los párrafos con
// una línea en blanco y era WordPress, al servir la página, quien los
// envolvía (`wpautop`). Migrado tal cual, un párrafo tras otro se
// pintaba como un solo bloque de texto corrido: "This is useful for:
// Identifying the main idea. Understanding the structure." sin un
// solo salto.
//
// Esto hace la parte de `wpautop` que hace falta y ninguna más: cada
// trozo entre líneas en blanco que no contenga ya una etiqueta de
// bloque se envuelve en <p>, y los saltos sueltos dentro pasan a <br>.
// Un trozo con un bloque dentro —una lista, un título— se deja como
// está: envolverlo metería el bloque dentro de un párrafo.
// ---------------------------------------------------------------
const CON_BLOQUE =
  /<(?:p|div|ul|ol|li|h[1-6]|table|tbody|thead|tr|td|th|blockquote|pre|hr|iframe|figure|section|article|img|video|audio)\b/i;

export function autoparrafos(html: string): string {
  return html
    .replace(/\r\n?/g, "\n")
    .split(/\n[ \t]*\n/)
    .map((trozo) => {
      const recortado = trozo.trim();
      // Vacío, o solo el &nbsp; con el que el editor separaba bloques.
      if (recortado === "" || /^(?:&nbsp;|\s)+$/.test(recortado)) return "";
      if (CON_BLOQUE.test(recortado)) return recortado;
      return `<p>${recortado.replace(/\n/g, "<br>")}</p>`;
    })
    .filter((trozo) => trozo !== "")
    .join("\n");
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
  const limpio = autoparrafos(quitarEmojis(htmlOriginal));
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

// ---------------------------------------------------------------
// LA LECCIÓN, EN PARTES
//
// La pantalla ya no enseña el HTML de arriba abajo: lo trocea por sus
// títulos y enseña una parte cada vez, con un paso a paso encima. El
// corte se hace aquí, en el servidor, sobre el HTML que ya lleva las
// anclas de `prepararLeccion`: cada `<h2-4 id="tN">` abre una parte y
// se lleva lo que hay hasta el siguiente título.
//
// EL TÍTULO SALE DEL HTML DE LA PARTE. Lo pinta la vista como cabecera
// del contenedor, en la tipografía de la aplicación, así que dejarlo
// dentro lo repetiría dos veces seguidas.
//
// LO QUE VA ANTES DEL PRIMER TÍTULO es una parte sin título propio —la
// vista le pone el de la lección— siempre que tenga algo que leer: en
// el material migrado suele ser un párrafo de objetivo. Y una lección
// sin ningún título es una sola parte, que es lo que era antes.
// ---------------------------------------------------------------

export type ParteLeccion = {
  id: string;
  /** null en la parte de antes del primer título: la vista pone el de la lección. */
  titulo: string | null;
  html: string;
};

/** Si un trozo de HTML tiene algo que enseñar: texto, una imagen o un reproductor. */
function tieneAlgo(html: string): boolean {
  if (/<(img|iframe|video|audio|table)\b/i.test(html)) return true;
  return soloTexto(html) !== "";
}

/**
 * Solo letras y cifras ASCII, en minúsculas: para comparar títulos sin
 * que la puntuación ni los acentos decidan. Sin el flag `u` —ver la
 * nota de `EMOJI`—: se descomponen los acentos y se tira lo que no sea
 * a-z ni 0-9, que en un material en inglés es lo que hay.
 */
function esqueleto(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[^a-z0-9]+/g, "");
}

export function partesDeLeccion(htmlPreparado: string, tituloLeccion = ""): ParteLeccion[] {
  const patron = /<(h[2-4])\b[^>]*\bid="(t\d+)"[^>]*>([\s\S]*?)<\/\1\s*>/gi;
  const partes: ParteLeccion[] = [];
  const tituloBase = esqueleto(tituloLeccion);

  let ultimoFin = 0;
  let pendiente: { id: string; titulo: string } | null = null;

  // EL TÍTULO QUE REPITE EL DE LA LECCIÓN NO ES UNA PARTE CON NOMBRE. El
  // material migrado suele abrir con un <h3> que dice lo mismo que el
  // título de la lección, y debajo el párrafo de objetivo: esa parte es
  // la introducción, y ponerle el título otra vez debajo del título es
  // decirlo dos veces seguidas.
  const cerrar = (hasta: number) => {
    const html = htmlPreparado.slice(ultimoFin, hasta);
    if (pendiente) {
      const propio = esqueleto(pendiente.titulo);
      const repite =
        tituloBase !== "" &&
        propio.length >= 12 &&
        (propio === tituloBase || tituloBase.endsWith(propio) || propio.endsWith(tituloBase));
      partes.push({ id: pendiente.id, titulo: repite ? null : pendiente.titulo, html });
    } else if (tieneAlgo(html)) {
      partes.push({ id: "intro", titulo: null, html });
    }
  };

  let encontrado: RegExpExecArray | null;
  while ((encontrado = patron.exec(htmlPreparado)) !== null) {
    cerrar(encontrado.index);
    pendiente = { id: encontrado[2], titulo: soloTexto(encontrado[3]) };
    ultimoFin = encontrado.index + encontrado[0].length;
  }
  cerrar(htmlPreparado.length);

  // Una parte sin nada debajo —dos títulos seguidos, o el título de la
  // lección y directamente el primer apartado— no orienta: se va, y su
  // título no cuenta como paso.
  return partes.filter((p) => tieneAlgo(p.html));
}
