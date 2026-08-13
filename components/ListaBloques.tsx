import Link from "next/link";
import { Fragment } from "react";
import type { Bloque } from "@/lib/data";
import {
  estadoDeBloque,
  type EstadoBloque,
  type RegistroAvance,
  type RegistroProgreso,
} from "@/lib/progreso";

export type ProgresoBloques = Record<string, RegistroProgreso>;
export type AvanceBloques = Record<string, RegistroAvance>;

const FASES = ["Reconocer", "Transformar", "Producir"];

const ETIQUETA: Record<EstadoBloque, { texto: string; clase: string }> = {
  dominado: { texto: "Dominado", clase: "chip-verde" },
  "en-curso": { texto: "En progreso", clase: "chip-progreso" },
  nuevo: { texto: "Nuevo", clase: "chip-amarillo" },
  "sin-empezar": { texto: "Sin empezar", clase: "chip-neutro" },
};

/** Hueco animado que ocupa el sitio donde va a aparecer el bloque recién generado. */
function EsqueletoBloque() {
  return (
    <li
      aria-hidden
      className="aparece esqueleto grid grid-cols-1 gap-5 rounded-[20px] border border-drc-amarillo/45 bg-drc-superficie px-[26px] py-6 wide:grid-cols-[1fr_auto] wide:items-center"
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="block h-[10px] w-16 rounded-full bg-drc-amarillo/40" />
          <span className="block h-[10px] w-10 rounded-full bg-drc-suave" />
        </div>
        <span className="mt-3.5 block h-[19px] w-[62%] rounded-md bg-drc-suave" />
        <span className="mt-3 block h-[13px] w-full rounded-md bg-drc-suave" />
        <span className="mt-2 block h-[13px] w-[78%] rounded-md bg-drc-suave" />
        <div className="mt-4 flex gap-1.5">
          {FASES.map((fase) => (
            <span key={fase} className="block h-[24px] w-[86px] rounded-full bg-drc-suave" />
          ))}
        </div>
      </div>
      <div className="flex items-center gap-4 wide:flex-col wide:items-end">
        <span className="block h-[26px] w-[30px] rounded-md bg-drc-suave" />
        <span className="block h-[44px] flex-1 rounded-full bg-drc-suave wide:h-[42px] wide:w-[120px] wide:flex-none" />
      </div>
    </li>
  );
}

export default function ListaBloques({
  bloques,
  alumnoId,
  progreso,
  avance,
  generados,
  idsNuevos = [],
  indiceBloqueado,
  generando = false,
}: {
  bloques: Bloque[];
  alumnoId: string;
  progreso: ProgresoBloques;
  avance: AvanceBloques;
  /** Ids de los bloques creados con la IA. Decide el chip "Nuevo" solo
   *  cuando además están en `idsNuevos`. */
  generados: string[];
  /**
   * Los generados EN ESTA VISITA: los únicos con sello "Nuevo".
   *
   * Antes lo llevaba cualquier bloque generado y sin empezar, así que uno
   * de hace tres semanas seguía anunciándose como nuevo y el sello dejaba
   * de señalar nada. Ahora significa lo mismo que en el inicio.
   */
  idsNuevos?: string[];
  /** Posición del bloque que aún no se ha desbloqueado, o -1 si no hay ninguno. */
  indiceBloqueado: number;
  /** Mientras es true se muestra el hueco animado en cabeza de la lista. */
  generando?: boolean;
}) {
  return (
    <ol className="mt-5 flex flex-col gap-3">
      {generando && <EsqueletoBloque />}

      {bloques.map((bloque, i) => {
        const bloqueado = i === indiceBloqueado;
        const esGenerado = generados.includes(bloque.id);
        const esNuevo = idsNuevos.includes(bloque.id);
        const { estado, porcentaje, fases } = estadoDeBloque(
          progreso[bloque.id],
          avance[bloque.id],
          esGenerado
        );
        // El estado "nuevo" de `estadoDeBloque` significa "generado y sin
        // empezar"; el sello y el realce se reservan a los de esta visita.
        const etiqueta = estado === "nuevo" && !esNuevo ? ETIQUETA["sin-empezar"] : ETIQUETA[estado];
        const destacado = esNuevo;
        // Solo el primero de la lista lleva el botón sólido: si todos gritan, ninguno destaca.
        const primario = i === 0 && estado !== "dominado";

        return (
          <li
            key={bloque.id}
            className={
              bloqueado
                ? "grid grid-cols-1 gap-5 rounded-[20px] border border-dashed border-drc-discontinuo bg-white/50 px-[26px] py-6 wide:grid-cols-[1fr_auto] wide:items-center"
                : `tarjeta tarjeta-activa grid grid-cols-1 gap-5 wide:grid-cols-[1fr_auto] wide:items-center ${
                    destacado ? "aparece tarjeta-nueva" : ""
                  }`
            }
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-2">
                <p
                  className={`eyebrow flex items-center gap-2 ${
                    bloqueado ? "text-drc-cuerpo" : "text-drc-verde-texto"
                  }`}
                >
                  <span>{bloque.area}</span>
                  <span aria-hidden className="h-[3px] w-[3px] shrink-0 rounded-full bg-drc-flecha" />
                  <span className={`tabular-nums ${bloqueado ? "" : "text-drc-cuerpo"}`}>
                    {bloque.minutos} min
                  </span>
                </p>

                {!bloqueado && (
                  <span className={`chip ${etiqueta.clase}`}>
                    {etiqueta.texto}
                    {estado === "dominado" && porcentaje !== null && (
                      <span className="ml-1 tabular-nums opacity-70">{porcentaje}%</span>
                    )}
                  </span>
                )}
              </div>

              <h3
                className={`mt-2.5 font-display text-[21px] font-semibold leading-[1.15] tracking-[-0.005em] ${
                  bloqueado ? "text-drc-cuerpo" : "text-drc-titular"
                }`}
              >
                {bloque.titulo}
              </h3>

              <p className="mt-2 text-pretty text-[15px] leading-[1.55] text-drc-cuerpo">
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
                    <span className={`chip ${k < fases ? "chip-verde" : "chip-neutro"}`}>{fase}</span>
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
                  className={`btn min-h-[46px] flex-1 wide:min-h-[42px] wide:flex-none ${
                    primario ? "btn-primario" : "btn-secundario"
                  }`}
                >
                  {estado === "dominado" ? "Repasar" : estado === "en-curso" ? "Continuar" : "Empezar"}
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
