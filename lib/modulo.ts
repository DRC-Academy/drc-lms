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
// TRES FORMAS, NO UNA. Durante un tiempo aquí solo se reconocía la
// completa, y los 42 módulos que no la siguen salían con el prefijo
// puesto. De los 328 módulos importados:
//
//   · 284  "Week 1 - Lesson 1: Título"   la forma completa
//   ·  38  "Lesson 1: Título"            sin el tramo de Week
//   ·   4  "Week 1 - Título"             sin el tramo de Lesson
//   ·   2  "Título"                      ya limpios de origen
//
// Los 42 raros no están repartidos: 34 son de Inglés General A2 —que
// de sus 44 módulos solo tiene 8 en la forma completa— y 8 de CAE.
//
// NO ES COSMÉTICO. El título va también al correo de contenido nuevo
// (`lib/correo-avisos.ts`), donde "Week 3 - Future Plans" choca de
// frente con el asunto, que ya dice "Se ha abierto la semana 3 de tu
// curso".
//
// EL ORDEN DE LAS TRES IMPORTA. `SOLO_SEMANA` encaja también en la
// forma completa —y dejaría el título en "Lesson 1: …"—, así que la
// completa se prueba primero. Con `SOLO_LECCION` pasa lo mismo por el
// otro lado.
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
//
// Y POR ESO `SOLO_SEMANA` DEVUELVE `semana: null` aunque tenga el
// número delante. Sus cuatro módulos son de A2, donde cada uno vale por
// una semana entera en vez de por media: la semana declarada dice 1, 2,
// 3, 4 y `semanaPorPosicion` —que cuenta dos módulos por semana— dice
// 1, 1, 2, 2. Leer la declarada solo en esos cuatro dejaría el mes 3 de
// A2 agrupado con dos criterios a la vez, con módulos de la semana
// posicional 3 al lado de uno de la semana declarada 3. Mientras los
// otros cuarenta sigan sin número, el criterio único es la posición.
// Aquí se limpia el título y no se toca el temario.
// ---------------------------------------------------------------

import type { TextosCurso } from "@/lib/textos/curso";

export type ModuloPartido = {
  /** El número de semana del título, o null si no venía. */
  semana: number | null;
  /** Posición del módulo en el curso, empezando en 1. */
  numero: number;
  /** El título sin el prefijo. */
  titulo: string;
};

/**
 * Los tres prefijos, en orden de prueba.
 *
 * Los guiones son tres porque el export de LearnDash mezcla el ASCII
 * con los tipográficos, y el `\s*` de delante está por un "Week 2-
 * Lesson 4:" al que le falta el espacio.
 */
const COMPLETO = /^\s*week\s+(\d+)\s*[-–—]\s*lesson\s+\d+\s*[-–—:]\s*(.+)$/i;
const SOLO_SEMANA = /^\s*week\s+\d+\s*[-–—:]\s*(.+)$/i;
const SOLO_LECCION = /^\s*lesson\s+\d+\s*[-–—:]\s*(.+)$/i;

export function partirModulo(titulo: string, orden: number): ModuloPartido {
  const numero = orden + 1;

  const completo = titulo.match(COMPLETO);
  if (completo) return { semana: Number(completo[1]), numero, titulo: completo[2].trim() };

  // Sin semana a propósito: ver la nota de arriba.
  const soloSemana = titulo.match(SOLO_SEMANA);
  if (soloSemana) return { semana: null, numero, titulo: soloSemana[1].trim() };

  const soloLeccion = titulo.match(SOLO_LECCION);
  if (soloLeccion) return { semana: null, numero, titulo: soloLeccion[1].trim() };

  return { semana: null, numero, titulo: titulo.trim() };
}

/** "Semana 1 · Módulo 3" para la etiqueta, o solo el módulo si no hay semana. */
export function etiquetaModulo(partido: ModuloPartido, t: TextosCurso): string {
  return partido.semana === null
    ? t.moduloNumero(partido.numero)
    : t.semanaYModulo(partido.semana, partido.numero);
}
