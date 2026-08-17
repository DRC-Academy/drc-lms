"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { guardarAcceso, leerAccesos, quitarAcceso } from "@/app/acciones-accesos";
import type { FilaAcceso } from "@/lib/accesos-manuales";

/**
 * El gestor de accesos de un alumno: el menú «···» de su tarjeta y el
 * panel que abre.
 *
 * POR QUÉ CARGA AL ABRIR Y NO ANTES. El estado de accesos de un alumno
 * cuesta cuatro consultas —cursos, excepciones, perfil y progreso—, y la
 * lista enseña veinte alumnos. Cargarlo por si acaso serían ochenta
 * consultas por página para un panel que casi siempre se abre en uno
 * solo. Se pide al pulsar.
 *
 * POR QUÉ CADA CASILLA GUARDA SOLA. No hay botón de «Guardar». Cada
 * concesión es una decisión con su propio motivo y su propia fila en el
 * historial; un guardado en bloque las juntaría todas bajo el mismo
 * apunte y haría ilegible el «por qué» dentro de seis meses. Además
 * evita el estado a medias de un formulario que se cierra sin enviar.
 *
 * Todo lo que decide de verdad está en el servidor: estas acciones
 * comprueban el rol antes de tocar nada, y quién concede sale de la
 * cookie. Esto es la pantalla, no el guardia.
 */
