"use client";

import { useCallback, useRef, useState, type ReactNode } from "react";
import type { MesTemario, ModuloTemario, Temario as DatosTemario } from "@/lib/temario";
import PanelPlan from "@/components/curso/PanelPlan";
import LineaProgreso from "@/components/curso/LineaProgreso";
import FilaModulo from "@/components/curso/FilaModulo";
import { textoDeEspera } from "@/lib/drip";

/**
 * El temario mes a mes.
 *
 * Lo único que vive en el cliente es qué meses están abiertos y el
 * desplazamiento hasta uno. Todo lo demás —la agrupación, los
 * contadores, el módulo actual— llega ya resuelto desde el servidor en
 * `lib/temario.ts`: aquí no se calcula ni un porcentaje.
 *
 * Arranca con un solo mes abierto, el del módulo actual, porque abrir
 * seis a la vez devuelve la lista de 47 que veníamos a quitar.
 */
export default function Temario({
  temario,
  slug,
  foco = null,
  diploma,
}: {
  temario: DatosTemario;
  slug: string;
  /**
   * El contexto de revisión que conservan los enlaces a cada módulo, o
   * null cuando es el alumno en su curso. Viaja pegado a `slug` porque
   * los dos existen para lo mismo: construir el href de una lección.
   * Ver `lib/foco.ts`.
   */
  foco?: string | null;
  /**
   * El banner del diploma, renderizado en el servidor. Entra por prop y
   * no se importa aquí para que siga siendo servidor: este componente es
   * cliente solo por qué meses están abiertos.
   */
  diploma: ReactNode;
}) {
  const inicial = temario.actual?.mes ?? temario.meses[0]?.numero;

  const [abiertos, setAbiertos] = useState<Record<number, boolean>>(
    inicial === undefined ? {} : { [inicial]: true }
  );

  const refs = useRef<Record<number, HTMLDivElement | null>>({});

  const alternarMes = useCallback((numero: number) => {
    setAbiertos((previo) => ({ ...previo, [numero]: !previo[numero] }));
  }, []);

  /**
   * Desde la rejilla de puntos: abre —nunca cierra— y baja hasta el mes.
   *
   * El desplazamiento espera un fotograma: si se lanza en el mismo
   * render en que el mes se abre, mide la posición de antes y se queda
   * corto justo por lo que acaba de desplegarse.
   */
  const irAlMes = useCallback((numero: number) => {
    setAbiertos((previo) => ({ ...previo, [numero]: true }));

    window.requestAnimationFrame(() => {
      const nodo = refs.current[numero];
      if (!nodo) return;
      const top = nodo.getBoundingClientRect().top + window.scrollY - 20;
      window.scrollTo({ top, behavior: "smooth" });
    });
  }, []);

  const abrirTodos = useCallback(() => {
    setAbiertos(Object.fromEntries(temario.meses.map((mes) => [mes.numero, true])));
  }, [temario.meses]);

  const cerrarTodos = useCallback(() => setAbiertos({}), []);

  if (temario.meses.length === 0) {
    return (
      <p className="mt-9 text-[16px] leading-[1.6] text-temario-medio">
        Este curso todavía no tiene contenido cargado.
      </p>
    );
  }

  return (
    <>
      <PanelPlan temario={temario} slug={slug} foco={foco} />

      {/* EL RECORRIDO Y LA META, en ese orden y las dos fuera de la
          franja. La línea dice dónde estás en los seis meses; el diploma,
          cuánto falta para el final. Ninguna repite la cifra de la otra
          ni la de la franja. */}
      <LineaProgreso
        meses={temario.meses}
        actual={temario.actual?.mes ?? null}
        onIrAlMes={irAlMes}
      />

      <div className="mt-3">{diploma}</div>

      {/* ---------------------------- BARRA DE SECCIÓN ---------------------------- */}
      <div className="mt-[22px] flex items-center justify-between gap-5 min-[900px]:mt-[34px]">
        {/* EN TINTA Y NO EN GRIS. Es el único título que queda en la
            pantalla desde que se fue la cabecera del curso, así que ya no
            es un rótulo de sección entre otros: es el que dice qué es
            todo lo que viene debajo. */}
        <h2 className="text-[11px] font-extrabold uppercase leading-none tracking-[0.16em] text-temario-tinta min-[900px]:text-[12px]">
          Programa mes a mes
        </h2>
        <div className="hidden items-center gap-2 min-[900px]:flex">
          {[
            { texto: "Expandir todo", accion: abrirTodos },
            { texto: "Contraer todo", accion: cerrarTodos },
          ].map(({ texto, accion }) => (
            <button
              key={texto}
              type="button"
              onClick={accion}
              className="rounded-full border border-temario-linea bg-white px-[13px] py-1.5 text-[12.5px] font-semibold text-temario-enlace transition-colors hover:border-temario-pillHover hover:text-temario-verdeTexto"
            >
              {texto}
            </button>
          ))}
        </div>
      </div>

      {/* ------------------------------- TIMELINE ------------------------------- */}
      <div className="mt-2.5 flex flex-col gap-2 min-[900px]:mt-4 min-[900px]:block min-[900px]:gap-0">
        {temario.meses.map((mes, i) => (
          <Mes
            key={mes.numero}
            mes={mes}
            slug={slug}
            foco={foco}
            abierto={!!abiertos[mes.numero]}
            ultimo={i === temario.meses.length - 1}
            onAlternar={alternarMes}
            refCallback={(nodo) => {
              refs.current[mes.numero] = nodo;
            }}
          />
        ))}
      </div>
    </>
  );
}

