"use client";

import { useMemo } from "react";
import { desdeCurso } from "@/lib/ejercicio-unificado";
import type { EjercicioVista } from "@/lib/ejercicios";
import VisorEjercicios, { type SucesoVisor } from "@/components/ejercicios/VisorEjercicios";
import BotonCompletar from "@/components/leccion/BotonCompletar";

/**
 * Los ejercicios de la lección.
 *
 * EL VISOR YA NO ESTÁ AQUÍ. Es `components/ejercicios/VisorEjercicios`,
 * compartido con la práctica generada: había dos y divergían en cada
 * cambio. De este archivo solo queda lo que es del curso y de nadie
 * más —el registro de intentos y la pantalla de cierre, con su botón de
 * completar la lección— más la traducción de los ejercicios a la forma
 * única.
 */

const NUMEROS = ["cero", "un", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve", "diez"];

function enLetras(n: number): string {
  return NUMEROS[n] ?? String(n);
}

/**
 * Deja constancia del intento sin que el alumno espere: la corrección ya
 * está pintada cuando esto sale. `keepalive` para que sobreviva si
 * responde el último y sigue en el mismo gesto. Que falle no se le
 * cuenta a nadie: perder un intento no puede cortar la lección.
 */
function registrarIntento(ejercicioId: string, correcto: boolean) {
  void fetch("/api/intento-ejercicio", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ejercicioId, correcto }),
    keepalive: true,
  }).catch((error) => {
    console.error("[leccion] No se pudo registrar el intento:", error);
  });
}

export default function FlujoEjercicios({
  ejercicios,
  registrarIntentos,
  profesor,
  leccionId,
  cursoSlug,
  siguienteId,
  alSalir,
}: {
  ejercicios: EjercicioVista[];
  /** false para el equipo: revisa el curso, no lo cursa. */
  registrarIntentos: boolean;
  /** Va en el cierre: es lo que hace que esto no parezca una app genérica. */
  profesor: string;
  leccionId: string;
  cursoSlug: string;
  siguienteId: string | null;
  alSalir: () => void;
}) {
  const unificados = useMemo(() => ejercicios.map(desdeCurso), [ejercicios]);

  function alSuceso(suceso: SucesoVisor) {
    // El curso solo guarda intentos. Ni avance ni producción: la lección
    // no lleva un "iba por la mitad", y su cierre es marcarla completada.
    if (suceso.tipo === "intento") registrarIntento(suceso.ejercicio.id, suceso.correcto);
  }

  return (
    <VisorEjercicios
      ejercicios={unificados}
      alSalir={alSalir}
      alSuceso={alSuceso}
      guardarIntentos={registrarIntentos}
      cierre={({ aciertos, total, repetir, verEjercicio, acertado }) => (
        <div className="mx-auto w-full max-w-[calc(600px+7rem)] px-4 py-10 min-[1100px]:px-14 min-[1100px]:py-14">
          <p className="text-[11.5px] font-semibold uppercase leading-none tracking-[0.1em] text-marca-grisSuave">
            Ejercicios terminados
          </p>
          <h2 className="mt-3 text-pretty font-display text-[25px] font-bold leading-[1.15] text-marca-tinta min-[1100px]:text-[34px]">
            {/* El diseño decía "Los cinco, correctos", pero cinco es la
                media y no la regla: hay lecciones de uno y de quince. */}
            {aciertos !== total
              ? `Acertaste ${aciertos} de ${total}.`
              : total === 1
                ? "Correcto."
                : `Los ${enLetras(total)}, correctos.`}
          </h2>
          <p className="mt-3 text-pretty text-[16px] leading-[1.6] text-marca-gris min-[1100px]:text-[17px]">
            {aciertos === total
              ? "Has terminado los ejercicios de esta lección. Puedes seguir con la siguiente cuando quieras."
              : `Lo que se te ha quedado a medias vuelve a aparecer en tu práctica.${
                  profesor ? ` ${profesor} lo verá antes de vuestra próxima clase.` : ""
                }`}
          </p>

          <ol className="mt-7 overflow-hidden rounded-[16px] border border-marca-borde bg-white">
            {unificados.map((ej, i) => (
              <li
                key={ej.id}
                className="flex items-center gap-3 border-b border-marca-nieblaOscura px-[18px] py-3.5 last:border-b-0"
              >
                <span
                  aria-hidden
                  className={`grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full text-[11px] font-semibold leading-none text-white ${
                    acertado(i) ? "bg-marca-verde" : "bg-marca-calido"
                  }`}
                >
                  {acertado(i) ? "✓" : "—"}
                </span>
                <span className="min-w-0 flex-1 truncate text-[15px] text-marca-tintaCuerpo">
                  {ej.enunciado.replace(/\{\{\d+\}\}/g, "___").split("\n")[0]}
                </span>
                <button
                  type="button"
                  onClick={() => verEjercicio(i)}
                  className="shrink-0 text-[13.5px] font-semibold text-marca-verdeOsc transition-colors hover:text-marca-tinta"
                >
                  Ver
                </button>
              </li>
            ))}
          </ol>

          <div className="mt-7 flex flex-col gap-3.5 min-[1100px]:flex-row">
            <BotonCompletar
              leccionId={leccionId}
              cursoSlug={cursoSlug}
              siguienteId={siguienteId}
              className="w-full rounded-full bg-marca-verde px-8 py-[15px] text-[16px] font-semibold text-white transition-colors hover:bg-marca-verdeOsc min-[1100px]:order-2 min-[1100px]:w-auto"
            >
              Completar y seguir
            </BotonCompletar>

            <button
              type="button"
              onClick={repetir}
              className="w-full rounded-full border-[1.5px] border-marca-verde px-8 py-[13.5px] text-[16px] font-semibold text-marca-verdeOsc transition-colors hover:bg-marca-verde hover:text-white min-[1100px]:order-1 min-[1100px]:w-auto"
            >
              Repetir los ejercicios
            </button>
          </div>

          <button
            type="button"
            onClick={alSalir}
            className="mt-5 text-[14px] text-marca-grisSuave transition-colors hover:text-marca-tinta"
          >
            ← Volver a la teoría de la lección
          </button>
        </div>
      )}
    />
  );
}
