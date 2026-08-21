"use client";

import type { Bloque } from "@/lib/data";
import type { AvisoFormulario, TarjetaPractica } from "@/lib/modos";
import { construirRuta, estaCerrado, type ProgresoBloques } from "@/lib/ruta";
import { usarGenerador } from "@/components/usarGenerador";
import Ruta from "@/components/practica/Ruta";
import Hechas from "@/components/practica/Hechas";
import InvitacionPerfil, { LineaContexto } from "@/components/practica/InvitacionPerfil";

export type { ProgresoBloques };

/**
 * «PARA TI», ENTERA.
 *
 * LA PANTALLA ES UNA RUTA, Y NADA MÁS. Antes era un tablero: una franja
 * con el bloque en curso, una tarjeta con la última clase, cuatro
 * casillas de métrica, otra tarjeta para generar y una lista con todos
 * los bloques. Cinco piezas contando el mismo estado con cinco muebles,
 * y tres de ellas peleándose por ser la acción.
 *
 * Hoy queda esto, en este orden:
 *
 *   1. EL SALUDO: de quién sale esta ruta y de qué fecha.
 *   2. LA RUTA, con la parada que toca desplegada. Es la pantalla.
 *   3. «PARADAS HECHAS», cerrado.
 *
 * Y SE HAN IDO TRES COSAS de una vez:
 *
 *   · EL ENCABEZADO «Para ti» con su bajada. Lo dice la pestaña, que
 *     además va marcada. Dos titulares seguidos diciendo dónde estás es
 *     un titular de más antes de llegar a lo que se viene a hacer.
 *
 *   · LAS FICHAS DE RACHA, NIVEL Y DOMINADOS, y las medallas de abajo.
 *     Detrás de esta pantalla hay una profesora que lee lo que el alumno
 *     escribe; una racha y una colección de insignias compiten con ese
 *     vínculo y castigan a quien lleva dos semanas sin poder dar clase.
 *     Lo único que hacía falta de allí —volver a un bloque cerrado—
 *     vive en «Paradas hechas».
 *
 *   · EL BLOQUE «ALARGAR TU RUTA» del pie, con su tarjeta y su botón
 *     apagado. Decía lo mismo que el candado de la última parada. Ahora
 *     generar ES esa parada: ver `components/practica/Ruta.tsx`.
 *
 * POR QUÉ LA SECCIÓN CAMBIA DE COLOR. «Para ti» es la única pantalla
 * hecha para un solo alumno y era la que peor lo transmitía: cuatro
 * casillas sobre el mismo gris que todo lo demás. El campo verde claro
 * de la ruta la separa sin tocar el significado de ningún color: el
 * verde de acción sigue destacando encima.
 *
 * NI UN MINUTO EN TODA LA PANTALLA, como antes. Los bloques traen
 * `minutos` y se sigue ignorando: es una estimación nuestra sobre lo que
 * tarda otra persona, y aquí solo serviría para que quien va más despacio
 * lo lea como un suspenso.
 */
