import type { MesTemario } from "@/lib/temario";

// ---------------------------------------------------------------
// QUÉ CELEBRA, Y CUÁNTO
//
// La aplicación celebra, y este módulo es lo único que decide cuánto.
// Existe porque la pregunta difícil de la gamificación no es qué efecto
// usar: es a QUÉ se le pone efecto. Sin un sitio donde esté escrito,
// cada componente se inventa su propia intensidad y en tres meses la
// aplicación entera vibra.
//
// LA ESCALA SE DECIDE POR FRECUENCIA, NO POR IMPORTANCIA. Es la
// distinción que sostiene todo lo demás. Terminar una lección es
// importante y pasa 187 veces por curso; sacar el diploma es importante
// y pasa una. Si las dos cosas celebran igual, la que pasa 187 veces se
// come a la otra —y deja de ser una celebración para convertirse en un
// peaje que hay que pagar antes de seguir estudiando—.
//
// Puesto al revés: el presupuesto de celebración de un producto es
// fijo. Gastarlo en lo frecuente es gastarlo en lo que menos se
// agradece.
//
// DE DÓNDE SALE CADA ESCALÓN. No de una opinión: de contar cuántas
// veces lo ve un alumno en un curso de 187 lecciones y seis meses.
//
//   · Lección — 187 veces.  Avanza la barra y cambia la cifra. Nada más.
//   · Bloque  — ~26 al curso. El acuse de la ruta: el camino llega más
//     lejos.
//   · Mes     — 6 veces.    El nodo del sendero se cierra en verde.
//   · Diploma — 1 vez.      Puesta en escena. Es el único momento del
//     producto que se ha ganado el derecho a durar más de un segundo.
//
// TRES ESCALONES Y NO CUATRO, desde que se quitó la cartilla de sellos.
// Tuvo un cuarto —«sello»— para el cierre de mes, con una casilla que
// se estampaba. La cartilla se retiró porque no añadía nada que el
// sendero no dijera ya, y el escalón se fue con ella: un mes cerrado
// ahora se celebra cerrando su nodo, que es un `acuse`. Se anota aquí
// porque un escalón sin sitio donde ocurrir es una abstracción muerta,
// y esas se quedan años.
//
// Lo de arriba SUSTITUYE a la regla que decía «no hay premio, hay
// avance» y que estuvo escrita en `globals.css` y en `lib/diploma.ts`.
// No se cayó por gusto: se cambió a sabiendas, y lo que la reemplaza es
// esta escala. La frase vieja sigue valiendo en un sitio —cerrar una
// parada de la ruta— porque cae del lado frecuente, no porque quede
// alguna excepción sin decidir.
//
// Módulo puro: quien llama le pasa lo que ya ha leído.
// ---------------------------------------------------------------

/**
 * Cuánto se mueve la pantalla al conseguir algo.
 *
 * Ordenado de menos a más. Solo hay tres a propósito: con seis, la
 * diferencia entre dos contiguos deja de verse y vuelve a decidirla
 * quien pinta.
 */
export type Escalon =
  /** Nada se mueve. Lo que pasa muy a menudo no se celebra. */
  | "ninguno"
  /** Cambia el dato: la barra avanza, el nodo se cierra. Informa. */
  | "acuse"
  /** Puesta en escena. Una vez por curso. */
  | "escena";

export type Logro =
  | { tipo: "leccion" }
  | { tipo: "bloque" }
  | { tipo: "mes"; numero: number }
  | { tipo: "diploma" };

/**
 * El escalón que le toca a un logro.
 *
 * Es un `switch` de cuatro casos y podría estar en línea en cualquier
 * componente. Está aquí para que la escala se lea entera de una vez:
 * repartida, nadie ve que la lección no celebra PORQUE el diploma sí.
 */
export function escalonDe(logro: Logro): Escalon {
  switch (logro.tipo) {
    case "leccion":
    case "bloque":
    case "mes":
      return "acuse";
    case "diploma":
      return "escena";
  }
}

