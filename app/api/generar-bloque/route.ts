// ---------------------------------------------------------------
// GENERACIÓN DE UN BLOQUE NUEVO
//
// Recibe el id del alumno, lee de DRC Gestión todo lo que sabemos de
// él —su última clase, las anteriores, su perfil, su plan— y le pide a
// Claude UN bloque de diez ejercicios con la forma del tipo `Bloque`.
//
// UN SOLO MODO. Ya no viene `modo` en el cuerpo: había tres y el alumno
// elegía cuál, cuando lo que necesita es un bloque que sea las cuatro
// fuentes a la vez. El prompt que las combina vive en
// `lib/prompt-bloque.ts`; aquí queda la fontanería: sesión, lecturas,
// presupuesto de tiempo, flujo y guardado.
//
// Se llama a la API con `fetch` en vez del SDK oficial a propósito:
// el proyecto no debe crecer en dependencias.
//
// Si no hay clave, o si el modelo devuelve algo que no valida, se
// sirve un bloque del banco de reserva. Nunca se devuelve un bloque
// a medio formar.
// ---------------------------------------------------------------

import { NextResponse } from "next/server";
import type { Bloque, TipoExamen } from "@/lib/data";
import { anterioresA, historialDeClases, obtenerAlumno } from "@/lib/gestion";
import { sesionActual } from "@/lib/sesion-servidor";
import { detectarExamen, formatearFecha, nivelDeBloque } from "@/lib/perfil";
import { MODO_ACTUAL } from "@/lib/modos";
import {
  construirSistema,
  construirUsuario,
  hayMateriaPrima,
  type MateriaPrima,
} from "@/lib/prompt-bloque";
import { bloqueDeBanco } from "@/lib/banco";
import { validarBloque } from "@/lib/validarBloque";
import { extraerJson } from "@/lib/json";
import { revisarBloque, type Revision } from "@/lib/revisor";
import { guardarBloqueGenerado, leerUltimaGeneracion } from "@/lib/progreso-servidor";
import { calcularDisponibilidad, comoFecha } from "@/lib/limites";
import { abrirPlazo, conLimite, conLimiteOAlternativa, describir, type Plazo } from "@/lib/tiempo";
import { TIPO_FLUJO, type EventoGeneracion, type Origen } from "@/lib/generacion";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ---------------------------------------------------------------
// EL TECHO, Y POR QUÉ NO SE MUEVE
//
// 60 SEGUNDOS ES EL MÁXIMO DEL PLAN, no una elección nuestra. El
// proyecto está en el plan Hobby de Vercel, donde `maxDuration` no puede
// pasar de 60: escribir 120 aquí no alargaría nada, la plataforma
// cortaría igual y el alumno recibiría un 504 del gateway en vez de un
// bloque.
//
// Eso es lo que decide todo el presupuesto de abajo. Un bloque de diez
// ejercicios tarda, medido en cinco tiradas contra la API real, entre 43
// y 52 segundos (media 48). La revisión son 3 más. No cabe una segunda
// generación, así que NO HAY REGENERACIÓN: el revisor deja su veredicto
// guardado y el bloque sale igual.
//
// Si el proyecto pasa algún día a Pro, el techo sube a 300 y lo que hay
// que tocar es esto: `maxDuration` a 120, `PRESUPUESTO_IA_MS` a 100_000 y
// devolver la regeneración a `generarConRevision`.
// ---------------------------------------------------------------
export const maxDuration = 60;

const MODELO = "claude-sonnet-4-6";
const URL_API = "https://api.anthropic.com/v1/messages";
const ESPERA_BANCO_MS = 1600; // el banco responde al instante: sin esto la demo se siente falsa

// ---------------------------------------------------------------
// PRESUPUESTO DE TIEMPO
//
// Un único presupuesto para toda la fase de IA; cada llamada solo puede
// gastar lo que quede. Sin esto cada una respeta su propio máximo y el
// total es la suma, que es como se llegaba a los 210 segundos de antes.
//
// La cuenta, con los números medidos:
//
//   lecturas (sesión, y ficha e historial en paralelo)  ~1s    · tope 5+5
//   generación                                          43-52s · tope 52
//   revisión                                            3s     · lo que sobre
//   guardado                                            <1s    · tope 5
//
// El peor caso previsto es que la generación se coma los 52 segundos
// enteros: entonces no queda revisión, el bloque sale sin revisar y
// sigue estando por debajo del techo. El caso malo de verdad —que tarde
// MÁS de 52— se corta y se sirve el banco, que es exactamente lo que
// pasaba antes a los 45.
//
// LA REVISIÓN COBRA LO QUE SOBRA, y por eso corre unas veces sí y otras
// no. Es a propósito: entre un bloque suyo sin revisar y un bloque
// genérico del banco, gana el suyo. Reservarle cinco segundos fijos
// obligaría a cortar la generación en 47, y con eso una de cada cinco
// personas acabaría en el banco.
// ---------------------------------------------------------------

