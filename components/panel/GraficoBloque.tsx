"use client";

// ---------------------------------------------------------------
// EL GRÁFICO DE UNA CIFRA, POR SEMANAS O POR MESES
//
// Las dos vistas llegan ya calculadas del servidor —los alumnos únicos de
// cada mes los cuenta la base, no se suman semanas aquí— y el conmutador
// solo elige cuál se pinta. «Ver como tabla» enseña la misma vista que el
// gráfico, con la diferencia de cada periodo con el anterior.
// ---------------------------------------------------------------

import { useState } from "react";
import { Columnas, LineaPorcentaje, type Proporcion, type PuntoEje } from "@/components/panel/graficos";
import { Segmentado, TablaVista } from "@/components/panel/piezas";

export type Vista = {
  puntos: PuntoEje[];
  /** El índice del periodo a medias, o null. */
  enCurso: number | null;
  tabla: { cabeceras: string[]; filas: string[][] };
} & ({ tipo: "linea"; valores: Proporcion[]; unidad: string } | { tipo: "columnas"; nombre: string; valores: (number | null)[] });

type Modo = "semanas" | "meses";

const MODOS: { id: Modo; nombre: string }[] = [
  { id: "semanas", nombre: "Semanas" },
  { id: "meses", nombre: "Meses" },
];

export default function GraficoBloque({ semanas, meses, aria }: { semanas: Vista; meses: Vista; aria: string }) {
  const [modo, setModo] = useState<Modo>("semanas");
  const v = modo === "semanas" ? semanas : meses;
  const etiqueta = `${aria}, ${modo === "semanas" ? "por semana" : "por mes"}`;

  return (
    <div className="mt-3">
      <Segmentado opciones={MODOS} valor={modo} alElegir={setModo} etiqueta="Ver el gráfico por" />
      {v.tipo === "linea" ? (
        <LineaPorcentaje puntos={v.puntos} valores={v.valores} unidad={v.unidad} alto={160} aria={etiqueta} enCurso={v.enCurso} />
      ) : (
        <Columnas puntos={v.puntos} series={[{ nombre: v.nombre, valores: v.valores }]} alto={160} aria={etiqueta} enCurso={v.enCurso} />
      )}
      <TablaVista cabeceras={v.tabla.cabeceras} filas={v.tabla.filas} />
    </div>
  );
}
