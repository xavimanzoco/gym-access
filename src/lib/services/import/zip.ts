import { inflateRawSync } from "node:zlib";

/**
 * Lector mínimo de archivos ZIP (sólo lo que necesita un `.xlsx`).
 *
 * Un `.xlsx` es un ZIP con XML adentro. En vez de sumar una dependencia
 * (SheetJS arrastra vulnerabilidades sin fix en npm), leemos el contenedor a
 * mano: alcanza con soportar los dos métodos de compresión que usan Excel,
 * LibreOffice y Google Sheets — `stored` (0) y `deflate` (8).
 */

const FIRMA_EOCD = 0x06054b50; // fin del directorio central
const FIRMA_ENTRADA = 0x02014b50; // entrada del directorio central
const FIRMA_LOCAL = 0x04034b50; // cabecera local de un archivo

/** Tamaño máximo del comentario final del ZIP, que hay que saltear al buscar el EOCD. */
const MAX_COMENTARIO = 0xffff;

interface EntradaZip {
  nombre: string;
  metodo: number;
  tamanoComprimido: number;
  tamanoOriginal: number;
  offsetLocal: number;
}

/** Ubica el End Of Central Directory, que está al final salvo que haya comentario. */
function buscarEocd(buf: Buffer): number {
  const minimo = Math.max(0, buf.length - MAX_COMENTARIO - 22);
  for (let i = buf.length - 22; i >= minimo; i--) {
    if (buf.readUInt32LE(i) === FIRMA_EOCD) return i;
  }
  throw new Error("El archivo no es un ZIP válido (falta el EOCD)");
}

/** Lee el directorio central y devuelve las entradas indexadas por nombre. */
function leerEntradas(buf: Buffer): Map<string, EntradaZip> {
  const eocd = buscarEocd(buf);
  const cantidad = buf.readUInt16LE(eocd + 10);
  let offset = buf.readUInt32LE(eocd + 16);

  const entradas = new Map<string, EntradaZip>();
  for (let i = 0; i < cantidad; i++) {
    if (buf.readUInt32LE(offset) !== FIRMA_ENTRADA) {
      throw new Error("Directorio central del ZIP corrupto");
    }
    const largoNombre = buf.readUInt16LE(offset + 28);
    const largoExtra = buf.readUInt16LE(offset + 30);
    const largoComentario = buf.readUInt16LE(offset + 32);

    entradas.set(buf.toString("utf8", offset + 46, offset + 46 + largoNombre), {
      nombre: buf.toString("utf8", offset + 46, offset + 46 + largoNombre),
      metodo: buf.readUInt16LE(offset + 10),
      tamanoComprimido: buf.readUInt32LE(offset + 20),
      tamanoOriginal: buf.readUInt32LE(offset + 24),
      offsetLocal: buf.readUInt32LE(offset + 42),
    });

    offset += 46 + largoNombre + largoExtra + largoComentario;
  }
  return entradas;
}

/** Descomprime una entrada, saltando su cabecera local. */
function extraer(buf: Buffer, entrada: EntradaZip): Buffer {
  const base = entrada.offsetLocal;
  if (buf.readUInt32LE(base) !== FIRMA_LOCAL) {
    throw new Error(`Cabecera local inválida para ${entrada.nombre}`);
  }
  const largoNombre = buf.readUInt16LE(base + 26);
  const largoExtra = buf.readUInt16LE(base + 28);
  const inicio = base + 30 + largoNombre + largoExtra;
  const datos = buf.subarray(inicio, inicio + entrada.tamanoComprimido);

  if (entrada.metodo === 0) return Buffer.from(datos);
  if (entrada.metodo === 8) return inflateRawSync(datos);
  throw new Error(
    `Compresión no soportada (${entrada.metodo}) en ${entrada.nombre}`,
  );
}

/** Un ZIP ya abierto, del que se pueden leer archivos por nombre. */
export interface ArchivoZip {
  /** Devuelve el contenido de texto de un archivo, o `null` si no está. */
  leerTexto(nombre: string): string | null;
  /** Nombres de todos los archivos que contiene. */
  nombres(): string[];
}

export function abrirZip(buf: Buffer): ArchivoZip {
  const entradas = leerEntradas(buf);
  return {
    leerTexto(nombre) {
      const entrada = entradas.get(nombre);
      return entrada ? extraer(buf, entrada).toString("utf8") : null;
    },
    nombres() {
      return [...entradas.keys()];
    },
  };
}
