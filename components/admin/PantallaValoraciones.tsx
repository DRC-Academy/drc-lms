import Link from "next/link";
import MarcoApp from "@/components/Navegacion";
import Chevron from "@/components/admin/Chevron";
import { EstrellasFijas } from "@/components/valoraciones/Estrellas";
import { diaLocal } from "@/lib/fechas";
import { resumirValoraciones, type FilaValoracion } from "@/lib/valoraciones";
import type { DatosPanelValoraciones } from "@/lib/valoraciones-servidor";

// ---------------------------------------------------------------
// LA PANTALLA DE «VALORACIONES DE CLASE»
//
// Con los datos ya leídos (`cargarPanelValoraciones`); el guard y la
// carga, en `app/valoraciones/page.tsx`.
//
// EL RESUMEN DE ARRIBA va con el rango de fechas pero sin los filtros de
// profesor ni de estrellas: filtrar por «≤ 2» y ver la media de esas no
// le dice nada a nadie. La lista lleva todos los filtros.
// ---------------------------------------------------------------

export type FiltrosValoraciones = {
  profesor: string;
  /** Días de España, "AAAA-MM-DD", incluidos. Vacío: sin límite. */
  desde: string;
  hasta: string;
  /** "" todas, "bajas" (≤ 2) o "1"…"5". */
  estrellas: string;
  equipo: boolean;
};

const DIA = /^\d{4}-\d{2}-\d{2}$/;

export function leerFiltros(p: { profesor?: string; desde?: string; hasta?: string; estrellas?: string; equipo?: string }): FiltrosValoraciones {
  const texto = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const estrellas = texto(p.estrellas);
  return {
    profesor: texto(p.profesor),
    desde: DIA.test(texto(p.desde)) ? texto(p.desde) : "",
    hasta: DIA.test(texto(p.hasta)) ? texto(p.hasta) : "",
    estrellas: estrellas === "bajas" || /^[1-5]$/.test(estrellas) ? estrellas : "",
    equipo: texto(p.equipo) === "1",
  };
}

