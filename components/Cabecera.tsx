import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import ChatAyuda from "@/components/ChatAyuda";
import { conFoco } from "@/lib/foco";
import { textosActuales } from "@/lib/idioma-servidor";
import BotonIdioma from "@/components/BotonIdioma";
import type { TextosNavegacion } from "@/lib/textos/navegacion";
import { Icono, type EnlaceSeccion, type SeccionActiva } from "@/components/IconoSeccion";

export type { SeccionActiva, EnlaceSeccion } from "@/components/IconoSeccion";

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
 * Cuatro secciones para el alumno —Inicio, Mi curso, Para ti y su
 * progreso— porque el producto son tres cosas que conviven: el curso
 * enseña contenido estructurado, "Para ti" genera ejercicios a partir de
 * su perfil y de sus clases, y el progreso le devuelve lo que su
 * profesor ha escrito de él clase a clase. Si la navegación solo
 * nombrara una, las otras parecerían un anexo.
 *
 * LA CUARTA ES LA QUE MENOS SE PARECE A LAS DEMÁS, y por eso va la
 * última: en las tres primeras el alumno HACE algo y en esta lee. Es
 * también la única que no nació aquí —vivía en DRC Gestión, detrás de un
 * enlace que había que pedirle al profesor—, así que hasta ahora la
 * mayoría de los alumnos no sabía que existía.
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
 * EL EQUIPO SÍ VE LA NAVEGACIÓN, y antes no. Cuando entraba en una ficha
 * se quedaba en el inicio: sin `alumnoId` no había enlaces, así que "Mi
 * curso" y "Para ti" no existían y el producto solo se podía revisar por
 * la mitad. Ahora `alumnoId` es EL ALUMNO DEL QUE HABLA LA PANTALLA —el
 * revisado, no el de la sesión— y las cuatro secciones aparecen igual,
 * con `foco` colgando de cada enlace para que sigan apuntando a esa
 * persona y no salten a la identidad de quien mira.
 *
 * En el buscador sigue sin haber navegación, y es lo correcto: ahí
 * todavía no hay ningún alumno del que hablar.
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
  /** Del que sale el enlace del título, que sí lleva al temario. */
  slug: string;
  titulo: string;
  completadas: number;
  total: number;
};

/**
 * Las cinco secciones del alumno, como enlaces.
 *
 * Los calcula la cabecera desde siempre; ahora también los pide la barra
 * de iconos de la lección, que es la misma navegación con otra forma.
 * Una sola lista para las dos, y así no pueden decir cosas distintas.
 *
 * «MI CURSO» RECIBE SU DESTINO HECHO, no el slug. Ya no lleva al temario
 * sino a la lección por la que va el alumno —o al temario cuando no hay
 * lección a la que ir—, y esa decisión vive en `rutaDeMiCurso`
 * (`lib/cursos.ts`), que es la misma que usa el botón del inicio. Aquí
 * solo se pinta lo que llega: si la cabecera calculara la ruta, habría
 * dos sitios decidiendo a dónde va el alumno.
 */
export function enlacesDeSecciones({
  alumnoId,
  miCurso,
  foco,
  t,
}: {
  alumnoId?: string | null;
  /** La ruta de la pestaña, sin foco. Sin ella, la pestaña no se pinta. */
  miCurso?: string | null;
  foco?: string | null;
  t: TextosNavegacion;
}): EnlaceSeccion[] {
  if (alumnoId == null) return [];

  return [
    { clave: "inicio" as const, texto: t.inicio, href: `/alumno/${alumnoId}` },
    // CLASES VA LA SEGUNDA, y es lo único de este orden que no es
    // histórico. Las otras tres son estudio por su cuenta y se pueden
    // hacer a cualquier hora; esta tiene un botón que importa a una hora
    // concreta, así que se pone donde se llega sin buscar. Mover la
    // línea de sitio es todo lo que hace falta para cambiar de opinión.
    //
    // SE PINTA SIEMPRE, al revés que «Mi curso», que desaparece cuando
    // no hay curso. Aquí no hace falta la condición: los 205 alumnos
    // tienen horario, y el que algún día no lo tenga encuentra la
    // pantalla explicándoselo en vez de una pestaña que se esfumó.
    { clave: "clases" as const, texto: t.clases, href: "/clases" },
    ...(miCurso ? [{ clave: "curso" as const, texto: t.miCurso, href: miCurso }] : []),
    { clave: "practica" as const, texto: t.paraTi, href: "/practica" },
    // NOMBRE PROVISIONAL. "Mi ficha" quedó descartado —suena a
    // expediente administrativo y el contenido es justo lo
    // contrario— y el definitivo está sin decidir. Se cambia en
    // esta línea, con un límite medido: a 320px cada celda de la
    // barra inferior mide 77,5px, así que la etiqueta no pasa de
    // unos 12 caracteres a 12px sin tocar a la de al lado.
    { clave: "progreso" as const, texto: t.miProgreso, href: "/progreso" },
  ].map((enlace) => ({ ...enlace, href: conFoco(enlace.href, foco ?? null) }));
}

