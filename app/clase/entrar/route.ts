// ---------------------------------------------------------------
// /clase/entrar — EL BOTÓN «UNIRSE A LA CLASE»
//
// Todos los botones de entrar a clase del LMS llevan aquí, no a la sala
// (`hrefEntrada` en `lib/entradas-clase.ts`). Esto:
//
//   1. Mira la sesión. Sin ella, a `/acceso` con `?volver=` para traerle
//      de vuelta aquí después de entrar (lo hace ya el middleware; se
//      repite porque una ruta no se fía de la puerta de la calle).
//   2. Vuelve a calcular en el servidor las clases del alumno, con las
//      mismas lecturas y la misma lógica que pintan el botón.
//   3. Apunta el clic en `entradas_clase` (base del LMS).
//   4. Redirige con un 302 a la sala de esa clase.
//
// LA URL DE DESTINO NO VIAJA NUNCA EN LA PETICIÓN. `?clase=` dice solo
// qué clase se pulsó, y se busca entre las del propio alumno: no hay
// forma de que esto mande a nadie a una dirección que no sea su sala.
//
// LA SALA ES LA DEL PROFESOR DE ESA CLASE (`vista_calendario_alumno`),
// como en el botón de siempre: en una recuperación con otro profesor no
// es la de la ficha. La de la ficha solo es el último recurso.
//
// SI EL REGISTRO FALLA, SE ENTRA IGUAL. `registrarEntrada` no lanza y
// tiene un tope de espera.
//
// EL EQUIPO revisando una ficha llega con `?alumno=`: va a la sala de
// ese alumno y su clic no se apunta. El alumno no puede usar `?alumno=`
// para nada; ni se mira.
// ---------------------------------------------------------------

import { NextResponse, type NextRequest } from "next/server";
import { sesionActual } from "@/lib/sesion-servidor";
import { obtenerCalendario, obtenerExcepciones, obtenerPerfil } from "@/lib/gestion";
import { clasesCercanas, proximaDelAlumno } from "@/lib/clases";
import { PARAM_FOCO, leerFoco } from "@/lib/foco";
import { destinoSeguro } from "@/lib/volver";
import { RUTA_SIN_ENLACE, comoOrigen, idDeClase, minutosDesdeInicio, resolverEntrada } from "@/lib/entradas-clase";
import { registrarEntrada } from "@/lib/entradas-clase-servidor";

export const dynamic = "force-dynamic";

/** Un 302 que no se guarda en ninguna caché y no le cuenta a la sala de dónde viene. */
function redirigir(destino: string | URL): NextResponse {
  const respuesta = NextResponse.redirect(destino, 302);
  respuesta.headers.set("Cache-Control", "no-store");
  respuesta.headers.set("Referrer-Policy", "no-referrer");
  return respuesta;
}

export async function GET(peticion: NextRequest) {
  const parametros = peticion.nextUrl.searchParams;

  const sesion = await sesionActual();
  if (!sesion) {
    const acceso = new URL("/acceso", peticion.url);
    const volver = destinoSeguro(`${peticion.nextUrl.pathname}${peticion.nextUrl.search}`);
    if (volver) acceso.searchParams.set("volver", volver);
    return redirigir(acceso);
  }

  const alumnoId = sesion.rol === "alumno" ? sesion.alumnoId : leerFoco(parametros.get(PARAM_FOCO) ?? undefined);
  if (!alumnoId) return redirigir(new URL("/", peticion.url));

  const ahora = new Date();
  const [calendario, excepciones] = await Promise.all([obtenerCalendario(alumnoId), obtenerExcepciones(alumnoId)]);

  const base = {
    cercanas: clasesCercanas(calendario, excepciones, ahora),
    pedida: parametros.get("clase"),
    proxima: proximaDelAlumno(calendario, excepciones, ahora),
    ahora,
  };
  // La sala de la ficha solo se lee si las clases no dan ninguna.
  let entrada = resolverEntrada({ ...base, enlaceFicha: null });
  if (!entrada.destino) {
    entrada = resolverEntrada({ ...base, enlaceFicha: (await obtenerPerfil(alumnoId))?.meetLink ?? null });
  }
  const { clase, destino } = entrada;

  if (sesion.rol === "alumno") {
    await registrarEntrada({
      alumno_id: alumnoId,
      clase_id: clase ? idDeClase(clase) : null,
      clase_inicio: clase ? clase.empiezaEn.toISOString() : null,
      profesor: clase?.profesor ?? null,
      profesor_id: clase?.teacherId ?? null,
      origen: comoOrigen(parametros.get("origen")),
      minutos_desde_inicio: clase ? minutosDesdeInicio(clase, ahora) : null,
    });
  }

  if (!destino) {
    const amable = new URL(RUTA_SIN_ENLACE, peticion.url);
    if (sesion.rol !== "alumno") amable.searchParams.set(PARAM_FOCO, alumnoId);
    return redirigir(amable);
  }

  return redirigir(destino);
}
