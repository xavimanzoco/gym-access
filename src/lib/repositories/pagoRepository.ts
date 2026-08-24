import { dbAll, dbGet, dbRun } from "@/lib/db/client";
import type { MetodoPago, Pago } from "@/types";

interface PagoRow {
  id: number;
  socio_id: number;
  monto: number;
  metodo: string;
  plan_id: number | null;
  fecha_pago: string;
  periodo_desde: string;
  periodo_hasta: string;
  creado_en: string;
}

interface PagoConSocioRow extends PagoRow {
  socio_nombre: string;
  socio_apellido: string;
  socio_dni: string | null;
}

/** Fila de pago con datos del socio, para listados y reportes. */
export interface PagoConSocio extends Pago {
  socioNombre: string;
  socioApellido: string;
  socioDni: string | null;
}

export interface CrearPagoData {
  socioId: number;
  monto: number;
  metodo: MetodoPago;
  planId: number | null;
  fechaPago: string;
  periodoDesde: string;
  periodoHasta: string;
}

function mapear(row: PagoRow): Pago {
  return {
    id: row.id,
    socioId: row.socio_id,
    monto: row.monto,
    metodo: row.metodo as MetodoPago,
    planId: row.plan_id,
    fechaPago: row.fecha_pago,
    periodoDesde: row.periodo_desde,
    periodoHasta: row.periodo_hasta,
    creadoEn: row.creado_en,
  };
}

export const pagoRepository = {
  create(data: CrearPagoData): Pago {
    const resultado = dbRun(
      `INSERT INTO pagos
         (socio_id, monto, metodo, plan_id, fecha_pago,
          periodo_desde, periodo_hasta, creado_en)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      data.socioId,
      data.monto,
      data.metodo,
      data.planId,
      data.fechaPago,
      data.periodoDesde,
      data.periodoHasta,
      new Date().toISOString(),
    );

    const creado = dbGet<PagoRow>(
      "SELECT * FROM pagos WHERE id = ?",
      Number(resultado.lastInsertRowid),
    );
    if (!creado) throw new Error("No se pudo registrar el pago");
    return mapear(creado);
  },

  findBySocio(socioId: number): Pago[] {
    return dbAll<PagoRow>(
      "SELECT * FROM pagos WHERE socio_id = ? ORDER BY fecha_pago DESC",
      socioId,
    ).map(mapear);
  },

  /** Pagos de una fecha concreta, con datos del socio (para el cierre del día). */
  findByFecha(fechaISO: string): PagoConSocio[] {
    const rows = dbAll<PagoConSocioRow>(
      `SELECT p.*, s.nombre AS socio_nombre, s.apellido AS socio_apellido,
              s.dni AS socio_dni
       FROM pagos p
       JOIN socios s ON s.id = p.socio_id
       WHERE p.fecha_pago = ?
       ORDER BY p.creado_en DESC`,
      fechaISO,
    );

    return rows.map((row) => ({
      ...mapear(row),
      socioNombre: row.socio_nombre,
      socioApellido: row.socio_apellido,
      socioDni: row.socio_dni,
    }));
  },

  /** Total recaudado en una fecha. */
  totalPorFecha(fechaISO: string): number {
    const fila = dbGet<{ total: number }>(
      "SELECT COALESCE(SUM(monto), 0) AS total FROM pagos WHERE fecha_pago = ?",
      fechaISO,
    );
    return fila?.total ?? 0;
  },
};
