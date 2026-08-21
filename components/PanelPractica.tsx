"use client";

import type { Bloque } from "@/lib/data";
import type { AvisoFormulario, TarjetaPractica } from "@/lib/modos";
import { numerosDePractica } from "@/lib/progreso";
import { racha } from "@/lib/racha";
import {
  construirRuta,
  estaCerrado,
  type AvanceBloques,
  type ProgresoBloques,
} from "@/lib/ruta";
import { usarGenerador } from "@/components/usarGenerador";
import TarjetasGeneracion from "@/components/TarjetasGeneracion";
import HudPractica from "@/components/practica/HudPractica";
import Ruta from "@/components/practica/Ruta";
import Medallas from "@/components/practica/Medallas";

export type { AvanceBloques, ProgresoBloques };

/**
 * «PARA TI», ENTERA.
 *
 * LA PANTALLA ES UNA RUTA. Antes era un tablero: una franja con el
 * bloque en curso, una tarjeta con la última clase, cuatro casillas de
 * métrica, otra tarjeta para generar y una lista con todos los bloques.
 * Cinco piezas contando el mismo estado con cinco muebles, y tres de
 * ellas peleándose por ser la acción.
 *
 * Ahora hay tres cosas y en este orden:
 *
 *   1. LAS FICHAS, lo que llevas acumulado —racha, nivel, dominados—.
 *   2. LA RUTA, con la parada de hoy desplegada. Es la pantalla.
 *   3. «YA REALIZADOS», cerrado.
 *
 * Y una cuarta que solo aparece cuando toca: la tarjeta de generación,
 * que baja del centro al pie. Es una oferta —«tu clase ya puede
 * convertirse en un bloque»— y no un rival del botón de la ruta.
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
  avance,
  generadosIniciales,
  nivel,
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
  avance: AvanceBloques;
  generadosIniciales: Bloque[];
  /** El nivel MCER del alumno, para la ficha. Vacío sin perfil. */
  nivel: string;
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

  // El último bloque estático llega bloqueado hasta la siguiente clase.
  const indiceBloqueado = bloques.length > 1 ? todos.length - 1 : -1;

  const paradas = construirRuta(todos, progreso, indiceBloqueado);

  // Las medallas son TODO lo que ha cerrado alguna vez, no solo lo que
  // hoy sale en la ruta: el camino es esta semana, la colección es todo.
  // Lo más reciente primero, que es como está ordenado `todos`.
  const cerrados = todos.filter((bloque, i) => i !== indiceBloqueado && estaCerrado(progreso, bloque));

  const { dominados } = numerosDePractica(progreso);

  // La racha, con las fechas que hay. Ver la cabecera de `lib/racha.ts`:
  // hoy solo ve una fecha por bloque, así que se queda corta antes que
  // inventarse un número.
  const diasSeguidos = racha([
    ...Object.values(progreso).map((r) => r.fecha),
    ...Object.values(avance).map((r) => r.fecha),
  ]);

  const saludo = nombre.trim() !== "" ? `Para ${nombre.trim().split(" ")[0]}` : "Para ti";
  const hoy = new Intl.DateTimeFormat("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());

  return (
    <>
      <HudPractica racha={diasSeguidos} nivel={nivel} dominados={dominados} />

      {/* ================================ HERO ================================ */}
      <div className="mt-6 min-[900px]:mt-[30px]">
        <p className="text-[10.5px] font-extrabold uppercase leading-none tracking-[0.16em] text-marca-verdeOsc min-[900px]:text-[11.5px]">
          {saludo} · {hoy}
        </p>
        <h1 className="mt-2.5 text-balance font-display text-[32px] font-extrabold leading-[1.03] tracking-[-0.03em] text-marca-tinta min-[900px]:mt-3 min-[900px]:text-[46px]">
          Tu ruta de esta semana
        </h1>
        <p className="mt-2.5 max-w-[62ch] text-pretty text-[15.5px] leading-[1.5] text-marca-tintaMedia min-[900px]:mt-3 min-[900px]:text-[17px]">
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
          invitación de abajo, que es lo único que el alumno puede hacer. */}
      <div ref={zonaNuevos} className="mt-5 scroll-mt-20 min-[900px]:mt-[26px]">
        {paradas.length > 0 ? (
          <Ruta paradas={paradas} alumnoId={alumnoId} profesor={profesor} />
        ) : (
          <RutaVacia generando={generando} profesor={profesor} />
        )}
      </div>

      <Medallas bloques={cerrados} progreso={progreso} alumnoId={alumnoId} />

      {/* ============================== LA GENERACIÓN ==============================
          Al pie y no en el centro. Cuando hay ruta empezada es una
          oferta: el botón que importa es el de la parada de hoy. Cuando
          no hay ninguna parada, esto es lo único que hay y ocupa el sitio
          que le corresponde. */}
      <div className="mt-7 min-[900px]:mt-9">
        <TarjetasGeneracion
          tarjeta={tarjeta}
          estado={estado}
          etapa={etapa}
          progreso={progresoGeneracion}
          tardando={tardando}
          mensajeError={mensajeError}
          esEspera={esEspera}
          conContexto={conContexto}
          onGenerar={generar}
          onReintentar={reintentar}
          urlFormulario={urlFormulario}
          avisoFormulario={avisoFormulario}
          titulo={paradas.length > 0 ? "Alargar tu ruta" : "Tu primera parada"}
          bajada={
            paradas.length > 0
              ? "Cuando tengas clase nueva, se le añade una parada más."
              : undefined
          }
        />
      </div>
    </>
  );
}

/**
 * La ruta de quien todavía no tiene ninguna parada.
 *
 * Es lo que ven 86 de los 168 alumnos al entrar por primera vez, así que
 * no puede ser un hueco. Se pinta el camino VACÍO —la forma de lo que
 * viene— para que «no tienes nada» se lea como «esto está por llenarse».
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

        <div className="mt-4 rounded-[18px] border border-marca-rutaTarjeta bg-white p-5 min-[900px]:mt-1.5 min-[900px]:rounded-[20px] min-[900px]:px-[30px] min-[900px]:py-[26px]">
          <p className="text-[10.5px] font-extrabold uppercase leading-none tracking-[0.16em] text-marca-amarilloTexto min-[900px]:text-[11px]">
            Parada 1
          </p>
          <h2 className="mt-3 text-balance font-display text-[25px] font-extrabold leading-[1.08] tracking-[-0.025em] text-marca-tinta min-[900px]:text-[30px]">
            {generando ? "Preparando tu primera parada…" : "Tu ruta empieza con tu primera clase"}
          </h2>
          <p className="mt-2.5 max-w-[62ch] text-pretty text-[15px] leading-[1.5] text-marca-tintaMedia min-[900px]:text-[15.5px]">
            {generando
              ? "En menos de un minuto la tienes aquí."
              : profesor !== ""
                ? `En cuanto ${profesor} analice lo que trabajéis, aparece aquí tu primera parada: diez ejercicios hechos con lo tuyo.`
                : "En cuanto tu profesor analice lo que trabajéis, aparece aquí tu primera parada: diez ejercicios hechos con lo tuyo."}
          </p>
        </div>
      </div>
    </section>
  );
}
