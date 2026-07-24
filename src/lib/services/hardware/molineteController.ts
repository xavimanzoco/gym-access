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
 * La Pi corre `pi/molinete_relay.py`: escucha el USB-serie y, cuando recibe
 * "ABRIR", pulsa el relé por GPIO. Acá le escribimos ese comando al puerto serie
 * (sin librerías nativas: configuramos el puerto con `stty` y escribimos al
 * device). El puerto se define con la variable de entorno `MOLINETE_PORT`
 * (ej. en Mac `/dev/tty.usbmodem1101`). Si no está seteada, se usa el modo
 * simulado, así todo el flujo se puede probar sin hardware.
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
    // Configura el puerto en modo "raw" a la velocidad acordada.
    // macOS usa `stty -f <port>`; Linux `stty -F <port>`.
    const flag = process.platform === "darwin" ? "-f" : "-F";
    const stty = spawnSync("stty", [flag, this.puerto, BAUD, "raw", "-echo"]);
    if (stty.status !== 0) {
      throw new Error(
        `No se pudo configurar el puerto ${this.puerto}: ${stty.stderr?.toString().trim()}`,
      );
    }
    writeFileSync(this.puerto, COMANDO_ABRIR);
    console.info(`[molinete] Orden "ABRIR" enviada a ${this.puerto}`);
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