const TIEMPO_MAXIMO_MS = 52_000; // tope de UNA llamada al modelo
const PRESUPUESTO_IA_MS = 52_000; // tope de TODA la fase de generación
// Ocho, y no cinco. No le quita nada a la generación —esta corre antes y
// se lleva lo que necesite— así que es solo el tope de lo que la revisión
// puede gastar de lo que sobre. Con cinco se quedaba a medias en tiradas
// donde había sitio de sobra: medido, una revisión tarda entre 0,9 y más
// de 5 segundos según lo cargada que esté la API.
const TIEMPO_REVISOR_MS = 8_000;
const TIEMPO_BASE_MS = 5_000; // tope de una consulta a Supabase

// Siguen siendo dos porque un fallo rápido —un 429, un JSON cortado— deja
// sitio de sobra para otro intento. El presupuesto es quien decide: si la
// primera llamada se comió el reloj, no hay segunda.
const INTENTOS = 2;

/** Lo que se reserva para el guardado y el cierre del flujo. */
const RESERVA_FINAL_MS = 6_000;

/**
 * Deja constancia de un guardado que no salió.
 *
 * NO CORTA LA RESPUESTA, y eso no cambia: llegados a ese punto el bloque
 * ya está generado y pagado, y dejar al alumno con el spinner después de
 * cincuenta segundos sería peor que perder la fila.
 *
 * Lo que cambia es que ahora se ve. El aviso de `guardarBloqueGenerado`
 * se pierde entre los de una petición larga, y este fallo tiene una
 * consecuencia que no se parece a un aviso: el alumno practica un bloque
 * que al recargar no existe. Pasó de verdad —una CHECK de `modo` sin
 * migrar— y no se notó hasta que alguien fue a buscar la fila a mano.
 *
 * El marcador va en mayúsculas y con el motivo delante para que se pueda
 * filtrar en los logs de la plataforma sin leerlos enteros.
 */
function avisarGuardadoPerdido(traza: Traza, origen: Origen, bloqueId: string) {
  traza("guardado:PERDIDO", `${origen} · ${bloqueId}`);
  console.error(
    `[generar-bloque] BLOQUE NO GUARDADO (${origen}) · ${bloqueId} — el alumno lo va a ver ` +
      "y al recargar no estará. Mira el aviso de [progreso] justo encima: si habla de " +
      "bloques_generados_modo_valido, falta la migración de supabase/lms-esquema.sql."
  );
}

// `Origen` y la forma de la respuesta viven ahora en `lib/generacion.ts`,
// que es el contrato que comparten esta ruta y el cliente que la lee.

function esperar(ms: number) {
  return new Promise<void>((resolver) => setTimeout(resolver, ms));
}

// ---------------------------------------------------------------
// TRAZA TEMPORAL
//
// Instrumentación puesta para localizar en qué punto se quedaba colgada
// la generación. Cada petición lleva un identificador corto y cada
// etapa deja su marca con los milisegundos transcurridos, de modo que
// en el log se lee la secuencia completa y dónde se detuvo.
//
// QUITAR cuando el incidente esté cerrado. Nada de esto imprime datos
// del alumno ni, por supuesto, la clave.
// ---------------------------------------------------------------

type Traza = (etapa: string, detalle?: string) => void;

function abrirTraza(): { traza: Traza; plazo: Plazo } {
  const id = Math.random().toString(36).slice(2, 8);
  const plazo = abrirPlazo(maxDuration * 1000);

  const traza: Traza = (etapa, detalle) => {
    const marca = `[generar-bloque:${id}] +${plazo.transcurrido()}ms ${etapa}`;
    console.info(detalle ? `${marca} · ${detalle}` : marca);
  };

  return { traza, plazo };
}

