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
// Es un alumno de TRES MESES: dos clases de una hora a la semana con la
// misma profesora, veinticuatro clases analizadas y una semana sin clase
// por vacaciones.
//
// NINGUNA FECHA FIJA. Todo se cuenta desde `ancla`, el día en que se
// creó o se rejuveneció la demo (`cuentas_demo.ancla`):
//
//   matrícula         ancla − 91 días (13 semanas: 28 módulos abiertos)
//   próxima clase     ancla + 2 o + 3 días, a las 19:00 (o el sábado a
//                     las 10:00 si no queda otra)
//   segunda clase     tres o cuatro días después, a las 19:00
//   clases pasadas    esos dos días de cada semana desde la matrícula,
//                     menos la sexta semana; la última, hace uno o dos
//                     días
//
// Los días de clase salen del ancla, y no al revés, para que la próxima
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

/** Días desde la matrícula hasta el ancla: trece semanas. */
export const DIAS_DE_CURSO = 91;

/** La semana sin clase, en días desde la matrícula: la sexta. */
export const VACACIONES = { desde: 35, hasta: 41 } as const;

/** Horas por clase y a la semana: una hora, dos tardes. */
const HORAS_CLASE = 1;
const HORAS_SEMANALES = 2;

// ---------------------------------------------------------------
// LAS CLASES
//
// De la más antigua a la más reciente: la primera es la número 1.
//
// Los errores se repiten a propósito, como en un B1 hispanohablante de
// verdad: present perfect frente a past simple, preposiciones calcadas
// del español («depend of», «discuss about»), falsos amigos («actually»,
// «assist», «eventually») y «people is». Unos se corrigen con las
// semanas y otros no, y las notas de progreso lo dicen.
// ---------------------------------------------------------------

type Guia = { priority: string; warmUp: string; mainFocus: string; activity: string; notes: string };

type ClaseDemo = {
  titulo: string;
  temas: string;
  errores: string;
  notas: string;
  guia: Guia;
};

