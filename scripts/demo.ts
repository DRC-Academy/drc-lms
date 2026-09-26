// ---------------------------------------------------------------
// LA CUENTA DE DEMOSTRACIÓN: CREAR, REJUVENECER, BORRAR
//
//   npm run demo:crear          crea la cuenta, genera sus bloques y
//                               registra su actividad. Idempotente.
//   npm run demo:rejuvenecer    mueve todas sus fechas para que su última
//                               actividad vuelva a ser de ayer.
//   npm run demo:borrar         borra todo lo suyo y nada más.
//   npm run demo:enlace         imprime un enlace para entrar como él
//                               (15 minutos), sin mandar ningún correo.
//   npm run demo:estado         qué hay ahora mismo.
//
// Opciones de `crear`:
//   --idioma=es|en           idioma de los bloques (por defecto, es)
//   --intentos=N             generaciones por bloque hasta que el
//                            revisor diga «apto» (por defecto, 3)
//   --rehacer-actividad      borra y vuelve a registrar el progreso sin
//                            tocar los bloques (no llama al modelo)
// Opción de `enlace`:
//   --url=https://…          a qué despliegue apunta (por defecto,
//                            URL_BASE de .env.local)
//
// QUÉ ES DE VERDAD Y QUÉ NO. Lo que Gestión diría de Diego —su ficha,
// sus clases, su calendario— sale de `lib/demo/escenario.ts` y no se
// escribe en ningún sitio: Gestión no se toca. Todo lo demás se hace
// con el código de la aplicación:
//
//   · Los bloques, con el generador real (`lib/generador-bloque.ts`) y
//     el revisor real, uno por clase y en orden, con el reloj de la demo
//     puesto en el día siguiente a cada clase: el generador ve el
//     material que había entonces, no el de hoy. Solo se guarda un
//     bloque que el revisor da por apto.
//   · El progreso, con las mismas funciones que llaman las rutas cuando
//     el alumno responde (`guardarIntento`, `completarLeccion`,
//     `guardarProgreso`) y las sesiones con
//     `crearSesion`, pasándoles la fecha en `en`.
//
// La excepción es `rejuvenecer`, que actualiza fechas directamente: no
// registra nada, solo mueve en el tiempo lo que ya está.
//
// Se arranca con los dos puentes de los scripts:
//
//   npx tsx --require ./scripts/sin-server-only.cjs --require ./scripts/sin-cache-react.cjs scripts/demo.ts crear
//
// Las credenciales salen de .env.local: la base del LMS, la de Gestión
// (solo se lee, y para la demo ni eso), ANTHROPIC_API_KEY para generar y
// SECRETO_SESION para el enlace.
// ---------------------------------------------------------------

import { resolve } from "node:path";
import { leerEnv } from "./learndash-zip.ts";
import { baseLms } from "@/lib/supabase-lms";
import {
  CLASES_CON_BLOQUE,
  DIAS_DE_CURSO,
  EMAIL_DEMO,
  VACACIONES,
  ID_DEMO,
  PREFIJO_DEMO,
  clasesFechadas,
  proximaDemo,
} from "@/lib/demo/escenario";
import { fijarRelojDemo, olvidarCuentasDemo } from "@/lib/demo/cuenta";
import { historialDeClases, obtenerAlumno, obtenerPerfil } from "@/lib/gestion";
import { estamparBloque, generarConRevision, prepararGeneracion } from "@/lib/generador-bloque";
import { revisarBloque, type Revision } from "@/lib/revisor";
import { construirSistema, construirUsuario, type IdiomaBloque } from "@/lib/prompt-bloque";
import {
  guardarBloqueGenerado,
  guardarProgreso,
  leerBloquesGenerados,
} from "@/lib/progreso-servidor";
import { completarLeccion, cursosAsignados, guardarIntento } from "@/lib/cursos-servidor";
import { crearSesion } from "@/lib/sesiones-lms";
import { DIAS_SESION, crearTokenEnlace } from "@/lib/sesion";
import { MODO_ACTUAL } from "@/lib/modos";
import { nivelDelAlumno } from "@/lib/estimacion";
import { abrirPlazo } from "@/lib/tiempo";
import { diaLocal, sumarDias } from "@/lib/fechas";
import { instanteEnMadrid } from "@/lib/clases";
import type { Bloque } from "@/lib/data";

Object.assign(process.env, { ...leerEnv(resolve(process.cwd(), ".env.local")), ...process.env });

