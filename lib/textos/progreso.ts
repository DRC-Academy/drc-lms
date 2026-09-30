// ---------------------------------------------------------------
// "MI PROGRESO": LA FICHA DEL ALUMNO
//
// La única de las cuatro secciones en la que el alumno LEE en vez de
// hacer: es lo que su profesor ha escrito de él, clase a clase.
//
// EL CONTENIDO NO PASA POR AQUÍ Y NO PUEDE PASAR. El objetivo, los
// puntos fuertes, lo que se está reforzando, el foco y el resumen de
// cada clase los escribe una persona —o la IA de Gestión— en español,
// viven en otra base y el LMS solo los lee. Aquí está el MARCO: los
// rótulos, las unidades y los estados vacíos.
//
// Eso deja una costura que conviene tener presente: un alumno leyendo en
// inglés verá "What you already do well" encima de una lista escrita en
// español. Es el mismo caso que la FAQ, y se arregla en el mismo sitio
// —en el origen— o no se arregla.
//
// EL NIVEL SIGUE DICIENDO DE DÓNDE SALE. La nota "Estimado · confírmalo
// con tu profesor" no es un adorno: sin ella, un nivel calculado por
// nosotros se lee como un hecho. La versión inglesa conserva esa
// distancia.
// ---------------------------------------------------------------

import type { Idioma } from "@/lib/idioma";
import type { FormatoFecha } from "@/lib/perfil";

// Los nombres de mes, para las fechas que esta pantalla escribe. Se
// repiten aquí en vez de usar `Intl` por lo mismo que en
// `lib/textos/banners.ts`: el `es-ES` de Node no está garantizado en
// todos los runtimes y esto se renderiza en el servidor.
const MESES_ES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

const MESES_EN = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];


export type TextosProgreso = {
  tuProgreso: string;
  esteEsTuProgreso: (nombre: string) => string;
  resumenDeTuNivel: string;

  clasesHechas: (n: number) => string;
  nivelActual: string;
  nivelEstimado: string;
  /** El nivel lo midió la prueba automática: medido, pero sin confirmar. */
  nivelPrueba: string;
  /** Lo confirmó su profesor. Solo con `nivel_profesor`. */
  nivelConfirmadoPor: (profesor: string | null) => string;
  cadaSemana: string;
  clase: string;
  proximoHito: string;
  hitosCompletos: string;

  tuObjetivo: string;
  loQueYaHacesBien: string;
  loQueEstamosReforzando: string;
  enQueTrabajamosAhora: string;
  focoActual: string;
  informePrivado: string;

  tuNivel: string;
  estasAqui: string;
  tuMeta: string;

  tuRecorrido: string;
  recorridoVacio: string;
  verLasClases: (n: number) => string;
  claseNumero: (n: number) => string;
  /** "19 de agosto de 2026" / "19 August 2026". */
  fechaLarga: FormatoFecha;
  hito: string;

  // --- La ficha rediseñada (30/09/2026, copia de la de Gestión) ---
  /** "Hola, Ana." */
  hola: (nombre: string) => string;
  entradilla: string;
  tuRitmo: string;
  /** Nombre accesible del selector de horas. */
  horasALaSemana: string;
  /** Lo que se pregunta arriba del selector. `nivel` null = meta sin nombre. */
  ritmoPregunta: (tope: boolean, nivel: string | null, examen: boolean) => string;
  /** Lo que va encima de la fecha: "Llegarías al B2 en". */
  ritmoFrase: (tope: boolean, nivel: string | null, examen: boolean) => string;
  /** La etiqueta de cada plan en el selector: "2 h", y "· tu plan" en el suyo. */
  horas: (h: number) => string;
  tuPlanNota: string;
  mesDeLlegada: (indiceMes: number, anio: number) => string;
  /** "4 meses · es tu plan actual". */
  detalleActual: (meses: number) => string;
  /** "4 meses · 3 meses antes que con tu plan". */
  detalleAhorro: (meses: number, ahorro: number) => string;
  enMeses: (n: number) => string;
  ampliaTuPlan: string;
  tuDiploma: string;
  /** "2 meses y 5 días" · "23 días". */
  cuentaDiploma: (meses: number, dias: number) => string;
  paraTuDiploma: string;
  leccionesDe: (hechas: number, total: number) => string;
  diplomaHoy: string;
  retomaTuCurso: string;
  retomaTuCursoCorto: string;
  diplomaConseguido: string;
  empezarMiCurso: string;
  irAMiCurso: string;
  continuarMiCurso: string;
  verMiCurso: string;
  /** "16 clases · la última, el 25 de septiembre: Condicionales". */
  recorridoResumen: (n: number, fecha: string | null, titulo: string | null) => string;
  verTodas: string;
  plegar: string;
};

