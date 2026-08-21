// ---------------------------------------------------------------
// UN SOLO MODO DE GENERACIÓN
//
// Había tres —repaso, examen y contexto— y el alumno elegía. Elegir era
// el problema: las tres fuentes son suyas y se explican entre ellas, así
// que partirlas obligaba a que en cada bloque sobraran dos. Un alumno
// que prepara el First y trabaja en una gestoría tenía que decidir si
// hoy practicaba su clase, su examen o su trabajo, cuando lo que
// necesita es un bloque que sea las tres cosas.
//
// Ahora hay un botón. Lo que había detrás de los tres modos no se ha
// perdido: se ha juntado dentro de un único prompt, que las combina y
// las pesa (ver `lib/prompt-bloque.ts`).
//
// EL HISTÓRICO NO SE MARCA. Los bloques generados con los tres modos
// antiguos se enseñan exactamente igual que los nuevos, sin distintivo
// de ningún tipo. El alumno nunca supo que había tres modos: contárselo
// ahora, en pasado, sería explicarle una decisión nuestra que no le
// afectó nunca.
//
// Módulo puro: no toca la base ni el navegador. La página lo calcula en
// el servidor y le pasa el resultado ya resuelto al componente.
// ---------------------------------------------------------------

import type { PerfilAlumno, TipoExamen, UltimaClase } from "@/lib/data";
import { NOMBRE_EXAMEN } from "@/lib/data";
import { detectarExamen, formatearFecha } from "@/lib/perfil";
import { calcularDisponibilidad, comoFecha, type Disponibilidad } from "@/lib/limites";

// ---------------------------------------------------------------
// EL ENLACE AL FORMULARIO DE PERFIL
//
// Vive en Gestión —el LMS no escribe en esa base— y lleva el token en la
// ruta: <base>/formulario/<token>. El token sale de
// `vista_perfil_alumno.form_token`, que Gestión ya devuelve resuelto: el
// utilizable más reciente, o NULL si no hay ninguno. Ver
// `supabase/gestion-vista-perfil-token.sql`.
//
// SIN TOKEN NO HAY ENLACE, Y SIN ENLACE NO HAY BOTÓN. Devolver null aquí
// es lo que apaga la invitación entera en las dos pantallas. De los 169
// alumnos, 123 no tienen token utilizable: o son anteriores al 10-07-2026
// —cuando Gestión empezó a emitirlos— o el suyo ya caducó. Enseñarles un
// botón que abre una pantalla rota es peor que no enseñarles nada.
//
// LA BASE VIENE DEL ENTORNO. Hoy es un despliegue de Vercel; el día que
// Gestión tenga dominio propio se cambia la variable y no se toca el
// repositorio. Si no está puesta, no hay enlace: mismo camino que no
// tener token, y por la misma razón.
//
// FUNCIÓN PURA, `base` ENTRA POR PARÁMETRO. Este módulo lo importan
// componentes de cliente, y `process.env.URL_FORMULARIO_BASE` —sin
// `NEXT_PUBLIC_`— allí valdría `undefined` en silencio: el botón
// desaparecería para todos sin un solo error. Leyéndola en el servidor y
// pasándola, el que no la tenga se entera al compilar.
// ---------------------------------------------------------------
export function urlFormulario(base: string | undefined, token: string | null): string | null {
  if (!base || !token) return null;
  return `${base.replace(/\/+$/, "")}/formulario/${encodeURIComponent(token)}`;
}

// ---------------------------------------------------------------
// Y CUANDO NO HAY ENLACE, EL AVISO
//
// La tarjeta del perfil no desaparece por no tener botón: son 91 de los
// 136 alumnos sin contexto, o sea la mayoría, y dejarles el hueco en
// blanco no explica nada. Lo que cambia es que en vez de una acción
// suya, dice de quién depende.
//
// DOS FRASES PORQUE HAY DOS SITUACIONES, y la diferencia importa:
//
//   · 4 alumnos SÍ recibieron un formulario y se les caducó —duran 30
//     días—. A esos el enlace del correo ya no les abre nada, así que
//     mandarlos a buscarlo sin más sería mandarlos a una pantalla
//     muerta. Se les nombra la fecha y se les dice que lo pidan otra vez.
//
//   · 87 no han recibido nunca ninguno: son anteriores al 10-07-2026,
//     cuando Gestión empezó a emitirlos. A esos, "revisa tu correo" los
//     manda a buscar algo que no existe.
//
// El texto se redacta aquí y no en el componente por lo mismo que la
// espera de la tarjeta: depende del profesor y de una fecha, que son
// datos de este lado. El componente solo pinta.
// ---------------------------------------------------------------

