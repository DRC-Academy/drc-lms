import { Casilla, CasillaNivel, Cifra, Escala } from "@/components/Casillas";

/**
 * Las cuatro cifras del inicio.
 *
 * CADA NÚMERO SE LEE SOBRE SU ESCALA, no suelto. La barra de debajo dice
 * cuánto queda, que es la única forma honesta de comunicar avance sin
 * tener histórico: un "78%" a secas no distingue entre ir bien e ir mal.
 *
 * Se esconde entera cuando el alumno todavía no ha hecho nada. Cuatro
 * ceros no informan y lo único que consiguen es recibir a quien acaba de
 * entrar con un boletín en blanco. El nivel no cuenta como dato para esa
 * decisión: lo tiene todo el mundo desde el primer día.
 *
 * Las casillas en sí viven en `components/Casillas.tsx`: `/practica`
 * tiene su propia fila con otras cuatro medidas y las dos pantallas
 * comparten el mueble. Aquí queda lo que es de esta pantalla, que es qué
 * se mide y con qué escala se lee.
 */
export default function TiraEstadisticas({
  porcentajeCurso,
  completadas,
  total,
  dominados,
  practicados,
  aciertos,
  nivel,
}: {
  /** % de lecciones del curso completadas, o null si no tiene curso. */
  porcentajeCurso: number | null;
  completadas: number;
  total: number;
  /** Bloques de práctica dominados, o null si nunca practicó. */
  dominados: number | null;
  /** Bloques que ha practicado alguna vez: el denominador de los dominados. */
  practicados: number;
  /** % de acierto medio en práctica, o null si nunca practicó. */
  aciertos: number | null;
  nivel: string;
}) {
  const hayDatos = porcentajeCurso !== null || dominados !== null || aciertos !== null;
  if (!hayDatos) return null;

  const pctDominados = practicados > 0 && dominados !== null ? (dominados / practicados) * 100 : 0;

  return (
    <section aria-label="Cómo vas" className="mt-[18px] lg:mt-6">
      <h2 className="mb-3 font-display text-[16px] font-bold text-marca-tinta lg:mb-4 lg:text-[17px]">
        Cómo vas
      </h2>

      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4 lg:gap-5">
        <Casilla etiquetaLarga="Del curso" pie={textoLecciones(completadas, total)} pieCorto="de tu curso">
          <Cifra valor={porcentajeCurso === null ? "—" : String(porcentajeCurso)} unidad="%" />
          <Escala porcentaje={porcentajeCurso ?? 0} />
        </Casilla>

        <Casilla
          etiquetaLarga="Bloques dominados"
          etiquetaCorta="Bloques"
          pie="de los que has practicado"
          pieCorto="dominados"
        >
          <Cifra
            valor={dominados === null ? "—" : String(dominados)}
            unidad={practicados > 0 ? `de ${practicados}` : ""}
            unidadSuave
          />
          <Escala porcentaje={pctDominados} />
        </Casilla>

        <Casilla etiquetaLarga="Aciertos" pie="en tus últimos ejercicios" pieCorto="últimos ejercicios">
          <Cifra valor={aciertos === null ? "—" : String(aciertos)} unidad="%" />
          <Escala porcentaje={aciertos ?? 0} />
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