const CLASES: ClaseDemo[] = [
  // 1
  {
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
      mainFocus: "Presente simple y continuo para describir su trabajo, y preguntas bien formadas con auxiliar.",
      activity: "Un breve role-play de presentación en una reunión de arranque con un cliente, en el que tenga que presentarse y presentar a su equipo.",
      notes: "Conviene ir anotando los falsos amigos que salgan (actually, assist) para retomarlos; se nota que los usa sin darse cuenta.",
    },
  },
  // 2
  {
    titulo: "Rutinas y responsabilidades: present simple y continuous para describir su puesto",
    temas:
      "Gramática: present simple para rutinas y responsabilidades frente a present continuous para lo que está pasando ahora en sus proyectos; verbos de estado. Vocabulario: to be in charge of, to report to, to oversee, workload, stand-up meeting. Habilidades: describir una semana típica de trabajo y el estado de sus proyectos actuales.",
    errores:
      "Usa present continuous con verbos de estado (\"I am knowing the client for years\", \"we are needing more time\") y present simple para lo que ocurre ahora (\"this week I work on the tender\"). Sigue la concordancia \"people is\" y aparece \"I am responsible of\" en lugar de for. Preguntas ya mejor formadas, aunque olvida el auxiliar cuando habla rápido.",
    notas:
      "Frente a la clase de diagnóstico, las preguntas con auxiliar salen bien cuando las prepara. Le cuesta más la distinción simple/continuo con verbos de estado, algo muy habitual al venir del español.",
    guia: {
      priority: "Asentar la diferencia entre rutina y situación temporal, y empezar a trabajar los tiempos de pasado para hablar de su trayectoria.",
      warmUp: "Quizá empezar pidiéndole que cuente qué está haciendo esta semana frente a lo que hace normalmente.",
      mainFocus: "Past simple y present perfect para contar su trayectoria y los proyectos que ha terminado.",
      activity: "Que prepare una presentación de dos minutos sobre su carrera, como si se presentara a un cliente nuevo.",
      notes: "Responde muy bien cuando el ejemplo sale de su trabajo real; los ejemplos genéricos le cuestan más de retener.",
    },
  },
  // 3
  {
    titulo: "Past simple y present perfect para hablar de la trayectoria y de proyectos",
    temas:
      "Gramática: contraste entre past simple y present perfect; for, since y ago; preguntas con how long. Vocabulario: to lead a project, to hand over, to roll out, milestone, budget overrun. Habilidades: contar su trayectoria profesional y resumir un proyecto terminado.",
    errores:
      "El punto más repetido es el uso de present perfect con marcadores de tiempo terminado (\"I have finished the report yesterday\", \"we have launched it in March\") y el presente simple donde tocaba present perfect continuo (\"I work here since 2019\"). Sigue apareciendo \"people is\" y el calco \"depend of\". Confunde for y since en dos ocasiones.",
    notas:
      "Ya formula las preguntas con auxiliar sin que se le corrija. El contraste de tiempos de pasado es el punto que más le cuesta: entiende la regla, pero bajo presión vuelve a la estructura del español.",
    guia: {
      priority: "Consolidar la diferencia entre past simple y present perfect, que es el error que más se repite, en contextos de trabajo reales.",
      warmUp: "Podría funcionar preguntarle qué ha hecho esta semana y qué hizo el lunes, para que salgan los dos tiempos de forma natural.",
      mainFocus: "Past simple con verbos irregulares y conectores para contar un proyecto de principio a fin.",
      activity: "Que narre un proyecto que salió mal y cómo lo resolvieron, con fechas concretas.",
      notes: "Le ayuda mucho ver sus propias frases corregidas por escrito; quizá valga la pena dejarle dos o tres en el chat al terminar.",
    },
  },
  // 4
  {
    titulo: "Contar un proyecto terminado: past simple irregular y conectores de secuencia",
    temas:
      "Gramática: verbos irregulares frecuentes en el trabajo (lead-led, choose-chose, bring-brought, catch up-caught up); conectores de secuencia (first, then, after that, eventually, in the end). Vocabulario: kick-off, handover, lessons learned, setback. Habilidades: narrar un proyecto real de principio a fin y responder preguntas sobre él.",
    errores:
      "Regulariza irregulares al hablar rápido (\"we choosed the supplier\", \"they bringed the samples\"), usa \"eventually\" como posiblemente (\"eventually we will need more budget\") y vuelve el present perfect con fecha (\"we have delivered it in June\"). Preposiciones: \"arrive to the plant\", \"depend of the weather\".",
    notas:
      "La narración tiene buena estructura y usa conectores con naturalidad, que es un avance claro. Los irregulares los conoce pero no los tiene automatizados, y el falso amigo eventually aparece por primera vez de forma repetida.",
    guia: {
      priority: "Pasar del inglés hablado al escrito: empezar con emails, que es la otra mitad de su objetivo.",
      warmUp: "Podrías pedirle que resuma en tres frases el proyecto que contó hoy, esta vez con los irregulares correctos.",
      mainFocus: "Estructura de un email formal: apertura, petición y cierre.",
      activity: "Reescribir uno de sus emails reales a un proveedor, primero tal como lo escribió y después mejorado.",
      notes: "Eventually y actually son los dos falsos amigos que más usa; puede servir marcarlos cada vez que salen.",
    },
  },
  // 5
  {
    titulo: "Emails profesionales: saludos, cierres y fórmulas para pedir información",
    temas:
      "Escritura: estructura de un email formal y semiformal, fórmulas de apertura y cierre (I am writing to, Could you please, I look forward to hearing from you), cómo pedir información y hacer seguimiento. Vocabulario: attached, as discussed, to follow up, to chase, ASAP y otras abreviaturas. Habilidades: reescribir un email suyo real a un proveedor.",
    errores:
      "Traducciones literales en las fórmulas (\"I write you for ask\", \"waiting your answer\", \"I remain attentive\"), preposiciones erróneas (\"discuss about the budget\", \"in the attached\", \"arrive to the office\") y el falso amigo \"eventually\" usado como posiblemente. Vuelve a aparecer el present perfect con fecha terminada (\"we have received your invoice last Monday\").",
    notas:
      "Mejora clara en los irregulares y en el uso de since con present perfect. Los errores de esta clase son sobre todo de registro y de calco en fórmulas fijas, algo esperable porque hasta ahora escribía los emails traduciendo del español.",
    guia: {
      priority: "Fijar un repertorio corto de fórmulas de email que pueda usar ya en el trabajo, y seguir con las preposiciones que calca del español.",
      warmUp: "Quizá empezar leyendo juntos un email que haya recibido esta semana de un cliente y comentar qué frases le gustaría poder usar.",
      mainFocus: "Emails de seguimiento y recordatorios: cómo insistir sin sonar brusco.",
      activity: "Escribir entre los dos un recordatorio a un proveedor que no ha contestado, en dos tonos distintos.",
      notes: "Diego escribe muchos emails a diario: si se lleva una plantilla de fórmulas, es muy probable que la use desde el día siguiente.",
    },
  },
  // 6
  {
    titulo: "Emails de seguimiento y recordatorios sin sonar brusco",
    temas:
      "Escritura: recordatorios y seguimientos con distinto grado de formalidad (Just a quick reminder, I was wondering if, Following up on my previous email); suavizadores (just, a bit, possibly) y cómo cerrar pidiendo una fecha. Vocabulario: overdue, pending, to chase up, gentle reminder. Habilidades: adaptar el tono al cliente o al proveedor.",
    errores:
      "Tono demasiado directo por traducción literal (\"I need the answer today\", \"you must send it\"), \"I wait your news\" y \"discuss about the delay\". Uso de \"since two weeks\" en lugar de for. Mejora el orden de las fórmulas, pero mezcla registro formal e informal en el mismo email.",
    notas:
      "Ya usa sin ayuda las fórmulas de apertura y cierre de la clase anterior. El reto ahora es el tono: sus emails son correctos pero suenan más exigentes de lo que pretende.",
    guia: {
      priority: "Pasar al lenguaje de reuniones: dar opinión y discrepar con cortesía, que es donde más se juega en su trabajo.",
      warmUp: "Podrías empezar comentando cómo le fue con el recordatorio que mandó esta semana.",
      mainFocus: "Fórmulas para dar opinión, mostrar acuerdo y desacuerdo suavizado.",
      activity: "Un debate breve sobre si retrasar una entrega para mejorar la calidad.",
      notes: "Le funcionan muy bien las comparaciones «versión directa / versión suavizada» de una misma frase.",
    },
  },
  // 7
  {
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
      mainFocus: "Small talk antes y después de las reuniones, que él mismo dice que le incomoda.",
      activity: "Simular los cinco minutos previos a una reunión con un cliente que acaba de aterrizar.",
      notes: "Conviene seguir señalando los falsos amigos cada vez que aparecen; \"actually\" y \"sensible\" siguen saliendo sin que se dé cuenta.",
    },
  },
  // 8
  {
    titulo: "Small talk antes y después de las reuniones",
    temas:
      "Habilidades: conversación informal con clientes (el viaje, el tiempo, planes del fin de semana), cómo mantener la charla con preguntas de seguimiento y cómo pasar al tema de la reunión. Vocabulario: How was your flight?, to get down to business, catch-up, jet lag. Gramática: preguntas de seguimiento y question tags básicos.",
    errores:
      "\"How was the flight? Was good?\" sin sujeto, \"people is very nice in Dublin\", \"I am agree, the weather is terrible\" y \"explain me your plans for the weekend\". Question tags mal formados (\"it's cold, no?\"). Buen ritmo y buena actitud, sin bloqueos.",
    notas:
      "Mucho más suelto que en las primeras clases: mantiene la conversación y hace preguntas de seguimiento. Los errores de concordancia y sujeto omitido reaparecen precisamente porque va más rápido.",
    guia: {
      priority: "Volver a la precisión: preposiciones de tiempo y plazos, que son un error persistente en sus emails.",
      warmUp: "Quizá abrir con dos minutos de small talk real, como repaso de la clase de hoy.",
      mainFocus: "Preposiciones de tiempo y lugar aplicadas a plazos y agendas de proyecto.",
      activity: "Que explique el calendario de su proyecto actual como si se lo presentara a un cliente nuevo.",
      notes: "Se nota que disfruta la conversación libre; funciona bien como calentamiento antes de la parte más gramatical.",
    },
  },
  // 9
  {
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
      mainFocus: "Formas de futuro para hablar de planes de proyecto: will, going to y present continuous.",
      activity: "Que presente el plan del próximo trimestre de su proyecto.",
      notes: "Le vendría bien una lista corta de bloques fijos con preposición para repasar antes de las reuniones.",
    },
  },
  // 10
  {
    titulo: "Planes de proyecto: will, going to y present continuous para el futuro",
    temas:
      "Gramática: will para decisiones y promesas, going to para planes ya decididos, present continuous para citas cerradas; will be able to. Vocabulario: roadmap, go-live, rollout, to be scheduled for, tentative. Habilidades: presentar el plan del trimestre y comprometerse con fechas en una reunión.",
    errores:
      "Usa will para todo (\"next week we will meet the client, it's in the calendar\") y el presente simple para promesas (\"I send you the plan tomorrow\"). Reaparece \"until Friday\" por by, y \"we have agreed it last week\". Buen uso de going to en la mitad de los casos.",
    notas:
      "Antes de una semana sin clase, cierra el primer bloque del curso con una mejora clara en fluidez y en recursos de reunión. Los tres errores que se repiten desde el principio son el contraste de pasados, las preposiciones tras verbo y people is.",
    guia: {
      priority: "Tras la semana de vacaciones, retomar con algo muy aplicado a su día a día: informar de avances.",
      warmUp: "Podrías empezar preguntándole qué tal las vacaciones y qué se encontró al volver al trabajo.",
      mainFocus: "Present perfect con already, yet y just para dar un informe de estado.",
      activity: "Un status update simulado de dos minutos, con preguntas del cliente.",
      notes: "La semana que viene no habrá clase por vacaciones; puede ayudar dejarle un par de ejercicios cortos de preposiciones para mantener el ritmo.",
    },
  },
  // 11
  {
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
      mainFocus: "Explicar retrasos y problemas: past continuous y conectores de causa.",
      activity: "Un status update simulado en el que el cliente le interrumpe preguntando por qué se retrasó una entrega.",
      notes: "Le funciona repetir la misma frase corregida dos o tres veces seguidas; con este error en concreto parece lo más eficaz.",
    },
  },
  // 12
  {
    titulo: "Explicar retrasos y problemas: past continuous y conectores de causa",
    temas:
      "Gramática: past continuous para el contexto de un problema (we were testing when…), conectores de causa y consecuencia (because of, due to, as a result, therefore). Vocabulario: delay, bottleneck, shortage, workaround, root cause. Habilidades: explicar a un cliente por qué se retrasó una entrega sin sonar a excusa.",
    errores:
      "\"Because of the supplier didn't send\" (because of + oración), \"due to we had a problem\", \"the delay depends of the materials\" y present perfect con fecha (\"the problem has started on Monday\"). Buen uso del past continuous en la narración.",
    notas:
      "El past continuous le sale bien a la primera, algo que no pasaba con otros tiempos. Los errores de hoy se concentran en los conectores de causa, que es estructura nueva, y en los dos calcos de siempre.",
    guia: {
      priority: "Consolidar because / because of / due to y dar recursos para negociar tras un problema.",
      warmUp: "Quizá empezar pidiéndole que explique el último retraso real que tuvo en el trabajo.",
      mainFocus: "Primer condicional y modales para negociar plazos con un cliente.",
      activity: "Role-play de negociación: el cliente pide adelantar la entrega después de un retraso.",
      notes: "Puede ayudar un esquema visual de because + oración frente a because of + nombre.",
    },
  },
  // 13
  {
    titulo: "Primer condicional y modales para negociar plazos con un cliente",
    temas:
      "Gramática: primer condicional (If you send us the data by Monday, we will…), unless, as long as; modales para proponer y suavizar (could, might, would be able to). Vocabulario: to meet a deadline, leeway, to compromise, to commit to. Habilidades: negociar un cambio de fecha con un cliente exigente.",
    errores:
      "Uso de will en la oración con if (\"if you will send it, we will start\"), \"I am agree with this proposal\" que reaparece bajo presión y \"depend of the supplier\". El present perfect con fecha terminada aparece solo una vez y se autocorrige.",
    notas:
      "Mejora visible en el contraste de pasados: se autocorrige en el momento. Los errores que persisten bajo presión son \"I am agree\" y las preposiciones tras depend y discuss; son los mismos del primer mes.",
    guia: {
      priority: "Dar recursos de negociación con condicionales y modales, y seguir atacando los dos hábitos que salen bajo presión.",
      warmUp: "Quizá empezar con una situación real: algún cliente que le haya pedido algo imposible esta semana y cómo respondió.",
      mainFocus: "Peticiones y ofrecimientos formales con could, would y may.",
      activity: "Pedir a un proveedor un cambio de condiciones con tres niveles de formalidad.",
      notes: "Cuando se pone nervioso vuelve a \"I am agree\"; puede servir pactar una señal rápida para marcarlo sin cortar la conversación.",
    },
  },
  // 14
  {
    titulo: "Peticiones y ofrecimientos formales con could, would y may",
    temas:
      "Gramática: could / would / may para pedir y ofrecer; Would you mind + -ing; I was wondering if you could. Vocabulario: to accommodate a request, at your earliest convenience, to be happy to. Habilidades: pedir un cambio a un proveedor y ofrecer alternativas a un cliente.",
    errores:
      "\"Would you mind to send\" en lugar de sending, \"can you explain me the conditions?\", \"I was wondering if you can\" y \"people is asking for discounts\". Buen control del registro: ya no mezcla formal e informal.",
    notas:
      "El registro de sus emails y llamadas ha mejorado mucho desde las primeras clases: suena cortés sin esfuerzo. Los errores de hoy son estructuras concretas (mind + -ing, explain to) que conviene fijar como bloques.",
    guia: {
      priority: "Pasar a las llamadas con clientes, donde la comprensión oral le cuesta más que en las reuniones presenciales.",
      warmUp: "Podrías empezar con tres peticiones rápidas que tenga que hacer esta semana en el trabajo.",
      mainFocus: "Pedir aclaraciones en llamadas y phrasal verbs de trabajo.",
      activity: "Simular una llamada con un cliente que habla rápido y cambia un requisito.",
      notes: "Explain me es de los errores más fosilizados; merece la pena repetir explain it to me cada vez que aparezca.",
    },
  },
  // 15
  {
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
      mainFocus: "Videollamadas: turnos de palabra, problemas técnicos y resumen de acuerdos.",
      activity: "Cerrar una videollamada resumiendo los acuerdos y los siguientes pasos.",
      notes: "Le vendría bien una lista corta de falsos amigos de su día a día (actually, assist, eventually, sensible) para repasarla antes de cada clase.",
    },
  },
  // 16
  {
    titulo: "Videollamadas: turnos de palabra, problemas técnicos y resumen de acuerdos",
    temas:
      "Habilidades: gestionar una videollamada con varios participantes (Can everyone see my screen?, You're on mute, Let's go round the table), resolver problemas técnicos y cerrar resumiendo acuerdos y siguientes pasos. Vocabulario: action items, owner, next steps, to wrap up. Gramática: imperativos suavizados y let's.",
    errores:
      "\"Can you hear me? I think you are in mute\" por on mute, \"let's to start\", \"we have discussed about three points\" y \"the next steps depends of the client\" (concordancia y preposición a la vez). Muy buena gestión de turnos.",
    notas:
      "Maneja la videollamada con soltura y cierra con un resumen claro, algo que al principio del curso no hacía. Los errores que quedan son los de siempre, pero ya los detecta él mismo cuando se le deja un segundo.",
    guia: {
      priority: "Preparar la presentación de proyecto que tiene que dar a su cliente, trabajando la estructura.",
      warmUp: "Quizá empezar con el resumen de acuerdos de su última videollamada real.",
      mainFocus: "Presentar un proyecto: signposting, comparativos y datos.",
      activity: "Que presente tres diapositivas de su proyecto con transiciones claras.",
      notes: "Se nota la confianza ganada: ya no pide pasar al español en ningún momento de la clase.",
    },
  },
  // 17
  {
    titulo: "Presentar un proyecto: signposting, comparativos y datos",
    temas:
      "Habilidades: estructurar una presentación de proyecto (Let me start by…, Moving on to…, To sum up), describir gráficos y cifras, comparar opciones. Gramática: comparativos y superlativos, much/far + comparativo. Vocabulario: to increase by, to drop, roughly, significantly, cost-effective.",
    errores:
      "Comparativos dobles (\"more cheaper\", \"more easy\") y preposiciones con cifras (\"increased in 20%\" por by, \"the cost depends of the volume\"). \"People is\" reaparece al hablar de los usuarios del cliente. Un caso de present perfect con fecha (\"we have presented it last month\").",
    notas:
      "Presenta con estructura clara y buen ritmo, algo que en las primeras clases no hacía. Los errores que quedan son de precisión: comparativos y preposiciones con cifras. \"Depend of\" sigue siendo el calco más resistente de todo el curso.",
    guia: {
      priority: "Pulir la presentación que tiene que dar a su cliente, trabajando comparativos y cifras.",
      warmUp: "Quizá empezar pidiéndole que compare en un minuto dos proveedores con los que trabaja.",
      mainFocus: "Describir gráficos y tendencias para su informe mensual.",
      activity: "Describir en voz alta el gráfico de costes de su proyecto de los últimos seis meses.",
      notes: "Muy motivado con la presentación real; conviene aprovecharlo para trabajar sobre su material en vez de sobre ejemplos genéricos.",
    },
  },
  // 18
  {
    titulo: "Describir gráficos y tendencias en un informe mensual",
    temas:
      "Vocabulario de tendencias: to rise, to fall, to level off, to peak, a sharp increase, a slight decline, steadily, dramatically. Gramática: preposiciones con cifras (by, to, from… to, of) y adverbios frente a adjetivos. Habilidades: describir el gráfico de costes y plazos de su proyecto y sacar conclusiones.",
    errores:
      "Mezcla adjetivo y adverbio (\"costs increased sharp\", \"a steadily growth\"), \"rose in 15%\" y \"from 20 until 35\". Aparece \"actually the costs are stable\" por currently. Muy buena estructura del informe y buen uso de los conectores.",
    notas:
      "El vocabulario de tendencias lo ha incorporado en una sola sesión y lo usa con naturalidad. Las preposiciones con cifras siguen siendo el punto débil, coherente con el patrón de preposiciones de todo el curso.",
    guia: {
      priority: "Dar recursos para gestionar cambios de alcance, la situación que más le preocupa ahora en el trabajo.",
      warmUp: "Podrías empezar con una pregunta rápida: cómo ha evolucionado su proyecto este mes, en tres frases.",
      mainFocus: "Sugerencias y advertencias: suggest, recommend, that would mean.",
      activity: "Negociar con el cliente un cambio de alcance que afecta al plazo.",
      notes: "Increase by / rise to es un buen ejemplo para reforzar la idea general de que la preposición cambia el significado.",
    },
  },
  // 19
  {
    titulo: "Gestionar cambios de alcance: sugerencias, modales y repaso de tiempos pasados",
    temas:
      "Lenguaje para gestionar cambios de alcance con un cliente: sugerir (What if we…?, I'd suggest -ing), advertir de consecuencias (That would mean…), confirmar acuerdos por escrito. Gramática: repaso de past simple y present perfect en un informe de incidencia; suggest + -ing / that. Vocabulario: scope creep, change request, impact, sign-off.",
    errores:
      "\"I suggest you to send\" en lugar de I suggest (that) you send, \"people is asking for more features\" y \"we discussed about it\". En el informe de incidencia mezcla otra vez los pasados (\"the error has appeared on Tuesday\"), aunque se corrige solo. Un falso amigo: \"actually we are in the testing phase\".",
    notas:
      "Comparado con el inicio del curso, la mejora en fluidez y en recursos para reuniones es muy clara. Los tres errores que siguen apareciendo de forma recurrente son el contraste de pasados en informes escritos, las preposiciones tras discuss y depend, y la concordancia con people.",
    guia: {
      priority: "Introducir el segundo condicional para plantear escenarios, útil para hablar de riesgos con el cliente.",
      warmUp: "Podrías empezar preguntándole cómo terminó la conversación con el cliente sobre el cambio de alcance.",
      mainFocus: "Segundo condicional para escenarios hipotéticos y riesgos.",
      activity: "Un análisis de riesgos en voz alta: qué pasaría si el proveedor principal fallara.",
      notes: "Está muy cerca de un B1+ sólido en reuniones; lo que le separa del B2 es la precisión en esos tres puntos, más que el vocabulario.",
    },
  },
  // 20
  {
    titulo: "Segundo condicional para plantear escenarios y riesgos",
    temas:
      "Gramática: segundo condicional (If the supplier went bankrupt, we would…), contraste con el primero, were en lugar de was en registro formal. Vocabulario: contingency plan, risk assessment, mitigation, worst-case scenario. Habilidades: presentar un análisis de riesgos al cliente y proponer planes de contingencia.",
    errores:
      "\"If we would have more budget, we would hire\" (would en la condición), \"if I was you\" sin problema pero \"if the client will ask\" en contexto hipotético, y \"it depends of the scenario\". Buen uso de la estructura en frases preparadas.",
    notas:
      "Distingue bien primer y segundo condicional cuando reflexiona, y ha incorporado el vocabulario de riesgos. El calco \"depend of\" sigue presente, aunque ya se corrige a sí mismo la mitad de las veces.",
    guia: {
      priority: "Mejorar la escritura de informes técnicos, que es donde más se nota el paso a un registro más formal.",
      warmUp: "Quizá empezar con un escenario rápido: qué haría si tuviera un mes más en su proyecto.",
      mainFocus: "Voz pasiva en informes técnicos y actas de reunión.",
      activity: "Reescribir en pasiva el acta de su última reunión de seguimiento.",
      notes: "Se autocorrige cada vez más; conviene darle tiempo antes de intervenir.",
    },
  },
  // 21
  {
    titulo: "Voz pasiva en informes técnicos y actas de reunión",
    temas:
      "Gramática: voz pasiva en presente, pasado y present perfect (The tests have been completed, The order was approved), pasiva con modales (must be signed, will be delivered); cuándo es mejor la activa. Vocabulario: minutes, to be approved, to be signed off, pending review. Habilidades: redactar un acta y un informe de estado en registro formal.",
    errores:
      "Omite el verbo to be (\"the report sent yesterday\", \"the tests completed\"), \"was approved since two weeks\" y el falso amigo \"the order was realized\" por carried out. Preposiciones: \"discuss about\" reaparece en el acta.",
    notas:
      "Buen dominio de la pasiva en presente y pasado; la pasiva con present perfect y modales todavía le exige pensar. Sus actas ya tienen un registro formal adecuado, algo impensable hace dos meses.",
    guia: {
      priority: "Seguir con la precisión en textos técnicos: oraciones de relativo para describir productos y proveedores.",
      warmUp: "Podrías pedirle tres frases en pasiva sobre lo que se ha hecho esta semana en su proyecto.",
      mainFocus: "Oraciones de relativo: who, which, that, whose y cuándo se puede omitir el pronombre.",
      activity: "Describir por escrito los tres proveedores con los que trabaja para un cliente nuevo.",
      notes: "\"Realize\" es un falso amigo nuevo que conviene añadir a su lista.",
    },
  },
  // 22
  {
    titulo: "Oraciones de relativo para describir productos, proveedores y procesos",
    temas:
      "Gramática: oraciones de relativo especificativas y explicativas (who, which, that, whose, where), omisión del pronombre, comas. Vocabulario: supplier, component, specification, lead time, provider. Habilidades: describir productos y proveedores con precisión en emails y presentaciones.",
    errores:
      "\"The supplier which is in Porto\" por who/that está bien, pero usa \"what\" como relativo (\"the component what we need\"), duplica el objeto (\"the report that I sent it\") y aparece \"people who is\". Buen uso de whose, que es estructura nueva.",
    notas:
      "Asimila rápido la estructura nueva. El único error recurrente de hoy vuelve a ser la concordancia con people, que ya aparece mucho menos que al principio del curso.",
    guia: {
      priority: "Estilo indirecto para resumir lo que dijo el cliente, muy útil en sus actas y emails de seguimiento.",
      warmUp: "Quizá empezar describiendo el producto estrella de su empresa con dos oraciones de relativo.",
      mainFocus: "Reported speech: said, told, asked, y el cambio de tiempos.",
      activity: "Resumir por email lo que el cliente pidió en la última reunión.",
      notes: "El objeto duplicado (that I sent it) es un calco que puede fosilizar; conviene corregirlo siempre.",
    },
  },
  // 23
  {
    titulo: "Estilo indirecto: resumir lo que dijo el cliente",
    temas:
      "Gramática: reported speech con said, told, asked, explained; cambio de tiempos y de referencias temporales; preguntas indirectas (He asked whether we could…). Vocabulario: to point out, to mention, to request, to confirm. Habilidades: redactar un email de seguimiento que resume una reunión.",
    errores:
      "\"He said me that\" en lugar de told me, preguntas indirectas con orden de pregunta (\"she asked when will we deliver\") y \"the client explained us the problem\". Muy pocos errores de pasado: el contraste de tiempos está prácticamente consolidado.",
    notas:
      "Tres meses después de empezar, el contraste de pasados —su error principal al inicio— apenas aparece. Lo que queda es say/tell y explain to, que son del mismo tipo que explain me: verbos con el complemento calcado del español.",
    guia: {
      priority: "Preparar la reunión trimestral con su cliente principal integrando todo lo trabajado en el curso.",
      warmUp: "Podrías empezar pidiéndole que te cuente qué le dijo su jefe esta semana, en estilo indirecto.",
      mainFocus: "Repaso integrado: presentación, negociación y resumen de acuerdos.",
      activity: "Un ensayo completo de la reunión trimestral, con apertura, presentación de datos y cierre.",
      notes: "Buen momento para señalarle todo lo que ha avanzado: le motiva ver el contraste con las primeras clases.",
    },
  },
  // 24
  {
    titulo: "Preparación de la reunión trimestral con el cliente: repaso integrado",
    temas:
      "Ensayo completo de la reunión trimestral con su cliente principal: apertura y small talk, presentación de resultados con gráficos, negociación de un cambio de plazo y cierre con resumen de acuerdos. Repaso integrado de tiempos de pasado, condicionales, voz pasiva y fórmulas de reunión. Vocabulario: quarterly review, KPIs, on budget, ahead of schedule.",
    errores:
      "Errores aislados y en su mayoría autocorregidos: \"the results depends of the last quarter\", \"I suggest you to review\" y un \"people is\" al final, con cansancio. El contraste de pasados sale correcto en todo el ensayo, y ya no aparece \"I am agree\".",
    notas:
      "La mejor clase del curso hasta ahora: sostiene 40 minutos de reunión simulada en inglés, con estructura, datos y negociación. Los errores recurrentes han bajado de forma clara y los que quedan (depend of, suggest you to, people is) ya los detecta él mismo.",
    guia: {
      priority: "Después de la reunión real, revisar juntos cómo fue y fijar los objetivos del próximo trimestre del curso.",
      warmUp: "Podrías empezar preguntándole cómo fue la reunión trimestral con el cliente.",
      mainFocus: "Debrief de la reunión real y plan de trabajo hacia el B2: precisión en preposiciones y concordancia.",
      activity: "Que cuente la reunión en estilo indirecto y que detecte él sus propios errores en una grabación corta.",
      notes: "Está preparado para empezar a trabajar material de nivel B2 en reuniones; conviene subir el listón poco a poco.",
    },
  },
];

