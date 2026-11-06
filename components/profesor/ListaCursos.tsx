import Link from "next/link";
import Chevron from "@/components/admin/Chevron";
import { Tarjeta } from "@/components/panel/piezas";

// ---------------------------------------------------------------
// «CURSOS»: LA LISTA
//
// Todos los cursos activos, separados en inglés general y exámenes. Solo
// pinta lo que le llega ya resuelto.
// ---------------------------------------------------------------

export type FilaCurso = {
  slug: string;
  titulo: string;
  nivel: string;
  esExamen: boolean;
  modulos: number;
  lecciones: number;
  href: string;
};

function Grupo({ titulo, filas }: { titulo: string; filas: FilaCurso[] }) {
  if (filas.length === 0) return null;

  return (
    <section className="mt-7">
      <h2 className="text-[12px] font-semibold uppercase leading-none tracking-[0.1em] text-marca-grisSuave">{titulo}</h2>
      <ul className="mt-3 overflow-hidden rounded-[14px] border border-marca-borde bg-white">
        {filas.map((fila) => (
          <li key={fila.slug} className="border-b border-marca-borde last:border-b-0">
            <Link href={fila.href} prefetch={false} className="flex min-h-[64px] items-center gap-3 px-4 py-3 transition-colors hover:bg-marca-niebla lg:px-5">
              <span className="min-w-0 flex-1">
                <span className="block text-[15.5px] font-semibold leading-[1.3] text-marca-tinta [overflow-wrap:anywhere]">{fila.titulo}</span>
                <span className="mt-0.5 block text-[13px] leading-[1.35] text-marca-tintaMedia">
                  {fila.modulos} módulos · {fila.lecciones} lecciones
                </span>
              </span>
              <span className="shrink-0 rounded-full bg-marca-verdeFondo px-2.5 py-0.5 text-[12.5px] font-semibold text-marca-verdeOsc">{fila.nivel}</span>
              <span className="shrink-0 text-marca-grisTenue">
                <Chevron />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function ListaCursos({ filas }: { filas: FilaCurso[] }) {
  if (filas.length === 0) {
    return (
      <Tarjeta className="mt-6">
        <p className="text-[15px] leading-[1.5] text-marca-tintaMedia">Ahora mismo no hay cursos que enseñar.</p>
      </Tarjeta>
    );
  }

  return (
    <>
      <Grupo titulo="Inglés general" filas={filas.filter((f) => !f.esExamen)} />
      <Grupo titulo="Exámenes" filas={filas.filter((f) => f.esExamen)} />
    </>
  );
}
