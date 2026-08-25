import { redirect } from "next/navigation";
import { obtenerPerfil, obtenerRecorrido } from "@/lib/gestion";
import { nivelMcer } from "@/lib/recorrido";
import { exigirSesion } from "@/lib/sesion-servidor";
import { cursosAsignados } from "@/lib/cursos-servidor";
import Cabecera from "@/components/Cabecera";
import Resumen from "@/components/progreso/Resumen";
import Recorrido from "@/components/progreso/Recorrido";

export const dynamic = "force-dynamic";

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

        <Resumen nivel={nivelMcer(perfil?.nivel)} totalClases={recorrido.totalClases} />

        <Recorrido
          clases={recorrido.clases}
          totalClases={recorrido.totalClases}
          profesor={perfil?.profesor ?? ""}
        />
      </main>
    </div>
  );
}
