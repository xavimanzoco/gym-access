// Import relativo (no `@/`) para que este módulo se pueda probar aislado,
// sin depender de la resolución de alias del bundler.
import { abrirZip } from "./zip.ts";

/**
 * Lectura de planillas `.xlsx` (OOXML) sin dependencias externas.
 *
 * Devuelve la primera hoja como una matriz de strings, respetando la posición
 * real de cada celda: las celdas vacías no aparecen en el XML, así que se
 * reconstruyen a partir de la referencia (`r="C16"`) para que las columnas no
 * se corran cuando falta un dato.
 */

/** Una hoja como matriz de filas; cada fila es un arreglo de celdas en texto. */
export type Matriz = string[][];

const ENTIDADES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
};

function desescapar(texto: string): string {
  return texto.replace(/&(?:#(\d+)|#[xX]([0-9a-fA-F]+)|(\w+));/g, (m, dec, hex, nombre) => {
    if (dec) return String.fromCodePoint(Number(dec));
    if (hex) return String.fromCodePoint(parseInt(hex, 16));
    return ENTIDADES[nombre] ?? m;
  });
}

/** Concatena todos los `<t>` de un fragmento (el texto enriquecido va en varios). */
function textoDe(fragmento: string): string {
  const partes = fragmento.match(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g) ?? [];
  return partes
    .map((p) => desescapar(p.replace(/^<t(?:\s[^>]*)?>/, "").replace(/<\/t>$/, "")))
    .join("");
}

/** Tabla de strings compartidos: las celdas de texto guardan un índice a ésta. */
function leerSharedStrings(xml: string | null): string[] {
  if (!xml) return [];
  const items = xml.match(/<si(?:\s[^>]*)?>[\s\S]*?<\/si>/g) ?? [];
  return items.map(textoDe);
}

/** "C" → 2, "AA" → 26 (índice de columna, base 0). */
function indiceColumna(letras: string): number {
  let n = 0;
  for (const ch of letras) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

/**
 * Normaliza el valor crudo de una celda numérica.
 *
 * Excel guarda los números en notación científica cuando son grandes
 * (`4.4888001E7`), que es justo el caso de los DNI. `Number` los interpreta
 * bien; el `String` posterior los devuelve en notación decimal.
 */
function normalizarNumero(crudo: string): string {
  const n = Number(crudo);
  if (!Number.isFinite(n)) return crudo.trim();
  return Number.isInteger(n) ? String(n) : String(n);
}

/** Extrae el valor de una celda según su tipo declarado en el atributo `t`. */
function valorCelda(
  atributos: string,
  cuerpo: string,
  compartidos: string[],
): string {
  const tipo = /\bt="([^"]+)"/.exec(atributos)?.[1] ?? "n";

  if (tipo === "inlineStr") return textoDe(cuerpo).trim();

  const v = /<v(?:\s[^>]*)?>([\s\S]*?)<\/v>/.exec(cuerpo)?.[1];
  if (v === undefined) return tipo === "s" ? "" : textoDe(cuerpo).trim();
  const crudo = desescapar(v);

  switch (tipo) {
    case "s": {
      const i = Number(crudo);
      return (Number.isInteger(i) ? compartidos[i] : undefined) ?? "";
    }
    case "b":
      return crudo === "1" ? "VERDADERO" : "FALSO";
    case "str":
    case "d":
    case "e":
      return crudo.trim();
    default:
      return normalizarNumero(crudo);
  }
}

/** Resuelve la ruta de la primera hoja del libro (no siempre es `sheet1.xml`). */
function rutaPrimeraHoja(
  workbook: string | null,
  rels: string | null,
): string | null {
  if (!workbook) return null;
  const rid = /<sheet\b[^>]*\br:id="([^"]+)"/.exec(workbook)?.[1];
  if (!rid || !rels) return null;

  const patron = new RegExp(
    `<Relationship\\b[^>]*\\bId="${rid}"[^>]*\\bTarget="([^"]+)"`,
  );
  const target = patron.exec(rels)?.[1];
  if (!target) return null;

  const limpio = target.replace(/^\/?xl\//, "").replace(/^\//, "");
  return `xl/${limpio}`;
}

/** Convierte el XML de una hoja en la matriz de celdas. */
function parsearHoja(xml: string, compartidos: string[]): Matriz {
  const filasXml =
    xml.match(/<row\b[^>]*>[\s\S]*?<\/row>|<row\b[^>]*\/>/g) ?? [];
  const matriz: Matriz = [];

  for (const filaXml of filasXml) {
    const numero = Number(/\br="(\d+)"/.exec(filaXml)?.[1] ?? 0);
    const celdas: string[] = [];

    const celdasXml =
      filaXml.match(/<c\b[^>]*>[\s\S]*?<\/c>|<c\b[^>]*\/>/g) ?? [];
    for (const celdaXml of celdasXml) {
      const atributos = /^<c\b([^>]*?)\/?>/.exec(celdaXml)?.[1] ?? "";
      const cuerpo = /^<c\b[^>]*>([\s\S]*)<\/c>$/.exec(celdaXml)?.[1] ?? "";
      const ref = /\br="([A-Z]+)\d+"/.exec(atributos)?.[1];

      const columna = ref ? indiceColumna(ref) : celdas.length;
      // Rellena los huecos: una celda vacía no se escribe en el XML.
      while (celdas.length < columna) celdas.push("");
      celdas[columna] = valorCelda(atributos, cuerpo, compartidos);
    }

    // Respeta el número de fila para no correr las filas salteadas.
    const indice = numero > 0 ? numero - 1 : matriz.length;
    while (matriz.length < indice) matriz.push([]);
    matriz[indice] = celdas;
  }

  return matriz;
}

/** Lee la primera hoja de un `.xlsx` y la devuelve como matriz de strings. */
export function leerPrimeraHoja(buffer: Buffer): Matriz {
  const zip = abrirZip(buffer);

  const compartidos = leerSharedStrings(zip.leerTexto("xl/sharedStrings.xml"));
  const ruta =
    rutaPrimeraHoja(
      zip.leerTexto("xl/workbook.xml"),
      zip.leerTexto("xl/_rels/workbook.xml.rels"),
    ) ?? "xl/worksheets/sheet1.xml";

  const hoja = zip.leerTexto(ruta) ?? zip.leerTexto("xl/worksheets/sheet1.xml");
  if (!hoja) throw new Error("La planilla no tiene hojas legibles");

  return parsearHoja(hoja, compartidos);
}
