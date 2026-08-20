import type { TextoHito } from "@/lib/diploma";

/**
 * EL PASO DE ESTA SEMANA. La mitad de en medio del embudo del diploma.
 *
 * Ocupa el mueble exacto que tenía `FilaDiploma` —50px, sello a la
 * izquierda, barra en medio y el nombre al final— pero cuenta otra cosa,
 * y ese cambio es el motivo de que exista.
 *
 * LA FILA REPETÍA A LA FRANJA. Decía "179 lecciones para tu diploma"
 * justo debajo de una franja que decía "llevas 12 de 191": el mismo
 * hecho, dos aritméticas y dos sitios. Ahora la meta vive arriba, en la
 * cifra de la franja, y aquí abajo va lo que de verdad faltaba: cuánto
 * queda para cerrar el módulo en el que está.
 *
 * LA BARRA ES LA DEL MÓDULO Y NO LA DEL CURSO. Es la que se mueve en una
 * sesión: terminar una lección de 191 no mueve un píxel, terminar una de
 * 7 mueve un séptimo. Una barra que responde es lo que hace que se
 * vuelva mañana; una que no se mueve nunca enseña que da igual entrar.
 *
 * DOS ANCHOS, UN SOLO ORDEN. En móvil el texto va encima de la barra
 * porque los dos no caben en 343px; a partir de `min-[900px]` se ponen
 * en línea y el nombre del módulo aparece al final, que es el sitio
 * donde sobra ancho. Nada cambia de posición entre los dos: solo se
 * estiran.
 *
 * Se renderiza en el servidor: no tiene estado ni interacción.
 */
export default function FilaHito({ texto }: { texto: TextoHito | null }) {
  if (texto === null) return null;

  // Terminado el curso no hay paso siguiente ni barra que llenar: queda
  // el sello, ya relleno, y la frase. Una barra al 100% al lado de "ya
  // está" no añade un dato, añade ruido.
  if (texto.tipo === "conseguido") {
    return (
      <section
        aria-label="Tu diploma"
        className="flex items-center gap-3 rounded-[14px] border border-marca-verde bg-marca-verdeFondo px-[14px] py-3 min-[900px]:gap-4 min-[900px]:px-5 min-[900px]:py-4"
      >
        <Sello conseguido />
        <p className="text-pretty text-[13.5px] leading-[1.35] text-marca-tinta min-[900px]:text-[15px]">
          <strong className="font-bold">{texto.etiqueta}</strong>
        </p>
      </section>
    );
  }

  const descripcion =
    texto.cifra === null
      ? "Te queda la última lección del curso"
      : `Te ${texto.cifra === 1 ? "falta" : "faltan"} ${texto.cifra} ${
          texto.cifra === 1 ? "lección" : "lecciones"
        } para cerrar este módulo`;

  return (
    <section
      aria-label="Tu próximo módulo"
      className="flex items-center gap-3 rounded-[14px] border border-marca-borde bg-white px-[14px] py-3 min-[900px]:gap-4 min-[900px]:px-5 min-[900px]:py-4"
    >
      <Sello />

      <div className="flex min-w-0 flex-1 flex-col gap-[7px] min-[900px]:flex-row min-[900px]:items-center min-[900px]:gap-4">
        <p className="text-[13.5px] leading-[1.35] text-marca-tinta min-[900px]:shrink-0 min-[900px]:text-[15px]">
          {texto.cifra === null ? (
            <strong className="font-bold">{texto.etiqueta}</strong>
          ) : (
            <>
              <strong className="font-bold tabular-nums">
                {texto.cifra} {texto.cifra === 1 ? "lección" : "lecciones"}
              </strong>{" "}
              {texto.etiqueta}
            </>
          )}
        </p>

        <div
          role="progressbar"
          aria-valuenow={texto.relleno}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={descripcion}
          className="h-1 overflow-hidden rounded-[3px] bg-marca-pista min-[900px]:h-[5px] min-[900px]:flex-1"
        >
          <div
            className="h-full rounded-[3px] bg-marca-verde transition-[width] duration-500"
            style={{ width: `${texto.relleno}%` }}
          />
        </div>

        {/* El módulo, solo donde sobra ancho. En móvil ya lo nombra la
            franja de arriba en su línea de contexto, así que repetirlo
            costaría una línea entera para no decir nada nuevo. */}
        {texto.pie !== "" && (
          <span className="hidden shrink-0 truncate text-[13px] text-marca-grisSuave min-[900px]:inline min-[900px]:max-w-[240px]">
            {texto.pie}
          </span>
        )}
      </div>
    </section>
  );
}

/** Un sello. Relleno cuando el diploma ya está, de contorno mientras no. */
function Sello({ conseguido }: { conseguido?: boolean }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 18 18"
      className="h-[17px] w-[17px] shrink-0 min-[900px]:h-[19px] min-[900px]:w-[19px]"
      fill="none"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="9" cy="7" r="4.6" stroke="#1E9E3A" fill={conseguido ? "#1E9E3A" : "none"} />
      <path d="M6.4 11.2 5.4 16l3.6-1.9 3.6 1.9-1-4.8" stroke="#1E9E3A" />
      {conseguido && <path d="M7 7l1.5 1.5L11 5.8" stroke="#FFFFFF" />}
    </svg>
  );
}
