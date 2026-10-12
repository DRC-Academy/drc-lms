import { textosActuales } from "@/lib/idioma-servidor";
import type { ProgresoDiploma } from "@/lib/diploma";
import { formatearFechaLarga } from "@/lib/perfil";
import { TARJETA, TITULO_SECCION } from "@/components/base/Seccion";
import { Barra } from "@/components/BannerDiploma";

// ---------------------------------------------------------------
// «MI DIPLOMA»
//
// La landing de drcacademy.com (`/tu-diploma-de-drc-academy/`) rehecha
// dentro del LMS y con el progreso de verdad del alumno. Mismo orden que
// la landing:
//
//   1. El diploma: título, entradilla y la imagen.
//   2. Dónde está el alumno: «X de 6 meses», la barra, la fecha prevista
//      y un mensaje según el tramo (`progresoDiploma`).
//   3. Las tres promesas.
//   4. La fluidez, con el vídeo de Mar.
//   5. El camino, en tres pasos.
//
// EL CAMINO NO REUTILIZA EL SENDERO DE «PARA TI» (`practica/Ruta.tsx`).
// Aquel es un mapa de paradas pulsables con geometría propia, mascota y
// generación dentro; aquí son tres pasos fijos que se leen de arriba
// abajo. Una línea vertical en CSS dice lo mismo sin forzar nada.
//
// SIN GAMIFICACIÓN. Ni confeti, ni puntos, ni insignias: el diploma es
// un hito. El estado conseguido felicita con palabras y nada más, y no
// lleva botón de descarga hasta que exista el archivo.
//
// MARCA: el verde va en la barra y en los pasos hechos; el amarillo
// solo de acento (el aro del paso actual). No hay botones en la página.
//
// Componente de servidor, sin estado. La página lo alimenta con el perfil
// del alumno de la sesión (`app/(alumno)/diploma/page.tsx`).
// ---------------------------------------------------------------

export default function PantallaDiploma({ progreso }: { progreso: ProgresoDiploma | null }) {
  const textos = textosActuales();
  const t = textos.diploma;
  const conseguido = progreso?.tramo === "conseguido";

  return (
    <main className="mx-auto w-full max-w-[960px] flex-1 px-5 pb-10 pt-[18px] min-[900px]:px-9 min-[900px]:pb-14 min-[900px]:pt-8">
      <header className="max-w-[640px]">
        <h1 className="font-display text-[28px] font-bold leading-[1.1] text-marca-tinta min-[900px]:text-[34px]">{t.titulo}</h1>
        <p className="mt-2 text-pretty text-[16px] leading-snug text-marca-tintaMedia">{t.entradilla}</p>
      </header>

      <div
        className={`mt-6 grid gap-5 min-[900px]:mt-8 min-[900px]:items-start min-[900px]:gap-7 ${
          conseguido ? "max-w-[560px]" : "min-[900px]:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]"
        }`}
      >
        {/* LA IMAGEN DE LA LANDING LLEVA UN CANDADO DIBUJADO («se
            desbloquea al completar el curso»). Conseguido el diploma, ese
            candado contradice la enhorabuena, así que no se enseña hasta
            tener la versión sin él. */}
        {!conseguido && (
        <figure className={`${TARJETA} overflow-hidden p-2`}>
          {/* `<img>` Y NO `next/image`, a propósito. El optimizador pide
              la imagen al propio servidor sin la cookie del alumno, el
              middleware le contesta con la redirección a `/acceso` y la
              imagen sale rota (ver el `matcher` de `middleware.ts`). Y
              `/diploma/` no se abre en el matcher: ahí irá la descarga
              del diploma, que es un documento con el nombre de alguien.
              Son 52 KB; el navegador la pide con su cookie. */}
          <img
            src="/diploma/diploma-landing.jpg"
            alt={t.altImagen}
            width={500}
            height={333}
            fetchPriority="high"
            className="h-auto w-full rounded-[10px]"
          />
        </figure>
        )}

        <Progreso progreso={progreso} />
      </div>

      <Promesas conseguido={conseguido} />
      <Fluidez />
      <Camino progreso={progreso} />
    </main>
  );
}

