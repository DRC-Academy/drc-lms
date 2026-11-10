import type { ReactNode } from "react";
import { textosActuales } from "@/lib/idioma-servidor";
import { urlActualizarPago } from "@/lib/cuenta-woo";
import Banner from "@/components/Banner";
import MascotaBienvenida from "@/components/mascota/MascotaBienvenida";
import { TARJETA, TITULO_SECCION } from "@/components/base/Seccion";

// ---------------------------------------------------------------
// «PARA TI», PARA QUIEN NO LO TIENE
//
// Sin lenguaje de error: esta persona no ha hecho nada mal. El cierre de
// verdad está en el servidor (`paraTiCerrado`).
//
// DOS CASOS, DOS PANTALLAS:
//
//   · Plan en espera de pago (`enEspera`): lo de siempre. Su título, su
//     texto y el botón de actualizar el pago. Es alumno con plan y no se le
//     vende nada.
//   · Black Pass sin plan: LA PÁGINA QUE INVITA A LAS CLASES 1:1 (11/11/2026).
//     Arriba la franja destacada de la app (`Banner`, la misma de «Continúa
//     donde lo dejaste»), con la mascota y el botón. Debajo, lo que suman
//     las clases, un ejemplo de cómo llega Para ti y un cierre con el
//     segundo botón. Los dos botones van a `url` —`RUTA_AMPLIAR`—, que le
//     lleva a `URL_PLANES_CON_CLASES` (WhatsApp) y apunta el clic con la
//     pantalla y qué botón fue (`desde`).
//
// Sin precios, sin plazos y sin urgencia. Todo en tinta sobre blanco o en
// blanco sobre la franja: nada de gris en los textos de apoyo.
//
// EL BOTÓN DE LA ESPERA VA EN `drc-verde-solido` (#037A36): con el blanco da
// 5,5:1, que pasa AA.
// ---------------------------------------------------------------

const BOTON_ESPERA =
  "inline-flex min-h-[52px] w-full items-center justify-center rounded-full bg-drc-verde-solido px-6 text-center text-[16px] font-semibold text-white transition-colors hover:bg-marca-tinta focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marca-verdeOsc sm:w-auto";

export default function ParaTiBloqueado({ url, enEspera }: { url: string; enEspera: boolean }) {
  return enEspera ? <EnEspera /> : <InvitacionClases url={url} />;
}

