import Link from "next/link";
import type { Bloque } from "@/lib/data";
import { UMBRAL_DOMINADO } from "@/lib/progreso";
import { porcentajeDe, type ProgresoBloques } from "@/lib/ruta";

/**
 * «YA REALIZADOS», CERRADO.
 *
 * Los bloques hechos no se ven. Ocupaban lo mismo que los que quedaban
 * por hacer, así que la lista parecía el doble de larga de lo que era y
 * la pregunta «¿qué me queda?» se respondía contando.
 *
 * Y AL ABRIRLO NO SON UNA LISTA OTRA VEZ: son medallas. Un bloque
 * cerrado deja de ser trabajo pendiente y pasa a ser algo que tienes;
 * darle el mismo mueble que a lo pendiente es lo que lo devolvía a la
 * cola de tareas.
 *
 * TRES MEDALLAS, LA MISMA REGLA QUE YA HABÍA. Oro el 100%, verde a
 * partir del umbral de dominado, arena por debajo. No se inventa ninguna
 * categoría: es el 80% que el producto ya usa en «Bloques dominados».
 *
 * `<details>` nativo, como el resto de desplegables de la aplicación:
 * funciona sin JavaScript y se anuncia solo en lector de pantalla.
 */
export default function Medallas({
  bloques,
  progreso,
  alumnoId,
}: {
  /** Solo los cerrados, en el orden en que se quieren enseñar. */
  bloques: Bloque[];
  progreso: ProgresoBloques;
  alumnoId: string;
}) {
  if (bloques.length === 0) return null;

  return (
    <details className="group mt-4 overflow-hidden rounded-[16px] border border-marca-borde bg-white">
      <summary className="flex min-h-[56px] cursor-pointer list-none items-center gap-3.5 px-[18px] py-3.5 transition-colors hover:bg-marca-niebla [&::-webkit-details-marker]:hidden min-[900px]:min-h-[60px] min-[900px]:px-[22px]">
        <span aria-hidden className="shrink-0 text-[11px] text-marca-grisSuave">
          <span className="group-open:hidden">▸</span>
          <span className="hidden group-open:inline">▾</span>
        </span>

        <span className="flex-1 text-[15px] font-bold text-marca-tinta min-[900px]:text-[16px]">
          Ya realizados
        </span>

        {/* Un adelanto apilado de las tres últimas: se ve que hay algo
            dentro sin tener que abrirlo. */}
        <span aria-hidden className="hidden items-center group-open:hidden min-[900px]:flex">
          {bloques.slice(0, 3).map((bloque, i) => {
            const pct = porcentajeDe(progreso, bloque) ?? 0;
            const oro = pct === 100;
            return (
              <span
                key={bloque.id}
                className={`grid h-[30px] w-[30px] place-items-center rounded-full border-2 border-white text-[12px] font-bold ${
                  oro
                    ? "bg-marca-examen text-marca-amarilloTexto"
                    : pct >= UMBRAL_DOMINADO
                      ? "bg-marca-verdeFondo text-marca-verdeOsc"
                      : "bg-marca-calidoFondo text-marca-calidoBadgeTexto"
                } ${i > 0 ? "-ml-2" : ""}`}
              >
                {oro ? "★" : pct >= UMBRAL_DOMINADO ? "✓" : "—"}
              </span>
            );
          })}
        </span>

        <span className="shrink-0 text-[13.5px] tabular-nums text-marca-gris min-[900px]:text-[14px]">
          {bloques.length} {bloques.length === 1 ? "bloque" : "bloques"}
        </span>
      </summary>

      <div className="border-t border-marca-nieblaOscura px-[18px] pb-5 pt-6 min-[900px]:px-[22px]">
        <ul className="flex flex-wrap gap-x-6 gap-y-2">
          {bloques.map((bloque) => (
            <li key={bloque.id}>
              <Medalla bloque={bloque} porcentaje={porcentajeDe(progreso, bloque)} alumnoId={alumnoId} />
            </li>
          ))}
        </ul>

        <p className="mt-5 text-[13.5px] text-marca-grisSuave">
          Pulsa cualquiera para repetirlo. Repetir no baja la medalla: se queda la mejor.
        </p>
      </div>
    </details>
  );
}

function Medalla({
  bloque,
  porcentaje,
  alumnoId,
}: {
  bloque: Bloque;
  porcentaje: number | null;
  alumnoId: string;
}) {
  const pct = porcentaje ?? 0;
  const oro = pct === 100;
  const dominado = pct >= UMBRAL_DOMINADO;

  const aro = oro
    ? "border-marca-amarillo bg-marca-examen"
    : dominado
      ? "border-marca-verde bg-marca-verdeFondo"
      : "border-marca-calidoSegmento bg-marca-calidoFondo";

  const tinte = oro
    ? "text-marca-amarilloTexto"
    : dominado
      ? "text-marca-verdeOsc"
      : "text-marca-calidoBadgeTexto";

  return (
    <Link
      href={`/alumno/${alumnoId}/${bloque.id}`}
      className="flex w-[132px] flex-col items-center gap-2.5 rounded-[12px] py-2 transition-colors hover:bg-marca-niebla"
    >
      <span className={`grid h-[62px] w-[62px] place-items-center rounded-full border-2 ${aro}`}>
        {oro ? (
          <svg
            aria-hidden
            viewBox="0 0 18 18"
            className="h-[30px] w-[30px]"
            fill="none"
            stroke="#9A7B00"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="9" cy="7" r="4.6" />
            <path d="M6.4 11.2 5.4 16l3.6-1.9 3.6 1.9-1-4.8" />
          </svg>
        ) : dominado ? (
          <svg
            aria-hidden
            viewBox="0 0 20 20"
            className="h-[26px] w-[26px]"
            fill="none"
            stroke="#1E9E3A"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 10.5l3.5 3.5L15 7" />
          </svg>
        ) : (
          <span aria-hidden className="text-[20px] font-bold text-marca-calidoBadgeTexto">
            —
          </span>
        )}
      </span>

      <span className="text-center">
        <span className="block text-pretty text-[13.5px] font-semibold leading-[1.3] text-marca-tinta">
          {bloque.titulo}
        </span>
        <span className={`mt-[3px] block text-[12px] font-bold tabular-nums ${tinte}`}>{pct}%</span>
      </span>
    </Link>
  );
}
