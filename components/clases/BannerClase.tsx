// ---------------------------------------------------------------
// EL BANNER DE LA PRÓXIMA CLASE
//
// Una sola pieza para las dos pantallas que la enseñan, «Mis clases» y el
// inicio, para que no puedan decir cosas distintas.
//
// TODO LO DECIDE EL SERVIDOR, con su hora: cuál es la próxima clase
// (`proximaDelAlumno`), si la sala está abierta (`ventanaAbierta`) y si
// el enlace sirve (`enlaceDeClase`). Lo único que corre en el navegador
// es `RefrescoEnCortes`, que pide al servidor que vuelva a calcularlo al
// abrirse la sala y al terminar la clase.
//
// CON LA SALA CERRADA EL ENLACE NO SALE DEL SERVIDOR. El botón gris no es
// un `<a>` con el `href` escondido: es un `<button disabled>` sin enlace,
// y el `meet_link` no va ni en el HTML ni en las props de ningún
// componente de cliente. Se pinta solo cuando `ventanaAbierta` dice que
// sí.
//
// EL ENLACE ES EL QUE ABRE EL PROFESOR: el `meet_link` de la assignment
// del profesor que da esa clase (`vista_calendario_alumno`), como en el
// botón «Ingresar a clase» de Gestión. El botón del alumno no registra
// nada: ese clic es el del profesor, y es el que cuenta para su pago.
// ---------------------------------------------------------------

import { enlaceDeClase, ventanaAbierta, type ProximaClase } from "@/lib/clases";
import { diaLocal, sumarDias } from "@/lib/fechas";
import type { TextosClases } from "@/lib/textos/clases";
import RefrescoEnCortes from "@/components/clases/RefrescoEnCortes";

export default function BannerClase({
  proxima,
  t,
  ahora,
}: {
  proxima: ProximaClase;
  t: TextosClases;
  ahora: Date;
}) {
  return (
    <section
      className={`flex flex-col gap-5 rounded-2xl border p-5 sm:p-6 ${
        proxima.enCurso ? "border-marca-verde bg-marca-verdeFondo" : "border-marca-borde bg-white"
      }`}
    >
      <div className="flex flex-col gap-1.5">
        <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-marca-verdeOsc">
          {proxima.enCurso ? t.claseEnCurso : t.proximaClase}
        </p>

        {/* EL CUÁNDO, EN GRANDE. Es la respuesta a la pregunta con la que
            el alumno abre esta pantalla, así que va antes que nada. */}
        <p className="text-[26px] font-semibold leading-tight text-marca-tinta sm:text-[30px]">
          {cuando(proxima, t, ahora)}
        </p>

        <p className="text-[15px] text-marca-gris">
          <span className="tabular-nums">{t.franja(proxima.desde, proxima.hasta)}</span>{" "}
          <span className="text-[13px] text-marca-grisTenue">{t.horaDeMadrid}</span>
          {proxima.profesor && <> · {t.conProfesor(proxima.profesor)}</>}
        </p>
      </div>

      <BotonClase proxima={proxima} t={t} ahora={ahora} />

      <RefrescoEnCortes cortes={[proxima.abreEn.getTime(), proxima.terminaEn.getTime()]} />
    </section>
  );
}

/**
 * El botón, en sus tres formas:
 *
 *   sin enlace utilizable   el aviso de pedírselo al profesor, sin botón.
 *                           Un botón que no lleva a ningún sitio es peor
 *                           que no tener botón.
 *   sala abierta            el enlace, en verde.
 *   sala cerrada            el botón en gris, deshabilitado y SIN enlace,
 *                           con la nota de cuándo se abre.
 */
export function BotonClase({ proxima, t, ahora }: { proxima: ProximaClase; t: TextosClases; ahora: Date }) {
  const enlace = enlaceDeClase(proxima.meetLink);

  if (!enlace) {
    return (
      <p className="rounded-xl border border-marca-bordeSuave bg-marca-niebla px-4 py-3 text-[15px] font-semibold text-marca-tintaMedia">
        {t.sinEnlace}
      </p>
    );
  }

  if (ventanaAbierta(proxima, ahora)) {
    return (
      <a
        href={enlace}
        target="_blank"
        // `noopener` no es ceremonia: sin él, la pestaña que se abre puede
        // reescribir la que deja atrás, que es la sesión del alumno.
        rel="noopener noreferrer"
        className="inline-flex min-h-[48px] items-center justify-center rounded-xl bg-marca-verde px-6 text-[16px] font-semibold text-white transition-colors hover:bg-marca-verdeOsc focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marca-verdeOsc sm:self-start"
      >
        {t.unirse}
      </a>
    );
  }

  return (
    <div className="flex flex-col gap-1.5 sm:items-start">
      <button
        type="button"
        disabled
        className="inline-flex min-h-[48px] cursor-not-allowed items-center justify-center rounded-xl bg-marca-pista px-6 text-[16px] font-semibold text-marca-grisInactivo"
      >
        {t.unirse}
      </button>
      <p className="text-center text-[13px] text-marca-grisSuave sm:text-left">{t.seAbreAntes}</p>
    </div>
  );
}

/**
 * "hoy", "mañana" o "jueves 25 de septiembre".
 *
 * Se comparan DÍAS NATURALES ESPAÑOLES (`diaLocal`, `sumarDias`); restar
 * instantes daría "mañana" a las 23:00 de un día que en España ya es el
 * siguiente.
 */
export function cuando(proxima: ProximaClase, t: TextosClases, ahora: Date): string {
  const hoy = diaLocal(ahora);
  if (proxima.fecha === hoy) return t.hoy;
  if (proxima.fecha === sumarDias(hoy, 1)) return t.manana;

  const [, mes, dia] = proxima.fecha.split("-").map(Number);
  return t.fechaLarga(proxima.dia, dia, mes - 1);
}

/** La línea neutra que sustituye al banner cuando no hay próxima clase. */
export function SinProxima({ t }: { t: TextosClases }) {
  return (
    <p className="rounded-2xl border border-marca-borde bg-white px-5 py-4 text-[15px] text-marca-tintaMedia">
      {t.sinProxima}
    </p>
  );
}
