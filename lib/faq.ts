// ---------------------------------------------------------------
// LAS PREGUNTAS FRECUENTES
//
// ESTE ARCHIVO ES CONTENIDO, no interfaz. Se edita para cambiar lo que
// dice la ayuda; el widget —`components/ChatAyuda.tsx`— no hace falta
// tocarlo para añadir, quitar o reescribir una pregunta.
//
// EN LOS DOS IDIOMAS, Y EL TIPO OBLIGA. Cada pregunta y cada respuesta
// es un par `{ es, en }`, igual que el resto de textos de la aplicación:
// una pregunta nueva sin su inglés no compila, que es la única forma de
// que las dos versiones no se separen con el tiempo. Los `id` no cambian
// con el idioma, así que una conversación empezada en un idioma sigue
// entera si se cambia al otro.
//
// NO HAY IA DETRÁS. La ayuda no genera respuestas: las busca. Es una
// decisión, no una limitación pendiente de resolver — un modelo que se
// invente una política de cancelación que no existe hace más daño que
// un "esto no lo sé, habla con soporte". Todo lo que el alumno lee aquí
// está escrito por una persona.
//
// Y CUANDO NO ESTÁ, SE DERIVA. La búsqueda que no encuentra nada no
// improvisa: ofrece WhatsApp. Ese es el suelo de la pieza.
//
// Módulo puro: sin `server-only` y sin tocar la base ni el navegador.
// Lo importa un componente de cliente.
// ---------------------------------------------------------------

import type { Idioma } from "@/lib/idioma";

/** Un texto en los dos idiomas. */
export type Bilingue = Record<Idioma, string>;

export type Pregunta = {
  id: string;
  pregunta: Bilingue;
  respuesta: Bilingue;
  /**
   * Lo que el alumno escribe y NO está en el texto de la pregunta.
   *
   * Es la mitad del buscador. Nadie escribe "¿el enlace dice que ya no
   * es válido?": escribe "caducado", "expirado", "no funciona el link".
   * Cada palabra que se añade aquí es una búsqueda que deja de acabar en
   * soporte.
   *
   * Van mezcladas las de los dos idiomas en la misma lista: una clave en
   * inglés no casa con una búsqueda en español ni al revés, así que
   * separarlas no ganaría nada y obligaría a mantener dos listas.
   */
  claves?: string[];
};

export type CategoriaFaq = {
  id: string;
  nombre: Bilingue;
  preguntas: Pregunta[];
};

