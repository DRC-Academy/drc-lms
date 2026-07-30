import Link from "next/link";
import { Fragment } from "react";
import type { Bloque } from "@/lib/data";

export type ProgresoBloques = Record<string, { aciertos: number; total: number }>;

const FASES = ["Reconocer", "Transformar", "Producir"];

export default function ListaBloques({
  bloques,
  alumnoId,
  progreso,
  indiceBloqueado,
}: {
  bloques: Bloque[];
  alumnoId: string;
  progreso: ProgresoBloques;
  /** Posición del bloque que aún no se ha desbloqueado, o -1 si no hay ninguno. */
  indiceBloqueado: number;
}) {
  return (
    <ol className="mt-5 flex flex-col gap-3">
      {bloques.map((bloque, i) => {
        const bloqueado = i === indiceBloqueado;
        const hecho = Boolean(progreso[bloque.id]);
        // El progreso solo se guarda al terminar el bloque: o no hay fase
        // alcanzada, o están las tres.
        const fasesAlcanzadas = hecho ? FASES.length : 0;
        const primario = i === 0;

        return (
          <li
            key={bloque.id}
            className={
              bloqueado
                ? "grid grid-cols-1 gap-5 rounded-[20px] border border-dashed border-drc-discontinuo bg-white/50 px-[26px] py-6 wide:grid-cols-[1fr_auto] wide:items-center"
                : "tarjeta tarjeta-activa grid grid-cols-1 gap-5 wide:grid-cols-[1fr_auto] wide:items-center"
            }
          >
            <div className="min-w-0">
              <p
                className={`eyebrow flex items-center gap-2 ${
                  bloqueado ? "text-drc-cuerpo" : "text-drc-verde-texto"
                }`}
              >
                <span>{bloque.area}</span>
                <span
                  aria-hidden
                  className="h-[3px] w-[3px] shrink-0 rounded-full bg-drc-flecha"
                />
                <span className={`tabular-nums ${bloqueado ? "" : "text-drc-cuerpo"}`}>
                  {bloque.minutos} min
                </span>
              </p>

              <h3
                className={`mt-2.5 font-display text-[21px] font-semibold leading-[1.15] tracking-[-0.005em] ${
                  bloqueado ? "text-drc-cuerpo" : "text-drc-titular"
                }`}
              >
                {bloque.titulo}
              </h3>

              <p
                className="mt-2 text-pretty text-[15px] leading-[1.55] text-drc-cuerpo"
              >
                {bloque.intro}
              </p>

              <div className="mt-4 flex flex-wrap items-center gap-1.5">
                {FASES.map((fase, k) => (
                  <Fragment key={fase}>
                    {k > 0 && (
                      <span aria-hidden className="text-[13px] text-drc-flecha">
                        →
                      </span>
                    )}
                    <span
                      className={`chip ${k < fasesAlcanzadas ? "chip-verde" : "chip-neutro"}`}
                    >
                      {fase}
                    </span>
                  </Fragment>
                ))}
              </div>

              {bloqueado && (
                <p className="mt-4 text-[13px] leading-[1.5] text-drc-cuerpo">
                  Se desbloquea después de tu próxima clase.
                </p>
              )}
            </div>

            <div className="flex items-center gap-4 wide:flex-col wide:items-end">
              <span
                aria-hidden
                className="font-display text-[26px] font-semibold leading-none tabular-nums text-drc-numeral"
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              {!bloqueado && (
                <Link
                  href={`/alumno/${alumnoId}/${bloque.id}`}
                  className={`btn min-h-[44px] flex-1 wide:min-h-0 wide:flex-none ${
                    primario ? "btn-primario" : "btn-secundario"
                  }`}
                >
                  {hecho ? "Repasar" : "Empezar"}
                  <span className="sr-only"> {bloque.titulo}</span>
                </Link>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
