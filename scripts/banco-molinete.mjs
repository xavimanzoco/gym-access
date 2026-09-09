/**
 * Banco de pruebas del molinete — PROGRAMA APARTE, no lo usa la app.
 *
 * Sirve para medir cuánto tarda cada forma de mandarle "ABRIR" al Pico y
 * confirmar cuáles funcionan de verdad con el hardware conectado, sin tocar la
 * app instalada ni la base de datos.
 *
 * Correr con el Pico enchufado:
 *
 *   node scripts/banco-molinete.mjs               (detecta el puerto solo)
 *   node scripts/banco-molinete.mjs COM5          (puerto a mano)
 *   node scripts/banco-molinete.mjs COM5 --abrir  (además hace girar el molinete)
 *
 * Sin `--abrir` NO se manda el comando: solo se mide la detección del puerto y
 * el costo de arranque de cada método. Con `--abrir` el molinete gira una vez
 * por método que funcione — asegurate de que nadie esté pasando.
 *
 * Métodos que compara:
 *   1. powershell   — el que usa la app hoy (un proceso por apertura).
 *   2. helper .NET  — un ejecutable propio que abre el puerto y escribe.
 *   3. persistente  — el helper .NET queda vivo y recibe órdenes por stdin.
 *
 * El 3 es el que puede bajar el desbloqueo a milisegundos. Este banco existe
 * para saber si anda ANTES de meterlo en el camino del molinete en producción.
 */

