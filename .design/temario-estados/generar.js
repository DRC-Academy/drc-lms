// Genera los artboards del canvas «Los cuatro estados del temario».
//
// Todo lo que se pinta sale de los valores reales de `components/curso/*`
// y de la paleta `temario` de `tailwind.config.ts`; lo único nuevo es el
// tratamiento de los cuatro estados de la fila de módulo.
const fs = require('fs');
const path = require('path');

const P = {
  fondo: '#F5F6F4', borde: '#E4E7E1', bordeFila: '#E7E9E4', bordeHover: '#C5D2C8', filaHover: '#FCFDFB',
  oscuro: '#10221A', verde: '#1DA34B', verdeTexto: '#14603A', ambar: '#E9B429',
  tinta: '#0F1A14', medio: '#6B756E', suave: '#8A948D', tenue: '#98A29B', enlace: '#5F6B64',
  separador: '#C3CAC5', puntoSuave: '#B4BCB6', rail: '#EDEFEB', linea: '#E1E4DE', circulo: '#DCE0D9',
  mesPendiente: '#F3F5F1',
  // Los dos únicos valores que no están en la paleta del temario: vienen de `marca`.
  verdePalido: '#A9DFB7',
  // El borde discontinuo de lo que viene después. Un paso por debajo de `circulo`.
  discontinuo: '#D6DBD7',
};
const RC = "'Radio Canada', system-ui, sans-serif";
const RCB = "'Radio Canada Big', 'Radio Canada', system-ui, sans-serif";

const HELMET = `<helmet>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Radio+Canada:wght@400;500;600;700;800&family=Radio+Canada+Big:wght@600;700&display=swap">
  <style>
    body { margin: 0; font-family: ${RC}; color: ${P.tinta}; -webkit-font-smoothing: antialiased; }
    * { box-sizing: border-box; }
    a { color: ${P.verdeTexto}; } a:hover { color: ${P.tinta}; }
    ul { list-style: none; margin: 0; padding: 0; }
  </style>
</helmet>`;

// ------------------------------------------------------------ iconos
const ICONO = {
  candado: (c = P.tenue) => `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="${c}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="7" width="10" height="7" rx="2"></rect><path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2"></path></svg>`,
  check: (c = P.verdeTexto) => `<svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.5 6.5l2.5 2.5 4.5-5"></path></svg>`,
  reloj: (c = P.tenue) => `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="${c}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="8" cy="8" r="6"></circle><path d="M8 4.5V8l2.3 1.6"></path></svg>`,
  calendario: (c = P.tenue) => `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="${c}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2.5" y="3.5" width="11" height="10" rx="2"></rect><path d="M2.5 7h11M5.5 2v3M10.5 2v3"></path><circle cx="8" cy="10.5" r="0.9" fill="${c}" stroke="none"></circle></svg>`,
};

// ------------------------------------------------------------ marcas
// Las cuatro ocupan 18×18 para que las filas no se desalineen entre sí.
function marca(estado, escritorio) {
  const mt = escritorio ? '0' : '1px';
  const caja = `display:flex;align-items:center;justify-content:center;width:18px;height:18px;flex-shrink:0;margin-top:${mt};border-radius:999px;`;
  switch (estado) {
    case 'actual':
      return `<span aria-hidden="true" style="${caja}border:1.5px solid ${P.verde}"><span style="display:block;width:7px;height:7px;border-radius:999px;background:${P.verde}"></span></span>`;
    case 'disponible':
      return `<span aria-hidden="true" style="${caja}border:1.5px solid ${P.separador}"></span>`;
    case 'hecho':
      return `<span aria-hidden="true" style="${caja}background:${P.verdePalido}">${ICONO.check()}</span>`;
    case 'despues':
      return `<span aria-hidden="true" style="${caja}">${ICONO.candado()}</span>`;
    // Variantes de la hoja de alternativas.
    case 'despues-reloj':
      return `<span aria-hidden="true" style="${caja}">${ICONO.reloj()}</span>`;
    case 'despues-calendario':
      return `<span aria-hidden="true" style="${caja}">${ICONO.calendario()}</span>`;
    case 'despues-hoy':
      return `<span aria-hidden="true" style="${caja}border:1.5px dashed ${P.circulo}"></span>`;
  }
}

