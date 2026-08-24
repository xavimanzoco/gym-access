import type { Matriz } from "./xlsx.ts";

/**
 * Traduce la matriz de una planilla a socios listos para dar de alta.
 *
 * Es deliberadamente permisivo: la única condición para importar una fila es
 * que tenga nombre. Todo lo demás (DNI incluido) es opcional — si falta o no se
 * entiende, se guarda en `null` en vez de descartar la fila.
 *
 * Función pura: no toca la base ni el sistema de archivos, así que se puede
 * probar con matrices armadas a mano.
 */

/** Fila de la planilla ya interpretada como socio. */
export interface FilaImportada {
  /** Número de fila en la planilla (1-based), para poder señalarla en la UI. */
  fila: number;
  nombre: string;
  apellido: string;
  dni: string | null;
  telefono: string | null;
  email: string | null;
  fechaNacimiento: string | null;
}

export type MotivoDescarte =
  | "SIN_NOMBRE"
  | "DNI_REPETIDO_EN_PLANILLA"
  | "DNI_YA_CARGADO";

/** Motivos que significan "este socio ya está": los que van al aviso de repetidos. */
export const MOTIVOS_REPETIDO: MotivoDescarte[] = [
  "DNI_REPETIDO_EN_PLANILLA",
  "DNI_YA_CARGADO",
];

/** Fila que no se va a importar, con el motivo para mostrarlo al usuario. */
export interface FilaDescartada {
  fila: number;
  /** Nombre tal como figura en la planilla, para reconocer la fila. */
  nombre: string;
  /** DNI normalizado, si se pudo leer. */
  dni: string | null;
  motivo: MotivoDescarte;
  /**
   * Fila de la planilla con la que choca, cuando el DNI está repetido dentro
   * del mismo archivo. Sirve para mostrar los dos nombres enfrentados y que se
   * vea cuál de los dos está mal escrito.
   */
  duplicadoDe?: { fila: number; nombre: string };
}

/** Qué columna de la planilla se interpretó como cada campo (0-based). */
export interface ColumnasDetectadas {
  nombre: number | null;
  apellido: number | null;
  /** Columna con nombre y apellido juntos, si vienen en una sola. */
  nombreCompleto: number | null;
  dni: number | null;
  telefono: number | null;
  email: number | null;
  fechaNacimiento: number | null;
}

export interface ResultadoAnalisis {
  columnas: ColumnasDetectadas;
  /** Fila (1-based) donde estaban los encabezados, o `null` si no se detectaron. */
  filaEncabezado: number | null;
  aImportar: FilaImportada[];
  descartadas: FilaDescartada[];
}

/** Quita acentos y pasa a minúsculas, para comparar encabezados sin sorpresas. */
function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}


/** Variantes de encabezado aceptadas para cada campo. */
const ENCABEZADOS = {
  // Columnas que traen el nombre entero en una sola celda, en cualquier orden:
  // el contenido se guarda tal cual, así que da igual si el apellido va primero.
  nombreCompleto: [
    "nombre y apellido",
    "nombre completo",
    "nombres y apellidos",
    "socio",
    "nombre y apellidos",
    "apellido y nombre",
    "apellidos y nombres",
    "apellido, nombre",
  ],
  nombre: ["nombre", "nombres"],
  apellido: ["apellido", "apellidos"],
  dni: ["dni", "documento", "doc", "nro documento", "numero de documento", "cuil"],
  telefono: [
    "telefono",
    "tel",
    "celular",
    "cel",
    "movil",
    "whatsapp",
    "contacto",
  ],
  email: ["email", "e-mail", "mail", "correo", "correo electronico"],
  fechaNacimiento: [
    "fecha de nacimiento",
    "fecha nacimiento",
    "nacimiento",
    "f. nacimiento",
    "fec nac",
    "cumpleanos",
  ],
} as const;

function coincide(encabezado: string, variantes: readonly string[]): boolean {
  return variantes.includes(encabezado);
}

