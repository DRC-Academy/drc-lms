import "server-only";
import Link from "next/link";
import { listarRecuperaciones } from "@/lib/recuperaciones";
import { diasParaProponer } from "@/lib/recuperaciones-fechas";
import { diaLocal } from "@/lib/fechas";
import { textosActuales } from "@/lib/idioma-servidor";
import Recuperaciones from "@/components/clases/Recuperaciones";

/**
 * Las recuperaciones de «Mis clases», pedidas a Gestión.
 *
 * Va aparte de la pantalla y dentro de un `<Suspense>` en la página: si
 * Gestión tarda, el horario y el historial salen igual y esto llega
 * después, en su hueco.
 */
export default async function RecuperacionesDeGestion({
  alumnoId,
  resaltada,
  soloLectura,
}: {
  alumnoId: string;
  resaltada: string | null;
  soloLectura: boolean;
}) {
  const lista = await listarRecuperaciones(alumnoId);
  return (
    <Recuperaciones
      lista={lista}
      dias={diasParaProponer(diaLocal(new Date()))}
      resaltada={resaltada}
      soloLectura={soloLectura}
      t={textosActuales().recuperaciones}
    />
  );
}

/**
 * EL AVISO DEL INICIO: hay una clase cancelada esperando a que el alumno
 * elija fecha. Solo eso —lo demás no le pide nada—, y si Gestión no
 * contesta, no sale: el inicio no es el sitio para decir que algo falla.
 */
export async function AvisoRecuperacion({ alumnoId, href }: { alumnoId: string; href: string }) {
  const lista = await listarRecuperaciones(alumnoId);
  if (!lista.ok) return null;
  const pendientes = lista.recuperaciones.filter((r) => r.estado === "esperando_alumno").length;
  if (pendientes === 0) return null;

  const t = textosActuales().recuperaciones;
  return (
    <div className="entra mb-4 min-[900px]:mb-5">
      <AvisoRecuperacionVista pendientes={pendientes} href={href} t={t} />
    </div>
  );
}

/** La pieza del aviso, sin carga: la usa también la pantalla de prueba. */
export function AvisoRecuperacionVista({
  pendientes,
  href,
  t,
}: {
  pendientes: number;
  href: string;
  t: ReturnType<typeof textosActuales>["recuperaciones"];
}) {
  return (
    <section
      role="status"
      className="flex flex-col gap-3 rounded-[16px] border border-[#F2D77A] bg-[#FFF8DE] p-4 shadow-[0_10px_24px_rgba(18,33,26,0.07)] min-[600px]:flex-row min-[600px]:items-center min-[600px]:justify-between min-[900px]:rounded-[20px] min-[900px]:px-6"
    >
      <p className="flex items-center gap-2.5 text-pretty font-display text-[17.5px] font-bold leading-snug text-marca-tinta">
        <svg aria-hidden viewBox="0 0 20 20" width="22" height="22" className="shrink-0 text-marca-amarilloTexto" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <rect x="3" y="4.5" width="14" height="12.5" rx="2.5" />
          <path d="M3 8.5h14M7 2.8v3.2M13 2.8v3.2" />
        </svg>
        {t.avisoInicio(pendientes)}
      </p>
      <Link
        href={href}
        className="btn-verde inline-flex min-h-[48px] shrink-0 items-center justify-center rounded-full px-6 text-[15.5px] font-bold"
      >
        {t.elegirFecha}
      </Link>
    </section>
  );
}
