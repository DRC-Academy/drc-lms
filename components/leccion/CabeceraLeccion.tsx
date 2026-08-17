import Image from "next/image";
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
 *
 * ---------------------------------------------------------------
 * POR QUÉ ESTÁ PARTIDA EN DOS
 *
 * Era un solo componente con un bloque de escritorio y otro de móvil.
 * Se partió al mover la cabecera al layout del curso, y la línea del
 * corte no es caprichosa: es exactamente la que separa lo que depende
 * del curso de lo que depende de la lección.
 *
 *   ESCRITORIO — logotipo, nombre del curso, progreso del curso y
 *   avatar. Todo es del curso, así que lo pinta el layout y se queda
 *   quieto al saltar de lección a lección. Es donde estaba el problema:
 *   la barra desaparecía entera para cambiar una columna de texto.
 *
 *   MÓVIL — lleva además el botón que abre el panel de lecciones y la
 *   tira de progreso DEL MÓDULO, que sí son de la lección y encima
 *   dependen de estado de cliente. Se queda en la página, tal cual
 *   estaba, porque subirla al layout obligaría a cruzar ese estado por
 *   un contexto para no ganar nada: en móvil no hay lateral, la barra es
 *   dos líneas de texto y el parpadeo apenas se ve.
 *
 * A cada ancho solo hay una visible: la otra está en `display:none`.
 * ---------------------------------------------------------------
 */
export function CabeceraEscritorio({
  cursoTitulo,
  cursoSlug,
  completadas,
  total,
  inicial,
}: {
  cursoTitulo: string;
  cursoSlug: string;
  completadas: number;
  total: number;
  /** Inicial del alumno para el avatar. Vacía en el equipo. */
  inicial: string;
}) {
  const porcentaje = total > 0 ? Math.round((completadas / total) * 100) : 0;

  return (
    <header className="sticky top-0 z-30 hidden border-b border-marca-borde bg-white/[0.94] backdrop-blur-md min-[1100px]:block">
      <div className="flex h-16 items-center gap-[22px] px-6">
        <Link href="/" className="flex shrink-0 items-center transition-opacity hover:opacity-70">
          <Image
            src="/logo-drc.png"
            alt="DRC Academy"
            width={121}
            height={32}
            priority
            className="h-8 w-auto"
          />
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
    </header>
  );
}

/**
 * La misma barra de escritorio mientras se leen sus datos.
 *
 * MISMA ALTURA Y MISMO LOGOTIPO. Solo el nombre del curso y el contador
 * salen en gris, que es lo único que hay que ir a buscar a la base; el
 * resto de la barra no depende de ningún dato y no tiene ninguna razón
 * para no estar pintado ya.
 *
 * Se ve una sola vez, al entrar en el curso desde fuera: como la cabecera
 * vive en el layout, saltar de una lección a otra no vuelve a pasar por
 * aquí.
 */
export function CabeceraCargando() {
  return (
    <header className="sticky top-0 z-30 hidden border-b border-marca-borde bg-white/[0.94] backdrop-blur-md min-[1100px]:block">
      <div className="flex h-16 items-center gap-[22px] px-6">
        <Link href="/" className="flex shrink-0 items-center transition-opacity hover:opacity-70">
          <Image
            src="/logo-drc.png"
            alt="DRC Academy"
            width={121}
            height={32}
            priority
            className="h-8 w-auto"
          />
        </Link>

        <span aria-hidden className="h-[22px] w-px shrink-0 bg-marca-borde" />

        <span aria-hidden className="h-[15px] w-[190px] rounded bg-marca-nieblaOscura" />

        <div className="ml-auto flex shrink-0 items-center gap-3.5">
          <span aria-hidden className="h-[13px] w-[104px] rounded bg-marca-nieblaOscura" />
          <span aria-hidden className="h-[5px] w-[120px] rounded-[3px] bg-marca-pista" />
        </div>
      </div>

      <span className="sr-only">Cargando el curso…</span>
    </header>
  );
}

/** La cabecera de móvil. Ver la nota de arriba sobre por qué va aparte. */
export function CabeceraMovil({
  cursoTitulo,
  cursoSlug,
  volverA,
  derecha,
  tira,
}: {
  cursoTitulo: string;
  cursoSlug: string;
  /** A dónde lleva la flecha de atrás. */
  volverA: string;
  /** El botón de la derecha: abre o cierra el panel de lecciones. */
  derecha?: React.ReactNode;
  /** La tira de progreso: cambia según se esté en teoría o en ejercicios. */
  tira?: React.ReactNode;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-marca-borde bg-white/[0.94] backdrop-blur-md min-[1100px]:hidden">
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
