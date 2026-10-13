// ---------------------------------------------------------------
// EL RECÁLCULO DIARIO DE LA GARANTÍA
//
// Lo llama el cron de Vercel a las 04:00 UTC (ver `vercel.json`), con
// las clases programadas del día anterior ya guardadas en Gestión (su
// cron las guarda a las 22:00 UTC). Recalcula a todos los alumnos
// activos, guarda lo que diga `estadoVigente` y manda los avisos de
// pérdida pendientes. Ver `lib/garantia-servidor.ts`.
//
// DETRÁS DE CRON_SECRET, como el aviso de apertura, y con dos
// afinadores para probar a mano:
//
//   · ?seco=1          calcula y cuenta lo que haría. No escribe ni envía.
//   · ?alumno=<id>     solo ese alumno.
//
// Si falla una lectura no se escribe nada y la ruta devuelve 503: un
// cálculo con datos a medias podría dar una pérdida que no es.
//
// APAGADO HASTA `GARANTIA_ACTIVA=1`. Una pérdida guardada es definitiva,
// así que el cron no guarda nada hasta que las reglas estén cerradas
// (falta decidir desde qué fecha cuenta el contenido). Mientras tanto
// `/garantia` enseña el cálculo del día igual, y `?seco=1` funciona.
// ---------------------------------------------------------------

import { NextResponse, type NextRequest } from "next/server";
import { recalcular } from "@/lib/garantia-servidor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

function autorizado(peticion: NextRequest): boolean {
  const secreto = process.env.CRON_SECRET;
  if (!secreto || secreto.length < 16) {
    console.error("[garantia] Falta CRON_SECRET en el entorno, o es demasiado corto.");
    return false;
  }
  return peticion.headers.get("authorization") === `Bearer ${secreto}`;
}

export async function GET(peticion: NextRequest) {
  if (!autorizado(peticion)) return NextResponse.json({ error: "no autorizado" }, { status: 401 });

  const params = peticion.nextUrl.searchParams;
  const alumno = params.get("alumno")?.trim() || undefined;
  const seco = params.get("seco") === "1";

  if (!seco && process.env.GARANTIA_ACTIVA !== "1") {
    return NextResponse.json({ desactivada: true, motivo: "Falta GARANTIA_ACTIVA=1: no se guarda ni se avisa." });
  }

  const resumen = await recalcular(new Date(), { seco, alumno });
  if (!resumen) {
    return NextResponse.json({ error: "No se pudieron leer los datos; no se ha guardado nada." }, { status: 503 });
  }

  console.log(
    `[garantia] ${resumen.alumnos} alumnos, ${resumen.cambios.length} cambios, ` +
      `${resumen.avisos.enviados} avisos enviados, ${resumen.avisos.fallidos} fallidos${seco ? " (en seco)" : ""}.`
  );
  // Sin nombres en la respuesta: solo ids y estados.
  return NextResponse.json({
    ...resumen,
    cambios: resumen.cambios.map(({ alumnoId, de, a }) => ({ alumnoId, de, a })),
  });
}
