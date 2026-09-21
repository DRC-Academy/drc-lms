"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as PointerEventReact } from "react";
import { AnimatePresence, motion, useAnimate, useMotionValue, useReducedMotion, useSpring, type Transition } from "framer-motion";
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
 *   cuerpo.png   la base, en DOS copias: el cuerpo (transparente por
 *                encima del cuello) y la cabeza (opaca hasta el cuello y
 *                fundida sobre el pecho), para que la cabeza pueda
 *                inclinarse sola. Las dos van en un contenedor que, en
 *                los estados que quitan algo del maestro —los brazos que
 *                cuelgan cuando suben—, lleva un mask-image
 *                (parches/hueco_<estado>.png).
 *   resto        lo que el hueco quita, desvaneciéndose: mask-image no
 *                se anima, y sin esto el brazo desaparecería de golpe.
 *   cola.png     aparte, con transform-origin en su base, para oscilar.
 *   parches      los del estado, con fundido de 200 ms al entrar y salir.
 *   parpadeo     los parches de ojos cerrados, dentro de la cabeza, que
 *                se encienden y apagan.
 *   adornos      las estrellas, la gotita y el signo, dibujados en SVG.
 *
 * EL ESTADO ES DE FUERA Y EL TIEMPO ES DE AQUÍ. Quien usa el componente
 * dice qué ha pasado —`estado="exito"`— y el componente lo enseña durante
 * DURACION_ESTADO_MS y vuelve solo a idle. Para lanzar dos veces el
 * mismo estado seguido hay que cambiar `disparo`, que es lo que hace
 * `useMascota().dispara`.
 *
 * EL ORDEN DE CADA ESTADO: primero se mueve el cuerpo, a los 100 ms
 * entra la cara, a los 220 ms los adornos. Los gestos son muelles y el
 * salto lleva anticipación, estiramiento al subir y aplastamiento al
 * caer, siempre desde los pies.
 *
 * EN IDLE, además de respirar, mover la cola y parpadear, cada 8–15 s
 * hace un micro-gesto —inclinar la cabeza, balancearse, parpadear dos
 * veces, agitar la cola—, nunca dos seguidos iguales. En los estados
 * que se sostienen —«estudiando» mientras dura una generación, «nivel
 * superado» con el diploma— también, pero solo los que no mueven la
 * cabeza: los anteojos y la cara del diploma son parches fuera de esa
 * capa y se quedarían en el aire. Con el ratón encima se inclina hacia el
 * cursor; al tocarla, si está en idle, pone cara de duda. Con
 * prefers-reduced-motion nada de esto se mueve: los estados se enseñan
 * solo con el fundido de los parches.
 *
 * EL TAMAÑO. `size` es el ALTO del lienzo en píxeles; el ancho sale de
 * la proporción del maestro. Los parches de «éxito» y «nivel superado»
 * —las manos en alto, el diploma— sobresalen del lienzo por los lados,
 * y el salto de «éxito» sube 30 px (a 240 de alto) por arriba: el
 * contenedor no debe recortar (overflow hidden) y conviene dejarle
 * aire encima.
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

// Puntos del maestro, como fracción del lienzo (medidos sobre el alfa
// de cuerpo.png). El personaje no está centrado: la cola va a la
// derecha, así que los pies y la cabeza caen al 41 % del ancho.
const PIES_X = 0.414;
const CUELLO = { x: 0.414, y: 0.4 };
const CABEZA = { x: 0.414, y: 0.2 };
const OJO_LLORON = { x: 0.643, y: 0.25 };
// El corte entre las dos copias de cuerpo.png: el cuerpo se ve desde
// CORTE_CUERPO hacia abajo (corte seco); la cabeza es opaca hasta
// CABEZA_OPACA y se funde hasta CABEZA_FUNDE. Todo cerca del cuello,
// que es el pivote: al inclinarse, ahí casi no hay desplazamiento y la
// unión no se nota.
const CORTE_CUERPO = 0.37;
const CABEZA_OPACA = 0.43;
const CABEZA_FUNDE = 0.5;

