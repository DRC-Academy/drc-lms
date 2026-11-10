import { redirect } from "next/navigation";
import { accesoPorAlumno } from "@/lib/acceso-alumno";
import { cursosDelInicio } from "@/lib/cursos-servidor";
import { obtenerPerfil } from "@/lib/gestion";
import { nivelDelAlumno } from "@/lib/estimacion";
import { conFoco } from "@/lib/foco";
import { cursoElegido } from "@/lib/pases";
import { exigirAlumnoDeLaPagina } from "@/lib/sesion-servidor";
import ListaCursos from "@/components/pases/ListaCursos";
import MarcoDeLaPagina from "@/components/marco/MarcoDeLaPagina";

export const dynamic = "force-dynamic";

/**
 * ELEGIR CURSO: la primera entrada de quien solo tiene pase, y el «Cambiar de
 * curso» de quien tiene todos abiertos. Sin prueba de nivel: que elija, y que
 * pueda cambiar cuando quiera. Su progreso en cada curso se queda guardado.
 */
export default async function ElegirCurso() {
  const alumno = await exigirAlumnoDeLaPagina();
  const { sesion, alumnoId, paraEnlaces } = alumno;
  const acceso = await accesoPorAlumno(alumnoId);
  if (acceso.cursos !== "todos") redirect(conFoco(`/alumno/${alumnoId}`, paraEnlaces));

  const [perfil, elegido] = await Promise.all([obtenerPerfil(alumnoId), cursoElegido(alumnoId)]);
  const estados = perfil ? await cursosDelInicio(alumnoId, perfil.plan, nivelDelAlumno(alumnoId, perfil), null) : [];

  return (
    <div className="flex min-h-screen flex-col bg-marca-niebla">
      <MarcoDeLaPagina alumno={alumno} />
      <ListaCursos
        estados={estados}
        elegido={elegido}
        hrefRevision={sesion.rol === "alumno" ? null : (slug) => conFoco(`/curso/${slug}`, paraEnlaces)}
      />
    </div>
  );
}
