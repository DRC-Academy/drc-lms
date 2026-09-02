// ---------------------------------------------------------------
// LÓGICA DE PERFIL, SIN E/S
//
// Todo lo de este módulo son funciones puras sobre los datos de las
// vistas: coerciones, parseo y las reglas que derivan examen y nivel.
//
// Vive separado de `lib/gestion.ts` a propósito. Gestión es `server-only`
// porque abre la conexión con la service role key; esto no toca la base
// ni el navegador, así que puede usarse desde cualquier sitio sin
// arrastrar la clave a ninguna parte.
// ---------------------------------------------------------------

import type { Bloque, GuiaProxima, TipoExamen } from "@/lib/data";

// ---------------------------------------------------------------
// COERCIONES DEFENSIVAS
// PostgREST no garantiza el tipo de cada columna al llegar aquí, así
// que nada se da por supuesto. Sin `any`: se parte de `unknown`.
// ---------------------------------------------------------------

export function comoTexto(valor: unknown): string {
  return typeof valor === "string" ? valor : "";
}

/** Trata la cadena vacía como ausencia: en estas vistas conviven null y "". */
export function comoTextoOpcional(valor: unknown): string | null {
  if (typeof valor !== "string") return null;
  return valor.trim() === "" ? null : valor;
}

/**
 * Un entero de la vista, o null. PostgREST puede devolver un número
 * como cadena según el tipo de la columna, así que se acepta cualquiera
 * de las dos formas y se descarta lo que no dé un entero positivo.
 *
 * El cero se trata como ausencia, no como cero: "cero horas a la semana"
 * no es un plan, es un dato que falta.
 */
export function comoEnteroOpcional(valor: unknown): number | null {
  const numero = typeof valor === "number" ? valor : Number(comoTextoOpcional(valor));
  if (!Number.isFinite(numero)) return null;
  const entero = Math.round(numero);
  return entero > 0 ? entero : null;
}

export function comoBooleano(valor: unknown): boolean {
  return valor === true;
}

/**
 * `respuestas_formulario` y `guia_proxima` vuelven de PostgREST como
 * *string* JSON, no como objeto. Este helper acepta las dos formas para
 * que el día que la vista cambie de `text` a `jsonb` nada se rompa.
 *
 * Falla en silencio devolviendo null: un perfil sin formulario no es un
 * error, es el caso mayoritario.
 */
export function asObject(valor: unknown): Record<string, unknown> | null {
  if (valor === null || valor === undefined) return null;

  if (typeof valor === "string") {
    const limpio = valor.trim();
    if (limpio === "") return null;
    try {
      return asObject(JSON.parse(limpio) as unknown);
    } catch {
      return null;
    }
  }

  // Un array es JSON válido pero no es la forma que esperamos en ningún caso.
  if (typeof valor === "object" && !Array.isArray(valor)) {
    return valor as Record<string, unknown>;
  }

  return null;
}

/**
 * `guia_proxima` con sus cinco campos. Se exige que los cinco sean texto:
 * si la forma no cuadra devolvemos null y quien llama cae al plan B, en vez
 * de colar un `undefined` dentro del prompt.
 */
export function asGuiaProxima(valor: unknown): GuiaProxima | null {
  const obj = asObject(valor);
  if (!obj) return null;

  const claves = ["priority", "warmUp", "mainFocus", "activity", "notes"] as const;
  if (!claves.every((c) => typeof obj[c] === "string")) return null;

  return {
    priority: comoTexto(obj.priority),
    warmUp: comoTexto(obj.warmUp),
    mainFocus: comoTexto(obj.mainFocus),
    activity: comoTexto(obj.activity),
    notes: comoTexto(obj.notes),
  };
}

// ---------------------------------------------------------------
// TIPO DE PREPARACIÓN
// ---------------------------------------------------------------

/**
 * Cada examen con todas las formas en que aparece escrito en los planes.
 *
 * LOS TRES PRODUCTOS DEL CATÁLOGO, con su nombre exacto. Es lo que
 * compra el alumno y por tanto lo único que tiene que acertar sí o sí:
 *
 *   "Preparación B1 Preliminary"        16 alumnos  -> b1_preliminary
 *   "Preparación B2 First Certificate"  18 alumnos  -> b2_first
 *   "Preparación C1 Advanced"            6 alumnos  -> c1_advanced
 *
 * En Gestión llegan con los horarios pegados detrás —"Preparación B1
 * Preliminary - 2h semanales — 2h semanales · Martes y jueves"—, así que
 * se busca sobre el texto entero y nunca por igualdad.
 *
 * Y HAY DOS FAMILIAS MÁS que también son preparación de examen y también
 * caen aquí, medidas sobre los 183 alumnos:
 *
 *   "Intensivo PET" / "FCE" / "CAE"     11 alumnos
 *   "B1 / B2 / C1 Exámenes"              6 alumnos   nombre viejo
 *
 * Son 17 de los 57, así que no son un resto: si algún día se decide que
 * un intensivo NO es lo mismo que el curso de preparación, hay que
 * separarlas aquí, y no en quien consume esto.
 *
 * PET y FCE son los nombres antiguos de B1 Preliminary y B2 First:
 * Cambridge los renombró, pero en la academia se siguen usando y son el
 * mismo examen. Las etiquetas cortas ("B2 Exámenes") vienen de los planes
 * dados de alta a mano.
 *
 * Las siglas van con `\b` a ambos lados a propósito: un `includes("pet")`
 * capturaría "competencia", "repetición" o cualquier palabra que las
 * lleve dentro. Lo mismo con "cae".
 */
