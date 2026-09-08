// ---------------------------------------------------------------
// `server-only` FUERA DE NEXT
//
// Los módulos de servidor del LMS empiezan con `import "server-only"`.
// Ese paquete lo provee Next durante el build y no existe como módulo
// de verdad, así que cualquier script que importe uno de ellos revienta
// con MODULE_NOT_FOUND antes de ejecutar una línea.
//
// Esto lo resuelve a un objeto vacío, que es exactamente lo que hace en
// el servidor: la protección de `server-only` es de BUILD —rompe el
// empaquetado si un componente de cliente lo importa— y en un script de
// Node no hay bundle del que protegerse.
//
// Se usa así:
//
//   npx tsx --require ./scripts/sin-server-only.cjs scripts/loquesea.ts
//
// Y NO se toca `lib/`. La alternativa era quitarle el `server-only` al
// traductor para poder importarlo desde aquí, y eso es cambiar una
// protección real del navegador por la comodidad de un script.
// ---------------------------------------------------------------

const Module = require("module");
const path = require("path");

const VACIO = path.join(__dirname, "server-only-vacio.cjs");

const original = Module._resolveFilename;
Module._resolveFilename = function (peticion, ...resto) {
  if (peticion === "server-only") return VACIO;
  return original.call(this, peticion, ...resto);
};
