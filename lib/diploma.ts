// ---------------------------------------------------------------
// EL DIPLOMA
//
// La palanca de retención más comprobada que tiene la academia: hay
// alumnos que no se dan de baja porque el mes siguiente sacan el
// diploma. Por eso el progreso hacia él va en el inicio y no escondido
// dentro del curso.
//
// EL DIPLOMA ES AHORA LA CIFRA DE LA FRANJA, no una fila debajo. Vivió
// en un anillo de 124px en la columna derecha, luego en una fila de 50
// bajo la franja, y ese último sitio tenía un problema que no era de
// tamaño: la franja decía "llevas 12 de 191 lecciones" y la fila, dos
// centímetros más abajo, "179 lecciones para tu diploma". El mismo hecho
// contado dos veces y con dos aritméticas distintas, que es la forma más
// rápida de que no se crea ninguna de las dos.
//
// Al ocupar la cifra de la franja, el diploma pasa a estar dentro del
// elemento más prominente de la pantalla, a 40px y en tinta, y ADEMÁS
// pegado al botón que lo acerca. No cuesta un solo píxel de alto: se
// queda con el sitio que ya ocupaba el porcentaje.
//
// EL EMBUDO SON TRES PASOS Y CADA UNO ES UN DATO DISTINTO:
//
//   1. LA META, en la franja: "179 lecciones para tu diploma".
//   2. EL PASO DE ESTA SEMANA, en la fila de debajo: "4 lecciones para
//      cerrar este módulo". Sale de `hito`, en `lib/cursos-servidor.ts`.
//   3. LA ACCIÓN, el botón de la franja: la lección exacta donde se
//      quedó.
//
// El paso intermedio es el que faltaba. Una meta a 179 lecciones no
// mueve a nadie un martes; a 4 sí, y esas 4 son las que descuentan de
// las 179. Sin él, el diploma era una cifra bonita y un callejón.
//
// SE OTORGA AL COMPLETAR EL CURSO ENTERO, el 100% de sus lecciones. Es
// el mismo criterio que LearnDash, donde los siete cursos apuntan al
// certificado 25559 y no hay umbral porcentual: los umbrales existen en
// los quizzes, no en los cursos.
//
// SE CUENTA LO QUE FALTA, NO EL PORCENTAJE. "Te faltan 12 lecciones"
// y "llevas el 68%" son el mismo dato, pero el primero se puede terminar
// y el segundo solo se puede mirar. Doce es una tarde; el 68% no es
// nada. El porcentaje sobrevive como relleno de la barra y de las
// marcas, donde no se lee como número sino como distancia.
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
// Módulo puro: quien llama le pasa los números ya leídos.
// ---------------------------------------------------------------

import type { HitoModulo } from "@/lib/cursos-servidor";

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
// PASO 1 · LA META, EN LA CIFRA DE LA FRANJA
//
// La forma la impone el sitio: una columna de 190 a 210px con un número
// enorme arriba. Así que no hay titular ni párrafo, hay una CIFRA, la
// palabra que la acompaña, la meta en una línea y un pie.
//
// Se redacta aquí y no en el componente por lo mismo que las esperas de
// la generación: depende de datos y de reglas, y el componente solo
// pinta. Aquí además se lee entero de una vez, que es lo que hace falta
// para revisar el tono sin abrir tres archivos.
// ---------------------------------------------------------------

export type TextoDiploma = {
  /**
   * El número grande. Null en "conseguido", que enseña un sello en su
   * lugar: ahí no falta nada que contar.
   */
  cifra: number | null;
  /** Pegada a la cifra, en pequeño. Concuerda con ella. */
  unidad: string;
  /** La línea de debajo: qué son esas lecciones. */
  meta: string;
  /** Al pie, bajo las marcas: por dónde va. */
  pie: string;
};

export function textoDiploma(estado: EstadoDiploma): TextoDiploma | null {
  if (estado.estado === "sin-curso") return null;

  if (estado.estado === "conseguido") {
    return {
      cifra: null,
      unidad: "",
      meta: "Diploma conseguido",
      pie: `${estado.total} lecciones, todas hechas`,
    };
  }

  return {
    cifra: estado.restantes,
    unidad: estado.restantes === 1 ? "lección" : "lecciones",
    meta: "para tu diploma",
    // El avance, en la aritmética de siempre. No repite a la cifra: una
    // dice lo que falta y esta dónde estás, y juntas cierran la cuenta.
    pie: estado.sinEmpezar
      ? `${estado.total} lecciones por delante`
      : `llevas ${estado.completadas} de ${estado.total}`,
  };
}

