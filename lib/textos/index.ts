// ---------------------------------------------------------------
// EL DICCIONARIO
//
// Todo lo que el ALUMNO lee, en los dos idiomas, repartido por áreas.
//
// ---------------------------------------------------------------
// QUÉ NO ESTÁ AQUÍ, Y POR QUÉ
//
//   EL PANEL DEL EQUIPO — se queda en español. Lo usa DRC, que es
//   hispanohablante: traducirlo es coste sin lector. `components/admin/`,
//   el inicio del equipo y las fichas no pasan por aquí.
//
//   LA FAQ (`lib/faq.ts`) — 35 preguntas de política. Traducirlas es
//   mantenerlas en dos idiomas para siempre, y una respuesta
//   desactualizada en inglés hace más daño que no tenerla. El MUEBLE del
//   chat de ayuda sí está aquí; las respuestas no.
//
//   LOS CORREOS — los manda un cron sin navegador delante, así que no
//   pueden leer la cookie. Para que siguieran la preferencia habría que
//   guardarla también en la ficha del alumno, y eso es otro trabajo.
//
// ---------------------------------------------------------------
// POR QUÉ NO HAY `next-intl` NI NADA PARECIDO
//
// Porque no hace falta rutas por idioma. Un diccionario de verdad trae
// segmentos de ruta (`/en/curso`, `/es/curso`), negociación por
// cabecera y carga perezosa de mensajes; nada de eso resuelve un
// problema que tengamos, y todo eso obligaría a mover las rutas, los
// enlaces y el middleware.
//
// Aquí el idioma es UNA PREFERENCIA DEL ALUMNO, no una dimensión de la
// URL: el mismo alumno, la misma ruta, otro idioma. Con eso, un objeto
// por área y una cookie hacen exactamente el mismo trabajo, y se leen.
//
// LAS FUNCIONES SON LA PARTE QUE IMPORTA. Casi la mitad de las cadenas
// llevan un número o un nombre dentro, y eso cambia la gramática: "3
// lecciones" contra "3 lessons", "el hueco" contra "los tres huecos".
// Con plantillas sueltas y un `${n}` interpolado en el sitio donde se
// pinta, cada plural habría que resolverlo allí, que es exactamente cómo
// se cuelan los "1 lecciones".
// ---------------------------------------------------------------

import type { Idioma } from "@/lib/idioma";
import { EJERCICIOS, type TextosEjercicios } from "@/lib/textos/ejercicios";
import { NAVEGACION, type TextosNavegacion } from "@/lib/textos/navegacion";
import { ENTRADA, type TextosEntrada } from "@/lib/textos/entrada";
import { PRACTICA, type TextosPractica } from "@/lib/textos/practica";
import { CURSO, type TextosCurso } from "@/lib/textos/curso";
import { PROGRESO, type TextosProgreso } from "@/lib/textos/progreso";
import { RUTA, type TextosRuta } from "@/lib/textos/ruta";
import { BANNERS, type TextosBanners } from "@/lib/textos/banners";

export type Textos = {
  ejercicios: TextosEjercicios;
  navegacion: TextosNavegacion;
  entrada: TextosEntrada;
  practica: TextosPractica;
  curso: TextosCurso;
  progreso: TextosProgreso;
  ruta: TextosRuta;
  banners: TextosBanners;
};

export const TEXTOS: Record<Idioma, Textos> = {
  en: {
    ejercicios: EJERCICIOS.en,
    navegacion: NAVEGACION.en,
    entrada: ENTRADA.en,
    practica: PRACTICA.en,
    curso: CURSO.en,
    progreso: PROGRESO.en,
    ruta: RUTA.en,
    banners: BANNERS.en,
  },
  es: {
    ejercicios: EJERCICIOS.es,
    navegacion: NAVEGACION.es,
    entrada: ENTRADA.es,
    practica: PRACTICA.es,
    curso: CURSO.es,
    progreso: PROGRESO.es,
    ruta: RUTA.es,
    banners: BANNERS.es,
  },
};
