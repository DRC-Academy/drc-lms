import Link from "next/link";
import MarcoApp from "@/components/Navegacion";
import Chevron from "@/components/admin/Chevron";
import { DetalleGarantiaAlumno, ListaGarantia } from "@/components/admin/GarantiaAlumno";
import { ETIQUETA_ESTADO, type Estado } from "@/lib/garantia";
import type { DatosGarantia } from "@/lib/garantia-servidor";
import type { ResumenEntradas } from "@/lib/entradas-clase";

/**
 * La pantalla de «Garantía», con los datos ya leídos. La carga y el
 * guard están en `app/garantia/page.tsx`. Mismo esqueleto que
 * `PantallaEntradas`: cabecera, nota, filtros por URL, lista y detalle.
 */
export default function PantallaGarantia({
  datos,
  estado,
  profesor,
  busqueda,
  elegido,
  entradas,
  hecho,
  error,
}: {
  datos: DatosGarantia;
  /** El filtro de estado, o "" para todos. */
  estado: Estado | "";
  profesor: string;
  busqueda: string;
  elegido: string | null;
  /** Los clics del alumno abierto, solo como apoyo. */
  entradas: ResumenEntradas | null;
  hecho: string | null;
  error: string | null;
}) {
  const filas = datos.filas ?? [];

  const profesores = Array.from(new Set(filas.map((f) => f.profesor.trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b, "es"));

  const termino = busqueda.toLowerCase();
  const filtradas = filas
    .filter((f) => !profesor || f.profesor.trim() === profesor)
    .filter((f) => !termino || f.nombre.toLowerCase().includes(termino));
  const visibles = filtradas.filter((f) => !estado || f.estado === estado).sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));

  const cuenta: Record<Estado, number> = { en_curso: 0, perdida: 0, cumplida: 0, sin_datos: 0 };
  for (const f of filtradas) cuenta[f.estado]++;

  const href = (cambio: { alumno?: string | null }) => {
    const p = new URLSearchParams();
    if (estado) p.set("estado", estado);
    if (profesor) p.set("profesor", profesor);
    if (busqueda) p.set("q", busqueda);
    const a = cambio.alumno === undefined ? elegido : cambio.alumno;
    if (a) p.set("alumno", a);
    const s = p.toString();
    return s ? `/garantia?${s}` : "/garantia";
  };

  const detalle = datos.detalle;

  return (
    <MarcoApp datos={{ alumnoId: "", nombre: "", miCurso: null, foco: null, revisando: false }}>
      <main className="mx-auto w-full max-w-[1240px] px-5 pb-16 lg:px-10 lg:pb-20 lg:pt-9">
        <div className={`pt-4 lg:pt-0 ${detalle ? "hidden lg:block" : ""}`}>
          <Link href="/" className="-ml-1 inline-flex min-h-[44px] items-center gap-1 px-1 text-[13.5px] font-semibold text-marca-verdeOsc lg:min-h-0">
            <Chevron direccion="izquierda" />
            Panel
          </Link>
          <p className="mt-1 hidden text-[10.5px] font-semibold uppercase leading-none tracking-[0.12em] text-marca-verdeOsc lg:mt-3 lg:block lg:text-[11.5px]">
            DRC Academy · equipo
          </p>
          <h1 className="font-display text-[21px] font-bold leading-[1.1] tracking-[-0.02em] text-marca-tinta lg:mt-2.5 lg:text-[38px] lg:leading-[1.08]">
            Garantía
          </h1>

          <p className="mt-2 max-w-[70ch] text-pretty text-[13px] leading-[1.5] text-marca-gris lg:text-[14px]">
            Si cada alumno mantiene la garantía de su plan: todas sus clases (según los partes de Gestión) y, salvo los
            intensivos, el contenido de cada semana a tiempo. Una pérdida no se deshace sola. El alumno no ve nada de esto.
          </p>

          {datos.filas === null && (
            <p className="mt-3 rounded-[12px] border border-marca-borde bg-white px-4 py-3 text-[13px] leading-[1.45] text-marca-tinta">
              No se han podido leer los datos, así que no se ha calculado nada. Si es la primera vez, falta ejecutar{" "}
              <code>supabase/gestion-vista-partes-clase.sql</code> en Gestión.
            </p>
          )}
          {datos.filas !== null && !datos.conTabla && (
            <p className="mt-3 rounded-[12px] border border-marca-borde bg-white px-4 py-3 text-[13px] leading-[1.45] text-marca-tinta">
              Esto es el cálculo de hoy, sin guardar: falta ejecutar <code>supabase/lms-garantia.sql</code> en la base del LMS.
              Hasta entonces no hay historial, ni avisos, ni correcciones.
            </p>
          )}

          {/* ------------------------- LOS FILTROS ------------------------- */}
          <section className="mt-4 rounded-[16px] border border-marca-borde bg-white px-4 py-3 lg:mt-6 lg:p-[22px]">
            <form method="get" className="grid gap-2 lg:grid-cols-[200px_220px_minmax(0,1fr)_auto]">
              <label htmlFor="estado" className="sr-only">
                Estado
              </label>
              <select
                id="estado"
                name="estado"
                defaultValue={estado}
                className="h-11 w-full rounded-full border border-marca-borde bg-white px-4 text-marca-tinta outline-none focus:border-marca-verde lg:h-[38px] lg:text-[13.5px]"
              >
                <option value="">Todos los estados</option>
                {(Object.keys(ETIQUETA_ESTADO) as Estado[]).map((e) => (
                  <option key={e} value={e}>
                    {ETIQUETA_ESTADO[e]}
                  </option>
                ))}
              </select>
              <label htmlFor="profesor" className="sr-only">
                Profesor
              </label>
              <select
                id="profesor"
                name="profesor"
                defaultValue={profesor}
                className="h-11 w-full rounded-full border border-marca-borde bg-white px-4 text-marca-tinta outline-none focus:border-marca-verde lg:h-[38px] lg:text-[13.5px]"
              >
                <option value="">Todos los profesores</option>
                {profesores.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
              <label htmlFor="q" className="sr-only">
                Buscar alumno por nombre
              </label>
              <input
                id="q"
                name="q"
                type="search"
                defaultValue={busqueda}
                placeholder="Buscar alumno…"
                className="h-11 w-full rounded-full border border-marca-borde bg-white px-4 text-marca-tinta outline-none placeholder:text-marca-grisTenue focus:border-marca-verde lg:h-[38px] lg:text-[13.5px]"
              />
              <button type="submit" className="btn-verde h-11 rounded-full px-6 text-[14.5px] font-bold lg:h-[38px]">
                Filtrar
              </button>
            </form>

            <p className="mt-3 text-[12.5px] tabular-nums text-marca-gris">
              {cuenta.en_curso} en curso · {cuenta.perdida} {cuenta.perdida === 1 ? "perdida" : "perdidas"} · {cuenta.cumplida}{" "}
              {cuenta.cumplida === 1 ? "cumplida" : "cumplidas"} · {cuenta.sin_datos} sin datos suficientes
            </p>
          </section>
        </div>

        {elegido && !detalle && (
          <p className="mt-4 rounded-[16px] border border-marca-borde bg-white px-4 py-8 text-center text-[13.5px] text-marca-grisSuave">
            No se ha podido calcular la garantía de ese alumno.{" "}
            <Link href={href({ alumno: null })} className="font-semibold text-marca-verdeOsc">
              Volver a la lista
            </Link>
          </p>
        )}

        {detalle && (
          <div className="lg:mt-6">
            <DetalleGarantiaAlumno
              detalle={detalle}
              inicio={detalle.fila.inicio}
              entradas={entradas}
              hrefVolver={href({ alumno: null })}
              hecho={hecho}
              error={error}
              conTabla={datos.conTabla}
            />
          </div>
        )}

        {datos.filas !== null && (
          <div className={`mt-4 lg:mt-6 ${detalle ? "hidden lg:block" : ""}`}>
            <ListaGarantia filas={visibles} elegido={elegido} hrefAlumno={(id) => href({ alumno: id })} />
          </div>
        )}
      </main>
    </MarcoApp>
  );
}
