// ---------------------------------------------------------------
// EL BANNER DE LA PRÓXIMA CLASE
//
// Una sola pieza para los tres sitios que enseñan la próxima clase: la
// tarjeta de «Mis clases», la franja del inicio mientras la sala está
// abierta (`FranjaClase`) y la línea de debajo del saludo cuando no lo
// está (`LineaClase`). Así no pueden decir cosas distintas ni verse
// distintas.
//
// EL LENGUAJE ES EL DE LA RUTA DE «PARA TI» (`components/practica/Ruta.tsx`),
// no uno nuevo: la clase es la parada que viene en el camino del alumno.
// El disco con sombra sólida debajo —el que se lee como pulsable—, la
// chapa redondeada con su colita, amarilla solo cuando la sala está
// abierta (es el «Estás aquí» de la clase), y los titulares en Radio
// Canada Big extranegrita, como el resto de la app.
//
// LA JERARQUÍA: la hora, lo más grande; luego el día y el profesor; luego
// el botón. El texto del botón va en negrita a 19px: blanco sobre el
// verde de acción da 3,5:1, y a ese tamaño y peso cuenta como texto
// grande, que pide 3:1.
//
// TODO LO DECIDE EL SERVIDOR, con su hora: cuál es la próxima clase
// (`proximaDelAlumno`), si la sala está abierta (`ventanaAbierta`) y si
// el enlace sirve (`enlaceDeClase`). Lo único que corre en el navegador
// es `RefrescoEnCortes`, que pide al servidor que vuelva a calcularlo al
// abrirse la sala y al terminar la clase.
//
// CON LA SALA CERRADA EL ENLACE NO SALE DEL SERVIDOR. El botón gris es un
// `<button disabled>` sin enlace, y el `meet_link` no va ni en el HTML ni
// en las props de ningún componente de cliente.
//
// EL ENLACE ES EL QUE ABRE EL PROFESOR: el `meet_link` de la assignment
// del profesor que da esa clase (`vista_calendario_alumno`), como en el
// botón «Ingresar a clase» de Gestión. El botón del alumno no registra
// nada: ese clic es el del profesor, y es el que cuenta para su pago.
// ---------------------------------------------------------------

import type { ReactNode } from "react";
import { enlaceDeClase, ventanaAbierta, type ProximaClase } from "@/lib/clases";
import { diaLocal, sumarDias } from "@/lib/fechas";
import type { TextosClases } from "@/lib/textos/clases";
import AvatarProfesor from "@/components/AvatarProfesor";
import RefrescoEnCortes from "@/components/clases/RefrescoEnCortes";

/**
 * La tarjeta de la próxima clase.
 *
 * `ilustracion` es la mascota, que en el inicio se queda al cambiar la
 * franja del curso por la de la clase. `secundario` es la línea de debajo
 * del botón. `refresco` monta los dos cortes de la ventana; el inicio los
 * monta él mismo, así que ahí va apagado.
 */
