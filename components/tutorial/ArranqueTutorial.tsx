"use client";

import { useEffect } from "react";
import { storeMascota } from "@/components/mascota/store";
import { lanzarTutorial } from "@/components/tutorial/eventos";
import { marcarRecorridoVisto } from "@/app/acciones-tutorial";

/**
 * EL ONBOARDING: lanza el recorrido guiado la primera vez que el alumno
 * llega al inicio. Lo monta el inicio solo si la base dice que no lo ha
 * visto (`tutorialPendiente`) y no es el equipo revisando una ficha.
 *
 * NO SE LANZA ENCIMA DE OTRA COSA: si hay un bloque generándose (la
 * mascota está en su espera, con estado «estudiando») o el chat de Ayuda
 * está abierto, espera a otra visita, sin marcar nada. Tampoco si ya hay
 * un recorrido en marcha.
 *
 * SE MARCA COMO VISTO AL ARRANCAR: terminarlo, saltarlo o cerrar la
 * pestaña a medias cuentan igual. No se le persigue.
 */
const ESPERA_MS = 1800;

export default function ArranqueTutorial() {
  useEffect(() => {
    const reloj = setTimeout(() => {
      try {
        if (sessionStorage.getItem("drc:tutorial")) return;
      } catch {
        // Sin almacenamiento, se sigue.
      }
      if (document.querySelector("[data-ayuda-abierta]")) return;
      const generando = Object.values(storeMascota.leer().anclas).some((a) => a.estado === "estudiando");
      if (generando) return;
      lanzarTutorial("onboarding");
      void marcarRecorridoVisto();
    }, ESPERA_MS);
    return () => clearTimeout(reloj);
  }, []);

  return null;
}
