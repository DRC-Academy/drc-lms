// ---------------------------------------------------------------
// «MIS CLASES»
//
// Dos piezas: el banner de la próxima clase, que es lo que el alumno
// viene a mirar, y debajo el calendario de esta semana y las tres
// siguientes.
//
// TODO SALE DEL CALENDARIO DE SU PROFESOR EN GESTIÓN
// (`vista_calendario_alumno`, lógica copiada en
// `lib/calendario-gestion.ts`) y de las excepciones anotadas
// (`vista_excepciones_clase`): la próxima clase es `proximaDelAlumno`, la
// misma función que usa el inicio, y el calendario es `semanasDelAlumno`,
// que parte de las mismas clases y los mismos 'quita'.
//
// El banner es `BannerClase` y el calendario, `CalendarioClases`.
// ---------------------------------------------------------------

import { proximaDelAlumno, semanasDelAlumno } from "@/lib/clases";
import type { FilaCalendario } from "@/lib/calendario-gestion";
import type { TextosClases } from "@/lib/textos/clases";
import BannerClase, { SinProxima } from "@/components/clases/BannerClase";
import CalendarioClases from "@/components/clases/CalendarioClases";

export default function MisClases({
  calendario,
  excepciones,
  semana = 0,
  hrefSemana,
  t,
  ahora = new Date(),
}: {
  /** Las filas de `vista_calendario_alumno` del alumno. */
  calendario: FilaCalendario[];
  /** Las filas de `vista_excepciones_clase` del alumno, crudas. */
  excepciones: unknown;
  /** La semana del calendario que se enseña: 0 es la actual. */
  semana?: number;
  /** El enlace a otra semana del calendario. */
  hrefSemana: (indice: number) => string;
  t: TextosClases;
  /** La hora del SERVIDOR. Inyectable para fijarla en las pruebas visuales. */
  ahora?: Date;
}) {
  const proxima = proximaDelAlumno(calendario, excepciones, ahora);
  const semanas = semanasDelAlumno(calendario, excepciones, ahora);
  const indice = Math.min(Math.max(0, semana), semanas.length - 1);

  if (calendario.length === 0) return <SinHorario t={t} />;

  return (
    <div className="flex flex-col gap-8">
      {proxima ? <BannerClase proxima={proxima} t={t} ahora={ahora} /> : <SinProxima t={t} />}
      <CalendarioClases semanas={semanas} indice={indice} hrefSemana={hrefSemana} t={t} ahora={ahora} />
    </div>
  );
}

function SinHorario({ t }: { t: TextosClases }) {
  return (
    <section className="flex flex-col gap-2 rounded-[22px] border border-marca-borde bg-white p-6">
      <p className="font-display text-[18px] font-bold text-marca-tinta">{t.sinHorario}</p>
      <p className="text-[15px] leading-snug text-marca-gris">{t.sinHorarioAyuda}</p>
    </section>
  );
}
