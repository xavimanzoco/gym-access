import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

/**
 * Pruebas de la caída del canal vivo al método por proceso.
 *
 * Lo que importa acá es la garantía de seguridad: si el canal rápido falla por
 * cualquier motivo, el molinete TIENE que abrir igual con el método confirmado
 * en el gimnasio. Un fallo del canal nunca puede dejar a alguien afuera.
 *
 * Igual que en `molinete-cache.test.ts`, se replica la lógica en vez de
 * importar el módulo (que hablaría con PowerShell de verdad), y al final se
 * verifica sobre el fuente que las piezas replicadas sigan existiendo.
 */

/** Réplica de `intentarAbrir`: canal vivo primero, método por proceso de respaldo. */
function crearEnvio(mundo: {
  canalAnda: boolean;
  serieAnda: boolean;
  canalHabilitado?: boolean;
}) {
  const registro = { canalIntentos: 0, serieIntentos: 0, canalCerrado: 0 };
  const habilitado = mundo.canalHabilitado ?? true;

  async function intentarAbrir(): Promise<string> {
    if (habilitado) {
      registro.canalIntentos++;
      if (mundo.canalAnda) return "canal vivo";
      registro.canalCerrado++; // se cierra el canal antes de caer al respaldo
    }
    registro.serieIntentos++;
    if (!mundo.serieAnda) throw new Error("tampoco anda el método por proceso");
    return "un proceso por apertura";
  }

  return { intentarAbrir, registro };
}

test("con el canal andando, la orden sale por ahí y no se usa el respaldo", async () => {
  const envio = crearEnvio({ canalAnda: true, serieAnda: true });

  const metodo = await envio.intentarAbrir();

  assert.equal(metodo, "canal vivo");
  assert.equal(envio.registro.serieIntentos, 0, "no hace falta el respaldo");
});

test("si el canal falla, el molinete abre igual por el método confirmado", async () => {
  const envio = crearEnvio({ canalAnda: false, serieAnda: true });

  const metodo = await envio.intentarAbrir();

  assert.equal(
    metodo,
    "un proceso por apertura",
    "un fallo del canal no puede dejar a nadie afuera",
  );
  assert.equal(envio.registro.canalCerrado, 1, "el canal roto se cierra antes de caer");
});

test("el canal roto se cierra en cada intento, no queda colgado", async () => {
  const envio = crearEnvio({ canalAnda: false, serieAnda: true });

  for (let i = 0; i < 3; i++) await envio.intentarAbrir();

  assert.equal(envio.registro.canalCerrado, 3);
  assert.equal(envio.registro.serieIntentos, 3, "las tres aberturas igual salieron");
});

test("con el canal apagado por configuración se va derecho al respaldo", async () => {
  const envio = crearEnvio({ canalAnda: true, serieAnda: true, canalHabilitado: false });

  const metodo = await envio.intentarAbrir();

  assert.equal(metodo, "un proceso por apertura");
  assert.equal(envio.registro.canalIntentos, 0, "MOLINETE_CANAL_VIVO=0 lo saltea");
});

test("si fallan los dos, el error se propaga para que se reintente", async () => {
  const envio = crearEnvio({ canalAnda: false, serieAnda: false });

  await assert.rejects(() => envio.intentarAbrir());
});

test("molineteController conserva la caida al metodo confirmado", () => {
  const fuente = readFileSync(
    join(import.meta.dirname, "../src/lib/services/hardware/molineteController.ts"),
    "utf8",
  );

  assert.ok(fuente.includes("MolineteCanalVivo"), "falta el canal vivo");
  assert.ok(
    fuente.includes("CANAL_VIVO_HABILITADO"),
    "falta el interruptor MOLINETE_CANAL_VIVO",
  );
  // La red de seguridad: el canal va dentro de un try y después, fuera de él,
  // queda el método confirmado. Si esto se rompe, un fallo del canal dejaría
  // gente sin poder pasar.
  const intentar = fuente.slice(
    fuente.indexOf("async function intentarAbrir"),
    fuente.indexOf("export async function abrirMolinete"),
  );
  assert.ok(intentar.includes("canalVivo(puerto).abrir()"), "el canal no se usa");
  assert.ok(
    intentar.lastIndexOf("new MolineteSerie(puerto)") > intentar.indexOf("catch"),
    "el método confirmado debe quedar DESPUÉS del catch, como respaldo",
  );
});
