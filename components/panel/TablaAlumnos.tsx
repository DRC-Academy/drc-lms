"use client";

// ---------------------------------------------------------------
// LA TABLA DE ALUMNOS DEL PANEL
//
// Una fila por alumno con ficha en Gestión. Las cifras son del rango;
// la última actividad, de siempre. Buscar, ordenar y elegir entre «con
// plan activo» y «todos» pasa aquí, sobre filas que ya vienen del
// servidor: no se vuelve a preguntar a nadie.
//
// «ÚLTIMA ACTIVIDAD» no cuenta las entradas a clase: se puede entrar
// desde el correo sin pasar por la plataforma (`panel_alumnos`).
// ---------------------------------------------------------------

import Link from "next/link";
import { useMemo, useState } from "react";
import { Segmentado } from "@/components/panel/piezas";
import { diaCorto, numero } from "@/lib/panel-formato";

export type FilaTabla = {
  alumnoId: string;
  nombre: string;
  profesor: string;
  activo: boolean;
  /** Día de la última actividad ("AAAA-MM-DD"), o null si nunca. */
  ultima: string | null;
  /** Días desde entonces; 0 = hoy. */
  diasSin: number | null;
  entradas: number;
  bloques: number;
  lecciones: number;
};

type Columna = "nombre" | "profesor" | "diasSin" | "entradas" | "bloques" | "lecciones";

const COLUMNAS: { id: Columna; nombre: string; num?: boolean }[] = [
  { id: "nombre", nombre: "Nombre" },
  { id: "profesor", nombre: "Profesor" },
  { id: "diasSin", nombre: "Última actividad" },
  { id: "entradas", nombre: "Entradas a clase", num: true },
  { id: "bloques", nombre: "Bloques generados", num: true },
  { id: "lecciones", nombre: "Lecciones completadas", num: true },
];

const QUIETO = 14;

/** Filas antes de «Ver los N»: con 212 alumnos la tabla dejaba la página en 11.000 px. */
const PRIMERAS = 25;

