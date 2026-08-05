import Link from "next/link";
import { listarAlumnos } from "@/lib/gestion";
import { exigirAdministrador } from "@/lib/sesion-servidor";
import Cabecera from "@/components/Cabecera";

// Lee la cookie de sesión y datos de Gestión: nada que prerenderizar.
export const dynamic = "force-dynamic";

const POR_PAGINA = 20;

export default async function Home({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  // El buscador es solo del equipo. Un alumno no ve esta pantalla en
  // ningún momento: `exigirAdministrador` lo manda a su propia ficha
  // antes de que se lea una sola fila de la vista.
  await exigirAdministrador();

  const busqueda = typeof searchParams.q === "string" ? searchParams.q.trim() : "";
  const alumnos = await listarAlumnos(busqueda, POR_PAGINA);

  return (
    <>
      <Cabecera />

      <main className="mx-auto max-w-columna px-6 py-12 sm:py-16">
        <p className="eyebrow text-drc-verde-texto">DRC Academy · equipo</p>
        <h1 className="mt-3.5 text-balance font-display text-[34px] font-semibold leading-[1.08] tracking-[-0.02em] text-drc-titular sm:text-[44px]">
          Tu práctica, hecha con tus clases
        </h1>
        <p className="mt-3.5 max-w-[52ch] text-pretty text-[16px] leading-[1.55] text-drc-cuerpo">
          Elige a un alumno para ver su ficha tal y como la ve él. Cada uno practica con lo que
          ha trabajado en clase, con su examen o con lo suyo del día a día.
        </p>

        {/* Formulario normal: se envía y el servidor filtra. Así el
            buscador mira a todos los alumnos y no solo a los de esta página. */}
        <form method="get" className="mt-8 flex flex-col gap-2.5 wide:flex-row">
          <label htmlFor="q" className="sr-only">
            Buscar por nombre
          </label>
          <input
            id="q"
            name="q"
            type="search"
            defaultValue={busqueda}
            placeholder="Busca por nombre…"
            className="min-h-[48px] w-full flex-1 rounded-full border-2 border-drc-borde bg-drc-superficie px-5 text-[16px] text-drc-texto outline-none transition-colors placeholder:text-drc-apagado focus:border-drc-verde-solido"
          />
          <button type="submit" className="btn btn-primario min-h-[48px] wide:px-7">
            Buscar
          </button>
        </form>

        {busqueda !== "" && (
          <p className="mt-5 text-[14px] text-drc-cuerpo">
            {alumnos.length === 0
              ? `No encontramos a nadie que se llame «${busqueda}».`
              : `${alumnos.length} ${alumnos.length === 1 ? "alumno" : "alumnos"} para «${busqueda}».`}{" "}
            <Link
              href="/"
              className="font-medium text-drc-verde-texto underline underline-offset-2 transition-colors hover:text-drc-enlace-hover"
            >
              Ver los primeros {POR_PAGINA}
            </Link>
          </p>
        )}

        {alumnos.length === 0 ? (
          busqueda === "" && (
            <p className="mt-10 text-[15px] leading-[1.55] text-drc-cuerpo">
              Ahora mismo no podemos leer el listado de alumnos. Vuelve a cargar en un momento.
            </p>
          )
        ) : (
          <ul className="mt-8 flex flex-col gap-3">
            {alumnos.map((alumno) => (
              <li key={alumno.alumnoId}>
                <Link
                  href={`/alumno/${alumno.alumnoId}`}
                  className="tarjeta tarjeta-activa flex items-center gap-4"
                >
                  <span
                    aria-hidden
                    className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-drc-verde-solido font-display text-[16px] font-semibold text-white"
                  >
                    {alumno.nombre.trim().charAt(0) || "?"}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-display text-[17px] font-semibold text-drc-titular">
                      {alumno.nombre} · {alumno.nivel}
                    </span>
                    <span className="mt-0.5 block truncate text-[14px] text-drc-cuerpo">
                      Clases con {alumno.profesor}
                    </span>
                  </span>
                  <span aria-hidden className="text-[18px] text-drc-flecha">
                    →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
