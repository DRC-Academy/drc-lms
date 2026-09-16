// Renderiza geckonoid.svg tal cual está en el archivo (sólo las piezas base) a preview.png.
// Uso: node mascota/scripts/render.js
const path = require("path");
const { DIR, leerSvg, render, rel } = require("./lib");

const salida = path.join(DIR, "preview.png");
const bytes = render(leerSvg(), salida);
console.log(`${rel(salida)}: ${bytes} bytes`);
