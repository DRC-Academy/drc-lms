import Link from "next/link";
import { ETIQUETA_ORIGEN, comoOrigen, type ResumenEntradas } from "@/lib/entradas-clase";
import Chevron from "@/components/admin/Chevron";

// ---------------------------------------------------------------
// «ENTRADAS A CLASE»: LA LISTA Y EL DETALLE
//
// Las mismas filas que la lista del panel (`ListaPanel`): la tarjeta, la
// raya entre filas, el hover, la cabecera de columnas solo en escritorio
// y, en móvil, una segunda línea en vez de columnas. El detalle de un
// alumno ocupa la pantalla en móvil, con la barra de vuelta de la lista.
//
// TODAS LAS HORAS SON DE ESPAÑA, se vea desde donde se vea.
// ---------------------------------------------------------------

export type FilaResumen = {
  alumnoId: string;
  nombre: string;
  /** El de la ficha: es por el que se filtra. */
  profesor: string;
  resumen: ResumenEntradas;
  /**
   * Las clases que tuvo en el mes, para el porcentaje. NULL HASTA QUE
   * EXISTA la vista de partes en Gestión (ver `app/entradas/page.tsx`):
   * mientras lo sea, la columna no sale.
   */
  programadas: number | null;
};

const MADRID = "Europe/Madrid";

