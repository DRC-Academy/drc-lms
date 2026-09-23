import { obtenerCalendario, obtenerExcepciones, obtenerNombresProfesor, obtenerRecorrido } from "@/lib/gestion";
import { conFoco } from "@/lib/foco";
import { exigirFoco } from "@/lib/sesion-servidor";
import { textosActuales } from "@/lib/idioma-servidor";
import PantallaClases from "@/components/clases/PantallaClases";

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
 * `force-dynamic` porque la respuesta depende de la hora: una página
 * cacheada diría "hoy" el día siguiente.
 */
export default async function PaginaClases({ searchParams }: { searchParams: { semana?: string } }) {
  const { alumnoId, paraEnlaces } = await exigirFoco();

  const [calendario, excepciones, recorrido, profesores] = await Promise.all([
    obtenerCalendario(alumnoId),
    obtenerExcepciones(alumnoId),
    obtenerRecorrido(alumnoId),
    obtenerNombresProfesor(),
  ]);
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
      />
    </div>
  );
}
