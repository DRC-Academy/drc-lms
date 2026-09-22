"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";

/**
 * EL HILO ENTRE EL PANEL DE LA PANTALLA Y EL ICONO QUE LO ABRE.
 *
 * El panel lateral —el del curso en una lección, el de las fases en un
 * bloque— vive en la página, porque cambia con ella. Pero entre 768 y
 * 1200px no cabe al lado del texto y lo abre un icono de la barra de
 * navegación, que vive en el layout común (`components/Navegacion.tsx`).
 * Este contexto es lo que los une: lo pone el marco de la aplicación y
 * lo leen los dos.
 *
 * Antes lo ponían el layout del curso y la página del bloque, cada uno
 * con su propia barra. Desde que la barra es la de toda la aplicación,
 * el contexto sube con ella.
 */

type Marco = {
  panelAbierto: boolean;
  abrirPanel: () => void;
  cerrarPanel: () => void;
};

const ContextoMarco = createContext<Marco>({
  panelAbierto: false,
  abrirPanel: () => {},
  cerrarPanel: () => {},
});

export function usarMarco(): Marco {
  return useContext(ContextoMarco);
}

export function ProveedorMarco({ children }: { children: ReactNode }) {
  const [panelAbierto, setPanelAbierto] = useState(false);
  const ruta = usePathname();

  // Al cambiar de pantalla —otra lección, otro bloque— el panel se
  // cierra: la elección ya se ha hecho.
  useEffect(() => {
    setPanelAbierto(false);
  }, [ruta]);

  return (
    <ContextoMarco.Provider
      value={{
        panelAbierto,
        abrirPanel: () => setPanelAbierto(true),
        cerrarPanel: () => setPanelAbierto(false),
      }}
    >
      {children}
    </ContextoMarco.Provider>
  );
}
