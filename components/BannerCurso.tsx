import Link from "next/link";
import type { EstadoCurso } from "@/lib/cursos-servidor";
import Banner from "@/components/Banner";

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
 * La forma la pone `components/Banner.tsx`: este archivo decide QUÉ se
 * cuenta —qué lección toca, qué llamada, qué progreso— y el banner cómo
 * se ve. Antes esto era una franja en tinta oscura con botón verde y era
 * el único sitio de la aplicación donde se pintaba así.
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
  // Esto es una tarjeta, no una franja: no lleva verde ni amarillo.
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

  const titulo = terminado || !siguiente ? curso.titulo : siguiente.titulo;

  return (
    <section>
      <Banner
        eyebrow={etiqueta}
        title={titulo}
        meta={siguiente && siguiente.moduloTitulo !== "" ? siguiente.moduloTitulo : undefined}
        action={{ label: llamada, href: destino, srSuffix: titulo }}
        secondaryText={curso.titulo}
        // Con la invitación al perfil al lado, la pantalla es más
        // estrecha y la columna del progreso encoge para que el titular
        // no se quede en tres palabras por línea.
        asideWidth={conLateral ? "190px" : "210px"}
        aside={
          <>
            <p className="flex items-baseline gap-[7px]">
              <span className="font-display text-[40px] font-extrabold leading-none text-white tabular-nums">
                {porcentaje}
              </span>
              <span className="text-[14px] font-semibold text-white/[0.82]">%</span>
            </p>
            <p className="mt-1 text-[13px] text-white/[0.82]">del curso completado</p>

            {total > 0 && (
              <>
                {/* Una marca por lección. Solo donde caben: a 191
                    lecciones en un móvil serían de menos de un píxel. */}
                <div aria-hidden className="mt-[18px] hidden flex-wrap gap-[3px] min-[900px]:flex">
                  {Array.from({ length: total }, (_, i) => (
                    <span
                      key={i}
                      className={`h-[11px] w-[5px] rounded-[1.5px] ${
                        i < completadas ? "bg-white" : "bg-white/[0.32]"
                      }`}
                    />
                  ))}
                </div>

                {/* En móvil, el mismo dato en una barra. */}
                <div
                  className="mt-[18px] h-[7px] overflow-hidden rounded-[4px] bg-white/[0.32] min-[900px]:hidden"
                  role="progressbar"
                  aria-valuenow={porcentaje}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`Progreso en ${curso.titulo}`}
                >
                  <div className="h-full rounded-[4px] bg-white" style={{ width: `${porcentaje}%` }} />
                </div>
              </>
            )}

            <p className="mt-3.5 text-[13px] text-white/[0.82]">{textoLecciones}</p>
          </>
        }
      />

      {/* El segundo curso del alumno de examen. Discreto a propósito y
          FUERA del banner: el banner ya ha dicho cuál toca hoy, y una
          segunda acción dentro competiría con el botón. */}
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
