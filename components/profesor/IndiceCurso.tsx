import Link from "next/link";
import Chevron from "@/components/admin/Chevron";
import type { MesDelIndice } from "@/lib/panel-profesor-cursos";

// ---------------------------------------------------------------
// EL ÍNDICE DE UN CURSO, PARA EL PROFESOR
//
// No es el temario del alumno: aquí no hay progreso, ni «Continuar», ni
// candados, ni diploma. Son los meses, sus módulos y TODAS sus lecciones como
// enlaces directos, que es lo que hace falta para ir a revisar una.
//
// Con `<details>`: se abre sin JavaScript y el servidor decide cuál sale
// abierto, el mes del módulo del que se viene o, si no, el primero.
// ---------------------------------------------------------------

export default function IndiceCurso({
  meses,
  moduloActivo,
  hrefLeccion,
}: {
  meses: MesDelIndice[];
  moduloActivo: string | null;
  hrefLeccion: (leccionId: string) => string;
}) {
  if (meses.length === 0) {
    return <p className="mt-6 text-[15px] leading-[1.5] text-marca-tintaMedia">Este curso todavía no tiene contenido.</p>;
  }

  const abierto = meses.find((mes) => mes.modulos.some((m) => m.id === moduloActivo))?.numero ?? meses[0].numero;

  return (
    <div className="mt-6 flex flex-col gap-2.5">
      {meses.map((mes) => (
        <details key={mes.numero} open={mes.numero === abierto} className="group rounded-[14px] border border-marca-borde bg-white">
          <summary className="flex min-h-[64px] cursor-pointer list-none items-center gap-3 rounded-[14px] px-4 py-3 transition-colors hover:bg-marca-niebla lg:px-5 [&::-webkit-details-marker]:hidden">
            <span className="min-w-0 flex-1">
              <span className="block text-[11.5px] font-semibold uppercase leading-none tracking-[0.1em] text-marca-grisSuave">{mes.rotulo}</span>
              <span className="mt-1.5 block text-pretty text-[15.5px] font-semibold leading-[1.3] text-marca-tinta">{mes.titulo}</span>
            </span>
            <span className="shrink-0 text-[13px] text-marca-tintaMedia tabular-nums">{mes.lecciones} lecciones</span>
            <span className="shrink-0 rotate-90 text-marca-grisTenue transition-transform group-open:-rotate-90">
              <Chevron />
            </span>
          </summary>

          <div className="border-t border-marca-borde px-4 pb-3 lg:px-5">
            {mes.modulos.map((modulo) => (
              <section key={modulo.id} className="border-b border-marca-nieblaOscura py-3.5 last:border-b-0">
                <h2 className="text-[11.5px] font-semibold uppercase leading-[1.3] tracking-[0.08em] text-marca-grisSuave">{modulo.rotulo}</h2>
                <p className="mt-1 text-pretty text-[14.5px] font-semibold leading-[1.3] text-marca-tinta">{modulo.titulo}</p>

                {modulo.lecciones.length === 0 ? (
                  <p className="mt-1.5 text-[13.5px] text-marca-tintaMedia">Sin lecciones.</p>
                ) : (
                  <ol className="-mx-2 mt-1.5">
                    {modulo.lecciones.map((leccion) => (
                      <li key={leccion.id}>
                        <Link
                          href={hrefLeccion(leccion.id)}
                          prefetch={false}
                          className="flex min-h-[44px] items-center gap-3 rounded-[10px] px-2 py-2 transition-colors hover:bg-marca-niebla"
                        >
                          <span className="min-w-0 flex-1 text-pretty text-[14px] leading-[1.35] text-marca-tintaCuerpo">{leccion.titulo}</span>
                          <span className="shrink-0 rounded-full bg-marca-niebla px-2 py-[2px] text-[11px] font-semibold text-marca-grisSuave">{leccion.tipo}</span>
                        </Link>
                      </li>
                    ))}
                  </ol>
                )}
              </section>
            ))}
          </div>
        </details>
      ))}
    </div>
  );
}