// ------------------------------------------------------------ la fila
/**
 * Una fila de módulo. `estado` es uno de los cuatro; `escritorio` decide
 * la forma (una línea o tres). `variante` solo lo usan las alternativas.
 */
function fila({ estado, numero, titulo, meta, derecha, escritorio, variante }) {
  const marcaEstado = variante ?? estado;
  const esDespues = estado === 'despues';
  const esHoy = variante === 'despues-hoy';

  // Contenedor por estado.
  let caja;
  if (esHoy) caja = `border:1px solid ${P.borde};background:rgba(237,239,235,0.5);`;
  else if (esDespues) caja = `border:1px dashed ${P.discontinuo};background:transparent;`;
  else if (estado === 'actual') caja = `border:1.5px solid ${P.verde};background:#FFFFFF;`;
  else if (estado === 'hecho') caja = `border:1px solid ${P.bordeFila};background:rgba(237,239,235,0.4);`;
  else caja = `border:1px solid ${P.bordeFila};background:#FFFFFF;`;

  const colorRotulo = estado === 'actual' ? P.verdeTexto : esDespues && !esHoy ? P.puntoSuave : P.tenue;
  const colorTitulo = esHoy ? P.suave : esDespues ? P.suave : estado === 'hecho' ? P.medio : P.tinta;
  const pesoTitulo = estado === 'actual' ? 700 : esDespues && !esHoy ? 500 : 600;

  const pad = escritorio ? 'padding:14px 18px;gap:16px;align-items:center;' : 'padding:12px 16px;gap:12px;align-items:flex-start;';
  const tTitulo = escritorio ? '15.5px' : '14px';

  // A la derecha: «Continuar →», la fecha, o el chevrón. En móvil la
  // fecha de lo que viene después baja bajo el título y la derecha
  // queda vacía: es lo que deja sitio al título a 375px.
  let lado = '';
  if (estado === 'actual') lado = `<span style="flex-shrink:0;white-space:nowrap;font-size:13px;font-weight:700;color:${P.verdeTexto};margin-top:${escritorio ? 0 : '2px'}">Continuar →</span>`;
  else if (esDespues && (escritorio || esHoy)) lado = `<span style="flex-shrink:0;white-space:nowrap;font-size:12.5px;font-weight:${esHoy ? 600 : 500};color:${P.suave};margin-top:${escritorio ? 0 : '2px'}">${derecha}</span>`;
  else if (!esDespues) lado = `<span aria-hidden="true" style="flex-shrink:0;font-size:13px;color:${P.separador};margin-top:${escritorio ? 0 : '2px'}">›</span>`;

  const lineaMeta = meta
    ? `<span style="display:block;white-space:${escritorio ? 'nowrap' : 'normal'};font-size:${escritorio ? '12.5px' : '11.5px'};font-weight:500;color:${P.medio};margin-top:${escritorio ? 0 : '5px'}">${meta}</span>`
    : esDespues && !escritorio && !esHoy
      ? `<span style="display:flex;align-items:center;gap:6px;font-size:11.5px;font-weight:500;color:${P.suave};margin-top:5px">${derecha}</span>`
      : '';

  const cuerpo = escritorio
    ? `<div style="display:flex;align-items:center;gap:16px;min-width:0;flex:1">
        <span style="display:block;width:78px;flex-shrink:0;font-size:12px;font-weight:800;text-transform:uppercase;line-height:1;color:${colorRotulo}">Módulo ${numero}</span>
        <span style="display:block;flex:1;min-width:0;font-size:${tTitulo};line-height:1.3;font-weight:${pesoTitulo};color:${colorTitulo};text-wrap:pretty">${titulo}</span>
        ${lineaMeta}
      </div>`
    : `<div style="display:flex;flex-direction:column;min-width:0;flex:1">
        <span style="display:block;font-size:12px;font-weight:800;text-transform:uppercase;line-height:1;color:${colorRotulo}">Módulo ${numero}</span>
        <span style="display:block;margin-top:4px;font-size:${tTitulo};line-height:1.3;font-weight:${pesoTitulo};color:${colorTitulo};text-wrap:pretty">${titulo}</span>
        ${lineaMeta}
      </div>`;

  return `<li style="display:flex;min-height:44px;border-radius:12px;${pad}${caja}">
      ${marca(marcaEstado, escritorio)}
      ${cuerpo}
      ${lado}
    </li>`;
}

