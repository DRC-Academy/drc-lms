import type { Estimacion } from "@/lib/estimacion";
import { enMeses } from "@/lib/estimacion";

// ---------------------------------------------------------------
// EL BANNER DE AMPLIACIÓN
//
// Lo que le costaría al alumno llegar a su meta con su plan de hoy y
// con los dos siguientes, para que vea qué se ahorra pagando más.
//
// ⚠ ESTE ES EL PRIMER BLOQUE QUE YA NO ES RÉPLICA DE GESTIÓN. La ficha
// de `components/progreso/Ficha.tsx` se copia de allí bloque a bloque
// —lo dice su cabecera— y este banner salió de ella para rediseñarse:
// fondo claro en vez del verde oscuro, otro copy y el ahorro de meses
// como pieza principal. Mientras el rediseño no baje también a Gestión,
// un alumno que abra el enlace de su profesor verá el banner viejo y en
// el LMS el nuevo. Es a propósito y queda avisado; no es una deriva.
//
// EL CÁLCULO NO SE TOCA. Todo lo que se pinta sale ya hecho de
// `lib/estimacion.ts`, que es el port literal del de Gestión: aquí no se
// suma, no se redondea y no se decide ninguna cifra. Si un número no
// cuadrara con el de Gestión, el fallo estaría allí y no en esta
// pantalla.
//
// POR QUÉ ES UN COMPONENTE SUELTO Y NO UNA SECCIÓN DE LA FICHA. Va a
// vivir en dos sitios —"Mi progreso" y la ficha del alumno— y el CSS de
// la ficha es una copia congelada que no puede crecer con estilos que
// allí no existen. Con su propio `<style>` dentro, esto se enchufa donde
// haga falta sin que la pantalla de destino traiga nada.
// ---------------------------------------------------------------

export default function BannerAmpliar({
  estimacion,
  urlAmpliar,
  retardoMs = 0,
}: {
  estimacion: Estimacion;
  /** A dónde lleva el botón. Provisional hasta que haya pop-up de planes. */
  urlAmpliar: string;
  /** Retardo de la entrada, para encajar en una pila escalonada. */
  retardoMs?: number;
}) {
  // ---------------------------------------------------------------
  // ¿HAY ALGO QUE PROMETER?
  //
  // `hayAmpliacion` dice que existen planes por encima del suyo, no que
  // sirvan de algo: con pocas horas por delante los meses se redondean
  // al mismo número y ampliar no adelanta nada. Titular "puedes llegar
  // antes" con un ahorro de cero meses es la clase de promesa que se
  // desmiente en la propia pantalla, tres centímetros más abajo.
  // ---------------------------------------------------------------
  const ahorroMaximo = Math.max(0, ...estimacion.opciones.map((o) => o.mesesAhorrados));
  const mereceLaPena = estimacion.hayAmpliacion && ahorroMaximo > 0;

  return (
    <section
      className="amp amp-rise"
      style={retardoMs ? { animationDelay: `${retardoMs}ms` } : undefined}
    >
      <EstilosBanner />

      <h2 className="amp-title">
        {mereceLaPena ? "¡Puedes llegar antes de lo que crees!" : "Vas al mejor ritmo posible"}
      </h2>
      <p className="amp-sub">
        {mereceLaPena
          ? "¿Cuánto tardarías en conseguir tu objetivo con otros planes?"
          : "Esto es lo que tardarías en conseguir tu objetivo al ritmo que llevas."}
      </p>

      <ol className="amp-planes">
        {estimacion.opciones.map((opcion) => (
          <li key={opcion.horasSemanales} className={`amp-plan${opcion.esSuPlan ? " es-suyo" : ""}`}>
            <p className="amp-horas">
              {opcion.horasSemanales} h a la semana
              {opcion.esSuPlan && <span className="amp-chip">Tu plan</span>}
            </p>

            {/* EL AHORRO, LO MÁS GRANDE DEL BANNER. Es lo único que
                justifica pagar más, y antes iba en una pastilla de 11px
                al lado de la fecha: se leía después que todo lo demás,
                cuando es lo que hay que leer primero. */}
            {opcion.mesesAhorrados > 0 && (
              <p className="amp-ahorro">{enMeses(opcion.mesesAhorrados)} antes</p>
            )}

            <div className="amp-medida">
              <div className="amp-track">
                <div
                  className="amp-fill"
                  style={{ width: `${opcion.porcentajeBarra}%` }}
                  aria-hidden
                />
              </div>
              <span className="amp-meses">{enMeses(opcion.meses)}</span>
            </div>

            <p className="amp-fecha">Llegarías en {opcion.llegada}</p>
          </li>
        ))}
      </ol>

      {/* EL BOTÓN, CENTRADO Y SOLO. Aquí había además una frase a su
          derecha que repetía en pequeño el ahorro que ahora se lee arriba
          en grande, y debajo el aviso de que la estimación es
          orientativa. Las dos se han quitado: juntas convertían el cierre
          del banner en un párrafo. */}
      {mereceLaPena && (
        <div className="amp-pie">
          <a className="amp-cta" href={urlAmpliar} target="_blank" rel="noopener noreferrer">
            Amplía tu plan
            <span className="amp-flecha" aria-hidden>
              →
            </span>
          </a>
        </div>
      )}
    </section>
  );
}

