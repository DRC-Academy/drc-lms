"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Bloque } from "@/lib/data";
import { conFoco } from "@/lib/foco";
import { anotarParadaCerrada } from "@/lib/cierre-ruta";
import { desdePractica, type Fase } from "@/lib/ejercicio-unificado";
import { conTraduccion } from "@/lib/traduccion-bloque";
import { formatearFecha } from "@/lib/perfil";
import { UMBRAL_DOMINADO } from "@/lib/progreso";
import VisorEjercicios, { type EstadoVisor, type SucesoVisor } from "@/components/ejercicios/VisorEjercicios";
import CierreEjercicios from "@/components/ejercicios/CierreEjercicios";
import PantallaConPanel from "@/components/leccion/PantallaConPanel";
import PasoAPaso, { type Paso } from "@/components/leccion/PasoAPaso";
import { usarMarco } from "@/components/leccion/MarcoCurso";
import PanelBloque from "@/components/practica/PanelBloque";
import AnclaMascota from "@/components/mascota/AnclaMascota";
import { useMascota } from "@/components/mascota/useMascota";
import { usarIdioma } from "@/components/ProveedorIdioma";
import { usarTraduccion } from "@/components/ejercicios/usarTraduccion";

/**
 * LA PANTALLA DE UN BLOQUE DE PRÁCTICA GENERADA.
 *
 * ES LA MISMA PANTALLA QUE LA LECCIÓN DEL CURSO, con otro contenido:
 * el marco es `PantallaConPanel` —panel a la izquierda, esquina, fila
 * de móvil, cabecera centrada—, el ejercicio lo pinta el mismo
 * `VisorEjercicios` en la misma tarjeta, y el cierre es el mismo
 * `CierreEjercicios`. Lo que es del bloque y de nadie más está aquí:
 *
 *   - el panel con las tres fases y el aviso del profesor
 *   - el paso a paso, que en vez de las partes del texto lleva las fases
 *   - la traducción del bloque al idioma que se lee
 *   - el guardado de avance, progreso y producción
 *   - la mascota, que reacciona a lo que anuncia el visor
 *
 * Antes esto era `components/Practica.tsx`: la cabecera de siempre
 * arriba, un lateral de 300px, y el visor a pantalla entera con su
 * barra de botones pegada al fondo. Era el mismo producto con otro
 * diseño, y cada mejora de la lección lo dejaba un poco más atrás.
 *
 * Los ejercicios se traducen a la forma única en `desdePractica`, así
 * que el visor no distingue un `reconocer` generado de un `single` del
 * curso: son lo mismo.
 *
 * LA MASCOTA SIGUE LA ESCALA DE lib/gamificacion. Un ejercicio pasa
 * diez veces por bloque: al acertar hace «ánimo» —pulgar, guiño, un
 * rebote chico— y al fallar «duda»; nada de saltos ni estrellas, que
 * repetidos diez veces dejan de decir algo. El bloque pasa unas
 * veintiséis veces por curso y es un acuse: si queda dominado
 * (`UMBRAL_DOMINADO`) hace «éxito», el salto con estrellas, una vez; si
 * no, «ánimo». Nunca cara triste por un resultado: eso queda para la
 * racha, cuando exista. El estado vive aquí porque aquí llegan los
 * sucesos del visor; la pintan el panel, mientras hay ejercicio, y el
 * cierre.
 */

const ORDEN: Fase[] = ["reconocer", "transformar", "producir"];

