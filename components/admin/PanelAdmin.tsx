import Link from "next/link";
import type { DatosPanel } from "@/lib/admin-servidor";
import {
  ETIQUETA_PERIODO,
  ORDEN_POR_DEFECTO,
  PERIODOS,
  type Orden,
  type Periodo,
  type Vista,
} from "@/lib/admin-servidor";
import Chevron from "@/components/admin/Chevron";

/**
 * LAS MÉTRICAS DEL PANEL DEL EQUIPO.
 *
 * ---------------------------------------------------------------
 * DOS BLOQUES, Y NINGUNO DESPLIEGA NADA
 *
 * Tenía cuatro secciones con su título y su párrafo —Acceso, Adopción,
 * Uso por modo, Requieren atención— y dentro de cada una, tarjetas que
 * abrían su lista de alumnos EN LÍNEA. Dos problemas de una vez: había
 * que bajar para ver todas las cifras, y abrir cualquiera empujaba
 * media página hacia abajo.
 *
 * Ahora son tres bloques y caben juntos en la primera pantalla:
 *
 *   EL EMBUDO   dónde se pierde la gente. Las cifras de adopción, una
 *               debajo de otra y contra el mismo total. Tres tarjetas
 *               del mismo tamaño no dicen dónde está la caída; tres
 *               filas apiladas con su barra, sí.
 *
 *   LO QUE      qué sabemos del alumno: si su ficha está entera y si
 *   SABEMOS     alguien ha medido su nivel. Mismas filas y misma barra
 *               que el embudo, en la misma tarjeta y detrás de una raya.
 *               No son peldaños de aquel —no van después ni dependen de
 *               él—, y por eso no se leen como una caída más.
 *
 *   LAS PILAS   a quién hay que ir a buscar. Aquí el panel deja de
 *               informar y empieza a servir: cada una es un montón de
 *               gente con un motivo y un siguiente paso.
 *
 * LAS DOS MITADES DE LA MISMA PREGUNTA VIVEN EN BLOQUES DISTINTOS, y es
 * deliberado: «ficha al día» arriba y «sin perfil completado» abajo son
 * el mismo corte visto por sus dos caras. Arriba se mira para saber cómo
 * va la cosa; abajo se pincha para repartir trabajo, y solo esa lista
 * lleva la columna de cuánto lleva esperando cada uno. Igual con «nivel
 * medido» y «sin el nivel medido».
 *
 * Y NADA SE DESPLIEGA. Cada métrica es un enlace que FILTRA la única
 * lista que hay debajo, así que este bloque conserva su altura para
 * siempre y lo único que cambia es el contenido de una caja que ya
 * estaba en pantalla. Ver `components/admin/ListaPanel.tsx`.
 *
 * ---------------------------------------------------------------
 * EN MÓVIL SE MIRA, NO SE TRABAJA
 *
 * A 375px el mismo panel medía 1.500px hasta llegar a la lista. La regla
 * que lo recorta: si algo explica el panel a quien no lo conoce, sobra
 * —lo usan cuatro personas cada día—; si sirve para repartir trabajo,
 * es de escritorio. Con ella:
 *
 *   SIETE CIFRAS EN UNA PANTALLA. Las mismas tres filas del embudo y las
 *   cuatro pilas, pero las pilas dejan de ser tarjetas y pasan a filas
 *   de una tarjeta. Una tarjeta apilada cuesta 120px; una fila, 46.
 *
 *   LA BARRA VA DEBAJO DEL NOMBRE, a ancho completo. Delante, como en
 *   escritorio, mediría 40px y dejaría de ser una barra.
 *
 *   SOLO EL EMBUDO LLEVA BARRA. Es una caída contra el mismo total y la
 *   barra la dibuja. En las pilas decoraba, y quitarla es lo que deja a
 *   la única de color como lo primero que se ve.
 *
 *   «LO QUE SABEMOS» NO SALE. Es la cara positiva de dos pilas, y en el
 *   móvil pagar dos veces el mismo dato es justo lo que no cabe. El
 *   desglose de quién midió el nivel es análisis, y el análisis se hace
 *   sentado.
 *
 *   EL PERIODO ENTRA EN LA TARJETA DEL EMBUDO, porque solo gobierna esas
 *   tres filas: «nunca» cuenta siempre desde el principio, y la ficha o
 *   el nivel sin medir son estados, no ventanas. En escritorio sigue
 *   encima de todo; ahí hay sitio para el rótulo y el hábito ya está
 *   hecho. Son dos copias del mismo selector, una por tamaño.
 *
 * Todo son clases responsive: bajo `lg:` no hay nada que en escritorio
 * no estuviera ya. El estado «seleccionado» de una fila solo se pinta en
 * escritorio: en móvil, cuando hay una métrica abierta, este bloque
 * entero está oculto y la lista ocupa su sitio (ver `app/page.tsx`).
 *
 * ---------------------------------------------------------------
 * LO QUE SE FUE
 *
 * EL DESGLOSE DE ACCESO. «Entraron con el enlace» y «entraron por
 * WooCommerce» eran la misma pregunta partida en dos, y al equipo no le
 * cambia nada por dónde entró alguien: queda «Entraron», que es la
 * primera fila del embudo. Con ellas se fueron «enlaces enviados» —el
 * denominador de una conversión que ya no se enseña— y «no llegaron a
 * entrar», y con esta última la lectura entera de `intentos_acceso`.
 *
 * EL USO POR MODO. Contaba cuatro modos de generación de los que hoy
 * solo se genera uno; los otros tres estaban marcados como retirados y
 * seguían ocupando una sección entera. Con un solo modo vivo, «cuántos
 * bloques se generaron» es exactamente la segunda fila del embudo.
 *
 * Se renderiza en el servidor: la vista y el periodo viajan en la URL.
 */
