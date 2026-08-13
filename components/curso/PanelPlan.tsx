"use client";

import Link from "next/link";
import type { Temario } from "@/lib/temario";

/**
 * El panel oscuro del plan, con la rejilla de puntos.
 *
 * Es la pieza que justifica el rediseño: una casilla por lección,
 * agrupadas en seis columnas, hace visible de un vistazo que el curso
 * son seis meses y por dónde va. La rejilla plana de 47 tarjetas no
 * decía nada de eso.
 *
 * Cada celda de mes es un botón: abre ese mes en el temario y baja hasta
 * él. Nunca lo cierra — se usa para ir a un sitio, no para alternar.
 */
export default function PanelPlan({
  temario,
  slug,
  onIrAlMes,
}: {
  temario: Temario;
  slug: string;
  onIrAlMes: (mes: number) => void;
}) {
  const { actual, meses } = temario;

  return (
    <section className="mt-4 rounded-[18px] bg-temario-oscuro px-[18px] pb-4 pt-[18px] text-white min-[900px]:mt-6 min-[900px]:rounded-[20px] min-[900px]:px-[34px] min-[900px]:pb-[26px] min-[900px]:pt-[30px]">
      <div className="flex items-center gap-[7px] min-[900px]:gap-2">
        <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-temario-ambar min-[900px]:h-[7px] min-[900px]:w-[7px]" />
        <span className="text-[10px] font-extrabold uppercase leading-none tracking-[0.16em] text-temario-ambar min-[900px]:text-[11px] min-[900px]:tracking-[0.18em]">
          Tu plan de {meses.length} {meses.length === 1 ? "mes" : "meses"}
        </span>
      </div>

      {/* ------------------------- POSICIÓN Y TOTAL ------------------------- */}
      <div className="mt-3 flex items-end justify-between gap-4 min-[900px]:mt-0 min-[900px]:items-start min-[900px]:gap-12">
        <div className="min-w-0">
          {actual ? (
            <>
              <p className="text-[19px] font-extrabold leading-[1.15] tracking-[-0.02em] min-[900px]:mt-[14px] min-[900px]:text-[30px]">
                Mes {actual.mes} · Semana {actual.semana} · Módulo {actual.modulo}
              </p>
              <p className="mt-1 max-w-[200px] text-pretty text-[12.5px] font-medium text-temario-oscuroTexto min-[900px]:mt-2 min-[900px]:max-w-none min-[900px]:text-[15px]">
                {actual.titulo}
              </p>
            </>
          ) : (
            <p className="text-[19px] font-extrabold leading-[1.15] tracking-[-0.02em] min-[900px]:mt-[14px] min-[900px]:text-[30px]">
              {temario.totalLecciones > 0 ? "Has terminado el curso" : "Todavía sin contenido"}
            </p>
          )}
        </div>

        <div className="shrink-0 text-right">
          <p className="flex items-baseline justify-end gap-[3px] min-[900px]:gap-1">
            <span className="text-[28px] font-extrabold leading-none tracking-[-0.03em] tabular-nums min-[900px]:text-[44px]">
              {temario.porcentaje}
            </span>
            <span className="text-[13px] font-semibold text-temario-oscuroTenue min-[900px]:text-[17px]">%</span>
          </p>
          <p className="mt-1.5 hidden text-[13px] font-medium text-temario-oscuroTenue tabular-nums min-[900px]:block">
            llevas {temario.completadas} de {temario.totalLecciones} lecciones
          </p>
        </div>
      </div>

      {/* En escritorio el botón va aquí, bajo la posición. En móvil baja
          al final del panel, a ancho completo, que es donde el pulgar
          llega sin recolocar la mano. */}
      {actual?.destino && (
        <div className="mt-[22px] hidden items-center gap-4 min-[900px]:flex">
          <Link
            href={`/curso/${slug}/${actual.destino}`}
            className="inline-flex items-center rounded-full bg-temario-verde px-[26px] py-[13px] text-[15px] font-bold text-white transition-colors hover:bg-temario-verdeHover"
          >
            Continuar
          </Link>
          <span className="text-[13.5px] font-medium text-temario-oscuroTenue tabular-nums">
            {actual.completadas} de {actual.totalLecciones} lecciones en este módulo
          </span>
        </div>
      )}

      {/* --------------------- REJILLA DE PUNTOS POR MES --------------------- */}
      {meses.length > 0 && (
        <div className="mt-4 grid grid-cols-3 gap-3 border-temario-oscuroLinea min-[900px]:mt-[30px] min-[900px]:grid-cols-6 min-[900px]:gap-[18px] min-[900px]:border-t min-[900px]:pt-6">
          {meses.map((mes) => (
            <button
              key={mes.numero}
              type="button"
              onClick={() => onIrAlMes(mes.numero)}
              className="block text-left"
            >
              <span className="mb-[7px] flex items-center justify-between gap-1.5 min-[900px]:mb-2.5">
                <span className="text-[9.5px] font-extrabold uppercase leading-none tracking-[0.14em] text-temario-oscuroClaro min-[900px]:text-[10.5px] min-[900px]:tracking-[0.16em]">
                  Mes {mes.numero}
                </span>
                <span className="hidden text-[10.5px] font-bold text-temario-oscuroTenue tabular-nums min-[900px]:inline">
                  {mes.porcentaje}%
                </span>
              </span>

              {/* Once por fila: es lo que hace que 44 lecciones y 13
                  ocupen anchos comparables y el mes se lea como densidad. */}
              <span className="grid grid-cols-11 gap-[2.5px] min-[900px]:gap-[3px]">
                {mes.puntos.map((hecha, i) => (
                  <span
                    key={i}
                    className={`block aspect-square rounded-[1.5px] ${
                      hecha ? "bg-temario-punto" : "bg-temario-puntoOff"
                    }`}
                  />
                ))}
              </span>

              <span className="mt-2.5 hidden text-[11px] font-medium text-temario-oscuroTenue min-[900px]:block">
                {mes.totalModulos} {mes.totalModulos === 1 ? "módulo" : "módulos"}
              </span>
              <span className="sr-only">
                {mes.completadas} de {mes.totalLecciones} lecciones hechas. Ir al mes {mes.numero}.
              </span>
            </button>
          ))}
        </div>
      )}

      {actual?.destino && (
        <div className="mt-4 flex items-center gap-3 min-[900px]:hidden">
          <Link
            href={`/curso/${slug}/${actual.destino}`}
            className="flex flex-1 items-center justify-center rounded-full bg-temario-verde px-5 py-3 text-[14px] font-bold text-white transition-colors hover:bg-temario-verdeHover"
          >
            Continuar
          </Link>
          <span className="text-right text-[11.5px] font-medium text-temario-oscuroTenue tabular-nums">
            llevas {temario.completadas} de {temario.totalLecciones} lecciones
          </span>
        </div>
      )}
    </section>
  );
}
