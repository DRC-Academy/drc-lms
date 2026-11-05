import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

// ENTRAR: el orden admin, profesor, alumno, y la respuesta que no delata.

const doble = vi.hoisted(() => ({
  alumno: null as null | { alumnoId: string },
  profesor: null as null | { email: string; teacherId: string },
  admins: "",
  preguntasProfesor: [] as string[],
  preguntasAlumno: [] as string[],
  enviados: [] as { email: string; destinatario: string; volver: string | null }[],
  intentos: [] as Record<string, unknown>[],
  sesiones: [] as Record<string, unknown>[],
}));

vi.mock("react", async (original) => ({ ...(await original<object>()), cache: (fn: unknown) => fn }));
vi.mock("next/headers", () => ({ cookies: () => ({ get: () => undefined }), headers: () => new Headers() }));
vi.mock("@/lib/gestion", () => ({
  buscarAlumnoPorEmail: async (email: string) => {
    doble.preguntasAlumno.push(email);
    return doble.alumno;
  },
}));
vi.mock("@/lib/panel-profesor", () => ({
  profesorParaEntrar: async (email: string) => {
    doble.preguntasProfesor.push(email);
    return doble.profesor;
  },
}));
vi.mock("@/lib/correo", () => ({
  enviarEnlaceAcceso: async (email: string, _t: string, volver: string | null, destinatario = "alumno") => {
    doble.enviados.push({ email, destinatario, volver });
    return true;
  },
}));
vi.mock("@/lib/accesos-servidor", () => ({
  registrarIntento: async (d: Record<string, unknown>) => {
    doble.intentos.push(d);
  },
}));
vi.mock("@/lib/idioma-servidor", () => ({
  textosActuales: () => ({ entrada: { mensajeNeutro: "Si existe, te llega.", emailIncompleto: "Revisa el email." } }),
}));
vi.mock("@/lib/vinculos", () => ({ guardarVinculo: async () => {} }));
vi.mock("@/lib/cliente-request", () => ({ clienteActual: () => ({ ip: null, userAgent: null }) }));
vi.mock("@/lib/sesiones-lms", () => ({
  crearSesion: async (d: Record<string, unknown>) => {
    doble.sesiones.push(d);
    return "11111111-1111-4111-8111-111111111111";
  },
  crearSesionProfesor: async (d: Record<string, unknown>) => {
    doble.sesiones.push({ ...d, rol: "profesor" });
    return "22222222-2222-4222-8222-222222222222";
  },
}));

import { solicitarEnlace } from "@/app/acceso/acciones";
import { GET as entrar } from "@/app/entrar/route";
import { abrirSesion, abrirSesionProfesor, crearTokenEnlace, NOMBRE_COOKIE, NOMBRE_COOKIE_PROFESOR } from "@/lib/sesion";

const EMAIL = "ana@drcacademy.com";
const PROFESOR = { email: EMAIL, teacherId: "tA" };

function formulario(email: string, volver?: string) {
  const f = new FormData();
  f.set("email", email);
  if (volver) f.set("volver", volver);
  return f;
}

beforeEach(() => {
  vi.stubEnv("SECRETO_SESION", "x".repeat(40));
  vi.stubEnv("EMAILS_ADMIN", "");
  doble.alumno = null;
  doble.profesor = null;
  doble.preguntasProfesor = [];
  doble.preguntasAlumno = [];
  doble.enviados = [];
  doble.intentos = [];
  doble.sesiones = [];
});
afterEach(() => {
  vi.unstubAllEnvs();
});

describe("pedir el enlace", () => {
  it("se pregunta por alumno y por profesor con TODOS los emails: el tiempo no delata", async () => {
    const r = await solicitarEnlace(formulario("nadie@ejemplo.com"));
    expect(doble.preguntasAlumno).toEqual(["nadie@ejemplo.com"]);
    expect(doble.preguntasProfesor).toEqual(["nadie@ejemplo.com"]);
    expect(doble.enviados).toEqual([]);
    expect(r.estado).toBe("enviado");
  });

  it("la respuesta es la misma para nadie, alumno, profesor y admin", async () => {
    const nadie = await solicitarEnlace(formulario("nadie@ejemplo.com"));

    doble.alumno = { alumnoId: "s_1" };
    const alumno = await solicitarEnlace(formulario("alumna@ejemplo.com"));

    doble.alumno = null;
    doble.profesor = PROFESOR;
    const profesor = await solicitarEnlace(formulario(EMAIL));

    doble.profesor = null;
    vi.stubEnv("EMAILS_ADMIN", "equipo@drcacademy.com");
    const admin = await solicitarEnlace(formulario("equipo@drcacademy.com"));

    expect(alumno).toEqual(nadie);
    expect(profesor).toEqual(nadie);
    expect(admin).toEqual(nadie);
  });

  it("a un profesor le llega su correo y queda anotado sin alumno", async () => {
    doble.profesor = PROFESOR;
    doble.alumno = { alumnoId: "s_1" };
    await solicitarEnlace(formulario(EMAIL));
    expect(doble.enviados).toEqual([{ email: EMAIL, destinatario: "profesor", volver: "/profesor" }]);
    expect(doble.intentos[0]).toMatchObject({ resultado: "enlace_enviado", rol: "profesor", alumnoId: null });
  });

  it("un admin que además figurara como profesor recibe el de siempre", async () => {
    vi.stubEnv("EMAILS_ADMIN", EMAIL);
    doble.profesor = PROFESOR;
    await solicitarEnlace(formulario(EMAIL));
    expect(doble.enviados).toEqual([{ email: EMAIL, destinatario: "alumno", volver: null }]);
  });

  it("sin acceso de profesor y con ficha de alumno, entra el camino del alumno", async () => {
    doble.alumno = { alumnoId: "s_1" };
    await solicitarEnlace(formulario("alumna@ejemplo.com"));
    expect(doble.enviados).toEqual([{ email: "alumna@ejemplo.com", destinatario: "alumno", volver: null }]);
    expect(doble.intentos[0]).toMatchObject({ rol: "alumno", alumnoId: "s_1" });
  });
});

