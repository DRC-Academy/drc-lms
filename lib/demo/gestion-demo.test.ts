import { beforeAll, describe, expect, it, vi } from "vitest";
import { EMAIL_DEMO, ID_DEMO, clasesFechadas, escenarioDemo } from "@/lib/demo/escenario";

// `cache` de React solo existe en el runtime de servidor de Next.
vi.mock("react", async (original) => ({ ...(await original<object>()), cache: (fn: unknown) => fn }));

// La prueba de fuego: con una cuenta demo, Gestión no se consulta nunca.
// Cualquier lectura de las suyas revienta aquí.
vi.mock("@/lib/supabase-server", () => ({
  soloLectura: (vista: string) => {
    throw new Error(`Se consultó Gestión (${vista}) para una cuenta demo`);
  },
}));

const ANCLA = "2026-09-25";
const reloj = { ahora: new Date(`${ANCLA}T12:00:00Z`) };

vi.mock("@/lib/demo/cuenta", () => ({
  escenarioDe: async (id: string) => (id === ID_DEMO ? escenarioDemo(ANCLA, reloj.ahora) : null),
  escenarioPorEmail: async (email: string) => (email === EMAIL_DEMO ? escenarioDemo(ANCLA, reloj.ahora) : null),
  esIdDemo: (id: string) => id.startsWith("demo-"),
}));

let gestion: typeof import("@/lib/gestion");
beforeAll(async () => {
  gestion = await import("@/lib/gestion");
});

describe("lib/gestion con la cuenta demo", () => {
  it("resuelve perfil, clases y calendario sin tocar Gestión", async () => {
    const perfil = await gestion.obtenerPerfil(ID_DEMO);
    expect(perfil?.nombre).toBe("Diego Ruiz");
    expect(perfil?.nivelProfesor).toBe("B1");
    expect(perfil?.horasSemanales).toBe(2);

    const ultima = await gestion.obtenerUltimaClase(ID_DEMO);
    const fechadas = clasesFechadas(ANCLA);
    expect(ultima?.fechaClase).toBe(fechadas[fechadas.length - 1].fecha);
    expect(ultima?.guiaProxima?.priority).toBeTruthy();

    const recorrido = await gestion.obtenerRecorrido(ID_DEMO);
    expect(recorrido.clases.length).toBe(fechadas.length);
    expect(recorrido.clasesContadas).toBe(fechadas.length);
    expect(await gestion.obtenerClasesContadas(ID_DEMO)).toBe(fechadas.length);

    const historial = await gestion.historialDeClases(ID_DEMO);
    expect(gestion.anterioresA(historial, ultima?.analizadoEn ?? null, reloj.ahora).length).toBe(4);
    // Recorrido y cifra de clases: las 24.
    expect(recorrido.todas.length).toBe(24);

    expect((await gestion.obtenerCalendario(ID_DEMO)).length).toBe(2);
    expect(await gestion.obtenerQuitas(ID_DEMO)).toEqual([]);
    expect((await gestion.buscarAlumnoPorEmail(EMAIL_DEMO))?.alumnoId).toBe(ID_DEMO);
  });

  it("el reloj esconde las clases que todavía no han ocurrido", async () => {
    const fechadas = clasesFechadas(ANCLA);
    reloj.ahora = new Date(fechadas[5].analizadaEn.getTime() + 20 * 3_600_000);
    const ultima = await gestion.obtenerUltimaClase(ID_DEMO);
    expect(ultima?.fechaClase).toBe(fechadas[5].fecha);
    reloj.ahora = new Date(`${ANCLA}T12:00:00Z`);
  });
});