export const FAQ: CategoriaFaq[] = [
  {
    id: "acceso",
    nombre: { es: "Acceso", en: "Access" },
    preguntas: [
      {
        id: "acceso-como-entro",
        pregunta: {
          es: "¿Cómo entro a la plataforma de práctica?",
          en: "How do I get into the practice platform?",
        },
        respuesta: {
          es: "Desde tu cuenta en la web, con el botón que verás en «Mi cuenta». También puedes pedir un enlace de acceso por email desde la propia plataforma.",
          en: "From your account on the website, with the button you'll see under \"My account\". You can also ask for an access link by email from the platform itself.",
        },
        claves: ["entrar", "iniciar sesion", "login", "acceder", "mi cuenta", "sign in", "log in", "access"],
      },
      {
        id: "acceso-no-llega",
        pregunta: {
          es: "No me llega el enlace de acceso.",
          en: "The access link isn't arriving.",
        },
        respuesta: {
          es: "Revisa la carpeta de spam o promociones de tu correo. Si sigue sin aparecer, escríbenos por WhatsApp y lo miramos.",
          en: "Check your spam or promotions folder. If it still doesn't show up, message us on WhatsApp and we'll look into it.",
        },
        claves: ["email", "correo", "spam", "no recibo", "no llega", "enlace", "link", "not received", "didnt arrive", "junk"],
      },
      {
        id: "acceso-caducado",
        pregunta: {
          es: "El enlace dice que ya no es válido.",
          en: "The link says it's no longer valid.",
        },
        respuesta: {
          es: "Los enlaces caducan a los 15 minutos por seguridad. Pide uno nuevo desde la pantalla de acceso y úsalo enseguida.",
          en: "Links expire after 15 minutes for security. Ask for a new one from the sign-in screen and use it straight away.",
        },
        claves: ["caducado", "expirado", "invalido", "link", "no funciona", "expired", "invalid", "doesnt work"],
      },
      {
        id: "acceso-contrasena",
        pregunta: { es: "¿Necesito una contraseña?", en: "Do I need a password?" },
        respuesta: {
          es: "No. Entras con un enlace y la sesión te dura un mes, así que no tendrás que repetirlo cada vez.",
          en: "No. You sign in with a link and your session lasts a month, so you won't have to do it every time.",
        },
        claves: ["password", "clave", "contrasena", "olvide", "forgot"],
      },
      {
        id: "acceso-otro-dispositivo",
        pregunta: {
          es: "Entré desde el ordenador. ¿Tengo que volver a entrar en el móvil?",
          en: "I signed in on my computer. Do I have to sign in again on my phone?",
        },
        respuesta: {
          es: "Sí, una vez en cada dispositivo. Después queda abierto durante un mes.",
          en: "Yes, once on each device. After that it stays open for a month.",
        },
        claves: ["movil", "telefono", "tablet", "ordenador", "dispositivo", "otra vez", "phone", "mobile", "computer", "device", "again"],
      },
      {
        id: "acceso-no-pasa-nada",
        pregunta: {
          es: "Pongo mi email y no pasa nada.",
          en: "I enter my email and nothing happens.",
        },
        respuesta: {
          es: "Por seguridad siempre mostramos el mismo mensaje, exista o no el correo. Comprueba que sea el mismo email con el que estás dado de alta en la academia. Si no estás seguro, escríbenos.",
          en: "For security we always show the same message, whether or not the email exists. Check that it's the same email you registered with at the academy. If you're not sure, write to us.",
        },
        claves: ["no pasa nada", "no responde", "email incorrecto", "no funciona", "nothing happens", "wrong email", "doesnt work"],
      },
      // --- Registro y prueba de nivel ---
      // Va en Acceso y no en su propia categoría: es la puerta de entrada,
      // y quien busca esto todavía no distingue "registro" de "acceso".
      {
        id: "acceso-despues-registro",
        pregunta: {
          es: "¿Qué tengo que hacer después de registrarme?",
          en: "What do I need to do after registering?",
        },
        respuesta: {
          es: "Completar tu formulario de bienvenida y la prueba de nivel. Es rápido y nos permite conocer tu nivel y tus objetivos para asignarte el profesor que mejor encaje contigo. Hasta que no lo completes, no podemos asignarte clases.",
          en: "Fill in your welcome form and take the level test. It's quick, and it lets us know your level and your goals so we can match you with the teacher who suits you best. Until you've done it, we can't assign you classes.",
        },
        claves: ["registro", "alta", "bienvenida", "formulario", "empezar", "register", "signup", "welcome", "form", "start"],
      },
      {
        id: "acceso-prueba-nivel",
        pregunta: {
          es: "¿Para qué sirve la prueba de nivel?",
          en: "What is the level test for?",
        },
        respuesta: {
          es: "Para ubicarte en el nivel correcto y que tus clases sean provechosas desde el primer día, ni demasiado fáciles ni demasiado difíciles.",
          en: "To place you at the right level so your classes are worthwhile from day one, neither too easy nor too hard.",
        },
        claves: ["test", "nivel", "examen inicial", "prueba", "level", "placement"],
      },
      {
        id: "acceso-formulario-a-medias",
        pregunta: {
          es: "Empecé el formulario pero no lo terminé. ¿Puedo retomarlo?",
          en: "I started the form but didn't finish it. Can I pick it up again?",
        },
        respuesta: {
          es: "Sí. Usa el mismo enlace que te enviamos por email. Si no lo encuentras, revisa spam o escríbenos.",
          en: "Yes. Use the same link we sent you by email. If you can't find it, check your spam or write to us.",
        },
        claves: ["formulario", "retomar", "continuar", "a medias", "sin terminar", "form", "resume", "continue", "unfinished"],
      },
    ],
  },
  {
    id: "curso",
    nombre: { es: "El curso", en: "The course" },
    preguntas: [
      {
        id: "curso-cual-me-toca",
        pregunta: { es: "¿Qué curso me corresponde?", en: "Which course is mine?" },
        respuesta: {
          es: "El curso general de tu nivel. Si estás preparando un examen (FCE, CAE, PET), tienes además el curso específico de ese examen.",
          en: "The general course for your level. If you're preparing for an exam (FCE, CAE, PET), you also have the course for that exam.",
        },
        claves: ["que curso", "cual", "fce", "cae", "pet", "first", "advanced", "examen", "which course", "exam"],
      },
      {
        id: "curso-leccion-bloqueada",
        pregunta: {
          es: "¿Por qué no puedo abrir esta lección?",
          en: "Why can't I open this lesson?",
        },
        respuesta: {
          es: "El curso se libera semana a semana a lo largo de seis meses. Es el ritmo con el que está diseñado: da tiempo a que cada bloque asiente antes de pasar al siguiente.",
          en: "The course is released week by week over six months. That's the pace it's designed for: it gives each block time to settle before moving on to the next.",
        },
        claves: ["bloqueada", "cerrada", "candado", "no puedo abrir", "no se abre", "locked", "cant open", "wont open", "padlock"],
      },
      {
        id: "curso-disponible-en-dias",
        pregunta: {
          es: "Dice «disponible en X días». ¿Desde cuándo se cuenta?",
          en: "It says \"available in X days\". Counting from when?",
        },
        respuesta: {
          es: "Desde que empezaste con la academia, no desde que entraste por primera vez a la plataforma.",
          en: "From when you started with the academy, not from the first time you signed in to the platform.",
        },
        claves: ["disponible en", "dias", "cuenta", "desbloquea", "cuando", "available in", "days", "unlock", "when"],
      },
      {
        id: "curso-hecha-y-bloqueada",
        pregunta: {
          es: "Ya había hecho esta lección y ahora aparece bloqueada.",
          en: "I'd already done this lesson and now it shows as locked.",
        },
        respuesta: {
          es: "No debería pasar: todo lo que hayas completado sigue abierto siempre. Si te ocurre, avísanos con el nombre de la lección.",
          en: "That shouldn't happen: everything you've completed stays open for good. If it happens to you, let us know the name of the lesson.",
        },
        claves: ["bloqueada", "completada", "hecha", "error", "otra vez", "locked", "completed", "done", "again"],
      },
      {
        id: "curso-adelantar",
        pregunta: {
          es: "¿Puedo adelantar el curso si tengo tiempo?",
          en: "Can I get ahead in the course if I have time?",
        },
        respuesta: {
          es: "El ritmo está pensado para que el aprendizaje se consolide. Si tienes un examen cerca o una situación concreta, coméntaselo a tu profesor.",
          en: "The pace is designed so that what you learn sticks. If you have an exam coming up or a particular situation, talk to your teacher about it.",
        },
        claves: ["adelantar", "acelerar", "mas rapido", "saltar", "avanzar", "ahead", "faster", "skip", "speed up"],
      },
      {
        id: "curso-duracion",
        pregunta: { es: "¿Cuánto dura el curso?", en: "How long is the course?" },
        respuesta: {
          es: "Seis meses de contenido, repartido en 23 semanas.",
          en: "Six months of content, spread over 23 weeks.",
        },
        claves: ["duracion", "cuanto dura", "meses", "semanas", "largo", "how long", "months", "weeks", "length"],
      },
      {
        id: "curso-plataforma-anterior",
        pregunta: {
          es: "Hice contenido en la plataforma anterior. ¿Se ha perdido?",
          en: "I did work on the old platform. Is it lost?",
        },
        respuesta: {
          es: "No. Tu progreso se conservó y lo verás reflejado al entrar.",
          en: "No. Your progress was kept, and you'll see it when you sign in.",
        },
        claves: ["plataforma vieja", "anterior", "migracion", "perdido", "antiguo", "old platform", "previous", "lost", "migration"],
      },
    ],
  },
  {
    id: "practica",
    nombre: { es: "Tu práctica", en: "Your practice" },
    preguntas: [
      {
        id: "practica-que-es",
        pregunta: {
          es: "¿Qué es «tu práctica» y en qué se diferencia del curso?",
          en: "What is \"your practice\" and how is it different from the course?",
        },
        respuesta: {
          es: "El curso es el mismo para todos los alumnos de tu nivel. La práctica se genera solo para ti, a partir de lo que trabajaste en tu última clase, de lo que se te viene repitiendo en las anteriores y de lo que nos hayas contado sobre ti.",
          en: "The course is the same for every student at your level. Your practice is built just for you, from what you worked on in your last class, what keeps coming up in the ones before, and what you've told us about yourself.",
        },
        claves: ["diferencia", "que es", "personalizada", "para mi", "difference", "what is", "personalised", "for me"],
      },
      {
        id: "practica-de-donde-salen",
        pregunta: {
          es: "¿De dónde salen estos ejercicios?",
          en: "Where do these exercises come from?",
        },
        respuesta: {
          es: "De cuatro sitios a la vez: lo que trabajaste en tu última clase, lo que se te repite en las anteriores, a qué te dedicas si nos lo has contado, y el formato de tu examen si preparas uno. Todo eso va en el mismo bloque.",
          en: "From four places at once: what you worked on in your last class, what keeps coming up in the ones before, what you do for a living if you've told us, and the format of your exam if you're preparing for one. All of that goes into the same block.",
        },
        claves: ["de donde", "ejercicios", "generados", "origen", "quien los hace", "where from", "exercises", "generated", "who makes"],
      },
      {
        id: "practica-otro-bloque",
        pregunta: {
          es: "¿Por qué no puedo generar otro bloque hoy?",
          en: "Why can't I build another block today?",
        },
        respuesta: {
          es: "Porque hasta tu próxima clase no hay material nuevo del que partir, y otro bloque con lo mismo sería el que ya tienes con otras palabras. En cuanto tengas la siguiente, preparamos otro.",
          en: "Because until your next class there's no new material to start from, and another block on the same thing would be the one you already have in different words. As soon as you have your next class, we'll build another.",
        },
        claves: ["repaso", "generar", "otro", "bloqueado", "no puedo", "espera", "bloque", "build", "another", "cant", "wait", "block", "generate"],
      },
      {
        id: "practica-ingles-trabajo",
        pregunta: {
          es: "¿Por qué mis ejercicios no hablan de mi trabajo?",
          en: "Why aren't my exercises about my job?",
        },
        respuesta: {
          es: "Porque todavía no sabemos a qué te dedicas. Completa tu perfil —a qué te dedicas y qué quieres conseguir con el inglés— y parte de los ejercicios de tu próximo bloque estarán ambientados en tus situaciones reales.",
          en: "Because we don't know what you do yet. Fill in your profile (what you do and what you want to achieve with your English) and some of the exercises in your next block will be set in your real situations.",
        },
        claves: ["trabajo", "contexto", "perfil", "no aparece", "dia a dia", "job", "work", "profile", "context"],
      },
      {
        id: "practica-duracion-bloque",
        pregunta: {
          es: "¿Cuánto dura cada bloque de práctica?",
          en: "How long does each practice block take?",
        },
        respuesta: {
          es: "Unos diez minutos. Son diez ejercicios que van de reconocer la forma correcta a producirla tú: cuatro de reconocer, cuatro de transformar y dos de escribir.",
          en: "About ten minutes. It's ten exercises that go from recognising the correct form to producing it yourself: four to recognise, four to transform and two to write.",
        },
        claves: ["cuanto dura", "tiempo", "minutos", "bloque", "largo", "how long", "time", "minutes", "block"],
      },
      {
        id: "practica-ejercicio-mal",
        pregunta: {
          es: "Creo que este ejercicio está mal.",
          en: "I think this exercise is wrong.",
        },
        respuesta: {
          es: "Puedes marcarlo desde el propio ejercicio y lo revisamos.",
          en: "You can flag it from the exercise itself and we'll review it.",
        },
        claves: ["error", "mal", "incorrecto", "fallo", "equivocado", "reportar", "wrong", "mistake", "incorrect", "report", "flag"],
      },
      {
        id: "practica-profesor-ve",
        pregunta: {
          es: "¿Mi profesor ve lo que hago en la práctica?",
          en: "Does my teacher see what I do in my practice?",
        },
        respuesta: {
          es: "Lo que escribes en la última parte de cada bloque está pensado para que tu profesor lo tenga en cuenta.",
          en: "What you write in the last part of each block is meant for your teacher to take into account.",
        },
        claves: ["profesor", "ve", "privacidad", "corrige", "revisa", "teacher", "see", "privacy", "correct", "review"],
      },
    ],
  },
  {
    id: "progreso",
    nombre: { es: "Progreso", en: "Progress" },
    preguntas: [
      {
        id: "progreso-dispositivos",
        pregunta: {
          es: "¿Se guarda mi progreso si cambio de dispositivo?",
          en: "Is my progress saved if I switch devices?",
        },
        respuesta: {
          es: "Sí. Tu progreso está asociado a tu cuenta, no al navegador.",
          en: "Yes. Your progress is tied to your account, not to the browser.",
        },
        claves: ["guardar", "dispositivo", "movil", "ordenador", "se pierde", "sincroniza", "saved", "device", "phone", "computer", "lost", "sync"],
      },
      {
        id: "progreso-no-marcada",
        pregunta: {
          es: "Completé una lección y no aparece marcada.",
          en: "I finished a lesson and it isn't marked as done.",
        },
        respuesta: {
          es: "Recarga la página. Si sigue sin aparecer, avísanos con el nombre de la lección.",
          en: "Reload the page. If it still doesn't show, let us know the name of the lesson.",
        },
        claves: ["completada", "no aparece", "marcada", "tilde", "no se guarda", "completed", "not marked", "tick", "not saved"],
      },
    ],
  },
  {
    id: "tecnico",
    nombre: { es: "Problemas técnicos", en: "Technical problems" },
    preguntas: [
      {
        id: "tecnico-audio",
        pregunta: {
          es: "El audio de la lección no suena.",
          en: "The lesson audio isn't playing.",
        },
        respuesta: {
          es: "Prueba a recargar la página y comprueba el volumen del reproductor. Si sigue sin funcionar, escríbenos indicando en qué lección estás.",
          en: "Try reloading the page and check the player's volume. If it still doesn't work, write to us and tell us which lesson you're on.",
        },
        claves: ["audio", "sonido", "no suena", "listening", "escuchar", "sound", "no sound", "listen"],
      },
      {
        id: "tecnico-video",
        pregunta: { es: "El vídeo no carga.", en: "The video won't load." },
        respuesta: {
          es: "Suele ser un bloqueador de anuncios o una extensión del navegador. Prueba a desactivarlo para esta página o abrirla en otro navegador.",
          en: "It's usually an ad blocker or a browser extension. Try turning it off for this page, or open the page in another browser.",
        },
        claves: ["video", "no carga", "negro", "youtube", "adblock", "bloqueador", "wont load", "black", "ad blocker"],
      },
      {
        id: "tecnico-cargando",
        pregunta: {
          es: "La página se queda cargando.",
          en: "The page keeps loading.",
        },
        respuesta: {
          es: "Recarga. Si el problema continúa, dinos desde qué dispositivo y navegador entras.",
          en: "Reload. If it carries on, tell us which device and browser you're using.",
        },
        claves: ["cargando", "lento", "colgada", "no carga", "pantalla en blanco", "loading", "slow", "stuck", "blank screen"],
      },
    ],
  },
  {
    id: "clases",
    nombre: { es: "Clases y pagos", en: "Classes and payments" },
    preguntas: [
      {
        id: "clases-como-son",
        pregunta: { es: "¿Cómo son las clases?", en: "What are the classes like?" },
        respuesta: {
          es: "Clases de inglés online, en directo, uno a uno con tu profesor por videollamada.",
          en: "Online English classes, live, one to one with your teacher over video call.",
        },
        claves: ["clases", "online", "particular", "grupo", "como son", "classes", "one to one", "group", "what are"],
      },
      {
        id: "clases-como-entro",
        pregunta: { es: "¿Cómo entro a mi clase?", en: "How do I join my class?" },
        respuesta: {
          es: "A la hora de tu clase, con el enlace de videollamada que te haya facilitado tu profesor.",
          en: "At the time of your class, with the video call link your teacher gave you.",
        },
        claves: ["entrar", "clase", "videollamada", "enlace", "zoom", "meet", "join", "class", "video call", "link"],
      },
      {
        id: "clases-enfoque",
        pregunta: {
          es: "¿Puedo decirle a mi profesor en qué quiero enfocarme?",
          en: "Can I tell my teacher what I want to focus on?",
        },
        respuesta: {
          es: "Sí, y es muy recomendable. Cuéntale tu objetivo —trabajo, examen, conversación— y adaptará las clases.",
          en: "Yes, and we really recommend it. Tell them your goal (work, an exam, conversation) and they'll adapt the classes.",
        },
        claves: ["enfoque", "objetivo", "pedir", "temas", "adaptar", "focus", "goal", "topics", "adapt"],
      },
      {
        id: "clases-videollamada-falla",
        pregunta: {
          es: "No me funciona la videollamada.",
          en: "The video call isn't working.",
        },
        respuesta: {
          es: "Comprueba tu conexión y prueba a recargar el enlace. Si sigue sin funcionar, escríbenos enseguida para no perder la clase.",
          en: "Check your connection and try reloading the link. If it still doesn't work, write to us straight away so you don't miss the class.",
        },
        claves: ["videollamada", "no funciona", "camara", "microfono", "conexion", "video call", "not working", "camera", "microphone", "connection"],
      },
      {
        id: "clases-cambiar",
        pregunta: {
          es: "¿Puedo cambiar de horario o de profesor?",
          en: "Can I change my schedule or my teacher?",
        },
        respuesta: {
          es: "Escríbenos y vemos las opciones disponibles según la disponibilidad de horarios.",
          en: "Write to us and we'll look at the options, depending on what times are available.",
        },
        claves: ["cambiar", "horario", "profesor", "cancelar clase", "mover", "change", "schedule", "teacher", "cancel class", "move"],
      },
      // --- Suscripción ---
      {
        id: "clases-suscripcion-espera",
        pregunta: {
          es: "Mi suscripción aparece «en espera». ¿Qué significa?",
          en: "My subscription shows as \"on hold\". What does that mean?",
        },
        respuesta: {
          es: "Suele deberse a un pago pendiente. Mientras esté en espera no podrás tomar clases. Revisa tu método de pago o escríbenos para regularizarlo.",
          en: "It's usually because of a pending payment. While it's on hold you won't be able to take classes. Check your payment method or write to us to sort it out.",
        },
        claves: ["suscripcion", "en espera", "pago", "pendiente", "cobro", "tarjeta", "subscription", "on hold", "payment", "pending", "card"],
      },
      {
        id: "clases-cancelar",
        pregunta: {
          es: "¿Qué pasa si cancelo mi suscripción?",
          en: "What happens if I cancel my subscription?",
        },
        respuesta: {
          es: "Puedes seguir dando tus clases hasta que termine el periodo que ya has pagado.",
          en: "You can keep taking your classes until the period you've already paid for ends.",
        },
        claves: ["cancelar", "baja", "suscripcion", "devolucion", "reembolso", "cancel", "subscription", "refund"],
      },
    ],
  },
];

