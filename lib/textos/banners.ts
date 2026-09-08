// ---------------------------------------------------------------
// LAS FRANJAS: CURSO, DIPLOMA Y AMPLIACIÓN DE PLAN
//
// Las tres piezas anchas que abren el inicio y el curso.
//
// LA DE AMPLIAR ES LA ÚNICA QUE VENDE ALGO, y por eso es la que hay que
// traducir con más cuidado. Dos reglas que trae de origen y que el
// inglés conserva:
//
//   · NUNCA PROMETE UN NIVEL QUE NO VA A LLEGAR. A quien ya va al máximo
//     de horas no se le ofrece nada: se le dice que no hay plan por
//     encima del suyo. Una versión inglesa más "comercial" rompería eso.
//
//   · A QUIEN PREPARA UN EXAMEN NO SE LE CAMBIA LA META. Más horas no le
//     mueven la prueba: le dan más práctica hecha. Por eso hay dos juegos
//     de frases, `esPreparacion` y el otro, y no uno solo.
//
// LOS MESES Y LAS FECHAS los redacta `lib/estimacion.ts`; aquí solo está
// el marco que los rodea.
// ---------------------------------------------------------------

import type { Idioma } from "@/lib/idioma";

export type TextosBanners = {
  // --- banner del curso ---
  sinCursoTitulo: string;
  sinCursoCuerpo: string;
  cursoCompletado: string;
  estasAlDia: string;
  continuaDondeLoDejaste: string;
  empiezaTuCurso: string;
  repasarElCurso: string;
  verMiCurso: string;
  continuar: string;
  todoLoAbierto: string;
  leccionDeTotal: (posicion: number, total: number) => string;
  disponibleManana: string;
  disponibleEnDias: (dias: number) => string;
  /** "El mes 3 se abre en 5 días." Antes salía de recortar la cadena de arriba. */
  elMesSeAbre: (mes: number, dias: number) => string;

  // --- diploma ---
  tuDiploma: string;
  diplomaConseguido: string;
  leccionesParaTuDiploma: (n: number) => string;
  faltanParaDiploma: (restantes: number, total: number) => string;

  // --- ampliar el plan ---
  llegaMasPreparado: string;
  vasAlMaximo: string;
  examenMasHoras: string;
  examenAlMaximo: string;
  puedesLlegarAntesPreparado: string;
  puedesLlegarAntes: string;
  vasAlMejorRitmo: string;
  cuantoTardariasExamen: string;
  loQueTardariasExamen: string;
  cuantoTardariasObjetivo: string;
  loQueTardariasObjetivo: string;
  tuPlan: string;
  ampliaTuPlan: string;
  estariasListoEn: string;
  llegariasEn: string;

  // --- posición dentro del temario ---
  posicion: (mes: number, semana: number, modulo: number) => string;
};

