"use client";

import { useCallback, useState } from "react";
import { usarIdioma } from "@/components/ProveedorIdioma";
import { TARJETA, TITULO_SECCION } from "@/components/base/Seccion";
import HojaInferior from "@/components/base/HojaInferior";
import type { EstadoAutoservicio, LecturaAutoservicio } from "@/lib/autoservicio/tipos";
import CambiarHorario from "@/components/clases/autoservicio/CambiarHorario";
import CambiarProfesor, { type AccionesProfesor } from "@/components/clases/autoservicio/CambiarProfesor";
import { Aviso, BotonWhatsApp } from "@/components/clases/autoservicio/Piezas";

/**
 * «TU HORARIO» EN «MIS CLASES»: los dos botones y el WhatsApp.
 *
 * Lo que se enseña lo decide el estado de Gestión, no esta tarjeta, y
 * cada botón por su lado:
 *
 *   · «Cambiar de horario», con AUTOSERVICIO_ACTIVO y si es `elegible`.
 *   · «Cambiar de profesor», con AUTOSERVICIO_PROFESOR_ACTIVO y si
 *     `puede_cambiar_profesor` lo dice (contrato v2). Si no puede, la
 *     razón y —si Gestión la sabe— desde cuándo podrá. Con Gestión en v1
 *     no viene, y el botón no sale.
 *
 *   Pueden ir por separado: con el calendario de su profesor sin
 *   actualizar no puede cambiar de horario pero sí de profesor.
 *
 *   · Sin ninguno de los dos: por qué —con el texto de su código— y el
 *     WhatsApp como botón principal.
 *   · El equipo mirando la ficha: una frase, ningún botón. Sin estado:
 *     no se le pregunta a Gestión.
 *
 * Cada flujo se abre en una hoja (`HojaInferior`), desde abajo en móvil
 * y centrada en escritorio.
 */
export default function Autoservicio({
  estado,
  whatsapp,
  soloLectura,
  conHorario = true,
  conProfesor = false,
  simulado = false,
  accionesProfesor,
}: {
  /** Null solo en solo lectura: entonces no se pregunta a Gestión. */
  estado: LecturaAutoservicio<EstadoAutoservicio> | null;
  whatsapp: string;
  soloLectura: boolean;
  /** «Cambiar de horario», con su interruptor (AUTOSERVICIO_ACTIVO). */
  conHorario?: boolean;
  /** «Cambiar de profesor», con el suyo (AUTOSERVICIO_PROFESOR_ACTIVO). */
  conProfesor?: boolean;
  /** Con AUTOSERVICIO_SIMULADO: el cambio de profesor avisa de que no se guarda. */
  simulado?: boolean;
  /** Solo para el arnés de pruebas: ver `CambiarProfesor`. */
  accionesProfesor?: AccionesProfesor;
}) {
  const t = usarIdioma().t.autoservicio;
  const [abierto, setAbierto] = useState<"horario" | "profesor" | null>(null);
  const cerrar = useCallback(() => setAbierto(null), []);

  const leido = estado?.ok ? estado.datos : null;
  const horario = conHorario && leido?.elegible ? leido : null;
  const cambio = conProfesor ? leido?.cambioProfesor ?? null : null;
  const puedeProfesor = cambio?.puede === true;
  /** Por qué no puede cambiar de profesor ahora, cuando Gestión lo dice. */
  const profesorNo = cambio && !cambio.puede ? t.profesorNoDisponible(cambio) : null;
  const motivo = !estado ? "GENERICO" : estado.ok ? estado.datos.motivoNoElegible ?? "GENERICO" : estado.codigo;

  return (
    <section aria-labelledby="titulo-autoservicio" className={`${TARJETA} mt-[26px] p-[18px] min-[900px]:mt-9 min-[900px]:p-6`}>
      <h2 id="titulo-autoservicio" className={TITULO_SECCION}>
        {t.titulo}
      </h2>

      {soloLectura ? (
        <p className="mt-2 text-[14px] italic text-marca-gris">{t.soloLectura}</p>
      ) : horario || puedeProfesor ? (
        <>
          {/* Con el horario cerrado y el profesor abierto, por qué el
              horario no: que no parezca que falta un botón. */}
          {conHorario && !horario && (
            <div className="mt-3">
              <Aviso>{t.motivoAlLeer(motivo)}</Aviso>
            </div>
          )}
          <div className="mt-4 flex flex-col gap-2.5 min-[500px]:flex-row">
            {horario && (
              <button
                type="button"
                onClick={() => setAbierto("horario")}
                className="btn-verde inline-flex min-h-[52px] flex-1 items-center justify-center rounded-full px-6 text-[16px] font-bold"
              >
                {t.cambiarHorario}
              </button>
            )}
            {puedeProfesor && (
              <button
                type="button"
                onClick={() => setAbierto("profesor")}
                className={`${horario ? "btn-verde-linea" : "btn-verde"} inline-flex min-h-[52px] flex-1 items-center justify-center rounded-full px-6 text-[16px] font-bold`}
              >
                {t.cambiarProfesor}
              </button>
            )}
          </div>
          {profesorNo && <p className="mt-2.5 text-[14px] leading-snug text-marca-gris">{profesorNo}</p>}
          <div className="mt-5 border-t border-marca-borde pt-4">
            <p className="mb-2 text-[15px] font-semibold text-marca-tinta">{t.noEncuentras}</p>
            <BotonWhatsApp href={whatsapp} texto={t.escribenos} />
          </div>
        </>
      ) : (
        <div className="mt-3 flex flex-col gap-3">
          <Aviso>{conHorario || !profesorNo ? t.motivoAlLeer(motivo) : profesorNo}</Aviso>
          <BotonWhatsApp href={whatsapp} texto={t.escribenos} principal />
        </div>
      )}

      {horario && (
        <HojaInferior abierta={abierto === "horario"} alCerrar={cerrar} etiqueta={t.cambiarHorario} etiquetaCerrar={t.cerrar}>
          <CambiarHorario estado={horario} whatsapp={whatsapp} alCerrar={cerrar} />
        </HojaInferior>
      )}
      {puedeProfesor && leido && (
        <HojaInferior abierta={abierto === "profesor"} alCerrar={cerrar} etiqueta={t.cambiarProfesor} etiquetaCerrar={t.cerrar}>
          <CambiarProfesor
            profesorActual={leido.profesor}
            whatsapp={whatsapp}
            alCerrar={cerrar}
            simulado={simulado}
            acciones={accionesProfesor}
          />
        </HojaInferior>
      )}
    </section>
  );
}
