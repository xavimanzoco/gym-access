import { dbAll, dbGet, dbRun } from "@/lib/db/client";
import type { Acceso, MotivoAcceso } from "@/types";

interface AccesoRow {
  id: number;
  socio_id: number | null;
  dni_ingresado: string;
  permitido: number;
  motivo: string;
  fecha_hora: string;
}

interface AccesoConSocioRow extends AccesoRow {
  socio_nombre: string | null;
  socio_apellido: string | null;
}

/** Registro de acceso enriquecido con el nombre del socio (si existe). */
export interface AccesoConSocio extends Acceso {
  socioNombre: string | null;
  socioApellido: string | null;
}

export interface CrearAccesoData {
  socioId: number | null;
  dniIngresado: string;
  permitido: boolean;
  motivo: MotivoAcceso;
}

function mapear(row: AccesoRow): Acceso {
  return {
    id: row.id,
    socioId: row.socio_id,
    dniIngresado: row.dni_ingresado,
    permitido: Boolean(row.permitido),
    motivo: row.motivo as MotivoAcceso,
    fechaHora: row.fecha_hora,
  };
}

export const accesoRepository = {
  create(data: CrearAccesoData): Acceso {
    const resultado = dbRun(
      `INSERT INTO accesos (socio_id, dni_ingresado, permitido, motivo, fecha_hora)
       VALUES (?, ?, ?, ?, ?)`,
      data.socioId,
      data.dniIngresado,
      data.permitido ? 1 : 0,
      data.motivo,
      new Date().toISOString(),
    );

    const creado = dbGet<AccesoRow>(
      "SELECT * FROM accesos WHERE id = ?",
      Number(resultado.lastInsertRowid),
    );
    if (!creado) throw new Error("No se pudo registrar el acceso");
    return mapear(creado);
  },

  /** Últimos accesos registrados, con nombre del socio (para el panel en vivo). */
  recientes(limite = 20): AccesoConSocio[] {
    const rows = dbAll<AccesoConSocioRow>(
      `SELECT a.*, s.nombre AS socio_nombre, s.apellido AS socio_apellido
       FROM accesos a
       LEFT JOIN socios s ON s.id = a.socio_id
       ORDER BY a.fecha_hora DESC
       LIMIT ?`,
      limite,
    );

    return rows.map((row) => ({
      ...mapear(row),
      socioNombre: row.socio_nombre,
      socioApellido: row.socio_apellido,
    }));
  },

  /** Cantidad de ingresos permitidos en una fecha. */
  contarPermitidosPorFecha(fechaISO: string): number {
    const fila = dbGet<{ n: number }>(
      `SELECT COUNT(*) AS n FROM accesos
       WHERE permitido = 1 AND substr(fecha_hora, 1, 10) = ?`,
      fechaISO,
    );
    return fila?.n ?? 0;
  },
};
