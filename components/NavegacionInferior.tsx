"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icono, seccionDeRuta, type EnlaceSeccion } from "@/components/IconoSeccion";

/**
 * La barra de pestañas de abajo: la navegación de toda la aplicación por
 * debajo de 900px, que es el corte de toda la aplicación. Los mismos enlaces e iconos que la barra lateral de
 * escritorio (`BarraLateral`), con etiqueta corta, y al final el perfil.
 *
 * `fixed` y no `sticky`, así que da igual dónde esté en el DOM. El hueco
 * al final de la página lo reserva `globals.css` mirando si esta barra
 * existe (`--nav-inferior`), para que ninguna pantalla tenga que
 * acordarse; y el de la zona segura del iPhone —la barra de inicio— lo
 * suma `env(safe-area-inset-bottom)`, aquí y allí.
 *
 * LA SECCIÓN ACTIVA LA DICE LA RUTA, porque la barra vive en el layout
 * común, que no se vuelve a renderizar al cambiar de página.
 */
export default function NavegacionInferior({
  enlaces,
  secciones,
  extra,
}: {
  enlaces: EnlaceSeccion[];
  /** El nombre de la navegación para los lectores de pantalla. */
  secciones: string;
  /** La última celda: el perfil, que abre una hoja en la misma pantalla. */
  extra?: ReactNode;
}) {
  const ruta = usePathname() ?? "/";
  const seccion = seccionDeRuta(ruta);

  // Dónde cae la sección actual dentro de la fila. -1 cuando no hay
  // ninguna marcada, y entonces no se pinta la marca.
  const indice = enlaces.findIndex((enlace) => enlace.clave === seccion);
  const celdas = enlaces.length + (extra ? 1 : 0);

  return (
    <nav
      aria-label={secciones}
      data-nav-inferior
      className="fixed inset-x-0 bottom-0 z-40 grid border-t border-marca-borde bg-white/[0.96] px-1 pt-2 backdrop-blur-md min-[900px]:hidden"
      style={{
        gridTemplateColumns: `repeat(${celdas}, minmax(0, 1fr))`,
        paddingBottom: "calc(14px + env(safe-area-inset-bottom))",
      }}
    >
      {/* LA MARCA QUE SE DESLIZA. Una sola marca que viaja de una pestaña
          a otra: el cambio de sección deja de ser un parpadeo y pasa a
          ser un movimiento con dirección. Mide `100/N` por ciento y se
          desplaza `índice × 100%` de su propio ancho, sin medir nada en
          JavaScript. `aria-hidden`: lo dice ya el `aria-current`. */}
      {indice >= 0 && (
        <span
          aria-hidden
          className="pointer-events-none absolute left-0 top-0 h-[3px] rounded-b-full bg-marca-verde transition-transform duration-[220ms] ease-[var(--ease-salida)]"
          style={{
            width: `${100 / celdas}%`,
            transform: `translateX(${indice * 100}%)`,
          }}
        />
      )}

      {enlaces.map((enlace) => {
        const activo = seccion === enlace.clave;
        return (
          <Link
            key={enlace.clave}
            href={enlace.href}
            aria-current={activo ? "page" : undefined}
            // El nombre entero aunque la etiqueta se recorte.
            aria-label={enlace.texto}
            className={`flex min-h-[44px] flex-col items-center justify-center gap-[5px] rounded-[10px] text-[12px] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-marca-verdeOsc ${
              // `gris` y no `grisSuave`: a 12px, `grisSuave` da 3,65:1 y AA
              // pide 4,5:1. Es la navegación entera en móvil.
              activo ? "font-semibold text-marca-tinta" : "font-medium text-marca-gris"
            }`}
          >
            <Icono seccion={enlace.clave} activo={activo} />
            {/* Guardarraíl: la rejilla es `minmax(0,1fr)` y una etiqueta
                larga se recorta en vez de pisar la de al lado. */}
            <span aria-hidden className="max-w-full truncate">{enlace.corto}</span>
          </Link>
        );
      })}
      {extra}
    </nav>
  );
}
