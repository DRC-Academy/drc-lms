import { redirect } from "next/navigation";
import { obtenerPerfil, obtenerRecorrido } from "@/lib/gestion";
import { calcularEstimacion, nivelEfectivo } from "@/lib/estimacion";
import { exigirSesion } from "@/lib/sesion-servidor";
import { cursosAsignados } from "@/lib/cursos-servidor";
import Cabecera from "@/components/Cabecera";
import Resumen from "@/components/progreso/Resumen";
import Recorrido from "@/components/progreso/Recorrido";
import Ritmo from "@/components/progreso/Ritmo";

export const dynamic = "force-dynamic";

/**
 * A dónde lleva "Amplía tu plan". Configurable sin tocar código.
 *
 * SIN `NEXT_PUBLIC_`, al revés que en Gestión, porque allí el banner es
 * un componente de cliente y aquí la pantalla entera se resuelve en el
 * servidor. Una URL no es un secreto, pero si no hace falta cruzar al
 * navegador, no cruza.
 */
const URL_AMPLIAR = process.env.URL_AMPLIAR_PLAN || "https://drcacademy.com/mi-cuenta";

/**
 * El progreso del alumno, como cuarta sección.
 *
 * ESTA PANTALLA YA EXISTÍA, EN EL OTRO LADO. Vive en DRC Gestión como
 * `/progreso/{token}` y solo la ve quien recibe el enlace de su profesor.
 * Aquí no hace falta token: el LMS ya sabe quién ha entrado, así que la
 * sección es suya y está donde vive el resto de su producto. Misma razón
 * por la que no hay `/progreso/{id}`, igual que en "Para ti": el progreso
 * es el de quien mira, y el equipo —que no es alumno de nada— se va al
 * buscador.
 *
 * MISMO MARCO QUE EL INICIO Y "PARA TI": fondo `marca-niebla`, columna
 * `max-w-contenido` y los mismos márgenes.
 *
 * QUÉ NO SE ENSEÑA, y es deliberado: errores detectados, notas para el
 * profesor, señal de riesgo y la puntuación de progreso. Es la misma
 * línea que traza la página de Gestión, y por el mismo motivo: son
 * papeles internos y delante del alumno no dicen nada que pueda usar.
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
  // 404, es una pantalla con menos cosas. Un alumno puede tener clases
  // analizadas y no tener fila en la vista de perfiles.
  const cursos = perfil ? await cursosAsignados(perfil.plan, perfil.nivel, alumnoId) : [];

  const primerNombre = perfil?.nombre.trim().split(/\s+/)[0] ?? "";

  // EL NIVEL, CON LA PRIORIDAD DE GESTIÓN. La columna `nivel` de la
  // vista es lo que tecleó quien dio de alta al alumno, que allí es la
  // fuente de MENOR prioridad. Con las dos columnas nuevas se aplica la
  // misma regla y el alumno sale en el mismo peldaño en las dos
  // pantallas; sin ellas esto se queda exactamente en lo de antes.
  const nivel = perfil
    ? nivelEfectivo(perfil.nivelFicha, perfil.nivelPrueba, perfil.nivel)
    : null;

  // Null mientras no se corra `gestion-vista-perfil-ritmo.sql` (faltan
  // las horas), y también cuando el alumno ya está en C2 o ya está en el
  // nivel del examen que prepara. En los tres casos no hay banner, que
  // es preferible a inventarle una fecha.
  const estimacion = perfil
    ? calcularEstimacion({
        nivelActual: nivel,
        horasSemanales: perfil.horasSemanales,
        // Los mismos tres textos que mira Gestión, en el mismo orden.
        textosDelPlan: [perfil.planContratado, perfil.objetivoSetter, perfil.objetivoPerfil],
      })
    : null;

  return (
    <div className="flex min-h-screen flex-col bg-marca-niebla">
      <Cabecera
        nombre={perfil?.nombre.trim() || undefined}
        alumnoId={alumnoId}
        cursoSlug={cursos[0]?.slug ?? null}
        seccion="progreso"
      />

      <main className="mx-auto flex w-full max-w-contenido flex-1 flex-col px-4 pb-[64px] pt-[18px] lg:px-9 lg:pt-8">
        {/* El titular lleva su nombre porque toda la pantalla va de él, y
            porque la frase de abajo la firma una persona. */}
        <h1 className="text-[22px] font-bold tracking-[-0.015em] text-marca-tinta min-[900px]:text-[26px]">
          {primerNombre ? `Esto es lo que llevas, ${primerNombre}` : "Esto es lo que llevas"}
        </h1>

        <p className="mb-5 mt-1.5 text-[14px] leading-[1.55] text-marca-gris min-[900px]:mb-6 min-[900px]:text-[15px]">
          Tu nivel, las clases que has hecho y lo que habéis trabajado en cada una.
        </p>

        <Resumen nivel={nivel} totalClases={recorrido.totalClases} />

        <Recorrido
          clases={recorrido.clases}
          totalClases={recorrido.totalClases}
          profesor={perfil?.profesor ?? ""}
        />

        {/* EL RITMO VA DESPUÉS DEL RECORRIDO, y en Gestión va antes de su
            línea de tiempo. El cambio es a propósito.
            Allí la pantalla es un informe que se manda por enlace y se
            lee de una vez. Aquí es una sección del producto a la que el
            alumno entra por su cuenta, y lo que ha venido a ver es lo que
            su profesor escribió de él. Un bloque oscuro con una oferta
            por delante lo obliga a pasar por caja para llegar a lo suyo.
            Detrás, la oferta llega cuando ya ha visto lo que le estamos
            dando, que además es cuando mejor se recibe. */}
        {estimacion && <Ritmo estimacion={estimacion} urlAmpliar={URL_AMPLIAR} />}
      </main>
    </div>
  );
}