export default function PanelAdmin({
  datos,
  periodo,
  vista,
  orden,
  busqueda,
}: {
  datos: DatosPanel;
  periodo: Periodo;
  /** La métrica seleccionada. Pinta el estado y decide la lista. */
  vista: Vista;
  /**
   * El sentido de la columna de espera. Aquí no se pinta nada con él
   * —lo pone y lo cambia la cabecera de la lista—, pero los enlaces lo
   * arrastran: cambiar de periodo no es motivo para reordenar la lista
   * que estabas leyendo.
   */
  orden: Orden;
  /** Se conserva al cambiar de métrica o de periodo. */
  busqueda: string;
}) {
  const { adopcion, atencion, incompleto } = datos;
  const total = adopcion.totalActivos;

  /** Un enlace que cambia una cosa y conserva las otras tres. */
  const href = (cambio: { periodo?: Periodo; vista?: Vista }) => {
    const p = new URLSearchParams();
    p.set("periodo", cambio.periodo ?? periodo);
    p.set("ver", cambio.vista ?? vista);
    if (busqueda) p.set("q", busqueda);
    if (orden !== ORDEN_POR_DEFECTO) p.set("orden", orden);
    return `/?${p.toString()}`;
  };

  /**
   * El selector de periodo. Se pinta dos veces —arriba en escritorio,
   * dentro de la tarjeta del embudo en móvil— y por eso está aquí una
   * sola vez. En móvil se estira a las tres columnas: a 375px, tres
   * píldoras encogidas dejan aire muerto a los lados.
   */
  const selector = (
    <div className="grid grid-cols-3 gap-0.5 rounded-full border border-marca-borde bg-white p-[3px] lg:inline-flex">
      {PERIODOS.map((p) => (
        <Link
          key={p}
          href={href({ periodo: p })}
          aria-current={p === periodo ? "true" : undefined}
          className={`inline-flex h-[30px] items-center justify-center rounded-full px-3.5 text-[13px] font-semibold transition-colors ${
            p === periodo
              ? "bg-marca-tinta text-white"
              : "text-marca-gris hover:text-marca-tinta"
          }`}
        >
          {p === "todo" ? "Todo" : `${p} días`}
        </Link>
      ))}
    </div>
  );

  return (
    <div>
      {/* ------------------------- EL PERIODO -------------------------
          Solo en escritorio: en móvil va dentro de la tarjeta de abajo,
          sin rótulo, porque el segmento seleccionado ya dice lo mismo. */}
      <div className="hidden flex-wrap items-center justify-between gap-3 lg:flex">
        <p className="text-[10.5px] font-semibold uppercase leading-none tracking-[0.12em] text-marca-grisSuave">
          {ETIQUETA_PERIODO[periodo]}
        </p>
        {selector}
      </div>

      {incompleto && (
        <p className="rounded-[12px] border border-marca-examenBorde bg-marca-examen px-4 py-3 text-[13px] leading-[1.45] text-marca-amarilloTexto lg:mt-3">
          Alguna lectura ha fallado, así que estas cifras están incompletas. No son ceros: son
          datos que no hemos podido leer.
        </p>
      )}

      {/* ------------------------- EL EMBUDO -------------------------
          El «al día» NO se mide contra el total y por eso lo dice: solo
          puede estar al día quien tiene algo abierto. Compararlo con
          177 sería contar como retraso a quien está esperando. */}
      <section className="mt-3 rounded-[16px] border border-marca-borde bg-white px-4 pb-1 pt-3 lg:mt-4 lg:p-[22px]">
        <div className="lg:hidden">{selector}</div>

        <div className="mt-3 flex flex-wrap items-baseline justify-between gap-3 lg:mt-0">
          <p className="text-[10.5px] font-semibold uppercase leading-none tracking-[0.12em] text-marca-grisSuave">
            El recorrido, de {total} alumnos activos
          </p>
          {/* En móvil lo dice la flecha de cada fila. */}
          <p className="hidden text-[12px] text-marca-grisTenue lg:block">
            Pulsa cualquier fila para ver quiénes son
          </p>
        </div>

        <div className="mt-1.5 flex flex-col lg:mt-3.5 lg:gap-[3px]">
          <Paso
            href={href({ vista: "entraron" })}
            activo={vista === "entraron"}
            titulo="Entraron"
            valor={adopcion.entraron.length}
            de={total}
          />
          <Paso
            href={href({ vista: "generaron" })}
            activo={vista === "generaron"}
            titulo="Generaron práctica"
            valor={adopcion.generaron.length}
            de={total}
          />
          <Paso
            href={href({ vista: "alDia" })}
            activo={vista === "alDia"}
            titulo="Al día con lo abierto"
            valor={adopcion.alDia.length}
            de={adopcion.conContenidoAbierto}
            baseDistinta
          />
        </div>

        {/* ------------------- LO QUE SABEMOS DE ELLOS -------------------
            Mismo trato que el embudo —cifra, barra y proporción sobre el
            total— pero SEPARADO por una raya, porque no son peldaños de
            lo mismo. El embudo se lee de arriba abajo como una caída:
            entraron, generaron, están al día. Estas dos no van después de
            aquellas ni dependen de ellas; miden lo que la academia sabe
            del alumno, y meterlas en la misma pila haría leer una pérdida
            donde no la hay.

            Las dos van contra el total y no contra un subconjunto: la
            ficha y la prueba se le pueden pedir a cualquiera, así que
            aquí no hay «denominador honesto» que buscar como en el al
            día.

            Solo en escritorio: son la cara positiva de dos pilas, y en
            móvil la pila es la que sirve. */}
        <div className="mt-4 hidden border-t border-marca-borde pt-3.5 lg:block">
          <p className="text-[10.5px] font-semibold uppercase leading-none tracking-[0.12em] text-marca-grisSuave">
            Lo que sabemos de ellos
          </p>

          <div className="mt-2.5 flex flex-col gap-[3px]">
            <Paso
              href={href({ vista: "fichaAlDia" })}
              activo={vista === "fichaAlDia"}
              titulo="Ficha al día"
              detalle="Ocupación y objetivo rellenos"
              valor={adopcion.fichaAlDia.length}
              de={total}
            />
            <Paso
              href={href({ vista: "nivelMedido" })}
              activo={vista === "nivelMedido"}
              titulo="Nivel medido"
              detalle={desgloseDelNivel(adopcion)}
              valor={adopcion.nivelMedido.length}
              de={total}
            />
          </div>
        </div>
      </section>

      {/* ------------------------- LAS PILAS -------------------------
          En móvil, el «desde el principio» junto al rótulo cierra la
          duda que abre haber metido el periodo en la tarjeta de arriba:
          estas cuatro no cambian con él. */}
      <section className="mt-4 lg:mt-5">
        <div className="flex items-baseline justify-between gap-3 px-0.5 lg:block lg:px-0">
          <p className="text-[10.5px] font-semibold uppercase leading-none tracking-[0.12em] text-marca-grisSuave">
            A quién hay que ir a buscar
          </p>
          <span className="text-[11.5px] text-marca-grisTenue lg:hidden">Desde el principio</span>
        </div>

        {/* Una tarjeta con cuatro filas en móvil; cuatro tarjetas en
            escritorio. El paso intermedio de dos columnas se fue con
            las filas: en una tableta también se lee mejor la lista. */}
        <div className="mt-2 overflow-hidden rounded-[16px] border border-marca-borde bg-white lg:mt-2.5 lg:grid lg:grid-cols-4 lg:gap-3 lg:overflow-visible lg:rounded-none lg:border-0 lg:bg-transparent">
          <Pila
            href={href({ vista: "nuncaEntraron" })}
            activo={vista === "nuncaEntraron"}
            titulo="Nunca han entrado"
            valor={adopcion.nuncaEntraron.length}
            de={total}
            pie="Tienen ficha y nunca han abierto la plataforma."
            urge
          />
          <Pila
            href={href({ vista: "sinPerfil" })}
            activo={vista === "sinPerfil"}
            titulo="Sin perfil completado"
            valor={atencion.sinPerfil.length}
            de={total}
            pie="Su práctica sale genérica hasta que rellenen el formulario."
          />
          <Pila
            href={href({ vista: "sinNivelMedido" })}
            activo={vista === "sinNivelMedido"}
            titulo="Sin el nivel medido"
            valor={atencion.sinNivelMedido.length}
            de={total}
            pie="Llevan el nivel que se tecleó al darlos de alta."
          />
          <Pila
            href={href({ vista: "sinCompletar" })}
            activo={vista === "sinCompletar"}
            titulo="Generaron y no completaron"
            valor={atencion.generaronSinCompletar.length}
            pie="Pidieron un bloque y lo dejaron a medias."
          />
        </div>
      </section>
    </div>
  );
}

