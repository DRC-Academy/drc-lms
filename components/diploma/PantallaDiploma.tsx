import type { ReactNode } from "react";
import { textosActuales } from "@/lib/idioma-servidor";
import type { ProgresoDiploma } from "@/lib/diploma";
import { formatearFechaLarga } from "@/lib/perfil";

// ---------------------------------------------------------------
// «MI DIPLOMA»
//
// La landing de drcacademy.com (`/tu-diploma-de-drc-academy/`) rehecha
// dentro del LMS, CON SU MISMA COMPOSICIÓN, sección por sección y todo
// centrado. Sin la cabecera ni el pie de WordPress: la página vive dentro
// del marco del LMS.
//
//   a) Titular, la imagen del diploma (con su candado) y la frase.
//   b) La tarjeta del progreso: «3 de 6 meses completados», la barra, el
//      porcentaje y el mensaje del tramo. Es lo único que cambia de la
//      landing: aquí los datos son los del alumno (`progresoDiploma`).
//   c) Una banda gris con las tres promesas; la del medio, destacada.
//   d) El vídeo de Mar, con su etiqueta encima.
//   e) El camino en tres pasos sobre una línea punteada.
//
// SIN GAMIFICACIÓN: ni confeti, ni puntos, ni insignias. Conseguido el
// diploma, se felicita con palabras y se esconde la imagen —lleva un
// candado dibujado, que contradiría la enhorabuena—. No hay botón de
// descarga hasta que exista el archivo.
//
// MARCA: el verde en la cifra, la barra y los iconos; el amarillo solo
// de acento —el borde y el icono de la promesa del medio, y la píldora
// del último paso—. No hay botones en la página.
//
// Componente de servidor, sin estado. La página lo alimenta con el perfil
// del alumno de la sesión (`app/(alumno)/diploma/page.tsx`).
// ---------------------------------------------------------------

const TITULO_H2 = "text-balance font-display text-[24px] font-bold leading-tight text-marca-tinta min-[900px]:text-[30px]";

export default function PantallaDiploma({ progreso }: { progreso: ProgresoDiploma | null }) {
  const conseguido = progreso?.tramo === "conseguido";

  return (
    // FONDO BLANCO, como la landing, pero no lo pinta la página: lo pone
    // el marco en toda la columna (`fondoDeRuta`, `ContenidoApp`), fila
    // del idioma incluida. La banda gris de las promesas es la única
    // superficie distinta, y va a todo el ancho del contenido.
    <main className="w-full flex-1">
      <Cabecera conseguido={conseguido} />
      <div className="px-5 pb-12 pt-6 min-[900px]:pb-16">
        <Progreso progreso={progreso} />
      </div>
      <Promesas conseguido={conseguido} />
      <Fluidez />
      <Camino />
    </main>
  );
}

/** a) Titular, imagen y frase. */
function Cabecera({ conseguido }: { conseguido: boolean }) {
  const t = textosActuales().diploma;

  return (
    <header className="px-5 pt-6 text-center min-[900px]:pt-10">
      <h1 className="mx-auto max-w-[620px] text-balance font-display text-[26px] font-bold leading-[1.2] text-marca-tinta min-[900px]:text-[34px]">
        {t.titulo}
      </h1>

      {/* LA IMAGEN DE LA LANDING LLEVA UN CANDADO DIBUJADO («se
          desbloquea al completar el curso»). Conseguido el diploma, ese
          candado contradice la enhorabuena, y no se enseña.

          `<img>` Y NO `next/image`, a propósito. El optimizador pide la
          imagen al propio servidor sin la cookie del alumno, el
          middleware le contesta con la redirección a `/acceso` y la
          imagen sale rota (ver el `matcher` de `middleware.ts`). Y
          `/diploma/` no se abre en el matcher: ahí irá la descarga del
          diploma, que es un documento con el nombre de alguien. Son
          52 KB; el navegador la pide con su cookie. */}
      {!conseguido && (
        <img
          src="/diploma/diploma-landing.jpg"
          alt={t.altImagen}
          width={500}
          height={333}
          fetchPriority="high"
          className="mx-auto mt-5 h-auto w-[300px] max-w-full"
        />
      )}

      <p className="mx-auto mt-4 max-w-[460px] text-pretty text-[15px] leading-snug text-marca-tintaMedia min-[900px]:text-[16px]">
        {t.entradilla}
      </p>
    </header>
  );
}

