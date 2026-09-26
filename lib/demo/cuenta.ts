// ---------------------------------------------------------------
// ¿ES UNA CUENTA DE DEMOSTRACIÓN?
//
// Lo pregunta `lib/gestion.ts` antes de cada lectura, y es lo único que
// sabe del modo demo: si la respuesta es un escenario, contesta con él en
// vez de consultar Gestión. Ninguna página ni componente llama aquí.
//
// CERO CONSULTAS PARA LOS ALUMNOS DE VERDAD. Un id sin el prefijo
// `demo-` se descarta sin tocar la base: los de Gestión son `s_…` o
// uuid. Solo la búsqueda por email, que no trae id, tiene que mirar la
// tabla, y la tabla entera —una fila— se guarda un minuto por instancia.
//
// EL PRECIO DEL MINUTO: tras `demo:rejuvenecer` una instancia que ya la
// había leído sigue con el ancla vieja hasta un minuto. Por eso el
// script avisa de esperar antes de grabar.
//
// SE FALLA A "NO ES DEMO". Si `cuentas_demo` no existe todavía o la
// base no contesta, todo el mundo es un alumno real y el LMS funciona
// como antes de que esto existiera.
// ---------------------------------------------------------------

import "server-only";
import { baseLms } from "@/lib/supabase-lms";
import { PREFIJO_DEMO, escenarioDemo, type Escenario } from "@/lib/demo/escenario";

type Cuenta = { alumnoId: string; email: string; ancla: string };

const MS_MEMO = 60 * 1000;
let memo: { cuentas: Cuenta[]; leidoEn: number } | null = null;

async function cuentas(): Promise<Cuenta[]> {
  if (memo && Date.now() - memo.leidoEn < MS_MEMO) return memo.cuentas;

  const { data, error } = await baseLms()
    .from("cuentas_demo")
    .select("alumno_id, email_normalizado, ancla")
    .returns<{ alumno_id: string; email_normalizado: string; ancla: string }[]>();

  if (error) {
    // Sin la tabla (antes de `supabase/lms-cuentas-demo.sql`) no hay
    // demos, y eso no merece una línea de log por petición.
    if (!error.message.includes("cuentas_demo")) {
      console.error("[demo] No se pudieron leer las cuentas de demostración:", error.message);
    }
    return [];
  }

  const leidas = (data ?? []).map((f) => ({ alumnoId: f.alumno_id, email: f.email_normalizado, ancla: f.ancla }));
  memo = { cuentas: leidas, leidoEn: Date.now() };
  return leidas;
}

// ---------------------------------------------------------------
// EL RELOJ
//
// Las clases de la demo que todavía no han ocurrido no existen. «Todavía»
// es ahora, salvo para `scripts/demo.ts`, que al generar cada bloque
// fija el reloj en el día de su clase para que el generador vea el
// material que había entonces. En la aplicación nadie lo fija.
// ---------------------------------------------------------------

let relojFijo: Date | null = null;

export function fijarRelojDemo(momento: Date | null): void {
  relojFijo = momento;
}

/** Olvida lo leído. Lo usa el script después de escribir en la tabla. */
export function olvidarCuentasDemo(): void {
  memo = null;
}

function escenario(cuenta: Cuenta): Escenario {
  return escenarioDemo(cuenta.ancla, relojFijo ?? new Date());
}

/** El escenario de ese alumno si es una cuenta de demostración, o null. */
export async function escenarioDe(alumnoId: string): Promise<Escenario | null> {
  if (!alumnoId.startsWith(PREFIJO_DEMO)) return null;
  const cuenta = (await cuentas()).find((c) => c.alumnoId === alumnoId);
  return cuenta ? escenario(cuenta) : null;
}

/** Lo mismo, desde el email con el que se entra. */
export async function escenarioPorEmail(email: string): Promise<Escenario | null> {
  const limpio = email.trim().toLowerCase();
  if (limpio === "") return null;
  const cuenta = (await cuentas()).find((c) => c.email === limpio);
  return cuenta ? escenario(cuenta) : null;
}

/** Para las cuentas del panel: nunca cuentan como alumnos. */
export function esIdDemo(alumnoId: string): boolean {
  return alumnoId.startsWith(PREFIJO_DEMO);
}
