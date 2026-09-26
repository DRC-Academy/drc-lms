// ---------------------------------------------------------------
// EL GENERADOR DE BLOQUES, SIN LA PETICIÓN
//
// Lo que antes vivía entero dentro de `app/api/generar-bloque`: cómo se
// arma la materia prima con lo que dice Gestión, cómo se le pide el
// bloque al modelo, cómo pasa por el revisor y cómo se estampa. La ruta
// sigue siendo la dueña de la sesión, de la regla de «¿toca generar?»,
// del presupuesto de la petición, del flujo NDJSON y del banco de
// reserva; aquí solo está lo que no depende de que haya una petición.
//
// EXISTE PARA QUE HAYA UN SOLO GENERADOR. `scripts/demo.ts` crea los
// bloques del alumno de demostración con estas mismas funciones —el
// mismo prompt, el mismo modelo, el mismo revisor— en vez de con una
// copia que el día que cambie la de verdad ya no se le parezca.
//
// Nada de aquí lee cookies ni cabeceras: el idioma y los plazos los
// pasa quien llama.
// ---------------------------------------------------------------

import "server-only";
import { nivelDelAlumno } from "@/lib/estimacion";
import type { Bloque, PerfilAlumno, TipoExamen, UltimaClase } from "@/lib/data";
import { anterioresA, type ClaseAnalizada } from "@/lib/gestion";
import { detectarExamen, formatearFecha, nivelDeBloque } from "@/lib/perfil";
import type { IdiomaBloque, MateriaPrima } from "@/lib/prompt-bloque";
import { validarBloque } from "@/lib/validarBloque";
import { extraerJson } from "@/lib/json";
import { revisarBloque, type Revision } from "@/lib/revisor";
import { describir, type Plazo } from "@/lib/tiempo";
import type { EventoGeneracion } from "@/lib/generacion";

export const MODELO = "claude-sonnet-4-6";
const URL_API = "https://api.anthropic.com/v1/messages";

/** Tope de UNA llamada al modelo. Ver el presupuesto en la ruta. */
export const TIEMPO_MAXIMO_MS = 52_000;
// Ocho, y no cinco. No le quita nada a la generación —esta corre antes y
// se lleva lo que necesite— así que es solo el tope de lo que la revisión
// puede gastar de lo que sobre. Con cinco se quedaba a medias en tiradas
// donde había sitio de sobra: medido, una revisión tarda entre 0,9 y más
// de 5 segundos según lo cargada que esté la API.
const TIEMPO_REVISOR_MS = 8_000;

// Siguen siendo dos porque un fallo rápido —un 429, un JSON cortado— deja
// sitio de sobra para otro intento. El presupuesto es quien decide: si la
// primera llamada se comió el reloj, no hay segunda.
const INTENTOS = 2;

export type Traza = (etapa: string, detalle?: string) => void;

// ---------------------------------------------------------------
// LA MATERIA PRIMA
// ---------------------------------------------------------------

export type Preparacion = {
  perfil: PerfilAlumno | null;
  ultimaClase: UltimaClase | null;
  anteriores: ClaseAnalizada[];
  nivel: Bloque["nivel"];
  materia: MateriaPrima;
  /** La clase de la que sale el bloque, para estamparla. Null sin clase. */
  claseOrigen: Bloque["claseOrigen"] | null;
};

/**
 * Las cuatro fuentes juntas, cada una si la hay, a partir de las dos
 * lecturas de Gestión (`obtenerAlumno` e `historialDeClases`).
 *
 * Lo que cambió al fundir los tres modos: antes, cada modo comprobaba
 * que tuviera SU fuente y devolvía 409 si le faltaba. Ahora basta con
 * tener una cualquiera, y las que falten simplemente no entran en el
 * mensaje.
 */
