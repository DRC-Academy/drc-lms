// ---------------------------------------------------------------
// PROGRESO: LAS REGLAS
//
// Aquí ya no se guarda nada. El progreso vivía en localStorage y ahora
// vive en la base propia del LMS: leerlo y escribirlo es cosa de
// `lib/progreso-servidor.ts`, que es server-only.
//
// Lo que queda es lo que tiene que poder ejecutarse en los dos lados:
// los tipos y el cálculo del estado de un bloque. `components/Practica.tsx`
// y `components/ListaBloques.tsx` son componentes cliente y esto lo
// importan, así que este módulo NO puede llevar `import "server-only"`
// ni tocar el cliente de Supabase.
// ---------------------------------------------------------------

import type { Bloque } from "@/lib/data";

/** A partir de este porcentaje consideramos el bloque dominado. */
export const UMBRAL_DOMINADO = 80;

/**
 * El mejor intento de un bloque. `fecha` es la del intento que se está
 * enseñando, no la del último: si alguien saca 90 y luego 40, lo que se
 * muestra es el 90 y su fecha.
 */
export type RegistroProgreso = { aciertos: number; total: number; fecha: string };

export type RegistroAvance = { indice: number; total: number; fecha: string };

export type EstadoBloque = "dominado" | "en-curso" | "nuevo" | "sin-empezar";

/**
 * Lo que el navegador manda a migrar la primera vez que un alumno entra
 * después del cambio a base de datos.
 *
 * El tipo vive en este módulo, y no en `lib/progreso-servidor.ts`, para
 * que lo puedan importar los dos lados: quien lo lee del localStorage es
 * cliente y quien lo vuelca es server-only.
 */
export type ProgresoLocal = {
  progreso: { bloqueClave: string; aciertos: number; total: number; fecha: string }[];
  avance: { bloqueClave: string; indice: number; total: number; fecha: string }[];
  bloques: { bloque: Bloque; creado: string }[];
};

/**
 * Estado visible de un bloque. El orden importa: un bloque generado
 * que ya se ha practicado deja de ser "nuevo".
 */
export function estadoDeBloque(
  progreso: RegistroProgreso | undefined,
  avance: RegistroAvance | undefined,
  esGenerado: boolean
): { estado: EstadoBloque; porcentaje: number | null; fases: number } {
  if (progreso && progreso.total > 0) {
    const porcentaje = Math.round((progreso.aciertos / progreso.total) * 100);
    return {
      estado: porcentaje >= UMBRAL_DOMINADO ? "dominado" : "en-curso",
      porcentaje,
      fases: 3,
    };
  }

  if (avance) {
    // ---------------------------------------------------------------
    // POR QUÉ FASE VA, CALCULADO Y NO ESCRITO A MANO
    //
    // Los cortes eran fijos —índice 2 y 4— porque todos los bloques
    // tenían cinco ejercicios: 2 reconocer, 2 transformar, 1 producir.
    // Ahora los nuevos llevan diez (4, 4, 2) y los viejos siguen en la
    // base con cinco, así que un corte fijo diría "fase 3" en el quinto
    // ejercicio de un bloque de diez, cuando ahí todavía va por el
    // primer transformar.
    //
    // Se saca del propio avance, que ya guarda cuántos ejercicios tiene
    // ese bloque: reconocer ocupa la primera mitad de los cerrados,
    // transformar la segunda, y producir el último quinto. Las dos
    // formas caen donde tienen que caer sin preguntar por ninguna.
    // ---------------------------------------------------------------
    const total = avance.total > 0 ? avance.total : 5;
    const finReconocer = Math.round(total * 0.4); // 2 de 5, 4 de 10
    const finTransformar = Math.round(total * 0.8); // 4 de 5, 8 de 10

    const fases = avance.indice >= finTransformar ? 3 : avance.indice >= finReconocer ? 2 : 1;
    return { estado: "en-curso", porcentaje: null, fases };
  }

  return { estado: esGenerado ? "nuevo" : "sin-empezar", porcentaje: null, fases: 0 };
}
