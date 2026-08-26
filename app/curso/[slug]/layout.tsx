import { Suspense } from "react";
import { focoActual, sesionActual } from "@/lib/sesion-servidor";
import { obtenerPerfil } from "@/lib/gestion";
import { cursoPorSlug, progresoDelCurso } from "@/lib/cursos-servidor";
import Cabecera from "@/components/Cabecera";
import { CabeceraCargando } from "@/components/leccion/CabeceraLeccion";

/**
 * El marco del curso: la cabecera, y debajo lo que toque.
 *
 * POR QUÉ ES UN LAYOUT Y NO PARTE DE CADA PÁGINA
 *
 * Antes la cabecera la pintaba cada página, así que al pulsar una lección
 * desaparecía entera —logotipo incluido— y volvía a aparecer un segundo
 * después. El `loading.tsx` intentaba tapar el hueco con una barra blanca
 * vacía, que es exactamente lo que se veía como un fallo: la aplicación
 * parpadeaba de arriba abajo para cambiar una columna de texto.
 *
 * Un layout no se vuelve a montar mientras no cambie su segmento. Como
 * este cuelga de `[slug]`, al saltar de lección a lección —y al ir al
 * temario y volver— la cabecera NO se re-renderiza: se queda quieta y
 * solo cambia lo de dentro. No es que el esqueleto la imite mejor; es que
 * ya no hay nada que imitar.
 *
 * POR QUÉ NO ES `async`
 *
 * Si este componente esperara sus datos, `children` no empezaría a
 * renderizarse hasta que la cabecera los tuviera, y eso encadenaría una
 * espera más justo delante de la página —lo contrario de lo que acabamos
 * de arreglar—. Siendo síncrono, la página arranca sus consultas a la vez
 * que la cabecera las suyas, y el `Suspense` deja que cada una llegue
 * cuando pueda.
 *
 * Y las consultas no se duplican: `cursoPorSlug`, `obtenerPerfil` y las
 * dos de progreso van por `cache()`, así que layout y página se reparten
 * los mismos viajes.
 */
export default function LayoutCurso({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { slug: string };
}) {
  return (
    // La columna de altura completa vive aquí y no en cada página: es lo
    // que deja la barra de acciones de la lección pegada al fondo de la
    // ventana cuando el contenido es corto.
    <div className="flex min-h-dvh flex-col">
      <Suspense fallback={<CabeceraCargando />}>
        <CabeceraDelCurso slug={params.slug} />
      </Suspense>
      {children}
    </div>
  );
}

/**
 * La cabecera con sus datos.
 *
 * No hace de guard: quien decide si este alumno puede ver este curso es
 * la página, que es la que redirige. Aquí solo se pinta un título y un
 * contador, y si la sesión no da para eso se pinta la versión de carga y
 * ya está —la página habrá redirigido antes de que nada de esto importe—.
 */
async function CabeceraDelCurso({ slug }: { slug: string }) {
  const sesion = await sesionActual();
  if (!sesion) return <CabeceraCargando />;

  // De quién habla la pantalla. Para el alumno es él; para el equipo que
  // llegó desde una ficha, el alumno revisado; y para el equipo que abrió
  // un curso a pelo, nadie —cadena vacía— que es el caso de revisar el
  // contenido sin mirar a ninguna persona en concreto.
  //
  // El layout NO recibe `searchParams`, así que el parámetro llega por la
  // cabecera que pone el middleware. Ver `lib/foco.ts`.
  const { alumnoId, revisando, paraEnlaces } = await focoActual();

  const [curso, perfil] = await Promise.all([
    cursoPorSlug(slug),
    alumnoId ? obtenerPerfil(alumnoId) : Promise.resolve(null),
  ]);

  if (!curso) return <CabeceraCargando />;

  const { completadas, total } = await progresoDelCurso(alumnoId, curso.id);
  const nombre = perfil?.nombre.trim() ?? "";

  // LA MISMA `Cabecera` QUE EL RESTO DE LAS PANTALLAS DEL ALUMNO, con el
  // curso añadido. Antes aquí vivía una cabecera distinta y esa era la
  // causa del fallo: al entrar en el curso desaparecían Inicio, Mi curso
  // y Práctica, y no había forma de salir salvo el botón del navegador.
  //
  // `seccion="curso"` marca la pestaña activa, y `cursoSlug` es lo que
  // hace que el enlace "Mi curso" exista: aquí siempre lo hay, porque
  // estamos dentro de uno.
  return (
    <Cabecera
      nombre={nombre || undefined}
      // Vacío solo para el equipo revisando contenido sin ficha: ahí no
      // hay secciones que ofrecer porque no hay alumno del que hablar.
      alumnoId={alumnoId || null}
      cursoSlug={curso.slug}
      seccion="curso"
      contexto={{ titulo: curso.titulo, completadas, total }}
      foco={paraEnlaces}
      revisando={revisando}
    />
  );
}
