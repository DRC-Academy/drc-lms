// ---------------------------------------------------------------
// LAS CLASES DEL ALUMNO, CALCULADAS COMO LAS CALCULA GESTIÓN
//
// COPIADO DE academy-scheduler (github.com/DRC-Academy/academy-scheduler),
// commit 37022332fa5f2ce98da3d8126688b8257a768e37 (22-09-2026):
//
//   lib/teacherClasses.ts   classesForDate, recoveriesForDate,
//                           gridOccupancyOfTeacher, gridRunLength,
//                           groupContiguousClasses (+ toSession,
//                           sameSessionClass, movidaEseDia),
//                           addDaysIso, dayNameFromIso
//   lib/cells.ts            isPuntualState, baseStateOf, baseStudentOf
//   lib/sessions.ts         hourNum, hourText, nkName, isNextHour,
//                           contiguousRunLength, groupByContiguousHour
//   lib/studentPeriod.ts    periodOf, classExistsOn, periodIndex,
//                           existsForStudent
//   lib/db.ts               getStudentsForTeacher (los slots salen del
//                           grid, no de la ficha)
//
// POR QUÉ UNA COPIA Y NO UNA REGLA PROPIA. El alumno tiene que ver sus
// clases igual que las ve su profesor en el Calendario y en «Mis
// clases» de Gestión. Cualquier regla escrita aquí de cero acabaría
// diciendo otra cosa en algún caso —ya pasó: la primera versión sacaba
// las reprogramaciones de `class_records` y la hora de HANA Gualda salía
// una hora antes que en su calendario—.
//
// LO ÚNICO ADAPTADO ES LA ENTRADA DE DATOS. Las reglas son las de allí,
// con los mismos nombres para poder comparar las dos a simple vista. Si
// Gestión cambia una de estas funciones, se vuelve a copiar y se
// actualiza el commit de arriba. Las adaptaciones, todas:
//
//   1. El grid, las assignments y las bajas se reconstruyen desde
//      `vista_calendario_alumno`, que ya viene filtrada por alumno, en
//      vez de leer las tablas enteras. `alumnoDeGestion` hace lo que
//      `getStudentsForTeacher` + `getTeacherAssignments`.
//   2. `findAssignmentForName` casa SOLO por nombre completo. Gestión
//      prueba después con el nombre de pila, y "Marina" casaría con
//      cualquier Marina; se quitó por decisión expresa.
//   3. Las fechas de las marcas puntuales se calculan sobre la cadena
//      (`addDaysIso`) en todos los sitios. `puntualDateOf` de Gestión
//      usa `new Date(…)` en hora local, que en el servidor del LMS (UTC)
//      da lo mismo, pero no hace falta depender de eso.
//   4. Tipos mínimos: solo los campos que estas funciones leen.
//
// LO QUE NO SE COPIA: los estados de `class_records` (reprogramada,
// cancelada, falta), que Gestión pinta en la tarjeta con
// `rescheduledTargetFor` y `cancellationFor`. En esta versión el LMS no
// enseña estados; las clases que no ocurren se saltan con los 'quita' de
// `vista_excepciones_clase`, en `proximaClase` (`lib/clases.ts`).
//
// Módulo puro: sin `server-only` ni lecturas. Lo alimenta
// `lib/gestion.ts` y lo consume `proximaClase`, en `lib/clases.ts`.
// ---------------------------------------------------------------

// ---------------------------------------------------------------
// TIPOS DE GESTIÓN (mínimos)
// ---------------------------------------------------------------

type CellState = "libre" | "ocupado" | "bloqueado" | "no_work" | "reprogramada";

type Cell = {
  state: CellState;
  student?: string;
  weekDate?: string;
  baseState?: CellState;
  baseStudent?: string;
  recoveryFor?: string;
  rescheduledTo?: string;
};

type Grid = Record<string, Cell>;

type AssignedSlot = { day: string; hour: string };