function Candado({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="4.5" y="10.5" width="15" height="10" rx="2.5" />
      <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

function EnEspera() {
  const t = textosActuales().pases;

  return (
    <main className="mx-auto flex w-full max-w-[520px] flex-1 flex-col justify-center px-5 pb-[120px] pt-10">
      <span aria-hidden className="grid h-14 w-14 place-items-center rounded-2xl bg-marca-verdeFondo text-marca-verdeOsc">
        <Candado />
      </span>

      <h1 className="mt-5 font-display text-[28px] font-bold leading-[1.15] text-marca-tinta">{t.paraTiTituloEnEspera}</h1>

      <p className="mt-3 text-pretty text-[16px] leading-[1.55] text-marca-tintaMedia">{t.paraTiEnEspera}</p>

      <div className="mt-7">
        <a href={urlActualizarPago(null)} className={BOTON_ESPERA}>
          {t.avisoPagoBoton}
        </a>
      </div>
    </main>
  );
}

/** Con qué botón se pulsó, para el registro del clic (`app/ampliar-plan`). */
function conDesde(url: string, desde: "arriba" | "abajo"): string {
  return `${url}${url.includes("?") ? "&" : "?"}desde=${desde}`;
}

const ICONOS: ReactNode[] = [
  // Videollamada
  <svg key="video" aria-hidden width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="6" width="13" height="12" rx="2.5" />
    <path d="m16 10.5 5-3v9l-5-3" />
  </svg>,
  // Para ti: una lista con su marca
  <svg key="lista" aria-hidden width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 6h11M9 12h11M9 18h11" />
    <path d="m3.5 6 1.2 1.2L7 5M3.5 12l1.2 1.2L7 11M3.5 18l1.2 1.2L7 17" />
  </svg>,
  // Avance
  <svg key="avance" aria-hidden width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 19h16" />
    <path d="M7 15v-3M12 15V8M17 15V5" />
  </svg>,
];

function InvitacionClases({ url }: { url: string }) {
  const t = textosActuales().pases;

  return (
    <main className="mx-auto w-full max-w-[880px] flex-1 px-4 pb-[120px] pt-[18px] min-[900px]:px-9 min-[900px]:pt-8">
      {/* 1. LA FRANJA: lo primero que se ve, con el botón al alcance del pulgar. */}
      <div className="entra">
        <Banner
          eyebrow={t.paraTiEtiqueta}
          title={t.paraTiTitulo}
          subtitle={t.paraTiTexto}
          action={{ label: t.paraTiBoton, href: conDesde(url, "arriba"), externo: true }}
          secondaryText={t.paraTiNota}
          ilustracion={<MascotaBienvenida id="para-ti-clases" prioridad={1} variante="franja" />}
        />
      </div>

      {/* 2. LO QUE SUMAN: tres razones, una por tarjeta. */}
      <section
        aria-labelledby="para-ti-suman"
        className="entra mt-[26px] min-[900px]:mt-9"
        style={{ animationDelay: "var(--paso-escalonado)" }}
      >
        <h2 id="para-ti-suman" className={TITULO_SECCION}>
          {t.paraTiSumanTitulo}
        </h2>
        <ul className="mt-3 grid gap-3 min-[720px]:grid-cols-3">
          {t.paraTiSuman.map((razon, i) => (
            // En móvil, el icono a la izquierda: tres tarjetas en columna con
            // el icono encima eran media pantalla de más.
            <li key={razon.titulo} className={`${TARJETA} flex gap-3.5 px-4 py-4 min-[720px]:block min-[720px]:px-5 min-[720px]:py-5`}>
              <span aria-hidden className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-marca-verdeFondo text-marca-verdeOsc">
                {ICONOS[i]}
              </span>
              <div className="min-w-0 min-[720px]:mt-3">
                <h3 className="font-display text-[17px] font-bold leading-[1.25] text-marca-tinta">{razon.titulo}</h3>
                <p className="mt-1 text-pretty text-[14.5px] leading-[1.5] text-marca-tinta min-[720px]:mt-1.5">{razon.texto}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* 3. EL EJEMPLO: cómo es un bloque de Para ti, para que se vea qué
          se gana. Lleva «Ejemplo» bien visible: no es un bloque suyo. */}
      <section
        aria-labelledby="para-ti-ejemplo"
        className="entra mt-[26px] min-[900px]:mt-9"
        style={{ animationDelay: "calc(var(--paso-escalonado) * 2)" }}
      >
        <h2 id="para-ti-ejemplo" className={TITULO_SECCION}>
          {t.paraTiEjemploTitulo}
        </h2>
        <div className={`${TARJETA} mt-3 px-5 py-5 min-[900px]:px-7 min-[900px]:py-6`}>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <span className="rounded-full bg-marca-amarillo px-2.5 py-1 text-[12px] font-bold uppercase tracking-[0.06em] text-marca-tinta">
              {t.paraTiEjemploEtiqueta}
            </span>
            <span className="text-[14px] font-medium text-marca-tinta">{t.paraTiEjemploContexto}</span>
          </div>
          <p className="mt-3 font-display text-[22px] font-bold leading-[1.2] text-marca-tinta">{t.paraTiEjemploNombre}</p>
          <ul className="mt-3 flex flex-col gap-2.5">
            {t.paraTiEjemploFilas.map((fila) => (
              <li key={fila} className="flex items-start gap-2.5 text-[15px] leading-[1.45] text-marca-tinta">
                <span aria-hidden className="mt-[3px] grid h-5 w-5 shrink-0 place-items-center rounded-full bg-marca-verde text-white">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m5 12 4.5 4.5L19 7" />
                  </svg>
                </span>
                {fila}
              </li>
            ))}
          </ul>
          <p className="mt-4 flex items-center gap-2 border-t border-marca-borde pt-4 text-[14px] font-semibold text-marca-tinta">
            <Candado className="h-[18px] w-[18px] text-marca-verdeOsc" />
            {t.paraTiEjemploPie}
          </p>
        </div>
      </section>

      {/* 4. EL CIERRE: para quien ha leído hasta aquí, el segundo botón. */}
      <section
        aria-labelledby="para-ti-cierre"
        className={`entra ${TARJETA} mt-[26px] px-5 py-6 min-[900px]:mt-9 min-[900px]:px-8 min-[900px]:py-7`}
        style={{ animationDelay: "calc(var(--paso-escalonado) * 3)" }}
      >
        <h2 id="para-ti-cierre" className="text-balance font-display text-[24px] font-bold leading-[1.15] text-marca-tinta">
          {t.paraTiCierreTitulo}
        </h2>
        <p className="mt-2 max-w-[600px] text-pretty text-[15.5px] leading-[1.5] text-marca-tinta">{t.paraTiCierreTexto}</p>
        <a
          href={conDesde(url, "abajo")}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-verde mt-5 flex min-h-[48px] w-full items-center justify-center rounded-full px-7 text-[15.5px] font-bold min-[720px]:w-fit"
        >
          {t.paraTiCierreBoton}
        </a>
        <p className="mt-4 text-pretty text-[14px] leading-[1.45] text-marca-tinta">{t.paraTiSigue}</p>
      </section>
    </main>
  );
}
