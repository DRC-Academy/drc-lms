// ---------------------------------------------------------------
// EL CALENDARIO DE «CLASES»
//
// Esta semana y las tres siguientes, coordinado con Gestión: las clases
// salen de `semanasDelAlumno` (`lib/clases.ts`), que es la misma lógica
// que da la próxima clase —la del «Mis clases» del profesor, copiada en
// `lib/calendario-gestion.ts`— con su estado encima.
//
// DOS FORMAS, UNA SOLA FUENTE:
//
//   · escritorio (≥900px, el corte de la navegación): la semana en siete columnas. Las filas cubren
//     solo las horas en las que el alumno tiene clase en estas cuatro
//     semanas, con una de margen por cada lado: nada de filas vacías de
//     madrugada. La misma rejilla para las cuatro, para que no salte al
//     cambiar de semana.
//   · móvil: la agenda, un día debajo de otro con sus clases. La rejilla
//     de siete columnas no cabe en 375px y no se intenta.
//
// La semana se cambia con enlaces (`?semana=`), así que todo se calcula
// en el servidor, como el resto de «Clases». La clase que tiene la sala
// abierta lleva el mismo botón que el banner (`BotonClase`), y con él el
// enlace solo sale en el HTML mientras la ventana está abierta.
// ---------------------------------------------------------------

import Link from "next/link";
import {
  ventanaAbierta,
  type ClaseCalendario,
  type DiaCalendario,
  type SemanaCalendario,
  DIAS,
} from "@/lib/clases";
import type { TextosClases } from "@/lib/textos/clases";
import { BotonClase } from "@/components/clases/BannerClase";

/** Alto de una hora en la rejilla de escritorio. */
const ALTO_HORA = 60;

export default function CalendarioClases({
  semanas,
  indice,
  hrefSemana,
  t,
  ahora,
}: {
  semanas: SemanaCalendario[];
  /** La semana que se enseña: 0 es la actual. */
  indice: number;
  /** El enlace a otra semana, con el foco de revisión si lo hay. */
  hrefSemana: (indice: number) => string;
  t: TextosClases;
  ahora: Date;
}) {
  const semana = semanas[indice];
  const hayClases = semana.dias.some((d) => d.clases.length > 0);
  const rango = rangoDeHoras(semanas);

  return (
    <section className="flex flex-col gap-4" aria-labelledby="titulo-calendario">
      <header className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <h2 id="titulo-calendario" className="font-display text-[22px] font-bold leading-tight text-marca-tinta lg:text-[24px]">
            {t.calendario}
          </h2>
          <p className="mt-1 text-[15px] text-marca-tintaMedia">
            <span className="font-semibold text-marca-tinta">
              {indice === 0 ? `${t.estaSemana} · ` : ""}
              {t.rangoSemana(partes(semana.lunes), partes(semana.domingo))}
            </span>{" "}
            <span className="text-[13px] text-marca-grisSuave">{t.horaDeMadrid}</span>
          </p>
        </div>

        <nav className="flex items-center gap-2" aria-label={t.calendario}>
          <FlechaSemana
            href={indice > 0 ? hrefSemana(indice - 1) : null}
            etiqueta={t.semanaAnterior}
            direccion="atras"
          />
          <span className="min-w-[3.5rem] text-center text-[13px] font-semibold tabular-nums text-marca-gris">
            {indice + 1} / {semanas.length}
          </span>
          <FlechaSemana
            href={indice < semanas.length - 1 ? hrefSemana(indice + 1) : null}
            etiqueta={t.semanaSiguiente}
            direccion="adelante"
          />
        </nav>
      </header>

      {!hayClases ? (
        <p className="rounded-[22px] border border-marca-borde bg-white px-5 py-4 text-[15px] text-marca-tintaMedia">
          {t.semanaSinClases}
        </p>
      ) : (
        <>
          <Agenda semana={semana} t={t} ahora={ahora} />
          <Rejilla semana={semana} rango={rango} t={t} ahora={ahora} />
        </>
      )}
    </section>
  );
}

// ---------------------------------------------------------------
// MÓVIL: LA AGENDA
// ---------------------------------------------------------------

function Agenda({ semana, t, ahora }: { semana: SemanaCalendario; t: TextosClases; ahora: Date }) {
  return (
    <ol className="flex flex-col gap-5 min-[900px]:hidden">
      {semana.dias
        .filter((d) => d.clases.length > 0)
        .map((dia) => {
          const { dia: numero, mes } = partes(dia.fecha);
          return (
            <li key={dia.fecha} className="flex flex-col gap-2.5">
              <h3 className="flex items-center gap-2 font-display text-[17px] font-bold text-marca-tinta first-letter:uppercase">
                <span className="first-letter:uppercase">{t.diaAgenda(nombreDia(dia), numero, mes)}</span>
                {dia.esHoy && <ChapaHoy t={t} />}
              </h3>
              <ul className="flex flex-col gap-2.5">
                {dia.clases.map((c) => (
                  <li key={`${c.fecha}-${c.desde}`}>
                    <TarjetaClase clase={c} t={t} ahora={ahora} />
                  </li>
                ))}
              </ul>
            </li>
          );
        })}
    </ol>
  );
}

