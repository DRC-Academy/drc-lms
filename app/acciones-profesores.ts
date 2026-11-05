"use server";

// ---------------------------------------------------------------
// LAS ACCIONES DE «ACCESO PROFESORES»
//
// Una acción de servidor es una ruta más: las cuatro abren con
// `exigirAdministrador()`, y quién actúa sale de la cookie, nunca de los
// argumentos. El trabajo está en `lib/panel-profesor-admin.ts`.
// ---------------------------------------------------------------

import { revalidatePath } from "next/cache";
import { exigirAdministrador } from "@/lib/sesion-servidor";
import {
  activarAcceso,
  aprobarEmail,
  desactivarAcceso,
  invitarProfesor,
  type Resultado,
} from "@/lib/panel-profesor-admin";

const RUTA = "/accesos-profesores";
const SIN_PROFESOR: Resultado = { ok: false, error: "Falta el profesor." };

function idValido(teacherId: unknown): teacherId is string {
  return typeof teacherId === "string" && teacherId.trim() !== "" && teacherId.length <= 200;
}

export async function activarProfesor(teacherId: unknown): Promise<Resultado> {
  const sesion = await exigirAdministrador();
  if (!idValido(teacherId)) return SIN_PROFESOR;
  const resultado = await activarAcceso(teacherId, sesion.email);
  revalidatePath(RUTA);
  return resultado;
}

export async function desactivarProfesor(teacherId: unknown): Promise<Resultado> {
  const sesion = await exigirAdministrador();
  if (!idValido(teacherId)) return SIN_PROFESOR;
  const resultado = await desactivarAcceso(teacherId, sesion.email);
  revalidatePath(RUTA);
  return resultado;
}

export async function aprobarEmailProfesor(teacherId: unknown): Promise<Resultado> {
  const sesion = await exigirAdministrador();
  if (!idValido(teacherId)) return SIN_PROFESOR;
  const resultado = await aprobarEmail(teacherId, sesion.email);
  revalidatePath(RUTA);
  return resultado;
}

export async function invitarAlProfesor(teacherId: unknown): Promise<Resultado> {
  const sesion = await exigirAdministrador();
  if (!idValido(teacherId)) return SIN_PROFESOR;
  const resultado = await invitarProfesor(teacherId, sesion.email);
  revalidatePath(RUTA);
  return resultado;
}
