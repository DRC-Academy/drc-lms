// ---------------------------------------------------------------
// EL CURSO: TEMARIO, MÓDULOS Y LECCIÓN
//
// Todo lo que rodea al contenido del curso. El CONTENIDO en sí —el texto
// de cada lección, los títulos de módulo y de curso— viene de LearnDash
// y vive en la base, así que no pasa por aquí: ya está en inglés salvo
// los títulos que puso nuestro importador, que son datos y no código.
//
// LOS BOTONES DE ABAJO SON LA PIEZA DELICADA. Dicen tres cosas distintas
// según dónde esté el alumno —seguir, marcar esta lección, cerrar el
// módulo entero— y el móvil enseña una versión corta de cada una porque
// la larga no cabe. Las dos versiones tienen que decir lo mismo en los
// dos idiomas, y la corta nunca puede perder el verbo: "Complete" a
// secas no dice si completa la lección o el curso.
//
// LOS PLURALES VAN EN FUNCIONES. "1 lección" contra "3 lecciones", "1
// lesson" contra "3 lessons", y además el orden cambia: en español el
// contador va "3 de 12 lecciones" y en inglés "3 of 12 lessons". Con
// plantillas sueltas eso se resuelve en el sitio donde se pinta, que es
// como se cuelan los "1 lecciones".
// ---------------------------------------------------------------

import type { Idioma } from "@/lib/idioma";

export type TextosCurso = {
  // --- temario ---
  sinContenido: string;
  programaMesAMes: string;
  expandirTodo: string;
  contraerTodo: string;
  semanas: (desde: number, hasta: number) => string;
  sinSemanas: string;
  progresoDelMes: (numero: number) => string;
  modulosCompletados: (n: number) => string;
  tuRecorrido: string;

  // --- las coordenadas del temario ---
  //
  // Estas seis salían escritas en el código, y por eso el temario leía
  // "Mes 1 · Weeks 1 – 4 · Módulos 1 a 8": `semanas` ya estaba aquí y
  // sus vecinas no. Van juntas a propósito — se pintan en la misma
  // línea y tienen que sonar igual.
  mes: (numero: number) => string;
  semana: (numero: number) => string;
  /** El rótulo de un mes sin tema propio: "Módulos 1 a 8". */
  modulosDe: (primero: number, ultimo: number) => string;
  /** El contador del mes: "31 de 32 lecciones". */
  leccionesDelMes: (hechas: number, total: number) => string;
  /** El de la línea de progreso, que ya dice "mes" en su rótulo. */
  esteMes: (hechas: number, total: number) => string;
  irAlMes: (hechas: number, total: number, mes: number) => string;
  vasPorAqui: string;
  /** El rótulo móvil de la línea de progreso: "Vas por el mes 3". */
  vasPorElMes: (numero: number) => string;
  /** Contador desnudo, para huecos estrechos: "3 de 12". */
  contador: (hechas: number, total: number) => string;
  anterior: string;

  // --- la etiqueta de un módulo suelto ---
  moduloNumero: (numero: number) => string;
  /** Solo para lector de pantalla: la fila apagada dice cuándo deja de estarlo. */
  moduloSeAbreEn: (dias: number) => string;
  semanaYModulo: (semana: number, modulo: number) => string;

  /**
   * Los temas editoriales de cada mes, por slug de curso.
   *
   * Viven aquí y no en `lib/temario.ts` por lo mismo que el resto: son
   * texto que el alumno lee, y allí solo existían en español. Un curso
   * que no esté en el mapa no se rompe — su cabecera cae a `modulosDe`,
   * que es lo que ya hacía.
   */
  temasDeCurso: Record<string, string[]>;

  // --- una fila de módulo ---
  metaModulo: (total: number, hechas: number) => string;
  repasarElModulo: (numero: number) => string;
  continuarElModulo: (numero: number) => string;
  empezarElModulo: (numero: number) => string;

  // --- la franja del plan ---
  tuPlanDeMeses: (meses: number) => string;
  hasTerminadoElCurso: string;
  todaviaSinContenido: string;
  continuar: string;
  continuarFlecha: string;
  cargandoElCurso: string;
  cargandoLaLeccion: string;
  leccionesEnEsteModulo: (hechas: number, total: number) => string;

  // --- dentro de la lección ---
  volverALaTeoria: string;
  ejercicios: string;
  leccionDeTotal: (posicion: number, total: number) => string;
  cerrar: string;
  lecciones: string;
  unEjercicioParaFijar: string;
  variosEjerciciosParaFijar: (n: number) => string;
  deUnoEnUno: string;
  empezar: string;
  losEjerciciosDeEstaLeccion: string;
  leccionSinContenido: string;
  cerrarElPanel: string;
  enEstaLeccion: string;
  volverALaLeccion: string;
  verElCursoCompleto: string;
  leccionesDelCurso: (hechas: number, total: number) => string;

  // --- los botones de completar ---
  completarCorto: string;
  completarCortoHecha: string;
  completarLargo: string;
  completarLargoHecha: string;
  completarModulo: string;
};

