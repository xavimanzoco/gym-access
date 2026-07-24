"use server";

import { accesoService } from "@/lib/services/accesoService";
import type { ResultadoAcceso } from "@/types";

/**
 * Procesa el DNI que llega del molinete (o que teclea recepción): valida la
 * cuota, registra el ingreso y, si corresponde, ordena abrir el molinete.
 * Devuelve el resultado para que el kiosco muestre verde/rojo.
 */
export async function procesarIngreso(dni: string): Promise<ResultadoAcceso> {
  return accesoService.registrarIngreso(dni);
}
