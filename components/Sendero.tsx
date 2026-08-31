import type { Hito } from "@/lib/gamificacion";

/**
 * EL CURSO COMO CAMINO, en el inicio del alumno.
 *
 * Sustituye a la barra del diploma, y esa sustitución es todo el
 * cambio: una barra dice CUÁNTO llevas y un camino dice DÓNDE estás.
 * Con el curso a cero, además, la barra era una imagen de la nada —un
 * carril vacío— mientras que un camino sin andar sigue siendo un camino
 * y se ve entero desde el primer día.
 *
 * ES EL IDIOMA DE «PARA TI», TRAÍDO AQUÍ. La aplicación ya tenía un
 * mapa con paradas, candados y una chapa de «estás aquí»
 * —`components/practica/Ruta.tsx`— y el inicio no usaba nada de él: dos
 * pantallas del mismo producto, una dibujada y otra resuelta con
 * rectángulos. Esto no inventa un vocabulario nuevo, extiende el que ya
 * existía.
 *
 * SEIS NODOS, NO CIENTO OCHENTA Y SIETE. Un nodo por mes, no por
 * lección: a esa escala el camino se lee de un vistazo, y un nodo por
 * lección sería un gráfico de densidad —no se distinguiría dónde estás,
 * que es lo único que este dibujo tiene que decir—.
 *
 * LAS POSICIONES SE CALCULAN, no se escriben. Con seis meses o con
 * cuatro el trazado sale bien solo: el temario no promete que siempre
 * sean seis.
 *
 * Se renderiza en el servidor: no tiene estado ni interacción. Lo
 * accionable de esta pantalla es el botón de la franja, y un mapa que
 * se pudiera pulsar competiría con él —ese mapa ya existe en «Para ti»,
 * que es su sitio—.
 */

/** El lienzo. Se escala entero; las medidas de dentro son de él. */
const ANCHO = 900;
const ALTO = 96;
const MARGEN = 30;
const Y_ALTA = 28;
const Y_BAJA = 62;

export default function Sendero({ hitos }: { hitos: Hito[] }) {
  // Con un solo mes no hay camino que dibujar: hay un punto.
  if (hitos.length < 2) return null;

  const nodos = hitos.map((hito, i) => ({
    ...hito,
    x: MARGEN + (i * (ANCHO - MARGEN * 2)) / (hitos.length - 1),
    // Serpentea: alterna alto y bajo. Empieza abajo porque el camino
    // sube según avanza, y subir se lee como progresar.
    y: i % 2 === 0 ? Y_BAJA : Y_ALTA,
  }));

  // Hasta dónde llega lo verde: el último mes cerrado, o el que está en
  // curso si ya lo empezó. Sin nada hecho, no hay tramo verde y el
  // camino entero va punteado — que es lo correcto y no una carencia.
  const ultimoAndado = nodos.reduce(
    (acc, nodo, i) => (nodo.estado === "hecho" || nodo.estado === "en-curso" ? i : acc),
    -1
  );

  const actual = nodos.findIndex((n) => n.estado === "en-curso");

  return (
    <svg
      viewBox={`0 0 ${ANCHO} ${ALTO}`}
      className="block h-[96px] w-full"
      fill="none"
      // El camino no aporta nada a un lector de pantalla que no diga ya
      // la línea de al lado —«142 lecciones para tu diploma»—, y narrar
      // seis nodos sería repetir el mismo dato seis veces.
      aria-hidden
    >
      {/* LO QUE FALTA, primero y por debajo: el tramo andado se pinta
          encima para que el empalme no se vea. */}
      <path
        d={trazar(nodos, 0, nodos.length - 1)}
        stroke="#C4DECF"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray="2 9"
      />

      {ultimoAndado > 0 && (
        <path
          className="sendero-andado"
          style={{ "--largo": 1200 } as React.CSSProperties}
          d={trazar(nodos, 0, ultimoAndado)}
          stroke="#1E9E3A"
          strokeWidth="3.5"
          strokeLinecap="round"
        />
      )}

      {nodos.map((nodo, i) => (
        <Nodo key={nodo.mes} nodo={nodo} esActual={i === actual} esUltimo={i === nodos.length - 1} />
      ))}
    </svg>
  );
}

/**
 * El trazado entre dos nodos, con los tirantes a media distancia.
 *
 * Cúbica y no recta: un camino de rectas es un gráfico de líneas, y
 * esto no es un gráfico. Los puntos de control van en horizontal a la
 * mitad del tramo, que es lo que da la curva en S sin que se pase de
 * frenada en los extremos.
 */
function trazar(nodos: { x: number; y: number }[], desde: number, hasta: number): string {
  let d = `M${nodos[desde].x} ${nodos[desde].y}`;

  for (let i = desde; i < hasta; i++) {
    const a = nodos[i];
    const b = nodos[i + 1];
    const tirante = (b.x - a.x) / 2;
    d += ` C ${a.x + tirante} ${a.y}, ${b.x - tirante} ${b.y}, ${b.x} ${b.y}`;
  }

  return d;
}

/**
 * Una parada.
 *
 * Cuatro estados y ninguno depende solo del color: hecho lleva marca,
 * el de hoy es el más grande y el único con aro ámbar, el pendiente es
 * un contorno y el último lleva candado. Quien no distinga verde de
 * gris sigue leyendo el camino.
 */
function Nodo({
  nodo,
  esActual,
  esUltimo,
}: {
  nodo: Hito & { x: number; y: number };
  esActual: boolean;
  esUltimo: boolean;
}) {
  if (nodo.estado === "hecho") {
    return (
      <>
        <circle cx={nodo.x} cy={nodo.y} r="9" fill="#1E9E3A" />
        <path
          d={`M${nodo.x - 4} ${nodo.y} l3 3 l5.5 -5.5`}
          stroke="#FFFFFF"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </>
    );
  }

  if (esActual) {
    return (
      <>
        {/* El pulso. Único gesto en bucle de la pantalla. */}
        <circle className="sendero-pulso" cx={nodo.x} cy={nodo.y} r="15" fill="#A9DFB7" />
        <circle cx={nodo.x} cy={nodo.y} r="15" fill="#F0FAF2" stroke="#FFC400" strokeWidth="2.5" />
        <circle cx={nodo.x} cy={nodo.y} r="6" fill="#1E9E3A" />
      </>
    );
  }

  return (
    <>
      <circle
        cx={nodo.x}
        cy={nodo.y}
        r={esUltimo ? 10 : 8}
        fill="#FBFCFB"
        stroke="#C9D6CD"
        strokeWidth="2.5"
      />
      {/* El candado solo en la última: cierra el camino y dice que hay
          un final, que es justo lo que una barra al 0% no dice. */}
      {esUltimo && (
        <path
          d={`M${nodo.x - 3.5} ${nodo.y - 0.5} h7 v5 h-7 z M${nodo.x - 2} ${nodo.y - 0.5} v-2 a2 2 0 0 1 4 0 v2`}
          stroke="#8A9891"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </>
  );
}
