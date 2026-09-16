import { textosActuales } from "@/lib/idioma-servidor";
import { enMeses, opcionesDeHoras, type Estimacion } from "@/lib/estimacion";

// ---------------------------------------------------------------
// EL BANNER DE AMPLIACIÓN
//
// Lo que le costaría al alumno llegar a su meta con su plan de hoy y
// con los dos siguientes, para que vea qué se ahorra pagando más.
//
// ⚠ ES LA COPIA VISUAL de `components/BannerAmpliar.tsx` de DRC Gestión:
// mismo markup, mismas clases `pg-pace` / `pg-bars` / `pg-cta` y el mismo
// CSS, copiado literal del bloque "Banner de ampliacion de plan" de su
// `PROGRESO_CSS`. Tuvo un diseño propio (fondo claro, filas apiladas y
// el ahorro como pieza principal), y Gestión lo tomó y lo rehizo en tres
// tarjetas verticales; desde el 16/09/2026 esta pantalla vuelve a ser
// calco de la de allí. Si allí cambia un píxel, aquí cambia el mismo.
//
// LO QUE NO SE COPIA, a propósito:
//
//   · EL CÁLCULO. Todo lo que se pinta sale ya hecho de `lib/estimacion.ts`,
//     que es el port literal del de Gestión: aquí no se suma, no se
//     redondea y no se decide ninguna cifra.
//   · LOS TEXTOS. Salen de `textosActuales().banners`, en los dos idiomas,
//     y son los de esta pantalla (aquí "Estarías listo en", allí "Llegarías
//     en"; aquí la pregunta nombra el examen de quien lo prepara). Lo
//     visual es lo que se calca, no el copy.
//   · LA VARIANTE SIN CIFRAS (`preparaExamen`), que Gestión no tiene: a
//     quien prepara el examen de su propio nivel no se le puede prometer
//     ninguna fecha, así que sus tarjetas comparan HORAS y no meses. Va
//     con el mismo dibujo: la etiqueta amarilla lleva las horas extra y
//     la cifra grande, las horas del plan.
//   · EL BOTÓN abre WooCommerce en pestaña nueva: el LMS es otra web, y
//     al volver el alumno tiene que encontrarse donde estaba.
//
// POR QUÉ ES UN COMPONENTE SUELTO Y NO UNA SECCIÓN DE LA FICHA. Lleva
// su propio `<style>` con TODO lo que necesita (variables incluidas), así
// se enchufa en cualquier pantalla sin que la de destino traiga nada.
// ---------------------------------------------------------------

