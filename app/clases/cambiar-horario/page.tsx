import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { exigirAlumnoDeLaPagina } from "@/lib/sesion-servidor";
import { estadoDeAcceso } from "@/lib/estado-acceso";
import { autoservicioActivo, autoservicioSimuladoActivo, proveedorAutoservicio } from "@/lib/autoservicio";
import type { EstadoAutoservicio, LecturaAutoservicio } from "@/lib/autoservicio/tipos";
import { enlaceWhatsAppHorarios } from "@/lib/soporte";
import { idiomaActual, textosActuales } from "@/lib/idioma-servidor";
import CambiarHorario from "@/components/clases/autoservicio/CambiarHorario";
import FlujoNoDisponible from "@/components/clases/autoservicio/FlujoNoDisponible";

export const dynamic = "force-dynamic";

export function generateMetadata(): Metadata {
  return { title: `${textosActuales().autoservicio.cambiarHorario} · DRC Academy` };
}

/**
 * «CAMBIAR DE HORARIO», A PANTALLA COMPLETA.
 *
 * Fuera del grupo `(alumno)` a propósito: sin la barra ni las pestañas,
 * solo el flujo, con «Volver a mis clases» arriba (`MarcoFlujo`). El paso
 * va en `?paso=` y lo lleva el componente de cliente.
 *
 * SOLO EL PROPIO ALUMNO Y CON AUTOSERVICIO_ACTIVO. El equipo, o con el
 * interruptor apagado, vuelve a «Mis clases». Las acciones de servidor
 * lo comprueban otra vez (`app/acciones-autoservicio.ts`).
 *
 * El estado es el mismo de la tarjeta, con su caché de ~90 s por alumno.
 * Si ahora no puede (o Gestión no contesta), lo dice aquí mismo.
 */
export default async function PaginaCambiarHorario() {
  const { sesion, alumnoId } = await exigirAlumnoDeLaPagina();
  if (sesion.rol !== "alumno" || !autoservicioActivo()) redirect("/clases");
  // Pago pendiente: fuera del layout del alumno no hay aviso; en «Clases» sí.
  if ((await estadoDeAcceso(sesion)) === "impago") redirect("/clases");
  const whatsapp = enlaceWhatsAppHorarios(idiomaActual());

  let estado: LecturaAutoservicio<EstadoAutoservicio>;
  try {
    estado = await proveedorAutoservicio().estado(alumnoId);
  } catch (error) {
    console.error("[autoservicio] Falló la lectura del estado:", error);
    estado = { ok: false, codigo: "GENERICO" };
  }

  if (!estado.ok || !estado.datos.elegible) {
    const motivo = estado.ok ? estado.datos.motivoNoElegible ?? "GENERICO" : estado.codigo;
    return <FlujoNoDisponible que="horario" motivo={motivo} whatsapp={whatsapp} />;
  }

  return <CambiarHorario estado={estado.datos} whatsapp={whatsapp} simulado={autoservicioSimuladoActivo()} />;
}
