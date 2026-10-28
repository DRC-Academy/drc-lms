"use client";

import { useCallback, useEffect, useState } from "react";
import HojaValoracion from "@/components/valoraciones/HojaValoracion";
import { descartarPopupValoracion } from "@/app/acciones-valoraciones";
import { SUCESO_LANZAR_TUTORIAL } from "@/components/tutorial/eventos";

// ---------------------------------------------------------------
// EL POP-UP DE DESPUÉS DE LA CLASE
//
// Lo monta el layout del alumno (`ValoracionAlEntrar`) cuando el servidor
// ha encontrado la última clase dada del alumno, sin fila en
// `valoraciones_clase`. Aquí solo se decide CUÁNDO abrirlo:
//
//   · UNO POR VISITA. Una visita es la sesión de la pestaña
//     (sessionStorage): una vez abierto, no vuelve a salir en ella aunque
//     se recargue.
//   · NUNCA ENCIMA DE OTRA COSA. Espera un poco a que la página se asiente
//     y no se abre si hay un recorrido en marcha, la Ayuda abierta u otro
//     diálogo modal. Si arranca el recorrido mientras espera, se retira.
//
// Cerrarlo sin valorar —X, «Ahora no», el fondo o Escape— lo apunta como
// descartado y no vuelve a salir hasta su próxima clase. No hay otro
// sitio desde el que valorarla: solo se valora la última clase, y solo aquí.
//
// `vistaPrevia`: el equipo revisando una ficha lo ve como el alumno, en
// cada carga de la página, y cerrarlo o enviarlo no apunta nada.
// ---------------------------------------------------------------

const ESPERA_MS = 2500;
/** Ya salió en esta visita. */
export const CLAVE_VISITA = "drc:valoracion-vista";

function leer(clave: string): string | null {
  try {
    return sessionStorage.getItem(clave);
  } catch {
    return null;
  }
}

function escribir(clave: string) {
  try {
    sessionStorage.setItem(clave, "1");
  } catch {
    // Sin almacenamiento, como mucho sale otra vez en la próxima carga.
  }
}

function hayOtraCosaDelante(): boolean {
  return (
    leer("drc:tutorial") !== null ||
    document.querySelector("[data-tutorial-activo], [data-ayuda-abierta], [aria-modal='true']") !== null
  );
}

export default function PopupValoracion({
  claseId,
  profesor,
  vistaPrevia = false,
}: {
  claseId: string;
  profesor: string | null;
  vistaPrevia?: boolean;
}) {
  const [abierta, setAbierta] = useState(false);
  useEffect(() => {
    // El equipo lo ve en cada carga: la visita es cosa del alumno.
    if (!vistaPrevia && leer(CLAVE_VISITA)) return;
    let retirado = false;
    const retirarse = () => {
      retirado = true;
    };
    window.addEventListener(SUCESO_LANZAR_TUTORIAL, retirarse);
    const reloj = setTimeout(() => {
      if (retirado || hayOtraCosaDelante()) return;
      if (!vistaPrevia) escribir(CLAVE_VISITA);
      setAbierta(true);
    }, ESPERA_MS);
    return () => {
      clearTimeout(reloj);
      window.removeEventListener(SUCESO_LANZAR_TUTORIAL, retirarse);
    };
  }, [vistaPrevia]);

  const alCerrar = useCallback(
    (enviada: boolean) => {
      setAbierta(false);
      if (!enviada && !vistaPrevia) void descartarPopupValoracion(claseId).catch(() => {});
    },
    [claseId, vistaPrevia]
  );

  return (
    <HojaValoracion
      abierta={abierta}
      claseId={claseId}
      profesor={profesor}
      origen="popup"
      vistaPrevia={vistaPrevia}
      alCerrar={alCerrar}
    />
  );
}
