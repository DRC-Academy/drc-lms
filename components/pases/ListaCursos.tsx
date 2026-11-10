import Link from "next/link";
import type { ReactNode } from "react";
import { elegirCurso } from "@/app/acciones-curso";
import { textosActuales } from "@/lib/idioma-servidor";
import type { CursoFila } from "@/lib/cursos-servidor";

export type CursoParaElegir = {
  curso: Pick<CursoFila, "id" | "slug" | "titulo" | "tipo">;
  completadas: number;
  total: number;
};

/**
 * Los cursos para elegir, agrupados: inglés general y exámenes. Móvil primero:
 * a 375 px el botón va debajo del título y a lo ancho. Sin una línea de cliente:
 * es un formulario de HTML.
 *
 * `hrefRevision`: el equipo revisando no elige, porque le cambiaría el curso al
 * alumno. Sus botones solo abren el curso.
 */
export default function ListaCursos({
  estados,
  elegido,
  hrefRevision,
  arriba = null,
}: {
  estados: CursoParaElegir[];
  elegido: string | null;
  hrefRevision: ((slug: string) => string) | null;
  /** Lo que va antes del título: el bloque de la prueba de nivel, si toca. */
  arriba?: ReactNode;
}) {
  const t = textosActuales().pases;
  const grupos = [
    { titulo: t.grupoGeneral, estados: estados.filter((e) => e.curso.tipo === "general") },
    { titulo: t.grupoExamen, estados: estados.filter((e) => e.curso.tipo === "examen") },
  ];

  return (
    <main className="mx-auto w-full max-w-[720px] flex-1 px-5 pb-[120px] pt-6 min-[900px]:pt-10">
      {arriba && <div className="mb-7">{arriba}</div>}
      <h1 className="text-balance font-display text-[26px] font-bold leading-[1.15] text-marca-tinta min-[900px]:text-[32px]">
        {t.elegirTitulo}
      </h1>
      <p className="mt-2 text-pretty text-[15px] leading-[1.5] text-marca-tintaMedia">
        {elegido ? t.elegirCambiarBajada : t.elegirBajada}
      </p>

      {grupos.map(
        (grupo) =>
          grupo.estados.length > 0 && (
            <section key={grupo.titulo} className="mt-7">
              <h2 className="text-[13px] font-semibold uppercase tracking-[0.06em] text-marca-gris">{grupo.titulo}</h2>
              <ul className="mt-3 flex flex-col gap-3">
                {grupo.estados.map((estado) => (
                  <li key={estado.curso.id}>
                    <FilaCurso estado={estado} actual={estado.curso.id === elegido} hrefRevision={hrefRevision} />
                  </li>
                ))}
              </ul>
            </section>
          )
      )}
    </main>
  );
}

function FilaCurso({
  estado,
  actual,
  hrefRevision,
}: {
  estado: CursoParaElegir;
  actual: boolean;
  hrefRevision: ((slug: string) => string) | null;
}) {
  const t = textosActuales().pases;
  const empezado = estado.completadas > 0;
  const boton =
    "inline-flex min-h-[48px] w-full items-center justify-center rounded-full px-5 text-[15px] font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marca-verdeOsc min-[520px]:w-auto";
  // `drc-verde-solido`: con el blanco da 5,5:1. Ver `ParaTiBloqueado`.
  const principal = `${boton} bg-drc-verde-solido text-white hover:bg-marca-tinta`;
  const secundario = `${boton} border border-marca-borde bg-white text-marca-tinta hover:bg-marca-niebla`;
  const texto = actual ? t.actual : empezado ? t.elegir : t.empezar;

  return (
    <div className="flex flex-col gap-3 rounded-[16px] border border-marca-borde bg-white px-5 py-4 min-[520px]:flex-row min-[520px]:items-center min-[520px]:justify-between">
      <div className="min-w-0">
        <p className="font-display text-[17px] font-semibold leading-[1.25] text-marca-tinta">{estado.curso.titulo}</p>
        {empezado && (
          <p className="mt-1 text-[13.5px] leading-[1.4] text-marca-tintaMedia">{t.leccionesHechas(estado.completadas, estado.total)}</p>
        )}
      </div>

      {hrefRevision ? (
        <Link href={hrefRevision(estado.curso.slug)} className={`${principal} shrink-0`}>
          {texto}
        </Link>
      ) : (
        <form action={elegirCurso} className="shrink-0">
          <input type="hidden" name="curso" value={estado.curso.id} />
          <button type="submit" className={actual ? secundario : principal}>
            {texto}
          </button>
        </form>
      )}
    </div>
  );
}