export default function BannerAmpliar({
  estimacion,
  urlAmpliar,
  horasSemanales = null,
  preparaExamen = false,
}: {
  estimacion: Estimacion | null;
  /** A dónde lleva el botón. Provisional hasta que haya pop-up de planes. */
  urlAmpliar: string;
  /**
   * Sin estimación porque el alumno prepara el examen de su propio
   * nivel. Enseña la variante sin cifras. Ver `preparaSuPropioExamen`.
   */
  preparaExamen?: boolean;
  /**
   * Solo para esa variante: con ellas se dibuja la escalera de planes.
   * Cuando hay `estimacion`, las horas ya vienen dentro de sus opciones.
   */
  horasSemanales?: number | null;
}) {
  const t = textosActuales().banners;

  // ---------------------------------------------------------------
  // LA VARIANTE SIN CIFRAS
  //
  // 41 de los 174 alumnos preparan el examen del nivel que ya tienen.
  // Para ellos no hay meta por encima, así que no hay horas que contar
  // ni meses que ahorrar, y durante un tiempo eso significó no verles
  // ningún banner.
  //
  // AQUÍ NO SE ESTIMA NADA, y esa es la condición para que esta pieza
  // exista. No se dice "llegarás antes" —no hay un antes—, no se dice
  // cuántas horas faltan y no se promete una fecha. Se dice lo único
  // que es verdad sin medir: con más horas a la semana llegas al mismo
  // examen con más práctica encima.
  //
  // SIN ESCALERA NO SE OFRECE NADA. `opcionesDeHoras` devuelve null
  // cuando el alumno ya está en el plan más alto: cambia el titular y
  // desaparece el botón, igual que hace el banner de estimación cuando
  // `mereceLaPena` es falso.
  //
  // LAS TARJETAS MIDEN HORAS Y NO MESES, y por eso la barra significa lo
  // contrario que en el otro banner: allí la más corta es la mejor
  // porque son meses; aquí la más larga, porque son horas de clase.
  // Cada una va rotulada con sus horas y con cuántas suma.
  // ---------------------------------------------------------------
  if (!estimacion) {
    if (!preparaExamen) return null;

    const opciones = opcionesDeHoras(horasSemanales, t);
    const mejor = opciones ? opciones[opciones.length - 1] : null;

    return (
      <section className="pg-card pg-pace">
        <EstilosBanner />
        <h2 className="pg-pace-title">{opciones ? t.llegaMasPreparado : t.vasAlMaximo}</h2>
        <p className="pg-pace-lede">{opciones ? t.examenMasHoras : t.examenAlMaximo}</p>

        {opciones && (
          <ol className="pg-bars">
            {opciones.map((opcion) => {
              const esMejor = !opcion.esSuPlan && mejor?.horasSemanales === opcion.horasSemanales;
              return (
                <li
                  key={opcion.horasSemanales}
                  className={`pg-bar-row${opcion.esSuPlan ? " is-current" : ""}${esMejor ? " is-best" : ""}`}
                >
                  <div className="pg-bar-head">
                    <span className="pg-bar-plan">{t.horasALaSemana(opcion.horasSemanales)}</span>
                    {opcion.esSuPlan && <span className="pg-chip">{t.tuPlan}</span>}
                    {esMejor && <span className="pg-badge-best">{t.recomendado}</span>}
                  </div>
                  <div className="pg-save-slot">
                    {opcion.horasExtra > 0 && (
                      <span className="pg-save">{t.horasExtraCadaSemana(opcion.horasExtra)}</span>
                    )}
                  </div>
                  <span className="pg-bar-months">{opcion.horasSemanales} h</span>
                  <div className="pg-track">
                    <div className="pg-fill" style={{ width: `${opcion.porcentajeBarra}%` }} aria-hidden />
                  </div>
                </li>
              );
            })}
          </ol>
        )}

        {opciones && (
          <div className="pg-cta-block">
            <Cta href={urlAmpliar} texto={t.ampliaTuPlan} />
          </div>
        )}
      </section>
    );
  }

  // ---------------------------------------------------------------
  // ¿HAY ALGO QUE PROMETER?
  //
  // `hayAmpliacion` dice que existen planes por encima del suyo, no que
  // sirvan de algo: con pocas horas por delante los meses se redondean
  // al mismo número y ampliar no adelanta nada. Titular "puedes llegar
  // antes" con un ahorro de cero meses es la clase de promesa que se
  // desmiente en la propia pantalla, tres centímetros más abajo.
  //
  // El distintivo "Recomendado" va en el plan de más horas (el último de
  // la lista, como en Gestión), y solo cuando hay algo que recomendar.
  // ---------------------------------------------------------------
  const ahorroMaximo = Math.max(0, ...estimacion.opciones.map((o) => o.mesesAhorrados));
  const mereceLaPena = estimacion.hayAmpliacion && ahorroMaximo > 0;
  const esPreparacion = estimacion.tipo === "preparar-examen";
  const mejor = mereceLaPena ? estimacion.opciones[estimacion.opciones.length - 1] : null;

  return (
    <section className="pg-card pg-pace">
      <EstilosBanner />

      {/* DOS PREGUNTAS, EL MISMO BANNER. A quien sube de nivel se le habla
          de su objetivo; a quien prepara el examen de su propio nivel, de
          llegar preparado — que es la pregunta que sí se hizo al comprar
          «B2 Exámenes». Decirle a este segundo «tu objetivo» sería volver
          a hablarle del peldaño siguiente, que es justo lo que no quiere. */}
      <h2 className="pg-pace-title">
        {mereceLaPena
          ? esPreparacion
            ? t.puedesLlegarAntesPreparado
            : t.puedesLlegarAntes
          : t.vasAlMejorRitmo}
      </h2>
      <p className="pg-pace-lede">
        {esPreparacion
          ? mereceLaPena
            ? t.cuantoTardariasExamen
            : t.loQueTardariasExamen
          : mereceLaPena
            ? t.cuantoTardariasObjetivo
            : t.loQueTardariasObjetivo}
      </p>

      <ol className="pg-bars">
        {estimacion.opciones.map((opcion) => {
          const esMejor = !opcion.esSuPlan && mejor?.horasSemanales === opcion.horasSemanales;
          return (
            <li
              key={opcion.horasSemanales}
              className={`pg-bar-row${opcion.esSuPlan ? " is-current" : ""}${esMejor ? " is-best" : ""}`}
            >
              {/* Cada tarjeta, de arriba abajo: plan (+ "Tu plan" o "Recomendado")
                  · hueco del ahorro · meses en grande · barra · fecha. En
                  escritorio las tres van en columnas y comparten las filas de la
                  rejilla (subgrid), así el hueco del ahorro de la primera —que no
                  lo tiene— mide lo mismo que la etiqueta amarilla de las otras y
                  las barras arrancan a la misma altura. En móvil se apilan en
                  versión compacta: los meses suben a la línea del plan y la
                  barra ocupa todo el ancho. */}
              <div className="pg-bar-head">
                <span className="pg-bar-plan">{t.horasALaSemana(opcion.horasSemanales)}</span>
                {opcion.esSuPlan && <span className="pg-chip">{t.tuPlan}</span>}
                {esMejor && <span className="pg-badge-best">{t.recomendado}</span>}
              </div>

              {/* El hueco existe SIEMPRE, con etiqueta o vacío: es lo que mantiene
                  las tres tarjetas cuadradas entre sí. */}
              <div className="pg-save-slot">
                {!opcion.esSuPlan && opcion.mesesAhorrados > 0 && (
                  <span className="pg-save">{t.mesesAntes(opcion.mesesAhorrados)}</span>
                )}
              </div>

              <span className="pg-bar-months">{enMeses(opcion.meses, t)}</span>

              <div className="pg-track">
                <div className="pg-fill" style={{ width: `${opcion.porcentajeBarra}%` }} aria-hidden />
              </div>

              <p className="pg-bar-date">
                {esPreparacion ? t.estariasListoEn : t.llegariasEn} {opcion.llegada}
              </p>
            </li>
          );
        })}
      </ol>

      {mereceLaPena && (
        <div className="pg-cta-block">
          <Cta href={urlAmpliar} texto={t.ampliaTuPlan} />
        </div>
      )}
    </section>
  );
}

