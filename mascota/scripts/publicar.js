// Copia las piezas de la mascota a public/mascota/, optimizadas.
//   npm run mascota:publicar
//
// Cada PNG de _archivo/piezas/ y _archivo/expresiones/ (sin los .orig) sale con
// el mismo nombre, a 600px de ancho como mucho y en PNG con paleta
// (cuantizado, como pngquant), que es lo que deja un archivo de 40–90 KB
// donde el original pesa 300. El componente los carga de /mascota/<nombre>.png.
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

// Las piezas del enfoque anterior, ya archivadas en mascota/_archivo/.
const RIVE = path.join(__dirname, "..", "_archivo");
const DESTINO = path.join(__dirname, "..", "..", "public", "mascota");
const ANCHO_MAXIMO = 600;

async function main() {
  fs.mkdirSync(DESTINO, { recursive: true });
  let totalOrigen = 0;
  let totalSalida = 0;
  let n = 0;

  for (const carpeta of ["piezas", "expresiones"]) {
    const archivos = fs
      .readdirSync(path.join(RIVE, carpeta))
      .filter((f) => f.endsWith(".png") && !f.endsWith(".orig.png"))
      .sort();
    for (const archivo of archivos) {
      const origen = path.join(RIVE, carpeta, archivo);
      const salida = path.join(DESTINO, archivo);
      const meta = await sharp(origen).metadata();
      const ancho = Math.min(ANCHO_MAXIMO, meta.width ?? ANCHO_MAXIMO);
      await sharp(origen)
        .resize({ width: ancho, withoutEnlargement: true })
        .png({ palette: true, quality: 85, compressionLevel: 9 })
        .toFile(salida);
      const antes = fs.statSync(origen).size;
      const despues = fs.statSync(salida).size;
      totalOrigen += antes;
      totalSalida += despues;
      n++;
      console.log(`  ${archivo.padEnd(22)} ${String(meta.width).padStart(5)}→${String(ancho).padStart(4)}px  ${(antes / 1024).toFixed(0).padStart(4)}→${(despues / 1024).toFixed(0).padStart(3)} KB`);
    }
  }
  console.log(`\n${n} piezas en public/mascota: ${(totalOrigen / 1024 / 1024).toFixed(1)} MB → ${(totalSalida / 1024).toFixed(0)} KB`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
