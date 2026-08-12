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

// ---------------------------------------------------------------
// PENDIENTE: URL del formulario de perfil de DRC Gestión.
// El LMS no escribe en la base, así que el formulario vive en Gestión
// y aquí solo enlazamos. Sustituir por la definitiva cuando se decida.
// ---------------------------------------------------------------
export const URL_FORMULARIO = "https://gestion.drcacademy.es/perfil";

export type ModoGeneracion = "repaso" | "examen" | "contexto";

export type TarjetaModo = {
  modo: ModoGeneracion;
  etiqueta: string;
  titulo: string;
  descripcion: string;
  llamada: string;
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

function tarjetaRepaso(perfil: PerfilAlumno | null, clase: UltimaClase): TarjetaModo {
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

function tarjetaExamen(examen: TipoExamen): TarjetaModo {
  return {
    modo: "examen",
    etiqueta: "Tu examen",
    titulo: `Practica para tu ${NOMBRE_EXAMEN[examen]}`,
    descripcion: FORMATO_EXAMEN[examen],
    llamada: "Practicar el formato",
  };
}

function tarjetaContexto(perfil: PerfilAlumno): TarjetaModo {
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

/**
 * Tarjetas que le tocan a este alumno, en orden de cercanía: lo que
 * acaba de ver en clase, luego su examen, luego su contexto.
 */
export function calcularTarjetas(
  perfil: PerfilAlumno | null,
  ultimaClase: UltimaClase | null
): TarjetaModo[] {
  const tarjetas: TarjetaModo[] = [];

  if (ultimaClase) tarjetas.push(tarjetaRepaso(perfil, ultimaClase));

  const examen = perfil ? detectarExamen(perfil.plan) : null;
  if (examen) tarjetas.push(tarjetaExamen(examen));

  if (perfil && tieneContexto(perfil)) tarjetas.push(tarjetaContexto(perfil));

  return tarjetas;
}
