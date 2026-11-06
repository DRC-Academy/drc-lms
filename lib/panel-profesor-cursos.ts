// ---------------------------------------------------------------
// LOS CURSOS, PARA QUE EL PROFESOR LOS REVISE
//
// Todos los cursos activos, abiertos enteros, tenga o no alumnos en ellos.
//
// SIN ALUMNO Y SIN FECHA, Y DE AHÍ SALE TODO. Las lecturas de
// `lib/cursos-servidor.ts` ya saben hacer esto, porque es como el equipo
// repasa el contenido: sin alumno no hay progreso que leer ni plan contra el
// que comprobar, y sin fecha `lib/drip.ts` no cierra ningún módulo. Así que
// aquí no hay reglas de apertura propias.
//
// SOLO CATÁLOGO. Nada de aquí habla de ningún alumno, y por eso no pasa por
// `exigirAlumnoDelProfesor`: basta con ser profesor. Pedir el
// `ProfesorAutorizado` es lo que hace que saltarse `exigirProfesor` no compile.
//
// Y NO ESCRIBE. Ni aquí ni en sus pantallas hay intentos ni lecciones
// completadas.
// ---------------------------------------------------------------

import "server-only";
import { arbolDelCurso, cursoPorSlug, cursosActivos, leccionParaVer, type ArbolCurso } from "@/lib/cursos-servidor";
import type { EjercicioVista } from "@/lib/ejercicios";
import { prepararLeccion } from "@/lib/leccion-html";
import { etiquetaModulo, partirModulo } from "@/lib/modulo";
import type { ProfesorAutorizado } from "@/lib/panel-profesor";
import { sanearHtml, tieneContenido } from "@/lib/sanear-html";
import { construirTemario } from "@/lib/temario";
import { TEXTOS } from "@/lib/textos";
import { incrustacionYoutube } from "@/lib/youtube";

/** Sin alumno: ni progreso, ni plan, ni excepciones. */
const SIN_ALUMNO = "";
/** Sin fecha de inicio: `lib/drip.ts` lo abre todo. */
const SIN_ESPERA = null;

/** El panel va siempre en español, aunque la cookie de idioma diga otra cosa. */
const T = TEXTOS.es.curso;

export type CursoParaRevisar = {
  slug: string;
  titulo: string;
  nivel: string;
  esExamen: boolean;
  modulos: number;
  lecciones: number;
};

/** Todos los cursos activos. Lanza si no se pueden leer: un error no puede parecer un catálogo vacío. */
export async function cursosParaRevisar(_profesor: ProfesorAutorizado): Promise<CursoParaRevisar[]> {
  const cursos = await cursosActivos();
  if (cursos === null) throw new Error("No se pudieron leer los cursos");

  const arboles = await Promise.all(cursos.map((curso) => arbolDelCurso(SIN_ALUMNO, curso, SIN_ESPERA)));
  return arboles.map(({ curso, modulos, total }) => ({
    slug: curso.slug,
    titulo: curso.titulo,
    nivel: curso.nivel,
    esExamen: curso.tipo === "examen",
    modulos: modulos.length,
    lecciones: total,
  }));
}

export type LeccionDelIndice = { id: string; titulo: string; tipo: string };
export type ModuloDelIndice = { id: string; rotulo: string; titulo: string; lecciones: LeccionDelIndice[] };
export type MesDelIndice = { numero: number; rotulo: string; titulo: string; lecciones: number; modulos: ModuloDelIndice[] };

/** Los módulos del árbol, puestos en sus meses con la misma regla que el temario del alumno. */
function mesesDelIndice(arbol: ArbolCurso): MesDelIndice[] {
  const delArbol = new Map(arbol.modulos.map((modulo) => [modulo.id, modulo]));

  return construirTemario(arbol, T).meses.map((mes) => ({
    numero: mes.numero,
    rotulo: T.mes(mes.numero),
    titulo: mes.titulo,
    lecciones: mes.totalLecciones,
    modulos: mes.semanas.flatMap((semana) =>
      semana.modulos.map((modulo) => ({
        id: modulo.id,
        rotulo: `${T.semana(semana.numero)} · ${T.moduloNumero(modulo.numero)}`,
        titulo: modulo.titulo,
        lecciones: (delArbol.get(modulo.id)?.lecciones ?? []).map((leccion) => ({
          id: leccion.id,
          titulo: leccion.titulo,
          tipo: leccion.soloEjercicios ? T.etiquetaPractica : leccion.conVideo ? T.etiquetaVideo : T.etiquetaTeoria,
        })),
      }))
    ),
  }));
}

/** El índice de un curso, con todas sus lecciones. Null si el curso no existe. */
export async function indiceParaRevisar(
  _profesor: ProfesorAutorizado,
  slug: string
): Promise<{ titulo: string; slug: string; meses: MesDelIndice[] } | null> {
  const curso = await cursoPorSlug(slug);
  if (!curso) return null;
  const arbol = await arbolDelCurso(SIN_ALUMNO, curso, SIN_ESPERA);
  return { titulo: curso.titulo, slug: curso.slug, meses: mesesDelIndice(arbol) };
}

export type LeccionParaRevisar = {
  curso: { slug: string; titulo: string };
  moduloId: string;
  etiqueta: string;
  id: string;
  titulo: string;
  videoIncrustado: string | null;
  /** El texto ya saneado. Null si no hay. */
  html: string | null;
  ejercicios: EjercicioVista[];
  anteriorId: string | null;
  siguienteId: string | null;
};

/** Una lección con sus ejercicios. Null si no existe o no es de este curso. */
export async function leccionParaRevisar(
  _profesor: ProfesorAutorizado,
  slug: string,
  leccionId: string
): Promise<LeccionParaRevisar | null> {
  const curso = await cursoPorSlug(slug);
  if (!curso) return null;

  const [vista, arbol] = await Promise.all([
    leccionParaVer(SIN_ALUMNO, curso, leccionId, SIN_ESPERA),
    arbolDelCurso(SIN_ALUMNO, curso, SIN_ESPERA),
  ]);
  if (!vista) return null;

  // Mismo orden que la lección del alumno: primero el saneado, que quita
  // scripts e iframes ajenos, y después la preparación.
  const { html } = prepararLeccion(sanearHtml(vista.leccion.contenido));
  const posicion = vista.hermanas.findIndex((h) => h.id === leccionId);
  const modulo = etiquetaModulo(partirModulo(vista.moduloTitulo, vista.moduloOrden), T);

  return {
    curso: { slug: curso.slug, titulo: curso.titulo },
    moduloId: arbol.modulos.find((m) => m.lecciones.some((l) => l.id === leccionId))?.id ?? "",
    etiqueta: `${modulo} · ${T.leccionDeTotal(posicion + 1, vista.hermanas.length)}`,
    id: vista.leccion.id,
    titulo: vista.leccion.titulo,
    videoIncrustado: incrustacionYoutube(vista.leccion.videoUrl),
    html: tieneContenido(html) ? html : null,
    ejercicios: vista.ejercicios.map((e) => ({
      id: e.id,
      tipo: e.tipo,
      enunciado: e.enunciado,
      opciones: Array.isArray(e.opciones) ? e.opciones : [],
      correcta: e.correcta,
      orden: e.orden,
    })),
    anteriorId: vista.anteriorId,
    siguienteId: vista.siguienteId,
  };
}