/**
 * El desglose de «nivel medido»: quién hizo la medición.
 *
 * Solo salen los que tienen a alguien detrás, y por eso se arma en vez
 * de escribirse: `ficha` es cero hoy y escribir "0 por la ficha" gasta
 * una línea en decir que no hay nada. El día que se rellene, aparece
 * sola y el desglose sigue sumando el total.
 *
 * NO SE PUEDE LEER COMO «CUÁNTOS HICIERON LA PRUEBA», y conviene saberlo
 * antes de citar la cifra: manda la fuente de más prioridad, así que un
 * alumno que hizo la prueba Y tiene el nivel confirmado por su profesor
 * cuenta en «profesor». Hoy son 16 los que están en ese caso: 44 tienen
 * la prueba hecha y solo 28 llevan puesto el nivel que dio.
 */
function desgloseDelNivel(adopcion: DatosPanel["adopcion"]): string {
  const partes: string[] = [];
  if (adopcion.nivelPorProfesor > 0) partes.push(`${adopcion.nivelPorProfesor} por su profesor`);
  if (adopcion.nivelPorFicha > 0) partes.push(`${adopcion.nivelPorFicha} por la ficha`);
  if (adopcion.nivelPorPrueba > 0) partes.push(`${adopcion.nivelPorPrueba} por la prueba`);
  return partes.length > 0 ? partes.join(" · ") : "Nadie ha medido ninguno";
}

