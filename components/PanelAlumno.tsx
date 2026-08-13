"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import type { Bloque } from "@/lib/data";
import type { TarjetaModo } from "@/lib/modos";
import {
  borrarProgresoLocal,
  hayProgresoLocal,
  recogerProgresoLocal,
} from "@/lib/migracion-local";
import { usarGenerador } from "@/components/usarGenerador";
import TarjetasPractica from "@/components/TarjetasPractica";

/**
 * La parte del inicio que necesita ser cliente: las tarjetas de
 * generación y la migración del progreso que quedó en el navegador.
 *
 * El saludo, el banner del curso, la tira de estadísticas y la
 * invitación al perfil los pinta el servidor desde
 * `app/alumno/[id]/page.tsx`, y la lista de bloques vive en `/practica`.
 */
export default function PanelAlumno({
  alumnoId,
  profesor,
  tarjetas,
  bloques,
  generadosIniciales,
  esAdministrador,
}: {
  alumnoId: string;
  /** Nombre del profesor para el subtítulo. Vacío si no hay perfil. */
  profesor: string;
  tarjetas: TarjetaModo[];
  bloques: Bloque[];
  generadosIniciales: Bloque[];
  /** Solo cambia lo que se pinta; lo que protege está en los guards. */
  esAdministrador: boolean;
}) {
  const router = useRouter();
  const { estado, modoActivo, etapa, progreso, tardando, mensajeError, generar, reintentar } =
    usarGenerador({
      alumnoId,
      bloques,
      generadosIniciales,
    });

  /**
   * MIGRACIÓN DEL PROGRESO QUE QUEDÓ EN EL NAVEGADOR
   *
   * Una sola vez, la primera visita después del cambio a base de datos.
   * El localStorage se borra solo cuando el servidor confirma el volcado.
   *
   * LA SALVAGUARDA: nada de esto puede dejar a nadie fuera ni enseñar un
   * error. Si falla, el alumno se queda con lo que haya en la base —que
   * puede ser nada— y se reintenta en la siguiente visita, porque las
   * claves locales siguen ahí. Por eso no hay estado de carga ni aviso.
   *
   * Vive en el inicio y no en /practica porque es la pantalla a la que
   * se llega al entrar.
   */
  const migracionLanzada = useRef(false);

  useEffect(() => {
    if (migracionLanzada.current || esAdministrador) return;
    if (!hayProgresoLocal()) return;

    migracionLanzada.current = true;
    const datos = recogerProgresoLocal(alumnoId);

    // Había claves, pero nada de este alumno: es un navegador compartido,
    // o progreso de otra ficha. Se limpian y ya está.
    if (!datos.progreso.length && !datos.avance.length && !datos.bloques.length) {
      borrarProgresoLocal();
      return;
    }

    void (async () => {
      try {
        const respuesta = await fetch("/api/migrar-local", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(datos),
        });
        if (!respuesta.ok) throw new Error(`La API respondió ${respuesta.status}`);

        const cuerpo: unknown = await respuesta.json();
        const migrado =
          typeof cuerpo === "object" &&
          cuerpo !== null &&
          (cuerpo as { migrado?: unknown }).migrado === true;

        if (!migrado) return;

        borrarProgresoLocal();
        // Vuelve a pedir la ficha: el progreso ya está en la base y esta
        // pantalla todavía enseña el estado de antes.
        router.refresh();
      } catch (error) {
        console.error("[panel] No se pudo migrar el progreso local:", error);
        // A propósito: no se borra nada y no se avisa. Se reintenta solo.
      }
    })();
  }, [alumnoId, esAdministrador, router]);

  return (
    <TarjetasPractica
      tarjetas={tarjetas}
      profesor={profesor}
      estado={estado}
      modoActivo={modoActivo}
      etapa={etapa}
      progreso={progreso}
      tardando={tardando}
      mensajeError={mensajeError}
      onGenerar={generar}
      onReintentar={reintentar}
    />
  );
}
