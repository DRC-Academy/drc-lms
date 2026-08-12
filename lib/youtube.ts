// ---------------------------------------------------------------
// LA URL DE YOUTUBE QUE GUARDÓ LEARNDASH → UNA URL QUE SE PUEDE INCRUSTAR
//
// En `lecciones.video_url` está la URL tal cual la escribió quien montó
// el curso, y esa no se puede meter en un iframe: `watch?v=` es la
// página de YouTube, no el reproductor. Hay que sacar el id y montar
// la de `/embed/`.
//
// Las tres formas que existen en el export, y no hay más:
//
//   https://www.youtube.com/watch?v=ID                 151
//   https://youtu.be/ID                                  7
//   https://www.youtube.com/watch?v=ID&feature=youtu.be  3
//
// Se aceptan también `/embed/` y `/shorts/` porque cuestan una línea y
// son lo que alguien pegaría el día que añada un vídeo a mano.
//
// ESTO ES TAMBIÉN LA VALIDACIÓN. La vista no incrusta `video_url`: monta
// una URL nueva a partir del id. Si el campo trajera cualquier otra cosa
// —otro anfitrión, un `javascript:`, basura— no hay id que sacar, esto
// devuelve null y no se pinta nada. Por eso el iframe del vídeo no
// necesita pasar por `sanearHtml`: aquí no se copia nada del original.
// ---------------------------------------------------------------

/** El id de un vídeo de YouTube: once caracteres de este alfabeto. */
const ID = /^[A-Za-z0-9_-]{11}$/;

function idDeYoutube(url: string): string | null {
  let u: URL;
  try {
    u = new URL(url.trim());
  } catch {
    return null;
  }

  if (u.protocol !== "http:" && u.protocol !== "https:") return null;

  const host = u.hostname.replace(/^www\./i, "").toLowerCase();

  if (host === "youtu.be") {
    const id = u.pathname.slice(1).split("/")[0];
    return ID.test(id) ? id : null;
  }

  if (host === "youtube.com" || host === "youtube-nocookie.com" || host === "m.youtube.com") {
    const v = u.searchParams.get("v");
    if (v !== null && ID.test(v)) return v;

    const trozos = u.pathname.split("/").filter((t) => t !== "");
    if (trozos.length === 2 && (trozos[0] === "embed" || trozos[0] === "shorts")) {
      return ID.test(trozos[1]) ? trozos[1] : null;
    }
  }

  return null;
}

/**
 * La URL para el `src` del iframe, o null si no hay vídeo que pintar.
 *
 * `youtube-nocookie.com` y no `youtube.com`: el alumno no ha pedido que
 * YouTube lo siga por haber abierto una lección.
 *
 * `rel=0` deja los sugeridos del final dentro del mismo canal en vez de
 * mandar al alumno a otra parte de YouTube.
 */
export function incrustacionYoutube(url: string | null): string | null {
  if (url === null || url.trim() === "") return null;

  const id = idDeYoutube(url);
  return id === null ? null : `https://www.youtube-nocookie.com/embed/${id}?rel=0`;
}