export default function BannerClase({
  proxima,
  t,
  ahora,
  ilustracion,
  secundario,
  refresco = true,
}: {
  proxima: ProximaClase;
  t: TextosClases;
  ahora: Date;
  ilustracion?: ReactNode;
  secundario?: ReactNode;
  refresco?: boolean;
}) {
  const abierta = ventanaAbierta(proxima, ahora);
  const chapa = abierta ? (proxima.enCurso ? t.claseEnCurso : t.empiezaPronto) : t.proximaClase;

  return (
    <section
      className={`relative overflow-hidden rounded-[22px] border px-5 pb-6 pt-5 shadow-[0_18px_40px_-26px_rgba(18,33,26,0.45)] sm:px-7 sm:pb-7 sm:pt-6 ${
        abierta ? "border-marca-verde bg-marca-verdeFondo" : "border-marca-borde bg-white"
      }`}
    >
      {/* LA PARADA: el disco y la chapa colgando de él. Sin el tramo de
          sendero que llevaba detrás: una línea que no llevaba a ningún
          sitio se leía como decoración suelta. */}
      <div className={`relative flex items-center gap-4 ${ilustracion ? "pr-[92px] sm:pr-0" : ""}`}>
        <DiscoClase abierta={abierta} />
        <Chapa destacada={abierta}>{chapa}</Chapa>
      </div>

      {/* LA MASCOTA, EN LA ESQUINA. Su hueco (`MascotaBienvenida`) mide 90px
          en móvil, 150 entre 900 y 1199 y 200 a partir de ahí: dentro de
          la fila de la chapa la estiraba o se salía de la tarjeta. Arriba a
          la derecha en móvil, abajo a la derecha en escritorio, con su
          sitio reservado en el texto. */}
      {ilustracion && (
        <div className="absolute right-2 top-2 sm:bottom-3 sm:right-5 sm:top-auto">{ilustracion}</div>
      )}

      <div
        className={`relative mt-4 ${
          ilustracion ? "sm:pr-[110px] min-[900px]:pr-[170px] min-[1200px]:pr-[220px]" : ""
        }`}
      >
        {/* LA HORA, LO MÁS GRANDE. Es la respuesta a la pregunta con la
            que se abre esta pantalla. */}
        <p className="font-display text-[40px] font-extrabold leading-[1.02] tracking-[-0.02em] text-marca-tinta sm:text-[52px]">
          {t.franja(proxima.desde, proxima.hasta)}
        </p>

        <p className="mt-2 text-[16px] leading-snug text-marca-tintaMedia sm:text-[17px]">
          <span className="font-semibold text-marca-tinta first-letter:uppercase inline-block">
            {cuando(proxima, t, ahora)}
          </span>{" "}
          <span className="text-[13.5px] text-marca-grisSuave">{t.horaDeMadrid}</span>
        </p>

        {proxima.profesor && (
          <div className="mt-4 flex items-center gap-3">
            <AvatarProfesor nombre={proxima.profesor} />
            <p className="text-[16px] text-marca-tintaMedia">
              {t.con} <span className="font-display text-[18px] font-bold text-marca-tinta">{proxima.profesor}</span>
            </p>
          </div>
        )}

        <div className="mt-6">
          <BotonClase proxima={proxima} t={t} ahora={ahora} />
        </div>

        {secundario && <p className="mt-3 text-[14px] text-marca-gris">{secundario}</p>}
      </div>

      {refresco && <RefrescoEnCortes cortes={[proxima.abreEn.getTime(), proxima.terminaEn.getTime()]} />}
    </section>
  );
}

/**
 * El botón, en sus tres formas:
 *
 *   sin enlace utilizable   el aviso de pedírselo al profesor, sin botón.
 *                           Un botón que no lleva a ningún sitio es peor
 *                           que no tener botón.
 *   sala abierta            el enlace, en el verde de acción, con la
 *                           sombra sólida de los discos de la ruta.
 *   sala cerrada            el botón en gris, deshabilitado y SIN enlace,
 *                           con la nota de cuándo se abre.
 */
export function BotonClase({
  proxima,
  t,
  ahora,
}: {
  proxima: ProximaClase;
  t: TextosClases;
  ahora: Date;
}) {
  const enlace = enlaceDeClase(proxima.meetLink);
  const medida = "min-h-[54px] w-full px-8 sm:w-auto";

  if (!enlace) {
    return (
      <p className="inline-flex rounded-[14px] border border-marca-bordeSuave bg-white/70 px-4 py-3 text-[15px] font-semibold text-marca-tintaMedia">
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
        className={`pulsable inline-flex ${medida} items-center justify-center rounded-full bg-marca-verde text-[19px] font-bold text-white shadow-[0_4px_0_#14722A,0_10px_20px_rgba(30,158,58,0.25)] transition-colors hover:bg-marca-verdeOsc focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marca-verdeOsc`}
      >
        {t.unirse}
      </a>
    );
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
      <button
        type="button"
        disabled
        className="inline-flex min-h-[54px] w-full cursor-not-allowed items-center justify-center rounded-full bg-marca-pista px-8 text-[19px] font-bold text-marca-grisInactivo sm:w-auto"
      >
        {t.unirse}
      </button>
      <p className="text-center text-[14px] text-marca-gris sm:text-left">{t.seAbreAntes}</p>
    </div>
  );
}

/**
 * El disco de la clase: el de la parada de la ruta. Verde macizo con la
 * sombra sólida cuando la sala está abierta —es la parada en la que
 * estás—, y claro con el aro verde mientras tanto.
 */
