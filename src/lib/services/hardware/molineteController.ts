import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";

/**
 * Controlador del molinete.
 *
 * PIEZA ENCHUFABLE. La lógica de acceso llama a `abrirMolinete()` cuando el
 * ingreso está permitido; acá se traduce esa orden a la señal física.
 *
 * Arquitectura del hardware:
 *   - ENTRADA (DNI): molinete → teclado USB → PC. La captura el oyente global
 *     de teclado (ver `MolineteListener`); no interviene este archivo.
 *   - SALIDA (abrir): PC → USB → Raspberry Pi Pico → relé → molinete gira.
 *     Este archivo se encarga SOLO de la salida: mandarle a la Pico la orden.
 *
 * La Pico corre `pico/molinete_pico.ino`: escucha el USB-serie y, cuando recibe
 * "ABRIR", libera el molinete unos segundos. Acá le escribimos ese comando al
 * puerto serie SIN librerías nativas:
 *   - Windows: con PowerShell (System.IO.Ports.SerialPort) al puerto COM.
 *   - macOS / Linux: configurando el puerto con `stty` y escribiendo al device.
 *
 * El puerto se define con la variable de entorno `MOLINETE_PORT`:
 *   - Windows: `COM3` (ver el número en el Administrador de dispositivos)
 *   - macOS:   `/dev/tty.usbmodemXXXX`
 *   - Linux:   `/dev/ttyACM0`
 * Si no está seteada, se usa el modo simulado (todo el flujo se prueba sin hardware).
 */

/** Puerto serie de la Pico. Sin esto, el controlador queda en modo simulado. */
const PUERTO = process.env.MOLINETE_PORT;
/** Velocidad del puerto; debe coincidir con la de la Pico. */
const BAUD = Number(process.env.MOLINETE_BAUD ?? "9600");
/** Comando que espera la Pico (sin fin de línea; cada plataforma lo agrega). */
const COMANDO_ABRIR = "ABRIR";

export interface MolineteController {
  /** Da la orden de liberar el molinete para que el socio pueda pasar. */
  abrir(): Promise<void>;
}

/**
 * Implementación real: le escribe el comando a la Pico por el puerto serie.
 * El tiempo de apertura lo maneja la Pico, no la PC.
 */
class MolineteSerie implements MolineteController {
  constructor(private readonly puerto: string) {}

  async abrir(): Promise<void> {
    if (process.platform === "win32") {
      this.abrirWindows();
    } else {
      this.abrirUnix();
    }
    console.info(`[molinete] Orden "ABRIR" enviada a ${this.puerto}`);
  }

  /** Windows: escribe al puerto COM con PowerShell (sin dependencias nativas). */
  private abrirWindows(): void {
    if (!/^COM\d+$/i.test(this.puerto)) {
      throw new Error(
        `MOLINETE_PORT="${this.puerto}" no parece un puerto COM válido (ej. COM3)`,
      );
    }
    const ps =
      `$ErrorActionPreference='Stop';` +
      `$p=New-Object System.IO.Ports.SerialPort('${this.puerto}',${BAUD});` +
      `$p.Open();$p.WriteLine('${COMANDO_ABRIR}');` +
      `Start-Sleep -Milliseconds 150;$p.Close()`;
    const r = spawnSync(
      "powershell.exe",
      ["-NoProfile", "-NonInteractive", "-Command", ps],
      { encoding: "utf8" },
    );
    if (r.status !== 0) {
      throw new Error(
        `PowerShell no pudo escribir a ${this.puerto}: ${(r.stderr || "").trim()}`,
      );
    }
  }

  /** macOS / Linux: configura el puerto con `stty` y escribe al device. */
  private abrirUnix(): void {
    const flag = process.platform === "darwin" ? "-f" : "-F";
    const stty = spawnSync("stty", [flag, this.puerto, String(BAUD), "raw", "-echo"]);
    if (stty.status !== 0) {
      throw new Error(
        `No se pudo configurar el puerto ${this.puerto}: ${stty.stderr?.toString().trim()}`,
      );
    }
    writeFileSync(this.puerto, `${COMANDO_ABRIR}\n`);
  }
}

/**
 * Implementación temporal: registra la orden en consola pero no toca hardware.
 * Permite probar todo el flujo de acceso sin la Pico conectada.
 */
class MolineteSimulado implements MolineteController {
  async abrir(): Promise<void> {
    console.info("[molinete] Orden de apertura — simulado (sin MOLINETE_PORT)");
  }
}

const controlador: MolineteController = PUERTO
  ? new MolineteSerie(PUERTO)
  : new MolineteSimulado();

/**
 * Envía la orden de apertura al molinete. Nunca lanza: un fallo de hardware no
 * debe romper el registro del ingreso, solo se deja constancia en el log.
 */
export async function abrirMolinete(): Promise<void> {
  try {
    await controlador.abrir();
  } catch (error) {
    console.error("[molinete] No se pudo abrir:", error);
  }
}
