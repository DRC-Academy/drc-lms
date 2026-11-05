// ---------------------------------------------------------------
// LA NAVEGACIÓN DE TODA LA APLICACIÓN
//
// En escritorio, la barra de iconos a la izquierda que nació en la
// lección (`BarraLateral`); por debajo de 900px, la barra de pestañas de
// abajo (`NavegacionInferior`) con los mismos iconos. Sustituye a la
// cabecera de arriba, que ya no existe.
//
// DÓNDE SE MONTA. La rejilla, la barra y lo que solo depende de la sesión
// (la ayuda, el recorrido), en el layout de `(alumno)`. Los datos del
// alumno llegan con cada página: ver `components/marco/` y `lib/marco.ts`.
// Ninguna pantalla se acuerda de ponerla y ninguna la pierde.
//
// LO QUE ESTABA EN LA CABECERA, Y DÓNDE HA IDO:
//
//   · el logotipo → el símbolo de arriba de la barra, que lleva al inicio;
//   · las cinco secciones → la barra, y las pestañas en móvil;
//   · el idioma → arriba a la derecha de cada pantalla, siempre a la
//     vista (`CabeceraIdioma`); dentro del perfil se encontraba mal;
//   · el nombre y «Salir» → el perfil: el avatar al pie de la barra, y
//     la última pestaña en móvil (`MenuPerfil`);
//   · la ayuda → el icono de la barra; en móvil, el botón flotante;
//   · «Revisando la ficha de…» → la tira de revisión, encima de todo.
//
// LA SECCIÓN ACTIVA LA DICE LA RUTA, en el cliente (`seccionDeRuta`): un
// layout no se vuelve a renderizar al pasar de una página a otra.
// ---------------------------------------------------------------

import type { ReactNode } from "react";
import ChatAyuda from "@/components/ChatAyuda";
import CabeceraIdioma from "@/components/CabeceraIdioma";
import ContenidoApp from "@/components/ContenidoApp";
import { conFoco } from "@/lib/foco";
import { ProveedorMarco } from "@/components/leccion/MarcoCurso";
import { PiezasDelMarco, type DatosNavegacion } from "@/components/marco/PiezasDelMarco";
import Tutorial from "@/components/tutorial/Tutorial";

export type { SeccionActiva, EnlaceSeccion } from "@/components/IconoSeccion";
export type { DatosNavegacion } from "@/components/marco/PiezasDelMarco";

/**
 * La rejilla del marco: arriba la tira, a la izquierda la barra, y la
 * pantalla en el resto. `piezas` son las de `PiezasDelMarco`; `children`,
 * la página. Las pestañas de abajo son `fixed` y no ocupan celda.
 */
export function MarcoFijo({ piezas, children }: { piezas: ReactNode; children: ReactNode }) {
  return (
    <div className="grid min-h-dvh flex-1 grid-cols-[auto_minmax(0,1fr)] grid-rows-[auto_1fr]">
      {piezas}
      {/* El fondo de la columna lo decide la ruta (`ContenidoApp`). */}
      <ContenidoApp>
        <CabeceraIdioma />
        {children}
      </ContenidoApp>
    </div>
  );
}

/**
 * Lo que depende solo de la SESIÓN y tiene que sobrevivir a la
 * navegación: la ayuda y el recorrido guiado. Estos sí van en un layout,
 * porque la cookie no cambia entre páginas —cambiar de identidad es
 * siempre una carga completa (`/entrar`, `/salir`)—.
 */
export function PiezasDeLaSesion({ nombre, inicioHref }: { nombre: string; inicioHref: string | null }) {
  return (
    <>
      {/* La ayuda, abajo a la derecha, en todas las anchuras. */}
      <ChatAyuda nombre={nombre} />
      {/* El recorrido guiado: solo el alumno lo hace. */}
      {inicioHref && <Tutorial rutas={{ inicio: inicioHref, clases: "/clases", practica: "/practica" }} />}
    </>
  );
}

/**
 * El marco entero, en una pieza, para las pantallas que no cuelgan de
 * `(alumno)`: el buscador del equipo (`app/page.tsx`).
 */
export default function MarcoApp({ datos, children }: { datos: DatosNavegacion; children: ReactNode }) {
  const inicioHref = datos.alumnoId ? conFoco(`/alumno/${datos.alumnoId}`, datos.foco) : "/";
  return (
    <ProveedorMarco>
      <MarcoFijo piezas={<PiezasDelMarco datos={datos} />}>{children}</MarcoFijo>
      {datos.alumnoId && <PiezasDeLaSesion nombre={datos.nombre.trim()} inicioHref={datos.revisando ? null : inicioHref} />}
    </ProveedorMarco>
  );
}
