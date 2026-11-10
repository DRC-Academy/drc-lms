import Link from "next/link";
import { textosActuales } from "@/lib/idioma-servidor";
import { conFoco } from "@/lib/foco";
import { elegirCurso } from "@/app/acciones-curso";
import { TARJETA } from "@/components/base/Seccion";
import IconoPrueba from "@/components/prueba-nivel/IconoPrueba";
import type { EstadoBloque } from "@/lib/prueba-nivel/servidor";
import { cuandoRepetir } from "@/lib/prueba-nivel/repetir";

// ---------------------------------------------------------------
// LA PRUEBA DE NIVEL, ARRIBA DEL INICIO DEL BLACK PASS (Y DE ELEGIR CURSO)
//
// Tres estados, el mismo sitio:
//   · sin hacer   «Haz tu prueba de nivel», unos 30–40 min, y el botón;
//   · a medias    «Continuar mi prueba de nivel», cuántas lleva y la barra;
//   · terminada   su nivel, el curso que se le recomienda y «Empezar mi
//                 curso» (que lo elige: si ya tenía otro, no se le cambia
//                 hasta que pulse), y «Repetir la prueba» (o, si la
//                 terminó hace menos de 24 horas, desde cuándo podrá).
//
// Tarjeta blanca y no franja oscura: justo debajo va la de «Tu curso», y dos
// franjas seguidas no se distinguen. Todo en tinta (nada de gris de apoyo).
// Sin una línea de cliente: enlaces y un formulario.
//
// `revisando`: el equipo mirando la ficha no elige curso por el alumno. Ve
// el bloque igual, con enlaces en vez del formulario.
// ---------------------------------------------------------------

const BOTON =
  "btn-verde inline-flex min-h-[48px] w-full items-center justify-center rounded-full px-7 text-[15.5px] font-bold min-[520px]:w-auto";

function Icono() {
  return (
    <span aria-hidden className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-marca-verdeFondo text-marca-verdeOsc">
      <IconoPrueba />
    </span>
  );
}

export default function BloquePruebaNivel({
  estado,
  cursoActualId,
  foco,
  revisando,
}: {
  estado: EstadoBloque;
  /** El curso elegido ahora, para saber si el recomendado ya es el suyo. */
  cursoActualId: string | null;
  foco: string | null;
  revisando: boolean;
}) {
  const t = textosActuales().pruebaNivel;
  const hrefPrueba = conFoco("/prueba-nivel", foco);

  if (estado.tipo === "nueva" || estado.tipo === "en_curso") {
    const enCurso = estado.tipo === "en_curso";
    const porcentaje = enCurso ? Math.round((estado.respondidas / Math.max(estado.total, 1)) * 100) : 0;

    return (
      <section aria-labelledby="prueba-nivel-titulo" className={`${TARJETA} px-5 py-5 min-[900px]:px-7 min-[900px]:py-6`}>
        <div className="flex items-start gap-3.5">
          <Icono />
          <div className="min-w-0 flex-1">
            <h2 id="prueba-nivel-titulo" className="text-balance font-display text-[20px] font-bold leading-[1.2] text-marca-tinta">
              {enCurso ? t.enCursoTitulo : t.nuevaTitulo}
            </h2>
            <p className="mt-1 text-pretty text-[15px] leading-[1.5] text-marca-tinta">
              {enCurso ? t.enCursoTexto(estado.respondidas, estado.total) : t.nuevaTexto}
            </p>
          </div>
        </div>

        {enCurso && (
          <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={estado.total}
            aria-valuenow={estado.respondidas}
            aria-label={t.enCursoTexto(estado.respondidas, estado.total)}
            className="mt-4 h-2 overflow-hidden rounded-full bg-marca-verdeFondo"
          >
            <div className="h-full rounded-full bg-marca-verde" style={{ width: `${porcentaje}%` }} />
          </div>
        )}

        <div className="mt-4">
          <Link href={hrefPrueba} className={BOTON}>
            {enCurso ? t.enCursoBoton : t.nuevaBoton}
          </Link>
        </div>
      </section>
    );
  }

  const { resultado } = estado;
  const nivel = t.niveles[resultado.nivel];
  const curso = resultado.curso;
  const esElSuyo = curso !== null && curso.id === cursoActualId;
  const espera = resultado.repetirDesde ? cuandoRepetir(resultado.repetirDesde, new Date()) : null;

  return (
    <section aria-labelledby="prueba-nivel-titulo" className={`${TARJETA} px-5 py-5 min-[900px]:px-7 min-[900px]:py-6`}>
      <p className="text-[13px] font-semibold uppercase tracking-[0.06em] text-marca-verdeOsc">{t.terminadaEtiqueta}</p>
      <div className="mt-2 flex items-center gap-3.5">
        <span
          aria-hidden
          className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-marca-tinta font-display text-[20px] font-bold text-white"
        >
          {resultado.nivel}
        </span>
        <div className="min-w-0">
          <h2 id="prueba-nivel-titulo" className="font-display text-[20px] font-bold leading-[1.2] text-marca-tinta">
            {t.tuNivel(resultado.nivel, nivel.nombre)}
          </h2>
          <p className="mt-0.5 text-pretty text-[14.5px] leading-[1.45] text-marca-tinta">{nivel.frase}</p>
        </div>
      </div>

      {resultado.provisional && <p className="mt-3 text-pretty text-[14px] leading-[1.45] text-marca-tinta">{t.provisional}</p>}

      {curso && (
        <div className="mt-4 rounded-[12px] bg-marca-niebla px-4 py-3.5">
          <p className="text-pretty text-[15px] font-semibold leading-[1.4] text-marca-tinta">{t.recomendado(curso.titulo)}</p>
          {esElSuyo && <p className="mt-0.5 text-[14px] leading-[1.4] text-marca-tinta">{t.esTuCurso}</p>}
        </div>
      )}

      <div className="mt-4 flex flex-col gap-3 min-[520px]:flex-row min-[520px]:items-center min-[520px]:gap-5">
        {curso &&
          (esElSuyo || revisando ? (
            <Link href={conFoco(`/curso/${curso.slug}`, foco)} className={BOTON}>
              {esElSuyo ? t.seguirConMiCurso : t.empezarMiCurso}
            </Link>
          ) : (
            <form action={elegirCurso}>
              <input type="hidden" name="curso" value={curso.id} />
              <button type="submit" className={BOTON}>
                {t.empezarMiCurso}
                <span className="sr-only">: {curso.titulo}</span>
              </button>
            </form>
          ))}
        {espera ? (
          <p className="text-balance text-center text-[14.5px] leading-[1.45] text-marca-tinta min-[520px]:text-left">{t.repetirDesde(espera.dia, espera.hora)}</p>
        ) : (
          <Link
            href={conFoco("/prueba-nivel?repetir=1", foco)}
            className="text-center text-[15px] font-semibold text-marca-verdeOsc underline underline-offset-2 hover:text-marca-tinta min-[520px]:text-left"
          >
            {t.repetir}
          </Link>
        )}
      </div>
    </section>
  );
}
