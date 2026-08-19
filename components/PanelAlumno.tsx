"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";
import type { Bloque } from "@/lib/data";
import type { TarjetaPractica } from "@/lib/modos";
import {
  borrarProgresoLocal,
  hayProgresoLocal,
  recogerProgresoLocal,
} from "@/lib/migracion-local";
import { usarGenerador } from "@/components/usarGenerador";
import TarjetaGeneracion from "@/components/TarjetaGeneracion";
import BloquesGenerados from "@/components/BloquesGenerados";

/**
 * El cuerpo del inicio: la rejilla de dos columnas y lo que va debajo.
 *
 * ES CLIENTE PORQUE LA GENERACIÓN LO ES, pero la franja del curso no
 * tiene por qué serlo: entra por `banner` ya renderizada en el servidor.
 * Es lo que permite que siga siendo un componente de servidor y a la vez
 * comparta fila con una tarjeta que necesita estado.
 *
 * LA REJILLA VIVE AQUÍ y no en la página por una razón práctica: la
 * columna derecha y la sección de abajo comparten el mismo estado de
 * generación —el bloque que aparece abajo es el que produce el botón de
 * arriba—, y partirlas entre dos componentes obligaría a subir ese
 * estado a la página, que es de servidor.
 */
export default function PanelAlumno({
  alumnoId,
  tarjeta,
  bloques,
  generadosIniciales,
  idsTerminados,
  esAdministrador,
  banner,
}: {
  alumnoId: string;
  /** La tarjeta de generación, o null si no hay de dónde tirar. */
  tarjeta: TarjetaPractica | null;
  bloques: Bloque[];
  generadosIniciales: Bloque[];
  /** Bloques que ya ha cerrado: dejan de salir en el inicio. */
  idsTerminados: string[];
  /** Solo cambia lo que se pinta; lo que protege está en los guards. */
  esAdministrador: boolean;
  /** La franja del curso, renderizada en el servidor. */
  banner: ReactNode;
}) {
  const router = useRouter();
  const {
    estado,
    generando,
    etapa,
    progreso,
    tardando,
    mensajeError,
    esEspera,
    recienGenerados,
    generados,
    todos,
    generar,
    reintentar,
    zonaNuevos,
  } = usarGenerador({ alumnoId, bloques, generadosIniciales });

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

  // Sin tarjeta que ofrecer, la columna derecha desaparece y la franja
  // pasa a ancho completo. Es el mismo criterio que tenía la invitación
  // al perfil cuando vivía en ese hueco.
  const conColumna = tarjeta !== null;

  return (
    <>
      <div
        className={`grid items-start gap-3 lg:gap-5 ${
          conColumna ? "lg:grid-cols-[minmax(0,1fr)_416px]" : "lg:grid-cols-1"
        }`}
      >
        {/* IZQUIERDA: el curso. El diploma tuvo aquí una fila fina hasta
            que pasó a ser la barra fija de la cabecera, que lo enseña en
            todas las pantallas en vez de solo en esta. */}
        <div className="flex flex-col gap-3">{banner}</div>

        {conColumna && (
          <TarjetaGeneracion
            tarjeta={tarjeta}
            estado={estado}
            etapa={etapa}
            progreso={progreso}
            tardando={tardando}
            mensajeError={mensajeError}
            esEspera={esEspera}
            onGenerar={generar}
            onReintentar={reintentar}
          />
        )}
      </div>

      <div className="mt-[26px] lg:mt-9">
        <BloquesGenerados
          bloques={generados}
          idsNuevos={recienGenerados.map((bloque) => bloque.id)}
          idsTerminados={idsTerminados}
          alumnoId={alumnoId}
          generando={generando}
          // El botón de arriba se puede pulsar: decide si el hueco vacío
          // lo señala o cuenta de qué depende.
          puedeGenerar={tarjeta !== null && tarjeta.espera === null}
          totalPractica={todos.length}
          zonaRef={zonaNuevos}
        />
      </div>
    </>
  );
}
