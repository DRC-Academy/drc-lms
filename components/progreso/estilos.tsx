import { CSS_DIPLOMA } from "@/components/progreso/BannerDiplomaFicha";

// ---------------------------------------------------------------
// EL CSS `pg-*` DE LA FICHA DE PROGRESO, COMPARTIDO
//
// Vivía dentro de `Ficha.tsx`. Sale aquí porque el recorrido clase a
// clase (`Recorrido.tsx`) lo usa también el historial de «Clases», y una
// sola hoja para los dos es lo que hace que se vean igual.
// ---------------------------------------------------------------

export function EstilosFicha() {
  // El CSS del diploma va detrás de todo, incluida la media query de
  // móvil: así el padding propio de esa tarjeta gana al de `.pg-card`.
  return <style dangerouslySetInnerHTML={{ __html: CSS_FICHA + CSS_DIPLOMA }} />;
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
//   · `.pg-more-wrap`, para que el `<details>` haga de botón "ver más".
//
// El resto es literal, incluidas las medias queries y el bloque de
// `prefers-reduced-motion`.
// ---------------------------------------------------------------
export const CSS_FICHA = `
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

/* SOLO EN EL LMS: 880 px de columna y no los 780 de Gestión. Aquí la ficha va
   debajo de una barra de navegación a todo el ancho y a 780 se veía fina y
   apretada (las tres tarjetas del plan quedaban en 221 px). */
.pg-main {
  max-width: 880px; margin: 0 auto; padding: 28px 20px 72px;
  display: flex; flex-direction: column; gap: 18px;
}

/* ── Entrada escalonada ─────────────────────────────────────────────────── */
.pg-rise { animation: pg-rise 0.55s cubic-bezier(0.22, 0.61, 0.36, 1) backwards; }
@keyframes pg-rise { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }

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
  font-size: 19px; font-weight: 700; letter-spacing: -0.02em; margin: 18px 0 14px;
  text-align: center;
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
/* La nota del nivel sin confirmar. En minúsculas y SIN el tracking del
   rótulo de arriba: no es una etiqueta más de la tira, es una frase. Y
   sin color propio —el mismo apagado que el resto— porque un color
   distinto la convertiría en la advertencia que no queremos que sea. */
.pg-stat-nota {
  display: block; margin-top: 4px; font-size: 10.5px; font-weight: 500;
  line-height: 1.35; color: var(--pg-faint); text-transform: none; letter-spacing: 0;
  max-width: 15ch;
}

/* ── Objetivo (las palabras del propio alumno, en cursiva) ──────────────── */
.pg-goal { border-left: 4px solid var(--pg-green); }
.pg-goal-text {
  margin: 0; font-size: 17px; font-style: italic; font-weight: 400;
  line-height: 1.62; color: #24271F; white-space: pre-wrap;
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
/* SOLO EN EL LMS: los temas y el vocabulario de la clase, en el historial
   de «Clases». La ficha de progreso no los pinta. */
.pg-tl-temas { margin-top: 12px; padding-top: 11px; border-top: 1px dashed var(--pg-line); }
.pg-tl-temas-rotulo { font-size: 11px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: var(--pg-green-dark); margin: 0; }
.pg-tl-temas .pg-body { margin-top: 5px; }

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
  .pg-main { padding: 20px 14px 56px; gap: 14px; }
  .pg-card { padding: 20px 18px; border-radius: 16px; }
  .pg-ladder { gap: 4px; }
  .pg-rung { padding: 10px 1px 9px; font-size: 12.5px; border-radius: 9px; }
  .pg-rung-note { font-size: 8px; letter-spacing: 0.03em; margin-top: 4px; }
  .pg-stats { grid-template-columns: 1fr 1fr; gap: 16px 0; padding-top: 18px; }
  .pg-stat { padding: 0 12px; }
  .pg-stat:nth-child(odd) { padding-left: 0; border-left: none; }
  .pg-stat-num { font-size: 23px; }
  .pg-split { grid-template-columns: 1fr; gap: 14px; }
  .pg-goal-text { font-size: 16px; }
  .pg-timeline { padding-left: 22px; }
  .pg-tl-node { left: -22px; top: 19px; }
  .pg-tl-card { padding: 16px 16px; }
}

@media (prefers-reduced-motion: reduce) {
  .pg-rise { animation: none; }
}
`;
