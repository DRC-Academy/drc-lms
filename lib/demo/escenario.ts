// ---------------------------------------------------------------
// EL ALUMNO DE DEMOSTRACIÓN: LO QUE GESTIÓN DIRÍA DE ÉL
//
// Diego Ruiz no existe en Gestión y no va a existir: el LMS no escribe
// allí. Lo que Gestión devolvería de él —su ficha, sus clases
// analizadas, su calendario— está escrito aquí, con LA MISMA FORMA DE
// FILA que las vistas y la tabla de Gestión (columnas en snake_case,
// `next_class_guide` como cadena JSON). Así `lib/gestion.ts` lo pasa por
// los mismos normalizadores que a un alumno real y el resto de la
// aplicación no se entera de que es una demo.
//
// NINGUNA FECHA FIJA. Todo se cuenta desde `ancla`, el día en que se
// creó o se rejuveneció la demo (`cuentas_demo.ancla`):
//
//   matrícula         ancla − 77 días (11 semanas: 24 módulos abiertos)
//   próxima clase     ancla + 2 o + 3 días, entre semana a las 19:00
//   clases pasadas    el mismo día de la semana, una por semana hacia
//                     atrás; la de hace seis semanas no se dio
//
// El día de la clase sale del ancla, y no al revés, para que la próxima
// caiga siempre a dos o tres días de ejecutar el script.
//
// LAS CLASES QUE AÚN NO HAN OCURRIDO NO EXISTEN. `escenarioDemo` recibe
// la hora y deja fuera los análisis posteriores: es lo que permite a
// `scripts/demo.ts` generar cada bloque con el material que había el día
// de su clase, y no con el de hoy.
//
// Módulo puro: sin lecturas ni `server-only`.
// ---------------------------------------------------------------

import { sumarDias } from "@/lib/fechas";
import { DIAS, instanteEnMadrid, type DiaSemana } from "@/lib/clases";
import type { FilaCalendario } from "@/lib/calendario-gestion";

/** Todos los ids de demo empiezan así; los de Gestión son `s_…` o uuid. */
export const PREFIJO_DEMO = "demo-";

export const ID_DEMO = "demo-diego-ruiz";
/**
 * Con el que se entra. En `alumno_vinculos` ya está vinculado a la cuenta
 * de pruebas (`s_1785879819493`, WooCommerce 534), que no tiene ficha en
 * Gestión: las dos puertas acaban aquí igual —el enlace porque
 * `buscarAlumnoPorEmail` mira antes la demo, y WooCommerce porque sin
 * ficha su vínculo no vale y cae a la búsqueda por email—. Lo que no se
 * puede es vincularlo a la demo: el email es único en esa tabla.
 */
export const EMAIL_DEMO = "info@drcacademy.com";
export const NOMBRE_DEMO = "Diego Ruiz";

/** El profesor, con un id que no puede chocar con los `t…` de Gestión. */
export const PROFESOR_DEMO = { teacherId: "demo-t1", nombre: "Claire" } as const;

const MEET_DEMO = "https://meet.google.com/drc-demo-cls";

/** Días desde la matrícula hasta el ancla: once semanas. */
export const DIAS_DE_CURSO = 77;

/** Horas por clase y a la semana: dos seguidas, una tarde. */
const HORAS_CLASE = 2;

// ---------------------------------------------------------------
// LAS CLASES
//
// Una por semana, de la más antigua a la más reciente. `semanasAtras`
// cuenta desde la próxima clase: 1 es la última que ha dado.
//
// Los errores se repiten a propósito, como en un B1 hispanohablante de
// verdad: present perfect frente a past simple, preposiciones calcadas
// del español («depend of», «discuss about»), falsos amigos («actually»,
// «assist», «eventually») y «people is». Unos se corrigen con las
// semanas y otros no, y las notas de progreso lo dicen.
// ---------------------------------------------------------------

type Guia = { priority: string; warmUp: string; mainFocus: string; activity: string; notes: string };

type ClaseDemo = {
  semanasAtras: number;
  titulo: string;
  temas: string;
  errores: string;
  notas: string;
  guia: Guia;
};

