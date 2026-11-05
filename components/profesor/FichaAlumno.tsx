import type { ReactNode } from "react";
import Link from "next/link";
import Chevron from "@/components/admin/Chevron";
import { CabTarjeta, Tarjeta } from "@/components/panel/piezas";
import Escalera from "@/components/progreso/Escalera";
import Recorrido from "@/components/progreso/Recorrido";
import { EstilosFicha } from "@/components/progreso/estilos";
import { diaEnTexto } from "@/lib/panel-profesor-reglas";
import { formatearFechaLarga } from "@/lib/perfil";
import { PROGRESO } from "@/lib/textos/progreso";
import type { BloqueDeFicha, EjercicioQueCosto, FichaDelAlumno } from "@/lib/panel-profesor-ficha";

// ---------------------------------------------------------------
// LA FICHA DEL ALUMNO PARA SU PROFESOR
//
// Solo pinta lo que le da `cargarFichaDelAlumno`. En tercera persona sobre
// el alumno y de tú hacia el profesor. Las piezas `p2-*` son las de la
// ficha del alumno: la escalera y el recorrido, con otros rótulos.
// ---------------------------------------------------------------

const T = PROGRESO.es;

const NOTA_NIVEL: Record<FichaDelAlumno["origenNivel"], string> = {
  profesor: "Confirmado por su profesor.",
  prueba: "Según su prueba de nivel.",
  alta: "El del alta: aún sin confirmar.",
};

const NO_LEIDO = "No se ha podido leer ahora mismo. Recarga la página en un momento.";

function fechaLarga(dia: string): string {
  return formatearFechaLarga(dia, T.fechaLarga);
}

function Parrafo({ children }: { children: ReactNode }) {
  return <p className="mt-3 text-[14.5px] leading-[1.55] text-marca-tintaMedia">{children}</p>;
}