const DIA_MS = 86_400_000;

/**
 * Presupuesto de una generación y tope de cada llamada. Aquí no hay techo
 * de Vercel: una llamada que tarde más de los 52 s de la ruta —pasa con
 * la API cargada— se espera en vez de cortarse, y cabe el segundo intento.
 */
const PLAZO_GENERACION_MS = 300_000;
const TOPE_LLAMADA_MS = 140_000;

// ---------------------------------------------------------------
// UTILIDADES
// ---------------------------------------------------------------

const argumentos = process.argv.slice(3);
function opcion(nombre: string): string | null {
  const encontrada = argumentos.find((a) => a.startsWith(`--${nombre}=`));
  return encontrada ? encontrada.slice(nombre.length + 3) : null;
}
const bandera = (nombre: string) => argumentos.includes(`--${nombre}`);

const log = (...partes: unknown[]) => console.log(...partes);

function aLas(dia: string, hora: string, minutosMas = 0): Date {
  return new Date(instanteEnMadrid(dia, hora).getTime() + minutosMas * 60_000);
}

function diasEntre(desde: string, hasta: string): number {
  return Math.round((Date.parse(`${hasta}T00:00:00Z`) - Date.parse(`${desde}T00:00:00Z`)) / DIA_MS);
}

/** Azar con semilla: dos ejecuciones de `crear` dejan la misma actividad. */
function azar(semilla: number): () => number {
  let a = semilla >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

function fallar(mensaje: string): never {
  throw new Error(mensaje);
}

type Cuenta = { alumno_id: string; ancla: string };

async function leerCuenta(): Promise<Cuenta | null> {
  const { data, error } = await baseLms()
    .from("cuentas_demo")
    .select("alumno_id, ancla")
    .eq("alumno_id", ID_DEMO)
    .limit(1)
    .returns<Cuenta[]>();
  if (error) {
    fallar(
      error.message.includes("cuentas_demo")
        ? "No existe la tabla cuentas_demo: ejecuta supabase/lms-cuentas-demo.sql en el SQL Editor del LMS."
        : `No se pudo leer cuentas_demo: ${error.message}`
    );
  }
  return (data ?? [])[0] ?? null;
}

async function contar(tabla: string): Promise<number> {
  const { count, error } = await baseLms()
    .from(tabla)
    .select("alumno_id", { count: "exact", head: true })
    .eq("alumno_id", ID_DEMO);
  if (error) fallar(`No se pudo contar ${tabla}: ${error.message}`);
  return count ?? 0;
}

/** Todas las filas de la demo en una tabla, por páginas: PostgREST corta en 1000. */
async function filasDe(tabla: string): Promise<Record<string, unknown>[]> {
  const salida: Record<string, unknown>[] = [];
  for (let desde = 0; ; desde += 1000) {
    const { data, error } = await baseLms()
      .from(tabla)
      .select("*")
      .eq("alumno_id", ID_DEMO)
      .range(desde, desde + 999)
      .returns<Record<string, unknown>[]>();
    if (error) fallar(`No se pudo leer ${tabla}: ${error.message}`);
    salida.push(...(data ?? []));
    if ((data ?? []).length < 1000) return salida;
  }
}

// ---------------------------------------------------------------
// CREAR
// ---------------------------------------------------------------

async function crear() {
  const idioma: IdiomaBloque = opcion("idioma") === "en" ? "en" : "es";
  const maxIntentos = Math.max(1, Number(opcion("intentos") ?? 3) || 3);

  let cuenta = await leerCuenta();
  if (!cuenta) {
    const ancla = diaLocal(new Date());
    const { error } = await baseLms()
      .from("cuentas_demo")
      .insert({ alumno_id: ID_DEMO, email_normalizado: EMAIL_DEMO, ancla });
    if (error) fallar(`No se pudo crear la cuenta: ${error.message}`);
    cuenta = { alumno_id: ID_DEMO, ancla };
    log(`Cuenta creada: ${ID_DEMO} (${EMAIL_DEMO}), ancla ${ancla}.`);
  } else {
    log(`La cuenta ya existe, ancla ${cuenta.ancla}.`);
    const atras = diasEntre(cuenta.ancla, diaLocal(new Date()));
    if (atras > 0) log(`  El ancla es de hace ${atras} día(s): usa demo:rejuvenecer antes de grabar.`);
  }
  olvidarCuentasDemo();
  const ancla = cuenta.ancla;

  // Sin fila en `alumno_vinculos`, a propósito: su email ya está
  // vinculado a la cuenta de pruebas (ver `EMAIL_DEMO`), y sin fila el
  // recorrido guiado no se le lanza, que es lo que toca a un alumno de
  // once semanas.

  const bloquesListos = await crearBloques(ancla, idioma, maxIntentos);
  if (!bloquesListos) {
    log("\nFaltan bloques: vuelve a lanzar demo:crear (los hechos no se repiten).");
    process.exitCode = 1;
    return;
  }

  if (bandera("rehacer-actividad")) await borrarActividad();
  await registrarActividad(ancla);
  await registrarSesiones(ancla);

  log("\nListo. Resumen:");
  await estado();
}

// ---------------------------------------------------------------
// LOS BLOQUES, CON EL GENERADOR Y EL REVISOR DE VERDAD
// ---------------------------------------------------------------

async function crearBloques(ancla: string, idioma: IdiomaBloque, maxIntentos: number): Promise<boolean> {
  const existentes = await leerBloquesGenerados(ID_DEMO);
  const conBloque = new Set(existentes.map((b) => b.claseOrigen?.fecha));
  const fechadas = new Map(clasesFechadas(ancla).map((c) => [c.numero, c]));
  const pendientes = CLASES_CON_BLOQUE.filter((k) => !conBloque.has(fechadas.get(k)!.fecha));

  if (pendientes.length === 0) {
    log(`Bloques: los ${CLASES_CON_BLOQUE.length} ya están generados.`);
    return true;
  }

  const clave = process.env.ANTHROPIC_API_KEY?.trim();
  if (!clave) fallar("Falta ANTHROPIC_API_KEY en .env.local.");

  log(`Bloques: faltan ${pendientes.length} de ${CLASES_CON_BLOQUE.length}. Cada uno tarda alrededor de un minuto.`);
  const llamadas = { generador: 0, revisor: 0 };
  const titulos = existentes.map((b) => b.titulo);

  try {
    for (const k of pendientes) {
      const clase = fechadas.get(k)!;
      // El día después de la clase, que es cuando la generación se
      // desbloquea para un alumno de verdad.
      const momento = new Date(clase.analizadaEn.getTime() + 20 * 3_600_000);
      fijarRelojDemo(momento);

      const [alumno, historial] = await Promise.all([obtenerAlumno(ID_DEMO), historialDeClases(ID_DEMO)]);
      if (!alumno?.ultimaClase || alumno.ultimaClase.fechaClase !== clase.fecha) {
        fallar(`El reloj no ve la clase del ${clase.fecha} como la última. ¿Está bien el ancla?`);
      }

      const prep = prepararGeneracion(ID_DEMO, alumno, historial, titulos.slice(0, 20));
      const sistema = construirSistema(prep.nivel, idioma);
      const usuario = construirUsuario(prep.materia, idioma);
      log(`\n· Clase del ${clase.fecha} — «${alumno.ultimaClase.titulo}» (${prep.anteriores.length} anteriores)`);

      let aceptado: { bloque: Bloque; revision: Revision; intentos: number } | null = null;

      for (let intento = 1; intento <= maxIntentos && !aceptado; intento++) {
        const generado = await generarConRevision(
          clave,
          sistema,
          usuario,
          prep.materia.examen,
          abrirPlazo(PLAZO_GENERACION_MS),
          (etapa) => {
            if (etapa === "modelo:petición") llamadas.generador++;
            if (etapa === "revisión:inicio") llamadas.revisor++;
          },
          () => {},
          TOPE_LLAMADA_MS
        );
        if (!generado) {
          log(`  intento ${intento}: la generación no dio un bloque válido`);
          continue;
        }

        // Un revisor que no contestó no es un veredicto: se le vuelve a
        // preguntar por el mismo bloque antes de pagar otra generación.
        let revision = generado.revision;
        for (let r = 0; revision.estado === "no-disponible" && r < 2; r++) {
          llamadas.revisor++;
          revision = await revisarBloque(clave, generado.bloque, prep.materia.examen);
        }

        if (revision.estado === "apto") {
          aceptado = { bloque: generado.bloque, revision, intentos: intento };
        } else if (revision.estado === "con-problemas") {
          log(`  intento ${intento}: el revisor lo rechaza — ${revision.problemas.map((p) => p.tipo).join(", ")}`);
        } else {
          log(`  intento ${intento}: el revisor no contestó (${revision.motivo})`);
        }
      }

      if (!aceptado) {
        log(`  ✗ Ningún bloque apto en ${maxIntentos} intentos. No se guarda nada de esta clase.`);
        return false;
      }

      const bloque = estamparBloque(aceptado.bloque, idioma, prep.claseOrigen);
      const guardado = await guardarBloqueGenerado(
        ID_DEMO,
        bloque,
        MODO_ACTUAL,
        "ia",
        { ...aceptado.revision, intentos: aceptado.intentos },
        false,
        momento
      );
      if (!guardado) fallar("No se pudo guardar el bloque: mira el aviso de [progreso] de arriba.");
      titulos.unshift(bloque.titulo);
      log(`  ✓ «${bloque.titulo}» — apto al intento ${aceptado.intentos}`);
    }
  } finally {
    fijarRelojDemo(null);
    log(`\nLlamadas a la API: ${llamadas.generador} de generación (Sonnet) y ${llamadas.revisor} de revisión (Haiku).`);
  }
  return true;
}

// ---------------------------------------------------------------
// LA ACTIVIDAD, CON LAS FUNCIONES DE LAS RUTAS
// ---------------------------------------------------------------

const TABLAS_ACTIVIDAD = [
  "progreso_lecciones",
  "intentos_ejercicio",
  "progreso_bloques",
  "avance_bloques",
  "respuestas_produccion",
] as const;

async function borrarActividad() {
  for (const tabla of TABLAS_ACTIVIDAD) {
    const { error } = await baseLms().from(tabla).delete().eq("alumno_id", ID_DEMO);
    if (error) fallar(`No se pudo vaciar ${tabla}: ${error.message}`);
  }
  log("Actividad anterior borrada (los bloques se quedan).");
}

/**
 * Aciertos sobre 10 de cada parada, en el orden de `CLASES_CON_BLOQUE`:
 * alrededor del 83 %, con altibajos y mejor al final, como quien mejora.
 */
const NOTAS_BLOQUES = [7, 8, 7, 9, 8, 8, 9, 7, 9, 8, 10, 9];

/**
 * Qué parte de un módulo ha hecho, según cuándo se abrió. Las primeras
 * semanas, entero; lo abierto hace poco, cada vez menos: como un alumno
 * que va algo por detrás del drip.
 */
function proporcionHecha(visibleAfter: number): number {
  if (visibleAfter <= 63) return 1;
  if (visibleAfter <= 77) return 0.8;
  if (visibleAfter <= 84) return 0.5;
  return 0;
}

/** Los módulos de los temas que el profesor marca como recurrentes: ahí falla más. */
const TEMA_RECURRENTE = /past|experienc|narrative|tense/i;

async function registrarActividad(ancla: string) {
  const previas = (await contar("progreso_lecciones")) + (await contar("progreso_bloques")) + (await contar("avance_bloques"));
  if (previas > 0) {
    log("Actividad: ya registrada (usa --rehacer-actividad para empezarla de cero).");
    return;
  }

  const inicio = sumarDias(ancla, -DIAS_DE_CURSO);
  const rnd = azar(20260925);

  // --- La práctica: todas las paradas terminadas, cada una al día
  // siguiente de su clase, unas horas después de generarla ---
  const bloques = await leerBloquesGenerados(ID_DEMO);
  const porFecha = new Map(bloques.map((b) => [b.claseOrigen?.fecha, b]));
  let aciertosBloques = 0;
  let totalBloques = 0;

  for (const clase of clasesFechadas(ancla)) {
    const orden = (CLASES_CON_BLOQUE as readonly number[]).indexOf(clase.numero);
    if (orden === -1) continue;
    const bloque = porFecha.get(clase.fecha);
    if (!bloque) fallar(`No está el bloque de la clase del ${clase.fecha}.`);
    const total = bloque.ejercicios.length;

    const aciertos = Math.round((NOTAS_BLOQUES[orden] * total) / 10);
    const en = new Date(clase.analizadaEn.getTime() + 26 * 3_600_000);
    if (!(await guardarProgreso(ID_DEMO, bloque.id, aciertos, total, en))) fallar("No se pudo guardar un bloque terminado.");
    aciertosBloques += aciertos;
    totalBloques += total;
  }

  // --- El curso: lo que le abre el drip, lección a lección ---
  const perfil = (await obtenerPerfil(ID_DEMO)) ?? fallar("La cuenta demo no devuelve perfil.");
  const [curso] = await cursosAsignados(perfil.plan, nivelDelAlumno(ID_DEMO, perfil), ID_DEMO);
  if (!curso) fallar("La demo no tiene curso asignado.");

  const cliente = baseLms();
  const { data: modulos, error: e1 } = await cliente
    .from("modulos")
    .select("id, titulo, orden, visible_after")
    .eq("curso_id", curso.id)
    .order("orden")
    .returns<{ id: string; titulo: string; orden: number; visible_after: number }[]>();
  if (e1 || !modulos) fallar(`No se pudieron leer los módulos: ${e1?.message}`);

  let leccionesHechas = 0;
  let aciertosCurso = 0;
  let intentosCurso = 0;

  for (const modulo of modulos) {
    const proporcion = proporcionHecha(modulo.visible_after);
    if (proporcion === 0) continue;

    const { data: lecciones } = await cliente
      .from("lecciones")
      .select("id, orden")
      .eq("modulo_id", modulo.id)
      .order("orden")
      .returns<{ id: string; orden: number }[]>();
    const hechas = (lecciones ?? []).slice(0, Math.round((lecciones ?? []).length * proporcion));
    if (hechas.length === 0) continue;

    const { data: ejercicios } = await cliente
      .from("ejercicios_leccion")
      .select("id, leccion_id, tipo, orden")
      .in(
        "leccion_id",
        hechas.map((l) => l.id)
      )
      .order("orden")
      .returns<{ id: string; leccion_id: string; tipo: string; orden: number }[]>();

    const probabilidad = TEMA_RECURRENTE.test(modulo.titulo) ? 0.6 : 0.86;
    // Empieza el día después de que se abra; lo abierto más tarde, con
    // algo más de retraso. La semana de vacaciones no estudió.
    let base = modulo.visible_after + (modulo.visible_after <= 63 ? 1 : 2);
    if (base >= VACACIONES.desde && base <= VACACIONES.hasta) base = VACACIONES.hasta + 1;

    for (let i = 0; i < hechas.length; i++) {
      const dia = Math.min(base + Math.floor(i / 3) * 2, DIAS_DE_CURSO - 1);
      const momento = aLas(sumarDias(inicio, dia), "21:40", (i % 3) * 18);
      // Los `essay` no registran intento: no tienen corrección.
      const suyos = (ejercicios ?? []).filter((e) => e.leccion_id === hechas[i].id && e.tipo !== "essay");

      for (let j = 0; j < suyos.length; j++) {
        const correcto = rnd() < probabilidad;
        const en = new Date(momento.getTime() + j * 55_000);
        if (!(await guardarIntento(ID_DEMO, suyos[j].id, correcto, en))) fallar("No se pudo guardar un intento.");
        intentosCurso++;
        if (correcto) aciertosCurso++;
      }

      const cierre = new Date(momento.getTime() + (suyos.length + 1) * 55_000);
      if (!(await completarLeccion(ID_DEMO, hechas[i].id, cierre))) fallar("No se pudo completar una lección.");
      leccionesHechas++;
    }
  }

  const pct = (a: number, t: number) => (t > 0 ? `${Math.round((a / t) * 100)}%` : "—");
  log(`Práctica: ${bloques.length} paradas terminadas (${pct(aciertosBloques, totalBloques)}); la de la última clase, abierta para generar.`);
  log(`Curso «${curso.titulo}»: ${leccionesHechas} lecciones hechas, ${intentosCurso} ejercicios (${pct(aciertosCurso, intentosCurso)} de acierto).`);
}

/**
 * Las entradas al LMS. Una sesión dura 30 días, así que un alumno que
 * entra a menudo abre pocas: la primera, una al caducar cada cookie, la
 * del móvil en una pausa de la comida y la de anoche.
 */
async function registrarSesiones(ancla: string) {
  // Solo cuentan las de antes del ancla: las de después son entradas de
  // verdad —la tuya al ensayar— y no dicen nada de si esto ya se hizo.
  const { count, error } = await baseLms()
    .from("sesiones")
    .select("alumno_id", { count: "exact", head: true })
    .eq("alumno_id", ID_DEMO)
    .lt("creada_en", instanteEnMadrid(ancla, "00:00").toISOString());
  if (error) fallar(`No se pudieron contar las sesiones: ${error.message}`);
  if ((count ?? 0) > 0) {
    log("Sesiones: ya registradas.");
    return;
  }
  const inicio = sumarDias(ancla, -DIAS_DE_CURSO);
  const entradas = [
    aLas(sumarDias(inicio, 1), "21:30"),
    aLas(sumarDias(inicio, 31), "21:32"),
    aLas(sumarDias(inicio, 61), "21:35"),
    aLas(sumarDias(inicio, 88), "13:50"),
    aLas(sumarDias(ancla, -1), "20:55"),
  ];
  for (const en of entradas) {
    const id = await crearSesion({
      rol: "alumno",
      alumnoId: ID_DEMO,
      emailAdmin: null,
      origen: "magic_link",
      expiraEn: new Date(en.getTime() + DIAS_SESION * DIA_MS),
      en,
    });
    if (!id) fallar("No se pudo registrar una sesión.");
  }
  log(`Sesiones: ${entradas.length}, la última ayer.`);
}

// ---------------------------------------------------------------
// REJUVENECER
// ---------------------------------------------------------------

/** Qué columnas de fecha tiene cada tabla, y cuál decide si es de la demo. */
const FECHAS: { tabla: string; clave: string; columnas: string[] }[] = [
  { tabla: "progreso_lecciones", clave: "id", columnas: ["completada_en"] },
  { tabla: "intentos_ejercicio", clave: "id", columnas: ["respondido_en"] },
  { tabla: "progreso_bloques", clave: "id", columnas: ["completado_en"] },
  { tabla: "avance_bloques", clave: "alumno_id,bloque_clave", columnas: ["actualizado_en"] },
  { tabla: "respuestas_produccion", clave: "id", columnas: ["enviada_en"] },
  { tabla: "bloques_generados", clave: "id", columnas: ["generado_en"] },
  { tabla: "sesiones", clave: "id", columnas: ["creada_en", "ultimo_uso_en", "expira_en"] },
];

async function rejuvenecer() {
  const cuenta = (await leerCuenta()) ?? fallar("No hay cuenta demo: lanza demo:crear.");
  const hoy = diaLocal(new Date());
  const dias = diasEntre(cuenta.ancla, hoy);
  if (dias <= 0) {
    log(`Ya está al día (ancla ${cuenta.ancla}).`);
    return;
  }

  // SOLO SE MUEVE LO ANTERIOR AL ANCLA, que es lo que escribió `crear`.
  // Lo que se haya hecho a mano después —un ensayo de la grabación— se
  // queda donde está: moverlo lo mandaría al futuro.
  const corte = instanteEnMadrid(cuenta.ancla, "00:00").getTime();
  const mover = (valor: unknown) => new Date(Date.parse(String(valor)) + dias * DIA_MS).toISOString();

  for (const { tabla, clave, columnas } of FECHAS) {
    const filas = (await filasDe(tabla)).filter((f) => Date.parse(String(f[columnas[0]])) < corte);
    if (filas.length === 0) continue;

    const movidas = filas.map((fila) => {
      const nueva: Record<string, unknown> = { ...fila };
      for (const columna of columnas) if (fila[columna]) nueva[columna] = mover(fila[columna]);

      // La clase de la que sale cada bloque va dentro del JSON: se mueve
      // con las clases, que también cuentan desde el ancla.
      const contenido = fila.contenido as { claseOrigen?: { fecha: string } } | undefined;
      if (tabla === "bloques_generados" && contenido?.claseOrigen?.fecha) {
        nueva.contenido = {
          ...contenido,
          claseOrigen: { ...contenido.claseOrigen, fecha: sumarDias(contenido.claseOrigen.fecha, dias) },
        };
      }
      return nueva;
    });

    for (let i = 0; i < movidas.length; i += 500) {
      const { error } = await baseLms().from(tabla).upsert(movidas.slice(i, i + 500), { onConflict: clave });
      if (error) fallar(`No se pudo mover ${tabla}: ${error.message}. El ancla sigue en ${cuenta.ancla}; vuelve a lanzarlo.`);
    }
    log(`  ${tabla}: ${movidas.length} fila(s) +${dias} días`);
  }

  const { error } = await baseLms().from("cuentas_demo").update({ ancla: hoy }).eq("alumno_id", ID_DEMO);
  if (error) fallar(`No se pudo mover el ancla: ${error.message}`);

  log(`\nAncla ${cuenta.ancla} → ${hoy}. Próxima clase: ${proximaDemo(hoy).fecha} a las ${proximaDemo(hoy).hora}.`);
  log("Espera un minuto antes de grabar: cada instancia recuerda el ancla hasta 60 segundos.");
}

// ---------------------------------------------------------------
// BORRAR
// ---------------------------------------------------------------

/** Todas las tablas del LMS con `alumno_id`. `cuentas_demo`, la última. */
const TABLAS_ALUMNO = [
  "progreso_bloques",
  "avance_bloques",
  "respuestas_produccion",
  "reportes_ejercicio",
  "bloques_generados",
  "progreso_lecciones",
  "intentos_ejercicio",
  "sesiones",
  "alumno_vinculos",
  "objetivos_alumno",
  "accesos_manuales",
  "avisos_modulo",
  "avisos_preferencias",
  "intentos_acceso",
];

async function borrar() {
  // Doble cerrojo: el id tiene el prefijo, y el prefijo lo exige la CHECK
  // de `cuentas_demo`. Un id de Gestión no puede llegar aquí.
  if (!ID_DEMO.startsWith(PREFIJO_DEMO)) fallar("El id de la demo no lleva el prefijo: no se borra nada.");

  const { data: claves } = await baseLms()
    .from("bloques_generados")
    .select("bloque_clave")
    .eq("alumno_id", ID_DEMO)
    .returns<{ bloque_clave: string }[]>();
  const lista = (claves ?? []).map((c) => c.bloque_clave);
  if (lista.length > 0) {
    const { error, count } = await baseLms()
      .from("traducciones_bloque")
      .delete({ count: "exact" })
      .in("bloque_clave", lista);
    log(`  traducciones_bloque: ${error ? `error (${error.message})` : count ?? 0}`);
  }

  for (const tabla of [...TABLAS_ALUMNO, "cuentas_demo"]) {
    const { error, count } = await baseLms().from(tabla).delete({ count: "exact" }).eq("alumno_id", ID_DEMO);
    log(`  ${tabla}: ${error ? `error (${error.message})` : count ?? 0}`);
  }
  log(`\nBorrado todo lo de ${ID_DEMO}. Gestión no se ha tocado.`);
}

// ---------------------------------------------------------------
// ENLACE Y ESTADO
// ---------------------------------------------------------------

async function enlace() {
  if (!(await leerCuenta())) fallar("No hay cuenta demo: lanza demo:crear.");
  if (!process.env.SECRETO_SESION) fallar("Falta SECRETO_SESION en .env.local.");
  const base = (opcion("url") ?? process.env.URL_BASE ?? "http://localhost:3000").replace(/\/+$/, "");
  const token = await crearTokenEnlace(EMAIL_DEMO);
  log(`${base}/entrar?token=${encodeURIComponent(token)}`);
  log("\nVale 15 minutos. Para producción, SECRETO_SESION tiene que ser el mismo que en Vercel.");
}

async function estado() {
  const cuenta = await leerCuenta();
  if (!cuenta) {
    log("No hay cuenta demo.");
    return;
  }
  const proxima = proximaDemo(cuenta.ancla);
  const clases = clasesFechadas(cuenta.ancla);
  log(`Cuenta ${ID_DEMO} · ${EMAIL_DEMO}`);
  log(`Ancla ${cuenta.ancla} (hace ${diasEntre(cuenta.ancla, diaLocal(new Date()))} días) · matrícula ${sumarDias(cuenta.ancla, -DIAS_DE_CURSO)}`);
  log(`Clases: ${clases.length}, la última el ${clases[clases.length - 1].fecha}; próxima el ${proxima.fecha} (${proxima.dia}) a las ${proxima.hora}`);
  for (const tabla of ["bloques_generados", ...TABLAS_ACTIVIDAD, "sesiones"]) {
    log(`  ${tabla}: ${await contar(tabla)}`);
  }
}

// ---------------------------------------------------------------

const COMANDOS: Record<string, () => Promise<void>> = { crear, rejuvenecer, borrar, enlace, estado };

async function main() {
  const comando = COMANDOS[process.argv[2] ?? ""];
  if (!comando) {
    log(`Uso: scripts/demo.ts <${Object.keys(COMANDOS).join("|")}> [opciones]`);
    process.exitCode = 1;
    return;
  }
  await comando();
}

main().catch((error) => {
  console.error(`\n✗ ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
