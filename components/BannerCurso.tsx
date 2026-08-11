import Link from "next/link";
import type { EstadoCurso } from "@/lib/cursos-servidor";

/**
 * Lo primero que ve el alumno al entrar.
 *
 * La idea que lo ordena: quien tiene cinco minutos no debería tener que
 * decidir nada. El botón lleva a LA LECCIÓN exacta donde se quedó, no al
 * índice del curso, porque el índice es otra decisión más.
 *
 * Se renderiza en el servidor: no tiene estado ni interacción, solo un
 * enlace.
 */
export default function BannerCurso({ estados }: { estados: EstadoCurso[] }) {
  // Sin curso asignado no hay banner. En su lugar, una línea sobria: el
  // alumno no ha hecho nada mal y no se le habla como si fuera un error.
  if (estados.length === 0) {
    return (
      <section className="rounded-2xl border border-marca-borde bg-marca-niebla px-6 py-5">
        <p className="text-[15px] leading-[1.55] text-drc-cuerpo">
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

  const destino = siguiente
    ? `/curso/${curso.slug}/${siguiente.id}`
    : `/curso/${curso.slug}`;

  return (
    <section>
      <div className="rounded-2xl bg-marca-tinta px-6 py-7 sm:px-8 sm:py-8">
        <p className="text-[11px] font-semibold uppercase leading-none tracking-[0.12em] text-marca-amarillo">
          {terminado ? "Curso completado" : empezado ? "Continúa donde lo dejaste" : "Empieza tu curso"}
        </p>

        <h2 className="mt-4 text-balance font-display text-[24px] font-semibold leading-[1.15] text-white sm:text-[28px]">
          {terminado
            ? curso.titulo
            : siguiente
            ? siguiente.titulo
            : curso.titulo}
        </h2>

        {siguiente && siguiente.moduloTitulo !== "" && (
          <p className="mt-2 text-[14px] leading-[1.5] text-white/60">{siguiente.moduloTitulo}</p>
        )}

        <p className="mt-4 text-[14px] leading-[1.5] text-white/70">
          {curso.titulo}
          {total > 0 && (
            <>
              <span aria-hidden className="mx-2 text-white/30">
                ·
              </span>
              <span className="tabular-nums">
                {terminado
                  ? `${total} lecciones, todas hechas`
                  : `llevas ${completadas} de ${total} lecciones`}
              </span>
            </>
          )}
        </p>

        {/* La barra solo cuando hay algo que enseñar: a cero es una raya
            vacía que no informa y ocupa sitio. */}
        {empezado && total > 0 && (
          <div className="mt-5">
            <div
              className="h-1.5 w-full overflow-hidden rounded-full bg-white/15"
              role="progressbar"
              aria-valuenow={porcentaje}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Progreso en ${curso.titulo}`}
            >
              <div
                className="h-full rounded-full bg-marca-verde transition-[width] duration-500"
                style={{ width: `${porcentaje}%` }}
              />
            </div>
          </div>
        )}

        <Link
          href={destino}
          className="mt-6 inline-flex min-h-[48px] items-center justify-center rounded-full bg-marca-verde px-7 text-[15px] font-semibold text-white transition-colors hover:bg-marca-verdeOsc"
        >
          {terminado ? "Repasar el curso" : empezado ? "Continuar" : "Empezar"}
        </Link>
      </div>

      {/* El segundo curso del alumno de examen. Discreto a propósito: el
          banner ya ha dicho cuál toca hoy. */}
      {otros.map((otro) => (
        <p key={otro.curso.id} className="mt-3 px-1 text-[14px] leading-[1.5] text-drc-cuerpo">
          También tienes acceso a{" "}
          <Link
            href={`/curso/${otro.curso.slug}`}
            className="font-medium text-drc-verde-texto underline underline-offset-2 transition-colors hover:text-drc-enlace-hover"
          >
            {otro.curso.titulo}
          </Link>
          .
        </p>
      ))}
    </section>
  );
}
