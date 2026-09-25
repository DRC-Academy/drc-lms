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

export type EstadisticasAlumno = {
  /**
   * El curso principal, con el cálculo del diploma (`calcularDiploma`):
   * mismo curso, mismas lecciones, mismo porcentaje. Null sin curso.
   */
  curso: {
    titulo: string;
    completadas: number;
    total: number;
    /** Del curso entero: el anillo de la barra plegada y el diploma. */
    porcentaje: number;
    /**
     * De lo que el drip ya ha abierto: el anillo «Curso» de «Cómo vas».
     * 100 cuando ha hecho todo lo que tiene abierto.
     */
    porcentajeDesbloqueado: number;
  } | null;
  /**
   * El tiempo de curso: semanas que quedan de las 24 del temario,
   * contadas desde que empezó con la academia. Null sin fecha de inicio
   * o con el tiempo ya cumplido: entonces no hay nada que contar.
   */
  tiempo: { semanasRestantes: number; semanasTotales: number } | null;
  /** El nombre de pila del profesor, para «con Sebastian». */
  profesor: string | null;
  /**
   * El nivel, como lo enseña «Mi progreso». `fiable` falso añade la nota
   * de «estimado»: el nivel viene de la casilla del alta y nadie lo ha
   * medido. Null sin nivel reconocible.
   */
  nivel: { valor: string; fiable: boolean } | null;
  /** `clasesContadas`, de `vista_clases_contadas`. */
  clases: number | null;
  /** Ejercicios distintos del curso respondidos. */
  ejercicios: number | null;
};
