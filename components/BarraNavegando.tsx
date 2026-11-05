"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { clicQueNavega } from "@/lib/navegando";

/** Si tras esto la ruta no ha cambiado, se quita: mejor sin barra que colgada. */
const MS_TOPE = 12000;
/** Lo que tarda en desvanecerse (`.barra-navegando` en `globals.css`). */
const MS_SALIDA = 320;

/**
 * EL `popstate` SE ESCUCHA DESDE AQUÍ, AL CARGAR EL MÓDULO, porque tiene que
 * ir antes que el del router de Next, que restaura la pantalla en cuanto lo
 * oye, en el mismo tick: después ya no hay ruta que comparar. Los oyentes se
 * llaman en el orden en que se registran, y el suyo se registra al hidratar.
 * Solo en el navegador; esto no guarda ningún dato.
 */
let alRetroceder: (() => void) | null = null;
if (typeof window !== "undefined") window.addEventListener("popstate", () => alRetroceder?.());

/**
 * LA BARRITA VERDE DE ARRIBA: la respuesta inmediata a pulsar un enlace.
 *
 * Sale al pulsar, antes de que React o el router hagan nada, y se va cuando
 * cambia la ruta. Va con clases sobre el propio elemento y no con estado de
 * React: así no depende de que React esté libre, que es justo cuando más
 * hace falta (móvil, CPU ocupada).
 *
 * El clic se escucha en fase de captura porque el `Link` de Next hace
 * `preventDefault` en el suyo y no se distinguiría de un enlace que no
 * navega. Qué clic cuenta lo decide `lib/navegando.ts`.
 *
 * EL BOTÓN ATRÁS es `popstate`: la URL ya ha cambiado cuando llega. Si la
 * ruta no es otra (un ancla), no sale.
 *
 * Con movimiento reducido se queda quieta y entera (`globals.css`).
 */
export default function BarraNavegando() {
  const ruta = usePathname();
  const consulta = useSearchParams().toString();
  const barra = useRef<HTMLDivElement>(null);
  const tope = useRef<number>();
  const salida = useRef<number>();
  const donde = useRef("");

  useEffect(() => {
    const quitar = () => {
      window.clearTimeout(tope.current);
      window.clearTimeout(salida.current);
      if (barra.current) barra.current.dataset.estado = "";
    };

    const empezar = () => {
      window.clearTimeout(tope.current);
      window.clearTimeout(salida.current);
      if (barra.current) barra.current.dataset.estado = "cargando";
      tope.current = window.setTimeout(quitar, MS_TOPE);
    };

    const alPulsar = (evento: MouseEvent) => {
      const objetivo = evento.target instanceof Element ? evento.target.closest("a[href]") : null;
      if (!(objetivo instanceof HTMLAnchorElement)) return;
      const enlace = { href: objetivo.href, target: objetivo.target, descarga: objetivo.hasAttribute("download") };
      if (clicQueNavega(evento, enlace, window.location)) empezar();
    };

    const alVolver = () => {
      if (`${window.location.pathname}${window.location.search}` !== donde.current) empezar();
    };

    document.addEventListener("click", alPulsar, true);
    alRetroceder = alVolver;
    // Volver desde otra web con la página congelada en memoria.
    window.addEventListener("pageshow", quitar);
    return () => {
      quitar();
      alRetroceder = null;
      document.removeEventListener("click", alPulsar, true);
      window.removeEventListener("pageshow", quitar);
    };
  }, []);

  // La ruta ha cambiado: la barra termina y se va.
  useEffect(() => {
    donde.current = `${ruta}${consulta ? `?${consulta}` : ""}`;
    if (barra.current?.dataset.estado !== "cargando") return;

    window.clearTimeout(tope.current);
    barra.current.dataset.estado = "fin";
    salida.current = window.setTimeout(() => {
      if (barra.current) barra.current.dataset.estado = "";
    }, MS_SALIDA);
  }, [ruta, consulta]);

  return <div ref={barra} aria-hidden data-estado="" className="barra-navegando" />;
}
