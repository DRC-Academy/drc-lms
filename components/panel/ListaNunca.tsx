"use client";

// ---------------------------------------------------------------
// NUNCA ACCEDIERON: LA LISTA
//
// Con plan activo hoy y sin ningún inicio de sesión ni acceso. Primero
// los de alta más antigua: son los que llevan más tiempo sin entrar.
// ---------------------------------------------------------------

import Link from "next/link";
import { useState } from "react";
import { diaCorto, numero } from "@/lib/panel-formato";
import type { FilaNunca } from "@/lib/panel-metricas";

const PRIMERAS = 10;

export default function ListaNunca({ filas }: { filas: FilaNunca[] }) {
  const [todas, setTodas] = useState(false);
  const ordenadas = [...filas].sort(
    (a, b) => (a.fechaInicio ?? "9999").localeCompare(b.fechaInicio ?? "9999") || a.nombre.localeCompare(b.nombre, "es")
  );
  if (filas.length === 0) return <p className="mt-3 text-[13.5px] text-marca-grisSuave">Todos los alumnos con plan activo han entrado alguna vez.</p>;
  const mostradas = todas ? ordenadas : ordenadas.slice(0, PRIMERAS);
  const alta = (f: FilaNunca) => (f.fechaInicio ? `${diaCorto(f.fechaInicio)} ${f.fechaInicio.slice(0, 4)}` : "sin fecha");
  return (
    <>
      <ul className="mt-3 sm:hidden">
        {mostradas.map((f) => (
          <li key={f.alumnoId} className="border-b border-marca-nieblaOscura py-2.5">
            <Link href={`/alumno/${f.alumnoId}`} className="text-[14.5px] font-medium text-marca-tinta">
              {f.nombre || f.alumnoId}
            </Link>
            <p className="mt-0.5 text-[12.5px] text-marca-grisSuave">
              {f.profesor || "Sin profesor"} · alta {alta(f)}
            </p>
          </li>
        ))}
      </ul>
      <div className="-mx-[18px] mt-3 hidden overflow-x-auto px-[18px] sm:block lg:-mx-[22px] lg:px-[22px]">
        <table className="w-full min-w-[420px] border-collapse text-[14px]">
          <thead>
            <tr>
              {["Alumno", "Profesor", "Alta"].map((c, i) => (
                <th
                  key={c}
                  className={`whitespace-nowrap border-b border-marca-borde px-2.5 py-2 text-[12.5px] font-medium text-marca-grisSuave ${i === 2 ? "text-right" : "text-left"}`}
                >
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {mostradas.map((f) => (
              <tr key={f.alumnoId} className="hover:bg-[#FAFCFA]">
                <td className="border-b border-marca-nieblaOscura px-2.5 py-[9px]">
                  <Link href={`/alumno/${f.alumnoId}`} className="font-medium text-marca-tinta hover:text-marca-verdeOsc hover:underline">
                    {f.nombre || f.alumnoId}
                  </Link>
                </td>
                <td className="whitespace-nowrap border-b border-marca-nieblaOscura px-2.5 py-[9px] text-marca-tintaMedia">{f.profesor || "—"}</td>
                <td className="whitespace-nowrap border-b border-marca-nieblaOscura px-2.5 py-[9px] text-right tabular-nums">
                  {f.fechaInicio ? alta(f) : <span className="text-[#B5C0BA]">sin fecha</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!todas && ordenadas.length > PRIMERAS && (
        <button
          type="button"
          onClick={() => setTodas(true)}
          className="mt-3 min-h-[40px] rounded-full border border-marca-borde px-4 text-[14px] font-semibold text-marca-verdeOsc hover:bg-marca-niebla hover:text-marca-tinta focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marca-verde"
        >
          Ver los {numero(ordenadas.length)}
        </button>
      )}
    </>
  );
}
