import Link from "next/link";
import { notFound } from "next/navigation";
import { BLOQUES } from "@/lib/data";
import { obtenerAlumno } from "@/lib/gestion";
import { formatearFecha, nivelDeBloque } from "@/lib/perfil";
import { calcularTarjetas, tieneContexto } from "@/lib/modos";
import { exigirAccesoAFicha } from "@/lib/sesion-servidor";
import { UMBRAL_DOMINADO, type RegistroProgreso } from "@/lib/progreso";
import {
  leerBloquesGenerados,
  leerProgresoAlumno,
  leerUltimaGeneracionPorModo,
} from "@/lib/progreso-servidor";
import { cursosDelInicio } from "@/lib/cursos-servidor";
import Cabecera from "@/components/Cabecera";
import BannerCurso from "@/components/BannerCurso";
import TiraEstadisticas from "@/components/TiraEstadisticas";
import TarjetaPerfil from "@/components/TarjetaPerfil";
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
 * `practicados` es el denominador de los dominados: la tarjeta dice
 * "18 de 42 · de los que has practicado", así que la escala tiene que
 * medirse sobre lo practicado y no sobre el catálogo entero, que es una
 * cifra que el alumno no reconoce.
 *
 * Devuelve null cuando no ha practicado nunca: la tira lo usa para
 * esconderse en vez de enseñar ceros.
 */
function numerosDePractica(progreso: Record<string, RegistroProgreso>): {
  dominados: number | null;
  aciertos: number | null;
  practicados: number;
} {
  const registros = Object.values(progreso).filter((r) => r.total > 0);
  if (registros.length === 0) return { dominados: null, aciertos: null, practicados: 0 };

  let dominados = 0;
  let suma = 0;

  for (const registro of registros) {
    const porcentaje = Math.round((registro.aciertos / registro.total) * 100);
    if (porcentaje >= UMBRAL_DOMINADO) dominados++;
    suma += porcentaje;
  }

  return {
    dominados,
    aciertos: Math.round(suma / registros.length),
    practicados: registros.length,
  };
}

