import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

/**
 * Pruebas del cache de puerto del molinete.
 *
 * Correr con:  node --experimental-strip-types --test tests/
 *
 * `molineteController` habla con el hardware a través de `spawnSync`
 * (PowerShell/WMI), así que importarlo acá dispararía procesos reales. En vez
 * de instrumentar el módulo solo para las pruebas —código extra en el camino
 * del molinete, que es lo último que conviene tocar—, estas pruebas replican
 * su máquina de estados y, por separado, verifican sobre el archivo fuente que
 * las piezas de esa máquina sigan estando (`test` de coherencia al final).
 *
 * Lo que se cubre es la regresión que importa: que el puerto se detecte UNA vez
 * y no en cada apertura, sin perder la redetección al reenchufar el Pico.
 */

/** Réplica de la lógica de cache/reintento de `molineteController`. */
function crearMolinete(mundo: { puertoFisico: string | undefined }) {
  let puertoCacheado: string | undefined;
  const registro = { detecciones: 0, enviosOk: 0, enviosFallidos: 0 };

  const detectar = () => {
    registro.detecciones++;
    return mundo.puertoFisico;
  };
  const resolver = () => (puertoCacheado ??= detectar());
  const olvidar = () => {
    puertoCacheado = undefined;
  };

  /** Devuelve si había hardware; lanza si el puerto cacheado ya no responde. */
  async function intentarAbrir(): Promise<boolean> {
    const puerto = resolver();
    if (!puerto) return false; // modo simulado
    if (puerto !== mundo.puertoFisico) {
      registro.enviosFallidos++;
      throw new Error(`sin respuesta en ${puerto}`);
    }
    registro.enviosOk++;
    return true;
  }

  async function abrirMolinete(): Promise<void> {
    try {
      if (!(await intentarAbrir())) olvidar();
      return;
    } catch {
      olvidar();
    }
    try {
      await intentarAbrir();
    } catch {
      /* en el módulo real solo se registra en el log */
    }
  }

  return { abrirMolinete, registro, puertoActual: () => puertoCacheado };
}

test("el puerto se detecta una sola vez, no en cada apertura", async () => {
  const molinete = crearMolinete({ puertoFisico: "COM3" });

  for (let i = 0; i < 5; i++) await molinete.abrirMolinete();

  assert.equal(
    molinete.registro.detecciones,
    1,
    "la consulta WMI tarda segundos: debe pagarse una vez, no cinco",
  );
  assert.equal(molinete.registro.enviosOk, 5);
});

test("si el Pico pasa a otro COM, la misma apertura se recupera", async () => {
  const mundo = { puertoFisico: "COM3" as string | undefined };
  const molinete = crearMolinete(mundo);

  await molinete.abrirMolinete(); // cachea COM3
  mundo.puertoFisico = "COM7"; // se reenchufa y Windows le da otro puerto

  await molinete.abrirMolinete();

  assert.equal(molinete.registro.enviosFallidos, 1, "el primer intento falla");
  assert.equal(molinete.registro.enviosOk, 2, "el reintento acierta");
  assert.equal(molinete.puertoActual(), "COM7", "queda cacheado el nuevo puerto");
});

test("despues de redetectar vuelve a haber una sola deteccion por puerto", async () => {
  const mundo = { puertoFisico: "COM3" as string | undefined };
  const molinete = crearMolinete(mundo);

  await molinete.abrirMolinete();
  mundo.puertoFisico = "COM7";
  await molinete.abrirMolinete(); // redetecta
  const trasReplug = molinete.registro.detecciones;

  for (let i = 0; i < 3; i++) await molinete.abrirMolinete();

  assert.equal(
    molinete.registro.detecciones,
    trasReplug,
    "el puerto nuevo también se cachea: no se vuelve a detectar",
  );
});

test("sin Pico no queda pegado en simulado: lo busca en cada apertura", async () => {
  const molinete = crearMolinete({ puertoFisico: undefined });

  for (let i = 0; i < 3; i++) await molinete.abrirMolinete();

  assert.equal(
    molinete.registro.detecciones,
    3,
    "el modo simulado nunca falla, así que redetectar es la única forma de engancharlo al enchufarlo",
  );
});

test("el Pico enchufado con la app andando se engancha sin reiniciar", async () => {
  const mundo = { puertoFisico: undefined as string | undefined };
  const molinete = crearMolinete(mundo);

  await molinete.abrirMolinete(); // sin hardware: simulado
  mundo.puertoFisico = "COM4"; // recepción enchufa el Pico

  await molinete.abrirMolinete();

  assert.equal(molinete.registro.enviosOk, 1);
});

test("molineteController conserva las piezas que estas pruebas replican", () => {
  const fuente = readFileSync(
    join(import.meta.dirname, "../src/lib/services/hardware/molineteController.ts"),
    "utf8",
  );

  // Si alguna de estas desaparece, la réplica de arriba dejó de representar al
  // módulo y estas pruebas estarían dando una garantía falsa.
  for (const pieza of ["puertoCacheado", "olvidarPuerto", "intentarAbrir"]) {
    assert.ok(fuente.includes(pieza), `falta '${pieza}' en molineteController`);
  }
  assert.ok(
    fuente.includes("puertoCacheado ??= detectarPuertoPico()"),
    "el puerto ya no se cachea: volvió la detección en cada apertura",
  );
});