export type AvisoFormulario = { titulo: string; cuerpo: string };

export function avisoFormulario(profesor: string, enviadoEn: string | null): AvisoFormulario {
  // Por el nombre de pila, como el saludo. Vacío en los pocos alumnos
  // sin profesor asignado, y entonces la frase empieza por "Tu profesor".
  const suyo = profesor.trim().split(" ")[0] ?? "";
  const quien = suyo === "" ? "Tu profesor" : suyo;

  if (enviadoEn === null) {
    return {
      titulo: "¿Nos cuentas a qué te dedicas?",
      cuerpo: `${quien} te enviará por correo un formulario para conocerte mejor. Con eso preparamos también ejercicios con tus situaciones del día a día.`,
    };
  }

  return {
    titulo: "Busca el formulario en tu correo",
    cuerpo: `${quien} te lo envió el ${formatearFecha(enviadoEn)}. Si no lo encuentras o el enlace ya no funciona, pídeselo otra vez.`,
  };
}

// ---------------------------------------------------------------
// EL MODO
// ---------------------------------------------------------------

/**
 * El único modo que se genera hoy.
 *
 * Es el valor que va a `bloques_generados.modo`. Sigue existiendo la
 * columna —y sigue habiendo miles de filas con `repaso`, `examen` y
 * `contexto`— porque el panel del equipo lee el histórico y necesita
 * distinguir de cuándo es cada bloque.
 */
export const MODO_ACTUAL = "practica";

/**
 * Todos los valores que pueden aparecer en la columna, incluidos los
 * tres que ya no se generan. Es un tipo de LECTURA: lo usa el panel para
 * repasar el histórico, nunca la generación.
 */
export type ModoHistorico = "repaso" | "examen" | "contexto" | "practica";

export const MODOS_HISTORICOS: ModoHistorico[] = ["repaso", "examen", "contexto", "practica"];

/**
 * Lo que se enseña cuando todavía no toca generar.
 *
 * Se redacta aquí, en el servidor, y no en el componente: el texto
 * depende del profesor, que es un dato que solo hay de este lado. El
 * componente solo lo pinta.
 */
export type EsperaTarjeta = {
  /** Sustituye a `llamada` en el botón, que va desactivado. */
  etiquetaBoton: string;
  /**
   * Una línea que explica de qué depende, o null cuando el botón ya lo
   * dice. Nunca por qué "no puede".
   */
  nota: string | null;
};

/** La tarjeta única de generación. Null cuando no hay de dónde tirar. */
export type TarjetaPractica = {
  etiqueta: string;
  titulo: string;
  descripcion: string;
  llamada: string;
  /** Null cuando se puede generar ya. */
  espera: EsperaTarjeta | null;
};

/**
 * `ocupacion` y `objetivo_perfil` no son etiquetas cortas: son frases
 * completas que redactó la IA de Gestión, de hasta 187 caracteres y a
 * veces con varias oraciones. Interpolarlas dentro de una frase nuestra
 * daría una gramática rota ("ejercicios para tu Trabaja en una gestoría
 * y necesita inglés…"), así que se toma la primera oración entera y se
 * usa como lo que es: una frase que ya se sostiene sola.
 */
