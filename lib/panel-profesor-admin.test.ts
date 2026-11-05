import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// LA PESTAÑA «ACCESO PROFESORES» Y SUS ACCIONES. La base es un doble que
// apunta las escrituras en orden; Gestión y el correo, también.

type Escritura = { tabla: string; op: string; valores: Record<string, unknown>; filtros: Record<string, unknown> };

const doble = vi.hoisted(() => ({
  escrituras: [] as Escritura[],
  accesos: [] as Record<string, unknown>[],
  profesor: null as null | { teacherId: string; profesor: string; email: string; archivado: boolean; esPrueba: boolean },
  fallaGestion: false,
  errorEscritura: null as null | { message: string; code?: string },
  errorRevocar: false,
  invitaciones: [] as { email: string; nombre: string }[],
  invitacionSale: true,
  admin: true,
}));

vi.mock("@/lib/gestion", () => ({
  leerProfesorDeGestion: async () => {
    if (doble.fallaGestion) throw new Error("caída");
    return doble.profesor;
  },
  leerProfesoresDeGestion: async () => (doble.profesor ? [doble.profesor] : []),
  contarAlumnosPorProfesor: async () => new Map(),
}));

vi.mock("@/lib/correo", () => ({
  enviarInvitacionProfesor: async (email: string, nombre: string) => {
    doble.invitaciones.push({ email, nombre });
    return doble.invitacionSale;
  },
}));

vi.mock("@/lib/sesiones-lms", () => ({
  revocarSesionesDeProfesor: async (id: string) => {
    doble.escrituras.push({ tabla: "sesiones", op: "revocar", valores: {}, filtros: { teacher_id: id } });
    return !doble.errorRevocar;
  },
}));

vi.mock("@/lib/supabase-lms", () => ({
  baseLms: () => ({
    from: (tabla: string) => {
      let actual: Escritura | null = null;
      const filtros: Record<string, unknown> = {};
      const b: Record<string, unknown> = {
        select: () => b,
        upsert: (v: Record<string, unknown>) => ((actual = { tabla, op: "upsert", valores: v, filtros }), b),
        update: (v: Record<string, unknown>) => ((actual = { tabla, op: "update", valores: v, filtros }), b),
        eq: (c: string, v: unknown) => ((filtros[c] = v), b),
        limit: () => b,
        returns: () => b,
        then: (ok: (r: unknown) => unknown, ko: (e: unknown) => unknown) => {
          if (actual) {
            doble.escrituras.push(actual);
            return Promise.resolve({ error: doble.errorEscritura }).then(ok, ko);
          }
          return Promise.resolve({ data: doble.accesos, error: null }).then(ok, ko);
        },
      };
      return b;
    },
  }),
}));

vi.mock("next/cache", () => ({ revalidatePath: () => {} }));
vi.mock("@/lib/sesion-servidor", () => ({
  exigirAdministrador: async () => {
    if (!doble.admin) throw new Error("REDIRECT:/acceso");
    return { rol: "admin", email: "equipo@drcacademy.com", alumnoId: null, sesionId: "x" };
  },
}));

import { activarAcceso, aprobarEmail, cargarPestanaProfesores, desactivarAcceso, invitarProfesor } from "@/lib/panel-profesor-admin";
import { activarProfesor, aprobarEmailProfesor, desactivarProfesor, invitarAlProfesor } from "@/app/acciones-profesores";

const POR = "equipo@drcacademy.com";

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  doble.escrituras = [];
  doble.accesos = [];
  doble.invitaciones = [];
  doble.invitacionSale = true;
  doble.fallaGestion = false;
  doble.errorEscritura = null;
  doble.errorRevocar = false;
  doble.admin = true;
  doble.profesor = { teacherId: "t1", profesor: "Sebastian (test)", email: "seba@drcacademy.com", archivado: false, esPrueba: true };
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe("activarAcceso", () => {
  it("guarda la copia del email que dice Gestión ahora, y quién lo hizo", async () => {
    await expect(activarAcceso("t1", POR)).resolves.toEqual({ ok: true });
    expect(doble.escrituras[0]).toMatchObject({
      tabla: "profesores_acceso",
      op: "upsert",
      valores: { teacher_id: "t1", email_normalizado: "seba@drcacademy.com", activo: true, activado_por: POR },
    });
  });

  it("no activa a un archivado, a uno sin email válido ni si Gestión falla", async () => {
    doble.profesor = { ...doble.profesor!, archivado: true };
    expect((await activarAcceso("t1", POR)).ok).toBe(false);
    doble.profesor = { ...doble.profesor, archivado: false, email: "no-es-email" };
    expect((await activarAcceso("t1", POR)).ok).toBe(false);
    doble.fallaGestion = true;
    expect((await activarAcceso("t1", POR)).ok).toBe(false);
    expect(doble.escrituras).toEqual([]);
  });

  it("si otro profesor activo ya entra con ese email, lo dice", async () => {
    doble.errorEscritura = { message: "duplicate", code: "23505" };
    const r = await activarAcceso("t1", POR);
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/otro profesor/i);
  });
});

