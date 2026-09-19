"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { AnimatePresence, motion, useAnimate, type AnimationOptions, type DOMKeyframesDefinition, type Transition } from "framer-motion";
import parchesJson from "@/components/mascota/parches.json";
import { DURACION_ESTADO_MS, type EstadoMascota } from "@/components/mascota/estados";

export type { EstadoMascota } from "@/components/mascota/estados";
export { ESTADOS_MASCOTA } from "@/components/mascota/estados";

/**
 * GECKONOID, LA MASCOTA, ANIMADA EN CÓDIGO.
 *
 *   <Geckonoid estado="idle" size={240} />
 *
 * La base es el render maestro sin fondo (public/mascota/cuerpo.png),
 * y cada estado es un puñado de PARCHES: recortes de una variante del
 * mismo render con el gesto cambiado, con el borde difuminado, que se
 * ponen encima en el sitio que dice parches.json. Lo escribe
 * mascota/scripts/parches.py; acá solo se apila y se mueve.
 *
 * LAS CAPAS, de atrás adelante:
 *   cuerpo.png   la base. En los estados que quitan algo del maestro
 *                —los brazos que cuelgan cuando suben— lleva un
 *                mask-image (parches/hueco_<estado>.png).
 *   resto        lo que el hueco quita, desvaneciéndose: mask-image no
 *                se anima, y sin esto el brazo desaparecería de golpe.
 *   cola.png     aparte, con transform-origin en su base, para oscilar.
 *   parches      los del estado, con fundido de 200 ms al entrar y salir.
 *   parpadeo     los parches de ojos cerrados, que se encienden y apagan.
 *
 * EL ESTADO ES DE FUERA Y EL TIEMPO ES DE AQUÍ. Quien usa el componente
 * dice qué ha pasado —`estado="exito"`— y el componente lo enseña durante
 * DURACION_ESTADO_MS y vuelve solo a idle. Para lanzar dos veces el
 * mismo estado seguido hay que cambiar `disparo`, que es lo que hace
 * `useMascota().dispara`.
 *
 * EL TAMAÑO. `size` es el ALTO del lienzo en píxeles; el ancho sale de
 * la proporción del maestro. Los parches de «éxito» y «nivel superado»
 * —las manos en alto, el diploma— sobresalen del lienzo por los lados:
 * el contenedor no debe recortar (overflow hidden).
 */

type Caja = { x: number; y: number; ancho: number; alto: number };
type Parche = Caja & { estado: string; archivo: string; etiqueta: string };

const DATOS = parchesJson as {
  lienzo: { ancho: number; alto: number; proporcion: number };
  cola: Caja & { archivo: string; pivote: { x: number; y: number } };
  parches: Parche[];
  huecos: Record<string, string>;
  restos: Record<string, string>;
};

const PARCHES_POR_ESTADO = DATOS.parches.reduce<Record<string, Parche[]>>((acc, p) => {
  (acc[p.estado] ??= []).push(p);
  return acc;
}, {});
const PARPADEO = PARCHES_POR_ESTADO.parpadeo ?? [];

const src = (archivo: string) => `/mascota/${archivo}`;
const srcParche = (archivo: string) => `/mascota/parches/${archivo}`;

const FUNDIDO: Transition = { duration: 0.2, ease: "easeOut" };
const MUELLE: Transition = { type: "spring", stiffness: 220, damping: 16 };
const RESPIRAR: Transition = { duration: 3, repeat: Infinity, ease: "easeInOut" };

