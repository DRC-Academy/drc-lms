"use client";

import { useCallback, useEffect, useRef, type CSSProperties } from "react";
import parchesJson from "@/components/mascota/parches.json";
import type { EstadoMascota } from "@/components/mascota/estados";
import { storeMascota, type LadoAncla } from "@/components/mascota/store";

/**
 * UN SITIO PARA LA MASCOTA.
 *
 *   const ref = useAnclaMascota("parati-ruta", { prioridad: 2, estado: "idle" });
 *   <div ref={ref} style={{ width, height }} />
 *
 *   <AnclaMascota id="inicio-espera" prioridad={3} tamaño={112} estado="estudiando" />
 *
 * El ancla es un hueco vacío en la maqueta, del tamaño que ocupará la
 * mascota: la capa (CapaMascota) lo mide en cada frame y pone encima la
 * única mascota que hay, con su ALTO. Si el hueco es más ancho que ella,
 * `lado` dice hacia dónde se alinea. Entre todas las anclas visibles
 * gana la de más prioridad; sin ninguna, la mascota se va a la percha.
 *
 * `estado` es lo que hace mientras está aquí y nadie le pide otra cosa:
 * «estudiando» en la espera, el diploma con el curso terminado. Los
 * estados de paso se piden con `useMascota().dispara`.
 *
 * `activa: false` deja el ancla declarada pero fuera de juego (la ruta,
 * mientras todavía no sabe dónde va). Los ids tienen que ser únicos
 * entre las anclas montadas a la vez.
 */

export type OpcionesAncla = {
  prioridad: number;
  estado?: EstadoMascota;
  quieta?: boolean;
  lado?: LadoAncla;
  activa?: boolean;
  titulo?: string;
  onToque?: () => void;
};

export function useAnclaMascota(id: string, opciones: OpcionesAncla) {
  const { prioridad, estado = "idle", quieta = false, lado = "centro", activa = true, titulo } = opciones;
  const el = useRef<HTMLElement | null>(null);
  // El callback se lee de un ref: cambia en cada render y no tiene por
  // qué tocar el store.
  const toque = useRef(opciones.onToque);
  toque.current = opciones.onToque;
  const onToque = useCallback(() => toque.current?.(), []);

  // Se registra al montar y se quita al desmontar; lo demás se actualiza.
  useEffect(() => {
    storeMascota.registrarAncla(id, { prioridad, el: el.current, estado, quieta, lado, activa, titulo, onToque });
    return () => storeMascota.quitarAncla(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);
  useEffect(() => {
    storeMascota.actualizarAncla(id, { prioridad, estado, quieta, lado, activa, titulo });
  }, [id, prioridad, estado, quieta, lado, activa, titulo]);

  return useCallback(
    (nodo: HTMLElement | null) => {
      el.current = nodo;
      storeMascota.actualizarAncla(id, { el: nodo });
    },
    [id],
  );
}

const PROPORCION = parchesJson.lienzo.proporcion;

/**
 * El hueco hecho: `tamaño` es el alto en escritorio (≥ 900 px); en móvil
 * va a 0,7. Con `className` se le puede dar otro tamaño por breakpoint:
 * entonces `tamaño` no se usa para medir.
 */
export default function AnclaMascota({
  id,
  tamaño = 120,
  className,
  ...opciones
}: OpcionesAncla & { id: string; tamaño?: number; className?: string }) {
  const ref = useAnclaMascota(id, opciones);
  const estilo = className
    ? undefined
    : ({ "--alto-ancla": `${tamaño}px`, aspectRatio: `${PROPORCION}` } as CSSProperties);
  return (
    <div
      ref={ref}
      aria-hidden
      data-ancla-mascota={id}
      className={className ?? "h-[calc(var(--alto-ancla)*0.7)] shrink-0 min-[900px]:h-[var(--alto-ancla)]"}
      style={estilo}
    />
  );
}
