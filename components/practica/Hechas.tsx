import Link from "next/link";
import type { Bloque } from "@/lib/data";
import { porcentajeDe, type ProgresoBloques } from "@/lib/ruta";

/**
 * LAS PARADAS QUE YA HIZO, CERRADAS Y SIN MEDALLA.
 *
 * Aquí hubo una colección de medallas: oro al 100%, verde a partir del
 * umbral de dominado, arena por debajo. Se van, y con ellas la racha y
 * el recuento de bloques dominados que había arriba.
 *
 * POR QUÉ. Detrás de esta pantalla hay una profesora que le lee al
 * alumno lo que escribe y le prepara la clase siguiente. Una colección
 * de insignias compite con ese vínculo: convierte «lo que trabajé con
 * Jimena» en «mi puntuación», y a quien lleva dos semanas sin poder dar
 * clase le enseña una racha rota, que es un reproche por algo que no
 * depende de él.
 *
 * Lo que sí hacía falta se queda: poder volver a un bloque cerrado. Eso
 * es una lista y una línea por parada, con su acierto —que es
 * información, no premio— y un enlace para repetirla.
 *
 * `<details>` nativo, como el resto de desplegables de la aplicación:
 * funciona sin JavaScript y se anuncia solo en lector de pantalla.
 */
export default function Hechas({
  bloques,
  progreso,
  alumnoId,
}: {
  /** Solo los cerrados, del más reciente al más antiguo. */
  bloques: Bloque[];
  progreso: ProgresoBloques;
  alumnoId: string;
}) {
  if (bloques.length === 0) return null;

  return (
    <details className="group mt-4 overflow-hidden rounded-[16px] border border-marca-borde bg-white min-[900px]:mt-5">
      <summary className="flex min-h-[56px] cursor-pointer list-none items-center gap-3.5 px-[18px] py-3.5 transition-colors hover:bg-marca-niebla [&::-webkit-details-marker]:hidden min-[900px]:min-h-[60px] min-[900px]:px-[22px]">
        <span aria-hidden className="shrink-0 text-[11px] text-marca-grisSuave">
          <span className="group-open:hidden">▸</span>
          <span className="hidden group-open:inline">▾</span>
        </span>

        <span className="flex-1 text-[15px] font-bold text-marca-tinta min-[900px]:text-[16px]">
          {bloques.length} {bloques.length === 1 ? "parada hecha" : "paradas hechas"}
        </span>

        <span className="shrink-0 text-[13px] text-marca-grisSuave">Puedes repetir cualquiera</span>
      </summary>

      <ul className="border-t border-marca-borde">
        {bloques.map((bloque) => {
          const pct = porcentajeDe(progreso, bloque);

          return (
            <li key={bloque.id} className="border-b border-marca-nieblaOscura last:border-b-0">
              <Link
                href={`/alumno/${alumnoId}/${bloque.id}`}
                className="flex min-h-[52px] items-center gap-4 px-[18px] py-3 transition-colors hover:bg-marca-niebla min-[900px]:px-[22px]"
              >
                <span
                  aria-hidden
                  className="grid h-[26px] w-[26px] shrink-0 place-items-center rounded-full bg-marca-verdeFondo"
                >
                  <svg
                    viewBox="0 0 20 20"
                    className="h-3.5 w-3.5"
                    fill="none"
                    stroke="#14722A"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M5 10.5l3.5 3.5L15 7" />
                  </svg>
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14.5px] font-medium text-marca-tinta min-[900px]:text-[15px]">
                    {bloque.titulo}
                  </span>
                  <span className="mt-[2px] block text-[12.5px] text-marca-grisSuave">
                    {bloque.area}
                    {pct !== null && (
                      <>
                        {" · "}
                        <span className="tabular-nums">{pct}%</span> de aciertos
                      </>
                    )}
                  </span>
                </span>

                <span className="shrink-0 text-[13px] font-semibold text-marca-verdeOsc">
                  Repetir
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </details>
  );
}
