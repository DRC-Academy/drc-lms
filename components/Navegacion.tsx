// ---------------------------------------------------------------
// LA NAVEGACIÓN DE TODA LA APLICACIÓN
//
// Una sola pieza. En escritorio, la barra de iconos a la izquierda que
// nació en la lección (`BarraLateral`); por debajo de 768px, la barra de
// pestañas de abajo (`NavegacionInferior`) con los mismos iconos. La
// monta el layout común del alumno, `app/(alumno)/layout.tsx`, así que
// ninguna pantalla se acuerda de ponerla y ninguna la pierde al cambiar
// de página. Sustituye a la cabecera de arriba, que ya no existe.
//
// LO QUE ESTABA EN LA CABECERA, Y DÓNDE HA IDO:
//
//   · el logotipo → el símbolo de arriba de la barra, que lleva al inicio;
//   · las cinco secciones → la barra, y las pestañas en móvil;
//   · el idioma, el nombre y «Salir» → el perfil: el avatar al pie de la
//     barra, y la última pestaña en móvil (`MenuPerfil`);
//   · la ayuda → el icono de la barra; en móvil, el botón flotante;
//   · «Revisando la ficha de…» → la tira de revisión, encima de todo.
//
// LA SECCIÓN ACTIVA LA DICE LA RUTA, en el cliente (`seccionDeRuta`): un
// layout no se vuelve a renderizar al pasar de una página a otra.
// ---------------------------------------------------------------

import type { ReactNode } from "react";
import Link from "next/link";
import ChatAyuda from "@/components/ChatAyuda";
import { conFoco } from "@/lib/foco";
import { textosActuales } from "@/lib/idioma-servidor";
import type { TextosNavegacion } from "@/lib/textos/navegacion";
import type { EnlaceSeccion } from "@/components/IconoSeccion";
import BarraLateral, { BarraLateralCargando } from "@/components/leccion/BarraLateral";
import MenuPerfil from "@/components/leccion/MenuPerfil";
import { ProveedorMarco } from "@/components/leccion/MarcoCurso";
import NavegacionInferior from "@/components/NavegacionInferior";

export type { SeccionActiva, EnlaceSeccion } from "@/components/IconoSeccion";

/**
 * Las cinco secciones del alumno, como enlaces. Una sola lista para la
 * barra y para las pestañas, y así no pueden decir cosas distintas.
 *
 * «MI CURSO» RECIBE SU DESTINO HECHO, no el slug: la lección por la que va
 * el alumno, o el temario si no hay ninguna. Esa decisión vive en
 * `rutaDeMiCurso` (`lib/cursos.ts`), la misma que usa el botón del inicio.
 *
 * Sin alumno —el equipo en su buscador— no hay secciones.
 */
export function enlacesDeSecciones({
  alumnoId,
  miCurso,
  foco,
  t,
}: {
  alumnoId?: string | null;
  /** La ruta de la pestaña, sin foco. Sin ella, la pestaña no se pinta. */
  miCurso?: string | null;
  foco?: string | null;
  t: TextosNavegacion;
}): EnlaceSeccion[] {
  if (!alumnoId) return [];

  return [
    { clave: "inicio" as const, texto: t.inicio, corto: t.cortas.inicio, href: `/alumno/${alumnoId}` },
    // CLASES VA LA SEGUNDA: tiene un botón que importa a una hora
    // concreta, así que se pone donde se llega sin buscar. Se pinta
    // siempre; el que no tenga horario encuentra la pantalla
    // explicándoselo en vez de una pestaña que se esfumó.
    { clave: "clases" as const, texto: t.clases, corto: t.cortas.clases, href: "/clases" },
    ...(miCurso ? [{ clave: "curso" as const, texto: t.miCurso, corto: t.cortas.curso, href: miCurso }] : []),
    { clave: "practica" as const, texto: t.paraTi, corto: t.cortas.practica, href: "/practica" },
    { clave: "progreso" as const, texto: t.miProgreso, corto: t.cortas.progreso, href: "/progreso" },
  ].map((enlace) => ({ ...enlace, href: conFoco(enlace.href, foco ?? null) }));
}

