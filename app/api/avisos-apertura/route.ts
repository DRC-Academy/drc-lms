// ---------------------------------------------------------------
// EL AVISO DIARIO DE CONTENIDO DESBLOQUEADO
//
// Lo llama el cron de Vercel una vez al día (ver `vercel.json`). No hay
// ningún evento el día 7: el drip es una resta entre la fecha de
// matrícula y hoy, así que alguien tiene que preguntarlo, y ese alguien
// es esto.
//
// CUATRO MODOS, TODOS DETRÁS DEL MISMO SECRETO:
//
//   · (sin nada)      envía. Es lo que hace el cron.
//   · ?seco=1         calcula y cuenta lo que haría. No envía ni escribe.
//   · ?sembrar=1      marca como avisado todo lo que ya está abierto,
//                     sin enviar. La primera pasada, y TIENE QUE CORRER
//                     ANTES QUE EL CRON.
//   · ?prueba=<email> compone un correo con datos reales y lo manda solo
//                     a esa dirección. No escribe nada.
//
// Y dos afinadores: `?alumno=<id>` limita todo a un alumno, y los tres
// modos se combinan con `seco` para ver el efecto antes de causarlo.
//
// EL ORDEN DE LA PUESTA EN MARCHA IMPORTA. Si el cron corre antes que
// `sembrar`, los alumnos con meses de curso reciben avisos de módulos
// que se abrieron en marzo. La ventana de dos días de `lib/avisos.ts`
// lo amortigua, pero el seguro de verdad es sembrar primero.
// ---------------------------------------------------------------

import { NextResponse, type NextRequest } from "next/server";
import { comoFecha } from "@/lib/fechas";
import { calcularDiploma } from "@/lib/diploma";
import { repartirModulos, semanaDelDrip, type ModuloDelCurso } from "@/lib/avisos";
import {
  claveAviso,
  confirmarAvisos,
  cursosDeAlumno,
  leerContenido,
  leerEstado,
  modulosParaReparto,
  reservarAvisos,
  sembrarAvisos,
  soltarAvisos,
} from "@/lib/avisos-servidor";
import { alumnosParaAvisos, type AlumnoAviso } from "@/lib/gestion";
import { urlBase } from "@/lib/correo";
import { enviarAviso, type AvisoApertura, type SeccionAviso } from "@/lib/correo-avisos";
import { crearTokenBaja } from "@/lib/sesion";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Tope de correos por ejecución.
 *
 * No es una limitación de Resend ni del plan: es el fusible. En un día
 * normal salen unos 25 —172 alumnos con una apertura cada siete días—,
 * así que si una ejecución quiere mandar 300 es que algo se ha roto en
 * el cálculo, y prefiero que se corte y se vea en la respuesta a que
 * llegue a los buzones.
 *
 * 80 es además lo que cabe en los 60 segundos de la función al ritmo de
 * abajo. Si una ejecución se corta, los que se queden fuera entran al
 * día siguiente: siguen dentro de la ventana de dos días.
 */
const TOPE_ENVIOS = 80;

/**
 * Milisegundos entre correo y correo.
 *
 * Resend admite dos peticiones por segundo, y una ronda de envíos
 * seguidos las pasa de largo: cada llamada tarda menos de eso. Sin este
 * freno, a partir del tercer alumno empiezan los 429 y esos avisos se
 * pierden hasta el día siguiente. Con 25 correos al día son quince
 * segundos, que sobran dentro de la función.
 */
const RITMO_MS = 550;

function esperar(ms: number): Promise<void> {
  return new Promise((listo) => setTimeout(listo, ms));
}

/** El correo de prueba solo puede ir a casa. */
const DOMINIO_PRUEBA = "@drcacademy.com";

function autorizado(peticion: NextRequest): boolean {
  const secreto = process.env.CRON_SECRET;

  // Sin secreto configurado no se abre a nadie: esto manda correos.
  if (!secreto || secreto.length < 16) {
    console.error("[avisos] Falta CRON_SECRET en el entorno, o es demasiado corto.");
    return false;
  }

  return peticion.headers.get("authorization") === `Bearer ${secreto}`;
}

