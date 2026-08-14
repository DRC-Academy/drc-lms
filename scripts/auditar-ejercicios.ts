// ---------------------------------------------------------------
// AUDITORÍA DE LOS EJERCICIOS IMPORTADOS
//
// Recorre `ejercicios_leccion` y dice, uno a uno, cuáles no se pueden
// responder y cuáles se ven mal. No arregla nada:
//
//   node scripts/auditar-ejercicios.ts
//
// SOLO LEE LA BASE. Lo único que escribe es el informe, en
// `import/auditoria-ejercicios.json`. No hay modo `--escribir` porque no
// hay nada que escribir: lo que se decida arreglar se arregla en
// `importar-learndash.ts` y se vuelve a importar, o se toca a mano.
//
// SE AUDITA LA BASE, NO EL ZIP. El ZIP es lo que LearnDash tenía; la
// base es lo que el alumno abre esta tarde. Si el importador estropea
// algo por el camino, el problema está en la base y aquí sale; si algo
// venía ya roto de LearnDash y el importador lo dejó pasar, también.
// Las dos preguntas se responden mirando el resultado.
//
// ---------------------------------------------------------------
// QUIÉN DECIDE SI UN EJERCICIO SE PUEDE RESPONDER
//
// No este script. `indicesCorrectos` y `huecosAceptados` de
// `lib/ejercicios.ts` son las dos funciones con las que la pantalla lee
// `correcta`, y son las que se importan aquí. Escribir la comprobación
// aparte —"correcta es un array de números"— crearía una segunda
// opinión sobre el mismo JSONB, y el día que una de las dos cambiara
// este informe empezaría a mentir sin avisar.
//
// Así, "no se puede responder" significa exactamente "la pantalla no
// puede corregirlo", que es la única definición que le importa a nadie.
//
// Lo mismo con los emojis y `quitarEmojisDeEnunciado`: lo que cuenta
// como emoji lo decide `lib/leccion-html.ts`, con sus tres excepciones
// (✅ ❌ 🚫 se quedan porque enseñan). Aquí se le pasa el texto y se
// mira qué caracteres desaparecen.
//
// EL HUECO CONOCIDO DE ESE MÉTODO: `limpiarTexto` nunca devuelve vacío
// —una opción que es solo un emoji se conserva entera, a propósito, ver
// la nota allí—, así que esas no salen en el recuento de emojis. Son las
// menos y quitarlas costaría 8 ejercicios enteros, que es justo la
// decisión que ya se tomó.
//
// ---------------------------------------------------------------
// LOS DOS BLOQUES, Y POR QUÉ ESE ORDEN
//
//   1. NO SE PUEDE RESPONDER. El alumno se sienta delante y no hay
//      forma de acertar: no hay correcta, la correcta señala a una
//      opción que no existe, el hueco {{4}} no tiene dónde escribirse.
//      Esto no es feo, es que no funciona.
//
//   2. SE VE MAL. Etiquetas de WordPress en mitad de la frase, `&nbsp;`
//      literales, un enunciado de tres mil caracteres. El ejercicio
//      funciona; da vergüenza.
//
// Un mismo ejercicio puede estar en los dos, y entonces cuenta en el
// primero: se ordena por lo peor que le pasa.
//
// ---------------------------------------------------------------
// DOS COMPROBACIONES QUE MIRAN LO MISMO DESDE FUERA
//
// `single` con más de una correcta NO estaba en la lista del encargo,
// pero es del primer bloque y es demostrable: `elegir()` guarda una
// sola elección y `acertado()` exige `elegidas.length === suyas.length`,
// así que con dos correctas la comparación es 1 === 2 y el ejercicio no
// se puede acertar nunca. No es una opinión sobre el diseño, es una
// resta.
//
// Y la solución dentro del enunciado del cloze se busca por dos vías
// distintas, que se cuentan por separado porque valen distinto:
//
//   · `cloze_llaves_crudas`  → quedaron llaves de LearnDash en el
//     texto. Si traen algo dentro es la solución impresa, porque el
//     crudo lleva la respuesta entre llaves. Si están VACÍAS es otra
//     cosa y también sobra: el único caso de esta base es una
//     instrucción que ya no se cumple —"write your answers inside the
//     { }"— cuando ahora lo que hay son campos de texto. Las dos se
//     marcan y el detalle dice cuál es cuál.
//
//   · `cloze_respuesta_en_texto` → una de las respuestas aparece tal
//     cual en el texto que rodea a los huecos. ES UNA SOSPECHA, no un
//     hecho: hay cloze cuyo enunciado es a propósito un banco de
//     palabras ("Complete with: although, however, because"). Se marcan
//     para mirarlos, no para borrarlos a ciegas.
// ---------------------------------------------------------------

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { leerEnv } from "./learndash-zip.ts";
import { huecosAceptados, indicesCorrectos } from "../lib/ejercicios.ts";
import { quitarEmojisDeEnunciado } from "../lib/leccion-html.ts";

