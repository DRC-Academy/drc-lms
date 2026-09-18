"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { AnimatePresence, motion, type TargetAndTransition, type Transition } from "framer-motion";
import layoutJson from "@/components/mascota/layout.json";
import {
  CARA,
  DURACION_ESTADO_MS,
  OJOS_QUE_PARPADEAN,
  type Adorno,
  type EstadoMascota,
} from "@/components/mascota/estados";

export type { EstadoMascota } from "@/components/mascota/estados";
export { ESTADOS_MASCOTA } from "@/components/mascota/estados";

/**
 * GECKONOID, LA MASCOTA, ANIMADA EN CÓDIGO.
 *
 *   <Geckonoid estado="idle" size={240} />
 *
 * Arma el personaje apilando las piezas PNG de public/mascota/ —los
 * renders recortados de mascota/rive/— en el sitio que dice
 * layout.json, y las mueve con Framer Motion. Cada pieza es una imagen
 * posicionada en absoluto dentro de un lienzo cuadrado de `size`
 * píxeles, con su `transform-origin` en el pivote de la pieza: el hombro
 * en los brazos, la cadera en las piernas, la base en la cola, el cuello
 * en la cabeza. Así una rotación gira desde donde giraría de verdad.
 *
 * EL ESTADO ES DE FUERA Y EL TIEMPO ES DE AQUÍ. Quien usa el componente
 * dice qué ha pasado —`estado="exito"`— y el componente enseña la cara y
 * el gesto de eso durante DURACION_ESTADO_MS, y vuelve solo a idle. Para
 * lanzar dos veces el mismo estado seguido hay que cambiar `disparo`,
 * que es lo que hace `useMascota().dispara`.
 *
 * LAS CAPAS, de atrás adelante: cola, pierna izquierda, pierna derecha,
 * torso, brazo izquierdo, brazo derecho, cabeza, ojos, boca, adornos.
 * Izquierda y derecha son desde quien mira.
 */

type Pieza = {
  x: number;
  y: number;
  ancho: number;
  alto: number;
  pivote: { x: number; y: number; nombre: string };
  reemplaza?: string;
};

const LAYOUT = layoutJson as { lienzo: number; capas: string[]; piezas: Record<string, Pieza> };

/** La ruta pública de una pieza. */
const src = (nombre: string) => `/mascota/${nombre}.png`;

const SUAVE: Transition = { duration: 0.15, ease: "easeOut" };
const MUELLE: Transition = { type: "spring", stiffness: 220, damping: 16 };
/** La respiración: torso y cabeza a la vez. */
const RESPIRAR: Transition = { duration: 3, repeat: Infinity, ease: "easeInOut" };

