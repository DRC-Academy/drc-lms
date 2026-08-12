// ---------------------------------------------------------------
// IMPORTADOR DE LEARNDASH
//
// Vuelca el export de LearnDash a las tablas de `supabase/lms-cursos.sql`.
// Se ejecuta a mano, no forma parte del build ni de ninguna ruta.
//
//   node scripts/importar-learndash.ts              → ensayo, no escribe
//   node scripts/importar-learndash.ts --escribir   → escribe de verdad
//
// El ensayo es el modo POR DEFECTO a propósito: parsea todo, resuelve el
// árbol y da el resumen completo sin tocar la base. Así se puede
// comprobar qué va a entrar antes de que entre.
//
// Node 24 ejecuta TypeScript directamente quitando los tipos, así que no
// hace falta ni compilar ni un runner. A cambio, este archivo solo puede
// usar sintaxis borrable: nada de `enum`, `namespace` ni propiedades de
// parámetro en constructores.
//
// SIN DEPENDENCIAS NUEVAS. El ZIP se lee con `node:zlib`, que trae Node:
// un ZIP es un directorio central y una ristra de deflate crudo, y son
// setenta líneas. Añadir un paquete al package.json de la aplicación
// para un script que se ejecuta tres veces en la vida no compensa.
//
// IDEMPOTENTE: todo entra por `upsert` con `learndash_id` como clave de
// conflicto, así que correrlo dos veces no duplica nada.
//
// EL MULTIMEDIA NO ESTÁ DONDE PARECE. Ninguna de las dos cosas viaja en
// el `post_content` del topic, que es lo único que se leía antes:
//
//   vídeo → meta del topic, `sfwd-topic_lesson_video_url`  (ver `videoDe`)
//   audio → `post_content` del QUIZ, iframe de Podbean     (ver `contenidoDeQuiz`)
//
// Buscarlos en el HTML de los topics da 7 y 0. Son 161 y 100.
//
// NO IMPORTA PROGRESO. Solo contenido. El progreso de los alumnos es
// otro paso y necesita resolver `user_id` de WordPress → `alumno_id` de
// Gestión, empezando por `alumno_vinculos.woo_user_id`.
// ---------------------------------------------------------------

import { readFileSync } from "node:fs";
import { inflateRawSync } from "node:zlib";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const RUTA_ZIP = "import/learndash-export-20260811-6a7b8548cf750.zip";
const RUTA_ENV = ".env.local";

/** El curso de pruebas del export: 1 módulo, 2 lecciones. No entra. */
const TITULO_EXCLUIDO = "Curso Test";

/** Tamaño de tanda para las escrituras. */
const TANDA = 400;

// ---------------------------------------------------------------
// LECTOR DE ZIP
// ---------------------------------------------------------------

type Zip = Map<string, () => Buffer>;

const FIRMA_EOCD = 0x06054b50;
const FIRMA_CENTRAL = 0x02014b50;

function abrirZip(ruta: string): Zip {
  const buf = readFileSync(ruta);

  // El fin del directorio central está al final, detrás de un comentario
  // de longitud variable: hay que buscarlo hacia atrás.
  let eocd = -1;
  for (let i = buf.length - 22; i >= 0 && i > buf.length - 22 - 65536; i--) {
    if (buf.readUInt32LE(i) === FIRMA_EOCD) {
      eocd = i;
      break;
    }
  }
  if (eocd === -1) throw new Error("ZIP corrupto: no se encontró el directorio central");

  const total = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  if (p === 0xffffffff) throw new Error("ZIP64 no soportado por este lector");

  const entradas: Zip = new Map();

  for (let n = 0; n < total; n++) {
    if (buf.readUInt32LE(p) !== FIRMA_CENTRAL) throw new Error(`ZIP corrupto en la entrada ${n}`);

    const metodo = buf.readUInt16LE(p + 10);
    const comprimido = buf.readUInt32LE(p + 20);
    const nombreLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const comentLen = buf.readUInt16LE(p + 32);
    const offsetLocal = buf.readUInt32LE(p + 42);
    const nombre = buf.toString("utf8", p + 46, p + 46 + nombreLen);

    entradas.set(nombre, () => {
      // La cabecera local tiene su propio campo `extra`, que NO tiene por
      // qué medir lo mismo que el del directorio central. Leerlo del
      // sitio equivocado desplaza el inicio de los datos.
      const nl = buf.readUInt16LE(offsetLocal + 26);
      const el = buf.readUInt16LE(offsetLocal + 28);
      const inicio = offsetLocal + 30 + nl + el;
      const crudo = buf.subarray(inicio, inicio + comprimido);
      return metodo === 0 ? Buffer.from(crudo) : inflateRawSync(crudo);
    });

    p += 46 + nombreLen + extraLen + comentLen;
  }

  return entradas;
}

// ---------------------------------------------------------------
// LECTURA DEL EXPORT
// ---------------------------------------------------------------

type Registro = Record<string, unknown>;