/** Dónde está el alumno. Sin fecha de inicio, una frase neutra: nunca un cero. */
function Progreso({ progreso }: { progreso: ProgresoDiploma | null }) {
  const textos = textosActuales();
  const t = textos.diploma;

  if (!progreso) {
    return (
      <section aria-labelledby="diploma-progreso" className={`${TARJETA} px-5 py-5 min-[900px]:px-6 min-[900px]:py-6`}>
        <h2 id="diploma-progreso" className={TITULO_SECCION}>
          {t.sinFecha.titular}
        </h2>
        <p className="mt-2 text-pretty text-[15px] leading-snug text-marca-tintaMedia">{t.sinFecha.texto}</p>
      </section>
    );
  }

  const conseguido = progreso.tramo === "conseguido";
  const mensaje = t.tramo[progreso.tramo];
  const fecha = formatearFechaLarga(progreso.fechaPrevista, textos.progreso.fechaLarga);

  return (
    <section aria-labelledby="diploma-progreso" className={`${TARJETA} px-5 py-5 min-[900px]:px-6 min-[900px]:py-6`}>
      <h2 id="diploma-progreso" className={`${TITULO_SECCION} text-pretty`}>
        {mensaje.titular}
      </h2>

      <p className="mt-4 flex flex-wrap items-baseline gap-x-2">
        <span className="font-display text-[40px] font-bold leading-none tabular-nums text-marca-tinta">{progreso.meses}</span>
        <span className="whitespace-nowrap text-[16px] text-marca-tintaMedia">{t.deMeses(progreso.mesesTotales)}</span>
      </p>

      <div className="mt-3">
        <Barra
          relleno={progreso.porcentaje}
          descripcion={t.barraLector(progreso.meses, progreso.mesesTotales)}
          conseguido={conseguido}
        />
      </div>

      <p className="mt-3 flex items-center gap-2 text-[14px] font-medium text-marca-tinta">
        <IconoCalendario />
        {conseguido ? t.conseguidoEl(fecha) : t.fechaPrevista(fecha)}
      </p>

      <p className="mt-4 border-t border-marca-nieblaOscura pt-4 text-pretty text-[15px] leading-snug text-marca-tintaMedia">
        {mensaje.texto}
      </p>
    </section>
  );
}

