// ---------------------------------------------------------------
// LAS ENTRADAS A CLASE POR LA PLATAFORMA
//
// Lo que se mide es el CLIC en «Unirse a la clase», no la asistencia:
// quien entra por el enlace de WhatsApp o del calendario de Google no
// pasa por aquí. Todo lo que lo enseña dice «entradas por la plataforma».
//
// El botón ya no lleva el `meet_link`: lleva a `/clase/entrar`, que
// vuelve a calcular en el servidor las clases del alumno, apunta el clic
// en `entradas_clase` (base del LMS) y redirige a la sala. La URL de
// destino nunca viaja en la petición: solo qué clase se pulsó, y eso se
// comprueba contra las suyas.
//
// Módulo puro: sin `server-only`, lo importan el botón y las pruebas. Lo
// que lee y escribe en la base está en `lib/entradas-clase-servidor.ts`.
// ---------------------------------------------------------------

import { enlaceDeClase, ventanaAbierta, type ProximaClase } from "@/lib/clases";
import { conFoco } from "@/lib/foco";

/**
 * Desde dónde se pulsó. Lista cerrada: lo que no esté aquí se guarda
 * como `desconocido`. `email` está reservado para cuando un correo lleve
 * el botón; hoy ninguno lo lleva.
 */
export const ORIGENES = ["dashboard", "mis_clases", "calendario", "email", "desconocido"] as const;
export type Origen = (typeof ORIGENES)[number];

export const ETIQUETA_ORIGEN: Record<Origen, string> = {
  dashboard: "Inicio",
  mis_clases: "Mis clases",
  calendario: "Calendario",
  email: "Email",
  desconocido: "Sin origen",
};

export function comoOrigen(valor: unknown): Origen {
  return typeof valor === "string" && (ORIGENES as readonly string[]).includes(valor)
    ? (valor as Origen)
    : "desconocido";
}

/** La ruta de entrada. */
export const RUTA_ENTRAR = "/clase/entrar";

/** La pantalla de cuando no hay sala que abrir. */
export const RUTA_SIN_ENLACE = "/clase/sin-enlace";

/** "2026-10-12T17:00": qué clase se pulsó. Es lo único de la clase que va en la URL. */
export function claveDeClase(clase: Pick<ProximaClase, "fecha" | "desde">): string {
  return `${clase.fecha}T${clase.desde}`;
}

/**
 * El identificador que se guarda. Gestión no tiene id de clase —son
 * celdas de un calendario—, así que es la fecha, la hora y el profesor.
 * Dos clics a la misma clase dan el mismo, y por eso se deduplica con él.
 */
export function idDeClase(clase: Pick<ProximaClase, "fecha" | "desde" | "teacherId">): string {
  return `${claveDeClase(clase)}|${clase.teacherId}`;
}

/**
 * El `href` del botón. Con `foco` —el equipo revisando una ficha— lleva
 * `?alumno=`, para que la ruta sepa de quién es la sala; el clic de un
 * administrador no se apunta.
 */
export function hrefEntrada(clase: Pick<ProximaClase, "fecha" | "desde">, origen: Origen, foco: string | null): string {
  const p = new URLSearchParams({ origen, clase: claveDeClase(clase) });
  return conFoco(`${RUTA_ENTRAR}?${p.toString()}`, foco);
}

export type Entrada = {
  /** A dónde se redirige, ya validado por `enlaceDeClase`. Null: no hay sala. */
  destino: string | null;
  /** La clase a la que cuenta el clic, o null si no cae en ninguna. */
  clase: ProximaClase | null;
};

/**
 * A qué clase va un clic y a qué sala se manda.
 *
 * LA CLASE: la que tiene la ventana abierta ahora —de `MINUTOS_ANTES`
 * antes de empezar hasta que termina—, que es cuando el botón existe.
 * Si hay dos abiertas a la vez gana la pulsada, y si no se sabe cuál
 * fue, la que termina antes, como en `proximaClase`. Fuera de toda
 * ventana (una pestaña vieja), el clic se guarda sin clase.
 *
 * LA SALA, por orden: la de esa clase; la de la pulsada aunque ya no
 * esté abierta; la de la próxima; y la de la ficha. El alumno que pulsa
 * quiere entrar, y un fallo aquí no puede dejarle fuera de su clase.
 */