/** El botón. En pestaña nueva: WooCommerce es otra web y el alumno vuelve aquí. */
function Cta({ href, texto }: { href: string; texto: string }) {
  return (
    <a className="pg-cta" href={href} target="_blank" rel="noopener noreferrer">
      {texto}
      <span className="pg-cta-arrow" aria-hidden>→</span>
    </a>
  );
}

/**
 * Los estilos, en un `<style>` dentro del propio componente. El LMS va
 * todo por Tailwind y el namespace `pg-` no toca nada suyo.
 */
function EstilosBanner() {
  return <style dangerouslySetInnerHTML={{ __html: CSS_BANNER }} />;
}

// ---------------------------------------------------------------
// COPIA LITERAL del bloque "Banner de ampliacion de plan" del
// `PROGRESO_CSS` de Gestión (components/ProgresoFicha.tsx), más sus
// reglas de móvil y de movimiento reducido. Lo único añadido va al
// principio: las variables de color y la base de tarjeta (`.pg-card`)
// que allí vienen de `.pg-page`, para que el banner se vea igual aunque
// se pinte fuera de la ficha.
// ---------------------------------------------------------------
const CSS_BANNER = `
.pg-pace {
  --pg-green: #1E9E3A;
  --pg-green-dark: #14722A;
  --pg-yellow: #FFC400;
  --pg-surface: #FFFFFF;
  --pg-ink: #191A17;
  --pg-muted: #63675F;
  --pg-faint: #8D9188;
  --pg-line: #E4E5DE;

  background: var(--pg-surface); border: 1px solid var(--pg-line); border-radius: 18px;
  color: var(--pg-ink);
  font-family: 'Radio Canada', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
  font-variant-numeric: tabular-nums;
  -webkit-font-smoothing: antialiased;
}

/* ── Banner de ampliacion de plan ───────────────────────────────────────── */
/*
   TARJETA BLANCA, plana y sin animaciones. Antes era un bloque verde oscuro con
   barras en degradado que crecian al entrar; ahora el unico elemento que salta
   es la etiqueta amarilla del ahorro, que es lo que se quiere que mire el alumno.
   Las tres filas comparten el mismo ancho de barra a proposito: si cada una
   empezara en un sitio distinto, la comparacion visual mentiria.
*/
/* Luminoso y plano: sin sombra en la tarjeta, borde casi imperceptible, aire
   entre elementos. Dos tamaños de texto en todo el banner (20 px el título, 15 px
   el resto, 13 px lo secundario): el contraste lo pone el peso, no el tamaño. */
.pg-pace { padding: 28px 26px 26px; box-shadow: none; border-color: #ECEDE8; }
.pg-pace-title {
  font-size: 20px; font-weight: 700; letter-spacing: -0.02em;
  line-height: 1.25; margin: 0 0 6px; color: var(--pg-ink); text-wrap: balance;
}
.pg-pace-lede {
  font-size: 15px; font-weight: 400; line-height: 1.55; color: var(--pg-muted);
  margin: 0 0 22px; max-width: 52ch;
}

/* Cada plan, en su propia tarjeta. Tres pesos:
   · el actual: gris apagado, sin borde — el punto de partida;
   · los superiores: blanco con borde suave — "vivos" al lado del primero;
   · el de más horas: verde clarísimo y borde verde algo más marcado.

   ESCRITORIO Y TABLET: tres columnas. Las tarjetas comparten las CINCO filas de
   la rejilla madre (subgrid: plan · hueco del ahorro · meses · barra · fecha),
   así todas miden lo mismo, el hueco vacío de la primera es tan alto como la
   etiqueta amarilla de las otras, y las tres barras arrancan a la misma altura
   y miden el mismo ancho. La comparación no puede mentir. */
.pg-bars {
  list-style: none; margin: 0; padding: 0;
  display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); grid-auto-rows: auto; gap: 12px;
}
.pg-bar-row {
  display: grid; grid-row: span 5; grid-template-rows: subgrid; row-gap: 0; min-width: 0;
  background: #FFFFFF; border: 1px solid #E0ECE2; border-radius: 14px; padding: 16px 16px 14px;
}
.pg-bar-row.is-current { background: #F2F3F0; border-color: transparent; }
.pg-bar-row.is-best { background: #F1FAF3; border-color: #9BD6A8; position: relative; }

.pg-bar-head { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; align-self: start; }
.pg-bar-plan { font-size: 15px; font-weight: 700; color: var(--pg-ink); }
.pg-bar-row.is-current .pg-bar-plan { color: var(--pg-muted); }
.pg-chip {
  font-size: 13px; font-weight: 400; color: var(--pg-faint); white-space: nowrap;
}
/* Distintivo del plan de más horas: chico, verde de marca, montado sobre el
   borde superior de la tarjeta, a la derecha. Así no ocupa sitio en la línea
   del plan (en una columna de 200 px no cabían los dos) y en 360 px nunca se
   monta sobre "4 h a la semana". Secundario a propósito: la etiqueta amarilla
   es la que tiene que llamar la atención. */
.pg-badge-best {
  position: absolute; top: -10px; right: 12px;
  font-size: 11px; font-weight: 700; letter-spacing: 0.02em; line-height: 1;
  background: var(--pg-green); color: #fff; padding: 5px 9px; border-radius: 999px; white-space: nowrap;
}
/* El hueco del ahorro existe en las tres tarjetas (vacío en la del plan actual):
   es lo que las mantiene cuadradas entre sí. */
.pg-save-slot { margin-top: 10px; min-height: 32px; display: flex; align-items: flex-start; }
/* El ahorro: lo más visible de la tarjeta. Es lo que se quiere que mire el alumno. */
.pg-save {
  display: inline-block;
  font-size: 15px; font-weight: 700; letter-spacing: -0.01em; white-space: nowrap;
  background: var(--pg-yellow); color: var(--pg-ink);
  padding: 6px 13px; border-radius: 999px;
}

/* Los meses, en grande, encima de la barra; la barra ocupa el ancho de la
   tarjeta, fina y con las puntas redondeadas. */
.pg-bar-months {
  display: block; margin-top: 12px;
  font-size: 26px; font-weight: 700; letter-spacing: -0.02em; line-height: 1.1; color: var(--pg-ink);
  white-space: nowrap;
}
.pg-bar-row.is-current .pg-bar-months { color: var(--pg-muted); }
.pg-track { height: 6px; margin-top: 10px; border-radius: 999px; background: #E9EBE6; overflow: hidden; min-width: 0; align-self: center; }
.pg-fill { height: 100%; border-radius: 999px; background: var(--pg-green); }
/* El plan actual siempre esta lleno del todo, y en gris: es la referencia. */
.pg-bar-row.is-current .pg-fill { background: #C4C6BF; }
.pg-bar-date { margin: 10px 0 0; font-size: 13px; line-height: 1.4; color: var(--pg-faint); align-self: end; }

/* Boton: pildora verde centrada, sin hover llamativo. Es lo unico que va debajo
   de las filas: la nota que repetia el ahorro y el descargo se quitaron. */
.pg-cta-block { margin-top: 22px; display: flex; justify-content: center; }
.pg-cta {
  display: inline-flex; align-items: center; justify-content: center; gap: 9px;
  min-height: 44px; padding: 12px 28px; border-radius: 999px;
  background: var(--pg-green); color: #fff; font-size: 15px; font-weight: 700;
  text-decoration: none; box-shadow: 0 6px 16px rgba(30, 158, 58, 0.26);
}
.pg-cta:focus-visible { outline: 3px solid var(--pg-green-dark); outline-offset: 3px; }

/* ── Móvil ──────────────────────────────────────────────────────────────── */
@media (max-width: 720px) {
  .pg-pace { padding: 24px 18px 20px; border-radius: 16px; }
  /* Tres columnas no entran: las tarjetas se apilan en versión compacta. Los
     meses suben a la línea del plan (a la derecha), la etiqueta amarilla va
     debajo solo donde existe (el hueco vacío no ocupa altura), la barra ocupa
     todo el ancho y la fecha cierra. Con nowrap el número nunca se parte. */
  /* 12 px de hueco entre filas: el distintivo asoma 10 px por encima de su tarjeta. */
  .pg-bars { display: flex; flex-direction: column; gap: 12px; }
  .pg-bar-row {
    display: grid; grid-template-columns: minmax(0, 1fr) auto; grid-template-rows: auto;
    grid-template-areas: "head months" "save save" "track track" "date date";
    align-items: center; column-gap: 10px; padding: 11px 12px 10px; border-radius: 12px;
  }
  .pg-bar-head { grid-area: head; gap: 6px 8px; }
  .pg-bar-months { grid-area: months; margin: 0; font-size: 17px; letter-spacing: -0.01em; }
  .pg-save-slot { grid-area: save; margin: 0; min-height: 0; }
  .pg-save-slot:empty { display: none; }
  .pg-save { margin-top: 7px; font-size: 14px; padding: 4px 11px; }
  .pg-track { grid-area: track; margin-top: 8px; }
  .pg-bar-date { grid-area: date; margin-top: 6px; font-size: 12.5px; }
  .pg-badge-best { padding: 4px 8px; }
  /* Ancho completo solo en móvil: ahí es más cómodo de tocar. */
  .pg-cta { width: 100%; }
}

@media (prefers-reduced-motion: reduce) {
  .pg-fill { transition: none; }
  .pg-cta, .pg-cta-arrow { transition: none; }
}
`;
