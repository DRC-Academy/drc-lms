import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "@/middleware";
import { esPantallaDeProfesor } from "@/lib/volver";
import {
  abrirSesion,
  abrirSesionProfesor,
  crearCookieProfesor,
  crearCookieSesion,
  crearTokenEnlace,
  NOMBRE_COOKIE,
  NOMBRE_COOKIE_PROFESOR,
} from "@/lib/sesion";

// LA COOKIE DEL PROFESOR, Y LA PUERTA DE LA CALLE.
//
// Lo que sostiene que un profesor no pueda llegar a lo del equipo ni a lo
// del alumno: su sobre no se abre fuera de su panel.

const ID = "11111111-1111-4111-8111-111111111111";
const profesor = { email: "ana@drcacademy.com", teacherId: "tA" };

beforeEach(() => {
  vi.stubEnv("SECRETO_SESION", "x".repeat(40));
});
afterEach(() => {
  vi.unstubAllEnvs();
});

describe("los sobres no se cruzan", () => {
  it("la cookie del profesor se abre con su función", async () => {
    const cookie = await crearCookieProfesor(profesor, ID);
    await expect(abrirSesionProfesor(cookie)).resolves.toEqual({ ...profesor, sesionId: ID });
  });

  it("abrirSesion, la de todo lo existente, NO abre la cookie del profesor", async () => {
    await expect(abrirSesion(await crearCookieProfesor(profesor, ID))).resolves.toBeNull();
  });

  it("la cookie de un alumno o de un admin tampoco vale de profesor", async () => {
    const alumno = await crearCookieSesion({ rol: "alumno", email: "a@b.es", alumnoId: "s_1" }, ID);
    const admin = await crearCookieSesion({ rol: "admin", email: "e@drc.com", alumnoId: null }, ID);
    await expect(abrirSesionProfesor(alumno)).resolves.toBeNull();
    await expect(abrirSesionProfesor(admin)).resolves.toBeNull();
  });

  it("el enlace del correo no vale de cookie, y una manipulada no se abre", async () => {
    await expect(abrirSesionProfesor(await crearTokenEnlace(profesor.email))).resolves.toBeNull();
    const cookie = await crearCookieProfesor(profesor, ID);
    await expect(abrirSesionProfesor(`${cookie}x`)).resolves.toBeNull();
    await expect(abrirSesionProfesor(undefined)).resolves.toBeNull();
  });

  it("caducada no se abre", async () => {
    const cookie = await crearCookieProfesor(profesor, ID);
    vi.useFakeTimers();
    vi.setSystemTime(Date.now() + 31 * 24 * 60 * 60 * 1000);
    await expect(abrirSesionProfesor(cookie)).resolves.toBeNull();
    vi.useRealTimers();
  });
});

function pedir(ruta: string, cookies: Record<string, string>, navegacion = true) {
  return new NextRequest(`http://localhost:3001${ruta}`, {
    headers: {
      cookie: Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join("; "),
      ...(navegacion ? { "sec-fetch-mode": "navigate", accept: "text/html" } : { "sec-fetch-mode": "cors", accept: "application/json" }),
    },
  });
}

const pasa = (r: Response) => r.headers.get("x-middleware-next") === "1";

describe("middleware con la cookie del profesor", () => {
  let cookies: Record<string, string>;
  beforeEach(async () => {
    cookies = { [NOMBRE_COOKIE_PROFESOR]: await crearCookieProfesor(profesor, ID) };
  });

  it.each(["/profesor", "/profesor/alumno/a1", "/profesor/alumno/a1?como=tB"])("deja pasar %s", async (ruta) => {
    expect(pasa(await middleware(pedir(ruta, cookies)))).toBe(true);
  });

  it.each(["/", "/accesos-profesores", "/garantia", "/valoraciones", "/entradas", "/exclusiones", "/alumno/a1", "/clases", "/progreso", "/practica", "/curso/x", "/profesorado"])(
    "%s le devuelve a su panel",
    async (ruta) => {
      const r = await middleware(pedir(ruta, cookies));
      expect(pasa(r)).toBe(false);
      expect(new URL(r.headers.get("location") ?? "").pathname).toBe("/profesor");
    }
  );

  it.each(["/api/progreso", "/api/generar-bloque", "/api/intento-ejercicio", "/api/traducir-bloque"])(
    "%s: un 401, como quien no tiene sesión",
    async (ruta) => {
      expect((await middleware(pedir(ruta, cookies, false))).status).toBe(401);
    }
  );
});

