import { pagoRepository } from "@/lib/repositories/pagoRepository";
import { planRepository } from "@/lib/repositories/planRepository";
import { socioRepository } from "@/lib/repositories/socioRepository";
import { NotFoundError, ValidationError } from "@/lib/errors/AppError";
import { DIA_LIMITE_FIN_DE_MES, PLAN_MENSUAL_NOMBRE } from "@/lib/constants";
import { hoyISO, proximoVencimientoDiaDiez } from "@/lib/utils";
import type { MetodoPago, Pago } from "@/types";

export interface RegistrarPagoData {
  socioId: number;
  monto: number;
  metodo: MetodoPago;
  planId: number;
  /** Fecha del cobro. Por defecto, hoy. */
  fechaPago?: string;
}

export const pagoService = {
  /**
   * Registra un pago y fija el vencimiento de la cuota del socio.
   *
   * Ciclo mensual del gimnasio: no importa qué día del mes se pague ni cuándo
   * fue el pago anterior — todo pago vale hasta el día 10 del mes siguiente al
   * pago. El día 11, quien no renovó queda vencido automáticamente (por la
   * comparación de fecha en `accesoService`, sin ningún proceso aparte).
   *
   * Caso especial: socio NUEVO (nunca pagó, `vencimiento` null) que se anota
   * del día 25 en adelante — le tocaría casi nada de tiempo (hasta el 10, a
   * días de anotarse), así que se le da un ciclo extra.
   */
  registrarPago(data: RegistrarPagoData): Pago {
    const socio = socioRepository.findById(data.socioId);
    if (!socio) throw new NotFoundError("El socio no existe");

    const plan = planRepository.findById(data.planId);
    if (!plan) throw new NotFoundError("El plan no existe");

    if (data.monto <= 0) {
      throw new ValidationError("El monto debe ser mayor a cero");
    }

    const fechaPago = data.fechaPago ?? hoyISO();
    const esNuevoAFinDeMes =
      !socio.vencimiento && Number(fechaPago.slice(-2)) >= DIA_LIMITE_FIN_DE_MES;

    const periodoDesde = fechaPago;
    const periodoHasta = proximoVencimientoDiaDiez(
      fechaPago,
      esNuevoAFinDeMes ? 2 : 1,
    );

    const pago = pagoRepository.create({
      socioId: data.socioId,
      monto: data.monto,
      metodo: data.metodo,
      planId: data.planId,
      fechaPago,
      periodoDesde,
      periodoHasta,
    });

    socioRepository.actualizarVencimiento(data.socioId, periodoHasta);
    return pago;
  },

  /**
   * Pago rápido de un click desde Socios: cobra el plan Mensual de una, sin
   * pasar por el formulario (acá no se manejan más que cuotas por mes).
   */
  registrarPagoMensual(socioId: number, metodo: MetodoPago = "efectivo"): Pago {
    const plan = planRepository.findByNombre(PLAN_MENSUAL_NOMBRE);
    if (!plan) throw new NotFoundError(`No existe el plan "${PLAN_MENSUAL_NOMBRE}"`);

    return this.registrarPago({
      socioId,
      planId: plan.id,
      monto: plan.precio,
      metodo,
    });
  },

  historialDeSocio(socioId: number): Pago[] {
    return pagoRepository.findBySocio(socioId);
  },
};
