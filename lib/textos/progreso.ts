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
};

const ES: TextosProgreso = {
  tuProgreso: "Tu progreso en inglés",
  esteEsTuProgreso: (nombre) => `Esto es lo que llevas conseguido, ${nombre}.`,
  resumenDeTuNivel:
    "Un resumen de tu nivel, de lo que ya dominas y de hacia dónde vamos en las próximas clases.",

  clasesHechas: (n) => (n === 1 ? "Clase hecha" : "Clases hechas"),
  nivelActual: "Nivel actual",
  nivelEstimado: "Estimado · confírmalo con tu profesor",
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
};

export const PROGRESO: Record<Idioma, TextosProgreso> = { en: EN, es: ES };
