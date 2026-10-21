"use client";

// ---------------------------------------------------------------
// QUIÉN ENTRA A CLASE CON EL BOTÓN: LA LISTA
//
// Una fila por alumno con alguna clase dada en el rango, también quien
// no usó el botón nunca (con 0): es la lista que dice a quién hay que
// enseñárselo. Por defecto, primero quien más clases abrió con el botón.
// Buscar y ordenar pasa aquí, sobre filas que ya vienen del servidor.
// ---------------------------------------------------------------

import Link from "next/link";
import { useMemo, useState } from "react";
import { diaCorto, numero, porcentaje } from "@/lib/panel-formato";
import type { FilaClase } from "@/lib/panel-metricas";

type Columna = "nombre" | "profesor" | "clases" | "conEntrada" | "pct" | "ultima";

const COLUMNAS: { id: Columna; nombre: string; num?: boolean }[] = [
  { id: "nombre", nombre: "Alumno" },
  { id: "profesor", nombre: "Profesor" },
  { id: "clases", nombre: "Clases dadas", num: true },
  { id: "conEntrada", nombre: "Entradas con el botón", num: true },
  { id: "pct", nombre: "% de sus clases", num: true },
  { id: "ultima", nombre: "Última entrada con el botón" },
];

/** Filas antes de «Ver los N»: con 160 alumnos la página se hacía eterna. */
const PRIMERAS = 25;

const pct = (f: FilaClase) => (f.clases > 0 ? f.conEntrada / f.clases : 0);

