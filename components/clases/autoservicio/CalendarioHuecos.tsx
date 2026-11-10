"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { horaFin } from "@/lib/autoservicio/franjas";
import {
  ahoraEnEspana,
  calendarioConFechas,
  calendarioSemanaTipo,
  diaInicial,
  semanaInicial,
  type Casilla,
  type ClaseQueSeMueve,
  type DiaCalendario,
} from "@/lib/autoservicio/calendario";
import { partesFecha } from "@/lib/recuperaciones-fechas";
import type { Agenda, HuecoLibre } from "@/lib/autoservicio/tipos";
import type { TextosAutoservicio } from "@/lib/textos/autoservicio";
import Chapa from "@/components/Chapa";
import { BOTON_LINEA, BotonWhatsApp, FOCO } from "@/components/clases/autoservicio/Piezas";
import { bloquesDe, filaDeHora, siguienteConHuecos, type Bloque } from "@/components/clases/autoservicio/bloques";

/**
 * LOS HUECOS, EN CALENDARIO. En los tres sitios donde se elige un horario:
 *
 *   · «Solo esta clase» (`modo="fechas"`): el calendario de su profe,
 *     semana a semana, con Libre, Ocupado y «Tu clase ahora». Flechas
 *     dentro de la ventana de Gestión.
 *   · «Desde ahora, todas» y «Cambiar de profesor» (`modo="semanaTipo"`):
 *     una sola semana, solo con los huecos. Los filtros siguen fuera,
 *     donde estaban.
 *
 * LO PINCHABLE SON SOLO LOS HUECOS QUE LLEGAN (ver
 * `lib/autoservicio/calendario.ts`). La agenda solo pinta. Este archivo
 * solo decide cómo se ve (`./bloques.ts`):
 *
 *   · BLOQUES, NO CASILLAS. Las horas seguidas con el mismo estado van en
 *     un bloque redondeado, como en un calendario de verdad. Lo libre
 *     destaca (verde claro con borde verde, y la hora de cada inicio);
 *     lo ocupado se retira (gris con rayado); fuera de horario, lo no
 *     disponible y lo pasado son solo el fondo.
 *   · «TU CLASE AHORA» en tinta, con la chapa amarilla de la ruta.
 *   · AL ELEGIR, la vista previa: el bloque entero que ocuparía la clase,
 *     según su duración, con «Tu clase irá aquí». Elegir no confirma
 *     nada: eso lo hace «Continuar», fuera de aquí.
 *   · HOY, en la cabecera; la línea de ahora en el día de hoy y lo ya
 *     pasado, en niebla.
 *
 * En el móvil se ve un día cada vez, con el selector de días deslizable
 * arriba; desde 900 px, la semana entera en una rejilla.
 */

type Comun<H> = {
  t: TextosAutoservicio;
  huecos: H[];
  alElegir: (h: H) => void;
  elegido?: (h: H) => boolean;
};

type Props<H> = Comun<H> &
  (
    | {
        modo: "fechas";
        agenda: Agenda | null;
        tuClase: ClaseQueSeMueve | null;
        whatsapp: string;
      }
    | { modo: "semanaTipo" }
  );

/**
 * Lo que mide una hora: más que los 44 px de un objetivo táctil, y en
 * escritorio, con columnas de unos 90 px, lo justo para que «Tu clase irá
 * aquí» y su hora quepan en el bloque de una clase de una hora sin cortarse.
 */
const ALTO_MOVIL = 60;
const ALTO_ESCRITORIO = 68;
/** Aire sobre la primera hora: la chapa de «Tu clase ahora» cuelga por encima de su bloque. */
const AIRE = 16;
/** Las líneas de cada hora. */
const LINEA = "#E2E8E4";
/** Lo ya pasado, detrás de las líneas. */
const PASADO = "#F4F7F4";

/**
 * El calendario va sobre blanco: el fondo de la página ya es niebla, y
 * lo pasado (niebla) se perdería en él.
 */
