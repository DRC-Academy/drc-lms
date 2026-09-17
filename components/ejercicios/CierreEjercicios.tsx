"use client";

import type { ReactNode } from "react";
import type { EjercicioUnificado } from "@/lib/ejercicio-unificado";
import type { TextosEjercicios } from "@/lib/textos/ejercicios";

/**
 * LA PANTALLA DE CIERRE, la misma para el curso y para el bloque.
 *
 * Etiqueta, resultado, una frase, la lista de ejercicios con cómo fue
 * cada uno y un «Ver» para volver a leer la corrección, y debajo los
 * botones. Lo que cambia entre las dos fuentes es qué dicen la etiqueta
 * y la frase, y qué botones hay: la lección completa y sigue, el bloque
 * vuelve a «Para ti» o se repite. Todo eso entra por props; el mueble
 * es uno.
 *
 * Antes el bloque tenía su propio cierre —una tarjeta centrada con el
 * porcentaje en un círculo, en la paleta vieja— y era la última pieza
 * que se veía de otro producto.
 */
export default function CierreEjercicios({
  etiqueta,
  titulo,
  texto,
  ejercicios,
  acertado,
  verEjercicio,
  acciones,
  pie,
  t,
}: {
  /** «Ejercicios terminados», «Bloque terminado». */
  etiqueta: string;
  /** «Acertaste 7 de 10.» */
  titulo: string;
  texto: string;
  ejercicios: EjercicioUnificado[];
  acertado: (i: number) => boolean;
  verEjercicio: (i: number) => void;
  /** Los botones: el principal y, si lo hay, el secundario. */
  acciones: ReactNode;
  /** Un enlace de texto debajo de los botones, si hace falta. */
  pie?: ReactNode;
  t: TextosEjercicios;
}) {
  return (
    <div className="w-full">
      <p className="text-[11.5px] font-semibold uppercase leading-none tracking-[0.1em] text-marca-grisSuave">
        {etiqueta}
      </p>
      <h2 className="mt-3 text-pretty font-display text-[25px] font-bold leading-[1.15] text-marca-tinta min-[900px]:text-[34px]">
        {titulo}
      </h2>
      <p className="mt-3 text-pretty text-[16px] leading-[1.6] text-marca-gris min-[900px]:text-[17px]">
        {texto}
      </p>

      <ol className="mt-7 overflow-hidden rounded-[16px] border border-marca-borde bg-white">
        {ejercicios.map((ej, i) => (
          <li
            key={ej.id}
            className="flex items-center gap-3 border-b border-marca-nieblaOscura px-[18px] py-3.5 last:border-b-0"
          >
            <span
              aria-hidden
              className={`grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full text-[11px] font-semibold leading-none text-white ${
                acertado(i) ? "bg-marca-verde" : "bg-marca-calido"
              }`}
            >
              {acertado(i) ? "✓" : "—"}
            </span>
            <span className="min-w-0 flex-1 truncate text-[15px] text-marca-tintaCuerpo">
              {/* Los huecos del cloze, como rayas: el enunciado los trae
                  como {{1}} y eso no es para leer. */}
              {ej.enunciado.replace(/\{\{\d+\}\}/g, "___").split("\n")[0]}
            </span>
            <button
              type="button"
              onClick={() => verEjercicio(i)}
              className="shrink-0 text-[13.5px] font-semibold text-marca-verdeOsc transition-colors hover:text-marca-tinta"
            >
              {t.ver}
            </button>
          </li>
        ))}
      </ol>

      <div className="mt-7 flex flex-col gap-3.5 min-[900px]:flex-row">{acciones}</div>

      {pie}
    </div>
  );
}
