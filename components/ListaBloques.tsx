import Link from "next/link";
import { Fragment } from "react";
import type { Bloque } from "@/lib/data";
import {
  estadoDeBloque,
  type EstadoBloque,
  type RegistroAvance,
  type RegistroProgreso,
} from "@/lib/progreso";

export type ProgresoBloques = Record<string, RegistroProgreso>;
export type AvanceBloques = Record<string, RegistroAvance>;

/**
 * La lista de bloques de `/practica`.
 *
 * TRES CALLES: EL NÚMERO, LO QUE ES Y QUÉ HACER CON ÉL. El orden en el
 * que se lee una fila es ese, y por eso el botón vive en su propia
 * columna a la derecha y no debajo del texto: así todos los botones caen
 * en la misma vertical y el ojo puede bajar por ellos sin releer nada.
 *
 * LO CERRADO SE GUARDA EN UN DESPLEGABLE. Era una lista plana donde un
 * bloque terminado ocupaba lo mismo que uno por hacer, así que la
 * pregunta que trae al alumno —¿qué me queda?— se respondía contando.
 * Ahora arriba está lo pendiente y lo hecho se recoge detrás de una
 * fila que dice cuántos son. No se esconde: se aparta, que es distinto.
 * Sigue estando a un clic y con su botón de «Repasar», porque repetir un
 * bloque es una de las cosas que la pantalla ofrece.
 *
 * QUÉ CUENTA COMO HECHO: haber cerrado el bloque con un intento
 * completo, no haberlo dominado. Es la MISMA regla que usa la casilla
 * «Bloques de hoy» de arriba y la que aplica el inicio para retirar un
 * bloque de su hueco. Si aquí se cortara por el umbral del 80%, la misma
 * pantalla diría «2 de 4 cerrados» y a la vez guardaría tres, y entonces
 * ninguno de los dos números se puede creer.
 *
 * LA TARJETA NO ES UN BOTÓN. Lo accionable es el enlace de la derecha, y
 * lleva el nombre del bloque en su nombre accesible ("Continuar Estilo
 * indirecto"): una lista de cuatro enlaces que dicen todos "Continuar"
 * no se puede navegar con lector de pantalla.
 *
 * NO SE PINTAN MINUTOS. La fila decía "Gramática · 5 min" y el dato no
 * ayudaba a elegir: los cuatro bloques duran lo mismo y lo que de verdad
 * distingue a uno de otro es de qué va y por dónde se va. En su sitio
 * está la ruta de las tres fases, que es lo que anticipa el trabajo.
 *
 * EL ESTADO SE DICE, no solo se colorea: la píldora lleva texto y la
 * ruta de fases se anuncia en palabras, para que el avance se lea sin
 * distinguir un verde de un gris.
 */

const FASES = ["Reconocer", "Transformar", "Producir"];

/**
 * Cómo se pinta cada fila.
 *
 * Son cinco y no cuatro: `EstadoBloque` no distingue un bloque cerrado
 * por debajo del umbral de otro que solo está a medias —los dos le salen
 * "en-curso"— y esa diferencia aquí importa, porque el primero vive
 * dentro del desplegable de lo hecho. Un bloque guardado ahí con la
 * píldora "En progreso" se contradice con la fila que lo guarda.
 */
type Aspecto = EstadoBloque | "practicado";

/** Cómo se llama cada estado y con qué píldora se pinta. */
const ETIQUETA: Record<Aspecto, { texto: string; clase: string }> = {
  // "Dominado" y no "Hecho": es la misma palabra que usa la casilla de
  // "Bloques dominados" de arriba, y el 80% que lo separa de terminarlo
  // a medias es una distinción que el alumno ya conoce.
  dominado: { texto: "Dominado", clase: "bg-marca-verdeFondo text-marca-verdeOsc" },
  // Y "Practicado" por lo mismo: es la palabra del denominador de esa
  // casilla —"18 de 42 · de los que has practicado"—, así que nombra
  // exactamente lo que es: hecho, pero sin llegar al umbral.
  practicado: { texto: "Practicado", clase: "bg-marca-calidoBadge text-marca-calidoBadgeTexto" },
  "en-curso": { texto: "En progreso", clase: "bg-marca-verdePalido text-marca-verdeOsc" },
  nuevo: { texto: "Nuevo", clase: "bg-marca-amarillo text-marca-tinta" },
  "sin-empezar": { texto: "Sin empezar", clase: "bg-marca-pista text-marca-gris" },
};

