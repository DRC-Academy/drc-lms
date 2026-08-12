import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { exigirSesion } from "@/lib/sesion-servidor";
import { obtenerPerfil } from "@/lib/gestion";
import { arbolDelCurso, cursoPorSlug, cursosAsignados } from "@/lib/cursos-servidor";
import { etiquetaModulo, partirModulo } from "@/lib/modulo";
import CabeceraLeccion from "@/components/leccion/CabeceraLeccion";

export const dynamic = "force-dynamic";

/**
 * El índice del curso completo.
 *
 * ANTES ERA UN ACORDEÓN de 48 módulos: para ver qué había en el módulo
 * 30 tocaba desplegarlo, y para comparar dos, desplegar los dos. Ahora
 * es una rejilla de tarjetas donde los 48 se ven de una vez, cada uno
 * con su progreso, y se entra directamente al que interese.
 *
 * SOBRE LAS "SEMANAS": el diseño pedía agrupar por semana, pero en estos
 * datos la semana no es un nivel de la jerarquía. Los módulos se llaman
 * "Week 1 - Lesson 1: …" y el número se repite cada ocho: seis ciclos de
 * cuatro semanas a lo largo del curso. Agrupar por él daría seis
 * "Semana 1" distintas. Así que la semana se queda donde sí significa
 * algo —la etiqueta de cada tarjeta— y la rejilla es de módulos.
 */
