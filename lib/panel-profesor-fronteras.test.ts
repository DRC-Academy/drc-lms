import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { describe, expect, it } from "vitest";

// EL PATRÓN DE SIEMPRE: UNA PIEZA CENTRAL Y ALGÚN SITIO QUE LA ESQUIVA.
//
// Estos tests leen el código. Una página nueva sin guard, o que importe
// una pieza con datos de pago, rompe aquí aunque nadie la haya probado.

const RAIZ = join(__dirname, "..");

function archivos(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((nombre) => {
    const ruta = join(dir, nombre);
    return statSync(ruta).isDirectory() ? archivos(ruta) : [ruta];
  });
}

const rel = (ruta: string) => relative(RAIZ, ruta).split(sep).join("/");
const leer = (ruta: string) => readFileSync(ruta, "utf8");
const esCodigo = (f: string) => /\.tsx?$/.test(f) && !/\.test\.tsx?$/.test(f);

const DEL_PANEL = [
  ...archivos(join(RAIZ, "app", "profesor")),
  ...archivos(join(RAIZ, "components", "profesor")),
  join(RAIZ, "lib", "panel-profesor.ts"),
  join(RAIZ, "lib", "panel-profesor-reglas.ts"),
].filter(esCodigo);

const TODO = ["app", "lib", "components", "scripts"].flatMap((d) => archivos(join(RAIZ, d))).filter(esCodigo);

/** Lo que el panel no puede importar: traen o enseñan pago, garantía, valoraciones o el marco del alumno. */
const PROHIBIDOS = [
  "@/lib/garantia",
  "@/lib/garantia-servidor",
  "@/lib/valoraciones",
  "@/lib/valoraciones-servidor",
  "@/lib/estado-acceso",
  "@/lib/ampliar-plan",
  "@/lib/profesor-servidor",
  "@/lib/estadisticas-servidor",
  "@/lib/navegacion-servidor",
  "@/lib/estimacion-ficha",
  "@/components/Navegacion",
  "@/components/progreso/Ficha",
  "@/components/progreso/RitmoElige",
  "@/components/RitmoCompacto",
  "@/components/ComparativaRitmo",
  "@/components/MascotaRitmo",
  "@/components/BloquesGenerados",
  "@/components/ChatAyuda",
  "@/components/MenuAyuda",
  "@/components/PopupAlEntrar",
  "@/components/leccion/MenuPerfil",
  "@/components/admin/GarantiaAlumno",
  "@/components/admin/PantallaGarantia",
  "@/components/admin/PantallaValoraciones",
];

/** Las funciones de `lib/gestion.ts` que leen `select *` o columnas comerciales. */
const LECTURAS_PROHIBIDAS = [
  "obtenerPerfil",
  "obtenerAlumno",
  "leerEnEspera",
  "alumnosParaGarantia",
  "finesDePlan",
  "partesDeClase",
  "clasesProgramadas",
  "buscarAlumnoPorEmail",
  "listarAlumnos",
  "alumnosDelPanel",
  "asignacionesDeProfesorSinFiltrar",
];

function importaciones(codigo: string): string[] {
  return Array.from(codigo.matchAll(/from\s+["']([^"']+)["']/g), (m) => m[1]);
}

