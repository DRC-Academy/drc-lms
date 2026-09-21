"use client";

import { useMemo, useState } from "react";
import type { Bloque } from "@/lib/data";
import { bloqueDeBanco } from "@/lib/banco";
import { construirRuta, type ProgresoBloques } from "@/lib/ruta";
import { anotarParadaCerrada } from "@/lib/cierre-ruta";
import { usarIdioma } from "@/components/ProveedorIdioma";
import Ruta from "@/components/practica/Ruta";

/**
 * Banco de pruebas del camino de «Para ti» con la mascota: una ruta
 * falsa de ocho clases y los mandos para hacerla avanzar sin depender
 * de datos reales.
 *
 * Como /dev/mascota, cuelga del middleware y pide sesión. Reproduce lo
 * que pasa en el producto: «Completar parada» cierra el bloque de la
 * última clase, deja la nota de cierre (`anotarParadaCerrada`) y
 * VUELVE A MONTAR la ruta, que es lo que ocurre de verdad al volver de
 * la página del bloque; el presente pasa al candado y la mascota anda
 * hasta él. «Nueva clase» añade la clase siguiente —lo que hace el
 * generador—: la nueva parada ocupa el sitio del candado y la mascota
 * se desliza a su sitio. Ocho clases y se acaba: es un banco, no un
 * curso.
 */

const ALUMNO = "dev-ruta";
const TITULOS = [
  "Present simple vs continuous",
  "Will vs going to",
  "Past simple: irregulares",
  "Present perfect para experiencias",
  "Comparativos y superlativos",
  "Modales de obligación",
  "Estilo indirecto",
  "Condicionales 1 y 2",
];

export default function PaginaRuta() {
  const { t } = usarIdioma();
  const [clases, setClases] = useState(3);
  const [progreso, setProgreso] = useState<ProgresoBloques>({});
  const [candadoAbierto, setCandadoAbierto] = useState(false);
  const [remontar, setRemontar] = useState(true);
  const [montaje, setMontaje] = useState(0);

  const bloques = useMemo<Bloque[]>(() => {
    const base = bloqueDeBanco("B1");
    return TITULOS.slice(0, clases).map((titulo, i) => ({
      ...base,
      id: `dev-ruta-${i + 1}`,
      titulo,
      claseOrigen: { fecha: `2026-09-${String(3 + i * 2).padStart(2, "0")}`, profesor: "Laura" },
    }));
  }, [clases]);

  const paradas = construirRuta(bloques, progreso, candadoAbierto ? "abierta" : "cerrada", t.ruta);
  const actual = paradas.find((p) => p.tipo === "actual") ?? null;

  const completar = () => {
    if (!actual?.bloque) return;
    const id = actual.bloque.id;
    anotarParadaCerrada(id);
    setProgreso((previo) => ({ ...previo, [id]: { aciertos: 8, total: 10, fecha: new Date().toISOString() } }));
    if (remontar) setMontaje((n) => n + 1);
  };

  const nuevaClase = () => {
    if (clases >= TITULOS.length) return;
    setClases((n) => n + 1);
    if (remontar) setMontaje((n) => n + 1);
  };

  const reiniciar = () => {
    setClases(3);
    setProgreso({});
    try {
      window.localStorage.removeItem(`drc:mascota-parada:${ALUMNO}`);
      window.sessionStorage.removeItem(`drc:mascota-escena-ruta:${ALUMNO}`);
    } catch {
      // sin storage no hay nada que borrar
    }
    setMontaje((n) => n + 1);
  };

  const boton = "rounded-full border border-marca-borde bg-white px-4 py-2 text-[14px] font-semibold text-marca-tinta hover:bg-marca-niebla disabled:opacity-40";

  return (
    <main className="mx-auto flex w-full max-w-contenido flex-1 flex-col gap-6 px-4 pb-[140px] pt-6 lg:px-9">
      <div>
        <h1 className="font-display text-[26px] font-bold text-marca-tinta">La mascota en el camino</h1>
        <p className="mt-1 text-[14px] text-marca-gris">
          {clases} clases · {Object.keys(progreso).length} hechas · presente:{" "}
          <strong className="text-marca-tinta">{actual ? `parada ${actual.numero}` : "el candado"}</strong>
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-[13.5px] text-marca-gris">
        <button type="button" onClick={completar} disabled={actual === null} className={boton}>
          Completar parada
        </button>
        <button type="button" onClick={nuevaClase} disabled={clases >= TITULOS.length} className={boton}>
          Nueva clase
        </button>
        <button type="button" onClick={reiniciar} className={boton}>
          Reiniciar
        </button>
        <label className="ml-2 inline-flex items-center gap-2">
          <input type="checkbox" checked={remontar} onChange={(e) => setRemontar(e.target.checked)} />
          Volver a montar la ruta (como al volver del bloque)
        </label>
        <label className="inline-flex items-center gap-2">
          <input type="checkbox" checked={candadoAbierto} onChange={(e) => setCandadoAbierto(e.target.checked)} />
          Candado abierto
        </label>
      </div>

      <Ruta
        key={montaje}
        paradas={paradas}
        alumnoId={ALUMNO}
        profesor="Laura"
        generacion={{
          tarjeta: null,
          estado: "listo",
          etapa: "preparando",
          progreso: 0,
          tardando: false,
          mensajeError: "",
          esEspera: false,
          onGenerar: nuevaClase,
          onReintentar: () => {},
        }}
      />
    </main>
  );
}