/** Cada `.ld` es JSONL: un objeto por línea, no un array. */
function leerJsonl(zip: Zip, archivo: string): Registro[] {
  const leer = zip.get(archivo);
  if (!leer) throw new Error(`Falta ${archivo} en el ZIP`);

  const salida: Registro[] = [];
  const lineas = leer().toString("utf8").split(/\r?\n/);

  for (const linea of lineas) {
    if (linea.trim() === "") continue;
    try {
      salida.push(JSON.parse(linea) as Registro);
    } catch {
      // Una línea ilegible no puede tirar el import entero.
      console.warn(`  aviso: línea no parseable en ${archivo}`);
    }
  }

  return salida;
}

const wpPost = (r: Registro): Registro => (r.wp_post ?? {}) as Registro;
const wpMeta = (r: Registro): Registro => (r.wp_post_meta ?? {}) as Registro;

const texto = (v: unknown): string => (typeof v === "string" ? v : "");
const entero = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/**
 * Las metas de WordPress llegan como array de un elemento, y ese
 * elemento puede ser una cadena o un objeto ya parseado. `ld_course_steps`
 * y `_sfwd-*` son objetos; tratarlos como cadena los convierte en
 * "[object Object]" y se pierde el árbol entero.
 */
function metaObjeto(meta: Registro, clave: string): Registro | null {
  const valor = meta[clave];
  const primero = Array.isArray(valor) ? valor[0] : valor;
  return primero !== null && typeof primero === "object" ? (primero as Registro) : null;
}

/**
 * EL VÍDEO NO ESTÁ EN EL HTML, ESTÁ EN LA META
 *
 * Buscar YouTube dentro de `post_content` da 7 topics y engaña: los 7
 * son menciones en prosa ("use podcasts, movies and YouTube videos"),
 * ni una sola incrustación. El vídeo de verdad son 160 topics + 1
 * módulo, y vive en
 *
 *   _sfwd-topic[0].sfwd-topic_lesson_video_url
 *
 * —sí, `sfwd-topic_LESSON_video_url`, con el nombre de las lecciones
 * dentro de la meta de los topics; es de LearnDash, no una errata.
 *
 * Y esos 160 topics tienen `post_content` VACÍO: son topics que son un
 * vídeo y nada más. Por eso este campo no es un adorno, es lo único que
 * los distingue de un topic en blanco.
 *
 * Se lee cualquier clave que acabe en `_video_url` para no depender del
 * prefijo. No se mira `_video_enabled`: en el export los dos conjuntos
 * son exactamente los mismos 161, así que filtrar por él no quita nada
 * y sí puede tirar un vídeo si algún día se desincronizan.
 */
function videoDe(registro: Registro): string | null {
  for (const clave of ["_sfwd-topic", "_sfwd-lessons"]) {
    const bloque = metaObjeto(wpMeta(registro), clave);
    if (!bloque) continue;

    for (const [campo, valor] of Object.entries(bloque)) {
      if (!campo.endsWith("_video_url")) continue;
      const url = texto(valor).trim();
      if (url !== "") return url;
    }
  }
  return null;
}

// ---------------------------------------------------------------
// NIVEL, TIPO Y EXAMEN A PARTIR DEL TÍTULO
//
// Los patrones son deliberadamente los mismos que `PATRONES_EXAMEN` en
// lib/perfil.ts. No se importa aquel módulo porque usa el alias `@/`,
// que resuelve TypeScript pero no Node al ejecutar el script.
// ---------------------------------------------------------------

type Nivel = "A2" | "B1" | "B2" | "C1";
type TipoCurso = "general" | "examen";
type Examen = "b2_first" | "b1_preliminary" | "c1_advanced" | "ielts";

type Clasificacion = { nivel: Nivel; tipo: TipoCurso; examen: Examen | null };

function clasificar(titulo: string): Clasificacion | null {
  const t = titulo.toLowerCase();

  if (/\bcae\b/.test(t) || /\badvanced\b/.test(t)) {
    return { nivel: "C1", tipo: "examen", examen: "c1_advanced" };
  }
  if (/\bfce\b/.test(t) || /\bfirst\b/.test(t)) {
    return { nivel: "B2", tipo: "examen", examen: "b2_first" };
  }
  if (/\bpet\b/.test(t) || /\bpreliminary\b/.test(t)) {
    return { nivel: "B1", tipo: "examen", examen: "b1_preliminary" };
  }
  if (/\bielts\b/.test(t)) {
    return { nivel: "C1", tipo: "examen", examen: "ielts" };
  }

  const nivel = /\bc1\b/.test(t) ? "C1" : /\bb2\b/.test(t) ? "B2" : /\bb1\b/.test(t) ? "B1" : /\ba2\b/.test(t) ? "A2" : null;
  if (!nivel) return null;

  return { nivel, tipo: "general", examen: null };
}

