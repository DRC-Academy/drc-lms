"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Bloque } from "@/lib/data";
import { validarBloque } from "@/lib/validarBloque";
import type { EstadoGeneracion } from "@/components/TarjetasGeneracion";
import {
  calcularProgreso,
  leerEvento,
  TIPO_FLUJO,
  UMBRAL_TARDANZA_MS,
  type EtapaGeneracion,
} from "@/lib/generacion";

/**
 * Un poco por encima del `maxDuration` de `app/api/generar-bloque`, que
 * son 60 segundos. Así gana siempre el error del servidor —que sabe qué
 * pasó— y este solo actúa cuando la respuesta no llega en absoluto.
 */
const TIEMPO_MAXIMO_MS = 70_000;

/**
 * Cada cuánto se repinta la barra. A 250ms el avance se ve continuo sin
 * que el componente se renderice cuatro veces por segundo de más.
 */
const CADENCIA_MS = 250;

const MENSAJE_GENERICO = "A veces la conexión se hace la remolona. Vuelve a darle y lo preparamos.";

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
 *
 * SOBRE LA ESPERA. La ruta responde en NDJSON y va diciendo por dónde
 * va. Aquí se traduce a dos cosas: la etapa, que solo cambia cuando el
 * servidor lo dice, y la barra, que además avanza con el reloj para que
 * no se quede congelada durante los cincuenta segundos que tarda el
 * modelo. La etapa nunca se adivina; la barra nunca llega al 100% sin
 * bloque.
 *
 * UN SOLO BOTÓN. `generar()` ya no recibe modo, porque ya no hay tres:
 * el bloque combina la última clase, los patrones de las anteriores, el
 * perfil y el examen dentro de un mismo prompt. Lo que se ha ido con el
 * modo es `modoActivo`, que solo servía para saber cuál de las tres
 * tarjetas tenía que girar.
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
  const [etapa, setEtapa] = useState<EtapaGeneracion>("preparando");
  const [progreso, setProgreso] = useState(0);
  const [tardando, setTardando] = useState(false);
  const [mensajeError, setMensajeError] = useState(MENSAJE_GENERICO);
  /** El "error" es en realidad un "todavía no toca": se cuenta distinto. */
  const [esEspera, setEsEspera] = useState(false);

  /**
   * Los generados en esta misma visita. Se guardan en la base desde la
   * ruta de generación, pero el servidor no vuelve a consultarse hasta
   * la siguiente navegación: hasta entonces viven aquí para que el
   * bloque aparezca en la lista en el acto.
   */
  const [generadosNuevos, setGeneradosNuevos] = useState<Bloque[]>([]);

  const zonaNuevos = useRef<HTMLDivElement | null>(null);

  // En refs y no en estado: los lee el intervalo de la barra, que no
  // debe reiniciarse cada vez que cambia la etapa.
  const arranque = useRef(0);
  const etapaViva = useRef<EtapaGeneracion>("preparando");

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

  // ---------------------------------------------------------------
  // EL RELOJ DE LA BARRA
  //
  // Solo aporta movimiento continuo. Los saltos verificados los da el
  // servidor al cambiar `etapaViva`; aquí únicamente se deja correr el
  // tiempo contra el presupuesto real, que son 52 segundos.
  // ---------------------------------------------------------------
  useEffect(() => {
    if (estado !== "generando") return;

    const tic = setInterval(() => {
      const transcurrido = Date.now() - arranque.current;
      setProgreso((previo) => calcularProgreso(etapaViva.current, transcurrido, previo));
      setTardando(transcurrido > UMBRAL_TARDANZA_MS);
    }, CADENCIA_MS);

    return () => clearInterval(tic);
  }, [estado]);

  /** Una etapa confirmada por el servidor: texto nuevo y empujón a la barra. */
  const anotarEtapa = useCallback((nueva: EtapaGeneracion) => {
    etapaViva.current = nueva;
    setEtapa(nueva);
    setProgreso((previo) => calcularProgreso(nueva, Date.now() - arranque.current, previo));
  }, []);

  const generar = useCallback(async () => {
    arranque.current = Date.now();
    etapaViva.current = "preparando";

    setEstado("generando");
    setEsEspera(false);
    setEtapa("preparando");
    setProgreso(0);
    setTardando(false);

    try {
      // Segundo cinturón, por encima del presupuesto del servidor. La
      // ruta se corta sola bastante antes, pero si la respuesta se
      // pierde por el camino —un proxy, la red del alumno— sin esto el
      // spinner se queda girando para siempre. Un mensaje de error es
      // peor que un bloque y muchísimo mejor que una espera sin fin.
      const respuesta = await fetch("/api/generar-bloque", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ alumnoId, excluir: todos.map((b) => b.titulo) }),
        signal: AbortSignal.timeout(TIEMPO_MAXIMO_MS),
      });

      // Los fallos que la ruta detecta antes de empezar a generar
      // llegan como JSON con su código y su explicación. Esa
      // explicación es mejor que cualquier texto genérico nuestro:
      // sabe si caducó la sesión o si falta la ficha.
      if (!respuesta.ok) {
        throw await mensajeDeFallo(respuesta);
      }

      const bloque = respuesta.headers.get("content-type")?.includes(TIPO_FLUJO)
        ? await leerFlujo(respuesta, anotarEtapa)
        : await leerRespuestaUnica(respuesta);

      // No se guarda desde aquí: lo hace `app/api/generar-bloque` antes
      // de responder. Esto solo lo pone en pantalla.
      setProgreso(100);
      setGeneradosNuevos((previos) => [bloque, ...previos]);
      setEstado("listo");

      window.requestAnimationFrame(() => {
        zonaNuevos.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    } catch (error) {
      console.error("[practica] No se pudo generar el bloque:", error);
      setEsEspera(error instanceof ErrorDeEspera);
      setMensajeError(
        error instanceof DOMException && error.name === "TimeoutError"
          ? "La preparación ha tardado más de lo que podemos esperar. Vuelve a darle y lo intentamos otra vez."
          : error instanceof Error && error.message
            ? error.message
            : MENSAJE_GENERICO
      );
      setEstado("error");
    }
  }, [alumnoId, todos, anotarEtapa]);

  return {
    estado,
    generando: estado === "generando",
    etapa,
    progreso,
    tardando,
    mensajeError,
    esEspera,
    /** Reintentar es volver a pulsar: ya no hay modo que recordar. */
    reintentar: generar,
    /**
     * Solo los de esta visita, el más reciente primero.
     *
     * Es lo que pinta el inicio: la lista completa vive en `/practica` y
     * repetirla entera aquí sería tener la misma pantalla dos veces. Al
     * volver a entrar esto vuelve a estar vacío, y es lo correcto —
     * entonces ya no son la novedad de hace un momento, son su práctica.
     */
    recienGenerados: generadosNuevos,
    generados,
    todos,
    idsGenerados,
    generar,
    zonaNuevos,
  };
}

