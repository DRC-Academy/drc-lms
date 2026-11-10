import Link from "next/link";
import { textosActuales } from "@/lib/idioma-servidor";
import { conFoco } from "@/lib/foco";
import { TARJETA, TITULO_SECCION } from "@/components/base/Seccion";
import type { EstadoCurso } from "@/lib/cursos-servidor";

// ---------------------------------------------------------------
// «OTROS NIVELES»: LOS CURSOS QUE NO SON EL SUYO, EN EL INICIO DEL BLACK PASS
//
// El Black Pass abre los siete cursos, y se vendió así: el que no es «Tu
// curso» no está cerrado, está aquí. Cada fila abre el temario de ese curso
// SIN cambiar «Tu curso»: cambiar es una decisión aparte («Cambiar de curso»,
// o el selector dentro del curso).
//
// EL ORDEN ES EL DEL CATÁLOGO, no el de actividad: inglés general de A2 a C1 y
// después los exámenes de B1 a C1. Es una lista para encontrar un nivel, y
// así cada uno está siempre en el mismo sitio.
//
// Todo en tinta (regla de marca: nada de gris en los textos de apoyo). Sin una
// línea de cliente: son enlaces.
// ---------------------------------------------------------------

const ORDEN_NIVEL = ["A1", "A2", "B1", "B2", "C1", "C2"];

function clave(estado: EstadoCurso): number {
  const tipo = estado.curso.tipo === "general" ? 0 : 1;
  const nivel = ORDEN_NIVEL.indexOf(estado.curso.nivel);
  return tipo * 10 + (nivel === -1 ? 9 : nivel);
}

export default function OtrosNiveles({ estados, foco }: { estados: EstadoCurso[]; foco: string | null }) {
  if (estados.length === 0) return null;

  const t = textosActuales().pases;
  const ordenados = estados.slice().sort((a, b) => clave(a) - clave(b));

  return (
    <section aria-labelledby="otros-niveles">
      <h2 id="otros-niveles" className={TITULO_SECCION}>
        {t.otrosNiveles}
      </h2>

      <ul className={`${TARJETA} mt-3 divide-y divide-marca-borde overflow-hidden`}>
        {ordenados.map((estado) => (
          <li key={estado.curso.id}>
            <Link
              href={conFoco(`/curso/${estado.curso.slug}`, foco)}
              aria-label={t.abrirCurso(estado.curso.titulo)}
              className="flex min-h-[56px] items-center gap-3 px-5 py-3 transition-colors hover:bg-marca-niebla focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-marca-verdeOsc"
            >
              <span className="min-w-0 flex-1">
                <span className="block text-[15.5px] font-semibold leading-[1.3] text-marca-tinta">{estado.curso.titulo}</span>
                {estado.completadas > 0 && (
                  <span className="mt-0.5 block text-[13.5px] leading-[1.4] text-marca-tinta">
                    {t.leccionesHechas(estado.completadas, estado.total)}
                  </span>
                )}
              </span>
              <svg
                aria-hidden
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="shrink-0 text-marca-tinta"
              >
                <path d="m9 6 6 6-6 6" />
              </svg>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