/**
 * Un mes: el canal con su círculo y la línea, más la cabecera desplegable.
 *
 * En escritorio el círculo va en un canal de 58px a la izquierda y una
 * línea vertical lo une con el siguiente mes, que es lo que convierte
 * seis tarjetas sueltas en un recorrido. En móvil no hay sitio para ese
 * canal, así que el círculo se mete dentro de la cabecera.
 */
function Mes({
  mes,
  slug,
  foco,
  abierto,
  ultimo,
  onAlternar,
  refCallback,
}: {
  mes: MesTemario;
  slug: string;
  foco: string | null;
  abierto: boolean;
  ultimo: boolean;
  onAlternar: (numero: number) => void;
  refCallback: (nodo: HTMLDivElement | null) => void;
}) {
  // Lo que el alumno ya cerró sale de la lista y se recoge en un solo
  // desplegable, en el orden del curso. Ver `Completados`.
  const hechos = mes.semanas.flatMap((semana) => semana.modulos).filter((modulo) => modulo.hecho);

  const circulo =
    mes.estado === "completado"
      ? "bg-temario-verde text-white"
      : mes.estado === "en-curso"
        ? "bg-temario-oscuro text-white"
        : "border border-temario-circulo bg-white text-temario-suave min-[900px]:bg-white";

  return (
    <div
      ref={refCallback}
      className="scroll-mt-5 min-[900px]:grid min-[900px]:grid-cols-[58px_1fr] min-[900px]:items-stretch"
    >
      {/* Canal del timeline: solo escritorio. */}
      <div className="hidden pt-1 min-[900px]:flex min-[900px]:flex-col min-[900px]:items-center">
        <span
          className={`flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full text-[13px] font-extrabold ${circulo}`}
        >
          {mes.estado === "completado" ? "✓" : mes.numero}
        </span>
        {!ultimo && <span aria-hidden className="mt-1.5 w-0.5 flex-1 bg-temario-linea" />}
      </div>

      <div className="min-[900px]:pb-3.5 min-[900px]:pl-1">
        {/* ---------------------------- CABECERA ---------------------------- */}
        <button
          type="button"
          onClick={() => onAlternar(mes.numero)}
          aria-expanded={abierto}
          className="flex min-h-[44px] w-full items-center gap-3 rounded-[16px] border border-temario-borde bg-white px-4 py-[15px] text-left transition-colors hover:border-temario-bordeHover min-[900px]:gap-6 min-[900px]:px-[22px] min-[900px]:py-[18px]"
        >
          {/* En móvil el círculo vive aquí dentro. */}
          <span
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[13px] font-extrabold min-[900px]:hidden ${
              mes.estado === "pendiente" ? "bg-temario-mesPendiente text-temario-suave" : circulo
            }`}
          >
            {mes.estado === "completado" ? "✓" : mes.numero}
          </span>

          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-2.5">
              <span className="text-[10px] font-extrabold uppercase leading-none tracking-[0.14em] text-temario-suave min-[900px]:text-[10.5px] min-[900px]:tracking-[0.16em]">
                Mes {mes.numero}
              </span>
              <span aria-hidden className="hidden text-[11px] text-temario-puntoSuave min-[900px]:inline">
                ·
              </span>
              <span className="hidden text-[11.5px] font-semibold text-temario-suave min-[900px]:inline">
                {mes.semanas.length > 0
                  ? `Semanas ${mes.semanas[0].numero} – ${mes.semanas[mes.semanas.length - 1].numero}`
                  : "Sin semanas"}
              </span>
            </span>

            <span className="mt-[3px] block text-pretty text-[14.5px] font-bold leading-[1.25] min-[900px]:mt-[5px] min-[900px]:text-[19px] min-[900px]:tracking-[-0.015em]">
              {mes.titulo}
            </span>

            {/* Un mes entero por abrir se dice aquí, para no obligar a
                desplegarlo solo para descubrir que no toca todavía. */}
            {/* Un mes ya completado no necesita saber cuándo se abre:
                el alumno lo hizo antes de que le tocara, y la nota se
                lee como una contradicción. */}
            {mes.diasParaAbrir !== null && mes.estado !== "completado" && (
              <span className="mt-[5px] block text-[11.5px] font-semibold text-temario-suave min-[900px]:mt-1.5 min-[900px]:text-[12px]">
                {textoDeEspera(mes.diasParaAbrir)}
              </span>
            )}
          </span>

          {/* SIN «8 MÓDULOS · 32 LECCIONES». Estaba aquí y otra vez
              debajo del título en móvil, y decía el tamaño de lo que hay
              —no lo que el alumno lleva—, que es lo que cuenta la barra
              de al lado en la única unidad que importa: lecciones. */}

          <span className="hidden w-[132px] shrink-0 min-[900px]:block">
            <span
              className="block h-[5px] overflow-hidden rounded-full bg-temario-rail"
              role="progressbar"
              aria-valuenow={mes.porcentaje}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Progreso del mes ${mes.numero}`}
            >
              <span className="block h-full rounded-full bg-temario-verde" style={{ width: `${mes.porcentaje}%` }} />
            </span>
            <span className="mt-[7px] block text-[11.5px] font-semibold text-temario-suave tabular-nums">
              {mes.completadas} de {mes.totalLecciones} lecciones
            </span>
          </span>

          {/* LA FLECHA GIRA, NO SE CAMBIA POR OTRA. Antes se sustituía el
              glifo —▼ por ▲— y eso es un corte: dos caracteres distintos
              en el mismo sitio. Girando el mismo triángulo, abrir y
              cerrar es un solo objeto que se mueve, y de paso la
              dirección del giro dice hacia dónde va. */}
          <span
            aria-hidden
            style={{ transform: abierto ? "rotate(180deg)" : undefined }}
            className="shrink-0 text-[10px] text-temario-enlace transition-transform duration-[220ms] ease-[var(--ease-salida)] min-[900px]:flex min-[900px]:h-[30px] min-[900px]:w-[30px] min-[900px]:items-center min-[900px]:justify-center min-[900px]:rounded-full min-[900px]:border min-[900px]:border-temario-linea"
          >
            ▼
          </span>
        </button>

        {/* ----------------------------- SEMANAS -----------------------------

            SE ANIMA AL ABRIR Y NO AL CERRAR, a propósito. El contenido
            sigue entrando y saliendo del DOM —con `grid-template-rows`
            se podría animar en los dos sentidos, pero eso deja los
            enlaces del mes cerrado dentro del documento y tabulables,
            que es peor que un cierre seco.

            Y la asimetría es la correcta de todos modos: al abrir el
            alumno está esperando algo y el movimiento lo acompaña; al
            cerrar ya ha decidido, y hacerle esperar la animación de
            salida es cobrarle su propia decisión. */}
        {abierto && (
          <div className="entra px-1 pb-2.5 pt-1.5 min-[900px]:pl-2.5 min-[900px]:pr-0">
            {hechos.length > 0 && <Completados modulos={hechos} slug={slug} foco={foco} />}

            {mes.semanas.map((semana) => {
              // Una semana entera hecha no deja cabecera vacía: sus
              // módulos están arriba, en el desplegable.
              const pendientes = semana.modulos.filter((modulo) => !modulo.hecho);
              if (pendientes.length === 0) return null;

              return (
                <div key={semana.numero} className="pt-3.5 min-[900px]:pt-4">
                  <div className="mb-2 flex items-center gap-3">
                    <span className="text-[10.5px] font-extrabold uppercase leading-none tracking-[0.16em] text-temario-suave">
                      Semana {semana.numero}
                    </span>
                    <span aria-hidden className="h-px flex-1 bg-temario-borde" />
                  </div>

                  <ul className="flex flex-col gap-1.5">
                    {pendientes.map((modulo) => (
                      <FilaModulo key={modulo.id} modulo={modulo} slug={slug} foco={foco} />
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * LO YA HECHO, RECOGIDO EN UNA LÍNEA.
 *
 * Un mes por la mitad enseñaba ocho filas, y cuatro de ellas eran
 * trabajo terminado: ocupaban el mismo alto, el mismo blanco y el mismo
 * borde que lo que queda por hacer, así que había que leerlas para
 * descartarlas. En los meses cerrados eran las ocho.
 *
 * Ahora se cuentan en una sola línea gris y se abren si el alumno
 * quiere. Repasar un módulo sigue estando a un clic —el desplegable no
 * los borra, y dentro cada fila lleva su enlace— pero deja de ser lo
 * primero que se ve al abrir un mes.
 *
 * VA ARRIBA Y NO ABAJO. Son los módulos más antiguos del mes; al
 * abrirlo, la lista vuelve a leerse en el orden del curso, que es el
 * orden en el que está escrito el temario.
 *
 * CADA MES TIENE EL SUYO Y EMPIEZA CERRADO. El estado vive aquí dentro y
 * no en `Temario`: no hace falta recordarlo ni compartirlo, y cerrar el
 * mes y volver a abrirlo devuelve la vista limpia, que es lo que se
 * espera de algo que se ha recogido a propósito.
 */
function Completados({
  modulos,
  slug,
  foco,
}: {
  modulos: ModuloTemario[];
  slug: string;
  foco: string | null;
}) {
  const [abierto, setAbierto] = useState(false);

  return (
    <div className="pt-3.5 min-[900px]:pt-4">
      <button
        type="button"
        onClick={() => setAbierto((previo) => !previo)}
        aria-expanded={abierto}
        className="flex min-h-[40px] w-full items-center gap-3 rounded-[12px] border border-temario-borde bg-temario-rail/60 px-4 py-2 text-left transition-colors hover:border-temario-bordeHover min-[900px]:gap-4 min-[900px]:px-[18px]"
      >
        <span
          aria-hidden
          className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-temario-circulo text-[10px] font-extrabold text-white"
        >
          ✓
        </span>

        <span className="flex-1 text-[12.5px] font-semibold text-temario-suave min-[900px]:text-[13px]">
          {modulos.length}{" "}
          {modulos.length === 1 ? "módulo completado" : "módulos completados"}
        </span>

        <span aria-hidden className="shrink-0 text-[10px] text-temario-suave">
          {abierto ? "▲" : "▼"}
        </span>
      </button>

      {abierto && (
        <ul className="mt-1.5 flex flex-col gap-1.5">
          {modulos.map((modulo) => (
            <FilaModulo key={modulo.id} modulo={modulo} slug={slug} foco={foco} />
          ))}
        </ul>
      )}
    </div>
  );
}
