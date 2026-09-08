"use client";

import { useEffect, useRef, useState } from "react";
import type { Bloque } from "@/lib/data";
import { idiomaDe, type IdiomaBloque, type TraduccionBloque } from "@/lib/traduccion-bloque";

/**
 * LA OTRA VERSIÓN DEL BLOQUE, PEDIDA CUANDO HACE FALTA.
 *
 * El bloque llega escrito en un idioma. Si el alumno pide el otro, esto
 * va a por él una vez, y el endpoint lo deja guardado: la segunda
 * pulsación —y la de cualquier otro alumno en un bloque del catálogo— ya
 * no llama al modelo.
 *
 * LA REGLA ES "CUANDO EL IDIOMA PEDIDO NO ES EL DEL BLOQUE", no "cuando
 * se pulsa el botón". Casi siempre es lo mismo, pero no del todo: el
 * alumno que ya eligió español y abre un bloque escrito en inglés lo
 * pide al abrirlo, sin pulsar nada. Y así tiene que ser — el idioma es
 * una preferencia suya, no algo que haya que volver a pedir en cada
 * bloque—; lo mismo pasa al revés con los bloques antiguos, que están
 * en español y se abren con la preferencia en inglés.
 *
 * Lo que NO se hace nunca es traducir por adelantado lo que nadie ha
 * abierto: eso sería pagar por bloques que no se van a mirar. Y meterlo
 * en la generación no cabía en el reloj (ver la nota de
 * `app/api/traducir-bloque/route.ts`).
 *
 * MIENTRAS LLEGA, EL BOTÓN YA HA CAMBIADO EL MUEBLE. Es a propósito: el
 * mueble no necesita a nadie —sus dos idiomas están en el código— así
 * que la pantalla responde al instante y lo único que espera es el
 * contenido. Un botón que no hace nada durante tres segundos se pulsa
 * dos veces.
 *
 * Y SI FALLA, NO PASA NADA GRAVE: el alumno se queda con el mueble en su
 * idioma y el ejercicio en el original, que es exactamente donde estaba
 * antes de pulsar. Se avisa en pequeño y se puede reintentar volviendo y
 * pulsando otra vez.
 */
export function usarTraduccion(
  bloque: Bloque,
  idiomaPedido: IdiomaBloque,
  /**
   * De quién es la ficha que se está viendo. El endpoint solo lo mira
   * cuando quien pide es del equipo —al alumno le saca el suyo de la
   * cookie— pero se manda siempre porque desde aquí no se sabe cuál de
   * los dos casos es, y mandarlo de más no abre nada.
   */
  alumnoId: string
): {
  traduccion: TraduccionBloque | null;
  pidiendo: boolean;
  fallo: boolean;
} {
  const origen = idiomaDe(bloque);
  const [traduccion, setTraduccion] = useState<TraduccionBloque | null>(null);
  const [pidiendo, setPidiendo] = useState(false);
  const [fallo, setFallo] = useState(false);

  // Que ya se pidió para este bloque. En una ref y no en el estado
  // porque no pinta nada: solo evita que el efecto vuelva a disparar.
  const pedido = useRef(false);

  const haceFalta = idiomaPedido !== origen && traduccion === null;

  useEffect(() => {
    // Al volver al idioma en el que está escrito el bloque se limpia la
    // marca. Eso es lo que convierte "volver y pulsar otra vez" en un
    // reintento, sin necesidad de un botón de reintentar aparte.
    if (idiomaPedido === origen) {
      pedido.current = false;
      if (fallo) setFallo(false);
      return;
    }

    if (!haceFalta || pedido.current) return;
    pedido.current = true;

    let vivo = true;
    setPidiendo(true);
    setFallo(false);

    fetch("/api/traducir-bloque", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ bloqueId: bloque.id, alumnoId }),
    })
      .then(async (respuesta) => {
        if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`);
        return (await respuesta.json()) as { traduccion?: TraduccionBloque };
      })
      .then((datos) => {
        if (!vivo) return;
        if (!datos.traduccion) throw new Error("respuesta sin traducción");
        setTraduccion(datos.traduccion);
      })
      .catch((error) => {
        if (!vivo) return;
        console.error("[practica] No se pudo traducir el bloque:", error);
        setFallo(true);
      })
      .finally(() => {
        if (vivo) setPidiendo(false);
      });

    return () => {
      vivo = false;
    };
  }, [haceFalta, idiomaPedido, origen, bloque.id, alumnoId, fallo]);

  return { traduccion, pidiendo, fallo };
}