const FUNDIDO_S = 0.2;
const RETARDO_CARA_S = 0.1;
const RETARDO_BRAZO_S = 0.15;
const RETARDO_ADORNO_S = 0.22;

/** Los micro-gestos de idle. */
export type MicroGesto = "cabeza" | "balanceo" | "parpadeo_doble" | "cola";
export const MICRO_GESTOS: readonly MicroGesto[] = ["cabeza", "balanceo", "parpadeo_doble", "cola"];
/**
 * En qué estados hay micro-gestos, y cuáles. Los que se sostienen
 * —«estudiando» durante una generación, «nivel superado» con el
 * diploma en el inicio— llevan solo los que no mueven la cabeza: sus
 * parches son de la cara y están fuera de esa capa.
 */
const MICRO_POR_ESTADO: Partial<Record<EstadoMascota, readonly MicroGesto[]>> = {
  idle: MICRO_GESTOS,
  estudiando: ["balanceo", "cola"],
  nivel_superado: ["balanceo", "cola"],
};

const ESTRELLA = "M12 2l2.9 6.3 6.9.7-5.2 4.7 1.5 6.8L12 17l-6.1 3.5 1.5-6.8L2.2 9l6.9-.7z";
const GOTA = "M12 2C12 2 5 10.5 5 15a7 7 0 0 0 14 0c0-4.5-7-13-7-13z";
const AMARILLO = "#f7d33d";
const AMARILLO_OSCURO = "#c99d00";
const VERDE_OSCURO = "#2f5a1f";

type Estrella = { id: number; dx: number; dy: number; giro: number; tam: number; retardo: number };

/** Lo que devuelve `animar`: se puede parar y esperar. */
type Controles = { stop: () => void; then: (onResolve: VoidFunction, onReject?: VoidFunction) => Promise<void> };
type Paso = () => Controles | Controles[];

/**
 * Corre pasos uno tras otro; cada paso lanza una o varias animaciones
 * a la vez y el siguiente espera a que terminen. `stop` corta el que
 * esté en marcha y no lanza más.
 */
function correr(pasos: Paso[]): { stop: () => void } {
  let activo = true;
  let actuales: Controles[] = [];
  (async () => {
    for (const paso of pasos) {
      if (!activo) return;
      const lanzadas = paso();
      actuales = Array.isArray(lanzadas) ? lanzadas : [lanzadas];
      await Promise.all(actuales.map((a) => new Promise<void>((fin) => a.then(fin, fin))));
    }
  })();
  return {
    stop: () => {
      activo = false;
      for (const a of actuales) a.stop();
    },
  };
}

const limitar = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

/** Dos cajas del lienzo que se pisan. */
const sePisan = (a: Caja, b: Caja) =>
  a.x < b.x + b.ancho && b.x < a.x + a.ancho && a.y < b.y + b.alto && b.y < a.y + a.alto;