function DiscoClase({ abierta }: { abierta: boolean }) {
  return (
    <span
      aria-hidden
      className={`relative grid h-14 w-14 shrink-0 place-items-center rounded-full ${
        abierta
          ? "border-[4px] border-marca-amarillo bg-marca-verde shadow-[0_5px_0_#E0A800,0_12px_22px_rgba(18,33,26,0.18)]"
          : "border-[3px] border-marca-verde bg-marca-verdeFondo shadow-[0_4px_0_#14722A,0_9px_16px_rgba(30,158,58,0.20)]"
      }`}
    >
      <svg
        viewBox="0 0 24 24"
        className="h-7 w-7"
        fill="none"
        stroke={abierta ? "#FFFFFF" : "#1E9E3A"}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* Una cámara: la clase es una videollamada. */}
        <rect x="3" y="6.5" width="12.5" height="11" rx="2.5" />
        <path d="M15.5 10.5l5-3v9l-5-3" />
      </svg>
    </span>
  );
}

/**
 * La chapa de la ruta, con su colita hacia el disco. Amarilla solo con la
 * sala abierta. La usa también el calendario (`SemanaClases`).
 */
export function Chapa({ destacada, children }: { destacada: boolean; children: ReactNode }) {
  return (
    <span
      className={`relative inline-flex items-center whitespace-nowrap rounded-full px-[14px] py-[7px] text-[13px] font-bold ${
        destacada
          ? "bg-marca-amarillo text-marca-tinta shadow-[0_3px_0_#E0A800]"
          : "border border-marca-borde bg-white text-marca-verdeOsc shadow-[0_3px_0_#E2E8E4]"
      }`}
    >
      <span
        aria-hidden
        className={`absolute -left-[5px] top-1/2 h-2.5 w-2.5 -translate-y-1/2 rotate-45 ${
          destacada ? "bg-marca-amarillo" : "border-b border-l border-marca-borde bg-white"
        }`}
      />
      <span className="relative">{children}</span>
    </span>
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
    <p className="rounded-[22px] border border-marca-borde bg-white px-5 py-4 text-[15px] text-marca-tintaMedia">
      {t.sinProxima}
    </p>
  );
}

// ---------------------------------------------------------------
// EN EL INICIO
//
// El inicio no crece por la clase. Fuera de la ventana, la clase es la
// línea de debajo del saludo, con la misma tipografía que la tarjeta: la
// hora en Radio Canada Big. Dentro de la ventana, la franja del inicio
// pasa a ser la tarjeta de la clase, con la mascota.
// ---------------------------------------------------------------

/** La línea de debajo del saludo, fuera de la ventana. */
export function LineaClase({ proxima, t, ahora }: { proxima: ProximaClase; t: TextosClases; ahora: Date }) {
  return (
    <>
      <span className="font-display font-bold text-marca-tinta">
        {t.lineaProxima(cuando(proxima, t, ahora), proxima.desde)}
      </span>{" "}
      <span className="text-[12px] text-marca-grisSuave min-[900px]:text-[13px]">{t.horaDeMadrid}</span>
      {proxima.profesor && (
        <>
          {" · "}
          {t.con.toLowerCase()} <span className="font-semibold text-marca-tinta">{proxima.profesor}</span>
        </>
      )}
    </>
  );
}

/**
 * La franja del inicio mientras la sala está abierta: la misma tarjeta
 * que en «Mis clases», con la mascota y, si tiene curso, dónde ha quedado
 * su «Continuar». Los cortes de la ventana los monta la página.
 */
export function FranjaClase({
  proxima,
  t,
  tieneCurso,
  ilustracion,
  ahora = new Date(),
}: {
  proxima: ProximaClase;
  t: TextosClases;
  /** Si el alumno tiene curso, se le dice que le espera. */
  tieneCurso: boolean;
  ilustracion?: ReactNode;
  ahora?: Date;
}) {
  return (
    <BannerClase
      proxima={proxima}
      t={t}
      ahora={ahora}
      ilustracion={ilustracion}
      secundario={tieneCurso && enlaceDeClase(proxima.meetLink) ? t.cursoEnMiCurso : undefined}
      refresco={false}
    />
  );
}
