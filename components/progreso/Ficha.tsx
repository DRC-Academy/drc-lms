import type { ClaseDelRecorrido } from "@/lib/gestion";
import type { Estimacion } from "@/lib/estimacion";
import { enMeses } from "@/lib/estimacion";
import { formatearFechaLarga } from "@/lib/perfil";
import { ESCALERA_MCER, esHito, proximoHito, type NivelMcer } from "@/lib/recorrido";
import { enViñetas, soloParaElAlumno, textoParaElAlumno } from "@/lib/texto-alumno";

// ---------------------------------------------------------------
// LA FICHA DE PROGRESO, RÉPLICA DE LA DE DRC GESTIÓN
//
// ⚠ ESTO ES UNA COPIA DELIBERADA de `app/progreso/[token]/page.tsx` de
// Gestión: mismos bloques, mismo orden, mismo copy y mismo CSS. No es
// una versión adaptada, y no debe convertirse en una. Si allí cambia una
// frase, aquí cambia la misma frase.
//
// POR QUÉ SE COPIA EL CSS EN VEZ DE REESCRIBIRLO EN TAILWIND. Se hizo
// primero en Tailwind con los tokens `marca-*` de la casa, y el
// resultado se parecía sin ser lo mismo: otros radios, otros pesos, otra
// escalera. Un alumno que reciba el enlace de su profesor y luego entre
// al LMS tiene que ver la misma pantalla, no una prima hermana. Con el
// bloque `pg-*` copiado literalmente, comparar las dos versiones es un
// diff de texto y no un ejercicio de memoria visual.
//
// El namespace `pg-` no colisiona con nada del LMS, que va todo por
// clases de Tailwind, y viaja en un `<style>` dentro del propio
// componente igual que en Gestión: no toca `globals.css` ni afecta a
// ninguna otra pantalla.
//
// LO ÚNICO QUE NO SE REPLICA es el marco: allí la página trae su propia
// cabecera con el logotipo y el rótulo "Informe de progreso", porque es
// una pantalla suelta que se abre desde un enlace. Aquí es una sección
// del LMS y vive dentro de la barra de navegación de la aplicación, que
// no se puede quitar sin dejar al alumno sin salida. Todo lo que va por
// debajo de esa barra sí es idéntico.
// ---------------------------------------------------------------

