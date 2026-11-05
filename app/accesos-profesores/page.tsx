import type { Metadata } from "next";
import { exigirAdministrador } from "@/lib/sesion-servidor";
import { cargarPestanaProfesores } from "@/lib/panel-profesor-admin";
import PantallaProfesores from "@/components/admin/PantallaProfesores";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Acceso profesores · DRC Academy" };

/** «ACCESO PROFESORES»: quién puede entrar en el panel del profesor. Solo del equipo. */
export default async function AccesosProfesores() {
  await exigirAdministrador();
  return <PantallaProfesores filas={await cargarPestanaProfesores()} />;
}
