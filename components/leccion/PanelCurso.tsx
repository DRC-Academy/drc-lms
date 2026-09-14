"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { EjerciciosDeLeccion, LeccionIndice, ModuloIndice } from "@/lib/cursos-servidor";
import { etiquetaModulo, partirModulo } from "@/lib/modulo";
import { conFoco } from "@/lib/foco";
import { usarIdioma } from "@/components/ProveedorIdioma";

/**
 * Lo que la lección sabe de los ejercicios mientras se están haciendo:
 * por cuál va y cuáles lleva respondidos. Lo emite el visor y lo recoge
 * `VistaLeccion`; aquí solo se pinta.
 */
export type EstadoEjerciciosActual = {
  indice: number;
  respondidos: boolean[];
  acertados: boolean[];
};

/**
 * EL PANEL DEL CURSO, a la izquierda del texto.
 *
 * Sustituye al lateral de lecciones del módulo y al índice de títulos
 * de la derecha: un acordeón con TODOS los módulos del curso, el actual
 * abierto y dentro de él tres cosas —el progreso del módulo, sus
 * lecciones y sus ejercicios—. Es el mismo árbol que pinta el temario
 * (`arbolDelCurso`), así que lo que se ve aquí y lo que se ve allí no
 * pueden discrepar.
 *
 * LOS EJERCICIOS SOLO SE CUENTAN EN EL MÓDULO ACTUAL. Contarlos para
 * las 191 lecciones del curso sería traer mil filas cada vez que se
 * abre una lección para pintar nueve; los otros módulos enseñan sus
 * lecciones y ya está.
 *
 * SCROLL PROPIO. Es una columna fija de la altura de la ventana: la
 * lista se mueve dentro y el texto se queda quieto, que es lo que
 * arregló el lateral anterior y no se vuelve atrás. Al entrar, la
 * lección actual se centra en esa columna.
 */
