import Link from "next/link";

/**
 * Barra de marca común a todas las pantallas: el nombre de la academia,
 * y si sabemos quién practica, su inicial y la salida.
 *
 * El cierre de sesión es un formulario y no un enlace a propósito. Next
 * hace prefetch de los `<Link>` visibles, así que con un GET la sesión
 * se cerraría sola al aparecer el botón en pantalla. Ver `app/salir`.
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
          <div className="flex shrink-0 items-center gap-3.5">
            <form action="/salir" method="post">
              <button
                type="submit"
                className="rounded-full text-[13px] text-drc-cuerpo transition-colors hover:text-drc-verde-texto"
              >
                Salir
              </button>
            </form>

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
          </div>
        )}
      </div>
    </header>
  );
}
