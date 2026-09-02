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
 * EL CURSO QUE LE TOCA A UN ALUMNO. El único sitio del que sale, para
 * toda la aplicación.
 *
 * UN PLAN DE EXAMEN DA EL CURSO DEL EXAMEN Y NADA MÁS. Quien compró la
 * preparación del First entra al curso del First; no ve el general de
 * B2. El plan es el producto que el alumno compró, y ese producto es la
 * preparación de un examen concreto: darle además el general es
 * regalarle un curso que no ha comprado y, sobre todo, repartir su
 * atención entre dos temarios de seis meses cuando tiene una fecha de
 * examen encima.
 *
 * Antes devolvía los dos. El motivo escrito era que «quien prepara el
 * First quiere las dos cosas y darle una es decidir por él». Se decide
 * igual en los dos sentidos: darle los dos también es decidir por él, y
 * encima es la opción que le esconde cuál de los dos es el suyo. Si un
 * alumno concreto necesita además el general, existe `accesos_manuales`,
 * que es exactamente para eso y deja constancia de quién se lo dio.
 *
 * PARA UN PLAN DE EXAMEN, EL NIVEL DEJA DE DECIDIR NADA. Son 57 de 183
 * alumnos —26 Preliminary, 23 First, 8 Advanced— cuyo curso ya no
 * depende de `nivel`, que es la columna que en 7 de cada 10 alumnos
 * nadie ha confirmado nunca (ver `lib/estimacion.ts`). Su curso sale del
 * producto que compraron, con un 98% de cobertura. El nivel solo se mira
 * en la reserva de aquí abajo.
 *
 * LA RESERVA, y no es un apaño: `detectarExamen` reconoce IELTS y no hay
 * curso de IELTS. Sin esta red, un plan de IELTS daría CERO cursos, que
 * es peor que darle el general. Hoy no hay ningún alumno de IELTS —los
 * tres exámenes con alumnos tienen curso—, así que no se usa nunca:
 * está para el día que entre uno, no para los de ahora.
 *
 * RECIBE EL CATÁLOGO Y DEVUELVE FILAS a propósito. Antes devolvía claves
 * y CUATRO sitios —`cursos-servidor`, `avisos-servidor`,
 * `accesos-manuales` y `admin-servidor`— repetían el mismo bucle para
 * convertirlas en cursos. Con el bucle repetido cuatro veces, «el examen
 * y nada más» habría que acertarlo cuatro veces, y el quinto sitio que
 * se escriba lo volvería a hacer mal. Es el mismo fallo que ya costó
 * caro con el nivel: una regla que cada pantalla reimplementa no es una
 * regla. Aquí se decide entera y los cuatro reciben la lista hecha.
 *
 * Sigue devolviendo una lista y no un curso suelto porque quien la
 * recibe le suma después los accesos manuales, y porque un plan sin
 * curso ni reserva tiene que poder devolver ninguno.
 */
export function cursosDelPlan<T extends { tipo: string; nivel: string; examen: string | null }>(
  plan: string,
  nivel: string,
  disponibles: T[]
): T[] {
  const examen = detectarExamen(plan);

  if (examen) {
    const suyo = disponibles.find((curso) => claveCoincide({ tipo: "examen", examen }, curso));
    if (suyo) return [suyo];
  }

  const general = disponibles.find((curso) =>
    claveCoincide({ tipo: "general", nivel: nivelDeCurso(nivel) }, curso)
  );

  return general ? [general] : [];
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
