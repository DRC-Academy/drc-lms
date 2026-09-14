"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { EjerciciosDeLeccion, LeccionIndice, ModuloIndice } from "@/lib/cursos-servidor";
import type { ParteLeccion } from "@/lib/leccion-html";
import type { EjercicioVista } from "@/lib/ejercicios";
import { usarIdioma } from "@/components/ProveedorIdioma";
import BotonIdioma from "@/components/BotonIdioma";
import FlujoEjercicios from "@/components/leccion/FlujoEjercicios";
import BotonCompletar from "@/components/leccion/BotonCompletar";
import PanelCurso, { type EstadoEjerciciosActual } from "@/components/leccion/PanelCurso";
import PasoAPaso, { type Paso } from "@/components/leccion/PasoAPaso";
import { usarMarco } from "@/components/leccion/MarcoCurso";
import { conFoco } from "@/lib/foco";

/**
 * LA PANTALLA DE LECCIÓN: EL PANEL DEL CURSO Y LA LECCIÓN POR PARTES.
 *
 * Tres columnas a partir de 1200px: la barra de iconos —que pone el
 * layout—, el panel del curso a 330px y la lección en lo que queda. La
 * lección ya no es una columna de texto de arriba abajo: se lee una
 * parte cada vez, con un paso a paso encima que dice cuántas hay, cuál
 * es esta y cuáles quedan. El vídeo es la primera parte cuando lo hay;
 * los ejercicios vienen después de la última, detrás de «Evaluar».
 *
 * LAS TRES —teoría, ejercicios y cierre— SIGUEN SIENDO LA MISMA URL y
 * cambian por estado, no por navegación: el alumno entra en los
 * ejercicios de la lección que está leyendo y sale de vuelta a ella.
 *
 * POR DEBAJO DE 1200px el panel se esconde y se abre como un cajón
 * desde la barra; por debajo de 900px la barra es la navegación de
 * abajo, el paso a paso se pliega a «Paso 2 de 6» y la salida, el
 * idioma y el nombre de la lección van en una fila arriba.
 */