export default function GestorAccesos({
  alumnoId,
  nombre,
  nivel,
}: {
  alumnoId: string;
  nombre: string;
  nivel: string;
}) {
  const router = useRouter();
  const [menu, setMenu] = useState(false);
  const [abierto, setAbierto] = useState(false);
  const [filas, setFilas] = useState<FilaAcceso[] | null>(null);
  const [motivo, setMotivo] = useState("");
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const cajaMenu = useRef<HTMLDivElement>(null);

  const cargar = useCallback(async () => {
    setFilas(null);
    setError(null);
    try {
      setFilas(await leerAccesos(alumnoId));
    } catch {
      setError("No se pudo leer el estado de los accesos.");
      setFilas([]);
    }
  }, [alumnoId]);

  function abrir() {
    setMenu(false);
    setAbierto(true);
    setMotivo("");
    void cargar();
  }

  // Cerrar el menú al pulsar fuera. Sin esto se quedan dos abiertos al
  // pasar de una tarjeta a otra.
  useEffect(() => {
    if (!menu) return;
    function fuera(e: MouseEvent) {
      if (!cajaMenu.current?.contains(e.target as Node)) setMenu(false);
    }
    document.addEventListener("mousedown", fuera);
    return () => document.removeEventListener("mousedown", fuera);
  }, [menu]);

  // Escape cierra lo que esté abierto, empezando por lo de más arriba.
  useEffect(() => {
    function tecla(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      if (abierto) setAbierto(false);
      else if (menu) setMenu(false);
    }
    document.addEventListener("keydown", tecla);
    return () => document.removeEventListener("keydown", tecla);
  }, [abierto, menu]);

  /**
   * Tras cada cambio se relee la tabla Y se refresca la ruta: lo primero
   * actualiza el panel abierto —quién concedió, cuándo, el motivo—, lo
   * segundo actualiza la página que hay detrás. Ninguna de las dos
   * recarga el navegador.
   */
  async function tras(resultado: { ok: boolean; error?: string }) {
    if (!resultado.ok) {
      setError(resultado.error ?? "No se pudo guardar.");
      return;
    }
    setError(null);
    await cargar();
    router.refresh();
  }

  async function alternarAcceso(fila: FilaAcceso) {
    if (fila.origen === "plan") return; // No se quita desde aquí.
    setOcupado(fila.curso.id);
    try {
      await tras(
        fila.origen === "manual"
          ? await quitarAcceso({ alumnoId, cursoId: fila.curso.id })
          : await guardarAcceso({ alumnoId, cursoId: fila.curso.id, sinDrip: false, motivo })
      );
    } finally {
      setOcupado(null);
    }
  }

  async function alternarDrip(fila: FilaAcceso) {
    setOcupado(fila.curso.id);
    try {
      await tras(
        await guardarAcceso({
          alumnoId,
          cursoId: fila.curso.id,
          sinDrip: !fila.sinDrip,
          // Se conserva el motivo que ya tenía si no se escribió otro:
          // cambiar el drip no debería borrar por qué se dio el acceso.
          motivo: motivo.trim() !== "" ? motivo : (fila.motivo ?? ""),
        })
      );
    } finally {
      setOcupado(null);
    }
  }

  return (
    <>
      {/* ------------------------------- MENÚ ------------------------------- */}
      {/* Pegado al borde derecho y centrado. La tarjeta le hace sitio
          con un `pr-12`, que empuja su flecha hacia dentro: así conviven
          el enlace de toda la vida y este menú sin pisarse. */}
      <div ref={cajaMenu} className="absolute right-2.5 top-1/2 z-10 -translate-y-1/2">
        <button
          type="button"
          onClick={() => setMenu((v) => !v)}
          aria-label={`Acciones de ${nombre || "este alumno"}`}
          aria-expanded={menu}
          aria-haspopup="menu"
          className="grid h-8 w-8 place-items-center rounded-lg text-[16px] leading-none text-marca-grisTenue transition-colors hover:bg-marca-niebla hover:text-marca-tinta"
        >
          ···
        </button>

        {menu && (
          <div
            role="menu"
            className="absolute right-0 top-9 w-52 overflow-hidden rounded-[10px] border border-marca-borde bg-white py-1 shadow-lg"
          >
            <button
              type="button"
              role="menuitem"
              onClick={abrir}
              className="block w-full px-3.5 py-2.5 text-left text-[13.5px] text-marca-tinta transition-colors hover:bg-marca-niebla"
            >
              Gestionar accesos
            </button>
          </div>
        )}
      </div>

      {/* ------------------------------- PANEL ------------------------------- */}
      {abierto && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <button
            type="button"
            aria-label="Cerrar"
            onClick={() => setAbierto(false)}
            className="absolute inset-0 bg-[rgba(18,33,26,.42)]"
          />

          <div
            role="dialog"
            aria-modal="true"
            aria-label={`Accesos de ${nombre}`}
            className="relative flex max-h-[88vh] w-full max-w-[560px] flex-col rounded-t-[18px] bg-white sm:rounded-[18px]"
          >
            <div className="flex items-start justify-between gap-4 border-b border-marca-borde px-5 pb-3.5 pt-[18px]">
              <div className="min-w-0">
                <p className="text-[10.5px] font-semibold uppercase leading-none tracking-[0.1em] text-marca-grisSuave">
                  Gestionar accesos
                </p>
                <h2 className="mt-2 truncate font-display text-[18px] font-bold leading-[1.25] text-marca-tinta">
                  {nombre || "Sin nombre"}
                  <span className="ml-2 text-[13px] font-medium text-marca-grisSuave">{nivel}</span>
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setAbierto(false)}
                aria-label="Cerrar"
                className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[15px] text-marca-gris transition-colors hover:bg-marca-niebla"
              >
                ✕
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
              {error && (
                <p className="mb-3 rounded-[10px] bg-marca-examen px-3.5 py-2.5 text-[13px] leading-[1.4] text-marca-tinta">
                  {error}
                </p>
              )}

              {filas === null ? (
                <p className="py-6 text-center text-[13.5px] text-marca-grisSuave">Cargando…</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {filas.map((fila) => (
                    <FilaCurso
                      key={fila.curso.id}
                      fila={fila}
                      ocupada={ocupado === fila.curso.id}
                      alAlternarAcceso={() => void alternarAcceso(fila)}
                      alAlternarDrip={() => void alternarDrip(fila)}
                    />
                  ))}
                </ul>
              )}
            </div>

            <div className="border-t border-marca-borde px-5 pb-5 pt-3.5">
              <label
                htmlFor={`motivo-${alumnoId}`}
                className="block text-[12px] font-semibold text-marca-gris"
              >
                Motivo <span className="font-normal text-marca-grisSuave">(opcional)</span>
              </label>
              <input
                id={`motivo-${alumnoId}`}
                type="text"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Ej.: pidió repetir el First"
                className="mt-1.5 min-h-[38px] w-full rounded-[10px] border border-marca-borde px-3 text-[13.5px] text-marca-tinta outline-none transition-colors placeholder:text-marca-grisTenue focus:border-marca-verde"
              />
              <p className="mt-2 text-[11.5px] leading-[1.4] text-marca-grisSuave">
                Se guarda con el acceso, junto a tu correo y la fecha. Escríbelo antes de marcar la
                casilla.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/** Una de las siete filas del panel. */
function FilaCurso({
  fila,
  ocupada,
  alAlternarAcceso,
  alAlternarDrip,
}: {
  fila: FilaAcceso;
  ocupada: boolean;
  alAlternarAcceso: () => void;
  alAlternarDrip: () => void;
}) {
  const tiene = fila.origen !== null;
  const delPlan = fila.origen === "plan";

  return (
    <li
      className={`rounded-[12px] border px-3.5 py-3 transition-colors ${
        tiene ? "border-marca-verde bg-marca-verdeFondo" : "border-marca-borde bg-white"
      }`}
    >
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={tiene}
          // Los del plan se ven marcados pero no se sueltan desde aquí:
          // ese acceso lo decide el producto que compró, y se cambia en
          // Gestión. Deshabilitar la casilla lo dice mejor que un aviso.
          disabled={delPlan || ocupada}
          onChange={alAlternarAcceso}
          aria-label={`Acceso a ${fila.curso.titulo}`}
          className="mt-0.5 h-4 w-4 shrink-0 accent-marca-verde disabled:opacity-60"
        />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-[13.5px] font-semibold text-marca-tinta">
              {fila.curso.titulo}
            </span>
            {delPlan && <Etiqueta tono="verde">plan</Etiqueta>}
            {fila.origen === "manual" && <Etiqueta tono="azul">a mano</Etiqueta>}
          </div>

          {delPlan && (
            <p className="mt-1 text-[11.5px] leading-[1.4] text-marca-grisSuave">
              Se lo da su plan. Para quitárselo hay que cambiarlo en DRC Gestión.
            </p>
          )}

          {fila.origen === "manual" && fila.concedidaPor && (
            <p className="mt-1 text-[11.5px] leading-[1.4] text-marca-grisSuave">
              {fila.concedidaPor} · {fecha(fila.creadaEn)}
              {fila.motivo ? ` · «${fila.motivo}»` : ""}
            </p>
          )}

          {/* LA SEÑAL DE LEARNDASH. No concede nada: solo dice que aquí
              hay trabajo hecho que el alumno no puede ver. Es el caso
              que justifica todo este panel. */}
          {!tiene && fila.leccionesHechas > 0 && (
            <p className="mt-1.5 flex items-start gap-1.5 rounded-[8px] bg-marca-examen px-2.5 py-1.5 text-[11.5px] leading-[1.4] text-marca-tinta">
              <span aria-hidden>⚠</span>
              <span>
                <strong className="font-semibold tabular-nums">{fila.leccionesHechas}</strong>{" "}
                {fila.leccionesHechas === 1 ? "lección hecha" : "lecciones hechas"} aquí y sin
                acceso. Progreso migrado de LearnDash.
              </span>
            </p>
          )}

          {/* EL DESBLOQUEO. Solo en cursos que ya tiene, porque abrir el
              drip de algo a lo que no puede entrar no significa nada. */}
          {tiene && (
            <label className="mt-2 flex items-start gap-2 text-[12px] leading-[1.4] text-marca-tinta">
              <input
                type="checkbox"
                checked={fila.sinDrip}
                disabled={ocupada}
                onChange={alAlternarDrip}
                className="mt-px h-3.5 w-3.5 shrink-0 accent-marca-amarillo disabled:opacity-60"
              />
              <span>
                Abrirle el curso entero
                <span className="block text-[11px] text-marca-grisSuave">
                  Se salta el desbloqueo semanal. Es una excepción a la apertura progresiva del
                  curso, no un ajuste.
                </span>
              </span>
            </label>
          )}

          {fila.sinDrip && (
            <p className="mt-1.5 rounded-[8px] bg-marca-examen px-2.5 py-1.5 text-[11.5px] font-semibold leading-[1.4] text-marca-amarilloTexto">
              Curso abierto entero · sin espera semanal
            </p>
          )}
        </div>
      </div>
    </li>
  );
}

function Etiqueta({ tono, children }: { tono: "verde" | "azul"; children: React.ReactNode }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] ${
        tono === "verde"
          ? "bg-marca-verde text-white"
          : "border border-marca-borde bg-white text-marca-gris"
      }`}
    >
      {children}
    </span>
  );
}

/** `2026-08-17T…` -> `17/08/2026`. Sin librería: es una fecha corta. */
function fecha(iso: string | null): string {
  if (!iso) return "";
  const d = iso.slice(0, 10).split("-");
  return d.length === 3 ? `${d[2]}/${d[1]}/${d[0]}` : iso;
}
