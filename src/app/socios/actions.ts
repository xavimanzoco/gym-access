"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { AppError, ValidationError } from "@/lib/errors/AppError";
import { pagoService } from "@/lib/services/pagoService";
import { socioService } from "@/lib/services/socioService";
import {
  socioImportService,
  type VistaPreviaImport,
} from "@/lib/services/socioImportService";
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

/** Extensiones que aceptamos en la importación. */
const EXTENSIONES_VALIDAS = [".xlsx", ".xlsm"];

/** Lee el archivo del formulario y valida que sea una planilla. */
async function leerPlanilla(formData: FormData): Promise<Buffer> {
  const archivo = formData.get("archivo");

  if (!(archivo instanceof File) || archivo.size === 0) {
    throw new ValidationError("Elegí un archivo de Excel.");
  }

  const nombre = archivo.name.toLowerCase();
  if (!EXTENSIONES_VALIDAS.some((ext) => nombre.endsWith(ext))) {
    throw new ValidationError(
      "El archivo tiene que ser .xlsx. Si es un .xls o .csv, abrilo en Excel y usá “Guardar como → Libro de Excel (.xlsx)”.",
    );
  }

  return Buffer.from(await archivo.arrayBuffer());
}

export interface ImportFormState {
  error?: string;
  /** Vista previa de lo que se importaría, antes de confirmar. */
  vistaPrevia?: VistaPreviaImport;
  /** Resumen de una importación ya aplicada. */
  resultado?: { importados: number; repetidos: number; descartados: number };
}

/** Paso 1: interpreta la planilla y devuelve la vista previa (no toca la base). */
export async function analizarPlanillaSocios(
  _prev: ImportFormState,
  formData: FormData,
): Promise<ImportFormState> {
  try {
    return { vistaPrevia: socioImportService.analizar(await leerPlanilla(formData)) };
  } catch (error) {
    if (error instanceof AppError) return { error: error.message };
    throw error;
  }
}

/** Paso 2: da de alta los socios de la planilla. */
export async function importarSocios(
  _prev: ImportFormState,
  formData: FormData,
): Promise<ImportFormState> {
  try {
    const resultado = socioImportService.confirmar(await leerPlanilla(formData));
    revalidatePath("/socios");
    revalidatePath("/reportes");
    return { resultado };
  } catch (error) {
    if (error instanceof AppError) return { error: error.message };
    throw error;
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
