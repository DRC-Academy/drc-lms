"use client";

import type { AvisoFormulario, ModoGeneracion, TarjetaModo } from "@/lib/modos";
import type { EtapaGeneracion } from "@/lib/generacion";
import AvanceGeneracion from "@/components/AvanceGeneracion";

export type EstadoGeneracion = "listo" | "generando" | "error";

/**
 * "Tu práctica de hoy": de dónde puede salir el próximo bloque.
 *
 * MISMA TARJETA QUE EN EL INICIO. Estas dos pantallas ofrecen lo mismo y
 * hasta ahora lo pintaban con dos paletas distintas —el inicio con
 * `marca-*` y esto con `drc-*`—, así que la práctica parecía de otro
 * producto. Ahora el punto de color, el fondo de cada modo y el botón
 * son los del inicio; lo único que cambia es que aquí las tarjetas
 * tienen la pantalla entera para ellas.
 *
 * EL COLOR DISTINGUE EL MODO, no la urgencia: el punto verde es lo de
 * clase, el ámbar el examen y el de tinta su día a día. Los botones son
 * verdes en los tres —el ámbar no llega al contraste como fondo de texto
 * blanco y, sobre todo, tres llamadas de tres colores no se ordenan.
 *
 * SIN MINUTOS EN NINGUNA PARTE. El subtítulo decía "cada bloque son
 * cinco minutos" y era una promesa que no depende de nosotros: cada
 * alumno tarda lo suyo, y ponerle reloj a la práctica solo sirve para
 * que quien va más despacio lo lea como un suspenso.
 */

/** El acento de cada modo: fondo de la tarjeta, punto y botón. */
const ESTILO: Record<ModoGeneracion, { tarjeta: string; punto: string; boton: string }> = {
  repaso: {
    tarjeta: "border-marca-borde bg-white",
    punto: "bg-marca-verde",
    boton: "bg-marca-verde text-white hover:bg-marca-verdeOsc",
  },
  examen: {
    tarjeta: "border-marca-examenBorde bg-marca-examen",
    punto: "bg-marca-amarillo",
    boton: "bg-marca-verdeOsc text-white hover:bg-marca-tinta",
  },
  contexto: {
    tarjeta: "border-marca-contextoBorde bg-marca-contexto",
    punto: "bg-marca-tinta",
    boton: "bg-marca-tinta text-white hover:bg-marca-verdeOsc",
  },
};