const FORMATO_FECHA_LARGA = new Intl.DateTimeFormat("es-ES", { timeZone: MADRID, day: "numeric", month: "long", year: "numeric" });
const FORMATO_DIA = new Intl.DateTimeFormat("es-ES", { timeZone: MADRID, weekday: "short", day: "numeric", month: "short" });
const FORMATO_HORA = new Intl.DateTimeFormat("es-ES", { timeZone: MADRID, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

/** "12 de octubre de 2026" */
export function fechaLarga(iso: string): string {
  return FORMATO_FECHA_LARGA.format(new Date(iso));
}

/** "octubre de 2026". El día 15 a mediodía UTC es ese mes en cualquier zona. */
export function nombreDelMes(mes: string): string {
  return new Intl.DateTimeFormat("es-ES", { timeZone: "UTC", month: "long", year: "numeric" }).format(new Date(`${mes}-15T12:00:00Z`));
}

const dia = (iso: string) => FORMATO_DIA.format(new Date(iso));
const hora = (iso: string) => FORMATO_HORA.format(new Date(iso));

/** "12 oct, 17:03" */
function momento(iso: string): string {
  return `${dia(iso)}, ${hora(iso)}`;
}

/** "10 min antes" · "a la hora" · "5 min después". */
function respectoAlInicio(minutos: number | null): string {
  if (minutos === null) return "";
  if (minutos === 0) return "a la hora";
  return minutos < 0 ? `${-minutos} min antes` : `${minutos} min después`;
}

const ROTULO = "text-[10.5px] font-semibold uppercase leading-none tracking-[0.1em] text-marca-grisSuave";

export function ListaEntradas({
  filas,
  elegido,
  hrefAlumno,
}: {
  filas: FilaResumen[];
  elegido: string | null;
  hrefAlumno: (id: string) => string;
}) {
  const conPorcentaje = filas.some((f) => f.programadas !== null);
  const columnas = conPorcentaje
    ? "grid-cols-[1fr_auto] lg:grid-cols-[minmax(0,1fr)_170px_130px_90px_150px_auto]"
    : "grid-cols-[1fr_auto] lg:grid-cols-[minmax(0,1fr)_170px_150px_150px_auto]";

  if (filas.length === 0) {
    return (
      <p className="rounded-[16px] border border-marca-borde bg-white px-4 py-8 text-center text-[13.5px] text-marca-grisSuave">
        Nadie responde a estos filtros.
      </p>
    );
  }

  return (
    <section className="overflow-hidden rounded-[16px] border border-marca-borde bg-white" aria-label="Entradas por alumno">
      <div className={`hidden gap-3.5 border-b border-marca-borde bg-marca-casiBlanco px-3.5 py-2.5 lg:grid ${columnas}`}>
        <span className={ROTULO}>Alumno</span>
        <span className={ROTULO}>Profesor</span>
        <span className={`${ROTULO} text-right`}>Clases con entrada</span>
        {conPorcentaje && <span className={`${ROTULO} text-right`}>%</span>}
        <span className={`${ROTULO} text-right`}>Última entrada</span>
        <span />
      </div>

      <ul>
        {filas.map((f) => {
          const n = f.resumen.clases.length;
          const porcentaje = f.programadas ? Math.round((n / f.programadas) * 100) : null;
          return (
            <li key={f.alumnoId} className="border-b border-marca-nieblaOscura last:border-b-0">
              <Link
                href={hrefAlumno(f.alumnoId)}
                aria-current={f.alumnoId === elegido ? "true" : undefined}
                className={`grid items-center gap-x-3.5 py-2.5 pl-4 pr-3.5 transition-colors hover:bg-marca-niebla lg:pl-3.5 ${columnas} ${
                  f.alumnoId === elegido ? "bg-marca-verdeFondo" : ""
                }`}
              >
                <span className="min-w-0">
                  <span className="block text-pretty text-[14px] font-semibold leading-[1.3] text-marca-tinta lg:truncate lg:leading-normal">
                    {f.nombre || "Sin nombre"}
                  </span>
                  {/* En móvil, lo de las columnas en una segunda línea. */}
                  <span className="mt-0.5 block truncate text-[12.5px] tabular-nums text-marca-grisSuave lg:hidden">
                    {n === 0 ? "sin entradas" : `${n} ${n === 1 ? "clase" : "clases"} con entrada`}
                    {porcentaje !== null ? ` · ${porcentaje}%` : ""}
                    {f.resumen.ultima ? ` · ${momento(f.resumen.ultima)}` : ""}
                    {f.profesor ? ` · ${f.profesor}` : ""}
                  </span>
                </span>
                <span className="hidden truncate text-[13px] text-marca-gris lg:block">{f.profesor || "—"}</span>
                <span className={`hidden text-right text-[13px] tabular-nums lg:block ${n === 0 ? "text-marca-grisTenue" : "font-semibold text-marca-tinta"}`}>
                  {f.programadas !== null ? `${n} de ${f.programadas}` : n}
                </span>
                {conPorcentaje && (
                  <span className="hidden text-right text-[13px] tabular-nums text-marca-gris lg:block">
                    {porcentaje !== null ? `${porcentaje}%` : "—"}
                  </span>
                )}
                <span className="hidden text-right text-[13px] tabular-nums text-marca-gris lg:block">
                  {f.resumen.ultima ? momento(f.resumen.ultima) : "—"}
                </span>
                <span aria-hidden className="text-marca-grisTenue">
                  <Chevron />
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function DetalleEntradas({ fila, hrefVolver }: { fila: FilaResumen; hrefVolver: string }) {
  const { clases, sueltos } = fila.resumen;

  return (
    <section aria-labelledby="titulo-detalle" className="lg:overflow-hidden lg:rounded-[16px] lg:border lg:border-marca-borde lg:bg-white">
      {/* La barra de vuelta, solo móvil: la de `ListaPanel`. */}
      <div className="sticky top-[60px] z-20 -mx-5 border-b border-marca-borde bg-white/[0.96] backdrop-blur-md sm:top-[68px] lg:hidden">
        <Link href={hrefVolver} className="grid min-h-[54px] grid-cols-[24px_minmax(0,1fr)] items-center gap-x-1.5 py-2 pl-3 pr-5">
          <Chevron direccion="izquierda" className="justify-self-center text-marca-verdeOsc" />
          <span className="min-w-0">
            <span className="block truncate font-display text-[16px] font-bold leading-[1.15] text-marca-tinta">{fila.nombre}</span>
            <span className="mt-0.5 block text-[12px] tabular-nums text-marca-gris">
              {clases.length} {clases.length === 1 ? "clase" : "clases"} con entrada por la plataforma
            </span>
          </span>
          <span className="sr-only">Volver a la lista</span>
        </Link>
      </div>

      <div className="hidden items-baseline justify-between gap-3 border-b border-marca-borde bg-marca-casiBlanco px-[18px] py-4 lg:flex">
        <div className="flex min-w-0 items-baseline gap-3">
          <h2 id="titulo-detalle" className="truncate font-display text-[19px] font-bold leading-none text-marca-tinta">
            {fila.nombre}
          </h2>
          <span className="text-[13.5px] tabular-nums text-marca-gris">
            {clases.length} {clases.length === 1 ? "clase" : "clases"} con entrada por la plataforma
          </span>
        </div>
        <Link href={hrefVolver} className="text-[13px] font-semibold text-marca-verdeOsc hover:text-marca-tinta">
          Cerrar
        </Link>
      </div>

      {clases.length === 0 && sueltos.length === 0 ? (
        <p className="mt-3 rounded-[16px] border border-marca-borde bg-white px-4 py-8 text-center text-[13.5px] text-marca-grisSuave lg:mt-0 lg:rounded-none lg:border-0">
          Este mes no ha entrado a ninguna clase desde el botón de la plataforma.
        </p>
      ) : (
        <div className="mt-3 overflow-hidden rounded-[16px] border border-marca-borde bg-white lg:mt-0 lg:rounded-none lg:border-0">
          {clases.length > 0 && (
            <>
              <div className="hidden grid-cols-[150px_minmax(0,1fr)_200px_130px] gap-3.5 border-b border-marca-borde px-3.5 py-2 lg:grid">
                <span className={ROTULO}>Clase</span>
                <span className={ROTULO}>Profesor</span>
                <span className={ROTULO}>Entró</span>
                <span className={ROTULO}>Desde</span>
              </div>
              <ul>
                {clases.map((c) => (
                  <li
                    key={c.claseId}
                    className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-3.5 border-b border-marca-nieblaOscura py-2.5 pl-4 pr-3.5 last:border-b-0 lg:grid-cols-[150px_minmax(0,1fr)_200px_130px] lg:pl-3.5"
                  >
                    <span className="min-w-0">
                      <span className="block text-[14px] font-semibold text-marca-tinta first-letter:uppercase">
                        {dia(c.inicio)}, {hora(c.inicio)}
                      </span>
                      <span className="mt-0.5 block truncate text-[12.5px] text-marca-grisSuave lg:hidden">
                        {c.profesor ?? "—"} · {ETIQUETA_ORIGEN[c.origen]}
                      </span>
                    </span>
                    <span className="hidden truncate text-[13px] text-marca-gris lg:block">{c.profesor ?? "—"}</span>
                    <span className="text-right text-[13px] tabular-nums text-marca-tinta lg:text-left">
                      <span className="inline-flex items-center gap-1.5">
                        <MarcaEntro />
                        {hora(c.primera)}
                      </span>
                      <span className="block text-[12px] text-marca-grisSuave lg:ml-1.5 lg:inline">
                        {respectoAlInicio(c.minutos)}
                        {c.clics > 1 ? ` · ${c.clics} clics` : ""}
                      </span>
                    </span>
                    <span className="hidden text-[13px] text-marca-gris lg:block">{ETIQUETA_ORIGEN[c.origen]}</span>
                  </li>
                ))}
              </ul>
            </>
          )}

          {sueltos.length > 0 && (
            <div className={clases.length > 0 ? "border-t border-marca-borde" : ""}>
              <p className="px-4 pb-1 pt-3 text-[12.5px] leading-[1.4] text-marca-gris lg:px-3.5">
                Pulsó fuera de la ventana de sus clases (de 30 min antes del inicio al final), así que no cuenta para ninguna:
              </p>
              <ul>
                {sueltos.map((s, i) => (
                  <li key={`${s.clicked_at}-${i}`} className="flex justify-between gap-3 px-4 py-2 text-[13px] tabular-nums text-marca-gris lg:px-3.5">
                    <span className="first-letter:uppercase">{momento(s.clicked_at)}</span>
                    <span>{ETIQUETA_ORIGEN[comoOrigen(s.origen)]}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

/** El check verde de «entró». SVG en línea: sin librería de iconos. */
function MarcaEntro() {
  return (
    <svg aria-hidden viewBox="0 0 16 16" className="h-3.5 w-3.5 shrink-0 text-marca-verde" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3.5 8.5l3 3 6-7" />
    </svg>
  );
}