function TarjetaClase({ clase, t, ahora }: { clase: ClaseCalendario; t: TextosClases; ahora: Date }) {
  const cancelada = clase.estado === "cancelada";
  const abierta = !cancelada && ventanaAbierta(clase, ahora);
  return (
    <div
      className={`flex flex-col gap-2.5 rounded-[18px] border px-4 py-3.5 ${
        cancelada
          ? "border-marca-borde bg-marca-niebla"
          : abierta
            ? "border-marca-verde bg-marca-verdeFondo"
            : "border-marca-borde bg-white"
      }`}
    >
      <div className="flex items-baseline justify-between gap-3">
        <p
          className={`font-display text-[20px] font-bold leading-none ${
            cancelada ? "text-marca-gris line-through decoration-[1.5px]" : "text-marca-tinta"
          }`}
        >
          {t.franja(clase.desde, clase.hasta)}
        </p>
        <span className="text-[13px] text-marca-grisSuave">{t.duracion(clase.horas)}</span>
      </div>
      {clase.profesor && (
        <p className={`text-[14.5px] ${cancelada ? "text-marca-gris" : "text-marca-tintaMedia"}`}>
          {t.con} <span className="font-semibold">{clase.profesor}</span>
        </p>
      )}
      <EtiquetaEstado clase={clase} t={t} />
      {abierta && <BotonClase proxima={clase} t={t} ahora={ahora} compacto />}
    </div>
  );
}

// ---------------------------------------------------------------
// ESCRITORIO: LA SEMANA EN SIETE COLUMNAS
// ---------------------------------------------------------------

