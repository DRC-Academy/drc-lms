"use client";

import { useState } from "react";

// ---------------------------------------------------------------
// «TU RECORRIDO, CLASE A CLASE», PLEGADO
//
// ⚠ COPIA del `Recorrido` de `components/ProgresoFichaV2.tsx` de DRC
// Gestión (30/09/2026): una fila con cuántas clases hay y cuál fue la
// última; al abrirla, la lista entera.
//
// LO ÚNICO QUE NO SE COPIA, a propósito: allí cada clase enseña su
// resumen (`class_summary`); aquí, sus temas y vocabulario. El resumen
// está escrito en tercera persona sobre el alumno y el LMS no lo pide
// (ver `ClaseDelRecorrido` en `lib/gestion.ts`).
//
// Todo llega formateado del servidor: aquí solo se pliega y se despliega.
// ---------------------------------------------------------------

export type ClasePlegada = {
  id: string;
  /** "Clase 15", o null si la fila no trae número. */
  numero: string | null;
  /** "25 de septiembre de 2026", o null. */
  fecha: string | null;
  hito: boolean;
  titulo: string;
  temas: string;
};

export default function RecorridoPlegado({
  titulo,
  vacio,
  resumen,
  verTodas,
  plegar,
  rotuloHito,
  rotuloTemas,
  clases,
}: {
  titulo: string;
  vacio: string;
  /** "16 clases · la última, el 25 de septiembre: …" */
  resumen: string;
  verTodas: string;
  plegar: string;
  rotuloHito: string;
  rotuloTemas: string;
  /** Solo las que tienen análisis, de la más reciente a la más antigua. */
  clases: ClasePlegada[];
}) {
  const [abierto, setAbierto] = useState(false);

  if (clases.length === 0) {
    return (
      <section className="p2-bloque" aria-labelledby="p2-recorrido">
        <h2 id="p2-recorrido" className="p2-h2">{titulo}</h2>
        <p className="p2-vacio">{vacio}</p>
      </section>
    );
  }

  return (
    <section className="p2-recorrido">
      <button
        type="button"
        className="p2-plegado"
        aria-expanded={abierto}
        aria-controls="p2-recorrido-lista"
        onClick={() => setAbierto((a) => !a)}
      >
        <span className="p2-plegado-linea" aria-hidden><span /></span>
        <span className="p2-plegado-texto">
          <span className="p2-plegado-titulo">{titulo}</span>
          <span className="p2-plegado-resumen">{resumen}</span>
        </span>
        <span className="p2-plegado-accion">
          <span className="p2-plegado-accion-txt">{abierto ? plegar : verTodas}</span>
          <span className={`p2-plegado-flecha${abierto ? " is-abierto" : ""}`} aria-hidden>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </span>
      </button>

      {abierto && (
        <ol id="p2-recorrido-lista" className="p2-linea">
          {clases.map((c) => (
            <li key={c.id} className={`p2-clase${c.hito ? " is-hito" : ""}`}>
              <span className="p2-clase-nodo" aria-hidden />
              <div className="p2-clase-cab">
                {c.numero && <span className="p2-clase-num">{c.numero}</span>}
                {c.fecha && <span className={c.numero ? "p2-clase-fecha" : "p2-clase-num"}>{c.fecha}</span>}
                {c.hito && <span className="p2-chip p2-chip-sm">{rotuloHito}</span>}
              </div>
              {c.titulo !== "" && <p className="p2-clase-titulo">{c.titulo}</p>}
              {c.temas !== "" && (
                <>
                  <p className="p2-clase-rotulo">{rotuloTemas}</p>
                  <p className="p2-clase-resumen">{c.temas}</p>
                </>
              )}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
