import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("react", async (original) => ({ ...(await original<object>()), cache: (fn: unknown) => fn }));

// --- las lecturas, simuladas ---
const filasPase = vi.fn<() => { data: unknown[] | null; error: { message: string } | null }>();
const consultasBase = vi.fn<(tabla: string) => void>();
const rpc = vi.fn<(nombre: string, p: unknown) => Promise<{ data: unknown; error: { message: string } | null }>>();

vi.mock("@/lib/supabase-lms", () => ({
  baseLms: () => ({
    rpc: (n: string, p: unknown) => rpc(n, p),
    from: (tabla: string) => {
      consultasBase(tabla);
      const cadena = {
        select: () => cadena,
        eq: () => cadena,
        order: () => cadena,
        returns: () => Promise.resolve(filasPase()),
      };
      return cadena;
    },
  }),
}));

const perfil = vi.fn<(id: string) => Promise<{ asignacionActiva: boolean } | null>>();
const enEspera = vi.fn<(id: string) => Promise<boolean>>();
vi.mock("@/lib/gestion", () => ({
  obtenerPerfil: (id: string) => perfil(id),
  leerEnEspera: (id: string) => enEspera(id),
}));
vi.mock("@/lib/idioma-servidor", () => ({
  textosActuales: () => ({ pases: { paraTiTexto: "Para ti está disponible" }, impago: { api: "en espera" } }),
}));

import {
  accesoDelAlumno,
  accesoPorAlumno,
  clasesCerradas,
  conInicioBlackPass,
  paraTiCerrado,
  respuestaParaTiCerrado,
} from "@/lib/acceso-alumno";
import { estadoDeAcceso } from "@/lib/estado-acceso";

const manana = () => new Date(Date.now() + 86_400_000).toISOString();
const ayer = () => new Date(Date.now() - 86_400_000).toISOString();

const fila = (alumnoId: string, hasta: string, estado = "activo") => ({
  id: "p1",
  alumno_id: alumnoId,
  email_normalizado: "a@b.c",
  woo_user_id: null,
  nombre: "Ana",
  estado,
  inicio: "2026-11-19T10:00:00Z",
  acceso_hasta: hasta,
});

