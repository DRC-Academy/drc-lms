import { textosActuales } from "@/lib/idioma-servidor";
import { urlActualizarPago } from "@/lib/cuenta-woo";

/**
 * El pago pendiente de quien además tiene pase. No bloquea: sus cursos los
 * tiene pagados aparte. El aviso que tapa la pantalla es `AvisoImpago`, y a
 * esta persona no le sale (`estadoDeAcceso`).
 */
export default function AvisoPagoPase() {
  const t = textosActuales().pases;

  return (
    <section className="mb-4 rounded-[16px] border border-marca-borde bg-white px-5 py-4 min-[900px]:mb-[22px]">
      <h2 className="font-display text-[17px] font-semibold leading-[1.25] text-marca-tinta">{t.avisoPagoTitulo}</h2>
      <p className="mt-1 text-pretty text-[14.5px] leading-[1.5] text-marca-tintaMedia">{t.avisoPagoTexto}</p>
      <a
        href={urlActualizarPago(null)}
        className="mt-3 inline-flex min-h-[44px] items-center justify-center rounded-full bg-drc-verde-solido px-5 text-[14.5px] font-semibold text-white transition-colors hover:bg-marca-tinta focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marca-verdeOsc"
      >
        {t.avisoPagoBoton}
      </a>
    </section>
  );
}
