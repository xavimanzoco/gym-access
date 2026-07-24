# Estado del proyecto — Gym Access (control de acceso de gimnasio, OFFLINE)

> Documento de contexto para retomar el trabajo en otra PC o en un chat nuevo.
> Resume qué está hecho, el hardware, el problema pendiente y qué probar.

## Qué es
Sistema de control de acceso para un gimnasio, **100% offline en una PC** (destino:
Windows). El socio se identifica tecleando el DNI en el molinete **o** con huella, y
si tiene la **cuota al día** se abre el molinete.

## Qué está HECHO ✅
- **App Next.js completa** (offline, base **SQLite local** con `node:sqlite`):
  - Socios (alta/búsqueda/baja), Pagos/cuotas (actualizan el vencimiento),
    Ingreso (kiosco), Reportes.
  - El ingreso usa un **oyente global de teclado**
    (`src/components/acceso/MolineteListener.tsx`): capta el DNI que "teclea" el
    molinete **o** la huella (ambos son teclados USB) en cualquier pantalla,
    valida la cuota y muestra verde/rojo a pantalla completa.
  - Correr: `npm install` && `npm run dev` → http://localhost:3000
    (la base se crea sola en `data/gym.db`).
- **Firmware del Pico** (`pico/molinete_pico.ino`, ya compilado a `.uf2`): escucha el
  USB-serie; con el comando `ABRIR` libera el molinete ~4s, con `TEST` lo libera 20s.
  El LED del Pico parpadea = firmware vivo; queda fijo mientras abre.

## Hardware
- La "Pi" es en realidad una **Raspberry Pi Pico** (RP2040), NO una Pi Zero.
- **Molinete**: solenoide de doble acción. Común = cable **BLANCO**.
  - `blanco + VERDE` = LIBRE (abre, gira)
  - `blanco + ROJO`  = TRABA (cruz roja)
  - sin corriente    = suelto
  - Alimentado por una **fuente de 12V** (2A).
- **Relé** (módulo HW-482, 1 canal — se usa el contacto conmutado NC/COM/NO):
  - `blanco` → un terminal de la fuente 12V (el común)
  - el OTRO terminal de la fuente (+12) → **COM** del relé (el del medio)
  - `rojo` → **NC**  (reposo = trabado → seguro por defecto)
  - `verde` → **NO** (relé activado → abre)
  - Si queda al revés (suelto en reposo), invertir rojo/verde.
- **Relé → Pico**: `VCC→pin40 (VBUS 5V)`, `GND→pin38`, `IN→pin20 (GP15)`.
- **Pico → PC**: por USB (serie). La PC manda `ABRIR\n` para abrir.

## ✅ RESUELTO: comunicación PC ↔ Pico por serie
**En Windows funciona de punta a punta** (relé andando, lee bien). El problema
era el **dongle/hub USB-C de la Mac**, que dejaba pasar enumeración + flasheo
pero rompía los datos del serie CDC. En Windows (aun con hub) anda bien.

Además, `molineteController.ts` ya quedó **multiplataforma**: en Windows escribe
al puerto **COM** con PowerShell, en Mac/Linux con `stty`. Se setea con la env
`MOLINETE_PORT` (Windows: `COM3`; Mac: `/dev/tty.usbmodemXXXX`).

Historial del problema en la **Mac**:
- El Pico **enumera** (`/dev/cu.usbmodem…`, product "Pico") y el **firmware corre**
  (LED parpadea), PERO no recibe comandos ni transmite datos. Ni siquiera un firmware
  que imprime sin parar se lee (`test_serie.uf2` imprime `PICO_VIVO` y no llega nada),
  probado con pyserial, arduino-cli monitor y lectura cruda.
- El **flasheo (BOOTSEL) SÍ funciona** → el USB físico y el cable están bien.
- **Sospecha principal**: el Pico está enchufado a la Mac por un **dongle/hub USB-C**,
  que puede dejar pasar enumeración+flasheo pero romper los datos del serie CDC.

### 👉 Qué probar EN WINDOWS (además es el destino real del sistema)
1. Enchufar el Pico **directo a un USB de la Windows** (sin dongle/hub).
2. Abrir un monitor serie a **115200** y ver si aparece **`PICO_VIVO`**
   (el Pico ya tiene `test_serie.uf2` flasheado):
   - Arduino IDE → Monitor Serie a 115200, o
   - PowerShell: `[System.IO.Ports.SerialPort]::GetPortNames()` para ver los COM, y
     luego `$p=New-Object System.IO.Ports.SerialPort('COM3',115200);$p.Open();Start-Sleep 3;Write-Host $p.ReadExisting();$p.Close()`
3. **Si aparece `PICO_VIVO`** → era el dongle. El Pico y el cableado están perfectos:
   reflashear el firmware real `pico/molinete_pico.uf2` y probar mandando `ABRIR`.
4. **Si NO aparece** → es la placa Pico (posible clon fallado) → cambiarla (~$5).

## Próximos pasos (cuando el serie ande)
1. Reflashear `pico/molinete_pico.uf2` (firmware real): Pico en BOOTSEL → copiar el
   `.uf2` al disco `RPI-RP2`.
2. ✅ HECHO — `molineteController.ts` ya es multiplataforma (Windows COM por
   PowerShell + Mac/Linux por `stty`). Solo hay que setear `MOLINETE_PORT` al
   puerto del Pico (Windows: `COM3`, se ve en el Administrador de dispositivos).
3. Probar el circuito completo: DNI/huella → app valida → `ABRIR` → relé → abre.
4. Empaquetar como instalador para la PC del gimnasio.

## Flashear el Pico (recordatorio)
- **BOOTSEL**: desenchufar, mantener apretado el botón BOOTSEL, enchufar, soltar →
  aparece el disco `RPI-RP2`.
- Copiar el `.uf2` a `RPI-RP2` (se graba y reinicia solo).
- Disponibles en `pico/`: `molinete_pico.uf2` (real), `test_serie.uf2` (diagnóstico
  PICO_VIVO), `molinete_pico_tinyusb.uf2` (variante con otra pila USB).

## Nota importante del repo
Es una versión de Next.js con cambios importantes respecto de lo habitual: leer las
guías en `node_modules/next/dist/docs/` antes de escribir código (ver `AGENTS.md`).