/**
 * Envuelve la generación en un flujo NDJSON: una línea JSON por evento,
 * emitida en el momento en que ocurre.
 *
 * Se responde en directo y no de una vez al final porque la pantalla
 * necesita saber en qué punto va, y la única fuente honesta de eso es
 * esta función según avanza. Un temporizador en el cliente adivinando
 * etapas diría "revisando" cuando el revisor ni siquiera ha arrancado.
 *
 * Todo lo que pueda fallar antes de aquí —sesión, ficha, modo— ya ha
 * respondido con su código HTTP. A partir de este punto la respuesta es
 * siempre 200: el estado viaja dentro del flujo, porque las cabeceras ya
 * salieron cuando se emitió la primera etapa.
 */
function flujoDeGeneracion(
  traza: Traza,
  ejecutar: (emitir: (evento: EventoGeneracion) => void) => Promise<void>
): Response {
  const codificador = new TextEncoder();

  const cuerpo = new ReadableStream<Uint8Array>({
    async start(controlador) {
      let abierto = true;

      const emitir = (evento: EventoGeneracion) => {
        if (!abierto) return;
        controlador.enqueue(codificador.encode(`${JSON.stringify(evento)}\n`));
      };

      try {
        await ejecutar(emitir);
      } catch (error) {
        // Que no se escape nada: un flujo que se corta sin decir por qué
        // deja al alumno con la barra a medias y sin mensaje.
        traza("flujo:error", describir(error));
        console.error("[generar-bloque] La generación se rompió:", describir(error));
        emitir({
          tipo: "error",
          mensaje: "No hemos podido preparar el bloque. Inténtalo otra vez.",
        });
      } finally {
        abierto = false;
        controlador.close();
      }
    },
  });

  return new Response(cuerpo, {
    headers: {
      "content-type": `${TIPO_FLUJO}; charset=utf-8`,
      // `no-transform` y `x-accel-buffering` para que ningún proxy por el
      // camino acumule las líneas y las entregue juntas al final: eso
      // devolvería exactamente el spinner mudo que estamos quitando.
      "cache-control": "no-store, no-transform",
      "x-accel-buffering": "no",
    },
  });
}

/**
 * Lo que se le responde a quien pulsa cuando todavía no le toca.
 *
 * Es la red de seguridad, no el camino normal: aquí se llega con una
 * pestaña que lleva horas abierta. Aun así se cuenta igual que en la
 * tarjeta —de qué depende, no qué tiene prohibido— porque el alumno no
 * tiene forma de saber que su pantalla estaba vieja.
 */
function mensajeDeEspera(tuvoClase: boolean): string {
  return tuvoClase
    ? "Ya has practicado lo de tu última clase. En cuanto tengas la siguiente, preparamos el próximo bloque."
    : "Ya tienes tu bloque con lo que sabemos de ti. En cuanto se analice tu primera clase, preparamos el siguiente.";
}

/**
 * Qué se sabe de la clave sin decir cuál es.
 *
 * `sk-ant-` es el prefijo público de todas las claves de Anthropic, así
 * que mostrarlo no revela nada, y la longitud confirma que llegó entera.
 * Lo que de verdad importa aquí es el aviso de espacios o saltos de
 * línea: una clave recién rotada y pegada con un `\n` al final hace que
 * `fetch` lance `Invalid header value` antes de salir de la instancia,
 * y el fallo se parecía mucho a un problema de red.
 */
function huellaClave(clave: string | undefined): string {
  if (clave === undefined) return "AUSENTE";
  if (clave.trim() === "") return "VACÍA";

  const limpia = clave.trim();
  const notas = [`len=${limpia.length}`, `prefijo=${limpia.slice(0, 7)}`];

  if (limpia !== clave) notas.push("¡CON ESPACIOS ALREDEDOR!");
  if (/[\r\n]/.test(clave)) notas.push("¡CON SALTO DE LÍNEA!");

  return notas.join(" ");
}

/**
 * Los bloques generados conviven en localStorage con los estáticos:
 * les damos un id propio para que nunca choquen entre sí.
 */
function conIdPropio(bloque: Bloque): Bloque {
  const sufijo = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const id = `gen-${sufijo}`;
  return {
    ...bloque,
    id,
    ejercicios: bloque.ejercicios.map((ejercicio, i) => ({ ...ejercicio, id: `${id}-${i + 1}` })),
  };
}

// ---------------------------------------------------------------
// LLAMADA AL MODELO
// ---------------------------------------------------------------

/**
 * El resultado de pedir un bloque, distinguiendo si vale la pena
 * insistir. Antes todo fallo devolvía `null` y se reintentaba siempre:
 * con una clave revocada eso son dos esperas completas para obtener el
 * mismo 401 dos veces.
 */
