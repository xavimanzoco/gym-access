"use server";

import { revalidatePath } from "next/cache";
import { AppError } from "@/lib/errors/AppError";
import { pagoService } from "@/lib/services/pagoService";
import { registrarPagoSchema } from "@/lib/validations/pago";

export interface PagoFormState {
  error?: string;
  ok?: boolean;
}

export async function registrarPago(
  _prev: PagoFormState,
  formData: FormData,
): Promise<PagoFormState> {
  const parsed = registrarPagoSchema.safeParse({
    socioId: formData.get("socioId"),
    planId: formData.get("planId"),
    monto: formData.get("monto"),
    metodo: formData.get("metodo"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  try {
    pagoService.registrarPago(parsed.data);
  } catch (error) {
    if (error instanceof AppError) return { error: error.message };
    throw error;
  }

  revalidatePath("/pagos");
  return { ok: true };
}
