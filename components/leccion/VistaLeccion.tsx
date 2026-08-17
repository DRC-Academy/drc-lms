"use client";

import { useState } from "react";
import Link from "next/link";
import type { LeccionIndice } from "@/lib/cursos-servidor";
import type { TituloLeccion } from "@/lib/leccion-html";
import type { EjercicioVista } from "@/lib/ejercicios";
import { CabeceraMovil, TiraProgreso } from "@/components/leccion/CabeceraLeccion";
import LateralLecciones, { ItemLeccion } from "@/components/leccion/LateralLecciones";
import IndiceLeccion from "@/components/leccion/IndiceLeccion";
import FlujoEjercicios from "@/components/leccion/FlujoEjercicios";
import BotonCompletar from "@/components/leccion/BotonCompletar";

/**
 * La pantalla de lección entera: teoría, ejercicios y cierre.
 *
 * Las tres son la misma URL y cambian por estado, no por navegación: el
 * alumno entra en los ejercicios de la lección que está leyendo y sale
 * de vuelta a ella. Meterlas en rutas distintas obligaría a recargar el
 * lateral y a perder las respuestas al volver atrás.
 *
 * El índice del curso SÍ es una ruta —`/curso/[slug]`—: es otra pantalla,
 * se enlaza desde tres sitios y tiene que poder abrirse sola.
 */
