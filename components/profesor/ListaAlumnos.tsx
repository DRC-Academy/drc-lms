import Link from "next/link";
import Chevron from "@/components/admin/Chevron";
import { Tarjeta } from "@/components/panel/piezas";

// ---------------------------------------------------------------
// «MIS ALUMNOS»: LA LISTA
//
// Solo pinta: recibe filas ya autorizadas y resueltas. Sin datos de pago,
// suscripción, garantía ni valoraciones, que tampoco llegan hasta aquí.
// ---------------------------------------------------------------

export type FilaListaAlumno = {
  alumnoId: string;
  nombre: string;
  nivel: string | null;
  /** «Entró hoy», «Aún no ha entrado»… Null si no se ha podido leer. */
  ultimoAcceso: string | null;
  href: string;
};

export default function ListaAlumnos({ filas }: { filas: FilaListaAlumno[] }) {
  if (filas.length === 0) {
    return (
      <Tarjeta className="mt-6">
        <p className="text-[15px] leading-[1.5] text-marca-tintaMedia">Ahora mismo no tienes alumnos asignados.</p>
      </Tarjeta>
    );
  }

  return (
    <ul className="mt-6 overflow-hidden rounded-[14px] border border-marca-borde bg-white">
      {filas.map((fila) => (
        <li key={fila.alumnoId} className="border-b border-marca-borde last:border-b-0">
          <Link
            href={fila.href}
            prefetch={false}
            className="flex min-h-[64px] items-center gap-3 px-4 py-3 transition-colors hover:bg-marca-niebla lg:px-5"
          >
            <span className="min-w-0 flex-1">
              <span className="block text-[15.5px] font-semibold leading-[1.3] text-marca-tinta [overflow-wrap:anywhere]">
                {fila.nombre.trim() || "Sin nombre"}
              </span>
              {fila.ultimoAcceso && (
                <span className="mt-0.5 block text-[13px] leading-[1.35] text-marca-tintaMedia">{fila.ultimoAcceso}</span>
              )}
            </span>
            {fila.nivel && (
              <span className="shrink-0 rounded-full bg-marca-verdeFondo px-2.5 py-0.5 text-[12.5px] font-semibold text-marca-verdeOsc">
                {fila.nivel}
              </span>
            )}
            <span className="shrink-0 text-marca-grisTenue">
              <Chevron />
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
