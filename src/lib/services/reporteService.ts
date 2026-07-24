import {
  accesoRepository,
  type AccesoConSocio,
} from "@/lib/repositories/accesoRepository";
import {
  pagoRepository,
  type PagoConSocio,
} from "@/lib/repositories/pagoRepository";
import { socioRepository } from "@/lib/repositories/socioRepository";
import { hoyISO } from "@/lib/utils";

/** Métricas y detalle del día para el panel de reportes. */
export interface ResumenDelDia {
  fecha: string;
  recaudacion: number;
  ingresosPermitidos: number;
  sociosActivos: number;
  sociosVencidos: number;
  pagos: PagoConSocio[];
  accesosRecientes: AccesoConSocio[];
}

export const reporteService = {
  resumenDelDia(): ResumenDelDia {
    const fecha = hoyISO();
    return {
      fecha,
      recaudacion: pagoRepository.totalPorFecha(fecha),
      ingresosPermitidos: accesoRepository.contarPermitidosPorFecha(fecha),
      sociosActivos: socioRepository.contarActivos(),
      sociosVencidos: socioRepository.contarVencidos(fecha),
      pagos: pagoRepository.findByFecha(fecha),
      accesosRecientes: accesoRepository.recientes(10),
    };
  },
};
