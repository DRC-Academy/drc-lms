// ---------------------------------------------------------------
// «ACABO DE CERRAR ESTA PARADA»
//
// El alumno cierra un bloque en /alumno/[id]/[bloqueId] y vuelve a la
// ruta, que se rehace entera en el servidor: cuando llega, la parada ya
// está verde y la siguiente ya es la disponible. No hay ningún estado
// en memoria que sobreviva a ese salto, así que la ruta no tiene forma
// de saber que lo que está pintando ACABA de pasar.
//
// Esto es esa forma: una nota que se deja al cerrar y se recoge al
// llegar. Solo sirve para animar; si se pierde, la ruta se pinta bien
// igual, que es la propiedad que hay que conservar.
//
// POR QUÉ sessionStorage Y NO LA URL. Un `?cerrada=` se queda en la
// barra, se comparte al copiar el enlace y vuelve a disparar la
// animación con cada recarga o con el botón de atrás. La nota se
// consume al leerla, así que se ve una vez y solo una.
//
// Y por qué session y no local: muere con la pestaña. Nadie debería
// abrir la ruta mañana y ver celebrarse algo de hoy.
// ---------------------------------------------------------------

const CLAVE = "drc:parada-cerrada";

/** Pasada esto, la nota ya no es noticia y se ignora. */
const VIGENCIA_MS = 10 * 60 * 1000;

type Nota = { bloqueId: string; en: number };

/** Se llama al cerrar un bloque, justo antes de volver a la ruta. */
export function anotarParadaCerrada(bloqueId: string): void {
  if (typeof window === "undefined") return;
  try {
    const nota: Nota = { bloqueId, en: Date.now() };
    window.sessionStorage.setItem(CLAVE, JSON.stringify(nota));
  } catch {
    // Modo privado, cuota llena o storage bloqueado. Sin animación, y
    // ya está: no hay nada que contarle al alumno.
  }
}

/**
 * Qué parada acaba de cerrarse, o null.
 *
 * La nota se BORRA al leerla, así que recargar la página no repite la
 * animación. Es lo que la hace un aviso y no un estado.
 */
export function recogerParadaCerrada(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const crudo = window.sessionStorage.getItem(CLAVE);
    if (!crudo) return null;
    window.sessionStorage.removeItem(CLAVE);

    const nota = JSON.parse(crudo) as Partial<Nota>;
    if (typeof nota?.bloqueId !== "string" || typeof nota?.en !== "number") return null;
    if (Date.now() - nota.en > VIGENCIA_MS) return null;
    return nota.bloqueId;
  } catch {
    return null;
  }
}
