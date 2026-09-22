"use client";

import { useCallback, useState } from "react";
import type { EstadoMascota, GestoMascota } from "@/components/mascota/estados";

/**
 * El mando de la mascota desde fuera.
 *
 *   const mascota = useMascota();
 *   <Geckonoid {...mascota} size={240} />
 *   mascota.dispara("exito");
 *   mascota.gesto("saludo");
 *
 * `dispara` cambia el estado Y cuenta el disparo: así, disparar dos veces
 * seguidas el mismo estado —«exito» al acertar dos ejercicios— vuelve a
 * lanzar la animación aunque el valor no cambie. El componente vuelve
 * solo a idle a los 2,5 s; este hook no necesita enterarse, porque el
 * siguiente disparo trae un número nuevo.
 *
 * `gesto` pide una pose suelta encima del estado que haya, con el mismo
 * truco: `pose.n` cambia en cada pedido, y el componente la quita sola.
 */
/** Lo que devuelve `useMascota`: lo que se le pasa a quien pinta la mascota. */
export type MandoMascota = {
  estado: EstadoMascota;
  disparo: number;
  dispara: (nuevo: EstadoMascota) => void;
  pose: { nombre: GestoMascota; n: number } | undefined;
  gesto: (nombre: GestoMascota) => void;
};

export function useMascota(inicial: EstadoMascota = "idle"): MandoMascota {
  const [estado, setEstado] = useState<EstadoMascota>(inicial);
  const [disparo, setDisparo] = useState(0);
  const [pose, setPose] = useState<MandoMascota["pose"]>();

  const dispara = useCallback((nuevo: EstadoMascota) => {
    setEstado(nuevo);
    setDisparo((n) => n + 1);
  }, []);

  const gesto = useCallback((nombre: GestoMascota) => {
    setPose((p) => ({ nombre, n: (p?.n ?? 0) + 1 }));
  }, []);

  return { estado, disparo, dispara, pose, gesto };
}
