"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
import { Aviso, BotonWhatsApp, FOCO, Palomita } from "@/components/clases/autoservicio/Piezas";

/**
 * LOS HUECOS, EN CALENDARIO. Sustituye a la rejilla de chips en los tres
 * sitios donde se elige un horario:
 *
 *   · «Solo esta clase» (`modo="fechas"`): el calendario de su profe,
 *     semana a semana, con Libre, Ocupado, fuera de horario y «Tu clase».
 *     Flechas dentro de la ventana de Gestión.
 *   · «Desde ahora, todas» y «Cambiar de profesor» (`modo="semanaTipo"`):
 *     una sola semana, solo con los huecos. Los filtros siguen fuera,
 *     donde estaban.
 *
 * LO PINCHABLE SON SOLO LOS HUECOS QUE LLEGAN (ver
 * `lib/autoservicio/calendario.ts`). La agenda solo pinta.
 *
 * En el móvil se ve un día cada vez, con el selector de días deslizable
 * arriba; desde 900 px, la semana entera en una tabla.
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

/** La altura de cada casilla: 48 px, por encima de los 44 de un objetivo táctil. */
const CASILLA = "flex min-h-[48px] w-full items-center justify-center rounded-[10px]";
/**
 * El calendario va sobre blanco: el fondo de la página ya es niebla, y
 * las casillas fuera de horario (niebla) se perderían en él.
 */
