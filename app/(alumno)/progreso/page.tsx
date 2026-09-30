import { profesorDelAlumno } from "@/lib/profesor-servidor";
import { obtenerPerfil, obtenerRecorrido } from "@/lib/gestion";
import { nivelDelAlumno, nivelMostrado } from "@/lib/estimacion";
import { construirEstimacion } from "@/lib/estimacion-ficha";
import { textoParaElAlumno } from "@/lib/texto-alumno";
import { objetivoDelAlumno } from "@/lib/objetivo-servidor";
import { exigirAlumnoDeLaPagina } from "@/lib/sesion-servidor";
import { cursosDelInicio } from "@/lib/cursos-servidor";
import { rutaDeMiCurso } from "@/lib/cursos";
import { calcularDiploma } from "@/lib/diploma";
import { conFoco } from "@/lib/foco";
import { comoFecha } from "@/lib/fechas";
import { RUTA_AMPLIAR } from "@/lib/ampliar-plan";
import Ficha from "@/components/progreso/Ficha";

export const dynamic = "force-dynamic";

/**
 * A dónde lleva "Amplía tu plan".
 *
 * DESDE SEPTIEMBRE DE 2026, A UNA RUTA DEL LMS (`RUTA_AMPLIAR`), que en el
 * momento del clic decide si abre la sesión de la tienda con el puente
 * (`app/ampliar-plan`, `wordpress/drc-desde-lms.php`) o manda al enlace
 * de siempre. Lo que sigue describe ese enlace de siempre, que es
 * `urlAmpliarPlan()` y sigue siendo configurable sin tocar código.
 *
 * EL DESTINO DE VERDAD ES EL CAMBIO DE PLAN DE WOOCOMMERCE: la misma URL
 * que el botón "Aumentar o Disminuir Plan" de la pestaña Suscripción de
 * Mi cuenta (/producto/…/?switch-subscription=…&item=…&_wcsnonce=…). Esa
 * URL lleva un nonce que solo WordPress puede generar para el usuario
 * logueado, así que aquí no se construye ni se adivina: el botón apunta
 * a Mi cuenta con el parámetro `drc-ampliar-plan`, y el snippet
 * `wordpress/drc-ampliar-plan.php` la convierte en el switch al vuelo,
 * en el servidor de WordPress. Sin ese snippet activo, el alumno se
 * queda en Mi cuenta, y no rebota al LMS: la redirección de /mi-cuenta/
 * al LMS no actúa cuando lleva parámetros (resuelto en WordPress). El
 * valor por defecto vive con el resto de la cuenta, en `lib/cuenta-woo`, y
 * la lectura de la variable en `lib/ampliar-plan`, que comparte con la
 * comparativa de ritmo del inicio.
 *
 * Es el mismo sitio al que lleva el botón de la ficha de DRC Gestión.
 * Allí se resuelve por otro camino —un postMessage al iframe de Mi
 * cuenta, porque la ficha vive embebida—; aquí el alumno está en otra
 * web y no hay padre a quien pedírselo.
 *
 * SIN `NEXT_PUBLIC_`, al revés que en Gestión, porque allí el banner es
 * un componente de cliente y aquí la pantalla entera se resuelve en el
 * servidor. Una URL no es un secreto, pero si no hace falta cruzar al
 * navegador, no cruza.
 */
const URL_AMPLIAR = RUTA_AMPLIAR;

/**
 * El progreso del alumno, como cuarta sección.
 *
 * ES LA MISMA FICHA QUE `/progreso/{token}` DE DRC GESTIÓN (la rediseñada
 * el 30/09/2026), replicada bloque a bloque: mismo orden, mismo copy y
 * mismo CSS. Ver la cabecera
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
  const { alumnoId, paraEnlaces } = await exigirAlumnoDeLaPagina();

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
  //
  // Los cursos, con su estado y no solo su fila: la cabecera necesita a
  // qué lección lleva «Mi curso», y ese es el mismo cálculo del inicio
  // (`cursosDelInicio`), para que la pestaña apunte al mismo sitio en
  // todas las pantallas.
  const [estadosCurso, objetivo] = await Promise.all([
    perfil
      ? cursosDelInicio(
          alumnoId,
          perfil.plan,
          nivelDelAlumno(alumnoId, perfil),
          comoFecha(perfil.fechaInicio)
        )
      : Promise.resolve([]),
    objetivoDelAlumno(alumnoId, perfil?.objetivoPerfil ?? null),
  ]);
  const principal = estadosCurso[0];

  // EL NIVEL, CON LA PRIORIDAD DE GESTIÓN. La columna `nivel` de la
  // vista es lo que tecleó quien dio de alta al alumno, que allí es la
  // fuente de MENOR prioridad. Con las dos columnas nuevas se aplica la
  // misma regla y el alumno sale en el mismo peldaño en las dos
  // pantallas; sin ellas esto se queda en el de siempre.
  //
  // El valor y la marca salen de la MISMA llamada (`nivelMostrado`), la
  // de «Cómo vas»: un alumno congelado enseña el nivel del alta y la
  // marca del alta, no el de un origen y la marca de otro.
  const profe = perfil ? await profesorDelAlumno(alumnoId) : null;
  const mostrado = perfil ? nivelMostrado(alumnoId, perfil, profe?.nombre ?? null) : null;
  const nivel = mostrado?.nivel ?? null;

  // LA ESTIMACIÓN DE GESTIÓN, NO LA DEL INICIO (`lib/estimacion-ficha.ts`):
  // las mismas cinco fuentes en el mismo orden —el producto de WooCommerce
  // primero—, para que esta pantalla y la ficha de Gestión nombren la misma
  // meta. Null solo sin horas semanales (o sin la columna, mientras no se
  // corra `gestion-vista-perfil-ritmo.sql`): entonces no hay banner de ritmo.
  const estimacion = perfil
    ? construirEstimacion({
        nivelActual: nivel,
        horasSemanales: perfil.horasSemanales,
        fuentes: {
          productoWoo: perfil.producto,
          planAlumno: perfil.plan,
          planAssignment: perfil.planContratado,
          objetivo: perfil.objetivoSetter,
          objetivoPersonal: textoParaElAlumno(perfil.objetivoPerfil),
        },
      })
    : null;

  return (
    <div className="flex min-h-screen flex-col">

      <Ficha
        nombre={perfil?.nombre ?? ""}
        nivel={nivel}
        estimacion={estimacion}
        objetivo={objetivo}
        puntosFuertes={perfil?.puntosFuertes ?? null}
        puntosDebiles={perfil?.puntosDebiles ?? null}
        focoRecomendado={perfil?.focoRecomendado ?? null}
        clases={recorrido.clases}
        urlAmpliar={URL_AMPLIAR}
        // LAS LECCIONES DEL DIPLOMA, con el mismo cálculo que
        // `/api/externo/diploma` (lo que Gestión nos pide por HTTP): el curso
        // principal manda. La CUENTA ATRÁS sale de `fechaInicio`, como en
        // Gestión: seis meses desde que empezó.
        diploma={calcularDiploma(principal?.completadas ?? 0, principal?.total ?? 0)}
        fechaInicio={perfil?.fechaInicio ?? null}
        // A dónde lleva la tarjeta del diploma: el mismo destino que la
        // pestaña «Mi curso» de la cabecera, con el foco de revisión.
        hrefCurso={principal ? conFoco(rutaDeMiCurso(principal), paraEnlaces) : "/"}
      />
    </div>
  );
}
