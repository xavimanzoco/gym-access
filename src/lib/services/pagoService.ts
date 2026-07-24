import { pagoRepository } from "@/lib/repositories/pagoRepository";
import { planRepository } from "@/lib/repositories/planRepository";
import { socioRepository } from "@/lib/repositories/socioRepository";
import { NotFoundError, ValidationError } from "@/lib/errors/AppError";
import { hoyISO, sumarDias } from "@/lib/utils";
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
   * Registra un pago y extiende el vencimiento de la cuota del socio.
   *
   * Si la cuota sigue vigente, el nuevo período se encadena a partir del
   * vencimiento actual (los pagos se acumulan). Si está vencida o el socio
   * nunca pagó, arranca desde la fecha del cobro.
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

    // Base del nuevo período: se encadena si la cuota todavía está vigente.
    const cuotaVigente = socio.vencimiento && socio.vencimiento >= fechaPago;
    const periodoDesde = cuotaVigente ? socio.vencimiento! : fechaPago;
    const periodoHasta = sumarDias(periodoDesde, plan.diasDuracion);

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

  historialDeSocio(socioId: number): Pago[] {
    return pagoRepository.findBySocio(socioId);
  },

  /** Pagos cobrados hoy, con datos del socio (para el cierre del día). */
  pagosDeHoy() {
    return pagoRepository.findByFecha(hoyISO());
  },
};