const TARJETA_CAL = "rounded-[16px] border border-marca-borde bg-white p-3";

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
        behavior: "smooth",
      });
  }, [dia]);

  if (!semana || cal.horas.length === 0 || semana.dias.length === 0) return null;

  const ultimoDia = semana.dias[semana.dias.length - 1];
  const describir = (h: H) =>
    h.fecha ? t.clase(h.fecha, h.hora, horaFin(h.hora, h.duracion)) : t.sesion(h.dia, h.hora, horaFin(h.hora, h.duracion));
  const cambiarSemana = (i: number) => {
    setSemana(i);
    setDia(null);
  };
  const celda = (c: Casilla<H>, ancha: boolean) => (
    <CeldaCalendario c={c} t={t} ancha={ancha} alElegir={alElegir} elegido={elegido} describir={describir} />
  );

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
              <h3 aria-live="polite" className="font-display text-[18px] font-bold leading-tight text-marca-tinta min-[900px]:text-[20px]">
                {t.calSemana(semana.lunes, ultimoDia.fecha ?? semana.lunes)}
              </h3>
              <p className="mt-0.5 flex items-center gap-1.5 text-[14.5px] text-marca-tinta">
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

          <ul aria-label={t.calLeyenda} className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[14.5px] text-marca-tinta">
            <li className="flex items-center gap-2">
              <span aria-hidden className="h-4 w-4 rounded-[4px] bg-marca-verde" />
              {t.calLibre}
            </li>
            <li className="flex items-center gap-2">
              <span aria-hidden className="h-4 w-4 rounded-[4px] bg-marca-tinta/[0.09]" />
              {t.calOcupado}
            </li>
            <li className="flex items-center gap-2">
              <span aria-hidden className="h-4 w-4 rounded-[4px] border-2 border-marca-tinta bg-white" />
              {t.calTuClase}
            </li>
          </ul>

          {semana.libres === 0 && props.modo === "fechas" && (
            <div className="flex flex-col gap-3">
              <Aviso role="status">{t.calSemanaSinHuecos}</Aviso>
              <BotonWhatsApp href={props.whatsapp} texto={t.escribenos} />
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
              <BotonDia key={d.clave} d={d} t={t} activo={d.clave === dia?.clave} alPulsar={() => setDia(d.clave)} />
            ))}
          </div>
        )}
        {dia && (
          <div className={TARJETA_CAL}>
            <h3 className="mb-2.5 text-[17px] font-bold text-marca-tinta">
              {dia.fecha ? t.diaConFecha(dia.fecha) : t.diaSemanal(dia.dia)}
            </h3>
            <ul className="flex flex-col gap-1.5">
              {/* En la semana tipo, solo las horas con hueco de ese día: es una lista, no la semana. */}
              {(conFechas ? dia.casillas : dia.casillas.filter((c) => c.estado === "libre")).map((c) => (
                <li key={c.hora} className="flex items-stretch gap-3">
                  <span className="w-[48px] shrink-0 pt-3 text-[15px] font-semibold tabular-nums text-marca-tinta">{c.hora}</span>
                  <div className="min-w-0 flex-1">{celda(c, true)}</div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* --- escritorio: la semana entera --- */}
      <div className={`hidden min-[900px]:block ${TARJETA_CAL}`}>
        <table className="w-full table-fixed border-separate border-spacing-1">
          <thead>
            <tr>
              <th scope="col" className="w-[52px]">
                <span className="sr-only">{t.calHora}</span>
              </th>
              {semana.dias.map((d) => (
                <th key={d.clave} scope="col" className="pb-1.5 text-center align-bottom text-marca-tinta">
                  <span className="block text-[14.5px] font-bold">{t.diaSemanal(d.dia)}</span>
                  {d.fecha && <span className="block text-[14px] font-normal tabular-nums">{partesFecha(d.fecha).numero}</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cal.horas.map((hora, fila) => (
              <tr key={hora}>
                <th scope="row" className="pr-1.5 text-right align-middle text-[14px] font-semibold tabular-nums text-marca-tinta">
                  {hora}
                </th>
                {semana.dias.map((d) => (
                  <td key={d.clave} className="p-0 align-middle">
                    {celda(d.casillas[fila], false)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function CeldaCalendario<H extends HuecoLibre>({
  c,
  t,
  ancha,
  alElegir,
  elegido,
  describir,
}: {
  c: Casilla<H>;
  t: TextosAutoservicio;
  /** En el móvil la casilla es ancha y cabe la hora de fin de una clase larga. */
  ancha: boolean;
  alElegir: (h: H) => void;
  elegido?: (h: H) => boolean;
  describir: (h: H) => string;
}) {
  switch (c.estado) {
    case "libre":
      return (
        <div className="flex flex-col gap-1">
          {c.huecos.map((h) => {
            const puesto = elegido?.(h) ?? false;
            return (
              <button
                key={`${h.fecha ?? h.dia}-${h.hora}-${h.duracion}`}
                type="button"
                onClick={() => alElegir(h)}
                aria-pressed={elegido ? puesto : undefined}
                aria-label={t.calElegir(describir(h))}
                // Blanco sobre #1E9E3A da 3,5:1: el texto va a 19 px en negrita, que es texto grande (AA).
                className={`${CASILLA} gap-1.5 px-1.5 text-[19px] font-bold leading-none text-white transition-colors ${FOCO} ${
                  puesto ? "bg-marca-verdeOsc ring-2 ring-marca-tinta ring-offset-2" : "bg-marca-verde hover:bg-marca-verdeOsc"
                }`}
              >
                {puesto && <Palomita className={ancha ? "h-[18px] w-[18px] shrink-0" : "h-6 w-6 shrink-0"} grosor={3} />}
                {/* En la tabla de escritorio «Elegido» no cabe a 19 px: ahí basta la palomita (el lector oye aria-pressed). */}
                {(ancha || !puesto) && (
                  <span className="truncate">
                    {puesto ? t.calElegido : t.calLibre}
                    {ancha && h.duracion > 1 && ` · ${h.hora}–${horaFin(h.hora, h.duracion)}`}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      );
    case "tuClase":
      return (
        <div className={`${CASILLA} border-2 border-marca-tinta bg-white px-1 text-[15px] font-bold text-marca-tinta`}>{t.calTuClase}</div>
      );
    case "ocupado":
      return <div className={`${CASILLA} bg-marca-tinta/[0.09] px-1 text-[15px] font-semibold text-marca-tinta`}>{t.calOcupado}</div>;
    case "noDisponible":
      return (
        <div className={`${CASILLA} border-[1.5px] border-dashed border-[#A9B8AE] bg-white`}>
          <span className="sr-only">{t.calNoDisponible}</span>
        </div>
      );
    case "pasada":
      return (
        <div className={`${CASILLA} bg-[repeating-linear-gradient(135deg,#F4F7F4_0,#F4F7F4_6px,#E4EAE5_6px,#E4EAE5_8px)]`}>
          <span className="sr-only">{t.calPasada}</span>
        </div>
      );
    case "fuera":
      return (
        <div className={`${CASILLA} bg-[#F4F7F4]`}>
          <span className="sr-only">{t.calFuera}</span>
        </div>
      );
    case "vacia":
      return <div aria-hidden className="min-h-[48px]" />;
  }
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
      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-[1.5px] ${FOCO} ${
        desactivada
          ? "cursor-not-allowed border-marca-borde bg-marca-niebla text-marca-tinta/30"
          : "border-marca-borde bg-white text-marca-tinta hover:border-marca-verde"
      }`}
    >
      <svg
        aria-hidden
        viewBox="0 0 24 24"
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d={direccion === "atras" ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7"} />
      </svg>
    </button>
  );
}

function BotonDia<H>({ d, t, activo, alPulsar }: { d: DiaCalendario<H>; t: TextosAutoservicio; activo: boolean; alPulsar: () => void }) {
  const nombre = d.fecha ? t.diaConFecha(d.fecha) : t.diaSemanal(d.dia);
  return (
    <button
      type="button"
      data-dia={d.clave}
      onClick={alPulsar}
      aria-pressed={activo}
      aria-label={`${nombre}, ${t.calLibres(d.libres)}`}
      className={`flex min-h-[60px] min-w-[56px] shrink-0 snap-start flex-col items-center justify-center gap-0.5 rounded-[14px] border-[1.5px] px-2 ${FOCO} ${
        activo
          ? "border-marca-verdeOsc bg-marca-verdeOsc text-white"
          : d.pasado
            ? "border-marca-borde bg-marca-niebla text-marca-tinta"
            : "border-marca-borde bg-white text-marca-tinta"
      }`}
    >
      <span className="text-[14px] font-semibold">{t.diaCorto(d.dia)}</span>
      {d.fecha && <span className="text-[18px] font-bold leading-none tabular-nums">{partesFecha(d.fecha).numero}</span>}
      <span
        aria-hidden
        className={`mt-0.5 h-1.5 w-1.5 rounded-full ${d.libres > 0 ? (activo ? "bg-white" : "bg-marca-verde") : "bg-transparent"}`}
      />
    </button>
  );
}
