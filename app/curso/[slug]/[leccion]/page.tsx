import { notFound, redirect } from "next/navigation";
import { exigirSesion } from "@/lib/sesion-servidor";
import { obtenerPerfil } from "@/lib/gestion";
import { cursoPorSlug, cursosAsignados, leccionParaVer } from "@/lib/cursos-servidor";
import { comoFecha } from "@/lib/fechas";
import { sanearHtml, tieneContenido } from "@/lib/sanear-html";
import { prepararLeccion } from "@/lib/leccion-html";
import { etiquetaModulo, partirModulo } from "@/lib/modulo";
import { incrustacionYoutube } from "@/lib/youtube";
import VistaLeccion from "@/components/leccion/VistaLeccion";
import type { EjercicioVista } from "@/lib/ejercicios";

export const dynamic = "force-dynamic";

export default async function PaginaLeccion({
  params,
}: {
  params: { slug: string; leccion: string };
}) {
  const sesion = await exigirSesion();

  const curso = await cursoPorSlug(params.slug);
  if (!curso) notFound();

  const alumnoId = sesion.rol === "alumno" ? sesion.alumnoId : "";

  // El perfil hace dos cosas aquí: es el guard —un alumno solo entra en
  // los cursos de su plan— y de él sale el nombre del profesor, que
  // aparece en el cierre de los ejercicios.
  const perfil = sesion.rol === "alumno" ? await obtenerPerfil(sesion.alumnoId) : null;

  if (sesion.rol === "alumno") {
    const suyos = perfil ? await cursosAsignados(perfil.plan, perfil.nivel) : [];
    if (!suyos.some((c) => c.id === curso.id)) redirect(`/alumno/${sesion.alumnoId}`);
  }

  const vista = await leccionParaVer(alumnoId, curso, params.leccion, comoFecha(perfil?.fechaInicio));
  if (!vista) notFound();

  // La lección existe y es suya, pero su módulo todavía no se ha abierto.
  // No es un 404 —la lección está ahí y la verá— así que se le devuelve
  // al temario, que es donde pone cuándo la tendrá. Llegar aquí es raro:
  // en la pantalla del curso la fila no es un enlace. Pasa con un enlace
  // viejo, con el botón atrás o escribiendo la URL a mano.
  if (!vista.disponible) redirect(`/curso/${curso.slug}`);

  const {
    leccion,
    hermanas,
    ejercicios,
    moduloTitulo,
    moduloOrden,
    completada,
    siguienteId,
    anteriorId,
    cursoCompletadas,
    cursoTotal,
  } = vista;

  // El orden importa: primero el saneado —que quita scripts, manejadores
  // e iframes que no sean de YouTube o Podbean— y después la preparación,
  // que quita emojis y pone las anclas de los títulos. Al revés, las
  // anclas podrían acabar dentro de algo que el saneador se lleva.
  const saneado = sanearHtml(leccion.contenido);
  const { html, titulos } = prepararLeccion(saneado);
  const contenidoHtml = tieneContenido(html) ? html : "";

  const ejerciciosVista: EjercicioVista[] = ejercicios.map((e) => ({
    id: e.id,
    tipo: e.tipo,
    enunciado: e.enunciado,
    opciones: Array.isArray(e.opciones) ? e.opciones : [],
    correcta: e.correcta,
    orden: e.orden,
  }));

  const partido = partirModulo(moduloTitulo, moduloOrden);
  const posicion = hermanas.findIndex((h) => h.id === leccion.id);
  const nombre = perfil?.nombre.trim() ?? "";

  return (
    <VistaLeccion
      cursoTitulo={curso.titulo}
      cursoSlug={curso.slug}
      cursoCompletadas={cursoCompletadas}
      cursoTotal={cursoTotal}
      etiquetaModulo={etiquetaModulo(partido)}
      tituloModulo={partido.titulo}
      leccion={{
        id: leccion.id,
        titulo: leccion.titulo,
        videoIncrustado: incrustacionYoutube(leccion.videoUrl),
      }}
      contenidoHtml={contenidoHtml}
      titulos={titulos}
      hermanas={hermanas}
      ejercicios={ejerciciosVista}
      completada={completada}
      siguienteId={siguienteId}
      anteriorId={anteriorId}
      esUltimaDelModulo={posicion === hermanas.length - 1}
      registrarIntentos={sesion.rol === "alumno"}
      profesor={perfil?.profesor.trim() ?? ""}
      inicial={nombre[0]?.toUpperCase() ?? ""}
      volverA={sesion.rol === "alumno" ? `/alumno/${sesion.alumnoId}` : "/"}
    />
  );
}
