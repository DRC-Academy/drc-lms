import Link from "next/link";

/**
 * Barra de marca común a todas las pantallas. Sin navegación:
 * el nombre de la academia y, si sabemos quién practica, su inicial.
 */
export default function Cabecera({ nombre }: { nombre?: string }) {
  return (
    <header className="sticky top-0 z-40 border-b border-drc-borde bg-drc-fondo/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-columna items-center justify-between gap-4 px-6">
        <Link
          href="/"
          className="flex items-center gap-2.5 rounded-full transition-opacity hover:opacity-70"
        >
          <span
            aria-hidden
            className="grid h-7 w-7 place-items-center rounded-[9px] bg-drc-verde-solido font-display text-[13px] font-bold leading-none text-white"
          >
            D
          </span>
          <span className="font-display text-[15px] font-semibold tracking-[-0.01em] text-drc-titular">
            DRC Academy
          </span>
        </Link>

        {nombre && (
          <p className="flex shrink-0 items-center gap-2.5">
            <span className="hidden text-[13px] text-drc-cuerpo sm:inline">{nombre}</span>
            <span
              aria-hidden
              className="grid h-8 w-8 place-items-center rounded-full bg-drc-verde-solido font-display text-[13px] font-semibold text-white"
            >
              {nombre[0]}
            </span>
            <span className="sr-only">Practicando como {nombre}</span>
          </p>
        )}
      </div>
    </header>
  );
}