export default function VistaLeccion({
  cursoSlug,
  cursoTitulo,
  cursoCompletadas,
  cursoTotal,
  etiquetaModulo,
  moduloId,
  modulos,
  ejerciciosPorLeccion,
  leccion,
  partes,
  hermanas,
  ejercicios,
  completada,
  siguienteId,
  anteriorId,
  esUltimaDelModulo,
  registrarIntentos,
  profesor,
  foco = null,
}: {
  cursoSlug: string;
  cursoTitulo: string;
  cursoCompletadas: number;
  cursoTotal: number;
  etiquetaModulo: string;
  moduloId: string;
  /** El curso entero, para el panel. */
  modulos: ModuloIndice[];
  /** Ejercicios hechos y totales por lección, solo del módulo actual. */
  ejerciciosPorLeccion: Record<string, EjerciciosDeLeccion>;
  leccion: { id: string; titulo: string; videoIncrustado: string | null };
  /** El texto de la lección, ya partido por sus títulos. */
  partes: ParteLeccion[];
  hermanas: LeccionIndice[];
  ejercicios: EjercicioVista[];
  completada: boolean;
  siguienteId: string | null;
  anteriorId: string | null;
  esUltimaDelModulo: boolean;
  registrarIntentos: boolean;
  profesor: string;
  /**
   * El contexto de revisión que conservan los enlaces de esta pantalla.
   * null para el alumno, que es el caso normal. Ver `lib/foco.ts`.
   */
  foco?: string | null;
}) {
  const { t: todos } = usarIdioma();
  const t = todos.curso;
  const { panelAbierto, abrirPanel, cerrarPanel } = usarMarco();

  const hayTeoria = partes.length > 0;
  const hayEjercicios = ejercicios.length > 0;
  const hayVideo = leccion.videoIncrustado !== null;

  // ---------------------------------------------------------------
  // LAS PARTES
  //
  // El vídeo va primero, como una parte más: de las 160 lecciones con
  // vídeo, 158 no traen texto, así que para ellas es la única. Después,
  // el texto partido por sus títulos —ver `partesDeLeccion`—. La parte
  // de antes del primer título no tiene nombre propio y toma el de la
  // lección.
  // ---------------------------------------------------------------
  const pasos: Paso[] = useMemo(
    () => [
      ...(hayVideo ? [{ id: "video", titulo: t.parteVideo }] : []),
      ...partes.map((p) => ({ id: p.id, titulo: p.titulo ?? t.parteIntro })),
    ],
    [hayVideo, partes, t.parteVideo, t.parteIntro]
  );

  const hayAlgoQueEnsenar = pasos.length > 0 || hayEjercicios;

  const [paso, setPaso] = useState(0);
  // Una lección de solo ejercicios no tiene teoría que enseñar: se entra
  // directamente al flujo en vez de a una pantalla en blanco.
  const [enEjercicios, setEnEjercicios] = useState(pasos.length === 0 && hayEjercicios);
  const [estadoEjercicios, setEstadoEjercicios] = useState<EstadoEjerciciosActual | null>(null);

  const ultimoPaso = pasos.length - 1;
  const enElUltimo = paso >= ultimoPaso;
  const posicion = hermanas.findIndex((h) => h.id === leccion.id);

  function irA(i: number) {
    setPaso(Math.max(0, Math.min(ultimoPaso, i)));
    window.scrollTo({ top: 0 });
  }

  function abrirEjercicios() {
    setEnEjercicios(true);
    window.scrollTo({ top: 0 });
  }

  function volverALaTeoria() {
    setEnEjercicios(false);
    setEstadoEjercicios(null);
    window.scrollTo({ top: 0 });
  }

  // Escape cierra el cajón del panel.
  useEffect(() => {
    if (!panelAbierto) return;
    function alPulsar(evento: KeyboardEvent) {
      if (evento.key === "Escape") cerrarPanel();
    }
    document.addEventListener("keydown", alPulsar);
    return () => document.removeEventListener("keydown", alPulsar);
  }, [panelAbierto, cerrarPanel]);

  const parteActual = pasos[paso];
  const contenidoActual = parteActual?.id === "video" ? null : partes.find((p) => p.id === parteActual?.id);

  const instruccion = enEjercicios
    ? hayTeoria || hayVideo
      ? t.instruccionEjercicios(ejercicios.length)
      : t.instruccionSoloEjercicios(ejercicios.length)
    : pasos.length <= 1
      ? t.instruccionUnaParte(ejercicios.length)
      : hayEjercicios
        ? t.instruccionPartes(ejercicios.length)
        : t.instruccionSinEjercicios;

  const hrefCurso = conFoco(`/curso/${cursoSlug}`, foco);

  const panel = (
    <PanelCurso
      cursoTitulo={cursoTitulo}
      cursoCompletadas={cursoCompletadas}
      cursoTotal={cursoTotal}
      modulos={modulos}
      moduloActualId={moduloId}
      leccionActualId={leccion.id}
      ejercicios={ejerciciosPorLeccion}
      ejerciciosActual={enEjercicios ? estadoEjercicios : null}
      enEjercicios={enEjercicios}
      alAbrirEjercicios={hayEjercicios ? abrirEjercicios : null}
      cursoSlug={cursoSlug}
      foco={foco}
      abiertoComoCajon={panelAbierto}
      alElegir={cerrarPanel}
    />
  );

  return (
    <div className="flex flex-1 items-stretch bg-marca-niebla">
      {/* ------------------------------ EL PANEL ------------------------------
          A partir de 1200px, una columna fija de la altura de la ventana
          con su propio scroll. Por debajo, un cajón que abre la barra
          —o el rótulo de la lección, en móvil— y que tapa la pantalla. */}
      {panelAbierto && (
        <button
          type="button"
          aria-label={t.cerrarElPanel}
          onClick={cerrarPanel}
          className="fixed inset-0 z-40 bg-[rgba(18,33,26,.42)] min-[1200px]:hidden"
        />
      )}
      <aside
        aria-label={todos.navegacion.miCurso}
        className={`shrink-0 border-r border-marca-borde bg-white min-[1200px]:sticky min-[1200px]:top-0 min-[1200px]:h-dvh min-[1200px]:w-[330px] ${
          panelAbierto
            ? "aparece fixed inset-y-0 left-0 z-50 w-[min(330px,100%)] shadow-[0_18px_44px_-16px_rgba(18,33,26,0.35)] min-[1200px]:inset-auto min-[1200px]:z-auto min-[1200px]:shadow-none"
            : "hidden min-[1200px]:block"
        }`}
      >
        {panelAbierto && (
          <button
            type="button"
            onClick={cerrarPanel}
            aria-label={t.cerrarElPanel}
            className="absolute right-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-full bg-white text-marca-gris transition-colors hover:bg-marca-nieblaOscura hover:text-marca-tinta min-[1200px]:hidden"
          >
            <IconoCerrar className="h-4 w-4" />
          </button>
        )}
        {panel}
      </aside>

      {/* ----------------------------- LA LECCIÓN ----------------------------- */}
      <main className="relative flex min-w-0 flex-1 flex-col">
        {/* LA ESQUINA, EN ESCRITORIO: el curso, su progreso y el idioma.
            Discretos: es lo que la cabecera decía arriba y aquí no hay
            cabecera. */}
        <div className="absolute right-6 top-5 hidden items-center gap-3.5 min-[900px]:flex min-[1200px]:right-10">
          <Link
            href={hrefCurso}
            className="max-w-[260px] truncate text-[12.5px] text-marca-gris transition-colors hover:text-marca-tinta"
            title={cursoTitulo}
          >
            {cursoTitulo}
          </Link>
          <div
            className="h-1 w-[72px] overflow-hidden rounded-[3px] bg-marca-pista"
            role="progressbar"
            aria-valuenow={cursoTotal > 0 ? Math.round((cursoCompletadas / cursoTotal) * 100) : 0}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={todos.navegacion.progresoEnCurso(cursoTitulo, cursoCompletadas, cursoTotal)}
          >
            <div
              className="h-full rounded-[3px] bg-marca-verde"
              style={{
                width: `${cursoTotal > 0 ? Math.round((cursoCompletadas / cursoTotal) * 100) : 0}%`,
              }}
            />
          </div>
          <span className="text-[12px] font-semibold text-marca-gris tabular-nums">
            {cursoTotal > 0 ? Math.round((cursoCompletadas / cursoTotal) * 100) : 0}%
          </span>
          <BotonIdioma className="ml-1.5" />
        </div>

        {/* LA FILA DE MÓVIL: la salida, dónde estás —que abre el panel— y
            el idioma. Lo que en escritorio está repartido entre la X, la
            esquina y el panel. */}
        <div className="flex items-center gap-2.5 px-3.5 pt-3 min-[900px]:hidden">
          <Link
            href={hrefCurso}
            aria-label={t.volverAlCurso}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-marca-borde bg-white text-marca-tinta transition-colors hover:bg-marca-niebla"
          >
            <IconoCerrar className="h-4 w-4" />
          </Link>
          <button
            type="button"
            onClick={abrirPanel}
            className="flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-full py-2 text-[11.5px] font-semibold uppercase leading-none tracking-[0.08em] text-marca-grisSuave transition-colors hover:text-marca-tinta"
          >
            <span className="truncate">{t.leccionDeTotal(posicion + 1, hermanas.length)}</span>
            <IconoChevron className="h-3.5 w-3.5 shrink-0" />
          </button>
          <BotonIdioma />
        </div>

        <div className="mx-auto flex w-full max-w-[760px] flex-1 flex-col px-4 pb-8 pt-5 min-[900px]:px-8 min-[900px]:pb-10 min-[900px]:pt-[76px]">
          {/* ------------------------------ CABECERA ------------------------------ */}
          <header className="relative text-center">
            <Link
              href={hrefCurso}
              aria-label={t.volverAlCurso}
              className="absolute left-0 top-1 hidden h-10 w-10 place-items-center rounded-full border border-marca-borde bg-white text-marca-tinta transition-colors hover:bg-marca-niebla min-[900px]:grid"
            >
              <IconoCerrar className="h-4 w-4" />
            </Link>

            <p className="hidden text-[11.5px] font-semibold uppercase leading-none tracking-[0.1em] text-marca-grisSuave min-[900px]:block">
              {etiquetaModulo} · {t.leccionDeTotal(posicion + 1, hermanas.length)}
            </p>
            <h1 className="mx-auto max-w-[600px] text-balance font-display text-[24px] font-bold leading-[1.16] tracking-[-0.01em] text-marca-tinta min-[900px]:mt-3 min-[900px]:text-[30px] min-[900px]:leading-[1.15]">
              {leccion.titulo}
            </h1>
            {hayAlgoQueEnsenar && (
              <p className="mx-auto mt-2.5 max-w-[520px] text-pretty text-[14.5px] leading-[1.5] text-marca-gris min-[900px]:mt-3 min-[900px]:text-[15px]">
                {instruccion}
              </p>
            )}
          </header>

          {/* ----------------------------- PASO A PASO ----------------------------
              Solo con dos partes o más: con una no hay por dónde ir. */}
          {pasos.length >= 2 && (
            <div className="mt-6 min-[900px]:mt-9">
              <PasoAPaso pasos={pasos} activo={paso} todoHecho={enEjercicios} alElegir={irA} />
            </div>
          )}

          {/* ------------------------------ CONTENIDO ------------------------------ */}
          {enEjercicios ? (
            <div className="mt-5 min-[900px]:mt-7">
              <FlujoEjercicios
                ejercicios={ejercicios}
                registrarIntentos={registrarIntentos}
                profesor={profesor}
                leccionId={leccion.id}
                cursoSlug={cursoSlug}
                siguienteId={siguienteId}
                foco={foco}
                alSalir={volverALaTeoria}
                alEstado={setEstadoEjercicios}
              />
            </div>
          ) : parteActual ? (
            <>
              <section
                key={parteActual.id}
                aria-label={parteActual.titulo}
                className="aparece mt-5 rounded-[16px] border border-marca-borde bg-white px-5 py-6 min-[900px]:mt-7 min-[900px]:px-11 min-[900px]:py-8"
              >
                {pasos.length >= 2 && (
                  <p className="text-[11.5px] font-semibold uppercase leading-none tracking-[0.12em] text-marca-verde">
                    {t.parteDe(paso + 1, pasos.length)}
                  </p>
                )}
                {/* La introducción no repite el título: ya está encima. */}
                {(parteActual.id === "video" || contenidoActual?.titulo) && (
                  <h2 className="mt-2 text-pretty font-display text-[21px] font-bold leading-[1.25] text-marca-tinta min-[900px]:text-[24px]">
                    {parteActual.titulo}
                  </h2>
                )}

                {parteActual.id === "video" && leccion.videoIncrustado && (
                  <div className="relative mt-5 aspect-video overflow-hidden rounded-[12px] border border-marca-bordeSuave bg-marca-pista">
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

                {contenidoActual && (
                  <div
                    className={
                      pasos.length >= 2 || contenidoActual.titulo ? "leccion mt-4 min-[900px]:mt-5" : "leccion"
                    }
                    dangerouslySetInnerHTML={{ __html: contenidoActual.html }}
                  />
                )}
              </section>

              {/* ------------------------------- BOTONES -------------------------------
                  Anterior a la izquierda, el principal a lo ancho. En la
                  primera parte, «Anterior» lleva a la lección de antes; en
                  la última, el principal es «Evaluar» si hay ejercicios y
                  «Marcar como completada» si no. */}
              <div className="mt-4 flex items-center gap-3 min-[900px]:mt-5 min-[900px]:gap-3.5">
                <BotonAnterior
                  texto={paso > 0 ? t.parteAnterior : t.anterior}
                  alPulsar={paso > 0 ? () => irA(paso - 1) : null}
                  href={paso === 0 && anteriorId ? conFoco(`/curso/${cursoSlug}/${anteriorId}`, foco) : null}
                />

                {!enElUltimo ? (
                  <button
                    type="button"
                    onClick={() => irA(paso + 1)}
                    className="btn-verde flex-1 rounded-full px-6 py-[14px] text-center text-[15px] font-semibold min-[900px]:py-[15px] min-[900px]:text-[15.5px]"
                  >
                    {t.siguiente}
                  </button>
                ) : hayEjercicios ? (
                  <button
                    type="button"
                    onClick={abrirEjercicios}
                    className="btn-verde flex-1 rounded-full px-6 py-[14px] text-center text-[15px] font-semibold min-[900px]:py-[15px] min-[900px]:text-[15.5px]"
                  >
                    {t.evaluar}
                  </button>
                ) : (
                  <BotonCompletar
                    leccionId={leccion.id}
                    cursoSlug={cursoSlug}
                    siguienteId={siguienteId}
                    foco={foco}
                    className="btn-verde flex-1 rounded-full px-6 py-[14px] text-center text-[15px] font-semibold min-[900px]:py-[15px] min-[900px]:text-[15.5px]"
                  >
                    <span className="min-[900px]:hidden">
                      {completada ? t.completarCortoHecha : t.completarCorto}
                    </span>
                    <span className="hidden min-[900px]:inline">
                      {completada
                        ? t.completarLargoHecha
                        : esUltimaDelModulo
                          ? t.completarModulo
                          : t.completarLargo}
                    </span>
                  </BotonCompletar>
                )}
              </div>
            </>
          ) : (
            // Ni teoría, ni vídeo, ni ejercicios: se dice y se deja seguir.
            <>
              <section className="mt-5 rounded-[16px] border border-marca-borde bg-white px-5 py-6 min-[900px]:mt-7 min-[900px]:px-11 min-[900px]:py-8">
                <p className="text-[16px] leading-[1.6] text-marca-gris">{t.leccionSinContenido}</p>
              </section>
              <div className="mt-4 flex items-center gap-3 min-[900px]:mt-5">
                <BotonAnterior
                  texto={t.anterior}
                  alPulsar={null}
                  href={anteriorId ? conFoco(`/curso/${cursoSlug}/${anteriorId}`, foco) : null}
                />
                <BotonCompletar
                  leccionId={leccion.id}
                  cursoSlug={cursoSlug}
                  siguienteId={siguienteId}
                  foco={foco}
                  className="btn-verde flex-1 rounded-full px-6 py-[14px] text-center text-[15px] font-semibold min-[900px]:py-[15px] min-[900px]:text-[15.5px]"
                >
                  {completada ? t.completarCortoHecha : t.completarCorto}
                </BotonCompletar>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

/**
 * El botón secundario, a la izquierda del principal: vuelve a la parte
 * anterior, o a la lección anterior desde la primera parte. Sin destino
 * —la primera lección del curso— se conserva el hueco: quitarlo movería
 * el botón principal de sitio al pasar de una parte a la siguiente.
 */
function BotonAnterior({
  texto,
  alPulsar,
  href,
}: {
  texto: string;
  alPulsar: (() => void) | null;
  href: string | null;
}) {
  const clase =
    "grid h-12 w-12 shrink-0 place-items-center rounded-full border border-marca-borde bg-white text-marca-tinta transition-colors hover:bg-marca-niebla min-[900px]:h-auto min-[900px]:w-auto min-[900px]:px-[22px] min-[900px]:py-[13px] min-[900px]:text-[14.5px] min-[900px]:font-medium";

  const dentro = (
    <>
      <span className="min-[900px]:hidden">
        <IconoFlecha className="h-4 w-4" />
      </span>
      <span className="hidden min-[900px]:inline">{texto}</span>
    </>
  );

  if (alPulsar) {
    return (
      <button type="button" onClick={alPulsar} className={clase}>
        {dentro}
      </button>
    );
  }

  if (href) {
    return (
      <Link href={href} className={clase}>
        {dentro}
      </Link>
    );
  }

  return <span aria-hidden className={`${clase} pointer-events-none opacity-0`} />;
}

function IconoCerrar({ className }: { className: string }) {
  return (
    <svg aria-hidden viewBox="0 0 16 16" className={className} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      <path d="m4 4 8 8M12 4l-8 8" />
    </svg>
  );
}

function IconoChevron({ className }: { className: string }) {
  return (
    <svg aria-hidden viewBox="0 0 16 16" className={className} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="m4 6 4 4 4-4" />
    </svg>
  );
}

function IconoFlecha({ className }: { className: string }) {
  return (
    <svg aria-hidden viewBox="0 0 16 16" className={className} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13 8H3m4.5-4.5L3 8l4.5 4.5" />
    </svg>
  );
}
