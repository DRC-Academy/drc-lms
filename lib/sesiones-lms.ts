// ---------------------------------------------------------------
// SESIONES REVOCABLES
//
// Hasta ahora la cookie era autocontenida y no se podía revocar antes
// de que caducara; quedaba anotado como pendiente en la cabecera de
// `lib/sesion.ts`. Ahora cada sesión tiene fila en `sesiones` y revocar
// es marcar `revocada_en`.
//
// DÓNDE SE COMPRUEBA, Y POR QUÉ NO EN EL MIDDLEWARE
//
// El middleware corre en el runtime Edge, que es también el motivo por
// el que `lib/sesion.ts` no lleva `server-only`. Consultar la base allí
// significaría un viaje de red antes de CADA navegación, porque el
// matcher cubre casi todo el sitio.
//
// Así que se reparte como ya estaba repartida la autorización, y como
// lo describe la cabecera de `lib/sesion-servidor.ts`: el middleware es
// la puerta de la calle —firma y caducidad, sin base— y la revocación
// se comprueba en los guards, que corren en Node y una vez por página.
//
// EL MEMO
//
// Sin él, cada página serían dos consultas (Gestión y esta). Se cachea
// el resultado 60 segundos por id de sesión, en memoria de la instancia.
// El precio, dicho claro: revocar tarda hasta un minuto en notarse en
// las instancias que ya habían preguntado. Para el cierre de sesión no
// aplica —ver `revocarSesion`—, y para echar a alguien a la fuerza un
// minuto es tolerable.
//
// LOS ACCESOS
//
// Una visita es una fila en `accesos`: usar la plataforma cuando la
// última actividad registrada del alumno tiene más de 30 minutos, o
// entrar por el enlace del correo o por WooCommerce. Se decide aquí,
// donde ya se refresca `ultimo_uso_en`, y no en una consulta aparte:
//
//   · EL FRENO DE 5 MINUTOS NO PIERDE VISITAS. Si esta instancia tocó
//     la sesión hace menos de 5 minutos, la última actividad es como
//     mucho de entonces: no puede haber 30 minutos de hueco.
//   · EL MEMO DE 60 SEGUNDOS NO INFLUYE. Guarda si la sesión está viva;
//     el toque va por su cuenta (`tocadoEn`) y se mira en las dos ramas.
//   · `cache()` DEDUPLICA dentro de la petición: una página que pasa por
//     varios guards toca una vez como mucho.
//   · CADA INSTANCIA TIENE SU MEMO. Una que no ha visto la sesión no sabe
//     cuándo se tocó, y pregunta a la base con un UPDATE condicionado
//     (`tocarUltimoUso`): es la base la que dice si hay hueco, y con una
//     sola sentencia dos instancias a la vez no cuentan la visita dos
//     veces.
//
// El margen, dicho claro: `ultimo_uso_en` puede ir hasta 5 minutos por
// detrás de la última petición real, así que una pausa de 25 a 30
// minutos puede contar ya como visita nueva. Y quien pasa más de 30
// minutos en una lección sin que el navegador pida nada al servidor
// vuelve como visita nueva en su siguiente petición.
//
// Todo esto va EN SEGUNDO PLANO (`enSegundoPlano`): la página no espera
// a la escritura, como no esperaba nadie a saber si se había refrescado
// `ultimo_uso_en`.
// ---------------------------------------------------------------

import "server-only";
import { cache } from "react";
import { baseLms } from "@/lib/supabase-lms";
import { enSegundoPlano } from "@/lib/segundo-plano";
import { clienteActual, conColumnasCliente, type ClienteRequest } from "@/lib/cliente-request";
import type { Rol } from "@/lib/sesion";

export type OrigenSesion = "magic_link" | "woocommerce";

/** Lo que dura el memo de «esta sesión sigue viva». */
const MS_MEMO = 60 * 1000;

/**
 * Cada cuánto se refresca `ultimo_uso_en`. Sin este freno sería una
 * escritura por petición, que es exactamente lo que no queremos.
 */
const MS_TOCAR = 5 * 60 * 1000;

/** Más que esto sin actividad y lo siguiente es una visita nueva. */
const MS_VISITA = 30 * 60 * 1000;

/**
 * Tope del memo. Es una instancia serverless y no un servidor de larga
 * vida, pero un mapa sin límite es un fallo esperando una campaña de
 * tráfico. Al llegar al tope se vacía entero: reconstruirlo cuesta una
 * consulta por sesión activa y no hay nada que preservar.
 */
const TOPE_MEMO = 5000;

type EntradaMemo = { viva: boolean; comprobadoEn: number; tocadoEn: number };

const memo = new Map<string, EntradaMemo>();

