"use client";

import Link from "next/link";
import { geometriaRuta, LIENZO, type Parada } from "@/lib/ruta";

/**
 * EL CAMINO DE «PARA TI».
 *
 * Sustituye a la lista de bloques, a la fila destacada y a las cuatro
 * casillas de métrica. Las tres contaban el mismo estado con muebles
 * distintos y ninguna respondía de un vistazo a «¿por dónde iba?».
 *
 * LA LÍNEA VERDE LLEGA HASTA DONDE HAS LLEGADO TÚ, y esa es toda la
 * idea: el avance deja de ser una cifra y pasa a ser una posición. Lo
 * que queda va en traza discontinua, y la última parada —la que espera a
 * la próxima clase— con candado.
 *
 * EL LIENZO ES 1000×200 Y SE ESCALA ENTERO. El SVG va a `width:100%` con
 * su relación de aspecto, y las paradas se colocan en PORCENTAJE de esa
 * misma caja: camino y nodos cuadran a cualquier ancho sin recalcular
 * nada. Lo único que no escala son los nodos, que llevan medida fija
 * porque son zona táctil.
 *
 * EN MÓVIL EL CAMINO NO SE PINTA. A 358px, seis nodos con su rótulo se
 * pisan; ahí manda la parada de hoy y el resto se cuenta en una línea.
 */
