import Link from "next/link";
import { notFound } from "next/navigation";
import { ALUMNOS, getAlumno, getBloque } from "@/lib/data";
import ListaBloques from "@/components/ListaBloques";

export function generateStaticParams() {
  return ALUMNOS.map((a) => ({ id: a.id }));
}

export default function PerfilAlumno({ params }: { params: { id: string } }) {
  const alumno = getAlumno(params.id);
  if (!alumno) notFound();

  const bloques = alumno.bloques.map(getBloque).filter(Boolean) as NonNullable<
    ReturnType<typeof getBloque>
  >[];

  return (
    <main className="max-w-2xl mx-auto px-6 py-10 sm:py-14">
      <Link href="/" className="text-sm text-slate-500 hover:text-marca-tinta">
        ← Cambiar de alumno
      </Link>

      <h1 className="font-display text-3xl sm:text-4xl font-bold mt-6 mb-1">
        Hola, {alumno.nombre}
      </h1>
      <p className="text-slate-600 mb-8">
        Nivel {alumno.nivel} · clases con {alumno.profesor}
      </p>

      <div className="bg-white rounded-2xl p-6 mb-4 shadow-sm">
        <p className="text-xs tracking-widest uppercase text-slate-400 mb-4">
          Lo que vienes trabajando
        </p>
        <div className="space-y-3">
          {alumno.clases.map((c, k) => (
            <div key={k} className="flex gap-4">
              <span className="text-xs text-slate-400 w-14 shrink-0 pt-0.5">{c.fecha}</span>
              <div
                className={`border-l-2 pl-4 ${k === 0 ? "border-marca-verde" : "border-marca-borde"}`}
              >
                <p className="text-sm font-medium">{c.tema}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl bg-marca-tinta p-6 mb-8">
        <p className="text-xs tracking-widest uppercase text-marca-amarillo mb-3">Vas bien en</p>
        <div className="flex flex-wrap gap-2">
          {alumno.logros.map((l) => (
            <span key={l} className="text-sm text-white/90 bg-white/10 rounded-full px-3 py-1">
              {l}
            </span>
          ))}
        </div>
      </div>

      <h2 className="font-display text-xl font-bold mb-1">Tus bloques de esta semana</h2>
      <p className="text-sm text-slate-500 mb-5">
        Cada bloque va de reconocer la forma a producirla tú solo. Cinco minutos cada uno.
      </p>
      <ListaBloques bloques={bloques} alumnoId={alumno.id} />
    </main>
  );
}
