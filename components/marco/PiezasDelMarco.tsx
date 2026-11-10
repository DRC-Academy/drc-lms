"use client";

import Link from "next/link";
import type { EnlaceSeccion } from "@/components/IconoSeccion";
import BarraLateral from "@/components/leccion/BarraLateral";
import MenuPerfil from "@/components/leccion/MenuPerfil";
import NavegacionInferior from "@/components/NavegacionInferior";
import { usarIdioma } from "@/components/ProveedorIdioma";
import { DESCUENTO_WOO } from "@/lib/cuenta-woo";
import type { EstadisticasAlumno } from "@/lib/estadisticas";
import { conFoco } from "@/lib/foco";
import type { TextosNavegacion } from "@/lib/textos/navegacion";
import { esIdPase } from "@/lib/pase-id";

/** Qué se ve de lo que depende del acceso (`accesoDelAlumno`). Sin dato: todo. */
export type AccesoEnBarra = { paraTi: boolean; clases: boolean; diploma: boolean };

/**
 * Las secciones del alumno, como enlaces. Una sola lista para la barra,
 * para las pestañas y para la hoja del perfil en móvil, y así no pueden
 * decir cosas distintas.
 *
 * «MI CURSO» RECIBE SU DESTINO HECHO, no el slug: la lección por la que va
 * el alumno, o el temario si no hay ninguna. Esa decisión vive en
 * `rutaDeMiCurso` (`lib/cursos.ts`), la misma que usa el botón del inicio.
 * Mientras llega, `cargando` deja su sitio guardado y sin enlace: sin eso
 * las pestañas se recolocarían al llegar los datos.
 *
 * Sin alumno —el equipo en su buscador— no hay secciones.
 */
export function enlacesDeSecciones({
  alumnoId,
  miCurso,
  foco,
  t,
  cargando = false,
  acceso,
}: {
  alumnoId?: string | null;
  /** La ruta de la pestaña, sin foco. Sin ella, la pestaña no se pinta. */
  miCurso?: string | null;
  foco?: string | null;
  t: TextosNavegacion;
  cargando?: boolean;
  acceso?: AccesoEnBarra;
}): EnlaceSeccion[] {
  if (!alumnoId) return [];

  // Mientras llegan los datos, el prefijo ya dice que solo tiene pase: que no
  // se le enseñe «Clases» ni un instante.
  const ve = acceso ?? (esIdPase(alumnoId) ? { paraTi: false, clases: false, diploma: false } : { paraTi: true, clases: true, diploma: true });

  const curso = { clave: "curso" as const, texto: t.miCurso, corto: t.cortas.curso };

  return [
    { clave: "inicio" as const, texto: t.inicio, corto: t.cortas.inicio, href: `/alumno/${alumnoId}` },
    // CLASES VA LA SEGUNDA: tiene un botón que importa a una hora
    // concreta, así que se pone donde se llega sin buscar. Se pinta
    // siempre; el que no tenga horario encuentra la pantalla
    // explicándoselo en vez de una pestaña que se esfumó.
    ...(ve.clases ? [{ clave: "clases" as const, texto: t.clases, corto: t.cortas.clases, href: "/clases" }] : []),
    ...(miCurso ? [{ ...curso, href: miCurso }] : cargando ? [{ ...curso, href: "", pendiente: true }] : []),
    // BLOQUEADO SE VE: lleva a la pantalla que cuenta de qué depende.
    {
      clave: "practica" as const,
      texto: t.paraTi,
      corto: t.cortas.practica,
      href: "/practica",
      ...(ve.paraTi ? {} : { bloqueado: true, etiquetaAria: t.conCandado(t.paraTi) }),
    },
    { clave: "progreso" as const, texto: t.miProgreso, corto: t.cortas.progreso, href: "/progreso" },
    // «MI DIPLOMA» NO VA EN LA BARRA DE MÓVIL: con siete celdas a 320px
    // cada una baja a 45px. Sale en la hoja del perfil, que lee esta
    // misma lista (`enBarraMovil`).
    ...(ve.diploma ? [{ clave: "diploma" as const, texto: t.miDiploma, corto: t.cortas.diploma, href: "/diploma", enBarraMovil: false }] : []),
    // EL DESCUENTO NO ES DEL LMS: la página de referidos de la web, en la
    // misma pestaña. En móvil, en la hoja del perfil como el diploma.
    { clave: "descuento" as const, texto: t.descuento, corto: t.cortas.descuento, href: DESCUENTO_WOO, enBarraMovil: false, externo: true },
  ].map((enlace) =>
    // `conFoco` deja solo la ruta: a una URL de otra web le quitaría el dominio.
    "externo" in enlace || "pendiente" in enlace ? enlace : { ...enlace, href: conFoco(enlace.href, foco ?? null) },
  );
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
  /**
   * Las estadísticas de la barra lateral, ya calculadas en el servidor
   * (`lib/estadisticas-servidor.ts`). Sin alumno no hay.
   */
  estadisticas?: EstadisticasAlumno | null;
  /** Sin él, todo a la vista: es lo que pasa fuera de las pantallas del alumno. */
  acceso?: AccesoEnBarra;
};

/**
 * LO QUE DEPENDE DEL ALUMNO: la tira de revisión, la barra de la izquierda
 * (con «Cómo vas» y el anillo del curso) y las pestañas de abajo con el
 * perfil. Cada pieza se coloca en la rejilla de `MarcoFijo` con su propia
 * área, así que puede llegar de otro sitio que el contenido.
 *
 * `cargando`: la carcasa, con las mismas medidas y sin nombre ni cifras.
 * Es lo que se ve mientras llegan los datos de este alumno
 * (`MarcoDelAlumno`).
 */
export function PiezasDelMarco({ datos, cargando = false }: { datos: DatosNavegacion; cargando?: boolean }) {
  const t = usarIdioma().t.navegacion;
  const enlaces = enlacesDeSecciones({
    alumnoId: datos.alumnoId,
    miCurso: datos.miCurso,
    foco: datos.foco,
    t,
    cargando,
    acceso: datos.acceso,
  });
  const nombre = datos.nombre.trim();
  const inicioHref = datos.alumnoId ? conFoco(`/alumno/${datos.alumnoId}`, datos.foco) : "/";

  return (
    <>
      {datos.revisando && (
        <div className="col-span-2 row-start-1">
          <TiraRevision nombre={nombre || undefined} t={t} />
        </div>
      )}
      <div className="col-start-1 row-start-2">
        <BarraLateral enlaces={enlaces} nombre={nombre} inicioHref={inicioHref} estadisticas={datos.estadisticas ?? null} cargando={cargando} />
      </div>
      <NavegacionInferior
        enlaces={enlaces}
        secciones={t.secciones}
        extra={
          <MenuPerfil
            nombre={nombre}
            variante="movil"
            enlaces={enlaces}
            estadisticas={datos.estadisticas ?? null}
            hrefPractica={enlaces.find((e) => e.clave === "practica")?.href}
          />
        }
      />
    </>
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
