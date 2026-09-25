"use client";

import { useEffect, useRef } from "react";
import AnclaMascota from "@/components/mascota/AnclaMascota";
import { storeMascota, useStoreMascota } from "@/components/mascota/store";

/**
 * LA MASCOTA DE LA COMPARATIVA DE RITMO: su sitio en la fila del plan
 * recomendado y, al llegar, un salto en el sitio y señalar esa fila.
 *
 * No pinta la mascota —es un ancla, ver AnclaMascota—. PRIORIDAD 1, por
 * debajo de la bienvenida del inicio (2): mientras la franja del curso se
 * ve, la mascota se queda saludando allí. Viene aquí cuando el alumno ha
 * bajado y la franja ya no se ve, que en móvil es lo normal al llegar a
 * esta sección; en un escritorio donde se ve todo, se queda arriba.
 *
 * El salto y la señal van UNA VEZ por visita a la pantalla, al posarse:
 * hacerlo cada vez que vuelve a este sitio sería insistir. Hacia dónde
 * señala lo decide la capa (`calcularPoseMascota`); la fila queda a su
 * izquierda. Con prefers-reduced-motion la capa no hace el viaje ni el
 * salto.
 */

const ANCLA = "inicio-ritmo";
/** Lo que tarda en llegar y posarse antes del salto. */
const SALTA_TRAS_MS = 1300;
/** Del salto a señalar: que aterrice primero. */
const SENALA_TRAS_SALTO_MS = 800;
const SENALA_MS = 2600;

export default function MascotaRitmo({ idObjetivo }: { idObjetivo: string }) {
  const aqui = useStoreMascota((e) => e.activa === ANCLA);
  const hecho = useRef(false);

  useEffect(() => {
    if (!aqui || hecho.current) return;
    const salto = setTimeout(() => storeMascota.moverse("salto_sitio"), SALTA_TRAS_MS);
    const senal = setTimeout(() => {
      // Hecho solo al llegar aquí: si se va antes, lo hará la próxima vez.
      hecho.current = true;
      storeMascota.senalar(document.getElementById(idObjetivo), { desde: ANCLA, duracion: SENALA_MS });
    }, SALTA_TRAS_MS + SENALA_TRAS_SALTO_MS);
    return () => {
      clearTimeout(salto);
      clearTimeout(senal);
    };
  }, [aqui, idObjetivo]);

  return (
    <AnclaMascota
      id={ANCLA}
      prioridad={1}
      className="absolute bottom-0.5 right-2 h-[81px] w-[63px] min-[900px]:right-2.5 min-[900px]:h-[88px] min-[900px]:w-[68px]"
    />
  );
}
