// ---------------------------------------------------------------
// LAS REGLAS DEL PANEL DE PROFESORES
//
// Puras: sin base y sin `server-only`, para poder probarlas. Quien las usa
// con datos de verdad es `lib/panel-profesor.ts` (el guard y la pestaña
// de admin), de modo que los dos deciden lo mismo.
// ---------------------------------------------------------------

import { diaLocal, diasNaturales, sumarDias } from "@/lib/fechas";

export type SituacionProfesor =
  /** Puede entrar. */
  | "activo"
  /** Sin fila, o desactivado. */
  | "sin_acceso"
  /** Activado, pero el email de Gestión ya no es la copia aprobada. */
  | "bloqueado_email"
  /** Activado, pero ya no está en la academia (o ha desaparecido de Gestión). */
  | "archivado";

/**
 * La única respuesta a «¿puede entrar este profesor?».
 *
 * EL EMAIL ES UNA COPIA APROBADA. Gestión deja editar `teachers.email`
 * desde el navegador con la clave pública, así que cambiarlo no puede
 * trasladar el acceso a otra dirección: si deja de coincidir, se bloquea
 * hasta que un admin lo revise.
 */
export function situacionDelProfesor(
  acceso: { emailNormalizado: string; activo: boolean } | null,
  gestion: { email: string; archivado: boolean } | null
): SituacionProfesor {
  if (!acceso || !acceso.activo) return "sin_acceso";
  if (!gestion || gestion.archivado) return "archivado";
  return gestion.email === acceso.emailNormalizado ? "activo" : "bloqueado_email";
}

export type FilaPestana = {
  teacherId: string;
  profesor: string;
  email: string;
  /** La copia aprobada, si alguna vez tuvo acceso. */
  emailAprobado: string | null;
  situacion: SituacionProfesor;
  esPrueba: boolean;
  alumnos: number;
  invitadoEn: string | null;
};

/**
 * Qué sale en «Acceso profesores» y en qué orden.
 *
 * Los archivados no salen, salvo que sigan con el acceso activado: esos
 * hay que verlos. Primero lo que pide una revisión, después quien tiene
 * alumnos y al final quien no tiene ninguno.
 */
export function filasDeLaPestana(
  profesores: { teacherId: string; profesor: string; email: string; archivado: boolean; esPrueba: boolean }[],
  accesos: Map<string, { emailNormalizado: string; activo: boolean; invitadoEn: string | null }>,
  alumnos: Map<string, number>
): FilaPestana[] {
  const peso = (f: FilaPestana) =>
    f.situacion === "bloqueado_email" || f.situacion === "archivado" ? 0 : f.alumnos > 0 ? 1 : 2;

  return profesores
    .filter((p) => !p.archivado || accesos.get(p.teacherId)?.activo === true)
    .map((p) => {
      const acceso = accesos.get(p.teacherId) ?? null;
      return {
        teacherId: p.teacherId,
        profesor: p.profesor,
        email: p.email,
        emailAprobado: acceso?.emailNormalizado ?? null,
        situacion: situacionDelProfesor(acceso, p),
        esPrueba: p.esPrueba,
        alumnos: alumnos.get(p.teacherId) ?? 0,
        invitadoEn: acceso?.invitadoEn ?? null,
      };
    })
    .sort((a, b) => peso(a) - peso(b) || a.profesor.localeCompare(b.profesor, "es"));
}

/** El último paso del alumno por la plataforma, en palabras. Días de Madrid. */
export function textoUltimoAcceso(iso: string | null, ahora: Date = new Date()): string {
  if (!iso) return "Aún no ha entrado";
  const momento = new Date(iso);
  if (Number.isNaN(momento.getTime())) return "Aún no ha entrado";
  const dias = diasNaturales(momento, ahora);
  if (dias <= 0) return "Entró hoy";
  if (dias === 1) return "Entró ayer";
  return `Entró hace ${dias} días`;
}

/**
 * La semana del curso, contando desde su fecha de inicio. La primera es la
 * 1. Una fecha por delante sigue siendo la 1. Null sin fecha.
 */
export function semanaDelCurso(fechaInicio: Date | null, ahora: Date = new Date()): number | null {
  if (!fechaInicio) return null;
  return Math.floor(Math.max(0, diasNaturales(fechaInicio, ahora)) / 7) + 1;
}

