// ---------------------------------------------------------------
// REESCRIBIR «TU OBJETIVO» EN SEGUNDA PERSONA
//
//   node scripts/reescribir-objetivos.ts              → ensayo, no escribe
//   node scripts/reescribir-objetivos.ts --escribir   → escribe de verdad
//   node scripts/reescribir-objetivos.ts --rehacer    → rehace también las ya hechas
//   node scripts/reescribir-objetivos.ts --alumno=ID  → solo ese alumno
//
// El ensayo hace TODO menos el guardado: lee Gestión, llama al modelo y
// valida. Es la única forma de que la tabla que imprime al final diga
// algo de lo que se va a guardar de verdad; un ensayo que no llamara al
// modelo solo contaría filas.
//
// Antes de la primera ejecución hay que haber corrido
// `supabase/lms-objetivos-alumno.sql` en el proyecto del LMS.
//
// ---------------------------------------------------------------
// QUÉ ARREGLA
//
// `objetivo_perfil` lo escribe la IA de Gestión para el profesor, en
// tercera persona. De los 174 alumnos, 52 lo tienen relleno, 50 pasan el
// cortafuegos de `lib/texto-alumno.ts` y se pintan, y de esos 50
// ninguno le habla al alumno. Debajo del titular "Tu objetivo", y justo
// encima del banner que le promete el B2 para agosto de 2027, eso suena
// a informe interno y se lleva por delante la credibilidad del banner.
//
// ESTO ES UN APAÑO Y CONVIENE QUE SE SEPA. El sitio correcto de la
// reescritura es el prompt de Gestión, escribiendo dos versiones del
// objetivo —la del profesor y la del alumno— junto al original. Mientras
// eso no exista, el LMS se escribe la suya en su propia base. El día que
// Gestión lo haga, esto se borra y la tabla se vacía.
//
// ---------------------------------------------------------------
// LA REGLA QUE NO SE PUEDE ROMPER: NO INVENTAR
//
// Reescribir es cambiar la persona gramatical, no rellenar huecos. Si la
// ficha no dice para qué quiere el alumno el inglés, la salida correcta
// es OMITIR y que la pantalla siga enseñando lo que había. Un objetivo
// inventado en una tarjeta que se titula "Tu objetivo" es peor que uno
// mal redactado: el alumno sabe cuál es el suyo.
// ---------------------------------------------------------------

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { leerEnv } from "./learndash-zip.ts";
import { esParaElAlumno } from "../lib/texto-alumno.ts";
import { huellaObjetivo, objetivoPublicable } from "../lib/objetivo.ts";

const RUTA_ENV = ".env.local";

// El mismo modelo que genera los bloques. Son 52 textos de dos frases:
// el coste es irrelevante y la diferencia de redacción con uno pequeño,
// no. Se guarda en la fila para poder comparar tandas más adelante.
const MODELO = "claude-sonnet-4-6";
const URL_API = "https://api.anthropic.com/v1/messages";

// De cuántos en cuántos se llama. Cuatro a la vez despacha los 52 en
// menos de un minuto sin acercarse a ningún límite de la API.
const EN_PARALELO = 4;

// ---------------------------------------------------------------
// EL PROMPT
// ---------------------------------------------------------------

