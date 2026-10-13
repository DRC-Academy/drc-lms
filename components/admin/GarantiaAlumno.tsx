import Link from "next/link";
import Chevron from "@/components/admin/Chevron";
import { corregirGarantia, quitarCorreccionGarantia } from "@/app/acciones-garantia";
import {
  ETIQUETA_CLASE,
  ETIQUETA_ESTADO,
  ETIQUETA_SEMANA,
  diaLegible,
  type ClaseEvaluada,
  type Estado,
  type Evidencia,
  type ResultadoClase,
  type SemanaEvaluada,
} from "@/lib/garantia";
import { diaLocal, sumarDias } from "@/lib/fechas";
import type { DetalleGarantia, FilaGarantia } from "@/lib/garantia-servidor";
import type { ResumenEntradas } from "@/lib/entradas-clase";

// ---------------------------------------------------------------
// «GARANTÍA»: LA LISTA Y EL DETALLE
//
// Las mismas filas que «Entradas a clase» (`EntradasClase.tsx`), que a su
// vez son las del panel: la tarjeta, la raya entre filas, la cabecera de
// columnas solo en escritorio y, en móvil, segunda línea en vez de
// columnas. El detalle ocupa la pantalla en móvil, con la barra de
// vuelta de la lista.
//
// LA CHAPA: verde para «En curso» y «Cumplida», tinta para «Perdida»,
// borde gris para «Sin datos». Es la `Etiqueta` de `GestorAccesos`. El
// amarillo no sale en ningún sitio de esta pantalla.
//
// Todas las fechas son de España.
// ---------------------------------------------------------------

const ROTULO = "text-[10.5px] font-semibold uppercase leading-none tracking-[0.1em] text-marca-grisSuave";

