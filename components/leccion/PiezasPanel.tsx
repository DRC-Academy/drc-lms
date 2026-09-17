"use client";

/**
 * Las piezas pequeñas del panel de la izquierda.
 *
 * Vivían dentro de `PanelCurso` y las necesita también el panel del
 * bloque de práctica (`components/practica/PanelBloque`): la barra de
 * progreso, el anillo con el porcentaje, la cabecera de una sublista,
 * el punto de estado y la marca de hecho. Son la razón de que los dos
 * paneles se vean iguales sin que nadie tenga que acordarse de copiar
 * un cambio de uno al otro.
 */

export function Barra({ texto, hechos, total }: { texto: string; hechos: number; total: number }) {
  const porcentaje = total > 0 ? Math.round((hechos / total) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between text-[12.5px]">
        <span className="text-marca-gris">{texto}</span>
        <span className="font-semibold text-marca-tinta tabular-nums">
          {hechos}/{total}
        </span>
      </div>
      <div className="mt-1.5 h-[5px] overflow-hidden rounded-[3px] bg-marca-pista">
        <div className="h-full rounded-[3px] bg-marca-verde" style={{ width: `${porcentaje}%` }} />
      </div>
    </div>
  );
}

export function Anillo({ porcentaje }: { porcentaje: number }) {
  const radio = 26;
  const circunferencia = 2 * Math.PI * radio;
  const lleno = (circunferencia * porcentaje) / 100;

  return (
    <svg width="64" height="64" viewBox="0 0 64 64" aria-hidden className="shrink-0">
      <circle cx="32" cy="32" r={radio} fill="none" stroke="#E8EEE9" strokeWidth="6" />
      <circle
        cx="32"
        cy="32"
        r={radio}
        fill="none"
        stroke="#1E9E3A"
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray={`${lleno.toFixed(1)} ${(circunferencia - lleno).toFixed(1)}`}
        transform="rotate(-90 32 32)"
      />
      <text
        x="32"
        y="36.5"
        textAnchor="middle"
        className="fill-marca-tinta font-display text-[14px] font-bold"
      >
        {porcentaje}%
      </text>
    </svg>
  );
}

/** La cabecera de una sublista: «Lecciones», «Ejercicios», «Fase 1 · Reconocer». */
export function FilaSub({
  texto,
  meta,
  abierto,
  alPulsar,
}: {
  texto: string;
  meta: string;
  abierto: boolean;
  alPulsar?: () => void;
}) {
  const dentro = (
    <>
      <span className="text-[13px] font-semibold text-marca-tinta">{texto}</span>
      <span className="text-[12px] text-marca-grisSuave tabular-nums">{meta}</span>
      {alPulsar && (
        <span className="ml-auto inline-flex">
          <Chevron abierto={abierto} />
        </span>
      )}
    </>
  );

  if (!alPulsar) return <div className="flex items-center gap-2.5 px-1.5 py-2.5">{dentro}</div>;

  return (
    <button
      type="button"
      onClick={alPulsar}
      aria-expanded={abierto}
      className="flex w-full items-center gap-2.5 rounded-[8px] px-1.5 py-2.5 text-left transition-colors hover:bg-marca-niebla/60"
    >
      {dentro}
    </button>
  );
}

export function Punto({ estado }: { estado: "hecha" | "actual" | "pendiente" }) {
  if (estado === "hecha") {
    return (
      <span
        aria-hidden
        className="mt-[2px] grid h-4 w-4 shrink-0 place-items-center rounded-full bg-marca-verde"
      >
        <Marca />
      </span>
    );
  }
  return (
    <span
      aria-hidden
      className={`mt-[2px] h-4 w-4 shrink-0 rounded-full border-[1.5px] ${
        estado === "actual" ? "border-marca-verde" : "border-marca-puntoPendiente"
      }`}
    />
  );
}

export function Marca() {
  return (
    <svg aria-hidden viewBox="0 0 10 10" className="h-[9px] w-[9px]" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 5.2 4.1 7.3 8 3" />
    </svg>
  );
}

export function Chevron({ abierto }: { abierto: boolean }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 16 16"
      className={`h-4 w-4 shrink-0 text-marca-grisSuave transition-transform duration-[var(--dur-estado)] ${
        abierto ? "rotate-180" : ""
      }`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m4 6 4 4 4-4" />
    </svg>
  );
}
