import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// EL GUARD DEL PANEL DE PROFESORES.
//
// Lo único falso son las bases: `mundo` hace de Gestión y del LMS, y las
// lecturas de verdad (`lib/gestion.ts`, `lib/sesiones-lms.ts`) corren
// contra él. Por eso estos tests también demuestran que no hay caché: se
// cambia `mundo` entre dos peticiones y la segunda ya lo ve.

type Fila = Record<string, unknown>;

const mundo = vi.hoisted(() => ({
  cookieProfesor: undefined as string | undefined,
  sesionAdminOAlumno: null as unknown,
  vistaAlumnos: [] as Record<string, unknown>[],
  vistaProfesores: [] as Record<string, unknown>[],
  profesoresAcceso: [] as Record<string, unknown>[],
  sesiones: [] as Record<string, unknown>[],
  falla: new Set<string>(),
  lecturas: {} as Record<string, number>,
  columnas: {} as Record<string, string[]>,
}));

function consulta(tabla: string, origen: () => Fila[]) {
  const filtros: ((f: Fila) => boolean)[] = [];
  const b: Record<string, unknown> = {
    select: (columnas: string) => {
      (mundo.columnas[tabla] ??= []).push(columnas);
      return b;
    },
    eq: (c: string, v: unknown) => (filtros.push((f) => f[c] === v), b),
    in: (c: string, v: unknown[]) => (filtros.push((f) => v.includes(f[c])), b),
    is: (c: string, v: unknown) => (filtros.push((f) => f[c] === v), b),
    order: () => b,
    limit: () => b,
    range: () => b,
    returns: () => b,
    then: (ok: (r: unknown) => unknown, ko: (e: unknown) => unknown) => {
      mundo.lecturas[tabla] = (mundo.lecturas[tabla] ?? 0) + 1;
      const r = mundo.falla.has(tabla)
        ? { data: null, error: { message: `${tabla} caída` } }
        : { data: origen().filter((f) => filtros.every((p) => p(f))), error: null };
      return Promise.resolve(r).then(ok, ko);
    },
  };
  return b;
}

vi.mock("react", async (original) => ({ ...(await original<object>()), cache: (fn: unknown) => fn }));
vi.mock("next/headers", () => ({
  cookies: () => ({ get: (n: string) => (n === "drc_profesor" && mundo.cookieProfesor ? { value: mundo.cookieProfesor } : undefined) }),
  headers: () => new Headers(),
}));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
  notFound: () => {
    throw new Error("NOT_FOUND");
  },
}));
vi.mock("@/lib/sesion-servidor", () => ({ sesionActual: async () => mundo.sesionAdminOAlumno }));
vi.mock("@/lib/segundo-plano", () => ({ enSegundoPlano: () => {} }));
vi.mock("@/lib/demo/cuenta", () => ({ escenarioDe: async () => null, escenarioPorEmail: async () => null, esIdDemo: () => false }));
vi.mock("@/lib/supabase-server", () => ({
  soloLectura: (vista: string) =>
    consulta(vista, () => (vista === "vista_alumnos_profesor" ? mundo.vistaAlumnos : mundo.vistaProfesores)),
}));
vi.mock("@/lib/supabase-lms", () => ({
  baseLms: () => ({
    from: (tabla: string) =>
      consulta(tabla, () => (tabla === "profesores_acceso" ? mundo.profesoresAcceso : mundo.sesiones)),
  }),
}));

import { crearCookieProfesor } from "@/lib/sesion";
import {
  alumnosDelProfesor,
  exigirAlumnoDelProfesor,
  exigirProfesor,
  profesorParaEntrar,
  rutaDelPanel,
  type ProfesorAutorizado,
} from "@/lib/panel-profesor";

const SESION_A = "11111111-1111-4111-8111-111111111111";
const SESION_B = "22222222-2222-4222-8222-222222222222";
const EMAIL_A = "ana@drcacademy.com";
const EMAIL_B = "beto@drcacademy.com";

const alumno = (teacher_id: string, alumno_id: string, nombre: string) => ({
  teacher_id,
  alumno_id,
  nombre,
  nivel: "B1",
  nivel_profesor: null,
  nivel_ficha: null,
  nivel_prueba: null,
  foco_recomendado: null,
  fecha_inicio: "2026-09-01",
  examen: null,
});