/** Dos cajas del lienzo que se pisan. */
const sePisan = (a: Caja, b: Caja) =>
  a.x < b.x + b.ancho && b.x < a.x + a.ancho && a.y < b.y + b.alto && b.y < a.y + a.alto;

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
  /** El alto del lienzo, en píxeles. */
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

  const parches = PARCHES_POR_ESTADO[vivo] ?? [];
  const hueco = DATOS.huecos[vivo];
  const resto = DATOS.restos[vivo];

  // El parpadeo: cada 3–5 segundos, 150 ms, y solo si ningún parche del
  // estado tapa los ojos (en «ánimo» ya hay un guiño puesto).
  const puedeParpadear = useMemo(() => !parches.some((p) => PARPADEO.some((ojo) => sePisan(p, ojo))), [parches]);
  const [cerrando, setCerrando] = useState(false);

  useEffect(() => {
    if (!puedeParpadear) return;
    let reloj: ReturnType<typeof setTimeout>;
    let abrir: ReturnType<typeof setTimeout>;
    const programar = () => {
      reloj = setTimeout(() => {
        setCerrando(true);
        abrir = setTimeout(() => {
          setCerrando(false);
          programar();
        }, 150);
      }, 3000 + Math.random() * 2000);
    };
    programar();
    return () => {
      clearTimeout(reloj);
      clearTimeout(abrir);
    };
  }, [puedeParpadear]);

  // Todo se precarga al montar: al cambiar de estado no hay que esperar
  // a que llegue la imagen.
  useEffect(() => {
    const rutas = [
      src("cuerpo.png"),
      src(DATOS.cola.archivo),
      ...DATOS.parches.map((p) => srcParche(p.archivo)),
      ...Object.values(DATOS.huecos).map(srcParche),
      ...Object.values(DATOS.restos).map(srcParche),
    ];
    for (const ruta of rutas) {
      const imagen = new Image();
      imagen.src = ruta;
    }
  }, []);

  const ancho = size * DATOS.lienzo.proporcion;
  // Los desplazamientos en píxeles del guion —el salto de 30, la caída
  // de 10— están pensados para 240 px de alto: se escalan con el tamaño.
  const u = size / 240;

  /**
   * La caja de una pieza, en píxeles del lienzo. Sin `max-width`: el
   * preflight de Tailwind pone `img { max-width: 100% }`, y el parche
   * de «éxito» —las manos en alto— es más ancho que el lienzo: capado
   * al 100 % salía achatado y corrido.
   */
  const caja = (c: Caja): CSSProperties => ({
    position: "absolute",
    left: c.x * ancho,
    top: c.y * size,
    width: c.ancho * ancho,
    height: c.alto * size,
    maxWidth: "none",
  });

  /** El cuerpo entero con una máscara encima (el hueco, o su resto). */
  const mascara = (archivo: string): CSSProperties => ({
    maskImage: `url(${srcParche(archivo)})`,
    WebkitMaskImage: `url(${srcParche(archivo)})`,
    maskSize: "100% 100%",
    WebkitMaskSize: "100% 100%",
    maskRepeat: "no-repeat",
    WebkitMaskRepeat: "no-repeat",
  });

  // ------------------------------ EL GUION ------------------------------
  // Los movimientos de todo el personaje, desde los pies. Se lanzan a
  // mano (useAnimate) y no con `animate`, porque un salto tiene que
  // volver a saltar aunque el estado sea el mismo —dos aciertos
  // seguidos— y `animate` no relanza un objetivo que no cambió.
  const [cuerpo, animar] = useAnimate<HTMLDivElement>();
  const quieto: [DOMKeyframesDefinition, AnimationOptions] = [{ y: 0, rotate: 0 }, { y: MUELLE, rotate: MUELLE }];
  const rebote: [DOMKeyframesDefinition, AnimationOptions] = [
    { y: [0, -10 * u, 0], rotate: 0 },
    { y: { duration: 0.4, times: [0, 0.4, 1], ease: "easeOut" }, rotate: MUELLE },
  ];
  const GESTOS: Record<EstadoMascota, [DOMKeyframesDefinition, AnimationOptions]> = {
    idle: quieto,
    estudiando: quieto,
    exito: [
      { y: [0, -30 * u, 0, -8 * u, 0], rotate: 0 },
      { y: { duration: 0.7, times: [0, 0.35, 0.65, 0.82, 1], ease: "easeOut" }, rotate: MUELLE },
    ],
    duda: [{ y: 0, rotate: 6 }, { y: MUELLE, rotate: MUELLE }],
    animo: rebote,
    racha_perdida: [{ y: 10 * u, rotate: -4 }, { y: MUELLE, rotate: MUELLE }],
    nivel_superado: rebote,
  };

  useEffect(() => {
    const [objetivo, transicion] = GESTOS[vivo];
    const controles = animar(cuerpo.current, objetivo, transicion);
    return () => controles.stop();
    // GESTOS se arma en cada render; lo que importa es el estado, el
    // disparo y el tamaño.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vivo, disparo, u]);

  return (
    <div
      role="img"
      aria-label={`${etiqueta} · ${vivo}`}
      className={`relative select-none ${className}`}
      style={{ width: ancho, height: size }}
    >
      {/* La respiración va en un contenedor propio: si fuera con los
          gestos, cada cambio de estado la reiniciaría a mitad de ciclo. */}
      <motion.div className="absolute inset-0" style={{ originY: 1 }} animate={{ scale: [1, 1.015, 1] }} transition={RESPIRAR}>
        <div ref={cuerpo} className="absolute inset-0" style={{ transformOrigin: "50% 100%" }}>
          <img src={src("cuerpo.png")} alt="" draggable={false} className="absolute inset-0 h-full w-full" style={hueco ? mascara(hueco) : undefined} />

          {resto && (
            <motion.img
              key={`resto-${vivo}-${disparo}`}
              src={src("cuerpo.png")}
              alt=""
              draggable={false}
              className="absolute inset-0 h-full w-full"
              style={mascara(resto)}
              initial={{ opacity: 1 }}
              animate={{ opacity: 0 }}
              transition={FUNDIDO}
            />
          )}

          <motion.img
            src={src(DATOS.cola.archivo)}
            alt=""
            draggable={false}
            style={{ ...caja(DATOS.cola), originX: DATOS.cola.pivote.x, originY: DATOS.cola.pivote.y }}
            animate={{ rotate: [-5, 5, -5] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          />

          <AnimatePresence>
            {parches.map((p) => (
              <motion.img
                key={p.archivo}
                src={srcParche(p.archivo)}
                alt=""
                draggable={false}
                style={caja(p)}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={FUNDIDO}
              />
            ))}
          </AnimatePresence>

          {puedeParpadear &&
            PARPADEO.map((ojo) => (
              <motion.img
                key={ojo.archivo}
                src={srcParche(ojo.archivo)}
                alt=""
                draggable={false}
                style={caja(ojo)}
                initial={{ opacity: 0 }}
                animate={{ opacity: cerrando ? 1 : 0 }}
                transition={{ duration: 0.05 }}
              />
            ))}
        </div>
      </motion.div>
    </div>
  );
}
