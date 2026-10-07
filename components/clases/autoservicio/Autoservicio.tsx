"use client";

import { useCallback, useState } from "react";
import { usarIdioma } from "@/components/ProveedorIdioma";
import { TARJETA, TITULO_SECCION } from "@/components/base/Seccion";
import HojaInferior from "@/components/base/HojaInferior";
import type { EstadoAutoservicio, HuecoConProfesor, LecturaAutoservicio } from "@/lib/autoservicio/tipos";
import CambiarHorario from "@/components/clases/autoservicio/CambiarHorario";
import CambiarProfesor from "@/components/clases/autoservicio/CambiarProfesor";
import { Aviso, BotonWhatsApp } from "@/components/clases/autoservicio/Piezas";

/**
 * «TU HORARIO» EN «MIS CLASES»: los dos botones y el WhatsApp.
 *
 * Lo que se enseña lo decide el estado de Gestión, no esta tarjeta:
 *
 *   · Elegible: «Cambiar de horario», «Cambiar de profesor» (solo con la
 *     simulación, ver `CambiarProfesor`) y, debajo, «¿No encuentras el
 *     horario que buscas?» con el WhatsApp.
 *   · No elegible, o Gestión sin contestar: en lugar de los botones, por
 *     qué —con el texto de su código— y el WhatsApp como botón principal.
 *   · El equipo mirando la ficha: el estado a la vista, ningún botón.
 *
 * Cada flujo se abre en una hoja (`HojaInferior`), desde abajo en móvil
 * y centrada en escritorio.
 */
export default function Autoservicio({
  estado,
  whatsapp,
  otrosProfesores,
  soloLectura,
}: {
  estado: LecturaAutoservicio<EstadoAutoservicio>;
  whatsapp: string;
  /** Null: sin «Cambiar de profesor». */
  otrosProfesores: Record<string, HuecoConProfesor[]> | null;
  soloLectura: boolean;
}) {
  const t = usarIdioma().t.autoservicio;
  const [abierto, setAbierto] = useState<"horario" | "profesor" | null>(null);
  const cerrar = useCallback(() => setAbierto(null), []);

  const datos = estado.ok && estado.datos.elegible ? estado.datos : null;
  const motivo = estado.ok ? estado.datos.motivoNoElegible ?? "GENERICO" : estado.codigo;

  return (
    <section aria-labelledby="titulo-autoservicio" className={`${TARJETA} mt-[26px] p-[18px] min-[900px]:mt-9 min-[900px]:p-6`}>
      <h2 id="titulo-autoservicio" className={TITULO_SECCION}>
        {t.titulo}
      </h2>

      {soloLectura ? (
        <p className="mt-2 text-[14px] italic text-marca-gris">{t.soloLectura}</p>
      ) : datos ? (
        <>
          <div className="mt-4 flex flex-col gap-2.5 min-[500px]:flex-row">
            <button
              type="button"
              onClick={() => setAbierto("horario")}
              className="btn-verde inline-flex min-h-[52px] flex-1 items-center justify-center rounded-full px-6 text-[16px] font-bold"
            >
              {t.cambiarHorario}
            </button>
            {otrosProfesores && (
              <button
                type="button"
                onClick={() => setAbierto("profesor")}
                className="btn-verde-linea inline-flex min-h-[52px] flex-1 items-center justify-center rounded-full px-6 text-[16px] font-bold"
              >
                {t.cambiarProfesor}
              </button>
            )}
          </div>
          <div className="mt-5 border-t border-marca-borde pt-4">
            <p className="mb-2 text-[15px] font-semibold text-marca-tinta">{t.noEncuentras}</p>
            <BotonWhatsApp href={whatsapp} texto={t.escribenos} />
          </div>
        </>
      ) : (
        <div className="mt-3 flex flex-col gap-3">
          <Aviso>{t.motivoAlLeer(motivo)}</Aviso>
          <BotonWhatsApp href={whatsapp} texto={t.escribenos} principal />
        </div>
      )}

      {datos && (
        <>
          <HojaInferior abierta={abierto === "horario"} alCerrar={cerrar} etiqueta={t.cambiarHorario} etiquetaCerrar={t.cerrar}>
            <CambiarHorario estado={datos} whatsapp={whatsapp} alCerrar={cerrar} />
          </HojaInferior>
          {otrosProfesores && (
            <HojaInferior abierta={abierto === "profesor"} alCerrar={cerrar} etiqueta={t.cambiarProfesor} etiquetaCerrar={t.cerrar}>
              <CambiarProfesor estado={datos} otros={otrosProfesores} whatsapp={whatsapp} alCerrar={cerrar} />
            </HojaInferior>
          )}
        </>
      )}
    </section>
  );
}
