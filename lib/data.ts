// ---------------------------------------------------------------
// BIBLIOTECA DE BLOQUES
// Los bloques son independientes de los alumnos: un mismo bloque se
// reutiliza entre alumnos del mismo nivel con la misma dificultad.
// ---------------------------------------------------------------

/**
 * EL VEREDICTO QUE ENCABEZA LA CORRECCIÓN.
 *
 * Las dos frases que el alumno lee justo al responder, antes de la
 * explicación: una si acierta y otra si no. Las escribe el modelo para
 * ESE ejercicio, porque un texto fijo —"Eso es" / "Casi"— deja de
 * leerse hacia el tercero de los diez, y lo que queda entonces es un
 * adorno que el ojo se salta.
 *
 * Son OPCIONALES a propósito, y no por prudencia con el esquema:
 *
 *   · Los 1.492 ejercicios importados de LearnDash no los traen nunca.
 *   · Los bloques escritos a mano de aquí abajo y del banco, tampoco.
 *   · Y un bloque generado al que el modelo no se los rellene tiene que
 *     seguir siendo un bloque válido: perder un veredicto es perder una
 *     frase, y tirar los diez ejercicios por eso es peor negocio.
 *
 * Cuando faltan, el visor pone los de siempre.
 */
export type Veredictos = {
  /** Al acertar. Ajustado a si el acierto era fácil o tenía mérito. */
  veredictoAcierto?: string;
  /** Al fallar. Nunca lenguaje de error: ni "wrong" ni "incorrect". */
  veredictoFallo?: string;
};

export type Reconocer = Veredictos & {
  tipo: "reconocer";
  id: string;
  enunciado: string;
  opciones: string[];
  correcta: number;
  explicacion: string;
};

export type Transformar = Veredictos & {
  tipo: "transformar";
  id: string;
  instruccion: string;
  frase: string;
  respuestas: string[]; // la primera es la que se muestra como modelo
  pista: string;
  explicacion: string;
};

export type Producir = {
  tipo: "producir";
  id: string;
  instruccion: string;
  contexto: string;
  criterios: string[];
  modelo: string;
};

export type Ejercicio = Reconocer | Transformar | Producir;

export type Bloque = {
  id: string;
  titulo: string;
  area: string;
  /**
   * A1 y A2 existen porque en Gestión hay 29 alumnos de esos niveles.
   * Servirles material B1 sería darles ejercicios que no entienden, así
   * que tienen banco propio en `lib/banco.ts`.
   */
  nivel: "A1" | "A2" | "B1" | "B2" | "C1";
  intro: string;
  minutos: number;
  ejercicios: Ejercicio[];
  /**
   * LA CLASE DE LA QUE SALE EL BLOQUE: es lo que hace que cada parada de
   * la ruta diga de qué clase viene —«Generada a partir de tu clase del
   * 20 de septiembre con Laura»— en vez de que cinco paradas digan «en
   * tu última clase» cuando solo una puede serlo.
   *
   *   fecha     el día de la clase analizada, en ISO `YYYY-MM-DD` tal y
   *             como lo da Gestión (`fecha_clase`). Se formatea al pintar,
   *             en el idioma del alumno.
   *   profesor  el nombre de pila de su profesor en ese momento.
   *
   * La estampa `app/api/generar-bloque` en cada bloque que genera —ya
   * no se genera sin clase analizada— y la conserva `validarBloque`
   * al releer. NO la llevan los bloques del banco, que no salen de
   * ninguna clase; y un bloque sin ella NO ES UNA PARADA: la ruta se
   * construye solo con los que la tienen (`leerBloquesGenerados`).
   */
  claseOrigen?: { fecha: string; profesor: string };
  /**
   * EN QUÉ IDIOMA ESTÁ ESCRITO EL ANDAMIO de este bloque: el título, la
   * intro, las instrucciones, las pistas, los criterios, las
   * explicaciones y los veredictos. El ejercicio en sí —la frase, las
   * opciones, las respuestas— va en inglés en todos los bloques y no
   * depende de esto.
   *
   * AUSENTE SIGNIFICA ESPAÑOL, y no es un valor por defecto de
   * conveniencia: es lo que de verdad son todos los bloques escritos
   * antes de que esto existiera —los seis del banco y las filas que ya
   * están en `bloques_generados`—. Poner "es" a mano en los del
   * código no cambiaría nada y dejaría fuera igual a las filas de la
   * base, así que el que lee decide con la misma regla en los dos
   * sitios.
   *
   * Lo estampa quien genera, que sabe en qué idioma lo pidió; no se le
   * pregunta al modelo, que podría decir otra cosa que lo que escribió.
   */
  idioma?: "en" | "es";
};

// ---------------------------------------------------------------
// LO QUE DEVUELVE DRC GESTIÓN
// Estos tipos reflejan las dos vistas del contrato, no las tablas.
// Las lecturas viven en `lib/gestion.ts`; aquí solo está la forma.
// ---------------------------------------------------------------

/** Exámenes que sabemos preparar con formato propio. */
export type TipoExamen = "b2_first" | "c1_advanced" | "ielts" | "b1_preliminary";

/** Nombre de cara al alumno. El identificador interno no se enseña nunca. */
export const NOMBRE_EXAMEN: Record<TipoExamen, string> = {
  b2_first: "B2 First",
  c1_advanced: "C1 Advanced",
  ielts: "IELTS",
  b1_preliminary: "B1 Preliminary",
};