export default function Geckonoid({
  estado = "idle",
  disparo = 0,
  size = 240,
  volverAIdle = true,
  onIdle,
  className = "",
  etiqueta = "Geckonoid",
}: {
  estado?: EstadoMascota;
  /** Cambia para relanzar el mismo estado. Lo lleva `useMascota`. */
  disparo?: number;
  /** El lado del lienzo cuadrado, en píxeles. */
  size?: number;
  /** Volver solo a idle a los 2,5 s. */
  volverAIdle?: boolean;
  onIdle?: () => void;
  className?: string;
  /** Para el lector de pantalla: qué es esto. */
  etiqueta?: string;
}) {
  // El estado que se enseña. Sigue a la prop y, si toca, vuelve a idle.
  const [vivo, setVivo] = useState<EstadoMascota>(estado);

  useEffect(() => {
    setVivo(estado);
    if (estado === "idle" || !volverAIdle) return;
    const reloj = setTimeout(() => {
      setVivo("idle");
      onIdle?.();
    }, DURACION_ESTADO_MS);
    return () => clearTimeout(reloj);
    // `onIdle` fuera a propósito: se escribe en línea y cambiaría en cada
    // render, y eso reiniciaría el reloj del estado.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estado, disparo, volverAIdle]);

  // El parpadeo: cada 3–5 segundos, y solo con los ojos abiertos.
  const cara = CARA[vivo];
  const parpadea = OJOS_QUE_PARPADEAN.includes(cara.ojos);
  const [cerrando, setCerrando] = useState(false);

  useEffect(() => {
    if (!parpadea) return;
    let reloj: ReturnType<typeof setTimeout>;
    let abrir: ReturnType<typeof setTimeout>;
    const programar = () => {
      reloj = setTimeout(() => {
        setCerrando(true);
        abrir = setTimeout(() => {
          setCerrando(false);
          programar();
        }, 160);
      }, 3000 + Math.random() * 2000);
    };
    programar();
    return () => {
      clearTimeout(reloj);
      clearTimeout(abrir);
    };
  }, [parpadea]);

  // Las piezas que no están puestas se precargan igual: al cambiar de
  // cara no hay que esperar a que llegue la imagen.
  useEffect(() => {
    for (const nombre of LAYOUT.capas) {
      const imagen = new Image();
      imagen.src = src(nombre);
    }
  }, []);

  // Los desplazamientos en píxeles del guion —el salto de 30, la cabeza
  // que baja 15— están pensados para 240px: se escalan con el tamaño.
  const u = size / 240;

  /**
   * La caja de una pieza, en píxeles del lienzo. Con `dentroDe`, relativa
   * a la caja de esa otra pieza: es como van los ojos, la boca y los
   * adornos dentro del grupo de la cabeza, para moverse con ella.
   */
  const caja = (nombre: string, dentroDe?: string): CSSProperties & { originX: number; originY: number } => {
    const p = LAYOUT.piezas[nombre];
    const base = dentroDe ? LAYOUT.piezas[dentroDe] : { x: 0, y: 0 };
    return {
      position: "absolute",
      left: (p.x - base.x) * size,
      top: (p.y - base.y) * size,
      width: p.ancho * size,
      height: p.alto * size,
      originX: p.pivote.x,
      originY: p.pivote.y,
    };
  };

  // ------------------------------ EL GUION ------------------------------
  const esExito = vivo === "exito";
  const esNivel = vivo === "nivel_superado";

  const cuerpo: TargetAndTransition = {
    y: esExito ? [0, -30 * u, 0] : 0,
    transition: { y: esExito ? { duration: 0.6, times: [0, 0.4, 1], ease: ["easeOut", "easeIn"] } : SUAVE },
  };

  const cabeza: TargetAndTransition = {
    scale: [1, 1.02, 1],
    rotate: vivo === "duda" ? 8 : vivo === "racha_perdida" ? -6 : 0,
    y: vivo === "racha_perdida" ? 15 * u : 0,
    transition: { scale: RESPIRAR, rotate: MUELLE, y: MUELLE },
  };

  const torso: TargetAndTransition = { scale: [1, 1.02, 1], transition: { scale: RESPIRAR } };

  const cola: TargetAndTransition = {
    rotate: [-6, 6, -6],
    transition: { rotate: { duration: 2.5, repeat: Infinity, ease: "easeInOut" } },
  };

  // Los brazos suben al celebrar: el izquierdo gira en el sentido del
  // reloj y el derecho al contrario, que es lo que separa las manos del
  // cuerpo cuando el pivote está en el hombro.
  const brazoIzq: TargetAndTransition = {
    rotate: esExito ? 70 : esNivel ? 35 : 0,
    transition: { rotate: MUELLE },
  };
  const brazoDer: TargetAndTransition = {
    rotate: esExito ? -70 : 0,
    transition: { rotate: MUELLE, opacity: SUAVE },
  };

  const ojos: TargetAndTransition = {
    scaleY: cerrando ? 0.1 : 1,
    transition: { scaleY: { duration: 0.075, ease: "easeInOut" }, opacity: SUAVE },
  };

  return (
    <div
      role="img"
      aria-label={`${etiqueta} · ${vivo}`}
      className={`relative select-none ${className}`}
      style={{ width: size, height: size }}
    >
      <motion.div className="absolute inset-0" animate={cuerpo}>
        <Capa nombre="cola" caja={caja} animate={cola} />
        <Capa nombre="pierna_izq" caja={caja} />
        <Capa nombre="pierna_der" caja={caja} />
        <Capa nombre="torso" caja={caja} animate={torso} />
        <Capa nombre="brazo_izq" caja={caja} animate={brazoIzq} />

        {/* EL BRAZO DERECHO SE SUSTITUYE ENTERO en «ánimo» y en «nivel
            superado»: el pulgar y el diploma son otro render del brazo.
            Entran girando desde abajo, desde el mismo hombro. */}
        <AnimatePresence initial={false}>
          <motion.img
            key={cara.brazoDer}
            src={src(cara.brazoDer)}
            alt=""
            draggable={false}
            style={caja(cara.brazoDer)}
            initial={cara.brazoDer === "brazo_der" ? { opacity: 0 } : { opacity: 0, rotate: 60 }}
            animate={
              cara.brazoDer === "brazo_der"
                ? { opacity: 1, ...brazoDer }
                : { opacity: 1, rotate: 0, transition: { rotate: MUELLE, opacity: SUAVE } }
            }
            exit={{ opacity: 0, transition: SUAVE }}
          />
        </AnimatePresence>

        {/* LA CABEZA ES UN GRUPO: la pieza, y dentro los ojos, la boca y
            los adornos, colocados respecto a su caja. Así la inclinación
            de «duda» y la caída de «racha perdida» se llevan la cara
            entera, y las estrellas y el signo giran con ella. */}
        <motion.div style={caja("cabeza")} animate={cabeza}>
          <motion.img src={src("cabeza")} alt="" draggable={false} className="absolute inset-0 h-full w-full" />

          {/* Los ojos y la boca cambian con la cara, con un fundido corto.
              El parpadeo cierra los ojos en vertical desde su centro. */}
          <AnimatePresence initial={false}>
            <motion.img
              key={cara.ojos}
              src={src(cara.ojos)}
              alt=""
              draggable={false}
              style={caja(cara.ojos, "cabeza")}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, ...ojos }}
              exit={{ opacity: 0, transition: SUAVE }}
            />
          </AnimatePresence>
          <AnimatePresence initial={false}>
            <motion.img
              key={cara.boca}
              src={src(cara.boca)}
              alt=""
              draggable={false}
              style={caja(cara.boca, "cabeza")}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1, transition: { opacity: SUAVE, scale: MUELLE } }}
              exit={{ opacity: 0, transition: SUAVE }}
            />
          </AnimatePresence>

          {/* Los adornos, cada uno con su entrada. */}
          <AnimatePresence>
            {cara.adornos.map((adorno) => (
              <motion.img
                key={adorno}
                src={src(adorno)}
                alt=""
                draggable={false}
                style={caja(adorno, "cabeza")}
                {...ADORNOS[adorno](u)}
              />
            ))}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </div>
  );
}

