"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usarIdioma } from "@/components/ProveedorIdioma";
import { PERFIL_WOO } from "@/lib/cuenta-woo";
import ComoVas from "@/components/estadisticas/ComoVas";
import type { EstadisticasAlumno } from "@/lib/estadisticas";

/**
 * El perfil: quién es, su cuenta en la web y por dónde sale. El idioma
 * ya no está aquí: va siempre a la vista, arriba a la derecha
 * (`CabeceraIdioma`).
 *
 * LA CUENTA ES DE LA WEB. Suscripción, pagos, facturas y datos viven en
 * Mi cuenta de drcacademy.com: aquí solo hay un enlace (`PERFIL_WOO`), en
 * la misma pestaña. Es navegación, no una acción: sin verde de relleno.
 *
 * Desde que no hay cabecera, esas tres cosas van detrás del avatar en
 * toda la aplicación: al pie de la barra de iconos en escritorio y como
 * última pestaña de la navegación en móvil. Lo que se abre es lo mismo en los dos sitios; lo que cambia es
 * de dónde sale —un globo junto al avatar, o una hoja desde abajo—.
 *
 * SIN NOMBRE TAMBIÉN EXISTE. El equipo que repasa un curso sin ficha no
 * tiene alumno del que hablar, pero sí salida.
 */
export default function MenuPerfil({
  nombre,
  variante,
  estadisticas = null,
}: {
  nombre: string;
  /** `barra`: el avatar de la barra de iconos. `movil`: la pestaña de abajo. */
  variante: "barra" | "movil";
  /**
   * «Cómo vas», solo en la hoja de móvil: ahí no hay barra lateral que
   * lo enseñe al abrirse. En escritorio lo pinta la barra.
   */
  estadisticas?: EstadisticasAlumno | null;
}) {
  const { t } = usarIdioma();
  const [abierto, setAbierto] = useState(false);
  const raiz = useRef<HTMLDivElement>(null);
  const idPanel = useId();

  const inicial = nombre.trim()[0]?.toUpperCase() ?? "";

  // Se cierra con Escape y pulsando fuera, como cualquier menú.
  useEffect(() => {
    if (!abierto) return;

    function alPulsarTecla(evento: KeyboardEvent) {
      if (evento.key === "Escape") setAbierto(false);
    }
    // La hoja de móvil vive fuera de `raiz` —va por portal— y ya tiene
    // su propio fondo que cierra: ahí no hay "fuera" que vigilar.
    function alPulsarFuera(evento: MouseEvent) {
      if (variante === "movil") return;
      if (raiz.current && !raiz.current.contains(evento.target as Node)) setAbierto(false);
    }

    document.addEventListener("keydown", alPulsarTecla);
    document.addEventListener("mousedown", alPulsarFuera);
    return () => {
      document.removeEventListener("keydown", alPulsarTecla);
      document.removeEventListener("mousedown", alPulsarFuera);
    };
  }, [abierto, variante]);

  const contenido = (
    <>
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-marca-tinta text-[14px] font-semibold text-white"
        >
          {inicial}
        </span>
        <div className="min-w-0">
          <p className="truncate text-[14.5px] font-semibold text-marca-tinta">
            {nombre.trim() || t.navegacion.perfil}
          </p>
        </div>
      </div>

      <div className="mt-3 border-t border-marca-nieblaOscura pt-2">
        <EnlacePerfilWeb />
      </div>

      <div className="mt-2 flex items-center justify-end gap-3 border-t border-marca-nieblaOscura pt-4">
        <form action="/salir" method="post">
          <button
            type="submit"
            className="rounded-full border border-marca-borde px-4 py-[7px] text-[13.5px] font-medium text-marca-tinta transition-colors hover:bg-marca-niebla"
          >
            {t.navegacion.salir}
          </button>
        </form>
      </div>
    </>
  );

  if (variante === "movil") {
    return (
      <div ref={raiz} className="contents">
        <button
          type="button"
          onClick={() => setAbierto((v) => !v)}
          aria-expanded={abierto}
          aria-controls={idPanel}
          className={`flex min-h-[44px] flex-col items-center justify-center gap-[5px] rounded-[10px] text-[12px] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-marca-verdeOsc ${
            abierto ? "font-semibold text-marca-tinta" : "font-medium text-marca-gris"
          }`}
        >
          <IconoPerfil activo={abierto} />
          <span className="max-w-full truncate">{t.navegacion.perfil}</span>
        </button>

        {/* EN EL BODY, no dentro de la barra: la barra es `fixed` con su
            propio `z-index`, y una hoja dentro de ella nunca podría pasar
            por encima del botón flotante de la ayuda. */}
        {abierto &&
          createPortal(
            <div className="fixed inset-0 z-[60] flex flex-col justify-end min-[900px]:hidden">
              <button
                type="button"
                aria-label={t.navegacion.cerrarElMenu}
                onClick={() => setAbierto(false)}
                className="flex-1 bg-[rgba(18,33,26,.42)]"
              />
              <div
                id={idPanel}
                role="dialog"
                aria-label={t.navegacion.perfil}
                // Con «Cómo vas» encima puede no caber en un móvil bajo: la
                // hoja se queda en el 90 % de la pantalla y hace scroll.
                className="aparece max-h-[90dvh] overflow-y-auto rounded-t-[20px] bg-white px-5 pt-4"
                style={{ paddingBottom: "calc(32px + env(safe-area-inset-bottom))" }}
              >
                <span aria-hidden className="mx-auto mb-4 block h-1 w-9 rounded-full bg-marca-bordeSuave" />
                {estadisticas && (
                  <div className="mb-5">
                    <ComoVas estadisticas={estadisticas} variante="movil" />
                  </div>
                )}
                {contenido}
              </div>
            </div>,
            document.body
          )}
      </div>
    );
  }

  return (
    <div ref={raiz} className="relative">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        aria-controls={idPanel}
        aria-label={nombre.trim() ? t.navegacion.practicandoComo(nombre.trim()) : t.navegacion.perfil}
        className="group relative grid h-11 w-11 place-items-center rounded-[12px] transition-colors hover:bg-marca-niebla focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marca-verdeOsc"
      >
        <span
          aria-hidden
          className="grid h-8 w-8 place-items-center rounded-full bg-marca-tinta text-[13px] font-semibold text-white"
        >
          {inicial || <IconoPerfil activo={false} claro />}
        </span>
        <Globo>{nombre.trim() || t.navegacion.perfil}</Globo>
      </button>

      {abierto && (
        <div
          id={idPanel}
          role="dialog"
          aria-label={t.navegacion.perfil}
          // `data-menu-perfil`: mientras está abierto, la barra esconde
          // «Cómo vas», que quedaba a medias detrás (`globals.css`).
          data-menu-perfil
          className="aparece absolute bottom-0 left-full z-50 ml-3 w-[264px] rounded-[14px] border border-marca-borde bg-white p-4 shadow-[0_18px_44px_-16px_rgba(18,33,26,0.35)]"
        >
          {contenido}
        </div>
      )}
    </div>
  );
}

