// ---------------------------------------------------------------
// /mis-clases → /clases
//
// Es la dirección que pone DRC Gestión en el correo de una clase
// cancelada (`/mis-clases?recuperacion=<id>`). La pantalla vive en
// `/clases`, que es la de la barra; esto solo conserva el enlace.
//
// La sesión no se mira aquí: el middleware ya ha mandado a `/acceso` a
// quien no la tiene, con `?volver=` para traerle de vuelta a este mismo
// enlace después de entrar (ver `lib/volver.ts`).
// ---------------------------------------------------------------

import { NextResponse, type NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export function GET(peticion: NextRequest) {
  const destino = new URL("/clases", peticion.url);
  const id = peticion.nextUrl.searchParams.get("recuperacion");
  if (id) destino.searchParams.set("recuperacion", id);
  return NextResponse.redirect(destino);
}