export default function Cabecera({
  nombre,
  alumnoId,
  miCurso,
  seccion,
  contexto,
  foco = null,
  revisando = false,
}: {
  nombre?: string;
  /**
   * EL ALUMNO DEL QUE HABLA LA PANTALLA, que no siempre es el de la
   * sesión: cuando el equipo revisa una ficha es el alumno revisado.
   * null solo cuando no hay ninguno —el equipo en el buscador—, y
   * entonces no hay secciones que ofrecer.
   */
  alumnoId?: string | null;
  /**
   * A dónde lleva "Mi curso": `rutaDeMiCurso` del curso principal del
   * alumno. Sin ella, el enlace no se pinta.
   */
  miCurso?: string | null;
  seccion?: SeccionActiva;
  /**
   * Nombre y progreso del curso, solo dentro de él. Se AÑADE a la
   * navegación, nunca la sustituye: perderla al entrar en el curso es el
   * fallo que esto viene a arreglar.
   */
  contexto?: ContextoCurso | null;
  /**
   * El contexto de revisión que tienen que conservar los enlaces, o null
   * cuando es el alumno en su propio producto. Ver `lib/foco.ts`.
   */
  foco?: string | null;
  /** Pinta la tira de revisión y cambia lo que dice la identidad. */
  revisando?: boolean;
}) {
  const t = textosActuales().navegacion;
  const enlaces = enlacesDeSecciones({ alumnoId, miCurso, foco, t });

  const inicial = nombre?.trim()[0]?.toUpperCase() ?? "";

  // Dentro del curso, el título y la barra enlazan AL TEMARIO, aunque la
  // pestaña ya no: el título nombra el curso entero y el temario es
  // donde está entero. Se calcula una vez: lo pintan la fila de
  // escritorio y la de móvil.
  const hrefCurso = contexto ? conFoco(`/curso/${contexto.slug}`, foco) : "#";

  return (
    <>
      {/* PEGAJOSA. Lo era ya dentro del curso —la barra vieja llevaba
          `sticky top-0`— y el lateral de lecciones cuenta con ello para
          calcular su altura. Al unificar, lo hereda el resto de
          pantallas del alumno, que es lo coherente: si la navegación
          tiene que estar siempre, que esté también después de bajar. */}
      <header className="sticky top-0 z-30 border-b border-marca-borde bg-white/[0.96] backdrop-blur-md">
        <div className="mx-auto flex h-[60px] max-w-contenido items-center gap-4 px-4 sm:h-[68px] sm:gap-10 sm:px-9">
          {/* EL LOGOTIPO LLEVA AL INICIO, que es la convención de toda la
              web y aquí además es la única salida que cabe en la
              cabecera de móvil. Ya enlazaba antes; lo que cambia es que
              ahora conserva el contexto de revisión, así que al equipo
              no le devuelve a su buscador a mitad de una ficha. */}
          <Link
            href={alumnoId != null ? conFoco(`/alumno/${alumnoId}`, foco) : "/"}
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
            <nav aria-label={t.secciones} className="hidden h-full items-center gap-7 min-[900px]:flex">
              {enlaces.map((enlace) => (
                <Link
                  key={enlace.clave}
                  href={enlace.href}
                  aria-current={seccion === enlace.clave ? "page" : undefined}
                  // `whitespace-nowrap` Y `shrink-0`: SIN ELLOS LA
                  // NAVEGACIÓN SE PARTE. Estos enlaces y el título del
                  // curso comparten fila, y cuando no caben los dos cede
                  // el que puede: sin esto, "Mi curso" y "Para ti" se
                  // rompían en dos líneas a 1024px con un título largo
                  // —pasaba ya con tres secciones— mientras el título se
                  // quedaba entero. Quien tiene que ceder es el título,
                  // que para eso lleva `min-w-0 truncate`.
                  className={`flex h-full shrink-0 items-center whitespace-nowrap text-[15px] transition-colors ${
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
            <div className="ml-auto hidden min-w-0 items-center gap-3 min-[900px]:flex">
              <Link
                href={hrefCurso}
                className="min-w-0 truncate text-[13.5px] font-medium text-marca-tinta transition-colors hover:text-marca-verdeOsc"
                title={contexto.titulo}
              >
                {contexto.titulo}
              </Link>
              <BarraCurso contexto={contexto} t={t} />
            </div>
          )}

          {/* `ml-auto` SIEMPRE: en móvil el bloque del contexto está
              oculto, así que si el empuje a la derecha viviera solo allí,
              el avatar se pegaría al logotipo. En escritorio con contexto
              el `min-[900px]:ml-3` lo desactiva y empuja el de arriba. */}
          <div
            className={`ml-auto flex shrink-0 items-center gap-3 sm:gap-4 ${
              contexto ? "min-[900px]:ml-3" : ""
            }`}
          >
            {/* EL IDIOMA, ANTES QUE LA SALIDA Y QUE LA IDENTIDAD.
                Es lo único de esta esquina que cambia lo que el alumno
                LEE, y las otras dos cambian quién es o le sacan; puestas
                al revés, el botón que se usa a diario quedaría detrás
                del que se usa una vez.

                Va en la cabecera y no dentro de cada pantalla porque la
                preferencia es de toda la aplicación: antes había uno en
                el visor y otro en cada cierre, y eran tres sitios para
                pedir lo mismo. */}
            <BotonIdioma />

            {nombre && (
              <form action="/salir" method="post">
                <button
                  type="submit"
                  className="rounded-full text-[13px] text-marca-gris transition-colors hover:text-marca-tinta sm:text-[14px]"
                >
                  {t.salir}
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
                {/* El avatar lleva la inicial del alumno del que habla la
                    pantalla, así que en revisión NO es "practicando
                    como": quien mira no es esa persona y un lector de
                    pantalla no tiene la tira de arriba a la vista. */}
                <span className="sr-only">
                  {revisando ? t.fichaEnRevision(nombre) : t.practicandoComo(nombre)}
                </span>
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
          <div className="border-t border-marca-borde bg-marca-niebla px-4 py-[7px] min-[900px]:hidden">
            <div className="mx-auto flex max-w-contenido items-center gap-2.5">
              <Link
                href={hrefCurso}
                className="min-w-0 flex-1 truncate text-[12.5px] font-medium text-marca-tinta"
              >
                {contexto.titulo}
              </Link>
              <BarraCurso contexto={contexto} compacto t={t} />
            </div>
          </div>
        )}
        {/* LA TIRA DE REVISIÓN, LA ÚLTIMA FILA DE LA CABECERA.
            Va aquí dentro y no en cada página a propósito: es la única
            forma de que salga en TODAS —inicio, temario, lección,
            bloque, "Para ti" y "Mi progreso"— sin que ninguna tenga que
            acordarse. Antes esto era un aviso suelto dentro de la
            lección, así que el equipo sabía que estaba revisando en la
            única pantalla donde ya era evidente y no lo sabía en
            ninguna de las otras.

            Y ES PARTE DE LA CABECERA PEGAJOSA, así que no se va con el
            scroll: de quién es la ficha no es un dato que se lea una vez
            al entrar, es el que evita confundir a dos alumnos después de
            veinte minutos saltando entre fichas. */}
        {revisando && <TiraRevision nombre={nombre} t={t} />}
      </header>

      {enlaces.length > 0 && (
        <NavegacionInferior enlaces={enlaces} seccion={seccion} secciones={t.secciones} />
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
 * De quién es la ficha, que es una revisión, y cómo salir de ella.
 *
 * LAS TRES COSAS EN UNA FILA, y las tres hacen falta:
 *
 *   · EL NOMBRE, porque revisar es saltar de ficha en ficha y a la
 *     tercera ya no se sabe cuál está abierta. Va en negrita y primero.
 *   · QUE NADA SE GUARDA, porque el equipo está a punto de pulsar
 *     "Marcar como completada" en el curso de otra persona y tiene
 *     derecho a saber que eso no le toca el progreso. La regla la
 *     cumplen las rutas que escriben, cada una mirando la cookie; esto
 *     es contarlo, no imponerlo.
 *   · LA SALIDA AL BUSCADOR, porque es la única que no depende de en qué
 *     pantalla esté: dentro de una lección no hay ningún otro enlace que
 *     lleve fuera del alumno.
 *
 * EN ÁMBAR Y NO EN VERDE. El verde es el color de las acciones del
 * alumno en todo el producto; esta barra dice justo lo contrario —que lo
 * que se ve no es de quien mira— y tiene que leerse como una advertencia
 * suave. Es la misma pareja de tonos que ya usaba el aviso de la
 * lección, que es lo que esto sustituye.
 */
export function TiraRevision({ nombre, t }: { nombre?: string; t: TextosNavegacion }) {
  const quien = nombre?.trim();

  return (
    <div className="border-t border-marca-examenBorde bg-marca-examen">
      <div className="mx-auto flex max-w-contenido items-center gap-x-3 gap-y-1 px-4 py-[7px] sm:px-9">
        <span aria-hidden className="h-2 w-2 shrink-0 rounded-full bg-marca-amarillo" />

        <p className="min-w-0 flex-1 truncate text-[12.5px] leading-[1.35] text-marca-tinta sm:text-[13px]">
          {/* Sin nombre —un alumno con clases y sin fila en la vista de
              perfiles— se dice igual que es una revisión: perder el
              nombre no puede hacer que el aviso desaparezca. */}
          <strong className="font-semibold">
            {quien ? t.revisandoLaFichaDe(quien) : t.revisandoUnaFicha}
          </strong>
          <span className="hidden sm:inline"> {t.nadaSeGuarda}</span>
        </p>

        <Link
          href="/"
          className="shrink-0 whitespace-nowrap text-[12.5px] font-semibold text-marca-verdeOsc underline-offset-4 transition-colors hover:underline sm:text-[13px]"
        >
          {t.salirDeLaRevision}
        </Link>
      </div>
    </div>
  );
}

/**
 * El progreso del curso: barra y porcentaje.
 *
 * EL PORCENTAJE EN LOS DOS ANCHOS. En escritorio decía "12 de 191
 * lecciones", y ese recuento lo da ahora el banner del diploma —dos
 * dedos más abajo dentro del curso, y en el inicio— con la aritmética
 * del revés: lo que falta. Tenerlo aquí además era la tercera cuenta del
 * mismo avance en la misma pantalla.
 *
 * La barra se queda porque hace otro trabajo: esta cabecera es pegajosa,
 * así que es lo único que orienta cuando el alumno está a mitad de una
 * lección o abajo del todo del temario. Y el porcentaje, que ocupa tres
 * caracteres, basta para eso.
 */
function BarraCurso({
  contexto,
  compacto,
  t,
}: {
  contexto: ContextoCurso;
  compacto?: boolean;
  t: TextosNavegacion;
}) {
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
        aria-label={t.progresoEnCurso(contexto.titulo, contexto.completadas, contexto.total)}
      >
        <div className="h-full rounded-[3px] bg-marca-verde" style={{ width: `${porcentaje}%` }} />
      </div>

      <span
        className={`font-semibold tabular-nums ${
          // El mismo caso que las etiquetas de la barra de abajo: a 12px,
          // `grisSuave` se queda en 3,65:1 y AA pide 4,5:1. La variante
          // compacta ya iba en `gris`; la de escritorio se había quedado
          // atrás.
          compacto ? "text-[11.5px] text-marca-gris" : "text-[12px] text-marca-gris"
        }`}
      >
        {porcentaje}%
      </span>
    </div>
  );
}

/**
 * La barra de abajo, solo en móvil.
 *
 * `fixed` y no `sticky`. La cabecera se pinta ANTES del contenido de
 * cada página, así que un `sticky` colocaría la barra en el flujo justo
 * debajo del logotipo: se vería abajo, sí, pero dejaría una banda vacía
 * de 60px bajo la cabecera. Fija, da igual dónde esté en el DOM.
 *
 * El hueco al final de la página lo reserva `globals.css` mirando si
 * esta barra existe, para que ninguna pantalla tenga que acordarse.
 *
 * Los iconos son SVG a mano, de un solo trazo y sin librería: son cuatro.
 */
export function NavegacionInferior({
  enlaces,
  seccion,
  secciones,
  extra,
}: {
  enlaces: EnlaceSeccion[];
  seccion?: SeccionActiva;
  secciones: string;
  /**
   * Una quinta celda, después de las secciones. La usa la lección, que
   * en móvil no tiene cabecera y necesita un sitio para el perfil —el
   * nombre, el idioma y la salida—. Es un nodo y no un enlace porque
   * abre algo en la misma pantalla en vez de llevar a otra.
   */
  extra?: ReactNode;
}) {
  // Dónde cae la sección actual dentro de la fila. -1 cuando no hay
  // ninguna marcada, y entonces no se pinta la marca.
  const indice = enlaces.findIndex((enlace) => enlace.clave === seccion);
  const celdas = enlaces.length + (extra ? 1 : 0);

  return (
    <nav
      aria-label={secciones}
      data-nav-inferior
      className="fixed inset-x-0 bottom-0 z-40 grid border-t border-marca-borde bg-white/[0.96] px-1 pb-3.5 pt-2 backdrop-blur-md min-[900px]:hidden"
      style={{ gridTemplateColumns: `repeat(${celdas}, minmax(0, 1fr))` }}
    >
      {/* ---------------------------------------------------------------
          LA MARCA QUE SE DESLIZA

          Antes la sección activa solo cambiaba de color y de peso, así
          que al cambiar de pestaña el cambio ocurría en dos sitios a la
          vez sin nada que los uniera: se apagaba una y se encendía otra.
          Esto pone una sola marca que VIAJA, y con ella el cambio de
          sección deja de ser un parpadeo y pasa a ser un movimiento con
          dirección —de dónde vienes y a dónde vas—.

          SIN MEDIR NADA EN JAVASCRIPT. La rejilla es de columnas iguales
          (`repeat(N, minmax(0,1fr))`), así que la marca mide `100/N` por
          ciento y se desplaza `índice × 100%` de su propio ancho. Es
          exacto por construcción y sobrevive a que cambie el número de
          secciones: hoy son cuatro y con tres seguiría cuadrando.

          Va en `transform`, que es lo único que se puede mover sin tocar
          disposición. Y `aria-hidden` porque no dice nada que no diga ya
          el `aria-current` del enlace: para un lector de pantalla esto
          sería ruido repetido.
          --------------------------------------------------------------- */}
      {indice >= 0 && (
        <span
          aria-hidden
          className="pointer-events-none absolute left-0 top-0 h-[3px] rounded-b-full bg-marca-verde transition-transform duration-[220ms] ease-[var(--ease-salida)]"
          style={{
            width: `${100 / celdas}%`,
            transform: `translateX(${indice * 100}%)`,
          }}
        />
      )}

      {enlaces.map((enlace) => {
        const activo = seccion === enlace.clave;
        return (
          <Link
            key={enlace.clave}
            href={enlace.href}
            aria-current={activo ? "page" : undefined}
            className={`flex min-h-[44px] flex-col items-center justify-center gap-[5px] text-[12px] transition-colors ${
              // LA SECCIÓN EN LA QUE NO ESTÁS TAMBIÉN HAY QUE PODER LEERLA.
              // Esto era `grisSuave` #7A8A80, que a 12px da 3,65:1 sobre
              // el blanco de la barra: por debajo del 4,5:1 que pide AA.
              // Y no es un texto cualquiera —es la navegación entera en
              // móvil— ni un público cualquiera: hay alumnos de sesenta
              // años. `gris` #5F6F66 da 5,33:1 y sigue leyéndose como
              // apagado al lado de la tinta de la sección activa.
              activo ? "font-semibold text-marca-tinta" : "font-medium text-marca-gris"
            }`}
          >
            <Icono seccion={enlace.clave} activo={activo} />
            {/* GUARDARRAÍL, no una solución. Las cuatro etiquetas de hoy
                caben con holgura hasta 320px —está medido—, pero la
                rejilla es `minmax(0,1fr)` y sin esto una etiqueta larga
                desbordaría su celda por encima de la vecina en vez de
                recortarse. */}
            <span className="max-w-full truncate">{enlace.texto}</span>
          </Link>
        );
      })}
      {extra}
    </nav>
  );
}