const RUTA_ENV = ".env.local";
const RUTA_SALIDA = "import/auditoria-ejercicios.json";

const PAGINA = 1000;

/** Menos de esto no es un enunciado, es un resto. */
const MINIMO_ENUNCIADO = 10;

/**
 * A partir de cuántos caracteres un enunciado deja de ser un enunciado.
 *
 * El cloze tiene su propio techo, mucho más alto, porque ahí el texto
 * que el alumno completa VA dentro del enunciado —los huecos están en
 * su sitio, ver `Huecos` en FlujoEjercicios— y hay lecciones de
 * dieciocho huecos que son legítimamente largas. Medir los dos con la
 * misma vara marcaría como sospechosos justo los que están bien.
 *
 * SON UN CABLE TRAMPA, NO UN PERCENTIL, y por eso están por encima de
 * lo que hay hoy: el más largo de esta base mide 595 (single) y 1.641
 * (cloze). Bajarlos hasta rozar esos máximos no encontraría nada roto,
 * porque los once enunciados de más de 300 caracteres son de
 * comprensión lectora —el párrafo ES la pregunta, y las opciones son
 * tres reescrituras de ese párrafo—; lo único que se conseguiría es
 * llenar el informe de ejercicios correctos.
 *
 * Lo que estos techos tienen que cazar es otra cosa: el día que una
 * reimportación arrastre media lección dentro de un enunciado, eso no
 * medirá 700, medirá varios miles. Si este contador da cero, es que no
 * ha pasado.
 */
const LARGO_NORMAL = 700;
const LARGO_CLOZE = 2500;

/**
 * Longitud mínima de una respuesta para buscarla dentro del enunciado
 * del cloze. Por debajo de esto todo son falsos positivos: "was", "in"
 * o "the" aparecen en cualquier frase en inglés.
 */
const MINIMO_RESPUESTA_BUSCABLE = 4;

// ---------------------------------------------------------------
// EL CATÁLOGO
//
// El orden de esta lista es el orden del informe y el del JSON. Primero
// lo que no se puede responder, y dentro de cada bloque de lo más roto
// a lo más leve.
// ---------------------------------------------------------------

type Gravedad = "no_responde" | "presentacion";

type Definicion = { codigo: string; gravedad: Gravedad; titulo: string };

const CATALOGO: Definicion[] = [
  // --- no se puede responder ---
  { codigo: "enunciado_vacio", gravedad: "no_responde", titulo: "Enunciado vacío" },
  { codigo: "enunciado_muy_corto", gravedad: "no_responde", titulo: `Enunciado de menos de ${MINIMO_ENUNCIADO} caracteres` },
  { codigo: "sin_correcta", gravedad: "no_responde", titulo: "Sin ninguna respuesta correcta marcada" },
  { codigo: "correcta_fuera_de_rango", gravedad: "no_responde", titulo: "La correcta apunta a una opción que no existe" },
  { codigo: "single_varias_correctas", gravedad: "no_responde", titulo: "single con más de una correcta (solo se puede elegir una)" },
  { codigo: "pocas_opciones", gravedad: "no_responde", titulo: "Menos de 2 opciones" },
  { codigo: "opcion_vacia", gravedad: "no_responde", titulo: "Alguna opción está vacía" },
  { codigo: "opciones_duplicadas", gravedad: "no_responde", titulo: "Opciones repetidas dentro del ejercicio" },
  { codigo: "multiple_todas_correctas", gravedad: "no_responde", titulo: "multiple con todas las opciones correctas" },
  { codigo: "cloze_sin_huecos", gravedad: "no_responde", titulo: "cloze sin ningún {{n}} en el enunciado" },
  { codigo: "cloze_huecos_no_cuadran", gravedad: "no_responde", titulo: "cloze: el número de huecos no cuadra con correcta" },
  { codigo: "cloze_huecos_salteados", gravedad: "no_responde", titulo: "cloze: huecos numerados con saltos" },
  { codigo: "cloze_huecos_repetidos", gravedad: "no_responde", titulo: "cloze: el mismo número de hueco repetido" },
  { codigo: "cloze_respuesta_vacia", gravedad: "no_responde", titulo: "cloze: algún hueco sin ninguna respuesta aceptada" },

  // --- se ve mal ---
  { codigo: "html_en_enunciado", gravedad: "presentacion", titulo: "HTML crudo de LearnDash en el enunciado" },
  { codigo: "html_en_opciones", gravedad: "presentacion", titulo: "HTML crudo en alguna opción" },
  { codigo: "emojis_o_control", gravedad: "presentacion", titulo: "Emojis o caracteres de control" },
  { codigo: "enunciado_larguisimo", gravedad: "presentacion", titulo: "Enunciado desproporcionado" },
  { codigo: "cloze_llaves_crudas", gravedad: "presentacion", titulo: "cloze con llaves de LearnDash en el texto" },
  { codigo: "cloze_respuesta_en_texto", gravedad: "presentacion", titulo: "cloze con una respuesta escrita en el enunciado (sospecha)" },
];

