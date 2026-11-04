// ---------------------------------------------------------------
// QUÉ DATOS PUEDE ENSEÑAR LA BARRA
//
// La barra del alumno vive en el layout de `(alumno)`, que Next no vuelve
// a pedir al navegar. Eso es lo que hace que no parpadee, y también es lo
// que provocó el fallo de la auditoría del 30/09/2026: el equipo abría a
// Ane, volvía al buscador, abría a Pilar y veía la página de Pilar con la
// barra de Ane.
//
// LA REGLA QUE LO IMPIDE ES ESTA, Y ES LA ÚNICA: unos datos solo se pintan
// si son del alumno que pide la URL de ahora mismo. Da igual de dónde
// vengan —la primera carga, una página publicando, una copia guardada por
// el router—, porque todos llevan su `alumnoId` y aquí se comparan.
//
//   · Rol alumno: siempre él. Ni la ruta ni `?alumno=` cambian nada.
//   · Equipo: la ficha de la URL, o "" sin ninguna (revisar un curso).
//
// Si nada sirve, la barra se queda en su carcasa sin nombre ni cifras.
// Un hueco se nota menos que una barra de otra persona.
//
// Módulo puro, sin React, para poder probarlo sin navegador.
// ---------------------------------------------------------------

/** El alumno del que tiene que hablar la barra con esta URL. */
export function alumnoEsperado(alumnoPropio: string | null, focoDeLaUrl: string | null): string {
  return alumnoPropio ?? focoDeLaUrl ?? "";
}

/** Los primeros datos que son de ese alumno, o null si ninguno lo es. */
export function datosQueSirven<T extends { alumnoId: string }>(esperado: string, ...candidatos: (T | null)[]): T | null {
  return candidatos.find((datos) => datos !== null && datos.alumnoId === esperado) ?? null;
}
