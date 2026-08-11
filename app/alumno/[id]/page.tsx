import Link from "next/link";
import { notFound } from "next/navigation";
import { BLOQUES } from "@/lib/data";
import { obtenerAlumno } from "@/lib/gestion";
import { nivelDeBloque } from "@/lib/perfil";
import { calcularTarjetas } from "@/lib/modos";
import { exigirAccesoAFicha } from "@/lib/sesion-servidor";
import { UMBRAL_DOMINADO, type RegistroProgreso } from "@/lib/progreso";
import {
  leerAvanceAlumno,
  leerBloquesGenerados,
  leerProgresoAlumno,
} from "@/lib/progreso-servidor";
import { cursosDelInicio } from "@/lib/cursos-servidor";
import Cabecera from "@/components/Cabecera";
import BannerCurso from "@/components/BannerCurso";
import TiraEstadisticas from "@/components/TiraEstadisticas";
import PanelAlumno from "@/components/PanelAlumno";

// La ficha se arma con datos de Gestión en cada visita: no hay nada que
// prerenderizar y los datos cambian en cuanto se analiza una clase nueva.
export const dynamic = "force-dynamic";

/**
 * Los números de práctica de la tira de estadísticas.
 *
 * Se calculan sobre el MEJOR intento de cada bloque, que es lo que
 * devuelve `leerProgresoAlumno`, y sobre todos los bloques que el alumno
 * haya hecho alguna vez, no solo los que hoy se le enseñan. Es una cifra
 * de trayectoria, no del catálogo de esta semana.
 *
 * Devuelve null cuando no ha practicado nunca: la tira lo usa para
 * esconderse en vez de enseñar ceros.
 */
function numerosDePractica(progreso: Record<string, RegistroProgreso>): {
  dominados: number | null;
  aciertos: number | null;
} {
  const registros = Object.values(progreso).filter((r) => r.total > 0);
  if (registros.length === 0) return { dominados: null, aciertos: null };

  let dominados = 0;
  let suma = 0;

  for (const registro of registros) {
    const porcentaje = Math.round((registro.aciertos / registro.total) * 100);
    if (porcentaje >= UMBRAL_DOMINADO) dominados++;
    suma += porcentaje;
  }

  return { dominados, aciertos: Math.round(suma / registros.length) };
}

export default async function PerfilAlumno({ params }: { params: { id: string } }) {
  // Antes de leer nada: un alumno solo abre su propia ficha, aunque
  // escriba otro id en la barra de direcciones. El equipo, cualquiera.
  const sesion = await exigirAccesoAFicha(params.id);

  // Gestión primero: de su `plan` y su `nivel` sale qué cursos le tocan,
  // así que la consulta de cursos no puede ir en el mismo lote.
  const [datos, progreso, avance, generados] = await Promise.all([
    obtenerAlumno(params.id),
    leerProgresoAlumno(params.id),
    leerAvanceAlumno(params.id),
    leerBloquesGenerados(params.id),
  ]);

  // Solo es 404 cuando el id no corresponde a nadie. Un alumno con clase
  // pero sin perfil ve su ficha con lo que haya.
  if (!datos) notFound();

  const { perfil, ultimaClase } = datos;
  const tarjetas = calcularTarjetas(perfil, ultimaClase);

  // Sin perfil no hay plan ni nivel, así que tampoco curso: el banner
  // enseña el estado sobrio y la práctica sigue funcionando.
  const estadosCurso = perfil
    ? await cursosDelInicio(params.id, perfil.plan, perfil.nivel)
    : [];

  // Los bloques estáticos se filtran por nivel exacto. Un A2 no recibe
  // material B1: su contenido sale del banco A2 al generar.
  const bloques = perfil ? BLOQUES.filter((b) => b.nivel === nivelDeBloque(perfil.nivel)) : [];

  const { dominados, aciertos } = numerosDePractica(progreso);

  // El porcentaje del curso es el del que manda en el banner. Con dos
  // cursos se enseña el de ese, no una media de los dos: una media de
  // dos cursos distintos no significa nada.
  //
  // `completadas > 0` y no solo `total > 0`: un alumno que aún no ha
  // hecho ninguna lección tiene un 0% que no es un dato, es la ausencia
  // de él. Sin esto, quien entra por primera vez recibe una tira de
  // "0% · — · — · B1", que es exactamente el boletín en blanco que la
  // tira existe para evitar.
  const principal = estadosCurso[0];
  const porcentajeCurso =
    principal && principal.total > 0 && principal.completadas > 0
      ? Math.round((principal.completadas / principal.total) * 100)
      : null;

  const nombre = perfil?.nombre.trim() ?? "";

  return (
    <>
      <Cabecera
        nombre={nombre || undefined}
        alumnoId={sesion.alumnoId}
        cursoSlug={estadosCurso[0]?.curso.slug ?? null}
        seccion="inicio"
      />

      <main className="mx-auto flex max-w-columna flex-col gap-10 px-6 pb-[140px] pt-7">
        {/* Control del equipo, no del alumno: va arriba del todo y fuera
            del contenido. En medio de la página partía el hilo entre el
            banner y la práctica. */}
        {sesion.rol === "admin" && (
          <Link
            href="/"
            className="-mb-6 self-start text-[14px] text-drc-cuerpo transition-colors hover:text-drc-verde-texto"
          >
            ← Cambiar de alumno
          </Link>
        )}

        <BannerCurso estados={estadosCurso} />

        <TiraEstadisticas
          porcentajeCurso={porcentajeCurso}
          dominados={dominados}
          aciertos={aciertos}
          nivel={perfil?.nivel ?? ""}
        />

        <PanelAlumno
          alumnoId={params.id}
          perfil={perfil}
          ultimaClase={ultimaClase}
          tarjetas={tarjetas}
          bloques={bloques}
          progresoInicial={progreso}
          avanceInicial={avance}
          generadosIniciales={generados}
          esAdministrador={sesion.rol === "admin"}
        />
      </main>
    </>
  );
}