const CLASES: ClaseDemo[] = [
  {
    semanasAtras: 11,
    titulo: "Clase inicial de diagnóstico: presentación profesional y objetivos para reuniones con clientes",
    temas:
      "Conversación libre sobre su puesto como responsable de proyectos, el equipo y los clientes internacionales con los que trabaja. Vocabulario: project manager, stakeholder, deadline, deliverable, supplier, follow-up. Habilidades: presentarse en una reunión, explicar sus responsabilidades y hablar de lo que espera del curso (reuniones y emails en inglés).",
    errores:
      "Errores propios de un B1 que usa el inglés en el trabajo pero sin haberlo consolidado: concordancia con people (\"people is very demanding\"), falsos amigos (\"actually I work in three projects\" por currently, \"I assist to the weekly meeting\" por attend), preposiciones calcadas del español (\"it depends of the client\", \"work in a project\") y estructuras de pregunta sin auxiliar (\"what you need for the meeting?\"). Recurre al español cuando le falta un término técnico.",
    notas:
      "Al ser la primera clase analizada no hay base de comparación. Como punto de partida, Diego mantiene la conversación con fluidez razonable y tiene mucho vocabulario de su sector; el margen de mejora está en la precisión gramatical y en sonar más natural en contextos formales.",
    guia: {
      priority: "Empezar a construir la base para reuniones y emails, combinando la conversación sobre su trabajo con la corrección de los calcos más frecuentes.",
      warmUp: "Podrías arrancar preguntándole cómo le ha ido la semana en el proyecto actual, que le da pie a hablar con soltura de algo que domina.",
      mainFocus: "Tiempos de pasado para hablar de su trayectoria y de proyectos terminados, y preguntas bien formadas con auxiliar.",
      activity: "Un breve role-play de presentación en una reunión de arranque con un cliente, en el que tenga que presentarse y presentar a su equipo.",
      notes: "Conviene ir anotando los falsos amigos que salgan (actually, assist) para retomarlos; se nota que los usa sin darse cuenta.",
    },
  },
  {
    semanasAtras: 10,
    titulo: "Past simple y present perfect para hablar de la trayectoria y de proyectos",
    temas:
      "Gramática: contraste entre past simple y present perfect; for, since y ago; preguntas con how long. Vocabulario: to lead a project, to hand over, to roll out, milestone, budget overrun. Habilidades: contar su trayectoria profesional y resumir un proyecto terminado.",
    errores:
      "El punto más repetido es el uso de present perfect con marcadores de tiempo terminado (\"I have finished the report yesterday\", \"we have launched it in March\") y el presente simple donde tocaba present perfect continuo (\"I work here since 2019\"). Sigue apareciendo \"people is\" y el calco \"depend of\". Confunde for y since en dos ocasiones.",
    notas:
      "Frente a la primera clase ya formula las preguntas con auxiliar sin que se le corrija. El contraste de tiempos de pasado es el punto que más le cuesta: entiende la regla, pero bajo presión vuelve a la estructura del español.",
    guia: {
      priority: "Consolidar la diferencia entre past simple y present perfect, que es el error que más se repite, en contextos de trabajo reales.",
      warmUp: "Podría funcionar preguntarle qué ha hecho esta semana y qué hizo el lunes, para que salgan los dos tiempos de forma natural.",
      mainFocus: "Present perfect con already, yet y just frente a past simple con yesterday, last week o in March.",
      activity: "Que redacte en voz alta un mini informe de estado de un proyecto: qué se ha hecho, qué se hizo la semana pasada y qué falta.",
      notes: "Le ayuda mucho ver sus propias frases corregidas por escrito; quizá valga la pena dejarle dos o tres en el chat al terminar.",
    },
  },
  {
    semanasAtras: 9,
    titulo: "Emails profesionales: saludos, cierres y fórmulas para pedir información",
    temas:
      "Escritura: estructura de un email formal y semiformal, fórmulas de apertura y cierre (I am writing to, Could you please, I look forward to hearing from you), cómo pedir información y hacer seguimiento. Vocabulario: attached, as discussed, to follow up, to chase, ASAP y otras abreviaturas. Habilidades: reescribir un email suyo real a un proveedor.",
    errores:
      "Traducciones literales en las fórmulas (\"I write you for ask\", \"waiting your answer\", \"I remain attentive\"), preposiciones erróneas (\"discuss about the budget\", \"in the attached\", \"arrive to the office\") y el falso amigo \"eventually\" usado como posiblemente. Vuelve a aparecer el present perfect con fecha terminada (\"we have received your invoice last Monday\").",
    notas:
      "Mejora clara en las preguntas y en el uso de since con present perfect. Los errores de esta clase son sobre todo de registro y de calco en fórmulas fijas, algo esperable porque hasta ahora escribía los emails traduciendo del español.",
    guia: {
      priority: "Fijar un repertorio corto de fórmulas de email que pueda usar ya en el trabajo, y seguir con las preposiciones que calca del español.",
      warmUp: "Quizá empezar leyendo juntos un email que haya recibido esta semana de un cliente y comentar qué frases le gustaría poder usar.",
      mainFocus: "Preposiciones tras verbos (discuss, depend on, arrive at/in, reply to) dentro de frases típicas de email.",
      activity: "Reescribir entre los dos un email de seguimiento a un proveedor que no ha contestado, primero formal y luego más cercano.",
      notes: "Diego escribe muchos emails a diario: si se lleva una plantilla de fórmulas, es muy probable que la use desde el día siguiente.",
    },
  },
  {
    semanasAtras: 8,
    titulo: "Reuniones: dar opinión, mostrar acuerdo y desacuerdo con cortesía",
    temas:
      "Lenguaje funcional para reuniones: dar opinión (In my view, As far as I'm concerned), mostrar acuerdo y desacuerdo suavizado (I see your point, but…; I'm not sure I agree), interrumpir con cortesía y pedir la palabra. Vocabulario: to push back, to align, trade-off, action point. Habilidades: debate breve sobre si retrasar una entrega.",
    errores:
      "Aparece varias veces \"I am agree\" / \"I am not agree\" y \"people think that is better\" sin sujeto. Falsos amigos: \"it's a very sensible topic\" por sensitive y \"actually the situation is…\" por currently. Estructura de pregunta indirecta mal formada (\"can you explain me what is the problem?\"). Buen uso del present perfect en tres de cuatro ocasiones.",
    notas:
      "El contraste de pasados empieza a asentarse: lo corrige solo cuando se le da una pausa. En reuniones tiende a ser demasiado directo al discrepar, más por falta de recursos que por estilo; con las fórmulas de hoy ya lo suaviza.",
    guia: {
      priority: "Automatizar las fórmulas de acuerdo y desacuerdo y erradicar \"I am agree\", que sale en cuanto se relaja.",
      warmUp: "Podrías empezar pidiéndole su opinión sobre una noticia corta de su sector, para que tenga que posicionarse desde el primer minuto.",
      mainFocus: "Preguntas indirectas (Could you tell me what the problem is?) y verbos que no llevan objeto indirecto directo (explain something to someone).",
      activity: "Simular una reunión de seguimiento en la que el cliente pide adelantar una fecha y él tiene que negociar sin decir que no de entrada.",
      notes: "Conviene seguir señalando los falsos amigos cada vez que aparecen; \"actually\" y \"sensible\" siguen saliendo sin que se dé cuenta.",
    },
  },
  {
    semanasAtras: 7,
    titulo: "Preposiciones de tiempo y lugar aplicadas a plazos y agendas de proyecto",
    temas:
      "Gramática: preposiciones de tiempo (in, on, at, by, until, within) y de lugar en contexto de trabajo; diferencia entre by y until para plazos. Vocabulario: to be due, to be on track, to fall behind, schedule, timeline. Habilidades: explicar el calendario de un proyecto y fijar fechas en una llamada.",
    errores:
      "Confusión entre by y until (\"we need it until Friday\"), \"in the weekend\", \"on the morning\" y \"arrive to the site\". Se mantiene \"depend of\" pese a haberlo corregido en clases anteriores. Una frase con present perfect y ago (\"we have started two weeks ago\").",
    notas:
      "Buena evolución en reuniones: ya usa \"I see your point, but\" de forma espontánea. Las preposiciones siguen siendo el punto flojo más persistente; \"depend of\" aparece en cuatro clases seguidas y conviene tratarlo como hábito, no como despiste.",
    guia: {
      priority: "Trabajar las preposiciones como bloques fijos (depend on, be due by, arrive at) en lugar de como regla suelta, porque la regla ya la conoce.",
      warmUp: "Quizá arrancar con su agenda de la semana que viene, que obliga a usar in, on, at y by con fechas reales.",
      mainFocus: "By frente a until en plazos, y el bloque depend on / it depends on.",
      activity: "Que explique en voz alta el cronograma de su proyecto actual como si se lo presentara a un cliente nuevo.",
      notes: "La semana que viene no habrá clase por vacaciones; puede ayudar dejarle un par de ejercicios cortos de preposiciones para mantener el ritmo.",
    },
  },
  {
    semanasAtras: 5,
    titulo: "Informar de avances: present perfect con already, yet y just",
    temas:
      "Gramática: present perfect con already, yet, just y still; contraste con past simple al dar fechas concretas. Vocabulario: status update, blocker, to sign off, pending, on hold. Habilidades: dar un informe de estado oral de dos minutos y responder preguntas del cliente.",
    errores:
      "Tras la pausa vuelve el present perfect con tiempo terminado (\"the client has approved it last Thursday\") y el orden de yet (\"we haven't yet finished\"). \"People is\" aparece dos veces. Preposiciones: \"discuss about the next steps\". Pronunciación de -ed en worked y finished.",
    notas:
      "Tras la semana sin clase ha retrocedido algo en el contraste de pasados, que vuelve a ser el error principal. A cambio, el lenguaje de reuniones está consolidado: interrumpe y discrepa con naturalidad.",
    guia: {
      priority: "Volver a asentar el contraste present perfect / past simple, esta vez anclado en el informe de estado que da cada semana en el trabajo.",
      warmUp: "Podrías preguntarle qué ha avanzado su equipo desde la última clase; salen already y yet sin forzarlo.",
      mainFocus: "Posición de already, yet y still, y la regla de no usar present perfect cuando hay fecha concreta.",
      activity: "Un status update simulado en el que el cliente le interrumpe preguntando cuándo exactamente se hizo cada cosa.",
      notes: "Le funciona repetir la misma frase corregida dos o tres veces seguidas; con este error en concreto parece lo más eficaz.",
    },
  },
  {
    semanasAtras: 4,
    titulo: "Primer condicional y modales para negociar plazos con un cliente",
    temas:
      "Gramática: primer condicional (If you send us the data by Monday, we will…), unless, as long as; modales para proponer y suavizar (could, might, would be able to). Vocabulario: to meet a deadline, leeway, to compromise, to commit to. Habilidades: negociar un cambio de fecha con un cliente exigente.",
    errores:
      "Uso de will en la oración con if (\"if you will send it, we will start\"), \"I am agree with this proposal\" que reaparece bajo presión y \"depend of the supplier\". El present perfect con fecha terminada aparece solo una vez y se autocorrige.",
    notas:
      "Mejora visible en el contraste de pasados: se autocorrige en el momento. Los errores que persisten bajo presión son \"I am agree\" y las preposiciones tras depend y discuss; son los mismos de hace seis semanas.",
    guia: {
      priority: "Dar recursos de negociación con condicionales y modales, y seguir atacando los dos hábitos que salen bajo presión.",
      warmUp: "Quizá empezar con una situación real: algún cliente que le haya pedido algo imposible esta semana y cómo respondió.",
      mainFocus: "If + presente, will en la principal; unless y as long as para poner condiciones.",
      activity: "Role-play de negociación en dos rondas: primero el cliente pide adelantar la entrega y después pide añadir alcance sin mover la fecha.",
      notes: "Cuando se pone nervioso vuelve a \"I am agree\"; puede servir pactar una señal rápida para marcarlo sin cortar la conversación.",
    },
  },
  {
    semanasAtras: 3,
    titulo: "Llamadas con clientes: pedir aclaraciones y phrasal verbs de trabajo",
    temas:
      "Habilidades: comprensión oral de llamadas con acentos distintos, pedir que repitan o aclaren (Sorry, could you run that by me again?, Just to confirm…). Phrasal verbs de trabajo: follow up on, sort out, come up with, put off, get back to. Vocabulario: to clarify, to confirm, misunderstanding.",
    errores:
      "Falsos amigos en contexto de llamada (\"I will assist to the call\", \"eventually we can move it\" por possibly), orden del phrasal verb con pronombre (\"I will get back to you it\", \"sort out it\") y \"explain me\" que reaparece. Present perfect correcto casi siempre.",
    notas:
      "El contraste de pasados ya no es el error principal: aparece una sola vez en toda la clase. Los falsos amigos siguen ahí, sobre todo assist y eventually, y las llamadas con acento cerrado le cuestan más que las reuniones presenciales.",
    guia: {
      priority: "Seguir con la comprensión de llamadas y fijar la posición del pronombre en los phrasal verbs separables.",
      warmUp: "Podría funcionar escuchar un audio corto de una llamada real con acento irlandés o escocés y que resuma lo que se pidió.",
      mainFocus: "Phrasal verbs separables con pronombre (sort it out, put it off) y fórmulas para pedir aclaraciones sin perder el hilo.",
      activity: "Simular una llamada en la que el cliente habla rápido y cambia un requisito, y él tiene que confirmar por escrito lo acordado.",
      notes: "Le vendría bien una lista corta de falsos amigos de su día a día (actually, assist, eventually, sensible) para repasarla antes de cada clase.",
    },
  },
  {
    semanasAtras: 2,
    titulo: "Presentar un proyecto: signposting, comparativos y datos",
    temas:
      "Habilidades: estructurar una presentación de proyecto (Let me start by…, Moving on to…, To sum up), describir gráficos y cifras, comparar opciones. Gramática: comparativos y superlativos, much/far + comparativo. Vocabulario: to increase by, to drop, roughly, significantly, cost-effective.",
    errores:
      "Comparativos dobles (\"more cheaper\", \"more easy\") y preposiciones con cifras (\"increased in 20%\" por by, \"the cost depends of the volume\"). \"People is\" reaparece al hablar de los usuarios del cliente. Un caso de present perfect con fecha (\"we have presented it last month\").",
    notas:
      "Presenta con estructura clara y buen ritmo, algo que en las primeras clases no hacía. Los errores que quedan son de precisión: comparativos y preposiciones con cifras. \"Depend of\" sigue siendo el calco más resistente de todo el curso.",
    guia: {
      priority: "Pulir la presentación que tiene que dar a su cliente el mes que viene, trabajando comparativos y cifras.",
      warmUp: "Quizá empezar pidiéndole que compare en un minuto dos proveedores con los que trabaja.",
      mainFocus: "Comparativos y superlativos, y las preposiciones con cifras (increase by, rise to, a drop of).",
      activity: "Que presente tres diapositivas reales de su proyecto y responda a dos preguntas incómodas sobre costes.",
      notes: "Muy motivado con la presentación real; conviene aprovecharlo para trabajar sobre su material en vez de sobre ejemplos genéricos.",
    },
  },
  {
    semanasAtras: 1,
    titulo: "Gestionar cambios de alcance: sugerencias, modales y repaso de tiempos pasados",
    temas:
      "Lenguaje para gestionar cambios de alcance con un cliente: sugerir (What if we…?, I'd suggest -ing), advertir de consecuencias (That would mean…), confirmar acuerdos por escrito. Gramática: repaso de past simple y present perfect en un informe de incidencia; suggest + -ing / that. Vocabulario: scope creep, change request, impact, sign-off.",
    errores:
      "\"I suggest you to send\" en lugar de I suggest (that) you send, \"people is asking for more features\" y \"we discussed about it\". En el informe de incidencia mezcla otra vez los pasados (\"the error has appeared on Tuesday\"), aunque se corrige solo. Un falso amigo: \"actually we are in the testing phase\".",
    notas:
      "Comparado con el inicio del curso, la mejora en fluidez y en recursos para reuniones es muy clara. Los tres errores que siguen apareciendo de forma recurrente son el contraste de pasados en informes escritos, las preposiciones tras discuss y depend, y la concordancia con people.",
    guia: {
      priority: "Cerrar el bloque de reuniones con un repaso intensivo de los tres errores recurrentes: pasados, preposiciones tras verbo y people.",
      warmUp: "Podrías empezar preguntándole cómo terminó la conversación con el cliente sobre el cambio de alcance.",
      mainFocus: "Suggest y recommend con la estructura correcta, y el contraste de pasados en informes de incidencias.",
      activity: "Redactar juntos el email que confirma un cambio de alcance acordado en una reunión, con fechas y consecuencias.",
      notes: "Está muy cerca de un B1+ sólido en reuniones; lo que le separa del B2 es la precisión en esos tres puntos, más que el vocabulario.",
    },
  },
];

