import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { exigirSesion } from "@/lib/sesion-servidor";
import { obtenerPerfil } from "@/lib/gestion";
import { arbolDelCurso, cursoPorSlug, cursosAsignados } from "@/lib/cursos-servidor";
import Cabecera from "@/components/Cabecera";

export const dynamic = "force-dynamic";

/**
 * El índice del curso.
 *
 * Los módulos son un acordeón de `<details>` y no un componente de
 * cliente con estado: plegar y desplegar es exactamente lo que hace ese
 * elemento, sale accesible de fábrica y funciona sin JavaScript. Con 48
 * módulos y hasta 169 lecciones, una lista plana no se puede recorrer.
 *
 * Abierto el módulo donde está la lección actual; el resto, plegados.
 */
export default async function IndiceCurso({ params }: { params: { slug: string } }) {
  const sesion = await exigirSesion();

  const curso = await cursoPorSlug(params.slug);
  if (!curso) notFound();

  // El equipo entra en cualquier curso para revisarlo, pero sin progreso
  // propio: no es alumno de nada. Se le pinta todo como pendiente.
  const alumnoId = sesion.rol === "alumno" ? sesion.alumnoId : "";

  // Un alumno solo abre los cursos de su plan. Sin esto, el slug sería
  // decorativo y cualquiera se leería el temario de los otros niveles.
  if (sesion.rol === "alumno") {
    const perfil = await obtenerPerfil(sesion.alumnoId);
    const suyos = perfil ? await cursosAsignados(perfil.plan, perfil.nivel) : [];
    if (!suyos.some((c) => c.id === curso.id)) redirect(`/alumno/${sesion.alumnoId}`);
  }

  const arbol = await arbolDelCurso(alumnoId, curso);
  const porcentaje = arbol.total > 0 ? Math.round((arbol.completadas / arbol.total) * 100) : 0;

  const inicio = sesion.rol === "alumno" ? `/alumno/${sesion.alumnoId}` : "/";

  return (
    <>
      <Cabecera seccion="curso" alumnoId={sesion.alumnoId} cursoSlug={curso.slug} />

      <main className="mx-auto max-w-columna px-6 pb-20 pt-7">
        <Link
          href={inicio}
          className="text-[14px] text-drc-cuerpo transition-colors hover:text-drc-verde-texto"
        >
          ← Volver al inicio
        </Link>

        {/* ------------------------------ CABECERA ------------------------------ */}
        <header className="mt-6 border-b border-marca-borde pb-7">
          <p className="text-[11px] font-semibold uppercase leading-none tracking-[0.12em] text-marca-verdeOsc">
            {curso.tipo === "examen" ? "Preparación de examen" : "Curso general"} · Nivel{" "}
            {curso.nivel}
          </p>
          <h1 className="mt-3.5 text-balance font-display text-[32px] font-semibold leading-[1.1] tracking-[-0.01em] text-marca-tinta sm:text-[38px]">
            {curso.titulo}
          </h1>

          {arbol.total > 0 && (
            <div className="mt-5">
              <div className="flex items-end justify-between gap-4">
                <p className="text-[14px] text-drc-cuerpo">
                  <span className="font-semibold tabular-nums text-marca-tinta">
                    {arbol.completadas} de {arbol.total}
                  </span>{" "}
                  lecciones · {arbol.modulos.length} módulos
                </p>
                <p className="font-display text-[20px] font-semibold leading-none tabular-nums text-marca-verdeOsc">
                  {porcentaje}%
                </p>
              </div>
              <div
                className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-marca-borde"
                role="progressbar"
                aria-valuenow={porcentaje}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Progreso en ${curso.titulo}`}
              >
                <div
                  className="h-full rounded-full bg-marca-verde"
                  style={{ width: `${porcentaje}%` }}
                />
              </div>
            </div>
          )}
        </header>

        {/* ------------------------------ MÓDULOS ------------------------------ */}
        <ol className="mt-7 flex flex-col gap-2.5">
          {arbol.modulos.map((modulo, i) => {
            const tieneLaActual = modulo.lecciones.some((l) => l.id === arbol.leccionActual);
            const hecho = modulo.lecciones.length > 0 && modulo.completadas === modulo.lecciones.length;

            return (
              <li key={modulo.id}>
                <details
                  open={tieneLaActual}
                  className="group overflow-hidden rounded-2xl border border-marca-borde bg-white"
                >
                  <summary className="flex cursor-pointer list-none items-center gap-4 px-5 py-4 transition-colors hover:bg-marca-niebla">
                    <span
                      aria-hidden
                      className={`grid h-8 w-8 shrink-0 place-items-center rounded-full font-display text-[13px] font-semibold tabular-nums ${
                        hecho
                          ? "bg-marca-verde text-white"
                          : "bg-marca-niebla text-drc-cuerpo"
                      }`}
                    >
                      {hecho ? "✓" : String(i + 1).padStart(2, "0")}
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="block text-pretty font-display text-[16px] font-semibold leading-snug text-marca-tinta">
                        {modulo.titulo}
                      </span>
                      <span className="mt-1 block text-[13px] tabular-nums text-drc-cuerpo">
                        {modulo.completadas} de {modulo.lecciones.length} lecciones
                      </span>
                    </span>

                    {/* La flecha gira al abrir. `group-open` es de Tailwind
                        sobre el propio <details>. */}
                    <span
                      aria-hidden
                      className="shrink-0 text-drc-flecha transition-transform duration-200 group-open:rotate-180"
                    >
                      ▾
                    </span>
                  </summary>

                  <ul className="border-t border-marca-borde">
                    {modulo.lecciones.map((leccion) => {
                      const esActual = leccion.id === arbol.leccionActual;
                      return (
                        <li key={leccion.id} className="border-b border-marca-borde last:border-b-0">
                          <Link
                            href={`/curso/${curso.slug}/${leccion.id}`}
                            className={`flex items-center gap-3.5 px-5 py-3.5 transition-colors hover:bg-marca-niebla ${
                              esActual ? "bg-marca-niebla" : ""
                            }`}
                          >
                            <span
                              aria-hidden
                              className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 text-[10px] ${
                                leccion.completada
                                  ? "border-marca-verde bg-marca-verde text-white"
                                  : esActual
                                  ? "border-marca-verde"
                                  : "border-drc-hairline"
                              }`}
                            >
                              {leccion.completada ? "✓" : ""}
                            </span>

                            <span className="min-w-0 flex-1 text-pretty text-[14px] leading-[1.45] text-drc-texto">
                              {leccion.titulo}
                            </span>

                            {/* Las lecciones de solo ejercicios son práctica
                                de fin de módulo, no teoría: conviene que se
                                distingan antes de entrar. */}
                            {leccion.soloEjercicios && (
                              <span className="shrink-0 rounded-full bg-marca-amarillo/25 px-2.5 py-1 text-[11px] font-semibold text-marca-tinta">
                                Ejercicios
                              </span>
                            )}

                            {esActual && !leccion.completada && (
                              <span className="shrink-0 text-[12px] font-semibold text-marca-verdeOsc">
                                Aquí vas
                              </span>
                            )}
                          </Link>
                        </li>
                      );
                    })}

                    {modulo.lecciones.length === 0 && (
                      <li className="px-5 py-4 text-[14px] text-drc-cuerpo">
                        Este módulo todavía no tiene lecciones.
                      </li>
                    )}
                  </ul>
                </details>
              </li>
            );
          })}
        </ol>

        {arbol.modulos.length === 0 && (
          <p className="mt-8 text-[15px] leading-[1.55] text-drc-cuerpo">
            Este curso todavía no tiene contenido cargado.
          </p>
        )}
      </main>
    </>
  );
}
