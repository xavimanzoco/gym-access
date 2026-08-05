import { UnauthorizedError } from "@/lib/errors/ApiError";

/**
 * Verifica que el request provenga del controlador del molinete comparando
 * el header `x-device-token` con el secreto configurado. Lanza
 * UnauthorizedError si no coincide.
 */
export function assertDevice(request: Request): void {
  const esperado = process.env.DEVICE_TOKEN;
  if (!esperado) {
    throw new UnauthorizedError("DEVICE_TOKEN no configurado en el servidor");
  }
  const recibido = request.headers.get("x-device-token");
  if (!recibido || recibido !== esperado) {
    throw new UnauthorizedError("Token de dispositivo inválido");
  }
}
