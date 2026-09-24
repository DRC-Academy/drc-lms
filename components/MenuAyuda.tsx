"use client";

import { useEffect, useRef, type KeyboardEvent as KeyboardEventReact, type RefObject } from "react";
import { usarIdioma } from "@/components/ProveedorIdioma";

/**
 * EL MENÚ DEL BOTÓN DE AYUDA: «Tutorial» y «Chat».
 *
 * Lo abren dos botones, uno por anchura, y nunca los dos a la vez: el
 * flotante de móvil (`ChatAyuda`) y el icono de la barra lateral de
 * escritorio (`BarraLateral`). Cada uno pone su estado y su sitio; el
 * menú es el mismo.
 *
 * NO HACE NADA POR SU CUENTA. Quien lo monta dice qué pasa con cada
 * opción: el tutorial es siempre `lanzarTutorial("manual")`, que empieza
 * en el paso 1 y no toca «visto»; el chat, el mecanismo que ya tuviera
 * ese botón —`abrir()` dentro del chat, `abrirAyuda()` desde fuera—.
 *
 * TECLADO. Al abrir, el foco va a la primera opción. Flechas, Inicio y
 * Fin se mueven entre las dos; el Tab también, y al salir del menú con él
 * se cierra sin robar el foco. Esc cierra y devuelve el foco al botón,
 * igual que pulsar fuera o pulsar el botón otra vez.
 */
export default function MenuAyuda({
  lado,
  disparador,
  onCerrar,
  onTutorial,
  onChat,
}: {
  /** Encima del botón (el flotante) o a su derecha (la barra lateral). */
  lado: "arriba" | "derecha";
  /** El botón que lo abre: pulsarlo no cuenta como «fuera». */
  disparador: RefObject<HTMLElement>;
  /** `devolverFoco`: false cuando el foco ya se ha ido a otro sitio. */
  onCerrar: (devolverFoco: boolean) => void;
  onTutorial: () => void;
  onChat: () => void;
}) {
  const { t } = usarIdioma();
  const ta = t.ayuda;
  const menu = useRef<HTMLDivElement>(null);

  // El foco a la primera opción al abrir.
  useEffect(() => {
    menu.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
  }, []);

  // Esc y pulsar fuera, con el foco donde esté.
  useEffect(() => {
    function alPulsarTecla(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        onCerrar(true);
      }
    }
    function alPulsarFuera(e: PointerEvent) {
      const objetivo = e.target as Node;
      if (menu.current?.contains(objetivo) || disparador.current?.contains(objetivo)) return;
      onCerrar(true);
    }
    document.addEventListener("keydown", alPulsarTecla);
    document.addEventListener("pointerdown", alPulsarFuera);
    return () => {
      document.removeEventListener("keydown", alPulsarTecla);
      document.removeEventListener("pointerdown", alPulsarFuera);
    };
  }, [onCerrar, disparador]);

  function alMoverse(e: KeyboardEventReact<HTMLDivElement>) {
    const opciones = Array.from(menu.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);
    const i = opciones.indexOf(document.activeElement as HTMLElement);
    let destino: number | null = null;
    if (e.key === "ArrowDown") destino = (i + 1) % opciones.length;
    else if (e.key === "ArrowUp") destino = (i - 1 + opciones.length) % opciones.length;
    else if (e.key === "Home") destino = 0;
    else if (e.key === "End") destino = opciones.length - 1;
    if (destino === null) return;
    e.preventDefault();
    opciones[destino]?.focus();
  }

  return (
    <div
      ref={menu}
      role="menu"
      aria-label={ta.menuAyuda}
      onKeyDown={alMoverse}
      // Salir con Tab cierra, también cuando no queda nada detrás y el foco
      // cae al documento (`relatedTarget` null). Volver al botón no
      // cuenta: ese lo cierra él.
      onBlur={(e) => {
        const siguiente = e.relatedTarget as Node | null;
        if (menu.current?.contains(siguiente) || disparador.current?.contains(siguiente)) return;
        onCerrar(false);
      }}
      className={`menu-ayuda absolute z-50 flex w-[min(300px,calc(100vw-32px))] flex-col gap-1.5 rounded-[16px] border border-marca-borde bg-white p-2 shadow-[0_18px_44px_-16px_rgba(18,33,26,0.35)] ${
        lado === "arriba" ? "bottom-full right-0 mb-3 origin-bottom-right" : "bottom-0 left-full ml-3 origin-bottom-left"
      }`}
    >
      <Opcion titulo={ta.opcionTutorial} detalle={ta.opcionTutorialDetalle} onClick={onTutorial} icono={<IconoTutorial />} />
      <Opcion titulo={ta.opcionChat} detalle={ta.opcionChatDetalle} onClick={onChat} icono={<IconoChat />} />
    </div>
  );
}

function Opcion({
  titulo,
  detalle,
  icono,
  onClick,
}: {
  titulo: string;
  detalle: string;
  icono: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className="flex min-h-[64px] w-full items-center gap-3 rounded-[12px] bg-marca-verde px-4 py-2.5 text-left text-white transition-colors hover:bg-marca-verdeOsc focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marca-verde"
    >
      <span aria-hidden className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/15">
        {icono}
      </span>
      <span className="min-w-0">
        <span className="block text-[17px] font-bold leading-tight">{titulo}</span>
        <span className="mt-0.5 block text-[14px] leading-snug text-white/90">{detalle}</span>
      </span>
    </button>
  );
}

/** Una brújula: el recorrido que enseña dónde está cada cosa. */
function IconoTutorial() {
  return (
    <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="m15.5 8.5-2 5-5 2 2-5 5-2Z" />
    </svg>
  );
}

/** Dos bocadillos: la conversación con la ayuda. */
function IconoChat() {
  return (
    <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4h9A1.5 1.5 0 0 1 16 5.5v6a1.5 1.5 0 0 1-1.5 1.5H9l-3.5 3v-3h0A1.5 1.5 0 0 1 4 11.5v-6Z" />
      <path d="M19 9h.5A1.5 1.5 0 0 1 21 10.5v6a1.5 1.5 0 0 1-1.5 1.5H19v2.5L15.5 18H12a1.5 1.5 0 0 1-1.5-1.5V16" />
    </svg>
  );
}