/** Cuántas clases analizadas tiene: una por cada entrada de `CLASES`. */
export const TOTAL_CLASES = CLASES.length;

/**
 * Las clases de las que sale un bloque de práctica, por número (la 1 es la
 * primera). Doce seguidas, hasta la penúltima: la última clase se queda
 * SIN bloque a propósito, así la parada final de la ruta está abierta y
 * se puede enseñar la generación en directo.
 */
export const CLASES_CON_BLOQUE = [12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23] as const;

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

/**
 * Los dos días de clase de la semana, con su hora. El primero es el de la
 * próxima clase; el segundo, tres días después —a las 10:00 si es
 * sábado—, o cuatro si esos tres caen en domingo.
 *
 * TRES O CUATRO, Y NO OTRA COSA. Con tres o cuatro la última clase dada
 * es de hace uno o dos días; con menos se aleja, y con más el segundo día
 * caería en el ancla o el siguiente y la próxima clase dejaría de estar a
 * dos o tres días. El caso de los cuatro (la próxima es un jueves) solo
 * se da con la próxima a dos días del ancla, que es donde cabe.
 */
export function diasDeClase(ancla: string): { dia: DiaSemana; hora: string }[] {
  const proxima = proximaDemo(ancla);
  const tres = sumarDias(proxima.fecha, 3);
  const diaTres = diaDeLaSemana(tres);
  const segundo =
    DIAS_ENTRE_SEMANA.includes(diaTres) || diaTres === "Sábado"
      ? { dia: diaTres, hora: diaTres === "Sábado" ? "10:00" : "19:00" }
      : { dia: diaDeLaSemana(sumarDias(proxima.fecha, 4)), hora: "19:00" };
  return [{ dia: proxima.dia, hora: proxima.hora }, segundo];
}

