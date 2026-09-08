// ---------------------------------------------------------------
// LA RUTA DE "PARA TI"
//
// El camino con sus paradas: el saludo, los nodos, lo que se pliega, la
// tarjeta de la parada de hoy y lo que se cuenta cuando no hay ninguna.
//
// EL PROFESOR SE NOMBRA SIEMPRE QUE SE SABE, y por eso casi cada frase
// tiene dos versiones: con nombre y sin él. No es un adorno — para el
// alumno, la persona con la que da clase es la mitad del producto— y la
// versión sin nombre existe porque hay alumnos con clases y sin ficha,
// no como texto por defecto.
//
// LA FECHA VA EN EL IDIOMA QUE SE LEE. Estaba fijada a "es-ES" dentro
// del componente; ahora la locale viaja aquí, porque un "lunes, 8 de
// septiembre" encima de una pantalla en inglés es la costura más visible
// de todas.
// ---------------------------------------------------------------

import type { Idioma } from "@/lib/idioma";

export type TextosRuta = {
  /** Para `Intl.DateTimeFormat`: la fecha de hoy sobre el saludo. */
  locale: string;

  // --- el saludo ---
  paraNombre: (nombre: string) => string;
  paraTi: string;
  tuRutaDeEstaSemana: string;
  aquiVaAEstarTuRuta: string;
  saleDeTusClasesCon: (profesor: string) => string;
  saleDeTusClases: string;
  nadieMasTieneEstaRuta: string;

  // --- el rótulo del camino ---
  vasPorLaDe: (actual: number | null, total: number) => string;
  hechasCuenta: (n: number) => string;
  alDia: string;
  estasAqui: string;

  // --- los grupos plegados ---
  plegarLoQueViene: string;
  plegarLasHechas: string;
  vuelvenAUnSoloPunto: string;
  teEsperanAqui: string;
  tocalasParaVerlas: string;

  // --- las paradas ---
  paradaListaParaAbrir: string;
  paradaCerrada: string;
  paradaNumeroTitulo: (numero: number | null, titulo: string) => string;
  prepararLaParada: (numero: number | null) => string;
  seguirLaRuta: string;
  volverAHacerla: string;
  noCambiaLoHecho: string;
  llegasAlCerrar: (numero: number | null) => string;
  llegasSiguiendo: string;

  // --- la parada de hoy ---
  tuUltimaClaseCon: (profesor: string) => string;
  tuUltimaClase: string;
  diezEjerciciosConLoTuyo: string;
  tardaMenosDeUnMinuto: string;

  // --- la que todavía no existe ---
  seAbreConTuProximaClase: string;
  laPreparaCuandoSuba: (profesor: string) => string;
  tuProfesorLaPrepara: string;
  noTienesQueHacerNada: string;

  // --- sin ruta todavía ---
  tuRutaEmpieza: string;
  preparandoTuPrimeraParada: string;
  enMenosDeUnMinuto: string;
  encuantoAnalice: (profesor: string) => string;
  encuantoAnaliceSinProfesor: string;

  // --- ruta al día ---
  rutaAlDia: string;
  tuRuta: string;
  paradaUno: string;
  teHasHechoLaParada: string;
  teHasHechoLasParadas: (n: number) => string;
  laSiguienteSaleCon: (profesor: string) => string;
  laSiguienteSale: string;
};

const ES: TextosRuta = {
  locale: "es-ES",

  paraNombre: (nombre) => `Para ${nombre}`,
  paraTi: "Para ti",
  tuRutaDeEstaSemana: "Tu ruta de esta semana",
  aquiVaAEstarTuRuta: "Aquí va a estar tu ruta",
  saleDeTusClasesCon: (profesor) => `Sale de tus clases con ${profesor}.`,
  saleDeTusClases: "Sale de tus clases y de lo que sabemos de ti.",
  nadieMasTieneEstaRuta: "Nadie más en la academia tiene esta ruta.",

  vasPorLaDe: (actual, total) => `vas por la ${actual} de ${total}`,
  hechasCuenta: (n) => `${n} ${n === 1 ? "hecha" : "hechas"}`,
  alDia: "al día",
  estasAqui: "Estás aquí",

  plegarLoQueViene: "Plegar lo que viene",
  plegarLasHechas: "Plegar las hechas",
  vuelvenAUnSoloPunto: "Vuelven a un solo punto",
  teEsperanAqui: "Te esperan aquí",
  tocalasParaVerlas: "Tócalas para verlas en el camino",

  paradaListaParaAbrir: "Parada lista para abrir",
  paradaCerrada: "Parada cerrada: se abre con tu próxima clase",
  paradaNumeroTitulo: (numero, titulo) => `Parada ${numero}: ${titulo}`,
  prepararLaParada: (numero) => `Preparar la parada ${numero}`,
  seguirLaRuta: "Seguir la ruta",
  volverAHacerla: "Volver a hacerla",
  noCambiaLoHecho: "No cambia lo que ya tienes hecho.",
  llegasAlCerrar: (numero) => `Llegas a ella en cuanto cierres la parada ${numero}.`,
  llegasSiguiendo: "Llegas a ella cuando sigas la ruta.",

  tuUltimaClaseCon: (profesor) => `Tu última clase con ${profesor} ya está aquí`,
  tuUltimaClase: "Tu última clase ya está aquí",
  diezEjerciciosConLoTuyo: "Diez ejercicios hechos con lo que sabemos de ti.",
  tardaMenosDeUnMinuto: "Tarda menos de un minuto.",

  seAbreConTuProximaClase: "Se abre con tu próxima clase",
  laPreparaCuandoSuba: (profesor) =>
    `${profesor} la prepara cuando suba lo que trabajéis. Sale de esa clase, así que hasta entonces no existe.`,
  tuProfesorLaPrepara:
    "Tu profesor la prepara cuando suba lo que trabajéis. Sale de esa clase, así que hasta entonces no existe.",
  noTienesQueHacerNada: "No tienes que hacer nada: te la encuentras aquí abierta.",

  tuRutaEmpieza: "Tu ruta empieza con tu primera clase",
  preparandoTuPrimeraParada: "Preparando tu primera parada…",
  enMenosDeUnMinuto: "En menos de un minuto la tienes aquí.",
  encuantoAnalice: (profesor) =>
    `En cuanto ${profesor} analice lo que trabajéis, aparece aquí tu primera parada: diez ejercicios hechos con lo tuyo.`,
  encuantoAnaliceSinProfesor:
    "En cuanto tu profesor analice lo que trabajéis, aparece aquí tu primera parada: diez ejercicios hechos con lo tuyo.",

  rutaAlDia: "Ruta al día",
  tuRuta: "Tu ruta",
  paradaUno: "Parada 1",
  teHasHechoLaParada: "Te has hecho la parada que tenías",
  teHasHechoLasParadas: (n) => `Te has hecho las ${n} paradas`,
  laSiguienteSaleCon: (profesor) =>
    `La siguiente sale de tu próxima clase con ${profesor}. Mientras tanto, cualquiera de las hechas se puede repetir.`,
  laSiguienteSale:
    "La siguiente sale de tu próxima clase. Mientras tanto, cualquiera de las hechas se puede repetir.",
};

