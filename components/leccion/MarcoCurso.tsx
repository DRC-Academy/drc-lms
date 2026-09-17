"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useSelectedLayoutSegment } from "next/navigation";

/**
 * EL MARCO DEL CURSO: UNA CABECERA PARA EL TEMARIO, UNA BARRA PARA LA LECCIÓN.
 *
 * Las dos pantallas cuelgan del mismo layout —`app/curso/[slug]`— y
 * hasta ahora las dos llevaban la misma cabecera. La lección ya no: se
 * lee con una barra de iconos a la izquierda y sin barra arriba, que es
 * lo que deja el ancho entero para el panel del curso y el texto.
 *
 * POR QUÉ SE DECIDE AQUÍ Y NO EN CADA PÁGINA. El layout es lo que no se
 * desmonta al saltar de lección a lección; si la barra la pintara la
 * página, desaparecería y volvería a aparecer con cada cambio, que es
 * exactamente el parpadeo que se arregló llevando la cabecera al layout.
 * El layout no sabe qué página tiene debajo, pero este componente sí:
 * `useSelectedLayoutSegment` devuelve el segmento hijo activo —null en
 * el temario, el id de la lección dentro de una— y con eso elige.
 *
 * LAS DOS SE RENDERIZAN EN EL SERVIDOR y aquí solo se enseña una. Es
 * barato —son dos barras— y evita que este componente tenga que pedir
 * datos: le llegan hechas.
 *
 * EL PANEL DEL CURSO VIVE EN LA PÁGINA, no aquí, porque cambia con la
 * lección. Pero quien lo abre por debajo de 1200px es un icono de la
 * barra, que vive aquí: el contexto de abajo es el hilo entre los dos.
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

export default function MarcoCurso({
  cabecera,
  barra,
  tiraRevision,
  navegacionMovil,
  children,
}: {
  /** La cabecera de siempre, para el temario. */
  cabecera: ReactNode;
  /** La barra de iconos, para la lección. */
  barra: ReactNode;
  /** «Estás revisando la ficha de…», que en la lección no tiene cabecera donde ir. */
  tiraRevision?: ReactNode;
  /** La navegación de abajo en móvil, que en la lección no la pone la cabecera. */
  navegacionMovil: ReactNode;
  children: ReactNode;
}) {
  const segmento = useSelectedLayoutSegment();

  if (segmento === null) {
    return (
      <>
        {cabecera}
        {children}
      </>
    );
  }

  return (
    <MarcoBarra barra={barra} tiraRevision={tiraRevision} navegacionMovil={navegacionMovil} clave={segmento}>
      {children}
    </MarcoBarra>
  );
}

/**
 * EL MARCO CON BARRA, suelto: la barra de iconos a la izquierda, la
 * navegación de abajo en móvil, y entre las dos lo que se lee.
 *
 * Es el que `MarcoCurso` enseña dentro de una lección, y lo usa tal cual
 * la página del bloque de práctica (`app/alumno/[id]/[bloqueId]`), que
 * no cuelga de ningún layout con segmentos que mirar: allí se pinta
 * directamente, con la misma barra y el mismo contexto del panel. Una
 * sola pieza para las dos pantallas es lo que hace que un bloque se vea
 * como una lección sin que nadie copie nada.
 */
export function MarcoBarra({
  barra,
  tiraRevision,
  navegacionMovil,
  clave,
  children,
}: {
  barra: ReactNode;
  tiraRevision?: ReactNode;
  navegacionMovil: ReactNode;
  /** Cambia con la pantalla —la lección, el bloque— y al cambiar cierra el panel. */
  clave: string;
  children: ReactNode;
}) {
  const [panelAbierto, setPanelAbierto] = useState(false);

  // Al cambiar de lección el panel se cierra: la elección ya se ha hecho.
  useEffect(() => {
    setPanelAbierto(false);
  }, [clave]);

  return (
    <ContextoMarco.Provider
      value={{
        panelAbierto,
        abrirPanel: () => setPanelAbierto(true),
        cerrarPanel: () => setPanelAbierto(false),
      }}
    >
      {tiraRevision}
      <div className="flex flex-1 items-stretch">
        {barra}
        <div className="flex min-w-0 flex-1 flex-col">{children}</div>
      </div>
      {navegacionMovil}
    </ContextoMarco.Provider>
  );
}