function Promesas({ conseguido }: { conseguido: boolean }) {
  const t = textosActuales().diploma;
  const iconos = [<IconoHablar key="h" />, <IconoPergamino key="p" />, <IconoMeta key="m" />];

  return (
    <section aria-labelledby="diploma-promesas" className="mt-10 min-[900px]:mt-14">
      <h2 id="diploma-promesas" className={TITULO_SECCION}>
        {conseguido ? t.promesasTituloConseguido : t.promesasTitulo}
      </h2>
      <ul className="mt-4 grid gap-3 min-[900px]:grid-cols-3 min-[900px]:gap-5">
        {t.promesas.map((promesa, i) => (
          <li key={promesa.titulo} className={`${TARJETA} flex gap-3.5 px-4 py-4 min-[900px]:flex-col min-[900px]:px-5 min-[900px]:py-5`}>
            <span aria-hidden className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-marca-verdeFondo text-marca-verdeOsc">
              {iconos[i]}
            </span>
            <div className="min-w-0">
              <h3 className="text-pretty font-display text-[17px] font-semibold leading-snug text-marca-tinta">{promesa.titulo}</h3>
              <p className="mt-1 text-pretty text-[14.5px] leading-snug text-marca-tintaMedia">{promesa.texto}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** El vídeo de Mar: nativo, con controles y sin arrancar solo. */
function Fluidez() {
  const t = textosActuales().diploma;

  return (
    <section
      aria-labelledby="diploma-fluidez"
      className="mt-10 min-[900px]:mt-14 min-[900px]:grid min-[900px]:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] min-[900px]:items-center min-[900px]:gap-10"
    >
      <div>
        <h2 id="diploma-fluidez" className={TITULO_SECCION}>
          {t.fluidezTitulo}
        </h2>
        <p className="mt-2 text-pretty text-[15px] leading-snug text-marca-tintaMedia">{t.fluidezTexto}</p>
      </div>
      <figure className="mt-4 min-[900px]:mt-0">
        {/* `#t=0.1`: sin póster, Safari en iPhone enseña un recuadro negro
            hasta que se pulsa; así pinta el primer fotograma. */}
        <video
          controls
          preload="metadata"
          playsInline
          width={800}
          height={800}
          className="aspect-square h-auto w-full rounded-[16px] border border-marca-borde bg-marca-tinta"
        >
          <source src="/diploma/mar-oliva.mp4#t=0.1" type="video/mp4" />
          {t.videoSinSoporte}
        </video>
        <figcaption className="mt-2 text-[13.5px] text-marca-gris">{t.videoPie}</figcaption>
      </figure>
    </section>
  );
}

/**
 * Los tres pasos, con una línea vertical que los une. El paso actual
 * lleva el aro amarillo; los hechos, el verde con su visto. Conseguido el
 * diploma, los tres están hechos.
 */
function Camino({ progreso }: { progreso: ProgresoDiploma | null }) {
  const t = textosActuales().diploma;
  const total = t.pasos.length;
  // Sin fecha, el alumno está en «Hoy». En el primer mes, también. Desde
  // ahí, en «Durante estos meses» hasta el día del diploma.
  const actual = progreso?.tramo === "conseguido" ? total : progreso && progreso.meses >= 1 ? 1 : 0;

  return (
    <section aria-labelledby="diploma-camino" className="mt-10 min-[900px]:mt-14">
      <h2 id="diploma-camino" className={TITULO_SECCION}>
        {t.caminoTitulo}
      </h2>
      <ol className="mt-5 max-w-[560px]">
        {t.pasos.map((paso, i) => {
          const hecho = i < actual;
          const esActual = i === actual;
          const ultimo = i === total - 1;
          return (
            <li key={paso.cuando} aria-current={esActual ? "step" : undefined} className="relative pb-6 pl-10 last:pb-0">
              {!ultimo && (
                <span
                  aria-hidden
                  className={`absolute bottom-0 left-[11px] top-[26px] w-[2px] rounded-full ${hecho ? "bg-marca-verde" : "bg-marca-pista"}`}
                />
              )}
              <span
                aria-hidden
                className={`absolute left-0 top-0 grid h-6 w-6 place-items-center rounded-full ${
                  hecho
                    ? "bg-marca-verde"
                    : esActual
                      ? "border-2 border-marca-verde bg-white shadow-[0_0_0_4px_rgba(255,196,0,0.35)]"
                      : "border-2 border-marca-puntoPendiente bg-white"
                }`}
              >
                {hecho && (
                  <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="#FFFFFF" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3.5 8.5l3 3 6-7" />
                  </svg>
                )}
                {esActual && <span className="h-2 w-2 rounded-full bg-marca-verde" />}
              </span>
              <p className="font-display text-[17px] font-semibold leading-6 text-marca-tinta">{paso.cuando}</p>
              <p className="mt-0.5 text-pretty text-[15px] leading-snug text-marca-tintaMedia">{paso.texto}</p>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

// --- Iconos: trazo de 1,6 sobre 20, como los de la navegación. ---

function IconoCalendario() {
  return (
    <svg aria-hidden viewBox="0 0 18 18" className="h-[18px] w-[18px] shrink-0 text-marca-verdeOsc" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2.6" y="3.9" width="12.8" height="11.2" rx="1.6" />
      <path d="M2.6 7.3h12.8M6.2 2.5v2.4M11.8 2.5v2.4" />
    </svg>
  );
}

function IconoHablar() {
  return (
    <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3.5 5.2a1.7 1.7 0 0 1 1.7-1.7h9.6a1.7 1.7 0 0 1 1.7 1.7v6.1a1.7 1.7 0 0 1-1.7 1.7H9.2l-3.4 3v-3h-.6a1.7 1.7 0 0 1-1.7-1.7V5.2Z" />
      <path d="M7 7.4h6M7 10h3.8" />
    </svg>
  );
}

function IconoPergamino() {
  return (
    <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5.6 4.2h8.6a1.9 1.9 0 0 1 1.9 1.9v7.8a1.9 1.9 0 0 1-1.9 1.9H5.6" />
      <ellipse cx="5.6" cy="10" rx="1.8" ry="5.8" />
      <path d="M8.9 8.2h4.6M8.9 11.4h3" />
    </svg>
  );
}

function IconoMeta() {
  return (
    <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 17V3.5" />
      <path d="M5 4h9.2l-1.8 3 1.8 3H5" />
    </svg>
  );
}
