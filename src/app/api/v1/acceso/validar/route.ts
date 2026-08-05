import { NextResponse } from "next/server";

import { withErrorHandler } from "@/lib/errors/withErrorHandler";
import { assertDevice } from "@/lib/security/deviceAuth";
import { accesoService } from "@/lib/services/accesoService";
import { validarAccesoSchema } from "@/lib/validation/schemas";

/**
 * POST /api/v1/acceso/validar
 *
 * Endpoint que consulta el controlador del molinete en cada intento de paso.
 *
 * Headers: x-device-token: <DEVICE_TOKEN>
 * Body:    { "dni": "30111222", "direccion": "entrada" }
 * Resp:    { "abrir": true|false, "motivo": "...", "socio": {...}|null }
 */
export const POST = withErrorHandler(async (request: Request) => {
  assertDevice(request);

  const body = await request.json().catch(() => ({}));
  const { dni, direccion } = validarAccesoSchema.parse(body);

  const resultado = accesoService.validarPorDni(dni, direccion);

  return NextResponse.json({
    abrir: resultado.permitido,
    motivo: resultado.motivo,
    socio: resultado.socio,
  });
});
