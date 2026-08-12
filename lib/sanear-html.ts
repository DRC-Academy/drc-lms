// ---------------------------------------------------------------
// SANEADO DEL HTML IMPORTADO
//
// El contenido de las lecciones viene de LearnDash y se pinta con
// `dangerouslySetInnerHTML`, así que pasa por aquí antes.
//
// Es contenido propio de la academia, sí. Pero estuvo años en un
// WordPress con plugins, editores visuales y quien tuviera acceso al
// panel; "es nuestro" describe de dónde salió, no qué lleva dentro. Y
// basta un `<script>` en una de las 999 lecciones para que el token de
// sesión de quien la abra salga por la puerta.
//
// LO QUE ESTO NO ES: un saneador general. Trabaja con expresiones
// regulares sobre un cuerpo de HTML conocido y acotado —el que importó
// `scripts/importar-learndash.ts`— y no pretende resistir a un
// atacante que pueda escribir el HTML a medida. Si algún día el
// contenido lo escriben terceros, esto se cambia por un analizador de
// verdad; mientras tanto es la barrera proporcionada al riesgo.
// ---------------------------------------------------------------

/**
 * Solo se dejan pasar iframes de estos anfitriones.
 *
 * Podbean está aquí porque es donde vive TODO el audio del curso: los
 * 104 iframes del export son suyos, y son los ejercicios de listening.
 * Sin esta línea, el alumno lee "escucha el audio y responde" y no hay
 * nada que escuchar.
 */
const ANFITRIONES = [
  /^https?:\/\/(www\.)?(youtube\.com|youtube-nocookie\.com|youtu\.be)\//i,
  /^https?:\/\/(www\.)?podbean\.com\//i,
];

const permitido = (src: string): boolean => ANFITRIONES.some((a) => a.test(src));

/**
 * Etiquetas que se van con su contenido dentro. No basta con quitar la
 * etiqueta: el cuerpo de un `<script>` sin sus etiquetas quedaría como
 * texto suelto en medio de la lección.
 */
const CON_CONTENIDO = /<(script|style|object|embed|noscript|template)\b[^>]*>[\s\S]*?<\/\1\s*>/gi;

/** Y las mismas sin cerrar, por si el HTML viene roto. */
const SUELTAS = /<\/?(script|style|object|embed|noscript|template|form|input|button)\b[^>]*>/gi;

/** `onclick`, `onerror`, `onload`… con comillas, sin ellas, o vacío. */
const MANEJADORES = /\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi;

/** Protocolos que no deben viajar en un href o un src. */
const PROTOCOLO_PELIGROSO = /\s(href|src|xlink:href)\s*=\s*(?:"\s*(?:javascript|data|vbscript):[^"]*"|'\s*(?:javascript|data|vbscript):[^']*'|(?:javascript|data|vbscript):[^\s>]*)/gi;

/**
 * El `src` de un iframe, si lo tiene. Se lee con su propia expresión
 * para decidir si el iframe entero se queda o se va.
 */
function srcDe(etiqueta: string): string {
  const conComillas = etiqueta.match(/\ssrc\s*=\s*(?:"([^"]*)"|'([^']*)')/i);
  if (conComillas) return conComillas[1] ?? conComillas[2] ?? "";
  const sinComillas = etiqueta.match(/\ssrc\s*=\s*([^\s>]+)/i);
  return sinComillas ? sinComillas[1] : "";
}

/**
 * Devuelve HTML apto para `dangerouslySetInnerHTML`.
 *
 * El orden importa: primero se quitan los bloques con su contenido,
 * luego las etiquetas sueltas, luego los iframes que no son de YouTube
 * y solo al final los atributos. Al revés, un `<script>` con un
 * `onerror` dentro perdería el atributo pero conservaría el cuerpo.
 */
export function sanearHtml(html: string): string {
  if (html.trim() === "") return "";

  let salida = html;

  salida = salida.replace(CON_CONTENIDO, "");
  salida = salida.replace(SUELTAS, "");

  // Los iframes: se conservan los de la lista de arriba y se descarta
  // cualquier otro con su cierre.
  //
  // El recuento que había aquí antes —"solo 7 lecciones de 999 llevan
  // vídeo"— era falso. Esos 7 son menciones en prosa ("watch YouTube
  // videos with subtitles"), no incrustaciones. El vídeo real del curso
  // son 160 topics y 1 módulo, y no viaja en el HTML sino en la meta
  // `sfwd-topic_lesson_video_url`: entra por `lecciones.video_url` y lo
  // pinta la vista, sin pasar por aquí. Por este saneador solo pasan los
  // iframes de audio.
  salida = salida.replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe\s*>/gi, (trozo) => {
    const apertura = trozo.match(/<iframe\b[^>]*>/i);
    if (!apertura) return "";
    return permitido(srcDe(apertura[0])) ? trozo : "";
  });
  // Y los que vengan sin cerrar.
  salida = salida.replace(/<iframe\b[^>]*\/?>/gi, (etiqueta) =>
    permitido(srcDe(etiqueta)) ? etiqueta : ""
  );

  salida = salida.replace(MANEJADORES, "");
  salida = salida.replace(PROTOCOLO_PELIGROSO, "");

  return salida;
}

/**
 * ¿Este HTML tiene algo que enseñar?
 *
 * Una lección "vacía" del importador puede traer `<p>&nbsp;</p>` en vez
 * de la cadena vacía, y eso pinta un hueco en blanco que parece un
 * fallo de carga.
 *
 * Ojo con medir esto quitando las etiquetas y mirando si queda texto:
 * 11 de los 98 quizzes con audio son SOLO el reproductor, sin una
 * palabra alrededor. Por texto darían vacío y su audio no se pintaría,
 * que es justo el fallo que veníamos a arreglar. Un iframe o una imagen
 * son contenido aunque no lleven texto.
 */
export function tieneContenido(html: string): boolean {
  if (/<(iframe|img|audio|video)\b/i.test(html)) return true;
  return html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim() !== "";
}
