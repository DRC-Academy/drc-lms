"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { usarIdioma } from "@/components/ProveedorIdioma";
import type { CambioProfesorPosible, CodigoAutoservicio } from "@/lib/autoservicio/tipos";
import MarcoFlujo from "@/components/clases/autoservicio/MarcoFlujo";
import { BOTON_LINEA, PanelNoSePudo, sePuedeReintentar } from "@/components/clases/autoservicio/Piezas";

/**
 * La página de un flujo cuando ahora no se puede: entró por un enlace
 * viejo, Gestión no contesta o algo cambió desde que vio «Mis clases».
 * El mismo marco, el porqué (con su fecha si se sabe) y el WhatsApp. Si
 * es que Gestión no contesta, «Probar otra vez» vuelve a pedir la página.
 */
export default function FlujoNoDisponible({
  que,
  motivo,
  cambio = null,
  whatsapp,
}: {
  que: "horario" | "profesor";
  motivo: CodigoAutoservicio;
  /** En el de profesor, lo que dijo Gestión: así sale desde cuándo podrá. */
  cambio?: Extract<CambioProfesorPosible, { puede: false }> | null;
  whatsapp: string;
}) {
  const t = usarIdioma().t.autoservicio;
  const router = useRouter();
  const reintentar = sePuedeReintentar(motivo);
  const texto = cambio ? t.profesorNoDisponible(cambio) : que === "profesor" ? t.motivoProfesor(motivo) : t.motivoAlLeer(motivo);

  return (
    <MarcoFlujo
      t={t}
      titulo={que === "horario" ? t.cambiarHorario : t.cambiarProfesor}
      paso={null}
      clave="no-disponible"
      accion={
        <Link href="/clases" className={BOTON_LINEA}>
          {t.volverAMisClases}
        </Link>
      }
    >
      {reintentar && !cambio ? (
        <PanelNoSePudo t={t} whatsapp={whatsapp} titulo={t.sinConexionTitulo} texto={t.sinConexionTexto} alReintentar={() => router.refresh()} />
      ) : (
        <PanelNoSePudo t={t} whatsapp={whatsapp} texto={texto} />
      )}
    </MarcoFlujo>
  );
}