export default async function IndiceCurso({ params }: { params: { slug: string } }) {
  const sesion = await exigirSesion();

  const curso = await cursoPorSlug(params.slug);
  if (!curso) notFound();

  // El equipo entra en cualquier curso para revisarlo, pero sin progreso
  // propio: no es alumno de nada. Se le pinta todo como pendiente.
  const alumnoId = sesion.rol === "alumno" ? sesion.alumnoId : "";
  const perfil = sesion.rol === "alumno" ? await obtenerPerfil(sesion.alumnoId) : null;

  // Un alumno solo abre los cursos de su plan. Sin esto, el slug sería
  // decorativo y cualquiera se leería el temario de los otros niveles.
  if (sesion.rol === "alumno") {
    const suyos = perfil ? await cursosAsignados(perfil.plan, perfil.nivel) : [];
    if (!suyos.some((c) => c.id === curso.id)) redirect(`/alumno/${sesion.alumnoId}`);
  }

  const arbol = await arbolDelCurso(alumnoId, curso);
  const porcentaje = arbol.total > 0 ? Math.round((arbol.completadas / arbol.total) * 100) : 0;

  const inicio = sesion.rol === "alumno" ? `/alumno/${sesion.alumnoId}` : "/";
  const nombre = perfil?.nombre.trim() ?? "";

  return (
    <div className="min-h-screen bg-marca-niebla">
      <CabeceraLeccion
        cursoTitulo={curso.titulo}
        cursoSlug={curso.slug}
        completadas={arbol.completadas}
        total={arbol.total}
        inicial={nombre[0]?.toUpperCase() ?? ""}
        volverA={inicio}
      />

      <main className="mx-auto w-full max-w-[1120px] px-4 pb-14 pt-6 min-[1100px]:px-10 min-[1100px]:pb-14 min-[1100px]:pt-9">
        <Link
          href={arbol.leccionActual ? `/curso/${curso.slug}/${arbol.leccionActual}` : inicio}
          className="text-[14px] text-marca-gris transition-colors hover:text-marca-tinta"
        >
          ← {arbol.leccionActual ? "Volver a la lección" : "Volver al inicio"}
        </Link>

        {/* ------------------------------ CABECERA ------------------------------ */}
        <header className="mt-5 flex flex-col gap-5 min-[1100px]:mt-6 min-[1100px]:flex-row min-[1100px]:items-end min-[1100px]:justify-between min-[1100px]:gap-10">
          <div className="min-w-0">
            <p className="text-[11.5px] font-semibold uppercase leading-none tracking-[0.1em] text-marca-grisSuave">
              Curso completo
            </p>
            <h1 className="mt-2.5 text-pretty font-display text-[26px] font-bold leading-[1.15] text-marca-tinta min-[1100px]:text-[34px]">
              {curso.titulo}
            </h1>
            <p className="mt-2 text-[15px] text-marca-gris">
              {arbol.modulos.length} módulos · {arbol.total} lecciones
            </p>
          </div>

          {arbol.total > 0 && (
            <div className="shrink-0 min-[1100px]:text-right">
              <p className="flex items-baseline gap-1.5 min-[1100px]:justify-end">
                <span className="font-display text-[30px] font-bold leading-none text-marca-tinta tabular-nums min-[1100px]:text-[34px]">
                  {porcentaje}
                </span>
                <span className="text-[16px] font-semibold text-marca-grisSuave">%</span>
              </p>
              <div
                className="mt-2.5 h-1.5 w-full overflow-hidden rounded-[3px] bg-marca-pista min-[1100px]:w-[260px]"
                role="progressbar"
                aria-valuenow={porcentaje}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Progreso en ${curso.titulo}`}
              >
                <div className="h-full rounded-[3px] bg-marca-verde" style={{ width: `${porcentaje}%` }} />
              </div>
              <p className="mt-2 text-[13px] text-marca-grisSuave tabular-nums">
                {arbol.completadas} de {arbol.total} lecciones
              </p>
            </div>
          )}
        </header>

        {/* ------------------------------ MÓDULOS ------------------------------ */}
        {arbol.modulos.length === 0 ? (
          <p className="mt-9 text-[16px] leading-[1.6] text-marca-gris">
            Este curso todavía no tiene contenido cargado.
          </p>
        ) : (
          <ol className="mt-7 grid grid-cols-1 gap-4 min-[1100px]:mt-[30px] min-[1100px]:grid-cols-3">
            {arbol.modulos.map((modulo, i) => {
              const partido = partirModulo(modulo.titulo, i);
              const total = modulo.lecciones.length;
              const pct = total > 0 ? Math.round((modulo.completadas / total) * 100) : 0;
              const hecho = total > 0 && modulo.completadas === total;
              const actual = modulo.lecciones.some((l) => l.id === arbol.leccionActual);

              // Sin lecciones no hay a dónde entrar: la tarjeta se pinta
              // apagada en vez de llevar a una pantalla vacía.
              const destino =
                modulo.lecciones[0] !== undefined
                  ? `/curso/${curso.slug}/${
                      modulo.lecciones.find((l) => !l.completada)?.id ?? modulo.lecciones[0].id
                    }`
                  : null;

              const tarjeta = (
                <>
                  <div className="flex items-baseline justify-between gap-3">
                    <span
                      className={`text-[11.5px] font-semibold uppercase leading-none tracking-[0.09em] ${
                        actual ? "text-marca-verdeOsc" : "text-marca-grisSuave"
                      }`}
                    >
                      {etiquetaModulo(partido)}
                    </span>
                    <span
                      className={`shrink-0 text-[11.5px] font-semibold ${
                        actual ? "text-marca-verdeOsc" : "text-marca-gris"
                      }`}
                    >
                      {hecho ? "Completado" : actual ? "Aquí vas" : "Pendiente"}
                    </span>
                  </div>

                  <p className="mt-2.5 text-pretty font-display text-[17px] font-bold leading-[1.25] text-marca-tinta">
                    {partido.titulo}
                  </p>

                  <p className="mt-2 text-[13px] text-marca-grisSuave tabular-nums">
                    {total} {total === 1 ? "lección" : "lecciones"}
                    {total > 0 && ` · ${modulo.completadas} hechas`}
                  </p>

                  <div className="mt-3.5 h-[5px] overflow-hidden rounded-[3px] bg-marca-pista">
                    <div className="h-full rounded-[3px] bg-marca-verde" style={{ width: `${pct}%` }} />
                  </div>
                </>
              );

              const clase = `block rounded-[14px] border-[1.5px] p-4 text-left transition-colors min-[1100px]:rounded-[16px] min-[1100px]:p-5 ${
                actual
                  ? "border-marca-verde bg-marca-verdeFondo"
                  : "border-marca-borde bg-white hover:border-marca-verde"
              }`;

              return (
                <li key={modulo.id}>
                  {destino ? (
                    <Link href={destino} className={clase}>
                      {tarjeta}
                    </Link>
                  ) : (
                    <div className={`${clase} opacity-60`}>{tarjeta}</div>
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </main>
    </div>
  );
}