const PESO = new Map(CATALOGO.map((d, i) => [d.codigo, i]));
const GRAVEDAD_DE = new Map(CATALOGO.map((d) => [d.codigo, d.gravedad]));

// ---------------------------------------------------------------
// LECTURA DE LA BASE
// ---------------------------------------------------------------

type FilaEjercicio = {
  id: string;
  leccion_id: string;
  tipo: string;
  enunciado: string;
  opciones: unknown;
  correcta: unknown;
  explicacion: string | null;
  orden: number;
  learndash_id: number | null;
};

type FilaLeccion = { id: string; modulo_id: string; titulo: string; learndash_id: number | null };
type FilaModulo = { id: string; curso_id: string; titulo: string };
type FilaCurso = { id: string; titulo: string; nivel: string };

/**
 * PostgREST devuelve como mucho 1000 filas por consulta y los
 * ejercicios pasan de mil largamente. Sin paginar, la auditoría daría
 * por limpios los que no llegó a mirar, que es la peor forma posible de
 * fallar en un informe.
 */
async function leerTodo<T>(cliente: SupabaseClient, tabla: string, columnas: string): Promise<T[]> {
  const salida: T[] = [];

  for (let desde = 0; ; desde += PAGINA) {
    const { data, error } = await cliente
      .from(tabla)
      .select(columnas)
      .range(desde, desde + PAGINA - 1)
      .returns<T[]>();

    if (error) throw new Error(`${tabla}: ${error.message}`);

    const trozo = data ?? [];
    salida.push(...trozo);
    if (trozo.length < PAGINA) return salida;
  }
}

// ---------------------------------------------------------------
// HERRAMIENTAS DE TEXTO
// ---------------------------------------------------------------

const cadena = (v: unknown): string => (typeof v === "string" ? v : "");

/** Las opciones tal cual están en el JSONB, sin suponer que son texto. */
function leerOpciones(valor: unknown): string[] {
  if (!Array.isArray(valor)) return [];
  return valor.map((v) => (typeof v === "string" ? v : v === null || v === undefined ? "" : String(v)));
}

/** Para comparar dos opciones: lo que el alumno ve, no los bytes. */
const normalizarOpcion = (t: string): string => t.replace(/\s+/g, " ").trim().toLowerCase();

/**
 * Las marcas de HTML que se buscan, de la más concreta a la más
 * general. Se devuelven TODAS las que casan, no la primera: saber que
 * un enunciado trae `<span style>` Y `&nbsp;` Y atributos de WordPress
 * es lo que dice si el arreglo es una regla o son tres.
 *
 * Las etiquetas se buscan exigiendo `<letra …>`, no un `<` suelto: en
 * un curso de inglés hay enunciados con "a < b" y con "3 <5", y marcar
 * esos como HTML sería inventarse el problema.
 */