const ES: TextosProgreso = {
  tuProgreso: "Tu progreso en inglés",
  esteEsTuProgreso: (nombre) => `Esto es lo que llevas conseguido, ${nombre}.`,
  resumenDeTuNivel:
    "Un resumen de tu nivel, de lo que ya dominas y de hacia dónde vamos en las próximas clases.",

  clasesHechas: (n) => (n === 1 ? "Clase hecha" : "Clases hechas"),
  nivelActual: "Nivel actual",
  nivelEstimado: "Estimado · confírmalo con tu profesor",
  nivelPrueba: "Según tu prueba de nivel",
  nivelConfirmadoPor: (profesor) => (profesor ? `✓ Confirmado por ${profesor}` : "✓ Confirmado por tu profesor"),
  cadaSemana: "Cada semana",
  clase: "Clase",
  proximoHito: "Próximo hito",
  hitosCompletos: "Hitos completos",

  tuObjetivo: "Tu objetivo",
  loQueYaHacesBien: "Lo que ya haces bien",
  loQueEstamosReforzando: "Lo que estamos reforzando",
  enQueTrabajamosAhora: "En qué trabajamos ahora",
  focoActual: "Foco actual",
  informePrivado:
    "Este informe es privado y sólo para ti. Si te surge cualquier duda, coméntasela a tu profesor.",

  tuNivel: "Tu nivel",
  estasAqui: "Estás aquí",
  tuMeta: "Tu meta",

  tuRecorrido: "Tu recorrido, clase a clase",
  recorridoVacio:
    "Aquí irá apareciendo el resumen de cada clase. Se irá llenando a medida que avances.",
  verLasClases: (n) => `Ver las ${n} clases`,
  claseNumero: (n) => `Clase ${n}`,
  fechaLarga: (dia, indiceMes, anio) => `${dia} de ${MESES_ES[indiceMes]} de ${anio}`,
  hito: "Hito",

  hola: (nombre) => (nombre ? `Hola, ${nombre}.` : "Hola."),
  entradilla: "Esto es lo que llevas recorrido y lo que te queda por delante.",
  tuRitmo: "Tu ritmo",
  horasALaSemana: "Horas de clase a la semana",
  ritmoPregunta: (tope, nivel, examen) => {
    const destino = nivel ? (examen ? `preparado al ${nivel}` : `al ${nivel}`) : null;
    if (tope) return "Vas al mejor ritmo posible: ya haces el máximo de clases a la semana.";
    return destino ? `Elige tu ritmo y mira cuándo llegas ${destino}.` : "Elige tu ritmo y mira cuándo consigues tu objetivo.";
  },
  ritmoFrase: (tope, nivel, examen) => {
    const destino = nivel ? (examen ? `preparado al ${nivel}` : `al ${nivel}`) : null;
    if (tope) return destino ? `Llegarás ${destino} en` : "Conseguirás tu objetivo en";
    return destino ? `Llegarías ${destino} en` : "Conseguirías tu objetivo en";
  },
  horas: (h) => `${h} h`,
  tuPlanNota: " · tu plan",
  mesDeLlegada: (indiceMes, anio) => `${MESES_ES[indiceMes]} de ${anio}`,
  detalleActual: (meses) => `${meses === 1 ? "1 mes" : `${meses} meses`} · es tu plan actual`,
  detalleAhorro: (meses, ahorro) =>
    `${meses === 1 ? "1 mes" : `${meses} meses`} · ${ahorro === 1 ? "1 mes" : `${ahorro} meses`} antes que con tu plan`,
  enMeses: (n) => (n === 1 ? "1 mes" : `${n} meses`),
  ampliaTuPlan: "Amplía tu plan",
  tuDiploma: "Tu diploma",
  cuentaDiploma: (meses, dias) => {
    const m = meses === 1 ? "1 mes" : `${meses} meses`;
    const d = dias === 1 ? "1 día" : `${dias} días`;
    return meses === 0 ? d : dias === 0 ? m : `${m} y ${d}`;
  },
  paraTuDiploma: "para tu diploma",
  leccionesDe: (hechas, total) => `${hechas} de ${total} lecciones`,
  diplomaHoy: "Hoy es el día de tu diploma",
  retomaTuCurso: "¡Retoma tu curso y consigue tu diploma!",
  retomaTuCursoCorto: "¡Retoma tu curso!",
  diplomaConseguido: "Diploma conseguido",
  empezarMiCurso: "Empezar mi curso",
  irAMiCurso: "Ir a mi curso",
  continuarMiCurso: "Continuar mi curso",
  verMiCurso: "Ver mi curso",
  recorridoResumen: (n, fecha, titulo) =>
    [`${n} ${n === 1 ? "clase" : "clases"}`, [fecha ? `la última, el ${fecha}` : "la última", titulo].filter(Boolean).join(": ")].join(" · "),
  verTodas: "Ver todas",
  plegar: "Plegar",
};