export default function PanelCurso({
  cursoTitulo,
  cursoCompletadas,
  cursoTotal,
  modulos,
  moduloActualId,
  leccionActualId,
  ejercicios,
  ejerciciosActual,
  enEjercicios,
  alAbrirEjercicios,
  cursoSlug,
  foco,
  abiertoComoCajon = false,
  alElegir,
}: {
  cursoTitulo: string;
  cursoCompletadas: number;
  cursoTotal: number;
  modulos: ModuloIndice[];
  moduloActualId: string;
  leccionActualId: string;
  /** Ejercicios por lección, solo de las del módulo actual. */
  ejercicios: Record<string, EjerciciosDeLeccion>;
  /** Cómo van los ejercicios de esta lección, mientras se hacen. */
  ejerciciosActual: EstadoEjerciciosActual | null;
  enEjercicios: boolean;
  /** Abre los ejercicios de la lección actual desde la lista. */
  alAbrirEjercicios: (() => void) | null;
  cursoSlug: string;
  foco: string | null;
  /**
   * Si está abierto como cajón. Solo se mira para volver a recolocar la
   * lista cuando se abre: montado y oculto, no hay medidas que tomar.
   */
  abiertoComoCajon?: boolean;
  /** Al elegir algo que cambia de pantalla: cierra el cajón en móvil. */
  alElegir?: () => void;
}) {
  const { t: todos } = usarIdioma();
  const t = todos.curso;

  const [abierto, setAbierto] = useState<string | null>(moduloActualId);
  const [sub, setSub] = useState<"lecciones" | "ejercicios">(enEjercicios ? "ejercicios" : "lecciones");

  // Al entrar en los ejercicios, el panel enseña los ejercicios.
  useEffect(() => {
    if (enEjercicios) setSub("ejercicios");
  }, [enEjercicios]);

  const columna = useRef<HTMLDivElement>(null);
  const actual = useRef<HTMLLIElement>(null);

  // La lección actual, a la vista dentro de la columna. Se mueve la
  // columna y no la ventana: `scrollIntoView` arrastraría la página.
  // Con rectángulos y no con `offsetTop`: el acordeón entra con una
  // animación que transforma, y un antepasado transformado se convierte
  // en el origen de `offsetTop`.
  useEffect(() => {
    const caja = columna.current;
    const fila = actual.current;
    if (!caja || !fila) return;
    // Oculto —el cajón cerrado por debajo de 1200px— no mide nada.
    if (caja.clientHeight === 0) return;
    const arriba = fila.getBoundingClientRect().top - caja.getBoundingClientRect().top + caja.scrollTop;
    caja.scrollTop = Math.max(0, arriba - caja.clientHeight / 2 + fila.clientHeight / 2);
  }, [leccionActualId, abiertoComoCajon]);

  return (
    <div ref={columna} className="h-full overflow-y-auto px-4 pb-6 pt-7">
      <h2 className="font-display text-[22px] font-bold leading-[1.2] text-marca-tinta">
        {todos.navegacion.miCurso}
      </h2>
      <p className="mt-1.5 text-[12.5px] text-marca-gris">
        {cursoTitulo} · {t.leccionesDelCurso(cursoCompletadas, cursoTotal)}
      </p>

      <ol className="mt-[22px] flex flex-col gap-2">
        {modulos.map((modulo, i) => {
          const partido = partirModulo(modulo.titulo, i);
          const esActual = modulo.id === moduloActualId;
          const estaAbierto = abierto === modulo.id;
          const terminado = modulo.lecciones.length > 0 && modulo.completadas === modulo.lecciones.length;

          return (
            <li
              key={modulo.id}
              className={`rounded-[12px] border bg-white ${
                estaAbierto ? "border-marca-borde" : "border-marca-borde"
              }`}
            >
              <button
                type="button"
                onClick={() => setAbierto(estaAbierto ? null : modulo.id)}
                aria-expanded={estaAbierto}
                className="flex w-full items-center gap-3 rounded-[12px] px-4 py-3.5 text-left transition-colors hover:bg-marca-niebla/60"
              >
                <span className="min-w-0 flex-1">
                  <span
                    className={`block text-[11px] font-semibold uppercase leading-none tracking-[0.1em] ${
                      modulo.disponible ? "text-marca-grisSuave" : "text-marca-grisTenue"
                    }`}
                  >
                    {etiquetaModulo(partido, t)}
                  </span>
                  <span
                    className={`mt-1.5 block text-pretty text-[14px] font-semibold leading-[1.3] ${
                      modulo.disponible ? "text-marca-tinta" : "text-marca-grisSuave"
                    }`}
                  >
                    {partido.titulo}
                  </span>
                  {!modulo.disponible && modulo.diasParaAbrir !== null && (
                    <span className="mt-1 block text-[12px] text-marca-grisTenue">
                      {t.abreEn(modulo.diasParaAbrir)}
                    </span>
                  )}
                </span>
                {terminado ? (
                  <span
                    aria-hidden
                    className="grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full bg-marca-verde"
                  >
                    <Marca />
                  </span>
                ) : (
                  <Chevron abierto={estaAbierto} />
                )}
              </button>

              {estaAbierto && (
                <div className="aparece px-2.5 pb-2.5">
                  <TarjetaProgreso
                    modulo={modulo}
                    ejercicios={esActual ? ejercicios : null}
                    t={t}
                  />

                  <div className="mt-2">
                    <FilaSub
                      texto={t.lecciones}
                      meta={t.contador(modulo.completadas, modulo.lecciones.length)}
                      abierto={!esActual || sub === "lecciones"}
                      alPulsar={esActual ? () => setSub("lecciones") : undefined}
                    />
                    {(!esActual || sub === "lecciones") && (
                      <ol className="flex flex-col gap-0.5">
                        {modulo.lecciones.map((leccion) => (
                          <li
                            key={leccion.id}
                            ref={leccion.id === leccionActualId ? actual : undefined}
                          >
                            <TarjetaLeccion
                              leccion={leccion}
                              actual={leccion.id === leccionActualId}
                              cuenta={esActual ? ejercicios[leccion.id] : undefined}
                              cursoSlug={cursoSlug}
                              foco={foco}
                              alElegir={alElegir}
                              t={t}
                            />
                          </li>
                        ))}
                      </ol>
                    )}

                    {esActual && Object.values(ejercicios).some((e) => e.total > 0) && (
                      <>
                        <FilaSub
                          texto={t.ejercicios}
                          meta={t.contador(
                            Object.values(ejercicios).reduce((s, e) => s + e.hechos, 0),
                            Object.values(ejercicios).reduce((s, e) => s + e.total, 0)
                          )}
                          abierto={sub === "ejercicios"}
                          alPulsar={() => setSub("ejercicios")}
                        />
                        {sub === "ejercicios" && (
                          <ol className="flex flex-col gap-0.5">
                            {modulo.lecciones
                              .filter((l) => (ejercicios[l.id]?.total ?? 0) > 0)
                              .map((leccion) => (
                                <li key={leccion.id}>
                                  <FilaEjercicios
                                    leccion={leccion}
                                    cuenta={ejercicios[leccion.id]}
                                    actual={leccion.id === leccionActualId}
                                    vivo={leccion.id === leccionActualId ? ejerciciosActual : null}
                                    cursoSlug={cursoSlug}
                                    foco={foco}
                                    alAbrir={
                                      leccion.id === leccionActualId && !enEjercicios
                                        ? alAbrirEjercicios
                                        : null
                                    }
                                    alElegir={alElegir}
                                    t={t}
                                  />
                                </li>
                              ))}
                          </ol>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ol>

      <Link
        href={conFoco(`/curso/${cursoSlug}`, foco)}
        onClick={alElegir}
        className="mt-4 flex w-full items-center justify-between gap-2 rounded-[10px] border border-marca-borde bg-marca-niebla px-3 py-[11px] text-[13.5px] font-semibold text-marca-tinta transition-colors hover:bg-marca-nieblaOscura"
      >
        {t.verElCursoCompleto}
        <span aria-hidden className="text-marca-grisSuave">
          →
        </span>
      </Link>
    </div>
  );
}

// ---------------------------------------------------------------

type Textos = ReturnType<typeof usarIdioma>["t"]["curso"];

/** «Tu progreso actual»: el anillo, las barras y cuánto falta. */
function TarjetaProgreso({
  modulo,
  ejercicios,
  t,
}: {
  modulo: ModuloIndice;
  ejercicios: Record<string, EjerciciosDeLeccion> | null;
  t: Textos;
}) {
  const total = modulo.lecciones.length;
  const hechas = modulo.completadas;
  const porcentaje = total > 0 ? Math.round((hechas / total) * 100) : 0;
  const faltan = total - hechas;

  const ejTotal = ejercicios ? Object.values(ejercicios).reduce((s, e) => s + e.total, 0) : 0;
  const ejHechos = ejercicios ? Object.values(ejercicios).reduce((s, e) => s + e.hechos, 0) : 0;

  return (
    <div className="flex items-start gap-4 rounded-[12px] bg-marca-niebla p-3.5">
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <p className="text-[13px] font-semibold text-marca-tinta">{t.tuProgresoActual}</p>
        <Barra texto={t.lecciones} hechos={hechas} total={total} />
        {ejTotal > 0 && <Barra texto={t.ejercicios} hechos={ejHechos} total={ejTotal} />}
        <p className="text-[12.5px] leading-[1.45] text-marca-gris">
          {faltan === 0 ? t.moduloTerminado : t.teFaltanLecciones(faltan)}
        </p>
      </div>
      <Anillo porcentaje={porcentaje} />
    </div>
  );
}

function Barra({ texto, hechos, total }: { texto: string; hechos: number; total: number }) {
  const porcentaje = total > 0 ? Math.round((hechos / total) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between text-[12.5px]">
        <span className="text-marca-gris">{texto}</span>
        <span className="font-semibold text-marca-tinta tabular-nums">
          {hechos}/{total}
        </span>
      </div>
      <div className="mt-1.5 h-[5px] overflow-hidden rounded-[3px] bg-marca-pista">
        <div className="h-full rounded-[3px] bg-marca-verde" style={{ width: `${porcentaje}%` }} />
      </div>
    </div>
  );
}

function Anillo({ porcentaje }: { porcentaje: number }) {
  const radio = 26;
  const circunferencia = 2 * Math.PI * radio;
  const lleno = (circunferencia * porcentaje) / 100;

  return (
    <svg width="64" height="64" viewBox="0 0 64 64" aria-hidden className="shrink-0">
      <circle cx="32" cy="32" r={radio} fill="none" stroke="#E8EEE9" strokeWidth="6" />
      <circle
        cx="32"
        cy="32"
        r={radio}
        fill="none"
        stroke="#1E9E3A"
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray={`${lleno.toFixed(1)} ${(circunferencia - lleno).toFixed(1)}`}
        transform="rotate(-90 32 32)"
      />
      <text
        x="32"
        y="36.5"
        textAnchor="middle"
        className="fill-marca-tinta font-display text-[14px] font-bold"
      >
        {porcentaje}%
      </text>
    </svg>
  );
}

/** La cabecera de «Lecciones» o «Ejercicios» dentro del módulo. */
function FilaSub({
  texto,
  meta,
  abierto,
  alPulsar,
}: {
  texto: string;
  meta: string;
  abierto: boolean;
  alPulsar?: () => void;
}) {
  const dentro = (
    <>
      <span className="text-[13px] font-semibold text-marca-tinta">{texto}</span>
      <span className="text-[12px] text-marca-grisSuave tabular-nums">{meta}</span>
      {alPulsar && (
        <span className="ml-auto inline-flex">
          <Chevron abierto={abierto} />
        </span>
      )}
    </>
  );

  if (!alPulsar) return <div className="flex items-center gap-2.5 px-1.5 py-2.5">{dentro}</div>;

  return (
    <button
      type="button"
      onClick={alPulsar}
      aria-expanded={abierto}
      className="flex w-full items-center gap-2.5 rounded-[8px] px-1.5 py-2.5 text-left transition-colors hover:bg-marca-niebla/60"
    >
      {dentro}
    </button>
  );
}

/** Una lección del módulo, como tarjeta compacta. */
function TarjetaLeccion({
  leccion,
  actual,
  cuenta,
  cursoSlug,
  foco,
  alElegir,
  t,
}: {
  leccion: LeccionIndice;
  actual: boolean;
  cuenta: EjerciciosDeLeccion | undefined;
  cursoSlug: string;
  foco: string | null;
  alElegir?: () => void;
  t: Textos;
}) {
  const etiqueta = leccion.soloEjercicios
    ? t.etiquetaPractica
    : leccion.conVideo
      ? t.etiquetaVideo
      : t.etiquetaTeoria;

  const pie = cuenta
    ? t.ejerciciosHechos(cuenta.hechos, cuenta.total)
    : leccion.completada
      ? t.visto
      : "";

  const dentro = (
    <>
      <Punto estado={leccion.completada ? "hecha" : actual ? "actual" : "pendiente"} />
      <span className="min-w-0 flex-1">
        <span
          className={`block text-pretty text-[13px] leading-[1.35] ${
            actual
              ? "font-semibold text-marca-tinta"
              : leccion.completada
                ? "text-marca-gris"
                : leccion.disponible
                  ? "text-marca-grisSuave"
                  : "text-marca-grisTenue"
          }`}
        >
          {leccion.titulo}
        </span>
        <span className="mt-1.5 flex items-center justify-between gap-2">
          <span className={`text-[11.5px] tabular-nums ${actual ? "text-marca-gris" : "text-marca-grisTenue"}`}>
            {pie}
          </span>
          <span
            className={`shrink-0 rounded-full px-2 py-[2px] text-[10.5px] font-semibold uppercase tracking-[0.06em] ${
              actual ? "bg-drc-chip-verde text-marca-verdeOsc" : "bg-marca-niebla text-marca-grisSuave"
            }`}
          >
            {etiqueta}
          </span>
        </span>
      </span>
    </>
  );

  const clase = `flex items-start gap-2.5 rounded-[10px] border px-2.5 py-2.5 text-left transition-colors ${
    actual ? "border-marca-verde bg-marca-verdeFondo" : "border-transparent"
  }`;

  // Una lección de un módulo por abrir no es un enlace: la pantalla la
  // rechazaría. Se enseña, apagada, y ya está.
  if (!leccion.disponible) {
    return <div className={`${clase} cursor-default`}>{dentro}</div>;
  }

  return (
    <Link
      href={conFoco(`/curso/${cursoSlug}/${leccion.id}`, foco)}
      onClick={alElegir}
      aria-current={actual ? "page" : undefined}
      className={`${clase} ${actual ? "" : "hover:bg-marca-niebla"}`}
    >
      {dentro}
    </Link>
  );
}

/**
 * Los ejercicios de una lección, en el subacordeón de «Ejercicios».
 *
 * La lección actual se abre en sus ejercicios mientras se están
 * haciendo: por cuál va y cuáles lleva. Antes de empezarlos, pulsarla
 * los abre; las demás llevan a su lección.
 */
function FilaEjercicios({
  leccion,
  cuenta,
  actual,
  vivo,
  cursoSlug,
  foco,
  alAbrir,
  alElegir,
  t,
}: {
  leccion: LeccionIndice;
  cuenta: EjerciciosDeLeccion;
  actual: boolean;
  vivo: EstadoEjerciciosActual | null;
  cursoSlug: string;
  foco: string | null;
  alAbrir: (() => void) | null;
  alElegir?: () => void;
  t: Textos;
}) {
  const hecho = cuenta.hechos >= cuenta.total;
  const clase = `flex w-full items-start gap-2.5 rounded-[10px] px-2.5 py-2.5 text-left transition-colors ${
    actual ? "" : "hover:bg-marca-niebla"
  }`;

  const dentro = (
    <>
      <Punto estado={hecho ? "hecha" : actual ? "actual" : "pendiente"} />
      <span
        className={`min-w-0 flex-1 text-pretty text-[13px] leading-[1.35] ${
          actual ? "font-semibold text-marca-tinta" : hecho ? "text-marca-gris" : "text-marca-grisSuave"
        }`}
      >
        {leccion.titulo}
      </span>
      <span
        className={`shrink-0 text-[12px] font-semibold tabular-nums ${
          actual ? "text-marca-verdeOsc" : hecho ? "text-marca-gris" : "text-marca-grisTenue"
        }`}
      >
        {cuenta.hechos}/{cuenta.total}
      </span>
    </>
  );

  const cabecera = alAbrir ? (
    <button type="button" onClick={alAbrir} className={clase}>
      {dentro}
    </button>
  ) : actual ? (
    <div className={clase}>{dentro}</div>
  ) : (
    <Link
      href={conFoco(`/curso/${cursoSlug}/${leccion.id}`, foco)}
      onClick={alElegir}
      className={clase}
    >
      {dentro}
    </Link>
  );

  if (!actual) return cabecera;

  return (
    <div className="rounded-[10px] border border-marca-verde bg-marca-verdeFondo pb-1.5">
      {cabecera}
      {vivo && (
        <ol className="flex flex-col gap-px pl-6 pr-1.5">
          {Array.from({ length: cuenta.total }, (_, n) => {
            const es = n === vivo.indice;
            const respondido = vivo.respondidos[n] === true;
            const bien = vivo.acertados[n] === true;
            return (
              <li
                key={n}
                aria-current={es ? "step" : undefined}
                className={`flex items-center gap-2.5 rounded-[8px] px-2.5 py-[7px] ${
                  es ? "bg-white" : ""
                }`}
              >
                <span
                  className={`w-[22px] text-[11px] font-semibold tracking-[0.08em] tabular-nums ${
                    es ? "text-marca-verde" : respondido ? "text-marca-gris" : "text-marca-grisTenue"
                  }`}
                >
                  {String(n + 1).padStart(2, "0")}
                </span>
                <span
                  className={`flex-1 text-[13px] ${
                    es
                      ? "font-semibold text-marca-tinta"
                      : respondido
                        ? "text-marca-gris"
                        : "text-marca-grisSuave"
                  }`}
                >
                  {t.ejercicioNumero(n + 1)}
                </span>
                {respondido && (
                  <span
                    aria-hidden
                    className={`grid h-4 w-4 place-items-center rounded-full text-[9px] font-semibold text-white ${
                      bien ? "bg-marca-verde" : "bg-marca-calido"
                    }`}
                  >
                    {bien ? <Marca /> : "—"}
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

function Punto({ estado }: { estado: "hecha" | "actual" | "pendiente" }) {
  if (estado === "hecha") {
    return (
      <span
        aria-hidden
        className="mt-[2px] grid h-4 w-4 shrink-0 place-items-center rounded-full bg-marca-verde"
      >
        <Marca />
      </span>
    );
  }
  return (
    <span
      aria-hidden
      className={`mt-[2px] h-4 w-4 shrink-0 rounded-full border-[1.5px] ${
        estado === "actual" ? "border-marca-verde" : "border-marca-puntoPendiente"
      }`}
    />
  );
}

function Marca() {
  return (
    <svg aria-hidden viewBox="0 0 10 10" className="h-[9px] w-[9px]" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 5.2 4.1 7.3 8 3" />
    </svg>
  );
}

function Chevron({ abierto }: { abierto: boolean }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 16 16"
      className={`h-4 w-4 shrink-0 text-marca-grisSuave transition-transform duration-[var(--dur-estado)] ${
        abierto ? "rotate-180" : ""
      }`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m4 6 4 4 4-4" />
    </svg>
  );
}
