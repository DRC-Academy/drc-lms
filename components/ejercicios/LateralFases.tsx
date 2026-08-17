"use client";

import type { EjercicioUnificado, Fase } from "@/lib/ejercicio-unificado";

/**
 * El lateral de un bloque de práctica.
 *
 * ES EL MISMO MUEBLE QUE `LateralLecciones` del curso, con otro
 * contenido dentro: columna de 300px pegada, blanca, con borde a la
 * derecha; arriba el título y el progreso, en medio la lista, abajo un
 * pie. Lo que cambia es qué se lista —las tres fases con sus ejercicios
 * en vez de las lecciones del módulo— y qué dice el pie, que aquí es el
 * aviso del profesor.
 *
 * Antes esto era `TarjetaFases`: una tarjeta de 230px flotando junto al
 * contenido, con la paleta `drc-*` de la práctica. Se veía prestada al
 * lado de la del curso, que es justo lo que se venía a arreglar.
 *
 * NO NAVEGA, informa. Dentro de un bloque el orden es secuencial y no
 * hay atajos: por eso las filas son `<li>` y no enlaces, al revés que en
 * el curso, donde saltar de lección a lección sí tiene sentido.
 */

const FASES: Record<Fase, { nombre: string; numero: number; accion: string }> = {
  reconocer: { nombre: "Reconocer", numero: 1, accion: "Elige la forma" },
  transformar: { nombre: "Transformar", numero: 2, accion: "Reescribe" },
  producir: { nombre: "Producir", numero: 3, accion: "Escribe tú" },
};

const ORDEN: Fase[] = ["reconocer", "transformar", "producir"];

export default function LateralFases({
  titulo,
  ejercicios,
  indice,
  respondido,
  acertado,
  profesor,
}: {
  titulo: string;
  ejercicios: EjercicioUnificado[];
  /** El ejercicio en curso, desde 0. */
  indice: number;
  respondido: (i: number) => boolean;
  acertado: (i: number) => boolean;
  profesor?: string;
}) {
  const hechos = ejercicios.filter((_, i) => respondido(i)).length;
  const porcentaje = ejercicios.length > 0 ? Math.round((hechos / ejercicios.length) * 100) : 0;

  // Agrupadas en el orden de las fases, saltándose las que no tenga este
  // bloque: hay bloques sin producir, y una fase vacía no dice nada.
  const grupos = ORDEN.map((fase) => ({
    fase,
    pasos: ejercicios
      .map((ejercicio, i) => ({ ejercicio, i }))
      .filter(({ ejercicio }) => ejercicio.fase === fase),
  })).filter((grupo) => grupo.pasos.length > 0);

  return (
    <aside className="sticky top-[68px] hidden h-[calc(100dvh-68px)] flex-col border-r border-marca-borde bg-white min-[1100px]:flex">
      <div className="border-b border-marca-nieblaOscura px-[22px] pb-4 pt-[22px]">
        <p className="text-[11px] font-semibold uppercase leading-none tracking-[0.1em] text-marca-grisSuave">
          Tu práctica
        </p>
        <h2 className="mt-2 text-pretty font-display text-[16px] font-bold leading-[1.3] text-marca-tinta">
          {titulo}
        </h2>
        <div className="mt-3 flex items-center gap-2.5">
          <div className="h-[5px] flex-1 overflow-hidden rounded-[3px] bg-marca-pista">
            <div className="h-full rounded-[3px] bg-marca-verde" style={{ width: `${porcentaje}%` }} />
          </div>
          <span className="shrink-0 text-[12.5px] font-medium text-marca-gris tabular-nums">
            {hechos} de {ejercicios.length}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-4 pt-3">
        {grupos.map((grupo) => (
          <div key={grupo.fase} className="mb-3 last:mb-0">
            <p className="px-3.5 pb-1.5 pt-2 text-[10px] font-semibold uppercase leading-[1.2] tracking-[0.1em] text-marca-grisSuave">
              Fase {FASES[grupo.fase].numero} · {FASES[grupo.fase].nombre}
            </p>
            <ol>
              {grupo.pasos.map(({ ejercicio, i }) => (
                <Paso
                  key={ejercicio.id}
                  numero={i + 1}
                  texto={FASES[grupo.fase].accion}
                  actual={i === indice}
                  hecho={respondido(i)}
                  bien={acertado(i)}
                />
              ))}
            </ol>
          </div>
        ))}
      </div>

      {/* EL AVISO DEL PROFESOR. Va abajo del todo, en el pie, donde el
          curso pone "Ver el curso completo". Es lo que hace que la fase
          de producir se escriba en serio. */}
      {profesor && (
        <div className="border-t border-marca-nieblaOscura px-[18px] pb-4 pt-3.5">
          <div className="flex items-start gap-2.5">
            <span
              aria-hidden
              className="mt-px grid h-5 w-5 shrink-0 place-items-center rounded-full bg-marca-verde text-[10px] font-semibold leading-none text-white"
            >
              {profesor[0]?.toUpperCase()}
            </span>
            <p className="text-[12px] leading-[1.45] text-marca-gris">
              {profesor} verá tu respuesta antes de la clase.
            </p>
          </div>
        </div>
      )}
    </aside>
  );
}

/**
 * Una fila. Mismo esqueleto que `ItemLeccion`: acento a la izquierda en
 * la actual, punto de estado y texto que no se trunca a media palabra.
 */
function Paso({
  numero,
  texto,
  actual,
  hecho,
  bien,
}: {
  numero: number;
  texto: string;
  actual: boolean;
  hecho: boolean;
  bien: boolean;
}) {
  return (
    <li
      aria-current={actual ? "step" : undefined}
      className={`mb-0.5 flex items-start gap-[11px] rounded-r-[10px] border-l-[2.5px] py-3 pl-3.5 pr-3 ${
        actual ? "border-marca-verde bg-marca-verdeFondo" : "border-transparent"
      }`}
    >
      <span
        aria-hidden
        className={`mt-px grid h-4 w-4 shrink-0 place-items-center rounded-full border-[1.5px] text-[9px] font-semibold leading-none tabular-nums ${
          hecho
            ? bien
              ? "border-marca-verde bg-marca-verde text-white"
              : "border-marca-calido bg-marca-calido text-white"
            : actual
              ? "border-marca-verde text-marca-verdeOsc"
              : "border-marca-puntoPendiente text-marca-grisTenue"
        }`}
      >
        {hecho ? (bien ? "✓" : "—") : numero}
      </span>

      <span
        className={`min-w-0 flex-1 text-pretty text-[13.5px] leading-[1.35] ${
          actual
            ? "font-semibold text-marca-tinta"
            : hecho
              ? "text-marca-gris"
              : "text-marca-grisSuave"
        }`}
      >
        {texto}
      </span>
    </li>
  );
}