describe("entrar por /profes: la URL no concede nada", () => {
  // `/profes` llama a esta misma acción, con el mismo formulario.
  it("un alumno recibe su enlace normal, sin ninguna ruta del panel", async () => {
    doble.alumno = { alumnoId: "s_1" };
    await solicitarEnlace(formulario("alumna@ejemplo.com", "/profesor/alumno/a1"));
    expect(doble.enviados).toEqual([{ email: "alumna@ejemplo.com", destinatario: "alumno", volver: null }]);
  });

  it("un profesor conserva a dónde iba, y si no iba a ningún sitio, su panel", async () => {
    doble.profesor = PROFESOR;
    await solicitarEnlace(formulario(EMAIL, "/profesor/alumno/a1"));
    await solicitarEnlace(formulario(EMAIL, "/garantia"));
    expect(doble.enviados.map((e) => e.volver)).toEqual(["/profesor/alumno/a1", "/profesor"]);
  });

  it("un admin en «Ver como» conserva su ruta", async () => {
    vi.stubEnv("EMAILS_ADMIN", "equipo@drcacademy.com");
    await solicitarEnlace(formulario("equipo@drcacademy.com", "/profesor?como=tA"));
    expect(doble.enviados[0].volver).toBe("/profesor?como=tA");
  });

  it("alguien sin cuenta no recibe nada, venga de donde venga", async () => {
    const r = await solicitarEnlace(formulario("nadie@ejemplo.com", "/profesor"));
    expect(doble.enviados).toEqual([]);
    expect(r.estado).toBe("enviado");
  });
});

describe("/entrar: admin, profesor, alumno", () => {
  async function pulsar(email: string, volver?: string) {
    const token = await crearTokenEnlace(email);
    const url = `http://localhost:3001/entrar?token=${encodeURIComponent(token)}${volver ? `&volver=${encodeURIComponent(volver)}` : ""}`;
    const r = await entrar(new NextRequest(url));
    const cookie = (nombre: string) => r.cookies.get(nombre)?.value;
    return { destino: new URL(r.headers.get("location") ?? ""), cookie };
  }

  it("un profesor recibe SU cookie, que no abre nada más, y va a su panel", async () => {
    doble.profesor = PROFESOR;
    const { destino, cookie } = await pulsar(EMAIL);
    expect(destino.pathname).toBe("/profesor");
    const suya = cookie(NOMBRE_COOKIE_PROFESOR);
    await expect(abrirSesionProfesor(suya)).resolves.toMatchObject({ teacherId: "tA", email: EMAIL });
    await expect(abrirSesion(suya)).resolves.toBeNull();
    expect(doble.sesiones[0]).toMatchObject({ rol: "profesor", teacherId: "tA" });
  });

  it("si un email es de profesor y de alumno, manda profesor", async () => {
    doble.profesor = PROFESOR;
    doble.alumno = { alumnoId: "s_1" };
    const { destino } = await pulsar(EMAIL);
    expect(destino.pathname).toBe("/profesor");
    expect(doble.preguntasAlumno).toEqual([]);
  });

  it("el admin va por delante de todo", async () => {
    vi.stubEnv("EMAILS_ADMIN", EMAIL);
    doble.profesor = PROFESOR;
    const { destino, cookie } = await pulsar(EMAIL);
    expect(destino.pathname).toBe("/");
    await expect(abrirSesion(cookie(NOMBRE_COOKIE))).resolves.toMatchObject({ rol: "admin" });
    expect(doble.preguntasProfesor).toEqual([]);
  });

  it("desactivado o bloqueado y además alumno: entra como alumno, con su propia cuenta", async () => {
    doble.profesor = null;
    doble.alumno = { alumnoId: "s_1" };
    const { destino, cookie } = await pulsar(EMAIL);
    expect(destino.pathname).toBe("/alumno/s_1");
    await expect(abrirSesion(cookie(NOMBRE_COOKIE))).resolves.toMatchObject({ rol: "alumno", alumnoId: "s_1" });
  });

  it("desactivado o bloqueado y sin ficha: no entra", async () => {
    const { destino, cookie } = await pulsar(EMAIL);
    expect(destino.pathname).toBe("/acceso");
    expect(cookie(NOMBRE_COOKIE_PROFESOR)).toBeUndefined();
    expect(doble.sesiones).toEqual([]);
  });

  it("un enlace caducado de profesor vuelve a /profes; el de un alumno, a /acceso", async () => {
    const pedir = (volver?: string) =>
      entrar(new NextRequest(`http://localhost:3001/entrar?token=roto${volver ? `&volver=${encodeURIComponent(volver)}` : ""}`));
    expect(new URL((await pedir("/profesor")).headers.get("location") ?? "").pathname).toBe("/profes");
    expect(new URL((await pedir()).headers.get("location") ?? "").pathname).toBe("/acceso");
  });

  it("de `volver` solo acepta rutas de su panel", async () => {
    doble.profesor = PROFESOR;
    expect((await pulsar(EMAIL, "/profesor/alumno/a1")).destino.pathname).toBe("/profesor/alumno/a1");
    expect((await pulsar(EMAIL, "/garantia")).destino.pathname).toBe("/profesor");
    expect((await pulsar(EMAIL, "/alumno/otro")).destino.pathname).toBe("/profesor");
  });
});
