// ---------------------------------------------------------------
// `cache` DE REACT FUERA DE NEXT
//
// `lib/gestion.ts` y otros módulos de servidor envuelven sus lecturas en
// `cache()` de React, que deduplica dentro de una petición. Esa función
// la da el runtime de servidor de Next; en el React estable que resuelve
// Node no existe, y cualquier script que importe esos módulos revienta
// con `import_react.cache is not a function`.
//
// Fuera de una petición no hay nada que deduplicar, así que aquí `cache`
// es la función tal cual. Va junto a `sin-server-only.cjs`:
//
//   npx tsx --require ./scripts/sin-server-only.cjs --require ./scripts/sin-cache-react.cjs scripts/loquesea.ts
// ---------------------------------------------------------------

const react = require("react");
if (typeof react.cache !== "function") react.cache = (fn) => fn;
