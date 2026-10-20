import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Los accesos (`lib/sesiones-lms.ts`): cuándo una petición es una visita
// nueva. La base es un doble que apunta cada consulta y responde lo que
// diga `responder`; el segundo plano se recoge en `pendientes` para
// poder esperarlo.

type Llamada = {
  tabla: string;
  op: "select" | "insert" | "update" | "";
  valores: unknown;
  filtros: [string, string, unknown][];
};

const doble = vi.hoisted(() => ({
  llamadas: [] as Llamada[],
  pendientes: [] as Promise<unknown>[],
  responder: (() => ({ data: [], error: null })) as (l: Llamada) => { data: unknown; error: unknown },
}));

vi.mock("react", async (original) => ({ ...(await original<object>()), cache: <T>(f: T) => f }));

vi.mock("@/lib/segundo-plano", () => ({
  enSegundoPlano: (_etiqueta: string, tarea: () => Promise<unknown>) => {
    doble.pendientes.push(tarea());
  },
}));

vi.mock("@/lib/supabase-lms", () => {
  function desde(tabla: string) {
    const l: Llamada = { tabla, op: "", valores: null, filtros: [] };
    const filtro = (tipo: string) => (columna: string, valor: unknown) => {
      l.filtros.push([tipo, columna, valor]);
      return b;
    };
    const b: Record<string, unknown> = {
      insert: (v: unknown) => ((l.op = "insert"), (l.valores = v), b),
      update: (v: unknown) => ((l.op = "update"), (l.valores = v), b),
      select: () => ((l.op ||= "select"), b),
      eq: filtro("eq"),
      neq: filtro("neq"),
      lt: filtro("lt"),
      gte: filtro("gte"),
      is: filtro("is"),
      limit: () => b,
      returns: () => b,
      then: (ok: (r: unknown) => unknown, ko: (e: unknown) => unknown) => {
        doble.llamadas.push(l);
        return Promise.resolve(doble.responder(l)).then(ok, ko);
      },
    };
    return b;
  }
  return { baseLms: () => ({ from: desde }) };
});

const SESION = "11111111-2222-4333-8444-555555555555";
const T0 = new Date("2026-10-20T10:00:00Z").getTime();
const MIN = 60 * 1000;

const viva = { data: [{ id: SESION, revocada_en: null, expira_en: "2026-11-19T10:00:00Z" }], error: null };

async function esperarSegundoPlano() {
  while (doble.pendientes.length) await doble.pendientes.shift();
}

const accesos = () => doble.llamadas.filter((l) => l.tabla === "accesos");
const condicionado = (l: Llamada) => l.op === "update" && l.filtros.some(([t]) => t === "lt");

beforeEach(() => {
  vi.resetModules();
  vi.useFakeTimers();
  vi.setSystemTime(T0);
  doble.llamadas.length = 0;
  doble.pendientes.length = 0;
});

afterEach(() => {
  vi.useRealTimers();
});

