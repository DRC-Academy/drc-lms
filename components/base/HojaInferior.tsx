"use client";

import { useEffect, type ReactNode } from "react";
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
  useEffect(() => {
    if (!abierta) return;
    function alPulsarTecla(evento: KeyboardEvent) {
      if (evento.key === "Escape") alCerrar();
    }
    document.addEventListener("keydown", alPulsarTecla);
    return () => document.removeEventListener("keydown", alPulsarTecla);
  }, [abierta, alCerrar]);

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
        id={id}
        role="dialog"
        aria-label={etiqueta}
        className={`aparece max-h-[90dvh] overflow-y-auto rounded-t-[20px] bg-white px-5 pt-4 ${
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