export function resolverEntrada({
  cercanas,
  pedida,
  proxima,
  enlaceFicha,
  ahora,
}: {
  /** `clasesCercanas`: ayer, hoy y mañana, sin las canceladas. */
  cercanas: ProximaClase[];
  /** La `clave` de la URL, sin validar. */
  pedida: string | null;
  proxima: ProximaClase | null;
  /** El `meet_link` de `vista_perfil_alumno`, crudo. */
  enlaceFicha: string | null;
  ahora: Date;
}): Entrada {
  const laPedida = pedida ? cercanas.find((c) => claveDeClase(c) === pedida) ?? null : null;
  const abiertas = cercanas
    .filter((c) => ventanaAbierta(c, ahora))
    .sort((a, b) => a.terminaEn.getTime() - b.terminaEn.getTime());
  const clase = (laPedida && abiertas.includes(laPedida) ? laPedida : abiertas[0]) ?? null;

  const destino =
    enlaceDeClase(clase?.meetLink) ??
    enlaceDeClase(laPedida?.meetLink) ??
    enlaceDeClase(proxima?.meetLink) ??
    enlaceDeClase(enlaceFicha);

  return { destino, clase };
}

/** Minutos del clic respecto al inicio programado. Negativo: antes de empezar. */
export function minutosDesdeInicio(clase: ProximaClase, ahora: Date): number {
  return Math.round((ahora.getTime() - clase.empiezaEn.getTime()) / 60_000);
}

// ---------------------------------------------------------------
// LO QUE ENSEÑA EL PANEL
// ---------------------------------------------------------------

/** Una fila de `entradas_clase`, tal como se lee. */
export type FilaEntrada = {
  alumno_id: string;
  clase_id: string | null;
  clase_inicio: string | null;
  profesor: string | null;
  clicked_at: string;
  origen: string;
  minutos_desde_inicio: number | null;
};

/** Una clase con entrada: varios clics a la misma clase son una. */
export type ClaseConEntrada = {
  claseId: string;
  /** ISO del inicio programado. */
  inicio: string;
  profesor: string | null;
  /** El primer clic: a qué hora entró y desde dónde. */
  primera: string;
  origen: Origen;
  minutos: number | null;
  clics: number;
};

export type ResumenEntradas = {
  /** Clases distintas con al menos un clic. */
  clases: ClaseConEntrada[];
  /** Clics que no cayeron en ninguna clase. */
  sueltos: FilaEntrada[];
  /** ISO del último clic, con clase o sin ella. */
  ultima: string | null;
  /** Desde qué pantalla fue ese último clic. */
  ultimaOrigen: Origen | null;
};

/**
 * Las filas de un alumno, deduplicadas por clase. Aquí y no al guardar:
 * en la base van todos los clics en crudo.
 */
export function resumirEntradas(filas: FilaEntrada[]): ResumenEntradas {
  const ordenadas = [...filas].sort((a, b) => a.clicked_at.localeCompare(b.clicked_at));
  const porClase = new Map<string, ClaseConEntrada>();
  const sueltos: FilaEntrada[] = [];

  for (const f of ordenadas) {
    if (!f.clase_id || !f.clase_inicio) {
      sueltos.push(f);
      continue;
    }
    const ya = porClase.get(f.clase_id);
    if (ya) {
      ya.clics += 1;
      continue;
    }
    porClase.set(f.clase_id, {
      claseId: f.clase_id,
      inicio: f.clase_inicio,
      profesor: f.profesor,
      primera: f.clicked_at,
      origen: comoOrigen(f.origen),
      minutos: f.minutos_desde_inicio,
      clics: 1,
    });
  }

  return {
    clases: Array.from(porClase.values()).sort((a, b) => b.inicio.localeCompare(a.inicio)),
    sueltos: sueltos.reverse(),
    ultima: ordenadas.length > 0 ? ordenadas[ordenadas.length - 1].clicked_at : null,
    ultimaOrigen: ordenadas.length > 0 ? comoOrigen(ordenadas[ordenadas.length - 1].origen) : null,
  };
}