// ---------------------------------------------------------------
// LECTURA DE LA RESPUESTA
// ---------------------------------------------------------------

/**
 * No es un fallo: es que ese modo todavía no toca.
 *
 * Se distingue del resto porque se cuenta distinto —sin "no ha salido" y
 * sin botón de reintentar, que volvería a dar lo mismo—. Se llega aquí
 * con una pestaña que lleva horas abierta, con las tarjetas de entonces.
 */
class ErrorDeEspera extends Error {}

/** El texto que explica un fallo previo a la generación, si lo hay. */
async function mensajeDeFallo(respuesta: Response): Promise<Error> {
  let mensaje = MENSAJE_GENERICO;
  let esEspera = false;

  try {
    const cuerpo: unknown = await respuesta.json();
    if (typeof cuerpo === "object" && cuerpo !== null) {
      const dicho = (cuerpo as { error?: unknown }).error;
      if (typeof dicho === "string" && dicho.trim() !== "") mensaje = dicho;
      // La ruta marca las esperas con `motivo`; el resto de 409 no lo llevan.
      esEspera = typeof (cuerpo as { motivo?: unknown }).motivo === "string";
    }
  } catch {
    // Un cuerpo que no es JSON no aporta nada: se usa el genérico.
  }

  return esEspera ? new ErrorDeEspera(mensaje) : new Error(mensaje);
}

/**
 * Consume el NDJSON línea a línea. Las etapas se van anotando según
 * llegan; el bloque cierra el flujo.
 */
async function leerFlujo(
  respuesta: Response,
  anotarEtapa: (etapa: EtapaGeneracion) => void
): Promise<Bloque> {
  if (!respuesta.body) throw new Error(MENSAJE_GENERICO);

  const lector = respuesta.body.getReader();
  const decodificador = new TextDecoder();
  let resto = "";
  let bloque: Bloque | null = null;

  try {
    for (;;) {
      const { done, value } = await lector.read();
      if (done) break;

      resto += decodificador.decode(value, { stream: true });

      // La última pieza puede ser media línea: se queda para la vuelta
      // siguiente en vez de intentar interpretarla partida.
      const lineas = resto.split("\n");
      resto = lineas.pop() ?? "";

      for (const linea of lineas) {
        if (linea.trim() === "") continue;

        const evento = leerEvento(linea);
        if (!evento) continue;

        if (evento.tipo === "etapa") {
          anotarEtapa(evento.etapa);
        } else if (evento.tipo === "error") {
          throw new Error(evento.mensaje);
        } else {
          const validado = validarBloque(evento.bloque);
          if (!validado) throw new Error("El bloque recibido no tiene la forma esperada");
          bloque = validado;
        }
      }
    }
  } finally {
    lector.releaseLock();
  }

  // Sin bloque y sin error explícito: el flujo se cortó por el camino.
  if (!bloque) throw new Error("La preparación se ha cortado antes de terminar.");
  return bloque;
}

/**
 * La respuesta de una sola pieza, que es lo que devolvía la ruta antes.
 *
 * Se mantiene por el rato del despliegue: mientras Vercel sirve las dos
 * versiones a la vez, un navegador con el JavaScript nuevo puede llegar
 * a una instancia con la ruta vieja. Sin esto, ese alumno vería un error
 * durante los pocos minutos que dura el cambio.
 */
async function leerRespuestaUnica(respuesta: Response): Promise<Bloque> {
  const cuerpo: unknown = await respuesta.json();
  const bloque = validarBloque(
    typeof cuerpo === "object" && cuerpo !== null ? (cuerpo as { bloque?: unknown }).bloque : null
  );
  if (!bloque) throw new Error("El bloque recibido no tiene la forma esperada");
  return bloque;
}