/** b) La tarjeta del progreso. Sin fecha de inicio, una frase neutra: nunca un cero. */
function Progreso({ progreso }: { progreso: ProgresoDiploma | null }) {
  const textos = textosActuales();
  const t = textos.diploma;
  const caja = "mx-auto w-full max-w-[330px] rounded-[14px] border border-marca-borde bg-marca-verdeFondo px-5 py-5 text-center";

  if (!progreso) {
    return (
      <section aria-labelledby="diploma-progreso" className={caja}>
        <h2 id="diploma-progreso" className="text-[15px] font-bold leading-snug text-marca-tinta">
          {t.sinFecha.titular}
        </h2>
        <p className="mt-1.5 text-pretty text-[14px] leading-snug text-marca-tintaMedia">{t.sinFecha.texto}</p>
      </section>
    );
  }

  const conseguido = progreso.tramo === "conseguido";
  const mensaje = t.tramo[progreso.tramo];
  const fecha = formatearFechaLarga(progreso.fechaPrevista, textos.progreso.fechaLarga);

  return (
    <section aria-labelledby="diploma-progreso" className={caja}>
      <p className="flex flex-wrap items-baseline justify-center gap-x-1.5">
        <span className="font-display text-[34px] font-bold leading-none tabular-nums text-marca-verde">{progreso.meses}</span>
        <span className="text-[14px] font-semibold text-marca-tinta">{t.deMeses(progreso.mesesTotales)}</span>
      </p>

      <div
        role="progressbar"
        aria-valuenow={progreso.porcentaje}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={t.barraLector(progreso.meses, progreso.mesesTotales)}
        className="mt-3 h-2.5 overflow-hidden rounded-full bg-marca-pista"
      >
        {/* `.llena`: se llena al entrar; con movimiento reducido, quieta. */}
        <div className="llena h-full rounded-full bg-marca-verde" style={{ width: `${progreso.porcentaje}%` }} />
      </div>

      {/* En verde oscuro y no en el de marca: a 12,5px sobre el verde
          claro, el de marca no llega a 4,5:1. */}
      <p className="mt-2 text-[12.5px] font-semibold text-marca-verdeOsc">{t.porcentajeCompletado(progreso.porcentaje)}</p>

      <h2 id="diploma-progreso" className="mt-4 text-pretty text-[15px] font-bold leading-snug text-marca-tinta">
        {mensaje.titular}
      </h2>
      <p className="mt-1 text-pretty text-[13.5px] leading-snug text-marca-tintaMedia">{mensaje.texto}</p>

      <p className="mt-3 text-[12.5px] text-marca-gris">{conseguido ? t.conseguidoEl(fecha) : t.fechaPrevista(fecha)}</p>
    </section>
  );
}