/** Las clases de las que sale un bloque de práctica, de la más antigua a la más reciente. */
export const CLASES_CON_BLOQUE = [5, 4, 3, 2, 1] as const;

// ---------------------------------------------------------------
// EL CALENDARIO, DESDE EL ANCLA
// ---------------------------------------------------------------

const DIAS_ENTRE_SEMANA: readonly DiaSemana[] = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"];

function diaDeLaSemana(dia: string): DiaSemana {
  return DIAS[new Date(`${dia}T00:00:00Z`).getUTCDay()];
}

/**
 * El día de la próxima clase y su hora. A dos días del ancla, o a tres
 * si el segundo cae en fin de semana; si caen los dos —el ancla es un
 * jueves—, el sábado por la mañana, que sigue estando a dos días.
 */
export function proximaDemo(ancla: string): { fecha: string; dia: DiaSemana; hora: string } {
  for (const n of [2, 3]) {
    const fecha = sumarDias(ancla, n);
    const dia = diaDeLaSemana(fecha);
    if (DIAS_ENTRE_SEMANA.includes(dia)) return { fecha, dia, hora: "19:00" };
  }
  const fecha = sumarDias(ancla, 2);
  return { fecha, dia: diaDeLaSemana(fecha), hora: "10:00" };
}

export type ClaseFechada = {
  semanasAtras: number;
  /** Día natural español, "2026-09-18". */
  fecha: string;
  empieza: Date;
  /** Cuando Gestión la habría analizado: media hora después de acabar. */
  analizadaEn: Date;
};

