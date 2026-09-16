// Utilidades compartidas por los scripts de la mascota.
const fs = require("fs");
const path = require("path");
const { Resvg } = require("@resvg/resvg-js");

const DIR = path.join(__dirname, "..");
const SVG = path.join(DIR, "geckonoid.svg");

// Qué grupos base oculta cada pieza de expresión cuando se activa.
const REEMPLAZA = {
  ojos_felices: ["ojo_izq", "ojo_der"],
  ojos_guino: ["ojo_izq", "ojo_der"],
  ojos_tristes: ["ojo_izq", "ojo_der"],
  ojos_brillantes: ["ojo_izq", "ojo_der"],
  cejas_altas: ["ceja_izq", "ceja_der"],
  cejas_duda: ["ceja_izq", "ceja_der"],
  cejas_tristes: ["ceja_izq", "ceja_der"],
  boca_abierta: ["boca"],
  boca_o: ["boca"],
  boca_triste: ["boca"],
  sonrisa_lateral: ["boca"],
  anteojos: [],
  brazo_pulgar: ["brazo_der"],
  brazo_diploma: ["brazo_der"],
  signo_exclamacion: [],
  gotita: [],
  estrellas: [],
};

// Estados de la app → piezas activas (el orden acá es el de la grilla).
const ESTADOS = {
  idle: [],
  estudio: ["anteojos"],
  exito: ["ojos_felices", "cejas_altas", "boca_abierta", "estrellas"],
  duda: ["cejas_duda", "boca_o", "signo_exclamacion"],
  animo: ["ojos_guino", "sonrisa_lateral", "brazo_pulgar"],
  racha: ["ojos_tristes", "cejas_tristes", "boca_triste", "gotita"],
  nivel: ["ojos_brillantes", "cejas_altas", "brazo_diploma"],
};

const leerSvg = () => fs.readFileSync(SVG, "utf8");

// Muestra u oculta un <g id> de primer nivel (style="display:none").
const setVisible = (svg, id, visible) => {
  const re = new RegExp(`<g id="${id}"( style="display:none")?>`);
  if (!re.test(svg)) throw new Error(`grupo no encontrado: ${id}`);
  return svg.replace(re, visible ? `<g id="${id}">` : `<g id="${id}" style="display:none">`);
};

// SVG de un estado: todas las expresiones ocultas salvo las del estado, y sin las base que reemplazan.
const svgDeEstado = (svg, piezas) => {
  for (const id of Object.keys(REEMPLAZA)) svg = setVisible(svg, id, false);
  for (const id of piezas) {
    svg = setVisible(svg, id, true);
    for (const base of REEMPLAZA[id]) svg = setVisible(svg, base, false);
  }
  return svg;
};

// En Windows un PNG recién escrito puede quedar bloqueado un instante (antivirus, indexador,
// visor abierto) y el open falla con UNKNOWN/EBUSY/EPERM: se reintenta con espera creciente.
const escribir = (archivo, datos, intentos = 6) => {
  for (let i = 1; ; i++) {
    try {
      fs.writeFileSync(archivo, datos);
      return;
    } catch (e) {
      if (i >= intentos || !["UNKNOWN", "EBUSY", "EPERM"].includes(e.code)) throw e;
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 250 * i);
    }
  }
};

const render = (svg, archivo, opts = {}) => {
  const r = new Resvg(svg, { fitTo: { mode: "width", value: 1024 }, background: "#FFFFFF", ...opts });
  escribir(archivo, r.render().asPng());
  return fs.statSync(archivo).size;
};

const rel = (archivo) => path.relative(process.cwd(), archivo);

module.exports = { DIR, SVG, REEMPLAZA, ESTADOS, leerSvg, setVisible, svgDeEstado, render, rel };