describe("entrar", () => {
  it("entrar es una visita", async () => {
    doble.responder = (l) => (l.op === "insert" && l.tabla === "sesiones" ? { data: [{ id: SESION }], error: null } : { data: [], error: null });
    const { crearSesion } = await import("@/lib/sesiones-lms");
    await crearSesion({ rol: "alumno", alumnoId: "s_1", emailAdmin: null, origen: "magic_link", expiraEn: new Date(T0 + 30 * 24 * 60 * MIN) });
    await esperarSegundoPlano();
    expect(accesos()).toHaveLength(1);
    expect(accesos()[0].valores).toEqual({ alumno_id: "s_1", iniciado_en: new Date(T0).toISOString() });
  });

  it("entrar con otra sesión suya activa hace menos de 30 min no es visita nueva", async () => {
    doble.responder = (l) =>
      l.tabla === "sesiones" && l.op === "insert"
        ? { data: [{ id: SESION }], error: null }
        : l.tabla === "sesiones" && l.op === "select"
          ? { data: [{ id: "otra" }], error: null }
          : { data: [], error: null };
    const { crearSesion } = await import("@/lib/sesiones-lms");
    await crearSesion({ rol: "alumno", alumnoId: "s_1", emailAdmin: null, origen: "woocommerce", expiraEn: new Date(T0 + MIN) });
    await esperarSegundoPlano();
    expect(accesos()).toHaveLength(0);
    const mirada = doble.llamadas.find((l) => l.tabla === "sesiones" && l.op === "select")!;
    expect(mirada.filtros).toContainEqual(["gte", "ultimo_uso_en", new Date(T0 - 30 * MIN).toISOString()]);
    expect(mirada.filtros).toContainEqual(["neq", "id", SESION]);
  });

  it("el equipo y el script de demo no apuntan visitas", async () => {
    doble.responder = (l) => (l.op === "insert" ? { data: [{ id: SESION }], error: null } : { data: [], error: null });
    const { crearSesion } = await import("@/lib/sesiones-lms");
    await crearSesion({ rol: "admin", alumnoId: null, emailAdmin: "e@drc.com", origen: "magic_link", expiraEn: new Date(T0 + MIN) });
    await crearSesion({ rol: "alumno", alumnoId: "demo-x", emailAdmin: null, origen: "magic_link", expiraEn: new Date(T0 + MIN), en: new Date(T0 - 99 * MIN) });
    await esperarSegundoPlano();
    expect(accesos()).toHaveLength(0);
  });
});

describe("volver con la sesión abierta", () => {
  it("una instancia que no conoce la sesión pregunta a la base, y con hueco apunta la visita", async () => {
    doble.responder = (l) =>
      l.op === "select" && l.tabla === "sesiones" && !l.filtros.some(([t]) => t === "neq")
        ? viva
        : condicionado(l)
          ? { data: [{ rol: "alumno", alumno_id: "s_1" }], error: null }
          : { data: [], error: null };
    const { sesionViva } = await import("@/lib/sesiones-lms");
    expect(await sesionViva(SESION)).toBe(true);
    await esperarSegundoPlano();
    const cond = doble.llamadas.find(condicionado)!;
    expect(cond.filtros).toContainEqual(["lt", "ultimo_uso_en", new Date(T0 - 30 * MIN).toISOString()]);
    expect(accesos()).toHaveLength(1);
  });

  it("sin hueco solo refresca, sin visita", async () => {
    doble.responder = (l) =>
      l.op === "select" && l.tabla === "sesiones" ? viva : { data: [], error: null };
    const { sesionViva } = await import("@/lib/sesiones-lms");
    await sesionViva(SESION);
    await esperarSegundoPlano();
    const updates = doble.llamadas.filter((l) => l.op === "update");
    expect(updates).toHaveLength(2); // el condicionado que no casa y el refresco
    expect(condicionado(updates[1])).toBe(false);
    expect(accesos()).toHaveLength(0);
  });

  it("el freno de 5 min no escribe, y con la sesión tocada hace menos de 30 min no pregunta por hueco", async () => {
    doble.responder = (l) =>
      l.op === "select" && l.tabla === "sesiones" ? viva : { data: [], error: null };
    const { sesionViva } = await import("@/lib/sesiones-lms");
    await sesionViva(SESION); // T0: condicionado + refresco
    await esperarSegundoPlano();
    doble.llamadas.length = 0;

    vi.setSystemTime(T0 + 3 * MIN); // dentro del freno: nada
    await sesionViva(SESION);
    await esperarSegundoPlano();
    expect(doble.llamadas.filter((l) => l.op === "update")).toHaveLength(0);

    vi.setSystemTime(T0 + 20 * MIN); // fuera del freno, dentro de 30: refresco simple
    await sesionViva(SESION);
    await esperarSegundoPlano();
    let updates = doble.llamadas.filter((l) => l.op === "update");
    expect(updates).toHaveLength(1);
    expect(condicionado(updates[0])).toBe(false);
    doble.llamadas.length = 0;

    vi.setSystemTime(T0 + 55 * MIN); // 35 min desde el último toque: se pregunta
    await sesionViva(SESION);
    await esperarSegundoPlano();
    updates = doble.llamadas.filter((l) => l.op === "update");
    expect(condicionado(updates[0])).toBe(true);
  });
});
