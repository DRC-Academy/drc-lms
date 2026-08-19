"use client";

import Link from "next/link";
import { Fragment } from "react";
import type { Bloque } from "@/lib/data";

/**
 * Lo que el inicio enseña de los bloques del alumno.
 *
 * EL INICIO ES UN RESUMEN, NO UN DUPLICADO. Antes esto pintaba hasta
 * cinco tarjetas completas con su botón de «Empezar», y desde ellas se
 * llegaba exactamente al mismo ejercicio que desde la pestaña. Dos
 * puertas al mismo sitio, y una de ellas sin memoria de la otra: el
 * alumno abre un bloque desde el inicio, lo hace, y al día siguiente lo
 * ve otra vez ahí. La conclusión razonable es que la plataforma le está
 * repitiendo trabajo.
 *
 * Así que el recorrido queda en cadena —inicio → Para ti → ejercicio— y
 * de las tarjetas queda una línea que cuenta cuántos hay y lleva allí.
 *
 * CON UNA EXCEPCIÓN, la que sostiene todo lo demás: el bloque que el
 * alumno ACABA de generar sí sale entero, con su botón. Ha pulsado, ha
 * esperado casi un minuto viendo una barra, y responderle "está en otra
 * pestaña" convertiría la espera en un recado. Ese bloque es la
 * respuesta a algo que pidió hace un momento; el resto es su archivo.
 *
 * De ahí que `idsNuevos` ya no sea solo un sello decorativo: es lo que
 * decide qué se pinta.
 */

const FASES = ["Reconocer", "Transformar", "Producir"];

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
   * Los creados en esta visita. Son los ÚNICOS que se pintan enteros:
   * el resto se resume en una línea que lleva a la pestaña.
   */
  idsNuevos: string[];
  alumnoId: string;
  /** Con true se antepone el hueco animado del que está en camino. */
  generando: boolean;
  /** Cuántos bloques le esperan en «Para ti», generados y de su nivel. */
  totalPractica: number;
  /**
   * Adónde llevar la vista al terminar. Tras casi un minuto de espera el
   * alumno puede haber bajado la página: sin esto el bloque aparece
   * fuera de pantalla y la espera termina en nada.
   */
  zonaRef?: React.RefObject<HTMLDivElement>;
}) {
  const nuevos = new Set(idsNuevos);
  // El orden de `bloques` ya es del más reciente al más antiguo, así que
  // los de esta visita salen arriba sin ordenarlos otra vez.
  const recien = bloques.filter((bloque) => nuevos.has(bloque.id));

  if (!generando && recien.length === 0 && totalPractica === 0) return null;

  return (
    <div ref={zonaRef} className="mt-3.5 scroll-mt-24 lg:mt-4">
      {(generando || recien.length > 0) && (
        <>
          <h3 className="text-[10.5px] font-semibold uppercase leading-none tracking-[0.1em] text-marca-gris lg:text-[11px]">
            {generando ? "Preparando" : recien.length === 1 ? "Recién preparado" : "Recién preparados"}
          </h3>

          <ol className="mt-2.5 flex flex-col gap-3 lg:mt-3">
            {generando && <EsqueletoBloque />}

            {recien.map((bloque) => (
              <li
                key={bloque.id}
                className="aparece rounded-[16px] border border-marca-amarillo bg-white p-[18px] lg:rounded-[18px] lg:p-6"
                style={{ boxShadow: "0 0 0 3px rgba(255, 196, 0, 0.14)" }}
              >
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
                  <p className="flex items-center gap-[7px] text-[10.5px] font-semibold uppercase leading-none tracking-[0.1em] text-marca-gris lg:text-[11px]">
                    <span>{bloque.area}</span>
                    <span aria-hidden className="h-[3px] w-[3px] shrink-0 rounded-full bg-marca-grisTenue" />
                    <span className="tabular-nums">{bloque.minutos} min</span>
                  </p>
                  <span className="inline-flex items-center rounded-full bg-marca-amarillo px-2.5 py-1 text-[11px] font-semibold leading-none text-marca-tinta">
                    Nuevo
                  </span>
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
                  className="mt-3.5 flex min-h-[44px] w-full items-center justify-center rounded-full btn-verde px-6 py-[13px] text-[15px] font-semibold leading-[1.1] lg:w-auto lg:self-start lg:px-8"
                >
                  Empezar
                  <span className="sr-only"> {bloque.titulo}</span>
                </Link>
              </li>
            ))}
          </ol>
        </>
      )}

      {/* EL RESUMEN, QUE ES LO QUE SUSTITUYE A LAS TARJETAS.
          Cuenta lo que el alumno va a encontrar en la pestaña —sus
          bloques generados y los de su nivel, que es lo que allí se
          lista— y lleva. Nada más: ni títulos, ni fases, ni botón de
          empezar, porque cualquiera de esas tres cosas volvería a ser
          una puerta al mismo ejercicio.

          Cuando acaba de generar uno, la frase lo reconoce en vez de
          repetir el total a secas: el bloque de arriba también está allí,
          y decir "tienes 4" encima de una tarjeta se lee como que faltan
          tres por aparecer. */}
      {totalPractica > 0 && !generando && (
        <p className="mt-3.5 text-[13.5px] leading-[1.45] text-marca-gris lg:mt-4 lg:text-[14px]">
          {recien.length > 0 ? (
            totalPractica > recien.length ? (
              <>
                {recien.length === 1 ? "Este bloque te espera" : "Estos bloques te esperan"} en Para
                ti, con {totalPractica - recien.length}{" "}
                {totalPractica - recien.length === 1 ? "más" : "más"}.{" "}
              </>
            ) : (
              <>{recien.length === 1 ? "Tu bloque te espera" : "Tus bloques te esperan"} en Para ti. </>
            )
          ) : (
            <>
              Tienes {totalPractica} {totalPractica === 1 ? "bloque listo" : "bloques listos"} en Para
              ti.{" "}
            </>
          )}
          <Link
            href="/practica"
            className="font-semibold text-marca-verdeOsc underline underline-offset-2 transition-colors hover:text-marca-tinta"
          >
            {recien.length > 0 ? "Ver todos" : "Ir a Para ti"}
          </Link>
        </p>
      )}
    </div>
  );
}
