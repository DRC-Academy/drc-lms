// ---------------------------------------------------------------
// LOS TRES MODOS DE GENERACIÓN
//
// El perfil decide qué tarjetas ve el alumno. Puede cumplir varias
// condiciones y ver varias tarjetas; puede no cumplir ninguna y ver
// solo la invitación a completar el perfil.
//
// Módulo puro: no toca la base ni el navegador. La página lo calcula
// en el servidor y le pasa el resultado ya resuelto al componente.
// ---------------------------------------------------------------

import { NOMBRE_EXAMEN, type PerfilAlumno, type TipoExamen, type UltimaClase } from "@/lib/data";
import { detectarExamen, formatearFecha } from "@/lib/perfil";
import {
  calcularDisponibilidad,
  comoFecha,
  DIAS_CONTEXTO,
  type Disponibilidad,
} from "@/lib/limites";

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
// El texto se redacta aquí y no en el componente por lo mismo que las
// esperas de las tarjetas: depende del profesor y de una fecha, que son
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

export type ModoGeneracion = "repaso" | "examen" | "contexto";

/**
 * Lo que se enseña cuando el modo todavía no está disponible.
 *
 * Se redacta aquí, en el servidor, y no en el componente: el texto
 * depende del profesor y de los días que falten, que son datos que solo
 * hay de este lado. El componente solo lo pinta.
 */
export type EsperaTarjeta = {
  /** Sustituye a `llamada` en el botón, que va desactivado. */
  etiquetaBoton: string;
  /** Una línea que explica de qué depende. Nunca por qué "no puede". */
  nota: string;
};