const entrarComoA = async () => {
  mundo.cookieProfesor = await crearCookieProfesor({ email: EMAIL_A, teacherId: "tA" }, SESION_A);
};

beforeEach(async () => {
  vi.stubEnv("SECRETO_SESION", "x".repeat(40));
  vi.spyOn(console, "error").mockImplementation(() => {});
  mundo.sesionAdminOAlumno = null;
  mundo.falla.clear();
  mundo.lecturas = {};
  mundo.columnas = {};
  mundo.vistaAlumnos = [alumno("tA", "a1", "Alumna de A"), alumno("tA", "a2", "Otra de A"), alumno("tB", "b1", "Alumno de B")];
  mundo.vistaProfesores = [
    { teacher_id: "tA", profesor: "AnaG", email: EMAIL_A, archivado: false, es_prueba: false },
    { teacher_id: "tB", profesor: "Beto", email: EMAIL_B, archivado: false, es_prueba: false },
  ];
  mundo.profesoresAcceso = [
    { teacher_id: "tA", email_normalizado: EMAIL_A, activo: true },
    { teacher_id: "tB", email_normalizado: EMAIL_B, activo: true },
  ];
  const fila = (id: string, teacher_id: string) => ({
    id,
    rol: "profesor",
    teacher_id,
    revocada_en: null,
    expira_en: new Date(Date.now() + 86_400_000).toISOString(),
    ultimo_uso_en: new Date().toISOString(),
  });
  mundo.sesiones = [fila(SESION_A, "tA"), fila(SESION_B, "tB")];
  await entrarComoA();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

const DENEGADO = "REDIRECT:/acceso?motivo=sesion";

describe("el profesor A y el alumno del profesor B", () => {
  it("A ve a su alumno", async () => {
    const { alumno: a, profesor } = await exigirAlumnoDelProfesor("a1");
    expect(a.nombre).toBe("Alumna de A");
    expect(profesor.teacherId).toBe("tA");
    expect(profesor.comoAdmin).toBe(false);
  });

  it("A NO puede ver al alumno de B cambiando el id: 404", async () => {
    await expect(exigirAlumnoDelProfesor("b1")).rejects.toThrow("NOT_FOUND");
  });

  it("un id inexistente da exactamente la misma respuesta que uno ajeno", async () => {
    const ajeno = await exigirAlumnoDelProfesor("b1").catch((e: Error) => e.message);
    const inexistente = await exigirAlumnoDelProfesor("no-existe").catch((e: Error) => e.message);
    expect(ajeno).toBe("NOT_FOUND");
    expect(inexistente).toBe(ajeno);
  });

  it("un id con forma rara no llega a Gestión", async () => {
    for (const raro of [undefined, null, 7, "", "x".repeat(201), ["a1"]]) {
      await expect(exigirAlumnoDelProfesor(raro)).rejects.toThrow("NOT_FOUND");
    }
    expect(mundo.lecturas.vista_alumnos_profesor ?? 0).toBe(0);
  });

  it("la lista de A solo trae a los suyos", async () => {
    const profesor = await exigirProfesor();
    expect((await alumnosDelProfesor(profesor)).map((a) => a.alumnoId)).toEqual(["a1", "a2"]);
  });

  it("?como= no le sirve a un profesor: se ignora entero", async () => {
    const profesor = await exigirProfesor("tB");
    expect(profesor.teacherId).toBe("tA");
    expect(profesor.comoAdmin).toBe(false);
    await expect(exigirAlumnoDelProfesor("b1", "tB")).rejects.toThrow("NOT_FOUND");
  });
});

describe("cuando la asignación deja de estar activa", () => {
  it("el profesor deja de ver al alumno en la petición siguiente, en lista y por URL", async () => {
    await expect(exigirAlumnoDelProfesor("a1")).resolves.toBeTruthy();

    // La fila sale de `vista_alumnos_profesor`: es lo que hace `status = 'inactive'`.
    mundo.vistaAlumnos = mundo.vistaAlumnos.filter((f) => f.alumno_id !== "a1");

    await expect(exigirAlumnoDelProfesor("a1")).rejects.toThrow("NOT_FOUND");
    const profesor = await exigirProfesor();
    expect((await alumnosDelProfesor(profesor)).map((a) => a.alumnoId)).toEqual(["a2"]);
  });

  it("con un cambio de profesor, el anterior lo pierde y el nuevo lo gana en el mismo instante", async () => {
    // Gestión sobrescribe `teacher_id` en la misma fila.
    mundo.vistaAlumnos = mundo.vistaAlumnos.map((f) => (f.alumno_id === "a1" ? { ...f, teacher_id: "tB" } : f));

    await expect(exigirAlumnoDelProfesor("a1")).rejects.toThrow("NOT_FOUND");

    mundo.cookieProfesor = await crearCookieProfesor({ email: EMAIL_B, teacherId: "tB" }, SESION_B);
    const { alumno: a } = await exigirAlumnoDelProfesor("a1");
    expect(a.teacherId).toBe("tB");
  });

  it("no hay caché: cada petición vuelve a preguntar a Gestión", async () => {
    await exigirAlumnoDelProfesor("a1");
    await exigirAlumnoDelProfesor("a1");
    expect(mundo.lecturas.vista_alumnos_profesor).toBe(2);
    expect(mundo.lecturas.vista_profesores_acceso).toBe(2);
    expect(mundo.lecturas.profesores_acceso).toBe(2);
    expect(mundo.lecturas.sesiones).toBe(2);
  });
});

describe("exigirProfesor: la duda es que no", () => {
  const casos: [string, () => void][] = [
    ["sesión revocada", () => ((mundo.sesiones[0] as Fila).revocada_en = new Date().toISOString())],
    ["sesión caducada en la base", () => ((mundo.sesiones[0] as Fila).expira_en = "2000-01-01T00:00:00Z")],
    ["sesión de otro profesor", () => ((mundo.sesiones[0] as Fila).teacher_id = "tB")],
    ["sesión inexistente", () => (mundo.sesiones = [])],
    ["acceso desactivado", () => ((mundo.profesoresAcceso[0] as Fila).activo = false)],
    ["sin fila de acceso", () => (mundo.profesoresAcceso = mundo.profesoresAcceso.slice(1))],
    ["email cambiado en Gestión", () => ((mundo.vistaProfesores[0] as Fila).email = "intruso@ejemplo.com")],
    ["archivado en Gestión", () => ((mundo.vistaProfesores[0] as Fila).archivado = true)],
    ["desaparecido de Gestión", () => (mundo.vistaProfesores = mundo.vistaProfesores.slice(1))],
    ["copia aprobada distinta de la del sobre", () => {
      (mundo.profesoresAcceso[0] as Fila).email_normalizado = "nueva@drcacademy.com";
      (mundo.vistaProfesores[0] as Fila).email = "nueva@drcacademy.com";
    }],
    ["falla la tabla de sesiones", () => mundo.falla.add("sesiones")],
    ["falla la tabla de accesos", () => mundo.falla.add("profesores_acceso")],
    ["falla la vista de Gestión", () => mundo.falla.add("vista_profesores_acceso")],
  ];

  it.each(casos)("%s: fuera", async (_nombre, preparar) => {
    preparar();
    await expect(exigirProfesor()).rejects.toThrow(DENEGADO);
    await expect(exigirAlumnoDelProfesor("a1")).rejects.toThrow(DENEGADO);
  });

  it("una cookie manipulada no vale", async () => {
    mundo.cookieProfesor = `${mundo.cookieProfesor}x`;
    await expect(exigirProfesor()).rejects.toThrow("REDIRECT:/acceso");
  });

  it("si falla la lectura de alumnos, lanza: un error no parece una lista vacía", async () => {
    const profesor = await exigirProfesor();
    mundo.falla.add("vista_alumnos_profesor");
    await expect(alumnosDelProfesor(profesor)).rejects.toThrow("vista_alumnos_profesor");
    await expect(exigirAlumnoDelProfesor("a1")).rejects.toThrow("vista_alumnos_profesor");
  });
});

describe("exigirProfesor sin cookie de profesor", () => {
  beforeEach(() => {
    mundo.cookieProfesor = undefined;
  });

  it("sin sesión: a entrar", async () => {
    await expect(exigirProfesor()).rejects.toThrow("REDIRECT:/acceso");
  });

  it("un alumno vuelve a lo suyo, también con ?como=", async () => {
    mundo.sesionAdminOAlumno = { rol: "alumno", email: "a@b.es", alumnoId: "s_1", sesionId: "x" };
    await expect(exigirProfesor("tA")).rejects.toThrow("REDIRECT:/alumno/s_1");
    await expect(exigirAlumnoDelProfesor("a1", "tA")).rejects.toThrow("REDIRECT:/alumno/s_1");
  });

  describe("«Ver como», un admin", () => {
    beforeEach(() => {
      mundo.sesionAdminOAlumno = { rol: "admin", email: "e@drc.com", alumnoId: null, sesionId: "x" };
    });

    it("sin ?como= va a su pestaña", async () => {
      await expect(exigirProfesor()).rejects.toThrow("REDIRECT:/accesos-profesores");
    });

    it("ve el panel de ese profesor en modo solo lectura, aunque no tenga acceso activado", async () => {
      mundo.profesoresAcceso = [];
      const profesor = await exigirProfesor("tA");
      expect(profesor).toMatchObject({ teacherId: "tA", comoAdmin: true });
      expect(rutaDelPanel(profesor, "/profesor")).toBe("/profesor?como=tA");
    });

    it("tiene las mismas fronteras: solo los alumnos de ese profesor", async () => {
      await expect(exigirAlumnoDelProfesor("a1", "tA")).resolves.toBeTruthy();
      await expect(exigirAlumnoDelProfesor("b1", "tA")).rejects.toThrow("NOT_FOUND");
    });

    it("un profesor inexistente: 404", async () => {
      await expect(exigirProfesor("nadie")).rejects.toThrow("NOT_FOUND");
    });
  });
});

describe("profesorParaEntrar: la copia aprobada manda", () => {
  it("con la dirección aprobada y sin cambios, entra", async () => {
    await expect(profesorParaEntrar(EMAIL_A)).resolves.toEqual({ email: EMAIL_A, teacherId: "tA" });
  });

  it("quien cambia teachers.email a su dirección no entra", async () => {
    (mundo.vistaProfesores[0] as Fila).email = "intruso@ejemplo.com";
    await expect(profesorParaEntrar("intruso@ejemplo.com")).resolves.toBeNull();
    // Y el dueño de la dirección aprobada tampoco, hasta que un admin lo revise.
    await expect(profesorParaEntrar(EMAIL_A)).resolves.toBeNull();
  });

  it("desactivado, archivado o con un fallo de lectura: null", async () => {
    (mundo.profesoresAcceso[0] as Fila).activo = false;
    await expect(profesorParaEntrar(EMAIL_A)).resolves.toBeNull();

    (mundo.profesoresAcceso[1] as Fila).activo = true;
    (mundo.vistaProfesores[1] as Fila).archivado = true;
    await expect(profesorParaEntrar(EMAIL_B)).resolves.toBeNull();

    mundo.falla.add("profesores_acceso");
    await expect(profesorParaEntrar(EMAIL_B)).resolves.toBeNull();
  });
});

describe("lo que se pide a Gestión", () => {
  it("ninguna columna comercial, de garantía ni de valoraciones", async () => {
    const profesor = await exigirProfesor();
    await alumnosDelProfesor(profesor);
    await exigirAlumnoDelProfesor("a1");

    const pedido = [...mundo.columnas.vista_alumnos_profesor, ...mundo.columnas.vista_profesores_acceso].join(",");
    expect(pedido).not.toContain("*");
    expect(pedido).not.toMatch(/plan|producto|suscrip|pago|importe|precio|garant|valora|estrella|comentario|password|meet/i);
  });
});

describe("el tipo solo lo crea el guard", () => {
  it("no compila pasar un profesor o un alumno fabricado a mano", () => {
    const hecho = { teacherId: "tB", nombre: "B", comoAdmin: false };
    const usar = () => {
      // @ts-expect-error Un objeto cualquiera no es un ProfesorAutorizado.
      void alumnosDelProfesor(hecho);
      // @ts-expect-error Lo mismo con `rutaDelPanel`.
      void rutaDelPanel(hecho, "/profesor");
      const probar: ProfesorAutorizado | null = null;
      return probar;
    };
    expect(typeof usar).toBe("function");
  });
});
