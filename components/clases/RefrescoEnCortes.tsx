"use client";

// ---------------------------------------------------------------
// VOLVER A PREGUNTAR AL SERVIDOR EN LOS CORTES DE LA VENTANA
//
// Si el botón está cerrado es el SERVIDOR quien lo ha decidido, con su
// hora, y quien ha dejado el enlace fuera del HTML. Una página que se
// queda abierta no se entera sola de que ya son las 16:30: este
// componente programa un `router.refresh()` para el instante en que se
// abre la sala y otro para el instante en que termina la clase, y el
// servidor vuelve a calcularlo todo.
//
// EL NAVEGADOR NO DECIDE NADA. No compara horas ni pinta el botón: solo
// sabe cuándo volver a preguntar. Si su reloj va mal, pregunta antes o
// después, y el servidor contesta la verdad igual.
// ---------------------------------------------------------------

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Lo máximo que acepta `setTimeout` (≈24,8 días). Más allá se desborda y dispara al instante. */
const TOPE = 2_147_483_647;

/**
 * Margen tras el corte. El servidor decide con `>=` al milisegundo; llegar
 * un pelín tarde garantiza que, cuando conteste, el corte ya ha pasado.
 */
const MARGEN = 1_000;

export default function RefrescoEnCortes({ cortes }: { cortes: number[] }) {
  const router = useRouter();

  useEffect(() => {
    const ahora = Date.now();
    const temporizadores = cortes
      .map((corte) => corte - ahora + MARGEN)
      .filter((espera) => espera > 0 && espera < TOPE)
      .map((espera) => window.setTimeout(() => router.refresh(), espera));
    return () => temporizadores.forEach((id) => window.clearTimeout(id));
  }, [cortes, router]);

  return null;
}