export function primeraFrase(texto: string, maximo = 150): string {
  const limpio = texto.trim().replace(/\s+/g, " ");
  const corte = limpio.search(/[.!?](\s|$)/);
  const frase = corte === -1 ? limpio : limpio.slice(0, corte + 1);

  if (frase.length <= maximo) return frase;

  // Recorte por palabra, nunca a mitad de una.
  const recortado = frase.slice(0, maximo);
  const ultimoEspacio = recortado.lastIndexOf(" ");
  const base = ultimoEspacio > 40 ? recortado.slice(0, ultimoEspacio) : recortado;
  return `${base.replace(/[,;:]$/, "")}…`;
}

/** ¿Tenemos material para ambientar los ejercicios en su vida real? */
export function tieneContexto(perfil: PerfilAlumno | null): boolean {
  if (!perfil) return false;
  // La condición es tener el dato, no el flag `tiene_perfil`: ese campo
  // viene mal calculado de Gestión y deja fuera a 3 alumnos que sí lo
  // han rellenado.
  return perfil.ocupacion !== null || perfil.objetivoPerfil !== null;
}

// ---------------------------------------------------------------
// LA DESCRIPCIÓN
//
// Con tres tarjetas, cada una nombraba su fuente y ya está. Con una
// sola, la descripción tiene que decir de qué está hecho ESTE bloque, y
// eso cambia de alumno a alumno: uno tiene clase y examen, otro solo
// perfil, otro las cuatro cosas.
//
// Se enumeran las fuentes que ese alumno tiene de verdad. Nombrarlas es
// lo que sostiene la promesa: si dijera siempre "hecho para ti", el
// alumno sin perfil leería lo mismo que el que rellenó el formulario, y
// entonces rellenarlo no sirve de nada.
// ---------------------------------------------------------------

function describirFuentes(
  ultimaClase: UltimaClase | null,
  conContexto: boolean,
  examen: TipoExamen | null
): string {
  const frases: string[] = [];

  if (ultimaClase) {
    frases.push(`tu clase del ${formatearFecha(ultimaClase.fechaClase)}`);
    // El historial no se nombra con número de clases: al alumno no le
    // dice nada "tus últimas cuatro clases" y suena a expediente.
    frases.push("lo que se te repite");
  }
  if (conContexto) frases.push("tu día a día");
  if (examen) frases.push(`el formato del ${NOMBRE_EXAMEN[examen]}`);

  if (frases.length === 0) return "";
  if (frases.length === 1) return frases[0];

  return `${frases.slice(0, -1).join(", ")} y ${frases[frases.length - 1]}`;
}

// ---------------------------------------------------------------
// LO QUE SE CUENTA MIENTRAS NO TOCA
//
// El texto no dice que el alumno no pueda. Dice de qué depende, que es
// distinto: de su próxima clase. La espera es una consecuencia de cómo
// funciona el material —sin clase nueva no hay materia prima nueva—, no
// una norma que se le impone.
// ---------------------------------------------------------------

function redactarEspera(
  disponibilidad: Disponibilidad,
  profesor: string,
  tuvoClase: boolean
): EsperaTarjeta | null {
  if (disponibilidad.disponible) return null;

  if (!tuvoClase) {
    // Ya generó con lo único que teníamos —su perfil, su examen— y no
    // hay clase analizada que pueda traer nada nuevo. Es la espera más
    // larga de todas y por eso se cuenta entera.
    return {
      etiquetaBoton: "Después de tu primera clase",
      nota: profesor
        ? `Ya tienes tu bloque con lo que sabemos de ti. En cuanto ${profesor} analice tu primera clase, preparamos el siguiente con lo que trabajéis.`
        : "Ya tienes tu bloque con lo que sabemos de ti. En cuanto se analice tu primera clase, preparamos el siguiente con lo que trabajéis.",
    };
  }

  // SIN NOTA: el botón ya lo dice entero. Debajo hubo dos renglones
  // —"Ya has practicado lo de tu última clase. En cuanto tengas la
  // siguiente con Jimena, preparamos el próximo bloque."— que decían lo
  // mismo que el botón apagado que tenían justo debajo, y lo decían en
  // el sitio donde el alumno espera encontrar qué hacer ahora.
  //
  // El vínculo con el profesor se pierde, y es lo único que se pierde:
  // vale menos que dejar la tarjeta en dos líneas.
  return { etiquetaBoton: "Después de tu próxima clase", nota: null };
}

