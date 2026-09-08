// ---------------------------------------------------------------
// LA OTRA VERSIÓN DE UN BLOQUE, CUANDO SE PIDE
//
// Lo llama el visor la primera vez que alguien pulsa el botón de idioma
// en un bloque de práctica. Devuelve el andamio traducido —título,
// intro, instrucciones, contextos, pistas, criterios, explicaciones y
// veredictos— y lo deja guardado, de modo que la segunda pulsación es
// una lectura de la base.
//
// ---------------------------------------------------------------
// POR QUÉ AQUÍ Y NO EN LA GENERACIÓN
//
// Porque en la generación no cabe: un bloque tarda entre 43 y 52
// segundos medidos contra un techo de 60, tan justo que la revisión
// pedagógica corre solo con lo que sobra. Añadir cuarenta y pico cadenas
// a ese mismo turno no lo habría hecho más lento: lo habría cortado, y
// un corte ahí sirve el banco, o sea que habríamos cambiado la
// personalización del bloque por una traducción. Ver el presupuesto en
// `app/api/generar-bloque/route.ts`.
//
// Y POR QUÉ DIFERIDA Y NO POR ADELANTADO. Los bloques son de un alumno y
// casi de un solo uso. Traducirlos todos al generarlos es pagar por un
// botón que la mayoría no va a pulsar; traducir al pulsarlo, una vez y
// guardado, cuesta solo donde alguien lo quiso.
//
// ---------------------------------------------------------------
// DE QUIÉN ES EL BLOQUE
//
// Del alumno, y sale de la COOKIE: si viniera del cuerpo, cualquiera con
// sesión podría leer los bloques de otro pidiendo su traducción.
//
// La excepción es el equipo, y es la misma que en
// `app/alumno/[id]/[bloqueId]`: un administrador revisando una ficha
// abre bloques que no son suyos —su `alumnoId` de sesión es null— y ver
// las dos versiones es parte de revisarlos. Para él, y SOLO para él, el
// alumno llega en el cuerpo. Un alumno que mandara ese campo se lo
// encuentra ignorado.
//
// Lo que no llega nunca del cuerpo es el CONTENIDO a traducir: se lee de
// la base. Aceptarlo sería dejar que cualquiera nos hiciera pagar
// llamadas al modelo con el texto que quisiera.
// ---------------------------------------------------------------

import { NextResponse, type NextRequest } from "next/server";
import { getBloque } from "@/lib/data";
import { sesionActual } from "@/lib/sesion-servidor";
import { buscarBloqueGenerado } from "@/lib/progreso-servidor";
import { guardarTraduccion, leerTraduccion } from "@/lib/traducciones-servidor";
import { idiomaDe, type IdiomaBloque } from "@/lib/traduccion-bloque";
import { MODELO_TRADUCTOR, traducirBloque } from "@/lib/traductor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Sobra de largo. Haiku sobre cuarenta y pico cadenas cortas tarda unos
 * segundos; el techo está para que un cuelgue de la API no deje al
 * alumno mirando un botón que gira, no para apretar el reloj como en la
 * generación.
 */
export const maxDuration = 60;
const PLAZO_MODELO_MS = 30_000;

export async function POST(peticion: NextRequest) {
  const sesion = await sesionActual();
  if (!sesion) return NextResponse.json({ error: "Sin sesión" }, { status: 401 });

  let cuerpo: unknown;
  try {
    cuerpo = await peticion.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo ilegible" }, { status: 400 });
  }

  const datos =
    typeof cuerpo === "object" && cuerpo !== null && !Array.isArray(cuerpo)
      ? (cuerpo as Record<string, unknown>)
      : null;
  if (!datos) return NextResponse.json({ error: "Cuerpo ilegible" }, { status: 400 });

  const bloqueClave = typeof datos.bloqueId === "string" ? datos.bloqueId.trim() : "";
  if (!bloqueClave) return NextResponse.json({ error: "Falta bloqueId" }, { status: 400 });

  // Ver la cabecera: del cuerpo solo para el equipo.
  const esEquipo = sesion.rol === "admin";
  const alumnoId = esEquipo
    ? typeof datos.alumnoId === "string"
      ? datos.alumnoId.trim()
      : ""
    : sesion.alumnoId;

  if (!alumnoId) return NextResponse.json({ error: "Falta alumnoId" }, { status: 400 });

  // El mismo par de sitios que `app/alumno/[id]/[bloqueId]`: el catálogo
  // vive en el código y lo generado en la base. Y con el mismo guard,
  // que es lo que impide pedir la traducción de un bloque ajeno.
  const bloque =
    getBloque(bloqueClave) ?? (await buscarBloqueGenerado(alumnoId, bloqueClave, esEquipo));

  if (!bloque) return NextResponse.json({ error: "Bloque no encontrado" }, { status: 404 });

  const destino: IdiomaBloque = idiomaDe(bloque) === "en" ? "es" : "en";

  // Puede estar ya hecha: la pidió este alumno en otra sesión, o —en un
  // bloque del catálogo— cualquier otro alumno de su nivel.
  const guardada = await leerTraduccion(bloqueClave, destino);
  if (guardada) {
    return NextResponse.json({ traduccion: guardada, origen: "cache" });
  }

  const clave = process.env.ANTHROPIC_API_KEY?.trim();
  if (!clave) {
    console.error("[traduccion] Sin ANTHROPIC_API_KEY: el botón de idioma no puede responder.");
    return NextResponse.json({ error: "Traducción no disponible" }, { status: 503 });
  }

  const resultado = await traducirBloque(clave, bloque, destino, PLAZO_MODELO_MS);

  if (resultado.estado === "no-disponible") {
    console.error(
      `[traduccion] ${bloqueClave} → ${destino} no salió (${resultado.ms}ms): ${resultado.motivo}`
    );
    return NextResponse.json({ error: "Traducción no disponible" }, { status: 502 });
  }

  console.log(
    `[traduccion] ${bloqueClave} → ${destino}: ${resultado.cadenas} cadenas en ${resultado.ms}ms ` +
      `(${resultado.tandas.buenas}/${resultado.tandas.pedidas} tandas)`
  );

  // Se guarda ANTES de responder y sin cortar si falla, igual que el
  // bloque en la generación: llegados aquí la traducción ya está hecha y
  // pagada, y perder la fila solo significa que la próxima vez se vuelve
  // a pedir. Lo que no puede pasar es que el alumno se quede sin ella
  // por un mal minuto de la base.
  await guardarTraduccion(bloqueClave, resultado.traduccion, MODELO_TRADUCTOR);

  return NextResponse.json({ traduccion: resultado.traduccion, origen: "modelo" });
}