/** Todas las preguntas en plano, que es como las recorre el buscador. */
export const PREGUNTAS: Pregunta[] = FAQ.flatMap((categoria) => categoria.preguntas);

export function preguntaPorId(id: string): Pregunta | undefined {
  return PREGUNTAS.find((p) => p.id === id);
}

// ---------------------------------------------------------------
// EL BUSCADOR
//
// Sin índice, sin librería y sin modelo: son 37 preguntas y se recorren
// enteras en cada pulsación sin que se note.
//
// LO QUE DE VERDAD IMPORTA ES LA TOLERANCIA. Quien escribe en un chat de
// ayuda escribe deprisa y mal: "suscripcion" sin tilde, "contraseca",
// "no me llga el mail". Una búsqueda que solo case exacto manda a
// soporte a media academia por una letra.
//
// Tres niveles, de más a menos seguro: la palabra está, la palabra
// empieza igual, o se parece lo bastante —una o dos letras de
// diferencia, según lo larga que sea—. Nunca más de dos: con tres, "casa"
// encuentra "clase" y la ayuda empieza a mentir.
//
// BUSCA EN EL IDIOMA DE LA PANTALLA. Las preguntas y respuestas se
// miran en el idioma que hay puesto; las claves, que van mezcladas, se
// miran todas, porque una clave del otro idioma no casa y no molesta.
// ---------------------------------------------------------------