export type ClaseFechada = {
  /** De la 1, la primera, a la última. */
  numero: number;
  /** Día natural español, "2026-09-18". */
  fecha: string;
  empieza: Date;
  /** Cuando Gestión la habría analizado: media hora después de acabar. */
  analizadaEn: Date;
};

/**
 * Las clases dadas, con sus fechas, de la más antigua a la más reciente:
 * los dos días de clase de cada semana desde la matrícula hasta ayer,
 * menos la semana de vacaciones. Son 13 semanas completas, así que salen
 * exactamente 26 − 2 = 24, una por entrada de `CLASES`.
 */
export function clasesFechadas(ancla: string): ClaseFechada[] {
  const inicio = sumarDias(ancla, -DIAS_DE_CURSO);
  const dias = diasDeClase(ancla);
  const salida: ClaseFechada[] = [];

  for (let d = 0; d < DIAS_DE_CURSO; d++) {
    if (d >= VACACIONES.desde && d <= VACACIONES.hasta) continue;
    const fecha = sumarDias(inicio, d);
    const slot = dias.find((s) => s.dia === diaDeLaSemana(fecha));
    if (!slot) continue;
    const empieza = instanteEnMadrid(fecha, slot.hora);
    const analizadaEn = new Date(empieza.getTime() + (HORAS_CLASE + 0.5) * 3_600_000);
    salida.push({ numero: salida.length + 1, fecha, empieza, analizadaEn });
  }

  if (salida.length !== CLASES.length) {
    throw new Error(`El calendario de la demo da ${salida.length} clases y hay ${CLASES.length} escritas.`);
  }
  return salida;
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
  const dias = diasDeClase(ancla);
  const horario = dias.map((s) => `${Number(s.hora.slice(0, 2))}h ${s.dia.toLowerCase()}`).join(" · ");
  const plan = `Curso de inglés general - 2h semanales, B1 — 2h semanales · B1 · ${horario}`;
  const slots = dias.map((s) => ({ day: s.dia, hour: s.hora }));

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
    horas_semanales: HORAS_SEMANALES,
    nivel_profesor: "B1",
    nivel_ficha: "B1",
    nivel_prueba: null,
    form_token: null,
    form_token_enviado_en: null,
    meet_link: MEET_DEMO,
    slots,
  };

  const clases: Fila[] = clasesFechadas(ancla)
    .map((f, i) => {
      const c = CLASES[i];
      return {
        id: `${ID_DEMO}-clase-${String(f.numero).padStart(2, "0")}`,
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
    .filter((fila) => Date.parse(fila.analyzed_at) <= ahora.getTime())
    .reverse();

  const celda = (dia: DiaSemana, hora: string): FilaCalendario => ({
    alumno_id: ID_DEMO,
    nombre_en_celda: NOMBRE_DEMO,
    teacher_id: PROFESOR_DEMO.teacherId,
    profesor: PROFESOR_DEMO.nombre,
    celda: `${dia}_${hora}`,
    dia,
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
    calendario: dias.map((s) => celda(s.dia, s.hora)),
    excepciones: [],
  };
}
