import type { ReactNode } from "react";

/**
 * Las casillas de cifra del alumno.
 *
 * Vivían dentro de `TiraEstadisticas`, que es la tira del inicio. Cuando
 * `/practica` pasó a tener su propia fila de métricas —bloques de hoy,
 * en progreso, dominados, nivel— la alternativa era copiarlas allí, y
 * dos copias de la misma casilla se separan a la primera corrección.
 * Así que se mudan aquí y las dos pantallas pintan lo mismo.
 *
 * Lo que NO se mueve es qué mide cada casilla: eso lo decide cada
 * pantalla, porque el inicio habla de trayectoria y la práctica de la
 * sesión de hoy.
 *
 * Sin librerías de gráficos: son divs con un ancho.
 */

/** Los cuatro tramos de la escala de nivel, en orden. */
export const NIVELES = ["A2", "B1", "B2", "C1"] as const;

/** Cómo se dice cada nivel en cristiano. */
export const PALABRA_NIVEL: Record<string, string> = {
  A1: "inicial",
  A2: "básico",
  B1: "intermedio",
  B2: "intermedio alto",
  C1: "avanzado",
};

export function Casilla({
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

export function Cifra({
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

export function Escala({ porcentaje, suave }: { porcentaje: number; suave?: boolean }) {
  const ancho = Math.max(0, Math.min(100, Math.round(porcentaje)));

  return (
    <div className="mt-2.5 h-[5px] overflow-hidden rounded-[3px] bg-marca-pista lg:mt-3.5 lg:h-1.5">
      <div
        className={`h-full rounded-[3px] transition-[width] duration-500 ${
          // Lo empezado no es lo conseguido: el verde pleno se reserva a
          // lo que ya está hecho, y lo que está a medias va medio tono
          // por debajo. Sin esto, "2 en progreso" se lee como "2 hechos".
          suave ? "bg-marca-verdePalido" : "bg-marca-verde"
        }`}
        style={{ width: `${ancho}%` }}
      />
    </div>
  );
}

/**
 * La casilla del nivel, entera: cifra, palabra, los cuatro tramos y sus
 * etiquetas. Va junta porque los tramos solo significan algo con el
 * nivel al lado, y el pie cambia según la pantalla que la pinte.
 */
export function CasillaNivel({ nivel, pie, pieCorto }: { nivel: string; pie?: string; pieCorto?: string }) {
  const nivelLimpio = nivel.trim().toUpperCase();
  const tramoActual = NIVELES.indexOf(nivelLimpio as (typeof NIVELES)[number]);
  const palabra = PALABRA_NIVEL[nivelLimpio] ?? "";

  return (
    <Casilla etiquetaLarga="Nivel MCER" pie={pie} pieCorto={pieCorto}>
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
      <div
        className="mt-1.5 grid grid-cols-4 gap-[3px] text-[10.5px] text-marca-grisSuave lg:mt-2 lg:gap-1 lg:text-[11.5px]"
      >
        {NIVELES.map((n, i) => (
          <span key={n} className={i === tramoActual ? "font-semibold text-marca-tinta" : ""}>
            {n}
          </span>
        ))}
      </div>
    </Casilla>
  );
}