/** Minúsculas, sin tildes y sin puntuación. La forma canónica de todo. */
export function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9ñ\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Palabras que aparecen en todas las preguntas y no distinguen ninguna.
 * Sin esto, "no me llega el email" puntúa alto en cualquier pregunta que
 * lleve un "no" o un "me". Las de los dos idiomas en la misma lista, por
 * lo mismo que las claves.
 */
const VACIAS = new Set([
  // español
  "a", "al", "algo", "como", "con", "cuando", "cual", "de", "del", "donde", "el", "ella", "en",
  "es", "esta", "este", "esto", "hay", "la", "las", "le", "lo", "los", "me", "mi", "no", "para",
  "pero", "por", "que", "qué", "se", "si", "sin", "sobre", "su", "tu", "un", "una", "y", "ya",
  // inglés
  "the", "an", "to", "of", "in", "on", "my", "i", "is", "it", "do", "does", "can", "cant", "how",
  "what", "why", "not", "dont", "and", "or", "for", "with", "this", "that", "are", "am", "be",
  "was", "have", "has", "you", "your", "if", "at", "from", "by", "up", "so", "me",
]);

function palabras(texto: string): string[] {
  return normalizar(texto)
    .split(" ")
    .filter((p) => p !== "");
}

/**
 * Distancia de edición, cortada en `techo`.
 *
 * Se corta a propósito: en cuanto la fila entera se pasa del techo no
 * hay forma de bajar, así que seguir contando es trabajo tirado. Con
 * palabras de diez letras se ahorra la mitad de la tabla.
 */
