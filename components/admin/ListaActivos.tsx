import Link from "next/link";
import type { AlumnoPanel } from "@/lib/admin-servidor";

/**
 * TODOS LOS ALUMNOS ACTIVOS, DEBAJO DEL PANEL DE MÓVIL.
 *
 * El panel cabe en una pantalla de iPhone SE, y en cualquier teléfono
 * más alto dejaba debajo doscientos píxeles vacíos. Lo que va ahí es la
 * lista completa —los 177 por orden alfabético, la misma que en
 * escritorio abre «Todos los alumnos»— porque es lo que menos compite
 * con las cifras y lo único que además sirve: la otra forma de llegar a
 * una ficha, con el pulgar y sin teclear, como la agenda del teléfono.
 *
 * SOLO MÓVIL. En escritorio la lista ya está debajo de las métricas y se
 * filtra desde ellas; aquí no filtra nada ni se filtra: es la agenda.
 * Sin email, como todo el panel. Y sin buscador propio: el de arriba ya
 * busca entre estos mismos.
 */
export default function ListaActivos({ alumnos }: { alumnos: AlumnoPanel[] }) {
  if (alumnos.length === 0) return null;

  return (
    <section className="mt-4 lg:hidden" aria-label="Alumnos activos">
      <div className="flex items-baseline justify-between gap-3 px-0.5">
        <p className="text-[10.5px] font-semibold uppercase leading-none tracking-[0.12em] text-marca-grisSuave">
          Alumnos activos
        </p>
        <span className="text-[11.5px] tabular-nums text-marca-grisTenue">{alumnos.length} · A–Z</span>
      </div>

      <ul className="mt-2 overflow-hidden rounded-[16px] border border-marca-borde bg-white">
        {alumnos.map((alumno) => (
          <li key={alumno.alumnoId} className="border-b border-marca-nieblaOscura last:border-b-0">
            <Link
              href={`/alumno/${alumno.alumnoId}`}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3.5 py-2.5 pl-4 pr-3.5 transition-colors hover:bg-marca-niebla"
            >
              <span className="min-w-0">
                <span className="block text-pretty text-[14px] font-semibold leading-[1.3] text-marca-tinta">
                  {alumno.nombre || "Sin nombre"}
                </span>
                <span className="mt-0.5 block truncate text-[12.5px] text-marca-grisSuave">
                  {alumno.nivel || "sin nivel"}
                  {alumno.profesor ? ` · ${alumno.profesor}` : ""}
                </span>
              </span>
              <span aria-hidden className="text-[13px] text-marca-grisTenue">
                →
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <p className="mt-3.5 text-center text-[12px] tabular-nums text-marca-grisTenue">
        {alumnos.length} alumnos activos
      </p>
    </section>
  );
}
