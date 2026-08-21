// ---------------------------------------------------------------
// EL DIPLOMA
//
// La palanca de retención más comprobada que tiene la academia: hay
// alumnos que no se dan de baja porque el mes siguiente sacan el
// diploma. Por eso el progreso hacia él va en el inicio y no escondido
// dentro del curso.
//
// TIENE BANNER PROPIO. Ha vivido en un anillo de 124px en la columna
// derecha, en una fila de 50px bajo la franja y, un rato, dentro de la
// franja como su cifra grande. Ninguno de los tres funcionaba por la
// misma razón: compartía caja con el curso, así que se leía como un
// dato del curso y no como la meta de la que cuelga todo lo demás.
//
// Ahora es una pieza aparte, a lo ancho, entre el saludo y la rejilla:
// lo primero que se ve al entrar. Y con superficie propia —crema con
// doble filete, la única de ese color en la pantalla— para que se
// distinga de la franja en tinta y de las tarjetas blancas sin robarle
// el verde de acción a ningún botón. El ámbar se queda de acento, que
// es su papel en el resto de la aplicación.
//
// LA FRANJA SE QUEDÓ SIN SU COLUMNA DE CIFRA, y es la otra mitad del
// cambio. Mientras el diploma contaba lo que falta y la franja lo que
// llevas, la pantalla tenía dos cuentas del mismo avance a dos
// centímetros. Ahora el progreso vive en un solo sitio.
//
// SE OTORGA AL COMPLETAR EL CURSO ENTERO, el 100% de sus lecciones. Es
// el mismo criterio que LearnDash, donde los siete cursos apuntan al
// certificado 25559 y no hay umbral porcentual: los umbrales existen en
// los quizzes, no en los cursos.
//
// SE CUENTA LO QUE FALTA, NO EL PORCENTAJE. "Te faltan 12 lecciones"
// y "llevas el 68%" son el mismo dato, pero el primero se puede terminar
// y el segundo solo se puede mirar. Doce es una tarde; el 68% no es
// nada. El porcentaje sobrevive como relleno de la barra, donde no se
// lee como número sino como distancia.
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
//
//      Cuando exista, el botón va DENTRO de este banner: es la única
//      pieza de la pantalla que habla del diploma, y ahora tiene sitio
//      para un botón sin quitárselo a nada.
// ---------------------------------------------------------------
//
// Módulo puro: quien llama le pasa los números ya leídos.
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
      /** Solo para el relleno de la barra. No se escribe en pantalla. */
      porcentaje: number;
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
  };
}

// ---------------------------------------------------------------
// LO QUE SE LEE EN EL BANNER
//
// Se redacta aquí y no en el componente por lo mismo que las esperas de
// la generación: depende de datos y de reglas, y el componente solo
// pinta. Aquí además se lee entero de una vez, que es lo que hace falta
// para revisar el tono sin abrir tres archivos.
//
// UNA LÍNEA Y NADA MÁS: "12 lecciones para tu diploma". El banner tuvo
// también un pie con el avance ("llevas 12 de 191"), una nota lateral
// que explicaba cuándo se emite y el nombre del curso en la etiqueta.
// Cuatro textos para un dato que se entiende sin ninguno.
//
// Y los cuatro decían cosas que ya están dichas: el avance lo enseña la
// barra, el nombre del curso lo dice la franja de debajo, y la regla de
// emisión —el curso entero— no cambia nada de lo que el alumno puede
// hacer hoy. Lo que sí cambia algo es el número, y por eso se queda solo.
//
// SIGUE HABIENDO CUATRO ESTADOS, aunque ya no cuatro tonos: quien no ha
// empezado, quien va por la mitad, a quien le queda una y quien ya lo
// tiene. La diferencia entre los tres primeros la carga el número, que
// es donde se ve de verdad.
// ---------------------------------------------------------------

export type TextoDiploma = {
  /**
   * El número grande. Null en "conseguido", que enseña una frase en su
   * lugar: ahí no falta nada que contar, y un "0" se leería como una
   * carencia justo en el momento del logro.
   */
  cifra: number | null;
  /** Pegada a la cifra, o sola cuando no hay cifra. Concuerda con ella. */
  unidad: string;
  /** Relleno de la barra, 0-100. */
  relleno: number;
};

export function textoDiploma(estado: EstadoDiploma): TextoDiploma | null {
  if (estado.estado === "sin-curso") return null;

  // PROVISIONAL, hasta que exista el botón de descarga: reconoce el
  // logro y no promete un archivo que todavía no se genera.
  if (estado.estado === "conseguido") {
    return { cifra: null, unidad: "Diploma conseguido", relleno: 100 };
  }

  return {
    // Sin empezar la cifra es el curso entero. Mismo número que "te
    // faltan todas", contado como lo que es: el tamaño de lo que tiene
    // por delante, no una deuda.
    cifra: estado.restantes,
    unidad: estado.restantes === 1 ? "lección para tu diploma" : "lecciones para tu diploma",
    relleno: estado.porcentaje,
  };
}