const MARCAS_HTML: { clave: string; re: RegExp }[] = [
  { clave: "<span style=…>", re: /<span\b[^>]*\sstyle\s*=/i },
  { clave: "<p>", re: /<\/?p\b[^>]*>/i },
  { clave: "<br>", re: /<br\b[^>]*>/i },
  { clave: "&nbsp;", re: /&nbsp;/i },
  { clave: "atributos de WordPress", re: /\s(?:class|id|data-[a-z0-9-]+|style)\s*=\s*["']/i },
  { clave: "shortcode de WordPress", re: /\[\/?[a-z][a-z0-9_-]*(?:\s[^\]]*)?\]/i },
  { clave: "otras etiquetas", re: /<\/?[a-z][a-z0-9]*\b[^>]*>/i },
  { clave: "entidades sin convertir", re: /&(?:[a-z]{2,10}|#\d{2,5}|#x[0-9a-f]{2,4});/i },
];

function marcasHtml(texto: string): string[] {
  return MARCAS_HTML.filter((m) => m.re.test(texto)).map((m) => m.clave);
}

/** Caracteres que no deberían viajar en un texto que se pinta. */
const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;
const INVISIBLES = /[\u200B\u200C\u2060\uFEFF]/;
const MOJIBAKE = /\uFFFD/;

/**
 * Qué caracteres desaparecerían si a este texto le pasara el mismo
 * limpiador que usa el importador. Lo que se va son emojis: el
 * inventario de qué lo es vive en `lib/leccion-html.ts` y no se copia
 * aquí. Los espacios no cuentan —ese limpiador también recoge espacios
 * dobles y eso no es un emoji— así que se comparan solo los caracteres
 * visibles.
 *
 * EL ACOLCHADO CON "x" NO ES UN APAÑO, ES LA COMPROBACIÓN.
 * `limpiarTexto` nunca devuelve vacío: si al quitar los emojis no queda
 * nada, devuelve el texto original entero. Es a propósito —una opción
 * que es solo un emoji, si se vacía, deja el ejercicio con menos de dos
 * opciones y el importador lo tira— pero significa que preguntarle "¿te
 * sobra algo?" a un texto que ES un emoji devuelve que no.
 *
 * Y es justo el caso que hay aquí: los 8 ejercicios con emoji de esta
 * base son ejercicios de emparejar sitios (🏥 🏫 🏦 ⛽) donde cada
 * opción es un icono y nada más. Sin acolchar, el recuento daba cero y
 * el informe decía que no quedaba ni un emoji, que es mentira. Con una
 * letra a cada lado, el limpiador ya tiene algo que conservar y
 * contesta lo que de verdad quita.
 */
function emojisQueQuedan(texto: string): string[] {
  const antes = "x" + texto + "x";
  const limpio = quitarEmojisDeEnunciado(antes);
  if (limpio === antes) return [];

  const cuenta = new Map<string, number>();
  for (const c of Array.from(antes)) {
    if (/\s/.test(c)) continue;
    cuenta.set(c, (cuenta.get(c) ?? 0) + 1);
  }
  for (const c of Array.from(limpio)) {
    if (/\s/.test(c)) continue;
    const n = cuenta.get(c);
    if (n !== undefined) cuenta.set(c, n - 1);
  }

  return Array.from(cuenta.entries())
    .filter(([, n]) => n > 0)
    .map(([c]) => c);
}

/** Para meter una respuesta dentro de una expresión regular. */
const escapar = (t: string): string => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Quita del enunciado de un cloze los sitios donde la respuesta ESTÁ
 * ESCRITA A PROPÓSITO, que en este material son dos:
 *
 *   · el banco de palabras — "Word Box: (turn left – go straight)",
 *     "Choose the correct phrase: because, so, that's why". El alumno
 *     tiene que elegir de una lista; que la lista contenga la solución
 *     es el ejercicio, no un fallo.
 *
 *   · la lista de opciones debajo de cada frase — "a) works b) worked
 *     c) work", con o sin viñeta, en su línea o seguidas. Es un test de
 *     elección múltiple presentado como hueco.
 *
 * SIN ESTO EL AVISO NO SIRVE PARA NADA: en bruto marcaba 118 de los 183
 * cloze, el 64%, y al mirarlos uno por uno casi todos eran esto. Un
 * aviso que salta dos de cada tres veces no se lee. Descontando las dos
 * formas quedan 29, y esos sí se pueden repasar a mano.
 *
 * Aun así siguen siendo SOSPECHAS: quedan bancos escritos de maneras
 * que esto no reconoce ("Opinion phrases: I think In my opinion I
 * believe", sin comas ni guiones). Por eso el problema es de
 * presentación y no de los que no se pueden responder.
 */
function sinBancoNiListas(texto: string): string {
  const sinBanco = texto
    // "Word Box: …", "Word bank: …", "Box: …" hasta el fin de la línea.
    .replace(/\b(?:word\s*(?:box|bank|list)|box|banco)\s*:?[^\n]*/gi, " ")
    // Un paréntesis con separadores dentro: "(a – b – c)", "(x, y, z)".
    .replace(/\([^)]*[–—|/][^)]*\)/g, " ")
    .replace(/\([^)]*,[^)]*,[^)]*\)/g, " ")
    // "…con la palabra correcta: What, Where, Who, How." Tres o más
    // elementos separados por comas detrás de dos puntos.
    .replace(/:\s*[^\n:]+,[^\n:]+,[^\n:]+$/gim, ": ");

  return sinBanco
    .split("\n")
    .map((linea) => {
      // Una línea que ES una opción: "a) work", "• b) worked".
      if (/^\s*(?:[•\-*·]\s*)?[a-hA-H][).]\s/.test(linea)) return "";
      // O varias seguidas en la misma línea: se corta desde la primera.
      const marcas = Array.from(linea.matchAll(/(?:^|\s)[a-hA-H][).]\s/g));
      if (marcas.length >= 2) return linea.slice(0, marcas[0].index);
      return linea;
    })
    .join("\n");
}

// ---------------------------------------------------------------
// LAS COMPROBACIONES
// ---------------------------------------------------------------

