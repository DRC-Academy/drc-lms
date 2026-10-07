"use client";

import type { ReactNode } from "react";
import { agruparHuecos, horaFin } from "@/lib/autoservicio/franjas";
import type { HuecoLibre } from "@/lib/autoservicio/tipos";
import type { TextosAutoservicio } from "@/lib/textos/autoservicio";

// ---------------------------------------------------------------
// LAS PIEZAS DE LOS DOS FLUJOS DE «MIS CLASES»
//
// Con las mismas clases que las recuperaciones (`TarjetaRecuperacion`):
// botones verdes de 48 px o más, avisos en caja suave, nada amarillo.
// ---------------------------------------------------------------

/** Una explicación dentro del flujo: el «ese hueco se acaba de ocupar», o por qué no se puede. */
export function Aviso({ children, tono = "neutro", role }: { children: ReactNode; tono?: "neutro" | "ok"; role?: "alert" | "status" }) {
  const colores = tono === "ok" ? "border-marca-verdePalido bg-marca-verdeFondo" : "border-marca-borde bg-marca-niebla";
  return (
    <div role={role} className={`rounded-[12px] border px-4 py-3 text-[15px] leading-[1.45] text-marca-tinta ${colores}`}>
      {children}
    </div>
  );
}

/** El globo de WhatsApp, en SVG para no traer una librería por un icono. */
function IconoWhatsApp() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="h-[18px] w-[18px] shrink-0" fill="currentColor">
      <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2c-1.6 0-3.1-.4-4.4-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.4.1-.6.3-.2.2-.8.8-.8 2s.8 2.3.9 2.5c.1.2 1.6 2.5 4 3.5 1.5.6 2.1.7 2.8.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3Z" />
    </svg>
  );
}

/** El botón a WhatsApp. `principal` cuando es lo único que se puede hacer. */
export function BotonWhatsApp({ href, texto, principal = false }: { href: string; texto: string; principal?: boolean }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`${
        principal ? "btn-verde" : "btn-verde-linea"
      } inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full px-6 text-[15.5px] font-bold min-[500px]:w-auto`}
    >
      <IconoWhatsApp />
      {texto}
    </a>
  );
}

/** «Volver», arriba del paso. */
export function Volver({ alPulsar, texto }: { alPulsar: () => void; texto: string }) {
  return (
    <button
      type="button"
      onClick={alPulsar}
      className="-ml-1 mb-2 inline-flex min-h-[44px] items-center gap-1 px-1 text-[15px] font-semibold text-marca-verdeOsc"
    >
      <svg aria-hidden viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 3 5 8l5 5" />
      </svg>
      {texto}
    </button>
  );
}

export function TituloPaso({ children }: { children: ReactNode }) {
  return <h2 className="font-display text-[20px] font-bold leading-tight text-marca-tinta">{children}</h2>;
}

/** Una opción grande con título y, si hace falta, una línea que la explica. */
export function Opcion({
  titulo,
  detalle,
  alPulsar,
  desactivada = false,
}: {
  titulo: string;
  detalle?: string;
  alPulsar?: () => void;
  desactivada?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={alPulsar}
      disabled={desactivada}
      className="flex min-h-[56px] w-full flex-col items-start justify-center rounded-[14px] border border-marca-borde bg-white px-4 py-3 text-left transition-colors hover:border-marca-verde disabled:cursor-default disabled:bg-marca-niebla disabled:hover:border-marca-borde"
    >
      <span className={`text-[16px] font-bold leading-snug ${desactivada ? "text-marca-gris" : "text-marca-tinta"}`}>{titulo}</span>
      {detalle && <span className="mt-0.5 text-[14px] leading-snug text-marca-gris">{detalle}</span>}
    </button>
  );
}

/**
 * Los huecos por día y franja (`agruparHuecos`). Cada hueco es un botón
 * con su tramo, «18:00–19:00», y lo que diga `extra` (el profesor, en el
 * cambio de profesor).
 */
export function ListaDeHuecos<H extends HuecoLibre>({
  huecos,
  t,
  alElegir,
  extra,
}: {
  huecos: H[];
  t: TextosAutoservicio;
  alElegir: (h: H) => void;
  extra?: (h: H) => string;
}) {
  const grupos = agruparHuecos(huecos);
  return (
    <div className="flex flex-col gap-5">
      {grupos.map((g) => (
        <section key={g.clave} aria-label={g.fecha ? t.diaConFecha(g.fecha) : t.diaSemanal(g.dia)}>
          <h3 className="text-[16px] font-bold text-marca-tinta">{g.fecha ? t.diaConFecha(g.fecha) : t.diaSemanal(g.dia)}</h3>
          {g.franjas.map((f) => (
            <div key={f.franja} className="mt-2">
              <p className="text-[13px] font-semibold uppercase tracking-[0.06em] text-marca-gris">{t.franja[f.franja]}</p>
              <ul className="mt-1.5 grid grid-cols-2 gap-2 min-[500px]:grid-cols-3">
                {f.huecos.map((h) => (
                  <li key={`${h.fecha ?? h.dia}-${h.hora}-${extra?.(h) ?? ""}`}>
                    <button
                      type="button"
                      onClick={() => alElegir(h)}
                      className="btn-verde-linea flex min-h-[48px] w-full flex-col items-center justify-center rounded-[12px] px-2 text-center leading-tight"
                    >
                      <span className="text-[15.5px] font-bold">
                        {h.hora}–{horaFin(h.hora, h.duracion)}
                      </span>
                      {extra && <span className="text-[13px] font-semibold">{extra(h)}</span>}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}

/** Una clave por intento de confirmación. `randomUUID` solo existe en https y localhost. */
export function nuevaClave(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}