const SISTEMA = [
  "Reescribes el objetivo de un alumno de DRC Academy, una academia de inglés online para adultos.",
  "",
  "El texto que recibes está escrito PARA SU PROFESOR, en tercera persona. Tu trabajo es reescribirlo",
  "para que lo lea EL PROPIO ALUMNO en su página de progreso, bajo el título «Tu objetivo».",
  "",
  "TONO",
  "- Español de España, tuteando. Segunda persona: háblale a él.",
  "- Una o dos frases. Nunca más de 200 caracteres.",
  "- Cálido y directo, sin solemnidad y sin frases de folleto.",
  "- Concreto y suyo: su trabajo, sus viajes, su examen, lo que diga la ficha.",
  "- TIENE QUE APARECER UN «tu», «tus», «te» o «ti». El texto le habla A ÉL, y un infinitivo suelto",
  "  no lo hace: «Ganar fluidez para el trabajo» no vale; «Ganar fluidez para tu trabajo», sí.",
  "- SIN ÁNIMOS NI VALORACIONES: nada de «¡vamos a por ello!», «buen motivo», «el plazo es ajustado",
  "  pero se puede» ni exclamaciones de aliento. Reescribes lo que dice la ficha; no lo comentas, no",
  "  opinas sobre si es fácil o difícil y no animas. Esta tarjeta va justo encima de una oferta de",
  "  pago: si suena a entrenador personal, lo que va debajo suena a venta.",
  "- Nada de lenguaje de informe: ni «el alumno», ni «se recomienda», ni «su nivel actual», ni notas",
  "  dirigidas al profesor. Si el texto original lleva alguna de esas notas, no la arrastres.",
  "- No empieces con «Tu objetivo es»: el título ya lo dice.",
  "",
  "NO INVENTES NADA. Solo puedes reformular lo que ya dice la ficha: no añadas una profesión, un",
  "examen, un país ni un motivo que no estén escritos ahí.",
  "",
  "CUÁNDO OMITIR",
  "Responde exactamente OMITIR, y nada más, SOLO si la ficha no dice para qué quiere el inglés.",
  "Si lo dice, reescríbelo, aunque lo diga en tres palabras: «mejorar fluidez para el trabajo» ya es",
  "material suficiente. Ante la duda, reescribe.",
  "",
  "Responde SOLO con el texto reescrito, o con OMITIR. Sin comillas y sin nada antes ni después.",
].join("\n");

type Fila = {
  alumno_id: string;
  objetivo_perfil: string | null;
  ocupacion: string | null;
};

function construirUsuario(fila: Fila): string {
  const partes = [`Lo que la ficha dice de su objetivo:\n${(fila.objetivo_perfil ?? "").trim()}`];

  // La ocupación entra como CONTEXTO, no como material que se pueda
  // añadir: es lo que permite elegir bien las palabras —"para tus
  // reuniones" en vez de "para tu trabajo"— cuando el objetivo ya habla
  // de trabajo. Sin esta línea el modelo generaliza; con ella y sin el
  // aviso de abajo, se inventa una profesión en el objetivo de quien no
  // la ha mencionado.
  const ocupacion = (fila.ocupacion ?? "").trim();
  if (ocupacion) {
    partes.push(
      "",
      `A qué se dedica (solo para elegir mejor las palabras, NO para añadirlo si el objetivo no lo menciona):\n${ocupacion}`
    );
  }

  return partes.join("\n");
}

// ---------------------------------------------------------------
// LA LLAMADA
// ---------------------------------------------------------------

/**
 * Qué ha pasado con un objetivo.
 *
 * SON TRES COSAS DISTINTAS Y ANTES ERAN UNA. Esto devolvía `null` tanto
 * cuando el modelo decía OMITIR —la ficha no dice el motivo— como cuando
 * la reescritura no pasaba las reglas de `objetivo.ts`, y el ensayo las
 * contaba juntas bajo "la ficha no dice el motivo". Con eso, diez
 * objetivos perfectamente claros que el validador estaba tirando por no
 * llevar ni un «tu» parecían fichas vacías. Un ensayo que miente sobre
 * por qué no hay texto no sirve para decidir si el prompt está bien.
 */
type Salida =
  | { tipo: "texto"; texto: string }
  | { tipo: "omitido" }
  | { tipo: "rechazado"; crudo: string };

async function reescribir(clave: string, fila: Fila): Promise<Salida> {
  const respuesta = await fetch(URL_API, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": clave,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODELO,
      max_tokens: 300,
      system: SISTEMA,
      messages: [{ role: "user", content: construirUsuario(fila) }],
    }),
  });

  if (!respuesta.ok) {
    throw new Error(`${respuesta.status} ${(await respuesta.text()).slice(0, 200)}`);
  }

  const datos = (await respuesta.json()) as { content: Array<{ text?: string }> };
  const texto = datos.content
    .map((trozo) => trozo.text ?? "")
    .join("")
    .trim();

  if (texto === "" || /^OMITIR\b/i.test(texto)) return { tipo: "omitido" };

  // Las mismas reglas que aplica la pantalla al leer. Si no pasan aquí,
  // guardar la fila solo serviría para que el servidor la descartara
  // después: ver `objetivoPublicable` en `lib/objetivo.ts`.
  const limpio = objetivoPublicable(texto);
  return limpio ? { tipo: "texto", texto: limpio } : { tipo: "rechazado", crudo: texto };
}