const DIA_LARGO = new Intl.DateTimeFormat("es-ES", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long" });
const DIA_CORTO = new Intl.DateTimeFormat("es-ES", { timeZone: "UTC", weekday: "short", day: "numeric", month: "short" });

const enFecha = (dia: string) => new Date(`${dia.slice(0, 10)}T12:00:00Z`);

/** «jueves, 12 de noviembre», de un día "AAAA-MM-DD". */
export function diaEnTexto(dia: string): string {
  return DIA_LARGO.format(enFecha(dia));
}

/** La próxima clase en la lista: «Hoy, 18:00», «Mañana, 09:00» o «jue, 12 nov, 18:00». Hora de España. */
export function proximaEnCorto(dia: string, desde: string, ahora: Date = new Date()): string {
  const hoy = diaLocal(ahora);
  if (dia === hoy) return `Hoy, ${desde}`;
  if (dia === sumarDias(hoy, 1)) return `Mañana, ${desde}`;
  return `${DIA_CORTO.format(enFecha(dia))}, ${desde}`;
}

/** Quien tiene antes su clase, primero. Sin próxima clase, al final. A igualdad, por nombre. */
export function ordenarPorProximaClase<T extends { nombre: string; empiezaEn: number | null }>(filas: readonly T[]): T[] {
  return [...filas].sort((a, b) => {
    const pa = a.empiezaEn ?? Number.POSITIVE_INFINITY;
    const pb = b.empiezaEn ?? Number.POSITIVE_INFINITY;
    return pa === pb ? a.nombre.localeCompare(b.nombre, "es") : pa - pb;
  });
}

/** El nombre de pila, para hablar del alumno: «lo que viene trabajando Ana». */
export function nombreDePila(nombre: string): string {
  return nombre.trim().split(/\s+/)[0] ?? "";
}

// ---------------------------------------------------------------
// LOS TEXTOS DE LOS ANÁLISIS DE GESTIÓN
//
// `class_summary`, `errors_detected`, `topics_covered` y el foco son texto
// libre escrito por la IA a partir de lo que se habló en clase. Una muestra
// de 257 clases (05/11/2026): 6 resúmenes hablan de pagos y 4 de
// valoraciones. La regla del panel es que el profesor no ve nada de eso,
// así que se quita la FRASE entera.
//
// EL CRITERIO ES ASIMÉTRICO, como en `lib/texto-alumno.ts`: esconder de
// más pierde una frase; enseñar de menos rompe la regla. Si la clase
// trabajó vocabulario de «precios», esa frase se va. No es una garantía:
// es una lista de palabras sobre texto libre.
// ---------------------------------------------------------------

const DE_COBRO = new RegExp(
  String.raw`(?<![\p{L}\p{N}])(pagos?|pagar|pagad[oa]s?|pagó|pagaba|factur\p{L}*|suscripci\p{L}*|cuotas?|importes?|precios?|euros?|reembols\p{L}*|impagos?|renovaci\p{L}*|garant[ií]as?|valoraci\p{L}*|estrellas?|reseñas?|plan(es)? contratad\p{L}*|plan(es)? de \d+|(cambiar|ampliar|bajar|subir) (de |el |su )?plan)(?![\p{L}\p{N}])|€`,
  "iu"
);

/** El texto sin las frases que hablan de cobros, garantía o valoraciones. Vacío si no queda nada. */
export function sinDatosDeCobro(texto: string | null | undefined): string {
  const limpio = (texto ?? "").trim();
  if (limpio === "") return "";
  return limpio
    .split(/(?<=[.!?…])\s+/)
    .filter((frase) => !DE_COBRO.test(frase))
    .join(" ")
    .trim();
}

/**
 * ¿Este `errors_detected` dice algo del alumno? Cuando la grabación no es
 * una clase, el análisis lo escribe ahí: «No aplica…», «No es posible…».
 */
export function esPuntoDeClase(texto: string): boolean {
  const limpio = texto.trim();
  if (limpio === "") return false;
  return !/^no (aplica|procede|es posible|hay |se (ha|han|detect|puede|pueden))/i.test(limpio);
}

/** El texto plano de un enunciado que puede traer HTML, recortado para una línea de la ficha. */
export function enunciadoEnCorto(html: string, maximo = 120): string {
  const plano = html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
  return plano.length > maximo ? `${plano.slice(0, maximo).trimEnd()}…` : plano;
}
