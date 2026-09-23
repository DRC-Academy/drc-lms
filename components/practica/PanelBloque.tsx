"use client";

import Link from "next/link";
import type { EjercicioUnificado, Fase } from "@/lib/ejercicio-unificado";
import { usarIdioma } from "@/components/ProveedorIdioma";
import { Anillo, Barra, FilaSub, Marca } from "@/components/leccion/PiezasPanel";

/**
 * EL PANEL DEL BLOQUE, a la izquierda del ejercicio.
 *
 * Es el mismo panel que el del curso (`components/leccion/PanelCurso`)
 * con otro contenido dentro: donde el curso lista módulos y lecciones,
 * esto lista las tres fases del bloque con sus ejercicios. Las piezas
 * —el título, la puerta a la sección, la tarjeta de progreso con su
 * anillo, las cabeceras de sublista, los puntos de estado— son las
 * mismas y salen del mismo archivo, así que los dos paneles no pueden
 * verse distintos.
 *
 * Sustituye a `LateralFases`, que era una columna de 300px con su propio
 * mueble: la última pieza de «Para ti» que seguía con el diseño viejo.
 *
 * NO NAVEGA, informa. Dentro de un bloque el orden es secuencial y no
 * hay atajos: por eso las filas son `<li>` y no botones, al revés que
 * en el curso, donde saltar de lección a lección sí tiene sentido. La
 * única puerta es la de arriba, a «Para ti», donde el curso pone la del
 * temario.
 *
 * LA MASCOTA YA NO ESTÁ AQUÍ: mientras hay ejercicio va al pie de su
 * tarjeta, con el cuadro de lo que dice (components/ejercicios/
 * DialogoMascota), igual que en la lección.
 */

const NUMERO_FASE: Record<Fase, number> = { reconocer: 1, transformar: 2, producir: 3 };
const ORDEN: Fase[] = ["reconocer", "transformar", "producir"];

