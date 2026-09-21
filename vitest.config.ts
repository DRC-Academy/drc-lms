import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

// `@/…` es el alias de tsconfig, y `server-only` es un módulo que lanza
// al importarse fuera de un Server Component: en los tests se sustituye
// por un módulo vacío, que es lo que hace Next en el servidor.
export default defineConfig({
  resolve: {
    alias: {
      "@": resolve(__dirname),
      "server-only": resolve(__dirname, "tests/server-only.ts"),
    },
  },
  test: {
    include: ["**/*.test.ts"],
    exclude: ["node_modules/**", ".next/**"],
  },
});