type ResultadoModelo =
  | { estado: "ok"; bloque: Bloque }
  | { estado: "reintentable"; motivo: string }
  | { estado: "definitivo"; motivo: string };

/** Un 429 o un 5xx pueden ir bien al segundo intento; un 401 no. */
function esReintentable(codigo: number): boolean {
  return codigo === 408 || codigo === 409 || codigo === 429 || codigo >= 500;
}

async function pedirBloqueAlModelo(
  clave: string,
  sistema: string,
  usuario: string,
  limiteMs: number,
  traza: Traza
): Promise<ResultadoModelo> {
  const plazo = Math.min(limiteMs, TIEMPO_MAXIMO_MS);
  if (plazo < 1_000) {
    return { estado: "definitivo", motivo: `sin margen (${plazo}ms)` };
  }

  const control = new AbortController();
  const corte = setTimeout(() => control.abort(), plazo);
  const arranque = Date.now();

  try {
    traza("modelo:petición", `${MODELO} · plazo ${plazo}ms`);

    const respuesta = await fetch(URL_API, {
      method: "POST",
      signal: control.signal,
      headers: {
        "content-type": "application/json",
        "x-api-key": clave,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODELO,
        // El doble que con cinco ejercicios, por lo mismo. Un bloque de
        // diez son unos 2.500 tokens de salida medidos, así que 16.000
        // no es lo que se gasta: es el margen para que una respuesta
        // larga no llegue cortada, que aquí se leería como JSON
        // inválido y costaría la generación entera.
        max_tokens: 16000,
        system: sistema,
        messages: [{ role: "user", content: usuario }],
      }),
    });

    traza("modelo:cabeceras", `HTTP ${respuesta.status} en ${Date.now() - arranque}ms`);

    if (!respuesta.ok) {
      const detalle = await respuesta.text();
      const motivo = `HTTP ${respuesta.status}: ${detalle.slice(0, 300)}`;
      console.error(`[generar-bloque] La API respondió ${motivo}`);
      return esReintentable(respuesta.status)
        ? { estado: "reintentable", motivo }
        : { estado: "definitivo", motivo };
    }

    const cuerpo: unknown = await respuesta.json();
    traza("modelo:cuerpo", `leído en ${Date.now() - arranque}ms`);

    if (typeof cuerpo !== "object" || cuerpo === null) {
      return { estado: "reintentable", motivo: "respuesta que no es un objeto" };
    }

    const contenido = (cuerpo as { content?: unknown }).content;
    if (!Array.isArray(contenido)) {
      return { estado: "reintentable", motivo: "respuesta sin content" };
    }

    const texto = contenido
      .filter(
        (bloque): bloque is { type: "text"; text: string } =>
          typeof bloque === "object" &&
          bloque !== null &&
          (bloque as { type?: unknown }).type === "text" &&
          typeof (bloque as { text?: unknown }).text === "string"
      )
      .map((bloque) => bloque.text)
      .join("\n");

    if (!texto.trim()) {
      return { estado: "reintentable", motivo: "respuesta sin texto" };
    }

    const bloque = validarBloque(extraerJson(texto));
    return bloque
      ? { estado: "ok", bloque }
      : { estado: "reintentable", motivo: "no pasó la validación estructural" };
  } catch (error) {
    // Distinguir el corte por plazo del resto: un `AbortError` genérico
    // en el log no dejaba claro si era la red o nuestro propio timeout.
    const motivo = control.signal.aborted
      ? `timeout de ${plazo / 1000}s`
      : `fallo de red: ${describir(error)}`;
    console.error(`[generar-bloque] Falló la llamada a la API — ${motivo}`);
    traza("modelo:error", motivo);
    return { estado: "reintentable", motivo };
  } finally {
    clearTimeout(corte);
  }
}

// ---------------------------------------------------------------
// GENERACIÓN CON REVISIÓN
// ---------------------------------------------------------------

/**
 * Pide bloques hasta que uno pase la validación estructural, sin salirse
 * del presupuesto y sin insistir cuando el fallo no va a cambiar.
 */
