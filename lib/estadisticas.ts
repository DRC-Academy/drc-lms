// ---------------------------------------------------------------
// LAS ESTADÍSTICAS DEL ALUMNO: LA FORMA
//
// Cuatro datos, todos reales, que enseñan la barra lateral de
// escritorio y la fila de tarjetas del inicio en móvil. Los calcula
// `lib/estadisticas-servidor.ts`; esto es solo la forma, sin lecturas,
// para que la barra —que es de cliente— los reciba por props.
//
// LO QUE NO HAY, A PROPÓSITO: nada que se gane por venir a diario, nada
// que se pierda. Solo lo hecho y dónde estás.
//
// Cada campo que no se pudo leer es null y no se pinta. Un cero solo
// aparece cuando de verdad es cero, y entonces se pinta como estado de
// bienvenida, no como cifra.
// ---------------------------------------------------------------

import type { MarcaNivel } from "@/lib/estimacion";
import type { ClasesDelProfesor } from "@/lib/textos/estadisticas";

export type EstadisticasAlumno = {
  /**
   * El curso principal, con el cálculo del diploma (`calcularDiploma`):
   * mismo curso, mismas lecciones, mismo porcentaje. Null sin curso.
   */
  curso: {
    titulo: string;
    completadas: number;
    total: number;
    porcentaje: number;
  } | null;
  /**
   * El tiempo de curso: semanas que quedan de las 24 del temario,
   * contadas desde que empezó con la academia. Cumplido el tiempo,
   * `semanasRestantes` es 0: el temario entero está abierto, y así se
   * dice. Null sin fecha de inicio.
   */
  tiempo: { semanasRestantes: number; semanasTotales: number } | null;
  /**
   * El profesor de la ficha, ya resuelto por `profesorDelAlumno`: el
   * nombre que ve el alumno y cuántas de sus clases ha dado él.
   */
  profesor: ClasesDelProfesor;
  /**
   * El nivel con su marca, de `nivelMostrado`: el mismo que enseña «Mi
   * progreso». `profesor` solo con la marca «profesor». Null sin nivel
   * reconocible.
   */
  nivel: { valor: string; origen: MarcaNivel; profesor: string | null } | null;
  /** `clasesContadas`, de `vista_clases_contadas`. */
  clases: number | null;
  /**
   * Bloques de «Para ti» terminados, uno por bloque aunque se repita
   * (`progreso_bloques`). El anillo «Práctica» de «Cómo vas».
   */
  bloques: number | null;
  /** Ejercicios distintos del curso respondidos. */
  ejercicios: number | null;
};
