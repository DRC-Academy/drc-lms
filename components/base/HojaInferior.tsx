"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";

// ---------------------------------------------------------------
// LA HOJA QUE SUBE DESDE ABAJO
//
// La del perfil en móvil (`MenuPerfil`), sacada aquí para que la usen
// también los flujos de «Mis clases». Lo que la hace ser lo que es:
//
//   · EN EL BODY, por portal. La barra de navegación es `fixed` con su
//     propio `z-index`, y una hoja dentro de ella nunca podría pasar por
//     encima del botón flotante de la ayuda.
//   · EL FONDO CIERRA: es un botón, con su etiqueta para el lector.
//   · COMO MUCHO EL 90 % DE LA PANTALLA, con scroll dentro: en un móvil
//     bajo no tiene por qué caber.
//   · EL HUECO DE ABAJO respeta la zona segura del iPhone.
//   · ESCAPE TAMBIÉN CIERRA.
//   · ES MODAL DE VERDAD: `aria-modal`, el foco entra en la hoja al
//     abrirse (en lo que lleve `data-autofocus`, o en lo primero que se
//     pueda pulsar), el tabulador no sale de ella y, al cerrarse, el foco
//     vuelve a lo que lo tenía antes (el botón que la abrió, casi
//     siempre). Sin esto, quien navega con teclado seguía tabulando por
//     la página de detrás del velo.
//
// `soloMovil`: a partir de 900 px no se pinta (el perfil tiene allí su
// globo). Sin él, en escritorio la hoja se queda centrada como un
// cuadro, del ancho de una columna: subir medio metro desde abajo en
// una pantalla grande no tiene sentido.
// ---------------------------------------------------------------

export default function HojaInferior({
  abierta,
  alCerrar,
  etiqueta,
  etiquetaCerrar,
  id,
  soloMovil = false,
  children,
}: {
  abierta: boolean;
  alCerrar: () => void;
  /** El nombre del diálogo, para el lector de pantalla. */
  etiqueta: string;
  /** La del fondo que cierra. */
  etiquetaCerrar: string;
  id?: string;
  soloMovil?: boolean;
  children: ReactNode;
}) {
  const hoja = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!abierta) return;
    function alPulsarTecla(evento: KeyboardEvent) {
      if (evento.key === "Escape") alCerrar();
      if (evento.key === "Tab" && hoja.current) atraparTab(evento, hoja.current);
    }
    document.addEventListener("keydown", alPulsarTecla);
    return () => document.removeEventListener("keydown", alPulsarTecla);
  }, [abierta, alCerrar]);

  // El foco: dentro al abrir, de vuelta al cerrar. Va aparte del efecto
  // de las teclas para que un `alCerrar` nuevo no lo vuelva a mover.
  useEffect(() => {
    if (!abierta) return;
    const antes = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const nodo = hoja.current;
    if (nodo && !nodo.contains(document.activeElement)) {
      const elegido = nodo.querySelector<HTMLElement>("[data-autofocus]");
      (elegido ?? enfocables(nodo)[0] ?? nodo).focus({ preventScroll: true });
    }
    return () => {
      if (antes && antes.isConnected) antes.focus({ preventScroll: true });
    };
  }, [abierta]);

  if (!abierta) return null;

  return createPortal(
    <div
      className={`fixed inset-0 z-[60] flex flex-col justify-end ${
        soloMovil ? "min-[900px]:hidden" : "min-[900px]:items-center min-[900px]:justify-center min-[900px]:bg-[rgba(18,33,26,.42)] min-[900px]:p-6"
      }`}
    >
      <button
        type="button"
        aria-label={etiquetaCerrar}
        onClick={alCerrar}
        className={`flex-1 bg-[rgba(18,33,26,.42)] ${soloMovil ? "" : "min-[900px]:absolute min-[900px]:inset-0 min-[900px]:bg-transparent"}`}
      />
      <div
        ref={hoja}
        id={id}
        role="dialog"
        aria-modal="true"
        aria-label={etiqueta}
        tabIndex={-1}
        className={`aparece max-h-[90dvh] outline-none overflow-y-auto rounded-t-[20px] bg-white px-5 pt-4 ${
          soloMovil ? "" : "min-[900px]:relative min-[900px]:w-full min-[900px]:max-w-[520px] min-[900px]:rounded-[20px] min-[900px]:px-7 min-[900px]:pt-6"
        }`}
        style={{ paddingBottom: "calc(32px + env(safe-area-inset-bottom))" }}
      >
        <span aria-hidden className={`mx-auto mb-4 block h-1 w-9 rounded-full bg-marca-bordeSuave ${soloMovil ? "" : "min-[900px]:hidden"}`} />
        {children}
      </div>
    </div>,
    document.body
  );
}

const ENFOCABLE =
  'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

function enfocables(raiz: HTMLElement): HTMLElement[] {
  return Array.from(raiz.querySelectorAll<HTMLElement>(ENFOCABLE)).filter((el) => el.getClientRects().length > 0);
}

/** Del último al primero y del primero al último: el tabulador da la vuelta dentro de la hoja. */
function atraparTab(evento: KeyboardEvent, raiz: HTMLElement) {
  const lista = enfocables(raiz);
  if (lista.length === 0) {
    evento.preventDefault();
    raiz.focus();
    return;
  }
  const primero = lista[0];
  const ultimo = lista[lista.length - 1];
  const activo = document.activeElement;
  if (evento.shiftKey && (activo === primero || !raiz.contains(activo))) {
    evento.preventDefault();
    ultimo.focus();
  } else if (!evento.shiftKey && (activo === ultimo || !raiz.contains(activo))) {
    evento.preventDefault();
    primero.focus();
  }
}
