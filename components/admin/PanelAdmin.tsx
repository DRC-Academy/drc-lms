import Link from "next/link";
import type { DatosPanel, FichaPanel, UsoDeModo } from "@/lib/admin-servidor";
import { ETIQUETA_PERIODO, PERIODOS } from "@/lib/admin-servidor";
import ListaAlumnos from "@/components/admin/ListaAlumnos";
import { refrescarPanel } from "@/app/acciones-panel";

/**
 * Hace cuánto se calcularon estos datos.
 *
 * Se resuelve en el servidor y no en el cliente a propósito: la página
 * es dinámica, así que en cada carga se vuelve a medir contra el momento
 * real. Un contador en el navegador solo añadiría hidratación para decir
 * lo mismo.
 */
function Frescura({ calculadoEn }: { calculadoEn: string }) {
  const minutos = Math.max(0, Math.floor((Date.now() - Date.parse(calculadoEn)) / 60_000));

  const texto =
    minutos === 0
      ? "Actualizado ahora mismo"
      : minutos === 1
        ? "Actualizado hace 1 minuto"
        : `Actualizado hace ${minutos} minutos`;

  return <span className="text-[12px] text-marca-grisSuave">{texto}</span>;
}

/**
 * El panel del equipo.
 *
 * Tres bloques por ahora, en orden de urgencia: si esto lo usa alguien,
 * qué modo tira, y a quién hay que ir a buscar. Todo lo pinta el
 * servidor; lo único de cliente son los desplegables de cada lista.
 *
 * NADA DE ESTO SE DUPLICA DE DRC GESTIÓN. Aquí solo vive lo que pasa
 * dentro del LMS —sesiones, generación, progreso— porque tener el mismo
 * número en dos sitios es cómo se desincronizan.
 */

const NOMBRE_MODO: Record<UsoDeModo["modo"], string> = {
  repaso: "Repaso de clase",
  examen: "Preparación de examen",
  contexto: "Su día a día",
};

const REQUISITO_MODO: Record<UsoDeModo["modo"], string> = {
  repaso: "necesitan clase analizada",
  examen: "preparan un examen",
  contexto: "tienen perfil con ocupación u objetivo",
};

function porcentaje(parte: number, total: number): number {
  return total > 0 ? Math.round((parte / total) * 100) : 0;
}

/** Una barra fina. Sin librerías: es un div con un ancho. */
function Barra({ valor, tono = "verde" }: { valor: number; tono?: "verde" | "amarillo" }) {
  return (
    <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-marca-pista">
      <div
        className={`h-full rounded-full ${tono === "verde" ? "bg-marca-verde" : "bg-marca-amarillo"}`}
        style={{ width: `${Math.min(100, valor)}%` }}
      />
    </div>
  );
}

function Tarjeta({
  titulo,
  valor,
  de,
  ayuda,
  children,
  tono,
}: {
  titulo: string;
  valor: number;
  /** El total contra el que se lee la cifra. */
  de?: number;
  ayuda: string;
  children?: React.ReactNode;
  tono?: "verde" | "amarillo";
}) {
  const pct = de === undefined ? null : porcentaje(valor, de);

  return (
    <article className="rounded-[16px] border border-marca-borde bg-white p-4 lg:p-5">
      <p className="text-[10.5px] font-semibold uppercase leading-none tracking-[0.1em] text-marca-grisSuave">
        {titulo}
      </p>
      <p className="mt-3 flex items-baseline gap-1.5">
        <span className="font-display text-[30px] font-bold leading-none text-marca-tinta tabular-nums lg:text-[34px]">
          {valor}
        </span>
        {de !== undefined && (
          <span className="text-[13px] font-medium text-marca-grisSuave tabular-nums">
            de {de} · {pct}%
          </span>
        )}
      </p>
      {pct !== null && <Barra valor={pct} tono={tono} />}
      <p className="mt-2.5 text-[12.5px] leading-[1.45] text-marca-gris">{ayuda}</p>
      {children}
    </article>
  );
}

