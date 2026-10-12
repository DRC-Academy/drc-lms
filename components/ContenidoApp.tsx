"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { fondoDeRuta } from "@/components/IconoSeccion";

/**
 * La columna de contenido del marco (`MarcoFijo`): la fila del idioma y
 * la pantalla. Niebla por defecto —no pinta nada y se ve el del `body`—
 * y blanco donde `fondoDeRuta` lo dice, de arriba abajo, fila del idioma
 * incluida. Así la pantalla no tiene que pintar fuera de su `main`.
 *
 * `contenido-app`: aquí dentro, el `main` de cada pantalla deja al final
 * el hueco del botón de ayuda (`globals.css`), y la fila del idioma se
 * esconde donde la pantalla trae la suya.
 */
export default function ContenidoApp({ children }: { children: ReactNode }) {
  const fondo = fondoDeRuta(usePathname() ?? "/");
  return (
    <div
      data-fondo={fondo}
      className={`contenido-app col-start-2 row-start-2 flex min-w-0 flex-col ${fondo === "blanco" ? "bg-white" : ""}`}
    >
      {children}
    </div>
  );
}
