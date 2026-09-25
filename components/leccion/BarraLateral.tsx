"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icono, panelDeRuta, seccionDeRuta, type EnlaceSeccion } from "@/components/IconoSeccion";
import { usarIdioma } from "@/components/ProveedorIdioma";
import MenuPerfil from "@/components/leccion/MenuPerfil";
import { usarMarco } from "@/components/leccion/MarcoCurso";
import AnilloCurso from "@/components/estadisticas/AnilloCurso";
import ComoVas, { celdasComoVas } from "@/components/estadisticas/ComoVas";
import type { EstadisticasAlumno } from "@/lib/estadisticas";

/**
 * La barra de iconos: la navegación de toda la aplicación en escritorio.
 *
 * Ochenta píxeles, fija a la izquierda, sin una sola palabra a la vista:
 * el símbolo arriba, el anillo del curso, las secciones debajo, y al pie
 * el perfil (idioma y salida).
 *
 * LA AYUDA NO ESTÁ AQUÍ: es el botón verde flotante de abajo a la
 * derecha (`ChatAyuda`), en todas las anchuras. Un icono gris de 22px en
 * la esquina izquierda se veía poco. Nació en la lección y ahora la monta el marco
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
 *
 * SE ABRE SOBRE EL CONTENIDO. Al pasar el ratón o al entrar con el
 * teclado se despliega a 272px POR ENCIMA de la pantalla —sin moverla—
 * con el nombre de cada sección y las estadísticas enteras. Sustituye a
 * los globos que salían al pasar por cada icono. Todo el comportamiento
 * está en CSS (`.barra-app` en `globals.css`); aquí solo se marca qué se
 * ve abierta (`.barra-rotulo`).
 *
 * LAS ESTADÍSTICAS LLEGAN HECHAS, por props desde el layout
 * (`lib/estadisticas-servidor.ts`). Esta barra no lee nada. Para el
 * lector de pantalla van siempre en texto (`sr-only`): lo que solo sale
 * abierta se oculta con `visibility`, que también lo oculta a él.
 */
