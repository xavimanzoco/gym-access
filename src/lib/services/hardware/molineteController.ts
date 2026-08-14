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
 * se puede fijar a mano con la variable de entorno `MOLINETE_PORT` (ej. en Mac
 * `/dev/tty.usbmodem1101`, en Windows `COM3`), pero en Windows, si no está
 * seteada, se **autodetecta** al arrancar la app buscando un dispositivo serie
 * con el VID `2E8A` (Raspberry Pi) — así no importa a qué puerto USB físico ni
 * en qué PC se enchufe el Pico. Si no se encuentra nada, se usa el modo
 * simulado, así todo el flujo se puede probar sin hardware.
 *
 * En Windows el Pico solo transmite si el puerto se abre con DTR/RTS activos
 * (verificado 2026-07-24, ver ESTADO.md). Además, en Windows no alcanza con
 * escribir al device (`writeFileSync` a `\\.\COMx`): la API de archivos no
 * sirve para un puerto serie y el Pico no recibe nada (verificado
 * 2026-08-05). El método que sí funciona es `System.IO.Ports.SerialPort`
 * (.NET) — acá se invoca vía PowerShell.
 *
 * La detección del puerto se repite en CADA apertura (no se guarda en
 * memoria): si el Pico se desenchufa y se vuelve a enchufar —a veces Windows
 * le asigna otro número de COM—, la próxima apertura lo encuentra solo, sin
 * necesidad de reiniciar la app (verificado 2026-08-05).
 */

/** Vendor ID USB de la Raspberry Pi Foundation — así se identifica el Pico entre los puertos COM. */
const VID_PICO = "2E8A";

/**
 * Busca el puerto COM del Pico por VID vía WMI. Solo tiene sentido en Windows
 * (en Mac/Linux se usa `MOLINETE_PORT` a mano, no está confirmado un método
 * de autodetección ahí todavía).
 */
function detectarPuertoPico(): string | undefined {
  if (process.platform !== "win32") return undefined;
  const script = `Get-CimInstance Win32_PnPEntity | Where-Object { $_.DeviceID -match 'VID_${VID_PICO}' -and $_.Name -match 'COM\\d+' } | Select-Object -First 1 -ExpandProperty Name`;
  const resultado = spawnSync("powershell", ["-NoProfile", "-Command", script], {
    encoding: "utf8",
  });
  const match = resultado.stdout?.match(/COM\d+/);
  return match?.[0];
}

/** Puerto serie de la Pi: fijo por env var, o autodetectado en Windows. Sin ninguno, modo simulado. */
function resolverPuerto(): string | undefined {
  return process.env.MOLINETE_PORT ?? detectarPuertoPico();
}

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
      this.enviarWindows();
    } else {
      this.configurarPuertoUnix();
      writeFileSync(this.puerto, COMANDO_ABRIR);
    }
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

  /**
   * Abre el puerto con `System.IO.Ports.SerialPort` (DTR/RTS activos), manda
   * el comando y cierra. Es el único método confirmado que el Pico recibe en
   * Windows — `writeFileSync` al device no funciona (ver comentario arriba).
   */
  private enviarWindows(): void {
    const script = [
      `$p = New-Object System.IO.Ports.SerialPort '${this.puerto}',${BAUD},None,8,One`,
      "$p.DtrEnable = $true",
      "$p.RtsEnable = $true",
      "$p.Open()",
      `$p.Write("${COMANDO_ABRIR.replace("\n", "`n")}")`,
      "Start-Sleep -Milliseconds 300",
      "$p.Close()",
    ].join("\n");
    const resultado = spawnSync("powershell", ["-NoProfile", "-Command", script]);
    if (resultado.status !== 0) {
      throw new Error(
        `No se pudo enviar por ${this.puerto}: ${resultado.stderr?.toString().trim()}`,
      );
    }
  }
}

/**
 * Implementación temporal: registra la orden en consola pero no toca hardware.
 * Permite probar todo el flujo de acceso sin la Pi conectada.
 */
class MolineteSimulado implements MolineteController {
  async abrir(): Promise<void> {
    console.info("[molinete] Orden de apertura — simulado (no se encontró el Pico)");
  }
}

/**
 * Envía la orden de apertura al molinete. Resuelve el puerto de nuevo en cada
 * llamada (ver comentario de arriba). Nunca lanza: un fallo de hardware no
 * debe romper el registro del ingreso, solo se deja constancia en el log.
 */
export async function abrirMolinete(): Promise<void> {
  const puerto = resolverPuerto();
  const controlador: MolineteController = puerto
    ? new MolineteSerie(puerto)
    : new MolineteSimulado();

  try {
    await controlador.abrir();
  } catch (error) {
    console.error("[molinete] No se pudo abrir:", error);
  }
}
