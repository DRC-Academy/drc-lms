import { textosActuales } from "@/lib/idioma-servidor";
import Link from "next/link";
import type { EstadoDiploma, ProgresoDiploma } from "@/lib/diploma";
import { formatearFechaLarga } from "@/lib/perfil";
import { TARJETA, TituloSeccion } from "@/components/base/Seccion";

/**
 * EL DIPLOMA, EN SU TARJETA.
 *
 * ---------------------------------------------------------------
 * SEIS MESES, NO LECCIONES (12/10/2026)
 *
 * El diploma se consigue al cumplir seis meses de calendario desde la
 * fecha de inicio. La cifra grande es la de los meses («3 de 6 meses»),
 * la barra avanza por días y debajo van la fecha prevista y, como dato
 * secundario, las lecciones hechas. Todo sale de `progresoDiploma`, el
 * mismo cálculo que «Mi diploma», «Mi progreso» y «Cómo vas».
 *
 * TODA LA TARJETA LLEVA A «MI DIPLOMA», con el enlace estirado sobre la
 * caja (`after:inset-0`) y no envolviéndola: así el botón de «Empezar mi
 * curso», cuando lo hay, sigue siendo un enlace propio por encima, y no
 * un enlace dentro de otro.
 *
 * SIN FECHA DE INICIO no hay cifra: una frase neutra y el enlace. Nunca
 * un «0 de 6».
 * ---------------------------------------------------------------
 *
 * LA BARRA Y SUS GESTOS (de la versión anterior, siguen igual): al
 * entrar el carril se llena de cero a su sitio (`.llena`), un brillo lo
 * recorre (`.barre`) y la punta asoma con un halo (`.punta`). Y ahí se
 * acaba: nada late en bucle. Con movimiento reducido sale llena y quieta.
 *
 * Se renderiza en el servidor: no tiene estado ni interacción.
 */
export default function BannerDiploma({
  progreso,
  lecciones = null,
  hrefDiploma,
  href = null,
}: {
  /** De `progresoDiploma`. Null sin fecha de inicio. */
  progreso: ProgresoDiploma | null;
  /** Las lecciones del curso principal, solo como dato secundario. */
  lecciones?: EstadoDiploma | null;
  /** «Mi diploma», con el foco de revisión si lo hay. */
  hrefDiploma: string;
  /**
   * El botón «Empezar mi curso» / «Ir a la siguiente lección». Sin él no
   * hay botón —en el inicio la franja de debajo ya tiene su «Continuar»—.
   */
  href?: string | null;
}) {
  const textos = textosActuales();
  const t = textos.banners;
  const td = textos.diploma;

  const conseguido = progreso?.tramo === "conseguido";
  const hechas =
    lecciones?.estado === "en-curso" ? lecciones.completadas : lecciones?.estado === "conseguido" ? lecciones.total : null;
  const fecha = progreso ? formatearFechaLarga(progreso.fechaPrevista, textos.progreso.fechaLarga) : null;
  const pie = [
    fecha && progreso ? (conseguido ? td.conseguidoEl(fecha) : td.fechaPrevista(fecha)) : null,
    hechas !== null && hechas > 0 ? td.leccionesHechas(hechas) : null,
  ].filter(Boolean);

  return (
    <section aria-labelledby="titulo-diploma" className={`${TARJETA} relative px-5 py-5 min-[900px]:px-6`}>
      <div className="flex items-start gap-3">
        <span aria-hidden className="mt-[6px] grid h-8 w-8 shrink-0 place-items-center rounded-full bg-marca-verdeFondo">
          <IconoDiploma conseguido={conseguido} />
        </span>
        <TituloSeccion id="titulo-diploma" className="min-w-0 flex-1 self-center">
          {conseguido ? t.diplomaConseguido : t.tuDiploma}
        </TituloSeccion>
        <Link
          href={hrefDiploma}
          className="flex min-h-[44px] shrink-0 items-center gap-1 rounded-[8px] text-[14px] font-semibold text-marca-verdeOsc after:absolute after:inset-0 after:rounded-[16px] after:content-[''] hover:underline focus-visible:outline-none focus-visible:after:outline focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-marca-verdeOsc"
        >
          {t.verMiDiploma}
          <svg aria-hidden viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 3.5 10.5 8 6 12.5" />
          </svg>
        </Link>
      </div>

      {/* La frase va a lo ancho, debajo de la fila del título: al lado
          del enlace se quedaba en una columna de tres palabras. */}
      {(!progreso || !conseguido) && (
        <p className="mt-2 text-pretty text-[14.5px] leading-snug text-marca-gris">
          {progreso ? t.diplomaFrase : td.sinFecha.texto}
        </p>
      )}

      {progreso && (
        <>
          {/* LA CIFRA GRANDE SON LOS MESES CUMPLIDOS: «3 de 6 meses». */}
          <p className="mt-4 flex flex-wrap items-baseline gap-x-2">
            <span className="font-display text-[32px] font-bold leading-none tabular-nums text-marca-tinta">{progreso.meses}</span>
            <span className="whitespace-nowrap text-[15px] text-marca-tintaMedia">{td.deMeses(progreso.mesesTotales)}</span>
          </p>

          <div className="mt-3">
            <Barra
              relleno={progreso.porcentaje}
              descripcion={td.barraLector(progreso.meses, progreso.mesesTotales)}
              conseguido={conseguido}
            />
          </div>
        </>
      )}

      {pie.length > 0 && <p className="mt-3 text-[13.5px] leading-snug text-marca-gris">{pie.join(" · ")}</p>}

      {href && (
        <Link
          href={href}
          className="btn-verde-linea relative z-10 mt-4 flex min-h-[44px] w-full items-center justify-center rounded-full px-6 text-[15px] font-bold min-[900px]:w-fit"
        >
          {hechas === null || hechas === 0 ? t.empezarMiCurso : t.siguienteLeccion}
        </Link>
      )}
    </section>
  );
}

