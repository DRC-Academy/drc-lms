import Link from "next/link";
import { esCuentaDeEquipo, type DatosEntradas, type UsoDelBoton } from "@/lib/entradas-clase-servidor";
import { mesVecino, resumirEntradas, type FilaEntrada } from "@/lib/entradas-clase";
import MarcoApp from "@/components/Navegacion";
import Chevron from "@/components/admin/Chevron";
import TarjetaUsoDelBoton from "@/components/admin/UsoDelBoton";
import { DetalleEntradas, FaltasConClic, ListaEntradas, nombreDelMes, type FilaResumen } from "@/components/admin/EntradasClase";

/**
 * La pantalla de «Entradas a clase», con los datos ya leídos. La carga y
 * el guard están en `app/entradas/page.tsx`; separada para poder verla
 * con datos inventados sin sesión ni base.
 */
export default function PantallaEntradas({
  datos,
  uso,
  mes,
  mesActual,
  profesor,
  busqueda,
  elegido,
}: {
  datos: DatosEntradas;
  /** El porcentaje del mes (`usoDelBoton`), sin filtros. */
  uso: UsoDelBoton;
  /** "2026-10" */
  mes: string;
  mesActual: string;
  profesor: string;
  busqueda: string;
  /** El alumno con el detalle abierto, o null. */
  elegido: string | null;
}) {
  const porAlumno = new Map<string, FilaEntrada[]>();
  for (const f of datos.filas ?? []) {
    const lista = porAlumno.get(f.alumno_id) ?? [];
    lista.push(f);
    porAlumno.set(f.alumno_id, lista);
  }

  // El porcentaje de cada uno y sus clases con clic que figuran como
  // falta sin aviso, del mismo `medirBoton` que el resumen.
  const medida = uso.estado === "ok" ? uso.medida : null;
  const extra = (alumnoId: string): Pick<FilaResumen, "boton" | "faltas"> => ({
    boton: medida ? medida.porAlumno[alumnoId] ?? { clases: 0, conEntrada: 0 } : null,
    faltas: (medida?.faltasConClic ?? []).filter((f) => f.alumnoId === alumnoId).map((f) => `${f.fecha}T${f.hora}`),
  });

  // Todos los alumnos activos, con entradas o sin ellas; y quien pulsó y
  // ya no está en la lista de Gestión, con su id por nombre.
  const conocidos = new Set(datos.alumnos.map((a) => a.alumnoId));
  const filas: FilaResumen[] = [
    ...datos.alumnos.map((a) => ({ alumnoId: a.alumnoId, nombre: a.nombre, profesor: a.profesor })),
    ...Array.from(porAlumno.keys())
      .filter((id) => !conocidos.has(id) && !esCuentaDeEquipo(id))
      .map((id) => ({ alumnoId: id, nombre: id, profesor: "" })),
  ].map((a) => ({ ...a, resumen: resumirEntradas(porAlumno.get(a.alumnoId) ?? []), ...extra(a.alumnoId) }));
  const nombres = new Map(filas.map((f) => [f.alumnoId, f.nombre]));

  const profesores = Array.from(new Set(datos.alumnos.map((a) => a.profesor.trim()).filter(Boolean))).sort((a, b) =>
    a.localeCompare(b, "es")
  );

  const termino = busqueda.toLowerCase();
  const visibles = filas
    .filter((f) => !profesor || f.profesor.trim() === profesor)
    .filter((f) => !termino || f.nombre.toLowerCase().includes(termino))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));

  const conEntrada = visibles.filter((f) => f.resumen.clases.length > 0 || f.resumen.sueltos.length > 0).length;
  const clasesConEntrada = visibles.reduce((n, f) => n + f.resumen.clases.length, 0);

  // El detalle: el de la lista, o el de cualquiera si se pide por id
  // (la demo y la cuenta de pruebas, para probar).
  const detalle = elegido
    ? filas.find((f) => f.alumnoId === elegido) ?? {
        alumnoId: elegido,
        nombre: elegido,
        profesor: "",
        resumen: resumirEntradas(porAlumno.get(elegido) ?? []),
        ...extra(elegido),
      }
    : null;

  /** Esta pantalla con algo cambiado. */
  const href = (cambio: { mes?: string; alumno?: string | null }) => {
    const p = new URLSearchParams();
    const m = cambio.mes ?? mes;
    if (m !== mesActual) p.set("mes", m);
    if (profesor) p.set("profesor", profesor);
    if (busqueda) p.set("q", busqueda);
    const a = cambio.alumno === undefined ? elegido : cambio.alumno;
    if (a) p.set("alumno", a);
    const s = p.toString();
    return s ? `/entradas?${s}` : "/entradas";
  };

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
            Entradas a clase
          </h1>

          {/* LA NOTA: discreta, pero arriba y siempre. Desde cuándo hay
              datos y lo que no se cuenta lo dice la tarjeta del resumen. */}
          <p className="mt-2 max-w-[70ch] text-pretty text-[13px] leading-[1.5] text-marca-gris lg:text-[14px]">
            Solo cuenta las entradas desde el botón «Unirse a la clase» de la plataforma. Un alumno puede haber ido a
            clase entrando por otro enlace.
          </p>

          {datos.filas === null && (
            <p className="mt-3 rounded-[12px] border border-marca-examenBorde bg-marca-examen px-4 py-3 text-[13px] leading-[1.45] text-marca-amarilloTexto">
              No se han podido leer las entradas. No son ceros: son datos que no hemos podido leer. Si la tabla todavía
              no existe, falta ejecutar <code>supabase/lms-entradas-clase.sql</code> en la base del LMS.
            </p>
          )}

          {/* ------------------------- LOS FILTROS ------------------------- */}
          <section className="mt-4 rounded-[16px] border border-marca-borde bg-white px-4 py-3 lg:mt-6 lg:p-[22px]">
            <div className="flex items-center justify-between gap-2">
              <Link
                href={href({ mes: mesVecino(mes, -1), alumno: null })}
                className="grid h-[38px] w-[38px] place-items-center rounded-full border border-marca-borde text-marca-tinta transition-colors hover:border-marca-verde"
              >
                <Chevron direccion="izquierda" />
                <span className="sr-only">Mes anterior</span>
              </Link>
              <p className="font-display text-[18px] font-bold text-marca-tinta first-letter:uppercase lg:text-[20px]">{nombreDelMes(mes)}</p>
              {mes < mesActual ? (
                <Link
                  href={href({ mes: mesVecino(mes, 1), alumno: null })}
                  className="grid h-[38px] w-[38px] place-items-center rounded-full border border-marca-borde text-marca-tinta transition-colors hover:border-marca-verde"
                >
                  <Chevron />
                  <span className="sr-only">Mes siguiente</span>
                </Link>
              ) : (
                <span className="h-[38px] w-[38px]" />
              )}
            </div>

            {/* Formulario normal: filtra el servidor. 16px de letra en
                móvil para que iOS no haga zoom al enfocar. */}
            <form method="get" className="mt-3 grid gap-2 lg:grid-cols-[220px_minmax(0,1fr)_auto]">
              {mes !== mesActual && <input type="hidden" name="mes" value={mes} />}
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
              {conEntrada} de {visibles.length} {visibles.length === 1 ? "alumno entró" : "alumnos entraron"} por la
              plataforma · {clasesConEntrada} {clasesConEntrada === 1 ? "clase" : "clases"} con entrada
            </p>
          </section>

          {/* EL RESUMEN: el mes entero, sin los filtros de arriba. Es la
              misma cuenta que la tarjeta del panel. */}
          <div className="mt-4 lg:mt-6">
            <TarjetaUsoDelBoton uso={uso} contexto={`${nombreDelMes(mes)} · todos los alumnos`} hrefFaltas="#faltas" />
          </div>

          {medida && medida.faltasConClic.length > 0 && (
            <div className="mt-4 lg:mt-6">
              <FaltasConClic faltas={medida.faltasConClic} nombres={nombres} hrefAlumno={(id) => href({ alumno: id })} />
            </div>
          )}
        </div>

        {detalle && (
          <div className="lg:mt-6">
            <DetalleEntradas fila={detalle} hrefVolver={href({ alumno: null })} />
          </div>
        )}

        <div className={`mt-4 lg:mt-6 ${detalle ? "hidden lg:block" : ""}`}>
          <ListaEntradas filas={visibles} elegido={elegido} hrefAlumno={(id) => href({ alumno: id })} />
        </div>
      </main>
    </MarcoApp>
  );
}