const ES: TextosCurso = {
  sinContenido: "Este curso todavía no tiene contenido cargado.",
  programaMesAMes: "Programa mes a mes",
  expandirTodo: "Expandir todo",
  contraerTodo: "Contraer todo",
  semanas: (desde, hasta) => `Semanas ${desde} – ${hasta}`,
  sinSemanas: "Sin semanas",
  progresoDelMes: (numero) => `Progreso del mes ${numero}`,
  modulosCompletados: (n) => `${n === 1 ? "módulo completado" : "módulos completados"}`,
  tuRecorrido: "Tu recorrido por el curso",

  mes: (numero) => `Mes ${numero}`,
  semana: (numero) => `Semana ${numero}`,
  modulosDe: (primero, ultimo) =>
    primero === ultimo ? `Módulo ${primero}` : `Módulos ${primero} a ${ultimo}`,
  leccionesDelMes: (hechas, total) =>
    `${hechas} de ${total} ${total === 1 ? "lección" : "lecciones"}`,
  esteMes: (hechas, total) => `${hechas} de ${total} este mes`,
  irAlMes: (hechas, total, mes) =>
    `${hechas} de ${total} ${total === 1 ? "lección hecha" : "lecciones hechas"}. Ir al mes ${mes}.`,
  vasPorAqui: "vas por aquí",
  vasPorElMes: (numero) => `Vas por el mes ${numero}`,
  contador: (hechas, total) => `${hechas} de ${total}`,
  anterior: "← Anterior",

  moduloNumero: (numero) => `Módulo ${numero}`,
  moduloSeAbreEn: (dias) => (dias <= 1 ? "Se abre mañana" : `Se abre en ${dias} días`),
  semanaYModulo: (semana, modulo) => `Semana ${semana} · Módulo ${modulo}`,

  temasDeCurso: {
    "cae-c1-cambridge": [
      "Gramática, léxico y las cuatro destrezas",
      "Escritura compleja y práctica cronometrada",
      "Estrategias avanzadas y primeros simulacros",
      "Consolidación y práctica guiada",
      "Precisión y registro bajo presión",
      "Simulacros completos y repaso final",
    ],
  },

  metaModulo: (total, hechas) =>
    `${total} ${total === 1 ? "lección" : "lecciones"} · ${hechas} ${hechas === 1 ? "hecha" : "hechas"}`,
  repasarElModulo: (numero) => `Repasar el módulo ${numero}`,
  continuarElModulo: (numero) => `Continuar el módulo ${numero}`,
  empezarElModulo: (numero) => `Empezar el módulo ${numero}`,

  tuPlanDeMeses: (meses) => `Tu plan de ${meses} ${meses === 1 ? "mes" : "meses"}`,
  hasTerminadoElCurso: "Has terminado el curso",
  todaviaSinContenido: "Todavía sin contenido",
  continuar: "Continuar",
  continuarFlecha: "Continuar →",
  cargandoElCurso: "Cargando el curso…",
  cargandoLaLeccion: "Cargando la lección…",
  leccionesEnEsteModulo: (hechas, total) =>
    `${hechas} de ${total} ${total === 1 ? "lección" : "lecciones"} en este módulo`,

  volverALaTeoria: "Volver a la teoría de la lección",
  ejercicios: "Ejercicios",
  leccionDeTotal: (posicion, total) => `Lección ${posicion} de ${total}`,
  cerrar: "Cerrar",
  lecciones: "Lecciones",
  unEjercicioParaFijar: "Un ejercicio para fijar lo de arriba",
  variosEjerciciosParaFijar: (n) => `${n} ejercicios para fijar lo de arriba`,
  deUnoEnUno: "De uno en uno. Se corrigen al momento.",
  empezar: "Empezar",
  losEjerciciosDeEstaLeccion: "los ejercicios de esta lección",
  leccionSinContenido: "Esta lección todavía no tiene contenido. Puedes seguir con la siguiente.",
  cerrarElPanel: "Cerrar el panel de lecciones",
  enEstaLeccion: "En esta lección",
  volverALaLeccion: "Volver a la lección",
  verElCursoCompleto: "Ver el curso completo",
  leccionesDelCurso: (hechas, total) =>
    `${hechas} de ${total} ${total === 1 ? "lección" : "lecciones"} del curso`,

  completarCorto: "Completada y continuar",
  completarCortoHecha: "Continuar",
  completarLargo: "Marcar como completada y continuar",
  completarLargoHecha: "Continuar",
  completarModulo: "Marcar el módulo como completado",
};

