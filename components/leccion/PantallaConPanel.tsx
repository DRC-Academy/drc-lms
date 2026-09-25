"use client";

import { useEffect, type ReactNode } from "react";
import Link from "next/link";
import BotonIdioma from "@/components/BotonIdioma";
import { usarMarco } from "@/components/leccion/MarcoCurso";

/**
 * LA PANTALLA CON PANEL: el marco que comparten la lección del curso y
 * el bloque de práctica de «Para ti».
 *
 * Es el diseño de la lección, sacado a un componente para que el bloque
 * lo use tal cual en vez de imitarlo. Mientras cada pantalla pintaba su
 * propio marco, cada retoque en una dejaba a la otra un paso atrás: ya
 * pasó con las cabeceras, con la lista de bloques y con el visor. Ahora
 * hay UN marco y dos contenidos.
 *
 * Lo que pone:
 *
 *   EL PANEL     a partir de 1200px, una columna fija de 330px con su
 *                propio scroll; por debajo, un cajón que abre la barra
 *                de iconos o el rótulo de la fila de móvil, y que tapa
 *                la pantalla. El estado abierto/cerrado viene del marco
 *                (`usarMarco`), porque quien lo abre entre 900 y 1200px
 *                es un icono que vive fuera de aquí.
 *   LA ESQUINA   en escritorio, arriba a la derecha: lo que la cabecera
 *                diría si hubiera cabecera —el curso y su progreso, o el
 *                área y el nivel del bloque— y el botón de idioma.
 *   LA FILA DE MÓVIL   la salida, dónde estás —que abre el panel— y el
 *                idioma. Lo que en escritorio está repartido entre la X,
 *                la esquina y el panel.
 *   LA CABECERA  centrada: etiqueta, título e instrucción.
 *
 * Lo que NO pone: qué hay dentro del panel, qué va debajo de la cabecera
 * y qué contenido se lee. Eso lo decide cada pantalla.
 */
