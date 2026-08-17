"use client";

import Link from "next/link";
import { Fragment } from "react";
import type { Bloque } from "@/lib/data";

/**
 * Los bloques generados del alumno, en el inicio.
 *
 * Cuando la lista de bloques se mudó a `/practica`, el inicio se quedó
 * sin sitio donde pintar lo que se acababa de generar: el panel de
 * progreso llegaba al final y ahí se terminaba todo. El alumno esperaba
 * cuarenta segundos, veía la barra completarse y no recibía nada.
 *
 * Al principio esto enseñaba solo lo de la visita en curso. No servía:
 * el alumno volvía al día siguiente, no veía nada suyo y la lectura era
 * que su trabajo se había perdido. Ahora se muestran también los de días
 * anteriores.
 *
 * Pero NO todos, y no es un descuido: se enseñan los `MAXIMO_EN_INICIO`
 * más recientes. Sin tope, en dos semanas esto sería una lista larga en
 * mitad del inicio y la sección dejaría de decir nada. El resto viven en
 * `/practica`, y el recuento de abajo lleva hasta allí.
 *
 * El sello "Nuevo" es solo para los de esta visita. Es lo que lo hace
 * útil: separa lo que acaba de aparecer de lo que ya estaba.
 *
 * La paleta es la del inicio (`marca-*`), que no es la de `/practica`
 * (`drc-*`). Son dos pantallas con dos lenguajes visuales y un
 * componente compartido se vería prestado en una de las dos.
 */

const FASES = ["Reconocer", "Transformar", "Producir"];

/**
 * Cuántos caben en el inicio.
 *
 * Cinco: los suficientes para ver de un vistazo lo que se lleva hecho
 * sin que la sección se coma la pantalla. El tope no sobra aunque hoy
 * nadie llegue a él —con 40 bloques esto sería una lista infinita con el
 * banner del curso enterrado al fondo—, y el resto siguen en
 * `/practica`, adonde lleva el enlace de abajo.
 *
 * Con el hueco animado durante una generación son cinco filas igual: se
 * enseña uno menos para hacerle sitio, y así al empezar a generar no
 * desaparece de golpe el último de la lista.
 */
export const MAXIMO_EN_INICIO = 5;

/**
 * El hueco que ocupa el bloque mientras se genera.
 *
 * Copia las medidas de la tarjeta real —mismo alto de título, mismas
 * tres fases, mismo botón— para que al llegar el bloque no salte nada.
 * Un esqueleto que no mide lo que va a sustituir mueve la página justo
 * en el momento en que el alumno por fin va a leer algo.
 */
function EsqueletoBloque() {
  return (
    <li
      aria-hidden
      className="esqueleto rounded-[16px] border border-marca-borde bg-white p-[18px] lg:rounded-[18px] lg:p-6"
    >
      <div className="flex items-center gap-2">
        <span className="block h-[10px] w-20 rounded-full bg-marca-pista" />
        <span className="block h-[10px] w-12 rounded-full bg-marca-niebla" />
      </div>
      <span className="mt-3 block h-[21px] w-[58%] rounded-md bg-marca-pista lg:h-[23px]" />
      <span className="mt-2.5 block h-[14px] w-full rounded-md bg-marca-niebla" />
      <span className="mt-2 block h-[14px] w-[72%] rounded-md bg-marca-niebla" />
      <div className="mt-3.5 flex flex-wrap gap-1.5">
        {FASES.map((fase) => (
          <span key={fase} className="block h-[26px] w-[92px] rounded-full bg-marca-niebla" />
        ))}
      </div>
      <span className="mt-3.5 block h-[44px] w-full rounded-full bg-marca-pista lg:w-[150px]" />
    </li>
  );
}