function comoSlug(titulo: string): string {
  return titulo
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

// ---------------------------------------------------------------
// QUIZZES
// ---------------------------------------------------------------

/**
 * `proquiz_data` es `WPQ00.2900004` + base64 de un JSON limpio. No es
 * PHP serializado, que es lo que suele traer WP Pro Quiz.
 */
function decodificarProquiz(valor: string): unknown {
  const sinCabecera = valor.replace(/^WPQ\d+\.\d+/, "");
  return JSON.parse(Buffer.from(sinCabecera, "base64").toString("utf8"));
}

type Pregunta = {
  enunciado: string;
  tipo: "single" | "multiple" | "cloze" | "essay";
  opciones: string[];
  correcta: unknown;
  explicacion: string | null;
  learndashId: number | null;
};

const TIPOS: Record<string, Pregunta["tipo"]> = {
  single: "single",
  multiple: "multiple",
  cloze_answer: "cloze",
  essay: "essay",
  free_answer: "essay",
};

/**
 * Igual que `limpiarHtml`, pero conservando los saltos de párrafo. Los
 * cloze son varias frases, una por línea, y aplanarlas a un solo
 * renglón las vuelve ilegibles.
 */
function limpiarHtmlConSaltos(html: string): string {
  return html
    .replace(/<\/p>|<br\s*\/?>|<\/div>|<\/li>/gi, "\n")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .split("\n")
    .map((l) => l.trim())
    .join("\n")
    .trim();
}

/** Pega trozos de HTML saltándose los vacíos. */
function juntar(trozos: string[]): string {
  return trozos.filter((t) => t.trim() !== "").join("\n\n");
}

/** Solo para el resumen: contar qué lecciones acaban con reproductor. */
function tieneAudio(html: string): boolean {
  return /<iframe[^>]*podbean/i.test(html);
}

function limpiarHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Recorre el JSON del quiz buscando nodos con `_answerType`. Hace falta
 * recorrer y no indexar porque la estructura anida las preguntas por
 * ids, y esos ids cambian de un quiz a otro.
 */
function extraerPreguntas(nodo: unknown, salida: Pregunta[], descartadas: string[]): void {
  if (Array.isArray(nodo)) {
    for (const hijo of nodo) extraerPreguntas(hijo, salida, descartadas);
    return;
  }
  if (nodo === null || typeof nodo !== "object") return;

  const o = nodo as Registro;

  if (typeof o._answerType === "string") {
    const pregunta = interpretarPregunta(o);
    if (pregunta) salida.push(pregunta);
    else descartadas.push(texto(o._answerType));
  }

  for (const valor of Object.values(o)) extraerPreguntas(valor, salida, descartadas);
}

function interpretarPregunta(o: Registro): Pregunta | null {
  const tipo = TIPOS[texto(o._answerType)];
  if (!tipo) return null;

  const enunciado = limpiarHtml(texto(o._question));
  if (enunciado === "") return null;

  const datos = Array.isArray(o._answerData) ? (o._answerData as Registro[]) : [];
  const respuestas = datos.map((d) => limpiarHtml(texto(d._answer)));

  const explicacionCruda = limpiarHtml(texto(o._correctMsg));
  const explicacion = explicacionCruda === "" ? null : explicacionCruda;

  // El id propio de la pregunta dentro de WP Pro Quiz. Si no viene, el
  // llamante le asigna uno derivado del quiz: ver `montarEjercicios`.
  const idCrudo = entero(o._id);
  const learndashId = idCrudo > 0 ? idCrudo : null;

  if (tipo === "essay") {
    // Sin corrección automática. Se importa igual y queda marcado por su
    // tipo, para decidir después qué se hace con él.
    return { enunciado, tipo, opciones: [], correcta: null, explicacion, learndashId };
  }

  if (tipo === "cloze") {
    // ---------------------------------------------------------------
    // EL CLOZE NO ESTÁ EN `_question`, ESTÁ EN `_answer`
    //
    // `_question` solo trae la instrucción ("Complete with the correct
    // letter A) … B) …"). El texto que el alumno completa vive en
    // `_answer`, con los huecos entre llaves:
    //
    //   <p>Speaker 1: "I find it difficult…" {B|1}</p>
    //
    // Quedarse solo con el contenido de las llaves deja al alumno con un
    // enunciado y nada que rellenar.
    //
    // Y lo que va detrás de la barra son los PUNTOS del hueco, no una
    // respuesta alternativa: guardar "1" como válida haría que teclear
    // un 1 contara como acierto.
    //
    // El texto se guarda con los huecos sustituidos por {{1}}, {{2}}… y
    // NO por su contenido original: el crudo lleva la solución dentro, y
    // ese enunciado acaba en el navegador. Cada {{n}} se corresponde con
    // `correcta[n-1]`.
    // ---------------------------------------------------------------
    const bruto = limpiarHtmlConSaltos(texto(datos[0]?._answer));

    // `Array.from` y no desplegar el iterador: el tsconfig del proyecto
    // no fija `target`, así que desplegar un iterador que no es array no
    // compila (TS2802). Pasa lo mismo con los `.entries()` de los Map.
    const huecos = Array.from(bruto.matchAll(/\{([^}]*)\}/g), (m: RegExpMatchArray) => {
      const partes = m[1].split("|").map((s: string) => s.trim());
      // Si el último trozo es un entero suelto, son los puntos.
      if (partes.length > 1 && /^\d+$/.test(partes[partes.length - 1])) partes.pop();
      return partes.filter((s: string) => s !== "");
    });

    if (huecos.length === 0) return null;

    let n = 0;
    const conHuecos = bruto.replace(/\{[^}]*\}/g, () => `{{${++n}}}`);
    const completo = conHuecos === "" ? enunciado : `${enunciado}\n\n${conHuecos}`;

    return { enunciado: completo, tipo, opciones: [], correcta: huecos, explicacion, learndashId };
  }

  // single y multiple
  const opciones = respuestas.filter((r) => r !== "");
  if (opciones.length < 2) return null;

  const correctas: number[] = [];
  datos.forEach((d, i) => {
    const marca = d._correct;
    if (marca === true || marca === 1 || marca === "1") correctas.push(i);
  });
  if (correctas.length === 0) return null;

  return { enunciado, tipo, opciones, correcta: correctas, explicacion, learndashId };
}

