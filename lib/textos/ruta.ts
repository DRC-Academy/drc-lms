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

// ---------------------------------------------------------------
// EL ÁREA DEL BLOQUE
//
// `bloque.area` lo escribe el modelo, pero no es texto libre: el prompt
// le da tres valores y solo tres (`AREAS`, en `lib/prompt-bloque.ts`), y
// los tres están en español porque el prompt está en español. Los
// bloques escritos a mano de `lib/data.ts` y `lib/banco.ts` usan esos
// mismos tres.
//
// Se traducen por mapa y no por el traductor de bloques a propósito: el
// área se pinta en la TARJETA de la ruta, que no pasa por ahí, y además
// es un rótulo de tres valores, no una frase que haya que redactar.
//
// El español es identidad además de traducción: así el mapa se lee igual
// en los dos sentidos y un área nueva se ve enseguida que falta.
// ---------------------------------------------------------------

const AREA_ES: Record<string, string> = {
  "Gramática": "Gramática",
  "Léxico": "Léxico",
  "Discurso": "Discurso",
};

const AREA_EN: Record<string, string> = {
  "Gramática": "Grammar",
  "Léxico": "Vocabulary",
  "Discurso": "Discourse",
};

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

  // --- el grupo plegado de atrás ---
  plegarLasDeAtras: string;
  vuelvenAUnSoloPunto: string;
  tocalasParaVerlas: string;

  // --- el rótulo de cada parada ---
  //
  // Seis rótulos que salían escritos en el componente como
  // `Parada {n} · estás aquí`, con el número interpolado en medio. En
  // inglés el orden es el mismo, pero la coletilla no se traduce sola:
  // "· hecha" es "· done" y "· aún no está" es "· not there yet".
  //
  // Van como funciones completas y no como "Parada" + coletilla suelta
  // porque el punto medio forma parte del rótulo: partirlo obliga a
  // recomponerlo en cada uno de los seis sitios donde se pinta.
  paradaConArea: (numero: number | null, area: string) => string;
  paradaEstasAqui: (numero: number | null) => string;
  paradaHecha: (numero: number | null) => string;
  paradaAciertos: (porcentaje: number) => string;
  paradaSinHacer: (numero: number | null) => string;
  paradaListaParaAbrirN: (numero: number | null) => string;
  paradaAunNoEsta: (numero: number | null) => string;
  ejerciciosCuenta: (n: number) => string;

  /**
   * El área del bloque, que la escribe el modelo.
   *
   * Son tres y están fijadas en el prompt (`AREAS`, en
   * `lib/prompt-bloque.ts`), así que se traducen por mapa. Lo que no
   * esté en el mapa sale tal cual: un área nueva es un rótulo raro, no
   * una pantalla rota.
   */
  area: (valor: string) => string;

  // --- los rótulos que arma `lib/ruta.ts` ---
  //
  // Son títulos de parada, no de tarjeta: los escribe el constructor de
  // la ruta y llegan al componente ya hechos. Por eso están aquí y no se
  // componen arriba.
  listaParaAbrir: string;
  paradasAtras: (n: number) => string;

  // --- la cabecera de la ruta ---
  tuRutaParadas: (n: number) => string;
  tuRutaSinParadas: string;
  preparando: string;
  /** El aviso bajo el botón: quién va a leer lo que escriba. */
  loQueEscribasLoLee: (profesor: string) => string;

  // --- las paradas ---
  paradaListaParaAbrir: string;
  paradaCerrada: string;
  paradaNumeroTitulo: (numero: number | null, titulo: string) => string;
  prepararLaParada: (numero: number | null) => string;
  seguirLaRuta: string;
  volverAHacerla: string;
  noCambiaLoHecho: string;
  hacerla: string;
  sigueAhi: string;
  /**
   * DE QUÉ CLASE VIENE LA PARADA. Va debajo del título, como contexto:
   * es lo que hace que cinco paradas no digan «en tu última clase»
   * cuando solo una puede serlo. La fecha llega ya formateada; sin
   * profesor en la ficha se dice solo la fecha.
   */
  /** «Clase del 17 de septiembre con Noeli»: la atribución de toda parada. */
  claseDel: (fecha: string, profesor: string) => string;
  /** «Preparar la parada 1 con tu clase del 17 de septiembre con Noeli». */
  prepararLaParadaConClase: (numero: number | null, fecha: string, profesor: string) => string;

  // --- la parada de hoy ---
  diezEjerciciosConLoTuyo: string;
  tardaMenosDeUnMinuto: string;

  // --- la que todavía no existe ---
  seAbreConTuProximaClase: string;
  laPreparaCuandoSuba: (profesor: string) => string;
  tuProfesorLaPrepara: string;
  noTienesQueHacerNada: string;

  // --- sin ruta todavía ---
  todaviaNoHayNada: string;
  cuandoAnaliceTuPrimeraClase: (profesor: string) => string;
  cuandoTuProfesorAnalice: string;

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

  plegarLasDeAtras: "Plegar las de atrás",
  vuelvenAUnSoloPunto: "Vuelven a un solo punto",
  tocalasParaVerlas: "Tócalas para verlas en el camino",

  paradaConArea: (numero, area) => `Parada ${numero} · ${AREA_ES[area] ?? area}`,
  paradaEstasAqui: (numero) => `Parada ${numero} · estás aquí`,
  paradaHecha: (numero) => `Parada ${numero} · hecha`,
  paradaAciertos: (porcentaje) => ` · ${porcentaje}% de aciertos`,
  paradaSinHacer: (numero) => `Parada ${numero} · sin hacer`,
  paradaListaParaAbrirN: (numero) => `Parada ${numero} · lista para abrir`,
  paradaAunNoEsta: (numero) => `Parada ${numero} · aún no está`,
  ejerciciosCuenta: (n) => `${n} ${n === 1 ? "ejercicio" : "ejercicios"}`,

  area: (valor) => AREA_ES[valor] ?? valor,

  listaParaAbrir: "Lista para abrir",
  paradasAtras: (n) => `${n} ${n === 1 ? "parada atrás" : "paradas atrás"}`,

  tuRutaParadas: (n) => `Tu ruta · ${n} ${n === 1 ? "parada" : "paradas"}`,
  tuRutaSinParadas: "Tu ruta · aún sin paradas",
  preparando: "Preparando…",
  loQueEscribasLoLee: (profesor) =>
    `Lo que escribas al final lo lee ${profesor} antes de vuestra próxima clase.`,

  paradaListaParaAbrir: "Parada lista para abrir",
  paradaCerrada: "Parada cerrada: se abre con tu próxima clase",
  paradaNumeroTitulo: (numero, titulo) => `Parada ${numero}: ${titulo}`,
  prepararLaParada: (numero) => `Preparar la parada ${numero}`,
  seguirLaRuta: "Seguir la ruta",
  volverAHacerla: "Volver a hacerla",
  noCambiaLoHecho: "No cambia lo que ya tienes hecho.",
  hacerla: "Hacerla",
  sigueAhi: "Sigue ahí para cuando quieras. No cambia la parada de hoy.",
  claseDel: (fecha, profesor) => (profesor ? `Clase del ${fecha} con ${profesor}` : `Clase del ${fecha}`),
  prepararLaParadaConClase: (numero, fecha, profesor) =>
    profesor
      ? `Preparar la parada ${numero} con tu clase del ${fecha} con ${profesor}`
      : `Preparar la parada ${numero} con tu clase del ${fecha}`,
  diezEjerciciosConLoTuyo: "Diez ejercicios hechos con lo que sabemos de ti.",
  tardaMenosDeUnMinuto: "Tarda menos de un minuto.",

  seAbreConTuProximaClase: "Se abre con tu próxima clase",
  laPreparaCuandoSuba: (profesor) =>
    `${profesor} la prepara cuando suba lo que trabajéis. Sale de esa clase, así que hasta entonces no existe.`,
  tuProfesorLaPrepara:
    "Tu profesor la prepara cuando suba lo que trabajéis. Sale de esa clase, así que hasta entonces no existe.",
  noTienesQueHacerNada: "No tienes que hacer nada: te la encuentras aquí abierta.",

  todaviaNoHayNada: "Todavía no hay nada para practicar",
  cuandoAnaliceTuPrimeraClase: (profesor) =>
    `Cuando ${profesor} analice tu primera clase, aparecerá aquí tu primera parada.`,
  cuandoTuProfesorAnalice:
    "Cuando tu profesor analice tu primera clase, aparecerá aquí tu primera parada.",

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

  plegarLasDeAtras: "Fold the earlier ones",
  vuelvenAUnSoloPunto: "They go back to one point",
  tocalasParaVerlas: "Tap them to see them on the path",

  paradaConArea: (numero, area) => `Stop ${numero} · ${AREA_EN[area] ?? area}`,
  paradaEstasAqui: (numero) => `Stop ${numero} · you're here`,
  paradaHecha: (numero) => `Stop ${numero} · done`,
  paradaAciertos: (porcentaje) => ` · ${porcentaje}% right`,
  paradaSinHacer: (numero) => `Stop ${numero} · not done yet`,
  paradaListaParaAbrirN: (numero) => `Stop ${numero} · ready to open`,
  paradaAunNoEsta: (numero) => `Stop ${numero} · not there yet`,
  ejerciciosCuenta: (n) => `${n} ${n === 1 ? "exercise" : "exercises"}`,

  area: (valor) => AREA_EN[valor] ?? valor,

  listaParaAbrir: "Ready to open",
  paradasAtras: (n) => `${n} earlier ${n === 1 ? "stop" : "stops"}`,

  tuRutaParadas: (n) => `Your path · ${n} ${n === 1 ? "stop" : "stops"}`,
  tuRutaSinParadas: "Your path · no stops yet",
  preparando: "Getting it ready…",
  loQueEscribasLoLee: (profesor) =>
    `What you write at the end is read by ${profesor} before your next class.`,

  paradaListaParaAbrir: "Stop ready to open",
  paradaCerrada: "Stop closed: it opens with your next class",
  paradaNumeroTitulo: (numero, titulo) => `Stop ${numero}: ${titulo}`,
  prepararLaParada: (numero) => `Build stop ${numero}`,
  seguirLaRuta: "Carry on along the path",
  volverAHacerla: "Do it again",
  noCambiaLoHecho: "It doesn't change what you've already done.",
  hacerla: "Do it",
  sigueAhi: "It stays here for whenever you like. It doesn't change today's stop.",
  claseDel: (fecha, profesor) => (profesor ? `Class on ${fecha} with ${profesor}` : `Class on ${fecha}`),
  prepararLaParadaConClase: (numero, fecha, profesor) =>
    profesor
      ? `Build stop ${numero} from your class on ${fecha} with ${profesor}`
      : `Build stop ${numero} from your class on ${fecha}`,
  diezEjerciciosConLoTuyo: "Ten exercises built from what we know about you.",
  tardaMenosDeUnMinuto: "It takes under a minute.",

  seAbreConTuProximaClase: "It opens with your next class",
  laPreparaCuandoSuba: (profesor) =>
    `${profesor} builds it once they upload what you work on. It comes from that class, so until then it doesn't exist.`,
  tuProfesorLaPrepara:
    "Your teacher builds it once they upload what you work on. It comes from that class, so until then it doesn't exist.",
  noTienesQueHacerNada: "You don't have to do anything: you'll find it open here.",

  todaviaNoHayNada: "Nothing to practise yet",
  cuandoAnaliceTuPrimeraClase: (profesor) =>
    `Once ${profesor} reviews your first class, your first stop will appear here.`,
  cuandoTuProfesorAnalice:
    "Once your teacher reviews your first class, your first stop will appear here.",

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
