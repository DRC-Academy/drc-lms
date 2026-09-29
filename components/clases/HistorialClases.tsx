// ---------------------------------------------------------------
// EL HISTORIAL DE «CLASES»
//
// Las clases pasadas y lo que se trabajó en cada una. Desde la ronda de
// móvil de septiembre de 2026 es el sendero (`SenderoClases`): por clase
// la fecha y el título, y el resto en un desplegable. Antes era el
// recorrido de la ficha de progreso con su CSS `pg-*`. Con su modo
// `detalle` —quién dio cada clase—, y con
// TODAS las clases, también las que no tienen análisis: esas salen con su
// fecha y su profesor, sin contenido inventado.
//
// SOLO LA ÚLTIMA A LA VISTA. El resto, en el «Ver más clases»: encima ya
// están el banner, la última clase y el calendario, y seis tarjetas más
// eran demasiado. `AbrirClaseDelAncla` abre el desplegable cuando se
// llega a una clase de dentro por su enlace.
//
// Todo se lee en el servidor (`obtenerRecorrido`, `obtenerNombresProfesor`)
// y nada de lo que se pinta es el transcript ni los errores del alumno.
// ---------------------------------------------------------------

import type { ClaseDelRecorrido } from "@/lib/gestion";
import type { TextosClases } from "@/lib/textos/clases";
import SenderoClases from "@/components/clases/SenderoClases";
import { TituloSeccion } from "@/components/base/Seccion";
import AbrirClaseDelAncla from "@/components/clases/AbrirClaseDelAncla";

export default function HistorialClases({
  clases,
  profesores,
  t,
  anclas = false,
}: {
  /** `Recorrido.todas`: de la más reciente a la más antigua. */
  clases: ClaseDelRecorrido[];
  profesores: Map<string, string>;
  t: TextosClases;
  /** Un `id` por clase, para que el calendario enlace a cada una (ver `Recorrido`). */
  anclas?: boolean;
}) {
  return (
    <section className="flex flex-col gap-4" aria-labelledby="titulo-historial">
      {/* Sin la bajada «de la más reciente a la primera»: el sendero ya
          se lee de arriba abajo, y la fecha de cada parada lo confirma. */}
      <TituloSeccion id="titulo-historial">{t.historial}</TituloSeccion>

      <SenderoClases
        clases={clases}
        vacio={t.historialVacio}
        rotuloTemas={t.temasTratados}
        detalle={{ profesores, conProfesor: t.conProfesor }}
        anclas={anclas}
        visibles={1}
        verMas={t.verMasClases}
      />
      {anclas && <AbrirClaseDelAncla />}
    </section>
  );
}