async function generarEstructural(
  clave: string,
  sistema: string,
  usuario: string,
  plazo: Plazo,
  traza: Traza
): Promise<Bloque | null> {
  for (let intento = 1; intento <= INTENTOS; intento++) {
    if (plazo.agotado()) {
      traza("generación:presupuesto agotado", `antes del intento ${intento}/${INTENTOS}`);
      return null;
    }

    const resultado = await pedirBloqueAlModelo(
      clave,
      sistema,
      usuario,
      plazo.hasta(TIEMPO_MAXIMO_MS),
      traza
    );

    if (resultado.estado === "ok") {
      traza("generación:bloque válido", `intento ${intento}/${INTENTOS}`);
      return resultado.bloque;
    }

    console.warn(
      `[generar-bloque] Intento ${intento}/${INTENTOS} descartado — ${resultado.motivo}`
    );

    if (resultado.estado === "definitivo") {
      traza("generación:fallo definitivo", "no se reintenta");
      return null;
    }
  }

  return null;
}

/** Deja en el log lo necesario para medir después cuánto y por qué falla. */
function registrarRevision(etiqueta: string, revision: Revision) {
  if (revision.estado === "apto") {
    console.info(`[revisor] ${etiqueta}: APTO en ${revision.ms}ms`);
    return;
  }

  if (revision.estado === "no-disponible") {
    console.warn(
      `[revisor] ${etiqueta}: NO DISPONIBLE en ${revision.ms}ms (${revision.motivo}). Se devuelve el bloque sin revisar.`
    );
    return;
  }

  const tipos = revision.problemas.map((p) => p.tipo).join(", ");
  console.warn(
    `[revisor] ${etiqueta}: NO APTO en ${revision.ms}ms — ${revision.problemas.length} problema(s): ${tipos}`
  );
  for (const problema of revision.problemas) {
    console.warn(`[revisor]    ej${problema.ejercicio} · ${problema.tipo} · ${problema.detalle}`);
  }
}

/**
 * Genera un bloque y lo pasa por el revisor. Devuelve null cuando no hay
 * nada publicable, que es la señal para servir el banco.
 *
 * YA NO REGENERA, y es el cambio que trajeron los diez ejercicios. Antes,
 * si el revisor tumbaba el bloque, se pedía otro avisando de lo que había
 * fallado. Con una generación de 48 segundos medidos y un techo de
 * plataforma de 60, ese segundo intento no cabe: intentarlo significaría
 * cortarlo a la mitad y acabar en el banco, que es peor que un bloque
 * suyo con un defecto señalado.
 *
 * Así que el veredicto ahora se GUARDA en vez de mandar. Va a
 * `bloques_generados.revision` y es lo que deja medir qué proporción sale
 * limpia y con qué problemas. Cuando esa medida diga que hace falta
 * volver a filtrar, se sabrá cuánto cuesta el presupuesto que hace falta
 * para ello.
 *
 * La revisión NUNCA deja al alumno sin ejercicios: si falla, expira o no
 * le queda presupuesto, el bloque sale igual con el veredicto que haya.
 */
async function generarConRevision(
  clave: string,
  sistema: string,
  usuario: string,
  examen: TipoExamen | null,
  plazo: Plazo,
  traza: Traza,
  emitir: (evento: EventoGeneracion) => void
): Promise<{ bloque: Bloque; revision: Revision; intentos: number } | null> {
  traza("generación:inicio", `presupuesto ${plazo.restante()}ms`);

  // Cada `emitir` va justo antes de la espera que describe, nunca
  // después: es lo que hace que el texto de la pantalla y lo que está
  // ocurriendo aquí dentro sean la misma cosa.
  emitir({ tipo: "etapa", etapa: "escribiendo", ms: plazo.transcurrido() });
  const bloque = await generarEstructural(clave, sistema, usuario, plazo, traza);
  if (!bloque) return null;

  // Con lo que sobre. La generación se lleva casi todo el presupuesto y
  // hay tiradas en las que no queda nada; entonces `revisarBloque`
  // devuelve "no-disponible" sin llamar a nadie y el bloque sale sin
  // revisar, que es exactamente lo que se quiere.
  traza("revisión:inicio", `restante ${plazo.restante()}ms`);
  emitir({ tipo: "etapa", etapa: "revisando", ms: plazo.transcurrido() });
  const revision = await revisarBloque(clave, bloque, examen, plazo.hasta(TIEMPO_REVISOR_MS));
  registrarRevision("revisión", revision);

  return { bloque, revision, intentos: 1 };
}

// ---------------------------------------------------------------
// HANDLER
// ---------------------------------------------------------------

