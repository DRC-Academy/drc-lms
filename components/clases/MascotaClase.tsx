"use client";

import { useEffect } from "react";
import AnclaMascota from "@/components/mascota/AnclaMascota";
import { storeMascota } from "@/components/mascota/store";

/**
 * LA MASCOTA DEL BANNER DE LA CLASE: su sitio arriba a la derecha y su
 * bocadillo, señalando el horario.
 *
 * No pinta la mascota —es un ancla, ver AnclaMascota—: la única que hay
 * viaja aquí desde la percha. Al posarse señala una vez (el gesto
 * «senala», que apunta a su izquierda: al horario) y se queda mirando los
 * números. Con prefers-reduced-motion la capa no hace el viaje y el
 * bocadillo aparece sin animación (la regla global de globals.css).
 *
 * EL BOCADILLO NO ESTÁ AQUÍ: lo pinta el banner en el servidor, en la
 * fila de la chapa, con la frase elegida con la misma `ventanaAbierta` que
 * decide el botón. Aquí no se mira la hora.
 *
 * La mascota es decorativa. En móvil, más chica, junto a la chapa; desde
 * 768 px, a la derecha del bocadillo y por encima del horario.
 */

const ANCLA = "clases-banner";
/** Lo que tarda en llegar desde la percha y posarse, antes de señalar. */
const SENALA_TRAS_MS = 1300;
const SENALA_MS = 2600;

export default function MascotaClase({ idHora }: { idHora: string }) {
  useEffect(() => {
    const hora = document.getElementById(idHora);
    storeMascota.mirarA(hora);
    const reloj = setTimeout(() => storeMascota.gesto("senala", { desde: ANCLA, duracion: SENALA_MS }), SENALA_TRAS_MS);
    return () => {
      clearTimeout(reloj);
      storeMascota.mirarA(null);
    };
  }, [idHora]);

  return (
    <div className="absolute right-2 top-2 md:right-6 md:top-4">
      <AnclaMascota id={ANCLA} prioridad={2} lado="der" className="h-[72px] w-[56px] md:h-[128px] md:w-[100px]" />
    </div>
  );
}
