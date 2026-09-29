import { ventanaAbierta, type ProximaClase } from "@/lib/clases";
import { diaLocal, sumarDias } from "@/lib/fechas";
import type { TextosClases } from "@/lib/textos/clases";
import { TARJETA } from "@/components/base/Seccion";
import { BotonClase } from "@/components/clases/BannerClase";
import RefrescoEnCortes from "@/components/clases/RefrescoEnCortes";

// ---------------------------------------------------------------
// LA PRÓXIMA CLASE EN MÓVIL: UNA FILA
//
// En «Mis clases» a 375px, la tarjeta grande de la próxima clase ocupaba
// la pantalla entera para decir lo mismo que el calendario de debajo.
// Aquí es una fila: la cara del profesor (sus iniciales), «Tu próxima
// clase» y cuándo, en corto —«Jueves, 18:00»—. Al pulsarla baja al
// calendario, que es donde está todo lo demás.
//
// EL ACCESO A LA SALA NO SE PIERDE. Dentro de la ventana —los
// `MINUTOS_ANTES` de antes y mientras dura— la fila lleva debajo el
// `BotonClase` de siempre, con su misma lógica: el enlace validado por
// `enlaceDeClase`, o la frase de pedírselo al profesor si no hay uno
// utilizable. Aquí no se decide nada de eso; solo se coloca.
//
// SIN JAVASCRIPT PARA EL DESPLAZAMIENTO. Es un ancla a la sección del
// calendario, y el desplazamiento suave lo pone una regla que solo vale
// mientras esta fila está en la página (`:has`). Con movimiento reducido,
// salto directo.
//
// Escritorio no cambia: allí sigue `BannerClase` (ver `PantallaClases`).
// ---------------------------------------------------------------

/** El id de la sección del calendario de «Mis clases» (`SemanaClases`). */
export const ID_CALENDARIO = "tu-calendario";

const DESPLAZAMIENTO_SUAVE = `
html:has([data-cta-proxima]) { scroll-behavior: smooth; }
@media (prefers-reduced-motion: reduce) { html:has([data-cta-proxima]) { scroll-behavior: auto; } }
`;

export default function CtaProximaClase({
  proxima,
  t,
  ahora,
}: {
  proxima: ProximaClase;
  t: TextosClases;
  ahora: Date;
}) {
  const abierta = ventanaAbierta(proxima, ahora);
  const rotulo = abierta ? (proxima.enCurso ? t.claseEnCurso : t.empiezaPronto) : t.proximaClase;

  return (
    <section data-cta-proxima data-tour="proxima-clase" className={`${TARJETA} p-2`}>
      <style dangerouslySetInnerHTML={{ __html: DESPLAZAMIENTO_SUAVE }} />

      {/* EL PASO «UNIRSE» DEL RECORRIDO, FUERA DE LA VENTANA. En móvil no
          hay botón gris que señalar, así que el paso señala esta fila con
          su texto de siempre: el botón aparece aquí media hora antes.
          Dentro de la ventana la marca la lleva el propio `BotonClase`. */}
      <a
        href={`#${ID_CALENDARIO}`}
        data-tour={abierta ? undefined : "unirse"}
        data-tour-estado={abierta ? undefined : "cerrada"}
        className="flex min-h-[56px] items-center gap-3 rounded-[12px] px-2 py-1.5 transition-colors hover:bg-marca-niebla focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marca-verde"
      >
        <Iniciales nombre={proxima.profesor} />
        <span className="min-w-0 flex-1">
          <span className="block text-[13px] font-semibold leading-tight text-marca-gris">{rotulo}</span>
          <span className="mt-0.5 block truncate font-display text-[18px] font-bold leading-tight text-marca-tinta">
            {t.cuandoCorto(cuandoCorto(proxima, t, ahora), proxima.desde)}
          </span>
        </span>
        <svg
          aria-hidden
          viewBox="0 0 20 20"
          className="h-5 w-5 shrink-0 text-marca-verdeOsc"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M5.5 8l4.5 4.5L14.5 8" />
        </svg>
        <span className="sr-only">{t.irAlCalendario}</span>
      </a>

      {abierta && (
        <div className="px-2 pb-2 pt-1">
          <BotonClase proxima={proxima} t={t} ahora={ahora} />
        </div>
      )}

      {/* Se vuelve a calcular al abrirse la sala y al terminar la clase:
          es lo que hace aparecer y desaparecer el botón sin recargar. */}
      <RefrescoEnCortes cortes={[proxima.abreEn.getTime(), proxima.terminaEn.getTime()]} />
    </section>
  );
}

/**
 * "hoy", "mañana", el nombre del día dentro de la semana que viene, y la
 * fecha larga más allá: un «jueves» a doce días de distancia sería el
 * jueves equivocado. Mismos días naturales españoles que `cuando`.
 */
function cuandoCorto(proxima: ProximaClase, t: TextosClases, ahora: Date): string {
  const hoy = diaLocal(ahora);
  if (proxima.fecha === hoy) return t.hoy;
  if (proxima.fecha === sumarDias(hoy, 1)) return t.manana;
  for (let n = 2; n <= 6; n++) {
    if (proxima.fecha === sumarDias(hoy, n)) return t.nombreDiaMinuscula(proxima.dia);
  }
  const [, mes, dia] = proxima.fecha.split("-").map(Number);
  return t.fechaLarga(proxima.dia, dia, mes - 1);
}

/**
 * Las iniciales del profesor, en blanco sobre el verde de marca.
 *
 * Salen del nombre: `teachers.avatar` de Gestión guarda las mismas
 * iniciales, pero ninguna vista lo expone y la regla es leer por vistas.
 * Sin profesor, un círculo con la cámara de la videollamada.
 */
function Iniciales({ nombre }: { nombre: string | null }) {
  const iniciales = (nombre ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((palabra) => palabra.charAt(0).toUpperCase())
    .join("");

  return (
    <span aria-hidden className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-marca-verde">
      {iniciales ? (
        <span className="font-display text-[16px] font-bold leading-none text-white">{iniciales}</span>
      ) : (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="6.5" width="12.5" height="11" rx="2.5" />
          <path d="M15.5 10.5l5-3v9l-5-3" />
        </svg>
      )}
    </span>
  );
}
