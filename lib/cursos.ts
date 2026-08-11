// ---------------------------------------------------------------
// QUÉ CURSO LE TOCA A CADA ALUMNO
//
// Reglas puras: no consultan nada y no dependen de la base. Quien las
// usa para buscar los cursos de verdad es `lib/cursos-servidor.ts`.
//
// Están separadas a propósito. Decidir qué curso corresponde es la
// regla de negocio que más va a cambiar —cada plan nuevo la toca— y
// mezclarla con las consultas obligaría a levantar Supabase para
// comprobar si un plan de First da acceso al general de B2.
//
// EL ACCESO SALE DEL PLAN, NO DEL NIVEL DECLARADO. El plan es el
// producto que el alumno compró (`assignments.plan` en Gestión, 98% de
// cobertura); el nivel es una etiqueta del perfil. Un alumno con nivel
// B1 que compró la preparación del First necesita el curso del First,
// aunque su nivel diga otra cosa.
// ---------------------------------------------------------------

import { detectarExamen, nivelDeBloque } from "@/lib/perfil";
import type { TipoExamen } from "@/lib/data";

/** Los cuatro niveles que existen como curso. No hay curso de A1. */
export type NivelCurso = "A2" | "B1" | "B2" | "C1";

/**
 * Cómo se identifica un curso sin conocer su id: por lo que es, no por
 * dónde está guardado. `lib/cursos-servidor.ts` traduce esto a filas.
 */
export type ClaveCurso =
  | { tipo: "general"; nivel: NivelCurso }
  | { tipo: "examen"; examen: TipoExamen };

/**
 * El nivel del alumno traducido a nivel de curso.
 *
 * A1 recibe el curso de A2 porque es el más bajo que existe. No es un
 * apaño: un A1 sin curso no vería ninguna sección, y el A2 es el
 * material más cercano que tenemos. `nivelDeBloque` ya normaliza todo
 * lo demás (C2 → C1, valores raros → B1), así que aquí solo queda
 * cerrar ese hueco.
 */
export function nivelDeCurso(nivel: string): NivelCurso {
  const base = nivelDeBloque(nivel);
  return base === "A1" ? "A2" : base;
}

/**
 * Los cursos a los que tiene acceso un alumno, en orden de relevancia.
 *
 * Un plan de examen devuelve DOS: el del examen y el general de su
 * nivel. Quien prepara el First quiere las dos cosas —el formato del
 * examen y la base del idioma— y darle solo una de ellas es decidir por
 * él cuál necesita.
 *
 * Devuelve el examen primero porque es lo específico de su plan; el
 * banner del inicio no usa este orden para elegir cuál enseñar, sino
 * cuál tiene progreso más reciente.
 *
 * Puede devolver una clave para la que no exista curso: `detectarExamen`
 * reconoce IELTS y no hay curso de IELTS. Se resuelve solo, porque quien
 * busca las filas no encuentra ninguna y se queda con el general.
 */
export function cursosDelAlumno(plan: string, nivel: string): ClaveCurso[] {
  const general: ClaveCurso = { tipo: "general", nivel: nivelDeCurso(nivel) };
  const examen = detectarExamen(plan);

  if (!examen) return [general];
  return [{ tipo: "examen", examen }, general];
}

/**
 * Etiqueta corta para la interfaz. Los nombres largos de Cambridge no
 * caben en una línea de apoyo y el alumno los conoce por las siglas.
 */
export function nombreCortoExamen(examen: TipoExamen): string {
  if (examen === "b2_first") return "First (B2)";
  if (examen === "b1_preliminary") return "Preliminary (B1)";
  if (examen === "c1_advanced") return "Advanced (C1)";
  return "IELTS";
}

/**
 * ¿Esta clave describe a este curso? Lo usa la capa de consultas para
 * emparejar las claves con las filas de `cursos`.
 */
export function claveCoincide(
  clave: ClaveCurso,
  curso: { tipo: string; nivel: string; examen: string | null }
): boolean {
  if (clave.tipo === "general") {
    return curso.tipo === "general" && curso.nivel === clave.nivel;
  }
  return curso.tipo === "examen" && curso.examen === clave.examen;
}
