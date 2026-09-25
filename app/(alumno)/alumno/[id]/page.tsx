import { calcularEstimacion, nivelDelAlumno } from "@/lib/estimacion";
import { nivelMcer } from "@/lib/recorrido";
import { urlAmpliarPlan } from "@/lib/ampliar-plan";
import { notFound } from "next/navigation";
import { obtenerAlumno, obtenerCalendario, obtenerExcepciones, obtenerQuitas } from "@/lib/gestion";
import { proximaDelAlumno, semanasDelAlumno, ventanaAbierta } from "@/lib/clases";
import { conFoco } from "@/lib/foco";
import { estadisticasDelAlumno } from "@/lib/estadisticas-servidor";
import { formatearFecha } from "@/lib/perfil";
import { calcularTarjeta } from "@/lib/modos";
import { idiomaActual, textosActuales } from "@/lib/idioma-servidor";
import { bloquesEnIdioma } from "@/lib/traducciones-servidor";
import { exigirAccesoAFicha } from "@/lib/sesion-servidor";
import {
  leerBloquesGenerados,
  leerProgresoAlumno,
  leerUltimaGeneracion,
} from "@/lib/progreso-servidor";
import { cursosDelInicio } from "@/lib/cursos-servidor";
import { comoFecha } from "@/lib/fechas";
import { calcularDiploma } from "@/lib/diploma";
import AvatarProfesor from "@/components/AvatarProfesor";
import BannerCurso, { cursoTerminado } from "@/components/BannerCurso";
import BannerDiploma from "@/components/BannerDiploma";
import PanelAlumno from "@/components/PanelAlumno";
import ComparativaRitmo, { datosDeRitmo } from "@/components/ComparativaRitmo";
import MascotaBienvenida from "@/components/mascota/MascotaBienvenida";
import { FranjaClase, LineaClase } from "@/components/clases/BannerClase";
import RefrescoEnCortes from "@/components/clases/RefrescoEnCortes";
import ArranqueTutorial from "@/components/tutorial/ArranqueTutorial";
import FilaEstadisticas from "@/components/estadisticas/FilaEstadisticas";
import SemanaCompacta from "@/components/clases/SemanaCompacta";
import { tutorialPendiente } from "@/lib/tutorial/estado";

// La ficha se arma con datos de Gestión en cada visita: no hay nada que
// prerenderizar y los datos cambian en cuanto se analiza una clase nueva.
export const dynamic = "force-dynamic";