describe("desactivarAcceso", () => {
  it("primero quita el acceso y después revoca todas sus sesiones", async () => {
    await expect(desactivarAcceso("t1", POR)).resolves.toEqual({ ok: true });
    expect(doble.escrituras.map((e) => [e.tabla, e.op])).toEqual([
      ["profesores_acceso", "update"],
      ["sesiones", "revocar"],
    ]);
    expect(doble.escrituras[0].valores).toMatchObject({ activo: false, desactivado_por: POR });
  });

  it("si revocar falla, lo dice: el acceso ya está quitado", async () => {
    doble.errorRevocar = true;
    const r = await desactivarAcceso("t1", POR);
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/ya no puede entrar/i);
  });
});

describe("aprobarEmail", () => {
  it("copia la dirección de Gestión, anota quién revisó y cierra las sesiones anteriores", async () => {
    doble.profesor = { ...doble.profesor!, email: "nueva@drcacademy.com" };
    await expect(aprobarEmail("t1", POR)).resolves.toEqual({ ok: true });
    expect(doble.escrituras[0].valores).toMatchObject({ email_normalizado: "nueva@drcacademy.com", email_revisado_por: POR });
    expect(doble.escrituras[1]).toMatchObject({ tabla: "sesiones", op: "revocar" });
  });
});

describe("invitarProfesor", () => {
  it("solo a quien puede entrar, y a la copia aprobada", async () => {
    doble.accesos = [{ email_normalizado: "seba@drcacademy.com", activo: true }];
    await expect(invitarProfesor("t1", POR)).resolves.toEqual({ ok: true });
    expect(doble.invitaciones).toEqual([{ email: "seba@drcacademy.com", nombre: "Sebastian" }]);
    expect(doble.escrituras[0].valores).toMatchObject({ invitado_por: POR });
  });

  it("sin acceso activado no se manda nada", async () => {
    expect((await invitarProfesor("t1", POR)).ok).toBe(false);
    doble.accesos = [{ email_normalizado: "seba@drcacademy.com", activo: false }];
    expect((await invitarProfesor("t1", POR)).ok).toBe(false);
    expect(doble.invitaciones).toEqual([]);
  });

  it("bloqueado por email no se manda nada: ni a la copia ni a la dirección nueva", async () => {
    doble.accesos = [{ email_normalizado: "seba@drcacademy.com", activo: true }];
    doble.profesor = { ...doble.profesor!, email: "intruso@ejemplo.com" };
    expect((await invitarProfesor("t1", POR)).ok).toBe(false);
    expect(doble.invitaciones).toEqual([]);
  });

  it("si el correo no sale, no se anota como invitado", async () => {
    doble.accesos = [{ email_normalizado: "seba@drcacademy.com", activo: true }];
    doble.invitacionSale = false;
    expect((await invitarProfesor("t1", POR)).ok).toBe(false);
    expect(doble.escrituras).toEqual([]);
  });
});

describe("cargarPestanaProfesores", () => {
  it("marca el bloqueo por email", async () => {
    doble.accesos = [{ teacher_id: "t1", email_normalizado: "vieja@drcacademy.com", activo: true, invitado_en: null }];
    const filas = await cargarPestanaProfesores();
    expect(filas?.[0]).toMatchObject({ situacion: "bloqueado_email", emailAprobado: "vieja@drcacademy.com", email: "seba@drcacademy.com", esPrueba: true });
  });
});

describe("las acciones", () => {
  const ACCIONES = [activarProfesor, desactivarProfesor, aprobarEmailProfesor, invitarAlProfesor];

  it("sin ser admin no hacen nada", async () => {
    doble.admin = false;
    for (const accion of ACCIONES) await expect(accion("t1")).rejects.toThrow("REDIRECT");
    expect(doble.escrituras).toEqual([]);
    expect(doble.invitaciones).toEqual([]);
  });

  it("quién actúa sale de la cookie", async () => {
    await activarProfesor("t1");
    expect(doble.escrituras[0].valores.activado_por).toBe(POR);
  });

  it("un id sin forma no llega a ningún sitio", async () => {
    for (const accion of ACCIONES) {
      for (const raro of [undefined, null, 5, "", "   ", "x".repeat(201)]) {
        expect((await accion(raro)).ok).toBe(false);
      }
    }
    expect(doble.escrituras).toEqual([]);
  });
});