type SeccionCalculada = {
  curso: string;
  slug: string;
  nuevos: ModuloDelCurso[];
  restantes: number;
};

type PlanAlumno = {
  alumno: AlumnoAviso;
  secciones: SeccionCalculada[];
  /** Todo lo abierto, avisado o no. Es lo que siembra la primera pasada. */
  abiertos: { alumnoId: string; moduloId: string }[];
  /** Por qué no se le manda nada, si no se le manda. */
  motivo: string | null;
};

export async function GET(peticion: NextRequest) {
  if (!autorizado(peticion)) {
    return NextResponse.json({ error: "no autorizado" }, { status: 401 });
  }

  const parametros = peticion.nextUrl.searchParams;
  const seco = parametros.get("seco") === "1";
  const sembrar = parametros.get("sembrar") === "1";
  const prueba = (parametros.get("prueba") ?? "").trim().toLowerCase();
  const soloAlumno = (parametros.get("alumno") ?? "").trim();

  if (prueba !== "" && !prueba.endsWith(DOMINIO_PRUEBA)) {
    return NextResponse.json(
      { error: `el correo de prueba solo puede ir a una dirección ${DOMINIO_PRUEBA}` },
      { status: 400 }
    );
  }

  const ahora = new Date();

  const [alumnos, contenido, estado] = await Promise.all([
    alumnosParaAvisos(),
    leerContenido(),
    leerEstado(),
  ]);

  // ------------------------------ EL CÁLCULO ------------------------------
  const planes: PlanAlumno[] = [];

  for (const alumno of alumnos) {
    if (soloAlumno !== "" && alumno.alumnoId !== soloAlumno) continue;

    const hechas = estado.progreso.get(alumno.alumnoId) ?? new Set<string>();
    const manuales = estado.manuales.get(alumno.alumnoId) ?? new Set<string>();
    const sinDrip = estado.sinDrip.get(alumno.alumnoId) ?? new Set<string>();

    const fechaInicio = comoFecha(alumno.fechaInicio);
    const cursos = cursosDeAlumno(contenido, alumno.plan, alumno.nivel, manuales);

    const secciones: SeccionCalculada[] = [];
    const abiertos: { alumnoId: string; moduloId: string }[] = [];

    for (const curso of cursos) {
      // Un curso abierto a mano no tiene aperturas que anunciar: lo
      // tiene entero desde el día uno. `null` es como `lib/drip.ts`
      // entiende «sin espera», así que todo sale abierto y nada nuevo.
      const fecha = sinDrip.has(curso.id) ? null : fechaInicio;

      const modulos = modulosParaReparto(contenido, curso.id, hechas);
      const reparto = repartirModulos(modulos, fecha, ahora);

      for (const modulo of reparto.abiertos) {
        abiertos.push({ alumnoId: alumno.alumnoId, moduloId: modulo.id });
      }

      const nuevos = reparto.nuevos.filter(
        (modulo) => !estado.avisados.has(claveAviso(alumno.alumnoId, modulo.id))
      );
      if (nuevos.length === 0) continue;

      const total = contenido.totalPorCurso.get(curso.id) ?? 0;
      let completadas = 0;
      hechas.forEach((leccionId) => {
        if (contenido.cursoDeLeccion.get(leccionId) === curso.id) completadas++;
      });

      // La misma cuenta que el banner del diploma, con su tope por
      // arriba: si el progreso migrado trajera más filas que lecciones,
      // «te faltan -3» sería la frase más rara del correo.
      const diploma = calcularDiploma(completadas, total);

      secciones.push({
        curso: curso.titulo,
        slug: curso.slug,
        nuevos: nuevos.slice().sort((a, b) => a.orden - b.orden),
        restantes: diploma.estado === "en-curso" ? diploma.restantes : 0,
      });
    }

    planes.push({
      alumno,
      secciones,
      abiertos,
      motivo: motivoParaNoEnviar(alumno, estado.bajas.has(alumno.alumnoId), secciones.length),
    });
  }

  // ------------------------------ SEMBRAR ------------------------------
  if (sembrar) {
    const filas = planes.flatMap((plan) =>
      plan.abiertos.filter((fila) => !estado.avisados.has(claveAviso(fila.alumnoId, fila.moduloId)))
    );

    const marcados = seco ? filas.length : await sembrarAvisos(filas);

    return NextResponse.json({
      modo: seco ? "sembrar (seco)" : "sembrar",
      alumnos: planes.length,
      modulosMarcados: marcados,
      nota: "No se ha enviado ningún correo. Sembrar solo marca lo ya abierto.",
    });
  }

  const conAviso = planes.filter((plan) => plan.motivo === null);

  // ------------------------------ PRUEBA ------------------------------
  if (prueba !== "") {
    const elegido = conAviso[0] ?? null;
    const aviso = elegido ? await componer(elegido) : await avisoDeMuestra();

    const resultado = seco ? { ok: true, id: null } : await enviarAviso(prueba, aviso);

    return NextResponse.json({
      modo: seco ? "prueba (seco)" : "prueba",
      enviadoA: prueba,
      conDatosDe: elegido?.alumno.alumnoId ?? "muestra inventada",
      asunto: aviso.secciones.length > 1 ? "dos cursos" : `semana ${aviso.semana}`,
      secciones: aviso.secciones.length,
      ok: resultado.ok,
      nota: "No se ha escrito nada en avisos_modulo.",
    });
  }

  // ------------------------------ SECO ------------------------------
  if (seco) {
    return NextResponse.json({
      modo: "seco",
      alumnos: planes.length,
      correos: conAviso.length,
      modulos: conAviso.reduce(
        (suma, plan) => suma + plan.secciones.reduce((s, seccion) => s + seccion.nuevos.length, 0),
        0
      ),
      // Sin direcciones: la respuesta de un endpoint no es sitio para
      // una lista de correos de alumnos, aunque haga falta el secreto.
      detalle: conAviso.slice(0, 50).map((plan) => ({
        alumnoId: plan.alumno.alumnoId,
        cursos: plan.secciones.length,
        modulos: plan.secciones.flatMap((seccion) => seccion.nuevos.map((m) => m.titulo)),
      })),
      descartados: resumirDescartes(planes),
    });
  }

  // ------------------------------ ENVIAR ------------------------------
  let enviados = 0;
  let fallidos = 0;
  let modulos = 0;
  let cortado = false;

  for (const plan of conAviso) {
    if (enviados + fallidos >= TOPE_ENVIOS) {
      cortado = true;
      break;
    }

    if (enviados + fallidos > 0) await esperar(RITMO_MS);

    // RESERVAR ANTES DE ENVIAR. Si otra ejecución se adelantó, aquí
    // vuelve menos de lo pedido —o nada— y el correo se ajusta a lo que
    // esta ejecución tiene derecho a mandar.
    const pedidas = plan.secciones.flatMap((seccion) =>
      seccion.nuevos.map((modulo) => ({ alumnoId: plan.alumno.alumnoId, moduloId: modulo.id }))
    );

    const reservadas = await reservarAvisos(pedidas);
    if (reservadas.size === 0) continue;

    const recortado: PlanAlumno = {
      ...plan,
      secciones: plan.secciones
        .map((seccion) => ({
          ...seccion,
          nuevos: seccion.nuevos.filter((modulo) =>
            reservadas.has(claveAviso(plan.alumno.alumnoId, modulo.id))
          ),
        }))
        .filter((seccion) => seccion.nuevos.length > 0),
    };

    const ids = recortado.secciones.flatMap((seccion) => seccion.nuevos.map((m) => m.id));

    const resultado = await enviarAviso(plan.alumno.email, await componer(recortado));

    if (resultado.ok) {
      await confirmarAvisos(plan.alumno.alumnoId, ids, resultado.id);
      enviados++;
      modulos += ids.length;
    } else {
      // Se sueltan las reservas: mañana se reintenta y el módulo sigue
      // dentro de la ventana de dos días.
      await soltarAvisos(plan.alumno.alumnoId, ids);
      fallidos++;
    }
  }

  return NextResponse.json({
    modo: "envio",
    alumnos: planes.length,
    correos: enviados,
    modulos,
    fallidos,
    cortadoPorTope: cortado,
    descartados: resumirDescartes(planes),
  });
}

