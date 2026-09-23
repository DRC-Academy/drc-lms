// ---------------------------------------------------------------
// EL ARRANQUE DEL RECORRIDO GUIADO
//
// Un suceso del navegador, como `abrirAyuda()` del chat: quien quiera
// lanzar el recorrido no necesita importar el motor ni estar cerca de él.
// Lo escucha `Tutorial`, montado una vez en el marco de la app.
//
//   onboarding   lo lanza el inicio la primera vez (ArranqueTutorial).
//   manual       el botón de la Ayuda. No toca «visto».
// ---------------------------------------------------------------

export const SUCESO_LANZAR_TUTORIAL = "drc:lanzar-tutorial";

export type ModoTutorial = "onboarding" | "manual";

export function lanzarTutorial(modo: ModoTutorial = "manual") {
  window.dispatchEvent(new CustomEvent(SUCESO_LANZAR_TUTORIAL, { detail: { modo } }));
}