/** Píldora: el mismo mueble para el estado y para cada fase. */
const PILDORA =
  "inline-flex items-center rounded-full px-3 py-[5px] text-[12px] font-semibold leading-none";

/**
 * Una fila ya resuelta.
 *
 * Se calcula todo de una pasada y ANTES de repartir, porque el número
 * ("03") y la posición del bloqueado son del orden completo: si cada
 * grupo se numerara por su cuenta, esconder lo hecho renumeraría lo
 * pendiente y el alumno vería cambiar de nombre a bloques que no ha
 * tocado.
 */
type Entrada = {
  bloque: Bloque;
  numero: string;
  bloqueado: boolean;
  /** Generado en esta visita: el único que lleva sello y realce. */
  destacado: boolean;
  /** Cerrado con un intento completo. Es lo que decide el reparto. */
  cerrado: boolean;
  aspecto: Aspecto;
  porcentaje: number | null;
  fases: number;
};

/**
 * Hueco animado que ocupa el sitio donde va a aparecer el bloque recién
 * generado. Copia las medidas de la fila real —tres calles, misma altura
 * de título, mismas tres fases— para que al llegar el bloque no salte
 * nada: un esqueleto que no mide lo que sustituye mueve la página justo
 * cuando el alumno por fin va a leer algo.
 */
function EsqueletoBloque() {
  return (
    <li
      aria-hidden
      className="aparece esqueleto grid grid-cols-1 gap-4 rounded-[14px] border border-marca-borde bg-white p-[18px] min-[900px]:grid-cols-[44px_minmax(0,1fr)_190px] min-[900px]:items-center min-[900px]:gap-6 min-[900px]:p-6"
    >
      <span className="hidden h-[22px] w-[26px] rounded-md bg-marca-pista min-[900px]:block" />

      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="block h-[11px] w-20 rounded-full bg-marca-pista" />
          <span className="block h-[22px] w-24 rounded-full bg-marca-pista" />
        </div>
        <span className="mt-3 block h-[19px] w-[62%] rounded-md bg-marca-pista" />
        <span className="mt-3 block h-[13px] w-full rounded-md bg-marca-pista" />
        <span className="mt-2 block h-[13px] w-[78%] rounded-md bg-marca-pista" />
        <div className="mt-4 flex gap-1.5">
          {FASES.map((fase) => (
            <span key={fase} className="block h-[24px] w-[92px] rounded-full bg-marca-pista" />
          ))}
        </div>
      </div>

      <span className="block h-[46px] rounded-full bg-marca-pista min-[900px]:h-[42px]" />
    </li>
  );
}

