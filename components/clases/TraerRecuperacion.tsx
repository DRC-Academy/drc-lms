"use client";

import { useEffect } from "react";

/**
 * Al llegar desde el correo (`?recuperacion=<id>`), lleva la pantalla a
 * esa tarjeta. Una vez, al montar: si después el alumno se mueve por la
 * página, no se le vuelve a arrastrar.
 */
export default function TraerRecuperacion({ id }: { id: string }) {
  useEffect(() => {
    document.getElementById(`recuperacion-${id}`)?.scrollIntoView({ block: "center" });
  }, []);
  return null;
}
