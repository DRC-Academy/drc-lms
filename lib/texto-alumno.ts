// ---------------------------------------------------------------
// ¿ESTE TEXTO SE LE PUEDE ENSEÑAR AL ALUMNO?
//
// ⚠ COPIA DECLARADA de `lib/studentFacing.ts` y del `toBullets` de
// `components/alumnos/studentPageUi.tsx`, los dos de DRC GESTIÓN. Mismo
// trato que `lib/estimacion.ts`: si allí se añade un marcador, aquí hay
// que añadirlo, y no hay compilador que lo detecte.
//
// POR QUÉ EXISTE
//
// La ficha de IA (`student_profiles`) está escrita PARA EL PROFESOR.
// Cuando el alumno no ha completado el formulario, la IA no se inventa
// una ficha: escribe notas de trabajo dirigidas al profesor, y esas
// notas caían enteras en la página pública de progreso. Un alumno real
// abrió su enlace y leyó, bajo el título "Tu objetivo":
//
//   "No especificado: el alumno respondió '1' a la pregunta sobre su
//    motivación. Conviene preguntárselo directamente al inicio de la
//    primera clase."
//
// Son notas internas delante de un cliente que paga. Esto las corta.
//
// EL CRITERIO ES ASIMÉTRICO A PROPÓSITO. Esconder de más deja una
// tarjeta vacía, que simplemente no se pinta y no le cuesta nada a
// nadie. Enseñar de menos deja al descubierto cómo hablamos del alumno
// cuando no nos oye. Ante la duda, se esconde.
//
// ESTO NO ARREGLA EL ORIGEN. La ficha se sigue generando en tercera
// persona; lo que corresponde a largo plazo es que el prompt escriba
// aparte una versión para el alumno. Mientras tanto, esto es el
// cortafuegos, y el LMS lo necesita porque enseña los mismos textos.
//
// PENDIENTE EN GESTIÓN, y ya con medida: de los 174 alumnos, 52 tienen
// `objetivo_perfil` relleno, 50 pasan por aquí y se pintan, y de esos
// 50 ninguno le habla al alumno. Cero. No es un caso raro, es cómo se
// genera la ficha.
//
// Mientras tanto el LMS se ha montado el apaño:
// `scripts/reescribir-objetivos.ts` reescribe en segunda persona y
// guarda en la base del LMS, porque en la de Gestión no se puede
// escribir. El día que el prompt de allí escriba las dos versiones
// del objetivo —la del profesor y la del alumno—, ese script, su
// tabla y `lib/objetivo-servidor.ts` se borran.
// ---------------------------------------------------------------

/**
 * Marcas de que el texto habla DEL alumno (y no AL alumno) o de que
 * confiesa que faltan datos. Se evalúan sobre el texto normalizado.
 */
const MARCAS_INTERNAS: RegExp[] = [
  // Habla del alumno o del profesor en tercera persona.
  /\b(el|la|del|al)\s+alumn[oa]\b/,
  /\bl[oa]s\s+alumn[oa]s\b/,
  /\b(el|la|del|al)\s+(profesor|profesora|docente)\b/,
  // Se refiere a los papeles internos.
  /\b(la|su|una)\s+ficha\b/,
  /\bficha\s+(incompleta|vacia|sin)\b/,
  /\bdiagnostic[oa]\b/,
  /\bformulario\s+(inicial|sin|no)\b/,
  // Confiesa que no hay datos.
  /\bno\s+especificad[oa]\b/,
  /\bsin\s+especificar\b/,
  /\bno\s+se\s+puede\s+determinar\b/,
  /\bsin\s+determinar\b/,
  /\bfalta[n]?\s+(informacion|datos|dato)\b/,
  /\bno\s+hay\s+(informacion|datos)\b/,
  /\bno\s+respondio\b/,
  /\brespondio\s*["'‘’]?\s*\d/,
  // Le da instrucciones al profesor.
  /\bconviene\s+(pregunt|indagar|averiguar|confirmar)/,
  /\bhabria\s+que\s+pregunt/,
  /\bhay\s+que\s+pregunt/,
];

/**
 * Sin tildes y en minúsculas.
 *
 * Gestión usa `/\p{Diacritic}/gu`; aquí no compila porque este repo no
 * fija `target` y TypeScript asume ES5. El rango \u0300-\u036f es el
 * bloque de marcas combinantes, que después de `normalize("NFD")` es
 * justo lo que aquel separa. Mismo resultado. Ver la nota igual en
 * `lib/estimacion.ts`.
 */
function normalizar(texto: string): string {
  return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

/**
 * True si el texto se le puede enseñar al alumno tal cual.
 *
 * El texto vacío devuelve false: no hay nada que enseñar, y así quien
 * llame no tiene que comprobar el vacío por su cuenta.
 */
export function esParaElAlumno(texto: string | null | undefined): boolean {
  const crudo = (texto ?? "").trim();
  if (!crudo) return false;
  const limpio = normalizar(crudo);
  return !MARCAS_INTERNAS.some((marca) => marca.test(limpio));
}

/** Se queda con las frases que sí puede leer el alumno. */
export function soloParaElAlumno(frases: string[]): string[] {
  return frases.filter(esParaElAlumno);
}

/** El texto si es publicable, o null. Para decidir si se pinta la tarjeta. */
export function textoParaElAlumno(texto: string | null | undefined): string | null {
  return esParaElAlumno(texto) ? (texto as string).trim() : null;
}

/**
 * Parte un campo de la ficha en viñetas.
 *
 * La IA escribe unas veces una lista y otras un párrafo corrido, así que
 * se prueban las dos formas antes de rendirse y devolver el texto entero
 * como una sola viñeta.
 */
export function enViñetas(texto: string | null | undefined): string[] {
  const crudo = (texto ?? "").trim();
  if (!crudo) return [];

  // 1) Si ya viene como lista (saltos de línea con guion, número o
  //    viñeta), se respeta.
  const lineas = crudo.split(/\r?\n+/).map((l) => l.trim()).filter(Boolean);
  const marcadas = lineas.filter((l) => /^([-–—*•]|\d+[.)])\s+/.test(l));
  if (marcadas.length >= 2) {
    return marcadas.map((l) => l.replace(/^([-–—*•]|\d+[.)])\s+/, "").trim()).filter(Boolean);
  }
  if (lineas.length >= 2) return lineas;

  // 2) Párrafo corrido: se corta por punto o punto y coma cuando lo que
  //    sigue empieza en mayúscula, que evita partir por las
  //    abreviaturas más obvias.
  //
  //    Gestión lo hace con un lookbehind `(?<=[.;])`. Aquí se resuelve
  //    con un grupo de captura y `join`, porque el lookbehind es de
  //    ES2018 y este repo compila a ES5. El resultado es el mismo.
  const partes = crudo
    .split(/([.;])\s+(?=[A-ZÁÉÍÓÚÑ¿¡])/)
    .reduce<string[]>((acumulado, trozo, indice) => {
      // Los índices impares son el signo capturado: se pega al trozo
      // anterior en vez de convertirse en un elemento suelto.
      if (indice % 2 === 1) acumulado[acumulado.length - 1] += trozo;
      else acumulado.push(trozo);
      return acumulado;
    }, [])
    .map((s) => s.trim())
    .filter(Boolean);

  return partes.length > 1 ? partes.map((s) => s.replace(/[.;]$/, "")) : [crudo];
}
