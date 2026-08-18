"use client";

import type { Temario } from "@/lib/temario";
import Banner from "@/components/Banner";

/**
 * El panel del plan, con la rejilla de puntos.
 *
 * Es la pieza que justifica el rediseño del curso: una casilla por
 * lección, agrupadas por mes, hace visible de un vistazo que el curso
 * son seis meses y por dónde va. La rejilla plana de 47 tarjetas no
 * decía nada de eso.
 *
 * Cada celda de mes es un botón: abre ese mes en el temario y baja hasta
 * él. Nunca lo cierra — se usa para ir a un sitio, no para alternar.
 *
 * LA FORMA ES LA DE `components/Banner.tsx`, la misma franja que el
 * curso del inicio y la práctica. Antes esto tenía su propio verde-negro
 * y su propio botón: el curso se veía como otro producto. Lo único
 * propio que queda es qué se cuenta.
 *
 * SU COLUMNA DERECHA ES MÁS ANCHA QUE LA DEL RESTO. En los 210px de la
 * cifra caben un porcentaje y una barra, pero no seis meses de puntos:
 * apretados ahí no se distinguen de una mancha, y la rejilla existe
 * precisamente para poder distinguirlos. Por eso el banner deja mover
 * esa medida.
 */

/** Lo que mide la columna de la rejilla cuando hay sitio para ella. */
const ANCHO_REJILLA = "520px";

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

  const titulo = actual
    ? `Mes ${actual.mes} · Semana ${actual.semana} · Módulo ${actual.modulo}`
    : temario.totalLecciones > 0
      ? "Has terminado el curso"
      : "Todavía sin contenido";

  return (
    <div className="mt-4 min-[900px]:mt-6">
      <Banner
        eyebrow={`Tu plan de ${meses.length} ${meses.length === 1 ? "mes" : "meses"}`}
        title={titulo}
        subtitle={actual?.titulo}
        action={
          actual?.destino
            ? {
                label: "Continuar",
                href: `/curso/${slug}/${actual.destino}`,
                srSuffix: actual.titulo,
              }
            : undefined
        }
        secondaryText={
          actual
            ? `${actual.completadas} de ${actual.totalLecciones} lecciones en este módulo`
            : undefined
        }
        asideWidth={meses.length > 0 ? ANCHO_REJILLA : "210px"}
        aside={
          <>
            <p className="flex items-baseline gap-1">
              <span className="font-display text-[40px] font-extrabold leading-none text-white tabular-nums">
                {temario.porcentaje}
              </span>
              <span className="text-[14px] font-semibold text-white/[0.82]">%</span>
            </p>
            <p className="mt-1 text-[13px] text-white/[0.82] tabular-nums">
              llevas {temario.completadas} de {temario.totalLecciones} lecciones
            </p>

            {/* --------------------- LA REJILLA POR MES ---------------------
                Once puntos por fila: es lo que hace que 44 lecciones y 13
                ocupen anchos comparables y el mes se lea como densidad. */}
            {meses.length > 0 && (
              <div className="mt-[18px] grid grid-cols-3 gap-3 min-[900px]:gap-[18px]">
                {meses.map((mes) => (
                  <button
                    key={mes.numero}
                    type="button"
                    onClick={() => onIrAlMes(mes.numero)}
                    className="block rounded-[4px] text-left"
                  >
                    <span className="mb-[7px] flex items-center justify-between gap-1.5 min-[900px]:mb-2.5">
                      <span className="text-[9.5px] font-extrabold uppercase leading-none tracking-[0.14em] text-white min-[900px]:text-[10.5px] min-[900px]:tracking-[0.16em]">
                        Mes {mes.numero}
                      </span>
                      <span className="hidden text-[10.5px] font-bold text-white/[0.82] tabular-nums min-[900px]:inline">
                        {mes.porcentaje}%
                      </span>
                    </span>

                    <span className="grid grid-cols-11 gap-[2.5px] min-[900px]:gap-[3px]">
                      {mes.puntos.map((hecha, i) => (
                        <span
                          key={i}
                          className={`block aspect-square rounded-[1.5px] ${
                            hecha ? "bg-white" : "bg-white/[0.32]"
                          }`}
                        />
                      ))}
                    </span>

                    <span className="mt-2.5 hidden text-[11px] font-medium text-white/[0.82] min-[900px]:block">
                      {mes.totalModulos} {mes.totalModulos === 1 ? "módulo" : "módulos"}
                    </span>

                    <span className="sr-only">
                      {mes.completadas} de {mes.totalLecciones} lecciones hechas. Ir al mes{" "}
                      {mes.numero}.
                    </span>
                  </button>
                ))}
              </div>
            )}
          </>
        }
      />
    </div>
  );
}