// ------------------------------------------------------------ el mes
const MES = {
  numero: 3, titulo: 'Contar lo que pasó', semanas: '9 a 12', hechas: 9, total: 32, pct: 28,
  completados: [
    { numero: 17, titulo: 'Past simple: lo que hiciste ayer' },
    { numero: 18, titulo: 'Preguntas y negativas en pasado' },
  ],
  semanas: [
    { numero: 10, modulos: [
      { estado: 'actual', numero: 19, titulo: 'Present perfect frente a past simple', meta: '4 lecciones · 1 hecha' },
      { estado: 'disponible', numero: 20, titulo: 'Phrasal verbs con «get»', meta: '4 lecciones · 0 hechas' },
    ] },
    { numero: 11, modulos: [
      { estado: 'despues', numero: 21, titulo: 'Past perfect en narración', derecha: 'Se abre en 5 días' },
      { estado: 'despues', numero: 22, titulo: 'Conectores para contar una historia', derecha: 'Se abre en 5 días' },
    ] },
    { numero: 12, modulos: [
      { estado: 'despues', numero: 23, titulo: 'Used to y would para hábitos del pasado', derecha: 'Se abre el 26 de sept.' },
      { numero: 24, estado: 'despues', titulo: 'Contar una anécdota de trabajo', derecha: 'Se abre el 26 de sept.' },
    ] },
  ],
};

function rotuloSemana(n, escritorio) {
  return `<div style="display:flex;align-items:center;gap:12px;margin-bottom:8px">
    <span style="font-size:10.5px;font-weight:800;text-transform:uppercase;letter-spacing:0.16em;line-height:1;color:${P.suave}">Semana ${n}</span>
    <span aria-hidden="true" style="display:block;height:1px;flex:1;background:${P.borde}"></span>
  </div>`;
}

function completados(escritorio, abierto) {
  const pad = escritorio ? 'padding:8px 18px;gap:16px;' : 'padding:8px 16px;gap:12px;';
  return `<div style="padding-top:${escritorio ? 16 : 14}px">
    <div style="display:flex;align-items:center;min-height:40px;width:100%;border-radius:12px;border:1px solid ${P.borde};background:rgba(237,239,235,0.6);${pad}">
      <span aria-hidden="true" style="display:flex;align-items:center;justify-content:center;width:18px;height:18px;flex-shrink:0;border-radius:999px;background:${P.verdePalido}">${ICONO.check()}</span>
      <span style="flex:1;font-size:${escritorio ? 13 : 12.5}px;font-weight:600;color:${P.suave}">2 módulos completados</span>
      <span aria-hidden="true" style="flex-shrink:0;font-size:10px;color:${P.suave}">${abierto ? '▲' : '▼'}</span>
    </div>
    ${abierto ? `<ul style="display:flex;flex-direction:column;gap:6px;margin-top:6px">${MES.completados.map((m) => fila({ estado: 'hecho', ...m, escritorio })).join('')}</ul>` : ''}
  </div>`;
}

function semanas(escritorio) {
  return MES.semanas.map((s) => `<div style="padding-top:${escritorio ? 16 : 14}px">
    ${rotuloSemana(s.numero, escritorio)}
    <ul style="display:flex;flex-direction:column;gap:6px">${s.modulos.map((m) => fila({ ...m, escritorio })).join('')}</ul>
  </div>`).join('');
}

