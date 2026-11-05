import Link from "next/link";
import MarcoApp from "@/components/Navegacion";
import Chevron from "@/components/admin/Chevron";
import AccionesProfesor from "@/components/admin/AccionesProfesor";
import { Tarjeta } from "@/components/panel/piezas";
import type { FilaPestana, SituacionProfesor } from "@/lib/panel-profesor-reglas";

// ---------------------------------------------------------------
// LA PANTALLA DE «ACCESO PROFESORES»
//
// Con los datos ya leídos (`cargarPestanaProfesores`); el guard y la
// carga, en `app/accesos-profesores/page.tsx`. Primero lo que pide una
// revisión, y al final quien no tiene alumnos.
// ---------------------------------------------------------------

const ETIQUETA: Record<SituacionProfesor, { texto: string; clase: string }> = {
  activo: { texto: "Con acceso", clase: "bg-marca-verdeFondo text-marca-verdeOsc" },
  sin_acceso: { texto: "Sin acceso", clase: "border border-marca-borde bg-white text-marca-gris" },
  bloqueado_email: { texto: "Bloqueado", clase: "bg-marca-examen text-marca-amarilloTexto" },
  archivado: { texto: "Archivado, sin acceso", clase: "bg-marca-examen text-marca-amarilloTexto" },
};

const FECHA = new Intl.DateTimeFormat("es-ES", { timeZone: "Europe/Madrid", day: "numeric", month: "short" });

function alumnosEnTexto(n: number): string {
  return n === 1 ? "1 alumno" : `${n} alumnos`;
}

export default function PantallaProfesores({ filas }: { filas: FilaPestana[] | null }) {
  const bloqueados = (filas ?? []).filter((f) => f.situacion === "bloqueado_email").length;

  return (
    <MarcoApp datos={{ alumnoId: "", nombre: "", miCurso: null, foco: null, revisando: false }}>
      <main className="mx-auto w-full max-w-[860px] px-5 pb-16 lg:px-10 lg:pb-20 lg:pt-9">
        <div className="pt-4 lg:pt-0">
          <Link href="/" className="-ml-1 inline-flex min-h-[44px] items-center gap-1 px-1 text-[13.5px] font-semibold text-marca-verdeOsc lg:min-h-0">
            <Chevron direccion="izquierda" />
            Panel
          </Link>
          <h1 className="mt-1 font-display text-[28px] font-bold leading-[1.1] tracking-[-0.01em] text-marca-tinta lg:mt-3 lg:text-[34px]">
            Acceso profesores
          </h1>
          <p className="mt-2 max-w-[62ch] text-pretty text-[14.5px] leading-[1.5] text-marca-tintaMedia">
            Activa el acceso de cada profesor de uno en uno. Desactivarlo cierra sus sesiones al momento.
          </p>
        </div>

        {filas === null ? (
          <p role="alert" className="mt-6 rounded-[12px] bg-marca-examen px-4 py-3 text-[14px] leading-[1.45] text-marca-tinta">
            No se ha podido leer la lista de profesores. Recarga la página en un momento.
          </p>
        ) : (
          <>
            {bloqueados > 0 && (
              <p role="alert" className="mt-6 rounded-[12px] bg-marca-examen px-4 py-3 text-[14px] font-medium leading-[1.45] text-marca-tinta">
                {bloqueados === 1
                  ? "Hay 1 profesor bloqueado porque su email ha cambiado en Gestión."
                  : `Hay ${bloqueados} profesores bloqueados porque su email ha cambiado en Gestión.`}
              </p>
            )}
            <ul className="mt-6 flex flex-col gap-3">
              {filas.map((fila) => (
                <li key={fila.teacherId}>
                  <FilaProfesor fila={fila} />
                </li>
              ))}
            </ul>
          </>
        )}
      </main>
    </MarcoApp>
  );
}

function FilaProfesor({ fila }: { fila: FilaPestana }) {
  const etiqueta = ETIQUETA[fila.situacion];

  return (
    <Tarjeta>
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
        <h2 className="font-display text-[18px] font-semibold leading-[1.25] text-marca-tinta">{fila.profesor}</h2>
        <span className={`rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold ${etiqueta.clase}`}>{etiqueta.texto}</span>
        {fila.esPrueba && (
          <span className="rounded-full border border-marca-borde bg-marca-niebla px-2.5 py-0.5 text-[11.5px] font-semibold text-marca-gris">
            Prueba
          </span>
        )}
      </div>

      <p className="mt-1.5 [overflow-wrap:anywhere] text-[13.5px] leading-[1.45] text-marca-tintaMedia">{fila.email || "Sin email en Gestión"}</p>
      <p className="mt-0.5 text-[13.5px] leading-[1.45] text-marca-tintaMedia">
        {alumnosEnTexto(fila.alumnos)}
        {fila.invitadoEn ? ` · invitación enviada el ${FECHA.format(new Date(fila.invitadoEn))}` : ""}
      </p>

      {fila.situacion === "bloqueado_email" && (
        <div className="mt-3 rounded-[12px] bg-marca-examen p-3.5 text-[13.5px] leading-[1.45] text-marca-tinta">
          <p className="font-semibold">No puede entrar: el email ha cambiado en Gestión.</p>
          <p className="mt-1 [overflow-wrap:anywhere]">Aprobado: {fila.emailAprobado}</p>
          <p className="[overflow-wrap:anywhere]">En Gestión ahora: {fila.email || "vacío"}</p>
          <p className="mt-1">Comprueba el cambio antes de aprobarlo. Si no es suyo, corrígelo en Gestión.</p>
        </div>
      )}

      {fila.situacion === "archivado" && (
        <p className="mt-3 rounded-[12px] bg-marca-examen p-3.5 text-[13.5px] leading-[1.45] text-marca-tinta">
          Ya no está en la academia y no puede entrar. Desactívalo para que deje de salir aquí.
        </p>
      )}

      <AccionesProfesor
        teacherId={fila.teacherId}
        situacion={fila.situacion}
        email={fila.situacion === "bloqueado_email" ? fila.email : (fila.emailAprobado ?? fila.email)}
        invitado={fila.invitadoEn !== null}
      />
    </Tarjeta>
  );
}
