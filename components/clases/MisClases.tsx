// ---------------------------------------------------------------
// «MIS CLASES»
//
// Dos piezas y nada más: el banner de la próxima clase, que es lo único
// que el alumno viene a mirar, y debajo el horario de la semana para
// que sepa que no se ha perdido nada.
//
// TODO SALE DEL CALENDARIO DE SU PROFESOR EN GESTIÓN
// (`vista_calendario_alumno`, lógica copiada en
// `lib/calendario-gestion.ts`): la próxima clase, con sus recuperaciones
// y sin las cancelaciones anotadas, y el horario, que son las celdas
// recurrentes del grid. Es la misma función que usa el inicio
// (`proximaDelAlumno`), así que las dos pantallas dicen la misma clase.
//
// UNA FILA POR DÍA DE CLASE, no una franja semanal. Un alumno con
// miércoles y viernes tiene DOS clases, no un bloque que va del
// miércoles al viernes; y uno con dos horas seguidas el mismo día tiene
// UNA de dos horas, no dos filas. Esa distinción la resuelve entera
// `agruparPorDia` en `lib/clases.ts`; aquí solo se pinta lo que llega.
//
// El banner, con su botón y su ventana, es `BannerClase`.
// ---------------------------------------------------------------

import {
  agruparPorDia,
  normalizarSlots,
  proximaDelAlumno,
  type DiaDeClase,
} from "@/lib/clases";
import { horarioDelAlumno, type FilaCalendario } from "@/lib/calendario-gestion";
import type { TextosClases } from "@/lib/textos/clases";
import BannerClase, { SinProxima } from "@/components/clases/BannerClase";

export default function MisClases({
  calendario,
  quitas,
  t,
  ahora = new Date(),
}: {
  /** Las filas de `vista_calendario_alumno` del alumno. */
  calendario: FilaCalendario[];
  /** Los 'quita' de `vista_excepciones_clase`, crudos. */
  quitas: unknown;
  t: TextosClases;
  /** La hora del SERVIDOR. Inyectable para fijarla en las pruebas visuales. */
  ahora?: Date;
}) {
  const dias = agruparPorDia(normalizarSlots(horarioDelAlumno(calendario)));
  const proxima = proximaDelAlumno(calendario, quitas, ahora);

  if (dias.length === 0 && !proxima) return <SinHorario t={t} />;

  return (
    <div className="flex flex-col gap-7">
      {proxima ? <BannerClase proxima={proxima} t={t} ahora={ahora} /> : <SinProxima t={t} />}

      {dias.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-marca-grisSuave">
            {t.tuHorario}
          </h2>

          <ul className="flex flex-col gap-2">
            {dias.map((dia) => (
              <Fila
                key={`${dia.dia}-${dia.desde}`}
                dia={dia}
                t={t}
                // El día que toca se marca también en la lista: si no, el
                // banner y el horario se leen como dos cosas distintas y
                // el alumno tiene que buscar en cuál de las filas está.
                // Una recuperación no es ninguna fila del horario.
                esProxima={
                  proxima !== null &&
                  !proxima.esRecuperacion &&
                  proxima.dia === dia.dia &&
                  proxima.desde === dia.desde
                }
              />
            ))}
          </ul>

          <p className="pt-1 text-[12px] text-marca-grisTenue">{t.horaDeEspana}</p>
        </section>
      )}
    </div>
  );
}

// ---------------------------------------------------------------
// EL HORARIO
// ---------------------------------------------------------------

function Fila({ dia, t, esProxima }: { dia: DiaDeClase; t: TextosClases; esProxima: boolean }) {
  return (
    <li
      className={`flex items-center justify-between gap-4 rounded-xl border px-4 py-3 ${
        esProxima ? "border-marca-verde bg-marca-verdeFondo" : "border-marca-borde bg-white"
      }`}
    >
      <span className="text-[15px] font-semibold capitalize text-marca-tinta">
        {t.nombreDia(dia.dia)}
      </span>
      <span className="flex items-baseline gap-2 text-right">
        <span className="text-[15px] tabular-nums text-marca-tinta">
          {t.franja(dia.desde, dia.hasta)}
        </span>
        <span className="text-[13px] text-marca-grisSuave">{t.duracion(dia.horas)}</span>
      </span>
    </li>
  );
}

function SinHorario({ t }: { t: TextosClases }) {
  return (
    <section className="flex flex-col gap-2 rounded-2xl border border-marca-borde bg-white p-6">
      <p className="text-[17px] font-semibold text-marca-tinta">{t.sinHorario}</p>
      <p className="text-[15px] leading-snug text-marca-gris">{t.sinHorarioAyuda}</p>
    </section>
  );
}
