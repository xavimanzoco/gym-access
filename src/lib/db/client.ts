import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import {
  MIGRACION_DNI_OPCIONAL_SQL,
  PLANES_SEMILLA,
  SCHEMA_SQL,
} from "@/lib/db/schema";

/**
 * Cliente de la base de datos SQLite local (offline).
 *
 * Usa `node:sqlite`, el SQLite incorporado en Node — sin módulos nativos que
 * compilar. La base es un único archivo en disco; su ubicación se puede
 * cambiar con la variable de entorno `GYM_DB_PATH` (útil para que en la PC
 * del gimnasio apunte a una carpeta con permisos de escritura, ej. AppData).
 */

/** Ruta del archivo de base de datos. */
function resolverRutaDb(): string {
  if (process.env.GYM_DB_PATH) return process.env.GYM_DB_PATH;
  return join(process.cwd(), "data", "gym.db");
}

function crearConexion(): DatabaseSync {
  const ruta = resolverRutaDb();
  mkdirSync(dirname(ruta), { recursive: true });

  const db = new DatabaseSync(ruta);
  // WAL mejora concurrencia lectura/escritura; foreign_keys aplica los ON DELETE.
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA foreign_keys = ON;");

  inicializar(db);
  return db;
}

/**
 * Aplica las migraciones pendientes de bases creadas por versiones anteriores.
 * `CREATE TABLE IF NOT EXISTS` no toca una tabla que ya existe, así que los
 * cambios de esquema sobre bases en uso hay que hacerlos acá.
 */
function migrar(db: DatabaseSync): void {
  const columnas = db.prepare("PRAGMA table_info(socios)").all() as {
    name: string;
    notnull: number;
  }[];
  const dni = columnas.find((c) => c.name === "dni");

  if (dni?.notnull === 1) {
    // `PRAGMA foreign_keys` se ignora dentro de una transacción: hay que
    // desactivarlo antes de abrirla.
    db.exec("PRAGMA foreign_keys = OFF;");
    try {
      db.exec("BEGIN;");
      db.exec(MIGRACION_DNI_OPCIONAL_SQL);
      db.exec("COMMIT;");
    } catch (error) {
      db.exec("ROLLBACK;");
      throw error;
    } finally {
      db.exec("PRAGMA foreign_keys = ON;");
    }
  }
}

/** Crea las tablas (si no existen) y carga los planes semilla la primera vez. */
function inicializar(db: DatabaseSync): void {
  db.exec(SCHEMA_SQL);
  migrar(db);

  const { n } = db.prepare("SELECT COUNT(*) AS n FROM planes").get() as {
    n: number;
  };
  if (n === 0) {
    const insertar = db.prepare(
      "INSERT INTO planes (nombre, precio, dias_duracion, activo) VALUES (?, ?, ?, 1)",
    );
    for (const plan of PLANES_SEMILLA) {
      insertar.run(plan.nombre, plan.precio, plan.diasDuracion);
    }
  }
}

// Cacheamos la conexión en `globalThis` para no reabrir el archivo en cada
// recarga en caliente (HMR) durante el desarrollo.
const globalConDb = globalThis as typeof globalThis & {
  __gymDb?: DatabaseSync;
};

/** Devuelve la conexión única a la base de datos, creándola si hace falta. */
export function getDb(): DatabaseSync {
  if (!globalConDb.__gymDb) {
    globalConDb.__gymDb = crearConexion();
  }
  return globalConDb.__gymDb;
}

/** Valores admitidos como parámetros de una consulta. */
type Param = string | number | bigint | null | Uint8Array;

/**
 * Helpers tipados sobre `node:sqlite`. El driver devuelve filas genéricas
 * (`Record<string, ...>`); estos wrappers las presentan como el tipo de fila
 * concreto de cada repositorio, centralizando la conversión en un solo lugar.
 */
export function dbAll<T>(sql: string, ...params: Param[]): T[] {
  return getDb().prepare(sql).all(...params) as unknown as T[];
}

export function dbGet<T>(sql: string, ...params: Param[]): T | undefined {
  return getDb().prepare(sql).get(...params) as unknown as T | undefined;
}

export function dbRun(sql: string, ...params: Param[]) {
  return getDb().prepare(sql).run(...params);
}

/**
 * Ejecuta `fn` dentro de una transacción: si lanza, se revierte todo.
 * Necesario para las altas masivas (importación), donde no queremos quedar
 * con la mitad de los socios cargados.
 */
export function dbTransaction<T>(fn: () => T): T {
  const db = getDb();
  db.exec("BEGIN;");
  try {
    const resultado = fn();
    db.exec("COMMIT;");
    return resultado;
  } catch (error) {
    db.exec("ROLLBACK;");
    throw error;
  }
}