function distancia(a: string, b: string, techo: number): number {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > techo) return techo + 1;

  let previa = Array.from({ length: b.length + 1 }, (_, i) => i);

  for (let i = 1; i <= a.length; i++) {
    const actual = [i];
    let minimo = i;

    for (let j = 1; j <= b.length; j++) {
      const coste = a[i - 1] === b[j - 1] ? 0 : 1;
      const valor = Math.min(previa[j] + 1, actual[j - 1] + 1, previa[j - 1] + coste);
      actual.push(valor);
      if (valor < minimo) minimo = valor;
    }

    if (minimo > techo) return techo + 1;
    previa = actual;
  }

  return previa[b.length];
}

/** Cuántas letras de diferencia se le perdonan a una palabra de este largo. */
function margen(largo: number): number {
  if (largo <= 3) return 0;
  if (largo <= 6) return 1;
  return 2;
}

/** Lo que puntúa una palabra buscada contra una del texto. */
function puntuarPalabra(buscada: string, candidata: string): number {
  if (buscada === candidata) return 1;

  // "suscrip" encuentra "suscripcion": quien escribe en un chat no
  // termina las palabras largas.
  //
  // LAS CUATRO LETRAS SE LE EXIGEN A LAS DOS, no solo a la buscada. Con
  // el mínimo solo en un lado, "asdfgh" empezaba por "a" —que sale en
  // media docena de preguntas— y la ayuda respondía cuatro cosas a un
  // teclazo. Un prefijo de tres letras no es una intención, es una
  // coincidencia.
  if (candidata.startsWith(buscada) || buscada.startsWith(candidata)) {
    return Math.min(buscada.length, candidata.length) >= 4 ? 0.85 : 0;
  }

  return distancia(buscada, candidata, margen(buscada.length)) <= margen(buscada.length) ? 0.7 : 0;
}

