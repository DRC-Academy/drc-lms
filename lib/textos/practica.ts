// ---------------------------------------------------------------
// "PARA TI": LA PRÁCTICA GENERADA
//
// La tarjeta que ofrece el bloque, lo que se cuenta mientras se prepara,
// la lista de los que ya hizo y la invitación a contarnos quién es.
//
// LAS FUENTES SE ENUMERAN Y ESO HAY QUE CONSERVARLO. La descripción del
// bloque nombra de qué está hecho para ESTE alumno —su clase, lo que se
// le repite, su día a día, su examen— y no dice "hecho para ti" en
// abstracto. Es lo que sostiene la promesa: si dijera lo mismo a todos,
// el que rellenó el formulario leería lo que lee el que no lo rellenó, y
// entonces rellenarlo no sirve de nada. La versión inglesa mantiene la
// enumeración, con su "and" delante del último.
//
// Y NO SE HABLA DE LO QUE EL ALUMNO NO PUEDE. Cuando toca esperar, el
// texto dice DE QUÉ DEPENDE —de su próxima clase— y nunca que no le
// dejamos. La espera es una consecuencia de cómo funciona el material,
// no una norma que se le impone; en inglés igual.
// ---------------------------------------------------------------

import type { Idioma } from "@/lib/idioma";

export type TextosPractica = {
  // --- las tres fases, como sello del bloque ---
  fases: string[];

  // --- la tarjeta que ofrece generar ---
  etiquetaHechoParaTi: string;
  tituloTarjeta: string;
  llamada: string;
  preparando: string;
  /** "Diez ejercicios con tu clase del 2 sep, lo que se te repite y tu día a día." */
  diezEjerciciosCon: (fuentes: string) => string;
  diezEjerciciosGenerico: string;
  nuevoTrasCadaClase: string;

  // --- cómo se nombra cada fuente ---
  fuenteClase: (fecha: string) => string;
  fuenteRepeticiones: string;
  fuenteContexto: string;
  fuenteExamen: (examen: string) => string;
  /** "a, b y c" / "a, b and c" */
  enumerar: (partes: string[]) => string;

  // --- cuando toca esperar ---
  esperaPrimeraClase: string;
  esperaProximaClase: string;
  notaSinClase: (profesor: string) => string;
  notaSinClaseSinProfesor: string;

  // --- el resumen de la última clase ---
  sinClaseTitulo: string;
  sinClaseCuerpo: string;
  yaLoHasPracticado: string;
  tienesClaseNueva: string;
  trabajoContigo: (profesor: string, titulo: string, fecha: string) => string;
  trabajaste: (titulo: string, fecha: string) => string;
  colaYaPracticado: string;
  colaClaseNueva: string;

  // --- mientras se genera ---
  etapaPreparando: string;
  etapaEscribiendo: string;
  etapaRevisando: string;
  etapaGuardando: string;
  etapaBanco: string;
  preparandoTuBloque: string;
  progresoPreparacion: string;
  seHaceDeRogar: string;
  sonDiezEjercicios: string;

  // --- cuando la generación no sale ---
  porAhoraYaEsta: string;
  estaVezNoHaSalido: string;
  volverAIntentarlo: string;
  errorGenerico: string;
  errorTardando: string;
  errorFormaInesperada: string;
  errorCortado: string;

  // --- la lista de bloques ---
  tuLeccionPersonalizada: string;
  tusBloques: string;
  pendiente: string;
  aquiApareceElQuePrepares: string;
  nuevo: string;
  empezar: string;
  yMasEn: (restantes: number) => string;
  todaviaNinguno: string;
  losHasHechoTodos: string;
  huecoPuedeGenerar: string;
  huecoSinPrimeraClase: string;
  huecoPreparaOtro: string;
  huecoEsperaSiguiente: string;

  // --- las paradas hechas ---
  paradasHechas: (n: number) => string;
  puedesRepetirCualquiera: string;
  deAciertos: string;
  repetir: string;

  // --- la invitación a completar el perfil ---
  empiezaPorAqui: string;
  cuentanosDeTi: string;
  cuentanosDeTiCuerpo: string;
  completarMiPerfil: string;
  lineaContexto: string;
  avisoFormularioTitulo: string;
  avisoFormularioCuerpo: (quien: string) => string;
  avisoFormularioEnviadoTitulo: string;
  avisoFormularioEnviadoCuerpo: (quien: string, fecha: string) => string;
  tuProfesor: string;
};

