// ---------------------------------------------------------------
// LOS ESTILOS DE «MI PROGRESO»
//
// ⚠ COPIA LITERAL de la hoja `P2_CSS` de `components/ProgresoFichaV2.tsx`
// de DRC Gestión (30/09/2026), para que comparar las dos sea un diff de
// texto. Lo que se aparta, marcado con «SOLO EN EL LMS»: la columna
// (`.p2-main`), porque allí la pone la cáscara de cada ruta; el botón,
// que aquí es un enlace; el rótulo de los temas de cada clase; y sin la
// cabecera ni el modo iframe de Gestión, que aquí no existen.
//
// Prefijo `p2-`: no choca con nada del LMS, que va por Tailwind, y viaja
// en un `<style>` dentro de la propia ficha, sin tocar `globals.css`.
//
// OJO: es un template literal; un acento grave dentro rompe el build.
// ---------------------------------------------------------------

export function EstilosFicha() {
  return <style dangerouslySetInnerHTML={{ __html: CSS }} />;
}

const CSS = `
.p2-page {
  --p2-bosque: #0E5A23;
  --p2-marca: #1E9E3A;
  --p2-tinta: #0A2E14;
  --p2-amarillo: #FFC400;
  --p2-crema: #F7F7F5;
  --p2-ink: #191A17;
  --p2-gris: #5A5E56;
  --p2-linea: #E2E3DC;
  --p2-tinte: #E9F4EB;
  --p2-foco: #2563EB;
  background: var(--p2-crema);
  color: var(--p2-ink);
  font-family: 'Radio Canada', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
  font-variant-numeric: tabular-nums;
  -webkit-font-smoothing: antialiased;
}
/* SOLO EN EL LMS: el ancho y el aire de la columna, que en Gestión pone
   la cáscara de cada ruta. Aquí la ficha vive bajo la barra de la app. */
.p2-main { max-width: 920px; margin: 0 auto; padding: 32px 20px 72px; }
.p2-ficha { display: flex; flex-direction: column; gap: 52px; }
.p2-arriba { display: flex; flex-direction: column; gap: 26px; }

/* ── Saludo + diploma ─────────────────────────────────────────────────── */
.p2-cabeza { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 32px; align-items: end; }
.p2-saludo { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.p2-saludo h1 { margin: 0; font-size: 34px; font-weight: 700; line-height: 40px; letter-spacing: -0.02em; color: var(--p2-tinta); }
.p2-saludo p { margin: 0; font-size: 18px; line-height: 26px; color: var(--p2-gris); }

.p2-dip {
  box-sizing: border-box; width: 420px; max-width: 100%;
  display: flex; align-items: center; gap: 12px; padding: 14px 16px;
  border-radius: 18px; background: var(--p2-tinte); box-shadow: inset 0 1px 0 rgba(255,255,255,0.7);
  color: var(--p2-tinta); text-decoration: none; transition: background-color 0.15s ease;
}
.p2-dip:hover { background: #DFF0E3; }
.p2-dip:focus-visible { outline: 3px solid var(--p2-foco); outline-offset: 3px; }
.p2-dip-ico { flex-shrink: 0; width: 40px; height: 40px; border-radius: 12px; background: #FFFFFF; display: flex; align-items: center; justify-content: center; }
.p2-dip-texto { flex-grow: 1; min-width: 0; display: flex; flex-direction: column; gap: 5px; }
.p2-dip-cifra { font-size: 20px; font-weight: 700; line-height: 24px; letter-spacing: -0.01em; color: var(--p2-bosque); }
.p2-dip-titular { font-size: 17px; font-weight: 700; line-height: 22px; color: var(--p2-bosque); }
.p2-dip-lecciones { display: block; min-height: 18px; font-size: 13.5px; font-weight: 500; line-height: 18px; color: var(--p2-tinta); }
.p2-dip-accion { flex-shrink: 0; display: flex; align-items: center; gap: 4px; font-size: 14px; font-weight: 700; color: var(--p2-bosque); }
.p2-solo-movil { display: none; }

/* ── Tu ritmo (variación C) ───────────────────────────────────────────── */
.p2-ritmo {
  position: relative; overflow: hidden; box-sizing: border-box;
  display: flex; align-items: center; gap: 36px; padding: 30px 32px;
  border-radius: 22px; background: #FFE27A; color: var(--p2-tinta);
}
.p2-ritmo-sol { position: absolute; width: 260px; height: 260px; border-radius: 50%; background: #FFD23F; opacity: 0.5; right: 330px; top: -150px; pointer-events: none; }
.p2-ritmo-izq { position: relative; flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; gap: 18px; }
.p2-ritmo-kicker { margin: 0; display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 600; line-height: 18px; }
.p2-ritmo-titulo { margin: 0; font-size: 26px; font-weight: 700; line-height: 32px; letter-spacing: -0.02em; text-wrap: balance; }
.p2-seg { display: flex; gap: 4px; padding: 4px; border-radius: 999px; background: rgba(10,46,20,0.09); max-width: 420px; }
.p2-seg-btn {
  flex: 1 1 0; min-width: 0; min-height: 44px; padding: 10px 14px; border: 0; border-radius: 999px;
  background: transparent; color: var(--p2-tinta); font: inherit; font-size: 15px; font-weight: 700; line-height: 18px;
  cursor: pointer; white-space: nowrap; transition: background-color 0.15s ease, color 0.15s ease;
}
.p2-seg-btn:hover { background: rgba(10,46,20,0.08); }
.p2-seg-btn.is-activa { background: var(--p2-tinta); color: #FFFFFF; box-shadow: 0 4px 10px -4px rgba(10,46,20,0.5); }
.p2-seg-btn:focus-visible { outline: 3px solid var(--p2-foco); outline-offset: 2px; }
.p2-seg-nota { font-weight: 500; }
.p2-respuesta {
  position: relative; box-sizing: border-box; width: 380px; flex-shrink: 0;
  display: flex; flex-direction: column; gap: 10px; padding: 22px 24px;
  border-radius: 18px; background: #FFFFFF; box-shadow: 0 12px 28px -18px rgba(90,70,0,0.45);
}
.p2-respuesta-frase { margin: 0; font-size: 14px; line-height: 19px; color: var(--p2-gris); }
.p2-respuesta-fecha { margin: 0; font-size: 34px; font-weight: 700; line-height: 38px; letter-spacing: -0.02em; color: var(--p2-bosque); }
.p2-respuesta-detalle { margin: 0; font-size: 14px; line-height: 19px; color: var(--p2-ink); }
.p2-puntos { display: flex; flex-wrap: wrap; gap: 5px; }
.p2-punto { width: 10px; height: 10px; border-radius: 50%; box-sizing: border-box; border: 1.5px solid #C9CCC2; transition: background-color 0.15s ease, border-color 0.15s ease; }
.p2-punto.is-lleno { background: var(--p2-marca); border-color: var(--p2-marca); }
.p2-cta {
  display: inline-flex; align-items: center; justify-content: center; text-decoration: none; box-sizing: border-box;
  margin-top: 6px; align-self: flex-start; min-height: 46px; padding: 11px 22px; border: 0; border-radius: 999px;
  background: var(--p2-bosque); color: #FFFFFF; font: inherit; font-size: 15px; font-weight: 700; line-height: 20px;
  cursor: pointer; transition: background-color 0.15s ease;
}
.p2-cta:hover { background: var(--p2-tinta); }
.p2-cta:focus-visible { outline: 3px solid var(--p2-foco); outline-offset: 3px; }

/* ── Bloques sin caja ─────────────────────────────────────────────────── */
.p2-dos { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 56px; align-items: start; }
.p2-bloque { display: flex; flex-direction: column; gap: 14px; min-width: 0; }
.p2-h2 { margin: 0; font-size: 21px; font-weight: 650; line-height: 26px; letter-spacing: -0.01em; color: var(--p2-ink); }
.p2-sep { height: 1px; background: var(--p2-linea); }

.p2-escalera { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 8px; }
.p2-peldano {
  box-sizing: border-box; height: 56px; border-radius: 12px; border: 1px solid #D5D7CF;
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px;
  font-size: 16px; font-weight: 600; line-height: 18px; color: #62665E; text-align: center;
}
.p2-peldano.is-hecho { border-color: transparent; background: var(--p2-tinte); color: #14722A; font-weight: 700; }
.p2-peldano.is-actual { border-color: transparent; background: var(--p2-bosque); color: #FFFFFF; font-weight: 700; box-shadow: 0 8px 18px -8px rgba(14,90,35,0.6); }
.p2-peldano.is-meta { border: 1.5px dashed #D9A300; background: #FFF7D6; color: #6B4F00; font-weight: 700; }
.p2-peldano-nota { font-size: 11.5px; font-weight: 600; line-height: 14px; }

.p2-objetivo { margin: 0; font-size: 19px; font-style: italic; line-height: 1.55; color: #2A2D26; white-space: pre-wrap; }

.p2-lista { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 12px; }
.p2-lista li { display: flex; gap: 12px; font-size: 16px; line-height: 24px; }
.p2-lista svg { flex-shrink: 0; margin-top: 3px; }

.p2-foco { box-sizing: border-box; padding: 26px 30px; border-radius: 18px; background: #FFFFFF; border: 1px solid var(--p2-linea); display: flex; flex-direction: column; gap: 12px; }
.p2-foco-cab { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
.p2-foco p { margin: 0; font-size: 16px; line-height: 26px; max-width: 70ch; white-space: pre-wrap; }
.p2-chip { font-size: 13px; font-weight: 700; line-height: 16px; padding: 5px 12px; border-radius: 999px; background: var(--p2-amarillo); color: var(--p2-tinta); white-space: nowrap; }
.p2-chip-sm { font-size: 12px; padding: 2px 9px; }

/* ── Recorrido plegado ────────────────────────────────────────────────── */
.p2-recorrido { display: flex; flex-direction: column; gap: 24px; }
.p2-plegado {
  box-sizing: border-box; width: 100%; display: flex; align-items: center; gap: 14px;
  padding: 18px 22px; border-radius: 18px; border: 1px solid var(--p2-linea); background: transparent;
  font: inherit; text-align: left; color: var(--p2-ink); cursor: pointer; transition: background-color 0.15s ease;
}
.p2-plegado:hover { background: #FFFFFF; }
.p2-plegado:focus-visible { outline: 3px solid var(--p2-foco); outline-offset: 3px; }
.p2-plegado-linea { flex-shrink: 0; position: relative; width: 22px; height: 40px; }
.p2-plegado-linea::before { content: ""; position: absolute; left: 10px; top: 0; bottom: 0; width: 2px; background: linear-gradient(180deg, var(--p2-marca), #D9DCD3); }
.p2-plegado-linea > span { position: absolute; left: 4px; top: 13px; width: 14px; height: 14px; border-radius: 50%; box-sizing: border-box; background: var(--p2-crema); border: 3px solid var(--p2-marca); }
.p2-plegado-texto { flex-grow: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
.p2-plegado-titulo { font-size: 19px; font-weight: 650; line-height: 24px; letter-spacing: -0.01em; }
.p2-plegado-resumen { font-size: 14px; line-height: 20px; color: var(--p2-gris); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.p2-plegado-accion { flex-shrink: 0; display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 700; color: var(--p2-bosque); }
.p2-plegado-flecha { width: 32px; height: 32px; border-radius: 50%; background: #FFFFFF; border: 1px solid var(--p2-linea); display: flex; align-items: center; justify-content: center; transition: transform 0.2s ease; }
.p2-plegado-flecha.is-abierto { transform: rotate(180deg); }

.p2-linea { position: relative; list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 26px; }
.p2-linea::before { content: ""; position: absolute; left: 11px; top: 10px; bottom: 10px; width: 2px; background: linear-gradient(180deg, var(--p2-marca) 0%, #D9DCD3 100%); }
.p2-clase { position: relative; padding-left: 36px; display: flex; flex-direction: column; gap: 4px; }
.p2-clase-nodo { position: absolute; left: 5px; top: 4px; width: 14px; height: 14px; border-radius: 50%; box-sizing: border-box; background: var(--p2-crema); border: 3px solid var(--p2-marca); }
.p2-clase.is-hito .p2-clase-nodo { background: var(--p2-amarillo); border-color: var(--p2-amarillo); box-shadow: 0 0 0 5px rgba(255,196,0,0.22); }
.p2-clase-cab { display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap; }
.p2-clase-num { font-size: 15px; font-weight: 700; line-height: 20px; }
.p2-clase-fecha { font-size: 13.5px; line-height: 18px; color: var(--p2-gris); }
.p2-clase-titulo { margin: 0; font-size: 16px; font-weight: 600; line-height: 22px; color: var(--p2-bosque); }
.p2-clase-rotulo { margin: 4px 0 0; font-size: 13px; font-weight: 600; line-height: 18px; color: var(--p2-gris); }
.p2-clase-resumen { margin: 0; font-size: 15px; line-height: 24px; color: #474B44; max-width: 68ch; white-space: pre-wrap; }
.p2-vacio { margin: 0; font-size: 15px; line-height: 24px; color: var(--p2-gris); }

.p2-pie { margin: 0; text-align: center; font-size: 13.5px; line-height: 20px; color: var(--p2-gris); }

/* ── Móvil y tablet estrecha (≤ 720 px, también el iframe de Mi cuenta) ── */
@media (max-width: 720px) {
  .p2-main { padding: 20px 16px 56px; }
  .p2-ficha { gap: 36px; }
  .p2-arriba { gap: 20px; }
  .p2-cabeza { grid-template-columns: minmax(0, 1fr); gap: 16px; }
  .p2-saludo h1 { font-size: 26px; line-height: 32px; }
  .p2-saludo p { font-size: 16px; line-height: 24px; }
  .p2-dip { width: 100%; padding: 12px 14px; }
  .p2-dip-cifra { font-size: 18px; line-height: 22px; }
  .p2-dip-titular { font-size: 16px; }
  /* El texto del enlace se queda para el lector de pantalla; se ve la flecha. */
  .p2-dip-accion-txt { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }

  .p2-ritmo { flex-direction: column; align-items: stretch; gap: 18px; padding: 20px 18px 18px; }
  .p2-ritmo-sol { right: -120px; top: -130px; }
  .p2-ritmo-izq { gap: 14px; }
  .p2-ritmo-titulo { font-size: 21px; line-height: 26px; }
  .p2-seg { max-width: none; }
  .p2-seg-btn { padding: 10px 8px; font-size: 14px; }
  .p2-respuesta { width: auto; padding: 18px; }
  .p2-respuesta-fecha { font-size: 28px; line-height: 32px; }
  .p2-cta { width: 100%; align-self: stretch; }

  .p2-dos { grid-template-columns: minmax(0, 1fr); gap: 36px; }
  .p2-h2 { font-size: 19px; }
  .p2-escalera { gap: 5px; }
  .p2-peldano { height: 50px; font-size: 15px; }
  .p2-objetivo { font-size: 17px; }
  .p2-lista li { font-size: 15px; }
  .p2-foco { padding: 20px; }
  .p2-foco p { font-size: 15px; }
  .p2-plegado { padding: 14px; }
  .p2-plegado-titulo { font-size: 17px; }
  .p2-plegado-resumen { white-space: normal; }
  .p2-plegado-accion-txt { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
  .p2-linea::before { left: 9px; }
  .p2-clase { padding-left: 30px; }
  .p2-clase-nodo { left: 3px; }
}

/* ── Teléfono (≤ 480 px) ──────────────────────────────────────────────── */
@media (max-width: 480px) {
  .p2-solo-ancho { display: none; }
  .p2-solo-movil { display: inline; }
  /* "Estás aquí" no cabe en un peldaño de ~50 px: baja a dos líneas. */
  .p2-peldano-nota { font-size: 10px; line-height: 11px; }
}
@media (max-width: 400px) {
  .p2-seg-btn { padding: 10px 4px; font-size: 13px; }
}

@media (prefers-reduced-motion: reduce) {
  .p2-page *, .p2-page *::before, .p2-page *::after { transition: none !important; }
}
`;