type Assignment = {
  teacherId: string;
  studentName: string;
  slots: AssignedSlot[];
  startDate?: string;
  createdAt?: string;
  /** `assignments.meet_link` de ESTE profesor: lo que abre su botón. */
  meetLink?: string;
};

// ---------------------------------------------------------------
// lib/sessions.ts
// ---------------------------------------------------------------

function hourNum(hour: string | number | undefined | null): number {
  if (typeof hour === "number") return Number.isFinite(hour) ? Math.trunc(hour) : NaN;
  return parseInt((hour ?? "").trim(), 10);
}

function hourText(h: number): string {
  return `${String(h).padStart(2, "0")}:00`;
}

function nkName(name: string | undefined | null): string {
  return (name ?? "").trim().toLowerCase();
}

function isNextHour(a: string | number, b: string | number): boolean {
  const x = hourNum(a),
    y = hourNum(b);
  return Number.isFinite(x) && Number.isFinite(y) && y === x + 1;
}

function contiguousRunLength(hours: Array<number | string>, anchor: number | string): number {
  const a = hourNum(anchor);
  if (!Number.isFinite(a)) return 0;
  const set = new Set<number>();
  for (const h of hours) {
    const n = hourNum(h);
    if (Number.isFinite(n)) set.add(n);
  }
  if (!set.has(a)) return 0;
  let start = a;
  while (set.has(start - 1)) start--;
  let end = a;
  while (set.has(end + 1)) end++;
  return end - start + 1;
}

function groupByContiguousHour<T>(
  items: T[],
  hourOf: (item: T) => string | number,
  sameSession: (prev: T, next: T) => boolean
): T[][] {
  const sorted = [...items].sort((a, b) => hourNum(hourOf(a)) - hourNum(hourOf(b)));
  const runs: T[][] = [];
  let run: T[] = [];
  for (const item of sorted) {
    const prev = run[run.length - 1];
    if (prev && sameSession(prev, item) && isNextHour(hourOf(prev), hourOf(item))) {
      run.push(item);
    } else {
      if (run.length) runs.push(run);
      run = [item];
    }
  }
  if (run.length) runs.push(run);
  return runs;
}

// ---------------------------------------------------------------
// lib/cells.ts
// ---------------------------------------------------------------

function isPuntualState(state: CellState): boolean {
  return state === "bloqueado" || state === "reprogramada";
}

function baseStateOf(cell: Cell): CellState {
  if (isPuntualState(cell.state) && cell.weekDate) return cell.baseState ?? "libre";
  return cell.state;
}

function baseStudentOf(cell: Cell): string | undefined {
  if (baseStateOf(cell) !== "ocupado") return undefined;
  if (isPuntualState(cell.state) && cell.weekDate) return cell.baseStudent ?? cell.student;
  return cell.student;
}

// ---------------------------------------------------------------
// lib/studentPeriod.ts
// ---------------------------------------------------------------

type StudentPeriod = { from: string; to: string | null };

function toIsoDate(raw: string | undefined | null): string | null {
  if (!raw) return null;
  const d = raw.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : null;
}

function periodOf(
  assignment: { startDate?: string; createdAt?: string },
  dropout?: { droppedAt?: string } | null
): StudentPeriod {
  const from = toIsoDate(assignment.startDate) ?? toIsoDate(assignment.createdAt) ?? "0000-01-01";
  return { from, to: toIsoDate(dropout?.droppedAt) };
}

function classExistsOn(period: StudentPeriod, dateIso: string): boolean {
  if (dateIso < period.from) return false;
  if (period.to && dateIso > period.to) return false;
  return true;
}