export default function PantallaConPanel({
  panel,
  panelAria,
  cerrarElPanel,
  esquina,
  salida,
  rotuloMovil,
  etiqueta,
  titulo,
  instruccion,
  aviso,
  pasoAPaso,
  children,
}: {
  /** El contenido del panel: el curso, o las fases del bloque. */
  panel: ReactNode;
  /** El `aria-label` del panel: la sección de la que es. */
  panelAria: string;
  /** El rótulo de los botones que cierran el cajón. */
  cerrarElPanel: string;
  /** Lo que va a la izquierda del botón de idioma, en la esquina de escritorio. */
  esquina?: ReactNode;
  /** A dónde lleva la X, y cómo se llama para quien no la ve. */
  salida: { href: string; aria: string };
  /** «Lección 3 de 8», «Fase 1 de 3»: el botón central de la fila de móvil. */
  rotuloMovil: string;
  /** La línea en versalitas sobre el título. Solo en escritorio. */
  etiqueta?: string | null;
  titulo: string;
  instruccion?: string | null;
  /**
   * Una línea de estado bajo la cabecera, en los dos anchos: es donde el
   * bloque cuenta que su contenido viene de camino en el otro idioma.
   */
  aviso?: ReactNode;
  /** El paso a paso, si la pantalla lo tiene. */
  pasoAPaso?: ReactNode;
  children: ReactNode;
}) {
  const { panelAbierto, abrirPanel, cerrarPanel } = usarMarco();

  // Escape cierra el cajón del panel.
  useEffect(() => {
    if (!panelAbierto) return;
    function alPulsar(evento: KeyboardEvent) {
      if (evento.key === "Escape") cerrarPanel();
    }
    document.addEventListener("keydown", alPulsar);
    return () => document.removeEventListener("keydown", alPulsar);
  }, [panelAbierto, cerrarPanel]);

  return (
    <div className="flex flex-1 items-stretch bg-marca-niebla">
      {/* ------------------------------ EL PANEL ------------------------------ */}
      {panelAbierto && (
        <button
          type="button"
          aria-label={cerrarElPanel}
          onClick={cerrarPanel}
          className="fixed inset-0 z-40 bg-[rgba(18,33,26,.42)] min-[1200px]:hidden"
        />
      )}
      <aside
        aria-label={panelAria}
        className={`shrink-0 border-r border-marca-borde bg-white min-[1200px]:sticky min-[1200px]:top-0 min-[1200px]:h-dvh min-[1200px]:w-[330px] ${
          panelAbierto
            ? "aparece fixed inset-y-0 left-0 z-50 w-[min(330px,100%)] shadow-[0_18px_44px_-16px_rgba(18,33,26,0.35)] min-[1200px]:inset-auto min-[1200px]:z-auto min-[1200px]:shadow-none"
            : "hidden min-[1200px]:block"
        }`}
      >
        {panelAbierto && (
          <button
            type="button"
            onClick={cerrarPanel}
            aria-label={cerrarElPanel}
            className="absolute right-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-full bg-white text-marca-gris transition-colors hover:bg-marca-nieblaOscura hover:text-marca-tinta min-[1200px]:hidden"
          >
            <IconoCerrar className="h-4 w-4" />
          </button>
        )}
        {panel}
      </aside>

      {/* ---------------------------- EL CONTENIDO ---------------------------- */}
      {/* `data-esquina-idioma`: aquí el idioma va en la esquina y la fila
          del marco (`CabeceraIdioma`) no se pinta. */}
      <main data-esquina-idioma className="relative flex min-w-0 flex-1 flex-col">
        {/* LA ESQUINA, EN ESCRITORIO. Discreta: es lo que la cabecera
            decía arriba y aquí no hay cabecera. */}
        <div className="absolute right-6 top-5 hidden items-center gap-3.5 min-[900px]:flex min-[1200px]:right-10">
          {esquina}
          <BotonIdioma className="ml-1.5" />
        </div>

        {/* LA FILA DE MÓVIL. */}
        <div className="flex items-center gap-2.5 px-3.5 pt-3 min-[900px]:hidden">
          <Link
            href={salida.href}
            aria-label={salida.aria}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-marca-borde bg-white text-marca-tinta transition-colors hover:bg-marca-niebla"
          >
            <IconoCerrar className="h-4 w-4" />
          </Link>
          <button
            type="button"
            onClick={abrirPanel}
            className="flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-full py-2 text-[11.5px] font-semibold uppercase leading-none tracking-[0.08em] text-marca-grisSuave transition-colors hover:text-marca-tinta"
          >
            <span className="truncate">{rotuloMovil}</span>
            <IconoChevron className="h-3.5 w-3.5 shrink-0" />
          </button>
          <BotonIdioma />
        </div>

        <div className="mx-auto flex w-full max-w-[760px] flex-1 flex-col px-4 pb-8 pt-5 min-[900px]:px-8 min-[900px]:pb-10 min-[900px]:pt-[76px]">
          {/* ------------------------------ CABECERA ------------------------------ */}
          <header className="relative text-center">
            <Link
              href={salida.href}
              aria-label={salida.aria}
              className="absolute left-0 top-1 hidden h-10 w-10 place-items-center rounded-full border border-marca-borde bg-white text-marca-tinta transition-colors hover:bg-marca-niebla min-[900px]:grid"
            >
              <IconoCerrar className="h-4 w-4" />
            </Link>

            {etiqueta && (
              <p className="hidden text-[11.5px] font-semibold uppercase leading-none tracking-[0.1em] text-marca-grisSuave min-[900px]:block">
                {etiqueta}
              </p>
            )}
            <h1 className="mx-auto max-w-[600px] text-balance font-display text-[24px] font-bold leading-[1.16] tracking-[-0.01em] text-marca-tinta min-[900px]:mt-3 min-[900px]:text-[30px] min-[900px]:leading-[1.15]">
              {titulo}
            </h1>
            {instruccion && (
              <p className="mx-auto mt-2.5 max-w-[520px] text-pretty text-[14.5px] leading-[1.5] text-marca-gris min-[900px]:mt-3 min-[900px]:text-[15px]">
                {instruccion}
              </p>
            )}
            {aviso}
          </header>

          {pasoAPaso && <div className="mt-6 min-[900px]:mt-9">{pasoAPaso}</div>}

          {children}
        </div>
      </main>
    </div>
  );
}

export function IconoCerrar({ className }: { className: string }) {
  return (
    <svg aria-hidden viewBox="0 0 16 16" className={className} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      <path d="m4 4 8 8M12 4l-8 8" />
    </svg>
  );
}

function IconoChevron({ className }: { className: string }) {
  return (
    <svg aria-hidden viewBox="0 0 16 16" className={className} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="m4 6 4 4 4-4" />
    </svg>
  );
}

export function IconoFlecha({ className }: { className: string }) {
  return (
    <svg aria-hidden viewBox="0 0 16 16" className={className} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13 8H3m4.5-4.5L3 8l4.5 4.5" />
    </svg>
  );
}
