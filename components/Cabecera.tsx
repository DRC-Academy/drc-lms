import Image from "next/image";
import Link from "next/link";
import BarraDiploma from "@/components/BarraDiploma";
import ChatAyuda from "@/components/ChatAyuda";

export type SeccionActiva = "inicio" | "curso" | "practica";

// ---------------------------------------------------------------
// EL LOGOTIPO
//
// `public/logo-drc.png` mide 918×243 y ya trae las dos piezas que antes
// se montaban aquí a mano: el símbolo y el texto "DRC Academy". Por eso
// sustituye al conjunto y no solo al cuadrado.
//
// LAS MEDIDAS VAN EN EL ATRIBUTO Y EL TAMAÑO EN CSS. `width` y `height`
// le dan al navegador la proporción antes de que la imagen llegue, así
// que reserva la caja y la cabecera no pega el salto al cargar; la
// altura real la ponen las clases, que es lo que cambia entre móvil y
// escritorio. Si se pusiera solo en CSS, el hueco sería cero hasta que
// bajara el archivo.
//
// 121×32 es la medida de escritorio (32 × 918/243 = 120,9). En móvil se
// baja a 26px de alto y el ancho lo saca el navegador de la proporción:
// 98px, que son 43 MENOS que el cuadrado + texto de antes. El logotipo
// nuevo no aprieta la cabecera en móvil, la desahoga.
//
// SOBRE FONDO CLARO. Toda la tinta del archivo es verde (#008030) sobre
// transparencia, sin una sola zona blanca: 5,19:1 sobre el blanco de
// esta cabecera. En un fondo oscuro se caería a 2,8:1, así que si algún
// día esta barra se pinta en oscuro hace falta otra versión del archivo.
// ---------------------------------------------------------------
const LOGO = { ancho: 121, alto: 32 };

/**
 * Barra de marca y navegación.
 *
 * Tres secciones para el alumno —Inicio, Mi curso y Para ti— porque el
 * producto son dos cosas que conviven: el curso enseña contenido
 * estructurado y la otra genera ejercicios a partir de su perfil y de
 * sus clases. Si la navegación solo nombrara una, la otra parecería un
 * anexo.
 *
 * SE LLAMA "PARA TI" Y NO "PRÁCTICA". Lo que la distingue del curso no
 * es que se practique —en el curso también— sino que está hecha con lo
 * que sabemos de este alumno y de nadie más. "Práctica" nombraba el
 * formato; "Para ti" nombra la promesa, que es lo único que el curso no
 * puede ofrecer.
 *
 * La RUTA sigue siendo /practica. Renombrarla rompería los enlaces que
 * ya estén por ahí y no le cambia nada al alumno, que ve la etiqueta y
 * no la barra de direcciones. La clave interna `practica` se queda por
 * lo mismo: nombra el destino, no el rótulo.
 *
 * El equipo NO ve la navegación: entra por el buscador y va saltando de
 * ficha en ficha, así que "Mi curso" no significa nada para él. Le queda
 * la barra con el logotipo y nada más.
 *
 * EN MÓVIL LA NAVEGACIÓN SE VA ABAJO. Antes ocupaba una segunda fila
 * pegada a la cabecera; ahí competía con el saludo y empujaba el banner
 * —que es el destino de la pantalla— fuera de la primera pantalla. Abajo
 * está donde llega el pulgar y no le quita sitio a nada.
 */
/**
 * El curso en el que está el alumno ahora mismo, si está en uno.
 *
 * Es lo que antes justificaba una cabecera aparte dentro del curso. Ya
 * no: se añade a esta, que es la única.
 */
export type ContextoCurso = {
  titulo: string;
  completadas: number;
  total: number;
};

/**
 * El avance hacia el diploma, para la barra fina.
 *
 * Lo pasa quien tiene los números a mano y NO se pasa dentro del curso:
 * allí `contexto` ya lleva el mismo "12 de 191" en la propia cabecera, y
 * repetirlo dos centímetros más abajo sería la tercera copia del mismo
 * dato en la misma pantalla.
 */
export type ProgresoDiploma = {
  completadas: number;
  total: number;
};

