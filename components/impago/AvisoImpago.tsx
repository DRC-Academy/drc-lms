"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { usarIdioma } from "@/components/ProveedorIdioma";
import BotonIdioma from "@/components/BotonIdioma";
import { comprobarAcceso } from "@/app/acciones-acceso";
import { ENLACE_WHATSAPP } from "@/lib/soporte";

// ---------------------------------------------------------------
// EL AVISO DE PAGO PENDIENTE
//
// Lo monta el layout del alumno cuando `estadoDeAcceso` dice `impago`,
// y en ese caso es lo único que sale: ni valoración, ni recorrido, ni
// ayuda. La página de debajo va con `inert` desde el servidor (no se
// pulsa ni se tabula nada) y aquí además se corta el scroll.
//
// NO SE CIERRA: ni X, ni Escape, ni clic fuera. Sale de aquí cuando
// Gestión deja de tener al alumno en espera: «Ya lo he hecho» vuelve a
// preguntar y, si ya está, recarga.
//
// En el móvil es una hoja que sube desde abajo, con los botones a lo
// ancho y al alcance del pulgar; desde `sm`, una tarjeta centrada.
// ---------------------------------------------------------------

const MI_CUENTA = "https://drcacademy.com/mi-cuenta";

const ENFOCABLES = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

export default function AvisoImpago() {
  const { t: textos } = usarIdioma();
  const t = textos.impago;
  const dialogo = useRef<HTMLDivElement>(null);
  const principal = useRef<HTMLAnchorElement>(null);
  const [comprobando, setComprobando] = useState(false);
  const [sigue, setSigue] = useState(false);

  // Foco inicial en el botón principal, sin scroll lateral en el móvil.
  useEffect(() => {
    principal.current?.focus({ preventScroll: true });
  }, []);

  // Sin scroll de la página de debajo mientras esté el aviso.
  useEffect(() => {
    const html = document.documentElement;
    const antes = html.style.overflow;
    html.style.overflow = "hidden";
    return () => {
      html.style.overflow = antes;
    };
  }, []);

  // Si el foco se escapa (la mascota vive fuera del `inert`), vuelve.
  useEffect(() => {
    const alEnfocar = (e: FocusEvent) => {
      if (dialogo.current && e.target instanceof Node && !dialogo.current.contains(e.target)) {
        principal.current?.focus({ preventScroll: true });
      }
    };
    document.addEventListener("focusin", alEnfocar);
    return () => document.removeEventListener("focusin", alEnfocar);
  }, []);

  function alPulsarTecla(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Escape") {
      e.preventDefault();
      return;
    }
    if (e.key !== "Tab" || !dialogo.current) return;
    const enfocables = Array.from(dialogo.current.querySelectorAll<HTMLElement>(ENFOCABLES));
    if (enfocables.length === 0) return;
    const primero = enfocables[0];
    const ultimo = enfocables[enfocables.length - 1];
    if (e.shiftKey && document.activeElement === primero) {
      e.preventDefault();
      ultimo.focus();
    } else if (!e.shiftKey && document.activeElement === ultimo) {
      e.preventDefault();
      primero.focus();
    }
  }

  async function yaLoHice() {
    setComprobando(true);
    try {
      if ((await comprobarAcceso()) === "activo") {
        window.location.reload();
        return;
      }
    } catch {
      // Sin respuesta: lo mismo que si siguiera en espera, que lo intente luego.
    }
    setSigue(true);
    setComprobando(false);
  }

  return (
    <div className="aviso-impago-velo fixed inset-0 z-[100] flex items-end justify-center overflow-y-auto overscroll-contain sm:items-center sm:p-6">
      <div
        ref={dialogo}
        role="dialog"
        aria-modal="true"
        aria-labelledby="aviso-impago-titulo"
        aria-describedby="aviso-impago-texto"
        onKeyDown={alPulsarTecla}
        className="aviso-impago-tarjeta relative w-full rounded-t-[24px] border border-b-0 border-marca-borde bg-white px-5 pb-[max(20px,env(safe-area-inset-bottom))] pt-5 shadow-[0_-8px_32px_rgba(18,33,26,0.18)] sm:max-w-[440px] sm:rounded-[20px] sm:border-b sm:px-8 sm:pb-7 sm:pt-7 sm:shadow-[0_16px_48px_rgba(18,33,26,0.22)]"
      >
        {/* El asa de la hoja: solo en el móvil, donde es una hoja. */}
        <span aria-hidden className="mx-auto mb-4 block h-1 w-10 rounded-full bg-marca-pista sm:hidden" />

        <div className="flex items-start justify-between gap-4">
          <span
            aria-hidden
            className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-marca-verdeFondo text-marca-verdeOsc"
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2.5" y="5" width="19" height="14" rx="2.5" />
              <path d="M2.5 9.5h19" />
              <path d="M6.5 15h4" />
            </svg>
          </span>
          <BotonIdioma fondo="blanco" />
        </div>

        <h2
          id="aviso-impago-titulo"
          className="mt-5 font-display text-[24px] font-semibold leading-[1.15] tracking-[-0.01em] text-marca-tinta sm:text-[26px]"
        >
          {t.titulo}
        </h2>
        <p id="aviso-impago-texto" className="mt-3 text-[16px] leading-[1.55] text-marca-tintaMedia">
          {t.texto}
        </p>

        <div className="mt-7 flex flex-col gap-3">
          <a
            ref={principal}
            href={MI_CUENTA}
            className="inline-flex min-h-[52px] w-full items-center justify-center rounded-full bg-marca-verde px-6 text-[16px] font-semibold text-white transition-colors hover:bg-marca-verdeOsc focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marca-verdeOsc"
          >
            {t.boton}
          </a>
          <button
            type="button"
            onClick={yaLoHice}
            disabled={comprobando}
            aria-busy={comprobando}
            className="inline-flex min-h-[52px] w-full items-center justify-center rounded-full border border-marca-borde bg-white px-6 text-[16px] font-semibold text-marca-tinta transition-colors hover:bg-marca-niebla disabled:cursor-default disabled:text-marca-gris focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marca-verdeOsc"
          >
            {comprobando ? t.comprobando : t.secundario}
          </button>
        </div>

        <p role="status" aria-live="polite" className="min-h-0 text-center text-[14.5px] leading-[1.5] text-marca-gris">
          {sigue ? <span className="mt-4 block aparece">{t.avisoTrasComprobar}</span> : null}
        </p>

        <p className="mt-6 border-t border-marca-nieblaOscura pt-5 text-center text-[14.5px] leading-[1.5] text-marca-gris">
          {t.pieAyuda}{" "}
          <a
            href={ENLACE_WHATSAPP}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-marca-verdeOsc underline-offset-4 hover:underline focus-visible:rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marca-verdeOsc"
          >
            {t.pieWhatsapp}
          </a>
        </p>
      </div>
    </div>
  );
}