export default function BarraLateral({
  enlaces,
  nombre,
  inicioHref,
  estadisticas = null,
}: {
  enlaces: EnlaceSeccion[];
  nombre: string;
  /** A dónde lleva el símbolo: el inicio del alumno, o el buscador del equipo. */
  inicioHref: string;
  /** Sin alumno —el equipo en su buscador— no hay. */
  estadisticas?: EstadisticasAlumno | null;
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
      // `barra-app` pone el z-index: 30 plegada y 45 abierta. La barra es
      // pegajosa y eso ya la convierte en contexto de apilamiento; sin un
      // z propio, el panel de al lado —que viene después— pintaría por
      // encima del menú del perfil.
      // En «Mi curso» no se abre (`barra-fija`): tapaba la lección.
      className={`barra-app sticky top-0 hidden h-dvh w-[80px] shrink-0 min-[900px]:block ${seccion === "curso" ? "barra-fija" : ""}`}
    >
      <div className="barra-panel absolute inset-y-0 left-0 flex flex-col border-r border-marca-borde bg-white pb-[18px] pt-[18px]">
        <Link
          href={inicioHref}
          aria-label={t.navegacion.inicio}
          className="mb-[18px] ml-5 block w-fit rounded-lg transition-opacity hover:opacity-70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marca-verdeOsc"
        >
          <Image src="/simbolo-drc.png" alt="DRC Academy" width={40} height={40} priority className="h-10 w-10" />
        </Link>

        {estadisticas?.curso && <AnilloDeLaBarra curso={estadisticas.curso} />}

        <nav data-tour="navegacion" className="flex flex-col gap-1.5 px-[18px]">
          {enlaces.map((enlace) => {
            const activo = enlace.clave === seccion;
            return (
              <Link
                key={enlace.clave}
                href={enlace.href}
                aria-current={activo ? "page" : undefined}
                aria-label={enlace.texto}
                // El recorrido guiado busca aquí el botón de cada sección.
                data-tour-nav={enlace.clave}
                className={`flex h-11 w-full items-center gap-3 overflow-hidden rounded-[12px] pl-[11px] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marca-verdeOsc ${
                  activo ? "bg-drc-chip-verde" : "hover:bg-marca-niebla"
                }`}
              >
                <Icono seccion={enlace.clave} activo={activo} className="h-[22px] w-[22px] shrink-0" />
                <span
                  aria-hidden
                  className={`barra-rotulo whitespace-nowrap text-[15px] ${activo ? "font-semibold text-marca-tinta" : "font-medium text-marca-gris"}`}
                >
                  {enlace.texto}
                </span>
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
              className="flex h-11 w-full items-center gap-3 overflow-hidden rounded-[12px] pl-[11px] transition-colors hover:bg-marca-niebla focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marca-verdeOsc min-[1200px]:hidden"
            >
              <IconoLista />
              <span aria-hidden className="barra-rotulo whitespace-nowrap text-[15px] font-medium text-marca-gris">
                {panel.rotulo}
              </span>
            </button>
          )}
        </nav>

        {estadisticas && <DetalleDeLaBarra estadisticas={estadisticas} />}

        <div className="mt-auto flex flex-col items-start gap-2.5 px-[18px]">
          <MenuPerfil nombre={nombre} variante="barra" />
        </div>
      </div>
    </aside>
  );
}

/**
 * El anillo del curso, debajo del símbolo. Plegada: el anillo y
 * «Curso». Abierta: al lado, cuántas lecciones y de qué curso.
 *
 * El texto de al lado es absoluto y de ancho fijo: mientras la barra se
 * abre no se recoloca, así que no salta nada.
 */
function AnilloDeLaBarra({ curso }: { curso: NonNullable<EstadisticasAlumno["curso"]> }) {
  const { t } = usarIdioma();
  const te = t.estadisticas;

  const vacio = curso.completadas === 0;
  const linea = vacio
    ? te.cursoVacioTitulo
    : curso.porcentaje === 100
      ? te.cursoCompleto
      : te.lecciones(curso.completadas, curso.total);
  const debajo = vacio ? te.cursoVacioTexto : curso.titulo;

  return (
    <div className="relative mb-[18px] px-[18px]">
      <p className="sr-only">
        {vacio
          ? `${curso.titulo}. ${te.cursoVacioTitulo}`
          : `${te.porcentajeDe(curso.porcentaje, curso.titulo)} · ${te.lecciones(curso.completadas, curso.total)}`}
      </p>
      <div aria-hidden className="flex w-11 flex-col items-center">
        <AnilloCurso porcentaje={curso.porcentaje} />
        <span className="barra-solo-plegada mt-1 text-[10.5px] font-semibold leading-none text-marca-gris transition-opacity duration-150">
          {te.cursoCorto}
        </span>
      </div>
      <div aria-hidden className="barra-rotulo absolute left-[74px] top-0.5 w-[180px]">
        <p className="line-clamp-2 font-display text-[14.5px] font-bold leading-tight text-marca-tinta">{linea}</p>
        <p className="mt-0.5 line-clamp-2 text-[12.5px] leading-snug text-marca-tintaMedia">{debajo}</p>
      </div>
    </div>
  );
}

/**
 * «Cómo vas», solo con la barra abierta: el nivel y los cuatro anillos
 * (`ComoVas`). En el hueco entre las secciones y el perfil, absoluta y
 * de ancho fijo por lo mismo que el texto del anillo.
 *
 * SI NO CABE, NO SE PINTA. En una pantalla baja pisaría las secciones.
 * No es un corte fijo por altura: se mide, porque en la lección el menú
 * lleva un icono más (el del panel). Se esconde con `visibility` en
 * línea —gana a la regla que la enseña al abrir la barra— y no con
 * `display`, para poder seguir midiéndola. El lector de pantalla la
 * tiene igual en el `sr-only`, que no depende de nada de esto.
 */
function DetalleDeLaBarra({ estadisticas }: { estadisticas: EstadisticasAlumno }) {
  const { t } = usarIdioma();
  const te = t.estadisticas;
  const caja = useRef<HTMLDivElement>(null);
  const [cabe, setCabe] = useState(true);

  useEffect(() => {
    const el = caja.current;
    const nav = el?.closest(".barra-panel")?.querySelector("nav");
    if (!el || !nav) return;
    const medir = () => setCabe(el.getBoundingClientRect().top >= nav.getBoundingClientRect().bottom + 12);
    medir();
    const observador = new ResizeObserver(medir);
    observador.observe(el);
    observador.observe(nav);
    window.addEventListener("resize", medir);
    return () => {
      observador.disconnect();
      window.removeEventListener("resize", medir);
    };
  }, []);

  const { nivel } = estadisticas;
  const lecturas = [
    ...(nivel ? [`${te.nivel}: ${nivel.valor}${nivel.fiable ? "" : ` (${te.nivelEstimado})`}`] : []),
    ...celdasComoVas(estadisticas, te).map((c) => c.lector),
  ];
  if (lecturas.length === 0) return null;

  return (
    <>
      <ul className="sr-only" aria-label={te.titulo}>
        {lecturas.map((l) => (
          <li key={l}>{l}</li>
        ))}
      </ul>
      <div
        ref={caja}
        aria-hidden
        className="barra-rotulo barra-detalle absolute bottom-[84px] left-[18px]"
        style={cabe ? undefined : { visibility: "hidden" }}
      >
        <ComoVas estadisticas={estadisticas} variante="barra" />
      </div>
    </>
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
      className="h-[22px] w-[22px] shrink-0"
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
