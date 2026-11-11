// ---------------------------------------------------------------
// LA PRUEBA DE NIVEL, DE CARA AL ALUMNO
//
// Tono cálido y sin lenguaje de examen: no hay aprobado ni suspenso, hay un
// punto de partida. Sin presión ni prisa.
//
// Los nombres de las secciones y de los niveles en castellano son los de
// Gestión (`SECTION_LABEL` y `CEFR_DESC` en lib/prueba-nivel/gestion/
// constants.ts), partidos en nombre y frase. Las preguntas van en inglés,
// como en Gestión.
// ---------------------------------------------------------------

import type { Idioma } from "@/lib/idioma";
import type { Cefr, LTSection } from "@/lib/prueba-nivel/gestion/types";

export type TextosPruebaNivel = {
  // --- el bloque del inicio y de elegir curso ---
  nuevaTitulo: string;
  nuevaTexto: string;
  nuevaBoton: string;
  enCursoTitulo: string;
  enCursoTexto: (hechas: number, total: number) => string;
  enCursoBoton: string;
  terminadaEtiqueta: string;
  tuNivel: (nivel: string, nombre: string) => string;
  recomendado: (curso: string) => string;
  empezarMiCurso: string;
  esTuCurso: string;
  seguirConMiCurso: string;
  repetir: string;
  /** Mientras no han pasado 24 h desde la última: cuándo puede repetirla. */
  repetirDesde: (dia: "hoy" | "manana", hora: string) => string;
  provisional: string;
  // --- la barra lateral y la hoja del perfil en móvil ---
  barraNuevaBoton: string;
  barraNuevaTexto: string;
  barraEnCursoBoton: string;
  barraEnCursoTexto: (hechas: number, total: number) => string;
  barraNivel: (nivel: string) => string;
  // --- la página de la prueba ---
  bienvenidaTitulo: string;
  repetirTitulo: string;
  bienvenidaTexto: string;
  bienvenidaPuntos: string[];
  empezar: string;
  empezando: string;
  preguntaDe: (n: number, total: number) => string;
  siguiente: string;
  guardando: string;
  leyendoRedaccion: string;
  escribeEnIngles: string;
  palabras: (n: number, minimo: number) => string;
  salir: string;
  salirAyuda: string;
  error: string;
  reintentar: string;
  resultadoEtiqueta: string;
  resultadoTitulo: (nivel: string) => string;
  resultadoCurso: string;
  volverAlInicio: string;
  secciones: Record<LTSection, string>;
  niveles: Record<Cefr, { nombre: string; frase: string }>;
};

