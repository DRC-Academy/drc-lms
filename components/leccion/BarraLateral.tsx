"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icono, panelDeRuta, seccionDeRuta, type EnlaceSeccion } from "@/components/IconoSeccion";
import { abrirAyuda } from "@/components/ChatAyuda";
import { usarIdioma } from "@/components/ProveedorIdioma";
import MenuPerfil, { Globo } from "@/components/leccion/MenuPerfil";
import { usarMarco } from "@/components/leccion/MarcoCurso";

/**
 * La barra de iconos: la navegación de toda la aplicación en escritorio.
 *
 * Ochenta píxeles, fija a la izquierda, sin una sola palabra a la vista:
 * el símbolo arriba, las secciones debajo, y al pie la ayuda y el
 * perfil (idioma y salida). Los nombres salen al pasar por encima o al
 * llegar con el teclado. Nació en la lección y ahora la monta el marco
 * común (`components/Navegacion.tsx`) en todas las pantallas.
 *
 * SOLO A PARTIR DE 900px, el mismo corte que el resto de la aplicación:
 * con 768 convivía con la cabecera móvil de la lección, que cambia a
 * 900, y el panel se abría desde dos sitios. Por debajo, la navegación es la barra de
 * pestañas de abajo (`NavegacionInferior`), que es donde llega el pulgar.
 *
 * LA SECCIÓN ACTIVA LA DICE LA RUTA (`seccionDeRuta`): la barra vive en
 * un layout, que no se vuelve a renderizar al cambiar de página.
 *
 * EL ICONO DEL PANEL solo existe entre 900 y 1200px y en las pantallas
 * que tienen uno —la lección y el bloque—: ahí el panel no cabe al lado
 * del texto y se abre como un cajón desde aquí.
 */
export default function BarraLateral({
  enlaces,
  nombre,
  inicioHref,
}: {
  enlaces: EnlaceSeccion[];
  nombre: string;
  /** A dónde lleva el símbolo: el inicio del alumno, o el buscador del equipo. */
  inicioHref: string;
}) {
  const { t } = usarIdioma();
  const { abrirPanel } = usarMarco();
  const ruta = usePathname() ?? "/";
  const seccion = seccionDeRuta(ruta);
  const tipoPanel = panelDeRuta(ruta);
  const panel =
    tipoPanel === "curso"
      ? { rotulo: t.curso.lecciones, aria: t.curso.abrirElPanel }
      : tipoPanel === "practica"
        ? { rotulo: t.ejercicios.tuPractica, aria: t.ejercicios.abrirElPanel }
        : null;

  return (
    <aside
      aria-label={t.navegacion.secciones}
      // `z-30`: la barra es pegajosa y eso ya la convierte en contexto de
      // apilamiento; sin un z propio, el panel de al lado —que viene
      // después— pintaría por encima de los globos y del menú del perfil.
      className="sticky top-0 z-30 hidden h-dvh w-[80px] shrink-0 flex-col items-center border-r border-marca-borde bg-white pb-[18px] pt-[18px] min-[900px]:flex"
    >
      <Link
        href={inicioHref}
        aria-label={t.navegacion.inicio}
        className="mb-[22px] block rounded-lg transition-opacity hover:opacity-70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marca-verdeOsc"
      >
        <Image src="/simbolo-drc.png" alt="DRC Academy" width={40} height={40} priority className="h-10 w-10" />
      </Link>

      <nav data-tour="navegacion" className="flex flex-col gap-1.5">
        {enlaces.map((enlace) => {
          const activo = enlace.clave === seccion;
          return (
            <Link
              key={enlace.clave}
              href={enlace.href}
              aria-current={activo ? "page" : undefined}
              aria-label={enlace.texto}
              className={`group relative grid h-11 w-11 place-items-center rounded-[12px] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marca-verdeOsc ${
                activo ? "bg-drc-chip-verde" : "hover:bg-marca-niebla"
              }`}
            >
              <Icono seccion={enlace.clave} activo={activo} className="h-[22px] w-[22px]" />
              <Globo>{enlace.texto}</Globo>
            </Link>
          );
        })}

        {/* El cajón del panel, solo donde el panel no está a la vista.
            Con sección o sin ella: en el buscador del equipo no hay. */}
        {panel && (
          <button
            type="button"
            onClick={abrirPanel}
            aria-label={panel.aria}
            className="group relative grid h-11 w-11 place-items-center rounded-[12px] transition-colors hover:bg-marca-niebla focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marca-verdeOsc min-[1200px]:hidden"
          >
            <IconoLista />
            <Globo>{panel.rotulo}</Globo>
          </button>
        )}
      </nav>

      <div className="mt-auto flex flex-col items-center gap-2.5">
        <button
          type="button"
          onClick={abrirAyuda}
          aria-label={t.navegacion.ayuda}
          className="group relative grid h-11 w-11 place-items-center rounded-[12px] transition-colors hover:bg-marca-niebla focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marca-verdeOsc"
        >
          <IconoAyuda />
          <Globo>{t.navegacion.ayuda}</Globo>
        </button>

        <MenuPerfil nombre={nombre} variante="barra" />
      </div>
    </aside>
  );
}

/**
 * El hueco de la barra mientras el layout lee la sesión: el símbolo, que
 * no depende de nada, y sitio para lo demás.
 */
export function BarraLateralCargando() {
  return (
    <aside
      aria-hidden
      className="sticky top-0 hidden h-dvh w-[80px] shrink-0 flex-col items-center border-r border-marca-borde bg-white pb-[18px] pt-[18px] min-[900px]:flex"
    >
      <Image src="/simbolo-drc.png" alt="" width={40} height={40} priority className="mb-[22px] h-10 w-10" />
      <div className="flex flex-col gap-1.5">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className="h-11 w-11 rounded-[12px] bg-marca-niebla" />
        ))}
      </div>
    </aside>
  );
}

function IconoLista() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 18 18"
      className="h-[22px] w-[22px]"
      fill="none"
      stroke="#B7C4BC"
      strokeWidth="1.5"
      strokeLinecap="round"
    >
      <path d="M6.5 4.5h9M6.5 9h9M6.5 13.5h9" />
      <circle cx="3" cy="4.5" r="1" fill="#B7C4BC" stroke="none" />
      <circle cx="3" cy="9" r="1" fill="#B7C4BC" stroke="none" />
      <circle cx="3" cy="13.5" r="1" fill="#B7C4BC" stroke="none" />
    </svg>
  );
}

function IconoAyuda() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 18 18"
      className="h-[22px] w-[22px]"
      fill="none"
      stroke="#B7C4BC"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 4.5A1.5 1.5 0 0 1 4.5 3h9A1.5 1.5 0 0 1 15 4.5v6a1.5 1.5 0 0 1-1.5 1.5H7.2L4 14.6V12h-.5A1.5 1.5 0 0 1 3 10.5v-6Z" />
      <path d="M7.4 6.6a1.7 1.7 0 0 1 3.3.5c0 1.1-1.6 1.3-1.6 2.3" />
      <circle cx="9.1" cy="10.7" r="0.4" fill="#B7C4BC" stroke="none" />
    </svg>
  );
}
