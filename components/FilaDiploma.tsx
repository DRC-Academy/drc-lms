import { textoDiploma, type EstadoDiploma } from "@/lib/diploma";

/**
 * Cuánto le falta al alumno para su diploma, en una fila.
 *
 * Va debajo de la franja del curso, pegada a ella: la acción arriba y el
 * motivo justo después. Es la palanca de retención de la academia —hay
 * gente que no se da de baja porque el mes que viene lo saca— así que
 * está en el inicio y no dentro del curso, donde solo lo ve quien ya ha
 * entrado.
 *
 * FUE UN ANILLO DE 124px Y AHORA ES UNA FILA DE 50. Decía exactamente lo
 * mismo ocupando tres veces más alto, y ese alto era justo lo que
 * empujaba la práctica fuera de la primera pantalla. Lo que se ganó al
 * encogerlo no es aire: es que el bloque de práctica se vea sin bajar.
 *
 * LA CIFRA ES LO QUE FALTA, NUNCA EL PORCENTAJE. Es el mismo dato y no
 * se lee igual: 81 lecciones es un objetivo, el 52% es una nota. El
 * porcentaje sobrevive solo como ancho de la barra, donde no se lee como
 * número sino como distancia.
 *
 * DOS ANCHOS, UN SOLO ORDEN. En móvil el texto va encima de la barra
 * porque los dos no caben en 343px; a partir de `min-[900px]` se ponen
 * en línea y el nombre del curso aparece al final, que es el sitio donde
 * sobra ancho. Nada cambia de posición entre los dos: solo se estiran.
 *
 * Se renderiza en el servidor: no tiene estado ni interacción.
 */
export default function FilaDiploma({
  estado,
  tituloCurso,
}: {
  estado: EstadoDiploma;
  tituloCurso: string;
}) {
  // Se descarta el caso vacío antes de pedir el texto: es lo que le deja
  // a TypeScript estrechar la unión para leer `porcentaje` más abajo.
  if (estado.estado === "sin-curso") return null;

  const texto = textoDiploma(estado, tituloCurso);
  if (texto === null) return null;

  const conseguido = estado.estado === "conseguido";
  const relleno = conseguido ? 100 : estado.porcentaje;

  const descripcion = conseguido
    ? `Has completado ${tituloCurso}`
    : `Te ${texto.cifra === 1 ? "falta" : "faltan"} ${texto.cifra} de ${estado.total} lecciones para tu diploma de ${tituloCurso}`;

  return (
    <section
      aria-label="Tu diploma"
      className="flex items-center gap-3 rounded-[14px] border border-marca-borde bg-white px-[14px] py-3 min-[900px]:gap-4 min-[900px]:px-5 min-[900px]:py-4"
    >
      <Sello conseguido={conseguido} />

      <div className="flex min-w-0 flex-1 flex-col gap-[7px] min-[900px]:flex-row min-[900px]:items-center min-[900px]:gap-4">
        <p className="text-[13.5px] leading-[1.35] text-marca-tinta min-[900px]:shrink-0 min-[900px]:text-[15px]">
          {conseguido ? (
            <strong className="font-bold">{texto.etiqueta}</strong>
          ) : (
            <>
              <strong className="font-bold tabular-nums">
                {texto.cifra} {texto.cifra === 1 ? "lección" : "lecciones"}
              </strong>{" "}
              para tu diploma
            </>
          )}
        </p>

        <div
          role="progressbar"
          aria-valuenow={relleno}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={descripcion}
          className="h-1 overflow-hidden rounded-[3px] bg-marca-pista min-[900px]:h-[5px] min-[900px]:flex-1"
        >
          <div
            className="h-full rounded-[3px] bg-marca-verde transition-[width] duration-500"
            style={{ width: `${relleno}%` }}
          />
        </div>

        {/* El curso, solo donde sobra ancho. En móvil ya lo nombra la
            franja de arriba, así que repetirlo costaría una línea entera
            para no decir nada nuevo. */}
        <span className="hidden shrink-0 text-[13px] text-marca-grisSuave min-[900px]:inline">
          {texto.pie}
        </span>
      </div>
    </section>
  );
}

/** Un sello. Relleno cuando ya está conseguido, de contorno mientras no. */
function Sello({ conseguido }: { conseguido: boolean }) {
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
