"use client";

import Link from "next/link";
import { useState } from "react";
import type { FichaPanel } from "@/lib/admin-servidor";

/**
 * Una cifra del panel que se abre y enseña a quién representa.
 *
 * Es el patrón que se repite en todo el panel, y el que lo hace útil:
 * "38 sin transcript" es un dato, pero "estos 38, con su profesor y un
 * enlace a su ficha" es algo sobre lo que actuar. Sin el desplegable el
 * panel sería un tablero bonito del que no sale ninguna tarea.
 *
 * La lista llega entera del servidor. No hay carga diferida a propósito:
 * son 174 alumnos como mucho, y una petición por cada vez que alguien
 * pulsa una cifra costaría más que enviarlas de una.
 */
export default function ListaAlumnos({
  alumnos,
  vacio,
  /** Texto extra por alumno, como "4 bloques". */
  detalle,
}: {
  alumnos: FichaPanel[];
  /** Qué decir cuando no hay nadie. Cambia mucho según la lista. */
  vacio: string;
  detalle?: (alumno: FichaPanel) => string;
}) {
  const [abierto, setAbierto] = useState(false);

  if (alumnos.length === 0) {
    return <p className="mt-3 text-[13px] leading-[1.45] text-marca-grisSuave">{vacio}</p>;
  }

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full border border-marca-borde bg-white px-3.5 text-[12.5px] font-semibold text-marca-gris transition-colors hover:border-marca-verde hover:text-marca-verdeOsc"
      >
        {abierto ? "Ocultar" : `Ver ${alumnos.length === 1 ? "el alumno" : "los alumnos"}`}
        <span aria-hidden className="text-[9px]">
          {abierto ? "▲" : "▼"}
        </span>
      </button>

      {abierto && (
        <ul className="aparece mt-2.5 flex max-h-[320px] flex-col gap-1 overflow-y-auto pr-1">
          {alumnos.map((alumno) => (
            <li key={alumno.alumnoId}>
              <Link
                href={`/alumno/${alumno.alumnoId}`}
                className="flex items-center gap-3 rounded-[10px] border border-marca-borde bg-white px-3 py-2 transition-colors hover:border-marca-verde hover:bg-marca-verdeFondo"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13.5px] font-semibold text-marca-tinta">
                    {alumno.nombre || "Sin nombre"}
                  </span>
                  <span className="mt-0.5 block truncate text-[11.5px] text-marca-grisSuave">
                    {alumno.nivel || "sin nivel"}
                    {alumno.profesor ? ` · ${alumno.profesor}` : ""}
                  </span>
                </span>
                {detalle && (
                  <span className="shrink-0 text-[12px] font-semibold text-marca-verdeOsc tabular-nums">
                    {detalle(alumno)}
                  </span>
                )}
                <span aria-hidden className="shrink-0 text-[13px] text-marca-grisTenue">
                  →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