type Problema = { codigo: string; detalle: string };

/**
 * Todo lo que le pasa a un ejercicio. Se devuelven todos los problemas,
 * no el primero: un enunciado puede estar vacío Y traer HTML, y arreglar
 * solo lo primero que salta obliga a volver a pasar el informe.
 */
function revisar(e: FilaEjercicio): Problema[] {
  const problemas: Problema[] = [];
  const anotar = (codigo: string, detalle: string) => problemas.push({ codigo, detalle });

  const enunciado = cadena(e.enunciado);
  const opciones = leerOpciones(e.opciones);
  const esEssay = e.tipo === "essay";

  // --- el enunciado, que lo tienen los cuatro tipos ---
  const sinEspacios = enunciado.trim();
  if (sinEspacios === "") {
    anotar("enunciado_vacio", "el enunciado no tiene texto");
  } else if (sinEspacios.length < MINIMO_ENUNCIADO) {
    anotar("enunciado_muy_corto", `${sinEspacios.length} caracteres: "${sinEspacios}"`);
  }

  const techo = e.tipo === "cloze" ? LARGO_CLOZE : LARGO_NORMAL;
  if (enunciado.length > techo) {
    anotar("enunciado_larguisimo", `${enunciado.length} caracteres (el techo de un ${e.tipo} es ${techo})`);
  }

  const htmlEnunciado = marcasHtml(enunciado);
  if (htmlEnunciado.length > 0) anotar("html_en_enunciado", htmlEnunciado.join(", "));

  // --- las opciones ---
  if (!esEssay && e.tipo !== "cloze") {
    if (opciones.length < 2) {
      anotar("pocas_opciones", `${opciones.length} opción(es)`);
    }

    const vacias = opciones.filter((o) => o.trim() === "").length;
    if (vacias > 0) anotar("opcion_vacia", `${vacias} de ${opciones.length} sin texto`);

    const vistas = new Map<string, number>();
    for (const o of opciones) {
      const clave = normalizarOpcion(o);
      if (clave === "") continue;
      vistas.set(clave, (vistas.get(clave) ?? 0) + 1);
    }
    const repetidas = Array.from(vistas.entries()).filter(([, n]) => n > 1);
    if (repetidas.length > 0) {
      anotar(
        "opciones_duplicadas",
        repetidas.map(([t, n]) => `"${recortar(t, 40)}" ×${n}`).join("; ")
      );
    }
  }

  const htmlOpciones = new Set<string>();
  for (const o of opciones) for (const m of marcasHtml(o)) htmlOpciones.add(m);
  if (htmlOpciones.size > 0) anotar("html_en_opciones", Array.from(htmlOpciones).join(", "));

  // --- emojis y caracteres raros, en todo lo que se pinta ---
  const pintado = [enunciado, ...opciones];
  const emojis = new Set<string>();
  for (const t of pintado) for (const c of emojisQueQuedan(t)) emojis.add(c);

  const rarezas: string[] = [];
  if (emojis.size > 0) rarezas.push(`emojis: ${Array.from(emojis).join(" ")}`);
  if (pintado.some((t) => CONTROL.test(t))) rarezas.push("caracteres de control");
  if (pintado.some((t) => INVISIBLES.test(t))) rarezas.push("caracteres invisibles");
  if (pintado.some((t) => MOJIBAKE.test(t))) rarezas.push("U+FFFD (texto mal decodificado)");
  if (rarezas.length > 0) anotar("emojis_o_control", rarezas.join("; "));

  // --- la respuesta ---
  // Los essay no tienen y es correcto: `correcta` va NULL por diseño y
  // el esquema lo obliga. No se les pregunta por ella.
  if (esEssay) return problemas;

  if (e.tipo === "cloze") {
    revisarCloze(e, enunciado, anotar);
    return problemas;
  }

  const correctas = indicesCorrectos(e.correcta);

  if (correctas.length === 0) {
    anotar("sin_correcta", `correcta = ${JSON.stringify(e.correcta)}`);
  } else {
    const fuera = correctas.filter((i) => i < 0 || i >= opciones.length);
    if (fuera.length > 0) {
      anotar(
        "correcta_fuera_de_rango",
        `índice(s) ${fuera.join(", ")} sobre ${opciones.length} opciones`
      );
    }

    if (e.tipo === "single" && correctas.length > 1) {
      anotar("single_varias_correctas", `${correctas.length} correctas: ${correctas.join(", ")}`);
    }

    if (e.tipo === "multiple" && opciones.length > 0 && correctas.length >= opciones.length) {
      anotar("multiple_todas_correctas", `${correctas.length} correctas de ${opciones.length} opciones`);
    }
  }

  return problemas;
}

