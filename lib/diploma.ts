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
// nada. El porcentaje sigue existiendo para rellenar el anillo, que
// necesita una fracción, pero no se escribe en ninguna parte.
//
// SOBRE EL DENOMINADOR. Son las lecciones del curso ENTERO, no las que
// la apertura progresiva tiene desbloqueadas hoy. Es lo que ya devuelve
// `estadoDelCurso`, y es lo correcto: el diploma no se acerca porque se
// abra un módulo nuevo.
//
// LO QUE ESTO TODAVÍA NO HACE: no concede nada, no genera ningún archivo
// y no hay botón. El diploma se va a descargar desde la propia
// aplicación, pero el diseño no está y nada de eso existe aún.
//
// De ahí el tono del estado "conseguido". No promete un archivo que no
// hay, no da una fecha que nadie ha fijado y no manda al profesor, que
// no es el camino: reconoce el logro y deja la puerta abierta. Es un
// texto provisional y se cambia el día que exista el botón.
//
// Y hay otra cosa que no hace: importar la historia de LearnDash, donde
// constan 78 finalizaciones de curso de 21 alumnos. Mientras no se
// importe, alguno de ellos puede ver aquí que le faltan lecciones.
//
// ---------------------------------------------------------------
// LO QUE HARÁ FALTA CUANDO LLEGUE EL DISEÑO
//
// Anotado aquí y no en un ticket porque es donde se va a mirar. Cuatro
// piezas, ninguna resuelta:
//
//   1. QUÉ DATOS LLEVA. Nombre del alumno, curso, nivel MCER y fecha de
//      finalización. Los tres primeros están: `vista_perfil_alumno` da
//      nombre y nivel, y `cursos` el título. La FECHA NO: hoy solo se
//      sabe cuándo se completó cada lección, así que la del diploma es
//      el `completada_en` más reciente del curso —dato que ya se lee en
//      `estadoDelCurso` como `ultimaActividad`— o una columna nueva el
//      día que se registre la finalización como hecho propio. Ojo con
//      las 4.073 filas migradas de LearnDash: su fecha es la del volcado
//      en muchos casos, no la del día en que el alumno terminó.
//
//   2. CÓMO SE GENERA EL ARCHIVO. LearnDash lo hacía con una plantilla
//      HTML y un motor de PDF (el certificado 25559, A4 apaisado). Aquí
//      hay dos caminos: servir una página imprimible y dejar que el
//      navegador haga el PDF —cero dependencias, que es la regla de este
//      proyecto, pero el resultado depende del navegador— o generar el
//      PDF en el servidor, que obliga a meter una librería y a caber en
//      el techo de 60 segundos del plan. Empezar por lo primero.
//
//   3. DÓNDE VIVE. Si se genera al vuelo no vive en ningún sitio y se
//      recalcula en cada descarga, que para un documento que cambia solo
//      cuando cambia el nombre del alumno es lo más barato. Si se
//      guarda, hace falta almacenamiento —que este proyecto no tiene— y
//      decidir qué pasa cuando se corrige un nombre mal escrito.
//
//   4. QUIÉN PUEDE DESCARGARLO. La misma comprobación que el resto de
//      la ficha: la cookie firmada, y que el curso del diploma sea suyo
//      y esté al 100%. Un diploma es un documento con el nombre de una
//      persona; que se descargue con solo adivinar una URL no vale.
// ---------------------------------------------------------------
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
 * Lo que se lee dentro del anillo.
 *
 * Se redacta aquí y no en el componente por lo mismo que las esperas de
 * la generación: depende de datos y de reglas, y el componente solo
 * pinta. Aquí además se lee entero de una vez, que es lo que hace falta
 * para revisar el tono sin abrir tres archivos.
 *
 * LA FORMA LA IMPONE EL SITIO. Esto vivía en un banner ancho y ahora
 * vive en una columna de 340px con un círculo dentro, así que ya no hay
 * un titular y una nota: hay una CIFRA —la que va en el centro del
 * anillo— y dos líneas cortas debajo. Un titular de siete palabras aquí
 * se parte en cuatro renglones.
 */
export type TextoDiploma = {
  /**
   * El número grande del centro. Null en "conseguido", que enseña un
   * sello en su lugar: ahí no falta nada que contar.
   */
  cifra: number | null;
  /** Justo debajo de la cifra. Concuerda con ella en singular y plural. */
  etiqueta: string;
  /** En pequeño, al pie: el curso del que hablamos. */
  pie: string;
  /** Una línea más, solo donde aporta. Null en el estado corriente. */
  extra: string | null;
};

export function textoDiploma(estado: EstadoDiploma, tituloCurso: string): TextoDiploma | null {
  if (estado.estado === "sin-curso") return null;

  if (estado.estado === "conseguido") {
    // PROVISIONAL, hasta que exista el botón de descarga.
    //
    // Lo que NO puede hacer este texto: prometer un archivo que no se
    // genera, dar una fecha que nadie ha fijado, o mandar al profesor,
    // que no es por donde va a llegar. Lo que sí: reconocer que ha
    // terminado, que es un hecho y es suyo.
    //
    // "Es tuyo" y no "está en camino" a propósito: lo segundo es una
    // promesa con fecha implícita, y quien la lea el lunes preguntará el
    // martes.
    return {
      cifra: null,
      etiqueta: "Curso completado",
      pie: tituloCurso,
      extra: "El diploma es tuyo. Te contamos enseguida cómo descargarlo.",
    };
  }

  const unaSola = estado.restantes === 1;

  if (estado.sinEmpezar) {
    // Mismo número que en curso —no ha hecho ninguna, así que le faltan
    // todas— pero contado como lo que es: el tamaño del curso, no una
    // deuda. La diferencia la carga el pie, porque en el centro no cabe.
    return {
      cifra: estado.total,
      etiqueta: unaSola ? "lección para tu diploma" : "lecciones para tu diploma",
      pie: tituloCurso,
      extra: "Empieza por la primera y esto se va llenando solo.",
    };
  }

  return {
    cifra: estado.restantes,
    etiqueta: unaSola ? "lección para tu diploma" : "lecciones para tu diploma",
    pie: tituloCurso,
    // La última merece que se lo digan. El resto del camino no necesita
    // una frase de ánimo cada vez que abre el inicio.
    extra: unaSola ? "La última. Ya está." : null,
  };
}
