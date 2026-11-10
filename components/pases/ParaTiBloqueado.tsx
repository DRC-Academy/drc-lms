import { textosActuales } from "@/lib/idioma-servidor";
import { urlActualizarPago } from "@/lib/cuenta-woo";

// ---------------------------------------------------------------
// «PARA TI», PARA QUIEN NO LO TIENE
//
// Dice de qué depende, sin lenguaje de error: esta persona no ha hecho nada
// mal. El cierre de verdad está en el servidor (`paraTiCerrado`).
//
// A QUIEN NO TIENE CLASES (Black Pass) LE INVITA: qué es Para ti, que va con
// las clases 1:1 y un botón a WhatsApp (`URL_PLANES_CON_CLASES`), todo en
// tinta. A quien tiene el plan en espera de pago le sale lo de siempre: su
// título, su texto y el botón de actualizar el pago.
//
// EL BOTÓN VA EN `drc-verde-solido` (#037A36): con el blanco da 5,5:1, que
// pasa AA. El verde de marca de los rellenos no llega con texto de este tamaño.
// ---------------------------------------------------------------

const BOTON =
  "inline-flex min-h-[52px] w-full items-center justify-center rounded-full bg-drc-verde-solido px-6 text-center text-[16px] font-semibold text-white transition-colors hover:bg-marca-tinta focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marca-verdeOsc sm:w-auto";

export default function ParaTiBloqueado({ url, enEspera }: { url: string; enEspera: boolean }) {
  const t = textosActuales().pases;

  return (
    <main className="mx-auto flex w-full max-w-[520px] flex-1 flex-col justify-center px-5 pb-[120px] pt-10">
      <span aria-hidden className="grid h-14 w-14 place-items-center rounded-2xl bg-marca-verdeFondo text-marca-verdeOsc">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="4.5" y="10.5" width="15" height="10" rx="2.5" />
          <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
        </svg>
      </span>

      <h1 className="mt-5 text-balance font-display text-[28px] font-bold leading-[1.15] text-marca-tinta">
        {enEspera ? t.paraTiTituloEnEspera : t.paraTiTitulo}
      </h1>

      {enEspera ? (
        <p className="mt-3 text-pretty text-[16px] leading-[1.55] text-marca-tintaMedia">{t.paraTiEnEspera}</p>
      ) : (
        <>
          <p className="mt-3 text-pretty text-[16px] leading-[1.55] text-marca-tinta">{t.paraTiTexto}</p>
          <p className="mt-3 text-pretty text-[16px] leading-[1.55] text-marca-tinta">{t.paraTiLinea}</p>
        </>
      )}

      <div className="mt-7">
        {enEspera ? (
          <a href={urlActualizarPago(null)} className={BOTON}>
            {t.avisoPagoBoton}
          </a>
        ) : (
          <a href={url} target="_blank" rel="noopener noreferrer" className={BOTON}>
            {t.paraTiBoton}
          </a>
        )}
      </div>
    </main>
  );
}