export default function PanelBloque({
  titulo,
  subtitulo,
  ejercicios,
  indice,
  terminado,
  respondido,
  acertado,
  profesor,
  hrefParaTi,
  alElegir,
}: {
  titulo: string;
  /** «Gramática · B1»: de qué va y para qué nivel. */
  subtitulo: string;
  ejercicios: EjercicioUnificado[];
  /** El ejercicio en curso, desde 0. */
  indice: number;
  /** El bloque está en su pantalla de cierre: no hay ejercicio actual. */
  terminado: boolean;
  respondido: (i: number) => boolean;
  acertado: (i: number) => boolean;
  profesor?: string;
  /** La puerta a «Para ti», ya con el foco. */
  hrefParaTi: string;
  /** Al pulsar la puerta: cierra el cajón en móvil. */
  alElegir?: () => void;
}) {
  const { t: todos } = usarIdioma();
  const t = todos.ejercicios;

  const hechos = ejercicios.filter((_, i) => respondido(i)).length;
  const total = ejercicios.length;
  const porcentaje = total > 0 ? Math.round((hechos / total) * 100) : 0;

  // Agrupados en el orden de las fases, saltándose las que no tenga este
  // bloque: hay bloques sin producir, y una fase vacía no dice nada.
  const grupos = ORDEN.map((fase) => ({
    fase,
    pasos: ejercicios
      .map((ejercicio, i) => ({ ejercicio, i }))
      .filter(({ ejercicio }) => ejercicio.fase === fase),
  })).filter((grupo) => grupo.pasos.length > 0);

  return (
    <div className="h-full overflow-y-auto px-4 pb-6 pt-7">
      <h2 className="font-display text-[22px] font-bold leading-[1.2] text-marca-tinta">
        {todos.navegacion.paraTi}
      </h2>
      <p className="mt-1.5 text-[12.5px] text-marca-gris">{subtitulo}</p>

      <Link
        href={hrefParaTi}
        onClick={alElegir}
        className="mt-4 flex w-full items-center justify-between gap-2 rounded-[10px] border border-marca-borde bg-marca-niebla px-3 py-[11px] text-[13.5px] font-semibold text-marca-tinta transition-colors hover:bg-marca-nieblaOscura"
      >
        {t.verMisBloques}
        <span aria-hidden className="text-marca-grisSuave">
          →
        </span>
      </Link>

      {/* EL BLOQUE, como el módulo abierto del curso: el título, la
          tarjeta de progreso y las sublistas debajo. */}
      <div className="mt-4 rounded-[12px] border border-marca-borde bg-white">
        <div className="flex items-end gap-3 px-4 pb-3 pt-3.5">
          <div className="min-w-0 flex-1 self-center">
            <span className="block text-[11px] font-semibold uppercase leading-none tracking-[0.1em] text-marca-grisSuave">
              {t.tuPractica}
            </span>
            <span className="mt-1.5 block text-pretty text-[14px] font-semibold leading-[1.3] text-marca-tinta">
              {titulo}
            </span>
          </div>
        </div>

        <div className="px-2.5 pb-2.5">
          <div className="flex items-start gap-4 rounded-[12px] bg-marca-niebla p-3.5">
            <div className="flex min-w-0 flex-1 flex-col gap-3">
              <p className="text-[13px] font-semibold text-marca-tinta">{todos.curso.tuProgresoActual}</p>
              <Barra texto={todos.curso.ejercicios} hechos={hechos} total={total} />
              <p className="text-[12.5px] leading-[1.45] text-marca-gris">
                {hechos >= total ? t.bloqueTerminado + "." : t.teFaltanEjercicios(total - hechos)}
              </p>
            </div>
            <Anillo porcentaje={porcentaje} />
          </div>

          <div className="mt-2">
            {grupos.map((grupo) => (
              <div key={grupo.fase}>
                <FilaSub
                  texto={t.faseEtiqueta(NUMERO_FASE[grupo.fase], t.fases[grupo.fase].nombre)}
                  meta={todos.curso.contador(
                    grupo.pasos.filter(({ i }) => respondido(i)).length,
                    grupo.pasos.length
                  )}
                  abierto
                />
                <ol className="flex flex-col gap-px pl-1.5 pr-1.5">
                  {grupo.pasos.map(({ i }) => {
                    const es = !terminado && i === indice;
                    const hecho = respondido(i);
                    const bien = acertado(i);
                    return (
                      <li
                        key={ejercicios[i]?.id ?? i}
                        aria-current={es ? "step" : undefined}
                        className={`flex items-center gap-2.5 rounded-[8px] px-2.5 py-[7px] ${
                          es ? "border border-marca-verde bg-marca-verdeFondo" : ""
                        }`}
                      >
                        <span
                          className={`w-[22px] text-[11px] font-semibold tracking-[0.08em] tabular-nums ${
                            es ? "text-marca-verde" : hecho ? "text-marca-gris" : "text-marca-grisTenue"
                          }`}
                        >
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <span
                          className={`flex-1 text-[13px] ${
                            es
                              ? "font-semibold text-marca-tinta"
                              : hecho
                                ? "text-marca-gris"
                                : "text-marca-grisSuave"
                          }`}
                        >
                          {t.fases[grupo.fase].accion}
                        </span>
                        {hecho && (
                          <span
                            aria-hidden
                            className={`grid h-4 w-4 place-items-center rounded-full text-[9px] font-semibold text-white ${
                              bien ? "bg-marca-verde" : "bg-marca-calido"
                            }`}
                          >
                            {bien ? <Marca /> : "—"}
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ol>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* EL AVISO DEL PROFESOR. Es lo que hace que la fase de producir se
          escriba en serio: el alumno sabe que esto no cae en un pozo. */}
      {profesor && (
        <div className="mt-4 flex items-start gap-2.5 rounded-[12px] bg-marca-niebla px-3.5 py-3">
          <span
            aria-hidden
            className="mt-px grid h-5 w-5 shrink-0 place-items-center rounded-full bg-marca-verde text-[10px] font-semibold leading-none text-white"
          >
            {profesor[0]?.toUpperCase()}
          </span>
          <p className="text-[12.5px] leading-[1.45] text-marca-gris">{t.avisoProfesorLateral(profesor)}</p>
        </div>
      )}
    </div>
  );
}