export function prepararGeneracion(
  alumnoId: string,
  alumno: { perfil: PerfilAlumno | null; ultimaClase: UltimaClase | null },
  historial: ClaseAnalizada[],
  titulosExcluidos: string[]
): Preparacion {
  const { perfil, ultimaClase } = alumno;
  const anteriores = anterioresA(historial, ultimaClase?.analizadoEn ?? null);

  // Sin perfil (alumno con clase pero sin ficha) tiramos de B1, que es
  // el nivel con más alumnos y más material.
  const nivel = perfil ? nivelDeBloque(nivelDelAlumno(alumnoId, perfil)) : "B1";

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

  // La clase que va a mandar en el bloque, para dejarla escrita en él.
  // `fechaClase` llega de Gestión como día ISO; si un día llegara con
  // otra forma, `validarBloque` la descartaría al releer, así que se
  // recorta aquí a los diez caracteres del día.
  const claseOrigen: Bloque["claseOrigen"] | null = ultimaClase
    ? { fecha: ultimaClase.fechaClase.slice(0, 10), profesor: perfil?.profesor.trim() ?? "" }
    : null;

  return { perfil, ultimaClase, anteriores, nivel, materia, claseOrigen };
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
  traza: Traza,
  topeMs: number
): Promise<ResultadoModelo> {
  const plazo = Math.min(limiteMs, topeMs);
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
  traza: Traza,
  topeMs: number
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
      plazo.hasta(topeMs),
      traza,
      topeMs
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
 *
 * `topeLlamadaMs` es el tope de UNA llamada al modelo. La ruta no lo pasa
 * y se queda con los 52 s que le deja el techo de Vercel; solo
 * `scripts/demo.ts`, que no tiene ese techo, pide más.
 */
export async function generarConRevision(
  clave: string,
  sistema: string,
  usuario: string,
  examen: TipoExamen | null,
  plazo: Plazo,
  traza: Traza,
  emitir: (evento: EventoGeneracion) => void,
  topeLlamadaMs: number = TIEMPO_MAXIMO_MS
): Promise<{ bloque: Bloque; revision: Revision; intentos: number } | null> {
  traza("generación:inicio", `presupuesto ${plazo.restante()}ms`);

  // Cada `emitir` va justo antes de la espera que describe, nunca
  // después: es lo que hace que el texto de la pantalla y lo que está
  // ocurriendo aquí dentro sean la misma cosa.
  emitir({ tipo: "etapa", etapa: "escribiendo", ms: plazo.transcurrido() });
  const bloque = await generarEstructural(clave, sistema, usuario, plazo, traza, topeLlamadaMs);
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
// EL ESTAMPADO
// ---------------------------------------------------------------

/**
 * Los bloques generados conviven en localStorage con los estáticos:
 * les damos un id propio para que nunca choquen entre sí.
 */
export function conIdPropio(bloque: Bloque): Bloque {
  const sufijo = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const id = `gen-${sufijo}`;
  return {
    ...bloque,
    id,
    ejercicios: bloque.ejercicios.map((ejercicio, i) => ({ ...ejercicio, id: `${id}-${i + 1}` })),
  };
}

/**
 * EL IDIOMA LO ESTAMPAMOS NOSOTROS, que es lo que se le pidió al modelo,
 * en vez de pedírselo a él dentro del JSON: un campo que el modelo
 * rellena puede decir "en" debajo de un bloque que se le escapó al
 * español, y entonces el dato miente justo sobre lo que hay que
 * arreglar. Aquí no puede no coincidir.
 *
 * El bloque del banco no pasa por aquí y no lo lleva, que es correcto:
 * los seis del banco están en español, y en `Bloque` la ausencia
 * significa exactamente eso.
 *
 * Y LA CLASE DE LA QUE SALE, también estampada aquí: la fecha es la de
 * la clase analizada que mandó en el prompt y el profesor, el de su
 * ficha. Es lo que después permite que la parada diga «generada a partir
 * de tu clase del 20 de septiembre con Laura» en vez de un «en tu última
 * clase» que caduca con la siguiente. Sin clase analizada no se estampa
 * nada: el bloque salió del perfil y del examen, y no hay clase que
 * atribuirle.
 */
export function estamparBloque(
  generado: Bloque,
  idioma: IdiomaBloque,
  claseOrigen: Bloque["claseOrigen"] | null
): Bloque {
  return {
    ...conIdPropio(generado),
    idioma,
    ...(claseOrigen ? { claseOrigen } : {}),
  };
}