/**
 * El cloze, que es donde `correcta` y el enunciado tienen que encajar
 * pieza a pieza.
 *
 * La pantalla parte el enunciado por los `{{n}}` y usa ese n − 1 para
 * entrar en `correcta`. Todo lo que rompa esa correspondencia deja un
 * campo que no se puede corregir, y ahí el alumno escribe y no pasa
 * nada: ni verde, ni rojo, ni avanzar.
 */
function revisarCloze(
  e: FilaEjercicio,
  enunciado: string,
  anotar: (codigo: string, detalle: string) => void
): void {
  const aceptados = huecosAceptados(e.correcta);

  const numeros = Array.from(enunciado.matchAll(/\{\{(\d+)\}\}/g), (m: RegExpMatchArray) => Number(m[1]));

  if (numeros.length === 0) {
    anotar("cloze_sin_huecos", `correcta trae ${aceptados.length} respuesta(s) y no hay dónde escribirlas`);
  } else {
    const unicos = Array.from(new Set(numeros)).sort((a, b) => a - b);

    const repetidos = unicos.filter((n) => numeros.filter((x) => x === n).length > 1);
    if (repetidos.length > 0) {
      anotar("cloze_huecos_repetidos", `{{${repetidos.join("}}, {{")}}} aparece(n) más de una vez`);
    }

    const salteados = unicos.filter((n, i) => n !== i + 1);
    if (salteados.length > 0) {
      anotar(
        "cloze_huecos_salteados",
        `numerados ${unicos.join(", ")} en vez de 1..${unicos.length}`
      );
    }

    // El que manda es el número más alto, no cuántos hay: con {{1}} y
    // {{5}} la pantalla busca `correcta[4]`.
    const necesarios = Math.max(...unicos);
    if (necesarios !== aceptados.length) {
      anotar(
        "cloze_huecos_no_cuadran",
        `el enunciado necesita ${necesarios} y correcta trae ${aceptados.length}`
      );
    }
  }

  const vacios = aceptados
    .map((h, i) => ({ i, vale: h.some((r) => r.trim() !== "") }))
    .filter((h) => !h.vale)
    .map((h) => h.i + 1);
  if (vacios.length > 0) {
    anotar("cloze_respuesta_vacia", `hueco(s) ${vacios.join(", ")} sin respuesta aceptada`);
  }

  // --- la solución a la vista ---
  const texto = enunciado.replace(/\{\{\d+\}\}/g, " ");

  const llaves = Array.from(texto.matchAll(/\{[^{}]*\}/g), (m: RegExpMatchArray) => m[0]);
  if (llaves.length > 0) {
    anotar("cloze_llaves_crudas", llaves.slice(0, 3).map((l) => recortar(l, 40)).join(", "));
  }

  const delatadas = new Set<string>();
  const dondeBuscar = sinBancoNiListas(texto);
  for (const hueco of aceptados) {
    for (const respuesta of hueco) {
      const limpia = respuesta.trim();
      if (limpia.length < MINIMO_RESPUESTA_BUSCABLE) continue;
      if (/^\d+$/.test(limpia)) continue;
      // Se busca la palabra entera: "her" no puede dar positivo dentro
      // de "there". `\b` de JavaScript corta también en los acentos, así
      // que la frontera se escribe a mano, y sin el flag `u` —la misma
      // razón que en `lib/leccion-html.ts`: el tsconfig no fija `target`.
      const re = new RegExp(`(^|[^A-Za-zÀ-ÿ0-9])${escapar(limpia)}($|[^A-Za-zÀ-ÿ0-9])`, "i");
      if (re.test(dondeBuscar)) delatadas.add(limpia);
    }
  }
  if (delatadas.size > 0) {
    anotar(
      "cloze_respuesta_en_texto",
      Array.from(delatadas).slice(0, 5).map((r) => `"${r}"`).join(", ")
    );
  }
}

const recortar = (t: string, n: number): string => (t.length <= n ? t : t.slice(0, n - 1) + "…");

// ---------------------------------------------------------------
// EL INFORME
// ---------------------------------------------------------------

type Auditado = {
  gravedad: Gravedad;
  problemas: Problema[];
  learndash_id: number | null;
  curso: string;
  modulo: string;
  leccion: string;
  ejercicio: {
    id: string;
    tipo: string;
    orden: number;
    enunciado: string;
    opciones: string[];
    correcta: unknown;
    explicacion: string | null;
  };
};

function ordenar(a: Auditado, b: Auditado): number {
  if (a.gravedad !== b.gravedad) return a.gravedad === "no_responde" ? -1 : 1;

  const peor = (x: Auditado) => Math.min(...x.problemas.map((p) => PESO.get(p.codigo) ?? 999));
  const da = peor(a) - peor(b);
  if (da !== 0) return da;

  if (b.problemas.length !== a.problemas.length) return b.problemas.length - a.problemas.length;
  if (a.curso !== b.curso) return a.curso < b.curso ? -1 : 1;
  if (a.leccion !== b.leccion) return a.leccion < b.leccion ? -1 : 1;
  return a.ejercicio.orden - b.ejercicio.orden;
}

