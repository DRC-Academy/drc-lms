// ---------------------------------------------------------------
// LAS PREGUNTAS FRECUENTES
//
// ESTE ARCHIVO ES CONTENIDO, no interfaz. Se edita para cambiar lo que
// dice la ayuda; el widget —`components/ChatAyuda.tsx`— no hace falta
// tocarlo para añadir, quitar o reescribir una pregunta.
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

export type Pregunta = {
  id: string;
  pregunta: string;
  respuesta: string;
  /**
   * Lo que el alumno escribe y NO está en el texto de la pregunta.
   *
   * Es la mitad del buscador. Nadie escribe "¿el enlace dice que ya no
   * es válido?": escribe "caducado", "expirado", "no funciona el link".
   * Cada palabra que se añade aquí es una búsqueda que deja de acabar en
   * soporte.
   */
  claves?: string[];
};

export type CategoriaFaq = {
  id: string;
  nombre: string;
  preguntas: Pregunta[];
};

export const FAQ: CategoriaFaq[] = [
  {
    id: "acceso",
    nombre: "Acceso",
    preguntas: [
      {
        id: "acceso-como-entro",
        pregunta: "¿Cómo entro a la plataforma de práctica?",
        respuesta:
          "Desde tu cuenta en la web, con el botón que verás en «Mi cuenta». También puedes pedir un enlace de acceso por email desde la propia plataforma.",
        claves: ["entrar", "iniciar sesion", "login", "acceder", "mi cuenta"],
      },
      {
        id: "acceso-no-llega",
        pregunta: "No me llega el enlace de acceso.",
        respuesta:
          "Revisa la carpeta de spam o promociones de tu correo. Si sigue sin aparecer, escríbenos por WhatsApp y lo miramos.",
        claves: ["email", "correo", "spam", "no recibo", "no llega", "enlace"],
      },
      {
        id: "acceso-caducado",
        pregunta: "El enlace dice que ya no es válido.",
        respuesta:
          "Los enlaces caducan a los 15 minutos por seguridad. Pide uno nuevo desde la pantalla de acceso y úsalo enseguida.",
        claves: ["caducado", "expirado", "invalido", "link", "no funciona"],
      },
      {
        id: "acceso-contrasena",
        pregunta: "¿Necesito una contraseña?",
        respuesta:
          "No. Entras con un enlace y la sesión te dura un mes, así que no tendrás que repetirlo cada vez.",
        claves: ["password", "clave", "contrasena", "olvide"],
      },
      {
        id: "acceso-otro-dispositivo",
        pregunta: "Entré desde el ordenador. ¿Tengo que volver a entrar en el móvil?",
        respuesta: "Sí, una vez en cada dispositivo. Después queda abierto durante un mes.",
        claves: ["movil", "telefono", "tablet", "ordenador", "dispositivo", "otra vez"],
      },
      {
        id: "acceso-no-pasa-nada",
        pregunta: "Pongo mi email y no pasa nada.",
        respuesta:
          "Por seguridad siempre mostramos el mismo mensaje, exista o no el correo. Comprueba que sea el mismo email con el que estás dado de alta en la academia. Si no estás seguro, escríbenos.",
        claves: ["no pasa nada", "no responde", "email incorrecto", "no funciona"],
      },
      // --- Registro y prueba de nivel ---
      // Va en Acceso y no en su propia categoría: es la puerta de entrada,
      // y quien busca esto todavía no distingue "registro" de "acceso".
      {
        id: "acceso-despues-registro",
        pregunta: "¿Qué tengo que hacer después de registrarme?",
        respuesta:
          "Completar tu formulario de bienvenida y la prueba de nivel. Es rápido y nos permite conocer tu nivel y tus objetivos para asignarte el profesor que mejor encaje contigo. Hasta que no lo completes, no podemos asignarte clases.",
        claves: ["registro", "alta", "bienvenida", "formulario", "empezar"],
      },
      {
        id: "acceso-prueba-nivel",
        pregunta: "¿Para qué sirve la prueba de nivel?",
        respuesta:
          "Para ubicarte en el nivel correcto y que tus clases sean provechosas desde el primer día, ni demasiado fáciles ni demasiado difíciles.",
        claves: ["test", "nivel", "examen inicial", "prueba"],
      },
      {
        id: "acceso-formulario-a-medias",
        pregunta: "Empecé el formulario pero no lo terminé. ¿Puedo retomarlo?",
        respuesta:
          "Sí. Usa el mismo enlace que te enviamos por email. Si no lo encuentras, revisa spam o escríbenos.",
        claves: ["formulario", "retomar", "continuar", "a medias", "sin terminar"],
      },
    ],
  },
  {
    id: "curso",
    nombre: "El curso",
    preguntas: [
      {
        id: "curso-cual-me-toca",
        pregunta: "¿Qué curso me corresponde?",
        respuesta:
          "El curso general de tu nivel. Si estás preparando un examen (FCE, CAE, PET), tienes además el curso específico de ese examen.",
        claves: ["que curso", "cual", "fce", "cae", "pet", "first", "advanced", "examen"],
      },
      {
        id: "curso-leccion-bloqueada",
        pregunta: "¿Por qué no puedo abrir esta lección?",
        respuesta:
          "El curso se libera semana a semana a lo largo de seis meses. Es el ritmo con el que está diseñado: da tiempo a que cada bloque asiente antes de pasar al siguiente.",
        claves: ["bloqueada", "cerrada", "candado", "no puedo abrir", "no se abre"],
      },
      {
        id: "curso-disponible-en-dias",
        pregunta: "Dice «disponible en X días». ¿Desde cuándo se cuenta?",
        respuesta:
          "Desde que empezaste con la academia, no desde que entraste por primera vez a la plataforma.",
        claves: ["disponible en", "dias", "cuenta", "desbloquea", "cuando"],
      },
      {
        id: "curso-hecha-y-bloqueada",
        pregunta: "Ya había hecho esta lección y ahora aparece bloqueada.",
        respuesta:
          "No debería pasar: todo lo que hayas completado sigue abierto siempre. Si te ocurre, avísanos con el nombre de la lección.",
        claves: ["bloqueada", "completada", "hecha", "error", "otra vez"],
      },
      {
        id: "curso-adelantar",
        pregunta: "¿Puedo adelantar el curso si tengo tiempo?",
        respuesta:
          "El ritmo está pensado para que el aprendizaje se consolide. Si tienes un examen cerca o una situación concreta, coméntaselo a tu profesor.",
        claves: ["adelantar", "acelerar", "mas rapido", "saltar", "avanzar"],
      },
      {
        id: "curso-duracion",
        pregunta: "¿Cuánto dura el curso?",
        respuesta: "Seis meses de contenido, repartido en 23 semanas.",
        claves: ["duracion", "cuanto dura", "meses", "semanas", "largo"],
      },
      {
        id: "curso-plataforma-anterior",
        pregunta: "Hice contenido en la plataforma anterior. ¿Se ha perdido?",
        respuesta: "No. Tu progreso se conservó y lo verás reflejado al entrar.",
        claves: ["plataforma vieja", "anterior", "migracion", "perdido", "antiguo"],
      },
    ],
  },
  {
    id: "practica",
    nombre: "Tu práctica",
    preguntas: [
      {
        id: "practica-que-es",
        pregunta: "¿Qué es «tu práctica» y en qué se diferencia del curso?",
        respuesta:
          "El curso es el mismo para todos los alumnos de tu nivel. La práctica se genera solo para ti, a partir de lo que trabajaste en tu última clase y de lo que nos hayas contado sobre ti.",
        claves: ["diferencia", "que es", "personalizada", "para mi"],
      },
      {
        id: "practica-de-donde-salen",
        pregunta: "¿De dónde salen estos ejercicios?",
        respuesta:
          "De lo que tu profesor trabaja contigo en clase. Después de cada sesión queda registrado qué visteis y qué conviene reforzar, y de ahí salen.",
        claves: ["de donde", "ejercicios", "generados", "origen", "quien los hace"],
      },
      {
        id: "practica-otro-repaso",
        pregunta: "¿Por qué no puedo generar otro repaso hoy?",
        respuesta:
          "Porque hasta tu próxima clase no hay material nuevo del que partir. En cuanto tengas la siguiente, preparamos otro bloque.",
        claves: ["repaso", "generar", "otro", "bloqueado", "no puedo", "espera"],
      },
      {
        id: "practica-ingles-trabajo",
        pregunta: "¿Por qué no me aparece «inglés para tu trabajo»?",
        respuesta:
          "Esa práctica necesita que completes tu perfil: a qué te dedicas y qué quieres conseguir con el inglés. Con eso podemos crear ejercicios con tus situaciones reales.",
        claves: ["trabajo", "contexto", "perfil", "no aparece", "dia a dia"],
      },
      {
        id: "practica-duracion-bloque",
        pregunta: "¿Cuánto dura cada bloque de práctica?",
        respuesta:
          "Unos cinco minutos. Son cinco ejercicios que van de reconocer la forma correcta a producirla tú.",
        claves: ["cuanto dura", "tiempo", "minutos", "bloque", "largo"],
      },
      {
        id: "practica-ejercicio-mal",
        pregunta: "Creo que este ejercicio está mal.",
        respuesta: "Puedes marcarlo desde el propio ejercicio y lo revisamos.",
        claves: ["error", "mal", "incorrecto", "fallo", "equivocado", "reportar"],
      },
      {
        id: "practica-profesor-ve",
        pregunta: "¿Mi profesor ve lo que hago en la práctica?",
        respuesta:
          "Lo que escribes en la última parte de cada bloque está pensado para que tu profesor lo tenga en cuenta.",
        claves: ["profesor", "ve", "privacidad", "corrige", "revisa"],
      },
    ],
  },
  {
    id: "progreso",
    nombre: "Progreso",
    preguntas: [
      {
        id: "progreso-dispositivos",
        pregunta: "¿Se guarda mi progreso si cambio de dispositivo?",
        respuesta: "Sí. Tu progreso está asociado a tu cuenta, no al navegador.",
        claves: ["guardar", "dispositivo", "movil", "ordenador", "se pierde", "sincroniza"],
      },
      {
        id: "progreso-no-marcada",
        pregunta: "Completé una lección y no aparece marcada.",
        respuesta:
          "Recarga la página. Si sigue sin aparecer, avísanos con el nombre de la lección.",
        claves: ["completada", "no aparece", "marcada", "tilde", "no se guarda"],
      },
    ],
  },
  {
    id: "tecnico",
    nombre: "Problemas técnicos",
    preguntas: [
      {
        id: "tecnico-audio",
        pregunta: "El audio de la lección no suena.",
        respuesta:
          "Prueba a recargar la página y comprueba el volumen del reproductor. Si sigue sin funcionar, escríbenos indicando en qué lección estás.",
        claves: ["audio", "sonido", "no suena", "listening", "escuchar"],
      },
      {
        id: "tecnico-video",
        pregunta: "El vídeo no carga.",
        respuesta:
          "Suele ser un bloqueador de anuncios o una extensión del navegador. Prueba a desactivarlo para esta página o abrirla en otro navegador.",
        claves: ["video", "no carga", "negro", "youtube", "adblock", "bloqueador"],
      },
      {
        id: "tecnico-cargando",
        pregunta: "La página se queda cargando.",
        respuesta:
          "Recarga. Si el problema continúa, dinos desde qué dispositivo y navegador entras.",
        claves: ["cargando", "lento", "colgada", "no carga", "pantalla en blanco"],
      },
    ],
  },
  {
    id: "clases",
    nombre: "Clases y pagos",
    preguntas: [
      {
        id: "clases-como-son",
        pregunta: "¿Cómo son las clases?",
        respuesta:
          "Clases de inglés online, en directo, uno a uno con tu profesor por videollamada.",
        claves: ["clases", "online", "particular", "grupo", "como son"],
      },
      {
        id: "clases-como-entro",
        pregunta: "¿Cómo entro a mi clase?",
        respuesta:
          "A la hora de tu clase, con el enlace de videollamada que te haya facilitado tu profesor.",
        claves: ["entrar", "clase", "videollamada", "enlace", "zoom", "meet"],
      },
      {
        id: "clases-enfoque",
        pregunta: "¿Puedo decirle a mi profesor en qué quiero enfocarme?",
        respuesta:
          "Sí, y es muy recomendable. Cuéntale tu objetivo —trabajo, examen, conversación— y adaptará las clases.",
        claves: ["enfoque", "objetivo", "pedir", "temas", "adaptar"],
      },
      {
        id: "clases-videollamada-falla",
        pregunta: "No me funciona la videollamada.",
        respuesta:
          "Comprueba tu conexión y prueba a recargar el enlace. Si sigue sin funcionar, escríbenos enseguida para no perder la clase.",
        claves: ["videollamada", "no funciona", "camara", "microfono", "conexion"],
      },
      {
        id: "clases-cambiar",
        pregunta: "¿Puedo cambiar de horario o de profesor?",
        respuesta:
          "Escríbenos y vemos las opciones disponibles según la disponibilidad de horarios.",
        claves: ["cambiar", "horario", "profesor", "cancelar clase", "mover"],
      },
      // --- Suscripción ---
      {
        id: "clases-suscripcion-espera",
        pregunta: "Mi suscripción aparece «en espera». ¿Qué significa?",
        respuesta:
          "Suele deberse a un pago pendiente. Mientras esté en espera no podrás tomar clases. Revisa tu método de pago o escríbenos para regularizarlo.",
        claves: ["suscripcion", "en espera", "pago", "pendiente", "cobro", "tarjeta"],
      },
      {
        id: "clases-cancelar",
        pregunta: "¿Qué pasa si cancelo mi suscripción?",
        respuesta:
          "Puedes seguir dando tus clases hasta que termine el periodo que ya has pagado.",
        claves: ["cancelar", "baja", "suscripcion", "devolucion", "reembolso"],
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
// Sin índice, sin librería y sin modelo: son 35 preguntas y se recorren
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
 * lleve un "no" o un "me".
 */
const VACIAS = new Set([
  "a", "al", "algo", "como", "con", "cuando", "cual", "de", "del", "donde", "el", "ella", "en",
  "es", "esta", "este", "esto", "hay", "la", "las", "le", "lo", "los", "me", "mi", "no", "para",
  "pero", "por", "que", "qué", "se", "si", "sin", "sobre", "su", "tu", "un", "una", "y", "ya",
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
export function buscar(consulta: string, tope = 4): Resultado[] {
  const buscadas = palabras(consulta).filter((p) => !VACIAS.has(p) && p.length > 2);
  if (buscadas.length === 0) return [];

  const resultados: Resultado[] = [];

  for (const pregunta of PREGUNTAS) {
    const titulo = [...palabras(pregunta.pregunta), ...(pregunta.claves ?? []).flatMap(palabras)];
    const cuerpo = palabras(pregunta.respuesta);

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
// ---------------------------------------------------------------

export const WHATSAPP = "353899409220";

/** Cómo se llama cada pantalla cuando se la nombra en un mensaje. */
function nombreDePantalla(ruta: string): string {
  if (ruta === "/practica") return "mi práctica";
  if (ruta.startsWith("/alumno/")) return "mi inicio";
  if (/^\/curso\/[^/]+\/[^/]+/.test(ruta)) return "una lección del curso";
  if (ruta.startsWith("/curso/")) return "el temario del curso";
  return "la plataforma";
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
}: {
  nombre: string;
  ruta: string;
  asunto?: string;
}): string {
  const quien = nombre.trim() === "" ? "un alumno" : nombre.trim();

  const partes = [`Hola, soy ${quien}. Escribo desde ${nombreDePantalla(ruta)}.`];
  if (asunto && asunto.trim() !== "") partes.push(`Mi duda: «${asunto.trim()}».`);

  return `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(partes.join(" "))}`;
}