const ES: TextosPractica = {
  fases: ["Reconocer", "Transformar", "Producir"],

  etiquetaHechoParaTi: "Hecho para ti",
  tituloTarjeta: "Tu bloque de práctica",
  llamada: "Preparar mi bloque",
  preparando: "Preparando…",
  diezEjerciciosCon: (fuentes) => `Diez ejercicios con ${fuentes}.`,
  diezEjerciciosGenerico: "Diez ejercicios hechos con lo que sabemos de ti.",
  nuevoTrasCadaClase: "Nuevo tras cada clase",

  fuenteClase: (fecha) => `tu clase del ${fecha}`,
  fuenteRepeticiones: "lo que se te repite",
  fuenteContexto: "tu día a día",
  fuenteExamen: (examen) => `el formato del ${examen}`,
  enumerar: (partes) =>
    partes.length <= 1
      ? (partes[0] ?? "")
      : `${partes.slice(0, -1).join(", ")} y ${partes[partes.length - 1]}`,

  esperaPrimeraClase: "Después de tu primera clase",
  esperaProximaClase: "Después de tu próxima clase",
  notaSinClase: (profesor) =>
    `Ya tienes tu bloque con lo que sabemos de ti. En cuanto ${profesor} analice tu primera clase, preparamos el siguiente con lo que trabajéis.`,
  notaSinClaseSinProfesor:
    "Ya tienes tu bloque con lo que sabemos de ti. En cuanto se analice tu primera clase, preparamos el siguiente con lo que trabajéis.",

  sinClaseTitulo: "Todavía no hay clase que repasar",
  sinClaseCuerpo:
    "En cuanto tu profesor analice tu primera clase, preparamos aquí un bloque con lo que trabajasteis.",
  yaLoHasPracticado: "Ya lo has practicado",
  tienesClaseNueva: "Tienes clase nueva",
  trabajoContigo: (profesor, titulo, fecha) => `${profesor} trabajó contigo ${titulo} el ${fecha}.`,
  trabajaste: (titulo, fecha) => `Trabajaste ${titulo} el ${fecha}.`,
  colaYaPracticado: " En cuanto tengas la siguiente clase, preparamos el próximo bloque.",
  colaClaseNueva: " Ahí abajo puedes prepararte el bloque con lo que trabajasteis.",

  etapaPreparando: "Repasando tus clases y tu perfil…",
  etapaEscribiendo: "Escribiendo tus diez ejercicios…",
  etapaRevisando: "Revisando que todo esté bien…",
  etapaGuardando: "Guardando tu bloque…",
  etapaBanco: "Preparando un bloque de práctica…",
  preparandoTuBloque: "Preparando tu bloque",
  progresoPreparacion: "Progreso de la preparación",
  seHaceDeRogar: "Se está haciendo de rogar, pero seguimos en ello.",
  sonDiezEjercicios: "Son diez ejercicios, así que tarda un poco. Puedes quedarte aquí mientras.",

  porAhoraYaEsta: "Por ahora, ya está",
  estaVezNoHaSalido: "Esta vez no ha salido.",
  volverAIntentarlo: "Volver a intentarlo",
  errorGenerico: "A veces la conexión se hace la remolona. Vuelve a darle y lo preparamos.",
  errorTardando:
    "La preparación ha tardado más de lo que podemos esperar. Vuelve a darle y lo intentamos otra vez.",
  errorFormaInesperada: "El bloque recibido no tiene la forma esperada",
  errorCortado: "La preparación se ha cortado antes de terminar.",

  tuLeccionPersonalizada: "Tu lección personalizada",
  tusBloques: "Tus bloques",
  pendiente: "Pendiente",
  aquiApareceElQuePrepares: "Aquí aparece el que prepares, listo para empezarlo.",
  nuevo: "Nuevo",
  empezar: "Empezar",
  yMasEn: (restantes) => `y ${restantes} más en`,
  todaviaNinguno: "Todavía no has preparado ninguno",
  losHasHechoTodos: "Los has hecho todos",
  huecoPuedeGenerar:
    "Pulsa «Preparar mi bloque» y en menos de un minuto tienes diez ejercicios hechos con tu última clase, con lo que se te repite y con tu examen. Aparecerán aquí.",
  huecoSinPrimeraClase:
    "En cuanto tu profesor analice tu primera clase, preparamos aquí tu primer bloque de diez ejercicios.",
  huecoPreparaOtro:
    "Prepara otro cuando quieras: sale de tu última clase, de lo que se te repite y de tu examen.",
  huecoEsperaSiguiente: "En cuanto tengas tu próxima clase, aquí aparece el siguiente.",

  paradasHechas: (n) => `${n} ${n === 1 ? "parada hecha" : "paradas hechas"}`,
  puedesRepetirCualquiera: "Puedes repetir cualquiera",
  deAciertos: "de aciertos",
  repetir: "Repetir",

  empiezaPorAqui: "Empieza por aquí",
  cuentanosDeTi: "Cuéntanos un poco de ti",
  cuentanosDeTiCuerpo:
    "Con saber a qué te dedicas y qué quieres conseguir con el inglés, preparamos ejercicios con tus situaciones de verdad en lugar de frases de libro. Lo notas desde el primer bloque.",
  completarMiPerfil: "Completar mi perfil",
  lineaContexto:
    "¿Nos cuentas a qué te dedicas? Con eso ambientamos parte de tus ejercicios en tus situaciones del día a día.",
  avisoFormularioTitulo: "¿Nos cuentas a qué te dedicas?",
  avisoFormularioCuerpo: (quien) =>
    `${quien} te enviará por correo un formulario para conocerte mejor. Con eso preparamos también ejercicios con tus situaciones del día a día.`,
  avisoFormularioEnviadoTitulo: "Busca el formulario en tu correo",
  avisoFormularioEnviadoCuerpo: (quien, fecha) =>
    `${quien} te lo envió el ${fecha}. Si no lo encuentras o el enlace ya no funciona, pídeselo otra vez.`,
  tuProfesor: "Tu profesor",
};

