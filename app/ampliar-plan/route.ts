// ---------------------------------------------------------------
// «QUIERO IR MÁS RÁPIDO»: AL CAMBIO DE PLAN SIN VOLVER A ENTRAR
//
// Los botones de ampliar plan apuntan aquí (`RUTA_AMPLIAR`). Esta ruta
// decide en el servidor, en el momento del clic:
//
//   · Alumno de verdad y puente activo → firma su email en un sobre `wp`
//     (`crearTokenPuenteWp`) y redirige a la entrada del puente en
//     WordPress, que abre su sesión en la tienda y lo lleva al cambio
//     de plan. Ver `wordpress/drc-desde-lms.php`.
//   · Cualquier otro caso → al enlace de siempre (`urlAmpliarPlan`), donde
//     se entra a mano. Ver `viaDeAmpliar` para cuáles son.
//
// SI ALGO FALLA AL FIRMAR, TAMBIÉN AL ENLACE DE SIEMPRE. Un botón de
// pago que da un error es lo peor que puede pasar aquí; volver a pedir
// la contraseña es lo que ya pasaba.
//
// La ruta va detrás de la puerta (el middleware pide sesión), y además
// se comprueba aquí con la revocación, como en cualquier guard. Sin
// sesión, a /acceso.
//
// Nadie puede usar esto contra otro: lo único que hace es llevar a QUIEN
// PULSA a SU propia cuenta de la tienda, con el email de SU sesión.
//
// CADA CLIC DE UN ALUMNO SE APUNTA (`banner_ampliar_clic` en `eventos`),
// en segundo plano: la redirección sale sin esperar a la base. Con la
// pantalla desde la que pulsó, sacada del Referer —solo la sección, sin
// ids—, y por qué vía se le mandó.
// ---------------------------------------------------------------

import { NextResponse, type NextRequest } from "next/server";
import { sesionActual } from "@/lib/sesion-servidor";
import { crearTokenPuenteWp, type SesionAbierta } from "@/lib/sesion";
import { puenteWpActivo, urlAmpliarPlan, viaDeAmpliar } from "@/lib/ampliar-plan";
import { PUENTE_WP } from "@/lib/cuenta-woo";
import { apuntarEvento } from "@/lib/eventos";
import { enSegundoPlano } from "@/lib/segundo-plano";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 303: la redirección de un clic. Y que nadie la guarde: lleva el sobre. */
function ir(url: string): NextResponse {
  const respuesta = NextResponse.redirect(url, 303);
  respuesta.headers.set("Cache-Control", "no-store");
  return respuesta;
}

/**
 * La sección desde la que se pulsó, por el Referer. Los dos botones que
 * hay viven en el Inicio (`/alumno/{id}`) y en Mi progreso (`/progreso`);
 * sin Referer o desde otro sitio, «otra». El id del alumno no se guarda:
 * ya va en la fila.
 */
function pantallaDe(peticion: NextRequest): string {
  const referer = peticion.headers.get("referer");
  if (!referer) return "otra";
  try {
    const ruta = new URL(referer).pathname;
    if (/^\/alumno\/[^/]+\/?$/.test(ruta)) return "inicio";
    if (/^\/progreso\/?$/.test(ruta)) return "progreso";
  } catch {
    // Un Referer que no es una URL: «otra».
  }
  return "otra";
}

function apuntarClic(sesion: SesionAbierta, peticion: NextRequest, via: string) {
  if (sesion.rol !== "alumno") return;
  const datos = { pantalla: pantallaDe(peticion), via };
  enSegundoPlano("ampliar-plan", () => apuntarEvento(sesion.alumnoId, "banner_ampliar_clic", datos));
}

// SIN `estadoDeAcceso` A PROPÓSITO: con el pago pendiente también se
// llega aquí. Es la única excepción, declarada en `RUTAS_SIN_BLOQUEO`
// (`lib/estado-acceso.ts`).
export async function GET(peticion: NextRequest) {
  const sesion = await sesionActual();
  if (!sesion) return ir(new URL("/acceso", peticion.url).toString());

  const via = viaDeAmpliar(sesion, puenteWpActivo());
  apuntarClic(sesion, peticion, via);

  if (via === "tienda") return ir(urlAmpliarPlan());

  try {
    const token = await crearTokenPuenteWp(sesion.email, "cambio-plan");
    return ir(`${PUENTE_WP}&token=${encodeURIComponent(token)}`);
  } catch (error) {
    console.error("[ampliar-plan] No se pudo firmar el sobre del puente:", error);
    return ir(urlAmpliarPlan());
  }
}
