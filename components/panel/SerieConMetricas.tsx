"use client";

// ---------------------------------------------------------------
// «DÍA A DÍA» / «SEMANA A SEMANA»: LA SERIE CON SU MÉTRICA
//
// Las cuatro métricas llegan ya calculadas del servidor; aquí solo se
// elige cuál se ve. Cada una trae sus dos series, su nota (si el dato
// no existía en todo el rango) y la tabla.
// ---------------------------------------------------------------

import { useState } from "react";
import { Columnas, type PuntoEje, type Serie } from "@/components/panel/graficos";
import { AvisoParcial, Leyenda, Segmentado, TablaVista } from "@/components/panel/piezas";
import { COLOR_SERIE, numero } from "@/lib/panel-formato";

export type MetricaSerie = {
  id: string;
  boton: string;
  series: Serie[];
  /** Aviso de datos parciales o de cambio de método; null si no hace falta. */
  nota: string | null;
  aria: string;
};

export default function SerieConMetricas({ puntos, metricas }: { puntos: PuntoEje[]; metricas: MetricaSerie[] }) {
  const [id, setId] = useState(metricas[0].id);
  const m = metricas.find((x) => x.id === id) ?? metricas[0];
  return (
    <>
      <div className="mt-3.5">
        <Segmentado etiqueta="Métrica" opciones={metricas.map((x) => ({ id: x.id, nombre: x.boton }))} valor={id} alElegir={setId} />
      </div>
      <Leyenda nombres={m.series.map((s) => s.nombre)} colores={COLOR_SERIE} />
      <Columnas puntos={puntos} series={m.series} alto={250} aria={m.aria} />
      {m.nota && <AvisoParcial>{m.nota}</AvisoParcial>}
      <TablaVista
        cabeceras={["Periodo", ...m.series.map((s) => s.nombre)]}
        filas={puntos.map((p, i) => [p.titulo, ...m.series.map((s) => (s.valores[i] === null ? "sin datos" : numero(s.valores[i] as number)))])}
      />
    </>
  );
}
