"use server";

import { revalidatePath } from "next/cache";

import { ApiError } from "@/lib/errors/ApiError";
import { planService } from "@/lib/services/planService";
import { planSchema } from "@/lib/validation/schemas";
import { type ActionResult } from "@/lib/actions/socioActions";

export async function crearPlan(data: unknown): Promise<ActionResult> {
  try {
    const parsed = planSchema.parse(data);
    planService.create(parsed);
    revalidatePath("/admin/planes");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: mensajeError(error) };
  }
}

export async function actualizarPlan(
  id: number,
  data: unknown
): Promise<ActionResult> {
  try {
    const parsed = planSchema.partial().parse(data);
    planService.update(id, parsed);
    revalidatePath("/admin/planes");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: mensajeError(error) };
  }
}

export async function eliminarPlan(id: number): Promise<ActionResult> {
  try {
    planService.remove(id);
    revalidatePath("/admin/planes");
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
