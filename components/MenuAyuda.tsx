"use client";

import { useEffect, useRef, type KeyboardEvent as KeyboardEventReact, type RefObject } from "react";
import { usarIdioma } from "@/components/ProveedorIdioma";

/**
 * EL MENÚ DEL BOTÓN DE AYUDA: «Tutorial» y «Chat».
 *
 * Sale encima del botón verde flotante (`ChatAyuda`), que es la única
 * entrada a la ayuda en todas las anchuras.
 *
 * NO HACE NADA POR SU CUENTA. Quien lo monta dice qué pasa con cada
 * opción: el tutorial es `lanzarTutorial("manual")`, que empieza en el
 * paso 1 y no toca «visto»; el chat, el `abrir()` de siempre.
 *
 * TECLADO. Al abrir, el foco va a la primera opción. Flechas, Inicio y
 * Fin se mueven entre las dos; el Tab también, y al salir del menú con él
 * se cierra sin robar el foco. Esc cierra y devuelve el foco al botón,
 * igual que pulsar fuera o pulsar el botón otra vez.
 */
export default function MenuAyuda({
  id,
  disparador,
  onCerrar,
  onTutorial,
  onChat,
}: {
  /** Para el `aria-controls` del botón. */
  id?: string;
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
      id={id}
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
      className="menu-ayuda absolute bottom-full right-0 z-50 mb-3 flex flex-col"
    >
      <Opcion titulo={ta.opcionTutorial} detalle={ta.opcionTutorialDetalle} onClick={onTutorial} icono={<IconoTutorial />} />
      <span aria-hidden className="menu-ayuda-separador" />
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
      className="menu-ayuda-opcion flex w-full items-center gap-3 text-left"
    >
      <span aria-hidden className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[rgba(30,158,58,0.10)] text-[#1E9E3A]">
        {icono}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-display text-[14px] font-semibold leading-tight text-[#12211A]">{titulo}</span>
        <span className="mt-0.5 block text-[12px] leading-[1.4] text-[#5B6B62]">{detalle}</span>
      </span>
      <svg aria-hidden viewBox="0 0 16 16" className="h-4 w-4 shrink-0 text-[#9AA8A0]" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="m6 3.5 4.5 4.5L6 12.5" />
      </svg>
    </button>
  );
}

/** Una brújula: el recorrido que enseña dónde está cada cosa. */
function IconoTutorial() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="m15.5 8.5-2 5-5 2 2-5 5-2Z" />
    </svg>
  );
}

/** Dos bocadillos: la conversación con la ayuda. */
function IconoChat() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4h9A1.5 1.5 0 0 1 16 5.5v6a1.5 1.5 0 0 1-1.5 1.5H9l-3.5 3v-3h0A1.5 1.5 0 0 1 4 11.5v-6Z" />
      <path d="M19 9h.5A1.5 1.5 0 0 1 21 10.5v6a1.5 1.5 0 0 1-1.5 1.5H19v2.5L15.5 18H12a1.5 1.5 0 0 1-1.5-1.5V16" />
    </svg>
  );
}