/**
 * Los estilos, en un `<style>` dentro del propio componente.
 *
 * Mismo patrón que la ficha de progreso: el LMS va todo por Tailwind y
 * el namespace `amp-` no toca nada. Con esto el banner se puede llevar a
 * cualquier pantalla sin que la de destino tenga que traer estilos.
 *
 * LAS BARRAS SON CSS Y NADA MÁS: un `div` de fondo y otro con el ancho
 * que le pasa la estimación. Ni librería de gráficos ni JavaScript.
 */
function EstilosBanner() {
  return <style dangerouslySetInnerHTML={{ __html: CSS_BANNER }} />;
}

// ---------------------------------------------------------------
// LA PALETA
//
// FUERA EL VERDE OSCURO. El banner era una tarjeta #103A1E con el texto
// en blancos translúcidos —del 45% al 82%— y ahí dentro no cabía
// jerarquía: todo pesaba parecido, y el ahorro, que es el mensaje,
// pesaba menos que el titular. Sobre claro, el contraste se puede gastar
// donde importa.
//
// Y EL AMARILLO SE RESERVA PARA EL AHORRO. Antes lo llevaban el epígrafe
// "TU RITMO", la pastilla del ahorro y el botón, así que ninguno de los
// tres destacaba sobre los otros dos. Ahora el acento es de una sola
// cosa, y el botón se va al verde de marca, que además es el color de
// las acciones en todo el LMS.
// ---------------------------------------------------------------
const CSS_BANNER = `
.amp {
  --amp-verde: #1E9E3A;
  --amp-verde-osc: #14722A;
  --amp-amarillo: #FFC400;
  --amp-tinta: #12211A;
  --amp-niebla: #F4F7F4;
  --amp-gris: #5D6660;
  --amp-tenue: #858D87;

  background: #FFFFFF;
  border: 1.5px solid #BFE3C9;
  border-radius: 18px;
  padding: 26px 24px 24px;
  box-shadow: 0 10px 30px rgba(30, 158, 58, 0.10);
  color: var(--amp-tinta);
  font-family: 'Radio Canada', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
  font-variant-numeric: tabular-nums;
}

.amp-rise { animation: amp-rise 0.55s cubic-bezier(0.22, 0.61, 0.36, 1) backwards; }
@keyframes amp-rise { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }

.amp-title {
  margin: 0;
  font-size: clamp(23px, 5.6vw, 31px);
  font-weight: 700;
  letter-spacing: -0.03em;
  line-height: 1.14;
  text-wrap: balance;
}
.amp-sub {
  margin: 10px 0 0;
  font-size: 15px;
  line-height: 1.55;
  color: var(--amp-gris);
  /* 60ch, no 42: la pregunta mide 59 caracteres y con el tope corto se
     partía en dos líneas en escritorio con la mitad de la caja vacía. */
  max-width: 60ch;
  text-wrap: pretty;
}

/* --- Los tres escenarios -----------------------------------------------
   Apilados también en escritorio: son una comparación de longitudes, y
   en columna las barras comparten origen, que es lo que deja ver de un
   vistazo cuál es más corta. En rejilla habría que medirlas de tres en
   tres.                                                                */
.amp-planes {
  list-style: none;
  margin: 22px 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.amp-plan {
  background: #F2F9F4;
  border-radius: 14px;
  padding: 15px 16px 14px;
}
/* El plan de hoy es la referencia contra la que se comparan los otros,
   no una opción que vender: en neutro, y sin ahorro que enseñar. */
.amp-plan.es-suyo { background: var(--amp-niebla); }

.amp-horas {
  margin: 0;
  font-size: 13.5px;
  font-weight: 600;
  color: var(--amp-gris);
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.amp-chip {
  font-size: 9.5px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  background: #E1E8E3;
  color: #4A554D;
  padding: 3px 8px;
  border-radius: 999px;
}

/* --- El ahorro ---------------------------------------------------------
   Lo más grande del banner y lo único en amarillo. Bloque relleno y no
   texto suelto: sobre el verde clarito de la fila, el relleno es lo que
   le da el salto de contraste que pide ser lo primero que se lee.      */
.amp-ahorro {
  display: inline-block;
  margin: 9px 0 0;
  background: var(--amp-amarillo);
  color: var(--amp-tinta);
  border-radius: 10px;
  padding: 6px 13px 7px;
  font-size: clamp(24px, 6.4vw, 29px);
  font-weight: 700;
  letter-spacing: -0.025em;
  line-height: 1.1;
}

/* --- La barra y los meses --------------------------------------------- */
.amp-medida { display: flex; align-items: center; gap: 12px; margin-top: 11px; }
.amp-track {
  flex: 1;
  min-width: 0;
  height: 10px;
  border-radius: 999px;
  background: #DFE6E0;
  overflow: hidden;
}
.amp-fill {
  height: 100%;
  border-radius: 999px;
  min-width: 10px;
  background: linear-gradient(90deg, var(--amp-verde) 0%, #37C457 100%);
  animation: amp-fill-grow 0.9s cubic-bezier(0.22, 0.61, 0.36, 1) 0.26s backwards;
}
@keyframes amp-fill-grow { from { width: 0; } }
/* La barra del plan actual es la más larga —es la de más meses— y va en
   gris: en verde como las otras, la más larga parecería la mejor. */
.amp-plan.es-suyo .amp-fill { background: #C3CFC6; }

.amp-meses {
  font-size: 18px;
  font-weight: 700;
  letter-spacing: -0.02em;
  white-space: nowrap;
}
.amp-fecha { margin: 8px 0 0; font-size: 12.5px; line-height: 1.4; color: var(--amp-tenue); }

/* --- El botón ---------------------------------------------------------- */
.amp-pie { display: flex; justify-content: center; margin-top: 22px; }
.amp-cta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  text-decoration: none;
  background: var(--amp-verde);
  color: #FFFFFF;
  border-radius: 999px;
  padding: 16px 36px;
  font-size: 16.5px;
  font-weight: 700;
  letter-spacing: -0.01em;
  box-shadow: 0 8px 20px rgba(30, 158, 58, 0.26);
  transition: transform 0.18s ease, box-shadow 0.18s ease, background 0.18s ease;
}
.amp-cta:hover {
  background: var(--amp-verde-osc);
  transform: translateY(-1px);
  box-shadow: 0 11px 26px rgba(30, 158, 58, 0.32);
}
.amp-cta:focus-visible { outline: 3px solid var(--amp-tinta); outline-offset: 3px; }
.amp-flecha { transition: transform 0.18s ease; }
.amp-cta:hover .amp-flecha { transform: translateX(3px); }

/* --- Móvil -------------------------------------------------------------
   375px es el ancho de referencia. El ahorro y el titular ya se adaptan
   con 'clamp', así que lo que cambia aquí es el respiro. El botón pasa a
   ancho completo: centrado y a medias, a esta anchura, parece
   descolocado.                                                          */
@media (max-width: 720px) {
  .amp { padding: 22px 18px 20px; border-radius: 16px; }
  .amp-sub { font-size: 14.5px; }
  .amp-planes { margin-top: 18px; }
  .amp-plan { padding: 14px 14px 13px; }
  .amp-medida { gap: 10px; }
  .amp-meses { font-size: 17px; }
  .amp-cta { width: 100%; padding: 15px 20px; }
}

@media (prefers-reduced-motion: reduce) {
  .amp-rise, .amp-fill { animation: none; }
  .amp-cta, .amp-flecha { transition: none; }
}
`;