export const PRUEBA_NIVEL: Record<Idioma, TextosPruebaNivel> = {
  es: {
    nuevaTitulo: "Haz tu prueba de nivel",
    nuevaTexto: "Unos 30–40 min. Al terminar te decimos tu nivel y por qué curso te conviene empezar.",
    nuevaBoton: "Hacer la prueba de nivel",
    enCursoTitulo: "Continuar mi prueba de nivel",
    enCursoTexto: (hechas, total) => `Llevas ${hechas} de ${total} preguntas. Seguimos donde lo dejaste.`,
    enCursoBoton: "Continuar mi prueba",
    terminadaEtiqueta: "Tu prueba de nivel",
    tuNivel: (nivel, nombre) => `Tu nivel: ${nivel} · ${nombre}`,
    recomendado: (curso) => `Te recomendamos ${curso}.`,
    empezarMiCurso: "Empezar mi curso",
    esTuCurso: "Es el curso que ya tienes.",
    seguirConMiCurso: "Seguir con mi curso",
    repetir: "Repetir la prueba",
    // «a partir de la 1:05», «a partir de las 10:40».
    repetirDesde: (dia, hora) =>
      `Podrás repetirla ${dia === "hoy" ? "hoy" : "mañana"} a partir de ${/^1:/.test(hora) ? "la" : "las"} ${hora}.`,
    provisional:
      "Esta vez no hemos podido valorar tu redacción, así que este nivel sale de la parte de lectura. Si quieres, puedes repetir la prueba.",
    barraNuevaBoton: "Haz tu prueba de nivel",
    barraNuevaTexto: "Unos 30–40 min",
    barraEnCursoBoton: "Continuar mi prueba",
    barraEnCursoTexto: (hechas, total) => `Llevas ${hechas} de ${total}`,
    barraNivel: (nivel) => `Tu nivel: ${nivel}`,
    bienvenidaTitulo: "Tu prueba de nivel",
    repetirTitulo: "Repite tu prueba de nivel",
    bienvenidaTexto:
      "Así sabremos por qué curso te conviene empezar. Se adapta a ti sobre la marcha y no hay que preparar nada.",
    bienvenidaPuntos: [
      "Lectura: completar frases, textos y correos.",
      "Escritura: una redacción breve.",
      "Unos 30–40 minutos. Puedes dejarla y seguir otro día donde lo dejaste.",
      "Una vez respondes una pregunta, no se puede volver atrás.",
    ],
    empezar: "Empezar la prueba",
    empezando: "Abriendo tu prueba…",
    preguntaDe: (n, total) => `Pregunta ${n} de ${total}`,
    siguiente: "Siguiente",
    guardando: "Guardando…",
    leyendoRedaccion: "Estamos leyendo tu redacción. Tarda unos segundos.",
    escribeEnIngles: "Escribe en inglés",
    palabras: (n, minimo) => `${n} ${n === 1 ? "palabra" : "palabras"} · mínimo ${minimo}`,
    salir: "Seguir otro día",
    salirAyuda: "Lo que llevas se queda guardado.",
    error: "No hemos podido seguir. Vuelve a intentarlo en un momento: lo que llevas está guardado.",
    reintentar: "Reintentar",
    resultadoEtiqueta: "Tu resultado",
    resultadoTitulo: (nivel) => `Tu nivel es ${nivel}`,
    resultadoCurso: "El curso que te recomendamos",
    volverAlInicio: "Volver al inicio",
    secciones: {
      reading_completion: "Completar oraciones",
      reading_passage: "Comprensión de textos",
      reading_email: "Comprensión de emails",
      writing: "Escritura",
    },
    niveles: {
      A1: { nombre: "Principiante", frase: "Frases básicas y situaciones cotidianas muy simples." },
      A2: { nombre: "Elemental", frase: "Intercambios sencillos sobre temas conocidos." },
      B1: { nombre: "Intermedio", frase: "Te desenvuelves en la mayoría de situaciones del día a día." },
      B2: { nombre: "Intermedio alto", frase: "Fluidez y precisión en contextos variados, incluido el laboral." },
      C1: { nombre: "Avanzado", frase: "Uso flexible y eficaz del idioma en contextos complejos." },
      C2: { nombre: "Maestría", frase: "Comprensión y expresión con total soltura y precisión." },
    },
  },
  en: {
    nuevaTitulo: "Take your level test",
    nuevaTexto: "About 30–40 min. When you finish, we'll tell you your level and which course to start with.",
    nuevaBoton: "Take the level test",
    enCursoTitulo: "Continue my level test",
    enCursoTexto: (hechas, total) => `You've done ${hechas} of ${total} questions. We'll pick up where you left off.`,
    enCursoBoton: "Continue my test",
    terminadaEtiqueta: "Your level test",
    tuNivel: (nivel, nombre) => `Your level: ${nivel} · ${nombre}`,
    recomendado: (curso) => `We recommend ${curso}.`,
    empezarMiCurso: "Start my course",
    esTuCurso: "It's the course you already have.",
    seguirConMiCurso: "Continue my course",
    repetir: "Take the test again",
    repetirDesde: (dia, hora) => `You can take it again ${dia === "hoy" ? "today" : "tomorrow"} from ${hora}.`,
    provisional:
      "This time we couldn't assess your writing, so this level comes from the reading part. You can take the test again if you like.",
    barraNuevaBoton: "Take your level test",
    barraNuevaTexto: "About 30–40 min",
    barraEnCursoBoton: "Continue my test",
    barraEnCursoTexto: (hechas, total) => `${hechas} of ${total} done`,
    barraNivel: (nivel) => `Your level: ${nivel}`,
    bienvenidaTitulo: "Your level test",
    repetirTitulo: "Take your level test again",
    bienvenidaTexto: "This tells us which course suits you best. It adapts to you as you go, and there's nothing to prepare.",
    bienvenidaPuntos: [
      "Reading: complete sentences, texts and emails.",
      "Writing: a short piece of writing.",
      "About 30–40 minutes. You can stop and carry on another day where you left off.",
      "Once you answer a question, you can't go back.",
    ],
    empezar: "Start the test",
    empezando: "Opening your test…",
    preguntaDe: (n, total) => `Question ${n} of ${total}`,
    siguiente: "Next",
    guardando: "Saving…",
    leyendoRedaccion: "We're reading your writing. It takes a few seconds.",
    escribeEnIngles: "Write in English",
    palabras: (n, minimo) => `${n} ${n === 1 ? "word" : "words"} · minimum ${minimo}`,
    salir: "Carry on another day",
    salirAyuda: "Everything you've done stays saved.",
    error: "We couldn't continue. Try again in a moment: everything you've done is saved.",
    reintentar: "Try again",
    resultadoEtiqueta: "Your result",
    resultadoTitulo: (nivel) => `Your level is ${nivel}`,
    resultadoCurso: "The course we recommend",
    volverAlInicio: "Back to home",
    secciones: {
      reading_completion: "Complete the sentence",
      reading_passage: "Reading texts",
      reading_email: "Reading emails",
      writing: "Writing",
    },
    niveles: {
      A1: { nombre: "Beginner", frase: "Basic phrases and very simple everyday situations." },
      A2: { nombre: "Elementary", frase: "Simple exchanges on familiar topics." },
      B1: { nombre: "Intermediate", frase: "You get by in most everyday situations." },
      B2: { nombre: "Upper intermediate", frase: "Fluency and accuracy in varied contexts, work included." },
      C1: { nombre: "Advanced", frase: "Flexible, effective use of the language in complex contexts." },
      C2: { nombre: "Proficiency", frase: "Understanding and expression with complete ease and precision." },
    },
  },
};