/** Una cifra suelta: sin porcentaje, sin barra y sin lista detrás. */
function Cifra({
  titulo,
  valor,
  pie,
  alerta,
}: {
  titulo: string;
  valor: number;
  pie: string;
  /** Pinta el número en ámbar: algo que mirar, no siempre un fallo. */
  alerta?: boolean;
}) {
  return (
    <article className="rounded-[16px] border border-marca-borde bg-white p-4">
      <p className="text-[10.5px] font-semibold uppercase leading-none tracking-[0.1em] text-marca-grisSuave">
        {titulo}
      </p>
      <p
        className={`mt-2.5 font-display text-[26px] font-bold leading-none tabular-nums lg:text-[30px] ${
          alerta ? "text-marca-amarilloTexto" : "text-marca-tinta"
        }`}
      >
        {valor}
      </p>
      <p className="mt-2 text-[12px] leading-[1.4] text-marca-gris">{pie}</p>
    </article>
  );
}

function Seccion({
  id,
  titulo,
  entradilla,
  children,
}: {
  id: string;
  titulo: string;
  entradilla: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="mt-10 scroll-mt-6 lg:mt-14">
      <h2 className="font-display text-[21px] font-bold leading-[1.15] text-marca-tinta lg:text-[26px]">
        {titulo}
      </h2>
      <p className="mt-1.5 max-w-[62ch] text-pretty text-[13.5px] leading-[1.5] text-marca-gris lg:text-[15px]">
        {entradilla}
      </p>
      {children}
    </section>
  );
}

