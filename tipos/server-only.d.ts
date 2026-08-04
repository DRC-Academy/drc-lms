// Next.js resuelve el especificador "server-only" a su copia compilada
// (node_modules/next/dist/compiled/server-only) mediante un alias de webpack,
// así que el import funciona en tiempo de compilación sin instalar el paquete.
// TypeScript no conoce ese alias, y esta declaración es lo único que necesita
// para no marcar el módulo como inexistente. Así evitamos sumar una dependencia
// solo para satisfacer al type-checker.
declare module "server-only";