export default function Ruta({
  paradas,
  alumnoId,
  profesor,
}: {
  paradas: Parada[];
  alumnoId: string;
  /** Va en el pie de la parada de hoy: es lo que hace escribir en serio. */
  profesor: string;
}) {
  if (paradas.length === 0) return null;

  const indiceActual = paradas.findIndex((p) => p.tipo === "actual");
  const actual = indiceActual === -1 ? null : paradas[indiceActual];
  const { puntos, recorrido, pendiente } = geometriaRuta(paradas.length, indiceActual);

  const hechas = paradas.filter((p) => p.tipo === "hecha").length;
  const total = paradas.filter((p) => p.tipo !== "resumen").length;

  return (
    <section
      aria-label="Tu ruta"
      className="relative overflow-hidden rounded-[24px] border border-marca-rutaBorde bg-marca-ruta px-4 pb-6 pt-5 min-[900px]:rounded-[28px] min-[900px]:px-10 min-[900px]:pb-9 min-[900px]:pt-[34px]"
    >
      {/* Dos formas muy suaves al fondo. Es lo que separa esto de una
          tarjeta blanca más sin meter una ilustración que envejezca. */}
      <span
        aria-hidden
        className="pointer-events-none absolute -right-20 -top-28 h-80 w-80 rounded-full bg-marca-rutaForma"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute -bottom-36 -left-16 h-64 w-64 rounded-full bg-marca-rutaForma2"
      />

      <div className="relative">
        <div className="flex items-baseline justify-between gap-4">
          <p className="text-[10.5px] font-extrabold uppercase leading-none tracking-[0.16em] text-marca-verdeOsc min-[900px]:text-[11px]">
            Tu ruta · {total} {total === 1 ? "parada" : "paradas"}
          </p>
          {actual && (
            <p className="shrink-0 text-[12.5px] font-semibold text-marca-verdeOsc">
              vas por la {actual.numero} de {total}
            </p>
          )}
          {!actual && hechas > 0 && (
            <p className="shrink-0 text-[12.5px] font-semibold text-marca-verdeOsc">completa</p>
          )}
        </div>

        {/* ------------------------------ EL CAMINO ------------------------------ */}
        <div
          aria-hidden
          className="relative mt-3 hidden min-[900px]:block"
          style={{ aspectRatio: `${LIENZO.ancho} / ${LIENZO.alto}` }}
        >
          <svg
            viewBox={`0 0 ${LIENZO.ancho} ${LIENZO.alto}`}
            className="absolute inset-0 h-full w-full"
            fill="none"
          >
            {pendiente !== "" && (
              <path
                d={pendiente}
                stroke="#C4DECF"
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray="2 16"
              />
            )}
            {recorrido !== "" && (
              <path d={recorrido} stroke="#1E9E3A" strokeWidth="6" strokeLinecap="round" />
            )}
          </svg>

          {paradas.map((parada, i) => (
            <Nodo key={parada.clave} parada={parada} punto={puntos[i]} />
          ))}
        </div>

        {/* ------------------------- LA PARADA DE HOY -------------------------
            El nodo grande, desplegado. Va dentro del mismo campo porque
            no es otra pieza: es la parada en la que estás. */}
        {actual && actual.bloque && (
          <article className="mt-3 rounded-[18px] border border-marca-rutaTarjeta bg-white p-5 shadow-[0_14px_32px_-18px_rgba(18,33,26,0.28)] min-[900px]:mt-3.5 min-[900px]:flex min-[900px]:items-center min-[900px]:gap-9 min-[900px]:rounded-[20px] min-[900px]:px-[30px] min-[900px]:py-[26px]">
            <div className="min-w-0 min-[900px]:flex-1">
              <p className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
                <span className="text-[10.5px] font-extrabold uppercase leading-none tracking-[0.16em] text-marca-amarilloTexto min-[900px]:text-[11px]">
                  Parada {actual.numero} · {actual.bloque.area}
                </span>
                <span aria-hidden className="h-[3px] w-[3px] shrink-0 rounded-full bg-marca-puntoPendiente" />
                <span className="text-[10.5px] font-bold uppercase leading-none tracking-[0.14em] text-marca-grisSuave min-[900px]:text-[11px]">
                  {actual.bloque.ejercicios.length}{" "}
                  {actual.bloque.ejercicios.length === 1 ? "ejercicio" : "ejercicios"}
                </span>
              </p>

              <h2 className="mt-3 text-balance font-display text-[25px] font-extrabold leading-[1.08] tracking-[-0.025em] text-marca-tinta min-[900px]:text-[32px]">
                {actual.bloque.titulo}
              </h2>

              <p className="mt-2.5 max-w-[56ch] text-pretty text-[15px] leading-[1.5] text-marca-tintaMedia min-[900px]:text-[15.5px]">
                {actual.bloque.intro}
              </p>
            </div>

            <div className="mt-4 shrink-0 min-[900px]:mt-0 min-[900px]:text-center">
              <Link
                href={`/alumno/${alumnoId}/${actual.bloque.id}`}
                className="flex min-h-[54px] w-full items-center justify-center rounded-full btn-verde px-11 text-[17px] font-bold shadow-[0_8px_20px_rgba(30,158,58,0.32)] min-[900px]:min-h-[58px] min-[900px]:w-auto min-[900px]:text-[17.5px]"
              >
                Seguir la ruta
                <span className="sr-only"> — {actual.bloque.titulo}</span>
              </Link>
              {profesor !== "" && (
                <p className="mt-3 text-center text-[13px] leading-[1.45] text-marca-grisSuave min-[900px]:max-w-[22ch]">
                  Lo que escribas al final lo lee {profesor} antes de vuestra próxima clase.
                </p>
              )}
            </div>
          </article>
        )}

        {/* Sin parada actual: la ruta está entera. No se deja el hueco. */}
        {!actual && (
          <div className="mt-3 flex flex-col gap-4 rounded-[18px] border border-marca-rutaTarjeta bg-white p-5 min-[900px]:mt-3.5 min-[900px]:flex-row min-[900px]:items-center min-[900px]:gap-8 min-[900px]:rounded-[20px] min-[900px]:px-[30px] min-[900px]:py-6">
            <span
              aria-hidden
              className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-marca-verde shadow-[0_10px_24px_rgba(30,158,58,0.32)] min-[900px]:h-[84px] min-[900px]:w-[84px]"
            >
              <svg
                viewBox="0 0 20 20"
                className="h-8 w-8 min-[900px]:h-[38px] min-[900px]:w-[38px]"
                fill="none"
                stroke="#FFFFFF"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 10.5l3.5 3.5L15 7" />
              </svg>
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[10.5px] font-extrabold uppercase leading-none tracking-[0.16em] text-marca-verdeOsc min-[900px]:text-[11px]">
                Ruta completa
              </p>
              <h2 className="mt-2.5 text-balance font-display text-[24px] font-extrabold leading-[1.08] tracking-[-0.025em] text-marca-tinta min-[900px]:text-[30px]">
                Te has hecho la ruta entera
              </h2>
              <p className="mt-2 max-w-[62ch] text-pretty text-[15px] leading-[1.5] text-marca-tintaMedia min-[900px]:text-[15.5px]">
                {profesor !== ""
                  ? `La siguiente sale de tu próxima clase con ${profesor}. Mientras tanto, cualquier parada se puede repetir.`
                  : "La siguiente sale de tu próxima clase. Mientras tanto, cualquier parada se puede repetir."}
              </p>
            </div>
          </div>
        )}

        {/* En móvil el camino no cabe: se cuenta en una línea. */}
        <p className="mt-3.5 text-[13px] leading-[1.45] text-marca-verdeOsc min-[900px]:hidden">
          {resumenMovil(paradas, total)}
        </p>
      </div>
    </section>
  );
}

