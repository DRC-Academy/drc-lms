"use client";

import { useCallback, useRef, useState } from "react";
import type { MesTemario, Temario as DatosTemario } from "@/lib/temario";
import PanelPlan from "@/components/curso/PanelPlan";
import FilaModulo from "@/components/curso/FilaModulo";

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
}: {
  temario: DatosTemario;
  slug: string;
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
      <PanelPlan temario={temario} slug={slug} onIrAlMes={irAlMes} />

      {/* ---------------------------- BARRA DE SECCIÓN ---------------------------- */}
      <div className="mt-[22px] flex items-center justify-between gap-5 min-[900px]:mt-[34px]">
        <h2 className="text-[11px] font-extrabold uppercase leading-none tracking-[0.16em] text-temario-suave min-[900px]:text-[12px]">
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
  abierto,
  ultimo,
  onAlternar,
  refCallback,
}: {
  mes: MesTemario;
  slug: string;
  abierto: boolean;
  ultimo: boolean;
  onAlternar: (numero: number) => void;
  refCallback: (nodo: HTMLDivElement | null) => void;
}) {
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

            <span className="mt-[5px] block text-[11.5px] font-medium text-temario-medio tabular-nums min-[900px]:hidden">
              {mes.totalModulos} {mes.totalModulos === 1 ? "módulo" : "módulos"} · {mes.totalLecciones}{" "}
              {mes.totalLecciones === 1 ? "lección" : "lecciones"}
            </span>
          </span>

          <span className="hidden whitespace-nowrap text-[13px] font-medium text-temario-medio tabular-nums min-[900px]:block">
            {mes.totalModulos} {mes.totalModulos === 1 ? "módulo" : "módulos"} · {mes.totalLecciones}{" "}
            {mes.totalLecciones === 1 ? "lección" : "lecciones"}
          </span>

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

          <span
            aria-hidden
            className="shrink-0 text-[10px] text-temario-enlace min-[900px]:flex min-[900px]:h-[30px] min-[900px]:w-[30px] min-[900px]:items-center min-[900px]:justify-center min-[900px]:rounded-full min-[900px]:border min-[900px]:border-temario-linea"
          >
            {abierto ? "▲" : "▼"}
          </span>
        </button>

        {/* ----------------------------- SEMANAS ----------------------------- */}
        {abierto && (
          <div className="px-1 pb-2.5 pt-1.5 min-[900px]:pl-2.5 min-[900px]:pr-0">
            {mes.semanas.map((semana) => (
              <div key={semana.numero} className="pt-3.5 min-[900px]:pt-4">
                <div className="mb-2 flex items-center gap-3">
                  <span className="text-[10.5px] font-extrabold uppercase leading-none tracking-[0.16em] text-temario-suave">
                    Semana {semana.numero}
                  </span>
                  <span aria-hidden className="h-px flex-1 bg-temario-borde" />
                  <span className="text-[11.5px] font-medium text-temario-medio tabular-nums">
                    {semana.modulos.length} {semana.modulos.length === 1 ? "módulo" : "módulos"} ·{" "}
                    {semana.totalLecciones} {semana.totalLecciones === 1 ? "lección" : "lecciones"}
                  </span>
                </div>

                <ul className="flex flex-col gap-1.5">
                  {semana.modulos.map((modulo) => (
                    <FilaModulo key={modulo.id} modulo={modulo} slug={slug} />
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