export function Chapa({ estado }: { estado: Estado }) {
  const tono =
    estado === "perdida"
      ? "bg-marca-tinta text-white"
      : estado === "sin_datos"
        ? "border border-marca-borde bg-white text-marca-gris"
        : "bg-marca-verde text-white";
  return (
    <span className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] ${tono}`}>
      {ETIQUETA_ESTADO[estado]}
    </span>
  );
}

export function ListaGarantia({
  filas,
  elegido,
  hrefAlumno,
}: {
  filas: FilaGarantia[];
  elegido: string | null;
  hrefAlumno: (id: string) => string;
}) {
  const columnas = "grid-cols-[1fr_auto] lg:grid-cols-[minmax(0,1fr)_220px_110px_150px_auto]";

  if (filas.length === 0) {
    return (
      <p className="rounded-[16px] border border-marca-borde bg-white px-4 py-8 text-center text-[13.5px] text-marca-grisSuave">
        Nadie responde a estos filtros.
      </p>
    );
  }

  return (
    <section className="overflow-hidden rounded-[16px] border border-marca-borde bg-white" aria-label="Garantía por alumno">
      <div className={`hidden gap-3.5 border-b border-marca-borde bg-marca-casiBlanco px-3.5 py-2.5 lg:grid ${columnas}`}>
        <span className={ROTULO}>Alumno y motivo</span>
        <span className={ROTULO}>Plan</span>
        <span className={ROTULO}>Fin</span>
        <span className={ROTULO}>Estado</span>
        <span />
      </div>

      <ul>
        {filas.map((f) => (
          <li key={f.alumnoId} className="border-b border-marca-nieblaOscura last:border-b-0">
            <Link
              href={hrefAlumno(f.alumnoId)}
              aria-current={f.alumnoId === elegido ? "true" : undefined}
              className={`grid items-start gap-x-3.5 py-2.5 pl-4 pr-3.5 transition-colors hover:bg-marca-niebla lg:items-center lg:pl-3.5 ${columnas} ${
                f.alumnoId === elegido ? "bg-marca-verdeFondo" : ""
              }`}
            >
              <span className="min-w-0">
                <span className="flex items-baseline justify-between gap-2">
                  <span className="min-w-0 text-pretty text-[14px] font-semibold leading-[1.3] text-marca-tinta lg:truncate lg:leading-normal">
                    {f.nombre || "Sin nombre"}
                  </span>
                  {/* En móvil, la chapa junto al nombre. */}
                  <span className="shrink-0 lg:hidden">
                    <Chapa estado={f.estado} />
                  </span>
                </span>
                <span className="mt-0.5 block text-pretty text-[12.5px] leading-[1.4] text-marca-gris lg:truncate">
                  {f.corregido ? "Corregido a mano · " : ""}
                  {f.motivo}
                </span>
                <span className="mt-0.5 block truncate text-[12px] tabular-nums text-marca-grisSuave lg:hidden">
                  {f.plan || "Sin plan"}
                  {f.fin ? ` · termina el ${diaLegible(f.fin)}` : " · sin fecha de fin"}
                </span>
              </span>
              <span className="hidden truncate text-[13px] text-marca-gris lg:block">
                {f.plan || "—"}
                {f.intensivo && <span className="ml-1 text-marca-grisSuave">(intensivo)</span>}
              </span>
              <span className="hidden text-[13px] tabular-nums text-marca-gris lg:block">{f.fin ? diaLegible(f.fin) : "—"}</span>
              <span className="hidden lg:block">
                <Chapa estado={f.estado} />
              </span>
              <span aria-hidden className="self-center text-marca-grisTenue">
                <Chevron />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

// ---------------------------------------------------------------
// EL DETALLE
// ---------------------------------------------------------------

/** Lo que pierde la garantía va en tinta y negrita; lo que la cumple, en verde. */
function tonoClase(r: ResultadoClase): string {
  if (r === "no_asistida" || r === "cancelada_tarde") return "font-semibold text-marca-tinta";
  if (r === "asistida" || r === "cancelada_a_tiempo" || r === "cambiada_de_dia") return "text-marca-verdeOsc";
  return "text-marca-gris";
}

function FilaClase({ c }: { c: ClaseEvaluada }) {
  return (
    <li className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-3 border-b border-marca-nieblaOscura py-2 last:border-b-0">
      <span className="min-w-0">
        <span className="block text-[13.5px] text-marca-tinta tabular-nums">
          {diaLegible(c.fecha)}
          {c.hora ? `, ${c.hora}` : ""}
          {c.profesor ? <span className="text-marca-grisSuave"> · {c.profesor}</span> : null}
        </span>
        <span className="mt-0.5 block text-pretty text-[12px] leading-[1.4] text-marca-grisSuave">{c.nota}</span>
      </span>
      <span className={`text-right text-[12.5px] ${tonoClase(c.resultado)}`}>{ETIQUETA_CLASE[c.resultado]}</span>
    </li>
  );
}

function ContenidoSemana({ s }: { s: SemanaEvaluada }) {
  const hechas = s.lecciones.filter((l) => l.resultado === "a_tiempo").length;
  const aMirar = s.lecciones.filter((l) => l.resultado !== "a_tiempo");
  const tono = s.resultado === "tarde" || s.resultado === "pendiente" ? "font-semibold text-marca-tinta" : s.resultado === "a_tiempo" ? "text-marca-verdeOsc" : "text-marca-gris";
  return (
    <div className="py-2">
      <p className="flex items-baseline justify-between gap-3 text-[13.5px]">
        <span className="text-marca-tinta">
          Contenido <span className="tabular-nums text-marca-grisSuave">· {hechas} de {s.lecciones.length} a tiempo · vence el {diaLegible(s.vence)}</span>
        </span>
        <span className={`text-right text-[12.5px] ${tono}`}>{ETIQUETA_SEMANA[s.resultado]}</span>
      </p>
      {aMirar.length > 0 && s.resultado !== "en_plazo" && (
        <ul className="mt-1 space-y-0.5">
          {aMirar.slice(0, 8).map((l) => (
            <li key={l.id} className="text-pretty text-[12px] leading-[1.4] text-marca-grisSuave">
              {l.resultado === "tarde" && l.completadaEn ? `Tarde (${diaLegible(diaLocal(new Date(l.completadaEn)))})` : "Sin completar"} · {l.curso}: {l.titulo}
            </li>
          ))}
          {aMirar.length > 8 && <li className="text-[12px] text-marca-grisSuave">y {aMirar.length - 8} más</li>}
        </ul>
      )}
    </div>
  );
}

type Semana = { numero: number; desde: string; clases: ClaseEvaluada[]; contenido: SemanaEvaluada | null };

/** Clases y contenido, juntos por semana del plan. La más reciente arriba. */
function porSemanas(inicio: string | null, clases: ClaseEvaluada[], semanas: SemanaEvaluada[]): Semana[] {
  if (!inicio) return [];
  const base = Date.parse(`${inicio.slice(0, 10)}T00:00:00Z`);
  const mapa = new Map<number, Semana>();
  const de = (n: number) => mapa.get(n) ?? mapa.set(n, { numero: n, desde: sumarDias(inicio.slice(0, 10), 7 * (n - 1)), clases: [], contenido: null }).get(n)!;

  for (const c of clases) {
    const n = Math.floor((Date.parse(`${c.fecha}T00:00:00Z`) - base) / (7 * 86_400_000)) + 1;
    de(Math.max(1, n)).clases.push(c);
  }
  for (const s of semanas) de(s.numero).contenido = s;

  return Array.from(mapa.values()).sort((a, b) => b.numero - a.numero);
}

function Prueba({ evidencia }: { evidencia: Evidencia }) {
  if (evidencia.tipo === "clase") {
    const c = evidencia.clase;
    return (
      <ul>
        <FilaClase c={c} />
      </ul>
    );
  }
  return <ContenidoSemana s={evidencia.semana} />;
}

const MENSAJES: Record<string, string> = {
  corregido: "Corrección guardada. El cálculo diario ya no la pisará.",
  automatico: "Vuelve a calcularse sola cada día.",
  nota: "La nota es obligatoria.",
  estado: "Ese estado no existe.",
  guardar: "No se ha podido guardar. ¿Está ejecutado supabase/lms-garantia.sql?",
};

export function DetalleGarantiaAlumno({
  detalle,
  inicio,
  entradas,
  hrefVolver,
  hecho,
  error,
  conTabla,
}: {
  detalle: DetalleGarantia;
  inicio: string | null;
  entradas: ResumenEntradas | null;
  hrefVolver: string;
  hecho: string | null;
  error: string | null;
  conTabla: boolean;
}) {
  const { fila, veredicto, guardado, evidencia, historial } = detalle;
  const semanas = porSemanas(inicio, veredicto.clases, veredicto.semanas).filter((s) => s.clases.length > 0 || s.contenido);

  return (
    <section aria-labelledby="titulo-detalle" className="lg:overflow-hidden lg:rounded-[16px] lg:border lg:border-marca-borde lg:bg-white">
      {/* La barra de vuelta, solo móvil: la de `DetalleEntradas`. */}
      <div className="sticky top-[60px] z-20 -mx-5 border-b border-marca-borde bg-white/[0.96] backdrop-blur-md sm:top-[68px] lg:hidden">
        <Link href={hrefVolver} className="grid min-h-[54px] grid-cols-[24px_minmax(0,1fr)] items-center gap-x-1.5 py-2 pl-3 pr-5">
          <Chevron direccion="izquierda" className="justify-self-center text-marca-verdeOsc" />
          <span className="min-w-0">
            <span className="block truncate font-display text-[16px] font-bold leading-[1.15] text-marca-tinta">{fila.nombre}</span>
            <span className="mt-0.5 block text-[12px] text-marca-gris">{ETIQUETA_ESTADO[fila.estado]}</span>
          </span>
          <span className="sr-only">Volver a la lista</span>
        </Link>
      </div>

      <div className="hidden items-baseline justify-between gap-3 border-b border-marca-borde bg-marca-casiBlanco px-[18px] py-4 lg:flex">
        <div className="flex min-w-0 items-baseline gap-3">
          <h2 id="titulo-detalle" className="truncate font-display text-[19px] font-bold leading-none text-marca-tinta">
            {fila.nombre}
          </h2>
          <Chapa estado={fila.estado} />
        </div>
        <Link href={hrefVolver} className="text-[13px] font-semibold text-marca-verdeOsc hover:text-marca-tinta">
          Cerrar
        </Link>
      </div>

      <div className="mt-3 space-y-3 lg:mt-0 lg:space-y-0 lg:divide-y lg:divide-marca-borde">
        {(hecho || error) && (
          <p
            role="status"
            className={`rounded-[12px] border px-4 py-3 text-[13px] leading-[1.45] lg:rounded-none lg:border-0 lg:px-[18px] ${
              error ? "border-marca-borde bg-white text-marca-tinta" : "border-marca-borde bg-marca-verdeFondo text-marca-verdeOsc"
            }`}
          >
            {MENSAJES[(error ?? hecho) as string] ?? "Hecho."}
          </p>
        )}

        {/* ------------------------- EL VEREDICTO ------------------------- */}
        <div className="rounded-[16px] border border-marca-borde bg-white px-4 py-3 lg:rounded-none lg:border-0 lg:px-[18px] lg:py-4">
          <div className="flex items-center gap-2 lg:hidden">
            <Chapa estado={fila.estado} />
            {fila.corregido && <span className="text-[12px] text-marca-grisSuave">corregido a mano</span>}
          </div>
          <p className="mt-2 text-pretty text-[14px] leading-[1.5] text-marca-tinta lg:mt-0">{fila.motivo}</p>
          <dl className="mt-2 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 text-[12.5px] text-marca-gris">
            <dt className="text-marca-grisSuave">Plan</dt>
            <dd className="min-w-0 text-pretty">
              {fila.plan || "—"}
              {fila.intensivo ? " · intensivo: sin cláusula de contenido" : ""}
            </dd>
            <dt className="text-marca-grisSuave">Inicio</dt>
            <dd className="tabular-nums">{inicio ? diaLegible(inicio.slice(0, 10)) : "—"}</dd>
            <dt className="text-marca-grisSuave">Fin</dt>
            <dd className="tabular-nums">{fila.fin ? diaLegible(fila.fin) : "Sin fecha de fin"}</dd>
            {fila.fechaPerdida && (
              <>
                <dt className="text-marca-grisSuave">Perdida el</dt>
                <dd className="tabular-nums">{diaLegible(fila.fechaPerdida)}</dd>
              </>
            )}
            {guardado?.calculado_en && (
              <>
                <dt className="text-marca-grisSuave">Guardado</dt>
                <dd className="tabular-nums">{diaLegible(diaLocal(new Date(guardado.calculado_en)))}</dd>
              </>
            )}
          </dl>
          {fila.estado !== veredicto.estado && (
            <p className="mt-2 text-pretty text-[12.5px] leading-[1.45] text-marca-gris">
              Con los datos de hoy, el cálculo diría «{ETIQUETA_ESTADO[veredicto.estado]}»: {veredicto.motivo}
            </p>
          )}
          {guardado?.corregido && (
            <p className="mt-2 text-pretty text-[12.5px] leading-[1.45] text-marca-gris">
              Corregido por {guardado.corregido_por} el {guardado.corregido_en ? diaLegible(diaLocal(new Date(guardado.corregido_en))) : "—"}: «{guardado.nota_correccion}»
            </p>
          )}
          {veredicto.huecos.length > 1 && (
            <ul className="mt-2 list-disc space-y-0.5 pl-5 text-[12.5px] leading-[1.45] text-marca-gris">
              {veredicto.huecos.map((h) => (
                <li key={h}>{h}</li>
              ))}
            </ul>
          )}
        </div>

        {/* LA PRUEBA, tal como se guardó el día que la perdió. */}
        {evidencia && fila.estado === "perdida" && (
          <div className="rounded-[16px] border border-marca-borde bg-white px-4 py-3 lg:rounded-none lg:border-0 lg:px-[18px]">
            <p className={ROTULO}>La prueba, tal como se guardó</p>
            <div className="mt-1">
              <Prueba evidencia={evidencia} />
            </div>
          </div>
        )}

        {/* ------------------------- SEMANA A SEMANA ------------------------- */}
        <div className="rounded-[16px] border border-marca-borde bg-white px-4 py-3 lg:rounded-none lg:border-0 lg:px-[18px]">
          <p className={ROTULO}>Semana a semana</p>
          {semanas.length === 0 ? (
            <p className="mt-2 text-[13px] text-marca-grisSuave">Todavía no hay clases ni contenido que mirar.</p>
          ) : (
            <ol className="mt-1">
              {semanas.map((s) => (
                <li key={s.numero} className="border-b border-marca-borde py-2 last:border-b-0">
                  <p className="text-[12.5px] font-semibold text-marca-tinta">
                    Semana {s.numero} <span className="font-normal tabular-nums text-marca-grisSuave">· desde el {diaLegible(s.desde)}</span>
                  </p>
                  {s.clases.length > 0 && (
                    <ul className="mt-0.5">
                      {s.clases.map((c, i) => (
                        <FilaClase key={`${c.fecha}-${c.hora}-${i}`} c={c} />
                      ))}
                    </ul>
                  )}
                  {s.contenido && <ContenidoSemana s={s.contenido} />}
                </li>
              ))}
            </ol>
          )}
        </div>

        {/* ------------------------- LA CORRECCIÓN ------------------------- */}
        {conTabla && (
          <div className="rounded-[16px] border border-marca-borde bg-white px-4 py-3 lg:rounded-none lg:border-0 lg:px-[18px] lg:py-4">
            <p className={ROTULO}>Corregir a mano</p>
            <form action={corregirGarantia} className="mt-2 grid gap-2">
              <input type="hidden" name="alumno" value={fila.alumnoId} />
              <label htmlFor="estado-correccion" className="sr-only">
                Estado
              </label>
              <select
                id="estado-correccion"
                name="estado"
                defaultValue={fila.estado}
                className="h-11 w-full rounded-full border border-marca-borde bg-white px-4 text-marca-tinta outline-none focus:border-marca-verde lg:h-[38px] lg:max-w-[260px] lg:text-[13.5px]"
              >
                {(Object.keys(ETIQUETA_ESTADO) as Estado[]).map((e) => (
                  <option key={e} value={e}>
                    {ETIQUETA_ESTADO[e]}
                  </option>
                ))}
              </select>
              <label htmlFor="nota-correccion" className="sr-only">
                Nota (obligatoria)
              </label>
              <textarea
                id="nota-correccion"
                name="nota"
                required
                maxLength={1000}
                rows={3}
                placeholder="Por qué se corrige (obligatorio)"
                className="w-full rounded-[12px] border border-marca-borde bg-white px-4 py-2.5 text-marca-tinta outline-none placeholder:text-marca-grisTenue focus:border-marca-verde lg:text-[13.5px]"
              />
              <button type="submit" className="btn-verde h-11 rounded-full px-6 text-[14.5px] font-bold lg:h-[38px] lg:justify-self-start">
                Guardar corrección
              </button>
            </form>

            {guardado?.corregido && (
              <form action={quitarCorreccionGarantia} className="mt-4 grid gap-2 border-t border-marca-nieblaOscura pt-3">
                <input type="hidden" name="alumno" value={fila.alumnoId} />
                <label htmlFor="nota-automatico" className="text-[12.5px] text-marca-gris">
                  O devolverlo al cálculo automático:
                </label>
                <textarea
                  id="nota-automatico"
                  name="nota"
                  required
                  maxLength={1000}
                  rows={2}
                  placeholder="Por qué (obligatorio)"
                  className="w-full rounded-[12px] border border-marca-borde bg-white px-4 py-2.5 text-marca-tinta outline-none placeholder:text-marca-grisTenue focus:border-marca-verde lg:text-[13.5px]"
                />
                <button
                  type="submit"
                  className="h-11 rounded-full border border-marca-borde bg-white px-6 text-[14px] font-semibold text-marca-tinta transition-colors hover:border-marca-verde lg:h-[38px] lg:justify-self-start"
                >
                  Volver al cálculo
                </button>
              </form>
            )}
          </div>
        )}

        {/* ------------------------- EL HISTORIAL ------------------------- */}
        {historial && historial.length > 0 && (
          <div className="rounded-[16px] border border-marca-borde bg-white px-4 py-3 lg:rounded-none lg:border-0 lg:px-[18px]">
            <p className={ROTULO}>Historial</p>
            <ul className="mt-1">
              {historial.map((h) => (
                <li key={h.id} className="border-b border-marca-nieblaOscura py-2 text-[12.5px] leading-[1.45] text-marca-gris last:border-b-0">
                  <span className="tabular-nums text-marca-tinta">{diaLegible(diaLocal(new Date(h.creado_en)))}</span> ·{" "}
                  {h.estado_anterior ? `${ETIQUETA_ESTADO[h.estado_anterior]} → ` : ""}
                  {ETIQUETA_ESTADO[h.estado]}
                  {h.origen === "calculo" ? " (cálculo)" : h.origen === "correccion" ? ` (corregido por ${h.autor})` : ` (al cálculo, por ${h.autor})`}
                  <span className="block text-marca-grisSuave">{h.nota ? `«${h.nota}»` : h.motivo}</span>
                  {h.estado === "perdida" && h.origen === "calculo" && h.estado_anterior !== null && (
                    <span className="block text-marca-grisSuave">{h.aviso_enviado_en ? "Aviso al equipo enviado." : "Aviso al equipo pendiente."}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* ---------------- LOS CLICS: APOYO, NO VEREDICTO ---------------- */}
        <div className="rounded-[16px] border border-marca-borde bg-white px-4 py-3 lg:rounded-none lg:border-0 lg:px-[18px] lg:py-4">
          <p className={ROTULO}>Entradas por la plataforma · dato de apoyo</p>
          <p className="mt-1 text-pretty text-[12.5px] leading-[1.45] text-marca-gris">
            No cuentan para la garantía: un alumno puede haber ido a clase por otro enlace. La asistencia sale solo de los partes de Gestión.
          </p>
          {entradas === null ? (
            <p className="mt-2 text-[12.5px] text-marca-grisSuave">No se han podido leer las entradas.</p>
          ) : entradas.clases.length === 0 ? (
            <p className="mt-2 text-[12.5px] text-marca-grisSuave">Ninguna entrada registrada desde el botón.</p>
          ) : (
            <p className="mt-2 text-[12.5px] tabular-nums text-marca-tinta">
              {entradas.clases.length} {entradas.clases.length === 1 ? "clase" : "clases"} con entrada; la última, el{" "}
              {diaLegible(diaLocal(new Date(entradas.clases[0].inicio)))}.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
