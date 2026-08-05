import { accesoService } from "@/lib/services/accesoService";
import { pagoService } from "@/lib/services/pagoService";
import { socioService } from "@/lib/services/socioService";

export const dashboardService = {
  /** Resumen para el panel: socios, accesos del día e ingresos del mes. */
  resumen(ahora = new Date()) {
    const socios = socioService.getAll();
    const sociosActivos = socios.filter(
      (s) => s.socio.estado === "activo"
    ).length;

    const accesosDelDia = accesoService.delDia(ahora);
    const permitidos = accesosDelDia.filter(
      (a) => a.acceso.resultado === "permitido"
    ).length;

    const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
    const ingresosMes = pagoService
      .getAll()
      .filter((p) => p.pago.creadoEn >= inicioMes)
      .reduce((acc, p) => acc + p.pago.monto, 0);

    return {
      sociosTotal: socios.length,
      sociosActivos,
      accesosHoy: accesosDelDia.length,
      accesosPermitidos: permitidos,
      accesosDenegados: accesosDelDia.length - permitidos,
      ingresosMes,
      accesosDelDia,
    };
  },
};
