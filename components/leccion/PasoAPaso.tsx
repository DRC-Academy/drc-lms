"use client";

import { usarIdioma } from "@/components/ProveedorIdioma";

export type Paso = { id: string; titulo: string };

/**
 * El paso a paso de la lección: un nodo por parte, unidos por una línea.
 *
 * Es índice y progreso a la vez: dice cuántas partes tiene la lección,
 * cuáles están leídas —en verde, con su marca—, cuál se lee ahora —en
 * tinta— y cuáles faltan. Solo el nodo actual lleva su nombre debajo;
 * los demás lo dicen al pasar por encima y al lector de pantalla, que
 * es lo que evita seis rótulos peleándose por el ancho.
 *
 * EN MÓVIL SE PLIEGA a una línea —«Paso 2 de 6 · Instructions»— con una
 * barra debajo. Seis círculos con línea en 375px no se distinguen ni se
 * pulsan.
 *
 * SE PUEDE PULSAR UN NODO YA LEÍDO O EL SIGUIENTE, no cualquiera: la
 * lección se lee en orden, y el paso a paso lo respeta.
 */
export default function PasoAPaso({
  pasos,
  activo,
  todoHecho = false,
  alElegir,
}: {
  pasos: Paso[];
  activo: number;
  /** Los ejercicios ya están abiertos: la teoría entera en verde. */
  todoHecho?: boolean;
  alElegir?: (indice: number) => void;
}) {
  const t = usarIdioma().t.curso;
  const total = pasos.length;
  const etiquetaActual = todoHecho ? t.teoriaTerminada : pasos[activo]?.titulo ?? "";
  const hechos = todoHecho ? total : activo;

  return (
    <div className="w-full">
      {/* ------------------------------ ESCRITORIO ------------------------------ */}
      <ol className="hidden w-full min-[900px]:flex">
        {pasos.map((paso, i) => {
          const hecho = todoHecho || i < activo;
          const es = !todoHecho && i === activo;
          const alcanzable = hecho || i <= activo + 1;
          const izquierda = i === 0 ? "transparent" : hecho || es ? "bg-marca-verde" : "bg-marca-pista";
          const derecha = i === total - 1 ? "transparent" : hecho ? "bg-marca-verde" : "bg-marca-pista";

          // La etiqueta del nodo activo no cabe en su columna cuando hay
          // muchas partes: va suelta, centrada bajo el nodo, y en los dos
          // extremos pegada al borde para no salirse del paso a paso.
          const alineacion =
            i === 0
              ? "left-0 text-left"
              : i === total - 1
                ? "right-0 text-right"
                : "left-1/2 -translate-x-1/2 text-center";

          return (
            <li key={paso.id} className="relative flex min-w-0 flex-1 flex-col items-center pb-7">
              <div className="relative flex h-8 w-full items-center justify-center">
                <span
                  aria-hidden
                  className={`absolute left-0 right-1/2 top-[15px] h-[2px] ${
                    izquierda === "transparent" ? "" : izquierda
                  }`}
                />
                <span
                  aria-hidden
                  className={`absolute left-1/2 right-0 top-[15px] h-[2px] ${
                    derecha === "transparent" ? "" : derecha
                  }`}
                />
                <button
                  type="button"
                  disabled={!alElegir || !alcanzable || todoHecho}
                  onClick={() => alElegir?.(i)}
                  aria-current={es ? "step" : undefined}
                  aria-label={t.irALaParte(paso.titulo)}
                  title={paso.titulo}
                  className={`relative grid h-8 w-8 place-items-center rounded-full text-[13px] font-semibold transition-colors ${
                    hecho
                      ? "bg-marca-verde text-white"
                      : es
                        ? "bg-marca-tinta text-white"
                        : "border-[1.5px] border-marca-puntoPendiente bg-white text-marca-grisTenue"
                  } ${alcanzable && !todoHecho ? "hover:ring-4 hover:ring-marca-verdeFondo" : "cursor-default"}`}
                >
                  {hecho ? <Marca /> : i + 1}
                </button>
              </div>
              {es && (
                <span
                  className={`absolute top-[42px] max-w-[280px] truncate whitespace-nowrap text-[13px] font-semibold text-marca-tinta ${alineacion}`}
                >
                  {paso.titulo}
                </span>
              )}
            </li>
          );
        })}
      </ol>

      {/* -------------------------------- MÓVIL -------------------------------- */}
      <div className="min-[900px]:hidden">
        <div className="flex items-baseline justify-between gap-3">
          <span className="shrink-0 text-[13px] font-semibold text-marca-tinta tabular-nums">
            {todoHecho ? t.teoriaTerminada : t.pasoDe(activo + 1, total)}
          </span>
          {!todoHecho && (
            <span className="min-w-0 truncate text-[13px] text-marca-gris">{etiquetaActual}</span>
          )}
        </div>
        <div
          role="progressbar"
          aria-valuenow={hechos}
          aria-valuemin={0}
          aria-valuemax={total}
          className="mt-2 h-[5px] overflow-hidden rounded-[3px] bg-marca-pista"
        >
          <div
            className="h-full rounded-[3px] bg-marca-verde transition-[width] duration-[var(--dur-trazo)] ease-[var(--ease-trazo)]"
            style={{ width: `${total > 0 ? Math.round(((hechos + (todoHecho ? 0 : 0.5)) / total) * 100) : 0}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function Marca() {
  return (
    <svg aria-hidden viewBox="0 0 10 10" className="h-3.5 w-3.5" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 5.2 4.1 7.3 8 3" />
    </svg>
  );
}
