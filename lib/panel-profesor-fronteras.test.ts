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
  ...archivos(join(RAIZ, "app", "profes")),
  ...archivos(join(RAIZ, "components", "profesor")),
  join(RAIZ, "lib", "panel-profesor.ts"),
  join(RAIZ, "lib", "panel-profesor-ficha.ts"),
  join(RAIZ, "lib", "panel-profesor-cursos.ts"),
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
  "@/components/practica/PanelBloque",
  "@/components/impago/AvisoImpago",
  "@/components/marco/MarcoDeLaPagina",
  "@/components/marco/MarcoDelAlumno",
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
  "obtenerCalendario",
  "obtenerRecorrido",
  "profesorDelAlumno",
  "estadisticasDelAlumno",
  "datosDelMarco",
];

/** El código sin comentarios: nombrar una pieza prohibida para explicarlo no es usarla. */
function sinComentarios(codigo: string): string {
  return codigo.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

function importaciones(codigo: string): string[] {
  return Array.from(codigo.matchAll(/from\s+["']([^"']+)["']/g), (m) => m[1]);
}

describe("el panel del profesor", () => {
  it("existe, y este test mira sus archivos de verdad", () => {
    const rutas = DEL_PANEL.map(rel);
    expect(rutas).toContain("app/profes/page.tsx");
    expect(rutas).toContain("lib/panel-profesor-ficha.ts");
    expect(rutas).toContain("components/profesor/FichaAlumno.tsx");
    expect(rutas).toContain("app/profesor/page.tsx");
    expect(rutas).toContain("app/profesor/alumno/[alumnoId]/page.tsx");
    expect(rutas).toContain("lib/panel-profesor.ts");
    expect(rutas).toContain("app/profesor/cursos/page.tsx");
    expect(rutas).toContain("app/profesor/cursos/[slug]/page.tsx");
    expect(rutas).toContain("app/profesor/cursos/[slug]/[leccion]/page.tsx");
    expect(rutas).toContain("lib/panel-profesor-cursos.ts");
    expect(rutas).toContain("components/profesor/LeccionProfesor.tsx");
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
      LECTURAS_PROHIBIDAS.filter((nombre) => new RegExp(`\\b${nombre}\\b`).test(sinComentarios(leer(f)))).map((n) => `${rel(f)} -> ${n}`)
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

/** Lo que el panel arrastra de verdad: todo lo que importa, y lo que importa eso. */
function clausura(inicio: string[]): string[] {
  const vistos = new Set<string>();
  const pendientes = [...inicio];
  while (pendientes.length > 0) {
    const f = pendientes.pop() as string;
    if (vistos.has(f)) continue;
    vistos.add(f);
    for (const i of importaciones(leer(f))) {
      if (!i.startsWith("@/")) continue;
      const base = join(RAIZ, i.slice(2));
      const real = [`${base}.ts`, `${base}.tsx`, join(base, "index.ts")].find((c) => existsSync(c) && statSync(c).isFile());
      if (real) pendientes.push(real);
    }
  }
  return Array.from(vistos);
}

describe("lo que arrastra el panel, también por debajo", () => {
  const ARRASTRADO = clausura(DEL_PANEL);

  it("el recorrido alcanza a lo que de verdad usa", () => {
    const rutas = ARRASTRADO.map(rel);
    expect(rutas).toContain("lib/gestion.ts");
    expect(rutas).toContain("lib/cursos-servidor.ts");
    expect(rutas).toContain("components/FormularioAcceso.tsx");
  });

  it("ninguna pieza prohibida entra, ni de forma indirecta", () => {
    const prohibidos = PROHIBIDOS.map((p) => p.replace("@/", ""));
    const malos = ARRASTRADO.map(rel).filter((r) => prohibidos.some((p) => r === `${p}.ts` || r === `${p}.tsx`));
    expect(malos).toEqual([]);
  });

  it("fuera de lib/gestion.ts, nadie de la cadena llama a obtenerPerfil ni lee el plan del alumno", () => {
    // `lib/demo/` son las filas de la cuenta de demostración: las usa
    // `lib/gestion.ts` y no se leen de ninguna base.
    const malos = ARRASTRADO.filter((f) => rel(f) !== "lib/gestion.ts" && !rel(f).startsWith("lib/demo/"))
      .filter((f) => /\bobtenerPerfil\(|\bobtenerAlumno\(|\bleerEnEspera\(|estado_suscripcion|plan_contratado/.test(sinComentarios(leer(f))))
      .map(rel);
    expect(malos).toEqual([]);
  });
});

describe("la ficha", () => {
  const FICHA = leer(join(RAIZ, "lib", "panel-profesor-ficha.ts"));
  const PANTALLA = leer(join(RAIZ, "components", "profesor", "FichaAlumno.tsx"));

  it("ni las respuestas libres ni el enlace de la clase", () => {
    for (const codigo of [FICHA, PANTALLA]) {
      expect(codigo).not.toMatch(/from\("respuestas_produccion"\)|leerRespuestas/);
      expect(codigo).not.toMatch(/meetLink|\.meet_link|enlaceDeClase/);
    }
  });

  it("las lecturas nuevas de lib/gestion.ts no piden el enlace, el transcript ni las señales de riesgo", () => {
    const gestion = leer(join(RAIZ, "lib", "gestion.ts"));
    const calendario = /const CALENDARIO_SIN_ENLACE =\s*"([^"]+)"/.exec(gestion)?.[1] ?? "";
    expect(calendario).toContain("celda");
    expect(calendario).not.toContain("meet_link");

    const clases = /leerClasesDeFicha[\s\S]*?\.select\("([^"]+)"\)/.exec(gestion)?.[1] ?? "";
    expect(clases).toContain("class_summary");
    expect(clases).not.toMatch(/\*|transcript|risk|progress_notes|next_class_guide/);
  });

  it("el cargador pide los tipos que solo crea el guard", () => {
    expect(FICHA).toMatch(/cargarFichaDelAlumno\(\s*profesor: ProfesorAutorizado,\s*alumno: AlumnoAutorizado/);
    expect(FICHA).toMatch(/resumenesDeLaLista\(\s*alumnos: readonly AlumnoAutorizado\[\]/);
  });

  it("la página del alumno llama al guard antes que al cargador", () => {
    const pagina = leer(join(RAIZ, "app", "profesor", "alumno", "[alumnoId]", "page.tsx"));
    expect(pagina.indexOf("exigirAlumnoDelProfesor(params")).toBeGreaterThan(-1);
    expect(pagina.indexOf("exigirAlumnoDelProfesor(params")).toBeLessThan(pagina.indexOf("cargarFichaDelAlumno(profesor"));
  });
});

describe("los cursos del panel", () => {
  const LIB = sinComentarios(leer(join(RAIZ, "lib", "panel-profesor-cursos.ts")));
  const PANTALLAS = archivos(join(RAIZ, "components", "profesor")).concat(archivos(join(RAIZ, "app", "profesor", "cursos")));

  it("no miran el plan, el drip ni el progreso de nadie, y no escriben", () => {
    expect(LIB).not.toMatch(/cursosAsignados|cursosDelInicio|fechaDelDrip|precargarCursosDelAlumno|estadoDelCurso|ejerciciosPorLeccion|completarLeccion|guardarIntento|progreso_lecciones|intentos_ejercicio/);
    expect(LIB).not.toMatch(/baseLms|\.insert\(|\.upsert\(|\.update\(|\.delete\(/);
    expect(LIB).toMatch(/const SIN_ALUMNO = "";/);
    expect(LIB).toMatch(/const SIN_ESPERA = null;/);
  });

  it("cada página pasa por el guard antes de leer el curso", () => {
    const paginas: [string[], string][] = [
      [["app", "profesor", "cursos", "page.tsx"], "cursosParaRevisar(profesor"],
      [["app", "profesor", "cursos", "[slug]", "page.tsx"], "indiceParaRevisar(profesor"],
      [["app", "profesor", "cursos", "[slug]", "[leccion]", "page.tsx"], "leccionParaRevisar(profesor"],
    ];
    for (const [ruta, lectura] of paginas) {
      const codigo = leer(join(RAIZ, ...ruta));
      expect(codigo.indexOf("exigirProfesor(")).toBeGreaterThan(-1);
      expect(codigo.indexOf("exigirProfesor(")).toBeLessThan(codigo.indexOf(lectura));
    }
  });

  it("las lecturas solo piden los tipos que crea el guard", () => {
    for (const nombre of ["cursosParaRevisar", "indiceParaRevisar", "leccionParaRevisar"]) {
      expect(LIB).toMatch(new RegExp(`${nombre}\\(\\s*_profesor: ProfesorAutorizado`));
    }
  });

  it("ninguna pantalla manda nada a la API ni lleva a las pantallas del alumno", () => {
    const malos = PANTALLAS.filter(esCodigo)
      .filter((f) => /\/api\/|fetch\(|["'`]\/curso\/|BotonCompletar|FlujoEjercicios|registrarIntento|alSuceso=/.test(sinComentarios(leer(f))))
      .map(rel);
    expect(malos).toEqual([]);
  });

  it("la lección usa el visor de siempre, sin mascota", () => {
    const leccion = leer(join(RAIZ, "components", "profesor", "LeccionProfesor.tsx"));
    expect(leccion).toMatch(/<VisorEjercicios[^>]*\bsinMascota\b/);
    expect(leccion).toMatch(/<ProveedorIdioma idioma="es">/);
  });
});

describe("/profes", () => {
  const PAGINA = leer(join(RAIZ, "app", "profes", "page.tsx"));

  it("usa el mismo formulario y no tiene login propio", () => {
    expect(PAGINA).toMatch(/FormularioAcceso/);
    expect(PAGINA).not.toMatch(/crearTokenEnlace|enviarEnlaceAcceso|crearCookie|entrarComo|baseLms|soloLectura/);
    expect(existsSync(join(RAIZ, "app", "profes", "acciones.ts"))).toBe(false);
    expect(archivos(join(RAIZ, "app", "profes")).map(rel)).toEqual(["app/profes/page.tsx"]);
  });

  it("no filtra si el email existe: la acción es la de siempre y no hay rama por URL", () => {
    const accion = leer(join(RAIZ, "app", "acceso", "acciones.ts"));
    expect(sinComentarios(accion)).not.toMatch(/\/profes["'`]/);
    expect(leer(join(RAIZ, "components", "FormularioAcceso.tsx"))).toMatch(/solicitarEnlace\(datos\)/);
  });
});

describe("nadie esquiva la pieza central", () => {
  const LECTURAS_DEL_GUARD = ["leerAlumnoAsignado", "leerAlumnosAsignados"];

  it("las lecturas de la ficha solo las usa su cargador", () => {
    const malos = TODO.filter((f) => !["lib/gestion.ts", "lib/panel-profesor-ficha.ts"].includes(rel(f)))
      .filter((f) => /\b(leerClasesDeFicha|leerCalendariosSinEnlace|leerExcepcionesDe)\b/.test(leer(f)))
      .map(rel);
    expect(malos).toEqual([]);
  });

  it("el cargador solo se llama desde las páginas del panel", () => {
    const malos = TODO.filter((f) => /\b(cargarFichaDelAlumno|resumenesDeLaLista)\(/.test(leer(f)))
      .map(rel)
      .filter((r) => r !== "lib/panel-profesor-ficha.ts" && !r.startsWith("app/profesor/"));
    expect(malos).toEqual([]);
  });

  it("las lecturas de alumnos asignados solo las usa el guard", () => {
    const malos = TODO.filter((f) => !["lib/gestion.ts", "lib/panel-profesor.ts"].includes(rel(f)))
      .filter((f) => LECTURAS_DEL_GUARD.some((n) => new RegExp(`\\b${n}\\b`).test(leer(f))))
      .map(rel);
    expect(malos).toEqual([]);
  });

  it("las vistas nuevas solo se nombran en lib/gestion.ts y en la lista blanca", () => {
    const malos = TODO.filter((f) => !["lib/gestion.ts", "lib/supabase-server.ts", "scripts/comprobar-examen-profesores.ts"].includes(rel(f)))
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