/** Las clases dadas, con sus fechas, de la más antigua a la más reciente. */
export function clasesFechadas(ancla: string): ClaseFechada[] {
  const proxima = proximaDemo(ancla);
  return CLASES.map((c) => {
    const fecha = sumarDias(proxima.fecha, -7 * c.semanasAtras);
    const empieza = instanteEnMadrid(fecha, proxima.hora);
    const analizadaEn = new Date(empieza.getTime() + (HORAS_CLASE + 0.5) * 3_600_000);
    return { semanasAtras: c.semanasAtras, fecha, empieza, analizadaEn };
  });
}

// ---------------------------------------------------------------
// LAS FILAS, CON LA FORMA DE GESTIÓN
// ---------------------------------------------------------------

export type Fila = Record<string, unknown>;

export type Escenario = {
  /** Fila de `vista_perfil_alumno`. */
  perfil: Fila;
  /**
   * Filas de `class_analyses` ya ocurridas a `ahora`, de la más reciente
   * a la más antigua: el orden de las consultas de `lib/gestion.ts`.
   */
  clases: Fila[];
  /** Filas de `vista_calendario_alumno`. */
  calendario: FilaCalendario[];
  /** Filas de `vista_excepciones_clase`. Ninguna: no hay nada anotado. */
  excepciones: Fila[];
};

