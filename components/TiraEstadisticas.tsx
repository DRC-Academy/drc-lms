import type { ReactNode } from "react";

/**
 * Las cuatro cifras del inicio.
 *
 * CADA NÚMERO SE LEE SOBRE SU ESCALA, no suelto. La barra de debajo dice
 * cuánto queda, que es la única forma honesta de comunicar avance sin
 * tener histórico: un "78%" a secas no distingue entre ir bien e ir mal.
 *
 * Se esconde entera cuando el alumno todavía no ha hecho nada. Cuatro
 * ceros no informan y lo único que consiguen es recibir a quien acaba de
 * entrar con un boletín en blanco. El nivel no cuenta como dato para esa
 * decisión: lo tiene todo el mundo desde el primer día.
 *
 * Sin librerías de gráficos: son divs con un ancho.
 */

/** Los cuatro tramos de la escala de nivel, en orden. */
const NIVELES = ["A2", "B1", "B2", "C1"] as const;

/** Cómo se dice cada nivel en cristiano. */
const PALABRA_NIVEL: Record<string, string> = {
  A1: "inicial",
  A2: "básico",
  B1: "intermedio",
  B2: "intermedio alto",
  C1: "avanzado",
};

export default function TiraEstadisticas({
  porcentajeCurso,
  completadas,
  total,
  dominados,
  practicados,
  aciertos,
  nivel,
}: {
  /** % de lecciones del curso completadas, o null si no tiene curso. */
  porcentajeCurso: number | null;
  completadas: number;
  total: number;
  /** Bloques de práctica dominados, o null si nunca practicó. */
  dominados: number | null;
  /** Bloques que ha practicado alguna vez: el denominador de los dominados. */
  practicados: number;
  /** % de acierto medio en práctica, o null si nunca practicó. */
  aciertos: number | null;
  nivel: string;
}) {
  const hayDatos = porcentajeCurso !== null || dominados !== null || aciertos !== null;
  if (!hayDatos) return null;

  const nivelLimpio = nivel.trim().toUpperCase();
  const tramoActual = NIVELES.indexOf(nivelLimpio as (typeof NIVELES)[number]);
  const palabra = PALABRA_NIVEL[nivelLimpio] ?? "";

  const pctDominados = practicados > 0 && dominados !== null ? (dominados / practicados) * 100 : 0;

  return (
    <section aria-label="Cómo vas" className="mt-[18px] lg:mt-6">
      <h2 className="mb-3 font-display text-[16px] font-bold text-marca-tinta lg:mb-4 lg:text-[17px]">
        Cómo vas
      </h2>

      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4 lg:gap-5">
        <Casilla etiquetaLarga="Del curso" pie={textoLecciones(completadas, total)} pieCorto="de tu curso">
          <Cifra valor={porcentajeCurso === null ? "—" : String(porcentajeCurso)} unidad="%" />
          <Escala porcentaje={porcentajeCurso ?? 0} />
        </Casilla>

        <Casilla
          etiquetaLarga="Bloques dominados"
          etiquetaCorta="Bloques"
          pie="de los que has practicado"
          pieCorto="dominados"
        >
          <Cifra
            valor={dominados === null ? "—" : String(dominados)}
            unidad={practicados > 0 ? `de ${practicados}` : ""}
            unidadSuave
          />
          <Escala porcentaje={pctDominados} />
        </Casilla>

        <Casilla etiquetaLarga="Aciertos" pie="en tus últimos ejercicios" pieCorto="últimos ejercicios">
          <Cifra valor={aciertos === null ? "—" : String(aciertos)} unidad="%" />
          <Escala porcentaje={aciertos ?? 0} />
        </Casilla>

        <Casilla etiquetaLarga="Nivel MCER">
          <Cifra valor={nivelLimpio === "" ? "—" : nivelLimpio} unidad={palabra} unidadSuave soloEscritorio />

          <div className="mt-2.5 grid grid-cols-4 gap-[3px] lg:mt-3.5 lg:gap-1">
            {NIVELES.map((n, i) => (
              <span
                key={n}
                className={`h-[5px] rounded-[3px] lg:h-1.5 ${
                  tramoActual === -1
                    ? "bg-marca-pista"
                    : i < tramoActual
                    ? "bg-marca-verdePalido"
                    : i === tramoActual
                    ? "bg-marca-verde"
                    : "bg-marca-pista"
                }`}
              />
            ))}
          </div>
          <div className="mt-1.5 grid grid-cols-4 gap-[3px] text-[10.5px] text-marca-grisSuave lg:mt-2 lg:gap-1 lg:text-[11.5px]">
            {NIVELES.map((n, i) => (
              <span key={n} className={i === tramoActual ? "font-semibold text-marca-tinta" : ""}>
                {n}
              </span>
            ))}
          </div>
        </Casilla>
      </div>
    </section>
  );
}

function textoLecciones(completadas: number, total: number): string {
  if (total === 0) return "sin curso asignado";
  return `llevas ${completadas} de ${total} lecciones`;
}

function Casilla({
  etiquetaLarga,
  etiquetaCorta,
  pie,
  pieCorto,
  children,
}: {
  etiquetaLarga: string;
  /** En móvil no caben dos palabras largas en una columna de media pantalla. */
  etiquetaCorta?: string;
  pie?: string;
  pieCorto?: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-[13px] border border-marca-borde bg-white p-3.5 lg:rounded-[14px] lg:p-5">
      <span className="text-[10.5px] font-semibold uppercase leading-none tracking-[0.09em] text-marca-grisSuave lg:text-[11px]">
        {etiquetaCorta ? (
          <>
            <span className="lg:hidden">{etiquetaCorta}</span>
            <span className="hidden lg:inline">{etiquetaLarga}</span>
          </>
        ) : (
          etiquetaLarga
        )}
      </span>

      {children}

      {pie && (
        <p className="mt-[7px] text-[11.5px] leading-[1.35] text-marca-grisSuave lg:mt-[9px] lg:text-[12.5px]">
          <span className="lg:hidden">{pieCorto ?? pie}</span>
          <span className="hidden lg:inline">{pie}</span>
        </p>
      )}
    </div>
  );
}

function Cifra({
  valor,
  unidad,
  unidadSuave,
  soloEscritorio,
}: {
  valor: string;
  unidad: string;
  /** Denominadores y palabras van en peso medio; los símbolos, en semibold. */
  unidadSuave?: boolean;
  /** La palabra del nivel no cabe en móvil. */
  soloEscritorio?: boolean;
}) {
  return (
    <p className="mt-[7px] flex items-baseline gap-1 lg:mt-2.5">
      <span className="font-display text-[27px] font-bold leading-none text-marca-tinta tabular-nums lg:text-[34px]">
        {valor}
      </span>
      {unidad !== "" && (
        <span
          className={`text-marca-grisSuave ${
            unidadSuave ? "text-[13px] font-medium lg:text-[15px]" : "text-[14px] font-semibold lg:text-[16px]"
          } ${soloEscritorio ? "hidden lg:inline" : ""}`}
        >
          {unidad}
        </span>
      )}
    </p>
  );
}

function Escala({ porcentaje }: { porcentaje: number }) {
  const ancho = Math.max(0, Math.min(100, Math.round(porcentaje)));

  return (
    <div className="mt-2.5 h-[5px] overflow-hidden rounded-[3px] bg-marca-pista lg:mt-3.5 lg:h-1.5">
      <div
        className="h-full rounded-[3px] bg-marca-verde transition-[width] duration-500"
        style={{ width: `${ancho}%` }}
      />
    </div>
  );
}
