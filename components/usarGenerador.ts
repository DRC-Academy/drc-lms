"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import type { Bloque } from "@/lib/data";
import type { ModoGeneracion } from "@/lib/modos";
import { validarBloque } from "@/lib/validarBloque";
import type { EstadoGeneracion } from "@/components/TarjetasGeneracion";

/**
 * La generación de bloques, compartida por el inicio y por /practica.
 *
 * Las dos pantallas ofrecen las tarjetas de generación, así que la
 * lógica vive aquí en vez de duplicada: si algún día cambia el contrato
 * con `app/api/generar-bloque`, cambia en un sitio.
 *
 * Cada pantalla tiene su propia instancia y su propio estado. No hace
 * falta compartirlo: al navegar de una a otra, el servidor devuelve los
 * bloques ya guardados y `generadosIniciales` los trae de vuelta.
 */
export function usarGenerador({
  alumnoId,
  bloques,
  generadosIniciales,
}: {
  alumnoId: string;
  bloques: Bloque[];
  generadosIniciales: Bloque[];
}) {
  const [estado, setEstado] = useState<EstadoGeneracion>("listo");
  const [modoActivo, setModoActivo] = useState<ModoGeneracion | null>(null);

  /**
   * Los generados en esta misma visita. Se guardan en la base desde la
   * ruta de generación, pero el servidor no vuelve a consultarse hasta
   * la siguiente navegación: hasta entonces viven aquí para que el
   * bloque aparezca en la lista en el acto.
   */
  const [generadosNuevos, setGeneradosNuevos] = useState<Bloque[]>([]);

  const zonaNuevos = useRef<HTMLDivElement | null>(null);

  /**
   * La lista del servidor manda. Lo generado ahora se antepone solo
   * mientras el servidor no lo devuelva ya: en cuanto la pantalla se
   * recarga, el duplicado desaparece solo.
   */
  const generados = useMemo(() => {
    const yaEstan = new Set(generadosIniciales.map((b) => b.id));
    return [...generadosNuevos.filter((b) => !yaEstan.has(b.id)), ...generadosIniciales];
  }, [generadosNuevos, generadosIniciales]);

  // Los generados van primero: son la novedad de la semana.
  const todos = useMemo(() => [...generados, ...bloques], [generados, bloques]);
  const idsGenerados = useMemo(() => generados.map((b) => b.id), [generados]);

  const generar = useCallback(
    async (modo: ModoGeneracion) => {
      setEstado("generando");
      setModoActivo(modo);
      try {
        const respuesta = await fetch("/api/generar-bloque", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ alumnoId, modo, excluir: todos.map((b) => b.titulo) }),
        });

        if (!respuesta.ok) throw new Error(`La API respondió ${respuesta.status}`);

        const cuerpo: unknown = await respuesta.json();
        const bloque = validarBloque(
          typeof cuerpo === "object" && cuerpo !== null
            ? (cuerpo as { bloque?: unknown }).bloque
            : null
        );
        if (!bloque) throw new Error("El bloque recibido no tiene la forma esperada");

        // No se guarda desde aquí: lo hace `app/api/generar-bloque` antes
        // de responder. Esto solo lo pone en pantalla.
        setGeneradosNuevos((previos) => [bloque, ...previos]);
        setEstado("listo");
        setModoActivo(null);

        window.requestAnimationFrame(() => {
          zonaNuevos.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        });
      } catch (error) {
        console.error("[practica] No se pudo generar el bloque:", error);
        setEstado("error");
        setModoActivo(null);
      }
    },
    [alumnoId, todos]
  );

  return {
    estado,
    modoActivo,
    generando: estado === "generando",
    generados,
    todos,
    idsGenerados,
    generar,
    zonaNuevos,
  };
}
