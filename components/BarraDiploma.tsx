/**
 * El avance hacia el diploma, siempre a la vista.
 *
 * Muy fina y fija: no compite con nada, pero no se va al hacer scroll.
 * Es la palanca de retención de la academia —hay gente que no se da de
 * baja porque el mes que viene lo saca— y una cifra que solo se ve al
 * abrir el inicio deja de existir en cuanto el alumno baja la página.
 *
 * CUENTA LO HECHO, NO LO QUE FALTA, y es lo contrario de lo que hace la
 * pantalla del inicio. No es una incoherencia: son dos trabajos. Ahí la
 * cifra empuja —«te faltan 81»— y aquí acompaña, así que dice dónde
 * estás sin pedir nada. Una barra fija repitiendo «te faltan 81» en
 * todas las pantallas y todo el rato se lee como una deuda.
 *
 * DÓNDE VA, QUE ES LO QUE TIENE MIGA:
 *
 *   · En escritorio, pegada bajo la cabecera. La cabecera ya es
 *     `sticky`, así que la barra hereda quedarse arriba sin más código.
 *   · En móvil, fija abajo, JUSTO ENCIMA de la navegación de secciones y
 *     dentro de su mismo contenedor. Pegadas, no flotando cada una por
 *     su lado: el borde inferior de un móvil es zona disputada y dos
 *     capas separadas se leen como dos barras.
 *
 * DÓNDE NO VA: dentro del curso. Allí la cabecera ya lleva el progreso
 * de ese curso —«12 de 191 lecciones»— que es exactamente este número.
 * Lo decide quien la monta, no ella.
 */
export default function BarraDiploma({
  completadas,
  total,
  variante,
}: {
  completadas: number;
  total: number;
  /** `cabecera` en escritorio; `pie` en la barra inferior de móvil. */
  variante: "cabecera" | "pie";
}) {
  if (total <= 0) return null;

  // Se acota por arriba por lo mismo que en `lib/diploma.ts`: hay
  // progreso migrado de lecciones que ya no están en el catálogo, y
  // "193 de 191" es la clase de cifra que hace dudar de todas las demás.
  const hechas = Math.max(0, Math.min(completadas, total));
  const porcentaje = Math.round((hechas / total) * 100);
  const completo = hechas >= total;

  const enPie = variante === "pie";

  return (
    <div
      data-barra-diploma
      aria-label="Progreso hacia tu diploma"
      className={
        enPie
          ? "flex items-center gap-2.5 border-t border-marca-borde bg-white px-4 py-[7px]"
          : "hidden border-t border-marca-borde bg-white lg:block"
      }
    >
      <div
        className={
          enPie
            ? "contents"
            : "mx-auto flex max-w-contenido items-center gap-3.5 px-9 py-[7px]"
        }
      >
        <Sello completo={completo} />

        <p className="shrink-0 text-[12.5px] leading-none text-marca-tinta lg:text-[13px]">
          <strong className="font-semibold tabular-nums">
            {hechas} de {total}
          </strong>{" "}
          lecciones
        </p>

        <div
          role="progressbar"
          aria-valuenow={porcentaje}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${hechas} de ${total} lecciones hacia tu diploma`}
          className="h-1 flex-1 overflow-hidden rounded-[2px] bg-marca-pista"
        >
          <div
            className="h-full rounded-[2px] bg-marca-verde transition-[width] duration-500"
            style={{ width: `${porcentaje}%` }}
          />
        </div>

        {/* Lo que el número significa, solo donde sobra ancho. En un
            móvil el sello y el contexto de la pantalla ya lo dicen; una
            segunda línea aquí abajo costaría alto de contenido. */}
        <p className="hidden shrink-0 text-[12.5px] leading-none text-marca-grisSuave lg:block">
          {completo ? "curso completado" : "para tu diploma"}
        </p>
      </div>
    </div>
  );
}

/** Un sello. Relleno cuando ya está el curso entero, de contorno mientras no. */
function Sello({ completo }: { completo: boolean }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 18 18"
      className="h-[15px] w-[15px] shrink-0"
      fill="none"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="9" cy="7" r="4.6" stroke="#1E9E3A" fill={completo ? "#1E9E3A" : "none"} />
      <path d="M6.4 11.2 5.4 16l3.6-1.9 3.6 1.9-1-4.8" stroke="#1E9E3A" />
      {completo && <path d="M7 7l1.5 1.5L11 5.8" stroke="#FFFFFF" />}
    </svg>
  );
}