/**
 * El carril del curso entero. El porcentaje solo se ve, no se escribe:
 * la distancia se lee mejor de lo que se cuenta.
 *
 * La punta —el punto claro donde llega el relleno— es el único adorno,
 * y está donde el ojo ya mira. Al llegar al final se convierte en el
 * sello, que es lo único que celebra en toda la pieza.
 */
function Barra({
  relleno,
  descripcion,
  conseguido,
}: {
  relleno: number;
  descripcion: string;
  conseguido: boolean;
}) {
  return (
    <div
      role="progressbar"
      aria-valuenow={relleno}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={descripcion}
      className="relative h-3 rounded-[6px] bg-marca-pista"
    >
      {/* El ancho se queda en línea —es el estado en reposo, y el
          correcto— y lo que se anima es la escala. Ver `.llena`. */}
      <div
        className="barre llena relative h-full overflow-hidden rounded-[6px] bg-gradient-to-r from-marca-verde to-marca-verdeClaro"
        style={{ width: `${relleno}%` }}
      />

      {conseguido ? (
        <span
          aria-hidden
          className="punta absolute right-[-4px] top-1/2 grid h-[22px] w-[22px] -translate-y-1/2 place-items-center rounded-full border-2 border-marca-niebla bg-marca-verde"
        >
          <svg
            viewBox="0 0 20 20"
            className="h-3 w-3"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M6.4 10.4l2.4 2.4 4.8-5.2" />
          </svg>
        </span>
      ) : (
        <span
          aria-hidden
          className="punta absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#6FD98A]"
          style={{ left: `${relleno}%` }}
        />
      )}
    </div>
  );
}

/**
 * EL DIPLOMA, NO UNA MEDALLA. Un medallón con cinta es el icono de ganar
 * una carrera: premia un resultado y lo compara con el de otros. Un
 * diploma acredita que has hecho un curso, y eso se dibuja como un
 * pergamino: la hoja con su rollo a la izquierda.
 *
 * SIN CÍRCULO DETRÁS. Lo llevaba —52px en móvil, 68 en escritorio— y era
 * la mitad de la altura de la pieza para envolver un icono de 27px. Sin
 * caja alrededor no hay nada que ese círculo separe de nada.
 */
function IconoDiploma({ conseguido }: { conseguido: boolean }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 20 20"
      className="h-4 w-4 shrink-0"
      fill="none"
      stroke="#14722A"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* La hoja. Se cierra sola por la izquierda, donde va el rollo. */}
      <path d="M5.6 4.2h8.6a1.9 1.9 0 0 1 1.9 1.9v7.8a1.9 1.9 0 0 1-1.9 1.9H5.6" />
      {/* El rollo. */}
      <ellipse cx="5.6" cy="10" rx="1.8" ry="5.8" />
      {/* Dos renglones mientras se persigue; un visto cuando ya está. */}
      {conseguido ? (
        <path d="M8.9 10.2l1.7 1.7 3.2-3.4" />
      ) : (
        <path d="M8.9 8.2h4.6M8.9 11.4h3" />
      )}
    </svg>
  );
}
