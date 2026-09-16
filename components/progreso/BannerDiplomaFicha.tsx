import { textosActuales } from "@/lib/idioma-servidor";
import type { EstadoDiploma } from "@/lib/diploma";

// ---------------------------------------------------------------
// EL BANNER DEL DIPLOMA EN LA FICHA DE PROGRESO
//
// ⚠ ES LA COPIA de `components/DiplomaBanner.tsx` de DRC Gestión: mismo
// dibujo, mismas clases `pg-diploma-*`, mismo copy. Va justo debajo de
// la caja "Tu nivel", como allí. Si allí cambia una frase o un píxel,
// aquí cambia lo mismo.
//
// Un banner compacto de tres renglones: un rótulo en verde arriba (el
// mismo estilo del "TU PROGRESO" de la entradilla), la cifra de
// protagonista y el carril fino debajo. Tres estados:
//
//   · en curso  → "TU CAMINO AL DIPLOMA", las lecciones que faltan en
//                 grande, "N de M" a la derecha y el carril con relleno;
//   · sin empezar (en curso con cero lecciones) → "TU CURSO TE ESPERA",
//                 una frase y un botón secundario. Sin carril ni contador;
//   · conseguido → "DIPLOMA CONSEGUIDO", el carril lleno con el sello ✓
//                 y "M de M" a la derecha. Sin cifra de restantes.
//
// Y "sin curso" no pinta nada: la tarjeta no existe.
//
// LO ÚNICO QUE NO SE COPIA, y es a propósito:
//
//   1. LA CARGA. Gestión le pide este dato al LMS por HTTP y lo pinta
//      cuando llega, con un hueco reservado y un esqueleto para que el
//      botón "Amplía tu plan" no se mueva. Aquí el dato es nuestro y
//      viene en el mismo render: la tarjeta o está o no está, y nada se
//      desplaza. Por eso no hay esqueleto, ni promesa, ni cierre animado.
//
//   2. EL BOTÓN DE QUIEN NO HA EMPEZADO. Allí dice "Ir a la plataforma"
//      y abre el LMS en una pestaña nueva, porque la ficha vive embebida
//      en Mi cuenta de WooCommerce. Aquí el alumno YA ESTÁ en la
//      plataforma: el botón lleva a la lección que toca —la misma ruta
//      que la pestaña "Mi curso" de la cabecera— y en la misma pestaña.
//
// SIEMPRE "LECCIONES", NUNCA "CLASES". La caja de arriba cuenta clases
// con el profesor; esto cuenta lecciones del curso, que son otra cosa.
// La palabra es la única pista que tiene el alumno para no mezclar los
// dos números.
//
// Se renderiza en el servidor: no tiene estado ni interacción.
// ---------------------------------------------------------------

export default function BannerDiplomaFicha({
  diploma,
  hrefCurso,
}: {
  diploma: EstadoDiploma;
  /** A dónde lleva el botón de quien no ha empezado, ya con el foco de revisión. */
  hrefCurso: string;
}) {
  if (diploma.estado === "sin-curso") return null;
  const t = textosActuales().banners;

  if (diploma.estado === "conseguido") {
    return (
      <section className="pg-card pg-diploma pg-rise" style={{ animationDelay: "90ms" }} aria-label={t.diplomaConseguido}>
        <p className="pg-diploma-titulo">{t.diplomaConseguido}</p>
        <div className="pg-diploma-fila pg-diploma-fila-centrada">
          <p className="pg-diploma-texto">
            <span className="pg-diploma-desc">{t.todasLasLecciones}</span>
          </p>
          <span className="pg-diploma-cuenta">{t.progresoDiploma(diploma.total, diploma.total)}</span>
        </div>
        <Barra relleno={100} descripcion={t.cursoCompletado} conseguido />
      </section>
    );
  }

  // En curso sin empezar: una invitación y el botón, en vez de una barra vacía.
  if (diploma.completadas === 0) {
    return (
      <section className="pg-card pg-diploma pg-rise" style={{ animationDelay: "90ms" }} aria-label={t.tuCursoTeEspera}>
        <p className="pg-diploma-titulo">{t.tuCursoTeEspera}</p>
        <p className="pg-diploma-frase">{t.comienzaElCamino}</p>
        <a className="pg-diploma-cta" href={hrefCurso}>{t.empezarMiCurso}</a>
      </section>
    );
  }

  return (
    <section className="pg-card pg-diploma pg-rise" style={{ animationDelay: "90ms" }} aria-label={t.tuCaminoAlDiploma}>
      <p className="pg-diploma-titulo">{t.tuCaminoAlDiploma}</p>
      <div className="pg-diploma-fila">
        <p className="pg-diploma-texto">
          <span className="pg-diploma-cifra">{diploma.restantes}</span>
          <span className="pg-diploma-desc">{t.leccionesParaTuDiploma(diploma.restantes)}</span>
        </p>
        <span className="pg-diploma-cuenta">{t.progresoDiploma(diploma.completadas, diploma.total)}</span>
      </div>
      <Barra
        relleno={diploma.porcentaje}
        descripcion={t.faltanParaDiploma(diploma.restantes, diploma.total)}
        conseguido={false}
      />
    </section>
  );
}

