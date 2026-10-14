"use client";

import { useCallback } from "react";
import { useSearchParams } from "next/navigation";

/**
 * EL PASO DE CADA FLUJO, EN LA URL (`?paso=`).
 *
 * Así el botón atrás del navegador y del móvil vuelve al paso anterior.
 * Se cambia con `history.pushState`, que Next (desde 14.1) sincroniza con
 * `useSearchParams`: no hay viaje al servidor y el estado del componente
 * —lo elegido— sigue donde estaba.
 *
 * La URL solo PIDE un paso. Cada flujo decide si puede enseñarlo con lo
 * que tiene elegido (tras recargar la página no hay nada elegido) y, si
 * no, enseña el último que sí puede y corrige la URL con `reemplazar`.
 */
export function usarPasoDeLaUrl<P extends string>(validos: readonly P[]) {
  const params = useSearchParams();
  const crudo = params.get("paso");
  const pedido = crudo !== null && (validos as readonly string[]).includes(crudo) ? (crudo as P) : null;

  const ir = useCallback((paso: P, reemplazar = false) => {
    const url = new URL(window.location.href);
    url.searchParams.set("paso", paso);
    const destino = `${url.pathname}${url.search}`;
    if (reemplazar) window.history.replaceState(null, "", destino);
    else window.history.pushState(null, "", destino);
  }, []);

  return { pedido, ir };
}

/**
 * El paso que se enseña: el pedido si se puede, si no el anterior más
 * cercano que se pueda, en el orden del flujo.
 */
export function pasoPosible<P extends string>(orden: readonly P[], pedido: P | null, puede: (p: P) => boolean): P {
  const desde = pedido === null ? 0 : orden.indexOf(pedido);
  for (let i = desde; i >= 0; i--) if (puede(orden[i])) return orden[i];
  return orden.find(puede) ?? orden[0];
}