export default function VistaBloque({
  bloque,
  alumnoId,
  profesor,
  foco = null,
}: {
  bloque: Bloque;
  alumnoId: string;
  profesor?: string;
  /**
   * Contexto de revisión. Hace falta AQUÍ y no solo en la barra: la
   * salida lleva a `/practica`, que saca el alumno del que habla del
   * parámetro y no de la ruta. Sin esto, al equipo revisando le
   * devolvería su propia práctica. Ver `lib/foco.ts`.
   */
  foco?: string | null;
}) {
  const { idioma, t: todos } = usarIdioma();
  const t = todos.ejercicios;
  const { cerrarPanel } = usarMarco();

  // QUÉ VERSIÓN DEL BLOQUE SE PINTA.
  //
  // El idioma lo elige el alumno con el botón de la esquina, pero la
  // decisión se toma AQUÍ, que es donde está el bloque entero: el visor
  // recibe ejercicios ya normalizados y no sabe —ni tiene por qué— que
  // existe una traducción. Los dos leen el mismo store, así que no hay
  // forma de que el mueble y el contenido acaben en idiomas distintos.
  //
  // `conTraduccion` devuelve el MISMO bloque mientras no haya nada que
  // aplicar, así que hasta que llega la traducción esto no recalcula
  // nada.
  const { traduccion, pidiendo, fallo } = usarTraduccion(bloque, idioma, alumnoId);
  const mostrado = useMemo(
    () => conTraduccion(bloque, traduccion, idioma),
    [bloque, traduccion, idioma]
  );
  const unificados = useMemo(() => mostrado.ejercicios.map(desdePractica), [mostrado.ejercicios]);

  // Por dónde va el visor, para el panel y el paso a paso. Lo emite el
  // visor entero en cada cambio; aquí solo se guarda.
  const [estado, setEstado] = useState<EstadoVisor>({
    indice: 0,
    respondidos: [],
    acertados: [],
    cerrado: false,
  });
  const respondido = (i: number) => estado.respondidos[i] === true;
  const acertado = (i: number) => estado.acertados[i] === true;

  const mascota = useMascota();

  // LAS FASES, como pasos. Solo las que tiene el bloque: hay bloques sin
  // producir, y una fase vacía no es un paso.
  const fases = ORDEN.filter((fase) => unificados.some((e) => e.fase === fase));
  const pasos: Paso[] = fases.map((fase) => ({ id: fase, titulo: t.fases[fase].nombre }));
  const faseActual: Fase = unificados[estado.indice]?.fase ?? fases[0] ?? "reconocer";
  const pasoActivo = Math.max(0, fases.indexOf(faseActual));

  const hrefParaTi = conFoco("/practica", foco);

  /**
   * Manda a guardar sin esperar respuesta.
   *
   * El alumno no tiene por qué esperar a una escritura para pasar al
   * ejercicio siguiente: la interfaz avanza y esto viaja por detrás.
   *
   * `keepalive` es lo que hace que la petición sobreviva a la
   * navegación. Sin él, terminar un bloque y volver a la ficha en el
   * mismo gesto cancelaría el guardado del último intento, que es justo
   * el que importa.
   *
   * El `alumnoId` NO se envía: lo pone el servidor a partir de la
   * cookie. Ver la cabecera de `app/api/progreso`.
   */
  function guardar(cuerpo: Record<string, unknown>) {
    void fetch("/api/progreso", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...cuerpo, bloqueId: bloque.id }),
      keepalive: true,
    })
      .then((respuesta) => {
        if (!respuesta.ok) {
          console.error(`[practica] El guardado respondió ${respuesta.status}`);
        }
      })
      .catch((error) => {
        // Se pierde este guardado y no se le dice al alumno: cortarle la
        // práctica por esto sería peor que perder un intento.
        console.error("[practica] No se pudo guardar:", error);
      });
  }

  function alSuceso(suceso: SucesoVisor) {
    switch (suceso.tipo) {
      // Deja constancia de por dónde iba: el bloque queda "en progreso".
      case "avance":
        guardar({ tipo: "avance", indice: suceso.indice, total: suceso.total });
        break;

      // El texto libre de la fase de producir, que es lo que llega al
      // profesor.
      case "produccion":
        guardar({ tipo: "produccion", ejercicioId: suceso.ejercicio.id, texto: suceso.texto });
        break;

      // El servidor borra el avance al recibir el intento: cerrar el
      // bloque y quitar la marca de "iba por la mitad" son lo mismo.
      case "final": {
        guardar({ tipo: "progreso", aciertos: suceso.aciertos, total: suceso.total });
        // Y se deja la nota para la ruta: cuando el alumno vuelva, la
        // parada ya estará cerrada en el servidor y sin esto no habría
        // manera de saber que acababa de pasar. Ver `lib/cierre-ruta`.
        anotarParadaCerrada(bloque.id);
        const pct = suceso.total > 0 ? (suceso.aciertos / suceso.total) * 100 : 0;
        mascota.dispara(pct >= UMBRAL_DOMINADO ? "exito" : "animo");
        break;
      }

      // Los intentos sueltos no se guardan en la práctica: aquí lo que
      // cuenta es el resultado del bloque, que va en "final". La
      // mascota sí se entera.
      case "intento":
        mascota.dispara(suceso.correcto ? "animo" : "duda");
        break;

      // Al volver a un ejercicio desde el cierre, o al repetir el
      // bloque, la mascota del panel se vuelve a montar: en reposo, no
      // repitiendo el último gesto.
      case "salto":
      case "reinicio":
        mascota.dispara("idle");
        break;
    }
  }

  const subtitulo = `${todos.ruta.area(mostrado.area)} · ${mostrado.nivel}`;

  return (
    <PantallaConPanel
      panel={
        <PanelBloque
          titulo={mostrado.titulo}
          subtitulo={subtitulo}
          ejercicios={unificados}
          indice={estado.indice}
          terminado={estado.cerrado}
          respondido={respondido}
          acertado={acertado}
          profesor={profesor}
          hrefParaTi={hrefParaTi}
          alElegir={cerrarPanel}
          conMascota
        />
      }
      panelAria={todos.navegacion.paraTi}
      cerrarElPanel={t.cerrarElPanel}
      // De qué va y para qué nivel: lo que la tarjeta de la ruta decía
      // antes de entrar.
      esquina={<span className="text-[12.5px] text-marca-gris">{subtitulo}</span>}
      // A «PARA TI», que es de donde se entra. Se nombra con el mismo
      // texto que usa la navegación, para que la salida diga el destino
      // tal y como el alumno lo va a ver al llegar.
      salida={{ href: hrefParaTi, aria: t.volverA(todos.navegacion.paraTi) }}
      rotuloMovil={t.faseDeTotal(pasoActivo + 1, fases.length)}
      // Cuánto es: la fase ya la dicen el paso a paso y la tarjeta.
      etiqueta={`${t.tuPractica} · ${t.ejerciciosYMinutos(unificados.length, mostrado.minutos)}`}
      titulo={mostrado.titulo}
      instruccion={mostrado.intro}
      // EL CONTENIDO DEL BLOQUE TARDA UNOS SEGUNDOS EN LLEGAR TRADUCIDO,
      // mientras el resto ya ha cambiado: eso se cuenta aquí, que es
      // donde pasa, en los dos anchos. Y si no salió, en pequeño y sin
      // alarma: el alumno tiene el mueble en su idioma y el ejercicio en
      // el original, que es donde estaba antes de pulsar.
      aviso={
        pidiendo ? (
          <p
            role="status"
            className="mx-auto mt-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-marca-grisSuave"
          >
            <span aria-hidden className="gira">
              ◌
            </span>
            {t.traduciendo}
          </p>
        ) : fallo ? (
          <p role="status" className="mx-auto mt-3 max-w-[520px] text-[13px] leading-[1.45] text-marca-grisSuave">
            {t.traduccionFallida}
          </p>
        ) : null
      }
      // Las fases, como el paso a paso de las partes de la lección. No se
      // pulsan: dentro de un bloque el orden es el orden.
      pasoAPaso={
        fases.length >= 2 ? (
          <PasoAPaso
            pasos={pasos}
            activo={pasoActivo}
            todoHecho={estado.cerrado}
            textos={{ pasoDe: t.faseDeTotal, terminado: t.bloqueTerminado, irA: t.irALaFase }}
          />
        ) : null
      }
    >
      <div className="mt-5 min-[900px]:mt-7">
        <VisorEjercicios
          ejercicios={unificados}
          alSuceso={alSuceso}
          alEstado={setEstado}
          // Ancla el ejercicio a la clase de la que salió, con la misma
          // frase que la parada de la ruta. Dato secundario: una línea,
          // sin adornos. En la fase de producir no se enseña, porque ahí
          // el alumno ya no está repasando nada concreto.
          notaAlPie={(ejercicio) =>
            bloque.claseOrigen && ejercicio.fase !== "producir" ? (
              <p className="mt-4 text-[12.5px] leading-[1.5] text-marca-grisSuave">
                {todos.ruta.claseDel(
                  formatearFecha(bloque.claseOrigen.fecha, todos.practica.fechaCorta),
                  bloque.claseOrigen.profesor
                )}
              </p>
            ) : null
          }
          cierre={({ aciertos, total, repetir, verEjercicio, acertado: bien, t: tx }) => {
            const pct = total > 0 ? Math.round((aciertos / total) * 100) : 0;
            return (
              <CierreEjercicios
                // El porcentaje es lo que decide si el bloque queda
                // dominado (`UMBRAL_DOMINADO`), y es lo que la ruta va a
                // enseñar después: se dice aquí también.
                etiqueta={`${tx.bloqueTerminado} · ${pct}%`}
                titulo={tx.resultadoLeccion(aciertos, total)}
                texto={tx.cierrePractica(pct)}
                ejercicios={unificados}
                acertado={bien}
                verEjercicio={verEjercicio}
                adorno={<AnclaMascota id="bloque-cierre" prioridad={3} tamaño={150} />}
                t={tx}
                acciones={
                  <>
                    <Link
                      href={hrefParaTi}
                      className="w-full rounded-full btn-verde px-8 py-[15px] text-center text-[16px] font-semibold min-[900px]:order-2 min-[900px]:w-auto"
                    >
                      {tx.volverAMisBloques}
                    </Link>
                    <button
                      type="button"
                      onClick={repetir}
                      className="w-full rounded-full btn-verde-linea px-8 py-[13.5px] text-[16px] font-semibold min-[900px]:order-1 min-[900px]:w-auto"
                    >
                      {tx.repetirElBloque}
                    </button>
                  </>
                }
              />
            );
          }}
        />
      </div>
    </PantallaConPanel>
  );
}