function cabeceraMes(escritorio) {
  if (escritorio) {
    return `<div style="display:flex;align-items:center;gap:24px;min-height:44px;width:100%;border-radius:16px;border:1px solid ${P.borde};background:#FFFFFF;padding:18px 22px">
      <span style="display:flex;flex-direction:column;min-width:0;flex:1">
        <span style="display:flex;align-items:center;gap:10px">
          <span style="font-size:10.5px;font-weight:800;text-transform:uppercase;letter-spacing:0.16em;line-height:1;color:${P.suave}">Mes ${MES.numero}</span>
          <span aria-hidden="true" style="font-size:11px;color:${P.puntoSuave}">·</span>
          <span style="font-size:11.5px;font-weight:600;color:${P.suave}">Semanas ${MES.semanas_txt}</span>
        </span>
        <span style="display:block;margin-top:5px;font-size:19px;font-weight:700;line-height:1.25;letter-spacing:-0.015em;color:${P.tinta};text-wrap:pretty">${MES.titulo}</span>
      </span>
      <span style="display:block;width:132px;flex-shrink:0">
        <span style="display:block;height:5px;overflow:hidden;border-radius:999px;background:${P.rail}"><span style="display:block;height:100%;width:${MES.pct}%;border-radius:999px;background:${P.verde}"></span></span>
        <span style="display:block;margin-top:7px;font-size:11.5px;font-weight:600;color:${P.suave};font-variant-numeric:tabular-nums">${MES.hechas} de ${MES.total} lecciones</span>
      </span>
      <span aria-hidden="true" style="display:flex;align-items:center;justify-content:center;width:30px;height:30px;flex-shrink:0;border-radius:999px;border:1px solid ${P.linea};font-size:10px;color:${P.enlace};transform:rotate(180deg)">▼</span>
    </div>`;
  }
  return `<div style="display:flex;align-items:center;gap:12px;min-height:44px;width:100%;border-radius:16px;border:1px solid ${P.borde};background:#FFFFFF;padding:15px 16px">
    <span style="display:flex;align-items:center;justify-content:center;width:32px;height:32px;flex-shrink:0;border-radius:999px;background:${P.oscuro};color:#FFFFFF;font-size:13px;font-weight:800">${MES.numero}</span>
    <span style="display:flex;flex-direction:column;min-width:0;flex:1">
      <span style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:0.14em;line-height:1;color:${P.suave}">Mes ${MES.numero}</span>
      <span style="display:block;margin-top:3px;font-size:14.5px;font-weight:700;line-height:1.25;color:${P.tinta};text-wrap:pretty">${MES.titulo}</span>
    </span>
    <span aria-hidden="true" style="flex-shrink:0;font-size:10px;color:${P.enlace};transform:rotate(180deg)">▼</span>
  </div>`;
}
MES.semanas_txt = '9 a 12';

