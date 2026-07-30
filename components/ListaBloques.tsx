"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Bloque } from "@/lib/data";
import { leerProgresoAlumno } from "@/lib/progreso";

export default function ListaBloques({
  bloques,
  alumnoId,
}: {
  bloques: Bloque[];
  alumnoId: string;
}) {
  const [progreso, setProgreso] = useState<Record<string, { aciertos: number; total: number }>>({});

  useEffect(() => {
    setProgreso(leerProgresoAlumno(alumnoId));
  }, [alumnoId]);

  return (
    <div className="space-y-3">
      {bloques.map((b) => {
        const p = progreso[b.id];
        const pct = p ? Math.round((p.aciertos / p.total) * 100) : null;
        const dominado = pct !== null && pct >= 80;
        return (
          <Link
            key={b.id}
            href={`/alumno/${alumnoId}/${b.id}`}
            className="block bg-white rounded-2xl p-5 shadow-sm border-2 border-transparent hover:border-marca-borde transition"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] uppercase tracking-widest text-marca-verde font-medium">
                    {b.area}
                  </span>
                  {dominado && (
                    <span className="text-[10px] uppercase tracking-widest bg-marca-amarillo text-marca-tinta rounded-full px-2 py-0.5 font-medium">
                      Dominado
                    </span>
                  )}
                </div>
                <p className="font-display font-semibold text-lg leading-tight">{b.titulo}</p>
                <p className="text-sm text-slate-500 mt-1 leading-relaxed">{b.intro}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs text-slate-400">{b.minutos} min</p>
                {pct !== null && (
                  <p className="font-display font-bold text-lg mt-1">{pct}%</p>
                )}
              </div>
            </div>
            <div className="flex gap-1 mt-4">
              {["Reconocer", "Transformar", "Producir"].map((f) => (
                <span
                  key={f}
                  className="text-[10px] text-slate-500 bg-marca-niebla rounded-full px-2.5 py-1"
                >
                  {f}
                </span>
              ))}
            </div>
          </Link>
        );
      })}
    </div>
  );
}