async function principal(): Promise<void> {
  console.log("");
  console.log("AUDITORÍA DE EJERCICIOS — solo lectura, no se modifica nada");
  console.log("");

  const env = leerEnv(RUTA_ENV);
  const url = env.LMS_SUPABASE_URL;
  const clave = env.LMS_SUPABASE_SERVICE_KEY;
  if (!url || !clave) throw new Error(`Faltan LMS_SUPABASE_URL o LMS_SUPABASE_SERVICE_KEY en ${RUTA_ENV}`);

  const lms = createClient(url, clave, {
    auth: { persistSession: false, autoRefreshToken: false },
    db: { schema: "public" },
  });

  const ejercicios = await leerTodo<FilaEjercicio>(
    lms,
    "ejercicios_leccion",
    "id, leccion_id, tipo, enunciado, opciones, correcta, explicacion, orden, learndash_id"
  );
  const lecciones = await leerTodo<FilaLeccion>(lms, "lecciones", "id, modulo_id, titulo, learndash_id");
  const modulos = await leerTodo<FilaModulo>(lms, "modulos", "id, curso_id, titulo");
  const cursos = await leerTodo<FilaCurso>(lms, "cursos", "id, titulo, nivel");

  const leccionPorId = new Map(lecciones.map((l) => [l.id, l]));
  const moduloPorId = new Map(modulos.map((m) => [m.id, m]));
  const cursoPorId = new Map(cursos.map((c) => [c.id, c]));

  // --- pasada ---
  const conProblemas: Auditado[] = [];
  const porTipo = new Map<string, number>();
  const recuento = new Map<string, number>();
  const largos: { largo: number; tipo: string; id: number | null }[] = [];

  for (const e of ejercicios) {
    porTipo.set(e.tipo, (porTipo.get(e.tipo) ?? 0) + 1);
    largos.push({ largo: cadena(e.enunciado).length, tipo: e.tipo, id: e.learndash_id });

    const problemas = revisar(e);
    if (problemas.length === 0) continue;

    for (const p of problemas) recuento.set(p.codigo, (recuento.get(p.codigo) ?? 0) + 1);

    const leccion = leccionPorId.get(e.leccion_id);
    const modulo = leccion ? moduloPorId.get(leccion.modulo_id) : undefined;
    const curso = modulo ? cursoPorId.get(modulo.curso_id) : undefined;

    conProblemas.push({
      gravedad: problemas.some((p) => GRAVEDAD_DE.get(p.codigo) === "no_responde")
        ? "no_responde"
        : "presentacion",
      problemas,
      learndash_id: e.learndash_id,
      curso: curso ? `${curso.nivel} · ${curso.titulo}` : "(sin curso)",
      modulo: modulo ? modulo.titulo : "(sin módulo)",
      leccion: leccion ? leccion.titulo : "(sin lección)",
      ejercicio: {
        id: e.id,
        tipo: e.tipo,
        orden: e.orden,
        enunciado: cadena(e.enunciado),
        opciones: leerOpciones(e.opciones),
        correcta: e.correcta,
        explicacion: e.explicacion,
      },
    });
  }

  conProblemas.sort(ordenar);

  const rotos = conProblemas.filter((x) => x.gravedad === "no_responde");
  const feos = conProblemas.filter((x) => x.gravedad === "presentacion");

  // --- por consola ---
  console.log(`  ejercicios en la base : ${ejercicios.length}`);
  console.log(
    "  por tipo             : " +
      Array.from(porTipo.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([k, v]) => `${k}=${v}`)
        .join(", ")
  );
  console.log(`  sin un solo problema : ${ejercicios.length - conProblemas.length}`);
  console.log("");

  const bloque = (gravedad: Gravedad, titulo: string, explicacion: string, afectados: number) => {
    console.log(`=== ${titulo}: ${afectados} ejercicios ===`);
    console.log(`  ${explicacion}`);
    console.log("");
    for (const d of CATALOGO.filter((x) => x.gravedad === gravedad)) {
      const n = recuento.get(d.codigo) ?? 0;
      if (n === 0) continue;
      console.log(`    ${String(n).padStart(5)}  ${d.titulo}`);
    }
    const ninguno = CATALOGO.filter((x) => x.gravedad === gravedad && (recuento.get(x.codigo) ?? 0) === 0);
    if (ninguno.length > 0) {
      console.log("");
      console.log(`        sin un solo caso: ${ninguno.map((x) => x.codigo).join(", ")}`);
    }
    console.log("");
  };

  bloque(
    "no_responde",
    "NO SE PUEDEN RESPONDER",
    "El alumno no tiene forma de acertar. Los recuentos suman más que el total: un ejercicio puede tener varios.",
    rotos.length
  );
  // UN ENUNCIADO CORTO NO ES UN ENUNCIADO ROTO, Y CONVIENE DECIRLO
  // AQUÍ. El corte en 10 caracteres es una regla razonable que en este
  // material atrapa sobre todo tablas de práctica: el enunciado es
  // "1,250" y las opciones son las formas de decirlo en inglés, o es
  // "Go" y hay que dar el pasado. Se cuentan igual, pero el que lea el
  // informe tiene que saber que la mayoría se responden perfectamente.
  const cortos = rotos.filter((x) => x.problemas.some((p) => p.codigo === "enunciado_muy_corto"));
  const cortosSanos = cortos.filter((x) =>
    x.problemas.every((p) => p.codigo === "enunciado_muy_corto" || GRAVEDAD_DE.get(p.codigo) === "presentacion")
  );
  if (cortos.length > 0) {
    console.log(`    de los ${cortos.length} enunciados cortos, ${cortosSanos.length} no tienen ningún otro`);
    console.log("    problema: enunciado corto y opciones sanas se responde igual. Míralos");
    console.log("    en el detalle antes de darlos por rotos.");
    console.log("");
  }

  bloque(
    "presentacion",
    "SE VEN MAL",
    "Funcionan, pero se leen como salieron de WordPress.",
    feos.length
  );

  // --- de qué tamaño son los enunciados, para poder discutir el techo ---
  console.log("=== TAMAÑO DE LOS ENUNCIADOS ===");
  console.log("  Los techos de este informe son una decisión, no una medida. Aquí está");
  console.log("  la distribución por si hay que moverlos.");
  console.log("");
  for (const tipo of Array.from(porTipo.keys()).sort()) {
    const suyos = largos.filter((l) => l.tipo === tipo).map((l) => l.largo).sort((a, b) => a - b);
    if (suyos.length === 0) continue;
    const p = (q: number) => suyos[Math.min(suyos.length - 1, Math.floor(suyos.length * q))];
    console.log(
      `    ${tipo.padEnd(9)} mediana ${String(p(0.5)).padStart(5)}   p90 ${String(p(0.9)).padStart(5)}` +
        `   p99 ${String(p(0.99)).padStart(5)}   máximo ${String(suyos[suyos.length - 1]).padStart(6)}`
    );
  }
  console.log("");

  const masLargos = largos.slice().sort((a, b) => b.largo - a.largo).slice(0, 10);
  console.log("  los diez más largos (learndash_id, tipo, caracteres):");
  for (const l of masLargos) {
    console.log(`    ${String(l.id ?? "—").padStart(8)}  ${l.tipo.padEnd(9)} ${String(l.largo).padStart(6)}`);
  }
  console.log("");

  // --- dónde se concentra lo roto ---
  if (rotos.length > 0) {
    const porCurso = new Map<string, number>();
    for (const r of rotos) porCurso.set(r.curso, (porCurso.get(r.curso) ?? 0) + 1);
    console.log("=== DÓNDE ESTÁN LOS QUE NO SE PUEDEN RESPONDER ===");
    for (const [curso, n] of Array.from(porCurso.entries()).sort((a, b) => b[1] - a[1])) {
      console.log(`    ${String(n).padStart(5)}  ${curso}`);
    }
    console.log("");
  }

  // --- el archivo ---
  const informe = {
    generado_en: new Date().toISOString(),
    fuente: "ejercicios_leccion (base del LMS), leída con las mismas funciones que la pantalla",
    total_ejercicios: ejercicios.length,
    sin_problemas: ejercicios.length - conProblemas.length,
    no_responden: rotos.length,
    se_ven_mal: feos.length,
    recuento: CATALOGO.map((d) => ({
      codigo: d.codigo,
      gravedad: d.gravedad,
      titulo: d.titulo,
      ejercicios: recuento.get(d.codigo) ?? 0,
    })),
    ejercicios: conProblemas,
  };

  mkdirSync(dirname(RUTA_SALIDA), { recursive: true });
  writeFileSync(RUTA_SALIDA, JSON.stringify(informe, null, 2), "utf8");

  console.log(`Detalle de los ${conProblemas.length} ejercicios con algo: ${RUTA_SALIDA}`);
  console.log("Primero los que no se pueden responder. No se ha tocado la base.");
  console.log("");
}

principal().catch((error: unknown) => {
  console.error("");
  console.error("FALLÓ: " + (error instanceof Error ? error.message : String(error)));
  process.exitCode = 1;
});