/**
 * Fila de `vista_perfil_alumno`, ya deduplicada y normalizada.
 *
 * Los campos del perfil (de `ocupacion` en adelante) solo tienen valor
 * cuando el alumno ha rellenado el formulario de Gestión: en la mayoría
 * de las filas son null.
 */
export type PerfilAlumno = {
  alumnoId: string;
  nombre: string;
  email: string;
  /** Tal cual viene de Gestión: incluye A1 y A2, no solo B1/B2/C1. */
  nivel: string;
  /** Texto del producto de WooCommerce. Lleva horarios y días pegados. */
  plan: string;
  producto: string | null;
  /**
   * NO es un objetivo pedagógico: es una copia literal del texto del
   * producto de WooCommerce, con horarios y días. No se enseña al alumno
   * ni se usa para generar ejercicios. Está aquí por si sirve más adelante.
   */
  objetivoSetter: string | null;
  profesor: string;
  /**
   * Cuándo empezó con la academia (`assignments.start_date`, el más
   * antiguo de sus assignments activos). Es lo que fija la apertura
   * progresiva del curso. Null en los pocos alumnos sin fecha: esos ven
   * el curso entero, que es el lado seguro por el que fallar.
   */
  fechaInicio: string | null;
  ocupacion: string | null;
  objetivoPerfil: string | null;
  puntosFuertes: string | null;
  puntosDebiles: string | null;
  estiloAprendizaje: string | null;
  focoRecomendado: string | null;
  /** Llega como string JSON desde PostgREST; aquí ya viene parseado. */
  respuestasFormulario: Record<string, unknown> | null;
  tienePerfil: boolean;
  /**
   * Horas de clase a la semana del plan que está dando de verdad. Las
   * pone Gestión en la vista resolviendo antes qué assignment manda y si
   * cuentan las celdas del calendario o el número contratado.
   *
   * NULL MIENTRAS NO SE CORRA `supabase/gestion-vista-perfil-ritmo.sql`,
   * y sin ellas no hay banner de ritmo: no hay entre qué dividir. El
   * resto de la pantalla de progreso funciona igual. Mismo trato que
   * `formToken`, y por el mismo motivo: el orden de despliegue da igual.
   */
  horasSemanales: number | null;
  /**
   * `assignments.plan`, que NO es lo mismo que `plan`. Aquel es el texto
   * del producto de WooCommerce; este es el plan que el equipo tiene
   * apuntado, y es uno de los tres textos donde Gestión busca si el
   * alumno prepara un examen.
   *
   * Existe para que la meta salga idéntica en las dos pantallas. Con los
   * textos que el LMS ya tenía, difería en 10 de 174 alumnos.
   */
  planContratado: string | null;
  /**
   * `student_profiles.teacher_confirmed_level`: el nivel que confirma el
   * profesor tras las primeras clases, y el que manda sobre todos los
   * demás en la regla de Gestión.
   *
   * Hoy está vacío en los 174. La columna existe —ya no da 42703— pero
   * ningún profesor la ha usado todavía. Viaja igualmente para que el
   * día que alguien la rellene el LMS no se quede atrás en silencio.
   */
  nivelProfesor: string | null;
  /** `student_profiles.current_level`. Hoy relleno en 1 de 174. */
  nivelFicha: string | null;
  /** `student_profiles.level_test_cefr`, la prueba de nivel. Hoy 12 de 174. */
  nivelPrueba: string | null;
  /**
   * Token del formulario de perfil que este alumno puede usar ahora, o
   * null si no tiene ninguno utilizable —que es el caso de 123 de los
   * 169—. Lo resuelve Gestión en la propia vista: el más reciente sin
   * completar y sin caducar. Aquí no se decide nada, solo se lee.
   *
   * Null también mientras Gestión no haya ejecutado
   * `supabase/gestion-vista-perfil-token.sql`: la vista se lee con
   * `select("*")`, así que la columna que todavía no existe llega
   * `undefined` y el botón simplemente no se pinta. El orden de
   * despliegue da igual.
   */
  formToken: string | null;
  /**
   * Cuándo se le emitió el último formulario, sirva o no todavía. Null
   * si nunca se le emitió ninguno, que son 87 de los 169.
   *
   * Está separado de `formToken` porque responden a preguntas
   * distintas: aquel dice si HAY a dónde mandarle, este si YA le
   * mandaron algo. Con solo el primero, el aviso tendría que elegir
   * entre "te lo envió" y "te lo enviará" sin saber cuál es verdad.
   */
  formTokenEnviadoEn: string | null;
};

/**
 * Guía que el análisis de la clase deja preparada para la siguiente.
 * Es el material más valioso que hay: lo escribió el análisis a partir
 * del transcript, así que no hay que volver a procesar el transcript.
 */
export type GuiaProxima = {
  priority: string;
  warmUp: string;
  mainFocus: string;
  activity: string;
  notes: string;
};

/** Fila de `vista_ultima_clase`, normalizada. */
export type UltimaClase = {
  alumnoId: string;
  /** ISO corto, `YYYY-MM-DD`. */
  fechaClase: string;
  titulo: string;
  temas: string;
  errores: string;
  notasProgreso: string;
  /** Llega como string JSON desde PostgREST; aquí ya viene parseado. */
  guiaProxima: GuiaProxima | null;
  analizadoEn: string;
};

/** Lo justo para pintar la lista de la home sin arrastrar el perfil entero. */
export type ResumenAlumno = {
  alumnoId: string;
  nombre: string;
  /** Tal y como está escrito en Gestión: es la clave con la que entra. */
  email: string;
  nivel: string;
  profesor: string;
};
