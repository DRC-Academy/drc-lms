import { nivelDelAlumno } from "@/lib/estimacion";
import { notFound, redirect } from "next/navigation";
import { focoActual } from "@/lib/sesion-servidor";
import { conFoco } from "@/lib/foco";
import { obtenerPerfil } from "@/lib/gestion";
import {
  arbolDelCurso,
  cursoPorSlug,
  cursosAsignados,
  ejerciciosPorLeccion,
  fechaDelDrip,
  leccionParaVer,
} from "@/lib/cursos-servidor";
import { sanearHtml, tieneContenido } from "@/lib/sanear-html";
import { partesDeLeccion, prepararLeccion } from "@/lib/leccion-html";
import { etiquetaModulo, partirModulo } from "@/lib/modulo";
import { textosActuales } from "@/lib/idioma-servidor";
import { incrustacionYoutube } from "@/lib/youtube";
import VistaLeccion from "@/components/leccion/VistaLeccion";
import type { EjercicioVista } from "@/lib/ejercicios";

export const dynamic = "force-dynamic";

export default async function PaginaLeccion({
  params,
}: {
  params: { slug: string; leccion: string };
}) {
  // Quién es el alumno de esta lección: él mismo, el revisado, o nadie
  // —el equipo repasando contenido—. Ver la cabecera equivalente en
  // `app/curso/[slug]/page.tsx`.
  const { sesion, alumnoId, paraEnlaces } = await focoActual();

  // ---------------------------------------------------------------
  // DOS OLAS, NO SIETE ESPERAS
  //
  // Esto era una cascada: cada consulta empezaba cuando la anterior
  // había vuelto, aunque no necesitara nada de ella. El curso no depende
  // del perfil, y la lección no depende de si el alumno está matriculado.
  // Encadenarlas sumaba siete viajes de ida y vuelta en fila, y eso —no
  // el tamaño de los datos— era casi toda la espera.
  //
  // Ahora solo hay dos niveles de dependencia reales: lo que sale de la
  // URL y de la cookie va en la primera ola, y lo que necesita el curso
  // o el perfil va en la segunda.
  // ---------------------------------------------------------------

  // El perfil hace dos cosas aquí: es el guard —un alumno solo entra en
  // los cursos de su plan— y de él sale el nombre del profesor, que
  // aparece en el cierre de los ejercicios.
  const [curso, perfil] = await Promise.all([
    cursoPorSlug(params.slug),
    alumnoId ? obtenerPerfil(alumnoId) : Promise.resolve(null),
  ]);

  if (!curso) notFound();

  // Si el equipo le abrió este curso entero, el drip no se aplica. Se
  // consigue pasando `null` como fecha de inicio, que es lo que
  // `lib/drip.ts` ya entiende como "abierto desde el principio": ni una
  // línea de las reglas de apertura cambia por esto.
  const fechaDrip = await fechaDelDrip(alumnoId, curso.id, perfil?.fechaInicio);

  // SE PIDE LA LECCIÓN ANTES DE SABER SI ES SUYA, y es deliberado. El
  // guard sigue decidiendo igual y unas líneas más abajo: lo único que
  // cambia es que, cuando no lo es, se ha leído contenido que se tira sin
  // salir del servidor. A cambio, el caso normal —que es que sí sea suya—
  // se ahorra una espera entera. Nada de esto llega al navegador antes
  // del `redirect`.

  // EL ÁRBOL DEL CURSO ENTERO va en la misma ola: el panel de la
  // izquierda ya no enseña solo el módulo de esta lección, sino todos
  // los del curso con el actual abierto. Es la misma lectura que hace el
  // temario, y solo necesita el curso y el alumno, que ya se saben.
  const [suyos, vista, arbol] = await Promise.all([
    perfil ? cursosAsignados(perfil.plan, nivelDelAlumno(alumnoId, perfil), alumnoId) : Promise.resolve([]),
    leccionParaVer(alumnoId, curso, params.leccion, fechaDrip),
    arbolDelCurso(alumnoId, curso, fechaDrip),
  ]);

  // El guard del plan vale igual en revisión: si el alumno no puede
  // abrir este curso, el espejo tampoco. Sin alumno —equipo repasando
  // contenido— no hay plan contra el que comprobar y se entra.
  if (alumnoId && !suyos.some((c) => c.id === curso.id)) {
    redirect(`/alumno/${alumnoId}`);
  }

  if (!vista) notFound();

  // La lección existe y es suya, pero su módulo todavía no se ha abierto.
  // No es un 404 —la lección está ahí y la verá— así que se le devuelve
  // al temario, que es donde pone cuándo la tendrá. Llegar aquí es raro:
  // en la pantalla del curso la fila no es un enlace. Pasa con un enlace
  // viejo, con el botón atrás o escribiendo la URL a mano.
  if (!vista.disponible) redirect(conFoco(`/curso/${curso.slug}`, paraEnlaces));

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

  // LA TERCERA OLA, y la única que depende de la segunda: los ejercicios
  // hechos y totales de las lecciones de ESTE módulo, que hasta aquí no
  // se sabía cuál era. Son dos consultas pequeñas en paralelo.
  const cuentaEjercicios = await ejerciciosPorLeccion(
    alumnoId,
    hermanas.map((h) => h.id)
  );

  // El orden importa: primero el saneado —que quita scripts, manejadores
  // e iframes que no sean de YouTube o Podbean— y después la preparación,
  // que quita emojis y pone las anclas de los títulos. Al revés, las
  // anclas podrían acabar dentro de algo que el saneador se lleva.
  // Y al final, el corte en partes por esos mismos títulos.
  const saneado = sanearHtml(leccion.contenido);
  const { html } = prepararLeccion(saneado);
  const partes = tieneContenido(html) ? partesDeLeccion(html, leccion.titulo) : [];

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

  // El módulo de esta lección dentro del árbol: es el que el panel abre.
  const moduloActual =
    arbol.modulos.find((m) => m.lecciones.some((l) => l.id === leccion.id))?.id ?? "";

  return (
    <VistaLeccion
      cursoSlug={curso.slug}
      cursoTitulo={curso.titulo}
      cursoCompletadas={cursoCompletadas}
      cursoTotal={cursoTotal}
      etiquetaModulo={etiquetaModulo(partido, textosActuales().curso)}
      moduloId={moduloActual}
      modulos={arbol.modulos}
      ejerciciosPorLeccion={cuentaEjercicios}
      leccion={{
        id: leccion.id,
        titulo: leccion.titulo,
        videoIncrustado: incrustacionYoutube(leccion.videoUrl),
      }}
      partes={partes}
      hermanas={hermanas}
      ejercicios={ejerciciosVista}
      completada={completada}
      siguienteId={siguienteId}
      anteriorId={anteriorId}
      esUltimaDelModulo={posicion === hermanas.length - 1}
      // Solo el alumno deja constancia. En revisión se responde igual
      // —hace falta para poder revisar el ejercicio— pero no se guarda
      // nada: lo impone además `app/api/intento-ejercicio`, que mira la
      // cookie y no esto.
      registrarIntentos={sesion.rol === "alumno"}
      foco={paraEnlaces}
      profesor={perfil?.profesor.trim() ?? ""}
    />
  );
}