function IconoGirando() {
  return (
    <svg aria-hidden viewBox="0 0 20 20" className="h-[17px] w-[17px] shrink-0 animate-spin" fill="none">
      <circle cx="10" cy="10" r="7.5" stroke="currentColor" strokeOpacity="0.3" strokeWidth="2" />
      <path d="M17.5 10a7.5 7.5 0 0 0-7.5-7.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/**
 * Enlace al formulario, que vive en Gestión: el LMS no escribe.
 *
 * `url` es null cuando el alumno no tiene un token utilizable, y
 * entonces aquí no se pinta nada. El que lo llama decide qué poner en su
 * lugar, porque no es lo mismo quedarse sin el botón de una invitación
 * —que entonces sobra entera— que quedarse sin él en la tarjeta que es
 * la única que ese alumno tiene delante.
 */
function EnlaceFormulario({ url, className }: { url: string | null; className: string }) {
  if (url === null) return null;
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className={className}>
      Completar mi perfil
    </a>
  );
}

/**
 * Tarjeta única para quien todavía no tiene de dónde tirar. No es un
 * estado de error ni un bloqueo: es una invitación, y cuenta qué gana.
 *
 * ESTA NO SE PUEDE OCULTAR CUANDO NO HAY ENLACE, y es la diferencia con
 * `TarjetaPerfil`. Aquella es un extra en una pantalla llena; esta es lo
 * ÚNICO que hay delante de un alumno sin práctica disponible. Quitarla
 * dejaría la sección en blanco, sin decir por qué.
 *
 * Así que sin token se queda la tarjeta y el botón se cambia por el
 * mismo aviso que enseña la del inicio: de quién depende y si ya se lo
 * mandaron. El texto viene redactado del servidor para que las dos
 * pantallas digan exactamente lo mismo; escrito a mano aquí, se
 * separarían a la primera corrección de copy.
 */
function TarjetaSinDatos({ url, aviso }: { url: string | null; aviso: AvisoFormulario }) {
  return (
    <article className="flex flex-col rounded-[16px] border-[1.5px] border-dashed border-marca-perfilBorde bg-marca-perfil p-[18px] lg:p-6">
      <p className="flex items-center gap-2">
        <span aria-hidden className="h-[7px] w-[7px] rounded-full bg-marca-verde" />
        <span className="text-[11px] font-bold uppercase leading-none tracking-[0.14em] text-marca-gris">
          Empieza por aquí
        </span>
      </p>

      <h3 className="mt-3 text-pretty font-display text-[20px] font-bold leading-[1.2] text-marca-tinta">
        {url === null ? aviso.titulo : "Cuéntanos un poco de ti"}
      </h3>

      {url === null ? (
        <p className="mt-2 text-pretty text-[15px] leading-[1.5] text-marca-tintaMedia">
          {aviso.cuerpo}
        </p>
      ) : (
        <>
          <p className="mt-2 flex-1 text-pretty text-[15px] leading-[1.5] text-marca-tintaMedia">
            Con saber a qué te dedicas y qué quieres conseguir con el inglés, preparamos ejercicios
            con tus situaciones de verdad en lugar de frases de libro. Lo notas desde el primer
            bloque.
          </p>
          <EnlaceFormulario
            url={url}
            className="mt-5 flex min-h-[46px] w-full items-center justify-center rounded-full bg-marca-verde px-7 text-[15px] font-semibold text-white transition-colors hover:bg-marca-verdeOsc min-[900px]:w-auto min-[900px]:self-start"
          />
        </>
      )}
    </article>
  );
}

export default function TarjetasGeneracion({
  tarjetas,
  estado,
  modoActivo,
  etapa,
  progreso,
  tardando,
  mensajeError,
  esEspera,
  onGenerar,
  onReintentar,
  urlFormulario,
  avisoFormulario,
}: {
  tarjetas: TarjetaModo[];
  estado: EstadoGeneracion;
  /** Modo que se está generando ahora mismo, o null si no hay ninguno. */
  modoActivo: ModoGeneracion | null;
  /** Etapa que el servidor dice estar ejecutando. */
  etapa: EtapaGeneracion;
  /** De 0 a 95 mientras se espera; 100 solo con el bloque ya en la mano. */
  progreso: number;
  /** La espera se ha pasado del presupuesto previsto. */
  tardando: boolean;
  mensajeError: string;
  /** El mensaje no es un fallo, es un "todavía no toca". */
  esEspera: boolean;
  onGenerar: (modo: ModoGeneracion) => void;
  onReintentar: () => void;
  /**
   * El enlace al formulario de Gestión, ya montado con el token del
   * alumno. Null si no tiene ninguno utilizable: entonces no hay botón
   * en ningún sitio. Lo resuelve el servidor, ver `urlFormulario()` en
   * `lib/modos.ts`.
   */
  urlFormulario: string | null;
  /** Qué decirle cuando no hay enlace. Lo redacta el servidor. */
  avisoFormulario: AvisoFormulario;
}) {
  const generando = estado === "generando";

  // Quien ya tiene alguna tarjeta pero no la de contexto puede desbloquearla.
  // Se ofrece en una línea discreta, nunca como candado ni como requisito.
  //
  // Sin enlace la línea no se pinta: es una invitación de una frase, y
  // una invitación que no lleva a ningún sitio solo da envidia.
  const puedeSumarContexto =
    urlFormulario !== null &&
    tarjetas.length > 0 &&
    !tarjetas.some((tarjeta) => tarjeta.modo === "contexto");

  // Dos tarjetas al 50%; con la tercera, tres calles cuando hay sitio.
  const columnas =
    tarjetas.length >= 3
      ? "min-[900px]:grid-cols-2 min-[1200px]:grid-cols-3"
      : tarjetas.length === 2
        ? "min-[900px]:grid-cols-2"
        : "grid-cols-1";

  return (
    <section aria-labelledby="titulo-practica">
      <div className="lg:flex lg:items-baseline lg:gap-3.5">
        <h2
          id="titulo-practica"
          className="shrink-0 font-display text-[17px] font-bold text-marca-tinta lg:text-[19px]"
        >
          Tu práctica de hoy
        </h2>
        <p className="mt-1 text-pretty text-[14px] leading-[1.4] text-marca-gris lg:mt-0 lg:text-[15px]">
          {tarjetas.length > 0
            ? "Elige por dónde quieres tirar hoy."
            : "En cuanto sepamos un poco más de ti, esto se llena de práctica hecha para ti."}
        </p>
      </div>

      {tarjetas.length === 0 ? (
        <div className="mt-4">
          <TarjetaSinDatos url={urlFormulario} aviso={avisoFormulario} />
        </div>
      ) : (
        <>
          {/* `items-stretch` y la descripción en `flex-1` dejan los botones
              a la misma altura: los textos vienen de la API y tienen dos,
              tres o cuatro líneas según el alumno. */}
          <ul className={`mt-4 grid grid-cols-1 items-stretch gap-3 lg:gap-5 ${columnas}`}>
            {tarjetas.map((tarjeta) => {
              const estilo = ESTILO[tarjeta.modo];
              const activa = generando && modoActivo === tarjeta.modo;

              return (
                <li key={tarjeta.modo} className="flex">
                  <article
                    className={`flex w-full flex-col rounded-[14px] border p-[18px] lg:p-6 ${estilo.tarjeta}`}
                  >
                    <p className="flex items-center gap-2">
                      <span aria-hidden className={`h-[7px] w-[7px] rounded-full ${estilo.punto}`} />
                      <span className="text-[11px] font-bold uppercase leading-none tracking-[0.14em] text-marca-gris">
                        {tarjeta.etiqueta}
                      </span>
                    </p>

                    <h3 className="mt-3 text-pretty font-display text-[20px] font-bold leading-[1.2] text-marca-tinta">
                      {tarjeta.titulo}
                    </h3>

                    <p className="mt-2 text-pretty text-[15px] leading-[1.5] text-marca-tintaMedia">
                      {tarjeta.descripcion}
                    </p>

                    {/* Mientras no toca, la tarjeta cuenta de qué depende.
                        Va antes del botón para que se lea primero el porqué
                        y después el botón apagado, y no al revés. */}
                    {tarjeta.espera && (
                      <p className="mt-2.5 text-[13.5px] leading-[1.5] text-marca-gris">
                        {tarjeta.espera.nota}
                      </p>
                    )}

                    <button
                      type="button"
                      onClick={() => onGenerar(tarjeta.modo)}
                      disabled={generando || tarjeta.espera !== null}
                      aria-disabled={tarjeta.espera !== null}
                      aria-live="polite"
                      className={`mt-5 flex min-h-[46px] w-full items-center justify-center rounded-full px-6 text-[15px] font-semibold leading-[1.1] transition-colors disabled:cursor-default min-[900px]:mt-auto ${
                        tarjeta.espera
                          ? "bg-marca-pista text-marca-grisInactivo"
                          : `disabled:cursor-wait disabled:opacity-60 ${estilo.boton}`
                      }`}
                    >
                      {activa && <IconoGirando />}
                      <span className={activa ? "ml-2" : ""}>
                        {activa ? "Preparando…" : (tarjeta.espera?.etiquetaBoton ?? tarjeta.llamada)}
                      </span>
                    </button>
                  </article>
                </li>
              );
            })}
          </ul>

          {puedeSumarContexto && (
            <p className="mt-3.5 text-[14px] leading-[1.5] text-marca-gris">
              ¿Nos cuentas a qué te dedicas? Con eso te preparamos también ejercicios con tus
              situaciones del día a día.{" "}
              <EnlaceFormulario
                url={urlFormulario}
                className="font-semibold text-marca-verdeOsc underline underline-offset-2 transition-colors hover:text-marca-tinta"
              />
            </p>
          )}
        </>
      )}

      {generando && modoActivo && (
        <AvanceGeneracion modo={modoActivo} etapa={etapa} progreso={progreso} tardando={tardando} />
      )}

      {estado === "error" && (
        <div className="aparece mt-4 rounded-[14px] border border-marca-examenBorde bg-marca-examen px-5 py-4">
          <p className="font-display text-[15px] font-bold text-marca-tinta">
            {esEspera ? "Por ahora, ya está" : "Esta vez no ha salido."}
          </p>
          <p className="mt-1 text-[14px] leading-[1.5] text-marca-gris">{mensajeError}</p>
          {/* Sin botón cuando es una espera: reintentar daría lo mismo.
              El reintento vuelve al mismo modo que falló, que obligar a
              buscar otra vez la tarjeta convierte un fallo nuestro en
              trabajo suyo. */}
          {!esEspera && (
            <button
              type="button"
              onClick={onReintentar}
              className="mt-4 flex min-h-[44px] w-full items-center justify-center rounded-full bg-marca-verde px-7 text-[15px] font-semibold text-white transition-colors hover:bg-marca-verdeOsc min-[900px]:w-auto"
            >
              Volver a intentarlo
            </button>
          )}
        </div>
      )}
    </section>
  );
}