/** Lo que el marco necesita saber de quién es la pantalla. */
export type DatosNavegacion = {
  /** El alumno del que habla la pantalla, o "" para el equipo sin ficha. */
  alumnoId: string;
  nombre: string;
  /** Destino de «Mi curso», sin foco, o null si no tiene curso. */
  miCurso: string | null;
  /** El contexto de revisión que conservan los enlaces. Ver `lib/foco.ts`. */
  foco: string | null;
  revisando: boolean;
};

/**
 * El marco: la tira de revisión, la barra a la izquierda, la pantalla y
 * las pestañas de abajo. Lo que va dentro es la página.
 */
export default function MarcoApp({ datos, children }: { datos: DatosNavegacion; children: ReactNode }) {
  const t = textosActuales().navegacion;
  const enlaces = enlacesDeSecciones({
    alumnoId: datos.alumnoId,
    miCurso: datos.miCurso,
    foco: datos.foco,
    t,
  });
  const nombre = datos.nombre.trim();
  const inicioHref = datos.alumnoId ? conFoco(`/alumno/${datos.alumnoId}`, datos.foco) : "/";

  return (
    <ProveedorMarco>
      {datos.revisando && <TiraRevision nombre={nombre || undefined} t={t} />}
      <div className="flex min-h-dvh flex-1 items-stretch">
        <BarraLateral enlaces={enlaces} nombre={nombre} inicioHref={inicioHref} />
        <div className="flex min-w-0 flex-1 flex-col">{children}</div>
      </div>
      <NavegacionInferior
        enlaces={enlaces}
        secciones={t.secciones}
        extra={<MenuPerfil nombre={nombre} variante="movil" />}
      />
      {/* La ayuda es para el alumno: el equipo en su buscador no la usa. En
          escritorio la abre el icono de la barra; el botón flotante, solo
          en móvil. */}
      {enlaces.length > 0 && <ChatAyuda nombre={nombre} botonFlotante="movil" />}
    </ProveedorMarco>
  );
}

/** El marco mientras el layout lee la sesión: la barra en hueco y la pantalla ya pintándose. */
export function MarcoAppCargando({ children }: { children: ReactNode }) {
  return (
    <ProveedorMarco>
      <div className="flex min-h-dvh flex-1 items-stretch">
        <BarraLateralCargando />
        <div className="flex min-w-0 flex-1 flex-col">{children}</div>
      </div>
    </ProveedorMarco>
  );
}

/**
 * De quién es la ficha, que es una revisión, y cómo salir de ella. Encima
 * de todo, en todas las pantallas del alumno.
 *
 * EN ÁMBAR Y NO EN VERDE. El verde es el color de las acciones del alumno;
 * esta tira dice justo lo contrario —que lo que se ve no es de quien
 * mira— y tiene que leerse como una advertencia suave.
 */
export function TiraRevision({ nombre, t }: { nombre?: string; t: TextosNavegacion }) {
  const quien = nombre?.trim();

  return (
    <div className="border-b border-marca-examenBorde bg-marca-examen">
      <div className="flex items-center gap-x-3 gap-y-1 px-4 py-[7px] sm:px-9">
        <span aria-hidden className="h-2 w-2 shrink-0 rounded-full bg-marca-amarillo" />

        <p className="min-w-0 flex-1 truncate text-[12.5px] leading-[1.35] text-marca-tinta sm:text-[13px]">
          {/* Sin nombre se dice igual que es una revisión: perder el
              nombre no puede hacer que el aviso desaparezca. */}
          <strong className="font-semibold">
            {quien ? t.revisandoLaFichaDe(quien) : t.revisandoUnaFicha}
          </strong>
          <span className="hidden sm:inline"> {t.nadaSeGuarda}</span>
        </p>

        <Link
          href="/"
          className="shrink-0 whitespace-nowrap rounded text-[12.5px] font-semibold text-marca-verdeOsc underline-offset-4 transition-colors hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marca-verdeOsc sm:text-[13px]"
        >
          {t.salirDeLaRevision}
        </Link>
      </div>
    </div>
  );
}
