// ---------------------------------------------------------------
// BIBLIOTECA DE BLOQUES
// Los bloques son independientes de los alumnos: un mismo bloque se
// reutiliza entre alumnos del mismo nivel con la misma dificultad.
// ---------------------------------------------------------------

export type Reconocer = {
  tipo: "reconocer";
  id: string;
  enunciado: string;
  opciones: string[];
  correcta: number;
  explicacion: string;
};

export type Transformar = {
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
   * Clase de la que sale el bloque. Sirve para recordarle al alumno que
   * esto no es material genérico: lo vio con su profesor tal día.
   * Es opcional porque los bloques generados por la IA no la tienen.
   */
  claseOrigen?: { fecha: string; profesor: string };
};

export const BLOQUES: Bloque[] = [
  // ============================== B2 ==============================
  {
    id: "conditionals-2-3",
    titulo: "Condicionales 2 y 3",
    area: "Gramática",
    nivel: "B2",
    minutos: 6,
    claseOrigen: { fecha: "24 jul", profesor: "Aoife" },
    intro:
      "La diferencia está en el tiempo: el segundo habla de un presente que no es real, el tercero de un pasado que ya no se puede cambiar.",
    ejercicios: [
      {
        tipo: "reconocer",
        id: "c23-r1",
        enunciado: "If I ____ more time, I'd redo the whole presentation.",
        opciones: ["had", "would have", "have", "will have"],
        correcta: 0,
        explicacion:
          "En el second conditional la condición va en past simple (had) y el resultado con would. El 'would' nunca va dentro del 'if'.",
      },
      {
        tipo: "reconocer",
        id: "c23-r2",
        enunciado: "If she had told me earlier, I ____ the meeting.",
        opciones: ["would have moved", "would move", "will move", "had moved"],
        correcta: 0,
        explicacion:
          "Es un third conditional: hablamos de algo que ya no pasó. La estructura es 'If + past perfect, would have + participio'.",
      },
      {
        tipo: "transformar",
        id: "c23-t1",
        instruccion: "Reescribe la frase usando el second conditional.",
        frase: "I don't have her number, so I can't call her.",
        respuestas: [
          "If I had her number, I would call her.",
          "If I had her number, I'd call her.",
          "I would call her if I had her number.",
          "I'd call her if I had her number.",
        ],
        pista: "Empieza por 'If I had…'",
        explicacion:
          "El presente real ('I don't have') se convierte en past simple dentro del if, y la consecuencia lleva would.",
      },
      {
        tipo: "transformar",
        id: "c23-t2",
        instruccion: "Reescribe la frase usando el third conditional.",
        frase: "She didn't study, so she failed the exam.",
        respuestas: [
          "If she had studied, she wouldn't have failed the exam.",
          "If she'd studied, she wouldn't have failed the exam.",
          "She wouldn't have failed the exam if she had studied.",
          "She wouldn't have failed the exam if she'd studied.",
        ],
        pista: "Empieza por 'If she had…' y usa la forma negativa en el resultado.",
        explicacion:
          "El pasado real se convierte en past perfect dentro del if, y el resultado usa would have + participio.",
      },
      {
        tipo: "producir",
        id: "c23-p1",
        instruccion: "Escribe dos frases sobre tu trabajo.",
        contexto:
          "Una con second conditional (algo que no es así ahora) y otra con third conditional (algo que no pasó y ya no puede cambiar).",
        criterios: [
          "En el second: past simple dentro del 'if', 'would' fuera.",
          "En el tercero: past perfect dentro del 'if', 'would have' + participio fuera.",
          "Ningún 'would' dentro de la oración con 'if'.",
        ],
        modelo:
          "If I worked from the office, I would waste two hours a day commuting. If we had hired someone in January, we wouldn't have missed the deadline.",
      },
    ],
  },
  {
    id: "phrasal-get",
    titulo: "Phrasal verbs con 'get'",
    area: "Léxico",
    nivel: "B2",
    minutos: 5,
    claseOrigen: { fecha: "17 jul", profesor: "Aoife" },
    intro:
      "Los que más se confunden entre sí: superar algo, atravesar algo y llevarse bien con alguien.",
    ejercicios: [
      {
        tipo: "reconocer",
        id: "pg-r1",
        enunciado: "It took her months to ____ the breakup.",
        opciones: ["get over", "get through", "get by", "get along"],
        correcta: 0,
        explicacion:
          "'Get over' es superar algo difícil y dejarlo atrás: una ruptura, una enfermedad, una decepción.",
      },
      {
        tipo: "reconocer",
        id: "pg-r2",
        enunciado: "I don't know how I'll ____ this week — I have four deadlines.",
        opciones: ["get through", "get over", "get up", "get on"],
        correcta: 0,
        explicacion:
          "'Get through' es atravesar un periodo duro hasta el final. 'Get over' sería superarlo cuando ya terminó.",
      },
      {
        tipo: "transformar",
        id: "pg-t1",
        instruccion: "Reescribe usando un phrasal verb con 'get'.",
        frase: "I have a good relationship with my new manager.",
        respuestas: [
          "I get along with my new manager.",
          "I get on with my new manager.",
          "I get along well with my new manager.",
          "I get on well with my new manager.",
        ],
        pista: "En inglés británico se usa más 'get on'; en americano, 'get along'.",
        explicacion: "'Get along / get on with someone' es llevarse bien con alguien.",
      },
      {
        tipo: "transformar",
        id: "pg-t2",
        instruccion: "Reescribe usando un phrasal verb con 'get'.",
        frase: "We don't earn much, but we manage.",
        respuestas: ["We don't earn much, but we get by.", "We don't earn much but we get by."],
        pista: "Arreglárselas con lo justo.",
        explicacion: "'Get by' es arreglárselas, ir tirando con lo mínimo necesario.",
      },
      {
        tipo: "producir",
        id: "pg-p1",
        instruccion: "Cuenta una semana complicada que hayas tenido.",
        contexto: "Usa al menos dos phrasal verbs con 'get' de los que acabas de practicar.",
        criterios: [
          "Dos phrasal verbs distintos con 'get'.",
          "Que el sentido encaje: 'through' durante, 'over' después.",
          "Tiempo pasado consistente.",
        ],
        modelo:
          "Last November was brutal. I got through it by working weekends, and honestly it took me a couple of months to get over the exhaustion.",
      },
    ],
  },
  {
    id: "past-perfect",
    titulo: "Past perfect en narración",
    area: "Gramática",
    nivel: "B2",
    minutos: 5,
    claseOrigen: { fecha: "10 jul", profesor: "Aoife" },
    intro:
      "Sirve para marcar qué pasó antes de qué. Sin él, todo suena como si hubiera ocurrido a la vez.",
    ejercicios: [
      {
        tipo: "reconocer",
        id: "pp-r1",
        enunciado: "When we arrived, the meeting ____ already ____.",
        opciones: ["had / started", "has / started", "was / starting", "did / start"],
        correcta: 0,
        explicacion:
          "La reunión empezó ANTES de que llegarais. Ese salto hacia atrás dentro de un relato en pasado se marca con past perfect.",
      },
      {
        tipo: "reconocer",
        id: "pp-r2",
        enunciado: "She couldn't get in because she ____ her badge at home.",
        opciones: ["had left", "left", "has left", "was leaving"],
        correcta: 0,
        explicacion:
          "Dejarse la tarjeta ocurrió antes de no poder entrar. El past perfect ordena las dos acciones.",
      },
      {
        tipo: "transformar",
        id: "pp-t1",
        instruccion: "Une las dos frases en una sola usando past perfect.",
        frase: "I sent the email. Then I noticed the typo.",
        respuestas: [
          "I noticed the typo after I had sent the email.",
          "After I had sent the email, I noticed the typo.",
          "I noticed the typo after I'd sent the email.",
          "After I'd sent the email, I noticed the typo.",
        ],
        pista: "Usa 'after' y pon en past perfect la acción que ocurrió primero.",
        explicacion:
          "La acción anterior va en past perfect; la posterior, en past simple. Ese contraste es lo que ordena el relato.",
      },
      {
        tipo: "transformar",
        id: "pp-t2",
        instruccion: "Une las dos frases usando 'by the time'.",
        frase: "The client called. Before that, we finished the report.",
        respuestas: [
          "By the time the client called, we had finished the report.",
          "By the time the client called we had finished the report.",
          "By the time the client called, we'd finished the report.",
        ],
        pista: "'By the time' + past simple, y la otra parte en past perfect.",
        explicacion:
          "'By the time' introduce el momento de referencia; lo que ya estaba hecho antes va en past perfect.",
      },
      {
        tipo: "producir",
        id: "pp-p1",
        instruccion: "Cuenta algo que salió mal en el trabajo.",
        contexto: "Tres o cuatro frases. Al menos una tiene que llevar past perfect para marcar qué pasó antes.",
        criterios: [
          "Un past perfect que marque una acción anterior.",
          "El resto del relato en past simple.",
          "Que se entienda el orden de los hechos sin releer.",
        ],
        modelo:
          "We lost the account last spring. By the time I called them, they had already signed with someone else. Nobody told me they had been unhappy for months.",
      },
    ],
  },

  // ============================== B1 ==============================
  {
    id: "present-perfect-vs-past",
    titulo: "Present perfect vs past simple",
    area: "Gramática",
    nivel: "B1",
    minutos: 6,
    claseOrigen: { fecha: "25 jul", profesor: "Liam" },
    intro:
      "La regla corta: si el momento está terminado y se sabe cuándo, past simple. Si el momento sigue abierto o no importa cuándo, present perfect.",
    ejercicios: [
      {
        tipo: "reconocer",
        id: "ppp-r1",
        enunciado: "I ____ here since 2019.",
        opciones: ["have worked", "worked", "work", "am working"],
        correcta: 0,
        explicacion:
          "'Since' marca algo que empezó en el pasado y sigue hoy. Eso siempre pide present perfect, nunca past simple.",
      },
      {
        tipo: "reconocer",
        id: "ppp-r2",
        enunciado: "We ____ the contract last Friday.",
        opciones: ["signed", "have signed", "sign", "had signed"],
        correcta: 0,
        explicacion:
          "'Last Friday' es un momento terminado y concreto. Con marcadores así se usa past simple.",
      },
      {
        tipo: "transformar",
        id: "ppp-t1",
        instruccion: "Completa con el verbo entre paréntesis en el tiempo correcto.",
        frase: "She ____ (live) in Dublin for three years.",
        respuestas: ["She has lived in Dublin for three years.", "She's lived in Dublin for three years."],
        pista: "'For three years' y sigue viviendo allí.",
        explicacion:
          "'For' + duración que continúa hasta hoy = present perfect. Si ya no viviera allí, sería past simple.",
      },
      {
        tipo: "transformar",
        id: "ppp-t2",
        instruccion: "Completa con el verbo entre paréntesis en el tiempo correcto.",
        frase: "I ____ (meet) him at a conference in 2021.",
        respuestas: ["I met him at a conference in 2021."],
        pista: "Hay una fecha cerrada.",
        explicacion:
          "Con un año concreto ya terminado, past simple. El present perfect no admite fechas específicas.",
      },
      {
        tipo: "producir",
        id: "ppp-p1",
        instruccion: "Preséntate profesionalmente en cuatro frases.",
        contexto: "Dos frases sobre tu situación actual (present perfect) y dos sobre hechos concretos del pasado (past simple).",
        criterios: [
          "Un 'for' o 'since' con present perfect.",
          "Una fecha o momento cerrado con past simple.",
          "Ninguna fecha concreta junto a un present perfect.",
        ],
        modelo:
          "I've worked in logistics for six years. I've been at my current company since 2022. I studied business in Valencia and I graduated in 2018.",
      },
    ],
  },
  {
    id: "prepositions-time",
    titulo: "Preposiciones de tiempo",
    area: "Gramática",
    nivel: "B1",
    minutos: 4,
    claseOrigen: { fecha: "11 jul", profesor: "Liam" },
    intro: "In para lo grande, on para el día, at para el punto exacto. De mayor a menor.",
    ejercicios: [
      {
        tipo: "reconocer",
        id: "pt-r1",
        enunciado: "The call is ____ Monday morning.",
        opciones: ["on", "in", "at", "for"],
        correcta: 0,
        explicacion:
          "Con días concretos siempre 'on', aunque lleven 'morning' detrás. 'In the morning' solo va sin día.",
      },
      {
        tipo: "reconocer",
        id: "pt-r2",
        enunciado: "I'll send it ____ the end of the day.",
        opciones: ["at", "in", "on", "by"],
        correcta: 0,
        explicacion: "'At the end of' es una expresión fija: se refiere a un punto concreto, no a un periodo.",
      },
      {
        tipo: "transformar",
        id: "pt-t1",
        instruccion: "Completa con in, on o at.",
        frase: "The office is closed ____ August.",
        respuestas: ["The office is closed in August."],
        pista: "Un mes entero.",
        explicacion: "Meses, años y estaciones llevan 'in': son periodos largos.",
      },
      {
        tipo: "transformar",
        id: "pt-t2",
        instruccion: "Completa con in, on o at.",
        frase: "We usually have lunch ____ 2 pm.",
        respuestas: ["We usually have lunch at 2 pm.", "We usually have lunch at 2pm."],
        pista: "Una hora exacta.",
        explicacion: "Las horas concretas llevan 'at', igual que 'at night' o 'at the weekend'.",
      },
      {
        tipo: "producir",
        id: "pt-p1",
        instruccion: "Describe tu semana típica de trabajo.",
        contexto: "Tienes que usar in, on y at al menos una vez cada uno.",
        criterios: ["Un 'in' con mes, año o parte del día.", "Un 'on' con un día concreto.", "Un 'at' con una hora."],
        modelo:
          "I start at 9 am every day. On Wednesdays we have a team meeting in the afternoon. In summer we finish earlier.",
      },
    ],
  },
  {
    id: "meeting-lexis",
    titulo: "Léxico de reuniones",
    area: "Léxico",
    nivel: "B1",
    minutos: 5,
    claseOrigen: { fecha: "18 jul", profesor: "Liam" },
    intro: "Las cuatro o cinco expresiones que aparecen en toda reunión y que te sacan de cualquier apuro.",
    ejercicios: [
      {
        tipo: "reconocer",
        id: "ml-r1",
        enunciado: "Sorry, could you ____ that? I didn't catch the last part.",
        opciones: ["go over", "go on", "go off", "go up"],
        correcta: 0,
        explicacion: "'Go over something' es repasarlo o repetirlo. Es la forma más natural de pedir que vuelvan atrás.",
      },
      {
        tipo: "reconocer",
        id: "ml-r2",
        enunciado: "Let's ____ this until next week — we're running out of time.",
        opciones: ["put off", "put on", "put up", "put down"],
        correcta: 0,
        explicacion: "'Put off' es posponer. 'Postpone' también vale, pero suena más formal.",
      },
      {
        tipo: "transformar",
        id: "ml-t1",
        instruccion: "Reescribe de forma más natural en una reunión.",
        frase: "I want to say something about the budget.",
        respuestas: [
          "Can I add something about the budget?",
          "Could I add something about the budget?",
          "Can I jump in on the budget?",
        ],
        pista: "Empieza con 'Can I…'",
        explicacion:
          "'I want to say' suena brusco. 'Can I add something?' es la fórmula estándar para pedir turno sin interrumpir.",
      },
      {
        tipo: "transformar",
        id: "ml-t2",
        instruccion: "Reescribe pidiendo la opinión del grupo.",
        frase: "What is your opinion?",
        respuestas: [
          "What are your thoughts on this?",
          "What are your thoughts?",
          "How do you feel about this?",
        ],
        pista: "Usa 'thoughts'.",
        explicacion:
          "'What are your thoughts?' es lo que se oye de verdad en reuniones. 'What is your opinion?' suena a libro de texto.",
      },
      {
        tipo: "producir",
        id: "ml-p1",
        instruccion: "Escribe cómo abrirías una reunión de equipo.",
        contexto: "Tres frases: saluda, di el objetivo y pasa al primer punto.",
        criterios: ["Una expresión para marcar el objetivo.", "Una para dar paso al primer punto.", "Tono profesional pero natural."],
        modelo:
          "Thanks everyone for joining. The main goal today is to agree on the launch date. Let's start with the timeline and then go over the budget.",
      },
    ],
  },

  // ============================== C1 ==============================
  {
    id: "formal-collocations",
    titulo: "Collocations formales",
    area: "Léxico",
    nivel: "C1",
    minutos: 5,
    claseOrigen: { fecha: "23 jul", profesor: "Sinead" },
    intro:
      "El punto donde el español se filtra sin que lo notes: en inglés las decisiones no se toman, se hacen.",
    ejercicios: [
      {
        tipo: "reconocer",
        id: "fc-r1",
        enunciado: "The board will ____ a decision on Thursday.",
        opciones: ["make", "take", "do", "give"],
        correcta: 0,
        explicacion:
          "'Make a decision' es la collocation correcta. 'Take a decision' existe en inglés británico formal, pero es mucho menos frecuente.",
      },
      {
        tipo: "reconocer",
        id: "fc-r2",
        enunciado: "We need to ____ further research before committing.",
        opciones: ["carry out", "make", "take", "realise"],
        correcta: 0,
        explicacion:
          "'Carry out research' es lo estándar en registro formal. Cuidado con 'realise', que significa darse cuenta, no realizar.",
      },
      {
        tipo: "transformar",
        id: "fc-t1",
        instruccion: "Corrige la collocation.",
        frase: "I would like to do a suggestion.",
        respuestas: ["I would like to make a suggestion.", "I'd like to make a suggestion."],
        pista: "El verbo está mal elegido.",
        explicacion: "Se 'make' una sugerencia, igual que se 'make' un comentario, una oferta o una promesa.",
      },
      {
        tipo: "transformar",
        id: "fc-t2",
        instruccion: "Corrige la collocation.",
        frase: "Please, take into account these points before answer.",
        respuestas: [
          "Please take these points into account before replying.",
          "Please bear these points in mind before replying.",
          "Please take these points into account before responding.",
        ],
        pista: "Dos cosas: el orden de 'take into account' y la forma verbal después de 'before'.",
        explicacion:
          "El objeto va dentro: 'take X into account'. Y después de 'before' va gerundio, no infinitivo.",
      },
      {
        tipo: "producir",
        id: "fc-p1",
        instruccion: "Escribe un email breve proponiendo un cambio de proceso.",
        contexto: "Cuatro o cinco frases, registro formal, a un cliente que no conoces bien.",
        criterios: [
          "Dos collocations formales correctas (make a decision, carry out, take into account, reach an agreement…).",
          "Sin traducciones literales del español.",
          "Cierre profesional.",
        ],
        modelo:
          "I would like to make a suggestion regarding our current approval process. We have carried out an internal review and identified two bottlenecks. I would be grateful if you could take these findings into account before we reach an agreement on the timeline.",
      },
    ],
  },
  {
    id: "inversion",
    titulo: "Inversión y énfasis",
    area: "Gramática",
    nivel: "C1",
    minutos: 6,
    claseOrigen: { fecha: "16 jul", profesor: "Sinead" },
    intro:
      "La entiendes al leerla pero no te sale al escribir. Aquí el objetivo es producirla, no reconocerla.",
    ejercicios: [
      {
        tipo: "reconocer",
        id: "inv-r1",
        enunciado: "Never before ____ such a drastic drop in engagement.",
        opciones: ["had we seen", "we had seen", "we saw", "did we saw"],
        correcta: 0,
        explicacion:
          "Cuando la frase empieza por un adverbio negativo (never, rarely, seldom), el auxiliar pasa delante del sujeto, como en una pregunta.",
      },
      {
        tipo: "reconocer",
        id: "inv-r2",
        enunciado: "Not only ____ the deadline, but they also exceeded the target.",
        opciones: ["did they meet", "they met", "they did meet", "met they"],
        correcta: 0,
        explicacion:
          "Con 'not only' al principio hace falta el auxiliar 'did' + sujeto + infinitivo, aunque en la frase normal no habría auxiliar.",
      },
      {
        tipo: "transformar",
        id: "inv-t1",
        instruccion: "Reescribe empezando por 'Rarely'.",
        frase: "We rarely receive complaints about delivery times.",
        respuestas: ["Rarely do we receive complaints about delivery times."],
        pista: "Hace falta un auxiliar que en la frase original no está.",
        explicacion:
          "'Rarely' al inicio fuerza la inversión: como el verbo es present simple, aparece 'do' delante del sujeto.",
      },
      {
        tipo: "transformar",
        id: "inv-t2",
        instruccion: "Reescribe empezando por 'Only when'.",
        frase: "We understood the problem only when the data arrived.",
        respuestas: [
          "Only when the data arrived did we understand the problem.",
          "Only when the data arrived, did we understand the problem.",
        ],
        pista: "La inversión ocurre en la segunda mitad, no justo después de 'only when'.",
        explicacion:
          "Con 'only when' la inversión afecta a la oración principal, no a la subordinada. Por eso 'did we understand' va al final.",
      },
      {
        tipo: "producir",
        id: "inv-p1",
        instruccion: "Escribe la conclusión de una presentación de resultados.",
        contexto: "Tres frases. Al menos dos tienen que usar inversión para dar énfasis.",
        criterios: [
          "Dos estructuras invertidas distintas (not only, never, rarely, only after…).",
          "Auxiliar correcto y en el orden correcto.",
          "Que suene enfático, no forzado.",
        ],
        modelo:
          "Not only did we recover last quarter's losses, but we also opened two new markets. Never before has the team delivered at this pace. Only after reviewing the full dataset did we understand why.",
      },
    ],
  },
  {
    id: "discourse-markers",
    titulo: "Variedad de conectores",
    area: "Discurso",
    nivel: "C1",
    minutos: 5,
    claseOrigen: { fecha: "9 jul", profesor: "Sinead" },
    intro:
      "A tu nivel el problema no es conectar ideas, es repetir siempre 'so' y 'but'. Aquí ampliamos el repertorio.",
    ejercicios: [
      {
        tipo: "reconocer",
        id: "dm-r1",
        enunciado: "The proposal is expensive. ____, it's the only realistic option.",
        opciones: ["That said", "Moreover", "Therefore", "In addition"],
        correcta: 0,
        explicacion:
          "'That said' introduce una concesión: reconoce lo anterior y matiza. Los otros tres suman o concluyen, no contrastan.",
      },
      {
        tipo: "reconocer",
        id: "dm-r2",
        enunciado: "____ the delays, the client renewed the contract.",
        opciones: ["Despite", "Although", "However", "Nevertheless"],
        correcta: 0,
        explicacion:
          "'Despite' va seguido de sustantivo o gerundio. 'Although' necesitaría una frase completa: 'Although we were delayed…'.",
      },
      {
        tipo: "transformar",
        id: "dm-t1",
        instruccion: "Reescribe sustituyendo 'so' por un conector más formal.",
        frase: "The data was incomplete, so we postponed the launch.",
        respuestas: [
          "The data was incomplete; therefore, we postponed the launch.",
          "The data was incomplete. Therefore, we postponed the launch.",
          "The data was incomplete; consequently, we postponed the launch.",
          "The data was incomplete. Consequently, we postponed the launch.",
        ],
        pista: "Therefore o consequently, con punto o punto y coma delante.",
        explicacion:
          "Estos conectores no unen dos oraciones con coma: necesitan punto o punto y coma antes.",
      },
      {
        tipo: "transformar",
        id: "dm-t2",
        instruccion: "Une las dos ideas con un conector de contraste que no sea 'but'.",
        frase: "The campaign reached more people. Conversions stayed flat.",
        respuestas: [
          "The campaign reached more people; however, conversions stayed flat.",
          "The campaign reached more people. However, conversions stayed flat.",
          "The campaign reached more people. Nevertheless, conversions stayed flat.",
          "The campaign reached more people; nevertheless, conversions stayed flat.",
        ],
        pista: "However o nevertheless, con su puntuación correcta.",
        explicacion:
          "'However' y 'nevertheless' marcan contraste entre oraciones independientes y siempre llevan coma después.",
      },
      {
        tipo: "producir",
        id: "dm-p1",
        instruccion: "Argumenta a favor de una decisión impopular en tu empresa.",
        contexto: "Cinco frases. Sin usar 'so' ni 'but' ni una sola vez.",
        criterios: [
          "Un conector de consecuencia (therefore, consequently, as a result).",
          "Un conector de contraste (however, nevertheless, that said).",
          "Un conector de adición (moreover, furthermore, in addition).",
        ],
        modelo:
          "Freezing hiring was unpopular. Nevertheless, it protected the team from layoffs. Our runway had shortened considerably; therefore, we had to act early. Moreover, it gave us room to invest in training. That said, I understand why it felt abrupt.",
      },
    ],
  },
];

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
  nivel: string;
  profesor: string;
};

export const getBloque = (id: string) => BLOQUES.find((b) => b.id === id);
