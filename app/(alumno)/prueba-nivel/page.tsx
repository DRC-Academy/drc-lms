import { redirect } from "next/navigation";
import { accesoPorAlumno } from "@/lib/acceso-alumno";
import { cursoElegido } from "@/lib/pases";
import { conFoco } from "@/lib/foco";
import { exigirAlumnoDeLaPagina } from "@/lib/sesion-servidor";
import { puedeHacerPrueba, vistaInicial } from "@/lib/prueba-nivel/servidor";
import MarcoDeLaPagina from "@/components/marco/MarcoDeLaPagina";
import PruebaNivel from "@/components/prueba-nivel/PruebaNivel";

export const dynamic = "force-dynamic";

/**
 * LA PRUEBA DE NIVEL. Se llega desde el bloque del inicio del Black Pass (o
 * de elegir curso). Abre donde toque: la pregunta en la que se quedó, el
 * resultado si ya la hizo, o la bienvenida. `?repetir=1` abre la bienvenida
 * para hacerla otra vez aunque ya tenga resultado.
 *
 * Quien no puede hacerla (interruptor apagado, o tiene plan con profesor)
 * vuelve a su inicio. Ver `puedeHacerPrueba`.
 */
export default async function Pagina({ searchParams }: { searchParams: { repetir?: string } }) {
  const alumno = await exigirAlumnoDeLaPagina();
  const { sesion, alumnoId, paraEnlaces } = alumno;
  const hrefInicio = conFoco(`/alumno/${alumnoId}`, paraEnlaces);

  if (!puedeHacerPrueba(await accesoPorAlumno(alumnoId))) redirect(hrefInicio);

  const [vista, elegido] = await Promise.all([vistaInicial(alumnoId, searchParams.repetir === "1"), cursoElegido(alumnoId)]);

  return (
    <div className="flex min-h-screen flex-col bg-marca-niebla">
      <MarcoDeLaPagina alumno={alumno} />
      <PruebaNivel vista={vista} cursoActualId={elegido} hrefInicio={hrefInicio} soloLectura={sesion.rol !== "alumno"} />
    </div>
  );
}
