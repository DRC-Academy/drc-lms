"use client";

import { useRef, type KeyboardEvent } from "react";
import type { TextosValoraciones } from "@/lib/textos/valoraciones";
import { ESTRELLAS_MAX } from "@/lib/valoraciones";

// ---------------------------------------------------------------
// LAS CINCO ESTRELLAS
//
// Un grupo de radio de verdad (`role="radiogroup"`): cada estrella es un
// `role="radio"` con su etiqueta («3 estrellas: Bien»). Como en un grupo
// de radio nativo, el tabulador entra en UNA (la elegida, o la primera) y
// las flechas cambian la elección; Inicio y Fin van a la 1 y a la 5.
//
// GRANDES A PROPÓSITO. Cada estrella es un botón de 48 × 48 sin hueco
// entre uno y otro: hay alumnos de 60 años y en el móvil se tiene que
// acertar a la primera. El dibujo mide 34 px dentro de ese hueco.
//
// El amarillo es acento, no botón: aquí es lo correcto. Vacías, solo el
// borde. SVG en línea, sin librerías.
// ---------------------------------------------------------------

const PUNTAS = "M12 2.6l2.83 5.94 6.47.79-4.77 4.47 1.22 6.42L12 17.08l-5.75 3.14 1.22-6.42-4.77-4.47 6.47-.79z";

export function DibujoEstrella({ llena, tam }: { llena: boolean; tam: number }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" width={tam} height={tam} className="block">
      <path
        d={PUNTAS}
        fill={llena ? "#FFC400" : "#FFFFFF"}
        stroke={llena ? "#E0A800" : "#E2E8E4"}
        strokeWidth={llena ? 1 : 1.6}
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function Estrellas({
  valor,
  alCambiar,
  t,
  idEtiqueta,
}: {
  valor: number | null;
  alCambiar: (n: number) => void;
  t: TextosValoraciones;
  /** El id del texto que nombra el grupo, si lo hay a la vista. */
  idEtiqueta?: string;
}) {
  const botones = useRef<(HTMLButtonElement | null)[]>([]);
  const enfocable = valor ?? 1;

  function elegir(n: number) {
    alCambiar(n);
    botones.current[n - 1]?.focus();
  }

  function alPulsarTecla(evento: KeyboardEvent<HTMLDivElement>) {
    const actual = valor ?? 0;
    const siguiente: Record<string, number> = {
      // Las de un grupo de radio nativo: abajo y derecha, la siguiente.
      ArrowRight: Math.min(ESTRELLAS_MAX, actual + 1),
      ArrowDown: Math.min(ESTRELLAS_MAX, actual + 1),
      ArrowLeft: Math.max(1, actual - 1),
      ArrowUp: Math.max(1, actual - 1),
      Home: 1,
      End: ESTRELLAS_MAX,
    };
    if (!(evento.key in siguiente)) return;
    evento.preventDefault();
    elegir(siguiente[evento.key]);
  }

  return (
    <div
      role="radiogroup"
      aria-label={idEtiqueta ? undefined : t.grupoEstrellas}
      aria-labelledby={idEtiqueta}
      onKeyDown={alPulsarTecla}
      className="flex justify-center"
    >
      {Array.from({ length: ESTRELLAS_MAX }, (_, i) => {
        const n = i + 1;
        const elegida = valor === n;
        return (
          <button
            key={n}
            ref={(el) => {
              botones.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={elegida}
            aria-label={t.estrella(n, t.etiquetas[i])}
            tabIndex={n === enfocable ? 0 : -1}
            // Al abrir la hoja, el foco empieza aquí y no en la X.
            data-autofocus={n === enfocable ? "" : undefined}
            onClick={() => elegir(n)}
            className="grid h-12 w-12 place-items-center rounded-[12px] transition-transform duration-150 focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-[-3px] focus-visible:outline-marca-verdeOsc motion-safe:active:scale-90"
          >
            <DibujoEstrella llena={valor !== null && n <= valor} tam={34} />
          </button>
        );
      })}
    </div>
  );
}

/** Las estrellas ya puestas, en pequeño y sin pulsar. */
export function EstrellasFijas({ valor, etiqueta, tam = 18 }: { valor: number; etiqueta: string; tam?: number }) {
  return (
    <span role="img" aria-label={etiqueta} className="inline-flex items-center gap-[2px]">
      {Array.from({ length: ESTRELLAS_MAX }, (_, i) => (
        <DibujoEstrella key={i} llena={i < valor} tam={tam} />
      ))}
    </span>
  );
}