export default function Cabecera({
  nombre,
  alumnoId,
  cursoSlug,
  seccion,
  contexto,
  diploma,
}: {
  nombre?: string;
  /** El alumno de la sesión. null en el equipo: no navega por secciones. */
  alumnoId?: string | null;
  /** El curso que abre "Mi curso". Sin él, el enlace no se pinta. */
  cursoSlug?: string | null;
  seccion?: SeccionActiva;
  /**
   * Avance hacia el diploma para la barra fina. Omitido dentro del curso
   * —la cabecera ya lo lleva en `contexto`— y en el equipo, que no tiene
   * diploma ninguno.
   */
  diploma?: ProgresoDiploma | null;
  /**
   * Nombre y progreso del curso, solo dentro de él. Se AÑADE a la
   * navegación, nunca la sustituye: perderla al entrar en el curso es el
   * fallo que esto viene a arreglar.
   */
  contexto?: ContextoCurso | null;
}) {
  const enlaces =
    alumnoId != null
      ? [
          { clave: "inicio" as const, texto: "Inicio", href: `/alumno/${alumnoId}` },
          ...(cursoSlug
            ? [{ clave: "curso" as const, texto: "Mi curso", href: `/curso/${cursoSlug}` }]
            : []),
          { clave: "practica" as const, texto: "Para ti", href: "/practica" },
        ]
      : [];

  const inicial = nombre?.trim()[0]?.toUpperCase() ?? "";

  return (
    <>
      {/* PEGAJOSA. Lo era ya dentro del curso —la barra vieja llevaba
          `sticky top-0`— y el lateral de lecciones cuenta con ello para
          calcular su altura. Al unificar, lo hereda el resto de
          pantallas del alumno, que es lo coherente: si la navegación
          tiene que estar siempre, que esté también después de bajar. */}
      <header className="sticky top-0 z-30 border-b border-marca-borde bg-white/[0.96] backdrop-blur-md">
        <div className="mx-auto flex h-[60px] max-w-contenido items-center gap-4 px-4 sm:h-[68px] sm:gap-10 sm:px-9">
          <Link
            href={alumnoId != null ? `/alumno/${alumnoId}` : "/"}
            className="flex shrink-0 items-center rounded-lg transition-opacity hover:opacity-70"
          >
            <Image
              src="/logo-drc.png"
              alt="DRC Academy"
              width={LOGO.ancho}
              height={LOGO.alto}
              priority
              className="h-[26px] w-auto sm:h-8"
            />
          </Link>

          {/* En escritorio, junto al logotipo. En móvil, en la barra de abajo. */}
          {enlaces.length > 0 && (
            <nav aria-label="Secciones" className="hidden h-full items-center gap-7 lg:flex">
              {enlaces.map((enlace) => (
                <Link
                  key={enlace.clave}
                  href={enlace.href}
                  aria-current={seccion === enlace.clave ? "page" : undefined}
                  className={`flex h-full items-center text-[15px] transition-colors ${
                    seccion === enlace.clave
                      ? "font-semibold text-marca-tinta shadow-[inset_0_-2px_0_#1E9E3A]"
                      : "font-medium text-marca-gris hover:text-marca-tinta"
                  }`}
                >
                  {enlace.texto}
                </Link>
              ))}
            </nav>
          )}

          {/* EL CONTEXTO DEL CURSO, EN ESCRITORIO.
              Va después de la navegación y antes de la identidad, que es
              el orden en el que se lee: dónde puedo ir, dónde estoy,
              quién soy. `min-w-0` + `truncate` para que un título largo
              se recorte en vez de empujar la navegación fuera. */}
          {contexto && (
            <div className="ml-auto hidden min-w-0 items-center gap-3 lg:flex">
              <Link
                href={cursoSlug ? `/curso/${cursoSlug}` : "#"}
                className="min-w-0 truncate text-[13.5px] font-medium text-marca-tinta transition-colors hover:text-marca-verdeOsc"
                title={contexto.titulo}
              >
                {contexto.titulo}
              </Link>
              <BarraCurso contexto={contexto} />
            </div>
          )}

          {/* `ml-auto` SIEMPRE: en móvil el bloque del contexto está
              oculto, así que si el empuje a la derecha viviera solo allí,
              el avatar se pegaría al logotipo. En escritorio con contexto
              el `lg:ml-3` lo desactiva y empuja el de arriba. */}
          <div
            className={`ml-auto flex shrink-0 items-center gap-3 sm:gap-4 ${
              contexto ? "lg:ml-3" : ""
            }`}
          >
            {nombre && (
              <form action="/salir" method="post">
                <button
                  type="submit"
                  className="rounded-full text-[13px] text-marca-gris transition-colors hover:text-marca-tinta sm:text-[14px]"
                >
                  Salir
                </button>
              </form>
            )}

            {nombre && (
              <p className="flex shrink-0 items-center gap-2.5">
                <span className="hidden text-[14px] font-medium text-marca-tinta md:inline">
                  {nombre}
                </span>
                <span
                  aria-hidden
                  className="grid h-7 w-7 place-items-center rounded-full bg-marca-tinta text-[12px] font-semibold text-white sm:h-[30px] sm:w-[30px] sm:text-[13px]"
                >
                  {inicial}
                </span>
                <span className="sr-only">Practicando como {nombre}</span>
              </p>
            )}
          </div>
        </div>

        {/* EL CONTEXTO DEL CURSO, EN MÓVIL: SEGUNDA LÍNEA.
            A 375px no caben el logotipo, el nombre del curso, el progreso
            y el avatar en una sola fila sin que algo se rompa. La
            navegación no se toca —está abajo, fija— así que lo que baja
            es el contexto, que es lo que admite bajar.

            El nombre se trunca y el progreso se reduce a la barra con el
            porcentaje: el "12 de 191" de escritorio no cabe y el
            porcentaje dice lo mismo en tres caracteres. */}
        {contexto && (
          <div className="border-t border-marca-borde bg-marca-niebla px-4 py-[7px] lg:hidden">
            <div className="mx-auto flex max-w-contenido items-center gap-2.5">
              <Link
                href={cursoSlug ? `/curso/${cursoSlug}` : "#"}
                className="min-w-0 flex-1 truncate text-[12.5px] font-medium text-marca-tinta"
              >
                {contexto.titulo}
              </Link>
              <BarraCurso contexto={contexto} compacto />
            </div>
          </div>
        )}

        {/* EN ESCRITORIO, COLGADA DE LA CABECERA. Va dentro del
            `<header>` a propósito: es lo que le da el `sticky` gratis, sin
            un segundo elemento fijo que mantener alineado con este. */}
        {diploma && <BarraDiploma {...diploma} variante="cabecera" />}
      </header>

      {/* EN MÓVIL, ABAJO Y PEGADAS. La barra y la navegación viven en el
          mismo contenedor fijo, no en dos: el borde inferior de un móvil
          ya es zona disputada —ahí puede haber también la barra de
          continuar de una lección— y dos capas flotando por separado se
          leen como dos barras en vez de como un pie. El hueco que hay que
          dejarles al final de la página lo calcula `globals.css` mirando
          cuál de las dos está puesta. */}
      {enlaces.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 lg:hidden">
          {diploma && <BarraDiploma {...diploma} variante="pie" />}
          <NavegacionInferior enlaces={enlaces} seccion={seccion} />
        </div>
      )}

      {/* LA AYUDA VIVE AQUÍ Y NO EN EL LAYOUT porque su condición es la
          misma que la de la navegación: hay alumno. El equipo entra por
          el buscador y su soporte no es un WhatsApp, y la pantalla de
          acceso no tiene ni cabecera. Montándola en esta barra sale en
          las tres pantallas del alumno sin que ninguna se acuerde de
          ponerla. */}
      {enlaces.length > 0 && <ChatAyuda nombre={nombre?.trim() ?? ""} />}
    </>
  );
}