export default function Ficha({
  nombre,
  nivel,
  horasSemanales,
  clasesContadas,
  estimacion,
  objetivo,
  puntosFuertes,
  puntosDebiles,
  focoRecomendado,
  clases,
  urlAmpliar,
}: {
  nombre: string;
  nivel: NivelMcer | null;
  horasSemanales: number | null;
  /** Las clases que cuenta la cifra: todas, con informe o sin él. */
  clasesContadas: number;
  estimacion: Estimacion | null;
  objetivo: string | null;
  puntosFuertes: string | null;
  puntosDebiles: string | null;
  focoRecomendado: string | null;
  clases: ClaseDelRecorrido[];
  urlAmpliar: string;
}) {
  const primerNombre = nombre.trim().split(/\s+/)[0] || nombre;

  // Todo lo que sale de la ficha pasa por el cortafuegos: está escrita
  // para el profesor y, con el formulario a medias, la IA deja ahí notas
  // de trabajo que no puede leer un cliente. Ver `lib/texto-alumno.ts`.
  const fuertes = soloParaElAlumno(enViñetas(puntosFuertes));
  const debiles = soloParaElAlumno(enViñetas(puntosDebiles));
  const objetivoVisible = textoParaElAlumno(objetivo);
  const foco = textoParaElAlumno(focoRecomendado);

  const hito = proximoHito(clasesContadas);

  return (
    <div className="pg-page">
      <EstilosFicha />

      <main className="pg-main">
        <section className="pg-intro pg-rise" style={{ animationDelay: "0ms" }}>
          <p className="pg-eyebrow">Tu progreso en inglés</p>
          <h1 className="pg-h1">Esto es lo que llevas conseguido, {primerNombre}.</h1>
          <p className="pg-lede">
            Un resumen de tu nivel, de lo que ya dominas y de hacia dónde vamos en las próximas
            clases.
          </p>
        </section>

        <section className="pg-card pg-hero pg-rise" style={{ animationDelay: "60ms" }}>
          <Escalera nivel={nivel} meta={estimacion?.meta.nivel ?? null} />

          <div className="pg-stats">
            <div className="pg-stat">
              <span className="pg-stat-num">{clasesContadas}</span>
              <span className="pg-stat-label">
                {clasesContadas === 1 ? "Clase hecha" : "Clases hechas"}
              </span>
            </div>
            <div className="pg-stat">
              <span className="pg-stat-num">{nivel ?? "—"}</span>
              <span className="pg-stat-label">Nivel actual</span>
            </div>
            <div className="pg-stat">
              <span className="pg-stat-num">
                {horasSemanales != null ? horasSemanales : "—"}
                {horasSemanales != null && <span className="pg-stat-unit">h</span>}
              </span>
              <span className="pg-stat-label">Cada semana</span>
            </div>
            <div className="pg-stat">
              <span className="pg-stat-num">
                {hito ? (
                  <>
                    <span className="pg-stat-pre">Clase</span>
                    {hito}
                  </>
                ) : (
                  "✓"
                )}
              </span>
              <span className="pg-stat-label">{hito ? "Próximo hito" : "Hitos completos"}</span>
            </div>
          </div>
        </section>

        {objetivoVisible && (
          <section className="pg-card pg-goal pg-rise" style={{ animationDelay: "120ms" }}>
            <p className="pg-kicker">Tu objetivo</p>
            <blockquote className="pg-goal-text">{objetivoVisible}</blockquote>
          </section>
        )}

        {estimacion && <BannerRitmo estimacion={estimacion} urlAmpliar={urlAmpliar} />}

        {(fuertes.length > 0 || debiles.length > 0) && (
          <section className="pg-split pg-rise" style={{ animationDelay: "240ms" }}>
            {fuertes.length > 0 && (
              <div className="pg-card">
                <p className="pg-kicker">Lo que ya haces bien</p>
                <ul className="pg-list">
                  {fuertes.map((texto, i) => (
                    <li key={i}>
                      <span className="pg-mark pg-mark-ok" aria-hidden>
                        ✓
                      </span>
                      <span>{texto}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {debiles.length > 0 && (
              <div className="pg-card">
                <p className="pg-kicker">Lo que estamos reforzando</p>
                <ul className="pg-list">
                  {debiles.map((texto, i) => (
                    <li key={i}>
                      <span className="pg-mark pg-mark-up" aria-hidden>
                        ↗
                      </span>
                      <span>{texto}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}

        {foco && (
          <section className="pg-card pg-focus pg-rise" style={{ animationDelay: "300ms" }}>
            <div className="pg-focus-head">
              <p className="pg-kicker">En qué trabajamos ahora</p>
              <span className="pg-badge">Foco actual</span>
            </div>
            <p className="pg-body">{foco}</p>
          </section>
        )}

        <Recorrido clases={clases} />

        <p className="pg-foot">
          Este informe es privado y sólo para ti. Si te surge cualquier duda, coméntasela a tu
          profesor.
        </p>
      </main>
    </div>
  );
}

/**
 * La escalera del MCER con el alumno en su peldaño y la bandera en el
 * objetivo. Es la pieza que hace entender de un vistazo dónde está y a
 * dónde va.
 *
 * LA BANDERA "TU META" SOLO SALE SI HAY ESTIMACIÓN, igual que en
 * Gestión: el nivel meta se calcula, no está guardado. Sin las horas
 * semanales no hay estimación, y sin estimación no hay meta que marcar.
 */
function Escalera({ nivel, meta }: { nivel: NivelMcer | null; meta: NivelMcer | null }) {
  const actual = nivel ? ESCALERA_MCER.indexOf(nivel) : -1;
  const objetivo = meta ? ESCALERA_MCER.indexOf(meta) : -1;

  return (
    <div className="pg-ladder-wrap">
      <p className="pg-kicker">Tu nivel</p>
      <ol className="pg-ladder">
        {ESCALERA_MCER.map((etiqueta, i) => {
          const hecho = actual >= 0 && i < actual;
          const aqui = actual >= 0 && i === actual;
          const esMeta = objetivo >= 0 && i === objetivo;
          const clases = ["pg-rung", hecho && "is-done", aqui && "is-current", esMeta && "is-target"]
            .filter(Boolean)
            .join(" ");

          return (
            <li key={etiqueta} className={clases} aria-current={aqui ? "step" : undefined}>
              <span className="pg-rung-label">{etiqueta}</span>
              {aqui && <span className="pg-rung-note">Estás aquí</span>}
              {esMeta && <span className="pg-rung-note pg-rung-note-target">Tu meta</span>}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/**
 * EL BANNER. La misma distancia recorrida a dos o tres velocidades, con
 * la fecha de llegada de cada una. La fecha es lo que convence: "29
 * meses" es abstracto, "mayo de 2028" se entiende de golpe.
 *
 * LAS BARRAS CRECEN SIN JAVASCRIPT. En Gestión esto es un componente de
 * cliente que pone un `useState` a los 260 ms para disparar la
 * transición. Aquí la pantalla entera se resuelve en el servidor, así
 * que el crecimiento se hace con un `@keyframes` que arranca en `width:
 * 0` y termina en la anchura que trae el `style` inline. Mismo gesto,
 * misma duración, misma curva, y sin bajar React para animar una barra.
 */
function BannerRitmo({
  estimacion,
  urlAmpliar,
}: {
  estimacion: Estimacion;
  urlAmpliar: string;
}) {
  const mejor = estimacion.opciones[estimacion.opciones.length - 1];
  const metaEsExamen = estimacion.meta.origen === "examen";

  return (
    <section className="pg-card pg-pace pg-rise" style={{ animationDelay: "180ms" }}>
      <p className="pg-kicker pg-kicker-light">Tu ritmo</p>
      <h2 className="pg-pace-title">
        {estimacion.hayAmpliacion
          ? "Puedes llegar antes de lo que crees"
          : "Vas al mejor ritmo posible"}
      </h2>
      <p className="pg-pace-lede">
        Para alcanzar el <strong>{estimacion.meta.nivel}</strong>
        {metaEsExamen ? " que preparas" : ""} quedan unas{" "}
        <strong>{estimacion.horasQueFaltan} horas</strong> de inglés.
        {estimacion.hayAmpliacion
          ? " Esto es lo que tardarías según las horas que hagas cada semana."
          : " A tu ritmo actual, esta es la previsión."}
      </p>

      <ol className="pg-bars">
        {estimacion.opciones.map((opcion) => (
          <li
            key={opcion.horasSemanales}
            className={`pg-bar-row${opcion.esSuPlan ? " is-current" : ""}`}
          >
            <div className="pg-bar-head">
              <span className="pg-bar-plan">
                {opcion.horasSemanales} h a la semana
                {opcion.esSuPlan && <span className="pg-chip">Tu plan</span>}
              </span>
              <span className="pg-bar-months">{enMeses(opcion.meses)}</span>
            </div>

            <div className="pg-track">
              <div className="pg-fill" style={{ width: `${opcion.porcentajeBarra}%` }} aria-hidden />
            </div>

            <div className="pg-bar-foot">
              <span className="pg-bar-date">Llegarías en {opcion.llegada}</span>
              {opcion.mesesAhorrados > 0 && (
                <span className="pg-save">{enMeses(opcion.mesesAhorrados)} antes</span>
              )}
            </div>
          </li>
        ))}
      </ol>

      {estimacion.hayAmpliacion && (
        <div className="pg-cta-block">
          <a className="pg-cta" href={urlAmpliar} target="_blank" rel="noopener noreferrer">
            Amplía tu plan
            <span className="pg-cta-arrow" aria-hidden>
              →
            </span>
          </a>
          <p className="pg-cta-note">
            Con una hora más a la semana llegarías {enMeses(estimacion.opciones[1].mesesAhorrados)}{" "}
            antes.
            {mejor.horasSemanales > estimacion.opciones[1].horasSemanales &&
              ` Con ${mejor.horasSemanales} horas, ${enMeses(mejor.mesesAhorrados)} antes.`}
          </p>
        </div>
      )}

      <p className="pg-disclaimer">
        Estimación orientativa. Partimos de las horas de estudio guiado que Cambridge asocia a cada
        nivel del MCER y contamos con que practicas por tu cuenta entre clases. Tu ritmo real
        depende de ti y de tu constancia.
      </p>
    </section>
  );
}

/**
 * El recorrido clase a clase. Los hitos de DRC (1, 15, 30, 50) van
 * marcados.
 *
 * EL "VER LAS N CLASES" ES UN `<details>` Y NO UN BOTÓN. En Gestión es
 * un `useState` que cambia el recorte; aquí no hay estado de cliente en
 * toda la pantalla, y meterlo por esto costaría el arranque de React. El
 * `<summary>` lleva la misma clase `pg-more`, así que se ve igual, y al
 * abrirlo se oculta y quedan todas las clases a la vista, que es
 * exactamente en lo que termina el original.
 *
 * Las clases cuyo informe quedó pendiente o falló no tienen ni título ni
 * resumen: pintaban una tarjeta vacía con solo la fecha, que al alumno
 * no le dice nada. Se quedan fuera hasta que el informe exista. El
 * filtro ya viene hecho de `obtenerRecorrido`.
 */
const VISIBLES = 6;

function Recorrido({ clases }: { clases: ClaseDelRecorrido[] }) {
  const primeras = clases.slice(0, VISIBLES);
  const resto = clases.slice(VISIBLES);

  return (
    <section className="pg-rise" style={{ animationDelay: "360ms" }}>
      <p className="pg-section-title">Tu recorrido, clase a clase</p>

      {clases.length === 0 ? (
        <div className="pg-card pg-empty">
          Aquí irá apareciendo el resumen de cada clase. Se irá llenando a medida que avances.
        </div>
      ) : (
        <>
          <ol className="pg-timeline">{primeras.map(Tarjeta)}</ol>

          {resto.length > 0 && (
            <details className="pg-more-wrap">
              <summary className="pg-more">Ver las {clases.length} clases</summary>
              <ol className="pg-timeline pg-timeline-resto">{resto.map(Tarjeta)}</ol>
            </details>
          )}
        </>
      )}
    </section>
  );
}

function Tarjeta(clase: ClaseDelRecorrido) {
  const numero = clase.numero ?? 0;
  const marcado = numero > 0 && esHito(numero);
  // `fecha_clase` llega como `YYYY-MM-DD`. Se formatea partiendo la
  // cadena y no con `new Date()`: construir una fecha desde un ISO corto
  // la ancla a UTC y en España puede retroceder un día. Gestión usa
  // `new Date()` y se salva por estar en UTC+1; esto no depende de eso.
  const fecha = clase.fechaClase !== "" ? formatearFechaLarga(clase.fechaClase) : null;

  return (
    <li key={clase.id} className={`pg-tl-item${marcado ? " is-milestone" : ""}`}>
      <span className="pg-tl-node" aria-hidden />
      <div className="pg-card pg-tl-card">
        {/* Muchas filas no traen número de clase. Antes salía "Clase —",
            que parecía un fallo; sin número manda la fecha. */}
        <div className="pg-tl-head">
          {numero > 0 && <span className="pg-tl-num">Clase {numero}</span>}
          {fecha && <span className={numero > 0 ? "pg-tl-date" : "pg-tl-num"}>{fecha}</span>}
          {marcado && <span className="pg-badge pg-badge-sm">Hito</span>}
        </div>
        {clase.titulo !== "" && <p className="pg-tl-title">{clase.titulo}</p>}
        {clase.resumen !== "" && <p className="pg-body">{clase.resumen}</p>}
      </div>
    </li>
  );
}

function EstilosFicha() {
  return <style dangerouslySetInnerHTML={{ __html: CSS_FICHA }} />;
}

// ---------------------------------------------------------------
// EL CSS, COPIADO DE GESTIÓN
//
// Todo lo que hay aquí sale de `PROGRESO_CSS` en
// `app/progreso/[token]/page.tsx` de Gestión, con tres añadidos que van
// marcados con el comentario "SOLO EN EL LMS":
//
//   · `.pg-page` pierde el `min-height: 100dvh`, porque aquí no es la
//     página entera: va debajo de la cabecera del LMS.
//   · `@keyframes pg-fill-grow`, que sustituye al `useState` que animaba
//     las barras en el cliente.
//   · `.pg-more-wrap`, para que el `<details>` haga de botón "ver más".
//
// El resto es literal, incluidas las medias queries y el bloque de
// `prefers-reduced-motion`.
// ---------------------------------------------------------------
const CSS_FICHA = `
.pg-page {
  --pg-green: #1E9E3A;
  --pg-green-dark: #14722A;
  --pg-green-deep: #103A1E;
  --pg-green-bright: #37C457;
  --pg-yellow: #FFC400;
  --pg-cream: #F7F7F5;
  --pg-surface: #FFFFFF;
  --pg-ink: #191A17;
  --pg-muted: #63675F;
  --pg-faint: #8D9188;
  --pg-line: #E4E5DE;

  /* SOLO EN EL LMS: sin 'min-height: 100dvh'. Aquí esto no es la
     pantalla entera, va debajo de la cabecera de la aplicación, y con
     la altura completa dejaría una franja de fondo por debajo del pie. */
  flex: 1;
  background: var(--pg-cream);
  color: var(--pg-ink);
  font-family: 'Radio Canada', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
  font-variant-numeric: tabular-nums;
  -webkit-font-smoothing: antialiased;
}

.pg-main {
  max-width: 780px; margin: 0 auto; padding: 36px 20px 72px;
  display: flex; flex-direction: column; gap: 18px;
}

/* ── Entrada escalonada ─────────────────────────────────────────────────── */
.pg-rise { animation: pg-rise 0.55s cubic-bezier(0.22, 0.61, 0.36, 1) backwards; }
@keyframes pg-rise { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }

/* ── Cabecera de contenido ──────────────────────────────────────────────── */
.pg-intro { padding: 6px 2px 4px; }
.pg-eyebrow {
  font-size: 11.5px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase;
  color: var(--pg-green-dark); margin: 0 0 12px;
}
.pg-h1 {
  font-size: clamp(27px, 6.2vw, 40px); font-weight: 700; letter-spacing: -0.03em;
  line-height: 1.12; margin: 0; text-wrap: balance;
}
.pg-lede { font-size: 15.5px; line-height: 1.6; color: var(--pg-muted); margin: 12px 0 0; max-width: 46ch; }

/* ── Tarjeta base ───────────────────────────────────────────────────────── */
.pg-card {
  background: var(--pg-surface); border: 1px solid var(--pg-line); border-radius: 18px;
  padding: 24px 26px; box-shadow: 0 1px 2px rgba(16, 32, 16, 0.04);
}
.pg-kicker {
  font-size: 11px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase;
  color: var(--pg-faint); margin: 0 0 14px;
}
.pg-body { font-size: 15px; line-height: 1.7; color: var(--pg-ink); margin: 0; white-space: pre-wrap; }
.pg-section-title {
  font-size: 19px; font-weight: 700; letter-spacing: -0.02em; margin: 18px 0 14px; padding-left: 2px;
}

/* ── Escalera MCER ──────────────────────────────────────────────────────── */
.pg-hero { display: flex; flex-direction: column; gap: 24px; }
.pg-ladder-wrap { min-width: 0; }
.pg-ladder {
  display: grid; grid-template-columns: repeat(6, 1fr); gap: 6px;
  list-style: none; margin: 0; padding: 0;
}
.pg-rung {
  position: relative; text-align: center; padding: 13px 2px 11px;
  border-radius: 11px; background: #F1F2ED; border: 1.5px solid transparent;
  color: var(--pg-faint); font-size: 14px; font-weight: 600;
}
.pg-rung.is-done { background: #E9F4EB; color: #2F7A42; }
.pg-rung.is-current {
  background: var(--pg-surface); border-color: var(--pg-green); color: var(--pg-green-dark);
  font-weight: 700; box-shadow: 0 4px 14px rgba(30, 158, 58, 0.18);
}
.pg-rung.is-target { background: #FFFBEE; border-color: var(--pg-yellow); border-style: dashed; color: #7A5B00; }
.pg-rung-label { display: block; line-height: 1; }
.pg-rung-note {
  display: block; margin-top: 6px; font-size: 9.5px; font-weight: 700;
  letter-spacing: 0.06em; text-transform: uppercase; color: var(--pg-green);
}
.pg-rung-note-target { color: #A87A00; }

/* ── Cifras del hero ────────────────────────────────────────────────────── */
.pg-stats {
  display: grid; grid-template-columns: repeat(4, 1fr);
  border-top: 1px solid var(--pg-line); padding-top: 20px;
}
.pg-stat { padding: 0 14px; border-left: 1px solid var(--pg-line); min-width: 0; }
.pg-stat:first-child { padding-left: 0; border-left: none; }
.pg-stat-num {
  display: block; font-size: 26px; font-weight: 700; letter-spacing: -0.03em;
  line-height: 1.1; color: var(--pg-green-dark);
}
.pg-stat-unit { font-size: 16px; font-weight: 300; margin-left: 1px; }
.pg-stat-pre { font-size: 15px; font-weight: 400; margin-right: 5px; color: var(--pg-muted); }
.pg-stat-label {
  display: block; margin-top: 5px; font-size: 11px; font-weight: 600;
  letter-spacing: 0.06em; text-transform: uppercase; color: var(--pg-faint);
}

/* ── Objetivo (las palabras del propio alumno, en cursiva) ──────────────── */
.pg-goal { border-left: 4px solid var(--pg-green); }
.pg-goal-text {
  margin: 0; font-size: 17px; font-style: italic; font-weight: 400;
  line-height: 1.62; color: #24271F; white-space: pre-wrap;
}

/* ── Banner de ritmo ────────────────────────────────────────────────────── */
.pg-pace {
  background: var(--pg-green-deep); border-color: var(--pg-green-deep); color: #fff;
  padding: 28px 26px 24px; box-shadow: 0 14px 36px rgba(16, 58, 30, 0.22);
}
.pg-kicker-light { color: var(--pg-yellow); }
.pg-pace-title {
  font-size: clamp(21px, 4.6vw, 27px); font-weight: 700; letter-spacing: -0.025em;
  line-height: 1.2; margin: 0 0 10px; color: #fff; text-wrap: balance;
}
.pg-pace-lede { font-size: 15px; line-height: 1.62; color: rgba(255, 255, 255, 0.76); margin: 0 0 24px; max-width: 52ch; }
.pg-pace-lede strong { color: #fff; font-weight: 700; }

.pg-bars { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 18px; }
.pg-bar-head { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; margin-bottom: 7px; }
.pg-bar-plan {
  font-size: 14px; font-weight: 600; color: rgba(255, 255, 255, 0.82);
  display: inline-flex; align-items: center; gap: 8px; flex-wrap: wrap;
}
.pg-chip {
  font-size: 9.5px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;
  background: rgba(255, 255, 255, 0.16); color: rgba(255, 255, 255, 0.9);
  padding: 3px 8px; border-radius: 999px;
}
.pg-bar-months { font-size: 19px; font-weight: 700; letter-spacing: -0.02em; color: #fff; white-space: nowrap; }

.pg-track { height: 12px; border-radius: 999px; background: rgba(255, 255, 255, 0.1); overflow: hidden; }
.pg-fill {
  height: 100%; border-radius: 999px; min-width: 12px;
  background: linear-gradient(90deg, var(--pg-green) 0%, var(--pg-green-bright) 100%);
  /* SOLO EN EL LMS: en Gestión la anchura arranca en 0 y la sube un
     'useState' a los 260 ms con 'transition'. Aquí no hay JavaScript de
     cliente, así que el mismo gesto se hace con un keyframe que sale de
     'width: 0'; 'backwards' mantiene la barra vacía durante la espera. */
  animation: pg-fill-grow 0.9s cubic-bezier(0.22, 0.61, 0.36, 1) 0.26s backwards;
}
@keyframes pg-fill-grow { from { width: 0; } }
.pg-bar-row.is-current .pg-fill { background: rgba(255, 255, 255, 0.26); }

.pg-bar-foot { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 7px; }
.pg-bar-date { font-size: 12.5px; color: rgba(255, 255, 255, 0.58); }
.pg-save {
  font-size: 11px; font-weight: 700; letter-spacing: 0.03em; white-space: nowrap;
  background: var(--pg-yellow); color: #3D2C00; padding: 4px 10px; border-radius: 999px;
}

.pg-cta-block {
  margin-top: 26px; padding-top: 22px; border-top: 1px solid rgba(255, 255, 255, 0.14);
  display: flex; align-items: center; gap: 18px; flex-wrap: wrap;
}
.pg-cta {
  display: inline-flex; align-items: center; gap: 10px; text-decoration: none;
  background: var(--pg-yellow); color: #2E2100; border-radius: 12px;
  padding: 14px 24px; font-size: 15.5px; font-weight: 700; letter-spacing: -0.01em;
  box-shadow: 0 6px 18px rgba(255, 196, 0, 0.26);
  transition: transform 0.18s ease, box-shadow 0.18s ease;
}
.pg-cta:hover { transform: translateY(-1px); box-shadow: 0 9px 24px rgba(255, 196, 0, 0.34); }
.pg-cta:focus-visible { outline: 3px solid #fff; outline-offset: 3px; }
.pg-cta-arrow { transition: transform 0.18s ease; }
.pg-cta:hover .pg-cta-arrow { transform: translateX(3px); }
.pg-cta-note { font-size: 13.5px; line-height: 1.55; color: rgba(255, 255, 255, 0.72); margin: 0; flex: 1; min-width: 200px; }

.pg-disclaimer {
  margin: 22px 0 0; font-size: 11.5px; line-height: 1.6; color: rgba(255, 255, 255, 0.45);
}

/* ── Fuertes / a reforzar ───────────────────────────────────────────────── */
.pg-split { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; align-items: start; }
.pg-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 11px; }
.pg-list li { display: grid; grid-template-columns: 18px minmax(0, 1fr); gap: 10px; font-size: 14.5px; line-height: 1.6; }
.pg-mark { font-weight: 700; line-height: 1.55; }
.pg-mark-ok { color: var(--pg-green); }
.pg-mark-up { color: #C98A08; }

/* ── Foco actual ────────────────────────────────────────────────────────── */
.pg-focus { border-left: 4px solid var(--pg-yellow); }
.pg-focus-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; margin-bottom: 14px; }
.pg-focus-head .pg-kicker { margin: 0; }
.pg-badge {
  font-size: 10px; font-weight: 700; letter-spacing: 0.07em; text-transform: uppercase;
  background: var(--pg-yellow); color: #493600; padding: 4px 11px; border-radius: 999px; white-space: nowrap;
}
.pg-badge-sm { font-size: 9px; padding: 3px 8px; }

/* ── Recorrido ──────────────────────────────────────────────────────────── */
.pg-timeline { list-style: none; margin: 0; padding: 0 0 0 26px; position: relative; display: flex; flex-direction: column; gap: 14px; }
.pg-timeline::before {
  content: ""; position: absolute; left: 5px; top: 12px; bottom: 12px; width: 2px;
  background: linear-gradient(180deg, var(--pg-green) 0%, #DDE0D9 100%);
}
.pg-tl-item { position: relative; }
.pg-tl-node {
  position: absolute; left: -26px; top: 22px; width: 12px; height: 12px; border-radius: 50%;
  background: var(--pg-surface); border: 2.5px solid var(--pg-green); box-sizing: border-box;
}
.pg-tl-item.is-milestone .pg-tl-node { background: var(--pg-yellow); border-color: var(--pg-yellow); box-shadow: 0 0 0 4px rgba(255, 196, 0, 0.2); }
.pg-tl-card { padding: 18px 22px; }
.pg-tl-head { display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap; }
.pg-tl-num { font-size: 14px; font-weight: 700; letter-spacing: -0.01em; }
.pg-tl-date { font-size: 12.5px; color: var(--pg-faint); }
.pg-tl-title { font-size: 14.5px; font-weight: 600; color: var(--pg-green-dark); margin: 8px 0 0; }
.pg-tl-card .pg-body { margin-top: 9px; font-size: 14.5px; color: var(--pg-muted); }

.pg-more {
  display: block; width: 100%; margin-top: 14px; padding: 13px 18px;
  background: var(--pg-surface); border: 1px solid var(--pg-line); border-radius: 12px;
  font-family: inherit; font-size: 14px; font-weight: 600; color: var(--pg-green-dark);
  cursor: pointer; transition: background 0.16s ease, border-color 0.16s ease;
  text-align: center;
}
.pg-more:hover { background: #F1F7F2; border-color: #CBE3D1; }
.pg-more:focus-visible { outline: 2px solid var(--pg-green); outline-offset: 2px; }
/* SOLO EN EL LMS: el "ver más" es un <details>, no un botón con estado.
   Se le quita el triángulo nativo y, una vez abierto, desaparece: el
   original también deja de pintar el botón al desplegarse. */
.pg-more::-webkit-details-marker { display: none; }
.pg-more { list-style: none; }
.pg-more-wrap[open] .pg-more { display: none; }
.pg-timeline-resto { margin-top: 14px; }

/* ── Estados y pie ──────────────────────────────────────────────────────── */
.pg-empty { text-align: center; padding: 34px 22px; color: var(--pg-faint); font-size: 14.5px; line-height: 1.65; }
.pg-foot { margin: 26px 0 0; text-align: center; font-size: 12.5px; line-height: 1.65; color: var(--pg-faint); }

/* ── Móvil ──────────────────────────────────────────────────────────────── */
@media (max-width: 720px) {
  .pg-main { padding: 26px 14px 56px; gap: 14px; }
  .pg-card { padding: 20px 18px; border-radius: 16px; }
  .pg-pace { padding: 24px 18px 20px; }
  .pg-ladder { gap: 4px; }
  .pg-rung { padding: 10px 1px 9px; font-size: 12.5px; border-radius: 9px; }
  .pg-rung-note { font-size: 8px; letter-spacing: 0.03em; margin-top: 4px; }
  .pg-stats { grid-template-columns: 1fr 1fr; gap: 16px 0; padding-top: 18px; }
  .pg-stat { padding: 0 12px; }
  .pg-stat:nth-child(odd) { padding-left: 0; border-left: none; }
  .pg-stat-num { font-size: 23px; }
  .pg-split { grid-template-columns: 1fr; gap: 14px; }
  .pg-goal-text { font-size: 16px; }
  .pg-bar-months { font-size: 17px; }
  .pg-cta-block { gap: 14px; }
  .pg-cta { width: 100%; justify-content: center; }
  .pg-cta-note { min-width: 0; text-align: center; }
  .pg-timeline { padding-left: 22px; }
  .pg-tl-node { left: -22px; top: 19px; }
  .pg-tl-card { padding: 16px 16px; }
}

@media (prefers-reduced-motion: reduce) {
  .pg-rise { animation: none; }
  .pg-fill { animation: none; }
  .pg-cta, .pg-cta-arrow { transition: none; }
}
`;