const PATRONES_EXAMEN: { examen: TipoExamen; patrones: RegExp[] }[] = [
  { examen: "b2_first", patrones: [/\bfirst\b/i, /\bfce\b/i, /\bb2\s+ex[áa]menes\b/i] },
  { examen: "b1_preliminary", patrones: [/\bpreliminary\b/i, /\bpet\b/i, /\bb1\s+ex[áa]menes\b/i] },
  { examen: "c1_advanced", patrones: [/\badvanced\b/i, /\bcae\b/i, /\bc1\s+ex[áa]menes\b/i] },
  { examen: "ielts", patrones: [/\bielts\b/i] },
];

/**
 * Deduce qué examen prepara el alumno a partir del texto del plan.
 *
 * El plan es el nombre del producto de WooCommerce con los horarios
 * pegados detrás, así que se busca sobre el texto entero.
 *
 * APTIS queda fuera DELIBERADAMENTE. Es del British Council y su formato
 * no se parece al de Cambridge: generar ejercicios con el formato
 * equivocado es peor que no ofrecer la tarjeta. Ese alumno practica por
 * repaso o por contexto, como el resto. Si algún día entra, necesita su
 * propio bloque de formato en el prompt, no reutilizar el de First.
 */
export function detectarExamen(plan: string): TipoExamen | null {
  for (const { examen, patrones } of PATRONES_EXAMEN) {
    if (patrones.some((patron) => patron.test(plan))) return examen;
  }
  return null;
}

/**
 * Traduce el nivel de Gestión al del catálogo de bloques.
 *
 * A1 y A2 ya tienen material propio, así que aquí se conservan tal cual:
 * esta función NO es el camino por el que un A2 recibe contenido, es solo
 * la red de seguridad para un nivel escrito de forma inesperada (C2, un
 * valor con espacios, una cadena vacía). Ante la duda cae en B1, que es
 * el nivel con más alumnos y más material.
 */
export function nivelDeBloque(nivel: string): Bloque["nivel"] {
  const limpio = nivel.trim().toUpperCase();
  if (limpio === "A1") return "A1";
  if (limpio === "A2") return "A2";
  if (limpio === "B2") return "B2";
  if (limpio === "C1" || limpio === "C2") return "C1";
  return "B1";
}

const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

/**
 * `fecha_clase` llega como `YYYY-MM-DD`. Se formatea partiendo la cadena
 * y no con `new Date()`: construir una fecha desde un ISO corto la ancla
 * a UTC y en España puede retroceder un día.
 */
export function formatearFecha(iso: string): string {
  const partes = iso.slice(0, 10).split("-");
  if (partes.length !== 3) return iso;

  const dia = Number(partes[2]);
  const mes = Number(partes[1]);
  if (!Number.isFinite(dia) || !Number.isFinite(mes) || mes < 1 || mes > 12) return iso;

  return `${dia} de ${MESES[mes - 1]}`;
}

/**
 * Como `formatearFecha` pero con el año: "19 de agosto de 2026".
 *
 * El recorrido de clases se remonta meses —hay alumnos con clases desde
 * hace más de un año— y ahí "19 de agosto" a secas es ambiguo. En la
 * última clase no lo era, porque es reciente por definición, y por eso
 * aquella se queda corta y esta existe aparte.
 *
 * Se parte la cadena igual que allí, y por el mismo motivo: construir un
 * `Date` desde un ISO corto lo ancla a UTC y en España retrocede un día.
 */
export function formatearFechaLarga(iso: string): string {
  const partes = iso.slice(0, 10).split("-");
  if (partes.length !== 3) return iso;

  const dia = Number(partes[2]);
  const mes = Number(partes[1]);
  const anio = Number(partes[0]);
  if (!Number.isFinite(dia) || !Number.isFinite(mes) || mes < 1 || mes > 12) return iso;
  if (!Number.isFinite(anio)) return iso;

  return `${dia} de ${MESES[mes - 1]} de ${anio}`;
}
