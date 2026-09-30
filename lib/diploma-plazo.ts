// ---------------------------------------------------------------
// CUÁNTO LE QUEDA AL ALUMNO PARA LA FECHA DE SU DIPLOMA
//
// ⚠ COPIA de `lib/diplomaPlazo.ts` de DRC Gestión (30/09/2026), para que la
// tarjeta del diploma de «Mi progreso» cuente lo mismo que la ficha de
// Gestión. SI SE TOCA ALLÍ, SE TOCA AQUÍ.
//
// REGLA DE NEGOCIO: el curso dura seis meses desde la fecha de inicio
// (`vista_perfil_alumno.fecha_inicio`, la misma del drip). No se reinicia
// con las renovaciones: quien pasa de la fecha ve «vencido», que es una
// invitación a retomar, no un reproche.
//
// Días contados entre medianoches de Madrid (`diaLocal`), con aritmética
// UTC sobre etiquetas AAAA-MM-DD: el cambio de hora no mueve un día.
// NULL NO ES CERO: sin fecha de inicio no hay cuenta atrás.
// ---------------------------------------------------------------

export const MESES_DE_CURSO = 6;
const DIAS_PARA_HABLAR_EN_MESES = 30;

export type FasePlazo = "meses" | "dias" | "hoy" | "vencido";

export type Plazo = {
  /** Días naturales hasta el diploma. Negativo cuando ya pasó. */
  dias: number;
  /** Meses de calendario enteros hasta el diploma (0 si vencido). */
  meses: number;
  /** Los días que sobran tras esos meses (0 si vencido). */
  diasSueltos: number;
  fase: FasePlazo;
};

/** AAAA-MM-DD de un valor que puede venir como fecha corta o ISO; null si no es una fecha real. */
export function comoDia(valor: string | null | undefined): string | null {
  if (typeof valor !== "string") return null;
  const s = valor.trim();
  if (!/^\d{4}-\d{2}-\d{2}/.test(s)) return null;
  const dia = s.slice(0, 10);
  const [y, m, d] = dia.split("-").map(Number);
  const f = new Date(Date.UTC(y, m - 1, d));
  if (f.getUTCFullYear() !== y || f.getUTCMonth() !== m - 1 || f.getUTCDate() !== d) return null;
  return dia;
}

/** `dia` + `n` meses, acotado al último día del mes (31/08 + 6 = 28/02). */
export function sumarMeses(dia: string, n: number): string {
  const [y, m, d] = dia.split("-").map(Number);
  const primero = new Date(Date.UTC(y, m - 1 + n, 1));
  const ultimo = new Date(Date.UTC(primero.getUTCFullYear(), primero.getUTCMonth() + 1, 0)).getUTCDate();
  primero.setUTCDate(Math.min(d, ultimo));
  return primero.toISOString().slice(0, 10);
}

function diasEntre(desde: string, hasta: string): number {
  return Math.round((Date.parse(`${hasta}T00:00:00Z`) - Date.parse(`${desde}T00:00:00Z`)) / 86_400_000);
}

/** El plazo a día `hoy` (AAAA-MM-DD de Madrid), o null sin fecha de inicio válida. */
export function calcularPlazo(inicio: string | null | undefined, hoy: string): Plazo | null {
  const dia = comoDia(inicio);
  const hoyDia = comoDia(hoy);
  if (!dia || !hoyDia) return null;
  const fecha = sumarMeses(dia, MESES_DE_CURSO);
  const dias = diasEntre(hoyDia, fecha);

  let meses = 0;
  if (fecha > hoyDia) while (sumarMeses(hoyDia, meses + 1) <= fecha) meses++;
  const diasSueltos = fecha > hoyDia ? diasEntre(sumarMeses(hoyDia, meses), fecha) : 0;

  const fase: FasePlazo = dias < 0 ? "vencido" : dias === 0 ? "hoy" : dias <= DIAS_PARA_HABLAR_EN_MESES ? "dias" : "meses";
  return { dias, meses, diasSueltos, fase };
}
