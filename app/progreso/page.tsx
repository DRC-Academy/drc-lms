import { nivelMcer } from "@/lib/recorrido";
import { obtenerPerfil, obtenerRecorrido } from "@/lib/gestion";
import {
  calcularEstimacion,
  nivelDelAlumno,
  nivelEsFiable,
  origenDelNivel,
  preparaSuPropioExamen,
} from "@/lib/estimacion";
import { objetivoDelAlumno } from "@/lib/objetivo-servidor";
import { exigirFoco } from "@/lib/sesion-servidor";
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
 * ya sabe quién ha entrado, así que la sección es suya sin más. Y
 * tampoco hay `/progreso/{id}`, igual que en "Para ti": cuando el equipo
 * revisa, el alumno viaja en `?alumno=` —ver `lib/foco.ts`— porque no es
 * otra pantalla, es la misma mirada desde fuera.
 *
 * ESTA PÁGINA SOLO ORQUESTA. Lee, calcula la estimación y reparte; no
 * decide nada sobre qué se enseña. Eso está dentro de la ficha, en el
 * mismo sitio donde lo tiene Gestión.
 */
export default async function PaginaProgreso() {
  // Igual que "Para ti": el alumno de la sesión, o el que el equipo está
  // revisando. Esta pantalla es de solo lectura —no hay nada que
  // guardar— así que la revisión no necesita ninguna precaución extra.
  const { alumnoId, revisando, paraEnlaces } = await exigirFoco();

  const [perfil, recorrido] = await Promise.all([
    obtenerPerfil(alumnoId),
    obtenerRecorrido(alumnoId),
  ]);

  // Igual que en el resto de pantallas: sin ficha en Gestión no es un
  // 404, es una pantalla con menos cosas. Hay alumnos con clases
  // analizadas y sin fila en la vista de perfiles.
  // Las dos salen del perfil y ninguna depende de la otra: en fila
  // serían dos viajes donde cabe uno.
  //
  // «TU OBJETIVO», EN SEGUNDA PERSONA SI LO HAY. Gestión escribe ese
  // campo PARA EL PROFESOR y en tercera persona: de los 50 que hoy se
  // pintan, ninguno le habla al alumno. La reescritura la produce
  // `scripts/reescribir-objetivos.ts` y vive en la base del LMS,
  // porque en la de Gestión no se puede escribir. Sin reescritura, o
  // si Gestión ha rehecho la ficha desde que se hizo, vuelve el
  // original: peor redactado, pero cierto. Ver `lib/objetivo-servidor.ts`.
  const [cursos, objetivo] = await Promise.all([
    perfil ? cursosAsignados(perfil.plan, nivelDelAlumno(alumnoId, perfil), alumnoId) : Promise.resolve([]),
    objetivoDelAlumno(alumnoId, perfil?.objetivoPerfil ?? null),
  ]);

  // EL NIVEL, CON LA PRIORIDAD DE GESTIÓN. La columna `nivel` de la
  // vista es lo que tecleó quien dio de alta al alumno, que allí es la
  // fuente de MENOR prioridad. Con las dos columnas nuevas se aplica la
  // misma regla y el alumno sale en el mismo peldaño en las dos
  // pantallas; sin ellas esto se queda en el de siempre.
  const nivel = perfil
    ? nivelMcer(nivelDelAlumno(alumnoId, perfil))
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
        foco={paraEnlaces}
        revisando={revisando}
      />

      <Ficha
        nombre={perfil?.nombre ?? ""}
        nivel={nivel}
        // ---------------------------------------------------------------
        // DE DÓNDE SALE EL NIVEL, Y POR QUÉ IMPORTA AQUÍ
        //
        // 125 de los 174 alumnos lo tienen puesto en el alta y sin
        // confirmar —70 de ellos en B1, que es el valor por defecto—.
        // Esta pantalla es la única que le enseña el nivel al alumno, y
        // además calcula sobre él una estimación en horas y meses. Con
        // `false` la ficha añade la nota de «estimado».
        // ---------------------------------------------------------------
        nivelFiable={
          perfil
            ? nivelEsFiable(
                origenDelNivel(
                  perfil.nivelProfesor,
                  perfil.nivelFicha,
                  perfil.nivelPrueba,
                  perfil.nivel
                )
              )
            : false
        }
        // Sin estimación, pero con algo que decir: el alumno prepara el
        // examen de su propio nivel. Son los 41 que hasta ahora no veían
        // ningún banner. Ver `preparaSuPropioExamen`.
        preparaExamen={
          !estimacion && perfil !== null && nivel !== null
            ? preparaSuPropioExamen(
                [perfil.planContratado, perfil.objetivoSetter, perfil.objetivoPerfil],
                nivel
              )
            : false
        }
        horasSemanales={perfil?.horasSemanales ?? null}
        clasesContadas={recorrido.clasesContadas}
        estimacion={estimacion}
        objetivo={objetivo}
        puntosFuertes={perfil?.puntosFuertes ?? null}
        puntosDebiles={perfil?.puntosDebiles ?? null}
        focoRecomendado={perfil?.focoRecomendado ?? null}
        clases={recorrido.clases}
        urlAmpliar={URL_AMPLIAR}
      />
    </div>
  );
}