describe("middleware en /profesor con otras cookies", () => {
  it("sin ninguna, a /profes, recordando a dónde iba", async () => {
    const r = await middleware(pedir("/profesor/alumno/a1", {}));
    const destino = new URL(r.headers.get("location") ?? "");
    expect(destino.pathname).toBe("/profes");
    expect(destino.searchParams.get("volver")).toBe("/profesor/alumno/a1");
  });

  it("una cookie de profesor manipulada se retira", async () => {
    const r = await middleware(pedir("/profesor", { [NOMBRE_COOKIE_PROFESOR]: "cualquiera.cosa" }));
    expect(new URL(r.headers.get("location") ?? "").pathname).toBe("/profes");
    expect(r.headers.get("set-cookie") ?? "").toContain(`${NOMBRE_COOKIE_PROFESOR}=;`);
  });

  it("el admin pasa: «Ver como» lo decide el guard", async () => {
    const admin = await crearCookieSesion({ rol: "admin", email: "e@drc.com", alumnoId: null }, ID);
    expect(pasa(await middleware(pedir("/profesor?como=tA", { [NOMBRE_COOKIE]: admin })))).toBe(true);
  });
});

describe("/profes, /profesor y /accesos-profesores no se pisan", () => {
  it("/profes es pública, sin ninguna cookie", async () => {
    expect(pasa(await middleware(pedir("/profes", {})))).toBe(true);
    expect(pasa(await middleware(pedir("/profes?motivo=sesion", {})))).toBe(true);
  });

  it("/profesor y lo que cuelga de él NO se abren por parecerse a /profes", async () => {
    for (const ruta of ["/profesor", "/profesor/", "/profesor/alumno/a1"]) {
      const r = await middleware(pedir(ruta, {}));
      expect(pasa(r)).toBe(false);
      expect(new URL(r.headers.get("location") ?? "").pathname).toBe("/profes");
    }
  });

  it("/accesos-profesores sigue detrás de la cookie, y sin ella va a /acceso", async () => {
    const r = await middleware(pedir("/accesos-profesores", {}));
    expect(pasa(r)).toBe(false);
    expect(new URL(r.headers.get("location") ?? "").pathname).toBe("/acceso");
  });

  it("lo que solo empieza igual no es público: /profesorado, /profes-x", async () => {
    for (const ruta of ["/profesorado", "/profes-x"]) {
      const r = await middleware(pedir(ruta, {}));
      expect(pasa(r)).toBe(false);
      expect(new URL(r.headers.get("location") ?? "").pathname).toBe("/acceso");
    }
  });

  it("con la cookie del profesor, /profes también pasa: la página decide", async () => {
    const cookie = await crearCookieProfesor(profesor, ID);
    expect(pasa(await middleware(pedir("/profes", { [NOMBRE_COOKIE_PROFESOR]: cookie })))).toBe(true);
  });
});

describe("la mascota no sale en lo de los profesores", () => {
  it.each(["/profes", "/profesor", "/profesor/alumno/a1"])("%s es pantalla de profesor", (ruta) => {
    expect(esPantallaDeProfesor(ruta)).toBe(true);
  });

  it.each(["/", "/acceso", "/alumno/a1", "/accesos-profesores", "/profesorado", "/profes-x", "/practica"])("%s no lo es", (ruta) => {
    expect(esPantallaDeProfesor(ruta)).toBe(false);
  });

  it("la capa de la mascota lo comprueba", () => {
    const capa = readFileSync(join(__dirname, "..", "components", "mascota", "CapaMascota.tsx"), "utf8");
    expect(capa).toMatch(/const fuera = [^;]*esPantallaDeProfesor\(ruta\)/);
  });
});