// ---------------------------------------------------------------
// EL ÁRBOL
//
// `ld_course_steps` del curso es la ÚNICA fuente de la jerarquía: los
// topics no llevan en su meta a qué módulo pertenecen. Su forma es
//
//   steps.h["sfwd-lessons"][idModulo]["sfwd-topic"][idTopic]["sfwd-quiz"]
//
// y los módulos pueden llevar además quizzes propios en su "sfwd-quiz".
//
// SOBRE EL ORDEN: `menu_order` es 0 en los 370 módulos y en los 991
// topics del export, así que no sirve. El orden es el de aparición en
// `ld_course_steps`. Como las claves son numéricas, JavaScript las
// recorre de menor a mayor y no por inserción; se comprobó que en este
// export ambos órdenes coinciden, porque LearnDash creó los pasos en
// orden. Si algún día dejaran de coincidir, aquí es donde se notaría.
// ---------------------------------------------------------------

type NodoModulo = { id: number; topics: number[]; quizzes: number[] };

function leerArbol(curso: Registro): NodoModulo[] {
  const pasos = metaObjeto(wpMeta(curso), "ld_course_steps");
  if (!pasos) return [];

  const steps = pasos.steps;
  if (steps === null || typeof steps !== "object") return [];

  const h = (steps as Registro).h;
  if (h === null || typeof h !== "object") return [];

  const lecciones = (h as Registro)["sfwd-lessons"];
  if (lecciones === null || typeof lecciones !== "object" || Array.isArray(lecciones)) return [];

  const salida: NodoModulo[] = [];

  for (const [idModulo, cuerpo] of Object.entries(lecciones as Registro)) {
    const c = (cuerpo ?? {}) as Registro;

    const topics: number[] = [];
    const tps = c["sfwd-topic"];
    if (tps !== null && typeof tps === "object" && !Array.isArray(tps)) {
      for (const idTopic of Object.keys(tps as Registro)) topics.push(entero(idTopic));
    }

    // Un módulo o topic sin quizzes trae un array vacío en vez de un
    // objeto; solo cuentan los objetos.
    const quizzes: number[] = [];
    const qz = c["sfwd-quiz"];
    if (qz !== null && typeof qz === "object" && !Array.isArray(qz)) {
      for (const idQuiz of Object.keys(qz as Registro)) quizzes.push(entero(idQuiz));
    }

    salida.push({ id: entero(idModulo), topics, quizzes });
  }

  return salida;
}

/** Los quizzes que cuelgan de un topic concreto, según el árbol. */
function quizzesPorTopic(curso: Registro): Map<number, number[]> {
  const salida = new Map<number, number[]>();
  const pasos = metaObjeto(wpMeta(curso), "ld_course_steps");
  const steps = pasos?.steps;
  const h = steps !== null && typeof steps === "object" ? (steps as Registro).h : null;
  const lecciones = h !== null && typeof h === "object" ? (h as Registro)["sfwd-lessons"] : null;
  if (lecciones === null || typeof lecciones !== "object" || Array.isArray(lecciones)) return salida;

  for (const cuerpo of Object.values(lecciones as Registro)) {
    const tps = ((cuerpo ?? {}) as Registro)["sfwd-topic"];
    if (tps === null || typeof tps !== "object" || Array.isArray(tps)) continue;
    for (const [idTopic, tc] of Object.entries(tps as Registro)) {
      const qz = ((tc ?? {}) as Registro)["sfwd-quiz"];
      if (qz !== null && typeof qz === "object" && !Array.isArray(qz)) {
        salida.set(entero(idTopic), Object.keys(qz as Registro).map(entero));
      }
    }
  }

  return salida;
}

// ---------------------------------------------------------------
// FILAS A INSERTAR
// ---------------------------------------------------------------

type FilaCurso = {
  slug: string;
  titulo: string;
  nivel: Nivel;
  tipo: TipoCurso;
  examen: Examen | null;
  descripcion: string | null;
  orden: number;
  learndash_id: number;
};

type FilaModulo = { curso_ld: number; titulo: string; orden: number; learndash_id: number };

type FilaLeccion = {
  modulo_ld: number;
  titulo: string;
  contenido: string;
  /** De la meta del topic, no del HTML. Ver `videoDe`. */
  video_url: string | null;
  orden: number;
  learndash_id: number;
};

type FilaEjercicio = {
  leccion_ld: number;
  tipo: Pregunta["tipo"];
  enunciado: string;
  opciones: string[];
  correcta: unknown;
  explicacion: string | null;
  orden: number;
  learndash_id: number;
};