// ---------------------------------------------------------------
// LOS HITOS DEL CURSO
//
// Un hito por mes: el grano en el que se dibuja el sendero del inicio.
// Sale ENTERO de `Temario.meses`, que ya se lee para pintar el temario,
// así que no cuesta ninguna consulta donde ese dato ya está.
//
// SE LLAMABA `cartilla` Y DEVOLVÍA `Sello[]`, cuando alimentaba una
// cartilla de sellos que ya no existe. El cálculo es el mismo y el
// nombre no: una función que se llama como la pantalla que la usaba
// manda al siguiente que la lea a buscar una pantalla que no está.
//
// SEIS Y NO CIENTO OCHENTA Y SIETE. Un nodo por lección sería un
// gráfico de densidad, no un camino: a esa escala no se distingue dónde
// estás, que es justo lo único que el sendero tiene que decir.
// ---------------------------------------------------------------

export type Hito = {
  mes: number;
  /** Qué enseña el nodo. */
  estado: "hecho" | "en-curso" | "pendiente";
  /** Relleno del mes en curso, 0-100. Los otros dos no lo usan. */
  porcentaje: number;
};

export function hitos(meses: MesTemario[]): Hito[] {
  return meses.map((mes) => ({
    mes: mes.numero,
    estado:
      mes.estado === "completado" ? "hecho" : mes.estado === "en-curso" ? "en-curso" : "pendiente",
    porcentaje: mes.porcentaje,
  }));
}

// ---------------------------------------------------------------
// LAS TRES QUE FALTAN, Y QUÉ HACE FALTA PARA CADA UNA
//
// Racha, puntos e insignias están decididas pero NO implementadas, y no
// por falta de ganas: ninguna de las tres sale de los datos que hay.
// Queda anotado aquí, que es donde se va a mirar el día que se hagan.
//
// 1 · RACHA — «semanas con clase», nunca «días seguidos».
//
//    La versión de días seguidos es la que compite con el profesor: le
//    dice al alumno que entre todos los días, cuando lo que de verdad
//    hace avanzar su inglés es la clase de la semana. Contada por
//    semanas con clase analizada, la racha empuja a lo mismo que empuja
//    la academia y no castiga irse de vacaciones.
//
//    HACE FALTA: nada nuevo en la base, pero sí una consulta que hoy no
//    existe —el histórico de `fechaClase` por alumno, agrupado por
//    semana—. Se lee de Gestión, que ya se consulta para `ultimaClase`.
//
//    OJO CON EL HISTÓRICO: constan 78 finalizaciones de curso de 21
//    alumnos sin importar de LearnDash (ver `lib/diploma.ts`). Cualquier
//    racha calculada antes de esa importación sale mal para justo los
//    alumnos más antiguos, que son los que peor se lo tomarían.
//
// 2 · PUNTOS — tabla nueva, y la más discutible de las tres.
//
//    No hay una unidad natural en este producto: una lección de
//    gramática y un bloque de diez ejercicios no valen lo mismo y nadie
//    ha decidido cuánto. Y compite de frente con el diploma, que es una
//    credencial de verdad: dos monedas en la misma pantalla y gana la
//    que da recompensa antes.
//
//    HACE FALTA: tabla `puntos_alumno`, una escritura por cada evento
//    que puntúe, y una decisión de producto sobre el baremo. Es la
//    única de las tres que yo dejaría para el final.
//
// 3 · INSIGNIAS — tabla nueva más una taxonomía que hay que mantener.
//
//    El coste no es la tabla: es que alguien decida qué se premia y
//    siga decidiéndolo cada vez que cambie el temario. Una insignia sin
//    dueño se queda obsoleta y se nota más que no tenerla.
//
//    HACE FALTA: tablas `insignias` y `insignias_alumno`, y las reglas
//    de concesión evaluadas en el servidor —nunca en el cliente, que es
//    donde se falsifican—.
//
// LAS TRES ENTRAN EN LA ESCALA DE ARRIBA cuando existan: la racha es
// `acuse` —es un dato, no un premio—, una insignia también, y nada de
// esto llega a `escena`, que se queda para el diploma.
// ---------------------------------------------------------------