const EN: TextosCurso = {
  sinContenido: "This course has no content loaded yet.",
  programaMesAMes: "Month by month",
  expandirTodo: "Expand all",
  contraerTodo: "Collapse all",
  semanas: (desde, hasta) => `Weeks ${desde} – ${hasta}`,
  sinSemanas: "No weeks",
  progresoDelMes: (numero) => `Progress in month ${numero}`,
  modulosCompletados: (n) => `${n === 1 ? "module done" : "modules done"}`,
  tuRecorrido: "Your way through the course",

  mes: (numero) => `Month ${numero}`,
  semana: (numero) => `Week ${numero}`,
  modulosDe: (primero, ultimo) =>
    primero === ultimo ? `Module ${primero}` : `Modules ${primero} to ${ultimo}`,
  leccionesDelMes: (hechas, total) =>
    `${hechas} of ${total} ${total === 1 ? "lesson" : "lessons"}`,
  esteMes: (hechas, total) => `${hechas} of ${total} this month`,
  irAlMes: (hechas, total, mes) =>
    `${hechas} of ${total} ${total === 1 ? "lesson" : "lessons"} done. Go to month ${mes}.`,
  vasPorAqui: "you're here",
  vasPorElMes: (numero) => `You're on month ${numero}`,
  contador: (hechas, total) => `${hechas} of ${total}`,
  anterior: "← Previous",

  moduloNumero: (numero) => `Module ${numero}`,
  moduloSeAbreEn: (dias) => (dias <= 1 ? "Opens tomorrow" : `Opens in ${dias} days`),
  semanaYModulo: (semana, modulo) => `Week ${semana} · Module ${modulo}`,

  temasDeCurso: {
    "cae-c1-cambridge": [
      "Grammar, vocabulary and the four skills",
      "Complex writing and timed practice",
      "Advanced strategies and first mock tests",
      "Consolidation and guided practice",
      "Accuracy and register under pressure",
      "Full mock tests and final review",
    ],
  },

  metaModulo: (total, hechas) =>
    `${total} ${total === 1 ? "lesson" : "lessons"} · ${hechas} done`,
  repasarElModulo: (numero) => `Go over module ${numero} again`,
  continuarElModulo: (numero) => `Carry on with module ${numero}`,
  empezarElModulo: (numero) => `Start module ${numero}`,

  tuPlanDeMeses: (meses) => `Your ${meses}-month plan`,
  hasTerminadoElCurso: "You've finished the course",
  todaviaSinContenido: "No content yet",
  continuar: "Carry on",
  continuarFlecha: "Carry on →",
  cargandoElCurso: "Loading the course…",
  cargandoLaLeccion: "Loading the lesson…",
  leccionesEnEsteModulo: (hechas, total) =>
    `${hechas} of ${total} ${total === 1 ? "lesson" : "lessons"} in this module`,

  volverALaTeoria: "Back to the lesson text",
  ejercicios: "Exercises",
  leccionDeTotal: (posicion, total) => `Lesson ${posicion} of ${total}`,
  cerrar: "Close",
  lecciones: "Lessons",
  unEjercicioParaFijar: "One exercise to fix what's above",
  variosEjerciciosParaFijar: (n) => `${n} exercises to fix what's above`,
  deUnoEnUno: "One at a time. Marked as you go.",
  empezar: "Start",
  losEjerciciosDeEstaLeccion: "the exercises in this lesson",
  leccionSinContenido: "This lesson has no content yet. You can carry on with the next one.",
  cerrarElPanel: "Close the lesson panel",
  enEstaLeccion: "In this lesson",
  volverALaLeccion: "Back to the lesson",
  verElCursoCompleto: "See the whole course",
  leccionesDelCurso: (hechas, total) =>
    `${hechas} of ${total} ${total === 1 ? "lesson" : "lessons"} in the course`,

  // El corto se lee en móvil, donde no cabe el largo. Nunca pierde el
  // verbo: un "Done" a secas no dice qué se está dando por hecho.
  completarCorto: "Done, carry on",
  completarCortoHecha: "Carry on",
  completarLargo: "Mark as done and carry on",
  completarLargoHecha: "Carry on",
  completarModulo: "Mark the module as done",
};

export const CURSO: Record<Idioma, TextosCurso> = { en: EN, es: ES };