export default async function PerfilAlumno({ params }: { params: { id: string } }) {
  // Antes de leer nada: un alumno solo abre su propia ficha, aunque
  // escriba otro id en la barra de direcciones. El equipo, cualquiera.
  const sesion = await exigirAccesoAFicha(params.id);

  // Gestión primero: de su `plan` y su `nivel` sale qué cursos le tocan,
  // así que la consulta de cursos no puede ir en el mismo lote.
  const [datos, progreso, generados, ultimasGeneraciones] = await Promise.all([
    obtenerAlumno(params.id),
    leerProgresoAlumno(params.id),
    leerBloquesGenerados(params.id),
    leerUltimaGeneracionPorModo(params.id),
  ]);

  // Solo es 404 cuando el id no corresponde a nadie. Un alumno con clase
  // pero sin perfil ve su ficha con lo que haya.
  if (!datos) notFound();

  const { perfil, ultimaClase } = datos;
  const tarjetas = calcularTarjetas(perfil, ultimaClase, ultimasGeneraciones);

  // Sin perfil no hay plan ni nivel, así que tampoco curso: el banner
  // enseña el estado sobrio y la práctica sigue funcionando.
  const estadosCurso = perfil ? await cursosDelInicio(params.id, perfil.plan, perfil.nivel) : [];

  // Los bloques estáticos se filtran por nivel exacto. Un A2 no recibe
  // material B1: su contenido sale del banco A2 al generar.
  const bloques = perfil ? BLOQUES.filter((b) => b.nivel === nivelDeBloque(perfil.nivel)) : [];

  const { dominados, aciertos, practicados } = numerosDePractica(progreso);

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
  const profesor = perfil?.profesor.trim() ?? "";

  // ---------------------------------------------------------------
  // EL SALUDO
  //
  // Nombra al profesor lo antes posible: es lo que hace que esto no se
  // sienta como una aplicación genérica, y para el alumno la persona con
  // la que da clase es la mitad del producto.
  //
  // Quien no tiene clase analizada todavía recibe la bienvenida y no el
  // "trabajó contigo el…", que sonaría a recordarle algo que no pasó.
  // ---------------------------------------------------------------
  const primerNombre = nombre.split(" ")[0] ?? "";
  const saludo = ultimaClase ? `Hola, ${primerNombre}` : `Bienvenido, ${primerNombre}`;

  const subtitulo = ultimaClase
    ? `${profesor || "Tu profesor"} trabajó contigo el ${formatearFecha(
        ultimaClase.fechaClase
      )}. Aquí tienes por dónde seguir.`
    : `${profesor || "Tu profesor"} ya te ha dejado el curso preparado. Empieza cuando quieras.`;

  // La invitación al perfil desaparece en cuanto hay con qué ambientar
  // los ejercicios, y entonces el banner pasa a ancho completo.
  const invitacionPerfil = !tieneContexto(perfil);

  return (
    <div className="flex min-h-screen flex-col bg-marca-niebla">
      <Cabecera
        nombre={nombre || undefined}
        alumnoId={sesion.alumnoId}
        cursoSlug={estadosCurso[0]?.curso.slug ?? null}
        seccion="inicio"
      />

      <main className="mx-auto w-full max-w-contenido flex-1 px-4 pb-8 pt-[18px] lg:px-9 lg:pb-11 lg:pt-8">
        {/* Control del equipo, no del alumno: va arriba del todo y fuera
            del contenido. En medio de la página partía el hilo entre el
            banner y la práctica. */}
        {sesion.rol === "admin" && (
          <Link
            href="/"
            className="mb-4 inline-block text-[14px] text-marca-gris transition-colors hover:text-marca-tinta"
          >
            ← Cambiar de alumno
          </Link>
        )}

        <div className="mb-4 lg:mb-[22px]">
          <h1 className="font-display text-[22px] font-bold leading-[1.15] text-marca-tinta lg:text-[30px]">
            {saludo}
          </h1>
          <p className="mt-[5px] text-pretty text-[14px] leading-[1.4] text-marca-gris lg:mt-1.5 lg:text-[16px]">
            {subtitulo}
          </p>
        </div>

        {/* La rejilla principal: el banner manda y la invitación al perfil
            le hace sitio a la derecha. Sin invitación, ancho completo. */}
        <div
          className={`grid items-start gap-3 lg:gap-5 ${
            invitacionPerfil ? "lg:grid-cols-[minmax(0,1fr)_340px]" : "lg:grid-cols-1"
          }`}
        >
          <BannerCurso estados={estadosCurso} conLateral={invitacionPerfil} />

          {/* En móvil esta tarjeta va al final de la página, no aquí:
              entre el banner y la práctica sería un desvío justo cuando
              el alumno acaba de ver a dónde tiene que ir. */}
          {invitacionPerfil && (
            <div className="hidden lg:block">
              <TarjetaPerfil />
            </div>
          )}
        </div>

        <TiraEstadisticas
          porcentajeCurso={porcentajeCurso}
          completadas={principal?.completadas ?? 0}
          total={principal?.total ?? 0}
          dominados={dominados}
          practicados={practicados}
          aciertos={aciertos}
          nivel={perfil?.nivel ?? ""}
        />

        <PanelAlumno
          alumnoId={params.id}
          profesor={profesor}
          tarjetas={tarjetas}
          bloques={bloques}
          generadosIniciales={generados}
          esAdministrador={sesion.rol === "admin"}
        />

        {/* En móvil la invitación cierra la página. El enlace suelto a
            /practica que había aquí se ha ido: la sección ya está en la
            navegación —arriba en escritorio, abajo en móvil— y repetirla
            al final solo añadía una salida más justo donde el alumno
            acaba de elegir su práctica. */}
        {invitacionPerfil && (
          <div className="mt-3 lg:hidden">
            <TarjetaPerfil />
          </div>
        )}
      </main>
    </div>
  );
}
