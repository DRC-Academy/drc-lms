"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { DatosNavegacion } from "@/components/marco/PiezasDelMarco";

/**
 * EL HILO ENTRE LA PÁGINA Y LA BARRA.
 *
 * La barra vive en el layout y la página debajo; cada página manda los
 * datos del marco en su propia respuesta (`MarcoDeLaPagina`) y aquí se
 * dejan para que la barra los lea.
 *
 * ES UN CONTEXTO Y NO UN MÓDULO CON UNA VARIABLE, a propósito. Este código
 * también corre en el servidor al pintar el HTML, y una variable de módulo
 * sería compartida entre las peticiones de alumnos distintos. Un contexto
 * vive en el árbol de cada render, y además solo se escribe en un efecto,
 * que en el servidor no se ejecuta.
 */
type Contexto = {
  publicados: DatosNavegacion | null;
  publicar: (datos: DatosNavegacion) => void;
};

const ContextoDatos = createContext<Contexto>({ publicados: null, publicar: () => {} });

export function ProveedorDatosMarco({ children }: { children: ReactNode }) {
  const [publicados, publicar] = useState<DatosNavegacion | null>(null);
  const valor = useMemo(() => ({ publicados, publicar }), [publicados]);
  return <ContextoDatos.Provider value={valor}>{children}</ContextoDatos.Provider>;
}

export function usarDatosPublicados(): DatosNavegacion | null {
  return useContext(ContextoDatos).publicados;
}

/** Lo monta la página: al llegar sus datos, se los pasa a la barra. No pinta nada. */
export function PublicarMarco({ datos }: { datos: DatosNavegacion }) {
  const { publicar } = useContext(ContextoDatos);
  useEffect(() => {
    publicar(datos);
  }, [datos, publicar]);
  return null;
}