export async function POST(peticion: Request) {
  const { traza, plazo: plazoPeticion } = abrirTraza();
  traza("entrada");

  // El `alumnoId` llega en el cuerpo, o sea del cliente, así que no se
  // acepta sin comprobar: sin esto un alumno pediría bloques hechos con
  // la última clase y el perfil de otro. La sesión se lee de la cookie
  // firmada, igual que en las páginas.
  //
  // Con plazo, porque debajo hay una consulta a Supabase: `sesionViva`
  // ya falla abierto ante un error, pero un socket que no responde no
  // es un error, es una espera sin fin.
  let sesion;
  try {
    sesion = await conLimite(sesionActual(), TIEMPO_BASE_MS, "sesionActual");
  } catch (error) {
    traza("sesión:fallo", describir(error));
    console.error("[generar-bloque] No se pudo comprobar la sesión:", describir(error));
    return NextResponse.json(
      { error: "No hemos podido comprobar tu sesión. Vuelve a intentarlo en un momento." },
      { status: 503 }
    );
  }

  if (!sesion) {
    traza("sesión:ausente");
    return NextResponse.json(
      { error: "Tu sesión ha caducado. Vuelve a entrar desde el enlace de tu email." },
      { status: 401 }
    );
  }
  traza("sesión:ok", `rol=${sesion.rol}`);

  let cuerpo: unknown;
  try {
    cuerpo = await peticion.json();
  } catch {
    return NextResponse.json({ error: "El cuerpo de la petición no es JSON." }, { status: 400 });
  }

  // `modo` ya no se lee. Si llega —de una pestaña abierta desde antes
  // del cambio— se ignora en silencio: pedía uno de los tres modos
  // antiguos y lo que se le va a dar es el bloque único, que incluye lo
  // que ese modo hacía. Rechazar la petición sería hacerle recargar para
  // acabar en el mismo sitio.
  const datos = (cuerpo ?? {}) as { alumnoId?: unknown; excluir?: unknown };
  const pedido = typeof datos.alumnoId === "string" ? datos.alumnoId : "";

  // Al alumno se le impone el suyo y no se discute. El equipo sí puede
  // generar para cualquiera: es lo que le deja revisar el producto.
  const alumnoId = sesion.rol === "alumno" ? sesion.alumnoId : pedido;
  if (sesion.rol === "alumno" && pedido !== "" && pedido !== sesion.alumnoId) {
    return NextResponse.json({ error: "Esa ficha no es la tuya." }, { status: 403 });
  }

  /**
   * Un bloque generado por el equipo SÍ se guarda, pero marcado.
   *
   * Antes no se guardaba en absoluto, y el resultado era que quien lo
   * generaba no podía abrirlo: la ficha lo enseñaba mientras durase la
   * visita y al pulsar «Empezar» el servidor no lo encontraba. Se
   * generaba un bloque para revisarlo y era justo lo único que no se
   * podía hacer con él.
   *
   * Lo que se conserva del criterio anterior es el motivo real: el
   * alumno no pidió ese bloque y no tiene por qué encontrárselo en su
   * práctica. Eso ahora lo resuelve `generado_por_equipo`, que lo deja
   * fuera de su lista, de su espera entre generaciones y del panel, sin
   * dejarlo fuera de la base.
   *
   * Sigue siendo el mismo criterio que en `app/api/progreso`: lo que
   * hace el equipo mientras revisa no es actividad del alumno.
   */
  const porEquipo = sesion.rol !== "alumno";

  // ---------------------------------------------------------------
  // LAS LECTURAS, LAS DOS A LA VEZ
  //
  // La ficha y el historial de clases salen en paralelo y no en serie, y
  // no es una optimización de adorno: el presupuesto de esta ruta va
  // justo, y encadenarlas costaría un viaje entero a Gestión antes de
  // que el modelo empiece a escribir.
  //
  // Se puede porque el historial NO necesita saber cuál es la última
  // clase para pedirse: se traen las cinco más recientes y luego
  // `anterioresA` descarta la que ya venía por la vista. El recorte se
  // hace en memoria, cuando las dos respuestas ya están.
  // ---------------------------------------------------------------
  let alumno;
  let historial;
  try {
    traza("gestión:lectura");
    [alumno, historial] = await conLimite(
      Promise.all([
        alumnoId ? obtenerAlumno(alumnoId) : Promise.resolve(null),
        // Sin id no hay a quién leerle el historial. Devuelve vacío en
        // vez de fallar: es material que mejora el bloque, no material
        // sin el que no haya bloque.
        alumnoId ? historialDeClases(alumnoId) : Promise.resolve([]),
      ]),
      TIEMPO_BASE_MS,
      "gestión"
    );
  } catch (error) {
    traza("gestión:fallo", describir(error));
    console.error("[generar-bloque] No se pudo leer la ficha del alumno:", describir(error));
    return NextResponse.json(
      { error: "No hemos podido leer tu ficha ahora mismo. Vuelve a intentarlo en un momento." },
      { status: 503 }
    );
  }

  if (!alumno) {
    traza("gestión:sin ficha");
    return NextResponse.json({ error: "No encontramos a ese alumno." }, { status: 404 });
  }

  const { perfil, ultimaClase } = alumno;
  const anteriores = anterioresA(historial, ultimaClase?.analizadoEn ?? null);
  traza("gestión:ok", `${anteriores.length} clase(s) anterior(es)`);

  const titulosExcluidos = Array.isArray(datos.excluir)
    ? datos.excluir.filter((t): t is string => typeof t === "string").slice(0, 20)
    : [];

  // Sin perfil (alumno con clase pero sin ficha) tiramos de B1, que es
  // el nivel con más alumnos y más material.
  const nivel = perfil ? nivelDeBloque(perfil.nivel) : "B1";

  // ---------------------------------------------------------------
  // LA MATERIA PRIMA
  //
  // Las cuatro fuentes juntas, cada una si la hay. Aquí es donde se ve
  // lo que cambió al fundir los tres modos: antes, cada modo comprobaba
  // que tuviera SU fuente y devolvía 409 si le faltaba. Ahora basta con
  // tener una cualquiera, y las que falten simplemente no entran en el
  // mensaje.
  // ---------------------------------------------------------------
  const materia: MateriaPrima = {
    nombre: perfil?.nombre.trim() || "el alumno",
    nivel,
    ultimaClase: ultimaClase
      ? {
          titulo: ultimaClase.titulo,
          fecha: formatearFecha(ultimaClase.fechaClase),
          temas: ultimaClase.temas,
          errores: ultimaClase.errores,
          priority: ultimaClase.guiaProxima?.priority ?? "",
          mainFocus: ultimaClase.guiaProxima?.mainFocus ?? "",
        }
      : null,
    anteriores: anteriores.map((clase) => ({
      fecha: formatearFecha(clase.fechaClase),
      titulo: clase.titulo,
      errores: clase.errores,
    })),
    ocupacion: perfil?.ocupacion ?? null,
    objetivo: perfil?.objetivoPerfil ?? null,
    // Se calcula aparte del reparto porque el revisor también lo
    // necesita: es lo que le dice contra qué especificaciones comprobar.
    examen: perfil ? detectarExamen(perfil.plan) : null,
    titulosExcluidos,
  };

  // Sin ninguna de las cuatro fuentes no hay nada que sea suyo, y la
  // tarjeta ni siquiera se le ofrece. Llegar aquí es una petición a mano
  // o una pestaña muy vieja.
  if (!hayMateriaPrima(materia)) {
    traza("sin materia prima");
    return NextResponse.json(
      { error: "Todavía no sabemos lo suficiente de ti para prepararte un bloque." },
      { status: 409 }
    );
  }

  // ---------------------------------------------------------------
  // ¿TOCA GENERAR?
  //
  // Una sola regla: se desbloquea cuando entra un transcript nuevo. La
  // tarjeta ya llega sabiéndolo, así que en condiciones normales el
  // alumno no pulsa cuando no le toca. Esto es la comprobación de
  // verdad, la que aguanta una pestaña vieja o una petición a mano.
  //
  // Solo para alumnos. El rol sale de la cookie firmada —el mismo dato
  // que decide `porEquipo` más arriba— así que no hay nada que el
  // cliente pueda mandar para saltárselo, y la superficie es exactamente
  // la del acceso de administrador, que ya da mucho más. Además, lo que
  // genera el equipo se guarda marcado y `leerUltimaGeneracion` no lo
  // mira: no le gasta la espera a nadie.
  // ---------------------------------------------------------------
  if (sesion.rol === "alumno") {
    const ultima = await conLimiteOAlternativa<string | null>(
      leerUltimaGeneracion(alumnoId),
      TIEMPO_BASE_MS,
      "leerUltimaGeneracion",
      // Si la base no contesta se deja pasar. Es la misma decisión que
      // toma `consultarViva` con las sesiones: un mal minuto de Supabase
      // no puede dejar sin práctica a quien sí le tocaba.
      null
    );

    const disponibilidad = calcularDisponibilidad(
      comoFecha(ultima),
      comoFecha(ultimaClase?.analizadoEn),
      new Date()
    );

    if (!disponibilidad.disponible) {
      traza("límite", disponibilidad.motivo);
      return NextResponse.json(
        {
          error: mensajeDeEspera(ultimaClase !== null),
          motivo: disponibilidad.motivo,
        },
        { status: 409 }
      );
    }
  }

  // La clave se recorta: recién rotada y pegada con un salto de línea,
  // `fetch` lanzaría `Invalid header value` en cada intento y el alumno
  // acabaría en el banco sin que el log dijera por qué.
  const claveCruda = process.env.ANTHROPIC_API_KEY;
  const clave = claveCruda?.trim();
  traza("clave", huellaClave(claveCruda));

  return flujoDeGeneracion(traza, async (emitir) => {
    if (clave) {
      const sistema = construirSistema(nivel);
      const usuario = construirUsuario(materia);

      // El presupuesto de IA es el menor entre su propio tope y lo que
      // queda de la petición: lo gastado en sesión y ficha ya no está, y
      // hay que dejar sitio para el guardado.
      const plazoIa = abrirPlazo(
        Math.min(PRESUPUESTO_IA_MS, plazoPeticion.restante() - RESERVA_FINAL_MS)
      );

      const generado = await generarConRevision(
        clave,
        sistema,
        usuario,
        // El revisor comprueba las especificaciones del examen solo si
        // el alumno prepara uno. Parte del bloque las sigue y parte no,
        // y eso ya se le explica en su propio mensaje.
        materia.examen,
        plazoIa,
        traza,
        emitir
      );

      if (generado) {
        const bloque = conIdPropio(generado.bloque);
        // Se guarda antes de responder, no en segundo plano: si la
        // escritura se quedara a medias, el alumno vería el bloque, lo
        // practicaría y al volver no estaría. El coste es una inserción,
        // que al lado de una llamada a la API de Anthropic no se nota.
        //
        // Con plazo, eso sí, y sin cortar la respuesta si falla: llegados
        // aquí el bloque ya está generado y pagado. Perder la escritura
        // es perder el historial de un bloque; perder la respuesta es
        // dejar al alumno con el spinner después de esperarlo todo.
        traza("guardado:ia");
        emitir({ tipo: "etapa", etapa: "guardando", ms: plazoPeticion.transcurrido() });
        const guardado = await conLimiteOAlternativa(
          // El veredicto MÁS cuántos intentos costó. Hoy `intentos` es
          // siempre 1 —no hay regeneración— y se sigue guardando porque
          // es lo que distinguirá las filas de ahora de las de cuando
          // vuelva a haber presupuesto para un segundo intento.
          guardarBloqueGenerado(
            alumnoId,
            bloque,
            MODO_ACTUAL,
            "ia",
            { ...generado.revision, intentos: generado.intentos },
            porEquipo
          ),
          TIEMPO_BASE_MS,
          "guardarBloqueGenerado(ia)",
          false
        );
        if (!guardado) avisarGuardadoPerdido(traza, "ia", bloque.id);
        traza("salida:ia");
        emitir({ tipo: "listo", bloque, origen: "ia" });
        return;
      }
    }

    // Sin clave, o con la generación descartada: banco de reserva.
    //
    // El banco sigue teniendo bloques de CINCO ejercicios, no de diez, y
    // es una decisión y no un olvido: son textos escritos a mano con el
    // mismo acabado que el catálogo, y duplicarlos a ciegas para cuadrar
    // un número los convertiría en relleno. Un bloque corto y bueno el
    // día que la generación falla es mejor que uno largo y flojo.
    traza("banco:inicio");
    emitir({ tipo: "etapa", etapa: "banco", ms: plazoPeticion.transcurrido() });

    // El retardo hace que la experiencia se sienta igual en la demo, pero
    // solo cuando el banco respondió al instante. Si venimos de agotar el
    // presupuesto de IA, el alumno ya ha esperado de sobra.
    if (plazoPeticion.transcurrido() < ESPERA_BANCO_MS) {
      await esperar(ESPERA_BANCO_MS - plazoPeticion.transcurrido());
    }

    const bloque = conIdPropio(bloqueDeBanco(nivel, titulosExcluidos));
    const guardadoBanco = await conLimiteOAlternativa(
      guardarBloqueGenerado(alumnoId, bloque, MODO_ACTUAL, "banco", null, porEquipo),
      TIEMPO_BASE_MS,
      "guardarBloqueGenerado(banco)",
      false
    );
    if (!guardadoBanco) avisarGuardadoPerdido(traza, "banco", bloque.id);
    traza("salida:banco");
    emitir({ tipo: "listo", bloque, origen: "banco" });
  });
}