/** c) La banda gris con las tres promesas. La del medio, destacada en amarillo. */
function Promesas({ conseguido }: { conseguido: boolean }) {
  const t = textosActuales().diploma;
  const iconos = [<IconoHablar key="h" />, <IconoMedalla key="m" />, <IconoMeta key="b" />];

  return (
    <section aria-labelledby="diploma-promesas" className="bg-marca-niebla px-5 py-12 min-[900px]:py-16">
      <h2 id="diploma-promesas" className={`${TITULO_H2} text-center`}>
        {conseguido ? t.promesasTituloConseguido : t.promesasTitulo}
      </h2>
      <ul className="mx-auto mt-7 grid max-w-[1000px] gap-4 min-[900px]:mt-9 min-[900px]:grid-cols-3 min-[900px]:gap-5">
        {t.promesas.map((promesa, i) => {
          const destacada = i === 1;
          return (
            <li
              key={promesa.titulo}
              className={`rounded-[14px] border border-t-[3px] border-marca-borde px-5 pb-6 pt-6 text-center shadow-[0_6px_18px_rgba(18,33,26,0.06)] ${
                destacada ? "border-t-marca-amarillo bg-marca-verdeFondo" : "border-t-marca-verde bg-white"
              }`}
            >
              <span
                aria-hidden
                className={`mx-auto grid h-11 w-11 place-items-center rounded-[12px] ${
                  destacada ? "bg-marca-amarillo text-marca-tinta" : "bg-marca-verdeFondo text-marca-verdeOsc shadow-[inset_0_0_0_1px_#DCEFE1]"
                }`}
              >
                {iconos[i]}
              </span>
              <h3 className="mt-4 text-balance text-[16px] font-bold leading-snug text-marca-tinta">{promesa.titulo}</h3>
              <p className="mt-2 text-pretty text-[14px] leading-snug text-marca-tintaMedia">{promesa.texto}</p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** d) El vídeo de Mar: nativo, con controles y sin arrancar solo. */
function Fluidez() {
  const t = textosActuales().diploma;

  return (
    <section aria-labelledby="diploma-fluidez" className="px-5 py-12 text-center min-[900px]:py-16">
      <h2 id="diploma-fluidez" className={TITULO_H2}>
        {t.fluidezTitulo}
      </h2>
      <p className="mx-auto mt-2 max-w-[520px] text-pretty text-[15px] leading-snug text-marca-tintaMedia">{t.fluidezTexto}</p>

      {/* Una etiqueta, no un botón: no hace nada al pulsarla. */}
      <p className="mx-auto mt-5 inline-flex max-w-full items-center gap-2 rounded-full bg-marca-verdeFondo py-2 pl-2 pr-4 text-left text-[13px] font-semibold leading-snug text-marca-verdeOsc">
        <span aria-hidden className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-marca-verde">
          <svg viewBox="0 0 12 12" className="ml-[1px] h-2.5 w-2.5" fill="#FFFFFF">
            <path d="M3 1.8v8.4L10 6 3 1.8Z" />
          </svg>
        </span>
        {t.videoEtiqueta}
      </p>

      {/* `#t=0.1`: sin póster, Safari en iPhone enseña un recuadro negro
          hasta que se pulsa; así pinta el primer fotograma. */}
      <video
        controls
        preload="metadata"
        playsInline
        width={800}
        height={800}
        aria-label={t.videoEtiqueta}
        className="mx-auto mt-6 block aspect-square h-auto w-full max-w-[500px] rounded-[14px] bg-marca-tinta shadow-[0_14px_36px_rgba(18,33,26,0.18)]"
      >
        <source src="/diploma/mar-oliva.mp4#t=0.1" type="video/mp4" />
        {t.videoSinSoporte}
      </video>
    </section>
  );
}

/**
 * e) Los tres pasos, unidos por una línea punteada. El último círculo va
 * relleno de verde y su etiqueta en una píldora amarilla, como la landing.
 */
function Camino() {
  const t = textosActuales().diploma;
  const iconos = [<IconoReloj key="r" />, <IconoCalendario key="c" />, <IconoMedalla key="m" />];
  const total = t.pasos.length;

  return (
    <section aria-labelledby="diploma-camino" className="px-5 pb-14 pt-4 min-[900px]:pb-20">
      <h2 id="diploma-camino" className={`${TITULO_H2} text-center`}>
        {t.caminoTitulo}
      </h2>
      <ol className="mx-auto mt-8 max-w-[520px]">
        {t.pasos.map((paso, i) => {
          const ultimo = i === total - 1;
          return (
            <li key={paso.cuando} className="flex gap-4">
              <div aria-hidden className="flex w-10 shrink-0 flex-col items-center">
                <span
                  className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${
                    ultimo ? "bg-marca-verde text-white" : "bg-marca-verdeFondo text-marca-verdeOsc shadow-[inset_0_0_0_1px_#DCEFE1]"
                  }`}
                >
                  {iconos[i]}
                </span>
                {!ultimo && <span className="my-1.5 w-0 flex-1 border-l-2 border-dotted border-marca-puntoPendiente" />}
              </div>
              <div className={`min-w-0 pt-1 ${ultimo ? "" : "pb-7"}`}>
                <Etiqueta resaltada={ultimo}>{paso.cuando}</Etiqueta>
                <p className="mt-1.5 text-pretty text-[15px] leading-snug text-marca-tinta">
                  {paso.texto}
                  {paso.destacado && (
                    <>
                      {" "}
                      <strong className="font-bold">{paso.destacado}</strong>.
                    </>
                  )}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function Etiqueta({ children, resaltada }: { children: ReactNode; resaltada: boolean }) {
  const comun = "text-[11.5px] font-bold uppercase leading-none tracking-[0.08em]";
  return resaltada ? (
    <span className={`${comun} inline-block rounded-full bg-marca-amarillo px-2.5 py-[5px] text-marca-tinta`}>{children}</span>
  ) : (
    <span className={`${comun} block pt-[5px] text-marca-verdeOsc`}>{children}</span>
  );
}

// --- Iconos: trazo de 1,6 sobre 20, como los de la navegación. ---

function Svg({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  );
}

function IconoHablar() {
  return (
    <Svg>
      <path d="M3.5 5.2a1.7 1.7 0 0 1 1.7-1.7h9.6a1.7 1.7 0 0 1 1.7 1.7v6.1a1.7 1.7 0 0 1-1.7 1.7H9.2l-3.4 3v-3h-.6a1.7 1.7 0 0 1-1.7-1.7V5.2Z" />
      <path d="M7 7.4h6M7 10h3.8" />
    </Svg>
  );
}

/** Una medalla con su cinta: la promesa del diploma y el último paso. */
function IconoMedalla() {
  return (
    <Svg>
      <circle cx="10" cy="7.6" r="4.4" />
      <path d="M7.4 11.2 6.4 17l3.6-1.9 3.6 1.9-1-5.8" />
    </Svg>
  );
}

function IconoMeta() {
  return (
    <Svg>
      <path d="M5 17V3.5" />
      <path d="M5 4h9.2l-1.8 3 1.8 3H5" />
    </Svg>
  );
}

function IconoReloj() {
  return (
    <Svg>
      <circle cx="10" cy="10" r="6.6" />
      <path d="M10 6.4V10l2.4 1.5" />
    </Svg>
  );
}

function IconoCalendario() {
  return (
    <Svg>
      <rect x="3.4" y="4.4" width="13.2" height="12" rx="1.8" />
      <path d="M3.4 8.2h13.2M7 3v2.8M13 3v2.8" />
      <path d="M7.4 11.6l1.6 1.6 3.2-3.2" />
    </Svg>
  );
}
