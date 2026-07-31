// ---------------------------------------------------------------
// BANCO DE RESERVA
// Bloques escritos a mano que se sirven cuando no hay clave de API
// o cuando la generación no sale bien. No son relleno: tienen el
// mismo nivel de acabado que los de `lib/data.ts`, para que la demo
// funcione igual sin ninguna clave configurada.
// ---------------------------------------------------------------

import type { Bloque } from "@/lib/data";

export const BANCO: Bloque[] = [
  // ============================== B1 ==============================
  {
    id: "banco-b1-futuros",
    titulo: "Will vs going to",
    area: "Gramática",
    nivel: "B1",
    minutos: 5,
    intro:
      "No es futuro cercano contra futuro lejano. Es plan que ya tenías (going to) contra decisión que tomas ahora mismo (will).",
    ejercicios: [
      {
        tipo: "reconocer",
        id: "bf-r1",
        enunciado: "Look at those clouds — it ____ rain.",
        opciones: ["is going to", "will", "rains", "is raining"],
        correcta: 0,
        explicacion:
          "Hay una prueba delante de ti (las nubes). Cuando la predicción se apoya en algo que se ve, se usa 'going to'. 'Will' sería una suposición tuya sin evidencia.",
      },
      {
        tipo: "reconocer",
        id: "bf-r2",
        enunciado: "— We've run out of paper. — Don't worry, I ____ some on my way back.",
        opciones: ["'ll buy", "'m going to buy", "buy", "am buying"],
        correcta: 0,
        explicacion:
          "Te acabas de enterar y decides en ese mismo instante: eso siempre es 'will'. 'Going to' daría a entender que ya lo tenías planeado antes de la conversación.",
      },
      {
        tipo: "transformar",
        id: "bf-t1",
        instruccion: "Reescribe la frase expresando un plan que ya está decidido.",
        frase: "We have decided to open an office in Lisbon next year.",
        respuestas: [
          "We are going to open an office in Lisbon next year.",
          "We're going to open an office in Lisbon next year.",
        ],
        pista: "Empieza por 'We are going to…'",
        explicacion:
          "Una decisión tomada antes de hablar se cuenta con 'going to'. Con 'will' sonaría a que lo has decidido mientras lo decías.",
      },
      {
        tipo: "transformar",
        id: "bf-t2",
        instruccion: "Responde ofreciéndote a ayudar en ese mismo momento.",
        frase: "This box is really heavy.",
        respuestas: ["I'll help you.", "I will help you.", "I'll help you with it.", "I'll give you a hand."],
        pista: "Un ofrecimiento espontáneo empieza siempre por 'I'll…'",
        explicacion:
          "Ofrecimientos, promesas y decisiones del momento van con 'will'. 'I'm going to help you' suena a que ya lo tenías pensado antes de que él dijera nada.",
      },
      {
        tipo: "producir",
        id: "bf-p1",
        instruccion: "Cuenta qué vas a hacer la semana que viene.",
        contexto:
          "Cuatro o cinco frases. Mezcla cosas que ya tienes en la agenda con alguna que decidas mientras escribes.",
        criterios: [
          "Dos planes ya cerrados con 'going to'.",
          "Una decisión del momento o un ofrecimiento con 'will'.",
          "Ningún 'will' en un plan que claramente ya estaba decidido.",
        ],
        modelo:
          "I'm going to visit our supplier in Porto on Tuesday. We're going to review the whole contract with them. I haven't booked the hotel yet — actually, I'll do that this afternoon. On Friday I'm going to work from home.",
      },
    ],
  },

  // ============================== B2 ==============================
  {
    id: "banco-b2-pasiva",
    titulo: "La pasiva en registro profesional",
    area: "Gramática",
    nivel: "B2",
    minutos: 6,
    intro:
      "En inglés de trabajo la pasiva no es un adorno: sirve para poner el foco en lo que pasó cuando decir quién lo hizo sobra o incomoda.",
    ejercicios: [
      {
        tipo: "reconocer",
        id: "bp-r1",
        enunciado: "The report ____ to all department heads yesterday.",
        opciones: ["was sent", "was send", "sent", "has sent"],
        correcta: 0,
        explicacion:
          "La pasiva es 'be' + participio: 'was sent'. 'Was send' es el fallo más habitual, porque en español el participio y el infinitivo se parecen menos y no se nota la diferencia al traducir.",
      },
      {
        tipo: "reconocer",
        id: "bp-r2",
        enunciado: "Nothing ____ until the client signs.",
        opciones: ["can be done", "can be do", "can do", "is doing"],
        correcta: 0,
        explicacion:
          "Con un modal la fórmula es 'modal + be + participio': 'can be done'. Después de 'be' nunca va el infinitivo desnudo.",
      },
      {
        tipo: "transformar",
        id: "bp-t1",
        instruccion: "Reescribe en pasiva para no señalar a nadie.",
        frase: "Someone deleted the shared folder by mistake.",
        respuestas: [
          "The shared folder was deleted by mistake.",
          "The shared folder was accidentally deleted.",
        ],
        pista: "Empieza por 'The shared folder…' y quita el 'someone'.",
        explicacion:
          "Cuando el sujeto es irrelevante o prefieres no exponerlo, la pasiva lo hace desaparecer sin sonar evasivo. Por eso aparece tanto en emails internos.",
      },
      {
        tipo: "transformar",
        id: "bp-t2",
        instruccion: "Reescribe en pasiva, manteniendo el matiz de 'en curso'.",
        frase: "They are still reviewing your application.",
        respuestas: [
          "Your application is still being reviewed.",
          "Your application is still under review.",
        ],
        pista: "El continuo pasivo es 'is being' + participio.",
        explicacion:
          "'Is being reviewed' mantiene que el proceso sigue abierto. 'Is reviewed' sonaría a rutina general, no a tu caso concreto ahora mismo.",
      },
      {
        tipo: "producir",
        id: "bp-p1",
        instruccion: "Escribe un email breve avisando de un retraso.",
        contexto:
          "Cuatro frases a un cliente. Cuenta qué ha pasado sin acusar a nadie del equipo y di cuándo se resuelve.",
        criterios: [
          "Dos pasivas correctas ('be' + participio).",
          "Al menos una sin 'by' — el responsable no aparece.",
          "Un cierre que diga cuándo se resuelve.",
        ],
        modelo:
          "I'm writing to let you know that the delivery has been delayed by a week. The final quality check was completed later than planned, and a new batch is currently being prepared. You will be notified as soon as it leaves our warehouse. Apologies for the inconvenience.",
      },
    ],
  },
  {
    id: "banco-b2-reported",
    titulo: "Estilo indirecto",
    area: "Gramática",
    nivel: "B2",
    minutos: 6,
    intro:
      "Contar lo que alguien dijo obliga a mover dos cosas a la vez: el tiempo verbal un paso atrás y las referencias de tiempo y lugar.",
    ejercicios: [
      {
        tipo: "reconocer",
        id: "br-r1",
        enunciado: "He told me he ____ busy that week.",
        opciones: ["was", "is", "will be", "has been"],
        correcta: 0,
        explicacion:
          "El original era 'I'm busy'. Al contarlo en pasado, el presente retrocede a pasado. Dejar 'is' es el calco directo del español, donde el tiempo suele quedarse igual.",
      },
      {
        tipo: "reconocer",
        id: "br-r2",
        enunciado: "She asked me ____ I had finished the report.",
        opciones: ["if", "that", "do", "what"],
        correcta: 0,
        explicacion:
          "Una pregunta de sí o no se reproduce con 'if' o 'whether'. 'That' solo introduce afirmaciones, y aquí no hay ninguna palabra interrogativa que sustituir.",
      },
      {
        tipo: "transformar",
        id: "br-t1",
        instruccion: "Pasa la frase a estilo indirecto.",
        frase: "\"I'll call you tomorrow,\" she said.",
        respuestas: [
          "She said she would call me the next day.",
          "She said that she would call me the next day.",
          "She said she would call me the following day.",
          "She said that she would call me the following day.",
        ],
        pista: "'Will' pasa a 'would', y 'tomorrow' deja de tener sentido si ya pasó.",
        explicacion:
          "No basta con cambiar el verbo: 'tomorrow' se convierte en 'the next day', porque el mañana de entonces ya no es el de ahora.",
      },
      {
        tipo: "transformar",
        id: "br-t2",
        instruccion: "Pasa la pregunta a estilo indirecto.",
        frase: "\"Where do you work?\" he asked me.",
        respuestas: ["He asked me where I worked.", "He asked me where I work."],
        pista: "Al reproducir una pregunta se pierde el orden interrogativo.",
        explicacion:
          "Desaparecen el 'do' y la inversión: queda 'where I worked', con orden de frase normal. Mantener 'where do I work' es el error más frecuente en este nivel.",
      },
      {
        tipo: "producir",
        id: "br-p1",
        instruccion: "Cuenta una conversación reciente con un cliente o un compañero.",
        contexto: "Cuatro o cinco frases, sin comillas: todo en estilo indirecto.",
        criterios: [
          "Un verbo que retrocede un tiempo (present → past, will → would).",
          "Una pregunta reproducida con 'if' o con palabra interrogativa, sin inversión.",
          "Una referencia temporal adaptada (tomorrow → the next day, today → that day).",
        ],
        modelo:
          "The client called on Monday and said they were not happy with the timeline. He asked me whether we could bring the launch forward, and I explained that we would need two more developers. He said he would speak to his team and get back to me the following week.",
      },
    ],
  },

  // ============================== C1 ==============================
  {
    id: "banco-c1-hedging",
    titulo: "Matizar sin sonar inseguro",
    area: "Discurso",
    nivel: "C1",
    minutos: 6,
    intro:
      "A tu nivel el riesgo no es el error: es sonar más tajante de lo que pretendías. En inglés profesional la afirmación rotunda se lee como falta de rigor.",
    ejercicios: [
      {
        tipo: "reconocer",
        id: "bh-r1",
        enunciado:
          "The data ____ that engagement is falling, though we need another quarter to confirm it.",
        opciones: ["suggests", "proves", "demonstrates", "confirms"],
        correcta: 0,
        explicacion:
          "La segunda mitad de la frase admite que falta confirmación, así que el verbo tiene que dejar la puerta abierta. 'Prove', 'demonstrate' y 'confirm' cierran el asunto y se contradicen con lo que viene después.",
      },
      {
        tipo: "reconocer",
        id: "bh-r2",
        enunciado: "____, the second option is more expensive in the long run.",
        opciones: ["Arguably", "Obviously", "Clearly", "Definitely"],
        correcta: 0,
        explicacion:
          "'Arguably' presenta tu lectura como defendible pero discutible. Los otros tres dan por hecho que el interlocutor ya está de acuerdo, y eso en una reunión suena a que le corriges.",
      },
      {
        tipo: "transformar",
        id: "bh-t1",
        instruccion: "Suaviza la afirmación sin renunciar a tu criterio.",
        frase: "This approach is wrong.",
        respuestas: [
          "This approach may not be the best option.",
          "This approach might not be the best option.",
        ],
        pista: "Usa 'may not be' o 'might not be' y termina con 'the best option'.",
        explicacion:
          "Pasas de juzgar el enfoque a comparar opciones. Sigues diciendo lo mismo, pero dejas espacio para que el otro defienda el suyo.",
      },
      {
        tipo: "transformar",
        id: "bh-t2",
        instruccion: "Reescribe con 'tend to' para generalizar con cautela.",
        frase: "Clients always ask for a discount at this stage.",
        respuestas: [
          "Clients tend to ask for a discount at this stage.",
          "Clients tend to ask for discounts at this stage.",
        ],
        pista: "'Tend to' va justo delante del verbo, sin 'to' repetido después.",
        explicacion:
          "'Always' invita a que te rebatan con un solo contraejemplo. 'Tend to' describe la tendencia y sobrevive a las excepciones.",
      },
      {
        tipo: "producir",
        id: "bh-p1",
        instruccion: "Escribe la conclusión de un informe cuyos datos no son concluyentes.",
        contexto:
          "Cuatro o cinco frases. Tienes una lectura clara, pero la muestra es pequeña y quieres decirlo sin que parezca que no te mojas.",
        criterios: [
          "Un verbo de matiz (suggest, indicate, point to, appear to).",
          "Un adverbio de matiz (arguably, broadly, largely, to some extent).",
          "Una recomendación firme pese a la cautela — matizar no es no decidir.",
        ],
        modelo:
          "The results broadly point to a drop in retention among new accounts, although the sample is too small to be conclusive. Pricing appears to be a factor, and to some extent onboarding is as well. That said, the direction is consistent across all three regions. I would therefore recommend running the pilot before the summer rather than waiting for a fuller dataset.",
      },
    ],
  },
];

/**
 * Elige un bloque del banco para un nivel, evitando títulos que el
 * alumno ya tiene delante. Si no queda ninguno libre del nivel,
 * relaja el filtro antes que devolver nada.
 */
export function bloqueDeBanco(nivel: Bloque["nivel"], titulosExcluidos: string[] = []): Bloque {
  const excluidos = new Set(titulosExcluidos.map((t) => t.trim().toLowerCase()));
  const libre = (b: Bloque) => !excluidos.has(b.titulo.toLowerCase());

  const delNivel = BANCO.filter((b) => b.nivel === nivel);
  const candidatos = [
    delNivel.filter(libre), // lo ideal: mismo nivel y tema nuevo
    delNivel, // mismo nivel aunque repita
    BANCO.filter(libre), // otro nivel pero tema nuevo
    BANCO, // lo que haya
  ].find((lista) => lista.length > 0) as Bloque[];

  return candidatos[Math.floor(Math.random() * candidatos.length)];
}
