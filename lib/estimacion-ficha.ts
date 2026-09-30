// ---------------------------------------------------------------
// LA ESTIMACIÓN DE «MI PROGRESO», COPIA DE LA DE DRC GESTIÓN
//
// ⚠ ESTE ARCHIVO ES UNA COPIA de `lib/estimacion.ts` de DRC Gestión
// (`construirEstimacion`), hecha el 30/09/2026 al traer al LMS la ficha
// rediseñada. «Mi progreso» y la ficha que el alumno abre desde el enlace
// de su profesor o desde Mi cuenta tienen que decir LO MISMO: mismos
// meses, misma meta y mismos casos en los que el banner sale o no. SI SE
// TOCA ALLÍ, SE TOCA AQUÍ.
//
// No sustituye a `lib/estimacion.ts` del LMS, que sigue alimentando la
// comparativa del inicio («Ahora puedes llegar más rápido»). Las dos
// comparten la aritmética (84 h, ×1,5, 4 semanas, tope de 5 h, +1 y +2),
// así que los MESES coinciden; difieren en tres reglas que aquí van como
// en Gestión:
//
//   · LAS FUENTES DE LA META, EN ORDEN y gana la primera con un examen
//     reconocible: el producto de WooCommerce primero (en Gestión, 54 de
//     los 63 alumnos de examen solo se detectan por ahí), luego
//     `students.plan`, `assignments.plan`, el objetivo del alta y el
//     objetivo del perfil.
//   · SIN NIVEL SE ESTIMA IGUAL: el horizonte no depende del nivel, así
//     que solo se pierde el nombre de la meta.
//   · SOLO CALLA SIN HORAS. Ya en 5 h sale igual (estado `tope`), para
//     reconocerle el ritmo.
//
// Escrito para el `target` de este repo (ES5): sin `\p{…}` ni
// `[...new Set()]`, igual que `lib/estimacion.ts`.
// ---------------------------------------------------------------

import { ESCALERA_MCER, nivelMcer, type NivelMcer } from "@/lib/recorrido";

export const HORAS_OBJETIVO = 84;
export const MULTIPLICADOR_PRACTICA = 1.5;
export const SEMANAS_POR_MES = 4.0;
export const HORAS_SEMANALES_MAXIMAS = 5;
export const ESCALONES = [1, 2];

/** Meses para cubrir el horizonte a `horasSemanales` de clase. Nunca menos de 1. */
export function mesesPara(horasSemanales: number, horasObjetivo = HORAS_OBJETIVO): number {
  if (!isFinite(horasSemanales) || horasSemanales <= 0) return 0;
  const guiadasPorMes = horasSemanales * MULTIPLICADOR_PRACTICA * SEMANAS_POR_MES;
  return Math.max(1, Math.round(horasObjetivo / guiadasPorMes));
}

// ── La meta ──────────────────────────────────────────────────────

const EXAMENES: Array<{ nivel: NivelMcer; re: RegExp }> = [
  { nivel: "C2", re: /\b(proficiency|cpe)\b/ },
  { nivel: "C1", re: /\b(advanced)\b/ },
  { nivel: "B2", re: /\b(first\s+certificate|first|fce|ielts|toefl)\b/ },
  { nivel: "B1", re: /\b(preliminary)\b/ },
];

const CODIGOS_EXAMEN: Array<{ nivel: NivelMcer; re: RegExp }> = [
  { nivel: "C1", re: /\bCAE\b/ },
  { nivel: "B1", re: /\bPET\b/ },
];

const CONTEXTO_EXAMEN = /\b(examen(?:es)?|preparacion(?:es)?|certificad[oa]s?)\b/;
const CODIGO_MCER = /\b(A1|A2|B1|B2|C1|C2)\b/g;

