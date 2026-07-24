"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { AppError } from "@/lib/errors/AppError";
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
    activo: formData.get("activo") === "on",
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
}
