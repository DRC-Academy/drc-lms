import { Suspense } from "react";
import type { Viewport } from "next";
import { headers } from "next/headers";
import { focoActual, sesionActual } from "@/lib/sesion-servidor";
import { obtenerPerfil } from "@/lib/gestion";
import { cursosDelInicio } from "@/lib/cursos-servidor";
import { rutaDeMiCurso } from "@/lib/cursos";
import { nivelDelAlumno } from "@/lib/estimacion";
import { comoFecha } from "@/lib/fechas";
import { CABECERA_URL } from "@/lib/foco";
import { estadisticasDelAlumno } from "@/lib/estadisticas-servidor";
import MarcoApp, { MarcoAppCargando, type DatosNavegacion } from "@/components/Navegacion";

/**
 * EL LAYOUT COMÚN DEL ALUMNO: la navegación de toda la aplicación.
 *
 * `(alumno)` es un grupo de rutas: no cambia ninguna URL. Cuelgan de él
 * el inicio y el bloque (`/alumno/…`), «Clases», el curso, «Para ti» y
 * «Mi progreso». La navegación la pinta este layout y no cada página, así
 * que no parpadea al saltar de una a otra: un layout no se vuelve a
 * montar mientras no se sale de él.
 *
 * POR QUÉ NO ES `async`. Si esperara sus datos, la página no empezaría a
 * renderizarse hasta tenerlos. Síncrono, la página arranca sus consultas a
 * la vez que la navegación las suyas, y el `Suspense` deja que cada una
 * llegue cuando pueda. No se duplican: `obtenerPerfil` y las lecturas del
 * curso van por `cache()`.
 *
 * `viewport-fit=cover` es lo que hace que `env(safe-area-inset-bottom)`
 * valga algo en un iPhone: sin él, la barra de pestañas se quedaría
 * debajo de la barra de inicio del sistema.
 */
export const viewport: Viewport = { viewportFit: "cover" };

export default function LayoutAlumno({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <Suspense fallback={<MarcoAppCargando>{children}</MarcoAppCargando>}>
        <MarcoConDatos>{children}</MarcoConDatos>
      </Suspense>
    </div>
  );
}

async function MarcoConDatos({ children }: { children: React.ReactNode }) {
  const datos = await datosDeNavegacion();
  if (!datos) return <MarcoAppCargando>{children}</MarcoAppCargando>;
  return <MarcoApp datos={datos}>{children}</MarcoApp>;
}

/**
 * De quién es la pantalla, para los enlaces y el perfil.
 *
 * El alumno es siempre él mismo. El equipo revisa una ficha de dos
 * maneras, y las dos se leen de la URL que el middleware deja en
 * `x-drc-url` —un layout no recibe `params` de sus hijos ni
 * `searchParams`—: en el inicio y el bloque el alumno va en la ruta
 * (`/alumno/<id>`), y en el resto en el parámetro de foco (`focoActual`).
 *
 * Esto no protege nada: quien decide si se puede ver una ficha es la
 * página. Si no hay sesión, la página redirige y aquí se pinta el hueco.
 */
async function datosDeNavegacion(): Promise<DatosNavegacion | null> {
  const sesion = await sesionActual();
  if (!sesion) return null;

  let alumnoId: string;
  let revisando: boolean;

  if (sesion.rol === "alumno") {
    alumnoId = sesion.alumnoId;
    revisando = false;
  } else {
    const url = headers().get(CABECERA_URL);
    const ruta = url ? new URL(url).pathname : "";
    const enRuta = ruta.match(/^\/alumno\/([^/]+)/);
    if (enRuta) {
      alumnoId = decodeURIComponent(enRuta[1]);
    } else {
      alumnoId = (await focoActual()).alumnoId;
    }
    revisando = alumnoId !== "";
  }

  const perfil = alumnoId ? await obtenerPerfil(alumnoId) : null;
  const principal = perfil
    ? (
        await cursosDelInicio(alumnoId, perfil.plan, nivelDelAlumno(alumnoId, perfil), comoFecha(perfil.fechaInicio))
      )[0]
    : undefined;

  // LAS ESTADÍSTICAS DE LA BARRA, con el perfil y el curso que ya se
  // han leído aquí arriba. Se quedarían viejas al navegar —el layout no
  // se vuelve a renderizar entre páginas— si no fuera porque lo que las
  // mueve refresca la ruta: completar una lección es un formulario que
  // recarga el documento, y cada intento de ejercicio pide un
  // `router.refresh()` (`FlujoEjercicios`).
  const estadisticas = alumnoId ? await estadisticasDelAlumno(alumnoId, perfil, principal) : null;

  return {
    alumnoId,
    nombre: perfil?.nombre.trim() ?? "",
    miCurso: principal ? rutaDeMiCurso(principal) : null,
    foco: revisando ? alumnoId : null,
    revisando,
    estadisticas,
  };
}