function artboard(cuerpo, ancho, alto) {
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <script src="./support.js"></script>
</head>
<body>
<x-dc>
${HELMET}
<div style="width:${ancho}px;min-height:${alto}px;background:${P.fondo}">
${cuerpo}
</div>
</x-dc>
</body>
</html>
`;
}

// ------------------------------------------------------------ Main: escritorio
const escritorio = artboard(`
  <div style="padding:40px 44px 56px">
    <div style="display:flex;align-items:center;justify-content:space-between;gap:20px">
      <h2 style="margin:0;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:0.16em;line-height:1;color:${P.tinta}">Programa mes a mes</h2>
      <div style="display:flex;align-items:center;gap:8px">
        <span style="display:inline-flex;align-items:center;border-radius:999px;border:1px solid ${P.linea};background:#FFFFFF;padding:6px 13px;font-size:12.5px;font-weight:600;color:${P.enlace}">Expandir todo</span>
        <span style="display:inline-flex;align-items:center;border-radius:999px;border:1px solid ${P.linea};background:#FFFFFF;padding:6px 13px;font-size:12.5px;font-weight:600;color:${P.enlace}">Contraer todo</span>
      </div>
    </div>

    <div style="margin-top:16px;display:grid;grid-template-columns:58px minmax(0,1fr);align-items:stretch">
      <div style="display:flex;flex-direction:column;align-items:center;padding-top:4px">
        <span style="display:flex;align-items:center;justify-content:center;width:34px;height:34px;flex-shrink:0;border-radius:999px;background:${P.oscuro};color:#FFFFFF;font-size:13px;font-weight:800">${MES.numero}</span>
        <span aria-hidden="true" style="display:block;margin-top:6px;width:2px;flex:1;background:${P.linea}"></span>
      </div>
      <div style="padding:0 0 14px 4px">
        ${cabeceraMes(true)}
        <div style="padding:6px 0 10px 10px">
          ${completados(true, true)}
          ${semanas(true)}
        </div>
      </div>
    </div>
  </div>
`, 1240, 900);

// ------------------------------------------------------------ móvil a 375
const movil = artboard(`
  <div style="padding:24px 16px 56px">
    <h2 style="margin:0;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:0.16em;line-height:1;color:${P.tinta}">Programa mes a mes</h2>
    <div style="margin-top:10px">
      ${cabeceraMes(false)}
      <div style="padding:6px 4px 10px">
        ${completados(false, true)}
        ${semanas(false)}
      </div>
    </div>
  </div>
`, 375, 1000);

// ------------------------------------------------------------ la hoja de estados
function ficha(estado, nombre, resumen, specs, filaEscritorio, filaMovil) {
  const li = specs.map(([k, v]) => `<li style="display:grid;grid-template-columns:96px minmax(0,1fr);gap:12px;padding:7px 0;border-top:1px solid ${P.borde};font-size:12.5px;line-height:1.45"><span style="font-weight:700;color:${P.suave};text-transform:uppercase;font-size:10.5px;letter-spacing:0.1em;padding-top:2px">${k}</span><span style="color:${P.medio}">${v}</span></li>`).join('');
  return `<section style="display:grid;grid-template-columns:600px 343px minmax(0,1fr);gap:32px;align-items:start;padding:28px 0;border-top:1px solid ${P.linea}">
    <div>
      <p style="margin:0 0 12px;font-family:${RCB};font-size:17px;font-weight:700;color:${P.tinta}">${nombre}</p>
      <ul style="display:flex;flex-direction:column;gap:6px">${filaEscritorio}</ul>
      <p style="margin:12px 0 0;font-size:13px;line-height:1.5;color:${P.medio};max-width:56ch;text-wrap:pretty">${resumen}</p>
    </div>
    <div>
      <p style="margin:0 0 12px;font-size:10.5px;font-weight:800;text-transform:uppercase;letter-spacing:0.14em;color:${P.suave}">A 375px</p>
      <ul style="display:flex;flex-direction:column;gap:6px">${filaMovil}</ul>
    </div>
    <ul style="display:flex;flex-direction:column;margin-top:28px">${li}</ul>
  </section>`;
}

const estados = artboard(`
  <div style="padding:40px 44px 48px">
    <p style="margin:0;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:0.16em;color:${P.verdeTexto}">Temario · la fila de módulo</p>
    <h1 style="margin:10px 0 0;font-family:${RCB};font-size:30px;font-weight:700;letter-spacing:-0.02em;line-height:1.1;color:${P.tinta}">Los cuatro estados, uno al lado del otro</h1>
    <p style="margin:12px 0 28px;font-size:15px;line-height:1.55;color:${P.medio};max-width:72ch;text-wrap:pretty">Cada estado cambia tres cosas a la vez —la marca de la izquierda, el contenedor y el peso del título— para que se distinga sin leer. Sin opacidad: los colores son explícitos, que a los sesenta un texto al 50% no se lee.</p>

    ${ficha('actual', '1 · En curso',
      'Lo único con borde verde en toda la lista. La marca pasa de un punto de 7px a un anillo con punto: el mismo tamaño que las demás marcas, y se lee como «estás aquí» también desde lejos.',
      [['Marca', `Anillo 18px, 1,5px <b>verde</b> ${P.verde}, punto 7px dentro`], ['Contenedor', `Blanco, borde 1,5px ${P.verde}, radio 12`], ['Rótulo', `«Módulo N» extrabold 12 en ${P.verdeTexto}`], ['Título', `Bold 15,5 en tinta ${P.tinta}`], ['Derecha', `«Continuar →» bold 13 en ${P.verdeTexto}`]],
      fila({ estado: 'actual', numero: 19, titulo: 'Present perfect frente a past simple', meta: '4 lecciones · 1 hecha', escritorio: true }),
      fila({ estado: 'actual', numero: 19, titulo: 'Present perfect frente a past simple', meta: '4 lecciones · 1 hecha', escritorio: false }))}

    ${ficha('disponible', '2 · Disponible, sin empezar',
      'La tarjeta blanca es lo que dice «se puede pulsar». El anillo sube un tono —hoy es casi invisible— para que la fila tenga marca aunque esté vacía.',
      [['Marca', `Anillo 18px, 1,5px ${P.separador} (hoy ${P.circulo})`], ['Contenedor', `Blanco, borde 1px ${P.bordeFila}; hover ${P.bordeHover}`], ['Rótulo', `Extrabold 12 en ${P.tenue}`], ['Título', `Semibold 15,5 en tinta`], ['Derecha', `Chevrón › en ${P.separador}`]],
      fila({ estado: 'disponible', numero: 20, titulo: 'Phrasal verbs con «get»', meta: '4 lecciones · 0 hechas', escritorio: true }),
      fila({ estado: 'disponible', numero: 20, titulo: 'Phrasal verbs con «get»', meta: '4 lecciones · 0 hechas', escritorio: false }))}

    ${ficha('hecho', '3 · Completado',
      'Sigue sin blanco de tarjeta —es archivo, no tarea— pero el check pasa a verde pálido: es el mismo verde con el que el mes completado lleva su círculo, un tono más abajo. Vive dentro del desplegable de completados.',
      [['Marca', `Círculo relleno 18px ${P.verdePalido}, check ${P.verdeTexto}`], ['Contenedor', `Sin blanco: ${P.rail} al 40%, borde 1px ${P.bordeFila}`], ['Rótulo', `Extrabold 12 en ${P.tenue}`], ['Título', `Semibold 15,5 en ${P.medio} (hoy en ${P.suave}: subía poco del fondo)`], ['Derecha', `Chevrón › (se repasa desde aquí)`]],
      fila({ estado: 'hecho', numero: 17, titulo: 'Past simple: lo que hiciste ayer', escritorio: true }),
      fila({ estado: 'hecho', numero: 17, titulo: 'Past simple: lo que hiciste ayer', escritorio: false }))}

    ${ficha('despues', '4 · Se abre después',
      'Deja de ser una tarjeta: sin blanco y con el borde discontinuo, la forma de lo que todavía no está. El candado va fino y del gris verdoso de los rótulos, nunca rojo, y el texto dice «se abre», no «bloqueado»: es algo que ocurre solo, en una fecha.',
      [['Marca', `Candado outline 16px, trazo 1,5 en ${P.tenue}`], ['Contenedor', `Transparente, borde 1px <b>discontinuo</b> ${P.discontinuo}, radio 12. Sin hover.`], ['Rótulo', `Extrabold 12 en ${P.puntoSuave}`], ['Título', `<b>Medium</b> 15,5 en ${P.suave}: un peso menos que los demás`], ['Derecha', `«Se abre en 5 días» / «Se abre el 26 de sept.» medium 12,5 en ${P.suave}. En móvil baja bajo el título y la derecha queda vacía.`]],
      fila({ estado: 'despues', numero: 23, titulo: 'Used to y would para hábitos del pasado', derecha: 'Se abre el 26 de sept.', escritorio: true }),
      fila({ estado: 'despues', numero: 23, titulo: 'Used to y would para hábitos del pasado', derecha: 'Se abre el 26 de sept.', escritorio: false }))}
  </div>
`, 1360, 1520);

// ------------------------------------------------------------ alternativas
function alternativa(titulo, nota, li) {
  return `<section style="padding:22px 0;border-top:1px solid ${P.linea}">
    <p style="margin:0 0 10px;font-family:${RCB};font-size:15px;font-weight:700;color:${P.tinta}">${titulo}</p>
    <ul style="display:flex;flex-direction:column;gap:6px">${li}</ul>
    <p style="margin:10px 0 0;font-size:13px;line-height:1.5;color:${P.medio};max-width:66ch;text-wrap:pretty">${nota}</p>
  </section>`;
}
const alternativas = artboard(`
  <div style="padding:40px 44px 40px">
    <p style="margin:0;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:0.16em;color:${P.verdeTexto}">Lo que viene después · alternativas</p>
    <h1 style="margin:10px 0 24px;font-family:${RCB};font-size:24px;font-weight:700;letter-spacing:-0.02em;line-height:1.15;color:${P.tinta}">Tres formas de decir «todavía no», y por qué la propuesta lleva el candado</h1>

    ${alternativa('A · Reloj en vez de candado',
      'Dice «tiempo» sin decir «cerrado», y evita del todo la lectura de «desbloquéalo». A cambio, un reloj también se lee como «en curso» o «pendiente de ti», y no deja tan claro que la fila no se pulsa. Es la alternativa que más cerca está de ganar.',
      fila({ estado: 'despues', variante: 'despues-reloj', numero: 21, titulo: 'Past perfect en narración', derecha: 'Se abre en 5 días', escritorio: true }))}

    ${alternativa('B · Calendario',
      'Es literalmente «una fecha que llega». Pero a 16px un calendario es un rectángulo con dos pinchos, y a los sesenta hay que leerlo; el candado se reconoce sin mirar.',
      fila({ estado: 'despues', variante: 'despues-calendario', numero: 21, titulo: 'Past perfect en narración', derecha: 'Se abre el 20 de sept.', escritorio: true }))}

    ${alternativa('C · Como hoy, con «se abre» en vez de «disponible»',
      'Solo el cambio de texto. Es donde estamos: el círculo discontinuo y el gris no se distinguen del disponible a un vistazo, que es el problema que abre el encargo.',
      fila({ estado: 'despues', variante: 'despues-hoy', numero: 21, titulo: 'Past perfect en narración', derecha: 'Se abre en 5 días', escritorio: true }))}
  </div>
`, 720, 740);

// ------------------------------------------------------------ escribir
const dir = __dirname;
fs.writeFileSync(path.join(dir, 'Main.dc.html'), escritorio);
fs.writeFileSync(path.join(dir, 'Movil.dc.html'), movil);
fs.writeFileSync(path.join(dir, 'Estados.dc.html'), estados);
fs.writeFileSync(path.join(dir, 'Alternativas.dc.html'), alternativas);

const canvas = {
  artboards: [
    { file: 'Main.dc.html', x: 0, y: 0, w: 1240, h: 900, title: 'Escritorio · un mes abierto' },
    { file: 'Movil.dc.html', x: 1340, y: 0, w: 375, h: 1000, title: 'Móvil · 375' },
    { file: 'Estados.dc.html', x: 0, y: 1160, w: 1360, h: 1520, title: 'Los cuatro estados, con sus valores' },
    { file: 'Alternativas.dc.html', x: 1460, y: 1160, w: 720, h: 740, title: 'Alternativas para «se abre después»' },
  ],
  annotations: [
    { id: 'tono', x: 1340, y: 1060, w: 375, text: 'EL TONO\n\n«Se abre en 5 días» y no «Disponible en 5 días»: abrirse es algo que le pasa al módulo, en una fecha; «disponible» describe un estado que a alguien le falta. Y nunca «bloqueado» en pantalla.\n\nDe 7 días en adelante, la fecha («Se abre el 26 de sept.»): un día en el calendario se siente como algo que llega; un contador, como una espera.' },
    { id: 'movil', x: 1780, y: 0, w: 320, text: 'MÓVIL\n\nLa fecha baja bajo el título, donde en las demás filas va «4 lecciones · 0 hechas», y la derecha queda vacía. Es lo que deja al título sus 240px a 375: con la fecha a la derecha, «Used to y would para hábitos del pasado» partía en tres líneas.' },
    { id: 'codigo', x: 1460, y: 1980, w: 720, text: 'QUÉ CAMBIA EN EL CÓDIGO\n\nTodo en components/curso/FilaModulo.tsx: la marca (anillo+punto, anillo, check pálido, candado SVG), el string `aspecto` (borde discontinuo y sin fondo para lo que viene después; check pálido y título en `medio` para lo hecho) y en móvil la fecha en la línea de meta. Y un texto nuevo en el diccionario: banners.seAbreEn / seAbreEl, que sustituye a disponibleEnDias en la fila y en la cabecera del mes.' },
  ],
  launch: { view: 'canvas' },
};
fs.writeFileSync(path.join(dir, 'canvas.json'), JSON.stringify(canvas, null, 2) + '\n');
console.log('ok', fs.readdirSync(dir).filter((f) => f.endsWith('.dc.html')).join(' '));
