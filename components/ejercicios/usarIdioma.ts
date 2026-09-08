"use client";

import { useCallback, useEffect, useState } from "react";
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
 * `localStorage` y no la ficha del alumno, de momento. Es una
 * preferencia de lectura y no un dato de su expediente: no hay nada que
 * el equipo tenga que ver en el panel, ni nada que se rompa si se pierde
 * al cambiar de navegador — se pierde, se vuelve a pulsar y ya está. El
 * día que la 5 traiga las dos versiones del bloque, si hace falta que
 * viaje entre dispositivos, sube a la ficha sin que esto cambie de
 * forma.
 *
 * ARRANCA SIEMPRE EN EL DEFECTO Y CORRIGE DESPUÉS. El servidor no puede
 * leer `localStorage`, así que si el primer render mirara ahí, el HTML
 * del servidor y el del navegador no coincidirían y React tiraría la
 * hidratación entera. Por eso la lectura va en un efecto: quien haya
 * elegido español ve un parpadeo de un frame la primera vez que entra, y
 * ese parpadeo es más barato que cualquiera de las alternativas.
 */

const CLAVE = "drc.idioma-ejercicios";

function esIdioma(valor: string | null): valor is Idioma {
  return valor === "en" || valor === "es";
}

export function usarIdioma(): {
  idioma: Idioma;
  /** El paquete de textos ya resuelto. Es lo que usan los componentes. */
  t: Textos;
  /** Al otro idioma, y lo deja guardado. */
  alternar: () => void;
} {
  const [idioma, setIdioma] = useState<Idioma>(IDIOMA_POR_DEFECTO);

  useEffect(() => {
    try {
      const guardado = window.localStorage.getItem(CLAVE);
      if (esIdioma(guardado)) setIdioma(guardado);
    } catch {
      // Navegación privada, o almacenamiento bloqueado. Se queda con el
      // defecto: no poder recordar la preferencia no puede impedir que
      // el alumno haga el ejercicio.
    }
  }, []);

  const alternar = useCallback(() => {
    setIdioma((actual) => {
      const nuevo = elOtro(actual);
      try {
        window.localStorage.setItem(CLAVE, nuevo);
      } catch {
        // Igual que arriba: el cambio vale para esta sesión aunque no se
        // pueda guardar.
      }
      return nuevo;
    });
  }, []);

  return { idioma, t: textos(idioma), alternar };
}
