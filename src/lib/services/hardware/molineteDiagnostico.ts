import { spawnSync } from "node:child_process";
import {
  abrirMolineteConResultado,
  describirMolinete,
} from "@/lib/services/hardware/molineteController";

/**
 * Diagnóstico del molinete: mide cuánto tarda cada parte del desbloqueo y
 * confirma que el hardware responde.
 *
 * Existe para poder verificar una instalación —en la PC del gimnasio, sin
 * consola ni herramientas— antes de dejarla andando. No lo usa el flujo de
 * ingreso; solo la pantalla `/diagnostico`.
 */

export interface MedicionDeteccion {
  /** Consulta acotada a la clase `Ports`, la que usa la app. */
  acotadaMs: number;
  /** Consulta sobre todos los dispositivos PnP: cuánto costaba antes del cache. */
  ampliaMs: number;
  puerto?: string;
}

export interface ResultadoApertura {
  ok: boolean;
  ms: number;
  metodo: string;
  error?: string;
}

export interface Diagnostico {
  plataforma: string;
  puertoFijado?: string;
  canalVivoHabilitado: boolean;
  deteccion?: MedicionDeteccion;
  estadoCanal: string;
}

const VID_PICO = "2E8A";

function medir<T>(fn: () => T): { ms: number; valor: T } {
  const inicio = performance.now();
  const valor = fn();
  return { ms: performance.now() - inicio, valor };
}

function consultarWmi(filtro: string): string | undefined {
  const resultado = spawnSync("powershell", ["-NoProfile", "-Command", filtro], {
    encoding: "utf8",
  });
  return resultado.stdout?.match(/COM\d+/)?.[0];
}

/** Mide las dos formas de buscar el Pico, para ver cuánto ahorra el cache. */
function medirDeteccion(): MedicionDeteccion {
  const acotada = medir(() =>
    consultarWmi(
      `Get-CimInstance Win32_PnPEntity -Filter "PNPClass='Ports'" | Where-Object { $_.DeviceID -match 'VID_${VID_PICO}' } | Select-Object -First 1 -ExpandProperty Name`,
    ),
  );
  const amplia = medir(() =>
    consultarWmi(
      `Get-CimInstance Win32_PnPEntity | Where-Object { $_.DeviceID -match 'VID_${VID_PICO}' -and $_.Name -match 'COM\\d+' } | Select-Object -First 1 -ExpandProperty Name`,
    ),
  );

  return {
    acotadaMs: acotada.ms,
    ampliaMs: amplia.ms,
    puerto: acotada.valor ?? amplia.valor,
  };
}

export const molineteDiagnostico = {
  /** Estado actual, sin tocar el molinete. */
  estado(): Diagnostico {
    const estado = describirMolinete();
    return {
      plataforma: process.platform,
      puertoFijado: process.env.MOLINETE_PORT,
      canalVivoHabilitado: estado.canalVivoHabilitado,
      estadoCanal: estado.estadoCanal,
      deteccion: process.platform === "win32" ? medirDeteccion() : undefined,
    };
  },

  /**
   * Abre el molinete de verdad y mide cuánto tardó. El molinete GIRA: la
   * pantalla avisa antes de dejar apretar el botón.
   */
  async probarApertura(): Promise<ResultadoApertura> {
    const antes = describirMolinete();
    const inicio = performance.now();
    const resultado = await abrirMolineteConResultado();
    const ms = performance.now() - inicio;
    const despues = describirMolinete();

    if (resultado.estado === "sin-hardware") {
      return {
        ok: false,
        ms,
        metodo: "—",
        error: "No se encontró el Pico: revisá que esté enchufado por USB.",
      };
    }
    if (resultado.estado === "falló") {
      return { ok: false, ms, metodo: "—", error: resultado.error };
    }

    return {
      ok: true,
      ms,
      // Si el canal quedó abierto, la orden salió por ahí.
      metodo:
        despues.estadoCanal === "abierto"
          ? antes.estadoCanal === "abierto"
            ? "canal vivo"
            : "canal vivo (recién abierto)"
          : despues.canalVivoHabilitado
            ? "un proceso por apertura (el canal vivo no pudo)"
            : "un proceso por apertura",
    };
  },
};
