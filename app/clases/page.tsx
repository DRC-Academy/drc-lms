import { nivelDelAlumno } from "@/lib/estimacion";
import { obtenerCalendario, obtenerPerfil, obtenerQuitas } from "@/lib/gestion";
import { exigirFoco } from "@/lib/sesion-servidor";
import { textosActuales } from "@/lib/idioma-servidor";
import { cursosDelInicio } from "@/lib/cursos-servidor";
import { rutaDeMiCurso } from "@/lib/cursos";
import { comoFecha } from "@/lib/fechas";
import Cabecera from "@/components/Cabecera";
import MisClases from "@/components/clases/MisClases";

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
 * profesor (`vista_calendario_alumno`) y los 'quita' de
 * `vista_excepciones_clase`. Ver `components/clases/MisClases.tsx`.
 *
 * `force-dynamic` porque la respuesta depende de la hora: una página
 * cacheada diría "hoy" el día siguiente.
 */
export default async function PaginaClases() {
  const { alumnoId, revisando, paraEnlaces } = await exigirFoco();

  const [perfil, calendario, quitas] = await Promise.all([
    obtenerPerfil(alumnoId),
    obtenerCalendario(alumnoId),
    obtenerQuitas(alumnoId),
  ]);
  const t = textosActuales();

  // Solo para que la cabecera pueda pintar «Mi curso» sin cambiar de
  // forma entre pantallas, igual que en `/practica`.
  const principal = perfil
    ? (
        await cursosDelInicio(
          alumnoId,
          perfil.plan,
          nivelDelAlumno(alumnoId, perfil),
          comoFecha(perfil.fechaInicio)
        )
      )[0]
    : undefined;

  return (
    <div className="flex min-h-screen flex-col bg-marca-niebla">
      <Cabecera
        nombre={perfil?.nombre.trim() || undefined}
        alumnoId={alumnoId}
        miCurso={principal ? rutaDeMiCurso(principal) : null}
        seccion="clases"
        foco={paraEnlaces}
        revisando={revisando}
      />

      {/* El hueco de abajo es para la barra fija de móvil, igual que en
          las demás secciones. */}
      <main className="mx-auto flex w-full max-w-contenido flex-1 flex-col gap-6 px-4 pb-[120px] pt-[18px] lg:px-9 lg:pt-8">
        <header className="flex flex-col gap-1">
          <h1 className="text-[24px] font-semibold leading-tight text-marca-tinta lg:text-[28px]">
            {t.clases.misClases}
          </h1>
          <p className="text-[15px] text-marca-gris">{t.clases.tuHorarioSemanal}</p>
        </header>

        <MisClases calendario={calendario} quitas={quitas} t={t.clases} />
      </main>
    </div>
  );
}
