"use server";

import { revalidatePath } from "next/cache";

import { ApiError } from "@/lib/errors/ApiError";
import { pagoService } from "@/lib/services/pagoService";
import { pagoSchema } from "@/lib/validation/schemas";
import { type ActionResult } from "@/lib/actions/socioActions";

export async function registrarPago(data: unknown): Promise<ActionResult> {
  try {
    const parsed = pagoSchema.parse(data);
    pagoService.registrar(parsed);
    revalidatePath("/admin/pagos");
    revalidatePath("/admin/socios");
    return { ok: true };
  } catch (error) {
    if (error instanceof ApiError) return { ok: false, error: error.message };
    if (error instanceof Error) return { ok: false, error: error.message };
    return { ok: false, error: "Error inesperado" };
  }
}
