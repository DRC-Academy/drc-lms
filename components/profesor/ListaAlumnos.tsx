import Link from "next/link";
import Chevron from "@/components/admin/Chevron";
import { Tarjeta } from "@/components/panel/piezas";

// ---------------------------------------------------------------
// «MIS ALUMNOS»: LA LISTA
//
// Solo pinta: recibe filas ya autorizadas y resueltas. Sin datos de pago,
// suscripción, garantía ni valoraciones, que tampoco llegan hasta aquí. En
// el móvil, cada alumno en su bloque; en escritorio, en columnas.
// ---------------------------------------------------------------

export type FilaListaAlumno = {
  alumnoId: string;
  nombre: string;
  nivel: string | null;
  /** «Entró hoy», «Aún no ha entrado»… Null si no se ha podido leer. */
  ultimoAcceso: string | null;
  /** «Hoy, 18:00». Null: sin próxima clase, o no se ha podido leer. */
  proxima: string | null;
  calendarioLeido: boolean;
  semana: number | null;
  /** Null: no se ha podido leer. */
  practico: boolean | null;
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
      {filas.map((fila) => {
        const detalle = [
          fila.semana ? `Semana ${fila.semana}` : null,
          fila.practico === null ? null : fila.practico ? "Ha practicado esta semana" : "Sin práctica esta semana",
          fila.ultimoAcceso,
        ].filter(Boolean);

        return (
          <li key={fila.alumnoId} className="border-b border-marca-borde last:border-b-0">
            <Link
              href={fila.href}
              prefetch={false}
              className="flex min-h-[64px] items-center gap-3 px-4 py-3 transition-colors hover:bg-marca-niebla lg:px-5"
            >
              <span className="grid min-w-0 flex-1 grid-cols-1 gap-y-0.5 lg:grid-cols-[minmax(0,1.1fr)_170px_minmax(0,1.5fr)] lg:items-center lg:gap-x-5">
                <span className="text-[15.5px] font-semibold leading-[1.3] text-marca-tinta [overflow-wrap:anywhere]">
                  {fila.nombre.trim() || "Sin nombre"}
                </span>
                <span className={`text-[13.5px] leading-[1.35] ${fila.proxima ? "font-medium text-marca-verdeOsc" : "text-marca-tintaMedia"}`}>
                  {fila.proxima ? `Clase: ${fila.proxima}` : fila.calendarioLeido ? "Sin próxima clase" : "Clase: no se ha podido leer"}
                </span>
                <span className="text-[13px] leading-[1.35] text-marca-tintaMedia">{detalle.join(" · ")}</span>
              </span>
              <span className="flex shrink-0 justify-end lg:w-[40px]">
                {fila.nivel && (
                  <span className="rounded-full bg-marca-verdeFondo px-2.5 py-0.5 text-[12.5px] font-semibold text-marca-verdeOsc">
                    {fila.nivel}
                  </span>
                )}
              </span>
              <span className="shrink-0 text-marca-grisTenue">
                <Chevron />
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
