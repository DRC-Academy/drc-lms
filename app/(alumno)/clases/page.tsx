import { obtenerCalendario, obtenerExcepciones, obtenerNombresProfesor, obtenerRecorrido } from "@/lib/gestion";
import { conFoco } from "@/lib/foco";
import { exigirFoco } from "@/lib/sesion-servidor";
import { textosActuales } from "@/lib/idioma-servidor";
import MisClases from "@/components/clases/MisClases";
import HistorialClases from "@/components/clases/HistorialClases";

export const dynamic = "force-dynamic";

/**
 * «Mis clases»: cuándo es la próxima y por dónde se entra.
 *
 * ES LA ÚNICA SECCIÓN QUE MIRA HACIA FUERA DEL LMS. Las otras cuatro
 * hablan de lo que el alumno hace aquí dentro —su curso, su práctica, su
 * progreso—; esta existe para sacarlo de aquí y llevarlo a su clase, que
 * es el producto de verdad. Por eso el botón es lo más grande de la
 * pantalla y no hay nada compitiendo con él.
 *
 * LAS CLASES SALEN DEL CALENDARIO DE GESTIÓN, no del perfil: el grid del
 * profesor (`vista_calendario_alumno`) y las excepciones anotadas
 * (`vista_excepciones_clase`). Ver `components/clases/MisClases.tsx`.
 *
 * La semana del calendario va en `?semana=` (0 es la actual): se cambia
 * con enlaces y se calcula en el servidor, como todo lo demás.
 *
 * DEBAJO, EL HISTORIAL: las clases pasadas y lo que se trabajó en cada
 * una, con la misma pieza que el recorrido de «Mi progreso». Ver
 * `components/clases/HistorialClases.tsx`.
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
  const t = textosActuales();

  return (
    <div className="flex min-h-screen flex-col bg-marca-niebla">

      {/* El hueco de abajo es para la barra fija de móvil, igual que en
          las demás secciones. */}
      <main className="mx-auto flex w-full max-w-contenido flex-1 flex-col gap-6 px-4 pb-[120px] pt-[18px] lg:px-9 lg:pt-8">
        <header className="flex flex-col gap-1">
          <h1 className="font-display text-[26px] font-bold leading-tight text-marca-tinta lg:text-[30px]">
            {t.clases.misClases}
          </h1>
          <p className="text-[15px] text-marca-gris">{t.clases.tuHorarioSemanal}</p>
        </header>

        <MisClases
          calendario={calendario}
          excepciones={excepciones}
          semana={Number.isFinite(semana) ? semana : 0}
          hrefSemana={(i) => conFoco(i === 0 ? "/clases" : `/clases?semana=${i}`, paraEnlaces)}
          t={t.clases}
        />

        <HistorialClases clases={recorrido.todas} profesores={profesores} t={t.clases} />
      </main>
    </div>
  );
}