export default function TablaClase({ filas }: { filas: FilaClase[] }) {
  const [todas, setTodas] = useState(false);
  const [q, setQ] = useState("");
  const [orden, setOrden] = useState<{ c: Columna; dir: 1 | -1 }>({ c: "conEntrada", dir: -1 });

  const vistas = useMemo(() => {
    const t = q.trim().toLowerCase();
    const encontradas = t
      ? filas.filter((f) => f.nombre.toLowerCase().includes(t) || f.profesor.toLowerCase().includes(t) || f.alumnoId.toLowerCase().includes(t))
      : filas;
    const { c, dir } = orden;
    const nombre = (f: FilaClase) => f.nombre || f.alumnoId;
    return [...encontradas].sort((x, y) => {
      if (c === "nombre") return nombre(x).localeCompare(nombre(y), "es") * dir;
      if (c === "profesor") return x.profesor.localeCompare(y.profesor, "es") * dir || nombre(x).localeCompare(nombre(y), "es");
      if (c === "ultima") {
        // Quien no la usó va al final en los dos sentidos.
        if (x.ultima === y.ultima) return nombre(x).localeCompare(nombre(y), "es");
        if (x.ultima === null) return 1;
        if (y.ultima === null) return -1;
        return x.ultima.localeCompare(y.ultima) * dir;
      }
      const a = c === "pct" ? pct(x) : x[c];
      const b = c === "pct" ? pct(y) : y[c];
      // Empate: más clases primero, y después por nombre.
      return (a - b) * dir || y.clases - x.clases || nombre(x).localeCompare(nombre(y), "es");
    });
  }, [filas, q, orden]);

  const sinBoton = filas.filter((f) => f.conEntrada === 0).length;
  const mostradas = todas ? vistas : vistas.slice(0, PRIMERAS);

  return (
    <>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2.5">
        <label className="relative min-w-0 flex-[1_1_260px] sm:max-w-[360px]">
          <span className="sr-only">Buscar por alumno o profesor</span>
          <svg
            aria-hidden
            viewBox="0 0 20 20"
            width="16"
            height="16"
            className="pointer-events-none absolute left-[13px] top-1/2 -translate-y-1/2 text-marca-grisSuave"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
          >
            <circle cx="9" cy="9" r="5.4" />
            <path d="M13 13l3.5 3.5" />
          </svg>
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por alumno o profesor"
            autoComplete="off"
            className="h-10 w-full rounded-full border border-marca-borde bg-white pl-[38px] pr-3.5 text-[16px] text-marca-tinta outline-none placeholder:text-marca-grisTenue focus:border-marca-verde"
          />
        </label>
        {/* En el móvil no caben las cabeceras: el orden se elige aquí. */}
        <label className="flex w-full items-center gap-2 text-[13.5px] text-marca-tintaMedia sm:hidden">
          Ordenar por
          <select
            value={`${orden.c}:${orden.dir}`}
            onChange={(e) => {
              const [c, dir] = e.target.value.split(":");
              setOrden({ c: c as Columna, dir: Number(dir) as 1 | -1 });
            }}
            className="h-9 min-w-0 flex-1 rounded-full border border-marca-borde bg-white px-3 text-[15px] text-marca-tinta"
          >
            <option value="conEntrada:-1">Más entradas</option>
            <option value="conEntrada:1">Menos entradas</option>
            <option value="pct:-1">Mayor %</option>
            <option value="pct:1">Menor %</option>
            <option value="clases:-1">Más clases dadas</option>
            <option value="ultima:-1">Última entrada</option>
            <option value="nombre:1">Alumno (A–Z)</option>
            <option value="profesor:1">Profesor (A–Z)</option>
          </select>
        </label>
      </div>
      <p className="mt-2 text-[13px] text-marca-grisSuave" aria-live="polite">
        {numero(vistas.length)} de {numero(filas.length)} alumnos con clase · {numero(sinBoton)} no usaron el botón en ninguna
      </p>

      <ul className="mt-3 sm:hidden">
        {mostradas.length === 0 && <li className="py-4 text-[14px] text-marca-grisSuave">{q.trim() ? `Nadie coincide con «${q.trim()}».` : "Nadie tuvo clase en este rango."}</li>}
        {mostradas.map((f) => (
          <li key={f.alumnoId} className="border-b border-marca-nieblaOscura py-2.5">
            <div className="flex items-baseline justify-between gap-3">
              {f.nombre ? (
                <Link href={`/alumno/${f.alumnoId}`} className="min-w-0 truncate text-[14.5px] font-medium text-marca-tinta">
                  {f.nombre}
                </Link>
              ) : (
                <span className="min-w-0 truncate text-[14px] text-marca-tintaMedia">{f.alumnoId}</span>
              )}
              <span className={`whitespace-nowrap text-[14px] font-semibold tabular-nums ${f.conEntrada === 0 ? "text-[#B5C0BA]" : "text-marca-tinta"}`}>
                {numero(f.conEntrada)} de {numero(f.clases)} · {porcentaje(f.conEntrada, f.clases)} %
              </span>
            </div>
            <p className="mt-0.5 text-[12.5px] text-marca-grisSuave">
              {f.profesor || "Sin profesor"} ·{" "}
              {f.ultima === null ? "no usó el botón" : `última con el botón: ${diaCorto(f.ultima.slice(0, 10))} ${f.ultima.slice(11, 16)}`}
            </p>
          </li>
        ))}
      </ul>

      <div className="-mx-[18px] mt-3 hidden overflow-x-auto px-[18px] sm:block lg:-mx-[22px] lg:px-[22px]">
        <table className="w-full min-w-[760px] border-collapse text-[14px]">
          <thead>
            <tr>
              {COLUMNAS.map((col) => {
                const activa = orden.c === col.id;
                return (
                  <th
                    key={col.id}
                    aria-sort={activa ? (orden.dir === 1 ? "ascending" : "descending") : undefined}
                    className={`whitespace-nowrap border-b border-marca-borde px-2.5 py-2 text-[12.5px] font-medium text-marca-grisSuave ${col.num ? "text-right" : "text-left"}`}
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setOrden((o) =>
                          o.c === col.id ? { c: col.id, dir: o.dir === 1 ? -1 : 1 } : { c: col.id, dir: col.num || col.id === "ultima" ? -1 : 1 }
                        )
                      }
                      className={`inline-flex items-center gap-1 rounded py-0.5 hover:text-marca-tinta focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marca-verde ${
                        activa ? "font-semibold text-marca-tinta" : ""
                      }`}
                    >
                      {col.nombre}
                      {activa && <span aria-hidden>{orden.dir === 1 ? "↑" : "↓"}</span>}
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {vistas.length === 0 ? (
              <tr>
                <td colSpan={COLUMNAS.length} className="px-2.5 py-5 text-marca-grisSuave">
                  {q.trim() ? `Nadie coincide con «${q.trim()}».` : "Nadie tuvo clase en este rango."}
                </td>
              </tr>
            ) : (
              mostradas.map((f) => (
                <tr key={f.alumnoId} className="hover:bg-[#FAFCFA]">
                  <td className="whitespace-nowrap border-b border-marca-nieblaOscura px-2.5 py-[9px]">
                    {f.nombre ? (
                      <Link href={`/alumno/${f.alumnoId}`} className="font-medium text-marca-tinta hover:text-marca-verdeOsc hover:underline">
                        {f.nombre}
                      </Link>
                    ) : (
                      <span className="text-marca-tintaMedia" title="Sin ficha en Gestión">
                        {f.alumnoId}
                      </span>
                    )}
                  </td>
                  <td className="whitespace-nowrap border-b border-marca-nieblaOscura px-2.5 py-[9px] text-marca-tintaMedia">{f.profesor || "—"}</td>
                  <td className="whitespace-nowrap border-b border-marca-nieblaOscura px-2.5 py-[9px] text-right tabular-nums">{numero(f.clases)}</td>
                  <td className="whitespace-nowrap border-b border-marca-nieblaOscura px-2.5 py-[9px] text-right tabular-nums">
                    {f.conEntrada === 0 ? <span className="text-[#B5C0BA]">0</span> : numero(f.conEntrada)}
                  </td>
                  <td
                    className={`whitespace-nowrap border-b border-marca-nieblaOscura px-2.5 py-[9px] text-right tabular-nums ${
                      f.conEntrada === 0 ? "text-[#B5C0BA]" : ""
                    }`}
                  >
                    {porcentaje(f.conEntrada, f.clases)} %
                  </td>
                  <td className="whitespace-nowrap border-b border-marca-nieblaOscura px-2.5 py-[9px]">
                    {f.ultima === null ? (
                      <span className="text-[#B5C0BA]">Nunca en el rango</span>
                    ) : (
                      <>
                        {diaCorto(f.ultima.slice(0, 10))}
                        <span className="ml-1 text-[12.5px] text-marca-grisSuave">{f.ultima.slice(11, 16)}</span>
                      </>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {!todas && vistas.length > PRIMERAS && (
        <button
          type="button"
          onClick={() => setTodas(true)}
          className="mt-3 min-h-[40px] rounded-full border border-marca-borde px-4 text-[14px] font-semibold text-marca-verdeOsc hover:bg-marca-niebla hover:text-marca-tinta focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marca-verde"
        >
          Ver los {numero(vistas.length)}
        </button>
      )}
    </>
  );
}
