import { redirect } from "next/navigation";
import { obtenerPerfil, obtenerRecorrido } from "@/lib/gestion";
import { calcularEstimacion, nivelEfectivo } from "@/lib/estimacion";
import { exigirSesion } from "@/lib/sesion-servidor";
import { cursosAsignados } from "@/lib/cursos-servidor";
import Cabecera from "@/components/Cabecera";
import Ficha from "@/components/progreso/Ficha";

export const dynamic = "force-dynamic";

/**
 * A dónde lleva "Amplía tu plan". Configurable sin tocar código.
 *
 * SIN `NEXT_PUBLIC_`, al revés que en Gestión, porque allí el banner es
 * un componente de cliente y aquí la pantalla entera se resuelve en el
 * servidor. Una URL no es un secreto, pero si no hace falta cruzar al
 * navegador, no cruza. El destino por defecto es el mismo que el de allí.
 */
const URL_AMPLIAR = process.env.URL_AMPLIAR_PLAN || "https://drcacademy.com/mi-cuenta";

/**
 * El progreso del alumno, como cuarta sección.
 *
 * ES LA MISMA FICHA QUE `/progreso/{token}` DE DRC GESTIÓN, replicada
 * bloque a bloque: mismo orden, mismo copy y mismo CSS. Ver la cabecera
 * de `components/progreso/Ficha.tsx`, que es donde vive la copia y donde
 * está anotado lo poco que no se replica.
 *
 * AQUÍ NO HACE FALTA TOKEN. Allí la pantalla se abre desde un enlace que
 * manda el profesor y `progress_tokens` es lo que autoriza; aquí el LMS
 * ya sabe quién ha entrado, así que la sección es suya sin más. Por eso
 * tampoco hay `/progreso/{id}`, igual que en "Para ti": el progreso es
 * el de quien mira, y el equipo, que no es alumno de nada, se va al
 * buscador.
 *
 * ESTA PÁGINA SOLO ORQUESTA. Lee, calcula la estimación y reparte; no
 * decide nada sobre qué se enseña. Eso está dentro de la ficha, en el
 * mismo sitio donde lo tiene Gestión.
 */
export default async function PaginaProgreso() {
  const sesion = await exigirSesion();
  if (sesion.rol !== "alumno") redirect("/");

  const alumnoId = sesion.alumnoId;

  const [perfil, recorrido] = await Promise.all([
    obtenerPerfil(alumnoId),
    obtenerRecorrido(alumnoId),
  ]);

  // Igual que en el resto de pantallas: sin ficha en Gestión no es un
  // 404, es una pantalla con menos cosas. Hay alumnos con clases
  // analizadas y sin fila en la vista de perfiles.
  const cursos = perfil ? await cursosAsignados(perfil.plan, perfil.nivel, alumnoId) : [];

  // EL NIVEL, CON LA PRIORIDAD DE GESTIÓN. La columna `nivel` de la
  // vista es lo que tecleó quien dio de alta al alumno, que allí es la
  // fuente de MENOR prioridad. Con las dos columnas nuevas se aplica la
  // misma regla y el alumno sale en el mismo peldaño en las dos
  // pantallas; sin ellas esto se queda en el de siempre.
  const nivel = perfil
    ? nivelEfectivo(perfil.nivelProfesor, perfil.nivelFicha, perfil.nivelPrueba, perfil.nivel)
    : null;

  // Null mientras no se corra `gestion-vista-perfil-ritmo.sql` (faltan
  // las horas), y también cuando el alumno ya está en C2 o ya está en el
  // nivel del examen que prepara. En los tres casos no hay banner ni
  // bandera de meta en la escalera, exactamente como en Gestión.
  const estimacion = perfil
    ? calcularEstimacion({
        nivelActual: nivel,
        horasSemanales: perfil.horasSemanales,
        // Los mismos tres textos que mira Gestión, en el mismo orden.
        textosDelPlan: [perfil.planContratado, perfil.objetivoSetter, perfil.objetivoPerfil],
      })
    : null;

  return (
    <div className="flex min-h-screen flex-col">
      <Cabecera
        nombre={perfil?.nombre.trim() || undefined}
        alumnoId={alumnoId}
        cursoSlug={cursos[0]?.slug ?? null}
        seccion="progreso"
      />

      <Ficha
        nombre={perfil?.nombre ?? ""}
        nivel={nivel}
        horasSemanales={perfil?.horasSemanales ?? null}
        clasesContadas={recorrido.clasesContadas}
        estimacion={estimacion}
        objetivo={perfil?.objetivoPerfil ?? null}
        puntosFuertes={perfil?.puntosFuertes ?? null}
        puntosDebiles={perfil?.puntosDebiles ?? null}
        focoRecomendado={perfil?.focoRecomendado ?? null}
        clases={recorrido.clases}
        urlAmpliar={URL_AMPLIAR}
      />
    </div>
  );
}
