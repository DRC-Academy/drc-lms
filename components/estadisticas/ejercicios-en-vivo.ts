"use client";

import { useEffect, useSyncExternalStore } from "react";
import type { EstadisticasAlumno } from "@/lib/estadisticas";

// ---------------------------------------------------------------
// «EJERCICIOS HECHOS» AL DÍA, SIN VOLVER A PINTAR LA PÁGINA
//
// Antes, cada intento guardado lanzaba un `router.refresh()` para que la
// cifra de «Cómo vas» subiera: la lección y el marco enteros otra vez en
// el servidor, con sus cuatro consultas a Gestión, por cada ejercicio.
// Era la mitad de lo que el LMS le pedía a Gestión.
//
// Ahora la ruta de intentos dice si era el PRIMERO de ese ejercicio
// (`nuevo`), y aquí se suman esos a la cifra que pintó el servidor.
//
// EL SERVIDOR SIGUE MANDANDO. Lo sumado vale mientras la cifra del
// servidor sea la misma sobre la que se sumó; en cuanto llega otra —el
// alumno navega y el marco se vuelve a pintar, ya con esos intentos
// dentro—, se descarta. Así no se cuenta nada dos veces.
// ---------------------------------------------------------------

/** La cifra del servidor sobre la que se están sumando los de ahora. */
let base: number | null = null;
const nuevos = new Set<string>();
const oyentes = new Set<() => void>();

function avisar() {
  oyentes.forEach((o) => o());
}

function suscribir(oyente: () => void) {
  oyentes.add(oyente);
  return () => {
    oyentes.delete(oyente);
  };
}

/** Un ejercicio respondido por primera vez: «Ejercicios hechos» sube uno. */
export function anotarEjercicioNuevo(ejercicioId: string) {
  if (nuevos.has(ejercicioId)) return;
  nuevos.add(ejercicioId);
  avisar();
}

/** Las estadísticas del servidor con los ejercicios nuevos de ahora sumados. */
export function useEstadisticasEnVivo(e: EstadisticasAlumno): EstadisticasAlumno {
  const sumados = useSyncExternalStore(
    suscribir,
    () => nuevos.size,
    () => 0
  );

  // Una cifra nueva del servidor ya los trae: se empieza de cero sobre ella.
  useEffect(() => {
    if (base === e.ejercicios) return;
    base = e.ejercicios;
    if (nuevos.size > 0) {
      nuevos.clear();
      avisar();
    }
  }, [e.ejercicios]);

  if (e.ejercicios === null || base !== e.ejercicios || sumados === 0) return e;
  return { ...e, ejercicios: e.ejercicios + sumados };
}
