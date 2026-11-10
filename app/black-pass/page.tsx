import type { Metadata } from "next";
import { exigirAdministrador } from "@/lib/sesion-servidor";
import { cargarPanelPases } from "@/lib/pases-panel";
import { pasesActivos } from "@/lib/pases";
import PantallaBlackPass from "@/components/admin/PantallaBlackPass";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Black Pass · DRC Academy" };

/** «BLACK PASS»: pedidos, accesos y lo que haya que resolver a mano. Solo del equipo. */
export default async function BlackPass({ searchParams }: { searchParams: { q?: string } }) {
  await exigirAdministrador();
  const busqueda = typeof searchParams.q === "string" ? searchParams.q.trim() : "";
  return <PantallaBlackPass datos={await cargarPanelPases(busqueda)} busqueda={busqueda} activo={pasesActivos()} />;
}
