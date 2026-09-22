// Deja los PNG de public/mascota/ (y parches/) listos para servir:
// ancho máximo 800 px y paleta de 256 colores con sharp, que es lo que
// hace pngquant. Se corre después de mascota:base y mascota:parches,
// que escriben PNG en RGBA a 32 bits; esto los deja en un tercio.
//
//   npm run mascota:optimizar
//
// Los huecos y restos (máscaras en escala de grises con alfa) se dejan
// como están: son de 2 KB y una paleta les quitaría suavidad al borde.
//
// ES DETERMINISTA: con la misma entrada, los mismos bytes. La
// cuantización de sharp lo es partiendo de RGBA, pero volver a
// cuantizar un PNG que ya tiene paleta lo cambia un poco cada vez (y
// rehacer sin cambios ensuciaba el diff de base, cola y cuerpo). Así
// que un PNG con paleta —que solo sale de aquí: base.py y parches.py
// escriben RGBA— se deja como está, y lo que sí se optimiza no se
// reescribe si los bytes coinciden con los del disco.
const sharp = require("sharp");
const { readFileSync, readdirSync, statSync, renameSync, unlinkSync } = require("fs");
const path = require("path");

const PUBLICO = path.join(__dirname, "..", "..", "public", "mascota");
const ANCHO_MAXIMO = 800;

async function optimizar(ruta) {
  const antes = statSync(ruta).size;
  const nombre = path.basename(ruta);
  if (/^(hueco|resto)_/.test(nombre)) return { nombre, antes, despues: antes, nota: "máscara, se deja" };

  const imagen = sharp(ruta);
  const { width, isPalette } = await imagen.metadata();
  if (isPalette) return { nombre, antes, despues: antes, nota: "ya optimizado" };
  const temporal = `${ruta}.tmp`;
  await imagen
    .resize({ width: Math.min(width, ANCHO_MAXIMO), withoutEnlargement: true })
    .png({ palette: true, quality: 90, effort: 10, compressionLevel: 9 })
    .toFile(temporal);
  const despues = statSync(temporal).size;
  if (readFileSync(temporal).equals(readFileSync(ruta))) {
    unlinkSync(temporal);
    return { nombre, antes, despues: antes, nota: "igual" };
  }
  if (despues < antes) {
    unlinkSync(ruta);
    renameSync(temporal, ruta);
    return { nombre, antes, despues, nota: width > ANCHO_MAXIMO ? `de ${width} a ${ANCHO_MAXIMO} px` : "" };
  }
  unlinkSync(temporal);
  return { nombre, antes, despues: antes, nota: "ya era menor" };
}

function pngs(carpeta) {
  return readdirSync(carpeta).flatMap((n) => {
    const ruta = path.join(carpeta, n);
    if (statSync(ruta).isDirectory()) return pngs(ruta);
    return n.endsWith(".png") ? [ruta] : [];
  });
}

(async () => {
  let totalAntes = 0;
  let totalDespues = 0;
  for (const ruta of pngs(PUBLICO)) {
    const r = await optimizar(ruta);
    totalAntes += r.antes;
    totalDespues += r.despues;
    const kb = (n) => `${(n / 1024).toFixed(0)} KB`;
    console.log(`  ${path.relative(PUBLICO, ruta).padEnd(34)} ${kb(r.antes).padStart(7)} → ${kb(r.despues).padStart(7)}  ${r.nota}`);
  }
  console.log(`\n${(totalAntes / 1024).toFixed(0)} KB → ${(totalDespues / 1024).toFixed(0)} KB`);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