const FORMATO_FECHA = new Intl.DateTimeFormat("es-ES", {
  timeZone: "Europe/Madrid",
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

function media(n: number): string {
  return n.toLocaleString("es-ES", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

const CAMPO =
  "h-11 w-full rounded-full border border-marca-borde bg-white px-4 text-marca-tinta outline-none focus:border-marca-verde lg:h-[38px] lg:text-[13.5px]";

export default function PantallaValoraciones({ datos, filtros }: { datos: DatosPanelValoraciones; filtros: FiltrosValoraciones }) {
  const cuentan = (datos.filas ?? []).filter((f) => filtros.equipo || !datos.excluidas.has(f.alumno_id));
  const dia = (f: FilaValoracion) => diaLocal(new Date(f.fecha_clase));
  const enRango = cuentan.filter((f) => (!filtros.desde || dia(f) >= filtros.desde) && (!filtros.hasta || dia(f) <= filtros.hasta));
  const resumen = resumirValoraciones(enRango);

  const lista = enRango
    .filter((f) => f.estrellas !== null)
    .filter((f) => !filtros.profesor || (f.profesor_id ?? "") === filtros.profesor)
    .filter((f) =>
      filtros.estrellas === "" ? true : filtros.estrellas === "bajas" ? f.estrellas! <= 2 : f.estrellas === Number(filtros.estrellas)
    );

  const profesores = new Map<string, string>();
  for (const f of cuentan) if (f.profesor_id) profesores.set(f.profesor_id, f.profesor_nombre ?? f.profesor_id);
  const opcionesProfesor = Array.from(profesores).sort((a, b) => a[1].localeCompare(b[1], "es"));

  const tasa = resumen.popupsMostrados > 0 ? Math.round((resumen.popupsRespondidos / resumen.popupsMostrados) * 100) : null;
  const filtrando = filtros.profesor || filtros.desde || filtros.hasta || filtros.estrellas;

  return (
    <MarcoApp datos={{ alumnoId: "", nombre: "", miCurso: null, foco: null, revisando: false }}>
      <main className="mx-auto w-full max-w-[1240px] px-5 pb-16 lg:px-10 lg:pb-20 lg:pt-9">
        <div className="pt-4 lg:pt-0">
          <Link href="/" className="-ml-1 inline-flex min-h-[44px] items-center gap-1 px-1 text-[13.5px] font-semibold text-marca-verdeOsc lg:min-h-0">
            <Chevron direccion="izquierda" />
            Panel
          </Link>
          <p className="mt-1 hidden text-[10.5px] font-semibold uppercase leading-none tracking-[0.12em] text-marca-verdeOsc lg:mt-3 lg:block lg:text-[11.5px]">
            DRC Academy · equipo
          </p>
          <h1 className="font-display text-[21px] font-bold leading-[1.1] tracking-[-0.02em] text-marca-tinta lg:mt-2.5 lg:text-[38px] lg:leading-[1.08]">
            Valoraciones de clase
          </h1>
          <p className="mt-2 max-w-[70ch] text-pretty text-[13px] leading-[1.5] text-marca-gris lg:text-[14px]">
            Las estrellas que dejan los alumnos en «Mis clases» o en el aviso que les sale al entrar tras una clase.
            {!filtros.equipo && " Sin las cuentas del equipo."}
          </p>

          {datos.filas === null && (
            <p className="mt-3 rounded-[12px] border border-marca-examenBorde bg-marca-examen px-4 py-3 text-[13px] leading-[1.45] text-marca-amarilloTexto">
              No se han podido leer las valoraciones. No son ceros: son datos que no hemos podido leer. Si la tabla
              todavía no existe, falta ejecutar <code>supabase/lms-valoraciones-clase.sql</code> en la base del LMS.
            </p>
          )}

          {/* ------------------------- EL RESUMEN ------------------------- */}
          <section aria-label="Resumen" className="mt-4 grid gap-3 sm:grid-cols-3 lg:mt-6">
            <Cifra rotulo="Valoraciones" valor={String(resumen.valoraciones)} />
            <Cifra rotulo="Media" valor={resumen.media === null ? "—" : `${media(resumen.media)} / 5`} />
            <Cifra
              rotulo="Respuesta al aviso"
              valor={tasa === null ? "—" : `${tasa} %`}
              nota={`${resumen.popupsRespondidos} de ${resumen.popupsMostrados} ${resumen.popupsMostrados === 1 ? "aviso mostrado" : "avisos mostrados"}, contando los cerrados sin valorar`}
            />
          </section>

          {resumen.porProfesor.length > 0 && (
            <section aria-labelledby="titulo-por-profesor" className="mt-3 rounded-[16px] border border-marca-borde bg-white px-4 py-3 lg:px-[22px] lg:py-4">
              <h2 id="titulo-por-profesor" className="text-[13px] font-semibold uppercase tracking-[0.08em] text-marca-gris">
                Media por profesor
              </h2>
              <ul className="mt-2 divide-y divide-marca-nieblaOscura">
                {resumen.porProfesor.map((p) => (
                  <li key={p.profesorId} className="flex items-center justify-between gap-3 py-2.5 text-[14.5px]">
                    <span className="min-w-0 truncate font-semibold text-marca-tinta">{p.nombre}</span>
                    <span className="flex shrink-0 items-center gap-3 tabular-nums text-marca-tintaMedia">
                      <EstrellasFijas valor={Math.round(p.media)} etiqueta={`${media(p.media)} de 5`} tam={15} />
                      <span className="w-[34px] text-right font-semibold text-marca-tinta">{media(p.media)}</span>
                      <span className="w-[86px] text-right text-[13px] text-marca-gris">
                        {p.valoraciones} {p.valoraciones === 1 ? "valoración" : "valoraciones"}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* ------------------------- LOS FILTROS ------------------------- */}
          <form method="get" className="mt-4 grid gap-2 rounded-[16px] border border-marca-borde bg-white px-4 py-3 lg:mt-6 lg:grid-cols-[minmax(0,1fr)_170px_170px_170px_auto] lg:p-[22px]">
            {filtros.equipo && <input type="hidden" name="equipo" value="1" />}
            <label className="flex flex-col gap-1 text-[12.5px] font-semibold text-marca-gris">
              Profesor
              <select name="profesor" defaultValue={filtros.profesor} className={CAMPO}>
                <option value="">Todos</option>
                {opcionesProfesor.map(([id, nombre]) => (
                  <option key={id} value={id}>
                    {nombre}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-[12.5px] font-semibold text-marca-gris">
              Desde
              <input type="date" name="desde" defaultValue={filtros.desde} className={CAMPO} />
            </label>
            <label className="flex flex-col gap-1 text-[12.5px] font-semibold text-marca-gris">
              Hasta
              <input type="date" name="hasta" defaultValue={filtros.hasta} className={CAMPO} />
            </label>
            <label className="flex flex-col gap-1 text-[12.5px] font-semibold text-marca-gris">
              Estrellas
              <select name="estrellas" defaultValue={filtros.estrellas} className={CAMPO}>
                <option value="">Todas</option>
                <option value="bajas">2 o menos</option>
                {[5, 4, 3, 2, 1].map((n) => (
                  <option key={n} value={n}>
                    {n} {n === 1 ? "estrella" : "estrellas"}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex items-end gap-2">
              <button type="submit" className="btn-verde h-11 flex-1 rounded-full px-6 text-[14.5px] font-bold lg:h-[38px]">
                Filtrar
              </button>
              {filtrando && (
                <Link href={filtros.equipo ? "/valoraciones?equipo=1" : "/valoraciones"} className="inline-flex h-11 items-center px-2 text-[13.5px] font-semibold text-marca-verdeOsc lg:h-[38px]">
                  Quitar
                </Link>
              )}
            </div>
          </form>

          {/* ------------------------- LA LISTA ------------------------- */}
          <section aria-labelledby="titulo-lista" className="mt-4 lg:mt-6">
            <h2 id="titulo-lista" className="sr-only">
              Valoraciones
            </h2>
            {lista.length === 0 ? (
              <p className="rounded-[16px] border border-marca-borde bg-white px-5 py-5 text-[14.5px] text-marca-gris">
                {datos.filas === null ? "Sin datos." : filtrando ? "Ninguna valoración con estos filtros." : "Todavía no hay valoraciones."}
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {lista.map((f) => (
                  <li key={`${f.alumno_id}|${f.clase_id}`} className="rounded-[16px] border border-marca-borde bg-white px-4 py-3 lg:grid lg:grid-cols-[170px_minmax(0,1fr)_150px_110px] lg:items-start lg:gap-4 lg:px-[22px]">
                    <p className="text-[13px] tabular-nums text-marca-gris first-letter:uppercase lg:pt-0.5">{FORMATO_FECHA.format(new Date(f.fecha_clase))}</p>
                    <div className="min-w-0">
                      <p className="truncate text-[15px] font-semibold text-marca-tinta">{datos.nombres.get(f.alumno_id) ?? f.alumno_id}</p>
                      {f.comentario ? (
                        <p className="mt-1 whitespace-pre-line text-pretty text-[14.5px] leading-[1.45] text-marca-tintaMedia">{f.comentario}</p>
                      ) : (
                        <p className="mt-1 text-[13px] text-marca-grisSuave">Sin comentario</p>
                      )}
                    </div>
                    <p className="mt-2 text-[14px] text-marca-tintaMedia lg:mt-0 lg:pt-0.5">{f.profesor_nombre ?? "—"}</p>
                    <div className="mt-1 lg:mt-0 lg:pt-0.5">
                      <EstrellasFijas valor={f.estrellas!} etiqueta={`${f.estrellas} de 5`} tam={16} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </main>
    </MarcoApp>
  );
}

function Cifra({ rotulo, valor, nota }: { rotulo: string; valor: string; nota?: string }) {
  return (
    <div className="rounded-[16px] border border-marca-borde bg-white px-4 py-3 lg:px-[22px] lg:py-4">
      <p className="text-[13px] font-semibold text-marca-gris">{rotulo}</p>
      <p className="mt-1 font-display text-[28px] font-bold leading-none tabular-nums text-marca-tinta">{valor}</p>
      {nota && <p className="mt-1.5 text-[12.5px] leading-[1.4] text-marca-gris">{nota}</p>}
    </div>
  );
}
