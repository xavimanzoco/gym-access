import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

import { leerPrimeraHoja } from "../src/lib/services/import/xlsx.ts";
import { analizarPlanilla } from "../src/lib/services/import/socioMapper.ts";

/**
 * Pruebas de la importación de socios desde Excel.
 *
 * Correr con:  node --experimental-strip-types --test tests/
 *
 * El caso de la planilla real usa `tests/fixtures/datos-gym.xlsx` (la planilla
 * que trajo el gimnasio). Si el archivo no está, ese test se saltea.
 */

test("analizarPlanilla: guarda el nombre completo sin intentar partirlo", () => {
  const { aImportar } = analizarPlanilla([
    ["Nombre y Apellido"],
    // Apellido compuesto: partirlo daría "Bernarda Bua" / "Camilletti".
    ["Bernarda Bua Camilletti"],
    ["Maria Eugenia Hamann"],
    ["Julieta del Valle"],
  ]);

  assert.deepEqual(
    aImportar.map((f) => f.nombre),
    ["Bernarda Bua Camilletti", "Maria Eugenia Hamann", "Julieta del Valle"],
  );
  assert.ok(
    aImportar.every((f) => f.apellido === ""),
    "con una sola columna el apellido queda vacío",
  );
});

test("analizarPlanilla: 'Apellido y Nombre' tambien se guarda entero", () => {
  const { aImportar } = analizarPlanilla([
    ["Apellido y Nombre", "DNI"],
    ["Simadone Manuela", "40457140"],
  ]);

  assert.equal(aImportar[0].nombre, "Simadone Manuela");
  assert.equal(aImportar[0].apellido, "");
});

test("analizarPlanilla: sólo el nombre es obligatorio", () => {
  const { aImportar, descartadas } = analizarPlanilla([
    ["Nombre y Apellido", "Teléfono", "DNI"],
    ["Pilar Russo", "-", ""],
  ]);

  assert.equal(descartadas.length, 0);
  assert.equal(aImportar.length, 1);
  assert.deepEqual(aImportar[0], {
    fila: 2,
    nombre: "Pilar Russo",
    apellido: "",
    dni: null,
    telefono: null,
    email: null,
    fechaNacimiento: null,
  });
});

test("analizarPlanilla: descarta la fila sin nombre", () => {
  const { aImportar, descartadas } = analizarPlanilla([
    ["Nombre y Apellido", "Teléfono", "DNI"],
    ["", "2477 554514", "44888001"],
  ]);

  assert.equal(aImportar.length, 0);
  assert.equal(descartadas.length, 1);
  assert.equal(descartadas[0].motivo, "SIN_NOMBRE");
});

test("analizarPlanilla: ignora filas totalmente vacías sin reportarlas", () => {
  const { aImportar, descartadas } = analizarPlanilla([
    ["Nombre y Apellido"],
    ["Ana Gomez"],
    ["", "", ""],
    [],
  ]);

  assert.equal(aImportar.length, 1);
  assert.equal(descartadas.length, 0);
});

test("analizarPlanilla: normaliza el DNI con puntos y espacios", () => {
  const { aImportar } = analizarPlanilla([
    ["Nombre", "DNI"],
    ["Ana", "44.888.001"],
    ["Luis", "39 346 921"],
  ]);

  assert.deepEqual(
    aImportar.map((f) => f.dni),
    ["44888001", "39346921"],
  );
});

test("analizarPlanilla: un DNI ilegible no descarta la fila, queda en null", () => {
  const { aImportar, descartadas } = analizarPlanilla([
    ["Nombre", "DNI"],
    ["Ana", "no tiene"],
  ]);

  assert.equal(descartadas.length, 0);
  assert.equal(aImportar[0].dni, null);
});

test("analizarPlanilla: descarta el DNI repetido dentro de la planilla", () => {
  const { aImportar, descartadas } = analizarPlanilla([
    ["Nombre", "DNI"],
    ["Ana", "44888001"],
    ["Ana bis", "44888001"],
  ]);

  assert.equal(aImportar.length, 1);
  assert.equal(descartadas.length, 1);
  assert.equal(descartadas[0].motivo, "DNI_REPETIDO_EN_PLANILLA");
});

test("analizarPlanilla: el repetido apunta a la fila con la que choca", () => {
  const { descartadas } = analizarPlanilla([
    ["Nombre y Apellido", "DNI"],
    ["Haide Gofoy", "16039716"],
    ["Haidee Godoy", "16039716"],
  ]);

  assert.equal(descartadas.length, 1);
  assert.deepEqual(descartadas[0], {
    fila: 3,
    nombre: "Haidee Godoy",
    dni: "16039716",
    motivo: "DNI_REPETIDO_EN_PLANILLA",
    duplicadoDe: { fila: 2, nombre: "Haide Gofoy" },
  });
});

test("analizarPlanilla: el que ya está en la base no trae duplicadoDe", () => {
  const { descartadas } = analizarPlanilla(
    [
      ["Nombre y Apellido", "DNI"],
      ["Antonella Bocanera", "36494736"],
    ],
    new Set(["36494736"]),
  );

  assert.equal(descartadas[0].motivo, "DNI_YA_CARGADO");
  assert.equal(descartadas[0].duplicadoDe, undefined);
});