export default function TablaAlumnos({
  filas,
  entradasDisponibles,
  nota,
}: {
  filas: FilaTabla[];
  entradasDisponibles: boolean;
  /** Aclaración debajo de la tabla, si hace falta. */
  nota?: string | null;
}) {
  const [ver, setVer] = useState<"plan" | "todos">("plan");
  const [todas, setTodas] = useState(false);
  const [q, setQ] = useState("");
  const [orden, setOrden] = useState<{ c: Columna; dir: 1 | -1 }>({ c: "diasSin", dir: 1 });

  const conPlan = filas.filter((f) => f.activo).length;
  const base = ver === "plan" ? filas.filter((f) => f.activo) : filas;

  const vistas = useMemo(() => {
    const t = q.trim().toLowerCase();
    const encontradas = t ? base.filter((f) => f.nombre.toLowerCase().includes(t) || f.profesor.toLowerCase().includes(t)) : base;
    const { c, dir } = orden;
    return [...encontradas].sort((x, y) => {
      if (c === "nombre" || c === "profesor") return x[c].localeCompare(y[c], "es") * dir || x.nombre.localeCompare(y.nombre, "es");
      // Quien nunca ha hecho nada va al final en los dos sentidos.
      const a = c === "diasSin" ? (x.diasSin ?? Infinity) : x[c];
      const b = c === "diasSin" ? (y.diasSin ?? Infinity) : y[c];
      if (a === b) return x.nombre.localeCompare(y.nombre, "es");
      if (a === Infinity) return 1;
      if (b === Infinity) return -1;
      return (a - b) * dir;
    });
  }, [base, q, orden]);

  const quietos = vistas.filter((f) => f.diasSin !== null && f.diasSin >= QUIETO).length;
  const cel = (v: number) => (v === 0 ? <span className="text-[#B5C0BA]">0</span> : numero(v));

  return (
    <>
      <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2.5">
        <label className="relative min-w-0 flex-[1_1_260px] sm:max-w-[360px]">
          <span className="sr-only">Buscar por nombre o profesor</span>
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
            placeholder="Buscar por nombre o profesor"
            autoComplete="off"
            className="h-10 w-full rounded-full border border-marca-borde bg-white pl-[38px] pr-3.5 text-[16px] text-marca-tinta outline-none placeholder:text-marca-grisTenue focus:border-marca-verde"
          />
        </label>
        <Segmentado
          etiqueta="Qué alumnos"
          opciones={[
            { id: "plan", nombre: `Con plan activo · ${numero(conPlan)}` },
            { id: "todos", nombre: `Todos · ${numero(filas.length)}` },
          ]}
          valor={ver}
          alElegir={setVer}
        />
      </div>
      <p className="mt-2 text-[13px] text-marca-grisSuave" aria-live="polite">
        {numero(vistas.length)} de {numero(base.length)} · {numero(quietos)} sin actividad en {QUIETO} días
      </p>

      <div className="-mx-[18px] mt-3 overflow-x-auto px-[18px] lg:-mx-[22px] lg:px-[22px]">
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
                          o.c === col.id ? { c: col.id, dir: o.dir === 1 ? -1 : 1 } : { c: col.id, dir: col.num ? -1 : 1 }
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
                <td colSpan={6} className="px-2.5 py-5 text-marca-grisSuave">
                  {q.trim() ? `Nadie coincide con «${q.trim()}».` : "No hay alumnos en esta lista."}
                </td>
              </tr>
            ) : (
              (todas ? vistas : vistas.slice(0, PRIMERAS)).map((f) => (
                <tr key={f.alumnoId} className="hover:bg-[#FAFCFA]">
                  <td className="whitespace-nowrap border-b border-marca-nieblaOscura px-2.5 py-[9px]">
                    <Link href={`/alumno/${f.alumnoId}`} className="font-medium text-marca-tinta hover:text-marca-verdeOsc hover:underline">
                      {f.nombre}
                    </Link>
                    {f.diasSin !== null && f.diasSin >= QUIETO && (
                      <span className="ml-2 inline-block rounded-full border border-marca-borde bg-[#F7F9F7] px-2 align-[1px] text-[11.5px] text-marca-tintaMedia">
                        Sin actividad en {QUIETO} días
                      </span>
                    )}
                  </td>
                  <td className="whitespace-nowrap border-b border-marca-nieblaOscura px-2.5 py-[9px] text-marca-tintaMedia">{f.profesor || "—"}</td>
                  <td className="whitespace-nowrap border-b border-marca-nieblaOscura px-2.5 py-[9px]">
                    {f.ultima === null || f.diasSin === null ? (
                      <span className="text-[#B5C0BA]">Sin actividad</span>
                    ) : (
                      <>
                        {diaCorto(f.ultima)}
                        <span className="ml-1 text-[12.5px] text-marca-grisSuave">
                          {f.diasSin === 0 ? "hoy" : f.diasSin === 1 ? "ayer" : `hace ${f.diasSin} d`}
                        </span>
                      </>
                    )}
                  </td>
                  <td className="whitespace-nowrap border-b border-marca-nieblaOscura px-2.5 py-[9px] text-right tabular-nums">
                    {entradasDisponibles ? cel(f.entradas) : <span className="text-[#B5C0BA]">—</span>}
                  </td>
                  <td className="whitespace-nowrap border-b border-marca-nieblaOscura px-2.5 py-[9px] text-right tabular-nums">{cel(f.bloques)}</td>
                  <td className="whitespace-nowrap border-b border-marca-nieblaOscura px-2.5 py-[9px] text-right tabular-nums">{cel(f.lecciones)}</td>
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
      {nota && <p className="mt-3 max-w-[72ch] text-pretty text-[12.5px] leading-[1.5] text-marca-grisSuave">{nota}</p>}
    </>
  );
}
