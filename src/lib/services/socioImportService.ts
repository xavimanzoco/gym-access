import { socioRepository } from "@/lib/repositories/socioRepository";
import { ValidationError } from "@/lib/errors/AppError";
import { leerPrimeraHoja } from "@/lib/services/import/xlsx";
import {
  analizarPlanilla,
  MOTIVOS_REPETIDO,
  type FilaDescartada,
  type FilaImportada,
} from "@/lib/services/import/socioMapper";

/**
 * Importación de socios desde una planilla de Excel.
 *
 * Se hace en dos pasos: primero `analizar()` devuelve la vista previa (qué se
 * cargaría y qué se descarta) y después `confirmar()` inserta. Así el usuario
 * ve cómo quedó interpretada la planilla antes de escribir en la base.
 */

export interface VistaPreviaImport {
  /** Socios que se van a dar de alta. */
  aImportar: FilaImportada[];
  /**
   * Filas salteadas porque el socio ya está (mismo DNI repetido en la planilla
   * o ya cargado en el sistema). Se muestran aparte, en su propio aviso.
   */
  repetidas: FilaDescartada[];
  /** Filas salteadas por otros motivos (hoy: sin nombre). */
  descartadas: FilaDescartada[];
  /** Cuántos de los que entran no traen DNI (no podrán usar el molinete). */
  sinDni: number;
}

/** Tope de filas por planilla: corta un archivo gigante antes de procesarlo. */
const MAX_FILAS = 20_000;

function leer(archivo: Buffer): VistaPreviaImport {
  let matriz;
  try {
    matriz = leerPrimeraHoja(archivo);
  } catch (error) {
    const detalle = error instanceof Error ? error.message : "formato ilegible";
    throw new ValidationError(
      `No se pudo leer la planilla (${detalle}). Guardala como .xlsx e intentá de nuevo.`,
    );
  }

  if (matriz.length > MAX_FILAS) {
    throw new ValidationError(
      `La planilla tiene demasiadas filas (máximo ${MAX_FILAS}).`,
    );
  }

  const analisis = analizarPlanilla(matriz, socioRepository.dnisExistentes());
  const esRepetido = (f: FilaDescartada) =>
    MOTIVOS_REPETIDO.includes(f.motivo);

  return {
    aImportar: analisis.aImportar,
    repetidas: analisis.descartadas.filter(esRepetido),
    descartadas: analisis.descartadas.filter((f) => !esRepetido(f)),
    sinDni: analisis.aImportar.filter((f) => !f.dni).length,
  };
}

export const socioImportService = {
  /** Interpreta la planilla sin tocar la base. */
  analizar(archivo: Buffer): VistaPreviaImport {
    return leer(archivo);
  },

  /**
   * Vuelve a analizar la planilla y da de alta las filas válidas.
   *
   * Se relee en vez de confiar en la vista previa que devolvió el navegador:
   * los datos que decide qué se inserta nunca vienen del cliente, y además
   * puede haber cambiado la base entre la vista previa y la confirmación.
   */
  confirmar(archivo: Buffer): {
    importados: number;
    repetidos: number;
    descartados: number;
  } {
    const { aImportar, repetidas, descartadas } = leer(archivo);

    if (aImportar.length === 0) {
      throw new ValidationError(
        "La planilla no tiene ninguna fila con nombre para importar.",
      );
    }

    const importados = socioRepository.createMany(
      aImportar.map((fila) => ({
        dni: fila.dni,
        nombre: fila.nombre,
        apellido: fila.apellido,
        telefono: fila.telefono,
        email: fila.email,
        fechaNacimiento: fila.fechaNacimiento,
        planId: null,
        activo: true,
      })),
    );

    return {
      importados,
      repetidos: repetidas.length,
      descartados: descartadas.length,
    };
  },
};
