// ---------------------------------------------------------------
// EL RECORRIDO GUIADO: LOS PASOS
//
// La ÚNICA definición del tutorial. El motor
// (`components/tutorial/Tutorial.tsx`) los recorre en orden; ningún
// componente define pasos por su cuenta. Se usa en dos sitios: el
// onboarding, que se lanza solo la primera vez en el inicio, y el botón
// «Ver el recorrido» de la Ayuda. Es el mismo recorrido.
//
// CADA PASO SEÑALA UN ELEMENTO por su `data-tour`, nunca por clases ni
// por la estructura del DOM: así un rediseño no rompe el tutorial sin
// avisar. Si el elemento no está —alumno sin curso, sin clase—, se prueba
// la alternativa; si tampoco, el paso se salta. El motor no espera más de
// unos segundos a ningún elemento.
//
// EL TONO es el de la mascota (lib/textos/mascota.ts): español de España,
// tuteo, cálido y corto, sin género gramatical referido al alumno, sin
// «racha», sin celebración al acabar y sin nada que suene a vigilancia.
//
// NINGÚN PASO DICE HACIA DÓNDE SEÑALA LA MASCOTA. El motor le pide que
// señale el elemento del paso y `calcularPoseMascota`
// (components/mascota/pose.ts) decide si a la izquierda, a la derecha o
// nada. `gesto` es solo lo que hace al llegar y no señala (saludar).
//
// LOS PASOS PUENTE NO SE ESCRIBEN AQUÍ: los genera `conPuentes` en cada
// cambio de pantalla entre dos pasos seguidos. Ver más abajo.
// ---------------------------------------------------------------

import type { EstadoMascota } from "@/components/mascota/estados";
import type { GestoLibre } from "@/components/mascota/store";
import type { Idioma } from "@/lib/idioma";

/** Dónde vive un paso. `null`: en cualquier pantalla del alumno. */
export type RutaTutorial = "inicio" | "clases" | "practica" | null;

export type TextoTutorial = Record<Idioma, string>;

/** Una forma de señalar: el elemento y lo que se dice de él. */
export type SenalTutorial = {
  /** Siempre `[data-tour="…"]`. */
  selector: string;
  texto: TextoTutorial;
  /**
   * Textos según el `data-tour-estado` del elemento, cuando dice más de
   * una cosa (el botón de entrar a clase: abierto, cerrado, sin enlace).
   */
  porEstado?: Record<string, TextoTutorial>;
};

export type PasoTutorial = SenalTutorial & {
  id: string;
  ruta: RutaTutorial;
  /**
   * Lo que hace la mascota al llegar EN VEZ DE SEÑALAR (saludar al
   * empezar y al despedirse). Null: señala el elemento, si la pose lo
   * permite.
   */
  gesto: GestoLibre | null;
  /** Su estado mientras está en el paso. */
  estado: EstadoMascota;
  /** Si no está el elemento principal, esto; si tampoco, el paso se salta. */
  alternativa?: SenalTutorial;
};

const tour = (id: string) => `[data-tour="${id}"]`;

