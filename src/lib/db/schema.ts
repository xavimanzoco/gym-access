/**
 * Definición del esquema de la base de datos SQLite.
 *
 * Las fechas se guardan como TEXT en formato ISO (`YYYY-MM-DD` para fechas,
 * ISO 8601 completo para timestamps). El orden lexicográfico de ISO coincide
 * con el cronológico, así que las comparaciones (`<`, `>`) funcionan directo.
 */
export const SCHEMA_SQL = /* sql */ `
CREATE TABLE IF NOT EXISTS planes (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre        TEXT    NOT NULL UNIQUE,
  precio        REAL    NOT NULL DEFAULT 0,
  dias_duracion INTEGER NOT NULL DEFAULT 30,
  activo        INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS socios (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  dni               TEXT    NOT NULL UNIQUE,
  nombre            TEXT    NOT NULL,
  apellido          TEXT    NOT NULL,
  telefono          TEXT,
  email             TEXT,
  fecha_nacimiento  TEXT,
  plan_id           INTEGER REFERENCES planes(id) ON DELETE SET NULL,
  vencimiento       TEXT,
  activo            INTEGER NOT NULL DEFAULT 1,
  fecha_alta        TEXT    NOT NULL,
  creado_en         TEXT    NOT NULL,
  actualizado_en    TEXT    NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_socios_dni ON socios(dni);

CREATE TABLE IF NOT EXISTS pagos (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  socio_id       INTEGER NOT NULL REFERENCES socios(id) ON DELETE CASCADE,
  monto          REAL    NOT NULL,
  metodo         TEXT    NOT NULL,
  plan_id        INTEGER REFERENCES planes(id) ON DELETE SET NULL,
  fecha_pago     TEXT    NOT NULL,
  periodo_desde  TEXT    NOT NULL,
  periodo_hasta  TEXT    NOT NULL,
  creado_en      TEXT    NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_pagos_socio ON pagos(socio_id);
CREATE INDEX IF NOT EXISTS idx_pagos_fecha ON pagos(fecha_pago);

CREATE TABLE IF NOT EXISTS accesos (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  socio_id       INTEGER REFERENCES socios(id) ON DELETE SET NULL,
  dni_ingresado  TEXT    NOT NULL,
  permitido      INTEGER NOT NULL,
  motivo         TEXT    NOT NULL,
  fecha_hora     TEXT    NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_accesos_fecha ON accesos(fecha_hora);
`;

/** Planes por defecto que se cargan la primera vez que se crea la base. */
export const PLANES_SEMILLA: {
  nombre: string;
  precio: number;
  diasDuracion: number;
}[] = [
  { nombre: "Mensual", precio: 15000, diasDuracion: 30 },
  { nombre: "Trimestral", precio: 40000, diasDuracion: 90 },
  { nombre: "Anual", precio: 140000, diasDuracion: 365 },
  { nombre: "Pase diario", precio: 2500, diasDuracion: 1 },
];
