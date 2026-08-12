import Link from "next/link";
import type { EstadoCurso } from "@/lib/cursos-servidor";

/**
 * La pieza principal del inicio.
 *
 * La idea que lo ordena: quien tiene cinco minutos no debería tener que
 * decidir nada. El botón lleva a LA LECCIÓN exacta donde se quedó, no al
 * índice del curso, porque el índice es otra decisión más.
 *
 * LA MITAD DERECHA ES EL PROGRESO, y no está de adorno: una marca por
 * lección enseña de un vistazo lo hecho y lo que queda, que es lo que un
 * porcentaje suelto no dice. En móvil no cabe —serían marcas de menos de
 * un píxel— y se sustituye por una barra con el mismo dato.
 *
 * Se renderiza en el servidor: no tiene estado ni interacción.
 */
export default function BannerCurso({
  estados,
  conLateral,
}: {
  estados: EstadoCurso[];
  /** Con la invitación al perfil al lado, la columna del progreso encoge. */
  conLateral: boolean;
}) {
  // Sin curso asignado no hay banner. En su lugar, una línea sobria: el
  // alumno no ha hecho nada mal y no se le habla como si fuera un error.
  if (estados.length === 0) {
    return (
      <section className="rounded-[18px] border border-marca-borde bg-white px-6 py-5 lg:rounded-[20px]">
        <p className="text-[15px] leading-[1.55] text-marca-gris">
          Tu plan todavía no tiene un curso asociado. Coméntaselo a tu profesor y lo activamos.
          Mientras tanto, tu práctica de abajo funciona con normalidad.
        </p>
      </section>
    );
  }

  const principal = estados[0];
  const otros = estados.slice(1);
  const { curso, total, completadas, siguiente } = principal;

  const porcentaje = total > 0 ? Math.round((completadas / total) * 100) : 0;
  const empezado = completadas > 0;
  const terminado = siguiente === null && total > 0;

  const destino = siguiente ? `/curso/${curso.slug}/${siguiente.id}` : `/curso/${curso.slug}`;

  const etiqueta = terminado
    ? "Curso completado"
    : empezado
    ? "Continúa donde lo dejaste"
    : "Empieza tu curso";

  const llamada = terminado ? "Repasar el curso" : empezado ? "Continuar" : "Empezar";

  const textoLecciones = terminado
    ? `${total} lecciones, todas hechas`
    : empezado
    ? `llevas ${completadas} de ${total} lecciones`
    : `aún no has empezado · ${total} lecciones`;

  return (
    <section>
      <div
        className={`grid rounded-[18px] bg-marca-tinta p-5 lg:min-h-[264px] lg:items-end lg:gap-9 lg:rounded-[20px] lg:p-8 ${
          conLateral
            ? "lg:grid-cols-[minmax(0,1fr)_264px]"
            : "lg:grid-cols-[minmax(0,1fr)_360px]"
        }`}
      >
        <div className="flex flex-col lg:h-full">
          <p className="mb-3 flex items-center gap-2 lg:mb-4">
            <span aria-hidden className="h-[5px] w-[5px] rounded-full bg-marca-amarillo lg:h-1.5 lg:w-1.5" />
            <span className="text-[10.5px] font-semibold uppercase leading-none tracking-[0.1em] text-marca-amarillo lg:text-[12px]">
              {etiqueta}
            </span>
          </p>

          {/* Sin truncar: los títulos reales ocupan dos líneas. */}
          <h2 className="text-pretty font-display text-[22px] font-bold leading-[1.2] text-white lg:max-w-[600px] lg:text-[34px] lg:leading-[1.16]">
            {terminado || !siguiente ? curso.titulo : siguiente.titulo}
          </h2>

          {siguiente && siguiente.moduloTitulo !== "" && (
            <p className="mt-2 text-[13px] leading-[1.4] text-white/55 lg:mt-3 lg:max-w-[560px] lg:text-[15px] lg:leading-[1.45]">
              {siguiente.moduloTitulo}
            </p>
          )}

          {/* --- progreso en móvil: la retícula no cabe, va una barra --- */}
          {total > 0 && (
            <div className="mt-[18px] lg:hidden">
              <div className="flex items-baseline justify-between">
                <span className="text-[13px] text-white/[0.62]">{textoLecciones}</span>
                <span className="font-display text-[17px] font-bold text-white tabular-nums">
                  {porcentaje}%
                </span>
              </div>
              <div
                className="mt-2 h-[7px] overflow-hidden rounded-[4px] bg-white/[0.14]"
                role="progressbar"
                aria-valuenow={porcentaje}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Progreso en ${curso.titulo}`}
              >
                <div
                  className="h-full rounded-[4px] bg-marca-verdeClaro transition-[width] duration-500"
                  style={{ width: `${porcentaje}%` }}
                />
              </div>
            </div>
          )}

          <div className="mt-[18px] lg:mt-auto lg:flex lg:items-center lg:gap-[18px] lg:pt-[26px]">
            <Link
              href={destino}
              className="block rounded-full bg-marca-verde px-8 py-[15px] text-center text-[16px] font-semibold leading-none text-white transition-colors hover:bg-marca-verdeOsc lg:inline-block lg:py-[14px]"
            >
              {llamada}
            </Link>
            <span className="mt-3 block text-center text-[12.5px] text-white/45 lg:mt-0 lg:inline lg:text-[14px] lg:text-white/55">
              {curso.titulo}
            </span>
          </div>
        </div>

        {/* --- progreso en escritorio: una marca por lección --- */}
        <div className="hidden lg:block lg:pb-0.5">
          <p className="flex items-baseline gap-[7px]">
            <span className="font-display text-[46px] font-bold leading-none text-white tabular-nums">
              {porcentaje}
            </span>
            <span className="text-[18px] font-semibold text-white/50">%</span>
          </p>
          <p className="mt-1 text-[13px] text-white/50">del curso completado</p>

          {total > 0 && (
            <div aria-hidden className="mt-[18px] flex flex-wrap gap-[3px]">
              {Array.from({ length: total }, (_, i) => (
                <span
                  key={i}
                  className={`h-[11px] w-[5px] rounded-[1.5px] ${
                    i < completadas ? "bg-marca-verdeClaro" : "bg-white/[0.13]"
                  }`}
                />
              ))}
            </div>
          )}

          <p className="mt-3.5 text-[13px] text-white/[0.62]">{textoLecciones}</p>
        </div>
      </div>

      {/* El segundo curso del alumno de examen. Discreto a propósito: el
          banner ya ha dicho cuál toca hoy. */}
      {otros.map((otro) => (
        <p key={otro.curso.id} className="mt-3 px-1 text-[14px] leading-[1.5] text-marca-gris">
          También tienes acceso a{" "}
          <Link
            href={`/curso/${otro.curso.slug}`}
            className="font-medium text-marca-verdeOsc underline underline-offset-2 transition-colors hover:text-marca-tinta"
          >
            {otro.curso.titulo}
          </Link>
          .
        </p>
      ))}
    </section>
  );
}
