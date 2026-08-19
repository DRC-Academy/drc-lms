import { PALABRA_NIVEL } from "@/components/Casillas";
import { textoDiploma, type EstadoDiploma } from "@/lib/diploma";

/**
 * Cuánto le falta al alumno para su diploma.
 *
 * Es la palanca de retención de la academia —hay gente que no se da de
 * baja porque el mes que viene lo saca— así que va en el inicio, debajo
 * del banner del curso, y no dentro del curso donde solo lo ve quien ya
 * ha entrado.
 *
 * SE CUENTA LO QUE FALTA, NO EL PORCENTAJE. Es el mismo dato y no se lee
 * igual: doce lecciones es una tarde, el 68% no es nada. El porcentaje
 * solo sobrevive como ancho de la barra.
 *
 * NO ES UNA BARRA FIJA, y es a propósito. En móvil el borde inferior ya
 * lo ocupa la navegación de secciones —fija, con 78px reservados en
 * `globals.css`— y `/practica` puede añadir encima su propia barra de
 * sesión. Una tercera capa fija dejaría la pantalla mirando por una
 * rendija. Aquí gana estar cerca del banner del curso, que es adonde
 * lleva la acción.
 *
 * ABSORBE EL NIVEL MCER. Antes vivía en `TiraEstadisticas`, junto a un
 * "% del curso" que ahora dice exactamente lo mismo que esta barra. Dos
 * elementos para el mismo dato, en una pantalla cuyo principio es tener
 * dos o tres. Se queda uno, y el nivel viaja dentro como lo que es: el
 * contexto de a qué altura va todo esto, no una métrica aparte.
 *
 * Se renderiza en el servidor: no tiene estado ni interacción.
 */
export default function BannerDiploma({
  estado,
  tituloCurso,
  nivel,
}: {
  estado: EstadoDiploma;
  /** Para nombrar el curso en la nota. */
  tituloCurso: string;
  /** Nivel MCER tal y como viene de Gestión. Vacío si no hay perfil. */
  nivel: string;
}) {
  // Se descarta el caso vacío ANTES de pedir el texto, aunque
  // `textoDiploma` también devuelva null ahí. Es lo que le deja a
  // TypeScript estrechar la unión: sin esta línea, `estado.porcentaje`
  // de abajo sigue pudiendo ser el caso "sin-curso".
  if (estado.estado === "sin-curso") return null;

  const texto = textoDiploma(estado, tituloCurso);
  if (texto === null) return null;

  const conseguido = estado.estado === "conseguido";
  const porcentaje = conseguido ? 100 : estado.porcentaje;

  const nivelLimpio = nivel.trim().toUpperCase();
  const palabra = PALABRA_NIVEL[nivelLimpio] ?? "";

  return (
    <section
      aria-labelledby="titulo-diploma"
      className="rounded-[16px] border border-marca-borde bg-white px-[18px] py-4 lg:rounded-[18px] lg:px-6 lg:py-[18px]"
    >
      <div className="lg:flex lg:items-center lg:gap-6">
        <div className="lg:min-w-0 lg:flex-1">
          <p className="flex items-center gap-2">
            <IconoDiploma conseguido={conseguido} />
            <span className="text-[10.5px] font-semibold uppercase leading-none tracking-[0.1em] text-marca-gris lg:text-[11px]">
              Tu diploma
            </span>
          </p>

          <h2
            id="titulo-diploma"
            className="mt-2 text-pretty font-display text-[17px] font-bold leading-[1.25] text-marca-tinta lg:mt-2.5 lg:text-[20px]"
          >
            {texto.titulo}
          </h2>

          <p className="mt-1 text-pretty text-[13.5px] leading-[1.45] text-marca-gris lg:text-[14px]">
            {texto.nota}
          </p>
        </div>

        {/* EL NIVEL, A LA DERECHA EN ESCRITORIO Y BAJO LA BARRA EN MÓVIL.
            Es contexto, no la cifra principal: se lee después de saber
            cuánto falta, y por eso no compite en tamaño. */}
        {nivelLimpio !== "" && (
          <p className="mt-3 hidden shrink-0 items-baseline gap-1.5 border-l border-marca-borde pl-6 lg:mt-0 lg:flex">
            <span className="font-display text-[20px] font-bold leading-none text-marca-tinta">
              {nivelLimpio}
            </span>
            {palabra !== "" && (
              <span className="text-[13px] text-marca-grisSuave">{palabra}</span>
            )}
          </p>
        )}
      </div>

      {/* MUY FINA. Es la referencia de un vistazo, no el contenido: si
          pesara más que la frase, volveríamos a comunicar el porcentaje. */}
      <div
        role="progressbar"
        aria-valuenow={porcentaje}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Progreso hacia el diploma de ${tituloCurso}`}
        className="mt-3.5 h-[5px] w-full overflow-hidden rounded-[3px] bg-marca-pista lg:mt-4"
      >
        <div
          className="h-full rounded-[3px] bg-marca-verde transition-[width] duration-500"
          style={{ width: `${porcentaje}%` }}
        />
      </div>

      {nivelLimpio !== "" && (
        <p className="mt-2 text-[12.5px] text-marca-grisSuave lg:hidden">
          Nivel {nivelLimpio}
          {palabra !== "" && ` · ${palabra}`}
        </p>
      )}
    </section>
  );
}

/** Un sello. Relleno cuando ya está conseguido, de contorno mientras no. */
function IconoDiploma({ conseguido }: { conseguido: boolean }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 18 18"
      className="h-[15px] w-[15px] shrink-0"
      fill="none"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle
        cx="9"
        cy="7"
        r="4.6"
        stroke="#1E9E3A"
        fill={conseguido ? "#1E9E3A" : "none"}
      />
      <path d="M6.4 11.2 5.4 16l3.6-1.9 3.6 1.9-1-4.8" stroke="#1E9E3A" />
      {conseguido && <path d="M7 7l1.5 1.5L11 5.8" stroke="#FFFFFF" />}
    </svg>
  );
}
