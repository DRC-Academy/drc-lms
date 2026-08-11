"use client";

import { useState } from "react";
import { normalizarRespuesta } from "@/lib/validarBloque";

/**
 * Los ejercicios de una lección de curso.
 *
 * NINGUNO DE LOS 1.492 EJERCICIOS TIENE EXPLICACIÓN: el campo viene
 * vacío en todo el export de LearnDash. Así que al fallar se dice cuál
 * era la respuesta correcta y se calla: inventar un porqué sería
 * ponerle a la academia palabras que no ha dicho.
 *
 * Y el aviso de fallo se dibuja del tamaño de lo que hay dentro, sin
 * reservar sitio para un texto que no va a llegar: si no, quedaría un
 * recuadro medio vacío que parece contenido que no ha cargado.
 */

export type EjercicioVista = {
  id: string;
  tipo: "single" | "multiple" | "cloze" | "essay";
  enunciado: string;
  opciones: string[];
  correcta: unknown;
  orden: number;
};

/** Los índices correctos de un single o un multiple. */
function indicesCorrectos(correcta: unknown): number[] {
  if (!Array.isArray(correcta)) return [];
  return correcta.filter((v): v is number => typeof v === "number" && Number.isInteger(v));
}

/** Las respuestas aceptadas por hueco de un cloze. */
function huecosAceptados(correcta: unknown): string[][] {
  if (!Array.isArray(correcta)) return [];
  return correcta.map((hueco) =>
    Array.isArray(hueco) ? hueco.filter((v): v is string => typeof v === "string") : []
  );
}

const MISMO_ORDEN = (a: number[], b: number[]) =>
  a.length === b.length && a.every((v, i) => v === b[i]);

// ---------------------------------------------------------------

