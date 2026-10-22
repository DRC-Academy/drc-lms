import { valoracionPendiente } from "@/lib/valoraciones-servidor";
import PopupValoracion from "@/components/valoraciones/PopupValoracion";

/**
 * Si hay una clase que preguntar al entrar, el pop-up; si no, nada. Lo
 * monta el layout del alumno en su `<Suspense>`, así que una lectura lenta
 * no retrasa la página. Solo para el propio alumno: el equipo revisando
 * una ficha no ve preguntas de nadie.
 */
export default async function ValoracionAlEntrar({ alumnoId }: { alumnoId: string }) {
  const pendiente = await valoracionPendiente(alumnoId);
  if (!pendiente) return null;
  return <PopupValoracion claseId={pendiente.claseId} profesor={pendiente.profesor} />;
}
