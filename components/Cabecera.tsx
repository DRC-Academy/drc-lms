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
 * ficha en ficha, así que "Mi curso" no significa nada para él. Le queda
 * la barra con el logotipo y nada más.
 *
 * EN MÓVIL LA NAVEGACIÓN SE VA ABAJO. Antes ocupaba una segunda fila
 * pegada a la cabecera; ahí competía con el saludo y empujaba el banner
 * —que es el destino de la pantalla— fuera de la primera pantalla. Abajo
 * está donde llega el pulgar y no le quita sitio a nada.
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
          { clave: "practica" as const, texto: "Práctica", href: "/practica" },
        ]
      : [];

  const inicial = nombre?.trim()[0]?.toUpperCase() ?? "";

  return (
    <>
      <header className="border-b border-marca-borde bg-white">
        <div className="mx-auto flex h-[60px] max-w-contenido items-center gap-4 px-4 sm:h-[68px] sm:gap-10 sm:px-9">
          <Link
            href={alumnoId != null ? `/alumno/${alumnoId}` : "/"}
            className="flex shrink-0 items-center gap-2.5 rounded-lg transition-opacity hover:opacity-70"
          >
            <span
              aria-hidden
              className="grid h-[26px] w-[26px] place-items-center rounded-[8px] bg-marca-verde font-display text-[13px] font-bold leading-none text-white sm:h-[30px] sm:w-[30px] sm:rounded-[9px] sm:text-[15px]"
            >
              D
            </span>
            <span className="font-display text-[15px] font-bold text-marca-tinta sm:text-[17px]">
              DRC Academy
            </span>
          </Link>

          {/* En escritorio, junto al logotipo. En móvil, en la barra de abajo. */}
          {enlaces.length > 0 && (
            <nav aria-label="Secciones" className="hidden h-full items-center gap-7 lg:flex">
              {enlaces.map((enlace) => (
                <Link
                  key={enlace.clave}
                  href={enlace.href}
                  aria-current={seccion === enlace.clave ? "page" : undefined}
                  className={`flex h-full items-center text-[15px] transition-colors ${
                    seccion === enlace.clave
                      ? "font-semibold text-marca-tinta shadow-[inset_0_-2px_0_#1E9E3A]"
                      : "font-medium text-marca-gris hover:text-marca-tinta"
                  }`}
                >
                  {enlace.texto}
                </Link>
              ))}
            </nav>
          )}

          <div className="ml-auto flex shrink-0 items-center gap-3 sm:gap-4">
            {nombre && (
              <form action="/salir" method="post">
                <button
                  type="submit"
                  className="rounded-full text-[13px] text-marca-gris transition-colors hover:text-marca-tinta sm:text-[14px]"
                >
                  Salir
                </button>
              </form>
            )}

            {nombre && (
              <p className="flex shrink-0 items-center gap-2.5">
                <span className="hidden text-[14px] font-medium text-marca-tinta md:inline">
                  {nombre}
                </span>
                <span
                  aria-hidden
                  className="grid h-7 w-7 place-items-center rounded-full bg-marca-tinta text-[12px] font-semibold text-white sm:h-[30px] sm:w-[30px] sm:text-[13px]"
                >
                  {inicial}
                </span>
                <span className="sr-only">Practicando como {nombre}</span>
              </p>
            )}
          </div>
        </div>
      </header>

      {enlaces.length > 0 && <NavegacionInferior enlaces={enlaces} seccion={seccion} />}
    </>
  );
}

/**
 * La barra de abajo, solo en móvil.
 *
 * `fixed` y no `sticky`. La cabecera se pinta ANTES del contenido de
 * cada página, así que un `sticky` colocaría la barra en el flujo justo
 * debajo del logotipo: se vería abajo, sí, pero dejaría una banda vacía
 * de 60px bajo la cabecera. Fija, da igual dónde esté en el DOM.
 *
 * El hueco al final de la página lo reserva `globals.css` mirando si
 * esta barra existe, para que ninguna pantalla tenga que acordarse.
 *
 * Los iconos son SVG a mano, de un solo trazo y sin librería: son tres.
 */
function NavegacionInferior({
  enlaces,
  seccion,
}: {
  enlaces: { clave: SeccionActiva; texto: string; href: string }[];
  seccion?: SeccionActiva;
}) {
  return (
    <nav
      aria-label="Secciones"
      data-nav-inferior
      className="fixed inset-x-0 bottom-0 z-40 grid border-t border-marca-borde bg-white/[0.96] px-1 pb-3.5 pt-2 backdrop-blur-md lg:hidden"
      style={{ gridTemplateColumns: `repeat(${enlaces.length}, minmax(0, 1fr))` }}
    >
      {enlaces.map((enlace) => {
        const activo = seccion === enlace.clave;
        return (
          <Link
            key={enlace.clave}
            href={enlace.href}
            aria-current={activo ? "page" : undefined}
            className={`flex min-h-[44px] flex-col items-center justify-center gap-[5px] text-[12px] transition-colors ${
              activo ? "font-semibold text-marca-tinta" : "font-medium text-marca-grisSuave"
            }`}
          >
            <Icono seccion={enlace.clave} activo={activo} />
            {enlace.texto}
          </Link>
        );
      })}
    </nav>
  );
}

function Icono({ seccion, activo }: { seccion: SeccionActiva; activo: boolean }) {
  // Relleno verde cuando es la sección actual; contorno gris cuando no.
  const trazo = activo ? "#1E9E3A" : "#B7C4BC";
  const relleno = activo ? "#1E9E3A" : "none";

  return (
    <svg
      aria-hidden
      viewBox="0 0 18 18"
      className="h-[18px] w-[18px]"
      fill="none"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {seccion === "inicio" && (
        <path d="M2.5 7.2 9 2.2l6.5 5v7.3a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1V7.2Z" stroke={trazo} fill={relleno} />
      )}
      {seccion === "curso" && (
        <path d="M2.5 3.6h4.2c1.3 0 2.3 1 2.3 2.2v8.6c0-1-.9-1.8-2-1.8H2.5V3.6Zm13 0h-4.2c-1.3 0-2.3 1-2.3 2.2v8.6c0-1 .9-1.8 2-1.8h4.5V3.6Z" stroke={trazo} fill={relleno} />
      )}
      {seccion === "practica" && (
        <>
          <circle cx="9" cy="9" r="6.5" stroke={trazo} fill={relleno} />
          <path d="M9 5.6v3.6l2.3 1.4" stroke={activo ? "#FFFFFF" : trazo} />
        </>
      )}
    </svg>
  );
}
