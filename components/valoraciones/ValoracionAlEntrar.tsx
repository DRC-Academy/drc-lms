import { valoracionPendiente } from "@/lib/valoraciones-servidor";
import PopupValoracion from "@/components/valoraciones/PopupValoracion";

/**
 * Si hay una clase que preguntar al entrar, el pop-up; si no, nada. Lo
 * monta el layout del alumno en su `<Suspense>`, así que una lectura lenta
 * no retrasa la página.
 *
 * El equipo revisando una ficha lo ve como ese alumno (`vistaPrevia`), y
 * entonces lo monta el marco (`app/(alumno)/@marco`), que sí cambia con
 * cada ficha. Nada de lo que haga se guarda.
 */
export default async function ValoracionAlEntrar({ alumnoId, vistaPrevia = false }: { alumnoId: string; vistaPrevia?: boolean }) {
  const pendiente = await valoracionPendiente(alumnoId);
  if (!pendiente) return null;
  return <PopupValoracion key={pendiente.claseId} claseId={pendiente.claseId} profesor={pendiente.profesor} vistaPrevia={vistaPrevia} />;
}