export default function FichaAlumno({ ficha, volverHref }: { ficha: FichaDelAlumno; volverHref: string }) {
  const pila = ficha.nombrePila || "este alumno";

  return (
    <>
      <EstilosFicha />

      <Link href={volverHref} className="-ml-1 inline-flex min-h-[44px] items-center gap-1 px-1 text-[13.5px] font-semibold text-marca-verdeOsc">
        <Chevron direccion="izquierda" />
        Mis alumnos
      </Link>

      <header className="mt-1">
        <h1 className="font-display text-[28px] font-bold leading-[1.1] tracking-[-0.01em] text-marca-tinta [overflow-wrap:anywhere] lg:text-[34px]">
          {ficha.nombre || "Sin nombre"}
        </h1>
        {ficha.ultimoAcceso && <p className="mt-2 text-[14.5px] leading-[1.5] text-marca-tintaMedia">{ficha.ultimoAcceso} en la plataforma.</p>}
      </header>

      <Tarjeta className="mt-5">
        <CabTarjeta id="ficha-nivel" titulo="Su nivel" sub={NOTA_NIVEL[ficha.origenNivel]} />
        <div className="p2-page mt-4 !bg-transparent">
          <Escalera nivel={ficha.nivel} meta={null} estasAqui="Está aquí" tuMeta="Su meta" />
        </div>
        {ficha.enlaceGestion && (
          <a
            href={ficha.enlaceGestion}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex min-h-[44px] items-center gap-1 text-[14px] font-semibold text-marca-verdeOsc hover:text-marca-tinta lg:min-h-0"
          >
            Confirmar o cambiar nivel en DRC Gestión
            <Chevron />
          </a>
        )}
      </Tarjeta>

      {/* En el móvil, lo que hace falta antes de clase va primero. En
          escritorio, a la derecha y siempre a la vista. */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        <aside className="flex min-w-0 flex-col gap-4 lg:sticky lg:top-5 lg:order-2">
          <ProximaClase ficha={ficha} />
          <SuCurso ficha={ficha} />
        </aside>

        <div className="flex min-w-0 flex-col gap-4 lg:order-1">
          <LoQueViene ficha={ficha} pila={pila} />
          <SuPractica bloques={ficha.bloques} ejercicios={ficha.ejercicios} pila={pila} />
          <Tarjeta>
            {ficha.clases === null ? (
              <>
                <CabTarjeta id="ficha-recorrido" titulo="Su recorrido, clase a clase" />
                <Parrafo>{NO_LEIDO}</Parrafo>
              </>
            ) : (
              <div className="p2-page !bg-transparent">
                <Recorrido
                  clases={ficha.clases}
                  abiertoDeEntrada
                  textos={{
                    titulo: "Su recorrido, clase a clase",
                    vacio: "Todavía no tiene clases analizadas.",
                    verTodas: "Ver todas",
                    plegar: "Plegar",
                    rotuloHito: T.hito,
                    rotuloTemas: "Temas y vocabulario",
                    rotuloResumen: "Resumen",
                    claseNumero: T.claseNumero,
                    fechaLarga: T.fechaLarga,
                    resumen: (n, fecha) => `${n === 1 ? "1 clase" : `${n} clases`}${fecha ? ` · la última, el ${fecha}` : ""}`,
                  }}
                />
              </div>
            )}
          </Tarjeta>
        </div>
      </div>
    </>
  );
}

function ProximaClase({ ficha }: { ficha: FichaDelAlumno }) {
  const clase = ficha.proxima?.clase ?? null;
  return (
    <Tarjeta>
      <CabTarjeta id="ficha-proxima" titulo="Próxima clase" />
      {ficha.proxima === null ? (
        <Parrafo>{NO_LEIDO}</Parrafo>
      ) : clase === null ? (
        <Parrafo>No tiene ninguna clase próxima en el calendario.</Parrafo>
      ) : (
        <>
          <p className="mt-3 text-[16px] font-semibold leading-[1.35] text-marca-tinta first-letter:uppercase">{diaEnTexto(clase.dia)}</p>
          <p className="mt-0.5 text-[14.5px] leading-[1.45] text-marca-tintaMedia">
            De {clase.desde} a {clase.hasta}, hora de España{clase.enCurso ? " · ahora mismo" : ""}
          </p>
        </>
      )}
    </Tarjeta>
  );
}

function SuCurso({ ficha }: { ficha: FichaDelAlumno }) {
  return (
    <Tarjeta>
      <CabTarjeta id="ficha-curso" titulo="Su curso" sub={ficha.semana ? `Semana ${ficha.semana} desde que empezó` : undefined} />
      {ficha.cursos === null ? (
        <Parrafo>{NO_LEIDO}</Parrafo>
      ) : ficha.cursos.length === 0 ? (
        <Parrafo>Todavía no tiene ningún curso asignado.</Parrafo>
      ) : (
        <ul className="mt-3 flex flex-col gap-4">
          {ficha.cursos.map((curso) => {
            const abiertasPct = curso.total > 0 ? (curso.abiertas / curso.total) * 100 : 0;
            const hechasPct = curso.total > 0 ? (curso.completadas / curso.total) * 100 : 0;
            return (
              <li key={curso.id}>
                <p className="text-[14.5px] font-semibold leading-[1.35] text-marca-tinta">{curso.titulo}</p>
                <div aria-hidden className="relative mt-2 h-2 overflow-hidden rounded-full bg-marca-niebla">
                  <span className="absolute inset-y-0 left-0 rounded-full bg-marca-verdeFondo" style={{ width: `${abiertasPct}%` }} />
                  <span className="absolute inset-y-0 left-0 rounded-full bg-marca-verdeOsc" style={{ width: `${hechasPct}%` }} />
                </div>
                <p className="mt-1.5 text-[13.5px] leading-[1.45] text-marca-tintaMedia">
                  {curso.completadas} completadas · {curso.abiertas} abiertas · {curso.total} en total
                </p>
                {curso.abreEl && <p className="mt-0.5 text-[13px] leading-[1.45] text-marca-tintaMedia">Lo siguiente se abre el {fechaLarga(curso.abreEl)}.</p>}
              </li>
            );
          })}
        </ul>
      )}
    </Tarjeta>
  );
}

function LoQueViene({ ficha, pila }: { ficha: FichaDelAlumno; pila: string }) {
  const sinNada = !ficha.foco && ficha.puntos !== null && ficha.puntos.length === 0;
  return (
    <Tarjeta>
      <CabTarjeta id="ficha-trabajando" titulo={`Lo que viene trabajando ${pila}`} />
      {ficha.foco && (
        <div className="mt-3 rounded-[12px] bg-marca-verdeFondo px-4 py-3">
          <p className="text-[12.5px] font-semibold text-marca-verdeOsc">Foco recomendado</p>
          <p className="mt-1 text-[14.5px] leading-[1.5] text-marca-tinta">{ficha.foco}</p>
        </div>
      )}
      {ficha.puntos === null && <Parrafo>{NO_LEIDO}</Parrafo>}
      {ficha.puntos !== null && ficha.puntos.length > 0 && (
        <>
          <p className="mt-4 text-[13.5px] font-semibold text-marca-tinta">En sus últimas clases contigo</p>
          <ul className="mt-2 flex flex-col gap-3">
            {ficha.puntos.map((punto) => (
              <li key={punto.id} className="border-l-2 border-marca-borde pl-3">
                <p className="text-[12.5px] font-medium text-marca-tintaMedia">{fechaLarga(punto.fecha)}</p>
                <p className="mt-0.5 text-[14.5px] leading-[1.5] text-marca-tinta">{punto.texto}</p>
              </li>
            ))}
          </ul>
        </>
      )}
      {sinNada && <Parrafo>Aún no hay notas de sus clases contigo.</Parrafo>}
    </Tarjeta>
  );
}

function ResultadoBloque({ estado }: { estado: BloqueDeFicha["estado"] }) {
  if (estado.tipo === "terminado") {
    return (
      <span className="shrink-0 rounded-full bg-marca-verdeFondo px-2.5 py-0.5 text-[12.5px] font-semibold text-marca-verdeOsc">
        {estado.aciertos} de {estado.total} · {estado.porcentaje} %
      </span>
    );
  }
  return (
    <span className="shrink-0 rounded-full border border-marca-borde bg-white px-2.5 py-0.5 text-[12.5px] font-semibold text-marca-gris">
      {estado.tipo === "a_medias" ? `Va por el ${estado.indice + 1} de ${estado.total}` : "Sin empezar"}
    </span>
  );
}

function SuPractica({ bloques, ejercicios, pila }: { bloques: BloqueDeFicha[]; ejercicios: EjercicioQueCosto[] | null; pila: string }) {
  return (
    <Tarjeta>
      <CabTarjeta id="ficha-practica" titulo={`La práctica de ${pila}`} />
      {bloques.length === 0 ? (
        <Parrafo>Todavía no ha generado ningún bloque.</Parrafo>
      ) : (
        <ul className="mt-2 divide-y divide-marca-borde">
          {bloques.map((bloque) => (
            <li key={bloque.id} className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1.5 py-3 last:pb-0">
              <div className="min-w-0 flex-1 basis-[200px]">
                <p className="text-[14.5px] font-semibold leading-[1.35] text-marca-tinta [overflow-wrap:anywhere]">{bloque.titulo}</p>
                <p className="mt-0.5 text-[13px] leading-[1.45] text-marca-tintaMedia">
                  {[bloque.area, bloque.deLaClase && `de la clase del ${bloque.deLaClase}`].filter(Boolean).join(" · ")}
                </p>
              </div>
              <ResultadoBloque estado={bloque.estado} />
            </li>
          ))}
        </ul>
      )}

      {ejercicios !== null && ejercicios.length > 0 && (
        <div className="mt-5 border-t border-marca-borde pt-4">
          <p className="text-[13.5px] font-semibold text-marca-tinta">Los ejercicios del curso que más le han costado</p>
          <ul className="mt-2 flex flex-col gap-3">
            {ejercicios.map((ejercicio) => (
              <li key={ejercicio.id}>
                {ejercicio.leccion && <p className="text-[12.5px] font-medium leading-[1.4] text-marca-tintaMedia">{ejercicio.leccion}</p>}
                <p className="mt-0.5 text-[14px] leading-[1.45] text-marca-tinta [overflow-wrap:anywhere]">{ejercicio.enunciado}</p>
                <p className="mt-0.5 text-[13px] leading-[1.45] text-marca-tintaMedia">
                  {ejercicio.intentos === 1 ? "1 intento" : `${ejercicio.intentos} intentos`}, {ejercicio.sinAcertar} sin acertar
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Tarjeta>
  );
}
