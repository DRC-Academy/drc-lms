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

/** Cómo se llama cada estado y con qué píldora se pinta. */
const ETIQUETA: Record<EstadoBloque, { texto: string; clase: string }> = {
  // "Dominado" y no "Hecho": es la misma palabra que usa la casilla de
  // "Bloques dominados" de arriba, y el 80% que lo separa de terminarlo
  // a medias es una distinción que el alumno ya conoce.
  dominado: { texto: "Dominado", clase: "bg-marca-verdeFondo text-marca-verdeOsc" },
  "en-curso": { texto: "En progreso", clase: "bg-marca-verdePalido text-marca-verdeOsc" },
  nuevo: { texto: "Nuevo", clase: "bg-marca-amarillo text-marca-tinta" },
  "sin-empezar": { texto: "Sin empezar", clase: "bg-marca-pista text-marca-gris" },
};

/** Píldora: el mismo mueble para el estado y para cada fase. */
const PILDORA =
  "inline-flex items-center rounded-full px-3 py-[5px] text-[12px] font-semibold leading-none";

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
  return (
    <ol className="mt-5 flex flex-col gap-3">
      {generando && <EsqueletoBloque />}

      {bloques.map((bloque, i) => {
        const bloqueado = i === indiceBloqueado;
        const esGenerado = generados.includes(bloque.id);
        const esNuevo = idsNuevos.includes(bloque.id);
        const { estado, porcentaje, fases } = estadoDeBloque(
          progreso[bloque.id],
          avance[bloque.id],
          esGenerado
        );
        // El estado "nuevo" de `estadoDeBloque` significa "generado y sin
        // empezar"; el sello y el realce se reservan a los de esta visita.
        const etiqueta = estado === "nuevo" && !esNuevo ? ETIQUETA["sin-empezar"] : ETIQUETA[estado];
        const destacado = esNuevo;
        // Solo el primero de la lista lleva el botón sólido: si todos gritan, ninguno destaca.
        const primario = i === 0 && estado !== "dominado";
        const numero = String(i + 1).padStart(2, "0");

        const llamada =
          estado === "dominado" ? "Repasar" : estado === "en-curso" ? "Continuar" : "Empezar";

        return (
          <li
            key={bloque.id}
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
                    {estado === "dominado" && porcentaje !== null && (
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
                  const actual = !bloqueado && estado === "en-curso" && k === fases - 1;

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
      })}
    </ol>
  );
}