function periodIndex(
  assignments: Array<{ teacherId: string; studentName: string; startDate?: string; createdAt?: string }>,
  dropouts: Array<{ teacherId: string; studentName: string; droppedAt?: string }>,
  teacherId: string
): Map<string, StudentPeriod> {
  const nk = (s: string) => (s ?? "").trim().toLowerCase();

  const bajaPor = new Map<string, string>();
  for (const d of dropouts) {
    if (d.teacherId !== teacherId) continue;
    const iso = toIsoDate(d.droppedAt);
    if (!iso) continue;
    const k = nk(d.studentName);
    const prev = bajaPor.get(k);
    if (!prev || iso > prev) bajaPor.set(k, iso);
  }

  const out = new Map<string, StudentPeriod>();
  for (const a of assignments) {
    if (a.teacherId !== teacherId) continue;
    const k = nk(a.studentName);
    const p = periodOf(a, { droppedAt: bajaPor.get(k) });
    const prev = out.get(k);
    if (!prev || p.from < prev.from) out.set(k, p);
  }
  return out;
}

function existsForStudent(index: Map<string, StudentPeriod>, studentName: string, dateIso: string): boolean {
  const p = index.get((studentName ?? "").trim().toLowerCase());
  return p ? classExistsOn(p, dateIso) : true;
}

// ---------------------------------------------------------------
// lib/teacherClasses.ts
// ---------------------------------------------------------------

const DAY_NAMES_BY_JSDAY = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const GRID_DAY_ORDER = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

const nk = (s: string) => (s ?? "").trim().toLowerCase();

