import { Casilla, CasillaNivel, Cifra, Escala } from "@/components/Casillas";

/**
 * Cómo va la sesión de hoy, en cuatro cifras.
 *
 * Es la tira del inicio —mismas casillas, misma escala debajo de cada
 * número— midiendo otra cosa. Y tiene que medir otra cosa: el inicio
 * habla de trayectoria ("llevas 18 bloques dominados de 42") y esto de
 * la sesión que el alumno tiene delante ahora mismo.
 *
 * NINGUNA DE LAS CUATRO MIDE TIEMPO. La cuarta candidata natural sería
 * "cuánto te queda", y ahí es donde se colaba el reloj: se mide lo hecho,
 * lo empezado, lo dominado y el nivel al que va todo, que son cosas que
 * el alumno controla. Los minutos no los controla nadie.
 *
 * A diferencia de la tira del inicio, esta NO se esconde por no haber
 * practicado todavía: ahí el cero es el dato —"tienes 4 bloques y no has
 * terminado ninguno"— y es lo que empuja a empezar. Quien la llama sí la
 * quita cuando no hay ni un bloque, porque entonces no hay sesión de la
 * que hablar.
 */
export default function SesionPractica({
  total,
  terminados,
  enProgreso,
  dominados,
  practicados,
  nivel,
}: {
  /** Bloques que tiene hoy delante. */
  total: number;
  /** De esos, los que ya ha cerrado con un intento completo. */
  terminados: number;
  /** Los que tiene a medias: empezados y sin cerrar. */
  enProgreso: number;
  /** Bloques dominados de todo su historial, o null si nunca practicó. */
  dominados: number | null;
  /** Cuántos ha practicado alguna vez: el denominador de los dominados. */
  practicados: number;
  nivel: string;
}) {
  const pctTerminados = total > 0 ? (terminados / total) * 100 : 0;
  const pctEnProgreso = total > 0 ? (enProgreso / total) * 100 : 0;
  const pctDominados = practicados > 0 && dominados !== null ? (dominados / practicados) * 100 : 0;

  return (
    <section aria-labelledby="titulo-sesion">
      <h2
        id="titulo-sesion"
        className="mb-3 font-display text-[17px] font-bold text-marca-tinta lg:mb-4 lg:text-[19px]"
      >
        Cómo va tu sesión
      </h2>

      <div className="grid grid-cols-2 gap-2.5 min-[1200px]:grid-cols-4 lg:gap-5">
        <Casilla
          etiquetaLarga="Bloques de hoy"
          etiquetaCorta="De hoy"
          pie={
            terminados === 0
              ? "ninguno terminado todavía"
              : terminados === total
                ? "los tienes todos hechos"
                : "los que ya has cerrado"
          }
          pieCorto={terminados === 0 ? "sin terminar aún" : "terminados"}
        >
          <Cifra valor={String(terminados)} unidad={`de ${total}`} unidadSuave />
          <Escala porcentaje={pctTerminados} />
        </Casilla>

        <Casilla
          etiquetaLarga="En progreso"
          pie={
            enProgreso === 0
              ? "no tienes ninguno a medias"
              : "retómalos antes de abrir otros"
          }
          pieCorto={enProgreso === 0 ? "ninguno a medias" : "retómalos primero"}
        >
          <Cifra valor={String(enProgreso)} unidad={enProgreso === 1 ? "bloque" : "bloques"} unidadSuave />
          <Escala porcentaje={pctEnProgreso} suave />
        </Casilla>

        <Casilla
          etiquetaLarga="Bloques dominados"
          etiquetaCorta="Dominados"
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

        <CasillaNivel nivel={nivel} pie="todo lo de hoy va a este nivel" pieCorto="tu nivel" />
      </div>
    </section>
  );
}
