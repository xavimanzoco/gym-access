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
- **Relé → Pico** (según cómo quedó cableado en el banco de pruebas de Windows,
  2026-07-24): `VCC(+)→pin40 (VBUS 5V)`, `GND(-)→pin33 (GND)`, `IN(S)→pin34 (GP28)`.
  El pin de señal es configurable: es la constante `RELAY_PIN` en
  `pico/molinete_pico.ino` (hoy en `28`). Si en la instalación final del gimnasio
  el relé queda cableado a otro GPIO, hay que cambiar esa constante y recompilar
  (ver "Recompilar el firmware" más abajo) en vez de mover cables.
- **Pico → PC**: por USB (serie), a **9600 baudios**. La PC manda `ABRIR\n` para abrir.
  **Importante en Windows**: el Pico solo transmite si el puerto se abre con
  **DTR y RTS activos** — sin eso parece "mudo" aunque el firmware esté corriendo
  bien. Esto explicaría el problema original de la Mac, pero **no está confirmado**
  que sea la causa real ahí — ver el aviso más abajo antes de asumir que ya anda.

## ✅ Comunicación PC ↔ Pico por serie: RESUELTO (2026-07-24, en Windows)
- El Pico se reconoce solo, sin dongle, como "Dispositivo serie USB" (VID `2E8A`,
  Raspberry Pi) en un puerto COM (ej. `COM3`).
- Con `test_serie.uf2` cargado, abriendo el puerto con **DTR/RTS activos** aparece
  `PICO_VIVO` sin problema — confirma que el USB-serie funciona perfecto.
- Con el firmware real, el comando `ABRIR` respondió `OK` y liberó el molinete
  (relé y solenoide confirmados funcionando).
- **Truco útil**: para entrar a modo BOOTSEL sin tocar el botón físico, alcanza con
  abrir el puerto serie a **1200 baudios** y cerrarlo — el Pico se resetea solo al
  disco `RPI-RP2` (funciona con el core Arduino-Pico / earlephilhower).
- **Dato para `molineteController.ts` en Windows**: configurar el puerto con
  `mode COMx: baud=9600 parity=n data=8 stop=1 dtr=on rts=on` y escribir a
  `\\.\COMx` (no alcanza con escribir directo al nombre del puerto).

## ⚠️ Pendiente de confirmar: si esto va a andar en la Mac
Lo del hardware (firmware con `RELAY_PIN=28`, cableado del relé) queda grabado en
el Pico y **es portable** — no depende de qué PC lo maneje, mientras no se muevan
cables ni se reflashee. **Lo que NO está confirmado es la comunicación serie en
la Mac.**

El fix de hoy (abrir el puerto con DTR/RTS activos) se probó y confirmó **solo con
`System.IO.Ports.SerialPort` de .NET en Windows**, que por defecto trae
`DtrEnable=false` — es un detalle de esa librería puntual. **Dato en contra de que
sea la misma causa en la Mac**: en su momento ahí se había probado con **pyserial**,
que por defecto **sí** activa DTR al abrir el puerto — y aun así no funcionó. Eso
sugiere que el problema de la Mac podría ser otra cosa (el dongle/hub USB-C que se
sospechaba al principio, un driver, u otra causa), no (solo) DTR.

El código Unix de `configurarPuertoUnix()` en `molineteController.ts` no se tocó
hoy — sigue igual que antes de esta sesión, sin el fix de DTR/RTS.

**👉 Antes de asumir que "ya está resuelto" en la Mac**: al enchufar el Pico ahí,
probar primero SOLO la comunicación serie (igual que se hizo hoy en Windows: abrir
el puerto y mandar `ABRIR` a mano, o buscar `PICO_VIVO` con `test_serie.uf2`) —
sin el dongle/hub si se puede evitar — **antes** de levantar la app y dar por hecho
que el circuito completo funciona.

## Próximos pasos
1. **Confirmar el serie en la Mac** (ver aviso arriba) — es lo primero a probar.
2. **Probar el circuito completo real**: DNI/huella → app valida → `ABRIR` → relé →
   abre. (Ya validado el tramo PC↔Pico↔relé por separado en Windows; falta correr
   la app y probar de punta a punta.)
3. Empaquetar como instalador para la PC del gimnasio — **ojo**: la PC de pruebas de
   Windows usada el 2026-07-24 NO es la PC final del gimnasio, así que el número de
   puerto COM va a cambiar; usar la env `MOLINETE_PORT` en cada instalación.

## Flashear el Pico
- **A mano (BOOTSEL)**: desenchufar, mantener apretado el botón BOOTSEL, enchufar,
  soltar → aparece el disco `RPI-RP2`. Copiar el `.uf2` ahí (se graba y reinicia solo).
- **Sin tocar el botón**: abrir el puerto serie del Pico a 1200 baudios y cerrarlo
  (ver arriba) — entra solo a modo BOOTSEL.
- Disponibles en `pico/`: `molinete_pico.uf2` (real), `test_serie.uf2` (diagnóstico
  PICO_VIVO), `molinete_pico_tinyusb.uf2` (variante con otra pila USB).

## Recompilar el firmware (`pico/molinete_pico.ino`)
Se instaló `arduino-cli` (via `winget install ArduinoSA.CLI`) + el core
`rp2040:rp2040` (earlephilhower, índice
`https://github.com/earlephilhower/arduino-pico/releases/download/global/package_rp2040_index.json`).
Para recompilar después de tocar el `.ino`:
```
arduino-cli compile --fqbn rp2040:rp2040:rpipico pico/molinete_pico.ino --output-dir pico/build
```
El `.uf2` sale en `pico/build/`. Copiarlo al disco `RPI-RP2` como cualquier otro.

## Nota importante del repo
Es una versión de Next.js con cambios importantes respecto de lo habitual: leer las
guías en `node_modules/next/dist/docs/` antes de escribir código (ver `AGENTS.md`).
