// ---------------------------------------------------------------
// LOS DATOS DEL MARCO: DE QUIÉN ES LA PANTALLA
//
// Lo que necesitan la barra, «Cómo vas», la tira de revisión y el
// perfil, calculado para el alumno que ya ha resuelto
// `alumnoDeLaPagina`. Vivía dentro del layout de `(alumno)`, que lo
// resolvía por su cuenta; ahora lo llama el slot `@marco`, en la misma
// petición que la página, así que los dos hablan del mismo alumno.
//
// No duplica consultas: `obtenerPerfil`, las estadísticas y el profesor
// van por `cache()` y la página las comparte.
// ---------------------------------------------------------------

import "server-only";
import { obtenerPerfil } from "@/lib/gestion";
import { cursosDelInicio } from "@/lib/cursos-servidor";
import { rutaDeMiCurso } from "@/lib/cursos";
import { nivelDelAlumno } from "@/lib/estimacion";
import { comoFecha } from "@/lib/fechas";
import { estadisticasDelAlumno } from "@/lib/estadisticas-servidor";
import type { Foco } from "@/lib/sesion-servidor";
import type { DatosNavegacion } from "@/components/Navegacion";

export async function datosDelMarco(alumno: Foco): Promise<DatosNavegacion> {
  const { alumnoId, revisando } = alumno;
  const perfil = alumnoId ? await obtenerPerfil(alumnoId) : null;
  const principal = perfil
    ? (
        await cursosDelInicio(alumnoId, perfil.plan, nivelDelAlumno(alumnoId, perfil), comoFecha(perfil.fechaInicio))
      )[0]
    : undefined;

  // Se quedarían viejas si nada volviera a pedirlas, pero el slot se
  // renderiza con cada navegación y con cada `router.refresh()` —cada
  // intento de ejercicio pide uno (`FlujoEjercicios`)—.
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
