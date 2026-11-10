// ---------------------------------------------------------------
// LOS DATOS DEL MARCO: DE QUIÉN ES LA PANTALLA
//
// Lo que necesitan la barra, «Cómo vas», la tira de revisión y el
// perfil, calculado para el alumno que ya ha resuelto
// `alumnoDeLaPagina`. Lo llama cada página (`MarcoDeLaPagina`), en su
// misma petición, así que las dos hablan del mismo alumno; y el layout en
// la primera carga, para que el HTML ya traiga la barra.
//
// No duplica consultas: `obtenerPerfil`, las estadísticas y el profesor
// van por `cache()` y la página las comparte.
// ---------------------------------------------------------------

import "server-only";
import { obtenerPerfil } from "@/lib/gestion";
import { cursosDelInicio, precargarCursosDelAlumno } from "@/lib/cursos-servidor";
import { rutaDeMiCurso } from "@/lib/cursos";
import { nivelDelAlumno } from "@/lib/estimacion";
import { comoFecha } from "@/lib/fechas";
import { estadisticasDelAlumno, lecturasDeEstadisticas } from "@/lib/estadisticas-servidor";
import { accesoPorAlumno } from "@/lib/acceso-alumno";
import { estadoParaLaBarra } from "@/lib/prueba-nivel/servidor";
import type { Foco } from "@/lib/sesion-servidor";
import type { DatosNavegacion } from "@/components/marco/PiezasDelMarco";

export async function datosDelMarco(alumno: Foco): Promise<DatosNavegacion> {
  const { alumnoId, revisando } = alumno;

  // UNA SOLA OLA. Lo que es del alumno sale todo a la vez, porque nada de
  // ello depende de otra lectura, y el catálogo viene de su caché. Lo de
  // abajo ya no viaja: lo encuentra hecho por `cache()`.
  const [perfil] = alumnoId
    ? await Promise.all([
        obtenerPerfil(alumnoId),
        precargarCursosDelAlumno(alumnoId),
        lecturasDeEstadisticas(alumnoId),
      ])
    : [null];

  const principal = perfil
    ? (
        await cursosDelInicio(alumnoId, perfil.plan, nivelDelAlumno(alumnoId, perfil), comoFecha(perfil.fechaInicio))
      )[0]
    : undefined;

  // Se quedarían viejas si nada volviera a pedirlas, pero viajan con cada
  // página y con cada `router.refresh()`. Los ejercicios que se responden
  // sin salir de la pantalla los suma el navegador
  // (`components/estadisticas/ejercicios-en-vivo.ts`).
  // La prueba de nivel de la barra: el mismo estado que el bloque del inicio
  // (en el inicio, la misma consulta, por `cache()`). Sin interruptor, nada.
  const [estadisticas, acceso, pruebaNivel] = await Promise.all([
    alumnoId ? estadisticasDelAlumno(alumnoId, perfil, principal) : null,
    accesoPorAlumno(alumnoId),
    accesoPorAlumno(alumnoId).then((a) => estadoParaLaBarra(alumnoId, a)),
  ]);

  return {
    alumnoId,
    nombre: perfil?.nombre.trim() ?? "",
    miCurso: principal ? rutaDeMiCurso(principal) : null,
    foco: revisando ? alumnoId : null,
    revisando,
    estadisticas,
    acceso: { paraTi: acceso.paraTi, clases: acceso.clases, diploma: acceso.diploma },
    pruebaNivel,
  };
}
