// ---------------------------------------------------------------
// CERRAR SESIÓN
//
// Tres cosas, en este orden y en la misma respuesta:
//
//   1. Se marca `revocada_en` en la fila de `sesiones`. Sin esto, el
//      valor de la cookie seguiría siendo válido durante 30 días para
//      quien lo hubiera copiado.
//   2. Se borra la cookie del navegador. Esto es lo que hace que el
//      cierre sea INMEDIATO para quien pulsa: ya no tiene nada que
//      presentar, pase lo que pase con el memo de 60 segundos.
//   3. Se manda a WordPress (`SALIR_WP`), que cierra también la sesión
//      de drcacademy.com y deja al alumno en el login de Mi cuenta. Sin
//      esto, en un ordenador compartido el siguiente que abriera la web
//      entraría en la cuenta del anterior. WordPress solo redirige si no
//      había sesión allí, así que se va siempre, haya o no sesión aquí.
//
// LA SALIDA NUNCA SE BLOQUEA. Falle la revocación o no haya sesión, se
// borra la cookie y se va a WordPress igual.
//
// SOLO POST, y no es una manía REST. Si esto fuera un GET bastaría un
// `<Link>` para cerrarla, y Next hace prefetch de los enlaces visibles:
// la sesión se cerraría sola al pasar el ratón por encima del botón.
// Con POST hace falta un envío explícito.
//
// El formulario que lo llama está en `components/leccion/MenuPerfil.tsx` y es un
// form de HTML normal, así que funciona aunque no cargue el JavaScript.
// ---------------------------------------------------------------

import { NextResponse, type NextRequest } from "next/server";
import { NOMBRE_COOKIE } from "@/lib/sesion";
import { sesionActual } from "@/lib/sesion-servidor";
import { revocarSesion } from "@/lib/sesiones-lms";
import { SALIR_WP } from "@/lib/cuenta-woo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * ¿Viene el envío de otra web?
 *
 * La cookie es `SameSite=Lax`: en un POST desde otra web no viaja, así
 * que no se revocaría nada, pero la respuesta sí la borraría (es una
 * navegación de primer nivel). Cualquier web podría echar al alumno del
 * LMS —y, con `SALIR_WP`, también de drcacademy.com— con un formulario
 * oculto. Por eso se mira `Origin`:
 *
 *   · viene y no es este dominio → de fuera. `Origin: null` también
 *     cuenta como de fuera: no se puede demostrar que sea de aquí.
 *   · no viene → se deja pasar. Algún navegador antiguo no la manda en
 *     los POST del mismo sitio, y dejarle sin poder salir sería peor que
 *     la molestia que se evita.
 *
 * Se compara con la cabecera `Host` y no con un dominio escrito aquí:
 * así vale igual en producción, en las previews de Vercel y en local.
 */
function vieneDeFuera(peticion: NextRequest): boolean {
  const origen = peticion.headers.get("origin");
  if (origen === null) return false;
  try {
    return new URL(origen).host !== peticion.headers.get("host");
  } catch {
    return true;
  }
}

export async function POST(peticion: NextRequest) {
  if (vieneDeFuera(peticion)) {
    // Ni se revoca ni se borra nada: a la home, como si no hubiera pasado.
    return NextResponse.redirect(new URL("/", peticion.url), { status: 303 });
  }

  const sesion = await sesionActual();

  if (sesion) {
    // Si la revocación falla queda en el log, pero se sigue: borrar la
    // cookie es lo que nota quien está delante, y dejarle dentro porque
    // la base tuvo un mal momento sería lo peor de las dos opciones.
    await revocarSesion(sesion.sesionId);
  }

  // PARA VOLVER ATRÁS (si el cierre en WordPress diera problemas): cambiar
  // el destino por `new URL("/acceso?motivo=salida", peticion.url)`, que
  // es adonde iba antes y cuyo aviso sigue en `app/acceso/page.tsx`.
  const respuesta = NextResponse.redirect(SALIR_WP, {
    // 303 y no 307: el 307 conserva el método, así que el navegador
    // repetiría el POST contra WordPress. Con 303 pasa a GET, que es lo
    // que se quiere después de enviar un formulario.
    status: 303,
  });

  respuesta.cookies.delete(NOMBRE_COOKIE);
  return respuesta;
}
