import { textoDiploma, type EstadoDiploma } from "@/lib/diploma";

/**
 * Cuánto le falta al alumno para su diploma, en un anillo.
 *
 * Ocupa la columna derecha del inicio, junto al banner del curso: el
 * hueco donde antes vivía la invitación a completar el perfil. Es la
 * palanca de retención de la academia —hay gente que no se da de baja
 * porque el mes que viene lo saca— y ahí está a la altura de los ojos,
 * al lado de la acción que lo acerca.
 *
 * LA CIFRA ES LO QUE FALTA, NUNCA EL PORCENTAJE. Es el mismo dato y no
 * se lee igual: 81 lecciones es un objetivo, el 52% es una nota. El
 * porcentaje sobrevive solo como relleno del anillo, donde no se lee
 * como número sino como distancia.
 *
 * EL ANILLO ES SVG Y `stroke-dasharray`, sin una sola dependencia. Un
 * círculo de fondo, otro encima recortado a la fracción hecha, y un giro
 * de -90° para que empiece arriba en vez de a las tres. Son quince
 * líneas y evitan meter una librería de gráficos para dibujar un aro.
 *
 * EN MÓVIL CAMBIA DE EJE, no de contenido. En la columna estrecha de
 * escritorio el anillo va arriba y el texto debajo, centrado. A 375px un
 * círculo de ese tamaño ocupando el ancho entero empuja la práctica
 * fuera de la pantalla, así que se pone de lado: aro pequeño a la
 * izquierda, texto a la derecha. Mismo dato, un tercio del alto.
 *
 * Se renderiza en el servidor: no tiene estado ni interacción.
 */
export default function AnilloDiploma({
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
      className="flex items-center gap-4 rounded-[16px] border border-marca-borde bg-white p-[18px] min-[900px]:flex-col min-[900px]:gap-0 min-[900px]:rounded-[18px] min-[900px]:p-6 min-[900px]:text-center"
    >
      <Anillo
        relleno={relleno}
        cifra={texto.cifra}
        descripcion={descripcion}
        conseguido={conseguido}
      />

      <div className="min-w-0 flex-1 min-[900px]:mt-4 min-[900px]:flex-none">
        <p className="text-[10.5px] font-semibold uppercase leading-none tracking-[0.1em] text-marca-gris lg:text-[11px]">
          Tu diploma
        </p>

        <p className="mt-1.5 text-pretty font-display text-[15px] font-bold leading-[1.25] text-marca-tinta min-[900px]:mt-2 min-[900px]:text-[16px]">
          {texto.etiqueta}
        </p>

        {/* El curso, en pequeño. Es el pie: dice de qué diploma hablamos
            sin competir con la cifra, que es lo que se viene a leer. */}
        <p className="mt-1.5 text-pretty text-[12.5px] leading-[1.35] text-marca-grisSuave min-[900px]:mt-2">
          {texto.pie}
        </p>

        {texto.extra && (
          <p className="mt-1.5 text-pretty text-[12.5px] leading-[1.4] text-marca-gris min-[900px]:mt-2.5">
            {texto.extra}
          </p>
        )}
      </div>
    </section>
  );
}

/**
 * El aro.
 *
 * `r`, el radio, fija la circunferencia y con ella el `dasharray`: el
 * trazo dibujado es esa longitud menos el `dashoffset`, así que un
 * offset igual a la circunferencia entera no pinta nada —el 0%— y un
 * offset de cero la pinta completa.
 *
 * `pathLength={100}` ahorra la cuenta: le dice al navegador que trate la
 * longitud del trazado como 100 unidades, de modo que el offset ES el
 * porcentaje que falta. Sin esto habría un 2·π·r con decimales aquí en
 * medio, y el día que cambie el radio habría que acordarse de recalcular.
 */
function Anillo({
  relleno,
  cifra,
  descripcion,
  conseguido,
}: {
  relleno: number;
  cifra: number | null;
  descripcion: string;
  conseguido: boolean;
}) {
  return (
    <div
      role="img"
      aria-label={descripcion}
      className="relative grid h-[76px] w-[76px] shrink-0 place-items-center min-[900px]:h-[124px] min-[900px]:w-[124px]"
    >
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" aria-hidden>
        <circle cx="50" cy="50" r="44" fill="none" stroke="#E8EFEA" strokeWidth="9" />
        <circle
          cx="50"
          cy="50"
          r="44"
          fill="none"
          stroke="#1E9E3A"
          strokeWidth="9"
          strokeLinecap="round"
          pathLength={100}
          strokeDasharray="100"
          strokeDashoffset={100 - relleno}
        />
      </svg>

      {/* El centro, encima del aro. `absolute` y no un `<text>` del SVG
          para que la cifra use la tipografía y el ajuste óptico del resto
          de la interfaz en vez de escalarse con el viewBox. */}
      <div className="absolute grid place-items-center">
        {cifra === null || conseguido ? (
          <svg
            aria-hidden
            viewBox="0 0 24 24"
            className="h-7 w-7 min-[900px]:h-10 min-[900px]:w-10"
            fill="none"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M4.5 12.5 9.5 17.5 19.5 7" stroke="#1E9E3A" />
          </svg>
        ) : (
          <span
            className={`font-display font-bold leading-none tabular-nums text-marca-tinta ${
              // Tres cifras en un aro de 76px se salen. El tamaño baja con
              // la longitud, no con el estado: 187 al empezar y 9 al final
              // son el mismo sitio.
              cifra >= 100
                ? "text-[20px] min-[900px]:text-[32px]"
                : "text-[24px] min-[900px]:text-[38px]"
            }`}
          >
            {cifra}
          </span>
        )}
      </div>
    </div>
  );
}
