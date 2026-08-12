import Link from "next/link";

/**
 * La cabecera de la lección y del índice del curso.
 *
 * NO es la `Cabecera` general de la aplicación, y es a propósito. Aquí
 * el alumno está dentro de un curso: lo que necesita a mano es el
 * nombre del curso —pulsable, para salir al índice— y cuánto lleva, no
 * las tres secciones del producto. Y en móvil no puede haber navegación
 * inferior fija, porque ese sitio lo ocupa la barra de acciones de la
 * lección: dos barras fijas abajo se comen media pantalla de 812px.
 */
export default function CabeceraLeccion({
  cursoTitulo,
  cursoSlug,
  completadas,
  total,
  inicial,
  volverA,
  derecha,
  tira,
}: {
  cursoTitulo: string;
  cursoSlug: string;
  completadas: number;
  total: number;
  /** Inicial del alumno para el avatar. Vacía en el equipo. */
  inicial: string;
  /** A dónde lleva la flecha de atrás en móvil. */
  volverA: string;
  /** El botón de la derecha en móvil: abre o cierra el panel de lecciones. */
  derecha?: React.ReactNode;
  /** La tira de progreso de móvil: cambia según se esté en teoría o en ejercicios. */
  tira?: React.ReactNode;
}) {
  const porcentaje = total > 0 ? Math.round((completadas / total) * 100) : 0;

  return (
    <header className="sticky top-0 z-30 border-b border-marca-borde bg-white/[0.94] backdrop-blur-md">
      {/* --------------------------- ESCRITORIO --------------------------- */}
      <div className="hidden h-16 items-center gap-[22px] px-6 min-[1100px]:flex">
        <Link href="/" className="flex shrink-0 items-center gap-2.5 transition-opacity hover:opacity-70">
          <span
            aria-hidden
            className="grid h-[27px] w-[27px] place-items-center rounded-[8px] bg-marca-verde font-display text-[14px] font-bold leading-none text-white"
          >
            D
          </span>
          <span className="font-display text-[16px] font-bold text-marca-tinta">DRC Academy</span>
        </Link>

        <span aria-hidden className="h-[22px] w-px shrink-0 bg-marca-borde" />

        <Link
          href={`/curso/${cursoSlug}`}
          className="min-w-0 truncate text-[14.5px] font-medium text-marca-tinta transition-colors hover:text-marca-verdeOsc"
        >
          {cursoTitulo}
        </Link>

        <div className="ml-auto flex shrink-0 items-center gap-3.5">
          <span className="text-[13.5px] text-marca-grisSuave tabular-nums">
            {completadas} de {total} lecciones
          </span>
          <div
            className="h-[5px] w-[120px] overflow-hidden rounded-[3px] bg-marca-pista"
            role="progressbar"
            aria-valuenow={porcentaje}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Progreso en ${cursoTitulo}`}
          >
            <div className="h-full rounded-[3px] bg-marca-verde" style={{ width: `${porcentaje}%` }} />
          </div>
          {inicial !== "" && (
            <span
              aria-hidden
              className="grid h-7 w-7 place-items-center rounded-full bg-marca-tinta text-[12px] font-semibold text-white"
            >
              {inicial}
            </span>
          )}
        </div>
      </div>

      {/* ------------------------------ MÓVIL ------------------------------ */}
      <div className="min-[1100px]:hidden">
        <div className="flex items-center gap-3 px-3.5 py-3">
          <Link
            href={volverA}
            aria-label="Volver"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[17px] leading-none text-marca-gris transition-colors hover:bg-marca-niebla hover:text-marca-tinta"
          >
            ←
          </Link>
          <Link
            href={`/curso/${cursoSlug}`}
            className="min-w-0 flex-1 truncate text-[13.5px] font-medium text-marca-tinta"
          >
            {cursoTitulo}
          </Link>
          {derecha}
        </div>
        {tira && <div className="px-3.5 pb-[11px]">{tira}</div>}
      </div>
    </header>
  );
}

/**
 * La tira de progreso de móvil.
 *
 * Es la respuesta de orientación cuando no hay lateral: siempre visible
 * bajo la cabecera, y cambia de contenido según se esté leyendo la
 * teoría o respondiendo ejercicios.
 */
export function TiraProgreso({ texto, hechos, total }: { texto: string; hechos: number; total: number }) {
  const porcentaje = total > 0 ? Math.round((hechos / total) * 100) : 0;

  return (
    <div className="flex items-center gap-2.5">
      <span className="shrink-0 text-[11.5px] font-semibold text-marca-gris tabular-nums">{texto}</span>
      <div className="h-1 flex-1 overflow-hidden rounded-[3px] bg-marca-pista">
        <div
          className="h-full rounded-[3px] bg-marca-verde transition-[width] duration-300"
          style={{ width: `${porcentaje}%` }}
        />
      </div>
    </div>
  );
}