describe("el panel del profesor", () => {
  it("existe, y este test mira sus archivos de verdad", () => {
    const rutas = DEL_PANEL.map(rel);
    expect(rutas).toContain("app/profesor/page.tsx");
    expect(rutas).toContain("app/profesor/alumno/[alumnoId]/page.tsx");
    expect(rutas).toContain("lib/panel-profesor.ts");
  });

  it("todas sus páginas, rutas y acciones pasan por el guard", () => {
    const entradas = archivos(join(RAIZ, "app", "profesor")).filter(
      (f) => /[\\/](page\.tsx|route\.ts)$/.test(f) || (esCodigo(f) && /^\s*["']use server["']/m.test(leer(f)))
    );
    expect(entradas.length).toBeGreaterThan(0);
    const sueltas = entradas.filter((f) => !/\bexigir(Profesor|AlumnoDelProfesor)\(/.test(leer(f))).map(rel);
    expect(sueltas).toEqual([]);
  });

  it("lo que lleva id de alumno en la ruta usa el guard del alumno, no solo el del profesor", () => {
    const conId = archivos(join(RAIZ, "app", "profesor")).filter((f) => /\[alumnoId\]/.test(rel(f)) && /[\\/](page\.tsx|route\.ts)$/.test(f));
    expect(conId.length).toBeGreaterThan(0);
    for (const f of conId) expect(leer(f)).toMatch(/\bexigirAlumnoDelProfesor\(/);
  });

  it("no importa ninguna pieza prohibida", () => {
    const malos = DEL_PANEL.flatMap((f) =>
      importaciones(leer(f))
        .filter((i) => PROHIBIDOS.includes(i))
        .map((i) => `${rel(f)} -> ${i}`)
    );
    expect(malos).toEqual([]);
  });

  it("no llama a ninguna lectura prohibida de Gestión", () => {
    const malos = DEL_PANEL.flatMap((f) =>
      LECTURAS_PROHIBIDAS.filter((nombre) => new RegExp(`\\b${nombre}\\b`).test(leer(f))).map((n) => `${rel(f)} -> ${n}`)
    );
    expect(malos).toEqual([]);
  });

  it("no toca directamente Gestión, salvo por las lecturas de lib/gestion.ts", () => {
    const malos = DEL_PANEL.filter((f) => /@\/lib\/supabase-server|soloLectura/.test(leer(f))).map(rel);
    expect(malos).toEqual([]);
  });

  it("ningún componente de cliente importa la capa de datos", () => {
    const cliente = [...DEL_PANEL, join(RAIZ, "components", "admin", "AccionesProfesor.tsx")].filter((f) => /^\s*["']use client["']/m.test(leer(f)));
    const malos = cliente.flatMap((f) =>
      importaciones(leer(f))
        .filter((i) => /@\/lib\/(gestion|supabase|panel-profesor$|panel-profesor-admin|sesiones-lms|sesion-servidor)/.test(i))
        .map((i) => `${rel(f)} -> ${i}`)
    );
    expect(malos).toEqual([]);
  });

  it("no usa variables NEXT_PUBLIC_ ni librerías de gráficos, animación o iconos", () => {
    const codigo = [...DEL_PANEL, join(RAIZ, "lib", "panel-profesor-admin.ts"), join(RAIZ, "components", "admin", "PantallaProfesores.tsx"), join(RAIZ, "components", "admin", "AccionesProfesor.tsx")];
    const malos = codigo.filter((f) => /NEXT_PUBLIC_|from\s+["'](recharts|chart\.js|d3|framer-motion|motion|lucide-react|react-icons)/.test(leer(f))).map(rel);
    expect(malos).toEqual([]);
  });

  it("el copy no habla de fallos ni de vigilancia", () => {
    const pantallas = DEL_PANEL.filter((f) => f.endsWith(".tsx"));
    const malos = pantallas.filter((f) => />[^<]*\b(fallos?|errores|vigil\w*|control\w*|rastre\w*)\b[^<]*</i.test(leer(f))).map(rel);
    expect(malos).toEqual([]);
  });
});

describe("nadie esquiva la pieza central", () => {
  const LECTURAS_DEL_GUARD = ["leerAlumnoAsignado", "leerAlumnosAsignados"];

  it("las lecturas de alumnos asignados solo las usa el guard", () => {
    const malos = TODO.filter((f) => !["lib/gestion.ts", "lib/panel-profesor.ts"].includes(rel(f)))
      .filter((f) => LECTURAS_DEL_GUARD.some((n) => new RegExp(`\\b${n}\\b`).test(leer(f))))
      .map(rel);
    expect(malos).toEqual([]);
  });

  it("las vistas nuevas solo se nombran en lib/gestion.ts y en la lista blanca", () => {
    const malos = TODO.filter((f) => !["lib/gestion.ts", "lib/supabase-server.ts"].includes(rel(f)))
      .filter((f) => /vista_alumnos_profesor|vista_profesores_acceso/.test(leer(f)))
      .map(rel);
    expect(malos).toEqual([]);
  });

  it("los tipos autorizados no se fabrican fuera del guard", () => {
    const malos = TODO.filter((f) => rel(f) !== "lib/panel-profesor.ts")
      .filter((f) => /\bas\s+(unknown\s+as\s+)?(AlumnoAutorizado|ProfesorAutorizado)\b/.test(leer(f)))
      .map(rel);
    expect(malos).toEqual([]);
  });

  it("el nombre que se confundía ya no existe", () => {
    const malos = TODO.filter((f) => /\balumnosDeProfesor\b/.test(leer(f))).map(rel);
    expect(malos).toEqual([]);
  });

  it("el rol profesor no entra en Rol ni en Sesion: no hereda permisos de equipo", () => {
    const sesion = leer(join(RAIZ, "lib", "sesion.ts"));
    expect(sesion).toMatch(/export type Rol = "alumno" \| "admin";/);
    expect(sesion).not.toMatch(/rol:\s*"profesor"/);
  });

  it("la cookie del profesor solo se lee en la puerta, en la salida y en su guard", () => {
    const usan = TODO.filter((f) => /\bNOMBRE_COOKIE_PROFESOR\b/.test(leer(f))).map(rel).sort();
    expect(usan).toEqual(["app/salir/route.ts", "lib/entrada.ts", "lib/panel-profesor.ts", "lib/sesion.ts"]);
    expect(/\bNOMBRE_COOKIE_PROFESOR\b/.test(leer(join(RAIZ, "middleware.ts")))).toBe(true);
  });
});

describe("el SQL de las vistas", () => {
  const SQL = ["gestion-vistas-profesor.sql", "gestion-vistas-profesor-es-prueba.sql"].map((n) => leer(join(RAIZ, "supabase", n)));

  /** La lista del SELECT de cada vista, sin el CASE de `examen`, que lee el plan sin sacarlo. */
  function salidas(sql: string): string[] {
    return Array.from(sql.matchAll(/^\s*(?:[\w.()' ,]+?\s+)?as\s+(\w+),?\s*$/gim), (m) => m[1].toLowerCase());
  }

  it("ninguna columna de salida es comercial, de garantía ni de valoraciones", () => {
    for (const sql of SQL) {
      expect(salidas(sql).filter((c) => /plan|producto|suscrip|pago|importe|precio|garant|valora|estrella|comentario|password|status/.test(c))).toEqual([]);
    }
  });

  it("la vista de alumnos solo trae asignaciones activas", () => {
    expect(SQL[0]).toMatch(/where a\.status = 'active';/);
  });

  it("las dos vistas quedan cerradas al navegador", () => {
    expect(SQL[0]).toMatch(/revoke all on public\.vista_profesores_acceso from anon, authenticated;/);
    expect(SQL[0]).toMatch(/revoke all on public\.vista_alumnos_profesor\s+from anon, authenticated;/);
    expect(SQL[1]).toMatch(/revoke all on public\.vista_profesores_acceso from anon, authenticated;/);
  });
});
