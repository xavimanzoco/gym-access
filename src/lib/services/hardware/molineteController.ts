import { spawn, spawnSync } from "node:child_process";
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
 * El puerto detectado se GUARDA EN MEMORIA (`puertoCacheado`): la consulta WMI
 * recorre todos los dispositivos PnP de la máquina y tarda segundos en un
 * equipo modesto, así que pagarla en cada ingreso demoraba el desbloqueo. Se
 * detecta una vez y se reusa.
 *
 * El hot-replug del Pico se mantiene igual: si un envío falla, se descarta el
 * puerto cacheado y se vuelve a detectar en el acto (`abrirMolinete` reintenta
 * una vez). Así, si Windows le asignó otro número de COM al reenchufarlo, la
 * misma apertura que falló lo encuentra en el nuevo puerto — sin reiniciar la
 * app, que es lo que se buscaba al detectar siempre (verificado 2026-08-05).
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
  // Se filtra por clase `Ports` dentro de la consulta WMI en lugar de traer
  // todos los dispositivos PnP y filtrarlos después: la máquina tiene cientos
  // de dispositivos y uno solo de ellos es el Pico.
  const script = `Get-CimInstance Win32_PnPEntity -Filter "PNPClass='Ports'" | Where-Object { $_.DeviceID -match 'VID_${VID_PICO}' } | Select-Object -First 1 -ExpandProperty Name`;
  const resultado = spawnSync("powershell", ["-NoProfile", "-Command", script], {
    encoding: "utf8",
  });
  const match = resultado.stdout?.match(/COM\d+/);
  return match?.[0];
}

/**
 * Último puerto detectado. Evita repetir la consulta WMI —de segundos en una PC
 * modesta— en cada apertura. Se descarta con `olvidarPuerto()` cuando un envío
 * falla, para que el Pico se pueda reenchufar en otro COM sin reiniciar la app.
 */
let puertoCacheado: string | undefined;

/** Puerto serie de la Pi: fijo por env var, o autodetectado (y cacheado) en Windows. Sin ninguno, modo simulado. */
function resolverPuerto(): string | undefined {
  if (process.env.MOLINETE_PORT) return process.env.MOLINETE_PORT;
  puertoCacheado ??= detectarPuertoPico();
  return puertoCacheado;
}

/**
 * Descarta el puerto cacheado: la próxima resolución vuelve a detectarlo.
 * También cierra el canal vivo, que quedó apuntando a un puerto que ya no sirve.
 */