export default function VistaLeccion({
  cursoTitulo,
  cursoSlug,
  cursoCompletadas,
  cursoTotal,
  etiquetaModulo,
  tituloModulo,
  leccion,
  contenidoHtml,
  titulos,
  hermanas,
  ejercicios,
  completada,
  siguienteId,
  anteriorId,
  esUltimaDelModulo,
  registrarIntentos,
  profesor,
  volverA,
}: {
  cursoTitulo: string;
  cursoSlug: string;
  cursoCompletadas: number;
  cursoTotal: number;
  etiquetaModulo: string;
  tituloModulo: string;
  leccion: { id: string; titulo: string; videoIncrustado: string | null };
  contenidoHtml: string;
  titulos: TituloLeccion[];
  hermanas: LeccionIndice[];
  ejercicios: EjercicioVista[];
  completada: boolean;
  siguienteId: string | null;
  anteriorId: string | null;
  esUltimaDelModulo: boolean;
  registrarIntentos: boolean;
  profesor: string;
  volverA: string;
}) {
  const hayTeoria = contenidoHtml.trim() !== "";
  const hayEjercicios = ejercicios.length > 0;
  const hayVideo = leccion.videoIncrustado !== null;

  // ---------------------------------------------------------------
  // QUÉ CUENTA COMO "LECCIÓN VACÍA"
  //
  // El HTML no es lo único que se enseña. 158 lecciones son SOLO un
  // vídeo —su `post_content` viene vacío de LearnDash— y mirar únicamente
  // el HTML las declaraba vacías: al alumno le salía "esta lección
  // todavía no tiene contenido, puedes seguir con la siguiente" justo
  // encima del vídeo que tenía que ver.
  //
  // El audio no necesita su propia condición: los 98 son iframes de
  // Podbean dentro del HTML, así que ya cuentan como teoría —
  // `tieneContenido` da por bueno un iframe aunque no lleve texto.
  // ---------------------------------------------------------------
  const hayAlgoQueEnsenar = hayTeoria || hayVideo || hayEjercicios;

  // Una lección de solo ejercicios no tiene teoría que enseñar: se entra
  // directamente al flujo en vez de a una pantalla en blanco con un
  // botón de "Empezar".
  const [enEjercicios, setEnEjercicios] = useState(!hayTeoria && hayEjercicios);
  const [panel, setPanel] = useState(false);

  const posicion = hermanas.findIndex((h) => h.id === leccion.id);
  const hechasModulo = hermanas.filter((h) => h.completada).length;

  const columnas = enEjercicios
    ? "min-[1100px]:grid-cols-[72px_minmax(0,1fr)]"
    : titulos.length > 0
    ? "min-[1100px]:grid-cols-[300px_minmax(0,1fr)_220px]"
    : "min-[1100px]:grid-cols-[300px_minmax(0,1fr)]";

  return (
    // La columna de altura completa la pone ahora el layout del curso,
    // que es quien tiene la cabecera. Aquí basta con ocupar lo que sobra:
    // es lo que deja la barra de acciones pegada al fondo de la ventana
    // cuando la lección es corta.
    <div className="flex flex-1 flex-col bg-marca-niebla">
      {/* Solo la de móvil: la de escritorio la pinta el layout y por eso
          no parpadea al cambiar de lección. Ver la nota en
          `CabeceraLeccion.tsx` sobre por qué la de móvil se queda aquí. */}
      <CabeceraMovil
        cursoTitulo={cursoTitulo}
        cursoSlug={cursoSlug}
        volverA={volverA}
        derecha={
          <button
            type="button"
            onClick={() => setPanel((v) => !v)}
            className="shrink-0 rounded-full border border-marca-borde bg-marca-niebla px-3.5 py-[7px] text-[12.5px] font-semibold text-marca-tinta transition-colors hover:bg-marca-nieblaOscura"
          >
            {panel ? "Cerrar" : "Lecciones"}
          </button>
        }
        tira={
          enEjercicios ? (
            <TiraProgreso texto="Ejercicios" hechos={hechasModulo} total={hermanas.length} />
          ) : (
            <TiraProgreso
              texto={`Lección ${posicion + 1} de ${hermanas.length}`}
              hechos={hechasModulo}
              total={hermanas.length}
            />
          )
        }
      />

      <div className={`grid flex-1 grid-cols-1 ${columnas}`}>
        <LateralLecciones
          lecciones={hermanas}
          actualId={leccion.id}
          cursoSlug={cursoSlug}
          etiquetaModulo={etiquetaModulo}
          tituloModulo={tituloModulo}
          cursoCompletadas={cursoCompletadas}
          cursoTotal={cursoTotal}
          replegado={enEjercicios}
          alVolver={() => setEnEjercicios(false)}
        />

        {enEjercicios ? (
          <main className="flex flex-col bg-marca-niebla">
            <FlujoEjercicios
              ejercicios={ejercicios}
              registrarIntentos={registrarIntentos}
              profesor={profesor}
              leccionId={leccion.id}
              cursoSlug={cursoSlug}
              siguienteId={siguienteId}
              alSalir={() => {
                setEnEjercicios(false);
                window.scrollTo({ top: 0 });
              }}
            />
          </main>
        ) : (
          <>
            <main className="flex min-w-0 flex-col bg-marca-niebla">
              {/* `columna-leccion` es la rejilla de tres calles: el texto
                  en la del medio a 680px y el vídeo rompiendo a lo ancho.
                  Ver `globals.css`. */}
              <div className="columna-leccion flex-1 px-4 pb-6 pt-7 min-[1100px]:px-14 min-[1100px]:pb-6 min-[1100px]:pt-10">
                {/* Antes iba debajo del botón de completar, donde se leía
                    cuando ya lo habías pulsado. Va arriba, que es cuando
                    sirve de algo. */}
                {!registrarIntentos && (
                  <p className="mb-5 flex items-center gap-2.5 rounded-[12px] border border-marca-examenBorde bg-marca-examen px-4 py-3 text-[13.5px] leading-[1.4] text-marca-tinta">
                    <span aria-hidden className="h-2 w-2 shrink-0 rounded-full bg-marca-amarillo" />
                    <span>
                      <strong className="font-semibold">Estás viendo el curso como equipo.</strong>{" "}
                      Nada de lo que marques aquí guarda progreso.
                    </span>
                  </p>
                )}

                <p className="text-[11.5px] font-semibold uppercase leading-none tracking-[0.1em] text-marca-grisSuave">
                  Lección {posicion + 1} de {hermanas.length}
                </p>

                <h1 className="mt-2.5 text-pretty font-display text-[24px] font-bold leading-[1.18] text-marca-tinta min-[1100px]:text-[33px]">
                  {leccion.titulo}
                </h1>

                {/* `ancho` lo saca de la calle del texto: 960px en vez de
                    680. El `aspect-video` va en el contenedor y no en el
                    iframe, que trae su propia altura por defecto y ganaba:
                    salía una banda de 150px. */}
                {leccion.videoIncrustado && (
                  <div className="ancho relative mt-6 aspect-video overflow-hidden rounded-[14px] border border-marca-bordeSuave bg-marca-pista">
                    <iframe
                      src={leccion.videoIncrustado}
                      title={leccion.titulo}
                      loading="lazy"
                      allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="absolute inset-0 h-full w-full border-0"
                    />
                  </div>
                )}

                {hayTeoria && (
                  <div
                    className="leccion mt-7 min-[1100px]:mt-[30px]"
                    dangerouslySetInnerHTML={{ __html: contenidoHtml }}
                  />
                )}

                {hayEjercicios && (
                  <div className="mt-9 flex flex-col gap-5 rounded-[16px] bg-marca-tinta px-6 py-6 min-[1100px]:mt-[38px] min-[1100px]:flex-row min-[1100px]:items-center min-[1100px]:gap-6 min-[1100px]:px-[26px]">
                    <div className="min-w-0 flex-1">
                      <p className="text-[11.5px] font-semibold uppercase leading-none tracking-[0.1em] text-marca-amarillo">
                        Ejercicios
                      </p>
                      <p className="mt-2.5 text-pretty font-display text-[19px] font-bold leading-[1.25] text-white min-[1100px]:text-[20px]">
                        {ejercicios.length === 1
                          ? "Un ejercicio para fijar lo de arriba"
                          : `${ejercicios.length} ejercicios para fijar lo de arriba`}
                      </p>
                      <p className="mt-1.5 text-[14.5px] text-white/60">
                        De uno en uno. Se corrigen al momento.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setEnEjercicios(true);
                        window.scrollTo({ top: 0 });
                      }}
                      className="shrink-0 rounded-full bg-marca-verde px-[26px] py-3.5 text-[15.5px] font-semibold text-white transition-colors hover:bg-marca-verdeOsc"
                    >
                      Empezar
                    </button>
                  </div>
                )}

                {!hayAlgoQueEnsenar && (
                  <p className="mt-7 text-[16px] leading-[1.6] text-marca-gris">
                    Esta lección todavía no tiene contenido. Puedes seguir con la siguiente.
                  </p>
                )}
              </div>

              {/* ------------------------ BARRA DE ACCIONES -----------------------
                  UN SOLO BOTÓN DE AVANZAR, y es el de marcar. Antes había
                  dos que hacían lo mismo: el verde y una flecha "Siguiente
                  →" al lado. Con dos caminos al mismo sitio, el alumno
                  elige el que no deja constancia de que ha hecho la
                  lección, que es justo el que no queremos que elija.
                  Para volver atrás sí hace falta la flecha: no hay otra. */}
              <div className="sticky bottom-0 border-t border-marca-borde bg-white/[0.94] backdrop-blur-md">
                <div className="mx-auto w-full max-w-[calc(680px+7rem)] px-3.5 pb-4 pt-3 min-[1100px]:px-14 min-[1100px]:py-3.5">
                  <div className="flex items-center gap-3 min-[1100px]:gap-4">
                    <FlechaLeccion href={anteriorId ? `/curso/${cursoSlug}/${anteriorId}` : null} />

                    <BotonCompletar
                      leccionId={leccion.id}
                      cursoSlug={cursoSlug}
                      siguienteId={siguienteId}
                      className="flex-1 rounded-full bg-marca-verde px-6 py-[13px] text-center text-[15px] font-semibold text-white transition-colors hover:bg-marca-verdeOsc min-[1100px]:py-3.5 min-[1100px]:text-[15.5px]"
                    >
                      <span className="min-[1100px]:hidden">
                        {completada ? "Continuar" : "Completada y continuar"}
                      </span>
                      <span className="hidden min-[1100px]:inline">
                        {completada
                          ? "Continuar"
                          : esUltimaDelModulo
                          ? "Marcar el módulo como completado"
                          : "Marcar como completada y continuar"}
                      </span>
                    </BotonCompletar>
                  </div>

                </div>
              </div>
            </main>

            {titulos.length > 0 && <IndiceLeccion key={leccion.id} titulos={titulos} />}
          </>
        )}
      </div>

      {/* --------------------------- PANEL DE MÓVIL --------------------------- */}
      {panel && (
        <div className="fixed inset-0 z-40 flex flex-col min-[1100px]:hidden">
          <button
            type="button"
            aria-label="Cerrar el panel de lecciones"
            onClick={() => setPanel(false)}
            className="flex-1 bg-[rgba(18,33,26,.42)]"
          />
          <div className="flex max-h-[620px] flex-col rounded-t-[20px] bg-white">
            <div className="border-b border-marca-nieblaOscura px-[18px] pb-3.5 pt-[18px]">
              <span aria-hidden className="mx-auto mb-3.5 block h-1 w-9 rounded-full bg-marca-bordeSuave" />
              <p className="text-[11px] font-semibold uppercase leading-none tracking-[0.1em] text-marca-grisSuave">
                {etiquetaModulo}
              </p>
              <h2 className="mt-2 text-pretty font-display text-[16px] font-bold leading-[1.3] text-marca-tinta">
                {tituloModulo}
              </h2>
              <div className="mt-3 flex items-center gap-2.5">
                <div className="h-[5px] flex-1 overflow-hidden rounded-[3px] bg-marca-pista">
                  <div
                    className="h-full rounded-[3px] bg-marca-verde"
                    style={{
                      width: `${
                        hermanas.length > 0 ? Math.round((hechasModulo / hermanas.length) * 100) : 0
                      }%`,
                    }}
                  />
                </div>
                <span className="shrink-0 text-[12.5px] font-medium text-marca-gris tabular-nums">
                  {hechasModulo} de {hermanas.length}
                </span>
              </div>
            </div>

            <ol className="flex-1 overflow-y-auto px-3 py-3">
              {hermanas.map((h) => (
                <li key={h.id}>
                  <ItemLeccion
                    leccion={h}
                    actual={h.id === leccion.id}
                    cursoSlug={cursoSlug}
                    compacto
                    alElegir={() => setPanel(false)}
                  />
                </li>
              ))}
            </ol>

            <div className="border-t border-marca-nieblaOscura px-[18px] pb-5 pt-3.5">
              <Link
                href={`/curso/${cursoSlug}`}
                className="flex w-full items-center justify-between gap-2 rounded-[10px] border border-marca-borde bg-marca-niebla px-3 py-[13px] text-[14px] font-semibold text-marca-tinta"
              >
                Ver el curso completo
                <span aria-hidden className="text-marca-grisSuave">
                  →
                </span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Volver a la lección anterior. En la primera del curso no hay destino y
 * queda el hueco: quitarla movería el botón principal de sitio al pasar
 * de la primera a la segunda lección.
 */
function FlechaLeccion({ href }: { href: string | null }) {
  const clase =
    "grid h-11 w-11 shrink-0 place-items-center rounded-full border border-marca-borde text-[15px] leading-none text-marca-tinta transition-colors hover:bg-marca-niebla min-[1100px]:h-auto min-[1100px]:w-auto min-[1100px]:px-[18px] min-[1100px]:py-[11px] min-[1100px]:text-[14.5px] min-[1100px]:font-medium";

  if (!href) {
    return <span aria-hidden className={`${clase} pointer-events-none opacity-0`} />;
  }

  return (
    <Link href={href} className={clase}>
      <span className="min-[1100px]:hidden">←</span>
      <span className="hidden min-[1100px]:inline">← Anterior</span>
    </Link>
  );
}
