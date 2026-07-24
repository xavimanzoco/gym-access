import {
  accesoRepository,
  type AccesoConSocio,
} from "@/lib/repositories/accesoRepository";
import { socioRepository } from "@/lib/repositories/socioRepository";
import { abrirMolinete } from "@/lib/services/hardware/molineteController";
import { MENSAJE_POR_MOTIVO } from "@/lib/constants";
import { ValidationError } from "@/lib/errors/AppError";
import { diasEntre, hoyISO } from "@/lib/utils";
import type { MotivoAcceso, ResultadoAcceso, Socio } from "@/types";

/**
 * Regla de acceso: dado un socio (o su ausencia), decide si puede ingresar.
 * Orden de evaluación: existencia → estado → vigencia de la cuota.
 */
function evaluar(socio: Socio | null, hoy: string): MotivoAcceso {
  if (!socio) return "SOCIO_INEXISTENTE";
  if (!socio.activo) return "SOCIO_INACTIVO";
  // La cuota vale hasta el día de vencimiento inclusive.
  if (!socio.vencimiento || socio.vencimiento < hoy) return "CUOTA_VENCIDA";
  return "OK";
}

export const accesoService = {
  /**
   * Procesa un ingreso: el DNI que llega del molinete se valida, se deja
   * registro del intento y, si corresponde, se ordena abrir el molinete.
   *
   * Esta es la operación central del kiosco. Devuelve el resultado listo para
   * mostrar en pantalla (verde/rojo) con el mensaje ya resuelto.
   */
  async registrarIngreso(dniIngresado: string): Promise<ResultadoAcceso> {
    const dni = dniIngresado.trim();
    if (!dni) throw new ValidationError("El DNI no puede estar vacío");

    const hoy = hoyISO();
    const socio = socioRepository.findByDni(dni);
    const motivo = evaluar(socio, hoy);
    const permitido = motivo === "OK";

    accesoRepository.create({
      socioId: socio?.id ?? null,
      dniIngresado: dni,
      permitido,
      motivo,
    });

    if (permitido) {
      await abrirMolinete();
    }

    const diasParaVencer = socio?.vencimiento
      ? diasEntre(hoy, socio.vencimiento)
      : null;

    return {
      permitido,
      motivo,
      mensaje: MENSAJE_POR_MOTIVO[motivo],
      socio,
      diasParaVencer,
    };
  },

  /** Últimos ingresos, para el panel en vivo del kiosco. */
  recientes(limite = 15): AccesoConSocio[] {
    return accesoRepository.recientes(limite);
  },
};
