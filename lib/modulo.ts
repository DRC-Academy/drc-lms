// ---------------------------------------------------------------
// EL TÍTULO DE UN MÓDULO, PARTIDO EN SUS PIEZAS
//
// Los 48 módulos de cada curso llegaron de LearnDash con el número
// dentro del título:
//
//   "Week 1 - Lesson 1: Advanced Spoken Structures for Natural Fluency"
//
// Pintado tal cual, cada tarjeta y cada cabecera repiten "Week 1 -
// Lesson 1:" antes de llegar a lo que de verdad distingue a un módulo
// de otro. Partiéndolo, el número va a la etiqueta —donde se lee de un
// vistazo y no estorba— y el título queda limpio.
//
// OJO CON LA SEMANA: el número se repite. El curso son seis ciclos de
// cuatro semanas, así que "Week 1" aparece seis veces a lo largo de los
// 47 módulos. Por sí sola no agrupa nada —daría seis "Semana 1"
// distintas— y durante un tiempo eso la dejó reducida a etiqueta.
//
// Con el mes por encima vuelve a significar algo: la semana 1 del mes 3
// es un sitio concreto del curso. Ese reinicio cada ocho módulos es
// justamente lo que confirma dónde corta un mes. Quien agrupa es
// `lib/temario.ts`; aquí solo se lee el número del título.
// ---------------------------------------------------------------

export type ModuloPartido = {
  /** El número de semana del título, o null si no venía. */
  semana: number | null;
  /** Posición del módulo en el curso, empezando en 1. */
  numero: number;
  /** El título sin el prefijo. */
  titulo: string;
};

const PATRON = /^\s*week\s+(\d+)\s*[-–—]\s*lesson\s+\d+\s*:\s*(.+)$/i;

export function partirModulo(titulo: string, orden: number): ModuloPartido {
  const numero = orden + 1;
  const coincide = titulo.match(PATRON);

  if (!coincide) return { semana: null, numero, titulo: titulo.trim() };

  return {
    semana: Number(coincide[1]),
    numero,
    titulo: coincide[2].trim(),
  };
}

/** "Semana 1 · Módulo 3" para la etiqueta, o solo el módulo si no hay semana. */
export function etiquetaModulo(partido: ModuloPartido): string {
  return partido.semana === null
    ? `Módulo ${partido.numero}`
    : `Semana ${partido.semana} · Módulo ${partido.numero}`;
}
