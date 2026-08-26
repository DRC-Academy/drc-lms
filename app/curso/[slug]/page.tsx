import { notFound, redirect } from "next/navigation";
import { focoActual } from "@/lib/sesion-servidor";
import { obtenerPerfil } from "@/lib/gestion";
import { arbolDelCurso, cursoPorSlug, cursosAsignados } from "@/lib/cursos-servidor";
import { sinDripEn } from "@/lib/accesos-manuales";
import { construirTemario } from "@/lib/temario";
import { comoFecha } from "@/lib/fechas";
import { calcularDiploma } from "@/lib/diploma";
import Temario from "@/components/curso/Temario";
import BannerDiploma from "@/components/BannerDiploma";

export const dynamic = "force-dynamic";

/**
 * El índice del curso completo, mes a mes.
 *
 * ANTES ERA UNA REJILLA PLANA de 47 tarjetas: los 47 módulos se veían de
 * una vez, sí, pero nada decía que el curso dura seis meses ni por dónde
 * iba el alumno dentro de ese plan. Ahora se agrupa en meses
 * desplegables, cada uno con sus cuatro semanas, y arriba un panel que
 * enseña el curso entero como densidad de lecciones hechas.
 *
 * SOBRE LAS "SEMANAS": el número que viene en el título ("Week 1 -
 * Lesson 1: …") se repite cada ocho módulos, y durante un tiempo eso lo
 * hizo inservible como agrupador —daba seis "Semana 1" distintas—. Con
 * los meses por encima vuelve a significar algo: la semana 1 del mes 3
 * es un sitio concreto del curso. Ese reinicio es justo lo que confirma
 * el corte por meses.
 *
 * La agrupación y todos los contadores se resuelven en `lib/temario.ts`,
 * en el servidor. Al cliente solo le llega qué pintar y qué abrir.
 */
export default async function IndiceCurso({ params }: { params: { slug: string } }) {
  // La tira de "estás revisando" la pone la cabecera, que vive en el
  // layout: aquí solo hace falta de quién es el curso y qué colgar de
  // los enlaces para no perderlo al entrar en una lección.
  const { alumnoId, paraEnlaces } = await focoActual();

  const curso = await cursoPorSlug(params.slug);
  if (!curso) notFound();

  // ---------------------------------------------------------------
  // QUIÉN ES EL ALUMNO DE ESTA PANTALLA
  //
  // Tres casos, y los tres pasan por el mismo código de aquí abajo:
  //
  //   · El alumno en su curso. El de siempre.
  //   · EL EQUIPO REVISANDO UNA FICHA: `alumnoId` es el del alumno
  //     revisado, así que todo lo que sigue —progreso, drip, guard del
  //     plan— se resuelve con SUS datos. Es un espejo fiel: lo que el
  //     equipo ve es lo que ve esa persona, incluidos los módulos que
  //     todavía no tiene abiertos.
  //   · El equipo sin ficha, que abre un curso para revisar su
  //     contenido. `alumnoId` vacío: sin progreso y sin drip, el curso
  //     entero abierto. Es lo que hacía antes y no se toca.
  //
  // No hay una rama por caso a propósito: la diferencia entera cabe en
  // qué vale `alumnoId`, y multiplicar ramas es cómo se consigue que el
  // equipo acabe viendo algo distinto de lo que ve el alumno.
  // ---------------------------------------------------------------
  const perfil = alumnoId ? await obtenerPerfil(alumnoId) : null;

  // Solo los cursos de su plan. Sin esto el slug sería decorativo y
  // cualquiera se leería el temario de los otros niveles. Se aplica
  // también en revisión: el alumno no puede abrir este curso, así que el
  // espejo tampoco.
  if (alumnoId) {
    const suyos = perfil ? await cursosAsignados(perfil.plan, perfil.nivel, alumnoId) : [];
    if (!suyos.some((c) => c.id === curso.id)) redirect(`/alumno/${alumnoId}`);
  }

  // Sin alumno no hay fecha y se ve el curso entero. Y un alumno al que
  // le hayan abierto este curso entero llega aquí por el mismo camino:
  // `null` como fecha es lo que `lib/drip.ts` entiende por "sin espera".
  const fechaDrip = (await sinDripEn(alumnoId, curso.id))
    ? null
    : comoFecha(perfil?.fechaInicio);

  const arbol = await arbolDelCurso(alumnoId, curso, fechaDrip);
  const temario = construirTemario(arbol);

  return (
    // La cabecera entera —navegación incluida— la pone el layout del
    // curso, y es la misma que en el resto de las pantallas del alumno.
    // Aquí ya no se pinta ninguna: la segunda que había era justo lo que
    // hacía desaparecer Inicio, Mi curso y Práctica al entrar.
    <div className="flex-1 bg-temario-fondo text-temario-tinta">
      <main className="mx-auto w-full max-w-[1240px] px-4 pb-14 pt-6 min-[900px]:px-11 min-[900px]:pb-16 min-[900px]:pt-10">
        {/* SIN CABECERA DE PÁGINA. Aquí había un bloque entero antes de
            llegar al contenido: «← Volver a la lección», el epígrafe
            «Curso completo», el título del curso a 42px y los tres
            contadores («45 módulos · 191 lecciones · 23 semanas»).

            Ninguno de los cuatro decía algo que el alumno no supiera ya:
            en qué curso está lo dice la cabecera fija —la pestaña «Mi
            curso» va marcada—, volver a la lección es exactamente lo que
            hace el botón «Continuar» de la franja de abajo, y el tamaño
            del curso lo cuenta el banner del diploma en lecciones, que
            es la unidad en la que se avanza.

            Lo que se gana es que la franja del plan —«Mes 1 · Semana 3 ·
            Módulo 5», con su botón— es lo primero de la pantalla. */}

        {/* EL DIPLOMA, TAMBIÉN AQUÍ. El mismo banner que el inicio, sin
            cambiarle una coma: es la misma meta y tiene que reconocerse
            como la misma pieza. Aquí gana algo que en el inicio no
            tenía: está en la pantalla donde se avanza.

            Se pinta en el servidor y entra en `Temario` por prop, que es
            cliente. El equipo sin ficha lo ve con el progreso a cero,
            como todo lo demás de esta pantalla: no es alumno de nada.
            Revisando una ficha lo ve con el progreso real de ese alumno,
            que es de lo que va el espejo. */}
        <Temario
          temario={temario}
          slug={curso.slug}
          foco={paraEnlaces}
          diploma={
            <BannerDiploma estado={calcularDiploma(temario.completadas, temario.totalLecciones)} />
          }
        />
      </main>
    </div>
  );
}
