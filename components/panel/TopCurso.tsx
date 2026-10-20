"use client";

// ---------------------------------------------------------------
// «CON MÁS ACTIVIDAD»: CURSOS O MÓDULOS
//
// Los dos tops vienen del servidor (`panel_top`); aquí solo se elige.
// ---------------------------------------------------------------

import { useState } from "react";
import { Segmentado } from "@/components/panel/piezas";
import { numero } from "@/lib/panel-formato";

export type FilaTopVista = { id: string; titulo: string; curso: string | null; lecciones: number; alumnos: number };

export default function TopCurso({ cursos, modulos }: { cursos: FilaTopVista[]; modulos: FilaTopVista[] }) {
  const [agrupar, setAgrupar] = useState<"cursos" | "modulos">("cursos");
  const lista = agrupar === "cursos" ? cursos : modulos;
  const max = Math.max(1, ...lista.map((f) => f.lecciones));
  return (
    <div className="mt-5 border-t border-marca-nieblaOscura pt-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h3 className="font-display text-[14.5px] font-semibold text-marca-tinta">Con más actividad</h3>
        <Segmentado
          etiqueta="Agrupar por"
          opciones={[
            { id: "cursos", nombre: "Cursos" },
            { id: "modulos", nombre: "Módulos" },
          ]}
          valor={agrupar}
          alElegir={setAgrupar}
        />
      </div>
      {lista.length === 0 ? (
        <p className="mt-3 text-[13.5px] text-marca-grisSuave">Ninguna lección completada en este rango.</p>
      ) : (
        <ol className="mt-3 grid gap-2.5">
          {lista.map((f) => (
            <li key={f.id} className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 text-[13.5px]">
              <span className="min-w-0 text-marca-tinta">
                {f.titulo}
                {f.curso && <span className="text-marca-grisSuave"> · {f.curso}</span>}
              </span>
              <span className="whitespace-nowrap text-right tabular-nums">
                <b className="font-semibold text-marca-tinta">{numero(f.lecciones)}</b>
                <span className="text-marca-grisSuave"> · {numero(f.alumnos)} {f.alumnos === 1 ? "alumno único" : "alumnos únicos"}</span>
              </span>
              <div className="col-span-2 h-2 overflow-hidden rounded-[4px] bg-marca-nieblaOscura">
                <div className="h-full rounded-r-[4px] bg-marca-verde" style={{ width: `${(f.lecciones / max) * 100}%` }} />
              </div>
            </li>
          ))}
        </ol>
      )}
      <p className="mt-2 text-[12px] text-marca-grisSuave">Lecciones completadas en el rango, y los alumnos únicos que las completaron.</p>
    </div>
  );
}
