import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";

/**
 * Controlador del molinete.
 *
 * PIEZA ENCHUFABLE — se termina de calibrar en el gimnasio (2026-07-23). La
 * lógica de acceso llama a `abrirMolinete()` cuando el ingreso está permitido;
 * acá se traduce esa orden a la señal física.
 *
 * Arquitectura del hardware:
 *   - ENTRADA (DNI): molinete → teclado USB → PC. La captura el oyente global
 *     de teclado (ver `MolineteListener`); no interviene este archivo.
 *   - SALIDA (abrir): PC → USB → Raspberry Pi Zero → relé → molinete gira.
 *     Este archivo se encarga SOLO de la salida: mandarle a la Pi la orden.
 *
 * El Pico (`pico/molinete_pico.ino`) escucha el USB-serie y, cuando recibe
 * "ABRIR", pulsa el relé. Acá le escribimos ese comando al puerto serie (sin
 * librerías nativas: configuramos el puerto con el comando del SO y
 * escribimos al device — `stty` en macOS/Linux, `mode` en Windows). El puerto
 * se define con la variable de entorno `MOLINETE_PORT` (ej. en Mac
 * `/dev/tty.usbmodem1101`, en Windows `COM3`; el número de puerto cambia según
 * la PC, así que hay que configurarlo en cada instalación). Si no está
 * seteada, se usa el modo simulado, así todo el flujo se puede probar sin
 * hardware.
 *
 * En Windows el Pico solo transmite si el puerto se abre con DTR/RTS activos
 * (verificado 2026-07-24, ver ESTADO.md) — por eso `mode` los fuerza a "on".
 */

/** Puerto serie de la Pi. Sin esto, el controlador queda en modo simulado. */
const PUERTO = process.env.MOLINETE_PORT;
/** Velocidad del puerto; debe coincidir con `BAUD_RATE` en la Pi. */
const BAUD = process.env.MOLINETE_BAUD ?? "9600";
/** Comando que espera la Pi; debe coincidir con `COMANDO_ABRIR` en la Pi. */
const COMANDO_ABRIR = "ABRIR\n";

export interface MolineteController {
  /** Da la orden de liberar el molinete para que el socio pueda pasar. */
  abrir(): Promise<void>;
}

/**
 * Implementación real: le escribe el comando a la Pi por el puerto serie.
 * El pulso del relé (duración) lo maneja la Pi, no la PC.
 */
class MolineteSerie implements MolineteController {
  constructor(private readonly puerto: string) {}

  async abrir(): Promise<void> {
    if (process.platform === "win32") {
      this.configurarPuertoWindows();
    } else {
      this.configurarPuertoUnix();
    }
    writeFileSync(this.rutaDispositivo(), COMANDO_ABRIR);
    console.info(`[molinete] Orden "ABRIR" enviada a ${this.puerto}`);
  }

  /** macOS usa `stty -f <port>`; Linux `stty -F <port>`. Modo "raw" a la velocidad acordada. */
  private configurarPuertoUnix(): void {
    const flag = process.platform === "darwin" ? "-f" : "-F";
    const stty = spawnSync("stty", [flag, this.puerto, BAUD, "raw", "-echo"]);
    if (stty.status !== 0) {
      throw new Error(
        `No se pudo configurar el puerto ${this.puerto}: ${stty.stderr?.toString().trim()}`,
      );
    }
  }

  /** `mode.com` configura baud y fuerza DTR/RTS, que el Pico necesita para transmitir por USB-serie. */
  private configurarPuertoWindows(): void {
    const mode = spawnSync("mode", [
      `${this.puerto}:`,
      `baud=${BAUD}`,
      "parity=n",
      "data=8",
      "stop=1",
      "dtr=on",
      "rts=on",
    ]);
    if (mode.status !== 0) {
      throw new Error(
        `No se pudo configurar el puerto ${this.puerto}: ${mode.stderr?.toString().trim()}`,
      );
    }
  }

  /** Windows requiere el prefijo `\\.\` para escribir directo a un dispositivo serie. */
  private rutaDispositivo(): string {
    return process.platform === "win32" ? `\\\\.\\${this.puerto}` : this.puerto;
  }
}

/**
 * Implementación temporal: registra la orden en consola pero no toca hardware.
 * Permite probar todo el flujo de acceso sin la Pi conectada.
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