function AvisoResultado({ correcto, solucion }: { correcto: boolean; solucion: string | null }) {
  return (
    <div
      className={`aparece mt-4 rounded-xl px-4 py-3 ${
        correcto ? "bg-drc-chip-verde" : "bg-[#FFF7E0]"
      }`}
    >
      <p className="text-[14px] font-semibold leading-snug text-marca-tinta">
        {correcto ? "Correcto." : "No es esa."}
      </p>
      {/* Solo cuando hay algo que decir. Sin explicaciones en el
          material, el aviso de acierto es una sola línea. */}
      {!correcto && solucion !== null && (
        <p className="mt-1 text-[14px] leading-[1.5] text-drc-texto">
          La respuesta correcta es <span className="font-medium">{solucion}</span>.
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------

function Opciones({ ejercicio }: { ejercicio: EjercicioVista }) {
  const multiple = ejercicio.tipo === "multiple";
  const correctas = indicesCorrectos(ejercicio.correcta);

  const [elegidas, setElegidas] = useState<number[]>([]);
  const [resuelto, setResuelto] = useState(false);

  const acertado = MISMO_ORDEN([...elegidas].sort((a, b) => a - b), [...correctas].sort((a, b) => a - b));

  function alternar(i: number) {
    if (resuelto) return;
    if (multiple) {
      setElegidas((previas) =>
        previas.includes(i) ? previas.filter((x) => x !== i) : [...previas, i]
      );
    } else {
      setElegidas([i]);
      setResuelto(true);
    }
  }

  const solucion = correctas
    .map((i) => ejercicio.opciones[i])
    .filter((t) => typeof t === "string" && t !== "")
    .join(" · ");

  return (
    <>
      {multiple && (
        <p className="mb-3 text-[13px] text-drc-cuerpo">Puede haber más de una correcta.</p>
      )}

      <div className="flex flex-col gap-2.5">
        {ejercicio.opciones.map((opcion, i) => {
          const elegida = elegidas.includes(i);
          const esCorrecta = correctas.includes(i);

          let clase = "border-marca-borde bg-marca-niebla hover:border-marca-verde";
          if (resuelto) {
            if (esCorrecta) clase = "border-marca-verde bg-drc-chip-verde";
            else if (elegida) clase = "border-[#D98282] bg-[#FDECEC]";
            else clase = "border-transparent bg-marca-niebla opacity-55";
          } else if (elegida) {
            clase = "border-marca-verde bg-drc-chip-verde";
          }

          return (
            <button
              key={i}
              type="button"
              disabled={resuelto}
              onClick={() => alternar(i)}
              className={`w-full rounded-xl border-2 px-4 py-3 text-left text-[15px] leading-snug text-drc-texto transition-all duration-150 ${clase}`}
            >
              {opcion}
            </button>
          );
        })}
      </div>

      {multiple && !resuelto && (
        <button
          type="button"
          onClick={() => setResuelto(true)}
          disabled={elegidas.length === 0}
          className="btn btn-primario mt-4 min-h-[44px] w-full sm:w-auto"
        >
          Comprobar
        </button>
      )}

      {resuelto && <AvisoResultado correcto={acertado} solucion={solucion || null} />}
    </>
  );
}

// ---------------------------------------------------------------

function Huecos({ ejercicio }: { ejercicio: EjercicioVista }) {
  const aceptados = huecosAceptados(ejercicio.correcta);
  const [respuestas, setRespuestas] = useState<string[]>(() => aceptados.map(() => ""));
  const [resuelto, setResuelto] = useState(false);

  // El enunciado trae los huecos como {{1}}, {{2}}… en su sitio dentro
  // del texto. Se parte por ellos y se intercala un campo por hueco.
  const trozos = ejercicio.enunciado.split(/(\{\{\d+\}\})/g);

  const aciertaHueco = (i: number) => {
    const dada = normalizarRespuesta(respuestas[i] ?? "");
    return (aceptados[i] ?? []).some((valida) => normalizarRespuesta(valida) === dada);
  };

  const todoBien = aceptados.length > 0 && aceptados.every((_, i) => aciertaHueco(i));
  const algoEscrito = respuestas.some((r) => r.trim() !== "");

  return (
    <>
      <div className="text-[15px] leading-[1.9] text-drc-texto">
        {trozos.map((trozo, i) => {
          const hueco = trozo.match(/^\{\{(\d+)\}\}$/);
          if (!hueco) {
            // Los saltos de línea del texto original separan frases.
            return (
              <span key={i} className="whitespace-pre-wrap">
                {trozo}
              </span>
            );
          }

          const indice = Number(hueco[1]) - 1;
          const bien = resuelto && aciertaHueco(indice);

          return (
            <input
              key={i}
              type="text"
              value={respuestas[indice] ?? ""}
              onChange={(e) =>
                setRespuestas((previas) => {
                  const copia = [...previas];
                  copia[indice] = e.target.value;
                  return copia;
                })
              }
              disabled={resuelto}
              aria-label={`Hueco ${indice + 1}`}
              className={`mx-1 inline-block w-[130px] rounded-lg border-2 px-2.5 py-1 text-[15px] text-drc-texto outline-none transition-colors disabled:opacity-100 ${
                resuelto
                  ? bien
                    ? "border-marca-verde bg-drc-chip-verde"
                    : "border-[#D98282] bg-[#FDECEC]"
                  : "border-marca-borde bg-white focus:border-marca-verde"
              }`}
            />
          );
        })}
      </div>

      {!resuelto ? (
        <button
          type="button"
          onClick={() => setResuelto(true)}
          disabled={!algoEscrito}
          className="btn btn-primario mt-4 min-h-[44px] w-full sm:w-auto"
        >
          Comprobar
        </button>
      ) : (
        <AvisoResultado
          correcto={todoBien}
          solucion={
            todoBien
              ? null
              : aceptados
                  .map((opciones, i) => `${i + 1}. ${opciones[0] ?? ""}`)
                  .filter((t) => t.trim() !== "")
                  .join("   ")
          }
        />
      )}
    </>
  );
}

// ---------------------------------------------------------------

export default function EjerciciosLeccion({ ejercicios }: { ejercicios: EjercicioVista[] }) {
  if (ejercicios.length === 0) return null;

  return (
    <section className="mt-10 border-t border-marca-borde pt-8">
      <h2 className="font-display text-[22px] font-semibold leading-tight text-marca-tinta">
        Ejercicios
      </h2>
      <p className="mt-2 text-[14px] leading-[1.55] text-drc-cuerpo">
        {ejercicios.length === 1
          ? "Un ejercicio para fijar lo de arriba."
          : `${ejercicios.length} ejercicios para fijar lo de arriba.`}
      </p>

      <ol className="mt-6 flex flex-col gap-5">
        {ejercicios.map((ejercicio, i) => (
          <li
            key={ejercicio.id}
            className="rounded-2xl border border-marca-borde bg-white px-5 py-5 sm:px-6"
          >
            <p className="text-[11px] font-semibold uppercase leading-none tracking-[0.1em] text-drc-cuerpo">
              Ejercicio {i + 1}
            </p>

            {/* En el cloze el enunciado ES el ejercicio —lleva los huecos
                dentro— así que lo pinta el propio componente. */}
            {ejercicio.tipo !== "cloze" && (
              <p className="mt-3 text-pretty text-[16px] font-medium leading-snug text-marca-tinta">
                {ejercicio.enunciado}
              </p>
            )}

            <div className="mt-4">
              {ejercicio.tipo === "cloze" ? (
                <Huecos ejercicio={ejercicio} />
              ) : ejercicio.tipo === "essay" ? (
                // No hay ninguno importado, pero si algún día entra uno:
                // no tiene corrección automática y se dice.
                <p className="text-[14px] leading-[1.55] text-drc-cuerpo">
                  Este ejercicio es de escritura libre y lo revisa tu profesor.
                </p>
              ) : (
                <Opciones ejercicio={ejercicio} />
              )}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