export default function PanelAdmin({ datos }: { datos: DatosPanel }) {
  const { acceso, adopcion, modos, atencion, periodo } = datos;
  const total = adopcion.totalActivos;

  const sinUso =
    adopcion.entraron.length === 0 &&
    adopcion.generaron.length === 0 &&
    adopcion.avanzaron.length === 0;

  return (
    <>
      {/* --------------------------- SELECTOR DE PERIODO --------------------------- */}
      <div className="mt-6 flex flex-wrap items-center gap-2">
        {PERIODOS.map((p) => (
          <Link
            key={p}
            href={p === "7" ? "/" : `/?periodo=${p}`}
            scroll={false}
            className={`inline-flex min-h-[36px] items-center rounded-full border px-4 text-[12.5px] font-semibold transition-colors ${
              p === periodo
                ? "border-marca-verde bg-marca-verdeFondo text-marca-verdeOsc"
                : "border-marca-borde bg-white text-marca-gris hover:border-marca-verde"
            }`}
          >
            {ETIQUETA_PERIODO[p]}
          </Link>
        ))}
      </div>

      {/* Los datos están cacheados cinco minutos. Sin decirlo, mirando
          el panel cada rato el día del lanzamiento no se sabe si lo que
          hay en pantalla es de ahora o de hace cuatro minutos. */}
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
        <Frescura calculadoEn={datos.calculadoEn} />
        <form action={refrescarPanel}>
          <button
            type="submit"
            className="inline-flex min-h-[32px] items-center gap-1.5 rounded-full border border-marca-borde bg-white px-3 text-[12px] font-semibold text-marca-gris transition-colors hover:border-marca-verde hover:text-marca-verdeOsc"
          >
            <span aria-hidden>↻</span> Refrescar
          </button>
        </form>
      </div>

      {datos.incompleto && (
        <p className="mt-4 rounded-[12px] bg-marca-examen px-4 py-3 text-[13px] leading-[1.5] text-marca-tinta">
          Alguna consulta no ha respondido, así que hay cifras que pueden estar por debajo de lo
          real. Vuelve a cargar en un momento.
        </p>
      )}

      {/* Con la plataforma recién abierta todo son ceros. Decirlo evita
          que un panel en blanco se lea como que algo está roto. */}
      {sinUso && !datos.incompleto && (
        <p className="mt-4 rounded-[12px] border border-marca-borde bg-white px-4 py-3 text-[13px] leading-[1.5] text-marca-gris">
          Todavía no hay actividad en este periodo. Los {total} alumnos con ficha están cargados y
          esperando; en cuanto entren, esto se llena.
        </p>
      )}

      {/* ------------------------------- 0. ACCESO ------------------------------- */}
      <Seccion
        id="acceso"
        titulo="Acceso"
        entradilla="Si el enlace del email está funcionando. Antes solo se guardaban los accesos que salían bien, así que quien no conseguía entrar era silencio."
      >
        <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Cifra
            titulo="Enlaces enviados"
            valor={acceso.enlacesEnviados}
            pie="Correos que salieron en el periodo."
          />
          <Cifra
            titulo="Entraron con el enlace"
            valor={acceso.sesionesMagicLink}
            pie={
              acceso.enlacesEnviados > 0
                ? `${acceso.conversion}% de los enviados`
                : "Todavía no se ha enviado ninguno."
            }
            alerta={acceso.enlacesEnviados >= 10 && acceso.conversion < 50}
          />
          <Cifra
            titulo="Entraron por WooCommerce"
            valor={acceso.sesionesWoo}
            pie="Sin pasar por el correo."
          />
          <Cifra
            titulo="No llegaron a entrar"
            valor={
              acceso.enviosFallidos +
              acceso.enlacesCaducados +
              acceso.sinCuenta +
              acceso.emailsInvalidos +
              acceso.sinFicha
            }
            pie={
              [
                acceso.enviosFallidos ? `${acceso.enviosFallidos} sin enviar` : "",
                acceso.enlacesCaducados ? `${acceso.enlacesCaducados} caducados` : "",
                acceso.sinCuenta ? `${acceso.sinCuenta} sin cuenta` : "",
                acceso.emailsInvalidos ? `${acceso.emailsInvalidos} mal escritos` : "",
                acceso.sinFicha ? `${acceso.sinFicha} sin ficha` : "",
              ]
                .filter(Boolean)
                .join(" · ") || "Ninguno."
            }
            alerta={acceso.enviosFallidos > 0}
          />
        </div>

        {acceso.enviosFallidos > 0 && (
          <p className="mt-3 rounded-[12px] bg-marca-examen px-4 py-3 text-[13px] leading-[1.5] text-marca-tinta">
            Hay {acceso.enviosFallidos} {acceso.enviosFallidos === 1 ? "correo" : "correos"} que no
            llegaron a salir. Conviene mirar la clave de Resend y el remitente antes de mandar más
            invitaciones.
          </p>
        )}
      </Seccion>

      {/* ------------------------------ 1. ADOPCIÓN ------------------------------ */}
      <Seccion
        id="adopcion"
        titulo="Adopción"
        entradilla={`Cuántos de los ${total} alumnos con ficha están usando la plataforma. Cada cifra se abre y enseña quiénes son.`}
      >
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Tarjeta
            titulo="Entraron"
            valor={adopcion.entraron.length}
            de={total}
            ayuda="Abrieron sesión al menos una vez en el periodo."
          >
            <ListaAlumnos alumnos={adopcion.entraron} vacio="Nadie ha entrado en este periodo." />
          </Tarjeta>

          <Tarjeta
            titulo="Generaron práctica"
            valor={adopcion.generaron.length}
            de={total}
            ayuda="Se prepararon al menos un bloque de ejercicios."
          >
            <ListaAlumnos alumnos={adopcion.generaron} vacio="Nadie ha generado práctica todavía." />
          </Tarjeta>

          <Tarjeta
            titulo="Al día con lo disponible"
            valor={adopcion.alDia.length}
            de={adopcion.conContenidoAbierto}
            ayuda={
              adopcion.conContenidoAbierto === 0
                ? "Todavía nadie tiene contenido abierto: el curso se libera por semanas."
                : "Terminaron todo lo que el curso les tiene abierto. Se compara con quienes tienen algo abierto, no con el total."
            }
          >
            <ListaAlumnos
              alumnos={adopcion.alDia}
              vacio="Nadie ha terminado todavía lo que tiene disponible."
            />
            {/* La cifra de antes, ahora en pequeño: sigue diciendo si
                alguien ha tocado el curso, aunque no si va al día. */}
            <p className="mt-2.5 border-t border-marca-borde pt-2.5 text-[12px] leading-[1.4] text-marca-grisSuave">
              <strong className="font-semibold text-marca-gris tabular-nums">
                {adopcion.avanzaron.length}
              </strong>{" "}
              completaron alguna lección en el periodo.
            </p>
          </Tarjeta>

          <Tarjeta
            titulo="Nunca han entrado"
            valor={adopcion.nuncaEntraron.length}
            de={total}
            tono="amarillo"
            ayuda="Sin una sola sesión, en todo el tiempo. No depende del periodo."
          >
            <ListaAlumnos
              alumnos={adopcion.nuncaEntraron}
              vacio="Todos han entrado alguna vez."
            />
          </Tarjeta>
        </div>
      </Seccion>

      {/* --------------------------- 2. USO POR MODO --------------------------- */}
      <Seccion
        id="modos"
        titulo="Uso por modo"
        entradilla="El total no dice dónde está el cuello de botella; el desglose sí. Cada modo se compara con los alumnos que podrían usarlo, porque un modo poco usado puede significar que no interesa o que casi nadie es elegible."
      >
        <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-3">
          {modos.map((m) => {
            const pct = porcentaje(m.usuarios.length, m.elegibles);

            return (
              <article
                key={m.modo}
                className="rounded-[16px] border border-marca-borde bg-white p-4 lg:p-5"
              >
                <p className="text-[10.5px] font-semibold uppercase leading-none tracking-[0.1em] text-marca-grisSuave">
                  {NOMBRE_MODO[m.modo]}
                </p>

                <p className="mt-3 flex items-baseline gap-1.5">
                  <span className="font-display text-[30px] font-bold leading-none text-marca-tinta tabular-nums lg:text-[34px]">
                    {m.bloques}
                  </span>
                  <span className="text-[13px] font-medium text-marca-grisSuave">
                    {m.bloques === 1 ? "bloque" : "bloques"}
                  </span>
                </p>

                <Barra valor={pct} />

                <p className="mt-2.5 text-[12.5px] leading-[1.45] text-marca-gris">
                  <strong className="font-semibold text-marca-tinta tabular-nums">
                    {m.usuarios.length} de {m.elegibles}
                  </strong>{" "}
                  ({pct}%) de los que {REQUISITO_MODO[m.modo]} lo han usado.
                </p>

                {m.elegibles === 0 && (
                  <p className="mt-1.5 text-[12px] leading-[1.4] text-marca-grisSuave">
                    Ningún alumno cumple hoy el requisito, así que el 0% no dice nada del modo.
                  </p>
                )}

                <ListaAlumnos
                  alumnos={m.usuarios.map((u) => u.alumno)}
                  vacio="Nadie ha usado este modo en el periodo."
                  detalles={Object.fromEntries(
                    m.usuarios.map((u) => [
                      u.alumno.alumnoId,
                      `${u.bloques} ${u.bloques === 1 ? "bloque" : "bloques"}`,
                    ])
                  )}
                />
              </article>
            );
          })}
        </div>
      </Seccion>

      {/* ------------------------- 5. REQUIEREN ATENCIÓN ------------------------- */}
      <Seccion
        id="atencion"
        titulo="Requieren atención"
        entradilla="Listas sobre las que se puede actuar hoy. No dependen del periodo: son estados, no actividad."
      >
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <FilaAtencion
            titulo="Sin transcript en su última clase"
            alumnos={atencion.sinTranscript}
            total={total}
            ayuda="Sin análisis de clase no hay repaso que generar. Es el cuello de botella real del producto, y dice qué profesores no están subiendo."
            vacio="Todos tienen su última clase analizada."
            detalles={Object.fromEntries(
              atencion.sinTranscript.map((a) => [a.alumnoId, a.profesor || "sin profesor"])
            )}
          />
          <FilaAtencion
            titulo="Sin perfil completado"
            alumnos={atencion.sinPerfil}
            total={total}
            ayuda="Sin ocupación ni objetivo no se les puede ofrecer la tarjeta de su día a día."
            vacio="Todos tienen perfil."
          />
          <FilaAtencion
            titulo="Nunca entraron"
            alumnos={atencion.nuncaEntraron}
            total={total}
            ayuda="Candidatos a un email de invitación."
            vacio="Todos han entrado alguna vez."
          />
          <FilaAtencion
            titulo="Generaron y no completaron"
            alumnos={atencion.generaronSinCompletar}
            total={total}
            ayuda="Entraron, se prepararon un bloque y no llegaron a terminarlo. Algo no enganchó."
            vacio="Nadie se ha quedado a medias."
          />
        </div>
      </Seccion>
    </>
  );
}

function FilaAtencion({
  titulo,
  alumnos,
  total,
  ayuda,
  vacio,
  detalles,
}: {
  titulo: string;
  alumnos: FichaPanel[];
  total: number;
  ayuda: string;
  vacio: string;
  detalles?: Record<string, string>;
}) {
  return (
    <article className="rounded-[16px] border border-marca-borde bg-white p-4 lg:p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-pretty font-display text-[15px] font-bold leading-[1.25] text-marca-tinta lg:text-[16px]">
          {titulo}
        </h3>
        <span className="shrink-0 font-display text-[22px] font-bold leading-none text-marca-tinta tabular-nums">
          {alumnos.length}
        </span>
      </div>
      <Barra valor={porcentaje(alumnos.length, total)} tono="amarillo" />
      <p className="mt-2.5 text-[12.5px] leading-[1.45] text-marca-gris">{ayuda}</p>
      <ListaAlumnos alumnos={alumnos} vacio={vacio} detalles={detalles} />
    </article>
  );
}
