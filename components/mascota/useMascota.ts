"use client";

import { useCallback, useState } from "react";
import type { EstadoMascota } from "@/components/mascota/estados";

/**
 * El mando de la mascota desde fuera.
 *
 *   const mascota = useMascota();
 *   <Geckonoid {...mascota} size={240} />
 *   mascota.dispara("exito");
 *
 * `dispara` cambia el estado Y cuenta el disparo: así, disparar dos veces
 * seguidas el mismo estado —«exito» al acertar dos ejercicios— vuelve a
 * lanzar la animación aunque el valor no cambie. El componente vuelve
 * solo a idle a los 2,5 s; este hook no necesita enterarse, porque el
 * siguiente disparo trae un número nuevo.
 */
export function useMascota(inicial: EstadoMascota = "idle") {
  const [estado, setEstado] = useState<EstadoMascota>(inicial);
  const [disparo, setDisparo] = useState(0);

  const dispara = useCallback((nuevo: EstadoMascota) => {
    setEstado(nuevo);
    setDisparo((n) => n + 1);
  }, []);

  return { estado, disparo, dispara };
}
