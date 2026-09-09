import Link from "next/link";
import type { DatosPanel } from "@/lib/admin-servidor";
import { ETIQUETA_PERIODO, PERIODOS, type Periodo, type Vista } from "@/lib/admin-servidor";

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
  busqueda,
}: {
  datos: DatosPanel;
  periodo: Periodo;
  /** La métrica seleccionada. Pinta el estado y decide la lista. */
  vista: Vista;
  /** Se conserva al cambiar de métrica o de periodo. */
  busqueda: string;
}) {
  const { adopcion, atencion, incompleto } = datos;
  const total = adopcion.totalActivos;

  /** Un enlace que cambia una cosa y conserva las otras dos. */
  const href = (cambio: { periodo?: Periodo; vista?: Vista }) => {
    const p = new URLSearchParams();
    p.set("periodo", cambio.periodo ?? periodo);
    p.set("ver", cambio.vista ?? vista);
    if (busqueda) p.set("q", busqueda);
    return `/?${p.toString()}`;
  };

  return (
    <div>
      {/* ------------------------- EL PERIODO ------------------------- */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[10.5px] font-semibold uppercase leading-none tracking-[0.12em] text-marca-grisSuave">
          {ETIQUETA_PERIODO[periodo]}
        </p>
        <div className="inline-flex gap-0.5 rounded-full border border-marca-borde bg-white p-[3px]">
          {PERIODOS.map((p) => (
            <Link
              key={p}
              href={href({ periodo: p })}
              aria-current={p === periodo ? "true" : undefined}
              className={`inline-flex h-[30px] items-center rounded-full px-3.5 text-[13px] font-semibold transition-colors ${
                p === periodo
                  ? "bg-marca-tinta text-white"
                  : "text-marca-gris hover:text-marca-tinta"
              }`}
            >
              {p === "todo" ? "Todo" : `${p} días`}
            </Link>
          ))}
        </div>
      </div>

      {incompleto && (
        <p className="mt-3 rounded-[12px] border border-marca-examenBorde bg-marca-examen px-4 py-3 text-[13px] leading-[1.45] text-marca-amarilloTexto">
          Alguna lectura ha fallado, así que estas cifras están incompletas. No son ceros: son
          datos que no hemos podido leer.
        </p>
      )}

      {/* ------------------------- EL EMBUDO -------------------------
          El «al día» NO se mide contra el total y por eso lo dice: solo
          puede estar al día quien tiene algo abierto. Compararlo con
          177 sería contar como retraso a quien está esperando. */}
      <section className="mt-4 rounded-[16px] border border-marca-borde bg-white p-4 lg:p-[22px]">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <p className="text-[10.5px] font-semibold uppercase leading-none tracking-[0.12em] text-marca-grisSuave">
            El recorrido, de {total} alumnos activos
          </p>
          <p className="text-[12px] text-marca-grisTenue">Pulsa cualquier fila para ver quiénes son</p>
        </div>

        <div className="mt-3.5 flex flex-col gap-[3px]">
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
            día. */}
        <div className="mt-4 border-t border-marca-borde pt-3.5">
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

      {/* ------------------------- LAS PILAS ------------------------- */}
      <section className="mt-5">
        <p className="text-[10.5px] font-semibold uppercase leading-none tracking-[0.12em] text-marca-grisSuave">
          A quién hay que ir a buscar
        </p>

        <div className="mt-2.5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
 * dos filas en móvil, donde la barra pasa debajo a ancho completo: a
 * 375px, una barra con 190px de etiqueta delante mide cuarenta píxeles
 * y deja de ser una barra.
 *
 * `detalle` es una segunda línea bajo el título, y va DENTRO de la celda
 * del título a propósito: como quinta columna estrecharía la barra en
 * todas las filas, incluidas las tres que no lo llevan, y entonces las
 * cinco barras dejarían de ser comparables entre sí, que es lo único
 * que hacen.
 */
function Paso({
  href,
  activo,
  titulo,
  detalle,
  valor,
  de,
}: {
  href: string;
  activo: boolean;
  titulo: string;
  detalle?: string;
  valor: number;
  de: number;
}) {
  const pct = de > 0 ? Math.round((valor / de) * 100) : 0;

  return (
    <Link
      href={href}
      aria-current={activo ? "true" : undefined}
      className={`grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 rounded-[11px] border-[1.5px] px-3.5 py-2.5 transition-colors lg:grid-cols-[190px_64px_minmax(0,1fr)_96px] ${
        activo
          ? "border-marca-verde bg-marca-verdeFondo"
          : "border-transparent hover:bg-marca-niebla"
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
      <span className="font-display text-[21px] font-bold leading-none tabular-nums text-marca-tinta lg:text-[23px] lg:text-right">
        {valor}
      </span>
      <span className="col-span-2 h-2.5 overflow-hidden rounded-[5px] bg-marca-pista lg:col-span-1">
        <span className="block h-full rounded-[5px] bg-marca-verde" style={{ width: `${pct}%` }} />
      </span>
      <span className="col-span-2 text-[12.5px] tabular-nums text-marca-gris lg:col-span-1 lg:text-right lg:text-[13px]">
        {pct}% de {de}
      </span>
    </Link>
  );
}

/**
 * Una pila de trabajo.
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
    <Link
      href={href}
      aria-current={activo ? "true" : undefined}
      className={`block rounded-[14px] border-[1.5px] px-4 py-[15px] transition-colors ${
        urge
          ? activo
            ? "border-marca-amarilloTexto bg-[#FFF8E1]"
            : "border-marca-examenBorde bg-marca-examen hover:border-marca-amarilloTexto"
          : activo
            ? "border-marca-verde bg-marca-verdeFondo"
            : "border-marca-borde bg-white hover:border-marca-verde"
      }`}
    >
      <p
        className={`text-[10.5px] font-semibold uppercase leading-none tracking-[0.1em] ${
          urge ? "text-marca-amarilloTexto" : "text-marca-grisSuave"
        }`}
      >
        {titulo}
      </p>
      <p className="mt-2.5 flex items-baseline gap-2">
        <span
          className={`font-display text-[30px] font-bold leading-none tabular-nums lg:text-[34px] ${
            urge ? "text-marca-amarilloTexto" : "text-marca-tinta"
          }`}
        >
          {valor}
        </span>
        {pct !== null && (
          <span
            className={`text-[13px] tabular-nums ${
              urge ? "text-marca-calidoBadgeTexto" : "text-marca-gris"
            }`}
          >
            de {de} · {pct}%
          </span>
        )}
      </p>
      <p
        className={`mt-2.5 text-pretty text-[12.5px] leading-[1.4] ${
          urge ? "text-marca-calidoBadgeTexto" : "text-marca-gris"
        }`}
      >
        {pie}
      </p>
    </Link>
  );
}
