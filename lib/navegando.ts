// ---------------------------------------------------------------
// ¿ESTE CLIC VA A CAMBIAR DE PANTALLA?
//
// Lo pregunta la barrita verde de arriba (`components/BarraNavegando.tsx`).
// Una respuesta falsa se ve: una barra que aparece y no termina nunca, o
// un clic que no contesta. Por eso vive aparte y con sus pruebas.
// ---------------------------------------------------------------

type Clic = { button: number; metaKey: boolean; ctrlKey: boolean; shiftKey: boolean; altKey: boolean };
type Enlace = { href: string; target: string; descarga: boolean };
type Ubicacion = { origin: string; pathname: string; search: string };

export function clicQueNavega(clic: Clic, enlace: Enlace, aqui: Ubicacion): boolean {
  // Otra pestaña u otra ventana: esta pantalla no se mueve.
  if (clic.button !== 0 || clic.metaKey || clic.ctrlKey || clic.shiftKey || clic.altKey) return false;
  if (enlace.target !== "" && enlace.target !== "_self") return false;
  if (enlace.descarga) return false;

  let destino: URL;
  try {
    destino = new URL(enlace.href, `${aqui.origin}${aqui.pathname}${aqui.search}`);
  } catch {
    return false;
  }

  if (destino.origin !== aqui.origin) return false;
  // La misma pantalla, o un ancla dentro de ella: no hay ruta que cambie.
  return destino.pathname !== aqui.pathname || destino.search !== aqui.search;
}
