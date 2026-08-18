import Link from "next/link";
import { listarAlumnos } from "@/lib/gestion";
import { exigirAdministrador } from "@/lib/sesion-servidor";
import { cargarPanel, esPeriodo, type Periodo } from "@/lib/admin-servidor";
import Cabecera from "@/components/Cabecera";
import PanelAdmin from "@/components/admin/PanelAdmin";
import GestorAccesos from "@/components/admin/GestorAccesos";

// Lee la cookie de sesión y datos de Gestión: nada que prerenderizar.
export const dynamic = "force-dynamic";

const POR_PAGINA = 20;

/**
 * La pantalla del equipo.
 *
 * EL ORDEN ES POR FRECUENCIA DE USO, NO POR IMPORTANCIA. Primero fue
 * solo un buscador; después el panel de métricas se puso arriba porque
 * era la pregunta urgente del lanzamiento. Pasado el lanzamiento, la
 * pregunta urgente se hace una vez al día y buscar a un alumno, veinte:
 * la lista vuelve a ir primero y las métricas debajo. Siguen siendo
 * útiles, pero no son lo que se viene a hacer aquí.
 *
 * El índice de anclas es lo que hace que ese orden no cueste nada: las
 * métricas están a un clic desde arriba, sin scroll.
 *
 * El índice vive aquí y no en `Cabecera`: esa barra es la navegación DEL
 * ALUMNO —inicio, curso, práctica— y al equipo se le enseña vacía a
 * propósito. Meterle secciones de admin la convertiría en dos
 * componentes disfrazados de uno.
 *
 * NO SE PINTA NINGÚN EMAIL. En una lista de 20 tarjetas, y con 172
 * alumnos detrás del buscador, el correo convierte cualquier captura de
 * pantalla en una fuga. Con nombre, nivel y profesor se identifica a
 * cualquiera; el correo concreto está en la ficha, que se abre de una en
 * una. El buscador SÍ sigue mirando el campo email —ver `listarAlumnos`—
 * porque buscar por correo es útil y enseñarlo todo el rato no.
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
            equipo salta entre bloques sin recargar ni perder el periodo.
            Ya no está "Alumnos" en la lista: es la sección que viene
            justo debajo, así que un enlace para bajar tres centímetros
            solo ensuciaría el índice. Estas cuatro son las que ahorran
            scroll de verdad. */}
        <nav aria-label="Ir a las métricas" className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2">
          {[
            { texto: "Acceso", ancla: "#acceso" },
            { texto: "Adopción", ancla: "#adopcion" },
            { texto: "Uso por modo", ancla: "#modos" },
            { texto: "Requieren atención", ancla: "#atencion" },
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

        {/* ------------------------------- ALUMNOS -------------------------------
            Primera sección: es lo que se usa a diario. Conserva su `id`
            aunque ya no esté en el índice, para que los enlaces viejos a
            `/#alumnos` sigan llevando a algún sitio. */}
        <section id="alumnos" className="mt-7 scroll-mt-6 lg:mt-9">
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
              Buscar por nombre o correo
            </label>
            <input
              id="q"
              name="q"
              type="search"
              defaultValue={busqueda}
              placeholder="Busca por nombre o correo…"
              className="min-h-[46px] w-full flex-1 rounded-full border border-marca-borde bg-white px-5 text-[15px] text-marca-tinta outline-none transition-colors placeholder:text-marca-grisTenue focus:border-marca-verde"
            />
            <button
              type="submit"
              className="inline-flex min-h-[46px] items-center justify-center rounded-full btn-verde px-7 text-[14px] font-semibold"
            >
              Buscar
            </button>
          </form>

          {busqueda !== "" && (
            <p className="mt-3.5 text-[13.5px] text-marca-gris">
              {alumnos.length === 0
                ? `Ningún alumno con «${busqueda}» en el nombre ni en el correo.`
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
                // `relative` para el menú de accesos, que va encima de la
                // tarjeta y no dentro del enlace: un botón dentro de un
                // `<a>` no es HTML válido y el clic se lo comería el
                // enlace. El `pr-12` del enlace es el hueco que le deja.
                <li key={alumno.alumnoId} className="relative">
                  <Link
                    href={`/alumno/${alumno.alumnoId}`}
                    className="flex items-center gap-3.5 rounded-[14px] border border-marca-borde bg-white p-3.5 pr-12 transition-colors hover:border-marca-verde hover:bg-marca-verdeFondo"
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
                      {/* Nombre, nivel y profesor. NADA MÁS: ver la nota
                          sobre el email en la cabecera del archivo. */}
                      <span className="mt-0.5 block truncate text-[12.5px] text-marca-gris">
                        Clases con {alumno.profesor}
                      </span>
                    </span>
                    <span aria-hidden className="shrink-0 text-[16px] text-marca-grisTenue">
                      →
                    </span>
                  </Link>

                  <GestorAccesos
                    alumnoId={alumno.alumnoId}
                    nombre={alumno.nombre}
                    nivel={alumno.nivel}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* ------------------------------- MÉTRICAS -------------------------------
            Debajo de la lista desde que el lanzamiento pasó. La línea de
            arriba no es adorno: sin ella el selector de periodo con el
            que abre `PanelAdmin` se lee como si fuera del buscador. */}
        <div className="mt-12 border-t border-marca-borde pt-2 lg:mt-16">
          <PanelAdmin datos={datos} />
        </div>
      </main>
    </>
  );
}