const ES: TextosBanners = {
  sinCursoTitulo: "Tu plan todavía no tiene un curso asociado. Coméntaselo a tu profesor y lo activamos.",
  sinCursoCuerpo: "Mientras tanto, tu práctica de abajo funciona con normalidad.",
  cursoCompletado: "Curso completado",
  estasAlDia: "Estás al día",
  continuaDondeLoDejaste: "Continúa donde lo dejaste",
  empiezaTuCurso: "Empieza tu curso",
  repasarElCurso: "Repasar el curso",
  verMiCurso: "Ver mi curso",
  continuar: "Continuar",
  todoLoAbierto: "Has hecho todo lo que tienes abierto",
  leccionDeTotal: (posicion, total) => `Lección ${posicion} de ${total}`,
  disponibleManana: "Disponible mañana",
  disponibleEnDias: (dias) => `Disponible en ${dias} días`,
  elMesSeAbre: (mes, dias) =>
    dias <= 1 ? `El mes ${mes} se abre mañana.` : `El mes ${mes} se abre en ${dias} días.`,

  tuDiploma: "Tu diploma",
  diplomaConseguido: "Diploma conseguido",
  leccionesParaTuDiploma: (n) => (n === 1 ? "lección para tu diploma" : "lecciones para tu diploma"),
  faltanParaDiploma: (restantes, total) =>
    `Te ${restantes === 1 ? "falta" : "faltan"} ${restantes} de ${total} lecciones para tu diploma`,

  llegaMasPreparado: "Llega más preparado",
  vasAlMaximo: "Vas al máximo de horas",
  examenMasHoras:
    "Estás preparando tu examen. Con más horas a la semana no cambias de meta: llegas a la misma prueba con más práctica hecha y más seguridad.",
  examenAlMaximo:
    "Estás preparando tu examen con todas las horas que ofrecemos. No hay plan por encima del tuyo: lo que queda es seguir.",
  puedesLlegarAntesPreparado: "¡Puedes llegar preparado antes!",
  puedesLlegarAntes: "¡Puedes llegar antes de lo que crees!",
  vasAlMejorRitmo: "Vas al mejor ritmo posible",
  cuantoTardariasExamen: "¿Cuánto tardarías en llegar preparado a tu examen con otros planes?",
  loQueTardariasExamen:
    "Esto es lo que tardarías en llegar preparado a tu examen al ritmo que llevas.",
  cuantoTardariasObjetivo: "¿Cuánto tardarías en conseguir tu objetivo con otros planes?",
  loQueTardariasObjetivo: "Esto es lo que tardarías en conseguir tu objetivo al ritmo que llevas.",
  tuPlan: "Tu plan",
  ampliaTuPlan: "Amplía tu plan",
  estariasListoEn: "Estarías listo en",
  llegariasEn: "Llegarías en",

  posicion: (mes, semana, modulo) => `Mes ${mes} · Semana ${semana} · Módulo ${modulo}`,
};

const EN: TextosBanners = {
  sinCursoTitulo:
    "Your plan doesn't have a course attached yet. Mention it to your teacher and we'll switch it on.",
  sinCursoCuerpo: "In the meantime, your practice below works as normal.",
  cursoCompletado: "Course finished",
  estasAlDia: "You're up to date",
  continuaDondeLoDejaste: "Carry on where you left off",
  empiezaTuCurso: "Start your course",
  repasarElCurso: "Go over the course again",
  verMiCurso: "See my course",
  continuar: "Carry on",
  todoLoAbierto: "You've done everything that's open",
  leccionDeTotal: (posicion, total) => `Lesson ${posicion} of ${total}`,
  disponibleManana: "Available tomorrow",
  disponibleEnDias: (dias) => `Available in ${dias} days`,
  elMesSeAbre: (mes, dias) =>
    dias <= 1 ? `Month ${mes} opens tomorrow.` : `Month ${mes} opens in ${dias} days.`,

  tuDiploma: "Your diploma",
  diplomaConseguido: "Diploma earned",
  leccionesParaTuDiploma: (n) => (n === 1 ? "lesson to your diploma" : "lessons to your diploma"),
  faltanParaDiploma: (restantes, total) =>
    `${restantes} of ${total} ${restantes === 1 ? "lesson" : "lessons"} to go for your diploma`,

  llegaMasPreparado: "Arrive better prepared",
  vasAlMaximo: "You're on the maximum hours",
  // No cambia la meta: más horas dan más práctica, no otra prueba.
  examenMasHoras:
    "You're preparing for your exam. More hours a week doesn't change your goal: you reach the same exam with more practice behind you and more confidence.",
  examenAlMaximo:
    "You're preparing for your exam on all the hours we offer. There's no plan above yours: what's left is to keep going.",
  puedesLlegarAntesPreparado: "You can be ready sooner!",
  puedesLlegarAntes: "You can get there sooner than you think!",
  vasAlMejorRitmo: "You're going at the best pace there is",
  cuantoTardariasExamen: "How long would it take to be ready for your exam on other plans?",
  loQueTardariasExamen: "This is how long it would take to be ready for your exam at your pace.",
  cuantoTardariasObjetivo: "How long would it take to reach your goal on other plans?",
  loQueTardariasObjetivo: "This is how long it would take to reach your goal at your pace.",
  tuPlan: "Your plan",
  ampliaTuPlan: "Extend your plan",
  estariasListoEn: "You'd be ready in",
  llegariasEn: "You'd get there in",

  posicion: (mes, semana, modulo) => `Month ${mes} · Week ${semana} · Module ${modulo}`,
};

export const BANNERS: Record<Idioma, TextosBanners> = { en: EN, es: ES };