export function escenarioDemo(ancla: string, ahora: Date): Escenario {
  const fechaInicio = sumarDias(ancla, -DIAS_DE_CURSO);
  const proxima = proximaDemo(ancla);
  const horaFin = `${String(Number(proxima.hora.slice(0, 2)) + 1).padStart(2, "0")}:00`;
  const plan = `Curso de inglés general - 2h semanales, B1 — 2h semanales · B1 · ${Number(
    proxima.hora.slice(0, 2)
  )}h ${proxima.dia.toLowerCase()}`;
  const slots = [
    { day: proxima.dia, hour: proxima.hora },
    { day: proxima.dia, hour: horaFin },
  ];

  const perfil: Fila = {
    alumno_id: ID_DEMO,
    nombre: NOMBRE_DEMO,
    email: EMAIL_DEMO,
    nivel: "B1",
    plan,
    producto: plan,
    plan_contratado: plan,
    objetivo_setter: "Inglés para el trabajo: reuniones y emails",
    profesor: PROFESOR_DEMO.nombre,
    fecha_inicio: fechaInicio,
    ocupacion:
      "Responsable de proyectos en una empresa española de ingeniería que trabaja con clientes internacionales (reuniones de seguimiento, emails y presentaciones).",
    objetivo_perfil:
      "Ganar soltura en reuniones con clientes internacionales y escribir emails profesionales claros sin depender del traductor.",
    puntos_fuertes:
      "Usa el inglés a diario en el trabajo y tiene mucho vocabulario de su sector. Mantiene la conversación con fluidez razonable y no se bloquea al hablar. Motivación muy concreta: sus reuniones y sus emails con clientes, lo que facilita anclar el material a situaciones reales.",
    puntos_debiles:
      "La precisión gramatical: mezcla past simple y present perfect, calca preposiciones del español (depend of, discuss about) y usa falsos amigos sin darse cuenta. Escribe los emails traduciendo del español, así que el registro y las fórmulas fijas le salen forzados.",
    estilo_aprendizaje:
      "Aprende mejor con material de su propio trabajo que con ejemplos genéricos. Le ayuda ver sus frases corregidas por escrito y repetirlas en voz alta. Prefiere práctica aplicada y role-plays a la explicación teórica, que en buena parte ya conoce.",
    foco_recomendado:
      "Priorizar la precisión en reuniones y emails: contraste de tiempos de pasado, preposiciones tras verbo y fórmulas de email. Trabajar siempre sobre situaciones reales de su día a día con clientes.",
    respuestas_formulario: JSON.stringify({
      q1_dedicas: "Soy jefe de proyectos en una ingeniería",
      q2_objetivo: "Llevar las reuniones con clientes en inglés sin agobiarme y escribir emails sin traductor",
      q3_pausa: "Llevo estudiando sin pausa",
      q4_como_estudiaste: ["Academia tradicional", "App (Duolingo, Babbel, etc.)"],
      q5_intentos: "Aprendí mucha gramática pero en las reuniones no me sale y cometo siempre los mismos errores",
      q6_nivel: { Hablar: "Intermedio", Escuchar: "Intermedio", Leer: "Bueno", Escribir: "Intermedio" },
      q7_cuesta: "Hablar con precisión en reuniones y escribir emails formales",
      q9_errores: "Me molesta repetir los mismos errores",
      q10_uso: ["En el trabajo (reuniones, emails, presentaciones)"],
      q11_practica: "Entre 1 y 3 horas",
    }),
    tiene_perfil: true,
    horas_semanales: HORAS_CLASE,
    nivel_profesor: "B1",
    nivel_ficha: "B1",
    nivel_prueba: null,
    form_token: null,
    form_token_enviado_en: null,
    meet_link: MEET_DEMO,
    slots,
  };

  const fechadas = new Map(clasesFechadas(ancla).map((c) => [c.semanasAtras, c]));
  const clases: Fila[] = CLASES.map((c) => {
    const f = fechadas.get(c.semanasAtras)!;
    return {
      id: `${ID_DEMO}-clase-${String(12 - c.semanasAtras).padStart(2, "0")}`,
      student_id: ID_DEMO,
      teacher_id: PROFESOR_DEMO.teacherId,
      class_number: null,
      class_date: f.fecha,
      class_title: c.titulo,
      topics_covered: c.temas,
      errors_detected: c.errores,
      progress_notes: c.notas,
      next_class_guide: JSON.stringify(c.guia),
      analyzed_at: f.analizadaEn.toISOString(),
      analysis_status: "ready",
      validation_status: "approved",
    };
  })
    .filter((fila) => Date.parse(fila.analyzed_at as string) <= ahora.getTime())
    .reverse();

  const celda = (hora: string): FilaCalendario => ({
    alumno_id: ID_DEMO,
    nombre_en_celda: NOMBRE_DEMO,
    teacher_id: PROFESOR_DEMO.teacherId,
    profesor: PROFESOR_DEMO.nombre,
    celda: `${proxima.dia}_${hora}`,
    dia: proxima.dia,
    hora,
    estado: "ocupado",
    alumno_celda: NOMBRE_DEMO,
    alumno_base: null,
    estado_base: null,
    week_date: null,
    recovery_for: null,
    rescheduled_to: null,
    asignacion_inicio: fechaInicio,
    asignacion_alta: `${sumarDias(fechaInicio, -3)}T10:12:00+00:00`,
    alumno_alta: `${sumarDias(fechaInicio, -3)}T10:11:00+00:00`,
    baja: null,
    meet_link: MEET_DEMO,
  });

  return {
    perfil,
    clases,
    calendario: [celda(proxima.hora), celda(horaFin)],
    excepciones: [],
  };
}