/**
 * El id viene de una cookie firmada, así que es de fiar. Se comprueba
 * la forma igual, porque una cadena que no sea uuid hace que Postgres
 * devuelva un error de sintaxis (22P02) y llenaría el log de ruido que
 * parece un fallo de conexión.
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type FilaSesion = { id: string; revocada_en: string | null; expira_en: string };

// ---------------------------------------------------------------
// CREAR
// ---------------------------------------------------------------

/**
 * Abre la sesión en la base y devuelve su id, o null si no se pudo.
 *
 * Que devuelva null tiene que impedir la entrada: la cookie llevaría un
 * id sin fila detrás y el primer guard la rechazaría, así que el alumno
 * entraría para que lo echaran en la página siguiente. Mejor decirlo en
 * la puerta.
 */
export async function crearSesion(datos: {
  rol: Rol;
  alumnoId: string | null;
  emailAdmin: string | null;
  origen: OrigenSesion;
  expiraEn: Date;
  /**
   * Cuándo se abrió, si no es ahora. Solo lo pasa `scripts/demo.ts`
   * (ver la nota de `en` en `lib/progreso-servidor.ts`); la entrada de
   * verdad nunca lo manda.
   */
  en?: Date;
  /** IP y navegador de quien entra (`lib/cliente-request.ts`). */
  cliente?: ClienteRequest;
}): Promise<string | null> {
  const { data, error } = await conColumnasCliente(datos.cliente, (extra) =>
    baseLms()
      .from("sesiones")
      .insert({
        rol: datos.rol,
        alumno_id: datos.alumnoId,
        email_admin: datos.emailAdmin,
        origen: datos.origen,
        expira_en: datos.expiraEn.toISOString(),
        ...(datos.en ? { creada_en: datos.en.toISOString(), ultimo_uso_en: datos.en.toISOString() } : {}),
        ...extra,
      })
      .select("id")
      .limit(1)
      .returns<{ id: string }[]>()
  );

  if (error) {
    console.error("[sesiones] No se pudo abrir la sesión:", error.message);
    return null;
  }

  const id = (data ?? [])[0]?.id ?? null;
  if (id) memo.set(id, { viva: true, comprobadoEn: Date.now(), tocadoEn: Date.now() });

  // Entrar es una visita, por cualquiera de las dos puertas. No con `en`:
  // eso es `scripts/demo.ts` rellenando el pasado, no alguien entrando.
  if (id && datos.rol === "alumno" && datos.alumnoId && !datos.en) {
    const alumnoId = datos.alumnoId;
    const cliente = datos.cliente;
    enSegundoPlano("accesos", () => anotarAcceso(alumnoId, id, Date.now(), cliente));
  }

  return id;
}

// ---------------------------------------------------------------
// ACCESOS
// ---------------------------------------------------------------

/**
 * Apunta una visita, salvo que el alumno siga activo en OTRA sesión
 * suya —otro dispositivo, o un enlace nuevo con el anterior aún abierto—:
 * entonces es la misma visita.
 *
 * Sin filtro de cuentas: la demo y la de pruebas se apuntan igual y las
 * quita `metricas_excluido()` en la base, que es la única lista.
 */
async function anotarAcceso(alumnoId: string, sesionId: string, ahora: number, cliente: ClienteRequest | undefined) {
  const { data, error } = await baseLms()
    .from("sesiones")
    .select("id")
    .eq("alumno_id", alumnoId)
    .neq("id", sesionId)
    .gte("ultimo_uso_en", new Date(ahora - MS_VISITA).toISOString())
    .limit(1)
    .returns<{ id: string }[]>();

  // Si no se puede comprobar, se apunta: una visita de más se nota menos
  // en el panel que una que falta.
  if (error) console.error("[accesos] No se pudo mirar si seguía activo en otra sesión:", error.message);
  else if ((data ?? []).length > 0) return;

  const { error: alInsertar } = await conColumnasCliente(cliente, (extra) =>
    baseLms()
      .from("accesos")
      .insert({ alumno_id: alumnoId, iniciado_en: new Date(ahora).toISOString(), ...extra })
  );

  if (alInsertar) console.error("[accesos] No se pudo apuntar la visita:", alInsertar.message);
}

// ---------------------------------------------------------------
// COMPROBAR
// ---------------------------------------------------------------

async function consultarViva(id: string): Promise<boolean> {
  const { data, error } = await baseLms()
    .from("sesiones")
    .select("id, revocada_en, expira_en")
    .eq("id", id)
    .limit(1)
    .returns<FilaSesion[]>();

  if (error) {
    // FALLO ABIERTO, y es una decisión, no un descuido: si la base no
    // responde, la firma de la cookie sigue siendo válida y lo único
    // que no podemos comprobar es la revocación, que es una capacidad
    // que hasta hoy no existía. Cerrar aquí dejaría a los 174 alumnos
    // fuera por un mal minuto de Supabase.
    //
    // Si algún día se revoca una sesión por un incidente real, hay que
    // cambiar esto a `false` y asumir el coste.
    console.error("[sesiones] No se pudo comprobar la sesión, se deja pasar:", error.message);
    return true;
  }

  const fila = (data ?? [])[0];

  // Sin fila no hay sesión. Aquí sí se cierra: la consulta funcionó y
  // la respuesta es que esa sesión no existe. Es el caso de las cookies
  // emitidas antes de este cambio.
  if (!fila) return false;
  if (fila.revocada_en !== null) return false;

  return Date.parse(fila.expira_en) > Date.now();
}

