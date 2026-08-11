import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { exigirSesion } from "@/lib/sesion-servidor";
import { obtenerPerfil } from "@/lib/gestion";
import { cursoPorSlug, cursosAsignados, leccionParaVer } from "@/lib/cursos-servidor";
import { sanearHtml, tieneContenido } from "@/lib/sanear-html";
import Cabecera from "@/components/Cabecera";
import EjerciciosLeccion, { type EjercicioVista } from "@/components/EjerciciosLeccion";

export const dynamic = "force-dynamic";

export default async function PaginaLeccion({
  params,
}: {
  params: { slug: string; leccion: string };
}) {
  const sesion = await exigirSesion();

  const curso = await cursoPorSlug(params.slug);
  if (!curso) notFound();

  const alumnoId = sesion.rol === "alumno" ? sesion.alumnoId : "";

  // El mismo guard que el índice: un alumno solo entra en los cursos de
  // su plan, aunque escriba el uuid de una lección de otro.
  if (sesion.rol === "alumno") {
    const perfil = await obtenerPerfil(sesion.alumnoId);
    const suyos = perfil ? await cursosAsignados(perfil.plan, perfil.nivel) : [];
    if (!suyos.some((c) => c.id === curso.id)) redirect(`/alumno/${sesion.alumnoId}`);
  }

  const vista = await leccionParaVer(alumnoId, curso, params.leccion);
  if (!vista) notFound();

  const { leccion, hermanas, ejercicios, moduloTitulo, completada, siguienteId } = vista;

  const html = sanearHtml(leccion.contenido);
  const hayTeoria = tieneContenido(html);

  const ejerciciosVista: EjercicioVista[] = ejercicios.map((e) => ({
    id: e.id,
    tipo: e.tipo,
    enunciado: e.enunciado,
    opciones: Array.isArray(e.opciones) ? e.opciones : [],
    correcta: e.correcta,
    orden: e.orden,
  }));

  // La posición dentro del módulo decide qué se puede abrir desde la
  // barra: hacia atrás sí, hacia adelante no. El orden del curso importa.
  const posicion = hermanas.findIndex((h) => h.id === leccion.id);

  return (
    <>
      <Cabecera seccion="curso" alumnoId={sesion.alumnoId} cursoSlug={curso.slug} />

      <div className="mx-auto max-w-2xl px-6 py-7 sm:py-9 lg:max-w-6xl lg:px-8">
        <div className="mb-6 flex items-center justify-between gap-4">
          <Link
            href={`/curso/${curso.slug}`}
            className="text-[14px] text-drc-cuerpo transition-colors hover:text-drc-verde-texto"
          >
            ← {curso.titulo}
          </Link>
          <span className="shrink-0 text-[13px] tabular-nums text-drc-cuerpo">
            {posicion + 1} de {hermanas.length}
          </span>
        </div>

        {/* items-start: sin esto las dos columnas se estirarían a la misma
            altura y la barra lateral quedaría como una tarjeta hueca. */}
        <div className="lg:flex lg:items-start lg:gap-8">
          {/* ------------------------- BARRA LATERAL ------------------------- */}
          <aside className="mb-7 lg:mb-0 lg:w-[280px] lg:shrink-0">
            <div className="rounded-2xl border border-marca-borde bg-white p-5">
              <p className="text-[11px] font-semibold uppercase leading-none tracking-[0.1em] text-drc-cuerpo">
                En este módulo
              </p>
              <p className="mt-2.5 text-pretty font-display text-[15px] font-semibold leading-snug text-marca-tinta">
                {moduloTitulo}
              </p>

              <ol className="mt-4 flex flex-col gap-0.5">
                {hermanas.map((hermana, i) => {
                  const esActual = hermana.id === leccion.id;
                  // Se abre lo ya hecho, lo actual y lo inmediatamente
                  // anterior. Saltar cinco lecciones hacia adelante es
                  // saltarse el curso, y el orden es la mitad del valor.
                  const alcanzable = hermana.completada || esActual || i <= posicion;

                  const contenido = (
                    <>
                      <span
                        aria-hidden
                        className={`mt-[3px] grid h-4 w-4 shrink-0 place-items-center rounded-full border-2 text-[9px] ${
                          hermana.completada
                            ? "border-marca-verde bg-marca-verde text-white"
                            : esActual
                            ? "border-marca-verde"
                            : "border-drc-hairline"
                        }`}
                      >
                        {hermana.completada ? "✓" : ""}
                      </span>
                      <span
                        className={`min-w-0 flex-1 text-pretty text-[13px] leading-[1.4] ${
                          esActual
                            ? "font-semibold text-marca-tinta"
                            : alcanzable
                            ? "text-drc-texto"
                            : "text-drc-apagado"
                        }`}
                      >
                        {hermana.titulo}
                        {hermana.soloEjercicios && (
                          <span className="ml-1.5 text-[11px] text-drc-cuerpo">· ejercicios</span>
                        )}
                      </span>
                    </>
                  );

                  return (
                    <li key={hermana.id}>
                      {alcanzable && !esActual ? (
                        <Link
                          href={`/curso/${curso.slug}/${hermana.id}`}
                          className="flex items-start gap-2.5 rounded-lg px-2 py-2 transition-colors hover:bg-marca-niebla"
                        >
                          {contenido}
                        </Link>
                      ) : (
                        <span
                          className={`flex items-start gap-2.5 rounded-lg px-2 py-2 ${
                            esActual ? "bg-marca-niebla" : ""
                          }`}
                        >
                          {contenido}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ol>
            </div>
          </aside>

          {/* --------------------------- CONTENIDO --------------------------- */}
          <main className="min-w-0 lg:flex-1">
            <h1 className="text-balance font-display text-[26px] font-semibold leading-[1.15] text-marca-tinta sm:text-[30px]">
              {leccion.titulo}
            </h1>

            {hayTeoria ? (
              // El HTML viene de LearnDash y pasa por `sanearHtml` antes de
              // llegar aquí: sin scripts, sin manejadores y sin iframes que
              // no sean de YouTube. Ver `lib/sanear-html.ts`.
              <div
                className="leccion mt-6"
                dangerouslySetInnerHTML={{ __html: html }}
              />
            ) : (
              ejerciciosVista.length > 0 && (
                <p className="mt-5 text-[15px] leading-[1.55] text-drc-cuerpo">
                  Esta lección es práctica: ve directo a los ejercicios.
                </p>
              )
            )}

            {!hayTeoria && ejerciciosVista.length === 0 && (
              <p className="mt-6 text-[15px] leading-[1.55] text-drc-cuerpo">
                Esta lección todavía no tiene contenido. Puedes seguir con la siguiente.
              </p>
            )}

            <EjerciciosLeccion ejercicios={ejerciciosVista} />

            {/* ------------------------- CONTINUAR ------------------------- */}
            <div className="mt-10 border-t border-marca-borde pt-7">
              {sesion.rol === "alumno" ? (
                <form action="/api/progreso-leccion" method="post">
                  <input type="hidden" name="leccionId" value={leccion.id} />
                  <input type="hidden" name="slug" value={curso.slug} />
                  <input type="hidden" name="siguiente" value={siguienteId ?? ""} />
                  <button
                    type="submit"
                    className="btn btn-primario min-h-[50px] w-full text-[15px] sm:w-auto sm:px-8"
                  >
                    {siguienteId
                      ? completada
                        ? "Continuar"
                        : "Marcar como completada y continuar"
                      : "Marcar como completada y terminar"}
                  </button>
                </form>
              ) : (
                <p className="text-[14px] leading-[1.55] text-drc-cuerpo">
                  Estás viendo el curso como equipo: lo que marques aquí no se guarda.{" "}
                  {siguienteId && (
                    <Link
                      href={`/curso/${curso.slug}/${siguienteId}`}
                      className="font-medium text-drc-verde-texto underline underline-offset-2"
                    >
                      Ir a la siguiente lección
                    </Link>
                  )}
                </p>
              )}

              {completada && (
                <p className="mt-3 text-[13px] text-marca-verdeOsc">Ya tenías esta lección hecha.</p>
              )}
            </div>
          </main>
        </div>
      </div>
    </>
  );
}