/**
 * El progreso del curso: barra y cifra.
 *
 * En escritorio la cifra es "12 de 191 lecciones", que es lo que de
 * verdad orienta. En móvil no cabe y se reduce al porcentaje, que ocupa
 * tres caracteres y dice lo mismo con menos precisión. La barra es la
 * misma en los dos: es la que se lee de un vistazo.
 */
function BarraCurso({ contexto, compacto }: { contexto: ContextoCurso; compacto?: boolean }) {
  const porcentaje =
    contexto.total > 0 ? Math.round((contexto.completadas / contexto.total) * 100) : 0;

  return (
    <div className="flex shrink-0 items-center gap-2">
      <div
        className={`overflow-hidden rounded-[3px] bg-marca-pista ${
          compacto ? "h-[5px] w-16" : "h-[5px] w-[120px]"
        }`}
        role="progressbar"
        aria-valuenow={porcentaje}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Progreso en ${contexto.titulo}`}
      >
        <div className="h-full rounded-[3px] bg-marca-verde" style={{ width: `${porcentaje}%` }} />
      </div>

      {compacto ? (
        <span className="text-[11.5px] font-semibold text-marca-gris tabular-nums">
          {porcentaje}%
        </span>
      ) : (
        <span className="whitespace-nowrap text-[13px] text-marca-grisSuave tabular-nums">
          {contexto.completadas} de {contexto.total} lecciones
        </span>
      )}
    </div>
  );
}

/**
 * La barra de abajo, solo en móvil.
 *
 * NO SE POSICIONA SOLA: la fija el contenedor de arriba, que es el que
 * la agrupa con la barra del diploma para que las dos se lean como un
 * único pie. Antes llevaba aquí su propio `fixed inset-x-0 bottom-0`, y
 * con dos elementos fijos hermanos había que mantener a mano la
 * distancia entre ellos.
 *
 * El hueco al final de la página lo reserva `globals.css` mirando si
 * esta barra existe, para que ninguna pantalla tenga que acordarse.
 *
 * Los iconos son SVG a mano, de un solo trazo y sin librería: son tres.
 */
function NavegacionInferior({
  enlaces,
  seccion,
}: {
  enlaces: { clave: SeccionActiva; texto: string; href: string }[];
  seccion?: SeccionActiva;
}) {
  return (
    <nav
      aria-label="Secciones"
      data-nav-inferior
      className="grid border-t border-marca-borde bg-white/[0.96] px-1 pb-3.5 pt-2 backdrop-blur-md"
      style={{ gridTemplateColumns: `repeat(${enlaces.length}, minmax(0, 1fr))` }}
    >
      {enlaces.map((enlace) => {
        const activo = seccion === enlace.clave;
        return (
          <Link
            key={enlace.clave}
            href={enlace.href}
            aria-current={activo ? "page" : undefined}
            className={`flex min-h-[44px] flex-col items-center justify-center gap-[5px] text-[12px] transition-colors ${
              activo ? "font-semibold text-marca-tinta" : "font-medium text-marca-grisSuave"
            }`}
          >
            <Icono seccion={enlace.clave} activo={activo} />
            {enlace.texto}
          </Link>
        );
      })}
    </nav>
  );
}

function Icono({ seccion, activo }: { seccion: SeccionActiva; activo: boolean }) {
  // Relleno verde cuando es la sección actual; contorno gris cuando no.
  const trazo = activo ? "#1E9E3A" : "#B7C4BC";
  const relleno = activo ? "#1E9E3A" : "none";

  return (
    <svg
      aria-hidden
      viewBox="0 0 18 18"
      className="h-[18px] w-[18px]"
      fill="none"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {seccion === "inicio" && (
        <path d="M2.5 7.2 9 2.2l6.5 5v7.3a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1V7.2Z" stroke={trazo} fill={relleno} />
      )}
      {seccion === "curso" && (
        <path d="M2.5 3.6h4.2c1.3 0 2.3 1 2.3 2.2v8.6c0-1-.9-1.8-2-1.8H2.5V3.6Zm13 0h-4.2c-1.3 0-2.3 1-2.3 2.2v8.6c0-1 .9-1.8 2-1.8h4.5V3.6Z" stroke={trazo} fill={relleno} />
      )}
      {seccion === "practica" && (
        <>
          <circle cx="9" cy="9" r="6.5" stroke={trazo} fill={relleno} />
          <path d="M9 5.6v3.6l2.3 1.4" stroke={activo ? "#FFFFFF" : trazo} />
        </>
      )}
    </svg>
  );
}
