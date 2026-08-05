"use server";

import { revalidatePath } from "next/cache";

import { ApiError } from "@/lib/errors/ApiError";
import { socioService } from "@/lib/services/socioService";
import { socioSchema } from "@/lib/validation/schemas";

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function crearSocio(
  data: unknown
): Promise<ActionResult> {
  try {
    const parsed = socioSchema.parse(data);
    socioService.create(parsed);
    revalidatePath("/admin/socios");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: mensajeError(error) };
  }
}

export async function actualizarSocio(
  id: number,
  data: unknown
): Promise<ActionResult> {
  try {
    const parsed = socioSchema.partial().parse(data);
    socioService.update(id, parsed);
    revalidatePath("/admin/socios");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: mensajeError(error) };
  }
}

export async function eliminarSocio(id: number): Promise<ActionResult> {
  try {
    socioService.remove(id);
    revalidatePath("/admin/socios");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: mensajeError(error) };
  }
}

function mensajeError(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "Error inesperado";
}