function dayNameFromIso(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return "";
  return DAY_NAMES_BY_JSDAY[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
}

export function addDaysIso(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

type TeacherClass = {
  date: string;
  assignment: Assignment;
  studentName: string;
  hour: string;
  meetLink?: string;
  isRecovery?: boolean;
  recoveryFor?: string;
};

function classesForDate(
  assignments: Assignment[],
  dateIso: string,
  periods?: Map<string, StudentPeriod>
): TeacherClass[] {
  const dayName = dayNameFromIso(dateIso);
  const list: TeacherClass[] = [];
  for (const a of assignments) {
    if (periods && !existsForStudent(periods, a.studentName, dateIso)) continue;
    for (const slot of a.slots ?? []) {
      if (slot.day !== dayName) continue;
      list.push({ date: dateIso, assignment: a, studentName: a.studentName, hour: slot.hour, meetLink: a.meetLink });
    }
  }
  return list.sort((x, y) => parseInt(x.hour) - parseInt(y.hour));
}

/** ADAPTADO (2): sin el segundo intento por nombre de pila. */
function findAssignmentForName(assignments: Assignment[], name: string): Assignment | undefined {
  const full = nk(name);
  return assignments.find((a) => nk(a.studentName) === full);
}

function recoveriesForDate(grid: Grid, dateIso: string, assignments: Assignment[]): TeacherClass[] {
  const list: TeacherClass[] = [];
  for (const [key, cell] of Object.entries(grid)) {
    if (cell.state !== "bloqueado" || !cell.student || !cell.weekDate) continue;
    const usc = key.lastIndexOf("_");
    if (usc < 0) continue;
    const day = key.slice(0, usc);
    const hour = key.slice(usc + 1);
    const dayIdx = GRID_DAY_ORDER.indexOf(day);
    if (dayIdx < 0) continue;
    if (addDaysIso(cell.weekDate, dayIdx) !== dateIso) continue;

    const a = findAssignmentForName(assignments, cell.student);
    if (!a) continue;
    list.push({
      date: dateIso,
      assignment: a,
      studentName: cell.student,
      hour,
      meetLink: a.meetLink,
      isRecovery: true,
      recoveryFor: cell.recoveryFor,
    });
  }
  return list;
}

type GridOccupancy = { hours: Map<string, number[]> };

function gridOccupancyOfTeacher(teacher: {
  upcomingClasses?: Array<{ studentName: string; day: string; time: string }>;
}): GridOccupancy {
  const hours = new Map<string, number[]>();
  for (const c of teacher?.upcomingClasses ?? []) {
    const h = hourNum(c.time);
    if (!Number.isFinite(h)) continue;
    const k = `${nkName(c.studentName)}|${c.day}`;
    const arr = hours.get(k);
    if (arr) arr.push(h);
    else hours.set(k, [h]);
  }
  // `recoveries` de Gestión no se copia: solo lo lee `recoveryPartOfSession`,
  // que es de finanzas y no interviene en qué clases hay.
  return { hours };
}

function gridRunLength(
  occ: GridOccupancy | undefined,
  studentName: string,
  day: string,
  hour: string | number
): number | null {
  const list = occ?.hours.get(`${nkName(studentName)}|${day}`);
  if (!list || list.length === 0) return null;
  return contiguousRunLength(list, hour);
}

export type TeacherSession = TeacherClass & {
  startHourNum: number;
  endHourNum: number;
  durationHours: number;
  recoveryDates: string[];
  mixedRecovery: boolean;
};

function movidaEseDia(c: TeacherClass): boolean {
  return !!c.isRecovery && !!c.recoveryFor && c.recoveryFor === c.date;
}

function sameSessionClass(a: TeacherClass, b: TeacherClass): boolean {
  return a.date === b.date && nkName(a.studentName) === nkName(b.studentName);
}

function toSession(run: TeacherClass[]): TeacherSession {
  const first = run[0];
  const start = hourNum(first.hour);
  const duration = run.length;
  const recoveryParts = run.filter((c) => c.isRecovery);
  const recoveryDates = Array.from(
    new Set(recoveryParts.map((c) => c.recoveryFor).filter((d): d is string => !!d))
  ).sort();
  const allRecovery = recoveryParts.length === run.length;
  return {
    ...first,
    isRecovery: allRecovery,
    recoveryFor: allRecovery ? first.recoveryFor : recoveryDates[0],
    startHourNum: start,
    endHourNum: start + duration,
    durationHours: duration,
    recoveryDates,
    mixedRecovery: recoveryParts.length > 0 && !allRecovery,
  };
}

function groupContiguousClasses(classes: TeacherClass[], occupancy?: GridOccupancy): TeacherSession[] {
  const byDate = new Map<string, TeacherClass[]>();
  for (const c of classes) {
    const arr = byDate.get(c.date);
    if (arr) arr.push(c);
    else byDate.set(c.date, [c]);
  }

  const sessions: TeacherSession[] = [];
  for (const [, sameDay] of Array.from(byDate)) {
    const byStudent = new Map<string, TeacherClass[]>();
    for (const c of sameDay) {
      const k = nkName(c.studentName);
      const arr = byStudent.get(k);
      if (arr) arr.push(c);
      else byStudent.set(k, [c]);
    }
    for (const [, ofStudent] of Array.from(byStudent)) {
      const chain = (a: TeacherClass, b: TeacherClass) => {
        if (!sameSessionClass(a, b)) return false;
        if (movidaEseDia(a) !== movidaEseDia(b)) return false;
        if (!occupancy) return true;
        if (a.isRecovery || b.isRecovery) return true;
        const day = dayNameFromIso(a.date);
        const run = gridRunLength(occupancy, a.studentName, day, a.hour);
        if (run == null) return false;
        return run > 1 && gridRunLength(occupancy, b.studentName, day, b.hour) === run;
      };
      for (const run of groupByContiguousHour(ofStudent, (c) => c.hour, chain)) {
        sessions.push(toSession(run));
      }
    }
  }

  return sessions.sort((x, y) => x.date.localeCompare(y.date) || x.startHourNum - y.startHourNum);
}

// ---------------------------------------------------------------
// ADAPTACIÓN (1): LA ENTRADA DE DATOS
// ---------------------------------------------------------------

/** Una fila de `vista_calendario_alumno`. */
export type FilaCalendario = {
  alumno_id: string;
  nombre_en_celda: string;
  teacher_id: string;
  profesor: string | null;
  celda: string;
  dia: string | null;
  hora: string | null;
  estado: string | null;
  alumno_celda: string | null;
  alumno_base: string | null;
  estado_base: string | null;
  week_date: string | null;
  recovery_for: string | null;
  rescheduled_to: string | null;
  asignacion_inicio: string | null;
  asignacion_alta: string | null;
  alumno_alta: string | null;
  baja: string | null;
  meet_link: string | null;
};

const ESTADOS: readonly CellState[] = ["libre", "ocupado", "bloqueado", "no_work", "reprogramada"];
const comoEstado = (v: string | null): CellState | undefined =>
  v !== null && (ESTADOS as readonly string[]).includes(v) ? (v as CellState) : undefined;

/** Lo que Gestión tiene de un alumno con UN profesor. */
type AlumnoDeProfesor = {
  teacherId: string;
  profesor: string | null;
  grid: Grid;
  assignments: Assignment[];
  dropouts: Array<{ teacherId: string; studentName: string; droppedAt?: string }>;
  occupancy: GridOccupancy;
};

/**
 * `getStudentsForTeacher` + `getTeacherAssignments` de Gestión, sobre las
 * filas de un solo alumno.
 *
 * El alumno está en la lista del profesor si tiene celdas recurrentes en
 * su grid (con los slots que salen de ellas: "el calendario manda") o si
 * tiene una assignment con él aunque no tenga celdas (sin slots). Si no
 * está en esa lista, sus recuperaciones en ese grid no generan clase:
 * `recoveriesForDate` no encuentra su assignment y la omite, igual que en
 * Gestión.
 */
function alumnoDeGestion(filas: FilaCalendario[]): AlumnoDeProfesor[] {
  const porProfesor = new Map<string, FilaCalendario[]>();
  for (const f of filas) {
    const lista = porProfesor.get(f.teacher_id) ?? [];
    lista.push(f);
    porProfesor.set(f.teacher_id, lista);
  }

  const salida: AlumnoDeProfesor[] = [];
  for (const [teacherId, suyas] of Array.from(porProfesor)) {
    // Los nombres con los que ESTE alumno aparece en ese grid. Una celda
    // también puede nombrar a otro alumno (el de fondo de una
    // recuperación): ese no es él.
    const nombres = new Set(suyas.map((f) => nkName(f.nombre_en_celda)));

    const grid: Grid = {};
    for (const f of suyas) {
      const state = comoEstado(f.estado);
      if (!state || grid[f.celda]) continue;
      grid[f.celda] = {
        state,
        student: f.alumno_celda ?? undefined,
        weekDate: f.week_date ?? undefined,
        baseState: comoEstado(f.estado_base),
        baseStudent: f.alumno_base ?? undefined,
        recoveryFor: f.recovery_for ?? undefined,
        rescheduledTo: f.rescheduled_to ?? undefined,
      };
    }

    // extractOcupadoCells + groupCellsByStudent, solo para sus nombres.
    const slotsPor = new Map<string, { name: string; slots: AssignedSlot[] }>();
    for (const [key, cell] of Object.entries(grid)) {
      const student = baseStudentOf(cell)?.trim();
      if (!student || !nombres.has(nkName(student))) continue;
      const [day, hour] = key.split("_");
      const k = nkName(student);
      if (!slotsPor.has(k)) slotsPor.set(k, { name: student, slots: [] });
      slotsPor.get(k)!.slots.push({ day, hour });
    }

    const primera = suyas[0];
    const conAsignacion = suyas.find((f) => f.asignacion_alta !== null);
    const assignments: Assignment[] = [];
    for (const { name, slots } of Array.from(slotsPor.values())) {
      assignments.push({
        teacherId,
        studentName: name,
        slots,
        startDate: conAsignacion?.asignacion_inicio ?? undefined,
        meetLink: conAsignacion?.meet_link ?? undefined,
        // Sin assignment, Gestión usa el alta del alumno, o "ahora".
        createdAt:
          conAsignacion?.asignacion_alta ?? primera.alumno_alta ?? new Date().toISOString(),
      });
    }
    // "Asignados SIN horario": están en su lista, pero sin slots.
    if (assignments.length === 0 && conAsignacion) {
      assignments.push({
        teacherId,
        studentName: conAsignacion.nombre_en_celda,
        slots: [],
        startDate: conAsignacion.asignacion_inicio ?? undefined,
        createdAt: conAsignacion.asignacion_alta ?? undefined,
        meetLink: conAsignacion.meet_link ?? undefined,
      });
    }

    const dropouts = suyas
      .filter((f) => f.baja)
      .map((f) => ({ teacherId, studentName: f.nombre_en_celda, droppedAt: f.baja ?? undefined }));

    // `upcomingClasses` de `dbGetTeachers`: una por celda recurrente.
    const upcomingClasses = Object.entries(grid)
      .map(([key, cell]) => ({ key, student: baseStudentOf(cell) }))
      .filter((e): e is { key: string; student: string } => !!e.student)
      .map(({ key, student }) => {
        const [day, time] = key.split("_");
        return { studentName: student, day, time };
      });

    salida.push({
      teacherId,
      profesor: primera.profesor,
      grid,
      assignments,
      dropouts,
      occupancy: gridOccupancyOfTeacher({ upcomingClasses }),
    });
  }
  return salida;
}

// ---------------------------------------------------------------
// LO QUE SALE: LAS CLASES DEL ALUMNO
// ---------------------------------------------------------------

/** Una clase del alumno, tal como sale en «Mis clases» de su profesor. */
export type ClaseDeGestion = {
  /** Día natural español, "2026-09-25". */
  fecha: string;
  /** "17:00" */
  desde: string;
  horas: number;
  teacherId: string;
  profesor: string | null;
  /**
   * El `meet_link` CRUDO de la assignment de este profesor con el alumno:
   * lo que abre el botón del profesor en Gestión (`JoinClass.tsx`, vía
   * `normalizeUrl`). Quien lo convierte en botón es `enlaceDeClase`.
   */
  meetLink: string | null;
  /** Celda de recuperación (o destino de una reprogramación). */
  esRecuperacion: boolean;
};

/**
 * Todas las clases del alumno entre `desde` y `desde + dias`, con todos
 * sus profesores: `sessionsOn` de `MisClasesPanel` —el horario del grid
 * y las celdas de recuperación, agrupadas en sesiones— día a día.
 */
export function clasesDelAlumno(filas: FilaCalendario[], desde: string, dias: number): ClaseDeGestion[] {
  const salida: ClaseDeGestion[] = [];

  for (const t of alumnoDeGestion(filas)) {
    const periodos = periodIndex(t.assignments, t.dropouts, t.teacherId);

    for (let n = 0; n <= dias; n++) {
      const iso = addDaysIso(desde, n);
      const sesiones = groupContiguousClasses(
        [...classesForDate(t.assignments, iso, periodos), ...recoveriesForDate(t.grid, iso, t.assignments)],
        t.occupancy
      );
      for (const c of sesiones) {
        salida.push({
          fecha: iso,
          desde: hourText(c.startHourNum),
          horas: c.durationHours,
          teacherId: t.teacherId,
          profesor: t.profesor,
          meetLink: c.meetLink?.trim() || null,
          esRecuperacion: !!c.isRecovery,
        });
      }
    }
  }

  return salida.sort((a, b) => a.fecha.localeCompare(b.fecha) || a.desde.localeCompare(b.desde));
}

/**
 * El horario recurrente del alumno según el calendario: las celdas cuyo
 * alumno de fondo es él, con todos sus profesores. Es lo que pinta la
 * lista «Tu horario» de «Mis clases».
 */
export function horarioDelAlumno(filas: FilaCalendario[]): AssignedSlot[] {
  const vistos = new Set<string>();
  const salida: AssignedSlot[] = [];
  for (const t of alumnoDeGestion(filas)) {
    for (const a of t.assignments) {
      for (const s of a.slots) {
        const k = `${s.day}|${s.hour}`;
        if (vistos.has(k)) continue;
        vistos.add(k);
        salida.push(s);
      }
    }
  }
  return salida;
}
