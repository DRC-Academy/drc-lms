// ---------------------------------------------------------------
// EL NOMBRE DEL PROFESOR QUE VE EL ALUMNO
//
// Gestión guarda a cada profesor con un nombre de USUARIO: «DanielaN»,
// «Daiana.M», «Sol.G», «Sebastian (test)», «Mauricio ». Es lo que
// distingue a dos Danielas en su panel, no como se presenta nadie.
//
// El nombre visible es una columna aparte de `teachers` que se rellena a
// mano en Gestión (`supabase/gestion-nombre-visible-profesor.sql`) y
// llega por las vistas. Mientras un profesor no la tenga, se limpia el
// usuario con reglas fijas. Ese respaldo vive AQUÍ y en ningún otro
// sitio: módulo puro, sin `server-only`, para poder probarlo.
// ---------------------------------------------------------------

/**
 * El usuario de Gestión sin lo que lo hace usuario:
 *
 *   · un paréntesis al final          «Sebastian (test)» → «Sebastian»
 *   · un punto y una inicial          «Daiana.M»         → «Daiana»
 *   · una mayúscula pegada al final   «DanielaN»         → «Daniela»
 *   · espacios de sobra               «Mauricio »        → «Mauricio»
 *
 * La mayúscula final solo se quita detrás de una minúscula: «Ana» o
 * «JUAN» se quedan como están. Si la limpieza lo dejara vacío, vuelve
 * el usuario recortado: mejor un nombre raro que ninguno.
 */
export function limpiarUsuarioProfesor(usuario: string): string {
  const recortado = usuario.replace(/\s+/g, " ").trim();
  const limpio = recortado
    .replace(/\s*\([^)]*\)\s*$/, "")
    .replace(/\.[A-Za-zÁÉÍÓÚÑÜáéíóúñü]{1,3}$/, "")
    .replace(/([a-záéíóúñü])[A-ZÁÉÍÓÚÑÜ]$/, "$1")
    .replace(/\s+/g, " ")
    .trim();
  return limpio || recortado;
}

/**
 * El nombre que se le enseña al alumno: el visible de Gestión si lo
 * tiene, y si no, el usuario limpio.
 */
export function nombreVisibleProfesor(visible: string | null | undefined, usuario: string): string {
  const puesto = (visible ?? "").replace(/\s+/g, " ").trim();
  return puesto || limpiarUsuarioProfesor(usuario);
}

/**
 * El nombre visible del profesor de la ficha, para el código puro que
 * recibe el perfil y no puede llamar a `profesorDelAlumno` (la tarjeta de
 * práctica, el generador de bloques). Es la misma regla: el visible de
 * la vista de perfiles o el usuario limpio.
 */
export function profesorVisibleDelPerfil(perfil: { profesor: string; profesorVisible: string | null }): string {
  return perfil.profesor.trim() ? nombreVisibleProfesor(perfil.profesorVisible, perfil.profesor) : "";
}
