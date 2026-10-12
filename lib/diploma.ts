import type { PerfilAlumno } from "@/lib/data";
import { calcularPlazo, comoDia, sumarMeses, MESES_DE_CURSO } from "@/lib/diploma-plazo";
import { mesesTranscurridos } from "@/lib/meses-landing";
import { diaLocal } from "@/lib/fechas";

// ---------------------------------------------------------------
// EL DIPLOMA SE CONSIGUE CON EL TIEMPO: SEIS MESES DE CALENDARIO
//
// Decidido el 12/10/2026. La condición es la de la landing de
// drcacademy.com y la de la ficha de Gestión: seis meses desde
// `vista_perfil_alumno.fecha_inicio`. Las lecciones NO son requisito;
// se enseñan como dato secundario, nunca como lo que falta.
//
// `progresoDiploma` ES EL ÚNICO CÁLCULO de ese avance. Lo leen la
// página «Mi diploma», la tarjeta del inicio y la de «Mi curso», la de
// «Mi progreso», «Cómo vas» (barra lateral y hoja del perfil) y la
// landing (`/api/wp/progreso-diploma`). Por debajo, el mismo reloj que
// Gestión: `calcularPlazo` y `mesesTranscurridos`, que suman meses con
// `sumarMeses` y cuentan días de Madrid. No hay otro.
//
// EL DÍA SE CUMPLE, NO SE PASA. «Conseguido» empieza el mismo día en que
// se cumplen los seis meses —la landing dice 6 ese día— y sigue después:
// pasada la fecha no hay «vencido», el diploma ya es suyo.
//
// SIN FECHA DE INICIO, NULL. No es un cero: quien llama enseña un
// mensaje neutro, nunca «0 de 6».
//
// LA APERTURA PROGRESIVA DEL CURSO (el drip, `lib/drip.ts`) es otra cosa
// y no se toca: sigue con sus 24 semanas. Esto es solo lo que se ENSEÑA.
// ---------------------------------------------------------------

export type TramoDiploma = "empezando" | "a-mitad" | "recta-final" | "conseguido";

export type ProgresoDiploma = {
  /** Meses de calendario cumplidos, de 0 a 6. Es la cifra de «X de 6 meses». */
  meses: number;
  mesesTotales: number;
  /** Relleno de la barra, 0-100, por días: se mueve cada día y no a saltos de mes. */
  porcentaje: number;
  /** Días naturales hasta la fecha prevista. 0 el día del diploma y después. */
  diasRestantes: number;
  /** La cuenta atrás en meses y días sueltos (`calcularPlazo`). 0 y 0 cuando ya está. */
  cuenta: { meses: number; dias: number };
  /** AAAA-MM-DD: inicio + 6 meses, acotado a fin de mes. */
  fechaPrevista: string;
  tramo: TramoDiploma;
};

const DIA_MS = 86_400_000;

/**
 * El avance hacia el diploma a día `hoy`, o null sin fecha de inicio
 * válida. Una fecha de inicio futura cuenta como «empezando» con cero.
 */
export function progresoDiploma(
  perfil: Pick<PerfilAlumno, "fechaInicio"> | null | undefined,
  hoy: Date
): ProgresoDiploma | null {
  const inicio = comoDia(perfil?.fechaInicio);
  if (!inicio) return null;
  const plazo = calcularPlazo(inicio, diaLocal(hoy));
  if (!plazo) return null;

  const fechaPrevista = sumarMeses(inicio, MESES_DE_CURSO);
  const meses = mesesTranscurridos(inicio, hoy);
  const diasRestantes = Math.max(0, plazo.dias);
  const totalDias = Math.round((Date.parse(`${fechaPrevista}T00:00:00Z`) - Date.parse(`${inicio}T00:00:00Z`)) / DIA_MS);
  const porcentaje =
    diasRestantes === 0 ? 100 : Math.min(99, Math.max(0, Math.floor(((totalDias - diasRestantes) / totalDias) * 100)));

  const tramo: TramoDiploma =
    diasRestantes === 0 ? "conseguido" : meses >= 4 ? "recta-final" : meses >= 2 ? "a-mitad" : "empezando";

  return {
    meses,
    mesesTotales: MESES_DE_CURSO,
    porcentaje,
    diasRestantes,
    cuenta: diasRestantes === 0 ? { meses: 0, dias: 0 } : { meses: plazo.meses, dias: plazo.diasSueltos },
    fechaPrevista,
    tramo,
  };
}

// ---------------------------------------------------------------
// LAS LECCIONES DEL CURSO
//
// Lo que sigue es la cuenta de lecciones del curso principal. Hasta el
// 12/10/2026 era la condición del diploma; desde entonces es un dato
// secundario («12 lecciones hechas») y lo que usan los avisos por
// correo y `/api/externo/diploma`. Las notas de abajo son de entonces.
//
// ---------------------------------------------------------------
// EL DIPLOMA (por lecciones, hasta el 12/10/2026)
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
