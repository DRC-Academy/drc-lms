// ---------------------------------------------------------------
// «MIS CLASES»
//
// Dos piezas y nada más: el banner de la próxima clase, que es lo único
// que el alumno viene a mirar, y debajo el horario de la semana para
// que sepa que no se ha perdido nada.
//
// UNA FILA POR DÍA DE CLASE, no una franja semanal. Un alumno con
// miércoles y viernes tiene DOS clases, no un bloque que va del
// miércoles al viernes; y uno con dos horas seguidas el mismo día tiene
// UNA de dos horas, no dos filas. Esa distinción la resuelve entera
// `agruparPorDia` en `lib/clases.ts`; aquí solo se pinta lo que llega.
//
// EL BOTÓN SOLO EXISTE SI HAY SALA. `enlaceDeClase` devuelve null para
// los diecisiete alumnos cuyo `meet_link` está vacío o lleva texto que
// no es un enlace, y entonces el banner enseña el horario igual y
// cambia el botón por el aviso de pedírselo al profesor. Un botón que
// no lleva a ningún sitio es peor que no tener botón: el alumno lo
// pulsa a la hora de su clase, no pasa nada, y cree que ha llegado
// tarde.
//
// TODO ES SERVIDOR. No hay estado, no hay interacción salvo un enlace, y
// la hora se resuelve con `Intl` anclado a Europe/Madrid, que da el
// mismo resultado en el servidor y en el navegador. Marcarlo como
// cliente solo serviría para mandar JavaScript que no hace nada.
// ---------------------------------------------------------------

import {
  agruparPorDia,
  enlaceDeClase,
  normalizarSlots,
  proximaClase,
  type DiaDeClase,
  type ProximaClase,
} from "@/lib/clases";
import { diaLocal, sumarDias } from "@/lib/fechas";
import type { TextosClases } from "@/lib/textos/clases";

export default function MisClases({
  slots,
  meetLink,
  profesor,
  t,
  ahora = new Date(),
}: {
  /** Crudo de la vista de Gestión. Lo valida `normalizarSlots`. */
  slots: unknown;
  /** Crudo de `assignments.meet_link`. Lo valida `enlaceDeClase`. */
  meetLink: string | null;
  profesor: string;
  t: TextosClases;
  /** Inyectable para poder fijar el instante en las pruebas visuales. */
  ahora?: Date;
}) {
  const dias = agruparPorDia(normalizarSlots(slots));
  const proxima = proximaClase(dias, ahora);
  const enlace = enlaceDeClase(meetLink);

  if (dias.length === 0) return <SinHorario t={t} />;

  return (
    <div className="flex flex-col gap-7">
      {proxima && (
        <Banner proxima={proxima} enlace={enlace} profesor={profesor} t={t} ahora={ahora} />
      )}

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
              esProxima={
                proxima !== null && proxima.dia === dia.dia && proxima.desde === dia.desde
              }
            />
          ))}
        </ul>

        <p className="pt-1 text-[12px] text-marca-grisTenue">{t.horaDeEspana}</p>
      </section>
    </div>
  );
}

// ---------------------------------------------------------------
// EL BANNER
// ---------------------------------------------------------------

function Banner({
  proxima,
  enlace,
  profesor,
  t,
  ahora,
}: {
  proxima: ProximaClase;
  enlace: string | null;
  profesor: string;
  t: TextosClases;
  ahora: Date;
}) {
  return (
    <section
      className={`flex flex-col gap-5 rounded-2xl border p-5 sm:p-6 ${
        proxima.enCurso
          ? "border-marca-verde bg-marca-verdeFondo"
          : "border-marca-borde bg-white"
      }`}
    >
      <div className="flex flex-col gap-1.5">
        <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-marca-verdeOsc">
          {proxima.enCurso ? t.claseEnCurso : t.proximaClase}
        </p>

        {/* EL CUÁNDO, EN GRANDE. Es la respuesta a la pregunta con la que
            el alumno abre esta pantalla, así que va antes que nada y sin
            nada del mismo tamaño al lado. */}
        <p className="text-[26px] font-semibold leading-tight text-marca-tinta sm:text-[30px]">
          {cuando(proxima, t, ahora)}
        </p>

        <p className="text-[15px] text-marca-gris">
          {t.franja(proxima.desde, proxima.hasta)}
          {profesor.trim() !== "" && <> · {t.conProfesor(profesor.trim())}</>}
        </p>
      </div>

      {enlace ? (
        <a
          href={enlace}
          target="_blank"
          // `noopener` no es ceremonia: sin él, la pestaña que se abre
          // puede reescribir la que deja atrás, que es la sesión del
          // alumno.
          rel="noopener noreferrer"
          className="inline-flex min-h-[48px] items-center justify-center rounded-xl bg-marca-verde px-6 text-[16px] font-semibold text-white transition-colors hover:bg-marca-verdeOsc focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marca-verdeOsc sm:self-start"
        >
          {t.unirse}
        </a>
      ) : (
        // SIN SALA NO HAY BOTÓN APAGADO. Un botón deshabilitado le dice
        // al alumno "aquí había algo y hoy no va"; lo que pasa de verdad
        // es que ese enlace nunca se escribió, y lo único que puede
        // hacer es pedírselo a su profesor. Así que se dice.
        <div className="flex flex-col gap-1 rounded-xl border border-marca-bordeSuave bg-marca-niebla px-4 py-3">
          <p className="text-[15px] font-semibold text-marca-tintaMedia">{t.sinEnlace}</p>
          <p className="text-[14px] leading-snug text-marca-gris">{t.sinEnlaceAyuda}</p>
        </div>
      )}
    </section>
  );
}

/**
 * "hoy", "mañana" o "jueves 25 de septiembre".
 *
 * HOY Y MAÑANA GANAN A LA FECHA porque es como se habla: nadie dice "mi
 * clase es el 25 de septiembre" cuando es mañana. Y para saber cuál de
 * los tres es hay que comparar DÍAS NATURALES ESPAÑOLES, que es lo que
 * dan `diaLocal` y `sumarDias`; restar instantes daría "mañana" a las
 * 23:00 de un día que en España ya es el siguiente.
 */
function cuando(proxima: ProximaClase, t: TextosClases, ahora: Date): string {
  const hoy = diaLocal(ahora);
  if (proxima.fecha === hoy) return t.hoy;
  if (proxima.fecha === sumarDias(hoy, 1)) return t.manana;

  const [, mes, dia] = proxima.fecha.split("-").map(Number);
  return t.fechaLarga(proxima.dia, dia, mes - 1);
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
