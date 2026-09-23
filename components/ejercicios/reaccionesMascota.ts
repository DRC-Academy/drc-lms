import { storeMascota } from "@/components/mascota/store";
import type { SucesoVisor } from "@/components/ejercicios/VisorEjercicios";

/**
 * LO QUE HACE LA MASCOTA CON CADA RESPUESTA, en cada pantalla.
 *
 * Lo que DICE es igual en las dos y lo pone el visor en su cuadro; lo
 * que HACE no, porque la escala de lib/gamificacion no es la misma para
 * un bloque de práctica que para una lección. Están juntas para que se
 * lean de una vez (y para que el banco de /dev/mascota use las mismas).
 */

type Intento = Pick<Extract<SucesoVisor, { tipo: "intento" }>, "resultado" | "seguidos" | "trasFallo">;

/**
 * La práctica generada. Un fallo, duda. Un casi, un asombro leve y
 * ánimo. Un acierto tras un fallo, asombro y ánimo; a los 3 seguidos,
 * ánimo con un rebote más alto; a los 5 (y cada 5), un salto en el
 * sitio, sin estrellas: el éxito es del cierre del bloque.
 */
export function reaccionarEnPractica({ resultado, seguidos, trasFallo }: Intento) {
  if (resultado === "incorrecto") {
    storeMascota.dispara("duda");
    return;
  }
  if (resultado === "casi" || trasFallo) {
    const asombro = resultado === "casi" ? 350 : 450;
    storeMascota.gesto("asombro", { duracion: asombro });
    setTimeout(() => storeMascota.dispara("animo"), asombro);
    return;
  }
  storeMascota.dispara("animo");
  if (seguidos % 5 === 0) storeMascota.moverse("salto_sitio");
  else if (seguidos === 3) storeMascota.moverse("rebote");
}

/** La lección del curso: ánimo o duda, sin saltos ni escalada. */
export function reaccionarEnCurso({ resultado }: Intento) {
  storeMascota.dispara(resultado === "incorrecto" ? "duda" : "animo");
}