/** Busca la fila de encabezados: la primera que menciona algún campo conocido. */
function detectarEncabezado(matriz: Matriz): number | null {
  const limite = Math.min(matriz.length, 20);
  for (let i = 0; i < limite; i++) {
    const celdas = (matriz[i] ?? []).map(normalizar);
    const tieneNombre = celdas.some(
      (c) =>
        coincide(c, ENCABEZADOS.nombreCompleto) ||
        coincide(c, ENCABEZADOS.nombre) ||
        coincide(c, ENCABEZADOS.apellido),
    );
    if (tieneNombre) return i;
  }
  return null;
}

/** Asocia cada columna de la fila de encabezados con un campo del socio. */
function detectarColumnas(encabezados: string[]): ColumnasDetectadas {
  const cols: ColumnasDetectadas = {
    nombre: null,
    apellido: null,
    nombreCompleto: null,
    dni: null,
    telefono: null,
    email: null,
    fechaNacimiento: null,
  };

  encabezados.forEach((crudo, i) => {
    const h = normalizar(crudo);
    if (!h) return;

    // El orden importa: "nombre y apellido" debe ganarle a "nombre".
    if (
      cols.nombreCompleto === null &&
      coincide(h, ENCABEZADOS.nombreCompleto)
    ) {
      cols.nombreCompleto = i;
    } else if (cols.nombre === null && coincide(h, ENCABEZADOS.nombre)) {
      cols.nombre = i;
    } else if (cols.apellido === null && coincide(h, ENCABEZADOS.apellido)) {
      cols.apellido = i;
    } else if (cols.dni === null && coincide(h, ENCABEZADOS.dni)) {
      cols.dni = i;
    } else if (cols.telefono === null && coincide(h, ENCABEZADOS.telefono)) {
      cols.telefono = i;
    } else if (cols.email === null && coincide(h, ENCABEZADOS.email)) {
      cols.email = i;
    } else if (
      cols.fechaNacimiento === null &&
      coincide(h, ENCABEZADOS.fechaNacimiento)
    ) {
      cols.fechaNacimiento = i;
    }
  });

  return cols;
}

/**
 * Sin encabezados reconocibles, asume el orden más común de estas planillas:
 * nombre completo, teléfono, DNI.
 */
const COLUMNAS_POR_DEFECTO: ColumnasDetectadas = {
  nombre: null,
  apellido: null,
  nombreCompleto: 0,
  dni: 2,
  telefono: 1,
  email: null,
  fechaNacimiento: null,
};

function celda(fila: string[], indice: number | null): string {
  if (indice === null) return "";
  return (fila[indice] ?? "").trim();
}

/** Marcadores que la gente escribe para "no tengo el dato". */
const VACIOS = new Set(["-", "--", "s/d", "sd", "n/a", "na", "sin datos", "?"]);

function textoOpcional(valor: string): string | null {
  const limpio = valor.trim();
  if (!limpio || VACIOS.has(normalizar(limpio))) return null;
  return limpio;
}

/**
 * Normaliza un DNI: se queda con los dígitos (tolera puntos, espacios y
 * guiones). Si no quedan al menos 6, se descarta el dato — no la fila.
 */
function normalizarDni(valor: string): string | null {
  const texto = textoOpcional(valor);
  if (!texto) return null;
  const digitos = texto.replace(/\D/g, "");
  return digitos.length >= 6 ? digitos : null;
}

/** Día 0 del calendario de Excel: 1899-12-30 (compensa el bug del año 1900). */
const EPOCA_EXCEL = Date.UTC(1899, 11, 30);
const MS_POR_DIA = 86_400_000;

/**
 * Convierte una fecha de nacimiento a ISO `YYYY-MM-DD`.
 * Acepta el número de serie de Excel, ISO, y `dd/mm/aaaa` (formato local).
 */