function Rejilla({
  semana,
  rango,
  t,
  ahora,
}: {
  semana: SemanaCalendario;
  rango: { desde: number; hasta: number };
  t: TextosClases;
  ahora: Date;
}) {
  const horas = Array.from({ length: rango.hasta - rango.desde }, (_, i) => rango.desde + i);
  const alto = horas.length * ALTO_HORA;

  return (
    <div className="hidden overflow-hidden rounded-[22px] border border-marca-borde bg-white shadow-[0_18px_40px_-30px_rgba(18,33,26,0.45)] min-[900px]:block">
      {/* Cabecera: el día y su número; hoy, con la chapa. */}
      <div className="grid border-b border-marca-borde" style={{ gridTemplateColumns: "56px repeat(7, minmax(0, 1fr))" }}>
        <span />
        {semana.dias.map((dia) => {
          const { dia: numero } = partes(dia.fecha);
          return (
            <div
              key={dia.fecha}
              className={`flex flex-col items-center gap-1 border-l border-marca-borde py-2.5 ${dia.esHoy ? "bg-marca-verdeFondo" : ""}`}
            >
              <span className="text-[12px] font-semibold uppercase tracking-[0.08em] text-marca-gris">
                {t.diaCorto(nombreDia(dia))}
              </span>
              <span
                className={`grid h-8 min-w-[2rem] place-items-center rounded-full px-1.5 font-display text-[16px] font-bold ${
                  dia.esHoy ? "bg-marca-verde text-white" : "text-marca-tinta"
                }`}
              >
                {numero}
              </span>
            </div>
          );
        })}
      </div>

      {/* El cuerpo: las horas a la izquierda y un carril por día. */}
      <div className="grid" style={{ gridTemplateColumns: "56px repeat(7, minmax(0, 1fr))" }}>
        <div className="relative" style={{ height: alto }}>
          {horas.map((h, i) => (
            <span
              key={h}
              className="absolute right-2 -translate-y-1/2 text-[12px] tabular-nums text-marca-grisSuave"
              style={{ top: i * ALTO_HORA }}
            >
              {i === 0 ? "" : `${String(h).padStart(2, "0")}:00`}
            </span>
          ))}
        </div>

        {semana.dias.map((dia) => (
          <div
            key={dia.fecha}
            className={`relative border-l border-marca-borde ${dia.esHoy ? "bg-marca-verdeFondo/50" : ""}`}
            style={{ height: alto }}
          >
            {horas.slice(1).map((_, i) => (
              <span
                key={i}
                aria-hidden
                className="absolute inset-x-0 border-t border-dashed border-marca-nieblaOscura"
                style={{ top: (i + 1) * ALTO_HORA }}
              />
            ))}
            {dia.clases.map((c) => (
              <BloqueClase key={`${c.fecha}-${c.desde}`} clase={c} rango={rango} t={t} ahora={ahora} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function BloqueClase({
  clase,
  rango,
  t,
  ahora,
}: {
  clase: ClaseCalendario;
  rango: { desde: number; hasta: number };
  t: TextosClases;
  ahora: Date;
}) {
  const cancelada = clase.estado === "cancelada";
  const abierta = !cancelada && ventanaAbierta(clase, ahora);
  const [h, m] = clase.desde.split(":").map(Number);
  const top = (h + m / 60 - rango.desde) * ALTO_HORA;

  return (
    <div
      // `minHeight` y no `height`: el bloque mide lo que dura la clase,
      // y si el aviso de una reprogramación o el botón necesitan más, crece.
      className={`absolute inset-x-1.5 z-10 flex flex-col gap-1.5 rounded-[14px] border px-2.5 py-2 ${
        cancelada
          ? "border-marca-borde bg-marca-niebla"
          : abierta
            ? "border-marca-verde bg-white shadow-[0_4px_0_#14722A]"
            : clase.estado === "normal"
              ? "border-marca-verde/40 bg-marca-verdeFondo"
              : "border-marca-borde bg-white"
      }`}
      style={{ top: top + 3, minHeight: clase.horas * ALTO_HORA - 6 }}
    >
      <p
        className={`font-display text-[15px] font-bold leading-tight ${
          cancelada ? "text-marca-gris line-through decoration-[1.5px]" : "text-marca-tinta"
        }`}
      >
        {t.franja(clase.desde, clase.hasta)}
      </p>
      <p className="text-[12.5px] leading-snug text-marca-gris">
        {t.duracion(clase.horas)}
        {clase.profesor && (
          <>
            {" · "}
            <span className="font-semibold text-marca-tintaMedia">{clase.profesor}</span>
          </>
        )}
      </p>
      <EtiquetaEstado clase={clase} t={t} pequena />
      {abierta && <BotonClase proxima={clase} t={t} ahora={ahora} compacto />}
    </div>
  );
}

// ---------------------------------------------------------------
// PIEZAS
// ---------------------------------------------------------------

/** Lo que dice el estado. Una clase normal no lleva etiqueta. */
function EtiquetaEstado({ clase, t, pequena = false }: { clase: ClaseCalendario; t: TextosClases; pequena?: boolean }) {
  const tamano = pequena ? "text-[12px]" : "text-[13.5px]";

  if (clase.estado === "recuperacion") {
    return (
      <span className={`inline-flex w-fit items-center rounded-full border border-marca-verde/40 bg-marca-verdeFondo px-2.5 py-0.5 font-semibold text-marca-verdeOsc ${tamano}`}>
        {t.recuperacion}
      </span>
    );
  }

  if (clase.estado === "reprogramada" && clase.original) {
    const original = partes(clase.original);
    return (
      <p className={`leading-snug text-marca-tintaMedia ${tamano}`}>
        {t.reprogramada(
          { dia: DIAS[diaSemana(clase.original)], numero: original.dia },
          { dia: clase.dia, numero: partes(clase.fecha).dia },
          clase.desde
        )}
      </p>
    );
  }

  if (clase.estado === "cancelada") {
    return (
      <span className={`inline-flex w-fit items-center rounded-full bg-marca-nieblaOscura px-2.5 py-0.5 font-semibold text-marca-gris ${tamano}`}>
        {t.cancelada}
      </span>
    );
  }

  return null;
}

function ChapaHoy({ t }: { t: TextosClases }) {
  return (
    <span className="rounded-full bg-marca-verde px-2.5 py-0.5 font-sans text-[12px] font-bold uppercase tracking-[0.06em] text-white">
      {t.hoy}
    </span>
  );
}

function FlechaSemana({
  href,
  etiqueta,
  direccion,
}: {
  href: string | null;
  etiqueta: string;
  direccion: "atras" | "adelante";
}) {
  const icono = (
    <svg aria-hidden viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d={direccion === "atras" ? "M12.5 4.5 7 10l5.5 5.5" : "M7.5 4.5 13 10l-5.5 5.5"} />
    </svg>
  );
  const clases = "grid h-11 w-11 place-items-center rounded-full border transition-colors";

  if (!href) {
    return (
      <span aria-disabled="true" aria-label={etiqueta} className={`${clases} border-marca-borde text-marca-puntoPendiente`}>
        {icono}
      </span>
    );
  }
  return (
    <Link
      href={href}
      aria-label={etiqueta}
      scroll={false}
      className={`${clases} border-marca-borde bg-white text-marca-tinta hover:bg-marca-niebla focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marca-verdeOsc`}
    >
      {icono}
    </Link>
  );
}

/**
 * Las horas que cubre la rejilla: de la primera clase a la última de las
 * cuatro semanas, con una hora de margen por cada lado.
 */
function rangoDeHoras(semanas: SemanaCalendario[]): { desde: number; hasta: number } {
  let desde = 24;
  let hasta = 0;
  for (const s of semanas)
    for (const d of s.dias)
      for (const c of d.clases) {
        const inicio = Number(c.desde.split(":")[0]);
        desde = Math.min(desde, inicio);
        hasta = Math.max(hasta, inicio + Math.ceil(c.horas));
      }
  if (desde > hasta) return { desde: 9, hasta: 21 };
  return { desde: Math.max(0, desde - 1), hasta: Math.min(24, hasta + 1) };
}

function partes(fecha: string): { dia: number; mes: number } {
  const [, mes, dia] = fecha.split("-").map(Number);
  return { dia, mes: mes - 1 };
}

function diaSemana(fecha: string): number {
  return new Date(`${fecha}T00:00:00Z`).getUTCDay();
}

function nombreDia(dia: DiaCalendario) {
  return DIAS[diaSemana(dia.fecha)];
}