/** Sin tildes y en minúsculas. El rango U+0300–U+036F es lo que separa NFD. */
function normalizar(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/** El examen escrito en UN texto, o null si no hay uno inequívoco. */
export function examenEnTexto(crudo: string | null | undefined): NivelMcer | null {
  const raw = (crudo ?? "").trim();
  if (!raw) return null;
  const texto = normalizar(raw);

  if (CONTEXTO_EXAMEN.test(texto)) {
    const hallados: string[] = [];
    for (const c of raw.toUpperCase().match(CODIGO_MCER) ?? []) {
      if (hallados.indexOf(c) === -1) hallados.push(c);
    }
    if (hallados.length === 1) return hallados[0] as NivelMcer;
  }
  for (const { nivel, re } of EXAMENES) if (re.test(texto)) return nivel;
  for (const { nivel, re } of CODIGOS_EXAMEN) if (re.test(raw)) return nivel;
  return null;
}

/** Los textos donde puede estar escrito el examen, EN ORDEN de prioridad. */
export type FuentesMeta = {
  /** students.product_name (en la vista, `producto`). */
  productoWoo?: string | null;
  /** students.plan */
  planAlumno?: string | null;
  /** assignments.plan (en la vista, `plan_contratado`). */
  planAssignment?: string | null;
  /** assignments.objetivo (en la vista, `objetivo_setter`). */
  objetivo?: string | null;
  /** student_profiles.personal_objective (en la vista, `objetivo_perfil`). */
  objetivoPersonal?: string | null;
};

const ORDEN_FUENTES: Array<keyof FuentesMeta> = [
  "productoWoo", "planAlumno", "planAssignment", "objetivo", "objetivoPersonal",
];

export type OrigenMeta = "examen" | "siguiente_nivel" | "nivel_actual" | "sin_nivel";

export type Meta = {
  /** Null solo con `origen: 'sin_nivel'`. */
  nivel: NivelMcer | null;
  origen: OrigenMeta;
};

/** A qué nivel apunta el alumno. Siempre hay meta. Ver Gestión, `detectarMeta`. */
export function detectarMeta(fuentes: FuentesMeta, nivelActual: NivelMcer | null): Meta {
  const actual = nivelActual ? ESCALERA_MCER.indexOf(nivelActual) : -1;

  for (const clave of ORDEN_FUENTES) {
    const examen = examenEnTexto(fuentes[clave]);
    if (!examen) continue;
    if (ESCALERA_MCER.indexOf(examen) >= actual) return { nivel: examen, origen: "examen" };
    // Por debajo del nivel actual: dato incoherente. Manda la escalera.
    break;
  }

  if (!nivelActual) return { nivel: null, origen: "sin_nivel" };
  const siguiente = ESCALERA_MCER[actual + 1];
  return siguiente ? { nivel: siguiente, origen: "siguiente_nivel" } : { nivel: nivelActual, origen: "nivel_actual" };
}

// ── La estimación ────────────────────────────────────────────────

export type EstadoBanner = "tope" | "examen" | "ahorro";

export type OpcionPlan = {
  horasSemanales: number;
  meses: number;
  /** Índice del mes (0-11) y año de llegada: el texto lo pone el diccionario. */
  llegada: { mes: number; anio: number };
  esActual: boolean;
  /** Meses que se ahorra respecto del plan actual. 0 en el plan actual. */
  mesesAhorrados: number;
};

export type EstimacionFicha = {
  estado: EstadoBanner;
  nivelActual: NivelMcer | null;
  meta: Meta;
  /** Plan actual primero, luego las ampliaciones. Nunca vacío. */
  opciones: OpcionPlan[];
  /** La ampliación de más horas. null en `tope`. */
  mejor: OpcionPlan | null;
};

/**
 * La estimación, o null solo si no se saben las horas semanales. La fecha
 * de llegada es hoy más los meses, en UTC: es una etiqueta de calendario.
 */
export function construirEstimacion(entrada: {
  nivelActual: string | null | undefined;
  horasSemanales: number | null | undefined;
  fuentes: FuentesMeta;
  ahora?: Date;
}): EstimacionFicha | null {
  const semanales = Math.round(Number(entrada.horasSemanales ?? 0));
  if (!isFinite(semanales) || semanales < 1) return null;

  const nivelActual = nivelMcer(entrada.nivelActual);
  const meta = detectarMeta(entrada.fuentes, nivelActual);
  const ahora = entrada.ahora ?? new Date();

  const planes = [semanales].concat(
    ESCALONES.map((s) => semanales + s).filter((h) => h <= HORAS_SEMANALES_MAXIMAS)
  );
  const crudas = planes.map((h) => ({ horasSemanales: h, meses: mesesPara(h) }));

  const opciones: OpcionPlan[] = crudas.map((o) => {
    const d = new Date(Date.UTC(ahora.getUTCFullYear(), ahora.getUTCMonth() + o.meses, 1));
    return {
      horasSemanales: o.horasSemanales,
      meses: o.meses,
      llegada: { mes: d.getUTCMonth(), anio: d.getUTCFullYear() },
      esActual: o.horasSemanales === semanales,
      mesesAhorrados: Math.max(0, crudas[0].meses - o.meses),
    };
  });

  const hayAmpliacion = opciones.length > 1;
  return {
    estado: !hayAmpliacion ? "tope" : meta.origen === "examen" ? "examen" : "ahorro",
    nivelActual,
    meta,
    opciones,
    mejor: hayAmpliacion ? opciones[opciones.length - 1] : null,
  };
}