/**
 * «Perfil»: a la cuenta del alumno en la web. Toda la fila es el enlace,
 * de 44px o más; a la izquierda una persona y a la derecha la flecha de
 * «sale a otra web». `-mx-2` para que el fondo del hover llegue hasta
 * los bordes del menú sin mover el texto.
 */
function EnlacePerfilWeb() {
  const { t } = usarIdioma();
  const tp = t.navegacion.perfilWeb;
  return (
    <a
      href={PERFIL_WOO}
      className="-mx-2 flex min-h-[48px] items-center gap-3 rounded-[10px] px-2 py-1.5 text-marca-tintaMedia transition-colors hover:bg-marca-niebla focus-visible:bg-marca-niebla focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-marca-verdeOsc"
    >
      <IconoPersona />
      <span className="min-w-0 flex-1">
        <span className="block text-[14.5px] font-semibold leading-tight text-marca-tinta">{tp.titulo}</span>
        <span className="mt-0.5 block text-[12.5px] leading-snug text-marca-gris">{tp.apoyo}</span>
        <span className="sr-only"> {tp.enOtraWeb}</span>
      </span>
      <IconoOtraWeb />
    </a>
  );
}

function IconoPersona() {
  return (
    <svg aria-hidden viewBox="0 0 18 18" className="h-[18px] w-[18px] shrink-0" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="6.3" r="3" />
      <path d="M3.4 15.2c.6-2.9 2.9-4.4 5.6-4.4s5 1.5 5.6 4.4" />
    </svg>
  );
}

/** Una flecha que sale de una caja: el enlace lleva a otra web. */
function IconoOtraWeb() {
  return (
    <svg aria-hidden viewBox="0 0 16 16" className="h-[14px] w-[14px] shrink-0" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.5 2.5h4v4M13.5 2.5 7.5 8.5" />
      <path d="M12 9.5v3a1 1 0 0 1-1 1H3.5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h3" />
    </svg>
  );
}

/**
 * El rótulo que sale al pasar por un icono de la barra. Solo texto y
 * solo mientras se apunta: la barra no lleva etiquetas para no ocupar
 * lo que es del texto de la lección.
 */
export function Globo({ children }: { children: React.ReactNode }) {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute left-full top-1/2 z-50 ml-3 -translate-y-1/2 whitespace-nowrap rounded-[8px] bg-marca-tinta px-2.5 py-1.5 text-[12.5px] font-medium text-white opacity-0 transition-opacity duration-[var(--dur-estado)] group-hover:opacity-100 group-focus-visible:opacity-100"
    >
      {children}
    </span>
  );
}

export function IconoPerfil({ activo, claro = false }: { activo: boolean; claro?: boolean }) {
  const trazo = claro ? "#FFFFFF" : activo ? "#1E9E3A" : "#B7C4BC";
  return (
    <svg
      aria-hidden
      viewBox="0 0 18 18"
      className="h-[18px] w-[18px]"
      fill="none"
      stroke={trazo}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="9" cy="6.3" r="3" fill={activo && !claro ? "#1E9E3A" : "none"} />
      <path d="M3.4 15.2c.6-2.9 2.9-4.4 5.6-4.4s5 1.5 5.6 4.4" />
    </svg>
  );
}