/**
 * Una fila del embudo.
 *
 * Cuatro columnas en escritorio —nombre, cifra, barra, proporción— y
 * dos filas en móvil: nombre, cifra y flecha arriba, la barra debajo a
 * ancho completo. A 375px, una barra con 190px de etiqueta delante mide
 * cuarenta píxeles y deja de ser una barra.
 *
 * EL MISMO DOM SIRVE A LOS DOS. La cifra y la proporción van juntas en
 * un `span` que en móvil es un `flex` —comparten celda— y en escritorio
 * es `contents`: desaparece como caja y sus dos hijos vuelven a ser
 * celdas del grid, cada uno en su columna por `order`. Sin eso habría
 * que pintar la cifra dos veces.
 *
 * EL «DE 177» SOLO SALE EN ESCRITORIO: en móvil el total va una vez, en
 * el rótulo de la tarjeta. La excepción es `baseDistinta`, la fila del
 * al día, cuya base es otra y hay que decirla en los dos tamaños.
 *
 * `detalle` es una segunda línea bajo el título, y va DENTRO de la celda
 * del título a propósito: como quinta columna estrecharía la barra en
 * todas las filas, incluidas las tres que no lo llevan, y entonces las
 * cinco barras dejarían de ser comparables entre sí, que es lo único
 * que hacen.
 *
 * La raya entre filas de móvil va en un envoltorio y no en el enlace:
 * `first:` tiene más especificidad que `lg:`, y puesta en el propio
 * enlace se llevaría el borde superior de la primera fila seleccionada
 * en escritorio.
 */