const EN: TextosProgreso = {
  tuProgreso: "Your progress in English",
  esteEsTuProgreso: (nombre) => `Here's what you've got so far, ${nombre}.`,
  resumenDeTuNivel:
    "A summary of your level, what you already handle well and where we're heading in the next classes.",

  clasesHechas: (n) => (n === 1 ? "Class done" : "Classes done"),
  nivelActual: "Current level",
  // Conserva la distancia del español: es una estimación nuestra, no un
  // hecho, y quien la confirma es el profesor.
  nivelEstimado: "Estimated · check it with your teacher",
  nivelPrueba: "From your level test",
  nivelConfirmadoPor: (profesor) => (profesor ? `✓ Confirmed by ${profesor}` : "✓ Confirmed by your teacher"),
  cadaSemana: "Each week",
  clase: "Class",
  proximoHito: "Next milestone",
  hitosCompletos: "All milestones done",

  tuObjetivo: "Your goal",
  loQueYaHacesBien: "What you already do well",
  loQueEstamosReforzando: "What we're working on",
  enQueTrabajamosAhora: "What we're on right now",
  focoActual: "Current focus",
  informePrivado:
    "This report is private and only for you. If anything comes up, mention it to your teacher.",

  tuNivel: "Your level",
  estasAqui: "You're here",
  tuMeta: "Your goal",

  tuRecorrido: "Your path, class by class",
  recorridoVacio: "A summary of each class will show up here as you go along.",
  verLasClases: (n) => `See all ${n} classes`,
  claseNumero: (n) => `Class ${n}`,
  fechaLarga: (dia, indiceMes, anio) => `${dia} ${MESES_EN[indiceMes]} ${anio}`,
  hito: "Milestone",

  hola: (nombre) => (nombre ? `Hi, ${nombre}.` : "Hi."),
  entradilla: "Here's how far you've come and what's still ahead.",
  tuRitmo: "Your pace",
  horasALaSemana: "Class hours per week",
  ritmoPregunta: (tope, nivel, examen) => {
    if (tope) return "You're at the best pace possible: you already take the most classes a week.";
    if (!nivel) return "Pick your pace and see when you reach your goal.";
    return examen ? `Pick your pace and see when you're ready for ${nivel}.` : `Pick your pace and see when you reach ${nivel}.`;
  },
  ritmoFrase: (tope, nivel, examen) => {
    if (!nivel) return tope ? "You'll reach your goal in" : "You'd reach your goal in";
    const verbo = tope ? "You'll" : "You'd";
    return examen ? `${verbo} be ready for ${nivel} in` : `${verbo} reach ${nivel} in`;
  },
  horas: (h) => `${h} h`,
  tuPlanNota: " · your plan",
  mesDeLlegada: (indiceMes, anio) => `${MESES_EN[indiceMes]} ${anio}`,
  detalleActual: (meses) => `${meses === 1 ? "1 month" : `${meses} months`} · your current plan`,
  detalleAhorro: (meses, ahorro) =>
    `${meses === 1 ? "1 month" : `${meses} months`} · ${ahorro === 1 ? "1 month" : `${ahorro} months`} sooner than your plan`,
  enMeses: (n) => (n === 1 ? "1 month" : `${n} months`),
  ampliaTuPlan: "Upgrade your plan",
  tuDiploma: "Your diploma",
  cuentaDiploma: (meses, dias) => {
    const m = meses === 1 ? "1 month" : `${meses} months`;
    const d = dias === 1 ? "1 day" : `${dias} days`;
    return meses === 0 ? d : dias === 0 ? m : `${m} and ${d}`;
  },
  paraTuDiploma: "to your diploma",
  leccionesDe: (hechas, total) => `${hechas} of ${total} lessons`,
  diplomaHoy: "Today is your diploma day",
  retomaTuCurso: "Pick your course back up and get your diploma!",
  retomaTuCursoCorto: "Pick your course back up!",
  diplomaConseguido: "Diploma earned",
  empezarMiCurso: "Start my course",
  irAMiCurso: "Go to my course",
  continuarMiCurso: "Continue my course",
  verMiCurso: "See my course",
  recorridoResumen: (n, fecha, titulo) =>
    [`${n} ${n === 1 ? "class" : "classes"}`, [fecha ? `the latest on ${fecha}` : "the latest", titulo].filter(Boolean).join(": ")].join(" · "),
  verTodas: "See all",
  plegar: "Collapse",
};

export const PROGRESO: Record<Idioma, TextosProgreso> = { en: EN, es: ES };