function normalizarFecha(valor: string): string | null {
  const texto = textoOpcional(valor);
  if (!texto) return null;

  if (/^\d+(\.\d+)?$/.test(texto)) {
    const serie = Number(texto);
    // Rango razonable: 1900-01-01 hasta 9999-12-31 en serie de Excel.
    if (serie >= 1 && serie <= 2_958_465) {
      return new Date(EPOCA_EXCEL + serie * MS_POR_DIA)
        .toISOString()
        .slice(0, 10);
    }
    return null;
  }

  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(texto);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  const local = /^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/.exec(texto);
  if (local) {
    const [, d, m, a] = local;
    const anio = a.length === 2 ? `19${a}` : a.padStart(4, "0");
    return `${anio}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }

  return null;
}

/**
 * Analiza la planilla y devuelve qué se importaría y qué se descarta.
 *
 * @param dnisExistentes DNIs ya cargados en la base, para no duplicar socios.
 */
export function analizarPlanilla(
  matriz: Matriz,
  dnisExistentes: Set<string> = new Set(),
): ResultadoAnalisis {
  const indiceEncabezado = detectarEncabezado(matriz);
  const columnas =
    indiceEncabezado === null
      ? COLUMNAS_POR_DEFECTO
      : detectarColumnas(matriz[indiceEncabezado] ?? []);

  const aImportar: FilaImportada[] = [];
  const descartadas: FilaDescartada[] = [];
  /** DNI ya visto en la planilla -> fila y nombre donde apareció primero. */
  const vistos = new Map<string, { fila: number; nombre: string }>();

  const desde = indiceEncabezado === null ? 0 : indiceEncabezado + 1;

  for (let i = desde; i < matriz.length; i++) {
    const fila = matriz[i] ?? [];
    const numeroFila = i + 1;

    // Una fila totalmente vacía es relleno de la planilla: se ignora en silencio.
    if (fila.every((c) => !c.trim())) continue;

    let nombre: string;
    let apellido: string;

    if (columnas.nombreCompleto !== null) {
      // El nombre viene entero en una celda y se guarda tal cual. No se intenta
      // adivinar dónde termina el nombre y arranca el apellido: con apellidos y
      // nombres compuestos ("Bernarda Bua Camilletti") no hay forma de acertar,
      // y partirlo mal deja el padrón peor que dejarlo completo.
      nombre = celda(fila, columnas.nombreCompleto);
      apellido = "";
    } else {
      nombre = celda(fila, columnas.nombre);
      apellido = celda(fila, columnas.apellido);
    }

    // Único requisito real: que la fila tenga nombre.
    if (!nombre.trim() && !apellido.trim()) {
      descartadas.push({
        fila: numeroFila,
        nombre: "",
        dni: normalizarDni(celda(fila, columnas.dni)),
        motivo: "SIN_NOMBRE",
      });
      continue;
    }
    // Si sólo vino apellido, se usa como nombre: `nombre` es NOT NULL.
    if (!nombre.trim()) {
      nombre = apellido;
      apellido = "";
    }

    nombre = nombre.trim();
    apellido = apellido.trim();
    const completo = apellido ? `${nombre} ${apellido}` : nombre;
    const dni = normalizarDni(celda(fila, columnas.dni));

    const previo = dni ? vistos.get(dni) : undefined;
    if (previo) {
      descartadas.push({
        fila: numeroFila,
        nombre: completo,
        dni,
        motivo: "DNI_REPETIDO_EN_PLANILLA",
        duplicadoDe: previo,
      });
      continue;
    }
    if (dni && dnisExistentes.has(dni)) {
      descartadas.push({
        fila: numeroFila,
        nombre: completo,
        dni,
        motivo: "DNI_YA_CARGADO",
      });
      continue;
    }
    if (dni) vistos.set(dni, { fila: numeroFila, nombre: completo });

    aImportar.push({
      fila: numeroFila,
      nombre,
      apellido,
      dni,
      telefono: textoOpcional(celda(fila, columnas.telefono)),
      email: textoOpcional(celda(fila, columnas.email)),
      fechaNacimiento: normalizarFecha(celda(fila, columnas.fechaNacimiento)),
    });
  }

  return {
    columnas,
    filaEncabezado: indiceEncabezado === null ? null : indiceEncabezado + 1,
    aImportar,
    descartadas,
  };
}