export default function ListaBloques({
  bloques,
  alumnoId,
  progreso,
  avance,
  generados,
  idsNuevos = [],
  indiceBloqueado,
  generando = false,
}: {
  bloques: Bloque[];
  alumnoId: string;
  progreso: ProgresoBloques;
  avance: AvanceBloques;
  /** Ids de los bloques creados con la IA. Decide el chip "Nuevo" solo
   *  cuando además están en `idsNuevos`. */
  generados: string[];
  /**
   * Los generados EN ESTA VISITA: los únicos con sello "Nuevo".
   *
   * Antes lo llevaba cualquier bloque generado y sin empezar, así que uno
   * de hace tres semanas seguía anunciándose como nuevo y el sello dejaba
   * de señalar nada. Ahora significa lo mismo que en el inicio.
   */
  idsNuevos?: string[];
  /** Posición del bloque que aún no se ha desbloqueado, o -1 si no hay ninguno. */
  indiceBloqueado: number;
  /** Mientras es true se muestra el hueco animado en cabeza de la lista. */
  generando?: boolean;
}) {
  const entradas: Entrada[] = bloques.map((bloque, i) => {
    const bloqueado = i === indiceBloqueado;
    const esGenerado = generados.includes(bloque.id);
    const destacado = idsNuevos.includes(bloque.id);

    const registro = progreso[bloque.id];
    // El bloqueado NUNCA se recoge, pase lo que pase con su progreso: se
    // enseña justamente para que el alumno sepa que existe y de qué
    // depende, y eso no se puede contar desde dentro de un desplegable.
    const cerrado = !bloqueado && (registro?.total ?? 0) > 0;

    const { estado, porcentaje, fases } = estadoDeBloque(registro, avance[bloque.id], esGenerado);

    return {
      bloque,
      numero: String(i + 1).padStart(2, "0"),
      bloqueado,
      destacado,
      cerrado,
      // El estado "nuevo" de `estadoDeBloque` significa "generado y sin
      // empezar"; el sello y el realce se reservan a los de esta visita.
      aspecto:
        cerrado && estado === "en-curso"
          ? "practicado"
          : estado === "nuevo" && !destacado
            ? "sin-empezar"
            : estado,
      porcentaje,
      fases,
    };
  });

  const pendientes = entradas.filter((entrada) => !entrada.cerrado);
  const hechos = entradas.filter((entrada) => entrada.cerrado);

  // Solo el primero de lo que queda por hacer lleva el botón sólido: si
  // todos gritan, ninguno destaca. Sin nada pendiente no lo lleva nadie,
  // que es lo correcto —no hay por dónde seguir hoy, y eso ya lo dicen
  // la franja de arriba y la barra de abajo—.
  const idPrimario = pendientes[0]?.bloque.id ?? null;

  const fila = (entrada: Entrada) => (
    <FilaBloque
      key={entrada.bloque.id}
      entrada={entrada}
      alumnoId={alumnoId}
      primario={entrada.bloque.id === idPrimario}
    />
  );

  // Sin reparto que hacer —o no hay nada hecho, o no queda nada por
  // hacer— la lista se queda plana. Un desplegable con todo dentro y
  // nada fuera es una puerta delante de una pantalla vacía.
  if (hechos.length === 0 || pendientes.length === 0) {
    return (
      <ol className="mt-5 flex flex-col gap-3">
        {generando && <EsqueletoBloque />}
        {entradas.map(fila)}
      </ol>
    );
  }

  return (
    <>
      <ol className="mt-5 flex flex-col gap-3">
        {generando && <EsqueletoBloque />}
        {pendientes.map(fila)}
      </ol>

      {/* ---------------------------- LO YA HECHO ----------------------------
          `<details>` y no estado de React: es un desplegable y el
          navegador ya sabe hacerlo, con su semántica de lector de
          pantalla incluida y sin depender de que el bundle haya
          cargado. El mismo criterio que el botón de completar una
          lección.

          El rótulo cambia al abrir con `group-open`, no con JavaScript:
          las dos frases están escritas y el CSS enseña la que toca. */}
      <details className="group mt-3">
        <summary className="flex min-h-[44px] cursor-pointer list-none items-center gap-3 rounded-[14px] border border-dashed border-marca-bordeSuave bg-white/60 px-[18px] py-3 text-[14px] font-semibold text-marca-gris transition-colors hover:border-marca-puntoPendiente hover:text-marca-tinta [&::-webkit-details-marker]:hidden min-[900px]:px-6">
          <span
            aria-hidden
            className="grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full bg-marca-verdeFondo text-[11px] font-bold leading-none text-marca-verdeOsc tabular-nums"
          >
            {hechos.length}
          </span>

          <span className="min-w-0 flex-1">
            <span className="group-open:hidden">
              Ver {hechos.length === 1 ? "el que ya has hecho" : "los que ya has hecho"}
            </span>
            <span className="hidden group-open:inline">
              Ocultar {hechos.length === 1 ? "el que ya has hecho" : "los que ya has hecho"}
            </span>
          </span>

          <span aria-hidden className="shrink-0 text-[10px] text-marca-grisSuave">
            <span className="group-open:hidden">▼</span>
            <span className="hidden group-open:inline">▲</span>
          </span>
        </summary>

        <ol className="mt-3 flex flex-col gap-3">{hechos.map(fila)}</ol>
      </details>
    </>
  );
}

/**
 * Una fila. La misma para lo pendiente y para lo ya hecho: un bloque
 * cerrado no cambia de forma por estar dentro del desplegable, solo de
 * píldora y de llamada.
 */
