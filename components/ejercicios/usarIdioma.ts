"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import {
  IDIOMA_POR_DEFECTO,
  elOtro,
  textos,
  type Idioma,
  type Textos,
} from "@/lib/textos-ejercicios";

/**
 * EL IDIOMA DE LA PANTALLA DE EJERCICIOS.
 *
 * LA ELECCIÓN ES DEL ALUMNO, NO DEL BLOQUE. Se guarda una vez y vale
 * para todos los ejercicios que haga después, los del curso y los de su
 * práctica. Un botón que hubiera que volver a pulsar en cada bloque no
 * es una preferencia, es un peaje: diez bloques son diez pulsaciones
 * para pedir lo mismo que ya pidió la primera vez.
 *
 * `localStorage` y no la ficha del alumno. Es una preferencia de lectura
 * y no un dato de su expediente: no hay nada que el equipo tenga que ver
 * en el panel, ni nada que se rompa si se pierde al cambiar de
 * navegador — se pierde, se vuelve a pulsar y ya está.
 *
 * ---------------------------------------------------------------
 * POR QUÉ ES UN STORE Y NO UN `useState` DENTRO DEL VISOR
 *
 * Empezó siéndolo, cuando lo único que cambiaba de idioma era el mueble
 * y todo el mueble se pintaba dentro del visor. Dejó de bastar en cuanto
 * el CONTENIDO del bloque también cambió de idioma: quien decide qué
 * versión del bloque se construye es `components/Practica.tsx`, que está
 * por ENCIMA del visor y no puede leerle el estado.
 *
 * Con dos `useState` —uno arriba y otro dentro— habría dos idiomas que
 * casi siempre coinciden, y el "casi" es exactamente el fallo que nadie
 * reproduce: pulsar el botón cambiaría los botones y dejaría el
 * ejercicio en el idioma de antes. Un store lo hace imposible por
 * construcción: hay un solo valor y todos los que lo leen se enteran a
 * la vez.
 *
 * ARRANCA EN EL DEFECTO Y CORRIGE DESPUÉS. El servidor no puede leer
 * `localStorage`, así que si la primera instantánea mirara ahí, el HTML
 * del servidor y el del navegador no coincidirían y React tiraría la
 * hidratación entera. Por eso `instantaneaServidor` devuelve el defecto
 * y la lectura de verdad va en un efecto: quien haya elegido español ve
 * un parpadeo de un frame la primera vez, y ese parpadeo es más barato
 * que cualquiera de las alternativas.
 * ---------------------------------------------------------------
 */

const CLAVE = "drc.idioma-ejercicios";

function esIdioma(valor: string | null): valor is Idioma {
  return valor === "en" || valor === "es";
}

let idiomaActual: Idioma = IDIOMA_POR_DEFECTO;
let hidratado = false;
const oyentes = new Set<() => void>();

function suscribir(oyente: () => void): () => void {
  oyentes.add(oyente);
  return () => {
    oyentes.delete(oyente);
  };
}

function instantanea(): Idioma {
  return idiomaActual;
}

function instantaneaServidor(): Idioma {
  return IDIOMA_POR_DEFECTO;
}

function fijar(nuevo: Idioma): void {
  if (nuevo === idiomaActual) return;
  idiomaActual = nuevo;
  oyentes.forEach((oyente) => oyente());
}

export function usarIdioma(): {
  idioma: Idioma;
  /** El paquete de textos ya resuelto. Es lo que usan los componentes. */
  t: Textos;
  /** Al otro idioma, y lo deja guardado. */
  alternar: () => void;
} {
  const idioma = useSyncExternalStore(suscribir, instantanea, instantaneaServidor);

  // Una sola vez por carga de página, no una por componente que llame al
  // hook: la bandera vive fuera del componente igual que el valor.
  useEffect(() => {
    if (hidratado) return;
    hidratado = true;
    try {
      const guardado = window.localStorage.getItem(CLAVE);
      if (esIdioma(guardado)) fijar(guardado);
    } catch {
      // Navegación privada, o almacenamiento bloqueado. Se queda con el
      // defecto: no poder recordar la preferencia no puede impedir que
      // el alumno haga el ejercicio.
    }
  }, []);

  const alternar = useCallback(() => {
    const nuevo = elOtro(idiomaActual);
    try {
      window.localStorage.setItem(CLAVE, nuevo);
    } catch {
      // Igual que arriba: el cambio vale para esta sesión aunque no se
      // pueda guardar.
    }
    fijar(nuevo);
  }, []);

  return { idioma, t: textos(idioma), alternar };
}