export default function Geckonoid({
  estado = "idle",
  disparo = 0,
  size = 240,
  volverAIdle = true,
  onIdle,
  velocidad = 1,
  gesto,
  onGesto,
  quieta = false,
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
  /** Multiplica el ritmo de todo: 0.5 es a cámara lenta, 2 al doble. Para revisar. */
  velocidad?: number;
  /** Un micro-gesto pedido desde fuera (solo en idle). `n` cambia para repetirlo. */
  gesto?: { nombre: MicroGesto; n: number };
  /** Avisa de cada micro-gesto, espontáneo o pedido. */
  onGesto?: (nombre: MicroGesto) => void;
  /**
   * Enseña el estado sin su gesto ni sus adornos: la cara y la pose,
   * pero ni salto ni estrellas. Para un estado que se sostiene y ya se
   * celebró —el diploma en la ruta, la segunda vez que se entra—.
   * Respirar, la cola y los micro-gestos siguen.
   */
  quieta?: boolean;
  className?: string;
  /** Para el lector de pantalla: qué es esto. `null` si es decorativa y no hay que anunciarla. */
  etiqueta?: string | null;
}) {
  const reducido = useReducedMotion() ?? false;

  // El ritmo. Los muelles se escalan conservando la forma: para ir el
  // doble de rápido la rigidez va por cuatro y el amortiguamiento por dos.
  const v = velocidad > 0 ? velocidad : 1;
  const seg = (s: number) => s / v;
  const ms = (m: number) => m / v;
  const muelle = (rigidez: number, amortiguacion: number): Transition => ({
    type: "spring",
    stiffness: rigidez * v * v,
    damping: amortiguacion * v,
  });

  // El estado que se enseña, y un contador que cambia cada vez que se
  // enseña algo —de fuera, por un toque, o la vuelta a idle— para que
  // el gesto se relance aunque el estado se repita.
  const [vivo, setVivo] = useState<EstadoMascota>(estado);
  const [vez, setVez] = useState(0);
  const reloj = useRef<ReturnType<typeof setTimeout>>();

  // `mostrar` es estable a propósito: lo que cambia entre renders
  // —volver o no a idle, el ritmo, `onIdle`, que se escribe en línea—
  // se lee de un ref. Si dependiera de ellos, cambiar la velocidad en
  // el banco de pruebas relanzaría el último estado.
  const ajustes = useRef({ volverAIdle, ms, onIdle });
  ajustes.current = { volverAIdle, ms, onIdle };
  const mostrar = useCallback((nuevo: EstadoMascota) => {
    clearTimeout(reloj.current);
    setVivo(nuevo);
    setVez((n) => n + 1);
    if (nuevo === "idle" || !ajustes.current.volverAIdle) return;
    reloj.current = setTimeout(() => {
      setVivo("idle");
      setVez((n) => n + 1);
      ajustes.current.onIdle?.();
    }, ajustes.current.ms(DURACION_ESTADO_MS));
  }, []);

  useEffect(() => {
    mostrar(estado);
  }, [estado, disparo, mostrar]);
  useEffect(() => () => clearTimeout(reloj.current), []);

  const parches = PARCHES_POR_ESTADO[vivo] ?? [];
  const hueco = DATOS.huecos[vivo];
  const resto = DATOS.restos[vivo];

  // El parpadeo: cada 3–5 segundos, 150 ms, y solo si ningún parche del
  // estado tapa los ojos (en «ánimo» ya hay un guiño puesto).
  const puedeParpadear = useMemo(() => !parches.some((p) => PARPADEO.some((ojo) => sePisan(p, ojo))), [parches]);
  const [cerrando, setCerrando] = useState(false);

  useEffect(() => {
    if (!puedeParpadear) return;
    let espera: ReturnType<typeof setTimeout>;
    let abrir: ReturnType<typeof setTimeout>;
    const programar = () => {
      espera = setTimeout(() => {
        setCerrando(true);
        abrir = setTimeout(() => {
          setCerrando(false);
          programar();
        }, ms(150));
      }, ms(3000 + Math.random() * 2000));
    };
    programar();
    return () => {
      clearTimeout(espera);
      clearTimeout(abrir);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [puedeParpadear, v]);

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

  /** Una máscara del tamaño del lienzo: un PNG (el hueco, su resto) o un degradado. */
  const mascara = (imagen: string): CSSProperties => ({
    maskImage: imagen,
    WebkitMaskImage: imagen,
    maskSize: "100% 100%",
    WebkitMaskSize: "100% 100%",
    maskRepeat: "no-repeat",
    WebkitMaskRepeat: "no-repeat",
  });
  const mascaraPng = (archivo: string) => mascara(`url(${srcParche(archivo)})`);
  const pc = (f: number) => `${(f * 100).toFixed(1)}%`;
  const MASCARA_CUERPO = mascara(`linear-gradient(to bottom, transparent ${pc(CORTE_CUERPO)}, #000 ${pc(CORTE_CUERPO)})`);
  const MASCARA_CABEZA = mascara(`linear-gradient(to bottom, #000 ${pc(CABEZA_OPACA)}, transparent ${pc(CABEZA_FUNDE)})`);

  const origenPies = `${pc(PIES_X)} 100%`;

  // ------------------------------ EL GUION ------------------------------
  // Los movimientos de todo el personaje, desde los pies. Se lanzan a
  // mano (useAnimate) y no con `animate`, porque un salto tiene que
  // volver a saltar aunque el estado sea el mismo —dos aciertos
  // seguidos— y `animate` no relanza un objetivo que no cambió.
  const [cuerpo, animar] = useAnimate<HTMLDivElement>();
  const cabeza = useRef<HTMLDivElement>(null);

  const EN_REPOSO = { y: 0, rotate: 0, scaleX: 1, scaleY: 1 };

  /**
   * Un salto: se agacha (anticipación), sube estirado, cae, se aplasta
   * al aterrizar y se recupera con un muelle que rebota. La altura es
   * en píxeles del lienzo a 240 de alto.
   */
  const salto = (el: HTMLElement, altura: number): Paso[] => [
    () => animar(el, { scaleY: 0.92, scaleX: 1.05, y: 0, rotate: 0 }, { duration: seg(0.08), ease: "easeIn" }),
    () => animar(el, { y: -altura * u, scaleY: 1.06, scaleX: 0.96 }, { duration: seg(0.22), ease: [0.2, 0.7, 0.4, 1] }),
    () => animar(el, { y: 0, scaleY: 1.03, scaleX: 0.98 }, { duration: seg(0.17), ease: "easeIn" }),
    () => animar(el, { scaleY: 0.9, scaleX: 1.08 }, { duration: seg(0.1), ease: "easeOut" }),
    () => [
      animar(el, { scaleY: 1, scaleX: 1 }, muelle(420, 18)),
      animar(el, { y: [0, -altura * 0.25 * u, 0] }, { duration: seg(0.32), ease: "easeOut" }),
    ],
  ];

  const GESTOS: Record<EstadoMascota, (el: HTMLElement) => { stop: () => void }> = {
    idle: (el) => animar(el, EN_REPOSO, muelle(350, 22)),
    estudiando: (el) => animar(el, EN_REPOSO, muelle(350, 22)),
    exito: (el) => correr(salto(el, 30)),
    duda: (el) => animar(el, { y: 0, rotate: 6, scaleX: 1, scaleY: 1 }, muelle(320, 18)),
    animo: (el) => correr(salto(el, 10)),
    racha_perdida: (el) => animar(el, { y: 10 * u, rotate: -4, scaleX: 1.02, scaleY: 0.97 }, muelle(300, 25)),
    nivel_superado: (el) => correr(salto(el, 18)),
  };

  // Los micro-gestos de idle. El que esté en marcha se guarda para
  // poder cortarlo cuando llega un estado.
  const microEnCurso = useRef<{ stop: () => void } | null>(null);
  const ultimoMicro = useRef<MicroGesto | null>(null);
  const [colaAmplia, setColaAmplia] = useState(false);

  const hacerMicro = (nombre: MicroGesto): { stop: () => void } => {
    const el = cuerpo.current;
    const cab = cabeza.current;
    if (nombre === "cabeza" && cab) {
      const lado = Math.random() < 0.5 ? -4 : 4;
      return animar(cab, { rotate: [0, lado, lado, 0] }, { duration: seg(1.4), times: [0, 0.3, 0.65, 1], ease: "easeInOut" });
    }
    if (nombre === "balanceo" && el) {
      return animar(el, { rotate: [0, 2, -2, 0] }, { duration: seg(1.6), times: [0, 0.3, 0.7, 1], ease: "easeInOut" });
    }
    if (nombre === "parpadeo_doble") {
      const relojes = [
        setTimeout(() => setCerrando(true), 0),
        setTimeout(() => setCerrando(false), ms(120)),
        setTimeout(() => setCerrando(true), ms(220)),
        setTimeout(() => setCerrando(false), ms(340)),
      ];
      return {
        stop: () => {
          relojes.forEach(clearTimeout);
          setCerrando(false);
        },
      };
    }
    if (nombre === "cola") {
      // No se corta: el vaivén acaba solo en el ángulo donde arranca el
      // bucle, y cortarlo a medias haría saltar la cola hasta ahí.
      setColaAmplia(true);
    }
    return { stop: () => {} };
  };

  const lanzarMicro = (nombre: MicroGesto) => {
    microEnCurso.current?.stop();
    ultimoMicro.current = nombre;
    microEnCurso.current = hacerMicro(nombre);
    onGesto?.(nombre);
  };

  // El gesto del estado. Corta el micro-gesto que hubiera, endereza la
  // cabeza y lanza el guion; con movimiento reducido, todo a su sitio
  // sin animar.
  useEffect(() => {
    const el = cuerpo.current;
    if (!el) return;
    microEnCurso.current?.stop();
    microEnCurso.current = null;
    if (reducido || quieta) {
      animar(el, EN_REPOSO, { duration: 0 });
      if (cabeza.current) animar(cabeza.current, { rotate: 0 }, { duration: 0 });
      return;
    }
    if (cabeza.current) animar(cabeza.current, { rotate: 0 }, muelle(400, 25));
    const gesto = GESTOS[vivo](el);
    return () => gesto.stop();
    // GESTOS se arma en cada render; lo que importa es el estado, la vez,
    // el tamaño y el ritmo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vivo, vez, u, v, reducido, quieta]);

  // Cada 8–15 s, un micro-gesto al azar de los que admite el estado,
  // nunca el mismo que el anterior. Al cambiar de estado se corta el
  // que esté en marcha.
  const microPosibles = MICRO_POR_ESTADO[vivo];
  useEffect(() => {
    if (!microPosibles || reducido) return;
    let espera: ReturnType<typeof setTimeout>;
    const programar = () => {
      espera = setTimeout(() => {
        const opciones = microPosibles.filter((g) => g !== ultimoMicro.current);
        lanzarMicro(opciones[Math.floor(Math.random() * opciones.length)]);
        programar();
      }, ms(8000 + Math.random() * 7000));
    };
    programar();
    return () => {
      clearTimeout(espera);
      microEnCurso.current?.stop();
      microEnCurso.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vivo, reducido, v]);

  // Un micro-gesto pedido desde fuera (el banco de pruebas).
  useEffect(() => {
    if (!gesto || !microPosibles?.includes(gesto.nombre) || reducido) return;
    lanzarMicro(gesto.nombre);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gesto?.n]);

  // Las estrellas de «éxito» y «nivel superado»: 8–12, cada una con su
  // rumbo. Se generan en un efecto —no en el render— para que el
  // servidor no pinte un azar distinto al del navegador.
  const [estrellas, setEstrellas] = useState<Estrella[]>([]);
  useEffect(() => {
    if ((vivo !== "exito" && vivo !== "nivel_superado") || reducido || quieta) {
      setEstrellas([]);
      return;
    }
    setEstrellas(
      Array.from({ length: 8 + Math.floor(Math.random() * 5) }, (_, i) => {
        // Hacia arriba, en abanico: en pantalla la y crece hacia abajo.
        const rumbo = -Math.PI * (0.1 + Math.random() * 0.8);
        const alcance = (40 + Math.random() * 50) * u;
        return {
          id: i,
          dx: Math.cos(rumbo) * alcance,
          dy: Math.sin(rumbo) * alcance,
          giro: (Math.random() - 0.5) * 360,
          tam: (8 + Math.random() * 8) * u,
          retardo: Math.random() * 0.12,
        };
      }),
    );
  }, [vivo, vez, u, reducido, quieta]);

  // Con el ratón encima, se inclina hacia el cursor (5° como mucho).
  const inclinacion = useMotionValue(0);
  const inclinacionSuave = useSpring(inclinacion, { stiffness: 150, damping: 20 });
  const seguirCursor = (e: PointerEventReact<HTMLDivElement>) => {
    if (reducido || e.pointerType !== "mouse") return;
    const r = e.currentTarget.getBoundingClientRect();
    const dx = (e.clientX - (r.left + r.width * PIES_X)) / (r.width / 2);
    inclinacion.set(limitar(dx * 5, -5, 5));
  };
  const soltarCursor = () => inclinacion.set(0);
  const tocar = () => {
    if (reducido || vivo !== "idle") return;
    mostrar("duda");
  };

  const retardoParche = (p: Parche) => seg(p.etiqueta === "cara" || p.etiqueta === "cabeza" ? RETARDO_CARA_S : RETARDO_BRAZO_S);
  const fundido = (retardo = 0): Transition => ({ duration: seg(FUNDIDO_S), ease: "easeOut", delay: retardo });

  return (
    <div
      role={etiqueta === null ? undefined : "img"}
      aria-hidden={etiqueta === null || undefined}
      aria-label={etiqueta === null ? undefined : `${etiqueta} · ${vivo}`}
      className={`relative select-none ${className}`}
      style={{ width: ancho, height: size }}
      onPointerMove={seguirCursor}
      onPointerLeave={soltarCursor}
      onClick={tocar}
    >
      <motion.div className="absolute inset-0" style={{ rotate: inclinacionSuave, transformOrigin: origenPies }}>
        {/* La respiración va en un contenedor propio: si fuera con los
            gestos, cada cambio de estado la reiniciaría a mitad de ciclo. */}
        <motion.div
          className="absolute inset-0"
          style={{ transformOrigin: origenPies }}
          animate={reducido ? undefined : { scale: [1, 1.015, 1] }}
          transition={{ duration: seg(3), repeat: Infinity, ease: "easeInOut" }}
        >
          <div ref={cuerpo} className="absolute inset-0" style={{ transformOrigin: origenPies }}>
            <div className="absolute inset-0" style={hueco ? mascaraPng(hueco) : undefined}>
              <img src={src("cuerpo.png")} alt="" draggable={false} className="absolute inset-0 h-full w-full" style={MASCARA_CUERPO} />
              <div ref={cabeza} className="absolute inset-0" style={{ transformOrigin: `${pc(CUELLO.x)} ${pc(CUELLO.y)}` }}>
                <img src={src("cuerpo.png")} alt="" draggable={false} className="absolute inset-0 h-full w-full" style={MASCARA_CABEZA} />
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
            </div>

            {resto && (
              <motion.img
                key={`resto-${vivo}-${vez}`}
                src={src("cuerpo.png")}
                alt=""
                draggable={false}
                className="absolute inset-0 h-full w-full"
                style={mascaraPng(resto)}
                initial={{ opacity: 1 }}
                animate={{ opacity: 0 }}
                transition={fundido(seg(RETARDO_CARA_S))}
              />
            )}

            <motion.img
              src={src(DATOS.cola.archivo)}
              alt=""
              draggable={false}
              style={{ ...caja(DATOS.cola), originX: DATOS.cola.pivote.x, originY: DATOS.cola.pivote.y }}
              animate={reducido ? undefined : colaAmplia ? { rotate: [null, -16, 14, -5] } : { rotate: [-5, 5, -5] }}
              transition={
                colaAmplia
                  ? { duration: seg(1.6), times: [0, 0.3, 0.7, 1], ease: "easeInOut" }
                  : { duration: seg(2.5), repeat: Infinity, ease: "easeInOut" }
              }
              onAnimationComplete={() => {
                if (colaAmplia) setColaAmplia(false);
              }}
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
                  exit={{ opacity: 0, transition: fundido() }}
                  transition={fundido(retardoParche(p))}
                />
              ))}
            </AnimatePresence>

            {/* Los adornos, en SVG: salen después de la cara. */}
            {estrellas.map((e) => (
              <motion.svg
                key={`${vez}-${e.id}`}
                viewBox="0 0 24 24"
                width={e.tam}
                height={e.tam}
                aria-hidden
                style={{ position: "absolute", left: CABEZA.x * ancho - e.tam / 2, top: CABEZA.y * size - e.tam / 2, pointerEvents: "none" }}
                initial={{ x: 0, y: 0, opacity: 0, scale: 0.3, rotate: 0 }}
                animate={{ x: e.dx, y: e.dy, opacity: [0, 1, 1, 0], scale: [0.3, 1, 1, 0.6], rotate: e.giro }}
                transition={{ duration: seg(0.9), delay: seg(RETARDO_ADORNO_S + e.retardo), ease: "easeOut" }}
              >
                <path d={ESTRELLA} fill={AMARILLO} stroke={AMARILLO_OSCURO} strokeWidth={1} strokeLinejoin="round" />
              </motion.svg>
            ))}

            <AnimatePresence>
              {vivo === "racha_perdida" && (
                <motion.svg
                  key={`gota-${vez}`}
                  viewBox="0 0 24 24"
                  width={0.07 * size}
                  height={0.07 * size}
                  aria-hidden
                  style={{ position: "absolute", left: OJO_LLORON.x * ancho - 0.035 * size, top: OJO_LLORON.y * size, pointerEvents: "none" }}
                  initial={reducido ? { y: 0, opacity: 1 } : { y: 0, opacity: 0, scale: 0.6 }}
                  animate={reducido ? { y: 0, opacity: 1 } : { y: 40 * u, opacity: [0, 1, 1, 0], scale: [0.6, 1, 1, 0.9] }}
                  exit={{ opacity: 0, transition: fundido() }}
                  transition={reducido ? { duration: 0 } : { duration: seg(1), delay: seg(RETARDO_ADORNO_S), ease: "easeIn" }}
                >
                  <path d={GOTA} fill="#8fd0ff" stroke="#3e86d6" strokeWidth={1} strokeLinejoin="round" />
                  <ellipse cx="9.5" cy="13" rx="1.6" ry="2.4" fill="#fff" opacity={0.8} />
                </motion.svg>
              )}

              {vivo === "duda" && (
                <motion.svg
                  key={`signo-${vez}`}
                  viewBox="0 0 24 32"
                  width={0.15 * size}
                  height={0.2 * size}
                  aria-hidden
                  style={{ position: "absolute", left: 0.84 * ancho, top: -0.06 * size, pointerEvents: "none", transformOrigin: "30% 100%" }}
                  initial={reducido ? { scale: 1, opacity: 1, rotate: 12 } : { scale: 0, opacity: 0, rotate: 12 }}
                  animate={reducido ? { scale: 1, opacity: 1, rotate: 12 } : { scale: [0, 1.2, 1], opacity: [0, 1, 1], rotate: 12 }}
                  exit={{ scale: 0.6, opacity: 0, transition: { duration: seg(0.15) } }}
                  transition={reducido ? { duration: 0 } : { duration: seg(0.35), delay: seg(RETARDO_ADORNO_S), ease: "easeOut" }}
                >
                  <text
                    x="12"
                    y="26"
                    textAnchor="middle"
                    fontFamily="'Radio Canada Big', 'Radio Canada', system-ui, sans-serif"
                    fontWeight={800}
                    fontSize="30"
                    fill={AMARILLO}
                    stroke={VERDE_OSCURO}
                    strokeWidth={1.6}
                    strokeLinejoin="round"
                    paintOrder="stroke"
                  >
                    ?
                  </text>
                </motion.svg>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