export default function PanelPractica({
  alumnoId,
  nombre,
  profesor,
  tarjeta,
  conContexto,
  bloques,
  progreso,
  generadosIniciales,
  urlFormulario,
  avisoFormulario,
}: {
  alumnoId: string;
  /** El nombre de pila, para el saludo. Vacío sin perfil. */
  nombre: string;
  /** Va en el pie de la parada de hoy. Vacío sin perfil. */
  profesor: string;
  /** La tarjeta de generación, o null si no hay de dónde tirar. */
  tarjeta: TarjetaPractica | null;
  /** Si ya sabemos a qué se dedica: decide si se le invita a contarlo. */
  conContexto: boolean;
  bloques: Bloque[];
  progreso: ProgresoBloques;
  generadosIniciales: Bloque[];
  /** Enlace al formulario de Gestión con el token del alumno, o null. */
  urlFormulario: string | null;
  /** Qué decirle cuando no hay enlace. */
  avisoFormulario: AvisoFormulario;
}) {
  const {
    estado,
    generando,
    etapa,
    progreso: progresoGeneracion,
    tardando,
    mensajeError,
    esEspera,
    todos,
    generar,
    reintentar,
    zonaNuevos,
  } = usarGenerador({ alumnoId, bloques, generadosIniciales });

  // ---------------------------------------------------------------
  // EN QUÉ ESTADO LLEGA LA ÚLTIMA PARADA
  //
  // Sin `tarjeta` no hay ninguna fuente —ni clase, ni perfil, ni
  // examen—: no hay parada de generación que enseñar, ni cerrada. A ese
  // alumno se le invita a completar el perfil, que es lo único que puede
  // hacer.
  //
  // Con tarjeta, la abre o la cierra `espera`, que lo decide el servidor
  // (ver `redactarEspera` en `lib/modos.ts`). Es el MISMO dato que
  // apagaba el botón de la tarjeta que había al pie: no se ha inventado
  // ningún estado nuevo, solo ha cambiado de sitio.
  // ---------------------------------------------------------------
  const paradas = construirRuta(
    todos,
    progreso,
    tarjeta === null ? null : tarjeta.espera === null ? "abierta" : "cerrada"
  );

  // Todo lo que ha cerrado alguna vez, lo más reciente primero: el
  // camino es esta semana, la lista de abajo es todo.
  const cerrados = todos.filter((bloque) => estaCerrado(progreso, bloque));

  const saludo = nombre.trim() !== "" ? `Para ${nombre.trim().split(" ")[0]}` : "Para ti";
  const hoy = new Intl.DateTimeFormat("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());

  const sinNadaQueOfrecer = tarjeta === null && paradas.length === 0;

  return (
    <>
      {/* ================================ SALUDO ================================
          Es el titular de la pantalla desde que se fue el encabezado de
          la página. Nombra al profesor lo antes posible: para el alumno,
          la persona con la que da clase es la mitad del producto. */}
      <div>
        <p className="text-[10.5px] font-extrabold uppercase leading-none tracking-[0.16em] text-marca-verdeOsc min-[900px]:text-[11.5px]">
          {saludo} · {hoy}
        </p>
        <h1 className="mt-2.5 text-balance font-display text-[30px] font-extrabold leading-[1.03] tracking-[-0.03em] text-marca-tinta min-[900px]:mt-3 min-[900px]:text-[46px]">
          {paradas.length > 0 ? "Tu ruta de esta semana" : "Aquí va a estar tu ruta"}
        </h1>
        <p className="mt-2.5 max-w-[62ch] text-pretty text-[15px] leading-[1.5] text-marca-tintaMedia min-[900px]:mt-3 min-[900px]:text-[17px]">
          {profesor !== "" ? (
            <>
              Sale de tus clases con <strong className="font-semibold text-marca-tinta">{profesor}</strong>.
              Nadie más en la academia tiene esta ruta.
            </>
          ) : (
            <>Sale de tus clases y de lo que sabemos de ti. Nadie más en la academia tiene esta ruta.</>
          )}
        </p>
      </div>

      {/* ================================ LA RUTA ================================
          Sin ninguna parada todavía no hay camino que pintar: manda la
          invitación, que es lo único que el alumno puede hacer. */}
      <div ref={zonaNuevos} className="mt-5 scroll-mt-20 min-[900px]:mt-[26px]">
        {paradas.length > 0 ? (
          <Ruta
            paradas={paradas}
            alumnoId={alumnoId}
            profesor={profesor}
            generacion={{
              tarjeta,
              estado,
              etapa,
              progreso: progresoGeneracion,
              tardando,
              mensajeError,
              esEspera,
              onGenerar: generar,
              onReintentar: reintentar,
            }}
          />
        ) : (
          <RutaVacia generando={generando} profesor={profesor} />
        )}

        {sinNadaQueOfrecer && (
          <div className="mt-4">
            <InvitacionPerfil url={urlFormulario} aviso={avisoFormulario} />
          </div>
        )}

        {/* Quien ya tiene ruta pero no nos ha contado a qué se dedica
            puede mejorar lo que recibe. Una línea, nunca un candado. */}
        {!conContexto && !sinNadaQueOfrecer && <LineaContexto url={urlFormulario} />}
      </div>

      <Hechas bloques={cerrados} progreso={progreso} alumnoId={alumnoId} />
    </>
  );
}

/**
 * La ruta de quien todavía no tiene ninguna parada.
 *
 * Es lo que ven 86 de los 168 alumnos al entrar por primera vez, así que
 * no puede ser un hueco. Se pinta el camino VACÍO —la forma de lo que
 * viene— para que «no tienes nada» se lea como «esto está por llenarse».
 *
 * SIN BOTÓN, y es deliberado: aquí no hay clase que analizar todavía, y
 * la primera parada la abre el profesor. Ofrecerle algo que pulsar sería
 * la misma promesa vacía que el candado no hace.
 */
function RutaVacia({ generando, profesor }: { generando: boolean; profesor: string }) {
  return (
    <section
      aria-label="Tu ruta"
      className="relative overflow-hidden rounded-[24px] border border-marca-rutaBorde bg-marca-ruta px-4 py-6 min-[900px]:rounded-[28px] min-[900px]:px-10 min-[900px]:py-9"
    >
      <span
        aria-hidden
        className="pointer-events-none absolute -right-20 -top-28 h-80 w-80 rounded-full bg-marca-rutaForma"
      />

      <div className="relative">
        <p className="text-[10.5px] font-extrabold uppercase leading-none tracking-[0.16em] text-marca-verdeOsc min-[900px]:text-[11px]">
          Tu ruta · aún sin paradas
        </p>

        {/* El camino en traza discontinua, con la primera parada abierta
            y el resto insinuado. Solo donde hay ancho para dibujarlo. */}
        <div
          aria-hidden
          className="relative mt-4 hidden min-[900px]:block"
          style={{ aspectRatio: "1000 / 190" }}
        >
          <svg viewBox="0 0 1000 190" className="absolute inset-0 h-full w-full" fill="none">
            <path
              d="M64 120 C150 80 236 55 320 66 C412 78 490 104 574 132 C660 160 744 100 830 60 C896 28 944 62 962 100"
              stroke="#C4DECF"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray="2 16"
            />
          </svg>

          <span
            className="absolute grid h-[76px] w-[76px] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-4 border-dashed border-[#A9CFB8] bg-white"
            style={{ left: "6.4%", top: "63%" }}
          >
            <svg
              viewBox="0 0 20 20"
              className="h-[26px] w-[26px]"
              fill="none"
              stroke="#1E9E3A"
              strokeWidth="1.8"
              strokeLinecap="round"
            >
              <path d="M10 4.2v11.6M4.2 10h11.6" />
            </svg>
          </span>

          {[
            { left: "32%", top: "35%" },
            { left: "57.4%", top: "69%" },
            { left: "83%", top: "31%" },
          ].map((pos) => (
            <span
              key={pos.left}
              className="absolute h-[46px] w-[46px] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-dashed border-marca-rutaTrazo bg-[#E4F1E9]"
              style={pos}
            />
          ))}
        </div>

        {/* En móvil el camino vacío se cuenta de pie, como el lleno. */}
        <div className="mt-4 flex gap-3 min-[900px]:hidden">
          <div className="flex w-[34px] shrink-0 flex-col items-center">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border-[3px] border-dashed border-[#A9CFB8] bg-white">
              <svg
                viewBox="0 0 20 20"
                className="h-[17px] w-[17px]"
                fill="none"
                stroke="#1E9E3A"
                strokeWidth="1.9"
                strokeLinecap="round"
              >
                <path d="M10 4.4v11.2M4.4 10h11.2" />
              </svg>
            </span>
            <span
              aria-hidden
              className="w-0.5 flex-1"
              style={{ background: "repeating-linear-gradient(#C4DECF 0 6px, transparent 6px 14px)" }}
            />
          </div>
          <div className="min-w-0 flex-1 pb-2">
            <Primera generando={generando} profesor={profesor} />
          </div>
        </div>

        <div className="mt-4 hidden min-[900px]:mt-1.5 min-[900px]:block">
          <Primera generando={generando} profesor={profesor} />
        </div>
      </div>
    </section>
  );
}

/** La caja blanca de la primera parada, la que todavía no existe. */
function Primera({ generando, profesor }: { generando: boolean; profesor: string }) {
  return (
    <div className="rounded-[18px] border border-marca-rutaTarjeta bg-white p-5 min-[900px]:rounded-[20px] min-[900px]:px-[30px] min-[900px]:py-[26px]">
      <p className="text-[10.5px] font-extrabold uppercase leading-none tracking-[0.16em] text-marca-amarilloTexto min-[900px]:text-[11px]">
        Parada 1
      </p>
      <h2 className="mt-3 text-balance font-display text-[23px] font-extrabold leading-[1.08] tracking-[-0.025em] text-marca-tinta min-[900px]:text-[30px]">
        {generando ? "Preparando tu primera parada…" : "Tu ruta empieza con tu primera clase"}
      </h2>
      <p className="mt-2.5 max-w-[62ch] text-pretty text-[14.5px] leading-[1.45] text-marca-tintaMedia min-[900px]:text-[15.5px] min-[900px]:leading-[1.5]">
        {generando
          ? "En menos de un minuto la tienes aquí."
          : profesor !== ""
            ? `En cuanto ${profesor} analice lo que trabajéis, aparece aquí tu primera parada: diez ejercicios hechos con lo tuyo.`
            : "En cuanto tu profesor analice lo que trabajéis, aparece aquí tu primera parada: diez ejercicios hechos con lo tuyo."}
      </p>
    </div>
  );
}