beforeEach(() => {
  vi.stubEnv("PASES_ACTIVO", "1");
  filasPase.mockReset();
  filasPase.mockReturnValue({ data: [], error: null });
  consultasBase.mockReset();
  perfil.mockReset();
  perfil.mockResolvedValue({ asignacionActiva: true });
  enEspera.mockReset();
  enEspera.mockResolvedValue(false);
  rpc.mockReset();
  rpc.mockResolvedValue({ data: false, error: null });
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("el interruptor apagado", () => {
  beforeEach(() => vi.stubEnv("PASES_ACTIVO", ""));

  it("un alumno de siempre no paga ninguna consulta y sigue igual", async () => {
    const a = await accesoPorAlumno("s_1");
    expect(a).toMatchObject({ origen: "plan", cursos: "plan", paraTi: true, clases: true, diploma: true, tienePase: false });
    expect(consultasBase).not.toHaveBeenCalled();
    expect(perfil).not.toHaveBeenCalled();
    expect(enEspera).not.toHaveBeenCalled();
  });

  it("quien solo tiene pase no entra", async () => {
    filasPase.mockReturnValue({ data: [fila("pase-1", manana())], error: null });
    expect((await accesoPorAlumno("pase-1")).puedeEntrar).toBe(false);
    expect(consultasBase).not.toHaveBeenCalled();
  });

  it("el impago sigue bloqueando como siempre", async () => {
    enEspera.mockResolvedValue(true);
    expect(await estadoDeAcceso({ rol: "alumno", alumnoId: "s_1" })).toBe("impago");
  });

  it("solo «1» lo enciende", async () => {
    vi.stubEnv("PASES_ACTIVO", "0");
    await accesoPorAlumno("s_1");
    vi.stubEnv("PASES_ACTIVO", "true");
    await accesoPorAlumno("s_1");
    expect(consultasBase).not.toHaveBeenCalled();
  });
});

describe("el acceso es la suma", () => {
  it("sin pase: como siempre, sin leer el perfil", async () => {
    expect(await accesoPorAlumno("s_1")).toMatchObject({ origen: "plan", cursos: "plan", sinDrip: false, paraTi: true, clases: true });
    expect(perfil).not.toHaveBeenCalled();
  });

  it("solo pase: todos los cursos sin drip; ni clases, ni Para ti, ni diploma", async () => {
    const hasta = manana();
    filasPase.mockReturnValue({ data: [fila("pase-1", hasta)], error: null });

    const a = await accesoPorAlumno("pase-1");

    expect(a).toMatchObject({
      puedeEntrar: true,
      origen: "pase",
      soloPase: true,
      cursos: "todos",
      sinDrip: true,
      paraTi: false,
      clases: false,
      diploma: false,
    });
    expect(a.hasta?.toISOString()).toBe(new Date(hasta).toISOString());
    // Ni una lectura a Gestión.
    expect(perfil).not.toHaveBeenCalled();
    expect(enEspera).not.toHaveBeenCalled();
  });

  it("plan activo + pase: conserva Para ti y clases, y suma los cursos", async () => {
    filasPase.mockReturnValue({ data: [fila("s_1", manana())], error: null });
    expect(await accesoPorAlumno("s_1")).toMatchObject({
      origen: "plan+pase",
      cursos: "todos",
      sinDrip: true,
      paraTi: true,
      clases: true,
      diploma: true,
      soloPase: false,
    });
  });

  it("acabó el plan y sigue el pase: conserva el curso, sin Para ti", async () => {
    filasPase.mockReturnValue({ data: [fila("s_1", manana())], error: null });
    perfil.mockResolvedValue({ asignacionActiva: false });
    expect(await accesoPorAlumno("s_1")).toMatchObject({ origen: "pase", cursos: "todos", paraTi: false, clases: true });
  });

  it("acabó el pase y sigue el plan: vuelve a su plan, con Para ti", async () => {
    filasPase.mockReturnValue({ data: [fila("s_1", ayer())], error: null });
    expect(await accesoPorAlumno("s_1")).toMatchObject({ origen: "plan", cursos: "plan", sinDrip: false, paraTi: true });
  });

  it("ex-alumno sin pase: queda como hoy, con Para ti", async () => {
    perfil.mockResolvedValue({ asignacionActiva: false });
    expect((await accesoPorAlumno("s_1")).paraTi).toBe(true);
  });

  it("en espera de pago + pase: conserva el curso, sin Para ti ni clases, y se le avisa", async () => {
    filasPase.mockReturnValue({ data: [fila("s_1", manana())], error: null });
    enEspera.mockResolvedValue(true);
    expect(await accesoPorAlumno("s_1")).toMatchObject({ cursos: "todos", paraTi: false, clases: false, avisoPago: true });
    expect(await estadoDeAcceso({ rol: "alumno", alumnoId: "s_1" })).toBe("activo");
  });

  it("en espera de pago sin pase: el bloqueo de siempre", async () => {
    enEspera.mockResolvedValue(true);
    expect(await estadoDeAcceso({ rol: "alumno", alumnoId: "s_1" })).toBe("impago");
  });

  it("con dos pases manda el que llega más lejos, y uno caducado no cuenta", async () => {
    const lejos = manana();
    filasPase.mockReturnValue({ data: [fila("pase-1", lejos), fila("pase-1", ayer())], error: null });
    expect((await accesoPorAlumno("pase-1")).hasta?.toISOString()).toBe(new Date(lejos).toISOString());
  });
});

describe("quién ve el inicio del Black Pass", () => {
  it("solo pase: sí", async () => {
    filasPase.mockReturnValue({ data: [fila("pase-1", manana())], error: null });
    expect(conInicioBlackPass(await accesoPorAlumno("pase-1"))).toBe(true);
  });

  it("ex-alumno con ficha que compra el pase: sí", async () => {
    filasPase.mockReturnValue({ data: [fila("s_1", manana())], error: null });
    perfil.mockResolvedValue({ asignacionActiva: false });
    expect(conInicioBlackPass(await accesoPorAlumno("s_1"))).toBe(true);
  });

  it("plan activo + pase: no, el de siempre", async () => {
    filasPase.mockReturnValue({ data: [fila("s_1", manana())], error: null });
    expect(conInicioBlackPass(await accesoPorAlumno("s_1"))).toBe(false);
  });

  it("plan en espera de pago + pase: no, el de siempre con el aviso", async () => {
    filasPase.mockReturnValue({ data: [fila("s_1", manana())], error: null });
    enEspera.mockResolvedValue(true);
    expect(conInicioBlackPass(await accesoPorAlumno("s_1"))).toBe(false);
  });

  it("sin pase, con o sin plan: no", async () => {
    expect(conInicioBlackPass(await accesoPorAlumno("s_1"))).toBe(false);
    perfil.mockResolvedValue({ asignacionActiva: false });
    expect(conInicioBlackPass(await accesoPorAlumno("s_2"))).toBe(false);
  });
});

describe("la caducidad y el reembolso se notan en la petición siguiente", () => {
  it("solo pase, caducado: fuera", async () => {
    filasPase.mockReturnValue({ data: [fila("pase-1", ayer())], error: null });
    expect(await accesoPorAlumno("pase-1")).toMatchObject({ puedeEntrar: false, origen: "ninguno" });
  });

  it("solo pase, revocado aunque no haya caducado: fuera", async () => {
    filasPase.mockReturnValue({ data: [fila("pase-1", manana(), "revocado")], error: null });
    expect((await accesoPorAlumno("pase-1")).puedeEntrar).toBe(false);
  });

  it("si la base no contesta no se echa a nadie", async () => {
    filasPase.mockReturnValue({ data: null, error: { message: "caída" } });
    expect((await accesoPorAlumno("pase-1")).puedeEntrar).toBe(true);
    expect((await accesoPorAlumno("s_1")).paraTi).toBe(true);
  });
});

describe("quién pregunta", () => {
  it("el equipo, sin límites y sin consultas", async () => {
    expect(await accesoDelAlumno({ rol: "admin", alumnoId: null })).toMatchObject({ origen: "equipo", paraTi: true, clases: true });
    expect(consultasBase).not.toHaveBeenCalled();
  });

  it("sin sesión, nada", async () => {
    expect((await accesoDelAlumno(null)).puedeEntrar).toBe(false);
    expect(await paraTiCerrado(null)).toBe(true);
  });

  it("los dos cierres dicen lo mismo que el acceso", async () => {
    filasPase.mockReturnValue({ data: [fila("pase-1", manana())], error: null });
    const quien = { rol: "alumno" as const, alumnoId: "pase-1" };
    expect(await paraTiCerrado(quien)).toBe(true);
    expect(await clasesCerradas(quien)).toBe(true);
    expect(await paraTiCerrado({ rol: "admin", alumnoId: null })).toBe(false);
  });

  it("el rechazo de la API es un 403 sin lenguaje de error", async () => {
    const r = respuestaParaTiCerrado();
    expect(r.status).toBe(403);
    expect(await r.json()).toEqual({ codigo: "para_ti_cerrado", error: "Para ti está disponible" });
  });
});

// ---------------------------------------------------------------
// NINGUNA RUTA ESQUIVA EL BLOQUEO
//
// Lo que es de Para ti o de clases tiene que pasar por su cierre. Una ruta
// nueva de cualquiera de los dos grupos va en la lista o rompe esto, y las
// que llaman al generador o leen el calendario no pueden quedar fuera.
// ---------------------------------------------------------------

const RAIZ = join(__dirname, "..");
const leer = (ruta: string) => readFileSync(join(RAIZ, ruta), "utf8");

const DE_PARA_TI = [
  "app/api/generar-bloque/route.ts",
  "app/api/traducir-bloque/route.ts",
  "app/api/progreso/route.ts",
  "app/api/migrar-local/route.ts",
];
const PANTALLAS_PARA_TI = ["app/(alumno)/practica/page.tsx", "app/(alumno)/alumno/[id]/[bloqueId]/page.tsx"];
const DE_CLASES = [
  "app/clase/entrar/route.ts",
  "app/clases/cambiar-horario/page.tsx",
  "app/clases/cambiar-profesor/page.tsx",
  "app/acciones-recuperaciones.ts",
  "app/acciones-autoservicio.ts",
  "app/acciones-valoraciones.ts",
];

function archivos(dir: string): string[] {
  return readdirSync(dir).flatMap((nombre) => {
    const ruta = join(dir, nombre);
    return statSync(ruta).isDirectory() ? archivos(ruta) : [ruta];
  });
}

describe("ninguna ruta esquiva el cierre", () => {
  const candidatos = archivos(join(RAIZ, "app"))
    .filter((f) => /\.(ts|tsx)$/.test(f))
    .map((f) => relative(RAIZ, f).split(sep).join("/"))
    .filter((f) => !f.startsWith("app/acceso/prueba") && !f.startsWith("app/dev/") && !f.startsWith("app/api/woo/"));

  it.each(DE_PARA_TI)("%s rechaza a quien no tiene Para ti", (ruta) => {
    expect(leer(ruta)).toMatch(/paraTiCerrado\(sesion\)[\s\S]*respuestaParaTiCerrado\(\)/);
  });

  it.each(PANTALLAS_PARA_TI)("%s lo comprueba también por URL", (ruta) => {
    expect(leer(ruta)).toMatch(/accesoPorAlumno\(alumnoId\)/);
  });

  it.each(DE_CLASES)("%s rechaza a quien no tiene clases", (ruta) => {
    expect(leer(ruta)).toMatch(/clasesCerradas\(sesion\)/);
  });

  it("la página de clases y la de diploma lo comprueban por URL", () => {
    expect(leer("app/(alumno)/clases/page.tsx")).toMatch(/accesoPorAlumno\(alumnoId\)\)\.clases/);
    expect(leer("app/(alumno)/diploma/page.tsx")).toMatch(/\.diploma\)/);
  });

  it("nadie más llama al generador de bloques", () => {
    const usan = candidatos.filter((f) => /generarConRevision\(/.test(leer(f)));
    expect(usan).toEqual(["app/api/generar-bloque/route.ts"]);
  });

  it("toda ruta de `app/api` que guarde o traduzca bloques está en la lista", () => {
    const usan = candidatos.filter(
      (f) => f.startsWith("app/api/") && /guardarBloqueGenerado|buscarBloqueGenerado|traducirBloque|guardarProgreso|migrarProgresoLocal/.test(leer(f))
    );
    expect(usan.filter((f) => !DE_PARA_TI.includes(f))).toEqual([]);
  });

  it("toda acción o ruta de alumno que hable con la API de clases de Gestión está en la lista", () => {
    const usan = candidatos.filter(
      (f) => /route\.ts$|acciones-/.test(f) && !f.startsWith("app/api/externo") && /recuperaciones"|autoservicio"|valoraciones-servidor"|proximaDelAlumno\(/.test(leer(f))
    );
    expect(usan.filter((f) => !DE_CLASES.includes(f))).toEqual([]);
  });

  it("la cookie solo se abre sin comprobar el pase en el middleware y en `exigirSesion`", () => {
    const abren = [...candidatos, "lib/sesion-servidor.ts", "middleware.ts"].filter((f) => /abrirSesion\(/.test(leer(f)));
    expect(abren.sort()).toEqual(["lib/sesion-servidor.ts", "middleware.ts"]);
  });

  it("`sesionActual` mira el pase de quien solo tiene pase", () => {
    expect(leer("lib/sesion-servidor.ts")).toMatch(/esIdPase\(sesion\.alumnoId\)[\s\S]*leerPases/);
  });

  it("el webhook de la tienda es público para la puerta, y lo demás no", () => {
    expect(leer("middleware.ts")).toMatch(/"\/api\/woo",/);
  });
});