/** Lanza `tarea` sobre cada elemento, de `EN_PARALELO` en `EN_PARALELO`. */
async function porTandas<T, R>(items: T[], tarea: (item: T) => Promise<R>): Promise<R[]> {
  const salida: R[] = [];
  for (let i = 0; i < items.length; i += EN_PARALELO) {
    salida.push(...(await Promise.all(items.slice(i, i + EN_PARALELO).map(tarea))));
  }
  return salida;
}

// ---------------------------------------------------------------
// EL PASE
// ---------------------------------------------------------------

type Resultado = {
  alumnoId: string;
  original: string;
  reescrito: string | null;
  motivo: "reescrito" | "omitido" | "rechazado" | "error";
  detalle?: string;
};

async function principal() {
  const escribirDeVerdad = process.argv.includes("--escribir");
  const rehacer = process.argv.includes("--rehacer");
  const soloUno = process.argv.find((a) => a.startsWith("--alumno="))?.slice("--alumno=".length);

  const env = leerEnv(RUTA_ENV);
  const claveIa = env.ANTHROPIC_API_KEY;
  if (!claveIa) throw new Error("Falta ANTHROPIC_API_KEY en .env.local");

  // Gestión: SOLO LECTURA. Aquí se crea el cliente a mano, como el resto
  // de los scripts, porque `lib/supabase-server.ts` es `server-only` y no
  // se puede importar desde `node`. La regla no cambia por eso: de esta
  // base se lee y no se escribe nunca.
  const gestion = crearCliente(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, "Gestión");
  // La del LMS, que es la nuestra y donde sí se escribe.
  const lms = crearCliente(env.LMS_SUPABASE_URL, env.LMS_SUPABASE_SERVICE_KEY, "LMS");

  // --- 1. Quién tiene objetivo, y de los que se enseñan hoy ---
  const { data: perfiles, error: fallo } = await gestion
    .from("vista_perfil_alumno")
    .select("alumno_id, objetivo_perfil, ocupacion");
  if (fallo) throw new Error(`Gestión: ${fallo.message}`);

  const candidatos = (perfiles ?? [])
    .map((f) => f as Fila)
    .filter((f) => (f.objetivo_perfil ?? "").trim() !== "")
    // El cortafuegos primero: si el original no se le puede enseñar al
    // alumno, hoy la tarjeta no se pinta y reescribirlo sería estrenarla
    // con una nota interna traducida a segunda persona.
    .filter((f) => esParaElAlumno(f.objetivo_perfil))
    .filter((f) => !soloUno || f.alumno_id === soloUno);

  // --- 2. Lo que ya está hecho y sigue valiendo ---
  const { data: hechas, error: falloLms } = await lms
    .from("objetivos_alumno")
    .select("alumno_id, origen_hash");

  // LA TABLA PUEDE NO EXISTIR TODAVÍA, y en ensayo eso no es un error:
  // el orden natural es mirar qué saldría ANTES de crear nada en la
  // base. Sin fila previa que consultar, todo cuenta como pendiente.
  // Con --escribir sí se para: sin tabla no hay dónde guardar.
  if (falloLms) {
    const aviso = `LMS: ${falloLms.message}. ¿Se ha ejecutado supabase/lms-objetivos-alumno.sql en el proyecto del LMS?`;
    if (escribirDeVerdad) throw new Error(aviso);
    console.log(`AVISO · ${aviso}`);
    console.log("En ensayo se sigue: se procesa todo como si no hubiera nada hecho.");
    console.log("");
  }

  const yaHechas = new Map<string, string>();
  for (const fila of (hechas ?? []) as Array<{ alumno_id: string; origen_hash: string }>) {
    yaHechas.set(fila.alumno_id, fila.origen_hash);
  }

  const pendientes = candidatos.filter((f) => {
    if (rehacer) return true;
    const huella = yaHechas.get(f.alumno_id);
    // Sin fila, o con una hecha a partir de un original que ya cambió.
    return huella !== huellaObjetivo((f.objetivo_perfil ?? "").trim());
  });

  console.log(`Alumnos en la vista .................. ${(perfiles ?? []).length}`);
  console.log(`Con objetivo enseñable hoy ........... ${candidatos.length}`);
  console.log(`Ya reescritos y al día ............... ${candidatos.length - pendientes.length}`);
  console.log(`Se van a procesar .................... ${pendientes.length}`);
  console.log("");

  if (pendientes.length === 0) {
    console.log("No hay nada que hacer.");
    return;
  }

  // --- 3. Al modelo ---
  const resultados = await porTandas<Fila, Resultado>(pendientes, async (fila) => {
    const original = (fila.objetivo_perfil ?? "").trim();
    try {
      const salida = await reescribir(claveIa, fila);
      if (salida.tipo === "texto") {
        return { alumnoId: fila.alumno_id, original, reescrito: salida.texto, motivo: "reescrito" };
      }
      if (salida.tipo === "omitido") {
        return { alumnoId: fila.alumno_id, original, reescrito: null, motivo: "omitido" };
      }
      return {
        alumnoId: fila.alumno_id,
        original,
        reescrito: null,
        motivo: "rechazado",
        detalle: salida.crudo,
      };
    } catch (error) {
      return {
        alumnoId: fila.alumno_id,
        original,
        reescrito: null,
        motivo: "error",
        detalle: error instanceof Error ? error.message : String(error),
      };
    }
  });

  const buenos = resultados.filter((r) => r.motivo === "reescrito");
  const omitidos = resultados.filter((r) => r.motivo === "omitido");
  const rechazados = resultados.filter((r) => r.motivo === "rechazado");
  const errores = resultados.filter((r) => r.motivo === "error");

  console.log(`Reescritos ........................... ${buenos.length}`);
  console.log(`Omitidos (la ficha no dice el motivo)  ${omitidos.length}`);
  console.log(`Rechazados por las reglas ............ ${rechazados.length}`);
  console.log(`Errores .............................. ${errores.length}`);
  // Un rechazo es un fallo del prompt, no de la ficha del alumno: se
  // enseña entero, que es la única forma de poder corregirlo.
  for (const r of rechazados) console.log(`  · ${r.alumnoId}: ${r.detalle}`);
  for (const e of errores) console.log(`  · ${e.alumnoId}: ${e.detalle}`);
  console.log("");

  // --- 4. El antes y el después, para poder revisarlo ---
  console.log("─".repeat(72));
  for (const r of buenos) {
    console.log(`\n[${r.alumnoId}]`);
    console.log(`  antes:   ${r.original}`);
    console.log(`  después: ${r.reescrito}`);
  }
  if (omitidos.length > 0) {
    console.log(`\nOmitidos: ${omitidos.map((o) => o.alumnoId).join(", ")}`);
  }
  console.log("\n" + "─".repeat(72));

  // --- 5. Guardar ---
  if (!escribirDeVerdad) {
    console.log(`\nENSAYO. No se ha escrito nada. Repite con --escribir para guardar ${buenos.length} filas.`);
    return;
  }

  const filas = buenos.map((r) => ({
    alumno_id: r.alumnoId,
    texto: r.reescrito as string,
    origen_hash: huellaObjetivo(r.original),
    modelo: MODELO,
    actualizado_en: new Date().toISOString(),
  }));

  const { error: falloGuardado } = await lms
    .from("objetivos_alumno")
    .upsert(filas, { onConflict: "alumno_id" });
  if (falloGuardado) throw new Error(`No se pudo guardar: ${falloGuardado.message}`);

  console.log(`\nGuardadas ${filas.length} filas en objetivos_alumno.`);
}

function crearCliente(url: string | undefined, clave: string | undefined, cual: string): SupabaseClient {
  if (!url || !clave) throw new Error(`Faltan las credenciales de ${cual} en ${RUTA_ENV}`);
  return createClient(url, clave, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    db: { schema: "public" },
  });
}

principal().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
