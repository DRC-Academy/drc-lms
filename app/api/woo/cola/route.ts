// ---------------------------------------------------------------
// LA VUELTA DE LA COLA DE CORREO DEL BLACK PASS
//
// La llama `pg_cron` cada minuto (`supabase/lms-pases-cron.sql`), con
// `Authorization: Bearer CRON_SECRET`. Al conceder un pase ya se intenta
// enviar en el momento: esto recoge lo que no salió y los reintentos.
//
// Cada minuto da para unos 80 correos al ritmo de Resend; lo que no quepa
// sale en la vuelta siguiente, porque se para a los 50 segundos.
// ---------------------------------------------------------------

import { NextResponse, type NextRequest } from "next/server";
import { pasesActivos } from "@/lib/pases";
import { procesarCola } from "@/lib/pases-cola";
import { autorizadoComoCron } from "@/lib/secreto-cron";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(peticion: NextRequest) {
  if (!autorizadoComoCron(peticion)) return NextResponse.json({ error: "no autorizado" }, { status: 401 });
  if (!pasesActivos()) return NextResponse.json({ apagado: true });

  return NextResponse.json(await procesarCola({ limite: 100, plazoMs: 50_000 }));
}
