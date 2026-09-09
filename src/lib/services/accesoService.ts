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

    // Sin `await` a propósito: la orden al hardware puede tardar segundos
    // (proceso serie) y no debe demorar la pantalla del kiosco. `abrirMolinete`
    // nunca lanza — atrapa sus errores y los deja en el log —, así que no queda
    // ninguna promesa rechazada suelta.
    if (permitido) {
      void abrirMolinete();
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

  /**
   * Abre el molinete a mano, sin validar DNI (recepción deja pasar a alguien).
   * Igual queda registrado en el historial de accesos, con motivo `MANUAL`.
   */
  async abrirManual(): Promise<ResultadoAcceso> {
    accesoRepository.create({
      socioId: null,
      dniIngresado: "",
      permitido: true,
      motivo: "MANUAL",
    });

    // Ver comentario en `registrarIngreso`: la orden va sin esperar.
    void abrirMolinete();

    return {
      permitido: true,
      motivo: "MANUAL",
      mensaje: MENSAJE_POR_MOTIVO.MANUAL,
      socio: null,
      diasParaVencer: null,
    };
  },

  /** Últimos ingresos, para el panel en vivo del kiosco. */
  recientes(limite = 15): AccesoConSocio[] {
    return accesoRepository.recientes(limite);
  },
};
