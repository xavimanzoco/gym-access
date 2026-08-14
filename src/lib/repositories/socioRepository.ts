import { dbAll, dbGet, dbRun } from "@/lib/db/client";
import { hoyISO } from "@/lib/utils";
import type { Socio } from "@/types";

interface SocioRow {
  id: number;
  dni: string;
  nombre: string;
  apellido: string;
  telefono: string | null;
  email: string | null;
  fecha_nacimiento: string | null;
  plan_id: number | null;
  vencimiento: string | null;
  activo: number;
  fecha_alta: string;
  creado_en: string;
  actualizado_en: string;
}

/** Datos para dar de alta un socio (sin campos calculados ni ids). */
export interface CrearSocioData {
  dni: string;
  nombre: string;
  apellido: string;
  telefono: string | null;
  email: string | null;
  fechaNacimiento: string | null;
  planId: number | null;
  activo: boolean;
}

/** Datos editables de un socio. El DNI no se modifica (es la credencial). */
export interface ActualizarSocioData {
  nombre: string;
  apellido: string;
  telefono: string | null;
  email: string | null;
  fechaNacimiento: string | null;
  planId: number | null;
  activo: boolean;
}

function mapear(row: SocioRow): Socio {
  return {
    id: row.id,
    dni: row.dni,
    nombre: row.nombre,
    apellido: row.apellido,
    telefono: row.telefono,
    email: row.email,
    fechaNacimiento: row.fecha_nacimiento,
    planId: row.plan_id,
    vencimiento: row.vencimiento,
    activo: Boolean(row.activo),
    fechaAlta: row.fecha_alta,
    creadoEn: row.creado_en,
    actualizadoEn: row.actualizado_en,
  };
}

export const socioRepository = {
  findAll(): Socio[] {
    return dbAll<SocioRow>(
      "SELECT * FROM socios ORDER BY apellido, nombre",
    ).map(mapear);
  },

  findById(id: number): Socio | null {
    const row = dbGet<SocioRow>("SELECT * FROM socios WHERE id = ?", id);
    return row ? mapear(row) : null;
  },

  findByDni(dni: string): Socio | null {
    const row = dbGet<SocioRow>("SELECT * FROM socios WHERE dni = ?", dni);
    return row ? mapear(row) : null;
  },

  /** Busca por DNI, nombre o apellido (coincidencia parcial). */
  buscar(termino: string): Socio[] {
    const patron = `%${termino}%`;
    return dbAll<SocioRow>(
      `SELECT * FROM socios
       WHERE dni LIKE ? OR nombre LIKE ? OR apellido LIKE ?
       ORDER BY apellido, nombre`,
      patron,
      patron,
      patron,
    ).map(mapear);
  },

  create(data: CrearSocioData): Socio {
    const ahora = new Date().toISOString();
    const resultado = dbRun(
      `INSERT INTO socios
         (dni, nombre, apellido, telefono, email, fecha_nacimiento,
          plan_id, vencimiento, activo, fecha_alta, creado_en, actualizado_en)
       VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?)`,
      data.dni,
      data.nombre,
      data.apellido,
      data.telefono,
      data.email,
      data.fechaNacimiento,
      data.planId,
      data.activo ? 1 : 0,
      hoyISO(),
      ahora,
      ahora,
    );

    const creado = this.findById(Number(resultado.lastInsertRowid));
    if (!creado) throw new Error("No se pudo crear el socio");
    return creado;
  },

  update(id: number, data: ActualizarSocioData): Socio | null {
    dbRun(
      `UPDATE socios SET
         nombre = ?, apellido = ?, telefono = ?, email = ?,
         fecha_nacimiento = ?, plan_id = ?, activo = ?, actualizado_en = ?
       WHERE id = ?`,
      data.nombre,
      data.apellido,
      data.telefono,
      data.email,
      data.fechaNacimiento,
      data.planId,
      data.activo ? 1 : 0,
      new Date().toISOString(),
      id,
    );
    return this.findById(id);
  },

  /** Invierte el estado activo/inactivo del socio. */
  alternarActivo(id: number): Socio | null {
    dbRun(
      "UPDATE socios SET activo = NOT activo, actualizado_en = ? WHERE id = ?",
      new Date().toISOString(),
      id,
    );
    return this.findById(id);
  },

  /** Actualiza el vencimiento de la cuota. Lo usa el registro de pagos. */
  actualizarVencimiento(id: number, vencimientoISO: string): void {
    dbRun(
      "UPDATE socios SET vencimiento = ?, actualizado_en = ? WHERE id = ?",
      vencimientoISO,
      new Date().toISOString(),
      id,
    );
  },

  delete(id: number): void {
    dbRun("DELETE FROM socios WHERE id = ?", id);
  },

  contarActivos(): number {
    const fila = dbGet<{ n: number }>(
      "SELECT COUNT(*) AS n FROM socios WHERE activo = 1",
    );
    return fila?.n ?? 0;
  },

  /** Socios activos cuya cuota está vencida (o nunca pagaron) a la fecha dada. */
  contarVencidos(hoy: string): number {
    const fila = dbGet<{ n: number }>(
      `SELECT COUNT(*) AS n FROM socios
       WHERE activo = 1 AND (vencimiento IS NULL OR vencimiento < ?)`,
      hoy,
    );
    return fila?.n ?? 0;
  },
};
