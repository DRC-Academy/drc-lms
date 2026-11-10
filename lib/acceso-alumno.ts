// ---------------------------------------------------------------
// QUÉ PUEDE HACER ESTE ALUMNO: LA ÚNICA RESPUESTA
//
// El acceso es la SUMA de lo que tiene: su plan, si lo tiene, y su pase, si
// lo tiene. El pase abre todos los cursos sin drip; no da clases ni «Para
// ti». Sin pase, esto no cambia nada de lo que el alumno veía.
//
//   · Solo pase          todos los cursos; ni clases, ni Para ti, ni diploma.
//   · Plan activo + pase todo lo del plan y además todos los cursos.
//   · Ficha sin plan
//     activo + pase      todos los cursos; sin Para ti. Conserva la pantalla
//                        de clases con su historial, como cualquier ex-alumno.
//   · En espera + pase   conserva el curso, sin Para ti ni clases, con un
//                        aviso de pago que no bloquea.
//   · Sin pase           como siempre. Un ex-alumno sin pase conserva Para ti.
//
// QUÉ SE COMPRUEBA DÓNDE:
//   · Entrar: `sesionActual` (`lib/sesion-servidor.ts`), en cada petición y
//     sin memo. Es el único paso común a páginas, rutas y acciones.
//   · Bloqueo por impago: `estadoDeAcceso`, que tiene en cuenta el pase.
//   · Cursos y drip: `excepcionesDelAlumno`, de donde beben todos.
//   · Para ti y clases: `paraTiCerrado` y `clasesCerradas`, aquí abajo;
//     `lib/acceso-alumno.test.ts` falla si una ruta de esas no las llama.
//
// EL MIDDLEWARE NO LA USA: corre en Edge y sin base de datos, y mira solo la
// firma de la cookie. Ver su cabecera.
// ---------------------------------------------------------------

import "server-only";
import { cache } from "react";
import { NextResponse } from "next/server";
import { obtenerPerfil } from "@/lib/gestion";
import { impagoSinContarPase } from "@/lib/estado-acceso";
import { leerPases } from "@/lib/pases";
import { esIdPase } from "@/lib/pase-id";
import { textosActuales } from "@/lib/idioma-servidor";
import type { SesionAbierta } from "@/lib/sesion";

export type AccesoAlumno = {
  puedeEntrar: boolean;
  origen: "equipo" | "plan" | "pase" | "plan+pase" | "ninguno";
  tienePase: boolean;
  /** Sin ficha en Gestión: su id es `pase-…`. */
  soloPase: boolean;
  cursos: "plan" | "todos";
  sinDrip: boolean;
  paraTi: boolean;
  clases: boolean;
  diploma: boolean;
  /** Hasta cuándo llega el pase, o null si no tiene. */
  hasta: Date | null;
  /** Tiene pase y además una suscripción en espera: se le avisa sin bloquear. */
  avisoPago: boolean;
};

const COMO_SIEMPRE: AccesoAlumno = {
  puedeEntrar: true,
  origen: "plan",
  tienePase: false,
  soloPase: false,
  cursos: "plan",
  sinDrip: false,
  paraTi: true,
  clases: true,
  diploma: true,
  hasta: null,
  avisoPago: false,
};

const EQUIPO: AccesoAlumno = { ...COMO_SIEMPRE, origen: "equipo" };

const SIN_ACCESO: AccesoAlumno = {
  ...COMO_SIEMPRE,
  puedeEntrar: false,
  origen: "ninguno",
  paraTi: false,
  clases: false,
  diploma: false,
};

/**
 * El acceso de un alumno, por su id. Es lo que usan las pantallas: al equipo
 * revisando una ficha le tienen que salir igual que a ese alumno.
 *
 * Sin pase cuesta una sola consulta a la base del LMS, y ninguna a Gestión.
 */
export const accesoPorAlumno = cache(async (alumnoId: string): Promise<AccesoAlumno> => {
  if (alumnoId === "") return EQUIPO;

  const { vivo, fallo } = await leerPases(alumnoId);

  if (esIdPase(alumnoId)) {
    // La base no contesta: no se echa a nadie por eso, y sin base tampoco hay
    // curso que enseñar. Se le trata como a quien tiene pase.
    if (!vivo && !fallo) return SIN_ACCESO;
    return {
      puedeEntrar: true,
      origen: "pase",
      tienePase: true,
      soloPase: true,
      cursos: "todos",
      sinDrip: true,
      paraTi: false,
      clases: false,
      diploma: false,
      hasta: vivo?.hasta ?? null,
      avisoPago: false,
    };
  }

  if (!vivo) return COMO_SIEMPRE;

  const [perfil, enEspera] = await Promise.all([obtenerPerfil(alumnoId), impagoSinContarPase(alumnoId)]);
  const planActivo = perfil?.asignacionActiva === true && !enEspera;

  return {
    puedeEntrar: true,
    origen: planActivo ? "plan+pase" : "pase",
    tienePase: true,
    soloPase: false,
    cursos: "todos",
    sinDrip: true,
    paraTi: planActivo,
    clases: !enEspera,
    diploma: true,
    hasta: vivo.hasta,
    avisoPago: enEspera,
  };
});

type Quien = Pick<SesionAbierta, "rol" | "alumnoId">;

/** El acceso de quien ha entrado. El equipo, sin límites. */
export async function accesoDelAlumno(quien: Quien | null): Promise<AccesoAlumno> {
  if (!quien) return SIN_ACCESO;
  if (quien.rol !== "alumno" || !quien.alumnoId) return EQUIPO;
  return accesoPorAlumno(quien.alumnoId);
}

/** ¿Hay que rechazar a esta sesión en lo que es de «Para ti»? */
export async function paraTiCerrado(quien: Quien | null): Promise<boolean> {
  return !(await accesoDelAlumno(quien)).paraTi;
}

/** ¿Hay que rechazar a esta sesión en lo que es de clases? */
export async function clasesCerradas(quien: Quien | null): Promise<boolean> {
  return !(await accesoDelAlumno(quien)).clases;
}

/** El código con el que las rutas de Para ti rechazan a quien no lo tiene. */
export const CODIGO_PARA_TI = "para_ti_cerrado";

export function respuestaParaTiCerrado(): NextResponse {
  return NextResponse.json(
    { codigo: CODIGO_PARA_TI, error: textosActuales().pases.paraTiTexto },
    { status: 403, headers: { "cache-control": "no-store" } }
  );
}