// ---------------------------------------------------------------
// EL MES, EN HORA DE ESPAÑA
// ---------------------------------------------------------------

const ES_MES = /^(\d{4})-(0[1-9]|1[0-2])$/;

/** "2026-10", o null si no tiene esa forma. */
export function comoMes(valor: unknown): string | null {
  return typeof valor === "string" && ES_MES.test(valor) ? valor : null;
}

/** El mes de un día natural "2026-10-12" → "2026-10". */
export function mesDe(dia: string): string {
  return dia.slice(0, 7);
}

/** El mes anterior o el siguiente. */
export function mesVecino(mes: string, paso: -1 | 1): string {
  const [a, m] = mes.split("-").map(Number);
  const total = a * 12 + (m - 1) + paso;
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, "0")}`;
}

/** El primer día del mes y el del siguiente, "2026-10-01" y "2026-11-01". */
export function limitesDelMes(mes: string): { desde: string; hasta: string } {
  return { desde: `${mes}-01`, hasta: `${mesVecino(mes, 1)}-01` };
}

// ---------------------------------------------------------------
// EL PORCENTAJE: CLASES DADAS CON ENTRADA POR EL BOTÓN
//
// Una sola cuenta para el panel y para «Entradas a clase»: cada pantalla
// pone su rango —7 / 30 días / todo, o un mes— y las dos llaman aquí.
//
// EL DENOMINADOR ES GESTIÓN: las clases dadas según el parte del
// profesor (`vista_partes_clase`), tipos `normal` y `recuperacion`. Las
// canceladas, las reprogramadas y las faltas no entran: si no hubo clase,
// no había a qué entrar. Una clase sin parte todavía no está en ningún
// lado, ni arriba ni abajo, y entra sola cuando el profesor lo sube.
//
// EL NUMERADOR, las de ese denominador con al menos un clic asociado.
// Tres clics a la misma clase son una.
//
// EL CRUCE ES POR ALUMNO, DÍA Y HORA DE INICIO, en hora de Madrid: el
// parte trae `fecha` y `hora`, y el clic los lleva en su `clase_id`
// ("2026-10-12T17:00|t-123"). El profesor no entra en la clave: en una
// sustitución el parte lo sube otro.
//
// LOS CLICS A UNA CLASE QUE FIGURA COMO `falta_sin_aviso` no se tiran
// en silencio: salen aparte, como alerta. Tampoco cuentan.
// ---------------------------------------------------------------

/** Los tipos de parte que son una clase dada. */
export const TIPOS_DADA: ReadonlySet<string> = new Set(["normal", "recuperacion"]);

/** El parte de una clase a la que el alumno no fue sin avisar. */
export const TIPO_FALTA_SIN_AVISO = "falta_sin_aviso";

/** Lo que hace falta de un parte de Gestión para la cuenta. */
export type ParteParaMedir = {
  alumnoId: string;
  /** "AAAA-MM-DD", en Madrid. */
  fecha: string;
  /** "HH:MM", en Madrid, o null si el parte no la trae. */
  hora: string | null;
  tipo: string;
  profesor: string | null;
};

/** Un clic que casa con una clase que figura como falta sin aviso. */
export type FaltaConClic = {
  alumnoId: string;
  /** El profesor del parte. */
  profesor: string | null;
  fecha: string;
  hora: string;
  /** Del primer clic, respecto al inicio programado. */
  minutos: number | null;
  origen: Origen;
  clics: number;
};

export type MedidaBoton = {
  /** Clases dadas en el rango. */
  clases: number;
  /** De ellas, con al menos una entrada por el botón. */
  clasesConEntrada: number;
  /** Alumnos con alguna clase dada en el rango. */
  alumnos: number;
  /** De ellos, los que entraron por el botón al menos a una. */
  alumnosConEntrada: number;
  /** alumno_id → sus dadas y cuántas con entrada. Solo quien tuvo alguna. */
  porAlumno: Record<string, { clases: number; conEntrada: number }>;
  /** Más antigua primero. */
  faltasConClic: FaltaConClic[];
};

/** "2026-10-12T17:00": el día y la hora de inicio, en Madrid. */
function claveDeParte(fecha: string, hora: string): string {
  return `${fecha}T${hora}`;
}

/** El día y la hora del `clase_id` de un clic, o null si no tiene clase. */
export function claveDeEntrada(fila: Pick<FilaEntrada, "clase_id">): string | null {
  const clave = fila.clase_id?.split("|")[0] ?? "";
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(clave) ? clave : null;
}

/**
 * La cuenta. Los partes y los clics tienen que llegar ya acotados al
 * rango y sin las cuentas del equipo; aquí solo se cruzan.
 */
export function medirBoton(partes: ParteParaMedir[], entradas: FilaEntrada[]): MedidaBoton {
  // Los clics por alumno y clase, con el primero de cada una.
  const clics = new Map<string, { primera: FilaEntrada; clics: number }>();
  for (const f of [...entradas].sort((a, b) => a.clicked_at.localeCompare(b.clicked_at))) {
    const clave = claveDeEntrada(f);
    if (!clave) continue;
    const k = `${f.alumno_id}|${clave}`;
    const ya = clics.get(k);
    if (ya) ya.clics += 1;
    else clics.set(k, { primera: f, clics: 1 });
  }

  // Las dadas, una por alumno, día y hora aunque haya dos partes. Un
  // parte sin hora cuenta como dada, pero ningún clic puede casar con él.
  const dadas = new Map<string, string>();
  const faltas = new Map<string, ParteParaMedir>();
  let sinHora = 0;
  for (const p of partes) {
    if (TIPOS_DADA.has(p.tipo)) {
      const k = p.hora ? `${p.alumnoId}|${claveDeParte(p.fecha, p.hora)}` : `${p.alumnoId}|${p.fecha}|sin-hora-${sinHora++}`;
      dadas.set(k, p.alumnoId);
    } else if (p.tipo === TIPO_FALTA_SIN_AVISO && p.hora) {
      faltas.set(`${p.alumnoId}|${claveDeParte(p.fecha, p.hora)}`, p);
    }
  }

  const porAlumno: MedidaBoton["porAlumno"] = {};
  let clasesConEntrada = 0;
  dadas.forEach((alumnoId, k) => {
    const cuenta = (porAlumno[alumnoId] ??= { clases: 0, conEntrada: 0 });
    cuenta.clases += 1;
    if (clics.has(k)) {
      cuenta.conEntrada += 1;
      clasesConEntrada += 1;
    }
  });

  // Si la misma clase tiene un parte de dada y otro de falta, manda el de dada.
  const faltasConClic: FaltaConClic[] = [];
  faltas.forEach((p, k) => {
    const c = clics.get(k);
    if (!c || dadas.has(k) || !p.hora) return;
    faltasConClic.push({
      alumnoId: p.alumnoId,
      profesor: p.profesor,
      fecha: p.fecha,
      hora: p.hora,
      minutos: c.primera.minutos_desde_inicio,
      origen: comoOrigen(c.primera.origen),
      clics: c.clics,
    });
  });
  faltasConClic.sort((a, b) => claveDeParte(a.fecha, a.hora).localeCompare(claveDeParte(b.fecha, b.hora)));

  const cuentas = Object.values(porAlumno);
  return {
    clases: dadas.size,
    clasesConEntrada,
    alumnos: cuentas.length,
    alumnosConEntrada: cuentas.filter((c) => c.conEntrada > 0).length,
    porAlumno,
    faltasConClic,
  };
}

/** Un porcentaje redondeado, o null si no hay base. */
export function porcentaje(valor: number, de: number): number | null {
  return de > 0 ? Math.round((valor / de) * 100) : null;
}