/** Lo que sustituye al camino dibujado en pantallas estrechas. */
function resumenMovil(paradas: Parada[], total: number): string {
  const hechas = paradas.filter((p) => p.tipo === "hecha").length;
  const agrupadas = paradas.find((p) => p.tipo === "resumen")?.agrupadas ?? 0;
  const bloqueadas = paradas.filter((p) => p.tipo === "bloqueada").length;

  const partes: string[] = [];
  const cerradas = hechas + agrupadas;
  if (cerradas > 0) partes.push(`${cerradas} ${cerradas === 1 ? "hecha" : "hechas"}`);
  const quedan = total + agrupadas - cerradas - bloqueadas;
  if (quedan > 0) partes.push(`${quedan} por delante`);
  if (bloqueadas > 0) partes.push("1 esperando a tu próxima clase");

  return partes.length === 0 ? "" : `Tu ruta: ${partes.join(" · ")}.`;
}

/**
 * Una parada sobre el camino.
 *
 * Medidas fijas a propósito: el lienzo escala, los nodos no. Un nodo que
 * encoge con la ventana acaba por debajo de la zona táctil.
 */
function Nodo({ parada, punto }: { parada: Parada; punto: { x: number; y: number } }) {
  const posicion = {
    left: `${punto.x}%`,
    top: `${punto.y}%`,
    transform: "translate(-50%, -50%)",
  } as const;

  const marca = <Marca parada={parada} />;

  return (
    <>
      <span className="absolute grid place-items-center rounded-full" style={posicion}>
        {marca}
      </span>

      {/* El rótulo, debajo o encima según por qué banda vaya la parada,
          para que nunca cruce el camino. */}
      <span
        className="absolute w-[168px] -translate-x-1/2 text-center text-[13px] leading-[1.35]"
        style={{
          left: `${punto.x}%`,
          top: `calc(${punto.y}% + ${parada.tipo === "actual" ? 56 : 34}px)`,
        }}
      >
        <span className={etiquetaClase(parada.tipo)}>{rotulo(parada)}</span>
      </span>
    </>
  );
}

function rotulo(parada: Parada): string {
  if (parada.tipo === "resumen") return parada.titulo;
  if (parada.tipo === "bloqueada") return "Se abre con tu próxima clase";
  return parada.titulo;
}

function etiquetaClase(tipo: Parada["tipo"]): string {
  if (tipo === "hecha" || tipo === "resumen") return "font-semibold text-marca-verdeOsc";
  if (tipo === "actual") return "font-semibold text-marca-tinta";
  if (tipo === "bloqueada") return "text-marca-grisSuave";
  return "text-marca-gris";
}

/** El círculo de la parada. Cinco formas, una por estado. */
function Marca({ parada }: { parada: Parada }) {
  if (parada.tipo === "actual") {
    return (
      <span className="grid h-[92px] w-[92px] place-items-center rounded-full border-[5px] border-marca-amarillo bg-white shadow-[0_12px_28px_rgba(18,33,26,0.16)]">
        <span className="font-display text-[27px] font-extrabold leading-none text-marca-tinta tabular-nums">
          {parada.numero}
        </span>
      </span>
    );
  }

  if (parada.tipo === "hecha") {
    return (
      <span className="grid h-[54px] w-[54px] place-items-center rounded-full bg-marca-verde shadow-[0_6px_14px_rgba(30,158,58,0.28)]">
        <svg
          viewBox="0 0 20 20"
          className="h-[22px] w-[22px]"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M5 10.5l3.5 3.5L15 7" />
        </svg>
      </span>
    );
  }

  if (parada.tipo === "resumen") {
    return (
      <span className="grid h-[54px] w-[54px] place-items-center rounded-full border-2 border-marca-verde bg-white">
        <span className="font-display text-[15px] font-extrabold leading-none text-marca-verdeOsc tabular-nums">
          +{parada.agrupadas}
        </span>
      </span>
    );
  }

  if (parada.tipo === "bloqueada") {
    return (
      <span className="grid h-[54px] w-[54px] place-items-center rounded-full border-2 border-dashed border-marca-rutaTrazo bg-marca-niebla">
        <svg
          viewBox="0 0 20 20"
          className="h-[19px] w-[19px]"
          fill="none"
          stroke="#8A9891"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="4.5" y="8.5" width="11" height="7.5" rx="2" />
          <path d="M7 8.5V6.5a3 3 0 0 1 6 0v2" />
        </svg>
      </span>
    );
  }

  return (
    <span className="grid h-[54px] w-[54px] place-items-center rounded-full border-2 border-marca-rutaTrazo bg-white">
      <span className="font-display text-[17px] font-extrabold leading-none text-marca-grisTenue tabular-nums">
        {parada.numero}
      </span>
    </span>
  );
}
