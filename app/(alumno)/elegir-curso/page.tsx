import { redirect } from "next/navigation";
import { accesoPorAlumno } from "@/lib/acceso-alumno";
import { cursosDelInicio } from "@/lib/cursos-servidor";
import { obtenerPerfil } from "@/lib/gestion";
import { nivelDelAlumno } from "@/lib/estimacion";
import { conFoco } from "@/lib/foco";
import { cursoElegido } from "@/lib/pases";
import { exigirAlumnoDeLaPagina } from "@/lib/sesion-servidor";
import ListaCursos from "@/components/pases/ListaCursos";
import BloquePruebaNivel from "@/components/prueba-nivel/BloquePruebaNivel";
import { estadoDelBloque, puedeHacerPrueba } from "@/lib/prueba-nivel/servidor";
import MarcoDeLaPagina from "@/components/marco/MarcoDeLaPagina";

export const dynamic = "force-dynamic";

/**
 * ELEGIR CURSO: la primera entrada de quien solo tiene pase, y el «Cambiar de
 * curso» de quien tiene todos abiertos. Que elija, y que pueda cambiar cuando
 * quiera; su progreso en cada curso se queda guardado. Arriba, si toca, el
 * bloque de la prueba de nivel (`puedeHacerPrueba`): la primera entrada viene
 * aquí y no al inicio, así que es donde la ve primero.
 */
export default async function ElegirCurso() {
  const alumno = await exigirAlumnoDeLaPagina();
  const { sesion, alumnoId, paraEnlaces } = alumno;
  const acceso = await accesoPorAlumno(alumnoId);
  if (acceso.cursos !== "todos") redirect(conFoco(`/alumno/${alumnoId}`, paraEnlaces));

  const conPrueba = puedeHacerPrueba(acceso);
  const [perfil, elegido, estadoPrueba] = await Promise.all([
    obtenerPerfil(alumnoId),
    cursoElegido(alumnoId),
    conPrueba ? estadoDelBloque(alumnoId) : Promise.resolve(null),
  ]);
  const estados = perfil ? await cursosDelInicio(alumnoId, perfil.plan, nivelDelAlumno(alumnoId, perfil), null) : [];

  return (
    <div className="flex min-h-screen flex-col bg-marca-niebla">
      <MarcoDeLaPagina alumno={alumno} />
      <ListaCursos
        estados={estados}
        elegido={elegido}
        hrefRevision={sesion.rol === "alumno" ? null : (slug) => conFoco(`/curso/${slug}`, paraEnlaces)}
        arriba={
          estadoPrueba && (
            <BloquePruebaNivel estado={estadoPrueba} cursoActualId={elegido} foco={paraEnlaces} revisando={sesion.rol !== "alumno"} />
          )
        }
      />
    </div>
  );
}
