import type { ReactNode } from "react";

// ---------------------------------------------------------------
// LA BASE COMÚN DE TARJETA Y DE CABECERA DE SECCIÓN
//
// Hasta ahora cada tarjeta escribía sus propias clases: radios de 16,
// 18, 20 y 22px, unas con sombra y otras sin ella, cabeceras de 20, 22 y
// 24px, con antetítulo o sin él. Nada de eso lo decidía nadie: salía de
// copiar la tarjeta más cercana.
//
// Esto es lo único que se decide aquí:
//
//   · TARJETA: radio 16, borde de marca, fondo blanco y UNA sola sombra
//     suave, la que ya llevaban las tarjetas de «Clases» y del inicio.
//   · TÍTULO DE SECCIÓN: 20px en Radio Canada Big, sin antetítulo. El
//     subtítulo solo cuando dice algo que el título no dice.
//
// Lo usan las piezas tocadas en la ronda de móvil de septiembre de 2026
// (diploma, próxima y última clase, historial, ritmo). El resto de la
// aplicación no se ha migrado todavía: cuando se toque una tarjeta, pasa
// a esto en vez de estrenar una variante más.
// ---------------------------------------------------------------

/** Las clases de la tarjeta base. Se añade el padding en cada sitio. */
export const TARJETA =
  "rounded-[16px] border border-marca-borde bg-white shadow-[0_10px_24px_rgba(18,33,26,0.07)]";

/** Las clases del título de sección, para cuando el título va dentro de otra pieza. */
export const TITULO_SECCION = "font-display text-[20px] font-bold leading-tight text-marca-tinta";

export function TituloSeccion({
  id,
  children,
  subtitulo,
  className = "",
}: {
  id?: string;
  children: ReactNode;
  /** Solo si aporta algo que el título no dice. */
  subtitulo?: ReactNode;
  className?: string;
}) {
  return (
    <header className={className}>
      <h2 id={id} className={TITULO_SECCION}>
        {children}
      </h2>
      {subtitulo && <p className="mt-1 text-pretty text-[14.5px] leading-snug text-marca-gris">{subtitulo}</p>}
    </header>
  );
}

/**
 * El `<summary>` de los desplegables nativos: sin el triángulo del
 * navegador, 44px de zona táctil y una flecha que gira al abrir. El
 * `<details>` que lo contiene lleva la clase `group`.
 */
export const RESUMEN_DESPLEGABLE =
  "flex min-h-[44px] cursor-pointer list-none items-center gap-2 text-[15px] font-semibold text-marca-verdeOsc [&::-webkit-details-marker]:hidden focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marca-verde rounded-[8px]";

export function FlechaDesplegable() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 20 20"
      className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180 motion-reduce:transition-none"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5.5 8l4.5 4.5L14.5 8" />
    </svg>
  );
}
