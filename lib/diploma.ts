// ---------------------------------------------------------------
// EL DIPLOMA
//
// La palanca de retención más comprobada que tiene la academia: hay
// alumnos que no se dan de baja porque el mes siguiente sacan el
// diploma. Por eso el progreso hacia él va en el inicio y no escondido
// dentro del curso.
//
// SE OTORGA AL COMPLETAR EL CURSO ENTERO, el 100% de sus lecciones. Es
// el mismo criterio que LearnDash, donde los siete cursos apuntan al
// certificado 25559 y no hay umbral porcentual: los umbrales existen en
// los quizzes, no en los cursos.
//
// SE CUENTA LO QUE FALTA, NO EL PORCENTAJE. "Te faltan 12 lecciones"
// y "llevas el 68%" son el mismo dato, pero el primero se puede terminar
// y el segundo solo se puede mirar. Doce es una tarde; el 68% no es
// nada. El porcentaje sigue existiendo para la barra, que necesita un
// ancho, pero no se escribe en ninguna parte.
//
// SOBRE EL DENOMINADOR. Son las lecciones del curso ENTERO, no las que
// la apertura progresiva tiene desbloqueadas hoy. Es lo que ya devuelve
// `estadoDelCurso`, y es lo correcto: el diploma no se acerca porque se
// abra un módulo nuevo.
//
// LO QUE ESTO TODAVÍA NO HACE: no concede nada. En LearnDash hay 78
// finalizaciones de curso registradas, de 21 alumnos, y esa historia no
// está importada. Mientras no lo esté, un alumno que ya tiene su diploma
// emitido allí puede ver aquí que le faltan lecciones. Por eso el estado
// "conseguido" no promete un archivo ni un enlace: dice que el curso
// está terminado y remite al profesor, que es quien lo entrega hoy.
//
// Módulo puro: quien llama le pasa los dos números ya leídos.
// ---------------------------------------------------------------

export type EstadoDiploma =
  /** Sin curso asignado, o con un curso sin lecciones. No hay nada que contar. */
  | { estado: "sin-curso" }
  | {
      estado: "en-curso";
      /** Lo que se enseña. Nunca cero: con cero es "conseguido". */
      restantes: number;
      completadas: number;
      total: number;
      /** Solo para el ancho de la barra. No se escribe en pantalla. */
      porcentaje: number;
      /** Todavía no ha abierto ni una lección. Cambia el tono, no el dato. */
      sinEmpezar: boolean;
    }
  | { estado: "conseguido"; total: number };

export function calcularDiploma(completadas: number, total: number): EstadoDiploma {
  if (total <= 0) return { estado: "sin-curso" };

  // Se acota por arriba: si el progreso migrado trajera más filas que
  // lecciones tiene el curso —pasa cuando una lección se borra del
  // catálogo y su progreso se queda—, "te faltan -3 lecciones" sería la
  // frase más rara de la pantalla.
  const hechas = Math.max(0, Math.min(completadas, total));
  const restantes = total - hechas;

  if (restantes === 0) return { estado: "conseguido", total };

  return {
    estado: "en-curso",
    restantes,
    completadas: hechas,
    total,
    porcentaje: Math.round((hechas / total) * 100),
    sinEmpezar: hechas === 0,
  };
}

/**
 * Lo que se lee en el banner.
 *
 * Se redacta aquí y no en el componente por lo mismo que las esperas de
 * la generación: depende de datos y de reglas, y el componente solo
 * pinta. Aquí además se puede leer entero de una vez, que es lo que hace
 * falta para revisar el tono sin abrir tres archivos.
 */
export type TextoDiploma = { titulo: string; nota: string };

export function textoDiploma(estado: EstadoDiploma, tituloCurso: string): TextoDiploma | null {
  if (estado.estado === "sin-curso") return null;

  if (estado.estado === "conseguido") {
    return {
      // Ni "descárgalo" ni "aquí lo tienes": el LMS no emite nada
      // todavía. Se afirma lo que sí es verdad —el curso está hecho— y
      // se remite a quien lo entrega.
      titulo: "Has terminado tu curso",
      nota: `Las ${estado.total} lecciones de ${tituloCurso}, completas. Habla con tu profesor para recibir tu diploma.`,
    };
  }

  if (estado.sinEmpezar) {
    // A quien no ha empezado, "te faltan 187 lecciones" lo recibe con
    // una cuesta. Se le cuenta el mismo número como lo que es: el tamaño
    // del curso, no una deuda.
    return {
      titulo: `Tu diploma son ${estado.total} lecciones`,
      nota: `Es lo que tiene ${tituloCurso} entero. Empieza por la primera y esto se va llenando solo.`,
    };
  }

  const unaSola = estado.restantes === 1;

  return {
    titulo: unaSola
      ? "Te falta 1 lección para tu diploma"
      : `Te faltan ${estado.restantes} lecciones para tu diploma`,
    nota: unaSola
      ? `La última de ${tituloCurso}. Ya está.`
      : `Llevas ${estado.completadas} de ${estado.total} en ${tituloCurso}.`,
  };
}
