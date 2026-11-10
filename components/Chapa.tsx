import type { ReactNode } from "react";

/**
 * LA CHAPA AMARILLA DE «ESTÁS AQUÍ».
 *
 * La píldora amarilla con su sombra de canto y el pico hacia abajo que
 * cuelga sobre lo que señala: el nodo actual de la ruta («Para ti») y
 * «Tu clase ahora» en el calendario de los huecos. Es el único sitio
 * donde el amarillo de marca va de fondo, y siempre en pequeño.
 *
 * Solo la forma: dónde cuelga lo decide quien la usa.
 */
export default function Chapa({ children }: { children: ReactNode }) {
  return (
    <span className="relative inline-flex items-center whitespace-nowrap rounded-full bg-marca-amarillo px-[15px] py-[7px] text-[12.5px] font-bold text-marca-tinta shadow-[0_4px_0_#E0A800,0_8px_16px_rgba(18,33,26,0.16)]">
      {children}
      <span aria-hidden className="absolute -bottom-[4px] left-1/2 h-2.5 w-2.5 -translate-x-1/2 rotate-45 bg-marca-amarillo" />
    </span>
  );
}