function FilaBloque({
  entrada,
  alumnoId,
  primario,
}: {
  entrada: Entrada;
  alumnoId: string;
  primario: boolean;
}) {
  const { bloque, numero, bloqueado, destacado, aspecto, porcentaje, fases } = entrada;

  const etiqueta = ETIQUETA[aspecto];
  const cerrado = aspecto === "dominado" || aspecto === "practicado";

  const llamada = cerrado ? "Repasar" : aspecto === "en-curso" ? "Continuar" : "Empezar";

  return (
    <li
      className={`grid grid-cols-1 gap-4 p-[18px] transition-colors min-[900px]:grid-cols-[44px_minmax(0,1fr)_190px] min-[900px]:items-center min-[900px]:gap-6 min-[900px]:p-6 ${
        bloqueado
          ? "rounded-[14px] border border-dashed border-marca-bordeSuave bg-white/60"
          : `rounded-[14px] border bg-white hover:border-marca-puntoPendiente ${
              destacado ? "aparece border-marca-amarillo" : "border-marca-borde"
            }`
      }`}
    >
      {/* El número, en escritorio en su propia calle. En móvil sube a
          la línea de la etiqueta: una columna de 44px a 375px se
          come un octavo del ancho para decir "03". */}
      <span
        aria-hidden
        className="hidden font-display text-[22px] font-extrabold leading-none tabular-nums text-marca-puntoPendiente min-[900px]:block"
      >
        {numero}
      </span>

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-2">
          <span
            aria-hidden
            className="font-display text-[15px] font-extrabold leading-none tabular-nums text-marca-puntoPendiente min-[900px]:hidden"
          >
            {numero}
          </span>

          <p
            className={`text-[11px] font-bold uppercase leading-none tracking-[0.14em] ${
              bloqueado ? "text-marca-gris" : "text-marca-verdeOsc"
            }`}
          >
            {bloque.area}
          </p>

          {!bloqueado && (
            <span className={`${PILDORA} ${etiqueta.clase}`}>
              {etiqueta.texto}
              {/* El porcentaje acompaña a los dos estados cerrados. En
                  "Practicado" es lo que distingue un 78 de un 20, que es
                  justo la información que decide si vale la pena
                  repetirlo. */}
              {cerrado && porcentaje !== null && (
                <span className="ml-1 tabular-nums opacity-70">{porcentaje}%</span>
              )}
            </span>
          )}
        </div>

        <h3
          className={`mt-2.5 text-pretty font-display text-[19px] font-bold leading-[1.2] tracking-[-0.01em] ${
            bloqueado ? "text-marca-gris" : "text-marca-tinta"
          }`}
        >
          {bloque.titulo}
        </h3>

        <p className="mt-1.5 max-w-[620px] text-pretty text-[14px] leading-[1.5] text-marca-tintaMedia">
          {bloque.intro}
        </p>

        {/* La ruta del bloque. Coloreada hasta donde llegó: lo hecho
            en verde claro, la fase en la que está en verde pleno y
            lo que queda en gris. */}
        <p className="mt-3.5 flex flex-wrap items-center gap-1.5">
          {!bloqueado && (
            <span className="sr-only">
              {fases === 0
                ? "Sin empezar. Las tres fases del bloque: "
                : `Vas por la fase ${fases} de 3. Las tres fases del bloque: `}
            </span>
          )}
          {FASES.map((fase, k) => {
            const hecha = k < fases;
            const actual = !bloqueado && aspecto === "en-curso" && k === fases - 1;

            return (
              <Fragment key={fase}>
                {k > 0 && (
                  <span aria-hidden className="text-[13px] text-marca-grisTenue">
                    →
                  </span>
                )}
                <span
                  className={`${PILDORA} ${
                    actual
                      ? "bg-marca-verdePalido text-marca-verdeOsc"
                      : hecha
                        ? "bg-marca-verdeFondo text-marca-verdeOsc"
                        : "bg-marca-pista text-marca-gris"
                  }`}
                >
                  {fase}
                </span>
              </Fragment>
            );
          })}
        </p>

        {bloqueado && (
          <p className="mt-3.5 text-[13px] leading-[1.5] text-marca-gris">
            Se desbloquea después de tu próxima clase.
          </p>
        )}
      </div>

      {/* En móvil, ancho completo debajo. En escritorio, pegado a la
          derecha de su calle: todos los botones en la misma vertical. */}
      <div className="flex min-[900px]:justify-end">
        {bloqueado ? (
          <span
            aria-disabled="true"
            className="flex min-h-[46px] w-full items-center justify-center rounded-full bg-marca-pista px-6 text-center text-[15px] font-semibold text-marca-gris min-[900px]:min-h-[42px] min-[900px]:w-auto min-[900px]:min-w-[150px] min-[900px]:text-[14px]"
          >
            Aún no
          </span>
        ) : (
          <Link
            href={`/alumno/${alumnoId}/${bloque.id}`}
            className={`flex min-h-[46px] w-full items-center justify-center rounded-full px-6 text-[15px] font-semibold transition-colors min-[900px]:min-h-[42px] min-[900px]:w-auto min-[900px]:min-w-[150px] min-[900px]:text-[14px] ${
              primario
                ? "btn-verde"
                : "border border-marca-bordeSuave bg-white text-marca-tinta hover:border-marca-tinta"
            }`}
          >
            {llamada}
            <span className="sr-only"> {bloque.titulo}</span>
          </Link>
        )}
      </div>
    </li>
  );
}
