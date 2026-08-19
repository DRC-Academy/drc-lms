import Link from "next/link";
import { notFound } from "next/navigation";
import { BLOQUES } from "@/lib/data";
import { obtenerAlumno } from "@/lib/gestion";
import { formatearFecha, nivelDeBloque } from "@/lib/perfil";
import { calcularTarjeta } from "@/lib/modos";
import { exigirAccesoAFicha } from "@/lib/sesion-servidor";
import {
  leerBloquesGenerados,
  leerProgresoAlumno,
  leerUltimaGeneracion,
} from "@/lib/progreso-servidor";
import { cursosDelInicio } from "@/lib/cursos-servidor";
import { calcularDiploma } from "@/lib/diploma";
import { PALABRA_NIVEL } from "@/components/Casillas";
import Cabecera from "@/components/Cabecera";
import BannerCurso from "@/components/BannerCurso";
import AnilloDiploma from "@/components/AnilloDiploma";
import PanelAlumno from "@/components/PanelAlumno";

// La ficha se arma con datos de Gestión en cada visita: no hay nada que
// prerenderizar y los datos cambian en cuanto se analiza una clase nueva.
export const dynamic = "force-dynamic";

export default async function PerfilAlumno({ params }: { params: { id: string } }) {
  // Antes de leer nada: un alumno solo abre su propia ficha, aunque
  // escriba otro id en la barra de direcciones. El equipo, cualquiera.
  const sesion = await exigirAccesoAFicha(params.id);

  // Gestión primero: de su `plan` y su `nivel` sale qué cursos le tocan,
  // así que la consulta de cursos no puede ir en el mismo lote.
  const [datos, progreso, generados, ultimaGeneracion] = await Promise.all([
    obtenerAlumno(params.id),
    leerProgresoAlumno(params.id),
    // Con el rol: los bloques que el equipo genera para revisar solo
    // salen en la lista de quien los generó. Al alumno no le aparecen.
    leerBloquesGenerados(params.id, sesion.rol === "admin"),
    leerUltimaGeneracion(params.id),
  ]);

  // Solo es 404 cuando el id no corresponde a nadie. Un alumno con clase
  // pero sin perfil ve su ficha con lo que haya.
  if (!datos) notFound();

  const { perfil, ultimaClase } = datos;
  const tarjeta = calcularTarjeta(perfil, ultimaClase, ultimaGeneracion);

  // Sin perfil no hay plan ni nivel, así que tampoco curso: el banner
  // enseña el estado sobrio y la práctica sigue funcionando.
  const estadosCurso = perfil ? await cursosDelInicio(params.id, perfil.plan, perfil.nivel) : [];

  // Los bloques estáticos se filtran por nivel exacto. Un A2 no recibe
  // material B1: su contenido sale del banco A2 al generar.
  const bloques = perfil ? BLOQUES.filter((b) => b.nivel === nivelDeBloque(perfil.nivel)) : [];

  // ---------------------------------------------------------------
  // EL DIPLOMA
  //
  // Del curso que manda en el banner, que es el mismo del que habla todo
  // lo demás de la pantalla. Con dos cursos asignados no se suman ni se
  // promedian: dos diplomas distintos no hacen medio diploma, y enseñar
  // los dos rompería el principio de tener dos o tres elementos.
  //
  // Aquí SÍ se enseña con cero lecciones hechas, al revés que la tira de
  // estadísticas que esto sustituye. Aquel cero no era un dato; este sí:
  // "tu diploma son 187 lecciones" le dice a quien acaba de entrar
  // exactamente a qué ha venido.
  // ---------------------------------------------------------------
  const principal = estadosCurso[0];
  const diploma = calcularDiploma(principal?.completadas ?? 0, principal?.total ?? 0);

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

  // ---------------------------------------------------------------
  // LA COLUMNA DE LA DERECHA
  //
  // Era la invitación a completar el perfil y ahora es el diploma. La
  // invitación no se ha perdido: vive en «Para ti», donde además está
  // pegada a lo que promete —los ejercicios ambientados en su trabajo—
  // en vez de suelta al lado de un curso con el que no tiene que ver.
  //
  // El hueco se lo queda el diploma porque compite mejor por él: la
  // invitación le habla a quien todavía no nos ha contado nada, y el
  // diploma a todo el que tenga un curso, que son 165 de 168.
  //
  // Sin curso no hay anillo y el banner pasa a ancho completo, igual que
  // antes hacía sin invitación.
  // ---------------------------------------------------------------
  const conAnillo = diploma.estado !== "sin-curso";

  // El nivel MCER, que estuvo dentro del banner del diploma mientras el
  // banner era ancho. En el anillo no cabe sin robarle sitio a la cifra,
  // así que sube al saludo, que es donde se lee lo que el alumno ES
  // —quién eres, a qué altura vas— y no lo que le queda por hacer.
  const nivelLimpio = (perfil?.nivel ?? "").trim().toUpperCase();
  const palabraNivel = PALABRA_NIVEL[nivelLimpio] ?? "";

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
            banner y la práctica.

            AQUÍ ES DONDE VIVE EL EMAIL, y en ningún otro sitio de la
            interfaz. El listado del panel dejó de enseñarlo: 20 correos
            por pantalla y 172 detrás del buscador convertían cualquier
            captura en una fuga. Aquí es una ficha abierta a propósito, de
            una en una, y solo para el equipo —el alumno ya sabe su
            correo, así que enseñárselo sería ruido—. */}
        {sesion.rol === "admin" && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5">
            <Link
              href="/"
              className="text-[14px] text-marca-gris transition-colors hover:text-marca-tinta"
            >
              ← Cambiar de alumno
            </Link>

            {perfil?.email && (
              <a
                href={`mailto:${perfil.email}`}
                className="max-w-full truncate text-[13px] text-marca-grisSuave underline-offset-4 transition-colors hover:text-marca-tinta hover:underline"
              >
                {perfil.email}
              </a>
            )}
          </div>
        )}

        <div className="mb-4 lg:mb-[22px]">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <h1 className="font-display text-[22px] font-bold leading-[1.15] text-marca-tinta lg:text-[30px]">
              {saludo}
            </h1>

            {/* El nivel, junto al nombre. Es contexto de identidad y no
                una métrica: por eso va aquí y no en una casilla. */}
            {nivelLimpio !== "" && (
              <span className="inline-flex items-baseline gap-1.5 rounded-full bg-marca-verdeFondo px-2.5 py-1">
                <span className="text-[12.5px] font-bold leading-none text-marca-verdeOsc">
                  {nivelLimpio}
                </span>
                {palabraNivel !== "" && (
                  <span className="text-[11.5px] leading-none text-marca-verdeOsc/80">
                    {palabraNivel}
                  </span>
                )}
              </span>
            )}
          </div>

          <p className="mt-[5px] text-pretty text-[14px] leading-[1.4] text-marca-gris lg:mt-1.5 lg:text-[16px]">
            {subtitulo}
          </p>
        </div>

        {/* La rejilla principal: el banner manda y el diploma le hace
            sitio a la derecha. En móvil no hay dos columnas, así que el
            anillo cae solo debajo del banner, que es donde tiene que
            estar: primero adónde vas, después cuánto te queda. */}
        <div
          className={`grid items-start gap-3 lg:gap-5 ${
            conAnillo ? "lg:grid-cols-[minmax(0,1fr)_340px]" : "lg:grid-cols-1"
          }`}
        >
          <BannerCurso estados={estadosCurso} conLateral={conAnillo} />

          {conAnillo && (
            <AnilloDiploma estado={diploma} tituloCurso={principal?.curso.titulo ?? ""} />
          )}
        </div>

        <PanelAlumno
          alumnoId={params.id}
          profesor={profesor}
          tarjeta={tarjeta}
          bloques={bloques}
          generadosIniciales={generados}
          esAdministrador={sesion.rol === "admin"}
        />

      </main>
    </div>
  );
}
