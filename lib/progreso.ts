const KEY = "drc-progreso-v1";

type Progreso = Record<string, { aciertos: number; total: number; fecha: string }>;

function leerTodo(): Progreso {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(KEY) || "{}");
  } catch {
    return {};
  }
}

export function leerProgreso(alumnoId: string, bloqueId: string) {
  return leerTodo()[`${alumnoId}:${bloqueId}`] || null;
}

export function leerProgresoAlumno(alumnoId: string) {
  const todo = leerTodo();
  const salida: Progreso = {};
  for (const k of Object.keys(todo)) {
    if (k.startsWith(`${alumnoId}:`)) salida[k.split(":")[1]] = todo[k];
  }
  return salida;
}

export function guardarProgreso(alumnoId: string, bloqueId: string, aciertos: number, total: number) {
  if (typeof window === "undefined") return;
  const todo = leerTodo();
  todo[`${alumnoId}:${bloqueId}`] = {
    aciertos,
    total,
    fecha: new Date().toISOString(),
  };
  window.localStorage.setItem(KEY, JSON.stringify(todo));
}

export function borrarProgreso() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEY);
}