function Paso({
  href,
  activo,
  titulo,
  detalle,
  valor,
  de,
  baseDistinta,
}: {
  href: string;
  activo: boolean;
  titulo: string;
  detalle?: string;
  valor: number;
  de: number;
  baseDistinta?: boolean;
}) {
  const pct = de > 0 ? Math.round((valor / de) * 100) : 0;

  return (
    <div className="border-t border-marca-nieblaOscura first:border-t-0 lg:border-t-0">
      <Link
        href={href}
        aria-current={activo ? "true" : undefined}
        className={`grid grid-cols-[minmax(0,1fr)_auto_14px] items-center gap-x-2.5 py-2 transition-colors lg:grid-cols-[190px_64px_minmax(0,1fr)_96px] lg:gap-x-4 lg:gap-y-2 lg:rounded-[11px] lg:border-[1.5px] lg:px-3.5 lg:py-2.5 ${
          activo
            ? "lg:border-marca-verde lg:bg-marca-verdeFondo"
            : "lg:border-transparent lg:hover:bg-marca-niebla"
        }`}
      >
        <span className="min-w-0">
          <span className="block text-[14px] font-semibold text-marca-tinta lg:text-[14.5px]">
            {titulo}
          </span>
          {detalle && (
            <span className="mt-0.5 block text-pretty text-[12px] leading-[1.35] text-marca-grisSuave">
              {detalle}
            </span>
          )}
        </span>
        <span className="flex items-baseline gap-1.5 lg:contents">
          <span className="font-display text-[20px] font-bold leading-none tabular-nums text-marca-tinta lg:order-2 lg:text-right lg:text-[23px]">
            {valor}
          </span>
          <span className="text-[12.5px] tabular-nums text-marca-gris lg:order-4 lg:text-right lg:text-[13px]">
            {pct}%<span className={baseDistinta ? "" : "hidden lg:inline"}> de {de}</span>
          </span>
        </span>
        <Chevron className="text-marca-grisTenue lg:hidden" />
        <span className="col-span-3 mt-0.5 h-1.5 overflow-hidden rounded-[3px] bg-marca-pista lg:order-3 lg:col-span-1 lg:mt-0 lg:h-2.5 lg:rounded-[5px]">
          <span
            className="block h-full rounded-[3px] bg-marca-verde lg:rounded-[5px]"
            style={{ width: `${pct}%` }}
          />
        </span>
      </Link>
    </div>
  );
}