const EN: TextosRuta = {
  locale: "en-GB",

  paraNombre: (nombre) => `For ${nombre}`,
  paraTi: "For you",
  tuRutaDeEstaSemana: "Your path this week",
  aquiVaAEstarTuRuta: "Your path will be here",
  saleDeTusClasesCon: (profesor) => `It comes from your classes with ${profesor}.`,
  saleDeTusClases: "It comes from your classes and from what we know about you.",
  nadieMasTieneEstaRuta: "Nobody else in the academy has this path.",

  vasPorLaDe: (actual, total) => `you're on ${actual} of ${total}`,
  hechasCuenta: (n) => `${n} done`,
  alDia: "up to date",
  estasAqui: "You're here",

  plegarLoQueViene: "Fold what's coming",
  plegarLasHechas: "Fold the ones you've done",
  vuelvenAUnSoloPunto: "They go back to one point",
  teEsperanAqui: "They're waiting here",
  tocalasParaVerlas: "Tap them to see them on the path",

  paradaListaParaAbrir: "Stop ready to open",
  paradaCerrada: "Stop closed: it opens with your next class",
  paradaNumeroTitulo: (numero, titulo) => `Stop ${numero}: ${titulo}`,
  prepararLaParada: (numero) => `Build stop ${numero}`,
  seguirLaRuta: "Carry on along the path",
  volverAHacerla: "Do it again",
  noCambiaLoHecho: "It doesn't change what you've already done.",
  llegasAlCerrar: (numero) => `You get there once you close stop ${numero}.`,
  llegasSiguiendo: "You get there by carrying on along the path.",

  tuUltimaClaseCon: (profesor) => `Your last class with ${profesor} is here`,
  tuUltimaClase: "Your last class is here",
  diezEjerciciosConLoTuyo: "Ten exercises built from what we know about you.",
  tardaMenosDeUnMinuto: "It takes under a minute.",

  seAbreConTuProximaClase: "It opens with your next class",
  laPreparaCuandoSuba: (profesor) =>
    `${profesor} builds it once they upload what you work on. It comes from that class, so until then it doesn't exist.`,
  tuProfesorLaPrepara:
    "Your teacher builds it once they upload what you work on. It comes from that class, so until then it doesn't exist.",
  noTienesQueHacerNada: "You don't have to do anything: you'll find it open here.",

  tuRutaEmpieza: "Your path starts with your first class",
  preparandoTuPrimeraParada: "Building your first stop…",
  enMenosDeUnMinuto: "You'll have it here in under a minute.",
  encuantoAnalice: (profesor) =>
    `As soon as ${profesor} goes over what you work on, your first stop shows up here: ten exercises built from your own material.`,
  encuantoAnaliceSinProfesor:
    "As soon as your teacher goes over what you work on, your first stop shows up here: ten exercises built from your own material.",

  rutaAlDia: "Path up to date",
  tuRuta: "Your path",
  paradaUno: "Stop 1",
  teHasHechoLaParada: "You've done the stop you had",
  teHasHechoLasParadas: (n) => `You've done all ${n} stops`,
  laSiguienteSaleCon: (profesor) =>
    `The next one comes from your next class with ${profesor}. In the meantime, you can redo any of the ones you've done.`,
  laSiguienteSale:
    "The next one comes from your next class. In the meantime, you can redo any of the ones you've done.",
};

export const RUTA: Record<Idioma, TextosRuta> = { en: EN, es: ES };
