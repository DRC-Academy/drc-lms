// Arma mascota/grilla.png: los 7 previews en fila con el nombre del estado debajo.
// Usa los preview_<estado>.png ya generados (npm run mascota:previews).
// Uso: npm run mascota:grilla
const fs = require("fs");
const path = require("path");
const { DIR, ESTADOS, render, rel } = require("./lib");

const LADO = 300; // tamaño de cada preview en la grilla
const MARGEN = 12;
const ALTO_ROTULO = 44;
const CELDA = LADO + MARGEN * 2;

const estados = Object.keys(ESTADOS);
const faltan = estados.filter((e) => !fs.existsSync(path.join(DIR, `preview_${e}.png`)));
if (faltan.length) {
  console.error(`faltan previews (${faltan.join(", ")}); corré primero: npm run mascota:previews`);
  process.exit(1);
}

const celdas = estados.map((estado, i) => {
  const png = fs.readFileSync(path.join(DIR, `preview_${estado}.png`)).toString("base64");
  const x = i * CELDA;
  return `<image x="${x + MARGEN}" y="${MARGEN}" width="${LADO}" height="${LADO}" href="data:image/png;base64,${png}"/>
  <text x="${x + CELDA / 2}" y="${MARGEN + LADO + 30}" text-anchor="middle" font-family="Segoe UI, Arial, Helvetica, sans-serif" font-size="22" fill="#1E5E2E">${estado}</text>`;
});

const ancho = CELDA * estados.length;
const alto = MARGEN + LADO + ALTO_ROTULO;
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${ancho}" height="${alto}" viewBox="0 0 ${ancho} ${alto}">
  <rect width="${ancho}" height="${alto}" fill="#FFFFFF"/>
  ${celdas.join("\n  ")}
</svg>`;

const salida = path.join(DIR, "grilla.png");
const bytes = render(svg, salida, {
  fitTo: { mode: "original" },
  font: { loadSystemFonts: true, defaultFontFamily: "Arial" },
});
console.log(`${rel(salida)}: ${ancho}×${alto}, ${bytes} bytes (${estados.join(", ")})`);
