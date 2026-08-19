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

// ---------------------------------------------------------------
// LO QUE SE LEÍA DENTRO DEL ANILLO
//
// Aquí vivía `textoDiploma`, que redactaba los cuatro estados con la
// regla de comunicar lo que FALTA y nunca el porcentaje: «te faltan 81
// lecciones para tu diploma», «te falta 1, la última», «tu diploma son
// 187 lecciones», «curso completado».
//
// Se ha ido con la fila del diploma. Lo que la sustituye —la barra fina
// y fija de `components/BarraDiploma.tsx`— cuenta la fracción, «16 de
// 191 lecciones», porque acompaña en todas las pantallas en vez de
// empujar en una: una barra repitiendo «te faltan 81» todo el rato y en
// todas partes se lee como una deuda.
//
// EL CAMBIO TIENE UN COSTE y conviene tenerlo escrito: la formulación
// motivadora ya no aparece en ningún sitio del producto. Si se quiere
// recuperar, está en el historial —era este archivo— y la barra puede
// decirlo con un cambio de una línea.
// ---------------------------------------------------------------
