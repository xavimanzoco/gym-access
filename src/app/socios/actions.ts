"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { AppError } from "@/lib/errors/AppError";
import { pagoService } from "@/lib/services/pagoService";
import { socioService } from "@/lib/services/socioService";
import { crearSocioSchema } from "@/lib/validations/socio";

/** Estado que devuelve la acción al formulario (para `useActionState`). */
export interface SocioFormState {
  error?: string;
}

/** Extrae los campos crudos del formulario como los espera el schema. */
function leerFormulario(formData: FormData) {
  return {
    dni: String(formData.get("dni") ?? ""),
    nombre: String(formData.get("nombre") ?? ""),
    apellido: String(formData.get("apellido") ?? ""),
    telefono: String(formData.get("telefono") ?? ""),
    email: String(formData.get("email") ?? ""),
    fechaNacimiento: String(formData.get("fechaNacimiento") ?? ""),
    planId: String(formData.get("planId") ?? ""),
    // El alta siempre crea el socio activo; se desactiva después desde la tabla.
    activo: true,
  };
}

export async function crearSocio(
  _prev: SocioFormState,
  formData: FormData,
): Promise<SocioFormState> {
  const parsed = crearSocioSchema.safeParse(leerFormulario(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  try {
    socioService.crear(parsed.data);
  } catch (error) {
    if (error instanceof AppError) return { error: error.message };
    throw error;
  }

  revalidatePath("/socios");
  redirect("/socios");
}

export async function eliminarSocio(formData: FormData): Promise<void> {
  const id = Number(formData.get("id"));
  if (Number.isInteger(id)) {
    socioService.eliminar(id);
    revalidatePath("/socios");
  }
  redirect("/socios");
}

/** Activa o desactiva un socio (bloquea/habilita su ingreso por molinete). */
export async function alternarActivoSocio(formData: FormData): Promise<void> {
  const id = Number(formData.get("id"));
  if (Number.isInteger(id)) {
    socioService.alternarActivo(id);
    revalidatePath("/socios");
    revalidatePath(`/socios/${id}`);
  }
}

/** Pago rápido desde Socios (fila o detalle): cobra el plan Mensual con el método elegido. */
export async function pagarMensual(formData: FormData): Promise<void> {
  const id = Number(formData.get("id"));
  const metodo = formData.get("metodo");
  const metodoValido =
    metodo === "efectivo" || metodo === "transferencia" ? metodo : "efectivo";
  if (Number.isInteger(id)) {
    pagoService.registrarPagoMensual(id, metodoValido);
    revalidatePath("/socios");
    revalidatePath(`/socios/${id}`);
  }
}
