import Link from "next/link";
import type { LeccionIndice } from "@/lib/cursos-servidor";

/**
 * El lateral de lecciones del módulo.
 *
 * ES EL ARREGLO DEL FALLO PRINCIPAL de la pantalla anterior: era una
 * columna normal que se iba con el scroll, así que al llegar al tercer
 * ejercicio el alumno ya no veía dónde estaba ni cómo salir. Ahora es
 * `sticky` con altura de pantalla y scroll propio: la lista se mueve
 * dentro de su columna y el resto se queda quieto.
 *
 * Durante los ejercicios se repliega a un carril de 72px. No desaparece
 * —eso volvería a dejar al alumno sin referencia— pero deja de competir
 * por la atención: quedan los puntos de las lecciones y el progreso.
 */
export default function LateralLecciones({
  lecciones,
  actualId,
  cursoSlug,
  etiquetaModulo,
  tituloModulo,
  cursoCompletadas,
  cursoTotal,
  replegado,
  alVolver,
}: {
  lecciones: LeccionIndice[];
  actualId: string;
  cursoSlug: string;
  etiquetaModulo: string;
  tituloModulo: string;
  cursoCompletadas: number;
  cursoTotal: number;
  /** Durante los ejercicios: carril de 72px en vez de columna de 300px. */
  replegado: boolean;
  /** Vuelve a la teoría desde el carril. */
  alVolver: () => void;
}) {
  const hechas = lecciones.filter((l) => l.completada).length;
  const porcentaje = lecciones.length > 0 ? Math.round((hechas / lecciones.length) * 100) : 0;

  if (replegado) {
    return (
      <aside className="sticky top-[68px] hidden h-[calc(100dvh-68px)] flex-col items-center gap-[18px] border-r border-marca-borde bg-white px-0 pb-5 pt-[18px] min-[1100px]:flex">
        <button
          type="button"
          onClick={alVolver}
          aria-label="Volver a la lección"
          className="grid h-[34px] w-[34px] place-items-center rounded-[10px] border border-marca-borde bg-marca-niebla text-[15px] leading-none text-marca-tinta transition-colors hover:bg-marca-nieblaOscura"
        >
          ←
        </button>

        <span aria-hidden className="h-[14px] w-px bg-marca-borde" />

        <ol className="flex flex-col items-center gap-3">
          {lecciones.map((leccion) => (
            <li key={leccion.id}>
              <Link
                href={`/curso/${cursoSlug}/${leccion.id}`}
                aria-label={leccion.titulo}
                aria-current={leccion.id === actualId ? "page" : undefined}
                className={`block h-3.5 w-3.5 rounded-full border-[1.5px] transition-colors ${
                  leccion.completada
                    ? "border-marca-verde bg-marca-verde"
                    : leccion.id === actualId
                    ? "border-marca-verde"
                    : "border-marca-puntoPendiente hover:border-marca-verde"
                }`}
              />
            </li>
          ))}
        </ol>

        <div className="mt-auto flex flex-col items-center gap-2">
          <div className="flex h-[120px] w-[5px] flex-col justify-end overflow-hidden rounded-[3px] bg-marca-pista">
            <div className="w-full rounded-[3px] bg-marca-verde" style={{ height: `${porcentaje}%` }} />
          </div>
          <span className="text-[11px] font-semibold text-marca-grisSuave tabular-nums">
            {hechas}/{lecciones.length}
          </span>
        </div>
      </aside>
    );
  }

  return (
    <aside className="sticky top-[68px] hidden h-[calc(100dvh-68px)] flex-col border-r border-marca-borde bg-white min-[1100px]:flex">
      <div className="border-b border-marca-nieblaOscura px-[22px] pb-4 pt-[22px]">
        <p className="text-[11px] font-semibold uppercase leading-none tracking-[0.1em] text-marca-grisSuave">
          {etiquetaModulo}
        </p>
        <h2 className="mt-2 text-pretty font-display text-[16px] font-bold leading-[1.3] text-marca-tinta">
          {tituloModulo}
        </h2>
        <div className="mt-3 flex items-center gap-2.5">
          <div className="h-[5px] flex-1 overflow-hidden rounded-[3px] bg-marca-pista">
            <div className="h-full rounded-[3px] bg-marca-verde" style={{ width: `${porcentaje}%` }} />
          </div>
          <span className="shrink-0 text-[12.5px] font-medium text-marca-gris tabular-nums">
            {hechas} de {lecciones.length}
          </span>
        </div>
      </div>

      <ol className="flex-1 overflow-y-auto px-3 pb-4 pt-3">
        {lecciones.map((leccion) => (
          <li key={leccion.id}>
            <ItemLeccion leccion={leccion} actual={leccion.id === actualId} cursoSlug={cursoSlug} />
          </li>
        ))}
      </ol>

      <div className="border-t border-marca-nieblaOscura px-[18px] pb-4 pt-3.5">
        <Link
          href={`/curso/${cursoSlug}`}
          className="flex w-full items-center justify-between gap-2 rounded-[10px] border border-marca-borde bg-marca-niebla px-3 py-[11px] text-[13.5px] font-semibold text-marca-tinta transition-colors hover:bg-marca-nieblaOscura"
        >
          Ver el curso completo
          <span aria-hidden className="text-marca-grisSuave">
            →
          </span>
        </Link>
        <p className="mt-2 text-center text-[12px] text-marca-grisTenue tabular-nums">
          {cursoCompletadas} de {cursoTotal} lecciones del curso
        </p>
      </div>
    </aside>
  );
}

