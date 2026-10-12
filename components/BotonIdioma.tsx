"use client";

import type { Idioma } from "@/lib/idioma";
import { usarIdioma } from "@/components/ProveedorIdioma";
import type { FondoPantalla } from "@/components/IconoSeccion";

/**
 * El conmutador de idioma de la cabecera.
 *
 * ERA UN BOTÓN CON EL NOMBRE DEL OTRO IDIOMA —«Español» con la pantalla
 * en inglés— y se leía de dos maneras: como el idioma que hay puesto o
 * como el que se pondría al pulsar. Ahora son los dos códigos, ES y EN,
 * con el activo marcado. No hay forma de leerlo al revés: lo marcado es
 * lo que hay, lo otro es a lo que se cambia.
 *
 * Los códigos no se traducen: «ES» y «EN» se leen igual en los dos
 * idiomas, que es justo lo que se les pide. El nombre del idioma
 * destino sigue en el `aria-label`, para quien no ve la marca.
 *
 * ES UN SOLO BOTÓN, no dos: solo hay dos idiomas y solo hay una acción,
 * cambiar al otro. Dos botones obligarían a decidir qué hace pulsar el
 * que ya está puesto.
 */

/** En este orden se leen: el de la academia primero. */
const CODIGOS: readonly Idioma[] = ["es", "en"];

export default function BotonIdioma({
  className = "",
  fondo = "niebla",
}: {
  className?: string;
  /**
   * Sobre qué fondo va. Sobre blanco el borde de siempre casi no se ve y
   * el código inactivo en `grisSuave` se queda en 3,6:1: ahí el borde
   * sube a `puntoPendiente` con una sombra mínima, y el inactivo pasa a
   * `gris` (5,3:1).
   */
  fondo?: FondoPantalla;
}) {
  const { idioma, t, alternar } = usarIdioma();
  const blanco = fondo === "blanco";

  return (
    <button
      type="button"
      onClick={alternar}
      aria-label={t.navegacion.otroIdiomaAria}
      className={`inline-flex shrink-0 items-center gap-0.5 rounded-full border bg-white p-[3px] transition-colors hover:border-marca-grisTenue ${
        blanco ? "border-marca-puntoPendiente shadow-[0_1px_2px_rgba(18,33,26,0.08)]" : "border-marca-borde"
      } ${className}`}
    >
      {CODIGOS.map((codigo) => (
        <span
          key={codigo}
          aria-hidden
          className={`inline-flex h-[24px] min-w-[30px] items-center justify-center rounded-full px-1.5 text-[11.5px] font-semibold uppercase leading-none tracking-[0.04em] transition-colors ${
            codigo === idioma ? "bg-marca-tinta text-white" : blanco ? "text-marca-gris" : "text-marca-grisSuave"
          }`}
        >
          {codigo}
        </span>
      ))}
    </button>
  );
}