export const PASOS_TUTORIAL: readonly PasoTutorial[] = [
  {
    id: "bienvenida",
    ruta: "inicio",
    selector: tour("saludo"),
    gesto: "saludo",
    estado: "idle",
    texto: {
      es: "Te doy la bienvenida a DRC Práctica. En un minuto te enseño dónde está cada cosa.",
      en: "Welcome to DRC Práctica. In a minute I'll show you where everything is.",
    },
  },
  {
    id: "curso",
    ruta: "inicio",
    selector: tour("curso"),
    gesto: null,
    estado: "idle",
    texto: {
      es: "Aquí sigue tu curso, justo donde lo dejaste.",
      en: "Your course is here, right where you left off.",
    },
  },
  {
    id: "proxima-clase",
    ruta: "clases",
    selector: tour("proxima-clase"),
    gesto: null,
    estado: "idle",
    texto: {
      es: "Aquí tienes tu próxima clase: el día, la hora y con quién.",
      en: "Here's your next class: the day, the time and who with.",
    },
    alternativa: {
      selector: tour("clases-vacio"),
      texto: {
        es: "Cuando fijes tu horario con tu profesor, tus clases aparecerán aquí.",
        en: "Once you set your schedule with your teacher, your classes will show up here.",
      },
    },
  },
  {
    id: "unirse",
    ruta: "clases",
    selector: tour("unirse"),
    gesto: null,
    estado: "idle",
    texto: {
      es: "Media hora antes de la clase, este botón se activa y te lleva a la videollamada.",
      en: "Half an hour before class, this button turns on and takes you to the video call.",
    },
    porEstado: {
      abierta: {
        es: "Tu clase ya está abierta: pulsa aquí para entrar a la videollamada.",
        en: "Your class is open: tap here to join the video call.",
      },
      "sin-enlace": {
        es: "Aquí aparecerá el botón para entrar a tu clase. Si no lo ves cerca de la hora, pídele el enlace a tu profesor.",
        en: "The button to join your class will appear here. If you don't see it near the time, ask your teacher for the link.",
      },
    },
  },
  {
    id: "ruta",
    ruta: "practica",
    selector: tour("ruta"),
    gesto: null,
    estado: "animo",
    texto: {
      es: "Después de cada clase te preparo ejercicios con lo que visteis. Aquí los tienes, uno detrás de otro.",
      en: "After each class I prepare exercises with what you covered. Here they are, one after another.",
    },
    porEstado: {
      vacia: {
        es: "Después de cada clase te preparo ejercicios con lo que visteis. Irán apareciendo aquí, uno detrás de otro.",
        en: "After each class I prepare exercises with what you covered. They'll show up here, one after another.",
      },
    },
  },
  {
    id: "navegacion",
    ruta: null,
    selector: tour("navegacion"),
    gesto: "saludo",
    estado: "idle",
    texto: {
      es: "Desde aquí llegas a todo: tus clases, tu práctica y tu progreso. Si te surge una duda, estoy en Ayuda, y desde allí puedes volver a ver este recorrido.",
      en: "From here you can reach everything: your classes, your practice and your progress. If you have a question, I'm in Help, and you can replay this tour from there.",
    },
  },
];

// ---------------------------------------------------------------
// LOS PASOS PUENTE
//
// Cuando el recorrido pasa a otra pantalla, antes de irse enseña CÓMO se
// llega: se queda en la pantalla en la que está y destaca el botón de la
// navegación que lleva a la siguiente. Al pulsar «Siguiente» —o el propio
// botón— navega.
//
// Se generan aquí, de la lista de arriba: uno por cada par de pasos
// seguidos con pantallas distintas. El primer paso no genera ninguno: si
// el recorrido se lanza desde otra pantalla, el salto al inicio es el
// arranque, no un camino que enseñar. Tampoco «Atrás» los recorre (ver
// el motor).
//
// El botón se busca por `data-tour-nav`, que llevan los enlaces de la
// barra lateral y de las pestañas de abajo: el motor coge el que se vea.
// ---------------------------------------------------------------

export type DestinoTutorial = Exclude<RutaTutorial, null>;

export type PasoRecorrido = PasoTutorial & {
  /** Solo en los puentes: la pantalla a la que lleva el botón. */
  puente?: DestinoTutorial;
};

const TEXTO_PUENTE: Record<DestinoTutorial, TextoTutorial> = {
  inicio: {
    es: "Para volver al inicio, pulsa aquí.",
    en: "To go back to your home screen, use this button.",
  },
  clases: {
    es: "Para ir a tus clases, pulsa aquí.",
    en: "To go to your classes, use this button.",
  },
  practica: {
    es: "Tus ejercicios están en «Para ti». Para ir, pulsa aquí.",
    en: "Your exercises are in \"For you\". To get there, use this button.",
  },
};

export const selectorNav = (destino: DestinoTutorial) => `[data-tour-nav="${destino}"]`;

export function conPuentes(pasos: readonly PasoTutorial[]): PasoRecorrido[] {
  const salida: PasoRecorrido[] = [];
  pasos.forEach((paso, i) => {
    const anterior = pasos[i - 1];
    if (anterior && paso.ruta !== null && paso.ruta !== anterior.ruta) {
      salida.push({
        id: `puente-${paso.id}`,
        ruta: anterior.ruta,
        selector: selectorNav(paso.ruta),
        texto: TEXTO_PUENTE[paso.ruta],
        gesto: null,
        estado: "idle",
        puente: paso.ruta,
      });
    }
    salida.push(paso);
  });
  return salida;
}

/** Lo que recorre el motor: los pasos de arriba con sus puentes. */
export const PASOS_RECORRIDO: readonly PasoRecorrido[] = conPuentes(PASOS_TUTORIAL);