export default function BloquesGenerados({
  bloques,
  idsNuevos,
  alumnoId,
  generando,
  totalPractica,
  zonaRef,
}: {
  /** Todos los generados del alumno, el más reciente primero. */
  bloques: Bloque[];
  /**
   * Los creados en esta visita. Solo estos llevan el sello "Nuevo": si
   * lo llevara todo, dejaría de señalar nada.
   */
  idsNuevos: string[];
  alumnoId: string;
  /** Con true se antepone el hueco animado del que está en camino. */
  generando: boolean;
  /** Cuántos bloques tiene en total, para el enlace a la práctica. */
  totalPractica: number;
  /**
   * Adónde llevar la vista al terminar. Tras cuarenta segundos de espera
   * el alumno puede haber bajado la página: sin esto el bloque aparece
   * fuera de pantalla y la espera termina en nada.
   */
  zonaRef?: React.RefObject<HTMLDivElement>;
}) {
  if (!generando && bloques.length === 0) return null;

  // El hueco animado ocupa una fila mientras se genera, así que se deja
  // sitio para él: sin esto, al empezar a generar desaparecería de golpe
  // el último bloque de la lista para hacerle hueco.
  const visibles = bloques.slice(0, generando ? MAXIMO_EN_INICIO - 1 : MAXIMO_EN_INICIO);
  const nuevos = new Set(idsNuevos);

  // Si el tope deja fuera generados suyos hay que decirlo. No cuenta el
  // hueco animado: ese bloque todavía no existe y anunciarlo como
  // "oculto" sería contar una tarjeta que nadie tiene.
  const hayOcultos = bloques.length > visibles.length;

  return (
    <div ref={zonaRef} className="mt-3.5 scroll-mt-24 lg:mt-4">
      {(visibles.length > 0 || generando) && (
        <h3 className="text-[10.5px] font-semibold uppercase leading-none tracking-[0.1em] text-marca-gris lg:text-[11px]">
          Tus bloques generados
        </h3>
      )}

      <ol className="mt-2.5 flex flex-col gap-3 lg:mt-3">
        {generando && <EsqueletoBloque />}

        {visibles.map((bloque) => {
          const esNuevo = nuevos.has(bloque.id);

          return (
          <li
            key={bloque.id}
            className={
              esNuevo
                ? "aparece rounded-[16px] border border-marca-amarillo bg-white p-[18px] lg:rounded-[18px] lg:p-6"
                : "rounded-[16px] border border-marca-borde bg-white p-[18px] lg:rounded-[18px] lg:p-6"
            }
            style={esNuevo ? { boxShadow: "0 0 0 3px rgba(255, 196, 0, 0.14)" } : undefined}
          >
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
              <p className="flex items-center gap-[7px] text-[10.5px] font-semibold uppercase leading-none tracking-[0.1em] text-marca-gris lg:text-[11px]">
                <span>{bloque.area}</span>
                <span aria-hidden className="h-[3px] w-[3px] shrink-0 rounded-full bg-marca-grisTenue" />
                <span className="tabular-nums">{bloque.minutos} min</span>
              </p>
              {esNuevo && (
                <span className="inline-flex items-center rounded-full bg-marca-amarillo px-2.5 py-1 text-[11px] font-semibold leading-none text-marca-tinta">
                  Nuevo
                </span>
              )}
            </div>

            <h3 className="mt-2.5 text-pretty font-display text-[18px] font-bold leading-[1.2] text-marca-tinta lg:mt-3 lg:text-[21px]">
              {bloque.titulo}
            </h3>

            <p className="mt-[7px] text-pretty text-[14px] leading-[1.45] text-marca-tintaMedia lg:mt-[9px] lg:text-[15px] lg:leading-[1.5]">
              {bloque.intro}
            </p>

            {/* Recién generado: ninguna fase hecha todavía. No hace falta
                consultar el progreso porque nació hace unos segundos. */}
            <div className="mt-3.5 flex flex-wrap items-center gap-1.5">
              {FASES.map((fase, i) => (
                <Fragment key={fase}>
                  {i > 0 && (
                    <span aria-hidden className="text-[13px] text-marca-grisTenue">
                      →
                    </span>
                  )}
                  <span className="inline-flex items-center rounded-full bg-marca-niebla px-3 py-1 text-[12px] font-medium leading-none text-marca-gris">
                    {fase}
                  </span>
                </Fragment>
              ))}
            </div>

            <Link
              href={`/alumno/${alumnoId}/${bloque.id}`}
              className="mt-3.5 flex min-h-[44px] w-full items-center justify-center rounded-full bg-marca-verde px-6 py-[13px] text-[15px] font-semibold leading-[1.1] text-white transition-colors hover:bg-marca-verdeOsc lg:w-auto lg:self-start lg:px-8"
            >
              Empezar
              <span className="sr-only"> {bloque.titulo}</span>
            </Link>
          </li>
          );
        })}
      </ol>

      {/* EL RECUENTO CUENTA DOS COSAS DISTINTAS, Y ANTES LAS MEZCLABA.
          Arriba solo se pintan los bloques GENERADOS por el alumno; en
          `/practica` están además los del catálogo de su nivel. Decir
          "tienes 4 bloques" encima de una lista de uno se leía como que
          faltaban tres: el alumno con 1 generado y 3 de nivel veía el 4 y
          contaba una sola tarjeta.

          Ahora la frase habla de lo que se ve —cuántos de cuántos
          generados— y el número grande viaja en el enlace, que es lo que
          promete el sitio donde están todos. */}
      {totalPractica > 0 && (
        <p className="mt-3.5 text-[13.5px] leading-[1.45] text-marca-gris lg:text-[14px]">
          {hayOcultos && (
            <>
              Se muestran los {visibles.length} más recientes de tus {bloques.length} bloques
              generados.{" "}
            </>
          )}
          <Link
            href="/practica"
            className="font-semibold text-marca-verdeOsc underline underline-offset-2 transition-colors hover:text-marca-tinta"
          >
            {totalPractica === 1
              ? "Ver tu bloque en la práctica"
              : `Ver los ${totalPractica} bloques de tu práctica`}
          </Link>
        </p>
      )}
    </div>
  );
}
