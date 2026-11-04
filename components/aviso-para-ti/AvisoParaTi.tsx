"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import HojaInferior from "@/components/base/HojaInferior";
import { usarIdioma } from "@/components/ProveedorIdioma";
import { CLAVE_VISITA, hayOtraCosaDelante } from "@/components/valoraciones/PopupValoracion";
import { SUCESO_LANZAR_TUTORIAL } from "@/components/tutorial/eventos";
import { cerrarAvisoParaTi } from "@/app/acciones-aviso-para-ti";

// ---------------------------------------------------------------
// «AÚN NO HAS PROBADO LA SECCIÓN PARA TI»
//
// Lo monta `PopupAlEntrar` cuando el servidor ha visto que el alumno
// nunca ha generado un bloque y ya puede (`lib/aviso-para-ti-servidor.ts`).
// Aquí solo se decide CUÁNDO abrirlo, con las mismas reglas que el de
// valorar la clase, y compartiendo con él la marca de la visita: en una
// visita sale uno de los dos como mucho.
//
// Cerrarlo —X, Escape o el fondo— apunta un cierre; con 3 deja de salir.
// «Probar Para ti» no es un cierre: lleva a «Para ti» con `?empezar=1`,
// y allí `PanelPractica` lanza la generación.
//
// `vistaPrevia`: el equipo revisando una ficha lo ve como el alumno, en
// cada carga, y cerrarlo no apunta nada.
// ---------------------------------------------------------------

const ESPERA_MS = 2500;

export default function AvisoParaTi({ href, vistaPrevia = false }: { href: string; vistaPrevia?: boolean }) {
  const t = usarIdioma().t.avisoParaTi;
  const [abierta, setAbierta] = useState(false);

  useEffect(() => {
    let yaSalio = false;
    try {
      yaSalio = sessionStorage.getItem(CLAVE_VISITA) !== null;
    } catch {
      // Sin almacenamiento, como mucho sale otra vez en la próxima carga.
    }
    if (!vistaPrevia && yaSalio) return;

    let retirado = false;
    const retirarse = () => {
      retirado = true;
    };
    window.addEventListener(SUCESO_LANZAR_TUTORIAL, retirarse);
    const reloj = setTimeout(() => {
      if (retirado || hayOtraCosaDelante()) return;
      if (!vistaPrevia) {
        try {
          sessionStorage.setItem(CLAVE_VISITA, "1");
        } catch {
          // Igual que arriba.
        }
      }
      setAbierta(true);
    }, ESPERA_MS);
    return () => {
      clearTimeout(reloj);
      window.removeEventListener(SUCESO_LANZAR_TUTORIAL, retirarse);
    };
  }, [vistaPrevia]);

  const alCerrar = useCallback(() => {
    setAbierta(false);
    if (!vistaPrevia) void cerrarAvisoParaTi().catch(() => {});
  }, [vistaPrevia]);

  return (
    <HojaInferior abierta={abierta} alCerrar={alCerrar} etiqueta={t.titulo} etiquetaCerrar={t.cerrar} centrada>
      {/* La franja con el sendero: la primera parada hecha, dos por delante. */}
      <div className="relative bg-[#F4F7F4] px-4 pb-3 pt-9">
        <button
          type="button"
          onClick={alCerrar}
          aria-label={t.cerrar}
          className="absolute right-2 top-2 grid h-11 w-11 place-items-center rounded-full text-[#12211A] transition-colors hover:bg-[#E2E8E4] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#14722A]"
        >
          <svg aria-hidden viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M5 5l10 10M15 5L5 15" />
          </svg>
        </button>
        <Sendero empiezaAqui={t.empiezaAqui} />
      </div>

      <div className="px-5 pb-6 pt-5">
        <h2 className="font-display text-[24px] font-bold leading-[1.15] text-[#12211A]">{t.titulo}</h2>
        <p className="mt-3 text-[16px] leading-[1.5] text-[#3B4A42]">{t.texto}</p>
        <Link
          prefetch={false}
          href={href}
          data-autofocus
          onClick={() => setAbierta(false)}
          className="mt-6 flex h-[52px] w-full items-center justify-center rounded-[12px] bg-[#1E9E3A] px-5 text-[18px] font-semibold text-white transition-colors hover:bg-[#14722A] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#14722A]"
        >
          {t.boton}
        </Link>
      </div>
    </HojaInferior>
  );
}

/** El dibujo: camino discontinuo, tres paradas y la chapa junto a la primera. */
function Sendero({ empiezaAqui }: { empiezaAqui: string }) {
  return (
    <div aria-hidden className="relative mx-auto w-full max-w-[320px]" style={{ aspectRatio: "320 / 100" }}>
      <svg viewBox="0 0 320 100" className="absolute inset-0 h-full w-full" fill="none">
        <path
          d="M36 72 C 84 34, 124 34, 164 56 S 246 88, 288 36"
          stroke="#C4DECF"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray="2 10"
        />
        <circle cx="36" cy="72" r="15" fill="#1E9E3A" />
        <path d="M29.5 72.5l4.5 4.5 8-8.5" stroke="#FFFFFF" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="164" cy="56" r="11" fill="#FFFFFF" stroke="#E2E8E4" strokeWidth="3" />
        <circle cx="288" cy="36" r="11" fill="#FFFFFF" stroke="#E2E8E4" strokeWidth="3" />
      </svg>
      <span
        className="absolute -translate-y-1/2 whitespace-nowrap rounded-full bg-[#FFC400] px-2.5 py-1 text-[12.5px] font-bold leading-none text-[#12211A]"
        style={{ left: "17%", top: "72%" }}
      >
        {empiezaAqui}
      </span>
    </div>
  );
}