type Resumen = {
  cursosSaltados: string[];
  topicsVacios: number;
  topicsHuerfanos: number;
  leccionesSinteticas: number;
  quizzesFueraDelArbol: number;
  /** Preguntas de quizzes alcanzables que no pasaron la validación. */
  preguntasDescartadas: number;
  /** Preguntas atrapadas en quizzes que no cuelgan de ningún curso. */
  preguntasInalcanzables: Map<string, number>;
  ensayos: number;
  /** Lecciones con vídeo en `video_url`. */
  videos: number;
  /** Topics que EXISTEN solo por su vídeo: sin ese campo se descartaban. */
  videosQueSalvanLaLeccion: number;
  /** Vídeos de módulo: `modulos` no tiene dónde guardarlos. Se pierden. */
  videosDeModulo: number;
  /** Lecciones cuyo contenido acaba llevando un reproductor de audio. */
  audios: number;
  /** Reproductores de audio en quizzes que no cuelgan de ningún curso. */
  audiosInalcanzables: number;
};

// ---------------------------------------------------------------
// MONTAJE
// ---------------------------------------------------------------

function montar(zip: Zip) {
  const cursos = leerJsonl(zip, "post_type_course.ld");
  const modulos = leerJsonl(zip, "post_type_lesson.ld");
  const topics = leerJsonl(zip, "post_type_topic.ld");
  const quizzes = leerJsonl(zip, "post_type_quiz.ld");
  const proquiz = leerJsonl(zip, "proquiz.ld");

  const porId = (rs: Registro[]): Map<number, Registro> => {
    const m = new Map<number, Registro>();
    for (const r of rs) m.set(entero(wpPost(r).ID), r);
    return m;
  };

  const moduloPorId = porId(modulos);
  const topicPorId = porId(topics);
  const quizPorId = porId(quizzes);

  // proquiz_post_id casa 1 a 1 con el ID del post de quiz: 581 de 581.
  const datosQuiz = new Map<number, unknown>();
  for (const linea of proquiz) {
    const bruto = linea.proquiz_data;
    if (typeof bruto !== "string") continue;
    try {
      datosQuiz.set(entero(linea.proquiz_post_id), decodificarProquiz(bruto));
    } catch {
      // Un quiz ilegible se pierde, no tira el import.
    }
  }

  const filasCurso: FilaCurso[] = [];
  const filasModulo: FilaModulo[] = [];
  const filasLeccion: FilaLeccion[] = [];
  const filasEjercicio: FilaEjercicio[] = [];

  const resumen: Resumen = {
    cursosSaltados: [],
    topicsVacios: 0,
    topicsHuerfanos: 0,
    leccionesSinteticas: 0,
    quizzesFueraDelArbol: 0,
    preguntasDescartadas: 0,
    preguntasInalcanzables: new Map<string, number>(),
    ensayos: 0,
    videos: 0,
    videosQueSalvanLaLeccion: 0,
    videosDeModulo: 0,
    audios: 0,
    audiosInalcanzables: 0,
  };

  const topicsUsados = new Set<number>();
  const quizzesUsados = new Set<number>();

  let ordenCurso = 0;

  for (const curso of cursos) {
    const post = wpPost(curso);
    const titulo = texto(post.post_title).trim();
    const idCurso = entero(post.ID);

    if (titulo === TITULO_EXCLUIDO) {
      resumen.cursosSaltados.push(`${titulo} (curso de pruebas)`);
      continue;
    }

    const clase = clasificar(titulo);
    if (!clase) {
      resumen.cursosSaltados.push(`${titulo} (no se pudo deducir nivel)`);
      continue;
    }

    const descripcion = limpiarHtml(texto(post.post_excerpt));

    filasCurso.push({
      slug: comoSlug(titulo),
      titulo,
      nivel: clase.nivel,
      tipo: clase.tipo,
      examen: clase.examen,
      descripcion: descripcion === "" ? null : descripcion,
      orden: ordenCurso++,
      learndash_id: idCurso,
    });

    const arbol = leerArbol(curso);
    const quizDeTopic = quizzesPorTopic(curso);

    let ordenModulo = 0;

    for (const nodo of arbol) {
      const modulo = moduloPorId.get(nodo.id);
      if (!modulo) continue;

      filasModulo.push({
        curso_ld: idCurso,
        titulo: texto(wpPost(modulo).post_title).trim() || "Módulo",
        orden: ordenModulo++,
        learndash_id: nodo.id,
      });

      let ordenLeccion = 0;

      // --- lecciones reales ---
      for (const idTopic of nodo.topics) {
        const topic = topicPorId.get(idTopic);
        if (!topic) continue;
        topicsUsados.add(idTopic);

        const propio = texto(wpPost(topic).post_content).trim();
        const susQuizzes = quizDeTopic.get(idTopic) ?? [];
        const video = videoDe(topic);

        // El enunciado del quiz se pega debajo del topic: ahí es donde
        // está el reproductor de audio. Ver `contenidoDeQuiz`.
        const contenido = juntar([propio, ...susQuizzes.map(contenidoDeQuiz)]);

        if (contenido === "" && susQuizzes.length === 0 && video === null) {
          // Ni contenido, ni ejercicio, ni vídeo: no hay lección que enseñar.
          resumen.topicsVacios++;
          continue;
        }

        if (video !== null) {
          resumen.videos++;
          // Lo que este campo rescata: sin él, estos topics caían en la
          // rama de arriba y no llegaban ni a existir como lección.
          if (contenido === "" && susQuizzes.length === 0) resumen.videosQueSalvanLaLeccion++;
        }
        if (tieneAudio(contenido)) resumen.audios++;

        const idLeccion = idTopic;
        filasLeccion.push({
          modulo_ld: nodo.id,
          titulo: texto(wpPost(topic).post_title).trim() || "Lección",
          contenido,
          video_url: video,
          orden: ordenLeccion++,
          learndash_id: idLeccion,
        });

        for (const idQuiz of susQuizzes) {
          quizzesUsados.add(idQuiz);
          añadirEjercicios(idQuiz, idLeccion);
        }
      }

      // --- lecciones sintéticas para los quizzes del módulo ---
      // Ver la nota del esquema: en el export, 377 de 581 quizzes cuelgan
      // del módulo y no de un topic. Se les da una lección propia al
      // final del módulo, que es también el orden en que el alumno los
      // encuentra.
      for (const idQuiz of nodo.quizzes) {
        const quiz = quizPorId.get(idQuiz);
        if (!quiz) continue;
        quizzesUsados.add(idQuiz);

        const tituloQuiz = texto(wpPost(quiz).post_title).trim() || "Ejercicios";
        const antes = filasEjercicio.length;
        añadirEjercicios(idQuiz, idQuiz);

        const contenido = contenidoDeQuiz(idQuiz);

        // Un quiz sin preguntas legibles ya no se salta a ciegas: si
        // trae enunciado —y 11 de los 98 con audio son SOLO el
        // reproductor, sin una palabra— la lección sigue teniendo algo
        // que dar, aunque no haya ejercicio que corregir.
        if (filasEjercicio.length === antes && contenido === "") continue;

        if (tieneAudio(contenido)) resumen.audios++;

        filasLeccion.push({
          modulo_ld: nodo.id,
          titulo: `Ejercicios: ${tituloQuiz}`,
          contenido,
          video_url: null,
          orden: ordenLeccion++,
          learndash_id: idQuiz,
        });
        resumen.leccionesSinteticas++;
      }
    }
  }

  /**
   * EL AUDIO ESTÁ EN EL `post_content` DEL QUIZ
   *
   * De un quiz solo se sacaban las preguntas, que viven en `proquiz`.
   * Su `post_content` —el enunciado que el alumno lee antes de
   * responder— se tiraba entero, y ahí es donde está el reproductor:
   * 98 de los 581 quizzes llevan un iframe de Podbean, y son todos los
   * ejercicios de listening del curso. Sin esto el alumno ve "escucha
   * el audio y responde" y no hay audio.
   *
   * Vuelca tal cual, sin tocar el HTML: `lib/sanear-html.ts` decide
   * después qué se pinta, y Podbean está en su lista de permitidos.
   */
  function contenidoDeQuiz(idQuiz: number): string {
    const quiz = quizPorId.get(idQuiz);
    return quiz ? texto(wpPost(quiz).post_content).trim() : "";
  }

  function añadirEjercicios(idQuiz: number, idLeccion: number): void {
    const datos = datosQuiz.get(idQuiz);
    if (datos === undefined) return;

    const preguntas: Pregunta[] = [];
    const descartadas: string[] = [];
    extraerPreguntas(datos, preguntas, descartadas);
    resumen.preguntasDescartadas += descartadas.length;

    let orden = 0;
    for (const p of preguntas) {
      if (p.tipo === "essay") resumen.ensayos++;
      filasEjercicio.push({
        leccion_ld: idLeccion,
        tipo: p.tipo,
        enunciado: p.enunciado,
        opciones: p.opciones,
        correcta: p.correcta,
        explicacion: p.explicacion,
        orden: orden++,
        // Si la pregunta no trae `_id`, se deriva del quiz y su posición.
        // Es estable entre ejecuciones, que es lo que necesita el upsert.
        learndash_id: p.learndashId ?? idQuiz * 1000 + orden,
      });
    }
  }

  // --- lo que se quedó fuera ---
  for (const t of topics) {
    const id = entero(wpPost(t).ID);
    if (!topicsUsados.has(id)) resumen.topicsHuerfanos++;
  }

  // Un módulo con vídeo no tiene dónde caer: `modulos` es título y orden,
  // y un vídeo de módulo no es una lección. Es 1 en este export (17584).
  // Se cuenta para que se vea, no se inventa una lección para él.
  for (const m of modulos) {
    if (videoDe(m) !== null) resumen.videosDeModulo++;
  }
  // Los quizzes que no aparecen en `ld_course_steps` de ningún curso.
  // Tampoco traen `course_id` en su meta, así que NO HAY forma de saber
  // a qué curso pertenecían: se cuentan y se dice qué se pierde.
  for (const q of quizzes) {
    const idQuiz = entero(wpPost(q).ID);
    if (quizzesUsados.has(idQuiz)) continue;
    resumen.quizzesFueraDelArbol++;
    if (tieneAudio(texto(wpPost(q).post_content))) resumen.audiosInalcanzables++;

    const datos = datosQuiz.get(idQuiz);
    if (datos === undefined) continue;
    const sueltas: Pregunta[] = [];
    const tiradas: string[] = [];
    extraerPreguntas(datos, sueltas, tiradas);
    for (const p of sueltas) {
      resumen.preguntasInalcanzables.set(p.tipo, (resumen.preguntasInalcanzables.get(p.tipo) ?? 0) + 1);
    }
  }

  return { filasCurso, filasModulo, filasLeccion, filasEjercicio, resumen };
}