// ---------------------------------------------------------------
// APOYO
// ---------------------------------------------------------------

/** Por qué un alumno no recibe nada. Null = sí recibe. */
function motivoParaNoEnviar(
  alumno: AlumnoAviso,
  dadoDeBaja: boolean,
  secciones: number
): string | null {
  if (secciones === 0) return "sin aperturas";
  if (alumno.email.trim() === "") return "sin email";
  if (alumno.fechaInicio === null) return "sin fecha de inicio";
  if (dadoDeBaja) return "dado de baja";
  return null;
}

function resumirDescartes(planes: PlanAlumno[]): Record<string, number> {
  const cuenta: Record<string, number> = {};
  for (const plan of planes) {
    if (plan.motivo === null) continue;
    cuenta[plan.motivo] = (cuenta[plan.motivo] ?? 0) + 1;
  }
  return cuenta;
}

/** Del plan calculado al correo, con sus enlaces ya montados. */
async function componer(plan: PlanAlumno): Promise<AvisoApertura> {
  const base = urlBase();
  const token = await crearTokenBaja(plan.alumno.alumnoId);
  const parametro = `?t=${encodeURIComponent(token)}`;

  const secciones: SeccionAviso[] = plan.secciones.map((seccion) => {
    // El botón abre lo que el correo anuncia: la primera lección del
    // primer módulo que se acaba de abrir. Si ese módulo estuviera
    // vacío, el índice del curso antes que un enlace roto.
    const destino = seccion.nuevos.find((modulo) => modulo.destino !== null)?.destino ?? null;

    return {
      curso: seccion.curso,
      modulos: seccion.nuevos.map((modulo) => ({
        titulo: modulo.titulo,
        totalLecciones: modulo.totalLecciones,
      })),
      enlace: destino
        ? `${base}/curso/${seccion.slug}/${destino}`
        : `${base}/curso/${seccion.slug}`,
      restantes: seccion.restantes,
    };
  });

  const semana = Math.max(
    1,
    ...plan.secciones.flatMap((seccion) =>
      seccion.nuevos.map((modulo) => semanaDelDrip(modulo.visibleAfter))
    )
  );

  return {
    nombre: plan.alumno.nombre.trim().split(" ")[0] ?? "",
    secciones,
    semana,
    enlaceBaja: `${base}/avisos/baja${parametro}`,
    enlaceBajaDirecto: `${base}/api/avisos/baja${parametro}`,
  };
}

/**
 * El correo de prueba cuando hoy no hay ninguna apertura de verdad.
 *
 * Datos inventados a propósito y reconocibles como tales, para que
 * nadie confunda una prueba con un envío real al mirar el buzón.
 */
async function avisoDeMuestra(): Promise<AvisoApertura> {
  const base = urlBase();
  const token = await crearTokenBaja("muestra");
  const parametro = `?t=${encodeURIComponent(token)}`;

  return {
    nombre: "Marta",
    secciones: [
      {
        curso: "Curso de inglés general B2",
        modulos: [
          { titulo: "Reported speech in professional contexts", totalLecciones: 4 },
          { titulo: "Hedging and diplomatic language", totalLecciones: 4 },
        ],
        enlace: `${base}/curso/curso-ingles-general-b2`,
        restantes: 171,
      },
    ],
    semana: 5,
    enlaceBaja: `${base}/avisos/baja${parametro}`,
    enlaceBajaDirecto: `${base}/api/avisos/baja${parametro}`,
  };
}