/**
 * Un ítem de la lista. Se usa igual en el lateral y en el panel de
 * móvil, con un punto de tamaño distinto.
 *
 * LOS TÍTULOS SON LARGOS —"Practical Exercise: Self-Assessment – Identify
 * Your Strengths and Weaknesses"— y ocupan hasta tres líneas. No se
 * truncan: un título cortado obliga a entrar para saber qué hay dentro,
 * que es justo lo contrario de lo que hace una lista de navegación.
 */
export function ItemLeccion({
  leccion,
  actual,
  cursoSlug,
  compacto,
  alElegir,
}: {
  leccion: LeccionIndice;
  actual: boolean;
  cursoSlug: string;
  /** En el panel de móvil el texto baja un punto. */
  compacto?: boolean;
  alElegir?: () => void;
}) {
  return (
    <Link
      href={`/curso/${cursoSlug}/${leccion.id}`}
      onClick={alElegir}
      aria-current={actual ? "page" : undefined}
      className={`mb-0.5 flex items-start gap-[11px] rounded-r-[10px] border-l-[2.5px] py-3 pl-3.5 pr-3 transition-colors ${
        actual
          ? "border-marca-verde bg-marca-verdeFondo"
          : "border-transparent hover:bg-marca-niebla"
      }`}
    >
      <span
        aria-hidden
        className={`mt-px grid h-4 w-4 shrink-0 place-items-center rounded-full border-[1.5px] text-[9px] leading-none text-white ${
          leccion.completada
            ? "border-marca-verde bg-marca-verde"
            : actual
            ? "border-marca-verde"
            : "border-marca-puntoPendiente"
        }`}
      >
        {leccion.completada ? "✓" : ""}
      </span>

      <span className="min-w-0 flex-1">
        <span
          className={`block text-pretty leading-[1.35] ${compacto ? "text-[14px]" : "text-[13.5px]"} ${
            actual
              ? "font-semibold text-marca-tinta"
              : leccion.completada
              ? "text-marca-gris"
              : "text-marca-grisSuave"
          }`}
        >
          {leccion.titulo}
        </span>

        {/* Las lecciones de solo ejercicios son práctica de fin de módulo,
            no teoría: conviene saberlo antes de entrar. */}
        {leccion.soloEjercicios && (
          <span
            className={`mt-1 block font-semibold uppercase tracking-[0.07em] text-marca-amarilloTexto ${
              compacto ? "text-[10.5px]" : "text-[11px]"
            }`}
          >
            · ejercicios
          </span>
        )}
      </span>
    </Link>
  );
}