/**
 * Lo que acompaña al botón dentro de la franja.
 *
 * Una línea corta cuyo único trabajo es decir que ESE botón es lo que
 * mueve ESA cifra. Sin ella, la lección de la izquierda y el diploma de
 * la derecha se leen como dos cosas que comparten caja.
 *
 * Es además el sitio donde por fin cabe la frase de quien no ha empezado
 * —estaba escrita y sin pintar en ninguna parte—: al lado del botón, que
 * es justo a quien se refiere.
 */
export function apoyoDiploma(estado: EstadoDiploma): string | null {
  if (estado.estado !== "en-curso") return null;
  if (estado.sinEmpezar) return "Empieza por la primera y esto se va llenando solo";
  return estado.restantes === 1 ? "Es la última que te queda" : "Cada lección te acerca una";
}

// ---------------------------------------------------------------
// PASO 2 · EL HITO, EN LA FILA DE DEBAJO
//
// Es la mitad del embudo que no existía. Ocupa exactamente el mueble que
// tenía la fila del diploma —50px, sello, barra y el nombre al final—
// pero cuenta algo que no estaba dicho en ninguna parte: cuánto falta
// para cerrar el módulo en el que estás.
//
// LA BARRA DE AQUÍ ES LA DEL MÓDULO, no la del curso. Es la que se mueve
// de verdad en una sesión: terminar una lección de 191 no mueve un
// píxel, terminar una de 7 mueve un séptimo. Una barra que responde es
// lo que hace que se vuelva mañana.
// ---------------------------------------------------------------

/**
 * Dos formas, porque son dos filas distintas.
 *
 * `paso` es la de siempre: cifra, etiqueta, barra y el módulo al final.
 * `conseguido` no lleva barra —una barra llena al lado de "ya está" no
 * añade nada— y por eso no comparte forma en vez de arrastrar campos
 * que el componente tendría que aprender a ignorar.
 */
export type TextoHito =
  | {
      tipo: "paso";
      /** En negrita, delante de la etiqueta. Null en la última del curso. */
      cifra: number | null;
      etiqueta: string;
      /** Solo donde sobra ancho: de qué módulo hablamos. */
      pie: string;
      /** Relleno de la barra, 0-100. */
      relleno: number;
    }
  | { tipo: "conseguido"; etiqueta: string };

export function textoHito(estado: EstadoDiploma, hito: HitoModulo | null): TextoHito | null {
  if (estado.estado === "sin-curso") return null;

  if (estado.estado === "conseguido") {
    // PROVISIONAL, hasta que exista el botón de descarga.
    //
    // Lo que NO puede hacer este texto: prometer un archivo que se
    // genera, dar una fecha que nadie ha fijado, o mandar al profesor,
    // que no es por donde va a llegar. Lo que sí: reconocer que ha
    // terminado, que es un hecho y es suyo.
    return {
      tipo: "conseguido",
      etiqueta: "El diploma es tuyo. Te contamos enseguida cómo descargarlo.",
    };
  }

  // Sin módulo en curso no hay paso intermedio que enseñar. No debería
  // pasar —si quedan lecciones, alguna tiene módulo— pero antes que
  // inventarse un hito, la fila no se pinta.
  if (hito === null || hito.total === 0) return null;

  const relleno = Math.round((hito.completadas / hito.total) * 100);

  // La última del curso se lleva la fila entera: a una lección del
  // diploma, hablar del módulo es hablar de lo pequeño.
  if (estado.restantes === 1) {
    return { tipo: "paso", cifra: null, etiqueta: "La última. Ya está.", pie: hito.titulo, relleno };
  }

  return {
    tipo: "paso",
    cifra: hito.restantes,
    etiqueta: estado.sinEmpezar ? "para cerrar tu primer módulo" : "para cerrar este módulo",
    pie: hito.titulo,
    relleno,
  };
}