import { spawn, spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const VID_PICO = "2E8A";
const BAUD = 9600;
const COMANDO = "ABRIR";

const args = process.argv.slice(2);
const abrirDeVerdad = args.includes("--abrir");
const puertoManual = args.find((a) => /^COM\d+$/i.test(a))?.toUpperCase();

/** Corre una función y devuelve cuánto tardó en milisegundos. */
function medir(fn) {
  const t0 = performance.now();
  const valor = fn();
  return { ms: performance.now() - t0, valor };
}

async function medirAsync(fn) {
  const t0 = performance.now();
  const valor = await fn();
  return { ms: performance.now() - t0, valor };
}

const ms = (n) => `${n.toFixed(0)} ms`;

// ---------------------------------------------------------------- detección

/** La consulta que usaba la app antes del fix: todos los dispositivos PnP. */
function detectarAmplio() {
  const script = `Get-CimInstance Win32_PnPEntity | Where-Object { $_.DeviceID -match 'VID_${VID_PICO}' -and $_.Name -match 'COM\\d+' } | Select-Object -First 1 -ExpandProperty Name`;
  const r = spawnSync("powershell", ["-NoProfile", "-Command", script], { encoding: "utf8" });
  return r.stdout?.match(/COM\d+/)?.[0];
}

/** La consulta del fix: acotada a la clase Ports. */
function detectarAcotado() {
  const script = `Get-CimInstance Win32_PnPEntity -Filter "PNPClass='Ports'" | Where-Object { $_.DeviceID -match 'VID_${VID_PICO}' } | Select-Object -First 1 -ExpandProperty Name`;
  const r = spawnSync("powershell", ["-NoProfile", "-Command", script], { encoding: "utf8" });
  return r.stdout?.match(/COM\d+/)?.[0];
}

// ------------------------------------------------------------ helper en C#

const FUENTE_CS = `
using System;
using System.IO.Ports;

class Helper {
  static void Main(string[] args) {
    string puerto = args[0];
    int baud = int.Parse(args[1]);
    bool persistente = args.Length > 2 && args[2] == "--persistente";

    var p = new SerialPort(puerto, baud, Parity.None, 8, StopBits.One);
    p.DtrEnable = true;
    p.RtsEnable = true;
    p.Open();

    if (!persistente) {
      p.Write("${COMANDO}\\n");
      System.Threading.Thread.Sleep(300);
      p.Close();
      Console.WriteLine("OK");
      return;
    }

    // Modo persistente: el puerto queda abierto y cada linea de stdin se manda
    // tal cual al Pico. Asi no se paga la apertura en cada desbloqueo.
    Console.WriteLine("LISTO");
    string linea;
    while ((linea = Console.ReadLine()) != null) {
      if (linea == "SALIR") break;
      p.Write(linea + "\\n");
      Console.WriteLine("OK");
    }
    p.Close();
  }
}
`;

/** Compila el helper con el csc del framework (no hace falta el SDK). */
function compilarHelper() {
  const dir = mkdtempSync(join(tmpdir(), "banco-molinete-"));
  const cs = join(dir, "Helper.cs");
  const exe = join(dir, "Helper.exe");
  writeFileSync(cs, FUENTE_CS);

  const csc = "C:\\Windows\\Microsoft.NET\\Framework64\\v4.0.30319\\csc.exe";
  const r = spawnSync(csc, ["/nologo", "/optimize", `/out:${exe}`, "/r:System.dll", cs], {
    encoding: "utf8",
  });
  if (r.status !== 0) throw new Error(`no compiló: ${r.stdout || r.stderr}`);
  return exe;
}

// -------------------------------------------------------------- los métodos

/** Método actual de la app: un PowerShell por apertura. */
function enviarPowerShell(puerto) {
  const script = [
    `$p = New-Object System.IO.Ports.SerialPort '${puerto}',${BAUD},None,8,One`,
    "$p.DtrEnable = $true",
    "$p.RtsEnable = $true",
    "$p.Open()",
    `$p.Write("${COMANDO}\`n")`,
    "Start-Sleep -Milliseconds 300",
    "$p.Close()",
  ].join("\n");
  const r = spawnSync("powershell", ["-NoProfile", "-Command", script], { encoding: "utf8" });
  if (r.status !== 0) throw new Error(r.stderr?.trim() || "falló");
}

/** Helper .NET: un proceso propio por apertura, mucho más liviano que PowerShell. */
function enviarHelper(exe, puerto) {
  const r = spawnSync(exe, [puerto, String(BAUD)], { encoding: "utf8" });
  if (r.status !== 0) throw new Error(r.stderr?.trim() || "falló");
}

/** Helper .NET persistente: el puerto queda abierto, se manda por stdin. */
function abrirPersistente(exe, puerto) {
  const proceso = spawn(exe, [puerto, String(BAUD), "--persistente"]);
  let resolverListo;
  const listo = new Promise((r) => (resolverListo = r));
  const pendientes = [];

  proceso.stdout.setEncoding("utf8");
  proceso.stdout.on("data", (d) => {
    for (const linea of d.split(/\r?\n/).filter(Boolean)) {
      if (linea === "LISTO") resolverListo();
      else if (linea === "OK") pendientes.shift()?.();
    }
  });

  return {
    listo,
    enviar: () =>
      new Promise((resolve, reject) => {
        pendientes.push(resolve);
        proceso.stdin.write(COMANDO + "\n");
        setTimeout(() => reject(new Error("sin respuesta en 3s")), 3000);
      }),
    cerrar: () => {
      proceso.stdin.write("SALIR\n");
      proceso.kill();
    },
  };
}

// ------------------------------------------------------------------- correr

console.log("Banco de pruebas del molinete — no toca la app ni la base\n");

if (process.platform !== "win32") {
  console.log("Este banco es para Windows (usa WMI y .NET). Salgo.");
  process.exit(0);
}

console.log("1. DETECCIÓN DEL PUERTO");
const amplio = medir(detectarAmplio);
console.log(`   consulta amplia (la de antes del fix):  ${ms(amplio.ms)}  ${amplio.valor ?? "no encontró"}`);
const acotado = medir(detectarAcotado);
console.log(`   consulta acotada (la del fix):          ${ms(acotado.ms)}  ${acotado.valor ?? "no encontró"}`);
if (amplio.ms > acotado.ms) {
  console.log(`   ahorro por apertura al acotar: ${ms(amplio.ms - acotado.ms)}`);
}
console.log(`   ahorro por apertura al cachear: ${ms(acotado.ms)} (no se vuelve a consultar)\n`);

const puerto = puertoManual ?? acotado.valor ?? amplio.valor;
if (!puerto) {
  console.log("No se encontró el Pico. Enchufalo y volvé a correr, o pasá el puerto:");
  console.log("   node scripts/banco-molinete.mjs COM5");
  process.exit(1);
}
console.log(`Puerto en uso: ${puerto}${puertoManual ? " (a mano)" : " (detectado)"}\n`);

console.log("2. COMPILAR EL HELPER .NET");
let exe;
try {
  const c = medir(compilarHelper);
  exe = c.valor;
  console.log(`   compilado en ${ms(c.ms)} (se hace una vez, no por apertura)\n`);
} catch (error) {
  console.log(`   FALLÓ: ${error.message}\n`);
}

if (!abrirDeVerdad) {
  console.log("3. ENVÍO — salteado");
  console.log("   Sin --abrir no se manda el comando (el molinete giraría).");
  console.log("   Con el Pico conectado y nadie pasando:");
  console.log(`      node scripts/banco-molinete.mjs ${puerto} --abrir`);
  process.exit(0);
}

console.log("3. ENVÍO — el molinete va a girar una vez por método\n");

const resultados = [];

try {
  const r = medir(() => enviarPowerShell(puerto));
  console.log(`   powershell (método actual):     ${ms(r.ms)}  OK`);
  resultados.push(["powershell (actual)", r.ms]);
} catch (error) {
  console.log(`   powershell (método actual):     FALLÓ — ${error.message}`);
}

if (exe) {
  try {
    const r = medir(() => enviarHelper(exe, puerto));
    console.log(`   helper .NET (proceso por vez):  ${ms(r.ms)}  OK`);
    resultados.push(["helper .NET", r.ms]);
  } catch (error) {
    console.log(`   helper .NET (proceso por vez):  FALLÓ — ${error.message}`);
  }

  try {
    const persistente = abrirPersistente(exe, puerto);
    const arranque = await medirAsync(() => persistente.listo);
    console.log(`   persistente — arranque:         ${ms(arranque.ms)} (una sola vez al iniciar la app)`);

    const tiempos = [];
    for (let i = 0; i < 3; i++) {
      const r = await medirAsync(() => persistente.enviar());
      tiempos.push(r.ms);
      await new Promise((r) => setTimeout(r, 1500)); // que el molinete vuelva
    }
    persistente.cerrar();
    const promedio = tiempos.reduce((a, b) => a + b, 0) / tiempos.length;
    console.log(`   persistente — por apertura:     ${ms(promedio)}  OK  (${tiempos.map((t) => ms(t)).join(", ")})`);
    resultados.push(["persistente (.NET vivo)", promedio]);
  } catch (error) {
    console.log(`   persistente:                    FALLÓ — ${error.message}`);
  }
}

if (resultados.length > 1) {
  console.log("\n4. COMPARACIÓN");
  const base = resultados[0][1];
  for (const [nombre, t] of resultados) {
    const veces = base / t;
    console.log(`   ${nombre.padEnd(26)} ${ms(t).padStart(9)}${t === base ? "" : `   ${veces.toFixed(1)}x más rápido`}`);
  }
  console.log("\n   Sumale la detección del puerto si no estuviera cacheada:");
  console.log(`   ${ms(acotado.ms)} más por apertura.`);
}