async function refrescarUltimoUso(id: string, en: string) {
  const { error } = await baseLms().from("sesiones").update({ ultimo_uso_en: en }).eq("id", id);

  // Es telemetría: que falle no cambia nada para quien está navegando.
  if (error) console.error("[sesiones] No se pudo refrescar ultimo_uso_en:", error.message);
}

/**
 * Refresca `ultimo_uso_en` y, si había 30 minutos de hueco, apunta la
 * visita. `tocadoAntes` es cuándo la tocó ESTA instancia por última vez
 * (0 si nunca). `cliente` es el de la petición que la toca: se lee antes
 * de pasar al segundo plano, mientras la petición sigue en curso.
 */
async function tocarUltimoUso(id: string, tocadoAntes: number, cliente: ClienteRequest) {
  const ahora = Date.now();
  const en = new Date(ahora).toISOString();

  // La tocó esta misma instancia hace menos de 30 minutos: no hay hueco
  // posible, basta con refrescar. Es el caso de casi todas las veces.
  if (tocadoAntes > 0 && ahora - tocadoAntes < MS_VISITA) {
    await refrescarUltimoUso(id, en);
    return;
  }

  // Si no, que lo diga la base: se refresca SOLO si la última actividad
  // es de hace más de 30 minutos, y si devuelve la fila, había hueco.
  const { data, error } = await baseLms()
    .from("sesiones")
    .update({ ultimo_uso_en: en })
    .eq("id", id)
    .lt("ultimo_uso_en", new Date(ahora - MS_VISITA).toISOString())
    .select("rol, alumno_id")
    .returns<{ rol: Rol; alumno_id: string | null }[]>();

  if (error) {
    console.error("[sesiones] No se pudo refrescar ultimo_uso_en:", error.message);
    return;
  }

  const fila = (data ?? [])[0];
  if (!fila) {
    await refrescarUltimoUso(id, en);
    return;
  }

  if (fila.rol === "alumno" && fila.alumno_id) await anotarAcceso(fila.alumno_id, id, ahora, cliente);
}

/**
 * ¿Sigue viva esta sesión?
 *
 * Va envuelto en `cache()` de React, que deduplica dentro de una misma
 * petición: `exigirAccesoAFicha` llama a `exigirSesion`, que llama a
 * `sesionActual`, y una página puede pedir el guard más de una vez. Sin
 * esto serían varias consultas para responder lo mismo.
 */
export const sesionViva = cache(async (id: string): Promise<boolean> => {
  if (!UUID.test(id)) return false;

  const ahora = Date.now();
  const entrada = memo.get(id);

  if (entrada && ahora - entrada.comprobadoEn < MS_MEMO) {
    if (entrada.viva && ahora - entrada.tocadoEn > MS_TOCAR) {
      const tocadoAntes = entrada.tocadoEn;
      entrada.tocadoEn = ahora;
      const cliente = clienteActual();
      enSegundoPlano("sesiones", () => tocarUltimoUso(id, tocadoAntes, cliente));
    }
    return entrada.viva;
  }

  const viva = await consultarViva(id);

  if (memo.size >= TOPE_MEMO) memo.clear();
  memo.set(id, { viva, comprobadoEn: ahora, tocadoEn: entrada?.tocadoEn ?? 0 });

  if (viva) {
    const tocadoAntes = entrada?.tocadoEn ?? 0;
    if (ahora - tocadoAntes > MS_TOCAR) {
      const guardada = memo.get(id);
      if (guardada) guardada.tocadoEn = ahora;
      const cliente = clienteActual();
      enSegundoPlano("sesiones", () => tocarUltimoUso(id, tocadoAntes, cliente));
    }
  }

  return viva;
});

// ---------------------------------------------------------------
// REVOCAR
// ---------------------------------------------------------------

/**
 * Cierra una sesión.
 *
 * El memo se invalida en el acto, así que para quien pulsa «Salir» el
 * cierre es inmediato en esta instancia. Y sobre todo: la ruta de
 * salida borra además la cookie, de modo que ese navegador ya no tiene
 * nada que presentar, independientemente de lo que crea cualquier memo.
 *
 * El minuto de margen solo afecta a alguien que hubiera copiado el
 * valor de la cookie a otro sitio antes de salir.
 */
export async function revocarSesion(id: string): Promise<boolean> {
  if (!UUID.test(id)) return false;

  // Antes de la consulta, no después: si la escritura falla, lo que
  // queremos es que esta instancia siga dando la sesión por muerta.
  memo.set(id, { viva: false, comprobadoEn: Date.now(), tocadoEn: Date.now() });

  const { error } = await baseLms()
    .from("sesiones")
    .update({ revocada_en: new Date().toISOString() })
    .eq("id", id)
    .is("revocada_en", null);

  if (error) {
    console.error("[sesiones] No se pudo revocar la sesión:", error.message);
    return false;
  }

  return true;
}
