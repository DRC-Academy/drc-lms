import Link from "next/link";

export type SeccionActiva = "inicio" | "curso" | "practica";

/**
 * Barra de marca y navegación.
 *
 * Tres secciones para el alumno —Inicio, Mi curso y Práctica— porque el
 * producto son dos cosas que conviven: el curso enseña contenido
 * estructurado y la práctica genera ejercicios a partir de su perfil.
 * Si la navegación solo nombrara una, la otra parecería un anexo.
 *
 * El equipo NO ve la navegación: entra por el buscador y va saltando de
 * ficha en ficha, así que "Mi curso" no significa nada para él. Mantiene
 * lo que ya tenía.
 *
 * EN MÓVIL van en dos filas. A 375px, el logotipo, tres enlaces y la
 * salida no caben en una sola sin encogerse hasta ser impulsables; la
 * segunda fila cuesta 40px y se lee.
 */
export default function Cabecera({
  nombre,
  alumnoId,
  cursoSlug,
  seccion,
}: {
  nombre?: string;
  /** El alumno de la sesión. null en el equipo: no navega por secciones. */
  alumnoId?: string | null;
  /** El curso que abre "Mi curso". Sin él, el enlace no se pinta. */
  cursoSlug?: string | null;
  seccion?: SeccionActiva;
}) {
  const enlaces =
    alumnoId != null
      ? [
          { clave: "inicio" as const, texto: "Inicio", href: `/alumno/${alumnoId}` },
          ...(cursoSlug
            ? [{ clave: "curso" as const, texto: "Mi curso", href: `/curso/${cursoSlug}` }]
            : []),
          { clave: "practica" as const, texto: "Práctica", href: `/alumno/${alumnoId}#practica` },
        ]
      : [];

  return (
    <header className="sticky top-0 z-40 border-b border-drc-borde bg-drc-fondo/85 backdrop-blur-md">
      <div className="mx-auto max-w-columna px-6">
        <div className="flex h-14 items-center justify-between gap-4">
          <Link
            href={alumnoId != null ? `/alumno/${alumnoId}` : "/"}
            className="flex shrink-0 items-center gap-2.5 rounded-full transition-opacity hover:opacity-70"
          >
            <span
              aria-hidden
              className="grid h-7 w-7 place-items-center rounded-[9px] bg-drc-verde-solido font-display text-[13px] font-bold leading-none text-white"
            >
              D
            </span>
            {/* El nombre de la academia se retira en móvil cuando hay
                navegación: el logotipo ya identifica el sitio. */}
            <span
              className={`font-display text-[15px] font-semibold tracking-[-0.01em] text-drc-titular ${
                enlaces.length > 0 ? "hidden sm:inline" : ""
              }`}
            >
              DRC Academy
            </span>
          </Link>

          {/* En escritorio la navegación va en la misma fila, centrada. */}
          {enlaces.length > 0 && (
            <nav aria-label="Secciones" className="hidden sm:flex sm:items-center sm:gap-1">
              {enlaces.map((enlace) => (
                <Enlace key={enlace.clave} {...enlace} activo={seccion === enlace.clave} />
              ))}
            </nav>
          )}

          <div className="flex shrink-0 items-center gap-3.5">
            {nombre && (
              <form action="/salir" method="post">
                <button
                  type="submit"
                  className="rounded-full text-[13px] text-drc-cuerpo transition-colors hover:text-drc-verde-texto"
                >
                  Salir
                </button>
              </form>
            )}

            {nombre && (
              <p className="flex shrink-0 items-center gap-2.5">
                <span className="hidden text-[13px] text-drc-cuerpo md:inline">{nombre}</span>
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
        </div>

        {/* Y en móvil, en su propia fila. */}
        {enlaces.length > 0 && (
          <nav
            aria-label="Secciones"
            className="-mx-1 flex items-center gap-1 pb-2 sm:hidden"
          >
            {enlaces.map((enlace) => (
              <Enlace key={enlace.clave} {...enlace} activo={seccion === enlace.clave} />
            ))}
          </nav>
        )}
      </div>
    </header>
  );
}

function Enlace({
  texto,
  href,
  activo,
}: {
  texto: string;
  href: string;
  activo: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={activo ? "page" : undefined}
      className={`rounded-full px-3 py-1.5 text-[14px] transition-colors ${
        activo
          ? "bg-drc-chip-verde font-semibold text-drc-verde-texto"
          : "text-drc-cuerpo hover:bg-drc-fantasma-hover hover:text-drc-verde-texto"
      }`}
    >
      {texto}
    </Link>
  );
}
