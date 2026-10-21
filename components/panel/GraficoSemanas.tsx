"use client";

// ---------------------------------------------------------------
// SEMANA A SEMANA
//
// Un solo gráfico, con dos métricas a elegir: el % de alumnos con clase
// que la abrieron con el botón (línea) y los accesos totales (columnas).
// Llegan ya calculadas del servidor; aquí solo se elige cuál se ve. Las
// semanas sin datos (antes del 13 oct o del 20 oct) van como hueco, no
// como cero.
// ---------------------------------------------------------------

import { useState } from "react";
import { Columnas, LineaPorcentaje, type Proporcion, type PuntoEje } from "@/components/panel/graficos";
import { AvisoParcial, Segmentado, TablaVista } from "@/components/panel/piezas";
import { numero, porcentaje } from "@/lib/panel-formato";

type Metrica = "clase" | "accesos";

export default function GraficoSemanas({
  puntos,
  clase,
  accesos,
  notaClase,
  notaAccesos,
}: {
  puntos: PuntoEje[];
  /** Alumnos con clase que la abrieron con el botón, de los que tuvieron clase. */
  clase: Proporcion[];
  accesos: (number | null)[];
  notaClase: string | null;
  notaAccesos: string | null;
}) {
  const [m, setM] = useState<Metrica>("clase");
  return (
    <>
      <div className="mt-3.5">
        <Segmentado
          etiqueta="Métrica"
          opciones={[
            { id: "clase", nombre: "% de alumnos que entran con el botón" },
            { id: "accesos", nombre: "Accesos totales" },
          ]}
          valor={m}
          alElegir={setM}
        />
      </div>
      {m === "clase" ? (
        <>
          <LineaPorcentaje puntos={puntos} valores={clase} unidad="alumnos con clase" alto={230} aria="Porcentaje de alumnos con clase que la abrieron con el botón, por semana" />
          {notaClase && <AvisoParcial>{notaClase}</AvisoParcial>}
          <TablaVista
            cabeceras={["Semana", "Alumnos con clase", "Entraron con el botón", "%"]}
            filas={puntos.map((p, i) => {
              const v = clase[i];
              return v === null
                ? [p.titulo, "sin datos", "sin datos", "—"]
                : [p.titulo, numero(v.base), numero(v.parte), v.base ? `${porcentaje(v.parte, v.base)} %` : "—"];
            })}
          />
        </>
      ) : (
        <>
          <Columnas puntos={puntos} series={[{ nombre: "Accesos totales", valores: accesos }]} alto={230} aria="Accesos totales a la plataforma, por semana" />
          {notaAccesos && <AvisoParcial>{notaAccesos}</AvisoParcial>}
          <TablaVista
            cabeceras={["Semana", "Accesos totales"]}
            filas={puntos.map((p, i) => [p.titulo, accesos[i] === null ? "sin datos" : numero(accesos[i] as number)])}
          />
        </>
      )}
    </>
  );
}
