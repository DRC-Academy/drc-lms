import { valoracionPendiente } from "@/lib/valoraciones-servidor";
import { avisoParaTiPendiente } from "@/lib/aviso-para-ti-servidor";
import PopupValoracion from "@/components/valoraciones/PopupValoracion";
import AvisoParaTi from "@/components/aviso-para-ti/AvisoParaTi";
import { conFoco } from "@/lib/foco";
import { accesoPorAlumno } from "@/lib/acceso-alumno";

/**
 * EL POP-UP AL ENTRAR: como mucho uno.
 *
 * Prioridad: pago pendiente > valorar la última clase > aviso de «Para
 * ti». El de pago no llega aquí: con la suscripción en espera el layout
 * del alumno no monta nada más. Entre los otros dos decide esto, y en el
 * navegador comparten la marca de la visita (`CLAVE_VISITA`), así que
 * cerrar la valoración y recargar no hace salir el de «Para ti» en la
 * misma visita.
 *
 * Lo monta el layout del alumno en su `<Suspense>`; al equipo revisando
 * una ficha, cada página (`components/marco/MarcoDeLaPagina.tsx`), con
 * `vistaPrevia`.
 */
export default async function PopupAlEntrar({ alumnoId, vistaPrevia = false }: { alumnoId: string; vistaPrevia?: boolean }) {
  const acceso = await accesoPorAlumno(alumnoId);

  const pendiente = acceso.clases ? await valoracionPendiente(alumnoId) : null;
  if (pendiente) {
    return <PopupValoracion key={pendiente.claseId} claseId={pendiente.claseId} profesor={pendiente.profesor} vistaPrevia={vistaPrevia} />;
  }

  if (acceso.paraTi && (await avisoParaTiPendiente(alumnoId))) {
    const href = conFoco("/practica?empezar=1", vistaPrevia ? alumnoId : null);
    return <AvisoParaTi href={href} vistaPrevia={vistaPrevia} />;
  }

  return null;
}
