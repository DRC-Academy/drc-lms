import Link from "next/link";
import { PROFESOR_DE_PRUEBA, type Exclusiones } from "@/lib/panel-metricas";
import { diaLocal } from "@/lib/fechas";
import { diaCorto, numero } from "@/lib/panel-formato";
import MarcoApp from "@/components/Navegacion";
import Chevron from "@/components/admin/Chevron";
import { ErrorLectura, Tarjeta } from "@/components/panel/piezas";

/** La pantalla de /exclusiones, con los datos ya leídos (`cargarExclusiones`). */
export default function PantallaExclusiones({ datos }: { datos: Exclusiones }) {
  const { cuentas, sinExcluir } = datos;
  return (
    <MarcoApp datos={{ alumnoId: "", nombre: "", miCurso: null, foco: null, revisando: false }}>
      <main className="mx-auto w-full max-w-[1240px] px-5 pb-16 pt-4 lg:px-10 lg:pb-20 lg:pt-9">
        <Link href="/" className="-ml-1 inline-flex min-h-[44px] items-center gap-1 px-1 text-[13.5px] font-semibold text-marca-verdeOsc lg:min-h-0">
          <Chevron direccion="izquierda" />
          Panel
        </Link>
        <h1 className="mt-2 font-display text-[26px] font-bold leading-[1.1] tracking-[-0.01em] text-marca-tinta lg:text-[32px]">Cuentas excluidas</h1>
        <p className="mt-2 max-w-[70ch] text-pretty text-[13.5px] leading-[1.5] text-marca-tintaMedia">
          No cuentan en ninguna cifra del panel: cuentas de demostración, de pruebas y del equipo. La lista se cambia a mano en la base del LMS, por
          alumno, con su motivo. Además, nunca cuentan los bloques que genera el equipo revisando una ficha.
        </p>

        {sinExcluir === null ? (
          <p className="mt-5 rounded-[12px] border border-marca-borde bg-[#F7F9F7] px-4 py-3 text-[13.5px] text-marca-tintaMedia">
            No se ha podido comprobar si hay alumnos del profesor de prueba ({PROFESOR_DE_PRUEBA}) sin excluir: hace falta la columna{" "}
            <code>profesor_id</code> en Gestión.
          </p>
        ) : (
          sinExcluir.length > 0 && (
            <section aria-labelledby="sin-excluir" className="mt-5 rounded-[14px] border border-[#E9D9A6] bg-[#FFF9E8] p-[18px] lg:p-[22px]">
              <h2 id="sin-excluir" className="font-display text-[17px] font-semibold text-marca-tinta">
                {sinExcluir.length === 1 ? "1 posible cuenta de prueba sin excluir" : `${numero(sinExcluir.length)} posibles cuentas de prueba sin excluir`}
              </h2>
              <p className="mt-1 text-[13.5px] text-marca-tintaMedia">
                Están asignadas al profesor de prueba de Gestión ({PROFESOR_DE_PRUEBA}) y cuentan en el panel. Si son del equipo, añádelas a la lista.
              </p>
              <ul className="mt-2.5 space-y-1 text-[14px]">
                {sinExcluir.map((a) => (
                  <li key={a.alumnoId}>
                    <b className="font-semibold text-marca-tinta">{a.nombre || "Sin nombre"}</b>{" "}
                    <code className="text-[12.5px] text-marca-grisSuave">{a.alumnoId}</code>
                  </li>
                ))}
              </ul>
            </section>
          )
        )}

        <Tarjeta className="mt-5">
          {cuentas === null ? (
            <ErrorLectura que="la lista de exclusiones" />
          ) : (
            <>
              <p className="text-[13.5px] text-marca-tintaMedia">{numero(cuentas.length)} cuentas</p>
              <div className="-mx-[18px] mt-2 overflow-x-auto px-[18px] lg:-mx-[22px] lg:px-[22px]">
                <table className="w-full min-w-[640px] border-collapse text-[14px]">
                  <thead>
                    <tr>
                      {["Alumno", "alumno_id", "Motivo", "Alta"].map((c) => (
                        <th key={c} className="whitespace-nowrap border-b border-marca-borde px-2.5 py-2 text-left text-[12.5px] font-medium text-marca-grisSuave">
                          {c}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {cuentas.map((c) => (
                      <tr key={c.alumnoId}>
                        <td className="whitespace-nowrap border-b border-marca-nieblaOscura px-2.5 py-[9px] font-medium text-marca-tinta">
                          {c.nombre ?? <span className="font-normal text-marca-grisSuave">Sin ficha en Gestión</span>}
                        </td>
                        <td className="whitespace-nowrap border-b border-marca-nieblaOscura px-2.5 py-[9px]">
                          <code className="text-[12.5px] text-marca-tintaMedia">{c.alumnoId}</code>
                        </td>
                        <td className="border-b border-marca-nieblaOscura px-2.5 py-[9px] text-marca-tintaMedia">{c.motivo}</td>
                        <td className="whitespace-nowrap border-b border-marca-nieblaOscura px-2.5 py-[9px] tabular-nums text-marca-tintaMedia">
                          {c.desde ? (() => {
                            const dia = diaLocal(new Date(c.desde));
                            return `${diaCorto(dia)} ${dia.slice(0, 4)}`;
                          })() : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </Tarjeta>
      </main>
    </MarcoApp>
  );
}
