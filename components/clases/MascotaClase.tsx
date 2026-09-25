"use client";

import { useEffect } from "react";
import AnclaMascota from "@/components/mascota/AnclaMascota";
import { storeMascota } from "@/components/mascota/store";

/**
 * LA MASCOTA DEL BANNER DE LA CLASE: su sitio arriba a la derecha y su
 * bocadillo, señalando el horario.
 *
 * No pinta la mascota —es un ancla, ver AnclaMascota—: la única que hay
 * viaja aquí desde la percha. Al posarse señala el horario una vez
 * —hacia donde quede: lo decide `calcularPoseMascota`, y si el horario
 * le queda encima o debajo no señala— y se queda mirando los números. Con prefers-reduced-motion la capa no hace el viaje y el
 * bocadillo aparece sin animación (la regla global de globals.css).
 *
 * EL BOCADILLO NO ESTÁ AQUÍ: lo pinta el banner en el servidor, en la
 * fila de la chapa, con la frase elegida con la misma `ventanaAbierta` que
 * decide el botón. Aquí no se mira la hora.
 *
 * La mascota es decorativa. El banner decide dónde va este hueco: en
 * móvil, 80 px de alto a la izquierda del bocadillo; desde 768 px, 200 px
 * de alto al pie de su columna. El lienzo de la mascota trae un 4,6 % de
 * aire debajo de los pies (21 de 458 px): el margen negativo lo
 * compensa, para que los pies pisen el mismo suelo que el botón.
 */

const ANCLA = "clases-banner";
/** Lo que tarda en llegar desde la percha y posarse, antes de señalar. */
const SENALA_TRAS_MS = 1300;
const SENALA_MS = 2600;

export default function MascotaClase({ idHora }: { idHora: string }) {
  useEffect(() => {
    const hora = document.getElementById(idHora);
    storeMascota.mirarA(hora);
    const reloj = setTimeout(() => storeMascota.senalar(hora, { desde: ANCLA, duracion: SENALA_MS }), SENALA_TRAS_MS);
    return () => {
      clearTimeout(reloj);
      storeMascota.mirarA(null);
    };
  }, [idHora]);

  return (
    <AnclaMascota
      id={ANCLA}
      prioridad={2}
      className="-mb-[4px] h-[80px] w-[62px] shrink-0 md:-mb-[9px] md:h-[200px] md:w-[155px]"
    />
  );
}
