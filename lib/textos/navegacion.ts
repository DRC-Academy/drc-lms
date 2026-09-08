// ---------------------------------------------------------------
// LA CABECERA Y EL BOTÓN DE IDIOMA
//
// Lo que se ve en TODAS las pantallas. Es el área más pequeña del
// diccionario y la que más se lee.
//
// LAS CUATRO SECCIONES SE TRADUCEN, y eso cambia una decisión anterior:
// mientras la aplicación era española y solo los ejercicios tenían dos
// idiomas, la salida del visor decía "Back to Para ti" porque "Para ti"
// era el nombre que el alumno iba a encontrarse al llegar. Ahora que la
// cabecera también cambia de idioma, el destino se llama "For you" de
// verdad y la salida puede nombrarlo traducido.
//
// "FOR YOU" Y NO "PRACTICE", igual que en español. Lo que la distingue
// del curso no es que se practique —en el curso también— sino que está
// hecha con lo que sabemos de este alumno y de nadie más.
//
// Y CABEN EN LA BARRA DE MÓVIL. A 320px cada celda mide 77,5px, así que
// una etiqueta no pasa de unos 12 caracteres a 12px sin tocar a la de al
// lado: "My progress" son 11 y "My course" 9. Es el mismo límite que ya
// tenía el español y por eso no cambian las medidas de la barra.
//
// LA TIRA DE REVISIÓN TAMBIÉN ESTÁ AQUÍ aunque la lea el equipo, y no es
// una excepción a que el panel se quede en español: sale dentro de las
// pantallas del ALUMNO, encima de su curso y de su práctica, así que
// tiene que hablar el idioma de lo que envuelve.
// ---------------------------------------------------------------

import type { Idioma } from "@/lib/idioma";

export type TextosNavegacion = {
  // --- las cuatro secciones ---
  inicio: string;
  miCurso: string;
  paraTi: string;
  miProgreso: string;
  /** El `aria-label` de las dos barras, la de arriba y la de móvil. */
  secciones: string;

  // --- identidad ---
  salir: string;
  practicandoComo: (nombre: string) => string;
  fichaEnRevision: (nombre: string) => string;

  // --- el botón de idioma ---
  /** Nombra el idioma AL QUE LLEVA, no el que se está leyendo. */
  otroIdioma: string;
  otroIdiomaAria: string;

  // --- la tira de revisión del equipo ---
  revisandoLaFichaDe: (nombre: string) => string;
  revisandoUnaFicha: string;
  nadaSeGuarda: string;
  salirDeLaRevision: string;

  // --- el progreso del curso en la cabecera ---
  progresoEnCurso: (titulo: string, hechas: number, total: number) => string;
};

const ES: TextosNavegacion = {
  inicio: "Inicio",
  miCurso: "Mi curso",
  paraTi: "Para ti",
  miProgreso: "Mi progreso",
  secciones: "Secciones",

  salir: "Salir",
  practicandoComo: (nombre) => `Practicando como ${nombre}`,
  fichaEnRevision: (nombre) => `Ficha de ${nombre}, en revisión`,

  otroIdioma: "English",
  otroIdiomaAria: "See the site in English",

  revisandoLaFichaDe: (nombre) => `Revisando la ficha de ${nombre}`,
  revisandoUnaFicha: "Revisando una ficha",
  nadaSeGuarda: "· Nada de lo que hagas aquí se guarda.",
  salirDeLaRevision: "Salir de la revisión",

  progresoEnCurso: (titulo, hechas, total) =>
    `Progreso en ${titulo}: ${hechas} de ${total} ${total === 1 ? "lección" : "lecciones"}`,
};

const EN: TextosNavegacion = {
  inicio: "Home",
  miCurso: "My course",
  paraTi: "For you",
  miProgreso: "My progress",
  secciones: "Sections",

  salir: "Log out",
  practicandoComo: (nombre) => `Practising as ${nombre}`,
  fichaEnRevision: (nombre) => `${nombre}'s profile, under review`,

  otroIdioma: "Español",
  otroIdiomaAria: "Ver el sitio en español",

  revisandoLaFichaDe: (nombre) => `Reviewing ${nombre}'s profile`,
  revisandoUnaFicha: "Reviewing a profile",
  nadaSeGuarda: "· Nothing you do here is saved.",
  salirDeLaRevision: "Leave review",

  progresoEnCurso: (titulo, hechas, total) =>
    `Progress in ${titulo}: ${hechas} of ${total} ${total === 1 ? "lesson" : "lessons"}`,
};

export const NAVEGACION: Record<Idioma, TextosNavegacion> = { en: EN, es: ES };