/**
 * La tarjeta de este alumno, o null si no hay con qué construir nada.
 *
 * Llega sabiendo ya si se puede pulsar. Se decide aquí y no al pulsar
 * para que el alumno no choque contra nada: ve antes de tocar que el
 * próximo bloque llega con su próxima clase.
 *
 * DEVUELVE NULL SOLO SIN NINGUNA FUENTE. Antes hacían falta condiciones
 * por modo; ahora basta con tener una de las cuatro cosas. Quien no
 * tiene ninguna —ni clase, ni perfil, ni examen— es a quien se le enseña
 * la invitación a completar el perfil, que es lo único que puede hacer.
 */
export function calcularTarjeta(
  perfil: PerfilAlumno | null,
  ultimaClase: UltimaClase | null,
  ultimaGeneracion: string | null,
  ahora: Date = new Date()
): TarjetaPractica | null {
  const conContexto = tieneContexto(perfil);
  const examen = perfil ? detectarExamen(perfil.plan) : null;

  if (!ultimaClase && !conContexto && !examen) return null;

  const profesor = perfil?.profesor.trim() ?? "";
  const fuentes = describirFuentes(ultimaClase, conContexto, examen);

  const espera = redactarEspera(
    calcularDisponibilidad(
      comoFecha(ultimaGeneracion),
      comoFecha(ultimaClase?.analizadoEn),
      ahora
    ),
    profesor,
    ultimaClase !== null
  );

  return {
    etiqueta: "Hecho para ti",
    titulo: "Tu bloque de práctica",
    // Sin fuentes no se llega aquí, pero la frase aguanta el caso igual
    // antes que quedarse a medias en pantalla.
    descripcion: fuentes
      ? `Diez ejercicios con ${fuentes}.`
      : "Diez ejercicios hechos con lo que sabemos de ti.",
    llamada: "Preparar mi bloque",
    espera,
  };
}

// ---------------------------------------------------------------
// EL RESUMEN DE LA ÚLTIMA CLASE
//
// La tarjeta crema que abre `/practica`. Antes salía de la tarjeta de
// repaso: se le cogía la descripción —"Aoife trabajó contigo X el 12 de
// agosto"— y se le pegaba una consecuencia. Con un modo único esa
// tarjeta ya no existe, y su descripción tampoco valdría: ahora nombra
// las cuatro fuentes a la vez y aquí se habla solo de la clase.
//
// Así que se redacta aparte, que es además donde tenía que haber estado:
// esto no describe de qué se genera un bloque, describe en qué punto
// está el alumno con su profesor.
// ---------------------------------------------------------------

export type ResumenClase = { titulo: string; cuerpo: string };

export function resumenUltimaClase(
  perfil: PerfilAlumno | null,
  ultimaClase: UltimaClase | null,
  /** Si su bloque ya está hecho y toca esperar a la siguiente clase. */
  yaGenerado: boolean
): ResumenClase {
  if (!ultimaClase) {
    return {
      titulo: "Todavía no hay clase que repasar",
      cuerpo:
        "En cuanto tu profesor analice tu primera clase, preparamos aquí un bloque con lo que trabajasteis.",
    };
  }

  const fecha = formatearFecha(ultimaClase.fechaClase);
  const profesor = perfil?.profesor.trim();

  // Sin perfil no sabemos quién dio la clase: se cuenta sin el nombre en
  // lugar de esconder la tarjeta.
  const quien = profesor
    ? `${profesor} trabajó contigo ${ultimaClase.titulo} el ${fecha}.`
    : `Trabajaste ${ultimaClase.titulo} el ${fecha}.`;

  return yaGenerado
    ? {
        titulo: "Ya lo has practicado",
        cuerpo: `${quien} En cuanto tengas la siguiente clase, preparamos el próximo bloque.`,
      }
    : {
        titulo: "Tienes clase nueva",
        cuerpo: `${quien} Ahí abajo puedes prepararte el bloque con lo que trabajasteis.`,
      };
}