const TARJETA_CAL = "rounded-[16px] border border-marca-borde bg-white";

/** El botón secundario de «Siguiente hueco libre», cuando va dentro de otra cosa. */
const BOTON_SIGUIENTE = `inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full border-[1.5px] border-marca-verde bg-white px-5 text-[17px] font-bold text-marca-verdeOsc transition-colors hover:bg-marca-verdeFondo motion-reduce:transition-none ${FOCO}`;

export default function CalendarioHuecos<H extends HuecoLibre>(props: Props<H>) {
  const { t, huecos, alElegir, elegido } = props;
  const conFechas = props.modo === "fechas";
  const agenda = props.modo === "fechas" ? props.agenda : null;
  const tuClase = props.modo === "fechas" ? props.tuClase : null;

  // Se monta en el cliente, con los huecos ya cargados: no hay HTML de servidor con el que discrepar.
  const [ahora] = useState(() => ahoraEnEspana());
  const cal = useMemo(
    () => (conFechas ? calendarioConFechas(huecos, agenda, tuClase, ahora) : calendarioSemanaTipo(huecos)),
    [conFechas, huecos, agenda, tuClase, ahora],
  );

  const [semanaPedida, setSemana] = useState(() => semanaInicial(cal, ahora));
  const n = Math.min(semanaPedida, Math.max(0, cal.semanas.length - 1));
  const semana = cal.semanas[n];

  const [diaPedido, setDia] = useState<string | null>(null);
  const dia =
    semana?.dias.find((d) => d.clave === diaPedido) ?? (semana ? semana.dias.find((d) => d.clave === diaInicial(semana)) : undefined);

  const selector = useRef<HTMLDivElement>(null);
  // El día elegido, a la vista en el selector (sin mover la página).
  useEffect(() => {
    const cont = selector.current;
    const el = dia ? cont?.querySelector<HTMLElement>(`[data-dia="${dia.clave}"]`) : null;
    if (cont && el)
      cont.scrollTo({
        left: el.offsetLeft - cont.clientWidth / 2 + el.clientWidth / 2,
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      });
  }, [dia]);

  if (!semana || cal.horas.length === 0 || semana.dias.length === 0) return null;

  const ultimoDia = semana.dias[semana.dias.length - 1];
  const hoy = conFechas ? ahora.fecha : null;
  const describir = (h: H) =>
    h.fecha ? t.clase(h.fecha, h.hora, horaFin(h.hora, h.duracion)) : t.sesion(h.dia, h.hora, horaFin(h.hora, h.duracion));
  const cambiarSemana = (i: number) => {
    setSemana(i);
    setDia(null);
  };
  const irA = (destino: { semana: number; dia: string } | null) => {
    if (!destino) return;
    setSemana(destino.semana);
    setDia(destino.dia);
  };
  // «Siguiente hueco libre»: en el móvil, desde el día que se ve; en escritorio, desde el final de la semana.
  const siguienteDelDia = conFechas && dia ? siguienteConHuecos(cal, dia.clave) : null;
  const siguienteDeLaSemana = conFechas ? siguienteConHuecos(cal, ultimoDia.clave) : null;
  const semanaVacia = conFechas && semana.libres === 0;

  const columna = (d: DiaCalendario<H>, casillas: Casilla<H>[], horas: string[], ancha: boolean) => (
    <Columna
      casillas={casillas}
      horas={horas}
      t={t}
      ancha={ancha}
      pasado={d.pasado}
      ahora={d.fecha !== null && d.fecha === hoy ? ahora.hora : null}
      alElegir={alElegir}
      elegido={elegido}
      describir={describir}
    />
  );

  // En la semana tipo, el móvil enseña solo las horas con hueco de ese día: es una lista, no la semana.
  const filasMovil = dia ? (conFechas ? dia.casillas : dia.casillas.filter((c) => c.estado === "libre")) : [];

  return (
    <section
      aria-label={semana.lunes ? t.calSemana(semana.lunes, ultimoDia.fecha ?? semana.lunes) : t.eligeNuevoHorario}
      className="flex flex-col gap-4"
    >
      {conFechas && semana.lunes && (
        <>
          <div className="flex items-center gap-3">
            <Flecha direccion="atras" etiqueta={t.calSemanaAnterior} desactivada={n === 0} alPulsar={() => cambiarSemana(n - 1)} />
            <div className="flex min-w-0 flex-1 flex-col items-center text-center">
              <h3
                aria-live="polite"
                className="font-display text-[22px] font-bold leading-tight text-marca-tinta [text-wrap:balance] min-[900px]:text-[26px]"
              >
                {t.calSemana(semana.lunes, ultimoDia.fecha ?? semana.lunes)}
              </h3>
              <p className="mt-1 flex items-center gap-1.5 text-[14px] font-semibold text-marca-tinta">
                <svg
                  aria-hidden
                  viewBox="0 0 24 24"
                  className="h-4 w-4 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 7v5l3 2" />
                </svg>
                {t.calHoraEspana}
              </p>
            </div>
            <Flecha
              direccion="adelante"
              etiqueta={t.calSemanaSiguiente}
              desactivada={n >= cal.semanas.length - 1}
              alPulsar={() => cambiarSemana(n + 1)}
            />
          </div>

          <ul aria-label={t.calLeyenda} className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[15px] text-marca-tinta">
            <li className="flex items-center gap-2">
              <span aria-hidden className="h-5 w-5 rounded-[6px] border-2 border-marca-verde bg-[#E4F5E9]" />
              {t.calLibre}
            </li>
            <li className="flex items-center gap-2">
              <span aria-hidden className="cal-ocupado h-5 w-5 rounded-[6px]" />
              {t.calOcupado}
            </li>
            <li className="flex items-center gap-2">
              <span aria-hidden className="h-5 w-5 rounded-[6px] bg-marca-tinta" />
              {t.calTuClase}
            </li>
          </ul>

          {semanaVacia && props.modo === "fechas" && (
            <div
              role="status"
              className="flex flex-col gap-3 rounded-[16px] border border-marca-calidoBadge bg-marca-calidoFondo px-[18px] py-5"
            >
              <span aria-hidden className="flex h-11 w-11 items-center justify-center rounded-[12px] bg-white text-marca-calidoBadgeTexto">
                <IconoCalendario />
              </span>
              <p className="text-[16.5px] leading-[1.45] text-marca-tinta">{t.calSemanaSinHuecos}</p>
              <div className="mt-1 flex flex-col gap-2.5 min-[900px]:max-w-[420px]">
                {siguienteDeLaSemana && (
                  <button type="button" onClick={() => irA(siguienteDeLaSemana)} className={BOTON_LINEA}>
                    {t.calSiguienteHueco}
                    <FlechaDerecha />
                  </button>
                )}
                <BotonWhatsApp href={props.whatsapp} texto={t.escribenos} />
              </div>
            </div>
          )}
        </>
      )}

      {/* --- móvil: un día cada vez --- */}
      <div className="flex flex-col gap-3 min-[900px]:hidden">
        {semana.dias.length > 1 && (
          <div
            ref={selector}
            role="group"
            aria-label={t.calDias}
            className="-mx-5 flex snap-x gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {semana.dias.map((d) => (
              <BotonDia
                key={d.clave}
                d={d}
                t={t}
                hoy={d.fecha !== null && d.fecha === hoy}
                activo={d.clave === dia?.clave}
                alPulsar={() => setDia(d.clave)}
              />
            ))}
          </div>
        )}
        {dia && (
          <div key={dia.clave} className={`cal-fundido ${TARJETA_CAL} px-3 pb-2 pt-3.5`}>
            <div className="mb-1 flex items-center gap-2 px-1">
              <h3 className="text-[18px] font-bold text-marca-tinta">{dia.fecha ? t.diaConFecha(dia.fecha) : t.diaSemanal(dia.dia)}</h3>
              {dia.fecha !== null && dia.fecha === hoy && <PildoraHoy t={t} />}
            </div>
            {conFechas && dia.libres === 0 && !semanaVacia && (
              <div className="mx-1 mb-1 mt-2 flex flex-col items-start gap-2.5 rounded-[12px] bg-marca-calidoFondo px-3.5 py-3">
                <p className="text-[16px] leading-snug text-marca-tinta">{t.calDiaSinHuecos}</p>
                {siguienteDelDia && (
                  <button type="button" onClick={() => irA(siguienteDelDia)} className={BOTON_SIGUIENTE}>
                    {t.calSiguienteHueco}
                    <FlechaDerecha />
                  </button>
                )}
              </div>
            )}
            <div className="flex" style={{ paddingTop: AIRE, paddingBottom: 8 }}>
              <EjeHoras horas={filasMovil.map((c) => c.hora)} alto={ALTO_MOVIL} />
              <div className="min-w-0 flex-1">{columna(dia, filasMovil, filasMovil.map((c) => c.hora), true)}</div>
            </div>
          </div>
        )}
      </div>

      {/* --- escritorio: la semana entera --- */}
      <div className={`hidden min-[900px]:block ${TARJETA_CAL} px-3 pb-3 pt-4`}>
        <div key={semana.lunes ?? "tipo"} className="cal-fundido">
          <div className="grid" style={{ gridTemplateColumns: `56px repeat(${semana.dias.length}, minmax(0, 1fr))` }}>
            <div>
              <span className="sr-only">{t.calHora}</span>
            </div>
            {semana.dias.map((d) => (
              <CabeceraDia
                key={d.clave}
                d={d}
                t={t}
                hoy={d.fecha !== null && d.fecha === hoy}
                semanaConHoy={semana.dias.some((x) => x.fecha !== null && x.fecha === hoy)}
              />
            ))}
          </div>
          <div
            className="grid"
            style={{ gridTemplateColumns: `56px repeat(${semana.dias.length}, minmax(0, 1fr))`, paddingTop: AIRE }}
          >
            <EjeHoras horas={cal.horas} alto={ALTO_ESCRITORIO} />
            {semana.dias.map((d) => (
              <div key={d.clave} className="min-w-0 border-l" style={{ borderColor: LINEA }}>
                {columna(d, d.casillas, cal.horas, false)}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/** Las horas a la izquierda, en el centro de su fila. */
function EjeHoras({ horas, alto }: { horas: string[]; alto: number }) {
  return (
    <div aria-hidden className="relative w-[52px] shrink-0" style={{ height: horas.length * alto }}>
      {horas.map((h, i) => (
        <span
          key={h}
          className="absolute right-2.5 -translate-y-1/2 text-[14.5px] font-medium tabular-nums text-marca-tinta"
          style={{ top: i * alto + alto / 2 }}
        >
          {h}
        </span>
      ))}
    </div>
  );
}

/**
 * Un día: las líneas de las horas, lo ya pasado, los bloques, la línea de
 * ahora y, encima de todo, la vista previa de lo elegido.
 */
function Columna<H extends HuecoLibre>({
  casillas,
  horas,
  t,
  ancha,
  pasado,
  ahora,
  alElegir,
  elegido,
  describir,
}: {
  casillas: Casilla<H>[];
  horas: string[];
  t: TextosAutoservicio;
  /** En el móvil la columna es ancha y la etiqueta cabe en una línea. */
  ancha: boolean;
  pasado: boolean;
  /** La hora de ahora, si el día es hoy. */
  ahora: string | null;
  alElegir: (h: H) => void;
  elegido?: (h: H) => boolean;
  describir: (h: H) => string;
}) {
  const ALTO = ancha ? ALTO_MOVIL : ALTO_ESCRITORIO;
  const filas = casillas.length;
  const filaAhora = ahora ? filaDeHora(horas, ahora) : null;
  // Hasta dónde llega lo ya pasado, en filas.
  const hastaPasado = pasado ? filas : ahora ? filaAhora ?? (filas > 0 && ahora >= horas[0] ? filas : 0) : 0;
  const fondo: CSSProperties = {
    height: filas * ALTO,
    backgroundImage: `linear-gradient(to bottom, ${LINEA} 1px, transparent 1px), linear-gradient(to bottom, ${PASADO} ${hastaPasado * ALTO}px, transparent ${hastaPasado * ALTO}px)`,
    backgroundSize: `100% ${ALTO}px, 100% 100%`,
    backgroundRepeat: "repeat-y, no-repeat",
    borderBottom: `1px solid ${LINEA}`,
  };
  const lado = ancha ? 6 : 3;

  /** Dónde acaba la clase elegida, en filas: si cae en un salto de la semana tipo, en la fila siguiente. */
  const filaFin = (fin: string) => {
    const f = filaDeHora(horas, fin);
    if (f !== null) return f;
    const j = horas.findIndex((x) => x >= fin);
    return j < 0 ? filas : j;
  };

  const bloques = bloquesDe(casillas);
  const previas = casillas.flatMap((c, i) =>
    c.estado === "libre" ? c.huecos.filter((h) => elegido?.(h)).map((h) => ({ h, i })) : [],
  );

  return (
    <div className="relative" style={fondo}>
      {bloques.map((b) => (
        <BloqueDibujado
          key={`${b.estado}-${b.desde}`}
          b={b}
          t={t}
          ancha={ancha}
          posicion={{ top: b.fila * ALTO + 2, height: b.filas * ALTO - 4, left: lado, right: lado }}
          alElegir={alElegir}
          elegido={elegido}
          describir={describir}
        />
      ))}

      {/* La chapa, fuera de su bloque: así queda por encima de las columnas de al lado. */}
      {bloques
        .filter((b) => b.estado === "tuClase")
        .map((b) => (
          <span
            key={`chapa-${b.desde}`}
            aria-hidden
            className="pointer-events-none absolute left-1/2 z-40 -translate-x-1/2 -translate-y-[60%]"
            style={{ top: b.fila * ALTO + 2 }}
          >
            <Chapa>{t.calTuClaseAhora}</Chapa>
          </span>
        ))}

      {filaAhora !== null && (
        <div aria-hidden className="pointer-events-none absolute inset-x-0 z-20" style={{ top: filaAhora * ALTO - 1 }}>
          <div className="h-[2px] bg-marca-tinta" />
          <span className="absolute -left-[5px] -top-[4px] h-[10px] w-[10px] rounded-full bg-marca-tinta" />
        </div>
      )}

      {previas.map(({ h, i }) => {
        const fin = horaFin(h.hora, h.duracion);
        const alto = Math.max(filaFin(fin) - i, 0.75) * ALTO;
        return (
          <div
            key={`${h.fecha ?? h.dia}-${h.hora}-${h.duracion}`}
            aria-hidden
            className={`cal-aparece pointer-events-none absolute z-30 flex flex-col justify-center overflow-hidden rounded-[12px] border-[3px] border-marca-verde bg-white shadow-[0_6px_16px_rgba(18,33,26,0.14)] ${
              ancha ? "gap-0.5 px-3.5" : "items-center px-1 text-center"
            }`}
            style={{ top: i * ALTO + 1, height: alto - 2, left: lado - 2, right: lado - 2 }}
          >
            <span className={`font-bold leading-tight text-marca-verdeOsc ${ancha ? "text-[15.5px]" : "text-[12.5px]"}`}>{t.calIraAqui}</span>
            <span className={`whitespace-nowrap font-bold tabular-nums leading-tight text-marca-tinta ${ancha ? "text-[18px]" : "mt-0.5 text-[13px]"}`}>
              {h.hora}–{fin}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function BloqueDibujado<H extends HuecoLibre>({
  b,
  t,
  ancha,
  posicion,
  alElegir,
  elegido,
  describir,
}: {
  b: Bloque<H>;
  t: TextosAutoservicio;
  ancha: boolean;
  posicion: CSSProperties;
  alElegir: (h: H) => void;
  elegido?: (h: H) => boolean;
  describir: (h: H) => string;
}) {
  const tramo = `${b.desde}–${b.hasta}`;

  if (b.estado === "ocupado") {
    return (
      <div
        className={`cal-ocupado absolute z-10 flex rounded-[12px] font-semibold text-marca-tinta ${
          ancha ? "px-3.5 text-[15.5px]" : "justify-center px-1 text-[14px]"
        } items-start pt-2.5`}
        style={posicion}
      >
        {t.calOcupado}
        <span className="sr-only">, {tramo}</span>
      </div>
    );
  }

  if (b.estado === "tuClase") {
    return (
      <div
        className={`absolute z-10 flex flex-col justify-center rounded-[12px] bg-marca-tinta pt-2 text-white ${
          ancha ? "px-3.5" : "items-center px-1 text-center"
        }`}
        style={posicion}
      >
        <span className="sr-only">{t.calTuClase}, </span>
        <span className={`whitespace-nowrap font-bold tabular-nums leading-tight ${ancha ? "text-[17px]" : "text-[13px]"}`}>{tramo}</span>
      </div>
    );
  }

  // Libre: un bloque, y dentro un botón por cada inicio, con su hora bien visible.
  const etiqueta = ancha && b.filas > 1 ? `${t.calLibre} · ${tramo}` : t.calLibre;
  return (
    <div
      role="group"
      aria-label={`${t.calLibre}, ${tramo}`}
      className="absolute z-10 flex flex-col overflow-hidden rounded-[12px] border-2 border-marca-verde bg-[#E4F5E9] shadow-[0_2px_6px_rgba(30,158,58,0.18)]"
      style={posicion}
    >
      {b.casillas.map((c, j) => (
        <div key={c.hora} className={`flex min-h-0 flex-1 flex-col ${j > 0 ? "border-t border-dashed border-marca-verde/40" : ""}`}>
          {c.huecos.map((h, k) => {
            const puesto = elegido?.(h) ?? false;
            const primero = j === 0 && k === 0;
            return (
              <button
                key={`${h.fecha ?? h.dia}-${h.hora}-${h.duracion}-${k}`}
                type="button"
                onClick={() => alElegir(h)}
                aria-pressed={elegido ? puesto : undefined}
                aria-label={t.calElegir(describir(h))}
                className={`flex min-h-0 w-full flex-1 transition-colors hover:bg-[#CDEDD6] motion-reduce:transition-none ${FOCO} focus-visible:-outline-offset-[3px] ${
                  k > 0 ? "border-t border-dashed border-marca-verde/40" : ""
                } ${ancha ? "items-center gap-3 px-3.5 text-left" : "flex-col items-center justify-center px-1 text-center"}`}
              >
                {/* #1E9E3A sobre el verde claro da 3,1:1: la hora va a 19 px en negrita, que es texto grande (AA). */}
                {!ancha && primero && <span className="text-[13px] font-bold leading-tight text-marca-verdeOsc">{etiqueta}</span>}
                <span className="text-[19px] font-bold leading-tight tabular-nums text-marca-verde">{c.hora}</span>
                {ancha && primero && <span className="ml-auto text-[15px] font-semibold text-marca-verdeOsc">{etiqueta}</span>}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function CabeceraDia<H>({
  d,
  t,
  hoy,
  semanaConHoy,
}: {
  d: DiaCalendario<H>;
  t: TextosAutoservicio;
  hoy: boolean;
  semanaConHoy: boolean;
}) {
  return (
    <div className="flex flex-col items-center pb-2 text-marca-tinta">
      <span className="text-[15px] font-bold">{t.diaSemanal(d.dia)}</span>
      {d.fecha && (
        <span
          className={`mt-1 flex h-8 min-w-[32px] items-center justify-center rounded-full px-1.5 text-[16px] tabular-nums ${
            hoy ? "bg-marca-tinta font-bold text-white" : "font-semibold"
          }`}
        >
          {partesFecha(d.fecha).numero}
        </span>
      )}
      {/* La misma altura en todas las columnas: «Hoy» solo se ve en la suya. */}
      {d.fecha && semanaConHoy && (
        <span className={`mt-0.5 h-[18px] text-[13px] font-bold leading-[18px] ${hoy ? "" : "invisible"}`} aria-hidden={!hoy}>
          {t.calHoy}
        </span>
      )}
    </div>
  );
}

function PildoraHoy({ t }: { t: TextosAutoservicio }) {
  return <span className="rounded-full bg-marca-tinta px-2.5 py-0.5 text-[13px] font-bold text-white">{t.calHoy}</span>;
}

function Flecha({
  direccion,
  etiqueta,
  desactivada,
  alPulsar,
}: {
  direccion: "atras" | "adelante";
  etiqueta: string;
  desactivada: boolean;
  alPulsar: () => void;
}) {
  return (
    <button
      type="button"
      onClick={alPulsar}
      disabled={desactivada}
      aria-label={etiqueta}
      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-[1.5px] transition-colors motion-reduce:transition-none ${FOCO} ${
        desactivada
          ? "cursor-not-allowed border-marca-borde bg-marca-niebla text-marca-tinta/30"
          : "border-marca-tinta/25 bg-white text-marca-tinta hover:border-marca-verde hover:bg-marca-verdeFondo"
      }`}
    >
      <svg
        aria-hidden
        viewBox="0 0 24 24"
        className="h-6 w-6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d={direccion === "atras" ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7"} />
      </svg>
    </button>
  );
}

function BotonDia<H>({
  d,
  t,
  hoy,
  activo,
  alPulsar,
}: {
  d: DiaCalendario<H>;
  t: TextosAutoservicio;
  hoy: boolean;
  activo: boolean;
  alPulsar: () => void;
}) {
  const nombre = d.fecha ? t.diaConFecha(d.fecha) : t.diaSemanal(d.dia);
  const conHuecos = d.libres > 0;
  return (
    <button
      type="button"
      data-dia={d.clave}
      onClick={alPulsar}
      aria-pressed={activo}
      aria-label={`${hoy ? `${t.calHoy}, ` : ""}${nombre}, ${t.calLibres(d.libres)}`}
      className={`flex min-h-[64px] min-w-[58px] shrink-0 snap-start flex-col items-center justify-center gap-0.5 rounded-[14px] border-[1.5px] px-2 transition-colors motion-reduce:transition-none ${FOCO} ${
        activo
          ? "border-marca-verdeOsc bg-marca-verdeOsc text-white"
          : conHuecos
            ? "border-marca-borde bg-white text-marca-tinta"
            : "border-marca-borde bg-marca-niebla text-marca-tintaMedia"
      }`}
    >
      <span className="text-[14px] font-semibold">{hoy ? t.calHoy : t.diaCorto(d.dia)}</span>
      {d.fecha && <span className="text-[19px] font-bold leading-none tabular-nums">{partesFecha(d.fecha).numero}</span>}
      <span
        aria-hidden
        className={`mt-1 h-2 w-2 rounded-full ${conHuecos ? (activo ? "bg-white" : "bg-marca-verde") : "bg-transparent"}`}
      />
    </button>
  );
}

function FlechaDerecha() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

function IconoCalendario(): ReactNode {
  return (
    <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="5" width="16" height="15" rx="2" />
      <path d="M4 10h16M9 3v4M15 3v4" />
    </svg>
  );
}
