import Link from "next/link";
import { ALUMNOS } from "@/lib/data";

export default function Home() {
  return (
    <main className="max-w-2xl mx-auto px-6 py-12 sm:py-16">
      <p className="text-xs tracking-widest uppercase text-marca-verde mb-2">
        DRC Academy · prototipo
      </p>
      <h1 className="font-display text-3xl sm:text-4xl font-bold leading-tight mb-2">
        Tu práctica, hecha con tus clases
      </h1>
      <p className="text-slate-600 mb-10">
        Elige un alumno de prueba. Los bloques están generados a partir de lo que trabajó en sus
        últimas clases.
      </p>

      <div className="space-y-3">
        {ALUMNOS.map((a) => (
          <Link
            key={a.id}
            href={`/alumno/${a.id}`}
            className="flex items-center gap-4 bg-white rounded-2xl p-5 shadow-sm border-2 border-transparent hover:border-marca-borde transition"
          >
            <span className="w-11 h-11 rounded-full grid place-items-center font-display font-bold text-white bg-marca-verde shrink-0">
              {a.nombre[0]}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-display font-semibold">
                {a.nombre} · {a.nivel}
              </span>
              <span className="block text-sm text-slate-500 truncate">
                Última clase: {a.clases[0].tema}
              </span>
            </span>
            <span className="text-slate-400">→</span>
          </Link>
        ))}
      </div>
    </main>
  );
}
