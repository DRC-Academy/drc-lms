import Link from "next/link";
import { listarAlumnos } from "@/lib/gestion";
import { exigirAdministrador } from "@/lib/sesion-servidor";
import { cargarPanel, esPeriodo, type Periodo } from "@/lib/admin-servidor";
import Cabecera from "@/components/Cabecera";
import PanelAdmin from "@/components/admin/PanelAdmin";

// Lee la cookie de sesión y datos de Gestión: nada que prerenderizar.
export const dynamic = "force-dynamic";

const POR_PAGINA = 20;

/**
 * La pantalla del equipo.
 *
 * ANTES ERA SOLO UN BUSCADOR: servía para entrar en una ficha y nada
 * más. No había forma de saber si la plataforma se usaba, qué modo de
 * generación tiraba ni a quién había que ir a buscar. Ahora el panel va
 * arriba —que es la pregunta urgente— y el listado de alumnos baja a ser
 * una sección más.
 *
 * El índice de secciones vive aquí y no en `Cabecera`: esa barra es la
 * navegación DEL ALUMNO —inicio, curso, práctica— y al equipo se le
 * enseña vacía a propósito. Meterle secciones de admin la convertiría en
 * dos componentes disfrazados de uno.
 *
 * El guard es `exigirAdministrador`, que lee el rol de la cookie firmada
 * en el servidor: un alumno que escriba esta URL acaba en su ficha antes
 * de que se lea una sola fila. No hay parámetro que valga.
 */
export default async function Home({
  searchParams,
}: {
  searchParams: { q?: string; periodo?: string };
}) {
  await exigirAdministrador();

  const periodo: Periodo = esPeriodo(searchParams.periodo) ? searchParams.periodo : "7";
  const busqueda = typeof searchParams.q === "string" ? searchParams.q.trim() : "";

  // En paralelo: el panel no depende del buscador ni al revés.
  const [datos, alumnos] = await Promise.all([
    cargarPanel(periodo),
    listarAlumnos(busqueda, POR_PAGINA),
  ]);

  return (
    <>
      <Cabecera />

      <main className="mx-auto w-full max-w-[1240px] px-4 pb-16 pt-6 lg:px-10 lg:pb-20 lg:pt-9">
        <p className="text-[10.5px] font-semibold uppercase leading-none tracking-[0.12em] text-marca-verdeOsc lg:text-[11.5px]">
          DRC Academy · equipo
        </p>
        <h1 className="mt-2.5 text-balance font-display text-[26px] font-bold leading-[1.08] tracking-[-0.02em] text-marca-tinta lg:text-[38px]">
          Cómo va la plataforma
        </h1>
        <p className="mt-2 max-w-[60ch] text-pretty text-[14px] leading-[1.5] text-marca-gris lg:text-[16px]">
          Lo que pasa dentro del LMS: quién entra, qué práctica se genera y a quién conviene ir a
          buscar. Lo de las clases y los pagos sigue en DRC Gestión.
        </p>

        {/* Anclas, no rutas: el panel entero es una sola página y el
            equipo salta entre bloques sin recargar ni perder el periodo. */}
        <nav aria-label="Secciones del panel" className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2">
          {[
            { texto: "Acceso", ancla: "#acceso" },
            { texto: "Adopción", ancla: "#adopcion" },
            { texto: "Uso por modo", ancla: "#modos" },
            { texto: "Requieren atención", ancla: "#atencion" },
            { texto: "Alumnos", ancla: "#alumnos" },
          ].map(({ texto, ancla }) => (
            <a
              key={ancla}
              href={ancla}
              className="text-[13px] font-semibold text-marca-gris underline-offset-4 transition-colors hover:text-marca-verdeOsc hover:underline"
            >
              {texto}
            </a>
          ))}
        </nav>

        <PanelAdmin datos={datos} />

        {/* ------------------------------- ALUMNOS ------------------------------- */}
        <section id="alumnos" className="mt-10 scroll-mt-6 lg:mt-14">
          <h2 className="font-display text-[21px] font-bold leading-[1.15] text-marca-tinta lg:text-[26px]">
            Alumnos
          </h2>
          <p className="mt-1.5 max-w-[62ch] text-pretty text-[13.5px] leading-[1.5] text-marca-gris lg:text-[15px]">
            Entra en una ficha para verla tal y como la ve el alumno.
          </p>

          {/* Formulario normal: se envía y el servidor filtra. Así el
              buscador mira a todos los alumnos y no solo a los de esta
              página. El periodo viaja en un campo oculto para no perderlo
              al buscar. */}
          <form method="get" className="mt-4 flex flex-col gap-2.5 sm:flex-row">
            <input type="hidden" name="periodo" value={periodo} />
            <label htmlFor="q" className="sr-only">
              Buscar por nombre
            </label>
            <input
              id="q"
              name="q"
              type="search"
              defaultValue={busqueda}
              placeholder="Busca por nombre…"
              className="min-h-[46px] w-full flex-1 rounded-full border border-marca-borde bg-white px-5 text-[15px] text-marca-tinta outline-none transition-colors placeholder:text-marca-grisTenue focus:border-marca-verde"
            />
            <button
              type="submit"
              className="inline-flex min-h-[46px] items-center justify-center rounded-full bg-marca-verde px-7 text-[14px] font-semibold text-white transition-colors hover:bg-marca-verdeOsc"
            >
              Buscar
            </button>
          </form>

          {busqueda !== "" && (
            <p className="mt-3.5 text-[13.5px] text-marca-gris">
              {alumnos.length === 0
                ? `No encontramos a nadie que se llame «${busqueda}».`
                : `${alumnos.length} ${alumnos.length === 1 ? "alumno" : "alumnos"} para «${busqueda}».`}{" "}
              <Link
                href={`/?periodo=${periodo}`}
                className="font-semibold text-marca-verdeOsc underline underline-offset-2"
              >
                Ver los primeros {POR_PAGINA}
              </Link>
            </p>
          )}

          {alumnos.length === 0 ? (
            busqueda === "" && (
              <p className="mt-6 text-[14px] leading-[1.55] text-marca-gris">
                Ahora mismo no podemos leer el listado de alumnos. Vuelve a cargar en un momento.
              </p>
            )
          ) : (
            <ul className="mt-4 grid grid-cols-1 gap-2.5 lg:grid-cols-2">
              {alumnos.map((alumno) => (
                <li key={alumno.alumnoId}>
                  <Link
                    href={`/alumno/${alumno.alumnoId}`}
                    className="flex items-center gap-3.5 rounded-[14px] border border-marca-borde bg-white p-3.5 transition-colors hover:border-marca-verde hover:bg-marca-verdeFondo"
                  >
                    <span
                      aria-hidden
                      className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-marca-verde font-display text-[15px] font-bold text-white"
                    >
                      {alumno.nombre.trim().charAt(0) || "?"}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-display text-[15px] font-bold text-marca-tinta">
                        {alumno.nombre} · {alumno.nivel}
                      </span>
                      <span className="mt-0.5 block truncate text-[12.5px] text-marca-gris">
                        Clases con {alumno.profesor}
                      </span>
                    </span>
                    <span aria-hidden className="shrink-0 text-[16px] text-marca-grisTenue">
                      →
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </>
  );
}