export type TarjetaModo = {
  modo: ModoGeneracion;
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

/** Lo que se le cuenta al alumno del formato de su examen. */
const FORMATO_EXAMEN: Record<TipoExamen, string> = {
  b2_first:
    "Con las tareas reales del Use of English: multiple-choice cloze, open cloze y key word transformations.",
  c1_advanced:
    "Con las tareas reales del Use of English de C1: open cloze, word formation y key word transformations.",
  b1_preliminary:
    "Con las tareas reales del examen: multiple-choice cloze, open cloze y frases para reescribir.",
  ielts:
    "Con tareas al estilo del examen: completar frases, parafrasear y vocabulario académico.",
};

/** ¿Tenemos material para ambientar los ejercicios en su vida real? */
export function tieneContexto(perfil: PerfilAlumno | null): boolean {
  if (!perfil) return false;
  // La condición es tener el dato, no el flag `tiene_perfil`: ese campo
  // viene mal calculado de Gestión y deja fuera a 3 alumnos que sí lo
  // han rellenado.
  return perfil.ocupacion !== null || perfil.objetivoPerfil !== null;
}

function tarjetaRepaso(
  perfil: PerfilAlumno | null,
  clase: UltimaClase
): Omit<TarjetaModo, "espera"> {
  const fecha = formatearFecha(clase.fechaClase);
  const profesor = perfil?.profesor.trim();

  // Sin perfil no sabemos quién dio la clase: se cuenta sin el nombre
  // en lugar de esconder la tarjeta.
  const descripcion = profesor
    ? `${profesor} trabajó contigo ${clase.titulo} el ${fecha}.`
    : `Trabajaste ${clase.titulo} el ${fecha}.`;

  return {
    modo: "repaso",
    etiqueta: "Tu última clase",
    titulo: "Lo de tu última clase",
    descripcion,
    llamada: "Repasar lo de clase",
  };
}

function tarjetaExamen(examen: TipoExamen): Omit<TarjetaModo, "espera"> {
  return {
    modo: "examen",
    etiqueta: "Tu examen",
    titulo: `Practica para tu ${NOMBRE_EXAMEN[examen]}`,
    descripcion: FORMATO_EXAMEN[examen],
    llamada: "Practicar el formato",
  };
}

function tarjetaContexto(perfil: PerfilAlumno): Omit<TarjetaModo, "espera"> {
  // La ocupación describe mejor la situación; el objetivo entra cuando
  // no hay ocupación. Siempre precedida de una frase nuestra, para que
  // no parezca un campo volcado en pantalla.
  const fuente = perfil.ocupacion ?? perfil.objetivoPerfil ?? "";

  return {
    modo: "contexto",
    // "Tu día a día" y no "Tu contexto": nombra lo que el alumno
    // reconoce —su trabajo, sus correos, sus reuniones— en vez de la
    // palabra con la que lo llamamos nosotros por dentro.
    etiqueta: "Tu día a día",
    titulo: "Inglés para tu trabajo",
    descripcion: `Ejercicios con situaciones tuyas, no frases de libro. ${primeraFrase(fuente)}`,
    llamada: "Practicar con tu contexto",
  };
}

// ---------------------------------------------------------------
// LO QUE SE CUENTA MIENTRAS NO TOCA
//
// Ninguno de estos textos dice que el alumno no pueda. Dicen de qué
// depende, que es distinto: de su próxima clase, de que su perfil dé
// para algo nuevo, de que pase el día. La espera es una consecuencia de
// cómo funciona el material, no una norma que se le impone.
// ---------------------------------------------------------------

function redactarEspera(
  disponibilidad: Disponibilidad,
  profesor: string
): EsperaTarjeta | null {
  if (disponibilidad.disponible) return null;

  if (disponibilidad.motivo === "clase") {
    // El vínculo con el profesor es el punto: lo siguiente que desbloquea
    // esto es su próxima clase, no un contador. Sin nombre se cuenta
    // igual, sin fingir que lo sabemos.
    return {
      etiquetaBoton: "Después de tu próxima clase",
      nota: profesor
        ? `Ya has repasado lo de tu última clase. En cuanto tengas la siguiente con ${profesor}, preparamos el próximo bloque.`
        : "Ya has repasado lo de tu última clase. En cuanto tengas la siguiente, preparamos el próximo bloque.",
    };
  }

  if (disponibilidad.motivo === "dias") {
    const dias = disponibilidad.diasRestantes;
    return {
      etiquetaBoton: dias === 1 ? "Disponible mañana" : `Disponible en ${dias} días`,
      nota: `Estos ejercicios salen de tu perfil, y eso no cambia de un día para otro. Cada ${DIAS_CONTEXTO} días te preparamos uno nuevo.`,
    };
  }

  return {
    etiquetaBoton: "Disponible mañana",
    nota: "Ya has practicado el formato hoy. Mañana preparamos otro.",
  };
}

/**
 * Tarjetas que le tocan a este alumno, en orden de cercanía: lo que
 * acaba de ver en clase, luego su examen, luego su contexto.
 *
 * Cada una llega sabiendo ya si se puede pulsar. Se decide aquí y no al
 * pulsar para que el alumno no choque contra nada: ve antes de tocar
 * que ese bloque le toca mañana, y con las otras tarjetas activas.
 */
export function calcularTarjetas(
  perfil: PerfilAlumno | null,
  ultimaClase: UltimaClase | null,
  ultimasGeneraciones: Record<ModoGeneracion, string | null>,
  ahora: Date = new Date()
): TarjetaModo[] {
  const tarjetas: TarjetaModo[] = [];
  const analizadaEn = comoFecha(ultimaClase?.analizadoEn);
  const profesor = perfil?.profesor.trim() ?? "";

  const conEspera = (tarjeta: Omit<TarjetaModo, "espera">): TarjetaModo => ({
    ...tarjeta,
    espera: redactarEspera(
      calcularDisponibilidad(
        tarjeta.modo,
        comoFecha(ultimasGeneraciones[tarjeta.modo]),
        analizadaEn,
        ahora
      ),
      profesor
    ),
  });

  if (ultimaClase) tarjetas.push(conEspera(tarjetaRepaso(perfil, ultimaClase)));

  const examen = perfil ? detectarExamen(perfil.plan) : null;
  if (examen) tarjetas.push(conEspera(tarjetaExamen(examen)));

  if (perfil && tieneContexto(perfil)) tarjetas.push(conEspera(tarjetaContexto(perfil)));

  return tarjetas;
}
