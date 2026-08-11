// ---------------------------------------------------------------
// VOLCADO DEL PROGRESO QUE QUEDÓ EN EL NAVEGADOR
//
// Ruta de vida corta. Los alumnos que ya practicaron tienen su progreso
// en el localStorage de su navegador; la primera vez que entran después
// del cambio, el panel manda aquí lo que haya y se vuelca a la base.
//
// Cuando todos los del piloto hayan entrado al menos una vez, esta ruta
// y `lib/migracion-local.ts` se pueden borrar.
//
// LA SALVAGUARDA: si esto falla, no pasa nada. El alumno entra igual y
// con lo que tenga en la base, que puede ser nada. Nadie se queda fuera
// por una migración. Por eso el panel la llama sin esperarla y nunca
// enseña un error si sale mal.
//
// Como en `../progreso`, el alumno sale de la cookie y nunca del cuerpo.
// ---------------------------------------------------------------

import { NextResponse, type NextRequest } from "next/server";
import { sesionActual } from "@/lib/sesion-servidor";
import { migrarProgresoLocal } from "@/lib/progreso-servidor";
import { validarBloque } from "@/lib/validarBloque";
import type { ProgresoLocal } from "@/lib/progreso";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Tope por tanda. El localStorage guardaba 20 bloques como mucho. */
const TOPE = 200;

function objeto(valor: unknown): Record<string, unknown> | null {
  return typeof valor === "object" && valor !== null && !Array.isArray(valor)
    ? (valor as Record<string, unknown>)
    : null;
}

function lista(valor: unknown): unknown[] {
  return Array.isArray(valor) ? valor.slice(0, TOPE) : [];
}

function entero(valor: unknown): number | null {
  return typeof valor === "number" && Number.isSafeInteger(valor) ? valor : null;
}

function cadena(valor: unknown): string {
  return typeof valor === "string" ? valor : "";
}

/**
 * Lo que llega es un localStorage ajeno que lleva meses ahí: puede
 * venir de otra versión, a medias o editado a mano. Se coge lo que
 * tenga forma y se descarta el resto sin protestar; un 400 aquí no
 * ayudaría a nadie, porque no hay nadie mirando.
 */
function limpiar(datos: Record<string, unknown>): ProgresoLocal {
  const salida: ProgresoLocal = { progreso: [], avance: [], bloques: [] };

  for (const bruto of lista(datos.progreso)) {
    const fila = objeto(bruto);
    if (!fila) continue;
    const bloqueClave = cadena(fila.bloqueClave).trim();
    const aciertos = entero(fila.aciertos);
    const total = entero(fila.total);
    if (bloqueClave === "" || aciertos === null || total === null) continue;
    salida.progreso.push({ bloqueClave, aciertos, total, fecha: cadena(fila.fecha) });
  }

  for (const bruto of lista(datos.avance)) {
    const fila = objeto(bruto);
    if (!fila) continue;
    const bloqueClave = cadena(fila.bloqueClave).trim();
    const indice = entero(fila.indice);
    const total = entero(fila.total);
    if (bloqueClave === "" || indice === null || total === null) continue;
    salida.avance.push({ bloqueClave, indice, total, fecha: cadena(fila.fecha) });
  }

  for (const bruto of lista(datos.bloques)) {
    const fila = objeto(bruto);
    if (!fila) continue;
    // El mismo validador que usa la práctica: si el bloque no tiene la
    // forma exacta, no entra. Un bloque a medias rompería la sesión de
    // quien lo abriera después.
    const bloque = validarBloque(fila.bloque);
    if (!bloque) continue;
    salida.bloques.push({ bloque, creado: cadena(fila.creado) });
  }

  return salida;
}

export async function POST(peticion: NextRequest) {
  const sesion = await sesionActual();
  if (!sesion) {
    return NextResponse.json({ error: "Sin sesión" }, { status: 401 });
  }

  // Un administrador no tiene progreso propio que migrar, y lo que
  // hubiera en su navegador sería de las fichas que estuvo revisando.
  if (sesion.rol !== "alumno") {
    return NextResponse.json({ migrado: false, motivo: "administrador" });
  }

  let cuerpo: unknown;
  try {
    cuerpo = await peticion.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo ilegible" }, { status: 400 });
  }

  const datos = objeto(cuerpo);
  if (!datos) return NextResponse.json({ error: "Cuerpo ilegible" }, { status: 400 });

  const contados = await migrarProgresoLocal(sesion.alumnoId, limpiar(datos));

  console.info(
    `[migracion] Alumno ${sesion.alumnoId}: ${contados.progreso} intentos, ` +
      `${contados.avance} avances, ${contados.bloques} bloques.`
  );

  return NextResponse.json({ migrado: true, ...contados });
}