/** Una pieza fija: siempre puesta, con su animación si la tiene. */
function Capa({
  nombre,
  caja,
  animate,
}: {
  nombre: string;
  caja: (nombre: string) => CSSProperties & { originX: number; originY: number };
  animate?: TargetAndTransition;
}) {
  return <motion.img src={src(nombre)} alt="" draggable={false} style={caja(nombre)} animate={animate} />;
}

/**
 * Cómo entra, cómo está y cómo se va cada adorno. Reciben `u` porque los
 * desplazamientos en píxeles se escalan con el tamaño de la mascota.
 */
const ADORNOS: Record<
  Adorno,
  (u: number) => { initial: TargetAndTransition; animate: TargetAndTransition; exit: TargetAndTransition }
> = {
  // Los anteojos se ponen y ya está.
  anteojos: () => ({
    initial: { opacity: 0, y: -6 },
    animate: { opacity: 1, y: 0, transition: SUAVE },
    exit: { opacity: 0, transition: SUAVE },
  }),
  // Las estrellas aparecen creciendo y se quedan girando despacio.
  estrellas: () => ({
    initial: { opacity: 0, scale: 0 },
    animate: {
      opacity: 1,
      scale: 1,
      rotate: [0, 6, -6, 0],
      transition: {
        opacity: SUAVE,
        scale: MUELLE,
        rotate: { duration: 4, repeat: Infinity, ease: "easeInOut" },
      },
    },
    exit: { opacity: 0, scale: 0, transition: SUAVE },
  }),
  // El signo rebota desde su base.
  signo: () => ({
    initial: { opacity: 0, scale: 0 },
    animate: {
      opacity: 1,
      scale: [0, 1.25, 1],
      transition: { opacity: SUAVE, scale: { duration: 0.45, times: [0, 0.6, 1], ease: "easeOut" } },
    },
    exit: { opacity: 0, scale: 0, transition: SUAVE },
  }),
  // La gotita cae desde el ojo y se desvanece, y vuelve a caer mientras dure la pena.
  gotita: (u) => ({
    initial: { opacity: 0, y: 0 },
    animate: {
      opacity: [0, 1, 1, 0],
      y: [0, 2 * u, 26 * u, 40 * u],
      transition: { duration: 1.4, times: [0, 0.15, 0.75, 1], repeat: Infinity, repeatDelay: 0.3, ease: "easeIn" },
    },
    exit: { opacity: 0, transition: SUAVE },
  }),
};
