// ---------------------------------------------------------------
// QUÉ SE LE AVISA A UN ALUMNO, Y QUÉ NO
//
// La decisión, aparte de la base y del correo. Aquí solo hay reglas y
// fechas: quien llama trae los módulos ya leídos y se lleva dos listas.
//
// LA APERTURA NO SE CALCULA AQUÍ. Se llama a `calcularApertura` de
// `lib/drip.ts`, que es la misma función que decide si la pantalla pinta
// el candado. Si el correo tuviera su propia cuenta de días, el día que
// alguien tocara una de las dos empezarían a decir cosas distintas: el
// alumno recibiría «ya lo tienes» y encontraría un candado.
//
// LA VENTANA DE DOS DÍAS es lo que hace que esto sea seguro de arrancar
// y de dejar caído. Solo se avisa de lo que se abrió HOY o AYER; lo más
// viejo no genera correo por mucho que nadie lo haya anunciado nunca.
// Sin esa ventana, un cron parado una semana volvería y mandaría el
// atracón que veníamos a evitar, y la primera ejecución anunciaría
// contenido de hace meses.
//
// EL CONTENIDO INICIAL NO SE AVISA. Los módulos con `visible_after` 0 —
// entre 2 y 34 por curso— están abiertos desde el primer día: no hay
// ningún momento en que «se abran», así que no hay nada que anunciar. Un
// alumno que empieza vería si no un correo con treinta y cuatro módulos.
//
// Módulo puro: sin `server-only`, para poder probarlo sin base.
// ---------------------------------------------------------------

import { calcularApertura } from "@/lib/drip";
import { diasNaturales } from "@/lib/fechas";

/**
 * Cuántos días atrás se sigue considerando «recién abierto».
 *
 * 1 = hoy y ayer. Con el cron diario basta hoy; el día de más es el
 * colchón para una ejecución que no salió, para el desfase de la hora
 * del cron y para los cambios de hora.
 */
export const VENTANA_DIAS = 1;

export type ModuloDelCurso = {
  id: string;
  /** Ya limpio de "Week 1 - Lesson 3:", que es como viene de LearnDash. */
  titulo: string;
  /** Su sitio en el curso, desde 0. */
  orden: number;
  /** Días desde la matrícula que pide el módulo. 0 = desde el principio. */
  visibleAfter: number;
  totalLecciones: number;
  /**
   * A dónde lleva el botón del correo: la primera lección del módulo
   * que el alumno no tenga hecha. Null si el módulo está vacío.
   */
  destino: string | null;
};

export type Reparto = {
  /** Se han abierto hoy o ayer. Son los que se anuncian. */
  nuevos: ModuloDelCurso[];
  /**
   * Todo lo que este alumno tiene abierto ahora mismo, recién abierto o
   * no. Es lo que marca la primera pasada para que no se anuncie nunca.
   */
  abiertos: ModuloDelCurso[];
};

/**
 * Reparte los módulos de UN curso para UN alumno.
 *
 * @param fechaInicio Cuándo empezó en la academia. Null = sin drip.
 */
export function repartirModulos(
  modulos: ModuloDelCurso[],
  fechaInicio: Date | null,
  ahora: Date
): Reparto {
  const nuevos: ModuloDelCurso[] = [];
  const abiertos: ModuloDelCurso[] = [];

  // Sin fecha de inicio el drip no se aplica y el curso entero está
  // abierto (ver `lib/drip.ts`). Todo se siembra y nada se anuncia: no
  // ha habido ninguna apertura que contar.
  const transcurridos = fechaInicio === null ? null : Math.max(0, diasNaturales(fechaInicio, ahora));

  for (const modulo of modulos) {
    if (!calcularApertura(modulo.visibleAfter, fechaInicio, ahora).abierto) continue;

    abiertos.push(modulo);

    if (modulo.visibleAfter <= 0 || transcurridos === null) continue;

    const diasDesdeQueSeAbrio = transcurridos - modulo.visibleAfter;
    if (diasDesdeQueSeAbrio >= 0 && diasDesdeQueSeAbrio <= VENTANA_DIAS) nuevos.push(modulo);
  }

  return { nuevos, abiertos };
}

/**
 * En qué semana del plan cae una apertura.
 *
 * El drip abre cada siete días —7, 14, 21… hasta 161—, así que la
 * semana es el número que el alumno reconoce de su curso. Se redondea
 * porque tres de los siete cursos tienen alguna apertura a destiempo
 * (días 9, 12) y «semana 1,3» no se le dice a nadie.
 */
export function semanaDelDrip(visibleAfter: number): number {
  return Math.max(1, Math.round(visibleAfter / 7));
}