export default async function PerfilAlumno({
  params,
  searchParams,
}: {
  params: { id: string };
  /** `semana`: la del calendario, 0 la actual. Como en «Mis clases». */
  searchParams: { semana?: string };
}) {
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

  // Si toca el recorrido guiado. Se pide a la vez que lo demás; ante
  // cualquier fallo dice que no (ver lib/tutorial/estado.ts).
  const pendienteTutorial = sesion.rol === "alumno" ? tutorialPendiente(params.id) : Promise.resolve(false);

  // Gestión primero: de su `plan` y su `nivel` sale qué cursos le tocan,
  // así que la consulta de cursos no puede ir en el mismo lote.
  const [datos, progreso, generadosCrudos, ultimaGeneracion, calendario, quitas, excepciones] = await Promise.all([
    obtenerAlumno(params.id),
    leerProgresoAlumno(params.id),
    // Con el rol: los bloques que el equipo genera para revisar solo
    // salen en la lista de quien los generó. Al alumno no le aparecen.
    leerBloquesGenerados(params.id, sesion.rol === "admin"),
    leerUltimaGeneracion(params.id),
    // Las clases, del calendario de Gestión. Ver «LA PRÓXIMA CLASE» abajo.
    obtenerCalendario(params.id),
    obtenerQuitas(params.id),
    // Todas las excepciones —'quita' y 'añade'—, para el calendario de
    // abajo: las mismas que lee «Mis clases».
    obtenerExcepciones(params.id),
  ]);
  const onboarding = await pendienteTutorial;

  // LOS BLOQUES, EN EL IDIOMA EN EL QUE SE ESTÁ LEYENDO.
  //
  // El título y la intro los escribe el modelo, así que no salen del
  // diccionario: salen de la traducción del bloque. Se aplica AQUÍ y no
  // en cada lista porque son tres —la tarjeta de la ruta, las paradas
  // hechas y la rejilla de generados— y hacerlo abajo significaría una
  // llamada al modelo por fila en pantalla.
  //
  // Esto no encarga ninguna: lee de una sola vez las que ya están
  // hechas. Lo que falte se queda en su idioma, igual que antes.
  const generados = await bloquesEnIdioma(generadosCrudos, idiomaActual());

  // Solo es 404 cuando el id no corresponde a nadie. Un alumno con clase
  // pero sin perfil ve su ficha con lo que haya.
  if (!datos) notFound();

  const { perfil, ultimaClase } = datos;
  const tarjeta = calcularTarjeta(perfil, ultimaClase, ultimaGeneracion, textosActuales().practica);

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
  // SE FUE EL TEMARIO, Y CON ÉL LA CONSULTA MÁS CARA DE ESTA PANTALLA
  //
  // Aquí se construía el temario entero —`arbolDelCurso` + `sinDripEn`,
  // encadenadas y fuera del lote de arriba porque dependen del curso—
  // para una sola cosa: saber dónde acaba cada mes y poder colocar los
  // nodos del sendero.
  //
  // Sin sendero no hay nada que colocar. La barra del diploma se dibuja
  // con `completadas` y `total`, que ya vienen en `estadosCurso`, así
  // que el inicio se ahorra dos viajes a la base en cada visita.
  //
  // Si algún día vuelve un mapa por meses a esta pantalla, esto vuelve
  // con él: la razón por la que no se puede deducir de MODULOS_POR_MES
  // sigue siendo válida —un módulo que no tenga ocho lecciones descoloca
  // los nodos, y eso no se ve hasta que un alumno pregunta por qué su
  // mes 3 empieza a la mitad—.
  // ---------------------------------------------------------------

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
  const tp = textosActuales().practica;
  const saludo = ultimaClase ? tp.saludoConClase(primerNombre) : tp.saludoSinClase(primerNombre);

  const quien = profesor || tp.tuProfesor;
  const subtituloDeSiempre = ultimaClase
    ? tp.trabajoContigoElDia(quien, formatearFecha(ultimaClase.fechaClase, tp.fechaCorta))
    : tp.cursoPreparado(quien);

  // ---------------------------------------------------------------
  // LA PRÓXIMA CLASE, SIN QUE EL INICIO CREZCA
  //
  // La misma función que «Mis clases» (`proximaDelAlumno`), con la hora
  // del SERVIDOR. Fuera de la ventana es la línea de debajo del saludo:
  // cuándo y con quién, o la línea neutra si no hay ninguna. Dentro de la
  // ventana —de media hora antes al final— la franja en tinta pasa a ser
  // la clase, con su botón, y el saludo vuelve a su frase de siempre para
  // no decir lo mismo dos veces. `RefrescoEnCortes` pide que se vuelva a
  // calcular al abrirse la sala y al terminar.
  // ---------------------------------------------------------------
  const tc = textosActuales().clases;
  const ahora = new Date();
  const proxima = proximaDelAlumno(calendario, quitas, ahora);
  const enVentana = proxima !== null && ventanaAbierta(proxima, ahora);
  const subtitulo = enVentana
    ? subtituloDeSiempre
    : proxima
      ? <LineaClase proxima={proxima} t={tc} ahora={ahora} />
      : tc.sinProxima;

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

  // ---------------------------------------------------------------
  // DEBAJO DE LA REJILLA: LAS ESTADÍSTICAS (SOLO MÓVIL) Y EL CALENDARIO
  //
  // Las estadísticas son las de la barra lateral de escritorio, con el
  // mismo perfil y el mismo curso principal; en escritorio ya están en
  // la barra y aquí no se pintan.
  //
  // El calendario es el de «Mis clases» en pequeño (`SemanaCompacta`):
  // las mismas semanas, calculadas igual, y cada clase lleva a su día
  // allí, que es donde está el botón de entrar.
  // ---------------------------------------------------------------
  const estadisticas = await estadisticasDelAlumno(params.id, perfil, principal);

  // «AHORA PUEDES LLEGAR MÁS RÁPIDO»: la misma estimación que el banner
  // de «Mi progreso», con los mismos datos (ver `app/(alumno)/progreso`).
  // Null si ya va al plan más alto o no hay datos: entonces no se pinta.
  const ritmo = perfil
    ? datosDeRitmo(
        calcularEstimacion({
          nivelActual: nivelMcer(nivelDelAlumno(params.id, perfil)),
          horasSemanales: perfil.horasSemanales,
          textosDelPlan: [perfil.planContratado, perfil.objetivoSetter, perfil.objetivoPerfil],
          t: textosActuales().banners,
        })
      )
    : null;
  const semanas = semanasDelAlumno(calendario, excepciones, ahora, undefined, { conPasadas: true });
  const pedida = Number.parseInt(searchParams.semana ?? "0", 10);
  const indiceSemana = Math.min(Math.max(0, Number.isFinite(pedida) ? pedida : 0), semanas.length - 1);
  const sinHorario =
    calendario.length === 0 || (!proxima && semanas.every((s) => s.dias.every((d) => d.clases.length === 0)));

  // AQUÍ NO VA EL NIVEL MCER. Estuvo de chip junto al saludo —«B2 ·
  // Intermedio alto»— y era la tercera cosa que leer antes de llegar a
  // lo que se viene a hacer. No es un dato que el alumno necesite: no
  // cambia nada de lo que puede hacer hoy y ya lo sabe. El nivel decide
  // qué material recibe, y eso sigue funcionando igual sin enseñarlo.

  return (
    <div className="flex min-h-screen flex-col bg-marca-niebla">

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
        <div data-tour="saludo" className="entra mb-4 flex items-start gap-3.5 min-[900px]:mb-[22px] min-[900px]:gap-4">
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
          {/* SIN SENDERO. Aquí iba el mapa de hitos y la barra se
              apartaba para dejarle sitio; ahora manda la barra en las
              dos pantallas.

              El mapa contaba lo mismo con seis nodos y una curva —una
              pieza alta, con su propia gramática— donde el carril lo
              dice en 8px de alto: cuánto llevas y cuánto falta. Con el
              banner sin caja, esa altura era lo único que seguía
              haciendo del diploma un bloque en vez de una línea. */}
          <BannerDiploma estado={diploma} />
        </div>

        {/* La franja entra como pieza ya renderizada: la pinta el
            servidor y la coloca «PanelAlumno», que es quien monta la
            rejilla porque la columna derecha necesita estado. */}
        <PanelAlumno
          alumnoId={params.id}
          tarjeta={tarjeta}
          generadosIniciales={generados}
          idsTerminados={idsTerminados}
          esAdministrador={sesion.rol === "admin"}
          ritmo={ritmo && <ComparativaRitmo datos={ritmo} href={urlAmpliarPlan()} />}
          entreMedias={
            <>
              <div
                className="entra mt-5 min-[900px]:hidden"
                style={{ animationDelay: "calc(var(--paso-escalonado) * 3)" }}
              >
                <FilaEstadisticas estadisticas={estadisticas} t={textosActuales()} />
              </div>
              <div
                className="entra mt-[26px] min-[900px]:mt-9"
                style={{ animationDelay: "calc(var(--paso-escalonado) * 3)" }}
              >
                <SemanaCompacta
                  semanas={semanas}
                  indice={indiceSemana}
                  sinHorario={sinHorario}
                  hrefSemana={(i) => conFoco(i === 0 ? `/alumno/${params.id}` : `/alumno/${params.id}?semana=${i}`, foco)}
                  hrefDia={(fecha) =>
                    conFoco(`/clases${indiceSemana === 0 ? "" : `?semana=${indiceSemana}`}#dia-${fecha}`, foco)
                  }
                  hrefTodas={conFoco("/clases", foco)}
                  t={tc}
                  ahora={ahora}
                />
              </div>
            </>
          }
          banner={
            proxima && enVentana ? (
              <FranjaClase
                proxima={proxima}
                t={tc}
                tieneCurso={estadosCurso.length > 0}
                ilustracion={
                  <MascotaBienvenida
                    id="inicio-clase"
                    prioridad={1}
                    variante="franja"
                    escena="inicio"
                    estado={cursoTerminado(estadosCurso) ? "nivel_superado" : "idle"}
                  />
                }
              />
            ) : (
              <BannerCurso estados={estadosCurso} foco={foco} />
            )
          }
        />

        {proxima && <RefrescoEnCortes cortes={[proxima.abreEn.getTime(), proxima.terminaEn.getTime()]} />}

        {/* EL ONBOARDING: el recorrido guiado, la primera vez. Solo el
            propio alumno; el equipo revisando la ficha no lo dispara. */}
        {onboarding && <ArranqueTutorial />}

      </main>
    </div>
  );
}
