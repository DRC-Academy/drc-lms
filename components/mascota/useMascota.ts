"use client";

import type { EstadoMascota } from "@/components/mascota/estados";
import { estadoVisible, storeMascota, useStoreMascota, type GestoLibre } from "@/components/mascota/store";

/**
 * El mando de la mascota desde fuera.
 *
 *   const mascota = useMascota();
 *   mascota.dispara("exito");
 *   mascota.gesto("saludo");
 *
 * Hay UNA mascota para toda la app y la pinta CapaMascota; esto no pinta
 * nada: habla con el store (components/mascota/store.ts). Para decir
 * DÓNDE va, se declara un ancla (`useAnclaMascota`).
 *
 * `dispara` enseña un estado de paso —éxito, ánimo, duda— durante 2,5 s
 * y vuelve solo al de base del ancla; disparar dos veces el mismo
 * vuelve a lanzar la animación. `gesto` pone una pose suelta encima.
 * Con `desde`, lo pedido solo vale si ese ancla es la que manda.
 */
export type MandoMascota = {
  estado: EstadoMascota;
  disparo: number;
  dispara: (nuevo: EstadoMascota) => void;
  /** Cualquiera menos «senala», que tiene objetivo: `storeMascota.senalar(el)`. */
  gesto: (nombre: GestoLibre) => void;
};

export function useMascota(opciones: { desde?: string } = {}): MandoMascota {
  const estado = useStoreMascota(estadoVisible);
  const disparo = useStoreMascota((e) => e.disparo);
  return {
    estado,
    disparo,
    dispara: (nuevo) => storeMascota.dispara(nuevo, opciones),
    gesto: (nombre) => storeMascota.gesto(nombre, opciones),
  };
}
