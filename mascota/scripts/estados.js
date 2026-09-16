// Genera un preview_<estado>.png por cada estado de ESTADOS (y refresca preview.png con la base).
// Uso: npm run mascota:previews
const path = require("path");
const { DIR, ESTADOS, leerSvg, svgDeEstado, render, rel } = require("./lib");

const src = leerSvg();
for (const [estado, piezas] of Object.entries(ESTADOS)) {
  const salida = path.join(DIR, `preview_${estado}.png`);
  render(svgDeEstado(src, piezas), salida);
  console.log(`${rel(salida)}  ←  ${piezas.length ? piezas.join(", ") : "sólo base"}`);
}
const base = path.join(DIR, "preview.png");
render(src, base);
console.log(`${rel(base)}  ←  base (refrescado)`);
