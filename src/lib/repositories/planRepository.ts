import { dbAll, dbGet } from "@/lib/db/client";
import type { Plan } from "@/types";

interface PlanRow {
  id: number;
  nombre: string;
  precio: number;
  dias_duracion: number;
  activo: number;
}

function mapear(row: PlanRow): Plan {
  return {
    id: row.id,
    nombre: row.nombre,
    precio: row.precio,
    diasDuracion: row.dias_duracion,
    activo: Boolean(row.activo),
  };
}

export const planRepository = {
  findAll(): Plan[] {
    return dbAll<PlanRow>(
      "SELECT * FROM planes ORDER BY dias_duracion ASC",
    ).map(mapear);
  },

  findById(id: number): Plan | null {
    const row = dbGet<PlanRow>("SELECT * FROM planes WHERE id = ?", id);
    return row ? mapear(row) : null;
  },

  findByNombre(nombre: string): Plan | null {
    const row = dbGet<PlanRow>("SELECT * FROM planes WHERE nombre = ?", nombre);
    return row ? mapear(row) : null;
  },
};
