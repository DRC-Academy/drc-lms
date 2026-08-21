import type { ReactNode } from "react";
import { NIVELES, PALABRA_NIVEL } from "@/components/Casillas";

/**
 * LAS TRES FICHAS DE ARRIBA.
 *
 * Sustituyen a las cuatro casillas de «Cómo va tu sesión», y el cambio no
 * es de forma: aquellas medían la SESIÓN —bloques de hoy, en progreso—,
 * o sea el uso del producto. Estas miden lo que el alumno LLEVA
 * ACUMULADO, que es lo que se colecciona y lo que da ganas de volver.
 *
 * NINGUNA CIFRA ES INVENTADA. La racha sale de las fechas de su propio
 * progreso, el nivel es el MCER de su ficha y los dominados son el
 * umbral del 80% que ya existía. No hay puntos ni niveles de juego
 * fabricados: un marcador que no significa nada se descubre a la segunda
 * semana.
 *
 * Una ficha que no tiene dato no se pinta a cero: desaparece. Un «0 días
 * seguidos» no es un dato, es un reproche.
 */
export default function HudPractica({
  racha,
  nivel,
  dominados,
}: {
  /** Días seguidos, o null si no llega a dos o no se puede saber. */
  racha: number | null;
  /** Nivel MCER tal cual viene de Gestión. Vacío si no lo hay. */
  nivel: string;
  /** Bloques dominados de todo su historial, o null si nunca practicó. */
  dominados: number | null;
}) {
  const nivelLimpio = nivel.trim().toUpperCase();
  const tramo = NIVELES.indexOf(nivelLimpio as (typeof NIVELES)[number]);
  const palabra = PALABRA_NIVEL[nivelLimpio] ?? "";

  const hayAlgo = racha !== null || nivelLimpio !== "" || (dominados !== null && dominados > 0);
  if (!hayAlgo) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 min-[900px]:gap-3">
      {racha !== null && (
        <Ficha
          fondo="bg-marca-examen border-[#E9DCA9]"
          icono={
            <span className="grid h-[26px] w-[26px] shrink-0 place-items-center rounded-full bg-marca-amarillo min-[900px]:h-[30px] min-[900px]:w-[30px]">
              <svg
                viewBox="0 0 20 20"
                className="h-[15px] w-[15px] min-[900px]:h-[17px] min-[900px]:w-[17px]"
                fill="none"
                stroke="#12211A"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M10 17.5c2.8 0 5-2.1 5-4.8 0-3.4-3.2-4.7-2.6-8.2-2 .6-3.4 2.3-3.4 4.1 0 1-.7 1.6-1.3 1.1-.6-.5-.8-1.4-.7-2.2C5.9 8.7 5 10.6 5 12.7c0 2.7 2.2 4.8 5 4.8Z" />
              </svg>
            </span>
          }
          cifra={String(racha)}
          texto="días seguidos"
          textoClase="text-marca-calidoBadgeTexto"
        />
      )}

      {nivelLimpio !== "" && (
        <Ficha
          icono={
            <span aria-hidden className="flex shrink-0 items-center gap-[2px] min-[900px]:gap-[3px]">
              {NIVELES.map((n, i) => (
                <svg key={n} viewBox="0 0 12 14" className="block h-[12px] w-[11px] min-[900px]:h-[13px] min-[900px]:w-[13px]">
                  <path d="M6 0l5.2 3v8L6 14 .8 11V3z" fill={i <= tramo ? "#1E9E3A" : "#DCE4DE"} />
                </svg>
              ))}
            </span>
          }
          cifra={nivelLimpio}
          texto={palabra}
        />
      )}

      {dominados !== null && dominados > 0 && (
        <Ficha
          icono={
            <span className="grid h-[26px] w-[26px] shrink-0 place-items-center rounded-full bg-marca-verdeFondo min-[900px]:h-[30px] min-[900px]:w-[30px]">
              <svg
                viewBox="0 0 18 18"
                className="h-[15px] w-[15px] min-[900px]:h-[17px] min-[900px]:w-[17px]"
                fill="none"
                stroke="#1E9E3A"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="9" cy="7" r="4.6" />
                <path d="M6.4 11.2 5.4 16l3.6-1.9 3.6 1.9-1-4.8" />
              </svg>
            </span>
          }
          cifra={String(dominados)}
          texto={dominados === 1 ? "bloque dominado" : "bloques dominados"}
        />
      )}
    </div>
  );
}

function Ficha({
  icono,
  cifra,
  texto,
  fondo = "bg-white border-marca-borde",
  textoClase = "text-marca-gris",
}: {
  icono: ReactNode;
  cifra: string;
  texto: string;
  fondo?: string;
  textoClase?: string;
}) {
  return (
    <div
      className={`flex items-center gap-2.5 rounded-full border py-2.5 pl-2.5 pr-3.5 min-[900px]:gap-[11px] min-[900px]:py-[11px] min-[900px]:pl-3.5 min-[900px]:pr-[18px] ${fondo}`}
    >
      {icono}
      <span>
        <span className="font-display text-[17px] font-extrabold leading-none text-marca-tinta tabular-nums min-[900px]:text-[20px]">
          {cifra}
        </span>
        {texto !== "" && (
          <span className={`mt-[3px] block text-[12px] font-medium leading-[1.2] min-[900px]:text-[13.5px] ${textoClase}`}>
            {texto}
          </span>
        )}
      </span>
    </div>
  );
}
