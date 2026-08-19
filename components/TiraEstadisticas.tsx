import { Casilla, CasillaNivel, Cifra, Escala } from "@/components/Casillas";

/**
 * Las dos cifras del inicio: cuánto llevas del curso y a qué nivel vas.
 *
 * ERAN CUATRO. "Bloques dominados" y "Aciertos" se han ido, y no por
 * falta de sitio: son medidas de rendimiento, y en la pantalla a la que
 * el alumno llega al entrar, un porcentaje de aciertos es una nota. La
 * práctica está para equivocarse —de ahí salen los distractores del
 * bloque siguiente— y recibir a alguien con su media de aciertos empuja
 * justo a lo contrario: a no abrir el bloque los días flojos.
 *
 * Las dos que quedan miden avance, no acierto. "Del curso" dice cuánto
 * le falta y el nivel dice a qué altura va todo lo que se le sirve.
 * Ninguna de las dos empeora por practicar.
 *
 * SIGUEN EN EL PANEL DEL EQUIPO, donde sí son útiles: allí la pregunta
 * es si el material funciona, y esa se responde exactamente con la tasa
 * de acierto. La diferencia no es el número, es quién lo lee.
 *
 * Se esconde entera cuando no hay curso del que hablar. Con una sola
 * casilla a cero y el nivel al lado, esto no informa: es un boletín en
 * blanco delante de quien acaba de entrar. El nivel no cuenta como dato
 * para esa decisión, porque lo tiene todo el mundo desde el primer día.
 *
 * Las casillas en sí viven en `components/Casillas.tsx`: `/practica`
 * tiene su propia fila con otras medidas y las dos pantallas comparten
 * el mueble. Aquí queda lo que es de esta pantalla, que es qué se mide y
 * con qué escala se lee.
 */
export default function TiraEstadisticas({
  porcentajeCurso,
  completadas,
  total,
  nivel,
}: {
  /** % de lecciones del curso completadas, o null si no tiene curso. */
  porcentajeCurso: number | null;
  completadas: number;
  total: number;
  nivel: string;
}) {
  if (porcentajeCurso === null) return null;

  return (
    <section aria-label="Cómo vas" className="mt-[18px] lg:mt-6">
      <h2 className="mb-3 font-display text-[16px] font-bold text-marca-tinta lg:mb-4 lg:text-[17px]">
        Cómo vas
      </h2>

      {/* Dos casillas: media pantalla cada una en móvil, y en escritorio
          se quedan a la izquierda en vez de estirarse hasta el borde. Con
          `grid-cols-4` y dos hijas, cada una ocupaba un cuarto y la fila
          se leía como una tira a la que le faltan dos. */}
      <div className="grid grid-cols-2 gap-2.5 lg:max-w-[520px] lg:gap-5">
        <Casilla etiquetaLarga="Del curso" pie={textoLecciones(completadas, total)} pieCorto="de tu curso">
          <Cifra valor={String(porcentajeCurso)} unidad="%" />
          <Escala porcentaje={porcentajeCurso} />
        </Casilla>

        <CasillaNivel nivel={nivel} />
      </div>
    </section>
  );
}

function textoLecciones(completadas: number, total: number): string {
  if (total === 0) return "sin curso asignado";
  return `llevas ${completadas} de ${total} lecciones`;
}
