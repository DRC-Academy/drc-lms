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
import Cabecera from "@/components/Cabecera";
import BannerCurso from "@/components/BannerCurso";
import BannerDiploma from "@/components/BannerDiploma";
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
  //
  // VA FUERA DE «PanelAlumno», y por eso se pinta aquí y no se le pasa
  // como prop: ocupa el ancho entero por encima de la rejilla, así que
  // no es una de las dos columnas. Es también lo que le deja seguir
  // siendo un componente de servidor puro, sin pasar por el cliente.
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
  // Fue de la invitación al perfil, luego del anillo del diploma, y ahora
  // es de LA PRÁCTICA. Cada mudanza tuvo el mismo motivo: quien la ocupa
  // es lo que más gana por estar a la altura de los ojos, y la práctica
  // es lo que hace distinto al producto.
  //
  // La invitación no se ha perdido: vive en «Para ti», pegada a lo que
  // promete. El diploma tampoco: encogió a una fila y se puso debajo de
  // la franja, que es donde el dato tiene sentido —lo que avanza el curso
  // es lo que acerca el diploma—.
  //
  // Quién ocupa la columna lo decide «PanelAlumno», que es el que sabe si
  // hay tarjeta que ofrecer.
  // ---------------------------------------------------------------

  // Los bloques que ya cerró con un intento completo. El inicio enseña el
  // más reciente que le quede PENDIENTE y lo retira en cuanto lo hace,
  // que es lo que evita que se reencuentre trabajo ya terminado.
  const idsTerminados = Object.keys(progreso);

  // AQUÍ NO VA EL NIVEL MCER. Estuvo de chip junto al saludo —«B2 ·
  // Intermedio alto»— y era la tercera cosa que leer antes de llegar a
  // lo que se viene a hacer. No es un dato que el alumno necesite: no
  // cambia nada de lo que puede hacer hoy y ya lo sabe. El nivel decide
  // qué material recibe, y eso sigue funcionando igual sin enseñarlo.

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
          <h1 className="font-display text-[22px] font-bold leading-[1.15] text-marca-tinta lg:text-[30px]">
            {saludo}
          </h1>

          <p className="mt-[5px] text-pretty text-[14px] leading-[1.4] text-marca-gris lg:mt-1.5 lg:text-[16px]">
            {subtitulo}
          </p>
        </div>

        {/* EL DIPLOMA, LO PRIMERO DEBAJO DEL SALUDO. A ancho completo y
            por encima de la rejilla: es la meta de la que cuelga todo lo
            que viene después, y compartiendo caja con el curso se leía
            como un dato del curso. */}
        <div className="mb-3 lg:mb-5">
          <BannerDiploma estado={diploma} />
        </div>

        {/* La franja entra como pieza ya renderizada: la pinta el
            servidor y la coloca «PanelAlumno», que es quien monta la
            rejilla porque la columna derecha necesita estado. */}
        <PanelAlumno
          alumnoId={params.id}
          tarjeta={tarjeta}
          bloques={bloques}
          generadosIniciales={generados}
          idsTerminados={idsTerminados}
          esAdministrador={sesion.rol === "admin"}
          banner={<BannerCurso estados={estadosCurso} />}
        />

      </main>
    </div>
  );
}