/**
 * Una pila de trabajo.
 *
 * Tarjeta en escritorio y fila en móvil: cifra, nombre, proporción y
 * flecha, en ese orden. El pie no sale en móvil —explica la etiqueta a
 * quien no la conoce, y ocupa la mitad de la tarjeta— y el «de 177»
 * tampoco, por lo mismo que en el embudo.
 *
 * Como en `Paso`, es un solo DOM: en móvil la fila es un grid y cada
 * pieza va a su celda por `col-start`; el párrafo que en escritorio
 * junta cifra y proporción es `contents` en móvil para que las dos sean
 * celdas sueltas.
 *
 * `urge` la pinta en ámbar. Hoy la lleva una sola —la de los que nunca
 * han entrado— y conviene que siga siendo así: en una fila de tres, la
 * única de color es la que decide el día. Con dos, ninguna lo decide.
 */
function Pila({
  href,
  activo,
  titulo,
  valor,
  de,
  pie,
  urge,
}: {
  href: string;
  activo: boolean;
  titulo: string;
  valor: number;
  de?: number;
  pie: string;
  urge?: boolean;
}) {
  const pct = de !== undefined && de > 0 ? Math.round((valor / de) * 100) : null;

  return (
    <div className="border-t border-marca-nieblaOscura first:border-t-0 lg:border-t-0">
      <Link
        href={href}
        aria-current={activo ? "true" : undefined}
        className={`grid min-h-[46px] grid-cols-[46px_minmax(0,1fr)_auto_14px] items-center gap-x-3 pl-3 pr-3.5 transition-colors lg:block lg:h-full lg:rounded-[14px] lg:border-[1.5px] lg:px-4 lg:py-[15px] ${
          urge
            ? activo
              ? "bg-marca-examen lg:border-marca-amarilloTexto lg:bg-[#FFF8E1]"
              : "bg-marca-examen lg:border-marca-examenBorde lg:hover:border-marca-amarilloTexto"
            : activo
              ? "bg-white lg:border-marca-verde lg:bg-marca-verdeFondo"
              : "bg-white lg:border-marca-borde lg:hover:border-marca-verde"
        }`}
      >
        <p
          className={`col-start-2 row-start-1 text-[14px] font-semibold lg:text-[10.5px] lg:uppercase lg:leading-none lg:tracking-[0.1em] ${
            urge ? "text-marca-amarilloTexto" : "text-marca-tinta lg:text-marca-grisSuave"
          }`}
        >
          {titulo}
        </p>
        <p className="contents lg:mt-2.5 lg:flex lg:items-baseline lg:gap-2">
          <span
            className={`col-start-1 row-start-1 text-right font-display text-[22px] font-bold leading-none tabular-nums lg:text-left lg:text-[34px] ${
              urge ? "text-marca-amarilloTexto" : "text-marca-tinta"
            }`}
          >
            {valor}
          </span>
          {pct !== null && (
            <span
              className={`col-start-3 row-start-1 text-[12.5px] tabular-nums lg:text-[13px] ${
                urge ? "text-marca-calidoBadgeTexto" : "text-marca-gris"
              }`}
            >
              <span className="hidden lg:inline">de {de} · </span>
              {pct}%
            </span>
          )}
        </p>
        <p
          className={`hidden text-pretty text-[12.5px] leading-[1.4] lg:mt-2.5 lg:block ${
            urge ? "text-marca-calidoBadgeTexto" : "text-marca-gris"
          }`}
        >
          {pie}
        </p>
        <Chevron
          className={`col-start-4 row-start-1 lg:hidden ${
            urge ? "text-marca-amarilloTexto" : "text-marca-grisTenue"
          }`}
        />
      </Link>
    </div>
  );
}