const EN: TextosPractica = {
  fases: ["Recognise", "Transform", "Produce"],

  etiquetaHechoParaTi: "Made for you",
  tituloTarjeta: "Your practice block",
  llamada: "Build my block",
  preparando: "Building…",
  diezEjerciciosCon: (fuentes) => `Ten exercises built from ${fuentes}.`,
  diezEjerciciosGenerico: "Ten exercises built from what we know about you.",
  nuevoTrasCadaClase: "New after every class",

  fuenteClase: (fecha) => `your class on ${fecha}`,
  fuenteRepeticiones: "what keeps coming back",
  fuenteContexto: "your working day",
  fuenteExamen: (examen) => `the ${examen} format`,
  enumerar: (partes) =>
    partes.length <= 1
      ? (partes[0] ?? "")
      : `${partes.slice(0, -1).join(", ")} and ${partes[partes.length - 1]}`,

  esperaPrimeraClase: "After your first class",
  esperaProximaClase: "After your next class",
  notaSinClase: (profesor) =>
    `You already have your block, built from what we know about you. As soon as ${profesor} goes over your first class, we'll build the next one from that.`,
  notaSinClaseSinProfesor:
    "You already have your block, built from what we know about you. As soon as your first class is reviewed, we'll build the next one from that.",

  sinClaseTitulo: "No class to go over yet",
  sinClaseCuerpo:
    "As soon as your teacher reviews your first class, we'll build a block here from what you worked on.",
  yaLoHasPracticado: "You've practised this one",
  tienesClaseNueva: "You have a new class",
  trabajoContigo: (profesor, titulo, fecha) => `${profesor} worked on ${titulo} with you on ${fecha}.`,
  trabajaste: (titulo, fecha) => `You worked on ${titulo} on ${fecha}.`,
  colaYaPracticado: " Once you have your next class, we'll build the next block.",
  colaClaseNueva: " Down below you can build the block from what you worked on.",

  etapaPreparando: "Going over your classes and your profile…",
  etapaEscribiendo: "Writing your ten exercises…",
  etapaRevisando: "Checking everything is right…",
  etapaGuardando: "Saving your block…",
  etapaBanco: "Getting a practice block ready…",
  preparandoTuBloque: "Building your block",
  progresoPreparacion: "Progress so far",
  seHaceDeRogar: "It's taking its time, but we're still on it.",
  sonDiezEjercicios: "It's ten exercises, so it takes a moment. You can stay here while it works.",

  porAhoraYaEsta: "That's it for now",
  estaVezNoHaSalido: "That didn't work this time.",
  volverAIntentarlo: "Try again",
  errorGenerico: "The connection is being slow. Give it another go and we'll build it.",
  errorTardando: "It took longer than we can wait. Give it another go and we'll try again.",
  errorFormaInesperada: "The block that came back isn't the right shape",
  errorCortado: "The build was cut short before it finished.",

  tuLeccionPersonalizada: "Your personal lesson",
  tusBloques: "Your blocks",
  pendiente: "Waiting for you",
  aquiApareceElQuePrepares: "The one you build shows up here, ready to start.",
  nuevo: "New",
  empezar: "Start",
  yMasEn: (restantes) => `and ${restantes} more in`,
  todaviaNinguno: "You haven't built one yet",
  losHasHechoTodos: "You've done them all",
  huecoPuedeGenerar:
    "Press «Build my block» and in under a minute you'll have ten exercises built from your last class, from what keeps coming back and from your exam. They'll show up here.",
  huecoSinPrimeraClase:
    "As soon as your teacher reviews your first class, we'll build your first block of ten exercises here.",
  huecoPreparaOtro:
    "Build another whenever you like: it comes from your last class, from what keeps coming back and from your exam.",
  huecoEsperaSiguiente: "Once you have your next class, the next one shows up here.",

  paradasHechas: (n) => `${n} ${n === 1 ? "stop done" : "stops done"}`,
  puedesRepetirCualquiera: "You can redo any of them",
  deAciertos: "correct",
  repetir: "Redo",

  empiezaPorAqui: "Start here",
  cuentanosDeTi: "Tell us a bit about you",
  cuentanosDeTiCuerpo:
    "If we know what you do and what you want English for, we can build exercises around your real situations instead of textbook sentences. You'll notice it from the first block.",
  completarMiPerfil: "Complete my profile",
  lineaContexto:
    "Want to tell us what you do? We'll set some of your exercises in your own day-to-day situations.",
  avisoFormularioTitulo: "Want to tell us what you do?",
  avisoFormularioCuerpo: (quien) =>
    `${quien} will email you a short form so we can get to know you. With that we can also build exercises around your day-to-day situations.`,
  avisoFormularioEnviadoTitulo: "Look for the form in your email",
  avisoFormularioEnviadoCuerpo: (quien, fecha) =>
    `${quien} sent it to you on ${fecha}. If you can't find it or the link no longer works, ask for it again.`,
  tuProfesor: "Your teacher",
};

export const PRACTICA: Record<Idioma, TextosPractica> = { en: EN, es: ES };