export type Resultado = { pregunta: Pregunta; puntos: number };

/**
 * A partir de aquí se considera que la búsqueda ha encontrado algo.
 *
 * Es el umbral que decide entre enseñar preguntas y derivar a soporte,
 * así que peca de exigente: una respuesta que no viene a cuento gasta la
 * confianza del alumno más de lo que la gana un "no lo he encontrado".
 */
const UMBRAL = 0.55;

/**
 * Las preguntas que mejor responden a lo que ha escrito el alumno.
 *
 * El texto de la pregunta y sus claves pesan el doble que el de la
 * respuesta: que una palabra salga de pasada en un párrafo no significa
 * que la pregunta vaya de eso.
 */
export function buscar(consulta: string, idioma: Idioma, tope = 4): Resultado[] {
  const buscadas = palabras(consulta).filter((p) => !VACIAS.has(p) && p.length > 2);
  if (buscadas.length === 0) return [];

  const resultados: Resultado[] = [];

  for (const pregunta of PREGUNTAS) {
    const titulo = [
      ...palabras(pregunta.pregunta[idioma]),
      ...(pregunta.claves ?? []).flatMap(palabras),
    ];
    const cuerpo = palabras(pregunta.respuesta[idioma]);

    let suma = 0;
    let mejorDeTodas = 0;

    for (const buscada of buscadas) {
      let mejor = 0;

      for (const candidata of titulo) {
        mejor = Math.max(mejor, puntuarPalabra(buscada, candidata));
        if (mejor === 1) break;
      }

      // La respuesta solo se mira si el título no ha dado un acierto
      // pleno, y aun así vale la mitad.
      if (mejor < 1) {
        for (const candidata of cuerpo) {
          mejor = Math.max(mejor, puntuarPalabra(buscada, candidata) * 0.5);
        }
      }

      suma += mejor;
      if (mejor > mejorDeTodas) mejorDeTodas = mejor;
    }

    // MEDIA Y MEJOR, A PARTES IGUALES. Solo con la media, "quiero
    // cancelar" se quedaba sin respuesta: "cancelar" acertaba de pleno y
    // "quiero" no acertaba nada, así que la frase entera se quedaba en un
    // 0,5 y caía por debajo del umbral. La gente escribe frases, no
    // etiquetas, y las palabras de relleno no deberían tumbar la palabra
    // que sí dice de qué va la duda.
    //
    // La media sola tampoco sobra: es lo que impide que una palabra
    // suelta y común arrastre media lista.
    const puntos = 0.5 * (suma / buscadas.length) + 0.5 * mejorDeTodas;
    if (puntos >= UMBRAL) resultados.push({ pregunta, puntos });
  }

  return resultados.sort((a, b) => b.puntos - a.puntos).slice(0, tope);
}

