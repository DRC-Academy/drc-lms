"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Bloque, PerfilAlumno, UltimaClase } from "@/lib/data";
import type { ModoGeneracion, TarjetaModo } from "@/lib/modos";
import { formatearFecha } from "@/lib/perfil";
import { validarBloque } from "@/lib/validarBloque";
import {
  borrarProgresoLocal,
  hayProgresoLocal,
  recogerProgresoLocal,
} from "@/lib/migracion-local";
import TarjetasGeneracion, { type EstadoGeneracion } from "@/components/TarjetasGeneracion";
import ListaBloques, {
  type AvanceBloques,
  type ProgresoBloques,
} from "@/components/ListaBloques";

export default function PanelAlumno({
  alumnoId,
  perfil,
  ultimaClase,
  tarjetas,
  bloques,
  progresoInicial,
  avanceInicial,
  generadosIniciales,
  esAdministrador,
}: {
  alumnoId: string;
  /** Puede ser null: hay alumnos con clase analizada y sin fila de perfil. */
  perfil: PerfilAlumno | null;
  ultimaClase: UltimaClase | null;
  tarjetas: TarjetaModo[];
  bloques: Bloque[];
  /**
   * Progreso, avance y bloques generados, ya leídos de la base en el
   * servidor. Antes se leían del localStorage en un efecto, así que la
   * primera pintada salía vacía y las etiquetas de estado parpadeaban.
   */
  progresoInicial: ProgresoBloques;
  avanceInicial: AvanceBloques;
  generadosIniciales: Bloque[];
  /**
   * Solo cambia lo que se pinta. Lo decide el servidor al leer la cookie
   * y lo que esconde no lo protege este prop: el buscador está cerrado
   * en la propia home, no aquí.
   */
  esAdministrador: boolean;
}) {
  const router = useRouter();
  const [estado, setEstado] = useState<EstadoGeneracion>("listo");
  const [modoActivo, setModoActivo] = useState<ModoGeneracion | null>(null);

  /**
   * Los bloques generados en esta misma visita. Se guardan en la base
   * desde la ruta de generación, pero el servidor no vuelve a
   * consultarse hasta la siguiente navegación: hasta entonces viven aquí
   * para que el bloque aparezca en la lista en el acto.
   */
  const [generadosNuevos, setGeneradosNuevos] = useState<Bloque[]>([]);

  const zonaNuevos = useRef<HTMLDivElement | null>(null);

  const progreso = progresoInicial;
  const avance = avanceInicial;

  /**
   * MIGRACIÓN DEL PROGRESO QUE QUEDÓ EN EL NAVEGADOR
   *
   * Se ejecuta una sola vez, la primera visita después del cambio a base
   * de datos, y se borra el localStorage solo cuando el servidor
   * confirma el volcado.
   *
   * LA SALVAGUARDA: nada de esto puede dejar a nadie fuera ni enseñar un
   * error. Si falla, el alumno se queda con lo que haya en la base —que
   * puede ser nada— y se reintenta en la siguiente visita, porque las
   * claves locales siguen ahí. Por eso no hay estado de carga ni aviso:
   * pasa por detrás y no se nota.
   */
  const migracionLanzada = useRef(false);

  useEffect(() => {
    if (migracionLanzada.current || esAdministrador) return;
    if (!hayProgresoLocal()) return;

    migracionLanzada.current = true;
    const datos = recogerProgresoLocal(alumnoId);

    // Había claves, pero nada de este alumno: es un navegador
    // compartido, o progreso de otra ficha. Se limpian y ya está.
    if (!datos.progreso.length && !datos.avance.length && !datos.bloques.length) {
      borrarProgresoLocal();
      return;
    }

    void (async () => {
      try {
        const respuesta = await fetch("/api/migrar-local", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(datos),
        });
        if (!respuesta.ok) throw new Error(`La API respondió ${respuesta.status}`);

        const cuerpo: unknown = await respuesta.json();
        const migrado =
          typeof cuerpo === "object" && cuerpo !== null && (cuerpo as { migrado?: unknown }).migrado === true;

        // Solo se borra lo local si el servidor dice que lo tiene.
        if (!migrado) return;

        borrarProgresoLocal();
        // Vuelve a pedir la ficha al servidor: ahora el progreso está en
        // la base y esta pantalla todavía enseña el estado de antes.
        router.refresh();
      } catch (error) {
        console.error("[panel] No se pudo migrar el progreso local:", error);
        // A propósito: no se borra nada y no se avisa. Se reintenta solo.
      }
    })();
  }, [alumnoId, esAdministrador, router]);

  /**
   * La lista del servidor manda. Lo generado en esta visita se antepone
   * solo mientras el servidor no lo devuelva ya: en cuanto la ficha se
   * recarga, el duplicado desaparece solo.
   */
  const generados = useMemo(() => {
    const yaEstan = new Set(generadosIniciales.map((b) => b.id));
    return [...generadosNuevos.filter((b) => !yaEstan.has(b.id)), ...generadosIniciales];
  }, [generadosNuevos, generadosIniciales]);

  // Los generados van primero: son la novedad de la semana.
  const todos = useMemo(() => [...generados, ...bloques], [generados, bloques]);
  const idsGenerados = useMemo(() => generados.map((b) => b.id), [generados]);

  // El último bloque estático llega bloqueado hasta la siguiente clase.
  const indiceBloqueado = bloques.length > 1 ? todos.length - 1 : -1;

  const disponibles = todos.filter((_, i) => i !== indiceBloqueado);
  const enCurso = disponibles.find((b) => !progreso[b.id]) ?? disponibles[0];

  const generar = useCallback(
    async (modo: ModoGeneracion) => {
      setEstado("generando");
      setModoActivo(modo);
      try {
        const respuesta = await fetch("/api/generar-bloque", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            alumnoId,
            modo,
            excluir: todos.map((b) => b.titulo),
          }),
        });

        if (!respuesta.ok) throw new Error(`La API respondió ${respuesta.status}`);

        const cuerpo: unknown = await respuesta.json();
        const bloque = validarBloque(
          typeof cuerpo === "object" && cuerpo !== null
            ? (cuerpo as { bloque?: unknown }).bloque
            : null
        );
        if (!bloque) throw new Error("El bloque recibido no tiene la forma esperada");

        // Ya no se guarda desde aquí: lo hace `app/api/generar-bloque`
        // antes de responder, así que cuando llega esta línea el bloque
        // está en la base. Esto solo lo pone en pantalla.
        setGeneradosNuevos((previos) => [bloque, ...previos]);
        setEstado("listo");
        setModoActivo(null);

        // Que se vea aparecer: el bloque nuevo entra en cabeza de la lista.
        window.requestAnimationFrame(() => {
          zonaNuevos.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        });
      } catch (error) {
        console.error("[panel] No se pudo generar el bloque:", error);
        setEstado("error");
        setModoActivo(null);
      }
    },
    [alumnoId, todos]
  );

  const generando = estado === "generando";

  // El saludo, la fecha y el resumen de tres números que había aquí se
  // han ido: ahora el inicio empieza por el banner del curso y los
  // números los pinta `TiraEstadisticas`, los dos desde el servidor.
  // Este componente se queda con lo que necesita ser cliente.
  return (
    <>
        {/* El buscador solo existe para el equipo, así que el alumno no ve
            la vuelta atrás: su ficha es todo el sitio. */}
        {esAdministrador && (
          <Link
            href="/"
            className="-mb-4 self-start text-[14px] text-drc-cuerpo transition-colors hover:text-drc-verde-texto"
          >
            ← Cambiar de alumno
          </Link>
        )}

        {/* ------------------------- MODOS DE GENERACIÓN ------------------------ */}
        {/* Va justo debajo de la tira de estadísticas: banner, números y
            práctica es el orden del inicio. El contexto del alumno pasa
            a después, que es apoyo y no acción. */}
        <TarjetasGeneracion
          tarjetas={tarjetas}
          estado={estado}
          modoActivo={modoActivo}
          onGenerar={generar}
        />

        {/* --------------------------- CONTEXTO DEL ALUMNO ---------------------- */}
        {(ultimaClase || perfil?.puntosFuertes) && (
          <section className="grid gap-4 wide:grid-cols-[1.15fr_1fr]">
            {ultimaClase && (
              <article className="tarjeta">
                <h2 className="eyebrow text-drc-cuerpo">Tu última clase</h2>
                <p className="mt-4 text-[13px] tabular-nums text-drc-verde-texto">
                  {formatearFecha(ultimaClase.fechaClase)}
                </p>
                <p className="mt-1.5 text-pretty font-display text-[17px] font-semibold leading-snug text-drc-titular">
                  {ultimaClase.titulo}
                </p>
              </article>
            )}

            {perfil?.puntosFuertes && (
              <article className="tarjeta">
                <h2 className="eyebrow text-drc-cuerpo">Vas bien en</h2>
                <p className="mt-4 text-pretty text-[15px] leading-[1.55] text-drc-texto">
                  {perfil.puntosFuertes}
                </p>
              </article>
            )}
          </section>
        )}

        {/* --------------------------- BLOQUES DE LA SEMANA ---------------------- */}
        {todos.length > 0 && (
          <section ref={zonaNuevos} className="scroll-mt-20">
            <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2 border-b border-drc-borde pb-5">
              <div className="min-w-0">
                <h2 className="font-display text-[30px] font-semibold leading-[1.1] text-drc-titular">
                  Tus bloques
                </h2>
                <p className="mt-2 max-w-[46ch] text-pretty text-[15px] leading-[1.55] text-drc-cuerpo">
                  Cada bloque va de reconocer la forma a producirla tú solo. Cinco minutos cada uno.
                </p>
              </div>
              <p className="eyebrow shrink-0 tabular-nums text-drc-cuerpo">
                {todos.reduce((suma, b) => suma + b.minutos, 0)} min en total
              </p>
            </div>

            <ListaBloques
              bloques={todos}
              alumnoId={alumnoId}
              progreso={progreso}
              avance={avance}
              generados={idsGenerados}
              indiceBloqueado={indiceBloqueado}
              generando={generando}
            />
          </section>
        )}

      {/* ----------------------------- BARRA FIJA ------------------------------ */}
      {enCurso && !generando && (
        <div className="fondo-fundido pointer-events-none fixed inset-x-0 bottom-0 z-30 pb-5 pt-12">
          <div className="mx-auto w-full max-w-columna px-6">
            <div className="pointer-events-auto flex items-center gap-4 rounded-[18px] bg-drc-banner py-3 pl-5 pr-3">
              <div className="min-w-0 flex-1">
                <p className="eyebrow text-drc-amarillo">Sigue por aquí</p>
                <p className="mt-1.5 truncate font-display text-[17px] font-semibold text-white">
                  {enCurso.titulo}
                </p>
              </div>
              <Link
                href={`/alumno/${alumnoId}/${enCurso.id}`}
                className="btn btn-amarillo min-h-[46px] shrink-0"
              >
                Empezar
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