function olvidarPuerto(): void {
  puertoCacheado = undefined;
  cerrarCanalVivo();
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
 * Implementación rápida: deja UN PowerShell vivo con el puerto abierto y le
 * pasa cada orden por su entrada estándar.
 *
 * `MolineteSerie` arranca un PowerShell por apertura, y eso cuesta ~270 ms de
 * arranque más los 300 ms de espera del script — más de medio segundo por
 * ingreso. Manteniendo el proceso vivo, la orden es solo una línea escrita a un
 * proceso que ya está esperando: medido en ~3 ms (2026-09-09, PC de desarrollo).
 *
 * El puerto queda ABIERTO entre aperturas, que es la diferencia real. Si el
 * Pico se desenchufa, la escritura falla y `abrirMolinete` cae a
 * `MolineteSerie` —el método confirmado en el gimnasio— sin que el molinete
 * deje de responder.
 *
 * Se usa el mismo `System.IO.Ports.SerialPort` con DTR/RTS activos que ya está
 * confirmado con este hardware (ver ESTADO.md); lo único que cambia es cuántas
 * veces se abre el puerto.
 */
class MolineteCanalVivo implements MolineteController {
  private proceso?: ReturnType<typeof spawn>;
  private pendientes: { ok: () => void; falla: (e: Error) => void }[] = [];
  private listo?: Promise<void>;

  constructor(private readonly puerto: string) {}

  /** Levanta el PowerShell y espera a que confirme que abrió el puerto. */
  private arrancar(): Promise<void> {
    const script = [
      "$ErrorActionPreference = 'Stop'",
      "try {",
      `  $p = New-Object System.IO.Ports.SerialPort '${this.puerto}',${BAUD},None,8,One`,
      "  $p.DtrEnable = $true",
      "  $p.RtsEnable = $true",
      "  $p.Open()",
      "} catch { Write-Output \"ERR $($_.Exception.Message)\"; exit 1 }",
      "Write-Output 'LISTO'",
      "while ($true) {",
      "  $linea = [Console]::In.ReadLine()",
      "  if ($linea -eq $null -or $linea -eq 'SALIR') { break }",
      `  try { $p.Write("${COMANDO_ABRIR.replace("\n", "\`n")}"); Write-Output 'OK' }`,
      "  catch { Write-Output \"ERR $($_.Exception.Message)\" }",
      "}",
      "$p.Close()",
    ].join("\n");

    const proceso = spawn(
      "powershell",
      ["-NoProfile", "-NonInteractive", "-Command", script],
      { stdio: ["pipe", "pipe", "pipe"] },
    );
    this.proceso = proceso;
    proceso.stdout?.setEncoding("utf8");

    return new Promise<void>((resolver, rechazar) => {
      const tiempo = setTimeout(() => {
        this.cerrar();
        rechazar(new Error(`el canal a ${this.puerto} no respondió en 5s`));
      }, 5000);

      proceso.stdout?.on("data", (datos: string) => {
        for (const linea of datos.split(/\r?\n/).filter(Boolean)) {
          if (linea === "LISTO") {
            clearTimeout(tiempo);
            resolver();
          } else if (linea === "OK") {
            this.pendientes.shift()?.ok();
          } else if (linea.startsWith("ERR")) {
            clearTimeout(tiempo);
            const error = new Error(linea.slice(4).trim() || "error en el canal");
            this.pendientes.shift()?.falla(error);
            rechazar(error);
          }
        }
      });

      // Si el proceso muere, todo lo que esperaba respuesta falla: así la
      // apertura cae al método de respaldo en vez de quedarse colgada.
      proceso.on("exit", () => {
        clearTimeout(tiempo);
        const error = new Error("el canal al molinete se cerró");
        for (const p of this.pendientes.splice(0)) p.falla(error);
        this.proceso = undefined;
        this.listo = undefined;
        rechazar(error);
      });
      proceso.on("error", (error) => {
        clearTimeout(tiempo);
        rechazar(error);
      });
    });
  }

  async abrir(): Promise<void> {
    this.listo ??= this.arrancar();
    try {
      await this.listo;
    } catch (error) {
      this.listo = undefined;
      throw error;
    }

    const proceso = this.proceso;
    if (!proceso?.stdin?.writable) throw new Error("el canal al molinete no está abierto");

    await new Promise<void>((ok, falla) => {
      const tiempo = setTimeout(() => {
        this.pendientes = this.pendientes.filter((p) => p.ok !== ok);
        falla(new Error("el molinete no confirmó la apertura en 3s"));
      }, 3000);

      this.pendientes.push({
        ok: () => {
          clearTimeout(tiempo);
          ok();
        },
        falla: (e) => {
          clearTimeout(tiempo);
          falla(e);
        },
      });
      proceso.stdin?.write(COMANDO_ABRIR);
    });

    console.info(`[molinete] Orden "ABRIR" enviada a ${this.puerto} (canal vivo)`);
  }

  /** Cierra el canal; la próxima apertura lo levanta de nuevo. */
  cerrar(): void {
    const proceso = this.proceso;
    this.proceso = undefined;
    this.listo = undefined;
    for (const p of this.pendientes.splice(0)) {
      p.falla(new Error("el canal se cerró"));
    }
    if (proceso) {
      try {
        proceso.stdin?.write("SALIR\n");
      } catch {
        /* el proceso ya no acepta escrituras */
      }
      proceso.kill();
    }
  }
}

/**
 * El canal vivo se puede apagar poniendo `MOLINETE_CANAL_VIVO=0`, para volver
 * al método de un proceso por apertura sin reinstalar nada.
 */
const CANAL_VIVO_HABILITADO = process.env.MOLINETE_CANAL_VIVO !== "0";

/** Canal abierto, reusado entre aperturas mientras siga siendo el mismo puerto. */
let canal: { puerto: string; instancia: MolineteCanalVivo } | undefined;

function canalVivo(puerto: string): MolineteCanalVivo {
  if (canal?.puerto !== puerto) {
    canal?.instancia.cerrar();
    canal = { puerto, instancia: new MolineteCanalVivo(puerto) };
  }
  return canal.instancia;
}

/** Cierra el canal abierto; la próxima apertura levanta uno nuevo. */
function cerrarCanalVivo(): void {
  canal?.instancia.cerrar();
  canal = undefined;
}

/** Cómo está el controlador ahora mismo. Lo usa la pantalla de diagnóstico. */
export function describirMolinete(): {
  canalVivoHabilitado: boolean;
  estadoCanal: string;
  puertoCacheado?: string;
} {
  return {
    canalVivoHabilitado: CANAL_VIVO_HABILITADO,
    estadoCanal: canal ? "abierto" : "cerrado",
    puertoCacheado,
  };
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
 * Manda la orden por el puerto que corresponda; simulado si no hay ninguno.
 * Devuelve si había hardware, para no dejar el modo simulado pegado: sin Pico
 * al arrancar la app, cada apertura vuelve a buscarlo (es la única forma de
 * que aparezca al enchufarlo, ya que el simulado nunca falla).
 */
async function intentarAbrir(): Promise<boolean> {
  const puerto = resolverPuerto();
  if (!puerto) {
    await new MolineteSimulado().abrir();
    return false;
  }

  // Primero el canal vivo (milisegundos). Si falla por lo que sea, se cae al
  // método de un proceso por apertura, que es el confirmado en el gimnasio: el
  // peor caso es tardar como antes, nunca no abrir.
  if (process.platform === "win32" && CANAL_VIVO_HABILITADO) {
    try {
      await canalVivo(puerto).abrir();
      return true;
    } catch (error) {
      console.warn("[molinete] Canal vivo falló, se usa el método por proceso:", error);
      cerrarCanalVivo();
    }
  }

  await new MolineteSerie(puerto).abrir();
  return true;
}

/**
 * Envía la orden de apertura al molinete. Usa el puerto cacheado; si el envío
 * falla —típicamente porque el Pico se reenchufó y Windows le dio otro COM—,
 * lo descarta, vuelve a detectarlo y reintenta una sola vez.
 *
 * Nunca lanza: un fallo de hardware no debe romper el registro del ingreso,
 * solo se deja constancia en el log.
 */
export async function abrirMolinete(): Promise<void> {
  await abrirMolineteConResultado();
}

/** Cómo terminó una apertura. */
export type ResultadoOrden =
  | { estado: "abierto" }
  /** No hay Pico conectado: la orden se registró pero nada se movió. */
  | { estado: "sin-hardware" }
  | { estado: "falló"; error: string };

/**
 * Igual que `abrirMolinete` pero contando cómo salió, para que el diagnóstico
 * pueda mostrar la verdad. El flujo de ingreso usa `abrirMolinete`, que ignora
 * el resultado: un fallo de hardware no debe romper el registro del acceso.
 */
export async function abrirMolineteConResultado(): Promise<ResultadoOrden> {
  try {
    // Si no se encontró hardware, se descarta el "sin puerto" cacheado para
    // que la próxima apertura vuelva a buscar el Pico.
    if (await intentarAbrir()) return { estado: "abierto" };
    olvidarPuerto();
    return { estado: "sin-hardware" };
  } catch (error) {
    console.warn("[molinete] Falló el envío, reintentando con redetección:", error);
    olvidarPuerto();
  }

  try {
    return (await intentarAbrir()) ? { estado: "abierto" } : { estado: "sin-hardware" };
  } catch (error) {
    console.error("[molinete] No se pudo abrir:", error);
    return {
      estado: "falló",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
