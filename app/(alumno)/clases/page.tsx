import { obtenerCalendario, obtenerExcepciones, obtenerNombresProfesor, obtenerRecorrido } from "@/lib/gestion";
import { conProfesorDeLaFicha, profesorDelAlumno } from "@/lib/profesor-servidor";
import { conFoco } from "@/lib/foco";
import { exigirAlumnoDeLaPagina } from "@/lib/sesion-servidor";
import { textosActuales } from "@/lib/idioma-servidor";
import PantallaClases from "@/components/clases/PantallaClases";
import RecuperacionesDeGestion from "@/components/clases/RecuperacionesDeGestion";
import AutoservicioDeGestion from "@/components/clases/autoservicio/AutoservicioDeGestion";
import { autoservicioActivo } from "@/lib/autoservicio";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

/**
 * «Mis clases»: cuándo es la próxima, por dónde se entra, la semana y lo
 * que se trabajó en cada clase.
 *
 * ES LA ÚNICA SECCIÓN QUE MIRA HACIA FUERA DEL LMS. Las otras cuatro
 * hablan de lo que el alumno hace aquí dentro —su curso, su práctica, su
 * progreso—; esta existe para sacarlo de aquí y llevarlo a su clase, que
 * es el producto de verdad. Por eso el botón es lo más grande de la
 * pantalla y no hay nada compitiendo con él.
 *
 * LAS CLASES SALEN DEL CALENDARIO DE GESTIÓN, no del perfil: el grid del
 * profesor (`vista_calendario_alumno`) y las excepciones anotadas
 * (`vista_excepciones_clase`); el historial, de `class_analyses`. Lo que
 * se pinta y cómo, en `components/clases/PantallaClases.tsx`.
 *
 * La semana del calendario va en `?semana=` (0 es la actual): se cambia
 * con enlaces y se calcula en el servidor, como todo lo demás.
 *
 * ARRIBA, LAS RECUPERACIONES de clases canceladas, que se piden a la API
 * de Gestión (`lib/recuperaciones.ts`) y no a la base. `?recuperacion=`
 * es la del enlace del correo (llega por `/mis-clases`): se resalta si es
 * de este alumno, y si no, no está en su lista y no pasa nada. El equipo
 * las ve sin botones.
 *
 * DEBAJO DEL CALENDARIO, «TU HORARIO» —cambiar de horario o de
 * profesor—, también de Gestión y también en su `<Suspense>`. Solo con
 * AUTOSERVICIO_ACTIVO=1 (`lib/autoservicio`): apagado no se monta nada.
 *
 * `force-dynamic` porque la respuesta depende de la hora: una página
 * cacheada diría "hoy" el día siguiente.
 */
export default async function PaginaClases({
  searchParams,
}: {
  searchParams: { semana?: string; recuperacion?: string };
}) {
  const { sesion, alumnoId, paraEnlaces } = await exigirAlumnoDeLaPagina();
  const resaltada = typeof searchParams.recuperacion === "string" ? searchParams.recuperacion : null;

  const [calendarioCrudo, excepciones, recorrido, profesores, profe] = await Promise.all([
    obtenerCalendario(alumnoId),
    obtenerExcepciones(alumnoId),
    obtenerRecorrido(alumnoId),
    obtenerNombresProfesor(),
    profesorDelAlumno(alumnoId),
  ]);
  // El profesor que se nombra en las clases de ahora es el de la ficha;
  // el historial sigue diciendo quién dio cada clase pasada.
  const calendario = conProfesorDeLaFicha(calendarioCrudo, profe);
  const semana = Number.parseInt(searchParams.semana ?? "0", 10);

  return (
    <div className="flex min-h-screen flex-col bg-marca-niebla">
      <PantallaClases
        calendario={calendario}
        excepciones={excepciones}
        recorrido={recorrido.todas}
        profesores={profesores}
        semana={Number.isFinite(semana) ? semana : 0}
        hrefSemana={(i) => conFoco(i === 0 ? "/clases" : `/clases?semana=${i}`, paraEnlaces)}
        hrefPractica={conFoco("/practica", paraEnlaces)}
        t={textosActuales()}
        recuperaciones={
          <Suspense fallback={null}>
            <RecuperacionesDeGestion alumnoId={alumnoId} resaltada={resaltada} soloLectura={sesion.rol !== "alumno"} />
          </Suspense>
        }
        autoservicio={
          autoservicioActivo() ? (
            <Suspense fallback={null}>
              <AutoservicioDeGestion alumnoId={alumnoId} soloLectura={sesion.rol !== "alumno"} />
            </Suspense>
          ) : null
        }
      />
    </div>
  );
}