// ---------------------------------------------------------------
// SOPORTE
//
// El número es de la academia y el mensaje va prerrellenado con quién
// escribe y desde dónde. No es un detalle: cada conversación de soporte
// empezaba con dos preguntas nuestras antes de poder ayudar en nada.
//
// EN EL IDIOMA DE LA PANTALLA. Lo escribe el alumno, no nosotros: quien
// usa la plataforma en inglés va a seguir la conversación en inglés, y
// un primer mensaje en español que no ha escrito él lo dejaría fuera de
// su propia conversación.
// ---------------------------------------------------------------

export const WHATSAPP = "353899409220";

/** Cómo se llama cada pantalla cuando se la nombra en un mensaje. */
function nombreDePantalla(ruta: string, idioma: Idioma): string {
  const es = idioma === "es";
  if (ruta === "/practica") return es ? "mi práctica" : "my practice";
  if (ruta.startsWith("/alumno/")) return es ? "mi inicio" : "my home screen";
  if (/^\/curso\/[^/]+\/[^/]+/.test(ruta)) return es ? "una lección del curso" : "a course lesson";
  if (ruta.startsWith("/curso/")) return es ? "el temario del curso" : "the course syllabus";
  return es ? "la plataforma" : "the platform";
}

/**
 * El enlace a WhatsApp, con el mensaje ya escrito.
 *
 * `asunto` es lo que estaba mirando cuando se atascó: la pregunta que no
 * le sirvió, o lo que escribió en el buscador y no encontró. Va entre
 * comillas y sin adornos, para que quien lo lea al otro lado sepa en
 * medio segundo de qué va.
 */
export function enlaceSoporte({
  nombre,
  ruta,
  asunto,
  idioma,
}: {
  nombre: string;
  ruta: string;
  asunto?: string;
  idioma: Idioma;
}): string {
  const es = idioma === "es";
  const quien = nombre.trim() === "" ? (es ? "un alumno" : "a student") : nombre.trim();
  const pantalla = nombreDePantalla(ruta, idioma);

  const partes = [
    es ? `Hola, soy ${quien}. Escribo desde ${pantalla}.` : `Hi, I'm ${quien}. I'm writing from ${pantalla}.`,
  ];
  if (asunto && asunto.trim() !== "") {
    partes.push(es ? `Mi duda: «${asunto.trim()}».` : `My question: "${asunto.trim()}".`);
  }

  return `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(partes.join(" "))}`;
}