/** El carril. El porcentaje solo se ve; el recuento de arriba es su escala. */
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
      className="pg-diploma-barra"
      role="progressbar"
      aria-valuenow={relleno}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={descripcion}
    >
      <div className="pg-diploma-relleno" style={{ width: `${relleno}%` }} />
      {conseguido ? (
        <span className="pg-diploma-sello" aria-hidden>
          <svg
            viewBox="0 0 20 20"
            width="12"
            height="12"
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
        <span className="pg-diploma-punta" aria-hidden style={{ left: `${relleno}%` }} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------
// ESTILOS. Se concatenan a la hoja de la ficha (`CSS_FICHA` en
// `Ficha.tsx`), detrás de todo lo demás, igual que en Gestión: así el
// padding propio de esta tarjeta gana al de `.pg-card`, también en móvil.
//
// Es el `DIPLOMA_CSS` de Gestión sin lo que solo servía para la carga
// diferida (la transición de cierre, el esqueleto y el hueco reservado).
// Las alturas fijas por renglón se quedan: son las que hacen que los
// tres estados midan lo mismo (78 px de contenido) y se vean iguales
// que allí.
//
// El rótulo copia el `.pg-eyebrow` de la entradilla ("TU PROGRESO":
// 11,5 px, negrita, mayúsculas, espaciado, verde oscuro).
// ---------------------------------------------------------------

export const CSS_DIPLOMA = `
/* ── Diploma ────────────────────────────────────────────────────────────── */
.pg-diploma {
  box-sizing: border-box;
  /* Menos aire vertical que las otras tarjetas (24 px): son tres renglones. */
  padding: 20px 26px;
}
/* Un poco más ancha que sus vecinas, comiéndose 12 px del margen lateral de
   .pg-main a cada lado. Solo donde ese margen existe: en el móvil es de 14 px. */
@media (min-width: 721px) { .pg-diploma { margin-left: -12px; margin-right: -12px; } }
@media (max-width: 720px) { .pg-diploma { padding: 16px 18px; } }

/* Renglón 1: el rótulo. */
.pg-diploma-titulo {
  height: 14px; line-height: 14px; margin: 0 0 8px;
  font-size: 11.5px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase;
  color: var(--pg-green-dark);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}

/* Renglón 2 (en curso y conseguido): la cifra a la izquierda, el recuento al
   extremo derecho. Altura FIJA: con align-items baseline y dos cuerpos
   distintos la línea crecía medio píxel. */
.pg-diploma-fila { display: flex; align-items: baseline; justify-content: space-between; gap: 16px; height: 32px; margin-bottom: 12px; }
/* Conseguido: sin cifra grande, la frase se centra en el renglón para no quedar
   pegada al rótulo con aire debajo. */
.pg-diploma-fila-centrada { align-items: center; }
.pg-diploma-texto { display: flex; align-items: baseline; gap: 7px; min-width: 0; margin: 0; }
.pg-diploma-cifra {
  flex-shrink: 0; font-size: 26px; font-weight: 700; letter-spacing: -0.03em; line-height: 1.1;
  color: var(--pg-ink);
}
.pg-diploma-desc {
  min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  font-size: 15px; line-height: 1.25; color: var(--pg-muted);
}
.pg-diploma-cuenta { flex-shrink: 0; white-space: nowrap; font-size: 12.5px; line-height: 1; color: var(--pg-faint); }

/* Renglón 3: el carril. */
.pg-diploma-barra { position: relative; height: 12px; border-radius: 6px; background: #E8EEE9; }
.pg-diploma-relleno { height: 100%; border-radius: 6px; background: linear-gradient(90deg, var(--pg-green) 0%, #37C25A 100%); }
.pg-diploma-punta {
  position: absolute; top: 50%; width: 10px; height: 10px; border-radius: 999px;
  background: #6FD98A; transform: translate(-50%, -50%);
}
.pg-diploma-sello {
  position: absolute; right: -4px; top: 50%; width: 22px; height: 22px; border-radius: 999px;
  border: 2px solid var(--pg-cream); background: var(--pg-green);
  display: grid; place-items: center; transform: translateY(-50%);
}

/* Sin empezar: la frase y, debajo, el botón. 22 + 6 + 28 = los mismos 56 px
   que ocupan la fila de la cifra y el carril. */
.pg-diploma-frase {
  height: 22px; line-height: 22px; margin: 0 0 6px;
  font-size: 15px; color: var(--pg-ink);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
/* Botón secundario: píldora con borde, sin relleno ni sombra. Discreto a
   propósito: el "Amplía tu plan" verde macizo de abajo es el CTA de la página
   y este no le compite. En bloque, no inline: un inline-block arrastraba el
   line box del padre. */
.pg-diploma-cta {
  display: flex; align-items: center; width: fit-content; box-sizing: border-box;
  height: 28px; padding: 0 13px; border-radius: 999px;
  border: 1.5px solid #B7DCC0; background: transparent;
  font-size: 13px; line-height: 1; font-weight: 600; color: var(--pg-green-dark);
  text-decoration: none; white-space: nowrap;
  transition: background 0.16s ease, border-color 0.16s ease;
}
.pg-diploma-cta:hover { background: #E9F4EB; border-color: #8FC99E; }
.pg-diploma-cta:focus-visible { outline: 2px solid var(--pg-green); outline-offset: 2px; }

@media (prefers-reduced-motion: reduce) {
  .pg-diploma-cta { transition: none; }
}
`;
