import Link from "next/link";
import type { DiscrepanciaProfesor } from "@/lib/admin-servidor";

/**
 * «PROFESOR DISTINTO DEL DE LA FICHA»: los alumnos a los que el
 * calendario o la última clase les ponen otro profesor que su ficha.
 *
 * Al alumno se le nombra siempre el de la ficha (`profesorDelAlumno`), así
 * que esto no se le nota a él: se le nota al equipo aquí, para corregir
 * la ficha o el calendario en Gestión si el cambio es de verdad. Un
 * suplente puntual también sale, y no hay que hacer nada con él.
 *
 * Sin discrepancias no se pinta nada.
 */
export default function DiscrepanciasProfesor({ alumnos }: { alumnos: DiscrepanciaProfesor[] }) {
  if (alumnos.length === 0) return null;

  return (
    <section aria-labelledby="discrepancias-profesor" className="mt-10">
      <h2 id="discrepancias-profesor" className="font-display text-[19px] font-bold text-marca-tinta lg:text-[22px]">
        Profesor distinto del de la ficha
      </h2>
      <p className="mt-1.5 max-w-[70ch] text-pretty text-[14px] leading-[1.5] text-marca-gris">
        El alumno ve siempre el profesor de su ficha. Aquí salen los {alumnos.length} a los que el calendario o la
        última clase les ponen otro: un suplente no necesita nada; un cambio de profesor, corregir la ficha en Gestión.
      </p>

      <div className="mt-4 overflow-x-auto rounded-[14px] border border-marca-borde bg-white">
        <table className="w-full min-w-[560px] border-collapse text-left text-[14px]">
          <thead>
            <tr className="border-b border-marca-borde text-[12px] uppercase tracking-[0.06em] text-marca-grisSuave">
              <th scope="col" className="px-4 py-2.5 font-semibold">Alumno</th>
              <th scope="col" className="px-4 py-2.5 font-semibold">Ficha</th>
              <th scope="col" className="px-4 py-2.5 font-semibold">Calendario</th>
              <th scope="col" className="px-4 py-2.5 font-semibold">Última clase</th>
            </tr>
          </thead>
          <tbody>
            {alumnos.map((a) => (
              <tr key={a.alumnoId} className="border-b border-marca-nieblaOscura last:border-0">
                <td className="px-4 py-2.5">
                  <Link
                    href={`/alumno/${a.alumnoId}`}
                    className="font-medium text-marca-tinta underline-offset-4 hover:text-marca-verdeOsc hover:underline"
                  >
                    {a.nombre}
                  </Link>
                </td>
                <td className="px-4 py-2.5 text-marca-tinta">{a.ficha}</td>
                <td className="px-4 py-2.5 text-marca-gris">{a.calendario.length > 0 ? a.calendario.join(", ") : "—"}</td>
                <td className="px-4 py-2.5 text-marca-gris">{a.ultimaClase ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
