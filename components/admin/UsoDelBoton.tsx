import Link from "next/link";
import type { UsoDelBoton } from "@/lib/entradas-clase-servidor";
import { porcentaje } from "@/lib/entradas-clase";

// ---------------------------------------------------------------
// «CLASES CON ENTRADA POR EL BOTÓN»: LA TARJETA
//
// La misma en el panel (con su periodo) y arriba de «Entradas a clase»
// (con su mes). La cuenta es una sola, `medirBoton`; aquí solo se pinta.
//
// LO PRINCIPAL ES EL PORCENTAJE DE CLASES, con la cifra absoluta debajo;
// el de alumnos va en pequeño. «Datos desde…» sale siempre que el rango
// se haya recortado al primer clic, y la nota de lo que no se cuenta,
// siempre: sin ella el número se lee como asistencia.
// ---------------------------------------------------------------

const ROTULO = "text-[10.5px] font-semibold uppercase leading-none tracking-[0.12em] text-marca-grisSuave";

const FORMATO_DIA_CORTO = new Intl.DateTimeFormat("es-ES", { timeZone: "UTC", day: "numeric", month: "short" });

/** "2026-10-13" → "13 oct". */
export function diaCorto(dia: string): string {
  return FORMATO_DIA_CORTO.format(new Date(`${dia}T12:00:00Z`)).replace(".", "");
}

export default function TarjetaUsoDelBoton({
  uso,
  contexto,
  hrefDetalle,
  hrefFaltas,
}: {
  uso: UsoDelBoton;
  /** De qué rango se habla: «Últimos 7 días», «octubre de 2026». */
  contexto: string;
  /** Enlace a «Entradas a clase». En la propia sección no se pasa. */
  hrefDetalle?: string;
  /** A dónde lleva el aviso de las faltas con clic. */
  hrefFaltas: string;
}) {
  return (
    <section className="rounded-[16px] border border-marca-borde bg-white px-4 py-3.5 lg:p-[22px]" aria-label="Clases con entrada por el botón">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <p className={ROTULO}>Clases con entrada por el botón</p>
        <p className="text-[11.5px] text-marca-grisTenue first-letter:uppercase">{contexto}</p>
      </div>

      <Cuerpo uso={uso} hrefFaltas={hrefFaltas} />

      <p className="mt-3 border-t border-marca-nieblaOscura pt-2.5 text-pretty text-[12px] leading-[1.45] text-marca-grisSuave">
        {uso.estado === "ok" && (
          <span className="font-semibold text-marca-gris">
            {uso.recortado ? `Datos desde el ${diaCorto(uso.desde)}` : `Del ${diaCorto(uso.desde)} al ${diaCorto(uso.hasta)}`}
            {" · "}
          </span>
        )}
        No cuenta a quien entra por el enlace de WhatsApp o Google Calendar.
        {hrefDetalle && (
          <>
            {" "}
            <Link href={hrefDetalle} className="font-semibold text-marca-verdeOsc hover:text-marca-tinta">
              Ver entradas
            </Link>
          </>
        )}
      </p>
    </section>
  );
}

function Cuerpo({ uso, hrefFaltas }: { uso: UsoDelBoton; hrefFaltas: string }) {
  if (uso.estado === "error") {
    return (
      <p className="mt-3 rounded-[12px] border border-marca-examenBorde bg-marca-examen px-4 py-3 text-[13px] leading-[1.45] text-marca-amarilloTexto">
        No se han podido leer las entradas o los partes de Gestión. No son ceros: son datos que no hemos podido leer.
      </p>
    );
  }

  if (uso.estado === "sin_datos") {
    return (
      <p className="mt-3 text-[13.5px] leading-[1.45] text-marca-gris">
        {uso.primerDia
          ? `Sin datos en este periodo: las entradas se registran desde el ${diaCorto(uso.primerDia)}.`
          : "Todavía no hay ninguna entrada registrada."}
      </p>
    );
  }

  const m = uso.medida;
  const pctClases = porcentaje(m.clasesConEntrada, m.clases);
  const pctAlumnos = porcentaje(m.alumnosConEntrada, m.alumnos);
  const faltas = m.faltasConClic.length;

  return (
    <div className="mt-2.5 lg:mt-3">
      <p className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
        <span className="font-display text-[38px] font-bold leading-none tabular-nums text-marca-tinta lg:text-[46px]">
          {pctClases === null ? "—" : `${pctClases}%`}
        </span>
        <span className="text-[14px] tabular-nums text-marca-gris">
          {m.clasesConEntrada} de {m.clases} {m.clases === 1 ? "clase" : "clases"}
        </span>
      </p>
      <p className="mt-1.5 text-pretty text-[12.5px] tabular-nums leading-[1.4] text-marca-gris">
        {m.alumnosConEntrada} de {m.alumnos} alumnos con clase usaron el botón
        {pctAlumnos !== null ? ` (${pctAlumnos}%)` : ""}
      </p>

      {faltas > 0 && (
        <Link
          href={hrefFaltas}
          className="mt-2.5 inline-flex min-h-[36px] items-center gap-1.5 rounded-full border border-marca-examenBorde bg-marca-examen px-3 text-[12.5px] font-semibold tabular-nums text-marca-amarilloTexto hover:border-marca-amarilloTexto"
        >
          <span aria-hidden>!</span>
          {faltas === 1
            ? "1 clase figura como falta sin aviso aunque el alumno pulsó «Unirse»"
            : `${faltas} clases figuran como falta sin aviso aunque el alumno pulsó «Unirse»`}
        </Link>
      )}
    </div>
  );
}
