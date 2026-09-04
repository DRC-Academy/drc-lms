import { nivelDelAlumno } from "@/lib/estimacion";
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
import { arbolDelCurso, cursosDelInicio } from "@/lib/cursos-servidor";
import { sinDripEn } from "@/lib/accesos-manuales";
import { construirTemario } from "@/lib/temario";
import { comoFecha } from "@/lib/fechas";
import { calcularDiploma } from "@/lib/diploma";
import { hitos } from "@/lib/gamificacion";
import Cabecera from "@/components/Cabecera";
import AvatarProfesor from "@/components/AvatarProfesor";
import BannerCurso from "@/components/BannerCurso";
import BannerDiploma from "@/components/BannerDiploma";
import Sendero from "@/components/Sendero";
import PanelAlumno from "@/components/PanelAlumno";

// La ficha se arma con datos de Gestión en cada visita: no hay nada que
// prerenderizar y los datos cambian en cuanto se analiza una clase nueva.
export const dynamic = "force-dynamic";

export default async function PerfilAlumno({ params }: { params: { id: string } }) {
  // Antes de leer nada: un alumno solo abre su propia ficha, aunque
  // escriba otro id en la barra de direcciones. El equipo, cualquiera.
  const sesion = await exigirAccesoAFicha(params.id);

  // ---------------------------------------------------------------
  // AQUÍ EMPIEZA LA REVISIÓN
  //
  // Esta pantalla es la puerta: el equipo llega desde el buscador y de
  // aquí sale hacia el curso, "Para ti" y "Mi progreso". El id ya está
  // en la ruta, así que la ficha no necesita el parámetro; lo necesitan
  // los enlaces que salen de ella, que es lo que evita que la
  // navegación salte a la identidad de quien mira.
  //
  // Para el alumno esto es null y no cambia absolutamente nada: sus
  // enlaces siguen siendo los de siempre.
  // ---------------------------------------------------------------
  const revisando = sesion.rol === "admin";
  const foco = revisando ? params.id : null;

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
  //
  // LA FECHA DE INICIO VA DENTRO porque la franja ofrece "Continuar", y
  // continuar hacia un módulo que todavía no se ha abierto es mandar al
  // alumno a una pantalla que lo rechaza. El drip por curso lo resuelve
  // `cursosDelInicio`; aquí solo se le da la fecha de su ficha.
  const estadosCurso = perfil
    ? await cursosDelInicio(
        params.id,
        perfil.plan,
        nivelDelAlumno(params.id, perfil),
        comoFecha(perfil.fechaInicio)
      )
    : [];

  // Los bloques estáticos se filtran por nivel exacto. Un A2 no recibe
  // material B1: su contenido sale del banco A2 al generar.
  const bloques = perfil ? BLOQUES.filter((b) => b.nivel === nivelDeBloque(nivelDelAlumno(params.id, perfil))) : [];

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

  // ---------------------------------------------------------------
  // EL TEMARIO, SOLO PARA DIBUJAR EL CAMINO
  //
  // Es la consulta más cara de esta pantalla y entra a sabiendas: el
  // sendero necesita saber dónde acaba cada mes, y eso no se puede
  // deducir de `completadas` y `total`. Deducirlo de MODULOS_POR_MES
  // colocaría mal los nodos en cuanto un módulo no tenga ocho
  // lecciones, que es justo el tipo de error que nadie ve hasta que un
  // alumno pregunta por qué su mes 3 empieza a la mitad.
  //
  // VA LA ÚLTIMA Y FUERA DEL LOTE de arriba a propósito: depende del
  // curso, que sale de `cursosDelInicio`, que a su vez depende del
  // perfil. Encadenadas, no en paralelo.
  //
  // Sin curso asignado no se pide nada y el banner del diploma se
  // queda con su barra, que es lo que hace en el curso.
  // ---------------------------------------------------------------
  const temario =
    principal && perfil
      ? construirTemario(
          await arbolDelCurso(
            params.id,
            principal.curso,
            (await sinDripEn(params.id, principal.curso.id))
              ? null
              : comoFecha(perfil.fechaInicio)
          )
        )
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
        // El de la ficha, no el de la sesión: es lo que le da navegación
        // al equipo sin sacarlo del alumno que está revisando.
        alumnoId={params.id}
        cursoSlug={estadosCurso[0]?.curso.slug ?? null}
        seccion="inicio"
        foco={foco}
        revisando={revisando}
      />

      <main className="mx-auto w-full max-w-contenido flex-1 px-4 pb-8 pt-[18px] min-[900px]:px-9 min-[900px]:pb-11 min-[900px]:pt-8">
        {/* Control del equipo, no del alumno: va arriba del todo y fuera
            del contenido. En medio de la página partía el hilo entre el
            banner y la práctica.

            AQUÍ ES DONDE VIVE EL EMAIL, y en ningún otro sitio de la
            interfaz. El listado del panel dejó de enseñarlo: 20 correos
            por pantalla y 172 detrás del buscador convertían cualquier
            captura en una fuga. Aquí es una ficha abierta a propósito, de
            una en una, y solo para el equipo —el alumno ya sabe su
            correo, así que enseñárselo sería ruido—.

            YA NO LLEVA "← Cambiar de alumno". No porque estorbara, sino
            porque era la única salida al buscador y solo existía en esta
            pantalla: el equipo que entraba en el curso o en "Para ti" se
            quedaba sin ella. Ahora la ofrece la tira de revisión de la
            cabecera, en todas y siempre en el mismo sitio. Dejar aquí
            además un segundo enlace al mismo destino, con otro rótulo y a
            dos dedos del primero, es justo lo contrario de que la salida
            se reconozca. */}
        {sesion.rol === "admin" && (
          <div className="mb-4 flex flex-wrap items-center justify-end gap-x-4 gap-y-1.5">
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

        {/* ---------------------------------------------------------------
            LA ENTRADA EN CASCADA

            Los cuatro bloques del inicio entran escalonados: saludo,
            diploma, rejilla y la sección de bloques —los dos últimos los
            pone «PanelAlumno», con los retardos que siguen a estos—. El
            paso está en `--paso-escalonado` y es el mismo que usa la
            ruta.

            EL RETARDO VA EN LÍNEA Y NO EN UNA CLASE POR POSICIÓN. Es
            como ya lo hace `Ruta.tsx`: una sola clase `.entra` y un
            número. Con clases por posición harían falta cuatro reglas
            que no dicen nada distinto entre sí.

            NADA DE ESTO BLOQUEA. Solo se animan `opacity` y `transform`,
            así que el botón de la franja se puede pulsar desde el primer
            fotograma aunque todavía no se vea del todo. Y con
            movimiento reducido la cascada entera desaparece y la
            pantalla sale montada.
            --------------------------------------------------------------- */}
        {/* LA CARA VA CON EL SALUDO, y por eso esto es una fila y no dos
            párrafos sueltos. Lo primero de la pantalla deja de ser un
            rectángulo y pasa a ser una persona: la del profesor, que ya
            se nombraba aquí debajo en gris de 14px.

            Alineado arriba y no al centro: el subtítulo se parte en dos
            o tres líneas según el ancho, y con el avatar centrado contra
            el bloque entero flotaría a media altura en unos anchos sí y
            en otros no. */}
        <div className="entra mb-4 flex items-start gap-3.5 min-[900px]:mb-[22px] min-[900px]:gap-4">
          {profesor && <AvatarProfesor nombre={profesor} />}

          <div className="min-w-0">
            <h1 className="font-display text-[22px] font-bold leading-[1.15] text-marca-tinta min-[900px]:text-[30px]">
              {saludo}
            </h1>

            <p className="mt-[5px] text-pretty text-[14px] leading-[1.4] text-marca-gris min-[900px]:mt-1.5 min-[900px]:text-[16px]">
              {subtitulo}
            </p>
          </div>
        </div>

        {/* EL DIPLOMA, LO PRIMERO DEBAJO DEL SALUDO. A ancho completo y
            por encima de la rejilla: es la meta de la que cuelga todo lo
            que viene después, y compartiendo caja con el curso se leía
            como un dato del curso. */}
        <div
          className="entra mb-3 min-[900px]:mb-5"
          style={{ animationDelay: "var(--paso-escalonado)" }}
        >
          <BannerDiploma
            estado={diploma}
            sendero={temario ? <Sendero hitos={hitos(temario.meses)} /> : undefined}
          />
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
          banner={<BannerCurso estados={estadosCurso} foco={foco} />}
        />

      </main>
    </div>
  );
}