test("analizarPlanilla: descarta el DNI que ya está en la base", () => {
  const { aImportar, descartadas } = analizarPlanilla(
    [
      ["Nombre", "DNI"],
      ["Ana", "44888001"],
    ],
    new Set(["44888001"]),
  );

  assert.equal(aImportar.length, 0);
  assert.equal(descartadas[0].motivo, "DNI_YA_CARGADO");
});

test("analizarPlanilla: varias filas sin DNI conviven sin chocar", () => {
  const { aImportar, descartadas } = analizarPlanilla([
    ["Nombre y Apellido"],
    ["Pilar Russo"],
    ["Barbara Castelli"],
  ]);

  assert.equal(aImportar.length, 2);
  assert.equal(descartadas.length, 0);
});

test("analizarPlanilla: trata '-' y 's/d' como dato ausente", () => {
  const { aImportar } = analizarPlanilla([
    ["Nombre", "Teléfono", "Email"],
    ["Ana", "-", "s/d"],
  ]);

  assert.equal(aImportar[0].telefono, null);
  assert.equal(aImportar[0].email, null);
});

test("analizarPlanilla: usa columnas separadas de nombre y apellido", () => {
  const { aImportar } = analizarPlanilla([
    ["Apellido", "Nombre", "DNI"],
    ["Cardoso", "Eric", "39346921"],
  ]);

  assert.equal(aImportar[0].nombre, "Eric");
  assert.equal(aImportar[0].apellido, "Cardoso");
});

test("analizarPlanilla: sin encabezados asume nombre, teléfono, DNI", () => {
  const { aImportar, descartadas } = analizarPlanilla([
    ["Eric Cardoso", "2477 554514", "39346921"],
  ]);

  assert.equal(descartadas.length, 0);
  assert.deepEqual(aImportar[0], {
    fila: 1,
    nombre: "Eric Cardoso",
    apellido: "",
    dni: "39346921",
    telefono: "2477 554514",
    email: null,
    fechaNacimiento: null,
  });
});

test("analizarPlanilla: convierte la fecha de nacimiento a ISO", () => {
  const { aImportar } = analizarPlanilla([
    ["Nombre", "Fecha de nacimiento"],
    ["Ana", "05/03/1990"],
    ["Luis", "1990-03-05"],
    // 32874 es el número de serie de Excel para 1990-01-01.
    ["Eva", "32874"],
  ]);

  assert.equal(aImportar[0].fechaNacimiento, "1990-03-05");
  assert.equal(aImportar[1].fechaNacimiento, "1990-03-05");
  assert.equal(aImportar[2].fechaNacimiento, "1990-01-01");
});

/**
 * Caso real: la planilla que trajo el gimnasio tiene 100 filas con nombre, de
 * las cuales 10 son la misma persona cargada dos veces con el nombre mal escrito
 * (mismo DNI y mismo teléfono: "Haide Gofoy" / "Haidee Godoy", "Juliana Golia" /
 * "Golia Juliana", …). El import las deduplica por DNI y quedan 90 socios.
 */
test("planilla real del gimnasio: 90 socios, 10 duplicados, 1 sin DNI", (t) => {
  const ruta = join(import.meta.dirname, "fixtures", "datos-gym.xlsx");

  let buffer: Buffer;
  try {
    buffer = readFileSync(ruta);
  } catch {
    t.skip("falta tests/fixtures/datos-gym.xlsx");
    return;
  }

  const matriz = leerPrimeraHoja(buffer);
  assert.deepEqual(matriz[0], ["Nombre y Apellido", "Teléfono", "DNI"]);

  const { aImportar, descartadas } = analizarPlanilla(matriz);

  assert.equal(aImportar.length, 90);
  assert.equal(descartadas.length, 10);
  assert.ok(
    descartadas.every((d) => d.motivo === "DNI_REPETIDO_EN_PLANILLA"),
    "los 10 descartes deben ser por DNI repetido",
  );

  const bernarda = aImportar[0];
  // El DNI viene en notación científica (4.4888001E7) y debe quedar en dígitos.
  assert.equal(bernarda.dni, "44888001");
  assert.equal(bernarda.telefono, "2477 554514");
  // El nombre queda entero, sin inventar dónde corta el apellido.
  assert.equal(bernarda.nombre, "Bernarda Bua Camilletti");
  assert.equal(bernarda.apellido, "");

  // Pilar Russo no tiene DNI en la planilla y entra igual, con `dni: null`.
  const sinDni = aImportar.filter((f) => !f.dni);
  assert.equal(sinDni.length, 1);
  assert.equal(sinDni[0].nombre, "Pilar Russo");

  // Todos los repetidos de esta planilla son choques internos, así que cada uno
  // tiene que poder señalar con qué fila choca (es lo que muestra el aviso).
  assert.ok(
    descartadas.every((d) => d.duplicadoDe !== undefined),
    "cada repetido debe apuntar a su fila original",
  );
});