// ---------------------------------------------------------------
// ESCRITURA
// ---------------------------------------------------------------

function leerEnv(ruta: string): Record<string, string> {
  const salida: Record<string, string> = {};
  for (const linea of readFileSync(ruta, "utf8").split(/\r?\n/)) {
    const l = linea.trim();
    if (l === "" || l.startsWith("#")) continue;
    const i = l.indexOf("=");
    if (i === -1) continue;
    salida[l.slice(0, i).trim()] = l
      .slice(i + 1)
      .trim()
      .replace(/^["']|["']$/g, "");
  }
  return salida;
}

async function enTandas<T>(filas: T[], tarea: (tanda: T[]) => Promise<void>): Promise<void> {
  for (let i = 0; i < filas.length; i += TANDA) {
    await tarea(filas.slice(i, i + TANDA));
  }
}

async function escribir(
  cliente: SupabaseClient,
  datos: ReturnType<typeof montar>
): Promise<void> {
  const { filasCurso, filasModulo, filasLeccion, filasEjercicio } = datos;

  // --- cursos ---
  const { data: cursos, error: e1 } = await cliente
    .from("cursos")
    .upsert(filasCurso, { onConflict: "learndash_id" })
    .select("id, learndash_id")
    .returns<{ id: string; learndash_id: number }[]>();
  if (e1) throw new Error(`cursos: ${e1.message}`);

  const idCurso = new Map<number, string>();
  for (const c of cursos ?? []) idCurso.set(Number(c.learndash_id), c.id);
  console.log(`  cursos escritos: ${idCurso.size}`);

  // --- módulos ---
  const idModulo = new Map<number, string>();
  await enTandas(filasModulo, async (tanda) => {
    const { data, error } = await cliente
      .from("modulos")
      .upsert(
        tanda.map((m) => ({
          curso_id: idCurso.get(m.curso_ld),
          titulo: m.titulo,
          orden: m.orden,
          learndash_id: m.learndash_id,
        })),
        { onConflict: "learndash_id" }
      )
      .select("id, learndash_id")
      .returns<{ id: string; learndash_id: number }[]>();
    if (error) throw new Error(`modulos: ${error.message}`);
    for (const m of data ?? []) idModulo.set(Number(m.learndash_id), m.id);
  });
  console.log(`  módulos escritos: ${idModulo.size}`);

  // --- lecciones ---
  const idLeccion = new Map<number, string>();
  await enTandas(filasLeccion, async (tanda) => {
    const { data, error } = await cliente
      .from("lecciones")
      .upsert(
        tanda.map((l) => ({
          modulo_id: idModulo.get(l.modulo_ld),
          titulo: l.titulo,
          contenido: l.contenido,
          video_url: l.video_url,
          orden: l.orden,
          learndash_id: l.learndash_id,
        })),
        { onConflict: "learndash_id" }
      )
      .select("id, learndash_id")
      .returns<{ id: string; learndash_id: number }[]>();
    if (error) throw new Error(`lecciones: ${error.message}`);
    for (const l of data ?? []) idLeccion.set(Number(l.learndash_id), l.id);
  });
  console.log(`  lecciones escritas: ${idLeccion.size}`);

  // --- ejercicios ---
  let ejercicios = 0;
  const utiles = filasEjercicio.filter((e) => idLeccion.has(e.leccion_ld));
  await enTandas(utiles, async (tanda) => {
    const { error } = await cliente.from("ejercicios_leccion").upsert(
      tanda.map((e) => ({
        leccion_id: idLeccion.get(e.leccion_ld),
        tipo: e.tipo,
        enunciado: e.enunciado,
        opciones: e.opciones,
        correcta: e.correcta,
        explicacion: e.explicacion,
        orden: e.orden,
        learndash_id: e.learndash_id,
      })),
      { onConflict: "learndash_id" }
    );
    if (error) throw new Error(`ejercicios: ${error.message}`);
    ejercicios += tanda.length;
  });
  console.log(`  ejercicios escritos: ${ejercicios}`);

  const huerfanos = filasEjercicio.length - utiles.length;
  if (huerfanos > 0) {
    console.log(`  ejercicios sin lección destino, no escritos: ${huerfanos}`);
  }
}

// ---------------------------------------------------------------
// PRINCIPAL
// ---------------------------------------------------------------

async function principal(): Promise<void> {
  const escribirDeVerdad = process.argv.includes("--escribir");

  console.log("");
  console.log(escribirDeVerdad ? "MODO ESCRITURA" : "MODO ENSAYO (no se escribe nada; usa --escribir)");
  console.log("");

  const zip = abrirZip(RUTA_ZIP);
  const datos = montar(zip);
  const { filasCurso, filasModulo, filasLeccion, filasEjercicio, resumen } = datos;

  console.log("=== LO QUE ENTRA ===");
  console.log(`  cursos     : ${filasCurso.length}`);
  console.log(`  módulos    : ${filasModulo.length}`);
  console.log(`  lecciones  : ${filasLeccion.length}   (${resumen.leccionesSinteticas} sintéticas, nacidas de un quiz)`);
  console.log(`  ejercicios : ${filasEjercicio.length}`);
  console.log("");
  console.log("  MULTIMEDIA");
  console.log(`    vídeos (video_url)            : ${resumen.videos}`);
  console.log(`      de esos, lecciones que solo`);
  console.log(`      existen por su vídeo        : ${resumen.videosQueSalvanLaLeccion}`);
  console.log(`    lecciones con audio Podbean   : ${resumen.audios}`);
  console.log("");

  const porTipo = new Map<string, number>();
  for (const e of filasEjercicio) porTipo.set(e.tipo, (porTipo.get(e.tipo) ?? 0) + 1);
  console.log(
    "  ejercicios por tipo: " +
      Array.from(porTipo.entries())
        .map(([k, v]) => `${k}=${v}`)
        .join(", ")
  );
  console.log("");

  console.log("  cursos, uno a uno:");
  for (const c of filasCurso) {
    const mods = filasModulo.filter((m) => m.curso_ld === c.learndash_id);
    const lecs = filasLeccion.filter((l) => mods.some((m) => m.learndash_id === l.modulo_ld));
    const ejs = filasEjercicio.filter((e) => lecs.some((l) => l.learndash_id === e.leccion_ld));
    const etiqueta = c.tipo === "examen" ? `${c.nivel}/${c.examen}` : `${c.nivel}/general`;
    console.log(
      `    ${c.titulo.padEnd(42)} ${etiqueta.padEnd(18)} ${String(mods.length).padStart(3)} mód · ${String(lecs.length).padStart(4)} lec · ${String(ejs.length).padStart(4)} ejer`
    );
  }
  console.log("");

  console.log("=== LO QUE SE QUEDA FUERA ===");
  for (const c of resumen.cursosSaltados) console.log(`  curso saltado: ${c}`);
  console.log(`  topics sin contenido, ni ejercicio, ni vídeo : ${resumen.topicsVacios}`);
  console.log(`  topics fuera de ld_course_steps              : ${resumen.topicsHuerfanos}`);
  console.log(`  quizzes fuera de ld_course_steps             : ${resumen.quizzesFueraDelArbol}`);
  console.log(`  preguntas descartadas al validar             : ${resumen.preguntasDescartadas}`);
  console.log(`  audios en esos quizzes sueltos               : ${resumen.audiosInalcanzables}`);

  if (resumen.videosDeModulo > 0) {
    console.log("");
    console.log(`  ⚠ ${resumen.videosDeModulo} vídeo(s) cuelgan de un MÓDULO, no de un topic.`);
    console.log("      `modulos` es título y orden: no hay columna donde guardarlos y un");
    console.log("      vídeo de módulo no es una lección. Si hace falta rescatarlo, la vía");
    console.log("      es una lección propia al principio del módulo, como se hace con los");
    console.log("      quizzes de módulo. No se hace solo: son decisiones de contenido.");
  }

  const inalcanzables = Array.from(resumen.preguntasInalcanzables.entries());
  const totalInalcanzables = inalcanzables.reduce((a, [, n]) => a + n, 0);
  if (totalInalcanzables > 0) {
    console.log("");
    console.log(`  ⚠ ${totalInalcanzables} preguntas viven en esos quizzes sueltos y NO se pueden ubicar:`);
    console.log("      " + inalcanzables.map(([k, v]) => `${k}=${v}`).join(", "));
    console.log("      Esos quizzes no aparecen en el árbol de ningún curso y tampoco");
    console.log("      llevan course_id en su meta, así que no hay a qué lección atarlos.");
  }

  console.log("");
  console.log(`  ejercicios de tipo essay importados: ${resumen.ensayos}  (sin corrección automática)`);
  if (resumen.ensayos === 0 && (resumen.preguntasInalcanzables.get("essay") ?? 0) > 0) {
    console.log(`      todos los essay del export (${resumen.preguntasInalcanzables.get("essay")}) están en quizzes sueltos.`);
  }
  console.log("");

  if (!escribirDeVerdad) {
    console.log("Ensayo terminado. Nada se ha escrito.");
    return;
  }

  const env = leerEnv(RUTA_ENV);
  const url = env.LMS_SUPABASE_URL;
  const clave = env.LMS_SUPABASE_SERVICE_KEY;
  if (!url || !clave) throw new Error("Faltan LMS_SUPABASE_URL o LMS_SUPABASE_SERVICE_KEY en .env.local");

  console.log("=== ESCRIBIENDO ===");
  const cliente = createClient(url, clave, {
    auth: { persistSession: false, autoRefreshToken: false },
    db: { schema: "public" },
  });

  await escribir(cliente, datos);
  console.log("");
  console.log("Import terminado.");
}

principal().catch((error: unknown) => {
  console.error("");
  console.error("FALLÓ: " + (error instanceof Error ? error.message : String(error)));
  process.exitCode = 1;
});
