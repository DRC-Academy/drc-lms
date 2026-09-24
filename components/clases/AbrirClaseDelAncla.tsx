"use client";

import { useEffect } from "react";

/**
 * EL ENLACE A UNA CLASE DEL HISTORIAL, AUNQUE ESTÉ PLEGADA.
 *
 * El historial de «Clases» solo enseña la última; el resto va dentro del
 * «Ver más clases», que es un `<details>`. El calendario («Ver lo que
 * trabajaste») y la tarjeta de la última clase enlazan a `#clase-<id>`, y
 * un ancla dentro de un `<details>` cerrado no lleva a nada visible. Esto
 * abre el desplegable que la contenga y la trae a la vista.
 *
 * Al cargar con el ancla puesta, al cambiar el ancla y al pulsar un enlace
 * a la MISMA ancla que ya está en la URL, que no dispara `hashchange`.
 */
export default function AbrirClaseDelAncla() {
  useEffect(() => {
    function abrir(ancla: string) {
      if (!ancla.startsWith("#clase-")) return;
      const destino = document.getElementById(decodeURIComponent(ancla.slice(1)));
      if (!destino) return;
      let padre = destino.parentElement;
      while (padre) {
        if (padre instanceof HTMLDetailsElement) padre.open = true;
        padre = padre.parentElement;
      }
      destino.scrollIntoView({ block: "start" });
    }

    const alCambiar = () => abrir(window.location.hash);
    function alPulsar(e: MouseEvent) {
      const enlace = (e.target as Element | null)?.closest?.('a[href^="#clase-"]');
      if (enlace && enlace.getAttribute("href") === window.location.hash) abrir(window.location.hash);
    }

    abrir(window.location.hash);
    window.addEventListener("hashchange", alCambiar);
    document.addEventListener("click", alPulsar);
    return () => {
      window.removeEventListener("hashchange", alCambiar);
      document.removeEventListener("click", alPulsar);
    };
  }, []);

  return null;
}
